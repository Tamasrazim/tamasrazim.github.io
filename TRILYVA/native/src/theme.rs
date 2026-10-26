use eframe::egui::{self, Color32, CornerRadius, Frame, Margin, Stroke};

pub const BG: Color32 = Color32::from_rgb(7, 7, 8);
pub const SURFACE: Color32 = Color32::from_rgb(16, 16, 18);
pub const PANEL: Color32 = Color32::from_rgb(21, 21, 24);
pub const TEXT: Color32 = Color32::from_rgb(242, 242, 245);
pub const MUTED: Color32 = Color32::from_rgb(148, 148, 156);
pub const LINE: Color32 = Color32::from_rgb(58, 58, 64);
pub const WHITE: Color32 = Color32::from_rgb(255, 255, 255);

pub fn install(ctx: &egui::Context) {
    let mut visuals = egui::Visuals::dark();
    visuals.dark_mode = true;
    visuals.panel_fill = BG;
    visuals.window_fill = SURFACE;
    visuals.faint_bg_color = Color32::from_rgb(12, 12, 13);
    visuals.extreme_bg_color = Color32::from_rgb(4, 4, 5);
    visuals.widgets.noninteractive.bg_fill = Color32::from_rgb(22, 22, 25);
    visuals.widgets.noninteractive.fg_stroke.color = TEXT;
    visuals.widgets.inactive.bg_fill = Color32::from_rgb(30, 30, 34);
    visuals.widgets.inactive.fg_stroke.color = TEXT;
    visuals.widgets.hovered.bg_fill = Color32::from_rgb(52, 52, 58);
    visuals.widgets.hovered.fg_stroke.color = WHITE;
    visuals.widgets.active.bg_fill = Color32::from_rgb(72, 72, 78);
    visuals.widgets.active.fg_stroke.color = WHITE;
    visuals.selection.bg_fill = Color32::from_rgb(86, 86, 94);
    visuals.selection.stroke.color = WHITE;
    visuals.window_corner_radius = CornerRadius::same(16);
    visuals.menu_corner_radius = CornerRadius::same(10);
    ctx.set_visuals(visuals);
    ctx.style_mut(|style| {
        style.spacing.item_spacing = egui::vec2(10.0, 9.0);
        style.spacing.button_padding = egui::vec2(10.0, 8.0);
        style.animation_time = 0.16;
        style.visuals.override_text_color = Some(TEXT);
    });
}

pub fn glass_frame() -> Frame {
    Frame::new()
        .fill(Color32::from_rgba_unmultiplied(255, 255, 255, 8))
        .stroke(Stroke::new(1.0, Color32::from_rgba_unmultiplied(255, 255, 255, 24)))
        .corner_radius(CornerRadius::same(16))
        .inner_margin(Margin::same(12))
}

pub fn small_glass_frame() -> Frame {
    Frame::new()
        .fill(Color32::from_rgba_unmultiplied(255, 255, 255, 5))
        .stroke(Stroke::new(1.0, Color32::from_rgba_unmultiplied(255, 255, 255, 18)))
        .corner_radius(CornerRadius::same(12))
        .inner_margin(Margin::same(9))
}
