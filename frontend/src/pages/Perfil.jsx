import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AreaLineChart, StatusBreakdownBars } from "../components/Charts";
import HiloPQR from "../components/HiloPQR";
import Toast, { useToasts } from "../components/Toast";
import {
    IconBox,
    IconChartBar,
    IconChat,
    IconCheckCircle,
    IconClipboard,
    IconCoin,
    IconDownload,
    IconFileSpreadsheet,
    IconFileText,
    IconHeart,
    IconHome,
    IconLightbulb,
    IconLock,
    IconLogOut,
    IconReceipt,
    IconRefresh,
    IconSettings,
    IconTrendingUp,
    IconTruck,
    IconUser,
    IconWarning,
    IconXCircle,
} from "../components/Icons";

import { API_URL } from "../config";

// Mismos colores por estado de pedido que se usan en el resto del sitio
// (estiloEstado/barraEstado más abajo, AdminPanel.jsx, EmpleadoPanel.jsx).
const ESTADOS_COLOR = {
    Pendiente: "#64748b",
    Procesando: "#fbbf24",
    Enviado: "#22d3ee",
    Entregado: "#34d399",
    Cancelado: "#f87171",
};

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const PASOS_PEDIDO = ["Pendiente", "Procesando", "Enviado", "Entregado"];
const ICONO_PASO = {
    Pendiente: IconClipboard,
    Procesando: IconSettings,
    Enviado: IconTruck,
    Entregado: IconCheckCircle,
};

// Secciones del panel — mismo patrón que la barra lateral de AdminPanel /
// EmpleadoPanel, pero aquí cada una cambia el contenido en vez de navegar
// a otra ruta (el panel de cliente vive en una sola página).
const SECCIONES = [
    { id: "resumen", label: "Resumen", icono: IconChartBar, color: "cyan" },
    { id: "pedidos", label: "Pedidos", icono: IconReceipt, color: "orange" },
    { id: "favoritos", label: "Favoritos", icono: IconHeart, color: "red" },
    { id: "pqr", label: "PQR", icono: IconChat, color: "amber" },
    { id: "datos", label: "Mis datos", icono: IconUser, color: "blue" },
    { id: "seguridad", label: "Seguridad", icono: IconLock, color: "violet" },
    { id: "estadisticas", label: "Estadísticas", icono: IconTrendingUp, color: "emerald" },
];

const SUBTITULOS = {
    resumen: "Panel de cuenta",
    pedidos: "Mis pedidos",
    favoritos: "Mis favoritos",
    pqr: "Peticiones, quejas y reclamos",
    datos: "Mis datos personales",
    seguridad: "Seguridad de la cuenta",
    estadisticas: "Diagramas de estadísticas",
};

// Deben coincidir con TIPOS_PQR/ESTADOS_PQR en backend/app/models/pqr.py.
const TIPOS_PQR = ["Petición", "Queja", "Reclamo"];
const ESTADOS_PQR_COLOR = {
    Abierta: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    "En proceso": "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    Cerrada: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
};

// Mismos colores por tipo que usa el tablero Kanban de PQR del Admin/Empleado
// (GestionPQR.jsx), para que una "Queja" se vea igual de un lado y del otro.
const TIPOS_PQR_COLOR = {
    "Petición": { badge: "border-blue-400/30 bg-blue-400/10 text-blue-300", accent: "border-l-blue-400/70" },
    "Queja": { badge: "border-orange-400/30 bg-orange-400/10 text-orange-300", accent: "border-l-orange-400/70" },
    "Reclamo": { badge: "border-red-400/30 bg-red-400/10 text-red-300", accent: "border-l-red-400/70" },
};

// Paleta por color — mismo patrón de "colores"/"getColorClasses" que ya
// existe en AdminPanel.jsx y EmpleadoPanel.jsx (clases completas y literales
// para que Tailwind las genere correctamente).
const COLORES = {
    cyan: {
        icon: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300 group-hover:border-cyan-400/40 group-hover:bg-cyan-400/15",
        hoverBg: "group-hover:bg-cyan-400/10",
        glow: "bg-cyan-400/10",
        line: "from-cyan-400 to-cyan-600",
        text: "text-cyan-400",
    },
    orange: {
        icon: "border-orange-400/20 bg-orange-400/10 text-orange-300 group-hover:border-orange-400/40 group-hover:bg-orange-400/15",
        hoverBg: "group-hover:bg-orange-400/10",
        glow: "bg-orange-400/10",
        line: "from-orange-400 to-orange-600",
        text: "text-orange-400",
    },
    red: {
        icon: "border-red-400/20 bg-red-400/10 text-red-300 group-hover:border-red-400/40 group-hover:bg-red-400/15",
        hoverBg: "group-hover:bg-red-400/10",
        glow: "bg-red-400/10",
        line: "from-red-400 to-red-600",
        text: "text-red-400",
    },
    blue: {
        icon: "border-blue-400/20 bg-blue-400/10 text-blue-300 group-hover:border-blue-400/40 group-hover:bg-blue-400/15",
        hoverBg: "group-hover:bg-blue-400/10",
        glow: "bg-blue-400/10",
        line: "from-blue-400 to-blue-600",
        text: "text-blue-400",
    },
    violet: {
        icon: "border-violet-400/20 bg-violet-400/10 text-violet-300 group-hover:border-violet-400/40 group-hover:bg-violet-400/15",
        hoverBg: "group-hover:bg-violet-400/10",
        glow: "bg-violet-400/10",
        line: "from-violet-400 to-violet-600",
        text: "text-violet-400",
    },
    emerald: {
        icon: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300 group-hover:border-emerald-400/40 group-hover:bg-emerald-400/15",
        hoverBg: "group-hover:bg-emerald-400/10",
        glow: "bg-emerald-400/10",
        line: "from-emerald-400 to-emerald-600",
        text: "text-emerald-400",
    },
    amber: {
        icon: "border-amber-400/20 bg-amber-400/10 text-amber-300 group-hover:border-amber-400/40 group-hover:bg-amber-400/15",
        hoverBg: "group-hover:bg-amber-400/10",
        glow: "bg-amber-400/10",
        line: "from-amber-400 to-amber-600",
        text: "text-amber-400",
    },
};

// ==========================================
// Animación de conteo ascendente para las cifras
// ==========================================

function useContador(valorFinal, activo) {
    const [valor, setValor] = useState(0);
    const previo = useRef(0);

    useEffect(() => {
        if (!activo) return undefined;

        const inicio = previo.current;
        const destino = Number(valorFinal) || 0;
        const duracion = 700;
        let marcaInicial = null;
        let frame;

        const paso = (marca) => {
            if (!marcaInicial) marcaInicial = marca;
            const progreso = Math.min((marca - marcaInicial) / duracion, 1);
            const actual = Math.round(inicio + (destino - inicio) * progreso);
            setValor(actual);
            if (progreso < 1) {
                frame = requestAnimationFrame(paso);
            } else {
                previo.current = destino;
            }
        };

        frame = requestAnimationFrame(paso);
        return () => cancelAnimationFrame(frame);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valorFinal, activo]);

    return valor;
}

// ==========================================
// Progreso del estado de un pedido
// ==========================================

function PasosDelPedido({ estado }) {
    if (estado === "Cancelado") {
        return (
            <div className="flex items-center gap-2 text-red-400">
                <IconXCircle className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Pedido cancelado</span>
            </div>
        );
    }

    const indiceActual = Math.max(PASOS_PEDIDO.indexOf(estado), 0);

    return (
        <div className="flex items-center">
            {PASOS_PEDIDO.map((paso, idx) => {
                const Icono = ICONO_PASO[paso];
                const completado = idx <= indiceActual;
                const esActual = idx === indiceActual;

                return (
                    <div key={paso} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                            <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                                    completado
                                        ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                                        : "border-slate-700 bg-slate-950 text-slate-600"
                                } ${esActual ? "ring-2 ring-cyan-400/20" : ""}`}
                            >
                                <Icono className="h-3 w-3" />
                            </span>
                            <span
                                className={`hidden text-[9px] font-semibold uppercase tracking-wide sm:block ${
                                    completado ? "text-cyan-300" : "text-slate-600"
                                }`}
                            >
                                {paso}
                            </span>
                        </div>

                        {idx < PASOS_PEDIDO.length - 1 && (
                            <span
                                className={`mx-1 h-px w-6 sm:w-8 ${
                                    idx < indiceActual ? "bg-cyan-400/50" : "bg-slate-700"
                                }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function Perfil() {
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState(null);
    const [cargandoUsuario, setCargandoUsuario] = useState(true);
    const [enSessionStorage, setEnSessionStorage] = useState(false);
    const [seccionActiva, setSeccionActiva] = useState("resumen");

    const [pedidos, setPedidos] = useState([]);
    const [cargandoPedidos, setCargandoPedidos] = useState(true);
    const [errorPedidos, setErrorPedidos] = useState("");
    const [pedidoAbierto, setPedidoAbierto] = useState(null);

    const [favoritos, setFavoritos] = useState([]);
    const [cargandoFavoritos, setCargandoFavoritos] = useState(true);
    const [errorFavoritos, setErrorFavoritos] = useState("");
    const [quitandoFavorito, setQuitandoFavorito] = useState(null);

    const [descargandoHistorial, setDescargandoHistorial] = useState(false);
    const [descargandoFacturaId, setDescargandoFacturaId] = useState(null);
    const [descargandoFacturaExcelId, setDescargandoFacturaExcelId] = useState(null);

    const [misPqr, setMisPqr] = useState([]);
    const [cargandoPqr, setCargandoPqr] = useState(true);
    const [errorPqr, setErrorPqr] = useState("");
    const [formPqr, setFormPqr] = useState({ tipo: TIPOS_PQR[0], asunto: "", mensaje: "" });
    const [enviandoPqr, setEnviandoPqr] = useState(false);
    const [pqrSeleccionada, setPqrSeleccionada] = useState(null);
    const [enviandoMensajePqr, setEnviandoMensajePqr] = useState(false);

    const [formPerfil, setFormPerfil] = useState({
        nombre: "",
        apellido: "",
        telefono: "",
        direccion: "",
    });
    const [erroresPerfil, setErroresPerfil] = useState({});
    const [mensajePerfil, setMensajePerfil] = useState("");
    const [tipoMensajePerfil, setTipoMensajePerfil] = useState("");
    const [guardandoPerfil, setGuardandoPerfil] = useState(false);

    const [passwordForm, setPasswordForm] = useState({
        actual: "",
        nueva: "",
        confirmar: "",
    });
    const [erroresPassword, setErroresPassword] = useState({});
    const [mensajePassword, setMensajePassword] = useState("");
    const [tipoMensajePassword, setTipoMensajePassword] = useState("");
    const [guardandoPassword, setGuardandoPassword] = useState(false);

    const { toasts, mostrarToast } = useToasts();

    const obtenerToken = () =>
        localStorage.getItem("token") || sessionStorage.getItem("token");

    const headersAuth = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${obtenerToken()}`,
    });

    const guardarUsuarioActualizado = (usuarioActualizado) => {
        const texto = JSON.stringify(usuarioActualizado);
        if (enSessionStorage) {
            sessionStorage.setItem("usuario", texto);
        } else {
            localStorage.setItem("usuario", texto);
        }
        setUsuario(usuarioActualizado);
    };

    useEffect(() => {
        const enLocal = localStorage.getItem("usuario");
        const enSession = sessionStorage.getItem("usuario");
        const guardado = enLocal || enSession;

        if (!guardado) {
            navigate("/login");
            return;
        }

        setEnSessionStorage(!enLocal && !!enSession);

        try {
            const parsed = JSON.parse(guardado);
            setUsuario(parsed);
            setFormPerfil({
                nombre: parsed.nombre || "",
                apellido: parsed.apellido || "",
                telefono: parsed.telefono || "",
                direccion: parsed.direccion || "",
            });
        } catch (error) {
            console.error("❌ No se pudo leer el usuario guardado:", error);
            navigate("/login");
            return;
        } finally {
            setCargandoUsuario(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    const cargarPedidos = async () => {
        setCargandoPedidos(true);
        setErrorPedidos("");

        try {
            const token = obtenerToken();

            if (!token) {
                setErrorPedidos("No hay una sesión activa.");
                setCargandoPedidos(false);
                return;
            }

            const respuesta = await fetch(`${API_URL}/pedidos`, {
                headers: headersAuth(),
            });

            if (respuesta.status === 401) {
                navigate("/login");
                return;
            }

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudo obtener el historial.");
            }

            setPedidos(Array.isArray(datos.pedidos) ? datos.pedidos : []);
        } catch (error) {
            console.warn("⚠️ No se pudo cargar el historial de pedidos:", error);
            setErrorPedidos(
                error.message || "No pudimos cargar tu historial en este momento."
            );
        } finally {
            setCargandoPedidos(false);
        }
    };

    const cargarFavoritos = async () => {
        setCargandoFavoritos(true);
        setErrorFavoritos("");

        try {
            const token = obtenerToken();

            if (!token) {
                setCargandoFavoritos(false);
                return;
            }

            const respuesta = await fetch(`${API_URL}/favoritos`, {
                headers: headersAuth(),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudieron obtener tus favoritos.");
            }

            setFavoritos(Array.isArray(datos.favoritos) ? datos.favoritos : []);
        } catch (error) {
            console.warn("⚠️ No se pudieron cargar los favoritos:", error);
            setErrorFavoritos(error.message || "No pudimos cargar tus favoritos.");
        } finally {
            setCargandoFavoritos(false);
        }
    };

    const cargarMisPqr = async () => {
        setCargandoPqr(true);
        setErrorPqr("");

        try {
            const token = obtenerToken();
            if (!token) {
                setCargandoPqr(false);
                return;
            }

            const respuesta = await fetch(`${API_URL}/pqr/mis`, {
                headers: headersAuth(),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudieron cargar tus PQR.");
            }

            setMisPqr(Array.isArray(datos.pqr) ? datos.pqr : []);
        } catch (error) {
            console.warn("⚠️ No se pudieron cargar tus PQR:", error);
            setErrorPqr(error.message || "No pudimos cargar tus PQR en este momento.");
        } finally {
            setCargandoPqr(false);
        }
    };

    useEffect(() => {
        if (!usuario) return;
        cargarPedidos();
        cargarFavoritos();
        cargarMisPqr();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuario]);

    const handleChangePqr = (e) => {
        const { name, value } = e.target;
        setFormPqr((prev) => ({ ...prev, [name]: value }));
    };

    const enviarPqr = async (e) => {
        e.preventDefault();

        if (formPqr.asunto.trim().length < 3) {
            mostrarToast("El asunto debe tener al menos 3 caracteres.", "advertencia");
            return;
        }
        if (formPqr.mensaje.trim().length < 10) {
            mostrarToast("Cuéntanos con un poco más de detalle (mínimo 10 caracteres).", "advertencia");
            return;
        }

        setEnviandoPqr(true);
        try {
            const respuesta = await fetch(`${API_URL}/pqr`, {
                method: "POST",
                headers: headersAuth(),
                body: JSON.stringify(formPqr),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudo enviar tu PQR.");
            }

            setMisPqr((prev) => [datos.pqr, ...prev]);
            setFormPqr({ tipo: TIPOS_PQR[0], asunto: "", mensaje: "" });
            mostrarToast("Tu PQR fue enviada. Te responderemos pronto.", "exito");
        } catch (error) {
            console.error("❌ Error al enviar la PQR:", error);
            mostrarToast(error.message || "No se pudo enviar tu PQR.", "error");
        } finally {
            setEnviandoPqr(false);
        }
    };

    // Mantiene el panel del hilo sincronizado si "Mis PQR" se actualiza por
    // otra vía (p. ej. tras enviar un mensaje nuevo).
    useEffect(() => {
        if (!pqrSeleccionada) return;
        const actualizada = misPqr.find((r) => r.id === pqrSeleccionada.id);
        if (actualizada) setPqrSeleccionada(actualizada);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [misPqr]);

    const enviarMensajePqr = async (texto) => {
        if (!pqrSeleccionada) return;

        setEnviandoMensajePqr(true);
        try {
            const respuesta = await fetch(`${API_URL}/pqr/${pqrSeleccionada.id}/mensajes`, {
                method: "POST",
                headers: headersAuth(),
                body: JSON.stringify({ texto }),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudo enviar el mensaje.");
            }

            setMisPqr((prev) => prev.map((r) => (r.id === pqrSeleccionada.id ? datos.pqr : r)));
        } catch (error) {
            console.error("❌ Error al enviar el mensaje:", error);
            mostrarToast(error.message || "No se pudo enviar el mensaje.", "error");
        } finally {
            setEnviandoMensajePqr(false);
        }
    };

    const quitarFavorito = async (producto) => {
        setQuitandoFavorito(producto.id);

        try {
            const respuesta = await fetch(`${API_URL}/favoritos/${producto.id}`, {
                method: "POST",
                headers: headersAuth(),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudo actualizar favoritos.");
            }

            setFavoritos((prev) => prev.filter((p) => p.id !== producto.id));
        } catch (error) {
            console.error("❌ Error al quitar favorito:", error);
            mostrarToast(error.message || "No se pudo quitar el favorito.", "error");
        } finally {
            setQuitandoFavorito(null);
        }
    };

    const handleChangePerfil = (e) => {
        const { name, value } = e.target;
        setFormPerfil((prev) => ({ ...prev, [name]: value }));
        setMensajePerfil("");
        setErroresPerfil((prev) => ({ ...prev, [name]: "" }));
    };

    const guardarPerfil = async (e) => {
        e.preventDefault();

        const errores = {};
        if (!formPerfil.nombre.trim()) errores.nombre = "El nombre es obligatorio.";
        if (!formPerfil.apellido.trim()) errores.apellido = "El apellido es obligatorio.";
        if (!formPerfil.telefono.trim()) errores.telefono = "El teléfono es obligatorio.";
        if (!formPerfil.direccion.trim()) errores.direccion = "La dirección es obligatoria.";

        setErroresPerfil(errores);
        if (Object.keys(errores).length > 0) return;

        setGuardandoPerfil(true);
        setMensajePerfil("");

        try {
            const respuesta = await fetch(`${API_URL}/auth/mi-perfil`, {
                method: "PUT",
                headers: headersAuth(),
                body: JSON.stringify(formPerfil),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudieron guardar tus datos.");
            }

            guardarUsuarioActualizado(datos.usuario);
            setTipoMensajePerfil("exito");
            setMensajePerfil("Tus datos se actualizaron correctamente.");
        } catch (error) {
            console.error("❌ Error al guardar perfil:", error);
            setTipoMensajePerfil("error");
            setMensajePerfil(error.message || "No se pudieron guardar tus datos.");
        } finally {
            setGuardandoPerfil(false);
        }
    };

    const handleChangePassword = (e) => {
        const { name, value } = e.target;
        setPasswordForm((prev) => ({ ...prev, [name]: value }));
        setMensajePassword("");
        setErroresPassword((prev) => ({ ...prev, [name]: "" }));
    };

    const cambiarPassword = async (e) => {
        e.preventDefault();

        const nuevosErrores = {};
        if (!passwordForm.actual) nuevosErrores.actual = "Ingresa tu contraseña actual.";
        if (!passwordForm.nueva) {
            nuevosErrores.nueva = "Ingresa tu nueva contraseña.";
        } else if (passwordForm.nueva.length < 8) {
            nuevosErrores.nueva = "La nueva contraseña debe tener mínimo 8 caracteres.";
        }
        if (passwordForm.confirmar !== passwordForm.nueva) {
            nuevosErrores.confirmar = "Las contraseñas no coinciden.";
        }

        setErroresPassword(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) return;

        setGuardandoPassword(true);
        setMensajePassword("");

        try {
            const respuesta = await fetch(`${API_URL}/auth/cambiar-password`, {
                method: "PUT",
                headers: headersAuth(),
                body: JSON.stringify({
                    passwordActual: passwordForm.actual,
                    passwordNueva: passwordForm.nueva,
                }),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudo cambiar la contraseña.");
            }

            setTipoMensajePassword("exito");
            setMensajePassword("Tu contraseña se actualizó correctamente.");
            setPasswordForm({ actual: "", nueva: "", confirmar: "" });
        } catch (error) {
            console.error("❌ Error al cambiar la contraseña:", error);
            setTipoMensajePassword("error");
            setMensajePassword(
                error.message ||
                "No se pudo cambiar la contraseña. Verifica que el endpoint /api/auth/cambiar-password exista en tu backend."
            );
        } finally {
            setGuardandoPassword(false);
        }
    };

    const cerrarSesion = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("usuario");
        navigate("/login");
    };

    // ==========================================
    // REPORTES Y FACTURAS EN PDF
    // ==========================================

    const descargarArchivoPdf = async (url, nombreArchivo) => {
        const respuesta = await fetch(url, { headers: headersAuth() });

        if (!respuesta.ok) {
            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }
            throw new Error(datos.message || "No se pudo generar el PDF.");
        }

        const blob = await respuesta.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = urlBlob;
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        window.URL.revokeObjectURL(urlBlob);
    };

    const descargarHistorialCompleto = async () => {
        setDescargandoHistorial(true);
        try {
            await descargarArchivoPdf(
                `${API_URL}/reportes/mis-pedidos/pdf`,
                "mi_historial_de_compras.pdf"
            );
        } catch (error) {
            console.error("❌ Error al descargar el historial:", error);
            mostrarToast(error.message || "No se pudo generar el historial.", "error");
        } finally {
            setDescargandoHistorial(false);
        }
    };

    const descargarFactura = async (pedido, e) => {
        e?.stopPropagation();
        setDescargandoFacturaId(pedido.id);
        try {
            await descargarArchivoPdf(
                `${API_URL}/reportes/pedidos/${pedido.id}/pdf`,
                `factura_${pedido.id?.slice(-8)}.pdf`
            );
        } catch (error) {
            console.error("❌ Error al descargar la factura:", error);
            mostrarToast(error.message || "No se pudo generar la factura.", "error");
        } finally {
            setDescargandoFacturaId(null);
        }
    };

    const descargarFacturaExcel = async (pedido, e) => {
        e?.stopPropagation();
        setDescargandoFacturaExcelId(pedido.id);
        try {
            await descargarArchivoPdf(
                `${API_URL}/reportes/pedidos/${pedido.id}/excel`,
                `factura_${pedido.id?.slice(-8)}.xlsx`
            );
        } catch (error) {
            console.error("❌ Error al descargar la factura en Excel:", error);
            mostrarToast(error.message || "No se pudo generar la factura.", "error");
        } finally {
            setDescargandoFacturaExcelId(null);
        }
    };

    const iniciales = (nombre) => {
        if (!nombre) return "?";
        return nombre.trim().split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return null;
        try {
            return new Date(fecha).toLocaleDateString("es-CO", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        } catch {
            return null;
        }
    };

    const formatearMoneda = (valor) => {
        if (valor === undefined || valor === null) return "—";
        try {
            return new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
            }).format(valor);
        } catch {
            return `$${valor}`;
        }
    };

    const estiloEstado = (estado) => {
        switch (estado) {
            case "Entregado":
                return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
            case "Cancelado":
                return "border-red-400/30 bg-red-400/10 text-red-300";
            case "Enviado":
                return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
            case "Procesando":
                return "border-amber-400/30 bg-amber-400/10 text-amber-300";
            default:
                return "border-slate-500/30 bg-slate-500/10 text-slate-300";
        }
    };

    const barraEstado = (estado) => {
        switch (estado) {
            case "Entregado":
                return "bg-emerald-400";
            case "Cancelado":
                return "bg-red-400";
            case "Enviado":
                return "bg-cyan-400";
            case "Procesando":
                return "bg-amber-400";
            default:
                return "bg-slate-500";
        }
    };

    const totalPedidos = pedidos.length;

    const totalInvertido = pedidos
        .filter((p) => p.estado !== "Cancelado")
        .reduce((suma, p) => suma + (Number(p.total) || 0), 0);

    const pedidosActivos = pedidos.filter(
        (p) => !["Entregado", "Cancelado"].includes(p.estado)
    ).length;

    const estadisticasListas = !cargandoPedidos && !cargandoFavoritos;

    // Gasto de los últimos 6 meses (sin contar pedidos cancelados, igual
    // que el historial en PDF), calculado a partir de los pedidos que ya
    // se cargaron para esta pantalla — sin llamadas adicionales al backend.
    const gastoPorMes = useMemo(() => {
        const hoy = new Date();
        hoy.setDate(1);
        hoy.setHours(0, 0, 0, 0);

        const meses = Array.from({ length: 6 }, (_, i) => {
            const fecha = new Date(hoy);
            fecha.setMonth(fecha.getMonth() - (5 - i));
            return {
                anio: fecha.getFullYear(),
                mes: fecha.getMonth(),
                label: MESES_CORTOS[fecha.getMonth()],
                value: 0,
            };
        });

        pedidos.forEach((p) => {
            if (!p.fecha || p.estado === "Cancelado") return;
            const f = new Date(p.fecha);
            const bucket = meses.find((m) => m.anio === f.getFullYear() && m.mes === f.getMonth());
            if (bucket) bucket.value += Number(p.total) || 0;
        });

        return meses.map(({ label, value }) => ({ label, value }));
    }, [pedidos]);

    // Mis pedidos agrupados por estado, siempre en el mismo orden fijo.
    const pedidosPorEstado = useMemo(() => {
        return Object.keys(ESTADOS_COLOR).map((estado) => ({
            label: estado,
            value: pedidos.filter((p) => p.estado === estado).length,
            color: ESTADOS_COLOR[estado],
        }));
    }, [pedidos]);

    const contadorPedidos = useContador(totalPedidos, estadisticasListas);
    const contadorInvertido = useContador(totalInvertido, estadisticasListas);
    const contadorActivos = useContador(pedidosActivos, estadisticasListas);
    const contadorFavoritos = useContador(favoritos.length, estadisticasListas);

    const miembroDesde = formatearFecha(usuario?.createdAt);

    if (cargandoUsuario || !usuario) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#060a13]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
            </main>
        );
    }

    // Tarjetas de acceso rápido del "Resumen" — mismo patrón visual que las
    // tarjetas de AdminPanel/EmpleadoPanel, pero aquí cambian de sección
    // en vez de navegar a otra ruta.
    const accesos = [
        {
            id: "pedidos",
            icono: IconReceipt,
            valor: cargandoPedidos ? null : contadorPedidos,
            etiqueta: "Pedidos realizados",
            color: "orange",
        },
        {
            id: "pedidos",
            icono: IconCoin,
            valor: cargandoPedidos ? null : formatearMoneda(contadorInvertido),
            etiqueta: "Total invertido",
            color: "cyan",
        },
        {
            id: "pedidos",
            icono: IconTruck,
            valor: cargandoPedidos ? null : contadorActivos,
            etiqueta: "Pedidos activos",
            color: "blue",
        },
        {
            id: "favoritos",
            icono: IconHeart,
            valor: cargandoFavoritos ? null : contadorFavoritos,
            etiqueta: "Favoritos guardados",
            color: "red",
        },
    ];

    return (
        <main className="min-h-screen bg-[#060a13] text-white">

            {/* ===================================================== */}
            {/* FONDO */}
            {/* ===================================================== */}

            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-cyan-500/[0.04] blur-[130px]" />
                <div className="absolute -right-40 top-[35%] h-[500px] w-[500px] rounded-full bg-blue-500/[0.04] blur-[130px]" />
                <div
                    className="absolute inset-0 opacity-[0.025]"
                    style={{
                        backgroundImage:
                            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                        backgroundSize: "45px 45px",
                    }}
                />
            </div>

            <div className="relative flex min-h-screen">

                {/* ===================================================== */}
                {/* SIDEBAR */}
                {/* ===================================================== */}

                <aside className="scroll-panel hidden w-[250px] shrink-0 overflow-y-auto border-r border-slate-800/80 bg-[#080d17] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">

                    {/* LOGO */}
                    <div className="flex h-[76px] items-center border-b border-slate-800/80 px-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 font-black text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.15)]">
                                JR
                            </div>
                            <div>
                                <h1 className="text-sm font-black tracking-wide">JR TECH</h1>
                                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">
                                    Panel de Cliente
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* VOLVER AL SITIO */}
                    <Link
                        to="/"
                        className="flex items-center gap-2 border-b border-slate-800/80 px-5 py-3 text-xs font-semibold text-slate-500 transition hover:text-cyan-300"
                    >
                        <IconHome className="h-3.5 w-3.5" />
                        Ver sitio web
                    </Link>

                    {/* NAVEGACIÓN */}
                    <div className="flex-1 px-3 py-6">
                        <p className="mb-3 px-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                            Mi cuenta
                        </p>

                        <nav className="space-y-1">
                            {SECCIONES.map((s) => {
                                const activa = seccionActiva === s.id;
                                const color = COLORES[s.color];

                                if (activa) {
                                    return (
                                        <div
                                            key={s.id}
                                            className="flex items-center gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.08] px-3 py-3 text-sm font-bold text-cyan-300"
                                        >
                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10">
                                                <s.icono className="h-4 w-4" />
                                            </span>
                                            {s.label}
                                        </div>
                                    );
                                }

                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => setSeccionActiva(s.id)}
                                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition-all hover:bg-slate-800/60 hover:text-white"
                                    >
                                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 transition ${color.hoverBg}`}>
                                            <s.icono className="h-4 w-4" />
                                        </span>
                                        {s.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* USUARIO */}
                    <div className="border-t border-slate-800/80 p-4">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-black text-cyan-300">
                                {iniciales(usuario.nombre)}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-white">{usuario.nombre}</p>
                                <p className="text-[10px] text-slate-600">{usuario.rol || "Cliente"}</p>
                            </div>
                        </div>

                        <button
                            onClick={cerrarSesion}
                            className="group flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 px-3 py-2.5 text-xs font-bold text-slate-500 transition-all hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-400"
                        >
                            <span className="transition-transform group-hover:-translate-x-0.5">
                                <IconLogOut className="h-3.5 w-3.5" />
                            </span>
                            Cerrar sesión
                        </button>
                    </div>

                </aside>

                {/* ===================================================== */}
                {/* CONTENIDO */}
                {/* ===================================================== */}

                <div className="min-w-0 flex-1">

                    {/* HEADER */}
                    <header className="flex h-[76px] items-center justify-between border-b border-slate-800/80 bg-[#080d17]/80 px-5 backdrop-blur-xl sm:px-8">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                JR TECH / CLIENTE
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-400">
                                {SUBTITULOS[seccionActiva]}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <p className="hidden text-xs font-bold text-slate-500 sm:block">Sesión activa</p>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-xs font-black text-cyan-300">
                                {iniciales(usuario.nombre)}
                            </div>
                        </div>
                    </header>

                    {/* NAV MÓVIL (la barra lateral se oculta en pantallas pequeñas) */}
                    <nav className="flex gap-1 overflow-x-auto border-b border-slate-800/80 bg-[#080d17]/60 px-5 py-2 sm:px-8 lg:hidden">
                        <Link
                            to="/"
                            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-800/60 hover:text-white"
                        >
                            <IconHome className="h-3.5 w-3.5" />
                            Sitio
                        </Link>
                        {SECCIONES.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setSeccionActiva(s.id)}
                                className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                                    seccionActiva === s.id
                                        ? "bg-cyan-400/10 text-cyan-300"
                                        : "text-slate-500 hover:bg-slate-800/60 hover:text-white"
                                }`}
                            >
                                <s.icono className="h-3.5 w-3.5" />
                                {s.label}
                            </button>
                        ))}
                    </nav>

                    {/* ================================================= */}
                    {/* MAIN */}
                    {/* ================================================= */}

                    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">

                        {seccionActiva === "resumen" && (
                            <>
                                {/* BIENVENIDA */}
                                <section className="mb-10">
                                    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                                        <div>
                                            <div className="mb-3 flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                                                    Mi cuenta
                                                </span>
                                            </div>

                                            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                                                Hola, <span className="text-cyan-400">{usuario.nombre}</span>
                                            </h2>

                                            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                                                Consulta tus pedidos, tus favoritos y administra tu información personal.
                                            </p>
                                        </div>

                                        <div className="flex w-fit items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10">
                                                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-slate-600">Cuenta</p>
                                                <p className="text-xs font-bold text-emerald-400">
                                                    {usuario.rol || "Cliente"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* ACCESOS RÁPIDOS */}
                                <section>
                                    <div className="mb-5 flex items-end justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                                Resumen
                                            </p>
                                            <h3 className="mt-1 text-xl font-black text-white">Tu actividad</h3>
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                        {accesos.map((acceso, index) => {
                                            const color = COLORES[acceso.color];

                                            return (
                                                <button
                                                    key={index}
                                                    onClick={() => setSeccionActiva(acceso.id)}
                                                    className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0b111d] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl"
                                                >
                                                    <div className={`absolute -right-16 -top-16 h-36 w-36 rounded-full opacity-0 blur-3xl transition-all duration-500 group-hover:opacity-100 ${color.glow}`} />
                                                    <div className={`absolute left-0 top-0 h-[2px] w-0 bg-gradient-to-r transition-all duration-500 group-hover:w-full ${color.line}`} />

                                                    <div className="relative">
                                                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-110 ${color.icon}`}>
                                                            <acceso.icono className="h-5 w-5" />
                                                        </div>

                                                        <p className="mt-5 truncate text-2xl font-black text-white">
                                                            {acceso.valor === null ? (
                                                                <span className="inline-block h-6 w-16 animate-pulse rounded bg-slate-800" />
                                                            ) : (
                                                                acceso.valor
                                                            )}
                                                        </p>
                                                        <p className="mt-1 text-xs font-semibold text-slate-500">{acceso.etiqueta}</p>

                                                        <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3">
                                                            <span className={`text-xs font-bold opacity-0 transition-all duration-300 group-hover:opacity-100 ${color.text}`}>
                                                                Ver
                                                            </span>
                                                            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-600 transition-all duration-300 group-hover:translate-x-1 group-hover:border-cyan-400/20 group-hover:bg-cyan-400/10 group-hover:text-cyan-300">
                                                                →
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* ENLACE A ESTADÍSTICAS */}
                                <section className="mt-8">
                                    <button
                                        onClick={() => setSeccionActiva("estadisticas")}
                                        className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#0b111d] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/30 hover:shadow-2xl sm:p-6"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 transition-transform duration-300 group-hover:scale-110">
                                                <IconTrendingUp className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white">Diagramas de estadísticas</h3>
                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    Tu gasto de los últimos meses y tus pedidos por estado, en una sola vista.
                                                </p>
                                            </div>
                                        </div>
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-600 transition-all duration-300 group-hover:translate-x-1 group-hover:border-emerald-400/20 group-hover:bg-emerald-400/10 group-hover:text-emerald-300">
                                            →
                                        </span>
                                    </button>
                                </section>

                                {/* ACTIVIDAD RECIENTE */}
                                <section className="mt-8">
                                    <div className="mb-5 flex items-end justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                                Historial
                                            </p>
                                            <h3 className="mt-1 text-xl font-black text-white">Actividad reciente</h3>
                                        </div>
                                        {pedidos.length > 3 && (
                                            <button
                                                onClick={() => setSeccionActiva("pedidos")}
                                                className="text-xs font-bold text-cyan-400 hover:text-cyan-300"
                                            >
                                                Ver todos →
                                            </button>
                                        )}
                                    </div>

                                    <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-2">
                                        {cargandoPedidos && (
                                            <div className="flex justify-center py-8">
                                                <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
                                            </div>
                                        )}

                                        {!cargandoPedidos && pedidos.length === 0 && (
                                            <p className="p-6 text-center text-sm text-slate-500">
                                                Todavía no tienes pedidos. Cuando compres algo, aparecerá aquí.
                                            </p>
                                        )}

                                        {!cargandoPedidos && pedidos.length > 0 && (
                                            <div className="divide-y divide-slate-800">
                                                {pedidos.slice(0, 3).map((pedido) => (
                                                    <div key={pedido.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${barraEstado(pedido.estado)}`} />
                                                            <div>
                                                                <p className="font-mono text-sm font-bold text-white">
                                                                    #{pedido.id?.slice(-8)?.toUpperCase()}
                                                                </p>
                                                                <p className="mt-0.5 text-xs text-slate-500">
                                                                    {formatearFecha(pedido.fecha) || "Fecha no disponible"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-cyan-300">
                                                                {formatearMoneda(pedido.total)}
                                                            </span>
                                                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${estiloEstado(pedido.estado)}`}>
                                                                {pedido.estado}
                                                            </span>
                                                            <button
                                                                onClick={(e) => descargarFactura(pedido, e)}
                                                                disabled={descargandoFacturaId === pedido.id}
                                                                title="Descargar factura (PDF)"
                                                                aria-label="Descargar factura (PDF)"
                                                                className="rounded-lg border border-slate-700 p-1.5 text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:opacity-50"
                                                            >
                                                                <IconDownload className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => descargarFacturaExcel(pedido, e)}
                                                                disabled={descargandoFacturaExcelId === pedido.id}
                                                                title="Descargar factura (Excel)"
                                                                aria-label="Descargar factura (Excel)"
                                                                className="rounded-lg border border-slate-700 p-1.5 text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-300 disabled:opacity-50"
                                                            >
                                                                <IconFileSpreadsheet className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* CONSEJO */}
                                <section className="mt-8 rounded-2xl border border-slate-800 bg-[#0b111d] p-5 sm:p-6">
                                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                                                <IconLightbulb className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white">¿Sabías que...?</h3>
                                                <p className="mt-1 max-w-xl text-xs leading-5 text-slate-600">
                                                    Puedes descargar la factura de cualquier pedido o tu historial
                                                    completo de compras en PDF desde la sección "Pedidos".
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={descargarHistorialCompleto}
                                            disabled={descargandoHistorial || pedidos.length === 0}
                                            className="flex items-center gap-2 rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-4 py-2.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/10 disabled:opacity-50"
                                        >
                                            <IconDownload className="h-3.5 w-3.5" />
                                            {descargandoHistorial ? "Generando..." : "Descargar historial"}
                                        </button>
                                    </div>
                                </section>
                            </>
                        )}

                        {seccionActiva === "estadisticas" && (
                            <section>
                                <div className="mb-8">
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                                            Reportes
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                                        Diagramas de estadísticas
                                    </h2>
                                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                                        Tu actividad de compras en JR TECH, en una sola vista.
                                    </p>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5">
                                        <div className="mb-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                                                    <IconChartBar className="h-4 w-4" />
                                                </div>
                                                <p className="text-sm font-bold text-white">Mi gasto · últimos 6 meses</p>
                                            </div>
                                        </div>

                                        {cargandoPedidos ? (
                                            <div className="h-32 animate-pulse rounded-xl bg-slate-800/40" />
                                        ) : (
                                            <AreaLineChart
                                                data={gastoPorMes}
                                                color="#22d3ee"
                                                formatValue={formatearMoneda}
                                                vacio="Todavía no tienes compras registradas."
                                            />
                                        )}
                                    </div>

                                    <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5">
                                        <div className="mb-4 flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300">
                                                <IconReceipt className="h-4 w-4" />
                                            </div>
                                            <p className="text-sm font-bold text-white">Mis pedidos por estado</p>
                                        </div>

                                        {cargandoPedidos ? (
                                            <div className="h-32 animate-pulse rounded-xl bg-slate-800/40" />
                                        ) : (
                                            <StatusBreakdownBars data={pedidosPorEstado} />
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {seccionActiva === "pedidos" && (
                            <section>
                                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                            Mi cuenta
                                        </p>
                                        <h3 className="mt-1 text-xl font-black text-white">Historial de pedidos</h3>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {pedidos.length > 0 && (
                                            <button
                                                onClick={descargarHistorialCompleto}
                                                disabled={descargandoHistorial}
                                                className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:opacity-50"
                                            >
                                                <IconDownload className="h-3.5 w-3.5" />
                                                {descargandoHistorial ? "Generando..." : "Historial en PDF"}
                                            </button>
                                        )}
                                        <button
                                            onClick={cargarPedidos}
                                            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/50"
                                        >
                                            <IconRefresh className="h-3.5 w-3.5" /> Actualizar
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5">
                                    {cargandoPedidos && (
                                        <div className="flex justify-center py-8">
                                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
                                        </div>
                                    )}

                                    {!cargandoPedidos && errorPedidos && (
                                        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5 text-center">
                                            <p className="text-sm text-slate-400">{errorPedidos}</p>
                                            <button
                                                onClick={cargarPedidos}
                                                className="mt-3 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400/50"
                                            >
                                                Reintentar
                                            </button>
                                        </div>
                                    )}

                                    {!cargandoPedidos && !errorPedidos && pedidos.length === 0 && (
                                        <p className="rounded-xl border border-slate-800 bg-slate-950/50 p-5 text-center text-sm text-slate-400">
                                            Todavía no tienes pedidos. Cuando compres algo, aparecerá aquí.
                                        </p>
                                    )}

                                    {!cargandoPedidos && !errorPedidos && pedidos.length > 0 && (
                                        <div className="divide-y divide-slate-800">
                                            {pedidos.map((pedido) => {
                                                const abierto = pedidoAbierto === pedido.id;

                                                return (
                                                    <div key={pedido.id}>
                                                        <button
                                                            onClick={() =>
                                                                setPedidoAbierto(abierto ? null : pedido.id)
                                                            }
                                                            className="flex w-full flex-col gap-3 py-4 text-left"
                                                        >
                                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                                <div className="flex items-center gap-2.5">
                                                                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${barraEstado(pedido.estado)}`} />
                                                                    <div>
                                                                        <p className="font-mono text-sm font-bold text-white">
                                                                            #{pedido.id?.slice(-8)?.toUpperCase()}
                                                                        </p>
                                                                        <p className="mt-0.5 text-xs text-slate-400">
                                                                            {formatearFecha(pedido.fecha) || "Fecha no disponible"}
                                                                            {" · "}
                                                                            {(pedido.productos || []).length} producto(s)
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-bold text-cyan-300">
                                                                        {formatearMoneda(pedido.total)}
                                                                    </span>
                                                                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${estiloEstado(pedido.estado)}`}>
                                                                        {pedido.estado}
                                                                    </span>
                                                                    <span
                                                                        onClick={(e) => descargarFactura(pedido, e)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter" || e.key === " ") {
                                                                                e.preventDefault();
                                                                                descargarFactura(pedido, e);
                                                                            }
                                                                        }}
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        title="Descargar factura (PDF)"
                                                                        aria-label="Descargar factura (PDF)"
                                                                        className={`rounded-lg border border-slate-700 p-1.5 text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-300 ${
                                                                            descargandoFacturaId === pedido.id ? "opacity-50" : ""
                                                                        }`}
                                                                    >
                                                                        <IconDownload className="h-3.5 w-3.5" />
                                                                    </span>
                                                                    <span
                                                                        onClick={(e) => descargarFacturaExcel(pedido, e)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter" || e.key === " ") {
                                                                                e.preventDefault();
                                                                                descargarFacturaExcel(pedido, e);
                                                                            }
                                                                        }}
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        title="Descargar factura (Excel)"
                                                                        aria-label="Descargar factura (Excel)"
                                                                        className={`rounded-lg border border-slate-700 p-1.5 text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-300 ${
                                                                            descargandoFacturaExcelId === pedido.id ? "opacity-50" : ""
                                                                        }`}
                                                                    >
                                                                        <IconFileSpreadsheet className="h-3.5 w-3.5" />
                                                                    </span>
                                                                    <span
                                                                        className={`text-slate-500 transition-transform ${
                                                                            abierto ? "rotate-180" : ""
                                                                        }`}
                                                                    >
                                                                        ▾
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <PasosDelPedido estado={pedido.estado} />
                                                        </button>

                                                        {abierto && (
                                                            <div className="rounded-xl bg-slate-950/60 p-4">
                                                                <div className="space-y-2">
                                                                    {(pedido.productos || []).map((item, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            className="flex items-center justify-between text-sm"
                                                                        >
                                                                            <span className="text-slate-300">
                                                                                {item.cantidad}× {item.nombre || "Producto eliminado"}
                                                                            </span>
                                                                            <span className="text-slate-500">
                                                                                {formatearMoneda(item.subtotal)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {pedido.subtotal != null && pedido.iva != null && (
                                                                    <div className="mt-3 space-y-1 border-t border-slate-800 pt-3 text-xs">
                                                                        <div className="flex items-center justify-between text-slate-500">
                                                                            <span>Subtotal</span>
                                                                            <span>{formatearMoneda(pedido.subtotal)}</span>
                                                                        </div>
                                                                        {pedido.descuento > 0 && (
                                                                            <div className="flex items-center justify-between text-emerald-400">
                                                                                <span>
                                                                                    Descuento
                                                                                    {pedido.descuentoPorcentaje
                                                                                        ? ` (${pedido.descuentoPorcentaje}%)`
                                                                                        : ""}
                                                                                </span>
                                                                                <span>-{formatearMoneda(pedido.descuento)}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex items-center justify-between text-slate-500">
                                                                            <span>IVA ({Math.round((pedido.ivaPorcentaje ?? 0.19) * 100)}%)</span>
                                                                            <span>{formatearMoneda(pedido.iva)}</span>
                                                                        </div>
                                                                        <div className="flex items-center justify-between font-bold text-slate-300">
                                                                            <span>Total</span>
                                                                            <span>{formatearMoneda(pedido.total)}</span>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <div className="mt-4 grid grid-cols-2 gap-2">
                                                                    <button
                                                                        onClick={(e) => descargarFactura(pedido, e)}
                                                                        disabled={descargandoFacturaId === pedido.id}
                                                                        className="flex items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/5 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/10 disabled:opacity-50"
                                                                    >
                                                                        <IconFileText className="h-3.5 w-3.5" />
                                                                        {descargandoFacturaId === pedido.id ? "Generando..." : "PDF"}
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => descargarFacturaExcel(pedido, e)}
                                                                        disabled={descargandoFacturaExcelId === pedido.id}
                                                                        className="flex items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/5 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/10 disabled:opacity-50"
                                                                    >
                                                                        <IconFileSpreadsheet className="h-3.5 w-3.5" />
                                                                        {descargandoFacturaExcelId === pedido.id ? "Generando..." : "Excel"}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {seccionActiva === "favoritos" && (
                            <section>
                                <div className="mb-5">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                        Mi cuenta
                                    </p>
                                    <h3 className="mt-1 text-xl font-black text-white">Mis favoritos</h3>
                                </div>

                                <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5">
                                    {cargandoFavoritos && (
                                        <div className="flex justify-center py-8">
                                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
                                        </div>
                                    )}

                                    {!cargandoFavoritos && errorFavoritos && (
                                        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5 text-center">
                                            <p className="text-sm text-slate-400">{errorFavoritos}</p>
                                            <button
                                                onClick={cargarFavoritos}
                                                className="mt-3 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400/50"
                                            >
                                                Reintentar
                                            </button>
                                        </div>
                                    )}

                                    {!cargandoFavoritos && !errorFavoritos && favoritos.length === 0 && (
                                        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center">
                                            <IconHeart className="mx-auto h-7 w-7 text-slate-600" />
                                            <p className="mt-2 text-sm text-slate-400">
                                                Aún no tienes productos favoritos.
                                            </p>
                                            <button
                                                onClick={() => navigate("/productos")}
                                                className="mt-4 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300"
                                            >
                                                Ir a la tienda
                                            </button>
                                        </div>
                                    )}

                                    {!cargandoFavoritos && !errorFavoritos && favoritos.length > 0 && (
                                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                            {favoritos.map((producto) => (
                                                <div
                                                    key={producto.id}
                                                    className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40"
                                                >
                                                    <div className="h-28 bg-white">
                                                        {producto.imagen ? (
                                                            <img
                                                                src={producto.imagen}
                                                                alt={producto.nombre}
                                                                loading="lazy"
                                                                decoding="async"
                                                                className="h-full w-full object-cover"
                                                                onError={(e) => (e.target.style.display = "none")}
                                                            />
                                                        ) : (
                                                            <div className="flex h-full items-center justify-center bg-slate-800 text-slate-500">
                                                                <IconBox className="h-7 w-7" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-3">
                                                        <p className="truncate text-sm font-bold text-white">
                                                            {producto.nombre}
                                                        </p>
                                                        <p className="mt-1 text-xs font-bold text-cyan-300">
                                                            {formatearMoneda(producto.precio)}
                                                        </p>
                                                        <button
                                                            onClick={() => quitarFavorito(producto)}
                                                            disabled={quitandoFavorito === producto.id}
                                                            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-400/30 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                                                        >
                                                            {quitandoFavorito === producto.id ? "Quitando..." : (<><IconHeart className="h-3.5 w-3.5" filled /> Quitar</>)}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {seccionActiva === "datos" && (
                            <section>
                                <div className="mb-5">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                        Mi cuenta
                                    </p>
                                    <h3 className="mt-1 text-xl font-black text-white">Mis datos personales</h3>
                                </div>

                                <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5 sm:p-6">
                                    {mensajePerfil && (
                                        <div
                                            className={`mb-5 rounded-xl border p-3 text-sm ${
                                                tipoMensajePerfil === "exito"
                                                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                                                    : "border-red-400/30 bg-red-400/10 text-red-200"
                                            }`}
                                        >
                                            {mensajePerfil}
                                        </div>
                                    )}

                                    <form onSubmit={guardarPerfil} className="grid gap-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1.5 block text-sm font-semibold text-slate-300">Nombre</label>
                                                <input
                                                    name="nombre"
                                                    value={formPerfil.nombre}
                                                    onChange={handleChangePerfil}
                                                    maxLength={50}
                                                    className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60"
                                                />
                                                {erroresPerfil.nombre && (
                                                    <p className="mt-1 text-xs text-red-300">{erroresPerfil.nombre}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="mb-1.5 block text-sm font-semibold text-slate-300">Apellido</label>
                                                <input
                                                    name="apellido"
                                                    value={formPerfil.apellido}
                                                    onChange={handleChangePerfil}
                                                    maxLength={50}
                                                    className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60"
                                                />
                                                {erroresPerfil.apellido && (
                                                    <p className="mt-1 text-xs text-red-300">{erroresPerfil.apellido}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="mb-1.5 block text-sm font-semibold text-slate-300">Teléfono</label>
                                                <input
                                                    name="telefono"
                                                    value={formPerfil.telefono}
                                                    onChange={handleChangePerfil}
                                                    maxLength={10}
                                                    className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60"
                                                />
                                                {erroresPerfil.telefono && (
                                                    <p className="mt-1 text-xs text-red-300">{erroresPerfil.telefono}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="mb-1.5 block text-sm font-semibold text-slate-300">
                                                    Correo <span className="text-slate-500">(no editable)</span>
                                                </label>
                                                <input
                                                    value={usuario.correo}
                                                    disabled
                                                    className="w-full cursor-not-allowed rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-500 outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-300">Dirección</label>
                                            <input
                                                name="direccion"
                                                value={formPerfil.direccion}
                                                onChange={handleChangePerfil}
                                                maxLength={150}
                                                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60"
                                            />
                                            {erroresPerfil.direccion && (
                                                <p className="mt-1 text-xs text-red-300">{erroresPerfil.direccion}</p>
                                            )}
                                        </div>

                                        <div>
                                            <button
                                                type="submit"
                                                disabled={guardandoPerfil}
                                                className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
                                            >
                                                {guardandoPerfil ? "Guardando..." : "Guardar cambios"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </section>
                        )}

                        {seccionActiva === "seguridad" && (
                            <section>
                                <div className="mb-5">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                        Mi cuenta
                                    </p>
                                    <h3 className="mt-1 text-xl font-black text-white">Seguridad</h3>
                                </div>

                                <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5 sm:p-6">
                                    {mensajePassword && (
                                        <div
                                            className={`mb-5 rounded-xl border p-3 text-sm ${
                                                tipoMensajePassword === "exito"
                                                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                                                    : "border-red-400/30 bg-red-400/10 text-red-200"
                                            }`}
                                        >
                                            {mensajePassword}
                                        </div>
                                    )}

                                    <form onSubmit={cambiarPassword} className="grid gap-4 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-300">
                                                Contraseña actual
                                            </label>
                                            <input
                                                type="password"
                                                name="actual"
                                                value={passwordForm.actual}
                                                onChange={handleChangePassword}
                                                placeholder="••••••••"
                                                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60"
                                            />
                                            {erroresPassword.actual && (
                                                <p className="mt-1 text-xs text-red-300">{erroresPassword.actual}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-300">
                                                Nueva contraseña
                                            </label>
                                            <input
                                                type="password"
                                                name="nueva"
                                                value={passwordForm.nueva}
                                                onChange={handleChangePassword}
                                                placeholder="••••••••"
                                                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60"
                                            />
                                            {erroresPassword.nueva && (
                                                <p className="mt-1 text-xs text-red-300">{erroresPassword.nueva}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-300">
                                                Confirmar nueva contraseña
                                            </label>
                                            <input
                                                type="password"
                                                name="confirmar"
                                                value={passwordForm.confirmar}
                                                onChange={handleChangePassword}
                                                placeholder="••••••••"
                                                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60"
                                            />
                                            {erroresPassword.confirmar && (
                                                <p className="mt-1 text-xs text-red-300">{erroresPassword.confirmar}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-2">
                                            <button
                                                type="submit"
                                                disabled={guardandoPassword}
                                                className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
                                            >
                                                {guardandoPassword ? "Guardando..." : "Actualizar contraseña"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </section>
                        )}

                        {seccionActiva === "pqr" && (
                            <section>
                                <div className="mb-5">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                        Atención al cliente
                                    </p>
                                    <h3 className="mt-1 text-xl font-black text-white">
                                        Peticiones, quejas y reclamos
                                    </h3>
                                </div>

                                <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5 sm:p-6">
                                    <h4 className="text-sm font-black uppercase tracking-wide text-slate-400">
                                        Radicar una nueva PQR
                                    </h4>

                                    <form onSubmit={enviarPqr} className="mt-4 grid gap-4">
                                        <div className="grid gap-4 sm:grid-cols-3">
                                            <div>
                                                <label className="mb-1.5 block text-sm font-semibold text-slate-300">
                                                    Tipo
                                                </label>
                                                <select
                                                    name="tipo"
                                                    value={formPqr.tipo}
                                                    onChange={handleChangePqr}
                                                    className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60"
                                                >
                                                    {TIPOS_PQR.map((tipo) => (
                                                        <option key={tipo} value={tipo}>
                                                            {tipo}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="mb-1.5 block text-sm font-semibold text-slate-300">
                                                    Asunto
                                                </label>
                                                <input
                                                    type="text"
                                                    name="asunto"
                                                    value={formPqr.asunto}
                                                    onChange={handleChangePqr}
                                                    placeholder="Resume tu caso en pocas palabras"
                                                    maxLength={150}
                                                    className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-300">
                                                Mensaje
                                            </label>
                                            <textarea
                                                name="mensaje"
                                                value={formPqr.mensaje}
                                                onChange={handleChangePqr}
                                                rows={4}
                                                placeholder="Cuéntanos con detalle qué pasó..."
                                                maxLength={3000}
                                                className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60"
                                            />
                                        </div>

                                        <div>
                                            <button
                                                type="submit"
                                                disabled={enviandoPqr}
                                                className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
                                            >
                                                {enviandoPqr ? "Enviando..." : "Enviar PQR"}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                <div className="mt-6">
                                    <h4 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-400">
                                        Mis PQR
                                    </h4>

                                    {cargandoPqr && (
                                        <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-[#0b111d] py-12">
                                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
                                            <p className="text-xs text-slate-500">Cargando...</p>
                                        </div>
                                    )}

                                    {!cargandoPqr && errorPqr && (
                                        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-[#0b111d] p-10 text-center">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-red-400/30 bg-red-400/10 text-red-300">
                                                <IconWarning className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm text-slate-400">{errorPqr}</p>
                                            <button
                                                onClick={cargarMisPqr}
                                                className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-400/50"
                                            >
                                                <IconRefresh className="h-4 w-4" /> Reintentar
                                            </button>
                                        </div>
                                    )}

                                    {!cargandoPqr && !errorPqr && misPqr.length === 0 && (
                                        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-[#0b111d] p-10 text-center">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-500">
                                                <IconChat className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm text-slate-400">Todavía no has radicado ninguna PQR.</p>
                                        </div>
                                    )}

                                    {!cargandoPqr && !errorPqr && misPqr.length > 0 && (
                                        <div className="grid gap-3.5 sm:grid-cols-2">
                                            {misPqr.map((pqr) => {
                                                const ultimoMensaje =
                                                    pqr.mensajes && pqr.mensajes.length > 0
                                                        ? pqr.mensajes[pqr.mensajes.length - 1]
                                                        : null;
                                                const estiloTipo =
                                                    TIPOS_PQR_COLOR[pqr.tipo] || {
                                                        badge: "border-slate-600 bg-slate-800 text-slate-300",
                                                        accent: "border-l-slate-600/70",
                                                    };
                                                const respuestaNueva =
                                                    ultimoMensaje?.autor === "equipo" && pqr.estado !== "Cerrada";

                                                return (
                                                    <button
                                                        key={pqr.id}
                                                        onClick={() => setPqrSeleccionada(pqr)}
                                                        className={`group relative block w-full overflow-hidden rounded-2xl border border-l-4 border-slate-800 bg-gradient-to-br from-[#0d1424] to-[#0b111d] p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10 sm:p-5 ${estiloTipo.accent}`}
                                                    >
                                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <span
                                                                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${estiloTipo.badge}`}
                                                                >
                                                                    {pqr.tipo}
                                                                </span>
                                                                <h5 className="mt-2 font-bold text-white">{pqr.asunto}</h5>
                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    {formatearFecha(pqr.fechaActualizacion || pqr.fecha)}
                                                                </p>
                                                            </div>
                                                            <span
                                                                className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
                                                                    ESTADOS_PQR_COLOR[pqr.estado] ||
                                                                    "border-slate-500/30 bg-slate-500/10 text-slate-300"
                                                                }`}
                                                            >
                                                                {pqr.estado}
                                                            </span>
                                                        </div>

                                                        {ultimoMensaje && (
                                                            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                                                                <span className="font-semibold text-slate-300">
                                                                    {ultimoMensaje.autor === "equipo"
                                                                        ? "JR TECH: "
                                                                        : "Tú: "}
                                                                </span>
                                                                {ultimoMensaje.texto}
                                                            </p>
                                                        )}

                                                        <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/80 pt-3">
                                                            {respuestaNueva ? (
                                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-cyan-300">
                                                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                                                                    Respuesta nueva
                                                                </span>
                                                            ) : (
                                                                <span />
                                                            )}

                                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 transition group-hover:gap-2">
                                                                <IconChat className="h-3.5 w-3.5" />
                                                                Abrir conversación
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* FOOTER */}
                        <footer className="mt-12 border-t border-slate-800/70 pt-6 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-700">
                                JR TECH · Panel de Cliente
                            </p>
                        </footer>

                    </main>

                </div>

            </div>

            <HiloPQR
                pqr={pqrSeleccionada}
                vistaComo="cliente"
                onCerrar={() => setPqrSeleccionada(null)}
                onEnviarMensaje={enviarMensajePqr}
                enviando={enviandoMensajePqr}
            />

            <Toast toasts={toasts} />
        </main>
    );
}

export default Perfil;
