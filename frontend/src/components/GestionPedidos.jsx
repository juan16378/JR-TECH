import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import PanelLayout from "./PanelLayout";
import Toast, { useToasts } from "./Toast";
import { useConfirm } from "./ConfirmDialog";
import {
    IconChartBar,
    IconClipboard,
    IconCoin,
    IconDownload,
    IconFileSpreadsheet,
    IconFileText,
    IconRefresh,
    IconSearch,
    IconTruck,
    IconWarning,
    IconX,
} from "./Icons";

import { API_URL } from "../config";
const ESTADOS = ["Pendiente", "Procesando", "Enviado", "Entregado", "Cancelado"];

function puntoEstado(estado) {
    switch (estado) {
        case "Entregado":
            return "bg-emerald-400";
        case "Cancelado":
            return "bg-red-400";
        case "Enviado":
            return "bg-cyan-400";
        case "Procesando":
            return "bg-amber-400";
        default:
            return "bg-slate-400";
    }
}

function GestionPedidos() {
    const navigate = useNavigate();

    // El Empleado ve esta misma página (misma URL /admin/pedidos) que el
    // Administrador.
    const usuarioGuardado =
        localStorage.getItem("usuario") || sessionStorage.getItem("usuario");
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
    const rol = usuario?.rol === "Empleado" ? "Empleado" : "Administrador";

    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("Todos");
    const [accionando, setAccionando] = useState(null);
    const [descargandoResumen, setDescargandoResumen] = useState(false);
    const [descargandoId, setDescargandoId] = useState(null);
    const [descargandoExcelId, setDescargandoExcelId] = useState(null);
    const [aplicandoDescuentoId, setAplicandoDescuentoId] = useState(null);
    const [pedidoDescuento, setPedidoDescuento] = useState(null);
    const [porcentajeDescuento, setPorcentajeDescuento] = useState("");
    const [errorDescuento, setErrorDescuento] = useState("");

    const { toasts, mostrarToast } = useToasts();
    const { confirmar, ConfirmDialogHost } = useConfirm();

    const obtenerToken = () =>
        localStorage.getItem("token") || sessionStorage.getItem("token");

    const headersAuth = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${obtenerToken()}`,
    });

    // ==========================================
    // CARGAR PEDIDOS
    // ==========================================

    const cargarPedidos = async () => {
        setCargando(true);
        setError("");

        try {
            const respuesta = await fetch(`${API_URL}/pedidos/todos`, {
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
                throw new Error(datos.message || "No se pudieron cargar los pedidos.");
            }

            setPedidos(Array.isArray(datos.pedidos) ? datos.pedidos : []);
        } catch (err) {
            console.error("❌ Error al cargar pedidos:", err);
            setError(err.message || "No se pudieron cargar los pedidos.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarPedidos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==========================================
    // ESTADÍSTICAS (derivadas, solo lectura)
    // ==========================================

    const estadisticas = useMemo(() => {
        const total = pedidos.length;
        const pendientes = pedidos.filter((p) => p.estado === "Pendiente").length;
        const entregados = pedidos.filter((p) => p.estado === "Entregado").length;
        const ingresos = pedidos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
        return { total, pendientes, entregados, ingresos };
    }, [pedidos]);

    // Pedidos por día en la última semana, calculado a partir de los pedidos
    // ya cargados (sin llamadas adicionales al backend), para mostrar una
    // tendencia real en vez de una cifra suelta.
    const serie7dias = useMemo(() => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const dias = Array.from({ length: 7 }, (_, i) => {
            const fecha = new Date(hoy);
            fecha.setDate(fecha.getDate() - (6 - i));
            return { fecha, cantidad: 0 };
        });

        pedidos.forEach((p) => {
            if (!p.fecha) return;
            const f = new Date(p.fecha);
            f.setHours(0, 0, 0, 0);
            const dia = dias.find((d) => d.fecha.getTime() === f.getTime());
            if (dia) dia.cantidad += 1;
        });

        return dias;
    }, [pedidos]);

    const maxSerie7dias = Math.max(1, ...serie7dias.map((d) => d.cantidad));

    // ==========================================
    // FILTRO
    // ==========================================

    const pedidosFiltrados = pedidos.filter((p) => {
        const coincideEstado = filtroEstado === "Todos" || p.estado === filtroEstado;

        const texto = busqueda.trim().toLowerCase();
        const coincideBusqueda =
            !texto ||
            p.usuario?.nombre?.toLowerCase().includes(texto) ||
            p.usuario?.apellido?.toLowerCase().includes(texto) ||
            p.usuario?.correo?.toLowerCase().includes(texto) ||
            p.id?.toLowerCase().includes(texto);

        return coincideEstado && coincideBusqueda;
    });

    // ==========================================
    // CAMBIAR ESTADO
    // ==========================================

    const cambiarEstado = async (pedido, nuevoEstado) => {
        if (nuevoEstado === pedido.estado) return;

        if (nuevoEstado === "Cancelado") {
            const aceptado = await confirmar({
                titulo: "Cancelar pedido",
                mensaje: `¿Cancelar el pedido #${pedido.id?.slice(-8)?.toUpperCase()}? Esta acción no se puede deshacer.`,
                confirmarTexto: "Cancelar pedido",
                peligro: true,
            });
            if (!aceptado) return;
        }

        setAccionando(pedido.id);

        try {
            const respuesta = await fetch(`${API_URL}/pedidos/${pedido.id}/estado`, {
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

            setPedidos((prev) =>
                prev.map((p) => (p.id === pedido.id ? datos.pedido : p))
            );
        } catch (err) {
            console.error("❌ Error al cambiar estado del pedido:", err);
            mostrarToast(err.message || "No se pudo actualizar el estado.", "error");
        } finally {
            setAccionando(null);
        }
    };

    // ==========================================
    // DESCUENTO (solo mientras el pedido sigue "Pendiente")
    // ==========================================

    const abrirModalDescuento = (pedido) => {
        setPedidoDescuento(pedido);
        setPorcentajeDescuento(pedido.descuentoPorcentaje ? String(pedido.descuentoPorcentaje) : "");
        setErrorDescuento("");
    };

    const cerrarModalDescuento = () => {
        if (aplicandoDescuentoId) return;
        setPedidoDescuento(null);
        setErrorDescuento("");
    };

    const confirmarDescuento = async () => {
        if (!pedidoDescuento) return;

        const porcentaje = Number(porcentajeDescuento);
        if (porcentajeDescuento.trim() === "" || Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
            setErrorDescuento("Ingresa un porcentaje válido entre 0 y 100.");
            return;
        }

        const pedido = pedidoDescuento;
        setAplicandoDescuentoId(pedido.id);
        try {
            const respuesta = await fetch(`${API_URL}/pedidos/${pedido.id}/descuento`, {
                method: "PATCH",
                headers: headersAuth(),
                body: JSON.stringify({ porcentaje }),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudo aplicar el descuento.");
            }

            setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? datos.pedido : p)));
            mostrarToast("Descuento aplicado correctamente.", "exito");
            setPedidoDescuento(null);
        } catch (err) {
            console.error("❌ Error al aplicar el descuento:", err);
            setErrorDescuento(err.message || "No se pudo aplicar el descuento.");
        } finally {
            setAplicandoDescuentoId(null);
        }
    };

    // ==========================================
    // REPORTES EN PDF
    // ==========================================

    const descargarArchivo = async (url, nombreArchivo) => {
        const respuesta = await fetch(url, { headers: headersAuth() });

        if (!respuesta.ok) {
            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }
            throw new Error(datos.message || "No se pudo generar el PDF.");
        }

        const blob = await respuesta.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = urlBlob;
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        window.URL.revokeObjectURL(urlBlob);
    };

    const descargarResumenPdf = async () => {
        setDescargandoResumen(true);
        try {
            const params = new URLSearchParams();
            if (filtroEstado !== "Todos") params.set("estado", filtroEstado);
            const query = params.toString();

            await descargarArchivo(
                `${API_URL}/reportes/pedidos/pdf${query ? `?${query}` : ""}`,
                "reporte_pedidos.pdf"
            );
        } catch (err) {
            console.error("❌ Error al descargar el reporte:", err);
            mostrarToast(err.message || "No se pudo generar el reporte.", "error");
        } finally {
            setDescargandoResumen(false);
        }
    };

    const descargarComprobante = async (pedido) => {
        setDescargandoId(pedido.id);
        try {
            await descargarArchivo(
                `${API_URL}/reportes/pedidos/${pedido.id}/pdf`,
                `comprobante_${pedido.id?.slice(-8)}.pdf`
            );
        } catch (err) {
            console.error("❌ Error al descargar el comprobante:", err);
            mostrarToast(err.message || "No se pudo generar el comprobante.", "error");
        } finally {
            setDescargandoId(null);
        }
    };

    const descargarComprobanteExcel = async (pedido) => {
        setDescargandoExcelId(pedido.id);
        try {
            await descargarArchivo(
                `${API_URL}/reportes/pedidos/${pedido.id}/excel`,
                `comprobante_${pedido.id?.slice(-8)}.xlsx`
            );
        } catch (err) {
            console.error("❌ Error al descargar el comprobante en Excel:", err);
            mostrarToast(err.message || "No se pudo generar el comprobante.", "error");
        } finally {
            setDescargandoExcelId(null);
        }
    };

    // ==========================================
    // HELPERS
    // ==========================================

    const formatearMoneda = (valor) => {
        if (valor === undefined || valor === null) return "—";
        try {
            return new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
            }).format(valor);
        } catch {
            return `$${valor}`;
        }
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return "—";
        try {
            return new Date(fecha).toLocaleDateString("es-CO", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "—";
        }
    };

    const colorEstado = (estado) => {
        switch (estado) {
            case "Entregado":
                return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
            case "Cancelado":
                return "border-red-400/30 bg-red-400/10 text-red-300";
            case "Enviado":
                return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
            case "Procesando":
                return "border-amber-400/30 bg-amber-400/10 text-amber-300";
            default:
                return "border-slate-500/30 bg-slate-500/10 text-slate-300";
        }
    };

    return (
        <PanelLayout rol={rol} seccionActiva="pedidos" subtitulo="Gestión de pedidos">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">

                {/* ENCABEZADO */}

                <header className="overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-[#0b1120] to-slate-900/70 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] sm:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 sm:flex">
                                <IconTruck className="h-6 w-6" />
                            </span>
                            <div>
                                <h1 className="flex items-center gap-2 text-2xl font-black text-white sm:text-3xl">
                                    <IconTruck className="h-6 w-6 text-cyan-300 sm:hidden" />
                                    Gestión de pedidos
                                </h1>
                                <p className="mt-1 text-sm text-slate-400">
                                    Sigue el estado de cada pedido y actualízalo a medida que avanza.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={descargarResumenPdf}
                            disabled={descargandoResumen}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-5 py-2.5 text-sm font-black text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:opacity-60"
                        >
                            <IconDownload className="h-4 w-4" />
                            {descargandoResumen ? "Generando..." : "Descargar reporte PDF"}
                        </button>
                    </div>

                    {/* ESTADÍSTICAS */}
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total</p>
                                <IconChartBar className="h-4 w-4 text-slate-500" />
                            </div>
                            <p className="mt-1 text-2xl font-black text-white">{estadisticas.total}</p>
                        </div>
                        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-amber-300/80">Pendientes</p>
                            <p className="mt-1 text-2xl font-black text-amber-300">{estadisticas.pendientes}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-emerald-300/80">Entregados</p>
                            <p className="mt-1 text-2xl font-black text-emerald-300">{estadisticas.entregados}</p>
                        </div>
                        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-cyan-300/80">Ingresos</p>
                            <p className="mt-1 truncate text-2xl font-black text-cyan-300">
                                {formatearMoneda(estadisticas.ingresos)}
                            </p>
                        </div>
                    </div>

                    {/* TENDENCIA: PEDIDOS DE LOS ÚLTIMOS 7 DÍAS */}
                    <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                Pedidos · últimos 7 días
                            </p>
                            <span className="text-[11px] font-semibold text-cyan-300">
                                {serie7dias.reduce((acc, d) => acc + d.cantidad, 0)} en total
                            </span>
                        </div>

                        <svg viewBox="0 0 140 36" preserveAspectRatio="none" className="mt-3 h-10 w-full">
                            <polyline
                                points={serie7dias
                                    .map((d, i) => {
                                        const x = i * (140 / 6);
                                        const y = 32 - (d.cantidad / maxSerie7dias) * 26;
                                        return `${x},${y}`;
                                    })
                                    .join(" ")}
                                fill="none"
                                stroke="#22d3ee"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {serie7dias.map((d, i) => {
                                const x = i * (140 / 6);
                                const y = 32 - (d.cantidad / maxSerie7dias) * 26;
                                return <circle key={i} cx={x} cy={y} r="2.4" fill="#22d3ee" />;
                            })}
                        </svg>

                        <div className="mt-1 flex justify-between text-[10px] font-semibold text-slate-500">
                            {serie7dias.map((d, i) => (
                                <span key={i}>
                                    {d.fecha
                                        .toLocaleDateString("es-CO", { weekday: "short" })
                                        .replace(".", "")}
                                </span>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por cliente, correo o ID de pedido..."
                            className="w-full rounded-xl border border-slate-700/70 bg-slate-950/50 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-cyan-400/60"
                        />
                    </div>

                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/60"
                    >
                        <option value="Todos">Todos los estados</option>
                        {ESTADOS.map((estado) => (
                            <option key={estado} value={estado}>
                                {estado}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#0b1120]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">

                    {cargando && (
                        <div className="divide-y divide-slate-800">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5 h-9 w-9 flex-shrink-0 animate-pulse rounded-lg bg-slate-800" />
                                            <div className="space-y-2">
                                                <div className="h-3.5 w-32 animate-pulse rounded bg-slate-800" />
                                                <div className="h-3 w-48 animate-pulse rounded bg-slate-800" />
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                                            <div className="h-5 w-24 animate-pulse rounded-full bg-slate-800" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!cargando && error && (
                        <div className="flex flex-col items-center gap-3 p-10 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-red-400/30 bg-red-400/10 text-red-300">
                                <IconWarning className="h-6 w-6" />
                            </span>
                            <p className="text-sm text-slate-400">{error}</p>
                            <button
                                onClick={cargarPedidos}
                                className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-400/50"
                            >
                                <IconRefresh className="h-4 w-4" /> Reintentar
                            </button>
                        </div>
                    )}

                    {!cargando && !error && pedidosFiltrados.length === 0 && (
                        <div className="flex flex-col items-center gap-3 p-12 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-500">
                                <IconClipboard className="h-6 w-6" />
                            </span>
                            <p className="text-sm text-slate-400">No se encontraron pedidos.</p>
                        </div>
                    )}

                    {!cargando && !error && pedidosFiltrados.length > 0 && (
                        <div className="divide-y divide-slate-800">
                            {pedidosFiltrados.map((pedido) => (
                                <div key={pedido.id} className="p-5 transition hover:bg-slate-900/30">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-gradient-to-br from-cyan-400/15 to-blue-500/15 text-cyan-300">
                                                <IconClipboard className="h-4 w-4" />
                                            </span>
                                            <div>
                                                <p className="font-mono text-xs text-slate-500">
                                                    #{pedido.id?.slice(-8)}
                                                </p>
                                                <p className="mt-1 font-bold text-white">
                                                    {pedido.usuario
                                                        ? `${pedido.usuario.nombre} ${pedido.usuario.apellido}`
                                                        : "Usuario eliminado"}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {pedido.usuario?.correo}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {formatearFecha(pedido.fecha)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-lg font-black text-cyan-300">
                                                {formatearMoneda(pedido.total)}
                                            </span>

                                            <div className="relative">
                                                <span
                                                    className={`pointer-events-none absolute left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ${puntoEstado(
                                                        pedido.estado
                                                    )}`}
                                                />
                                                <select
                                                    value={pedido.estado}
                                                    disabled={accionando === pedido.id}
                                                    onChange={(e) => cambiarEstado(pedido, e.target.value)}
                                                    className={`rounded-full border py-1 pl-6 pr-3 text-xs font-bold outline-none disabled:opacity-50 ${colorEstado(
                                                        pedido.estado
                                                    )}`}
                                                >
                                                    {ESTADOS.map((estado) => (
                                                        <option
                                                            key={estado}
                                                            value={estado}
                                                            className="bg-slate-900 text-white"
                                                        >
                                                            {estado}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => descargarComprobante(pedido)}
                                                    disabled={descargandoId === pedido.id}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-bold text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:opacity-50"
                                                >
                                                    <IconFileText className="h-3.5 w-3.5" />
                                                    {descargandoId === pedido.id ? "Generando..." : "PDF"}
                                                </button>

                                                <button
                                                    onClick={() => descargarComprobanteExcel(pedido)}
                                                    disabled={descargandoExcelId === pedido.id}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-bold text-slate-300 transition hover:border-emerald-400/50 hover:text-emerald-300 disabled:opacity-50"
                                                >
                                                    <IconFileSpreadsheet className="h-3.5 w-3.5" />
                                                    {descargandoExcelId === pedido.id ? "Generando..." : "Excel"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-1.5 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
                                        {(pedido.productos || []).map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between text-sm text-slate-300"
                                            >
                                                <span>
                                                    <span className="font-bold text-slate-400">{item.cantidad}×</span>{" "}
                                                    {item.nombre || "Producto eliminado"}
                                                </span>
                                                <span className="text-slate-500">
                                                    {formatearMoneda(item.subtotal)}
                                                </span>
                                            </div>
                                        ))}

                                        {pedido.subtotal != null && pedido.iva != null && (
                                            <div className="mt-2 space-y-1 border-t border-slate-800 pt-2 text-xs">
                                                <div className="flex items-center justify-between text-slate-500">
                                                    <span>Subtotal</span>
                                                    <span>{formatearMoneda(pedido.subtotal)}</span>
                                                </div>
                                                {pedido.descuento > 0 && (
                                                    <div className="flex items-center justify-between text-emerald-400">
                                                        <span>
                                                            Descuento
                                                            {pedido.descuentoPorcentaje
                                                                ? ` (${pedido.descuentoPorcentaje}%)`
                                                                : ""}
                                                        </span>
                                                        <span>-{formatearMoneda(pedido.descuento)}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between text-slate-500">
                                                    <span>IVA ({Math.round((pedido.ivaPorcentaje ?? 0.19) * 100)}%)</span>
                                                    <span>{formatearMoneda(pedido.iva)}</span>
                                                </div>
                                                <div className="flex items-center justify-between font-bold text-slate-300">
                                                    <span>Total</span>
                                                    <span>{formatearMoneda(pedido.total)}</span>
                                                </div>
                                            </div>
                                        )}

                                        {pedido.estado === "Pendiente" && (
                                            <div className="mt-2 border-t border-slate-800 pt-2">
                                                <button
                                                    onClick={() => abrirModalDescuento(pedido)}
                                                    disabled={aplicandoDescuentoId === pedido.id}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-bold text-slate-300 transition hover:border-emerald-400/50 hover:text-emerald-300 disabled:opacity-50"
                                                >
                                                    <IconCoin className="h-3.5 w-3.5" />
                                                    {aplicandoDescuentoId === pedido.id
                                                        ? "Aplicando..."
                                                        : pedido.descuento > 0
                                                        ? "Cambiar descuento"
                                                        : "Aplicar descuento"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <p className="text-center text-xs text-slate-500">
                    Mostrando {pedidosFiltrados.length} de {pedidos.length} pedidos
                </p>
            </div>

            {pedidoDescuento && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
                    onClick={cerrarModalDescuento}
                >
                    <div
                        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-400/20 bg-slate-900 p-7 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={cerrarModalDescuento}
                            disabled={!!aplicandoDescuentoId}
                            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/80 text-white transition hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                            aria-label="Cerrar"
                        >
                            <IconX className="h-4 w-4" />
                        </button>

                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                            <IconCoin className="h-6 w-6" />
                        </span>

                        <h2 className="mt-4 text-xl font-black text-white">Aplicar descuento</h2>
                        <p className="mt-1 text-sm text-slate-400">
                            Pedido #{pedidoDescuento.id?.slice(-8)} · Subtotal{" "}
                            <span className="font-bold text-slate-300">
                                {formatearMoneda(pedidoDescuento.subtotal)}
                            </span>
                        </p>

                        <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                            Porcentaje de descuento
                        </label>
                        <div className="relative mt-2">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                autoFocus
                                value={porcentajeDescuento}
                                onChange={(e) => {
                                    setPorcentajeDescuento(e.target.value);
                                    setErrorDescuento("");
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") confirmarDescuento();
                                }}
                                placeholder="0"
                                className="w-full rounded-xl border border-slate-700/70 bg-slate-950/50 py-2.5 pl-4 pr-9 text-sm font-bold text-white outline-none transition focus:border-emerald-400/60"
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                                %
                            </span>
                        </div>

                        {pedidoDescuento.subtotal != null &&
                            porcentajeDescuento.trim() !== "" &&
                            !Number.isNaN(Number(porcentajeDescuento)) && (
                                <div className="mt-4 space-y-1 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
                                    {(() => {
                                        const subtotal = Number(pedidoDescuento.subtotal) || 0;
                                        const ivaPorcentaje = pedidoDescuento.ivaPorcentaje ?? 0.19;
                                        const porcentaje = Math.min(100, Math.max(0, Number(porcentajeDescuento)));
                                        const descuento = subtotal * (porcentaje / 100);
                                        const base = subtotal - descuento;
                                        const iva = base * ivaPorcentaje;
                                        const total = base + iva;
                                        return (
                                            <>
                                                <div className="flex items-center justify-between text-emerald-400">
                                                    <span>Descuento</span>
                                                    <span>-{formatearMoneda(descuento)}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-slate-500">
                                                    <span>IVA ({Math.round(ivaPorcentaje * 100)}%)</span>
                                                    <span>{formatearMoneda(iva)}</span>
                                                </div>
                                                <div className="flex items-center justify-between border-t border-slate-800 pt-1.5 font-bold text-slate-200">
                                                    <span>Nuevo total</span>
                                                    <span>{formatearMoneda(total)}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                        {errorDescuento && (
                            <p className="mt-3 text-xs font-semibold text-red-400">{errorDescuento}</p>
                        )}

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                onClick={cerrarModalDescuento}
                                disabled={!!aplicandoDescuentoId}
                                className="rounded-xl border border-slate-700 py-2.5 text-sm font-bold text-slate-300 transition hover:border-slate-500 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarDescuento}
                                disabled={!!aplicandoDescuentoId}
                                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 disabled:opacity-60"
                            >
                                {aplicandoDescuentoId ? "Aplicando..." : "Aplicar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toast toasts={toasts} />
            <ConfirmDialogHost />

        </PanelLayout>
    );
}

export default GestionPedidos;
