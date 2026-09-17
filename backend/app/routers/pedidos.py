from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_db
from app.deps import requerir_roles
from app.models.common import oid
from app.models.factura import serializar_factura
from app.models.pedido import ESTADOS_PEDIDO, IVA_PORCENTAJE, serializar_pedido
from app.models.usuario import serializar_usuario
from app.schemas.carrito import PedidoDescuentoActualizar, PedidoEstadoActualizar
from app.utils.email import enviar_correo_factura
from app.utils.pdf import generar_pdf_comprobante

router = APIRouter(prefix="/api/pedidos", tags=["Pedidos"])


@router.get("/todos")
async def listar_todos_los_pedidos(
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    """Panel de administración/empleado: todos los pedidos, con datos del
    cliente que los hizo."""
    pedidos = await db.pedidos.find().sort("fecha", -1).to_list(length=2000)

    resultado = []
    for pedido in pedidos:
        pedido_serializado = serializar_pedido(pedido)
        usuario_doc = await db.usuarios.find_one({"_id": pedido["usuarioId"]})
        pedido_serializado["usuario"] = serializar_usuario(usuario_doc) if usuario_doc else None
        resultado.append(pedido_serializado)

    return {"success": True, "pedidos": resultado}


@router.get("")
async def listar_mis_pedidos(
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador")),
):
    """Historial de compras del usuario autenticado (mi cuenta / perfil)."""
    pedidos = await db.pedidos.find({"usuarioId": oid(usuario["id"])}).sort("fecha", -1).to_list(length=1000)
    return {"success": True, "pedidos": [serializar_pedido(p) for p in pedidos]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_pedido(
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador")),
):
    """Finaliza la compra: convierte el carrito actual del usuario (que puede
    traer productos Y servicios mezclados) en un pedido, crea la factura
    correspondiente como su propio registro en la base de datos, y vacía el
    carrito."""
    lineas = await db.carrito.find({"usuarioId": usuario["id"]}).to_list(length=1000)
    if not lineas:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tu carrito está vacío.")

    items = []
    subtotal = 0.0
    for linea in lineas:
        tipo = linea.get("tipo", "producto")
        item_id = linea.get("itemId", linea.get("productoId"))
        coleccion = db.productos if tipo == "producto" else db.servicios

        documento = await coleccion.find_one({"_id": item_id})
        if not documento:
            continue

        subtotal_linea = documento.get("precio", 0) * linea["cantidad"]
        subtotal += subtotal_linea

        item = {
            "tipo": tipo,
            "nombre": documento.get("nombre"),
            "precio": documento.get("precio"),
            "cantidad": linea["cantidad"],
            "subtotal": subtotal_linea,
        }
        if tipo == "producto":
            item["productoId"] = item_id
        else:
            item["servicioId"] = item_id
        items.append(item)

    if not items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tu carrito no tiene productos ni servicios disponibles.")

    # Sin descuento al momento de la compra (el autoservicio no tiene un
    # campo para cupones); un Administrador/Empleado puede aplicar uno
    # después, mientras el pedido siga "Pendiente" (ver
    # aplicar_descuento_pedido más abajo).
    descuento = 0.0
    descuento_porcentaje = 0.0
    base_gravable = subtotal - descuento

    # El IVA se calcula al momento de la compra y queda guardado en el
    # pedido (no solo calculado al vuelo al mostrar la factura), para que el
    # comprobante de una compra ya hecha no cambie si el porcentaje de IVA
    # cambia en el futuro.
    iva = round(base_gravable * IVA_PORCENTAJE, 2)
    total = base_gravable + iva

    ahora = datetime.now(timezone.utc)

    pedido = {
        "usuarioId": oid(usuario["id"]),
        "productos": items,
        "subtotal": subtotal,
        "descuento": descuento,
        "descuentoPorcentaje": descuento_porcentaje,
        "iva": iva,
        "ivaPorcentaje": IVA_PORCENTAJE,
        "total": total,
        "estado": "Pendiente",
        "fecha": ahora,
    }
    resultado = await db.pedidos.insert_one(pedido)
    pedido["_id"] = resultado.inserted_id

    # La factura queda guardada como su propio documento (no solo generada
    # al vuelo en PDF/Excel al pedirla), con un número de factura derivado
    # del pedido para mantener continuidad con los comprobantes que ya se
    # venían mostrando antes de este cambio.
    numero_factura = f"FE-{str(pedido['_id'])[-8:].upper()}"
    factura = {
        "numero": numero_factura,
        "pedidoId": pedido["_id"],
        "usuarioId": oid(usuario["id"]),
        "productos": items,
        "subtotal": subtotal,
        "descuento": descuento,
        "descuentoPorcentaje": descuento_porcentaje,
        "iva": iva,
        "ivaPorcentaje": IVA_PORCENTAJE,
        "total": total,
        "estado": "Emitida",
        "fecha": ahora,
    }
    resultado_factura = await db.facturas.insert_one(factura)
    factura["_id"] = resultado_factura.inserted_id

    await db.pedidos.update_one({"_id": pedido["_id"]}, {"$set": {"facturaId": resultado_factura.inserted_id}})
    pedido["facturaId"] = resultado_factura.inserted_id

    await db.carrito.delete_many({"usuarioId": usuario["id"]})

    # Envío de la factura por correo: además de quedar disponible para
    # descargar desde el perfil (PDF/Excel, ver app/routers/facturas.py),
    # se manda por correo con el PDF adjunto apenas se genera la compra. Si
    # el SMTP falla o no está configurado, no se rompe la compra — solo se
    # registra en consola (ver enviar_correo_factura).
    try:
        factura_para_correo = serializar_factura(dict(factura))
        factura_para_correo["usuario"] = usuario
        if usuario.get("correo"):
            pdf_factura = generar_pdf_comprobante(factura_para_correo)
            nombre_cliente = f"{usuario.get('nombre', '')} {usuario.get('apellido', '')}".strip()
            enviar_correo_factura(usuario["correo"], nombre_cliente, factura_para_correo, pdf_factura)
    except Exception as error:
        print(f"⚠️ No se pudo generar/enviar la factura por correo: {error}")

    return {"success": True, "message": "¡Compra realizada con éxito!", "pedido": serializar_pedido(pedido)}


@router.patch("/{pedido_id}/estado")
async def cambiar_estado_pedido(
    pedido_id: str,
    datos: PedidoEstadoActualizar,
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    if datos.estado not in ESTADOS_PEDIDO:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"El estado debe ser uno de {ESTADOS_PEDIDO}")

    _id = oid(pedido_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de pedido inválido.")

    resultado = await db.pedidos.update_one({"_id": _id}, {"$set": {"estado": datos.estado}})
    if resultado.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido no encontrado.")

    pedido = await db.pedidos.find_one({"_id": _id})

    # Mantiene el estado de la factura sincronizado con el del pedido: si el
    # pedido se cancela, la factura queda Anulada (y viceversa: ver
    # anular_factura en app/routers/facturas.py, que cancela el pedido).
    if pedido.get("facturaId"):
        nuevo_estado_factura = "Anulada" if datos.estado == "Cancelado" else "Emitida"
        await db.facturas.update_one(
            {"_id": pedido["facturaId"]}, {"$set": {"estado": nuevo_estado_factura}}
        )

    usuario_doc = await db.usuarios.find_one({"_id": pedido["usuarioId"]})

    pedido_serializado = serializar_pedido(pedido)
    pedido_serializado["usuario"] = serializar_usuario(usuario_doc) if usuario_doc else None

    return {"success": True, "message": "Estado del pedido actualizado.", "pedido": pedido_serializado}


@router.patch("/{pedido_id}/descuento")
async def aplicar_descuento_pedido(
    pedido_id: str,
    datos: PedidoDescuentoActualizar,
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    """Aplica un descuento (%) a un pedido que todavía está 'Pendiente' y
    recalcula IVA/total. El descuento se aplica ANTES de calcular el IVA
    (se cobra impuesto sobre el valor ya descontado). Sincroniza la factura
    vinculada para que muestre exactamente los mismos totales."""
    _id = oid(pedido_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de pedido inválido.")

    pedido = await db.pedidos.find_one({"_id": _id})
    if not pedido:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido no encontrado.")

    if pedido.get("estado") != "Pendiente":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Solo se puede aplicar un descuento a un pedido que sigue 'Pendiente'.",
        )

    subtotal = float(pedido.get("subtotal") or 0)
    descuento = round(subtotal * (datos.porcentaje / 100), 2)
    base_gravable = subtotal - descuento
    iva = round(base_gravable * IVA_PORCENTAJE, 2)
    total = base_gravable + iva

    cambios = {
        "descuento": descuento,
        "descuentoPorcentaje": datos.porcentaje,
        "iva": iva,
        "total": total,
    }
    await db.pedidos.update_one({"_id": _id}, {"$set": cambios})

    if pedido.get("facturaId"):
        await db.facturas.update_one({"_id": pedido["facturaId"]}, {"$set": cambios})

    pedido.update(cambios)
    usuario_doc = await db.usuarios.find_one({"_id": pedido["usuarioId"]})

    pedido_serializado = serializar_pedido(pedido)
    pedido_serializado["usuario"] = serializar_usuario(usuario_doc) if usuario_doc else None

    return {"success": True, "message": "Descuento aplicado correctamente.", "pedido": pedido_serializado}
