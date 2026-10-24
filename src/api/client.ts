/**
 * api/client.ts
 * 
 * Cliente HTTP tipado para CEPRO_MICAELA 2.0.
 * Conecta con el backend loopback local autenticado respetando:
 * - Authorization: Bearer <token>
 * - Content-Type: application/json
 * - Manejo seguro de errores 401 (sesión expirada) y 403 (no autorizado).
 * - Cero logging de credenciales o tokens en consola.
 */

import {
  SystemStatus,
  LoginPayload,
  LoginResponse,
  PublicUser,
  LogoutResponse,
  ApiError,
  WorkspaceOptionsResponse,
  SelectWorkspacePayload,
  WorkspaceContext,
  DashboardResponse,
  SaveAttendancePayload,
  AttendanceRecord,
  SaveGradesPayload,
  GradeRecord,
  DocumentConfigurationResponse,
  SaveDocumentConfigurationPayload,
  DocumentSettingRecord,
  DocumentRequestPayload,
  DocumentPreflightResponse,
  DocumentPdfPayload,
  DocumentSubmission,
  DocumentSubmitPayload,
  DocumentReviewPayload,
  SimulateUnitAttendancePayload,
  SimulateUnitAttendanceResponse,
  StudentItem,
  StudentEnrollmentItem,
  DashboardGroup,
  SaveStudentPayload,
  ArchiveStudentPayload,
  EnrollPayload,
  RetireEnrollmentPayload,
  CorrectModuleEnrollmentPayload,
  SaveGroupPayload,
  ClosureGroupPayload,
  SaveUserPayload,
  ArchiveUserPayload,
  ChangePasswordPayload,
  AcademicConfigurationResponse,
  CloneYearPayload,
  CloneYearResponse,
  ApplyReferencePayload,
  ExchangeExportPayload,
  ExchangeExportResponse,
  SyncPreviewReport,
  ResolveConflictPayload,
  DeviceRequestResponse,
  ProvisionPayload,
  ProvisionResponse,
  AcceptProvisionPayload,
  BackupItem,
  CreateBackupPayload,
  CreateBackupResponse,
  ExportEncryptedBackupPayload,
  ExportEncryptedBackupResponse,
  InspectBackupPayload,
  InspectBackupResponse,
  RestoreBackupPayload,
  RestoreBackupResponse,
  DatabaseHealthResponse,
  SetupInstitutionPayload,
  SetupInstitutionResponse,
} from './types';

const TOKEN_KEY = 'cetpro_session_token';

class ApiClient {
  private token: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  constructor() {
    // Recuperar token almacenado en sessionStorage si existe
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        this.token = window.sessionStorage.getItem(TOKEN_KEY);
      } catch {
        this.token = null;
      }
    }
  }

  public setOnUnauthorized(callback: () => void): void {
    this.onUnauthorizedCallback = callback;
  }

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        if (token) {
          window.sessionStorage.setItem(TOKEN_KEY, token);
        } else {
          window.sessionStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        // Fallback silencioso en entornos restringidos
      }
    }
  }

  public getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.electronAPI && typeof win.electronAPI.getBackendUrl === 'function') {
        const url = win.electronAPI.getBackendUrl();
        if (url) return url;
      }
      if (win.__CETPRO_BACKEND_URL__) {
        return win.__CETPRO_BACKEND_URL__;
      }
    }
    return '';
  }

  public getInstanceSecret(): string | null {
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.electronAPI && typeof win.electronAPI.getInstanceSecret === 'function') {
        const secret = win.electronAPI.getInstanceSecret();
        if (secret) return secret;
      }
      if (win.__CETPRO_INSTANCE_SECRET__) {
        return win.__CETPRO_INSTANCE_SECRET__;
      }
    }
    return null;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    requireAuth = true,
    signal?: AbortSignal
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    const instanceSecret = this.getInstanceSecret();
    if (instanceSecret) {
      headers['X-CETPRO-Instance-Secret'] = instanceSecret;
    }

    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }

    if (requireAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      const fullUrl = `${this.getBaseUrl()}${path}`;
      response = await fetch(fullUrl, {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
        signal,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Error de conexión con el servicio local';
      const netError: ApiError = {
        error: `No se pudo comunicar con el servidor local (${message}). Verifique que el servicio esté activo.`,
        status: 0,
      };
      throw netError;
    }

    // Manejo de expiración o invalidación de sesión
    if (response.status === 401) {
      if (requireAuth) {
        this.setToken(null);
        if (this.onUnauthorizedCallback) {
          this.onUnauthorizedCallback();
        }
      }
      let errData: { error?: string } = {};
      try {
        errData = await response.json();
      } catch {
        // Ignorar fallo de parseo JSON
      }
      const apiError: ApiError = {
        error: errData.error || 'Sesión expirada o credenciales inválidas.',
        status: 401,
      };
      throw apiError;
    }

    if (!response.ok) {
      let errData: { error?: string } = {};
      try {
        errData = await response.json();
      } catch {
        // Ignorar fallo de parseo
      }
      let errorMsg = errData.error;
      if (!errorMsg) {
        if (response.status === 502 || response.status === 504) {
          errorMsg = 'El servidor backend de desarrollo (127.0.0.1:8085) no está en ejecución. Inicie el servicio ejecutando: npm run dev:backend';
        } else {
          errorMsg = `Error del servidor local (HTTP ${response.status})`;
        }
      }
      const apiError: ApiError = {
        error: errorMsg,
        status: response.status,
      };
      throw apiError;
    }

    return (await response.json()) as T;
  }

  private async requestBlob(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    requireAuth = true,
    signal?: AbortSignal
  ): Promise<Blob> {
    const headers: Record<string, string> = {
      'Accept': 'application/pdf, application/json',
    };

    const instanceSecret = this.getInstanceSecret();
    if (instanceSecret) {
      headers['X-CETPRO-Instance-Secret'] = instanceSecret;
    }

    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }

    if (requireAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      const fullUrl = `${this.getBaseUrl()}${path}`;
      response = await fetch(fullUrl, {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
        signal,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Error de conexión con el servicio local';
      const netError: ApiError = {
        error: `No se pudo comunicar con el servidor local (${message}). Verifique que el servicio esté activo.`,
        status: 0,
      };
      throw netError;
    }

    if (response.status === 401) {
      if (requireAuth) {
        this.setToken(null);
        if (this.onUnauthorizedCallback) {
          this.onUnauthorizedCallback();
        }
      }
      let errData: { error?: string } = {};
      try {
        errData = await response.json();
      } catch {
        // Ignorar fallo de parseo
      }
      const apiError: ApiError = {
        error: errData.error || 'Sesión expirada o credenciales inválidas.',
        status: 401,
      };
      throw apiError;
    }

    if (!response.ok) {
      let errData: { error?: string } = {};
      try {
        errData = await response.json();
      } catch {
        // Ignorar fallo de parseo
      }
      let errorMsg = errData.error;
      if (!errorMsg) {
        errorMsg = `Error del servidor local (HTTP ${response.status})`;
      }
      const apiError: ApiError = {
        error: errorMsg,
        status: response.status,
      };
      throw apiError;
    }

    return await response.blob();
  }

  /**
   * Consulta el estado del nodo y si la institución está inicializada.
   */
  public async getStatus(): Promise<SystemStatus> {
    return this.request<SystemStatus>('GET', '/api/status', undefined, false);
  }

  /**
   * Configuración inicial institucional del equipo (primer arranque).
   */
  public async setupInstitution(payload: SetupInstitutionPayload): Promise<SetupInstitutionResponse> {
    return this.request<SetupInstitutionResponse>('POST', '/api/setup', payload, false);
  }

  /**
   * Autenticación oficial del sistema. Retorna token y usuario.
   */
  public async login(credentials: LoginPayload): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>(
      'POST',
      '/api/login',
      credentials,
      false
    );
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  /**
   * Recupera el perfil del usuario autenticado actualmente.
   */
  public async getMe(): Promise<PublicUser> {
    return this.request<PublicUser>('GET', '/api/me', undefined, true);
  }

  /**
   * Cierra formalmente la sesión en el backend e invalida el token local.
   */
  public async logout(): Promise<LogoutResponse> {
    try {
      if (this.token) {
        return await this.request<LogoutResponse>('POST', '/api/logout', {}, true);
      }
      return { success: true };
    } finally {
      this.setToken(null);
    }
  }

  /**
   * Consulta las opciones y contextos académicos autorizados según el rol del usuario.
   */
  public async getWorkspaceOptions(): Promise<WorkspaceOptionsResponse> {
    return this.request<WorkspaceOptionsResponse>('GET', '/api/workspace/options', undefined, true);
  }

  /**
   * Establece el contexto académico activo para la sesión (año, carrera, módulo, aula, unidad).
   */
  public async selectWorkspace(payload: SelectWorkspacePayload): Promise<WorkspaceContext> {
    return this.request<WorkspaceContext>('POST', '/api/workspace', payload, true);
  }

  /**
   * Obtiene la información académica agregada para el panel correspondiente
   * en función del workspace seleccionado en la sesión o en vista global overview.
   */
  public async getDashboard(signal?: AbortSignal, overview = false): Promise<DashboardResponse> {
    const endpoint = overview ? '/api/dashboard?overview=1' : '/api/dashboard';
    return this.request<DashboardResponse>('GET', endpoint, undefined, true, signal);
  }

  /**
   * Registra y guarda la asistencia ordinaria de una sesión académica (POST /api/attendance).
   */
  public async saveAttendance(payload: SaveAttendancePayload): Promise<AttendanceRecord[]> {
    return this.request<AttendanceRecord[]>('POST', '/api/attendance', payload, true);
  }

  /**
   * Registra y guarda calificaciones de evaluación académica (POST /api/grades).
   */
  public async saveGrades(payload: SaveGradesPayload): Promise<GradeRecord[]> {
    return this.request<GradeRecord[]>('POST', '/api/grades', payload, true);
  }

  /**
   * Consulta la configuración documental e indicadores de las unidades didácticas.
   */
  public async getDocumentConfiguration(): Promise<DocumentConfigurationResponse> {
    return this.request<DocumentConfigurationResponse>('GET', '/api/document/configuration', undefined, true);
  }

  /**
   * Guarda o actualiza los parámetros documentales autorizados (POST /api/document/configuration).
   */
  public async saveDocumentConfiguration(
    payload: SaveDocumentConfigurationPayload
  ): Promise<DocumentSettingRecord> {
    return this.request<DocumentSettingRecord>('POST', '/api/document/configuration', payload, true);
  }

  /**
   * Inspecciona los parámetros requeridos y la validación preflight de un documento institucional (POST /api/document).
   */
  public async getDocumentPreflight(payload: DocumentRequestPayload): Promise<DocumentPreflightResponse> {
    return this.request<DocumentPreflightResponse>('POST', '/api/document', payload, true);
  }

  /**
   * Genera el archivo binario PDF mediante el motor original de CEPRO_MICAELA (POST /api/document/pdf).
   */
  public async getDocumentPdf(payload: DocumentPdfPayload): Promise<Blob> {
    return this.requestBlob('POST', '/api/document/pdf', payload, true);
  }

  /**
   * Simula marcas completas de asistencia en modo de prueba sintética (POST /api/attendance/simulate-unit).
   */
  public async simulateUnitAttendance(payload: SimulateUnitAttendancePayload): Promise<SimulateUnitAttendanceResponse> {
    return this.request<SimulateUnitAttendanceResponse>('POST', '/api/attendance/simulate-unit', payload, true);
  }

  /**
   * Limpia marcas simuladas de asistencia en la unidad activa (POST /api/attendance/clear-unit).
   */
  public async clearUnitAttendance(payload: { groupId: string; unit: string }): Promise<{ clearedCount: number }> {
    return this.request<{ clearedCount: number }>('POST', '/api/attendance/clear-unit', payload, true);
  }

  /**
   * Registra formalmente una entrega de documento oficial con preflight completo (POST /api/document/submit).
   */
  public async submitDocument(payload: DocumentSubmitPayload): Promise<DocumentSubmission> {
    return this.request<DocumentSubmission>('POST', '/api/document/submit', payload, true);
  }

  /**
   * Recupera la copia custodial exacta del PDF correspondiente a una entrega registrada (POST /api/document/submission-pdf).
   */
  public async getSubmissionPdf(submissionId: string): Promise<Blob> {
    return this.requestBlob('POST', '/api/document/submission-pdf', { id: submissionId }, true);
  }

  /**
   * Registra una revisión o dictamen institucional sobre una entrega existente (POST /api/document/review).
   */
  public async reviewDocument(payload: DocumentReviewPayload): Promise<DocumentSubmission> {
    return this.request<DocumentSubmission>('POST', '/api/document/review', payload, true);
  }

  /**
   * Registra o actualiza la ficha de un estudiante en el sistema (POST /api/students).
   */
  public async saveStudent(payload: SaveStudentPayload): Promise<StudentItem> {
    return this.request<StudentItem>('POST', '/api/students', payload, true);
  }

  /**
   * Archiva un estudiante conservando su historial académico (POST /api/students/archive).
   */
  public async archiveStudent(payload: ArchiveStudentPayload): Promise<StudentItem> {
    return this.request<StudentItem>('POST', '/api/students/archive', payload, true);
  }

  /**
   * Registra formalmente una matrícula en un grupo/aula autorizada (POST /api/enrollments).
   */
  public async enroll(payload: EnrollPayload): Promise<StudentEnrollmentItem> {
    return this.request<StudentEnrollmentItem>('POST', '/api/enrollments', payload, true);
  }

  /**
   * Retira una matrícula activa o traslada al estudiante a otro grupo (POST /api/enrollments/retire).
   */
  public async retireEnrollment(payload: RetireEnrollmentPayload): Promise<StudentEnrollmentItem> {
    return this.request<StudentEnrollmentItem>('POST', '/api/enrollments/retire', payload, true);
  }

  /**
   * Corrige la pertenencia de una matrícula a un módulo (CONFIRM, EXCLUDE, RESTORE) (POST /api/enrollments/module).
   */
  public async correctModuleEnrollment(payload: CorrectModuleEnrollmentPayload): Promise<StudentEnrollmentItem> {
    return this.request<StudentEnrollmentItem>('POST', '/api/enrollments/module', payload, true);
  }

  /**
   * Crea o actualiza la configuración de un grupo/aula institucional (POST /api/groups).
   */
  public async saveGroup(payload: SaveGroupPayload): Promise<DashboardGroup> {
    return this.request<DashboardGroup>('POST', '/api/groups', payload, true);
  }

  /**
   * Cierra o reabre formalmente un grupo académico con motivo auditado (POST /api/closure).
   */
  public async closureGroup(payload: ClosureGroupPayload): Promise<DashboardGroup> {
    return this.request<DashboardGroup>('POST', '/api/closure', payload, true);
  }

  /**
   * Consulta el directorio de usuarios institucional (GET /api/users).
   * @param contextual Si es true, filtra por el contexto académico actual (?context=1)
   */
  public async getUsers(contextual = false): Promise<PublicUser[]> {
    const query = contextual ? '?context=1' : '';
    return this.request<PublicUser[]>('GET', `/api/users${query}`, undefined, true);
  }

  /**
   * Registra o actualiza una cuenta de usuario institucional (POST /api/users).
   */
  public async saveUser(payload: SaveUserPayload): Promise<PublicUser> {
    return this.request<PublicUser>('POST', '/api/users', payload, true);
  }

  /**
   * Archiva una cuenta de usuario con motivo auditable (POST /api/users/archive).
   */
  public async archiveUser(payload: ArchiveUserPayload): Promise<PublicUser> {
    return this.request<PublicUser>('POST', '/api/users/archive', payload, true);
  }

  /**
   * Cambia la contraseña del usuario actualmente autenticado (POST /api/password).
   */
  public async changePassword(payload: ChangePasswordPayload): Promise<{ success: boolean; pending?: boolean }> {
    return this.request<{ success: boolean; pending?: boolean }>('POST', '/api/password', payload, true);
  }

  /**
   * Consulta la configuración académica por año, periodos, planes curriculares y personal (GET /api/academic/configuration).
   */
  public async getAcademicConfiguration(): Promise<AcademicConfigurationResponse> {
    return this.request<AcademicConfigurationResponse>('GET', '/api/academic/configuration', undefined, true);
  }

  /**
   * Clona un año académico completo a uno nuevo (POST /api/academic/year).
   */
  public async cloneAcademicYear(payload: CloneYearPayload): Promise<CloneYearResponse> {
    return this.request<CloneYearResponse>('POST', '/api/academic/year', payload, true);
  }

  /**
   * Aplica los valores de referencia al plan curricular de un módulo (POST /api/academic/reference/apply).
   */
  public async applyReferenceDefaults(payload: ApplyReferencePayload): Promise<{ success: boolean; message?: string }> {
    return this.request<{ success: boolean; message?: string }>('POST', '/api/academic/reference/apply', payload, true);
  }

  // ==========================================
  // OPERACIONES DE SINCRONIZACIÓN Y TRANSFERENCIA (TAREA 34)
  // ==========================================

  /**
   * Exporta un paquete portátil .cetpro protegido con clave scrypt + firma Ed25519 (POST /api/exchange/export).
   */
  public async exportExchange(payload: ExchangeExportPayload): Promise<ExchangeExportResponse> {
    return this.request<ExchangeExportResponse>('POST', '/api/exchange/export', payload, true);
  }

  /**
   * Genera una vista previa del paquete de intercambio sin aplicar escrituras (POST /api/exchange/preview).
   */
  public async previewExchange(payload: { package: unknown; passphrase?: string }): Promise<SyncPreviewReport> {
    return this.request<SyncPreviewReport>('POST', '/api/exchange/preview', payload, true);
  }

  /**
   * Aplica un paquete de intercambio con respaldo previo automático 'antes-sincronizar' (POST /api/exchange/import).
   */
  public async importExchange(payload: { package: unknown; passphrase?: string }): Promise<SyncPreviewReport> {
    return this.request<SyncPreviewReport>('POST', '/api/exchange/import', payload, true);
  }

  /**
   * Exporta un lote asimétrico para un equipo vinculado específico (POST /api/sync/export).
   */
  public async exportSync(payload: { deviceId: string }): Promise<{ body: unknown; signature: string }> {
    return this.request<{ body: unknown; signature: string }>('POST', '/api/sync/export', payload, true);
  }

  /**
   * Previsualiza un lote asimétrico de equipo vinculado (POST /api/sync/preview).
   */
  public async previewSync(payload: { package: unknown }): Promise<SyncPreviewReport> {
    return this.request<SyncPreviewReport>('POST', '/api/sync/preview', payload, true);
  }

  /**
   * Aplica un lote asimétrico de sincronización con respaldo previo (POST /api/sync/import).
   */
  public async importSync(payload: { package: unknown }): Promise<SyncPreviewReport> {
    return this.request<SyncPreviewReport>('POST', '/api/sync/import', payload, true);
  }

  /**
   * Resuelve formalmente un conflicto retenido con respaldo previo y motivo auditable (POST /api/conflicts/resolve).
   */
  public async resolveConflict(payload: ResolveConflictPayload): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('POST', '/api/conflicts/resolve', payload, true);
  }

  /**
   * Obtiene la solicitud de vinculación del equipo actual (GET /api/device-request).
   */
  public async getDeviceRequest(): Promise<DeviceRequestResponse> {
    return this.request<DeviceRequestResponse>('GET', '/api/device-request', undefined, false);
  }

  /**
   * Vincula un nuevo equipo cliente asignándole una cuenta (POST /api/provision).
   */
  public async provisionDevice(payload: ProvisionPayload): Promise<ProvisionResponse> {
    return this.request<ProvisionResponse>('POST', '/api/provision', payload, true);
  }

  /**
   * Aplica un paquete de vinculación institucional en el equipo cliente (POST /api/provision/accept).
   */
  public async acceptProvision(payload: AcceptProvisionPayload): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('POST', '/api/provision/accept', payload, false);
  }

  // ==========================================
  // OPERACIONES DE RESPALDO Y RESTAURACIÓN (TAREA 36)
  // ==========================================

  /**
   * Consulta el listado de respaldos disponibles en el servidor local (GET /api/backups).
   */
  public async listBackups(): Promise<BackupItem[]> {
    return this.request<BackupItem[]>('GET', '/api/backups', undefined, true);
  }

  /**
   * Genera un respaldo manual o automático de la base de datos institucional (POST /api/backup).
   */
  public async createBackup(payload?: CreateBackupPayload): Promise<CreateBackupResponse> {
    return this.request<CreateBackupResponse>('POST', '/api/backup', payload || {}, true);
  }

  /**
   * Exporta un respaldo cifrado portátil (.cetpro-backup) protegido con contraseña (POST /api/backup/export-encrypted).
   */
  public async exportEncryptedBackup(payload: ExportEncryptedBackupPayload): Promise<ExportEncryptedBackupResponse> {
    return this.request<ExportEncryptedBackupResponse>('POST', '/api/backup/export-encrypted', payload, true);
  }

  /**
   * Inspecciona y valida la integridad de un archivo de respaldo (POST /api/backup/inspect).
   */
  public async inspectBackup(payload: InspectBackupPayload): Promise<InspectBackupResponse> {
    return this.request<InspectBackupResponse>('POST', '/api/backup/inspect', payload, true);
  }

  /**
   * Restaura la base de datos institucional a partir de un respaldo verificado (POST /api/restore).
   */
  public async restoreBackup(payload: RestoreBackupPayload): Promise<RestoreBackupResponse> {
    return this.request<RestoreBackupResponse>('POST', '/api/restore', payload, true);
  }

  /**
   * Consulta el estado de salud e integridad física y lógica de la base SQLite (GET /api/database/health).
   */
  public async getDatabaseHealth(): Promise<DatabaseHealthResponse> {
    return this.request<DatabaseHealthResponse>('GET', '/api/database/health', undefined, true);
  }

  /**
   * Descarga un archivo de respaldo como Blob (GET /api/backup/download?filename=...).
   */
  public async downloadBackupFile(filename: string): Promise<Blob> {
    const url = `${this.getBaseUrl()}/api/backup/download?filename=${encodeURIComponent(filename)}`;
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      let msg = 'Error al descargar el archivo de respaldo.';
      try {
        const errJson = await res.json();
        msg = errJson.error || msg;
      } catch {}
      throw new Error(msg);
    }
    return res.blob();
  }
}

export const apiClient = new ApiClient();
export default apiClient;
