import { useState } from "react";

import logo from "../assets/images/logo.png";
import { API_URL } from "../config";

import Input from "./Input";
import Select from "./Select";
import Button from "./Button";
import { IconCheckCircle, IconEye, IconEyeOff, IconLock } from "./Icons";

function RegisterModal({ cerrar, registroExitoso }) {

    const [form, setForm] = useState({
        nombre: "",
        apellido: "",
        tipoDocumento: "",
        documento: "",
        direccion: "",
        telefono: "",
        correo: "",
        password: "",
        confirmarPassword: "",
    });

    const [errores, setErrores] = useState({});
    const [registrado, setRegistrado] = useState(false);
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [mostrarConfirmacion, setMostrarConfirmacion] =
        useState(false);
    const [cargando, setCargando] = useState(false);
    const [errorServidor, setErrorServidor] = useState("");

    // ==========================================
    // VALIDACIÓN
    // ==========================================

    const validarCampo = (name, value, datos = form) => {

        let error = "";

        if (!value.trim()) {
            return "Este campo es obligatorio.";
        }

        if (
            name === "nombre" ||
            name === "apellido"
        ) {

            if (
                !/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(value)
            ) {
                error = "Solo se permiten letras.";
            } else if (
                value.trim().length < 2
            ) {
                error = "Mínimo 2 caracteres.";
            }
        }

        if (name === "tipoDocumento") {

            if (!value) {
                error = "Selecciona un documento.";
            }
        }

        if (name === "documento") {

            if (!/^\d+$/.test(value)) {
                error = "Solo se permiten números.";
            } else if (
                value.length < 6 ||
                value.length > 12
            ) {
                error =
                    "Debe tener entre 6 y 12 números.";
            }
        }

        if (name === "direccion") {

            if (value.trim().length < 5) {
                error = "La dirección debe tener mínimo 5 caracteres.";
            } else if (value.trim().length > 150) {
                error = "La dirección es demasiado larga.";
            }
        }

        if (name === "telefono") {

            if (!/^\d+$/.test(value)) {
                error = "Solo se permiten números.";
            } else if (
                value.length < 7 ||
                value.length > 10
            ) {
                error =
                    "Debe tener entre 7 y 10 números.";
            }
        }

        if (name === "correo") {

            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    value
                )
            ) {
                error =
                    "Ingresa un correo válido.";
            }
        }

        if (name === "password") {

            if (value.length < 8) {
                error =
                    "Mínimo 8 caracteres.";
            } else if (
                !/[A-Z]/.test(value)
            ) {
                error =
                    "Necesitas una mayúscula.";
            } else if (
                !/[0-9]/.test(value)
            ) {
                error =
                    "Necesitas un número.";
            }
        }

        if (name === "confirmarPassword") {

            if (
                value !== datos.password
            ) {
                error =
                    "Las contraseñas no coinciden.";
            }
        }

        return error;
    };

    // ==========================================
    // CAMBIAR CAMPOS
    // ==========================================

    const handleChange = (e) => {

        const { name, value } = e.target;

        const nuevosDatos = {
            ...form,
            [name]: value,
        };

        setForm(nuevosDatos);

        setErrorServidor("");

        const error = validarCampo(
            name,
            value,
            nuevosDatos
        );

        setErrores((prev) => ({
            ...prev,
            [name]: error,
        }));

        // Si cambia password, validar confirmación
        if (
            name === "password" &&
            nuevosDatos.confirmarPassword
        ) {

            const errorConfirmacion =
                validarCampo(
                    "confirmarPassword",
                    nuevosDatos.confirmarPassword,
                    nuevosDatos
                );

            setErrores((prev) => ({
                ...prev,
                confirmarPassword:
                    errorConfirmacion,
            }));
        }
    };

    // ==========================================
    // VALIDAR TODO
    // ==========================================

    const validarTodo = () => {

        const nuevosErrores = {};

        Object.entries(form).forEach(
            ([name, value]) => {

                const error = validarCampo(
                    name,
                    value,
                    form
                );

                if (error) {
                    nuevosErrores[name] =
                        error;
                }
            }
        );

        setErrores(nuevosErrores);

        return (
            Object.keys(nuevosErrores)
                .length === 0
        );
    };

    // ==========================================
    // REGISTRAR
    // ==========================================

    const registrar = async (e) => {

        e.preventDefault();

        setErrorServidor("");

        if (!validarTodo()) {
            return;
        }

        setCargando(true);

        try {

            const respuesta = await fetch(
                `${API_URL}/auth/register`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        nombre:
                            form.nombre.trim(),

                        apellido:
                            form.apellido.trim(),

                        tipoDocumento:
                            form.tipoDocumento,

                        numeroDocumento:
                            form.documento.trim(),

                        direccion:
                            form.direccion.trim(),

                        telefono:
                            form.telefono.trim(),

                        correo:
                            form.correo
                                .trim()
                                .toLowerCase(),

                        password:
                            form.password,
                    }),
                }
            );

            const datos =
                await respuesta.json();

            if (!respuesta.ok) {

                throw new Error(
                    datos.message ||
                    "No se pudo completar el registro."
                );
            }

            console.log(
                "✅ Registro exitoso:",
                datos
            );

            setRegistrado(true);

        } catch (error) {

            console.error(
                "❌ Error al registrar:",
                error
            );

            setErrorServidor(
                error.message ||
                "Ocurrió un error al registrar el usuario."
            );

        } finally {

            setCargando(false);
        }
    };

    // ==========================================
    // PROGRESO
    // ==========================================

    const camposCompletos =
        Object.values(form).filter(
            (valor) =>
                valor.trim() !== ""
        ).length;

    const progreso = Math.round(
        (camposCompletos /
            Object.keys(form).length) *
            100
    );

    // ==========================================
    // SEGURIDAD PASSWORD
    // ==========================================

    const tieneLongitud =
        form.password.length >= 8;

    const tieneMayuscula =
        /[A-Z]/.test(form.password);

    const tieneNumero =
        /[0-9]/.test(form.password);

    // ==========================================
    // REGISTRO EXITOSO
    // ==========================================

    if (registrado) {

        const irLogin = () => {

            if (registroExitoso) {

                registroExitoso();

            } else {

                cerrar();
            }
        };

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/90 p-4 backdrop-blur-md">

                <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/20 blur-3xl" />

                <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-400/30 bg-slate-900/95 p-8 text-center shadow-2xl shadow-cyan-500/20">

                    <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-2xl" />

                    {/* LOGO */}

                    <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-cyan-400 bg-slate-950 p-2 shadow-lg shadow-cyan-500/30">

                        <img
                            src={logo}
                            alt="JR TECH"
                            className="h-full w-full rounded-full object-contain"
                        />

                    </div>

                    {/* CHECK */}

                    <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30">
                        <IconCheckCircle className="h-7 w-7" />
                    </div>

                    <h2 className="mt-5 text-3xl font-black text-white">
                        ¡Registro exitoso!
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-300">
                        Tu cuenta fue creada correctamente
                        en JR TECH.
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                        Ahora puedes iniciar sesión con
                        tu correo y contraseña.
                    </p>

                    <button
                        type="button"
                        onClick={irLogin}
                        className="mt-7 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-1 hover:shadow-cyan-500/40 active:scale-[0.98]"
                    >
                        Ir a iniciar sesión →
                    </button>

                </div>

            </div>
        );
    }

    // ==========================================
    // MODAL
    // ==========================================

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/85 p-3 backdrop-blur-md sm:p-5">

            {/* LUCES */}

            <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

            <div className="pointer-events-none absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/10 blur-3xl" />

            {/* MODAL */}

            <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-900/95 shadow-2xl shadow-cyan-500/10">

                <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

                {/* CABECERA */}

                <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">

                    <div className="flex items-center gap-4">

                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/40 bg-slate-950 p-1.5 shadow-lg shadow-cyan-500/20">

                            <div className="absolute inset-0 rounded-2xl bg-cyan-400/10 blur-md" />

                            <img
                                src={logo}
                                alt="Logo JR TECH"
                                className="relative h-full w-full rounded-xl object-contain"
                            />

                        </div>

                        <div>

                            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
                                JR TECH
                            </p>

                            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                                Crear cuenta
                            </h2>

                        </div>

                    </div>

                    <button
                        type="button"
                        onClick={cerrar}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl font-bold text-slate-300 transition-all hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-400 active:scale-90"
                        aria-label="Cerrar"
                    >
                        ×
                    </button>

                </div>

                {/* PROGRESO */}

                <div className="flex-shrink-0 border-b border-white/10 bg-slate-950/50 px-5 py-3 sm:px-7">

                    <div className="mb-2 flex items-center justify-between">

                        <div className="flex items-center gap-2">

                            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />

                            <span className="text-xs font-semibold text-slate-300">
                                Progreso del registro
                            </span>

                        </div>

                        <span className="text-xs font-black text-cyan-400">
                            {progreso}%
                        </span>

                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">

                        <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 shadow-lg shadow-cyan-500/30 transition-all duration-500"
                            style={{
                                width: `${progreso}%`,
                            }}
                        />

                    </div>

                </div>

                {/* FORMULARIO */}

                <div className="overflow-y-auto">

                    <form
                        onSubmit={registrar}
                        className="p-5 sm:p-7"
                    >

                        {/* ERROR SERVIDOR */}

                        {errorServidor && (
                            <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4">

                                <p className="font-bold text-red-300">
                                    No se pudo crear la cuenta
                                </p>

                                <p className="mt-1 text-sm text-red-200/80">
                                    {errorServidor}
                                </p>

                            </div>
                        )}

                        {/* PERSONALES */}

                        <SectionTitle
                            numero="01"
                            titulo="Información personal"
                            descripcion="Cuéntanos quién eres"
                        />

                        <div className="grid gap-4 md:grid-cols-2">

                            <Input
                                label="Nombre"
                                name="nombre"
                                value={form.nombre}
                                onChange={handleChange}
                                error={errores.nombre}
                                maxLength={30}
                                placeholder="Tu nombre"
                            />

                            <Input
                                label="Apellido"
                                name="apellido"
                                value={form.apellido}
                                onChange={handleChange}
                                error={errores.apellido}
                                maxLength={40}
                                placeholder="Tu apellido"
                            />

                        </div>

                        <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                        {/* CONTACTO */}

                        <SectionTitle
                            numero="02"
                            titulo="Información de contacto"
                            descripcion="Necesitamos estos datos para identificarte"
                        />

                        <div className="grid gap-4 md:grid-cols-2">

                            <Select
                                label="Tipo de documento"
                                name="tipoDocumento"
                                value={form.tipoDocumento}
                                onChange={handleChange}
                                error={errores.tipoDocumento}
                                options={[
                                    {
                                        value: "CC",
                                        label: "Cédula de ciudadanía",
                                    },
                                    {
                                        value: "TI",
                                        label: "Tarjeta de identidad",
                                    },
                                    {
                                        value: "CE",
                                        label: "Cédula de extranjería",
                                    },
                                ]}
                            />

                            <Input
                                label="Número de documento"
                                name="documento"
                                value={form.documento}
                                onChange={handleChange}
                                error={errores.documento}
                                maxLength={12}
                                placeholder="Número de documento"
                            />

                            <Input
                                label="Dirección"
                                name="direccion"
                                value={form.direccion}
                                onChange={handleChange}
                                error={errores.direccion}
                                maxLength={150}
                                placeholder="Tu dirección"
                            />

                            <Input
                                label="Teléfono"
                                name="telefono"
                                value={form.telefono}
                                onChange={handleChange}
                                error={errores.telefono}
                                maxLength={10}
                                placeholder="3001234567"
                            />

                        </div>

                        <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                        {/* ACCESO */}

                        <SectionTitle
                            numero="03"
                            titulo="Datos de acceso"
                            descripcion="Crea tus credenciales para JR TECH"
                        />

                        <div className="grid gap-4 md:grid-cols-2">

                            <Input
                                label="Correo electrónico"
                                name="correo"
                                type="email"
                                value={form.correo}
                                onChange={handleChange}
                                error={errores.correo}
                                maxLength={100}
                                placeholder="correo@ejemplo.com"
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
                                    maxLength={30}
                                    placeholder="Mínimo 8 caracteres"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setMostrarPassword(
                                            !mostrarPassword
                                        )
                                    }
                                    aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    className="absolute right-3 top-[35px] rounded-lg px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-cyan-600"
                                >
                                    {mostrarPassword
                                        ? <IconEyeOff className="h-4 w-4" />
                                        : <IconEye className="h-4 w-4" />}
                                </button>

                            </div>

                            {/* CONFIRMAR */}

                            <div className="relative md:col-span-2">

                                <Input
                                    label="Confirmar contraseña"
                                    name="confirmarPassword"
                                    type={
                                        mostrarConfirmacion
                                            ? "text"
                                            : "password"
                                    }
                                    value={
                                        form.confirmarPassword
                                    }
                                    onChange={handleChange}
                                    error={
                                        errores.confirmarPassword
                                    }
                                    maxLength={30}
                                    placeholder="Repite tu contraseña"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setMostrarConfirmacion(
                                            !mostrarConfirmacion
                                        )
                                    }
                                    aria-label={mostrarConfirmacion ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    className="absolute right-3 top-[35px] rounded-lg px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-cyan-600"
                                >
                                    {mostrarConfirmacion
                                        ? <IconEyeOff className="h-4 w-4" />
                                        : <IconEye className="h-4 w-4" />}
                                </button>

                            </div>

                        </div>

                        {/* SEGURIDAD */}

                        {form.password && (
                            <div className="mt-4 rounded-2xl border border-cyan-400/10 bg-slate-950/70 p-4">

                                <div className="mb-3 flex items-center justify-between">

                                    <span className="text-xs font-bold text-slate-300">
                                        Seguridad de contraseña
                                    </span>

                                    {tieneLongitud &&
                                    tieneMayuscula &&
                                    tieneNumero ? (
                                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                                            <IconCheckCircle className="h-3.5 w-3.5" /> Segura
                                        </span>
                                    ) : (
                                        <span className="text-xs font-semibold text-amber-400">
                                            En progreso
                                        </span>
                                    )}

                                </div>

                                <div className="flex flex-wrap gap-2">

                                    <PasswordRequirement
                                        activo={
                                            tieneLongitud
                                        }
                                        texto="8 caracteres"
                                    />

                                    <PasswordRequirement
                                        activo={
                                            tieneMayuscula
                                        }
                                        texto="Mayúscula"
                                    />

                                    <PasswordRequirement
                                        activo={
                                            tieneNumero
                                        }
                                        texto="Número"
                                    />

                                </div>

                            </div>
                        )}

                        {/* BOTONES */}

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                            <button
                                type="button"
                                onClick={cerrar}
                                className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.98]"
                            >
                                Cancelar
                            </button>

                            <div className="sm:min-w-[210px]">

                                <Button
                                    type="submit"
                                    disabled={cargando}
                                >

                                    {cargando ? (
                                        <span className="flex items-center justify-center gap-3">

                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />

                                            Creando cuenta...

                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">

                                            Crear cuenta

                                            <span className="text-lg">
                                                →
                                            </span>

                                        </span>
                                    )}

                                </Button>

                            </div>

                        </div>

                        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">

                            <span>
                                <IconLock className="h-3.5 w-3.5" />
                            </span>

                            <span>
                                Tus datos están protegidos por JR TECH
                            </span>

                        </div>

                    </form>

                </div>

            </div>

        </div>
    );
}

// ============================================
// TÍTULO DE SECCIÓN
// ============================================

function SectionTitle({
    numero,
    titulo,
    descripcion,
}) {

    return (
        <div className="mb-4 flex items-center gap-3">

            <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-xs font-black text-cyan-400">
                {numero}
            </div>

            <div>

                <h3 className="text-sm font-black text-white">
                    {titulo}
                </h3>

                <p className="text-xs text-slate-400">
                    {descripcion}
                </p>

            </div>

        </div>
    );
}

// ============================================
// REQUISITO CONTRASEÑA
// ============================================

function PasswordRequirement({
    activo,
    texto,
}) {

    return (
        <span
            className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-300 ${
                activo
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                    : "border-slate-700 bg-slate-800 text-slate-500"
            }`}
        >
            <span className="inline-flex items-center gap-1">
                {activo ? <IconCheckCircle className="h-3 w-3" /> : <span className="inline-block h-1.5 w-1.5 rounded-full border border-current" />}
                {texto}
            </span>
        </span>
    );
}

export default RegisterModal;