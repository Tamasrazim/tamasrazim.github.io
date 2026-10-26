// Registers the TRILYVA desktop commands exposed to the existing workspace.
mod media;

use serde::Serialize;
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopStatus {
    product: &'static str,
    version: &'static str,
    operating_system: &'static str,
    architecture: &'static str,
    ffmpeg_available: bool,
    ffprobe_available: bool,
}

#[tauri::command]
fn desktop_status(app: tauri::AppHandle) -> DesktopStatus {
    let capabilities = media::discover(&app);
    DesktopStatus {
        product: "TRILYVA",
        version: env!("CARGO_PKG_VERSION"),
        operating_system: std::env::consts::OS,
        architecture: std::env::consts::ARCH,
        ffmpeg_available: capabilities.ffmpeg_available,
        ffprobe_available: capabilities.ffprobe_available,
    }
}

#[tauri::command]
fn media_capabilities(app: tauri::AppHandle) -> media::MediaCapabilities {
    media::discover(&app)
}

#[tauri::command]
fn validate_render_config(config: media::RenderConfig) -> Result<media::ValidatedRenderConfig, String> {
    media::validate_config(config)
}

#[tauri::command]
async fn choose_png_sequence_directory() -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Choose a TRILYVA PNG frame sequence folder")
            .pick_folder()
            .map(|path| path.to_string_lossy().into_owned())
    })
    .await
    .map_err(|error| format!("PNG directory picker failed: {error}"))
}

#[tauri::command]
async fn choose_alpha_output(profile: String) -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(move || {
        let (filter_name, extension, file_name) = match profile.as_str() {
            "webm" => ("Transparent WebM video", "webm", "trilyva-alpha.webm"),
            "mov" => ("ProRes 4444 MOV video", "mov", "trilyva-alpha.mov"),
            _ => return None,
        };
        rfd::FileDialog::new()
            .set_title("Save transparent video")
            .add_filter(filter_name, &[extension])
            .set_file_name(file_name)
            .save_file()
            .map(|path| path.to_string_lossy().into_owned())
    })
    .await
    .map_err(|error| format!("Alpha video save dialog failed: {error}"))
}

#[tauri::command]
async fn encode_png_sequence(
    app: tauri::AppHandle,
    options: media::PngSequenceEncodeOptions,
) -> Result<media::EncodeResult, String> {
    tokio::task::spawn_blocking(move || media::encode_png_sequence(app, options))
        .await
        .map_err(|error| format!("Encoding worker failed: {error}"))?
}

#[tauri::command]
async fn verify_media_file(
    app: tauri::AppHandle,
    path: String,
) -> Result<media::MediaVerification, String> {
    tokio::task::spawn_blocking(move || media::verify_media_file(&app, &path))
        .await
        .map_err(|error| format!("Media verification worker failed: {error}"))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Missing media tools are reported in the workspace; they do not block startup.
            let _ = media::discover(app.handle());
            let _ = app.path().app_data_dir();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            desktop_status,
            media_capabilities,
            validate_render_config,
            choose_png_sequence_directory,
            choose_alpha_output,
            encode_png_sequence,
            verify_media_file
        ])
        .run(tauri::generate_context!())
        .expect("TRILYVA desktop runtime failed");
}
