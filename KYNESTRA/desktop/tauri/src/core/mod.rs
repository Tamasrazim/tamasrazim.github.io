pub mod db;
pub mod events;
pub mod projects;
pub mod tasks;

use std::path::PathBuf;

use events::EventBus;
use projects::ProjectManager;
use tasks::TaskService;

pub struct CoreState {
    pub data_root: PathBuf,
    pub projects: ProjectManager,
    pub tasks: TaskService,
    pub events: EventBus,
}

impl CoreState {
    pub fn new(data_root: PathBuf) -> Self {
        Self {
            data_root,
            projects: ProjectManager::default(),
            tasks: TaskService::default(),
            events: EventBus::default(),
        }
    }
}
