"""
Facturas: a diferencia del comprobante que antes se generaba "al vuelo" a
partir de un pedido (ver app/routers/reportes.py), cada compra ahora también
queda guardada como su propio documento en la colección 'facturas' (ver
crear_pedido en app/routers/pedidos.py), con su número, estado
(Emitida/Anulada) y una copia de los totales al momento de la venta.

Este router permite buscar/consultar esas facturas y descargarlas en PDF o
Excel, reutilizando los mismos generadores que ya existían para el
comprobante de un pedido (funcionan igual porque una factura tiene la misma
forma que un pedido serializado: 'productos', 'subtotal', 'iva', 'total',
más un 'usuario' embebido).
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response

from app.db.mongodb import get_db
from app.deps import requerir_roles
from app.models.common import oid
from app.models.factura import ESTADOS_FACTURA, serializar_factura
from app.models.usuario import serializar_usuario
from app.utils.excel import generar_excel_comprobante
from app.utils.pdf import generar_pdf_comprobante

router = APIRouter(prefix="/api/facturas", tags=["Facturas"])


def _respuesta_pdf(contenido: bytes, nombre_archivo: str) -> Response:
    return Response(
        content=contenido,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


def _respuesta_excel(contenido: bytes, nombre_archivo: str) -> Response:
    return Response(
        content=contenido,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


async def _factura_serializada_con_usuario(factura: dict, db) -> dict:
    usuario_doc = await db.usuarios.find_one({"_id": factura["usuarioId"]})
    factura_serializada = serializar_factura(factura)
    factura_serializada["usuario"] = serializar_usuario(usuario_doc) if usuario_doc else None
    return factura_serializada


@router.get("")
async def listar_facturas(
    numero: str | None = Query(None),
    cliente: str | None = Query(None, description="Busca por nombre, apellido o correo del cliente"),
    estado: str | None = Query(None),
    desde: str | None = Query(None, description="Fecha inicial YYYY-MM-DD"),
    hasta: str | None = Query(None, description="Fecha final YYYY-MM-DD"),
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    """Consulta de facturas para el panel de administración/empleado, con
    filtros por número, cliente, estado y rango de fechas (punto de la guía:
    'consulta y búsqueda de facturas')."""
    filtro = {}

    if numero:
        filtro["numero"] = {"$regex": numero.strip(), "$options": "i"}

    if estado:
        if estado not in ESTADOS_FACTURA:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"El estado debe ser uno de {ESTADOS_FACTURA}")
        filtro["estado"] = estado

    rango_fecha = {}
    if desde:
        try:
            rango_fecha["$gte"] = datetime.fromisoformat(desde).replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "La fecha 'desde' no es válida.")
    if hasta:
        try:
            rango_fecha["$lte"] = datetime.fromisoformat(hasta).replace(tzinfo=timezone.utc) + timedelta(days=1)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "La fecha 'hasta' no es válida.")
    if rango_fecha:
        filtro["fecha"] = rango_fecha

    facturas = await db.facturas.find(filtro).sort("fecha", -1).to_list(length=2000)

    resultado = []
    for factura in facturas:
        factura_serializada = await _factura_serializada_con_usuario(factura, db)

        if cliente:
            texto = cliente.strip().lower()
            usuario = factura_serializada.get("usuario") or {}
            coincide = (
                texto in (usuario.get("nombre") or "").lower()
                or texto in (usuario.get("apellido") or "").lower()
                or texto in (usuario.get("correo") or "").lower()
            )
            if not coincide:
                continue

        resultado.append(factura_serializada)

    return {"success": True, "facturas": resultado}


@router.get("/mis")
async def listar_mis_facturas(
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador")),
):
    """Historial de facturas del usuario autenticado."""
    facturas = await db.facturas.find({"usuarioId": oid(usuario["id"])}).sort("fecha", -1).to_list(length=1000)
    return {"success": True, "facturas": [serializar_factura(f) for f in facturas]}


async def _obtener_factura_para(factura_id: str, db, usuario: dict) -> dict:
    _id = oid(factura_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de factura inválido.")

    factura = await db.facturas.find_one({"_id": _id})
    if not factura:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Factura no encontrada.")

    if usuario["rol"] == "Cliente" and str(factura["usuarioId"]) != usuario["id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para ver esta factura.")

    return await _factura_serializada_con_usuario(factura, db)


@router.get("/{factura_id}")
async def obtener_factura(
    factura_id: str,
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Administrador", "Empleado", "Cliente")),
):
    factura_serializada = await _obtener_factura_para(factura_id, db, usuario)
    return {"success": True, "factura": factura_serializada}


@router.get("/{factura_id}/pdf")
async def factura_pdf(
    factura_id: str,
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Administrador", "Empleado", "Cliente")),
):
    factura_serializada = await _obtener_factura_para(factura_id, db, usuario)
    pdf = generar_pdf_comprobante(factura_serializada)
    nombre = factura_serializada.get("numero") or factura_serializada["id"][-8:].upper()
    return _respuesta_pdf(pdf, f"factura_{nombre}.pdf")


@router.get("/{factura_id}/excel")
async def factura_excel(
    factura_id: str,
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Administrador", "Empleado", "Cliente")),
):
    factura_serializada = await _obtener_factura_para(factura_id, db, usuario)
    excel = generar_excel_comprobante(factura_serializada)
    nombre = factura_serializada.get("numero") or factura_serializada["id"][-8:].upper()
    return _respuesta_excel(excel, f"factura_{nombre}.xlsx")


@router.patch("/{factura_id}/anular")
async def anular_factura(
    factura_id: str,
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    """Anula una factura y, para mantener la facturación y el cumplimiento
    del pedido sincronizados, cancela también el pedido asociado (si sigue
    activo)."""
    _id = oid(factura_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de factura inválido.")

    factura = await db.facturas.find_one({"_id": _id})
    if not factura:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Factura no encontrada.")

    if factura.get("estado") == "Anulada":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Esta factura ya está anulada.")

    await db.facturas.update_one({"_id": _id}, {"$set": {"estado": "Anulada"}})

    if factura.get("pedidoId"):
        pedido = await db.pedidos.find_one({"_id": factura["pedidoId"]})
        if pedido and pedido.get("estado") != "Cancelado":
            await db.pedidos.update_one({"_id": factura["pedidoId"]}, {"$set": {"estado": "Cancelado"}})

    factura["estado"] = "Anulada"
    factura_serializada = await _factura_serializada_con_usuario(factura, db)
    return {"success": True, "message": "Factura anulada correctamente.", "factura": factura_serializada}
