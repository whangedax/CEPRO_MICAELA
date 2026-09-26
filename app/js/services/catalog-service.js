/**
 * Servicio de Catálogos Curriculares Oficiales (Programas y Módulos)
 * Módulo: M02 - Catálogos y Configuración
 */

import { ProgramRepository } from '../repositories/program-repository.js';
import { ModuleRepository } from '../repositories/module-repository.js';
import { InstitutionRepository } from '../repositories/institution-repository.js';
import { AuditService } from './audit-service.js';
import { ValidationError } from './error-service.js';
import {
  buildInstitutionalSourceRecord,
  INSTITUTION_SOURCE_MIGRATION_VERSION
} from '../data/institutional-source-2026.js';

export const OFFICIAL_CATALOG_SEED = [
  {
    id: 'PROG-001',
    codigo: 'PROG-001',
    nombre: 'MECÁNICA AUTOMOTRIZ',
    nombreOriginalFuente: 'MECÁNICA AUTOMOTRIZ',
    fuente: 'sources/raw/CARRERAS.jpeg',
    estado: 'ACTIVO',
    modulos: [
      {
        id: 'MOD-001',
        numeroModulo: 1,
        nombre: 'Mantenimiento y Reparación de Sistema de Suspensión, Dirección, Frenos y Transmisión',
        nombreOriginalFuente: 'Mantenimiento y Reparación de Sistema de Suspensión, Dirección, Frenos y Transmisión'
      },
      {
        id: 'MOD-002',
        numeroModulo: 2,
        nombre: 'Diagnóstico y Mantenimiento del Motor de Combustión Interna de los Vehículos Automotrices',
        nombreOriginalFuente: 'Diagnóstico y Mantenimiento del Motor de Combustión Interna de los Vehículos Automotrices'
      }
    ]
  },
  {
    id: 'PROG-002',
    codigo: 'PROG-002',
    nombre: 'MECÁNICA DE MOTOS Y VEHÍCULOS AFINES',
    nombreOriginalFuente: 'MECÁNICA DE MOTOS Y VEHÍCULOS AFINES',
    fuente: 'sources/raw/CARRERAS.jpeg',
    estado: 'ACTIVO',
    modulos: [
      {
        id: 'MOD-003',
        numeroModulo: 1,
        nombre: 'Mantenimiento y Reparación de Sistema de Suspensión, Dirección, Frenos, Transmisión, Sistema Eléctrico y Sistema Electrónico de Motos y Vehículos Afines',
        nombreOriginalFuente: 'Mantenimiento y Reparación de Sistema de Suspensión, Dirección, Frenos, Transmisión, Sistema Eléctrico y Sistema Electrónico de Motos y Vehículos Afines'
      },
      {
        id: 'MOD-004',
        numeroModulo: 2,
        nombre: 'Mantenimiento y Reparación de Motos de Combustión y Conversión del Sistema GNV-GLP',
        nombreOriginalFuente: 'Mantenimiento y Reparación de Motos de Combustión y Conversión del Sistema GNV-GLP'
      }
    ]
  },
  {
    id: 'PROG-003',
    codigo: 'PROG-003',
    nombre: 'CARPINTERÍA METÁLICA',
    nombreOriginalFuente: 'CARPINTERÍA METÁLICA',
    fuente: 'sources/raw/CARRERAS.jpeg',
    estado: 'ACTIVO',
    modulos: [
      {
        id: 'MOD-005',
        numeroModulo: 1,
        nombre: 'Construcciones Metálicas de Consumo con Soldadura por Arco Eléctrico en Acero',
        nombreOriginalFuente: 'Construcciones Metálicas de Consumo con Soldadura por Arco Eléctrico en Acero'
      },
      {
        id: 'MOD-006',
        numeroModulo: 2,
        nombre: 'Construcciones Metálicas de Consumo en Aluminio con Soldadura Especial TIG-MIG-MAG-LASER',
        nombreOriginalFuente: 'Construcciones Metálicas de Consumo en Aluminio con Soldadura Especial TIG-MIG-MAG-LASER'
      }
    ]
  },
  {
    id: 'PROG-004',
    codigo: 'PROG-004',
    nombre: 'PELUQUERÍA Y BARBERÍA',
    nombreOriginalFuente: 'PELUQUERÍA Y BARBERÍA',
    fuente: 'sources/raw/CARRERAS.jpeg',
    estado: 'ACTIVO',
    modulos: [
      {
        id: 'MOD-007',
        numeroModulo: 1,
        nombre: 'Corte de Cabellos, Peinados y Diseño de Barbas',
        nombreOriginalFuente: 'Corte de Cabellos, Peinados y Diseño de Barbas'
      },
      {
        id: 'MOD-008',
        numeroModulo: 2,
        nombre: 'Ondulación, Decoloración, y Tinturación',
        nombreOriginalFuente: 'Ondulación, Decoloración, y Tinturación'
      }
    ]
  },
  {
    id: 'PROG-005',
    codigo: 'PROG-005',
    nombre: 'COMPUTACIÓN E INFORMÁTICA',
    nombreOriginalFuente: 'COMPUTACIÓN E INFORMÁTICA',
    fuente: 'sources/raw/CARRERAS.jpeg',
    estado: 'ACTIVO',
    modulos: [
      {
        id: 'MOD-009',
        numeroModulo: 1,
        nombre: 'Ofimática',
        nombreOriginalFuente: 'Ofimática'
      },
      {
        id: 'MOD-010',
        numeroModulo: 2,
        nombre: 'Diseño Gráfico y Plataformas Digitales',
        nombreOriginalFuente: 'Diseño Gráfico y Plataformas Digitales'
      }
    ]
  },
  {
    id: 'PROG-006',
    codigo: 'PROG-006',
    nombre: 'CORTE Y ENSAMBLAJE',
    nombreOriginalFuente: 'CORTE Y ENSAMBLAJE',
    fuente: 'sources/raw/CARRERAS.jpeg',
    estado: 'ACTIVO',
    modulos: [
      {
        id: 'MOD-011',
        numeroModulo: 1,
        nombre: 'Técnicas de Trazado, Tendido y Corte de Prendas de Vestir',
        nombreOriginalFuente: 'Técnicas de Trazado, Tendido y Corte de Prendas de Vestir'
      },
      {
        id: 'MOD-012',
        numeroModulo: 2,
        nombre: 'Técnicas de Confección de Prendas de Vestir',
        nombreOriginalFuente: 'Técnicas de Confección de Prendas de Vestir'
      }
    ]
  },
  {
    id: 'PROG-007',
    codigo: 'PROG-007',
    nombre: 'MANTENIMIENTO DE SISTEMAS ELÉCTRICOS',
    nombreOriginalFuente: 'MANTENIMIENTO DE SISTEMAS ELÉCTRICOS',
    fuente: 'sources/raw/CARRERAS.jpeg',
    estado: 'ACTIVO',
    modulos: [
      {
        id: 'MOD-013',
        numeroModulo: 1,
        nombre: 'Instalación de Sistemas Eléctricos en Edificaciones',
        nombreOriginalFuente: 'Instalación de Sistemas Eléctricos en Edificaciones'
      },
      {
        id: 'MOD-014',
        numeroModulo: 2,
        nombre: 'Mantenimiento de Equipos Electrónicos y Sistemas de Seguridad en Domótica',
        nombreOriginalFuente: 'Mantenimiento de Equipos Electrónicos y Sistemas de Seguridad en Domótica'
      }
    ]
  }
];

export const CatalogService = {
  programRepo: new ProgramRepository(),
  moduleRepo: new ModuleRepository(),
  instRepo: new InstitutionRepository(),
  auditService: AuditService,

  /**
   * Inicialización IDEMPOTENTE de catálogos oficiales (7 programas / 14 módulos / 1 institución)
   * @returns {Promise<{ programsCount: number, modulesCount: number, seeded: boolean }>}
   */
  async initializeCatalogs() {
    const existingPrograms = await this.programRepo.list();
    const existingInst = await this.instRepo.getInstitution();
    const now = new Date().toISOString();
    let institutionReconciled = false;

    if (!existingInst) {
      await this.instRepo.create(buildInstitutionalSourceRecord(null, now));
      institutionReconciled = true;
    } else if (existingInst.sourceMigrationVersion !== INSTITUTION_SOURCE_MIGRATION_VERSION) {
      const migratedInst = buildInstitutionalSourceRecord(existingInst, now);
      await this.instRepo.update(migratedInst);
      await this.auditService.record({
        entidad: 'INSTITUCION',
        idEntidad: migratedInst.id,
        accion: 'MODIFICACION',
        estadoAnterior: existingInst,
        estadoNuevo: migratedInst,
        origen: {
          usuarioOperador: 'SISTEMA_M12_1C',
          motivo: `Migración institucional única ${INSTITUTION_SOURCE_MIGRATION_VERSION}`
        }
      });
      institutionReconciled = true;
    }

    if (existingPrograms.length > 0) {
      const existingModules = await this.moduleRepo.list();
      return {
        programsCount: existingPrograms.length,
        modulesCount: existingModules.length,
        seeded: false,
        institutionReconciled
      };
    }

    for (const progSeed of OFFICIAL_CATALOG_SEED) {
      const progRecord = {
        id: progSeed.id,
        codigo: progSeed.codigo,
        nombre: progSeed.nombre,
        nombreOriginalFuente: progSeed.nombreOriginalFuente,
        fuente: progSeed.fuente,
        estado: progSeed.estado,
        fechaCreacion: now,
        fechaActualizacion: now
      };

      await this.programRepo.create(progRecord);

      for (const modSeed of progSeed.modulos) {
        const modRecord = {
          id: modSeed.id,
          idModulo: modSeed.id,
          programaId: progSeed.id,
          numeroModulo: modSeed.numeroModulo,
          nombreOficial: modSeed.nombre,
          nombre: modSeed.nombre,
          nombreOriginalFuente: modSeed.nombreOriginalFuente,
          fuente: progSeed.fuente,
          estado: 'ACTIVO',
          fechaCreacion: now,
          fechaActualizacion: now
        };

        await this.moduleRepo.create(modRecord);
      }
    }

    await this.auditService.record({
      entidad: 'PROGRAMAS',
      idEntidad: 'SEED-M02',
      accion: 'CREACION',
      estadoNuevo: { programas: 7, modulos: 14 },
      origen: { usuarioOperador: 'SISTEMA_SEED', motivo: 'Inicialización idempotente de catálogos M02' }
    });

    return {
      programsCount: 7,
      modulesCount: 14,
      seeded: true,
      institutionReconciled
    };
  },

  async listPrograms() {
    return this.programRepo.list();
  },

  async listModules(programaId = null) {
    if (programaId) {
      return this.moduleRepo.getByProgramId(programaId);
    }
    return this.moduleRepo.list();
  },

  async updateProgram(programData, operator = 'SECRETARIA_LOCAL') {
    if (!programData || !programData.id || !programData.nombre) {
      throw new ValidationError('El ID y nombre del programa son obligatorios.');
    }

    const current = await this.programRepo.getById(programData.id);
    if (!current) {
      throw new ValidationError(`Programa ${programData.id} no encontrado.`);
    }

    const updated = {
      ...current,
      ...programData,
      nombreOriginalFuente: current.nombreOriginalFuente, // Preservar procedencia inalterada
      fechaActualizacion: new Date().toISOString()
    };

    await this.programRepo.update(updated);

    await AuditService.record({
      entidad: 'PROGRAMAS',
      idEntidad: updated.id,
      accion: 'MODIFICACION',
      estadoAnterior: current,
      estadoNuevo: updated,
      origen: { usuarioOperador: operator, pantalla: 'Programas/Edición' }
    });

    return updated;
  },

  async updateModule(moduleData, operator = 'SECRETARIA_LOCAL') {
    if (!moduleData || !moduleData.id || !moduleData.nombre) {
      throw new ValidationError('El ID y nombre del módulo son obligatorios.');
    }

    const current = await this.moduleRepo.getById(moduleData.id);
    if (!current) {
      throw new ValidationError(`Módulo ${moduleData.id} no encontrado.`);
    }

    const updated = {
      ...current,
      ...moduleData,
      nombreOriginalFuente: current.nombreOriginalFuente, // Preservar procedencia
      fechaActualizacion: new Date().toISOString()
    };

    await this.moduleRepo.update(updated);

    await AuditService.record({
      entidad: 'MODULOS',
      idEntidad: updated.id,
      accion: 'MODIFICACION',
      estadoAnterior: current,
      estadoNuevo: updated,
      origen: { usuarioOperador: operator, pantalla: 'Módulos/Edición' }
    });

    return updated;
  }
};
