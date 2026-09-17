import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import PanelLayout from "./PanelLayout";
import HiloPQR from "./HiloPQR";
import Toast, { useToasts } from "./Toast";
import {
    IconChartBar,
    IconChat,
    IconCheckCircle,
    IconClipboard,
    IconGripVertical,
    IconRefresh,
    IconSearch,
    IconWarning,
} from "./Icons";

import { API_URL } from "../config";
const TIPOS = ["Petición", "Queja", "Reclamo"];

// Una columna por estado — arrastrar una tarjeta entre columnas es lo que
// dispara el cambio de estado (PATCH /api/pqr/{id}/estado).
const COLUMNAS = [
    { estado: "Abierta", titulo: "Abiertas", color: "amber", icono: IconClipboard },
    { estado: "En proceso", titulo: "En proceso", color: "cyan", icono: IconRefresh },
    { estado: "Cerrada", titulo: "Cerradas", color: "emerald", icono: IconCheckCircle },
];

// Clases completas y literales por color (Tailwind necesita verlas escritas
// tal cual para generarlas), un poco más elaboradas que un simple borde: una
// franja de degradado arriba de cada columna, un fondo tenue del mismo color
// y una insignia con ícono, para que cada estado se distinga de un vistazo.
const ESTILOS_COLUMNA = {
    amber: {
        header: "border-amber-400/30 bg-amber-400/10 text-amber-300",
        badge: "border-amber-400/30 bg-amber-400/10 text-amber-300",
        topbar: "from-amber-400 to-orange-400",
        wash: "from-amber-400/[0.05]",
        dropActivo: "border-amber-400/60 bg-amber-400/[0.06]",
    },
    cyan: {
        header: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
        badge: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
        topbar: "from-cyan-400 to-blue-500",
        wash: "from-cyan-400/[0.05]",
        dropActivo: "border-cyan-400/60 bg-cyan-400/[0.06]",
    },
    emerald: {
        header: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        topbar: "from-emerald-400 to-teal-500",
        wash: "from-emerald-400/[0.05]",
        dropActivo: "border-emerald-400/60 bg-emerald-400/[0.06]",
    },
};

// Por tipo de caso: una insignia de color más una franja a la izquierda de
// la tarjeta, para que un Reclamo se note incluso si no se lee la insignia.
const ESTILO_TIPO = {
    Petición: { badge: "border-blue-400/30 bg-blue-400/10 text-blue-300", accent: "border-l-blue-400/70" },
    Queja: { badge: "border-orange-400/30 bg-orange-400/10 text-orange-300", accent: "border-l-orange-400/70" },
    Reclamo: { badge: "border-red-400/30 bg-red-400/10 text-red-300", accent: "border-l-red-400/70" },
};
const ESTILO_TIPO_DEFECTO = { badge: "border-slate-600 bg-slate-800 text-slate-300", accent: "border-l-slate-600/70" };

// Iniciales del cliente para el avatar circular de cada tarjeta.
function obtenerIniciales(usuario) {
    if (!usuario) return "?";
    const n = (usuario.nombre || "").trim().charAt(0);
    const a = (usuario.apellido || "").trim().charAt(0);
    return (n + a).toUpperCase() || "?";
}

function formatearFechaRelativa(fecha) {
    if (!fecha) return "—";
    const ahora = Date.now();
    const entonces = new Date(fecha).getTime();
    const diffMin = Math.round((ahora - entonces) / 60000);

    if (diffMin < 1) return "ahora";
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `hace ${diffH} h`;
    const diffD = Math.round(diffH / 24);
    if (diffD < 7) return `hace ${diffD} d`;
    return new Date(fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function GestionPQR() {
    const navigate = useNavigate();

    const usuarioGuardado =
        localStorage.getItem("usuario") || sessionStorage.getItem("usuario");
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
    const rol = usuario?.rol === "Empleado" ? "Empleado" : "Administrador";

    const [registros, setRegistros] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("Todos");

    const [pqrArrastrada, setPqrArrastrada] = useState(null);
    const [columnaHover, setColumnaHover] = useState(null);
    const [moviendoId, setMoviendoId] = useState(null);

    const [pqrSeleccionada, setPqrSeleccionada] = useState(null);
    const [enviandoMensaje, setEnviandoMensaje] = useState(false);

    const { toasts, mostrarToast } = useToasts();

    const obtenerToken = () =>
        localStorage.getItem("token") || sessionStorage.getItem("token");

    const headersAuth = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${obtenerToken()}`,
    });

    const cargarPqr = async () => {
        setCargando(true);
        setError("");

        try {
            const respuesta = await fetch(`${API_URL}/pqr`, {
                headers: headersAuth(),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (respuesta.status === 401 || respuesta.status === 403) {
                navigate("/login");
                return;
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudieron cargar las PQR.");
            }

            setRegistros(Array.isArray(datos.pqr) ? datos.pqr : []);
        } catch (err) {
            console.error("❌ Error al cargar PQR:", err);
            setError(err.message || "No se pudieron cargar las PQR.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarPqr();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Mantiene el panel lateral sincronizado si la PQR abierta cambia por
    // otra vía (p. ej. se actualiza la lista tras enviar un mensaje).
    useEffect(() => {
        if (!pqrSeleccionada) return;
        const actualizada = registros.find((r) => r.id === pqrSeleccionada.id);
        if (actualizada) setPqrSeleccionada(actualizada);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registros]);

    const estadisticas = useMemo(() => {
        const total = registros.length;
        const abiertas = registros.filter((r) => r.estado === "Abierta").length;
        const enProceso = registros.filter((r) => r.estado === "En proceso").length;
        const cerradas = registros.filter((r) => r.estado === "Cerrada").length;
        return { total, abiertas, enProceso, cerradas };
    }, [registros]);

    const registrosFiltrados = registros.filter((r) => {
        const coincideTipo = filtroTipo === "Todos" || r.tipo === filtroTipo;

        const texto = busqueda.trim().toLowerCase();
        const coincideBusqueda =
            !texto ||
            r.asunto?.toLowerCase().includes(texto) ||
            r.usuario?.nombre?.toLowerCase().includes(texto) ||
            r.usuario?.apellido?.toLowerCase().includes(texto) ||
            r.usuario?.correo?.toLowerCase().includes(texto);

        return coincideTipo && coincideBusqueda;
    });

    const columnasConDatos = useMemo(() => {
        return COLUMNAS.map((columna) => ({
            ...columna,
            items: registrosFiltrados.filter((r) => r.estado === columna.estado),
        }));
    }, [registrosFiltrados]);

    // ==========================================
    // CAMBIAR ESTADO (drag & drop nativo HTML5, sin librerías)
    // ==========================================

    const cambiarEstado = async (pqr, nuevoEstado) => {
        if (!pqr || nuevoEstado === pqr.estado) return;

        setMoviendoId(pqr.id);
        try {
            const respuesta = await fetch(`${API_URL}/pqr/${pqr.id}/estado`, {
                method: "PATCH",
                headers: headersAuth(),
                body: JSON.stringify({ estado: nuevoEstado }),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudo actualizar el estado.");
            }

            setRegistros((prev) => prev.map((r) => (r.id === pqr.id ? datos.pqr : r)));
        } catch (err) {
            console.error("❌ Error al cambiar el estado de la PQR:", err);
            mostrarToast(err.message || "No se pudo actualizar el estado.", "error");
        } finally {
            setMoviendoId(null);
        }
    };

    const alSoltar = (columna) => {
        setColumnaHover(null);
        if (pqrArrastrada) cambiarEstado(pqrArrastrada, columna.estado);
        setPqrArrastrada(null);
    };

    // ==========================================
    // HILO DE CHAT (panel lateral)
    // ==========================================

    const enviarMensaje = async (texto) => {
        if (!pqrSeleccionada) return;

        setEnviandoMensaje(true);
        try {
            const respuesta = await fetch(`${API_URL}/pqr/${pqrSeleccionada.id}/mensajes`, {
                method: "POST",
                headers: headersAuth(),
                body: JSON.stringify({ texto }),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudo enviar el mensaje.");
            }

            setRegistros((prev) => prev.map((r) => (r.id === pqrSeleccionada.id ? datos.pqr : r)));
        } catch (err) {
            console.error("❌ Error al enviar el mensaje:", err);
            mostrarToast(err.message || "No se pudo enviar el mensaje.", "error");
        } finally {
            setEnviandoMensaje(false);
        }
    };

    return (
        <PanelLayout rol={rol} seccionActiva="pqr" subtitulo="Gestión de PQR">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">

                {/* ENCABEZADO */}

                <header className="overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-[#0b1120] to-slate-900/70 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] sm:p-8">
                    <div className="flex items-start gap-4">
                        <span className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300 sm:flex">
                            <IconChat className="h-6 w-6" />
                        </span>
                        <div>
                            <h1 className="flex items-center gap-2 text-2xl font-black text-white sm:text-3xl">
                                <IconChat className="h-6 w-6 text-amber-300 sm:hidden" />
                                Gestión de PQR
                            </h1>
                            <p className="mt-1 text-sm text-slate-400">
                                Arrastra una tarjeta entre columnas para cambiar su estado, o haz clic para abrir la conversación.
                            </p>
                        </div>
                    </div>

                    {/* ESTADÍSTICAS */}
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total</p>
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-700/40 text-slate-300">
                                    <IconChartBar className="h-3.5 w-3.5" />
                                </span>
                            </div>
                            <p className="mt-2 text-3xl font-black text-white">{estadisticas.total}</p>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 to-orange-400/5 p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wide text-amber-300/80">Abiertas</p>
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
                                    <IconClipboard className="h-3.5 w-3.5" />
                                </span>
                            </div>
                            <p className="mt-2 text-3xl font-black text-amber-300">{estadisticas.abiertas}</p>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-blue-500/5 p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wide text-cyan-300/80">En proceso</p>
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300">
                                    <IconRefresh className="h-3.5 w-3.5" />
                                </span>
                            </div>
                            <p className="mt-2 text-3xl font-black text-cyan-300">{estadisticas.enProceso}</p>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-teal-500/5 p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wide text-emerald-300/80">Cerradas</p>
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
                                    <IconCheckCircle className="h-3.5 w-3.5" />
                                </span>
                            </div>
                            <p className="mt-2 text-3xl font-black text-emerald-300">{estadisticas.cerradas}</p>
                        </div>
                    </div>
                </header>

                {/* FILTROS */}
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por asunto, cliente o correo..."
                            className="w-full rounded-xl border border-slate-700/70 bg-slate-950/50 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-cyan-400/60"
                        />
                    </div>

                    <select
                        value={filtroTipo}
                        onChange={(e) => setFiltroTipo(e.target.value)}
                        className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/60"
                    >
                        <option value="Todos">Todos los tipos</option>
                        {TIPOS.map((tipo) => (
                            <option key={tipo} value={tipo}>
                                {tipo}
                            </option>
                        ))}
                    </select>
                </div>

                {cargando && (
                    <div className="grid gap-4 overflow-x-auto pb-2 sm:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, columna) => (
                            <div
                                key={columna}
                                className="flex flex-col gap-3 rounded-2xl border border-slate-700/70 bg-[#0b1120]/95 p-3"
                            >
                                <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                                {Array.from({ length: 3 }).map((__, tarjeta) => (
                                    <div
                                        key={tarjeta}
                                        className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3"
                                    >
                                        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-800" />
                                        <div className="h-3 w-full animate-pulse rounded bg-slate-800" />
                                        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-800" />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {!cargando && error && (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-700/70 bg-[#0b1120]/95 p-10 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-red-400/30 bg-red-400/10 text-red-300">
                            <IconWarning className="h-6 w-6" />
                        </span>
                        <p className="text-sm text-slate-400">{error}</p>
                        <button
                            onClick={cargarPqr}
                            className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-400/50"
                        >
                            <IconRefresh className="h-4 w-4" /> Reintentar
                        </button>
                    </div>
                )}

                {/* TABLERO KANBAN */}
                {!cargando && !error && (
                    <div className="grid gap-4 overflow-x-auto pb-2 sm:grid-cols-3">
                        {columnasConDatos.map((columna) => {
                            const estilo = ESTILOS_COLUMNA[columna.color];
                            const enHover = columnaHover === columna.estado;
                            const IconoColumna = columna.icono;

                            return (
                                <div
                                    key={columna.estado}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        if (columnaHover !== columna.estado) setColumnaHover(columna.estado);
                                    }}
                                    onDragLeave={() => setColumnaHover((actual) => (actual === columna.estado ? null : actual))}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        alSoltar(columna);
                                    }}
                                    className={`flex min-h-[220px] flex-col rounded-2xl border-2 border-dashed bg-gradient-to-b to-transparent p-3 transition-colors ${
                                        estilo.wash
                                    } ${enHover ? estilo.dropActivo : "border-slate-800"}`}
                                >
                                    <div className={`mb-3 overflow-hidden rounded-xl border ${estilo.header}`}>
                                        <div className={`h-1 w-full bg-gradient-to-r ${estilo.topbar}`} />
                                        <div className="flex items-center justify-between px-3 py-2">
                                            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide">
                                                <span className={`flex h-6 w-6 items-center justify-center rounded-lg border ${estilo.badge}`}>
                                                    <IconoColumna className="h-3.5 w-3.5" />
                                                </span>
                                                {columna.titulo}
                                            </span>
                                            <span className="flex h-5 min-w-[22px] items-center justify-center rounded-full bg-black/20 px-1.5 text-[11px] font-black">
                                                {columna.items.length}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-1 flex-col gap-2.5">
                                        {columna.items.length === 0 && (
                                            <div className="mt-6 flex flex-col items-center gap-2 text-center">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-900/60 text-slate-700">
                                                    <IconoColumna className="h-4 w-4" />
                                                </span>
                                                <p className="text-xs text-slate-600">Sin casos aquí</p>
                                            </div>
                                        )}

                                        {columna.items.map((pqr) => {
                                            const ultimoMensaje = (pqr.mensajes || [])[pqr.mensajes.length - 1];
                                            const moviendo = moviendoId === pqr.id;
                                            const estiloTipo = ESTILO_TIPO[pqr.tipo] || ESTILO_TIPO_DEFECTO;
                                            const esperandoRespuesta =
                                                ultimoMensaje?.autor === "cliente" && pqr.estado !== "Cerrada";

                                            return (
                                                <div
                                                    key={pqr.id}
                                                    draggable
                                                    onDragStart={() => setPqrArrastrada(pqr)}
                                                    onDragEnd={() => setPqrArrastrada(null)}
                                                    onClick={() => setPqrSeleccionada(pqr)}
                                                    className={`group cursor-pointer rounded-xl border border-l-4 border-slate-800 bg-gradient-to-br from-slate-900/95 to-slate-900/70 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10 ${
                                                        estiloTipo.accent
                                                    } ${moviendo ? "opacity-50" : ""}`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span
                                                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${estiloTipo.badge}`}
                                                        >
                                                            {pqr.tipo}
                                                        </span>
                                                        <IconGripVertical className="h-4 w-4 flex-shrink-0 text-slate-700 opacity-0 transition group-hover:opacity-100" />
                                                    </div>

                                                    <h4 className="mt-2 line-clamp-2 text-sm font-bold text-white">{pqr.asunto}</h4>

                                                    {ultimoMensaje && (
                                                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{ultimoMensaje.texto}</p>
                                                    )}

                                                    {esperandoRespuesta && (
                                                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-300">
                                                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                                                            Esperando respuesta
                                                        </span>
                                                    )}

                                                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-800 pt-2">
                                                        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500">
                                                            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-[9px] font-bold text-slate-300">
                                                                {obtenerIniciales(pqr.usuario)}
                                                            </span>
                                                            <span className="truncate">
                                                                {pqr.usuario ? pqr.usuario.nombre : "Usuario eliminado"}
                                                            </span>
                                                        </span>
                                                        <span className="flex-shrink-0 text-[10px] text-slate-600">
                                                            {formatearFechaRelativa(pqr.fechaActualizacion || pqr.fecha)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <HiloPQR
                pqr={pqrSeleccionada}
                vistaComo="equipo"
                onCerrar={() => setPqrSeleccionada(null)}
                onEnviarMensaje={enviarMensaje}
                enviando={enviandoMensaje}
                onCambiarEstado={cambiarEstado}
                cambiandoEstado={!!moviendoId}
            />

            <Toast toasts={toasts} />

        </PanelLayout>
    );
}

export default GestionPQR;
