/**
 * src/pages/MiCuentaPerfil.tsx
 *
 * Página de Mi Cuenta y Perfil Institucional — CEPRO_MICAELA 2.0.
 * Permite a Director, Secretaría y Docentes consultar la información de su
 * cuenta titular, asignaciones académicas autorizadas y actualizar su
 * contraseña de forma segura mediante POST /api/password.
 */

import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
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
      <DashboardPhotoBand as="header" scene="secretaria" contentClassName="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[12px] leading-[18px] font-bold text-brand uppercase tracking-wider bg-brand-soft border border-line px-2.5 py-1 rounded-full">
              Cuenta Institucional · {roleBadgeLabel}
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-[28px] sm:text-[30px] leading-[36px] text-ink font-bold tracking-tight">
            Mi Cuenta y Perfil Académico
          </h1>
          <p className="text-[14px] leading-[21px] text-muted mt-1">
            Información de su credencial oficial, aulas vinculadas y cambio seguro de contraseña.
          </p>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('inicio')}
            className="self-start sm:self-center shrink-0 min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-surface border border-line text-ink text-[14px] font-semibold hover:bg-brand-soft hover:text-brand transition-colors cursor-pointer"
          >
            <span>Volver al Panel Principal</span>
            <ArrowForwardIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </DashboardPhotoBand>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Ficha del Usuario y Aulas Asignadas */}
        <div className="lg:col-span-7 space-y-6 min-w-0">
          <section className="bg-surface rounded-2xl p-6 border border-line shadow-[var(--ui-shadow)] space-y-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-brand text-on-brand flex items-center justify-center shadow-sm shrink-0">
                <AccountsIcon className="w-7 h-7" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[12px] leading-[18px] font-bold uppercase tracking-wider text-brand">
                  Titular de la Sesión Activa
                </span>
                <h2 className="text-[20px] leading-[28px] font-bold text-ink mt-0.5 truncate">
                  {user?.name || 'Usuario Institucional'}
                </h2>
                <p className="text-[12px] leading-[18px] text-muted mt-0.5 truncate">
                  Usuario: <strong className="font-mono text-ink">{user?.username}</strong>
                  {' · '}Rol: <strong className="text-ink">{roleBadgeLabel}</strong>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-line text-[12px] leading-[18px]">
              <div className="p-3.5 rounded-2xl bg-surface-alt border border-line min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                  Institución Educativa
                </span>
                <span className="text-[14px] leading-[21px] font-bold text-ink mt-1 block truncate">
                  {systemStatus?.institutionName || 'CETPRO Micaela Bastidas'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface-alt border border-line min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                  Alcance de Acceso
                </span>
                <span className="text-[14px] leading-[21px] font-bold text-brand mt-1 block tabular-nums">
                  {groups.length} {groups.length === 1 ? 'aula autorizada' : 'aulas autorizadas'} · {programs.length}{' '}
                  {programs.length === 1 ? 'carrera' : 'carreras'}
                </span>
              </div>
            </div>

            {/* Listado de Aulas y Módulos Autorizados */}
            <div className="pt-2">
              <h3 className="text-[12px] leading-[18px] font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2 tabular-nums">
                <GroupsIcon className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
                <span>Aulas y Módulos bajo su Alcance ({groups.length})</span>
              </h3>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {groups.map((g) => {
                  const progName = programs.find((p) => p.id === g.programId)?.nombre || g.programId;
                  const modName = modules.find((m) => m.id === g.moduleId)?.nombre || g.moduleId;
                  return (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-2xl bg-surface-alt border border-line flex items-center justify-between gap-3 min-w-0"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-brand block truncate">
                          {progName} · {g.periodId}
                        </span>
                        <p className="text-[14px] leading-[21px] font-bold text-ink mt-0.5 truncate">
                          {g.name}
                        </p>
                        <p className="text-[12px] leading-[18px] text-muted truncate tabular-nums">
                          {modName} · {g.studentCount} estudiantes · {g.units.length} unidades
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-brand-soft border border-line text-brand text-[12px] font-bold shrink-0">
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
        <div className="lg:col-span-5 min-w-0">
          <section className="bg-surface rounded-2xl p-6 border border-line shadow-[var(--ui-shadow)]">
            <h2 className="text-[20px] leading-[28px] font-bold text-ink">
              Actualizar Contraseña
            </h2>
            <p className="text-[14px] leading-[21px] text-muted mt-1 mb-5">
              Su contraseña se almacena de forma segura y cifrada en el equipo institucional.
            </p>

            {errorMsg && (
              <div
                role="alert"
                className="mb-4 p-3.5 rounded-[10px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-[12px] leading-[18px] font-medium flex items-start gap-2.5"
              >
                <AlertCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="min-w-0">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div
                role="status"
                className="mb-4 p-3.5 rounded-[10px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-[12px] leading-[18px] font-semibold flex items-start gap-2.5"
              >
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="min-w-0">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="current-password"
                  className="block text-[14px] leading-[21px] font-semibold text-ink mb-1.5"
                >
                  Contraseña actual
                </label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingrese su contraseña actual"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[10px] border border-line bg-surface-alt text-[14px] text-ink placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="block text-[14px] leading-[21px] font-semibold text-ink mb-1.5"
                >
                  Nueva contraseña (mínimo 10 caracteres)
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 10 caracteres"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[10px] border border-line bg-surface-alt text-[14px] text-ink placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-[14px] leading-[21px] font-semibold text-ink mb-1.5"
                >
                  Confirmar nueva contraseña
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita la nueva contraseña"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[10px] border border-line bg-surface-alt text-[14px] text-ink placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-[10px] bg-brand text-on-brand text-[14px] font-bold hover:opacity-90 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
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
