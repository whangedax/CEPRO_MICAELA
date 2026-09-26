import { TemplateRegistry } from './template-registry.js';
import { FIELD_STATUSES } from './document-field-contract.js';
import { buildResolvedFieldSet, getBindingCoverage } from './document-binding-service.js';
import { DocumentFieldResolver } from './document-field-resolver.js';
import { getV2PdfManifest } from './v2-document-manifest-registry.js';

/** Preflight puro: informa vacíos y bloqueos, pero nunca modifica fuentes ni emite documentos. */
export class DocumentValidationService {
  constructor(registry = new TemplateRegistry(), resolver = new DocumentFieldResolver()) {
    this.registry = registry; this.resolver = resolver;
  }

  validateDocument(templateId, context = {}) {
    const template = this.registry.getById(templateId);
    if (!template) throw new Error(`Plantilla desconocida: ${templateId}`);
    const resolvedFields = this.resolver.resolve(templateId, context);
    const physicalManifest = getV2PdfManifest(templateId);
    const binding = getBindingCoverage(templateId, resolvedFields);
    const resolvedFieldSet = buildResolvedFieldSet(resolvedFields);
    const missingFields = resolvedFields.filter(field =>
      field.status === FIELD_STATUSES.MISSING || field.status === FIELD_STATUSES.UNCONFIRMED);
    const blockedFields = resolvedFields.filter(field => field.status === FIELD_STATUSES.BLOCKED || Boolean(field.blocker));
    const availableFields = resolvedFields.filter(field => field.status === FIELD_STATUSES.CONFIRMED);
    const unresolvedPreview = resolvedFields.filter(field => field.requiredForPreview && field.status !== FIELD_STATUSES.CONFIRMED);
    const unresolvedOfficial = resolvedFields.filter(field => field.requiredForOfficialIssue && field.status !== FIELD_STATUSES.CONFIRMED);
    const activeTemplate = templateId === 'TMPL-02' && template.contextType === 'ENROLLMENT';
    const requiredEntities = activeTemplate && Boolean(context.student?.id && context.enrollment?.id &&
      context.program?.id && context.institution && context.source?.enrollmentId === context.enrollment.id);
    const unmappedRequiredPreview = binding.unmappedAvailableFields.filter(field => field.requiredForPreview);
    const canPreview = Boolean(activeTemplate && requiredEntities && unresolvedPreview.length === 0 &&
      unmappedRequiredPreview.length === 0);
    const canOfficiallyIssue = Boolean(canPreview && unresolvedOfficial.length === 0 &&
      (template.blockers || []).length === 0);
    const warnings = [
      ...unresolvedPreview.map(field => `${field.label}: ${field.emptyReason || 'dato pendiente'}`),
      ...blockedFields.map(field => `${field.label}: ${field.blocker || 'bloqueado'}`)
    ];
    if (binding.unmappedAvailableFields.length) {
      warnings.push(`${binding.unmappedAvailableFields.length} datos disponibles todavía no tienen caja PDF vinculada.`);
    }
    if (!activeTemplate) warnings.push(physicalManifest?.previewStatus === 'REVIEW_REQUIRED'
      ? 'Plantilla en revisión geométrica; no se completa por inferencia.' : 'Plantilla pendiente o bloqueada por fuentes oficiales.');
    if (canPreview && !canOfficiallyIssue) warnings.push('Vista previa permitida. Emisión oficial bloqueada.');
    const documentFields = Object.fromEntries(resolvedFields.map(field => [field.key, field.value]));
    return { canPreview, canOfficiallyIssue, allAvailableFieldsMapped: binding.unmappedAvailableFields.length === 0,
      resolvedFields, resolvedFieldSet, bindingFields: binding.fields,
      mappedAvailableFields: binding.mappedAvailableFields,
      unmappedAvailableFields: binding.unmappedAvailableFields,
      missingFields, blockedFields, availableFields, warnings, documentFields,
      physicalManifest, previewStatus: physicalManifest?.previewStatus || 'NOT_IMPLEMENTED' };
  }
}
