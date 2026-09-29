use super::db;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmissionRecord {
    pub submission_id: String,
    pub asset_id: String,
    pub filename: String,
    pub account_id: Option<String>,
    pub platform: Option<String>,
    pub account_name: Option<String>,
    pub status: String,
    pub submitted_at: Option<String>,
    pub last_checked_at: Option<String>,
    pub public_url: Option<String>,
    pub status_reason: Option<String>,
}

#[derive(Default)]
pub struct SubmissionService;

impl SubmissionService {
    pub fn set_status(
        &self,
        project_path: &str,
        asset_id: &str,
        account_id: Option<String>,
        status: &str,
        public_url: Option<String>,
        reason: Option<String>,
    ) -> Result<SubmissionRecord, SubmissionError> {
        validate_project(project_path)?;
        validate_status(status)?;
        let conn = db::open(&Path::new(project_path).join("project.db"))?;

        let account = account_id.unwrap_or_default();
        let now = Utc::now().to_rfc3339();

        let existing: Result<String, rusqlite::Error> = conn.query_row(
            "SELECT submission_id FROM submissions
             WHERE asset_id=?1 AND account_id=CASE WHEN ?2='' THEN NULL ELSE ?2 END
             LIMIT 1",
            params![asset_id, account],
            |row| row.get(0),
        );

        let submission_id = match existing {
            Ok(id) => {
                conn.execute(
                    "UPDATE submissions
                     SET status=?1,submitted_at=CASE WHEN ?1='submitted' AND submitted_at IS NULL THEN ?2 ELSE submitted_at END,
                         last_checked_at=?2,public_url=?3,status_reason=?4
                     WHERE submission_id=?5",
                    params![status, now, public_url, reason, id],
                )?;
                id
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                let id = uuid::Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO submissions
                     (submission_id,asset_id,account_id,status,submitted_at,last_checked_at,public_url,status_reason)
                     VALUES (?1,?2,CASE WHEN ?3='' THEN NULL ELSE ?3 END,?4,
                             CASE WHEN ?4='submitted' THEN ?5 ELSE NULL END,?5,?6,?7)",
                    params![id, asset_id, account, status, now, public_url, reason],
                )?;
                id
            }
            Err(error) => return Err(SubmissionError::Sqlite(error)),
        };

        self.get_one(&conn, &submission_id)
    }

    pub fn list(&self, project_path: &str) -> Result<Vec<SubmissionRecord>, SubmissionError> {
        validate_project(project_path)?;
        let conn = db::open(&Path::new(project_path).join("project.db"))?;
        let mut stmt = conn.prepare(
            "SELECT s.submission_id,s.asset_id,a.filename,s.account_id,p.platform,p.display_name,
                    s.status,s.submitted_at,s.last_checked_at,s.public_url,s.status_reason
             FROM submissions s
             JOIN assets a ON a.asset_id=s.asset_id
             LEFT JOIN platform_accounts p ON p.account_id=s.account_id
             ORDER BY s.last_checked_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(SubmissionRecord {
                submission_id: row.get(0)?,
                asset_id: row.get(1)?,
                filename: row.get(2)?,
                account_id: row.get(3)?,
                platform: row.get(4)?,
                account_name: row.get(5)?,
                status: row.get(6)?,
                submitted_at: row.get(7)?,
                last_checked_at: row.get(8)?,
                public_url: row.get(9)?,
                status_reason: row.get(10)?,
            })
        })?;

        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    fn get_one(&self, conn: &rusqlite::Connection, id: &str) -> Result<SubmissionRecord, SubmissionError> {
        conn.query_row(
            "SELECT s.submission_id,s.asset_id,a.filename,s.account_id,p.platform,p.display_name,
                    s.status,s.submitted_at,s.last_checked_at,s.public_url,s.status_reason
             FROM submissions s
             JOIN assets a ON a.asset_id=s.asset_id
             LEFT JOIN platform_accounts p ON p.account_id=s.account_id
             WHERE s.submission_id=?1",
            params![id],
            |row| {
                Ok(SubmissionRecord {
                    submission_id: row.get(0)?,
                    asset_id: row.get(1)?,
                    filename: row.get(2)?,
                    account_id: row.get(3)?,
                    platform: row.get(4)?,
                    account_name: row.get(5)?,
                    status: row.get(6)?,
                    submitted_at: row.get(7)?,
                    last_checked_at: row.get(8)?,
                    public_url: row.get(9)?,
                    status_reason: row.get(10)?,
                })
            },
        ).map_err(SubmissionError::from)
    }
}

fn validate_project(path: &str) -> Result<PathBuf, SubmissionError> {
    let root = Path::new(path);
    if root.extension().and_then(|v| v.to_str()) != Some("tamasrazim")
        || !root.join("project.db").is_file()
    {
        return Err(SubmissionError::InvalidProject);
    }
    Ok(root.to_path_buf())
}

fn validate_status(status: &str) -> Result<(), SubmissionError> {
    if matches!(status, "not_submitted" | "submitted" | "pending" | "approved" | "rejected" | "unknown") {
        Ok(())
    } else {
        Err(SubmissionError::InvalidStatus);
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SubmissionError {
    #[error("invalid .tamasrazim project")]
    InvalidProject,
    #[error("invalid submission status")]
    InvalidStatus,
    #[error("database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
}