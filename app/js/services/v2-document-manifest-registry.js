/** Manifiestos físicos independientes por PDF canónico. Sin DB ni fuentes externas. */
import M01 from '../../data/pdf-manifests/TMPL-01.json' with { type: 'json' };
import M02 from '../../data/pdf-manifests/TMPL-02.json' with { type: 'json' };
import M03 from '../../data/pdf-manifests/TMPL-03.json' with { type: 'json' };
import M04 from '../../data/pdf-manifests/TMPL-04.json' with { type: 'json' };
import M05 from '../../data/pdf-manifests/TMPL-05.json' with { type: 'json' };
import M06 from '../../data/pdf-manifests/TMPL-06.json' with { type: 'json' };
import M07 from '../../data/pdf-manifests/TMPL-07.json' with { type: 'json' };
import M08 from '../../data/pdf-manifests/TMPL-08.json' with { type: 'json' };
import M09 from '../../data/pdf-manifests/TMPL-09.json' with { type: 'json' };
import M10 from '../../data/pdf-manifests/TMPL-10.json' with { type: 'json' };
import M11 from '../../data/pdf-manifests/TMPL-11.json' with { type: 'json' };
import M12 from '../../data/pdf-manifests/TMPL-12.json' with { type: 'json' };
import M13 from '../../data/pdf-manifests/TMPL-13.json' with { type: 'json' };
import M14 from '../../data/pdf-manifests/TMPL-14.json' with { type: 'json' };
import M15 from '../../data/pdf-manifests/TMPL-15.json' with { type: 'json' };
import M16 from '../../data/pdf-manifests/TMPL-16.json' with { type: 'json' };
import M17 from '../../data/pdf-manifests/TMPL-17.json' with { type: 'json' };
import M18 from '../../data/pdf-manifests/TMPL-18.json' with { type: 'json' };
import M19 from '../../data/pdf-manifests/TMPL-19.json' with { type: 'json' };
import M20 from '../../data/pdf-manifests/TMPL-20.json' with { type: 'json' };
import M21 from '../../data/pdf-manifests/TMPL-21.json' with { type: 'json' };
import LEGACY01 from '../../data/TMPL01_PDF_FIELDS.json' with { type: 'json' };
import LEGACY02 from '../../data/TMPL02_PDF_FIELDS.json' with { type: 'json' };

const manifests = Object.freeze(Object.fromEntries([
  M01,M02,M03,M04,M05,M06,M07,M08,M09,M10,M11,M12,M13,M14,M15,M16,M17,M18,M19,M20,M21
].map(manifest => [manifest.templateId, manifest])));
const boxes = Object.freeze({ 'TMPL-01': LEGACY01, 'TMPL-02': LEGACY02 });

export function getV2PdfManifest(templateId) { return manifests[templateId] || null; }
export function getV2PdfManifests() { return Object.values(manifests); }

/** Expande solo las cajas explícitas verificadas; no genera páginas ni filas nuevas. */
export function physicalFieldsOf(manifest) {
  if (!manifest) return [];
  const source = boxes[manifest.templateId] || null;
  const output = [];
  for (const field of [...(manifest.fields || []), ...(manifest.physicalFields || [])]) {
    if (field.geometryStatus && field.geometryStatus !== 'VERIFIED') continue;
    const repeat = field.repeat || 1;
    for (let index = 0; index < repeat; index += 1) {
      const physicalBoxId = field.physicalBoxPattern
        ? field.physicalBoxPattern.replace('{row}', String(index + 1).padStart(2, '0'))
        : field.physicalBoxId;
      const sourceBox = physicalBoxId && source ? source[physicalBoxId] : null;
      if (physicalBoxId && !sourceBox) throw new Error(`Caja física ausente: ${manifest.templateId}/${physicalBoxId}`);
      const box = sourceBox ? {
        x: sourceBox.x, y: sourceBox.y, width: sourceBox.width || sourceBox.w,
        height: sourceBox.height || sourceBox.h, alignment: sourceBox.align || field.alignment || 'left',
        maxFontSize: sourceBox.maxFontSize, minFontSize: sourceBox.minFontSize,
        paddingX: sourceBox.paddingX || 0
      } : {
        ...field,
        x: Number(field.x) + Number(field.stepX || 0) * index,
        y: Number(field.y) + Number(field.stepY || 0) * index
      };
      const page = manifest.pages?.find(item => item.number === field.page);
      if (!page || !(box.width > 0 && box.height > 0) || box.x < 0 || box.y < 0 ||
          box.x + box.width > page.width + 0.5 || box.y + box.height > page.height + 0.5) {
        throw new Error(`Geometría fuera de página: ${manifest.templateId}/${physicalBoxId || field.canonicalKey}`);
      }
      output.push({ ...field, ...box, physicalBoxId: physicalBoxId || null,
        occurrence: Number.isInteger(field.occurrence) ? field.occurrence : (field.repeat ? index : null) });
    }
  }
  return output;
}
