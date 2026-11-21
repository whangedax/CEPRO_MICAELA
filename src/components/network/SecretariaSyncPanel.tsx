import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { PublicUser, BatchExportResponse, UsbScanResponse, BatchImportResponse } from '../../api/types';
import { UsbIcon, DownloadIcon, UploadIcon, CheckCircleIcon, AlertCircleIcon, RefreshIcon, StudentsIcon } from '../ui/Icons';

interface SecretariaSyncPanelProps {
  currentUser: PublicUser;
}

export const SecretariaSyncPanel: React.FC<SecretariaSyncPanelProps> = ({ currentUser }) => {
  const [usbPath, setUsbPath] = useState<string>('D:\\');
  const [passphrase, setPassphrase] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<BatchExportResponse | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<UsbScanResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<BatchImportResponse | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportResult(null);
    try {
      const res = await apiClient.prepareNetworkBatchExport({
        usbDrivePath: usbPath.trim() || undefined,
        passphrase: passphrase.trim() || undefined
      });
      setExportResult(res);
    } catch (err: any) {
      setExportError(err?.error || err?.message || 'Error al exportar lote al USB.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setScanError(null);
    setScanResult(null);
    try {
      const res = await apiClient.scanNetworkUsb({
        usbDrivePath: usbPath.trim() || undefined,
        passphrase: passphrase.trim() || undefined
      });
      setScanResult(res);
    } catch (err: any) {
      setScanError(err?.error || err?.message || 'Error al escanear la memoria USB.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const res = await apiClient.importNetworkBatch({
        usbDrivePath: usbPath.trim() || undefined,
        passphrase: passphrase.trim() || undefined
      });
      setImportResult(res);
      handleScan();
    } catch (err: any) {
      setScanError(err?.error || err?.message || 'Error al importar actualizaciones.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Estado de Secretaría */}
      <div className="bg-surface border border-line rounded-2xl p-6 shadow-[var(--ui-shadow)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs uppercase font-bold tracking-wider text-brand">Estación de Secretaría Académica</span>
          </div>
          <h2 className="text-lg font-bold text-ink truncate">{currentUser.name}</h2>
          <p className="text-xs text-muted mt-0.5">
            Padrón Institucional 2026 | Matrículas, estudiantes y nóminas oficiales
          </p>
        </div>
        <div className="shrink-0">
          <span className="text-xs bg-brand-soft text-brand border border-line px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 font-semibold">
            <UsbIcon className="w-4 h-4 shrink-0" />
            Canal USB con Causalidad Académica
          </span>
        </div>
      </div>

      {/* Configuración de Ruta USB */}
      <div className="bg-surface border border-line rounded-2xl p-6 shadow-[var(--ui-shadow)]">
        <label
          htmlFor="secretaria-usb-path"
          className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2"
        >
          Ruta o Letra de Unidad de la Memoria USB Institucional:
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="secretaria-usb-path"
            type="text"
            value={usbPath}
            onChange={(e) => setUsbPath(e.target.value)}
            placeholder="Ejemplo: D:\ o E:\"
            className="flex-1 min-w-0 min-h-[44px] bg-surface-alt border border-line rounded-[10px] px-4 py-2.5 text-ink font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning}
            className="min-h-[44px] bg-surface-alt hover:bg-brand-soft text-ink border border-line px-4 py-2.5 rounded-[10px] text-sm font-semibold flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Escaneando...' : 'Escanear USB'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exportar Matrículas hacia Dirección */}
        <div className="bg-surface border border-line rounded-2xl p-6 shadow-[var(--ui-shadow)] flex flex-col justify-between">
          <div className="min-w-0">
            <div className="w-10 h-10 rounded-[10px] bg-brand-soft border border-line text-brand flex items-center justify-center mb-4">
              <StudentsIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-ink mb-2">Exportar Estudiantes y Matrículas</h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              Exporta en un paquete institucional firmado todas las altas de participantes, matrículas activas y rectificaciones registradas en Secretaría hacia la bandeja <code className="text-brand font-mono">para-direccion/</code>.
            </p>

            {exportError && (
              <div
                role="alert"
                className="p-3 mb-4 rounded-[10px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 text-xs flex items-start gap-2"
              >
                <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span>{exportError}</span>
              </div>
            )}

            {exportResult && (
              <div className="p-3 mb-4 rounded-[10px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold">¡Lote de Secretaría exportado!</p>
                  <p className="text-[11px] opacity-90 mt-1 tabular-nums">
                    Operaciones: {exportResult.totalOperations} | Archivos: {exportResult.totalPackages ?? (exportResult as any).packagesCount ?? exportResult.packages?.length ?? 0}
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full min-h-[44px] bg-brand hover:opacity-95 disabled:opacity-50 text-on-brand font-semibold py-2.5 px-4 rounded-[10px] flex items-center justify-center gap-2 transition-opacity text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <DownloadIcon className="w-4 h-4 shrink-0" />
            <span>{isExporting ? 'Exportando Lote de Secretaría...' : 'Exportar Matrículas al USB →'}</span>
          </button>
        </div>

        {/* Recibir Actualizaciones de Dirección */}
        <div className="bg-surface border border-line rounded-2xl p-6 shadow-[var(--ui-shadow)] flex flex-col justify-between">
          <div className="min-w-0">
            <div className="w-10 h-10 rounded-[10px] bg-brand-soft border border-line text-brand flex items-center justify-center mb-4">
              <UploadIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-ink mb-2">Recibir Aprobaciones de Dirección</h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              Recibe del USB las resoluciones rectorales, apertura de aulas o actualizaciones curriculares depositadas por la Dirección en <code className="text-brand font-mono">para-secretaria/</code>.
            </p>

            {scanError && (
              <div
                role="alert"
                className="p-3 mb-4 rounded-[10px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 text-xs flex items-start gap-2"
              >
                <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}

            {scanResult && (
              <div className="p-3 mb-4 rounded-[10px] bg-surface-alt border border-line text-xs space-y-1">
                <div className="flex justify-between items-center text-muted">
                  <span>Archivos detectados en USB:</span>
                  <span className="font-bold text-ink tabular-nums">{scanResult.scannedFilesCount}</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>Listos para aplicar:</span>
                  <span className={`font-bold tabular-nums ${scanResult.pendingToImportCount > 0 ? 'text-brand' : 'text-muted'}`}>
                    {scanResult.pendingToImportCount}
                  </span>
                </div>
              </div>
            )}

            {importResult && (
              <div className="p-3 mb-4 rounded-[10px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold">¡Lote aplicado en base de datos!</p>
                  <p className="text-[11px] opacity-90 mt-1 tabular-nums">
                    Archivos importados: {importResult.importedFilesCount} (Respaldo: {importResult.backupCreated})
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || !scanResult || scanResult.pendingToImportCount === 0}
            className="w-full min-h-[44px] bg-surface-alt hover:bg-brand-soft disabled:opacity-40 text-ink border border-line font-semibold py-2.5 px-4 rounded-[10px] flex items-center justify-center gap-2 transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <UploadIcon className="w-4 h-4 shrink-0" />
            <span>{isImporting ? 'Aplicando...' : 'Aplicar Actualizaciones desde USB'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecretariaSyncPanel;

