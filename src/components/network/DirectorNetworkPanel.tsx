import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import {
  PublicUser,
  NetworkStatusResponse,
  NetworkAccountStatus,
  UsbScanResponse,
  BatchImportResponse,
  CreateKitResponse,
} from '../../api/types';
import {
  UsbIcon,
  DownloadIcon,
  UploadIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshIcon,
  AccountsIcon,
  LaptopIcon,
  LockIcon,
  KeyIcon,
} from '../ui/Icons';

interface DirectorNetworkPanelProps {
  currentUser: PublicUser;
}

export const DirectorNetworkPanel: React.FC<DirectorNetworkPanelProps> = ({ currentUser }) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  // USB Scan & Import
  const [usbPath, setUsbPath] = useState<string>('D:\\');
  const [passphrase, setPassphrase] = useState<string>('ClaveInstitucional2026!');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<UsbScanResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<BatchImportResponse | null>(null);

  // Modal Emisión de Kit
  const [selectedUserForKit, setSelectedUserForKit] = useState<NetworkAccountStatus | null>(null);
  const [kitExpiryDays, setKitExpiryDays] = useState<number>(7);
  const [kitTargetPath, setKitTargetPath] = useState<string>('D:\\');
  const [isCreatingKit, setIsCreatingKit] = useState<boolean>(false);
  const [kitResult, setKitResult] = useState<CreateKitResponse | null>(null);
  const [kitError, setKitError] = useState<string | null>(null);

  // Modal Revocación
  const [revokingAccount, setRevokingAccount] = useState<NetworkAccountStatus | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>('Extravío o sustitución de equipo de trabajo');
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  const loadNetworkStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const res = await apiClient.getNetworkStatus();
      setNetworkStatus(res);
    } catch (err: any) {
      setStatusError(err.message || 'Error al obtener estado de la red institucional.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadNetworkStatus();
  }, [loadNetworkStatus]);

  const handleScan = async () => {
    setIsScanning(true);
    setScanError(null);
    setScanResult(null);
    try {
      const res = await apiClient.scanNetworkUsb({
        usbDrivePath: usbPath.trim() || undefined,
        passphrase: passphrase.trim() || undefined,
      });
      setScanResult(res);
    } catch (err: any) {
      setScanError(err.message || 'Error al escanear memoria USB institucional.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleImportBatch = async () => {
    setIsImporting(true);
    try {
      const res = await apiClient.importNetworkBatch({
        usbDrivePath: usbPath.trim() || undefined,
        passphrase: passphrase.trim() || undefined,
      });
      setImportResult(res);
      // Recargar censo de red y re-escanear USB
      loadNetworkStatus();
      handleScan();
    } catch (err: any) {
      setScanError(err.message || 'Error al importar lote en el Maestro.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateKit = async () => {
    if (!selectedUserForKit) return;
    setIsCreatingKit(true);
    setKitError(null);
    setKitResult(null);
    try {
      const res = await apiClient.createNetworkKit({
        userId: selectedUserForKit.id,
        expiryDays: kitExpiryDays,
        targetPath: kitTargetPath.trim() || undefined,
      });
      setKitResult(res);
      loadNetworkStatus();
    } catch (err: any) {
      setKitError(err.message || 'Error al generar kit de instalación.');
    } finally {
      setIsCreatingKit(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokingAccount || !revokingAccount.deviceId) return;
    setIsRevoking(true);
    try {
      await apiClient.revokeNetworkDevice({
        deviceId: revokingAccount.deviceId,
        reason: revokeReason.trim() || 'Revocación por Dirección',
      });
      setRevokingAccount(null);
      loadNetworkStatus();
    } catch (err: any) {
      alert(`Error al revocar equipo: ${err.message}`);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Banner Principal de la Autoridad */}
      <div className="bg-[#131F1C] border border-[#233530] rounded-xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">Equipo Maestro Institucional (Hub Central)</span>
          </div>
          <h2 className="text-xl font-bold text-emerald-100">Centro de Control de Red Offline — Dirección</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Topología en estrella desconectada | Custodia de Autoridad Criptográfica Ed25519 & X25519
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={loadNetworkStatus}
            disabled={loadingStatus}
            className="bg-[#182824] hover:bg-[#203530] text-emerald-300 border border-[#2A433D] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
            Actualizar Censo
          </button>
        </div>
      </div>

      {/* 2. Tarjetas de Métricas de Red */}
      {networkStatus && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#101A17] border border-[#1C2B27] rounded-xl p-4">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Cuentas Oficiales</span>
            <span className="text-2xl font-bold text-white font-mono">{networkStatus.metrics.totalAccounts}</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Padrón Institucional 2026</span>
          </div>
          <div className="bg-[#101A17] border border-[#1C2B27] rounded-xl p-4">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Equipos Vinculados</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono">{networkStatus.metrics.linkedAccounts}</span>
            <span className="text-[10px] text-emerald-300/80 block mt-0.5">Con certificado activo</span>
          </div>
          <div className="bg-[#101A17] border border-[#1C2B27] rounded-xl p-4">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Kits Pendientes</span>
            <span className="text-2xl font-bold text-amber-400 font-mono">{networkStatus.metrics.pendingKits}</span>
            <span className="text-[10px] text-amber-300/80 block mt-0.5">Por enlazar o renovar</span>
          </div>
          <div className="bg-[#101A17] border border-[#1C2B27] rounded-xl p-4">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Equipos Revocados</span>
            <span className="text-2xl font-bold text-red-400 font-mono">{networkStatus.revokedDevices?.length || 0}</span>
            <span className="text-[10px] text-red-300/80 block mt-0.5">Por extravío o seguridad</span>
          </div>
        </div>
      )}

      {/* 3. Escaneo e Importación Masiva USB (Bandeja para-direccion/) */}
      <div className="bg-[#101A17] border border-[#1C2B27] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UsbIcon className="w-5 h-5 text-emerald-400" />
              Recepción Masiva USB — Bandeja Dirección
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Escanea la memoria USB para importar todos los lotes enviados por Secretaría y Docentes con respaldo SQLite automático.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            value={usbPath}
            onChange={(e) => setUsbPath(e.target.value)}
            placeholder="Letra de unidad USB (Ej. D:\ o E:\)"
            className="flex-1 bg-[#162320] border border-[#253934] rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/30"
          >
            <RefreshIcon className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Escaneando USB...' : 'Escanear Memoria USB'}
          </button>
        </div>

        {scanError && (
          <div className="p-3 mb-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start gap-2">
            <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{scanError}</span>
          </div>
        )}

        {importResult && (
          <div className="p-4 mb-4 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm mb-1">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              ¡Lote masivo consolidado en la Base de Datos Institucional!
            </div>
            <p className="text-gray-300 mt-1">
              Archivos importados: <strong className="text-white">{importResult.importedFilesCount} de {importResult.totalFiles}</strong> | Fallos: {importResult.failedFilesCount}
            </p>
            <p className="text-gray-400 text-[11px] font-mono mt-1">
              Respaldo preventivo verificado: {importResult.backupCreated} (PRAGMA quick_check = ok)
            </p>
          </div>
        )}

        {scanResult && (
          <div className="mt-4 border-t border-[#1C2B27] pt-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3">
              <div className="text-xs text-gray-300">
                Archivos en USB: <strong className="text-white">{scanResult.scannedFilesCount}</strong> | Listos para consolidar:{' '}
                <strong className={scanResult.pendingToImportCount > 0 ? 'text-emerald-400' : 'text-gray-400'}>
                  {scanResult.pendingToImportCount}
                </strong>
              </div>
              {scanResult.pendingToImportCount > 0 && (
                <button
                  onClick={handleImportBatch}
                  disabled={isImporting}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg transition-colors"
                >
                  <DownloadIcon className="w-4 h-4" />
                  {isImporting ? 'Aplicando e Importando...' : '📥 Consolidar Lote Completo en BD (con Respaldo) →'}
                </button>
              )}
            </div>

            {scanResult.packages.length > 0 ? (
              <div className="space-y-2 overflow-x-auto">
                <table className="w-full text-left text-xs border border-[#1C2B27] rounded-lg overflow-hidden">
                  <thead className="bg-[#142320] text-gray-300 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-2.5">Archivo</th>
                      <th className="p-2.5">Remitente</th>
                      <th className="p-2.5">Rol</th>
                      <th className="p-2.5">Fecha</th>
                      <th className="p-2.5">Operaciones</th>
                      <th className="p-2.5 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2B27]">
                    {scanResult.packages.map((pkg, idx) => (
                      <tr key={idx} className="hover:bg-[#142320]/50">
                        <td className="p-2.5 font-mono text-gray-200">{pkg.fileName}</td>
                        <td className="p-2.5 font-semibold text-white">{pkg.senderName}</td>
                        <td className="p-2.5">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1A2E29] text-emerald-300 font-mono">
                            {pkg.senderRole}
                          </span>
                        </td>
                        <td className="p-2.5 text-gray-400 font-mono text-[11px]">
                          {pkg.packageCreatedAt ? pkg.packageCreatedAt.slice(0, 16).replace('T', ' ') : '—'}
                        </td>
                        <td className="p-2.5 font-mono text-white">{pkg.operationsCount}</td>
                        <td className="p-2.5 text-right">
                          {pkg.alreadyImported ? (
                            <span className="text-[10px] text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded">
                              Ya consolidado
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded font-semibold">
                              Listo para importar
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No se encontraron archivos .cetpro en la bandeja del USB.</p>
            )}
          </div>
        )}
      </div>

      {/* 4. Censo Oficial de las 13 Cuentas Institucionales 2026 */}
      <div className="bg-[#101A17] border border-[#1C2B27] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AccountsIcon className="w-5 h-5 text-emerald-400" />
              Censo Oficial de Equipos y Credenciales (13 Cuentas 2026)
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Estado de vinculación, llaves de dispositivo y control de vigencia institucional.
            </p>
          </div>
        </div>

        {loadingStatus ? (
          <p className="text-xs text-gray-400 animate-pulse">Cargando censo institucional...</p>
        ) : statusError ? (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
            {statusError}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-[#1C2B27] rounded-lg overflow-hidden">
              <thead className="bg-[#142320] text-gray-300 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Usuario</th>
                  <th className="p-3">Nombre Completo</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3">Aulas</th>
                  <th className="p-3">Vigencia Credencial</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2B27]">
                {networkStatus?.accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-[#142320]/40 transition-colors">
                    <td className="p-3">
                      <span
                        className={`inline-block w-3 h-3 rounded-full ${
                          acc.statusTrafficLight === 'GREEN'
                            ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                            : acc.statusTrafficLight === 'YELLOW'
                            ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                            : 'bg-gray-500'
                        }`}
                        title={
                          acc.statusTrafficLight === 'GREEN'
                            ? 'Equipo vinculado y credencial vigente'
                            : acc.statusTrafficLight === 'YELLOW'
                            ? 'Credencial próxima a vencer'
                            : 'Sin equipo vinculado'
                        }
                      ></span>
                    </td>
                    <td className="p-3 font-mono font-semibold text-emerald-300">{acc.username}</td>
                    <td className="p-3 text-white font-medium">{acc.name}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          acc.role === 'DIRECTOR'
                            ? 'bg-purple-950/70 text-purple-300 border border-purple-800/50'
                            : acc.role === 'SECRETARIA'
                            ? 'bg-blue-950/70 text-blue-300 border border-blue-800/50'
                            : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50'
                        }`}
                      >
                        {acc.role}
                      </span>
                    </td>
                    <td className="p-3 text-gray-300 font-mono">{acc.assignmentsCount}</td>
                    <td className="p-3 text-gray-400 font-mono text-[11px]">
                      {acc.validUntil ? acc.validUntil.slice(0, 10) : <span className="text-gray-500">Sin vincular</span>}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {acc.role !== 'DIRECTOR' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedUserForKit(acc);
                              setKitResult(null);
                              setKitError(null);
                            }}
                            className="bg-[#182824] hover:bg-[#203530] text-emerald-300 border border-[#2A433D] px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
                          >
                            Emitir Kit
                          </button>
                          {acc.isLinked && (
                            <button
                              onClick={() => {
                                setRevokingAccount(acc);
                              }}
                              className="bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 px-2 py-1 rounded text-[11px] font-semibold transition-colors"
                            >
                              Revocar
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Emisión de Kit de Instalación */}
      {selectedUserForKit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101A17] border border-[#233530] rounded-xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LaptopIcon className="w-5 h-5 text-emerald-400" />
                Emitir Kit de Instalación Offline
              </h3>
              <button
                onClick={() => setSelectedUserForKit(null)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Genera la carpeta institucional que contiene el instalador oficial, el archivo criptográfico de invitación y la guía de configuración en 3 minutos.
            </p>

            <div className="bg-[#142320] border border-[#1C2B27] rounded-lg p-3 text-xs space-y-1">
              <div>
                <span className="text-gray-400">Destinatario: </span>
                <strong className="text-white">{selectedUserForKit.name}</strong> ({selectedUserForKit.role})
              </div>
              <div>
                <span className="text-gray-400">Usuario oficial: </span>
                <strong className="text-emerald-300 font-mono">{selectedUserForKit.username}</strong>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Días de Vigencia de la Autorización:</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={kitExpiryDays}
                  onChange={(e) => setKitExpiryDays(Number(e.target.value))}
                  className="w-full bg-[#162320] border border-[#253934] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Ruta Destino (Directorio o USB):</label>
                <input
                  type="text"
                  value={kitTargetPath}
                  onChange={(e) => setKitTargetPath(e.target.value)}
                  placeholder="Ej. D:\ o C:\Kits"
                  className="w-full bg-[#162320] border border-[#253934] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {kitError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
                {kitError}
              </div>
            )}

            {kitResult && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs space-y-1">
                <p className="font-bold text-emerald-300">¡Kit generado exitosamente!</p>
                <p className="font-mono text-[11px] text-gray-300 truncate">{kitResult.kitDirectory}</p>
                <p className="text-[11px] text-gray-400">
                  Instalador copiado: {kitResult.installerCopied ? 'Sí (166.5 MB oficial)' : 'No (copie el instalador manualmente)'}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedUserForKit(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cerrar
              </button>
              <button
                onClick={handleCreateKit}
                disabled={isCreatingKit}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-xs shadow-md transition-colors"
              >
                {isCreatingKit ? 'Generando Kit...' : 'Generar Kit de Enlace →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Revocar Dispositivo */}
      {revokingAccount && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101A17] border border-red-900/60 rounded-xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5 text-red-400" />
              Revocar Acceso de Equipo
            </h3>
            <p className="text-xs text-gray-300">
              ¿Está seguro de revocar el equipo de <strong className="text-white">{revokingAccount.name}</strong>? Los paquetes generados por este equipo no serán aceptados por el Equipo Maestro.
            </p>
            <div className="text-xs">
              <label className="block text-gray-400 font-semibold mb-1">Motivo de Revocación:</label>
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full bg-[#162320] border border-[#253934] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRevokingAccount(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleRevoke}
                disabled={isRevoking}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-xs shadow-md transition-colors"
              >
                {isRevoking ? 'Revocando...' : 'Confirmar Revocación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorNetworkPanel;

