pub mod accounts;
pub mod assets;
pub mod db;
pub mod events;
pub mod projects;
pub mod render;
pub mod submissions;
pub mod tasks;

use std::path::PathBuf;

use accounts::AccountService;
use assets::AssetService;
use events::EventBus;
use projects::ProjectManager;
use render::RenderService;
use submissions::SubmissionService;
use tasks::TaskService;

pub struct CoreState {
    pub data_root: PathBuf,
    pub projects: ProjectManager,
    pub tasks: TaskService,
    pub render: RenderService,
    pub assets: AssetService,
    pub accounts: AccountService,
    pub submissions: SubmissionService,
    pub events: EventBus,
}

impl CoreState {
    pub fn new(data_root: PathBuf) -> Self {
        Self {
            data_root,
            projects: ProjectManager::default(),
            tasks: TaskService::default(),
            render: RenderService::default(),
            assets: AssetService::default(),
            accounts: AccountService::default(),
            submissions: SubmissionService::default(),
            events: EventBus::default(),
        }
    }
}
