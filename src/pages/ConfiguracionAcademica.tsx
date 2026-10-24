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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

type TabType = 'institucion' | 'periodos' | 'curriculo' | 'valores' | 'personal';

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
  const [selectedDefaultsId, setSelectedDefaultsId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [personnelFilter, setPersonnelFilter] = useState<string>('');

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
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-slate-500">
        <div className="w-10 h-10 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-slate-700">Cargando configuración académica institucional...</p>
        <span className="text-xs text-slate-400 mt-1">Recuperando calendarios, periodos, planes y directorio</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ========================================== */}
      {/* 1. CABECERA INSTITUCIONAL                  */}
      {/* ========================================== */}
      <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                <AcademicConfigIcon className="w-3.5 h-3.5" />
                Configuración Académica
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isEditable
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {isEditable ? (
                  <>
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-700" />
                    Edición autorizada (Dirección)
                  </>
                ) : (
                  <>
                    <LockIcon className="w-3.5 h-3.5 text-amber-700" />
                    Solo lectura institucional
                  </>
                )}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Configuración Académica y Periodos Lectivos
            </h1>
            <p className="text-sm text-slate-600">
              Gestión centralizada del año lectivo, calendarios oficiales, periodos académicos, planes curriculares y directorio del personal.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadConfiguration(selectedYear)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
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
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-sm transition-colors"
                title="Clonar estructura a un nuevo año lectivo"
              >
                <CalendarIcon className="w-4 h-4" />
                Preparar nuevo año
              </button>
            )}
          </div>
        </div>

        {/* Barra de herramientas: Selector de Año y Modo */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label htmlFor="year-select" className="text-sm font-bold text-slate-700">
              Año lectivo activo:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="px-3 py-1.5 text-sm font-bold text-emerald-900 bg-emerald-50/70 border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              {availableYearsList.map((y) => (
                <option key={y} value={y}>
                  Año lectivo {y}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              ({(config?.records.filter((r) => r.scope.target.includes(selectedYear) || r.fields.year === selectedYear) || []).length} registros vinculados)
            </span>
          </div>

          {!isEditable && (
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              <LockIcon className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Modo consulta: Secretaría tiene permisos de solo lectura. Las modificaciones requieren rol Director.</span>
            </div>
          )}
        </div>
      </header>

      {/* ========================================== */}
      {/* 2. ALERTAS Y CONFLICTOS                    */}
      {/* ========================================== */}
      {serverError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800">
          <AlertCircleIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Error en la operación</p>
            <p className="mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {conflictError && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start justify-between gap-3 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Conflicto de concurrencia detectado (HTTP 409)</p>
              <p className="mt-0.5">{conflictError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadConfiguration(selectedYear)}
            className="px-3 py-1.5 bg-amber-800 text-white text-xs font-bold rounded-lg hover:bg-amber-900 shrink-0"
          >
            Sincronizar ahora
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start justify-between gap-3 text-emerald-900">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold">{successMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-700 hover:text-emerald-950 font-bold"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Banner de Inconsistencias Curriculares */}
      {currentYearIssues.length > 0 ? (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertCircleIcon className="w-4 h-4 text-amber-600" />
            <span>Inconsistencias curriculares detectadas ({currentYearIssues.length})</span>
          </div>
          <ul className="list-disc list-inside text-xs text-amber-800 space-y-1 pl-2">
            {currentYearIssues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
          <span>Planes curriculares consistentes para el año lectivo {selectedYear}. No se detectan omisiones de horas o créditos.</span>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. PESTAÑAS PRINCIPALES                    */}
      {/* ========================================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/60 px-6 pt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('institucion')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'institucion'
                ? 'border-emerald-800 text-emerald-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DocConfigIcon className="w-4 h-4" />
            1. Institución y calendario
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('periodos')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'periodos'
                ? 'border-emerald-800 text-emerald-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            2. Periodos académicos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('curriculo')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'curriculo'
                ? 'border-emerald-800 text-emerald-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AcademicConfigIcon className="w-4 h-4" />
            3. Programas y planes curriculares
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('valores')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'valores'
                ? 'border-emerald-800 text-emerald-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DocConfigIcon className="w-4 h-4" />
            4. Valores de referencia
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'personal'
                ? 'border-emerald-800 text-emerald-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <SearchIcon className="w-4 h-4" />
            5. Directorio del personal
          </button>
        </div>

        <div className="p-6">
          {/* ======================================================== */}
          {/* TAB 1: INSTITUCIÓN Y CALENDARIO (academicYear)           */}
          {/* ======================================================== */}
          {activeTab === 'institucion' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Parámetros Institucionales y Calendarización ({selectedYear})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configuración de cabeceras oficiales y fechas de inicio/fin de actividades del año lectivo.
                  </p>
                </div>
                {isEditable && (
                  <button
                    type="button"
                    onClick={handleSaveYear}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                  >
                    <SaveIcon className="w-4 h-4" />
                    {isSaving ? 'Guardando...' : 'Guardar parámetros del año'}
                  </button>
                )}
              </div>

              {/* Parámetros anuales declarados */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Horas anuales declaradas
                  </label>
                  <input
                    type="number"
                    disabled={!isEditable}
                    value={formYear.hours ?? ''}
                    onChange={(e) => {
                      setFormYear({ ...formYear, hours: Number(e.target.value) });
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100 font-semibold"
                    placeholder="1700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Créditos anuales declarados
                  </label>
                  <input
                    type="number"
                    disabled={!isEditable}
                    value={formYear.credits ?? ''}
                    onChange={(e) => {
                      setFormYear({ ...formYear, credits: Number(e.target.value) });
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100 font-semibold"
                    placeholder="64"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Fecha del directorio
                  </label>
                  <input
                    type="date"
                    disabled={!isEditable}
                    value={formYear.directoryDate || ''}
                    onChange={(e) => {
                      setFormYear({ ...formYear, directoryDate: e.target.value });
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Lugar del directorio
                  </label>
                  <input
                    type="text"
                    disabled={!isEditable}
                    value={formYear.directoryPlace || ''}
                    onChange={(e) => {
                      setFormYear({ ...formYear, directoryPlace: e.target.value });
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
                    placeholder="Juliaca"
                  />
                </div>
              </div>

              {/* Perfil institucional para documentos (institutionJson) */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Identidad y Jurisdicción Institucional
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nombre oficial de la institución
                    </label>
                    <input
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
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
                      placeholder="CETPRO Micaela Bastidas"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      DRE
                    </label>
                    <input
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
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
                      placeholder="DRE Puno"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      UGEL
                    </label>
                    <input
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
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
                      placeholder="UGEL San Román"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Región / Departamento
                    </label>
                    <input
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
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
                      placeholder="Puno"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Provincia
                    </label>
                    <input
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
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
                      placeholder="San Román"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Distrito
                    </label>
                    <input
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
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
                      placeholder="Juliaca"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Director/a oficial
                    </label>
                    <input
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
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
                      placeholder="Lic. Roberto Morales"
                    />
                  </div>
                </div>
              </div>

              {/* Calendarización del año lectivo (calendarJson) */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      Calendarización Oficial ({formYear._calendar?.length || 0} bloques)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Fechas de los periodos académicos y actividades oficiales. Se sincroniza con los periodos académicos individuales.
                    </p>
                  </div>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={handleAddCalendarBlock}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100"
                    >
                      + Añadir bloque de calendario
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold">
                      <tr>
                        <th className="px-4 py-2.5">Bloque / Denominación</th>
                        <th className="px-4 py-2.5">Inicio (AAAA-MM-DD)</th>
                        <th className="px-4 py-2.5">Término (AAAA-MM-DD)</th>
                        <th className="px-4 py-2.5">Detalle / Notas</th>
                        {isEditable && <th className="px-4 py-2.5 text-right">Acción</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {(formYear._calendar || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                            No hay bloques de calendarización registrados.
                          </td>
                        </tr>
                      ) : (
                        (formYear._calendar || []).map((row: CalendarBlock, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                disabled={!isEditable}
                                value={row.name}
                                onChange={(e) => handleUpdateCalendarBlock(idx, 'name', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 font-medium"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="date"
                                disabled={!isEditable}
                                value={row.start}
                                onChange={(e) => handleUpdateCalendarBlock(idx, 'start', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="date"
                                disabled={!isEditable}
                                value={row.end}
                                onChange={(e) => handleUpdateCalendarBlock(idx, 'end', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                disabled={!isEditable}
                                value={row.detail || ''}
                                onChange={(e) => handleUpdateCalendarBlock(idx, 'detail', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700"
                                placeholder="Notas u observaciones"
                              />
                            </td>
                            {isEditable && (
                              <td className="px-4 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCalendarBlock(idx)}
                                  className="text-red-600 hover:text-red-800 font-bold"
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
          {/* TAB 2: PERIODOS ACADÉMICOS (academicPeriod)              */}
          {/* ======================================================== */}
          {activeTab === 'periodos' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Periodos Académicos del Año {selectedYear}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Semestres y ciclos académicos que definen las ventanas de clases y notas.
                  </p>
                </div>
              </div>

              {/* Lista de periodos disponibles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(formPeriods).length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    No se encontraron periodos académicos para el año {selectedYear}.
                  </div>
                ) : (
                  Object.entries(formPeriods).map(([target, pr]) => (
                    <div
                      key={target}
                      className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-5 h-5 text-emerald-800" />
                          <span className="text-base font-bold text-slate-900">
                            Periodo {target}
                          </span>
                        </div>
                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => handleSavePeriod(target)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                          >
                            <SaveIcon className="w-3.5 h-3.5" />
                            Guardar periodo
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">
                            Fecha de inicio
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">
                            Fecha de término
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">
                            Horas declaradas
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100 font-medium"
                            placeholder="850"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">
                            Créditos declarados
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100 font-medium"
                            placeholder="32"
                          />
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        Nota: Al guardar las fechas de este periodo, el sistema sincroniza automáticamente la fila correspondiente en la calendarización del año lectivo.
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: PROGRAMAS Y PLANES CURRICULARES (curriculum)       */}
          {/* ======================================================== */}
          {activeTab === 'curriculo' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Planes Curriculares y Estructura Modular ({selectedYear})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Especificación de módulos, unidades didácticas y prácticas pre-profesionales (EFSRT).
                  </p>
                </div>

                {/* Selector de módulo */}
                <div className="flex items-center gap-3">
                  <label htmlFor="curriculum-select" className="text-xs font-bold text-slate-700 uppercase">
                    Módulo curricular:
                  </label>
                  <select
                    id="curriculum-select"
                    value={selectedCurriculumId}
                    onChange={(e) => setSelectedCurriculumId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
                  >
                    {Object.entries(formCurriculum).map(([mid, c]) => (
                      <option key={mid} value={mid}>
                        {mid}: {c.nombre || 'Sin nombre'} ({c.programName || 'Programa'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedCurriculumId && formCurriculum[selectedCurriculumId] ? (
                (() => {
                  const cur = formCurriculum[selectedCurriculumId];
                  return (
                    <div className="space-y-6">
                      {/* Cabecera de acciones del módulo */}
                      <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold uppercase text-emerald-800">
                            {cur.programName || 'Programa'} · Código {cur.programCode || 'S/C'}
                          </span>
                          <h3 className="text-base font-black text-slate-900">
                            {cur.nombre} ({selectedCurriculumId})
                          </h3>
                        </div>

                        <div className="flex items-center gap-3">
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() => handleApplyReference(selectedCurriculumId)}
                              disabled={isApplyingRef}
                              className="px-3 py-1.5 text-xs font-bold text-emerald-900 bg-white border border-emerald-400 rounded-lg hover:bg-emerald-100 shadow-xs transition-colors disabled:opacity-50"
                              title="Restablece unidades y horas con los valores oficiales de referencia"
                            >
                              {isApplyingRef ? 'Aplicando...' : 'Aplicar valores de referencia'}
                            </button>
                          )}

                          {isEditable && (
                            <button
                              type="button"
                              onClick={() => handleSaveCurriculum(selectedCurriculumId)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                            >
                              <SaveIcon className="w-3.5 h-3.5" />
                              Guardar cambios de plan
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Campos del módulo */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Nombre oficial del módulo
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Periodo de clase
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100 font-semibold"
                            placeholder="2026-I"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Nivel formativo
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Turno confirmado
                          </label>
                          <select
                            disabled={!isEditable}
                            value={cur.turno || ''}
                            onChange={(e) => {
                              setFormCurriculum({
                                ...formCurriculum,
                                [selectedCurriculumId]: { ...cur, turno: e.target.value },
                              });
                              setIsDirty(true);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100"
                          >
                            <option value="">(Seleccione turno)</option>
                            <option value="Mañana">Mañana</option>
                            <option value="Tarde">Tarde</option>
                            <option value="Noche">Noche</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Horas declaradas del módulo
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Créditos declarados del módulo
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Horas EFSRT (Prácticas)
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Docentes de referencia
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100"
                            placeholder="Prof. Martín Valdivia"
                          />
                        </div>
                      </div>

                      {/* Tabla de Unidades Didácticas (unitsJson) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                            Unidades Didácticas y Prácticas Formativas (EFSRT)
                          </h4>
                          <span className="text-xs text-slate-500">
                            Total de unidades: {(cur._units || []).length}
                          </span>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                            <thead className="bg-slate-50 text-slate-700 font-bold">
                              <tr>
                                <th className="px-3 py-2">Código</th>
                                <th className="px-3 py-2">Denominación de la Unidad</th>
                                <th className="px-3 py-2 text-center">Horas</th>
                                <th className="px-3 py-2 text-center">Créd.</th>
                                <th className="px-3 py-2 text-center">Teoría</th>
                                <th className="px-3 py-2 text-center">Práct.</th>
                                <th className="px-3 py-2 text-center">Días</th>
                                <th className="px-3 py-2">Fecha Inicio</th>
                                <th className="px-3 py-2">Fecha Fin</th>
                                <th className="px-3 py-2 text-center">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {(cur._units || []).map((u: CurriculumUnit, uidx: number) => (
                                <tr key={u.code || uidx} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 font-mono font-bold text-emerald-900">
                                    {u.code}
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="text"
                                      disabled={!isEditable}
                                      value={u.name || ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'name', e.target.value)}
                                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100 font-medium"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="number"
                                      disabled={!isEditable}
                                      value={u.hours ?? ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'hours', Number(e.target.value))}
                                      className="w-16 px-1.5 py-1 text-xs text-center border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100 font-semibold"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="number"
                                      disabled={!isEditable}
                                      value={u.credits ?? ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'credits', Number(e.target.value))}
                                      className="w-14 px-1.5 py-1 text-xs text-center border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100 font-semibold"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="number"
                                      disabled={!isEditable}
                                      value={u.theoryHours ?? ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'theoryHours', Number(e.target.value))}
                                      className="w-14 px-1.5 py-1 text-xs text-center border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="number"
                                      disabled={!isEditable}
                                      value={u.practiceHours ?? ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'practiceHours', Number(e.target.value))}
                                      className="w-14 px-1.5 py-1 text-xs text-center border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="number"
                                      disabled={!isEditable}
                                      value={u.days ?? ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'days', Number(e.target.value))}
                                      className="w-14 px-1.5 py-1 text-xs text-center border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="date"
                                      disabled={!isEditable}
                                      value={u.fechaInicio || ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'fechaInicio', e.target.value)}
                                      className="px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="date"
                                      disabled={!isEditable}
                                      value={u.fechaFin || ''}
                                      onChange={(e) => handleUpdateUnit(selectedCurriculumId, uidx, 'fechaFin', e.target.value)}
                                      className="px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        u.confirmed
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {u.confirmed ? 'Confirmada' : 'Pendiente'}
                                    </span>
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
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  Seleccione un módulo curricular para consultar su estructura.
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: VALORES OFICIALES DE REFERENCIA (moduleDefaults)   */}
          {/* ======================================================== */}
          {activeTab === 'valores' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Valores Oficiales de Referencia ({selectedYear})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Catálogo nacional de oferta formativa y parámetros de cotejo curricular oficial.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label htmlFor="defaults-select" className="text-xs font-bold text-slate-700 uppercase">
                    Referencia del módulo:
                  </label>
                  <select
                    id="defaults-select"
                    value={selectedDefaultsId}
                    onChange={(e) => setSelectedDefaultsId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
                  >
                    {Object.keys(formDefaults).map((mid) => (
                      <option key={mid} value={mid}>
                        {mid}: Valores de referencia oficiales
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
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-500 uppercase">
                            Origen normativo: {def.source || 'MINEDU / CNOF'}
                          </span>
                          <p className="text-xs text-slate-600">
                            {def.notes || 'Sin observaciones normativas.'}
                          </p>
                        </div>

                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => handleSaveDefaults(selectedDefaultsId)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                          >
                            <SaveIcon className="w-3.5 h-3.5" />
                            Guardar valores oficiales
                          </button>
                        )}
                      </div>

                      {/* Totales de referencia */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-xl border border-slate-200 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Horas de referencia del módulo
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Créditos de referencia del módulo
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Horas de EFSRT de referencia
                          </label>
                          <input
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
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100"
                          />
                        </div>
                      </div>

                      {/* Unidades de referencia */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                          Unidades del Catálogo de Referencia
                        </h4>
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                            <thead className="bg-slate-50 text-slate-700 font-bold">
                              <tr>
                                <th className="px-3 py-2">Código</th>
                                <th className="px-3 py-2">Denominación Oficial</th>
                                <th className="px-3 py-2 text-center">Horas</th>
                                <th className="px-3 py-2 text-center">Créditos</th>
                                <th className="px-3 py-2 text-center">Teoría</th>
                                <th className="px-3 py-2 text-center">Práctica</th>
                                <th className="px-3 py-2">Indicador IL1</th>
                                <th className="px-3 py-2">Indicador IL2</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {units.map((u: any, uidx: number) => (
                                <tr key={u.code || uidx} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 font-mono font-bold text-emerald-900">
                                    {u.code}
                                  </td>
                                  <td className="px-3 py-2 font-medium text-slate-800">
                                    {u.name}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold">{u.hours ?? '-'}</td>
                                  <td className="px-3 py-2 text-center font-bold">{u.credits ?? '-'}</td>
                                  <td className="px-3 py-2 text-center">{u.theoryHours ?? '-'}</td>
                                  <td className="px-3 py-2 text-center">{u.practiceHours ?? '-'}</td>
                                  <td className="px-3 py-2 text-slate-600 truncate max-w-[180px]">
                                    {u.indicator1 || '-'}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600 truncate max-w-[180px]">
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
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  No hay valores de referencia registrados para este módulo en {selectedYear}.
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: DIRECTORIO DEL PERSONAL (personnel)                */}
          {/* ======================================================== */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Directorio Institucional del Personal ({selectedYear})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Nómina oficial del personal directivo, jerárquico, docente y administrativo.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={personnelFilter}
                      onChange={(e) => setPersonnelFilter(e.target.value)}
                      placeholder="Buscar por DNI, nombre o cargo..."
                      className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 w-64"
                    />
                  </div>

                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => {
                        setCloneError(null);
                        setIsAddPersonModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition-colors shrink-0"
                    >
                      + Registrar persona
                    </button>
                  )}
                </div>
              </div>

              {/* Tabla de Directorio */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold">
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
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {(() => {
                      const filtered = Object.entries(formPersonnel).filter(([_, p]) => {
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
                            <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                              No se encontraron registros de personal en el directorio de {selectedYear}.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(([targetId, p]) => (
                        <tr key={targetId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-mono font-bold text-slate-900">
                            {p.document || targetId.split(':')[1]}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              disabled={!isEditable}
                              value={p.name || ''}
                              onChange={(e) => {
                                setFormPersonnel({
                                  ...formPersonnel,
                                  [targetId]: { ...p, name: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-semibold disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              disabled={!isEditable}
                              value={p.position || ''}
                              onChange={(e) => {
                                setFormPersonnel({
                                  ...formPersonnel,
                                  [targetId]: { ...p, position: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              disabled={!isEditable}
                              value={p.specialty || ''}
                              onChange={(e) => {
                                setFormPersonnel({
                                  ...formPersonnel,
                                  [targetId]: { ...p, specialty: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="email"
                              disabled={!isEditable}
                              value={p.email || ''}
                              onChange={(e) => {
                                setFormPersonnel({
                                  ...formPersonnel,
                                  [targetId]: { ...p, email: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              disabled={!isEditable}
                              value={p.phone || ''}
                              onChange={(e) => {
                                setFormPersonnel({
                                  ...formPersonnel,
                                  [targetId]: { ...p, phone: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-24 px-2 py-1 text-xs border border-slate-300 rounded disabled:bg-slate-100 font-mono"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              disabled={!isEditable}
                              value={p.referenceTurno || ''}
                              onChange={(e) => {
                                setFormPersonnel({
                                  ...formPersonnel,
                                  [targetId]: { ...p, referenceTurno: e.target.value },
                                });
                                setIsDirty(true);
                              }}
                              className="w-20 px-2 py-1 text-xs border border-slate-300 rounded disabled:bg-slate-100"
                            />
                          </td>
                          {isEditable && (
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleSavePerson(targetId)}
                                disabled={isSaving}
                                className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded shadow-2xs transition-colors"
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
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: CLONACIÓN DEL AÑO ACADÉMICO (PRIORIDAD CRÍTICA)   */}
      {/* ======================================================== */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-800" />
                <h3 className="text-lg font-black text-slate-900">
                  Preparar nuevo año académico
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCloneModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCloneYear} className="p-6 space-y-4 text-xs">
              {cloneError && (
                <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl font-medium">
                  {cloneError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Año de origen (modelo de clonación)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`Año lectivo ${selectedYear} (vigente)`}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg font-semibold text-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nuevo año a crear (cuatro dígitos)
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={targetCloneYear}
                  onChange={(e) => setTargetCloneYear(e.target.value)}
                  placeholder="2027"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Advertencia institucional de aislamiento histórico */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-950">
                <p className="font-bold">Garantías institucionales de la clonación:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-900">
                  <li>Se crearán módulos y programas con nuevos identificadores independientes.</li>
                  <li>Las fechas de unidades didácticas y calendarios inician en blanco para su programación.</li>
                  <li><strong>NUNCA se copian estudiantes, matrículas, notas ni asistencias.</strong> Todo el historial académico anterior queda intacto.</li>
                  <li>Se crea una copia de seguridad custodial de respaldo antes de iniciar la transacción.</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCloning}
                  className="px-5 py-2 font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {isCloning ? 'Clonando año...' : 'Confirmar y clonar año'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                Incorporar persona al directorio {selectedYear}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPersonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePerson} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Documento Nacional de Identidad (DNI)
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  pattern="\d{8}"
                  value={newPersonDni}
                  onChange={(e) => setNewPersonDni(e.target.value.replace(/\D/g, ''))}
                  placeholder="8 dígitos (ej.: 42345678)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Apellidos y nombres completos
                </label>
                <input
                  type="text"
                  required
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Ej.: Quispe Mamani, Juan Carlos"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Cargo institucional
                </label>
                <select
                  value={newPersonPosition}
                  onChange={(e) => setNewPersonPosition(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                >
                  <option value="Docente">Docente</option>
                  <option value="Director">Director</option>
                  <option value="Secretaría">Secretaría</option>
                  <option value="Coordinador Académico">Coordinador Académico</option>
                  <option value="Personal Administrativo">Personal Administrativo</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Especialidad / Función
                </label>
                <input
                  type="text"
                  value={newPersonSpecialty}
                  onChange={(e) => setNewPersonSpecialty(e.target.value)}
                  placeholder="Ej.: Computación e Informática"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Turno asignado
                </label>
                <select
                  value={newPersonTurno}
                  onChange={(e) => setNewPersonTurno(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
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
                  className="px-3.5 py-1.5 font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition-colors"
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
