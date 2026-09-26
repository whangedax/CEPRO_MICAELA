/** Capacidad y fit puros. No pinta, no trunca, no consulta DB. */
export const DOCUMENT_STYLE_PROFILES = Object.freeze({
  PRIMARY_PERSON_NAME: { maxFontSize: 10, minFontSize: 5.5, fontWeight: 'bold' },
  INSTITUTION_NAME: { maxFontSize: 9, minFontSize: 5.5, fontWeight: 'bold' },
  PROGRAM_NAME: { maxFontSize: 8, minFontSize: 5.5, fontWeight: 'bold' },
  MODULE_NAME: { maxFontSize: 8, minFontSize: 5.5, fontWeight: 'bold' },
  UNIT_NAME: { maxFontSize: 8, minFontSize: 5, fontWeight: 'normal' },
  DOCUMENT_NUMBER: { maxFontSize: 8, minFontSize: 5.5, fontWeight: 'normal' },
  TABLE_TEXT: { maxFontSize: 7, minFontSize: 4.5, fontWeight: 'normal' },
  TABLE_NUMBER: { maxFontSize: 7, minFontSize: 5, fontWeight: 'normal' },
  HEADER_VALUE: { maxFontSize: 8, minFontSize: 5, fontWeight: 'normal' }
});

export class DocumentFitService {
  validateCapacity(manifest, counts = {}) {
    const limits = manifest?.capacity || {};
    const checks = [['rows','rows'],['sessions','sessions'],['curriculumUnits','curriculumUnits'],['subsanacionUnits','subsanacionUnits'],
      ['detailRows','detailRows'],['indicators','indicators'],['criteria','criteria']];
    for (const [key,label] of checks) {
      if (Number.isInteger(limits[key]) && Number(counts[key] || 0) > limits[key]) {
        const error = new Error(`CAPACITY_EXCEEDED: ${label} ${counts[key]} > ${limits[key]} en ${manifest.templateId}.`);
        error.code = 'CAPACITY_EXCEEDED'; error.templateId = manifest.templateId; throw error;
      }
    }
    return { valid: true, templateId: manifest.templateId };
  }

  fitText({ text, box, styleProfile, measure }) {
    const value = String(text ?? '');
    if (!value) return { text: '', fontSize: null, status: 'EMPTY' };
    if (!box || !(box.width > 0 && box.height > 0) || typeof measure !== 'function') throw new Error('Fit requiere caja y medidor válidos.');
    const profile = DOCUMENT_STYLE_PROFILES[styleProfile] || DOCUMENT_STYLE_PROFILES.TABLE_TEXT;
    const available = box.width - 2 * Number(box.paddingX || 0);
    for (let size=profile.maxFontSize;size>=profile.minFontSize;size=Number((size-0.1).toFixed(1))) {
      if (measure(value,size,profile.fontWeight)<=available) return {text:value,fontSize:size,fontWeight:profile.fontWeight,status:'FIT'};
    }
    const error=new Error(`FIELD_OVERFLOW: ${value.length} caracteres no caben en ${box.width}pt.`);
    error.code='FIELD_OVERFLOW'; throw error;
  }
}
