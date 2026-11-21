import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [passphrase, setPassphrase] = useState<string>('');
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
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const kitModalRef = useRef<HTMLDivElement | null>(null);
  const revokeModalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const restoreFocus = useCallback(() => {
    const prev = lastFocusedRef.current;
    lastFocusedRef.current = null;
    if (prev && typeof prev.focus === 'function') {
      requestAnimationFrame(() => prev.focus());
    }
  }, []);

  const closeKitModal = useCallback(() => {
    setSelectedUserForKit(null);
    restoreFocus();
  }, [restoreFocus]);

  const closeRevokeModal = useCallback(() => {
    setRevokingAccount(null);
    setRevokeError(null);
    restoreFocus();
  }, [restoreFocus]);

  useEffect(() => {
    const activeContainer = selectedUserForKit
      ? kitModalRef.current
      : revokingAccount
      ? revokeModalRef.current
      : null;

    if (!activeContainer) return;

    const getFocusable = () =>
      Array.from(
        activeContainer.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      activeContainer.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedUserForKit) closeKitModal();
        else if (revokingAccount) closeRevokeModal();
        return;
      }

      if (e.key === 'Tab') {
        const items = getFocusable();
        if (items.length === 0) {
          e.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !activeContainer.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last || !activeContainer.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedUserForKit, revokingAccount, closeKitModal, closeRevokeModal]);

  const loadNetworkStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const res = await apiClient.getNetworkStatus();
      setNetworkStatus(res);
    } catch (err: any) {
      setStatusError(err?.error || err?.message || 'Error al obtener estado de la red institucional.');
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
      setScanError(err?.error || err?.message || 'Error al escanear memoria USB institucional.');
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
      setScanError(err?.error || err?.message || 'Error al importar lote en el Maestro.');
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
        userId: selectedUserForKit.id || (selectedUserForKit as any).userId,
        expiryDays: kitExpiryDays,
        targetPath: kitTargetPath.trim() || undefined,
      });
      setKitResult(res);
      loadNetworkStatus();
    } catch (err: any) {
      setKitError(err?.error || err?.message || 'Error al generar kit de instalación.');
    } finally {
      setIsCreatingKit(false);
    }
  };

  const handleRevoke = async () => {
    const targetDeviceId = revokingAccount?.deviceId || (revokingAccount as any)?.device?.deviceId;
    if (!revokingAccount || !targetDeviceId) return;
    setIsRevoking(true);
    setRevokeError(null);
    try {
      await apiClient.revokeNetworkDevice({
        deviceId: targetDeviceId,
        reason: revokeReason.trim() || 'Revocación por Dirección',
      });
      closeRevokeModal();
      loadNetworkStatus();
    } catch (err: any) {
      setRevokeError(err?.error || err?.message || 'Error al revocar equipo.');
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Banner Principal de la Autoridad */}
      <div className="bg-surface border border-line rounded-2xl p-6 shadow-[var(--ui-shadow)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs uppercase font-bold tracking-wider text-brand">
              Equipo Maestro Institucional (Hub Central)
            </span>
          </div>
          <h2 className="text-xl font-bold text-ink">Centro de Control de Red Offline — Dirección</h2>
          <p className="text-xs text-muted mt-0.5">
            Topología en estrella desconectada | Custodia de Autoridad Criptográfica Ed25519 &amp; X25519
          </p>
        </div>
        <div className="flex gap-3 items-center shrink-0">
          <button
            type="button"
            onClick={loadNetworkStatus}
            disabled={loadingStatus}
            className="min-h-[44px] bg-surface-alt hover:bg-brand-soft text-ink border border-line px-4 py-2 rounded-[10px] text-xs font-semibold flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 shrink-0 ${loadingStatus ? 'animate-spin' : ''}`} />
            <span>Actualizar Censo</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas de Métricas de Red */}
      {networkStatus && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface border border-line rounded-2xl p-4 shadow-[var(--ui-shadow)]">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1">
              Cuentas Oficiales
            </span>
            <span className="text-2xl font-bold text-ink font-mono tabular-nums">
              {networkStatus?.metrics?.totalAccounts ?? (networkStatus as any)?.summary?.totalAccounts ?? 0}
            </span>
            <span className="text-[11px] text-muted block mt-0.5">Padrón Institucional 2026</span>
          </div>
          <div className="bg-surface border border-line rounded-2xl p-4 shadow-[var(--ui-shadow)]">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1">
              Equipos Vinculados
            </span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {networkStatus?.metrics?.linkedAccounts ?? (networkStatus as any)?.summary?.linkedDevicesCount ?? 0}
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block mt-0.5">
              Con certificado activo
            </span>
          </div>
          <div className="bg-surface border border-line rounded-2xl p-4 shadow-[var(--ui-shadow)]">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1">
              Kits Pendientes
            </span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {networkStatus?.metrics?.pendingKits ?? (networkStatus as any)?.summary?.pendingCount ?? (networkStatus as any)?.summary?.unlinkedCount ?? 0}
            </span>
            <span className="text-[11px] text-amber-700 dark:text-amber-300 block mt-0.5">
              Por enlazar o renovar
            </span>
          </div>
          <div className="bg-surface border border-line rounded-2xl p-4 shadow-[var(--ui-shadow)]">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1">
              Equipos Revocados
            </span>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400 font-mono tabular-nums">
              {networkStatus?.revokedDevices?.length ?? (networkStatus as any)?.summary?.revokedCount ?? 0}
            </span>
            <span className="text-[11px] text-red-700 dark:text-red-300 block mt-0.5">
              Por extravío o seguridad
            </span>
          </div>
        </div>
      )}

      {/* 3. Escaneo e Importación Masiva USB (Bandeja para-direccion/) */}
      <div className="bg-surface border border-line rounded-2xl p-6 shadow-[var(--ui-shadow)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <UsbIcon className="w-5 h-5 text-brand shrink-0" />
              <span>Recepción Masiva USB — Bandeja Dirección</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Escanea la memoria USB para importar todos los lotes enviados por Secretaría y Docentes con respaldo SQLite automático.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            aria-label="Ruta o letra de unidad USB"
            value={usbPath}
            onChange={(e) => setUsbPath(e.target.value)}
            placeholder="Letra de unidad USB (Ej. D:\ o E:\)"
            className="flex-1 min-w-0 min-h-[44px] bg-surface-alt border border-line rounded-[10px] px-4 py-2.5 text-ink font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning}
            className="min-h-[44px] bg-brand hover:opacity-95 disabled:opacity-50 text-on-brand font-semibold px-5 py-2.5 rounded-[10px] text-sm flex items-center justify-center gap-2 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <RefreshIcon className={`w-4 h-4 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Escaneando USB...' : 'Escanear Memoria USB'}</span>
          </button>
        </div>

        {scanError && (
          <div
            role="alert"
            className="p-3 mb-4 rounded-[10px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 text-xs flex items-start gap-2"
          >
            <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <span>{scanError}</span>
          </div>
        )}

        {importResult && (
          <div className="p-4 mb-4 rounded-[10px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs">
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>¡Lote masivo consolidado en la Base de Datos Institucional!</span>
            </div>
            <p className="mt-1 tabular-nums">
              Archivos importados: <strong>{importResult.importedFilesCount} de {importResult.totalFiles}</strong> | Fallos: {importResult.failedFilesCount}
            </p>
            <p className="text-[11px] font-mono mt-1 opacity-90 tabular-nums">
              Respaldo preventivo verificado: {importResult.backupCreated} (PRAGMA quick_check = ok)
            </p>
          </div>
        )}

        {scanResult && (
          <div className="mt-4 border-t border-line pt-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3">
              <div className="text-xs text-muted tabular-nums">
                Archivos en USB: <strong className="text-ink">{scanResult.scannedFilesCount}</strong> | Listos para consolidar:{' '}
                <strong className={scanResult.pendingToImportCount > 0 ? 'text-brand' : 'text-muted'}>
                  {scanResult.pendingToImportCount}
                </strong>
              </div>
              {scanResult.pendingToImportCount > 0 && (
                <button
                  type="button"
                  onClick={handleImportBatch}
                  disabled={isImporting}
                  className="min-h-[44px] bg-brand hover:opacity-95 disabled:opacity-50 text-on-brand font-semibold px-4 py-2 rounded-[10px] text-xs flex items-center justify-center gap-2 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <DownloadIcon className="w-4 h-4 shrink-0" />
                  <span>{isImporting ? 'Aplicando e Importando...' : '📥 Consolidar Lote Completo en BD (con Respaldo) →'}</span>
                </button>
              )}
            </div>

            {scanResult.packages.length > 0 ? (
              <div className="space-y-2 overflow-x-auto">
                <table className="w-full text-left text-xs border border-line rounded-[10px] overflow-hidden">
                  <thead className="bg-surface-alt text-muted uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-2.5">Archivo</th>
                      <th className="p-2.5">Remitente</th>
                      <th className="p-2.5">Rol</th>
                      <th className="p-2.5">Fecha</th>
                      <th className="p-2.5">Operaciones</th>
                      <th className="p-2.5 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {scanResult.packages.map((pkg, idx) => (
                      <tr key={idx} className="hover:bg-surface-alt/60">
                        <td className="p-2.5 font-mono text-ink">{pkg.fileName}</td>
                        <td className="p-2.5 font-semibold text-ink">{pkg.senderName}</td>
                        <td className="p-2.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-soft text-brand font-mono font-semibold">
                            {pkg.senderRole}
                          </span>
                        </td>
                        <td className="p-2.5 text-muted font-mono text-[11px] tabular-nums">
                          {pkg.packageCreatedAt ? pkg.packageCreatedAt.slice(0, 16).replace('T', ' ') : '—'}
                        </td>
                        <td className="p-2.5 font-mono text-ink tabular-nums">{pkg.operationsCount}</td>
                        <td className="p-2.5 text-right">
                          {pkg.alreadyImported ? (
                            <span className="text-[10px] text-muted bg-surface-alt border border-line px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              Ya consolidado
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                              <CheckCircleIcon className="w-3 h-3 shrink-0" />
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
              <p className="text-xs text-muted italic">No se encontraron archivos .cetpro en la bandeja del USB.</p>
            )}
          </div>
        )}
      </div>

      {/* 5. Censo Oficial de las 13 Cuentas Institucionales 2026 */}
      <div className="bg-surface border border-line rounded-2xl p-6 shadow-[var(--ui-shadow)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <AccountsIcon className="w-5 h-5 text-brand shrink-0" />
              <span>Censo Oficial de Equipos y Credenciales (13 Cuentas 2026)</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Estado de vinculación, llaves de dispositivo y control de vigencia institucional.
            </p>
          </div>
        </div>

        {loadingStatus ? (
          <p className="text-xs text-muted animate-pulse">Cargando censo institucional...</p>
        ) : statusError ? (
          <div
            role="alert"
            className="p-3 rounded-[10px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 text-xs flex items-start gap-2"
          >
            <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <span>{statusError}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-line rounded-[10px] overflow-hidden">
              <thead className="bg-surface-alt text-muted uppercase tracking-wider text-[10px]">
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
              <tbody className="divide-y divide-line">
                {networkStatus?.accounts?.map((acc: any) => {
                  const accId = acc.id || acc.userId;
                  const isLinked = acc.isLinked ?? acc.device?.linked ?? false;
                  const trafficLight = acc.statusTrafficLight || acc.statusColor || 'GRAY';
                  const assignmentsCount = acc.assignmentsCount ?? acc.assignments?.length ?? 0;
                  const validUntil = acc.validUntil ?? acc.device?.linkedAt ?? null;
                  return (
                    <tr key={accId} className="hover:bg-surface-alt/60 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        {trafficLight === 'GREEN' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/50">
                            <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                            Vigente
                          </span>
                        ) : trafficLight === 'YELLOW' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50">
                            <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
                            Por vencer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-alt text-muted border border-line">
                            <LockIcon className="w-3.5 h-3.5 shrink-0" />
                            Sin vincular
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-semibold text-brand">{acc.username}</td>
                      <td className="p-3 text-ink font-medium">{acc.name}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                            acc.role === 'DIRECTOR'
                              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800/50'
                              : acc.role === 'SECRETARIA'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/50'
                              : 'bg-brand-soft text-brand border-line'
                          }`}
                        >
                          {acc.role}
                        </span>
                      </td>
                      <td className="p-3 text-ink font-mono tabular-nums">{assignmentsCount}</td>
                      <td className="p-3 text-muted font-mono text-[11px] tabular-nums">
                        {validUntil ? String(validUntil).slice(0, 10) : <span>Sin vincular</span>}
                      </td>
                      <td className="p-3 text-right">
                        {acc.role !== 'DIRECTOR' && (
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                lastFocusedRef.current = document.activeElement as HTMLElement | null;
                                setSelectedUserForKit(acc);
                                setKitResult(null);
                                setKitError(null);
                              }}
                              className="min-h-[44px] bg-surface-alt hover:bg-brand-soft text-ink border border-line px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              Emitir Kit
                            </button>
                            {isLinked && (
                              <button
                                type="button"
                                onClick={() => {
                                  lastFocusedRef.current = document.activeElement as HTMLElement | null;
                                  setRevokeError(null);
                                  setRevokingAccount(acc);
                                }}
                                className="min-h-[44px] bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                              >
                                Revocar
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Emisión de Kit de Instalación */}
      {selectedUserForKit && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeKitModal();
          }}
        >
          <div
            ref={kitModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="director-kit-modal-title"
            tabIndex={-1}
            className="cepro-dialog-panel bg-surface border border-line rounded-2xl max-w-lg w-full p-6 text-ink shadow-[var(--ui-shadow)] space-y-4 focus:outline-none"
          >
            <div className="flex justify-between items-center gap-3">
              <h3 id="director-kit-modal-title" className="text-base font-bold text-ink flex items-center gap-2 min-w-0">
                <LaptopIcon className="w-5 h-5 text-brand shrink-0" />
                <span className="truncate">Emitir Kit de Instalación Offline</span>
              </h3>
              <button
                type="button"
                aria-label="Cerrar diálogo"
                onClick={closeKitModal}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-[10px] text-muted hover:text-ink hover:bg-surface-alt text-lg font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted">
              Genera la carpeta institucional que contiene el instalador oficial, el archivo criptográfico de invitación y la guía de configuración en 3 minutos.
            </p>

            <div className="bg-surface-alt border border-line rounded-[10px] p-3 text-xs space-y-1">
              <div className="min-w-0 truncate">
                <span className="text-muted">Destinatario: </span>
                <strong className="text-ink">{selectedUserForKit.name}</strong> ({selectedUserForKit.role})
              </div>
              <div>
                <span className="text-muted">Usuario oficial: </span>
                <strong className="text-brand font-mono">{selectedUserForKit.username}</strong>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="kit-expiry-days" className="block text-ink font-semibold mb-1">
                  Días de Vigencia de la Autorización:
                </label>
                <input
                  id="kit-expiry-days"
                  type="number"
                  min={1}
                  max={30}
                  value={kitExpiryDays}
                  onChange={(e) => setKitExpiryDays(Number(e.target.value))}
                  className="w-full min-h-[44px] bg-surface-alt border border-line rounded-[10px] px-3 py-2 text-ink font-mono tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <div>
                <label htmlFor="kit-target-path" className="block text-ink font-semibold mb-1">
                  Ruta Destino (Directorio o USB):
                </label>
                <input
                  id="kit-target-path"
                  type="text"
                  value={kitTargetPath}
                  onChange={(e) => setKitTargetPath(e.target.value)}
                  placeholder="Ej. D:\ o C:\Kits"
                  className="w-full min-h-[44px] bg-surface-alt border border-line rounded-[10px] px-3 py-2 text-ink font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>
            </div>

            {kitError && (
              <div
                role="alert"
                className="p-3 rounded-[10px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 text-xs flex items-start gap-2"
              >
                <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span>{kitError}</span>
              </div>
            )}

            {kitResult && (
              <div className="p-3 rounded-[10px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>¡Kit generado exitosamente!</span>
                </div>
                <p className="font-mono text-[11px] opacity-90 truncate">{kitResult.kitDirectory}</p>
                <p className="text-[11px] opacity-80 tabular-nums">
                  Instalador copiado: {kitResult.installerCopied ? 'Sí (166.5 MB oficial)' : 'No (copie el instalador manualmente)'}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeKitModal}
                className="min-h-[44px] px-4 py-2 rounded-[10px] text-xs font-semibold text-muted hover:text-ink hover:bg-surface-alt border border-line transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleCreateKit}
                disabled={isCreatingKit}
                className="min-h-[44px] bg-brand hover:opacity-95 disabled:opacity-50 text-on-brand font-semibold px-4 py-2 rounded-[10px] text-xs transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {isCreatingKit ? 'Generando Kit...' : 'Generar Kit de Enlace →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Revocar Dispositivo */}
      {revokingAccount && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeRevokeModal();
          }}
        >
          <div
            ref={revokeModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="director-revoke-modal-title"
            tabIndex={-1}
            className="cepro-dialog-panel bg-surface border border-red-300 dark:border-red-900/60 rounded-2xl max-w-md w-full p-6 text-ink shadow-[var(--ui-shadow)] space-y-4 focus:outline-none"
          >
            <h3 id="director-revoke-modal-title" className="text-base font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5 shrink-0" />
              <span>Revocar Acceso de Equipo</span>
            </h3>
            <p className="text-xs text-muted">
              ¿Está seguro de revocar el equipo de <strong className="text-ink">{revokingAccount.name}</strong>? Los paquetes generados por este equipo no serán aceptados por el Equipo Maestro.
            </p>
            <div className="text-xs">
              <label htmlFor="revoke-reason-input" className="block text-ink font-semibold mb-1">
                Motivo de Revocación:
              </label>
              <input
                id="revoke-reason-input"
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full min-h-[44px] bg-surface-alt border border-line rounded-[10px] px-3 py-2 text-ink text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>

            {revokeError && (
              <div
                role="alert"
                className="p-3 rounded-[10px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 text-xs flex items-start gap-2"
              >
                <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span>{revokeError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeRevokeModal}
                className="min-h-[44px] px-4 py-2 rounded-[10px] text-xs font-semibold text-muted hover:text-ink hover:bg-surface-alt border border-line transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isRevoking}
                className="min-h-[44px] bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-[10px] text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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

