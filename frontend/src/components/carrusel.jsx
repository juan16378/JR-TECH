import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import iphone from "../assets/images/iphone.jpg";
import samsung from "../assets/images/samsung.jpg";
import laptop from "../assets/images/laptop.jpg";
import macbook from "../assets/images/macbook.jpg";
import audifonos from "../assets/images/audifonos.jpg";
import teclado from "../assets/images/teclado.jpg";
import mouse from "../assets/images/mouse.jpg";
import playstation from "../assets/images/playstation.jpg";
import smartwatch from "../assets/images/smartwatch.jpg";
import camara from "../assets/images/camara.jpg";
import logo from "../assets/images/logo.png";

import { IconBox, IconShield, IconTruck } from "./Icons";

const DURACION_MS = 5000;

const productos = [
  {
    imagen: iphone,
    titulo: "iPhone",
    descripcion:
      "Smartphone de alto rendimiento, cámara avanzada y excelente diseño.",
    categoria: "Celulares",
  },
  {
    imagen: samsung,
    titulo: "Samsung Galaxy",
    descripcion:
      "Tecnología moderna, gran pantalla y excelente rendimiento.",
    categoria: "Celulares",
  },
  {
    imagen: laptop,
    titulo: "Laptop Lenovo",
    descripcion:
      "Computador ideal para estudiar, trabajar y navegar.",
    categoria: "Computadores",
  },
  {
    imagen: macbook,
    titulo: "MacBook",
    descripcion:
      "Diseño elegante y potencia para tareas profesionales.",
    categoria: "Computadores",
  },
  {
    imagen: audifonos,
    titulo: "Audífonos",
    descripcion:
      "Sonido envolvente para música, videojuegos y entretenimiento.",
    categoria: "Accesorios",
  },
  {
    imagen: teclado,
    titulo: "Teclado Gamer",
    descripcion:
      "Teclado diseñado para mejorar tu experiencia de juego.",
    categoria: "Accesorios",
  },
  {
    imagen: mouse,
    titulo: "Mouse",
    descripcion:
      "Precisión y comodidad para trabajar o jugar.",
    categoria: "Accesorios",
  },
  {
    imagen: playstation,
    titulo: "PlayStation",
    descripcion:
      "Disfruta de tus videojuegos favoritos con gran rendimiento.",
    categoria: "Videojuegos",
  },
  {
    imagen: smartwatch,
    titulo: "Smartwatch",
    descripcion:
      "Tecnología inteligente para acompañarte todos los días.",
    categoria: "Tecnología",
  },
  {
    imagen: camara,
    titulo: "Cámara",
    descripcion:
      "Captura tus mejores momentos con excelente calidad.",
    categoria: "Accesorios",
  },
];

function Carrusel() {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);

  const producto = productos[actual];
  const tocandoRef = useRef(null);

  const irA = (index) => {
    setActual(((index % productos.length) + productos.length) % productos.length);
  };

  const siguiente = () => irA(actual + 1);
  const anterior = () => irA(actual - 1);

  // ==========================================
  // AVANCE AUTOMÁTICO
  // ==========================================

  useEffect(() => {
    if (pausado) return;

    const intervalo = setInterval(() => {
      setActual((prev) => (prev + 1) % productos.length);
    }, DURACION_MS);

    return () => clearInterval(intervalo);
  }, [pausado, actual]);

  // ==========================================
  // TECLADO (← →) cuando el carrusel tiene foco
  // ==========================================

  const manejarTeclado = (e) => {
    if (e.key === "ArrowRight") siguiente();
    if (e.key === "ArrowLeft") anterior();
  };

  // ==========================================
  // GESTOS TÁCTILES (swipe en móvil)
  // ==========================================

  const alTocarInicio = (e) => {
    tocandoRef.current = e.touches[0].clientX;
  };

  const alTocarFin = (e) => {
    if (tocandoRef.current === null) return;
    const delta = e.changedTouches[0].clientX - tocandoRef.current;
    if (Math.abs(delta) > 40) {
      delta < 0 ? siguiente() : anterior();
    }
    tocandoRef.current = null;
  };

  return (
    <section
      tabIndex={0}
      onKeyDown={manejarTeclado}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      onTouchStart={alTocarInicio}
      onTouchEnd={alTocarFin}
      className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
      aria-roledescription="carrusel"
      aria-label="Productos destacados"
    >
      {/* DECORACIÓN DE FONDO */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="relative grid md:grid-cols-2">

        {/* ================= IMAGEN ================= */}
        <div className="group relative h-[320px] overflow-hidden sm:h-[400px] md:h-auto md:min-h-[560px]">

          {/* BARRAS DE PROGRESO ESTILO "STORY" */}
          <div className="absolute left-4 right-4 top-4 z-10 flex gap-1.5">
            {productos.map((p, index) => (
              <button
                key={p.titulo}
                type="button"
                onClick={() => irA(index)}
                aria-label={`Ir a ${p.titulo}`}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"
              >
                <span
                  className={`block h-full rounded-full bg-white ${
                    index === actual ? "" : index < actual ? "w-full" : "w-0"
                  }`}
                  style={
                    index === actual
                      ? {
                          animation: `fillBar ${DURACION_MS}ms linear forwards`,
                          animationPlayState: pausado ? "paused" : "running",
                        }
                      : undefined
                  }
                  key={index === actual ? `activo-${actual}` : `inactivo-${index}`}
                />
              </button>
            ))}
          </div>

          <img
            key={actual}
            src={producto.imagen}
            alt={producto.titulo}
            className="h-full w-full animate-[fadeIn_0.5s_ease] object-cover transition-transform duration-700 group-hover:scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-950/30 md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-slate-950/50" />

          {/* CATEGORÍA */}
          <div className="absolute left-6 top-10">
            <span className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
              {producto.categoria}
            </span>
          </div>

          {/* FLECHAS */}
          <button
            type="button"
            onClick={anterior}
            aria-label="Producto anterior"
            className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white opacity-0 backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-cyan-400 hover:bg-cyan-400 hover:text-slate-950 group-hover:opacity-100 focus-visible:opacity-100"
          >
            ←
          </button>

          <button
            type="button"
            onClick={siguiente}
            aria-label="Siguiente producto"
            className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white opacity-0 backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-cyan-400 hover:bg-cyan-400 hover:text-slate-950 group-hover:opacity-100 focus-visible:opacity-100"
          >
            →
          </button>

          {/* CONTADOR */}
          <div className="absolute bottom-5 left-6 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-bold text-white/80 backdrop-blur-md">
            {String(actual + 1).padStart(2, "0")} / {String(productos.length).padStart(2, "0")}
          </div>
        </div>

        {/* ================= INFORMACIÓN ================= */}
        <div key={`info-${actual}`} className="flex animate-[fadeIn_0.5s_ease] flex-col justify-center p-8 md:p-14">

          {/* MARCA */}
          <div className="mb-5 flex items-center gap-3">
            <img
              src={logo}
              alt="JR Tech Store"
              className="h-10 w-10 flex-shrink-0 rounded-full object-contain shadow-lg shadow-cyan-400/20"
            />
            <div>
              <p className="text-sm font-bold text-white">JR TECH</p>
              <p className="text-xs text-slate-500">Tecnología e innovación</p>
            </div>
          </div>

          {/* TÍTULO */}
          <h2 className="text-4xl font-black leading-tight text-white md:text-5xl">
            {producto.titulo}
          </h2>

          {/* DESCRIPCIÓN */}
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-400 md:text-lg">
            {producto.descripcion}
          </p>

          {/* BADGES DE CONFIANZA */}
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-300">
              <IconShield className="h-3.5 w-3.5 text-cyan-400" />
              Garantía incluida
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-300">
              <IconTruck className="h-3.5 w-3.5 text-cyan-400" />
              Envío nacional
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-300">
              <IconBox className="h-3.5 w-3.5 text-cyan-400" />
              Stock disponible
            </span>
          </div>

          {/* CTA */}
          <div className="mt-8">
            <Link
              to="/productos"
              className="group inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition-all duration-200 hover:-translate-y-1 hover:bg-cyan-300 hover:shadow-lg hover:shadow-cyan-400/20"
            >
              Ver en la tienda
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {/* ESTADO */}
          <p className="mt-8 text-xs text-slate-600">
            {pausado
              ? "Carrusel en pausa"
              : `Cambia automáticamente cada ${DURACION_MS / 1000} segundos`}
            <span className="hidden sm:inline"> · usa las flechas del teclado para navegar</span>
          </p>
        </div>
      </div>
    </section>
  );
}

export default Carrusel;
