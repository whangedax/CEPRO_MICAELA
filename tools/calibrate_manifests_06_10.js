const fs = require('fs');

const configs = {
  'TMPL-06': {
    templateId: 'TMPL-06',
    canonicalPdf: '/sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/06_ASISTENCIA_UD2.pdf',
    sha256: '88c2055535a18ea66d98645e0dca471d99666e1c1e9190b56ad704aae242a67c',
    sessions: 35,
    studentX: 175.18,
    originX: 356.46,
    dx: 15.9874,
    totPX: 916.02,
    totFX: 953.01,
    totPctX: 990.00
  },
  'TMPL-07': {
    templateId: 'TMPL-07',
    canonicalPdf: '/sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/07_ASISTENCIA_UD3.pdf',
    sha256: '953ecbb422e0eeb9bb48c0a373b98c56c20573cbb7b2123d2427a192f15fa8b3',
    sessions: 38,
    studentX: 151.20,
    originX: 332.48,
    dx: 15.9874,
    totPX: 940.00,
    totFX: 976.99,
    totPctX: 1013.98
  },
  'TMPL-08': {
    templateId: 'TMPL-08',
    canonicalPdf: '/sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/08_ASISTENCIA_UD4.pdf',
    sha256: '7efc708761fe3beec61b55c2bf962dca8f3434676156e52c80ddf99e46a5beaa',
    sessions: 44,
    studentX: 103.18,
    originX: 284.46,
    dx: 15.9873,
    totPX: 987.90,
    totFX: 1024.89,
    totPctX: 1061.89
  },
  'TMPL-09': {
    templateId: 'TMPL-09',
    canonicalPdf: '/sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/09_ASISTENCIA_UD5.pdf',
    sha256: '006d96a7985aa0ccff69877b678ddca778b0fae7401d279cf43f3f338d72ae3c',
    sessions: 44,
    studentX: 103.18,
    originX: 284.46,
    dx: 15.9873,
    totPX: 987.90,
    totFX: 1024.89,
    totPctX: 1061.89
  },
  'TMPL-10': {
    templateId: 'TMPL-10',
    canonicalPdf: '/sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/10_ASISTENCIA_UD6.pdf',
    sha256: '07ef5cf911855eaee5978a16db8a2b53fc42d99d9b62ca7e0ef6b758066da916',
    sessions: 40,
    studentX: 135.18,
    originX: 316.46,
    dx: 15.9875,
    totPX: 955.96,
    totFX: 992.95,
    totPctX: 1029.94
  }
};

for (const [id, cfg] of Object.entries(configs)) {
  const filePath = 'app/data/pdf-manifests/' + id + '.json';
  
  const manifest = {
    templateId: id,
    canonicalPdf: cfg.canonicalPdf,
    sha256: cfg.sha256,
    pages: [
      {
        number: 1,
        width: 1190.55,
        height: 841.89
      }
    ],
    contextType: 'ATTENDANCE',
    capacity: {
      pages: 1,
      rows: 40,
      sessions: cfg.sessions
    },
    grid: {
      rows: 40,
      sessions: cfg.sessions,
      originX: cfg.originX,
      originY: 149.07,
      cellWidth: 15.99,
      cellHeight: 11.99,
      stepX: cfg.dx,
      stepY: 11.99
    },
    previewStatus: 'AVAILABLE',
    blockers: [],
    geometryProvenance: 'DOCUMENT_MASTER_AUDIT.md y calibración vectorial física automatizada de 40 filas x ' + cfg.sessions + ' sesiones',
    fields: [
      {
        canonicalKey: 'institution.name',
        geometryStatus: 'VERIFIED',
        styleProfile: 'HEADER_LABEL',
        overflowPolicy: 'FIELD_OVERFLOW',
        box: { x: cfg.originX, y: 22.0, w: 463.63, h: 12.0 }
      },
      {
        canonicalKey: 'program.name',
        geometryStatus: 'VERIFIED',
        styleProfile: 'TABLE_TEXT',
        overflowPolicy: 'FIELD_OVERFLOW',
        box: { x: cfg.originX, y: 37.45, w: 463.63, h: 12.72 }
      },
      {
        canonicalKey: 'period.name',
        geometryStatus: 'VERIFIED',
        styleProfile: 'TABLE_TEXT',
        overflowPolicy: 'FIELD_OVERFLOW',
        box: { x: cfg.originX, y: 50.17, w: 463.63, h: 12.73 }
      },
      {
        canonicalKey: 'module.name',
        geometryStatus: 'VERIFIED',
        styleProfile: 'TABLE_TEXT',
        overflowPolicy: 'FIELD_OVERFLOW',
        box: { x: cfg.originX, y: 62.90, w: 463.63, h: 12.73 }
      },
      {
        canonicalKey: 'curriculum.unit.name',
        geometryStatus: 'VERIFIED',
        styleProfile: 'TABLE_TEXT',
        overflowPolicy: 'FIELD_OVERFLOW',
        box: { x: cfg.originX, y: 75.63, w: 463.63, h: 12.73 }
      },
      {
        canonicalKey: 'attendance.sessionDate',
        geometryStatus: 'VERIFIED',
        styleProfile: 'TABLE_TEXT',
        overflowPolicy: 'FIELD_OVERFLOW',
        repeat: cfg.sessions,
        stepX: cfg.dx,
        box: { x: cfg.originX, y: 136.35, w: 15.99, h: 12.72 }
      },
      {
        canonicalKey: 'student.fullName',
        geometryStatus: 'VERIFIED',
        styleProfile: 'TABLE_TEXT',
        overflowPolicy: 'FIELD_OVERFLOW',
        repeat: 40,
        stepY: 11.99,
        box: { x: cfg.studentX, y: 149.07, w: 181.28, h: 11.99 }
      },
      {
        canonicalKey: 'attendance.mark',
        geometryStatus: 'VERIFIED',
        styleProfile: 'TABLE_TEXT',
        overflowPolicy: 'FIELD_OVERFLOW',
        repeat: 40,
        stepY: 11.99,
        repeatColumns: cfg.sessions,
        stepX: cfg.dx,
        box: { x: cfg.originX, y: 149.07, w: 15.99, h: 11.99 }
      },
      {
        canonicalKey: 'attendance.presentCount',
        geometryStatus: 'VERIFIED',
        styleProfile: 'TABLE_TEXT',
        overflowPolicy: 'FIELD_OVERFLOW',
        repeat: 40,
        stepY: 11.99,
        box: { x: cfg.totPX, y: 149.07, w: 36.99, h: 11.99 }
      },
      {
        canonicalKey: 'attendance.absentCount',
        geometryStatus: 'VERIFIED',
        styleProfile: 'TABLE_TEXT',
        overflowPolicy: 'FIELD_OVERFLOW',
        repeat: 40,
        stepY: 11.99,
        box: { x: cfg.totFX, y: 149.07, w: 37.00, h: 11.99 }
      }
    ]
  };
  
  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('Updated ' + id + ' successfully');
}
