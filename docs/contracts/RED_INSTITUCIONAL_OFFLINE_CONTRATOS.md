# ESPECIFICACIÓN TÉCNICA DE CONTRATOS Y ARQUITECTURA: RED INSTITUCIONAL OFFLINE

**Proyecto:** CEPRO_MICAELA 2.0  
**Módulo:** `scripts/institutional-network.cjs` y extensiones en `scripts/offline-http.cjs`  
**Estado:** ESPECIFICACIÓN TÉCNICA CANÓNICA PARA IMPLEMENTACIÓN  
**Rol Redactor:** Arquitecto Técnico de CEPRO_MICAELA 2.0  
**Destinatario:** Dirección Orquestadora (`8997df4d-0954-4b37-a2da-85454d9e21f9`) / Implementador  

---

## 1. RESUMEN EJECUTIVO Y MODELO DE ARQUITECTURA

La Red Institucional Offline de CEPRO_MICAELA 2.0 implementa una topología en estrella centrada en el **Equipo Maestro** (operado por la Dirección Institucional). Los nodos vinculados (Secretaría y Docentes) intercambian datos mediante memorias USB utilizando una convención de carpetas estandarizada (`CEPRO_INTERCAMBIO/`), paquetes criptográficamente sellados (`SYNC`), y kits de vinculación inviolables con caducidad temporal (`.cetpro-invitacion`), preservando de forma absoluta las políticas de seguridad del proyecto:
1. **Instalador institucional único e inmutable:** No se introducen tokens, claves privadas ni bases de datos dentro del ejecutable empaquetado.
2. **Generación local de llaves:** La clave privada de cada nodo se genera exclusivamente dentro del dispositivo físico correspondiente y jamás abandona el equipo.
3. **Transaccionalidad ACID y Resiliencia SQLite WAL:** Todas las mutaciones por sincronización se ejecutan dentro de transacciones inmediatas (`BEGIN IMMEDIATE`) precedidas obligatoriamente de un snapshot de seguridad SQLite (`antes-sincronizar-lote`).

---

## 2. ESTRUCTURA Y CONTRATOS TIPADOS (TypeScript / JSDoc)

```typescript
// ==========================================
// 1. ESTADO DE LA RED INSTITUCIONAL Y CENSO
// ==========================================

export type NetworkNodeStatus = 'UP_TO_DATE' | 'PENDING' | 'STALE' | 'UNLINKED' | 'REVOKED';

export interface NetworkAccountStatus {
  userId: string;
  username: string;
  name: string;
  role: 'DIRECTOR' | 'SECRETARIA' | 'DOCENTE';
  active: boolean;
  assignments: Array<{
    groupId: string;
    section?: string;
    programId?: string;
    moduleId?: string;
    periodId?: string;
    units: string[];
  }>;
  carreras: string[];
  device: {
    linked: boolean;
    deviceId: string | null;
    linkedAt: string | null;
    signingKey: string | null;
    revoked: boolean;
    revokedAt?: string | null;
    revocationReason?: string | null;
  };
  syncMetrics: {
    lastSyncSentAt: string | null;
    lastSyncReceivedAt: string | null;
    daysSinceLastSync: number | null;
    unacknowledgedDeliveries: number;
    pendingChangesCount: number;
  };
  statusColor: 'GREEN' | 'YELLOW' | 'RED' | 'GRAY'; // GREEN: <3d y 0 pend, YELLOW: 3-7d o con pend, RED: >7d o revocado, GRAY: unlinked
  statusLabel: string;
}

export interface NetworkStatusResponse {
  isHub: boolean;
  hubDeviceId: string;
  currentDeviceId: string;
  nodeRole: 'HUB_MASTER' | 'SECRETARIA_NODE' | 'DOCENTE_NODE';
  institution: {
    id: string;
    name: string;
    code: string;
    publicKey: string;
  };
  summary: {
    totalAccounts: 13;
    linkedDevicesCount: number;
    unlinkedCount: number;
    upToDateCount: number;
    pendingCount: number;
    staleCount: number;
    revokedCount: number;
  };
  accounts: NetworkAccountStatus[];
}

// ==========================================
// 2. KITS DE INSTALACIÓN E INVITACIONES
// ==========================================

export interface NetworkInvitationBody {
  app: 'CETPRO_MICAELA';
  type: 'NETWORK_INVITATION';
  version: number;
  id: string;
  institution: {
    id: string;
    name: string;
    publicKey: string;
    hub: {
      id: string;
      signingKey: string;
      encryptionKey: string;
    };
  };
  recipient: {
    id: string;
    username: string;
    name: string;
    role: 'SECRETARIA' | 'DOCENTE';
    assignments: any[];
    version: number;
  };
  issuedAt: string;
  expiresAt: string;
  installerSha256: string;
  provisionalEnvelope?: string; // Solo en Opción B con PIN
}

export interface NetworkInvitationPackage {
  body: NetworkInvitationBody;
  signature: string; // Firmado con authorityPrivate de la institución
}

export interface CreateKitInput {
  userId: string;
  targetPath?: string;       // Ruta de carpeta o raíz de la USB (ej. "E:\")
  expiryDays?: number;      // Por defecto 7 días
  pin?: string;             // Opcional, solo si se usa pre-aprovisionamiento
}

export interface CreateKitResult {
  success: boolean;
  kitDirectory: string;
  invitationFile: string;
  instructionsFile: string;
  installerCopied: boolean;
  invitation: NetworkInvitationPackage;
  expiresAt: string;
}

export interface ValidateInvitationResult {
  valid: boolean;
  institution: {
    id: string;
    name: string;
  };
  recipient: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
  issuedAt: string;
  expiresAt: string;
  isExpired: boolean;
  installerSha256: string;
}

export interface AcceptInvitationInput {
  invitation: NetworkInvitationPackage;
  pin?: string;
}

export interface AcceptInvitationResult {
  success: boolean;
  linkedUser: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
  deviceId: string;
  initialSyncPackage?: any;
}

// ==========================================
// 3. EXPORTACIÓN POR LOTES Y USB
// ==========================================

export interface PrepareBatchExportInput {
  usbDrivePath?: string;
  recipientUserIds?: string[];
  allDocentesWithPending?: boolean;
}

export interface BatchExportItemResult {
  recipientUserId: string;
  recipientName: string;
  recipientRole: string;
  targetFolder: string;
  fileName: string;
  filePath: string;
  operationsCount: number;
  packageId: string;
  sha256: string;
}

export interface PrepareBatchExportResult {
  success: boolean;
  targetRoot: string;
  totalPackages: number;
  totalOperations: number;
  packages: BatchExportItemResult[];
}

// ==========================================
// 4. ESCANEO E IMPORTACIÓN DE USB
// ==========================================

export interface UsbScanInput {
  usbDrivePath: string;
}

export interface ScannedPackageItem {
  fileName: string;
  filePath: string;
  subFolder: 'para-direccion' | 'para-secretaria' | 'para-docentes';
  packageType: 'SYNC' | 'GROUP_EXCHANGE';
  fromDeviceId: string;
  senderName: string;
  senderRole: string;
  packageCreatedAt: string;
  operationsCount: number;
  alreadyImported: boolean;
  hasWork: boolean;
  previewReport: any;
}

export interface UsbScanResult {
  usbPath: string;
  exchangeRoot: string;
  scannedFilesCount: number;
  pendingToImportCount: number;
  packages: ScannedPackageItem[];
}

export interface BatchImportInput {
  usbDrivePath: string;
  filePathsToImport?: string[]; // Si se omite, importa todos los no duplicados
}

export interface BatchImportItemResult {
  filePath: string;
  fileName: string;
  packageId: string;
  success: boolean;
  applied: boolean;
  archivedTo: string;
  report: any;
  error?: string;
}

export interface BatchImportResult {
  success: boolean;
  backupCreated: string;
  totalFiles: number;
  importedFilesCount: number;
  failedFilesCount: number;
  results: BatchImportItemResult[];
}

// ==========================================
// 5. REVOCACIÓN Y REEMPLAZO DE EQUIPOS
// ==========================================

export interface RevokeDeviceInput {
  deviceId: string;
  reason: string;
}

export interface RevokeDeviceResult {
  success: boolean;
  revokedDeviceId: string;
  revokedAt: string;
  affectedUser: {
    id: string;
    name: string;
    role: string;
  };
}

export interface ReplaceDeviceInput {
  oldDeviceId: string;
  userId: string;
  reason: string;
  newKitTargetPath?: string;
}
```

---

## 3. ESPECIFICACIÓN DEL MÓDULO `scripts/institutional-network.cjs`

El módulo debe ser un singleton o clase de utilidades que opere en conjunto con la instancia activa de `OfflineCore`.

### 3.1 `createKit(core, actor, input)`
- **Autorización:** `core.requireRole(actor, ['DIRECTOR'])`. Requiere que `core.setting('authorityPrivate')` exista en el equipo (Equipo Maestro).
- **Validaciones:**
  1. `input.userId`: Debe corresponder a un usuario activo en `core.users()`.
  2. Si `user.role === 'DIRECTOR'`, lanzar error 400: *"El Director opera en el Equipo Maestro institucional; no requiere kit."*
  3. `expiryDays`: Entero positivo entre 1 y 30 (por defecto 7).
- **Flujo Operativo:**
  1. Construir el payload `invitationBody` con `id()`, timestamp `issuedAt`, timestamp `expiresAt` (`issuedAt + expiryDays * 86400000`), metadatos institucionales y datos del destinatario.
  2. Obtener el hash canónico del instalador homologado (`AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`) o calcularlo si el archivo existe en `release/`.
  3. Firmar el objeto `invitationBody` con la clave privada de la institución (`sign(invitationBody, core.setting('authorityPrivate'))`).
  4. Generar la carpeta de destino:
     - Si `input.targetPath` es proporcionado: usar `${input.targetPath}/KIT_CEPRO_${sanitizedRole}_${sanitizedName}`.
     - Si no se proporciona: crear dentro de `dev-sandbox/data/kits/`.
  5. Escribir el archivo `invitacion.cetpro-invitacion` conteniendo `{ body, signature }`.
  6. Escribir el archivo `LEAME_INSTALACION.txt` (y opcionalmente copiar la guía PDF si existe) explicando los 3 pasos de instalación.
  7. Si existe el instalador institucional en `release/` y `input.targetPath` tiene espacio suficiente (> 200 MB), copiar `CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe` dentro de la carpeta del kit.
  8. Registrar evento inmutable de auditoría: `KIT_CREATED` con `userId`, `invitationId` y `expiresAt`.
- **Retorno:** Objeto `CreateKitResult`.

### 3.2 `validateInvitation(core, invitationPackage)`
- **Validaciones Criptográficas y Estructurales:**
  1. Comprobar que `invitationPackage?.body` y `invitationPackage?.signature` existan.
  2. Comprobar `body.app === 'CETPRO_MICAELA'` y `body.type === 'NETWORK_INVITATION'`.
  3. Verificar que `now() <= body.expiresAt`. Si expiró, fail con *"La invitación institucional ha caducado el <fecha>. Solicite una nueva a Dirección."*, código 400.
  4. Verificar la firma institucional: `verify(body, signature, body.institution.publicKey)`. Si falla, fail con *"Firma institucional de la invitación inválida o corrupta."*, código 403.
  5. Si el equipo local ya está inicializado con otra institución o tiene `authorityPrivate`, fail con código 409.
- **Retorno:** Objeto `ValidateInvitationResult`.

### 3.3 `acceptInvitationAndLink(core, input)`
- **Flujo Operativo:**
  1. Validar la invitación mediante `validateInvitation(core, input.invitation)`.
  2. Obtener la identidad del dispositivo local: `device = core.setting('device')`.
  3. Comprobar que el equipo actual no posea ya un certificado de vinculación asignado a otra persona distinta a `recipient.id`.
  4. Generar la credencial de vinculación y certificado del equipo avalado por la institución recibida:
     - Se vincula el `device.id` con `recipient.id`.
     - Se registra en `settings`:
       * `institution`: Datos institucionales de la invitación.
       * `provisionSequence`: 1.
       * `certificate`: Certificado institucional sellado para este dispositivo y usuario.
     - Se registra el usuario en SQLite mediante `core.putUser(recipient)`.
  5. Registrar auditoría inmutable: `DEVICE_LINKED_INVITATION`.
- **Retorno:** Objeto `AcceptInvitationResult`.

### 3.4 `getNetworkStatus(core, actor)`
- **Censo de Cuentas:**
  1. Obtener la lista de usuarios oficiales: `allUsers = core.users()`.
  2. Filtrar o mapear las 13 cuentas oficiales 2026 (1 Director, 1 Secretaria, 11 Docentes).
  3. Consultar la tabla de dispositivos vinculados en `settings.devices` y la lista de revocados en `settings.revokedDevices`.
  4. Consultar `deliveries` para métricas de envíos y acuses:
     - `SELECT COUNT(*) FROM deliveries WHERE deviceId=? AND acknowledged=0`
     - `SELECT MAX(rowid) FROM deliveries WHERE deviceId=?`
  5. Consultar `operations` y `audit` para calcular la fecha del último paquete recibido de cada docente (`actor.id === user.id`).
  6. Determinar cambios pendientes por entregar a cada usuario:
     - `operations().filter(op => !confirmed.has(op.body.id) && core.operationVisible(user, op.body))`
  7. Calcular semáforo para cada cuenta:
     - Si no tiene dispositivo en `settings.devices`: ⚪ `GRAY` / `UNLINKED`.
     - Si está en `settings.revokedDevices`: 🔴 `RED` / `REVOKED`.
     - Si han pasado > 7 días desde la última sincronización o nunca ha sincronizado estando vinculado: 🔴 `RED` / `STALE`.
     - Si han pasado entre 3 y 7 días, o tiene `pendingChangesCount > 0`: 🟡 `YELLOW` / `PENDING`.
     - Si sincronizó hace <= 3 días y `pendingChangesCount === 0`: 🟢 `GREEN` / `UP_TO_DATE`.
- **Retorno:** Objeto `NetworkStatusResponse`.

### 3.5 Estructuración de USB y Rutas Canónicas
Constantes requeridas:
```javascript
const USB_BASE_DIR = 'CEPRO_INTERCAMBIO';
const SUBDIR_TO_DIRECTION = 'para-direccion';
const SUBDIR_TO_SECRETARIA = 'para-secretaria';
const SUBDIR_TO_DOCENTES = 'para-docentes';
const SUBDIR_PROCESSED = 'procesados';
```
- Función `ensureUsbStructure(usbRoot)`:
  - Crea `CEPRO_INTERCAMBIO/` y sus 4 subdirectorios si no existen.
  - Genera archivo `LEAME_RED.txt` informativo en la raíz de `CEPRO_INTERCAMBIO/`.

### 3.6 `prepareBatchExport(core, actor, input)`
- **Autorización:** `requireRole(actor, ['DIRECTOR', 'SECRETARIA', 'DOCENTE'])`.
- **Reglas de Destino según Rol:**
  - Si `actor.role === 'DOCENTE'`:
    - Exporta automáticamente sus avances dirigidos al Equipo Maestro (`targetFolder = 'para-direccion'`).
    - Nombre de archivo: `YYYY-MM-DD_HHMM_DE-${actor.username}_HACIA-DIRECCION_lote-01.cetpro`.
    - Genera paquete `SYNC` (si está vinculado al Hub) o `GROUP_EXCHANGE`.
  - Si `actor.role === 'DIRECTOR' || actor.role === 'SECRETARIA'`:
    - Itera por los docentes destinatarios (`input.recipientUserIds` o todos los que tengan cambios pendientes).
    - Para cada docente con equipo vinculado: genera paquete `SYNC` usando `core.packageFor(actor, device.id)`.
    - Guarda en `para-docentes/${docente.username}/`.
    - Si el docente aún no vincula equipo pero se requiere exportar: genera `GROUP_EXCHANGE`.
- **Escritura Atómica en Disco:**
  1. Escribir a un archivo temporal `.tmp` con sufijo aleatorio.
  2. Calcular el SHA-256 del archivo escrito y validar que coincida con el payload en memoria.
  3. Renombrar atómicamente a `.cetpro`.
- **Retorno:** Objeto `PrepareBatchExportResult`.

### 3.7 `scanUsb(core, actor, usbDrivePath)`
- Localiza `CEPRO_INTERCAMBIO/` dentro de `usbDrivePath`.
- Determina qué subcarpeta corresponde según el actor:
  * `DIRECTOR`: escanea `para-direccion/`.
  * `SECRETARIA`: escanea `para-secretaria/` y `para-direccion/` (modo lectura).
  * `DOCENTE`: escanea `para-docentes/${actor.username}/` y `para-docentes/`.
- Por cada archivo `.cetpro`:
  1. Lee el archivo y parsea el JSON firmado.
  2. Comprueba si el `packageId` ya figura en la tabla `receipts` (marcar `alreadyImported = true`).
  3. Ejecuta `core.importPackage(actor, pkg, false)` (dry-run) para obtener el reporte de cambios, altas, modificaciones y conflictos potenciales sin escribir en SQLite.
- **Retorno:** Objeto `UsbScanResult`.

### 3.8 `importBatch(core, actor, input)`
- **Procedimiento de Seguridad:**
  1. Verificar que existan paquetes válidos para importar.
  2. **Crear respaldo preventivo SQLite OBLIGATORIO:** `core.createBackup(actor, 'antes-sincronizar-lote')`.
  3. Abrir transacción inmediata en SQLite (`core.transaction(...)`).
  4. Por cada paquete seleccionado:
     - Ejecutar `core.importPackage(actor, pkg, true)` para aplicar las operaciones, generar registros y actualizar acuses en `deliveries` u `operations`.
     - Mover el archivo importado de su subcarpeta a `CEPRO_INTERCAMBIO/procesados/` agregando un sello temporal: `${baseName}_PROCESADO_${timestamp}.cetpro`.
  5. Registrar auditoría inmutable: `BATCH_SYNC_APPLIED`.
- **Retorno:** Objeto `BatchImportResult`.

### 3.9 `revokeDevice(core, actor, input)` y `replaceDevice(core, actor, input)`
- **Autorización:** Estrictamente `DIRECTOR` en el Equipo Maestro.
- `revokeDevice`:
  1. Validar que `input.deviceId` exista en `settings.devices`.
  2. Remover de `settings.devices` o marcar como revocado.
  3. Insertar registro en `settings.revokedDevices`:
     `{ deviceId, revokedAt: now(), revokedBy: actor.id, reason: input.reason.trim() }`.
  4. Cualquier intento posterior de `importPackage` o `validateOperation` que porte certificados con ese `deviceId` será rechazado de inmediato con HTTP 403: *"Equipo institucional revocado por extravío o seguridad."*
  5. Registrar auditoría: `DEVICE_REVOKED`.
- `replaceDevice`:
  1. Invoca internamente `revokeDevice` sobre el equipo anterior.
  2. Genera un nuevo kit o deja la cuenta lista para vincular un equipo nuevo.
  3. Registra auditoría: `DEVICE_REPLACED`.

---

## 4. ESPECIFICACIÓN DE ENDPOINTS EN `scripts/offline-http.cjs`

Todos los endpoints respetan el protocolo REST JSON, validación estricta de Content-Type, autenticación mediante Bearer token y contexto de workspace.

### 4.1 `GET /api/network/status`
- **Permisos:** Autenticado (`DIRECTOR`, `SECRETARIA`, `DOCENTE`).
- **Respuesta 200:** Objeto `NetworkStatusResponse`. Si el actor es `DOCENTE`, la sección de cuentas se restringe a su propia cuenta o al estado general institucional sin revelar llaves públicas de otros equipos.

### 4.2 `POST /api/network/kit`
- **Permisos:** Estrictamente `DIRECTOR` en el Equipo Maestro.
- **Payload:** `{ userId: string, targetPath?: string, expiryDays?: number, pin?: string }`
- **Respuestas:**
  - 200: Objeto `CreateKitResult`.
  - 400: Parámetros inválidos o usuario no autorizado para kit (ej. Director).
  - 403: Usuario sin rol de Director o equipo que no es autoridad.

### 4.3 `POST /api/network/invitation/validate`
- **Permisos:** Público / Pre-login (utilizado en el primer arranque).
- **Payload:** `{ invitation: NetworkInvitationPackage }`
- **Respuestas:**
  - 200: Objeto `ValidateInvitationResult`.
  - 400: Invitación corrupta, con firma alterada o caducada (> 7 días).
  - 409: Equipo ya vinculado a otra institución o que opera como Hub.

### 4.4 `POST /api/network/invitation/accept`
- **Permisos:** Público / Pre-login.
- **Payload:** `{ invitation: NetworkInvitationPackage, pin?: string }`
- **Respuestas:**
  - 200: Objeto `AcceptInvitationResult`.
  - 400 / 403: Validación fallida o certificado rechazado.

### 4.5 `POST /api/network/export-batch`
- **Permisos:** Autenticado (`DIRECTOR`, `SECRETARIA`, `DOCENTE`).
- **Payload:** `{ usbDrivePath?: string, recipientUserIds?: string[], allDocentesWithPending?: boolean }`
- **Respuestas:**
  - 200: Objeto `PrepareBatchExportResult`.
  - 403: Intento de exportar fuera de las aulas asignadas (para docentes).
  - 500: Error de E/S o espacio insuficiente en el dispositivo USB.

### 4.6 `POST /api/network/scan`
- **Permisos:** Autenticado (`DIRECTOR`, `SECRETARIA`, `DOCENTE`).
- **Payload:** `{ usbDrivePath: string }`
- **Respuestas:**
  - 200: Objeto `UsbScanResult`.
  - 400: Ruta de USB no existe o no contiene la estructura `CEPRO_INTERCAMBIO/`.

### 4.7 `POST /api/network/import-batch`
- **Permisos:** Autenticado (`DIRECTOR`, `SECRETARIA`, `DOCENTE`).
- **Payload:** `{ usbDrivePath: string, filePathsToImport?: string[] }`
- **Respuestas:**
  - 200: Objeto `BatchImportResult`.
  - 403: Paquete contiene operaciones fuera de la asignación del usuario.
  - 500: Fallo en SQLite o corrupción de archivo (con rollback garantizado).

### 4.8 `POST /api/network/revoke`
- **Permisos:** Estrictamente `DIRECTOR` en el Equipo Maestro.
- **Payload:** `{ deviceId: string, reason: string }`
- **Respuestas:**
  - 200: Objeto `RevokeDeviceResult`.
  - 400: Motivo vacío o identificador de equipo no registrado.
  - 403: No autorizado.

---

## 5. MAPEO EXHAUSTIVO DE LAS 13 GARANTÍAS ANTI-FALLAS

| # | Riesgo / Vector de Falla | Salvaguarda Criptográfica / Arquitectónica | Componente Responsable | Criterio de Verificación Automatizada |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Importación duplicada del mismo archivo USB** | Detección previa en tabla `receipts` por `packageId` e inserción atómica `INSERT OR IGNORE INTO operations` evaluando `op.body.id`. Las operaciones repetidas se marcan como duplicadas sin alterar datos. | `offline-core.cjs` (`importPackage`) | Importar el mismo paquete 2 veces consecutivas → Segunda ejecución reporta `duplicates === total`, 0 escrituras en records, BD idéntica. |
| **2** | **Archivo de otra institución o alterado intencionalmente** | Firma institucional en certificados + firma digital Ed25519 del emisor por operación + comprobación canónica en `validateOperation`. | `offline-core.cjs` (`validateOperation`) | Modificar 1 solo byte en el cuerpo del archivo `.cetpro` → Lanzar error 400/403 inmediato ("Firma inválida o alterada"), 0 escrituras en SQLite. |
| **3** | **Docente intenta escribir o manipular un aula ajena** | Verificación estricta en `validateOperation` contra `actor.assignments` y `requireGroup()`. | `offline-core.cjs` y `workspace.cjs` | Forjar un paquete donde un docente firma notas de un aula de otra especialidad → Error 403 ("Asignación inválida"), 0 modificaciones. |
| **4** | **Corte eléctrico abrupto a mitad de importación masiva** | Snapshot de seguridad previo `antes-sincronizar-lote` + Transacción SQLite inmediata con `BEGIN IMMEDIATE` + Durabilidad total `synchronous = 2 (FULL)` en modo WAL. | `offline-core.cjs` y SQLite Engine | Interrupción súbita en ejecución transaccional → SQLite revierte al punto de partida vía WAL; `PRAGMA integrity_check` responde `ok`. |
| **5** | **Dos personas editan el mismo registro simultáneamente** | Control de Concurrencia Optimista (OCC): comprobación `current.rev === c.baseRev`. Si difiere, la operación se desvía a la tabla `conflicts` con `resolved = false`. | `offline-core.cjs` y tabla `conflicts` | Modificar nota en Hub a 16 y en equipo docente a 17 → Al sincronizar se genera 1 conflicto visible en bandeja de resolución; la nota local no se sobrescribe a ciegas. |
| **6** | **Desorden en la llegada de archivos (lote viejo llega después de uno nuevo)** | Ordenamiento causal por revisiones UUID y secuencias de aprovisionamiento. Si un registro ya tiene una revisión adelantada, la operación anterior se cataloga como desfasada. | `offline-core.cjs` (`importPackage`) | Aplicar Lote 2 y luego aplicar Lote 1 → El valor final en SQLite corresponde exactamente al Lote 2; no hay regresión a estados obsoletos. |
| **7** | **Paquete masivo o USB con espacio insuficiente** | Segmentación en lotes de hasta 16 MB (`16*1024*1024` bytes) y comprobación preventiva de espacio libre en disco previo a la exportación. | `institutional-network.cjs` (`prepareBatchExport`) | Exportar 12,000 notas vigesimales → El sistema segmenta limpiamente en N paquetes numerados correlativamente, procesables sin desbordamiento de memoria. |
| **8** | **Extravío o robo de una laptop docente** | Revocación explícita de equipo mediante lista negra criptográfica persistente en `settings.revokedDevices`. | `institutional-network.cjs` (`revokeDevice`) | Emitir revocación de `deviceId` → Intentar sincronizar un paquete firmado por esa máquina → Error 403 ("Equipo revocado por seguridad"). |
| **9** | **Reemplazo de laptop o reinstalación del docente** | Protocolo de sustitución formal (`replaceDevice`) + reemisión de kit o recuperación (`recoverExchange`). | `institutional-network.cjs` (`replaceDevice`) | Reemplazar equipo → Vincular nueva máquina → El docente recibe su aula completa con sus estudiantes y evaluaciones consolidadas. |
| **10** | **Incompatibilidad por versiones divergentes del software** | Validación obligatoria de los campos `app === 'CETPRO_MICAELA'` y `version === VERSION` en cabeceras de paquetes. | `offline-core.cjs` (`importPackage`) | Enviar paquete con `version: 99` → Error estructurado amable solicitando actualización del software sin afectar la persistencia. |
| **11** | **Fallo o interrupción de escritura física en la USB** | Escritura en archivo temporal `.tmp`, verificación de hash SHA-256 en disco versus memoria, y renombrado atómico final (`fs.renameSync`). | `institutional-network.cjs` | Simular error de escritura truncando archivo temporal → La extensión definitiva `.cetpro` nunca llega a crearse; el escáner lo ignora. |
| **12** | **Borrado o pérdida accidental de datos por sincronización** | Modelo de persistencia strictly append/update. Prohibición de sentencias `DELETE FROM records`. Retiros o bajas son transiciones de estado explícitas (`active = false`). | `offline-core.cjs` | Inspección de todas las ramas de `importPackage` → Constatar 0 sentencias `DELETE` sobre entidades académicas; todo cambio deja rastro en `audit`. |
| **13** | **Reloj del sistema desfasado o manipulado en el cliente** | Precedencia de transiciones regida exclusivamente por la cadena de hashes y revisiones (`rev`), no por marcas horarias `Date.now()`. | `offline-core.cjs` | Exportar desde un equipo con reloj en el año 2020 → El paquete se aplica correctamente basándose en su `baseRev` sin corromper el historial. |

---

## 6. INVARIANTES MANDATORIOS Y POLÍTICAS DE INTEGRIDAD

1. **Intangibilidad del Repositorio Histórico Original:**
   - La carpeta `C:\CETPRO\PAQUETE_ANTIGRAVITY_CETPRO_V2` es estrictamente de solo lectura. Queda prohibido escribir, modificar o eliminar cualquier archivo en ella.
2. **Preservación del Binario Homologado:**
   - El instalador oficial institucional de la Tarea 43 (`release/CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe`, SHA-256: `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`, 166.5 MB) no debe ser alterado ni recompilado para incrustar credenciales.
3. **Cero Regresiones Académicas y Documentales:**
   - 21/21 formatos oficiales MINEDU deben mantener `preflight.complete === true` sin marcas de borrador.
   - Preservación irrenunciable del soporte de la 7ma UD de Peluquería M2 mediante `TMPL-17`.
   - Las 219 pruebas automatizadas en 22 suites de `npm run test:sandbox` deben mantenerse en 100% de aprobación.