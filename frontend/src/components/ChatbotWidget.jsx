import { useEffect, useRef, useState } from "react";
import { IconBot, IconPlus, IconSend, IconX } from "./Icons";

// ==========================================
// Botón flotante único de JR TECH: un solo círculo en la esquina inferior
// derecha que, al hacer clic, se despliega en dos opciones — WhatsApp y el
// asistente con IA — en vez de mostrar dos botones flotantes separados y
// encimados. Si la página no tiene WhatsApp (paneles internos: perfil/
// admin/empleado, ver prop `mostrarWhatsapp`), el clic abre el chat
// directamente, sin el paso intermedio del menú.
//
// El historial de la conversación con el asistente vive solo en este
// componente (en memoria, se pierde al recargar la página) — el backend
// no guarda nada de esto, cada mensaje se manda junto con los últimos
// turnos para darle contexto al modelo (POST /api/chatbot/mensaje).
// ==========================================

import { API_URL } from "../config";
const MAX_TURNOS_CONTEXTO = 10;

const SALUDO_INICIAL = {
    autor: "bot",
    texto: "¡Hola! Soy el asistente virtual de JR TECH. Puedo ayudarte con preguntas frecuentes, recomendarte productos o servicios, y si iniciaste sesión, contarte sobre tus propios pedidos. ¿En qué te ayudo?",
};

function obtenerToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

// ==========================================
// Mini-renderizador de markdown "seguro": el texto de Gemini puede traer
// **negritas** y listas con "- " (se le pide así en el system prompt del
// backend), así que antes de mostrarlo se escapa TODO como texto plano
// (para que nada se interprete como HTML real, evitando XSS) y solo
// después se le aplican estas transformaciones puntuales controladas por
// nosotros mismos. Los emojis no necesitan tratamiento especial: son
// caracteres normales y se muestran tal cual.
// ==========================================

function escaparHtml(texto) {
    return texto
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function aplicarNegritas(lineaEscapada) {
    return lineaEscapada.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderizarMensaje(texto) {
    const lineas = escaparHtml(texto || "").split("\n");
    let html = "";
    let dentroDeLista = false;

    for (const linea of lineas) {
        const esViñeta = /^\s*[-*]\s+/.test(linea);

        if (esViñeta) {
            if (!dentroDeLista) {
                html += '<ul class="list-disc space-y-0.5 pl-4">';
                dentroDeLista = true;
            }
            html += `<li>${aplicarNegritas(linea.replace(/^\s*[-*]\s+/, ""))}</li>`;
            continue;
        }

        if (dentroDeLista) {
            html += "</ul>";
            dentroDeLista = false;
        }

        html += linea.trim() === "" ? "<br/>" : `<p class="mb-1 last:mb-0">${aplicarNegritas(linea)}</p>`;
    }

    if (dentroDeLista) html += "</ul>";
    return html;
}

function ChatbotWidget({
    mostrarWhatsapp = false,
    numeroWhatsapp = "573001234567",
    mensajeWhatsapp = "¡Hola! Quiero más información sobre los productos de JR TECH.",
}) {
    // Menú desplegable (speed-dial) con las dos opciones, y el panel del
    // chat propiamente dicho. Nunca están abiertos los dos a la vez.
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [chatAbierto, setChatAbierto] = useState(false);

    const [mensajes, setMensajes] = useState([SALUDO_INICIAL]);
    const [texto, setTexto] = useState("");
    const [enviando, setEnviando] = useState(false);
    const finRef = useRef(null);

    useEffect(() => {
        if (chatAbierto) finRef.current?.scrollIntoView({ block: "nearest" });
    }, [mensajes, chatAbierto]);

    const enlaceWhatsapp = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensajeWhatsapp)}`;

    // Clic en el botón principal: si ya hay algo abierto (chat o menú), lo
    // cierra. Si no, despliega el menú — con las dos opciones si hay
    // WhatsApp disponible en esta página, o solo con "Asistente IA" si no
    // (paneles internos), para que siempre se vea igual de claro cuál es
    // la opción antes de abrir el chat.
    const alHacerClicPrincipal = () => {
        if (chatAbierto) {
            setChatAbierto(false);
            return;
        }
        setMenuAbierto((v) => !v);
    };

    const abrirChat = () => {
        setMenuAbierto(false);
        setChatAbierto(true);
    };

    const enviar = async () => {
        const limpio = texto.trim();
        if (!limpio || enviando) return;

        const historialPrevio = mensajes
            .slice(-MAX_TURNOS_CONTEXTO)
            .map((m) => ({ autor: m.autor, texto: m.texto }));

        setMensajes((prev) => [...prev, { autor: "usuario", texto: limpio }]);
        setTexto("");
        setEnviando(true);

        try {
            const token = obtenerToken();
            const headers = { "Content-Type": "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;

            const respuesta = await fetch(`${API_URL}/chatbot/mensaje`, {
                method: "POST",
                headers,
                body: JSON.stringify({ mensaje: limpio, historial: historialPrevio }),
            });

            let datos = {};
            try {
                datos = await respuesta.json();
            } catch {
                datos = {};
            }

            if (!respuesta.ok) {
                throw new Error(datos.message || "No se pudo contactar al asistente.");
            }

            setMensajes((prev) => [
                ...prev,
                { autor: "bot", texto: datos.respuesta || "No pude generar una respuesta, ¿puedes reformular tu pregunta?" },
            ]);
        } catch (error) {
            console.error("❌ Error del chatbot:", error);
            setMensajes((prev) => [
                ...prev,
                { autor: "bot", texto: "Tuve un problema para responder. Intenta de nuevo en un momento." },
            ]);
        } finally {
            setEnviando(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            enviar();
        }
    };

    const desplegado = chatAbierto || menuAbierto;

    return (
        <>
            {/* VENTANA DEL CHAT */}
            {chatAbierto && (
                <div className="fixed bottom-24 right-4 z-50 flex h-[520px] max-h-[75vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-700/70 bg-[#0b1120] shadow-[0_25px_80px_rgba(0,0,0,0.5)] sm:right-6">

                    {/* ENCABEZADO */}
                    <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 px-4 py-3">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950">
                                <IconBot className="h-4.5 w-4.5" />
                            </span>
                            <div>
                                <p className="text-sm font-black text-white">Asistente JR TECH</p>
                                <p className="text-[11px] text-cyan-300">En línea</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setChatAbierto(false)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white"
                            aria-label="Cerrar chat"
                        >
                            <IconX className="h-4 w-4" />
                        </button>
                    </div>

                    {/* HILO */}
                    <div className="flex-1 space-y-3 overflow-y-auto p-4">
                        {mensajes.map((m, idx) => {
                            const esUsuario = m.autor === "usuario";
                            return (
                                <div key={idx} className={`flex ${esUsuario ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                                            esUsuario
                                                ? "rounded-br-sm bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950"
                                                : "rounded-bl-sm border border-slate-800 bg-slate-900 text-slate-200"
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: renderizarMensaje(m.texto) }}
                                    />
                                </div>
                            );
                        })}

                        {enviando && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-slate-800 bg-slate-900 px-4 py-3">
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.3s]" />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.15s]" />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500" />
                                </div>
                            </div>
                        )}
                        <div ref={finRef} />
                    </div>

                    {/* CAJA DE ENTRADA */}
                    <div className="border-t border-slate-800 p-3">
                        <div className="flex items-end gap-2">
                            <textarea
                                value={texto}
                                onChange={(e) => setTexto(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={enviando}
                                rows={1}
                                placeholder="Escribe tu pregunta..."
                                className="max-h-24 flex-1 resize-none rounded-xl border border-slate-700/70 bg-slate-950/50 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/60 disabled:opacity-60"
                            />
                            <button
                                onClick={enviar}
                                disabled={!texto.trim() || enviando}
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 transition hover:-translate-y-0.5 disabled:opacity-50"
                                aria-label="Enviar"
                            >
                                <IconSend className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MENÚ DESPLEGABLE: "Asistente IA" siempre aparece; WhatsApp
                solo en páginas públicas (ver mostrarWhatsapp). */}
            {menuAbierto && !chatAbierto && (
                <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 sm:right-6">
                    {/* Asistente con IA */}
                    <button
                        onClick={abrirChat}
                        className="flex items-center gap-2.5 rounded-full bg-[#0b1120] py-1.5 pl-4 pr-1.5 text-sm font-bold text-white shadow-[0_8px_30px_rgba(0,0,0,0.45)] ring-1 ring-slate-700/70 transition hover:-translate-y-0.5"
                    >
                        Asistente IA
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950">
                            <IconBot className="h-5 w-5" />
                        </span>
                    </button>

                    {/* WhatsApp */}
                    {mostrarWhatsapp && (
                        <a
                            href={enlaceWhatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setMenuAbierto(false)}
                            className="flex items-center gap-2.5 rounded-full bg-[#0b1120] py-1.5 pl-4 pr-1.5 text-sm font-bold text-white shadow-[0_8px_30px_rgba(0,0,0,0.45)] ring-1 ring-slate-700/70 transition hover:-translate-y-0.5"
                        >
                            WhatsApp
                            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366]">
                                <svg viewBox="0 0 32 32" className="h-5 w-5 fill-white" aria-hidden="true">
                                    <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.31.66 4.47 1.8 6.31L4 29l7.86-1.76A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.8c-2.02 0-3.9-.58-5.49-1.58l-.39-.24-4.66 1.05 1.07-4.53-.26-.42A9.77 9.77 0 0 1 5.2 15c0-5.96 4.85-10.8 10.8-10.8 5.96 0 10.8 4.84 10.8 10.8 0 5.96-4.84 10.8-10.8 10.8Zm5.93-8.1c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.84 1.05-1.03 1.26-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.6-1.6-.96-.86-1.6-1.92-1.79-2.24-.19-.32-.02-.5.14-.66.14-.14.32-.38.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.54-.73-.55h-.62c-.21 0-.56.08-.85.4-.29.32-1.12 1.1-1.12 2.68 0 1.58 1.15 3.11 1.31 3.33.16.21 2.26 3.45 5.48 4.84.77.33 1.37.53 1.84.68.77.25 1.47.21 2.03.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.6-.37Z" />
                                </svg>
                            </span>
                        </a>
                    )}
                </div>
            )}

            {/* BOTÓN PRINCIPAL: el "+" gira 45° y se ve como una X cuando
                el menú o el chat están abiertos, sin cambiar de ícono. */}
            <button
                onClick={alHacerClicPrincipal}
                aria-label={desplegado ? "Cerrar" : "Abrir opciones de contacto"}
                className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 shadow-[0_8px_30px_rgba(34,211,238,0.45)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_35px_rgba(34,211,238,0.65)] sm:right-6"
            >
                {!desplegado && (
                    <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-cyan-400 opacity-30" />
                )}
                <IconPlus className={`h-6 w-6 transition-transform duration-300 ${desplegado ? "rotate-45" : ""}`} />
            </button>
        </>
    );
}

export default ChatbotWidget;
