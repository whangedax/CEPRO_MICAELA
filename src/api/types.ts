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
  careerId?: string;
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
  fechaInicio?: string;
  fechaFin?: string;
  [key: string]: unknown;
}

export interface WorkspaceGroupOption {
  id: string;
  name: string;
  section?: string;
  teacherName?: string;
  studentCount: number;
  programId: string;
  moduleId: string;
  periodId: string;
  year: string;
  turno: string;
  modalidad: string;
  isConvenio?: boolean;
  convenioName?: string;
  fechaInicio?: string;
  fechaFin?: string;
  units: WorkspaceUnitOption[];
}

export interface WorkspaceModuleOption {
  periodId?: string;
  plannedUnits?: { code: string; name?: string }[];
  id: string;
  nombre: string;
  programId?: string;
  hours?: number;
  credits?: number;
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
  periods?: string[];
  role: UserRole;
  assignmentPending: boolean;
  years: string[];
  stats: WorkspaceYearStat[];
  groups: WorkspaceGroupOption[];
  modules: WorkspaceModuleOption[];
  programs: WorkspaceProgramOption[];
}

export interface SelectWorkspacePayload {
  periodId?: string;
  overview?: boolean;
  year?: string;
  programId?: string;
  moduleId?: string;
  groupId?: string;
  mode?: 'UNIT' | 'MODULE' | 'PRACTICE';
  unit?: string;
}

export interface WorkspaceContext {
  periodId?: string;
  overview?: boolean;
  year?: string;
  programId?: string;
  programName?: string;
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
  teacherName?: string;
  isConvenio?: boolean;
  convenioName?: string;
  closed?: boolean;
  closureReason?: string;
  units?: string[];
  fechaInicio?: string;
  fechaFin?: string;
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
  pages?: number | Array<{ number: number; width: number; height: number }>;
  physicalKeys?: string[];
  extension?: boolean;
  official2026?: boolean;
  official2026Support?: boolean;
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
  extendedCatalog?: DocumentCatalogItem[];
  schema: Record<string, DocumentFieldSchema[]>;
  defaults: Record<string, Record<string, string>>;
  settings: DocumentSettingRecord[];
}

export interface ProgramTrajectoryModuleSummary {
  order: number;
  enrollmentId: string;
  groupId: string;
  periodId: string | null;
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  hours: number;
  credits: number;
  efsrtHours: number;
  modularGrade: number | null;
  efsrtFinalGrade: number | null;
  condition: string | null;
  startDate: string | null;
  endDate: string | null;
  provisional: boolean;
  active: boolean;
}

export interface ProgramTrajectorySummary {
  studentId?: string | null;
  programId?: string | null;
  programName?: string;
  module1: ProgramTrajectoryModuleSummary | null;
  module2: ProgramTrajectoryModuleSummary | null;
  modules?: ProgramTrajectoryModuleSummary[];
  totalHours: number;
  totalCredits: number;
  hasBothModules: boolean;
  missingModules: string[];
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
  official2026?: boolean;
}

export type DocumentRequest = DocumentRequestPayload;

export interface DocumentPreflightResponse {
  templateId: string;
  catalogName?: string;
  fingerprint: string;
  groupId?: string;
  unit?: string;
  unitCode?: string;
  includeRetired?: boolean;
  demoFill?: boolean;
  demoMode?: boolean;
  official?: boolean;
  official2026?: boolean;
  trajectory?: ProgramTrajectorySummary | null;
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
  parameters?: Record<string, unknown> | string[];
  [key: string]: unknown;
}

export type DocumentRecord = DocumentPreflightResponse;

export interface DocumentPdfPayload {
  groupId: string;
  templateId: string;
  unit?: string;
  enrollmentId?: string;
  includeRetired?: boolean;
  demoFill?: boolean;
  official2026?: boolean;
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
  official2026?: boolean;
  fingerprint: string;
}

export interface DocumentReviewPayload {
  id: string;
  status: 'RECIBIDO' | 'OBSERVADO' | 'REVISADO';
  reason: string;
  rev: string;
}

export interface TitleEmissionSnapshot {
  correlative?: string;
  levelCode?: string;
  studentDni?: string;
  studentName?: string;
  tituladoName?: string;
  officialTitleText?: string;
  programAcronym?: string;
  completionYear?: string;
  processYear?: string;
  registerCode?: string;
  ugelCode?: string;
  referenceResolution?: string;
  emissionDate?: string;
  directorName?: string;
  lugar?: string;
}

export interface DocumentEmissionRecord {
  id: string;
  templateId: string;
  templateName: string;
  groupId: string | null;
  periodId: string | null;
  year: string | null;
  unit: string | null;
  enrollmentId: string | null;
  studentId: string | null;
  studentName: string | null;
  studentDni: string | null;
  programId: string | null;
  moduleId: string | null;
  correlative?: string | null;
  registerCode: string | null;
  resolutionNumber: string | null;
  ugelCode: string | null;
  official2026: boolean;
  demoMode: boolean;
  isDraft: boolean;
  pdfHash: string;
  byteLength: number;
  titleSnapshot?: TitleEmissionSnapshot;
  issuedBy: string;
  issuedByName: string;
  issuedByRole: UserRole | string;
  issuedAt: string;
  meta?: Record<string, unknown>;
}

export interface DocumentEmissionsFilters {
  groupId?: string;
  templateId?: string;
  enrollmentId?: string;
  studentId?: string;
  year?: string;
  query?: string;
}

export interface DeleteDocumentEmissionResponse {
  deleted: boolean;
  id: string;
  templateId: string;
  registerCode: string | null;
  freedCorrelative: string | null;
}

export interface SuggestDocumentRegisterCodePayload {
  groupId: string;
  templateId?: string;
  enrollmentId?: string;
  emissionYear?: string;
  dni?: string;
  demoMode?: boolean;
  correlative?: string | number;
  levelCode?: string;
  programAcronym?: string;
  shortRef?: string;
  codeYear?: string;
  forceNext?: boolean;
}

export interface SuggestedRegistryCodes {
  correlative: number;
  correlativeFormatted?: string;
  levelCode?: string;
  dni?: string;
  programAcronym?: string;
  shortRef?: string;
  codeYear?: string;
  registerCode: string;
  resolutionNumber: string;
  referenceResolution?: string;
  intakeYear: string;
  emissionYear: string;
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
  autoAdjustDate?: boolean;
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
  isConvenio?: boolean;
  convenioName?: string;
  units: string[];
}

export interface ClosureGroupPayload {
  groupId: string;
  closed: boolean;
  reason: string;
  rev?: string;
}

export interface DeleteGroupPayload {
  id: string;
  rev?: string;
  reason: string;
}

export interface ReassignGroupTeacherPayload {
  groupId: string;
  teacherId?: string;
  units?: string[];
  exclusive?: boolean;
  unassign?: boolean;
}

export interface ReassignGroupTeacherResponse {
  group: DashboardGroup;
  teacher: PublicUser | null;
  previousTeachers: string[];
}

export interface SaveUserPayload {
  id?: string;
  username: string;
  name: string;
  description?: string;
  careerId?: string;
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
  replacementTeacherId?: string;
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
  modules: Array<{ id: string; name?: string; nombre?: string; programId?: string }>;
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
  requiresLogin?: boolean;
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

// ==========================================
// CONTRATOS DE RED INSTITUCIONAL OFFLINE (TAREA 45)
// ==========================================

export interface NetworkAccountStatus {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  active: boolean;
  version: number;
  assignmentsCount: number;
  isLinked: boolean;
  deviceId: string | null;
  certificateStatus: 'ACTIVE' | 'EXPIRED' | 'UNLINKED';
  validUntil: string | null;
  isExpired: boolean;
  statusTrafficLight: 'GREEN' | 'YELLOW' | 'RED';
}

export interface NetworkDeviceSummary {
  id: string;
  name: string;
  userId?: string;
  signingKey?: string;
}

export interface NetworkStatusResponse {
  isHub: boolean;
  authorityPresent: boolean;
  deviceId: string;
  institution: {
    id: string;
    name: string;
    publicKey: string;
  } | null;
  accounts: NetworkAccountStatus[];
  devices: NetworkDeviceSummary[];
  revokedDevices: Array<{ deviceId: string; reason: string; revokedAt: string }>;
  metrics: {
    totalAccounts: number;
    linkedAccounts: number;
    activeAccounts: number;
    pendingKits: number;
  };
}

export interface CreateKitInput {
  userId: string;
  expiryDays?: number;
  targetPath?: string;
}

export interface CreateKitResponse {
  success: boolean;
  kitDirectory: string;
  invitationFile: string;
  instructionsFile: string;
  installerCopied: boolean;
  expiresAt: string;
}

export interface ValidateInvitationInput {
  invitation: unknown;
}

export interface ValidateInvitationResponse {
  valid: boolean;
  institution: {
    id: string;
    name: string;
  };
  recipient: {
    id: string;
    username: string;
    name: string;
    role: UserRole;
  };
  issuedAt: string;
  expiresAt: string;
  isExpired: boolean;
  installerSha256: string;
}

export interface AcceptInvitationInput {
  invitation: unknown;
}

export interface AcceptInvitationResponse {
  success: boolean;
  linkedUser: {
    id: string;
    username: string;
    name: string;
    role: UserRole;
  };
  deviceId: string;
}

export interface PrepareBatchExportInput {
  usbDrivePath?: string;
  passphrase?: string;
  recipientUserIds?: string[];
  syncModule?: 'all' | 'config' | 'enrollments' | 'grades' | 'attendance';
  includeSecretaria?: boolean;
}

export interface WhatsAppExportResponse {
  success: boolean;
  syncModule: string;
  operationsCount: number;
  sizeBytes: number;
  isTokenAvailable: boolean;
  tokenText: string | null;
  fileName: string;
  filePath: string;
  instructions: string;
}

export interface WhatsAppImportResponse {
  success: boolean;
  channel: string;
  syncModule: string;
  fromDeviceId?: string;
  sender: string;
  operationsApplied: number;
  conflictsDetected: number;
  report: any;
}

export interface ExportedPackageSummary {
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

export interface BatchExportResponse {
  success: boolean;
  usbPath: string;
  exchangeRoot: string;
  packagesCount: number;
  totalPackages?: number;
  targetRoot?: string;
  totalOperations: number;
  packages: ExportedPackageSummary[];
}

export interface ScanUsbInput {
  usbDrivePath?: string;
  passphrase?: string;
}

export interface ScannedPackageSummary {
  fileName: string;
  filePath: string;
  subFolder: string;
  packageType: string;
  fromDeviceId: string;
  senderName: string;
  senderRole: string;
  packageCreatedAt: string;
  operationsCount: number;
  alreadyImported: boolean;
  hasWork: boolean;
  previewReport: {
    total?: number;
    newRecords?: number;
    updates?: number;
    duplicates?: number;
    conflicts?: number;
    pending?: number;
    error?: string;
    status?: number;
    changeCounts?: Record<string, number>;
  };
}

export interface UsbScanResponse {
  usbPath: string;
  exchangeRoot: string;
  scannedFilesCount: number;
  pendingToImportCount: number;
  packages: ScannedPackageSummary[];
}

export interface ImportBatchInput {
  usbDrivePath?: string;
  passphrase?: string;
  filePathsToImport?: string[];
}

export interface ImportResultItem {
  filePath: string;
  fileName: string;
  packageId: string;
  success: boolean;
  applied: boolean;
  archivedTo: string;
  report?: unknown;
  error?: string;
}

export interface BatchImportResponse {
  success: boolean;
  backupCreated: string;
  totalFiles: number;
  importedFilesCount: number;
  failedFilesCount: number;
  results: ImportResultItem[];
}

export interface RevokeDeviceInput {
  deviceId: string;
  reason: string;
}

export interface RevokeDeviceResponse {
  success: boolean;
  revokedDeviceId: string;
  revokedAt: string;
}

export interface ReplaceDeviceInput {
  oldDeviceId: string;
  newUserId: string;
  reason: string;
  expiryDays?: number;
}

export interface ReplaceDeviceResponse {
  success: boolean;
  revokedDeviceId: string;
  newKit: CreateKitResponse;
}

// ==========================================
// CATÁLOGO DOCUMENTAL CURRICULAR 2026 (CEPRO_BD)
// ==========================================

export interface DocumentaryCompetencyIndicator {
  id: string;
  code: string;
  text: string;
  page: number;
}

export interface DocumentaryCompetency {
  id: string;
  type: 'UC' | 'CE' | 'TRANSVERSAL';
  code: string;
  title: string;
  description: string;
  page: number;
  indicators: DocumentaryCompetencyIndicator[];
}

export interface DocumentaryCapacityIndicator {
  id: string;
  code: string;
  text: string;
  page: number;
}

export interface DocumentaryCapacity {
  id: string;
  code: string;
  type: 'TECNICA' | 'EMPLEABILIDAD';
  competencyCode: string;
  title: string;
  page: number;
  indicators: DocumentaryCapacityIndicator[];
}

export interface DocumentaryUnit {
  id: string;
  code: string;
  name: string;
  type: 'UD' | 'EFSRT';
  capacityCodes: string[];
  creditsTheory: number;
  creditsPractice: number;
  creditsTotal: number;
  hoursTheory: number;
  hoursPractice: number;
  hoursTotal: number;
  startDate: string;
  endDate: string;
  observedStartDate?: string;
  observedEndDate?: string;
  page: number;
}

export interface DocumentaryModule {
  id: string;
  sourceId: string;
  code: string;
  number: string;
  name: string;
  periodId: string;
  hours: number;
  credits: number;
  efsrtHours: number;
  startDate: string;
  endDate: string;
  observedEndDate?: string;
  competenceSummary: string;
  capacities: DocumentaryCapacity[];
  units: DocumentaryUnit[];
}

export interface DocumentaryProgram {
  id: string;
  sourceCode: string;
  careerKey: string;
  name: string;
  sector: string;
  family: string;
  economicActivity: string;
  codigoProgramaFuente: string;
  codigoModularObservado: string;
  codigoModularActivo: string;
  nivelFormativo: string;
  modalidad: string;
  totalHoursDeclared: number;
  totalHoursItinerary: number;
  totalCreditsDeclared: number;
  efsrtHoursTotal: number;
  statusCompleteness: 'COMPLETO' | 'CON_OBSERVACIONES' | 'PARCIAL';
  pageRange: string;
  graduateProfile: string;
  performanceAreas: string[];
  teachersDocumented: string[];
  observations: string[];
  competencies: DocumentaryCompetency[];
  modules: DocumentaryModule[];
}

export interface DocumentaryIssue {
  id: string;
  code: string;
  programId: string;
  programCode: string;
  moduleId?: string;
  severity: 'ALTA' | 'MEDIA' | 'BAJA' | 'CUARENTENA' | 'BLOQUE_PARCIAL';
  category: string;
  title: string;
  description: string;
  pagePdf: string;
  fieldPath: string;
  observedPdfValue: string;
  activeOperationalValue: string;
  status: 'CORREGIDO_OPERATIVO' | 'PENDIENTE_REVISION' | 'EN_CUARENTENA' | 'BLOQUE_PARCIAL';
  canApplyObserved?: boolean;
  resolutionNote?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface DocumentaryParameter {
  id: string;
  category: string;
  name: string;
  value: string;
  sourceStatus: 'DOCUMENTADO' | 'POR_DEFECTO_NORMATIVO' | 'PENDIENTE_DEFINICION';
  description: string;
}

export interface DocumentaryQuarantineItem {
  id: string;
  programId: string;
  pagePdf: string;
  title: string;
  detectedContent: string;
  reason: string;
  enabledForImport: boolean;
}

export interface DocumentaryCatalogResponse {
  year: string;
  stats: {
    programsCount: number;
    modulesCount: number;
    capacitiesCount: number;
    capacityIndicatorsCount: number;
    competencyIndicatorsCount: number;
    pdfPagesEvaluated: number;
    pendingIssuesCount: number;
    resolvedIssuesCount: number;
  };
  programs: DocumentaryProgram[];
  issues: DocumentaryIssue[];
  parameters: DocumentaryParameter[];
  quarantine: DocumentaryQuarantineItem[];
}




/** Portable, capability-driven synchronization shared by every profile. */
export interface SyncTransferCapabilities {
  role: UserRole;
  modules: { id: string; label: string; description: string; canExport: boolean; canImport: boolean }[];
  recipients: { id: string; name: string; role: UserRole }[];
  importPolicy: string;
  passphraseRequired: boolean;
}
export interface SyncTransferSummary {
  module: string;
  label: string;
  total: number;
  counts: Record<string, number>;
  dependencies?: Record<string, number>;
  sender: { id: string; name: string; role: UserRole };
  recipient: { id: string; name: string; role: UserRole } | null;
}
export interface SyncTransferExportInput {
  syncModule: string;
  recipientUserId?: string;
  passphrase: string;
  groupId?: string;
  unit?: string;
  channel: 'WHATSAPP' | 'USB';
}
export interface SyncTransferExportResponse {
  package: unknown;
  tokenText?: string | null;
  shareText?: string;
  message?: string;
  summary: SyncTransferSummary;
  fileName: string;
  instructions: string;
}
export interface SyncTransferPreviewInput {
  tokenText?: string;
  package?: unknown;
  passphrase: string;
}
export interface SyncTransferPreviewResponse {
  previewToken: string;
  report: SyncPreviewReport;
  summary: SyncTransferSummary;
}
export interface SyncTransferImportResponse {
  report: SyncPreviewReport;
  summary: SyncTransferSummary;
}
