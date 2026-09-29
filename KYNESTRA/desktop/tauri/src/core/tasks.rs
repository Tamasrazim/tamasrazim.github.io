use super::db;
use super::projects::ProjectManager;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRecord {
    pub task_id: String,
    pub project_id: Option<String>,
    pub task_type: String,
    pub status: String,
    pub progress: f64,
    pub message: Option<String>,
}

#[derive(Default)]
pub struct TaskService;

impl TaskService {
    pub fn create(
        &self,
        project_path: &str,
        task_type: &str,
        payload: Option<Value>,
    ) -> Result<TaskRecord, TaskError> {
        let root = validate_project_path(project_path)?;
        let conn = db::open(&root.join("project.db"))?;

        let task_id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let payload_json = serde_json::to_string(&payload.unwrap_or_else(|| Value::Object(Default::default())))?;

        let project_id: String = conn
            .query_row("SELECT project_id FROM projects LIMIT 1", [], |row| row.get(0))
            .map_err(|error| match error {
                rusqlite::Error::QueryReturnedNoRows => TaskError::ProjectRecordMissing,
                other => TaskError::Sqlite(other),
            })?;

        conn.execute(
            "INSERT INTO tasks (task_id,project_id,type,status,progress,created_at,payload_json)
             VALUES (?1,?2,?3,'queued',0,?4,?5)",
            params![task_id, project_id, task_type, now, payload_json],
        )?;

        Ok(TaskRecord {
            task_id,
            project_id: Some(project_id),
            task_type: task_type.into(),
            status: "queued".into(),
            progress: 0.0,
            message: None,
        })
    }

    pub fn update(
        &self,
        project_path: &str,
        task_id: &str,
        status: &str,
        progress: f64,
        message: Option<String>,
    ) -> Result<TaskRecord, TaskError> {
        let root = validate_project_path(project_path)?;
        let conn = db::open(&root.join("project.db"))?;

        validate_status(status)?;
        let progress = progress.clamp(0.0, 1.0);

        let current_status: String = conn
            .query_row(
                "SELECT status FROM tasks WHERE task_id=?1",
                params![task_id],
                |row| row.get(0),
            )
            .map_err(|err| match err {
                rusqlite::Error::QueryReturnedNoRows => TaskError::NotFound(task_id.into()),
                other => TaskError::Sqlite(other),
            })?;

        if !is_transition_allowed(&current_status, status) {
            return Err(TaskError::InvalidTransition {
                from: current_status,
                to: status.into(),
            });
        }

        let finished_at = if matches!(status, "completed" | "failed" | "cancelled") {
            Some(Utc::now().to_rfc3339())
        } else {
            None
        };

        conn.execute(
            "UPDATE tasks
             SET status=?1,progress=?2,message=?3,finished_at=COALESCE(?4,finished_at),
                 started_at=CASE WHEN ?1='running' AND started_at IS NULL THEN ?5 ELSE started_at END
             WHERE task_id=?6",
            params![status, progress, message, finished_at, Utc::now().to_rfc3339(), task_id],
        )?;

        conn.query_row(
            "SELECT task_id,project_id,type,status,progress,message FROM tasks WHERE task_id=?1",
            params![task_id],
            |row| {
                Ok(TaskRecord {
                    task_id: row.get(0)?,
                    project_id: row.get(1)?,
                    task_type: row.get(2)?,
                    status: row.get(3)?,
                    progress: row.get(4)?,
                    message: row.get(5)?,
                })
            },
        )
        .map_err(TaskError::from)
    }

    pub fn list(&self, project_path: &str) -> Result<Vec<TaskRecord>, TaskError> {
        let root = validate_project_path(project_path)?;
        let conn = db::open(&root.join("project.db"))?;
        let mut stmt = conn.prepare(
            "SELECT task_id,project_id,type,status,progress,message
             FROM tasks ORDER BY created_at DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(TaskRecord {
                task_id: row.get(0)?,
                project_id: row.get(1)?,
                task_type: row.get(2)?,
                status: row.get(3)?,
                progress: row.get(4)?,
                message: row.get(5)?,
            })
        })?;

        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn recover_all(&self, root: &Path) -> Result<usize, TaskError> {
        if !root.is_dir() {
            return Ok(0);
        }

        let mut recovered = 0_usize;

        for entry in std::fs::read_dir(root)? {
            let path = entry?.path();
            if path.extension().and_then(|v| v.to_str()) != Some("tamasrazim") || !path.is_dir() {
                continue;
            }

            let valid_root = match ProjectManager::default().validated_root(path.to_string_lossy().as_ref()) {
                Ok(value) => value,
                Err(_) => continue,
            };
            let database = valid_root.join("project.db");
            let conn = db::open(&database)?;
            let task_changed = conn.execute(
                "UPDATE tasks
                 SET status='recoverable',
                     message=COALESCE(message,'') || CASE WHEN COALESCE(message,'')='' THEN '' ELSE ' · ' END || 'interrupted by application restart'
                 WHERE status='running'",
                [],
            )?;

            let render_changed = conn.execute(
                "UPDATE render_jobs
                 SET status='recoverable',
                     error=COALESCE(error,'interrupted by application restart')
                 WHERE status='running'",
                [],
            )?;

            recovered += task_changed.max(render_changed);
        }

        Ok(recovered)
    }
}

fn validate_status(status: &str) -> Result<(), TaskError> {
    match status {
        "queued" | "running" | "paused" | "recoverable" | "completed" | "failed" | "cancelled" => Ok(()),
        _ => Err(TaskError::InvalidStatus(status.into())),
    }
}

fn is_transition_allowed(from: &str, to: &str) -> bool {
    match from {
        "queued" => matches!(to, "running" | "cancelled"),
        "running" => matches!(to, "paused" | "recoverable" | "completed" | "failed" | "cancelled"),
        "paused" => matches!(to, "running" | "cancelled"),
        "recoverable" => matches!(to, "queued" | "cancelled"),
        "completed" | "failed" | "cancelled" => false,
        _ => false,
    }
}

fn validate_project_path(path: &str) -> Result<PathBuf, TaskError> {
    ProjectManager::default()
        .validated_root(path)
        .map_err(|_| TaskError::InvalidProject)
}

#[derive(Debug, thiserror::Error)]
pub enum TaskError {
    #[error("invalid .tamasrazim project path")]
    InvalidProject,
    #[error("unknown task status: {0}")]
    InvalidStatus(String),
    #[error("task not found: {0}")]
    NotFound(String),
    #[error("project database has no project record")]
    ProjectRecordMissing,
    #[error("invalid task transition: {from} -> {to}")]
    InvalidTransition { from: String, to: String },
    #[error("database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("serialization error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("filesystem error: {0}")]
    Io(#[from] std::io::Error),
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn rejects_unknown_status() {
        assert!(matches!(validate_status("bogus"), Err(TaskError::InvalidStatus(_))));
    }

    #[test]
    fn enforces_task_lifecycle_transitions() {
        assert!(is_transition_allowed("queued", "running"));
        assert!(is_transition_allowed("running", "completed"));
        assert!(is_transition_allowed("recoverable", "queued"));
        assert!(!is_transition_allowed("completed", "running"));
        assert!(!is_transition_allowed("queued", "completed"));
    }

    #[test]
    fn list_returns_recent_tasks() {
        let root = tempfile::tempdir().expect("root");
        let project = root.path().join("list.tamasrazim");
        fs::create_dir_all(&project).expect("project");
        fs::write(
            project.join("manifest.json"),
            r#"{"format":"tamasrazim","formatVersion":"0.1","projectId":"test-list","name":"List","createdBy":"KYNESTRA"}"#,
        ).expect("manifest");
        let conn = db::open(&project.join("project.db")).expect("db");
        conn.execute(
            "INSERT INTO projects (project_id,name,format,format_version,root_path,created_at,updated_at)
             VALUES ('test-list','List','tamasrazim','0.1',?1,'now','now')",
            [project.to_string_lossy().as_ref()],
        ).expect("project row");
        conn.execute(
            "INSERT INTO tasks (task_id,project_id,type,status,progress,created_at,message)
             VALUES ('task-list','test-list','render','queued',0.25,'2026-01-01T00:00:00Z','queued')",
            [],
        ).expect("task row");

        let tasks = TaskService::default().list(project.to_str().unwrap()).expect("list");
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].task_id, "task-list");
        assert_eq!(tasks[0].status, "queued");
        assert!((tasks[0].progress - 0.25).abs() < f64::EPSILON);
    }

    #[test]
    fn recovery_repairs_running_render_job_without_running_task() {
        let root = tempfile::tempdir().expect("root");
        let project = root.path().join("render-recover.tamasrazim");
        fs::create_dir_all(&project).expect("project");
        fs::write(
            project.join("manifest.json"),
            r#"{"format":"tamasrazim","formatVersion":"0.1","projectId":"render-test","name":"Render Recover","createdBy":"KYNESTRA"}"#,
        ).expect("manifest");

        let conn = db::open(&project.join("project.db")).expect("db");
        conn.execute(
            "INSERT INTO projects (project_id,name,format,format_version,root_path,created_at,updated_at)
             VALUES ('render-test','Render Recover','tamasrazim','0.1',?1,'now','now')",
            [project.to_string_lossy().as_ref()],
        ).expect("project row");
        conn.execute(
            "INSERT INTO tasks (task_id,project_id,type,status,progress,created_at)
             VALUES ('render-task','render-test','render','queued',0,'now')",
            [],
        ).expect("task row");
        conn.execute(
            "INSERT INTO render_jobs (job_id,task_id,project_id,status,format,composition_json,created_at)
             VALUES ('render-job','render-task','render-test','running','webm','{}','now')",
            [],
        ).expect("render job");

        let count = TaskService::default().recover_all(root.path()).expect("recover");
        assert_eq!(count, 1);

        let status: String = conn
            .query_row("SELECT status FROM render_jobs WHERE job_id='render-job'", [], |row| row.get(0))
            .expect("render status");
        assert_eq!(status, "recoverable");
    }

    #[test]
    fn task_creation_requires_project_record() {
        let root = tempfile::tempdir().expect("root");
        let project = root.path().join("missing-row.tamasrazim");
        fs::create_dir_all(&project).expect("project");
        fs::write(
            project.join("manifest.json"),
            r#"{"format":"tamasrazim","formatVersion":"0.1","projectId":"missing","name":"Missing","createdBy":"KYNESTRA"}"#,
        ).expect("manifest");
        db::open(&project.join("project.db")).expect("db");

        let result = TaskService::default().create(project.to_str().unwrap(), "render", None);
        assert!(matches!(result, Err(TaskError::ProjectRecordMissing)));
    }

    #[test]
    fn recovery_marks_running_tasks() {
        let root = tempfile::tempdir().expect("root");
        let project = root.path().join("recover.tamasrazim");
        fs::create_dir_all(&project).expect("project");
        fs::write(
            project.join("manifest.json"),
            r#"{"format":"tamasrazim","formatVersion":"0.1","projectId":"test","name":"Recover","createdBy":"KYNESTRA"}"#,
        ).expect("manifest");
        let conn = db::open(&project.join("project.db")).expect("db");
        conn.execute(
            "INSERT INTO projects (project_id,name,format,format_version,root_path,created_at,updated_at)
             VALUES ('test','Recover','tamasrazim','0.1',?1,'now','now')",
            [project.to_string_lossy().as_ref()],
        ).expect("project row");
        conn.execute(
            "INSERT INTO tasks (task_id,project_id,type,status,progress,created_at)
             VALUES ('task','test','render','running',0.5,'now')",
            [],
        ).expect("task row");

        let count = TaskService::default().recover_all(root.path()).expect("recover");
        assert_eq!(count, 1);

        let status: String = conn
            .query_row("SELECT status FROM tasks WHERE task_id='task'", [], |row| row.get(0))
            .expect("status");
        assert_eq!(status, "recoverable");
    }
}
