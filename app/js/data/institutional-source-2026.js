/**
 * Datos institucionales confirmados por fuente física entregada por jefatura/dirección.
 * M12.1B — No contiene inferencias administrativas ni datos académicos.
 */

export const INSTITUTION_SOURCE_ID = 'FUENTE_FISICA_INSTITUCIONAL_2026';
export const INSTITUTION_SOURCE_DESCRIPTION = 'Volante físico institucional entregado por jefatura/dirección.';
export const INSTITUTION_SOURCE_MIGRATION_VERSION = 'FUENTE_FISICA_INSTITUCIONAL_2026_V1';

export const INSTITUTIONAL_SOURCE_2026 = Object.freeze({
  id: 'INST-001',
  nombre: 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"',
  denominacionVisible: 'CENTRO DE EDUCACIÓN TÉCNICA PRODUCTIVA PÚBLICO\nMICAELA BASTIDAS PUYUCAWA',
  tipoGestion: 'PÚBLICA',
  ugel: 'SAN ROMÁN',
  resolucionAutorizacion1: 'R.D. N.º 3367-DREP',
  resolucionAutorizacion2: 'R.D. N.º 774-DREP',
  resolucion: 'R.D. N.º 3367-DREP / R.D. N.º 774-DREP',
  direccion: 'Jr. Yungay N.º 302 - San Miguel - Juliaca',
  telefono: '051-602378',
  celular1: '999-041818',
  celular2: '961-990905',
  inicioAnunciado: '10 DE AGOSTO',
  horarioAnunciado: 'M - T - N / L - V y S/D',
  requisitosInscripcion: Object.freeze([
    'Una Foto',
    'Fotocopia de DNI',
    'Pago por Mantenimiento de Talleres'
  ]),
  fuente: INSTITUTION_SOURCE_ID,
  fuenteDescripcion: INSTITUTION_SOURCE_DESCRIPTION,

  // Campos administrativos sin confirmación semántica: deben permanecer vacíos.
  dre: '',
  codigoModular: '',
  departamento: '',
  provincia: '',
  distrito: ''
});

export function buildInstitutionalSourceRecord(existing = null, now = new Date().toISOString()) {
  return {
    ...(existing || {}),
    ...INSTITUTIONAL_SOURCE_2026,
    requisitosInscripcion: [...INSTITUTIONAL_SOURCE_2026.requisitosInscripcion],
    sourceMigrationVersion: INSTITUTION_SOURCE_MIGRATION_VERSION,
    fechaRegistro: existing?.fechaRegistro || now,
    fechaActualizacion: now,
    estado: existing?.estado || 'ACTIVO',
    observaciones: 'Datos institucionales confirmados por fuente física; campos administrativos no confirmados permanecen vacíos.'
  };
}
