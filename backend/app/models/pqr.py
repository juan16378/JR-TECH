from app.models.common import serializar_id

TIPOS_PQR = ["Petición", "Queja", "Reclamo"]
ESTADOS_PQR = ["Abierta", "En proceso", "Cerrada"]


def serializar_pqr(doc: dict) -> dict:
    """Convierte un documento de la colección 'pqr' a la forma que consume
    el frontend: siempre con una lista 'mensajes' (hilo de chat), sin
    importar si el documento es del formato nuevo o del formato viejo.

    El formato viejo (antes de convertir PQR en un hilo de conversación)
    guardaba un único 'mensaje' inicial y una única 'respuesta' del equipo.
    Para no perder ni tener que migrar los documentos ya creados, si el
    documento no trae 'mensajes' se arma la lista a partir de esos campos
    viejos.
    """
    if not doc:
        return doc

    doc = serializar_id(doc)

    if doc.get("usuarioId") is not None:
        doc["usuarioId"] = str(doc["usuarioId"])

    if not doc.get("mensajes"):
        mensajes = []
        if doc.get("mensaje"):
            mensajes.append(
                {
                    "autor": "cliente",
                    "nombre": None,
                    "texto": doc["mensaje"],
                    "fecha": doc.get("fecha"),
                }
            )
        if doc.get("respuesta"):
            mensajes.append(
                {
                    "autor": "equipo",
                    "nombre": doc.get("respondidoPor"),
                    "texto": doc["respuesta"],
                    "fecha": doc.get("fechaRespuesta") or doc.get("fecha"),
                }
            )
        doc["mensajes"] = mensajes

    # Los campos viejos ya quedaron representados dentro de 'mensajes': se
    # quitan de la respuesta para no duplicar la información.
    doc.pop("mensaje", None)
    doc.pop("respuesta", None)
    doc.pop("respondidoPor", None)
    doc.pop("fechaRespuesta", None)

    return doc
