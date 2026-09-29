use super::db;
use super::projects::ProjectManager;
use super::tasks::{TaskError, TaskRecord, TaskService};
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderJobRecord {
    pub job_id: String,
    pub task_id: String,
    pub project_id: String,
    pub status: String,
    pub format: String,
    pub composition: Value,
    pub output_relative_path: Option<String>,
    pub asset_id: Option<String>,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub error: Option<String>,
}

#[derive(Default)]
pub struct RenderService;

impl RenderService {
    pub fn create(
        &self,
        project_path: &str,
        format: &str,
        composition: Value,
        tasks: &TaskService,
    ) -> Result<RenderJobRecord, RenderError> {
        let task = tasks.create(
            project_path,
            "render",
            Some(serde_json::json!({
                "format": format,
                "composition": composition
            })),
        )?;

        let root = validate_project(project_path)?;
        let conn = db::open(&root.join("project.db"))?;
        let job_id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        if let Err(error) = conn.execute(
            "INSERT INTO render_jobs (job_id,task_id,project_id,status,format,composition_json,created_at)
             VALUES (?1,?2,?3,'queued',?4,?5,?6)",
            params![
                job_id,
                task.task_id,
                task.project_id.as_deref().unwrap_or_default(),
                format,
                composition.to_string(),
                now
            ],
        ) {
            let _ = conn.execute("DELETE FROM tasks WHERE task_id=?1 AND status='queued'", params![task.task_id]);
            return Err(RenderError::Sqlite(error));
        }

        Ok(RenderJobRecord {
            job_id,
            task_id: task.task_id,
            project_id: task.project_id.unwrap_or_default(),
            status: "queued".into(),
            format: format.into(),
            composition,
            output_relative_path: None,
            asset_id: None,
            created_at: now,
            started_at: None,
            completed_at: None,
            error: None,
        })
    }

    pub fn start(&self, project_path: &str, job_id: &str, tasks: &TaskService) -> Result<RenderJobRecord, RenderError> {
        let root = validate_project(project_path)?;
        let conn = db::open(&root.join("project.db"))?;
        let now = Utc::now().to_rfc3339();

        let task_id: String = conn.query_row(
            "SELECT task_id FROM render_jobs WHERE job_id=?1",
            params![job_id],
            |row| row.get(0),
        )?;

        let changed = conn.execute(
            "UPDATE render_jobs
             SET status='running',started_at=?1,error=NULL
             WHERE job_id=?2 AND status='queued'",
            params![now, job_id],
        )?;

        if changed != 1 {
            return Err(RenderError::InvalidStartState);
        }

        if let Err(error) = tasks.update(project_path, &task_id, "running", 0.0, Some("render started".into())) {
            let _ = conn.execute(
                "UPDATE render_jobs SET status='queued',started_at=NULL,error=NULL WHERE job_id=?1 AND status='running'",
                params![job_id],
            );
            return Err(RenderError::Task(error));
        }

        let service = RenderJobReader::new(&conn, job_id)?;
        service.finish()
    }

    pub fn ensure_running(&self, project_path: &str, job_id: &str) -> Result<(), RenderError> {
        let root = validate_project(project_path)?;
        let conn = db::open(&root.join("project.db"))?;
        let status: String = conn
            .query_row(
                "SELECT status FROM render_jobs WHERE job_id=?1",
                params![job_id],
                |row| row.get(0),
            )?;

        require_running_status(&status)
    }

    pub fn attach_asset(
        &self,
        project_path: &str,
        job_id: &str,
        asset_id: &str,
        output_relative_path: &str,
        tasks: &TaskService,
    ) -> Result<RenderJobRecord, RenderError> {
        let root = validate_project(project_path)?;
        let conn = db::open(&root.join("project.db"))?;
        let now = Utc::now().to_rfc3339();

        let task_id: String = conn.query_row(
            "SELECT task_id FROM render_jobs WHERE job_id=?1",
            params![job_id],
            |row| row.get(0),
        )?;

        let changed = conn.execute(
            "UPDATE render_jobs
             SET status='completed',asset_id=?1,output_relative_path=?2,completed_at=?3,error=NULL
             WHERE job_id=?4 AND status='running'",
            params![asset_id, output_relative_path, now, job_id],
        )?;

        if changed != 1 {
            return Err(RenderError::InvalidFinishState);
        }

        if let Err(error) = tasks.update(project_path, &task_id, "completed", 1.0, Some("render completed and asset imported".into())) {
            let _ = conn.execute(
                "UPDATE render_jobs
                 SET status='running',asset_id=NULL,output_relative_path=NULL,completed_at=NULL,error=NULL
                 WHERE job_id=?1 AND status='completed'",
                params![job_id],
            );
            return Err(RenderError::Task(error));
        }
        let reader = RenderJobReader::new(&conn, job_id)?;
        reader.finish()
    }

    pub fn fail(
        &self,
        project_path: &str,
        job_id: &str,
        error: &str,
        tasks: &TaskService,
    ) -> Result<RenderJobRecord, RenderError> {
        let root = validate_project(project_path)?;
        let conn = db::open(&root.join("project.db"))?;
        let now = Utc::now().to_rfc3339();

        let task_id: String = conn.query_row(
            "SELECT task_id FROM render_jobs WHERE job_id=?1",
            params![job_id],
            |row| row.get(0),
        )?;

        let changed = conn.execute(
            "UPDATE render_jobs
             SET status='failed',completed_at=?1,error=?2
             WHERE job_id=?3 AND status='running'",
            params![now, error, job_id],
        )?;

        if changed != 1 {
            return Err(RenderError::InvalidFinishState);
        }

        if let Err(task_error) = tasks.update(project_path, &task_id, "failed", 0.0, Some(error.into())) {
            let _ = conn.execute(
                "UPDATE render_jobs
                 SET status='running',completed_at=NULL,error=NULL
                 WHERE job_id=?1 AND status='failed'",
                params![job_id],
            );
            return Err(RenderError::Task(task_error));
        }

        let reader = RenderJobReader::new(&conn, job_id)?;
        reader.finish()
    }

    pub fn recover(&self, project_path: &str, job_id: &str, tasks: &TaskService) -> Result<RenderJobRecord, RenderError> {
        let root = validate_project(project_path)?;
        let conn = db::open(&root.join("project.db"))?;

        let task_id: String = conn.query_row(
            "SELECT task_id FROM render_jobs WHERE job_id=?1 AND status='recoverable'",
            params![job_id],
            |row| row.get(0),
        )?;

        conn.execute(
            "UPDATE render_jobs
             SET status='queued',started_at=NULL,completed_at=NULL,asset_id=NULL,output_relative_path=NULL,error=NULL
             WHERE job_id=?1 AND status='recoverable'",
            params![job_id],
        )?;

        if let Err(error) = tasks.update(project_path, &task_id, "queued", 0.0, Some("recovered after application restart; ready to rerun".into())) {
            let _ = conn.execute(
                "UPDATE render_jobs SET status='recoverable' WHERE job_id=?1 AND status='queued'",
                params![job_id],
            );
            return Err(RenderError::Task(error));
        }

        let reader = RenderJobReader::new(&conn, job_id)?;
        reader.finish()
    }

    pub fn list(&self, project_path: &str) -> Result<Vec<RenderJobRecord>, RenderError> {
        let root = validate_project(project_path)?;
        let conn = db::open(&root.join("project.db"))?;
        let mut stmt = conn.prepare(
            "SELECT job_id,task_id,project_id,status,format,composition_json,output_relative_path,asset_id,created_at,started_at,completed_at,error
             FROM render_jobs ORDER BY created_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            let composition_json: String = row.get(5)?;
            Ok(RenderJobRecord {
                job_id: row.get(0)?,
                task_id: row.get(1)?,
                project_id: row.get(2)?,
                status: row.get(3)?,
                format: row.get(4)?,
                composition: serde_json::from_str(&composition_json).unwrap_or(Value::Null),
                output_relative_path: row.get(6)?,
                asset_id: row.get(7)?,
                created_at: row.get(8)?,
                started_at: row.get(9)?,
                completed_at: row.get(10)?,
                error: row.get(11)?,
            })
        })?;

        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }
}

fn require_running_status(status: &str) -> Result<(), RenderError> {
    if status == "running" {
        Ok(())
    } else {
        Err(RenderError::InvalidFinishState)
    }
}

fn validate_project(path: &str) -> Result<std::path::PathBuf, RenderError> {
    ProjectManager::default()
        .validated_root(path)
        .map_err(|_| RenderError::InvalidProject)
}

struct RenderJobReader<'a> {
    conn: &'a rusqlite::Connection,
    job_id: &'a str,
    status: String,
    started_at: Option<String>,
}

impl<'a> RenderJobReader<'a> {
    fn new(conn: &'a rusqlite::Connection, job_id: &'a str) -> Result<Self, RenderError> {
        let status = conn.query_row(
            "SELECT status FROM render_jobs WHERE job_id=?1",
            params![job_id],
            |row| row.get(0),
        )?;

        let started_at = conn.query_row(
            "SELECT started_at FROM render_jobs WHERE job_id=?1",
            params![job_id],
            |row| row.get(0),
        )?;

        Ok(Self { conn, job_id, status, started_at })
    }

    fn finish(self) -> Result<RenderJobRecord, RenderError> {
        self.conn.query_row(
            "SELECT job_id,task_id,project_id,status,format,composition_json,output_relative_path,asset_id,created_at,started_at,completed_at,error
             FROM render_jobs WHERE job_id=?1",
            params![self.job_id],
            |row| {
                let composition_json: String = row.get(5)?;
                Ok(RenderJobRecord {
                    job_id: row.get(0)?,
                    task_id: row.get(1)?,
                    project_id: row.get(2)?,
                    status: row.get(3)?,
                    format: row.get(4)?,
                    composition: serde_json::from_str(&composition_json).unwrap_or(Value::Null),
                    output_relative_path: row.get(6)?,
                    asset_id: row.get(7)?,
                    created_at: row.get(8)?,
                    started_at: row.get(9)?,
                    completed_at: row.get(10)?,
                    error: row.get(11)?,
                })
            },
        ).map_err(RenderError::from)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum RenderError {
    #[error("invalid .tamasrazim project")]
    InvalidProject,
    #[error("render job is not queued")]
    InvalidStartState,
    #[error("render job is not running")]
    InvalidFinishState,
    #[error("database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("task error: {0}")]
    Task(#[from] TaskError),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_running_jobs_can_complete() {
        assert!(require_running_status("running").is_ok());
        assert!(matches!(
            require_running_status("queued"),
            Err(RenderError::InvalidFinishState)
        ));
        assert!(matches!(
            require_running_status("completed"),
            Err(RenderError::InvalidFinishState)
        ));
    }
}

