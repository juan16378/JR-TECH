import { useState } from "react";
import { Link } from "react-router-dom";

import logo from "../assets/images/logo.png";
import { API_URL } from "../config";
import Input from "../components/Input";
import Button from "../components/Button";
import { IconCheckCircle } from "../components/Icons";

function RecoverPassword() {
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [errorServidor, setErrorServidor] = useState("");
  const [cargando, setCargando] = useState(false);

  const validarCorreo = (correo) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  };

  const handleChange = (e) => {
    const valor = e.target.value;

    setCorreo(valor);
    setMensaje("");
    setErrorServidor("");

    if (!valor) {
      setError("El correo es obligatorio.");
    } else if (!validarCorreo(valor)) {
      setError("Ingresa un correo válido.");
    } else {
      setError("");
    }
  };

  const recuperar = async (e) => {
    e.preventDefault();

    if (!correo || !validarCorreo(correo)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    setError("");
    setErrorServidor("");
    setMensaje("");
    setCargando(true);

    try {
      const respuesta = await fetch(
        `${API_URL}/auth/olvide-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo: correo.trim().toLowerCase() }),
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
          datos.message || "No se pudo procesar la solicitud."
        );
      }

      setMensaje(
        datos.message ||
        "Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña."
      );
    } catch (error) {
      console.error("❌ Error al solicitar recuperación:", error);
      setErrorServidor(
        error.message || "No se pudo procesar la solicitud. Intenta de nuevo."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">

      {/* Luces decorativas */}

      <div className="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />

      <div className="absolute -right-32 bottom-1/4 h-72 w-72 rounded-full bg-blue-600/15 blur-3xl" />

      {/* TARJETA */}

      <div className="relative w-full max-w-[430px] overflow-hidden rounded-[28px] border border-cyan-400/20 bg-slate-900 shadow-2xl shadow-cyan-500/10">

        {/* Línea superior */}

        <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400" />

        <div className="p-7 sm:p-8">

          {/* LOGO */}

          <div className="flex justify-center">

            <div className="relative flex h-28 w-28 items-center justify-center rounded-[28px] border-2 border-cyan-400/40 bg-slate-950 p-2 shadow-xl shadow-cyan-500/20">

              <div className="absolute inset-0 rounded-[28px] bg-cyan-400/10 blur-xl" />

              <img
                src={logo}
                alt="JR TECH"
                className="relative h-full w-full rounded-2xl object-contain"
              />

            </div>

          </div>

          {/* TÍTULO */}

          <div className="mt-5 text-center">

            <p className="text-xs font-black tracking-[0.25em] text-cyan-400">
              JR TECH
            </p>

            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Recuperar contraseña
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-slate-300">
              Ingresa tu correo y te enviaremos las instrucciones para recuperar tu cuenta.
            </p>

          </div>

          {/* ERROR SERVIDOR */}

          {errorServidor && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-center">
              <p className="text-xs font-semibold leading-5 text-red-300">
                {errorServidor}
              </p>
            </div>
          )}

          {/* FORMULARIO */}

          <form
            onSubmit={recuperar}
            className="mt-6 space-y-4"
          >

            <Input
              label="Correo electrónico"
              name="correo"
              type="email"
              value={correo}
              onChange={handleChange}
              error={error}
              placeholder="ejemplo@correo.com"
              maxLength={100}
              disabled={!!mensaje}
            />

            <Button
              type="submit"
              disabled={cargando || !!mensaje}
            >
              {cargando ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                  Procesando...
                </>
              ) : (
                <>
                  Enviar instrucciones
                  <span className="text-lg">→</span>
                </>
              )}
            </Button>

          </form>

          {/* MENSAJE */}

          {mensaje && (
            <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-center">

              <p className="flex items-center justify-center gap-1.5 text-xs font-semibold leading-5 text-emerald-300">
                <IconCheckCircle className="h-3.5 w-3.5 flex-shrink-0" /> {mensaje}
              </p>

            </div>
          )}

          {/* VOLVER */}

          <div className="mt-6 border-t border-white/10 pt-5 text-center">

            <Link
              to="/login"
              className="group inline-flex items-center gap-2 text-sm font-bold text-slate-300 transition hover:text-cyan-400"
            >
              <span className="transition-transform group-hover:-translate-x-1">
                ←
              </span>

              Volver al inicio de sesión
            </Link>

          </div>

        </div>

      </div>

    </main>
  );
}

export default RecoverPassword;