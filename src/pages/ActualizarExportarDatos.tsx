/**
 * src/pages/ActualizarExportarDatos.tsx
 *
 * Centro de Exportación y Actualización Tabular de Datos — CEPRO_MICAELA 2.0.
 * Conectado a los endpoints reales del backend (DataUpdateService):
 *   - GET  /api/data/catalog
 *   - POST /api/data/export
 *   - POST /api/data/template
 *   - POST /api/data/preview
 *   - POST /api/data/apply
 * Permite a Secretaría, Dirección y Docentes exportar padrones oficiales en CSV/XLSX/JSON
 * e importar lotes verificados con respaldo automático previo ('antes-importar-tabla').
 */

import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiClient } from '../api/client';
import { TransferFrame, TransferIntentCard, transferFieldClass, transferPrimaryButtonClass, transferSecondaryButtonClass } from '../components/network/TransferFlow';
import {
  DataObjectIcon,
  CheckCircleIcon,
  ArrowForwardIcon,
  RefreshIcon,
} from '../components/ui/Icons';

export interface DataCatalogKind {
  kind: string;
  title?: string;
  columns: string[];
  required: string[];
  importPolicy?: string;
  canImport: boolean;
  canExport: boolean;
}

export interface DataCatalogResponse {
  role?: string;
  mergePolicy?: string;
  version: number;
  kinds: DataCatalogKind[];
  maxRows: number;
}

export interface DataPreviewChange {
  line: number;
  action: string;
  name?: string;
  groupId?: string;
  before?: {name?: string; value?: string | number};
  after?: unknown;
}

export interface DataPreviewResponse {
  token: string;
  kind: string;
  total: number;
  ignored: number;
  errors: { line: number; message: string }[];
  warnings: string[];
  canApply: boolean;
  changes: DataPreviewChange[];
  columns: string[];
}

export interface ActualizarExportarDatosProps {
  onNavigate?: (route: NavRoute) => void;
}

const KIND_LABELS: Record<string, { title: string; description: string }> = {
  estudiantes: {
    title: 'Estudiantes y matrículas',
    description: 'DNI, apellidos y nombres, sexo, fecha de nacimiento, aula asignada y fecha de ingreso.',
  },
  docentes: {
    title: 'Docentes y aulas',
    description: 'Cuentas docentes, nombres completos, programa de estudios, aula y unidades asignadas.',
  },
  notas: {
    title: 'Notas',
    description: 'Calificaciones de los estudiantes por aula y unidad didáctica.',
  },
  asistencias: {
    title: 'Asistencia',
    description: 'Presencias, faltas, justificaciones y tardanzas por fecha.',
  },
};

export const ActualizarExportarDatos: React.FC<ActualizarExportarDatosProps> = (props) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  return <ActualizarDatosForm key={JSON.stringify([user?.id, user?.role, user?.version, activeWorkspace])} {...props} />;
};
const ActualizarDatosForm: React.FC<ActualizarExportarDatosProps> = ({ onNavigate }) => {
  const { options, activeWorkspace } = useWorkspace();
  const [intent, setIntent] = useState<'download' | 'update' | null>(null);
  const [step, setStep] = useState(1);
  const [previewPage, setPreviewPage] = useState(0);
  const [template, setTemplate] = useState(false);
  const [result, setResult] = useState<{applied: number; requests: number; backup?: string; credentials?: {username:string;password:string}[]} | null>(null);
  const [catalog, setCatalog] = useState<DataCatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedKind, setSelectedKind] = useState<string>('estudiantes');
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'xlsx' | 'json'>('xlsx');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Estado de importación / previsualización
  const [fileName, setFileName] = useState<string>('');
  const [fileContentBase64, setFileContentBase64] = useState<string>('');
  const [fileText, setFileText] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<DataPreviewResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isReading, setIsReading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const readVersion = useRef(0);
  const operationVersion = useRef(0);
  const catalogVersion = useRef(0);
  const alive = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentKindInfo = catalog?.kinds.find((k) => k.kind === selectedKind);
  const selectedUnit = selectedGroupId && selectedGroupId === activeWorkspace?.groupId && activeWorkspace.mode === 'UNIT' ? activeWorkspace.unit : undefined;
  const invalidatePreview = () => {
    operationVersion.current++; setPreviewPage(0);
    setPreviewResult(null); setConfirmed(false); setErrorMsg(null); setSuccessMsg(null);
  };
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; readVersion.current++; operationVersion.current++; };
  }, []);
  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const token = apiClient.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const secret = apiClient.getInstanceSecret();
    if (secret) headers['X-CETPRO-Instance-Secret'] = secret;
    return headers;
  }, []);

  const loadCatalog = useCallback(async () => {
    const requestVersion = ++catalogVersion.current;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${apiClient.getBaseUrl()}/api/data/catalog`, {
        method: 'GET',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo consultar el catálogo de tablas.');
      }
      const data: DataCatalogResponse = await res.json();
      if (!alive.current || requestVersion !== catalogVersion.current) return;
      setCatalog(data);
      setSelectedKind(current => data.kinds.some(kind => kind.kind === current) ? current : (data.kinds[0]?.kind || ''));
    } catch (err: any) {
      if (alive.current && requestVersion === catalogVersion.current) setErrorMsg(err?.error || err?.message || 'Error al cargar catálogo de datos.');
    } finally {
      if (alive.current && requestVersion === catalogVersion.current) setIsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (activeWorkspace && !activeWorkspace.overview && activeWorkspace.groupId) {
      setSelectedGroupId(activeWorkspace.groupId);
    }
  }, [activeWorkspace]);

  const handleDownload = async (isTemplate: boolean) => {
    if (!currentKindInfo?.canExport || isDownloading) return;
    const version = operationVersion.current;
    setIsDownloading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const endpoint = isTemplate ? '/api/data/template' : '/api/data/export';
      const payload: Record<string, unknown> = {
        kind: selectedKind,
        format: selectedFormat,
        options: {
          ...(selectedGroupId ? { groupId: selectedGroupId } : {}),
          ...(selectedUnit ? { unit: selectedUnit } : {}),
        },
      };

      const res = await fetch(`${apiClient.getBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo generar el archivo de exportación.');
      }

      const blob = await res.blob();
      if (!alive.current || version !== operationVersion.current) return;
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `CETPRO_${selectedKind}${isTemplate ? '_plantilla' : ''}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

      setStep(4);
      setSuccessMsg(
        isTemplate
          ? `Plantilla oficial de ${selectedKind} (${selectedFormat.toUpperCase()}) descargada con éxito.`
          : `Datos actuales de ${selectedKind} (${selectedFormat.toUpperCase()}) exportados con éxito.`
      );
    } catch (err: any) {
      if (alive.current && version === operationVersion.current) setErrorMsg(err?.message || 'Error durante la descarga del archivo.');
    } finally {
      if (alive.current) setIsDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; invalidatePreview();
    const version = ++readVersion.current;
    setFileName(''); setFileContentBase64(''); setFileText(''); setIsReading(false);
    if (!file) return;
    if (!/\.(csv|xlsx|json)$/i.test(file.name)) { setErrorMsg('Elige un archivo CSV, XLSX o JSON.'); return; }
    if (file.size > 25 * 1024 * 1024) { setErrorMsg('El archivo supera 25 MB. Divide los datos en archivos más pequeños.'); return; }
    setFileName(file.name); setIsReading(true);
    const reader = new FileReader();
    const current = () => alive.current && version === readVersion.current;
    const fail = () => { if (current()) { setErrorMsg('No se pudo leer el archivo. Selecciónalo nuevamente.'); setFileName(''); setFileContentBase64(''); setFileText(''); setIsReading(false); } };
    reader.onerror = fail; reader.onabort = fail;
    reader.onload = () => {
      if (!current()) return;
      try {
        if (file.name.toLowerCase().endsWith('.xlsx')) {
          const bytes = new Uint8Array(reader.result as ArrayBuffer);
          const parts: string[] = [];
          for (let index = 0; index < bytes.length; index += 8192) parts.push(String.fromCharCode(...bytes.subarray(index, index + 8192)));
          setFileContentBase64(btoa(parts.join('')));
        } else { setFileText(String(reader.result || '')); }
        setIsReading(false);
      } catch { fail(); }
    };
    if (file.name.toLowerCase().endsWith('.xlsx')) reader.readAsArrayBuffer(file);
    else reader.readAsText(file, 'utf-8');
  };

  const handlePreviewImport = async () => {
    if (!currentKindInfo?.canImport || isReading) return;
    if (!fileText && !fileContentBase64) {
      setErrorMsg('Seleccione primero un archivo CSV, JSON o XLSX para revisar.');
      return;
    }
    invalidatePreview();
    const version = operationVersion.current;
    setIsPreviewing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const ext = fileName.toLowerCase().endsWith('.xlsx')
        ? 'xlsx'
        : fileName.toLowerCase().endsWith('.json')
        ? 'json'
        : 'csv';

      const payload: Record<string, unknown> = {
        kind: selectedKind,
        format: ext,
        options: { ...(selectedGroupId ? { groupId: selectedGroupId } : {}), ...(selectedUnit ? { unit: selectedUnit } : {}) },
        content: ext === 'xlsx' ? fileContentBase64 : fileText,
      };

      const res = await fetch(`${apiClient.getBaseUrl()}/api/data/preview`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al analizar el archivo de actualización.');
      }

      if (!alive.current || version !== operationVersion.current) return;
      setPreviewResult(data);
      setStep(3);
    } catch (err: any) {
      if (alive.current && version === operationVersion.current) setErrorMsg(err?.error || err?.message || 'No se pudo previsualizar el archivo.');
    } finally {
      if (alive.current) setIsPreviewing(false);
    }
  };

  const handleApplyImport = async () => {
    if (!previewResult?.token || !previewResult.canApply || !currentKindInfo?.canImport || !confirmed || isApplying) return;
    const version = operationVersion.current;
    setIsApplying(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${apiClient.getBaseUrl()}/api/data/apply`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ token: previewResult.token }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo aplicar la actualización de datos.');
      }
      if (!alive.current || version !== operationVersion.current) return;
      setResult(data);
      setStep(4);
      setSuccessMsg(
        `Actualización aplicada con éxito: ${data.applied || 0} registro(s) procesados. Respaldo previo creado (${data.backup || 'automático'}).`
      );
      setPreviewResult(null);
    } catch (err: any) {
      if (alive.current && version === operationVersion.current) { setErrorMsg(err?.error || err?.message || 'Error al aplicar el lote de datos.'); setPreviewResult(null); setConfirmed(false); }
    } finally {
      if (alive.current) setIsApplying(false);
    }
  };

  const groups = options?.groups || [];

  const busy = isDownloading || isPreviewing || isApplying || isReading;
  const label = KIND_LABELS[selectedKind]?.title || currentKindInfo?.title || selectedKind;
  const classroom = groups.find(g => g.id === selectedGroupId)?.name || 'Todas tus aulas autorizadas';
  const role = catalog?.role === 'DOCENTE' ? 'Docente' : catalog?.role === 'SECRETARIA' ? 'Secretaría' : 'Dirección';
  const available = catalog?.kinds.filter(k => intent === 'download' ? k.canExport : k.canImport) || [];
  const chooseIntent = (value: 'download' | 'update') => {
    invalidatePreview(); setResult(null); setIntent(value); setStep(1);
    const allowed = catalog?.kinds.filter(k => value === 'download' ? k.canExport : k.canImport) || [];
    if (!allowed.some(k => k.kind === selectedKind)) setSelectedKind(allowed[0]?.kind || '');
  };
  const reset = () => { invalidatePreview(); setIntent(null); setStep(1); setResult(null); };
  const actions: Record<string,string> = {CREAR:'Agregar',CREAR_DOCENTE:'Agregar docente',CREAR_REGISTRO:'Agregar',ACTUALIZAR:'Actualizar',ACTUALIZAR_DOCENTE:'Actualizar docente',ACTUALIZAR_REGISTRO:'Actualizar',MATRICULAR:'Agregar matrícula',PROPONER_ALTA:'Enviar para revisión',SIN_CAMBIOS:'Sin cambios'};
  const summary = <dl className="grid gap-5 sm:grid-cols-2 rounded-2xl border border-line bg-surface-alt p-5 text-sm">
    {[[ 'Información',label ],['Aula',classroom],['Archivo',intent === 'download' ? `${template ? 'Plantilla vacía' : 'Datos actuales'} · ${selectedFormat.toUpperCase()}` : fileName],['Perfil',role]].map(([title,value]) => <div key={title}><dt className="text-muted">{title}</dt><dd className="mt-1 break-words font-semibold text-ink">{value}</dd></div>)}
  </dl>;
  return <div className="mx-auto max-w-6xl space-y-6 pb-8">
    <DashboardPhotoBand as="header" scene="indicadores" contentClassName="flex flex-wrap items-center justify-between gap-4">
      <div><p className="mb-2 text-sm font-semibold text-brand">Archivos · {role}</p><h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Trabajar con archivos</h1><p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">Descarga una tabla o revisa un archivo antes de actualizar tu información.</p></div>
      {!intent && <button type="button" className={transferSecondaryButtonClass} onClick={loadCatalog} disabled={isLoading}><RefreshIcon className="h-4 w-4"/> Actualizar</button>}
    </DashboardPhotoBand>
    {errorMsg && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">{errorMsg}</div>}
    {isLoading ? <p role="status" className="p-6 text-muted">Consultando las opciones de tu perfil…</p> : !intent ? <section aria-labelledby="data-intent-heading" className="space-y-5"><h2 id="data-intent-heading" className="text-xl font-bold text-ink">¿Qué necesitas hacer?</h2><div className="grid gap-4 sm:grid-cols-2">
      <TransferIntentCard id="data-intent-download" title="Descargar una tabla" description="Obtén tus datos en Excel, CSV o JSON para guardarlos o trabajarlos en otro equipo." icon={<DataObjectIcon className="h-6 w-6"/>} onClick={() => chooseIntent('download')}/>
      <TransferIntentCard id="data-intent-update" title="Actualizar desde un archivo" description="Elige un archivo y revisa sus cambios. Nada se aplica hasta que lo confirmes." icon={<ArrowForwardIcon className="h-6 w-6"/>} onClick={() => chooseIntent('update')}/>
    </div><p className="text-sm leading-relaxed text-muted">¿Vas a enviar trabajo a otra persona? <button type="button" className="font-semibold text-brand underline underline-offset-4" onClick={() => onNavigate?.('sincronizacion' as NavRoute)}>Ve a Compartir entre equipos</button> para usar WhatsApp o un archivo de intercambio.</p></section> :
    <TransferFrame id="data-flow" current={step} steps={intent === 'download' ? ['Información','Archivo','Revisar','Listo'] : ['Información','Elegir archivo','Revisar','Resultado']} title={step === 1 ? '¿Qué información necesitas?' : step === 2 ? intent === 'download' ? 'Prepara tu archivo' : 'Elige el archivo que recibiste' : step === 3 ? intent === 'download' ? 'Revisa tu descarga' : 'Revisa antes de actualizar' : intent === 'download' ? 'Tu archivo está preparado' : 'Revisión completada'} description={step === 1 ? 'Solo aparecen las opciones permitidas para tu perfil.' : undefined} footer={<>
      {step < 4 && <button type="button" data-testid="data-back" className={transferSecondaryButtonClass} disabled={busy} onClick={() => {if(step === 1) reset(); else {if(step === 3 && intent === 'update') invalidatePreview();setStep(step-1);}}}>Atrás</button>}
      {step === 1 && <button type="button" data-testid="data-next" className={transferPrimaryButtonClass} disabled={!available.some(k=>k.kind===selectedKind)} onClick={()=>setStep(2)}>Continuar</button>}
      {step === 2 && intent === 'download' && <button type="button" data-testid="data-next" className={transferPrimaryButtonClass} onClick={()=>setStep(3)}>Revisar descarga</button>}
      {step === 2 && intent === 'update' && <button type="button" id="tabular-preview" data-testid="tabular-preview" className={transferPrimaryButtonClass} disabled={busy || (!fileText && !fileContentBase64)} onClick={handlePreviewImport}>{isPreviewing ? 'Revisando…' : 'Revisar archivo'}</button>}
      {step === 3 && intent === 'download' && <button type="button" data-testid="data-download" className={transferPrimaryButtonClass} disabled={busy} onClick={()=>handleDownload(template)}>{isDownloading ? 'Preparando…' : 'Descargar archivo'}</button>}
      {step === 3 && intent === 'update' && <button type="button" id="tabular-confirm" data-testid="tabular-confirm" className={transferPrimaryButtonClass} disabled={busy || !confirmed || !previewResult?.canApply} onClick={handleApplyImport}>{isApplying ? 'Aplicando…' : 'Confirmar actualización'}</button>}
      {step === 4 && <button type="button" className={transferPrimaryButtonClass} onClick={reset}>Volver al inicio</button>}
    </>}>
      {step === 1 && <div className="grid gap-3 sm:grid-cols-2">{available.map(k=><TransferIntentCard key={k.kind} id={`data-kind-${k.kind}`} selected={selectedKind===k.kind} title={KIND_LABELS[k.kind]?.title || k.title || k.kind} description={KIND_LABELS[k.kind]?.description || ''} onClick={()=>{if(selectedKind!==k.kind){invalidatePreview();readVersion.current++;setFileName('');setFileText('');setFileContentBase64('');setIsReading(false);}setSelectedKind(k.kind);}}/>)}{!available.length && <p className="text-muted">Tu perfil no tiene opciones disponibles para esta tarea.</p>}</div>}
      {step === 2 && <div className="space-y-6"><p className="font-semibold text-ink">{label}</p><div><label className="mb-2 block text-sm font-semibold text-ink" htmlFor="export-group-select">Aula</label><select id="export-group-select" data-testid="export-group-select" className={transferFieldClass} value={selectedGroupId} onChange={e=>{invalidatePreview();setSelectedGroupId(e.target.value);}}><option value="">Todas tus aulas autorizadas</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
      {intent === 'download' ? <><div><label htmlFor="export-format-select" className="mb-2 block text-sm font-semibold text-ink">Formato</label><select id="export-format-select" data-testid="export-format-select" className={transferFieldClass} value={selectedFormat} onChange={e=>{invalidatePreview();setSelectedFormat(e.target.value as 'xlsx'|'csv'|'json');}}><option value="xlsx">Excel (.xlsx) · recomendado</option><option value="csv">CSV (.csv)</option><option value="json">JSON (.json)</option></select></div><fieldset className="flex flex-wrap gap-5"><legend className="mb-3 text-sm font-semibold text-ink">Contenido del archivo</legend>{[false,true].map(value=><label key={String(value)} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink"><input type="radio" name="data-content" checked={template===value} onChange={()=>{invalidatePreview();setTemplate(value);}} className="h-5 w-5 accent-[var(--ui-brand)]"/>{value?'Plantilla vacía para completar':'Mis datos actuales'}</label>)}</fieldset></> : <><label htmlFor="tabular-file-input" className="block text-sm font-semibold text-ink">Archivo Excel, CSV o JSON</label><input id="tabular-file-input" data-testid="tabular-file-input" ref={fileInputRef} type="file" accept=".csv,.xlsx,.json" onChange={handleFileChange} disabled={busy} className={`${transferFieldClass} file:mr-4 file:rounded-lg file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:font-semibold file:text-brand`}/><p role="status" className="text-sm text-muted">{isReading?'Leyendo archivo…':fileName?`Seleccionado: ${fileName}`:'Hasta 25 MB. Usa una tabla descargada desde este sistema o su plantilla.'}</p>{catalog?.role==='DOCENTE' && selectedKind==='estudiantes' && <p className="rounded-xl bg-brand-soft p-4 text-sm text-ink">Los nuevos estudiantes se enviarán a Secretaría o Dirección para su revisión.</p>}<details className="text-sm text-muted"><summary className="cursor-pointer py-3 font-semibold text-ink">Ver columnas de la plantilla</summary><p className="break-words leading-relaxed">{currentKindInfo?.columns.join(', ')}</p></details></>}
      </div>}
      {step === 3 && <div className="space-y-6">{summary}{intent === 'download' ? <p className="text-sm leading-relaxed text-muted">{template?'La plantilla no incluye registros. Complétala sin cambiar los nombres de las columnas.':'El archivo contendrá la información autorizada de las aulas seleccionadas.'} Después de descargarlo puedes copiarlo a una memoria USB.</p> : previewResult ? <><div className="grid grid-cols-3 gap-3 text-center">{[[previewResult.total,'Filas revisadas'],[previewResult.changes.filter(c=>c.action!=='SIN_CAMBIOS').length,'Cambios propuestos'],[previewResult.errors.length,'Errores']].map(([n,t])=><div key={t} className="rounded-xl border border-line p-4"><strong className="block text-2xl text-ink">{n}</strong><span className="text-xs text-muted">{t}</span></div>)}</div>
      {!previewResult.canApply && !previewResult.errors.length && <p role="status" className="rounded-xl bg-brand-soft p-4 text-sm text-ink">Este archivo no contiene cambios que se puedan aplicar. Tus datos se conservan.</p>}{previewResult.warnings.map((w,i)=><p key={i} className="rounded-xl bg-brand-soft p-4 text-sm text-ink">{w}</p>)}{previewResult.errors.length>0 && <div role="alert" className="rounded-xl border border-red-300 p-4 text-sm text-ink"><p className="font-semibold">Corrige el archivo antes de continuar.</p><ul className="mt-2 list-disc pl-5">{previewResult.errors.map((e,i)=><li key={i}>Fila {e.line}: {e.message}</li>)}</ul></div>}
      <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full text-left text-sm"><caption className="p-4 text-left font-semibold text-ink">Cambios del archivo{previewResult.changes.length>50?` · página ${previewPage+1} de ${Math.ceil(previewResult.changes.length/50)}`:''}</caption><thead className="bg-surface-alt text-muted"><tr><th className="p-3">Fila</th><th className="p-3">Registro</th><th className="p-3">Qué ocurrirá</th><th className="p-3">Valor anterior → recibido</th></tr></thead><tbody>{previewResult.changes.slice(previewPage*50,(previewPage+1)*50).map((c,i)=><tr key={i} className="border-t border-line text-ink"><td className="p-3">{c.line}</td><td className="p-3">{c.name || 'Registro del archivo'}</td><td className="p-3">{actions[c.action] || c.action}</td><td className="p-3">{c.before?.value ?? c.before?.name ?? 'Nuevo'} → {typeof c.after === 'number' || typeof c.after === 'string' ? String(c.after) : 'Ver registro del archivo'}</td></tr>)}</tbody></table></div>{previewResult.changes.length>50 && <nav aria-label="Páginas de cambios" className="flex items-center justify-between gap-3"><button type="button" className={transferSecondaryButtonClass} disabled={previewPage===0} onClick={()=>setPreviewPage(previewPage-1)}>Anteriores</button><span className="text-sm text-muted">{previewPage+1} / {Math.ceil(previewResult.changes.length/50)}</span><button type="button" className={transferSecondaryButtonClass} disabled={(previewPage+1)*50>=previewResult.changes.length} onClick={()=>setPreviewPage(previewPage+1)}>Siguientes</button></nav>}<p className="text-sm leading-relaxed text-muted">Los registros que no aparecen en este archivo se conservan. Se creará un respaldo antes de aplicar los cambios. {previewResult.ignored>0?`${previewResult.ignored} filas sin cambios o ignoradas.`:''}</p><label className="flex min-h-12 items-start gap-3 rounded-xl border border-line p-4 text-sm text-ink"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--ui-brand)]" checked={confirmed} disabled={!previewResult.canApply || busy} onChange={e=>setConfirmed(e.target.checked)}/>Revisé los cambios y autorizo esta actualización.</label></> : <p className="text-muted">La revisión ya no está disponible. Vuelve atrás y revisa el archivo nuevamente.</p>}</div>}
      {step === 4 && <div className="space-y-5"><CheckCircleIcon className="h-10 w-10 text-brand"/>{summary}<p role="status" className="text-base leading-relaxed text-ink">{intent==='download'?'El archivo se entregó al navegador para su descarga. Revisa la carpeta Descargas antes de copiarlo a tu USB.':`${Math.max(0,(result?.applied || 0)-(result?.requests || 0))} registros actualizados. ${result?.requests || 0} solicitudes enviadas para revisión.`}</p>{intent==='update' && result?.backup && <p className="text-sm text-muted">Se creó un respaldo de seguridad antes de actualizar.</p>}{result?.credentials && result.credentials.length>0 && <details className="rounded-xl border border-line p-4"><summary className="cursor-pointer font-semibold text-ink">Accesos de los docentes creados · información privada</summary><p className="my-3 text-sm text-muted">Entrega cada acceso únicamente a su docente.</p>{result.credentials.map(c=><p key={c.username} className="break-all py-2 text-sm text-ink">Usuario: {c.username} · Clave temporal: {c.password}</p>)}</details>}</div>}
    </TransferFrame>}
    <details className="rounded-2xl border border-line bg-surface px-5 py-2 text-sm"><summary className="cursor-pointer py-3 font-semibold text-ink">Qué puedes descargar y actualizar</summary><div className="divide-y divide-line">{catalog?.kinds.map(k=><div key={k.kind} className="flex flex-wrap justify-between gap-2 py-3"><strong className="font-medium text-ink">{KIND_LABELS[k.kind]?.title || k.title || k.kind}</strong><span className="text-muted">Descargar: {k.canExport?'Sí':'No'} · Actualizar: {k.canImport?'Sí':'No disponible aquí'}</span></div>)}</div><p className="py-3 text-muted">Los permisos dependen de tu perfil y tus aulas asignadas. Los archivos se revisan antes de actualizar.</p></details>
  </div>;
};
export default ActualizarExportarDatos;
