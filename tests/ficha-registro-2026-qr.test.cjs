/**
 * tests/ficha-registro-2026-qr.test.cjs
 *
 * Suite de Pruebas Integral para la Ficha de Registro de Datos y Matrícula 2026:
 * - Escenario 1: Generación y codificación de WhatsApp compacto con cálculo exacto de CRC32.
 * - Escenario 2: Intento adversarial de alteración/tampering y rechazo con error 400 (CRC mismatch).
 * - Escenario 3: Importación exitosa desde WhatsApp en /api/admission-ficha/import-whatsapp y /api/secretaria/fichas-registro/importar-texto.
 * - Escenario 4: Envío directo desde formulario web /api/public/admission-ficha/submit con IP LAN y verificación en bandeja.
 *   Verificación de ruta /admision-qr con HTML interactivo.
 * - Escenario 5: Descarga de formulario autónomo vía /api/admission-ficha/standalone-html (archivo offline interactivo).
 * - Escenario 6: Confirmación y guardado definitivo (save-and-enroll) en SQLite: persistencia de profile2026, matriculación en grupo y PRAGMA quick_check = ok.
 * - Escenario 7: Generación de PDF oficial de alta fidelidad (/api/admission-ficha/pdf y /api/secretaria/fichas-registro/pdf/:id),
 *   con validación de tamaño > 200 KB, aplicación de parches blancos y extracción de texto mediante pdfjs-dist.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

const { createService } = require('../scripts/offline-http.cjs');
const FichaRegistro2026 = require('../scripts/ficha-registro-2026.cjs');

const root = path.resolve(__dirname, '..');

describe('Ficha de Matrícula y Registro de Datos 2026 — QR & WhatsApp Suite', () => {
  let tempDir;
  let service;
  let server;
  let serverPort;
  let baseUrl;
  let secToken;
  let dirToken;
  let docToken;
  let secUser;
  let dirUser;
  let docUser;

  const sampleProfile = {
    documentoIdentidad: '78901234',
    apellidoPaterno: 'HUANCA',
    apellidoMaterno: 'APAZA',
    nombres: 'EDWIN ROLANDO',
    sexo: 'M',
    fechaNacimiento: '2004-06-15',
    edad: 21,
    pais: 'PERU',
    lugarNacimiento: 'JULIACA',
    region: 'PUNO',
    provincia: 'SAN ROMAN',
    distrito: 'JULIACA',
    domicilio: 'JR. SAN ROMAN 456 - URB. LA FLORESTA',
    trabaja: false,
    puestoTrabajo: '',
    estadoCivil: 'SOLTERO(A)',
    telefono: '951234567',
    correoElectronico: 'edwin.huanca@gmail.com',
    contactoEmergencia: '951987654 - ROSA APAZA (MADRE)',
    gradoEstudios: 'SECUNDARIA COMPLETA',
    cargaFamiliar: false,
    cargaFamiliarPersonas: 0,
    internetCasa: true,
    operadorCelular: 'CLARO',
    equipoPC: false,
    equipoLaptop: true,
    equipoCelular: true,
    discapacidad: false,
    tipoDiscapacidad: '',
    lenguaOriginaria: 'QUECHUA',
    programaEstudios: 'MECÁNICA AUTOMOTRIZ',
    especialidad: 'MÓDULO I',
    turno: 'TARDE',
    codigoInscripcion: ''
  };

  function request(method, route, options = {}) {
    return new Promise((resolve, reject) => {
      const headers = { ...(options.headers || {}) };
      if (!headers.Host) headers.Host = `127.0.0.1:${serverPort}`;
      let bodyData = null;

      if (options.body !== undefined && options.body !== null) {
        if (typeof options.body === 'string') {
          bodyData = options.body;
        } else {
          bodyData = JSON.stringify(options.body);
          if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
        }
        headers['Content-Length'] = Buffer.byteLength(bodyData);
      }

      const req = http.request({
        hostname: '127.0.0.1',
        port: serverPort,
        path: route,
        method,
        headers
      }, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let data;
          const contentType = res.headers['content-type'] || '';
          if (options.rawBuffer) {
            data = buffer;
          } else if (contentType.includes('application/json')) {
            try {
              data = JSON.parse(buffer.toString('utf8'));
            } catch {
              data = buffer.toString('utf8');
            }
          } else {
            data = buffer.toString('utf8');
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data,
            buffer
          });
        });
      });

      req.on('error', reject);
      if (bodyData) req.write(bodyData);
      req.end();
    });
  }

  before(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cetpro-ficha-test-'));
    const baselineSource = path.join(root, 'sources', 'baseline', 'production-2026.sqlite');
    const targetDb = path.join(tempDir, 'cetpro.sqlite');
    fs.copyFileSync(baselineSource, targetDb);

    service = createService({
      root,
      directory: tempDir,
      backupFile: null
    });

    dirUser = service.core.users().find(u => u.role === 'DIRECTOR');
    secUser = service.core.users().find(u => u.role === 'SECRETARIA');
    docUser = service.core.users().find(u => u.role === 'DOCENTE' && u.active);

    dirToken = 'token-qa-director-' + Date.now();
    secToken = 'token-qa-secretaria-' + Date.now();
    docToken = 'token-qa-docente-' + Date.now();

    service.core.sessions.set(dirToken, {
      userId: dirUser.id,
      expires: Date.now() + 8 * 3600000,
      version: dirUser.version,
      workspace: null
    });

    service.core.sessions.set(secToken, {
      userId: secUser.id,
      expires: Date.now() + 8 * 3600000,
      version: secUser.version,
      workspace: null
    });

    service.core.sessions.set(docToken, {
      userId: docUser.id,
      expires: Date.now() + 8 * 3600000,
      version: docUser.version,
      workspace: null
    });

    server = service.server();
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        baseUrl = `http://127.0.0.1:${serverPort}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => {
      if (server) {
        server.close(() => {
          try {
            if (service && service.core) service.core.close();
          } catch {}
          resolve();
        });
      } else {
        resolve();
      }
    });
    try {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  test('Escenario 1: Generación de mensaje compacto WhatsApp para estudiante con cálculo exacto de CRC32', () => {
    const normalized = FichaRegistro2026.normalizeProfile2026(sampleProfile);
    assert.equal(normalized.documentoIdentidad, '78901234');
    assert.equal(normalized.fechaNacimientoDia, '15');
    assert.equal(normalized.fechaNacimientoMes, '06');
    assert.equal(normalized.fechaNacimientoAnio, '2004');
    assert.equal(normalized.edad, 21);
    assert.equal(normalized.sexo, 'M');

    const token = FichaRegistro2026.encodeCompactPayload(normalized);
    assert.ok(token.startsWith('CETPRO2026:v1:'));
    const parts = token.split(':');
    assert.equal(parts.length, 4);
    assert.equal(parts[2].length, 8);

    const buf = Buffer.from(parts[3], 'base64url');
    const calculatedCrc = FichaRegistro2026.calculateCRC32(buf);
    assert.equal(parts[2], calculatedCrc);

    const wa = FichaRegistro2026.generateWhatsAppMessage(normalized, '951234567');
    assert.ok(wa.message.includes('---INICIO-FICHA-CETPRO-2026---'));
    assert.ok(wa.message.includes(token));
    assert.ok(wa.message.includes('---FIN-FICHA-CETPRO-2026---'));
    assert.ok(wa.url.includes('https://wa.me/51951234567'));

    const decodedFromToken = FichaRegistro2026.decodeCompactPayload(token);
    assert.equal(decodedFromToken.documentoIdentidad, '78901234');
    assert.equal(decodedFromToken.apellidoPaterno, 'HUANCA');
    assert.equal(decodedFromToken.nombres, 'EDWIN ROLANDO');

    const decodedFromWa = FichaRegistro2026.decodeCompactPayload(wa.message);
    assert.equal(decodedFromWa.documentoIdentidad, '78901234');
    assert.equal(decodedFromWa.apellidoPaterno, 'HUANCA');
    assert.equal(decodedFromWa.nombres, 'EDWIN ROLANDO');
  });

  test('Escenario 2: Intento adversarial de inyectar mensaje alterado (tampering) rechazado con 400', async () => {
    const normalized = FichaRegistro2026.normalizeProfile2026(sampleProfile);
    const token = FichaRegistro2026.encodeCompactPayload(normalized);

    const parts = token.split(':');
    const corruptedB64 = parts[3].slice(0, -2) + (parts[3].endsWith('A') ? 'B' : 'A') + parts[3].slice(-1);
    const corruptedToken = `${parts[0]}:${parts[1]}:${parts[2]}:${corruptedB64}`;

    assert.throws(() => {
      FichaRegistro2026.decodeCompactPayload(corruptedToken);
    }, /CRC inválido|incompleto o fue modificado/i);

    const badCrcToken = `${parts[0]}:${parts[1]}:DEADBEEF:${parts[3]}`;
    assert.throws(() => {
      FichaRegistro2026.decodeCompactPayload(badCrcToken);
    }, /CRC inválido|incompleto o fue modificado/i);

    const tamperedMessage = `---INICIO-FICHA-CETPRO-2026---\n${corruptedToken}\n---FIN-FICHA-CETPRO-2026---`;
    const res = await request('POST', '/api/admission-ficha/import-whatsapp', {
      headers: {
        Authorization: `Bearer ${secToken}`
      },
      body: {
        text: tamperedMessage
      }
    });

    assert.equal(res.status, 400);
    assert.ok(res.data.error.includes('CRC inválido') || res.data.error.includes('incompleto o fue modificado'));
  });

  test('Escenario 3: Importación exitosa desde texto WhatsApp por /api/admission-ficha/import-whatsapp y /api/secretaria/fichas-registro/importar-texto', async () => {
    const wa = FichaRegistro2026.generateWhatsAppMessage(sampleProfile, '951234567');

    const res1 = await request('POST', '/api/admission-ficha/import-whatsapp', {
      headers: {
        Authorization: `Bearer ${secToken}`
      },
      body: {
        text: wa.message
      }
    });

    assert.equal(res1.status, 200);
    assert.equal(res1.data.ok, true);
    assert.equal(res1.data.crcOk, true);
    assert.equal(res1.data.profile.documentoIdentidad, '78901234');
    assert.equal(res1.data.profile.apellidoPaterno, 'HUANCA');
    assert.equal(res1.data.profile.nombres, 'EDWIN ROLANDO');

    const res2 = await request('POST', '/api/secretaria/fichas-registro/importar-texto', {
      headers: {
        Authorization: `Bearer ${secToken}`
      },
      body: {
        text: wa.message
      }
    });

    assert.equal(res2.status, 200);
    assert.equal(res2.data.ok, true);
    assert.equal(res2.data.profile.documentoIdentidad, '78901234');
  });

  let submittedSubmissionId = null;

  test('Escenario 4: Envío directo desde formulario web /api/public/admission-ficha/submit con IP LAN y verificación en bandeja', async () => {
    const resQr = await request('GET', '/admision-qr', {
      headers: {
        Host: `192.168.1.150:${serverPort}`
      }
    });
    assert.equal(resQr.status, 200);
    assert.ok(resQr.headers['content-type'].includes('text/html'));
    assert.ok(resQr.data.includes('<!DOCTYPE html>'));
    assert.ok(resQr.data.includes('FICHA DE MATRÍCULA Y REGISTRO DE DATOS 2026'));
    assert.ok(resQr.data.includes('admissionForm'));

    const resInfo = await request('GET', '/api/public/admission-ficha/info', {
      headers: {
        Host: `192.168.1.150:${serverPort}`
      }
    });
    assert.equal(resInfo.status, 200);
    assert.equal(resInfo.data.academicYear, 2026);
    assert.ok(Array.isArray(resInfo.data.programs));
    assert.ok(resInfo.data.programs.length > 0);

    const resSubmit = await request('POST', '/api/public/admission-ficha/submit', {
      headers: {
        Host: `192.168.1.150:${serverPort}`
      },
      body: sampleProfile
    });

    assert.equal(resSubmit.status, 201);
    assert.equal(resSubmit.data.ok, true);
    assert.ok(resSubmit.data.submissionId);
    assert.equal(resSubmit.data.documentoIdentidad, '78901234');
    submittedSubmissionId = resSubmit.data.submissionId;

    const resSubmissions = await request('GET', '/api/admission-ficha/submissions', {
      headers: {
        Authorization: `Bearer ${secToken}`
      }
    });

    assert.equal(resSubmissions.status, 200);
    assert.ok(Array.isArray(resSubmissions.data.submissions));
    const found = resSubmissions.data.submissions.find(s => s.submissionId === submittedSubmissionId);
    assert.ok(found, 'La postulación debe figurar en la bandeja de admisiones');
    assert.equal(found.status, 'PENDIENTE');
    assert.equal(found.profile.documentoIdentidad, '78901234');
  });

  test('Escenario 5: Descarga de formulario autónomo vía /api/admission-ficha/standalone-html', async () => {
    const res = await request('GET', '/api/admission-ficha/standalone-html', {
      headers: {
        Authorization: `Bearer ${secToken}`
      }
    });

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.ok(res.headers['content-disposition'].includes('ficha_admision_2026.html'));
    assert.ok(res.data.includes('calcCrc32'));
    assert.ok(res.data.includes('createCompactPayload'));
    assert.ok(res.data.includes('CETPRO2026:v1:'));
  });

  test('Escenario 6: Confirmación y guardado definitivo (save-and-enroll) en SQLite', async () => {
    const targetGroup = 'GRP-2026-AUTO-T-A';

    const resSave = await request('POST', '/api/admission-ficha/save-and-enroll', {
      headers: {
        Authorization: `Bearer ${secToken}`
      },
      body: {
        profile: sampleProfile,
        groupId: targetGroup,
        submissionId: submittedSubmissionId
      }
    });

    assert.equal(resSave.status, 200);
    assert.equal(resSave.data.success, true);
    assert.equal(resSave.data.enrolled, true);
    assert.ok(resSave.data.studentId);
    assert.ok(resSave.data.enrollment);

    const studentInDb = service.core.records('students').find(s => s.document === '78901234');
    assert.ok(studentInDb, 'El estudiante debe existir en la base de datos');
    assert.equal(studentInDb.sex, 'H');
    assert.equal(studentInDb.lastName1, 'HUANCA');
    assert.equal(studentInDb.firstNames, 'EDWIN ROLANDO');
    assert.ok(studentInDb.profile2026, 'El campo profile2026 debe quedar persistido en el registro');
    assert.equal(studentInDb.profile2026.documentoIdentidad, '78901234');
    assert.equal(studentInDb.profile2026.lenguaOriginaria, 'QUECHUA');

    const enrollmentInDb = service.core.records('enrollments').find(e => e.studentId === studentInDb.id && e.groupId === targetGroup);
    assert.ok(enrollmentInDb, 'Debe existir matrícula activa en el grupo GRP-2026-AUTO-T-A');
    assert.equal(enrollmentInDb.active, true);

    const subRecord = service.core.record('documentSettings', 'admissionSubmission:' + submittedSubmissionId);
    assert.equal(subRecord.fields.status, 'MATRICULADO');

    const integrity = service.core.db.prepare('PRAGMA quick_check').get();
    assert.equal(integrity.quick_check, 'ok');
  });

  test('Escenario 7: Generación de PDF oficial mediante /api/admission-ficha/pdf y verificación con pdfjs-dist', async () => {
    const resPdf = await request('POST', '/api/admission-ficha/pdf', {
      headers: {
        Authorization: `Bearer ${secToken}`
      },
      body: {
        documentoIdentidad: '78901234'
      },
      rawBuffer: true
    });

    assert.equal(resPdf.status, 200);
    assert.equal(resPdf.headers['content-type'], 'application/pdf');
    assert.ok(resPdf.headers['content-disposition'].includes('FICHA_2026_78901234.pdf'));
    assert.ok(resPdf.buffer.length > 200000, 'Tamaño del PDF debe ser > 200 KB');

    const resPdfGet = await request('GET', '/api/secretaria/fichas-registro/pdf/78901234', {
      headers: {
        Authorization: `Bearer ${secToken}`
      },
      rawBuffer: true
    });

    assert.equal(resPdfGet.status, 200);
    assert.equal(resPdfGet.headers['content-type'], 'application/pdf');
    assert.ok(resPdfGet.buffer.length > 200000);

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(resPdf.buffer),
      disableFontFace: true,
      useSystemFonts: true
    }).promise;

    assert.equal(pdf.numPages, 1);
    const textContent = await (await pdf.getPage(1)).getTextContent();
    const allText = textContent.items.map(i => i.str).join(' ');

    assert.ok(allText.includes('78901234'), 'DNI 78901234 debe encontrarse en el texto vectorial');
    assert.ok(allText.includes('HUANCA'), 'Apellido HUANCA debe encontrarse en el texto vectorial');
    assert.ok(allText.includes('EDWIN'), 'Nombre EDWIN debe encontrarse en el texto vectorial');
    assert.ok(allText.includes('MECÁNICA AUTOMOTRIZ') || allText.includes('MECANICA AUTOMOTRIZ'), 'Programa MECÁNICA AUTOMOTRIZ debe encontrarse en el texto vectorial');
    assert.ok(allText.includes('951234567'), 'Teléfono debe encontrarse en el texto vectorial');
  });

  test('Escenario 8: Configuración dinámica del número de WhatsApp Receptor (cambio de Secretaria y modo sin número fijo)', async () => {
    // 1. Por defecto sin configurar: no debe usar un número falso inexistente
    const initialCfg = await request('GET', '/api/admission-ficha/config', {
      headers: { Authorization: `Bearer ${secToken}` }
    });
    assert.equal(initialCfg.status, 200);
    assert.equal(initialCfg.data.secretariaWhatsapp, '');
    assert.equal(initialCfg.data.isWhatsappConfigured, false);

    // 2. La Secretaria configura su número real (ej. 985030353)
    const updateRes1 = await request('POST', '/api/admission-ficha/config', {
      headers: { Authorization: `Bearer ${secToken}` },
      body: {
        secretariaWhatsapp: '985 030 353',
        receptorNombre: 'Secretaría Académica — Turno Mañana'
      }
    });
    assert.equal(updateRes1.status, 200);
    assert.equal(updateRes1.data.ok, true);
    assert.equal(updateRes1.data.secretariaWhatsapp, '51985030353');
    assert.equal(updateRes1.data.receptorNombre, 'Secretaría Académica — Turno Mañana');
    assert.equal(updateRes1.data.isWhatsappConfigured, true);
    assert.ok(updateRes1.data.lanUrl.includes('?wa=51985030353'), 'La URL del QR debe incluir ?wa=51985030353');
    assert.ok(updateRes1.data.qrSvg.includes('<svg'), 'Debe regenerar el QR SVG con el nuevo número');

    // 3. El endpoint público /api/public/admission-ficha/info y /admision-qr reflejan el nuevo número
    const pubInfo1 = await request('GET', '/api/public/admission-ficha/info', {
      headers: { Host: `192.168.1.150:${serverPort}` }
    });
    assert.equal(pubInfo1.status, 200);
    assert.equal(pubInfo1.data.secretariaWhatsapp, '51985030353');
    assert.equal(pubInfo1.data.receptorNombre, 'Secretaría Académica — Turno Mañana');

    const qrHtml1 = await request('GET', '/admision-qr', {
      headers: { Host: `192.168.1.150:${serverPort}` }
    });
    assert.equal(qrHtml1.status, 200);
    assert.ok(qrHtml1.data.includes('985030353'), 'El formulario móvil debe pre-cargar el número 985030353');
    assert.ok(qrHtml1.data.includes('secretariaPhoneInput'), 'El formulario móvil debe permitir editar el número receptor');
    assert.ok(qrHtml1.data.includes('btnWhatsAppChoose'), 'El formulario móvil debe incluir botón para elegir contacto sin número fijo');

    // 4. Si cambia la Secretaria (nuevo número 927639492), se actualiza inmediatamente
    const updateRes2 = await request('POST', '/api/admission-ficha/config', {
      headers: { Authorization: `Bearer ${secToken}` },
      body: {
        secretariaWhatsapp: '927639492',
        receptorNombre: 'Nueva Encargada de Matrícula'
      }
    });
    assert.equal(updateRes2.status, 200);
    assert.equal(updateRes2.data.secretariaWhatsapp, '51927639492');
    assert.ok(updateRes2.data.lanUrl.includes('?wa=51927639492'));

    // 5. Modo sin número fijo (selector de contactos WhatsApp https://wa.me/?text=...)
    const waNoPhone = FichaRegistro2026.generateWhatsAppMessage(sampleProfile, '');
    assert.ok(waNoPhone.url.startsWith('https://wa.me/?text='), 'Sin número fijo debe abrir selector de contactos wa.me/?text=');
  });

  test('Escenario 9: Limpieza de plantilla, actualización 100% fiel de datos editados ({ profile }), tipografía Bold, impresión de alumno y acceso de Director', async () => {
    // El estudiante 78901234 ya existe en la BD con nombre EDWIN ROLANDO y carrera MECÁNICA AUTOMOTRIZ.
    // Simulamos que el Director o la Secretaria limpian/editan los datos en el Editor (enviando { profile: editedProfile }):
    const editedProfile = {
      documentoIdentidad: '78901234',
      apellidoPaterno: 'CONDORI',
      apellidoMaterno: ' APAZA',
      nombres: 'ROSA MARGARITA',
      sexo: 'F',
      fechaNacimiento: '1998-11-24',
      edad: 27,
      pais: 'PERU',
      lugarNacimiento: 'PUNO / AZÁNGARO',
      distrito: 'SAN MIGUEL',
      provincia: 'SAN ROMÁN',
      region: 'PUNO',
      domicilio: 'AV. CIRCUNVALACIÓN N° 888 - URB. NUEVA ESPERANZA',
      trabaja: true,
      puestoTrabajo: 'ESTILISTA INDEPENDIENTE',
      estadoCivil: 'CASADO',
      telefono: '988776655',
      correoElectronico: 'rosa.condori98@gmail.com',
      contactoEmergencia: 'PEDRO APAZA - 951001122',
      gradoEstudios: 'SUPERIOR TÉCNICA',
      cargaFamiliar: true,
      cargaFamiliarPersonas: 3,
      internetCasa: false,
      operadorCelular: 'ENTEL',
      equipoDisponible: {
        pc: false,
        laptop: true,
        celular: true,
      },
      discapacidad: false,
      tipoDiscapacidad: '',
      lenguaOriginaria: 'AYMARA',
      institucional: {
        codigoInscripcion: 'INS-2026-9999',
        correoInstitucional: 'cetpromicaelabastidas@gmail.com',
        paginaWeb: 'www.cetpromicaelabastidas.edu.pe',
        programaEstudios: 'PELUQUERÍA Y BARBERÍA',
        nivelFormativo: 'AUXILIAR TÉCNICO',
        especialidad: 'Corte de Cabellos, Peinados y Diseño de Barbas',
        turno: 'MAÑANA',
      },
    };

    // 1. Prueba con rol DIRECTOR en POST /api/admission-ficha/pdf enviando { profile: editedProfile }
    const resDirPdf = await request('POST', '/api/admission-ficha/pdf', {
      headers: { Authorization: `Bearer ${dirToken}` },
      body: { profile: editedProfile },
      rawBuffer: true
    });
    assert.equal(resDirPdf.status, 200);
    assert.equal(resDirPdf.headers['content-type'], 'application/pdf');

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdfDoc = await pdfjs.getDocument({
      data: new Uint8Array(resDirPdf.buffer),
      disableFontFace: true,
      useSystemFonts: true
    }).promise;

    const textContent = await (await pdfDoc.getPage(1)).getTextContent();
    const allText = textContent.items.map(i => i.str).join(' ');

    // Verificar que los datos NUEVOS editados se reflejan al 100% y que los antiguos de la BD NO los pisan
    assert.ok(allText.includes('CONDORI'), 'Debe mostrar el nuevo apellido CONDORI');
    assert.ok(allText.includes('ROSA MARGARITA'), 'Debe mostrar el nuevo nombre ROSA MARGARITA');
    assert.ok(!allText.includes('EDWIN ROLANDO'), 'No debe mantener el nombre antiguo de la BD');
    assert.ok(allText.includes('PELUQUERÍA Y BARBERÍA') || allText.includes('PELUQUERIA Y BARBERIA'), 'Debe actualizar a PELUQUERÍA Y BARBERÍA');
    assert.ok(!allText.includes('MECÁNICA AUTOMOTRIZ'), 'No debe mantener la carrera antigua de la BD');
    assert.ok(allText.includes('AV. CIRCUNVALACIÓN N° 888'), 'Debe mostrar el nuevo domicilio');
    assert.ok(allText.includes('988776655'), 'Debe mostrar el nuevo teléfono');
    assert.ok(allText.includes('ESTILISTA INDEPENDIENTE'), 'Debe mostrar el nuevo puesto de trabajo');
    assert.ok(allText.includes('CASTELLANO, AYMARA'), 'Debe mostrar la nueva lengua originaria AYMARA');
    assert.ok(allText.includes('INS-2026-9999'), 'Debe mostrar el nuevo código de inscripción');
    assert.ok(allText.includes('24') && allText.includes('11') && allText.includes('1998'), 'Debe actualizar día/mes/año de nacimiento');

    // 2. Prueba del endpoint público de impresión directa para el alumno: POST /api/public/admission-ficha/pdf
    const resStudentPrint = await request('POST', '/api/public/admission-ficha/pdf', {
      headers: { Host: `192.168.1.150:${serverPort}` },
      body: editedProfile,
      rawBuffer: true
    });
    assert.equal(resStudentPrint.status, 200);
    assert.equal(resStudentPrint.headers['content-type'], 'application/pdf');
    assert.ok(resStudentPrint.buffer.length > 200000);
  });

  test('Escenario 10: Descarga de .html sin error 401 (sin cabecera Authorization), autonomía offline (impresión Bold + QR) y Opción A (URL pública permanente)', async () => {
    // 1. Configurar número de WhatsApp y URL Pública Permanente (Opción A)
    const resCfg = await request('POST', '/api/admission-ficha/config', {
      headers: { Authorization: `Bearer ${secToken}` },
      body: {
        secretariaWhatsapp: '985030353',
        receptorNombre: 'Secretaría Admisión 2026',
        publicFormUrl: 'https://cetpro-micaela-2026.netlify.app'
      }
    });
    assert.equal(resCfg.status, 200);
    assert.equal(resCfg.data.isPublicUrlActive, true);
    assert.equal(resCfg.data.admissionUrl, 'https://cetpro-micaela-2026.netlify.app?wa=51985030353');
    assert.ok(resCfg.data.qrSvg.includes('<svg'));

    // 2. Descargar /api/admission-ficha/standalone-html SIN cabeceras Authorization (simulando clic nativo del navegador)
    const resHtml1 = await request('GET', '/api/admission-ficha/standalone-html', {
      headers: {}
    });
    assert.equal(resHtml1.status, 200, 'No debe devolver 401 Necesita autorización');
    assert.ok(String(resHtml1.headers['content-type']).includes('text/html'), 'Debe devolver text/html y nunca JSON de error');
    assert.ok(String(resHtml1.headers['content-disposition']).includes('ficha_admision_2026.html'));
    assert.ok(resHtml1.data.includes('<!DOCTYPE html>'));
    assert.ok(resHtml1.data.includes('printOfficialFicha2026Offline'), 'El .html debe incluir el motor de impresión oficial A4 en Bold 100% autónomo');
    assert.ok(resHtml1.data.includes('function generateQrSvg'), 'El .html debe incluir el generador de QR inverso 100% offline');
    assert.ok(resHtml1.data.includes('985030353'), 'El .html debe llevar preconfigurado el número de WhatsApp de Secretaría');

    // 3. Descargar también desde /api/public/admission-ficha/standalone-html
    const resHtml2 = await request('GET', '/api/public/admission-ficha/standalone-html', {
      headers: { Host: `192.168.100.155:${serverPort}` }
    });
    assert.equal(resHtml2.status, 200);
    assert.ok(resHtml2.data.includes('printOfficialFicha2026Offline'));
  });

  test('Escenario 11: Regresión Cruzada — Selector de Carreras/UD y Configuración Académica/Documental devuelven HTTP 200 tras postulación QR, WhatsApp, configuración y matrícula', async () => {
    // 1. Verificar que todos los registros escritos en documentSettings tengan scope bien formado
    const allDocSettings = service.core.records('documentSettings');
    const unscoped = allDocSettings.filter(r => !r?.scope?.kind);
    assert.equal(unscoped.length, 0, 'Ningún registro en documentSettings debe carecer de scope.kind');

    const configRec = service.core.record('documentSettings', 'admissionConfig2026');
    assert.deepEqual(configRec?.scope, { kind: 'admissionConfig', target: '2026' });

    const submissionRecs = allDocSettings.filter(r => String(r.id).startsWith('admissionSubmission:'));
    assert.ok(submissionRecs.length > 0);
    for (const sub of submissionRecs) {
      const subId = String(sub.id).slice('admissionSubmission:'.length);
      assert.deepEqual(sub.scope, { kind: 'admissionSubmission', target: subId });
    }

    const profileRecs = allDocSettings.filter(r => String(r.id).startsWith('profile2026:'));
    assert.ok(profileRecs.length > 0);
    for (const prof of profileRecs) {
      const stId = String(prof.id).slice('profile2026:'.length);
      assert.deepEqual(prof.scope, { kind: 'profile2026', target: stId });
    }

    // 2. GET /api/workspace/options con DIRECTOR y SECRETARIA devuelve HTTP 200 con carreras, módulos y grupos con UDs
    for (const [roleName, token] of [['DIRECTOR', dirToken], ['SECRETARIA', secToken]]) {
      const wsRes = await request('GET', '/api/workspace/options', {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(wsRes.status, 200, `GET /api/workspace/options debe responder 200 para ${roleName}`);
      assert.ok(Array.isArray(wsRes.data.programs) && wsRes.data.programs.length > 0, `${roleName}: programs.length > 0`);
      assert.ok(Array.isArray(wsRes.data.modules) && wsRes.data.modules.length > 0, `${roleName}: modules.length > 0`);
      assert.ok(Array.isArray(wsRes.data.groups) && wsRes.data.groups.length > 0, `${roleName}: groups.length > 0`);
      assert.ok(wsRes.data.groups.some(g => Array.isArray(g.units) && g.units.length > 0), `${roleName}: aulas con unidades didácticas`);
    }

    // 3. GET /api/academic/configuration con DIRECTOR y SECRETARIA devuelve HTTP 200
    for (const [roleName, token] of [['DIRECTOR', dirToken], ['SECRETARIA', secToken]]) {
      const acadRes = await request('GET', '/api/academic/configuration', {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(acadRes.status, 200, `GET /api/academic/configuration debe responder 200 para ${roleName}`);
      assert.ok(Array.isArray(acadRes.data.records) && acadRes.data.records.length > 0);
    }

    // 4. GET /api/document/configuration con DIRECTOR, SECRETARIA y DOCENTE devuelve HTTP 200
    for (const [roleName, token] of [['DIRECTOR', dirToken], ['SECRETARIA', secToken], ['DOCENTE', docToken]]) {
      const docRes = await request('GET', '/api/document/configuration', {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(docRes.status, 200, `GET /api/document/configuration debe responder 200 para ${roleName}`);
      assert.ok(Array.isArray(docRes.data.settings));
    }

    // 5. Restricción de rol en /api/admission-ficha/config autenticado vs público
    const docCfgRes = await request('GET', '/api/admission-ficha/config', {
      headers: { Authorization: `Bearer ${docToken}` }
    });
    assert.equal(docCfgRes.status, 403, 'DOCENTE no debe acceder a /api/admission-ficha/config autenticado');

    const pubCfgRes = await request('GET', '/api/public/admission-ficha/config', {
      headers: { Host: `192.168.1.150:${serverPort}` }
    });
    assert.equal(pubCfgRes.status, 200, '/api/public/admission-ficha/config debe permanecer público para el formulario QR');
  });
});