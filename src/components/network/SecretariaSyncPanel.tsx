import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { PublicUser, BatchExportResponse, UsbScanResponse, BatchImportResponse } from '../../api/types';
import { UsbIcon, DownloadIcon, UploadIcon, CheckCircleIcon, AlertCircleIcon, RefreshIcon, StudentsIcon } from '../ui/Icons';

interface SecretariaSyncPanelProps {
  currentUser: PublicUser;
}

export const SecretariaSyncPanel: React.FC<SecretariaSyncPanelProps> = ({ currentUser }) => {
  const [usbPath, setUsbPath] = useState<string>('D:\\');
  const [passphrase, setPassphrase] = useState<string>('ClaveInstitucional2026!');
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
      setExportError(err.message || 'Error al exportar lote al USB.');
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
      setScanError(err.message || 'Error al escanear la memoria USB.');
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
      setScanError(err.message || 'Error al importar actualizaciones.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Estado de Secretaría */}
      <div className="bg-[#131F1C] border border-[#233530] rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">Estación de Secretaría Académica</span>
          </div>
          <h2 className="text-lg font-bold text-emerald-100">{currentUser.name}</h2>
          <p className="text-xs text-gray-400">
            Padrón Institucional 2026 | Matrículas, estudiantes y nóminas oficiales
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs bg-[#1C2C28] text-emerald-300 border border-[#2E453F] px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
            <UsbIcon className="w-4 h-4 text-emerald-400" />
            Canal USB con Causalidad Académica
          </span>
        </div>
      </div>

      {/* Configuración de Ruta USB */}
      <div className="bg-[#101A17] border border-[#1C2B27] rounded-xl p-5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Ruta o Letra de Unidad de la Memoria USB Institucional:
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={usbPath}
            onChange={(e) => setUsbPath(e.target.value)}
            placeholder="Ejemplo: D:\ o E:\"
            className="flex-1 bg-[#162320] border border-[#253934] rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="bg-[#182824] hover:bg-[#203530] text-emerald-300 border border-[#2A433D] px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshIcon className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Escaneando...' : 'Escanear USB'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exportar Matrículas hacia Dirección */}
        <div className="bg-[#101A17] border border-[#1C2B27] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center mb-4">
              <StudentsIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Exportar Estudiantes y Matrículas</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Exporta en un paquete institucional firmado todas las altas de participantes, matrículas activas y rectificaciones registradas en Secretaría hacia la bandeja <code className="text-emerald-300">para-direccion/</code>.
            </p>

            {exportError && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start gap-2">
                <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{exportError}</span>
              </div>
            )}

            {exportResult && (
              <div className="p-3 mb-4 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs flex items-start gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-300">¡Lote de Secretaría exportado!</p>
                  <p className="text-[11px] text-gray-300 mt-1">
                    Operaciones: {exportResult.totalOperations} | Archivos: {exportResult.packagesCount}
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30 transition-all text-sm"
          >
            <DownloadIcon className="w-4 h-4" />
            {isExporting ? 'Exportando Lote de Secretaría...' : 'Exportar Matrículas al USB →'}
          </button>
        </div>

        {/* Recibir Actualizaciones de Dirección */}
        <div className="bg-[#101A17] border border-[#1C2B27] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-400 flex items-center justify-center mb-4">
              <UploadIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Recibir Aprobaciones de Dirección</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Recibe del USB las resoluciones rectorales, apertura de aulas o actualizaciones curriculares depositadas por la Dirección en <code className="text-purple-300">para-secretaria/</code>.
            </p>

            {scanError && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start gap-2">
                <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}

            {scanResult && (
              <div className="p-3 mb-4 rounded-lg bg-[#142320] border border-[#203934] text-xs">
                <div className="flex justify-between items-center text-gray-300 mb-1">
                  <span>Archivos detectados en USB:</span>
                  <span className="font-bold text-white">{scanResult.scannedFilesCount}</span>
                </div>
                <div className="flex justify-between items-center text-gray-300">
                  <span>Listos para aplicar:</span>
                  <span className={`font-bold ${scanResult.pendingToImportCount > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {scanResult.pendingToImportCount}
                  </span>
                </div>
              </div>
            )}

            {importResult && (
              <div className="p-3 mb-4 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs flex items-start gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-300">¡Lote aplicado en base de datos!</p>
                  <p className="text-[11px] text-gray-300 mt-1">
                    Archivos importados: {importResult.importedFilesCount} (Respaldo: {importResult.backupCreated})
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleImport}
            disabled={isImporting || !scanResult || scanResult.pendingToImportCount === 0}
            className="w-full bg-[#182A26] hover:bg-[#203833] disabled:opacity-40 text-emerald-300 border border-[#2D4A43] font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all text-sm"
          >
            <UploadIcon className="w-4 h-4" />
            {isImporting ? 'Aplicando...' : 'Aplicar Actualizaciones desde USB'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecretariaSyncPanel;

