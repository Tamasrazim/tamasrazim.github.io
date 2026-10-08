; NEON VAULT — custom Windows installer / uninstaller
#define AppName "NEON VAULT"
#define AppVersion "5.1"
#define AppPublisher "Tamasrazim"
#define AppExeName "neon_vault.exe"
#define UpdaterExeName "neon_vault_updater.exe"

[Setup]
AppId={{7D7B4D1A-3B65-4C23-B72A-91C4A9F3B7E2}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppVerName={#AppName} {#AppVersion}
AppComments=Native Windows x64 100-floor puzzle game by Tamasrazim — fractured-core stability build
AppContact=https://tamasrazim.github.io
DefaultDirName={autopf}\NeonVault
DefaultGroupName=NEON VAULT
OutputDir=installer-output
OutputBaseFilename=NEON-VAULT-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern dynamic polar includetitlebar hidebevels
WizardBackColor=#02060B
WizardBackColorDynamicDark=#010308
WizardSizePercent=115,115
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\neon-vault.ico
UninstallDisplayName=NEON VAULT — Uninstall
VersionInfoDescription=NEON VAULT native Windows x64 puzzle game
VersionInfoProductName=NEON VAULT
VersionInfoProductVersion={#AppVersion}.0
SetupIconFile=neon-vault.ico
Uninstallable=yes
CloseApplications=yes
RestartApplications=no

[Files]
Source: "build\Release\neon_vault.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\Release\neon_vault_updater.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "neon-vault.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\textures\*.bmp"; DestDir: "{app}\assets\textures"; Flags: ignoreversion
Source: "assets\audio\*.wav"; DestDir: "{app}\assets\audio"; Flags: ignoreversion

[UninstallDelete]
Type: files; Name: "{localappdata}\Tamasrazim\NeonVault.cfg"
Type: dirifempty; Name: "{localappdata}\Tamasrazim"

[Icons]
Name: "{group}\NEON VAULT"; Filename: "{app}\{#UpdaterExeName}"
Name: "{group}\NEON VAULT (Direct)"; Filename: "{app}\{#AppExeName}"
Name: "{commondesktop}\NEON VAULT"; Filename: "{app}\{#UpdaterExeName}"

[Run]
Filename: "{app}\{#UpdaterExeName}"; Description: "LAUNCH NEON VAULT"; Flags: nowait postinstall skipifsilent

[Code]
var
  VaultBrand: TNewStaticText;
  VaultTag: TNewStaticText;
  VaultLine: TBevel;
  VaultPanel: TBevel;
  VaultStatus: TNewStaticText;
  UnVaultBrand: TNewStaticText;
  UnVaultTag: TNewStaticText;
  UnVaultPanel: TBevel;
  UnVaultLine: TBevel;
  VaultBuild: TNewStaticText;
  UnVaultStatus: TNewStaticText;

procedure AddInstallChrome;
begin
  VaultPanel := TBevel.Create(WizardForm);
  VaultPanel.Parent := WizardForm;
  VaultPanel.Left := ScaleX(18);
  VaultPanel.Top := ScaleY(18);
  VaultPanel.Width := ScaleX(666);
  VaultPanel.Height := ScaleY(88);
  VaultPanel.Shape := bsBox;

  VaultBrand := TNewStaticText.Create(WizardForm);
  VaultBrand.Parent := WizardForm;
  VaultBrand.Left := ScaleX(34);
  VaultBrand.Top := ScaleY(28);
  VaultBrand.Caption := 'NEON VAULT';
  VaultBrand.Font.Name := 'Segoe UI';
  VaultBrand.Font.Size := 23;
  VaultBrand.Font.Style := [fsBold];
  VaultBrand.Font.Color := clAqua;
  VaultBrand.Transparent := True;

  VaultTag := TNewStaticText.Create(WizardForm);
  VaultTag.Parent := WizardForm;
  VaultTag.Left := ScaleX(36);
  VaultTag.Top := ScaleY(58);
  VaultTag.Caption := 'INSTALL  /  DEPLOY  /  ENTER THE VAULT  /  STABILITY + FRACTURE PASS';
  VaultTag.Font.Name := 'Consolas';
  VaultTag.Font.Size := 9;
  VaultTag.Font.Color := clSilver;
  VaultTag.Transparent := True;

  VaultLine := TBevel.Create(WizardForm);
  VaultLine.Parent := WizardForm;
  VaultLine.Left := ScaleX(34);
  VaultLine.Top := ScaleY(80);
  VaultLine.Width := ScaleX(632);
  VaultLine.Height := ScaleY(1);
  VaultLine.Shape := bsTopLine;

  VaultStatus := TNewStaticText.Create(WizardForm);
  VaultStatus.Parent := WizardForm;
  VaultStatus.Left := ScaleX(36);
  VaultStatus.Top := WizardForm.ClientHeight - ScaleY(38);
  VaultStatus.Caption := 'VAULT CHANNEL  //  READY';
  VaultStatus.Font.Name := 'Consolas';
  VaultStatus.Font.Size := 8;
  VaultStatus.Font.Color := clAqua;
  VaultStatus.Transparent := True;

  VaultBuild := TNewStaticText.Create(WizardForm);
  VaultBuild.Parent := WizardForm;
  VaultBuild.Left := ScaleX(520);
  VaultBuild.Top := ScaleY(28);
  VaultBuild.Caption := '25 MB+  /  30 MATERIAL CORE';
  VaultBuild.Font.Name := 'Consolas';
  VaultBuild.Font.Size := 8;
  VaultBuild.Font.Style := [fsBold];
  VaultBuild.Font.Color := clAqua;
  VaultBuild.Transparent := True;
end;

procedure StyleButtons;
begin
  WizardForm.NextButton.Caption := 'ENTER  ›';
  WizardForm.BackButton.Caption := '‹  BACK';
  WizardForm.CancelButton.Caption := 'ABORT  ×';
  WizardForm.NextButton.Font.Color := clAqua;
  WizardForm.BackButton.Font.Color := clSilver;
  WizardForm.CancelButton.Font.Color := clRed;
end;

procedure InitializeWizard;
begin
  WizardForm.Caption := 'NEON VAULT  •  DEPLOYMENT CONSOLE  //  5.1';
  WizardForm.Color := clBlack;
  WizardForm.CancelButton.Caption := 'ABORT';
  WizardForm.CancelButton.Font.Color := clRed;
  WizardForm.WelcomeLabel1.Caption := 'ENTER THE VAULT  //  INSTALLATION CONSOLE';
  WizardForm.WelcomeLabel1.Font.Color := clAqua;
  WizardForm.WelcomeLabel1.Font.Size := 24;
  WizardForm.WelcomeLabel2.Caption := 'Native Windows x64  •  100 deterministic floors  •  Tamasrazim';
  WizardForm.WelcomeLabel2.Font.Color := clWhite;
  WizardForm.WelcomeLabel2.Caption := 'Native Windows x64  •  100 floors  •  fractured 3D motion  •  Tamasrazim';
  WizardForm.MainPanel.Color := clBlack;
  WizardForm.InnerNotebook.Color := clBlack;
  StyleButtons;
  AddInstallChrome;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if Assigned(VaultStatus) then
  begin
    case CurPageID of
      wpWelcome: VaultStatus.Caption := 'VAULT CHANNEL  //  READY';
      wpSelectDir: VaultStatus.Caption := 'VAULT CHANNEL  //  DESTINATION';
      wpSelectProgramGroup: VaultStatus.Caption := 'VAULT CHANNEL  //  START MENU';
      wpReady: VaultStatus.Caption := 'VAULT CHANNEL  //  ARMED';
      wpInstalling: VaultStatus.Caption := 'VAULT CHANNEL  //  DEPLOYING';
      wpFinished: VaultStatus.Caption := 'VAULT CHANNEL  //  ONLINE';
    else
      VaultStatus.Caption := 'VAULT CHANNEL  //  READY';
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  case CurStep of
    ssInstall: WizardForm.Caption := 'NEON VAULT  •  DEPLOYING';
    ssPostInstall: WizardForm.Caption := 'NEON VAULT  •  READY';
  end;
end;

procedure AddUninstallChrome;
begin
  UnVaultPanel := TBevel.Create(UninstallProgressForm);
  UnVaultPanel.Parent := UninstallProgressForm;
  UnVaultPanel.Left := ScaleX(18);
  UnVaultPanel.Top := ScaleY(16);
  UnVaultPanel.Width := ScaleX(520);
  UnVaultPanel.Height := ScaleY(78);
  UnVaultPanel.Shape := bsBox;

  UnVaultBrand := TNewStaticText.Create(UninstallProgressForm);
  UnVaultBrand.Parent := UninstallProgressForm;
  UnVaultBrand.Left := ScaleX(30);
  UnVaultBrand.Top := ScaleY(24);
  UnVaultBrand.Caption := 'NEON VAULT';
  UnVaultBrand.Font.Name := 'Segoe UI';
  UnVaultBrand.Font.Size := 22;
  UnVaultBrand.Font.Style := [fsBold];
  UnVaultBrand.Font.Color := clAqua;
  UnVaultBrand.Transparent := True;

  UnVaultTag := TNewStaticText.Create(UninstallProgressForm);
  UnVaultTag.Parent := UninstallProgressForm;
  UnVaultTag.Left := ScaleX(32);
  UnVaultTag.Top := ScaleY(53);
  UnVaultTag.Caption := 'VAULT EVACUATION  //  REMOVE GAME FILES  //  CLEAN EXIT';
  UnVaultTag.Font.Name := 'Consolas';
  UnVaultTag.Font.Size := 9;
  UnVaultTag.Font.Color := clSilver;
  UnVaultTag.Transparent := True;

  UnVaultLine := TBevel.Create(UninstallProgressForm);
  UnVaultLine.Parent := UninstallProgressForm;
  UnVaultLine.Left := ScaleX(32);
  UnVaultLine.Top := ScaleY(75);
  UnVaultLine.Width := ScaleX(490);
  UnVaultLine.Height := ScaleY(1);
  UnVaultLine.Shape := bsTopLine;

  UnVaultStatus := TNewStaticText.Create(UninstallProgressForm);
  UnVaultStatus.Parent := UninstallProgressForm;
  UnVaultStatus.Left := ScaleX(32);
  UnVaultStatus.Top := ScaleY(104);
  UnVaultStatus.Caption := 'VAULT CHANNEL  //  READY TO EXIT';
  UnVaultStatus.Font.Name := 'Consolas';
  UnVaultStatus.Font.Size := 8;
  UnVaultStatus.Font.Color := clAqua;
  UnVaultStatus.Transparent := True;
end;

function InitializeUninstall(): Boolean;
begin
  UninstallProgressForm.Caption := 'NEON VAULT  •  UNINSTALL CONSOLE';
  UninstallProgressForm.Color := clBlack;
  UninstallProgressForm.StatusLabel.Font.Color := clAqua;
  UninstallProgressForm.StatusLabel.Caption := 'EVACUATING VAULT FILES...';
  UninstallProgressForm.PageNameLabel.Font.Color := clAqua;
  UninstallProgressForm.PageDescriptionLabel.Font.Color := clWhite;
  UninstallProgressForm.MainPanel.Color := clBlack;
  UninstallProgressForm.CancelButton.Caption := 'ABORT';
  UninstallProgressForm.CancelButton.Font.Color := clRed;
  UninstallProgressForm.StatusLabel.Caption := 'EVACUATING VAULT FILES...';
  AddUninstallChrome;
  Result := True;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  case CurUninstallStep of
    usUninstall:
      begin
        UninstallProgressForm.Caption := 'NEON VAULT  •  PURGING';
        UninstallProgressForm.StatusLabel.Caption := 'PURGING GAME INSTALLATION...';
        if Assigned(UnVaultStatus) then UnVaultStatus.Caption := 'VAULT CHANNEL  //  PURGING';
      end;
    usPostUninstall:
      begin
        UninstallProgressForm.Caption := 'NEON VAULT  •  COMPLETE';
        UninstallProgressForm.StatusLabel.Caption := 'VAULT EVACUATED  //  COMPLETE';
        if Assigned(UnVaultStatus) then UnVaultStatus.Caption := 'VAULT CHANNEL  //  COMPLETE';
      end;
  end;
end;
