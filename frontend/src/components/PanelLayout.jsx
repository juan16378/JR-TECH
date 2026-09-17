import { Link, useNavigate } from "react-router-dom";
import { IconBox, IconChat, IconFileText, IconHome, IconLogOut, IconReceipt, IconTrendingUp, IconUsers, IconWrench } from "./Icons";
import logo from "../assets/images/logo.png";

// ==========================================
// Layout compartido de los paneles internos (Administrador y Empleado).
//
// Antes, cada página (AdminPanel, AdminUsuarios, GestionProductos, etc.)
// dibujaba su propia barra lateral o ninguna, así que al navegar entre
// secciones la barra desaparecía. Ahora todas comparten este mismo
// componente, así la barra lateral se ve siempre, sin importar en qué
// sección estés.
// ==========================================

// El Administrador y el Empleado comparten exactamente las mismas páginas
// de Productos, Servicios y Pedidos (mismas rutas /admin/...); lo único
// exclusivo del Administrador es la sección de Usuarios.
const NAV_USUARIOS = {
    id: "usuarios",
    label: "Usuarios",
    icono: IconUsers,
    ruta: "/admin/usuarios",
    color: "cyan",
};

const NAV_COMUN = [
    { id: "productos", label: "Productos", icono: IconBox, ruta: "/admin/productos", color: "blue" },
    { id: "servicios", label: "Servicios", icono: IconWrench, ruta: "/admin/servicios", color: "violet" },
    { id: "pedidos", label: "Pedidos", icono: IconReceipt, ruta: "/admin/pedidos", color: "orange" },
    { id: "facturas", label: "Facturas", icono: IconFileText, ruta: "/admin/facturas", color: "pink" },
    { id: "pqr", label: "PQR", icono: IconChat, ruta: "/admin/pqr", color: "amber" },
    { id: "estadisticas", label: "Estadísticas", icono: IconTrendingUp, ruta: "/admin/estadisticas", color: "emerald" },
];

// Clases completas y literales (mismo patrón que ya usaban AdminPanel.jsx
// y EmpleadoPanel.jsx) para que Tailwind las genere correctamente.
const COLORES = {
    cyan: "group-hover:bg-cyan-400/10",
    blue: "group-hover:bg-blue-400/10",
    violet: "group-hover:bg-violet-400/10",
    orange: "group-hover:bg-orange-400/10",
    emerald: "group-hover:bg-emerald-400/10",
    pink: "group-hover:bg-pink-400/10",
    amber: "group-hover:bg-amber-400/10",
};

function iniciales(nombre) {
    if (!nombre) return "?";
    return nombre.trim().split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function PanelLayout({ rol, seccionActiva = "inicio", subtitulo, children }) {
    const navigate = useNavigate();

    const usuarioGuardado =
        localStorage.getItem("usuario") || sessionStorage.getItem("usuario");
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

    const esAdmin = rol === "Administrador";
    const items = esAdmin ? [NAV_USUARIOS, ...NAV_COMUN] : NAV_COMUN;
    const rutaInicio = esAdmin ? "/admin" : "/empleado";
    const nombrePanel = esAdmin ? "Admin Panel" : "Employee Panel";
    const etiquetaRuta = esAdmin ? "JR TECH / ADMIN" : "JR TECH / EMPLEADO";
    const etiquetaInicio = esAdmin ? "Dashboard" : "Inicio";

    const cerrarSesion = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("usuario");
        navigate("/login");
    };

    const todosLosItems = [
        { id: "inicio", label: etiquetaInicio, ruta: rutaInicio, esInicio: true },
        ...items,
    ];

    return (
        <main className="min-h-screen bg-[#060a13] text-white">

            {/* FONDO */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-cyan-500/[0.04] blur-[130px]" />
                <div className="absolute -right-40 top-[35%] h-[500px] w-[500px] rounded-full bg-blue-500/[0.04] blur-[130px]" />
                <div
                    className="absolute inset-0 opacity-[0.025]"
                    style={{
                        backgroundImage:
                            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                        backgroundSize: "45px 45px",
                    }}
                />
            </div>

            <div className="relative flex min-h-screen">

                {/* ================================================= */}
                {/* SIDEBAR */}
                {/* ================================================= */}

                <aside className="scroll-panel hidden w-[250px] shrink-0 overflow-y-auto border-r border-slate-800/80 bg-[#080d17] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">

                    {/* LOGO */}
                    <div className="flex h-[76px] items-center border-b border-slate-800/80 px-5">
                        <div className="flex items-center gap-3">
                            <img
                                src={logo}
                                alt="JR Tech Store"
                                className="h-10 w-10 flex-shrink-0 rounded-full object-contain shadow-[0_0_25px_rgba(34,211,238,0.15)]"
                            />
                            <div>
                                <h1 className="text-sm font-black tracking-wide">JR TECH</h1>
                                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                    {nombrePanel}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* VOLVER AL SITIO */}
                    <Link
                        to="/"
                        className="flex items-center gap-2 border-b border-slate-800/80 px-5 py-3 text-xs font-semibold text-slate-500 transition hover:text-cyan-300"
                    >
                        <IconHome className="h-3.5 w-3.5" />
                        Ver sitio web
                    </Link>

                    {/* NAVEGACIÓN */}
                    <div className="flex-1 px-3 py-6">
                        <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Navegación
                        </p>

                        <nav className="space-y-1">
                            {todosLosItems.map((item) => {
                                const activo = seccionActiva === item.id;

                                if (item.esInicio) {
                                    return (
                                        <Link
                                            key={item.id}
                                            to={item.ruta}
                                            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-all ${
                                                activo
                                                    ? "border border-cyan-400/10 bg-cyan-400/[0.08] text-cyan-300"
                                                    : "border border-transparent text-slate-500 hover:bg-slate-800/60 hover:text-white"
                                            }`}
                                        >
                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10">
                                                ◈
                                            </span>
                                            {item.label}
                                        </Link>
                                    );
                                }

                                return (
                                    <Link
                                        key={item.id}
                                        to={item.ruta}
                                        className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                                            activo
                                                ? "border border-cyan-400/10 bg-cyan-400/[0.08] font-bold text-cyan-300"
                                                : "border border-transparent text-slate-500 hover:bg-slate-800/60 hover:text-white"
                                        }`}
                                    >
                                        <span
                                            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                                                activo ? "bg-cyan-400/10" : `bg-slate-800 ${COLORES[item.color]}`
                                            }`}
                                        >
                                            <item.icono className="h-4 w-4" />
                                        </span>
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* USUARIO */}
                    <div className="border-t border-slate-800/80 p-4">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-black text-cyan-300">
                                {iniciales(usuario?.nombre) || (esAdmin ? "A" : "E")}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-white">
                                    {usuario?.nombre || nombrePanel}
                                </p>
                                <p className="text-[10px] text-slate-400">{usuario?.rol || rol}</p>
                            </div>
                        </div>

                        <button
                            onClick={cerrarSesion}
                            className="group flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 px-3 py-2.5 text-xs font-bold text-slate-500 transition-all hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-400"
                        >
                            <span className="transition-transform group-hover:-translate-x-0.5">
                                <IconLogOut className="h-3.5 w-3.5" />
                            </span>
                            Cerrar sesión
                        </button>
                    </div>

                </aside>

                {/* ================================================= */}
                {/* CONTENIDO */}
                {/* ================================================= */}

                <div className="min-w-0 flex-1">

                    {/* HEADER */}
                    <header className="flex h-[76px] items-center justify-between border-b border-slate-800/80 bg-[#080d17]/80 px-5 backdrop-blur-xl sm:px-8">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                {etiquetaRuta}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-400">
                                {subtitulo || nombrePanel}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <p className="hidden text-xs font-bold text-slate-500 sm:block">Sesión activa</p>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-xs font-black text-cyan-300">
                                {iniciales(usuario?.nombre) || (esAdmin ? "A" : "E")}
                            </div>
                        </div>
                    </header>

                    {/* NAV MÓVIL (la barra lateral se oculta en pantallas pequeñas) */}
                    <nav className="flex gap-1 overflow-x-auto border-b border-slate-800/80 bg-[#080d17]/60 px-5 py-2 sm:px-8 lg:hidden">
                        {todosLosItems.map((item) => (
                            <Link
                                key={item.id}
                                to={item.ruta}
                                className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                                    seccionActiva === item.id
                                        ? "bg-cyan-400/10 text-cyan-300"
                                        : "text-slate-500 hover:bg-slate-800/60 hover:text-white"
                                }`}
                            >
                                {item.esInicio ? <span>◈</span> : <item.icono className="h-3.5 w-3.5" />}
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* MAIN */}
                    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
                        <div key={seccionActiva} className="animate-panel-in">
                            {children}
                        </div>

                        <footer className="mt-12 border-t border-slate-800/70 pt-6 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                JR TECH · {nombrePanel}
                            </p>
                        </footer>
                    </main>

                </div>

            </div>

        </main>
    );
}

export default PanelLayout;
