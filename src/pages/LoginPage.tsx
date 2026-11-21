/**
 * pages/LoginPage.tsx
 * 
 * Pantalla de Acceso Institucional y Asistente de Configuración Inicial
 * CEPRO_MICAELA 2.0.
 * 
 * Reutiliza la identidad visual premium institucional:
 * - Verde esmeralda (#13594A) y slate (#172B28)
 * - Contraste accesible estricto WCAG 2.2 AA
 * - Soporte para primer arranque (Asistente de Configuración Inicial)
 * - Conexión autenticada con backend loopback local
 * - Accesos rápidos de 1 clic para las 13 cuentas institucionales 2026 (Director, Secretaría y 11 Docentes)
 */

import { InstitutionalLogo } from '../components/ui/InstitutionalLogo';
import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { UsbIcon, CheckCircleIcon, AlertCircleIcon, LaptopIcon } from '../components/ui/Icons';
import { ValidateInvitationResponse } from '../api/types';

export const LoginPage: React.FC = () => {
  const { login, error, clearError, systemStatus, isLoading, refreshStatus } = useAuth();
  
  // Estados para inicio de sesión estándar
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Estados para vinculación por kit de invitación (.cetpro-invitacion)
  const [invitationModalOpen, setInvitationModalOpen] = useState(false);
  const [invitationValidation, setInvitationValidation] = useState<ValidateInvitationResponse | null>(null);
  const [rawInvitation, setRawInvitation] = useState<unknown | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [isLinkingInvitation, setIsLinkingInvitation] = useState(false);
  const [linkSuccessMessage, setLinkSuccessMessage] = useState<string | null>(null);
  const [isDraggingInvitation, setIsDraggingInvitation] = useState(false);
  const invitationPanelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!invitationModalOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const panel = invitationPanelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        panel.focus();
      }
    };

    const rafId = window.requestAnimationFrame(focusFirst);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isLinkingInvitation) {
          e.preventDefault();
          setInvitationModalOpen(false);
        }
        return;
      }

      if (e.key !== 'Tab' || !invitationPanelRef.current) return;
      const focusables = Array.from(
        invitationPanelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !invitationPanelRef.current.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last || !invitationPanelRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [invitationModalOpen, isLinkingInvitation]);

  // Estados para Asistente de Configuración Inicial (Primer Arranque)
  const isConnected = !!systemStatus;
  const isInitialized = systemStatus ? systemStatus.initialized : true;
  const [setupMode, setSetupMode] = useState<boolean>(false);

  React.useEffect(() => {
    if (systemStatus && systemStatus.initialized === false) {
      setSetupMode(true);
    }
  }, [systemStatus]);
  
  const [instName, setInstName] = useState('CETPRO MICAELA BASTIDAS');
  const [directorFullName, setDirectorFullName] = useState('DIRECTOR GENERAL');
  const [directorUser, setDirectorUser] = useState('director');
  const [directorPass, setDirectorPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [importBaseline, setImportBaseline] = useState(true);
  const [setupSubmitting, setSetupSubmitting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState<string | null>(null);

  const handleInvitationFile = async (file: File) => {
    setInvitationError(null);
    setLinkSuccessMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setRawInvitation(parsed);
      const validation = await apiClient.validateNetworkInvitation({ invitation: parsed });
      setInvitationValidation(validation);
      setInvitationModalOpen(true);
    } catch (err: any) {
      setInvitationError(err?.message || 'El archivo seleccionado no es una invitación institucional válida.');
      setInvitationValidation(null);
      setInvitationModalOpen(true);
    }
  };

  const handleConfirmLink = async () => {
    if (!rawInvitation) return;
    setIsLinkingInvitation(true);
    try {
      const res = await apiClient.acceptNetworkInvitation({ invitation: rawInvitation });
      setInvitationModalOpen(false);
      setUsername(res.linkedUser.username);
      setLinkSuccessMessage(`¡Equipo vinculado con éxito a ${res.linkedUser.name}! Ingrese su contraseña institucional para acceder.`);
      await refreshStatus();
    } catch (err: any) {
      setInvitationError(err?.message || 'Error al vincular el equipo con la invitación.');
    } finally {
      setIsLinkingInvitation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setSubmitting(true);
    try {
      await login({
        username: username.trim(),
        password,
      });
    } catch {
      // El error ya es gestionado por AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    setSetupSuccess(null);

    const userClean = directorUser.trim().toLowerCase();
    const nameClean = directorFullName.trim();
    const instClean = instName.trim();

    if (!instClean) {
      setSetupError('Ingrese el nombre de la institución.');
      return;
    }
    if (!nameClean) {
      setSetupError('Ingrese el nombre completo del Director.');
      return;
    }
    if (!/^[a-z0-9._-]{3,60}$/.test(userClean)) {
      setSetupError('El usuario del director debe tener entre 3 y 60 caracteres (letras, números, punto o guión).');
      return;
    }
    if (!directorPass || directorPass.length < 8) {
      setSetupError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (directorPass !== confirmPass) {
      setSetupError('Las contraseñas no coinciden.');
      return;
    }

    setSetupSubmitting(true);
    try {
      await apiClient.setupInstitution({
        institutionName: instClean,
        name: nameClean,
        username: userClean,
        password: directorPass,
        importBaseline,
      });

      setSetupSuccess('¡Configuración inicial completada con éxito! Iniciando sesión...');
      await refreshStatus();

      // Iniciar sesión automáticamente con las nuevas credenciales creadas
      try {
        await login({
          username: userClean,
          password: directorPass,
        });
      } catch {
        // Si no ingresa directo, cambiar a formulario de login precargado
        setUsername(userClean);
        setPassword(directorPass);
        setSetupMode(false);
      }
    } catch (err: any) {
      setSetupError(err?.error || err?.message || 'Error al completar la configuración inicial.');
    } finally {
      setSetupSubmitting(false);
    }
  };

  const activeInSetup = (systemStatus ? !systemStatus.initialized : false) || setupMode;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between items-center px-4 py-8 select-none antialiased">
      {/* Encabezado de estado local */}
      <header className="w-full max-w-lg flex justify-between items-center gap-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? 'bg-brand' : 'bg-amber-500'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isConnected ? 'bg-brand' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="text-[12px] leading-[18px] font-semibold text-muted truncate">
            {isConnected ? 'Servicio Local Conectado (127.0.0.1)' : 'Buscando servicio local…'}
          </span>
        </div>
        <span className="text-[11px] font-bold text-brand bg-brand-soft border border-line px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 tabular-nums">
          v2.0 Offline
        </span>
      </header>

      {/* Tarjeta Principal de Login / Setup */}
      <main className="w-full max-w-lg bg-surface rounded-2xl shadow-[var(--ui-shadow)] border border-line p-6 sm:p-8 my-auto">
        {/* Identidad Institucional */}
        <DashboardPhotoBand as="header" scene="docente" variant="stacked" className="mb-6" contentClassName="flex flex-col items-center text-center">
          <InstitutionalLogo className="mb-3 h-28 w-20" />
          <h1 className="text-[24px] sm:text-[30px] font-bold tracking-tight text-ink leading-[30px] sm:leading-[36px]">
            CEPRO_MICAELA
          </h1>
          <p className="text-[12px] leading-[18px] font-semibold tracking-wider text-muted uppercase mt-1">
            {activeInSetup ? 'Asistente de Primer Arranque' : 'Gestión Académica 2.0'}
          </p>
          {systemStatus?.institutionName && !activeInSetup && (
            <span className="inline-block mt-2.5 max-w-full min-w-0 truncate text-[12px] leading-[18px] font-medium text-ink bg-surface-alt border border-line px-3 py-1 rounded-full">
              {systemStatus.institutionName}
            </span>
          )}
        </DashboardPhotoBand>

        {/* MODO ASISTENTE DE PRIMERA CONFIGURACIÓN (MED-01) */}
        {activeInSetup ? (
          <div>
            <div className="mb-5 p-4 rounded-2xl bg-brand-soft border border-line text-ink text-[12px] leading-[18px]">
              <p className="font-bold text-[14px] leading-[21px] text-brand mb-1">
                Configuración Inicial Institucional
              </p>
              Bienvenido. Establezca los datos institucionales y cree la cuenta principal de
              Dirección para inicializar este equipo de cómputo offline.
            </div>

            {setupError && (
              <div
                className="mb-4 p-3.5 rounded-[10px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-[12px] leading-[18px] flex items-start gap-2.5"
                role="alert"
              >
                <AlertCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-semibold min-w-0">{setupError}</span>
              </div>
            )}

            {setupSuccess && (
              <div
                className="mb-4 p-3.5 rounded-[10px] bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-[12px] leading-[18px] flex items-start gap-2.5"
                role="status"
              >
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-semibold min-w-0">{setupSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSetupSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="setup-inst-name" className="text-[14px] leading-[21px] font-semibold text-ink">
                  Nombre Institucional
                </label>
                <input
                  id="setup-inst-name"
                  type="text"
                  required
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[10px] bg-surface-alt border border-line text-ink text-[14px] font-medium placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
                  placeholder="e.g. CETPRO MICAELA BASTIDAS"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="setup-director-name" className="text-[14px] leading-[21px] font-semibold text-ink">
                  Nombre Completo del Director
                </label>
                <input
                  id="setup-director-name"
                  type="text"
                  required
                  value={directorFullName}
                  onChange={(e) => setDirectorFullName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[10px] bg-surface-alt border border-line text-ink text-[14px] font-medium placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
                  placeholder="e.g. Mg. Juan Pérez Rodríguez"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="setup-director-user" className="text-[14px] leading-[21px] font-semibold text-ink">
                  Usuario del Director
                </label>
                <input
                  id="setup-director-user"
                  type="text"
                  required
                  value={directorUser}
                  onChange={(e) => setDirectorUser(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[10px] bg-surface-alt border border-line text-ink text-[14px] font-medium placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
                  placeholder="e.g. director"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="setup-director-pass" className="text-[14px] leading-[21px] font-semibold text-ink">
                    Contraseña
                  </label>
                  <input
                    id="setup-director-pass"
                    type="password"
                    required
                    value={directorPass}
                    onChange={(e) => setDirectorPass(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[10px] bg-surface-alt border border-line text-ink text-[14px] font-medium placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
                    placeholder="Mín. 8 car."
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="setup-confirm-pass" className="text-[14px] leading-[21px] font-semibold text-ink">
                    Confirmar
                  </label>
                  <input
                    id="setup-confirm-pass"
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[10px] bg-surface-alt border border-line text-ink text-[14px] font-medium placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
                    placeholder="Repita"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 mt-1 min-h-[44px] text-[12px] leading-[18px] text-ink font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={importBaseline}
                  onChange={(e) => setImportBaseline(e.target.checked)}
                  className="rounded text-brand focus:ring-[var(--ui-brand)] h-4 w-4 shrink-0"
                />
                <span>Cargar catálogo curricular oficial (programas y módulos)</span>
              </label>

              <button
                type="submit"
                disabled={setupSubmitting}
                className="w-full min-h-[44px] mt-2 py-2.5 px-6 rounded-[10px] bg-brand hover:opacity-90 text-on-brand font-bold text-[14px] shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {setupSubmitting ? (
                  <span>Inicializando Sistema...</span>
                ) : (
                  <span>Completar e Iniciar Sistema Institucional</span>
                )}
              </button>
            </form>

            {isInitialized && (
              <button
                type="button"
                onClick={() => setSetupMode(false)}
                className="w-full min-h-[44px] mt-2 text-[12px] font-semibold text-brand hover:underline text-center cursor-pointer rounded-[10px]"
              >
                Volver al formulario de inicio de sesión
              </button>
            )}
          </div>
        ) : (
          /* MODO INICIO DE SESIÓN REGULAR */
          <div>
            {/* Mensaje de Éxito de Vinculación Institucional */}
            {linkSuccessMessage && (
              <div
                className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-200 text-[13px] flex items-start gap-3 animate-fade-in"
                role="status"
              >
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block">{linkSuccessMessage}</span>
                </div>
              </div>
            )}

            {/* Mensaje de Error de Autenticación */}
            {error && (
              <div
                className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-200 text-[13px] flex items-start gap-3 animate-fade-in"
                role="alert"
              >
                <AlertCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block">{error}</span>
                </div>
              </div>
            )}

            {/* Formulario de Login */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {/* Campo Usuario */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="username"
                  className="text-[14px] leading-[21px] font-semibold text-ink"
                >
                  Usuario institucional
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  required
                  disabled={isLoading || submitting}
                  value={username}
                  onChange={(e) => {
                    clearError();
                    setUsername(e.target.value);
                  }}
                  placeholder={__IS_INSTITUTIONAL__ ? 'Ingrese su usuario institucional' : 'e.g. eloy.paredes, carmen.vilca o magda.chura'}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] bg-surface-alt border border-line text-ink text-[14px] font-medium placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)] focus:border-transparent transition-all"
                />
              </div>

              {/* Campo Contraseña */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center gap-2">
                  <label
                    htmlFor="password"
                    className="text-[14px] leading-[21px] font-semibold text-ink"
                  >
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="min-h-[44px] px-2 -my-2 inline-flex items-center text-[12px] font-semibold text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-brand)] rounded-[10px] transition-all cursor-pointer"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    disabled={isLoading || submitting}
                    value={password}
                    onChange={(e) => {
                      clearError();
                      setPassword(e.target.value);
                    }}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] bg-surface-alt border border-line text-ink text-[14px] font-medium placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Botón de Entrada */}
              <button
                type="submit"
                disabled={isLoading || submitting || !username.trim() || !password}
                className="w-full min-h-[44px] mt-2 py-2.5 px-6 rounded-[10px] bg-brand hover:opacity-90 text-on-brand font-bold text-[14px] tracking-wide shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-on-brand"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Verificando credenciales…</span>
                  </>
                ) : (
                  <span>Ingresar al Sistema</span>
                )}
              </button>
            </form>

            {/* Sección de Vinculación Institucional de Red Offline (Drag-and-drop + selector) */}
            <div
              className={`mt-5 pt-4 border-t border-line`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingInvitation(true);
              }}
              onDragLeave={() => setIsDraggingInvitation(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingInvitation(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleInvitationFile(f);
              }}
            >
              <label
                htmlFor="invitation-upload"
                className={`w-full min-h-[44px] px-4 py-2.5 rounded-[10px] border border-dashed flex items-center justify-center gap-2 text-[12px] leading-[18px] font-semibold transition-colors cursor-pointer ${
                  isDraggingInvitation
                    ? 'bg-brand-soft border-[var(--ui-brand)] text-brand'
                    : 'bg-surface-alt/60 border-line text-brand hover:bg-brand-soft/60'
                }`}
              >
                <UsbIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>¿Recibió un Kit de Instalación? Vincular este equipo (.cetpro-invitacion)</span>
              </label>
              <input
                id="invitation-upload"
                type="file"
                accept=".cetpro-invitacion,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleInvitationFile(f);
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Modal de Validación y Vinculación por Invitación Institucional */}
      {invitationModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="invitation-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            ref={invitationPanelRef}
            tabIndex={-1}
            className="cepro-dialog-panel bg-surface border border-line rounded-2xl max-w-md w-full p-6 shadow-[var(--ui-shadow)] space-y-4 focus:outline-none"
          >
            <div className="flex justify-between items-center gap-3">
              <h3
                id="invitation-modal-title"
                className="text-[16px] leading-[24px] font-bold text-ink flex items-center gap-2 min-w-0"
              >
                <LaptopIcon className="w-5 h-5 text-brand shrink-0" aria-hidden="true" />
                <span className="truncate">Vinculación Institucional de Equipo</span>
              </h3>
              <button
                type="button"
                onClick={() => setInvitationModalOpen(false)}
                aria-label="Cerrar diálogo de vinculación"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-[10px] text-muted hover:text-ink hover:bg-surface-alt font-bold cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {invitationError ? (
              <div
                role="alert"
                className="p-4 rounded-[10px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 text-[12px] leading-[18px] flex items-start gap-2.5"
              >
                <AlertCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="min-w-0 font-semibold">{invitationError}</span>
              </div>
            ) : invitationValidation ? (
              <div className="space-y-3 text-[12px] leading-[18px]">
                <div className="p-3.5 rounded-2xl bg-brand-soft border border-line text-ink">
                  <p className="font-bold text-[14px] leading-[21px] mb-1 text-brand flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Invitación Institucional Verificada</span>
                  </p>
                  <p className="text-muted">
                    La Dirección del CETPRO ha emitido una autorización criptográfica para este equipo.
                  </p>
                </div>

                <div className="bg-surface-alt border border-line rounded-[10px] p-3 space-y-1.5 font-mono text-[12px]">
                  <div className="min-w-0 truncate">
                    <span className="text-muted">Institución:</span>{' '}
                    <strong className="text-ink">{invitationValidation.institution.name}</strong>
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-muted">Destinatario:</span>{' '}
                    <strong className="text-ink">{invitationValidation.recipient.name}</strong>
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-muted">Usuario oficial:</span>{' '}
                    <strong className="text-brand">{invitationValidation.recipient.username}</strong> ({invitationValidation.recipient.role})
                  </div>
                  <div>
                    <span className="text-muted">Vigencia hasta:</span>{' '}
                    <span className="text-ink tabular-nums">{invitationValidation.expiresAt.slice(0, 10)}</span>
                  </div>
                </div>

                <p className="text-[12px] text-muted leading-[18px]">
                  Al confirmar, este equipo adoptará el certificado institucional y quedará formalmente autorizado para exportar e importar datos académicos hacia la Dirección.
                </p>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvitationModalOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-[10px] text-[14px] font-semibold text-muted hover:text-ink hover:bg-surface-alt cursor-pointer"
              >
                Cerrar
              </button>
              {invitationValidation && !invitationError && (
                <button
                  type="button"
                  onClick={handleConfirmLink}
                  disabled={isLinkingInvitation}
                  className="min-h-[44px] bg-brand hover:opacity-90 disabled:opacity-50 text-on-brand font-bold px-4 py-2 rounded-[10px] text-[14px] shadow-sm transition-all cursor-pointer"
                >
                  {isLinkingInvitation ? 'Vinculando Equipo...' : 'Aceptar y Vincular este Equipo →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pie institucional */}
      <footer className="w-full max-w-lg text-center py-4">
        <p className="text-[12px] leading-[18px] font-medium text-muted">
          Operación 100% fuera de línea · Información institucional protegida en este equipo
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
