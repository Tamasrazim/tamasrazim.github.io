; NEON VAULT Windows installer
#define AppName "NEON VAULT"
#define AppVersion "4.0"
#define AppPublisher "Tamasrazim"
#define AppExeName "neon_vault.exe"
#define UpdaterExeName "neon_vault_updater.exe"

[Setup]
AppId={{7D7B4D1A-3B65-4C23-B72A-91C4A9F3B7E2}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\NeonVault
DefaultGroupName=NEON VAULT
OutputDir=installer-output
OutputBaseFilename=NEON-VAULT-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\{#AppExeName}
SetupIconFile=neon-vault.ico

[Files]
Source: "build\Release\neon_vault.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\Release\neon_vault_updater.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\NEON VAULT"; Filename: "{app}\{#UpdaterExeName}"
Name: "{group}\NEON VAULT (Direct)"; Filename: "{app}\{#AppExeName}"
Name: "{commondesktop}\NEON VAULT"; Filename: "{app}\{#UpdaterExeName}"

[Run]
Filename: "{app}\{#UpdaterExeName}"; Description: "Launch NEON VAULT"; Flags: nowait postinstall skipifsilent
