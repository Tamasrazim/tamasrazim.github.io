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

[Icons]
Name: "{group}\NEO"; Filename: "{app}\{#UpdaterExeName}"
Name: "{group}\NEO (Direct)"; Filename: "{app}\{#AppExeName}"
Name: "{commondesktop}\NEO"; Filename: "{app}\{#UpdaterExeName}"

[Run]
Filename: "{app}\{#UpdaterExeName}"; Description: "Launch NEO"; Flags: nowait postinstall skipifsilent

; The constellation sky artwork is shared from the repository site asset set.
[Files]
Source: "..\..\assets\images\tamanna-constellation.jpeg"; DestDir: "{app}\assets\sky"; Flags: ignoreversion
