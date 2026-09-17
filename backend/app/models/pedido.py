from app.models.common import serializar_id

ESTADOS_PEDIDO = ["Pendiente", "Procesando", "Enviado", "Entregado", "Cancelado"]

# IVA único para todo el catálogo (Colombia, tarifa general). Se aplica sobre
# el subtotal de cada pedido (ya con el descuento restado) al momento de la
# compra (ver crear_pedido en app/routers/pedidos.py) y se muestra desglosado
# en la factura/comprobante (PDF y Excel, en app/utils/pdf.py y
# app/utils/excel.py).
IVA_PORCENTAJE = 0.19


def _serializar_items(items: list) -> list:
    """Las líneas de un pedido/factura pueden ser productos o servicios
    ('tipo'); cada una guarda el ObjectId del producto o del servicio, que
    hay que convertir a texto para poder devolverlo como JSON."""
    resultado = []
    for item in items or []:
        item = dict(item)
        if item.get("productoId") is not None:
            item["productoId"] = str(item["productoId"])
        if item.get("servicioId") is not None:
            item["servicioId"] = str(item["servicioId"])
        resultado.append(item)
    return resultado


def serializar_pedido(doc: dict) -> dict:
    if not doc:
        return doc

    doc = serializar_id(doc)

    # 'usuarioId' es un ObjectId de Mongo: se convierte a texto para poder
    # devolverlo como JSON.
    if doc.get("usuarioId") is not None:
        doc["usuarioId"] = str(doc["usuarioId"])
    if doc.get("facturaId") is not None:
        doc["facturaId"] = str(doc["facturaId"])

    doc["productos"] = _serializar_items(doc.get("productos", []))

    return doc
