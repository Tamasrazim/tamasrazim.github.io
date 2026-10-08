; NEO Windows installer
#define AppName "NEO"
#define AppVersion "4.0"
#define AppPublisher "Tamasrazim"
#define AppExeName "neo.exe"
#define UpdaterExeName "neo_updater.exe"

[Setup]
AppId={{7D7B4D1A-3B65-4C23-B72A-91C4A9F3B7E2}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\Neo
DefaultGroupName=NEO
OutputDir=installer-output
OutputBaseFilename=NEO-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\{#AppExeName}
SetupIconFile=neon-vault.ico

[Files]
Source: "build\Release\neo.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\Release\neo_updater.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\assets\images\tamanna-constellation.jpeg"; DestDir: "{app}\assets\sky"; Flags: ignoreversion

[Icons]
Name: "{group}\NEO"; Filename: "{app}\{#UpdaterExeName}"
Name: "{group}\NEO (Direct)"; Filename: "{app}\{#AppExeName}"
Name: "{commondesktop}\NEO"; Filename: "{app}\{#UpdaterExeName}"

[Run]
Filename: "{app}\{#UpdaterExeName}"; Description: "Launch NEO"; Flags: nowait postinstall skipifsilent


[Code]
procedure InitializeWizard;
begin
  WizardForm.Caption := 'NEO // VAULT INSTALLER';
  WizardForm.Color := $080E14;
  WizardForm.Font.Color := clWhite;
  WizardForm.WelcomeLabel1.Caption := 'NEO';
  WizardForm.WelcomeLabel2.Caption := '100 floors. One vault. No shortcuts.';
  WizardForm.NextButton.Caption := 'DEPLOY';
  WizardForm.BackButton.Caption := 'BACK';
  WizardForm.CancelButton.Caption := 'ABORT';
  WizardForm.FinishedLabel.Caption := 'NEO is installed. Enter the vault from the Start Menu or desktop.';
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssInstall then
    WizardForm.StatusLabel.Caption := 'DEPLOYING VAULT SYSTEMS...';
  if CurStep = ssPostInstall then
    WizardForm.StatusLabel.Caption := 'VAULT DEPLOYMENT COMPLETE.';
end;

function InitializeUninstall(): Boolean;
begin
  Result := MsgBox('NEO // UNINSTALL' + #13#10 + #13#10 +
    'Remove the game and installed assets from this PC?',
    mbConfirmation, MB_YESNO) = IDYES;
end;

procedure InitializeUninstallProgressForm;
begin
  UninstallProgressForm.Caption := 'NEO // UNINSTALLER';
  UninstallProgressForm.Color := $080E14;
  UninstallProgressForm.Font.Color := clWhite;
  UninstallProgressForm.StatusLabel.Caption := 'DECOMMISSIONING VAULT SYSTEMS...';
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
    UninstallProgressForm.StatusLabel.Caption := 'REMOVING NEO ASSETS...';
  if CurUninstallStep = usPostUninstall then
    UninstallProgressForm.StatusLabel.Caption := 'VAULT DECOMMISSIONED.';
end;
