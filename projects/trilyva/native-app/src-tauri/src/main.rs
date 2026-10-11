#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use reqwest::{redirect::Policy, Client};
use serde::Serialize;
use serde_json::Value;
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::{atomic::{AtomicU64, Ordering}, Mutex},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

const VOICESTUDIO_BASE: &str = "http://127.0.0.1:3900";
const MAX_AUDIO_BYTES: usize = 64 * 1024 * 1024;
const MAX_VOICE_LIST_BYTES: usize = 2 * 1024 * 1024;
const MAX_PROJECT_BYTES: usize = 20 * 1024 * 1024;
static NEXT_OPEN_TOKEN: AtomicU64 = AtomicU64::new(1);

#[derive(Default)]
struct NativeProjectSession {
    current_path: Mutex<Option<PathBuf>>,
    pending_paths: Mutex<HashMap<String, PathBuf>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeProjectFile {
    content: String,
    file_name: String,
    open_token: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VoiceStudioProbe {
    online: bool,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SpeechAudio {
    mime_type: String,
    byte_length: usize,
    audio_base64: String,
}

fn local_client(timeout: Duration) -> Result<Client, String> {
    Client::builder()
        .connect_timeout(Duration::from_secs(3))
        .timeout(timeout)
        .redirect(Policy::none())
        .build()
        .map_err(|error| format!("Could not prepare the local speech connection: {error}"))
}

async fn read_api_error(response: reqwest::Response) -> String {
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    let detail = body.chars().take(700).collect::<String>();
    if detail.trim().is_empty() {
        format!("VoiceStudio returned HTTP {status}.")
    } else {
        format!("VoiceStudio returned HTTP {status}: {detail}")
    }
}

fn validate_tmotion(text: &str) -> Result<(), String> {
    if text.len() > MAX_PROJECT_BYTES {
        return Err("TRILYVA project files must be 20 MiB or smaller.".to_string());
    }
    let document: Value = serde_json::from_str(text)
        .map_err(|error| format!("The project is not valid JSON: {error}"))?;
    if document.get("format").and_then(Value::as_str) != Some("tmotion") {
        return Err("This is not a TRILYVA .tmotion project. The required format marker is missing.".to_string());
    }
    Ok(())
}

fn basename(path: &Path) -> String {
    path.file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "Untitled.tmotion".to_string())
}

fn safe_suggested_name(input: &str) -> String {
    let name = Path::new(input)
        .file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_default();
    let stem = name
        .strip_suffix(".tmotion")
        .or_else(|| name.strip_suffix(".TMOTION"))
        .unwrap_or(&name);
    let safe: String = stem
        .chars()
        .filter(|character| character.is_alphanumeric() || matches!(character, ' ' | '-' | '_' | '.'))
        .take(100)
        .collect();
    let safe = safe.trim().trim_matches('.');
    if safe.is_empty() {
        "Untitled.tmotion".to_string()
    } else {
        format!("{safe}.tmotion")
    }
}

fn ensure_tmotion_extension(path: &mut PathBuf) {
    let is_tmotion = path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("tmotion"));
    if !is_tmotion {
        path.set_extension("tmotion");
    }
}

#[tauri::command]
fn native_project_open(
    app: AppHandle,
    state: State<'_, NativeProjectSession>,
) -> Result<Option<NativeProjectFile>, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("TRILYVA Project", &["tmotion"])
        .blocking_pick_file();

    let Some(selected) = selected else {
        return Ok(None);
    };

    let path = selected
        .into_path()
        .map_err(|_| "The selected path could not be accessed as a local file.".to_string())?;
    let metadata = fs::metadata(&path)
        .map_err(|error| format!("Could not inspect the selected project: {error}"))?;
    if !metadata.is_file() {
        return Err("Choose a single .tmotion project file.".to_string());
    }
    if metadata.len() > MAX_PROJECT_BYTES as u64 {
        return Err("The selected project is larger than the 20 MiB safety limit.".to_string());
    }
    let content = fs::read_to_string(&path)
        .map_err(|error| format!("Could not read the selected project as UTF-8: {error}"))?;
    validate_tmotion(&content)?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "The system clock is before the Unix epoch.".to_string())?
        .as_nanos();
    let serial = NEXT_OPEN_TOKEN.fetch_add(1, Ordering::Relaxed);
    let open_token = format!("{timestamp:x}-{serial:x}");
    let mut pending = state
        .pending_paths
        .lock()
        .map_err(|_| "The native project session is unavailable.".to_string())?;
    pending.clear();
    pending.insert(open_token.clone(), path);

    Ok(Some(NativeProjectFile {
        content,
        file_name: basename(
            pending
                .get(&open_token)
                .expect("the selected path was just recorded"),
        ),
        open_token,
    }))
}

#[tauri::command]
fn native_project_accept_open(
    token: String,
    state: State<'_, NativeProjectSession>,
) -> Result<String, String> {
    if token.len() > 64 || !token.chars().all(|character| character.is_ascii_hexdigit() || character == '-') {
        return Err("The native project-open token is invalid.".to_string());
    }
    let mut pending = state
        .pending_paths
        .lock()
        .map_err(|_| "The native project session is unavailable.".to_string())?;
    let path = pending
        .remove(&token)
        .ok_or_else(|| "The selected project is no longer pending. Open it again.".to_string())?;
    drop(pending);

    let name = basename(&path);
    let mut current = state
        .current_path
        .lock()
        .map_err(|_| "The native project session is unavailable.".to_string())?;
    *current = Some(path);
    Ok(name)
}

#[tauri::command]
fn native_project_save(
    app: AppHandle,
    state: State<'_, NativeProjectSession>,
    content: String,
    suggested_name: String,
    save_as: bool,
) -> Result<Option<String>, String> {
    validate_tmotion(&content)?;

    let existing = if save_as {
        None
    } else {
        state
            .current_path
            .lock()
            .map_err(|_| "The native project session is unavailable.".to_string())?
            .clone()
    };

    let mut path = match existing {
        Some(path) => path,
        None => {
            let selected = app
                .dialog()
                .file()
                .add_filter("TRILYVA Project", &["tmotion"])
                .set_file_name(safe_suggested_name(&suggested_name))
                .blocking_save_file();
            let Some(selected) = selected else {
                return Ok(None);
            };
            selected
                .into_path()
                .map_err(|_| "The selected save location could not be accessed as a local file.".to_string())?
        }
    };
    ensure_tmotion_extension(&mut path);
    fs::write(&path, content.as_bytes())
        .map_err(|error| format!("Could not save the project file: {error}"))?;

    let name = basename(&path);
    let mut current = state
        .current_path
        .lock()
        .map_err(|_| "The native project session is unavailable.".to_string())?;
    *current = Some(path);
    Ok(Some(name))
}

#[tauri::command]
async fn voicestudio_probe() -> VoiceStudioProbe {
    let client = match local_client(Duration::from_secs(4)) {
        Ok(client) => client,
        Err(error) => {
            return VoiceStudioProbe {
                online: false,
                message: error,
            };
        }
    };

    for path in ["/health", "/.well-known/voicestudio-speech"] {
        match client.get(format!("{VOICESTUDIO_BASE}{path}")).send().await {
            Ok(response) if response.status().is_success() => {
                return VoiceStudioProbe {
                    online: true,
                    message: "VoiceStudio answered on this computer.".to_string(),
                };
            }
            Ok(_) => {}
            Err(_) => {}
        }
    }

    VoiceStudioProbe {
        online: false,
        message: "VoiceStudio was not found at 127.0.0.1:3900. Open VoiceStudio, wait for its local API to start, then check again.".to_string(),
    }
}

#[tauri::command]
async fn voicestudio_models() -> Result<Value, String> {
    let client = local_client(Duration::from_secs(12))?;
    let response = client
        .get(format!("{VOICESTUDIO_BASE}/v1/models"))
        .send()
        .await
        .map_err(|_| "Cannot reach VoiceStudio's local model-list endpoint. Check that the app is running.".to_string())?;

    if !response.status().is_success() {
        return Err(read_api_error(response).await);
    }
    if response.content_length().is_some_and(|length| length > MAX_VOICE_LIST_BYTES as u64) {
        return Err("VoiceStudio returned an unexpectedly large model list.".to_string());
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("Could not read the local model list: {error}"))?;
    if bytes.len() > MAX_VOICE_LIST_BYTES {
        return Err("VoiceStudio returned an unexpectedly large model list.".to_string());
    }

    serde_json::from_slice::<Value>(&bytes)
        .map_err(|error| format!("VoiceStudio returned invalid model-list JSON: {error}"))
}

#[tauri::command]
async fn voicestudio_voices() -> Result<Value, String> {
    let client = local_client(Duration::from_secs(12))?;
    let response = client
        .get(format!("{VOICESTUDIO_BASE}/v1/audio/voices"))
        .send()
        .await
        .map_err(|_| "Cannot reach VoiceStudio's local voices endpoint. Check that the app is running.".to_string())?;

    if !response.status().is_success() {
        return Err(read_api_error(response).await);
    }
    if response.content_length().is_some_and(|length| length > MAX_VOICE_LIST_BYTES as u64) {
        return Err("VoiceStudio returned an unexpectedly large voice list.".to_string());
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("Could not read the local voice list: {error}"))?;
    if bytes.len() > MAX_VOICE_LIST_BYTES {
        return Err("VoiceStudio returned an unexpectedly large voice list.".to_string());
    }

    serde_json::from_slice::<Value>(&bytes)
        .map_err(|error| format!("VoiceStudio returned invalid voice-list JSON: {error}"))
}

#[tauri::command]
async fn voicestudio_synthesize(
    input: String,
    model: String,
    voice: String,
    speed: f64,
) -> Result<SpeechAudio, String> {
    let character_count = input.chars().count();
    if character_count == 0 || character_count > 4096 {
        return Err("Each dialogue cue must contain between 1 and 4096 characters.".to_string());
    }
    if input.contains('\0') {
        return Err("The dialogue contains a NUL character.".to_string());
    }
    if model.trim().is_empty()
        || model.len() > 100
        || !model
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "._-".contains(character))
    {
        return Err("Choose a valid VoiceStudio engine identifier.".to_string());
    }
    if voice.trim().is_empty()
        || voice.chars().count() > 200
        || voice.chars().any(char::is_control)
    {
        return Err("Choose a valid VoiceStudio voice profile or preset.".to_string());
    }
    if !speed.is_finite() || !(0.25..=4.0).contains(&speed) {
        return Err("Speech speed must be between 0.25× and 4×.".to_string());
    }

    let client = local_client(Duration::from_secs(300))?;
    let response = client
        .post(format!("{VOICESTUDIO_BASE}/v1/audio/speech"))
        .json(&serde_json::json!({
            "model": model,
            "voice": voice,
            "input": input,
            "response_format": "wav",
            "speed": speed
        }))
        .send()
        .await
        .map_err(|_| "VoiceStudio did not return audio. Confirm that the selected engine is installed and active.".to_string())?;

    let status = response.status();
    if !status.is_success() {
        return Err(read_api_error(response).await);
    }
    if response.content_length().is_some_and(|length| length > MAX_AUDIO_BYTES as u64) {
        return Err("VoiceStudio's response exceeded the 64 MiB safety limit.".to_string());
    }

    let mime_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("audio/wav")
        .split(';')
        .next()
        .unwrap_or("audio/wav")
        .trim()
        .to_ascii_lowercase();

    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("Could not read the generated speech: {error}"))?;
    if bytes.len() > MAX_AUDIO_BYTES {
        return Err("VoiceStudio's response exceeded the 64 MiB safety limit.".to_string());
    }
    if bytes.len() < 44 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        let hint = if mime_type.contains("json") {
            "VoiceStudio returned JSON instead of a WAV file. Check the active engine and its API compatibility."
        } else {
            "VoiceStudio did not return a valid WAV stream."
        };
        return Err(hint.to_string());
    }

    Ok(SpeechAudio {
        mime_type: "audio/wav".to_string(),
        byte_length: bytes.len(),
        audio_base64: BASE64_STANDARD.encode(bytes),
    })
}

fn main() {
    tauri::Builder::default()
        .manage(NativeProjectSession::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            native_project_open,
            native_project_accept_open,
            native_project_save,
            voicestudio_probe,
            voicestudio_models,
            voicestudio_voices,
            voicestudio_synthesize
        ])
        .run(tauri::generate_context!())
        .expect("TRILYVA desktop runtime failed to start");
}
