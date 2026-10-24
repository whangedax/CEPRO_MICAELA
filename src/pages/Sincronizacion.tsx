/**
 * src/pages/Sincronizacion.tsx
 * 
 * Módulo de Sincronización USB y Transferencia Académica — CEPRO_MICAELA 2.0.
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

interface SincronizacionProps {
  onNavigate?: (route: NavRoute) => void;
}

type MainTab = 'exchange' | 'devices' | 'conflicts';
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
  const [activeTab, setActiveTab] = useState<MainTab>('exchange');
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
      setExportError(err?.message || 'Error al exportar el archivo de sincronización.');
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
        setPreviewError(err?.message || 'El formato del archivo no es un JSON válido.');
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
      setPreviewError(err?.message || 'No se pudo verificar el archivo. Compruebe la clave o el remitente.');
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
      setImportError(err?.message || 'Error al aplicar los datos recibidos.');
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
        [conflict.id]: { type: 'error', message: err?.message || 'Error al resolver el conflicto.' },
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
      alert(`Error al generar paquete de sincronización: ${err?.message || err}`);
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
      alert(`Error al generar solicitud: ${err?.message || err}`);
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
      setProvisionError(err?.message || 'Error al autorizar el equipo.');
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
    <div className="space-y-6">
      {/* Cabecera institucional Stitch */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#13594A]/10 text-[#13594A] flex items-center justify-center shrink-0">
            <SyncIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#172B28]">Sincronización USB y Transferencia</h1>
            <p className="text-sm text-slate-500 mt-1">
              Intercambio seguro de datos entre computadoras institucionales sin necesidad de internet.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {systemStatus?.authority ? 'Equipo Institucional (Dirección)' : 'Equipo de Trabajo Vinculado'}
              </span>
              {dashboardData?.lastSync && (
                <span className="text-xs text-slate-500">
                  Última sincronización: <strong>{formatDate(dashboardData.lastSync?.at || dashboardData.lastSync)}</strong>
                </span>
              )}
              {dashboardData?.pending !== undefined && dashboardData.pending > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  {dashboardData.pending} {dashboardData.pending === 1 ? 'cambio pendiente' : 'cambios pendientes'} por entregar
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loadingDashboard}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
          title="Actualizar estado"
        >
          <RefreshIcon className={`w-4 h-4 ${loadingDashboard ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Selector de pestañas principales */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('exchange')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'exchange'
              ? 'border-[#13594A] text-[#13594A]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <UsbIcon className="w-4 h-4" />
          <span>Intercambio de Aulas (USB)</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'devices'
                ? 'border-[#13594A] text-[#13594A]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <LaptopIcon className="w-4 h-4" />
            <span>Equipos Vinculados</span>
            {dashboardData?.devices && dashboardData.devices.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
                {dashboardData.devices.length}
              </span>
            )}
          </button>
        )}

        {isDirector && (
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'conflicts'
                ? 'border-[#13594A] text-[#13594A]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertCircleIcon className="w-4 h-4 text-amber-500" />
            <span>Conflictos y Diferencias</span>
            {conflictsList.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                {conflictsList.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: INTERCAMBIO DE AULAS (USB)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'exchange' && (
        <div className="space-y-6">
          {/* Tarjeta explicativa de los 3 pasos offline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-[#172B28]">Tus datos viajan en un archivo protegido</h2>
            <p className="text-sm text-slate-600 mt-1">
              {isTeacher
                ? 'Guarda tus notas y asistencias. Después crea un archivo .cetpro y entrégalo a secretaría o dirección. Cuando te devuelvan otro archivo, recíbelo aquí.'
                : 'Recibe el trabajo de los docentes y envía las matrículas o correcciones a la cuenta del docente correspondiente mediante una memoria USB.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#13594A] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Crear el archivo</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    El sistema reúne los datos guardados y los encripta con una clave de seguridad.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#13594A] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Llevarlo en USB</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Copia el archivo a tu memoria USB y entrégalo junto con la clave asignada.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#13594A] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Revisar y recibir</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    La otra computadora verifica la firma y previsualiza los cambios sin duplicar datos.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-4 italic">
              * No requiere internet. Un archivo .cetpro sirve exclusivamente para actualizar computadoras de CEPRO_MICAELA.
            </p>
          </div>

          {/* Sub-selector Enviar / Recibir */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setExchangeSubTab('send')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                exchangeSubTab === 'send'
                  ? 'bg-white text-[#13594A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DownloadIcon className="w-4 h-4" />
              <span>1. Enviar mis datos (Exportar a USB)</span>
            </button>
            <button
              onClick={() => setExchangeSubTab('receive')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                exchangeSubTab === 'receive'
                  ? 'bg-white text-[#13594A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadIcon className="w-4 h-4" />
              <span>2. Recibir un archivo (Importar desde USB)</span>
            </button>
          </div>

          {/* SUBPANEL 1: ENVIAR MIS DATOS (EXPORT) */}
          {exchangeSubTab === 'send' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#172B28]">
                  Enviar {isTeacher ? 'mi trabajo docente' : 'datos a otra computadora'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isTeacher
                    ? 'Este archivo incluye únicamente tus aulas y unidades. Entrégalo a secretaría o dirección.'
                    : 'Elige primero para quién prepararás el archivo. Si eliges un docente, se incluirán únicamente sus aulas asignadas.'}
                </p>
              </div>

              {exportError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
                  <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <h4 className="font-semibold">No se pudo crear el archivo</h4>
                    <p className="text-xs mt-0.5">{exportError}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selector de destinatario (Solo Admin) */}
                {!isTeacher && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ¿Quién recibirá este archivo?
                    </label>
                    <select
                      value={exportRecipientId}
                      onChange={e => setExportRecipientId(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                    >
                      <option value="">Dirección o secretaría: archivo institucional</option>
                      {teacherUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          Docente: {u.name} ({u.username}) {!u.active ? '— Desactivado' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Si preparas el archivo para un docente específico, solo contendrá sus grupos autorizados.
                    </p>
                  </div>
                )}

                {/* Selector de aula / grupo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ¿Qué aula quieres incluir?
                  </label>
                  <select
                    value={exportGroupId}
                    onChange={e => setExportGroupId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                  >
                    <option value="">Todas mis aulas permitidas</option>
                    {(dashboardData?.groups || []).map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Para una sincronización completa y confiable, se recomienda dejar seleccionadas todas las aulas.
                  </p>
                </div>
              </div>

              {/* Clave de protección */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-semibold text-slate-800">
                  Clave que protege este archivo (mínimo 8 caracteres)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showExportPassphrase ? 'text' : 'password'}
                      value={exportPassphrase}
                      onChange={e => setExportPassphrase(e.target.value)}
                      minLength={8}
                      className="w-full pl-9 pr-10 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                      placeholder="Ingrese o use la clave generada"
                    />
                    <KeyIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowExportPassphrase(!showExportPassphrase)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      title={showExportPassphrase ? 'Ocultar clave' : 'Mostrar clave'}
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPassphrase}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>{copiedKey ? '¡Copiada!' : 'Copiar clave'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportPassphrase(generateSecurePassphrase())}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                  >
                    Generar otra
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
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
                    className="mt-0.5 rounded text-[#13594A] focus:ring-[#13594A]"
                  />
                  <label htmlFor="include-accounts" className="text-xs text-slate-700">
                    <span className="font-semibold">También enviar solicitudes de creación o cambio de cuentas</span>
                    <span className="block text-[11px] text-slate-400">
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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#13594A] hover:bg-[#0D3E34] rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Cifrando y preparando archivo...</span>
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="w-4 h-4" />
                      <span>Crear y descargar archivo .cetpro</span>
                    </>
                  )}
                </button>
              </div>

              {/* Resumen tras exportar con éxito */}
              {exportSuccess && (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                    <h4 className="font-bold text-sm">¡Archivo preparado con éxito para llevar en USB!</h4>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Busca el archivo descargado en tu carpeta de <strong>Descargas</strong>, cópialo a tu memoria USB y entrégalo
                    junto con su clave: <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold">{exportPassphrase}</code>.
                  </p>

                  <div className="bg-white/80 p-3 rounded-lg border border-emerald-200 text-xs text-slate-700 space-y-1">
                    <div className="font-semibold text-slate-900">Resumen del paquete exportado:</div>
                    <div>Emisor: <strong>{exportSuccess.summary.sender?.name}</strong> ({exportSuccess.summary.sender?.role})</div>
                    {exportSuccess.summary.recipient && (
                      <div>Destinatario: <strong>{exportSuccess.summary.recipient.name}</strong> ({exportSuccess.summary.recipient.role})</div>
                    )}
                    <div>Aulas incluidas: <strong>{exportSuccess.summary.groups?.length || 0} aulas</strong></div>
                    <div className="pt-1">
                      <span className="font-semibold">Contenido:</span>
                      <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-600">
                        {Object.entries(exportSuccess.summary.counts || {}).map(([key, count]) => (
                          <li key={key}>
                            <strong>{count}</strong> {ENTITY_LABELS[key] || key}
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#172B28]">Recibir un archivo desde USB</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Elige el archivo <code>.cetpro</code> que te entregaron y escribe su clave de seguridad para revisar los cambios
                  antes de incorporarlos a tu base local.
                </p>
              </div>

              {previewError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
                  <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <h4 className="font-semibold">No se pudo verificar el archivo</h4>
                    <p className="text-xs mt-0.5">{previewError}</p>
                    <p className="text-[11px] text-red-500 mt-1">
                      Comprueba que hayas seleccionado el archivo correcto y que la clave coincida exactamente.
                    </p>
                  </div>
                </div>
              )}

              {importError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
                  <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <h4 className="font-semibold">Error al aplicar la actualización</h4>
                    <p className="text-xs mt-0.5">{importError}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selector de archivo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Archivo de actualización (.cetpro)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-[#13594A] transition-colors bg-slate-50/50">
                    <input
                      type="file"
                      id="exchange-file-input"
                      accept=".cetpro,.json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="exchange-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-[#13594A]/10 text-[#13594A] flex items-center justify-center">
                        <UploadIcon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        {selectedFile ? selectedFile.name : 'Seleccionar archivo .cetpro'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Hasta 32 MB'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Clave de protección */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clave que acompaña al archivo
                  </label>
                  <div className="relative">
                    <input
                      type={showReceivePassphrase ? 'text' : 'password'}
                      value={receivePassphrase}
                      onChange={e => setReceivePassphrase(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                      placeholder="Escribe la clave entregada"
                    />
                    <KeyIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowReceivePassphrase(!showReceivePassphrase)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      title={showReceivePassphrase ? 'Ocultar clave' : 'Mostrar clave'}
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {isPreviewing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-500/20 border-t-slate-700 rounded-full animate-spin" />
                      <span>Verificando firma y descifrando...</span>
                    </>
                  ) : (
                    <>
                      <EyeIcon className="w-4 h-4 text-[#13594A]" />
                      <span>Revisar archivo (Vista previa)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tarjeta de vista previa / verificación */}
              {previewReport && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                      <h4 className="font-bold text-sm text-slate-900">
                        {previewReport.duplicatePackage
                          ? 'Esta actualización ya fue recibida anteriormente'
                          : 'Este archivo ha sido verificado con éxito'}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-500">
                      Fecha de exportación: <strong>{formatDate(previewReport.createdAt)}</strong>
                    </span>
                  </div>

                  {previewReport.duplicatePackage ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      <strong>Aviso:</strong> Esta computadora ya tiene aplicada esta actualización exacta. No necesitas
                      recibirla nuevamente.
                    </div>
                  ) : (
                    <>
                      {/* Metadatos del emisor y contenido */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-800 block">Emisor del paquete:</span>
                          <p className="text-slate-600">
                            <strong>{previewReport.description?.sender?.name || 'Personal institucional'}</strong>{' '}
                            ({previewReport.description?.sender?.role})
                          </p>
                          {previewReport.description?.recipient && (
                            <p className="text-slate-500">
                              Destinado a: {previewReport.description.recipient.name} ({previewReport.description.recipient.role})
                            </p>
                          )}
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-800 block">Impacto en tu computadora:</span>
                          <p className="text-slate-600">
                            <strong>{previewReport.recordsToAdd ?? previewReport.newRecords ?? 0}</strong> registros nuevos por agregar.
                          </p>
                          <p className="text-slate-600">
                            <strong>{previewReport.recordsToUpdate ?? previewReport.updates ?? 0}</strong> registros por actualizar.
                          </p>
                          {previewReport.accountUpdate && (
                            <p className="text-indigo-600 font-medium">
                              * Incluye actualización de credenciales o perfil de usuario.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Desglose de aulas */}
                      {previewReport.description?.groups && previewReport.description.groups.length > 0 && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                          <span className="font-semibold text-slate-800 block mb-1">Aulas incluidas:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                            {previewReport.description.groups.map(g => (
                              <li key={g.id}>{g.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Diferencias o pendientes */}
                      {Boolean((previewReport.conflicts && previewReport.conflicts > 0) || (previewReport.pending && previewReport.pending > 0)) && (
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                          <div className="font-bold">
                            Atención: {previewReport.conflicts || 0} diferencias y {previewReport.pending || 0} datos pendientes.
                          </div>
                          <p>
                            Se recibirán todos los cambios compatibles. Las diferencias se conservarán de forma segura para
                            que Dirección las revise en la pestaña de Conflictos; tus valores locales no se perderán.
                          </p>
                        </div>
                      )}

                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                        <span className="text-xs text-slate-500">
                          * Hasta este momento <strong>no se ha modificado</strong> tu base de datos SQLite.
                        </span>

                        <button
                          type="button"
                          onClick={handleApplyPackage}
                          disabled={isImporting}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#13594A] hover:bg-[#0D3E34] rounded-xl transition-all shadow-sm disabled:opacity-50"
                        >
                          {isImporting ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              <span>Aplicando cambios con respaldo previo...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="w-4 h-4" />
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
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                    <h4 className="font-bold text-sm">¡Actualización recibida con éxito en esta computadora!</h4>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Se creó una copia de seguridad automática (<code>antes-sincronizar</code>) antes de modificar los datos.
                    Se incorporaron <strong>{importSuccess.recordsToAdd ?? importSuccess.newRecords ?? 0}</strong> datos nuevos y{' '}
                    <strong>{importSuccess.recordsToUpdate ?? importSuccess.updates ?? 0}</strong> actualizaciones.
                  </p>
                  {Boolean(importSuccess.conflicts || importSuccess.pending) && (
                    <p className="text-xs text-amber-700">
                      Las diferencias detectadas fueron retenidas para auditoría y resolución por Dirección.
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#172B28]">Equipos Vinculados a la Institución</h2>
            <p className="text-xs text-slate-500">
              {systemStatus?.authority
                ? 'Como equipo central de Dirección, puedes autorizar laptops de docentes y secretaría para sincronizar mediante lotes cifrados asimétricos.'
                : 'Esta computadora es un equipo cliente vinculado. Puedes exportar tu lote de sincronización asimétrica hacia el equipo institucional.'}
            </p>

            {/* Listado de equipos vinculados */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ID del Equipo</th>
                    <th className="p-3">Usuario Asignado</th>
                    <th className="p-3">Huella Pública</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(dashboardData?.devices || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">
                        No hay equipos secundarios vinculados actualmente.
                      </td>
                    </tr>
                  ) : (
                    (dashboardData?.devices || []).map(device => (
                      <tr key={device.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-800">
                          {device.id.slice(0, 12)}...
                        </td>
                        <td className="p-3 text-slate-700">
                          <strong>{device.name || 'Sin nombre'}</strong> ({device.userId})
                        </td>
                        <td className="p-3 font-mono text-slate-500 text-[11px]">
                          {device.signingKey?.slice(0, 20)}...
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleExportSyncForDevice(device.id, device.name)}
                            disabled={isExportingSyncId === device.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#13594A] bg-[#13594A]/10 hover:bg-[#13594A]/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <DownloadIcon className="w-3.5 h-3.5" />
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#172B28]">Autorizar nuevo equipo docente o secretaría</h3>
              <p className="text-xs text-slate-500">
                El usuario del nuevo equipo debe generar su archivo <code>SOLICITUD_VINCULACION.json</code> y traértelo en USB.
                Pega el contenido o selecciona el usuario correspondiente para emitir su credencial digital institucional.
              </p>

              {provisionError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  {provisionError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cuenta de usuario a asignar:
                  </label>
                  <select
                    value={provisionUserId}
                    onChange={e => setProvisionUserId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13594A]"
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contenido de la solicitud (JSON):
                  </label>
                  <textarea
                    rows={3}
                    value={deviceRequestJson}
                    onChange={e => setDeviceRequestJson(e.target.value)}
                    placeholder='{"app":"CEPRO_MICAELA","type":"DEVICE_REQUEST",...}'
                    className="w-full p-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleProvisionDevice}
                  disabled={isProvisioning || !provisionUserId || !deviceRequestJson.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#13594A] hover:bg-[#0D3E34] rounded-lg transition-colors disabled:opacity-50"
                >
                  {isProvisioning ? 'Firmando credencial...' : 'Firmar y descargar autorización institucional'}
                </button>
              </div>

              {provisionResult && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                  <strong>¡Equipo autorizado con éxito!</strong>
                  <p>
                    Entrega el archivo <code>AUTORIZACION_VINCULACION.json</code> al usuario para que lo aplique en su computadora.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Generar solicitud si este no es el hub */}
          {!systemStatus?.authority && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#172B28]">Solicitar vinculación de este equipo</h3>
              <p className="text-xs text-slate-500">
                Genera la clave pública de este equipo para entregarla a Dirección en un USB.
              </p>
              <button
                type="button"
                onClick={handleGenerateMyDeviceRequest}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
              >
                <DownloadIcon className="w-4 h-4" />
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <h2 className="text-base font-bold text-[#172B28]">Bandeja de Conflictos y Diferencias Académicas</h2>
            <p className="text-xs text-slate-500">
              Cuando dos computadoras modifican el mismo registro de forma concurrente, el sistema no borra datos ni
              sobreescribe a ciegas. Los cambios incompatibles se retienen aquí para que Dirección decida qué valor conservar.
              Cada decisión genera automáticamente una copia de seguridad SQLite (<code>antes-resolver-conflicto</code>).
            </p>
          </div>

          {conflictsList.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No hay conflictos pendientes</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
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
                    className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                          Conflicto: {entityName}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">
                          Registro ID: <code className="font-mono text-xs">{conflict.operation?.body?.recordId}</code>
                        </h4>
                      </div>
                      <div className="text-xs text-slate-500">
                        Propuesto por: <strong>{actorName}</strong> ({actorRole})
                      </div>
                    </div>

                    {feedback && (
                      <div
                        className={`p-3 rounded-xl text-xs ${
                          feedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {feedback.message}
                      </div>
                    )}

                    {/* Comparativa Lado a Lado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Valor local */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>1. Valor Local Actual en este equipo:</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Rev: {conflict.current?.rev || 'Sin rev'}
                          </span>
                        </div>
                        <pre className="p-2.5 bg-white rounded-lg border border-slate-200 text-[11px] font-mono text-slate-800 overflow-x-auto max-h-40">
                          {JSON.stringify(conflict.current || {}, null, 2)}
                        </pre>
                      </div>

                      {/* Valor entrante */}
                      <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                          <span>2. Valor Recibido en el archivo:</span>
                          <span className="text-[10px] text-blue-500 font-mono">
                            Rev: {conflict.operation?.body?.value?.rev || 'Sin rev'}
                          </span>
                        </div>
                        <pre className="p-2.5 bg-white rounded-lg border border-blue-200 text-[11px] font-mono text-slate-800 overflow-x-auto max-h-40">
                          {JSON.stringify(conflict.operation?.body?.value || {}, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Motivo obligatorio para auditar la decisión */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Motivo obligatorio de la resolución (auditoría institucional):
                      </label>
                      <input
                        type="text"
                        value={conflictReasons[conflict.id] || ''}
                        onChange={e =>
                          setConflictReasons(prev => ({
                            ...prev,
                            [conflict.id]: e.target.value,
                          }))
                        }
                        placeholder="Ejemplo: Se conserva la nota firmada en físico tras revisión con el docente titular"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                      />
                    </div>

                    {/* Acciones de resolución */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleResolveConflict(conflict, 'KEEP_LOCAL')}
                        disabled={resolvingId === conflict.id}
                        className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors disabled:opacity-50"
                      >
                        {resolvingId === conflict.id ? 'Procesando...' : 'Conservar valor local (KEEP_LOCAL)'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResolveConflict(conflict, 'ACCEPT_INCOMING')}
                        disabled={resolvingId === conflict.id}
                        className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-[#13594A] hover:bg-[#0D3E34] rounded-xl transition-colors disabled:opacity-50"
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
    </div>
  );
};

export default Sincronizacion;
