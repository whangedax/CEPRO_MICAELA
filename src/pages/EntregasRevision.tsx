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

import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePendingChanges } from '../context/PendingChangesContext';
import apiClient from '../api/client';
import { isInstitutional } from '../utils/appProfile';
import {
  DocumentSubmission,
  DocumentPreflightResponse,
  SubmissionStatus,
  ApiError,
} from '../api/types';
import { getVisibleTemplates } from '../utils/documentTemplates';
import { ActiveUnitContextBanner } from '../components/academic/ActiveUnitContextBanner';
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
  const { activeWorkspace, dashboardData, options } = useWorkspace();
  const { registerPendingChanges, unregisterPendingChanges, requestSafeTransition } = usePendingChanges();

  const getReadableGroupLabel = useCallback(
    (groupId?: string): string => {
      if (!groupId) return 'Sin aula seleccionada';
      const optGroup = options?.groups.find((g) => g.id === groupId);
      const dashGroup = dashboardData?.groups?.find((g) => g.id === groupId);
      const g = optGroup || dashGroup;
      if (!g) return groupId;

      const prog =
        options?.programs.find((p) => p.id === g.programId) ||
        dashboardData?.programs?.find((p) => p.id === g.programId);
      const mod =
        options?.modules.find((m) => m.id === g.moduleId) ||
        dashboardData?.modules?.find((m) => m.id === g.moduleId);

      const progName = prog?.nombre || (prog as { name?: string })?.name || '';
      const modName = mod?.nombre || (mod as { name?: string })?.name || '';
      const groupName = g.name || `Secc. ${g.section || 'A1'} (${g.turno || 'Mañana'})`;

      return [progName, modName, groupName].filter(Boolean).join(' · ') || groupName;
    },
    [options, dashboardData]
  );

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

  const confirmPanelRef = useRef<HTMLDivElement>(null);
  const reviewPanelRef = useRef<HTMLDivElement>(null);
  const pdfPanelRef = useRef<HTMLDivElement>(null);

  const activeModalType = showPdfViewer
    ? 'pdf'
    : showReviewModal && selectedSubmission
    ? 'review'
    : showConfirmModal && preflightData
    ? 'confirm'
    : null;

  useEffect(() => {
    if (!activeModalType) return;

    const panelEl =
      activeModalType === 'pdf'
        ? pdfPanelRef.current
        : activeModalType === 'review'
        ? reviewPanelRef.current
        : confirmPanelRef.current;

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      if (!panelEl) return;
      const firstFocusable = panelEl.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeModalType === 'pdf') {
          setShowPdfViewer(false);
        } else if (activeModalType === 'review') {
          requestSafeTransition(() => {
            setShowReviewModal(false);
            setSelectedSubmission(null);
          });
        } else {
          setShowConfirmModal(false);
        }
        return;
      }

      if (e.key === 'Tab' && panelEl) {
        const focusables = Array.from(
          panelEl.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!panelEl.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [activeModalType, requestSafeTransition]);

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

  // Plantillas autorizadas para el rol y contexto académico activo
  const authorizedTemplates = useMemo(() => {
    if (isTeacher) {
      const visible = getVisibleTemplates({
        role: 'DOCENTE',
        groupId: activeWorkspace?.groupId,
        unitCode: activeWorkspace?.unit,
        onlyCurrentUnit: Boolean(activeWorkspace?.unit),
      });
      const visibleIds = new Set(visible.map(v => v.id));
      return catalogTemplates.filter(t => visibleIds.has(t.id));
    }
    if (isSecretaria) {
      const visible = getVisibleTemplates({ role: 'SECRETARIA' });
      const visibleIds = new Set(visible.map(v => v.id));
      return catalogTemplates.filter(t => visibleIds.has(t.id));
    }
    return catalogTemplates;
  }, [isTeacher, isSecretaria, catalogTemplates, activeWorkspace?.groupId, activeWorkspace?.unit]);

  // Sincronizar plantilla seleccionada si queda fuera de las autorizadas
  useEffect(() => {
    if (authorizedTemplates.length > 0) {
      const exists = authorizedTemplates.some(t => t.id === selectedTemplateId);
      if (!exists) {
        setSelectedTemplateId(authorizedTemplates[0].id);
      }
    }
  }, [authorizedTemplates, selectedTemplateId]);

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
            <ClockIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Entregado · Pendiente
          </span>
        );
      case 'RECIBIDO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60">
            <CheckCircleIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            Recibido Conforme
          </span>
        );
      case 'OBSERVADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60">
            <AlertCircleIcon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Observado
          </span>
        );
      case 'REVISADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Revisado Oficial
          </span>
        );
      default:
        return <span className="text-xs text-muted">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner de Entorno de Pruebas Institucional (solo en desarrollo/QA) */}
      {!__IS_INSTITUTIONAL__ && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <DeliveriesIcon className="w-5 h-5 text-amber-800 dark:text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-wider uppercase text-amber-800 dark:text-amber-300">
                ENTORNO DE PRUEBAS LOCAL · OPERACIÓN SIMULADA EN SQLITE
              </div>
              <div className="text-xs text-amber-900/80 dark:text-amber-200/90">
                Las entregas y dictámenes operan sobre registros sintéticos en <code className="bg-amber-100 dark:bg-amber-500/20 px-1 py-0.5 rounded font-mono text-[11px] text-amber-900 dark:text-amber-200">dev-sandbox/data</code> sin validez institucional externa.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-surface border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 shadow-sm">
              Rol Activo: {role}
            </span>
          </div>
        </div>
      )}

      {/* Encabezado Principal */}
      <DashboardPhotoBand as="header" scene="supervision" contentClassName="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <h1 className="text-[24px] sm:text-[30px] leading-tight font-bold tracking-tight text-ink truncate">
              {isTeacher ? 'Entrega de Documentos Académicos' : 'Bandeja de Entrega y Revisión'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-soft text-brand border border-brand/20 shrink-0">
              Gestión Documental
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            {isTeacher
              ? 'Verifique los requisitos del Preflight antes de registrar la entrega formal de sus formatos ante Secretaría y Dirección.'
              : 'Recepción, inspección y dictamen de documentos emitidos por los docentes institucionales.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => loadSubmissions()}
            disabled={isLoading}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-[10px] bg-surface border border-line text-ink hover:bg-brand-soft hover:text-brand active:scale-95 transition-all shadow-[var(--ui-shadow)] disabled:opacity-60 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
            title="Actualizar bandeja de entregas"
          >
            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>
      </DashboardPhotoBand>

      {/* Contexto Académico de Unidad Activa y Conmutador Rápido */}
      <ActiveUnitContextBanner variant="compact" />

      {/* Notificaciones */}
      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-200 text-sm flex items-start justify-between gap-3 animate-fadeIn"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="min-w-0">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="min-h-[44px] px-3 rounded-[10px] text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-100 text-xs font-bold shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
          >
            Cerrar
          </button>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-200 text-sm flex items-start justify-between gap-3 animate-fadeIn"
        >
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="min-w-0">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="min-h-[44px] px-3 rounded-[10px] text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 text-xs font-bold shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
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
          <div className="flex border-b border-line gap-1">
            <button
              type="button"
              onClick={() => setTeacherTab('preparar')}
              className={`min-h-[44px] pb-3 pt-2 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand ${
                teacherTab === 'preparar'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              1. Preparar y Entregar Documento
            </button>
            <button
              type="button"
              onClick={() => setTeacherTab('historial')}
              className={`min-h-[44px] pb-3 pt-2 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand ${
                teacherTab === 'historial'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <span>2. Historial de Mis Entregas</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-surface-alt border border-line text-ink font-semibold tabular-nums">
                {submissions.length}
              </span>
            </button>
          </div>

          {teacherTab === 'preparar' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Columna Izquierda: Selección de Plantilla */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-surface p-5 rounded-2xl border border-line shadow-[var(--ui-shadow)]">
                  <h3 className="text-sm font-bold text-ink mb-3 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{activeWorkspace?.groupId ? 'Formatos Disponibles en Aula' : 'Selección de Aula Requerida'}</span>
                    <span className="text-[11px] font-normal text-muted tabular-nums shrink-0">
                      {activeWorkspace?.groupId ? `${authorizedTemplates.length} formatos pertinentes` : 'Espacio pendiente'}
                    </span>
                  </h3>

                  {!activeWorkspace?.groupId ? (
                    <div className="p-6 rounded-2xl bg-surface-alt border border-line text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center justify-center mx-auto">
                        <AlertCircleIcon className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-ink">
                        Aula no seleccionada
                      </h4>
                      <p className="text-[11px] text-muted leading-relaxed">
                        Para preparar y tramitar documentos oficiales, seleccione un aula y unidad didáctica activa desde la barra superior.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {authorizedTemplates.map(tmpl => {
                        const isSelected = selectedTemplateId === tmpl.id;
                        return (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => handleSelectTemplate(tmpl.id)}
                            className={`w-full text-left p-3.5 rounded-2xl border cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-brand ${
                              isSelected
                                ? 'bg-brand-soft border-brand ring-1 ring-brand shadow-sm'
                                : 'bg-surface-alt border-line hover:bg-surface hover:border-brand/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-ink tabular-nums">{tmpl.id}</span>
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface text-muted border border-line">
                                {tmpl.kind}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-ink mt-1">{tmpl.title}</div>
                            <div className="text-[11px] text-muted line-clamp-1 mt-0.5">{tmpl.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tarjeta de ayuda a Configuración Documental */}
                <div className="bg-surface-alt p-4 rounded-2xl border border-line text-xs text-muted space-y-2">
                  <div className="font-bold text-ink flex items-center gap-1.5">
                    <DocumentIcon className="w-4 h-4 text-brand shrink-0" />
                    <span>¿Faltan datos en su documento?</span>
                  </div>
                  <p>
                    Si el informe Preflight reporta parámetros faltantes, diríjase a{' '}
                    <a href="#/configuracion-documental" className="text-brand font-bold underline">
                      Configuración Documental
                    </a>{' '}
                    para registrar capacidades, competencias o los 5 indicadores de logro.
                  </p>
                </div>
              </div>

              {/* Columna Derecha: Estado Preflight y Acciones de Entrega */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-surface p-6 rounded-2xl border border-line shadow-[var(--ui-shadow)] space-y-6">
                  {/* Encabezado del Documento Seleccionado */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-line pb-4">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-brand uppercase tracking-wider tabular-nums">
                        {selectedTemplateId} · Verificación Preflight
                      </div>
                      <h2 className="text-lg font-bold text-ink mt-0.5">
                        {catalogTemplates.find(t => t.id === selectedTemplateId)?.title}
                      </h2>
                      <div className="text-xs text-muted mt-1">
                        Docente: <strong className="text-ink">{user?.name}</strong> | Aula:{' '}
                        <strong className="text-ink">{getReadableGroupLabel(activeWorkspace?.groupId)}</strong>
                        {activeWorkspace?.unit && ` | Unidad: ${activeWorkspace.unit}`}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isLoadingPreflight ? (
                        <span className="text-xs text-muted">Validando...</span>
                      ) : !activeWorkspace?.groupId ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-surface-alt text-muted border border-line">
                          <AlertCircleIcon className="w-4 h-4 text-muted" />
                          Preflight pendiente: seleccione un aula
                        </span>
                      ) : preflightData?.preflight.complete ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          Preflight Completo
                        </span>
                      ) : preflightData ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 tabular-nums">
                          <AlertCircleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          Incompleto ({preflightData.preflight.missing.length || 0} pendientes)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-surface-alt text-muted border border-line">
                          <AlertCircleIcon className="w-4 h-4 text-muted" />
                          Preflight pendiente: seleccione un aula
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Checklist Preflight */}
                  {isLoadingPreflight ? (
                    <div className="py-12 text-center text-muted text-xs">
                      <div className="w-8 h-8 border-3 border-brand/20 border-t-brand rounded-full animate-spin mx-auto mb-2" />
                      Evaluando parámetros institucionales en SQLite...
                    </div>
                  ) : preflightData ? (
                    <div className="space-y-4">
                      {/* Progreso */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                          <span className="font-semibold">Requisitos Cumplidos</span>
                          <span className="font-bold text-ink tabular-nums">
                            {preflightData.preflight.filled} de {preflightData.preflight.total} campos (
                            {Math.round((preflightData.preflight.filled / (preflightData.preflight.total || 1)) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-surface-alt h-2.5 rounded-full overflow-hidden border border-line">
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

                      {/* Huella Digital (Exclusiva de Dirección) */}
                      {user?.role === 'DIRECTOR' && (
                        <div className="p-3 bg-surface-alt rounded-2xl border border-line text-xs flex items-center justify-between gap-2">
                          <span className="text-muted font-medium">Huella SHA-256 (Fingerprint):</span>
                          <code className="font-mono text-brand font-bold text-[11px] tabular-nums">
                            {preflightData.fingerprint.slice(0, 16)}...
                          </code>
                        </div>
                      )}

                      {/* Campos Faltantes si no está completo */}
                      {!preflightData.preflight.complete && (
                        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2">
                          <div className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5 tabular-nums">
                            <AlertCircleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                            Campos Pendientes para Emisión Oficial ({preflightData.preflight.missing.length})
                          </div>
                          <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                            No es posible entregar oficialmente el documento mientras existan datos incompletos.
                            Complete la información requerida antes de presentarlo:
                          </p>
                          <ul className="text-xs text-rose-900 dark:text-rose-200 space-y-1 list-disc pl-5 pt-1">
                            {preflightData.preflight.missing.map(m => (
                              <li key={m.key}>
                                <strong className="font-semibold">{m.key}</strong> — {m.source}
                              </li>
                            ))}
                          </ul>
                          <div className="pt-2">
                            <a
                              href="#/configuracion-documental"
                              className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-bold text-brand bg-surface px-3.5 py-2 rounded-[10px] border border-brand/30 hover:bg-brand-soft transition-all shadow-sm"
                            >
                              Ir a Configuración Documental
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Acciones del Docente */}
                      <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={handlePreviewOfficialPdf}
                          disabled={isLoadingPdf}
                          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-surface border border-line text-ink text-xs font-semibold hover:bg-brand-soft hover:text-brand transition-all shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <EyeIcon className="w-4 h-4 text-muted" />
                          <span>{isLoadingPdf ? 'Generando PDF...' : 'Previsualizar PDF'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowConfirmModal(true)}
                          disabled={!preflightData.preflight.complete || isSubmitting}
                          className={`min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-xs font-bold transition-all shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-brand ${
                            preflightData.preflight.complete
                              ? 'bg-brand text-on-brand hover:bg-brand/90 cursor-pointer'
                              : 'bg-surface-alt border border-line text-muted cursor-not-allowed shadow-none opacity-60'
                          }`}
                          title={
                            preflightData.preflight.complete
                              ? (isInstitutional() ? 'Registrar entrega formal ante Secretaría y Dirección' : 'Registrar entrega de prueba en el entorno sandbox')
                              : 'Bloqueado: Existen campos pendientes en el Preflight'
                          }
                        >
                          <SendIcon className="w-4 h-4" />
                          <span>{isSubmitting ? 'Registrando...' : (isInstitutional() ? 'Registrar Entrega Formal' : 'Registrar entrega de prueba')}</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            /* Historial de Entregas del Docente */
            <div className="bg-surface rounded-2xl border border-line shadow-[var(--ui-shadow)] overflow-hidden">
              <div className="p-5 border-b border-line flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-ink">Mis Entregas Registradas</h3>
                  <p className="text-xs text-muted mt-0.5">
                    Historial de documentos presentados formalmente ante Secretaría y Dirección.
                  </p>
                </div>
                <span className="text-xs font-bold text-ink bg-surface-alt border border-line px-3 py-1 rounded-full tabular-nums shrink-0">
                  {submissions.length} entregas
                </span>
              </div>

              {submissions.length === 0 ? (
                <div className="p-12 text-center text-muted text-xs">
                  <div className="w-12 h-12 rounded-full bg-surface-alt border border-line flex items-center justify-center mx-auto mb-3">
                    <DeliveriesIcon className="w-6 h-6 text-muted" />
                  </div>
                  <strong className="text-ink text-sm block mb-1">Aún no tiene entregas registradas</strong>
                  <span>Utilice la pestaña "Preparar y Entregar Documento" para presentar su primer formato.</span>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {submissions.map(s => (
                    <div key={s.id} className="p-5 hover:bg-surface-alt transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                          <span className="text-xs font-bold text-brand bg-brand-soft px-2 py-0.5 rounded border border-brand/25 tabular-nums shrink-0">
                            {s.templateId}
                          </span>
                          <span className="text-sm font-bold text-ink truncate">
                            {catalogTemplates.find(t => t.id === s.templateId)?.title || s.templateId}
                          </span>
                          {renderStatusBadge(s.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted tabular-nums">
                          <span>Fecha: {new Date(s.createdAt).toLocaleString('es-PE')}</span>
                          <span>Aula: <strong className="text-ink">{getReadableGroupLabel(s.groupId)}</strong></span>
                          {s.unit && <span>Unidad: <strong className="text-ink">{s.unit}</strong></span>}
                          <span>ID: <code className="font-mono text-[11px]">{s.id.slice(0, 8)}</code></span>
                          <span>Hash PDF: <code className="font-mono text-[11px]">{s.pdfHash.slice(0, 10)}...</code></span>
                        </div>

                        {s.reviewReason && (
                          <div className="mt-2 p-2.5 bg-surface-alt rounded-xl border border-line text-xs text-ink">
                            <strong>Dictamen institucional:</strong> {s.reviewReason}
                            {s.reviewedAt && (
                              <span className="text-[11px] text-muted ml-2 tabular-nums">
                                ({new Date(s.reviewedAt).toLocaleString('es-PE')})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleViewSubmittedPdf(s)}
                          disabled={isLoadingPdf}
                          className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-[10px] bg-surface border border-line text-ink hover:bg-brand-soft hover:text-brand active:scale-95 transition-all shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <EyeIcon className="w-4 h-4 text-muted" />
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
            <button
              type="button"
              onClick={() => setStatusFilter('TODOS')}
              className={`text-left p-4 rounded-2xl border cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-brand ${
                statusFilter === 'TODOS'
                  ? 'bg-brand text-on-brand border-brand shadow-[var(--ui-shadow)]'
                  : 'bg-surface text-ink border-line hover:bg-surface-alt'
              }`}
            >
              <div className="text-[11px] uppercase font-bold tracking-wider opacity-80">Total Entregas</div>
              <div className="text-2xl font-black mt-1 tabular-nums">{metrics.total}</div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('ENTREGADO')}
              className={`text-left p-4 rounded-2xl border cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-brand ${
                statusFilter === 'ENTREGADO'
                  ? 'bg-amber-600 dark:bg-amber-700 text-white border-amber-600 shadow-md'
                  : 'bg-surface text-ink border-line hover:bg-surface-alt'
              }`}
            >
              <div className="text-[11px] uppercase font-bold tracking-wider opacity-80">Por Revisar</div>
              <div className={`text-2xl font-black mt-1 tabular-nums ${statusFilter === 'ENTREGADO' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`}>
                {metrics.entregado}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('RECIBIDO')}
              className={`text-left p-4 rounded-2xl border cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-brand ${
                statusFilter === 'RECIBIDO'
                  ? 'bg-sky-600 dark:bg-sky-700 text-white border-sky-600 shadow-md'
                  : 'bg-surface text-ink border-line hover:bg-surface-alt'
              }`}
            >
              <div className="text-[11px] uppercase font-bold tracking-wider opacity-80">Recibidos</div>
              <div className={`text-2xl font-black mt-1 tabular-nums ${statusFilter === 'RECIBIDO' ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`}>{metrics.recibido}</div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('OBSERVADO')}
              className={`text-left p-4 rounded-2xl border cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-brand ${
                statusFilter === 'OBSERVADO'
                  ? 'bg-rose-600 dark:bg-rose-700 text-white border-rose-600 shadow-md'
                  : 'bg-surface text-ink border-line hover:bg-surface-alt'
              }`}
            >
              <div className="text-[11px] uppercase font-bold tracking-wider opacity-80">Observados</div>
              <div className={`text-2xl font-black mt-1 tabular-nums ${statusFilter === 'OBSERVADO' ? 'text-white' : 'text-rose-600 dark:text-rose-400'}`}>{metrics.observado}</div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('REVISADO')}
              className={`text-left p-4 rounded-2xl border cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-brand ${
                statusFilter === 'REVISADO'
                  ? 'bg-emerald-700 dark:bg-emerald-800 text-white border-emerald-700 shadow-md'
                  : 'bg-surface text-ink border-line hover:bg-surface-alt'
              }`}
            >
              <div className="text-[11px] uppercase font-bold tracking-wider opacity-80">Aprobados</div>
              <div className={`text-2xl font-black mt-1 tabular-nums ${statusFilter === 'REVISADO' ? 'text-white' : 'text-emerald-700 dark:text-emerald-400'}`}>{metrics.revisado}</div>
            </button>
          </div>

          {/* Filtros y Búsqueda */}
          <div className="bg-surface p-4 rounded-2xl border border-line flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[var(--ui-shadow)]">
            <div className="relative w-full sm:w-96">
              <SearchIcon className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por docente, plantilla o código..."
                aria-label="Buscar entregas por docente, plantilla o código"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-3 py-2 text-xs rounded-[10px] border border-line bg-surface-alt text-ink placeholder:text-muted focus:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted self-end sm:self-auto">
              <FilterIcon className="w-4 h-4 text-muted" />
              <span>Filtro activo: <strong className="text-ink">{statusFilter}</strong></span>
              {statusFilter !== 'TODOS' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('TODOS')}
                  className="min-h-[44px] px-2 text-brand font-bold underline ml-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand rounded-[10px]"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Entregas */}
          <div className="bg-surface rounded-2xl border border-line shadow-[var(--ui-shadow)] overflow-hidden">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink tabular-nums">
                Bandeja de Documentos Recibidos ({filteredSubmissions.length})
              </h3>
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center text-muted text-xs">
                <DeliveriesIcon className="w-8 h-8 text-muted mx-auto mb-2" />
                <span>No se encontraron entregas que coincidan con los filtros aplicados.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-alt text-[11px] font-bold text-muted uppercase tracking-wider border-b border-line">
                      <th className="py-3 px-4">Documento</th>
                      <th className="py-3 px-4">Docente Remitente</th>
                      <th className="py-3 px-4">Aula / Unidad</th>
                      <th className="py-3 px-4">Fecha Entrega</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs text-ink">
                    {filteredSubmissions.map(s => (
                      <tr key={s.id} className="hover:bg-surface-alt transition-colors">
                        <td className="py-3.5 px-4 max-w-[260px]">
                          <div className="font-bold text-ink tabular-nums">{s.templateId}</div>
                          <div className="text-[11px] text-muted truncate">
                            {catalogTemplates.find(t => t.id === s.templateId)?.title || 'Documento Académico'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-ink max-w-[200px] truncate">
                          {s.authorName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-xs text-ink">{getReadableGroupLabel(s.groupId)}</span>
                          {s.unit && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-brand-soft text-brand border border-brand/25 font-bold text-[10px] tabular-nums">
                              {s.unit}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-muted tabular-nums">
                          {new Date(s.createdAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3.5 px-4">
                          {renderStatusBadge(s.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleViewSubmittedPdf(s)}
                            className="min-h-[44px] inline-flex items-center gap-1 px-3 py-1.5 rounded-[10px] border border-line text-ink bg-surface hover:bg-brand-soft hover:text-brand transition-all font-semibold text-xs shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
                            title="Inspeccionar PDF custodial"
                          >
                            <EyeIcon className="w-3.5 h-3.5 text-muted" />
                            <span>PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(s)}
                            className="min-h-[44px] inline-flex items-center gap-1 px-3.5 py-1.5 rounded-[10px] bg-brand text-on-brand hover:bg-brand/90 transition-all font-semibold text-xs shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-submit-title"
          onClick={() => !isSubmitting && setShowConfirmModal(false)}
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            ref={confirmPanelRef}
            onClick={(e) => e.stopPropagation()}
            className="cepro-dialog-panel bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-line space-y-5 animate-scaleUp"
          >
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-soft border border-brand/20 flex items-center justify-center text-brand shrink-0">
                <SendIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 id="confirm-submit-title" className="text-base font-bold text-ink">Confirmar Presentación de Entrega</h3>
                <p className="text-xs text-muted">Trámite Documental Interno — CEPRO_MICAELA 2.0</p>
              </div>
            </div>

            <div className="text-xs text-muted space-y-3">
              <p>
                Está a punto de registrar la entrega formal del documento con los parámetros actuales.
                El backend generará una <strong className="text-ink">copia custodial inmutable</strong> en el servidor SQLite local:
              </p>

              <div className="p-3.5 bg-surface-alt rounded-2xl border border-line space-y-1.5 text-xs text-ink">
                <div className="tabular-nums"><strong>Plantilla:</strong> {selectedTemplateId} · {catalogTemplates.find(t => t.id === selectedTemplateId)?.title}</div>
                <div><strong>Aula:</strong> {getReadableGroupLabel(activeWorkspace?.groupId)}</div>
                {activeWorkspace?.unit && <div className="tabular-nums"><strong>Unidad Didáctica:</strong> {activeWorkspace.unit}</div>}
                <div><strong>Docente Remitente:</strong> {user?.name}</div>
                <div className="tabular-nums"><strong>Huella SHA-256:</strong> <code className="font-mono text-brand">{preflightData.fingerprint.slice(0, 20)}...</code></div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
                <strong>Aviso de custodia:</strong> Una vez entregado, el PDF original no se modificará aunque los datos del aula cambien. Las decisiones posteriores (Recibido, Observado, Revisado) se registrarán sobre este documento.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="min-h-[44px] px-4 py-2 rounded-[10px] text-xs font-semibold bg-surface-alt border border-line text-ink hover:bg-brand-soft hover:text-brand transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:bg-brand/90 transition-all shadow-md active:scale-95 disabled:opacity-60 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
              >
                <SendIcon className="w-4 h-4" />
                <span>{isSubmitting ? 'Registrando Entrega...' : (isInstitutional() ? 'Confirmar Entrega Formal' : 'Confirmar entrega de prueba')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE REVISIÓN Y DICTAMEN (DIRECCIÓN / SECRETARÍA)
          ========================================================================= */}
      {showReviewModal && selectedSubmission && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          onClick={() => {
            requestSafeTransition(() => {
              setShowReviewModal(false);
              setSelectedSubmission(null);
            });
          }}
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            ref={reviewPanelRef}
            onClick={(e) => e.stopPropagation()}
            className="cepro-dialog-panel bg-surface rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-line space-y-5 animate-scaleUp"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div className="min-w-0">
                <span className="text-xs font-bold text-brand uppercase tracking-wider">
                  Revisión Institucional
                </span>
                <h3 id="review-modal-title" className="text-base font-bold text-ink tabular-nums">
                  Dictamen para {selectedSubmission.templateId}
                </h3>
                <p className="text-xs text-muted tabular-nums">
                  Docente: {selectedSubmission.authorName} | Aula: {getReadableGroupLabel(selectedSubmission.groupId)} | Presentado:{' '}
                  {new Date(selectedSubmission.createdAt).toLocaleString('es-PE')}
                </p>
              </div>

              <button
                type="button"
                aria-label="Cerrar ventana"
                onClick={() => {
                  requestSafeTransition(() => {
                    setShowReviewModal(false);
                    setSelectedSubmission(null);
                  });
                }}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-[10px] text-muted hover:text-ink hover:bg-surface-alt text-sm font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-brand shrink-0"
              >
                ✕
              </button>
            </div>

            {conflictError && (
              <div
                role="alert"
                className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2"
              >
                <AlertCircleIcon className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-bold">Conflicto de Concurrencia (HTTP 409):</span>
                  <p className="mt-0.5">{conflictError}</p>
                  <button
                    type="button"
                    onClick={async () => {
                      await loadSubmissions();
                      setShowReviewModal(false);
                      setSelectedSubmission(null);
                    }}
                    className="mt-2 min-h-[44px] px-3 rounded-[10px] text-xs font-bold text-brand bg-surface border border-line underline cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    Recargar bandeja ahora
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Opciones de Estado */}
              <div>
                <label className="block text-xs font-bold text-ink mb-2">
                  Decisión / Estado Documental:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('RECIBIDO')}
                    className={`min-h-[44px] text-left p-3 rounded-[10px] border cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-brand ${
                      reviewStatus === 'RECIBIDO'
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 ring-1 ring-sky-500 text-sky-950 dark:text-sky-200 font-bold'
                        : 'bg-surface-alt border-line text-ink hover:bg-surface'
                    }`}
                  >
                    <div className="text-xs">RECIBIDO</div>
                    <div className="text-[10px] text-muted font-normal mt-0.5">Mesa de partes / Conforme</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus('OBSERVADO')}
                    className={`min-h-[44px] text-left p-3 rounded-[10px] border cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-brand ${
                      reviewStatus === 'OBSERVADO'
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 ring-1 ring-rose-500 text-rose-950 dark:text-rose-200 font-bold'
                        : 'bg-surface-alt border-line text-ink hover:bg-surface'
                    }`}
                  >
                    <div className="text-xs">OBSERVADO</div>
                    <div className="text-[10px] text-muted font-normal mt-0.5">Requiere correcciones</div>
                  </button>

                  <button
                    type="button"
                    disabled={!isDirector}
                    onClick={() => {
                      if (isDirector) setReviewStatus('REVISADO');
                    }}
                    className={`min-h-[44px] text-left p-3 rounded-[10px] border transition-all focus-visible:ring-2 focus-visible:ring-brand ${
                      !isDirector
                        ? 'bg-surface-alt border-line text-muted cursor-not-allowed opacity-60'
                        : reviewStatus === 'REVISADO'
                        ? 'bg-brand-soft border-brand ring-1 ring-brand text-brand font-bold cursor-pointer'
                        : 'bg-surface-alt border-line text-ink hover:bg-surface cursor-pointer'
                    }`}
                    title={!isDirector ? 'Exclusivo del rol DIRECTOR' : 'Aprobación oficial'}
                  >
                    <div className="text-xs flex items-center justify-between">
                      <span>REVISADO</span>
                      {!isDirector && <LockIcon className="w-3.5 h-3.5 text-muted" />}
                    </div>
                    <div className="text-[10px] text-muted font-normal mt-0.5">Aprobado por Dirección</div>
                  </button>
                </div>
              </div>

              {/* Motivo o Justificación */}
              <div>
                <label htmlFor="review-reason-input" className="block text-xs font-bold text-ink mb-1">
                  Motivo o Fundamentación del Dictamen <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  id="review-reason-input"
                  rows={4}
                  value={reviewReason}
                  onChange={e => setReviewReason(e.target.value)}
                  placeholder="Describa el motivo de la recepción, observaciones técnicas o conformidad emitida..."
                  className="w-full text-xs p-3 rounded-[10px] border border-line focus:outline-none focus-visible:ring-2 focus-visible:ring-brand bg-surface-alt text-ink resize-none"
                />
                <span className="text-[11px] text-muted">
                  Campo obligatorio requerido por el contrato oficial POST /api/document/review.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  requestSafeTransition(() => {
                    setShowReviewModal(false);
                    setSelectedSubmission(null);
                  });
                }}
                disabled={isSubmittingReview}
                className="min-h-[44px] px-4 py-2 rounded-[10px] text-xs font-semibold bg-surface-alt border border-line text-ink hover:bg-brand-soft hover:text-brand transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={isSubmittingReview || !reviewReason.trim()}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:bg-brand/90 transition-all shadow-md active:scale-95 disabled:opacity-60 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-viewer-modal-title"
          onClick={() => setShowPdfViewer(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col p-4 md:p-8 animate-fadeIn"
        >
          <div
            ref={pdfPanelRef}
            onClick={(e) => e.stopPropagation()}
            className="cepro-dialog-panel bg-surface rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl border border-line"
          >
            <div className="p-4 bg-surface-alt border-b border-line flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 id="pdf-viewer-modal-title" className="text-sm font-bold text-ink truncate">{pdfTitle}</h3>
                <p className="text-[11px] text-muted truncate">{pdfFilename}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfViewer(false)}
                className="min-h-[44px] px-4 py-2 text-xs font-bold bg-surface border border-line rounded-[10px] hover:bg-brand-soft hover:text-brand transition-colors text-ink shadow-xs shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
              >
                Cerrar Visor
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-canvas">
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
