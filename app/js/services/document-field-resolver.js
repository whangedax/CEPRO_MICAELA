import { resolveDocumentFields } from './document-field-contract.js';

/** Única resolución semántica previa a preflight y renderer. */
export class DocumentFieldResolver {
  resolve(templateId, canonicalContext = {}) {
    const resolved = resolveDocumentFields(templateId, canonicalContext);
    const seen = new Set();
    return resolved.map(field => {
      if (seen.has(field.key)) throw new Error(`canonicalKey resuelta más de una vez: ${field.key}`);
      seen.add(field.key);
      return Object.freeze({ ...field, provenance: Object.freeze({
        canonicalKey: field.key,
        source: field.source,
        selectedContextId: canonicalContext.source?.enrollmentId || canonicalContext.source?.groupId || '',
        authority: canonicalContext.source?.groupId ? 'GRUPO_ACADEMICO' : 'ENROLLMENT',
        contractStatus: field.status
      }) });
    });
  }
}
