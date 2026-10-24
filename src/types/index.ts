export type UserRole = 'DIRECTOR' | 'SECRETARIA' | 'DOCENTE';

export type NavRoute =
  | 'inicio'
  | 'estudiantes'
  | 'matriculas'
  | 'grupos'
  | 'evaluacion'
  | 'asistencia'
  | 'documentos'
  | 'configuracion-documental'
  | 'entregas'
  | 'datos'
  | 'cuentas'
  | 'sincronizacion'
  | 'respaldo'
  | 'configuracion-academica'
  | 'perfil';

export interface UserProfile {
  name: string;
  role: string;
  period: string;
  institution: string;
  institutionSub: string;
}

export interface PedagogicalActivity {
  id: string;
  title: string;
  description: string;
  actionText: string;
  originalRoute: string;
  iconName: 'auto_stories' | 'fact_check' | 'workspace_premium' | 'folder_open';
}

export interface ClassroomShift {
  name: string;
  variant: 'morning' | 'afternoon';
}

export interface ClassroomMock {
  id: string;
  career: string;
  module: string;
  group: string;
  shift: ClassroomShift;
  schedule: string;
  enrolled: number;
  environment: string;
  environmentCode: string;
  iconType: 'tech' | 'textile';
  units: string[];
}
