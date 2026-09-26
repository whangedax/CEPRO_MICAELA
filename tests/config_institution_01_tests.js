const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const results = [];
function check(id, description, passed) {
  results.push({ id, passed: Boolean(passed) });
  console.log(`[${passed ? 'PASSED' : 'FAILED'}] ${id}: ${description}`);
}
async function rejects(fn) { try { await fn(); return false; } catch { return true; } }

async function runConfigInstitution01Tests() {
  results.length = 0;
  const { InstitutionService, EDITABLE_INSTITUTION_FIELDS } = await import(pathToFileURL(path.join(ROOT, 'app/js/services/institution-service.js')).href);
  const { AuditService } = await import(pathToFileURL(path.join(ROOT, 'app/js/services/audit-service.js')).href);
  const { resolveDocumentFields } = await import(pathToFileURL(path.join(ROOT, 'app/js/services/document-field-contract.js')).href);
  const layout = fs.readFileSync(path.join(ROOT, 'app/js/ui/layout.js'), 'utf8');
  const config = fs.readFileSync(path.join(ROOT, 'app/js/config.js'), 'utf8');
  const dataService = fs.readFileSync(path.join(ROOT, 'app/js/services/document-data-service.js'), 'utf8');
  let record = { id: 'INST-001', nombre: 'CETPRO ORIGINAL', resolucionAutorizacion1: 'R-1',
    resolucionAutorizacion2: 'R-2', telefono: 'TELEFONO ORIGINAL', dre: '', codigoModular: '',
    departamento: '', provincia: '', distrito: '', fuente: 'FUENTE ORIGINAL',
    sourceMigrationVersion: 'VERSION ORIGINAL', confirmedSources: [] };
  const originalRepo = InstitutionService.repo;
  const originalAudit = AuditService.record;
  const audits = [];
  InstitutionService.repo = { async getInstitution() { return structuredClone(record); },
    async update(value) { record = structuredClone(value); return value; } };
  AuditService.record = async event => { audits.push(event); return event; };
  try {
    check('T-CI01-01', 'Formulario institucional expone quince campos editables',
      EDITABLE_INSTITUTION_FIELDS.length === 15 &&
      EDITABLE_INSTITUTION_FIELDS.every(field => layout.includes(`['${field}',`)) &&
      layout.includes('const id = `inst-${field}`') && layout.includes('const input = form.querySelector(`#inst-${field}`)'));
    check('T-CI01-02', 'Configuración carga únicamente perfil institucional operacional',
      layout.includes('const inst = await InstitutionService.getInstitutionProfile()') &&
      !layout.includes('InstitutionService.getInstitution()'));
    check('T-CI01-03', 'Handler no consulta controles inexistentes ni campos académicos',
      !/getElementById\('inst-(telefono|correo|resolucion|director)'\)/.test(layout) &&
      !/inst-(correo|resolucion|director)[\'"`]/.test(layout) && !EDITABLE_INSTITUTION_FIELDS.includes('periodo'));
    check('T-CI01-04', 'Nombre obligatorio en UI y servicio',
      layout.includes('field === \'nombre\'') && await rejects(() => InstitutionService.updateInstitution({ nombre: '   ' })));
    check('T-CI01-05', 'Textos se normalizan antes de persistir',
      (await InstitutionService.updateInstitution({ nombre: ' CETPRO NUEVO ', telefono: ' NUEVO-TELEFONO ' })).telefono === 'NUEVO-TELEFONO');
    check('T-CI01-06', 'Nombre, teléfono y cambios sobreviven a la nueva lectura',
      (await InstitutionService.getInstitutionProfile()).nombre === 'CETPRO NUEVO' &&
      (await InstitutionService.getInstitutionProfile()).telefono === 'NUEVO-TELEFONO');
    check('T-CI01-07', 'Fuente y marcador de migración se preservan',
      record.fuente === 'FUENTE ORIGINAL' && record.sourceMigrationVersion === 'VERSION ORIGINAL' && record.id === 'INST-001');
    check('T-CI01-08', 'Metadatos arbitrarios no pueden sobrescribirse por formulario',
      (await InstitutionService.updateInstitution({ nombre: 'CETPRO NUEVO', fuente: 'FALSA',
        sourceMigrationVersion: 'FALSA', id: 'INST-OTRO' })).fuente === 'FUENTE ORIGINAL');
    check('T-CI01-09', 'Resoluciones de autorización conservan columnas separadas',
      (await InstitutionService.updateInstitution({ nombre: 'CETPRO NUEVO', resolucionAutorizacion1: ' R-A ',
        resolucionAutorizacion2: ' R-B ' })).resolucionAutorizacion1 === 'R-A' && record.resolucionAutorizacion2 === 'R-B');
    check('T-CI01-10', 'Contrato lee resoluciones separadas y valor combinado compatible',
      resolveDocumentFields('TMPL-02', { institution: record }).find(field => field.key === 'institution.resolucion').value === 'R-A / R-B' &&
      record.resolucion === 'R-A / R-B');
    const pending = { ...record, dre: 'DRE-OFICIAL-FUTURA', codigoModular: 'CODIGO-OFICIAL-FUTURO' };
    check('T-CI01-11', 'Campos pendientes no se vuelven oficiales por tener texto',
      resolveDocumentFields('TMPL-02', { institution: pending, confirmedSources: [] })
        .find(field => field.key === 'institution.dre').status === 'UNCONFIRMED');
    check('T-CI01-12', 'No se confirma un pendiente vacío ni campo fuera de lista',
      await rejects(() => InstitutionService.updateInstitution({ nombre: record.nombre, dre: '' },
        'SECRETARIA_LOCAL', { confirmPendingSources: ['dre'] })) &&
      await rejects(() => InstitutionService.updateInstitution({ nombre: record.nombre },
        'SECRETARIA_LOCAL', { confirmPendingSources: ['telefono'] })));
    await InstitutionService.updateInstitution({ nombre: record.nombre, dre: ' DRE-OFICIAL-FUTURA ',
      codigoModular: ' CODIGO-OFICIAL-FUTURO ' }, 'SECRETARIA_LOCAL',
    { confirmPendingSources: ['dre', 'codigoModular'] });
    const resolved = resolveDocumentFields('TMPL-02', { institution: record, confirmedSources: record.confirmedSources });
    check('T-CI01-13', 'Confirmación explícita hace disponibles DRE y código modular',
      resolved.find(field => field.key === 'institution.dre').value === 'DRE-OFICIAL-FUTURA' &&
      resolved.find(field => field.key === 'institution.codigoModular').value === 'CODIGO-OFICIAL-FUTURO');
    check('T-CI01-14', 'Guardado auditado y documento reconstruido desde servicio, sin literal institucional',
      audits.length >= 4 && audits.every(audit => audit.entidad === 'INSTITUCION' && audit.idEntidad === 'INST-001') &&
      dataService.includes('getInstitutionProfile()') && !config.includes('INSTITUTION_NAME') &&
      layout.includes('institution.nombre'));
  } finally {
    InstitutionService.repo = originalRepo;
    AuditService.record = originalAudit;
  }
  const passed = results.filter(result => result.passed).length;
  const failed = results.length - passed;
  console.log(`RESUMEN CONFIG-INSTITUTION-01: TOTAL=${results.length}, PASSED=${passed}, FAILED=${failed}`);
  return { suite: 'CONFIG-INSTITUTION-01', total: results.length, passed, failed };
}
module.exports = { runConfigInstitution01Tests };
if (require.main === module) runConfigInstitution01Tests().then(result => { if (result.failed) process.exitCode = 1; });
