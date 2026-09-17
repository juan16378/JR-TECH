import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useConfirm } from "./ConfirmDialog";
import PanelLayout from "./PanelLayout";
import Toast, { useToasts } from "./Toast";
import {
    IconBox,
    IconChartBar,
    IconDownload,
    IconRefresh,
    IconSearch,
    IconTrash,
    IconUpload,
    IconWarning,
    IconX,
} from "./Icons";

import { API_URL } from "../config";

// Listas fijas (deben coincidir con CATEGORIAS_VALIDAS/MARCAS_VALIDAS en
// backend/app/models/producto.py) para que todo producto quede organizado
// en las mismas categorías y marcas.
const CATEGORIAS_VALIDAS = [
    "Celulares",
    "Computadores portátiles",
    "Computadores de escritorio",
    "Tablets",
    "Relojes inteligentes",
    "Audífonos",
    "Accesorios",
    "Videojuegos y consolas",
];

const MARCAS_VALIDAS = ["Samsung", "Apple", "Xiaomi", "PlayStation", "Xbox"];

const FORM_VACIO = {
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    imagen: "",
    categoria: "",
    marca: "",
};

const UMBRAL_STOCK_BAJO = 5;

function iniciales(texto = "") {
    const limpio = texto.trim();
    if (!limpio) return "?";
    return limpio.slice(0, 2).toUpperCase();
}

function GestionProductos() {
    const navigate = useNavigate();

    // El Empleado ve esta misma página (misma URL /admin/productos) que el
    // Administrador; lo único que cambia según el rol guardado es si puede
    // eliminar productos o no.
    const usuarioGuardado =
        localStorage.getItem("usuario") || sessionStorage.getItem("usuario");
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
    const rol = usuario?.rol === "Empleado" ? "Empleado" : "Administrador";
    const puedeEliminar = rol === "Administrador";

    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("Todos");

    const [modal, setModal] = useState(null); // null | "crear" | producto a editar
    const [form, setForm] = useState(FORM_VACIO);
    const [errorForm, setErrorForm] = useState("");
    const [guardando, setGuardando] = useState(false);

    const [accionando, setAccionando] = useState(null);
    const [descargandoReporte, setDescargandoReporte] = useState(false);
    const [subiendoImagen, setSubiendoImagen] = useState(false);

    const { confirmar, ConfirmDialogHost } = useConfirm();
    const { toasts, mostrarToast } = useToasts();

    const obtenerToken = () =>
        localStorage.getItem("token") || sessionStorage.getItem("token");

    const headersAuth = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${obtenerToken()}`,
    });

    // ==========================================
    // CARGAR PRODUCTOS
    // ==========================================

    const cargarProductos = async () => {
        setCargando(true);
        setError("");

        try {
            const respuesta = await fetch(`${API_URL}/productos`);

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudieron cargar los productos.");
            }

            setProductos(Array.isArray(datos.productos) ? datos.productos : []);
        } catch (err) {
            console.error("❌ Error al cargar productos:", err);
            setError(err.message || "No se pudieron cargar los productos.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarProductos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==========================================
    // ESTADÍSTICAS (derivadas, solo lectura)
    // ==========================================

    const estadisticas = useMemo(() => {
        const total = productos.length;
        const activos = productos.filter((p) => p.estado === "Activo").length;
        const inactivos = total - activos;
        const stockBajo = productos.filter(
            (p) => Number(p.stock) <= UMBRAL_STOCK_BAJO
        ).length;
        return { total, activos, inactivos, stockBajo };
    }, [productos]);

    // ==========================================
    // FILTRO
    // ==========================================

    const productosFiltrados = useMemo(() => {
        return productos.filter((p) => {
            const coincideEstado =
                filtroEstado === "Todos" || p.estado === filtroEstado;

            const texto = busqueda.trim().toLowerCase();
            const coincideBusqueda =
                !texto ||
                p.nombre?.toLowerCase().includes(texto) ||
                p.categoria?.toLowerCase().includes(texto) ||
                p.marca?.toLowerCase().includes(texto);

            return coincideEstado && coincideBusqueda;
        });
    }, [productos, busqueda, filtroEstado]);

    // ==========================================
    // ABRIR MODAL
    // ==========================================

    const abrirCrear = () => {
        setForm(FORM_VACIO);
        setErrorForm("");
        setModal("crear");
    };

    const abrirEditar = (producto) => {
        setForm({
            nombre: producto.nombre || "",
            descripcion: producto.descripcion || "",
            precio: producto.precio ?? "",
            stock: producto.stock ?? "",
            imagen: producto.imagen || "",
            categoria: producto.categoria || "",
            marca: producto.marca || "",
        });
        setErrorForm("");
        setModal(producto);
    };

    const cerrarModal = () => {
        setModal(null);
        setErrorForm("");
    };

    // ==========================================
    // SUBIR IMAGEN DESDE EL DISPOSITIVO
    // ==========================================

    const subirImagen = async (e) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;

        setSubiendoImagen(true);
        setErrorForm("");

        try {
            const cuerpo = new FormData();
            cuerpo.append("archivo", archivo);

            const respuesta = await fetch(`${API_URL}/productos/subir-imagen`, {
                method: "POST",
                headers: { Authorization: `Bearer ${obtenerToken()}` },
                body: cuerpo,
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
                throw new Error(datos.message || "No se pudo subir la imagen.");
            }

            setForm((p) => ({ ...p, imagen: datos.url }));
        } catch (err) {
            console.error("❌ Error al subir la imagen:", err);
            setErrorForm(err.message || "No se pudo subir la imagen.");
        } finally {
            setSubiendoImagen(false);
            e.target.value = "";
        }
    };

    // ==========================================
    // GUARDAR (crear o editar)
    // ==========================================

    const guardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        setErrorForm("");

        const esEdicion = modal !== "crear";

        try {
            const url = esEdicion
                ? `${API_URL}/productos/${modal.id}`
                : `${API_URL}/productos`;

            const respuesta = await fetch(url, {
                method: esEdicion ? "PUT" : "POST",
                headers: headersAuth(),
                body: JSON.stringify(form),
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
                throw new Error(datos.message || "No se pudo guardar el producto.");
            }

            if (esEdicion) {
                setProductos((prev) =>
                    prev.map((p) => (p.id === modal.id ? datos.producto : p))
                );
            } else {
                setProductos((prev) => [datos.producto, ...prev]);
            }

            cerrarModal();
        } catch (err) {
            console.error("❌ Error al guardar producto:", err);
            setErrorForm(err.message || "No se pudo guardar el producto.");
        } finally {
            setGuardando(false);
        }
    };

    // ==========================================
    // CAMBIAR ESTADO
    // ==========================================

    const cambiarEstado = async (producto) => {
        setAccionando(producto.id);

        try {
            const respuesta = await fetch(
                `${API_URL}/productos/${producto.id}/estado`,
                { method: "PATCH", headers: headersAuth() }
            );

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudo cambiar el estado.");
            }

            setProductos((prev) =>
                prev.map((p) => (p.id === producto.id ? datos.producto : p))
            );
        } catch (err) {
            console.error("❌ Error al cambiar estado:", err);
            mostrarToast(err.message || "No se pudo cambiar el estado.", "error");
        } finally {
            setAccionando(null);
        }
    };

    // ==========================================
    // ELIMINAR
    // ==========================================

    const eliminarProducto = async (producto) => {
        const aceptado = await confirmar({
            titulo: "Eliminar producto",
            mensaje: `¿Eliminar "${producto.nombre}" definitivamente? Esta acción no se puede deshacer.`,
            confirmarTexto: "Eliminar",
            peligro: true,
        });
        if (!aceptado) return;

        setAccionando(producto.id);

        try {
            const respuesta = await fetch(`${API_URL}/productos/${producto.id}`, {
                method: "DELETE",
                headers: headersAuth(),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudo eliminar el producto.");
            }

            setProductos((prev) => prev.filter((p) => p.id !== producto.id));
        } catch (err) {
            console.error("❌ Error al eliminar producto:", err);
            mostrarToast(err.message || "No se pudo eliminar el producto.", "error");
        } finally {
            setAccionando(null);
        }
    };

    // ==========================================
    // REPORTE EN PDF
    // ==========================================

    const descargarReportePdf = async () => {
        setDescargandoReporte(true);
        try {
            const params = new URLSearchParams();
            if (filtroEstado !== "Todos") params.set("estado", filtroEstado);
            const query = params.toString();

            const respuesta = await fetch(
                `${API_URL}/reportes/productos/pdf${query ? `?${query}` : ""}`,
                { headers: headersAuth() }
            );

            if (!respuesta.ok) {
                let datos = {};
                try {
                    datos = await respuesta.json();
                } catch {
                    datos = {};
                }
                throw new Error(datos.message || "No se pudo generar el reporte.");
            }

            const blob = await respuesta.blob();
            const urlBlob = window.URL.createObjectURL(blob);
            const enlace = document.createElement("a");
            enlace.href = urlBlob;
            enlace.download = "reporte_inventario.pdf";
            document.body.appendChild(enlace);
            enlace.click();
            enlace.remove();
            window.URL.revokeObjectURL(urlBlob);
        } catch (err) {
            console.error("❌ Error al descargar el reporte:", err);
            mostrarToast(err.message || "No se pudo generar el reporte.", "error");
        } finally {
            setDescargandoReporte(false);
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

    return (
        <PanelLayout rol={rol} seccionActiva="productos" subtitulo="Gestión de productos">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">

                {/* ENCABEZADO */}

                <header className="overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-[#0b1120] to-slate-900/70 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] sm:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 sm:flex">
                                <IconBox className="h-6 w-6" />
                            </span>
                            <div>
                                <h1 className="flex items-center gap-2 text-2xl font-black text-white sm:text-3xl">
                                    <IconBox className="h-6 w-6 text-cyan-300 sm:hidden" />
                                    Gestión de productos
                                </h1>
                                <p className="mt-1 text-sm text-slate-400">
                                    Administra tu catálogo: crea, edita, publica y controla el inventario.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={descargarReportePdf}
                                disabled={descargandoReporte}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm font-black text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:opacity-60"
                            >
                                <IconDownload className="h-4 w-4" />
                                {descargandoReporte ? "Generando..." : "Reporte PDF"}
                            </button>

                            <button
                                onClick={abrirCrear}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-cyan-300 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)]"
                            >
                                <span className="text-lg leading-none">+</span> Nuevo producto
                            </button>
                        </div>
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
                            <p className="text-xs font-bold uppercase tracking-wide text-emerald-300/80">Activos</p>
                            <p className="mt-1 text-2xl font-black text-emerald-300">{estadisticas.activos}</p>
                        </div>
                        <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-red-300/80">Inactivos</p>
                            <p className="mt-1 text-2xl font-black text-red-300">{estadisticas.inactivos}</p>
                        </div>
                        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wide text-amber-300/80">Stock bajo</p>
                                {estadisticas.stockBajo > 0 && (
                                    <IconWarning className="h-4 w-4 text-amber-300" />
                                )}
                            </div>
                            <p className="mt-1 text-2xl font-black text-amber-300">{estadisticas.stockBajo}</p>
                        </div>
                    </div>

                    {/* PROPORCIÓN ACTIVOS / INACTIVOS */}
                    {estadisticas.total > 0 && (
                        <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-400">
                                <span>Catálogo activo</span>
                                <span className="text-slate-300">
                                    {Math.round((estadisticas.activos / estadisticas.total) * 100)}%
                                </span>
                            </div>
                            <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-slate-800">
                                <div
                                    className="h-full bg-emerald-400"
                                    style={{ width: `${(estadisticas.activos / estadisticas.total) * 100}%` }}
                                />
                                <div
                                    className="h-full bg-red-400/70"
                                    style={{ width: `${(estadisticas.inactivos / estadisticas.total) * 100}%` }}
                                />
                            </div>
                            <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-slate-500">
                                <span>{estadisticas.activos} activos</span>
                                <span>{estadisticas.inactivos} inactivos</span>
                            </div>
                        </div>
                    )}
                </header>

                {/* CONTROLES */}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre o categoría..."
                            className="w-full rounded-xl border border-slate-700/70 bg-slate-950/50 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-cyan-400/60"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {["Todos", "Activo", "Inactivo"].map((opcion) => (
                            <button
                                key={opcion}
                                onClick={() => setFiltroEstado(opcion)}
                                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                                    filtroEstado === opcion
                                        ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-300"
                                        : "border-slate-700/70 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                                }`}
                            >
                                {opcion}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#0b1120]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">

                    {cargando && (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700/70 bg-slate-900/40 text-xs uppercase tracking-wide text-slate-400">
                                        <th className="px-5 py-3 font-bold">Producto</th>
                                        <th className="px-5 py-3 font-bold">Categoría</th>
                                        <th className="px-5 py-3 font-bold">Marca</th>
                                        <th className="px-5 py-3 font-bold">Precio</th>
                                        <th className="px-5 py-3 font-bold">Stock</th>
                                        <th className="px-5 py-3 font-bold">Estado</th>
                                        <th className="px-5 py-3 font-bold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="border-b border-slate-800 last:border-0">
                                            {Array.from({ length: 7 }).map((__, j) => (
                                                <td key={j} className="px-5 py-4">
                                                    <div className="h-3.5 w-full max-w-[110px] animate-pulse rounded bg-slate-800" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!cargando && error && (
                        <div className="flex flex-col items-center gap-3 p-10 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-red-400/30 bg-red-400/10 text-red-300">
                                <IconWarning className="h-6 w-6" />
                            </span>
                            <p className="text-sm text-slate-400">{error}</p>
                            <button
                                onClick={cargarProductos}
                                className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-400/50"
                            >
                                <IconRefresh className="h-4 w-4" /> Reintentar
                            </button>
                        </div>
                    )}

                    {!cargando && !error && productosFiltrados.length === 0 && (
                        <div className="flex flex-col items-center gap-3 p-12 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-500">
                                <IconBox className="h-6 w-6" />
                            </span>
                            <p className="text-sm text-slate-400">No se encontraron productos.</p>
                        </div>
                    )}

                    {!cargando && !error && productosFiltrados.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700/70 bg-slate-900/40 text-xs uppercase tracking-wide text-slate-400">
                                        <th className="px-5 py-3 font-bold">Producto</th>
                                        <th className="px-5 py-3 font-bold">Categoría</th>
                                        <th className="px-5 py-3 font-bold">Marca</th>
                                        <th className="px-5 py-3 font-bold">Precio</th>
                                        <th className="px-5 py-3 font-bold">Stock</th>
                                        <th className="px-5 py-3 font-bold">Estado</th>
                                        <th className="px-5 py-3 font-bold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productosFiltrados.map((producto) => {
                                        const stockBajo = Number(producto.stock) <= UMBRAL_STOCK_BAJO;
                                        return (
                                        <tr
                                            key={producto.id}
                                            className="border-b border-slate-800 transition last:border-0 hover:bg-slate-900/40"
                                        >
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-slate-700/60 bg-slate-800">
                                                        {producto.imagen ? (
                                                            <img
                                                                src={producto.imagen}
                                                                alt={producto.nombre}
                                                                loading="lazy"
                                                                decoding="async"
                                                                className="h-full w-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.style.display = "none";
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-400/15 to-blue-500/15 text-xs font-black text-cyan-300">
                                                                {iniciales(producto.nombre)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{producto.nombre}</p>
                                                        <p className="max-w-[220px] truncate text-xs text-slate-400">
                                                            {producto.descripcion}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3 text-slate-300">
                                                <span className="rounded-full border border-slate-700/70 bg-slate-900/60 px-2.5 py-1 text-xs font-semibold">
                                                    {producto.categoria}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3 text-slate-300">
                                                {producto.marca || "—"}
                                            </td>

                                            <td className="px-5 py-3 font-bold text-cyan-300">
                                                {formatearMoneda(producto.precio)}
                                            </td>

                                            <td className="px-5 py-3">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 font-semibold ${
                                                        stockBajo ? "text-amber-300" : "text-slate-300"
                                                    }`}
                                                >
                                                    {stockBajo && <IconWarning className="h-3.5 w-3.5" />}
                                                    {producto.stock}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3">
                                                <button
                                                    onClick={() => cambiarEstado(producto)}
                                                    disabled={accionando === producto.id}
                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition disabled:opacity-50 ${
                                                        producto.estado === "Activo"
                                                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                                                            : "border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/20"
                                                    }`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${
                                                            producto.estado === "Activo" ? "bg-emerald-400" : "bg-red-400"
                                                        }`}
                                                    />
                                                    {producto.estado}
                                                </button>
                                            </td>

                                            <td className="px-5 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => abrirEditar(producto)}
                                                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
                                                    >
                                                        Editar
                                                    </button>

                                                    {puedeEliminar && (
                                                        <button
                                                            onClick={() => eliminarProducto(producto)}
                                                            disabled={accionando === producto.id}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                                                        >
                                                            <IconTrash className="h-3.5 w-3.5" /> Eliminar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <p className="text-center text-xs text-slate-500">
                    Mostrando {productosFiltrados.length} de {productos.length} productos
                </p>
            </div>

            {/* ==========================================
                MODAL: CREAR / EDITAR
            ========================================== */}

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700/70 bg-[#0b1120] p-6 shadow-2xl">

                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                                    <IconBox className="h-5 w-5" />
                                </span>
                                <h2 className="text-lg font-black text-white">
                                    {modal === "crear" ? "Nuevo producto" : "Editar producto"}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={cerrarModal}
                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                                aria-label="Cerrar"
                            >
                                <IconX className="h-5 w-5" />
                            </button>
                        </div>

                        {errorForm && (
                            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
                                <IconWarning className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                {errorForm}
                            </div>
                        )}

                        <form onSubmit={guardar} className="mt-5 grid gap-3 sm:grid-cols-2">

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Nombre</label>
                                <input
                                    value={form.nombre}
                                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                                    maxLength={150}
                                    required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Descripción</label>
                                <textarea
                                    value={form.descripcion}
                                    onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                                    maxLength={1000}
                                    rows={3}
                                    required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Precio (COP)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.precio}
                                    onChange={(e) => setForm((p) => ({ ...p, precio: e.target.value }))}
                                    required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Stock</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.stock}
                                    onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                                    required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Categoría</label>
                                <select
                                    value={form.categoria}
                                    onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
                                    required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                >
                                    <option value="" disabled>
                                        Selecciona una categoría
                                    </option>
                                    {CATEGORIAS_VALIDAS.map((categoria) => (
                                        <option key={categoria} value={categoria}>
                                            {categoria}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Marca</label>
                                <select
                                    value={form.marca}
                                    onChange={(e) => setForm((p) => ({ ...p, marca: e.target.value }))}
                                    required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                >
                                    <option value="" disabled>
                                        Selecciona una marca
                                    </option>
                                    {MARCAS_VALIDAS.map((marca) => (
                                        <option key={marca} value={marca}>
                                            {marca}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Imagen del producto</label>

                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input
                                        value={form.imagen}
                                        onChange={(e) => setForm((p) => ({ ...p, imagen: e.target.value }))}
                                        placeholder="https://... (o sube un archivo desde tu dispositivo)"
                                        className="w-full flex-1 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                    />

                                    <label
                                        className={`flex flex-shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300 ${
                                            subiendoImagen ? "pointer-events-none opacity-60" : ""
                                        }`}
                                    >
                                        <IconUpload className="h-4 w-4" />
                                        {subiendoImagen ? "Subiendo..." : "Subir archivo"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={subirImagen}
                                            disabled={subiendoImagen}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                {form.imagen && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-slate-700/60 bg-slate-800">
                                            <img
                                                src={form.imagen}
                                                alt="Vista previa"
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    e.target.style.display = "none";
                                                }}
                                            />
                                        </div>
                                        <p className="min-w-0 flex-1 truncate text-xs text-slate-500">{form.imagen}</p>
                                    </div>
                                )}
                            </div>

                            <div className="sm:col-span-2 mt-2 flex justify-end gap-3 border-t border-slate-800 pt-4">
                                <button
                                    type="button"
                                    onClick={cerrarModal}
                                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:border-slate-500"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={guardando}
                                    className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
                                >
                                    {guardando ? "Guardando..." : "Guardar"}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            <Toast toasts={toasts} />
            <ConfirmDialogHost />

        </PanelLayout>
    );
}

export default GestionProductos;
