from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_db
from app.deps import requerir_roles
from app.models.common import oid
from app.models.usuario import serializar_usuario
from app.schemas.usuario import UsuarioActualizar

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])


@router.get("")
async def listar_usuarios(db=Depends(get_db), _admin: dict = Depends(requerir_roles("Administrador"))):
    usuarios = await db.usuarios.find().sort("createdAt", -1).to_list(length=1000)
    return {"success": True, "usuarios": [serializar_usuario(u) for u in usuarios]}


@router.get("/{usuario_id}")
async def obtener_usuario(
    usuario_id: str,
    db=Depends(get_db),
    _admin: dict = Depends(requerir_roles("Administrador")),
):
    _id = oid(usuario_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de usuario inválido.")

    usuario = await db.usuarios.find_one({"_id": _id})
    if not usuario:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")

    return {"success": True, "usuario": serializar_usuario(usuario)}


@router.put("/{usuario_id}")
async def actualizar_usuario(
    usuario_id: str,
    datos: UsuarioActualizar,
    db=Depends(get_db),
    _admin: dict = Depends(requerir_roles("Administrador")),
):
    _id = oid(usuario_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de usuario inválido.")

    cambios = {k: v for k, v in datos.model_dump().items() if v is not None}
    if not cambios:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No se enviaron campos para actualizar.")

    resultado = await db.usuarios.update_one({"_id": _id}, {"$set": cambios})
    if resultado.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")

    usuario = await db.usuarios.find_one({"_id": _id})
    return {"success": True, "message": "Usuario actualizado correctamente.", "usuario": serializar_usuario(usuario)}


@router.patch("/{usuario_id}/estado")
async def cambiar_estado_usuario(
    usuario_id: str,
    db=Depends(get_db),
    admin: dict = Depends(requerir_roles("Administrador")),
):
    _id = oid(usuario_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de usuario inválido.")

    if usuario_id == admin["id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes cambiar el estado de tu propia cuenta.")

    usuario = await db.usuarios.find_one({"_id": _id})
    if not usuario:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")

    nuevo_estado = "Inactivo" if usuario.get("estado") == "Activo" else "Activo"
    await db.usuarios.update_one({"_id": _id}, {"$set": {"estado": nuevo_estado}})

    usuario["estado"] = nuevo_estado
    return {"success": True, "message": f"Usuario marcado como {nuevo_estado}.", "usuario": serializar_usuario(usuario)}


@router.delete("/{usuario_id}")
async def eliminar_usuario(
    usuario_id: str,
    db=Depends(get_db),
    admin: dict = Depends(requerir_roles("Administrador")),
):
    _id = oid(usuario_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de usuario inválido.")

    if usuario_id == admin["id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes eliminar tu propia cuenta.")

    resultado = await db.usuarios.delete_one({"_id": _id})
    if resultado.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")

    return {"success": True, "message": "Usuario eliminado correctamente."}
