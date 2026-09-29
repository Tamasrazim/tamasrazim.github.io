use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoreEvent {
    pub event_id: String,
    pub event_type: String,
    pub created_at: String,
    pub payload: Value,
}

impl CoreEvent {
    pub fn new(event_type: &str, payload: Value) -> Self {
        Self {
            event_id: uuid::Uuid::new_v4().to_string(),
            event_type: event_type.into(),
            created_at: Utc::now().to_rfc3339(),
            payload,
        }
    }
}

#[derive(Default)]
pub struct EventBus;

impl EventBus {
    pub fn publish(&self, app: &AppHandle, event: CoreEvent) -> tauri::Result<()> {
        app.emit("kynestra:event", &event)
    }
}
