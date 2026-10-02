/**
 * Servicio de Configuración de Carpeta Pedagógica y Parámetros del Docente
 * Permite al profesor registrar y personalizar datos de identidad, institucionalidad,
 * carátula (TMPL-04), programación curricular y capacidades/indicadores de evaluación (TMPL-05..17).
 */

const STORAGE_PREFIX_PROFILE = 'CETPRO_TEACHER_CONFIG_PROFILE';
const STORAGE_PREFIX_GROUP = 'CETPRO_TEACHER_CONFIG_GROUP_';
const STORAGE_PREFIX_UNIT = 'CETPRO_TEACHER_CONFIG_UNIT_';

// Catálogo de Sugerencias Oficiales del MINEDU por Especialidad
const OFFICIAL_SUGGESTIONS = {
  'PROG-005': { // COMPUTACIÓN E INFORMÁTICA
    moduloNombre: 'Módulo I: Ofimática Profesional y Tecnologías de la Información',
    ciclo: 'TÉCNICO',
    horas: '360 HORAS',
    creditos: '18 CRÉDITOS',
    unidades: {
      1: {
        nombreUD: 'UD 1: Sistemas Operativos y Procesadores de Textos Avanzados',
        fechaInicioUD: '2026-03-16',
        capacidadUD: 'Administrar el entorno operativo y elaborar documentación técnica y administrativa compleja aplicando estándares de calidad y normas vigentes de redacción formal.',
        indicadores: [
          'IL 1: Configura y optimiza el entorno del sistema operativo según requerimientos técnicos.',
          'IL 2: Aplica formatos avanzados, estilos y plantillas en procesadores de textos según normas APA.',
          'IL 3: Diseña tablas de contenido, referencias cruzadas e índices automáticos estructurados.',
          'IL 4: Automatiza correspondencia institucional y correspondencia combinada con bases de datos.',
          'IL 5: Sustenta el portafolio digital de evidencias y documentos técnicos elaborados.'
        ]
      },
      2: {
        nombreUD: 'UD 2: Hojas de Cálculo Avanzadas y Procesamiento de Datos',
        fechaInicioUD: '2026-04-20',
        capacidadUD: 'Diseñar y automatizar libros contables y estadísticos aplicando funciones avanzadas, tablas dinámicas y macros para la toma de decisiones.',
        indicadores: [
          'IL 1: Aplica funciones matemáticas, lógicas y estadísticas avanzadas en matrices de datos.',
          'IL 2: Implementa validación de datos, formato condicional y seguridad en hojas de cálculo.',
          'IL 3: Construye tablas dinámicas y gráficos interactivos para el análisis gerencial.',
          'IL 4: Diseña cuadros de control operativo y paneles visuales (dashboards) funcionales.',
          'IL 5: Elabora reportes analíticos integrados y sustenta los resultados obtenidos.'
        ]
      },
      3: {
        nombreUD: 'UD 3: Presentaciones Multimedia de Alto Impacto',
        fechaInicioUD: '2026-05-25',
        capacidadUD: 'Diseñar y estructurar presentaciones visuales interactivas incorporando recursos multimedia para la comunicación efectiva de proyectos técnicos.',
        indicadores: [
          'IL 1: Estructura guiones visuales y esquemas conceptuales según la audiencia objetivo.',
          'IL 2: Aplica principios de diseño visual, tipografía y paletas cromáticas armónicas.',
          'IL 3: Integra audio, video e hipervínculos interactivos en presentaciones técnicas.',
          'IL 4: Configura transiciones fluidas y animaciones con criterios pedagógicos y formales.',
          'IL 5: Expone y sustenta proyectos técnicos apoyado en recursos multimedia interactivos.'
        ]
      },
      4: {
        nombreUD: 'UD 4: Redes de Comunicación e Internet Institucional',
        fechaInicioUD: '2026-06-22',
        capacidadUD: 'Configurar conexiones de redes locales y utilizar servicios colaborativos en la nube para la gestión y seguridad de la información institucional.',
        indicadores: [
          'IL 1: Identifica y conecta componentes físicos de red local según normas de cableado.',
          'IL 2: Configura protocolos de red, direcciones IP y recursos compartidos de forma segura.',
          'IL 3: Administra servicios de correo institucional, almacenamiento en nube y trabajo colaborativo.',
          'IL 4: Implementa políticas de respaldo y seguridad digital contra ciberamenazas.',
          'IL 5: Documenta la topología de red y sustenta el plan de mantenimiento preventivo.'
        ]
      }
    }
  },
  'PROG-006': { // PELUQUERÍA
    moduloNombre: 'Módulo I: Tratamiento Capilar, Corte de Cabello y Peinados',
    ciclo: 'AUXILIAR TÉCNICO',
    horas: '300 HORAS',
    creditos: '15 CRÉDITOS',
    unidades: {
      1: {
        nombreUD: 'UD 1: Bioseguridad y Tratamiento Capilar Integral',
        fechaInicioUD: '2026-03-16',
        capacidadUD: 'Aplicar normas de bioseguridad, diagnóstico capilar y procedimientos cosméticos para el cuidado y restauración de la fibra capilar.',
        indicadores: [
          'IL 1: Aplica protocolos de desinfección y esterilización de instrumental según normativa sanitaria.',
          'IL 2: Realiza el diagnóstico clínico del cuero cabelludo y la hebra capilar.',
          'IL 3: Selecciona y dosifica productos cosmocéuticos según el tipo de hebra capilar.',
          'IL 4: Ejecuta técnicas de masajes capilares y aplicación térmica con criterios técnicos.',
          'IL 5: Evalúa los resultados del tratamiento y orienta al cliente en el cuidado preventivo.'
        ]
      },
      2: {
        nombreUD: 'UD 2: Técnicas de Corte de Cabello para Damas y Varones',
        fechaInicioUD: '2026-04-20',
        capacidadUD: 'Diseñar y ejecutar cortes de cabello personalizados considerando morfología craneal, tendencias y técnicas geométricas con tijera y navaja.',
        indicadores: [
          'IL 1: Prepara el área de trabajo y selecciona la herramienta de corte adecuada.',
          'IL 2: Realiza particiones y proyecciones angulares precisas para cortes básicos y graduados.',
          'IL 3: Aplica técnicas de esculpido y desfilado con navaja y tijera de pulir.',
          'IL 4: Realiza cortes clásicos y contemporáneos masculinos y femeninos.',
          'IL 5: Realiza el peinado final y verifica la simetría y satisfacción del cliente.'
        ]
      }
    }
  }
};

export class TeacherConfigService {
  constructor() {
    this.memoryCache = new Map();
  }

  _safeGet(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        if (item) return JSON.parse(item);
      }
    } catch (e) {
      console.warn('[TeacherConfigService] Error leyendo localStorage:', e);
    }
    return this.memoryCache.get(key) || null;
  }

  _safeSet(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn('[TeacherConfigService] Error guardando localStorage:', e);
    }
    this.memoryCache.set(key, value);
  }

  // ==========================================
  // 1. PERFIL PERSONAL Y PROFESIONAL DEL DOCENTE
  // ==========================================
  getProfile() {
    const saved = this._safeGet(STORAGE_PREFIX_PROFILE);
    return {
      nombreDocente: saved?.nombreDocente || 'Lic. Roberto Mendoza Huamán',
      tituloDocente: saved?.tituloDocente || 'Licenciado en Educación Técnica e Informática',
      dniDocente: saved?.dniDocente || '41258963',
      telefonoDocente: saved?.telefonoDocente || '951884211',
      correoDocente: saved?.correoDocente || 'rmendoza@cetpro.edu.pe',
      lugarEmision: saved?.lugarEmision || 'Juliaca, Puno',
      updatedAt: saved?.updatedAt || null
    };
  }

  saveProfile(data) {
    const payload = {
      ...this.getProfile(),
      ...data,
      updatedAt: new Date().toISOString()
    };
    this._safeSet(STORAGE_PREFIX_PROFILE, payload);
    return payload;
  }

  // ==========================================
  // 2. PARÁMETROS DEL GRUPO Y CARÁTULA (TMPL-04)
  // ==========================================
  getGroupConfig(groupId, programId = 'PROG-005') {
    if (!groupId) return this.getDefaultGroupConfig(programId);
    const key = `${STORAGE_PREFIX_GROUP}${groupId}`;
    const saved = this._safeGet(key);
    const defaults = this.getDefaultGroupConfig(programId);
    return {
      ...defaults,
      ...(saved || {})
    };
  }

  getDefaultGroupConfig(programId = 'PROG-005') {
    const progSugg = OFFICIAL_SUGGESTIONS[programId] || OFFICIAL_SUGGESTIONS['PROG-005'];
    return {
      dre: 'DRE PUNO',
      ugel: 'UGEL SAN ROMÁN',
      tipoGestion: 'PÚBLICA DIRECTA',
      nombreModulo: progSugg.moduloNombre,
      ciclo: progSugg.ciclo,
      horasModulo: progSugg.horas,
      creditosModulo: progSugg.creditos,
      fechaInicio: '15/03/2026',
      fechaTermino: '24/07/2026',
      anioLectivo: '2026',
      turno: 'TARDE',
      seccion: 'ÚNICA'
    };
  }

  saveGroupConfig(groupId, data) {
    if (!groupId) return;
    const key = `${STORAGE_PREFIX_GROUP}${groupId}`;
    const current = this.getGroupConfig(groupId);
    const payload = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString()
    };
    this._safeSet(key, payload);
    return payload;
  }

  // ==========================================
  // 3. PROGRAMACIÓN POR UNIDAD DIDÁCTICA (TMPL-05..17)
  // ==========================================
  getUnitConfig(groupId, udNum, programId = 'PROG-005') {
    const key = `${STORAGE_PREFIX_UNIT}${groupId}_UD${udNum}`;
    const saved = this._safeGet(key);
    if (saved) return saved;

    // Obtener sugerencias oficiales
    return this.getSuggestedUnitConfig(programId, udNum);
  }

  getSuggestedUnitConfig(programId = 'PROG-005', udNum = 1) {
    const progSugg = OFFICIAL_SUGGESTIONS[programId] || OFFICIAL_SUGGESTIONS['PROG-005'];
    const unitSugg = progSugg.unidades?.[udNum];
    if (unitSugg) {
      return {
        udNum,
        nombreUD: unitSugg.nombreUD,
        fechaInicioUD: unitSugg.fechaInicioUD,
        capacidadUD: unitSugg.capacidadUD,
        indicadores: [...unitSugg.indicadores]
      };
    }
    // Fallback estándar oficial
    return {
      udNum,
      nombreUD: `Unidad Didáctica ${udNum}: Formación Técnica Modular Especializada`,
      fechaInicioUD: '2026-03-16',
      capacidadUD: `Planificar, ejecutar y evaluar procedimientos y operaciones técnicas de la Unidad Didáctica ${udNum} garantizando estándares de calidad, seguridad y pertinencia formativa.`,
      indicadores: [
        `IL 1: Reconoce, interpreta y fundamenta los conceptos y normas técnicas de la Unidad Didáctica ${udNum}.`,
        `IL 2: Organiza y prepara el puesto de trabajo, equipos e insumos con criterios de seguridad laboral.`,
        `IL 3: Ejecuta procedimientos técnicos y destrezas operativas con precisión y calidad profesional.`,
        `IL 4: Resuelve contingencias técnicas y evalúa la conformidad del producto o servicio desarrollado.`,
        `IL 5: Elabora la documentación técnica y sustenta el portafolio de evidencias de la unidad didáctica.`
      ]
    };
  }

  saveUnitConfig(groupId, udNum, data) {
    if (!groupId || !udNum) return;
    const key = `${STORAGE_PREFIX_UNIT}${groupId}_UD${udNum}`;
    const payload = {
      groupId,
      udNum,
      nombreUD: data.nombreUD || `Unidad Didáctica ${udNum}`,
      fechaInicioUD: data.fechaInicioUD || '2026-03-16',
      capacidadUD: data.capacidadUD || '',
      indicadores: Array.isArray(data.indicadores) ? data.indicadores : [],
      updatedAt: new Date().toISOString()
    };
    this._safeSet(key, payload);
    return payload;
  }
}
