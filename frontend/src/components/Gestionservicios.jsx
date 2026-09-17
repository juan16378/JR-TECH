import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useConfirm } from "./ConfirmDialog";
import PanelLayout from "./PanelLayout";
import Toast, { useToasts } from "./Toast";
import {
    IconChartBar,
    IconRefresh,
    IconSearch,
    IconTrash,
    IconWarning,
    IconWrench,
    IconX,
} from "./Icons";

import { API_URL } from "../config";

const FORM_VACIO = {
    nombre: "",
    descripcion: "",
    precio: "",
};

function GestionServicios() {
    const navigate = useNavigate();

    // El Empleado ve esta misma página (misma URL /admin/servicios) que el
    // Administrador; lo único que cambia según el rol guardado es si puede
    // eliminar servicios o no.
    const usuarioGuardado =
        localStorage.getItem("usuario") || sessionStorage.getItem("usuario");
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
    const rol = usuario?.rol === "Empleado" ? "Empleado" : "Administrador";
    const puedeEliminar = rol === "Administrador";

    const [servicios, setServicios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("Todos");

    const [modal, setModal] = useState(null); // null | "crear" | servicio a editar
    const [form, setForm] = useState(FORM_VACIO);
    const [errorForm, setErrorForm] = useState("");
    const [guardando, setGuardando] = useState(false);

    const [accionando, setAccionando] = useState(null);

    const { confirmar, ConfirmDialogHost } = useConfirm();
    const { toasts, mostrarToast } = useToasts();

    const obtenerToken = () =>
        localStorage.getItem("token") || sessionStorage.getItem("token");

    const headersAuth = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${obtenerToken()}`,
    });

    // ==========================================
    // CARGAR SERVICIOS
    // ==========================================

    const cargarServicios = async () => {
        setCargando(true);
        setError("");

        try {
            const respuesta = await fetch(`${API_URL}/servicios`);

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudieron cargar los servicios.");
            }

            setServicios(Array.isArray(datos.servicios) ? datos.servicios : []);
        } catch (err) {
            console.error("❌ Error al cargar servicios:", err);
            setError(err.message || "No se pudieron cargar los servicios.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarServicios();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==========================================
    // ESTADÍSTICAS (derivadas, solo lectura)
    // ==========================================

    const estadisticas = useMemo(() => {
        const total = servicios.length;
        const activos = servicios.filter((s) => s.estado === "Activo").length;
        const inactivos = total - activos;
        const precioPromedio =
            total === 0
                ? 0
                : servicios.reduce((acc, s) => acc + (Number(s.precio) || 0), 0) / total;
        return { total, activos, inactivos, precioPromedio };
    }, [servicios]);

    // ==========================================
    // FILTRO
    // ==========================================

    const serviciosFiltrados = useMemo(() => {
        return servicios.filter((s) => {
            const coincideEstado =
                filtroEstado === "Todos" || s.estado === filtroEstado;

            const texto = busqueda.trim().toLowerCase();
            const coincideBusqueda = !texto || s.nombre?.toLowerCase().includes(texto);

            return coincideEstado && coincideBusqueda;
        });
    }, [servicios, busqueda, filtroEstado]);

    // ==========================================
    // ABRIR MODAL
    // ==========================================

    const abrirCrear = () => {
        setForm(FORM_VACIO);
        setErrorForm("");
        setModal("crear");
    };

    const abrirEditar = (servicio) => {
        setForm({
            nombre: servicio.nombre || "",
            descripcion: servicio.descripcion || "",
            precio: servicio.precio ?? "",
        });
        setErrorForm("");
        setModal(servicio);
    };

    const cerrarModal = () => {
        setModal(null);
        setErrorForm("");
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
                ? `${API_URL}/servicios/${modal.id}`
                : `${API_URL}/servicios`;

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
                throw new Error(datos.message || "No se pudo guardar el servicio.");
            }

            if (esEdicion) {
                setServicios((prev) =>
                    prev.map((s) => (s.id === modal.id ? datos.servicio : s))
                );
            } else {
                setServicios((prev) => [datos.servicio, ...prev]);
            }

            cerrarModal();
        } catch (err) {
            console.error("❌ Error al guardar servicio:", err);
            setErrorForm(err.message || "No se pudo guardar el servicio.");
        } finally {
            setGuardando(false);
        }
    };

    // ==========================================
    // CAMBIAR ESTADO
    // ==========================================

    const cambiarEstado = async (servicio) => {
        setAccionando(servicio.id);

        try {
            const respuesta = await fetch(
                `${API_URL}/servicios/${servicio.id}/estado`,
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

            setServicios((prev) =>
                prev.map((s) => (s.id === servicio.id ? datos.servicio : s))
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

    const eliminarServicio = async (servicio) => {
        const aceptado = await confirmar({
            titulo: "Eliminar servicio",
            mensaje: `¿Eliminar "${servicio.nombre}" definitivamente? Esta acción no se puede deshacer.`,
            confirmarTexto: "Eliminar",
            peligro: true,
        });
        if (!aceptado) return;

        setAccionando(servicio.id);

        try {
            const respuesta = await fetch(`${API_URL}/servicios/${servicio.id}`, {
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
                throw new Error(datos.message || "No se pudo eliminar el servicio.");
            }

            setServicios((prev) => prev.filter((s) => s.id !== servicio.id));
        } catch (err) {
            console.error("❌ Error al eliminar servicio:", err);
            mostrarToast(err.message || "No se pudo eliminar el servicio.", "error");
        } finally {
            setAccionando(null);
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
        <PanelLayout rol={rol} seccionActiva="servicios" subtitulo="Gestión de servicios">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">

                {/* ENCABEZADO */}

                <header className="overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-[#0b1120] to-slate-900/70 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] sm:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 sm:flex">
                                <IconWrench className="h-6 w-6" />
                            </span>
                            <div>
                                <h1 className="flex items-center gap-2 text-2xl font-black text-white sm:text-3xl">
                                    <IconWrench className="h-6 w-6 text-cyan-300 sm:hidden" />
                                    Gestión de servicios
                                </h1>
                                <p className="mt-1 text-sm text-slate-400">
                                    Administra los servicios técnicos que ofreces a tus clientes.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={abrirCrear}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-cyan-300 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)]"
                        >
                            <span className="text-lg leading-none">+</span> Nuevo servicio
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
                            <p className="text-xs font-bold uppercase tracking-wide text-emerald-300/80">Activos</p>
                            <p className="mt-1 text-2xl font-black text-emerald-300">{estadisticas.activos}</p>
                        </div>
                        <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-red-300/80">Inactivos</p>
                            <p className="mt-1 text-2xl font-black text-red-300">{estadisticas.inactivos}</p>
                        </div>
                        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-cyan-300/80">Precio promedio</p>
                            <p className="mt-1 text-2xl font-black text-cyan-300">
                                {formatearMoneda(estadisticas.precioPromedio)}
                            </p>
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
                            placeholder="Buscar por nombre..."
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
                            <table className="w-full min-w-[640px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700/70 bg-slate-900/40 text-xs uppercase tracking-wide text-slate-400">
                                        <th className="px-5 py-3 font-bold">Servicio</th>
                                        <th className="px-5 py-3 font-bold">Precio</th>
                                        <th className="px-5 py-3 font-bold">Estado</th>
                                        <th className="px-5 py-3 font-bold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="border-b border-slate-800 last:border-0">
                                            {Array.from({ length: 4 }).map((__, j) => (
                                                <td key={j} className="px-5 py-4">
                                                    <div className="h-3.5 w-full max-w-[140px] animate-pulse rounded bg-slate-800" />
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
                                onClick={cargarServicios}
                                className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-400/50"
                            >
                                <IconRefresh className="h-4 w-4" /> Reintentar
                            </button>
                        </div>
                    )}

                    {!cargando && !error && serviciosFiltrados.length === 0 && (
                        <div className="flex flex-col items-center gap-3 p-12 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-500">
                                <IconWrench className="h-6 w-6" />
                            </span>
                            <p className="text-sm text-slate-400">No se encontraron servicios.</p>
                        </div>
                    )}

                    {!cargando && !error && serviciosFiltrados.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700/70 bg-slate-900/40 text-xs uppercase tracking-wide text-slate-400">
                                        <th className="px-5 py-3 font-bold">Servicio</th>
                                        <th className="px-5 py-3 font-bold">Precio</th>
                                        <th className="px-5 py-3 font-bold">Estado</th>
                                        <th className="px-5 py-3 font-bold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {serviciosFiltrados.map((servicio) => (
                                        <tr
                                            key={servicio.id}
                                            className="border-b border-slate-800 transition last:border-0 hover:bg-slate-900/40"
                                        >
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-gradient-to-br from-cyan-400/15 to-blue-500/15 text-cyan-300">
                                                        <IconWrench className="h-4 w-4" />
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-white">{servicio.nombre}</p>
                                                        <p className="max-w-[320px] truncate text-xs text-slate-400">
                                                            {servicio.descripcion}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3 font-bold text-cyan-300">
                                                {formatearMoneda(servicio.precio)}
                                            </td>

                                            <td className="px-5 py-3">
                                                <button
                                                    onClick={() => cambiarEstado(servicio)}
                                                    disabled={accionando === servicio.id}
                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition disabled:opacity-50 ${
                                                        servicio.estado === "Activo"
                                                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                                                            : "border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/20"
                                                    }`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${
                                                            servicio.estado === "Activo" ? "bg-emerald-400" : "bg-red-400"
                                                        }`}
                                                    />
                                                    {servicio.estado}
                                                </button>
                                            </td>

                                            <td className="px-5 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => abrirEditar(servicio)}
                                                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
                                                    >
                                                        Editar
                                                    </button>

                                                    {puedeEliminar && (
                                                        <button
                                                            onClick={() => eliminarServicio(servicio)}
                                                            disabled={accionando === servicio.id}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                                                        >
                                                            <IconTrash className="h-3.5 w-3.5" /> Eliminar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <p className="text-center text-xs text-slate-500">
                    Mostrando {serviciosFiltrados.length} de {servicios.length} servicios
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
                                    <IconWrench className="h-5 w-5" />
                                </span>
                                <h2 className="text-lg font-black text-white">
                                    {modal === "crear" ? "Nuevo servicio" : "Editar servicio"}
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

                        <form onSubmit={guardar} className="mt-5 grid gap-3">

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Nombre</label>
                                <input
                                    value={form.nombre}
                                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                                    maxLength={150}
                                    required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                />
                            </div>

                            <div>
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

                            <div className="mt-2 flex justify-end gap-3 border-t border-slate-800 pt-4">
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

export default GestionServicios;
