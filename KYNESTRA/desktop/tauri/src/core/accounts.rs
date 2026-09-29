use super::db;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountRecord {
    pub account_id: String,
    pub platform: String,
    pub display_name: String,
    pub profile_url: Option<String>,
    pub status: String,
    pub credential_ref: Option<String>,
}

#[derive(Default)]
pub struct AccountService;

impl AccountService {
    pub fn create(
        &self,
        project_path: &str,
        platform: &str,
        display_name: &str,
        profile_url: Option<String>,
    ) -> Result<AccountRecord, AccountError> {
        validate_project(project_path)?;
        if platform.trim().is_empty() || display_name.trim().is_empty() {
            return Err(AccountError::InvalidAccount);
        }

        let conn = db::open(&Path::new(project_path).join("project.db"))?;
        let account_id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let profile_url = profile_url.filter(|v| !v.trim().is_empty());

        conn.execute(
            "INSERT INTO platform_accounts (account_id,platform,display_name,profile_url,status,created_at,updated_at)
             VALUES (?1,?2,?3,?4,'unverified',?5,?5)",
            params![
                account_id,
                platform.trim(),
                display_name.trim(),
                profile_url,
                now
            ],
        )?;

        Ok(AccountRecord {
            account_id,
            platform: platform.trim().into(),
            display_name: display_name.trim().into(),
            profile_url,
            status: "unverified".into(),
            credential_ref: None,
        })
    }

    pub fn list(&self, project_path: &str) -> Result<Vec<AccountRecord>, AccountError> {
        validate_project(project_path)?;
        let conn = db::open(&Path::new(project_path).join("project.db"))?;
        let mut stmt = conn.prepare(
            "SELECT account_id,platform,display_name,profile_url,status,credential_ref
             FROM platform_accounts ORDER BY platform,display_name",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(AccountRecord {
                account_id: row.get(0)?,
                platform: row.get(1)?,
                display_name: row.get(2)?,
                profile_url: row.get(3)?,
                status: row.get(4)?,
                credential_ref: row.get(5)?,
            })
        })?;

        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn update_status(
        &self,
        project_path: &str,
        account_id: &str,
        status: &str,
    ) -> Result<AccountRecord, AccountError> {
        validate_status(status)?;
        validate_project(project_path)?;
        let conn = db::open(&Path::new(project_path).join("project.db"))?;

        let changed = conn.execute(
            "UPDATE platform_accounts SET status=?1,updated_at=?2 WHERE account_id=?3",
            params![status, Utc::now().to_rfc3339(), account_id],
        )?;

        if changed != 1 {
            return Err(AccountError::NotFound(account_id.into()));
        }

        conn.query_row(
            "SELECT account_id,platform,display_name,profile_url,status,credential_ref
             FROM platform_accounts WHERE account_id=?1",
            params![account_id],
            |row| {
                Ok(AccountRecord {
                    account_id: row.get(0)?,
                    platform: row.get(1)?,
                    display_name: row.get(2)?,
                    profile_url: row.get(3)?,
                    status: row.get(4)?,
                    credential_ref: row.get(5)?,
                })
            },
        ).map_err(AccountError::from)
    }
}

fn validate_project(path: &str) -> Result<PathBuf, AccountError> {
    let root = Path::new(path);
    if root.extension().and_then(|v| v.to_str()) != Some("tamasrazim")
        || !root.join("project.db").is_file()
    {
        return Err(AccountError::InvalidProject);
    }
    Ok(root.to_path_buf())
}

fn validate_status(status: &str) -> Result<(), AccountError> {
    if matches!(status, "unverified" | "connected" | "disconnected") {
        Ok(())
    } else {
        Err(AccountError::InvalidStatus)
    }
}

    #[test]
    fn unknown_account_returns_not_found() {
        let root = tempfile::tempdir().expect("root");
        let project = root.path().join("accounts.tamasrazim");
        std::fs::create_dir_all(&project).expect("project");
        std::fs::write(
            project.join("manifest.json"),
            r#"{"format":"tamasrazim","formatVersion":"0.1","projectId":"accounts","name":"Accounts","createdBy":"KYNESTRA"}"#,
        ).expect("manifest");
        let conn = db::open(&project.join("project.db")).expect("db");
        conn.execute(
            "INSERT INTO projects (project_id,name,format,format_version,root_path,created_at,updated_at)
             VALUES ('accounts','Accounts','tamasrazim','0.1',?1,'now','now')",
            [project.to_string_lossy().as_ref()],
        ).expect("project row");

        let result = AccountService::default().update_status(
            project.to_str().unwrap(),
            "missing-account",
            "connected",
        );
        assert!(matches!(result, Err(AccountError::NotFound(id)) if id == "missing-account"));
    }

#[derive(Debug, thiserror::Error)]
pub enum AccountError {
    #[error("invalid .tamasrazim project")]
    InvalidProject,
    #[error("invalid account")]
    InvalidAccount,
    #[error("invalid account status")]
    InvalidStatus,
    #[error("account not found: {0}")]
    NotFound(String),
    #[error("database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
}