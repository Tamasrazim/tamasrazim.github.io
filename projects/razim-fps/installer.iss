; NEON BREACH Windows installer
#define AppName "NEON BREACH"
#define AppVersion "1.0"
#define AppPublisher "Tamasrazim"
#define AppExeName "razim_fps.exe"

[Setup]
AppId={{7D7B4D1A-3B65-4C23-B72A-NEONBREACH001}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\NeonBreach
DefaultGroupName=NEON BREACH
OutputDir=installer-output
OutputBaseFilename=NEON-BREACH-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\{#AppExeName}

[Files]
Source: "build\Release\razim_fps.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\NEON BREACH"; Filename: "{app}\{#AppExeName}"
Name: "{commondesktop}\NEON BREACH"; Filename: "{app}\{#AppExeName}"

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch NEON BREACH"; Flags: nowait postinstall skipifsilent
