mod core;

use core::events::CoreEvent;
use core::projects::{CreateProjectResult, ProjectSummary};
use core::tasks::TaskRecord;
use core::CoreState;
use tauri::{AppHandle, Manager};

#[tauri::command]
fn core_status() -> CoreStatus {
    CoreStatus {
        name: "KYNESTRA CORE".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        status: "online".into(),
    }
}

#[tauri::command]
fn list_projects(app: AppHandle) -> Result<Vec<ProjectSummary>, String> {
    let state = app.state::<CoreState>();
    state.projects.list(&state.data_root).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_project(app: AppHandle, name: String) -> Result<CreateProjectResult, String> {
    let state = app.state::<CoreState>();
    let result = state.projects.create(&state.data_root, &name).map_err(|e| e.to_string())?;
    let event = CoreEvent::new("project.created", serde_json::json!({
        "projectId": result.project.project_id,
        "name": result.project.name,
        "path": result.project.path
    }));
    state.events.persist(std::path::Path::new(&result.project.path), &event).map_err(|e| e.to_string())?;
    state.events.publish(&app, event).map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn open_project(app: AppHandle, path: String) -> Result<ProjectSummary, String> {
    let state = app.state::<CoreState>();
    let result = state.projects.open(&path).map_err(|e| e.to_string())?;
    let event = CoreEvent::new("project.opened", serde_json::json!({
        "projectId": result.project_id,
        "path": result.path
    }));
    state.events.persist(std::path::Path::new(&result.path), &event).map_err(|e| e.to_string())?;
    state.events.publish(&app, event).map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn create_task(app: AppHandle, project_path: String, task_type: String, payload: Option<serde_json::Value>) -> Result<TaskRecord, String> {
    let state = app.state::<CoreState>();
    let task = state.tasks.create(&project_path, &task_type, payload).map_err(|e| e.to_string())?;
    let event = CoreEvent::new("task.created", serde_json::to_value(&task).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path), &event).map_err(|e| e.to_string())?;
    state.events.publish(&app, event).map_err(|e| e.to_string())?;
    Ok(task)
}

#[tauri::command]
fn update_task(app: AppHandle, project_path: String, task_id: String, status: String, progress: f64, message: Option<String>) -> Result<TaskRecord, String> {
    let state = app.state::<CoreState>();
    let task = state.tasks.update(&project_path, &task_id, &status, progress, message).map_err(|e| e.to_string())?;
    let event_name = match status.as_str() {
        "completed" => "task.completed",
        "failed" => "task.failed",
        "running" => "task.started",
        _ => "task.progress"
    };
    let event = CoreEvent::new(event_name, serde_json::to_value(&task).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path), &event).map_err(|e| e.to_string())?;
    state.events.publish(&app, event).map_err(|e| e.to_string())?;
    Ok(task)
}

#[derive(serde::Serialize)]
struct CoreStatus {
    name: String,
    version: String,
    status: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_root = app.path().app_data_dir()?.join("projects");
            std::fs::create_dir_all(&data_root)?;
            app.manage(CoreState::new(data_root));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![core_status,list_projects,create_project,open_project,create_task,update_task])
        .run(tauri::generate_context!())
        .expect("error while running KYNESTRA");
}