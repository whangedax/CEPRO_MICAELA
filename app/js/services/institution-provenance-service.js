export const INSTITUTION_PROVENANCE_STATES = Object.freeze({
  CONFIRMED: Object.freeze({ code: 'CONFIRMED', label: 'CONFIRMADO' }),
  REVIEW_REQUIRED: Object.freeze({ code: 'REVIEW_REQUIRED', label: 'REVISIÓN DE FUENTE' }),
  EMPTY: Object.freeze({ code: 'EMPTY', label: 'VACÍO' }),
  NEW_CHANGE: Object.freeze({ code: 'NEW_CHANGE', label: 'CAMBIO NUEVO — REQUIERE CONFIRMACIÓN' })
});

/** Clasificación pura: no persiste, no infiere confirmación por la presencia de texto. */
export function getInstitutionFieldProvenance(profile, field, currentValue = profile?.[field]) {
  const original = String(profile?.[field] ?? '').trim();
  const current = String(currentValue ?? '').trim();
  if (current !== original) return INSTITUTION_PROVENANCE_STATES.NEW_CHANGE;
  if (!current) return INSTITUTION_PROVENANCE_STATES.EMPTY;
  const confirmed = Array.isArray(profile?.confirmedSources) &&
    profile.confirmedSources.includes(`institution.${field}`);
  return confirmed ? INSTITUTION_PROVENANCE_STATES.CONFIRMED : INSTITUTION_PROVENANCE_STATES.REVIEW_REQUIRED;
}
