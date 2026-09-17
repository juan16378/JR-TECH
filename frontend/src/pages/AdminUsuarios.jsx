import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useConfirm } from "../components/ConfirmDialog";
import PanelLayout from "../components/PanelLayout";
import Toast, { useToasts } from "../components/Toast";
import {
    IconDownload,
    IconRefresh,
    IconSearch,
    IconTrash,
    IconUsers,
    IconWarning,
    IconX,
} from "../components/Icons";

import { API_URL } from "../config";

function iniciales(nombre = "", apellido = "") {
    const n = nombre.trim().charAt(0);
    const a = apellido.trim().charAt(0);
    const resultado = `${n}${a}`.toUpperCase();
    return resultado || "?";
}

function AdminUsuarios() {
    const navigate = useNavigate();

    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filtroRol, setFiltroRol] = useState("Todos");

    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [formEditar, setFormEditar] = useState({});
    const [guardandoEdicion, setGuardandoEdicion] = useState(false);
    const [errorEdicion, setErrorEdicion] = useState("");

    const [mostrarCrear, setMostrarCrear] = useState(false);
    const [formCrear, setFormCrear] = useState({
        nombre: "",
        apellido: "",
        tipoDocumento: "CC",
        numeroDocumento: "",
        direccion: "",
        telefono: "",
        correo: "",
        password: "",
        rol: "Cliente",
    });
    const [errorCrear, setErrorCrear] = useState("");
    const [creando, setCreando] = useState(false);

    const [accionando, setAccionando] = useState(null); // id del usuario con acción en curso
    const [descargandoReporte, setDescargandoReporte] = useState(false);

    const { confirmar, ConfirmDialogHost } = useConfirm();
    const { toasts, mostrarToast } = useToasts();

    // ==========================================
    // TOKEN Y HEADERS
    // ==========================================

    const obtenerToken = () =>
        localStorage.getItem("token") || sessionStorage.getItem("token");

    const headersAuth = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${obtenerToken()}`,
    });

    // ==========================================
    // CARGAR USUARIOS
    // ==========================================

    const cargarUsuarios = async () => {
        setCargando(true);
        setError("");

        try {
            const respuesta = await fetch(`${API_URL}/usuarios`, {
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
                throw new Error(
                    datos.message || "No se pudo cargar la lista de usuarios."
                );
            }

            setUsuarios(Array.isArray(datos.usuarios) ? datos.usuarios : []);
        } catch (err) {
            console.error("❌ Error al cargar usuarios:", err);
            setError(
                err.message ||
                "No se pudo cargar la lista de usuarios. Intenta de nuevo."
            );
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarUsuarios();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==========================================
    // ESTADÍSTICAS (derivadas, solo lectura)
    // ==========================================

    const estadisticas = useMemo(() => {
        const total = usuarios.length;
        const administradores = usuarios.filter((u) => u.rol === "Administrador").length;
        const empleados = usuarios.filter((u) => u.rol === "Empleado").length;
        const clientes = usuarios.filter((u) => u.rol === "Cliente").length;
        return { total, administradores, empleados, clientes };
    }, [usuarios]);

    // ==========================================
    // FILTRO DE BÚSQUEDA
    // ==========================================

    const usuariosFiltrados = useMemo(() => {
        return usuarios.filter((u) => {
            const coincideRol = filtroRol === "Todos" || u.rol === filtroRol;

            const texto = busqueda.trim().toLowerCase();
            const coincideBusqueda =
                !texto ||
                u.nombre?.toLowerCase().includes(texto) ||
                u.apellido?.toLowerCase().includes(texto) ||
                u.correo?.toLowerCase().includes(texto) ||
                u.numeroDocumento?.toLowerCase().includes(texto);

            return coincideRol && coincideBusqueda;
        });
    }, [usuarios, busqueda, filtroRol]);

    // ==========================================
    // CAMBIAR ESTADO
    // ==========================================

    const cambiarEstado = async (usuario) => {
        setAccionando(usuario.id);

        try {
            const respuesta = await fetch(
                `${API_URL}/usuarios/${usuario.id}/estado`,
                {
                    method: "PATCH",
                    headers: headersAuth(),
                }
            );

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(
                    datos.message || "No se pudo cambiar el estado."
                );
            }

            setUsuarios((prev) =>
                prev.map((u) =>
                    u.id === usuario.id ? { ...u, estado: datos.usuario.estado } : u
                )
            );
        } catch (err) {
            console.error("❌ Error al cambiar estado:", err);
            mostrarToast(err.message || "No se pudo cambiar el estado.", "error");
        } finally {
            setAccionando(null);
        }
    };

    // ==========================================
    // ELIMINAR USUARIO
    // ==========================================

    const eliminarUsuario = async (usuario) => {
        const aceptado = await confirmar({
            titulo: "Eliminar usuario",
            mensaje: `¿Seguro que quieres eliminar a ${usuario.nombre} ${usuario.apellido}? Esta acción no se puede deshacer.`,
            confirmarTexto: "Eliminar",
            peligro: true,
        });

        if (!aceptado) return;

        setAccionando(usuario.id);

        try {
            const respuesta = await fetch(
                `${API_URL}/usuarios/${usuario.id}`,
                {
                    method: "DELETE",
                    headers: headersAuth(),
                }
            );

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(
                    datos.message || "No se pudo eliminar el usuario."
                );
            }

            setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
        } catch (err) {
            console.error("❌ Error al eliminar usuario:", err);
            mostrarToast(err.message || "No se pudo eliminar el usuario.", "error");
        } finally {
            setAccionando(null);
        }
    };

    // ==========================================
    // ABRIR / GUARDAR EDICIÓN
    // ==========================================

    const abrirEdicion = (usuario) => {
        setUsuarioEditando(usuario);
        setErrorEdicion("");
        setFormEditar({
            nombre: usuario.nombre || "",
            apellido: usuario.apellido || "",
            tipoDocumento: usuario.tipoDocumento || "CC",
            numeroDocumento: usuario.numeroDocumento || "",
            direccion: usuario.direccion || "",
            telefono: usuario.telefono || "",
        });
    };

    const guardarEdicion = async (e) => {
        e.preventDefault();
        setGuardandoEdicion(true);
        setErrorEdicion("");

        try {
            const respuesta = await fetch(
                `${API_URL}/usuarios/${usuarioEditando.id}`,
                {
                    method: "PUT",
                    headers: headersAuth(),
                    body: JSON.stringify(formEditar),
                }
            );

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(
                    datos.message || "No se pudo actualizar el usuario."
                );
            }

            setUsuarios((prev) =>
                prev.map((u) =>
                    u.id === usuarioEditando.id ? datos.usuario : u
                )
            );

            setUsuarioEditando(null);
        } catch (err) {
            console.error("❌ Error al actualizar usuario:", err);
            setErrorEdicion(err.message || "No se pudo actualizar el usuario.");
        } finally {
            setGuardandoEdicion(false);
        }
    };

    // ==========================================
    // CREAR EMPLEADO / ADMINISTRADOR
    // ==========================================

    const handleChangeCrear = (e) => {
        const { name, value } = e.target;
        setFormCrear((prev) => ({ ...prev, [name]: value }));
        setErrorCrear("");
    };

    const crearUsuarioInterno = async (e) => {
        e.preventDefault();
        setCreando(true);
        setErrorCrear("");

        try {
            const respuesta = await fetch(
                `${API_URL}/auth/crear-usuario-interno`,
                {
                    method: "POST",
                    headers: headersAuth(),
                    body: JSON.stringify(formCrear),
                }
            );

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(
                    datos.message || "No se pudo crear el usuario."
                );
            }

            setMostrarCrear(false);
            setFormCrear({
                nombre: "",
                apellido: "",
                tipoDocumento: "CC",
                numeroDocumento: "",
                direccion: "",
                telefono: "",
                correo: "",
                password: "",
                rol: "Cliente",
            });

            cargarUsuarios();
        } catch (err) {
            console.error("❌ Error al crear usuario interno:", err);
            setErrorCrear(err.message || "No se pudo crear el usuario.");
        } finally {
            setCreando(false);
        }
    };

    // ==========================================
    // REPORTE EN PDF
    // ==========================================

    const descargarReportePdf = async () => {
        setDescargandoReporte(true);
        try {
            const params = new URLSearchParams();
            if (filtroRol !== "Todos") params.set("rol", filtroRol);
            const query = params.toString();

            const respuesta = await fetch(
                `${API_URL}/reportes/usuarios/pdf${query ? `?${query}` : ""}`,
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
            enlace.download = "reporte_usuarios.pdf";
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

    const colorRol = (rol) => {
        if (rol === "Administrador")
            return "border-purple-400/30 bg-purple-400/10 text-purple-300";
        if (rol === "Empleado")
            return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
        return "border-slate-500/30 bg-slate-500/10 text-slate-300";
    };

    return (
        <PanelLayout rol="Administrador" seccionActiva="usuarios" subtitulo="Gestión de usuarios">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">

                {/* ENCABEZADO */}

                <header className="overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-[#0b1120] to-slate-900/70 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] sm:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 sm:flex">
                                <IconUsers className="h-6 w-6" />
                            </span>
                            <div>
                                <h1 className="flex items-center gap-2 text-2xl font-black text-white sm:text-3xl">
                                    <IconUsers className="h-6 w-6 text-cyan-300 sm:hidden" />
                                    Gestión de usuarios
                                </h1>
                                <p className="mt-1 text-sm text-slate-400">
                                    Administra clientes, empleados y administradores del sistema.
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
                                onClick={() => setMostrarCrear(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-cyan-300 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)]"
                            >
                                <span className="text-lg leading-none">+</span> Crear usuario
                            </button>
                        </div>
                    </div>

                    {/* ESTADÍSTICAS */}
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total</p>
                            <p className="mt-1 text-2xl font-black text-white">{estadisticas.total}</p>
                        </div>
                        <div className="rounded-xl border border-purple-400/20 bg-purple-400/5 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-purple-300/80">Admins</p>
                            <p className="mt-1 text-2xl font-black text-purple-300">{estadisticas.administradores}</p>
                        </div>
                        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-cyan-300/80">Empleados</p>
                            <p className="mt-1 text-2xl font-black text-cyan-300">{estadisticas.empleados}</p>
                        </div>
                        <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Clientes</p>
                            <p className="mt-1 text-2xl font-black text-slate-200">{estadisticas.clientes}</p>
                        </div>
                    </div>
                </header>

                {/* BUSCADOR Y FILTROS */}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre, correo o documento..."
                            className="w-full rounded-xl border border-slate-700/70 bg-slate-950/50 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-cyan-400/60"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {["Todos", "Cliente", "Empleado", "Administrador"].map((opcion) => (
                            <button
                                key={opcion}
                                onClick={() => setFiltroRol(opcion)}
                                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                                    filtroRol === opcion
                                        ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-300"
                                        : "border-slate-700/70 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                                }`}
                            >
                                {opcion}
                            </button>
                        ))}
                    </div>
                </div>

                {/* TABLA */}

                <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#0b1120]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">

                    {cargando && (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700/70 bg-slate-900/40 text-xs uppercase tracking-wide text-slate-400">
                                        <th className="px-5 py-3 font-bold">Usuario</th>
                                        <th className="px-5 py-3 font-bold">Documento</th>
                                        <th className="px-5 py-3 font-bold">Teléfono</th>
                                        <th className="px-5 py-3 font-bold">Rol</th>
                                        <th className="px-5 py-3 font-bold">Estado</th>
                                        <th className="px-5 py-3 font-bold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="border-b border-slate-800 last:border-0">
                                            {Array.from({ length: 6 }).map((__, j) => (
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
                                onClick={cargarUsuarios}
                                className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-400/50"
                            >
                                <IconRefresh className="h-4 w-4" /> Reintentar
                            </button>
                        </div>
                    )}

                    {!cargando && !error && usuariosFiltrados.length === 0 && (
                        <div className="flex flex-col items-center gap-3 p-12 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-500">
                                <IconUsers className="h-6 w-6" />
                            </span>
                            <p className="text-sm text-slate-400">No se encontraron usuarios.</p>
                        </div>
                    )}

                    {!cargando && !error && usuariosFiltrados.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700/70 bg-slate-900/40 text-xs uppercase tracking-wide text-slate-400">
                                        <th className="px-5 py-3 font-bold">Usuario</th>
                                        <th className="px-5 py-3 font-bold">Documento</th>
                                        <th className="px-5 py-3 font-bold">Teléfono</th>
                                        <th className="px-5 py-3 font-bold">Rol</th>
                                        <th className="px-5 py-3 font-bold">Estado</th>
                                        <th className="px-5 py-3 font-bold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuariosFiltrados.map((usuario) => (
                                        <tr
                                            key={usuario.id}
                                            className="border-b border-slate-800 transition last:border-0 hover:bg-slate-900/40"
                                        >
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-gradient-to-br from-cyan-400/15 to-blue-500/15 text-xs font-black text-cyan-300">
                                                        {iniciales(usuario.nombre, usuario.apellido)}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-white">
                                                            {usuario.nombre} {usuario.apellido}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            {usuario.correo}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3 text-slate-300">
                                                {usuario.tipoDocumento} {usuario.numeroDocumento}
                                            </td>

                                            <td className="px-5 py-3 text-slate-300">
                                                {usuario.telefono}
                                            </td>

                                            <td className="px-5 py-3">
                                                <span
                                                    className={`rounded-full border px-3 py-1 text-xs font-bold ${colorRol(
                                                        usuario.rol
                                                    )}`}
                                                >
                                                    {usuario.rol}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3">
                                                <button
                                                    onClick={() => cambiarEstado(usuario)}
                                                    disabled={accionando === usuario.id}
                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition disabled:opacity-50 ${
                                                        usuario.estado === "Activo"
                                                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                                                            : "border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/20"
                                                    }`}
                                                    title="Clic para cambiar estado"
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${
                                                            usuario.estado === "Activo" ? "bg-emerald-400" : "bg-red-400"
                                                        }`}
                                                    />
                                                    {usuario.estado}
                                                </button>
                                            </td>

                                            <td className="px-5 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => abrirEdicion(usuario)}
                                                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        onClick={() => eliminarUsuario(usuario)}
                                                        disabled={accionando === usuario.id}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                                                    >
                                                        <IconTrash className="h-3.5 w-3.5" /> Eliminar
                                                    </button>
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
                    Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
                </p>

            </div>

            {/* ==========================================
                MODAL: EDITAR USUARIO
            ========================================== */}

            {usuarioEditando && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-700/70 bg-[#0b1120] p-6 shadow-2xl">

                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                                    <IconUsers className="h-5 w-5" />
                                </span>
                                <div>
                                    <h2 className="text-lg font-black text-white">
                                        Editar usuario
                                    </h2>
                                    <p className="text-sm text-slate-400">
                                        {usuarioEditando.correo}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setUsuarioEditando(null)}
                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                                aria-label="Cerrar"
                            >
                                <IconX className="h-5 w-5" />
                            </button>
                        </div>

                        {errorEdicion && (
                            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
                                <IconWarning className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                {errorEdicion}
                            </div>
                        )}

                        <form onSubmit={guardarEdicion} className="mt-5 grid gap-3 sm:grid-cols-2">

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Nombre</label>
                                <input
                                    value={formEditar.nombre}
                                    onChange={(e) => setFormEditar((p) => ({ ...p, nombre: e.target.value }))}
                                    maxLength={50}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Apellido</label>
                                <input
                                    value={formEditar.apellido}
                                    onChange={(e) => setFormEditar((p) => ({ ...p, apellido: e.target.value }))}
                                    maxLength={50}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Tipo doc.</label>
                                <select
                                    value={formEditar.tipoDocumento}
                                    onChange={(e) => setFormEditar((p) => ({ ...p, tipoDocumento: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                >
                                    <option value="CC">CC</option>
                                    <option value="CE">CE</option>
                                    <option value="TI">TI</option>
                                    <option value="PASAPORTE">PASAPORTE</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">N° documento</label>
                                <input
                                    value={formEditar.numeroDocumento}
                                    onChange={(e) => setFormEditar((p) => ({ ...p, numeroDocumento: e.target.value }))}
                                    maxLength={20}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Dirección</label>
                                <input
                                    value={formEditar.direccion}
                                    onChange={(e) => setFormEditar((p) => ({ ...p, direccion: e.target.value }))}
                                    maxLength={150}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Teléfono</label>
                                <input
                                    value={formEditar.telefono}
                                    onChange={(e) => setFormEditar((p) => ({ ...p, telefono: e.target.value }))}
                                    maxLength={15}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                                />
                            </div>

                            <div className="sm:col-span-2 mt-2 flex justify-end gap-3 border-t border-slate-800 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setUsuarioEditando(null)}
                                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:border-slate-500"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={guardandoEdicion}
                                    className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
                                >
                                    {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* ==========================================
                MODAL: CREAR EMPLEADO / ADMIN
            ========================================== */}

            {mostrarCrear && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700/70 bg-[#0b1120] p-6 shadow-2xl">

                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                                    <IconUsers className="h-5 w-5" />
                                </span>
                                <h2 className="text-lg font-black text-white">
                                    Crear usuario
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMostrarCrear(false)}
                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                                aria-label="Cerrar"
                            >
                                <IconX className="h-5 w-5" />
                            </button>
                        </div>

                        {errorCrear && (
                            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
                                <IconWarning className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                {errorCrear}
                            </div>
                        )}

                        <form onSubmit={crearUsuarioInterno} className="mt-5 grid gap-3 sm:grid-cols-2">

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Nombre</label>
                                <input name="nombre" value={formCrear.nombre} onChange={handleChangeCrear} maxLength={50} required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60" />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Apellido</label>
                                <input name="apellido" value={formCrear.apellido} onChange={handleChangeCrear} maxLength={50} required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60" />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Tipo doc.</label>
                                <select name="tipoDocumento" value={formCrear.tipoDocumento} onChange={handleChangeCrear}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60">
                                    <option value="CC">CC</option>
                                    <option value="CE">CE</option>
                                    <option value="TI">TI</option>
                                    <option value="PASAPORTE">PASAPORTE</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">N° documento</label>
                                <input name="numeroDocumento" value={formCrear.numeroDocumento} onChange={handleChangeCrear} maxLength={20} required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60" />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Dirección</label>
                                <input name="direccion" value={formCrear.direccion} onChange={handleChangeCrear} maxLength={150} required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60" />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Teléfono</label>
                                <input name="telefono" value={formCrear.telefono} onChange={handleChangeCrear} maxLength={15} required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60" />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Rol</label>
                                <select name="rol" value={formCrear.rol} onChange={handleChangeCrear}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60">
                                    <option value="Cliente">Cliente</option>
                                    <option value="Empleado">Empleado</option>
                                    <option value="Administrador">Administrador</option>
                                </select>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Correo</label>
                                <input type="email" name="correo" value={formCrear.correo} onChange={handleChangeCrear} maxLength={100} required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60" />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Contraseña</label>
                                <input type="password" name="password" value={formCrear.password} onChange={handleChangeCrear} minLength={6} maxLength={30} required
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60" />
                            </div>

                            <div className="sm:col-span-2 mt-2 flex justify-end gap-3 border-t border-slate-800 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setMostrarCrear(false)}
                                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:border-slate-500"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={creando}
                                    className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
                                >
                                    {creando ? "Creando..." : "Crear usuario"}
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

export default AdminUsuarios;
