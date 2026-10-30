; ==============================================================================
; CEPRO_MICAELA 2.0 — Script de Instalación Profesional Windows (Inno Setup 6)
; Tarea 41A — Eliminación de Fuga de Secreto (CRIT-41-01), CSP y Preservación de Datos
; ==============================================================================

#define MyAppName "CEPRO_MICAELA 2.0"
#define MyAppVersion "2.0.2"
#define MyAppPublisher "CETPRO Micaela Bastidas"
#define MyAppExeName "CEPRO_MICAELA_2.0.exe"
#define MySourceDir "C:\CETPRO\CETPRO_MODERNIZACION_V2\release\CEPRO_MICAELA_2.0-win32-x64"
#define MyOutputDir "C:\CETPRO\CETPRO_MODERNIZACION_V2\release"

[Setup]
; Identificador GUID único persistente para CEPRO_MICAELA 2.0
AppId={{5E30B62E-CE91-4D82-BEBF-213E96A32011}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion} (Edición Institucional Windows Offline-First — Seguridad Corregida)
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\CEPRO_MICAELA_2.0
DefaultGroupName={#MyAppName}
OutputDir={#MyOutputDir}
OutputBaseFilename=CEPRO_MICAELA_2.0_Setup_QA_x64
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Instalación estándar por usuario sin requerir UAC (permite override por admin con /ALLUSERS)
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog commandline
; Detección y cierre seguro de procesos activos antes de instalar o desinstalar
CloseApplications=yes
CloseApplicationsFilter=CEPRO_MICAELA_2.0.exe
RestartApplications=no
; Registro formal en Agregar o Quitar Programas de Windows
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName} — Sistema Académico Institucional (v{#MyAppVersion})
DisableProgramGroupPage=yes
UsedUserAreasWarning=no
WizardStyle=modern
AllowNoIcons=yes
ChangesAssociations=no

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; Archivos empaquetados del programa: binario Electron, runtime Node 24, scripts y assets compilados
Source: "{#MySourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent
