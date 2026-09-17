import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import {
  IconCart,
  IconHome,
  IconLogOut,
  IconMail,
  IconSettings,
  IconUsers,
  IconWrench,
} from "./Icons";

function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [usuario, setUsuario] = useState(null);

  const dropdownRef = useRef(null);

  const cerrarMenu = () => {
    setMenuAbierto(false);
  };

  // ==========================================
  // DETECTAR USUARIO AUTENTICADO
  // ==========================================

  useEffect(() => {
    const guardado =
      localStorage.getItem("usuario") ||
      sessionStorage.getItem("usuario");

    if (!guardado) {
      setUsuario(null);
      return;
    }

    try {
      setUsuario(JSON.parse(guardado));
    } catch (error) {
      console.error("❌ Usuario guardado inválido:", error);
      setUsuario(null);
    }
  }, [location]);

  // ==========================================
  // CERRAR DROPDOWN AL HACER CLIC AFUERA
  // ==========================================

  useEffect(() => {
    const manejarClicFuera = (evento) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(evento.target)
      ) {
        setDropdownAbierto(false);
      }
    };

    document.addEventListener("mousedown", manejarClicFuera);
    return () =>
      document.removeEventListener("mousedown", manejarClicFuera);
  }, []);

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");

    setUsuario(null);
    setDropdownAbierto(false);
    cerrarMenu();
    navigate("/login");
  };

  // ==========================================
  // DESTINO SEGÚN EL ROL
  // ==========================================

  const rutaPanel =
    usuario?.rol === "Administrador"
      ? "/admin"
      : usuario?.rol === "Empleado"
      ? "/empleado"
      : "/perfil";

  const etiquetaPanel =
    usuario?.rol === "Administrador"
      ? "Panel de administración"
      : usuario?.rol === "Empleado"
      ? "Panel de empleado"
      : "Mi perfil";

  const iniciales = (nombre) => {
    if (!nombre) return "?";
    return nombre
      .trim()
      .split(" ")
      .slice(0, 2)
      .map((palabra) => palabra[0]?.toUpperCase())
      .join("");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-400/20 bg-slate-900/95 shadow-xl backdrop-blur-md">

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* =========================
            BARRA PRINCIPAL
        ========================== */}

        <div className="flex min-h-[90px] items-center justify-between gap-6">

          {/* LOGO */}

          <Link
            to="/"
            onClick={cerrarMenu}
            className="group flex flex-shrink-0 items-center gap-3"
          >

            <div className="relative flex h-[100px] w-[100px] flex-shrink-0 items-center justify-center">

              <div className="absolute inset-1 rounded-full bg-cyan-400/20 blur-lg transition-all duration-500 group-hover:bg-cyan-400/40" />

              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/70 transition-all duration-300 group-hover:border-cyan-300 group-hover:shadow-lg group-hover:shadow-cyan-400/40" />

              <img
                src={logo}
                alt="JR Tech"
                className="relative h-[90px] w-[90px] rounded-full object-contain transition-transform duration-300 group-hover:scale-105"
              />

            </div>

            <div className="hidden sm:block">

              <h1 className="text-xl font-extrabold tracking-wide text-white transition-colors duration-300 group-hover:text-cyan-300 sm:text-2xl">
                JR TECH
              </h1>

              <p className="text-xs font-medium text-cyan-400 sm:text-sm">
                Tecnología e innovación
              </p>

            </div>

          </Link>

          {/* =========================
              MENÚ ESCRITORIO
          ========================== */}

          <div className="hidden items-center gap-8 lg:flex">

            <nav className="flex items-center gap-2">

              <Link
                to="/"
                className="rounded-lg px-4 py-2.5 font-semibold text-slate-200 transition-all duration-200 hover:bg-slate-700 hover:text-cyan-400"
              >
                Inicio
              </Link>

              <Link
                to="/quienes"
                className="rounded-lg px-4 py-2.5 font-semibold text-slate-200 transition-all duration-200 hover:bg-slate-700 hover:text-cyan-400"
              >
                Quiénes Somos
              </Link>

              <Link
                to="/contacto"
                className="rounded-lg px-4 py-2.5 font-semibold text-slate-200 transition-all duration-200 hover:bg-slate-700 hover:text-cyan-400"
              >
                Contacto
              </Link>

              <Link
                to="/productos"
                className="rounded-lg px-4 py-2.5 font-semibold text-slate-200 transition-all duration-200 hover:bg-slate-700 hover:text-cyan-400"
              >
                Productos
              </Link>

              <Link
                to="/servicios"
                className="rounded-lg px-4 py-2.5 font-semibold text-slate-200 transition-all duration-200 hover:bg-slate-700 hover:text-cyan-400"
              >
                Servicios
              </Link>

            </nav>

            {/* ================================
                SEPARADOR
            ================================= */}

            <div className="h-8 w-px bg-slate-700" />

            {/* ================================
                SESIÓN: LOGUEADO VS NO LOGUEADO
            ================================= */}

            {usuario ? (
              <div className="relative" ref={dropdownRef}>

                <button
                  onClick={() =>
                    setDropdownAbierto((prev) => !prev)
                  }
                  aria-haspopup="menu"
                  aria-expanded={dropdownAbierto}
                  className="flex items-center gap-2 rounded-full border border-slate-600 bg-slate-900/60 py-1.5 pl-1.5 pr-3 transition-all duration-200 hover:border-cyan-400/60"
                >

                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-sm font-black text-cyan-300">
                    {iniciales(usuario.nombre)}
                  </span>

                  <span className="max-w-[110px] truncate text-sm font-semibold text-slate-200">
                    {usuario.nombre}
                  </span>

                  <span
                    className={`text-xs text-slate-400 transition-transform duration-200 ${
                      dropdownAbierto ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>

                </button>

                {/* DROPDOWN */}

                <div
                  className={`absolute right-0 top-[calc(100%+10px)] w-64 origin-top-right rounded-2xl border border-slate-700 bg-slate-800 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-150 ${
                    dropdownAbierto
                      ? "scale-100 opacity-100"
                      : "pointer-events-none scale-95 opacity-0"
                  }`}
                >

                  <div className="border-b border-slate-700 px-3 py-3">
                    <p className="truncate text-sm font-bold text-white">
                      {usuario.nombre}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {usuario.correo}
                    </p>
                  </div>

                  <Link
                    to={rutaPanel}
                    onClick={() => setDropdownAbierto(false)}
                    className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-cyan-300"
                  >
                    <IconSettings className="h-4 w-4 flex-shrink-0" />
                    {etiquetaPanel}
                  </Link>

                  <button
                    onClick={cerrarSesion}
                    className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
                  >
                    <IconLogOut className="h-4 w-4 flex-shrink-0" />
                    Cerrar sesión
                  </button>

                </div>

              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-cyan-400/40"
              >
                Iniciar sesión
              </Link>
            )}

          </div>

          {/* =========================
              BOTÓN HAMBURGUESA
          ========================== */}

          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-slate-700 text-2xl text-cyan-400 transition-all duration-300 hover:border-cyan-400 hover:bg-slate-600 lg:hidden"
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
          >
            {menuAbierto ? "✕" : "☰"}
          </button>

        </div>

        {/* =========================
            MENÚ RESPONSIVE
        ========================== */}

        <div
          className={`overflow-hidden transition-all duration-300 lg:hidden ${
            menuAbierto
              ? "max-h-[560px] pb-6 opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >

          {/* TARJETA DE USUARIO (MÓVIL) */}

          {usuario && (
            <div className="mb-3 mt-2 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">

              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-sm font-black text-cyan-300">
                {iniciales(usuario.nombre)}
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {usuario.nombre}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {usuario.correo}
                </p>
              </div>

            </div>
          )}

          <nav className="flex flex-col gap-1.5 border-t border-white/10 pt-4">

            <Link
              to="/"
              onClick={cerrarMenu}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 font-semibold text-slate-200 transition-all hover:bg-slate-700 hover:text-cyan-400"
            >
              <IconHome className="h-4.5 w-4.5 flex-shrink-0" />
              Inicio
            </Link>

            <Link
              to="/quienes"
              onClick={cerrarMenu}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 font-semibold text-slate-200 transition-all hover:bg-slate-700 hover:text-cyan-400"
            >
              <IconUsers className="h-4.5 w-4.5 flex-shrink-0" />
              Quiénes Somos
            </Link>

            <Link
              to="/contacto"
              onClick={cerrarMenu}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 font-semibold text-slate-200 transition-all hover:bg-slate-700 hover:text-cyan-400"
            >
              <IconMail className="h-4.5 w-4.5 flex-shrink-0" />
              Contacto
            </Link>

            <Link
              to="/productos"
              onClick={cerrarMenu}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 font-semibold text-slate-200 transition-all hover:bg-slate-700 hover:text-cyan-400"
            >
              <IconCart className="h-4.5 w-4.5 flex-shrink-0" />
              Productos
            </Link>

            <Link
              to="/servicios"
              onClick={cerrarMenu}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 font-semibold text-slate-200 transition-all hover:bg-slate-700 hover:text-cyan-400"
            >
              <IconWrench className="h-4.5 w-4.5 flex-shrink-0" />
              Servicios
            </Link>

            <div className="my-2 h-px bg-slate-700" />

            {usuario ? (
              <>
                <Link
                  to={rutaPanel}
                  onClick={cerrarMenu}
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 font-semibold text-slate-200 transition-all hover:bg-slate-700 hover:text-cyan-400"
                >
                  <IconSettings className="h-4.5 w-4.5 flex-shrink-0" />
                  {etiquetaPanel}
                </Link>

                <button
                  onClick={cerrarSesion}
                  className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-5 py-3.5 text-center font-black text-white shadow-lg shadow-red-500/20 transition-all hover:-translate-y-0.5"
                >
                  <IconLogOut className="h-4 w-4 flex-shrink-0" />
                  Cerrar sesión
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={cerrarMenu}
                className="mt-1 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3.5 text-center font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
              >
                Iniciar sesión
              </Link>
            )}

          </nav>

        </div>

      </div>

    </header>
  );
}

export default Header;