use std::path::Path;

use rusqlite::Connection;

pub const SCHEMA: &str = include_str!("../../../../core/database/schema.sql");

pub fn open(path: &Path) -> Result<Connection, rusqlite::Error> {
    let conn = Connection::open(path)?;
    conn.execute_batch(SCHEMA)?;
    Ok(conn)
}
