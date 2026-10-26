use crate::{renderer::{FrameRenderer, STARTER_CODE}, theme};
use chrono::Utc;
use eframe::egui::{self, Color32, CornerRadius, FontId, Pos2, Rect, RichText, Stroke, TextureHandle, TextureOptions, Vec2};
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File},
    io::Write,
    path::PathBuf,
    sync::mpsc::{self, Receiver, Sender},
    thread,
    time::{Duration, Instant},
};
use zip::{write::SimpleFileOptions, CompressionMethod, ZipWriter};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Project {
    format: String,
    version: u32,
    title: String,
    code: String,
    width: u32,
    height: u32,
    fps: u32,
    duration_seconds: u32,
    transparent: bool,
}

impl Default for Project {
    fn default() -> Self {
        Self {
            format: "TRILYVA_PROJECT".into(),
            version: 1,
            title: "Untitled composition".into(),
            code: STARTER_CODE.into(),
            width: 1920,
            height: 1080,
            fps: 60,
            duration_seconds: 10,
            transparent: false,
        }
    }
}

enum ExportEvent {
    Progress { finished: u64, total: u64 },
    Complete(Result<PathBuf, String>),
}

pub struct TrilyvaApp {
    project: Project,
    renderer: Option<FrameRenderer>,
    renderer_source: String,
    preview: Option<TextureHandle>,
    preview_error: Option<String>,
    code: String,
    active_frame: u64,
    playing: bool,
    last_tick: Instant,
    started_at: Instant,
    intro_finished: bool,
    saved_path: Option<PathBuf>,
    status: String,
    export_rx: Option<Receiver<ExportEvent>>,
    export_progress: Option<(u64, u64)>,
    library_open: bool,
}

impl TrilyvaApp {
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        theme::install(&cc.egui_ctx);
        let project = Project::default();
        let mut app = Self {
            code: project.code.clone(),
            project,
            renderer: None,
            renderer_source: String::new(),
            preview: None,
            preview_error: None,
            active_frame: 0,
            playing: true,
            last_tick: Instant::now(),
            started_at: Instant::now(),
            intro_finished: false,
            saved_path: None,
            status: "Ready".into(),
            export_rx: None,
            export_progress: None,
            library_open: false,
        };
        app.rebuild_renderer();
        app
    }

    fn rebuild_renderer(&mut self) {
        self.renderer = None;
        match FrameRenderer::new(&self.code) {
            Ok(renderer) => {
                self.renderer = Some(renderer);
                self.renderer_source = self.code.clone();
                self.preview_error = None;
                self.status = "Animation compiled".into();
            }
            Err(error) => {
                self.preview_error = Some(error.to_string());
                self.status = "Code needs attention".into();
            }
        }
    }

    fn render_preview(&mut self, ctx: &egui::Context) {
        if self.renderer.is_none() || self.renderer_source != self.code {
            self.rebuild_renderer();
        }
        let Some(renderer) = self.renderer.as_ref() else { return; };
        let frame_count = u64::from(self.project.fps.max(1)) * u64::from(self.project.duration_seconds.max(1));
        self.active_frame %= frame_count.max(1);
        let time = self.active_frame as f64 / self.project.fps.max(1) as f64;
        let width = self.project.width.max(1);
        let height = self.project.height.max(1);
        let preview_width = 800_u32.min(width).max(1);
        let preview_height = ((preview_width as f64 * height as f64 / width as f64).round() as u32).clamp(1, 640);
        match renderer.render(time, self.active_frame, self.project.fps, width, height, preview_width, preview_height) {
            Ok(pixmap) => {
                let image = egui::ColorImage::from_rgba_premultiplied(
                    [pixmap.width() as usize, pixmap.height() as usize],
                    pixmap.data(),
                );
                if let Some(texture) = self.preview.as_mut() {
                    texture.set(image, TextureOptions::LINEAR);
                } else {
                    self.preview = Some(ctx.load_texture("trilyva-preview", image, TextureOptions::LINEAR));
                }
                self.preview_error = None;
            }
            Err(error) => self.preview_error = Some(error.to_string()),
        }
    }

    fn open_project(&mut self) {
        let Some(path) = rfd::FileDialog::new()
            .set_title("Open TRILYVA project")
            .add_filter("TRILYVA project", &["trilyva", "json"])
            .pick_file() else { return; };
        match fs::read_to_string(&path)
            .map_err(|e| e.to_string())
            .and_then(|text| serde_json::from_str::<Project>(&text).map_err(|e| e.to_string())) {
            Ok(project) if project.format == "TRILYVA_PROJECT" => {
                self.project = project;
                self.code = self.project.code.clone();
                self.saved_path = Some(path);
                self.active_frame = 0;
                self.rebuild_renderer();
                self.status = "Project opened".into();
            }
            Ok(_) => self.status = "That file is not a TRILYVA project".into(),
            Err(error) => self.status = format!("Could not open project: {error}"),
        }
    }

    fn save_project(&mut self, save_as: bool) {
        self.project.code = self.code.clone();
        let path = if !save_as { self.saved_path.clone() } else { None }.or_else(|| {
            rfd::FileDialog::new()
                .set_title("Save TRILYVA project")
                .add_filter("TRILYVA project", &["trilyva"])
                .set_file_name(format!("{}.trilyva", safe_name(&self.project.title)))
                .save_file()
        });
        let Some(path) = path else { return; };
        match serde_json::to_string_pretty(&self.project)
            .map_err(|e| e.to_string())
            .and_then(|text| fs::write(&path, text).map_err(|e| e.to_string())) {
            Ok(()) => {
                self.saved_path = Some(path);
                self.status = "Project saved".into();
            }
            Err(error) => self.status = format!("Could not save project: {error}"),
        }
    }

    fn start_sequence_export(&mut self) {
        if self.export_rx.is_some() {
            self.status = "A render is already active".into();
            return;
        }
        if u64::from(self.project.width) * u64::from(self.project.height) > 100_000_000 {
            self.status = "Resolution exceeds the current safe single-frame pixel budget".into();
            return;
        }
        let Some(output) = rfd::FileDialog::new()
            .set_title("Export PNG frame sequence")
            .add_filter("PNG frame sequence", &["zip"])
            .set_file_name(format!("{}_sequence.zip", safe_name(&self.project.title)))
            .save_file() else { return; };

        self.project.code = self.code.clone();
        let project = self.project.clone();
        let code = self.code.clone();
        let (tx, rx) = mpsc::channel();
        self.export_rx = Some(rx);
        self.export_progress = Some((0, u64::from(project.fps) * u64::from(project.duration_seconds)));
        self.status = "Rendering PNG sequence".into();
        thread::spawn(move || {
            let result = export_sequence(&project, &code, &output, &tx);
            let _ = tx.send(ExportEvent::Complete(result));
        });
    }

    fn poll_export(&mut self) {
        let events: Vec<ExportEvent> = self.export_rx.as_ref()
            .map(|rx| std::iter::from_fn(|| rx.try_recv().ok()).collect())
            .unwrap_or_default();
        for event in events {
            match event {
                ExportEvent::Progress { finished, total } => self.export_progress = Some((finished, total)),
                ExportEvent::Complete(result) => {
                    self.export_rx = None;
                    self.export_progress = None;
                    match result {
                        Ok(path) => self.status = format!(
                            "Exported {} frames · {}",
                            u64::from(self.project.fps) * u64::from(self.project.duration_seconds),
                            path.file_name().and_then(|s| s.to_str()).unwrap_or("export.zip")
                        ),
                        Err(error) => self.status = format!("Export failed: {error}"),
                    }
                }
            }
        }
    }

    fn top_button(ui: &mut egui::Ui, icon: &str, tooltip: &str) -> egui::Response {
        ui.add(egui::Button::new(RichText::new(icon).size(17.0)).min_size(Vec2::splat(34.0)))
            .on_hover_text(tooltip)
    }

    fn draw_splash(&mut self, ctx: &egui::Context) {
        let elapsed = self.started_at.elapsed().as_secs_f32();
        let progress = (elapsed / 2.6).clamp(0.0, 1.0);
        let screen = ctx.content_rect();
        let painter = ctx.layer_painter(egui::LayerId::new(egui::Order::Background, egui::Id::new("trilyva-intro")));
        painter.rect_filled(screen, CornerRadius::ZERO, theme::BG);
        let center = screen.center();
        for i in 0..6 {
            let radius = 70.0 + i as f32 * 24.0 + (elapsed * 8.0 + i as f32).sin() * 5.0;
            painter.circle_stroke(
                center,
                radius,
                Stroke::new(1.0, Color32::from_rgba_unmultiplied(255, 255, 255, (18 - i * 2).max(4) as u8)),
            );
        }
        let scale = (0.7 + progress * 0.3).min(1.0);
        paint_logo(&painter, center, 92.0 * scale, elapsed);
        let name_y = center.y + 142.0;
        painter.text(
            Pos2::new(center.x, name_y),
            egui::Align2::CENTER_CENTER,
            "TRILYVA",
            FontId::proportional(26.0),
            theme::TEXT,
        );
        let line_rect = Rect::from_center_size(Pos2::new(center.x, name_y + 34.0), Vec2::new(180.0, 2.0));
        painter.rect_filled(line_rect, CornerRadius::same(1), Color32::from_rgb(44, 44, 48));
        let fill_rect = Rect::from_min_size(line_rect.min, Vec2::new(line_rect.width() * progress, 2.0));
        painter.rect_filled(fill_rect, CornerRadius::same(1), theme::WHITE);
        painter.text(
            Pos2::new(center.x, name_y + 55.0),
            egui::Align2::CENTER_CENTER,
            "Native motion workstation",
            FontId::proportional(12.0),
            theme::MUTED,
        );
        if progress >= 1.0 {
            self.intro_finished = true;
        } else {
            ctx.request_repaint_after(Duration::from_millis(16));
        }
    }
}

impl eframe::App for TrilyvaApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.poll_export();
        if !self.intro_finished {
            self.draw_splash(ctx);
            return;
        }

        let now = Instant::now();
        if self.playing && now.duration_since(self.last_tick) >= Duration::from_secs_f64(1.0 / self.project.fps.max(1) as f64) {
            let count = u64::from(self.project.fps.max(1)) * u64::from(self.project.duration_seconds.max(1));
            self.active_frame = (self.active_frame + 1) % count.max(1);
            self.last_tick = now;
        }
        self.render_preview(ctx);

        egui::TopBottomPanel::top("topbar")
            .frame(egui::Frame::new().fill(Color32::from_rgb(11, 11, 12)).inner_margin(egui::Margin::symmetric(14, 8)))
            .show(ctx, |ui| {
                ui.horizontal_centered(|ui| {
                    let (logo_rect, _) = ui.allocate_exact_size(Vec2::splat(28.0), egui::Sense::hover());
                    paint_logo(ui.painter(), logo_rect.center(), 24.0, self.started_at.elapsed().as_secs_f32());
                    ui.add_space(4.0);
                    ui.label(RichText::new("TRILYVA").strong().size(16.0).extra_letter_spacing(1.6));
                    ui.label(RichText::new("·").color(theme::MUTED));
                    ui.label(RichText::new(&self.project.title).color(theme::MUTED).size(12.0));
                    ui.add_space(12.0);
                    if Self::top_button(ui, "⌂", "New project").clicked() {
                        self.project = Project::default();
                        self.code = self.project.code.clone();
                        self.saved_path = None;
                        self.active_frame = 0;
                        self.rebuild_renderer();
                    }
                    if Self::top_button(ui, "↥", "Open project").clicked() { self.open_project(); }
                    if Self::top_button(ui, "▣", "Save project").clicked() { self.save_project(false); }
                    if Self::top_button(ui, "▤", "Save project as").clicked() { self.save_project(true); }
                    ui.separator();
                    if Self::top_button(ui, "◫", "Library").clicked() { self.library_open = !self.library_open; }
                    if Self::top_button(ui, "⇩", "Export PNG sequence").clicked() { self.start_sequence_export(); }
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        let state = if self.export_rx.is_some() { "Rendering" } else { self.status.as_str() };
                        ui.label(RichText::new(state).size(11.0).color(theme::MUTED));
                    });
                });
            });

        egui::SidePanel::left("editor_panel")
            .resizable(true)
            .default_width(360.0)
            .width_range(270.0..=520.0)
            .frame(theme::glass_frame())
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.label(RichText::new("Code").strong().size(14.0));
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        if Self::top_button(ui, "↻", "Recompile animation").clicked() { self.rebuild_renderer(); }
                        if Self::top_button(ui, "⤴", "Restore starter animation").clicked() {
                            self.code = STARTER_CODE.into();
                            self.rebuild_renderer();
                        }
                    });
                });
                ui.label(RichText::new("JavaScript · deterministic frame API").size(11.0).color(theme::MUTED));
                ui.add_space(8.0);
                let response = ui.add(
                    egui::TextEdit::multiline(&mut self.code)
                        .font(egui::TextStyle::Monospace)
                        .desired_width(f32::INFINITY)
                        .desired_rows(30)
                        .code_editor(),
                );
                if response.changed() {
                    self.renderer_source.clear();
                }
                ui.add_space(8.0);
                if let Some(error) = &self.preview_error {
                    ui.label(RichText::new(error).color(Color32::from_rgb(230, 180, 180)).size(11.0));
                }
            });

        egui::SidePanel::right("inspector_panel")
            .resizable(true)
            .default_width(268.0)
            .width_range(230.0..=390.0)
            .frame(theme::glass_frame())
            .show(ctx, |ui| {
                ui.label(RichText::new("Composition").strong().size(14.0));
                ui.add_space(10.0);
                field_label(ui, "Name");
                ui.text_edit_singleline(&mut self.project.title);
                ui.add_space(8.0);
                ui.columns(2, |columns| {
                    field_label(&mut columns[0], "Width");
                    columns[0].add(egui::DragValue::new(&mut self.project.width).range(16..=16384).speed(16).suffix(" px"));
                    field_label(&mut columns[1], "Height");
                    columns[1].add(egui::DragValue::new(&mut self.project.height).range(16..=16384).speed(16).suffix(" px"));
                });
                ui.add_space(8.0);
                ui.horizontal(|ui| {
                    field_label(ui, "Frame rate");
                    ui.add(egui::DragValue::new(&mut self.project.fps).range(1..=240).speed(1).suffix(" fps"));
                });
                ui.horizontal(|ui| {
                    field_label(ui, "Duration");
                    egui::ComboBox::from_id_salt("duration_seconds")
                        .selected_text(format!("{} seconds", self.project.duration_seconds))
                        .show_ui(ui, |ui| {
                            for duration in [5, 10, 15, 20, 30, 60] {
                                ui.selectable_value(&mut self.project.duration_seconds, duration, format!("{} seconds", duration));
                            }
                        });
                });
                ui.add_space(8.0);
                ui.checkbox(&mut self.project.transparent, "Transparent background");
                ui.add_space(12.0);
                ui.separator();
                ui.label(RichText::new("Output").strong().size(14.0));
                ui.add_space(8.0);
                let total = u64::from(self.project.fps) * u64::from(self.project.duration_seconds);
                stat_row(ui, "Frames", &total.to_string());
                stat_row(ui, "Resolution", &format!("{} × {}", self.project.width, self.project.height));
                stat_row(ui, "Rate", &format!("{} fps", self.project.fps));
                ui.add_space(12.0);
                if ui.add_sized([ui.available_width(), 38.0], egui::Button::new(RichText::new("Render PNG sequence").strong())).clicked() {
                    self.start_sequence_export();
                }
                if let Some((done, all)) = self.export_progress {
                    ui.add_space(8.0);
                    ui.label(RichText::new(format!("{done} / {all} frames")).size(11.0).color(theme::MUTED));
                    ui.add(egui::ProgressBar::new(done as f32 / all.max(1) as f32).show_percentage());
                }
                ui.add_space(8.0);
                ui.label(RichText::new("Video export, deeper Canvas support, and the full project/library workflow are being added in native-engine work.").size(10.0).color(theme::MUTED));
            });

        egui::CentralPanel::default()
            .frame(egui::Frame::new().fill(theme::BG).inner_margin(egui::Margin::same(14)))
            .show(ctx, |ui| {
                ui.vertical(|ui| {
                    ui.horizontal(|ui| {
                        ui.label(RichText::new("Preview").strong().size(14.0));
                        let frame_total = self.project.fps.max(1) * self.project.duration_seconds.max(1);
                        ui.label(RichText::new(format!("{} / {}", self.active_frame + 1, frame_total)).color(theme::MUTED).size(11.0));
                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            if Self::top_button(ui, "↺", "Restart preview").clicked() { self.active_frame = 0; }
                            if Self::top_button(ui, if self.playing { "Ⅱ" } else { "▶" }, if self.playing { "Pause" } else { "Play" }).clicked() {
                                self.playing = !self.playing;
                                self.last_tick = Instant::now();
                            }
                        });
                    });
                    ui.add_space(10.0);
                    egui::Frame::new()
                        .fill(Color32::from_rgb(10, 10, 12))
                        .stroke(Stroke::new(1.0, Color32::from_rgb(42, 42, 47)))
                        .corner_radius(CornerRadius::same(16))
                        .inner_margin(egui::Margin::same(10))
                        .show(ui, |ui| {
                            let available = ui.available_size();
                            let ratio = self.project.width.max(1) as f32 / self.project.height.max(1) as f32;
                            let mut size = available;
                            if size.x / size.y > ratio { size.x = size.y * ratio; } else { size.y = size.x / ratio; }
                            size.x = size.x.max(80.0);
                            size.y = size.y.max(45.0);
                            let (canvas_rect, _) = ui.allocate_exact_size(size, egui::Sense::hover());
                            paint_checkerboard(ui.painter(), canvas_rect, 14.0);
                            if let Some(texture) = &self.preview {
                                ui.painter().image(texture.id(), canvas_rect, Rect::from_min_max(Pos2::ZERO, Pos2::new(1.0, 1.0)), Color32::WHITE);
                            } else {
                                ui.painter().text(canvas_rect.center(), egui::Align2::CENTER_CENTER, "Preparing preview", FontId::proportional(14.0), theme::MUTED);
                            }
                        });
                    ui.add_space(12.0);
                    ui.horizontal(|ui| {
                        stat_row(ui, "Time", &format!("{:.3}s", self.active_frame as f64 / self.project.fps.max(1) as f64));
                        ui.separator();
                        stat_row(ui, "Resolution", &format!("{} × {}", self.project.width, self.project.height));
                        ui.separator();
                        stat_row(ui, "Renderer", "Native Rust + QuickJS");
                    });
                    if self.library_open {
                        ui.add_space(10.0);
                        egui::Frame::new().fill(theme::PANEL).stroke(Stroke::new(1.0, theme::LINE)).corner_radius(CornerRadius::same(14)).inner_margin(egui::Margin::same(12)).show(ui, |ui| {
                            ui.horizontal(|ui| {
                                ui.label(RichText::new("Local projects").strong());
                                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                    if Self::top_button(ui, "×", "Close library").clicked() { self.library_open = false; }
                                });
                            });
                            ui.label(RichText::new(self.saved_path.as_ref().map(|p| p.display().to_string()).unwrap_or_else(|| "No saved project is open yet.".into())).size(11.0).color(theme::MUTED));
                            ui.label(RichText::new("Open or save .trilyva project files from the top toolbar. The catalog and import workflow are planned for a later native release chunk.").size(11.0).color(theme::MUTED));
                        });
                    }
                });
            });

        if self.playing || self.export_rx.is_some() {
            ctx.request_repaint_after(Duration::from_millis(16));
        }
    }
}

fn field_label(ui: &mut egui::Ui, label: &str) {
    ui.label(RichText::new(label).size(11.0).color(theme::MUTED));
}
fn stat_row(ui: &mut egui::Ui, label: &str, value: &str) {
    ui.vertical(|ui| {
        ui.label(RichText::new(label).size(10.0).color(theme::MUTED));
        ui.label(RichText::new(value).size(12.0));
    });
}
fn safe_name(value: &str) -> String {
    let mut out = value.chars().map(|c| if c.is_ascii_alphanumeric() { c.to_ascii_lowercase() } else { '-' }).collect::<String>();
    while out.contains("--") { out = out.replace("--", "-"); }
    let trimmed = out.trim_matches('-').to_string();
    if trimmed.is_empty() { "trilyva-project".into() } else { trimmed }
}

fn paint_checkerboard(painter: &egui::Painter, rect: Rect, cell: f32) {
    painter.rect_filled(rect, CornerRadius::same(8), Color32::from_rgb(18, 18, 20));
    let cols = (rect.width() / cell).ceil() as usize;
    let rows = (rect.height() / cell).ceil() as usize;
    for y in 0..rows {
        for x in 0..cols {
            if (x + y) % 2 == 0 {
                let tile = Rect::from_min_size(
                    Pos2::new(rect.left() + x as f32 * cell, rect.top() + y as f32 * cell),
                    Vec2::splat(cell),
                ).intersect(rect);
                painter.rect_filled(tile, CornerRadius::ZERO, Color32::from_rgb(27, 27, 30));
            }
        }
    }
    painter.rect_stroke(rect, CornerRadius::same(8), Stroke::new(1.0, Color32::from_rgb(48, 48, 53)), egui::StrokeKind::Inside);
}

fn paint_logo(painter: &egui::Painter, center: Pos2, size: f32, time: f32) {
    let radius = (size * 0.2) as u8;
    let outer = Rect::from_center_size(center, Vec2::splat(size * 1.42));
    painter.rect_filled(outer, CornerRadius::same(radius), Color32::from_rgb(16, 16, 18));
    painter.rect_stroke(outer, CornerRadius::same(radius), Stroke::new(1.0, Color32::from_rgba_unmultiplied(255, 255, 255, 40)), egui::StrokeKind::Inside);
    let w = size * 0.18;
    let h = size * 0.82;
    let bar = Rect::from_center_size(Pos2::new(center.x, center.y + h * 0.11), Vec2::new(w, h));
    painter.rect_filled(bar, CornerRadius::same((w * 0.22) as u8), theme::WHITE);
    let top = Rect::from_center_size(Pos2::new(center.x, center.y - h * 0.31), Vec2::new(size * 0.66, w));
    painter.rect_filled(top, CornerRadius::same((w * 0.22) as u8), theme::WHITE);
    let orbit = Rect::from_center_size(center, Vec2::splat(size * 1.08));
    painter.circle_stroke(center, size * (0.58 + 0.025 * (time * 1.8).sin()), Stroke::new(1.0, Color32::from_rgba_unmultiplied(255, 255, 255, 90)));
    let angle = time * 2.0;
    painter.circle_filled(Pos2::new(center.x + angle.cos() * orbit.width() * 0.49, center.y + angle.sin() * orbit.height() * 0.49), size * 0.035, theme::WHITE);
}

fn export_sequence(project: &Project, code: &str, output: &PathBuf, tx: &Sender<ExportEvent>) -> Result<PathBuf, String> {
    let total = u64::from(project.fps.max(1)) * u64::from(project.duration_seconds.max(1));
    let mut renderer = FrameRenderer::new(code).map_err(|e| e.to_string())?;
    let file = File::create(output).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    let mut digest = sha2::Sha256::new();
    use sha2::Digest;
    for frame in 0..total {
        let time = frame as f64 / project.fps.max(1) as f64;
        let width = project.width.max(1);
        let height = project.height.max(1);
        if u64::from(width) * u64::from(height) > 100_000_000 {
            return Err("Frame size exceeds the native exporter safety limit.".into());
        }
        let pixmap = renderer.render(time, frame, project.fps.max(1), width, height, width, height).map_err(|e| e.to_string())?;
        let png = pixmap.encode_png().map_err(|e| e.to_string())?;
        if !png.starts_with(b"\x89PNG\r\n\x1a\n") {
            return Err(format!("Frame {} failed PNG signature validation.", frame));
        }
        digest.update(&png);
        zip.start_file(format!("frames/frame_{:06}.png", frame), options).map_err(|e| e.to_string())?;
        zip.write_all(&png).map_err(|e| e.to_string())?;
        if frame % 2 == 0 || frame + 1 == total {
            let _ = tx.send(ExportEvent::Progress { finished: frame + 1, total });
        }
    }
    let manifest = serde_json::json!({
        "format": "TRILYVA_PNG_SEQUENCE",
        "version": 1,
        "creator": "TRILYVA — Tamasrazim",
        "title": project.title,
        "width": project.width,
        "height": project.height,
        "fps": project.fps,
        "durationSeconds": project.duration_seconds,
        "frameCount": total,
        "transparentBackgroundRequested": project.transparent,
        "sourceSha256": format!("{:x}", digest.finalize()),
        "generatedAt": Utc::now().to_rfc3339(),
        "frameNaming": "frames/frame_%06d.png",
        "note": "Frame pixels were generated by the native TRILYVA canvas-compatibility renderer. Check exported pixels before using assets that require transparency."
    });
    zip.start_file("manifest.json", options).map_err(|e| e.to_string())?;
    zip.write_all(serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?.as_bytes()).map_err(|e| e.to_string())?;
    zip.start_file("README.txt", options).map_err(|e| e.to_string())?;
    writeln!(zip, "TRILYVA PNG SEQUENCE\n{}x{} @ {} FPS\n{} frames · {:.3} seconds\nFrames are numbered from 000000. See manifest.json for the source hash and composition settings.", project.width, project.height, project.fps, total, total as f64 / project.fps.max(1) as f64).map_err(|e| e.to_string())?;
    zip.finish().map_err(|e| e.to_string())?;
    Ok(output.clone())
}
