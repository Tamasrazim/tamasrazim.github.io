; NEON VAULT Windows installer
#define AppName "NEON VAULT"
#define AppVersion "4.1"
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
WizardStyle=modern dynamic polar includetitlebar hidebevels
WizardBackColor=#03080D
WizardBackColorDynamicDark=#02050A
WizardSizePercent=115,115
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\neon-vault.ico
UninstallDisplayName=NEON VAULT — Uninstall
SetupIconFile=neon-vault.ico

[Files]
Source: "build\Release\neon_vault.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\Release\neon_vault_updater.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "neon-vault.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\NEON VAULT"; Filename: "{app}\{#UpdaterExeName}"
Name: "{group}\NEON VAULT (Direct)"; Filename: "{app}\{#AppExeName}"
Name: "{commondesktop}\NEON VAULT"; Filename: "{app}\{#UpdaterExeName}"

[Run]
Filename: "{app}\{#UpdaterExeName}"; Description: "Launch NEON VAULT"; Flags: nowait postinstall skipifsilent

var
  VaultBrand: TNewStaticText;
  VaultTag: TNewStaticText;
  VaultLine: TBevel;

procedure InitializeWizard;
begin
  WizardForm.Caption := 'NEON VAULT • INSTALL';
  WizardForm.NextButton.Caption := 'ENTER';
  WizardForm.BackButton.Caption := 'BACK';
  WizardForm.CancelButton.Caption := 'ABORT';
  WizardForm.Color := clBlack;
  WizardForm.WelcomeLabel1.Caption := 'ENTER THE VAULT';
  WizardForm.WelcomeLabel1.Font.Color := clAqua;
  WizardForm.WelcomeLabel1.Font.Size := 24;
  WizardForm.WelcomeLabel2.Caption := 'NEON VAULT  •  native Windows x64  •  100-floor expedition';
  WizardForm.WelcomeLabel2.Font.Color := clWhite;

  VaultBrand := TNewStaticText.Create(WizardForm);
  VaultBrand.Parent := WizardForm;
  VaultBrand.Left := ScaleX(32);
  VaultBrand.Top := ScaleY(28);
  VaultBrand.Caption := 'NEON VAULT';
  VaultBrand.Font.Name := 'Segoe UI';
  VaultBrand.Font.Size := 22;
  VaultBrand.Font.Style := [fsBold];
  VaultBrand.Font.Color := clAqua;
  VaultBrand.Transparent := True;

  VaultTag := TNewStaticText.Create(WizardForm);
  VaultTag.Parent := WizardForm;
  VaultTag.Left := ScaleX(34);
  VaultTag.Top := ScaleY(57);
  VaultTag.Caption := 'INSTALL  •  LAUNCH  •  EXPLORE';
  VaultTag.Font.Name := 'Consolas';
  VaultTag.Font.Size := 9;
  VaultTag.Font.Color := clSilver;
  VaultTag.Transparent := True;

  VaultLine := TBevel.Create(WizardForm);
  VaultLine.Parent := WizardForm;
  VaultLine.Left := ScaleX(32);
  VaultLine.Top := ScaleY(82);
  VaultLine.Width := ScaleX(620);
  VaultLine.Height := ScaleY(1);
  VaultLine.Shape := bsTopLine;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssInstall then
    WizardForm.Caption := 'NEON VAULT • DEPLOYING';
  if CurStep = ssPostInstall then
    WizardForm.Caption := 'NEON VAULT • READY';
end;

function InitializeUninstall(): Boolean;
begin
  UninstallProgressForm.Caption := 'NEON VAULT • UNINSTALL';
  UninstallProgressForm.Color := clBlack;
  UninstallProgressForm.StatusLabel.Font.Color := clAqua;
  UninstallProgressForm.StatusLabel.Caption := 'EVACUATING VAULT FILES...';
  UninstallProgressForm.PageNameLabel.Font.Color := clAqua;
  UninstallProgressForm.PageDescriptionLabel.Font.Color := clWhite;
  Result := True;
end;
