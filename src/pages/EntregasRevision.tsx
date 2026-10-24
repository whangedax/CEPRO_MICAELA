/**
 * pages/EntregasRevision.tsx
 * 
 * Módulo de Entrega y Revisión de Documentos Académicos para CEPRO_MICAELA 2.0.
 * Reutiliza los contratos oficiales del backend de CEPRO_MICAELA:
 * - POST /api/document/submit (Entrega formal con preflight completo)
 * - POST /api/document/submission-pdf (Recuperación de la copia custodial exacta del PDF)
 * - POST /api/document/review (Revisión y dictamen: RECIBIDO, OBSERVADO, REVISADO)
 * - GET /api/dashboard (Consulta de entregas autorizadas según el alcance del usuario)
 * 
 * Roles y Permisos:
 * - DOCENTE: Prepara entregas en su alcance, valida preflight, visualiza PDF y consulta sus entregas.
 * - SECRETARIA: Bandeja de recepción de entregas, consulta de PDF, transiciones a RECIBIDO y OBSERVADO.
 * - DIRECTOR: Bandeja integral, revisión de PDF, transiciones a RECIBIDO, OBSERVADO y visado REVISADO.
 * 
 * Concurrencia y Seguridad:
 * - Control de concurrencia con rev (HTTP 409).
 * - Protección de cambios pendientes mediante PendingChangesContext.
 * - Operación 100% aislada en SQLite sintético local (dev-sandbox/data).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePendingChanges } from '../context/PendingChangesContext';
import apiClient from '../api/client';
import {
  DocumentSubmission,
  DocumentPreflightResponse,
  SubmissionStatus,
  ApiError,
} from '../api/types';
import { PdfViewer } from '../components/ui/PdfViewer';
import {
  DeliveriesIcon,
  DocumentIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  LockIcon,
  EyeIcon,
  SendIcon,
  ClockIcon,
  FilterIcon,
  SearchIcon,
} from '../components/ui/Icons';

export const EntregasRevision: React.FC = () => {
  const { user } = useAuth();
  const { activeWorkspace, dashboardData } = useWorkspace();
  const { registerPendingChanges, unregisterPendingChanges, requestSafeTransition } = usePendingChanges();

  // Rol del usuario actual
  const role = user?.role || 'DOCENTE';
  const isTeacher = role === 'DOCENTE';
  const isDirector = role === 'DIRECTOR';
  const isSecretaria = role === 'SECRETARIA';

  // Estados de datos
  const [submissions, setSubmissions] = useState<DocumentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pestañas para Docente: 'preparar' | 'historial'
  const [teacherTab, setTeacherTab] = useState<'preparar' | 'historial'>('preparar');

  // Filtros para Dirección / Secretaría
  const [statusFilter, setStatusFilter] = useState<'TODOS' | SubmissionStatus>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Estado de preparación de entrega (Docente)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('TMPL-04');
  const [preflightData, setPreflightData] = useState<DocumentPreflightResponse | null>(null);
  const [isLoadingPreflight, setIsLoadingPreflight] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Visor PDF
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>('');
  const [pdfFilename, setPdfFilename] = useState<string>('');
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [showPdfViewer, setShowPdfViewer] = useState<boolean>(false);

  // Estado de revisión (Director / Secretaría)
  const [selectedSubmission, setSelectedSubmission] = useState<DocumentSubmission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'RECIBIDO' | 'OBSERVADO' | 'REVISADO'>('RECIBIDO');
  const [reviewReason, setReviewReason] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  // Registro de cambios pendientes para el motivo de revisión
  useEffect(() => {
    const hasChanges = showReviewModal && reviewReason.trim().length > 0;
    registerPendingChanges({
      id: 'entregas-revision',
      hasChanges,
      message: 'Tiene comentarios u observaciones de revisión sin guardar. ¿Desea descartarlos?',
      onDiscard: () => {
        setReviewReason('');
        setShowReviewModal(false);
        setSelectedSubmission(null);
      },
    });
    return () => {
      unregisterPendingChanges('entregas-revision');
    };
  }, [showReviewModal, reviewReason, registerPendingChanges, unregisterPendingChanges]);

  // Catálogo de plantillas oficiales
  const catalogTemplates = useMemo(() => [
    { id: 'TMPL-01', title: 'Nómina de Matrícula Modular', kind: 'MODULE', desc: 'Registro general de estudiantes matriculados en el módulo.' },
    { id: 'TMPL-02', title: 'Ficha de Matrícula Individual', kind: 'MODULE', desc: 'Ficha individual con datos del estudiante y condiciones.' },
    { id: 'TMPL-03', title: 'Registro Oficial de Matrícula (Padrón)', kind: 'MODULE', desc: 'Padrón oficial MINEDU con consolidado de postulantes.' },
    { id: 'TMPL-04', title: 'Carpeta Pedagógica e Información del Módulo', kind: 'MODULE', desc: 'Organización general, plan de estudios y horas formativas.' },
    { id: 'TMPL-05', title: 'Registro de Asistencia — Unidad Didáctica 1', kind: 'UNIT', unit: 'UD1', desc: 'Control de sesiones, asistencia y justificaciones de la UD1.' },
    { id: 'TMPL-06', title: 'Registro de Asistencia — Unidad Didáctica 2', kind: 'UNIT', unit: 'UD2', desc: 'Control de sesiones, asistencia y justificaciones de la UD2.' },
    { id: 'TMPL-07', title: 'Registro de Asistencia — Unidad Didáctica 3', kind: 'UNIT', unit: 'UD3', desc: 'Control de sesiones, asistencia y justificaciones de la UD3.' },
    { id: 'TMPL-08', title: 'Registro de Asistencia — Unidad Didáctica 4', kind: 'UNIT', unit: 'UD4', desc: 'Control de sesiones, asistencia y justificaciones de la UD4.' },
    { id: 'TMPL-09', title: 'Registro de Asistencia — Unidad Didáctica 5', kind: 'UNIT', unit: 'UD5', desc: 'Control de sesiones, asistencia y justificaciones de la UD5.' },
    { id: 'TMPL-10', title: 'Registro de Asistencia — Unidad Didáctica 6', kind: 'UNIT', unit: 'UD6', desc: 'Control de sesiones, asistencia y justificaciones de la UD6.' },
    { id: 'TMPL-11', title: 'Registro de Evaluación — Unidad Didáctica 1', kind: 'UNIT', unit: 'UD1', desc: 'Calificaciones de 5 indicadores de logro y resultado de UD1.' },
    { id: 'TMPL-12', title: 'Registro de Evaluación — Unidad Didáctica 2', kind: 'UNIT', unit: 'UD2', desc: 'Calificaciones de 5 indicadores de logro y resultado de UD2.' },
    { id: 'TMPL-13', title: 'Registro de Evaluación — Unidad Didáctica 3', kind: 'UNIT', unit: 'UD3', desc: 'Calificaciones de 5 indicadores de logro y resultado de UD3.' },
    { id: 'TMPL-14', title: 'Registro de Evaluación — Unidad Didáctica 4', kind: 'UNIT', unit: 'UD4', desc: 'Calificaciones de 5 indicadores de logro y resultado de UD4.' },
    { id: 'TMPL-15', title: 'Registro de Evaluación — Unidad Didáctica 5', kind: 'UNIT', unit: 'UD5', desc: 'Calificaciones de 5 indicadores de logro y resultado de UD5.' },
    { id: 'TMPL-16', title: 'Registro de Evaluación — Unidad Didáctica 6', kind: 'UNIT', unit: 'UD6', desc: 'Calificaciones de 5 indicadores de logro y resultado de UD6.' },
    { id: 'TMPL-17', title: 'Registro de Evaluación — Unidad Didáctica 7', kind: 'UNIT', unit: 'UD7', desc: 'Calificaciones de 5 indicadores de logro y resultado de UD7.' },
    { id: 'TMPL-18', title: 'Ficha de Evaluación de Prácticas Pre-Profesionales (EFSRT)', kind: 'PRACTICE', desc: 'Evaluación formativa de las 9 capacidades en empresa/centro laboral.' },
    { id: 'TMPL-19', title: 'Acta Consolidada de Evaluación del Módulo', kind: 'MODULE', desc: 'Acta oficial final con resultados de todas las unidades y EFSRT.' },
    { id: 'TMPL-20', title: 'Certificado Modular Oficial', kind: 'MODULE', desc: 'Certificado de egreso emitido con código de registro MINEDU.' },
    { id: 'TMPL-21', title: 'Título Técnico Institucional', kind: 'MODULE', desc: 'Título oficial registrado en actas institucionales.' },
  ], []);

  // Plantillas autorizadas para el docente en su espacio activo
  const authorizedTemplates = useMemo(() => {
    if (!isTeacher) return catalogTemplates;
    const available = dashboardData?.templates || [];
    return catalogTemplates.filter(t => available.includes(t.id));
  }, [isTeacher, catalogTemplates, dashboardData?.templates]);

  // Cargar lista de entregas desde dashboard
  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Para Director y Secretaría se puede consultar con overview si no hay grupo fijo
      const overview = !isTeacher;
      const data = await apiClient.getDashboard(undefined, overview);
      setSubmissions(data.submissions || []);
    } catch (err: unknown) {
      const e = err as ApiError;
      setErrorMsg(e.error || 'No se pudieron recuperar las entregas registradas.');
    } finally {
      setIsLoading(false);
    }
  }, [isTeacher]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // Cuando cambia la plantilla seleccionada en docente, cargar Preflight
  const loadPreflight = useCallback(async (templateId: string) => {
    if (!activeWorkspace?.groupId) return;
    setIsLoadingPreflight(true);
    setPreflightData(null);
    setErrorMsg(null);
    try {
      const res = await apiClient.getDocumentPreflight({
        groupId: activeWorkspace.groupId,
        templateId,
        unit: activeWorkspace.unit || undefined,
      });
      setPreflightData(res);
    } catch (err: unknown) {
      const e = err as ApiError;
      setErrorMsg(e.error || 'Error al validar el Preflight de la plantilla.');
    } finally {
      setIsLoadingPreflight(false);
    }
  }, [activeWorkspace?.groupId, activeWorkspace?.unit]);

  useEffect(() => {
    if (isTeacher && activeWorkspace?.groupId) {
      const defaultTmpl = authorizedTemplates[0]?.id || 'TMPL-05';
      setSelectedTemplateId(defaultTmpl);
      loadPreflight(defaultTmpl);
    }
  }, [isTeacher, activeWorkspace?.groupId, authorizedTemplates, loadPreflight]);

  const handleSelectTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    loadPreflight(tmplId);
  };

  // Previsualizar PDF oficial (Docente antes de entregar)
  const handlePreviewOfficialPdf = async () => {
    if (!activeWorkspace?.groupId || !preflightData) return;
    setIsLoadingPdf(true);
    try {
      const blob = await apiClient.getDocumentPdf({
        groupId: activeWorkspace.groupId,
        templateId: selectedTemplateId,
        unit: activeWorkspace.unit || undefined,
        fingerprint: preflightData.fingerprint,
        demoFill: false,
      });
      setPdfBlob(blob);
      setPdfTitle(`Vista Previa Oficial: ${selectedTemplateId}`);
      setPdfFilename(`${selectedTemplateId}_OFICIAL.pdf`);
      setShowPdfViewer(true);
    } catch (err: unknown) {
      const e = err as ApiError;
      setErrorMsg(e.error || 'Error al generar la vista previa del PDF.');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Confirmar y entregar documento (Docente)
  const handleConfirmSubmit = async () => {
    if (!activeWorkspace?.groupId || !preflightData) return;
    if (!preflightData.preflight.complete) {
      setErrorMsg('No es posible entregar un documento con campos pendientes.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const submission = await apiClient.submitDocument({
        groupId: activeWorkspace.groupId,
        templateId: selectedTemplateId,
        unit: activeWorkspace.unit || undefined,
        fingerprint: preflightData.fingerprint,
      });
      setSuccessMsg(`Documento ${submission.templateId} registrado como prueba exitosamente con ID ${submission.id.slice(0, 8)}...`);
      setShowConfirmModal(false);
      setTeacherTab('historial');
      await loadSubmissions();
    } catch (err: unknown) {
      const e = err as ApiError;
      // Mitigación de reintentos inciertos: comprobar historial antes de declarar fallo
      try {
        const check = await apiClient.getDashboard();
        const existing = check.submissions?.find(
          s => s.templateId === selectedTemplateId && s.fingerprint === preflightData.fingerprint
        );
        if (existing) {
          setSuccessMsg(`La entrega ya figura registrada en el historial (ID: ${existing.id.slice(0, 8)}).`);
          setShowConfirmModal(false);
          setTeacherTab('historial');
          setSubmissions(check.submissions || []);
          return;
        }
      } catch {
        // Fallback si la verificación falla
      }

      if (e.status === 422 || e.status === 409 || e.status === 403) {
        setErrorMsg(e.error || 'Error de validación al registrar la entrega.');
      } else {
        setErrorMsg('No se pudo confirmar el resultado. Revise el historial antes de volver a intentar.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir PDF custodial entregado
  const handleViewSubmittedPdf = async (submission: DocumentSubmission) => {
    setIsLoadingPdf(true);
    setErrorMsg(null);
    try {
      const blob = await apiClient.getSubmissionPdf(submission.id);
      setPdfBlob(blob);
      setPdfTitle(`Copia Custodial: ${submission.templateId} (${submission.status})`);
      setPdfFilename(`${submission.templateId}_ENTREGA_${submission.id.slice(0, 8)}.pdf`);
      setShowPdfViewer(true);
    } catch (err: unknown) {
      const e = err as ApiError;
      setErrorMsg(e.error || 'No se pudo recuperar el PDF archivado de la entrega.');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Abrir modal de revisión (Director / Secretaría)
  const handleOpenReviewModal = (submission: DocumentSubmission) => {
    setSelectedSubmission(submission);
    setReviewStatus(submission.status === 'REVISADO' ? 'REVISADO' : submission.status === 'OBSERVADO' ? 'OBSERVADO' : 'RECIBIDO');
    setReviewReason(submission.reviewReason || '');
    setConflictError(null);
    setShowReviewModal(true);
  };

  // Confirmar decisión de revisión (Director / Secretaría)
  const handleSubmitReview = async () => {
    if (!selectedSubmission) return;
    if (!reviewReason.trim()) {
      setErrorMsg('Debe ingresar un motivo o fundamentación para la decisión.');
      return;
    }
    if (reviewStatus === 'REVISADO' && !isDirector) {
      setErrorMsg('Solo el rol DIRECTOR cuenta con autorización para emitir dictamen REVISADO.');
      return;
    }

    setIsSubmittingReview(true);
    setErrorMsg(null);
    setConflictError(null);
    try {
      const updated = await apiClient.reviewDocument({
        id: selectedSubmission.id,
        status: reviewStatus,
        reason: reviewReason.trim(),
        rev: selectedSubmission.rev,
      });
      setSuccessMsg(`Entrega actualizada a estado "${updated.status}" correctamente.`);
      setShowReviewModal(false);
      setSelectedSubmission(null);
      setReviewReason('');
      await loadSubmissions();
    } catch (err: unknown) {
      const e = err as ApiError;
      if (e.status === 409) {
        setConflictError('Conflicto de concurrencia: El documento fue modificado en otra ventana. Recargue la lista antes de continuar.');
      } else {
        setErrorMsg(e.error || 'Error al registrar la revisión.');
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Filtrado de entregas en bandeja de Dirección / Secretaría
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      const matchStatus = statusFilter === 'TODOS' || s.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        s.templateId.toLowerCase().includes(q) ||
        s.authorName.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.unit && s.unit.toLowerCase().includes(q));
      return matchStatus && matchQuery;
    });
  }, [submissions, statusFilter, searchQuery]);

  // Contadores para métricas de Dirección / Secretaría
  const metrics = useMemo(() => {
    return {
      total: submissions.length,
      entregado: submissions.filter(s => s.status === 'ENTREGADO').length,
      recibido: submissions.filter(s => s.status === 'RECIBIDO').length,
      observado: submissions.filter(s => s.status === 'OBSERVADO').length,
      revisado: submissions.filter(s => s.status === 'REVISADO').length,
    };
  }, [submissions]);

  // Insignia de estado documental
  const renderStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case 'ENTREGADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <ClockIcon className="w-3.5 h-3.5 text-amber-600" />
            Entregado · Pendiente
          </span>
        );
      case 'RECIBIDO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
            <CheckCircleIcon className="w-3.5 h-3.5 text-sky-600" />
            Recibido Conforme
          </span>
        );
      case 'OBSERVADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertCircleIcon className="w-3.5 h-3.5 text-rose-600" />
            Observado
          </span>
        );
      case 'REVISADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
            Revisado Oficial
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner de Entorno de Pruebas Institucional */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <DeliveriesIcon className="w-5 h-5 text-amber-800" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-wider uppercase text-amber-800">
              ENTORNO DE PRUEBAS LOCAL · OPERACIÓN SIMULADA EN SQLITE
            </div>
            <div className="text-xs text-amber-900/80">
              Las entregas y dictámenes operan sobre registros sintéticos en <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">dev-sandbox/data</code> sin validez institucional externa.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/80 border border-amber-300 text-amber-900 shadow-sm">
            Rol Activo: {role}
          </span>
        </div>
      </div>

      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isTeacher ? 'Entrega de Documentos Académicos' : 'Bandeja de Entrega y Revisión'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#13594A]/10 text-[#13594A]">
              Google Stitch 2.0
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isTeacher
              ? 'Verifique los requisitos del Preflight antes de registrar la entrega formal de sus formatos ante Secretaría y Dirección.'
              : 'Recepción, inspección y dictamen de documentos emitidos por los docentes institucionales.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => loadSubmissions()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm disabled:opacity-60"
            title="Actualizar bandeja de entregas"
          >
            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* Notificaciones */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-600 hover:text-rose-800 text-xs font-bold shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* =========================================================================
          VISTA DEL DOCENTE
          ========================================================================= */}
      {isTeacher && (
        <div className="space-y-6">
          {/* Barra de pestañas para docente */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setTeacherTab('preparar')}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
                teacherTab === 'preparar'
                  ? 'border-[#13594A] text-[#13594A]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              1. Preparar y Entregar Documento
            </button>
            <button
              onClick={() => setTeacherTab('historial')}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                teacherTab === 'historial'
                  ? 'border-[#13594A] text-[#13594A]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>2. Historial de Mis Entregas</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-semibold">
                {submissions.length}
              </span>
            </button>
          </div>

          {teacherTab === 'preparar' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Columna Izquierda: Selección de Plantilla */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                    <span>{activeWorkspace?.groupId ? 'Formatos Disponibles en Aula' : 'Catálogo Informativo'}</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      {activeWorkspace?.groupId ? `${authorizedTemplates.length} formatos de aula` : 'Catálogo de referencia'}
                    </span>
                  </h3>

                  {!activeWorkspace?.groupId && (
                    <div className="mb-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircleIcon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <p>
                        Seleccione un aula para consultar los formatos disponibles en su contexto académico.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {authorizedTemplates.map(tmpl => {
                      const isSelected = selectedTemplateId === tmpl.id;
                      return (
                        <div
                          key={tmpl.id}
                          onClick={() => handleSelectTemplate(tmpl.id)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-50/60 border-[#13594A] ring-1 ring-[#13594A] shadow-sm'
                              : 'bg-slate-50/50 border-slate-200/70 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{tmpl.id}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                              {tmpl.kind}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800 mt-1">{tmpl.title}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{tmpl.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tarjeta de ayuda a Configuración Documental */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <DocumentIcon className="w-4 h-4 text-[#13594A]" />
                    ¿Faltan datos en su documento?
                  </div>
                  <p>
                    Si el informe Preflight reporta parámetros faltantes, diríjase a{' '}
                    <a href="#/configuracion-documental" className="text-[#13594A] font-bold underline">
                      Configuración Documental
                    </a>{' '}
                    para registrar capacidades, competencias o los 5 indicadores de logro.
                  </p>
                </div>
              </div>

              {/* Columna Derecha: Estado Preflight y Acciones de Entrega */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                  {/* Encabezado del Documento Seleccionado */}
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="text-xs font-bold text-[#13594A] uppercase tracking-wider">
                        {selectedTemplateId} · Verificación Preflight
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                        {catalogTemplates.find(t => t.id === selectedTemplateId)?.title}
                      </h2>
                      <div className="text-xs text-slate-500 mt-1">
                        Docente: <strong className="text-slate-700">{user?.name}</strong> | Aula:{' '}
                        <strong className="text-slate-700">{activeWorkspace?.groupId || 'Sin aula'}</strong>
                        {activeWorkspace?.unit && ` | Unidad: ${activeWorkspace.unit}`}
                      </div>
                    </div>

                    <div>
                      {isLoadingPreflight ? (
                        <span className="text-xs text-slate-400">Validando...</span>
                      ) : !activeWorkspace?.groupId ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                          <AlertCircleIcon className="w-4 h-4 text-slate-500" />
                          Preflight pendiente: seleccione un aula
                        </span>
                      ) : preflightData?.preflight.complete ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                          Preflight Completo
                        </span>
                      ) : preflightData ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          <AlertCircleIcon className="w-4 h-4 text-amber-600" />
                          Incompleto ({preflightData.preflight.missing.length || 0} pendientes)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                          <AlertCircleIcon className="w-4 h-4 text-slate-500" />
                          Preflight pendiente: seleccione un aula
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Checklist Preflight */}
                  {isLoadingPreflight ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      <div className="w-8 h-8 border-3 border-[#13594A]/20 border-t-[#13594A] rounded-full animate-spin mx-auto mb-2" />
                      Evaluando parámetros institucionales en SQLite...
                    </div>
                  ) : preflightData ? (
                    <div className="space-y-4">
                      {/* Progreso */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                          <span className="font-semibold">Requisitos Cumplidos</span>
                          <span className="font-bold">
                            {preflightData.preflight.filled} de {preflightData.preflight.total} campos (
                            {Math.round((preflightData.preflight.filled / (preflightData.preflight.total || 1)) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              preflightData.preflight.complete ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{
                              width: `${(preflightData.preflight.filled / (preflightData.preflight.total || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Huella Digital */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Huella SHA-256 (Fingerprint):</span>
                        <code className="font-mono text-[#13594A] font-bold text-[11px]">
                          {preflightData.fingerprint.slice(0, 16)}...
                        </code>
                      </div>

                      {/* Campos Faltantes si no está completo */}
                      {!preflightData.preflight.complete && (
                        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
                          <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                            <AlertCircleIcon className="w-4 h-4 text-rose-600" />
                            Campos Pendientes para Emisión Oficial ({preflightData.preflight.missing.length})
                          </div>
                          <p className="text-[11px] text-rose-700 leading-relaxed">
                            No es posible entregar oficialmente el documento mientras existan datos incompletos.
                            Complete la información requerida antes de presentarlo:
                          </p>
                          <ul className="text-xs text-rose-900 space-y-1 list-disc pl-5 pt-1">
                            {preflightData.preflight.missing.map(m => (
                              <li key={m.key}>
                                <strong className="font-semibold">{m.key}</strong> — {m.source}
                              </li>
                            ))}
                          </ul>
                          <div className="pt-2">
                            <a
                              href="#/configuracion-documental"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#13594A] bg-white px-3 py-1.5 rounded-xl border border-emerald-300 hover:bg-emerald-50 transition-all shadow-sm"
                            >
                              Ir a Configuración Documental
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Acciones del Docente */}
                      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={handlePreviewOfficialPdf}
                          disabled={isLoadingPdf}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-60"
                        >
                          <EyeIcon className="w-4 h-4 text-slate-500" />
                          <span>{isLoadingPdf ? 'Generando PDF...' : 'Previsualizar PDF'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowConfirmModal(true)}
                          disabled={!preflightData.preflight.complete || isSubmitting}
                          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                            preflightData.preflight.complete
                              ? 'bg-[#13594A] text-white hover:bg-[#0D3E34]'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                          }`}
                          title={
                            preflightData.preflight.complete
                              ? 'Registrar entrega de prueba en el entorno sandbox'
                              : 'Bloqueado: Existen campos pendientes en el Preflight'
                          }
                        >
                          <SendIcon className="w-4 h-4" />
                          <span>{isSubmitting ? 'Registrando...' : 'Registrar entrega de prueba'}</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            /* Historial de Entregas del Docente */
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Mis Entregas Registradas</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Historial de documentos presentados formalmente ante Secretaría y Dirección.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                  {submissions.length} entregas
                </span>
              </div>

              {submissions.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <DeliveriesIcon className="w-6 h-6 text-slate-400" />
                  </div>
                  <strong className="text-slate-800 text-sm block mb-1">Aún no tiene entregas registradas</strong>
                  <span>Utilice la pestaña "Preparar y Entregar Documento" para presentar su primer formato.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {submissions.map(s => (
                    <div key={s.id} className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-[#13594A] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {s.templateId}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {catalogTemplates.find(t => t.id === s.templateId)?.title || s.templateId}
                          </span>
                          {renderStatusBadge(s.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>Fecha: {new Date(s.createdAt).toLocaleString('es-PE')}</span>
                          {s.unit && <span>Unidad: <strong className="text-slate-700">{s.unit}</strong></span>}
                          <span>ID: <code className="font-mono text-[11px]">{s.id.slice(0, 8)}</code></span>
                          <span>Hash PDF: <code className="font-mono text-[11px]">{s.pdfHash.slice(0, 10)}...</code></span>
                        </div>

                        {s.reviewReason && (
                          <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                            <strong className="text-slate-900">Dictamen institucional:</strong> {s.reviewReason}
                            {s.reviewedAt && (
                              <span className="text-[11px] text-slate-400 ml-2">
                                ({new Date(s.reviewedAt).toLocaleString('es-PE')})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          onClick={() => handleViewSubmittedPdf(s)}
                          disabled={isLoadingPdf}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                        >
                          <EyeIcon className="w-4 h-4 text-slate-500" />
                          <span>Ver PDF Custodial</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VISTA DE DIRECCIÓN Y SECRETARÍA
          ========================================================================= */}
      {(isDirector || isSecretaria) && (
        <div className="space-y-6">
          {/* Tarjetas de Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div
              onClick={() => setStatusFilter('TODOS')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === 'TODOS'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-[11px] uppercase font-bold tracking-wider opacity-80">Total Entregas</div>
              <div className="text-2xl font-black mt-1">{metrics.total}</div>
            </div>

            <div
              onClick={() => setStatusFilter('ENTREGADO')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === 'ENTREGADO'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-[11px] uppercase font-bold tracking-wider opacity-80">Por Revisar</div>
              <div className="text-2xl font-black mt-1 text-amber-600 group-hover:text-amber-700">
                {metrics.entregado}
              </div>
            </div>

            <div
              onClick={() => setStatusFilter('RECIBIDO')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === 'RECIBIDO'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-[11px] uppercase font-bold tracking-wider opacity-80">Recibidos</div>
              <div className="text-2xl font-black mt-1 text-sky-600">{metrics.recibido}</div>
            </div>

            <div
              onClick={() => setStatusFilter('OBSERVADO')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === 'OBSERVADO'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-[11px] uppercase font-bold tracking-wider opacity-80">Observados</div>
              <div className="text-2xl font-black mt-1 text-rose-600">{metrics.observado}</div>
            </div>

            <div
              onClick={() => setStatusFilter('REVISADO')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === 'REVISADO'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-[11px] uppercase font-bold tracking-wider opacity-80">Aprobados</div>
              <div className="text-2xl font-black mt-1 text-emerald-700">{metrics.revisado}</div>
            </div>
          </div>

          {/* Filtros y Búsqueda */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="relative w-full sm:w-96">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por docente, plantilla o código..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]/20 focus:border-[#13594A]"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-auto">
              <FilterIcon className="w-4 h-4 text-slate-400" />
              <span>Filtro activo: <strong>{statusFilter}</strong></span>
              {statusFilter !== 'TODOS' && (
                <button
                  onClick={() => setStatusFilter('TODOS')}
                  className="text-[#13594A] font-bold underline ml-1"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Entregas */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Bandeja de Documentos Recibidos ({filteredSubmissions.length})
              </h3>
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                <DeliveriesIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>No se encontraron entregas que coincidan con los filtros aplicados.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60">
                      <th className="py-3 px-4">Documento</th>
                      <th className="py-3 px-4">Docente Remitente</th>
                      <th className="py-3 px-4">Aula / Unidad</th>
                      <th className="py-3 px-4">Fecha Entrega</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredSubmissions.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{s.templateId}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {catalogTemplates.find(t => t.id === s.templateId)?.title || 'Documento Académico'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {s.authorName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px]">{s.groupId.slice(0, 10)}</span>
                          {s.unit && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px]">
                              {s.unit}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(s.createdAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3.5 px-4">
                          {renderStatusBadge(s.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleViewSubmittedPdf(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all font-semibold text-xs"
                            title="Inspeccionar PDF custodial"
                          >
                            <EyeIcon className="w-3.5 h-3.5 text-slate-500" />
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={() => handleOpenReviewModal(s)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#13594A] text-white hover:bg-[#0D3E34] transition-all font-semibold text-xs shadow-sm"
                            title="Emitir dictamen de revisión"
                          >
                            <span>Revisar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE CONFIRMACIÓN DE ENTREGA (DOCENTE)
          ========================================================================= */}
      {showConfirmModal && preflightData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#13594A]">
                <SendIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirmar Presentación de Entrega</h3>
                <p className="text-xs text-slate-500">Trámite Documental Interno — CEPRO_MICAELA 2.0</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <p>
                Está a punto de registrar la entrega formal del documento con los parámetros actuales.
                El backend generará una <strong>copia custodial inmutable</strong> en el servidor SQLite local:
              </p>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                <div><strong>Plantilla:</strong> {selectedTemplateId} · {catalogTemplates.find(t => t.id === selectedTemplateId)?.title}</div>
                <div><strong>Aula:</strong> {activeWorkspace?.groupId}</div>
                {activeWorkspace?.unit && <div><strong>Unidad Didáctica:</strong> {activeWorkspace.unit}</div>}
                <div><strong>Docente Remitente:</strong> {user?.name}</div>
                <div><strong>Huella SHA-256:</strong> <code className="font-mono text-[#13594A]">{preflightData.fingerprint.slice(0, 20)}...</code></div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>Aviso de custodia:</strong> Una vez entregado, el PDF original no se modificará aunque los datos del aula cambien. Las decisiones posteriores (Recibido, Observado, Revisado) se registrarán sobre este documento.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#0D3E34] transition-all shadow-md active:scale-95 disabled:opacity-60"
              >
                <SendIcon className="w-4 h-4" />
                <span>{isSubmitting ? 'Registrando Entrega...' : 'Confirmar entrega de prueba'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE REVISIÓN Y DICTAMEN (DIRECCIÓN / SECRETARÍA)
          ========================================================================= */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-[#13594A] uppercase tracking-wider">
                  Revisión Institucional
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Dictamen para {selectedSubmission.templateId}
                </h3>
                <p className="text-xs text-slate-500">
                  Docente: {selectedSubmission.authorName} | Presentado:{' '}
                  {new Date(selectedSubmission.createdAt).toLocaleString('es-PE')}
                </p>
              </div>

              <button
                onClick={() => {
                  requestSafeTransition(() => {
                    setShowReviewModal(false);
                    setSelectedSubmission(null);
                  });
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {conflictError && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircleIcon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Conflicto de Concurrencia (HTTP 409):</span>
                  <p className="mt-0.5">{conflictError}</p>
                  <button
                    onClick={async () => {
                      await loadSubmissions();
                      setShowReviewModal(false);
                      setSelectedSubmission(null);
                    }}
                    className="mt-2 text-xs font-bold text-[#13594A] underline"
                  >
                    Recargar bandeja ahora
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Opciones de Estado */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Decisión / Estado Documental:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    onClick={() => setReviewStatus('RECIBIDO')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      reviewStatus === 'RECIBIDO'
                        ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-500 text-sky-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs">RECIBIDO</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">Mesa de partes / Conforme</div>
                  </div>

                  <div
                    onClick={() => setReviewStatus('OBSERVADO')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      reviewStatus === 'OBSERVADO'
                        ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500 text-rose-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs">OBSERVADO</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">Requiere correcciones</div>
                  </div>

                  <div
                    onClick={() => {
                      if (isDirector) setReviewStatus('REVISADO');
                    }}
                    className={`p-3 rounded-2xl border transition-all ${
                      !isDirector
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                        : reviewStatus === 'REVISADO'
                        ? 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600 text-emerald-950 font-bold cursor-pointer'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer'
                    }`}
                    title={!isDirector ? 'Exclusivo del rol DIRECTOR' : 'Aprobación oficial'}
                  >
                    <div className="text-xs flex items-center justify-between">
                      <span>REVISADO</span>
                      {!isDirector && <LockIcon className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">Aprobado por Dirección</div>
                  </div>
                </div>
              </div>

              {/* Motivo o Justificación */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo o Fundamentación del Dictamen <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={4}
                  value={reviewReason}
                  onChange={e => setReviewReason(e.target.value)}
                  placeholder="Describa el motivo de la recepción, observaciones técnicas o conformidad emitida..."
                  className="w-full text-xs p-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#13594A]/20 focus:border-[#13594A] bg-white resize-none"
                />
                <span className="text-[11px] text-slate-400">
                  Campo obligatorio requerido por el contrato oficial POST /api/document/review.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  requestSafeTransition(() => {
                    setShowReviewModal(false);
                    setSelectedSubmission(null);
                  });
                }}
                disabled={isSubmittingReview}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={isSubmittingReview || !reviewReason.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#0D3E34] transition-all shadow-md active:scale-95 disabled:opacity-60"
              >
                <span>{isSubmittingReview ? 'Guardando Decisión...' : 'Confirmar Decisión'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DEL VISOR PDF
          ========================================================================= */}
      {showPdfViewer && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col p-4 md:p-8 animate-fadeIn">
          <div className="bg-white rounded-3xl flex-1 flex flex-col overflow-hidden shadow-2xl border border-slate-300">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{pdfTitle}</h3>
                <p className="text-[11px] text-slate-500">{pdfFilename}</p>
              </div>
              <button
                onClick={() => setShowPdfViewer(false)}
                className="px-4 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-slate-700"
              >
                Cerrar Visor
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100">
              <PdfViewer
                blob={pdfBlob}
                title={pdfTitle}
                filename={pdfFilename}
                onClose={() => setShowPdfViewer(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntregasRevision;
