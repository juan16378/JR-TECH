import { useCallback, useState } from "react";
import { IconCheckCircle, IconSparkles, IconWarning } from "./Icons";

const ESTILOS = {
  exito: {
    icono: IconCheckCircle,
    clase: "border-emerald-400/30 text-emerald-300",
  },
  celebracion: {
    icono: IconSparkles,
    clase: "border-cyan-400/30 text-cyan-300",
  },
  error: {
    icono: IconWarning,
    clase: "border-red-400/30 text-red-300",
  },
  advertencia: {
    icono: IconWarning,
    clase: "border-amber-400/30 text-amber-300",
  },
  info: {
    icono: IconSparkles,
    clase: "border-cyan-400/30 text-cyan-300",
  },
};

/**
 * Hook para disparar notificaciones flotantes ("toasts") con el mismo
 * estilo en todo el sitio, en vez de reimplementar el mismo useState +
 * setTimeout en cada página.
 *
 * Uso:
 *   const { toasts, mostrarToast } = useToasts();
 *   mostrarToast("Guardado con éxito", "exito");
 *   ...
 *   <Toast toasts={toasts} />
 */
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const mostrarToast = useCallback((mensaje, tipo = "exito") => {
    const id = Date.now() + Math.random();
    setToasts((actuales) => [...actuales, { id, mensaje, tipo }]);
    setTimeout(() => {
      setToasts((actuales) => actuales.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return { toasts, mostrarToast };
}

export default function Toast({ toasts }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex flex-col gap-2">
      {toasts.map((toast) => {
        const config = ESTILOS[toast.tipo] || ESTILOS.exito;
        const Icono = config.icono;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-slate-900/95 px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-black/40 backdrop-blur animate-[fadeIn_0.25s_ease-out] ${config.clase}`}
          >
            <Icono className="h-5 w-5 flex-shrink-0" />
            {toast.mensaje}
          </div>
        );
      })}
    </div>
  );
}
