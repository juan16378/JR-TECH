import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Carousel from "../components/carrusel";
import {
  IconBox,
  IconCheckCircle,
  IconCoin,
  IconCreditCard,
  IconGamepad,
  IconHeadphones,
  IconLaptop,
  IconLock,
  IconSmartphone,
  IconStar,
  IconTruck,
  IconZap,
} from "../components/Icons";

/* =========================================================
   CONTADOR ANIMADO
========================================================= */

function useCountUp(target, start) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;

    const duration = 1200;
    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min(
        (now - startTime) / duration,
        1
      );

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
   ESTADÍSTICAS DEL HERO
========================================================= */

function HeroStat({ value, suffix, label }) {
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
      {
        threshold: 0.5,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-slate-900"
    >
      <p className="text-2xl font-black text-cyan-400 md:text-3xl">
        {count}
        {suffix}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {label}
      </p>
    </div>
  );
}

/* =========================================================
   FILTRO DE CATEGORÍAS
========================================================= */

function CategoryFilter({ active, onChange }) {
  const categories = [
    {
      id: "todos",
      label: "Todos",
      icon: IconBox,
    },
    {
      id: "celulares",
      label: "Celulares",
      icon: IconSmartphone,
    },
    {
      id: "computadores",
      label: "Computadores",
      icon: IconLaptop,
    },
    {
      id: "accesorios",
      label: "Accesorios",
      icon: IconHeadphones,
    },
    {
      id: "videojuegos",
      label: "Videojuegos",
      icon: IconGamepad,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onChange(category.id)}
          aria-pressed={active === category.id}
          className={`group flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
            active === category.id
              ? "border-cyan-400 bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20"
              : "border-slate-700 bg-slate-900 text-slate-400 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:bg-slate-800 hover:text-cyan-400"
          }`}
        >
          <category.icon className="h-4 w-4 flex-shrink-0" />

          {category.label}
        </button>
      ))}
    </div>
  );
}

/* =========================================================
   BUSCADOR DE PRODUCTO
========================================================= */

function ProductFinder({ onFinish }) {
  const [step, setStep] = useState(0);
  const [uso, setUso] = useState(null);
  const [presupuesto, setPresupuesto] = useState(null);

  const usos = [
    {
      id: "trabajo",
      label: "Trabajo o estudio",
      icon: IconLaptop,
    },
    {
      id: "gaming",
      label: "Gaming",
      icon: IconGamepad,
    },
    {
      id: "diario",
      label: "Uso diario",
      icon: IconSmartphone,
    },
  ];

  const presupuestos = [
    {
      id: "bajo",
      label: "Económico",
      icon: IconCoin,
    },
    {
      id: "medio",
      label: "Medio",
      icon: IconCreditCard,
    },
    {
      id: "alto",
      label: "Premium",
      icon: IconStar,
    },
  ];

  const recomendaciones = {
    "trabajo-bajo": {
      titulo: "Computadores de entrada",
      categoria: "computadores",
    },

    "trabajo-medio": {
      titulo: "Laptops para productividad",
      categoria: "computadores",
    },

    "trabajo-alto": {
      titulo: "Equipos de alto rendimiento",
      categoria: "computadores",
    },

    "gaming-bajo": {
      titulo: "Accesorios gamer básicos",
      categoria: "accesorios",
    },

    "gaming-medio": {
      titulo: "Setups gamer intermedios",
      categoria: "videojuegos",
    },

    "gaming-alto": {
      titulo: "Consolas y equipos gamer top",
      categoria: "videojuegos",
    },

    "diario-bajo": {
      titulo: "Celulares económicos",
      categoria: "celulares",
    },

    "diario-medio": {
      titulo: "Celulares gama media",
      categoria: "celulares",
    },

    "diario-alto": {
      titulo: "Celulares gama alta",
      categoria: "celulares",
    },
  };

  const resultado =
    uso && presupuesto
      ? recomendaciones[`${uso}-${presupuesto}`]
      : null;

  const reiniciar = () => {
    setStep(0);
    setUso(null);
    setPresupuesto(null);
  };

  const seleccionarUso = (id) => {
    setUso(id);
    setStep(1);
  };

  const seleccionarPresupuesto = (id) => {
    setPresupuesto(id);
  };

  const verProductos = () => {
    if (resultado) {
      onFinish(resultado.categoria);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 md:p-10">

      {/* LUCES DECORATIVAS */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative">

        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />

          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Asistente JR Tech
          </span>
        </div>

        <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
          Encuentra tu producto ideal
        </h2>

        <p className="mt-3 max-w-2xl text-slate-400">
          Responde dos preguntas y te ayudaremos a encontrar
          la tecnología que mejor se adapta a ti.
        </p>

        {/* BARRA DE PROGRESO */}
        <div className="mt-7 flex gap-2">
          <div
            className={`h-1 flex-1 rounded-full transition-all ${
              step >= 0
                ? "bg-cyan-400"
                : "bg-slate-700"
            }`}
          />

          <div
            className={`h-1 flex-1 rounded-full transition-all ${
              step >= 1
                ? "bg-cyan-400"
                : "bg-slate-700"
            }`}
          />

          <div
            className={`h-1 flex-1 rounded-full transition-all ${
              resultado
                ? "bg-cyan-400"
                : "bg-slate-700"
            }`}
          />
        </div>

        {!resultado ? (
          <div className="mt-8">

            {/* PASO 1 */}
            {step === 0 && (
              <div>
                <p className="mb-4 text-sm font-bold text-slate-200">
                  01 — ¿Para qué lo vas a utilizar?
                </p>

                <div className="grid gap-3 md:grid-cols-3">
                  {usos.map((usoItem) => (
                    <button
                      key={usoItem.id}
                      type="button"
                      onClick={() =>
                        seleccionarUso(usoItem.id)
                      }
                      className="group rounded-2xl border border-slate-700 bg-slate-950/60 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/60 hover:bg-slate-800 hover:shadow-lg hover:shadow-cyan-500/10"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-cyan-400 transition-colors group-hover:border-cyan-400/50 group-hover:bg-cyan-400/10">
                        <usoItem.icon className="h-5 w-5" />
                      </span>

                      <p className="mt-4 font-bold text-white transition-colors group-hover:text-cyan-400">
                        {usoItem.label}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Seleccionar →
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASO 2 */}
            {step === 1 && (
              <div>
                <p className="mb-4 text-sm font-bold text-slate-200">
                  02 — ¿Qué presupuesto tienes?
                </p>

                <div className="grid gap-3 md:grid-cols-3">
                  {presupuestos.map((presupuestoItem) => (
                    <button
                      key={presupuestoItem.id}
                      type="button"
                      onClick={() =>
                        seleccionarPresupuesto(
                          presupuestoItem.id
                        )
                      }
                      className="group rounded-2xl border border-slate-700 bg-slate-950/60 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/60 hover:bg-slate-800 hover:shadow-lg hover:shadow-cyan-500/10"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-cyan-400 transition-colors group-hover:border-cyan-400/50 group-hover:bg-cyan-400/10">
                        <presupuestoItem.icon className="h-5 w-5" />
                      </span>

                      <p className="mt-4 font-bold text-white transition-colors group-hover:text-cyan-400">
                        {presupuestoItem.label}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Seleccionar →
                      </p>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="mt-5 text-sm font-semibold text-slate-500 transition hover:text-cyan-400"
                >
                  ← Volver a la pregunta anterior
                </button>
              </div>
            )}
          </div>
        ) : (
          /* RESULTADO */
          <div className="relative mt-8 overflow-hidden rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-6 md:p-8">

            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400 text-slate-950">
                  <IconCheckCircle className="h-4.5 w-4.5" />
                </span>

                <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                  Recomendación encontrada
                </p>
              </div>

              <p className="mt-5 text-2xl font-black text-white">
                {resultado.titulo}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Según tus respuestas, esta es la categoría que
                mejor se adapta a tus necesidades.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={verProductos}
                  className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-300 hover:shadow-lg hover:shadow-cyan-400/20"
                >
                  Ver productos →
                </button>

                <button
                  type="button"
                  onClick={reiniciar}
                  className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition-all duration-300 hover:border-cyan-400 hover:text-cyan-400"
                >
                  Empezar de nuevo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   PÁGINA INICIO
========================================================= */

function Inicio() {
  const [categoria, setCategoria] = useState("todos");
  const [hoveredBeneficio, setHoveredBeneficio] =
    useState(null);

  const beneficios = [
    {
      titulo: "Envíos rápidos",
      texto:
        "Recibe tus productos de manera rápida y segura.",
      detalle:
        "Cobertura a toda Colombia con seguimiento de tu pedido.",
      icon: IconTruck,
    },

    {
      titulo: "Compra segura",
      texto:
        "Protegemos tus datos y tu experiencia de compra.",
      detalle:
        "Trabajamos para ofrecer una experiencia de compra confiable.",
      icon: IconLock,
    },

    {
      titulo: "Tecnología",
      texto:
        "Productos modernos para tus necesidades.",
      detalle:
        "Encuentra diferentes categorías de tecnología en JR TECH.",
      icon: IconZap,
    },
  ];

  const seleccionarCategoria = (cat) => {
    setCategoria(cat);

    const elemento =
      document.getElementById("destacados");

    if (elemento) {
      elemento.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <main className="overflow-hidden bg-slate-950 text-white">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative min-h-[700px] overflow-hidden border-b border-slate-800 px-5 py-24 md:py-32">

        {/* GRID DE FONDO */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* LUZ PRINCIPAL */}
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />

        {/* CÍRCULOS */}
        <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full border border-cyan-400/10" />

        <div className="pointer-events-none absolute -right-20 top-40 h-64 w-64 rounded-full border border-cyan-400/10" />

        <div className="relative mx-auto max-w-7xl">

          <div className="max-w-4xl">

            {/* ETIQUETA */}
            <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />

                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>

              <span className="text-xs font-bold tracking-widest text-cyan-400">
                JR TECH • TECNOLOGÍA E INNOVACIÓN
              </span>
            </div>

            {/* TÍTULO */}
            <h1 className="mt-8 text-5xl font-black leading-[1.05] tracking-tight text-white md:text-7xl lg:text-8xl">
              La tecnología
              <br />

              <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                que necesitas.
              </span>
            </h1>

            {/* DESCRIPCIÓN */}
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400 md:text-xl">
              Celulares, computadores, accesorios,
              videojuegos y mucho más en un solo lugar.
            </p>

            {/* BOTONES */}
            <div className="mt-9 flex flex-wrap gap-3">

              <a
                href="#destacados"
                className="group flex items-center gap-3 rounded-xl bg-cyan-400 px-7 py-3.5 text-sm font-black text-slate-950 transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-300 hover:shadow-xl hover:shadow-cyan-400/20"
              >
                Explorar catálogo

                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </a>

              <Link
                to="/contacto"
                className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/50 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/60 hover:text-cyan-400"
              >
                Contactarnos
              </Link>

            </div>

            {/* ESTADÍSTICAS */}
            <div className="mt-14 grid max-w-xl grid-cols-3 gap-3 border-t border-slate-800 pt-7">

              <HeroStat
                value={1200}
                suffix="+"
                label="Clientes"
              />

              <HeroStat
                value={300}
                suffix="+"
                label="Productos"
              />

              <HeroStat
                value={24}
                suffix="h"
                label="Respuesta"
              />

            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          CARRUSEL
      ===================================================== */}

      <section
        id="destacados"
        className="relative bg-slate-900 px-5 py-20"
      >

        {/* LUZ */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">

          <div className="mb-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-cyan-400" />

                <p className="text-xs font-bold tracking-[0.25em] text-cyan-400">
                  CATÁLOGO
                </p>
              </div>

              <h2 className="mt-3 text-4xl font-black text-white md:text-5xl">
                Tecnología para todos
              </h2>

              <p className="mt-3 max-w-xl text-slate-500">
                Explora nuestros productos y encuentra la
                tecnología que necesitas.
              </p>
            </div>

            <CategoryFilter
              active={categoria}
              onChange={setCategoria}
            />

          </div>

          <div className="rounded-3xl">
            <Carousel categoria={categoria} />
          </div>

        </div>
      </section>

      {/* =====================================================
          BENEFICIOS
      ===================================================== */}

      <section className="relative border-y border-slate-800 bg-slate-950 px-5 py-20">

        <div className="mx-auto max-w-7xl">

          <div className="mb-10 max-w-2xl">

            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-cyan-400" />

              <p className="text-xs font-bold tracking-[0.25em] text-cyan-400">
                ¿POR QUÉ JR TECH?
              </p>
            </div>

            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
              Una experiencia pensada para ti
            </h2>

          </div>

          <div className="grid gap-5 md:grid-cols-3">

            {beneficios.map((beneficio, index) => (
              <div
                key={beneficio.titulo}
                onMouseEnter={() =>
                  setHoveredBeneficio(index)
                }
                onMouseLeave={() =>
                  setHoveredBeneficio(null)
                }
                className={`group relative overflow-hidden rounded-2xl border p-7 transition-all duration-500 ${
                  hoveredBeneficio === index
                    ? "border-cyan-400/50 bg-slate-900 shadow-xl shadow-cyan-500/5"
                    : "border-slate-800 bg-slate-900/40"
                }`}
              >

                {/* LUZ */}
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/5 blur-2xl transition-all duration-500 group-hover:bg-cyan-400/10" />

                <div className="relative">

                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-cyan-400 transition-all duration-300 ${
                      hoveredBeneficio === index
                        ? "border-cyan-400/40 bg-cyan-400/10 scale-110"
                        : "border-slate-700 bg-slate-950"
                    }`}
                  >
                    <beneficio.icon className="h-6 w-6" />
                  </div>

                  <h3 className="mt-6 text-xl font-black text-white">
                    {beneficio.titulo}
                  </h3>

                  <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-500">
                    {hoveredBeneficio === index
                      ? beneficio.detalle
                      : beneficio.texto}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-cyan-400">
                    <span>
                      {hoveredBeneficio === index
                        ? "Más información"
                        : "Pasa el cursor"}
                    </span>

                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </div>

                </div>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* =====================================================
          PRODUCT FINDER
      ===================================================== */}

      <section className="relative overflow-hidden bg-slate-900 px-5 py-20">

        <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl">

          <ProductFinder
            onFinish={seleccionarCategoria}
          />

        </div>

      </section>

      

    </main>
  );
}

export default Inicio;