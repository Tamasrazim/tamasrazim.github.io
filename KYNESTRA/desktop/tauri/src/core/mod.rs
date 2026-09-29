pub mod accounts;
pub mod batch;
pub mod assets;
pub mod db;
pub mod events;
pub mod package;
pub mod projects;
pub mod handoff;
pub mod modules;
pub mod render;
pub mod submissions;
pub mod tasks;
pub mod verification;

use std::path::PathBuf;

use accounts::AccountService;
use handoff::HandoffService;
use modules::ModuleRegistry;
use assets::AssetService;
use events::EventBus;
use package::PackageService;
use projects::ProjectManager;
use render::RenderService;
use submissions::SubmissionService;
use tasks::TaskService;
use verification::VerificationService;

pub struct CoreState {
    pub data_root: PathBuf,
    pub projects: ProjectManager,
    pub tasks: TaskService,
    pub render: RenderService,
    pub assets: AssetService,
    pub accounts: AccountService,
    pub handoff: HandoffService,
    pub submissions: SubmissionService,
    pub verification: VerificationService,
    pub package: PackageService,
    pub modules: Vec<modules::ModuleManifest>,
    pub events: EventBus,
}

impl CoreState {
    pub fn new(data_root: PathBuf) -> Result<Self, modules::ModuleRegistryError> {
        let modules = ModuleRegistry::default().builtin()?;

        Ok(Self {
            data_root,
            projects: ProjectManager::default(),
            tasks: TaskService::default(),
            render: RenderService::default(),
            assets: AssetService::default(),
            accounts: AccountService::default(),
            handoff: HandoffService::default(),
            submissions: SubmissionService::default(),
            verification: VerificationService::default(),
            package: PackageService::default(),
            modules,
            events: EventBus::default(),
        })
    }
}
