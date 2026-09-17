from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_db
from app.deps import requerir_roles
from app.models.common import oid
from app.models.servicio import serializar_servicio
from app.schemas.servicio import ServicioActualizar, ServicioCrear

router = APIRouter(prefix="/api/servicios", tags=["Servicios"])


@router.get("")
async def listar_servicios(db=Depends(get_db)):
    servicios = await db.servicios.find().sort("nombre", 1).to_list(length=1000)
    return {"success": True, "servicios": [serializar_servicio(s) for s in servicios]}


@router.get("/{servicio_id}")
async def obtener_servicio(servicio_id: str, db=Depends(get_db)):
    _id = oid(servicio_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de servicio inválido.")

    servicio = await db.servicios.find_one({"_id": _id})
    if not servicio:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado.")

    return {"success": True, "servicio": serializar_servicio(servicio)}


@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_servicio(
    datos: ServicioCrear,
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    documento = datos.model_dump()
    documento["estado"] = "Activo"

    resultado = await db.servicios.insert_one(documento)
    documento["_id"] = resultado.inserted_id

    return {"success": True, "message": "Servicio creado correctamente.", "servicio": serializar_servicio(documento)}


@router.put("/{servicio_id}")
async def actualizar_servicio(
    servicio_id: str,
    datos: ServicioActualizar,
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    _id = oid(servicio_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de servicio inválido.")

    cambios = {k: v for k, v in datos.model_dump().items() if v is not None}
    if not cambios:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No se enviaron campos para actualizar.")

    resultado = await db.servicios.update_one({"_id": _id}, {"$set": cambios})
    if resultado.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado.")

    servicio = await db.servicios.find_one({"_id": _id})
    return {"success": True, "message": "Servicio actualizado correctamente.", "servicio": serializar_servicio(servicio)}


@router.patch("/{servicio_id}/estado")
async def cambiar_estado_servicio(
    servicio_id: str,
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    _id = oid(servicio_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de servicio inválido.")

    servicio = await db.servicios.find_one({"_id": _id})
    if not servicio:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado.")

    nuevo_estado = "Inactivo" if servicio.get("estado") == "Activo" else "Activo"
    await db.servicios.update_one({"_id": _id}, {"$set": {"estado": nuevo_estado}})

    servicio["estado"] = nuevo_estado
    return {"success": True, "message": f"Servicio marcado como {nuevo_estado}.", "servicio": serializar_servicio(servicio)}


@router.delete("/{servicio_id}")
async def eliminar_servicio(
    servicio_id: str,
    db=Depends(get_db),
    _admin: dict = Depends(requerir_roles("Administrador")),
):
    _id = oid(servicio_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de servicio inválido.")

    resultado = await db.servicios.delete_one({"_id": _id})
    if resultado.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado.")

    return {"success": True, "message": "Servicio eliminado correctamente."}
