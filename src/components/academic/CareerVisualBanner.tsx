/**
 * src/components/academic/CareerVisualBanner.tsx
 *
 * Arte visual descriptivo y temático (100% vectorial SVG, offline-first y CSP-safe)
 * para las 7 Carreras Oficiales de CEPRO_MICAELA 2.0 (2026):
 *   - PROG-001: Mecánica Automotriz
 *   - PROG-002: Mecánica de Motos y Vehículos Afines
 *   - PROG-003: Carpintería Metálica
 *   - PROG-004: Peluquería y Barbería
 *   - PROG-005: Computación e Informática
 *   - PROG-006: Corte y Ensamblaje
 *   - PROG-007: Mantenimiento de Sistemas Eléctricos
 */

import React from 'react';

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
  const patternId = `career-pat-${theme.key}-${instanceId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <div
      className={`relative w-full ${heightClass} rounded-2xl overflow-hidden ${theme.gradientClass} group flex flex-col justify-between p-4 shadow-inner select-none`}
    >
      {/* Patrón de fondo técnico/artesanal sutil */}
      <div className="absolute inset-0 opacity-12 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <pattern id={patternId} width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#ffffff" />
              <path d="M 22 0 L 0 0 0 22" fill="none" stroke="#ffffff" strokeWidth="0.35" opacity="0.45" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      </div>

      {/* Ilustración Descriptiva Vectorial según la Carrera */}
      <div className="absolute right-2 bottom-1 top-1 w-48 pointer-events-none flex items-center justify-end opacity-90 group-hover:scale-105 transition-transform duration-500">
        {theme.key === 'automotriz' && (
          <svg viewBox="0 0 180 110" className="w-44 h-28 drop-shadow-md" fill="none" aria-hidden="true">
            {/* Silueta de automóvil técnico + engranaje y escáner */}
            <circle cx="135" cy="36" r="22" stroke="#7DD3FC" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
            <circle cx="135" cy="36" r="11" stroke="#BAE6FD" strokeWidth="2" opacity="0.65" />
            <path d="M22 72 L38 48 C42 43 48 40 56 40 L102 40 C110 40 117 44 122 50 L138 68 L154 70 C159 71 162 75 162 80 L162 86 L16 86 L16 78 C16 74 18 72 22 72 Z" fill="#0284C7" fillOpacity="0.35" stroke="#E0F2FE" strokeWidth="2" />
            <path d="M46 45 L74 45 L74 63 L34 63 Z" fill="#BAE6FD" fillOpacity="0.25" stroke="#BAE6FD" strokeWidth="1.2" />
            <path d="M80 45 L106 45 L118 63 L80 63 Z" fill="#BAE6FD" fillOpacity="0.25" stroke="#BAE6FD" strokeWidth="1.2" />
            <circle cx="46" cy="86" r="13" fill="#0F172A" stroke="#7DD3FC" strokeWidth="2.5" />
            <circle cx="46" cy="86" r="5" fill="#7DD3FC" />
            <circle cx="130" cy="86" r="13" fill="#0F172A" stroke="#7DD3FC" strokeWidth="2.5" />
            <circle cx="130" cy="86" r="5" fill="#7DD3FC" />
            {/* Pulso de diagnóstico electrónico */}
            <path d="M18 28 L34 28 L40 16 L47 38 L54 22 L60 28 L78 28" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}

        {theme.key === 'motos' && (
          <svg viewBox="0 0 180 110" className="w-44 h-28 drop-shadow-md" fill="none" aria-hidden="true">
            {/* Motocicleta técnica y piñón de transmisión */}
            <circle cx="42" cy="80" r="18" fill="#1C1917" fillOpacity="0.55" stroke="#FDBA74" strokeWidth="2.5" />
            <circle cx="42" cy="80" r="7" stroke="#FED7AA" strokeWidth="1.8" />
            <circle cx="140" cy="80" r="18" fill="#1C1917" fillOpacity="0.55" stroke="#FDBA74" strokeWidth="2.5" />
            <circle cx="140" cy="80" r="7" stroke="#FED7AA" strokeWidth="1.8" />
            <path d="M42 80 L76 80 L98 50 L68 50 L54 66" stroke="#FFEDD5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M76 80 L114 66 L98 50" fill="#FB923C" fillOpacity="0.3" stroke="#FDBA74" strokeWidth="2" />
            <path d="M114 32 L124 32 L140 80" stroke="#FFEDD5" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M56 48 L84 48 C90 48 94 43 98 40" stroke="#FDE68A" strokeWidth="3" strokeLinecap="round" />
            <circle cx="132" cy="44" r="5" fill="#FDE047" fillOpacity="0.7" />
          </svg>
        )}

        {theme.key === 'metalica' && (
          <svg viewBox="0 0 180 110" className="w-44 h-28 drop-shadow-md" fill="none" aria-hidden="true">
            {/* Estructura reticulada metálica + arco y chispas de soldadura */}
            <rect x="24" y="28" width="128" height="62" rx="4" stroke="#CBD5E1" strokeWidth="2" fill="#0F172A" fillOpacity="0.3" />
            <line x1="24" y1="59" x2="152" y2="59" stroke="#94A3B8" strokeWidth="1.8" />
            <line x1="24" y1="28" x2="66" y2="90" stroke="#94A3B8" strokeWidth="1.6" />
            <line x1="66" y1="28" x2="24" y2="90" stroke="#94A3B8" strokeWidth="1.6" />
            <line x1="66" y1="28" x2="110" y2="90" stroke="#94A3B8" strokeWidth="1.6" />
            <line x1="110" y1="28" x2="66" y2="90" stroke="#94A3B8" strokeWidth="1.6" />
            <line x1="110" y1="28" x2="152" y2="90" stroke="#94A3B8" strokeWidth="1.6" />
            <line x1="152" y1="28" x2="110" y2="90" stroke="#94A3B8" strokeWidth="1.6" />
            {/* Antorcha y chispas de soldadura */}
            <circle cx="110" cy="59" r="7" fill="#F97316" fillOpacity="0.75" />
            <circle cx="110" cy="59" r="3.5" fill="#FEF08A" />
            <path d="M110 59 L126 42 M110 59 L95 40 M110 59 L128 66 M110 59 L96 74" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}

        {theme.key === 'peluqueria' && (
          <svg viewBox="0 0 180 110" className="w-44 h-28 drop-shadow-md" fill="none" aria-hidden="true">
            {/* Tijeras de estilismo, peine profesional y poste clásico de barbería */}
            {/* Poste de barbería */}
            <rect x="134" y="20" width="20" height="70" rx="10" fill="#1E1B4B" fillOpacity="0.45" stroke="#F5D0FE" strokeWidth="2" />
            <path d="M134 36 L154 26 M134 52 L154 42 M134 68 L154 58 M134 82 L154 72" stroke="#F472B6" strokeWidth="3" />
            {/* Tijeras profesionales */}
            <circle cx="46" cy="36" r="11" stroke="#F5D0FE" strokeWidth="2.2" fill="#701A75" fillOpacity="0.3" />
            <circle cx="46" cy="76" r="11" stroke="#F5D0FE" strokeWidth="2.2" fill="#701A75" fillOpacity="0.3" />
            <path d="M56 41 L118 74" stroke="#FDF4FF" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M56 71 L118 38" stroke="#FDF4FF" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="82" cy="56" r="3" fill="#F0ABFC" />
            {/* Peine */}
            <rect x="64" y="82" width="54" height="8" rx="2" fill="#E879F9" fillOpacity="0.35" stroke="#F5D0FE" strokeWidth="1.4" />
            <path d="M70 82 V90 M76 82 V90 M82 82 V90 M88 82 V90 M94 82 V90 M100 82 V90 M106 82 V90 M112 82 V90" stroke="#F5D0FE" strokeWidth="1.2" />
          </svg>
        )}

        {theme.key === 'computacion' && (
          <svg viewBox="0 0 180 110" className="w-44 h-28 drop-shadow-md" fill="none" aria-hidden="true">
            {/* Monitor estación de trabajo + código + red de datos */}
            <rect x="44" y="20" width="96" height="62" rx="6" fill="#042F2E" fillOpacity="0.55" stroke="#5EEAD4" strokeWidth="2.2" />
            <rect x="52" y="28" width="80" height="44" rx="3" fill="#134E4A" fillOpacity="0.6" />
            <path d="M62 42 L56 48 L62 54 M76 42 L82 48 L76 54 M71 40 L67 56" stroke="#99F6E4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="92" y1="42" x2="122" y2="42" stroke="#5EEAD4" strokeWidth="2" strokeLinecap="round" />
            <line x1="92" y1="50" x2="116" y2="50" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" />
            <line x1="92" y1="58" x2="124" y2="58" stroke="#5EEAD4" strokeWidth="2" strokeLinecap="round" />
            <path d="M82 82 L102 82 L106 94 L78 94 Z" fill="#5EEAD4" fillOpacity="0.35" />
            <line x1="68" y1="94" x2="116" y2="94" stroke="#99F6E4" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        )}

        {theme.key === 'corte' && (
          <svg viewBox="0 0 180 110" className="w-44 h-28 drop-shadow-md" fill="none" aria-hidden="true">
            {/* Máquina de coser industrial + maniquí de sastrería */}
            {/* Maniquí */}
            <path d="M38 24 C44 24 48 28 48 34 C48 40 44 48 46 58 L30 58 C32 48 28 40 28 34 C28 28 32 24 38 24 Z" fill="#818CF8" fillOpacity="0.3" stroke="#E0E7FF" strokeWidth="1.8" />
            <line x1="38" y1="58" x2="38" y2="88" stroke="#E0E7FF" strokeWidth="2" />
            <line x1="28" y1="88" x2="48" y2="88" stroke="#E0E7FF" strokeWidth="2" strokeLinecap="round" />
            {/* Máquina de coser */}
            <path d="M72 82 L156 82 L156 72 L102 72 L102 48 L142 48 L142 32 L82 32 C76 32 72 36 72 42 L72 56 L86 56 L86 46" fill="#4F46E5" fillOpacity="0.35" stroke="#C7D2FE" strokeWidth="2.2" strokeLinejoin="round" />
            <line x1="82" y1="56" x2="82" y2="70" stroke="#FDE68A" strokeWidth="2" />
            <circle cx="154" cy="40" r="8" stroke="#E0E7FF" strokeWidth="2" fill="#312E81" />
          </svg>
        )}

        {theme.key === 'electricidad' && (
          <svg viewBox="0 0 180 110" className="w-44 h-28 drop-shadow-md" fill="none" aria-hidden="true">
            {/* Tablero eléctrico, circuito y rayo de energía */}
            <rect x="36" y="20" width="66" height="72" rx="5" fill="#083344" fillOpacity="0.55" stroke="#67E8F9" strokeWidth="2" />
            <polygon points="72 34 56 56 68 56 64 76 82 52 70 52 72 34" fill="#FDE047" fillOpacity="0.85" stroke="#FEF08A" strokeWidth="1.2" />
            {/* Líneas de circuito e instrumento */}
            <path d="M102 36 H128 L138 26" stroke="#67E8F9" strokeWidth="2" strokeLinecap="round" />
            <circle cx="141" cy="23" r="3.5" fill="#67E8F9" />
            <path d="M102 56 H146" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" />
            <circle cx="150" cy="56" r="3.5" fill="#22D3EE" />
            <path d="M102 76 H128 L138 86" stroke="#67E8F9" strokeWidth="2" strokeLinecap="round" />
            <circle cx="141" cy="89" r="3.5" fill="#67E8F9" />
          </svg>
        )}
      </div>

      {/* fila superior de badges */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className={`px-2.5 py-1 rounded-lg backdrop-blur-md text-[11px] font-bold tracking-wide border ${theme.accentBadgeClass}`}>
          {badgeText || theme.shortLabel}
        </span>
        {rightBadgeText && (
          <span className="px-2.5 py-1 rounded-lg bg-black/25 backdrop-blur-md text-white/95 text-[11px] font-semibold border border-white/15">
            {rightBadgeText}
          </span>
        )}
      </div>

      {/* fila inferior descriptiva */}
      <div className="relative z-10 mt-auto pr-28">
        <p className="text-white/95 text-[12px] font-semibold leading-snug drop-shadow-sm line-clamp-1">
          {subtitleText || theme.tagline}
        </p>
        {showToolsFooter && (
          <p className="text-white/75 text-[10px] font-medium mt-0.5 truncate">
            {theme.toolsSummary}
          </p>
        )}
      </div>
    </div>
  );
};
