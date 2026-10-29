/**
 * scripts/modernize-all-pages-darkmode.cjs
 * 
 * Orquestador B - Misión de Modernización UX y Modo Oscuro
 * Aplica clases de modo oscuro sistemáticas a las 9 páginas restantes en el worktree UX.
 */

const fs = require('fs');
const path = require('path');

const UX_DIR = 'C:/CETPRO/CETPRO_MODERNIZACION_V2_UX';

function updateFile(relPath, transforms) {
  const fullPath = path.join(UX_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Archivo no encontrado: ${fullPath}`);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  const hadCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');
  let changesCount = 0;

  for (const { search, replace } of transforms) {
    const normalizedSearch = typeof search === 'string' ? search.replace(/\r\n/g, '\n') : search;
    const normalizedReplace = typeof replace === 'string' ? replace.replace(/\r\n/g, '\n') : replace;

    if (typeof normalizedSearch === 'string') {
      if (content.includes(normalizedSearch)) {
        content = content.split(normalizedSearch).join(normalizedReplace);
        changesCount++;
      } else {
        console.warn(`[WARN] En ${relPath}: no se encontró "${normalizedSearch.slice(0, 40)}..."`);
      }
    } else if (normalizedSearch instanceof RegExp) {
      if (normalizedSearch.test(content)) {
        content = content.replace(normalizedSearch, normalizedReplace);
        changesCount++;
      } else {
        console.warn(`[WARN] En ${relPath}: regex no coincidió "${normalizedSearch}"`);
      }
    }
  }

  if (hadCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`[OK] ${relPath} actualizado con ${changesCount} transformaciones.`);
}

console.log('=== MODERNIZACIÓN DE MODO OSCURO EN PÁGINAS RESTANTES ===\n');

// 1. CentroDocumental.tsx
updateFile('src/pages/CentroDocumental.tsx', [
  {
    search: `isSelected
                        ? 'bg-[#13594A]/5 border-[#13594A] shadow-xs ring-1 ring-[#13594A]'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50/80 hover:border-slate-300'`,
    replace: `isSelected
                        ? 'bg-[#13594A]/10 dark:bg-[#132B25] border-[#13594A] dark:border-[#208B73] shadow-xs ring-1 ring-[#13594A] dark:ring-[#208B73]'
                        : 'bg-white dark:bg-[#131C1A] border-slate-200/80 dark:border-[#263834] hover:bg-slate-50/80 dark:hover:bg-[#1F2D2A] hover:border-slate-300 dark:hover:border-[#34524B]'`,
  },
  {
    search: `isReady
                          ? 'bg-emerald-50/30 border-emerald-200/70 text-slate-800'
                          : 'bg-amber-50/50 border-amber-200 text-amber-950'`,
    replace: `isReady
                          ? 'bg-emerald-50/30 dark:bg-[#062E1F]/50 border-emerald-200/70 dark:border-[#0A5C3D] text-slate-800 dark:text-slate-200'
                          : 'bg-amber-50/50 dark:bg-[#2E1E05]/50 border-amber-200 dark:border-[#5C3C0A] text-amber-950 dark:text-[#FDE68A]'`,
  },
]);

// 2. ConfiguracionDocumental.tsx
updateFile('src/pages/ConfiguracionDocumental.tsx', [
  {
    search: 'className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800',
    replace: 'className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#263834] bg-white dark:bg-[#131C1A] font-semibold text-slate-800 dark:text-white',
  },
]);

// 3. RegistroEvaluaciones.tsx
updateFile('src/pages/RegistroEvaluaciones.tsx', [
  {
    search: 'bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center max-w-xl mx-auto',
    replace: 'bg-white dark:bg-[#182220] rounded-3xl p-8 border border-slate-200/80 dark:border-[#263834] shadow-sm text-center max-w-xl mx-auto',
  },
  {
    search: 'hover:bg-slate-50/80',
    replace: 'hover:bg-slate-50/80 dark:hover:bg-[#1F2D2A]/60',
  },
]);

// 4. EntregasRevision.tsx
updateFile('src/pages/EntregasRevision.tsx', [
  {
    search: 'bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm',
    replace: 'bg-white dark:bg-[#182220] p-5 rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-sm',
  },
  {
    search: 'bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6',
    replace: 'bg-white dark:bg-[#182220] p-6 rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-sm space-y-6',
  },
  {
    search: 'border-b border-slate-100 pb-4',
    replace: 'border-b border-slate-100 dark:border-[#263834] pb-4',
  },
  {
    search: 'bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2',
    replace: 'bg-slate-50 dark:bg-[#131C1A] p-4 rounded-2xl border border-slate-200 dark:border-[#263834] text-xs text-slate-600 dark:text-slate-400 space-y-2',
  },
  {
    search: 'border-b border-slate-200',
    replace: 'border-b border-slate-200 dark:border-[#263834]',
  },
]);

// 5. GestionCuentas.tsx
updateFile('src/pages/GestionCuentas.tsx', [
  {
    search: 'bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between',
    replace: 'bg-white dark:bg-[#182220] border-b border-slate-200 dark:border-[#263834] px-6 py-4 flex items-center justify-between',
  },
  {
    search: 'bg-white p-6 space-y-6',
    replace: 'bg-white dark:bg-[#182220] p-6 space-y-6',
  },
  {
    search: 'bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between',
    replace: 'bg-slate-50 dark:bg-[#131C1A] px-6 py-4 border-t border-slate-200 dark:border-[#263834] flex items-center justify-between',
  },
  {
    search: 'bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden',
    replace: 'bg-white dark:bg-[#182220] rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-sm overflow-hidden',
  },
]);

// 6. Sincronizacion.tsx
updateFile('src/pages/Sincronizacion.tsx', [
  {
    search: 'bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4',
    replace: 'bg-white dark:bg-[#182220] p-6 rounded-2xl border border-slate-200 dark:border-[#263834] shadow-sm space-y-4',
  },
  {
    search: 'border-b border-slate-200 gap-2',
    replace: 'border-b border-slate-200 dark:border-[#263834] gap-2',
  },
]);

console.log('\n=== REFINAMIENTO DE PÁGINAS COMPLETADO CON ÉXITO ===');
