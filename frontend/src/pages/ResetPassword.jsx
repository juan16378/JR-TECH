import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import logo from "../assets/images/logo.png";
import { API_URL } from "../config";
import Input from "../components/Input";
import Button from "../components/Button";
import { IconCheckCircle } from "../components/Icons";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);

  const tieneLongitud = password.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(password);
  const tieneNumero = /[0-9]/.test(password);

  const validar = () => {
    const nuevosErrores = {};

    if (!password) {
      nuevosErrores.password = "La contraseña es obligatoria.";
    } else if (!tieneLongitud) {
      nuevosErrores.password = "Mínimo 8 caracteres.";
    } else if (!tieneMayuscula) {
      nuevosErrores.password = "Necesitas una mayúscula.";
    } else if (!tieneNumero) {
      nuevosErrores.password = "Necesitas un número.";
    }

    if (confirmar !== password) {
      nuevosErrores.confirmar = "Las contraseñas no coinciden.";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const restablecer = async (e) => {
    e.preventDefault();

    if (!token) {
      setTipoMensaje("error");
      setMensaje("El enlace no es válido. Solicita uno nuevo.");
      return;
    }

    if (!validar()) return;

    setCargando(true);
    setMensaje("");

    try {
      const respuesta = await fetch(
        `${API_URL}/auth/restablecer-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        }
      );

      let datos = {};
      try {
        datos = await respuesta.json();
      } catch {
        datos = {};
      }

      if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudo restablecer la contraseña.");
      }

      setExito(true);
      setTipoMensaje("exito");
      setMensaje(datos.message || "Tu contraseña se restableció correctamente.");
    } catch (error) {
      console.error("❌ Error al restablecer la contraseña:", error);
      setTipoMensaje("error");
      setMensaje(error.message || "No se pudo restablecer la contraseña.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">

      <div className="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="absolute -right-32 bottom-1/4 h-72 w-72 rounded-full bg-blue-600/15 blur-3xl" />

      <div className="relative w-full max-w-[430px] overflow-hidden rounded-[28px] border border-cyan-400/20 bg-slate-900 shadow-2xl shadow-cyan-500/10">

        <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400" />

        <div className="p-7 sm:p-8">

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

          <div className="mt-5 text-center">
            <p className="text-xs font-black tracking-[0.25em] text-cyan-400">JR TECH</p>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Nueva contraseña
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-slate-300">
              Crea una nueva contraseña segura para tu cuenta.
            </p>
          </div>

          {!token && (
            <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-center">
              <p className="text-sm font-semibold text-red-300">
                Este enlace no es válido o está incompleto.
              </p>
              <Link
                to="/recuperar"
                className="mt-2 inline-block text-xs font-bold text-cyan-300 hover:underline"
              >
                Solicitar un nuevo enlace →
              </Link>
            </div>
          )}

          {token && !exito && (
            <form onSubmit={restablecer} className="mt-6 space-y-4">

              <Input
                label="Nueva contraseña"
                name="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setMensaje("");
                }}
                error={errores.password}
                placeholder="Mínimo 8 caracteres"
                maxLength={30}
              />

              <Input
                label="Confirmar contraseña"
                name="confirmar"
                type="password"
                value={confirmar}
                onChange={(e) => {
                  setConfirmar(e.target.value);
                  setMensaje("");
                }}
                error={errores.confirmar}
                placeholder="Repite tu contraseña"
                maxLength={30}
              />

              {password && (
                <div className="rounded-xl border border-cyan-400/10 bg-slate-950/70 p-3">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                        tieneLongitud
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                          : "border-slate-700 bg-slate-800 text-slate-500"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {tieneLongitud ? <IconCheckCircle className="h-3 w-3" /> : <span className="inline-block h-1.5 w-1.5 rounded-full border border-current" />}
                        8 caracteres
                      </span>
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                        tieneMayuscula
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                          : "border-slate-700 bg-slate-800 text-slate-500"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {tieneMayuscula ? <IconCheckCircle className="h-3 w-3" /> : <span className="inline-block h-1.5 w-1.5 rounded-full border border-current" />}
                        Mayúscula
                      </span>
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                        tieneNumero
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                          : "border-slate-700 bg-slate-800 text-slate-500"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {tieneNumero ? <IconCheckCircle className="h-3 w-3" /> : <span className="inline-block h-1.5 w-1.5 rounded-full border border-current" />}
                        Número
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {mensaje && tipoMensaje === "error" && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-center">
                  <p className="text-xs font-semibold leading-5 text-red-300">{mensaje}</p>
                </div>
              )}

              <Button type="submit" disabled={cargando}>
                {cargando ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                    Guardando...
                  </>
                ) : (
                  <>
                    Restablecer contraseña
                    <span className="text-lg">→</span>
                  </>
                )}
              </Button>
            </form>
          )}

          {exito && (
            <div className="mt-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30">
                <IconCheckCircle className="h-7 w-7" />
              </div>
              <p className="mt-4 text-sm font-semibold text-emerald-300">{mensaje}</p>
              <button
                onClick={() => navigate("/login")}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
              >
                Ir a iniciar sesión →
              </button>
            </div>
          )}

          <div className="mt-6 border-t border-white/10 pt-5 text-center">
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 text-sm font-bold text-slate-300 transition hover:text-cyan-400"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span>
              Volver al inicio de sesión
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}

export default ResetPassword;