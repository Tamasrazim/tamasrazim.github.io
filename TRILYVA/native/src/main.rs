mod app;
mod renderer;
mod theme;

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: eframe::egui::ViewportBuilder::default()
            .with_inner_size([1440.0, 900.0])
            .with_min_inner_size([1120.0, 680.0])
            .with_title("TRILYVA"),
        ..Default::default()
    };

    eframe::run_native(
        "TRILYVA",
        options,
        Box::new(|creation| Ok(Box::new(app::TrilyvaApp::new(creation)))),
    )
}
