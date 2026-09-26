import TMPL02_PDF_FIELDS from '../../data/TMPL02_PDF_FIELDS.json' with { type: 'json' };
import { getV2PdfManifest, physicalFieldsOf } from './v2-document-manifest-registry.js';

export const BINDING_STATUSES = Object.freeze({
  MAPPED: 'MAPPED', UNMAPPED: 'UNMAPPED', NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  FIXED_IN_TEMPLATE: 'FIXED_IN_TEMPLATE'
});

// El mismo manifiesto importado alimenta el preflight y el renderer.
const PDF_BINDING_MANIFESTS = Object.freeze({ 'TMPL-02': TMPL02_PDF_FIELDS });

export function getPdfBindingManifest(templateId) {
  return PDF_BINDING_MANIFESTS[templateId] || null;
}

export function buildResolvedFieldSet(resolvedFields) {
  if (!Array.isArray(resolvedFields)) throw new Error('Se requiere la lista contractual de campos resueltos.');
  const fieldSet = {};
  for (const field of resolvedFields) {
    if (!field?.key || Object.hasOwn(fieldSet, field.key)) {
      throw new Error(`Campo contractual ausente o duplicado: ${field?.key || '(vacío)'}`);
    }
    fieldSet[field.key] = { value: field.value, status: field.status,
      provenance: field.provenance || { canonicalKey: field.key, source: field.source || field.key },
      contractStatus: field.status };
  }
  return fieldSet;
}

export function getBindingCoverage(templateId, resolvedFields) {
  const manifest = getPdfBindingManifest(templateId);
  const boundKeys = new Set(manifest ? Object.values(manifest).map(box => box.contractKey) : []);
  const fields = resolvedFields.map(field => ({ ...field, bindingStatus:
    field.status === 'FIXED_IN_TEMPLATE' ? BINDING_STATUSES.FIXED_IN_TEMPLATE
      : !manifest ? BINDING_STATUSES.NOT_IMPLEMENTED
        : boundKeys.has(field.key) ? BINDING_STATUSES.MAPPED : BINDING_STATUSES.UNMAPPED }));
  return {
    fields,
    mappedAvailableFields: fields.filter(field => field.status === 'CONFIRMED' && field.bindingStatus === BINDING_STATUSES.MAPPED),
    unmappedAvailableFields: fields.filter(field => field.status === 'CONFIRMED' && field.bindingStatus !== BINDING_STATUSES.MAPPED)
  };
}

/** Devuelve cada valor confirmado y mapeado, sin consultar contexto o servicios. */
export function getDrawableBindings(templateId, resolvedFieldSet) {
  const manifest = getPdfBindingManifest(templateId);
  if (!manifest) throw new Error(`La plantilla ${templateId} no tiene binding PDF implementado.`);
  if (!resolvedFieldSet || typeof resolvedFieldSet !== 'object') {
    throw new Error('El PDF requiere exactamente los campos resueltos por preflight.');
  }
  const styleByPhysicalBox = new Map(physicalFieldsOf(getV2PdfManifest(templateId))
    .map(field => [field.physicalBoxId, {
      styleProfile: field.styleProfile,
      overflowPolicy: field.overflowPolicy,
      alignment: field.alignment
    }]));
  const drawable = [];
  for (const [id, box] of Object.entries(manifest)) {
    if (!box.contractKey || !(box.width > 0 && box.height > 0)) {
      throw new Error(`Binding geométrico inválido: ${id}`);
    }
    const field = resolvedFieldSet[box.contractKey];
    if (!field || !field.status) throw new Error(`Falta campo resuelto para el binding ${id}: ${box.contractKey}`);
    if (field.status === 'CONFIRMED') {
      const text = String(field.value ?? '');
      if (!text) throw new Error(`Campo CONFIRMED+MAPPED vacío: ${box.contractKey}`);
      drawable.push({ id, contractKey: box.contractKey,
        box: { ...box, ...(styleByPhysicalBox.get(id) || {}) }, text });
    }
  }
  return drawable;
}
