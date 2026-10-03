mod audio;

use audio::{AudioEngine, AudioStatus, DeviceList};
use tauri::{Manager, State};

#[tauri::command]
fn list_audio_devices() -> Result<DeviceList, String> {
    AudioEngine::devices()
}

#[tauri::command]
fn start_audio(engine: State<AudioEngine>, input: String, output: String) -> Result<AudioStatus, String> {
    engine.start(input, output)
}

#[tauri::command]
fn stop_audio(engine: State<AudioEngine>) -> Result<AudioStatus, String> {
    engine.stop()?;
    engine.status()
}

#[tauri::command]
fn set_audio_params(
    engine: State<AudioEngine>,
    rate_hz: f32,
    depth_ms: f32,
    delay_ms: f32,
    feedback: f32,
    mix: f32,
    reverb: f32,
    output_db: f32,
    enabled: bool,
    monitoring: bool,
) -> Result<(), String> {
    engine.set_params(
        rate_hz, depth_ms, delay_ms, feedback, mix, reverb, output_db, enabled, monitoring,
    )
}

#[tauri::command]
fn audio_status(engine: State<AudioEngine>) -> Result<AudioStatus, String> {
    engine.status()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(AudioEngine::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_audio_devices,
            start_audio,
            stop_audio,
            set_audio_params,
            audio_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running Spiral Mic");
}
