/**
 * pages/ConfiguracionDocumental.tsx
 * 
 * Implementación Completa de la Pantalla CONFIGURACIÓN DOCUMENTAL (Tarea 22).
 * CEPRO_MICAELA 2.0.
 * 
 * Reutiliza el backend existente:
 * - GET /api/document/configuration
 * - POST /api/document/configuration
 * 
 * Características:
 * - Consulta y edición de parámetros documentales por ámbito (Institución, Programa, Módulo, Grupo, Unidad, Práctica, etc.)
 * - Estricta segregación por roles (DOCENTE, DIRECTOR, SECRETARIA)
 * - Campos pedagógicos para DOCENTE: Nombre de unidad, capacidad, competencia e indicadores IL1..IL5
 * - Bloqueo visual y de servidor de campos restringidos (modo solo lectura con distintivo y candado)
 * - Control de concurrencia basado en revisiones (rev) con gestión explícita de conflictos HTTP 409
 * - Protección de cambios pendientes integrada con PendingChangesContext (id: 'configuracion-documental')
 * - Integración con validación Preflight y acceso directo al Centro Documental
 * - Interfaz premium Google Stitch (#13594A, #0D3E34, #F6F8FA) y accesibilidad WCAG 2.2 AA
 */

import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePendingChanges } from '../context/PendingChangesContext';
import { apiClient } from '../api/client';
import { isInstitutional } from '../utils/appProfile';
import {
  DocumentConfigurationResponse,
  DocumentFieldSchema,
  DocumentScope,
  DocumentSettingRecord,
  SaveDocumentConfigurationPayload,
  ApiError,
  StudentEnrollmentItem,
  StudentItem,
} from '../api/types';
import {
  DocConfigIcon,
  DocumentIcon,
  RefreshIcon,
  SaveIcon,
  LockIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  FolderOpenIcon,
  KeyIcon,
} from '../components/ui/Icons';
import { ActiveUnitContextBanner } from '../components/academic/ActiveUnitContextBanner';
import { RegistryCodeGuideBanner } from '../components/ui/RegistryCodeGuideBanner';
import {
  applyRegistryFieldChange,
  REGISTER_CODE_SEGMENT_KEYS,
} from '../utils/documentTemplates';

// Denominación institucional y legible de los ámbitos documentales
const SCOPE_NAMES: Record<string, string> = {
  institution: 'Institución y Autoridades',
  program: 'Programa o Carrera',
  module: 'Módulo Formativo',
  group: 'Grupo y Periodo Lectivo',
  unit: 'Unidad: Capacidades e Indicadores',
  unitCurriculum: 'Unidad: Horas y Créditos (Oficial)',
  enrollment: 'Matrícula y Expedición',
  registry: 'Registro Institucional',
  practice: 'Evaluación EFSRT (Prácticas)',
  closure: 'Cierre Modular',
};

// Textos de ayuda y ejemplos por defecto según el estándar oficial de CEPRO_MICAELA
const FIELD_EXAMPLES: Record<string, string> = {
  nombre: 'Ej.: CETPRO Micaela Bastidas Puyucawa',
  codigoModular: 'Ej.: 0734567 (siete dígitos)',
  dre: 'Ej.: DRE Puno',
  ugel: 'Ej.: UGEL San Román',
  hours: 'Ej.: 120',
  credits: 'Ej.: 4',
  name: 'Ej.: Procesador de textos y presentaciones',
  capacity: 'Ej.: Elabora documentos de oficina utilizando herramientas ofimáticas según los requerimientos de la tarea.',
  competence: 'Ej.: Gestiona información institucional mediante herramientas informáticas especializadas.',
  indicator1: 'Ej.: Identifica las herramientas de edición y formato según el estándar del documento.',
  indicator2: 'Ej.: Aplica estilos, tablas y esquemas en documentos institucionales.',
  indicator3: 'Ej.: Configura páginas, encabezados y referencias bibliográficas.',
  indicator4: 'Ej.: Diseña presentaciones interactivas respetando la identidad visual.',
  indicator5: 'Ej.: Exporta y comparte archivos en formatos estándares y seguros.',
  registerCode: 'Ej.: 000333-AT-30425346-CE25-2026',
  registryCorrelative: 'Ej.: 000333',
  registryLevelCode: 'Ej.: AT',
  programAcronym: 'Ej.: CE, CI, MA',
  sigla: 'Ej.: CE, CI, MA',
  registryShortRef: 'Ej.: 25',
  registryCodeYear: 'Ej.: 2026',
  referenceResolution: 'Ej.: R.D. Nº 2053-2025-DUGEL-SR',
  tituladoName: 'Opcional si difiere de la ficha del estudiante',
  teacherName: 'Ej.: Apellidos y Nombres del docente responsable',
  fechaInicio: 'AAAA-MM-DD',
  fechaFin: 'AAAA-MM-DD',
  tipoGestion: 'Ej.: Pública',
  region: 'Ej.: Puno',
  departamento: 'Ej.: Puno',
  provincia: 'Ej.: San Román',
  distrito: 'Ej.: Juliaca',
  lugar: 'Ej.: San Miguel',
  direccion: 'Ej.: Av. Circunvalación 1234',
  telefono: 'Ej.: 051321456',
  resolucionAutorizacion: 'Ej.: R.D. N.° 025-2026-DREP',
  resolucionConversion: 'Ej.: R.D. N.° 010-2024-DREP',
  directorNombre: 'Ej.: Lic. Eloy Valerio Paredes Feliciano',
  secretariaNombre: 'Ej.: Prof. Carmen Rosa Vilca Mamani',
  coordinadorNombre: 'Ej.: Prof. Magda Chura Huanca',
  nivelFormativo: 'Ej.: Auxiliar Técnico',
  tipoPlan: 'Ej.: Modular',
  resolucionPrograma: 'Ej.: R.D. Nº 2053-2025-DUGEL-SR',
  officialTitleText: 'Ej.: CORTE Y ENSAMBLAJE',
  ciclo: 'Ej.: I Ciclo',
  seccion: 'Ej.: Única',
  turno: 'Ej.: Mañana',
  modalidad: 'Ej.: Presencial',
  periodClase: 'Ej.: Periodo 2026-I',
  companyName: 'Ej.: Servicios Informáticos del Altiplano',
  companyAddress: 'Ej.: Jr. San Román 450, Juliaca',
  registryBook: 'Ej.: Libro N.° 01 de Títulos',
  registryFolio: 'Ej.: Folio 045',
  registryNumber: 'Ej.: N.° 0012-2026',
  registryDate: 'AAAA-MM-DD',
  registryAsiento: 'Ej.: Asiento 12',
  ugelCode: 'Ej.: 000333-AT-00333-CE25-2026',
  resolutionNumber: 'Ej.: 000333-2026-DCETPROMB-SM',
  resolutionDate: 'AAAA-MM-DD',
  expedienteNumber: 'Ej.: EXP-0045-2026',
  expedienteDate: 'AAAA-MM-DD',
  graduationDate: 'AAAA-MM-DD',
  specialtyTeacher: 'Ej.: Prof. María Elena Quispe Mamani',
  observations: 'Ej.: Culminación de práctica sin observaciones.',
  subsanacionUnit: 'Ej.: Procesador de textos',
};

const FIELD_HELP: Record<string, string> = {
  sigla: 'Sigla oficial del programa usada en el Código Institucional ({{sigla_programa}}, p. ej. CE, CI, MA).',
  registerCode: 'Señal A: Código de Registro Institucional ({{correlativo}}-{{nivel_formativo}}-{{dni}}-{{sigla_programa}}{{referencia_corta}}-{{anio_codigo}}). Se imprime igual en portada vertical y dos veces en reverso.',
  registryCorrelative: 'Segmento 1 de A: correlativo institucional de 6 dígitos ({{correlativo}}).',
  registryLevelCode: 'Segmento 2 de A: nivel formativo del código ({{nivel_formativo}}, por defecto AT).',
  programAcronym: 'Segmento 4 de A: sigla del programa ({{sigla_programa}}, p. ej. CE, CI).',
  registryShortRef: 'Segmento 5 de A: referencia corta de 2 dígitos ({{referencia_corta}}, p. ej. 25).',
  registryCodeYear: 'Segmento 6 de A: año final de 4 dígitos en el código ({{anio_codigo}}).',
  registryBook: 'Libro oficial donde se asienta el título o certificado. Exclusivo de Dirección.',
  registryFolio: 'Folio del libro institucional de registro. Exclusivo de Dirección.',
  registryNumber: 'Número correlativo asentado en el libro institucional. Exclusivo de Dirección.',
  registryDate: 'Fecha oficial de inscripción en el libro institucional. Exclusivo de Dirección.',
  registryAsiento: 'Asiento registral correspondiente al libro institucional. Exclusivo de Dirección.',
  ugelCode: 'Señal B: Código asignado por la UGEL ({{codigo_registro_ugel}}). Es independiente de A y no debe inventarse.',
  referenceResolution: 'Señal C: Resolución de referencia en la portada del título (p. ej. R.D. Nº 2053-2025-DUGEL-SR).',
  resolutionNumber: 'Número de Resolución Directoral de Título (TMPL-22). Exclusivo de Dirección.',
  resolutionDate: 'Fecha de emisión de la Resolución Directoral de Título. Exclusivo de Dirección.',
  expedienteNumber: 'Número de expediente administrativo de titulación o egreso. Exclusivo de Dirección.',
  expedienteDate: 'Fecha de ingreso o trámite del expediente administrativo. Exclusivo de Dirección.',
  graduationDate: 'Fecha de egreso consignada en el Certificado de Egresado (TMPL-23) y expediente. Editable por Dirección y Secretaría.',
  specialtyTeacher: 'Docente de la especialidad que avala la trayectoria modular (TMPL-22 / TMPL-23). Editable por Dirección y Secretaría.',
  tituladoName: 'Señal D (opcional): sobrescribe el nombre en la portada del Título si difiere de la ficha del estudiante.',
  officialTitleText: 'Señal E (opcional): denominación del programa/título en portada del Título.',
};

const REGISTRY_EXTENDED_FIELDS_FALLBACK: DocumentFieldSchema[] = [
  { key: 'registryCorrelative', label: 'Correlativo institucional (6 dígitos — {{correlativo}})', type: 'text', roles: ['DIRECTOR'] },
  { key: 'registryLevelCode', label: 'Nivel formativo del código ({{nivel_formativo}})', type: 'text', roles: ['DIRECTOR'] },
  { key: 'programAcronym', label: 'Sigla del programa ({{sigla_programa}})', type: 'text', roles: ['DIRECTOR'] },
  { key: 'registryShortRef', label: 'Referencia corta (2 dígitos — {{referencia_corta}})', type: 'text', roles: ['DIRECTOR'] },
  { key: 'registryCodeYear', label: 'Año del código (4 dígitos — {{anio_codigo}})', type: 'text', roles: ['DIRECTOR'] },
  { key: 'ugelCode', label: 'Código de Registro UGEL (B)', type: 'text', roles: ['DIRECTOR'] },
  { key: 'referenceResolution', label: 'Resolución de referencia en portada (C)', type: 'text', roles: ['DIRECTOR'] },
  { key: 'resolutionNumber', label: 'N° Resolución Directoral de Título', type: 'text', roles: ['DIRECTOR'] },
  { key: 'resolutionDate', label: 'Fecha de Resolución Directoral', type: 'date', roles: ['DIRECTOR'] },
  { key: 'expedienteNumber', label: 'N° de Expediente Administrativo', type: 'text', roles: ['DIRECTOR'] },
  { key: 'expedienteDate', label: 'Fecha de Expediente', type: 'date', roles: ['DIRECTOR'] },
  { key: 'graduationDate', label: 'Fecha de Egreso (Módulo/Programa)', type: 'date', roles: ['DIRECTOR', 'SECRETARIA'] },
  { key: 'specialtyTeacher', label: 'Docente de la Especialidad', type: 'text', roles: ['DIRECTOR', 'SECRETARIA'] },
  { key: 'tituladoName', label: 'Nombre del titulado en diploma (D, opcional)', type: 'text', roles: ['DIRECTOR'] },
  { key: 'officialTitleText', label: 'Denominación del título en diploma (E, opcional)', type: 'text', roles: ['DIRECTOR'] },
];

function getFieldPlaceholder(key: string, type: string): string {
  if (FIELD_EXAMPLES[key]) return FIELD_EXAMPLES[key];
  if (type === 'number') return 'Ej.: 0';
  if (type === 'date') return 'AAAA-MM-DD';
  if (key.startsWith('indicator')) return 'Ej.: Descripción del logro pedagógico que evaluará en esta sesión.';
  return 'Ingrese el valor correspondiente';
}

function computeScopeId(scope: DocumentScope): string {
  return `${scope.kind}:${scope.target || 'institution'}${scope.unit ? ':' + scope.unit : ''}`;
}

export const ConfiguracionDocumental: React.FC = () => {
  const { user } = useAuth();
  const { activeWorkspace, dashboardData, options } = useWorkspace();
  const { registerPendingChanges, unregisterPendingChanges, requestSafeTransition } = usePendingChanges();

  // Estado general de configuración desde el backend
  const [docConfig, setDocConfig] = useState<DocumentConfigurationResponse | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // Ámbito seleccionado actualmente
  const [selectedKind, setSelectedKind] = useState<string>('unit');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>('');

  // Formulario y estado de edición
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [initialFormData, setInitialFormData] = useState<Record<string, string | number>>({});
  const [currentSettingRecord, setCurrentSettingRecord] = useState<DocumentSettingRecord | null>(null);

  // Estados de retroalimentación
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isSuggestingRegistry, setIsSuggestingRegistry] = useState<boolean>(false);
  const [registrySuggestMessage, setRegistrySuggestMessage] = useState<string | null>(null);

  // Referencias para transiciones y control de versiones
  const lastSavedRevRef = useRef<string | null>(null);

  // 1. Cargar la configuración documental oficial (GET /api/document/configuration)
  const fetchConfiguration = useCallback(async () => {
    setIsLoadingConfig(true);
    setConfigError(null);
    try {
      const cfg = await apiClient.getDocumentConfiguration();
      setDocConfig(cfg);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setConfigError(apiErr?.error || 'No se pudo cargar la configuración documental desde el servidor local.');
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    fetchConfiguration();
  }, [fetchConfiguration, activeWorkspace]);

  // Lista de grupos autorizados
  const availableGroups = useMemo(() => {
    return dashboardData?.groups || [];
  }, [dashboardData]);

  // Grupo actualmente seleccionado para los ámbitos correspondientes
  const currentGroup = useMemo(() => {
    if (!availableGroups.length) return null;
    if (selectedGroupId) {
      return availableGroups.find((g) => g.id === selectedGroupId) || availableGroups[0];
    }
    if (activeWorkspace?.groupId) {
      return availableGroups.find((g) => g.id === activeWorkspace.groupId) || availableGroups[0];
    }
    return availableGroups[0];
  }, [availableGroups, selectedGroupId, activeWorkspace]);

  // Sincronizar selectedGroupId inicial con el espacio de trabajo activo
  useEffect(() => {
    if (activeWorkspace?.groupId && (!selectedGroupId || !availableGroups.some((g) => g.id === selectedGroupId))) {
      setSelectedGroupId(activeWorkspace.groupId);
    } else if (!selectedGroupId && availableGroups.length > 0) {
      setSelectedGroupId(availableGroups[0].id);
    }
  }, [activeWorkspace, availableGroups, selectedGroupId]);

  // Unidades disponibles en el grupo actual (excluyendo EFSRT para materias ordinarias)
  const groupUnits = useMemo(() => {
    if (!currentGroup?.units) return [];
    let list = currentGroup.units.filter((u) => u !== 'EFSRT');
    // Si es DOCENTE, filtrar solo por unidades asignadas
    if (user?.role === 'DOCENTE' && user.assignments?.length) {
      const assigned = new Set(
        user.assignments
          .filter((a) => a.groupId === currentGroup.id)
          .flatMap((a) => a.units || [])
      );
      list = list.filter((u) => assigned.has(u));
    }
    return list;
  }, [currentGroup, user]);

  // Sincronizar selectedUnitCode con la unidad activa
  useEffect(() => {
    if (activeWorkspace?.unit && groupUnits.includes(activeWorkspace.unit)) {
      setSelectedUnitCode(activeWorkspace.unit);
    } else if (groupUnits.length > 0 && (!selectedUnitCode || !groupUnits.includes(selectedUnitCode))) {
      setSelectedUnitCode(groupUnits[0]);
    }
  }, [activeWorkspace, groupUnits, selectedUnitCode]);

  // Lista de matrículas para selección de target en ámbitos individuales
  const groupEnrollments = useMemo(() => {
    if (!dashboardData?.enrollments || !dashboardData?.students || !currentGroup) return [];
    const studentsMap = new Map<string, StudentItem>();
    for (const s of dashboardData.students) {
      studentsMap.set(s.id, s);
    }
    return dashboardData.enrollments
      .filter((e: StudentEnrollmentItem) => e.groupId === currentGroup.id && e.active)
      .map((e: StudentEnrollmentItem) => {
        const student = studentsMap.get(e.studentId);
        return {
          id: e.id,
          name: student?.name || e.code || e.id,
          document: student?.document || 'S/D',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [dashboardData, currentGroup]);

  const selectedEnrollmentMeta = useMemo(
    () => groupEnrollments.find((e) => e.id === selectedTargetId) || null,
    [groupEnrollments, selectedTargetId]
  );

  // Programas y módulos disponibles para selección de target
  const programsList = useMemo(() => dashboardData?.programs || [], [dashboardData]);
  const modulesList = useMemo(() => dashboardData?.modules || [], [dashboardData]);

  // Sincronizar target según el kind seleccionado
  useEffect(() => {
    if (['enrollment', 'registry', 'practice', 'closure'].includes(selectedKind)) {
      if (groupEnrollments.length > 0 && (!selectedTargetId || !groupEnrollments.some((e) => e.id === selectedTargetId))) {
        setSelectedTargetId(groupEnrollments[0].id);
      }
    } else if (selectedKind === 'program') {
      if (programsList.length > 0 && (!selectedTargetId || !programsList.some((p) => p.id === selectedTargetId))) {
        setSelectedTargetId(programsList[0].id);
      }
    } else if (selectedKind === 'module') {
      if (modulesList.length > 0 && (!selectedTargetId || !modulesList.some((m) => m.id === selectedTargetId))) {
        setSelectedTargetId(modulesList[0].id);
      }
    } else {
      setSelectedTargetId('');
    }
  }, [selectedKind, groupEnrollments, programsList, modulesList, selectedTargetId]);

  // Ámbitos permitidos en el schema devuelto por el backend
  const availableKinds = useMemo(() => {
    if (!docConfig?.schema) return [];
    return Object.keys(docConfig.schema);
  }, [docConfig]);

  // Sincronizar kind inicial con el rol
  useEffect(() => {
    if (availableKinds.length > 0 && !availableKinds.includes(selectedKind)) {
      if (user?.role === 'DOCENTE' && availableKinds.includes('unit')) {
        setSelectedKind('unit');
      } else if (user?.role === 'SECRETARIA' && availableKinds.includes('group')) {
        setSelectedKind('group');
      } else if (user?.role === 'DIRECTOR' && availableKinds.includes('institution')) {
        setSelectedKind('institution');
      } else {
        setSelectedKind(availableKinds[0]);
      }
    }
  }, [availableKinds, selectedKind, user]);

  // Construir el objeto Scope actual
  const currentScope: DocumentScope = useMemo(() => {
    return {
      kind: selectedKind,
      ...(selectedKind === 'institution'
        ? {}
        : {
            target: ['group', 'unit', 'unitCurriculum'].includes(selectedKind)
              ? (currentGroup?.id || selectedGroupId)
              : selectedTargetId,
          }),
      ...(['unit', 'unitCurriculum'].includes(selectedKind) ? { unit: selectedUnitCode } : {}),
    };
  }, [selectedKind, currentGroup, selectedGroupId, selectedTargetId, selectedUnitCode]);

  // ID canónico del ámbito actual (ej. "unit:GRP-001:UD1", "institution:institution")
  const currentScopeId = useMemo(() => computeScopeId(currentScope), [currentScope]);

  // Esquema de campos para el ámbito activo (asegura visibilidad de los 7 campos registrales 2026)
  const activeFieldsSchema = useMemo(() => {
    if (!docConfig?.schema || !docConfig.schema[selectedKind]) return [];
    const baseFields = docConfig.schema[selectedKind];
    if (selectedKind !== 'registry') return baseFields;

    const existingKeys = new Set(baseFields.map((f) => f.key));
    const supplemented = REGISTRY_EXTENDED_FIELDS_FALLBACK
      .filter((f) => !existingKeys.has(f.key))
      .map((f) => ({ ...f, roles: ['DIRECTOR'] }));
    return [...baseFields, ...supplemented];
  }, [docConfig, selectedKind]);

  // Comprobar si el usuario actual tiene permisos de edición sobre un campo específico
  const isFieldEditable = useCallback(
    (field: DocumentFieldSchema) => {
      if (!user?.role) return false;
      // Caso especial EFSRT para DOCENTE: solo si tiene asignada la unidad EFSRT
      if (selectedKind === 'practice' && user.role === 'DOCENTE') {
        const hasPractice = user.assignments?.some(
          (a) => a.groupId === currentGroup?.id && a.units.includes('EFSRT')
        );
        if (!hasPractice) return false;
      }
      return field.roles.includes(user.role);
    },
    [user, selectedKind, currentGroup]
  );

  // ¿El ámbito completo tiene al menos un campo editable por este usuario?
  const isScopeEditable = useMemo(() => {
    return activeFieldsSchema.some((f) => isFieldEditable(f));
  }, [activeFieldsSchema, isFieldEditable]);

  const canSuggestRegistryCodes = useMemo(() => {
    return (
      selectedKind === 'registry' &&
      Boolean(currentGroup?.id && selectedTargetId) &&
      activeFieldsSchema.some(
        (f) => (f.key === 'registerCode' || f.key === 'resolutionNumber') && isFieldEditable(f)
      )
    );
  }, [selectedKind, currentGroup?.id, selectedTargetId, activeFieldsSchema, isFieldEditable]);

  useEffect(() => {
    setRegistrySuggestMessage(null);
  }, [selectedKind, selectedGroupId, selectedTargetId]);

  const handleSuggestRegistryCodes = useCallback(async () => {
    if (!currentGroup?.id || !selectedTargetId) return;
    setIsSuggestingRegistry(true);
    setSaveError(null);
    setSaveSuccess(null);
    setConflictError(null);
    setRegistrySuggestMessage(null);
    try {
      const suggestion = await apiClient.suggestDocumentRegisterCode({
        groupId: currentGroup.id,
        enrollmentId: selectedTargetId,
        emissionYear: activeWorkspace?.year || String(new Date().getFullYear()),
        dni:
          selectedEnrollmentMeta?.document && selectedEnrollmentMeta.document !== 'S/D'
            ? selectedEnrollmentMeta.document
            : undefined,
        demoMode: !isInstitutional(),
        levelCode: formData.registryLevelCode ? String(formData.registryLevelCode) : undefined,
        programAcronym: formData.programAcronym ? String(formData.programAcronym) : undefined,
        shortRef: formData.registryShortRef ? String(formData.registryShortRef) : undefined,
        codeYear: formData.registryCodeYear ? String(formData.registryCodeYear) : undefined,
      });

      const editableKeys = new Set(
        activeFieldsSchema.filter((f) => isFieldEditable(f)).map((f) => f.key)
      );

      setFormData((prev) => ({
        ...prev,
        ...(editableKeys.has('registerCode') ? { registerCode: suggestion.registerCode } : {}),
        ...(editableKeys.has('resolutionNumber') ? { resolutionNumber: suggestion.resolutionNumber } : {}),
        ...(editableKeys.has('registryCorrelative') && suggestion.correlativeFormatted
          ? { registryCorrelative: suggestion.correlativeFormatted }
          : {}),
        ...(editableKeys.has('registryLevelCode') && suggestion.levelCode
          ? { registryLevelCode: suggestion.levelCode }
          : {}),
        ...(editableKeys.has('programAcronym') && suggestion.programAcronym
          ? { programAcronym: suggestion.programAcronym }
          : {}),
        ...(editableKeys.has('registryShortRef') && suggestion.shortRef
          ? { registryShortRef: suggestion.shortRef }
          : {}),
        ...(editableKeys.has('registryCodeYear') && suggestion.codeYear
          ? { registryCodeYear: suggestion.codeYear }
          : {}),
        ...(editableKeys.has('referenceResolution') && suggestion.referenceResolution
          ? { referenceResolution: suggestion.referenceResolution }
          : {}),
      }));
      setRegistrySuggestMessage(
        `Sugerencia 2026 aplicada (correlativo #${suggestion.correlative}, ingreso ${suggestion.intakeYear} -> emisión ${suggestion.emissionYear}). Revisa y pulsa «Guardar Parámetros».`
      );
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setSaveError(
        apiErr?.error || 'No se pudo sugerir el Código Institucional y N° de Resolución Directoral.'
      );
    } finally {
      setIsSuggestingRegistry(false);
    }
  }, [
    currentGroup?.id,
    selectedTargetId,
    activeWorkspace?.year,
    selectedEnrollmentMeta?.document,
    formData.registryLevelCode,
    formData.programAcronym,
    formData.registryShortRef,
    formData.registryCodeYear,
    activeFieldsSchema,
    isFieldEditable,
  ]);

  // Cargar valores iniciales desde defaults y settings del backend
  const loadInitialValues = useCallback(() => {
    if (!docConfig) return;

    const settingRec = docConfig.settings.find((s) => s.id === currentScopeId) || null;
    const defaultsForScope = docConfig.defaults[currentScopeId] || {};

    const values: Record<string, string | number> = {
      ...defaultsForScope,
      ...(settingRec?.fields || {}),
    };

    // Nombre institucional de respaldo si está vacío
    if (selectedKind === 'institution' && !values.nombre && dashboardData?.status?.institutionName) {
      values.nombre = dashboardData.status.institutionName;
    }

    setFormData(values);
    setInitialFormData(values);
    setCurrentSettingRecord(settingRec);
    lastSavedRevRef.current = settingRec?.rev || null;
  }, [docConfig, currentScopeId, selectedKind, dashboardData]);

  useEffect(() => {
    loadInitialValues();
  }, [loadInitialValues]);

  // Detección de cambios pendientes (comparación limpia)
  const isDirty = useMemo(() => {
    for (const field of activeFieldsSchema) {
      const editable = isFieldEditable(field);
      const initialVal = initialFormData[field.key] ?? '';
      const currentVal = formData[field.key] ?? '';
      if (!editable) continue;
      if (String(initialVal).trim() !== String(currentVal).trim()) {
        return true;
      }
    }
    return false;
  }, [activeFieldsSchema, isFieldEditable, initialFormData, formData]);

  // Manejador de cambios en los inputs
  const handleFieldChange = (key: string, value: string | number) => {
    setFormData((prev) => {
      if (
        selectedKind === 'registry' &&
        (REGISTER_CODE_SEGMENT_KEYS.has(key) || key === 'registerCode')
      ) {
        const stringified: Record<string, string> = {};
        for (const [k, v] of Object.entries(prev)) stringified[k] = String(v ?? '');
        const updated = applyRegistryFieldChange(
          stringified,
          key,
          String(value),
          selectedEnrollmentMeta?.document
        );
        return { ...prev, ...updated };
      }
      return { ...prev, [key]: value };
    });
    setSaveSuccess(null);
    setSaveError(null);
    setConflictError(null);
  };

  // 2. Guardado real en backend SQLite (POST /api/document/configuration)
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!isScopeEditable) {
      setSaveError('Su rol no tiene autorización para modificar los campos de este ámbito.');
      return false;
    }

    // Filtrar únicamente los campos editables y excluir campos de solo lectura o sistema
    const fieldsToSave: Record<string, string | number> = {};
    for (const field of activeFieldsSchema) {
      if (!isFieldEditable(field)) continue;
      if (['dateOrigin', 'nameOrigin', 'source', 'sourceNote'].includes(field.key)) continue;

      const rawVal = formData[field.key];
      if (field.type === 'number') {
        fieldsToSave[field.key] =
          rawVal !== '' && rawVal !== null && rawVal !== undefined ? Number(rawVal) : 0;
      } else {
        fieldsToSave[field.key] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
      }
    }

    // Validaciones de dominio en cliente antes de enviar
    if (selectedKind === 'institution' && Object.hasOwn(fieldsToSave, 'nombre') && !fieldsToSave.nombre) {
      setSaveError('El nombre institucional no puede quedar vacío.');
      return false;
    }

    if (fieldsToSave.fechaInicio && fieldsToSave.fechaFin && fieldsToSave.fechaInicio > fieldsToSave.fechaFin) {
      setSaveError('La fecha de término debe ser posterior a la fecha de inicio.');
      return false;
    }

    const payload: SaveDocumentConfigurationPayload = {
      scope: currentScope,
      fields: fieldsToSave,
      rev: currentSettingRecord?.rev || null,
    };

    setIsSaving(true);
    setSaveError(null);
    setConflictError(null);

    try {
      const savedRecord = await apiClient.saveDocumentConfiguration(payload);

      // Actualizar la lista en memoria de docConfig
      setDocConfig((prev) => {
        if (!prev) return prev;
        const idx = prev.settings.findIndex((s) => s.id === savedRecord.id);
        const updated = [...prev.settings];
        if (idx >= 0) {
          updated[idx] = savedRecord;
        } else {
          updated.push(savedRecord);
        }
        return { ...prev, settings: updated };
      });

      setCurrentSettingRecord(savedRecord);
      lastSavedRevRef.current = savedRecord.rev || null;
      setInitialFormData(formData);
      setRegistrySuggestMessage(null);
      setSaveSuccess(
        __IS_INSTITUTIONAL__
          ? `Parámetros guardados exitosamente en la base de datos local (${savedRecord.id}). Los cambios se reflejarán en las validaciones preflight y en los formatos PDF del Centro Documental.`
          : `Parámetros guardados exitosamente en SQLite sintético (${savedRecord.id}). Los cambios se reflejarán en las validaciones preflight y en los formatos PDF del Centro Documental.`
      );
      return true;
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 409) {
        setConflictError(
          'Conflicto de concurrencia (HTTP 409): Los datos de este documento fueron modificados en otra sesión o ventana. Sus cambios locales se han preservado.'
        );
        setSaveError('El registro en el servidor cambió. Recargue los datos antes de guardar.');
      } else {
        setSaveError(apiErr?.error || 'Error al guardar los parámetros en el servidor.');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    isScopeEditable,
    activeFieldsSchema,
    isFieldEditable,
    formData,
    selectedKind,
    currentScope,
    currentSettingRecord,
  ]);

  // Descartar cambios locales y volver a los valores del servidor
  const handleDiscard = useCallback(() => {
    setFormData(initialFormData);
    setSaveSuccess(null);
    setSaveError(null);
    setConflictError(null);
    setRegistrySuggestMessage(null);
  }, [initialFormData]);

  // Recargar datos desde el servidor en caso de conflicto
  const handleReloadServerData = async () => {
    await fetchConfiguration();
    loadInitialValues();
    setConflictError(null);
  };

  // 3. Registro en el sistema central de protección de cambios pendientes
  useEffect(() => {
    registerPendingChanges({
      id: 'configuracion-documental',
      hasChanges: isDirty,
      message: 'Tiene modificaciones pendientes en los parámetros documentales.',
      onSave: handleSave,
      onDiscard: handleDiscard,
    });

    return () => {
      unregisterPendingChanges('configuracion-documental');
    };
  }, [isDirty, handleSave, handleDiscard, registerPendingChanges, unregisterPendingChanges]);

  // 4. Cambios de contexto protegidos (kind, group, target, unit)
  const safeChangeKind = (newKind: string) => {
    if (newKind === selectedKind) return;
    if (isDirty) {
      requestSafeTransition(() => {
        handleDiscard();
        setSelectedKind(newKind);
      });
    } else {
      setSelectedKind(newKind);
    }
  };

  const safeChangeGroup = (newGroupId: string) => {
    if (newGroupId === selectedGroupId) return;
    if (isDirty) {
      requestSafeTransition(() => {
        handleDiscard();
        setSelectedGroupId(newGroupId);
      });
    } else {
      setSelectedGroupId(newGroupId);
    }
  };

  const safeChangeUnit = (newUnit: string) => {
    if (newUnit === selectedUnitCode) return;
    if (isDirty) {
      requestSafeTransition(() => {
        handleDiscard();
        setSelectedUnitCode(newUnit);
      });
    } else {
      setSelectedUnitCode(newUnit);
    }
  };

  const safeChangeTarget = (newTarget: string) => {
    if (newTarget === selectedTargetId) return;
    if (isDirty) {
      requestSafeTransition(() => {
        handleDiscard();
        setSelectedTargetId(newTarget);
      });
    } else {
      setSelectedTargetId(newTarget);
    }
  };

  // 5. Agrupación pedagógica y presentación de campos
  const isUnitPedagogy = selectedKind === 'unit';
  const generalUnitFields = useMemo(() => {
    if (!isUnitPedagogy) return [];
    return activeFieldsSchema.filter((f) => ['name', 'capacity', 'competence'].includes(f.key));
  }, [isUnitPedagogy, activeFieldsSchema]);

  const indicatorFields = useMemo(() => {
    if (!isUnitPedagogy) return [];
    return activeFieldsSchema.filter((f) => f.key.startsWith('indicator'));
  }, [isUnitPedagogy, activeFieldsSchema]);

  // Si está cargando inicialmente
  if (isLoadingConfig && !docConfig) {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <div className="bg-surface rounded-2xl p-8 border border-line shadow-[var(--ui-shadow)] flex flex-col items-center justify-center min-h-[360px] text-center">
          <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin mb-4" />
          <h2 className="text-base font-bold text-ink">Cargando Parámetros Documentales…</h2>
          <p className="text-xs text-muted mt-1">
            Consultando el esquema y las asignaciones autorizadas en el servidor local.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Encabezado Institucional y Navegación de Contexto */}
      <DashboardPhotoBand as="header" scene="pedagogia" contentClassName="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-muted font-semibold mb-1">
            <a href="#/inicio" className="hover:text-brand transition-colors">
              Inicio
            </a>
            <span aria-hidden="true">/</span>
            <a href="#/documentos" className="hover:text-brand transition-colors">
              Documentos
            </a>
            <span aria-hidden="true">/</span>
            <span className="text-brand font-bold">Configuración Documental</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <h1 className="text-[24px] sm:text-[30px] leading-tight font-bold text-ink tracking-tight flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full bg-brand shrink-0" aria-hidden="true" />
              <span className="truncate">
                {user?.role === 'DOCENTE' ? 'Preparación de Unidad Didáctica' : 'Configuración de Parámetros Documentales'}
              </span>
            </h1>

            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-soft text-brand border border-brand/20">
              Rol: {user?.role || 'DOCENTE'}
            </span>

            {activeWorkspace?.mode && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-alt border border-line text-ink tabular-nums">
                {activeWorkspace.mode === 'UNIT'
                  ? `Alcance: Por Unidad Didáctica${activeWorkspace.unit ? ` (${activeWorkspace.unit})` : ''}`
                  : activeWorkspace.mode === 'PRACTICE'
                  ? 'Alcance: Prácticas EFSRT'
                  : 'Alcance: Por Módulo Formativo'}
              </span>
            )}

            {!__IS_INSTITUTIONAL__ && dashboardData?.status?.demonstration && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 uppercase tracking-wider">
                Entorno de Pruebas · Sin Validez Oficial
              </span>
            )}
          </div>

          <p className="text-xs text-muted max-w-3xl">
            {user?.role === 'DOCENTE'
              ? 'Defina el nombre oficial, la capacidad terminal, la competencia y los cinco indicadores de logro (IL1..IL5) para la unidad didáctica activa. Estos datos alimentan automáticamente los formatos oficiales del MINEDU.'
              : 'Administre los datos institucionales, grupos, periodos y parámetros curriculares según los permisos autorizados para su rol.'}
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchConfiguration}
            disabled={isLoadingConfig}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-surface-alt border border-line hover:bg-brand-soft text-ink hover:text-brand text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 cursor-pointer"
            title="Recargar configuración desde el servidor local"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${isLoadingConfig ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <a
            href="#/documentos"
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-brand hover:bg-brand/90 text-on-brand text-xs font-bold transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-brand"
            title="Ir al Centro Documental para generar y verificar PDFs"
          >
            <DocumentIcon className="w-3.5 h-3.5" />
            <span>Ver Centro Documental</span>
          </a>
        </div>
      </DashboardPhotoBand>

      {/* Contexto Académico de Unidad Activa y Conmutador Rápido */}
      <ActiveUnitContextBanner variant="compact" />

      {/* 2. Barra de Alertas y Retroalimentación */}
      {saveSuccess && (
        <div
          role="status"
          className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 flex items-start gap-3 text-emerald-950 dark:text-emerald-200 text-xs shadow-sm animate-in fade-in duration-200"
        >
          <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <strong className="font-bold text-sm block">Cambios Guardados Exitosamente</strong>
            <span>{saveSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccess(null)}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-[10px] text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 font-bold p-1 text-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Cerrar notificación de éxito"
          >
            ✕
          </button>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-4 flex items-start gap-3 text-rose-950 dark:text-rose-200 text-xs shadow-sm animate-in fade-in duration-200"
        >
          <AlertCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <strong className="font-bold text-sm block">No se pudo guardar la configuración</strong>
            <span>{saveError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-[10px] text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-100 font-bold p-1 text-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Cerrar error"
          >
            ✕
          </button>
        </div>
      )}

      {conflictError && (
        <div
          role="alert"
          className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 dark:text-amber-200 text-xs shadow-sm animate-in fade-in duration-200"
        >
          <div className="flex items-start gap-3 min-w-0">
            <AlertCircleIcon className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <strong className="font-bold text-sm block">Conflicto de Concurrencia (HTTP 409)</strong>
              <span>{conflictError}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReloadServerData}
              className="min-h-[44px] px-3.5 py-2 rounded-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
            >
              Recargar versión del servidor
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              className="min-h-[44px] px-3.5 py-2 rounded-[10px] bg-surface border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-300 font-semibold text-xs hover:bg-amber-100 dark:hover:bg-surface-alt cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
            >
              Descartar mis cambios
            </button>
          </div>
        </div>
      )}

      {/* 3. Selector de Ámbito, Grupo, Destino y Unidad */}
      <div className="bg-surface rounded-2xl p-5 border border-line shadow-[var(--ui-shadow)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <DocConfigIcon className="w-4 h-4 text-brand shrink-0" />
            <h2 className="text-sm font-bold text-ink tracking-tight">
              Selección de Ámbito y Contexto Académico
            </h2>
          </div>
          {user?.role !== 'DOCENTE' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted font-mono tabular-nums">
                Identificador: <strong className="text-ink">{currentScopeId}</strong>
              </span>
              {currentSettingRecord?.rev && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-alt text-muted border border-line tabular-nums">
                  rev: {currentSettingRecord.rev.slice(0, 8)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* A. Selector de Ámbito (Kind) */}
          <div className="space-y-1 min-w-0">
            <label htmlFor="parameter-kind" className="font-bold text-ink block">
              Datos a Configurar
            </label>
            <select
              id="parameter-kind"
              value={selectedKind}
              onChange={(e) => safeChangeKind(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {availableKinds.map((k) => (
                <option key={k} value={k}>
                  {SCOPE_NAMES[k] || k}
                </option>
              ))}
            </select>
          </div>

          {/* B. Selector de Grupo (Aula) */}
          {!['institution', 'program', 'module'].includes(selectedKind) && (
            <div className="space-y-1 min-w-0" id="parameter-group-label">
              <label htmlFor="parameter-group" className="font-bold text-ink block">
                Aula / Grupo
              </label>
              <select
                id="parameter-group"
                value={selectedGroupId}
                onChange={(e) => safeChangeGroup(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {availableGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name || g.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* C. Selector de Unidad Didáctica (Solo para unit y unitCurriculum) */}
          {['unit', 'unitCurriculum'].includes(selectedKind) && (
            <div className="space-y-1 min-w-0" id="parameter-unit-label">
              <label htmlFor="parameter-unit" className="font-bold text-ink block">
                Unidad Didáctica
              </label>
              <select
                id="parameter-unit"
                value={selectedUnitCode}
                onChange={(e) => safeChangeUnit(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {groupUnits.map((u) => (
                  <option key={u} value={u}>
                    {u} {activeWorkspace?.unitName && u === activeWorkspace.unit ? `· ${activeWorkspace.unitName}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* D. Selector de Destino / Estudiante (para enrollment, practice, program, module, etc.) */}
          {!['institution', 'group', 'unit', 'unitCurriculum'].includes(selectedKind) && (
            <div className="space-y-1 min-w-0" id="parameter-target-label">
              <label htmlFor="parameter-target" className="font-bold text-ink block">
                Destino / Registro
              </label>
              <select
                id="parameter-target"
                value={selectedTargetId}
                onChange={(e) => safeChangeTarget(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {['enrollment', 'registry', 'practice', 'closure'].includes(selectedKind) &&
                  groupEnrollments.map((en) => (
                    <option key={en.id} value={en.id}>
                      {en.name} ({en.document})
                    </option>
                  ))}
                {selectedKind === 'program' &&
                  programsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.nombre || p.id}
                    </option>
                  ))}
                {selectedKind === 'module' &&
                  modulesList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.nombre || m.id}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* Nota informativa de permisos */}
        <div className="pt-2 text-[11px] text-muted flex flex-wrap items-center justify-between gap-2">
          <span>
            {isScopeEditable ? (
              <span className="text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                Los campos habilitados corresponden a su alcance pedagógico y administrativo autorizado.
              </span>
            ) : (
              <span className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                <LockIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                Modo Consulta (Solo Lectura): Los datos de este ámbito son administrados por Dirección o Secretaría.
              </span>
            )}
          </span>

          {isDirty && (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 font-bold text-[11px]">
              ● Hay modificaciones sin guardar en este formulario
            </span>
          )}
        </div>
      </div>

      {/* 4. Formulario de Parámetros */}
      <form
        id="parameters-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="space-y-6"
      >
        {/* Caso especial A: Unidad Didáctica Pedagógica (Estructura organizada en 2 secciones) */}
        {isUnitPedagogy ? (
          <>
            {/* Sección 1: Datos Generales de la Unidad */}
            <div className="bg-surface rounded-2xl p-6 border border-line shadow-[var(--ui-shadow)] space-y-4">
              <div className="border-b border-line pb-3">
                <h3 className="text-sm font-bold text-brand tracking-tight flex items-center gap-2 tabular-nums">
                  <span className="w-2 h-2 rounded-full bg-brand shrink-0" aria-hidden="true" />
                  1. Identificación y Capacidades de la Unidad ({selectedUnitCode})
                </h3>
                <p className="text-xs text-muted">
                  Defina la denominación de la unidad didáctica, su capacidad terminal y la competencia modular asociada.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {generalUnitFields.map((field) => {
                  const editable = isFieldEditable(field);
                  const val = formData[field.key] ?? '';
                  const placeholder = getFieldPlaceholder(field.key, field.type);

                  return (
                    <div key={field.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`field-${field.key}`}
                          className="text-xs font-bold text-ink flex items-center gap-1"
                        >
                          <span>{field.label}</span>
                          <span className="text-rose-500" title="Campo requerido para emisión oficial">*</span>
                        </label>
                        {!editable && (
                          <span className="text-[10px] font-semibold text-muted flex items-center gap-1">
                            <LockIcon className="w-3 h-3" /> Solo lectura
                          </span>
                        )}
                      </div>

                      {field.type === 'textarea' ? (
                        <textarea
                          id={`field-${field.key}`}
                          name={field.key}
                          rows={field.key === 'capacity' ? 3 : 2}
                          value={val}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          disabled={!editable}
                          placeholder={placeholder}
                          className="w-full px-3.5 py-2.5 text-xs rounded-[10px] border border-line bg-surface text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:bg-surface-alt disabled:text-muted disabled:cursor-not-allowed transition-all leading-relaxed"
                        />
                      ) : (
                        <input
                          id={`field-${field.key}`}
                          name={field.key}
                          type="text"
                          value={val}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          disabled={!editable}
                          placeholder={placeholder}
                          className="w-full min-h-[44px] px-3.5 py-2 text-xs rounded-[10px] border border-line bg-surface text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:bg-surface-alt disabled:text-muted disabled:cursor-not-allowed transition-all"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sección 2: Indicadores de Logro (IL1 a IL5) */}
            <div className="bg-surface rounded-2xl p-6 border border-line shadow-[var(--ui-shadow)] space-y-4">
              <div className="border-b border-line pb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-brand tracking-tight flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand shrink-0" aria-hidden="true" />
                    2. Indicadores de Logro Pedagógicos (IL1 a IL5)
                  </h3>
                  <p className="text-xs text-muted">
                    Redacte de manera concisa cada criterio de logro. Estos textos se imprimen en los Registros de Evaluación y Calificaciones.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-soft text-brand border border-brand/20 tabular-nums">
                  5 Indicadores Normados
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {indicatorFields.map((field, idx) => {
                  const editable = isFieldEditable(field);
                  const val = formData[field.key] ?? '';
                  const placeholder = getFieldPlaceholder(field.key, field.type);

                  return (
                    <div
                      key={field.key}
                      className={`space-y-1.5 p-4 rounded-2xl border border-line bg-surface-alt ${
                        idx === 4 ? 'md:col-span-2' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`field-${field.key}`}
                          className="text-xs font-bold text-ink flex items-center gap-1.5"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-brand text-on-brand font-mono text-[10px] tabular-nums">
                            IL{idx + 1}
                          </span>
                          <span>{field.label}</span>
                        </label>
                        {!editable && (
                          <span className="text-[10px] font-semibold text-muted flex items-center gap-1">
                            <LockIcon className="w-3 h-3" /> Solo lectura
                          </span>
                        )}
                      </div>

                      <textarea
                        id={`field-${field.key}`}
                        name={field.key}
                        rows={3}
                        value={val}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        disabled={!editable}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 text-xs rounded-[10px] border border-line bg-surface text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:bg-surface-alt disabled:text-muted disabled:cursor-not-allowed transition-all leading-relaxed"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Caso B: Otros Ámbitos (Institución, Módulo, Grupo, Práctica, etc.) */
          <div className="bg-surface rounded-2xl p-6 border border-line shadow-[var(--ui-shadow)] space-y-4">
            <div className="border-b border-line pb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-brand tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand shrink-0" aria-hidden="true" />
                  <span>Campos Oficiales — {SCOPE_NAMES[selectedKind] || selectedKind}</span>
                </h3>
                <p className="text-xs text-muted">
                  {isScopeEditable
                    ? 'Los campos marcados con asterisco (*) son obligatorios para la emisión formal de documentos.'
                    : 'Su cuenta no dispone de permisos de edición para este ámbito. Los valores se presentan para fines de auditoría y consulta.'}
                </p>
              </div>

              {canSuggestRegistryCodes && (
                <button
                  type="button"
                  id="btn-suggest-registry-config"
                  onClick={handleSuggestRegistryCodes}
                  disabled={isSuggestingRegistry || isSaving}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border border-brand/30 bg-brand-soft hover:bg-brand text-brand hover:text-on-brand text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand shrink-0"
                >
                  <KeyIcon className={`w-3.5 h-3.5 ${isSuggestingRegistry ? 'animate-spin' : ''}`} />
                  <span>
                    {isSuggestingRegistry
                      ? 'Calculando sugerencia…'
                      : 'Sugerir Código Institucional y N° RD'}
                  </span>
                </button>
              )}
            </div>

            {selectedKind === 'registry' && (
              <div className="space-y-2.5">
                <div className="rounded-xl border border-line bg-surface-alt px-3.5 py-2.5 text-xs text-muted leading-relaxed">
                  <strong className="text-ink font-semibold">Permisos registrales 2026:</strong>{' '}
                  Dirección gestiona Código Institucional, Código UGEL, Resolución Directoral (N° y fecha), Expediente (N° y fecha) y datos del libro.
                  Secretaría puede actualizar Fecha de Egreso y Docente de la Especialidad.
                </div>
                <RegistryCodeGuideBanner
                  fields={formData}
                  dni={selectedEnrollmentMeta?.document}
                />
              </div>
            )}

            {registrySuggestMessage && selectedKind === 'registry' && (
              <div
                role="status"
                className="rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2"
              >
                <CheckCircleIcon className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{registrySuggestMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="parameter-fields">
              {activeFieldsSchema
                .filter((f) => !['dateOrigin', 'nameOrigin', 'source', 'sourceNote'].includes(f.key))
                .map((field) => {
                  const editable = isFieldEditable(field);
                  const val = formData[field.key] ?? '';
                  const placeholder = getFieldPlaceholder(field.key, field.type);
                  const helpText = FIELD_HELP[field.key];
                  const isRegistryScope = selectedKind === 'registry';
                  const allowsSecretaria = field.roles.includes('SECRETARIA');

                  return (
                    <div
                      key={field.key}
                      className={`space-y-1 min-w-0 ${field.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={`field-${field.key}`}
                          className="text-xs font-bold text-ink flex items-center gap-1 min-w-0"
                        >
                          <span className="truncate">{field.label}</span>
                          {editable && field.key === 'nombre' && selectedKind === 'institution' && (
                            <span className="text-rose-500">*</span>
                          )}
                        </label>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isRegistryScope && (
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                allowsSecretaria
                                  ? 'border-brand/25 bg-brand-soft text-brand'
                                  : 'border-line bg-surface-alt text-muted'
                              }`}
                            >
                              {allowsSecretaria ? 'Dir. / Sec.' : 'Solo Dirección'}
                            </span>
                          )}
                          {!editable && (
                            <span className="text-[10px] font-semibold text-muted flex items-center gap-1">
                              <LockIcon className="w-3 h-3" /> Solo lectura
                            </span>
                          )}
                        </div>
                      </div>

                      {field.type === 'textarea' ? (
                        <textarea
                          id={`field-${field.key}`}
                          name={field.key}
                          rows={2}
                          value={val}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          disabled={!editable}
                          placeholder={placeholder}
                          className="w-full px-3 py-2 text-xs rounded-[10px] border border-line bg-surface text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:bg-surface-alt disabled:text-muted disabled:cursor-not-allowed transition-all"
                        />
                      ) : field.type === 'select' ? (
                        <select
                          id={`field-${field.key}`}
                          name={field.key}
                          value={String(val)}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          disabled={!editable}
                          className="w-full min-h-[44px] px-3 py-2 text-xs rounded-[10px] border border-line bg-surface text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:bg-surface-alt disabled:text-muted disabled:cursor-not-allowed transition-all"
                        >
                          <option value="">Sin configurar</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`field-${field.key}`}
                          name={field.key}
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          min={field.type === 'number' ? 0 : undefined}
                          step={field.type === 'number' ? '0.01' : undefined}
                          value={val}
                          onChange={(e) => handleFieldChange(field.key, field.type === 'number' ? e.target.value : e.target.value)}
                          disabled={!editable}
                          placeholder={placeholder}
                          className="w-full min-h-[44px] px-3 py-2 text-xs rounded-[10px] border border-line bg-surface text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:bg-surface-alt disabled:text-muted disabled:cursor-not-allowed transition-all"
                        />
                      )}
                      {helpText && (
                        <p className="text-[11px] text-muted leading-snug">{helpText}</p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 5. Barra de Acciones y Guardado */}
        <div className="bg-surface rounded-2xl p-5 border border-line shadow-[var(--ui-shadow)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="save-parameters"
              onClick={handleSave}
              disabled={isSaving || !isScopeEditable || !isDirty}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-brand hover:bg-brand/90 text-on-brand text-xs font-bold transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <SaveIcon className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Guardando en Servidor…' : 'Guardar Parámetros'}</span>
            </button>

            {isDirty && (
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isSaving}
                className="min-h-[44px] px-4 py-2.5 rounded-[10px] border border-line bg-surface-alt hover:bg-brand-soft text-ink hover:text-brand text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
              >
                Descartar Cambios
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#/documentos"
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-surface-alt border border-line hover:bg-brand-soft text-ink hover:text-brand text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span>Ver Formatos en Centro Documental</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </form>

      {/* 6. Panel Informativo: Integración con Preflight y Centro Documental */}
      <div className="bg-surface-alt rounded-2xl p-6 border border-line shadow-[var(--ui-shadow)] space-y-3">
        <div className="flex items-center gap-2">
          <DocumentIcon className="w-5 h-5 text-brand shrink-0" />
          <h3 className="text-sm font-bold text-ink tracking-tight">
            Efecto sobre el Centro Documental y el Checklist Preflight
          </h3>
        </div>

        <p className="text-xs text-muted leading-relaxed max-w-4xl">
          Los indicadores de logro guardados se integrarán en la próxima validación documental.
          <br /><br />
          La disponibilidad de cada formato dependerá del cumplimiento de todos los requisitos del Preflight.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-surface p-3.5 rounded-2xl border border-line">
            <strong className="font-bold text-ink block mb-0.5 tabular-nums">TMPL-04 · Carpeta Pedagógica</strong>
            <span className="text-[11px] text-muted">Refleja la programación, horas y capacidades de la unidad.</span>
          </div>
          <div className="bg-surface p-3.5 rounded-2xl border border-line">
            <strong className="font-bold text-ink block mb-0.5 tabular-nums">TMPL-05..10 · Asistencia UD1..UD6</strong>
            <span className="text-[11px] text-muted">Valida fechas lectivas y nombre oficial de la unidad.</span>
          </div>
          <div className="bg-surface p-3.5 rounded-2xl border border-line">
            <strong className="font-bold text-ink block mb-0.5 tabular-nums">TMPL-11..17 · Evaluación UD1..UD7</strong>
            <span className="text-[11px] text-muted">Imprime los 5 indicadores de logro en la cabecera del registro.</span>
          </div>
        </div>

        {(docConfig?.extendedCatalog?.length || docConfig?.catalog?.length) ? (
          <div className="pt-3 border-t border-line space-y-2.5" id="catalog-extension-overview">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-ink">
                  Catálogo Documental Activo ({docConfig?.extendedCatalog?.length ? docConfig.extendedCatalog.length : docConfig?.catalog?.length} formatos)
                </h4>
                {Boolean(docConfig?.extendedCatalog?.length) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand border border-brand/20">
                    Incluye Extensión 2026 (TMPL-22 / TMPL-23)
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted">
                Los campos configurados alimentan automáticamente el preflight y la emisión PDF 2026.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {(docConfig?.extendedCatalog?.length ? docConfig.extendedCatalog : docConfig?.catalog || []).map((item) => {
                const supports2026 =
                  Boolean(item.official2026Support || item.official2026) ||
                  ['TMPL-01', 'TMPL-19', 'TMPL-20', 'TMPL-21', 'TMPL-22', 'TMPL-23'].includes(item.id);
                const isExtension = Boolean(item.extension || item.id === 'TMPL-22' || item.id === 'TMPL-23');
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 bg-surface text-xs flex flex-col justify-between gap-1.5 ${
                      isExtension ? 'border-brand/35 ring-1 ring-brand/10' : 'border-line'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink tabular-nums">{item.id}</span>
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {isExtension && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-soft text-brand">
                            Extensión 2026
                          </span>
                        )}
                        {supports2026 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                            Oficial 2026
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] font-semibold text-ink leading-snug">{item.name}</p>
                    <span className="text-[10px] text-muted tabular-nums">
                      {Array.isArray(item.parameters) ? item.parameters.length : 0} parámetros vinculados
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ConfiguracionDocumental;
