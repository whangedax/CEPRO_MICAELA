/**
 * tests/document-template-filter.test.mjs
 *
 * Verificación formal de filtrado contextual de plantillas documentales:
 * - Segregación RBAC: DOCENTE (15), SECRETARIA (12), DIRECTOR (21).
 * - Contexto Académico por Aula y Unidad Didáctica (UD1..UD7).
 * - Filtrado dinámico de categorías y prevención de fugas de documentos fuera de rol.
 */

import assert from 'node:assert/strict';
import {
  OFFICIAL_TEMPLATES,
  getVisibleTemplates,
  getAvailableCategories,
} from '../src/utils/documentTemplates.ts';

console.log('🧪 Iniciando prueba automatizada de filtrado de plantillas documentales...');

// CASO 1: DOCENTE sin aula seleccionada
{
  const teacherBase = getVisibleTemplates({ role: 'DOCENTE' });
  assert.equal(teacherBase.length, 15, 'DOCENTE debe tener exactamente 15 plantillas asignadas en catálogo');
  
  const forbiddenForTeacher = ['TMPL-01', 'TMPL-02', 'TMPL-03', 'TMPL-19', 'TMPL-20', 'TMPL-21'];
  for (const forbidden of forbiddenForTeacher) {
    const found = teacherBase.some((t) => t.id === forbidden);
    assert.equal(found, false, `DOCENTE NO DEBE ACCEDER A ${forbidden}`);
  }
  console.log('  ✔ CASO 1 APROBADO: DOCENTE base solo contiene formatos de su competencia (TMPL-04..18).');
}

// CASO 2: DOCENTE en contexto de aula con Unidad Didáctica 1 (UD1)
{
  const teacherUD1 = getVisibleTemplates({
    role: 'DOCENTE',
    groupId: 'grp-computacion-01',
    unitCode: 'UD1',
    availableUnits: ['UD1', 'UD2', 'UD3', 'UD4'],
    onlyCurrentUnit: true,
  });

  const ids = teacherUD1.map((t) => t.id);
  assert.deepEqual(
    ids.sort(),
    ['TMPL-04', 'TMPL-05', 'TMPL-11', 'TMPL-18'].sort(),
    'DOCENTE en UD1 debe ver exactamente Portada (TMPL-04), Asistencia UD1 (TMPL-05), Evaluación UD1 (TMPL-11) y EFSRT (TMPL-18)'
  );

  for (const unneeded of ['TMPL-06', 'TMPL-07', 'TMPL-08', 'TMPL-09', 'TMPL-10']) {
    assert.equal(ids.includes(unneeded), false, `No debe incluir ${unneeded} al estar en UD1`);
  }

  for (const unneeded of ['TMPL-12', 'TMPL-13', 'TMPL-14', 'TMPL-15', 'TMPL-16', 'TMPL-17']) {
    assert.equal(ids.includes(unneeded), false, `No debe incluir ${unneeded} al estar en UD1`);
  }

  console.log('  ✔ CASO 2 APROBADO: DOCENTE en UD1 ve solo los 4 formatos de su contexto pedagógico.');
}

// CASO 3: Peluquería y Barbería M2 con Unidad Didáctica 7 (UD7)
{
  const teacherUD7 = getVisibleTemplates({
    role: 'DOCENTE',
    groupId: 'grp-peluqueria-m2',
    unitCode: 'UD7',
    availableUnits: ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'UD7'],
    onlyCurrentUnit: true,
  });

  const ids = teacherUD7.map((t) => t.id);
  assert.ok(ids.includes('TMPL-17'), 'Debe incluir Evaluación UD7 (TMPL-17) para Peluquería M2 UD7');
  assert.equal(ids.includes('TMPL-11'), false, 'No debe incluir Evaluación UD1');
  assert.equal(ids.includes('TMPL-12'), false, 'No debe incluir Evaluación UD2');
  console.log('  ✔ CASO 3 APROBADO: Soporte irrenunciable de UD7 para Peluquería M2 (TMPL-17).');
}

// CASO 4: SECRETARIA (12 plantillas autorizadas)
{
  const secTemplates = getVisibleTemplates({ role: 'SECRETARIA' });
  assert.equal(secTemplates.length, 12, 'SECRETARIA debe tener exactamente 12 plantillas autorizadas');
  
  const secIds = secTemplates.map((t) => t.id);
  assert.ok(secIds.includes('TMPL-01'), 'SECRETARIA debe ver Nómina (TMPL-01)');
  assert.ok(secIds.includes('TMPL-02'), 'SECRETARIA debe ver Ficha (TMPL-02)');
  assert.ok(secIds.includes('TMPL-03'), 'SECRETARIA debe ver Registro Modular (TMPL-03)');
  assert.ok(secIds.includes('TMPL-19'), 'SECRETARIA debe ver Acta (TMPL-19)');
  assert.ok(secIds.includes('TMPL-20'), 'SECRETARIA debe ver Certificado (TMPL-20)');

  assert.equal(secIds.includes('TMPL-04'), false, 'SECRETARIA no debe ver Portada docente (TMPL-04)');
  assert.equal(secIds.includes('TMPL-11'), false, 'SECRETARIA no debe ver Evaluación (TMPL-11)');
  assert.equal(secIds.includes('TMPL-21'), false, 'SECRETARIA no debe ver Título (TMPL-21)');
  console.log('  ✔ CASO 4 APROBADO: SECRETARIA restringida a las 12 plantillas normadas.');
}

// CASO 5: DIRECTOR (21 plantillas oficiales)
{
  const dirTemplates = getVisibleTemplates({ role: 'DIRECTOR' });
  assert.equal(dirTemplates.length, 21, 'DIRECTOR debe tener acceso a las 21 plantillas oficiales');
  console.log('  ✔ CASO 5 APROBADO: DIRECTOR tiene visibilidad de las 21 plantillas oficiales.');
}

// CASO 6: Categorías Pertinentes
{
  const teacherUD1 = getVisibleTemplates({
    role: 'DOCENTE',
    groupId: 'grp-computacion-01',
    unitCode: 'UD1',
    availableUnits: ['UD1', 'UD2', 'UD3', 'UD6'],
    onlyCurrentUnit: true,
  });

  const categories = getAvailableCategories(teacherUD1);
  assert.equal(categories.includes('Matrícula y Registro'), false, 'Categoria Matrícula no debe aparecer si no hay plantillas');
  assert.equal(categories.includes('Actas y Titulación'), false, 'Categoria Actas y Titulación no debe aparecer si no hay plantillas');
  assert.ok(categories.includes('Carpeta Pedagógica'), 'Debe incluir Carpeta Pedagógica');
  assert.ok(categories.includes('Control de Asistencia'), 'Debe incluir Control de Asistencia');
  assert.ok(categories.includes('Evaluación por Competencias'), 'Debe incluir Evaluación por Competencias');
  assert.ok(categories.includes('Prácticas Preprofesionales'), 'Debe incluir Prácticas Preprofesionales');
  console.log('  ✔ CASO 6 APROBADO: Categorías disponibles filtran categorias vacías.');
}

console.log('✅ TODOS LOS CASOS DE FILTRADO DOCUMENTAL PASARON CON ÉXITO (6/6).');

