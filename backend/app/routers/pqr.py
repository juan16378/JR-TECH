"""
PQR: Peticiones, Quejas y Reclamos, como un hilo de conversación (no un
único mensaje + una única respuesta): el cliente puede volver a escribir y
el equipo puede responder varias veces, todo en la misma PQR.

Cualquier usuario autenticado (Cliente, Empleado o Administrador) puede
radicar una PQR y consultar/responder las suyas. El Administrador/Empleado
tiene además una bandeja con todas las PQR (pensada para un tablero tipo
Kanban en el frontend: una columna por estado), para arrastrarlas entre
estados y responder cualquiera.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_db
from app.deps import requerir_roles
from app.models.common import oid
from app.models.pqr import ESTADOS_PQR, TIPOS_PQR, serializar_pqr
from app.models.usuario import serializar_usuario
from app.schemas.pqr import PQRCrear, PQREstadoActualizar, PQRMensajeCrear
from app.utils.email import enviar_correo_respuesta_pqr

router = APIRouter(prefix="/api/pqr", tags=["PQR"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_pqr(
    datos: PQRCrear,
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador")),
):
    if datos.tipo not in TIPOS_PQR:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"El tipo debe ser uno de {TIPOS_PQR}")

    ahora = datetime.now(timezone.utc)
    nombre_cliente = f"{usuario.get('nombre', '')} {usuario.get('apellido', '')}".strip()

    documento = {
        "usuarioId": oid(usuario["id"]),
        "tipo": datos.tipo,
        "asunto": datos.asunto,
        "estado": "Abierta",
        "mensajes": [
            {"autor": "cliente", "nombre": nombre_cliente, "texto": datos.mensaje, "fecha": ahora}
        ],
        "fecha": ahora,
        "fechaActualizacion": ahora,
    }
    resultado = await db.pqr.insert_one(documento)
    documento["_id"] = resultado.inserted_id

    return {"success": True, "message": "Tu PQR fue radicada correctamente.", "pqr": serializar_pqr(documento)}


@router.get("/mis")
async def listar_mis_pqr(
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador")),
):
    registros = await db.pqr.find({"usuarioId": oid(usuario["id"])}).sort("fechaActualizacion", -1).to_list(length=1000)
    return {"success": True, "pqr": [serializar_pqr(r) for r in registros]}


@router.get("")
async def listar_todas_las_pqr(
    tipo: str | None = None,
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    """Bandeja de PQR para el tablero Kanban del panel de administración/
    empleado, con los datos del usuario que la radicó ya incrustados. No
    filtra por estado: el frontend agrupa el resultado completo en las tres
    columnas (Abierta / En proceso / Cerrada)."""
    filtro = {}

    if tipo:
        if tipo not in TIPOS_PQR:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"El tipo debe ser uno de {TIPOS_PQR}")
        filtro["tipo"] = tipo

    registros = await db.pqr.find(filtro).sort("fechaActualizacion", -1).to_list(length=2000)

    resultado = []
    for registro in registros:
        registro_serializado = serializar_pqr(registro)
        usuario_doc = await db.usuarios.find_one({"_id": registro["usuarioId"]})
        registro_serializado["usuario"] = serializar_usuario(usuario_doc) if usuario_doc else None
        resultado.append(registro_serializado)

    return {"success": True, "pqr": resultado}


async def _obtener_pqr_o_404(pqr_id: str, db) -> dict:
    _id = oid(pqr_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de PQR inválido.")

    registro = await db.pqr.find_one({"_id": _id})
    if not registro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PQR no encontrada.")

    return registro


def _verificar_acceso(registro: dict, usuario: dict) -> None:
    if usuario["rol"] == "Cliente" and str(registro["usuarioId"]) != usuario["id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para ver esta PQR.")


async def _con_usuario(registro: dict, db) -> dict:
    registro_serializado = serializar_pqr(registro)
    usuario_doc = await db.usuarios.find_one({"_id": registro["usuarioId"]})
    registro_serializado["usuario"] = serializar_usuario(usuario_doc) if usuario_doc else None
    return registro_serializado


@router.get("/{pqr_id}")
async def obtener_pqr(
    pqr_id: str,
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador")),
):
    registro = await _obtener_pqr_o_404(pqr_id, db)
    _verificar_acceso(registro, usuario)
    return {"success": True, "pqr": await _con_usuario(registro, db)}


@router.patch("/{pqr_id}/estado")
async def cambiar_estado_pqr(
    pqr_id: str,
    datos: PQREstadoActualizar,
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    """Cambia el estado de una PQR — lo que dispara el tablero Kanban del
    frontend al soltar una tarjeta en otra columna."""
    if datos.estado not in ESTADOS_PQR:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"El estado debe ser uno de {ESTADOS_PQR}")

    registro = await _obtener_pqr_o_404(pqr_id, db)

    ahora = datetime.now(timezone.utc)
    await db.pqr.update_one(
        {"_id": registro["_id"]}, {"$set": {"estado": datos.estado, "fechaActualizacion": ahora}}
    )
    registro["estado"] = datos.estado
    registro["fechaActualizacion"] = ahora

    return {"success": True, "message": "Estado actualizado.", "pqr": await _con_usuario(registro, db)}


@router.post("/{pqr_id}/mensajes", status_code=status.HTTP_201_CREATED)
async def agregar_mensaje_pqr(
    pqr_id: str,
    datos: PQRMensajeCrear,
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador")),
):
    """Agrega un mensaje al hilo de la PQR. El autor ('cliente' o 'equipo')
    se determina por el rol de quien escribe, nunca lo elige el frontend.

    Una PQR 'Cerrada' ya no admite nuevos mensajes de nadie: hay que
    reabrirla explícitamente desde el tablero (arrastrando la tarjeta a otra
    columna) antes de poder seguir la conversación. Mientras está abierta o
    en proceso, el estado sí avanza automáticamente en el caso más común: si
    el equipo responde una PQR recién abierta, pasa a 'En proceso'."""
    registro = await _obtener_pqr_o_404(pqr_id, db)
    _verificar_acceso(registro, usuario)

    estado_actual = registro.get("estado", "Abierta")
    if estado_actual == "Cerrada":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Esta PQR está cerrada y ya no admite nuevos mensajes. Debe reabrirse desde el tablero para continuar la conversación.",
        )

    es_cliente = usuario["rol"] == "Cliente"
    autor = "cliente" if es_cliente else "equipo"
    nombre = f"{usuario.get('nombre', '')} {usuario.get('apellido', '')}".strip()
    ahora = datetime.now(timezone.utc)

    nuevo_mensaje = {"autor": autor, "nombre": nombre, "texto": datos.texto, "fecha": ahora}

    nuevo_estado = "En proceso" if (autor == "equipo" and estado_actual == "Abierta") else estado_actual

    # Los documentos viejos (antes del hilo de conversación) no tienen
    # 'mensajes' guardado como lista en Mongo todavía — serializar_pqr lo
    # arma al vuelo a partir de 'mensaje'/'respuesta', pero para poder usar
    # $push aquí hace falta que el campo exista de verdad en el documento.
    if "mensajes" not in registro or not isinstance(registro.get("mensajes"), list):
        mensajes_previos = serializar_pqr(dict(registro)).get("mensajes", [])
        await db.pqr.update_one({"_id": registro["_id"]}, {"$set": {"mensajes": mensajes_previos}})

    await db.pqr.update_one(
        {"_id": registro["_id"]},
        {
            "$push": {"mensajes": nuevo_mensaje},
            "$set": {"estado": nuevo_estado, "fechaActualizacion": ahora},
        },
    )

    # Si quien responde es del equipo (Empleado/Administrador), se le avisa
    # al cliente por correo que su PQR tiene una respuesta nueva. Si el
    # cliente es quien escribe, no aplica (el equipo ya ve el hilo en su
    # bandeja). Un fallo de correo no debe tumbar la respuesta ya guardada.
    if autor == "equipo":
        try:
            cliente_doc = await db.usuarios.find_one({"_id": registro["usuarioId"]})
            if cliente_doc and cliente_doc.get("correo"):
                nombre_cliente = f"{cliente_doc.get('nombre', '')} {cliente_doc.get('apellido', '')}".strip()
                enviar_correo_respuesta_pqr(
                    destinatario=cliente_doc["correo"],
                    nombre=nombre_cliente,
                    asunto_pqr=registro.get("asunto") or "tu PQR",
                    mensaje_respuesta=datos.texto,
                )
        except Exception as error:
            print(f"⚠️ No se pudo notificar la respuesta de la PQR por correo: {error}")

    registro = await db.pqr.find_one({"_id": registro["_id"]})
    return {"success": True, "message": "Mensaje enviado.", "pqr": await _con_usuario(registro, db)}
