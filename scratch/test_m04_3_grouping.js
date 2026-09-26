import { STAGING_DATA } from '../app/js/data/staging-data.js';

console.log('Total staging records:', STAGING_DATA.length);

const docMap = new Map();
const noDocRows = [];

STAGING_DATA.forEach(row => {
  const doc = (row.numeroDocumentoOriginal || '').trim();
  if (doc) {
    if (!docMap.has(doc)) {
      docMap.set(doc, []);
    }
    docMap.get(doc).push(row);
  } else {
    noDocRows.push(row);
  }
});

console.log('Distinct non-empty docs:', docMap.size);
console.log('Empty doc rows:', noDocRows.length);
console.log('Total candidate personas:', docMap.size + noDocRows.length);

// Check name variations
let nameConflicts = 0;
docMap.forEach((rows, doc) => {
  const names = new Set(rows.map(r => r.nombreCompletoOriginal.trim().toUpperCase()));
  if (names.size > 1) {
    nameConflicts++;
    console.log(`Doc ${doc} has ${names.size} name variations:`, Array.from(names));
  }
});
console.log('Total doc groups with name variations:', nameConflicts);
