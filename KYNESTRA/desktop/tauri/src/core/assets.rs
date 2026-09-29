use super::db;
use super::projects::ProjectManager;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File},
    io::{Read, Write},
    path::{Path, PathBuf},
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetRecord {
    pub asset_id: String,
    pub project_id: String,
    pub kind: String,
    pub filename: String,
    pub relative_path: String,
    pub mime_type: Option<String>,
    pub size_bytes: u64,
    pub sha256: String,
    pub metadata: Value,
}

#[derive(Default)]
pub struct AssetService;

impl AssetService {
    pub fn ingest(
        &self,
        project_path: &str,
        source_path: &str,
        kind: &str,
        metadata: Option<Value>,
    ) -> Result<AssetRecord, AssetError> {
        let project = validate_project(project_path)?;
        let source = Path::new(source_path);

        if !source.is_file() {
            return Err(AssetError::SourceMissing);
        }

        let filename = source
            .file_name()
            .and_then(|v| v.to_str())
            .ok_or(AssetError::InvalidFilename)?
            .to_string();

        if filename == "manifest.json" || filename == "project.db" || filename.contains('/') || filename.contains('\\') {
            return Err(AssetError::InvalidFilename);
        }

        let database = project.join("project.db");
        let conn = db::open(&database)?;

        let (sha256, size_bytes) = hash_file(source)?;
        let incoming_metadata = metadata.unwrap_or_else(|| Value::Object(Default::default()));
        if let Some(existing) = find_by_hash(&conn, &sha256)? {
            return merge_duplicate_metadata(&conn, &existing, incoming_metadata);
        }

        let project_id: String = conn.query_row(
            "SELECT project_id FROM projects LIMIT 1",
            [],
            |row| row.get(0),
        )?;

        let metadata_value = incoming_metadata;
        let metadata_json = serde_json::to_string(&metadata_value)?;

        let target_dir = project.join("renders");
        fs::create_dir_all(&target_dir)?;

        let target_name = unique_target_name(&target_dir, &filename, &sha256);
        let target = target_dir.join(&target_name);
        let partial = target_dir.join(format!(".{}.partial", target_name));

        let write_result = copy_file(source, &partial).and_then(|_| {
            fs::rename(&partial, &target).map_err(AssetError::Io)
        });
        if let Err(error) = write_result {
            let _ = fs::remove_file(&partial);
            return Err(error);
        }

        let asset_id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let relative_path = format!("renders/{}", target_name);
        let mime_type = mime_from_filename(&filename);

        if let Err(error) = conn.execute(
            "INSERT INTO assets (asset_id,project_id,kind,filename,relative_path,mime_type,size_bytes,sha256,created_at,updated_at,metadata_json)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
            params![
                asset_id,
                project_id,
                kind,
                filename,
                relative_path,
                mime_type,
                size_bytes as i64,
                sha256,
                now,
                now,
                metadata_json
            ],
        ) {
            let _ = fs::remove_file(&target);
            return Err(AssetError::Sqlite(error));
        }

        Ok(AssetRecord {
            asset_id,
            project_id,
            kind: kind.to_string(),
            filename,
            relative_path,
            mime_type,
            size_bytes,
            sha256,
            metadata: metadata_value,
        })
    }

    pub fn list(&self, project_path: &str) -> Result<Vec<AssetRecord>, AssetError> {
        let project = validate_project(project_path)?;
        let conn = db::open(&project.join("project.db"))?;

        let mut stmt = conn.prepare(
            "SELECT asset_id,project_id,kind,filename,relative_path,mime_type,size_bytes,sha256,metadata_json
             FROM assets ORDER BY created_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            let metadata_json: String = row.get(8)?;
            Ok(AssetRecord {
                asset_id: row.get(0)?,
                project_id: row.get(1)?,
                kind: row.get(2)?,
                filename: row.get(3)?,
                relative_path: row.get(4)?,
                mime_type: row.get(5)?,
                size_bytes: row.get::<_, i64>(6)? as u64,
                sha256: row.get(7)?,
                metadata: serde_json::from_str(&metadata_json).unwrap_or_else(|_| Value::Object(Default::default())),
            })
        })?;

        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }
}

fn validate_project(path: &str) -> Result<PathBuf, AssetError> {
    ProjectManager::default()
        .validated_root(path)
        .map_err(|_| AssetError::InvalidProject)
}

fn hash_file(path: &Path) -> Result<(String, u64), AssetError> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 1024 * 1024];
    let mut total = 0_u64;

    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
        total += read as u64;
    }

    Ok((format!("{:x}", hasher.finalize()), total))
}

fn copy_file(source: &Path, target: &Path) -> Result<(), AssetError> {
    let mut input = File::open(source)?;
    let mut output = File::create(target)?;
    let mut buffer = [0_u8; 1024 * 1024];

    loop {
        let read = input.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        output.write_all(&buffer[..read])?;
    }

    Ok(())
}

fn merge_duplicate_metadata(
    conn: &rusqlite::Connection,
    existing: &AssetRecord,
    incoming: Value,
) -> Result<AssetRecord, AssetError> {
    let mut merged = match existing.metadata.clone() {
        Value::Object(value) => value,
        _ => Map::new(),
    };

    let mut source_modules = match merged.remove("sourceModules") {
        Some(Value::Array(values)) => values,
        _ => Vec::new(),
    };

    if let Some(existing_module) = merged
        .get("sourceModule")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        if !source_modules.iter().any(|item| item.as_str() == Some(existing_module)) {
            source_modules.push(Value::String(existing_module.to_lowercase()));
        }
        merged.remove("sourceModule");
    }

    if let Value::Object(incoming_map) = incoming {
        for (key, value) in incoming_map {
            if key == "sourceModule" {
                let module = value.as_str().unwrap_or_default().trim().to_lowercase();
                if !module.is_empty() && !source_modules.iter().any(|item| item.as_str() == Some(module.as_str())) {
                    source_modules.push(Value::String(module));
                }
            } else if key != "sourceModules" {
                merged.insert(key, value);
            }
        }
    }

    if !source_modules.is_empty() {
        merged.insert("sourceModules".into(), Value::Array(source_modules));
    }

    let now = Utc::now().to_rfc3339();
    let metadata_json = serde_json::to_string(&Value::Object(merged.clone()))?;
    conn.execute(
        "UPDATE assets SET metadata_json=?1,updated_at=?2 WHERE asset_id=?3",
        params![metadata_json, now, existing.asset_id],
    )?;

    let mut updated = existing.clone();
    updated.metadata = Value::Object(merged);
    Ok(updated)
}

fn find_by_hash(conn: &rusqlite::Connection, sha256: &str) -> Result<Option<AssetRecord>, AssetError> {
    let found = conn.query_row(
        "SELECT asset_id,project_id,kind,filename,relative_path,mime_type,size_bytes,sha256,metadata_json
         FROM assets WHERE sha256=?1 LIMIT 1",
        params![sha256],
        |row| {
            let metadata_json: String = row.get(8)?;
            Ok(AssetRecord {
                asset_id: row.get(0)?,
                project_id: row.get(1)?,
                kind: row.get(2)?,
                filename: row.get(3)?,
                relative_path: row.get(4)?,
                mime_type: row.get(5)?,
                size_bytes: row.get::<_, i64>(6)? as u64,
                sha256: row.get(7)?,
                metadata: serde_json::from_str(&metadata_json).unwrap_or_else(|_| Value::Object(Default::default())),
            })
        },
    );

    match found {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(error) => Err(AssetError::Sqlite(error)),
    }
}

fn unique_target_name(dir: &Path, filename: &str, hash: &str) -> String {
    let initial = dir.join(filename);
    if !initial.exists() {
        return filename.to_string();
    }

    let path = Path::new(filename);
    let stem = path.file_stem().and_then(|v| v.to_str()).unwrap_or("asset");
    let ext = path.extension().and_then(|v| v.to_str()).unwrap_or("");
    if ext.is_empty() {
        format!("{}-{}", stem, &hash[..8])
    } else {
        format!("{}-{}.{}", stem, &hash[..8], ext)
    }
}

fn mime_from_filename(filename: &str) -> Option<String> {
    let ext = Path::new(filename).extension()?.to_str()?.to_ascii_lowercase();
    let mime = match ext.as_str() {
        "webm" => "video/webm",
        "mp4" => "video/mp4",
        "mov" => "video/quicktime",
        "mkv" => "video/x-matroska",
        "avi" => "video/x-msvideo",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" => "audio/ogg",
        "m4a" => "audio/mp4",
        "flac" => "audio/flac",
        "zip" => "application/zip",
        "json" => "application/json",
        "txt" | "csv" | "md" => "text/plain",
        _ => return None,
    };
    Some(mime.into())
}

#[derive(Debug, thiserror::Error)]
pub enum AssetError {
    #[error("invalid .tamasrazim project")]
    InvalidProject,
    #[error("source file was not found")]
    SourceMissing,
    #[error("invalid asset filename")]
    InvalidFilename,
    #[error("filesystem error: {0}")]
    Io(#[from] std::io::Error),
    #[error("database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("serialization error: {0}")]
    Json(#[from] serde_json::Error),
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn rejects_reserved_filename() {
        let root = tempfile::tempdir().expect("temp directory");
        let source = root.path().join("manifest.json");
        fs::write(&source, b"invalid asset filename test").expect("source");

        let project_root = root.path().join("filename-check.tamasrazim");
        ProjectFixture::create(&project_root);

        let service = AssetService::default();
        let result = service.ingest(
            project_root.to_str().unwrap(),
            source.to_string_lossy().as_ref(),
            "text",
            None,
        );

        assert!(matches!(result, Err(AssetError::InvalidFilename)));
    }

    #[test]
    fn deduplicate_merges_source_modules() {
        let root = tempfile::tempdir().expect("temp directory");
        let source = root.path().join("render.webm");
        fs::write(&source, b"shared-output").expect("source");

        let project_root = root.path().join("provenance.tamasrazim");
        ProjectFixture::create(&project_root);

        let service = AssetService::default();
        let first = service.ingest(
            project_root.to_str().unwrap(),
            source.to_str().unwrap(),
            "video",
            Some(serde_json::json!({"sourceModule":"c2m"})),
        ).expect("first ingest");
        assert_eq!(first.metadata.get("sourceModule").and_then(Value::as_str), Some("c2m"));

        let second = service.ingest(
            project_root.to_str().unwrap(),
            source.to_str().unwrap(),
            "video",
            Some(serde_json::json!({"sourceModule":"forge"})),
        ).expect("second ingest");

        let modules = second.metadata
            .get("sourceModules")
            .and_then(Value::as_array)
            .expect("sourceModules");
        assert_eq!(modules.len(), 2);
        assert!(modules.iter().any(|v| v.as_str() == Some("c2m")));
        assert!(modules.iter().any(|v| v.as_str() == Some("forge")));
    }

    #[test]
    fn ingest_does_not_leave_partial_file_on_database_failure() {
        let root = tempfile::tempdir().expect("root");
        let source = root.path().join("render.webm");
        fs::write(&source, b"rollback-test").expect("source");

        let project_root = root.path().join("rollback.tamasrazim");
        fs::create_dir_all(project_root.join("renders")).expect("renders");
        fs::write(
            project_root.join("manifest.json"),
            r#"{"format":"tamasrazim","formatVersion":"0.1","projectId":"rollback","name":"Rollback","createdBy":"KYNESTRA"}"#,
        ).expect("manifest");
        let conn = db::open(&project_root.join("project.db")).expect("db");
        conn.execute(
            "INSERT INTO projects (project_id,name,format,format_version,root_path,created_at,updated_at)
             VALUES ('rollback','Rollback','tamasrazim','0.1',?1,'now','now')",
            [project_root.to_string_lossy().as_ref()],
        ).expect("project row");
        conn.execute(
            "CREATE TRIGGER reject_asset_insert BEFORE INSERT ON assets BEGIN SELECT RAISE(ABORT, 'forced rollback'); END;",
            [],
        ).expect("trigger");

        let result = AssetService::default().ingest(
            project_root.to_str().unwrap(),
            source.to_str().unwrap(),
            "video",
            None,
        );
        assert!(matches!(result, Err(AssetError::Sqlite(_))));
        assert!(!project_root.join("renders").join("render.webm").exists());
    }

    #[test]
    fn ingest_hashes_and_deduplicates() {
        let root = tempfile::tempdir().expect("temp directory");
        let source = root.path().join("render.webm");
        let mut file = File::create(&source).expect("source");
        file.write_all(b"kynestra-test").expect("write source");

        let project_root = root.path().join("test.tamasrazim");
        ProjectFixture::create(&project_root);

        let service = AssetService::default();
        let first = service.ingest(project_root.to_str().unwrap(), source.to_str().unwrap(), "render", None).expect("first ingest");
        let second = service.ingest(project_root.to_str().unwrap(), source.to_str().unwrap(), "render", None).expect("second ingest");

        assert_eq!(first.asset_id, second.asset_id);
        assert_eq!(service.list(project_root.to_str().unwrap()).unwrap().len(), 1);
    }

    struct ProjectFixture;

    impl ProjectFixture {
        fn create(path: &Path) {
            fs::create_dir_all(path.join("renders")).unwrap();
            let conn = db::open(&path.join("project.db")).unwrap();
            conn.execute(
                "INSERT INTO projects (project_id,name,format,format_version,root_path,created_at,updated_at)
                 VALUES ('test','Test','tamasrazim','0.1',?1,'now','now')",
                [path.to_string_lossy().as_ref()],
            ).unwrap();
            fs::write(
                path.join("manifest.json"),
                r#"{"format":"tamasrazim","formatVersion":"0.1","projectId":"test","name":"Test","createdBy":"KYNESTRA"}"#,
            ).unwrap();
        }
    }
}
