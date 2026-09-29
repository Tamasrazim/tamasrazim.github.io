use super::assets::{AssetError, AssetRecord, AssetService};
use serde_json::{json, Map, Value};

#[derive(Default)]
pub struct HandoffService;

impl HandoffService {
    pub fn ingest(
        &self,
        assets: &AssetService,
        project_path: &str,
        source_path: &str,
        module: &str,
        kind: &str,
        metadata: Option<Value>,
    ) -> Result<AssetRecord, AssetError> {
        let mut object = match metadata.unwrap_or_else(|| Value::Object(Map::new())) {
            Value::Object(value) => value,
            _ => Map::new(),
        };

        object.insert("sourceModule".into(), Value::String(module.trim().to_lowercase()));
        object.insert("handoffVersion".into(), Value::String("0.1".into()));

        assets.ingest(
            project_path,
            source_path,
            kind,
            Some(Value::Object(object)),
        )
    }
}
