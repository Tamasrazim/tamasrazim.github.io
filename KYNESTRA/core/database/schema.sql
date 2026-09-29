PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'tamasrazim',
  format_version TEXT NOT NULL DEFAULT '0.1',
  root_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS assets (
  asset_id TEXT PRIMARY KEY,
  project_id TEXT,
  kind TEXT NOT NULL,
  filename TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  sha256 TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  project_id TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  progress REAL NOT NULL DEFAULT 0,
  message TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  error TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS platform_accounts (
  account_id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  display_name TEXT NOT NULL,
  profile_url TEXT,
  status TEXT NOT NULL DEFAULT 'unverified',
  credential_ref TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS submissions (
  submission_id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  account_id TEXT,
  status TEXT NOT NULL DEFAULT 'not_submitted',
  submitted_at TEXT,
  last_checked_at TEXT,
  public_url TEXT,
  status_reason TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY(asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES platform_accounts(account_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  delivered_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_submissions_asset ON submissions(asset_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);