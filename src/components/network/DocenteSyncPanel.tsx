import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { PublicUser, BatchExportResponse, UsbScanResponse, BatchImportResponse } from '../../api/types';
import { UsbIcon, DownloadIcon, UploadIcon, CheckCircleIcon, AlertCircleIcon, RefreshIcon } from '../ui/Icons';

interface DocenteSyncPanelProps {
  currentUser: PublicUser;
}

export const DocenteSyncPanel: React.FC<DocenteSyncPanelProps> = ({ currentUser }) => {
  const [usbPath, setUsbPath] = useState<string>('D:\\');
  const [passphrase, setPassphrase] = useState<string>('ClaveInstitucional2026!');
  const [syncModule, setSyncModule] = useState<'all' | 'grades' | 'attendance'>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<BatchExportResponse | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Estado WhatsApp
  const [isExportingWa, setIsExportingWa] = useState<boolean>(false);
  const [waToken, setWaToken] = useState<string | null>(null);
  const [waCopied, setWaCopied] = useState<boolean>(false);
  const [waError, setWaError] = useState<string | null>(null);

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
        passphrase: passphrase.trim() || undefined,
        syncModule
      });
      setExportResult(res);
    } catch (err: any) {
      setExportError(err.message || 'Error al exportar lote al USB.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWhatsApp = async () => {
    setIsExportingWa(true);
    setWaError(null);
    setWaToken(null);
    try {
      const res = await apiClient.exportWhatsAppSync({
        syncModule,
        asToken: true
      });
      if (res.tokenText) {
        setWaToken(res.tokenText);
      } else {
        setWaError(res.instructions || 'No se pudo generar el código de texto.');
      }
    } catch (err: any) {
      setWaError(err.message || 'Error al generar código para WhatsApp.');
    } finally {
      setIsExportingWa(false);
    }
  };

  const handleCopyWaToken = () => {
    if (waToken && navigator.clipboard) {
      navigator.clipboard.writeText(waToken);
      setWaCopied(true);
      setTimeout(() => setWaCopied(false), 2500);
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
      // Volver a escanear tras importar
      handleScan();
    } catch (err: any) {
      setScanError(err.message || 'Error al importar actualizaciones de Dirección.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Estado de Enlace */}
      <div className="bg-[#131F1C] border border-[#233530] rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">Equipo Docente Vinculado</span>
          </div>
          <h2 className="text-lg font-bold text-emerald-100">{currentUser.name}</h2>
          <p className="text-xs text-gray-400">
            Usuario oficial: <span className="font-mono text-emerald-300 font-semibold">{currentUser.username}</span> | Asignaciones: {currentUser.assignments?.length || 0} aula(s)
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs bg-[#1C2C28] text-emerald-300 border border-[#2E453F] px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
            <UsbIcon className="w-4 h-4 text-emerald-400" />
            Red Offline Directa
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
            placeholder="Ejemplo: D:\ o E:\ o C:\CETPRO_INTERCAMBIO"
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
        <p className="text-xs text-gray-400 mt-2">
          El sistema creará y gestionará automáticamente la carpeta institucional <code className="text-emerald-300">CEPRO_INTERCAMBIO/</code> en la raíz del dispositivo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta 1: Exportar hacia Dirección */}
        <div className="bg-[#101A17] border border-[#1C2B27] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center mb-4">
              <DownloadIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Exportar Calificaciones y Asistencias</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              Empaqueta de forma atómica y cifrada sus notas y asistencias registradas en sus aulas asignadas para enviarlas a Dirección.
            </p>

            {/* Selector Modular de Sincronización */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                ¿Qué datos desea sincronizar?
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSyncModule('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                    syncModule === 'all'
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                      : 'bg-[#162320] border-[#253934] text-gray-400 hover:text-white'
                  }`}
                >
                  📦 Todo
                </button>
                <button
                  type="button"
                  onClick={() => setSyncModule('grades')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                    syncModule === 'grades'
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                      : 'bg-[#162320] border-[#253934] text-gray-400 hover:text-white'
                  }`}
                >
                  📝 Solo Notas
                </button>
                <button
                  type="button"
                  onClick={() => setSyncModule('attendance')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                    syncModule === 'attendance'
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                      : 'bg-[#162320] border-[#253934] text-gray-400 hover:text-white'
                  }`}
                >
                  📅 Asistencias
                </button>
              </div>
            </div>

            {/* Opciones de Canal: USB o WhatsApp */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                <DownloadIcon className="w-4 h-4" />
                {isExporting ? 'Exportando...' : 'Exportar al USB'}
              </button>

              <button
                type="button"
                onClick={handleExportWhatsApp}
                disabled={isExportingWa}
                className="flex-1 bg-[#1F4E3D] hover:bg-[#28634E] disabled:opacity-50 text-emerald-200 border border-emerald-700/50 font-semibold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                <span>💬 WhatsApp</span>
                {isExportingWa ? '...' : ''}
              </button>
            </div>

            {waError && (
              <div className="p-3 mb-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
                {waError}
              </div>
            )}

            {waToken && (
              <div className="p-3.5 mb-3 rounded-lg bg-[#162822] border border-emerald-700/60 text-emerald-100 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-emerald-300">Código para WhatsApp generado:</span>
                  <button
                    type="button"
                    onClick={handleCopyWaToken}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white px-2 py-0.5 rounded text-[11px] font-semibold"
                  >
                    {waCopied ? '¡Copiado!' : '📋 Copiar Código'}
                  </button>
                </div>
                <pre className="p-2 bg-[#0C1613] rounded font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-24 whitespace-pre-wrap select-all">
                  {waToken}
                </pre>
                <p className="text-[10px] text-gray-400 mt-1">
                  Copie este bloque y péguelo directamente en el chat de WhatsApp del Director o Secretaría.
                </p>
              </div>
            )}

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
                  <p className="font-semibold text-emerald-300">¡Lote exportado con éxito!</p>
                  <p className="text-[11px] text-gray-300 mt-1">
                    Se generó {exportResult.totalPackages ?? (exportResult as any).packagesCount ?? exportResult.packages?.length ?? 0} paquete(s) con {exportResult.totalOperations} operaciones registradas.
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
            {isExporting ? 'Generando Paquete Cifrado...' : 'Exportar mi Trabajo al USB →'}
          </button>
        </div>

        {/* Tarjeta 2: Recibir de Dirección */}
        <div className="bg-[#101A17] border border-[#1C2B27] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center mb-4">
              <UploadIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Recibir Actualizaciones de Dirección</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Verifica si la Dirección Institucional ha depositado nuevas listas de estudiantes, matrículas o configuraciones curriculares dirigidas a su usuario.
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
                  <span>Listos para importar:</span>
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
                  <p className="font-semibold text-emerald-300">¡Actualizaciones importadas con éxito!</p>
                  <p className="text-[11px] text-gray-300 mt-1">
                    Archivos aplicados: {importResult.importedFilesCount} | Respaldo preventivo: {importResult.backupCreated}
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
            {isImporting ? 'Importando Lote...' : 'Aplicar Actualizaciones desde USB'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocenteSyncPanel;

