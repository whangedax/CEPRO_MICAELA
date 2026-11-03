/**
 * src/pages/MiCuentaPerfil.tsx
 *
 * Página de Mi Cuenta y Perfil Institucional — CEPRO_MICAELA 2.0.
 * Permite a Director, Secretaría y Docentes consultar la información de su
 * cuenta titular, asignaciones académicas autorizadas y actualizar su
 * contraseña de forma segura mediante POST /api/password.
 */

import React, { useState } from 'react';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiClient } from '../api/client';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import {
  AccountsIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  GroupsIcon,
  ArrowForwardIcon,
} from '../components/ui/Icons';

export interface MiCuentaPerfilProps {
  onNavigate?: (route: NavRoute) => void;
}

export const MiCuentaPerfil: React.FC<MiCuentaPerfilProps> = ({ onNavigate }) => {
  const { user, systemStatus } = useAuth();
  const { options } = useWorkspace();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword.trim()) {
      setErrorMsg('Ingrese su contraseña actual para verificar su identidad.');
      return;
    }
    if (newPassword.trim().length < 10) {
      setErrorMsg('La nueva contraseña debe tener al menos 10 caracteres por seguridad institucional.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('La confirmación de la nueva contraseña no coincide.');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.changePassword({
        currentPassword,
        password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('Su contraseña institucional ha sido actualizada correctamente.');
    } catch (err: any) {
      setErrorMsg(err?.error || err?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setIsSaving(false);
    }
  };

  const roleBadgeLabel =
    user?.role === 'DIRECTOR'
      ? 'Dirección General'
      : user?.role === 'SECRETARIA'
      ? 'Secretaría Académica'
      : 'Docente Titular';

  const groups = options?.groups || [];
  const programs = options?.programs || [];
  const modules = options?.modules || [];

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Encabezado */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#263834]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#004034] dark:text-[#5EEAD4] uppercase tracking-widest bg-[#E6F4F1] dark:bg-[#132B25] px-2.5 py-1 rounded-md">
              Cuenta Institucional · {roleBadgeLabel}
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-[28px] text-[#0D382F] dark:text-[#F0FDF8] font-bold tracking-tight">
            Mi Cuenta y Perfil Académico
          </h1>
          <p className="text-[14px] text-slate-600 dark:text-slate-300 mt-0.5">
            Información de su credencial oficial, aulas vinculadas y cambio seguro de contraseña.
          </p>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('inicio')}
            className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#182220] border border-slate-200 dark:border-[#263834] text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#13594A] transition-colors"
          >
            <span>Volver al Panel Principal</span>
            <ArrowForwardIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Ficha del Usuario y Aulas Asignadas */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white dark:bg-[#182220] rounded-3xl p-6 border border-slate-200/90 dark:border-[#263834] shadow-xs space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#13594A] text-white flex items-center justify-center shadow-md shrink-0">
                <AccountsIcon className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#13594A] dark:text-[#5EEAD4]">
                  Titular de la Sesión Activa
                </span>
                <h2 className="text-xl font-bold text-[#172B28] dark:text-[#F0FDF8] mt-0.5">
                  {user?.name || 'Usuario Institucional'}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Usuario: <strong className="font-mono text-slate-900 dark:text-white">{user?.username}</strong>
                  {' · '}Rol: <strong>{roleBadgeLabel}</strong>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-[#263834] text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200/70 dark:border-[#263834]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Institución Educativa
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                  {systemStatus?.institutionName || 'CETPRO Micaela Bastidas'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200/70 dark:border-[#263834]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Alcance de Acceso
                </span>
                <span className="font-bold text-[#13594A] dark:text-[#5EEAD4] mt-1 block">
                  {groups.length} {groups.length === 1 ? 'aula autorizada' : 'aulas autorizadas'} · {programs.length}{' '}
                  {programs.length === 1 ? 'carrera' : 'carreras'}
                </span>
              </div>
            </div>

            {/* Listado de Aulas y Módulos Autorizados */}
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <GroupsIcon className="w-4 h-4 text-[#13594A] dark:text-[#5EEAD4]" />
                <span>Aulas y Módulos bajo su Alcance ({groups.length})</span>
              </h3>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {groups.map((g) => {
                  const progName = programs.find((p) => p.id === g.programId)?.nombre || g.programId;
                  const modName = modules.find((m) => m.id === g.moduleId)?.nombre || g.moduleId;
                  return (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200/80 dark:border-[#263834] flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#13594A] dark:text-[#5EEAD4]">
                          {progName} · {g.periodId}
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {g.name}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          {modName} · {g.studentCount} estudiantes · {g.units.length} unidades
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-[#E6F4F1] dark:bg-[#132B25] text-[#004034] dark:text-[#5EEAD4] text-[11px] font-bold shrink-0">
                        {g.turno || 'Mañana'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Columna Derecha: Cambio de Contraseña */}
        <div className="lg:col-span-5">
          <section className="bg-white dark:bg-[#182220] rounded-3xl p-6 border border-slate-200/90 dark:border-[#263834] shadow-xs">
            <h2 className="text-lg font-bold text-[#172B28] dark:text-[#F0FDF8]">
              Actualizar Contraseña
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 mb-5">
              Su contraseña se almacena cifrada con derivación criptográfica scrypt en la base de datos SQLite local.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-start gap-2">
                <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-start gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="current-password"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Contraseña actual
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingrese su contraseña actual"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Nueva contraseña (mínimo 10 caracteres)
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 10 caracteres"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Confirmar nueva contraseña
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita la nueva contraseña"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 px-4 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#004034] transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'Guardando nueva contraseña...' : 'Actualizar contraseña institucional'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MiCuentaPerfil;
