import { Link } from "react-router-dom";
import { IconBox, IconChat, IconFileText, IconLightbulb, IconReceipt, IconTrendingUp, IconWrench } from "../components/Icons";
import PanelLayout from "../components/PanelLayout";

function EmpleadoPanel() {
    const usuarioGuardado =
        localStorage.getItem("usuario") ||
        sessionStorage.getItem("usuario");

    const usuario = usuarioGuardado
        ? JSON.parse(usuarioGuardado)
        : null;

    const secciones = [
        {
            titulo: "Productos",
            descripcion:
                "Actualiza stock, precios y disponibilidad del catálogo.",
            icono: IconBox,
            ruta: "/admin/productos",
            color: "cyan",
            etiqueta: "Inventario",
        },
        {
            titulo: "Servicios",
            descripcion:
                "Administra los servicios que ofrece JR TECH.",
            icono: IconWrench,
            ruta: "/admin/servicios",
            color: "violet",
            etiqueta: "Servicios",
        },
        {
            titulo: "Pedidos",
            descripcion:
                "Marca pedidos como procesados, enviados o entregados.",
            icono: IconReceipt,
            ruta: "/admin/pedidos",
            color: "orange",
            etiqueta: "Operaciones",
        },
        {
            titulo: "Facturas",
            descripcion:
                "Busca y descarga las facturas generadas por cada venta.",
            icono: IconFileText,
            ruta: "/admin/facturas",
            color: "pink",
            etiqueta: "Facturación",
        },
        {
            titulo: "PQR",
            descripcion:
                "Responde las peticiones, quejas y reclamos de los clientes.",
            icono: IconChat,
            ruta: "/admin/pqr",
            color: "amber",
            etiqueta: "Atención al cliente",
        },
    ];

    const colores = {
        cyan: {
            icon:
                "border-cyan-400/20 bg-cyan-400/10 text-cyan-300 group-hover:border-cyan-400/40 group-hover:bg-cyan-400/15",
            glow: "bg-cyan-400/10",
            text: "text-cyan-400",
            gradient: "from-cyan-400 to-blue-500",
        },
        violet: {
            icon:
                "border-violet-400/20 bg-violet-400/10 text-violet-300 group-hover:border-violet-400/40 group-hover:bg-violet-400/15",
            glow: "bg-violet-400/10",
            text: "text-violet-400",
            gradient: "from-violet-400 to-purple-500",
        },
        orange: {
            icon:
                "border-orange-400/20 bg-orange-400/10 text-orange-300 group-hover:border-orange-400/40 group-hover:bg-orange-400/15",
            glow: "bg-orange-400/10",
            text: "text-orange-400",
            gradient: "from-orange-400 to-amber-500",
        },
        pink: {
            icon:
                "border-pink-400/20 bg-pink-400/10 text-pink-300 group-hover:border-pink-400/40 group-hover:bg-pink-400/15",
            glow: "bg-pink-400/10",
            text: "text-pink-400",
            gradient: "from-pink-400 to-rose-500",
        },
        amber: {
            icon:
                "border-amber-400/20 bg-amber-400/10 text-amber-300 group-hover:border-amber-400/40 group-hover:bg-amber-400/15",
            glow: "bg-amber-400/10",
            text: "text-amber-400",
            gradient: "from-amber-400 to-orange-500",
        },
    };

    return (
        <PanelLayout rol="Empleado" seccionActiva="inicio" subtitulo="Panel de operaciones">

                        {/* BIENVENIDA */}
                        <section className="mb-10">

                            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">

                                <div>

                                    <div className="mb-3 flex items-center gap-2">

                                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />

                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                                            Área de trabajo
                                        </span>

                                    </div>

                                    <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">

                                        Hola,{" "}

                                        <span className="text-cyan-400">
                                            {usuario?.nombre || "Empleado"}
                                        </span>

                                    </h2>

                                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                                        Gestiona las operaciones diarias de
                                        JR TECH de forma rápida y sencilla.
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
                                            Disponible
                                        </p>

                                    </div>

                                </div>

                            </div>

                        </section>

                        {/* ================================================= */}
                        {/* ACCIONES */}
                        {/* ================================================= */}

                        <section>

                            <div className="mb-5 flex items-end justify-between">

                                <div>

                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                        Operaciones
                                    </p>

                                    <h3 className="mt-1 text-xl font-black text-white">
                                        ¿Qué necesitas hacer?
                                    </h3>

                                </div>

                                <span className="text-xs text-slate-600">
                                    03 módulos
                                </span>

                            </div>

                            {/* TARJETAS */}
                            <div className="grid gap-5 md:grid-cols-3">

                                {secciones.map((seccion, index) => {

                                    const color = colores[seccion.color];

                                    return (
                                        <Link
                                            key={seccion.titulo}
                                            to={seccion.ruta}
                                            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0b111d] transition-all duration-300 hover:-translate-y-2 hover:border-slate-700 hover:shadow-2xl"
                                        >

                                            {/* GLOW */}
                                            <div
                                                className={`absolute -right-20 -top-20 h-44 w-44 rounded-full opacity-0 blur-3xl transition-all duration-500 group-hover:opacity-100 ${color.glow}`}
                                            />

                                            {/* LÍNEA */}
                                            <div
                                                className={`absolute left-0 top-0 h-[2px] w-0 bg-gradient-to-r transition-all duration-500 group-hover:w-full ${color.gradient}`}
                                            />

                                            <div className="relative p-6">

                                                {/* ICONO + NÚMERO */}
                                                <div className="flex items-start justify-between">

                                                    <div
                                                        className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-110 group-hover:rotate-2 ${color.icon}`}
                                                    >
                                                        <seccion.icono className="h-7 w-7" />
                                                    </div>

                                                    <span className="text-xs font-black text-slate-600">
                                                        0{index + 1}
                                                    </span>

                                                </div>

                                                {/* TÍTULO */}
                                                <div className="mt-7">

                                                    <div className="flex items-center gap-2">

                                                        <h4 className="text-xl font-black text-white transition-colors group-hover:text-cyan-300">
                                                            {seccion.titulo}
                                                        </h4>

                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                                                    </div>

                                                    <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-500">
                                                        {seccion.descripcion}
                                                    </p>

                                                </div>

                                                {/* ACCIÓN */}
                                                <div className="mt-7 border-t border-slate-800 pt-4">

                                                    <div className="flex items-center justify-between">

                                                        <div>

                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                Acceder
                                                            </p>

                                                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                                                {seccion.etiqueta}
                                                            </p>

                                                        </div>

                                                        <div className="flex items-center gap-2">

                                                            <span
                                                                className={`text-xs font-bold opacity-0 transition-all duration-300 group-hover:opacity-100 ${color.text}`}
                                                            >
                                                                Abrir
                                                            </span>

                                                            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-600 transition-all duration-300 group-hover:translate-x-1 group-hover:border-cyan-400/20 group-hover:bg-cyan-400/10 group-hover:text-cyan-300">
                                                                →
                                                            </span>

                                                        </div>

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
                                            Pedidos recibidos, pedidos por estado y servicios activos, en una sola vista.
                                        </p>
                                    </div>
                                </div>
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-600 transition-all duration-300 group-hover:translate-x-1 group-hover:border-emerald-400/20 group-hover:bg-emerald-400/10 group-hover:text-emerald-300">
                                    →
                                </span>
                            </Link>
                        </section>

                        {/* ================================================= */}
                        {/* BLOQUE DE AYUDA */}
                        {/* ================================================= */}

                        <section className="mt-8 rounded-2xl border border-slate-800 bg-[#0b111d] p-5 sm:p-6">

                            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                                <div className="flex items-start gap-4">

                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                                        <IconLightbulb className="h-5 w-5" />
                                    </div>

                                    <div>

                                        <h3 className="text-sm font-black text-white">
                                            Área de trabajo
                                        </h3>

                                        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-600">
                                            Utiliza los accesos rápidos para
                                            actualizar productos, administrar
                                            servicios o gestionar los pedidos
                                            de los clientes.
                                        </p>

                                    </div>

                                </div>

                                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-4 py-2.5">

                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                                    <span className="text-xs font-bold text-emerald-400">
                                        3 módulos disponibles
                                    </span>

                                </div>

                            </div>

                        </section>

        </PanelLayout>
    );
}

export default EmpleadoPanel;