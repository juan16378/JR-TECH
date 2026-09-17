import { Component } from "react";

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { tieneError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { tieneError: true, error };
    }

    componentDidCatch(error, info) {
        // Esto es lo que necesito ver en tu consola para
        // encontrar la causa exacta de la pantalla en blanco.
        console.error("❌ Error capturado por ErrorBoundary:", error, info);
    }

    reintentar = () => {
        this.setState({ tieneError: false, error: null });
        window.location.href = "/login";
    };

    render() {
        if (this.state.tieneError) {
            return (
                <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center text-white">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-400/10 text-3xl">
                        !
                    </div>

                    <h1 className="text-xl font-black">
                        Algo salió mal
                    </h1>

                    <p className="max-w-md text-sm text-slate-300">
                        Ocurrió un error inesperado al cargar esta
                        sección. Por favor intenta de nuevo.
                    </p>

                    <button
                        onClick={this.reintentar}
                        className="mt-2 rounded-lg bg-cyan-400 px-5 py-2 font-bold text-slate-950 hover:bg-cyan-300"
                    >
                        Volver al inicio de sesión
                    </button>
                </main>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;