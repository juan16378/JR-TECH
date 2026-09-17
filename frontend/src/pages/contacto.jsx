import { useEffect, useRef, useState } from "react";

import Toast, { useToasts } from "../components/Toast";
import { IconCheckCircle, IconSparkles } from "../components/Icons";

/* =========================================================
   REVELADO AL HACER SCROLL
========================================================= */

function useEnPantalla(umbral = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: umbral }
    );

    observer.observe(elemento);
    return () => observer.disconnect();
  }, [umbral]);

  return [ref, visible];
}

function Revelar({ as: Tag = "div", className = "", delay = 0, children, ...props }) {
  const [ref, visible] = useEnPantalla();

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

/* =========================================================
   CONTADOR DE CARACTERES
========================================================= */

function ContadorCaracteres({ actual, maximo }) {
  const porcentaje = (actual / maximo) * 100;
  const cerca = porcentaje > 85;

  return (
    <span className={`text-xs font-semibold ${cerca ? "text-amber-400" : "text-slate-500"}`}>
      {actual}/{maximo}
    </span>
  );
}

/* =========================================================
   PÁGINA DE CONTACTO
========================================================= */

function Contacto() {
  const [form, setForm] = useState({ nombre: "", email: "", mensaje: "" });
  const [errors, setErrors] = useState({});
  const [tocado, setTocado] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [sent, setSent] = useState(false);
  const [copiado, setCopiado] = useState(null);

  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const contenedorRef = useRef(null);

  const MAX_MENSAJE = 500;

  const { toasts, mostrarToast } = useToasts();

  useEffect(() => {
    if (!sent) return;
    const temporizador = setTimeout(() => setSent(false), 6000);
    return () => clearTimeout(temporizador);
  }, [sent]);

  /* ============================
     PARALLAX SUAVE DE FONDO
  ============================ */

  const manejarMovimiento = (e) => {
    const rect = contenedorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    });
  };

  /* ============================
     VALIDACIÓN
  ============================ */

  const validar = (datos) => {
    const next = {};
    if (!datos.nombre.trim()) next.nombre = "Escribe tu nombre.";
    if (!datos.email.trim() || !datos.email.includes("@")) next.email = "Escribe un correo válido.";
    if (!datos.mensaje.trim()) next.mensaje = "Cuéntanos en qué te ayudamos.";
    return next;
  };

  const handleChange = (e) => {
    const next = { ...form, [e.target.name]: e.target.value };
    setForm(next);
    if (tocado[e.target.name]) {
      setErrors(validar(next));
    }
  };

  const handleBlur = (e) => {
    setTocado((t) => ({ ...t, [e.target.name]: true }));
    setErrors(validar(form));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = validar(form);
    setErrors(next);
    setTocado({ nombre: true, email: true, mensaje: true });

    if (Object.keys(next).length > 0) {
      mostrarToast("Revisa los campos marcados", "advertencia");
      return;
    }

    setEnviando(true);
    setTimeout(() => {
      setEnviando(false);
      setSent(true);
      setErrors({});
      setTocado({});
      setForm({ nombre: "", email: "", mensaje: "" });
      mostrarToast("Mensaje enviado con éxito", "celebracion");
    }, 1100);
  };

  /* ============================
     COPIAR AL PORTAPAPELES
  ============================ */

  const copiar = async (texto, clave, etiqueta) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      mostrarToast(`${etiqueta} copiado`, "exito");
      setTimeout(() => setCopiado(null), 1600);
    } catch {
      mostrarToast("No se pudo copiar", "error");
    }
  };

  const infoCards = [
    {
      key: "ubicacion",
      label: "Ubicación",
      value: "Medellín, Colombia",
      accion: () => {
        window.open("https://www.google.com/maps?q=Medell%C3%ADn,Antioquia,Colombia", "_blank");
        mostrarToast("Abriendo mapa…", "info");
      },
      cta: "Ver en mapa",
      path: "M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z",
    },
    {
      key: "correo",
      label: "Correo",
      value: "contacto@jrtech.com",
      accion: () => copiar("contacto@jrtech.com", "correo", "Correo"),
      cta: "Copiar",
      path: "M2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13Zm2.2.3 7.8 6.15 7.8-6.15H4.2ZM20 7.9l-7.4 5.83a1 1 0 0 1-1.2 0L4 7.9v10.6c0 .28.22.5.5.5h15a.5.5 0 0 0 .5-.5V7.9Z",
    },
    {
      key: "telefono",
      label: "Teléfono",
      value: "+57 300 000 0000",
      accion: () => copiar("+573000000000", "telefono", "Teléfono"),
      cta: "Copiar",
      path: "M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8Z",
    },
    {
      key: "horario",
      label: "Horario",
      value: "Lun – Sáb, 9:00 a 19:00",
      path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm.75 5a.75.75 0 0 0-1.5 0v5.25c0 .27.13.52.36.65l3.5 2.1a.75.75 0 0 0 .78-1.28l-3.14-1.88V7Z",
    },
  ];

  const campoValido = (nombreCampo) => tocado[nombreCampo] && !errors[nombreCampo] && form[nombreCampo];

  return (
    <main
      ref={contenedorRef}
      onMouseMove={manejarMovimiento}
      className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-24 text-white"
    >
      {/* TOAST */}
      <Toast toasts={toasts} />

      {/* FONDO */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05] transition-transform duration-300 ease-out"
        style={{ transform: `translate(${mouse.x * 12}px, ${mouse.y * 12}px)` }}
      >
        <defs>
          <pattern id="contact-circuit" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M0 60H40M80 60H120M60 0V40M60 80V120" stroke="#22d3ee" strokeWidth="1" fill="none" />
            <circle cx="60" cy="60" r="3" fill="#22d3ee" />
            <circle cx="40" cy="60" r="2" fill="#22d3ee" />
            <circle cx="80" cy="60" r="2" fill="#22d3ee" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#contact-circuit)" />
      </svg>

      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-0 h-[460px] w-[640px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[120px] transition-transform duration-300 ease-out"
          style={{ transform: `translate(calc(-50% + ${mouse.x * 25}px), ${mouse.y * 18}px)` }}
        />
        <div
          className="absolute -right-40 bottom-0 h-72 w-72 rounded-full bg-blue-500/5 blur-[100px] transition-transform duration-300 ease-out"
          style={{ transform: `translate(${mouse.x * -18}px, ${mouse.y * 18}px)` }}
        />
      </div>

      <section className="relative mx-auto max-w-5xl">
        <Revelar className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold tracking-widest text-cyan-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            CONTÁCTANOS
          </span>

          <h1 className="mt-5 text-4xl font-black text-white md:text-5xl">¿Necesitas ayuda?</h1>

          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-400">
            Escríbenos y nuestro equipo te responderá en menos de 24 horas.
          </p>
        </Revelar>

        {/* TARJETAS DE INFO */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {infoCards.map((c, index) => (
            <Revelar key={c.label} delay={index * 80}>
              <button
                type="button"
                onClick={c.accion}
                disabled={!c.accion}
                className={`group h-full w-full rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-left transition-all duration-300 ${
                  c.accion
                    ? "cursor-pointer hover:-translate-y-1 hover:border-cyan-500/40 hover:bg-slate-900"
                    : "cursor-default"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-cyan-400">
                      <path d={c.path} />
                    </svg>
                  </div>

                  {c.accion && (
                    <span
                      className={`text-xs font-bold transition-all duration-300 ${
                        copiado === c.key
                          ? "text-emerald-400 opacity-100"
                          : "text-cyan-400 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {copiado === c.key ? (
                        <span className="inline-flex items-center gap-1">
                          <IconCheckCircle className="h-3.5 w-3.5" /> Copiado
                        </span>
                      ) : (
                        c.cta
                      )}
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {c.label}
                </h3>
                <p className="mt-1.5 text-base font-medium text-white">{c.value}</p>
              </button>
            </Revelar>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* FORMULARIO */}
          <Revelar className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 md:p-10">
            <h2 className="text-xl font-bold text-white">Envíanos un mensaje</h2>
            <p className="mt-1.5 text-base text-slate-400">
              Completa el formulario y te contactamos pronto.
            </p>

            <div
              className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${
                sent ? "mt-6" : "mt-0"
              }`}
              style={{ gridTemplateRows: sent ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                  <IconSparkles className="h-4 w-4 flex-shrink-0" />
                  Mensaje enviado. Te responderemos muy pronto.
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="nombre"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400"
                >
                  Nombre
                </label>
                <div className="relative">
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    value={form.nombre}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Tu nombre completo"
                    className={`w-full rounded-lg border bg-slate-950/60 px-3.5 py-3 pr-10 text-base text-white placeholder-slate-500 outline-none transition-colors duration-200 ${
                      errors.nombre && tocado.nombre
                        ? "border-red-500/60 focus:border-red-400"
                        : "border-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    }`}
                  />
                  {campoValido("nombre") && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                      <IconCheckCircle className="h-4 w-4" />
                    </span>
                  )}
                </div>
                {errors.nombre && tocado.nombre && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.nombre}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400"
                >
                  Correo
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="tu@correo.com"
                    className={`w-full rounded-lg border bg-slate-950/60 px-3.5 py-3 pr-10 text-base text-white placeholder-slate-500 outline-none transition-colors duration-200 ${
                      errors.email && tocado.email
                        ? "border-red-500/60 focus:border-red-400"
                        : "border-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    }`}
                  />
                  {campoValido("email") && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                      <IconCheckCircle className="h-4 w-4" />
                    </span>
                  )}
                </div>
                {errors.email && tocado.email && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="mensaje"
                    className="block text-xs font-bold uppercase tracking-widest text-slate-400"
                  >
                    Mensaje
                  </label>
                  <ContadorCaracteres actual={form.mensaje.length} maximo={MAX_MENSAJE} />
                </div>
                <textarea
                  id="mensaje"
                  name="mensaje"
                  rows={4}
                  maxLength={MAX_MENSAJE}
                  value={form.mensaje}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Cuéntanos en qué te ayudamos"
                  className={`w-full resize-none rounded-lg border bg-slate-950/60 px-3.5 py-3 text-base text-white placeholder-slate-500 outline-none transition-colors duration-200 ${
                    errors.mensaje && tocado.mensaje
                      ? "border-red-500/60 focus:border-red-400"
                      : "border-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  }`}
                />
                {errors.mensaje && tocado.mensaje && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.mensaje}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 py-3 text-base font-bold text-slate-950 transition-all duration-200 hover:bg-cyan-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {enviando ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                    Enviando…
                  </>
                ) : (
                  "Enviar mensaje"
                )}
              </button>
            </form>
          </Revelar>

          {/* MAPA Y SOPORTE */}
          <div className="flex flex-col gap-6">
            <Revelar delay={100} className="relative overflow-hidden rounded-3xl border border-slate-800">
              <iframe
                title="Ubicación JR Tech en Medellín"
                src="https://www.google.com/maps?q=Medell%C3%ADn,Antioquia,Colombia&output=embed"
                className="h-56 w-full grayscale invert-[0.92] contrast-[1.05] filter"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-cyan-400/20" />
              <a
                href="https://www.google.com/maps?q=Medell%C3%ADn,Antioquia,Colombia"
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-3 right-3 rounded-full border border-cyan-400/30 bg-slate-950/90 px-3.5 py-1.5 text-xs font-bold text-cyan-300 backdrop-blur transition hover:bg-slate-950"
              >
                Abrir mapa completo ↗
              </a>
            </Revelar>

            <Revelar delay={180} className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
              <h3 className="text-base font-bold text-white">Soporte inmediato</h3>
              <p className="mt-1.5 text-base leading-6 text-slate-400">
                Si prefieres hablar directo, escríbenos por WhatsApp y te respondemos en
                minutos.
              </p>
              <a
                href="https://wa.me/573000000000?text=Hola%20JR%20TECH%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n"
                target="_blank"
                rel="noreferrer"
                onClick={() => mostrarToast("Abriendo WhatsApp…", "info")}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 px-4 py-2.5 text-sm font-semibold text-cyan-400 transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-500/10"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M12.02 2C6.5 2 2.03 6.47 2.03 12c0 1.86.5 3.6 1.38 5.1L2 22l5.05-1.37A9.96 9.96 0 0 0 12.02 22c5.53 0 10-4.47 10-10S17.55 2 12.02 2Zm0 18.1c-1.62 0-3.16-.44-4.48-1.24l-.32-.19-3 .8.8-2.92-.2-.3a8.1 8.1 0 0 1-1.28-4.35c0-4.47 3.63-8.1 8.1-8.1s8.1 3.63 8.1 8.1-3.63 8.1-8.1 8.1Z" />
                </svg>
                Escribir por WhatsApp
              </a>
            </Revelar>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Contacto;