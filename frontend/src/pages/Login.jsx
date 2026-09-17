import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import logo from "../assets/images/logo.png";
import { API_URL } from "../config";

import Input from "../components/Input";
import Button from "../components/Button";
import RegisterModal from "../components/RegisterModal";
import { IconCheckCircle, IconEye, IconEyeOff, IconLock, IconZap, IconWarning } from "../components/Icons";

function Login() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        correo: "",
        password: "",
    });

    const [recordarme, setRecordarme] = useState(false);
    const [errores, setErrores] = useState({});
    const [mostrarRegistro, setMostrarRegistro] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [tipoMensaje, setTipoMensaje] = useState("");
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [cargando, setCargando] = useState(false);

    // ==========================================
    // VALIDAR CORREO
    // ==========================================

    const validarCorreo = (correo) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    };

    // ==========================================
    // CAMBIO DE INPUT
    // ==========================================

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        setMensaje("");

        let error = "";

        if (name === "correo") {
            if (!value) {
                error = "El correo electrónico es obligatorio.";
            } else if (!validarCorreo(value)) {
                error = "Escribe un correo electrónico válido.";
            }
        }

        if (name === "password") {
            if (!value) {
                error = "La contraseña es obligatoria.";
            } else if (value.length < 6) {
                error = "La contraseña debe tener mínimo 6 caracteres.";
            }
        }

        setErrores((prev) => ({
            ...prev,
            [name]: error,
        }));
    };

    // ==========================================
    // INICIAR SESIÓN
    // ==========================================

    const iniciarSesion = async (e) => {
        e.preventDefault();

        const nuevosErrores = {};

        if (!form.correo) {
            nuevosErrores.correo =
                "El correo electrónico es obligatorio.";
        } else if (!validarCorreo(form.correo)) {
            nuevosErrores.correo =
                "Escribe un correo electrónico válido.";
        }

        if (!form.password) {
            nuevosErrores.password =
                "La contraseña es obligatoria.";
        } else if (form.password.length < 6) {
            nuevosErrores.password =
                "La contraseña debe tener mínimo 6 caracteres.";
        }

        setErrores(nuevosErrores);

        if (Object.keys(nuevosErrores).length > 0) {
            return;
        }

        setCargando(true);
        setMensaje("");
        setTipoMensaje("");

        try {
            const respuesta = await fetch(
                `${API_URL}/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        correo: form.correo,
                        password: form.password,
                    }),
                }
            );

            // ==========================================
            // PARSEO SEGURO DE LA RESPUESTA
            // (evita que un body no-JSON rompa la página)
            // ==========================================

            let datos = {};

            try {
                datos = await respuesta.json();
            } catch (parseError) {
                console.warn(
                    "⚠️ La respuesta del servidor no es JSON válido:",
                    parseError
                );
                datos = {};
            }

            if (!respuesta.ok) {
                // ==========================================
                // USUARIO NO REGISTRADO -> ABRIR REGISTRO
                // ==========================================

                const noExiste =
                    respuesta.status === 404 ||
                    datos.message
                        ?.toLowerCase()
                        .includes("no encontrado") ||
                    datos.message
                        ?.toLowerCase()
                        .includes("no registrado") ||
                    datos.message
                        ?.toLowerCase()
                        .includes("no existe");

                if (noExiste) {
                    setTipoMensaje("error");

                    setMensaje(
                        "No encontramos una cuenta con ese correo. Completa el registro para continuar."
                    );

                    setMostrarRegistro(true);
                    setCargando(false);
                    return;
                }

                // Otros errores (ej: contraseña incorrecta)
                throw new Error(
                    datos.message ||
                    "No se pudo iniciar sesión."
                );
            }

            // ==========================================
            // GUARDAR DATOS DEL USUARIO
            // ==========================================

            if (datos.token) {
                if (recordarme) {
                    localStorage.setItem(
                        "token",
                        datos.token
                    );
                } else {
                    sessionStorage.setItem(
                        "token",
                        datos.token
                    );
                }
            }

            if (datos.usuario) {
                const usuario = JSON.stringify(
                    datos.usuario
                );

                if (recordarme) {
                    localStorage.setItem(
                        "usuario",
                        usuario
                    );
                } else {
                    sessionStorage.setItem(
                        "usuario",
                        usuario
                    );
                }
            }

            // ==========================================
            // MENSAJE DE ÉXITO
            // ==========================================

            setTipoMensaje("exito");

            setMensaje(
                `¡Bienvenido ${
                    datos.usuario?.nombre || ""
                }! Iniciaste sesión como ${
                    datos.usuario?.rol || "Cliente"
                }.`
            );

            // ==========================================
            // REDIRECCIÓN SEGÚN EL ROL DEL USUARIO
            // ==========================================

            const rol = datos.usuario?.rol;

            const destino =
                rol === "Administrador"
                    ? "/admin"
                    : rol === "Empleado"
                    ? "/empleado"
                    : "/perfil";

            setTimeout(() => {
                try {
                    navigate(destino);
                } catch (navError) {
                    console.error(
                        `❌ Error al navegar a ${destino}:`,
                        navError
                    );
                }
            }, 1000);

        } catch (error) {
            console.error(
                "❌ Error al iniciar sesión:",
                error
            );

            setTipoMensaje("error");

            setMensaje(
                error.message ||
                "No se pudo iniciar sesión."
            );
        } finally {
            setCargando(false);
        }
    };

    // ==========================================
    // REGISTRO CERRADO
    // ==========================================

    const registroExitoso = () => {
        setMostrarRegistro(false);

        setForm({
            correo: "",
            password: "",
        });

        setErrores({});

        setTipoMensaje("exito");

        setMensaje(
            "Registro exitoso. Ahora puedes iniciar sesión."
        );

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 sm:px-6">

            {/* ==========================================
                FONDO
            ========================================== */}

            <div className="pointer-events-none absolute inset-0">

                <div className="absolute left-1/2 top-[-180px] h-[450px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[120px]" />

                <div className="absolute bottom-[-150px] left-[-120px] h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[120px]" />

                <div className="absolute right-[-150px] top-[30%] h-[350px] w-[350px] rounded-full bg-cyan-500/10 blur-[120px]" />

                <div
                    className="absolute inset-0 opacity-[0.08]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(34,211,238,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.35) 1px, transparent 1px)",
                        backgroundSize: "55px 55px",
                    }}
                />
            </div>

            {/* ==========================================
                TARJETA PRINCIPAL
            ========================================== */}

            <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-slate-700/70 bg-[#0b1120]/95 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl md:grid-cols-2">

                {/* ======================================
                    IZQUIERDA
                ====================================== */}

                <section className="relative hidden min-h-[650px] overflow-hidden border-r border-slate-800 bg-gradient-to-br from-[#0d1a2c] via-[#09111f] to-[#07101d] p-10 md:flex md:flex-col">

                    <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full border border-cyan-400/10" />

                    <div className="absolute right-[-30px] top-[-30px] h-52 w-52 rounded-full border border-cyan-400/5" />

                    <div className="absolute bottom-[-100px] left-[-100px] h-72 w-72 rounded-full bg-cyan-400/5 blur-3xl" />

                    {/* MARCA */}

                    <div className="relative flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10">
                            <span className="text-sm font-black text-cyan-300">
                                JR
                            </span>
                        </div>

                        <div>
                            <p className="font-black tracking-[0.18em] text-white">
                                JR TECH
                            </p>

                            <p className="text-xs font-medium text-slate-400">
                                Tecnología e innovación
                            </p>
                        </div>

                    </div>

                    {/* LOGO */}

                    <div className="relative mt-16 flex justify-center">

                        <div className="absolute h-56 w-56 animate-pulse rounded-full bg-cyan-400/10 blur-3xl" />

                        <div className="relative flex h-64 w-64 items-center justify-center rounded-full border border-cyan-400/20 bg-slate-950/50 shadow-[0_0_60px_rgba(34,211,238,0.12)] transition-all duration-500 hover:scale-105">

                            <img
                                src={logo}
                                alt="Logo JR TECH"
                                className="h-48 w-48 rounded-full object-contain drop-shadow-[0_0_25px_rgba(34,211,238,0.25)]"
                            />

                        </div>

                    </div>

                    {/* TEXTO */}

                    <div className="relative mt-12">

                        <div className="mb-4 flex items-center gap-3">

                            <span className="h-[2px] w-10 bg-cyan-400" />

                            <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                                Bienvenido
                            </span>

                        </div>

                        <h2 className="text-3xl font-black leading-tight text-white">

                            La tecnología que

                            <span className="block bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                                necesitas.
                            </span>

                        </h2>

                        <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">
                            Inicia sesión en JR TECH y disfruta de una
                            experiencia más personalizada para encontrar
                            tus productos tecnológicos favoritos.
                        </p>

                    </div>

                    {/* CARACTERÍSTICAS */}

                    <div className="relative mt-auto grid grid-cols-2 gap-3">

                        <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-3">

                            <p className="text-cyan-300"><IconZap className="h-5 w-5" /></p>

                            <p className="mt-1 text-xs font-semibold text-slate-200">
                                Rápido
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400">
                                Compra fácilmente
                            </p>

                        </div>

                        <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-3">

                            <p className="text-cyan-300"><IconLock className="h-5 w-5" /></p>

                            <p className="mt-1 text-xs font-semibold text-slate-200">
                                Seguro
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400">
                                Datos protegidos
                            </p>

                        </div>

                    </div>

                </section>

                {/* ======================================
                    DERECHA
                ====================================== */}

                <section className="relative flex items-center p-7 sm:p-10 lg:p-12">

                    <div className="pointer-events-none absolute right-0 top-0 h-52 w-52 rounded-full bg-cyan-400/5 blur-3xl" />

                    <div className="relative w-full">

                        {/* LOGO MÓVIL */}

                        <div className="mb-8 flex justify-center md:hidden">

                            <div className="relative">

                                <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-2xl" />

                                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-cyan-400/40 bg-slate-950 p-2 shadow-[0_0_35px_rgba(34,211,238,0.15)]">

                                    <img
                                        src={logo}
                                        alt="Logo JR TECH"
                                        className="h-full w-full rounded-full object-contain"
                                    />

                                </div>

                            </div>

                        </div>

                        {/* ENCABEZADO */}

                        <div className="mb-8">

                            <div className="mb-3 flex items-center gap-2">

                                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />

                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                                    Acceso seguro
                                </span>

                            </div>

                            <h1 className="text-3xl font-black text-white sm:text-4xl">
                                Iniciar sesión
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-slate-300">
                                Accede a tu cuenta y continúa disfrutando
                                de JR TECH.
                            </p>

                        </div>

                        {/* MENSAJE */}

                        {mensaje && (
                            <div
                                className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${
                                    tipoMensaje === "exito"
                                        ? "border-emerald-400/30 bg-emerald-400/10"
                                        : "border-red-400/30 bg-red-400/10"
                                }`}
                            >

                                <div
                                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-black ${
                                        tipoMensaje === "exito"
                                            ? "bg-emerald-400 text-slate-950"
                                            : "bg-red-400 text-white"
                                    }`}
                                >
                                    {tipoMensaje === "exito"
                                        ? <IconCheckCircle className="h-4 w-4" />
                                        : <IconWarning className="h-4 w-4" />}
                                </div>

                                <div>

                                    <p
                                        className={`font-bold ${
                                            tipoMensaje === "exito"
                                                ? "text-emerald-300"
                                                : "text-red-300"
                                        }`}
                                    >
                                        {tipoMensaje === "exito"
                                            ? "¡Correcto!"
                                            : "Error"}
                                    </p>

                                    <p
                                        className={`mt-1 text-sm leading-5 ${
                                            tipoMensaje === "exito"
                                                ? "text-emerald-200/80"
                                                : "text-red-200/80"
                                        }`}
                                    >
                                        {mensaje}
                                    </p>

                                </div>

                            </div>
                        )}

                        {/* FORMULARIO */}

                        <form
                            onSubmit={iniciarSesion}
                            className="space-y-5"
                        >

                            {/* CORREO */}

                            <Input
                                label="Correo electrónico"
                                name="correo"
                                type="email"
                                value={form.correo}
                                onChange={handleChange}
                                error={errores.correo}
                                placeholder="ejemplo@correo.com"
                                maxLength={100}
                            />

                            {/* PASSWORD */}

                            <div className="relative">

                                <Input
                                    label="Contraseña"
                                    name="password"
                                    type={
                                        mostrarPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={form.password}
                                    onChange={handleChange}
                                    error={errores.password}
                                    placeholder="••••••••"
                                    maxLength={30}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setMostrarPassword(
                                            (prev) => !prev
                                        )
                                    }
                                    className="absolute right-3 top-[38px] rounded-lg px-2 py-1 text-slate-300 transition-all hover:bg-slate-700/70 hover:text-cyan-300"
                                    aria-label={
                                        mostrarPassword
                                            ? "Ocultar contraseña"
                                            : "Mostrar contraseña"
                                    }
                                >
                                    {mostrarPassword
                                        ? <IconEyeOff className="h-4 w-4" />
                                        : <IconEye className="h-4 w-4" />}
                                </button>

                            </div>

                            {/* RECORDAR / RECUPERAR */}

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-300">

                                    <input
                                        type="checkbox"
                                        checked={recordarme}
                                        onChange={(e) =>
                                            setRecordarme(
                                                e.target.checked
                                            )
                                        }
                                        className="h-4 w-4 cursor-pointer accent-cyan-400"
                                    />

                                    Recordarme

                                </label>

                                <Link
                                    to="/recuperar"
                                    className="text-sm font-bold text-cyan-300 transition hover:text-cyan-200 hover:underline"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>

                            </div>

                            {/* BOTÓN */}

                            <div className="pt-2">

                                <Button
                                    type="submit"
                                    disabled={cargando}
                                >
                                    {cargando ? (
                                        <span className="flex items-center justify-center gap-3">

                                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />

                                            Iniciando sesión...

                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">

                                            Iniciar sesión

                                            <span className="text-lg">
                                                →
                                            </span>

                                        </span>
                                    )}
                                </Button>

                            </div>

                        </form>

                        {/* REGISTRO */}

                        <div className="mt-8 border-t border-slate-700/70 pt-7 text-center">

                            <p className="text-sm font-medium text-slate-300">
                                ¿Todavía no tienes una cuenta?
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    setMostrarRegistro(true)
                                }
                                className="mt-2 font-black text-cyan-300 transition-all hover:text-cyan-200 hover:underline"
                            >
                                Crear una cuenta
                                <span className="ml-2">
                                    →
                                </span>
                            </button>

                        </div>

                        {/* SEGURIDAD */}

                        <div className="mt-7 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">

                            <span>
                                <IconLock className="h-3.5 w-3.5" />
                            </span>

                            <span>
                                Conexión protegida y datos seguros
                            </span>

                        </div>

                    </div>

                </section>

            </div>

            {/* ==========================================
                MODAL REGISTRO
            ========================================== */}

            {mostrarRegistro && (
                <RegisterModal
                    correoInicial={form.correo}
                    cerrar={() =>
                        setMostrarRegistro(false)
                    }
                    registroExitoso={registroExitoso}
                />
            )}

        </main>
    );
}

export default Login;