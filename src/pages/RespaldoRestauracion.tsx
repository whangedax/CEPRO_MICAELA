/**
 * src/pages/RespaldoRestauracion.tsx
 * 
 * Módulo Institucional de Respaldos, Integridad y Restauración — CEPRO_MICAELA 2.0.
 * Operación exclusiva de DIRECCIÓN bajo arquitectura offline-first:
 * - Generación de respaldos canónicos JSON con checksum SHA-256.
 * - Clasificación de tipos de respaldo (manual, diario, pre-sync, pre-conflicto, pre-clonación, pre-restauración).
 * - Inspección previa (dry-run) sin escrituras en SQLite para auditar compatibilidad y conteos.
 * - Restauración segura y transaccional con respaldo preventivo automático 'antes-restaurar'.
 * - Verificación de salud física (PRAGMA quick_check) y lógica (database-health.cjs).
 * - Identidad visual Google Stitch (#13594A, #0D3E34, #F6F8FA).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  BackupItem,
  InspectBackupResponse,
  RestoreBackupResponse,
  DatabaseHealthResponse,
  ApiError,
} from '../api/types';
import {
  BackupIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  DownloadIcon,
  UploadIcon,
  EyeIcon,
  LockIcon,
  SearchIcon,
} from '../components/ui/Icons';

interface RespaldoRestauracionProps {
  onNavigate?: (route: NavRoute) => void;
}

type ActiveTab = 'list' | 'restore' | 'health';

const LABEL_DESCRIPTIONS: Record<string, { title: string; color: string }> = {
  'manual': { title: 'Respaldo Manual', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'automatico-diario': { title: 'Automático Diario', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'antes-sincronizar': { title: 'Previo a Sincronización USB', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'antes-resolver-conflicto': { title: 'Previo a Resolver Conflicto', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'antes-nuevo-a_o': { title: 'Previo a Clonar Año', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  'antes-nuevo-ano': { title: 'Previo a Clonar Año', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  'antes-restaurar': { title: 'Preventivo de Restauración', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  'antes-migrar': { title: 'Previo a Migración', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  'cifrado-export': { title: 'Cifrado Portátil (AES-256)', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
};

function formatDate(isoString?: string | null): string {
  if (!isoString) return 'No registrada';
  try {
    const d = new Date(isoString);
    if (!Number.isFinite(d.getTime())) return isoString;
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

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export const RespaldoRestauracion: React.FC<RespaldoRestauracionProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';

  // Estados de navegación interna
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estados de carga y error desacoplados
  const [backupsLoading, setBackupsLoading] = useState<boolean>(true);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [backupsError, setBackupsError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Datos
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [health, setHealth] = useState<DatabaseHealthResponse | null>(null);

  // Creación de respaldo
  const [customLabel, setCustomLabel] = useState<string>('');
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [createSuccess, setCreateSuccess] = useState<{ filename: string; counts: any } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Inspección de respaldo (Preflight)
  const [inspectingFilename, setInspectingFilename] = useState<string | null>(null);
  const [inspectReport, setInspectReport] = useState<InspectBackupResponse | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Restauración
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileContent, setUploadedFileContent] = useState<any | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreSuccess, setRestoreSuccess] = useState<RestoreBackupResponse | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Cifrado y exportación portátil (AES-256-GCM + scrypt)
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportPassphrase, setExportPassphrase] = useState<string>('');
  const [exportConfirmPassphrase, setExportConfirmPassphrase] = useState<string>('');
  const [exportHint, setExportHint] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<{ filename: string; size: number } | null>(null);

  // Descifrado para inspección o restauración
  const [decryptPassphrase, setDecryptPassphrase] = useState<string>('');
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  // Cargar lista de respaldos de forma aislada
  const loadBackups = useCallback(async () => {
    if (!isDirector) return;
    setBackupsLoading(true);
    setBackupsError(null);
    try {
      const data = await apiClient.listBackups();
      setBackups(data);
    } catch (err: any) {
      console.error('Error al listar respaldos:', err);
      setBackupsError(err?.message || 'Error al obtener el historial de respaldos.');
    } finally {
      setBackupsLoading(false);
    }
  }, [isDirector]);

  // Cargar salud SQLite de forma aislada
  const loadHealth = useCallback(async () => {
    if (!isDirector) return;
    setHealthLoading(true);
    setHealthError(null);
    try {
      const data = await apiClient.getDatabaseHealth();
      setHealth(data);
    } catch (err: any) {
      console.error('Error al consultar salud de la base:', err);
      setHealthError(err?.message || 'Error al consultar la salud e integridad de SQLite.');
    } finally {
      setHealthLoading(false);
    }
  }, [isDirector]);

  // Cargar ambos de forma concurrente pero no bloqueante
  const loadData = useCallback(async () => {
    await Promise.allSettled([loadBackups(), loadHealth()]);
  }, [loadBackups, loadHealth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Crear respaldo manual
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const label = customLabel.trim() || 'manual';
      const result = await apiClient.createBackup({ label });
      setCreateSuccess(result);
      setCustomLabel('');
      // Refrescar inmediatamente el historial sin requerir recargar la página
      await loadBackups();
      // Actualizar también diagnóstico para reflejar nuevo registro de auditoría
      loadHealth();
    } catch (err: any) {
      setCreateError(err?.message || 'Error al generar la copia de seguridad.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Descargar archivo
  const handleDownloadBackup = async (filename: string) => {
    try {
      const blob = await apiClient.downloadBackupFile(filename);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error al descargar el archivo: ${err?.message || err}`);
    }
  };

  // Exportar respaldo cifrado AES-256-GCM + scrypt
  const handleExportEncryptedBackup = async () => {
    setExportError(null);
    setExportSuccess(null);
    if (!exportPassphrase || exportPassphrase.length < 8) {
      setExportError('La contraseña de cifrado debe tener al menos 8 caracteres.');
      return;
    }
    if (exportPassphrase !== exportConfirmPassphrase) {
      setExportError('Las contraseñas ingresadas no coinciden.');
      return;
    }
    setIsExporting(true);
    try {
      const res = await apiClient.exportEncryptedBackup({
        passphrase: exportPassphrase,
        hint: exportHint.trim() || undefined,
      });
      setExportSuccess({ filename: res.filename, size: res.size });
      setExportPassphrase('');
      setExportConfirmPassphrase('');
      setExportHint('');
      await loadBackups();
    } catch (err: any) {
      setExportError(err?.message || 'Error al exportar respaldo cifrado.');
    } finally {
      setIsExporting(false);
    }
  };

  // Descifrar e inspeccionar respaldo cifrado
  const handleDecryptAndInspect = async () => {
    if (!decryptPassphrase) {
      setDecryptError('Ingrese la contraseña de descifrado.');
      return;
    }
    setIsDecrypting(true);
    setDecryptError(null);
    try {
      let report: InspectBackupResponse;
      if (inspectingFilename) {
        report = await apiClient.inspectBackup({
          filename: inspectingFilename,
          passphrase: decryptPassphrase,
        });
      } else if (uploadedFileContent) {
        report = await apiClient.inspectBackup({
          source: uploadedFileContent,
          passphrase: decryptPassphrase,
        });
      } else if (selectedBackupForRestore) {
        report = await apiClient.inspectBackup({
          filename: selectedBackupForRestore,
          passphrase: decryptPassphrase,
        });
      } else {
        throw new Error('No hay respaldo seleccionado para descifrar.');
      }
      setInspectReport(report);
    } catch (err: any) {
      setDecryptError(err?.message || 'Contraseña incorrecta o respaldo corrupto.');
    } finally {
      setIsDecrypting(false);
    }
  };

  // Inspeccionar respaldo
  const handleInspect = async (filename: string, passphrase?: string) => {
    setInspectingFilename(filename);
    setInspectReport(null);
    setInspectError(null);
    setDecryptError(null);
    try {
      const report = await apiClient.inspectBackup({ filename, passphrase });
      setInspectReport(report);
    } catch (err: any) {
      setInspectError(err?.message || 'Error al inspeccionar el archivo.');
    }
  };

  // Manejo de archivo subido para restaurar
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setInspectReport(null);
    setInspectError(null);
    setDecryptError(null);
    setRestoreSuccess(null);
    setRestoreError(null);

    if (!file) {
      setUploadedFile(null);
      setUploadedFileContent(null);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setInspectError('El archivo excede el tamaño máximo permitido (50 MB).');
      setUploadedFile(null);
      setUploadedFileContent(null);
      return;
    }

    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        setUploadedFileContent(parsed);
        // Preinspeccionar automáticamente el archivo subido
        const report = await apiClient.inspectBackup({ source: parsed, passphrase: decryptPassphrase || undefined });
        setInspectReport(report);
      } catch (err: any) {
        setInspectError(err?.message || 'El archivo seleccionado no es un JSON o paquete cifrado de respaldo válido.');
        setUploadedFileContent(null);
      }
    };
    reader.onerror = () => {
      setInspectError('Error al leer el archivo desde el disco.');
      setUploadedFileContent(null);
    };
    reader.readAsText(file);
  };

  // Ejecutar restauración
  const handleExecuteRestore = async () => {
    if (restoreConfirmText.trim().toUpperCase() !== 'RESTAURAR') {
      setRestoreError('Debe escribir exactamente la palabra RESTAURAR para confirmar la operación.');
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);
    setRestoreSuccess(null);

    try {
      let payload: any;
      if (uploadedFileContent) {
        payload = { source: uploadedFileContent };
      } else if (selectedBackupForRestore) {
        payload = { filename: selectedBackupForRestore };
      } else {
        throw new Error('Seleccione un respaldo del servidor o suba un archivo .json.');
      }
      if (decryptPassphrase) {
        payload.passphrase = decryptPassphrase;
      }

      const result = await apiClient.restoreBackup(payload);
      setRestoreSuccess(result);
      setRestoreConfirmText('');
      setUploadedFile(null);
      setUploadedFileContent(null);
      setInspectReport(null);
      setDecryptPassphrase('');

      // Recargar datos actualizados
      await loadData();
    } catch (err: any) {
      setRestoreError(err?.message || 'Error al ejecutar la restauración.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Filtrado de respaldos en tabla
  const filteredBackups = useMemo(() => {
    if (!searchTerm.trim()) return backups;
    const term = searchTerm.toLowerCase();
    return backups.filter(
      b =>
        b.filename.toLowerCase().includes(term) ||
        b.label.toLowerCase().includes(term) ||
        (LABEL_DESCRIPTIONS[b.label]?.title || '').toLowerCase().includes(term)
    );
  }, [backups, searchTerm]);

  if (!isDirector) {
    return (
      <div className="p-8 text-center text-red-700 bg-red-50 rounded-2xl border border-red-200 m-6">
        <AlertCircleIcon className="w-8 h-8 mx-auto text-red-600 mb-2" />
        <h2 className="text-lg font-bold">Módulo Exclusivo de Dirección</h2>
        <p className="text-sm mt-1">
          La gestión de copias de seguridad y restauración del sistema está reservada estrictamente al rol DIRECTOR.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera institucional Stitch */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#13594A]/10 text-[#13594A] flex items-center justify-center shrink-0">
            <BackupIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#172B28]">Centro de Respaldos y Restauración</h1>
            <p className="text-sm text-slate-500 mt-1">
              Protección y recuperación integral de la base de datos institucional de CEPRO_MICAELA.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  healthLoading
                    ? 'bg-slate-50 text-slate-600 border-slate-200'
                    : healthError || !health
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : health.healthy
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : health.errors.length > 0
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    healthLoading
                      ? 'bg-slate-400'
                      : healthError || !health
                      ? 'bg-slate-500'
                      : health.healthy
                      ? 'bg-emerald-500'
                      : health.errors.length > 0
                      ? 'bg-rose-500'
                      : 'bg-amber-500 animate-pulse'
                  }`}
                />
                {healthLoading
                  ? 'Verificando salud...'
                  : healthError || !health
                  ? 'Diagnóstico no disponible'
                  : health.healthy
                  ? 'Base de Datos Íntegra y Conforme'
                  : health.errors.length > 0
                  ? 'Error de Integridad Detectado'
                  : 'Advertencias de Integridad'}
              </span>

              <span className="text-xs text-slate-500">
                Esquema SQLite: <strong>{health ? `v${health.schemaVersion}` : '-'}</strong>
              </span>

              <span className="text-xs text-slate-500">
                Modo Journal: <strong>{health ? (health.journalMode || 'WAL').toUpperCase() : '-'}</strong>
              </span>

              <span className="text-xs text-slate-500">
                Total respaldos: <strong>{backupsLoading ? '...' : `${backups.length} archivos`}</strong>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={backupsLoading || healthLoading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
          title="Actualizar datos"
        >
          <RefreshIcon className={`w-4 h-4 ${backupsLoading || healthLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Selector de pestañas principales */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-[#13594A] text-[#13594A]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <BackupIcon className="w-4 h-4" />
          <span>Copias de Seguridad (Respaldos)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {backupsLoading ? '...' : backups.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('restore')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'restore'
              ? 'border-[#13594A] text-[#13594A]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <UploadIcon className="w-4 h-4" />
          <span>Restauración Controlada</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'health'
              ? 'border-[#13594A] text-[#13594A]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
          <span>Salud e Integridad SQLite</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: LISTADO Y CREACIÓN DE RESPALDOS                                */}
      {/* ========================================================================= */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Card: Generar Respaldo Inmediato */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#172B28]">Crear Respaldo Manual Inmediato</h2>
            <p className="text-xs text-slate-500">
              Genera una copia completa estructurada en formato JSON canónico con suma de verificación SHA-256 (checksum)
              en la carpeta privada del servicio. Incluye todos los registros académicos, configuraciones, usuarios y
              trazas de auditoría.
            </p>

            {createError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {createSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>¡Respaldo creado satisfactoriamente!</span>
                </div>
                <p>
                  Archivo: <code className="font-mono font-semibold">{createSuccess.filename}</code>
                </p>
                <p className="text-slate-600">
                  Registros respaldados: <strong>{createSuccess.counts.records}</strong> | Operaciones de sincronización:{' '}
                  <strong>{createSuccess.counts.operations}</strong>
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={customLabel}
                  onChange={e => setCustomLabel(e.target.value)}
                  placeholder="Etiqueta opcional (ej: fin-de-semestre, antes-auditoria)"
                  maxLength={50}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#13594A] hover:bg-[#0D3E34] rounded-lg transition-colors disabled:opacity-50"
              >
                {isCreatingBackup ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Generando copia...</span>
                  </>
                ) : (
                  <>
                    <BackupIcon className="w-4 h-4" />
                    <span>Generar Respaldo Ahora</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowExportModal(true);
                  setExportError(null);
                  setExportSuccess(null);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-[#13594A] bg-[#E8F3F0] hover:bg-[#D4EBE5] border border-[#13594A]/30 rounded-lg transition-colors"
                title="Exportar respaldo cifrado y protegido con contraseña para traslado externo (USB/nube)"
              >
                <LockIcon className="w-4 h-4 text-[#13594A]" />
                <span>Exportar Cifrado (.cetpro-backup)</span>
              </button>
            </div>
          </div>

          {/* Card: Tabla de Respaldos Existentes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#172B28]">Historial de Respaldos Disponibles</h3>
                <p className="text-xs text-slate-500">
                  Archivos de seguridad almacenados localmente en la carpeta privada del sistema.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar respaldo..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Nombre del Archivo</th>
                    <th className="p-3">Tipo / Motivo</th>
                    <th className="p-3">Fecha y Hora</th>
                    <th className="p-3">Tamaño</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {backupsLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-[#13594A]/20 border-t-[#13594A] rounded-full animate-spin" />
                          <span>Cargando historial de respaldos...</span>
                        </div>
                      </td>
                    </tr>
                  ) : backupsError ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center bg-red-50/50">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="flex items-center gap-2 text-red-700 font-semibold">
                            <AlertCircleIcon className="w-4 h-4 text-red-500" />
                            <span>Error al consultar el historial de respaldos: {backupsError}</span>
                          </div>
                          <button
                            type="button"
                            onClick={loadBackups}
                            className="mt-1 px-3 py-1 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-semibold shadow-sm transition-colors text-xs"
                          >
                            Reintentar Carga
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredBackups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        {searchTerm ? 'No se encontraron respaldos coincidentes.' : 'No hay respaldos generados aún.'}
                      </td>
                    </tr>
                  ) : (
                    filteredBackups.map(item => {
                      const desc = LABEL_DESCRIPTIONS[item.label] || {
                        title: item.label,
                        color: 'bg-slate-100 text-slate-700 border-slate-200',
                      };

                      return (
                        <tr key={item.filename} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-semibold text-slate-800 text-[11px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.filename.endsWith('.cetpro-backup') && (
                                <span
                                  title="Respaldo cifrado con AES-256-GCM y derivación scrypt"
                                  className="inline-flex items-center gap-0.5 text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[9px] font-bold"
                                >
                                  <LockIcon className="w-2.5 h-2.5 text-amber-700" />
                                  AES-256
                                </span>
                              )}
                              <span>{item.filename}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${desc.color}`}
                            >
                              {desc.title}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 text-[11px]">{formatDate(item.createdAt)}</td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{formatBytes(item.size)}</td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleInspect(item.filename)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                              title="Inspeccionar integridad y contenido"
                            >
                              <EyeIcon className="w-3.5 h-3.5 text-slate-500" />
                              <span>Verificar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadBackup(item.filename)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#13594A] bg-[#13594A]/10 hover:bg-[#13594A]/20 rounded-lg transition-colors"
                              title="Descargar copia JSON a tu disco"
                            >
                              <DownloadIcon className="w-3.5 h-3.5" />
                              <span>Descargar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBackupForRestore(item.filename);
                                setActiveTab('restore');
                                handleInspect(item.filename);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                              title="Preparar restauración de este archivo"
                            >
                              <span>Restaurar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal / Card de Inspección de Respaldo */}
          {inspectReport && (
            <div className="bg-white p-6 rounded-2xl border border-[#13594A]/30 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  {inspectReport.requiresPassphrase ? (
                    <LockIcon className="w-5 h-5 text-amber-600" />
                  ) : (
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                  )}
                  <h4 className="font-bold text-sm text-slate-900">
                    {inspectReport.requiresPassphrase ? 'Respaldo Cifrado Detectado: ' : 'Inspección de Integridad: '}
                    {inspectReport.filename || 'Archivo Subido'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInspectReport(null);
                    setDecryptPassphrase('');
                    setDecryptError(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕ Cerrar
                </button>
              </div>

              {inspectReport.requiresPassphrase ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-3">
                  <p className="text-amber-900 font-medium">
                    Este archivo está protegido mediante cifrado institucional <strong>AES-256-GCM</strong> y derivación de clave por <strong>scrypt</strong>. Para verificar su integridad y auditar su contenido, ingrese la contraseña:
                  </p>
                  {inspectReport.hint && (
                    <p className="text-amber-800 bg-amber-100/70 p-2 rounded-lg font-mono text-[11px]">
                      <strong>Pista de la contraseña:</strong> {inspectReport.hint}
                    </p>
                  )}
                  {decryptError && (
                    <div className="p-2.5 rounded-lg bg-red-100 border border-red-300 text-red-800 text-xs flex items-center gap-2">
                      <AlertCircleIcon className="w-4 h-4 shrink-0" />
                      <span>{decryptError}</span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="password"
                      value={decryptPassphrase}
                      onChange={e => setDecryptPassphrase(e.target.value)}
                      placeholder="Contraseña de descifrado..."
                      className="flex-1 px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleDecryptAndInspect}
                      disabled={isDecrypting || !decryptPassphrase}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#13594A] hover:bg-[#0D3E34] rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isDecrypting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span>Descifrando...</span>
                        </>
                      ) : (
                        <>
                          <LockIcon className="w-3.5 h-3.5" />
                          <span>Descifrar e Inspeccionar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-semibold text-slate-700 block">Metadatos de Formato</span>
                      <p>
                        Aplicación: <strong>{inspectReport.app}</strong>
                      </p>
                      <p>
                        Versión del formato: <strong>v{inspectReport.version}</strong>
                      </p>
                      <p>
                        Fecha de creación: <strong>{formatDate(inspectReport.at)}</strong>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-semibold text-slate-700 block">Integridad Criptográfica</span>
                      <p className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Checksum SHA-256 válido
                      </p>
                      <p className="font-mono text-[10px] text-slate-500 break-all">{inspectReport.checksum}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-semibold text-slate-700 block">Total de Registros</span>
                      <p className="text-xl font-bold text-[#13594A]">{inspectReport.totalRecords}</p>
                      <p className="text-[11px] text-slate-500">Todas las tablas requeridas presentes</p>
                    </div>
                  </div>

                  {/* Desglose de Entidades Académicas */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-800 block mb-2">Desglose de Entidades en el Respaldo:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                      <div>
                        Estudiantes: <strong>{inspectReport.counts.students}</strong>
                      </div>
                      <div>
                        Matrículas: <strong>{inspectReport.counts.enrollments}</strong>
                      </div>
                      <div>
                        Aulas/Grupos: <strong>{inspectReport.counts.groups}</strong>
                      </div>
                      <div>
                        Calificaciones: <strong>{inspectReport.counts.grades}</strong>
                      </div>
                      <div>
                        Asistencias: <strong>{inspectReport.counts.attendance}</strong>
                      </div>
                      <div>
                        Carreras: <strong>{inspectReport.counts.programs}</strong>
                      </div>
                      <div>
                        Módulos: <strong>{inspectReport.counts.modules}</strong>
                      </div>
                      <div>
                        Cuentas de usuario: <strong>{inspectReport.counts.users}</strong>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: RESTAURACIÓN CONTROLADA                                        */}
      {/* ========================================================================= */}
      {activeTab === 'restore' && (
        <div className="space-y-6">
          {/* Advertencia Crítica */}
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5 text-amber-600 shrink-0" />
              <h3 className="font-bold text-sm">Operación de Alto Impacto: Restauración de Base de Datos</h3>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              La restauración reemplaza el contenido actual de SQLite con los datos del respaldo seleccionado.
              Antes de aplicar cualquier modificación, el motor ejecuta automáticamente una copia de seguridad preventiva
              (<code>antes-restaurar</code>). Toda la operación se realiza dentro de una transacción atómica; si se detecta
              cualquier inconsistencia relacional, SQLite revierte la operación y conserva la base anterior intacta.
            </p>
          </div>

          {restoreError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5 shrink-0 text-red-600" />
              <div>
                <strong>Error en la restauración:</strong>
                <p className="mt-0.5">{restoreError}</p>
              </div>
            </div>
          )}

          {restoreSuccess && (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>¡Base de datos restaurada satisfactoriamente!</span>
              </div>
              <p>
                Se creó una copia preventiva previa:{' '}
                <code className="font-mono font-bold bg-emerald-100 px-1 py-0.5 rounded">
                  {restoreSuccess.previousCopy}
                </code>
              </p>
              <p className="text-emerald-800">
                Los datos han sido validados físicamente con PRAGMA quick_check y verificados con database-health.cjs.
              </p>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-[#172B28]">Paso 1: Seleccionar Origen del Respaldo</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Opción A: Archivo en servidor */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Opción A: Elegir respaldo existente en el servidor local
                </label>
                <select
                  value={selectedBackupForRestore}
                  onChange={e => {
                    setSelectedBackupForRestore(e.target.value);
                    setUploadedFile(null);
                    setUploadedFileContent(null);
                    if (e.target.value) handleInspect(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                >
                  <option value="">-- Seleccionar archivo del servidor --</option>
                  {backups.map(b => (
                    <option key={b.filename} value={b.filename}>
                      {b.filename} ({formatBytes(b.size)}) — {b.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Selecciona una copia generada previamente en esta computadora.
                </p>
              </div>

              {/* Opción B: Subir archivo */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Opción B: Cargar archivo de respaldo externo (.json o .cetpro-backup)
                </label>
                <input
                  type="file"
                  id="restore-upload-input"
                  accept=".json,.cetpro-backup"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="restore-upload-input"
                  className="cursor-pointer block border-2 border-dashed border-slate-300 hover:border-[#13594A] rounded-xl p-3 text-center transition-colors bg-white"
                >
                  <UploadIcon className="w-5 h-5 mx-auto text-[#13594A] mb-1" />
                  <span className="text-xs font-semibold text-slate-700 block">
                    {uploadedFile ? uploadedFile.name : 'Seleccionar archivo .json o .cetpro-backup'}
                  </span>
                  <span className="text-[10px] text-slate-400">Hasta 50 MB</span>
                </label>
              </div>
            </div>

            {/* Paso 2: Auditoría del archivo seleccionado */}
            {inspectReport && (
              inspectReport.requiresPassphrase ? (
                <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 space-y-3 text-xs">
                  <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                    <LockIcon className="w-4 h-4 text-amber-600" />
                    <span>Respaldo Cifrado Portátil — Se Requiere Contraseña de Desbloqueo</span>
                  </h4>
                  <p className="text-amber-800">
                    Este respaldo está cifrado con <strong>AES-256-GCM</strong>. Debe ingresar la contraseña con la que fue creado para verificar su integridad antes de proceder a la restauración:
                  </p>
                  {inspectReport.hint && (
                    <p className="text-amber-800 bg-amber-100/70 p-2 rounded-lg font-mono text-[11px]">
                      <strong>Pista de la contraseña:</strong> {inspectReport.hint}
                    </p>
                  )}
                  {decryptError && (
                    <div className="p-2.5 rounded-lg bg-red-100 border border-red-300 text-red-800 text-xs flex items-center gap-2">
                      <AlertCircleIcon className="w-4 h-4 shrink-0" />
                      <span>{decryptError}</span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="password"
                      value={decryptPassphrase}
                      onChange={e => setDecryptPassphrase(e.target.value)}
                      placeholder="Ingrese contraseña para desbloquear..."
                      className="flex-1 px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleDecryptAndInspect}
                      disabled={isDecrypting || !decryptPassphrase}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#13594A] hover:bg-[#0D3E34] rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isDecrypting ? 'Descifrando...' : 'Desbloquear y Auditar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                    <span>Respaldo Verificado y Apto para Restauración</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                    <div>
                      Alumnos: <strong>{inspectReport.counts.students}</strong>
                    </div>
                    <div>
                      Matrículas: <strong>{inspectReport.counts.enrollments}</strong>
                    </div>
                    <div>
                      Aulas: <strong>{inspectReport.counts.groups}</strong>
                    </div>
                    <div>
                      Notas: <strong>{inspectReport.counts.grades}</strong>
                    </div>
                    <div>
                      Asistencias: <strong>{inspectReport.counts.attendance}</strong>
                    </div>
                    <div>
                      Cuentas: <strong>{inspectReport.counts.users}</strong>
                    </div>
                    <div>
                      Operaciones: <strong>{inspectReport.counts.operations}</strong>
                    </div>
                    <div>
                      Total registros: <strong>{inspectReport.totalRecords}</strong>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Paso 3: Confirmación obligatoria */}
            {(selectedBackupForRestore || uploadedFileContent) && inspectReport?.valid && !inspectReport?.requiresPassphrase && (
              <div className="p-5 rounded-xl bg-rose-50/50 border border-rose-200 space-y-4">
                <h4 className="font-bold text-sm text-rose-900">Paso 2: Confirmación Obligatoria</h4>
                <p className="text-xs text-rose-800">
                  Para proceder con la restauración, escribe la palabra{' '}
                  <strong className="font-mono bg-rose-100 px-1 py-0.5 rounded">RESTAURAR</strong> en el siguiente campo:
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="text"
                    value={restoreConfirmText}
                    onChange={e => setRestoreConfirmText(e.target.value)}
                    placeholder="Escribe RESTAURAR"
                    className="w-full sm:w-64 px-3 py-2 text-xs font-bold uppercase bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />

                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isRestoring || restoreConfirmText.trim().toUpperCase() !== 'RESTAURAR'}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Restaurando base y verificando...</span>
                      </>
                    ) : (
                      <>
                        <UploadIcon className="w-4 h-4" />
                        <span>Confirmar y Ejecutar Restauración Segura</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: SALUD E INTEGRIDAD SQLITE                                      */}
      {/* ========================================================================= */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#172B28]">Auditoría de Integridad SQLite</h2>
                <p className="text-xs text-slate-500">
                  Evaluación en tiempo real de la consistencia física y lógica de la base de datos institucional.
                </p>
              </div>

              <button
                type="button"
                onClick={loadHealth}
                disabled={healthLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshIcon className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                <span>Reevaluar Salud</span>
              </button>
            </div>

            {healthError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircleIcon className="w-4 h-4 shrink-0 text-red-500" />
                  <span>No fue posible consultar el diagnóstico de la base de datos: {healthError}</span>
                </div>
                <button
                  type="button"
                  onClick={loadHealth}
                  className="px-3 py-1 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-semibold shadow-sm transition-colors"
                >
                  Reintentar
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block">Comprobación Física (PRAGMA quick_check)</span>
                <span
                  className={`text-base font-bold flex items-center gap-1 ${
                    healthLoading
                      ? 'text-slate-500'
                      : healthError || !health
                      ? 'text-slate-600'
                      : health.physicalIntegrity
                      ? 'text-emerald-700'
                      : 'text-red-700'
                  }`}
                >
                  {healthLoading ? (
                    <span>CONSULTANDO...</span>
                  ) : healthError || !health ? (
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">NO DISPONIBLE</span>
                  ) : health.physicalIntegrity ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                      <span>CORRECTO (ok)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircleIcon className="w-4 h-4 text-red-600" />
                      <span>FALLO DE INTEGRIDAD</span>
                    </>
                  )}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block">Versión del Esquema (user_version)</span>
                <span className="text-base font-bold text-slate-800">
                  {healthLoading ? '...' : healthError || !health ? '-' : `v${health.schemaVersion}`}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block">Modo de Diario (journal_mode)</span>
                <span className="text-base font-bold text-slate-800">
                  {healthLoading ? '...' : healthError || !health ? '-' : (health.journalMode || 'WAL').toUpperCase()}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block">Estado General de Salud</span>
                <span
                  className={`text-base font-bold flex items-center gap-1 ${
                    healthLoading
                      ? 'text-slate-500'
                      : healthError || !health
                      ? 'text-slate-600'
                      : health.healthy
                      ? 'text-emerald-700'
                      : health.errors.length > 0
                      ? 'text-red-700'
                      : 'text-amber-700'
                  }`}
                >
                  {healthLoading ? (
                    <span>CONSULTANDO...</span>
                  ) : healthError || !health ? (
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">NO DISPONIBLE</span>
                  ) : health.healthy ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                      <span>100% SALUDABLE</span>
                    </>
                  ) : health.errors.length > 0 ? (
                    <>
                      <AlertCircleIcon className="w-4 h-4 text-red-600" />
                      <span>ERROR DE INTEGRIDAD</span>
                    </>
                  ) : (
                    <>
                      <AlertCircleIcon className="w-4 h-4 text-amber-600" />
                      <span>ADVERTENCIAS</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Fila de comprobaciones físicas y ruta SQLite */}
            {health && (
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-600">
                <div className="flex flex-wrap items-center gap-4">
                  <span>
                    quick_check: <strong className={health.quickCheck === 'ok' || health.physicalIntegrity ? 'text-emerald-700' : 'text-red-700'}>{health.quickCheck || 'ok'}</strong>
                  </span>
                  <span>
                    integrity_check: <strong className={health.integrityCheck === 'ok' || health.physicalIntegrity ? 'text-emerald-700' : 'text-red-700'}>{health.integrityCheck || 'ok'}</strong>
                  </span>
                  <span>
                    foreign_keys: <strong className={health.foreignKeyCheck === 'ok' || !health.errors.some(e => e.code === 'FOREIGN_KEY_VIOLATION') ? 'text-emerald-700' : 'text-red-700'}>{health.foreignKeyCheck || 'ok'}</strong>
                  </span>
                </div>
                {health.dbPath && (
                  <div className="font-mono text-[11px] text-slate-500 truncate max-w-md" title={health.dbPath}>
                    Base: {health.dbPath}
                  </div>
                )}
              </div>
            )}

            {/* Conteos de la base activa */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <h4 className="font-semibold text-slate-800 mb-2">Conteos Activos en SQLite:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-slate-700">
                <div>
                  Estudiantes: <strong>{healthLoading ? '...' : health ? health.counts.students : '-'}</strong>
                </div>
                <div>
                  Matrículas: <strong>{healthLoading ? '...' : health ? health.counts.enrollments : '-'}</strong>
                </div>
                <div>
                  Aulas/Grupos: <strong>{healthLoading ? '...' : health ? health.counts.groups : '-'}</strong>
                </div>
                <div>
                  Notas: <strong>{healthLoading ? '...' : health ? health.counts.grades : '-'}</strong>
                </div>
                <div>
                  Asistencias: <strong>{healthLoading ? '...' : health ? health.counts.attendance : '-'}</strong>
                </div>
              </div>
            </div>

            {/* Listado de advertencias o errores lógicos */}
            {health && (health.errors.length > 0 || health.warnings.length > 0) && (
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs text-slate-800">Detalles de Validación Lógica:</h4>

                {health.errors.map((e, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    <strong>[ERROR {e.code}]</strong> {e.entity}:{e.id} — {e.message}
                  </div>
                ))}

                {health.warnings.map((w, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <strong>[ADVERTENCIA {w.code}]</strong> {w.entity}:{w.id} — {w.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Exportar Respaldo Cifrado Portátil */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#E8F3F0] rounded-xl text-[#13594A]">
                  <LockIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#172B28]">Exportar Respaldo Cifrado Portátil</h3>
                  <p className="text-[11px] text-slate-500">Formato seguro .cetpro-backup (AES-256-GCM + scrypt)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕ Cerrar
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Protege las contraseñas institucionales y datos confidenciales antes de copiarlos a una memoria USB o transmitirlos por red externa. Requiere una contraseña de al menos 8 caracteres para ser descifrado posteriormente.
            </p>

            {exportError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4 shrink-0" />
                <span>{exportError}</span>
              </div>
            )}

            {exportSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>¡Respaldo cifrado exportado exitosamente!</span>
                </div>
                <p>
                  Archivo: <code className="font-mono font-semibold">{exportSuccess.filename}</code> ({formatBytes(exportSuccess.size)})
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadBackup(exportSuccess.filename)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#13594A] text-white text-xs font-bold rounded-lg hover:bg-[#0D3E34] transition-colors"
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                    <span>Descargar Archivo Cifrado Ahora</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contraseña de Cifrado (mínimo 8 caracteres):
                </label>
                <input
                  type="password"
                  value={exportPassphrase}
                  onChange={e => setExportPassphrase(e.target.value)}
                  placeholder="Ingrese contraseña segura..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirmar Contraseña:
                </label>
                <input
                  type="password"
                  value={exportConfirmPassphrase}
                  onChange={e => setExportConfirmPassphrase(e.target.value)}
                  placeholder="Repita la contraseña..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pista de Contraseña (opcional, visible sin descifrar):
                </label>
                <input
                  type="text"
                  value={exportHint}
                  onChange={e => setExportHint(e.target.value)}
                  placeholder="Ej: Iniciales y año del director"
                  maxLength={100}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExportEncryptedBackup}
                disabled={isExporting || !exportPassphrase || !exportConfirmPassphrase}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#13594A] hover:bg-[#0D3E34] rounded-lg transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Cifrando y generando...</span>
                  </>
                ) : (
                  <>
                    <LockIcon className="w-3.5 h-3.5" />
                    <span>Cifrar y Exportar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RespaldoRestauracion;
