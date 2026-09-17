import { useEffect, useRef, useState } from "react";
import { IconSend, IconX } from "./Icons";

// ==========================================
// Panel de hilo de conversación de una PQR — compartido entre la bandeja
// Kanban del Admin/Empleado (GestionPQR.jsx) y la pestaña "PQR" del cliente
// (Perfil.jsx). Se muestra como un panel deslizante desde la derecha con
// burbujas de chat, igual de un lado que del otro; lo único que cambia es
// `vistaComo`, que decide qué mensajes se alinean a la derecha ("los
// míos") y cuáles a la izquierda.
// ==========================================

const ESTADOS = ["Abierta", "En proceso", "Cerrada"];

function colorEstado(estado) {
    switch (estado) {
        case "Cerrada":
            return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
        case "En proceso":
            return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
        default:
            return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    }
}

function formatearHora(fecha) {
    if (!fecha) return "";
    try {
        return new Date(fecha).toLocaleString("es-CO", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "";
    }
}

function HiloPQR({
    pqr,
    vistaComo,
    onCerrar,
    onEnviarMensaje,
    enviando,
    onCambiarEstado,
    cambiandoEstado,
}) {
    const [texto, setTexto] = useState("");
    const finRef = useRef(null);

    useEffect(() => {
        finRef.current?.scrollIntoView({ block: "nearest" });
    }, [pqr?.mensajes?.length]);

    useEffect(() => {
        setTexto("");
    }, [pqr?.id]);

    if (!pqr) return null;

    // Una PQR "Cerrada" ya no admite mensajes nuevos de nadie (ni cliente
    // ni equipo): hay que reabrirla explícitamente desde el tablero antes
    // de poder seguir la conversación. El backend rechaza el POST igual,
    // esto solo evita el viaje de red y deja claro por qué está bloqueado.
    const cerrada = pqr.estado === "Cerrada";

    const enviar = async () => {
        const limpio = texto.trim();
        if (!limpio || enviando || cerrada) return;
        await onEnviarMensaje(limpio);
        setTexto("");
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            enviar();
        }
    };

    return (
        <div className="fixed inset-0 z-[130] flex justify-end bg-slate-950/70 backdrop-blur-sm" onClick={onCerrar}>
            <div
                className="flex h-full w-full max-w-md flex-col border-l border-slate-700/70 bg-[#0b1120] shadow-2xl animate-[slideInRight_0.25s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ENCABEZADO */}
                <div className="border-b border-slate-800 p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-300">
                                {pqr.tipo}
                            </span>
                            <h3 className="mt-2 truncate font-black text-white">{pqr.asunto}</h3>
                            {vistaComo === "equipo" && (
                                <p className="mt-0.5 truncate text-xs text-slate-400">
                                    {pqr.usuario
                                        ? `${pqr.usuario.nombre} ${pqr.usuario.apellido} · ${pqr.usuario.correo}`
                                        : "Usuario eliminado"}
                                </p>
                            )}
                        </div>

                        <button
                            onClick={onCerrar}
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white"
                            aria-label="Cerrar"
                        >
                            <IconX className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-3">
                        {onCambiarEstado ? (
                            <select
                                value={pqr.estado}
                                disabled={cambiandoEstado}
                                onChange={(e) => onCambiarEstado(pqr, e.target.value)}
                                className={`rounded-full border px-3 py-1 text-xs font-bold outline-none disabled:opacity-50 ${colorEstado(
                                    pqr.estado
                                )}`}
                            >
                                {ESTADOS.map((estado) => (
                                    <option key={estado} value={estado} className="bg-slate-900 text-white">
                                        {estado}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${colorEstado(pqr.estado)}`}>
                                {pqr.estado}
                            </span>
                        )}
                    </div>
                </div>

                {/* HILO */}
                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                    {(pqr.mensajes || []).length === 0 && (
                        <p className="text-center text-sm text-slate-500">Sin mensajes todavía.</p>
                    )}

                    {(pqr.mensajes || []).map((mensaje, idx) => {
                        const esPropio = mensaje.autor === vistaComo;
                        return (
                            <div key={idx} className={`flex ${esPropio ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] ${esPropio ? "items-end" : "items-start"} flex flex-col`}>
                                    <div
                                        className={`rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                                            esPropio
                                                ? "rounded-br-sm bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950"
                                                : "rounded-bl-sm border border-slate-800 bg-slate-900 text-slate-200"
                                        }`}
                                    >
                                        {mensaje.texto}
                                    </div>
                                    <span className="mt-1 px-1 text-[10px] font-semibold text-slate-500">
                                        {mensaje.autor === "equipo" ? "JR TECH" : mensaje.nombre || "Cliente"}
                                        {" · "}
                                        {formatearHora(mensaje.fecha)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={finRef} />
                </div>

                {/* CAJA DE RESPUESTA */}
                <div className="border-t border-slate-800 p-4">
                    {cerrada && (
                        <p className="mb-2 text-center text-[11px] text-slate-500">
                            {vistaComo === "cliente"
                                ? "Este caso está cerrado y ya no admite mensajes. Si necesitas algo más, radica una nueva PQR."
                                : "Este caso está cerrado. Reábrelo desde el tablero para poder seguir escribiendo."}
                        </p>
                    )}
                    <div className="flex items-end gap-2">
                        <textarea
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={enviando || cerrada}
                            rows={1}
                            placeholder={
                                cerrada
                                    ? "Este caso está cerrado"
                                    : vistaComo === "equipo"
                                    ? "Escribe tu respuesta..."
                                    : "Escribe tu mensaje..."
                            }
                            className="max-h-28 flex-1 resize-none rounded-xl border border-slate-700/70 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/60 disabled:opacity-60"
                        />
                        <button
                            onClick={enviar}
                            disabled={!texto.trim() || enviando || cerrada}
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 transition hover:-translate-y-0.5 disabled:opacity-50"
                            aria-label="Enviar"
                        >
                            <IconSend className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HiloPQR;
