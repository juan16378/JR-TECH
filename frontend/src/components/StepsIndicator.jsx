import { IconCheckCircle } from "./Icons";

const PASOS_RECUPERACION = ["Correo", "Revisa tu correo", "Nueva contraseña"];

/**
 * Indicador de progreso genérico, reutilizable para cualquier flujo de
 * varios pasos (por defecto, el de recuperación de contraseña).
 * `actual`: número de paso en curso (1 = el primero).
 * `pasos`: etiquetas de cada paso, en orden.
 */
function StepsIndicator({ actual = 1, pasos = PASOS_RECUPERACION }) {
  return (
    <div className="mb-2 flex items-start justify-between">
      {pasos.map((etiqueta, indice) => {
        const numero = indice + 1;
        const completado = numero < actual;
        const activo = numero === actual;

        return (
          <div key={etiqueta} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black transition-all duration-500 ${
                  completado
                    ? "border-cyan-400 bg-cyan-400 text-slate-950"
                    : activo
                    ? "border-cyan-400 bg-slate-950 text-cyan-300 shadow-[0_0_0_4px_rgba(34,211,238,0.15)]"
                    : "border-slate-700 bg-slate-900 text-slate-600"
                }`}
              >
                {completado ? <IconCheckCircle className="h-4 w-4" /> : numero}
              </div>

              <span
                className={`mt-1.5 hidden text-center text-[10px] font-bold leading-tight sm:block ${
                  activo
                    ? "text-cyan-300"
                    : completado
                    ? "text-slate-400"
                    : "text-slate-600"
                }`}
                style={{ width: "72px" }}
              >
                {etiqueta}
              </span>
            </div>

            {numero < pasos.length && (
              <div className="mx-1 mt-4 h-[2px] flex-1 overflow-hidden rounded-full bg-slate-800 sm:mt-4">
                <div
                  className={`h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-700 ${
                    completado ? "w-full" : "w-0"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default StepsIndicator;
