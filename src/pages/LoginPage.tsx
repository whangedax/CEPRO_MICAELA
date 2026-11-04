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

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { InstitutionalBrandIcon, UsbIcon, CheckCircleIcon, AlertCircleIcon, LaptopIcon } from '../components/ui/Icons';
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

  // Estados para Asistente de Configuración Inicial (Primer Arranque)
  const isConnected = !!systemStatus;
  const isInitialized = systemStatus?.initialized ?? false;
  const [setupMode, setSetupMode] = useState<boolean>(!isInitialized);
  
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

  const activeInSetup = !isInitialized || setupMode;

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#0F1715] text-[#172B28] dark:text-[#F0FDF8] flex flex-col justify-between items-center px-4 py-8 select-none antialiased">
      {/* Encabezado de estado local */}
      <header className="w-full max-w-md flex justify-between items-center py-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? 'bg-[#13594A] dark:bg-[#5EEAD4]' : 'bg-amber-500'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isConnected ? 'bg-[#13594A] dark:bg-[#5EEAD4]' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
            {isConnected ? 'Servicio Local Conectado (127.0.0.1)' : 'Buscando servicio local…'}
          </span>
        </div>
        <span className="text-[10px] font-bold text-[#004034] dark:text-[#5EEAD4] bg-[#c0ecde] dark:bg-[#132B25] px-2 py-0.5 rounded-md uppercase tracking-wider">
          v2.0 Offline
        </span>
      </header>

      {/* Tarjeta Principal de Login / Setup */}
      <main className="w-full max-w-md bg-white dark:bg-[#182220] rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-200/80 dark:border-[#263834] p-7 sm:p-9 my-auto">
        {/* Identidad Institucional */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#13594A]/10 dark:bg-[#132B25] border border-[#13594A]/15 dark:border-[#205C4E] flex items-center justify-center text-[#13594A] dark:text-[#5EEAD4] mb-3 shadow-xs">
            <InstitutionalBrandIcon className="w-9 h-9" />
          </div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#0D382F] dark:text-[#5EEAD4] leading-tight">
            CEPRO_MICAELA
          </h1>
          <p className="text-[12px] font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase mt-0.5">
            {activeInSetup ? 'Asistente de Primer Arranque' : 'Gestión Académica 2.0'}
          </p>
          {systemStatus?.institutionName && !activeInSetup && (
            <span className="inline-block mt-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834] px-3 py-1 rounded-full">
              {systemStatus.institutionName}
            </span>
          )}
        </div>

        {/* MODO ASISTENTE DE PRIMERA CONFIGURACIÓN (MED-01) */}
        {activeInSetup ? (
          <div>
            <div className="mb-5 p-4 rounded-2xl bg-emerald-50/80 dark:bg-[#132B25] border border-emerald-200/80 dark:border-[#205C4E] text-emerald-950 dark:text-emerald-100 text-[12px] leading-relaxed">
              <p className="font-bold text-[13px] text-[#0D382F] dark:text-[#5EEAD4] mb-1">
                Configuración Inicial Institucional
              </p>
              Bienvenido. Establezca los datos institucionales y cree la cuenta principal de
              Dirección para inicializar este equipo de cómputo offline.
            </div>

            {setupError && (
              <div
                className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-[12px] flex items-center gap-2"
                role="alert"
              >
                <span className="font-semibold">{setupError}</span>
              </div>
            )}

            {setupSuccess && (
              <div
                className="mb-4 p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-[12px] flex items-center gap-2"
                role="status"
              >
                <span className="font-semibold">{setupSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSetupSubmit} className="flex flex-col gap-3.5" noValidate>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Nombre Institucional
                </label>
                <input
                  type="text"
                  required
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834] text-slate-800 dark:text-white text-[13px] font-medium focus:bg-white dark:focus:bg-[#131C1A] focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
                  placeholder="e.g. CETPRO MICAELA BASTIDAS"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Nombre Completo del Director
                </label>
                <input
                  type="text"
                  required
                  value={directorFullName}
                  onChange={(e) => setDirectorFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834] text-slate-800 dark:text-white text-[13px] font-medium focus:bg-white dark:focus:bg-[#131C1A] focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
                  placeholder="e.g. Mg. Juan Pérez Rodríguez"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Usuario del Director
                </label>
                <input
                  type="text"
                  required
                  value={directorUser}
                  onChange={(e) => setDirectorUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834] text-slate-800 dark:text-white text-[13px] font-medium focus:bg-white dark:focus:bg-[#131C1A] focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
                  placeholder="e.g. director"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={directorPass}
                    onChange={(e) => setDirectorPass(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834] text-slate-800 dark:text-white text-[13px] font-medium focus:bg-white dark:focus:bg-[#131C1A] focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
                    placeholder="Min. 8 car."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Confirmar
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834] text-slate-800 dark:text-white text-[13px] font-medium focus:bg-white dark:focus:bg-[#131C1A] focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
                    placeholder="Repita"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 mt-1 text-[12px] text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={importBaseline}
                  onChange={(e) => setImportBaseline(e.target.checked)}
                  className="rounded text-[#13594A] focus:ring-[#13594A] h-4 w-4"
                />
                <span>Cargar catálogo curricular oficial (programas y módulos)</span>
              </label>

              <button
                type="submit"
                disabled={setupSubmitting}
                className="w-full mt-3 py-3 px-6 rounded-xl bg-[#13594A] hover:bg-[#0E4438] active:bg-[#0B372D] text-white font-bold text-[14px] shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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
                className="w-full mt-3 text-[12px] font-semibold text-[#13594A] hover:underline text-center cursor-pointer"
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
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
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
                <svg
                  className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
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
                  className="text-[12px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider"
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
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834] text-slate-800 dark:text-white text-[14px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#131C1A] focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4] focus:border-transparent transition-all"
                />
              </div>

              {/* Campo Contraseña */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="password"
                    className="text-[12px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider"
                  >
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="text-[11px] font-semibold text-[#13594A] dark:text-[#5EEAD4] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] dark:focus-visible:ring-[#5EEAD4] focus-visible:ring-offset-1 rounded px-1 transition-all cursor-pointer"
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
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834] text-slate-800 dark:text-white text-[14px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#131C1A] focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Botón de Entrada */}
              <button
                type="submit"
                disabled={isLoading || submitting || !username.trim() || !password}
                className="w-full mt-2 py-3.5 px-6 rounded-xl bg-[#13594A] hover:bg-[#0E4438] active:bg-[#0B372D] text-white font-bold text-[14px] tracking-wide shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] dark:focus-visible:ring-[#5EEAD4] focus-visible:ring-offset-2"
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
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

            {/* Sección de Vinculación Institucional de Red Offline */}
            <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-[#263834] text-center">
              <label
                htmlFor="invitation-upload"
                className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#13594A] dark:text-[#5EEAD4] hover:underline cursor-pointer"
              >
                <UsbIcon className="w-4 h-4" />
                <span>¿Recibió un Kit de Instalación? Vincular este equipo</span>
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#182220] border border-slate-200 dark:border-[#263834] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#172B28] dark:text-[#F0FDF8] flex items-center gap-2">
                <LaptopIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Vinculación Institucional de Equipo
              </h3>
              <button
                onClick={() => setInvitationModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {invitationError ? (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200 text-xs flex items-start gap-2">
                <AlertCircleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{invitationError}</span>
              </div>
            ) : invitationValidation ? (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200">
                  <p className="font-bold text-sm mb-1 text-[#0D382F] dark:text-emerald-300">
                    Invitación Institucional Verificada
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    La Dirección del CETPRO ha emitido una autorización criptográfica para este equipo.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834] rounded-xl p-3 space-y-1.5 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500">Institución:</span>{' '}
                    <strong className="text-slate-800 dark:text-white">{invitationValidation.institution.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Destinatario:</span>{' '}
                    <strong className="text-slate-800 dark:text-white">{invitationValidation.recipient.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Usuario oficial:</span>{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">{invitationValidation.recipient.username}</strong> ({invitationValidation.recipient.role})
                  </div>
                  <div>
                    <span className="text-slate-500">Vigencia hasta:</span>{' '}
                    <span className="text-slate-700 dark:text-slate-300">{invitationValidation.expiresAt.slice(0, 10)}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-normal">
                  Al confirmar, este equipo adoptará el certificado institucional y quedará formalmente autorizado para exportar e importar datos académicos hacia la Dirección.
                </p>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setInvitationModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cerrar
              </button>
              {invitationValidation && !invitationError && (
                <button
                  onClick={handleConfirmLink}
                  disabled={isLinkingInvitation}
                  className="bg-[#13594A] hover:bg-[#0E4438] active:bg-[#0B372D] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all"
                >
                  {isLinkingInvitation ? 'Vinculando Equipo...' : 'Aceptar y Vincular este Equipo →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pie institucional */}
      <footer className="w-full max-w-md text-center py-4">
        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
          Operación 100% fuera de línea · Información institucional protegida en este equipo
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
