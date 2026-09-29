use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs::{self, File},
    io::{Read, Write},
    path::{Path, PathBuf},
};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

const CHUNK_SIZE: usize = 1024 * 1024;
const GROUP_SIZE: usize = 50;

#[derive(Debug, Clone, Serialize)]
pub struct FlowerBatchPackageResult {
    pub mp4_zip: Option<String>,
    pub jpg_zip: Option<String>,
    pub png_zip: Option<String>,
    pub mp4_count: usize,
    pub jpg_count: usize,
    pub png_count: usize,
    pub folder_count: usize,
}

#[derive(Debug, Clone)]
struct FileEntry {
    source: PathBuf,
    name: String,
    sha256: String,
    chunks: Vec<ChunkDigest>,
    size: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ChunkDigest {
    index: u64,
    offset: u64,
    size: u64,
    sha256: String,
}

pub fn package_flower_batch(input_dir: &str, output_dir: &str) -> Result<FlowerBatchPackageResult, String> {
    let input = Path::new(input_dir);
    let output = Path::new(output_dir);

    if !input.is_dir() {
        return Err(format!("Input folder does not exist: {}", input.display()));
    }
    if !output.exists() {
        fs::create_dir_all(output).map_err(|e| format!("Could not create output folder: {e}"))?;
    }
    if !output.is_dir() {
        return Err(format!("Output path is not a folder: {}", output.display()));
    }

    let mut mp4 = Vec::new();
    let mut jpg = Vec::new();
    let mut png = Vec::new();
    collect_files(input, &mut mp4, &mut jpg, &mut png)?;

    mp4.sort_by(|a,b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    jpg.sort_by(|a,b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    png.sort_by(|a,b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    let folder_count = [mp4.len(), jpg.len(), png.len()]
        .iter()
        .copied()
        .max()
        .unwrap_or(0)
        .div_ceil(GROUP_SIZE);

    let mp4_zip = write_optional_zip(output, "FLOWERS_MP4.zip", &mp4, "video/mp4", true)?;
    let jpg_zip = write_optional_zip(output, "FLOWERS_FIRST_FRAME_JPG.zip", &jpg, "image/jpeg", false)?;
    let png_zip = write_optional_zip(output, "FLOWERS_FIRST_FRAME_PNG_TRANSPARENT.zip", &png, "image/png", false)?;

    Ok(FlowerBatchPackageResult {
        mp4_zip,
        jpg_zip,
        png_zip,
        mp4_count: mp4.len(),
        jpg_count: jpg.len(),
        png_count: png.len(),
        folder_count,
    })
}

fn write_optional_zip(
    output: &Path,
    filename: &str,
    files: &[FileEntry],
    kind: &str,
    include_render_contract: bool,
) -> Result<Option<String>, String> {
    if files.is_empty() {
        return Ok(None);
    }
    let path = output.join(filename);
    write_zip(&path, files, kind, include_render_contract)?;
    Ok(Some(path.to_string_lossy().to_string()))
}

fn collect_files(
    root: &Path,
    mp4: &mut Vec<FileEntry>,
    jpg: &mut Vec<FileEntry>,
    png: &mut Vec<FileEntry>,
) -> Result<(), String> {
    for entry in fs::read_dir(root).map_err(|e| format!("Could not read {}: {e}", root.display()))? {
        let entry = entry.map_err(|e| format!("Directory read failed: {e}"))?;
        let path = entry.path();
        if path.is_dir() {
            collect_files(&path, mp4, jpg, png)?;
            continue;
        }
        if !path.is_file() {
            continue;
        }

        let Some(ext) = path.extension().and_then(|x| x.to_str()) else { continue };
        let ext = ext.to_ascii_lowercase();
        let first_frame_png = ext == "png" && is_first_frame_png_name(&path);
        if ext != "mp4" && ext != "jpg" && ext != "jpeg" && !first_frame_png {
            continue;
        }

        let relative = path.strip_prefix(root).unwrap_or(&path);
        let name = relative.to_string_lossy().replace('\\', "/");
        let (sha256, chunks, size) = hash_file(&path)?;
        let item = FileEntry { source: path.clone(), name, sha256, chunks, size };

        match ext.as_str() {
            "mp4" => mp4.push(item),
            "jpg" | "jpeg" => jpg.push(item),
            "png" if first_frame_png => png.push(item),
            _ => {}
        }
    }
    Ok(())
}

fn is_first_frame_png_name(path: &Path) -> bool {
    let name = path.file_name().and_then(|x| x.to_str()).unwrap_or("").to_ascii_lowercase();
    name.contains("first") ||
    name.contains("frame-000000") ||
    name.contains("frame_000000") ||
    name == "000000.png"
}

fn hash_file(path: &Path) -> Result<(String, Vec<ChunkDigest>, u64), String> {
    let mut file = File::open(path).map_err(|e| format!("Could not open {}: {e}", path.display()))?;
    let mut whole = Sha256::new();
    let mut buf = vec![0u8; CHUNK_SIZE];
    let mut chunks = Vec::new();
    let mut offset = 0u64;
    let mut index = 0u64;

    loop {
        let read = file.read(&mut buf).map_err(|e| format!("Read failed for {}: {e}", path.display()))?;
        if read == 0 {
            break;
        }

        let bytes = &buf[..read];
        whole.update(bytes);

        let mut chunk = Sha256::new();
        chunk.update(bytes);
        chunks.push(ChunkDigest {
            index,
            offset,
            size: read as u64,
            sha256: hex_bytes(&chunk.finalize()),
        });

        index += 1;
        offset += read as u64;
    }

    Ok((hex_bytes(&whole.finalize()), chunks, offset))
}

fn hex_bytes(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        use std::fmt::Write as _;
        let _ = write!(out, "{:02x}", b);
    }
    out
}

fn write_zip(
    path: &Path,
    files: &[FileEntry],
    kind: &str,
    include_render_contract: bool,
) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Could not create {}: {e}", parent.display()))?;
    }

    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("batch.zip");
    let temp_path = path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join(format!(".{file_name}.partial-{}", uuid::Uuid::new_v4()));

    let result = (|| -> Result<(), String> {
        let file = File::create(&temp_path)
            .map_err(|e| format!("Could not create {}: {e}", temp_path.display()))?;
        let mut zip = ZipWriter::new(file);
        let options = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);
        let mut checksums = String::new();
        let mut chunks = String::new();
        let mut collisions: BTreeMap<String, usize> = BTreeMap::new();

        for (index, item) in files.iter().enumerate() {
            let folder = format!("{:03}", index / GROUP_SIZE + 1);
            let basename = sanitize_name(
                Path::new(&item.name)
                    .file_name()
                    .and_then(|x| x.to_str())
                    .unwrap_or("asset"),
            );
            let collision_key = format!("{folder}/{basename}");
            let count = collisions.entry(collision_key).or_insert(0);

            let unique_name = if *count == 0 {
                basename.clone()
            } else {
                let stem = Path::new(&basename)
                    .file_stem()
                    .and_then(|x| x.to_str())
                    .unwrap_or("asset");
                let ext = Path::new(&basename)
                    .extension()
                    .and_then(|x| x.to_str())
                    .unwrap_or("");
                if ext.is_empty() {
                    format!("{stem}__{}", *count + 1)
                } else {
                    format!("{stem}__{}.{}", *count + 1, ext)
                }
            };
            *count += 1;

            let archive_name = format!("{folder}/{unique_name}");
            let mut source = File::open(&item.source)
                .map_err(|e| format!("Could not open {}: {e}", item.source.display()))?;
            zip.start_file(&archive_name, options)
                .map_err(|e| format!("ZIP start failed: {e}"))?;

            let mut whole = Sha256::new();
            let mut offset = 0_u64;
            let mut chunk_index = 0_u64;
            let mut buf = vec![0_u8; CHUNK_SIZE];

            loop {
                let read = source
                    .read(&mut buf)
                    .map_err(|e| format!("Read failed for {}: {e}", item.source.display()))?;
                if read == 0 {
                    break;
                }

                let bytes = &buf[..read];
                zip.write_all(bytes)
                    .map_err(|e| format!("ZIP write failed for {}: {e}", item.source.display()))?;
                whole.update(bytes);

                let mut chunk = Sha256::new();
                chunk.update(bytes);
                let actual = ChunkDigest {
                    index: chunk_index,
                    offset,
                    size: read as u64,
                    sha256: hex_bytes(&chunk.finalize()),
                };

                let expected = item
                    .chunks
                    .get(chunk_index as usize)
                    .ok_or_else(|| format!("Chunk count changed for {}", item.source.display()))?;
                if &actual != expected {
                    return Err(format!(
                        "Source changed while packaging: {} (chunk {})",
                        item.source.display(),
                        chunk_index
                    ));
                }

                offset += read as u64;
                chunk_index += 1;
            }

            let actual_sha256 = hex_bytes(&whole.finalize());
            if actual_sha256 != item.sha256 || offset != item.size {
                return Err(format!(
                    "Source changed while packaging: {}",
                    item.source.display()
                ));
            }

            checksums.push_str(&format!("{}  {}  {}\n", item.sha256, archive_name, item.size));
            for chunk in &item.chunks {
                chunks.push_str(&format!(
                    "{}  {}  offset={}  size={}  chunk={}\n",
                    chunk.sha256, archive_name, chunk.offset, chunk.size, chunk.index
                ));
            }
        }

        zip.start_file("CHECKSUMS.sha256", options)
            .map_err(|e| format!("ZIP checksum entry failed: {e}"))?;
        zip.write_all(checksums.as_bytes())
            .map_err(|e| format!("ZIP checksum write failed: {e}"))?;

        zip.start_file("CHUNK-CHECKSUMS.sha256", options)
            .map_err(|e| format!("ZIP chunk checksum entry failed: {e}"))?;
        zip.write_all(chunks.as_bytes())
            .map_err(|e| format!("ZIP chunk checksum write failed: {e}"))?;

        let mut manifest = serde_json::json!({
            "kind": "c2m-flower-batch",
            "container": kind,
            "groupSize": GROUP_SIZE,
            "fileCount": files.len(),
            "folders": files.len().div_ceil(GROUP_SIZE),
            "integrity": {
                "wholeFile": "SHA-256",
                "chunks": {
                    "algorithm": "SHA-256",
                    "sizeBytes": CHUNK_SIZE
                }
            }
        });

        if include_render_contract {
            manifest["renderContract"] = serde_json::json!({
                "width": 3840,
                "height": 2160,
                "fps": 60,
                "durationSeconds": 10,
                "frames": 600,
                "quality": "maximum",
                "transparentSource": true,
                "frameChecksumsRequested": true,
                "chunkChecksumsRequested": true,
                "deliveryNote": "Standard H.264 MP4 and JPG do not universally carry alpha. Transparent first-frame delivery uses PNG."
            });
        }

        let manifest_bytes = serde_json::to_vec_pretty(&manifest)
            .map_err(|e| format!("Manifest encode failed: {e}"))?;
        zip.start_file("BATCH-MANIFEST.json", options)
            .map_err(|e| format!("ZIP manifest entry failed: {e}"))?;
        zip.write_all(&manifest_bytes)
            .map_err(|e| format!("ZIP manifest write failed: {e}"))?;

        zip.finish()
            .map_err(|e| format!("ZIP finalize failed: {e}"))?;
        Ok(())
    })();

    match result {
        Ok(()) => {
            if path.exists() {
                fs::remove_file(path)
                    .map_err(|e| format!("Could not replace {}: {e}", path.display()))?;
            }
            if let Err(error) = fs::rename(&temp_path, path) {
                let _ = fs::remove_file(&temp_path);
                return Err(format!("Could not finalize {}: {error}", path.display()));
            }
            Ok(())
        }
        Err(error) => {
            let _ = fs::remove_file(&temp_path);
            Err(error)
        }
    }
}

fn sanitize_name(value: &str) -> String {
    value
        .chars()
        .map(|c| match c {
            '/' | '\\\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_frame_png_detection_is_strict_enough() {
        assert!(is_first_frame_png_name(Path::new("flower-first-frame.png")));
        assert!(is_first_frame_png_name(Path::new("frame-000000.png")));
        assert!(is_first_frame_png_name(Path::new("000000.png")));
        assert!(!is_first_frame_png_name(Path::new("frame-000001.png")));
        assert!(!is_first_frame_png_name(Path::new("flower-petals.png")));
    }
}
