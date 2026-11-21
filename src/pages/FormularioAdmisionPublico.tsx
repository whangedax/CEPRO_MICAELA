/**
 * src/pages/FormularioAdmisionPublico.tsx
 *
 * Formulario Móvil Ultra-Amigable de Ficha de Registro y Admisión 2026
 * Diseñado especialmente para postulantes, jóvenes y señoras del CETPRO Micaela Bastidas (Juliaca / San Román).
 *
 * Accesible, táctil, con letras grandes y 4 pasos guiados.
 * Genera el bloque con CRC32 estándar y enlace universal para WhatsApp Web.
 */

import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
import React, { useState, useMemo, useEffect } from 'react';
import { CareerPhoto } from '../components/academic/CareerVisualBanner';
import { calculateCrc32 } from '../utils/crc32';

interface CareerOption {
  id: string;
  code: string;
  title: string;
  specialty: string;
  icon: string;
  bgGrad: string;
}

const CAREERS: CareerOption[] = [
  {
    id: 'PROG-004',
    code: 'PELUQ',
    title: 'PELUQUERÍA Y BARBERÍA',
    specialty: 'Corte de Cabellos, Peinados y Diseño de Barbas',
    icon: '✂️',
    bgGrad: 'from-pink-500/10 to-rose-500/10 border-rose-300 dark:border-rose-800',
  },
  {
    id: 'PROG-006',
    code: 'CORTE',
    title: 'CONFECCIÓN TEXTIL / CORTE Y ENSAMBLAJE',
    specialty: 'Técnicas de Trazado, Tendido y Confección de Prendas',
    icon: '🧵',
    bgGrad: 'from-amber-500/10 to-orange-500/10 border-amber-300 dark:border-amber-800',
  },
  {
    id: 'PROG-005',
    code: 'COMP',
    title: 'COMPUTACIÓN E INFORMÁTICA / OFIMÁTICA',
    specialty: 'Ofimática, Diseño Gráfico y Plataformas Digitales',
    icon: '💻',
    bgGrad: 'from-blue-500/10 to-indigo-500/10 border-blue-300 dark:border-blue-800',
  },
  {
    id: 'PROG-001',
    code: 'AUTO',
    title: 'MECÁNICA AUTOMOTRIZ',
    specialty: 'Mantenimiento de Sistemas de Suspensión, Frenos y Motor',
    icon: '🚗',
    bgGrad: 'from-emerald-500/10 to-teal-500/10 border-emerald-300 dark:border-emerald-800',
  },
  {
    id: 'PROG-002',
    code: 'MOTOS',
    title: 'MECÁNICA DE MOTOS Y VEHÍCULOS AFINES',
    specialty: 'Mantenimiento y Reparación de Motos y Conversión GNV',
    icon: '🏍️',
    bgGrad: 'from-purple-500/10 to-violet-500/10 border-purple-300 dark:border-purple-800',
  },
  {
    id: 'PROG-003',
    code: 'METAL',
    title: 'CARPINTERÍA METÁLICA',
    specialty: 'Construcciones Metálicas con Soldadura por Arco y TIG-MIG',
    icon: '⚙️',
    bgGrad: 'from-slate-500/10 to-gray-500/10 border-slate-300 dark:border-slate-700',
  },
  {
    id: 'PROG-007',
    code: 'ELEC',
    title: 'MANTENIMIENTO DE SISTEMAS ELÉCTRICOS',
    specialty: 'Instalaciones Eléctricas en Edificaciones y Domótica',
    icon: '⚡',
    bgGrad: 'from-yellow-500/10 to-amber-500/10 border-yellow-300 dark:border-yellow-800',
  },
];

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const FormularioAdmisionPublico: React.FC = () => {
  // Configuración institucional
  const [whatsappSecretaria, setWhatsappSecretaria] = useState<string>('');
  const [receptorNombre, setReceptorNombre] = useState<string>('Secretaría Académica');
  const [institutionName, setInstitutionName] = useState<string>('CETPRO "Micaela Bastidas Puyucawa"');
  const [receiptCode, setReceiptCode] = useState<string>('');

  // Paso actual (1..4, y 5 es confirmación)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Paso 1: Carrera y Turno
  const [carrera, setCarrera] = useState<string>('PELUQUERÍA Y BARBERÍA');
  const [especialidad, setEspecialidad] = useState<string>('Corte de Cabellos, Peinados y Diseño de Barbas');
  const [turno, setTurno] = useState<'MAÑANA' | 'TARDE' | 'NOCHE'>('MAÑANA');

  // Paso 2: Datos Personales
  const [dni, setDni] = useState<string>('');
  const [paterno, setPaterno] = useState<string>('');
  const [materno, setMaterno] = useState<string>('');
  const [nombres, setNombres] = useState<string>('');
  const [sexo, setSexo] = useState<'F' | 'M'>('F');

  // Fecha de nacimiento separada
  const [birthDay, setBirthDay] = useState<number>(15);
  const [birthMonth, setBirthMonth] = useState<number>(5);
  const [birthYear, setBirthYear] = useState<number>(1996);

  // Origen
  const [lugarNacimiento, setLugarNacimiento] = useState<string>('PUNO / SAN ROMÁN / JULIACA');
  const [distrito, setDistrito] = useState<string>('SAN MIGUEL');
  const [provincia, setProvincia] = useState<string>('SAN ROMÁN');
  const [region, setRegion] = useState<string>('PUNO');
  const [pais, setPais] = useState<string>('PERU');

  // Paso 3: Domicilio, Contacto y Familia
  const [domicilio, setDomicilio] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [correo, setCorreo] = useState<string>('');
  const [estadoCivil, setEstadoCivil] = useState<'SOLTERO' | 'CASADO' | 'CONVIVIENTE' | 'DIVORCIADO' | 'VIUDO'>('SOLTERO');
  const [contactoEmergencia, setContactoEmergencia] = useState<string>('');
  const [gradoEstudios, setGradoEstudios] = useState<string>('SECUNDARIA COMPLETA');
  const [trabaja, setTrabaja] = useState<boolean>(false);
  const [puestoTrabajo, setPuestoTrabajo] = useState<string>('');
  const [cargaFamiliar, setCargaFamiliar] = useState<boolean>(false);
  const [cargaFamiliarPersonas, setCargaFamiliarPersonas] = useState<number>(1);

  // Paso 4: Conectividad e Inclusión
  const [internetCasa, setInternetCasa] = useState<boolean>(true);
  const [operadorCelular, setOperadorCelular] = useState<string>('CLARO');
  const [tienePC, setTienePC] = useState<boolean>(false);
  const [tieneLaptop, setTieneLaptop] = useState<boolean>(false);
  const [tieneCelular, setTieneCelular] = useState<boolean>(true);
  const [discapacidad, setDiscapacidad] = useState<boolean>(false);
  const [tipoDiscapacidad, setTipoDiscapacidad] = useState<string>('');
  const [lenguaOriginaria, setLenguaOriginaria] = useState<string>('QUECHUA');

  // Cargar configuración pública de secretaría si el backend está activo o desde ?wa=
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
      const waFromUrl = (searchParams.get('wa') || '').replace(/\D/g, '');
      if (waFromUrl && waFromUrl !== '51951234567' && waFromUrl !== '951234567') {
        setWhatsappSecretaria(waFromUrl.startsWith('51') && waFromUrl.length === 11 ? waFromUrl.slice(2) : waFromUrl);
      }
    } catch {}

    const baseUrl = window.location.port === '5173' ? 'http://127.0.0.1:8085' : '';
    fetch(`${baseUrl}/api/public/admission-ficha/info`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const rawPhone = String(data.secretariaWhatsapp || data.whatsappPhone || '').replace(/\D/g, '');
        if (rawPhone && rawPhone !== '51951234567' && rawPhone !== '951234567') {
          setWhatsappSecretaria(rawPhone.startsWith('51') && rawPhone.length === 11 ? rawPhone.slice(2) : rawPhone);
        }
        if (data.receptorNombre) setReceptorNombre(data.receptorNombre);
        if (data.institutionName) setInstitutionName(data.institutionName);
      })
      .catch(() => {});
  }, []);

  // Calcular edad dinámica
  const calculatedAge = useMemo(() => {
    const today = new Date();
    let age = today.getFullYear() - birthYear;
    const m = today.getMonth() + 1 - birthMonth;
    if (m < 0 || (m === 0 && today.getDate() < birthDay)) {
      age--;
    }
    return Math.max(14, Math.min(99, age));
  }, [birthYear, birthMonth, birthDay]);

  const fechaNacimientoIso = useMemo(() => {
    const mm = String(birthMonth).padStart(2, '0');
    const dd = String(birthDay).padStart(2, '0');
    return `${birthYear}-${mm}-${dd}`;
  }, [birthYear, birthMonth, birthDay]);

  // Generar bloque técnico con CRC32
  const technicalBlock = useMemo(() => {
    const dniClean = dni.trim();
    const patClean = (paterno.trim() || 'NO DECLARADO').toUpperCase();
    const matClean = (materno.trim() || 'NO DECLARADO').toUpperCase();
    const nomClean = (nombres.trim() || 'NO DECLARADO').toUpperCase();
    const domClean = (domicilio.trim() || 'NO ESPECIFICADO').toUpperCase();
    const disClean = (distrito.trim() || 'SAN MIGUEL').toUpperCase();
    const proClean = (provincia.trim() || 'SAN ROMÁN').toUpperCase();
    const regClean = (region.trim() || 'PUNO').toUpperCase();
    const paisClean = (pais.trim() || 'PERU').toUpperCase();
    const lugClean = (lugarNacimiento.trim() || 'PUNO / SAN ROMÁN').toUpperCase();
    const telClean = telefono.trim() || '999999999';
    const corClean = correo.trim().toLowerCase();
    const emeClean = (contactoEmergencia.trim() || 'FAMILIAR DIRECTO').toUpperCase();
    const ptoClean = trabaja ? (puestoTrabajo.trim() || 'TRABAJADOR INDEPENDIENTE').toUpperCase() : '';
    const disTClean = discapacidad ? (tipoDiscapacidad.trim() || 'FISICA O MOTORA').toUpperCase() : '';
    const insClean = receiptCode || `INS-2026-${dniClean.slice(-4) || '0001'}`;

    const eqp = `${tienePC ? '1' : '0'},${tieneLaptop ? '1' : '0'},${tieneCelular ? '1' : '0'}`;

    const rawData = [
      `v=1`,
      `dni=${dniClean}`,
      `pat=${patClean}`,
      `mat=${matClean}`,
      `nom=${nomClean}`,
      `sex=${sexo}`,
      `fn=${fechaNacimientoIso}`,
      `edad=${calculatedAge}`,
      `pais=${paisClean}`,
      `lug=${lugClean}`,
      `dis=${disClean}`,
      `pro=${proClean}`,
      `reg=${regClean}`,
      `dom=${domClean}`,
      `tra=${trabaja ? '1' : '0'}`,
      `pto=${ptoClean}`,
      `civ=${estadoCivil}`,
      `tel=${telClean}`,
      `cor=${corClean}`,
      `eme=${emeClean}`,
      `gra=${gradoEstudios}`,
      `cfg=${cargaFamiliar ? '1' : '0'}`,
      `cfp=${cargaFamiliar ? cargaFamiliarPersonas : 0}`,
      `int=${internetCasa ? '1' : '0'}`,
      `ope=${operadorCelular}`,
      `eqp=${eqp}`,
      `dis_c=${discapacidad ? '1' : '0'}`,
      `dis_t=${disTClean}`,
      `len=${lenguaOriginaria}`,
      `prg=${carrera}`,
      `esp=${especialidad}`,
      `tur=${turno}`,
      `ins=${insClean}`,
    ].join('|');

    const crc = calculateCrc32(rawData);

    return `---INICIO-FICHA-CETPRO-2026---\n${rawData}|crc=${crc}\n---FIN-FICHA-CETPRO-2026---`;
  }, [
    dni, paterno, materno, nombres, sexo, fechaNacimientoIso, calculatedAge,
    pais, lugarNacimiento, distrito, provincia, region, domicilio, trabaja,
    puestoTrabajo, estadoCivil, telefono, correo, contactoEmergencia, gradoEstudios,
    cargaFamiliar, cargaFamiliarPersonas, internetCasa, operadorCelular, tienePC,
    tieneLaptop, tieneCelular, discapacidad, tipoDiscapacidad, lenguaOriginaria,
    carrera, especialidad, turno, receiptCode
  ]);

  // Mensaje completo para WhatsApp
  const fullWhatsappMessage = useMemo(() => {
    const studentFull = `${(paterno.trim() || 'APELLIDO').toUpperCase()} ${(materno.trim() || '').toUpperCase()}, ${(nombres.trim() || 'NOMBRE').toUpperCase()}`;
    return [
      `🎓 *CETPRO "MICAELA BASTIDAS" — FICHA DE MATRÍCULA 2026*`,
      `--------------------------------------------------`,
      `👤 *Estudiante:* ${studentFull}`,
      `📄 *DNI:* ${dni.trim()}`,
      `📚 *Programa:* ${carrera}`,
      `⏰ *Turno:* ${turno}`,
      `📱 *Teléfono:* ${telefono.trim()}`,
      `🏠 *Domicilio:* ${(domicilio.trim() || 'Juliaca').toUpperCase()} - ${distrito.toUpperCase()}`,
      `--------------------------------------------------`,
      `⚠️ *BLOQUE TÉCNICO DE IMPORTACIÓN AUTOMÁTICA:*`,
      `(Secretaría: copie todo este mensaje y péguelo en el sistema)`,
      ``,
      technicalBlock,
    ].join('\n');
  }, [paterno, materno, nombres, dni, carrera, turno, telefono, domicilio, distrito, technicalBlock]);

  // Enlace wa.me (con número configurado o selector de contacto si está vacío)
  const whatsappUrl = useMemo(() => {
    const cleanPhone = whatsappSecretaria.replace(/\D/g, '');
    const encoded = encodeURIComponent(fullWhatsappMessage);
    if (cleanPhone.length === 9) {
      return `https://wa.me/51${cleanPhone}?text=${encoded}`;
    }
    if (cleanPhone.length >= 10 && cleanPhone !== '51951234567') {
      return `https://wa.me/${cleanPhone}?text=${encoded}`;
    }
    return `https://wa.me/?text=${encoded}`;
  }, [whatsappSecretaria, fullWhatsappMessage]);

  const whatsappContactPickerUrl = useMemo(() => {
    return `https://wa.me/?text=${encodeURIComponent(fullWhatsappMessage)}`;
  }, [fullWhatsappMessage]);

  // Validaciones por paso
  const canAdvanceStep = useMemo(() => {
    if (currentStep === 1) {
      return Boolean(carrera && turno);
    }
    if (currentStep === 2) {
      return (
        dni.trim().length >= 8 &&
        paterno.trim().length >= 2 &&
        nombres.trim().length >= 2
      );
    }
    if (currentStep === 3) {
      return (
        domicilio.trim().length >= 3 &&
        telefono.trim().length >= 7
      );
    }
    if (currentStep === 4) {
      return true;
    }
    return true;
  }, [currentStep, carrera, turno, dni, paterno, nombres, domicilio, telefono]);

  // Enviar ficha al servidor local (si está disponible) y avanzar al paso final
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        documentoIdentidad: dni.trim(),
        apellidoPaterno: paterno.trim().toUpperCase(),
        apellidoMaterno: materno.trim().toUpperCase(),
        nombres: nombres.trim().toUpperCase(),
        sexo,
        fechaNacimiento: fechaNacimientoIso,
        edad: calculatedAge,
        pais: pais.trim().toUpperCase() || 'PERU',
        lugarNacimiento: lugarNacimiento.trim().toUpperCase(),
        distrito: distrito.trim().toUpperCase(),
        provincia: provincia.trim().toUpperCase(),
        region: region.trim().toUpperCase(),
        domicilio: domicilio.trim().toUpperCase(),
        trabaja,
        puestoTrabajo: trabaja ? puestoTrabajo.trim().toUpperCase() : '',
        estadoCivil,
        telefono: telefono.trim(),
        correoElectronico: correo.trim().toLowerCase(),
        contactoEmergencia: contactoEmergencia.trim().toUpperCase(),
        gradoEstudios,
        cargaFamiliar,
        cargaFamiliarPersonas: cargaFamiliar ? cargaFamiliarPersonas : 0,
        internetCasa,
        operadorCelular,
        equipoDisponible: {
          pc: tienePC,
          laptop: tieneLaptop,
          celular: tieneCelular,
        },
        discapacidad,
        tipoDiscapacidad: discapacidad ? tipoDiscapacidad.trim().toUpperCase() : '',
        lenguaOriginaria,
        institucional: {
          programaEstudios: carrera,
          especialidad,
          turno,
          nivelFormativo: 'AUXILIAR TÉCNICO',
          correoInstitucional: 'cetpromicaelabastidas@gmail.com',
          paginaWeb: 'www.cetpromicaelabastidas.edu.pe',
        },
        rawWhatsappText: fullWhatsappMessage,
      };

      const res = await fetch('/api/public/admission-ficha/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.receiptCode) setReceiptCode(data.receiptCode);
      }
    } catch {
      // Si el servidor local está desconectado, continuamos igual con WhatsApp
    } finally {
      setIsSubmitting(false);
      setCurrentStep(5);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(fullWhatsappMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback manual
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Descargar / Imprimir Ficha Oficial PDF 2026 en Bold directamente para el estudiante
  const handleDownloadAndPrintPdf = async () => {
    try {
      const baseUrl = window.location.port === '5173' ? 'http://127.0.0.1:8085' : '';
      const payload = {
        documentoIdentidad: dni.trim(),
        apellidoPaterno: paterno.trim().toUpperCase(),
        apellidoMaterno: materno.trim().toUpperCase(),
        nombres: nombres.trim().toUpperCase(),
        sexo,
        fechaNacimiento: fechaNacimientoIso,
        edad: calculatedAge,
        pais: pais.trim().toUpperCase() || 'PERU',
        lugarNacimiento: lugarNacimiento.trim().toUpperCase(),
        distrito: distrito.trim().toUpperCase(),
        provincia: provincia.trim().toUpperCase(),
        region: region.trim().toUpperCase(),
        domicilio: domicilio.trim().toUpperCase(),
        trabaja,
        puestoTrabajo: trabaja ? puestoTrabajo.trim().toUpperCase() : '',
        estadoCivil,
        telefono: telefono.trim(),
        correoElectronico: correo.trim().toLowerCase(),
        contactoEmergencia: contactoEmergencia.trim().toUpperCase(),
        gradoEstudios,
        cargaFamiliar,
        cargaFamiliarPersonas: cargaFamiliar ? cargaFamiliarPersonas : 0,
        internetCasa,
        operadorCelular,
        equipoDisponible: {
          pc: tienePC,
          laptop: tieneLaptop,
          celular: tieneCelular,
        },
        discapacidad,
        tipoDiscapacidad: discapacidad ? tipoDiscapacidad.trim().toUpperCase() : '',
        lenguaOriginaria,
        institucional: {
          codigoInscripcion: receiptCode || `INS-2026-${dni.trim().slice(-4) || '0001'}`,
          programaEstudios: carrera,
          especialidad,
          turno,
          nivelFormativo: 'AUXILIAR TÉCNICO',
          correoInstitucional: 'cetpromicaelabastidas@gmail.com',
          paginaWeb: 'www.cetpromicaelabastidas.edu.pe',
        },
      };

      const res = await fetch(`${baseUrl}/api/public/admission-ficha/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al generar PDF');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const printWin = window.open(blobUrl, '_blank');
      if (!printWin) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `FICHA_REGISTRO_2026_${dni.trim() || 'ESTUDIANTE'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      alert('No se pudo descargar el PDF directamente. Envíe primero su ficha por WhatsApp a Secretaría.');
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col items-center justify-start p-3 sm:p-6 antialiased">
      {/* Contenedor Principal Adaptable */}
      <div className="w-full max-w-2xl bg-surface rounded-2xl shadow-[var(--ui-shadow)] border border-line overflow-hidden my-2 sm:my-6 transition-all duration-200">
        
        {/* Cabecera Cálida e Institucional */}
        <DashboardPhotoBand as="header" scene="inscripcion" variant="embedded" contentClassName="text-center">
          <div className="relative z-10 flex flex-col items-center min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft text-brand text-xs font-semibold uppercase tracking-wider mb-2">
              <span>🏛️ Admisión y Matrícula 2026</span>
            </div>
            <h1 className="text-[28px] sm:text-[30px] leading-[36px] font-bold tracking-tight">
              {institutionName}
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1 max-w-lg">
              Ficha oficial de pre-inscripción y registro de datos para estudiantes
            </p>
          </div>
        </DashboardPhotoBand>

        {/* Barra de Progreso Accesible de 4 Pasos */}
        {currentStep <= 4 && (
          <div className="p-4 sm:p-6 bg-surface-alt border-b border-line">
            <div className="flex items-center justify-between text-xs font-bold text-muted mb-2 gap-2">
              <span className="text-brand tabular-nums">
                Paso {currentStep} de 4
              </span>
              <span className="truncate">
                {currentStep === 1 && 'Carrera y Turno'}
                {currentStep === 2 && 'Tus Datos Personales'}
                {currentStep === 3 && 'Domicilio y Familia'}
                {currentStep === 4 && 'Conectividad y Envío'}
              </span>
            </div>
            <div className="w-full h-2.5 bg-surface border border-line rounded-full overflow-hidden">
              <div
                className="h-full bg-brand transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Cuerpo del Formulario */}
        <main className="p-5 sm:p-8 space-y-6">

          {/* ========================================================
              PASO 1: CARRERA Y TURNO
             ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center sm:text-left">
                <h2 className="text-lg sm:text-xl font-bold text-ink">
                  1. ¿Qué carrera deseas estudiar?
                </h2>
                <p className="text-xs sm:text-sm text-muted mt-1">
                  Toca la carrera que te interesa para iniciar tu formación técnica:
                </p>
              </div>

              {/* Lista de Carreras en Tarjetas Grandes Táctiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CAREERS.map((c) => {
                  const isSelected = carrera === c.title;
                  return (
                    <button
                      key={c.id}
                      aria-pressed={isSelected}
                      type="button"
                      onClick={() => {
                        setCarrera(c.title);
                        setEspecialidad(c.specialty);
                      }}
                      className={`p-3 min-h-[44px] rounded-2xl border-2 text-left transition-colors duration-150 flex flex-col gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        isSelected
                          ? 'border-brand bg-brand-soft shadow-[var(--ui-shadow)] ring-2 ring-brand/20'
                          : 'border-line bg-surface hover:border-brand/50'
                      }`}
                    >
                      <CareerPhoto programId={c.id} programName={c.title} decorative className="h-36 w-full rounded-xl" />
                      <div className="flex-1 min-w-0">
                        <span className={`block font-bold text-sm leading-snug ${
                          isSelected ? 'text-brand' : 'text-ink'
                        }`}>
                          {c.title}
                        </span>
                        <span className="block text-xs leading-relaxed text-muted mt-1">
                          {c.specialty}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Elección de Turno */}
              <div className="pt-2">
                <label className="block text-sm font-bold text-ink mb-2">
                  ¿En qué horario prefieres estudiar?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTurno('MAÑANA')}
                    className={`min-h-[44px] py-3.5 px-4 rounded-[10px] border-2 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      turno === 'MAÑANA'
                        ? 'border-brand bg-brand text-on-brand shadow-[var(--ui-shadow)]'
                        : 'border-line bg-surface-alt text-ink hover:border-brand/50'
                    }`}
                  >
                    <span aria-hidden="true">☀️</span>
                    <span>TURNO MAÑANA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTurno('TARDE')}
                    className={`min-h-[44px] py-3.5 px-4 rounded-[10px] border-2 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      turno === 'TARDE'
                        ? 'border-brand bg-brand text-on-brand shadow-[var(--ui-shadow)]'
                        : 'border-line bg-surface-alt text-ink hover:border-brand/50'
                    }`}
                  >
                    <span aria-hidden="true">🌤️</span>
                    <span>TURNO TARDE</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              PASO 2: TUS DATOS PERSONALES
             ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-ink">
                  2. Tus Datos Personales
                </h2>
                <p className="text-xs sm:text-sm text-muted mt-1">
                  Escribe tus datos exactamente como figuran en tu DNI:
                </p>
              </div>

              {/* DNI */}
              <div>
                <label htmlFor="student-dni" className="block text-xs font-bold text-muted uppercase mb-1">
                  Documento de Identidad (DNI o Carnet de Extranjería) *
                </label>
                <input
                  id="student-dni"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="Ej. 74518624"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] border border-line bg-surface-alt text-ink text-base font-bold tracking-wider tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              {/* Apellidos y Nombres */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="student-pat" className="block text-xs font-bold text-muted uppercase mb-1">
                    Apellido Paterno *
                  </label>
                  <input
                    id="student-pat"
                    type="text"
                    placeholder="Ej. MAMANI"
                    value={paterno}
                    onChange={(e) => setPaterno(e.target.value.toUpperCase())}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] border border-line bg-surface-alt text-ink text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
                <div>
                  <label htmlFor="student-mat" className="block text-xs font-bold text-muted uppercase mb-1">
                    Apellido Materno
                  </label>
                  <input
                    id="student-mat"
                    type="text"
                    placeholder="Ej. QUISPE"
                    value={materno}
                    onChange={(e) => setMaterno(e.target.value.toUpperCase())}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] border border-line bg-surface-alt text-ink text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="student-nom" className="block text-xs font-bold text-muted uppercase mb-1">
                  Nombres Completos *
                </label>
                <input
                  id="student-nom"
                  type="text"
                  placeholder="Ej. JUAN CARLOS o MARÍA ELENA"
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value.toUpperCase())}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] border border-line bg-surface-alt text-ink text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              {/* Sexo */}
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1.5">
                  Sexo *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSexo('F')}
                    className={`min-h-[44px] py-3 px-4 rounded-[10px] border-2 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      sexo === 'F'
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 shadow-[var(--ui-shadow)]'
                        : 'border-line bg-surface-alt text-muted hover:border-brand/50'
                    }`}
                  >
                    <span aria-hidden="true">👩</span>
                    <span>FEMENINO (F)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSexo('M')}
                    className={`min-h-[44px] py-3 px-4 rounded-[10px] border-2 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      sexo === 'M'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-[var(--ui-shadow)]'
                        : 'border-line bg-surface-alt text-muted hover:border-brand/50'
                    }`}
                  >
                    <span aria-hidden="true">👨</span>
                    <span>MASCULINO (M)</span>
                  </button>
                </div>
              </div>

              {/* Fecha de Nacimiento y Edad Automática */}
              <div className="bg-surface-alt p-4 rounded-2xl border border-line space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink uppercase">
                    Fecha de Nacimiento *
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-soft text-brand tabular-nums">
                    Edad: {calculatedAge} años
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Día */}
                  <div>
                    <label htmlFor="birth-day" className="block text-[11px] text-muted mb-1">Día</label>
                    <select
                      id="birth-day"
                      value={birthDay}
                      onChange={(e) => setBirthDay(Number(e.target.value))}
                      className="w-full min-h-[44px] px-2.5 py-2 rounded-[10px] border border-line bg-surface text-sm font-bold text-ink tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mes */}
                  <div>
                    <label htmlFor="birth-month" className="block text-[11px] text-muted mb-1">Mes</label>
                    <select
                      id="birth-month"
                      value={birthMonth}
                      onChange={(e) => setBirthMonth(Number(e.target.value))}
                      className="w-full min-h-[44px] px-2 py-2 rounded-[10px] border border-line bg-surface text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {MONTHS.map((m, idx) => (
                        <option key={m} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Año */}
                  <div>
                    <label htmlFor="birth-year" className="block text-[11px] text-muted mb-1">Año</label>
                    <select
                      id="birth-year"
                      value={birthYear}
                      onChange={(e) => setBirthYear(Number(e.target.value))}
                      className="w-full min-h-[44px] px-2 py-2 rounded-[10px] border border-line bg-surface text-sm font-bold text-ink tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {Array.from({ length: 70 }, (_, i) => 2012 - i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Lugar de Nacimiento y Ubicación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="birth-place" className="block text-xs font-bold text-muted uppercase mb-1">
                    Lugar de Nacimiento
                  </label>
                  <input
                    id="birth-place"
                    type="text"
                    value={lugarNacimiento}
                    onChange={(e) => setLugarNacimiento(e.target.value.toUpperCase())}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface-alt text-xs font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
                <div>
                  <label htmlFor="district-place" className="block text-xs font-bold text-muted uppercase mb-1">
                    Distrito Actual
                  </label>
                  <input
                    id="district-place"
                    type="text"
                    value={distrito}
                    onChange={(e) => setDistrito(e.target.value.toUpperCase())}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface-alt text-xs font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              PASO 3: DOMICILIO, TELÉFONO Y FAMILIA
             ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-ink">
                  3. Domicilio, Contacto y Familia
                </h2>
                <p className="text-xs sm:text-sm text-muted mt-1">
                  Datos indispensables para coordinaciones de matrícula y emergencias:
                </p>
              </div>

              {/* Domicilio Actual */}
              <div>
                <label htmlFor="student-address" className="block text-xs font-bold text-muted uppercase mb-1">
                  Domicilio Actual (Jr. / Av. / Barrio / Nro.) *
                </label>
                <input
                  id="student-address"
                  type="text"
                  placeholder="Ej. Jr. Moquegua 450 - Barrio Cerro Colorado"
                  value={domicilio}
                  onChange={(e) => setDomicilio(e.target.value.toUpperCase())}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] border border-line bg-surface-alt text-ink text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              {/* Teléfono / WhatsApp y Correo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="student-phone" className="block text-xs font-bold text-muted uppercase mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    id="student-phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="Ej. 951234567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] border border-line bg-surface-alt text-ink text-sm font-bold tracking-wider tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
                <div>
                  <label htmlFor="student-email" className="block text-xs font-bold text-muted uppercase mb-1">
                    Correo Electrónico (Opcional)
                  </label>
                  <input
                    id="student-email"
                    type="email"
                    placeholder="estudiante@gmail.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value.toLowerCase())}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] border border-line bg-surface-alt text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
              </div>

              {/* Contacto de Emergencia */}
              <div>
                <label htmlFor="student-emergency" className="block text-xs font-bold text-muted uppercase mb-1">
                  Contacto de Emergencia (Nombre, Parentesco y Celular)
                </label>
                <input
                  id="student-emergency"
                  type="text"
                  placeholder="Ej. MARÍA MAMANI (MAMÁ) - 951987654"
                  value={contactoEmergencia}
                  onChange={(e) => setContactoEmergencia(e.target.value.toUpperCase())}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] border border-line bg-surface-alt text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              {/* Estado Civil y Grado de Estudios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="student-civil" className="block text-xs font-bold text-muted uppercase mb-1">
                    Estado Civil
                  </label>
                  <select
                    id="student-civil"
                    value={estadoCivil}
                    onChange={(e) => setEstadoCivil(e.target.value as any)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[10px] border border-line bg-surface-alt text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="SOLTERO">Soltera(o)</option>
                    <option value="CASADO">Casada(o)</option>
                    <option value="CONVIVIENTE">Conviviente</option>
                    <option value="VIUDO">Viuda(o)</option>
                    <option value="DIVORCIADO">Divorciada(o)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="student-degree" className="block text-xs font-bold text-muted uppercase mb-1">
                    Grado de Instrucción Logrado
                  </label>
                  <select
                    id="student-degree"
                    value={gradoEstudios}
                    onChange={(e) => setGradoEstudios(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[10px] border border-line bg-surface-alt text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="SECUNDARIA COMPLETA">Secundaria Completa</option>
                    <option value="SECUNDARIA INCOMPLETA">Secundaria Incompleta</option>
                    <option value="PRIMARIA COMPLETA">Primaria Completa</option>
                    <option value="SUPERIOR TÉCNICA">Superior Técnica</option>
                    <option value="SUPERIOR UNIVERSITARIA">Superior Universitaria</option>
                    <option value="SIN INSTRUCCIÓN">Sin Instrucción</option>
                  </select>
                </div>
              </div>

              {/* Trabajo y Carga Familiar */}
              <div className="p-4 bg-surface-alt rounded-2xl border border-line space-y-4">
                {/* ¿Trabaja? */}
                <div>
                  <label className="block text-xs font-bold text-muted uppercase mb-2">
                    ¿Trabajas actualmente?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTrabaja(true)}
                      className={`min-h-[44px] py-2 px-4 rounded-[10px] border font-bold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        trabaja
                          ? 'bg-brand text-on-brand border-brand'
                          : 'bg-surface border-line text-ink hover:border-brand/50'
                      }`}
                    >
                      SÍ TRABAJO
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrabaja(false)}
                      className={`min-h-[44px] py-2 px-4 rounded-[10px] border font-bold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        !trabaja
                          ? 'bg-brand text-on-brand border-brand'
                          : 'bg-surface border-line text-ink hover:border-brand/50'
                      }`}
                    >
                      NO TRABAJO
                    </button>
                  </div>
                  {trabaja && (
                    <input
                      type="text"
                      placeholder="¿Cuál es tu ocupación o puesto de trabajo?"
                      value={puestoTrabajo}
                      onChange={(e) => setPuestoTrabajo(e.target.value.toUpperCase())}
                      className="mt-2 w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  )}
                </div>

                {/* Carga Familiar */}
                <div className="pt-2 border-t border-line">
                  <label className="block text-xs font-bold text-muted uppercase mb-2">
                    ¿Tienes personas o hijos a tu cargo?
                  </label>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="grid grid-cols-2 gap-2 flex-1 min-w-[200px]">
                      <button
                        type="button"
                        onClick={() => setCargaFamiliar(true)}
                        className={`min-h-[44px] py-2 px-4 rounded-[10px] border font-bold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                          cargaFamiliar
                            ? 'bg-brand text-on-brand border-brand'
                            : 'bg-surface border-line text-ink hover:border-brand/50'
                        }`}
                      >
                        SÍ TENGO HIJOS/CARGA
                      </button>
                      <button
                        type="button"
                        onClick={() => setCargaFamiliar(false)}
                        className={`min-h-[44px] py-2 px-4 rounded-[10px] border font-bold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                          !cargaFamiliar
                            ? 'bg-brand text-on-brand border-brand'
                            : 'bg-surface border-line text-ink hover:border-brand/50'
                        }`}
                      >
                        NO TENGO
                      </button>
                    </div>

                    {cargaFamiliar && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCargaFamiliarPersonas(Math.max(1, cargaFamiliarPersonas - 1))}
                          className="min-w-[44px] min-h-[44px] rounded-[10px] bg-surface border border-line text-ink font-bold text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          aria-label="Disminuir personas a cargo"
                        >
                          -
                        </button>
                        <span className="font-extrabold text-sm w-6 text-center text-ink tabular-nums">
                          {cargaFamiliarPersonas}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCargaFamiliarPersonas(cargaFamiliarPersonas + 1)}
                          className="min-w-[44px] min-h-[44px] rounded-[10px] bg-surface border border-line text-ink font-bold text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          aria-label="Aumentar personas a cargo"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              PASO 4: CONECTIVIDAD, IDIOMA Y ENVÍO
             ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-ink">
                  4. Conectividad e Inclusión
                </h2>
                <p className="text-xs sm:text-sm text-muted mt-1">
                  Últimos detalles para adecuar las clases y recursos pedagógicos:
                </p>
              </div>

              {/* Internet en casa */}
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-2">
                  ¿Dispones de Internet fijo en tu domicilio?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInternetCasa(true)}
                    className={`min-h-[44px] py-2.5 px-4 rounded-[10px] border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      internetCasa
                        ? 'bg-brand text-on-brand border-brand'
                        : 'bg-surface-alt text-ink border-line hover:border-brand/50'
                    }`}
                  >
                    <span aria-hidden="true">📶</span> SÍ TENGO INTERNET
                  </button>
                  <button
                    type="button"
                    onClick={() => setInternetCasa(false)}
                    className={`min-h-[44px] py-2.5 px-4 rounded-[10px] border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      !internetCasa
                        ? 'bg-brand text-on-brand border-brand'
                        : 'bg-surface-alt text-ink border-line hover:border-brand/50'
                    }`}
                  >
                    <span aria-hidden="true">📵</span> NO TENGO (SOLO DATOS)
                  </button>
                </div>
              </div>

              {/* Operador Celular */}
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-2">
                  Empresa operadora de tu celular
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['CLARO', 'MOVISTAR', 'ENTEL', 'BITEL'].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setOperadorCelular(op)}
                      className={`min-h-[44px] py-2 rounded-[10px] border font-bold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        operadorCelular === op
                          ? 'bg-brand text-on-brand border-brand'
                          : 'bg-surface-alt text-ink border-line hover:border-brand/50'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipos Tecnológicos */}
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-2">
                  ¿Qué equipos tecnológicos utilizas? (Puedes marcar varios)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTieneCelular(!tieneCelular)}
                    className={`min-h-[44px] py-3 px-2 rounded-[10px] border font-bold text-xs flex flex-col items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      tieneCelular
                        ? 'bg-brand-soft border-brand text-brand'
                        : 'bg-surface-alt border-line text-muted hover:border-brand/50'
                    }`}
                  >
                    <span className="text-xl" aria-hidden="true">📱</span>
                    <span>Celular</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTieneLaptop(!tieneLaptop)}
                    className={`min-h-[44px] py-3 px-2 rounded-[10px] border font-bold text-xs flex flex-col items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      tieneLaptop
                        ? 'bg-brand-soft border-brand text-brand'
                        : 'bg-surface-alt border-line text-muted hover:border-brand/50'
                    }`}
                  >
                    <span className="text-xl" aria-hidden="true">💻</span>
                    <span>Laptop</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTienePC(!tienePC)}
                    className={`min-h-[44px] py-3 px-2 rounded-[10px] border font-bold text-xs flex flex-col items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      tienePC
                        ? 'bg-brand-soft border-brand text-brand'
                        : 'bg-surface-alt border-line text-muted hover:border-brand/50'
                    }`}
                  >
                    <span className="text-xl" aria-hidden="true">🖥️</span>
                    <span>Computadora</span>
                  </button>
                </div>
              </div>

              {/* Lengua Originaria */}
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-2">
                  Lengua originaria aprendida en tu infancia
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['QUECHUA', 'AYMARA', 'CASTELLANO'].map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setLenguaOriginaria(len)}
                      className={`min-h-[44px] py-2 rounded-[10px] border font-bold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        lenguaOriginaria === len
                          ? 'bg-brand text-on-brand border-brand'
                          : 'bg-surface-alt text-ink border-line hover:border-brand/50'
                      }`}
                    >
                      {len}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discapacidad */}
              <div className="p-4 bg-surface-alt rounded-2xl border border-line">
                <label className="block text-xs font-bold text-muted uppercase mb-2">
                  ¿Presentas alguna condición de discapacidad?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDiscapacidad(false)}
                    className={`min-h-[44px] py-2 rounded-[10px] border font-bold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      !discapacidad
                        ? 'bg-brand text-on-brand border-brand'
                        : 'bg-surface border-line text-ink hover:border-brand/50'
                    }`}
                  >
                    NO PRESENTA
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscapacidad(true)}
                    className={`min-h-[44px] py-2 rounded-[10px] border font-bold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      discapacidad
                        ? 'bg-brand text-on-brand border-brand'
                        : 'bg-surface border-line text-ink hover:border-brand/50'
                    }`}
                  >
                    SÍ PRESENTA
                  </button>
                </div>
                {discapacidad && (
                  <input
                    type="text"
                    placeholder="Detalle o tipo de discapacidad..."
                    value={tipoDiscapacidad}
                    onChange={(e) => setTipoDiscapacidad(e.target.value.toUpperCase())}
                    className="mt-2 w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              PASO 5: CONFIRMACIÓN Y ENVÍO POR WHATSAPP
             ======================================================== */}
          {currentStep === 5 && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-brand-soft text-brand flex items-center justify-center mx-auto text-3xl" aria-hidden="true">
                ✓
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-ink">
                  ¡Tu Ficha 2026 está lista para enviar!
                </h2>
                <p className="text-xs sm:text-sm text-muted mt-1 max-w-md mx-auto">
                  Presiona el botón verde de abajo para abrir WhatsApp y enviar tus datos directamente a Secretaría del CETPRO.
                </p>
              </div>

              {/* Selector / Editor de Número de WhatsApp Receptor */}
              <div className="text-left bg-brand-soft p-4 rounded-2xl border border-brand/30 space-y-2">
                <label className="block text-xs font-extrabold text-ink">
                  📱 Número de WhatsApp de {receptorNombre} (Destino):
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 min-h-[44px] flex items-center rounded-[10px] border border-line bg-surface text-brand font-bold text-sm tabular-nums">
                    +51
                  </span>
                  <input
                    type="text"
                    maxLength={9}
                    value={whatsappSecretaria}
                    onChange={(e) => setWhatsappSecretaria(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="Ej. 985030353 (o vacío para elegir contacto)"
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] border border-line bg-surface text-ink font-bold text-base tracking-wide tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
                <p className="text-[11px] text-muted">
                  💡 Si la Secretaría le dio otro número hoy, puede escribirlo aquí, o dejarlo vacío para elegir el contacto directamente en su WhatsApp.
                </p>
              </div>

              {/* Botón Gigante de WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[48px] py-4 px-6 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base sm:text-lg shadow-[var(--ui-shadow)] transition-all duration-150 flex items-center justify-center gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="text-2xl" aria-hidden="true">📲</span>
                <span>
                  {whatsappSecretaria.replace(/\D/g, '').length === 9
                    ? `ENVIAR MI FICHA AL +51 ${whatsappSecretaria.replace(/\D/g, '')}`
                    : 'ELEGIR CONTACTO EN WHATSAPP Y ENVIAR MI FICHA'}
                </span>
              </a>

              {/* Botón Secundario: Elegir contacto en WhatsApp sin número */}
              {whatsappSecretaria.replace(/\D/g, '').length === 9 && (
                <a
                  href={whatsappContactPickerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] py-3 px-4 rounded-[10px] border border-brand/40 bg-surface hover:bg-brand-soft text-brand font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span aria-hidden="true">👥</span>
                  <span>O elegir otro contacto en mi lista de WhatsApp</span>
                </a>
              )}

              {/* Botón de Impresión / Descarga de Ficha Oficial PDF 2026 en Bold */}
              <button
                type="button"
                onClick={handleDownloadAndPrintPdf}
                className="w-full min-h-[44px] py-3.5 px-5 rounded-[10px] bg-amber-500 hover:bg-amber-600 text-ink font-bold text-sm sm:text-base shadow-[var(--ui-shadow)] transition-all flex items-center justify-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="text-xl" aria-hidden="true">🖨️</span>
                <span>DESCARGAR / IMPRIMIR MI FICHA OFICIAL PDF 2026 (EN BOLD)</span>
              </button>

              {/* Botón Alternativo de Copiado */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="w-full min-h-[44px] py-3 px-4 rounded-[10px] border border-line bg-surface-alt hover:border-brand text-ink font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span aria-hidden="true">📋</span>
                  <span>
                    {copied ? '¡MENSAJE COPIADO AL PORTAPAPELES!' : 'COPIAR MENSAJE PARA PEGARLO EN WHATSAPP'}
                  </span>
                </button>
              </div>

              {/* Vista previa compacta del mensaje */}
              <div className="text-left bg-surface-alt p-4 rounded-2xl border border-line space-y-2">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                  Vista previa del texto que se enviará:
                </span>
                <pre className="text-[11px] text-ink font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto p-2 bg-surface rounded-[10px] border border-line">
                  {fullWhatsappMessage}
                </pre>
              </div>

              {/* Botón para volver a editar */}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="min-h-[44px] px-4 rounded-[10px] text-xs font-bold text-brand hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                ← Deseo revisar o corregir mis datos
              </button>
            </div>
          )}

          {/* Botones de Navegación de Pasos */}
          {currentStep <= 4 && (
            <div className="pt-4 border-t border-line flex items-center justify-between gap-3">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="min-h-[44px] py-3 px-5 rounded-[10px] border border-line bg-surface-alt text-ink font-bold text-xs hover:border-brand cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  ← Anterior
                </button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canAdvanceStep}
                  className="min-h-[44px] py-3 px-6 rounded-[10px] bg-brand hover:opacity-90 text-on-brand font-bold text-xs shadow-[var(--ui-shadow)] transition-all disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Siguiente paso →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="min-h-[44px] py-3.5 px-7 rounded-[10px] bg-brand hover:opacity-90 text-on-brand font-bold text-sm shadow-[var(--ui-shadow)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-on-brand/30 border-t-on-brand rounded-full animate-spin" />
                      <span>Procesando Ficha…</span>
                    </>
                  ) : (
                    <span>¡COMPLETAR Y ENVIAR FICHA! 📲</span>
                  )}
                </button>
              )}
            </div>
          )}

        </main>

        {/* Pie Institucional */}
        <footer className="p-4 bg-surface-alt border-t border-line text-center text-[11px] text-muted">
          CETPRO Micaela Bastidas Puyucawa · Puno / San Román / Juliaca · Año Lectivo 2026
        </footer>
      </div>
    </div>
  );
};

export default FormularioAdmisionPublico;
