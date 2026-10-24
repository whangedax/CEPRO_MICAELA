import React from 'react';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';

interface PlaceholderPageProps {
  route: NavRoute;
  onGoHome: () => void;
}

const routeDetails: Record<
  NavRoute,
  { title: string; subtitle: string; originalRoute: string; description: string }
> = {
  inicio: {
    title: 'Inicio / Mis Aulas',
    subtitle: 'Panel Principal',
    originalRoute: '#/inicio',
    description: 'Dashboard principal institucional con aulas asignadas y actividades pedagógicas.',
  },
  estudiantes: {
    title: 'Estudiantes',
    subtitle: 'Gestión y consulta de participantes',
    originalRoute: '#/estudiantes',
    description: 'Búsqueda por nombre o documento, historial de matrícula y fichas de participantes asignados.',
  },
  matriculas: {
    title: 'Matrículas',
    subtitle: 'Incorporación formal de estudiantes',
    originalRoute: '#/matriculas',
    description: 'Registro oficial de matrículas, rectificaciones modulares y asignación de código MAT.',
  },
  grupos: {
    title: 'Grupos y Aulas',
    subtitle: 'Aulas y turnos asignados',
    originalRoute: '#/grupos',
    description: 'Organización modular, turnos lectivos y nóminas de aula asignadas al docente titular.',
  },
  asistencia: {
    title: 'Control de Asistencia',
    subtitle: 'Registro diario de sesiones',
    originalRoute: '#/asistencia',
    description: 'Registro de asistencia por sesión, cómputo automático y emisión de reportes.',
  },
  evaluacion: {
    title: 'Registro de Evaluaciones',
    subtitle: 'Calificaciones continuas y modulares',
    originalRoute: '#/evaluacion',
    description: 'Ingreso auxiliar de notas por indicador de logro y promedios modulares.',
  },
  documentos: {
    title: 'Documentos Académicos',
    subtitle: 'Formatos y entregas oficiales',
    originalRoute: '#/documentos',
    description: 'Consulta y emisión de nóminas, actas y formatos pedagógicos según permisos vigentes.',
  },
  'configuracion-documental': {
    title: 'Datos de Documentos',
    subtitle: 'Preparación y metadatos pedagógicos',
    originalRoute: '#/configuracion-documental',
    description: 'Configuración de unidades didácticas, criterios de evaluación y parámetros para actas.',
  },
  entregas: {
    title: 'Entregas y Revisión',
    subtitle: 'Recepción y estado de documentos',
    originalRoute: '#/entregas',
    description: 'Seguimiento de entregas documentales, observaciones y recepción por parte de Secretaría y Dirección.',
  },
  datos: {
    title: 'Actualizar y Exportar Datos',
    subtitle: 'Intercambio tabular y paquetes',
    originalRoute: '#/datos',
    description: 'Exportación e importación de registros en formatos tabulares y consolidación de cambios.',
  },
  cuentas: {
    title: 'Usuarios y Asignaciones',
    subtitle: 'Administración de personal institucional',
    originalRoute: '#/cuentas',
    description: 'Alta de cuentas docentes y administrativas, cambio de contraseñas y asignación de aulas.',
  },
  sincronizacion: {
    title: 'Sincronización USB',
    subtitle: 'Intercambio seguro de datos',
    originalRoute: '#/sincronizacion',
    description: 'Exportación e importación cifrada de paquetes para sincronización fuera de línea con Dirección.',
  },
  respaldo: {
    title: 'Respaldo y Migración',
    subtitle: 'Seguridad y base de datos institucional',
    originalRoute: '#/respaldo',
    description: 'Generación de respaldos completos cifrados, verificación de integridad y restauración de datos.',
  },
  'configuracion-academica': {
    title: 'Configuración por Año',
    subtitle: 'Planificación anual institucional',
    originalRoute: '#/configuracion-academica',
    description: 'Definición de años lectivos, periodos, programas de estudio y módulos correspondientes.',
  },
  perfil: {
    title: 'Mi Cuenta',
    subtitle: 'Identidad y credenciales',
    originalRoute: '#/perfil',
    description: 'Datos del usuario autenticado, vigencia de credenciales y administración de clave local.',
  },
};

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  route,
  onGoHome,
}) => {
  const { user } = useAuth();
  const detail = routeDetails[route] || routeDetails.inicio;

  const roleLabel =
    user?.role === 'DIRECTOR'
      ? 'DIRECTOR'
      : user?.role === 'SECRETARIA'
      ? 'SECRETARIA'
      : user?.role === 'DOCENTE'
      ? 'DOCENTE'
      : 'autenticado';

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* Top Breadcrumb & Status */}
      <div className="flex items-center gap-2 mb-4">
        <StatusBadge size="sm" />
        <span className="text-slate-400" aria-hidden="true">•</span>
        <span className="text-xs font-bold text-slate-700">
          {detail.subtitle}
        </span>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#E6F4F1] text-[#13594A] flex items-center justify-center font-bold text-sm" aria-hidden="true">
            {detail.title.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#172B28]">{detail.title}</h1>
            <p className="text-xs font-semibold text-slate-600">{detail.subtitle}</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 mb-6 leading-relaxed">
          {detail.description}
        </p>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-amber-800 font-bold text-sm mt-0.5" aria-hidden="true">ℹ</span>
            <div className="text-xs text-amber-950 space-y-1">
              <p className="font-bold">
                Pantalla en proceso de modernización — Disponible en la futura integración funcional.
              </p>
              <p className="text-amber-900 leading-relaxed">
                Esta sección está planificada en el roadmap de modernización React 2.0. Los accesos y permisos del rol {roleLabel} se encuentran preservados y validados.
              </p>
              <p className="font-mono text-[11px] text-amber-950 pt-1 border-t border-amber-200">
                Ruta original de referencia: <strong>{detail.originalRoute}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-600">
            CEPRO_MICAELA 2.0 · Prototipo offline
          </span>
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#13594A] text-white text-xs font-semibold hover:bg-[#004034] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] focus-visible:ring-offset-2"
          >
            <span>← Regresar a Inicio / Mis Aulas</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
