mod core;

use core::accounts::AccountRecord;
use core::assets::AssetRecord;
use core::events::CoreEvent;
use core::projects::{CreateProjectResult, ProjectSummary};
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
fn update_task(app: AppHandle, project_path: String, task_id: String, status: String, progress: f64, message: Option<String>) -> Result<TaskRecord,String> {
    let state=app.state::<CoreState>();
    let task=state.tasks.update(&project_path,&task_id,&status,progress,message).map_err(|e| e.to_string())?;
    let event_name=match status.as_str(){"completed"=>"task.completed","failed"=>"task.failed","running"=>"task.started",_=>"task.progress"};
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
    let job=state.render.start(&project_path,&job_id).map_err(|e| e.to_string())?;
    let event=CoreEvent::new("render.started",serde_json::to_value(&job).map_err(|e| e.to_string())?);
    state.events.persist(std::path::Path::new(&project_path),&event).map_err(|e| e.to_string())?;
    state.events.publish(&app,event).map_err(|e| e.to_string())?;
    Ok(job)
}

#[tauri::command]
fn complete_render_job(app: AppHandle, project_path: String, job_id: String, source_path: String, kind: String, metadata: Option<serde_json::Value>) -> Result<AssetRecord,String> {
    let state=app.state::<CoreState>();
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

#[derive(serde::Serialize)]
struct CoreStatus { name:String, version:String, status:String }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_root=app.path().app_data_dir()?.join("projects");
            std::fs::create_dir_all(&data_root)?;
            app.manage(CoreState::new(data_root));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            core_status,list_projects,create_project,open_project,create_task,update_task,
            create_render_job,start_render_job,complete_render_job,fail_render_job,
            list_assets,list_render_jobs,list_accounts,create_account,update_account_status,
            list_submissions,set_submission_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running KYNESTRA");
}
