use super::db;
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

        let project_id: Option<String> = conn
            .query_row("SELECT project_id FROM projects LIMIT 1", [], |row| row.get(0))
            .ok();

        conn.execute(
            "INSERT INTO tasks (task_id,project_id,type,status,progress,created_at,payload_json)
             VALUES (?1,?2,?3,'queued',0,?4,?5)",
            params![task_id, project_id, task_type, now, payload_json],
        )?;

        Ok(TaskRecord {
            task_id,
            project_id,
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

        let progress = progress.clamp(0.0, 1.0);
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

            let database = path.join("project.db");
            if !database.is_file() {
                continue;
            }

            let conn = db::open(&database)?;
            let changed = conn.execute(
                "UPDATE tasks
                 SET status='recoverable',
                     message=COALESCE(message,'') || CASE WHEN COALESCE(message,'')='' THEN '' ELSE ' · ' END || 'interrupted by application restart'
                 WHERE status='running'",
                [],
            )?;

            if changed > 0 {
                recovered += changed;
                conn.execute(
                    "UPDATE render_jobs
                     SET status='recoverable',
                         error=COALESCE(error,'interrupted by application restart')
                     WHERE status='running'",
                    [],
                )?;
            }
        }

        Ok(recovered)
    }
}

fn validate_project_path(path: &str) -> Result<PathBuf, TaskError> {
    let root = Path::new(path);
    if root.extension().and_then(|v| v.to_str()) != Some("tamasrazim") {
        return Err(TaskError::InvalidProject);
    }
    if !root.join("manifest.json").is_file() || !root.join("project.db").is_file() {
        return Err(TaskError::InvalidProject);
    }
    Ok(root.to_path_buf())
}

#[derive(Debug, thiserror::Error)]
pub enum TaskError {
    #[error("invalid .tamasrazim project path")]
    InvalidProject,
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
