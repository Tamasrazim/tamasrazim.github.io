use super::db;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};

const FORMAT: &str = "tamasrazim";
const FORMAT_VERSION: &str = "0.1";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectManifest {
    pub format: String,
    #[serde(rename = "formatVersion")]
    pub format_version: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    pub name: String,
    #[serde(rename = "createdBy")]
    pub created_by: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ProjectSummary {
    pub project_id: String,
    pub name: String,
    pub path: String,
    pub format: String,
    pub format_version: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct CreateProjectResult {
    pub project: ProjectSummary,
    pub manifest: ProjectManifest,
}

#[derive(Default)]
pub struct ProjectManager;

impl ProjectManager {
    pub(crate) fn validated_root(&self, path: &str) -> Result<PathBuf, ProjectError> {
        validated_root(path)
    }
    pub fn create(&self, root: &Path, name: &str) -> Result<CreateProjectResult, ProjectError> {
        let clean_name = validate_name(name)?;
        fs::create_dir_all(root)?;

        let project_id = uuid::Uuid::new_v4().to_string();
        let folder = format!("{}-{}.tamasrazim", slugify(&clean_name), &project_id[..8]);
        let project_root = root.join(folder);

        let result = (|| -> Result<CreateProjectResult, ProjectError> {
            for directory in ["modules/forge", "modules/c2m", "modules/vault", "source", "assets", "renders", "previews"] {
                fs::create_dir_all(project_root.join(directory))?;
            }

            let manifest = ProjectManifest {
                format: FORMAT.into(),
                format_version: FORMAT_VERSION.into(),
                project_id: project_id.clone(),
                name: clean_name.clone(),
                created_by: "KYNESTRA".into(),
            };

            fs::write(
                project_root.join("manifest.json"),
                serde_json::to_vec_pretty(&manifest)?,
            )?;

            let database_path = project_root.join("project.db");
            let conn = db::open(&database_path)?;
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO projects (project_id,name,format,format_version,root_path,created_at,updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7)",
                params![
                    project_id,
                    clean_name,
                    FORMAT,
                    FORMAT_VERSION,
                    project_root.to_string_lossy(),
                    now,
                    now
                ],
            )?;

            let project = summary_from_manifest(&project_root, &manifest);
            Ok(CreateProjectResult { project, manifest })
        })();

        match result {
            Ok(value) => Ok(value),
            Err(error) => {
                let _ = fs::remove_dir_all(&project_root);
                Err(error)
            }
        }
    }

    pub fn open(&self, path: &str) -> Result<ProjectSummary, ProjectError> {
        let root = PathBuf::from(path);
        let manifest_path = root.join("manifest.json");

        if !root.is_dir() || !manifest_path.is_file() {
            return Err(ProjectError::InvalidPackage);
        }

        let manifest: ProjectManifest = serde_json::from_slice(&fs::read(manifest_path)?)?;
        validate_manifest(&manifest)?;

        if !root.join("project.db").is_file() {
            return Err(ProjectError::MissingDatabase);
        }

        validate_database_identity(&root, &manifest)?;

        Ok(summary_from_manifest(&root, &manifest))
    }

    pub fn list(&self, root: &Path) -> Result<Vec<ProjectSummary>, ProjectError> {
        if !root.exists() {
            return Ok(Vec::new());
        }

        let mut projects = Vec::new();
        for entry in fs::read_dir(root)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|v| v.to_str()) != Some(FORMAT) {
                continue;
            }

            let manifest_path = path.join("manifest.json");
            if !manifest_path.is_file() {
                continue;
            }

            let path_string = path.to_string_lossy().into_owned();
            if let Ok(project) = self.open(&path_string) {
                projects.push(project);
            }
        }

        projects.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(projects)
    }
}

pub(crate) fn validated_root(path: &str) -> Result<PathBuf, ProjectError> {
    let summary = ProjectManager::default().open(path)?;
    Ok(PathBuf::from(summary.path))
}

fn validate_database_identity(root: &Path, manifest: &ProjectManifest) -> Result<(), ProjectError> {
    let conn = db::open(&root.join("project.db"))?;
    let row = conn.query_row(
        "SELECT project_id,name,format,format_version,root_path FROM projects LIMIT 1",
        [],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
            ))
        },
    );

    let (project_id, name, format, format_version, root_path) =
        row.map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => ProjectError::DatabaseProjectMissing,
            other => ProjectError::Sqlite(other),
        })?;

    let expected_root = root.to_string_lossy();

    if project_id != manifest.project_id
        || name != manifest.name
        || format != FORMAT
        || format_version != FORMAT_VERSION
    {
        return Err(ProjectError::DatabaseManifestMismatch);
    }

    if root_path.as_deref().map(str::trim).filter(|value| !value.is_empty()).map(|value| value != expected_root.as_ref()).unwrap_or(false) {
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE projects SET root_path=?1,updated_at=?2 WHERE project_id=?3",
            params![expected_root.as_ref(), now, manifest.project_id],
        )?;
    }

    Ok(())
}

fn summary_from_manifest(root: &Path, manifest: &ProjectManifest) -> ProjectSummary {
    ProjectSummary {
        project_id: manifest.project_id.clone(),
        name: manifest.name.clone(),
        path: root.to_string_lossy().into_owned(),
        format: manifest.format.clone(),
        format_version: manifest.format_version.clone(),
    }
}

fn validate_manifest(manifest: &ProjectManifest) -> Result<(), ProjectError> {
    if manifest.format != FORMAT || manifest.format_version != FORMAT_VERSION {
        return Err(ProjectError::UnsupportedFormat);
    }
    if manifest.created_by != "KYNESTRA" {
        return Err(ProjectError::InvalidManifest);
    }
    if manifest.project_id.is_empty() || manifest.name.trim().is_empty() {
        return Err(ProjectError::InvalidManifest);
    }
    Ok(())
}

fn validate_name(name: &str) -> Result<String, ProjectError> {
    let value = name.trim();
    if value.is_empty() || value.len() > 96 {
        return Err(ProjectError::InvalidName);
    }

    if value.chars().any(|c| matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|')) {
        return Err(ProjectError::InvalidName);
    }

    Ok(value.to_string())
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

    output.trim_matches('-').to_string()
}

#[derive(Debug, thiserror::Error)]
pub enum ProjectError {
    #[error("invalid project name")]
    InvalidName,
    #[error("invalid .tamasrazim package")]
    InvalidPackage,
    #[error("unsupported project format")]
    UnsupportedFormat,
    #[error("invalid project manifest")]
    InvalidManifest,
    #[error("project database is missing")]
    MissingDatabase,
    #[error("project database has no project record")]
    DatabaseProjectMissing,
    #[error("project database does not match manifest")]
    DatabaseManifestMismatch,
    #[error("filesystem error: {0}")]
    Io(#[from] std::io::Error),
    #[error("serialization error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slugify_is_stable() {
        assert_eq!(slugify("My Flower Project"), "my-flower-project");
        assert_eq!(slugify("A/B"), "a-b");
    }

    #[test]
    fn create_list_and_open_project() {
        let root = tempfile::tempdir().expect("temp directory");
        let manager = ProjectManager::default();

        let created = manager
            .create(root.path(), "My Flower Project")
            .expect("project creation");

        assert_eq!(created.project.name, "My Flower Project");
        assert_eq!(created.manifest.format, FORMAT);
        assert!(Path::new(&created.project.path).join("manifest.json").is_file());
        assert!(Path::new(&created.project.path).join("project.db").is_file());
        assert!(Path::new(&created.project.path).join("source").is_dir());
        assert!(Path::new(&created.project.path).join("renders").is_dir());

        let listed = manager.list(root.path()).expect("list projects");
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].project_id, created.project.project_id);

        let opened = manager.open(&created.project.path).expect("open project");
        assert_eq!(opened.project_id, created.project.project_id);
    }

    #[test]
    fn opening_moved_project_refreshes_root_path() {
        let root = tempfile::tempdir().expect("root");
        let manager = ProjectManager::default();

        let created = manager.create(root.path(), "Movable Project").expect("project");
        let old_path = PathBuf::from(&created.project.path);
        let moved_path = root.path().join("moved.tamasrazim");
        fs::rename(&old_path, &moved_path).expect("move project");

        let opened = manager.open(moved_path.to_str().unwrap()).expect("open moved project");
        assert_eq!(opened.project_id, created.project.project_id);

        let conn = db::open(&moved_path.join("project.db")).expect("db");
        let root_path: String = conn
            .query_row("SELECT root_path FROM projects WHERE project_id=?1", [created.project.project_id.as_str()], |row| row.get(0))
            .expect("root path");
        assert_eq!(root_path, moved_path.to_string_lossy());
    }

    #[test]
    fn validated_root_rejects_database_manifest_mismatch() {
        let root = tempfile::tempdir().expect("root");
        let manager = ProjectManager::default();
        let created = manager.create(root.path(), "Boundary Project").expect("project");

        let conn = db::open(&Path::new(&created.project.path).join("project.db")).expect("db");
        conn.execute(
            "UPDATE projects SET name='Wrong Name' WHERE project_id=?1",
            [created.project.project_id.as_str()],
        ).expect("update");

        assert!(matches!(
            validated_root(&created.project.path),
            Err(ProjectError::DatabaseManifestMismatch)
        ));
    }

    #[test]
    fn list_skips_project_with_database_mismatch() {
        let root = tempfile::tempdir().expect("root");
        let manager = ProjectManager::default();
        let created = manager.create(root.path(), "Broken Project").expect("project");

        let conn = db::open(&Path::new(&created.project.path).join("project.db")).expect("db");
        conn.execute(
            "UPDATE projects SET name='Wrong Name' WHERE project_id=?1",
            [created.project.project_id.as_str()],
        ).expect("update");

        let listed = manager.list(root.path()).expect("list");
        assert!(listed.is_empty());
    }

    #[test]
    fn rejects_database_manifest_mismatch() {
        let root = tempfile::tempdir().expect("root");
        let manager = ProjectManager::default();

        let created = manager.create(root.path(), "Consistent Project").expect("project");
        let conn = db::open(&Path::new(&created.project.path).join("project.db")).expect("db");
        conn.execute(
            "UPDATE projects SET project_id='different-id' WHERE project_id=?1",
            [created.project.project_id.as_str()],
        ).expect("update");

        assert!(matches!(
            manager.open(&created.project.path),
            Err(ProjectError::DatabaseManifestMismatch)
        ));

        let project_root = Path::new(&created.project.path);
        let conn = db::open(&project_root.join("project.db")).expect("db");
        conn.execute("DELETE FROM projects", []).expect("delete project row");

        assert!(matches!(
            manager.open(&created.project.path),
            Err(ProjectError::DatabaseProjectMissing)
        ));
    }

    #[test]
    fn rejects_non_kynestra_manifest() {
        let manifest = ProjectManifest {
            format: FORMAT.into(),
            format_version: FORMAT_VERSION.into(),
            project_id: "id".into(),
            name: "Name".into(),
            created_by: "Other".into(),
        };
        assert!(matches!(validate_manifest(&manifest), Err(ProjectError::InvalidManifest)));
    }

    #[test]
    fn rejects_unsafe_names() {
        let root = tempfile::tempdir().expect("temp directory");
        let manager = ProjectManager::default();

        assert!(matches!(
            manager.create(root.path(), "bad/name"),
            Err(ProjectError::InvalidName)
        ));
    }
}
