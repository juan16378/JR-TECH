"""
Cliente mínimo para la API de Google Gemini (generateContent), llamada por
HTTP directo con httpx en vez del SDK oficial de Google: lo único que se
necesita aquí es mandar un prompt y leer el texto de la respuesta, así que
no vale la pena agregar una dependencia más pesada solo para eso.

Requiere una GEMINI_API_KEY en el .env (se consigue gratis en
https://aistudio.google.com/apikey). Mientras no esté configurada, cualquier
llamada lanza ChatbotNoDisponible en vez de fallar con un error crudo, para
que el endpoint que lo use pueda responder con un mensaje amable.
"""

import httpx

from app.core.config import settings

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent"


class ChatbotNoDisponible(Exception):
    """El chatbot no pudo responder (falta la API key, Gemini no respondió
    a tiempo, o devolvió algo inesperado)."""


async def preguntar_gemini(system_prompt: str, historial: list[dict], mensaje: str) -> str:
    """`historial` es una lista de {"autor": "usuario"|"bot", "texto": str}
    en orden cronológico (sin incluir `mensaje`, que es el turno nuevo)."""

    if not settings.GEMINI_API_KEY:
        raise ChatbotNoDisponible("GEMINI_API_KEY no está configurada en el backend (.env).")

    contenidos = []
    for turno in historial:
        texto = (turno.get("texto") or "").strip()
        if not texto:
            continue
        rol = "model" if turno.get("autor") == "bot" else "user"
        contenidos.append({"role": rol, "parts": [{"text": texto}]})

    contenidos.append({"role": "user", "parts": [{"text": mensaje}]})

    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": contenidos,
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 500},
    }

    url = GEMINI_URL.format(modelo=settings.GEMINI_MODEL)

    try:
        async with httpx.AsyncClient(timeout=20) as cliente:
            respuesta = await cliente.post(url, params={"key": settings.GEMINI_API_KEY}, json=payload)
    except httpx.HTTPError as error:
        # Algunas excepciones de httpx (timeouts, errores de conexión) no
        # traen texto en str(error), así que se agrega también el tipo y el
        # repr para poder diagnosticar qué está pasando (firewall/antivirus
        # bloqueando la salida, sin internet, proxy mal configurado, etc.).
        raise ChatbotNoDisponible(
            f"No se pudo contactar a Gemini ({type(error).__name__}): {error!r}"
        ) from error

    if respuesta.status_code != 200:
        raise ChatbotNoDisponible(f"Gemini respondió {respuesta.status_code}: {respuesta.text[:300]}")

    datos = respuesta.json()
    try:
        return datos["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError) as error:
        raise ChatbotNoDisponible("Gemini no devolvió una respuesta utilizable.") from error
