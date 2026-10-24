/**
 * tests/document-watermark-security.test.cjs
 * 
 * Suite de verificación de seguridad y marcas reglamentarias (Tarea 21).
 * Comprueba:
 * - H-01: Presencia física de la marca de agua BORRADOR - NO OFICIAL en documentos incompletos.
 * - H-01: Presencia física de la marca DEMOSTRACIÓN - SIN VALIDEZ OFICIAL en modo demostración.
 * - Requisito J: Ausencia total de marcas en documentos finales completos y oficiales.
 * - Supresión de textos técnicos residuales (TOTAL GENERAL DEL GRUPO, REGISTROS EN ESTA PÁGINA, etc.).
 * - Preservación geométrica (A4 vertical, A3 horizontal, A3 vertical, multipágina).
 * - H-02: Coherencia de Content-Disposition y nombres de descarga en HTTP.
 * - Bloqueo de entrega formal (HTTP 422) ante borradores incompletos.
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createPdfFixture } = require('./helpers/pdf-fixture.cjs');
const { renderPDF } = require('../scripts/offline-pdf.cjs');

const root = path.resolve(__dirname, '..');
const dir = path.join(__dirname, 'offline-artifacts/watermark-tests');
fs.mkdirSync(dir, { recursive: true });

async function extractPages(bytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableFontFace: true,
    useSystemFonts: true,
  }).promise;

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    pages.push({
      pageNumber: i,
      text: content.items.map(it => it.str).join(' '),
      width: Math.round(viewport.width * 100) / 100,
      height: Math.round(viewport.height * 100) / 100,
    });
  }
  return pages;
}

const FORBIDDEN_TECHNICAL = /TOTAL GENERAL DEL GRUPO|REGISTROS EN ESTA PÁGINA|ESTUDIANTES:\s*\d|Página\s+\d+\s+de\s+\d+\s*·\s*Registros/;

describe('Seguridad Documental — Marcas Físicas BORRADOR y DEMOSTRACIÓN (Tarea 21)', () => {

  test('1. Borrador incompleto: muestra "BORRADOR - NO OFICIAL" en todas las páginas (A4 vertical TMPL-04)', async () => {
    const f = createPdfFixture(dir);
    try {
      // Dejar parámetro requerido de fechaInicio vacío para forzar borrador incompleto
      f.put('group', f.group.id, { fechaInicio: '' });
      const doc = f.c.document(f.director, { templateId: 'TMPL-04', groupId: f.group.id });
      assert.equal(doc.preflight.complete, false, 'Preflight debe estar incompleto');

      const bytes = await renderPDF(root, doc, f.director);
      const pages = await extractPages(bytes);
      assert.ok(pages.length >= 1, 'Debe generar al menos una página');

      for (const p of pages) {
        assert.ok(p.text.includes('BORRADOR - NO OFICIAL'), `Página ${p.pageNumber} debe incluir la marca BORRADOR - NO OFICIAL`);
        assert.ok(!p.text.includes('DEMOSTRACIÓN'), `Página ${p.pageNumber} no debe contener marca de DEMOSTRACIÓN`);
        assert.doesNotMatch(p.text, FORBIDDEN_TECHNICAL, `Página ${p.pageNumber} no debe contener marcadores técnicos no autorizados`);
      }

      // Verificación de dimensiones A4 Vertical
      assert.ok(Math.abs(pages[0].width - 595.28) <= 1, `TMPL-04 debe mantener ancho estándar A4: ${pages[0].width}`);
      assert.ok(Math.abs(pages[0].height - 841.89) <= 1, `TMPL-04 debe mantener altura estándar A4: ${pages[0].height}`);

      fs.writeFileSync(path.join(dir, 'TMPL-04_BORRADOR_EVIDENCIA.pdf'), bytes);
    } finally {
      f.c.close();
    }
  });

  test('2. Borrador incompleto: muestra "BORRADOR - NO OFICIAL" en A3 Horizontal (TMPL-05)', async () => {
    const f = createPdfFixture(dir);
    try {
      // Quitar presenceStates para dejar incompleta la asistencia
      f.put('module', 'MOD-009', { presenceStates: '' });
      const doc = f.c.document(f.director, { templateId: 'TMPL-05', groupId: f.group.id, unit: 'UD1' });
      assert.equal(doc.preflight.complete, false, 'Preflight debe estar incompleto');

      const bytes = await renderPDF(root, doc, f.director);
      const pages = await extractPages(bytes);

      for (const p of pages) {
        assert.ok(p.text.includes('BORRADOR - NO OFICIAL'), `Página ${p.pageNumber} de TMPL-05 debe incluir BORRADOR - NO OFICIAL`);
        assert.ok(!p.text.includes('DEMOSTRACIÓN'), 'No debe incluir marca de demo');
        assert.doesNotMatch(p.text, FORBIDDEN_TECHNICAL, 'Sin marcadores técnicos');
      }

      // Verificación de dimensiones A3 Horizontal (ancho 1190.55 pt, alto 841.89 pt)
      assert.ok(Math.abs(pages[0].width - 1190.55) <= 1, 'TMPL-05 debe mantener ancho estándar A3 horizontal');
      assert.ok(Math.abs(pages[0].height - 841.89) <= 1, 'TMPL-05 debe mantener altura estándar A3 horizontal');

      fs.writeFileSync(path.join(dir, 'TMPL-05_BORRADOR_EVIDENCIA.pdf'), bytes);
    } finally {
      f.c.close();
    }
  });

  test('3. Borrador incompleto: muestra "BORRADOR - NO OFICIAL" en A3 Vertical (TMPL-18)', async () => {
    const f = createPdfFixture(dir);
    try {
      f.put('practice', f.enrollment.id, { efsrtFinalGrade: null });
      const doc = f.c.document(f.director, { templateId: 'TMPL-18', groupId: f.group.id });
      assert.equal(doc.preflight.complete, false);

      const bytes = await renderPDF(root, doc, f.director);
      const pages = await extractPages(bytes);

      for (const p of pages) {
        assert.ok(p.text.includes('BORRADOR - NO OFICIAL'), `Página ${p.pageNumber} de TMPL-18 debe incluir BORRADOR - NO OFICIAL`);
        assert.doesNotMatch(p.text, FORBIDDEN_TECHNICAL);
      }

      // Dimensiones A3 Vertical (ancho 841.89 pt, alto 1190.55 pt)
      assert.ok(Math.abs(pages[0].width - 841.89) <= 1, 'TMPL-18 debe mantener ancho estándar A3 vertical');
      assert.ok(Math.abs(pages[0].height - 1190.55) <= 1, 'TMPL-18 debe mantener altura estándar A3 vertical');

      fs.writeFileSync(path.join(dir, 'TMPL-18_BORRADOR_EVIDENCIA.pdf'), bytes);
    } finally {
      f.c.close();
    }
  });

  test('4. Modo Demostración: muestra "DEMOSTRACIÓN - SIN VALIDEZ OFICIAL" en todas las páginas (TMPL-05 A3)', async () => {
    const f = createPdfFixture(dir);
    try {
      const doc = f.c.document(f.director, { templateId: 'TMPL-05', groupId: f.group.id, unit: 'UD1', demoFill: true });
      assert.equal(doc.demoMode, true, 'Debe activar demoMode');

      const bytes = await renderPDF(root, doc, f.director);
      const pages = await extractPages(bytes);

      for (const p of pages) {
        assert.ok(p.text.includes('DEMOSTRACIÓN - SIN VALIDEZ OFICIAL'), `Página ${p.pageNumber} debe incluir DEMOSTRACIÓN - SIN VALIDEZ OFICIAL`);
        assert.ok(!p.text.includes('BORRADOR'), 'No debe incluir marca de borrador ordinario');
        assert.doesNotMatch(p.text, FORBIDDEN_TECHNICAL, 'Sin marcadores técnicos residuales');
      }

      fs.writeFileSync(path.join(dir, 'TMPL-05_DEMOSTRACION_EVIDENCIA.pdf'), bytes);
    } finally {
      f.c.close();
    }
  });

  test('5. Modo Demostración en documento multipágina (TMPL-19, 2 páginas): marca presente en cada hoja', async () => {
    const f = createPdfFixture(dir);
    try {
      const doc = f.c.document(f.director, { templateId: 'TMPL-19', groupId: f.group.id, demoFill: true });
      assert.equal(doc.demoMode, true);

      const bytes = await renderPDF(root, doc, f.director);
      const pages = await extractPages(bytes);
      assert.equal(pages.length, 2, 'TMPL-19 debe generar exactamente 2 páginas');

      for (const p of pages) {
        assert.ok(
          p.text.includes('DEMOSTRACIÓN - SIN VALIDEZ OFICIAL'),
          `La página ${p.pageNumber} de TMPL-19 debe contener la advertencia DEMOSTRACIÓN - SIN VALIDEZ OFICIAL`
        );
        assert.doesNotMatch(p.text, FORBIDDEN_TECHNICAL);
      }

      fs.writeFileSync(path.join(dir, 'TMPL-19_DEMOSTRACION_EVIDENCIA.pdf'), bytes);
    } finally {
      f.c.close();
    }
  });

  test('6. Requisito J: documento completo y oficial NO contiene marcas de borrador ni de demo', async () => {
    const f = createPdfFixture(dir);
    try {
      // Todos los parámetros están completos en la fixture inicial
      for (const id of ['TMPL-01', 'TMPL-04', 'TMPL-05', 'TMPL-18', 'TMPL-19']) {
        const n = Number(id.slice(5));
        const doc = f.c.document(f.director, {
          templateId: id,
          groupId: f.group.id,
          ...(n >= 5 && n <= 17 ? { unit: 'UD1' } : {}),
          demoFill: false,
        });
        assert.equal(doc.preflight.complete, true, `${id} debe tener preflight completo`);
        assert.equal(doc.demoMode, false, `${id} no debe estar en demoMode`);

        const bytes = await renderPDF(root, doc, f.director);
        const pages = await extractPages(bytes);

        for (const p of pages) {
          assert.ok(!p.text.includes('BORRADOR'), `${id} página ${p.pageNumber} NO debe contener BORRADOR`);
          assert.ok(!p.text.includes('DEMOSTRACIÓN'), `${id} página ${p.pageNumber} NO debe contener DEMOSTRACIÓN`);
          assert.doesNotMatch(p.text, FORBIDDEN_TECHNICAL, `${id} página ${p.pageNumber} sin marcadores técnicos`);
        }
      }
    } finally {
      f.c.close();
    }
  });

  test('7. Integración HTTP: POST /api/document/pdf emite Content-Disposition y cabeceras correctas', async () => {
    const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8089';

    // 1. Login director
    const loginRes = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'director.dev', password: 'DirectorDev2026!' }),
    });
    assert.equal(loginRes.status, 200);
    const { token } = await loginRes.json();
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 2. Obtener opciones y seleccionar aula
    const optRes = await fetch(`${BASE_URL}/api/workspace/options`, { headers });
    const optData = await optRes.json();
    const grp = optData.groups[0];

    await fetch(`${BASE_URL}/api/workspace`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        year: grp.year,
        programId: grp.programId,
        moduleId: grp.moduleId,
        groupId: grp.id,
        mode: 'UNIT',
        unit: 'UD1',
      }),
    });

    // 3. Descarga en modo demostración
    const preflightDemoRes = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ groupId: grp.id, templateId: 'TMPL-05', unit: 'UD1', demoFill: true }),
    });
    const docDemo = await preflightDemoRes.json();

    const pdfDemoRes = await fetch(`${BASE_URL}/api/document/pdf`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ groupId: grp.id, templateId: 'TMPL-05', unit: 'UD1', demoFill: true, fingerprint: docDemo.fingerprint }),
    });
    assert.equal(pdfDemoRes.status, 200);
    assert.equal(pdfDemoRes.headers.get('content-type'), 'application/pdf');
    const dispDemo = pdfDemoRes.headers.get('content-disposition') || '';
    assert.ok(dispDemo.includes('TMPL-05_DEMOSTRACION.pdf'), `Debe sugerir nombre con sufijo DEMOSTRACION: ${dispDemo}`);

    // 4. Descarga en modo borrador ordinario
    const preflightDraftRes = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ groupId: grp.id, templateId: 'TMPL-05', unit: 'UD1' }),
    });
    const docDraft = await preflightDraftRes.json();

    const pdfDraftRes = await fetch(`${BASE_URL}/api/document/pdf`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ groupId: grp.id, templateId: 'TMPL-05', unit: 'UD1', fingerprint: docDraft.fingerprint }),
    });
    assert.equal(pdfDraftRes.status, 200);
    const dispDraft = pdfDraftRes.headers.get('content-disposition') || '';
    const isComplete = docDraft.preflight.complete;
    assert.ok(
      dispDraft.includes(isComplete ? '_COMPLETADO.pdf' : '_BORRADOR.pdf'),
      `Content-Disposition debe ser coherente con el estado de preflight: ${dispDraft}`
    );

    // 5. Verificación de bloqueo HTTP 409 ante fingerprint obsoleto
    const conflictRes = await fetch(`${BASE_URL}/api/document/pdf`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ groupId: grp.id, templateId: 'TMPL-05', unit: 'UD1', fingerprint: 'obsolete_fingerprint_xyz' }),
    });
    assert.equal(conflictRes.status, 409, 'Debe retornar HTTP 409 ante fingerprint discordante');

    // 6. Verificación de bloqueo HTTP 422 ante entrega de documento incompleto
    // Se prueba con una plantilla modular incompleta (TMPL-01) si faltan datos
    const submitDraftRes = await fetch(`${BASE_URL}/api/document/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ groupId: grp.id, templateId: 'TMPL-05', unit: 'UD1', fingerprint: docDraft.fingerprint }),
    });
    if (!docDraft.preflight.complete) {
      assert.equal(submitDraftRes.status, 422, 'Entrega oficial de borrador incompleto debe ser rechazada con HTTP 422');
    }
  });
});
