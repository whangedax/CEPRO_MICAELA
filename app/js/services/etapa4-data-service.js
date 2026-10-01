/**
 * Servicio de Datos de Etapa 4 (Etapa4DataService)
 * Gestiona la persistencia local, consulta, configuración registral y datos demo
 * para los documentos oficiales de la Etapa 4:
 * - TMPL-20: Certificado Modular Oficial (2 páginas A4 landscape)
 * - TMPL-21: Título Técnico Oficial (2 páginas A4 landscape)
 */

const STORAGE_PREFIX_CERT = 'CETPRO_ETAPA4_CERT_';
const STORAGE_PREFIX_TIT = 'CETPRO_ETAPA4_TIT_';

export class Etapa4DataService {
  constructor() {
    this.memoryCache = new Map();
  }

  _getKey(prefix, groupId, studentId) {
    return `${prefix}${groupId || 'GRP'}_${studentId || 'STD'}`;
  }

  _safeGet(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        if (item) return JSON.parse(item);
      }
    } catch (e) {
      console.warn('[Etapa4DataService] Error leyendo localStorage:', e);
    }
    return this.memoryCache.get(key) || null;
  }

  _safeSet(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn('[Etapa4DataService] Error escribiendo localStorage:', e);
    }
    this.memoryCache.set(key, value);
  }

  _safeRemove(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('[Etapa4DataService] Error borrando localStorage:', e);
    }
    this.memoryCache.delete(key);
  }

  // ==========================================
  // CERTIFICADO MODULAR (TMPL-20)
  // ==========================================

  getCertificado(groupId, studentId) {
    if (!groupId || !studentId) return null;
    const key = this._getKey(STORAGE_PREFIX_CERT, groupId, studentId);
    return this._safeGet(key);
  }

  saveCertificado(groupId, studentId, payload) {
    if (!groupId || !studentId) return;
    const key = this._getKey(STORAGE_PREFIX_CERT, groupId, studentId);
    const data = {
      groupId,
      studentId,
      ...payload,
      updatedAt: new Date().toISOString()
    };
    this._safeSet(key, data);
    return data;
  }

  clearCertificado(groupId, studentId) {
    if (!groupId || !studentId) return;
    const key = this._getKey(STORAGE_PREFIX_CERT, groupId, studentId);
    this._safeRemove(key);
  }

  generateDemoCertificado(groupId, studentId, studentInfo = {}, programInfo = {}, moduleInfo = {}) {
    const defaultUnits = [
      {
        'curriculum.unit.name': 'Bioseguridad y Diagnóstico Capilar',
        'curriculum.unit.credits': '3',
        'curriculum.unit.hours': '60',
        'curriculum.unit.capacity': 'Aplica protocolos de bioseguridad y desinfección de herramientas.',
        'evaluation.unitResult': '17'
      },
      {
        'curriculum.unit.name': 'Tratamientos Capilares Específicos',
        'curriculum.unit.credits': '4',
        'curriculum.unit.hours': '80',
        'curriculum.unit.capacity': 'Realiza diagnóstico y aplica tratamientos de reestructuración.',
        'evaluation.unitResult': '18'
      },
      {
        'curriculum.unit.name': 'Técnicas de Corte y Acabado Básico',
        'curriculum.unit.credits': '4',
        'curriculum.unit.hours': '80',
        'curriculum.unit.capacity': 'Ejecuta cortes según morfología facial y requerimientos.',
        'evaluation.unitResult': '16'
      },
      {
        'curriculum.unit.name': 'Peinados y Moldeados Profesionales',
        'curriculum.unit.credits': '3',
        'curriculum.unit.hours': '60',
        'curriculum.unit.capacity': 'Diseña peinados para diversas ocasiones conforme a tendencias.',
        'evaluation.unitResult': '19'
      },
      {
        'curriculum.unit.name': 'Coloración y Decoloración Capilar',
        'curriculum.unit.credits': '3',
        'curriculum.unit.hours': '60',
        'curriculum.unit.capacity': 'Formula y aplica tintes respetando tiempos y bioseguridad.',
        'evaluation.unitResult': '17'
      },
      {
        'curriculum.unit.name': 'Atención al Cliente y Emprendimiento',
        'curriculum.unit.credits': '2',
        'curriculum.unit.hours': '40',
        'curriculum.unit.capacity': 'Aplica técnicas de fidelización y gestión de gabinete técnico.',
        'evaluation.unitResult': '18'
      }
    ];

    const randomNum = Math.floor(100 + Math.random() * 900);
    const folioNum = String(Math.floor(10 + Math.random() * 80)).padStart(2, '0');

    const demoData = {
      registerCode: `CM-2026-${String(randomNum).padStart(4, '0')}`,
      emissionDate: 'Lima, 20 de Diciembre de 2026',
      registryBook: '01',
      registryFolio: folioNum,
      registryNumber: String(randomNum).padStart(4, '0'),
      registryDate: '20/12/2026',
      ciclo: programInfo.ciclo || 'AUXILIAR TÉCNICO',
      modalidad: 'PRESENCIAL',
      competence: 'Competencia técnica específica',
      units: defaultUnits
    };

    return this.saveCertificado(groupId, studentId, demoData);
  }

  getOrGenerateCertificado(groupId, studentId, studentInfo, programInfo, moduleInfo) {
    const existing = this.getCertificado(groupId, studentId);
    if (existing) return existing;
    return this.generateDemoCertificado(groupId, studentId, studentInfo, programInfo, moduleInfo);
  }

  // ==========================================
  // TÍTULO TÉCNICO OFICIAL (TMPL-21)
  // ==========================================

  getTitulo(groupId, studentId) {
    if (!groupId || !studentId) return null;
    const key = this._getKey(STORAGE_PREFIX_TIT, groupId, studentId);
    return this._safeGet(key);
  }

  saveTitulo(groupId, studentId, payload) {
    if (!groupId || !studentId) return;
    const key = this._getKey(STORAGE_PREFIX_TIT, groupId, studentId);
    const data = {
      groupId,
      studentId,
      ...payload,
      updatedAt: new Date().toISOString()
    };
    this._safeSet(key, data);
    return data;
  }

  clearTitulo(groupId, studentId) {
    if (!groupId || !studentId) return;
    const key = this._getKey(STORAGE_PREFIX_TIT, groupId, studentId);
    this._safeRemove(key);
  }

  generateDemoTitulo(groupId, studentId, studentInfo = {}, programInfo = {}) {
    const programName = programInfo.nombre || programInfo.name || 'PELUQUERÍA Y BARBERÍA';
    const ciclo = programInfo.ciclo || 'AUXILIAR TÉCNICO';
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const folioNum = String(Math.floor(10 + Math.random() * 80)).padStart(2, '0');
    const regNum = String(Math.floor(100 + Math.random() * 900)).padStart(4, '0');

    const demoData = {
      officialTitleText: `${ciclo.toUpperCase()} EN ${programName.toUpperCase()}`,
      emissionDate: 'Dado en Lima, a los 20 días del mes de Diciembre del 2026',
      registerCode: `MINEDU-REG-2026-${randomCode}`,
      registryAsiento: `Inscrito en el Libro de Títulos N° 01, Folio ${folioNum}, Registro N° 2026-${regNum} con fecha 20/12/2026.`
    };

    return this.saveTitulo(groupId, studentId, demoData);
  }

  getOrGenerateTitulo(groupId, studentId, studentInfo, programInfo) {
    const existing = this.getTitulo(groupId, studentId);
    if (existing) return existing;
    return this.generateDemoTitulo(groupId, studentId, studentInfo, programInfo);
  }
}
