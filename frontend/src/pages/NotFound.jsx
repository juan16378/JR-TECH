import { Link } from "react-router-dom";
import { IconHome, IconSearch } from "../components/Icons";

// ==========================================
// PÁGINA 404
// ==========================================
// Se muestra cuando la URL no coincide con ninguna ruta
// conocida (link roto, marcador viejo, typo, etc.).
// ==========================================

function NotFound() {
    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-5 py-24 text-center text-white">

            {/* FONDO */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />
                <div
                    className="absolute inset-0 opacity-[0.15]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px)",
                        backgroundSize: "60px 60px",
                    }}
                />
            </div>

            <div className="relative">
                <p className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-500 bg-clip-text text-8xl font-black leading-none text-transparent md:text-9xl">
                    404
                </p>

                <h1 className="mt-6 text-2xl font-black text-white md:text-3xl">
                    Esta página no existe
                </h1>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
                    Puede que el enlace esté roto o que la dirección tenga un error.
                    Vuelve al inicio o revisa nuestro catálogo.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        to="/"
                        className="group flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-300 hover:shadow-xl hover:shadow-cyan-400/20"
                    >
                        <IconHome className="h-4 w-4" />
                        Ir al inicio
                    </Link>

                    <Link
                        to="/productos"
                        className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/60 hover:text-cyan-400"
                    >
                        <IconSearch className="h-4 w-4" />
                        Ver productos
                    </Link>
                </div>
            </div>

        </main>
    );
}

export default NotFound;
