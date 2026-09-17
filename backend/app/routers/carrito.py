from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_db
from app.deps import requerir_roles
from app.models.common import oid
from app.schemas.carrito import CarritoActualizar, CarritoAgregar

router = APIRouter(prefix="/api/carrito", tags=["Carrito"])


async def _carrito_con_items(db, usuario_id: str) -> list[dict]:
    """Arma la lista del carrito uniendo cada línea con los datos actuales
    del producto o servicio (nombre, precio, imagen si aplica), como lo
    espera el frontend. Cada línea guarda un 'tipo' ("producto"|"servicio")
    para saber en qué colección buscar."""
    lineas = await db.carrito.find({"usuarioId": usuario_id}).to_list(length=1000)

    items = []
    for linea in lineas:
        tipo = linea.get("tipo", "producto")
        coleccion = db.productos if tipo == "producto" else db.servicios
        item_id = linea.get("itemId", linea.get("productoId"))

        documento = await coleccion.find_one({"_id": item_id})
        if not documento:
            # El producto/servicio ya no existe: se limpia esa línea huérfana.
            await db.carrito.delete_one({"_id": linea["_id"]})
            continue

        items.append(
            {
                "id": str(documento["_id"]),
                "tipo": tipo,
                "nombre": documento.get("nombre"),
                "precio": documento.get("precio"),
                "imagen": documento.get("imagen"),
                "categoria": documento.get("categoria"),
                "cantidad": linea["cantidad"],
            }
        )

    return items


@router.get("")
async def obtener_carrito(db=Depends(get_db), usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador"))):
    carrito = await _carrito_con_items(db, usuario["id"])
    return {"success": True, "carrito": carrito}


@router.post("")
async def agregar_al_carrito(
    datos: CarritoAgregar,
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador")),
):
    if datos.productoId:
        tipo = "producto"
        _id_item = oid(datos.productoId)
        if not _id_item:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de producto inválido.")
        documento = await db.productos.find_one({"_id": _id_item})
        if not documento:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado.")
    else:
        tipo = "servicio"
        _id_item = oid(datos.servicioId)
        if not _id_item:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de servicio inválido.")
        documento = await db.servicios.find_one({"_id": _id_item})
        if not documento:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado.")
        if documento.get("estado") != "Activo":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ese servicio no está disponible actualmente.")

    existente = await db.carrito.find_one({"usuarioId": usuario["id"], "tipo": tipo, "itemId": _id_item})
    if existente:
        await db.carrito.update_one(
            {"_id": existente["_id"]}, {"$inc": {"cantidad": datos.cantidad}}
        )
    else:
        await db.carrito.insert_one(
            {"usuarioId": usuario["id"], "tipo": tipo, "itemId": _id_item, "cantidad": datos.cantidad}
        )

    carrito = await _carrito_con_items(db, usuario["id"])
    mensaje = "Producto agregado al carrito." if tipo == "producto" else "Servicio agregado al carrito."
    return {"success": True, "message": mensaje, "carrito": carrito}


@router.patch("/{item_id}")
async def actualizar_cantidad_carrito(
    item_id: str,
    datos: CarritoActualizar,
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador")),
):
    _id_item = oid(item_id)
    if not _id_item:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID inválido.")

    if datos.cantidad <= 0:
        await db.carrito.delete_one({"usuarioId": usuario["id"], "itemId": _id_item})
    else:
        resultado = await db.carrito.update_one(
            {"usuarioId": usuario["id"], "itemId": _id_item},
            {"$set": {"cantidad": datos.cantidad}},
        )
        if resultado.matched_count == 0:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese ítem no está en tu carrito.")

    carrito = await _carrito_con_items(db, usuario["id"])
    return {"success": True, "carrito": carrito}


@router.delete("")
async def vaciar_carrito(
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador")),
):
    await db.carrito.delete_many({"usuarioId": usuario["id"]})
    return {"success": True, "message": "Carrito vaciado.", "carrito": []}
