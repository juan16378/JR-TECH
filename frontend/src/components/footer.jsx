import { useState } from "react";
import logo from "../assets/images/logo.png";

function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    setSubscribed(true);
    setEmail("");
  };

  const productLinks = ["Smartphones", "Computadores", "Accesorios", "Videojuegos"];
  const companyLinks = ["Quiénes somos", "Inicio", "Contacto", "Iniciar sesión"];

  const socials = [
    {
      name: "Instagram",
      href: "#",
      path: "M12 2c2.7 0 3.05.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.55.55.9 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.07.06 1.42.06 4.12s-.01 3.05-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.76 4.9 4.9 0 0 1-1.76 1.15c-.64.25-1.37.42-2.43.47-1.07.05-1.42.06-4.12.06s-3.05-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.76-1.15 4.9 4.9 0 0 1-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.05 2 14.7 2 12s.01-3.05.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76A4.9 4.9 0 0 1 5.45.54c.64-.25 1.37-.42 2.43-.47C8.95 2.01 9.3 2 12 2Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4ZM17.4 6.6a1.17 1.17 0 1 1-2.34 0 1.17 1.17 0 0 1 2.34 0Z",
    },
    {
      name: "Facebook",
      href: "#",
      path: "M13.5 22v-8.4h2.8l.42-3.3h-3.22V8.1c0-.96.27-1.61 1.64-1.61h1.75V3.55C15.98 3.5 15.02 3.4 13.9 3.4c-2.33 0-3.93 1.42-3.93 4.03v2.87H7.17v3.3h2.8V22h3.53Z",
    },
    {
      name: "X",
      href: "#",
      path: "M18.24 3H21l-6.5 7.43L22 21h-6.2l-4.86-6.36L5.32 21H2.55l6.96-7.95L2 3h6.35l4.39 5.81L18.24 3Zm-1.08 16.2h1.53L7.9 4.7H6.26l10.9 14.5Z",
    },
    {
      name: "WhatsApp",
      href: "#",
      path: "M12.02 2C6.5 2 2.03 6.47 2.03 12c0 1.86.5 3.6 1.38 5.1L2 22l5.05-1.37A9.96 9.96 0 0 0 12.02 22c5.53 0 10-4.47 10-10S17.55 2 12.02 2Zm0 18.1c-1.62 0-3.16-.44-4.48-1.24l-.32-.19-3 .8.8-2.92-.2-.3a8.1 8.1 0 0 1-1.28-4.35c0-4.47 3.63-8.1 8.1-8.1s8.1 3.63 8.1 8.1-3.63 8.1-8.1 8.1Zm4.44-6.06c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.17-.7-.63-1.18-1.4-1.31-1.64-.14-.24-.01-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42-.14-.01-.3-.01-.46-.01-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02 0 1.19.87 2.34.99 2.5.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z",
    },
  ];

  return (
    <footer className="relative mt-16 overflow-hidden border-t border-cyan-500/10 bg-[#05060f] text-white">

      {/* patrón de circuito de fondo, decorativo y muy sutil */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
      >
        <defs>
          <pattern id="jr-circuit" width="120" height="120" patternUnits="userSpaceOnUse">
            <path
              d="M0 60H40M80 60H120M60 0V40M60 80V120"
              stroke="#22d3ee"
              strokeWidth="1"
              fill="none"
            />
            <circle cx="60" cy="60" r="3" fill="#22d3ee" />
            <circle cx="40" cy="60" r="2" fill="#22d3ee" />
            <circle cx="80" cy="60" r="2" fill="#22d3ee" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#jr-circuit)" />
      </svg>

      {/* eyebrow tipo HUD */}
      <div className="relative border-b border-slate-900 px-6 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 font-mono text-[11px] tracking-widest text-cyan-500/70">
          <span className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            SISTEMA EN LÍNEA
          </span>
          <span>6.2442° N · 75.5812° O — MEDELLÍN, CO</span>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.3fr_0.8fr_0.8fr_1.3fr]">

        <div>
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="JR Tech Store"
              className="h-9 w-9 flex-shrink-0 rounded-full border border-cyan-400/40 object-contain"
            />
            <h2 className="text-xl font-bold tracking-tight text-white">
              JR TECH
            </h2>
          </div>

          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
            Tecnología, innovación y productos pensados para facilitar tu
            día a día. Todo en un solo lugar.
          </p>

          <div className="mt-5 flex gap-2">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                aria-label={s.name}
                className="group flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-cyan-400 hover:shadow-[0_0_12px_rgba(34,211,238,0.35)]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>

          <form onSubmit={handleSubscribe} className="mt-6">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-cyan-500/60">
              Newsletter
            </p>
            {subscribed ? (
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-300">
                Listo, te avisaremos de nuevos lanzamientos.
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition-colors duration-200 focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="flex-shrink-0 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-cyan-400 active:scale-95"
                >
                  Unirme
                </button>
              </div>
            )}
          </form>
        </div>

        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-cyan-500/60">
            Productos
          </h3>
          <ul className="mt-4 space-y-2.5">
            {productLinks.map((item) => (
              <li key={item}>
                <a
                  href="#"
                  className="group inline-flex items-center text-sm text-slate-400 transition-colors duration-200 hover:text-cyan-400"
                >
                  <span className="mr-0 h-px w-0 bg-cyan-400 transition-all duration-200 group-hover:mr-2 group-hover:w-3" />
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-cyan-500/60">
            Empresa
          </h3>
          <ul className="mt-4 space-y-2.5">
            {companyLinks.map((item) => (
              <li key={item}>
                <a
                  href="#"
                  className="group inline-flex items-center text-sm text-slate-400 transition-colors duration-200 hover:text-cyan-400"
                >
                  <span className="mr-0 h-px w-0 bg-cyan-400 transition-all duration-200 group-hover:mr-2 group-hover:w-3" />
                  {item}
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-1.5 text-sm text-slate-400">
            <p className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 fill-cyan-400/80">
                <path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13Zm2.2.3 7.8 6.15 7.8-6.15H4.2ZM20 7.9l-7.4 5.83a1 1 0 0 1-1.2 0L4 7.9v10.6c0 .28.22.5.5.5h15a.5.5 0 0 0 .5-.5V7.9Z" />
              </svg>
              contacto@jrtech.com
            </p>
          </div>
        </div>

        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-cyan-500/60">
            Dónde estamos
          </h3>

          <div className="relative mt-4 overflow-hidden rounded-lg border border-slate-800">
            <iframe
              title="Ubicación JR Tech en Medellín"
              src="https://www.google.com/maps?q=Medell%C3%ADn,Antioquia,Colombia&output=embed"
              className="h-44 w-full grayscale invert-[0.92] contrast-[1.05] filter"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-cyan-400/20" />
            <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-slate-950/80 px-2.5 py-1 text-[11px] text-cyan-300">
              <svg viewBox="0 0 24 24" className="h-3 w-3 fill-cyan-400">
                <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
              </svg>
              Medellín, Colombia
            </div>
          </div>
        </div>

      </div>

      <div className="relative border-t border-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 font-mono text-[11px] tracking-wide text-slate-500 md:flex-row">
          <p>© 2026 JR_TECH — TODOS LOS DERECHOS RESERVADOS</p>

          <div className="flex items-center gap-5">
            <a href="#" className="transition-colors duration-200 hover:text-cyan-400">
              Términos
            </a>
            <a href="#" className="transition-colors duration-200 hover:text-cyan-400">
              Privacidad
            </a>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-1 rounded-full border border-slate-800 px-3 py-1.5 text-slate-400 transition-all duration-200 hover:border-cyan-400/60 hover:text-cyan-400"
            >
              Volver arriba
              <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
                <path d="M12 5l-7 7h4v7h6v-7h4z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

    </footer>
  );
}

export default Footer;