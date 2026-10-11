#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use reqwest::{redirect::Policy, Client, StatusCode};
use serde::Serialize;
use serde_json::Value;
use std::time::Duration;

const VOICESTUDIO_BASE: &str = "http://127.0.0.1:3900";
const MAX_AUDIO_BYTES: usize = 64 * 1024 * 1024;
const MAX_VOICE_LIST_BYTES: usize = 2 * 1024 * 1024;

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
        .invoke_handler(tauri::generate_handler![
            voicestudio_probe,
            voicestudio_voices,
            voicestudio_synthesize
        ])
        .run(tauri::generate_context!())
        .expect("TRILYVA desktop runtime failed to start");
}
