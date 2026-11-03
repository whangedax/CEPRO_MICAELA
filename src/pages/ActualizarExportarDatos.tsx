/**
 * src/pages/ActualizarExportarDatos.tsx
 *
 * Centro de Exportación y Actualización Tabular de Datos — CEPRO_MICAELA 2.0.
 * Conectado a los endpoints reales del backend (DataUpdateService):
 *   - GET  /api/data/catalog
 *   - POST /api/data/export
 *   - POST /api/data/template
 *   - POST /api/data/preview
 *   - POST /api/data/apply
 * Permite a Secretaría, Dirección y Docentes exportar padrones oficiales en CSV/XLSX/JSON
 * e importar lotes verificados con respaldo automático previo ('antes-importar-tabla').
 */

import React, { useState, useEffect, useCallback } from 'react';
import { NavRoute } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiClient } from '../api/client';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import {
  DataObjectIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ArrowForwardIcon,
  RefreshIcon,
} from '../components/ui/Icons';

export interface DataCatalogKind {
  kind: string;
  title?: string;
  columns: string[];
  required: string[];
  canImport: boolean;
  canExport: boolean;
}

export interface DataCatalogResponse {
  version: number;
  kinds: DataCatalogKind[];
  maxRows: number;
}

export interface DataPreviewChange {
  line: number;
  action: string;
  name?: string;
  groupId?: string;
  after?: unknown;
}

export interface DataPreviewResponse {
  token: string;
  kind: string;
  total: number;
  ignored: number;
  errors: { line: number; message: string }[];
  warnings: string[];
  canApply: boolean;
  changes: DataPreviewChange[];
  columns: string[];
}

export interface ActualizarExportarDatosProps {
  onNavigate?: (route: NavRoute) => void;
}

const KIND_LABELS: Record<string, { title: string; description: string }> = {
  estudiantes: {
    title: 'Padrón de Estudiantes y Matrículas',
    description: 'DNI, apellidos y nombres, sexo, fecha de nacimiento, aula asignada y fecha de ingreso.',
  },
  docentes: {
    title: 'Directorio de Docentes y Asignaciones',
    description: 'Cuentas docentes, nombres completos, programa de estudios, aula y unidades asignadas.',
  },
  notas: {
    title: 'Registro de Evaluaciones (Notas Vigesimales)',
    description: 'Calificaciones por indicador de logro (IL1..IL5, RESULTADO_UD) de la unidad activa.',
  },
  asistencias: {
    title: 'Registro de Asistencia por Sesión',
    description: 'Estados de asistencia (P, F, J, T) por fecha, sesión y estudiante.',
  },
};

export const ActualizarExportarDatos: React.FC<ActualizarExportarDatosProps> = ({ onNavigate }) => {
  const { options, activeWorkspace } = useWorkspace();
  const [catalog, setCatalog] = useState<DataCatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedKind, setSelectedKind] = useState<string>('estudiantes');
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'xlsx' | 'json'>('csv');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Estado de importación / previsualización
  const [fileName, setFileName] = useState<string>('');
  const [fileContentBase64, setFileContentBase64] = useState<string>('');
  const [fileText, setFileText] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<DataPreviewResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const token = apiClient.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const secret = apiClient.getInstanceSecret();
    if (secret) headers['X-CETPRO-Instance-Secret'] = secret;
    return headers;
  }, []);

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${apiClient.getBaseUrl()}/api/data/catalog`, {
        method: 'GET',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo consultar el catálogo de tablas.');
      }
      const data: DataCatalogResponse = await res.json();
      setCatalog(data);
      if (data.kinds.length > 0 && !data.kinds.some((k) => k.kind === selectedKind)) {
        setSelectedKind(data.kinds[0].kind);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al cargar catálogo de datos.');
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders, selectedKind]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (activeWorkspace && !activeWorkspace.overview && activeWorkspace.groupId) {
      setSelectedGroupId(activeWorkspace.groupId);
    }
  }, [activeWorkspace]);

  const handleDownload = async (isTemplate: boolean) => {
    setIsDownloading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const endpoint = isTemplate ? '/api/data/template' : '/api/data/export';
      const payload: Record<string, unknown> = {
        kind: selectedKind,
        format: selectedFormat,
        options: {
          ...(selectedGroupId ? { groupId: selectedGroupId } : {}),
          ...(activeWorkspace?.unit ? { unit: activeWorkspace.unit } : {}),
        },
      };

      const res = await fetch(`${apiClient.getBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo generar el archivo de exportación.');
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `CETPRO_${selectedKind}${isTemplate ? '_plantilla' : ''}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

      setSuccessMsg(
        isTemplate
          ? `Plantilla oficial de ${selectedKind} (${selectedFormat.toUpperCase()}) descargada con éxito.`
          : `Datos actuales de ${selectedKind} (${selectedFormat.toUpperCase()}) exportados con éxito.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error durante la descarga del archivo.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPreviewResult(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!file) {
      setFileName('');
      setFileContentBase64('');
      setFileText('');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    if (file.name.toLowerCase().endsWith('.xlsx')) {
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        setFileContentBase64(btoa(binary));
        setFileText('');
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => {
        setFileText(String(reader.result || ''));
        setFileContentBase64('');
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  const handlePreviewImport = async () => {
    if (!fileText && !fileContentBase64) {
      setErrorMsg('Seleccione primero un archivo CSV, JSON o XLSX para revisar.');
      return;
    }
    setIsPreviewing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const ext = fileName.toLowerCase().endsWith('.xlsx')
        ? 'xlsx'
        : fileName.toLowerCase().endsWith('.json')
        ? 'json'
        : 'csv';

      const payload: Record<string, unknown> = {
        kind: selectedKind,
        format: ext,
        ...(ext === 'xlsx' ? { data: fileContentBase64 } : { text: fileText }),
      };

      const res = await fetch(`${apiClient.getBaseUrl()}/api/data/preview`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al analizar el archivo de actualización.');
      }

      setPreviewResult(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo previsualizar el archivo.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleApplyImport = async () => {
    if (!previewResult?.token) return;
    setIsApplying(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${apiClient.getBaseUrl()}/api/data/apply`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ token: previewResult.token }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo aplicar la actualización de datos.');
      }
      setSuccessMsg(
        `Actualización aplicada con éxito: ${data.applied || 0} registro(s) procesados. Respaldo previo creado (${data.backup || 'automático'}).`
      );
      setPreviewResult(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al aplicar el lote de datos.');
    } finally {
      setIsApplying(false);
    }
  };

  const currentKindInfo = catalog?.kinds.find((k) => k.kind === selectedKind);
  const groups = options?.groups || [];

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Encabezado */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#263834]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#004034] dark:text-[#5EEAD4] uppercase tracking-widest bg-[#E6F4F1] dark:bg-[#132B25] px-2.5 py-1 rounded-md">
              Interoperabilidad Tabular · Offline-First
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-[28px] text-[#0D382F] dark:text-[#F0FDF8] font-bold tracking-tight">
            Actualizar y Exportar Datos
          </h1>
          <p className="text-[14px] text-slate-600 dark:text-slate-300 mt-0.5">
            Descargue padrones oficiales en Excel (XLSX), CSV o JSON y aplique actualizaciones masivas con validación previa y respaldo automático.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={loadCatalog}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#182220] border border-slate-200 dark:border-[#263834] text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#13594A] transition-colors"
          >
            <RefreshIcon className="w-4 h-4 text-[#13594A] dark:text-[#5EEAD4]" />
            <span>Actualizar</span>
          </button>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('inicio')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#182220] border border-slate-200 dark:border-[#263834] text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#13594A] transition-colors"
            >
              <span>Panel Principal</span>
              <ArrowForwardIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircleIcon className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-[#182220] border border-slate-200 dark:border-[#263834] flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-[#13594A]/20 border-t-[#13594A] rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Consultando esquemas de exportación e importación autorizados...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Selección de tipo de tabla y exportación */}
          <div className="lg:col-span-6 space-y-6">
            <section className="bg-white dark:bg-[#182220] rounded-3xl p-6 border border-slate-200/90 dark:border-[#263834] shadow-xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E6F4F1] dark:bg-[#132B25] text-[#13594A] dark:text-[#5EEAD4] flex items-center justify-center">
                  <DataObjectIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#172B28] dark:text-[#F0FDF8]">
                    1. Seleccionar Tabla y Exportar Datos
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Elija el tipo de registro académico que desea descargar o preparar.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {(catalog?.kinds || []).map((k) => {
                  const meta = KIND_LABELS[k.kind] || {
                    title: k.kind.toUpperCase(),
                    description: `Columnas: ${k.columns.join(', ')}`,
                  };
                  const active = selectedKind === k.kind;
                  return (
                    <button
                      key={k.kind}
                      type="button"
                      onClick={() => {
                        setSelectedKind(k.kind);
                        setPreviewResult(null);
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        active
                          ? 'bg-[#F2FBF8] dark:bg-[#132B25] border-[#13594A] dark:border-[#5EEAD4] shadow-xs'
                          : 'bg-slate-50/70 dark:bg-[#131C1A] border-slate-200/80 dark:border-[#263834] hover:border-[#13594A]/40'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-[#172B28] dark:text-[#F0FDF8]">
                          {meta.title}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          {meta.description}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-[#182220] text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 shrink-0">
                        {k.kind}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Filtro opcional de aula y formato */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label
                    htmlFor="export-group-select"
                    className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Filtrar por Aula (opcional)
                  </label>
                  <select
                    id="export-group-select"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-xs font-semibold text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Todas las aulas autorizadas ({groups.length})</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.studentCount} est.)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="export-format-select"
                    className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Formato de Archivo
                  </label>
                  <select
                    id="export-format-select"
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value as 'csv' | 'xlsx' | 'json')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-xs font-semibold text-slate-900 dark:text-slate-100"
                  >
                    <option value="csv">CSV (Valores separados por comas)</option>
                    <option value="xlsx">Excel Oficial (.xlsx)</option>
                    <option value="json">JSON Estructurado (.json)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isDownloading || !currentKindInfo?.canExport}
                  onClick={() => handleDownload(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#004034] transition-colors shadow-xs disabled:opacity-50"
                >
                  {isDownloading ? 'Generando archivo...' : `Exportar Datos Actuales (${selectedFormat.toUpperCase()})`}
                </button>
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={() => handleDownload(true)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#131C1A] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-[#263834] text-xs font-bold hover:border-[#13594A] transition-colors disabled:opacity-50"
                >
                  Descargar Plantilla Vacía
                </button>
              </div>
            </section>
          </div>

          {/* Importación y Verificación de Lotes */}
          <div className="lg:col-span-6 space-y-6">
            <section className="bg-white dark:bg-[#182220] rounded-3xl p-6 border border-slate-200/90 dark:border-[#263834] shadow-xs space-y-5">
              <div>
                <h2 className="text-base font-bold text-[#172B28] dark:text-[#F0FDF8]">
                  2. Importar y Validar Actualización Masiva ({selectedKind})
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Suba un archivo CSV, XLSX o JSON para previsualizar los cambios antes de aplicarlos en SQLite.
                </p>
              </div>

              {currentKindInfo && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200/80 dark:border-[#263834] text-[11px] space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    Columnas esperadas para «{selectedKind}»:
                  </span>
                  <p className="font-mono text-slate-600 dark:text-slate-400 break-words">
                    {currentKindInfo.columns.join(', ')}
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="tabular-file-input"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Archivo de datos (.csv, .xlsx, .json)
                </label>
                <input
                  id="tabular-file-input"
                  type="file"
                  accept=".csv,.xlsx,.json"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#E6F4F1] dark:file:bg-[#132B25] file:text-[#004034] dark:file:text-[#5EEAD4] hover:file:bg-[#d0ebe5]"
                />
              </div>

              <button
                type="button"
                disabled={isPreviewing || (!fileText && !fileContentBase64)}
                onClick={handlePreviewImport}
                className="w-full py-2.5 px-4 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#004034] transition-colors shadow-xs disabled:opacity-50"
              >
                {isPreviewing ? 'Verificando registros...' : 'Previsualizar Cambios (Sin sobrescribir aún)'}
              </button>

              {previewResult && (
                <div className="pt-4 border-t border-slate-200 dark:border-[#263834] space-y-4">
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834]">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Filas leídas</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">{previewResult.total}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block">Operaciones</span>
                      <span className="text-base font-extrabold text-emerald-800 dark:text-emerald-300">
                        {previewResult.changes.length}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                      <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300 block">Errores</span>
                      <span className="text-base font-extrabold text-rose-800 dark:text-rose-300">
                        {previewResult.errors.length}
                      </span>
                    </div>
                  </div>

                  {previewResult.errors.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 max-h-40 overflow-y-auto space-y-1 text-[11px] text-rose-800 dark:text-rose-200">
                      {previewResult.errors.map((err, i) => (
                        <div key={i}>
                          <strong>Línea {err.line}:</strong> {err.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {previewResult.canApply && (
                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={handleApplyImport}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isApplying
                        ? 'Aplicando cambios con respaldo automático...'
                        : `Confirmar y Aplicar ${previewResult.changes.length} Cambio(s) en Base de Datos`}
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActualizarExportarDatos;
