import { Link } from "react-router-dom";
import { IconBox, IconChat, IconFileText, IconReceipt, IconTrendingUp, IconUsers, IconWrench } from "../components/Icons";
import PanelLayout from "../components/PanelLayout";

function AdminPanel() {
    const usuarioGuardado =
        localStorage.getItem("usuario") ||
        sessionStorage.getItem("usuario");

    const usuario = usuarioGuardado
        ? JSON.parse(usuarioGuardado)
        : null;

    const secciones = [
        {
            titulo: "Usuarios",
            descripcion:
                "Administra clientes, empleados y administradores.",
            detalle: "Gestión de usuarios",
            icono: IconUsers,
            ruta: "/admin/usuarios",
            color: "cyan",
        },
        {
            titulo: "Productos",
            descripcion:
                "Controla el catálogo, precios, stock y disponibilidad.",
            detalle: "Gestión del catálogo",
            icono: IconBox,
            ruta: "/admin/productos",
            color: "blue",
        },
        {
            titulo: "Servicios",
            descripcion:
                "Administra los servicios disponibles de JR TECH.",
            detalle: "Gestión de servicios",
            icono: IconWrench,
            ruta: "/admin/servicios",
            color: "violet",
        },
        {
            titulo: "Pedidos",
            descripcion:
                "Consulta y gestiona los pedidos realizados.",
            detalle: "Gestión de pedidos",
            icono: IconReceipt,
            ruta: "/admin/pedidos",
            color: "orange",
        },
        {
            titulo: "Facturas",
            descripcion:
                "Busca, descarga y anula las facturas generadas por cada venta.",
            detalle: "Gestión de facturas",
            icono: IconFileText,
            ruta: "/admin/facturas",
            color: "pink",
        },
        {
            titulo: "PQR",
            descripcion:
                "Responde peticiones, quejas y reclamos de los clientes.",
            detalle: "Atención al cliente",
            icono: IconChat,
            ruta: "/admin/pqr",
            color: "amber",
        },
    ];

    const getColorClasses = (color) => {
        const colores = {
            cyan: {
                icon:
                    "border-cyan-400/20 bg-cyan-400/10 text-cyan-300 group-hover:border-cyan-400/40 group-hover:bg-cyan-400/15",
                line: "from-cyan-400 to-cyan-600",
                text: "text-cyan-400",
                glow: "bg-cyan-400/10",
            },
            blue: {
                icon:
                    "border-blue-400/20 bg-blue-400/10 text-blue-300 group-hover:border-blue-400/40 group-hover:bg-blue-400/15",
                line: "from-blue-400 to-blue-600",
                text: "text-blue-400",
                glow: "bg-blue-400/10",
            },
            violet: {
                icon:
                    "border-violet-400/20 bg-violet-400/10 text-violet-300 group-hover:border-violet-400/40 group-hover:bg-violet-400/15",
                line: "from-violet-400 to-violet-600",
                text: "text-violet-400",
                glow: "bg-violet-400/10",
            },
            orange: {
                icon:
                    "border-orange-400/20 bg-orange-400/10 text-orange-300 group-hover:border-orange-400/40 group-hover:bg-orange-400/15",
                line: "from-orange-400 to-orange-600",
                text: "text-orange-400",
                glow: "bg-orange-400/10",
            },
            pink: {
                icon:
                    "border-pink-400/20 bg-pink-400/10 text-pink-300 group-hover:border-pink-400/40 group-hover:bg-pink-400/15",
                line: "from-pink-400 to-pink-600",
                text: "text-pink-400",
                glow: "bg-pink-400/10",
            },
            amber: {
                icon:
                    "border-amber-400/20 bg-amber-400/10 text-amber-300 group-hover:border-amber-400/40 group-hover:bg-amber-400/15",
                line: "from-amber-400 to-amber-600",
                text: "text-amber-400",
                glow: "bg-amber-400/10",
            },
        };

        return colores[color];
    };

    return (
        <PanelLayout rol="Administrador" seccionActiva="inicio" subtitulo="Panel principal">

                        {/* ================================================= */}
                        {/* BIENVENIDA */}
                        {/* ================================================= */}

                        <section className="mb-10">

                            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">

                                <div>

                                    <div className="mb-3 flex items-center gap-2">

                                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />

                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                                            Bienvenido al sistema
                                        </span>

                                    </div>

                                    <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                                        Hola,{" "}
                                        <span className="text-cyan-400">
                                            {usuario?.nombre ||
                                                "Administrador"}
                                        </span>
                                    </h2>

                                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                                        Administra todos los recursos de
                                        JR TECH desde un solo lugar.
                                    </p>

                                </div>

                                {/* ESTADO */}
                                <div className="flex w-fit items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3">

                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10">
                                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                                    </div>

                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-400">
                                            Estado
                                        </p>

                                        <p className="text-xs font-bold text-emerald-400">
                                            Operativo
                                        </p>
                                    </div>

                                </div>

                            </div>

                        </section>

                        {/* ================================================= */}
                        {/* ACCESOS */}
                        {/* ================================================= */}

                        <section>

                            <div className="mb-5">

                                <div className="flex items-center justify-between">

                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                            Gestión
                                        </p>

                                        <h3 className="mt-1 text-xl font-black text-white">
                                            Accesos rápidos
                                        </h3>
                                    </div>

                                    <span className="text-xs text-slate-600">
                                        04 módulos
                                    </span>

                                </div>

                            </div>

                            {/* GRID */}
                            <div className="grid gap-4 md:grid-cols-2">

                                {secciones.map((seccion, index) => {

                                    const colores =
                                        getColorClasses(seccion.color);

                                    return (
                                        <Link
                                            key={seccion.titulo}
                                            to={seccion.ruta}
                                            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0b111d] transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl"
                                        >

                                            {/* GLOW */}
                                            <div
                                                className={`absolute -right-24 -top-24 h-48 w-48 rounded-full opacity-0 blur-3xl transition duration-500 group-hover:opacity-100 ${colores.glow}`}
                                            />

                                            {/* BORDE SUPERIOR */}
                                            <div
                                                className={`absolute left-0 top-0 h-[2px] w-0 bg-gradient-to-r transition-all duration-500 group-hover:w-full ${colores.line}`}
                                            />

                                            <div className="relative p-6">

                                                {/* TOP */}
                                                <div className="flex items-start justify-between">

                                                    <div
                                                        className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-110 ${colores.icon}`}
                                                    >
                                                        <seccion.icono className="h-6 w-6" />
                                                    </div>

                                                    <span className="text-xs font-black text-slate-600">
                                                        0{index + 1}
                                                    </span>

                                                </div>

                                                {/* INFO */}
                                                <div className="mt-6">

                                                    <div className="flex items-center gap-2">

                                                        <h4 className="text-xl font-black text-white transition-colors group-hover:text-cyan-300">
                                                            {seccion.titulo}
                                                        </h4>

                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                                                    </div>

                                                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                                                        {seccion.descripcion}
                                                    </p>

                                                </div>

                                                {/* FOOTER TARJETA */}
                                                <div className="mt-7 flex items-center justify-between border-t border-slate-800 pt-4">

                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                            Módulo
                                                        </p>

                                                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                                            {seccion.detalle}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2">

                                                        <span
                                                            className={`text-xs font-bold opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 ${colores.text}`}
                                                        >
                                                            Abrir
                                                        </span>

                                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-600 transition-all duration-300 group-hover:translate-x-1 group-hover:border-cyan-400/20 group-hover:bg-cyan-400/10 group-hover:text-cyan-300">
                                                            →
                                                        </span>

                                                    </div>

                                                </div>

                                            </div>

                                        </Link>
                                    );
                                })}

                            </div>

                        </section>

                        {/* ================================================= */}
                        {/* ENLACE A ESTADÍSTICAS */}
                        {/* ================================================= */}

                        <section className="mt-8">
                            <Link
                                to="/admin/estadisticas"
                                className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#0b111d] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/30 hover:shadow-2xl sm:p-6"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 transition-transform duration-300 group-hover:scale-110">
                                        <IconTrendingUp className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white">Diagramas de estadísticas</h3>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            Ingresos, pedidos por estado y catálogo por categoría, en una sola vista.
                                        </p>
                                    </div>
                                </div>
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-600 transition-all duration-300 group-hover:translate-x-1 group-hover:border-emerald-400/20 group-hover:bg-emerald-400/10 group-hover:text-emerald-300">
                                    →
                                </span>
                            </Link>
                        </section>

        </PanelLayout>
    );
}

export default AdminPanel;