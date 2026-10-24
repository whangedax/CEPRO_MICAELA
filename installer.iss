; ==============================================================================
; CEPRO_MICAELA 2.0 — Script de Instalación Profesional Windows (Inno Setup 6)
; Tarea 40 — Empaquetado, Seguridad, Actualización y Preservación de Datos
; ==============================================================================

#define MyAppName "CEPRO_MICAELA 2.0"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "CETPRO Micaela Bastidas"
#define MyAppExeName "CEPRO_MICAELA_2.0.exe"
#define MySourceDir "C:\CETPRO\CETPRO_MODERNIZACION_V2\release\CEPRO_MICAELA_2.0-win32-x64"
#define MyOutputDir "C:\CETPRO\CETPRO_MODERNIZACION_V2\release"

[Setup]
; Identificador GUID único persistente para CEPRO_MICAELA 2.0
AppId={{5E30B62E-CE91-4D82-BEBF-213E96A32011}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} (Edición Institucional Windows Offline-First)
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
UninstallDisplayName={#MyAppName} — Sistema Académico Institucional
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

; ==============================================================================
; PRESERVACIÓN ESTRICTA DE DATOS INSTITUCIONALES (SECCIÓN 8 Y 17)
; NOTA CRÍTICA: NO SE REGISTRA NINGUNA DIRECTIVA PARA ELIMINAR {userappdata}\CEPRO_MICAELA_2.0\data
; Al desinstalar, Inno Setup retira exclusivamente los binarios de {app} y los accesos
; directos, garantizando que SQLite, certificados, claves Ed25519 y respaldos queden
; 100% INTACTOS para futuras reinstalaciones o auditorías.
; ==============================================================================
