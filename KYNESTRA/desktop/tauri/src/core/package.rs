use super::db;
use super::projects::ProjectManager;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    fs::{self, File},
    io::{Read, Write},
    path::{Component, Path, PathBuf},
};
use zip::{write::SimpleFileOptions, CompressionMethod, ZipArchive, ZipWriter};

const PACKAGE_FORMAT_VERSION: u32 = 1;
const PACKAGE_MANIFEST: &str = "package-manifest.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageFile {
    pub path: String,
    pub size: u64,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageManifest {
    pub format: String,
    #[serde(rename = "packageVersion")]
    pub package_version: u32,
    #[serde(rename = "projectId")]
    pub project_id: String,
    pub name: String,
    pub created_at: String,
    pub files: Vec<PackageFile>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportResult {
    pub project_path: String,
    pub project_id: String,
    pub name: String,
    pub files_verified: usize,
}

#[derive(Default)]
pub struct PackageService;

impl PackageService {
    pub fn export(&self, project_path: &str, output_path: &str) -> Result<PackageManifest, PackageError> {
        let root = validate_project(project_path)?;
        let output = PathBuf::from(output_path);

        if output.extension().and_then(|v| v.to_str()) != Some("tamasrazim") {
            return Err(PackageError::InvalidOutput);
        }

        let canonical_root = fs::canonicalize(&root)?;
        let output_parent = output
            .parent()
            .filter(|value| !value.as_os_str().is_empty())
            .unwrap_or_else(|| Path::new("."));
        fs::create_dir_all(output_parent)?;
        let canonical_parent = fs::canonicalize(output_parent)?;

        if output == root
            || canonical_parent == canonical_root
            || canonical_parent.starts_with(&canonical_root)
        {
            return Err(PackageError::InvalidOutput);
        }

        let manifest_json = fs::read(root.join("manifest.json"))?;
        let project: ProjectManifest = serde_json::from_slice(&manifest_json)
            .map_err(|_| PackageError::InvalidProjectManifest)?;

        validate_working_manifest(&project)?;

        let mut paths = Vec::new();
        collect_files(&root, &root, &mut paths)?;
        paths.sort();

        let files = paths
            .iter()
            .map(|path| {
                let full = root.join(path);
                let (sha256, size) = hash_file(&full)?;
                Ok(PackageFile {
                    path: path.clone(),
                    size,
                    sha256,
                })
            })
            .collect::<Result<Vec<_>, PackageError>>()?;

        let manifest = PackageManifest {
            format: "tamasrazim".into(),
            package_version: PACKAGE_FORMAT_VERSION,
            project_id: project.project_id,
            name: project.name,
            created_at: Utc::now().to_rfc3339(),
            files,
        };

        if output.exists() && !output.is_file() {
            return Err(PackageError::InvalidOutput);
        }

        let file_name = output
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("project.tamasrazim");
        let temp_name = format!(".{}.partial-{}", file_name, uuid::Uuid::new_v4());
        let temp_output = output_parent.join(temp_name);

        let write_result = (|| -> Result<(), PackageError> {
            let file = File::create(&temp_output)?;
            let mut archive = ZipWriter::new(file);
            let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

            let bytes = serde_json::to_vec_pretty(&manifest)?;
            archive.start_file(PACKAGE_MANIFEST, options)?;
            archive.write_all(&bytes)?;

            for item in &manifest.files {
                let source = root.join(&item.path);
                archive.start_file(&item.path, options)?;
                let mut input = File::open(source)?;
                std::io::copy(&mut input, &mut archive)?;
            }

            archive.finish()?;
            Ok(())
        })();

        match write_result {
            Ok(()) => {
                if output.exists() {
                    fs::remove_file(&output)?;
                }
                if let Err(error) = fs::rename(&temp_output, &output) {
                    let _ = fs::remove_file(&temp_output);
                    return Err(PackageError::Io(error));
                }
                Ok(manifest)
            }
            Err(error) => {
                let _ = fs::remove_file(&temp_output);
                Err(error)
            }
        }
    }

    pub fn import(&self, package_path: &str, destination_root: &Path) -> Result<ImportResult, PackageError> {
        let package = Path::new(package_path);

        if !package.is_file() || package.extension().and_then(|v| v.to_str()) != Some("tamasrazim") {
            return Err(PackageError::InvalidPackage);
        }

        fs::create_dir_all(destination_root)?;
        let file = File::open(package)?;
        let mut archive = ZipArchive::new(file)?;

        let manifest: PackageManifest = {
            let mut entry = archive.by_name(PACKAGE_MANIFEST)?;
            let mut json = String::new();
            entry.read_to_string(&mut json)?;
            serde_json::from_str(&json)?
        };

        validate_package_manifest(&manifest)?;

        let slug = slugify(&manifest.name);
        let folder = format!("{}-{}.tamasrazim", slug, &manifest.project_id[..8.min(manifest.project_id.len())]);
        let destination = destination_root.join(folder);

        if destination.exists() {
            return Err(PackageError::DestinationExists);
        }

        fs::create_dir_all(&destination)?;

        for item in &manifest.files {
            let relative = safe_relative_path(&item.path)?;
            let target = destination.join(relative);
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent)?;
            }

            let mut entry = archive.by_name(&item.path)?;
            let mut output = File::create(&target)?;
            std::io::copy(&mut entry, &mut output)?;

            let (sha256, size) = hash_file(&target)?;
            if size != item.size || sha256 != item.sha256 {
                let _ = fs::remove_dir_all(&destination);
                return Err(PackageError::IntegrityMismatch(item.path.clone()));
            }
        }

        let inner_manifest_bytes = match fs::read(destination.join("manifest.json")) {
            Ok(bytes) => bytes,
            Err(error) => {
                let _ = fs::remove_dir_all(&destination);
                return Err(PackageError::Io(error));
            }
        };

        let inner_manifest: ProjectManifest = match serde_json::from_slice(&inner_manifest_bytes) {
            Ok(manifest) => manifest,
            Err(_) => {
                let _ = fs::remove_dir_all(&destination);
                return Err(PackageError::InvalidProjectManifest);
            }
        };

        if let Err(error) = validate_manifest_consistency(&manifest, &inner_manifest) {
            let _ = fs::remove_dir_all(&destination);
            return Err(error);
        }

        Ok(ImportResult {
            project_path: destination.to_string_lossy().into_owned(),
            project_id: manifest.project_id,
            name: manifest.name,
            files_verified: manifest.files.len(),
        })
    }
}

fn validate_project(path: &str) -> Result<PathBuf, PackageError> {
    ProjectManager::default()
        .validated_root(path)
        .map_err(|_| PackageError::InvalidProject)
}

fn validate_working_manifest(project: &ProjectManifest) -> Result<(), PackageError> {
    if project.format != "tamasrazim"
        || project.format_version != "0.1"
        || project.project_id.trim().is_empty()
        || project.name.trim().is_empty()
        || project.created_by != "KYNESTRA"
    {
        return Err(PackageError::InvalidProjectManifest);
    }

    Ok(())
}

fn validate_manifest_consistency(package: &PackageManifest, project: &ProjectManifest) -> Result<(), PackageError> {
    if project.format != "tamasrazim"
        || project.format_version != "0.1"
        || project.project_id != package.project_id
        || project.name != package.name
        || project.created_by != "KYNESTRA"
    {
        return Err(PackageError::ManifestMismatch);
    }

    Ok(())
}

fn validate_package_manifest(manifest: &PackageManifest) -> Result<(), PackageError> {
    if manifest.format != "tamasrazim"
        || manifest.package_version != PACKAGE_FORMAT_VERSION
        || manifest.project_id.trim().is_empty()
        || manifest.name.trim().is_empty()
        || manifest.created_at.trim().is_empty()
        || manifest.files.is_empty()
    {
        return Err(PackageError::InvalidPackage);
    }

    let mut seen = HashSet::new();
    let mut has_manifest = false;
    let mut has_database = false;

    for file in &manifest.files {
        if file.path.is_empty()
            || file.path == PACKAGE_MANIFEST
            || file.sha256.len() != 64
            || !file.sha256.chars().all(|value| value.is_ascii_hexdigit())
            || safe_relative_path(&file.path).is_err()
            || !seen.insert(file.path.clone())
        {
            return Err(PackageError::InvalidPackage);
        }

        has_manifest |= file.path == "manifest.json";
        has_database |= file.path == "project.db";
    }

    if !has_manifest || !has_database {
        return Err(PackageError::InvalidPackage);
    }

    Ok(())
}

fn safe_relative_path(value: &str) -> Result<PathBuf, PackageError> {
    let path = Path::new(value);

    if path.is_absolute() || value.contains('\\') {
        return Err(PackageError::UnsafePath(value.into()));
    }

    for component in path.components() {
        match component {
            Component::Normal(_) => {}
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err(PackageError::UnsafePath(value.into()));
            }
        }
    }

    Ok(path.to_path_buf())
}

fn collect_files(root: &Path, current: &Path, output: &mut Vec<String>) -> Result<(), PackageError> {
    for entry in fs::read_dir(current)? {
        let entry = entry?;
        let path = entry.path();
        let relative = path
            .strip_prefix(root)
            .map_err(|_| PackageError::InvalidProject)?
            .to_string_lossy()
            .replace('\\', "/");

        let file_type = fs::symlink_metadata(&path)?.file_type();
        if file_type.is_symlink() {
            return Err(PackageError::InvalidProject);
        }

        if file_type.is_dir() {
            if relative == "cache" || relative.starts_with("cache/") {
                continue;
            }
            collect_files(root, &path, output)?;
        } else if file_type.is_file() && relative != PACKAGE_MANIFEST {
            output.push(relative);
        }
    }
    Ok(())
}

fn hash_file(path: &Path) -> Result<(String, u64), PackageError> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 1024 * 1024];
    let mut size = 0_u64;

    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
        size += read as u64;
    }

    Ok((format!("{:x}", hasher.finalize()), size))
}

fn slugify(name: &str) -> String {
    let mut output = String::new();
    let mut dash = false;

    for ch in name.chars() {
        if ch.is_ascii_alphanumeric() {
            output.push(ch.to_ascii_lowercase());
            dash = false;
        } else if !dash {
            output.push('-');
            dash = true;
        }
    }

    let value = output.trim_matches('-');
    if value.is_empty() { "project".into() } else { value.into() }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProjectManifest {
    format: String,
    #[serde(rename = "formatVersion")]
    format_version: String,
    #[serde(rename = "projectId")]
    project_id: String,
    name: String,
    #[serde(rename = "createdBy")]
    created_by: String,
}

#[derive(Debug, thiserror::Error)]
pub enum PackageError {
    #[error("invalid .tamasrazim working project")]
    InvalidProject,
    #[error("invalid project manifest")]
    InvalidProjectManifest,
    #[error("invalid .tamasrazim package")]
    InvalidPackage,
    #[error("package manifest does not match project manifest")]
    ManifestMismatch,
    #[error("invalid package output path")]
    InvalidOutput,
    #[error("destination already exists")]
    DestinationExists,
    #[error("unsafe package path: {0}")]
    UnsafePath(String),
    #[error("package integrity mismatch: {0}")]
    IntegrityMismatch(String),
    #[error("filesystem error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("ZIP error: {0}")]
    Zip(#[from] zip::result::ZipError),
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn package_manifest_rejects_traversal() {
        assert!(safe_relative_path("../outside").is_err());
        assert!(safe_relative_path("/absolute").is_err());
        assert!(safe_relative_path("ok/file.txt").is_ok());
    }

    #[test]
    fn working_manifest_requires_kynestra_creator() {
        let valid = ProjectManifest {
            format: "tamasrazim".into(),
            format_version: "0.1".into(),
            project_id: "id".into(),
            name: "Name".into(),
            created_by: "KYNESTRA".into(),
        };
        assert!(validate_working_manifest(&valid).is_ok());

        let invalid = ProjectManifest {
            created_by: "Other".into(),
            ..valid
        };
        assert!(matches!(validate_working_manifest(&invalid), Err(PackageError::InvalidProjectManifest)));
    }

    #[test]
    fn package_manifest_rejects_incompatible_version() {
        let valid_files = vec![
            PackageFile { path: "manifest.json".into(), size: 1, sha256: "a".repeat(64) },
            PackageFile { path: "project.db".into(), size: 1, sha256: "b".repeat(64) },
        ];
        let mut manifest = PackageManifest {
            format: "tamasrazim".into(),
            package_version: PACKAGE_FORMAT_VERSION,
            project_id: "12345678".into(),
            name: "Test".into(),
            created_at: "now".into(),
            files: valid_files,
        };
        assert!(validate_package_manifest(&manifest).is_ok());

        manifest.format = "other".into();
        assert!(validate_package_manifest(&manifest).is_err());

        manifest.format = "tamasrazim".into();
        manifest.package_version = PACKAGE_FORMAT_VERSION + 1;
        assert!(validate_package_manifest(&manifest).is_err());
    }

    #[test]
    fn package_manifest_rejects_windows_separator() {
        assert!(safe_relative_path(r"source\\outside.txt").is_err());
    }

    #[test]
    fn package_manifest_rejects_duplicate_and_reserved_paths() {
        let base = PackageManifest {
            format: "tamasrazim".into(),
            package_version: PACKAGE_FORMAT_VERSION,
            project_id: "12345678".into(),
            name: "Test".into(),
            created_at: "now".into(),
            files: vec![
                PackageFile { path: "manifest.json".into(), size: 1, sha256: "a".repeat(64) },
                PackageFile { path: "project.db".into(), size: 1, sha256: "b".repeat(64) },
            ],
        };
        assert!(validate_package_manifest(&base).is_ok());

        let mut duplicate = base.clone();
        duplicate.files.push(duplicate.files[0].clone());
        assert!(validate_package_manifest(&duplicate).is_err());

        let mut reserved = base.clone();
        reserved.files.push(PackageFile {
            path: PACKAGE_MANIFEST.into(),
            size: 1,
            sha256: "c".repeat(64),
        });
        assert!(validate_package_manifest(&reserved).is_err());

        let mut missing_database = base;
        missing_database.files.retain(|file| file.path != "project.db");
        assert!(validate_package_manifest(&missing_database).is_err());
    }

    #[test]
    fn package_manifest_must_match_project_manifest() {
        let package = PackageManifest {
            format: "tamasrazim".into(),
            package_version: PACKAGE_FORMAT_VERSION,
            project_id: "project-a".into(),
            name: "Project A".into(),
            created_at: "now".into(),
            files: Vec::new(),
        };
        let matching = ProjectManifest {
            format: "tamasrazim".into(),
            format_version: "0.1".into(),
            project_id: "project-a".into(),
            name: "Project A".into(),
            created_by: "KYNESTRA".into(),
        };
        assert!(validate_manifest_consistency(&package, &matching).is_ok());

        let mismatched = ProjectManifest {
            project_id: "project-b".into(),
            ..matching
        };
        assert!(matches!(
            validate_manifest_consistency(&package, &mismatched),
            Err(PackageError::ManifestMismatch)
        ));

        let incompatible_version = ProjectManifest {
            format_version: "0.2".into(),
            project_id: "project-a".into(),
            name: "Project A".into(),
            format: "tamasrazim".into(),
            created_by: "KYNESTRA".into(),
        };
        assert!(matches!(
            validate_manifest_consistency(&package, &incompatible_version),
            Err(PackageError::ManifestMismatch)
        ));
    }

    #[test]
    fn export_rejects_output_inside_project() {
        let root = tempfile::tempdir().expect("root");
        let project = root.path().join("inside.tamasrazim");
        fs::create_dir_all(&project).expect("project");
        fs::write(
            project.join("manifest.json"),
            r#"{"format":"tamasrazim","formatVersion":"0.1","projectId":"inside-123","name":"Inside","createdBy":"KYNESTRA"}"#,
        ).expect("manifest");
        let conn = db::open(&project.join("project.db")).expect("db");
        conn.execute(
            "INSERT INTO projects (project_id,name,format,format_version,root_path,created_at,updated_at) VALUES ('inside-123','Inside','tamasrazim','0.1',?1,'now','now')",
            [project.to_string_lossy().as_ref()],
        ).expect("project row");

        let output = project.join("backup.tamasrazim");
        let result = PackageService::default().export(
            project.to_str().unwrap(),
            output.to_str().unwrap(),
        );
        assert!(matches!(result, Err(PackageError::InvalidOutput)));
    }

    #[test]
    #[cfg(unix)]
    fn export_rejects_symlinked_project_file() {
        use std::os::unix::fs::symlink;

        let root = tempfile::tempdir().expect("root");
        let project = root.path().join("symlinked.tamasrazim");
        fs::create_dir_all(&project).expect("project");
        fs::write(
            project.join("manifest.json"),
            r#"{"format":"tamasrazim","formatVersion":"0.1","projectId":"symlink-123","name":"Symlinked","createdBy":"KYNESTRA"}"#,
        ).expect("manifest");
        let conn = db::open(&project.join("project.db")).expect("db");
        conn.execute(
            "INSERT INTO projects (project_id,name,format,format_version,root_path,created_at,updated_at) VALUES ('symlink-123','Symlinked','tamasrazim','0.1',?1,'now','now')",
            [project.to_string_lossy().as_ref()],
        ).expect("project row");
        let outside = root.path().join("outside.txt");
        fs::write(&outside, b"outside").expect("outside");
        symlink(&outside, project.join("source.txt")).expect("symlink");

        let archive = root.path().join("Symlinked.tamasrazim");
        let result = PackageService::default().export(project.to_str().unwrap(), archive.to_str().unwrap());
        assert!(matches!(result, Err(PackageError::InvalidProject)));
    }

    #[test]
    fn package_round_trip() {
        let root = tempfile::tempdir().expect("root");
        let project = root.path().join("roundtrip.tamasrazim");
        fs::create_dir_all(project.join("source")).expect("source");
        fs::create_dir_all(project.join("renders")).expect("renders");

        fs::write(
            project.join("manifest.json"),
            r#"{"format":"tamasrazim","formatVersion":"0.1","projectId":"12345678-aaaa-bbbb-cccc-dddddddddddd","name":"Round Trip","createdBy":"KYNESTRA"}"#,
        ).expect("manifest");
        let conn = db::open(&project.join("project.db")).expect("db");
        conn.execute(
            "INSERT INTO projects (project_id,name,format,format_version,root_path,created_at,updated_at) VALUES ('12345678-aaaa-bbbb-cccc-dddddddddddd','Round Trip','tamasrazim','0.1',?1,'now','now')",
            [project.to_string_lossy().as_ref()],
        ).expect("project row");
        let mut source = File::create(project.join("source/example.js")).expect("source");
        source.write_all(b"const x = 1;").expect("write source");

        let archive = root.path().join("Round-Trip.tamasrazim");
        let service = PackageService::default();
        let manifest = service.export(project.to_str().unwrap(), archive.to_str().unwrap()).expect("export");
        assert_eq!(manifest.files.len(), 3);

        let destination_root = root.path().join("imported");
        let imported = service.import(archive.to_str().unwrap(), &destination_root).expect("import");
        assert_eq!(imported.project_id, "12345678-aaaa-bbbb-cccc-dddddddddddd");
        assert_eq!(imported.files_verified, 3);
        assert!(Path::new(&imported.project_path).join("source/example.js").is_file());
    }
}
