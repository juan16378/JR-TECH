import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import Toast, { useToasts } from "../components/Toast";
import {
  IconCart,
  IconChat,
  IconCheckCircle,
  IconClipboard,
  IconLaptop,
  IconSearch,
  IconSettings,
  IconShield,
  IconSparkles,
  IconStar,
  IconTruck,
  IconWarning,
  IconWrench,
  IconX,
  IconZap,
} from "../components/Icons";

const WHATSAPP_NUMERO = "573001234567";

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
   ÍCONO SEGÚN EL TIPO DE SERVICIO
   (el backend no guarda categoría, así que lo deducimos
   de palabras clave en el nombre/descripción)
========================================================= */

const REGLAS_ICONO = [
  { icono: IconLaptop, palabras: ["remoto", "software", "formateo", "sistema", "windows", "virus"] },
  { icono: IconTruck, palabras: ["domicilio", "recogida", "entrega", "transporte"] },
  { icono: IconSettings, palabras: ["configuraci", "instalaci", "ajuste"] },
  { icono: IconSearch, palabras: ["diagnostico", "diagnóstico", "revision", "revisión", "evaluacion", "evaluación"] },
  { icono: IconShield, palabras: ["garantia", "garantía", "proteccion", "protección", "seguridad"] },
];

function iconoParaServicio(servicio) {
  const texto = `${servicio.nombre || ""} ${servicio.descripcion || ""}`.toLowerCase();
  for (const regla of REGLAS_ICONO) {
    if (regla.palabras.some((palabra) => texto.includes(palabra))) return regla.icono;
  }
  return IconWrench;
}

/* =========================================================
   PREGUNTA FRECUENTE (acordeón)
========================================================= */

function PreguntaFrecuente({ pregunta, respuesta, abierta, onClick }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
        abierta ? "border-cyan-400/40 bg-cyan-400/[0.04]" : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-expanded={abierta}
        className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
      >
        <span className={`text-sm font-bold sm:text-base ${abierta ? "text-cyan-300" : "text-white"}`}>
          {pregunta}
        </span>
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-base transition-all duration-300 ${
            abierta ? "rotate-45 border-cyan-400 text-cyan-300" : "border-slate-700 text-slate-400"
          }`}
        >
          +
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: abierta ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm leading-6 text-slate-400 sm:px-6 sm:pb-6">{respuesta}</p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PÁGINA DE SERVICIOS
========================================================= */

function Servicios() {
  const navigate = useNavigate();
  const { toasts, mostrarToast } = useToasts();

  const [usuario] = useState(() => {
    const guardado = localStorage.getItem("usuario") || sessionStorage.getItem("usuario");
    try {
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });

  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("relevancia");
  const [servicioVista, setServicioVista] = useState(null);
  const [preguntaAbierta, setPreguntaAbierta] = useState(0);
  const [agregandoId, setAgregandoId] = useState(null);

  const obtenerToken = () => localStorage.getItem("token") || sessionStorage.getItem("token");

  const headersAuth = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${obtenerToken()}`,
  });

  /* ============================
     AGREGAR AL CARRITO
     (la compra en sí se completa en /productos, donde ya existe todo el
     flujo de carrito/checkout; aquí solo se agrega la línea del servicio)
  ============================ */

  const agregarServicioAlCarrito = async (servicio) => {
    if (!usuario) {
      mostrarToast(
        "Necesitas tener una cuenta para hacer esto. Inicia sesión o regístrate.",
        "advertencia"
      );
      setTimeout(() => navigate("/login"), 1200);
      return;
    }

    setAgregandoId(servicio.id);
    try {
      const respuesta = await fetch(`${API_URL}/carrito`, {
        method: "POST",
        headers: headersAuth(),
        body: JSON.stringify({ servicioId: servicio.id, cantidad: 1 }),
      });

      let datos = {};
      try {
        datos = await respuesta.json();
      } catch {
        datos = {};
      }

      if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudo agregar al carrito.");
      }

      mostrarToast(
        `${servicio.nombre} añadido al carrito. Ve a Productos para finalizar tu compra.`,
        "exito"
      );
    } catch (err) {
      console.error("❌ Error al agregar el servicio al carrito:", err);
      mostrarToast(err.message || "No se pudo agregar al carrito.", "advertencia");
    } finally {
      setAgregandoId(null);
    }
  };

  const cargarServicios = async () => {
    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch(`${API_URL}/servicios`);

      let datos = {};
      try {
        datos = await respuesta.json();
      } catch {
        datos = {};
      }

      if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudieron cargar los servicios.");
      }

      const lista = Array.isArray(datos.servicios) ? datos.servicios : [];
      setServicios(lista.filter((s) => s.estado === "Activo"));
    } catch (err) {
      console.error("❌ Error al cargar servicios:", err);
      setError(err.message || "No se pudieron cargar los servicios. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarServicios();
  }, []);

  /* ============================
     CERRAR VISTA RÁPIDA CON ESC
  ============================ */

  useEffect(() => {
    const alPresionarTecla = (e) => {
      if (e.key === "Escape") setServicioVista(null);
    };
    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
  }, []);

  /* ============================
     PRECIO MÁS BAJO (para el badge)
  ============================ */

  const precioMasBajo = useMemo(() => {
    if (servicios.length < 2) return null;
    return Math.min(...servicios.map((s) => s.precio ?? Infinity));
  }, [servicios]);

  /* ============================
     FILTRAR + ORDENAR
  ============================ */

  const serviciosFiltrados = useMemo(() => {
    let resultado = servicios.filter((s) =>
      s.nombre?.toLowerCase().includes(busqueda.trim().toLowerCase())
    );

    switch (orden) {
      case "precio-asc":
        resultado = [...resultado].sort((a, b) => a.precio - b.precio);
        break;
      case "precio-desc":
        resultado = [...resultado].sort((a, b) => b.precio - a.precio);
        break;
      case "nombre":
        resultado = [...resultado].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
        break;
      default:
        break;
    }

    return resultado;
  }, [servicios, busqueda, orden]);

  const formatoPrecio = (precio) =>
    (precio || 0).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });

  const enlaceWhatsApp = (servicio) => {
    const mensaje = `¡Hola! Quiero más información sobre el servicio "${servicio.nombre}".`;
    return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
  };

  const pasos = [
    {
      icono: IconSearch,
      titulo: "1. Elige tu servicio",
      texto: "Explora el catálogo o usa el buscador para encontrar justo lo que necesitas.",
    },
    {
      icono: IconChat,
      titulo: "2. Escríbenos por WhatsApp",
      texto: "Un clic y te contactamos directo. Nos cuentas el detalle y resolvemos tus dudas.",
    },
    {
      icono: IconCheckCircle,
      titulo: "3. Coordinamos y lo resolvemos",
      texto: "Agendamos el servicio, remoto o presencial, y te acompañamos hasta que quede listo.",
    },
  ];

  const preguntas = [
    {
      pregunta: "¿Cuánto tiempo tarda un servicio?",
      respuesta:
        "La mayoría de solicitudes se agendan en menos de 24 horas hábiles. Te confirmamos el tiempo exacto apenas nos escribas por WhatsApp.",
    },
    {
      pregunta: "¿Los servicios son a domicilio o remotos?",
      respuesta:
        "Depende del servicio: algunos se resuelven de forma remota y otros requieren visita o que nos traigas el equipo. Te lo indicamos al coordinar.",
    },
    {
      pregunta: "¿Los servicios tienen garantía?",
      respuesta: "Sí, todo servicio realizado por JR TECH cuenta con garantía sobre el trabajo realizado.",
    },
    {
      pregunta: "¿Cómo puedo pagar?",
      respuesta:
        "Aceptamos pago contraentrega, transferencia y tarjeta, según cómo se coordine el servicio con nuestro equipo.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-10">
      <Toast toasts={toasts} />

      {/* ENCABEZADO */}

      <section className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 p-7 shadow-2xl sm:p-10">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              JR TECH Servicios
            </span>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Soporte técnico que
              <span className="block bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">
                resuelve de verdad.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Mantenimiento, instalación, soporte a domicilio y más. Escríbenos y te
              atendemos rápido.
            </p>

            {/* CHIPS DE CONFIANZA */}
            <div className="mt-6 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/60 px-3.5 py-1.5 text-xs font-semibold text-slate-300">
                <IconZap className="h-3.5 w-3.5 text-cyan-400" /> Respuesta en menos de 24h
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/60 px-3.5 py-1.5 text-xs font-semibold text-slate-300">
                <IconShield className="h-3.5 w-3.5 text-cyan-400" /> Garantía en todo servicio
              </span>
              {!cargando && !error && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/60 px-3.5 py-1.5 text-xs font-semibold text-slate-300">
                  <IconWrench className="h-3.5 w-3.5 text-cyan-400" /> {servicios.length} servicio
                  {servicios.length === 1 ? "" : "s"} disponible{servicios.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* BUSCADOR + ORDEN */}

      <section className="mx-auto mt-8 max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <IconSearch className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar servicio..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3.5 pl-12 pr-10 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-300"
                aria-label="Limpiar búsqueda"
              >
                <IconX className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 sm:w-auto"
          >
            <option value="relevancia">Ordenar: relevancia</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="nombre">Nombre A-Z</option>
          </select>
        </div>

        {!cargando && !error && servicios.length > 0 && (
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Mostrando {serviciosFiltrados.length} de {servicios.length} servicios
          </p>
        )}
      </section>

      {/* RESULTADOS */}

      <section className="mx-auto mt-6 max-w-7xl">
        {cargando && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-800" />
                <div className="mt-4 h-5 w-2/3 animate-pulse rounded bg-slate-800" />
                <div className="mt-4 h-3 w-full animate-pulse rounded bg-slate-800" />
                <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-slate-800" />
                <div className="mt-6 h-10 w-full animate-pulse rounded bg-slate-800" />
              </div>
            ))}
          </div>
        )}

        {!cargando && error && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 py-20 text-center">
            <IconWarning className="mx-auto h-10 w-10 text-amber-400" />
            <h2 className="mt-4 text-xl font-bold text-white">No pudimos cargar los servicios</h2>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <button
              onClick={cargarServicios}
              className="mt-5 rounded-xl bg-cyan-400 px-5 py-2.5 font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !error && serviciosFiltrados.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 py-20 text-center">
            <IconWrench className="mx-auto h-10 w-10 text-slate-600" />
            <h2 className="mt-4 text-xl font-bold text-white">
              {servicios.length === 0 ? "Aún no hay servicios publicados" : "No encontramos ese servicio"}
            </h2>
            {servicios.length > 0 && (
              <button
                onClick={() => setBusqueda("")}
                className="mt-5 rounded-xl bg-cyan-400 px-5 py-2.5 font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                Ver todos
              </button>
            )}
          </div>
        )}

        {!cargando && !error && serviciosFiltrados.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {serviciosFiltrados.map((servicio, index) => {
              const IconoServicio = iconoParaServicio(servicio);
              const esMasBarato = precioMasBajo !== null && servicio.precio === precioMasBajo;

              return (
                <Revelar key={servicio.id} delay={Math.min(index, 6) * 60}>
                  <article
                    onClick={() => setServicioVista(servicio)}
                    className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-cyan-400/40 hover:shadow-2xl hover:shadow-cyan-400/10"
                  >
                    {esMasBarato && (
                      <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
                        <IconStar className="h-3 w-3" /> Precio más bajo
                      </span>
                    )}

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 transition-transform duration-300 group-hover:scale-110">
                      <IconoServicio className="h-6 w-6" />
                    </div>

                    <h2 className="mt-4 text-lg font-black text-white">{servicio.nombre}</h2>

                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-400">
                      {servicio.descripcion}
                    </p>

                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-cyan-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <IconClipboard className="h-3.5 w-3.5" /> Ver detalle
                    </span>

                    <div className="mt-5">
                      <p className="text-xs text-slate-500">Desde</p>
                      <span className="text-xl font-black text-cyan-400">
                        {formatoPrecio(servicio.precio)}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-col gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          agregarServicioAlCarrito(servicio);
                        }}
                        disabled={agregandoId === servicio.id}
                        className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-black text-cyan-300 transition-all hover:-translate-y-0.5 hover:bg-cyan-400/20 disabled:opacity-60"
                      >
                        <IconCart className="h-4 w-4" />
                        {agregandoId === servicio.id ? "Agregando..." : "Agregar al carrito"}
                      </button>

                      <a
                        href={enlaceWhatsApp(servicio)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/10 transition-all hover:-translate-y-0.5 hover:shadow-cyan-400/30"
                      >
                        <IconChat className="h-4 w-4" /> Solicitar por WhatsApp
                      </a>
                    </div>
                  </article>
                </Revelar>
              );
            })}
          </div>
        )}
      </section>

      {/* CÓMO FUNCIONA */}

      {!cargando && !error && servicios.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl">
          <Revelar as="p" className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
            Cómo funciona
          </Revelar>
          <Revelar as="h2" className="mt-3 text-2xl font-black text-white md:text-3xl">
            Tres pasos y listo
          </Revelar>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {pasos.map((paso, index) => (
              <Revelar
                key={paso.titulo}
                delay={index * 100}
                className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                  <paso.icono className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">{paso.titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{paso.texto}</p>
              </Revelar>
            ))}
          </div>
        </section>
      )}

      {/* PREGUNTAS FRECUENTES */}

      <section className="mx-auto mt-20 max-w-4xl">
        <Revelar as="p" className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
          Preguntas frecuentes
        </Revelar>
        <Revelar as="h2" className="mt-3 text-2xl font-black text-white md:text-3xl">
          Todo lo que quizá quieras saber
        </Revelar>

        <div className="mt-8 space-y-4">
          {preguntas.map((item, index) => (
            <Revelar key={item.pregunta} delay={index * 60}>
              <PreguntaFrecuente
                pregunta={item.pregunta}
                respuesta={item.respuesta}
                abierta={preguntaAbierta === index}
                onClick={() => setPreguntaAbierta((actual) => (actual === index ? -1 : index))}
              />
            </Revelar>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}

      <Revelar className="mx-auto mt-20 flex max-w-7xl flex-col items-center justify-between gap-6 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-8 text-center md:flex-row md:p-10 md:text-left">
        <div>
          <h2 className="text-2xl font-black text-white">¿No encuentras lo que buscas?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Cuéntanos qué necesitas y te ayudamos a encontrar la mejor solución.
          </p>
        </div>

        <a
          href={`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(
            "¡Hola! Necesito ayuda con un servicio que no encuentro en el catálogo."
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 text-base font-bold text-slate-950 transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-300 hover:shadow-lg hover:shadow-cyan-400/20 active:scale-95"
        >
          <IconChat className="h-4 w-4" /> Escríbenos por WhatsApp
        </a>
      </Revelar>

      {/* ==================================================
          MODAL VISTA RÁPIDA
      ================================================== */}

      {servicioVista && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setServicioVista(null)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setServicioVista(null)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/80 text-white transition hover:bg-red-500/20 hover:text-red-400"
              aria-label="Cerrar"
            >
              <IconX className="h-4 w-4" />
            </button>

            <div className="p-7 sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                {(() => {
                  const IconoModal = iconoParaServicio(servicioVista);
                  return <IconoModal className="h-7 w-7" />;
                })()}
              </div>

              <h2 className="mt-4 text-2xl font-black text-white">{servicioVista.nombre}</h2>

              <p className="mt-3 text-sm leading-7 text-slate-400">{servicioVista.descripcion}</p>

              <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <IconSparkles className="h-3.5 w-3.5" /> Respuesta en menos de 24h · garantía incluida
              </div>

              <div className="mt-6 border-t border-slate-800 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Desde</p>
                    <span className="text-2xl font-black text-cyan-400">
                      {formatoPrecio(servicioVista.precio)}
                    </span>
                  </div>

                  <a
                    href={enlaceWhatsApp(servicioVista)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-cyan-400/30"
                  >
                    <IconChat className="h-4 w-4" /> Solicitar
                  </a>
                </div>

                <button
                  onClick={() => agregarServicioAlCarrito(servicioVista)}
                  disabled={agregandoId === servicioVista.id}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-3 font-black text-cyan-300 transition-all hover:-translate-y-0.5 hover:bg-cyan-400/20 disabled:opacity-60"
                >
                  <IconCart className="h-4 w-4" />
                  {agregandoId === servicioVista.id ? "Agregando..." : "Agregar al carrito"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Servicios;
