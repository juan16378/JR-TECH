import { useEffect, useRef, useState } from "react";

import Toast, { useToasts } from "../components/Toast";
import { IconCheckCircle, IconChat, IconLink, IconStar } from "../components/Icons";

/* =========================================================
   CONTADOR ANIMADO
========================================================= */

function useCountUp(target, start) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;

    const duration = 1400;
    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(Math.round(eased * target));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [start, target]);

  return value;
}

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
   BARRA DE PROGRESO DE LECTURA
========================================================= */

function BarraProgreso() {
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    const alScroll = () => {
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      setProgreso(alto > 0 ? (window.scrollY / alto) * 100 : 0);
    };
    window.addEventListener("scroll", alScroll, { passive: true });
    alScroll();
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  return (
    <div className="fixed left-0 top-0 z-[210] h-1 w-full bg-slate-900/70">
      <div
        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-[width] duration-150"
        style={{ width: `${progreso}%` }}
      />
    </div>
  );
}

/* =========================================================
   ENCABEZADO FIJO CON NAVEGACIÓN
========================================================= */

function EncabezadoFijo({ secciones, onWhatsapp }) {
  const [activa, setActiva] = useState(secciones[0]?.id);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alScroll = () => setVisible(window.scrollY > 420);
    window.addEventListener("scroll", alScroll, { passive: true });
    alScroll();
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  useEffect(() => {
    const observers = secciones.map(({ id }) => {
      const elemento = document.getElementById(id);
      if (!elemento) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiva(id);
        },
        { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
      );

      observer.observe(elemento);
      return observer;
    });

    return () => observers.forEach((o) => o?.disconnect());
  }, [secciones]);

  const irA = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      className={`fixed left-0 top-1 z-[200] w-full border-b transition-all duration-300 ${
        visible
          ? "translate-y-0 border-slate-800 bg-slate-950/90 backdrop-blur-md"
          : "-translate-y-full border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <button
          onClick={() => irA("inicio")}
          className="flex items-center gap-2 text-sm font-black tracking-wide text-white"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
          JR TECH
        </button>

        <nav className="hidden items-center gap-1 lg:flex">
          {secciones.map((seccion) => (
            <button
              key={seccion.id}
              onClick={() => irA(seccion.id)}
              className={`rounded-full px-3.5 py-2 text-sm font-bold transition-all duration-300 ${
                activa === seccion.id
                  ? "bg-cyan-400/15 text-cyan-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {seccion.etiqueta}
            </button>
          ))}
        </nav>

        <button
          onClick={onWhatsapp}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-cyan-400 px-4 py-2 text-xs font-black text-slate-950 transition-all duration-300 hover:bg-cyan-300 sm:text-sm"
        >
          <IconChat className="h-3.5 w-3.5" /> Contáctanos
        </button>
      </div>
    </header>
  );
}

/* =========================================================
   TARJETA DE ESTADÍSTICA
========================================================= */

function StatCard({ value, suffix, label }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  const count = useCountUp(value, visible);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-slate-900 hover:shadow-lg hover:shadow-cyan-500/5"
    >
      <p className="text-3xl font-black text-cyan-400 md:text-4xl">
        {count}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-slate-400">{label}</p>
    </div>
  );
}

/* =========================================================
   TARJETAS MISIÓN / VISIÓN / CALIDAD
========================================================= */

function PillarCard({ title, text, back, path }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setFlipped((value) => !value)}
      aria-pressed={flipped}
      className="group h-64 w-full [perspective:1200px]"
    >
      <div
        className="relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* FRENTE */}
        <div className="absolute inset-0 flex flex-col items-start rounded-2xl border border-slate-800 bg-slate-900/50 p-7 text-left transition-all duration-300 [backface-visibility:hidden] group-hover:border-cyan-400/40 group-hover:bg-slate-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-cyan-400">
              <path d={path} />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-cyan-400">{title}</h3>
          <p className="mt-3 text-base leading-7 text-slate-400">{text}</p>
          <span className="mt-auto pt-3 text-sm font-semibold text-cyan-500/70">
            Toca para saber más →
          </span>
        </div>

        {/* PARTE TRASERA */}
        <div
          className="absolute inset-0 flex flex-col items-start justify-center rounded-2xl border border-cyan-400/40 bg-cyan-400/10 p-7 text-left [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            {title}
          </span>
          <p className="mt-4 text-base leading-7 text-cyan-100">{back}</p>
          <span className="mt-4 text-sm font-semibold text-cyan-300">← Volver</span>
        </div>
      </div>
    </button>
  );
}

/* =========================================================
   LÍNEA DE TIEMPO
========================================================= */

function LineaDeTiempo({ hitos }) {
  return (
    <div className="relative mt-10 border-l border-slate-800 pl-9">
      <div className="space-y-12">
        {hitos.map((hito, index) => (
          <Revelar key={hito.año} className="relative" delay={index * 80}>
            <span className="absolute -left-11 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-cyan-400 bg-slate-950 shadow-lg shadow-cyan-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            <p className="text-sm font-black uppercase tracking-widest text-cyan-400">
              {hito.año}
            </p>
            <h3 className="mt-1.5 text-lg font-bold text-white">{hito.titulo}</h3>
            <p className="mt-1.5 max-w-xl text-base leading-7 text-slate-400">{hito.texto}</p>
          </Revelar>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   PREGUNTAS FRECUENTES
========================================================= */

function PreguntaFrecuente({ pregunta, respuesta, abierta, onClick }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
        abierta ? "border-cyan-400/40 bg-cyan-400/[0.04]" : "border-slate-800 bg-slate-950/40"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-expanded={abierta}
        className="flex w-full items-center justify-between gap-4 p-6 text-left"
      >
        <span className={`text-base font-bold sm:text-lg ${abierta ? "text-cyan-300" : "text-white"}`}>
          {pregunta}
        </span>
        <span
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border text-base transition-all duration-300 ${
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
          <p className="px-6 pb-6 text-base leading-7 text-slate-400">{respuesta}</p>
        </div>
      </div>
    </div>
  );
}

function Faq({ preguntas }) {
  const [abierta, setAbierta] = useState(0);

  return (
    <div className="mt-8 space-y-4">
      {preguntas.map((item, index) => (
        <PreguntaFrecuente
          key={item.pregunta}
          pregunta={item.pregunta}
          respuesta={item.respuesta}
          abierta={abierta === index}
          onClick={() => setAbierta((actual) => (actual === index ? -1 : index))}
        />
      ))}
    </div>
  );
}

/* =========================================================
   TESTIMONIOS
========================================================= */

function Testimonials() {
  const items = [
    {
      name: "Camila R.",
      role: "Estudiante de diseño",
      initials: "CR",
      quote:
        "Compré mi portátil ahí y la asesoría fue clave, me ayudaron a elegir según lo que realmente necesitaba.",
    },
    {
      name: "Andrés M.",
      role: "Gamer",
      initials: "AM",
      quote:
        "Buenos precios y el soporte por WhatsApp responde rápido de verdad, no es solo un decir.",
    },
    {
      name: "Laura G.",
      role: "Freelancer",
      initials: "LG",
      quote:
        "El envío llegó antes de lo esperado y el producto tal cual lo mostraban. Voy a volver a comprar.",
    },
  ];

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [changing, setChanging] = useState(false);

  const actual = items[active];

  const changeTestimonial = (index) => {
    if (index === active || changing) return;
    setChanging(true);
    setTimeout(() => {
      setActive(index);
      setChanging(false);
    }, 180);
  };

  const next = () => changeTestimonial((active + 1) % items.length);
  const previous = () => changeTestimonial((active - 1 + items.length) % items.length);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setActive((current) => (current + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [paused]);

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-7 shadow-2xl shadow-black/20 md:p-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
                Experiencias reales
              </span>
            </div>

            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
              Lo que dicen de nosotros
            </h2>

            <p className="mt-2 max-w-xl text-base leading-7 text-slate-400">
              Conoce la experiencia de personas que ya han comprado en JR TECH.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                paused ? "bg-slate-600" : "animate-pulse bg-cyan-400"
              }`}
            />
            <span className="text-sm text-slate-500">
              {paused ? "Pausado" : "Reproducción automática"}
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.5fr]">
          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <button
                key={item.name}
                type="button"
                onClick={() => changeTestimonial(index)}
                className={`group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 ${
                  active === index
                    ? "border-cyan-400/40 bg-cyan-400/10"
                    : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-black transition-all duration-300 ${
                    active === index
                      ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20"
                      : "bg-slate-800 text-slate-300 group-hover:bg-slate-700"
                  }`}
                >
                  {item.initials}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`font-bold ${active === index ? "text-cyan-400" : "text-white"}`}>
                    {item.name}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-500">{item.role}</p>
                </div>

                <span
                  className={`text-lg transition-all duration-300 ${
                    active === index
                      ? "translate-x-0 text-cyan-400"
                      : "-translate-x-2 text-slate-700 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                  }`}
                >
                  →
                </span>
              </button>
            ))}
          </div>

          <div
            className={`relative flex min-h-[310px] flex-col justify-between overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-7 transition-all duration-300 md:p-10 ${
              changing ? "translate-y-2 opacity-40" : "translate-y-0 opacity-100"
            }`}
          >
            <div className="pointer-events-none absolute -right-4 -top-10 text-[180px] font-black leading-none text-cyan-400/[0.04]">
              “
            </div>

            <div className="relative">
              <div className="flex gap-1 text-cyan-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <IconStar key={i} className="h-4 w-4" />
                ))}
              </div>
              <p className="mt-7 text-xl font-medium leading-9 text-slate-200 md:text-2xl">
                “{actual.quote}”
              </p>
            </div>

            <div className="relative mt-8 flex items-end justify-between gap-4 border-t border-slate-800 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400 font-black text-slate-950">
                  {actual.initials}
                </div>
                <div>
                  <p className="font-bold text-white">{actual.name}</p>
                  <p className="text-sm text-slate-500">{actual.role}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={previous}
                  aria-label="Testimonio anterior"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-400 hover:text-slate-950"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Siguiente testimonio"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-400 hover:text-slate-950"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7 flex items-center gap-4">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-500"
              style={{ width: `${((active + 1) / items.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-bold text-slate-500">
            {String(active + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </span>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   PÁGINA QUIÉNES SOMOS
========================================================= */

function Quienes() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const { toasts, mostrarToast } = useToasts();
  const heroRef = useRef(null);

  const manejarMovimiento = (e) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    });
  };

  const abrirWhatsapp = () => {
    window.open(
      "https://wa.me/573000000000?text=Hola%20JR%20TECH%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n",
      "_blank"
    );
    mostrarToast("Abriendo WhatsApp…", "info");
  };

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      mostrarToast("Enlace copiado al portapapeles", "exito");
    } catch {
      mostrarToast("No se pudo copiar el enlace", "advertencia");
    }
  };

  const pillars = [
    {
      title: "Misión",
      text: "Ofrecer productos tecnológicos de calidad y una experiencia de compra sencilla.",
      back: "Cada compra pasa por asesoría real: entendemos tu necesidad antes de recomendarte algo, no solo vendemos por vender.",
      path: "M13 2 3 14h7v8l10-12h-7z",
    },
    {
      title: "Visión",
      text: "Ser la tienda de tecnología más reconocida de la región.",
      back: "Para 2028 queremos tener presencia física en al menos tres ciudades de Colombia, sin perder la cercanía que nos caracteriza.",
      path: "M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5Zm0 12.5A5 5 0 1 1 12 7a5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0-6Z",
    },
    {
      title: "Calidad",
      text: "Cada producto pasa por un filtro riguroso antes de llegar a ti.",
      back: "Revisamos garantía, procedencia y reseñas reales de cada proveedor antes de sumarlo al catálogo.",
      path: "M12 2 2 7l10 5 10-5-10-5Zm0 7L2 14l10 5 10-5-10-5Z",
    },
  ];

  const stats = [
    { value: 5, suffix: "+", label: "Años de experiencia" },
    { value: 1200, suffix: "+", label: "Clientes satisfechos" },
    { value: 300, suffix: "+", label: "Productos disponibles" },
    { value: 24, suffix: "h", label: "Tiempo de respuesta" },
  ];

  const highlights = [
    "Garantía real en todos los productos",
    "Asesoría personalizada antes de comprar",
    "Envíos a toda Colombia",
    "Soporte postventa por WhatsApp",
  ];

  const hitos = [
    {
      año: "2019",
      titulo: "Nace JR TECH",
      texto: "Empezamos como una pequeña tienda de accesorios en el centro de la ciudad.",
    },
    {
      año: "2021",
      titulo: "Llegamos a internet",
      texto: "Lanzamos la tienda en línea y ampliamos el catálogo a celulares y computadores.",
    },
    {
      año: "2023",
      titulo: "1.000 clientes",
      texto: "Superamos los mil clientes y sumamos soporte postventa por WhatsApp.",
    },
    {
      año: "2025",
      titulo: "Hoy",
      texto: "Seguimos creciendo con nuevas categorías y mejor asesoría cada mes.",
    },
  ];

  const preguntas = [
    {
      pregunta: "¿Cuánto tarda el envío?",
      respuesta:
        "Entre 2 y 5 días hábiles según la ciudad. Te avisamos por correo apenas tu pedido sale de bodega.",
    },
    {
      pregunta: "¿Los productos tienen garantía?",
      respuesta:
        "Sí, todos cuentan con garantía del fabricante y acompañamiento postventa por WhatsApp.",
    },
    {
      pregunta: "¿Qué métodos de pago aceptan?",
      respuesta: "Tarjetas de crédito y débito, PSE, y pago contraentrega en ciudades principales.",
    },
    {
      pregunta: "¿Puedo cambiar un producto si no me sirve?",
      respuesta:
        "Tienes 5 días hábiles para solicitar un cambio, siempre que el producto esté en su empaque original.",
    },
    {
      pregunta: "¿Tienen tienda física?",
      respuesta:
        "Por ahora operamos 100% en línea, pero ya estamos trabajando en nuestra primera tienda física.",
    },
  ];

  const secciones = [
    { id: "inicio", etiqueta: "Inicio" },
    { id: "pilares", etiqueta: "Pilares" },
    { id: "historia", etiqueta: "Historia" },
    { id: "compromiso", etiqueta: "Compromiso" },
    { id: "testimonios", etiqueta: "Opiniones" },
    { id: "faq", etiqueta: "Preguntas" },
  ];

  return (
    <main
      onMouseMove={manejarMovimiento}
      className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-24 text-white"
    >
      <BarraProgreso />
      <EncabezadoFijo secciones={secciones} onWhatsapp={abrirWhatsapp} />

      {/* TOAST */}
      <Toast toasts={toasts} />

      {/* FONDO TECNOLÓGICO CON PARALLAX */}
      <div ref={heroRef} className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[120px] transition-transform duration-300 ease-out"
          style={{ transform: `translate(calc(-50% + ${mouse.x * 30}px), ${mouse.y * 20}px)` }}
        />
        <div
          className="absolute -left-40 top-[40%] h-80 w-80 rounded-full bg-blue-500/5 blur-[100px] transition-transform duration-300 ease-out"
          style={{ transform: `translate(${mouse.x * -20}px, ${mouse.y * 20}px)` }}
        />
        <div
          className="absolute -right-40 top-[65%] h-80 w-80 rounded-full bg-cyan-500/5 blur-[100px] transition-transform duration-300 ease-out"
          style={{ transform: `translate(${mouse.x * 20}px, ${mouse.y * -20}px)` }}
        />
      </div>

      <section className="relative mx-auto max-w-5xl">
        {/* ENCABEZADO */}
        <div id="inicio" className="max-w-3xl scroll-mt-28">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold tracking-widest text-cyan-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              SOBRE NOSOTROS
            </span>

            <button
              onClick={copiarEnlace}
              className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-sm font-bold text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-300"
            >
              <IconLink className="h-3.5 w-3.5" /> Compartir
            </button>
          </div>

          <h1 className="mt-6 text-4xl font-black leading-tight text-white md:text-6xl">
            Tecnología pensada
            <span className="block bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">
              para ti.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
            JR TECH es una tienda enfocada en la venta de productos tecnológicos para
            estudiantes, trabajadores, gamers y amantes de la tecnología. Creemos que
            encontrar lo que necesitas no debería ser complicado.
          </p>
        </div>

        {/* ESTADÍSTICAS */}
        <Revelar className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </Revelar>

        {/* PILARES */}
        <div id="pilares" className="mt-24 scroll-mt-28">
          <Revelar as="p" className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
            Nuestros pilares
          </Revelar>
          <Revelar as="h2" className="mt-3 text-2xl font-black text-white md:text-3xl">
            Lo que nos mueve todos los días
          </Revelar>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {pillars.map((pillar, index) => (
              <Revelar key={pillar.title} delay={index * 100}>
                <PillarCard {...pillar} />
              </Revelar>
            ))}
          </div>
        </div>

        {/* HISTORIA */}
        <div id="historia" className="mt-24 scroll-mt-28">
          <Revelar as="p" className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
            Nuestra historia
          </Revelar>
          <Revelar as="h2" className="mt-3 text-2xl font-black text-white md:text-3xl">
            De un local pequeño a tu próxima compra en línea
          </Revelar>

          <LineaDeTiempo hitos={hitos} />
        </div>

        {/* COMPROMISO */}
        <div id="compromiso" className="mt-24 scroll-mt-28">
          <Revelar className="grid gap-10 rounded-3xl border border-slate-800 bg-slate-900/50 p-8 md:grid-cols-[1fr_1.2fr] md:p-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                Por qué elegirnos
              </span>
              <h2 className="mt-3 text-2xl font-black text-white md:text-3xl">
                Compromiso real con cada cliente
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-400">
                No solo vendemos tecnología, acompañamos todo el proceso para que tomes la
                mejor decisión.
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-5 text-base leading-6 text-slate-300 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-slate-900"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400 transition-transform group-hover:scale-110">
                    <IconCheckCircle className="h-3.5 w-3.5" />
                  </span>
                  {highlight}
                </li>
              ))}
            </ul>
          </Revelar>
        </div>

        {/* TESTIMONIOS */}
        <div id="testimonios" className="mt-24 scroll-mt-28">
          <Revelar>
            <Testimonials />
          </Revelar>
        </div>

        {/* PREGUNTAS FRECUENTES */}
        <div id="faq" className="mt-24 scroll-mt-28">
          <Revelar as="p" className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
            Preguntas frecuentes
          </Revelar>
          <Revelar as="h2" className="mt-3 text-2xl font-black text-white md:text-3xl">
            Todo lo que quizá quieras saber
          </Revelar>

          <Revelar>
            <Faq preguntas={preguntas} />
          </Revelar>
        </div>

        {/* CTA */}
        <Revelar className="mt-24 flex flex-col items-center justify-between gap-6 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-8 text-center md:flex-row md:p-10 md:text-left">
          <div>
            <h2 className="text-2xl font-black text-white">
              ¿Listo para encontrar tu próximo equipo?
            </h2>
            <p className="mt-2 text-base leading-7 text-slate-400">
              Explora el catálogo o escríbenos si necesitas ayuda para decidir.
            </p>
          </div>

          <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
            <button
              onClick={abrirWhatsapp}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 text-base font-bold text-slate-950 transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-300 hover:shadow-lg hover:shadow-cyan-400/20 active:scale-95"
            >
              <IconChat className="h-4 w-4" /> Hablar por WhatsApp
            </button>

            <a
              href="/productos"
              className="rounded-xl border border-cyan-400/30 px-6 py-3.5 text-base font-bold text-cyan-300 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400 hover:bg-cyan-400/10 active:scale-95"
            >
              Ver catálogo →
            </a>
          </div>
        </Revelar>
      </section>
    </main>
  );
}

export default Quienes;