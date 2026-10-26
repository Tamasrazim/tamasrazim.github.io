// Runtime discovery, export validation, PNG-sequence encoding, and output verification.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::VecDeque,
    fs,
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::Instant,
};
use tauri::{AppHandle, Emitter, Manager};
use zip::ZipArchive;
use uuid::Uuid;

const MAX_DIMENSION: u32 = 16_384;
const MAX_FPS: u32 = 240;
const MAX_FRAME_COUNT: u64 = 1_000_000;
const MAX_BITRATE_BPS: u64 = 2_000_000_000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EncoderInfo {
    pub name: String,
    pub kind: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaCapabilities {
    pub ffmpeg_available: bool,
    pub ffprobe_available: bool,
    pub ffmpeg_version: Option<String>,
    pub ffprobe_version: Option<String>,
    pub license_info: Option<String>,
    pub encoders: Vec<EncoderInfo>,
    pub decoders: Vec<EncoderInfo>,
    pub muxers: Vec<String>,
    pub pixel_formats: Vec<String>,
    pub hardware_accelerations: Vec<String>,
    pub diagnostic: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderConfig {
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub frame_count: u64,
    pub bitrate_bps: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidatedRenderConfig {
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub frame_count: u64,
    pub duration_seconds: f64,
    pub bitrate_bps: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PngSequenceEncodeOptions {
    pub input_dir: String,
    pub output_path: String,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub frame_count: u64,
    pub encoder: String,
    pub bitrate_bps: Option<u64>,
    pub pixel_format: Option<String>,
    #[serde(default)]
    pub preserve_alpha: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaVerification {
    pub path: String,
    pub verified: bool,
    pub container: Option<String>,
    pub video_codec: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub pixel_format: Option<String>,
    pub alpha_channel: bool,
    pub frame_rate: Option<String>,
    pub frames_read: Option<u64>,
    pub duration_seconds: Option<f64>,
    pub diagnostic: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EncodeResult {
    pub job_id: String,
    pub output_path: String,
    pub expected_frames: u64,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub encoder: String,
    pub elapsed_milliseconds: u128,
    pub verification: MediaVerification,
}

fn executable_name(base: &str) -> String {
    if cfg!(target_os = "windows") {
        format!("{base}.exe")
    } else {
        base.to_string()
    }
}

fn resolve_tool(app: &AppHandle, base: &str) -> PathBuf {
    let executable = executable_name(base);
    let mut candidates = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join(&executable));
        candidates.push(resource_dir.join("bin").join(&executable));
        candidates.push(resource_dir.join("resources").join("bin").join(&executable));
    }
    if cfg!(debug_assertions) {
        candidates.push(
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("resources")
                .join("bin")
                .join(&executable),
        );
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join(&executable));
            candidates.push(parent.join("resources").join("bin").join(&executable));
        }
    }
    candidates
        .into_iter()
        .find(|candidate| candidate.is_file())
        .unwrap_or_else(|| PathBuf::from(executable))
}

fn run_output(tool: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new(tool)
        .args(args)
        .stdin(Stdio::null())
        .output()
        .map_err(|error| format!("Could not start {}: {error}", tool.display()))?;

    let mut text = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr);
    if !stderr.is_empty() {
        if !text.is_empty() {
            text.push('\n');
        }
        text.push_str(&stderr);
    }
    if !output.status.success() {
        let details = text.lines().rev().take(10).collect::<Vec<_>>();
        return Err(format!(
            "{} exited with {}: {}",
            tool.display(),
            output.status,
            details.into_iter().rev().collect::<Vec<_>>().join("\n")
        ));
    }
    Ok(text)
}

fn tool_version(tool: &Path) -> Option<String> {
    let output = Command::new(tool)
        .arg("-version")
        .stdin(Stdio::null())
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let text = if output.stdout.is_empty() {
        String::from_utf8_lossy(&output.stderr).into_owned()
    } else {
        String::from_utf8_lossy(&output.stdout).into_owned()
    };
    text.lines().find(|line| !line.trim().is_empty()).map(str::to_owned)
}

fn parse_flagged_entries(text: &str, media_types: bool) -> Vec<EncoderInfo> {
    let mut entries = Vec::new();
    for line in text.lines() {
        let mut parts = line.split_whitespace();
        let flags = match parts.next() {
            Some(flags) if flags.len() == 6 => flags,
            _ => continue,
        };
        if !flags.chars().all(|c| c == '.' || c.is_ascii_alphabetic()) {
            continue;
        }
        let name = match parts.next() {
            Some(name) if name != "=" && !name.starts_with('=') => name,
            _ => continue,
        };
        let kind = if media_types {
            match flags.chars().next().unwrap_or('.') {
                'V' => "video",
                'A' => "audio",
                'S' => "subtitle",
                'D' => "data",
                _ => "other",
            }
        } else {
            "unknown"
        };
        entries.push(EncoderInfo {
            name: name.to_string(),
            kind: kind.to_string(),
            description: parts.collect::<Vec<_>>().join(" "),
        });
    }
    entries.sort_by(|a, b| a.name.cmp(&b.name));
    entries.dedup_by(|a, b| a.name == b.name);
    entries
}

fn parse_muxers(text: &str) -> Vec<String> {
    let mut names = Vec::new();
    for line in text.lines() {
        let mut parts = line.split_whitespace();
        let flags = match parts.next() {
            Some(flags)
                if !flags.is_empty()
                    && flags.len() <= 2
                    && flags.chars().all(|c| c == 'E' || c == 'D') =>
            {
                flags
            }
            _ => continue,
        };
        if !flags.contains('E') {
            continue;
        }
        if let Some(name) = parts.next() {
            if name != "=" {
                names.push(name.to_string());
            }
        }
    }
    names.sort();
    names.dedup();
    names
}

fn parse_pixel_formats(text: &str) -> Vec<String> {
    let mut names = Vec::new();
    for line in text.lines() {
        let mut parts = line.split_whitespace();
        let flags = match parts.next() {
            Some(flags) if flags.len() == 5 => flags,
            _ => continue,
        };
        if !flags.chars().all(|c| matches!(c, 'I' | 'O' | 'H' | 'P' | 'B' | '.')) {
            continue;
        }
        if let Some(name) = parts.next() {
            if name != "=" {
                names.push(name.to_string());
            }
        }
    }
    names.sort();
    names.dedup();
    names
}

fn parse_hwaccels(text: &str) -> Vec<String> {
    let mut values = Vec::new();
    let mut started = false;
    for line in text.lines() {
        if line.to_ascii_lowercase().contains("hardware acceleration methods") {
            started = true;
            continue;
        }
        if !started {
            continue;
        }
        let value = line.trim();
        if value.is_empty() {
            continue;
        }
        if value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
        {
            values.push(value.to_string());
        }
    }
    values.sort();
    values.dedup();
    values
}

pub fn discover(app: &AppHandle) -> MediaCapabilities {
    let ffmpeg = resolve_tool(app, "ffmpeg");
    let ffprobe = resolve_tool(app, "ffprobe");
    let ffmpeg_version = tool_version(&ffmpeg);
    let ffprobe_version = tool_version(&ffprobe);

    let (encoders, decoders, muxers, pixel_formats, hardware_accelerations, license_info, diagnostic) =
        if ffmpeg_version.is_some() {
            let encoders = run_output(&ffmpeg, &["-hide_banner", "-encoders"])
                .map(|out| parse_flagged_entries(&out, true));
            let decoders = run_output(&ffmpeg, &["-hide_banner", "-decoders"])
                .map(|out| parse_flagged_entries(&out, true));
            let muxers = run_output(&ffmpeg, &["-hide_banner", "-muxers"]).map(|out| parse_muxers(&out));
            let formats = run_output(&ffmpeg, &["-hide_banner", "-pix_fmts"]).map(|out| parse_pixel_formats(&out));
            let hwaccels = run_output(&ffmpeg, &["-hide_banner", "-hwaccels"]).map(|out| parse_hwaccels(&out));
            let license = run_output(&ffmpeg, &["-L"]).ok();
            let diagnostic = [
                encoders.as_ref().err(),
                decoders.as_ref().err(),
                muxers.as_ref().err(),
                formats.as_ref().err(),
                hwaccels.as_ref().err(),
            ]
            .into_iter()
            .flatten()
            .map(|error| error.as_str())
            .collect::<Vec<_>>()
            .join("; ");

            (
                encoders.unwrap_or_default(),
                decoders.unwrap_or_default(),
                muxers.unwrap_or_default(),
                formats.unwrap_or_default(),
                hwaccels.unwrap_or_default(),
                license,
                if diagnostic.is_empty() { None } else { Some(diagnostic) },
            )
        } else {
            (
                Vec::new(),
                Vec::new(),
                Vec::new(),
                Vec::new(),
                Vec::new(),
                None,
                Some("FFmpeg was not found in the packaged resources or on PATH.".to_string()),
            )
        };

    MediaCapabilities {
        ffmpeg_available: ffmpeg_version.is_some(),
        ffprobe_available: ffprobe_version.is_some(),
        ffmpeg_version,
        ffprobe_version,
        license_info,
        encoders,
        decoders,
        muxers,
        pixel_formats,
        hardware_accelerations,
        diagnostic,
    }
}

pub fn validate_config(config: RenderConfig) -> Result<ValidatedRenderConfig, String> {
    if config.width == 0
        || config.height == 0
        || config.width > MAX_DIMENSION
        || config.height > MAX_DIMENSION
    {
        return Err(format!("Output dimensions must be between 1 and {MAX_DIMENSION} pixels per axis."));
    }
    if config.fps == 0 || config.fps > MAX_FPS {
        return Err(format!("Frame rate must be between 1 and {MAX_FPS} FPS."));
    }
    if config.frame_count == 0 || config.frame_count > MAX_FRAME_COUNT {
        return Err(format!("Frame count must be between 1 and {MAX_FRAME_COUNT}."));
    }
    if let Some(bitrate) = config.bitrate_bps {
        if bitrate == 0 || bitrate > MAX_BITRATE_BPS {
            return Err(format!("Bitrate must be between 1 and {MAX_BITRATE_BPS} bits per second."));
        }
    }
    let duration_seconds = config.frame_count as f64 / config.fps as f64;
    if !duration_seconds.is_finite() || duration_seconds <= 0.0 {
        return Err("The output duration is not valid.".to_string());
    }
    Ok(ValidatedRenderConfig {
        width: config.width,
        height: config.height,
        fps: config.fps,
        frame_count: config.frame_count,
        duration_seconds,
        bitrate_bps: config.bitrate_bps,
    })
}

fn muxer_for_extension(extension: &str) -> Option<&'static str> {
    match extension.to_ascii_lowercase().as_str() {
        "mp4" | "m4v" => Some("mp4"),
        "mov" => Some("mov"),
        "mkv" => Some("matroska"),
        "webm" => Some("webm"),
        "avi" => Some("avi"),
        "ts" | "m2ts" => Some("mpegts"),
        "gif" => Some("gif"),
        "apng" => Some("apng"),
        _ => None,
    }
}


fn pixel_format_has_alpha(value: &str) -> bool {
    let format = value.to_ascii_lowercase();
    format.starts_with("yuva")
        || format.starts_with("gbrap")
        || format.starts_with("rgba")
        || format.starts_with("bgra")
        || format.starts_with("argb")
        || format.starts_with("abgr")
        || format.starts_with("gray8a")
        || format.starts_with("gray16a")
        || format.starts_with("ya8")
        || format.starts_with("ya16")
}

fn find_png_sequence_prefix(input_dir: &Path, frame_count: u64) -> Result<String, String> {
    const FIRST_SUFFIX: &str = "000000.png";
    let mut prefixes = Vec::<String>::new();

    for entry in fs::read_dir(input_dir)
        .map_err(|error| format!("Cannot list the PNG frame directory: {error}"))?
    {
        let entry = entry.map_err(|error| format!("Cannot read the PNG frame directory: {error}"))?;
        if !entry.file_type().map_err(|error| format!("Cannot inspect a frame file: {error}"))?.is_file() {
            continue;
        }
        let name = entry.file_name();
        let Some(name) = name.to_str() else { continue; };
        if let Some(prefix) = name.strip_suffix(FIRST_SUFFIX) {
            prefixes.push(prefix.to_string());
        }
    }
    prefixes.sort();
    prefixes.dedup();

    let mut complete = Vec::<String>::new();
    for prefix in prefixes {
        let last = input_dir.join(format!("{prefix}{:06}.png", frame_count.saturating_sub(1)));
        if !last.is_file() {
            continue;
        }
        let mut gap = None;
        for index in 0..frame_count {
            let frame = input_dir.join(format!("{prefix}{index:06}.png"));
            if !frame.is_file() {
                gap = Some(index);
                break;
            }
        }
        if let Some(index) = gap {
            return Err(format!(
                "PNG sequence '{prefix}' has a missing frame at index {index:06}. Export the complete sequence again before encoding."
            ));
        }
        complete.push(prefix);
    }

    match complete.len() {
        1 => Ok(complete.remove(0)),
        0 => Err(format!(
            "No complete zero-based PNG sequence was found. Select the PNG·DIR output containing frame 000000.png or a TRILYVA-named sequence such as animation_000000.png, with {frame_count} consecutive frames."
        )),
        _ => Err("This folder contains multiple complete PNG sequences. Choose a folder containing only the intended animation sequence.".to_string()),
    }
}


fn validate_alpha_manifest(input_dir: &Path, config: &ValidatedRenderConfig) -> Result<(), String> {
    let manifest_path = input_dir.join("manifest.json");
    let contents = fs::read_to_string(&manifest_path).map_err(|_| {
        "Transparent output requires manifest.json from TRILYVA's PNG·DIR or PNG·ZIP export. Re-export the frames from TRILYVA with Background set to Transparent.".to_string()
    })?;
    let manifest: Value = serde_json::from_str(&contents)
        .map_err(|error| format!("The PNG sequence manifest is invalid JSON: {error}"))?;
    let composition = manifest.get("composition")
        .ok_or_else(|| "The PNG sequence manifest does not include its composition settings.".to_string())?;
    let transparent = composition.get("transparent").and_then(Value::as_bool).unwrap_or(false);
    if !transparent {
        return Err("The PNG sequence was rendered with an opaque background. Set Composition → Background → Transparent, render a fresh PNG·DIR or PNG·ZIP sequence, then encode again.".to_string());
    }
    let width = composition.get("width").and_then(Value::as_u64);
    let height = composition.get("height").and_then(Value::as_u64);
    let fps = composition.get("fps").and_then(Value::as_u64);
    let frames = composition.get("frameCount").and_then(Value::as_u64)
        .or_else(|| manifest.get("frameCount").and_then(Value::as_u64));
    if width != Some(config.width as u64)
        || height != Some(config.height as u64)
        || fps != Some(config.fps as u64)
        || frames != Some(config.frame_count)
    {
        return Err("The PNG sequence manifest does not match the current width, height, FPS, and frame count. Restore the render settings used for the PNG sequence or render the frames again.".to_string());
    }
    Ok(())
}

fn probe_image_dimensions(app: &AppHandle, path: &Path) -> Result<(u32, u32), String> {
    let ffprobe = resolve_tool(app, "ffprobe");
    let path_text = path.to_string_lossy().into_owned();
    let output = Command::new(ffprobe)
        .arg("-v").arg("error")
        .arg("-select_streams").arg("v:0")
        .arg("-show_entries").arg("stream=width,height")
        .arg("-of").arg("json")
        .arg(&path_text)
        .stdin(Stdio::null())
        .output()
        .map_err(|error| format!("Could not inspect PNG frame dimensions: {error}"))?;
    if !output.status.success() {
        return Err(format!(
            "FFprobe could not inspect the first PNG frame: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    let data: Value = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("FFprobe returned invalid PNG dimension data: {error}"))?;
    let stream = data.get("streams").and_then(Value::as_array).and_then(|items| items.first())
        .ok_or_else(|| "The first file in the sequence is not a readable image frame.".to_string())?;
    let width = stream.get("width").and_then(Value::as_u64).and_then(|n| u32::try_from(n).ok())
        .ok_or_else(|| "FFprobe did not report the PNG width.".to_string())?;
    let height = stream.get("height").and_then(Value::as_u64).and_then(|n| u32::try_from(n).ok())
        .ok_or_else(|| "FFprobe did not report the PNG height.".to_string())?;
    Ok((width, height))
}

fn checked_output_path(value: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(value);
    if path.as_os_str().is_empty() {
        return Err("Choose an output file path.".to_string());
    }
    if path.exists() {
        return Err("The output file already exists. Choose another name; TRILYVA will not overwrite it.".to_string());
    }
    let parent = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    if !parent.is_dir() {
        return Err(format!("The output directory does not exist: {}", parent.display()));
    }
    let extension = path.extension().and_then(|value| value.to_str()).unwrap_or("");
    if muxer_for_extension(extension).is_none() {
        return Err("Choose a supported output extension: MP4, MOV, MKV, WebM, AVI, TS, GIF, or APNG.".to_string());
    }
    Ok(path)
}

pub fn encode_png_sequence(app: AppHandle, options: PngSequenceEncodeOptions) -> Result<EncodeResult, String> {
    let started = Instant::now();
    let config = validate_config(RenderConfig {
        width: options.width,
        height: options.height,
        fps: options.fps,
        frame_count: options.frame_count,
        bitrate_bps: options.bitrate_bps,
    })?;

    let selected_input = PathBuf::from(&options.input_dir)
        .canonicalize()
        .map_err(|error| format!("Cannot open the frame folder or ZIP archive: {error}"))?;
    let mut temp_guard: Option<tempfile::TempDir> = None;
    let input_dir = if selected_input.is_dir() {
        selected_input
    } else if selected_input.is_file()
        && selected_input.extension().and_then(|value| value.to_str())
            .map(|value| value.eq_ignore_ascii_case("zip")).unwrap_or(false)
    {
        let temp = tempfile::tempdir()
            .map_err(|error| format!("Could not create a temporary PNG sequence directory: {error}"))?;
        let file = fs::File::open(&selected_input)
            .map_err(|error| format!("Could not open PNG sequence ZIP: {error}"))?;
        let mut archive = ZipArchive::new(file)
            .map_err(|error| format!("The selected file is not a readable ZIP archive: {error}"))?;
        for index in 0..archive.len() {
            let mut entry = archive.by_index(index)
                .map_err(|error| format!("Could not read ZIP entry {index}: {error}"))?;
            let Some(relative) = entry.enclosed_name() else { continue; };
            if relative.components().count() != 1 {
                continue;
            }
            let file_name = relative.file_name().and_then(|value| value.to_str()).unwrap_or("");
            let is_png = file_name.to_ascii_lowercase().ends_with(".png");
            let is_manifest = file_name.eq_ignore_ascii_case("manifest.json");
            if !is_png && !is_manifest {
                continue;
            }
            let destination = temp.path().join(relative);
            let mut target = fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&destination)
                .map_err(|error| format!("Could not stage PNG frame {}: {error}", destination.display()))?;
            std::io::copy(&mut entry, &mut target)
                .map_err(|error| format!("Could not extract PNG frame {}: {error}", destination.display()))?;
            target.flush()
                .map_err(|error| format!("Could not finish staging PNG frame {}: {error}", destination.display()))?;
        }
        temp_guard = Some(temp);
        temp_guard.as_ref().expect("temporary folder was assigned").path().to_path_buf()
    } else {
        return Err("Select a PNG frame folder or a TRILYVA PNG·ZIP archive.".to_string());
    };
    if !input_dir.is_dir() {
        return Err("The frame input must be a directory or a valid PNG sequence ZIP.".to_string());
    }

    if options.preserve_alpha {
        validate_alpha_manifest(&input_dir, &config)?;
    }
    let prefix = find_png_sequence_prefix(&input_dir, config.frame_count)?;
    let first = input_dir.join(format!("{prefix}000000.png"));
    let (input_width, input_height) = probe_image_dimensions(&app, &first)?;
    if input_width != config.width || input_height != config.height {
        return Err(format!(
            "The PNG sequence is {input_width}×{input_height}, but the current render settings are {}×{}. Match the composition settings to the exported PNG frames and try again.",
            config.width, config.height
        ));
    }

    let output = checked_output_path(&options.output_path)?;
    let extension = output.extension().and_then(|value| value.to_str()).unwrap_or("").to_ascii_lowercase();
    let muxer = muxer_for_extension(&extension).ok_or_else(|| "Unsupported output container.".to_string())?;
    let alpha_webm = options.preserve_alpha && extension == "webm" && options.encoder == "libvpx-vp9";
    let alpha_mov = options.preserve_alpha && extension == "mov" && options.encoder == "prores_ks";
    let alpha_apng = options.preserve_alpha && extension == "apng" && options.encoder == "apng";
    if options.preserve_alpha && !alpha_webm && !alpha_mov && !alpha_apng {
        return Err("Alpha profiles are WebM + VP9 (libvpx-vp9), MOV + ProRes 4444 (prores_ks), or APNG (apng). Select the matching encoder and file extension.".to_string());
    }
    if options.preserve_alpha {
        if let Some(requested) = options.pixel_format.as_deref() {
            let expected = if alpha_webm { "yuva420p" } else if alpha_mov { "yuva444p10le" } else { "rgba" };
            if requested != expected {
                return Err(format!("Alpha profile requires pixel format {expected}; refusing an override that could discard transparency."));
            }
        }
    }
    let alpha_pixel_format = if alpha_webm {
        Some("yuva420p")
    } else if alpha_mov {
        Some("yuva444p10le")
    } else if alpha_apng {
        Some("rgba")
    } else {
        options.pixel_format.as_deref()
    };
    let caps = discover(&app);
    if !caps.ffmpeg_available || !caps.ffprobe_available {
        return Err("FFmpeg and FFprobe must both be available before encoding.".to_string());
    }
    if !caps.muxers.iter().any(|value| value == muxer) {
        return Err(format!("The packaged FFmpeg build does not include the {muxer} muxer."));
    }
    if !caps
        .encoders
        .iter()
        .any(|encoder| encoder.kind == "video" && encoder.name == options.encoder)
    {
        return Err(format!(
            "The requested video encoder '{}' is not available in this FFmpeg build.",
            options.encoder
        ));
    }

    if let Some(pixel_format) = alpha_pixel_format {
        if !caps.pixel_formats.iter().any(|value| value == pixel_format) {
            return Err(format!("Required pixel format '{pixel_format}' for this export profile is not available in the packaged FFmpeg build."));
        }
    }

    let input_pattern = input_dir.join(format!("{prefix}%06d.png")).to_string_lossy().into_owned();
    let output_text = output.to_string_lossy().into_owned();
    let frame_count = config.frame_count;
    let fps_text = config.fps.to_string();
    let frame_text = frame_count.to_string();

    let mut command = Command::new(resolve_tool(&app, "ffmpeg"));
    command
        .arg("-hide_banner")
        .arg("-n")
        .arg("-progress").arg("pipe:1")
        .arg("-nostats")
        .arg("-f").arg("image2")
        .arg("-framerate").arg(&fps_text)
        .arg("-start_number").arg("0")
        .arg("-i").arg(input_pattern)
        .arg("-frames:v").arg(&frame_text)
        .arg("-fps_mode").arg("passthrough")
        .arg("-c:v").arg(&options.encoder);

    if let Some(pixel_format) = alpha_pixel_format {
        command.arg("-pix_fmt").arg(pixel_format);
    }
    if alpha_webm {
        command.arg("-auto-alt-ref").arg("0");
        command.arg("-metadata:s:v:0").arg("alpha_mode=1");
        if let Some(bitrate) = config.bitrate_bps {
            command.arg("-b:v").arg(bitrate.to_string());
        } else {
            command.arg("-b:v").arg("0").arg("-crf").arg("30");
        }
    } else if alpha_mov {
        command.arg("-profile:v").arg("4");
    } else if !alpha_apng {
        if let Some(bitrate) = config.bitrate_bps {
            command.arg("-b:v").arg(bitrate.to_string());
        }
    }
    if muxer == "mp4" {
        command.arg("-movflags").arg("+faststart");
    }
    command
        .arg("-f").arg(muxer)
        .arg(&output_text)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|error| format!("Could not start FFmpeg: {error}"))?;
    let stdout = child.stdout.take().ok_or_else(|| "FFmpeg progress stream was unavailable.".to_string())?;
    let stderr = child.stderr.take().ok_or_else(|| "FFmpeg diagnostic stream was unavailable.".to_string())?;
    let stderr_tail = Arc::new(Mutex::new(VecDeque::<String>::with_capacity(40)));
    let stderr_tail_thread = Arc::clone(&stderr_tail);
    let stderr_reader = thread::spawn(move || {
        for line in BufReader::new(stderr).lines().flatten() {
            if let Ok(mut tail) = stderr_tail_thread.lock() {
                if tail.len() >= 40 {
                    tail.pop_front();
                }
                tail.push_back(line);
            }
        }
    });

    let job_id = Uuid::new_v4().to_string();
    let mut current_frame = 0u64;
    let mut current_out_time = String::new();
    for line in BufReader::new(stdout).lines().flatten() {
        if let Some((key, value)) = line.split_once('=') {
            match key {
                "frame" => current_frame = value.parse().unwrap_or(current_frame),
                "out_time" => current_out_time = value.to_string(),
                "progress" => {
                    let complete = value == "end";
                    let percent = if complete {
                        100.0
                    } else {
                        (current_frame as f64 / frame_count as f64 * 100.0).clamp(0.0, 99.5)
                    };
                    let _ = app.emit(
                        "trilyva://encode-progress",
                        json!({
                            "jobId": job_id,
                            "percent": percent,
                            "frame": current_frame,
                            "expectedFrames": frame_count,
                            "outTime": current_out_time,
                            "state": if complete { "completed" } else { "encoding" }
                        }),
                    );
                }
                _ => {}
            }
        }
    }

    let status = child.wait().map_err(|error| format!("Could not wait for FFmpeg: {error}"))?;
    let _ = stderr_reader.join();
    if !status.success() {
        let diagnostic = stderr_tail
            .lock()
            .map(|tail| tail.iter().cloned().collect::<Vec<_>>().join("\n"))
            .unwrap_or_default();
        let _ = fs::remove_file(&output);
        return Err(format!("FFmpeg failed with {status}. {diagnostic}"));
    }

    let verification = match verify_media_file_internal(&app, &output_text, options.preserve_alpha) {
        Ok(verification) => verification,
        Err(error) => {
            let _ = fs::remove_file(&output);
            return Err(format!("Output verification failed: {error}"));
        }
    };
    if !verification.verified {
        let _ = fs::remove_file(&output);
        return Err(format!(
            "FFmpeg produced a file, but FFprobe could not verify the expected video. {}",
            verification
                .diagnostic
                .clone()
                .unwrap_or_else(|| "The file failed output validation.".to_string())
        ));
    }
    if verification.width != Some(config.width) || verification.height != Some(config.height) {
        let _ = fs::remove_file(&output);
        return Err(format!(
            "Dimension mismatch: expected {}×{}, FFprobe reported {}×{}. The output was removed.",
            config.width,
            config.height,
            verification.width.map(|value| value.to_string()).unwrap_or_else(|| "unknown".to_string()),
            verification.height.map(|value| value.to_string()).unwrap_or_else(|| "unknown".to_string())
        ));
    }
    match verification.frames_read {
        Some(actual) if actual == frame_count => {}
        Some(actual) => {
            let _ = fs::remove_file(&output);
            return Err(format!(
                "Frame-count mismatch: expected {frame_count}, FFprobe counted {actual}. The output was removed."
            ));
        }
        None => {
            let _ = fs::remove_file(&output);
            return Err("FFprobe did not report a decoded frame count. The output was removed rather than treating an unchecked render as verified.".to_string());
        }
    }
    if !frame_rate_matches(verification.frame_rate.as_deref(), config.fps) {
        let _ = fs::remove_file(&output);
        return Err(format!(
            "Frame-rate mismatch: expected {} FPS, FFprobe reported '{}'. The output was removed.",
            config.fps,
            verification.frame_rate.as_deref().unwrap_or("unknown")
        ));
    }
    if options.preserve_alpha && !verification.alpha_channel {
        let _ = fs::remove_file(&output);
        return Err(format!(
            "Alpha verification failed: {}. The output was removed rather than being presented as transparent.",
            verification.diagnostic.as_deref().unwrap_or_else(|| verification.pixel_format.as_deref().unwrap_or("unknown pixel format"))
        ));
    }

    let _ = app.emit(
        "trilyva://encode-progress",
        json!({
            "jobId": job_id,
            "percent": 100.0,
            "frame": frame_count,
            "expectedFrames": frame_count,
            "state": "completed",
            "outputPath": output_text
        }),
    );

    Ok(EncodeResult {
        job_id,
        output_path: output_text,
        expected_frames: frame_count,
        width: config.width,
        height: config.height,
        fps: config.fps,
        encoder: options.encoder,
        elapsed_milliseconds: started.elapsed().as_millis(),
        verification,
    })
}

fn decoded_alpha_has_transparency(ffmpeg: &Path, media: &Path, extension: &str) -> Result<bool, String> {
    let mut command = Command::new(ffmpeg);
    command.arg("-v").arg("error").arg("-nostdin");
    // VP9 WebM carries its alpha plane in codec side data. Force libvpx so FFmpeg
    // decodes that plane for alphaextract instead of trusting container metadata alone.
    if extension == "webm" {
        command.arg("-c:v").arg("libvpx-vp9");
    }
    let output = command
        .arg("-i")
        .arg(media)
        .arg("-map").arg("0:v:0")
        .arg("-vf").arg("alphaextract,scale=64:64:flags=area")
        .arg("-frames:v").arg("1")
        .arg("-f").arg("rawvideo")
        .arg("-pix_fmt").arg("gray")
        .arg("pipe:1")
        .stdin(Stdio::null())
        .output()
        .map_err(|error| format!("Could not decode the output alpha plane: {error}"))?;
    if !output.status.success() {
        return Err(format!(
            "FFmpeg could not decode the output alpha plane: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    // Scaling the first alpha plane to 64×64 keeps verification memory bounded,
    // even for 16K renders. A true transparent background should produce values
    // below full opacity; a codec/container that only advertises alpha will fail.
    if output.stdout.len() != 64 * 64 {
        return Err(format!(
            "The alpha verification probe returned {} bytes instead of 4096.",
            output.stdout.len()
        ));
    }
    Ok(output.stdout.iter().any(|value| *value < 250))
}

fn frame_rate_matches(value: Option<&str>, expected_fps: u32) -> bool {
    let Some(value) = value else { return false; };
    let Some((numerator, denominator)) = value.split_once('/') else { return false; };
    let Ok(numerator) = numerator.parse::<u64>() else { return false; };
    let Ok(denominator) = denominator.parse::<u64>() else { return false; };
    let Some(expected_numerator) = u64::from(expected_fps).checked_mul(denominator) else {
        return false;
    };
    denominator > 0 && numerator == expected_numerator
}

pub fn verify_media_file(app: &AppHandle, value: &str) -> Result<MediaVerification, String> {
    verify_media_file_internal(app, value, false)
}

fn verify_media_file_internal(
    app: &AppHandle,
    value: &str,
    preserve_alpha: bool,
) -> Result<MediaVerification, String> {
    let path = PathBuf::from(value);
    if !path.is_file() {
        return Err("The selected output file does not exist.".to_string());
    }
    let ffprobe = resolve_tool(app, "ffprobe");
    if tool_version(&ffprobe).is_none() {
        return Err("FFprobe was not found in the packaged resources or on PATH.".to_string());
    }

    let path_text = path.to_string_lossy().into_owned();
    let extension = path.extension().and_then(|value| value.to_str()).unwrap_or("").to_ascii_lowercase();
    let mut probe = Command::new(ffprobe);
    probe
        .arg("-v").arg("error")
        .arg("-count_frames")
        .arg("-select_streams").arg("v:0")
        .arg("-show_entries")
        .arg("format=format_name,duration:stream=codec_name,width,height,pix_fmt,r_frame_rate,nb_read_frames,duration")
        .arg("-of").arg("json");
    // WebM alpha is stored as a VP9 side stream; forcing libvpx asks FFprobe
    // to decode that alpha plane rather than the built-in VP9 decoder, which
    // can report an opaque pixel format for a valid alpha-bearing WebM.
    if preserve_alpha && extension == "webm" {
        probe.arg("-c:v").arg("libvpx-vp9");
    }
    let output = probe
        .arg(&path_text)
        .stdin(Stdio::null())
        .output()
        .map_err(|error| format!("Could not run FFprobe: {error}"))?;

    if !output.status.success() {
        return Ok(MediaVerification {
            path: path_text,
            verified: false,
            container: None,
            video_codec: None,
            width: None,
            height: None,
            pixel_format: None,
            alpha_channel: false,
            frame_rate: None,
            frames_read: None,
            duration_seconds: None,
            diagnostic: Some(String::from_utf8_lossy(&output.stderr).trim().to_string()),
        });
    }

    let data: Value = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("FFprobe returned invalid JSON: {error}"))?;
    let stream = data.get("streams").and_then(Value::as_array).and_then(|items| items.first());
    let format = data.get("format");
    let number = |value: Option<&Value>| value.and_then(Value::as_str).and_then(|s| s.parse::<f64>().ok());
    let integer = |value: Option<&Value>| value.and_then(Value::as_str).and_then(|s| s.parse::<u64>().ok());
    let codec = stream.and_then(|s| s.get("codec_name")).and_then(Value::as_str).map(str::to_owned);
    let width = stream.and_then(|s| s.get("width")).and_then(Value::as_u64).and_then(|n| u32::try_from(n).ok());
    let height = stream.and_then(|s| s.get("height")).and_then(Value::as_u64).and_then(|n| u32::try_from(n).ok());
    let pixel_format = stream.and_then(|s| s.get("pix_fmt")).and_then(Value::as_str).map(str::to_owned);
    let metadata_alpha = pixel_format.as_deref().map(pixel_format_has_alpha).unwrap_or(false);
    let rate = stream.and_then(|s| s.get("r_frame_rate")).and_then(Value::as_str).map(str::to_owned);
    let mut alpha_verification_diagnostic = None;
    let alpha_channel = if preserve_alpha {
        if !metadata_alpha {
            false
        } else {
            let ffmpeg = resolve_tool(app, "ffmpeg");
            match decoded_alpha_has_transparency(&ffmpeg, &path, &extension) {
                Ok(has_transparency) => has_transparency,
                Err(error) => {
                    alpha_verification_diagnostic = Some(error);
                    false
                }
            }
        }
    } else {
        metadata_alpha
    };
    let frames = integer(stream.and_then(|s| s.get("nb_read_frames")));
    let duration = number(stream.and_then(|s| s.get("duration")))
        .or_else(|| number(format.and_then(|f| f.get("duration"))));
    let container = format.and_then(|f| f.get("format_name")).and_then(Value::as_str).map(str::to_owned);
    let verified = codec.is_some() && width.unwrap_or(0) > 0 && height.unwrap_or(0) > 0;

    Ok(MediaVerification {
        path: path_text,
        verified,
        container,
        video_codec: codec,
        width,
        height,
        pixel_format: pixel_format.clone(),
        alpha_channel,
        frame_rate: rate,
        frames_read: frames,
        duration_seconds: duration,
        diagnostic: if !verified {
            Some("No valid video stream was reported.".to_string())
        } else if preserve_alpha && !alpha_channel {
            Some(alpha_verification_diagnostic.unwrap_or_else(|| {
                if metadata_alpha {
                    "The stream advertises alpha metadata, but the decoded frame did not contain transparent pixels.".to_string()
                } else {
                    format!("The output pixel format '{}' does not expose an alpha channel.", pixel_format.as_deref().unwrap_or("unknown"))
                }
            }))
        } else {
            None
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_video_and_audio_encoders() {
        let text = "Encoders:\n V..... = Video\n A..... = Audio\n V....D libx264 H.264 / AVC\n A..... aac AAC (Advanced Audio Coding)\n";
        let parsed = parse_flagged_entries(text, true);
        assert!(parsed.iter().any(|entry| entry.name == "libx264" && entry.kind == "video"));
        assert!(parsed.iter().any(|entry| entry.name == "aac" && entry.kind == "audio"));
        assert!(!parsed.iter().any(|entry| entry.name == "="));
    }

    #[test]
    fn parses_muxers_and_pixel_formats() {
        let muxers = parse_muxers("Muxers:\n E mp4 MP4\n E matroska Matroska\n D hls HLS\n");
        assert!(muxers.contains(&"mp4".to_string()));
        assert!(!muxers.contains(&"hls".to_string()));
        let formats = parse_pixel_formats("Pixel formats:\nIO... yuv420p 3 12 8\nIO... rgba 4 32 8\n");
        assert!(formats.contains(&"yuv420p".to_string()));
    }

    #[test]
    fn alpha_pixel_formats_are_detected() {
        assert!(pixel_format_has_alpha("yuva420p"));
        assert!(pixel_format_has_alpha("yuva444p10le"));
        assert!(pixel_format_has_alpha("rgba"));
        assert!(pixel_format_has_alpha("gbrap"));
        assert!(!pixel_format_has_alpha("yuv420p"));
        assert!(!pixel_format_has_alpha("yuv444p10le"));
    }

    #[test]
    fn frame_rate_contract_requires_exact_integer_rate() {
        assert!(frame_rate_matches(Some("60/1"), 60));
        assert!(frame_rate_matches(Some("240/4"), 60));
        assert!(!frame_rate_matches(Some("60000/1001"), 60));
        assert!(!frame_rate_matches(Some("0/1"), 60));
        assert!(!frame_rate_matches(None, 60));
        assert!(!frame_rate_matches(Some("not-a-rate"), 60));
    }

    #[test]
    fn validates_export_settings() {
        let config = RenderConfig {
            width: 3840,
            height: 2160,
            fps: 60,
            frame_count: 600,
            bitrate_bps: Some(20_000_000),
        };
        let validated = validate_config(config).expect("valid configuration");
        assert!((validated.duration_seconds - 10.0).abs() < f64::EPSILON);
    }

    #[test]
    fn rejects_out_of_range_settings() {
        let config = RenderConfig {
            width: 32_768,
            height: 2160,
            fps: 60,
            frame_count: 600,
            bitrate_bps: None,
        };
        assert!(validate_config(config).is_err());
        let config = RenderConfig {
            width: 1920,
            height: 1080,
            fps: 241,
            frame_count: 600,
            bitrate_bps: None,
        };
        assert!(validate_config(config).is_err());
    }
}
