#define ProductName "TRILYVA"
#ifndef AppVersion
  #define AppVersion "0.1.0"
#endif
#ifndef AppExe
  #define AppExe "..\..\target\release\trilyva-native.exe"
#endif

[Setup]
AppId={{4A5E7F31-6B48-4F0C-9D6C-70A900000001}
AppName={#ProductName}
AppVersion={#AppVersion}
AppPublisher=Tamasrazim
AppPublisherURL=https://tamasrazim.github.io/projects/trilyva/
DefaultDirName={autopf}\TRILYVA
DefaultGroupName=TRILYVA
UninstallDisplayIcon={app}\trilyva-native.exe
SetupIconFile=..\..\assets\trilyva.ico
OutputDir=..\..\..\..\artifacts
OutputBaseFilename=TRILYVA-Setup-x64
ArchitecturesInstallIn64BitMode=x64
ArchitecturesAllowed=x64
PrivilegesRequired=lowest
WizardStyle=modern dark
Compression=lzma2
SolidCompression=yes
DisableProgramGroupPage=yes
CloseApplications=yes
RestartApplications=no
Uninstallable=yes
UsePreviousAppDir=yes
SetupLogging=yes

[Files]
Source: "{#AppExe}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\assets\trilyva.png"; DestDir: "{app}\assets"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\TRILYVA"; Filename: "{app}\trilyva-native.exe"; IconFilename: "{app}\trilyva-native.exe"
Name: "{autodesktop}\TRILYVA"; Filename: "{app}\trilyva-native.exe"; IconFilename: "{app}\trilyva-native.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; Flags: unchecked

[Run]
Filename: "{app}\trilyva-native.exe"; Description: "Launch TRILYVA"; Flags: postinstall nowait skipifsilent
