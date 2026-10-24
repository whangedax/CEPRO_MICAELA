/**
 * components/ui/PdfViewer.tsx
 * 
 * Visor integrado de documentos PDF institucionales para CEPRO_MICAELA 2.0.
 * Utiliza pdfjs-dist local sin CDNs externas, con aceleración en canvas,
 * controles de paginación, zoom fluido, ajuste al ancho y descarga segura.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configurar el worker local empaquetado por Vite
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface PdfViewerProps {
  blob: Blob | null;
  filename?: string;
  title?: string;
  isDemo?: boolean;
  isDraft?: boolean;
  isComplete?: boolean;
  onClose?: () => void;
  extraControls?: React.ReactNode;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  blob,
  filename = 'documento_institucional.pdf',
  title = 'Vista Previa del Documento',
  isDemo = false,
  isDraft = false,
  isComplete = false,
  onClose,
  extraControls,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [zoomMode, setZoomMode] = useState<'fit' | number>('fit');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Referencia a la tarea de renderizado en curso para poder cancelarla si cambia la página/zoom
  const currentRenderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // Crear y limpiar ObjectURL
  useEffect(() => {
    if (!blob) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  // Cargar documento PDF desde el Blob
  useEffect(() => {
    if (!blob) {
      setPdfDoc(null);
      setNumPages(1);
      setCurrentPage(1);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          useSystemFonts: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setIsLoading(false);
      } catch (err: unknown) {
        if (isCancelled) return;
        const msg = err instanceof Error ? err.message : 'No se pudo procesar el archivo PDF';
        setError(`Error al cargar el documento: ${msg}`);
        setIsLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [blob]);

  // Renderizar la página actual en el canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    // Cancelar renderizado anterior si está pendiente
    if (currentRenderTaskRef.current) {
      try {
        currentRenderTaskRef.current.cancel();
      } catch {
        // Ignorar cancelación previa
      }
      currentRenderTaskRef.current = null;
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const unscaledViewport = page.getViewport({ scale: 1 });
      const containerWidth = Math.max(320, container.clientWidth - 48); // margen interno

      let scale = 1;
      if (zoomMode === 'fit') {
        scale = containerWidth / unscaledViewport.width;
      } else {
        scale = (containerWidth / unscaledViewport.width) * zoomMode;
      }

      // Soporte para pantallas HiDPI (Retina)
      const pixelRatio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale });

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);

      const renderContext = {
        canvasContext: ctx,
        viewport,
        canvas,
      };

      const task = page.render(renderContext);
      currentRenderTaskRef.current = task;
      await task.promise;
      ctx.restore();
    } catch (err: unknown) {
      // Ignorar cancelaciones intencionales de renderizado
      if (err && typeof err === 'object' && 'name' in err && err.name === 'RenderingCancelledException') {
        return;
      }
      console.warn('Error durante el renderizado del canvas PDF:', err);
    }
  }, [pdfDoc, currentPage, zoomMode]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Re-renderizar ante redimensionamiento de ventana
  useEffect(() => {
    if (zoomMode !== 'fit') return;
    const handleResize = () => {
      renderCurrentPage();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoomMode, renderCurrentPage]);

  // Descargar el archivo PDF localmente
  const handleDownload = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // Abrir en nueva pestaña
  const handleOpenNewTab = () => {
    if (!objectUrl) return;
    window.open(objectUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden flex flex-col animate-in fade-in duration-200">
      {/* 1. Barra de herramientas superior del visor */}
      <div className="bg-[#13594A] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold truncate tracking-tight text-white">{title}</h3>
            <span className="text-[10px] text-emerald-200/80 font-mono block truncate">{filename}</span>
          </div>
          {isDemo ? (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wider shrink-0">
              Demo / Sin Validez
            </span>
          ) : isDraft ? (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-400 text-rose-950 uppercase tracking-wider shrink-0">
              Borrador / No Oficial
            </span>
          ) : isComplete ? (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-emerald-950 uppercase tracking-wider shrink-0">
              Completo / Preliminar
            </span>
          ) : null}
        </div>

        {/* Acciones de la barra */}
        <div className="flex items-center gap-2 shrink-0">
          {extraControls}

          <button
            type="button"
            onClick={handleDownload}
            disabled={!blob || isLoading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50 ${
              isDemo
                ? 'bg-amber-300 text-amber-950 hover:bg-amber-200 focus-visible:ring-amber-400'
                : isDraft
                ? 'bg-rose-100 text-rose-900 hover:bg-rose-200 focus-visible:ring-rose-400'
                : 'bg-white text-[#13594A] hover:bg-emerald-50 focus-visible:ring-white'
            }`}
            title="Descargar este archivo PDF a su equipo"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>
              {isDemo
                ? 'Descargar documento de demostración'
                : isDraft
                ? 'Descargar borrador de trabajo'
                : 'Descargar documento preliminar'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewTab}
            disabled={!objectUrl || isLoading}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
            title="Abrir en pestaña nueva del navegador"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              title="Cerrar vista previa"
              aria-label="Cerrar vista previa"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Banner de estado reglamentario según modo y preflight */}
      {isDemo ? (
        <div className="bg-amber-500/10 border-b border-amber-300 px-4 py-2 flex items-center justify-between text-xs text-amber-950 font-medium select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <strong className="font-bold">Datos simulados. Sin validez oficial.</strong>
            <span className="hidden sm:inline text-amber-800">· Documento generado con marcas de agua de demostración</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-950 uppercase tracking-wider shrink-0">
            Modo Demostración
          </span>
        </div>
      ) : isDraft ? (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center justify-between text-xs text-rose-950 font-medium select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <strong className="font-bold">Documento incompleto. Sin validez oficial.</strong>
            <span className="hidden sm:inline text-rose-800">· Parámetros académicos pendientes de registrar en preflight</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-950 uppercase tracking-wider shrink-0">
            Borrador de Trabajo
          </span>
        </div>
      ) : isComplete ? (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-xs text-emerald-950 font-medium select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
            <strong className="font-bold">Datos completos confirmados por el backend.</strong>
            <span className="hidden sm:inline text-emerald-800">· Documento preliminar preparado (entrega oficial formal pendiente)</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-950 uppercase tracking-wider shrink-0">
            Completo / No Entregado
          </span>
        </div>
      ) : null}

      {/* 2. Controles de navegación de página y zoom */}
      <div className="bg-[#F6F8FA] border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
        {/* Controles de página */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-prev
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || isLoading}
            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>

          <span data-page className="px-2.5 py-1 font-mono font-bold text-slate-800 bg-slate-200/60 rounded-lg">
            Página {currentPage} de {numPages}
          </span>

          <button
            type="button"
            data-next
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages || isLoading}
            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente →
          </button>
        </div>

        {/* Controles de zoom */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px]">
            <span>Zoom:</span>
            <select
              data-zoom
              value={zoomMode === 'fit' ? 'fit' : String(zoomMode)}
              onChange={(e) => {
                const val = e.target.value;
                setZoomMode(val === 'fit' ? 'fit' : Number(val));
              }}
              className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#13594A]"
            >
              <option value="fit">Ajustar ancho</option>
              <option value="1">100%</option>
              <option value="1.25">125%</option>
              <option value="1.5">150%</option>
              <option value="2">200%</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              if (zoomMode === 'fit') setZoomMode(1.25);
              else setZoomMode((z) => Math.min(2.5, (typeof z === 'number' ? z : 1) + 0.25));
            }}
            className="w-7 h-7 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center transition-colors"
            title="Aumentar zoom"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => {
              if (zoomMode === 'fit') setZoomMode(0.75);
              else setZoomMode((z) => Math.max(0.5, (typeof z === 'number' ? z : 1) - 0.25));
            }}
            className="w-7 h-7 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center transition-colors"
            title="Disminuir zoom"
          >
            -
          </button>
        </div>
      </div>

      {/* 3. Escenario de visualización con canvas */}
      <div
        ref={containerRef}
        className="relative bg-slate-200/70 p-4 sm:p-6 overflow-auto max-h-[750px] min-h-[380px] flex items-center justify-center"
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#13594A]/20 border-t-[#13594A] rounded-full animate-spin mb-2" />
            <span className="text-xs font-bold text-slate-700">Procesando páginas del PDF…</span>
          </div>
        )}

        {error && (
          <div className="p-6 text-center max-w-md bg-white rounded-2xl border border-rose-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-xs font-bold text-rose-900">{error}</p>
            <p className="text-[11px] text-slate-500 mt-1">Verifique que el backend esté activo y los parámetros sean válidos.</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          aria-label="Vista previa del documento institucional oficial"
          className="bg-white shadow-xl rounded-sm mx-auto transition-all"
        />
      </div>

      {/* 4. Pie con aviso institucional */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>Renderizado con motor PDF institucional oficial CEPRO_MICAELA 2.0</span>
        {isDemo ? (
          <span className="text-amber-800 font-semibold">
            Modo Demostración activo: Datos simulados. Sin validez oficial.
          </span>
        ) : isDraft ? (
          <span className="text-rose-800 font-semibold">
            Borrador de trabajo: Documento incompleto. Sin validez oficial.
          </span>
        ) : (
          <span className="text-emerald-800 font-semibold">
            Verificación completada · Listo para revisión preliminar
          </span>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
