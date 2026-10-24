/**
 * api/types.ts
 * 
 * Contratos tipados de la API de CEPRO_MICAELA 2.0.
 * Reflejan exactamente las respuestas del backend sin alterar propiedades
 * ni inventar campos no respaldados por offline-core.cjs, offline-http.cjs y workspace.cjs.
 */

export type UserRole = 'DIRECTOR' | 'SECRETARIA' | 'DOCENTE';

export interface UserAssignment {
  groupId: string;
  section?: string;
  periodId?: string;
  programId?: string;
  moduleId?: string;
  units: string[];
}

export interface PublicUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  assignmentPending: boolean;
  role: UserRole;
  assignments: UserAssignment[];
  active: boolean;
  archived?: boolean;
  version: number;
}

export interface SystemStatus {
  initialized: boolean;
  institutionName?: string | null;
  deviceId: string;
  demonstration: boolean;
  authority: boolean;
  fingerprint: string | null;
  validUntil?: string | null;
  baselineAvailable: boolean;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: PublicUser;
}

export interface LogoutResponse {
  success: boolean;
}

export interface ApiError {
  error: string;
  status: number;
}

// ==========================================
// CONTRATOS DE WORKSPACE Y AULAS (TAREA 11)
// ==========================================

export interface WorkspaceUnitOption {
  code: string;
  name?: string;
  hours?: number;
  credits?: number;
  [key: string]: unknown;
}

export interface WorkspaceGroupOption {
  id: string;
  name: string;
  studentCount: number;
  programId: string;
  moduleId: string;
  periodId: string;
  year: string;
  turno: string;
  modalidad: string;
  units: WorkspaceUnitOption[];
}

export interface WorkspaceModuleOption {
  id: string;
  nombre: string;
}

export interface WorkspaceProgramOption {
  id: string;
  nombre: string;
}

export interface WorkspaceYearStat {
  year: string;
  programId: string;
  students: number;
}

export interface WorkspaceOptionsResponse {
  role: UserRole;
  assignmentPending: boolean;
  years: string[];
  stats: WorkspaceYearStat[];
  groups: WorkspaceGroupOption[];
  modules: WorkspaceModuleOption[];
  programs: WorkspaceProgramOption[];
}

export interface SelectWorkspacePayload {
  overview?: boolean;
  year?: string;
  programId?: string;
  moduleId?: string;
  groupId?: string;
  mode?: 'UNIT' | 'MODULE' | 'PRACTICE';
  unit?: string;
}

export interface WorkspaceContext {
  overview?: boolean;
  year?: string;
  programId?: string;
  moduleId?: string;
  groupId?: string;
  mode?: 'UNIT' | 'MODULE' | 'PRACTICE';
  unit?: string;
  unitName?: string;
}

export interface DashboardGroup {
  id: string;
  name: string;
  rawName?: string;
  section?: string;
  programId: string;
  moduleId: string;
  periodId: string;
  turno?: string;
  closed?: boolean;
  closureReason?: string;
  units?: string[];
  rev?: string;
  [key: string]: unknown;
}

export type AttendanceValue = 'P' | 'F' | 'J' | 'T';

export interface AttendanceRecord {
  id: string;
  enrollmentId: string;
  groupId: string;
  periodId?: string;
  moduleId?: string;
  unit: string;
  value: AttendanceValue | null;
  date: string;
  session: string;
  pending?: boolean;
  observation?: string;
  rev?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AttendanceRowPayload {
  enrollmentId: string;
  value: AttendanceValue | null;
  clear?: boolean;
  observation?: string;
  rev?: string | null;
}

export interface SaveAttendancePayload {
  groupId: string;
  unit: string;
  date: string;
  session: string;
  rows: AttendanceRowPayload[];
}

// ==========================================
// CONTRATOS DE EVALUACIONES Y NOTAS (TAREA 17)
// ==========================================

export interface GradeRecord {
  id: string;
  enrollmentId: string;
  groupId: string;
  periodId?: string;
  moduleId?: string;
  unit: string;
  indicator: string;
  value: number | null;
  pending?: boolean;
  observation?: string;
  rev?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface GradeRowPayload {
  enrollmentId: string;
  indicator: string;
  value: number | null;
  clear?: boolean;
  observation?: string;
  rev?: string | null;
}

export interface SaveGradesPayload {
  groupId: string;
  unit: string;
  indicator?: string;
  rows: GradeRowPayload[];
}

// ==========================================
// CONTRATOS DEL CENTRO DOCUMENTAL (TAREA 19)
// ==========================================

export interface DocumentCatalogItem {
  id: string; // e.g. 'TMPL-01'
  name: string; // e.g. 'Nómina de matrícula'
  parameters: string[];
  capacity?: Record<string, unknown>;
  pages?: Array<{ number: number; width: number; height: number }>;
  physicalKeys?: string[];
}

export interface DocumentFieldSchema {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select';
  roles: string[];
  options?: string[];
}

export interface DocumentScope {
  kind:
    | 'institution'
    | 'program'
    | 'module'
    | 'group'
    | 'unit'
    | 'unitCurriculum'
    | 'enrollment'
    | 'registry'
    | 'practice'
    | 'closure'
    | string;
  target?: string;
  unit?: string;
}

export interface SaveDocumentConfigurationPayload {
  scope: DocumentScope;
  fields: Record<string, any>;
  rev?: string | null;
}

export interface DocumentSettingRecord {
  id: string;
  scope: DocumentScope;
  fields: Record<string, any>;
  rev?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface DocumentConfigurationResponse {
  catalog: DocumentCatalogItem[];
  schema: Record<string, DocumentFieldSchema[]>;
  defaults: Record<string, Record<string, string>>;
  settings: DocumentSettingRecord[];
}

export interface PreflightField {
  key: string;
  label: string;
  value: string;
  status: 'READY' | 'MISSING';
  source: string;
}

export interface PreflightMissing {
  key: string;
  source: string;
  count?: number;
}

export interface DocumentPreflight {
  fields: PreflightField[];
  missing: PreflightMissing[];
  total: number;
  filled: number;
  complete: boolean;
}

export interface DocumentRequestPayload {
  groupId: string;
  templateId: string;
  unit?: string;
  enrollmentId?: string;
  includeRetired?: boolean;
  demoFill?: boolean;
}

export interface DocumentPreflightResponse {
  templateId: string;
  fingerprint: string;
  groupId?: string;
  unit?: string;
  unitCode?: string;
  includeRetired?: boolean;
  demoFill?: boolean;
  demoMode?: boolean;
  official?: boolean;
  preflight: DocumentPreflight;
  warnings?: string[];
  institution?: Record<string, unknown>;
  group?: Record<string, unknown>;
  program?: Record<string, unknown>;
  module?: Record<string, unknown>;
  students?: unknown[];
  grades?: unknown[];
  attendance?: unknown[];
  academicDates?: string[];
  parameters?: string[];
  [key: string]: unknown;
}

export interface DocumentPdfPayload {
  groupId: string;
  templateId: string;
  unit?: string;
  enrollmentId?: string;
  includeRetired?: boolean;
  demoFill?: boolean;
  fingerprint?: string;
}

export type SubmissionStatus = 'ENTREGADO' | 'RECIBIDO' | 'OBSERVADO' | 'REVISADO';

export interface DocumentSubmission {
  id: string;
  groupId: string;
  unit: string | null;
  templateId: string;
  authorId: string;
  authorName: string;
  status: SubmissionStatus;
  createdAt: string;
  fingerprint: string;
  pdfHash: string;
  parameters: Array<{
    key: string;
    label: string;
    value: unknown;
    status?: string;
    source?: string;
  }>;
  rev: string;
  updatedAt: string;
  updatedBy: string;
  reviewedBy?: string;
  reviewReason?: string;
  reviewedAt?: string;
}

export interface DocumentSubmitPayload {
  groupId: string;
  templateId: string;
  unit?: string;
  enrollmentId?: string;
  includeRetired?: boolean;
  fingerprint: string;
}

export interface DocumentReviewPayload {
  id: string;
  status: 'RECIBIDO' | 'OBSERVADO' | 'REVISADO';
  reason: string;
  rev: string;
}

export interface SimulateUnitAttendancePayload {
  groupId: string;
  unit: string;
  mode?: 'realistic' | 'perfect';
}

export interface SimulateUnitAttendanceResponse {
  datesCount: number;
  recordsCount: number;
  studentsCount: number;
  records?: unknown[];
}

export interface StudentEnrollmentItem {
  id: string;
  createdAt?: string;
  studentId: string;
  groupId: string;
  periodId?: string;
  moduleId?: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
  code?: string;
  rev?: string;
  provisional?: boolean;
  moduleState?: 'PROVISIONAL' | 'CONFIRMED' | 'EXCLUDED' | 'RETIRED';
  moduleCorrection?: {
    action: string;
    reason: string;
    at: string;
    by: string;
  };
  reason?: string;
  [key: string]: unknown;
}

export interface StudentItem {
  id: string;
  document: string;
  name: string;
  documentType?: string;
  lastName1?: string;
  lastName2?: string;
  firstNames?: string;
  sex?: string;
  birthDate?: string;
  active: boolean;
  archived?: boolean;
  rev?: string;
  legacy?: Record<string, string>;
  [key: string]: unknown;
}

export interface SaveStudentPayload {
  id?: string;
  rev?: string | null;
  name: string;
  document: string;
  documentType?: string;
  lastName1?: string;
  lastName2?: string;
  firstNames?: string;
  sex?: string;
  birthDate?: string;
  active?: boolean;
  archived?: boolean;
}

export interface ArchiveStudentPayload {
  id: string;
  rev: string;
  reason: string;
  date: string;
}

export interface EnrollPayload {
  studentId: string;
  groupId: string;
  startDate: string;
}

export interface RetireEnrollmentPayload {
  id: string;
  rev: string;
  date: string;
  reason: string;
  targetGroupId?: string;
}

export interface CorrectModuleEnrollmentPayload {
  id: string;
  rev: string;
  action: 'CONFIRM' | 'EXCLUDE' | 'RESTORE';
  reason: string;
}

export interface SaveGroupPayload {
  id?: string;
  rev?: string | null;
  name?: string;
  programId: string;
  moduleId: string;
  periodId: string;
  section?: string;
  turno?: string;
  units: string[];
}

export interface ClosureGroupPayload {
  groupId: string;
  closed: boolean;
  reason: string;
  rev?: string;
}

export interface SaveUserPayload {
  id?: string;
  username: string;
  name: string;
  description?: string;
  role: UserRole;
  password?: string;
  active?: boolean;
  assignmentPending?: boolean;
  assignments?: UserAssignment[];
  version?: number;
}

export interface ArchiveUserPayload {
  id: string;
  version?: number;
  reason: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  password: string;
}

export type AcademicConfigKind =
  | 'academicYear'
  | 'academicPeriod'
  | 'curriculum'
  | 'moduleDefaults'
  | 'personnel';

export interface AcademicConfigFieldDef {
  key: string;
  label: string;
  type: string;
  roles?: string[];
  options?: string[];
}

export interface AcademicConfigRecord {
  id: string;
  scope: {
    kind: AcademicConfigKind | string;
    target: string;
    unit?: string;
  };
  fields: Record<string, any>;
  rev?: string;
}

export interface AcademicConfigurationResponse {
  editable: boolean;
  schema: Record<AcademicConfigKind, AcademicConfigFieldDef[]>;
  institutionSchema: Array<{ key: string; label: string; type?: string }>;
  records: AcademicConfigRecord[];
  issues: Record<string, string[]>;
}

export interface CloneYearPayload {
  sourceYear: string;
  year: string;
}

export interface CloneYearResponse {
  year: string;
  message: string;
}

export interface ApplyReferencePayload {
  moduleId: string;
  rev?: string;
}

export interface DashboardResponse {
  students: StudentItem[];
  enrollments: StudentEnrollmentItem[];
  groups: DashboardGroup[];
  programs: Array<{ id: string; name?: string; nombre?: string }>;
  modules: Array<{ id: string; name?: string; nombre?: string }>;
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  user: PublicUser;
  policy: unknown;
  accountRequests?: unknown[];
  studentRequests?: unknown[];
  status: SystemStatus;
  templates: string[];
  lastSync?: any;
  pending?: number;
  conflicts?: ConflictItem[];
  migrationReport?: unknown;
  submissions?: DocumentSubmission[];
  devices?: SyncDeviceItem[];
  workspace: WorkspaceContext | null;
}

// ==========================================
// CONTRATOS DE SINCRONIZACIÓN Y TRANSFERENCIA (TAREA 34)
// ==========================================

export interface ExchangeExportPayload {
  groupId?: string;
  moduleId?: string;
  unit?: string;
  recipientUserId?: string;
  includeAccounts?: boolean;
  passphrase?: string;
}

export interface ExchangeSummarySender {
  name: string;
  role: string;
}

export interface ExchangeSummaryRecipient {
  name: string;
  role: string;
}

export interface ExchangeSummaryGroup {
  id: string;
  name: string;
}

export interface ExchangeSummary {
  sender?: ExchangeSummarySender;
  recipient?: ExchangeSummaryRecipient | null;
  groups?: ExchangeSummaryGroup[];
  counts?: Record<string, number>;
}

export interface ExchangeExportResponse {
  body: {
    app: string;
    type: 'GROUP_EXCHANGE' | 'SYNC';
    audience: string;
    recipientUserId: string | null;
    version: number;
    id: string;
    institutionId: string;
    from: string;
    at: string;
    certificate: unknown;
    envelope: unknown;
  };
  signature: string;
  summary: ExchangeSummary;
}

export interface SyncPreviewReport {
  description?: ExchangeSummary;
  createdAt?: string;
  accountUpdate?: boolean;
  packageId?: string;
  total?: number;
  newRecords?: number;
  updates?: number;
  duplicates?: number;
  conflicts?: number;
  pending?: number;
  applied?: boolean;
  duplicatePackage?: boolean;
  changeCounts?: Record<string, number>;
  recordsToUpdate?: number;
  recordsToAdd?: number;
  needsReview?: boolean;
  hasWork?: boolean;
}

export interface SyncDeviceItem {
  id: string;
  userId: string;
  name?: string;
  signingKey?: string;
  encryptionKey?: string;
}

export interface ConflictResolutionRecord {
  action: 'KEEP_LOCAL' | 'ACCEPT_INCOMING';
  reason: string;
  userId: string;
  at: string;
}

export interface ConflictItem {
  id: string;
  kind?: string;
  operation: {
    body: {
      id: string;
      actor: { id: string; name: string; role: string };
      entity: string;
      recordId: string;
      baseRev?: string;
      value: any;
      institutionId?: string;
    };
    signature?: string;
  };
  observedDuringImport?: any;
  current?: any;
  resolved: boolean;
  retained?: any;
  resolution?: ConflictResolutionRecord;
}

export interface ResolveConflictPayload {
  id: string;
  action: 'KEEP_LOCAL' | 'ACCEPT_INCOMING';
  reason: string;
  currentRev?: string | null;
}

export interface DeviceRequestResponse {
  app: string;
  type: 'DEVICE_REQUEST';
  version: number;
  id: string;
  signingKey: string;
  encryptionKey: string;
}

export interface ProvisionPayload {
  userId: string;
  request: DeviceRequestResponse;
}

export interface ProvisionResponse {
  body: {
    app: string;
    type: 'PROVISION';
    version: number;
    to: string;
    sequence: number;
    institution: any;
    envelope: any;
  };
  signature: string;
  fingerprint: string;
}

export interface AcceptProvisionPayload {
  package: ProvisionResponse | unknown;
  fingerprint: string;
}

// ==========================================
// CONTRATOS DE RESPALDO Y RESTAURACIÓN (TAREA 36)
// ==========================================

export interface BackupItem {
  filename: string;
  label: string;
  size: number;
  createdAt: string;
}

export interface CreateBackupPayload {
  label?: string;
}

export interface CreateBackupResponse {
  filename: string;
  counts: {
    records: number;
    operations: number;
  };
}

export interface ExportEncryptedBackupPayload {
  filename?: string;
  source?: unknown;
  passphrase: string;
  hint?: string;
}

export interface ExportEncryptedBackupResponse {
  filename: string;
  size: number;
  algorithm: string;
  kdf: string;
  hint?: string;
  encryptedEnvelope?: {
    type: string;
    version: number;
    kdf: string;
    salt: string;
    iv: string;
    authTag: string;
    ciphertext: string;
    hint?: string;
  };
}

export interface InspectBackupPayload {
  filename?: string;
  source?: unknown;
  passphrase?: string;
}

export interface InspectBackupResponse {
  valid: boolean;
  filename?: string | null;
  app: string;
  version: number;
  at: string;
  checksum: string;
  checksumValid: boolean;
  totalRecords: number;
  encrypted?: boolean;
  requiresPassphrase?: boolean;
  hint?: string;
  algorithm?: string;
  kdf?: string;
  message?: string;
  counts: {
    students: number;
    enrollments: number;
    groups: number;
    grades: number;
    attendance: number;
    programs: number;
    modules: number;
    users: number;
    operations: number;
    settings: number;
    audit: number;
  };
}

export interface RestoreBackupPayload {
  filename?: string;
  source?: unknown;
  passphrase?: string;
}

export interface RestoreBackupResponse {
  success: boolean;
  previousCopy: string;
}

export interface DatabaseHealthIssue {
  code: string;
  entity: string;
  id: string;
  message: string;
}

export interface DatabaseHealthResponse {
  at: string;
  schemaVersion: number;
  physicalIntegrity: boolean;
  healthy: boolean;
  quickCheck?: string;
  integrityCheck?: string;
  foreignKeyCheck?: string;
  dbPath?: string;
  errors: DatabaseHealthIssue[];
  warnings: DatabaseHealthIssue[];
  counts: {
    students: number;
    enrollments: number;
    groups: number;
    grades: number;
    attendance: number;
  };
  journalMode: string;
}

export interface SetupInstitutionPayload {
  institutionName?: string;
  username: string;
  password: string;
  name: string;
  importBaseline?: boolean;
}

export interface SetupInstitutionResponse {
  success: boolean;
  fingerprint: string;
}


