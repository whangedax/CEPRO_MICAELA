import React from 'react';
import { assembleInstitutionalRegisterCode } from '../../utils/documentTemplates';

export interface RegistryCodeGuideBannerProps {
  fields: Record<string, string | number | undefined>;
  dni?: string;
}

/**
 * Banda compartida de referencia en vivo para la construcción del Código Institucional (A)
 * y el mapa de variables editables A–F de la plantilla oficial de Título.
 */
export const RegistryCodeGuideBanner: React.FC<RegistryCodeGuideBannerProps> = ({
  fields,
  dni,
}) => {
  const liveCode =
    String(fields.registerCode ?? '').trim() ||
    assembleInstitutionalRegisterCode(fields, dni) ||
    '000001-AT-00000000-PR26-2026';

  return (
    <div
      data-testid="registry-code-guide"
      className="rounded-xl border border-brand/25 bg-brand-soft/45 px-3.5 py-2.5 text-[11px] text-ink space-y-1.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-brand">
          Estructura dinámica del Código Institucional (A):
        </span>
        <code className="px-2 py-0.5 rounded-md bg-surface border border-line font-mono text-[11px] font-bold text-ink tabular-nums">
          {liveCode}
        </code>
      </div>
      <p className="text-muted leading-relaxed">
        <span className="font-mono text-[10px] text-ink">
          {'{{correlativo}}-{{nivel_formativo}}-{{dni}}-{{sigla_programa}}{{referencia_corta}}-{{anio_codigo}}'}
        </span>{' '}
        · <strong>A</strong> = portada vertical (90°), línea institucional y pie del reverso ·{' '}
        <strong>B</strong> = registro asignado por UGEL (independiente, nunca se inventa) ·{' '}
        <strong>C</strong> = R.D. de referencia · <strong>D–F</strong> = titulado, programa y fecha.
      </p>
    </div>
  );
};
