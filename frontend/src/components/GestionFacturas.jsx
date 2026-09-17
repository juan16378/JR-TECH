import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import PanelLayout from "./PanelLayout";
import Toast, { useToasts } from "./Toast";
import { useConfirm } from "./ConfirmDialog";
import {
    IconChartBar,
    IconClipboard,
    IconDownload,
    IconFileSpreadsheet,
    IconFileText,
    IconReceipt,
    IconRefresh,
    IconSearch,
    IconWarning,
    IconXCircle,
} from "./Icons";

import { API_URL } from "../config";
const ESTADOS = ["Emitida", "Anulada"];

function GestionFacturas() {
    const navigate = useNavigate();

    // El Empleado ve esta misma página (misma URL /admin/facturas) que el
    // Administrador, igual que Productos/Servicios/Pedidos/Estadísticas.
    const usuarioGuardado =
        localStorage.getItem("usuario") || sessionStorage.getItem("usuario");
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
    const rol = usuario?.rol === "Empleado" ? "Empleado" : "Administrador";

    const [facturas, setFacturas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("Todos");
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [descargandoId, setDescargandoId] = useState(null);
    const [descargandoExcelId, setDescargandoExcelId] = useState(null);
    const [anulandoId, setAnulandoId] = useState(null);
    const [descargandoResumen, setDescargandoResumen] = useState(false);

    const { toasts, mostrarToast } = useToasts();
    const { confirmar, ConfirmDialogHost } = useConfirm();

    const obtenerToken = () =>
        localStorage.getItem("token") || sessionStorage.getItem("token");

    const headersAuth = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${obtenerToken()}`,
    });

    // ==========================================
    // CARGAR FACTURAS
    // ==========================================

    const cargarFacturas = async () => {
        setCargando(true);
        setError("");

        try {
            const respuesta = await fetch(`${API_URL}/facturas`, {
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
                throw new Error(datos.message || "No se pudieron cargar las facturas.");
            }

            setFacturas(Array.isArray(datos.facturas) ? datos.facturas : []);
        } catch (err) {
            console.error("❌ Error al cargar facturas:", err);
            setError(err.message || "No se pudieron cargar las facturas.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarFacturas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==========================================
    // ESTADÍSTICAS (derivadas, solo lectura)
    // ==========================================

    const estadisticas = useMemo(() => {
        const total = facturas.length;
        const emitidas = facturas.filter((f) => f.estado === "Emitida").length;
        const anuladas = facturas.filter((f) => f.estado === "Anulada").length;
        const facturado = facturas
            .filter((f) => f.estado !== "Anulada")
            .reduce((acc, f) => acc + (Number(f.total) || 0), 0);
        return { total, emitidas, anuladas, facturado };
    }, [facturas]);

    // ==========================================
    // FILTRO
    // ==========================================

    const facturasFiltradas = facturas.filter((f) => {
        const coincideEstado = filtroEstado === "Todos" || f.estado === filtroEstado;

        const texto = busqueda.trim().toLowerCase();
        const coincideBusqueda =
            !texto ||
            f.numero?.toLowerCase().includes(texto) ||
            f.usuario?.nombre?.toLowerCase().includes(texto) ||
            f.usuario?.apellido?.toLowerCase().includes(texto) ||
            f.usuario?.correo?.toLowerCase().includes(texto);

        const fechaFactura = f.fecha ? new Date(f.fecha) : null;
        const coincideDesde = !desde || (fechaFactura && fechaFactura >= new Date(`${desde}T00:00:00`));
        const coincideHasta = !hasta || (fechaFactura && fechaFactura <= new Date(`${hasta}T23:59:59`));

        return coincideEstado && coincideBusqueda && coincideDesde && coincideHasta;
    });

    // ==========================================
    // DESCARGAS Y ANULACIÓN
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
            throw new Error(datos.message || "No se pudo generar el archivo.");
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

    // Reporte de ventas (a partir de las facturas): si no se eligieron
    // fechas en los filtros de arriba, el backend lo genera para el día de
    // hoy (reporte diario); si se eligieron, cubre ese rango.
    const descargarResumenPdf = async () => {
        setDescargandoResumen(true);
        try {
            const params = new URLSearchParams();
            if (desde) params.set("desde", desde);
            if (hasta) params.set("hasta", hasta);
            if (filtroEstado !== "Todos") params.set("estado", filtroEstado);
            const query = params.toString();

            await descargarArchivo(
                `${API_URL}/reportes/ventas/pdf${query ? `?${query}` : ""}`,
                desde || hasta ? "reporte_ventas.pdf" : "reporte_diario_ventas.pdf"
            );
        } catch (err) {
            console.error("❌ Error al descargar el reporte de ventas:", err);
            mostrarToast(err.message || "No se pudo generar el reporte.", "error");
        } finally {
            setDescargandoResumen(false);
        }
    };

    const descargarPdf = async (factura) => {
        setDescargandoId(factura.id);
        try {
            await descargarArchivo(
                `${API_URL}/facturas/${factura.id}/pdf`,
                `${factura.numero || factura.id?.slice(-8)}.pdf`
            );
        } catch (err) {
            console.error("❌ Error al descargar la factura:", err);
            mostrarToast(err.message || "No se pudo generar la factura.", "error");
        } finally {
            setDescargandoId(null);
        }
    };

    const descargarExcel = async (factura) => {
        setDescargandoExcelId(factura.id);
        try {
            await descargarArchivo(
                `${API_URL}/facturas/${factura.id}/excel`,
                `${factura.numero || factura.id?.slice(-8)}.xlsx`
            );
        } catch (err) {
            console.error("❌ Error al descargar la factura en Excel:", err);
            mostrarToast(err.message || "No se pudo generar la factura.", "error");
        } finally {
            setDescargandoExcelId(null);
        }
    };

    const anularFactura = async (factura) => {
        if (factura.estado === "Anulada") return;
        const confirmado = await confirmar({
            titulo: "Anular factura",
            mensaje: `¿Anular la factura ${factura.numero}? Esto también cancelará el pedido asociado. Esta acción no se puede deshacer.`,
            confirmarTexto: "Anular",
            peligro: true,
        });
        if (!confirmado) return;

        setAnulandoId(factura.id);
        try {
            const respuesta = await fetch(`${API_URL}/facturas/${factura.id}/anular`, {
                method: "PATCH",
                headers: headersAuth(),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudo anular la factura.");
            }

            setFacturas((prev) => prev.map((f) => (f.id === factura.id ? datos.factura : f)));
            mostrarToast("Factura anulada correctamente.", "exito");
        } catch (err) {
            console.error("❌ Error al anular la factura:", err);
            mostrarToast(err.message || "No se pudo anular la factura.", "error");
        } finally {
            setAnulandoId(null);
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

    const colorEstado = (estado) =>
        estado === "Anulada"
            ? "border-red-400/30 bg-red-400/10 text-red-300"
            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";

    return (
        <PanelLayout rol={rol} seccionActiva="facturas" subtitulo="Gestión de facturas">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">

                {/* ENCABEZADO */}

                <header className="overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-[#0b1120] to-slate-900/70 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] sm:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 sm:flex">
                                <IconReceipt className="h-6 w-6" />
                            </span>
                            <div>
                                <h1 className="flex items-center gap-2 text-2xl font-black text-white sm:text-3xl">
                                    <IconReceipt className="h-6 w-6 text-cyan-300 sm:hidden" />
                                    Gestión de facturas
                                </h1>
                                <p className="mt-1 text-sm text-slate-400">
                                    Cada compra genera automáticamente su factura. Búscalas, revísalas y descárgalas en PDF o Excel.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={descargarResumenPdf}
                            disabled={descargandoResumen}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-5 py-2.5 text-sm font-black text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:opacity-60"
                        >
                            <IconDownload className="h-4 w-4" />
                            {descargandoResumen
                                ? "Generando..."
                                : desde || hasta
                                ? "Descargar reporte"
                                : "Descargar reporte diario"}
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
                        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-emerald-300/80">Emitidas</p>
                            <p className="mt-1 text-2xl font-black text-emerald-300">{estadisticas.emitidas}</p>
                        </div>
                        <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-red-300/80">Anuladas</p>
                            <p className="mt-1 text-2xl font-black text-red-300">{estadisticas.anuladas}</p>
                        </div>
                        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-cyan-300/80">Facturado</p>
                            <p className="mt-1 truncate text-2xl font-black text-cyan-300">
                                {formatearMoneda(estadisticas.facturado)}
                            </p>
                        </div>
                    </div>
                </header>

                {/* FILTROS */}
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <div className="relative flex-1 sm:min-w-[220px]">
                        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por número, cliente o correo..."
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

                    <input
                        type="date"
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                        title="Desde"
                        className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/60"
                    />
                    <input
                        type="date"
                        value={hasta}
                        onChange={(e) => setHasta(e.target.value)}
                        title="Hasta"
                        className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/60"
                    />
                </div>

                <p className="-mt-3 text-xs text-slate-500">
                    Sin fechas, el listado y el reporte muestran todo el historial y el día de hoy respectivamente. Elige "Desde"/"Hasta" para acotar ambos al mismo periodo.
                </p>

                <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#0b1120]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">

                    {cargando && (
                        <div className="divide-y divide-slate-800">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5 h-9 w-9 flex-shrink-0 animate-pulse rounded-lg bg-slate-800" />
                                            <div className="space-y-2">
                                                <div className="h-3 w-20 animate-pulse rounded bg-slate-800" />
                                                <div className="h-3.5 w-36 animate-pulse rounded bg-slate-800" />
                                                <div className="h-3 w-44 animate-pulse rounded bg-slate-800" />
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
                                onClick={cargarFacturas}
                                className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-400/50"
                            >
                                <IconRefresh className="h-4 w-4" /> Reintentar
                            </button>
                        </div>
                    )}

                    {!cargando && !error && facturasFiltradas.length === 0 && (
                        <div className="flex flex-col items-center gap-3 p-12 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-500">
                                <IconClipboard className="h-6 w-6" />
                            </span>
                            <p className="text-sm text-slate-400">No se encontraron facturas.</p>
                        </div>
                    )}

                    {!cargando && !error && facturasFiltradas.length > 0 && (
                        <div className="divide-y divide-slate-800">
                            {facturasFiltradas.map((factura) => (
                                <div key={factura.id} className="p-5 transition hover:bg-slate-900/30">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-gradient-to-br from-cyan-400/15 to-blue-500/15 text-cyan-300">
                                                <IconReceipt className="h-4 w-4" />
                                            </span>
                                            <div>
                                                <p className="font-mono text-xs text-slate-500">
                                                    {factura.numero || `#${factura.id?.slice(-8)}`}
                                                </p>
                                                <p className="mt-1 font-bold text-white">
                                                    {factura.usuario
                                                        ? `${factura.usuario.nombre} ${factura.usuario.apellido}`
                                                        : "Usuario eliminado"}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {factura.usuario?.correo}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {formatearFecha(factura.fecha)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-lg font-black text-cyan-300">
                                                {formatearMoneda(factura.total)}
                                            </span>

                                            <span
                                                className={`rounded-full border px-3 py-1 text-xs font-bold ${colorEstado(
                                                    factura.estado
                                                )}`}
                                            >
                                                {factura.estado}
                                            </span>

                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                <button
                                                    onClick={() => descargarPdf(factura)}
                                                    disabled={descargandoId === factura.id}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-bold text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:opacity-50"
                                                >
                                                    <IconFileText className="h-3.5 w-3.5" />
                                                    {descargandoId === factura.id ? "Generando..." : "PDF"}
                                                </button>

                                                <button
                                                    onClick={() => descargarExcel(factura)}
                                                    disabled={descargandoExcelId === factura.id}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-bold text-slate-300 transition hover:border-emerald-400/50 hover:text-emerald-300 disabled:opacity-50"
                                                >
                                                    <IconFileSpreadsheet className="h-3.5 w-3.5" />
                                                    {descargandoExcelId === factura.id ? "Generando..." : "Excel"}
                                                </button>

                                                {factura.estado !== "Anulada" && (
                                                    <button
                                                        onClick={() => anularFactura(factura)}
                                                        disabled={anulandoId === factura.id}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 py-1 text-xs font-bold text-red-300 transition hover:border-red-400/60 hover:bg-red-500/10 disabled:opacity-50"
                                                    >
                                                        <IconXCircle className="h-3.5 w-3.5" />
                                                        {anulandoId === factura.id ? "Anulando..." : "Anular"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-1.5 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
                                        {(factura.productos || []).map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between text-sm text-slate-300"
                                            >
                                                <span>
                                                    <span className="font-bold text-slate-400">{item.cantidad}×</span>{" "}
                                                    {item.nombre || (item.tipo === "servicio" ? "Servicio eliminado" : "Producto eliminado")}
                                                    {item.tipo === "servicio" && (
                                                        <span className="ml-1.5 rounded-full border border-violet-400/30 bg-violet-400/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-300">
                                                            Servicio
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-slate-500">
                                                    {formatearMoneda(item.subtotal)}
                                                </span>
                                            </div>
                                        ))}

                                        {factura.subtotal != null && factura.iva != null && (
                                            <div className="mt-2 space-y-1 border-t border-slate-800 pt-2 text-xs">
                                                <div className="flex items-center justify-between text-slate-500">
                                                    <span>Subtotal</span>
                                                    <span>{formatearMoneda(factura.subtotal)}</span>
                                                </div>
                                                {factura.descuento > 0 && (
                                                    <div className="flex items-center justify-between text-emerald-400">
                                                        <span>
                                                            Descuento
                                                            {factura.descuentoPorcentaje
                                                                ? ` (${factura.descuentoPorcentaje}%)`
                                                                : ""}
                                                        </span>
                                                        <span>-{formatearMoneda(factura.descuento)}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between text-slate-500">
                                                    <span>IVA ({Math.round((factura.ivaPorcentaje ?? 0.19) * 100)}%)</span>
                                                    <span>{formatearMoneda(factura.iva)}</span>
                                                </div>
                                                <div className="flex items-center justify-between font-bold text-slate-300">
                                                    <span>Total</span>
                                                    <span>{formatearMoneda(factura.total)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <p className="text-center text-xs text-slate-500">
                    Mostrando {facturasFiltradas.length} de {facturas.length} facturas
                </p>
            </div>

            <Toast toasts={toasts} />
            <ConfirmDialogHost />

        </PanelLayout>
    );
}

export default GestionFacturas;
