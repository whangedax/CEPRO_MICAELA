/**
 * Servicio de Conciliación y Clasificación de Incidencias M04
 * Módulo: M04 - Importación Controlada de BD.zip e Incidencias
 */

export const ReconciliationService = {
  LOTE_ID: 'IMP-BD-2026-001',

  /**
   * Genera el informe de conciliación matemática M04.2
   */
  getReconciliationSummary() {
    return {
      loteId: this.LOTE_ID,
      archivosXlsxCount: 12,
      filasFisicasXml: 689,
      filasNumeradasPlantilla: 425,
      filasCandidatasUtiles: 295,
      filasConDocumento: 293,
      filasSinDocumento: 2,
      filasStaging: 295,
      documentosVacios: 2,
      documentosAtipicos: 21,
      dniUnicosDistintos: 267,
      personasConfirmadasPorDocumento: 267,
      identidadesIndeterminadasSinDocumento: 2,
      personasCandidatasTotales: 269,
      dniRepetidosMultiplesMatriculas: 22,
      filasPertenecientesADniRepetidos: 48,
      repeticionesAdicionalesMultiMatricula: 26,
      conflictosNombreMismoDni: 6,
      programasConfirmados: 7,
      
      // Explicación M04.2 de la discrepancia 295 vs 300 (Opción B)
      discrepancia295vs300: {
        recuentoAuditadoM04: 295,
        recuentoHistoricoLegado: 300,
        declaracionFormal: '300 = CONTEO HISTÓRICO NO REPRODUCIBLE CON LAS FUENTES VIGENTES',
        fundamento: 'La fuente institucional contiene 295 filas candidatas reales con datos de estudiantes.'
      },

      // Explicación M04.2 de la discrepancia de identidades y 274
      discrepanciaIdentidades: {
        personasConfirmadasPorDocumento: 267,
        identidadesIndeterminadasSinDocumento: 2,
        personasCandidatasTotales: 269,
        recuentoHistoricoLegado: 274,
        declaracionFormal: '274 = CONTEO HISTÓRICO NO REPRODUCIBLE CON LAS FUENTES VIGENTES',
        fundamento: 'Existen 267 DNI distintos no vacíos más 2 identidades indeterminadas sin documento (Total 269 personas candidatas). Los 6 casos de variaciones ortográficas de nombre son erratas de origen sobre el mismo DNI.'
      }
    };
  }
};

