import { useCallback, useRef, useState } from "react";
import { IconTrash, IconWarning } from "./Icons";

/**
 * Reemplazo de window.confirm() con un modal propio, con el mismo estilo
 * del resto del sitio.
 *
 * Uso:
 *   const { confirmar, ConfirmDialogHost } = useConfirm();
 *   ...
 *   const ok = await confirmar({
 *     titulo: "Eliminar producto",
 *     mensaje: `¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`,
 *     peligro: true,
 *   });
 *   if (!ok) return;
 *   ...
 *   return <main>...<ConfirmDialogHost /></main>
 */
export function useConfirm() {
  const [estado, setEstado] = useState(null); // null | { titulo, mensaje, ... }
  const resolverRef = useRef(null);

  const confirmar = useCallback((opciones) => {
    setEstado(opciones);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const cerrar = useCallback((resultado) => {
    setEstado(null);
    if (resolverRef.current) {
      resolverRef.current(resultado);
      resolverRef.current = null;
    }
  }, []);

  const ConfirmDialogHost = useCallback(
    () => (
      <ConfirmDialog
        abierto={!!estado}
        titulo={estado?.titulo}
        mensaje={estado?.mensaje}
        confirmarTexto={estado?.confirmarTexto}
        cancelarTexto={estado?.cancelarTexto}
        peligro={estado?.peligro}
        onConfirmar={() => cerrar(true)}
        onCancelar={() => cerrar(false)}
      />
    ),
    [estado, cerrar]
  );

  return { confirmar, ConfirmDialogHost };
}

function ConfirmDialog({
  abierto,
  titulo = "¿Estás seguro?",
  mensaje,
  confirmarTexto = "Confirmar",
  cancelarTexto = "Cancelar",
  peligro = false,
  onConfirmar,
  onCancelar,
}) {
  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={onCancelar}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <div className="p-6">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full ${
              peligro
                ? "bg-red-500/15 text-red-400 ring-1 ring-red-400/30"
                : "bg-cyan-400/15 text-cyan-400 ring-1 ring-cyan-400/30"
            }`}
          >
            {peligro ? <IconTrash className="h-5 w-5" /> : <IconWarning className="h-5 w-5" />}
          </div>

          <h2 className="mt-4 text-lg font-black text-white">{titulo}</h2>

          {mensaje && (
            <p className="mt-2 text-sm leading-6 text-slate-400">{mensaje}</p>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 transition-all hover:border-slate-500 hover:text-white"
          >
            {cancelarTexto}
          </button>

          <button
            type="button"
            onClick={onConfirmar}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-black transition-all ${
              peligro
                ? "bg-red-500 text-white hover:bg-red-400"
                : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            }`}
          >
            {confirmarTexto}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
