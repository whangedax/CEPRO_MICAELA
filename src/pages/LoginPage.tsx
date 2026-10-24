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
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { InstitutionalBrandIcon } from '../components/ui/Icons';

export const LoginPage: React.FC = () => {
  const { login, error, clearError, systemStatus, isLoading, refreshStatus } = useAuth();
  
  // Estados para inicio de sesión estándar
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    <div className="min-h-screen bg-[#F6F8FA] text-[#172B28] flex flex-col justify-between items-center px-4 py-8 select-none antialiased">
      {/* Encabezado de estado local */}
      <header className="w-full max-w-md flex justify-between items-center py-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? 'bg-[#13594A]' : 'bg-amber-500'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isConnected ? 'bg-[#13594A]' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="text-[12px] font-semibold text-slate-700">
            {isConnected ? 'Servicio Local Conectado (127.0.0.1)' : 'Buscando servicio local…'}
          </span>
        </div>
        <span className="text-[10px] font-bold text-[#004034] bg-[#c0ecde] px-2 py-0.5 rounded-md uppercase tracking-wider">
          v2.0 Offline
        </span>
      </header>

      {/* Tarjeta Principal de Login / Setup */}
      <main className="w-full max-w-md bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-200/80 p-8 sm:p-10 my-auto">
        {/* Identidad Institucional */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#13594A]/10 border border-[#13594A]/15 flex items-center justify-center text-[#13594A] mb-4 shadow-xs">
            <InstitutionalBrandIcon className="w-9 h-9" />
          </div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#0D382F] leading-tight">
            CEPRO_MICAELA
          </h1>
          <p className="text-[12px] font-semibold tracking-wider text-slate-600 uppercase mt-0.5">
            {activeInSetup ? 'Asistente de Primer Arranque' : 'Gestión Académica 2.0'}
          </p>
          {systemStatus?.institutionName && !activeInSetup && (
            <span className="inline-block mt-2 text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
              {systemStatus.institutionName}
            </span>
          )}
        </div>

        {/* MODO ASISTENTE DE PRIMERA CONFIGURACIÓN (MED-01) */}
        {activeInSetup ? (
          <div>
            <div className="mb-5 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-950 text-[12px] leading-relaxed">
              <p className="font-bold text-[13px] text-[#0D382F] mb-1">
                Configuración Inicial Institucional
              </p>
              Bienvenido. Establezca los datos institucionales y cree la cuenta principal de
              Dirección para inicializar este equipo de cómputo offline.
            </div>

            {setupError && (
              <div
                className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[12px] flex items-center gap-2"
                role="alert"
              >
                <span className="font-semibold">{setupError}</span>
              </div>
            )}

            {setupSuccess && (
              <div
                className="mb-4 p-3.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-[12px] flex items-center gap-2"
                role="status"
              >
                <span className="font-semibold">{setupSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSetupSubmit} className="flex flex-col gap-3.5" noValidate>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Nombre Institucional
                </label>
                <input
                  type="text"
                  required
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[13px] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                  placeholder="e.g. CETPRO MICAELA BASTIDAS"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Nombre Completo del Director
                </label>
                <input
                  type="text"
                  required
                  value={directorFullName}
                  onChange={(e) => setDirectorFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[13px] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                  placeholder="e.g. Mg. Juan Pérez Rodríguez"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Usuario del Director
                </label>
                <input
                  type="text"
                  required
                  value={directorUser}
                  onChange={(e) => setDirectorUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[13px] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                  placeholder="e.g. director"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={directorPass}
                    onChange={(e) => setDirectorPass(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[13px] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                    placeholder="Min. 8 car."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Confirmar
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[13px] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                    placeholder="Repita"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 mt-1 text-[12px] text-slate-700 font-medium cursor-pointer">
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
                  <span>Completar e Iniciar Nodo</span>
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
            {/* Mensaje de Error de Autenticación */}
            {error && (
              <div
                className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-[13px] flex items-start gap-3 animate-fade-in"
                role="alert"
              >
                <svg
                  className="w-5 h-5 text-rose-600 shrink-0 mt-0.5"
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
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              {/* Campo Usuario */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="username"
                  className="text-[12px] font-bold text-slate-800 uppercase tracking-wider"
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
                  placeholder="e.g. director.dev o docente.dev"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[14px] font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A] focus:border-transparent transition-all"
                />
              </div>

              {/* Campo Contraseña */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="password"
                    className="text-[12px] font-bold text-slate-800 uppercase tracking-wider"
                  >
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="text-[11px] font-semibold text-[#13594A] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] focus-visible:ring-offset-1 rounded px-1 transition-all"
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
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[14px] font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Botón de Entrada */}
              <button
                type="submit"
                disabled={isLoading || submitting || !username.trim() || !password}
                className="w-full mt-2 py-3.5 px-6 rounded-xl bg-[#13594A] hover:bg-[#0E4438] active:bg-[#0B372D] text-white font-bold text-[14px] tracking-wide shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] focus-visible:ring-offset-2"
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

            {/* Información de desarrollo sintético */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">
                Cuentas del Sandbox de Desarrollo
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setUsername('docente.dev');
                    setPassword('DocenteDev2026!');
                    clearError();
                  }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer text-left transition-all"
                >
                  <span className="block font-bold text-[#13594A]">Docente</span>
                  <span className="text-[10px] text-slate-600">docente.dev</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('director.dev');
                    setPassword('DirectorDev2026!');
                    clearError();
                  }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer text-left transition-all"
                >
                  <span className="block font-bold text-[#13594A]">Director</span>
                  <span className="text-[10px] text-slate-600">director.dev</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('secretaria.dev');
                    setPassword('SecretariaDev2026!');
                    clearError();
                  }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer text-left transition-all"
                >
                  <span className="block font-bold text-[#13594A]">Secretaría</span>
                  <span className="text-[10px] text-slate-600">secretaria.dev</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Pie institucional */}
      <footer className="w-full max-w-md text-center py-4">
        <p className="text-[11px] font-medium text-slate-600">
          Operación 100% offline · Datos protegidos en base SQLite local
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
