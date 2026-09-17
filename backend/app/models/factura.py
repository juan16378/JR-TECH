from app.models.common import serializar_id
from app.models.pedido import _serializar_items

ESTADOS_FACTURA = ["Emitida", "Anulada"]


def serializar_factura(doc: dict) -> dict:
    if not doc:
        return doc

    doc = serializar_id(doc)

    if doc.get("usuarioId") is not None:
        doc["usuarioId"] = str(doc["usuarioId"])
    if doc.get("pedidoId") is not None:
        doc["pedidoId"] = str(doc["pedidoId"])

    doc["productos"] = _serializar_items(doc.get("productos", []))

    return doc
