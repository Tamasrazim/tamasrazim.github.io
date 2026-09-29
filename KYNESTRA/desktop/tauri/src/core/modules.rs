use serde::{Deserialize, Serialize};
use serde_json::Value;

const SUPPORTED_API_VERSION: &str = "0.1";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleManifest {
    pub id: String,
    pub name: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub version: String,
    #[serde(rename = "apiVersion")]
    pub api_version: String,
    pub entry: String,
    #[serde(rename = "type")]
    pub module_type: String,
    pub capabilities: Vec<String>,
    #[serde(default)]
    pub events: Vec<String>,
    #[serde(default)]
    pub boundaries: Option<Value>,
    #[serde(default)]
    pub dependencies: Option<Value>,
    #[serde(default)]
    #[serde(rename = "handoffCommand")]
    pub handoff_command: Option<String>,
}

#[derive(Default)]
pub struct ModuleRegistry;

impl ModuleRegistry {
    pub fn builtin(&self) -> Result<Vec<ModuleManifest>, ModuleRegistryError> {
        let mut modules = vec![
            parse_manifest(include_str!("../../../../modules/c2m/module.json"))?,
            parse_manifest(include_str!("../../../../modules/forge/module.json"))?,
            parse_manifest(include_str!("../../../../modules/vault/module.json"))?,
        ];

        modules.sort_by(|a, b| a.id.cmp(&b.id));

        for (index, module) in modules.iter().enumerate() {
            if modules.iter().skip(index + 1).any(|other| other.id == module.id) {
                return Err(ModuleRegistryError::DuplicateId(module.id.clone()));
            }
        }

        Ok(modules)
    }
}

fn parse_manifest(content: &str) -> Result<ModuleManifest, ModuleRegistryError> {
    let manifest: ModuleManifest = serde_json::from_str(content)?;
    validate_manifest(&manifest)?;
    Ok(manifest)
}

fn validate_manifest(manifest: &ModuleManifest) -> Result<(), ModuleRegistryError> {
    if manifest.id.is_empty()
        || manifest.id != manifest.id.to_ascii_lowercase()
        || manifest.name.trim().is_empty()
        || manifest.display_name.trim().is_empty()
        || manifest.version.trim().is_empty()
        || manifest.api_version != SUPPORTED_API_VERSION
        || manifest.entry.trim().is_empty()
        || !matches!(manifest.module_type.as_str(), "renderer" | "converter" | "service")
        || manifest.capabilities.is_empty()
    {
        return Err(ModuleRegistryError::InvalidManifest(manifest.id.clone()));
    }

    if manifest.module_type == "service" && manifest.entry != "builtin" {
        return Err(ModuleRegistryError::InvalidManifest(manifest.id.clone()));
    }

    let mut capabilities = std::collections::HashSet::new();
    if manifest.capabilities.iter().any(|value| value.trim().is_empty()
        || !capabilities.insert(value.trim().to_ascii_lowercase()))
    {
        return Err(ModuleRegistryError::InvalidManifest(manifest.id.clone()));
    }

    let mut events = std::collections::HashSet::new();
    if manifest.events.iter().any(|value| value.trim().is_empty()
        || !events.insert(value.trim().to_ascii_lowercase()))
    {
        return Err(ModuleRegistryError::InvalidManifest(manifest.id.clone()));
    }

    Ok(())
}

#[derive(Debug, thiserror::Error)]
pub enum ModuleRegistryError {
    #[error("invalid module manifest: {0}")]
    InvalidManifest(String),
    #[error("duplicate module id: {0}")]
    DuplicateId(String),
    #[error("module manifest JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builtin_modules_validate() {
        let modules = ModuleRegistry::default().builtin().expect("builtin modules");
        assert_eq!(modules.len(), 3);
        assert_eq!(modules.iter().map(|m| m.id.as_str()).collect::<Vec<_>>(), vec!["c2m", "forge", "vault"]);
    }

    #[test]
    fn duplicate_or_blank_capabilities_are_rejected() {
        let mut manifest = ModuleManifest {
            id: "c2m".into(),
            name: "KYNESTRA".into(),
            display_name: "KYNESTRA".into(),
            version: "0.1.0".into(),
            api_version: SUPPORTED_API_VERSION.into(),
            entry: "renderer/index.html".into(),
            module_type: "renderer".into(),
            capabilities: vec!["render".into(), "render".into()],
            events: Vec::new(),
            boundaries: None,
            dependencies: None,
            handoff_command: None,
        };
        assert!(validate_manifest(&manifest).is_err());

        manifest.capabilities = vec!["".into()];
        assert!(validate_manifest(&manifest).is_err());
    }

    #[test]
    fn invalid_service_entry_is_rejected() {
        let manifest = ModuleManifest {
            id: "vault".into(),
            name: "Stock Vault".into(),
            display_name: "Stock Vault".into(),
            version: "0.1.0".into(),
            api_version: SUPPORTED_API_VERSION.into(),
            entry: "renderer/index.html".into(),
            module_type: "service".into(),
            capabilities: vec!["asset-library".into()],
            events: Vec::new(),
            boundaries: None,
            dependencies: None,
            handoff_command: None,
        };

        assert!(matches!(
            validate_manifest(&manifest),
            Err(ModuleRegistryError::InvalidManifest(_))
        ));
    }
}