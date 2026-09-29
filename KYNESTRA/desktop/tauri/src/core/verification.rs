use super::db;
use chrono::Utc;
use reqwest::Client;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicStatusResult {
    pub submission_id: String,
    pub asset_id: String,
    pub filename: String,
    pub checked_url: Option<String>,
    pub public_status: String,
    pub exact_match: bool,
    pub reason: String,
}

#[derive(Default)]
pub struct VerificationService;

impl VerificationService {
    pub async fn check(
        &self,
        project_path: &str,
        submission_id: &str,
    ) -> Result<PublicStatusResult, VerificationError> {
        let root = validate_project(project_path)?;
        let conn = db::open(&root.join("project.db"))?;

        let (asset_id, filename, profile_url, metadata_json): (String, String, Option<String>, String) = conn.query_row(
            "SELECT s.asset_id,a.filename,p.profile_url,s.metadata_json
             FROM submissions s
             JOIN assets a ON a.asset_id=s.asset_id
             LEFT JOIN platform_accounts p ON p.account_id=s.account_id
             WHERE s.submission_id=?1",
            params![submission_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )?;

        let checked_url = profile_url.clone();
        let Some(url) = profile_url else {
            return self.persist(
                &conn,
                submission_id,
                &asset_id,
                &filename,
                None,
                "unknown",
                false,
                "No contributor/profile URL is configured for this submission.",
                metadata_json,
            );
        };

        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent("KYNESTRA/0.1 public-status-check")
            .redirect(reqwest::redirect::Policy::limited(5))
            .build()?;

        let response = match client.get(&url).send().await {
            Ok(value) => value,
            Err(error) => {
                return self.persist(
                    &conn,
                    submission_id,
                    &asset_id,
                    &filename,
                    checked_url,
                    "blocked",
                    false,
                    &format!("Profile fetch failed: {error}"),
                    metadata_json,
                );
            }
        };

        if !response.status().is_success() {
            return self.persist(
                &conn,
                submission_id,
                &asset_id,
                &filename,
                checked_url,
                "blocked",
                false,
                &format!("Profile returned HTTP {}", response.status()),
                metadata_json,
            );
        }

        let body = response.text().await.unwrap_or_default();
        let exact_match = body.contains(&filename);

        let (public_status, reason) = if exact_match {
            (
                "found",
                "Exact filename found in the fetched profile page HTML.",
            )
        } else {
            (
                "not_found",
                "Exact filename was not found in the fetched HTML. A client-rendered page may require a platform-specific connector.",
            )
        };

        self.persist(
            &conn,
            submission_id,
            &asset_id,
            &filename,
            checked_url,
            public_status,
            exact_match,
            reason,
            metadata_json,
        )
    }

    fn persist(
        &self,
        conn: &rusqlite::Connection,
        submission_id: &str,
        asset_id: &str,
        filename: &str,
        checked_url: Option<String>,
        public_status: &str,
        exact_match: bool,
        reason: &str,
        metadata_json: String,
    ) -> Result<PublicStatusResult, VerificationError> {
        let mut metadata: Value = serde_json::from_str(&metadata_json).unwrap_or_else(|_| json!({}));
        if !metadata.is_object() {
            metadata = json!({});
        }

        metadata["publicStatus"] = Value::String(public_status.into());
        metadata["checkedUrl"] = checked_url.clone().map(Value::String).unwrap_or(Value::Null);
        metadata["checker"] = Value::String("exact-html-filename-v1".into());
        metadata["exactMatch"] = Value::Bool(exact_match);

        let now = Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE submissions
             SET last_checked_at=?1,status_reason=?2,metadata_json=?3
             WHERE submission_id=?4",
            params![now, reason, metadata.to_string(), submission_id],
        )?;

        Ok(PublicStatusResult {
            submission_id: submission_id.into(),
            asset_id: asset_id.into(),
            filename: filename.into(),
            checked_url,
            public_status: public_status.into(),
            exact_match,
            reason: reason.into(),
        })
    }
}

fn validate_project(path: &str) -> Result<PathBuf, VerificationError> {
    let root = Path::new(path);
    if root.extension().and_then(|v| v.to_str()) != Some("tamasrazim")
        || !root.join("project.db").is_file()
    {
        return Err(VerificationError::InvalidProject);
    }
    Ok(root.to_path_buf())
}

#[derive(Debug, thiserror::Error)]
pub enum VerificationError {
    #[error("invalid .tamasrazim project")]
    InvalidProject,
    #[error("database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("HTTP client error: {0}")]
    Http(#[from] reqwest::Error),
}