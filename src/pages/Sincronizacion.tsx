/**
 * src/pages/Sincronizacion.tsx
 * 
 * Módulo de Compartir entre equipos Académica — CEPRO_MICAELA 2.0.
 * Operación 100% offline-first mediante paquetes seguros de intercambio (.cetpro)
 * y sincronización asimétrica de equipos vinculados:
 * - Cifrado robusto scrypt + AES-256-GCM para intercambio USB portátil con clave.
 * - Firma digital Ed25519 con verificación estricta de certificados institucionales.
 * - Respaldo SQLite automático previo ('antes-sincronizar' y 'antes-resolver-conflicto').
 * - Prevención de duplicados mediante tabla SQLite receipts.
 * - Detección y conciliación de conflictos con auditoría y decisión de Dirección.
 * - Cumplimiento RBAC estricto según rol:
 *   * DOCENTE: exporta/importa únicamente sus aulas y unidades asignadas hacia Dirección/Secretaría.
 *   * SECRETARIA: prepara paquetes por docente o institucionales; recibe y verifica paquetes.
 *   * DIRECTOR: control total, vinculación de equipos cliente y resolución de conflictos.
 * - Identidad visual Google Stitch (#13594A, #0D3E34, #F6F8FA).
 */

import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  DashboardResponse,
  PublicUser,
  ConflictItem,
  SyncDeviceItem,
  ExchangeExportResponse,
  SyncPreviewReport,
  DeviceRequestResponse,
  ProvisionResponse,
  ApiError,
} from '../api/types';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import {
  SyncIcon,
  UsbIcon,
  DownloadIcon,
  UploadIcon,
  LockIcon,
  KeyIcon,
  EyeIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  LaptopIcon,
  GroupsIcon,
  StudentsIcon,
  AccountsIcon,
} from '../components/ui/Icons';

import { SyncTransferPanel } from '../components/network/SyncTransferPanel';
import { DirectorNetworkPanel } from '../components/network/DirectorNetworkPanel';
import { DocenteSyncPanel } from '../components/network/DocenteSyncPanel';
import { SecretariaSyncPanel } from '../components/network/SecretariaSyncPanel';

interface SincronizacionProps {
  onNavigate?: (route: NavRoute) => void;
}

type MainTab = 'network' | 'exchange' | 'devices' | 'conflicts';
type ExchangeSubTab = 'send' | 'receive';

const ENTITY_LABELS: Record<string, string> = {
  students: 'Estudiantes',
  enrollments: 'Matrículas',
  grades: 'Calificaciones y Notas',
  attendance: 'Registros de Asistencia',
  groups: 'Aulas y Grupos',
  programs: 'Programas de Estudio',
  modules: 'Módulos Formativos',
  documentSettings: 'Configuración Documental',
  documentSubmissions: 'Entregas y Actas Oficiales',
  userDirectory: 'Directorio de Usuarios',
  accountRequests: 'Solicitudes de Cuenta',
  studentRequests: 'Solicitudes de Estudiantes',
};

function generateSecurePassphrase(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function formatDate(isoString?: string | null): string {
  if (!isoString) return 'No registrada';
  try {
    const d = new Date(isoString);
    if (!Number.isFinite(d.getTime())) return 'Fecha no válida';
    return d.toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export const Sincronizacion: React.FC<SincronizacionProps> = ({ onNavigate }) => {
  const { user, systemStatus } = useAuth();
  const isTeacher = user?.role === 'DOCENTE';
  const isDirector = user?.role === 'DIRECTOR';
  const isSecretary = user?.role === 'SECRETARIA';
  const isAdmin = isDirector || isSecretary;

  // Estado general
  const [activeTab, setActiveTab] = useState<MainTab>('network');
  const [exchangeSubTab, setExchangeSubTab] = useState<ExchangeSubTab>('send');
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [usersList, setUsersList] = useState<PublicUser[]>([]);

  // Estado pestaña Enviar mis datos (Export)
  const [exportRecipientId, setExportRecipientId] = useState<string>('');
  const [exportGroupId, setExportGroupId] = useState<string>('');
  const [exportIncludeAccounts, setExportIncludeAccounts] = useState<boolean>(false);
  const [exportPassphrase, setExportPassphrase] = useState<string>(() => generateSecurePassphrase());
  const [showExportPassphrase, setShowExportPassphrase] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<ExchangeExportResponse | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Estado pestaña Recibir archivo (Import)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePackage, setFilePackage] = useState<any | null>(null);
  const [receivePassphrase, setReceivePassphrase] = useState<string>('');
  const [showReceivePassphrase, setShowReceivePassphrase] = useState<boolean>(false);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [previewReport, setPreviewReport] = useState<SyncPreviewReport | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<SyncPreviewReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Estado pestaña Conflictos (Solo Director)
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [conflictReasons, setConflictReasons] = useState<Record<string, string>>({});
  const [conflictFeedback, setConflictFeedback] = useState<Record<string, { type: 'success' | 'error'; message: string }>>({});

  // Estado pestaña Equipos Vinculados (Admin)
  const [deviceRequestJson, setDeviceRequestJson] = useState<string>('');
  const [provisionUserId, setProvisionUserId] = useState<string>('');
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionResponse | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [myDeviceRequest, setMyDeviceRequest] = useState<DeviceRequestResponse | null>(null);
  const [isExportingSyncId, setIsExportingSyncId] = useState<string | null>(null);

  // Carga de datos
  const loadData = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const data = await apiClient.getDashboard(undefined, true);
      setDashboardData(data);

      if (!isTeacher) {
        try {
          const users = await apiClient.getUsers();
          setUsersList(users);
        } catch {
          // Si falla listUsers, continúa con lo que hay
        }
      }
    } catch (err: any) {
      console.error('Error al cargar datos de sincronización:', err);
    } finally {
      setLoadingDashboard(false);
    }
  }, [isTeacher]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejo de exportación de paquete USB
  const handleExportExchange = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      if (exportPassphrase.trim().length < 8) {
        throw new Error('La clave que protege el archivo debe contener al menos 8 caracteres.');
      }

      const payload = {
        recipientUserId: isTeacher ? undefined : (exportRecipientId.trim() || undefined),
        groupId: exportGroupId.trim() || undefined,
        includeAccounts: !isTeacher && exportIncludeAccounts,
        passphrase: exportPassphrase.trim(),
      };

      const result = await apiClient.exportExchange(payload);
      setExportSuccess(result);

      // Disparar descarga automática del archivo .cetpro
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `CETPRO_AULAS_${(user?.username || 'usuario').toUpperCase()}_${new Date().toISOString().slice(0, 10)}.cetpro`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err?.error || err?.message || 'Error al exportar el archivo de sincronización.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyPassphrase = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(exportPassphrase);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  // Manejo de selección de archivo a recibir
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPreviewReport(null);
    setPreviewError(null);
    setImportSuccess(null);
    setImportError(null);

    if (!file) {
      setSelectedFile(null);
      setFilePackage(null);
      return;
    }

    if (file.size > 32 * 1024 * 1024) {
      setPreviewError('El archivo es demasiado grande (máximo 32 MB permitido).');
      setSelectedFile(null);
      setFilePackage(null);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!['SYNC', 'GROUP_EXCHANGE'].includes(parsed.body?.type)) {
          throw new Error('El archivo no corresponde a un paquete de actualización CETPRO (.cetpro).');
        }
        setFilePackage(parsed);
      } catch (err: any) {
        setPreviewError(err?.error || err?.message || 'El formato del archivo no es un JSON válido.');
        setFilePackage(null);
      }
    };
    reader.onerror = () => {
      setPreviewError('Error al leer el archivo desde el dispositivo.');
      setFilePackage(null);
    };
    reader.readAsText(file);
  };

  // Previsualización del archivo recibido
  const handlePreviewPackage = async () => {
    if (!filePackage) {
      setPreviewError('Seleccione primero el archivo .cetpro que le entregaron.');
      return;
    }

    setIsPreviewing(true);
    setPreviewError(null);
    setPreviewReport(null);
    setImportSuccess(null);
    setImportError(null);

    try {
      const isPortable = filePackage.body?.type === 'GROUP_EXCHANGE';
      if (isPortable && !receivePassphrase.trim()) {
        throw new Error('Ingrese la clave que le entregaron junto con el archivo.');
      }

      const report = isPortable
        ? await apiClient.previewExchange({ package: filePackage, passphrase: receivePassphrase.trim() })
        : await apiClient.previewSync({ package: filePackage });

      setPreviewReport(report);
    } catch (err: any) {
      setPreviewError(err?.error || err?.message || 'No se pudo verificar el archivo. Compruebe la clave o el remitente.');
    } finally {
      setIsPreviewing(false);
    }
  };

  // Aplicación definitiva del archivo recibido
  const handleApplyPackage = async () => {
    if (!filePackage) return;

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const isPortable = filePackage.body?.type === 'GROUP_EXCHANGE';
      const result = isPortable
        ? await apiClient.importExchange({ package: filePackage, passphrase: receivePassphrase.trim() })
        : await apiClient.importSync({ package: filePackage });

      setImportSuccess(result);
      setPreviewReport(null);
      setSelectedFile(null);
      setFilePackage(null);
      setReceivePassphrase('');

      // Recargar datos actualizados
      await loadData();
    } catch (err: any) {
      setImportError(err?.error || err?.message || 'Error al aplicar los datos recibidos.');
    } finally {
      setIsImporting(false);
    }
  };

  // Resolución de conflictos (Director)
  const handleResolveConflict = async (conflict: ConflictItem, action: 'KEEP_LOCAL' | 'ACCEPT_INCOMING') => {
    const reason = (conflictReasons[conflict.id] || '').trim();
    if (!reason) {
      setConflictFeedback(prev => ({
        ...prev,
        [conflict.id]: { type: 'error', message: 'Debe ingresar un motivo obligatorio para auditar la decisión.' },
      }));
      return;
    }

    setResolvingId(conflict.id);
    setConflictFeedback(prev => ({ ...prev, [conflict.id]: undefined as any }));

    try {
      await apiClient.resolveConflict({
        id: conflict.id,
        action,
        reason,
        currentRev: conflict.current?.rev || null,
      });

      setConflictFeedback(prev => ({
        ...prev,
        [conflict.id]: {
          type: 'success',
          message: action === 'KEEP_LOCAL' ? 'Registro local conservado con éxito.' : 'Valor entrante aplicado formalmente.',
        },
      }));

      // Limpiar motivo y refrescar datos
      setConflictReasons(prev => {
        const next = { ...prev };
        delete next[conflict.id];
        return next;
      });
      await loadData();
    } catch (err: any) {
      setConflictFeedback(prev => ({
        ...prev,
        [conflict.id]: { type: 'error', message: err?.error || err?.message || 'Error al resolver el conflicto.' },
      }));
    } finally {
      setResolvingId(null);
    }
  };

  // Exportar paquete asimétrico para equipo vinculado
  const handleExportSyncForDevice = async (deviceId: string, deviceName?: string) => {
    setIsExportingSyncId(deviceId);
    try {
      const result = await apiClient.exportSync({ deviceId });
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CETPRO_SYNC_${(deviceName || deviceId).replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.cetpro`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error al generar paquete de sincronización: ${err?.error || err?.message || err}`);
    } finally {
      setIsExportingSyncId(null);
    }
  };

  // Obtener la solicitud de este equipo
  const handleGenerateMyDeviceRequest = async () => {
    try {
      const req = await apiClient.getDeviceRequest();
      setMyDeviceRequest(req);
      const blob = new Blob([JSON.stringify(req, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SOLICITUD_VINCULACION_${req.id.slice(0, 8)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error al generar solicitud: ${err?.error || err?.message || err}`);
    }
  };

  // Director: autorizar y aprovisionar equipo cliente
  const handleProvisionDevice = async () => {
    setIsProvisioning(true);
    setProvisionError(null);
    setProvisionResult(null);

    try {
      if (!provisionUserId) {
        throw new Error('Seleccione la cuenta a asignar a este equipo.');
      }
      if (!deviceRequestJson.trim()) {
        throw new Error('Pegue el archivo JSON de la solicitud de vinculación.');
      }

      let parsedRequest: any;
      try {
        parsedRequest = JSON.parse(deviceRequestJson.trim());
      } catch {
        throw new Error('El texto ingresado no es un JSON válido.');
      }

      const res = await apiClient.provisionDevice({
        userId: provisionUserId,
        request: parsedRequest,
      });

      setProvisionResult(res);
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AUTORIZACION_VINCULACION_${res.body.to.slice(0, 8)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await loadData();
    } catch (err: any) {
      setProvisionError(err?.error || err?.message || 'Error al autorizar el equipo.');
    } finally {
      setIsProvisioning(false);
    }
  };

  const conflictsList = useMemo(() => {
    return (dashboardData?.conflicts || []).filter(c => !c.resolved);
  }, [dashboardData?.conflicts]);

  const teacherUsers = useMemo(() => {
    return usersList.filter(u => u.role === 'DOCENTE');
  }, [usersList]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      {/* Cabecera institucional */}
      <DashboardPhotoBand as="header" scene="transferencia" contentClassName="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 rounded-[10px] bg-brand-soft text-brand border border-line flex items-center justify-center shrink-0">
            <SyncIcon className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-[30px] sm:leading-[36px] font-bold text-ink tracking-tight">
              Compartir entre equipos
            </h1>
            <p className="text-sm text-muted mt-1">
              Envía o recibe información por WhatsApp o un archivo USB.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {user?.role === 'DOCENTE' ? 'Docente' : user?.role === 'SECRETARIA' ? 'Secretaría' : 'Dirección'}
              </span>
              {dashboardData?.lastSync && (
                <span className="text-xs text-muted tabular-nums">
                  Última sincronización: <strong className="text-ink">{formatDate(dashboardData.lastSync?.at || dashboardData.lastSync)}</strong>
                </span>
              )}
              {dashboardData?.pending !== undefined && dashboardData.pending > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 tabular-nums">
                  <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
                  {dashboardData.pending} {dashboardData.pending === 1 ? 'cambio pendiente' : 'cambios pendientes'} por entregar
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loadingDashboard}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-ink bg-surface-alt hover:bg-brand-soft border border-line rounded-[10px] transition-colors disabled:opacity-50 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          title="Actualizar estado"
        >
          <RefreshIcon className={`w-4 h-4 shrink-0 ${loadingDashboard ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </DashboardPhotoBand>

      {user && <SyncTransferPanel currentUser={user} onImported={loadData} />}
      <details className="border border-line rounded-2xl bg-surface p-4 space-y-5">
        <summary className="min-h-[44px] cursor-pointer font-semibold text-ink">Equipos y herramientas avanzadas{conflictsList.length ? ` · ${conflictsList.length} conflictos pendientes` : ''}</summary>
      {/* Selector de pestañas principales */}
      <div className="flex flex-wrap border-b border-line gap-2" role="tablist" aria-label="Secciones de sincronización">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'network'}
          onClick={() => setActiveTab('network')}
          className={`min-h-[44px] flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            activeTab === 'network'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <UsbIcon className="w-4 h-4 shrink-0" />
          <span>Red Institucional Offline</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-brand-soft text-brand font-bold border border-line tabular-nums">
            2026
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'exchange'}
          onClick={() => setActiveTab('exchange')}
          className={`min-h-[44px] flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            activeTab === 'exchange'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <SyncIcon className="w-4 h-4 shrink-0" />
          <span>Intercambio de Aulas (USB)</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'devices'}
            onClick={() => setActiveTab('devices')}
            className={`min-h-[44px] flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              activeTab === 'devices'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <LaptopIcon className="w-4 h-4 shrink-0" />
            <span>Equipos Vinculados</span>
            {dashboardData?.devices && dashboardData.devices.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-alt text-ink border border-line tabular-nums">
                {dashboardData.devices.length}
              </span>
            )}
          </button>
        )}

        {isDirector && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'conflicts'}
            onClick={() => setActiveTab('conflicts')}
            className={`min-h-[44px] flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              activeTab === 'conflicts'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <AlertCircleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Conflictos y Diferencias</span>
            {conflictsList.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-600 text-white tabular-nums">
                {conflictsList.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA PRINCIPAL: RED INSTITUCIONAL OFFLINE (TAREA 45)                  */}
      {/* ========================================================================= */}
      {activeTab === 'network' && user && (
        <div>
          {isDirector ? (
            <DirectorNetworkPanel currentUser={user} />
          ) : isSecretary ? (
            <SecretariaSyncPanel currentUser={user} />
          ) : (
            <DocenteSyncPanel currentUser={user} />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: INTERCAMBIO DE AULAS (USB)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'exchange' && (
        <div className="space-y-6">
          {/* Tarjeta explicativa de los 3 pasos offline */}
          <div className="bg-surface p-6 rounded-2xl border border-line shadow-[var(--ui-shadow)] transition-colors">
            <h2 className="text-base font-bold text-ink">Tus datos viajan en un archivo protegido</h2>
            <p className="text-sm text-muted mt-1">
              {isTeacher
                ? 'Guarda tus notas y asistencias. Después crea un archivo .cetpro y entrégalo a secretaría o dirección. Cuando te devuelvan otro archivo, recíbelo aquí.'
                : 'Recibe el trabajo de los docentes y envía las matrículas o correcciones a la cuenta del docente correspondiente mediante una memoria USB.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 rounded-2xl bg-surface-alt border border-line flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-brand text-on-brand flex items-center justify-center text-xs font-bold shrink-0 tabular-nums">
                  1
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink">Crear el archivo</h3>
                  <p className="text-xs text-muted mt-1">
                    El sistema reúne los datos guardados y los encripta con una clave de seguridad.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-alt border border-line flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-brand text-on-brand flex items-center justify-center text-xs font-bold shrink-0 tabular-nums">
                  2
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink">Llevarlo en USB</h3>
                  <p className="text-xs text-muted mt-1">
                    Copia el archivo a tu memoria USB y entrégalo junto con la clave asignada.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-alt border border-line flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-brand text-on-brand flex items-center justify-center text-xs font-bold shrink-0 tabular-nums">
                  3
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink">Revisar y recibir</h3>
                  <p className="text-xs text-muted mt-1">
                    La otra computadora verifica la firma y previsualiza los cambios sin duplicar datos.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted mt-4 italic">
              * No requiere internet. Un archivo .cetpro sirve exclusivamente para actualizar computadoras de CEPRO_MICAELA.
            </p>
          </div>

          {/* Sub-selector Enviar / Recibir */}
          <div className="inline-flex flex-wrap p-1 bg-surface-alt rounded-[10px] border border-line gap-1">
            <button
              type="button"
              onClick={() => setExchangeSubTab('send')}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-[10px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                exchangeSubTab === 'send'
                  ? 'bg-surface text-brand shadow-[var(--ui-shadow)]'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <DownloadIcon className="w-4 h-4 shrink-0" />
              <span>1. Enviar mis datos (Exportar a USB)</span>
            </button>
            <button
              type="button"
              onClick={() => setExchangeSubTab('receive')}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-[10px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                exchangeSubTab === 'receive'
                  ? 'bg-surface text-brand shadow-[var(--ui-shadow)]'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <UploadIcon className="w-4 h-4 shrink-0" />
              <span>2. Recibir un archivo (Importar desde USB)</span>
            </button>
          </div>

          {/* SUBPANEL 1: ENVIAR MIS DATOS (EXPORT) */}
          {exchangeSubTab === 'send' && (
            <div className="bg-surface p-6 rounded-2xl border border-line shadow-[var(--ui-shadow)] transition-colors space-y-6">
              <div>
                <h3 className="text-base font-bold text-ink">
                  Enviar {isTeacher ? 'mi trabajo docente' : 'datos a otra computadora'}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {isTeacher
                    ? 'Este archivo incluye únicamente tus aulas y unidades. Entrégalo a secretaría o dirección.'
                    : 'Elige primero para quién prepararás el archivo. Si eliges un docente, se incluirán únicamente sus aulas asignadas.'}
                </p>
              </div>

              {exportError && (
                <div
                  role="alert"
                  className="p-4 rounded-[10px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-3 text-red-800 dark:text-red-200 text-sm"
                >
                  <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <div>
                    <h4 className="font-semibold">No se pudo crear el archivo</h4>
                    <p className="text-xs mt-0.5">{exportError}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selector de destinatario (Solo Admin) */}
                {!isTeacher && (
                  <div className="min-w-0">
                    <label htmlFor="sync-export-recipient" className="block text-xs font-semibold text-ink mb-1">
                      ¿Quién recibirá este archivo?
                    </label>
                    <select
                      id="sync-export-recipient"
                      value={exportRecipientId}
                      onChange={e => setExportRecipientId(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line text-ink rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <option value="">Dirección o secretaría: archivo institucional</option>
                      {teacherUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          Docente: {u.name} ({u.username}) {!u.active ? '— Desactivado' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted mt-1">
                      Si preparas el archivo para un docente específico, solo contendrá sus grupos autorizados.
                    </p>
                  </div>
                )}

                {/* Selector de aula / grupo */}
                <div className="min-w-0">
                  <label htmlFor="sync-export-group" className="block text-xs font-semibold text-ink mb-1">
                    ¿Qué aula quieres incluir?
                  </label>
                  <select
                    id="sync-export-group"
                    value={exportGroupId}
                    onChange={e => setExportGroupId(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line text-ink rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="">Todas mis aulas permitidas</option>
                    {(dashboardData?.groups || []).map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted mt-1">
                    Para una sincronización completa y confiable, se recomienda dejar seleccionadas todas las aulas.
                  </p>
                </div>
              </div>

              {/* Clave de protección */}
              <div className="p-4 rounded-2xl bg-surface-alt border border-line space-y-3">
                <label htmlFor="sync-export-passphrase" className="block text-xs font-semibold text-ink">
                  Clave que protege este archivo (mínimo 8 caracteres)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <input
                      id="sync-export-passphrase"
                      type={showExportPassphrase ? 'text' : 'password'}
                      value={exportPassphrase}
                      onChange={e => setExportPassphrase(e.target.value)}
                      minLength={8}
                      className="w-full min-h-[44px] pl-9 pr-11 py-2 text-sm font-mono bg-surface border border-line text-ink rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      placeholder="Ingrese o use la clave generada"
                    />
                    <KeyIcon className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                    <button
                      type="button"
                      onClick={() => setShowExportPassphrase(!showExportPassphrase)}
                      aria-label={showExportPassphrase ? 'Ocultar clave' : 'Mostrar clave'}
                      className="absolute right-1.5 top-1.5 min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-[8px] text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      title={showExportPassphrase ? 'Ocultar clave' : 'Mostrar clave'}
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPassphrase}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-ink bg-surface hover:bg-brand-soft border border-line rounded-[10px] transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <span>{copiedKey ? '¡Copiada!' : 'Copiar clave'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportPassphrase(generateSecurePassphrase())}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-ink bg-surface hover:bg-brand-soft border border-line rounded-[10px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    Generar otra
                  </button>
                </div>
                <p className="text-[11px] text-muted">
                  El sistema prepara una clave segura para proteger el paquete. Comunícala a la persona que recibirá el USB;
                  no es tu contraseña de inicio de sesión.
                </p>
              </div>

              {/* Opción adicional para Administradores */}
              {!isTeacher && (
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="include-accounts"
                    checked={exportIncludeAccounts}
                    onChange={e => setExportIncludeAccounts(e.target.checked)}
                    className="mt-0.5 rounded text-brand focus:ring-brand"
                  />
                  <label htmlFor="include-accounts" className="text-xs text-ink">
                    <span className="font-semibold">También enviar solicitudes de creación o cambio de cuentas</span>
                    <span className="block text-[11px] text-muted">
                      Se entregan cifradas para que el equipo institucional las autorice formalmente.
                    </span>
                  </label>
                </div>
              )}

              {/* Botón de exportación */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExportExchange}
                  disabled={isExporting || exportPassphrase.length < 8}
                  className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-on-brand bg-brand hover:opacity-95 rounded-[10px] transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                      <span>Cifrando y preparando archivo...</span>
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="w-4 h-4 shrink-0" />
                      <span>Crear y descargar archivo .cetpro</span>
                    </>
                  )}
                </button>
              </div>

              {/* Resumen tras exportar con éxito */}
              {exportSuccess && (
                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <h4 className="font-bold text-sm">¡Archivo preparado con éxito para llevar en USB!</h4>
                  </div>
                  <p className="text-xs">
                    Busca el archivo descargado en tu carpeta de <strong>Descargas</strong>, cópialo a tu memoria USB y entrégalo
                    junto con su clave: <code className="bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono font-bold tabular-nums">{exportPassphrase}</code>.
                  </p>

                  <div className="bg-surface p-3 rounded-[10px] border border-line text-xs text-muted space-y-1">
                    <div className="font-semibold text-ink">Resumen del paquete exportado:</div>
                    <div>Emisor: <strong className="text-ink">{exportSuccess.summary.sender?.name}</strong> ({exportSuccess.summary.sender?.role})</div>
                    {exportSuccess.summary.recipient && (
                      <div>Destinatario: <strong className="text-ink">{exportSuccess.summary.recipient.name}</strong> ({exportSuccess.summary.recipient.role})</div>
                    )}
                    <div className="tabular-nums">Aulas incluidas: <strong className="text-ink">{exportSuccess.summary.groups?.length || 0} aulas</strong></div>
                    <div className="pt-1">
                      <span className="font-semibold text-ink">Contenido:</span>
                      <ul className="list-disc list-inside mt-0.5 space-y-0.5 tabular-nums">
                        {Object.entries(exportSuccess.summary.counts || {}).map(([key, count]) => (
                          <li key={key}>
                            <strong className="text-ink">{count}</strong> {ENTITY_LABELS[key] || key}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUBPANEL 2: RECIBIR UN ARCHIVO (IMPORT) */}
          {exchangeSubTab === 'receive' && (
            <div className="bg-surface p-6 rounded-2xl border border-line shadow-[var(--ui-shadow)] transition-colors space-y-6">
              <div>
                <h3 className="text-base font-bold text-ink">Recibir un archivo desde USB</h3>
                <p className="text-xs text-muted mt-1">
                  Elige el archivo <code className="font-mono text-brand">.cetpro</code> que te entregaron y escribe su clave de seguridad para revisar los cambios
                  antes de incorporarlos a tu base local.
                </p>
              </div>

              {previewError && (
                <div
                  role="alert"
                  className="p-4 rounded-[10px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-3 text-red-800 dark:text-red-200 text-sm"
                >
                  <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <div>
                    <h4 className="font-semibold">No se pudo verificar el archivo</h4>
                    <p className="text-xs mt-0.5">{previewError}</p>
                    <p className="text-[11px] opacity-90 mt-1">
                      Comprueba que hayas seleccionado el archivo correcto y que la clave coincida exactamente.
                    </p>
                  </div>
                </div>
              )}

              {importError && (
                <div
                  role="alert"
                  className="p-4 rounded-[10px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-3 text-red-800 dark:text-red-200 text-sm"
                >
                  <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <div>
                    <h4 className="font-semibold">Error al aplicar la actualización</h4>
                    <p className="text-xs mt-0.5">{importError}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selector de archivo */}
                <div className="min-w-0">
                  <label htmlFor="exchange-file-input" className="block text-xs font-semibold text-ink mb-1">
                    Archivo de actualización (.cetpro)
                  </label>
                  <div className="border-2 border-dashed border-line rounded-2xl p-4 text-center hover:border-brand transition-colors bg-surface-alt">
                    <input
                      type="file"
                      id="exchange-file-input"
                      accept=".cetpro,.json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="exchange-file-input" className="cursor-pointer flex flex-col items-center gap-2 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-brand-soft text-brand border border-line flex items-center justify-center">
                        <UploadIcon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-ink truncate max-w-full">
                        {selectedFile ? selectedFile.name : 'Seleccionar archivo .cetpro'}
                      </span>
                      <span className="text-[11px] text-muted tabular-nums">
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Hasta 32 MB'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Clave de protección */}
                <div className="min-w-0">
                  <label htmlFor="sync-receive-passphrase" className="block text-xs font-semibold text-ink mb-1">
                    Clave que acompaña al archivo
                  </label>
                  <div className="relative">
                    <input
                      id="sync-receive-passphrase"
                      type={showReceivePassphrase ? 'text' : 'password'}
                      value={receivePassphrase}
                      onChange={e => setReceivePassphrase(e.target.value)}
                      className="w-full min-h-[44px] pl-9 pr-11 py-2.5 text-sm font-mono bg-surface-alt border border-line text-ink rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      placeholder="Escribe la clave entregada"
                    />
                    <KeyIcon className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                    <button
                      type="button"
                      onClick={() => setShowReceivePassphrase(!showReceivePassphrase)}
                      aria-label={showReceivePassphrase ? 'Ocultar clave' : 'Mostrar clave'}
                      className="absolute right-1.5 top-1.5 min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-[8px] text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      title={showReceivePassphrase ? 'Ocultar clave' : 'Mostrar clave'}
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    Solicita esta clave a la persona que generó el paquete en la otra computadora.
                  </p>
                </div>
              </div>

              {/* Botón de verificación */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePreviewPackage}
                  disabled={isPreviewing || !filePackage}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-ink bg-surface-alt hover:bg-brand-soft border border-line rounded-[10px] transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {isPreviewing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                      <span>Verificando firma y descifrando...</span>
                    </>
                  ) : (
                    <>
                      <EyeIcon className="w-4 h-4 text-brand shrink-0" />
                      <span>Revisar archivo (Vista previa)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tarjeta de vista previa / verificación */}
              {previewReport && (
                <div className="p-6 rounded-2xl bg-surface-alt border border-line space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <h4 className="font-bold text-sm text-ink">
                        {previewReport.duplicatePackage
                          ? 'Esta actualización ya fue recibida anteriormente'
                          : 'Este archivo ha sido verificado con éxito'}
                      </h4>
                    </div>
                    <span className="text-xs text-muted tabular-nums shrink-0">
                      Fecha de exportación: <strong className="text-ink">{formatDate(previewReport.createdAt)}</strong>
                    </span>
                  </div>

                  {previewReport.duplicatePackage ? (
                    <div className="p-4 rounded-[10px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                      <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Aviso:</strong> Esta computadora ya tiene aplicada esta actualización exacta. No necesitas
                        recibirla nuevamente.
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Metadatos del emisor y contenido */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-surface p-3 rounded-[10px] border border-line space-y-1 min-w-0">
                          <span className="font-semibold text-ink block">Emisor del paquete:</span>
                          <p className="text-muted">
                            <strong className="text-ink">{previewReport.description?.sender?.name || 'Personal institucional'}</strong>{' '}
                            ({previewReport.description?.sender?.role})
                          </p>
                          {previewReport.description?.recipient && (
                            <p className="text-muted">
                              Destinado a: {previewReport.description.recipient.name} ({previewReport.description.recipient.role})
                            </p>
                          )}
                        </div>

                        <div className="bg-surface p-3 rounded-[10px] border border-line space-y-1 min-w-0">
                          <span className="font-semibold text-ink block">Impacto en tu computadora:</span>
                          <p className="text-muted tabular-nums">
                            <strong className="text-ink">{previewReport.recordsToAdd ?? previewReport.newRecords ?? 0}</strong> registros nuevos por agregar.
                          </p>
                          <p className="text-muted tabular-nums">
                            <strong className="text-ink">{previewReport.recordsToUpdate ?? previewReport.updates ?? 0}</strong> registros por actualizar.
                          </p>
                          {previewReport.accountUpdate && (
                            <p className="text-brand font-medium">
                              * Incluye actualización de credenciales o perfil de usuario.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Desglose de aulas */}
                      {previewReport.description?.groups && previewReport.description.groups.length > 0 && (
                        <div className="bg-surface p-3 rounded-[10px] border border-line text-xs">
                          <span className="font-semibold text-ink block mb-1">Aulas incluidas:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-muted">
                            {previewReport.description.groups.map(g => (
                              <li key={g.id}>{g.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Diferencias o pendientes */}
                      {Boolean((previewReport.conflicts && previewReport.conflicts > 0) || (previewReport.pending && previewReport.pending > 0)) && (
                        <div className="p-3.5 rounded-[10px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 tabular-nums">
                            <AlertCircleIcon className="w-4 h-4 shrink-0" />
                            <span>Atención: {previewReport.conflicts || 0} diferencias y {previewReport.pending || 0} datos pendientes.</span>
                          </div>
                          <p>
                            Se recibirán todos los cambios compatibles. Las diferencias se conservarán de forma segura para
                            que Dirección las revise en la pestaña de Conflictos; tus valores locales no se perderán.
                          </p>
                        </div>
                      )}

                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-line">
                        <span className="text-xs text-muted">
                          * Hasta este momento <strong className="text-ink">no se ha modificado</strong> tu base de datos SQLite.
                        </span>

                        <button
                          type="button"
                          onClick={handleApplyPackage}
                          disabled={isImporting}
                          className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-on-brand bg-brand hover:opacity-95 rounded-[10px] transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          {isImporting ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                              <span>Aplicando cambios con respaldo previo...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="w-4 h-4 shrink-0" />
                              <span>Recibir los cambios revisados</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Éxito tras aplicar */}
              {importSuccess && (
                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <h4 className="font-bold text-sm">¡Actualización recibida con éxito en esta computadora!</h4>
                  </div>
                  <p className="text-xs tabular-nums">
                    Se creó una copia de seguridad automática (<code className="font-mono">antes-sincronizar</code>) antes de modificar los datos.
                    Se incorporaron <strong>{importSuccess.recordsToAdd ?? importSuccess.newRecords ?? 0}</strong> datos nuevos y{' '}
                    <strong>{importSuccess.recordsToUpdate ?? importSuccess.updates ?? 0}</strong> actualizaciones.
                  </p>
                  {Boolean(importSuccess.conflicts || importSuccess.pending) && (
                    <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertCircleIcon className="w-4 h-4 shrink-0" />
                      <span>Las diferencias detectadas fueron retenidas para auditoría y resolución por Dirección.</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: EQUIPOS VINCULADOS (ADMIN)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'devices' && isAdmin && (
        <div className="space-y-6">
          <div className="bg-surface p-6 rounded-2xl border border-line shadow-[var(--ui-shadow)] transition-colors space-y-4">
            <h2 className="text-base font-bold text-ink">Equipos Vinculados a la Institución</h2>
            <p className="text-xs text-muted">
              {systemStatus?.authority
                ? 'Como equipo central de Dirección, puedes autorizar laptops de docentes y secretaría para sincronizar mediante lotes cifrados asimétricos.'
                : 'Esta computadora es un equipo cliente vinculado. Puedes exportar tu lote de sincronización asimétrica hacia el equipo institucional.'}
            </p>

            {/* Listado de equipos vinculados */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-line rounded-[10px] overflow-hidden">
                <thead className="bg-surface-alt text-muted font-semibold border-b border-line">
                  <tr>
                    <th className="p-3">ID del Equipo</th>
                    <th className="p-3">Usuario Asignado</th>
                    <th className="p-3">Huella Pública</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(dashboardData?.devices || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted">
                        No hay equipos secundarios vinculados actualmente.
                      </td>
                    </tr>
                  ) : (
                    (dashboardData?.devices || []).map(device => (
                      <tr key={device.id} className="hover:bg-surface-alt/60 transition-colors">
                        <td className="p-3 font-mono font-bold text-ink tabular-nums">
                          {device.id.slice(0, 12)}...
                        </td>
                        <td className="p-3 text-muted">
                          <strong className="text-ink">{device.name || 'Sin nombre'}</strong> ({device.userId})
                        </td>
                        <td className="p-3 font-mono text-muted text-[11px] tabular-nums">
                          {device.signingKey?.slice(0, 20)}...
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleExportSyncForDevice(device.id, device.name)}
                            disabled={isExportingSyncId === device.id}
                            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand bg-brand-soft hover:opacity-90 border border-line rounded-[10px] transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          >
                            <DownloadIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{isExportingSyncId === device.id ? 'Exportando...' : 'Exportar lote SYNC'}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sección de vinculación de nuevo equipo (Director) */}
          {isDirector && (
            <div className="bg-surface p-6 rounded-2xl border border-line shadow-[var(--ui-shadow)] transition-colors space-y-4">
              <h3 className="text-sm font-bold text-ink">Autorizar nuevo equipo docente o secretaría</h3>
              <p className="text-xs text-muted">
                El usuario del nuevo equipo debe generar su archivo <code className="font-mono text-brand">SOLICITUD_VINCULACION.json</code> y traértelo en USB.
                Pega el contenido o selecciona el usuario correspondiente para emitir su credencial digital institucional.
              </p>

              {provisionError && (
                <div
                  role="alert"
                  className="p-3 rounded-[10px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 text-xs flex items-start gap-2"
                >
                  <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <span>{provisionError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label htmlFor="sync-provision-user" className="block text-xs font-semibold text-ink mb-1">
                    Cuenta de usuario a asignar:
                  </label>
                  <select
                    id="sync-provision-user"
                    value={provisionUserId}
                    onChange={e => setProvisionUserId(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-xs bg-surface-alt border border-line text-ink rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="">-- Seleccionar usuario registrado --</option>
                    {usersList
                      .filter(u => u.role !== 'DIRECTOR' && u.active)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.role} ({u.username})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="min-w-0">
                  <label htmlFor="sync-provision-json" className="block text-xs font-semibold text-ink mb-1">
                    Contenido de la solicitud (JSON):
                  </label>
                  <textarea
                    id="sync-provision-json"
                    rows={3}
                    value={deviceRequestJson}
                    onChange={e => setDeviceRequestJson(e.target.value)}
                    placeholder='{"app":"CEPRO_MICAELA","type":"DEVICE_REQUEST",...}'
                    className="w-full p-2.5 text-xs font-mono bg-surface-alt border border-line text-ink rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleProvisionDevice}
                  disabled={isProvisioning || !provisionUserId || !deviceRequestJson.trim()}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-on-brand bg-brand hover:opacity-95 rounded-[10px] transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {isProvisioning ? 'Firmando credencial...' : 'Firmar y descargar autorización institucional'}
                </button>
              </div>

              {provisionResult && (
                <div className="p-4 rounded-[10px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong>¡Equipo autorizado con éxito!</strong>
                    <p>
                      Entrega el archivo <code className="font-mono">AUTORIZACION_VINCULACION.json</code> al usuario para que lo aplique en su computadora.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Generar solicitud si este no es el hub */}
          {!systemStatus?.authority && (
            <div className="bg-surface p-6 rounded-2xl border border-line shadow-[var(--ui-shadow)] transition-colors space-y-4">
              <h3 className="text-sm font-bold text-ink">Solicitar vinculación de este equipo</h3>
              <p className="text-xs text-muted">
                Genera la clave pública de este equipo para entregarla a Dirección en un USB.
              </p>
              <button
                type="button"
                onClick={handleGenerateMyDeviceRequest}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-ink bg-surface-alt hover:bg-brand-soft border border-line rounded-[10px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <DownloadIcon className="w-4 h-4 shrink-0" />
                <span>Generar y descargar solicitud de vinculación</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: CONFLICTOS Y DIFERENCIAS (DIRECTOR)                            */}
      {/* ========================================================================= */}
      {activeTab === 'conflicts' && isDirector && (
        <div className="space-y-6">
          <div className="bg-surface p-6 rounded-2xl border border-line shadow-[var(--ui-shadow)] transition-colors space-y-2">
            <h2 className="text-base font-bold text-ink">Bandeja de Conflictos y Diferencias Académicas</h2>
            <p className="text-xs text-muted">
              Cuando dos computadoras modifican el mismo registro de forma concurrente, el sistema no borra datos ni
              sobreescribe a ciegas. Los cambios incompatibles se retienen aquí para que Dirección decida qué valor conservar.
              Cada decisión genera automáticamente una copia de seguridad SQLite (<code className="font-mono">antes-resolver-conflicto</code>).
            </p>
          </div>

          {conflictsList.length === 0 ? (
            <div className="bg-surface p-12 text-center rounded-2xl border border-line shadow-[var(--ui-shadow)] space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-ink">No hay conflictos pendientes</h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                Todas las notas, asistencias, matrículas y registros se encuentran plenamente conciliados y sincronizados.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {conflictsList.map(conflict => {
                const entityName = ENTITY_LABELS[conflict.operation?.body?.entity] || conflict.operation?.body?.entity;
                const actorName = conflict.operation?.body?.actor?.name || 'Usuario desconocido';
                const actorRole = conflict.operation?.body?.actor?.role || '';
                const feedback = conflictFeedback[conflict.id];

                return (
                  <div
                    key={conflict.id}
                    className="bg-surface p-6 rounded-2xl border border-amber-300 dark:border-amber-800/60 shadow-[var(--ui-shadow)] space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 uppercase">
                          <AlertCircleIcon className="w-3 h-3 shrink-0" />
                          Conflicto: {entityName}
                        </span>
                        <h4 className="text-sm font-bold text-ink mt-1 truncate">
                          Registro ID: <code className="font-mono text-xs tabular-nums">{conflict.operation?.body?.recordId}</code>
                        </h4>
                      </div>
                      <div className="text-xs text-muted shrink-0">
                        Propuesto por: <strong className="text-ink">{actorName}</strong> ({actorRole})
                      </div>
                    </div>

                    {feedback && (
                      <div
                        role={feedback.type === 'error' ? 'alert' : undefined}
                        className={`p-3 rounded-[10px] text-xs flex items-start gap-2 ${
                          feedback.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800/60'
                        }`}
                      >
                        {feedback.type === 'success' ? (
                          <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        )}
                        <span>{feedback.message}</span>
                      </div>
                    )}

                    {/* Comparativa Lado a Lado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Valor local */}
                      <div className="p-4 rounded-2xl bg-surface-alt border border-line space-y-2 min-w-0">
                        <div className="flex items-center justify-between text-xs font-bold text-ink">
                          <span>1. Valor Local Actual en este equipo:</span>
                          <span className="text-[10px] text-muted font-mono tabular-nums">
                            Rev: {conflict.current?.rev || 'Sin rev'}
                          </span>
                        </div>
                        <pre className="p-2.5 bg-canvas rounded-[10px] border border-line text-[11px] font-mono text-ink overflow-x-auto max-h-40 tabular-nums">
                          {JSON.stringify(conflict.current || {}, null, 2)}
                        </pre>
                      </div>

                      {/* Valor entrante */}
                      <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-2 min-w-0">
                        <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
                          <span>2. Valor Recibido en el archivo:</span>
                          <span className="text-[10px] text-blue-700 dark:text-blue-300 font-mono tabular-nums">
                            Rev: {conflict.operation?.body?.value?.rev || 'Sin rev'}
                          </span>
                        </div>
                        <pre className="p-2.5 bg-canvas rounded-[10px] border border-blue-200 dark:border-blue-900/50 text-[11px] font-mono text-ink overflow-x-auto max-h-40 tabular-nums">
                          {JSON.stringify(conflict.operation?.body?.value || {}, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Motivo obligatorio para auditar la decisión */}
                    <div>
                      <label htmlFor={`conflict-reason-${conflict.id}`} className="block text-xs font-semibold text-ink mb-1">
                        Motivo obligatorio de la resolución (auditoría institucional):
                      </label>
                      <input
                        id={`conflict-reason-${conflict.id}`}
                        type="text"
                        value={conflictReasons[conflict.id] || ''}
                        onChange={e =>
                          setConflictReasons(prev => ({
                            ...prev,
                            [conflict.id]: e.target.value,
                          }))
                        }
                        placeholder="Ejemplo: Se conserva la nota firmada en físico tras revisión con el docente titular"
                        className="w-full min-h-[44px] px-3 py-2 text-xs bg-surface-alt border border-line text-ink rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      />
                    </div>

                    {/* Acciones de resolución */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleResolveConflict(conflict, 'KEEP_LOCAL')}
                        disabled={resolvingId === conflict.id}
                        className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-xs font-bold text-ink bg-surface-alt hover:bg-brand-soft border border-line rounded-[10px] transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        {resolvingId === conflict.id ? 'Procesando...' : 'Conservar valor local (KEEP_LOCAL)'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResolveConflict(conflict, 'ACCEPT_INCOMING')}
                        disabled={resolvingId === conflict.id}
                        className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-xs font-bold text-on-brand bg-brand hover:opacity-95 rounded-[10px] transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        {resolvingId === conflict.id ? 'Procesando...' : 'Aceptar cambio entrante (ACCEPT_INCOMING)'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </details>
    </div>
  );
};

export default Sincronizacion;
