/**
 * src/components/academic/CareerVisualBanner.tsx
 *
 * Fotografía contextual local con respaldo vectorial, offline y compatible con CSP
 * para las 7 Carreras Oficiales de CEPRO_MICAELA 2.0 (2026):
 *   - PROG-001: Mecánica Automotriz
 *   - PROG-002: Mecánica de Motos y Vehículos Afines
 *   - PROG-003: Carpintería Metálica
 *   - PROG-004: Peluquería y Barbería
 *   - PROG-005: Computación e Informática
 *   - PROG-006: Corte y Ensamblaje
 *   - PROG-007: Mantenimiento de Sistemas Eléctricos
 */

import React, { useState } from 'react';

export interface CareerVisualTheme {
  id: string;
  key: 'automotriz' | 'motos' | 'metalica' | 'peluqueria' | 'computacion' | 'corte' | 'electricidad';
  shortLabel: string;
  tagline: string;
  toolsSummary: string;
  gradientClass: string;
  iconBgClass: string;
  accentBadgeClass: string;
  borderActiveClass: string;
}

export function resolveCareerVisualTheme(programId?: string, programName?: string): CareerVisualTheme {
  const pid = (programId || '').toUpperCase().trim();
  const pname = (programName || '').toUpperCase().trim();

  if (pid === 'PROG-001' || pname.includes('AUTOMOTRIZ')) {
    return {
      id: 'PROG-001',
      key: 'automotriz',
      shortLabel: 'Taller Automotriz',
      tagline: 'Diagnóstico Electrónico, Motores y Suspensión',
      toolsSummary: 'Escáner OBD-II · Torquímetro · Elevador Hidráulico',
      gradientClass: 'bg-gradient-to-br from-[#0F2942] via-[#1B4965] to-[#13594A]',
      iconBgClass: 'bg-[#1B4965] shadow-[#1B4965]/25',
      accentBadgeClass: 'bg-sky-500/20 text-sky-100 border-sky-300/30',
      borderActiveClass: 'border-sky-600 dark:border-sky-400',
    };
  }

  if (pid === 'PROG-002' || pname.includes('MOTOS') || pname.includes('VEHÍCULOS AFINES') || pname.includes('VEHICULOS AFINES')) {
    return {
      id: 'PROG-002',
      key: 'motos',
      shortLabel: 'Taller de Motocicletas',
      tagline: 'Transmisión, Carburación, Inyección y Chasis',
      toolsSummary: 'Banco de Motos · Compresímetro · Calibrador de Válvulas',
      gradientClass: 'bg-gradient-to-br from-[#3B1D11] via-[#7C2D12] to-[#9A3412]',
      iconBgClass: 'bg-[#7C2D12] shadow-[#7C2D12]/25',
      accentBadgeClass: 'bg-amber-500/20 text-amber-100 border-amber-300/30',
      borderActiveClass: 'border-amber-600 dark:border-amber-400',
    };
  }

  if (pid === 'PROG-003' || pname.includes('METÁLICA') || pname.includes('METALICA') || pname.includes('SOLDADURA')) {
    return {
      id: 'PROG-003',
      key: 'metalica',
      shortLabel: 'Estructuras y Soldadura',
      tagline: 'Trazado, Conformado y Soldadura Arco / MIG-MAG',
      toolsSummary: 'Inversora SMAW/MIG · Esmeril Angular · Escuadra Magnética',
      gradientClass: 'bg-gradient-to-br from-[#1E293B] via-[#334155] to-[#0F4C5C]',
      iconBgClass: 'bg-[#334155] shadow-[#334155]/25',
      accentBadgeClass: 'bg-orange-500/20 text-orange-100 border-orange-300/30',
      borderActiveClass: 'border-slate-600 dark:border-slate-400',
    };
  }

  if (pid === 'PROG-004' || pname.includes('PELUQUER') || pname.includes('BARBER') || pname.includes('COSMETOLOG')) {
    return {
      id: 'PROG-004',
      key: 'peluqueria',
      shortLabel: 'Estilismo y Barbería',
      tagline: 'Corte Escultural, Colorimetría, Barbería y Bioseguridad',
      toolsSummary: 'Tijeras Microdentadas · Clipper Profesional · Lavacabezas',
      gradientClass: 'bg-gradient-to-br from-[#2E1A36] via-[#582B5B] to-[#13594A]',
      iconBgClass: 'bg-[#582B5B] shadow-[#582B5B]/25',
      accentBadgeClass: 'bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-300/30',
      borderActiveClass: 'border-fuchsia-600 dark:border-fuchsia-400',
    };
  }

  if (pid === 'PROG-006' || pname.includes('CORTE') || pname.includes('ENSAMBLAJE') || pname.includes('CONFECCI')) {
    return {
      id: 'PROG-006',
      key: 'corte',
      shortLabel: 'Patronaje y Confección',
      tagline: 'Tizado Industrial, Costura Recta, Remalle y Acabados',
      toolsSummary: 'Recta Industrial · Remalladora · Mesa de Tendido y Moldes',
      gradientClass: 'bg-gradient-to-br from-[#1E1B4B] via-[#3730A3] to-[#1E4E5D]',
      iconBgClass: 'bg-[#3730A3] shadow-[#3730A3]/25',
      accentBadgeClass: 'bg-indigo-400/20 text-indigo-100 border-indigo-300/30',
      borderActiveClass: 'border-indigo-600 dark:border-indigo-400',
    };
  }

  if (pid === 'PROG-007' || pname.includes('ELÉCTRIC') || pname.includes('ELECTRIC')) {
    return {
      id: 'PROG-007',
      key: 'electricidad',
      shortLabel: 'Electrotecnia y Tableros',
      tagline: 'Instalaciones Domiciliarias, Tableros y Automatismo',
      toolsSummary: 'Pinza Amperimétrica · Tablero Termomagnético · Megóhmetro',
      gradientClass: 'bg-gradient-to-br from-[#083344] via-[#155E75] to-[#0D9488]',
      iconBgClass: 'bg-[#155E75] shadow-[#155E75]/25',
      accentBadgeClass: 'bg-cyan-400/20 text-cyan-100 border-cyan-300/30',
      borderActiveClass: 'border-cyan-600 dark:border-cyan-400',
    };
  }

  // Default: PROG-005 Computación e Informática
  return {
    id: pid || 'PROG-005',
    key: 'computacion',
    shortLabel: 'Laboratorio Digital',
    tagline: 'Ofimática, Diseño Gráfico, Redes y Soporte Técnico TI',
    toolsSummary: 'Estaciones PC · Suite Ofimática · Redes LAN y Diseño',
    gradientClass: 'bg-gradient-to-br from-[#0c2e27] via-[#13594A] to-[#1c6e5d]',
    iconBgClass: 'bg-[#004034] shadow-[#004034]/25',
    accentBadgeClass: 'bg-emerald-400/20 text-emerald-100 border-emerald-300/30',
    borderActiveClass: 'border-[#13594A] dark:border-[#5EEAD4]',
  };
}

export const CareerEmblemIcon: React.FC<{
  programId?: string;
  programName?: string;
  className?: string;
}> = ({ programId, programName, className = 'w-6 h-6 text-white' }) => {
  const theme = resolveCareerVisualTheme(programId, programName);

  switch (theme.key) {
    case 'automotriz':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 11l1.8-4.5A2 2 0 0 1 8.66 5.2h6.68a2 2 0 0 1 1.86 1.3L19 11" />
          <rect x="3" y="11" width="18" height="6" rx="2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
          <path d="M9 14h6" />
        </svg>
      );
    case 'motos':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="5.5" cy="17.5" r="3" />
          <circle cx="18.5" cy="17.5" r="3" />
          <path d="M8.5 17.5h4l2.5-6h-5.5l-2 3.5" />
          <path d="M13 7h3l2.5 10.5" />
          <path d="M6.5 10.5h3.5" />
        </svg>
      );
    case 'metalica':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20h16" />
          <path d="M6 20V8l6-4 6 4v12" />
          <path d="M6 12h12" />
          <path d="M10 12l4 8" />
          <path d="M14 12l-4 8" />
        </svg>
      );
    case 'peluqueria':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      );
    case 'corte':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 3l3 2 3-2 4 3-2 4h-2v10H9V10H7L5 6l4-3z" />
          <path d="M12 5v15" strokeDasharray="2 2" />
        </svg>
      );
    case 'electricidad':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <line x1="2" y1="20" x2="22" y2="20" />
          <line x1="12" y1="16" x2="12" y2="20" />
          <path d="M9 9l-2 2 2 2" />
          <path d="M15 9l2 2-2 2" />
        </svg>
      );
  }
};

export interface CareerVisualBannerProps {
  programId?: string;
  programName?: string;
  instanceId?: string;
  heightClass?: string;
  badgeText?: string;
  rightBadgeText?: string;
  subtitleText?: string;
  showToolsFooter?: boolean;
}

export const CareerVisualBanner: React.FC<CareerVisualBannerProps> = ({
  programId,
  programName,
  instanceId = 'default',
  heightClass = 'h-36',
  badgeText,
  rightBadgeText,
  subtitleText,
  showToolsFooter = true,
}) => {
  const theme = resolveCareerVisualTheme(programId, programName);
  return (
    <div className={`relative isolate w-full ${heightClass} min-h-40 overflow-hidden rounded-2xl ${theme.gradientClass} flex flex-col justify-between`} data-career-banner={theme.id}>
      <CareerPhoto programId={programId} programName={programName} className="absolute inset-0 h-full w-full" />
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-2 p-3">
        <span className="rounded-lg bg-black/80 px-2.5 py-1 text-xs font-semibold text-white">{badgeText || theme.shortLabel}</span>
        {rightBadgeText && <span className="rounded-lg bg-black/80 px-2.5 py-1 text-xs font-medium text-white">{rightBadgeText}</span>}
      </div>
      {(showToolsFooter || subtitleText) && <div className="relative z-10 bg-black/80 px-3 py-2.5 text-white">
        <p className="text-sm font-semibold leading-snug">{subtitleText || theme.tagline}</p>
        {showToolsFooter && <p className="mt-1 text-xs leading-relaxed text-white/90">{theme.toolsSummary}</p>}
      </div>}
    </div>
  );
};

// Public assets are bundled with the app; provenance is in public/images/careers/SOURCES.json.
const CAREER_PHOTOS: Record<string, {src: string; alt: string}> = {
  "PROG-001": {
    "src": "/images/careers/automotriz.webp",
    "alt": "Motor de un automóvil bajo el capó abierto en un taller."
  },
  "PROG-002": {
    "src": "/images/careers/motos.webp",
    "alt": "Técnico trabajando en una motocicleta dentro del taller."
  },
  "PROG-003": {
    "src": "/images/careers/metalica.webp",
    "alt": "Soldador con equipo de protección trabajando una estructura metálica."
  },
  "PROG-004": {
    "src": "/images/careers/peluqueria.webp",
    "alt": "Profesional realizando un corte de cabello en una barbería."
  },
  "PROG-005": {
    "src": "/images/careers/computacion.webp",
    "alt": "Trabajo colaborativo con aplicaciones en una computadora de escritorio."
  },
  "PROG-006": {
    "src": "/images/careers/corte.webp",
    "alt": "Confección de prendas con una máquina de coser."
  },
  "PROG-007": {
    "src": "/images/careers/electricidad.webp",
    "alt": "Técnico con equipo de protección trabajando en un tablero eléctrico."
  }
};

export interface CareerPhotoProps {
  programId?: string;
  programName?: string;
  className?: string;
  decorative?: boolean;
}
/** Shared by all roles. Unknown careers and missing files retain the vector fallback. */
export function CareerPhoto({programId, programName, className = '', decorative = false}: CareerPhotoProps) {
  const theme = resolveCareerVisualTheme(programId, programName);
  return <CareerPhotoAsset key={theme.id} theme={theme} className={className} decorative={decorative} />;
}
function CareerPhotoAsset({theme, className, decorative}: {theme: CareerVisualTheme; className: string; decorative: boolean}) {
  const [failed, setFailed] = useState(false);
  const photo = CAREER_PHOTOS[theme.id];
  return <div className={`overflow-hidden ${theme.gradientClass} ${className}`} data-career-photo={theme.id}>
    {photo && !failed ? <img src={`${import.meta.env.BASE_URL}${photo.src.slice(1)}`} alt={decorative ? '' : photo.alt} width={960} height={640} loading="lazy" decoding="async" className="h-full w-full object-cover object-center" onError={() => setFailed(true)} /> : <div className="flex h-full min-h-20 items-center justify-center text-white" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : `Ilustración de ${theme.shortLabel}`} aria-hidden={decorative || undefined}><CareerEmblemIcon programId={theme.id} className="h-12 w-12" /></div>}
  </div>;
}
