# Regla CETPRO — núcleo del proyecto

Estas reglas son obligatorias para todo el Project.

## Objetivo
Construir un Sistema Académico CETPRO local, mantenible y auditable para uso administrativo, sustituyendo la dependencia operativa de Excel sin perder la lógica institucional ni la fidelidad documental.

## Stack autorizado
- HTML5 semántico.
- CSS3 nativo.
- JavaScript ES6+ sin framework.
- IndexedDB como almacenamiento principal local.
- APIs estándar del navegador.
- Scripts auxiliares de desarrollo pueden usar Python estándar si están documentados, pero la aplicación productiva no debe depender de Python.

## Prohibido sin aprobación explícita
- React, Vue, Angular, Svelte u otros frameworks UI.
- Bootstrap, Tailwind u otros frameworks CSS.
- Firebase, Supabase, servicios cloud obligatorios.
- CDNs, fuentes remotas o recursos externos necesarios para operar.
- Telemetría o envío de datos personales a Internet.
- Cambiar el modelo de datos central por comodidad de implementación.

## Disciplina de trabajo
1. Trabajar por módulos M00–M15.
2. No saltar de módulo productivo sin satisfacer la puerta anterior.
3. No reescribir áreas fuera del propietario del módulo salvo incidencia documentada.
4. Mantener commits pequeños y legibles.
5. Antes de un cambio amplio, crear punto de control Git.
6. Actualizar `docs/PROJECT_STATE.md` después de cada módulo o corrección importante.
7. Toda afirmación de "funciona" requiere una prueba reproducible.

## Datos reales
Los archivos de `sources/raw/` son inmutables. No corregirlos ni sobrescribirlos. Toda normalización se realiza en staging y conserva origen, valor original, propuesta, motivo y decisión.

## UX
La secretaria debe trabajar principalmente con: Inicio, Estudiantes, Matrículas, Registro Académico, Documentos, Incidencias, Respaldo y Configuración. No debe editar estructuras internas de IndexedDB.
