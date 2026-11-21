/**
 * pages/ConfiguracionAcademica.tsx
 * 
 * Implementación Integral de CONFIGURACIÓN ACADÉMICA Y PERIODOS LECTIVOS (Tarea 32).
 * CEPRO_MICAELA 2.0.
 * 
 * Áreas funcionales oficiales:
 * 1. Institución y calendario (academicYear)
 * 2. Periodos académicos (academicPeriod)
 * 3. Programas y planes curriculares (curriculum)
 * 4. Valores oficiales de referencia (moduleDefaults)
 * 5. Directorio institucional de personal (personnel)
 * 
 * Capacidades transversales:
 * - Selección de años lectivos dinámicos
 * - Clonación integral de año académico (POST /api/academic/year) sin arrastre de alumnos o notas
 * - Detección y visualización de inconsistencias curriculares
 * - Aplicación de valores referenciales (POST /api/academic/reference/apply)
 * - Segregación RBAC estricta (DIRECTOR edición completa, SECRETARIA solo lectura, DOCENTE bloqueado)
 * - Protección de cambios pendientes con PendingChangesContext
 * - Control de concurrencia optimista (HTTP 409 con rev)
 * - Identidad visual Google Stitch (#13594A, #0D3E34, #F6F8FA) y accesibilidad WCAG 2.2 AA.
 */

import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePendingChanges } from '../context/PendingChangesContext';
import { apiClient } from '../api/client';
import {
  AcademicConfigurationResponse,
  AcademicConfigRecord,
} from '../api/types';
import { NavRoute } from '../types';
import {
  AcademicConfigIcon,
  RefreshIcon,
  SaveIcon,
  LockIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  CalendarIcon,
  SearchIcon,
  DocConfigIcon,
} from '../components/ui/Icons';
import { DocumentaryCatalogManager } from '../components/academic/DocumentaryCatalogManager';

type TabType = 'institucion' | 'periodos' | 'curriculo' | 'valores' | 'personal' | 'catalogo_bd' | 'saneamiento_bd';

interface CalendarBlock {
  name: string;
  start: string;
  end: string;
  detail?: string;
}

interface CurriculumUnit {
  code: string;
  name: string;
  hours?: number;
  credits?: number;
  theoryHours?: number;
  practiceHours?: number;
  days?: number;
  fechaInicio?: string;
  fechaFin?: string;
  confirmed?: boolean;
  indicator1?: string;
  indicator2?: string;
}

interface ReferenceModuleData {
  module?: {
    hours?: number;
    credits?: number;
    efsrtHours?: number;
    competence?: string;
  };
  units?: Array<{
    code: string;
    name: string;
    hours?: number;
    credits?: number;
    theoryHours?: number;
    practiceHours?: number;
    days?: number;
    indicator1?: string;
    indicator2?: string;
    indicator3?: string;
    confirmed?: boolean;
  }>;
}

interface ConfiguracionAcademicaProps {
  onNavigate?: (route: NavRoute) => void;
}

const getErrorMessage = (err: unknown, fallback: string): string => {
  return (err as any)?.error || (err as any)?.message || fallback;
};

export const ConfiguracionAcademica: React.FC<ConfiguracionAcademicaProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { registerPendingChanges, unregisterPendingChanges } = usePendingChanges();

  // Estado del servidor
  const [config, setConfig] = useState<AcademicConfigurationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Selector de año y pestaña activa
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [activeTab, setActiveTab] = useState<TabType>('institucion');

  // Modales
  const [isCloneModalOpen, setIsCloneModalOpen] = useState<boolean>(false);
  const [targetCloneYear, setTargetCloneYear] = useState<string>('');
  const [isCloning, setIsCloning] = useState<boolean>(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState<boolean>(false);
  const [newPersonDni, setNewPersonDni] = useState<string>('');
  const [newPersonName, setNewPersonName] = useState<string>('');
  const [newPersonPosition, setNewPersonPosition] = useState<string>('Docente');
  const [newPersonSpecialty, setNewPersonSpecialty] = useState<string>('');
  const [newPersonTurno, setNewPersonTurno] = useState<string>('Mañana');

  // Sub-selectores dentro de pestañas
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>('');
  const [curriculumProgramFilter, setCurriculumProgramFilter] = useState<string>('TODAS');
  const [selectedDefaultsId, setSelectedDefaultsId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [personnelFilter, setPersonnelFilter] = useState<string>('');
  const [personnelRoleFilter, setPersonnelRoleFilter] = useState<'TODOS' | 'DIRECTIVOS' | 'DOCENTES' | 'ADMINISTRATIVOS'>('TODOS');

  // Estados de formularios editables (con buffer local para detectar dirty)
  const [formYear, setFormYear] = useState<Record<string, any>>({});
  const [formPeriods, setFormPeriods] = useState<Record<string, Record<string, any>>>({});
  const [formCurriculum, setFormCurriculum] = useState<Record<string, Record<string, any>>>({});
  const [formDefaults, setFormDefaults] = useState<Record<string, Record<string, any>>>({});
  const [formPersonnel, setFormPersonnel] = useState<Record<string, Record<string, any>>>({});

  // Detección de cambios sucios (dirty tracking)
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isApplyingRef, setIsApplyingRef] = useState<boolean>(false);

  // Permisos: Solo DIRECTOR puede editar o clonar
  const isEditable = useMemo(() => {
    return !!config?.editable && user?.role === 'DIRECTOR';
  }, [config?.editable, user?.role]);

  // Carga inicial y recarga
  const loadConfiguration = useCallback(async (preferredYear?: string) => {
    setIsLoading(true);
    setServerError(null);
    setConflictError(null);
    try {
      const data = await apiClient.getAcademicConfiguration();
      setConfig(data);

      // Determinar años disponibles
      const availableYears = Object.keys(data.issues || {});
      const activeYearsFromRecords = [
        ...new Set(
          data.records
            .filter((r) => r.scope.kind === 'academicYear')
            .map((r) => r.scope.target)
        ),
      ];
      const allYears = [...new Set([...availableYears, ...activeYearsFromRecords])].sort();

      const yearToSelect =
        preferredYear && allYears.includes(preferredYear)
          ? preferredYear
          : allYears.includes(selectedYear)
          ? selectedYear
          : allYears[0] || '2026';

      setSelectedYear(yearToSelect);

      // Inicializar buffers de formularios
      populateFormBuffers(data, yearToSelect);
      setIsDirty(false);
    } catch (err) {
      setServerError(getErrorMessage(err, 'Error al recuperar la configuración académica institucional.'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  // Poblar buffers locales desde los registros del servidor
  const populateFormBuffers = (data: AcademicConfigurationResponse, year: string) => {
    // 1. academicYear
    const yearRec = data.records.find(
      (r) => r.scope.kind === 'academicYear' && r.scope.target === year
    );
    if (yearRec) {
      let instJson: Record<string, any> = {};
      try {
        instJson = JSON.parse(yearRec.fields.institutionJson || '{}');
      } catch {
        instJson = {};
      }
      let calJson: CalendarBlock[] = [];
      try {
        calJson = JSON.parse(yearRec.fields.calendarJson || '[]');
      } catch {
        calJson = [];
      }
      setFormYear({
        ...yearRec.fields,
        _institution: instJson,
        _calendar: calJson,
        _rev: yearRec.rev,
      });
    } else {
      setFormYear({
        institutionJson: '{}',
        calendarJson: '[]',
        hours: 1700,
        credits: 64,
        directoryDate: `${year}-03-01`,
        directoryPlace: 'Juliaca',
        _institution: {},
        _calendar: [],
      });
    }

    // 2. academicPeriods
    const periodRecs = data.records.filter(
      (r) => r.scope.kind === 'academicPeriod' && (r.fields.year === year || r.scope.target.startsWith(`${year}-`))
    );
    const pMap: Record<string, Record<string, any>> = {};
    for (const pr of periodRecs) {
      pMap[pr.scope.target] = { ...pr.fields, _rev: pr.rev };
    }
    setFormPeriods(pMap);
    if (periodRecs.length > 0 && (!selectedPeriodId || !pMap[selectedPeriodId])) {
      setSelectedPeriodId(periodRecs[0].scope.target);
    }

    // 3. curriculum
    const curRecs = data.records.filter(
      (r) => r.scope.kind === 'curriculum' && r.fields.year === year
    );
    const cMap: Record<string, Record<string, any>> = {};
    for (const cr of curRecs) {
      let units: CurriculumUnit[] = [];
      try {
        units = JSON.parse(cr.fields.unitsJson || '[]');
      } catch {
        units = [];
      }
      cMap[cr.scope.target] = { ...cr.fields, _units: units, _rev: cr.rev };
    }
    setFormCurriculum(cMap);
    if (curRecs.length > 0 && (!selectedCurriculumId || !cMap[selectedCurriculumId])) {
      setSelectedCurriculumId(curRecs[0].scope.target);
    }

    // 4. moduleDefaults
    const defRecs = data.records.filter(
      (r) => r.scope.kind === 'moduleDefaults' && r.fields.year === year
    );
    const dMap: Record<string, Record<string, any>> = {};
    for (const dr of defRecs) {
      let dataJson: ReferenceModuleData = { module: {}, units: [] };
      try {
        dataJson = JSON.parse(dr.fields.dataJson || '{}');
      } catch {
        dataJson = { module: {}, units: [] };
      }
      dMap[dr.scope.target] = { ...dr.fields, _data: dataJson, _rev: dr.rev };
    }
    setFormDefaults(dMap);
    if (defRecs.length > 0 && (!selectedDefaultsId || !dMap[selectedDefaultsId])) {
      setSelectedDefaultsId(defRecs[0].scope.target);
    }

    // 5. personnel
    const persRecs = data.records.filter(
      (r) => r.scope.kind === 'personnel' && r.fields.year === year
    );
    const persMap: Record<string, Record<string, any>> = {};
    for (const pr of persRecs) {
      persMap[pr.scope.target] = { ...pr.fields, _rev: pr.rev };
    }
    setFormPersonnel(persMap);
  };

  // Cambio de año seleccionado
  const handleYearChange = (newYear: string) => {
    if (isDirty) {
      if (!window.confirm('Tiene cambios no guardados en el año actual. ¿Desea descartarlos y cambiar de año?')) {
        return;
      }
    }
    setSelectedYear(newYear);
    if (config) {
      populateFormBuffers(config, newYear);
    }
    setIsDirty(false);
    setSuccessMessage(null);
    setConflictError(null);
  };

  // Registro en PendingChangesContext
  useEffect(() => {
    if (isDirty) {
      registerPendingChanges({
        id: 'configuracion-academica',
        hasChanges: true,
        message: 'Tiene modificaciones sin guardar en la Configuración Académica. Si continúa perderá estos datos.',
      });
    } else {
      unregisterPendingChanges('configuracion-academica');
    }
    return () => {
      unregisterPendingChanges('configuracion-academica');
    };
  }, [isDirty, registerPendingChanges, unregisterPendingChanges]);

  const modalReturnFocusRef = useRef<HTMLElement | null>(null);
  const wasModalOpenRef = useRef(false);

  useEffect(() => {
    const anyModalOpen = isCloneModalOpen || isAddPersonModalOpen;
    if (anyModalOpen && !wasModalOpenRef.current) {
      modalReturnFocusRef.current = document.activeElement as HTMLElement | null;
    } else if (!anyModalOpen && wasModalOpenRef.current) {
      modalReturnFocusRef.current?.focus?.();
      modalReturnFocusRef.current = null;
    }
    wasModalOpenRef.current = anyModalOpen;

    if (!anyModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCloneModalOpen) setIsCloneModalOpen(false);
        if (isAddPersonModalOpen) setIsAddPersonModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCloneModalOpen, isAddPersonModalOpen]);

  // Lista de años disponibles para el selector
  const availableYearsList = useMemo(() => {
    if (!config) return ['2026'];
    const issuesYears = Object.keys(config.issues || {});
    const recordYears = config.records
      .filter((r) => r.scope.kind === 'academicYear')
      .map((r) => r.scope.target);
    return [...new Set([...issuesYears, ...recordYears, '2026'])].sort();
  }, [config]);

  // Inconsistencias curriculares del año seleccionado
  const currentYearIssues = useMemo(() => {
    if (!config?.issues) return [];
    return config.issues[selectedYear] || [];
  }, [config?.issues, selectedYear]);

  // ==========================================
  // OPERACIONES DE GUARDADO POR ÁMBITO
  // ==========================================

  // 1. Guardar Institución y Calendario
  const handleSaveYear = async () => {
    if (!isEditable) return;
    setIsSaving(true);
    setServerError(null);
    setSuccessMessage(null);
    setConflictError(null);
    try {
      const rawInst = formYear._institution || {};
      const rawCal = formYear._calendar || [];
      const fieldsPayload: Record<string, any> = {
        institutionJson: JSON.stringify(rawInst),
        calendarJson: JSON.stringify(rawCal),
        hours: Number(formYear.hours) || 1700,
        credits: Number(formYear.credits) || 64,
        directoryDate: formYear.directoryDate || '',
        directoryPlace: formYear.directoryPlace || '',
      };

      const result = await apiClient.saveDocumentConfiguration({
        scope: { kind: 'academicYear', target: selectedYear },
        fields: fieldsPayload,
        rev: formYear._rev || null,
      });

      setSuccessMessage('Parámetros institucionales y calendario lectivo actualizados exitosamente.');
      setIsDirty(false);
      await loadConfiguration(selectedYear);
    } catch (err) {
      if ((err as any)?.status === 409) {
        setConflictError('Conflicto de concurrencia: Otro usuario o proceso actualizó estos datos. Recargue para sincronizar.');
      } else {
        setServerError(getErrorMessage(err, 'Error al guardar parámetros institucionales.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Guardar Periodo Académico
  const handleSavePeriod = async (periodTarget: string) => {
    if (!isEditable) return;
    const periodData = formPeriods[periodTarget];
    if (!periodData) return;

    setIsSaving(true);
    setServerError(null);
    setSuccessMessage(null);
    setConflictError(null);
    try {
      const fieldsPayload: Record<string, any> = {
        year: selectedYear,
        fechaInicio: periodData.fechaInicio || '',
        fechaFin: periodData.fechaFin || '',
        hours: Number(periodData.hours) || 0,
        credits: Number(periodData.credits) || 0,
      };

      await apiClient.saveDocumentConfiguration({
        scope: { kind: 'academicPeriod', target: periodTarget },
        fields: fieldsPayload,
        rev: periodData._rev || null,
      });

      setSuccessMessage(`Periodo ${periodTarget} actualizado exitosamente.`);
      setIsDirty(false);
      await loadConfiguration(selectedYear);
    } catch (err) {
      if ((err as any)?.status === 409) {
        setConflictError('Conflicto de concurrencia (409): El periodo fue modificado externamente.');
      } else {
        setServerError(getErrorMessage(err, 'Error al guardar el periodo académico.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Guardar Currículo del Módulo
  const handleSaveCurriculum = async (moduleId: string) => {
    if (!isEditable) return;
    const curData = formCurriculum[moduleId];
    if (!curData) return;

    setIsSaving(true);
    setServerError(null);
    setSuccessMessage(null);
    setConflictError(null);
    try {
      const unitsArray = curData._units || [];
      const fieldsPayload: Record<string, any> = {
        year: selectedYear,
        periodId: curData.periodId || `${selectedYear}-I`,
        nombre: curData.nombre || '',
        programName: curData.programName || '',
        programCode: curData.programCode || '',
        programHours: Number(curData.programHours) || 0,
        programCredits: Number(curData.programCredits) || 0,
        nivelFormativo: curData.nivelFormativo || 'Auxiliar Técnico',
        turno: curData.turno || '',
        teacherNames: curData.teacherNames || '',
        hours: Number(curData.hours) || 0,
        credits: Number(curData.credits) || 0,
        efsrtHours: Number(curData.efsrtHours) || 0,
        unitsJson: JSON.stringify(unitsArray),
      };

      await apiClient.saveDocumentConfiguration({
        scope: { kind: 'curriculum', target: moduleId },
        fields: fieldsPayload,
        rev: curData._rev || null,
      });

      setSuccessMessage(`Plan curricular de ${curData.nombre || moduleId} actualizado exitosamente.`);
      setIsDirty(false);
      await loadConfiguration(selectedYear);
    } catch (err) {
      if ((err as any)?.status === 409) {
        setConflictError('Conflicto de concurrencia (409): El plan curricular fue modificado externamente.');
      } else {
        setServerError(getErrorMessage(err, 'Error al guardar el plan curricular.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Aplicar Valores de Referencia a Currículo
  const handleApplyReference = async (moduleId: string) => {
    if (!isEditable) return;
    const curData = formCurriculum[moduleId];
    if (!curData) return;

    if (!window.confirm(`¿Desea aplicar los valores referenciales oficiales al plan del módulo "${curData.nombre || moduleId}"? Esto sobrescribirá las unidades y competencias con el catálogo oficial.`)) {
      return;
    }

    setIsApplyingRef(true);
    setServerError(null);
    setSuccessMessage(null);
    try {
      await apiClient.applyReferenceDefaults({
        moduleId,
        rev: curData._rev,
      });
      setSuccessMessage('Valores de referencia aplicados correctamente al plan curricular.');
      setIsDirty(false);
      await loadConfiguration(selectedYear);
    } catch (err) {
      setServerError(getErrorMessage(err, 'Error al aplicar los valores referenciales.'));
    } finally {
      setIsApplyingRef(false);
    }
  };

  // 5. Guardar Valores de Referencia
  const handleSaveDefaults = async (moduleId: string) => {
    if (!isEditable) return;
    const defData = formDefaults[moduleId];
    if (!defData) return;

    setIsSaving(true);
    setServerError(null);
    setSuccessMessage(null);
    setConflictError(null);
    try {
      const dataJsonObj = defData._data || { module: {}, units: [] };
      const fieldsPayload: Record<string, any> = {
        year: selectedYear,
        source: defData.source || '',
        notes: defData.notes || '',
        dataJson: JSON.stringify(dataJsonObj),
      };

      await apiClient.saveDocumentConfiguration({
        scope: { kind: 'moduleDefaults', target: moduleId },
        fields: fieldsPayload,
        rev: defData._rev || null,
      });

      setSuccessMessage('Valores de referencia oficiales actualizados exitosamente.');
      setIsDirty(false);
      await loadConfiguration(selectedYear);
    } catch (err) {
      if ((err as any)?.status === 409) {
        setConflictError('Conflicto de concurrencia: Los valores referenciales fueron modificados externamente.');
      } else {
        setServerError(getErrorMessage(err, 'Error al guardar valores de referencia.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Guardar Persona en Directorio
  const handleSavePerson = async (targetId: string) => {
    if (!isEditable) return;
    const person = formPersonnel[targetId];
    if (!person) return;

    setIsSaving(true);
    setServerError(null);
    setSuccessMessage(null);
    setConflictError(null);
    try {
      const fieldsPayload: Record<string, any> = {
        year: selectedYear,
        name: person.name || '',
        document: person.document || '',
        position: person.position || '',
        specialty: person.specialty || '',
        email: person.email || '',
        phone: person.phone || '',
        birthday: person.birthday || '',
        address: person.address || '',
        referenceTurno: person.referenceTurno || '',
        sourceNote: person.sourceNote || '',
      };

      await apiClient.saveDocumentConfiguration({
        scope: { kind: 'personnel', target: targetId },
        fields: fieldsPayload,
        rev: person._rev || null,
      });

      setSuccessMessage(`Ficha de personal "${person.name}" actualizada exitosamente.`);
      setIsDirty(false);
      await loadConfiguration(selectedYear);
    } catch (err) {
      if ((err as any)?.status === 409) {
        setConflictError('Conflicto de concurrencia: La ficha de personal fue modificada externamente.');
      } else {
        setServerError(getErrorMessage(err, 'Error al guardar la ficha de personal.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 7. Registrar Nueva Persona en el Directorio
  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) return;
    if (!/^\d{8}$/.test(newPersonDni.trim())) {
      setCloneError('El DNI debe contener exactamente 8 dígitos numéricos.');
      return;
    }
    if (!newPersonName.trim()) {
      setCloneError('Ingrese los apellidos y nombres completos de la persona.');
      return;
    }

    const targetKey = `${selectedYear}:${newPersonDni.trim()}`;
    setIsSaving(true);
    setServerError(null);
    try {
      await apiClient.saveDocumentConfiguration({
        scope: { kind: 'personnel', target: targetKey },
        fields: {
          year: selectedYear,
          document: newPersonDni.trim(),
          name: newPersonName.trim(),
          position: newPersonPosition,
          specialty: newPersonSpecialty,
          referenceTurno: newPersonTurno,
          sourceNote: `Registrado para año ${selectedYear}`,
        },
        rev: null,
      });

      setIsAddPersonModalOpen(false);
      setNewPersonDni('');
      setNewPersonName('');
      setNewPersonSpecialty('');
      setSuccessMessage(`Personal ${newPersonName.trim()} incorporado al directorio institucional ${selectedYear}.`);
      await loadConfiguration(selectedYear);
    } catch (err) {
      setServerError(getErrorMessage(err, 'Error al incorporar la persona al directorio.'));
    } finally {
      setIsSaving(false);
    }
  };

  // 8. Clonar Año Académico
  const handleCloneYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) return;
    const yearCandidate = targetCloneYear.trim();
    if (!/^\d{4}$/.test(yearCandidate)) {
      setCloneError('El nuevo año lectivo debe constar de 4 cifras numéricas (ej.: 2027).');
      return;
    }
    if (availableYearsList.includes(yearCandidate)) {
      setCloneError(`El año ${yearCandidate} ya se encuentra registrado en el sistema institucional.`);
      return;
    }

    setIsCloning(true);
    setCloneError(null);
    try {
      const result = await apiClient.cloneAcademicYear({
        sourceYear: selectedYear,
        year: yearCandidate,
      });

      setIsCloneModalOpen(false);
      setTargetCloneYear('');
      setSuccessMessage(result.message || `Año lectivo ${yearCandidate} clonado y preparado correctamente.`);
      await loadConfiguration(yearCandidate);
    } catch (err) {
      setCloneError(getErrorMessage(err, 'Error durante la clonación del año lectivo.'));
    } finally {
      setIsCloning(false);
    }
  };

  // Helper para añadir bloque de calendario
  const handleAddCalendarBlock = () => {
    if (!isEditable) return;
    const cal = formYear._calendar || [];
    const newBlock: CalendarBlock = {
      name: `Periodo lectivo (${selectedYear}-III)`,
      start: `${selectedYear}-09-01`,
      end: `${selectedYear}-12-15`,
      detail: 'Nuevo bloque calendarizado',
    };
    setFormYear({
      ...formYear,
      _calendar: [...cal, newBlock],
    });
    setIsDirty(true);
  };

  const handleRemoveCalendarBlock = (index: number) => {
    if (!isEditable) return;
    const cal = formYear._calendar || [];
    const updated = cal.filter((_: any, i: number) => i !== index);
    setFormYear({
      ...formYear,
      _calendar: updated,
    });
    setIsDirty(true);
  };

  const handleUpdateCalendarBlock = (index: number, field: keyof CalendarBlock, value: string) => {
    if (!isEditable) return;
    const cal = [...(formYear._calendar || [])];
    if (cal[index]) {
      cal[index] = { ...cal[index], [field]: value };
      setFormYear({
        ...formYear,
        _calendar: cal,
      });
      setIsDirty(true);
    }
  };

  // Helper para actualizar unidad curricular
  const handleUpdateUnit = (moduleId: string, unitIndex: number, field: keyof CurriculumUnit, value: any) => {
    if (!isEditable) return;
    const cur = formCurriculum[moduleId];
    if (!cur) return;
    const units = [...(cur._units || [])];
    if (units[unitIndex]) {
      units[unitIndex] = { ...units[unitIndex], [field]: value };
      setFormCurriculum({
        ...formCurriculum,
        [moduleId]: {
          ...cur,
          _units: units,
        },
      });
      setIsDirty(true);
    }
  };

  // Renderizado condicional mientras carga
  if (isLoading && !config) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-muted">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-ink">Cargando configuración académica institucional...</p>
        <span className="text-xs text-muted mt-1">Recuperando calendarios, periodos, planes y directorio</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ========================================== */}
      {/* 1. CABECERA GENERAL Y RESUMEN EJECUTIVO    */}
      {/* ========================================== */}
      <DashboardPhotoBand as="header" scene="calendario" contentClassName="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-soft text-brand border border-brand/30">
                <AcademicConfigIcon className="w-3.5 h-3.5" />
                Gestión Anual Institucional
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isEditable
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                }`}
              >
                {isEditable ? (
                  <>
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    Edición autorizada (Dirección)
                  </>
                ) : (
                  <>
                    <LockIcon className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    Modo Consulta Institucional (Solo lectura)
                  </>
                )}
              </span>
            </div>
            <h1 className="text-2xl sm:text-[30px] sm:leading-[36px] font-black text-ink tracking-tight">
              Configuración Anual del CETPRO (Año Escolar)
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Define los datos oficiales de la institución, el calendario de semestres, los planes de estudio (módulos y unidades) y la plana docente para el año seleccionado. Todo cambio guardado aquí actualiza automáticamente los <span className="tabular-nums">21</span> formatos oficiales MINEDU.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => loadConfiguration(selectedYear)}
              disabled={isLoading}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ink bg-surface border border-line rounded-[10px] hover:bg-surface-alt transition-colors cursor-pointer disabled:opacity-50"
              title="Recargar configuración desde el servidor"
            >
              <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Recargar
            </button>

            {isEditable && (
              <button
                type="button"
                onClick={() => {
                  setTargetCloneYear(String(Number(selectedYear) + 1));
                  setCloneError(null);
                  setIsCloneModalOpen(true);
                }}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-on-brand bg-brand hover:opacity-90 rounded-[10px] shadow-[var(--ui-shadow)] transition-opacity cursor-pointer"
                title="Crea la configuración de un nuevo año copiando carreras, módulos, unidades y docentes del año actual, sin copiar matrículas ni notas"
              >
                <CalendarIcon className="w-4 h-4" />
                Aperturar Nuevo Año Escolar (Copiar estructura)
              </button>
            )}
          </div>
        </div>

        {/* Barra de herramientas: Selector de Año */}
        <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="year-select" className="text-sm font-bold text-ink">
              Año escolar en gestión:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="min-h-[44px] px-3.5 py-1.5 text-sm font-bold tabular-nums text-brand bg-brand-soft border border-brand/30 rounded-[10px]"
            >
              {availableYearsList.map((y) => (
                <option key={y} value={y}>
                  Año escolar {y}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted tabular-nums">
              ({(config?.records.filter((r) => r.scope.target.includes(selectedYear) || r.fields.year === selectedYear) || []).length} registros vinculados al año {selectedYear})
            </span>
          </div>

          {!isEditable && (
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-800/60">
              <LockIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Modo Consulta Institucional (Solo lectura — la edición anual está reservada a Dirección)</span>
            </div>
          )}
        </div>

        {/* Tarjetas KPI de Resumen Ejecutivo del Año Seleccionado */}
        {(() => {
          const periodKeys = Object.keys(formPeriods);
          const careerSet = new Set(
            Object.values(formCurriculum)
              .map((c) => c.programName)
              .filter(Boolean)
          );
          const modulesCount = Object.keys(formCurriculum).length;
          const allUnits = Object.values(formCurriculum).flatMap((c) => c._units || []);
          const totalUnitsCount = allUnits.length;
          const confirmedUnitsCount = allUnits.filter((u: CurriculumUnit) => u.confirmed).length;
          const personnelCount = Object.keys(formPersonnel).length;

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-surface-alt border border-line">
                <span className="text-xs font-bold text-muted block">
                  Periodos / Semestres
                </span>
                <p className="text-sm font-black text-ink mt-1 tabular-nums">
                  {periodKeys.length} semestres configurados
                </p>
                <span className="text-xs text-brand font-semibold tabular-nums">
                  {periodKeys.length > 0 ? periodKeys.join(', ') : `${selectedYear}-I, ${selectedYear}-II`}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-alt border border-line">
                <span className="text-xs font-bold text-muted block">
                  Carreras y Módulos Formativos
                </span>
                <p className="text-sm font-black text-ink mt-1 tabular-nums">
                  {careerSet.size} carreras · {modulesCount} módulos
                </p>
                <span className="text-xs text-muted tabular-nums">
                  Oferta formativa activa {selectedYear}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-alt border border-line">
                <span className="text-xs font-bold text-muted block">
                  Unidades Didácticas Programadas
                </span>
                <p className="text-sm font-black text-ink mt-1 tabular-nums">
                  {totalUnitsCount} UDs en total
                </p>
                <span className="text-xs text-brand font-semibold tabular-nums">
                  ✓ {confirmedUnitsCount} Confirmadas
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-alt border border-line">
                <span className="text-xs font-bold text-muted block">
                  Personal en Directorio
                </span>
                <p className="text-sm font-black text-ink mt-1 tabular-nums">
                  {personnelCount} trabajadores registrados
                </p>
                <span className="text-xs text-muted">
                  Directivos, docentes y adm.
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-alt border border-line">
                <span className="text-xs font-bold text-muted block">
                  Estado de Consistencia
                </span>
                <p
                  className={`text-sm font-black mt-1 tabular-nums ${
                    currentYearIssues.length === 0
                      ? 'text-brand'
                      : 'text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {currentYearIssues.length === 0
                    ? '✓ 100% Consistente'
                    : `${currentYearIssues.length} observaciones por revisar`}
                </p>
                <span className="text-xs text-muted">
                  Cuadre de horas y créditos
                </span>
              </div>
            </div>
          );
        })()}
      </DashboardPhotoBand>

      {/* ========================================== */}
      {/* 2. ALERTAS Y CONFLICTOS                    */}
      {/* ========================================== */}
      {serverError && (
        <div role="alert" className="p-4 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/60 rounded-xl flex items-start gap-3 text-red-800 dark:text-rose-200">
          <AlertCircleIcon className="w-5 h-5 text-red-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm min-w-0">
            <p className="font-bold">Error en la operación</p>
            <p className="mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {conflictError && (
        <div role="alert" className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl flex items-start justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3 min-w-0">
            <AlertCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm min-w-0">
              <p className="font-bold">Conflicto de concurrencia detectado (HTTP <span className="tabular-nums">409</span>)</p>
              <p className="mt-0.5">{conflictError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadConfiguration(selectedYear)}
            className="min-h-[40px] px-3 py-1.5 bg-amber-800 dark:bg-amber-700 text-white text-xs font-bold rounded-[10px] hover:bg-amber-900 dark:hover:bg-amber-600 shrink-0 cursor-pointer"
          >
            Sincronizar ahora
          </button>
        </div>
      )}

      {successMessage && (
        <div role="status" className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start justify-between gap-3 text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-3 min-w-0">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm font-semibold">{successMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="min-h-[36px] px-2 text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-200 font-bold cursor-pointer shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Banner de Inconsistencias Curriculares */}
      {currentYearIssues.length > 0 ? (
        <div role="alert" className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 dark:border-amber-400 p-4 rounded-r-xl space-y-2 border border-amber-200 dark:border-amber-800/60">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
            <AlertCircleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Inconsistencias curriculares detectadas (<span className="tabular-nums">{currentYearIssues.length}</span>)</span>
          </div>
          <ul className="list-disc list-inside text-xs text-amber-800 dark:text-amber-300 space-y-1 pl-2">
            {currentYearIssues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Planes curriculares consistentes para el año lectivo <span className="tabular-nums">{selectedYear}</span>. No se detectan omisiones de horas o créditos.</span>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. LAS 7 PESTAÑAS PRINCIPALES              */}
      {/* ========================================== */}
      <div className="bg-surface rounded-2xl shadow-[var(--ui-shadow)] border border-line overflow-hidden">
        <div className="border-b border-line bg-surface-alt px-6 pt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('institucion')}
            className={`min-h-[44px] px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'institucion'
                ? 'border-brand text-brand bg-surface rounded-t-[10px] shadow-[var(--ui-shadow)]'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <DocConfigIcon className="w-4 h-4 shrink-0" />
            1. Datos del CETPRO y Calendario
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('periodos')}
            className={`min-h-[44px] px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'periodos'
                ? 'border-brand text-brand bg-surface rounded-t-[10px] shadow-[var(--ui-shadow)]'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <CalendarIcon className="w-4 h-4 shrink-0" />
            2. Semestres del Año (<span className="tabular-nums">{selectedYear}-I / {selectedYear}-II</span>)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('curriculo')}
            className={`min-h-[44px] px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'curriculo'
                ? 'border-brand text-brand bg-surface rounded-t-[10px] shadow-[var(--ui-shadow)]'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <AcademicConfigIcon className="w-4 h-4 shrink-0" />
            3. Carreras, Módulos y Unidades Didácticas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('valores')}
            className={`min-h-[44px] px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'valores'
                ? 'border-brand text-brand bg-surface rounded-t-[10px] shadow-[var(--ui-shadow)]'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <DocConfigIcon className="w-4 h-4 shrink-0" />
            4. Plantilla Oficial MINEDU (Referencia)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`min-h-[44px] px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'personal'
                ? 'border-brand text-brand bg-surface rounded-t-[10px] shadow-[var(--ui-shadow)]'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <SearchIcon className="w-4 h-4 shrink-0" />
            5. Directorio de Docentes y Personal
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalogo_bd')}
            className={`min-h-[44px] px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'catalogo_bd'
                ? 'border-brand text-brand bg-surface rounded-t-[10px] shadow-[var(--ui-shadow)]'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <AcademicConfigIcon className="w-4 h-4 shrink-0" />
            6. Competencias, Capacidades e Indicadores
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saneamiento_bd')}
            className={`min-h-[44px] px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'saneamiento_bd'
                ? 'border-brand text-brand bg-surface rounded-t-[10px] shadow-[var(--ui-shadow)]'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            7. Auditoría y Subsanación del Expediente (<span className="tabular-nums">16</span> verificadas)
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white tabular-nums">
              ✓ 16 verificadas
            </span>
          </button>
        </div>

        <div className="p-6">
          {/* ======================================================== */}
          {/* TAB 1: DATOS DEL CETPRO Y CALENDARIO (academicYear)      */}
          {/* ======================================================== */}
          {activeTab === 'institucion' && (
            <div className="space-y-6">
              {/* Banner Explicativo Pestaña 1 */}
              <div className="bg-brand-soft border border-brand/30 rounded-xl p-4 space-y-1">
                <p className="text-sm font-bold text-brand">
                  ⓘ ¿Para qué sirve esta sección?
                </p>
                <p className="text-xs text-ink/90 leading-relaxed">
                  Aquí se definen los <strong>datos oficiales del CETPRO</strong> (nombre, código modular, resoluciones, DRE/UGEL, ubicación y autoridades firmantes) y el <strong>calendario anual de actividades</strong>. Alimenta automáticamente el membrete, pie de firma y datos de cabecera de los <strong><span className="tabular-nums">21</span> formatos oficiales MINEDU</strong> (Carátula, Calendarización, Directorio, Nóminas, Registros de Asistencia y Evaluación, Actas y Consolidado EFSRT).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-ink">
                    1. Datos Oficiales del CETPRO y Calendarización Anual (<span className="tabular-nums">{selectedYear}</span>)
                  </h2>
                  <p className="text-xs text-muted">
                    Identificación institucional, ubicación geográfica, autoridades firmantes y cronograma anual.
                  </p>
                </div>
                {isEditable && (
                  <button
                    type="button"
                    onClick={handleSaveYear}
                    disabled={isSaving}
                    className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-on-brand bg-brand hover:opacity-90 rounded-[10px] shadow-[var(--ui-shadow)] transition-opacity cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <SaveIcon className="w-4 h-4" />
                    {isSaving ? 'Guardando...' : 'Guardar datos del CETPRO y calendario'}
                  </button>
                )}
              </div>

              {/* Parámetros anuales declarados */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-surface-alt rounded-xl border border-line">
                <div>
                  <label htmlFor="year-hours" className="block text-xs font-bold text-ink mb-1">
                    Total de Horas Académicas Anuales — Meta Referencial
                  </label>
                  <input
                    id="year-hours"
                    type="number"
                    disabled={!isEditable}
                    value={formYear.hours ?? ''}
                    onChange={(e) => {
                      setFormYear({ ...formYear, hours: Number(e.target.value) });
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface border border-line rounded-[10px] disabled:opacity-60 text-ink font-semibold tabular-nums"
                    placeholder="1700"
                  />
                  <span className="block text-xs text-muted mt-1">
                    ⓘ Ej. real: <span className="tabular-nums">1056</span> h (<span className="tabular-nums">2</span> semestres de <span className="tabular-nums">528</span> h) o <span className="tabular-nums">1700</span> h meta anual.
                  </span>
                </div>

                <div>
                  <label htmlFor="year-credits" className="block text-xs font-bold text-ink mb-1">
                    Total de Créditos Anuales
                  </label>
                  <input
                    id="year-credits"
                    type="number"
                    disabled={!isEditable}
                    value={formYear.credits ?? ''}
                    onChange={(e) => {
                      setFormYear({ ...formYear, credits: Number(e.target.value) });
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface border border-line rounded-[10px] disabled:opacity-60 text-ink font-semibold tabular-nums"
                    placeholder="64"
                  />
                  <span className="block text-xs text-muted mt-1">
                    ⓘ Ej. real: <span className="tabular-nums">40</span> a <span className="tabular-nums">64</span> créditos acumulados en el año escolar.
                  </span>
                </div>

                <div>
                  <label htmlFor="year-dir-date" className="block text-xs font-bold text-ink mb-1">
                    Fecha de Emisión del Directorio Institucional
                  </label>
                  <input
                    id="year-dir-date"
                    type="date"
                    disabled={!isEditable}
                    value={formYear.directoryDate || ''}
                    onChange={(e) => {
                      setFormYear({ ...formYear, directoryDate: e.target.value });
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface border border-line rounded-[10px] disabled:opacity-60 text-ink tabular-nums"
                  />
                  <span className="block text-xs text-muted mt-1">
                    ⓘ Fecha impresa en el Formato <span className="tabular-nums">04</span> (Directorio) y documentos.
                  </span>
                </div>

                <div>
                  <label htmlFor="year-dir-place" className="block text-xs font-bold text-ink mb-1">
                    Ciudad / Lugar de Emisión de Documentos
                  </label>
                  <input
                    id="year-dir-place"
                    type="text"
                    disabled={!isEditable}
                    value={formYear.directoryPlace || ''}
                    onChange={(e) => {
                      setFormYear({ ...formYear, directoryPlace: e.target.value });
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface border border-line rounded-[10px] disabled:opacity-60 text-ink"
                    placeholder="Juliaca"
                  />
                  <span className="block text-xs text-muted mt-1">
                    ⓘ Ej. real: Juliaca — se imprime junto a la fecha de firma.
                  </span>
                </div>
              </div>

              {/* Bloque 1: Identificación Oficial y Resoluciones */}
              <div className="p-4 rounded-xl border border-line bg-surface space-y-4">
                <h3 className="text-sm font-bold text-brand uppercase tracking-wide border-b border-line pb-2">
                  Bloque 1: Identificación Oficial y Resoluciones
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="inst-nombre" className="block text-xs font-semibold text-ink mb-1">
                      Nombre Oficial del CETPRO
                    </label>
                    <input
                      id="inst-nombre"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.nombre || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, nombre: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="CETPRO Micaela Bastidas"
                    />
                  </div>

                  <div>
                    <label htmlFor="inst-codmod" className="block text-xs font-semibold text-ink mb-1">
                      Código Modular MINEDU
                    </label>
                    <input
                      id="inst-codmod"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.codigoModular || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, codigoModular: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="1027648"
                    />
                  </div>

                  <div>
                    <label htmlFor="inst-gestion" className="block text-xs font-semibold text-ink mb-1">
                      Tipo de Gestión
                    </label>
                    <input
                      id="inst-gestion"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.tipoGestion || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, tipoGestion: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="Pública Directa / Sector Educación"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label htmlFor="inst-res-auth" className="block text-xs font-semibold text-ink mb-1">
                      Resolución de Autorización
                    </label>
                    <input
                      id="inst-res-auth"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.resolucionAutorizacion || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, resolucionAutorizacion: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="R.D. N.° 0452-DREP"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="inst-res-conv" className="block text-xs font-semibold text-ink mb-1">
                      Resolución de Conversión
                    </label>
                    <input
                      id="inst-res-conv"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.resolucionConversion || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, resolucionConversion: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="R.D.R. N.° 1280-DREP"
                    />
                  </div>
                </div>
              </div>

              {/* Bloque 2: Ubicación Geográfica y Contacto */}
              <div className="p-4 rounded-xl border border-line bg-surface space-y-4">
                <h3 className="text-sm font-bold text-brand uppercase tracking-wide border-b border-line pb-2">
                  Bloque 2: Ubicación Geográfica y Contacto
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="inst-dre" className="block text-xs font-semibold text-ink mb-1">
                      Dirección Regional DRE
                    </label>
                    <input
                      id="inst-dre"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.dre || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, dre: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="DRE Puno"
                    />
                  </div>

                  <div>
                    <label htmlFor="inst-ugel" className="block text-xs font-semibold text-ink mb-1">
                      UGEL de Jurisdicción
                    </label>
                    <input
                      id="inst-ugel"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.ugel || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, ugel: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="UGEL San Román"
                    />
                  </div>

                  <div>
                    <label htmlFor="inst-region" className="block text-xs font-semibold text-ink mb-1">
                      Región
                    </label>
                    <input
                      id="inst-region"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.region || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, region: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="Puno"
                    />
                  </div>

                  <div>
                    <label htmlFor="inst-depto" className="block text-xs font-semibold text-ink mb-1">
                      Departamento
                    </label>
                    <input
                      id="inst-depto"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.departamento || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, departamento: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="Puno"
                    />
                  </div>

                  <div>
                    <label htmlFor="inst-prov" className="block text-xs font-semibold text-ink mb-1">
                      Provincia
                    </label>
                    <input
                      id="inst-prov"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.provincia || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, provincia: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="San Román"
                    />
                  </div>

                  <div>
                    <label htmlFor="inst-dist" className="block text-xs font-semibold text-ink mb-1">
                      Distrito
                    </label>
                    <input
                      id="inst-dist"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.distrito || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, distrito: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="Juliaca"
                    />
                  </div>

                  <div>
                    <label htmlFor="inst-lugar" className="block text-xs font-semibold text-ink mb-1">
                      Lugar de Emisión
                    </label>
                    <input
                      id="inst-lugar"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.lugar || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, lugar: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="Juliaca"
                    />
                  </div>

                  <div>
                    <label htmlFor="inst-dir" className="block text-xs font-semibold text-ink mb-1">
                      Dirección Institucional
                    </label>
                    <input
                      id="inst-dir"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.direccion || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, direccion: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="Jr. Mariano Núñez N.° 425"
                    />
                  </div>

                  <div>
                    <label htmlFor="inst-tel" className="block text-xs font-semibold text-ink mb-1">
                      Teléfono Institucional
                    </label>
                    <input
                      id="inst-tel"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.telefono || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, telefono: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="(051) 321456"
                    />
                  </div>
                </div>
              </div>

              {/* Bloque 3: Autoridades que Firman Documentos Oficiales */}
              <div className="p-4 rounded-xl border border-line bg-surface space-y-4">
                <h3 className="text-sm font-bold text-brand uppercase tracking-wide border-b border-line pb-2">
                  Bloque 3: Autoridades que Firman Documentos Oficiales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="inst-director" className="block text-xs font-semibold text-ink mb-1">
                      Nombre Completo del Director/a — Firma Oficial
                    </label>
                    <input
                      id="inst-director"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.directorNombre || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, directorNombre: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink font-semibold"
                      placeholder="Lic. Eloy Valerio Paredes Feliciano"
                    />
                  </div>

                  <div>
                    <label htmlFor="inst-secretaria" className="block text-xs font-semibold text-ink mb-1">
                      Nombre de Secretaría Académica
                    </label>
                    <input
                      id="inst-secretaria"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.secretariaNombre || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, secretariaNombre: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="Prof. Carmen Vilca"
                    />
                  </div>

                  <div>
                    <label htmlFor="inst-coordinador" className="block text-xs font-semibold text-ink mb-1">
                      Nombre de Coordinación Académica
                    </label>
                    <input
                      id="inst-coordinador"
                      type="text"
                      disabled={!isEditable}
                      value={formYear._institution?.coordinadorNombre || ''}
                      onChange={(e) => {
                        setFormYear({
                          ...formYear,
                          _institution: { ...formYear._institution, coordinadorNombre: e.target.value },
                        });
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                      placeholder="Coordinación Académica"
                    />
                  </div>
                </div>
              </div>

              {/* Calendarización del año lectivo (calendarJson) */}
              <div className="space-y-3 pt-4 border-t border-line">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-ink uppercase tracking-wide">
                      Calendario Anual de Actividades (<span className="tabular-nums">{formYear._calendar?.length || 0}</span> bloques)
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      ⓘ <strong>Vínculo automático con Semestres:</strong> Mantener el código entre paréntesis <code className="tabular-nums">({selectedYear}-I)</code> o <code className="tabular-nums">({selectedYear}-II)</code> junto al nombre del bloque vincula y sincroniza automáticamente sus fechas con la <strong>Pestaña 2 de Semestres</strong>.
                    </p>
                  </div>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={handleAddCalendarBlock}
                      className="min-h-[44px] px-3.5 py-2 text-xs font-bold text-brand bg-brand-soft border border-brand/30 rounded-[10px] hover:opacity-90 cursor-pointer shrink-0"
                    >
                      + Añadir bloque de calendario
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto border border-line rounded-xl">
                  <table className="min-w-full divide-y divide-line text-left text-xs">
                    <thead className="bg-surface-alt text-muted font-bold">
                      <tr>
                        <th className="px-4 py-2.5">Bloque / Actividad — mantenga ({selectedYear}-I) o ({selectedYear}-II) para sincronizar</th>
                        <th className="px-4 py-2.5">Fecha de Inicio</th>
                        <th className="px-4 py-2.5">Fecha de Término</th>
                        <th className="px-4 py-2.5">Detalle / Observaciones</th>
                        {isEditable && <th className="px-4 py-2.5 text-right">Acción</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-surface">
                      {(formYear._calendar || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-muted">
                            No hay bloques de calendarización registrados.
                          </td>
                        </tr>
                      ) : (
                        (formYear._calendar || []).map((row: CalendarBlock, idx: number) => (
                          <tr key={idx} className="hover:bg-surface-alt/60 transition-colors">
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                aria-label={`Bloque de calendario ${idx + 1}`}
                                disabled={!isEditable}
                                value={row.name}
                                onChange={(e) => handleUpdateCalendarBlock(idx, 'name', e.target.value)}
                                className="w-full min-h-[38px] px-2.5 py-1.5 text-sm border border-line bg-surface-alt text-ink rounded-[10px] font-medium disabled:opacity-60"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="date"
                                aria-label={`Fecha inicio bloque ${idx + 1}`}
                                disabled={!isEditable}
                                value={row.start}
                                onChange={(e) => handleUpdateCalendarBlock(idx, 'start', e.target.value)}
                                className="w-full min-h-[38px] px-2.5 py-1.5 text-sm tabular-nums border border-line bg-surface-alt text-ink rounded-[10px] disabled:opacity-60"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="date"
                                aria-label={`Fecha término bloque ${idx + 1}`}
                                disabled={!isEditable}
                                value={row.end}
                                onChange={(e) => handleUpdateCalendarBlock(idx, 'end', e.target.value)}
                                className="w-full min-h-[38px] px-2.5 py-1.5 text-sm tabular-nums border border-line bg-surface-alt text-ink rounded-[10px] disabled:opacity-60"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                aria-label={`Detalle bloque ${idx + 1}`}
                                disabled={!isEditable}
                                value={row.detail || ''}
                                onChange={(e) => handleUpdateCalendarBlock(idx, 'detail', e.target.value)}
                                className="w-full min-h-[38px] px-2.5 py-1.5 text-sm border border-line bg-surface-alt text-ink rounded-[10px] disabled:opacity-60"
                                placeholder="Notas u observaciones"
                              />
                            </td>
                            {isEditable && (
                              <td className="px-4 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCalendarBlock(idx)}
                                  className="min-h-[36px] px-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-bold cursor-pointer"
                                  title="Eliminar bloque"
                                >
                                  Quitar
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: SEMESTRES DEL AÑO (academicPeriod)                */}
          {/* ======================================================== */}
          {activeTab === 'periodos' && (
            <div className="space-y-6">
              {/* Banner Explicativo Pestaña 2 */}
              <div className="bg-brand-soft border border-brand/30 rounded-xl p-4 space-y-1">
                <p className="text-sm font-bold text-brand">
                  ⓘ ¿Para qué sirve esta sección?
                </p>
                <p className="text-xs text-ink/90 leading-relaxed">
                  Configura las fechas de inicio y término, horas y créditos de cada <strong>semestre lectivo (<span className="tabular-nums">{selectedYear}-I y {selectedYear}-II</span>)</strong>. Estas fechas delimitan las semanas de asistencia, la vigencia de las matrículas y alimentan los formatos de <strong>Calendarización (Formato <span className="tabular-nums">02</span>), Nóminas de Matrícula, Registros de Asistencia/Evaluación y Actas Oficiales MINEDU</strong>.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    2. Semestres Lectivos del Año Escolar <span className="tabular-nums">{selectedYear}</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Ventanas oficiales de clases, evaluación y cierre de cada módulo formativo semestral.
                  </p>
                </div>
              </div>

              {/* Lista de periodos disponibles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(formPeriods).length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-muted bg-surface-alt rounded-xl border border-dashed border-line">
                    No se encontraron periodos académicos para el año <span className="tabular-nums">{selectedYear}</span>.
                  </div>
                ) : (
                  Object.entries(formPeriods).map(([target, pr]) => {
                    const isFirstSemester = target.endsWith('-I');
                    const isSecondSemester = target.endsWith('-II');
                    const semesterTitle = isFirstSemester
                      ? `Primer Semestre Lectivo (${target}) — Módulo I`
                      : isSecondSemester
                      ? `Segundo Semestre Lectivo (${target}) — Módulo II`
                      : `Semestre Lectivo (${target})`;

                    return (
                      <div
                        key={target}
                        className="p-5 bg-surface rounded-xl border border-line shadow-[var(--ui-shadow)] space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-line pb-3 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <CalendarIcon className="w-5 h-5 text-brand shrink-0" />
                            <span className="text-base font-bold text-ink">
                              {semesterTitle}
                            </span>
                          </div>
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() => handleSavePeriod(target)}
                              disabled={isSaving}
                              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-on-brand bg-brand hover:opacity-90 rounded-[10px] shadow-[var(--ui-shadow)] transition-opacity cursor-pointer disabled:opacity-50 shrink-0"
                            >
                              <SaveIcon className="w-3.5 h-3.5" />
                              Guardar semestre
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <label htmlFor={`period-start-${target}`} className="block font-semibold text-ink mb-1">
                              Fecha de inicio de clases ({target})
                            </label>
                            <input
                              id={`period-start-${target}`}
                              type="date"
                              disabled={!isEditable}
                              value={pr.fechaInicio || ''}
                              onChange={(e) => {
                                setFormPeriods({
                                  ...formPeriods,
                                  [target]: { ...pr, fechaInicio: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-full min-h-[44px] px-3 py-2 text-sm tabular-nums bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                            />
                            <span className="block text-xs text-muted mt-1">
                              Primer día hábil de clases del semestre.
                            </span>
                          </div>

                          <div>
                            <label htmlFor={`period-end-${target}`} className="block font-semibold text-ink mb-1">
                              Fecha de término y cierre ({target})
                            </label>
                            <input
                              id={`period-end-${target}`}
                              type="date"
                              disabled={!isEditable}
                              value={pr.fechaFin || ''}
                              onChange={(e) => {
                                setFormPeriods({
                                  ...formPeriods,
                                  [target]: { ...pr, fechaFin: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-full min-h-[44px] px-3 py-2 text-sm tabular-nums bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink"
                            />
                            <span className="block text-xs text-muted mt-1">
                              Fecha de clausura y emisión de actas del módulo.
                            </span>
                          </div>

                          <div>
                            <label htmlFor={`period-hours-${target}`} className="block font-semibold text-ink mb-1">
                              Horas académicas del semestre
                            </label>
                            <input
                              id={`period-hours-${target}`}
                              type="number"
                              disabled={!isEditable}
                              value={pr.hours ?? ''}
                              onChange={(e) => {
                                setFormPeriods({
                                  ...formPeriods,
                                  [target]: { ...pr, hours: Number(e.target.value) },
                                });
                                setIsDirty(true);
                              }}
                              className="w-full min-h-[44px] px-3 py-2 text-sm tabular-nums bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink font-semibold"
                              placeholder="528"
                            />
                            <span className="block text-xs text-muted mt-1">
                              Horas pedagógicas totales del semestre (ej. <span className="tabular-nums">528</span> h).
                            </span>
                          </div>

                          <div>
                            <label htmlFor={`period-credits-${target}`} className="block font-semibold text-ink mb-1">
                              Créditos académicos del semestre
                            </label>
                            <input
                              id={`period-credits-${target}`}
                              type="number"
                              disabled={!isEditable}
                              value={pr.credits ?? ''}
                              onChange={(e) => {
                                setFormPeriods({
                                  ...formPeriods,
                                  [target]: { ...pr, credits: Number(e.target.value) },
                                });
                                setIsDirty(true);
                              }}
                              className="w-full min-h-[44px] px-3 py-2 text-sm tabular-nums bg-surface-alt border border-line rounded-[10px] disabled:opacity-60 text-ink font-semibold"
                              placeholder="20"
                            />
                            <span className="block text-xs text-muted mt-1">
                              Créditos otorgados al aprobar el módulo semestral.
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-muted bg-surface-alt p-3 rounded-lg border border-line">
                          ⓘ Al guardar las fechas de este semestre, el sistema sincroniza automáticamente la fila correspondiente <code>({target})</code> en el Calendario Anual de la Pestaña 1.
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: CARRERAS, MÓDULOS Y UNIDADES DIDÁCTICAS           */}
          {/* ======================================================== */}
          {activeTab === 'curriculo' && (
            <div className="space-y-6">
              {/* Banner Explicativo Pestaña 3 */}
              <div className="bg-brand-soft/80 border border-brand/30 rounded-xl p-4 space-y-1">
                <p className="text-sm font-bold text-brand">
                  ⓘ ¿Para qué sirve esta sección?
                </p>
                <p className="text-xs text-ink leading-relaxed">
                  Permite administrar el <strong>plan de estudios activo de cada carrera y módulo formativo</strong>: horas, créditos, turno, docentes asignados y el cronograma de Unidades Didácticas y EFSRT. Alimenta directamente los formatos de <strong>Organización Modular (Formato 03), Programación Curricular, Sílabos, Registros de Asistencia y Evaluación (incluyendo la 7ma UD con TMPL-17) y Actas Oficiales MINEDU</strong>.
                </p>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-ink tabular-nums">
                    3. Carreras, Módulos Formativos y Unidades Didácticas ({selectedYear})
                  </h2>
                  <p className="text-xs text-muted">
                    Filtre por carrera técnica y seleccione el módulo para verificar su cuadre de horas, créditos y unidades.
                  </p>
                </div>

                {/* Filtros rápidos: Carrera Técnica + Selector de Módulo */}
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <label htmlFor="curriculum-program-filter" className="block text-xs font-bold text-muted mb-1">
                      Filtrar por Carrera Técnica:
                    </label>
                    <select
                      id="curriculum-program-filter"
                      value={curriculumProgramFilter}
                      onChange={(e) => {
                        const nextProg = e.target.value;
                        setCurriculumProgramFilter(nextProg);
                        const matchingEntries = Object.entries(formCurriculum).filter(
                          ([_, c]) => nextProg === 'TODAS' || c.programName === nextProg
                        );
                        if (matchingEntries.length > 0 && !matchingEntries.some(([mid]) => mid === selectedCurriculumId)) {
                          setSelectedCurriculumId(matchingEntries[0][0]);
                        }
                      }}
                      className="min-h-[44px] px-3 py-2 text-sm font-semibold bg-surface border border-line text-ink rounded-[10px] focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    >
                      <option value="TODAS">Todas las carreras ({new Set(Object.values(formCurriculum).map((c) => c.programName).filter(Boolean)).size})</option>
                      {[...new Set(Object.values(formCurriculum).map((c) => c.programName).filter(Boolean))].map((progName) => (
                        <option key={progName} value={progName}>
                          {progName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label htmlFor="curriculum-select" className="block text-xs font-bold text-muted mb-1">
                      Módulo Formativo:
                    </label>
                    <select
                      id="curriculum-select"
                      value={selectedCurriculumId}
                      onChange={(e) => setSelectedCurriculumId(e.target.value)}
                      className="min-h-[44px] max-w-full px-3 py-2 text-sm font-semibold bg-surface border border-line text-ink rounded-[10px] focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    >
                      {Object.entries(formCurriculum)
                        .filter(([_, c]) => curriculumProgramFilter === 'TODAS' || c.programName === curriculumProgramFilter)
                        .map(([mid, c]) => (
                          <option key={mid} value={mid}>
                            {c.programName || 'Carrera'} — {c.nombre || 'Sin nombre'} ({mid} · {c.periodId || `${selectedYear}-I`})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {selectedCurriculumId && formCurriculum[selectedCurriculumId] ? (
                (() => {
                  const cur = formCurriculum[selectedCurriculumId];
                  const unitsList: CurriculumUnit[] = cur._units || [];
                  const hasEfsrtRow = unitsList.some(
                    (u) => (u.code || '').toUpperCase().includes('EFSRT') || (u.name || '').toUpperCase().includes('EFSRT')
                  );
                  const sumUnitsHours = unitsList.reduce((acc, u) => acc + (Number(u.hours) || 0), 0);
                  const efsrtDeclared = Number(cur.efsrtHours) || 0;
                  const totalCalculatedHours = hasEfsrtRow ? sumUnitsHours : sumUnitsHours + efsrtDeclared;
                  const declaredModuleHours = Number(cur.hours) || 0;
                  const hoursMatch =
                    totalCalculatedHours === declaredModuleHours || sumUnitsHours === declaredModuleHours;

                  const sumUnitsCredits = unitsList.reduce((acc, u) => acc + (Number(u.credits) || 0), 0);
                  const declaredModuleCredits = Number(cur.credits) || 0;
                  const creditsMatch = sumUnitsCredits === declaredModuleCredits;

                  return (
                    <div className="space-y-6">
                      {/* Cabecera de acciones del módulo */}
                      <div className="p-4 bg-brand-soft/70 rounded-xl border border-brand/30 flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-xs font-bold uppercase text-brand tabular-nums block truncate">
                            {cur.programName || 'Programa'} · Código {cur.programCode || 'S/C'} · Semestre {cur.periodId || `${selectedYear}-I`}
                          </span>
                          <h3 className="text-base font-black text-ink tabular-nums break-words">
                            {cur.programName} — {cur.nombre} ({selectedCurriculumId} · {cur.periodId})
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() => handleApplyReference(selectedCurriculumId)}
                              disabled={isApplyingRef}
                              className="min-h-[44px] px-3.5 py-2 text-xs font-bold text-brand bg-surface border border-brand/50 rounded-[10px] hover:bg-brand-soft shadow-xs transition-colors disabled:opacity-50"
                              title="Restablece las horas, créditos y unidades didácticas del módulo según la plantilla oficial MINEDU"
                            >
                              {isApplyingRef ? 'Restaurando...' : 'Restaurar horas y unidades según plantilla oficial MINEDU'}
                            </button>
                          )}

                          {isEditable && (
                            <button
                              type="button"
                              onClick={() => handleSaveCurriculum(selectedCurriculumId)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 text-xs font-bold text-on-brand bg-brand hover:bg-brand/90 rounded-[10px] shadow-xs transition-colors disabled:opacity-50"
                            >
                              <SaveIcon className="w-3.5 h-3.5" />
                              Guardar cambios de plan
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Campos del módulo */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-surface-alt rounded-xl border border-line text-xs">
                        <div className="min-w-0">
                          <label htmlFor="cur-nombre" className="block font-bold text-muted mb-1">
                            Nombre oficial del módulo
                          </label>
                          <input
                            id="cur-nombre"
                            type="text"
                            disabled={!isEditable}
                            value={cur.nombre || ''}
                            onChange={(e) => {
                              setFormCurriculum({
                                ...formCurriculum,
                                [selectedCurriculumId]: { ...cur, nombre: e.target.value },
                              });
                              setIsDirty(true);
                            }}
                            className="w-full px-3 py-2 text-sm bg-surface border border-line rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75 text-ink font-semibold"
                          />
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="cur-period-id" className="block font-bold text-muted mb-1">
                            Semestre lectivo (Periodo)
                          </label>
                          <input
                            id="cur-period-id"
                            type="text"
                            disabled={!isEditable}
                            value={cur.periodId || ''}
                            onChange={(e) => {
                              setFormCurriculum({
                                ...formCurriculum,
                                [selectedCurriculumId]: { ...cur, periodId: e.target.value },
                              });
                              setIsDirty(true);
                            }}
                            className="w-full px-3 py-2 text-sm tabular-nums bg-surface border border-line rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75 text-ink font-semibold"
                            placeholder="2026-I"
                          />
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="cur-nivel-formativo" className="block font-bold text-muted mb-1">
                            Nivel formativo
                          </label>
                          <input
                            id="cur-nivel-formativo"
                            type="text"
                            disabled={!isEditable}
                            value={cur.nivelFormativo || 'Auxiliar Técnico'}
                            onChange={(e) => {
                              setFormCurriculum({
                                ...formCurriculum,
                                [selectedCurriculumId]: { ...cur, nivelFormativo: e.target.value },
                              });
                              setIsDirty(true);
                            }}
                            className="w-full px-3 py-2 text-sm bg-surface border border-line rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75 text-ink"
                          />
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="cur-turno" className="block font-bold text-muted mb-1">
                            Turno confirmado
                          </label>
                          <select
                            id="cur-turno"
                            disabled={!isEditable}
                            value={cur.turno || ''}
                            onChange={(e) => {
                              setFormCurriculum({
                                ...formCurriculum,
                                [selectedCurriculumId]: { ...cur, turno: e.target.value },
                              });
                              setIsDirty(true);
                            }}
                            className="w-full px-3 py-2 text-sm bg-surface border border-line rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75 text-ink"
                          >
                            <option value="">(Seleccione turno)</option>
                            <option value="Mañana">Mañana</option>
                            <option value="Tarde">Tarde</option>
                            <option value="Noche">Noche</option>
                          </select>
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="cur-hours" className="block font-bold text-muted mb-1">
                            Horas declaradas del módulo
                          </label>
                          <input
                            id="cur-hours"
                            type="number"
                            disabled={!isEditable}
                            value={cur.hours ?? ''}
                            onChange={(e) => {
                              setFormCurriculum({
                                ...formCurriculum,
                                [selectedCurriculumId]: { ...cur, hours: Number(e.target.value) },
                              });
                              setIsDirty(true);
                            }}
                            className="w-full px-3 py-2 text-sm tabular-nums bg-surface border border-line rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75 text-ink font-semibold"
                          />
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="cur-credits" className="block font-bold text-muted mb-1">
                            Créditos declarados del módulo
                          </label>
                          <input
                            id="cur-credits"
                            type="number"
                            disabled={!isEditable}
                            value={cur.credits ?? ''}
                            onChange={(e) => {
                              setFormCurriculum({
                                ...formCurriculum,
                                [selectedCurriculumId]: { ...cur, credits: Number(e.target.value) },
                              });
                              setIsDirty(true);
                            }}
                            className="w-full px-3 py-2 text-sm tabular-nums bg-surface border border-line rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75 text-ink font-semibold"
                          />
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="cur-efsrt-hours" className="block font-bold text-muted mb-1">
                            Horas EFSRT (Prácticas)
                          </label>
                          <input
                            id="cur-efsrt-hours"
                            type="number"
                            disabled={!isEditable}
                            value={cur.efsrtHours ?? ''}
                            onChange={(e) => {
                              setFormCurriculum({
                                ...formCurriculum,
                                [selectedCurriculumId]: { ...cur, efsrtHours: Number(e.target.value) },
                              });
                              setIsDirty(true);
                            }}
                            className="w-full px-3 py-2 text-sm tabular-nums bg-surface border border-line rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75 text-ink font-semibold"
                          />
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="cur-teacher-names" className="block font-bold text-muted mb-1">
                            Docentes de referencia
                          </label>
                          <input
                            id="cur-teacher-names"
                            type="text"
                            disabled={!isEditable}
                            value={cur.teacherNames || ''}
                            onChange={(e) => {
                              setFormCurriculum({
                                ...formCurriculum,
                                [selectedCurriculumId]: { ...cur, teacherNames: e.target.value },
                              });
                              setIsDirty(true);
                            }}
                            className="w-full px-3 py-2 text-sm bg-surface border border-line rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75 text-ink"
                            placeholder="Prof. Martín Valdivia"
                          />
                        </div>
                      </div>

                      {/* Verificador Visual de Cuadre de Horas y Créditos en Tiempo Real */}
                      <div className="p-4 rounded-xl border border-line bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted block">
                            Verificador Visual de Cuadre de Horas y Créditos en Tiempo Real
                          </span>
                          <p className="text-xs text-muted">
                            Compara automáticamente la suma de las Unidades Didácticas y EFSRT contra los totales declarados del módulo.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div
                            className={`px-3.5 py-2 rounded-xl border text-xs font-bold tabular-nums flex items-center gap-2 ${
                              hoursMatch
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                                : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                            }`}
                          >
                            <span>
                              Horas UDs ({sumUnitsHours} h){!hasEfsrtRow && efsrtDeclared > 0 ? ` + EFSRT (${efsrtDeclared} h)` : ''} ={' '}
                              <strong>{hoursMatch ? declaredModuleHours : totalCalculatedHours} h</strong> / Declaradas: <strong>{declaredModuleHours} h</strong>
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-surface/90 border border-current">
                              {hoursMatch ? '✓ Cuadre Exacto' : 'Revisar diferencia'}
                            </span>
                          </div>

                          <div
                            className={`px-3.5 py-2 rounded-xl border text-xs font-bold tabular-nums flex items-center gap-2 ${
                              creditsMatch
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                                : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                            }`}
                          >
                            <span>
                              Créditos UDs: <strong>{sumUnitsCredits} cr.</strong> / Declarados: <strong>{declaredModuleCredits} cr.</strong>
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-surface/90 border border-current">
                              {creditsMatch ? '✓ Cuadre Exacto' : 'Revisar diferencia'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tabla de Unidades Didácticas (unitsJson) */}
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs font-bold uppercase text-ink tracking-wider min-w-0">
                            Unidades Didácticas y Prácticas Formativas (EFSRT)
                          </h4>
                          <span className="text-xs text-muted tabular-nums">
                            Total de unidades: {(cur._units || []).length} ({unitsList.filter((u) => u.confirmed).length} confirmadas)
                          </span>
                        </div>

                        <div className="overflow-x-auto border border-line rounded-xl">
                          <table className="min-w-full divide-y divide-line text-left text-xs">
                            <thead className="bg-surface-alt text-muted font-bold">
                              <tr>
                                <th className="px-3 py-2.5">Código</th>
                                <th className="px-3 py-2.5">Denominación de la Unidad</th>
                                <th className="px-3 py-2.5 text-center">Horas</th>
                                <th className="px-3 py-2.5 text-center">Créd.</th>
                                <th className="px-3 py-2.5 text-center">Teoría</th>
                                <th className="px-3 py-2.5 text-center">Práct.</th>
                                <th className="px-3 py-2.5 text-center">Días</th>
                                <th className="px-3 py-2.5">Fecha Inicio</th>
                                <th className="px-3 py-2.5">Fecha Fin</th>
                                <th className="px-3 py-2.5 text-center">Verificación</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line bg-surface">
                              {(cur._units || []).map((u: CurriculumUnit, uidx: number) => (
                                <tr key={u.code || uidx} className="hover:bg-surface-alt/60 transition-colors">
                                  <td className="px-3 py-2 font-mono font-bold text-brand tabular-nums">
                                    {u.code}
                                  </td>
                                  <td className="px-3 py-2 min-w-[220px]">
                                    <input
                                      type="text"
                                      aria-label={`Denominación de la unidad ${u.code || uidx + 1}`}
                                      disabled={!isEditable}
                                      value={u.name || ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'name', e.target.value)}
                                      className="w-full px-2.5 py-1.5 text-sm border border-line bg-surface text-ink rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75 font-medium"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="number"
                                      aria-label={`Horas de la unidad ${u.code || uidx + 1}`}
                                      disabled={!isEditable}
                                      value={u.hours ?? ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'hours', Number(e.target.value))}
                                      className="w-16 px-1.5 py-1.5 text-sm tabular-nums text-center border border-line bg-surface text-ink rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75 font-semibold"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="number"
                                      aria-label={`Créditos de la unidad ${u.code || uidx + 1}`}
                                      disabled={!isEditable}
                                      value={u.credits ?? ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'credits', Number(e.target.value))}
                                      className="w-14 px-1.5 py-1.5 text-sm tabular-nums text-center border border-line bg-surface text-ink rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75 font-semibold"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="number"
                                      aria-label={`Horas de teoría de la unidad ${u.code || uidx + 1}`}
                                      disabled={!isEditable}
                                      value={u.theoryHours ?? ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'theoryHours', Number(e.target.value))}
                                      className="w-14 px-1.5 py-1.5 text-sm tabular-nums text-center border border-line bg-surface text-ink rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="number"
                                      aria-label={`Horas prácticas de la unidad ${u.code || uidx + 1}`}
                                      disabled={!isEditable}
                                      value={u.practiceHours ?? ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'practiceHours', Number(e.target.value))}
                                      className="w-14 px-1.5 py-1.5 text-sm tabular-nums text-center border border-line bg-surface text-ink rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="number"
                                      aria-label={`Días de la unidad ${u.code || uidx + 1}`}
                                      disabled={!isEditable}
                                      value={u.days ?? ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'days', Number(e.target.value))}
                                      className="w-14 px-1.5 py-1.5 text-sm tabular-nums text-center border border-line bg-surface text-ink rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="date"
                                      aria-label={`Fecha de inicio de la unidad ${u.code || uidx + 1}`}
                                      disabled={!isEditable}
                                      value={u.fechaInicio || ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'fechaInicio', e.target.value)}
                                      className="px-2 py-1.5 text-sm tabular-nums border border-line bg-surface text-ink rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="date"
                                      aria-label={`Fecha de fin de la unidad ${u.code || uidx + 1}`}
                                      disabled={!isEditable}
                                      value={u.fechaFin || ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'fechaFin', e.target.value)}
                                      className="px-2 py-1.5 text-sm tabular-nums border border-line bg-surface text-ink rounded-[10px] focus:ring-1 focus:ring-brand/30 focus:border-brand disabled:bg-surface-alt disabled:opacity-75"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {isEditable ? (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateUnit(selectedCurriculumId, uidx, 'confirmed', !u.confirmed)}
                                        className={`px-2.5 py-1.5 rounded-[10px] text-xs font-bold transition-colors cursor-pointer ${
                                          u.confirmed
                                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900/70'
                                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/70'
                                        }`}
                                        title="Haga clic para alternar entre Confirmada y Pendiente"
                                      >
                                        {u.confirmed ? '✓ Confirmada' : '⏳ Pendiente'}
                                      </button>
                                    ) : (
                                      <span
                                        className={`px-2.5 py-1 rounded-[10px] text-xs font-bold inline-block ${
                                          u.confirmed
                                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                        }`}
                                      >
                                        {u.confirmed ? '✓ Confirmada' : '⏳ Pendiente'}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p-8 text-center text-muted bg-surface-alt rounded-xl border border-dashed border-line">
                  Seleccione un módulo curricular para consultar su estructura.
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: PLANTILLA OFICIAL MINEDU — REFERENCIA             */}
          {/* ======================================================== */}
          {activeTab === 'valores' && (
            <div className="space-y-6">
              {/* Banner Explicativo Pestaña 4 */}
              <div className="bg-brand-soft border border-brand/30 rounded-xl p-4 space-y-1">
                <p className="text-sm font-bold text-brand">
                  ⓘ ¿Para qué sirve esta sección?
                </p>
                <p className="text-xs text-ink/90 leading-relaxed">
                  Conserva la <strong>plantilla base oficial MINEDU / CNOF de cada módulo formativo</strong> (horas, créditos, EFSRT, unidades e indicadores base). Sirve como respaldo de referencia para restaurar cualquier módulo en la Pestaña 3 y garantiza la fidelidad normativa de los <strong><span className="tabular-nums">21</span> formatos oficiales MINEDU</strong>.
                </p>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-ink">
                    4. Plantilla Oficial MINEDU — Valores de Referencia (<span className="tabular-nums">{selectedYear}</span>)
                  </h2>
                  <p className="text-xs text-muted">
                    Catálogo nacional de oferta formativa y parámetros de cotejo curricular oficial por carrera y módulo.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <label htmlFor="defaults-select" className="text-xs font-bold text-ink uppercase">
                    Carrera y Módulo:
                  </label>
                  <select
                    id="defaults-select"
                    value={selectedDefaultsId}
                    onChange={(e) => setSelectedDefaultsId(e.target.value)}
                    className="min-h-[44px] px-3 py-2 text-sm font-semibold bg-surface-alt border border-line text-ink rounded-[10px]"
                  >
                    {Object.keys(formDefaults).map((mid) => (
                      <option key={mid} value={mid}>
                        {formCurriculum[mid]?.programName ? formCurriculum[mid].programName + ' — ' : ''}
                        {formCurriculum[mid]?.nombre || mid} ({mid})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedDefaultsId && formDefaults[selectedDefaultsId] ? (
                (() => {
                  const def = formDefaults[selectedDefaultsId];
                  const mod = def._data?.module || {};
                  const units = def._data?.units || [];
                  const curInfo = formCurriculum[selectedDefaultsId];
                  return (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface-alt rounded-xl border border-line">
                        <div className="space-y-1 min-w-0">
                          <span className="text-xs font-bold text-brand uppercase">
                            {curInfo?.programName ? `${curInfo.programName} — ` : ''}{curInfo?.nombre || selectedDefaultsId} · Origen normativo: {def.source || 'MINEDU / CNOF'}
                          </span>
                          <p className="text-xs text-muted">
                            {def.notes || 'Sin observaciones normativas.'}
                          </p>
                        </div>

                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => handleSaveDefaults(selectedDefaultsId)}
                            disabled={isSaving}
                            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-on-brand bg-brand hover:opacity-90 rounded-[10px] shadow-[var(--ui-shadow)] transition-opacity cursor-pointer disabled:opacity-50"
                          >
                            <SaveIcon className="w-3.5 h-3.5" />
                            Guardar plantilla de referencia
                          </button>
                        )}
                      </div>

                      {/* Totales de referencia */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-surface rounded-xl border border-line text-xs">
                        <div>
                          <label htmlFor="defaults-hours" className="block font-bold text-ink mb-1">
                            Horas de referencia del módulo
                          </label>
                          <input
                            id="defaults-hours"
                            type="number"
                            disabled={!isEditable}
                            value={mod.hours ?? ''}
                            onChange={(e) => {
                              const updatedData = { ...def._data, module: { ...mod, hours: Number(e.target.value) } };
                              setFormDefaults({
                                ...formDefaults,
                                [selectedDefaultsId]: { ...def, _data: updatedData },
                              });
                              setIsDirty(true);
                            }}
                            className="w-full min-h-[44px] px-3 py-2 text-sm tabular-nums border border-line bg-surface-alt text-ink rounded-[10px] font-semibold disabled:opacity-60"
                          />
                        </div>

                        <div>
                          <label htmlFor="defaults-credits" className="block font-bold text-ink mb-1">
                            Créditos de referencia del módulo
                          </label>
                          <input
                            id="defaults-credits"
                            type="number"
                            disabled={!isEditable}
                            value={mod.credits ?? ''}
                            onChange={(e) => {
                              const updatedData = { ...def._data, module: { ...mod, credits: Number(e.target.value) } };
                              setFormDefaults({
                                ...formDefaults,
                                [selectedDefaultsId]: { ...def, _data: updatedData },
                              });
                              setIsDirty(true);
                            }}
                            className="w-full min-h-[44px] px-3 py-2 text-sm tabular-nums border border-line bg-surface-alt text-ink rounded-[10px] font-semibold disabled:opacity-60"
                          />
                        </div>

                        <div>
                          <label htmlFor="defaults-efsrt" className="block font-bold text-ink mb-1">
                            Horas de EFSRT de referencia
                          </label>
                          <input
                            id="defaults-efsrt"
                            type="number"
                            disabled={!isEditable}
                            value={mod.efsrtHours ?? ''}
                            onChange={(e) => {
                              const updatedData = { ...def._data, module: { ...mod, efsrtHours: Number(e.target.value) } };
                              setFormDefaults({
                                ...formDefaults,
                                [selectedDefaultsId]: { ...def, _data: updatedData },
                              });
                              setIsDirty(true);
                            }}
                            className="w-full min-h-[44px] px-3 py-2 text-sm tabular-nums border border-line bg-surface-alt text-ink rounded-[10px] font-semibold disabled:opacity-60"
                          />
                        </div>
                      </div>

                      {/* Unidades de referencia */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase text-ink tracking-wider">
                          Unidades del Catálogo Oficial de Referencia
                        </h4>
                        <div className="overflow-x-auto border border-line rounded-xl">
                          <table className="min-w-full divide-y divide-line text-left text-xs">
                            <thead className="bg-surface-alt text-muted font-bold">
                              <tr>
                                <th className="px-3 py-2.5">Código</th>
                                <th className="px-3 py-2.5">Denominación Oficial</th>
                                <th className="px-3 py-2.5 text-center">Horas</th>
                                <th className="px-3 py-2.5 text-center">Créditos</th>
                                <th className="px-3 py-2.5 text-center">Teoría</th>
                                <th className="px-3 py-2.5 text-center">Práctica</th>
                                <th className="px-3 py-2.5">Indicador IL1</th>
                                <th className="px-3 py-2.5">Indicador IL2</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line bg-surface">
                              {units.map((u: any, uidx: number) => (
                                <tr key={u.code || uidx} className="hover:bg-surface-alt/60 transition-colors">
                                  <td className="px-3 py-2 font-mono font-bold text-brand tabular-nums">
                                    {u.code}
                                  </td>
                                  <td className="px-3 py-2 font-medium text-ink min-w-0">
                                    {u.name}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold tabular-nums text-ink">{u.hours ?? '-'}</td>
                                  <td className="px-3 py-2 text-center font-bold tabular-nums text-ink">{u.credits ?? '-'}</td>
                                  <td className="px-3 py-2 text-center tabular-nums text-muted">{u.theoryHours ?? '-'}</td>
                                  <td className="px-3 py-2 text-center tabular-nums text-muted">{u.practiceHours ?? '-'}</td>
                                  <td className="px-3 py-2 text-muted truncate max-w-[180px]">
                                    {u.indicator1 || '-'}
                                  </td>
                                  <td className="px-3 py-2 text-muted truncate max-w-[180px]">
                                    {u.indicator2 || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p-8 text-center text-muted bg-surface-alt rounded-xl border border-dashed border-line">
                  No hay valores de referencia registrados para este módulo en <span className="tabular-nums">{selectedYear}</span>.
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: DIRECTORIO DE DOCENTES Y PERSONAL (personnel)      */}
          {/* ======================================================== */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              {/* Banner Explicativo Pestaña 5 */}
              <div className="bg-brand-soft border border-brand/30 rounded-xl p-4 space-y-1">
                <p className="text-sm font-bold text-brand">
                  ⓘ ¿Para qué sirve esta sección?
                </p>
                <p className="text-xs text-ink/90 leading-relaxed">
                  Administra el <strong>padrón oficial de directivos, docentes y personal administrativo</strong> del año seleccionado (DNI, nombres completos, cargo, especialidad, contacto y turno). Alimenta directamente el <strong>Formato <span className="tabular-nums">04</span> (Directorio Institucional)</strong> y las firmas de docentes en registros, sílabos, asistencias y actas de evaluación.
                </p>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-ink">
                    5. Directorio de Docentes y Personal Institucional (<span className="tabular-nums">{selectedYear}</span>)
                  </h2>
                  <p className="text-xs text-muted">
                    Nómina oficial del personal directivo, jerárquico, docente y administrativo.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {/* Píldoras de filtro rápido por cargo */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-surface-alt p-1 rounded-xl border border-line">
                    {(
                      [
                        { id: 'TODOS', label: 'Todos' },
                        { id: 'DIRECTIVOS', label: 'Directivos' },
                        { id: 'DOCENTES', label: 'Docentes' },
                        { id: 'ADMINISTRATIVOS', label: 'Administrativos' },
                      ] as const
                    ).map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => setPersonnelRoleFilter(pill.id)}
                        className={`min-h-[36px] px-3 py-1.5 rounded-[10px] text-xs font-bold transition-colors cursor-pointer ${
                          personnelRoleFilter === pill.id
                            ? 'bg-brand text-on-brand shadow-[var(--ui-shadow)]'
                            : 'text-muted hover:text-ink'
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <SearchIcon className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                    <input
                      type="text"
                      aria-label="Buscar personal por DNI o nombre"
                      value={personnelFilter}
                      onChange={(e) => setPersonnelFilter(e.target.value)}
                      placeholder="Buscar por DNI o nombre..."
                      className="min-h-[44px] pl-9 pr-3 py-2 text-sm bg-surface-alt border border-line text-ink rounded-[10px] w-64 placeholder:text-muted"
                    />
                  </div>

                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => {
                        setCloneError(null);
                        setIsAddPersonModalOpen(true);
                      }}
                      className="min-h-[44px] px-4 py-2 text-xs font-bold text-on-brand bg-brand hover:opacity-90 rounded-[10px] shadow-[var(--ui-shadow)] transition-opacity cursor-pointer shrink-0"
                    >
                      + Registrar persona
                    </button>
                  )}
                </div>
              </div>

              {/* Tabla de Directorio */}
              <div className="overflow-x-auto border border-line rounded-xl">
                <table className="min-w-full divide-y divide-line text-left text-xs">
                  <thead className="bg-surface-alt text-muted font-bold">
                    <tr>
                      <th className="px-4 py-2.5">DNI</th>
                      <th className="px-4 py-2.5">Apellidos y Nombres</th>
                      <th className="px-4 py-2.5">Cargo</th>
                      <th className="px-4 py-2.5">Especialidad / Función</th>
                      <th className="px-4 py-2.5">Correo</th>
                      <th className="px-4 py-2.5">Celular</th>
                      <th className="px-4 py-2.5">Turno</th>
                      {isEditable && <th className="px-4 py-2.5 text-right">Acción</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface">
                    {(() => {
                      const filtered = Object.entries(formPersonnel).filter(([_, p]) => {
                        const pos = (p.position || '').toLowerCase();
                        if (personnelRoleFilter === 'DIRECTIVOS') {
                          if (!pos.includes('director') && !pos.includes('coordinador') && !pos.includes('jerárquico')) {
                            return false;
                          }
                        } else if (personnelRoleFilter === 'DOCENTES') {
                          if (!pos.includes('docente') && !pos.includes('profesor')) {
                            return false;
                          }
                        } else if (personnelRoleFilter === 'ADMINISTRATIVOS') {
                          if (!pos.includes('secretar') && !pos.includes('administrat') && !pos.includes('auxiliar')) {
                            return false;
                          }
                        }

                        if (!personnelFilter.trim()) return true;
                        const q = personnelFilter.toLowerCase();
                        return (
                          (p.document || '').toLowerCase().includes(q) ||
                          (p.name || '').toLowerCase().includes(q) ||
                          (p.position || '').toLowerCase().includes(q) ||
                          (p.specialty || '').toLowerCase().includes(q)
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-muted">
                              No se encontraron registros de personal con el filtro seleccionado en <span className="tabular-nums">{selectedYear}</span>.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(([targetId, p]) => (
                        <tr key={targetId} className="hover:bg-surface-alt/60 transition-colors">
                          <td className="px-4 py-2 font-mono font-bold tabular-nums text-ink">
                            {p.document || targetId.split(':')[1]}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              aria-label={`Nombre de ${p.name || targetId}`}
                              disabled={!isEditable}
                              value={p.name || ''}
                              onChange={(e) => {
                                setFormPersonnel({
                                  ...formPersonnel,
                                  [targetId]: { ...p, name: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-full min-h-[38px] px-2.5 py-1.5 text-sm border border-line bg-surface-alt text-ink rounded-[10px] font-semibold disabled:opacity-60"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              aria-label={`Cargo de ${p.name || targetId}`}
                              disabled={!isEditable}
                              value={p.position || ''}
                              onChange={(e) => {
                                setFormPersonnel({
                                  ...formPersonnel,
                                  [targetId]: { ...p, position: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-full min-h-[38px] px-2.5 py-1.5 text-sm border border-line bg-surface-alt text-ink rounded-[10px] disabled:opacity-60"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              aria-label={`Especialidad de ${p.name || targetId}`}
                              disabled={!isEditable}
                              value={p.specialty || ''}
                              onChange={(e) => {
                                setFormPersonnel({
                                  ...formPersonnel,
                                  [targetId]: { ...p, specialty: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-full min-h-[38px] px-2.5 py-1.5 text-sm border border-line bg-surface-alt text-ink rounded-[10px] disabled:opacity-60"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="email"
                              aria-label={`Correo de ${p.name || targetId}`}
                              disabled={!isEditable}
                              value={p.email || ''}
                              onChange={(e) => {
                                setFormPersonnel({
                                  ...formPersonnel,
                                  [targetId]: { ...p, email: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-full min-h-[38px] px-2.5 py-1.5 text-sm border border-line bg-surface-alt text-ink rounded-[10px] disabled:opacity-60"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              aria-label={`Celular de ${p.name || targetId}`}
                              disabled={!isEditable}
                              value={p.phone || ''}
                              onChange={(e) => {
                                setFormPersonnel({
                                  ...formPersonnel,
                                  [targetId]: { ...p, phone: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-28 min-h-[38px] px-2.5 py-1.5 text-sm tabular-nums border border-line bg-surface-alt text-ink rounded-[10px] disabled:opacity-60 font-mono"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              aria-label={`Turno de ${p.name || targetId}`}
                              disabled={!isEditable}
                              value={p.referenceTurno || ''}
                              onChange={(e) => {
                                setFormPersonnel({
                                  ...formPersonnel,
                                  [targetId]: { ...p, referenceTurno: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-24 min-h-[38px] px-2.5 py-1.5 text-sm border border-line bg-surface-alt text-ink rounded-[10px] disabled:opacity-60"
                            />
                          </td>
                          {isEditable && (
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleSavePerson(targetId)}
                                disabled={isSaving}
                                className="min-h-[38px] px-3 py-1.5 text-xs font-bold text-on-brand bg-brand hover:opacity-90 rounded-[10px] shadow-[var(--ui-shadow)] transition-opacity cursor-pointer"
                              >
                                Guardar
                              </button>
                            </td>
                          )}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: COMPETENCIAS, CAPACIDADES E INDICADORES           */}
          {/* ======================================================== */}
          {activeTab === 'catalogo_bd' && (
            <DocumentaryCatalogManager
              initialMode="catalogo_bd"
              initialViewMode="catalogo_bd"
              selectedYear={selectedYear}
              isEditable={isEditable}
              onRefreshParent={() => loadConfiguration(selectedYear)}
            />
          )}

          {/* ======================================================== */}
          {/* TAB 7: AUDITORÍA Y SUBSANACIÓN DEL EXPEDIENTE            */}
          {/* ======================================================== */}
          {activeTab === 'saneamiento_bd' && (
            <DocumentaryCatalogManager
              initialMode="saneamiento_bd"
              initialViewMode="saneamiento_bd"
              selectedYear={selectedYear}
              isEditable={isEditable}
              onRefreshParent={() => loadConfiguration(selectedYear)}
            />
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: APERTURAR NUEVO AÑO ESCOLAR (COPIAR ESTRUCTURA)   */}
      {/* ======================================================== */}
      {isCloneModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clone-year-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCloneModalOpen(false);
          }}
        >
          <div className="cepro-dialog-panel bg-surface rounded-2xl shadow-[var(--ui-shadow)] border border-line max-w-lg w-full">
            <div className="p-6 border-b border-line flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarIcon className="w-5 h-5 text-brand shrink-0" />
                <h3 id="clone-year-modal-title" className="text-lg font-black text-ink">
                  Aperturar Nuevo Año Escolar (Copiar estructura)
                </h3>
              </div>
              <button
                type="button"
                aria-label="Cerrar diálogo"
                onClick={() => setIsCloneModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[10px] text-muted hover:text-ink hover:bg-surface-alt text-lg font-bold cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCloneYear} className="p-6 space-y-4 text-xs">
              <p className="text-sm text-muted leading-relaxed">
                Crea la configuración de un nuevo año copiando carreras, módulos, unidades y docentes del año actual, sin copiar matrículas ni notas.
              </p>

              {cloneError && (
                <div role="alert" className="p-3 bg-red-50 dark:bg-rose-950/40 text-red-800 dark:text-rose-200 border border-red-200 dark:border-rose-900/60 rounded-xl font-medium flex items-center gap-2">
                  <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-rose-400 shrink-0" />
                  <span>{cloneError}</span>
                </div>
              )}

              <div>
                <label htmlFor="clone-origin-year" className="block font-bold text-ink uppercase mb-1">
                  Año escolar de origen (plantilla a copiar)
                </label>
                <input
                  id="clone-origin-year"
                  type="text"
                  readOnly
                  value={`Año escolar ${selectedYear} (vigente)`}
                  className="w-full min-h-[44px] px-3 py-2 text-sm tabular-nums bg-surface-alt border border-line rounded-[10px] font-semibold text-muted"
                />
              </div>

              <div>
                <label htmlFor="clone-target-year" className="block font-bold text-ink uppercase mb-1">
                  Nuevo año escolar a aperturar (4 dígitos)
                </label>
                <input
                  id="clone-target-year"
                  type="text"
                  required
                  maxLength={4}
                  value={targetCloneYear}
                  onChange={(e) => setTargetCloneYear(e.target.value)}
                  placeholder="2027"
                  className="w-full min-h-[44px] px-3 py-2 text-sm tabular-nums bg-surface-alt border border-line rounded-[10px] font-mono font-bold text-brand"
                />
              </div>

              {/* Advertencia institucional de aislamiento histórico */}
              <div className="p-3.5 bg-brand-soft border border-brand/30 rounded-xl space-y-2 text-ink">
                <p className="font-bold text-brand">Garantías institucionales al aperturar el nuevo año:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-ink/90">
                  <li>Se copian carreras, módulos formativos, unidades didácticas y directorio de personal.</li>
                  <li>Las fechas de semestres y unidades didácticas inician listas para programar el nuevo calendario.</li>
                  <li><strong>NUNCA se copian estudiantes, matrículas, notas ni asistencias.</strong> Todo el historial académico anterior queda intacto.</li>
                  <li>Se crea una copia de seguridad preventiva antes de iniciar la operación.</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 font-bold text-ink bg-surface border border-line rounded-[10px] hover:bg-surface-alt cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCloning}
                  className="min-h-[44px] px-5 py-2 font-bold text-on-brand bg-brand hover:opacity-90 rounded-[10px] shadow-[var(--ui-shadow)] transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {isCloning ? 'Aperturando año...' : 'Confirmar y aperturar nuevo año'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTRAR PERSONA EN EL DIRECTORIO                */}
      {/* ======================================================== */}
      {isAddPersonModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-person-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddPersonModalOpen(false);
          }}
        >
          <div className="cepro-dialog-panel bg-surface rounded-2xl shadow-[var(--ui-shadow)] border border-line max-w-md w-full">
            <div className="p-5 border-b border-line flex items-center justify-between gap-3">
              <h3 id="add-person-modal-title" className="text-base font-black text-ink">
                Incorporar persona al directorio <span className="tabular-nums">{selectedYear}</span>
              </h3>
              <button
                type="button"
                aria-label="Cerrar diálogo"
                onClick={() => setIsAddPersonModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[10px] text-muted hover:text-ink hover:bg-surface-alt text-lg font-bold cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePerson} className="p-5 space-y-3.5 text-xs">
              <div>
                <label htmlFor="new-person-dni" className="block font-bold text-ink uppercase mb-1">
                  Documento Nacional de Identidad (DNI)
                </label>
                <input
                  id="new-person-dni"
                  type="text"
                  required
                  maxLength={8}
                  pattern="\d{8}"
                  value={newPersonDni}
                  onChange={(e) => setNewPersonDni(e.target.value.replace(/\D/g, ''))}
                  placeholder="8 dígitos (ej.: 42345678)"
                  className="w-full min-h-[44px] px-3 py-2 border border-line bg-surface-alt text-ink rounded-[10px] font-mono font-bold tabular-nums placeholder:text-muted"
                />
              </div>

              <div>
                <label htmlFor="new-person-name" className="block font-bold text-ink uppercase mb-1">
                  Apellidos y nombres completos
                </label>
                <input
                  id="new-person-name"
                  type="text"
                  required
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Ej.: Quispe Mamani, Juan Carlos"
                  className="w-full min-h-[44px] px-3 py-2 border border-line bg-surface-alt text-ink rounded-[10px] font-semibold placeholder:text-muted"
                />
              </div>

              <div>
                <label htmlFor="new-person-position" className="block font-bold text-ink uppercase mb-1">
                  Cargo institucional
                </label>
                <select
                  id="new-person-position"
                  value={newPersonPosition}
                  onChange={(e) => setNewPersonPosition(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 border border-line bg-surface-alt text-ink rounded-[10px]"
                >
                  <option value="Docente">Docente</option>
                  <option value="Director">Director</option>
                  <option value="Secretaría">Secretaría</option>
                  <option value="Coordinador Académico">Coordinador Académico</option>
                  <option value="Personal Administrativo">Personal Administrativo</option>
                </select>
              </div>

              <div>
                <label htmlFor="new-person-specialty" className="block font-bold text-ink uppercase mb-1">
                  Especialidad / Función
                </label>
                <input
                  id="new-person-specialty"
                  type="text"
                  value={newPersonSpecialty}
                  onChange={(e) => setNewPersonSpecialty(e.target.value)}
                  placeholder="Ej.: Computación e Informática"
                  className="w-full min-h-[44px] px-3 py-2 border border-line bg-surface-alt text-ink rounded-[10px] placeholder:text-muted"
                />
              </div>

              <div>
                <label htmlFor="new-person-turno" className="block font-bold text-ink uppercase mb-1">
                  Turno asignado
                </label>
                <select
                  id="new-person-turno"
                  value={newPersonTurno}
                  onChange={(e) => setNewPersonTurno(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 border border-line bg-surface-alt text-ink rounded-[10px]"
                >
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noche">Noche</option>
                  <option value="Completo">Mañana / Tarde</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddPersonModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 font-bold text-ink bg-surface border border-line rounded-[10px] hover:bg-surface-alt cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-[44px] px-4 py-2 font-bold text-on-brand bg-brand hover:opacity-90 rounded-[10px] shadow-[var(--ui-shadow)] transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Registrando...' : 'Registrar en directorio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionAcademica;
