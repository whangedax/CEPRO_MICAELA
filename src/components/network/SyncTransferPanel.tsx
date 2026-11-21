import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../api/client';
import { PublicUser, SyncPreviewReport, SyncTransferCapabilities, SyncTransferExportResponse, SyncTransferImportResponse, SyncTransferPreviewResponse, SyncTransferSummary } from '../../api/types';
import { useWorkspace } from '../../context/WorkspaceContext';
import { DownloadIcon, UploadIcon, LockIcon, UsbIcon, CheckCircleIcon, AlertCircleIcon } from '../ui/Icons';
import { TransferFrame, TransferIntentCard, transferFieldClass as field, transferPrimaryButtonClass as primary, transferSecondaryButtonClass as secondary } from './TransferFlow';

type Mode = 'send' | 'receive';
const SEND_STEPS = ['Información', 'Destinatario', 'Medio y clave', 'Listo para compartir'] as const;
const RECEIVE_STEPS = ['Código o archivo', 'Clave del envío', 'Revisar cambios', 'Resultado'] as const;
const ADMIN_DESTINATION = '__authorized_administration__'; // Local choice, never a user ID sent to the API.
const MODULE_TEXT: Record<string, { title: string; description: string }> = {
  all: { title: 'Toda la información permitida', description: 'Reúne las categorías que tu cuenta puede compartir en un solo envío.' },
  config: { title: 'Aulas y configuración', description: 'Comparte la organización académica que tu perfil tiene autorizada.' },
  enrollments: { title: 'Estudiantes y matrículas', description: 'Comparte el padrón y las matrículas que corresponden a tus aulas.' },
  grades: { title: 'Notas', description: 'Comparte las evaluaciones guardadas de tus aulas y unidades autorizadas.' },
  attendance: { title: 'Asistencia', description: 'Comparte los registros de asistencia guardados de tus aulas autorizadas.' },
};
const ENTITY_LABELS: Record<string, string> = {
  students: 'Estudiantes', enrollments: 'Matrículas', grades: 'Notas', attendance: 'Asistencia', groups: 'Aulas', programs: 'Programas de estudio', modules: 'Módulos', users: 'Cuentas', userDirectory: 'Directorio de personas', documentSettings: 'Configuración de documentos', documentSubmissions: 'Entregas de documentos', units: 'Unidades didácticas', studentRequests: 'Propuestas de estudiantes', accountRequests: 'Solicitudes de cuenta',
};
const ROLE_LABELS: Record<string, string> = { DOCENTE: 'Docente', SECRETARIA: 'Secretaría', DIRECTOR: 'Dirección' };
function moduleTitle(id: string, fallback: string) { return MODULE_TEXT[id]?.title || fallback; }
function errorText(error: unknown): string {
  if (error && typeof error === 'object') {
    const value = error as { error?: string; message?: string };
    return value.error || value.message || 'No se pudo completar la operación. Inténtalo nuevamente.';
  }
  return 'No se pudo completar la operación. Inténtalo nuevamente.';
}
function TransferSummary({ summary, report, classroom, received = false }: {
  summary: SyncTransferSummary; report?: SyncPreviewReport; classroom?: string; received?: boolean;
}) {
  const classrooms = report?.description?.groups?.map(group => group.name).join(', ');
  const facts = [
    ['Envía', summary.sender?.name || 'Personal de la institución'],
    ['Recibe', summary.recipient ? `${summary.recipient.name} · ${ROLE_LABELS[summary.recipient.role] || summary.recipient.role}` : 'Secretaría o Dirección autorizada'],
    ['Información', moduleTitle(summary.module, summary.label)],
    ['Aulas', classrooms || classroom || 'Las aulas autorizadas incluidas en el envío'],
  ];
  return <div className="space-y-5">
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">{facts.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 text-base font-semibold text-ink break-words">{value}</dd></div>)}</dl>
    {report && <>
      <div className="border-y border-line py-4"><h4 className="text-base font-semibold text-ink mb-3">{received ? 'Resultado de la recepción' : 'Qué cambiará al recibir'}</h4>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[
          ['Nuevos', report.recordsToAdd ?? report.newRecords ?? 0], ['Actualizados', report.recordsToUpdate ?? report.updates ?? 0], ['Sin cambios', report.duplicates ?? 0], ['Conflictos', report.conflicts ?? 0],
        ].map(([label, value]) => <div key={label}><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 text-2xl font-bold text-ink tabular-nums">{value}</dd></div>)}</dl>
      </div>
      {report.duplicatePackage && <p role="status" className="flex items-start gap-3 rounded-[10px] bg-brand-soft p-4 text-sm text-brand"><CheckCircleIcon className="h-5 w-5 shrink-0" />Este envío ya se recibió antes. No hay que importarlo otra vez.</p>}
      {Boolean(report.conflicts || report.pending) && <div className="flex items-start gap-3 rounded-[10px] border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200"><AlertCircleIcon className="h-5 w-5 shrink-0" /><div><p className="font-semibold">Hay diferencias que requieren revisión</p><p className="mt-1">{report.conflicts || 0} conflictos y {report.pending || 0} pendientes. Los conflictos quedan para Dirección; no se elige un valor automáticamente.</p></div></div>}
    </>}
    <details className="text-sm text-muted border-t border-line pt-3"><summary className="cursor-pointer min-h-[44px] py-2 font-medium text-ink">Ver contenido del envío · {summary.total} registros</summary>
      <dl className="grid gap-2 sm:grid-cols-2 mt-2">{Object.entries(summary.counts || {}).map(([name, count]) => <div className="flex items-start justify-between gap-3" key={name}><dt>{ENTITY_LABELS[name] || 'Otros registros autorizados'}</dt><dd className="font-semibold text-ink tabular-nums">{count}</dd></div>)}</dl>
      {summary.dependencies && Object.keys(summary.dependencies).length > 0 && <p className="mt-3">También incluye las referencias necesarias para reconocer las aulas y los estudiantes.</p>}
    </details>
  </div>;
}
interface Props { currentUser: PublicUser; onImported?: () => void; }
export function SyncTransferPanel(props: Props) {
  const { activeWorkspace } = useWorkspace();
  const contextKey = JSON.stringify([props.currentUser.id, props.currentUser.role, props.currentUser.version, activeWorkspace]);
  return <TransferForm key={contextKey} {...props} />;
}
function TransferForm({ onImported }: Props) {
  const { options, activeWorkspace } = useWorkspace();
  const [capabilities, setCapabilities] = useState<SyncTransferCapabilities | null>(null);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode | null>(null);
  const [step, setStep] = useState(1);
  const [moduleId, setModuleId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [groupId, setGroupId] = useState('');
  const [channel, setChannel] = useState<'WHATSAPP' | 'USB'>('WHATSAPP');
  const [sendKey, setSendKey] = useState('');
  const [receiveKey, setReceiveKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [source, setSource] = useState<'code' | 'file'>('code');
  const [codeInput, setCodeInput] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [exported, setExported] = useState<SyncTransferExportResponse | null>(null);
  const [preview, setPreview] = useState<SyncTransferPreviewResponse | null>(null);
  const [imported, setImported] = useState<SyncTransferImportResponse | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const sequence = useRef(0);
  const fileSequence = useRef(0);
  const mounted = useRef(true);
  const operationLock = useRef(false);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const entryHeadingRef = useRef<HTMLHeadingElement>(null);
  const hasEnteredFlow = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; sequence.current++; fileSequence.current++; };
  }, []);
  useEffect(() => {
    let live = true; setLoading(true); setError('');
    apiClient.getSyncTransferCapabilities().then(value => {
      if (!live) return;
      setCapabilities(value); setModuleId(value.modules.find(item => item.canExport)?.id || ''); setRecipient('');
    }).catch(value => { if (live) setError(errorText(value)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [reload]);
  useEffect(() => { if (error) alertRef.current?.focus({ preventScroll: true }); }, [error]);
  useEffect(() => {
    if (mode) hasEnteredFlow.current = true;
    else if (hasEnteredFlow.current) entryHeadingRef.current?.focus({ preventScroll: true });
  }, [mode]);
  const invalidate = () => {
    sequence.current++; setExported(null); setPreview(null); setImported(null); setConfirmed(false); setError(''); setStatus('');
  };
  const valid = (id: number) => mounted.current && sequence.current === id;
  const selectedModule = capabilities?.modules.find(item => item.id === moduleId);
  const canUseAdministrativeDestination = capabilities?.role === 'DOCENTE' && capabilities.recipients.length === 0;
  const usesAdministrativeDestination = canUseAdministrativeDestination && recipient === ADMIN_DESTINATION;
  const recipientIsValid = usesAdministrativeDestination || Boolean(capabilities?.recipients.some(item => item.id === recipient));
  const canReceive = Boolean(capabilities?.modules.some(item => item.canImport));
  const passphrase = mode === 'send' ? sendKey : receiveKey;
  const keyValid = !capabilities?.passphraseRequired || (passphrase.length >= 8 && passphrase.length <= 200);
  const receiveText = source === 'file' ? fileContent : codeInput;
  const selectedGroup = options?.groups.find(group => group.id === groupId);
  const selectedUnit = groupId && groupId === activeWorkspace?.groupId && activeWorkspace.mode === 'UNIT' ? activeWorkspace.unit : undefined;
  const classroom = selectedGroup ? `${selectedGroup.name}${selectedUnit ? ` · Unidad ${selectedUnit}` : ''}` : 'Todas las aulas autorizadas';
  const recipientName = usesAdministrativeDestination ? 'Secretaría o Dirección autorizada' : capabilities?.recipients.find(person => person.id === recipient)?.name;
  const sharedMessage = exported?.shareText || exported?.tokenText || '';
  const generate = async () => {
    if (!selectedModule?.canExport || !keyValid || !recipientIsValid || operationLock.current) return;
    invalidate(); const id = sequence.current; operationLock.current = true; setBusy(true);
    try {
      const result = await apiClient.exportSyncTransfer({ syncModule: moduleId, ...(usesAdministrativeDestination ? {} : { recipientUserId: recipient }), passphrase, channel, ...(groupId ? { groupId } : {}), ...(selectedUnit ? { unit: selectedUnit } : {}) });
      if (valid(id)) { setExported(result); setStep(4); }
    } catch (value) { if (valid(id)) setError(errorText(value)); }
    finally { operationLock.current = false; if (mounted.current) setBusy(false); }
  };
  const review = async () => {
    if (!canReceive || !keyValid || !receiveText.trim() || reading || operationLock.current) return;
    invalidate(); const id = sequence.current; operationLock.current = true; setBusy(true);
    try {
      const text = receiveText.trim();
      const payload = text.startsWith('{') ? { package: JSON.parse(text) as unknown, passphrase } : { tokenText: text, passphrase };
      const result = await apiClient.previewSyncTransfer(payload);
      if (valid(id)) { setPreview(result); setStep(3); }
    } catch (value) { if (valid(id)) setError(errorText(value)); }
    finally { operationLock.current = false; if (mounted.current) setBusy(false); }
  };
  const apply = async () => {
    if (!preview || !confirmed || !canReceive || preview.report.duplicatePackage || operationLock.current) return;
    const id = sequence.current, previewToken = preview.previewToken;
    operationLock.current = true; setBusy(true); setError('');
    try {
      const result = await apiClient.importSyncTransfer({ previewToken });
      if (valid(id)) { setImported(result); setPreview(null); setConfirmed(false); setStep(4); onImported?.(); }
    } catch (value) {
      if (valid(id)) { setError(errorText(value)); setPreview(null); setConfirmed(false); setStep(2); }
    } finally { operationLock.current = false; if (mounted.current) setBusy(false); }
  };
  const readFile = (file?: File) => {
    invalidate(); const readId = ++fileSequence.current; setFileContent(''); setFileName(''); setReading(false);
    if (!file) return;
    if (file.size > 28 * 1024 * 1024) { setError('El archivo supera 28 MiB. Pide un envío separado por categoría o aula.'); return; }
    setReading(true);
    file.text().then(text => { if (mounted.current && readId === fileSequence.current) { setFileContent(text); setFileName(file.name); } })
      .catch(value => { if (mounted.current && readId === fileSequence.current) setError(errorText(value)); })
      .finally(() => { if (mounted.current && readId === fileSequence.current) setReading(false); });
  };
  const copy = async () => {
    if (!exported?.tokenText || channel !== 'WHATSAPP') return;
    const id = sequence.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Portapapeles no disponible');
      await navigator.clipboard.writeText(sharedMessage);
      if (valid(id)) setStatus('Mensaje copiado. Pégalo en el chat de la persona que lo recibirá.');
    } catch {
      if (valid(id)) { codeRef.current?.focus(); codeRef.current?.select(); setStatus('El navegador no pudo copiarlo. Seleccionamos el mensaje: presiona Ctrl+C para copiarlo.'); }
    }
  };
  const download = () => {
    if (!exported) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(exported.package)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = exported.fileName || 'CEPRO_transferencia.cetpro';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Archivo preparado para descargar. Comprueba la descarga y llévalo en tu USB o adjúntalo al chat.');
  };
  const start = (nextMode: Mode) => { setError(''); setStatus(''); setShowKey(false); setStep(1); setMode(nextMode); };
  const back = () => { setError(''); setStatus(''); setShowKey(false); if (step === 1) setMode(null); else setStep(value => value - 1); };
  const newTransfer = () => {
    invalidate(); setSendKey(''); setReceiveKey(''); setCodeInput(''); setFileContent(''); setFileName('');
    setShowKey(false); setStep(1); setMode(null);
  };
  const backButton = <button type="button" data-testid="transfer-back" onClick={back} disabled={busy || reading} className={secondary}>{step === 1 ? 'Volver al inicio' : 'Volver'}</button>;
  const nextButton = (disabled: boolean) => <button type="button" data-testid="transfer-next" className={primary} disabled={disabled || busy || reading} onClick={() => { setError(''); setStatus(''); setStep(value => value + 1); }}>Continuar</button>;
  const keyInput = <div className="max-w-xl space-y-3">
    <label className="block text-base font-semibold text-ink" htmlFor="transfer-passphrase">{mode === 'send' ? 'Clave para este envío' : 'Clave que te compartieron'}</label>
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
      <input id="transfer-passphrase" type={showKey ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={200} disabled={busy} value={passphrase} className={`${field} min-w-0`} onChange={event => { invalidate(); if (mode === 'send') setSendKey(event.target.value); else setReceiveKey(event.target.value); }} aria-describedby="transfer-key-help" />
      <button type="button" disabled={busy} aria-pressed={showKey} onClick={() => setShowKey(value => !value)} className={`${secondary} shrink-0`}>{showKey ? 'Ocultar' : 'Mostrar'}</button>
    </div>
    <p id="transfer-key-help" className="text-sm text-muted leading-relaxed">{mode === 'send' ? 'Crea una clave de entre 8 y 200 caracteres y compártela por separado con el destinatario.' : 'Ingresa la misma clave del envío. Tiene entre 8 y 200 caracteres.'}</p>
  </div>;
  let footer: React.ReactNode;
  if (mode === 'send') {
    if (step === 1) footer = <>{backButton}{nextButton(!selectedModule?.canExport)}</>;
    if (step === 2) footer = <>{backButton}{nextButton(!recipientIsValid)}</>;
    if (step === 3) footer = <>{backButton}<button type="button" id="transfer-generate" disabled={busy || !keyValid || !recipientIsValid || !selectedModule?.canExport} onClick={generate} className={primary}>{busy ? 'Preparando envío…' : channel === 'USB' ? 'Preparar archivo' : 'Preparar mensaje'}</button></>;
    if (step === 4) footer = <>{backButton}<button type="button" onClick={newTransfer} className={secondary}>Volver al inicio</button></>;
  } else if (mode === 'receive') {
    if (step === 1) footer = <>{backButton}{nextButton(!receiveText.trim() || !canReceive)}</>;
    if (step === 2) footer = <>{backButton}<button type="button" id="transfer-review" disabled={busy || !keyValid || !receiveText.trim() || !canReceive} onClick={review} className={primary}>{busy ? 'Revisando envío…' : 'Revisar los cambios'}</button></>;
    if (step === 3) footer = <>{backButton}{preview?.report.duplicatePackage ? <button type="button" className={primary} onClick={() => { setImported({ report: preview.report, summary: preview.summary }); setStep(4); }}>Terminar revisión</button> : <button type="button" id="transfer-confirm" className={primary} disabled={!preview || !confirmed || busy} onClick={apply}>{busy ? 'Recibiendo información…' : 'Confirmar recepción'}</button>}</>;
    if (step === 4) footer = <button type="button" onClick={newTransfer} className={primary}>Volver al inicio</button>;
  }
  const sendTitles = ['¿Qué información vas a enviar?', '¿Quién la recibirá?', '¿Cómo vas a compartirla?', 'Tu envío está listo'];
  const receiveTitles = ['¿Qué te compartieron?', 'Ingresa la clave del envío', 'Revisa antes de recibir', imported?.report.duplicatePackage ? 'Este envío ya estaba recibido' : 'Información recibida'];
  const sendDescriptions = ['Elige una categoría. Solo se incluirá la información permitida para tu cuenta.', 'Elige una persona y, si lo necesitas, limita el envío a un aula.', 'Elige el medio y protege el envío con una clave.', 'Comparte el mensaje o el archivo y envía la clave por separado.'];
  const receiveDescriptions = ['Pega el mensaje de WhatsApp o selecciona el archivo que recibiste.', 'Todavía no se aplicará ningún cambio. Primero revisaremos su contenido.', 'Comprueba el origen, destinatario y los cambios que se proponen.', 'Revisa lo que se procesó y si quedaron diferencias pendientes.'];
  return <section aria-labelledby={!mode ? 'transfer-entry-title' : undefined} className="space-y-5">
    {loading ? <p role="status" className="p-5 rounded-2xl bg-surface border border-line text-base text-muted">Consultando qué puede compartir tu cuenta…</p> : !capabilities ? <div className="space-y-4"><p className="text-base text-ink">No pudimos consultar las opciones de tu cuenta.</p><button type="button" className={secondary} onClick={() => setReload(value => value + 1)}>Reintentar consulta</button></div> : <>
      {!mode ? <div className="space-y-5">
        <header><h2 ref={entryHeadingRef} id="transfer-entry-title" tabIndex={-1} className="text-xl font-bold text-ink focus-visible:outline-2 focus-visible:outline-brand">¿Qué necesitas hacer?</h2><p className="mt-2 text-base text-muted">Te guiaremos paso a paso. Revisa la información antes de compartirla o recibirla.</p></header>
        <div className="grid sm:grid-cols-2 gap-4">
          <TransferIntentCard id="transfer-intent-send" title="Enviar mi información" description="Prepara notas, asistencia u otra información permitida para otra cuenta." icon={<UploadIcon className="h-6 w-6" />} disabled={!capabilities.modules.some(item => item.canExport)} onClick={() => start('send')} />
          <TransferIntentCard id="transfer-intent-receive" title="Recibir información" description="Revisa un código o archivo recibido y confirma los cambios que correspondan." icon={<DownloadIcon className="h-6 w-6" />} disabled={!canReceive} onClick={() => start('receive')} />
        </div>
      </div> : <TransferFrame key={mode} id={`transfer-${mode}`} current={step} steps={mode === 'send' ? SEND_STEPS : RECEIVE_STEPS} title={(mode === 'send' ? sendTitles : receiveTitles)[step - 1]} description={(mode === 'send' ? sendDescriptions : receiveDescriptions)[step - 1]} footer={footer}>
        {mode === 'send' && step === 1 && <fieldset id="transfer-module" className="min-w-0 space-y-4"><legend className="sr-only">Información que deseas enviar</legend><div className="grid sm:grid-cols-2 gap-3">{capabilities.modules.filter(item => item.canExport).map(item => <TransferIntentCard id={`transfer-module-${item.id}`} key={item.id} title={moduleTitle(item.id, item.label)} description={MODULE_TEXT[item.id]?.description || item.description} selected={moduleId === item.id} onClick={() => { invalidate(); setModuleId(item.id); }} />)}</div></fieldset>}
        {mode === 'send' && step === 2 && <div className="space-y-6 max-w-2xl">
          <div className="space-y-2"><label className="block text-base font-semibold text-ink" htmlFor="transfer-recipient">Persona que recibirá el envío</label><select id="transfer-recipient" className={field} value={recipient} onChange={event => { invalidate(); setRecipient(event.target.value); }}><option value="">Elige un destinatario</option>{canUseAdministrativeDestination && <option value={ADMIN_DESTINATION}>Secretaría o Dirección autorizada</option>}{capabilities.recipients.map(person => <option key={person.id} value={person.id}>{person.name} · {ROLE_LABELS[person.role] || person.role}</option>)}</select>{canUseAdministrativeDestination && <p className="text-sm text-muted">Tu equipo aún no tiene un directorio de autoridades. Puedes preparar un envío para Secretaría o Dirección autorizada; se verificarán los permisos al recibirlo.</p>}{!capabilities.recipients.length && !canUseAdministrativeDestination && <p className="text-sm text-muted">No hay destinatarios disponibles. Comprueba el directorio o la vinculación del equipo en las opciones de ayuda.</p>}</div>
          <div className="space-y-2"><label className="block text-base font-semibold text-ink" htmlFor="transfer-group">Aulas que incluirás</label><select id="transfer-group" className={field} value={groupId} onChange={event => { invalidate(); setGroupId(event.target.value); }}><option value="">Todas mis aulas autorizadas</option>{options?.groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select><p className="text-sm text-muted">El envío siempre respeta las asignaciones de tu cuenta.{selectedUnit ? ` Se incluirá la unidad activa ${selectedUnit}.` : ''}</p></div>
        </div>}
        {mode === 'send' && step === 3 && <div className="space-y-6">
          <p className="text-sm text-muted border-l-2 border-brand pl-3"><strong className="text-ink">{selectedModule ? moduleTitle(selectedModule.id, selectedModule.label) : 'Información seleccionada'}</strong> para <strong className="text-ink">{recipientName}</strong><span className="block mt-1">{classroom}</span></p>
          <div className="max-w-xl space-y-2"><label className="block text-base font-semibold text-ink" htmlFor="transfer-channel">Medio para compartir</label><select id="transfer-channel" className={field} value={channel} disabled={busy} onChange={event => { invalidate(); setChannel(event.target.value as 'WHATSAPP' | 'USB'); }}><option value="WHATSAPP">WhatsApp · mensaje o archivo adjunto</option><option value="USB">Memoria USB · archivo .cetpro</option></select><p className="text-sm text-muted">{channel === 'USB' ? 'Descargarás un archivo para llevarlo al otro equipo.' : 'Copiarás un mensaje listo para pegar en el chat. Si es grande, compartirás un archivo adjunto.'}</p></div>
          {keyInput}
          <p className="flex items-start gap-2 text-sm text-muted"><LockIcon className="w-4 h-4 mt-0.5 shrink-0" />Solo se preparará el envío. Tú eliges cuándo y con quién compartirlo.</p>
        </div>}
        {mode === 'send' && step === 4 && exported && <div className="space-y-6">
          <TransferSummary summary={exported.summary} classroom={classroom} />
          {channel === 'USB' ? <div className="rounded-xl border border-line bg-surface-alt p-5 space-y-3"><h4 className="text-base font-bold text-ink flex items-center gap-2"><UsbIcon className="w-5 h-5" />Llévalo en tu memoria USB</h4><p className="text-sm text-muted">Descarga el archivo y cópialo a tu memoria. La persona que lo reciba deberá seleccionar ese archivo e ingresar la clave.</p><button type="button" className={primary} onClick={download}>Descargar archivo .cetpro</button></div> : <div className="rounded-xl border border-line bg-surface-alt p-5 space-y-4"><h4 className="text-base font-bold text-ink">Comparte por WhatsApp</h4>{exported.tokenText ? <><p className="text-sm text-muted">El mensaje incluye el destinatario y la información del envío. Cópialo completo y pégalo en el chat.</p><label htmlFor="transfer-generated-code" className="sr-only">Mensaje completo para WhatsApp</label><textarea ref={codeRef} id="transfer-generated-code" readOnly value={sharedMessage} className={`${field} text-sm min-h-36 max-h-64 resize-y whitespace-pre-wrap`} /><div className="flex flex-wrap gap-3"><button type="button" className={primary} onClick={copy}>Copiar mensaje</button><button type="button" className={secondary} onClick={download}>Descargar archivo alternativo</button></div></> : <><p className="text-sm text-muted">Este envío es grande para un mensaje. Descarga el archivo y adjúntalo al chat de la persona que lo recibirá.</p><button type="button" className={primary} onClick={download}>Descargar archivo para WhatsApp</button></>}</div>}
          <p className="text-sm text-muted">Comparte la clave por separado. El destinatario revisará los cambios antes de recibirlos.</p>
        </div>}
        {mode === 'receive' && step === 1 && <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-3"><TransferIntentCard id="transfer-source-code" title="Tengo un mensaje de WhatsApp" description="Pega el mensaje completo, incluido el código que contiene." selected={source === 'code'} disabled={reading} onClick={() => { invalidate(); setSource('code'); }} /><TransferIntentCard id="transfer-source-file" title="Tengo un archivo" description="Elige el archivo .cetpro recibido por USB o como adjunto." selected={source === 'file'} disabled={reading} onClick={() => { invalidate(); setSource('file'); }} /></div>
          {source === 'code' ? <div className="space-y-2"><label className="block text-base font-semibold text-ink" htmlFor="transfer-code-input">Mensaje o código recibido</label><textarea id="transfer-code-input" className={`${field} min-h-36 text-sm`} value={codeInput} onChange={event => { invalidate(); setCodeInput(event.target.value); }} placeholder="Pega aquí el mensaje completo que te compartieron" /><p className="text-sm text-muted">Conserva el inicio y final del código. También puedes pegar un envío recibido antes: se reconocerá para evitar repetirlo.</p></div> : <div className="rounded-xl border border-dashed border-line bg-surface-alt p-5 space-y-3"><label className="block text-base font-semibold text-ink" htmlFor="transfer-file">Selecciona el archivo recibido</label><input id="transfer-file" type="file" accept=".cetpro,.json" disabled={reading} className={`${field} text-sm file:min-h-[44px] file:mr-3 file:border-0 file:rounded-[10px] file:bg-brand-soft file:text-brand file:px-4`} onChange={event => readFile(event.target.files?.[0])} />{fileName && <p className="text-sm text-ink break-words">Archivo seleccionado: <strong>{fileName}</strong></p>}<p className="text-sm text-muted">Archivo .cetpro, hasta 28 MiB. Las hojas Excel o CSV se trabajan en «Trabajar con archivos».</p></div>}
          {reading && <p role="status" className="text-sm text-muted">Leyendo el archivo…</p>}
        </div>}
        {mode === 'receive' && step === 2 && <div className="space-y-5"><p className="text-sm text-muted border-l-2 border-brand pl-3">{source === 'file' ? `Revisaremos el archivo ${fileName}.` : 'Revisaremos el mensaje que pegaste en el paso anterior.'}</p>{keyInput}<p className="text-sm text-muted">Al continuar se comprobará quién lo envió y qué cambios están permitidos. Aún no se importará información.</p></div>}
        {mode === 'receive' && step === 3 && preview && <div className="space-y-5"><TransferSummary summary={preview.summary} report={preview.report} />{!preview.report.duplicatePackage && <><p className="text-sm text-muted">Se agregará o actualizará la información autorizada. Los registros sin cambios se omiten y los conflictos quedan para revisión. La revisión vence en 15 minutos; si cambia la información, tendrás que revisarla otra vez.</p><label className="flex items-start gap-3 min-h-[44px] rounded-xl border border-line bg-surface-alt p-4 text-base text-ink"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--ui-brand)]" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} /><span>Revisé quién envía, quién recibe y los cambios. Confirmo recibir la información permitida.</span></label></>}</div>}
        {mode === 'receive' && step === 4 && imported && <div className="space-y-5"><div className="flex items-start gap-3 text-brand"><CheckCircleIcon className="h-7 w-7 shrink-0" /><p className="text-base font-semibold">{imported.report.duplicatePackage ? 'No se repitió la recepción ni se modificó la información.' : 'El envío se procesó. Puedes continuar con tu trabajo.'}</p></div><TransferSummary summary={imported.summary} report={imported.report} received /><p className="text-sm text-muted">{imported.report.conflicts || imported.report.pending ? 'Si quedaron diferencias, comunícalas a Dirección para su revisión.' : 'Los registros que ya estaban iguales se conservaron sin repetirlos.'}</p></div>}
        {error && <div ref={alertRef} tabIndex={-1} role="alert" className="flex items-start gap-3 rounded-[10px] border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-200 outline-none"><AlertCircleIcon className="w-5 h-5 shrink-0" /><p className="break-words">{error}</p></div>}
        {status && <p role="status" className="rounded-[10px] bg-brand-soft p-4 text-sm text-brand">{status}</p>}
      </TransferFrame>}
      <details className="border-t border-line pt-2 text-sm text-muted"><summary className="cursor-pointer min-h-[44px] py-3 font-medium text-ink">Ayuda para mi perfil: {ROLE_LABELS[capabilities.role] || capabilities.role}</summary><div className="space-y-3 pb-3 max-w-3xl"><p>Solo se comparte lo que tu cuenta tiene autorizado. Enviar un archivo o mensaje no aplica cambios en el otro equipo: la persona que lo recibe debe revisarlo primero.</p><ul className="space-y-2">{capabilities.modules.map(item => <li key={item.id}><strong className="font-semibold text-ink">{moduleTitle(item.id, item.label)}</strong>: {item.canExport ? 'puedes enviar' : 'no puedes enviar'}; {item.canImport ? 'puedes recibir cambios autorizados' : 'no puedes recibir'}.</li>)}</ul><p>{capabilities.importPolicy}</p><p>La revisión y resolución de conflictos de Dirección está en las opciones avanzadas de esta página.</p></div></details>
    </>}
    {error && !capabilities && <div ref={alertRef} role="alert" tabIndex={-1} className="text-sm text-red-800 dark:text-red-200">{error}</div>}
  </section>;
}
