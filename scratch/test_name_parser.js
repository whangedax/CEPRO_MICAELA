import { STAGING_DATA } from '../app/js/data/staging-data.js';

export function parseNameParts(fullNameStr) {
  if (!fullNameStr) {
    return { apellidoPaterno: '', apellidoMaterno: '', nombres: '' };
  }
  const clean = String(fullNameStr).trim();
  if (clean.includes(',')) {
    const parts = clean.split(',');
    const surnamesStr = (parts[0] || '').trim();
    const namesStr = (parts.slice(1).join(',') || '').trim();
    
    const surnameWords = surnamesStr.split(/\s+/).filter(Boolean);
    let apellidoPaterno = '';
    let apellidoMaterno = '';
    
    if (surnameWords.length >= 2) {
      apellidoPaterno = surnameWords[0];
      apellidoMaterno = surnameWords.slice(1).join(' ');
    } else if (surnameWords.length === 1) {
      apellidoPaterno = surnameWords[0];
      apellidoMaterno = '';
    }
    
    return {
      apellidoPaterno,
      apellidoMaterno,
      nombres: namesStr
    };
  } else {
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 3) {
      return {
        apellidoPaterno: words[0],
        apellidoMaterno: words[1],
        nombres: words.slice(2).join(' ')
      };
    } else if (words.length === 2) {
      return {
        apellidoPaterno: words[0],
        apellidoMaterno: '',
        nombres: words[1]
      };
    } else {
      return {
        apellidoPaterno: words[0] || '',
        apellidoMaterno: '',
        nombres: ''
      };
    }
  }
}

// Test on STAGING_DATA
let unparsed = 0;
STAGING_DATA.forEach((r, idx) => {
  const p = parseNameParts(r.nombreCompletoOriginal);
  if (!p.apellidoPaterno && !p.nombres) {
    unparsed++;
    console.log(`Row ${idx+1} unparsed:`, r.nombreCompletoOriginal);
  }
});
console.log('Unparsed count:', unparsed);
