use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
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

        if root == output {
            return Err(PackageError::InvalidOutput);
        }

        if let Some(parent) = output.parent() {
            fs::create_dir_all(parent)?;
        }

        let manifest_json = fs::read(root.join("manifest.json"))?;
        let project: ProjectManifest = serde_json::from_slice(&manifest_json)
            .map_err(|_| PackageError::InvalidProjectManifest)?;

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

        let file = File::create(&output)?;
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
        Ok(manifest)
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

        Ok(ImportResult {
            project_path: destination.to_string_lossy().into_owned(),
            project_id: manifest.project_id,
            name: manifest.name,
            files_verified: manifest.files.len(),
        })
    }
}

fn validate_project(path: &str) -> Result<PathBuf, PackageError> {
    let root = PathBuf::from(path);
    if root.extension().and_then(|v| v.to_str()) != Some("tamasrazim")
        || !root.is_dir()
        || !root.join("manifest.json").is_file()
        || !root.join("project.db").is_file()
    {
        return Err(PackageError::InvalidProject);
    }
    Ok(root)
}

fn validate_package_manifest(manifest: &PackageManifest) -> Result<(), PackageError> {
    if manifest.format != "tamasrazim"
        || manifest.package_version != PACKAGE_FORMAT_VERSION
        || manifest.project_id.trim().is_empty()
        || manifest.name.trim().is_empty()
    {
        return Err(PackageError::InvalidPackage);
    }

    if manifest.files.iter().any(|file| file.path.is_empty()) {
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

        if path.is_dir() {
            if relative == "cache" || relative.starts_with("cache/") {
                continue;
            }
            collect_files(root, &path, output)?;
        } else if path.is_file() {
            if relative != PACKAGE_MANIFEST {
                output.push(relative);
            }
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
    fn package_manifest_rejects_incompatible_version() {
        let mut manifest = PackageManifest {
            format: "tamasrazim".into(),
            package_version: PACKAGE_FORMAT_VERSION,
            project_id: "12345678".into(),
            name: "Test".into(),
            created_at: "now".into(),
            files: Vec::new(),
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
    fn package_round_trip() {
        let root = tempfile::tempdir().expect("root");
        let project = root.path().join("roundtrip.tamasrazim");
        fs::create_dir_all(project.join("source")).expect("source");
        fs::create_dir_all(project.join("renders")).expect("renders");

        fs::write(
            project.join("manifest.json"),
            r#"{"format":"tamasrazim","formatVersion":"0.1","projectId":"12345678-aaaa-bbbb-cccc-dddddddddddd","name":"Round Trip","createdBy":"KYNESTRA"}"#,
        ).expect("manifest");
        fs::write(project.join("project.db"), b"sqlite-placeholder").expect("db");
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
