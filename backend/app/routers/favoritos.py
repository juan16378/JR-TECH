from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_db
from app.deps import requerir_roles
from app.models.common import oid
from app.models.producto import serializar_producto

router = APIRouter(prefix="/api/favoritos", tags=["Favoritos"])


@router.get("")
async def obtener_favoritos(
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador")),
):
    lineas = await db.favoritos.find({"usuarioId": usuario["id"]}).to_list(length=1000)

    productos = []
    for linea in lineas:
        producto = await db.productos.find_one({"_id": linea["productoId"]})
        if producto:
            productos.append(serializar_producto(producto))
        else:
            await db.favoritos.delete_one({"_id": linea["_id"]})

    return {"success": True, "favoritos": productos}


@router.post("/{producto_id}")
async def alternar_favorito(
    producto_id: str,
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador")),
):
    _id_producto = oid(producto_id)
    if not _id_producto:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de producto inválido.")

    if not await db.productos.find_one({"_id": _id_producto}):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado.")

    existente = await db.favoritos.find_one({"usuarioId": usuario["id"], "productoId": _id_producto})

    if existente:
        await db.favoritos.delete_one({"_id": existente["_id"]})
        return {"success": True, "esFavorito": False, "message": "Se quitó de tus favoritos."}

    await db.favoritos.insert_one({"usuarioId": usuario["id"], "productoId": _id_producto})
    return {"success": True, "esFavorito": True, "message": "Se agregó a tus favoritos."}
