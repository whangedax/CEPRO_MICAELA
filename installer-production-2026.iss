; ==============================================================================
; CEPRO_MICAELA 2.0 — Script de Instalación Oficial Producción 2026 Windows
; Edición Oficial de Producción 2026 con Base de Datos Pre-cargada
; Arquitectura x64 Offline-First · Seguridad Validada · Preservación de Base de Datos
; ==============================================================================

#define MyAppName "CEPRO_MICAELA 2.0"
#define MyAppVersion "2.0.2"
#define MyAppPublisher "CETPRO Micaela Bastidas"
#define MyAppExeName "CEPRO_MICAELA_2.0.exe"
#define MySourceDir "C:\CETPRO\CETPRO_MODERNIZACION_V2\release\CEPRO_MICAELA_2.0_Produccion_2026-win32-x64"
#define MyOutputDir "C:\CETPRO\CETPRO_MODERNIZACION_V2\release"

[Setup]
; Identificador GUID único para la edición Producción 2026
AppId={{5E30B62E-CE91-4D82-BEBF-213E96A32026}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion} (Producción Oficial 2026 - Windows Offline-First)
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\CEPRO_MICAELA_2.0
DefaultGroupName={#MyAppName}
OutputDir={#MyOutputDir}
OutputBaseFilename=CEPRO_MICAELA_2.0_Setup_Produccion_2026_x64
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Instalación directa sin diálogo confuso de selección de modo (un único flujo estándar)
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=commandline
UsePreviousPrivileges=no
; Detección y cierre seguro de procesos activos antes de instalar o actualizar
CloseApplications=yes
CloseApplicationsFilter=CEPRO_MICAELA_2.0.exe
RestartApplications=no
; Registro formal en Panel de Control / Configuración de Windows
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName} — Sistema Académico Producción 2026 (v{#MyAppVersion})
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
; Archivos empaquetados: binario Electron x64, runtime Node 24, scripts, frontend y baseline 2026 pre-cargado
Source: "{#MySourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent