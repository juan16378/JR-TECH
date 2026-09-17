import { useEffect, useState } from "react";


function WhatsAppButton({
    numero = "573001234567",
    mensaje = "¡Hola! Quiero más información sobre los productos de JR TECH.",
}) {
    const [visible, setVisible] = useState(false);

    // Pequeña animación de entrada al cargar la página
    useEffect(() => {
        const timeout = setTimeout(() => setVisible(true), 300);
        return () => clearTimeout(timeout);
    }, []);

    const enlace = `https://wa.me/${numero}?text=${encodeURIComponent(
        mensaje
    )}`;

    return (
        <a
            href={enlace}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escríbenos por WhatsApp"
            className={`group fixed bottom-6 right-6 z-50 flex items-center gap-0 overflow-hidden rounded-full bg-[#25D366] shadow-[0_8px_30px_rgba(37,211,102,0.45)] transition-all duration-500 hover:shadow-[0_8px_35px_rgba(37,211,102,0.65)] ${
                visible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-6 opacity-0"
            }`}
        >

            {/* ANILLO PULSANTE */}
            <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366] opacity-40" />

            {/* TEXTO (aparece al hacer hover, solo escritorio) */}
            <span className="hidden max-w-0 items-center overflow-hidden whitespace-nowrap pl-0 text-sm font-bold text-white transition-all duration-300 group-hover:max-w-[160px] group-hover:pl-4 sm:flex">
                Escríbenos
            </span>

            {/* ÍCONO */}
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center">
                <svg
                    viewBox="0 0 32 32"
                    className="h-8 w-8 fill-white"
                    aria-hidden="true"
                >
                    <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.31.66 4.47 1.8 6.31L4 29l7.86-1.76A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.8c-2.02 0-3.9-.58-5.49-1.58l-.39-.24-4.66 1.05 1.07-4.53-.26-.42A9.77 9.77 0 0 1 5.2 15c0-5.96 4.85-10.8 10.8-10.8 5.96 0 10.8 4.84 10.8 10.8 0 5.96-4.84 10.8-10.8 10.8Zm5.93-8.1c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.84 1.05-1.03 1.26-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.6-1.6-.96-.86-1.6-1.92-1.79-2.24-.19-.32-.02-.5.14-.66.14-.14.32-.38.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.54-.73-.55h-.62c-.21 0-.56.08-.85.4-.29.32-1.12 1.1-1.12 2.68 0 1.58 1.15 3.11 1.31 3.33.16.21 2.26 3.45 5.48 4.84.77.33 1.37.53 1.84.68.77.25 1.47.21 2.03.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.6-.37Z" />
                </svg>
            </span>

        </a>
    );
}

export default WhatsAppButton;