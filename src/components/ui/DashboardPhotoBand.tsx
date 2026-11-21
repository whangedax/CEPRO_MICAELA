import type { ReactNode } from 'react';

type DashboardScene = 'direccion' | 'secretaria' | 'docente' | 'indicadores'
  | 'supervision' | 'archivo' | 'pedagogia' | 'aulas' | 'tramites';

type ModuleScene = 'transferencia' | 'calendario' | 'evaluacion' | 'inscripcion';

const moduleScenes: ReadonlySet<string> = new Set<ModuleScene>([
  'transferencia', 'calendario', 'evaluacion', 'inscripcion',
]);

interface DashboardPhotoBandProps {
  scene: DashboardScene | ModuleScene;
  children: ReactNode;
  as?: 'header' | 'div';
  variant?: 'hero' | 'section' | 'embedded' | 'stacked';
  className?: string;
  contentClassName?: string;
}

export function DashboardPhotoBand({
  scene, children, as: Element = 'div', variant = 'section', className = '', contentClassName = '',
}: DashboardPhotoBandProps) {
  const hero = variant === 'hero';
  const stacked = variant === 'stacked';
  const frame = variant === 'embedded' ? 'border-b' : 'rounded-2xl border';
  const columns = stacked ? '' : 'sm:grid-cols-[minmax(0,1fr)_minmax(112px,27%)]';
  const photo = `${import.meta.env.BASE_URL}images/${moduleScenes.has(scene) ? 'modules' : 'dashboard'}/${scene}.webp`;

  return (
    <Element data-dashboard-scene={scene} className={`grid min-w-0 grid-cols-[minmax(0,1fr)] overflow-hidden border-line bg-surface shadow-[var(--ui-shadow)] ${columns} ${frame} print:block ${className}`}>
      <div className={`min-w-0 break-words [&>*]:max-w-full [&_h1]:break-words [&_h1]:text-balance [&_h1]:text-2xl [&_h1]:leading-tight sm:[&_h1]:text-3xl [&_h1.truncate]:whitespace-normal [&_h1.truncate]:overflow-visible ${hero ? 'p-5 lg:p-7' : 'p-5 sm:p-6'} ${contentClassName}`}>
        {children}
      </div>
      <div aria-hidden="true" className={`relative isolate overflow-hidden bg-brand-soft print:hidden ${stacked ? 'h-24' : hero ? 'h-24 sm:h-auto sm:min-h-40' : 'h-20 sm:h-auto sm:min-h-28'}`}>
        <img src={photo} alt="" width={960} height={540} loading={hero ? 'eager' : 'lazy'} decoding="async"
          className="absolute inset-0 size-full object-cover" onError={event => { event.currentTarget.hidden = true; }} />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/25 via-transparent to-transparent sm:bg-gradient-to-r sm:from-surface/25" />
      </div>
    </Element>
  );
}
