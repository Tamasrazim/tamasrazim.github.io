mod core;

use core::accounts::AccountRecord;
use core::assets::AssetRecord;
use core::events::CoreEvent;
use core::projects::{CreateProjectResult, ProjectSummary};
use core::modules::ModuleManifest;
use core::render::RenderJobRecord;
use core::submissions::SubmissionRecord;
use core::tasks::TaskRecord;
use core::CoreState;
use tauri::{AppHandle, Manager};

#[tauri::command]
fn core_status() -> CoreStatus {
    CoreStatus { name: "KYNESTRA CORE".into(), version: env!("CARGO_PKG_VERSION").into(), status: "online".into() }
}

#[tauri::command]
fn list_modules(app: AppHandle) -> Vec<ModuleManifest> {
    app.state::<CoreState>().modules.clone()
}

#[tauri::command]
fn list_projects(app: AppHandle) -> Result<Vec<ProjectSummary>, String> {
    app.state::<CoreState>().projects.list(&app.state::<CoreState>().data_root).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_project(app: AppHandle, name: String) -> Result<CreateProjectResult, String> {
    let state = app.state::<CoreState>();
    let result = state.projects.create(&state.data_root, &name).map_err(|e| e.to_string())?;
    let event = CoreEvent::new("project.created", serde_json::json!({"projectId":result.project.project_id,"name":result.project.name,"path":result.project.path}));
    state.events.persist(std::path::Path::new(&result.project.path), &event).map_err(|e| e.to_string())?;
    state.events.publish(&app, event).map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn open_project(app: AppHandle, path: String) -> Result<ProjectSummary, String> {
    let state = app.state::<CoreState>();
    let result = state.projects.open(&path).map_err(|e| e.to_string())?;
    let event = CoreEvent::new("project.opened", serde_json::json!({"projectId":result.project_id,"path":result.path}));
    state.events.persist(std::path::Path::new(&result.path), &event).map_err(|e| e.to_string())?;
    state.events.publish(&app, event).map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn create_task(app: AppHandle, project_path: String, task_type: String, payload: Option<serde_json::Value>) -> Result<TaskRecord, String> {
    let state = app.state::<CoreState>();
    let task = state.tasks.create(&project_path,&task_type,payload).map_err(|e| e.to_string())?;
    let event=CoreEvent::new("task.created",serde_json::to_value(&task).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path),&event).map_err(|e| e.to_string())?;
    state.events.publish(&app,event).map_err(|e| e.to_string())?;
    Ok(task)
}

#[tauri::command]
fn list_tasks(app: AppHandle, project_path: String) -> Result<Vec<TaskRecord>, String> {
    app.state::<CoreState>().tasks.list(&project_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_task(app: AppHandle, project_path: String, task_id: String, status: String, progress: f64, message: Option<String>) -> Result<TaskRecord,String> {
    let state=app.state::<CoreState>();
    let task=state.tasks.update(&project_path,&task_id,&status,progress,message).map_err(|e| e.to_string())?;
    let event_name=match status.as_str() {
        "completed"=>"task.completed",
        "failed"=>"task.failed",
        "running"=>"task.started",
        "cancelled"=>"task.cancelled",
        "recoverable"=>"task.recovered",
        _=>"task.progress"
    };
    let event=CoreEvent::new(event_name,serde_json::to_value(&task).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path),&event).map_err(|e| e.to_string())?;
    state.events.publish(&app,event).map_err(|e| e.to_string())?;
    Ok(task)
}

#[tauri::command]
fn create_render_job(app: AppHandle, project_path: String, format: String, composition: serde_json::Value) -> Result<RenderJobRecord,String> {
    let state=app.state::<CoreState>();
    let job=state.render.create(&project_path,&format,composition,&state.tasks).map_err(|e| e.to_string())?;
    let event=CoreEvent::new("task.created",serde_json::json!({"taskId":job.task_id,"type":"render","projectId":job.project_id,"jobId":job.job_id}));
    state.events.persist(std::path::Path::new(&project_path),&event).map_err(|e| e.to_string())?;
    state.events.publish(&app,event).map_err(|e| e.to_string())?;
    Ok(job)
}

#[tauri::command]
fn start_render_job(app: AppHandle, project_path: String, job_id: String) -> Result<RenderJobRecord,String> {
    let state=app.state::<CoreState>();
    let job=state.render.start(&project_path,&job_id,&state.tasks).map_err(|e| e.to_string())?;
    let event=CoreEvent::new("render.started",serde_json::to_value(&job).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path),&event).map_err(|e| e.to_string())?;
    state.events.publish(&app,event).map_err(|e| e.to_string())?;
    Ok(job)
}

#[tauri::command]
fn complete_render_job(app: AppHandle, project_path: String, job_id: String, source_path: String, kind: String, metadata: Option<serde_json::Value>) -> Result<AssetRecord,String> {
    let state=app.state::<CoreState>();
    state.render.ensure_running(&project_path,&job_id).map_err(|e| e.to_string())?;
    let asset=state.assets.ingest(&project_path,&source_path,&kind,metadata).map_err(|e| e.to_string())?;
    let job=state.render.attach_asset(&project_path,&job_id,&asset.asset_id,&asset.relative_path,&state.tasks).map_err(|e| e.to_string())?;
    let imported=CoreEvent::new("asset.imported",serde_json::to_value(&asset).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path),&imported).map_err(|e| e.to_string())?;
    state.events.publish(&app,imported).map_err(|e| e.to_string())?;
    let completed=CoreEvent::new("render.completed",serde_json::json!({"job":job,"asset":asset}));
    state.events.persist(std::path::Path::new(&project_path),&completed).map_err(|e| e.to_string())?;
    state.events.publish(&app,completed).map_err(|e| e.to_string())?;
    Ok(asset)
}

#[tauri::command]
fn recover_render_job(app: AppHandle, project_path: String, job_id: String) -> Result<RenderJobRecord,String> {
    let state=app.state::<CoreState>();
    let job=state.render.recover(&project_path,&job_id,&state.tasks).map_err(|e| e.to_string())?;
    let event=CoreEvent::new("task.recovered",serde_json::to_value(&job).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path),&event).map_err(|e| e.to_string())?;
    state.events.publish(&app,event).map_err(|e| e.to_string())?;
    Ok(job)
}

#[tauri::command]
fn fail_render_job(app: AppHandle, project_path: String, job_id: String, error: String) -> Result<RenderJobRecord,String> {
    let state=app.state::<CoreState>();
    let job=state.render.fail(&project_path,&job_id,&error,&state.tasks).map_err(|e| e.to_string())?;
    let event=CoreEvent::new("render.failed",serde_json::to_value(&job).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path),&event).map_err(|e| e.to_string())?;
    state.events.publish(&app,event).map_err(|e| e.to_string())?;
    Ok(job)
}

#[tauri::command]
fn list_assets(app: AppHandle, project_path: String) -> Result<Vec<AssetRecord>,String> { app.state::<CoreState>().assets.list(&project_path).map_err(|e| e.to_string()) }

#[tauri::command]
fn list_render_jobs(app: AppHandle, project_path: String) -> Result<Vec<RenderJobRecord>,String> { app.state::<CoreState>().render.list(&project_path).map_err(|e| e.to_string()) }

#[tauri::command]
fn list_accounts(app: AppHandle, project_path: String) -> Result<Vec<AccountRecord>,String> { app.state::<CoreState>().accounts.list(&project_path).map_err(|e| e.to_string()) }

#[tauri::command]
fn create_account(app: AppHandle, project_path: String, platform: String, display_name: String, profile_url: Option<String>) -> Result<AccountRecord,String> {
    let state=app.state::<CoreState>();
    let account=state.accounts.create(&project_path,&platform,&display_name,profile_url).map_err(|e| e.to_string())?;
    let event=CoreEvent::new("account.connected",serde_json::to_value(&account).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path),&event).map_err(|e| e.to_string())?;
    state.events.publish(&app,event).map_err(|e| e.to_string())?;
    Ok(account)
}

#[tauri::command]
fn update_account_status(app: AppHandle, project_path: String, account_id: String, status: String) -> Result<AccountRecord,String> {
    let state=app.state::<CoreState>();
    let account=state.accounts.update_status(&project_path,&account_id,&status).map_err(|e| e.to_string())?;
    let event_type=if status=="connected"{"account.connected"}else if status=="disconnected"{"account.disconnected"}else{"account.updated"};
    let event=CoreEvent::new(event_type,serde_json::to_value(&account).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path),&event).map_err(|e| e.to_string())?;
    state.events.publish(&app,event).map_err(|e| e.to_string())?;
    Ok(account)
}

#[tauri::command]
fn list_submissions(app: AppHandle, project_path: String) -> Result<Vec<SubmissionRecord>,String> { app.state::<CoreState>().submissions.list(&project_path).map_err(|e| e.to_string()) }

#[tauri::command]
fn set_submission_status(app: AppHandle, project_path: String, asset_id: String, account_id: Option<String>, status: String, public_url: Option<String>, reason: Option<String>) -> Result<SubmissionRecord,String> {
    let state=app.state::<CoreState>();
    let submission=state.submissions.set_status(&project_path,&asset_id,account_id,&status,public_url,reason).map_err(|e| e.to_string())?;
    let event=CoreEvent::new("submission.updated",serde_json::to_value(&submission).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path),&event).map_err(|e| e.to_string())?;
    state.events.publish(&app,event).map_err(|e| e.to_string())?;
    Ok(submission)
}

#[tauri::command]
fn ingest_module_output(
    app: AppHandle,
    project_path: String,
    source_path: String,
    module: String,
    kind: String,
    metadata: Option<serde_json::Value>,
) -> Result<AssetRecord, String> {
    let state = app.state::<CoreState>();
    let asset = state
        .handoff
        .ingest(&state.assets, &project_path, &source_path, &module, &kind, metadata)
        .map_err(|e| e.to_string())?;

    let event = CoreEvent::new("asset.imported", serde_json::to_value(&asset).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path), &event).map_err(|e| e.to_string())?;
    state.events.publish(&app, event).map_err(|e| e.to_string())?;

    Ok(asset)
}

#[tauri::command]
fn export_project_package(
    app: AppHandle,
    project_path: String,
    output_path: String,
) -> Result<core::package::PackageManifest, String> {
    let state = app.state::<CoreState>();
    let result = state.package.export(&project_path, &output_path).map_err(|e| e.to_string())?;
    let event = CoreEvent::new("project.exported", serde_json::json!({
        "projectId": result.project_id,
        "name": result.name,
        "outputPath": output_path,
        "files": result.files.len()
    }));
    state.events.persist(std::path::Path::new(&project_path), &event).map_err(|e| e.to_string())?;
    state.events.publish(&app, event).map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn import_project_package(
    app: AppHandle,
    package_path: String,
) -> Result<core::package::ImportResult, String> {
    let state = app.state::<CoreState>();
    let result = state.package.import(&package_path, &state.data_root).map_err(|e| e.to_string())?;
    let opened = state.projects.open(&result.project_path).map_err(|e| e.to_string())?;
    let event = CoreEvent::new("project.imported", serde_json::json!({
        "projectId": opened.project_id,
        "name": opened.name,
        "path": opened.path,
        "filesVerified": result.files_verified
    }));
    state.events.persist(std::path::Path::new(&opened.path), &event).map_err(|e| e.to_string())?;
    state.events.publish(&app, event).map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
async fn check_submission_public_status(
    app: AppHandle,
    project_path: String,
    submission_id: String,
) -> Result<core::verification::PublicStatusResult, String> {
    let state = app.state::<CoreState>();
    let result = state.verification.check(&project_path, &submission_id).await.map_err(|e| e.to_string())?;
    let event = CoreEvent::new("submission.updated", serde_json::to_value(&result).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path), &event).map_err(|e| e.to_string())?;
    state.events.publish(&app, event).map_err(|e| e.to_string())?;
    Ok(result)
}

#[derive(serde::Serialize)]
struct CoreStatus { name:String, version:String, status:String }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_root=app.path().app_data_dir()?.join("projects");
            std::fs::create_dir_all(&data_root)?;
            let state = CoreState::new(data_root.clone())
                .map_err(|e| Box::<dyn std::error::Error>::from(e))?;
            state.tasks.recover_all(&data_root).map_err(|e| Box::<dyn std::error::Error>::from(e))?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            core_status,list_modules,list_projects,create_project,open_project,create_task,list_tasks,update_task,
            create_render_job,start_render_job,recover_render_job,complete_render_job,fail_render_job,
            list_assets,list_render_jobs,list_accounts,create_account,update_account_status,
            list_submissions,set_submission_status,check_submission_public_status,export_project_package,import_project_package,ingest_module_output
        ])
        .run(tauri::generate_context!())
        .expect("error while running KYNESTRA");
}
