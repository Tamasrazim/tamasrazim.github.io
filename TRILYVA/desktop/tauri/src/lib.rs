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
async fn choose_png_sequence_archive() -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Choose a TRILYVA PNG frame sequence ZIP")
            .add_filter("TRILYVA PNG sequence archive", &["zip"])
            .pick_file()
            .map(|path| path.to_string_lossy().into_owned())
    })
    .await
    .map_err(|error| format!("PNG sequence ZIP picker failed: {error}"))
}

#[tauri::command]
async fn choose_alpha_output(profile: String) -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(move || {
        let (filter_name, extension, file_name) = match profile.as_str() {
            "webm" => ("Transparent WebM video", "webm", "trilyva-alpha.webm"),
            "mov" => ("ProRes 4444 MOV video", "mov", "trilyva-alpha.mov"),
            "apng" => ("Transparent animated PNG", "apng", "trilyva-alpha.apng"),
            _ => return None,
        };
        rfd::FileDialog::new()
            .set_title("Save transparent media output")
            .add_filter(filter_name, &[extension])
            .set_file_name(file_name)
            .save_file()
            .map(|path| path.to_string_lossy().into_owned())
    })
    .await
    .map_err(|error| format!("Alpha video save dialog failed: {error}"))
}


#[tauri::command]
async fn begin_native_png_sequence(
    store: tauri::State<'_, media::NativeSequenceStore>,
    config: media::RenderConfig,
    project_name: String,
    prefix: String,
) -> Result<Option<media::NativeSequenceInfo>, String> {
    let Some(parent) = tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Choose where TRILYVA should save the transparent render frames")
            .pick_folder()
    })
    .await
    .map_err(|error| format!("Native frame-folder picker failed: {error}"))? else {
        return Ok(None);
    };
    let store = store.inner().clone();
    tokio::task::spawn_blocking(move || {
        media::create_native_sequence(&store, parent, &project_name, &prefix, config)
    })
    .await
    .map_err(|error| format!("Native sequence setup worker failed: {error}"))?
    .map(Some)
}

#[tauri::command]
async fn write_native_sequence_file(
    store: tauri::State<'_, media::NativeSequenceStore>,
    session_id: String,
    file_name: String,
    base64_data: String,
) -> Result<media::NativeSequenceWriteReceipt, String> {
    let store = store.inner().clone();
    tokio::task::spawn_blocking(move || {
        media::write_native_sequence_file(&store, &session_id, &file_name, &base64_data)
    })
    .await
    .map_err(|error| format!("Native frame-write worker failed: {error}"))?
}

#[tauri::command]
async fn write_native_sequence_chunk(
    store: tauri::State<'_, media::NativeSequenceStore>,
    session_id: String,
    file_name: String,
    base64_data: String,
    final_chunk: bool,
) -> Result<media::NativeSequenceWriteReceipt, String> {
    let store = store.inner().clone();
    tokio::task::spawn_blocking(move || {
        media::write_native_sequence_chunk(&store, &session_id, &file_name, &base64_data, final_chunk)
    })
    .await
    .map_err(|error| format!("Native frame-chunk worker failed: {error}"))?
}

#[tauri::command]
async fn finalize_native_png_sequence(
    store: tauri::State<'_, media::NativeSequenceStore>,
    session_id: String,
) -> Result<media::NativeSequenceInfo, String> {
    let store = store.inner().clone();
    tokio::task::spawn_blocking(move || {
        media::finalize_native_sequence(&store, &session_id)
    })
    .await
    .map_err(|error| format!("Native sequence verification worker failed: {error}"))?
}

#[tauri::command]
async fn discard_native_png_sequence(
    store: tauri::State<'_, media::NativeSequenceStore>,
    session_id: String,
) -> Result<(), String> {
    let store = store.inner().clone();
    tokio::task::spawn_blocking(move || {
        media::discard_native_sequence(&store, &session_id)
    })
    .await
    .map_err(|error| format!("Native sequence cleanup worker failed: {error}"))?
}

#[tauri::command]
async fn encode_native_png_sequence(
    app: tauri::AppHandle,
    store: tauri::State<'_, media::NativeSequenceStore>,
    session_id: String,
    output_path: String,
    profile: String,
    bitrate_bps: Option<u64>,
) -> Result<media::EncodeResult, String> {
    let (encoder, pixel_format) = match profile.as_str() {
        "webm" => ("libvpx-vp9", "yuva420p"),
        "mov" => ("prores_ks", "yuva444p10le"),
        "apng" => ("apng", "rgba"),
        _ => return Err("Choose WebM, MOV, or APNG for transparent output.".to_string()),
    };
    let store_ref = store.inner().clone();
    let options = media::native_sequence_encode_options(
        &store_ref,
        &session_id,
        output_path,
        encoder.to_string(),
        bitrate_bps,
        Some(pixel_format.to_string()),
    )?;
    let app_for_worker = app.clone();
    let store_for_worker = store_ref.clone();
    let session_for_worker = session_id.clone();
    let result = tokio::task::spawn_blocking(move || {
        media::encode_png_sequence(app_for_worker, options)
    })
    .await
    .map_err(|error| format!("Native media encoder worker failed: {error}"))?;
    if result.is_ok() {
        // Keep the rendered PNG frames on disk for possible vector/sequence reuse,
        // but release the in-memory session once a verified media export succeeds.
        let _ = media::release_native_sequence(&store_for_worker, &session_for_worker);
    }
    result
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
        .manage(media::NativeSequenceStore::default())
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
            choose_png_sequence_archive,
            choose_alpha_output,
            begin_native_png_sequence,
            write_native_sequence_file,
            write_native_sequence_chunk,
            finalize_native_png_sequence,
            discard_native_png_sequence,
            encode_native_png_sequence,
            encode_png_sequence,
            verify_media_file
        ])
        .run(tauri::generate_context!())
        .expect("TRILYVA desktop runtime failed");
}
