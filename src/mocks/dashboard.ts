import { UserProfile, PedagogicalActivity, ClassroomMock } from '../types';

export const mockUser: UserProfile = {
  name: 'Prof. Martín Valdivia',
  role: 'Docente Titular',
  period: 'Periodo 2026-I',
  institution: 'CEPRO_MICAELA',
  institutionSub: 'Gestión Académica 2.0',
};

export const pedagogicalActivities: PedagogicalActivity[] = [
  {
    id: 'act-1',
    title: 'Preparar unidad didáctica',
    description: 'Programación curricular, sesiones y contenidos de aprendizaje.',
    actionText: 'Planificar unidad',
    originalRoute: '#/configuracion-documental',
    iconName: 'auto_stories',
  },
  {
    id: 'act-2',
    title: 'Registrar asistencia',
    description: 'Control de participantes por sesión y turno lectivo.',
    actionText: 'Tomar asistencia hoy',
    originalRoute: '#/asistencia',
    iconName: 'fact_check',
  },
  {
    id: 'act-3',
    title: 'Registrar evaluaciones',
    description: 'Ingreso de evaluaciones continuas y promedios modulares.',
    actionText: 'Abrir evaluación',
    originalRoute: '#/evaluacion',
    iconName: 'workspace_premium',
  },
  {
    id: 'act-4',
    title: 'Revisar documentos académicos',
    description: 'Consulta los formatos y entregas disponibles para tu rol.',
    actionText: 'Ver documentos',
    originalRoute: '#/documentos',
    iconName: 'folder_open',
  },
];

export const classroomsMock: ClassroomMock[] = [
  {
    id: 'aula-1',
    career: 'Computación e Informática',
    module: 'Módulo I: Sistemas Operativos y Ofimática',
    group: 'Grupo A',
    shift: {
      name: 'Turno Mañana',
      variant: 'morning',
    },
    schedule: 'Lun - Vie · 08:00 - 12:30',
    enrolled: 28,
    environment: 'Entorno de Laboratorio',
    environmentCode: 'Laboratorio 02 · Pabellón Tecnológico',
    iconType: 'tech',
    units: ['Ofimática Básica', 'Sistemas Operativos', 'Redes Locales'],
  },
  {
    id: 'aula-2',
    career: 'Confección Textil',
    module: 'Módulo II: Patronaje y Ensamblado de Prendas',
    group: 'Grupo B',
    shift: {
      name: 'Turno Tarde',
      variant: 'afternoon',
    },
    schedule: 'Lun - Vie · 13:30 - 18:00',
    enrolled: 24,
    environment: 'Taller de Confección',
    environmentCode: 'Taller Textil 01 · Módulo Artesanal',
    iconType: 'textile',
    units: ['Patronaje Industrial', 'Costura Básica', 'Ensamblado'],
  },
];
