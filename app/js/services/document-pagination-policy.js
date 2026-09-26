export const PAGINATION_TYPES = Object.freeze({
  SINGLE_PAGE_FIXED: 'SINGLE_PAGE_FIXED',
  PAGINATE_BY_TEMPLATE_COPY: 'PAGINATE_BY_TEMPLATE_COPY',
  FIXED_PAGE_COUNT: 'FIXED_PAGE_COUNT',
  SINGLE_RECORD: 'SINGLE_RECORD',
  BLOCK_ON_OVERFLOW: 'BLOCK_ON_OVERFLOW'
});

const TYPES = PAGINATION_TYPES;
const POLICY = Object.freeze({
  'TMPL-01': Object.freeze({ type: TYPES.PAGINATE_BY_TEMPLATE_COPY, canonicalCapacity: 30,
    capacityPerPage: 30, administrativePagination: true, officialMultipage: false }),
  'TMPL-02': Object.freeze({ type: TYPES.SINGLE_RECORD, capacity: 1 }),
  'TMPL-03': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED' }),
  'TMPL-04': Object.freeze({ type: TYPES.SINGLE_PAGE_FIXED, officialIssueStatus: 'BLOCKED' }),
  'TMPL-05': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 40 }),
  'TMPL-06': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 40 }),
  'TMPL-07': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 40 }),
  'TMPL-08': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 40 }),
  'TMPL-09': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 40 }),
  'TMPL-10': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 40 }),
  'TMPL-11': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 47 }),
  'TMPL-12': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 40 }),
  'TMPL-13': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 40 }),
  'TMPL-14': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 40 }),
  'TMPL-15': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 40 }),
  'TMPL-16': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 40 }),
  'TMPL-17': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 40 }),
  'TMPL-18': Object.freeze({ type: TYPES.BLOCK_ON_OVERFLOW, geometryStatus: 'REVIEW_REQUIRED', capacity: 40 }),
  'TMPL-19': Object.freeze({ type: TYPES.FIXED_PAGE_COUNT, pageCount: 2, pageRows: Object.freeze([20, 20]),
    synthesizeAdditionalPages: false }),
  'TMPL-20': Object.freeze({ type: TYPES.FIXED_PAGE_COUNT, pageCount: 2, detailRows: 8,
    synthesizeAdditionalPages: false }),
  'TMPL-21': Object.freeze({ type: TYPES.FIXED_PAGE_COUNT, pageCount: 2, singleRecord: true,
    synthesizeAdditionalPages: false })
});

function policyError(code, message, details = {}) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  Object.assign(error, details);
  return error;
}

export const DocumentPaginationPolicy = Object.freeze({
  get(templateId) {
    const policy = POLICY[templateId];
    if (!policy) throw policyError('PAGINATION_POLICY_MISSING', `No existe política explícita para ${templateId}.`, { templateId });
    return policy;
  },

  plan(templateId, rowCount, { mode = 'CANONICAL' } = {}) {
    const policy = this.get(templateId);
    const rows = Number(rowCount);
    if (!Number.isInteger(rows) || rows < 0) throw policyError('INVALID_ROW_COUNT', 'rowCount debe ser un entero no negativo.');
    if (templateId === 'TMPL-01') {
      if (mode !== 'ADMINISTRATIVE_MULTIPAGE' && rows > policy.canonicalCapacity) {
        throw policyError('CAPACITY_EXCEEDED', `TMPL-01 canónica admite ${policy.canonicalCapacity} estudiantes.`,
          { capacity: policy.canonicalCapacity, actual: rows });
      }
      const pageCount = mode === 'ADMINISTRATIVE_MULTIPAGE'
        ? Math.max(1, Math.ceil(rows / policy.capacityPerPage)) : 1;
      const pages = Array.from({ length: pageCount }, (_, index) => {
        const startRecord = rows === 0 ? 0 : (index * policy.capacityPerPage) + 1;
        const endRecord = rows === 0 ? 0 : Math.min(rows, (index + 1) * policy.capacityPerPage);
        return Object.freeze({
          pageNumber: index + 1,
          startRecord,
          endRecord,
          rowCount: Math.max(0, endRecord - startRecord + (rows === 0 ? 0 : 1))
        });
      });
      return Object.freeze({ templateId, mode, rowCount: rows, pageCount,
        capacityPerPage: policy.capacityPerPage, administrative: mode === 'ADMINISTRATIVE_MULTIPAGE',
        officialMultipage: false, pages: Object.freeze(pages) });
    }
    return Object.freeze({ templateId, mode, rowCount: rows, pageCount: policy.pageCount || 1,
      administrative: false, officialMultipage: false });
  },

  chunkRows(templateId, rows, { mode = 'CANONICAL' } = {}) {
    if (!Array.isArray(rows)) throw policyError('INVALID_ROWS', 'rows debe ser una lista.');
    const plan = this.plan(templateId, rows.length, { mode });
    if (templateId !== 'TMPL-01' || mode !== 'ADMINISTRATIVE_MULTIPAGE') return Object.freeze([Object.freeze([...rows])]);
    const chunks = [];
    for (let offset = 0; offset < rows.length; offset += plan.capacityPerPage) {
      chunks.push(Object.freeze(rows.slice(offset, offset + plan.capacityPerPage)));
    }
    if (!chunks.length) chunks.push(Object.freeze([]));
    return Object.freeze(chunks);
  },

  all() { return POLICY; }
});

export const TMPL01_CANONICAL_CAPACITY = POLICY['TMPL-01'].canonicalCapacity;
export const TMPL01_ADMIN_PAGINATION = 'ENABLED';
