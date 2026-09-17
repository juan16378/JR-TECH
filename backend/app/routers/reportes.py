"""
Reportes en PDF: pedidos/ventas, inventario de productos, usuarios y el
comprobante de un pedido individual.

Todos los endpoints devuelven directamente el PDF (application/pdf) con
Content-Disposition: attachment, para que el navegador lo descargue. La
generación del archivo vive en app/utils/pdf.py; aquí solo se arman los
datos (consultas a Mongo) y se aplican los filtros de la URL.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from reportlab.lib.units import cm

from app.db.mongodb import get_db
from app.deps import requerir_roles
from app.models.common import oid
from app.models.factura import ESTADOS_FACTURA
from app.models.pedido import ESTADOS_PEDIDO, serializar_pedido
from app.models.usuario import ROLES_VALIDOS, serializar_usuario
from app.utils.excel import generar_excel_comprobante
from app.utils.pdf import (
    formatear_fecha,
    formatear_moneda,
    generar_pdf_comprobante,
    generar_pdf_reporte,
)

router = APIRouter(prefix="/api/reportes", tags=["Reportes"])


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


# ==========================================
# REPORTE: PEDIDOS / VENTAS
# ==========================================

@router.get("/pedidos/pdf")
async def reporte_pedidos_pdf(
    desde: str | None = Query(None, description="Fecha inicial YYYY-MM-DD"),
    hasta: str | None = Query(None, description="Fecha final YYYY-MM-DD"),
    estado: str | None = Query(None),
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    filtro = {}

    if estado:
        if estado not in ESTADOS_PEDIDO:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"El estado debe ser uno de {ESTADOS_PEDIDO}"
            )
        filtro["estado"] = estado

    rango_fecha = {}
    if desde:
        try:
            rango_fecha["$gte"] = datetime.fromisoformat(desde).replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "La fecha 'desde' no es válida.")
    if hasta:
        try:
            rango_fecha["$lte"] = datetime.fromisoformat(hasta).replace(
                tzinfo=timezone.utc
            ) + timedelta(days=1)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "La fecha 'hasta' no es válida.")
    if rango_fecha:
        filtro["fecha"] = rango_fecha

    pedidos = await db.pedidos.find(filtro).sort("fecha", -1).to_list(length=2000)

    filas = []
    total_ingresos = 0.0
    for pedido in pedidos:
        usuario_doc = await db.usuarios.find_one({"_id": pedido["usuarioId"]})
        nombre_cliente = (
            f"{usuario_doc.get('nombre', '')} {usuario_doc.get('apellido', '')}".strip()
            if usuario_doc
            else "Usuario eliminado"
        )
        total_ingresos += float(pedido.get("total", 0) or 0)
        filas.append(
            [
                f"#{str(pedido['_id'])[-8:].upper()}",
                nombre_cliente,
                formatear_fecha(pedido.get("fecha")),
                pedido.get("estado", "—"),
                formatear_moneda(pedido.get("total")),
            ]
        )

    resumen = [
        ("Pedidos", len(pedidos)),
        ("Ingresos", formatear_moneda(total_ingresos)),
        ("Entregados", sum(1 for p in pedidos if p.get("estado") == "Entregado")),
        ("Pendientes", sum(1 for p in pedidos if p.get("estado") == "Pendiente")),
    ]

    filtros_texto = []
    if desde or hasta:
        filtros_texto.append(f"Del {desde or '…'} al {hasta or '…'}")
    if estado:
        filtros_texto.append(f"Estado: {estado}")
    subtitulo = " · ".join(filtros_texto) if filtros_texto else "Todos los pedidos"

    pdf = generar_pdf_reporte(
        titulo="Reporte de pedidos",
        subtitulo=subtitulo,
        resumen=resumen,
        encabezados=["Pedido", "Cliente", "Fecha", "Estado", "Total"],
        filas=filas,
        anchos=[2.3 * cm, 5 * cm, 3.7 * cm, 3 * cm, 3 * cm],
    )

    return _respuesta_pdf(pdf, "reporte_pedidos.pdf")


# ==========================================
# REPORTE: VENTAS (a partir de las facturas, el registro real de cada
# venta —incluye el descuento aplicado y la mezcla de productos/servicios—,
# a diferencia del reporte de pedidos de arriba). Pensado como reporte
# DIARIO: si no se pasan fechas, se genera para el día de hoy; también
# admite un rango más amplio si se indican 'desde'/'hasta' explícitos.
# ==========================================

@router.get("/ventas/pdf")
async def reporte_ventas_pdf(
    desde: str | None = Query(None, description="Fecha inicial YYYY-MM-DD (por defecto, hoy)"),
    hasta: str | None = Query(None, description="Fecha final YYYY-MM-DD (por defecto, hoy)"),
    estado: str | None = Query(None),
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    if estado and estado not in ESTADOS_FACTURA:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"El estado debe ser uno de {ESTADOS_FACTURA}")

    hoy = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    desde = desde or hoy
    hasta = hasta or hoy

    try:
        fecha_desde = datetime.fromisoformat(desde).replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La fecha 'desde' no es válida.")
    try:
        fecha_hasta = datetime.fromisoformat(hasta).replace(tzinfo=timezone.utc) + timedelta(days=1)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La fecha 'hasta' no es válida.")

    filtro = {"fecha": {"$gte": fecha_desde, "$lt": fecha_hasta}}
    if estado:
        filtro["estado"] = estado

    facturas = await db.facturas.find(filtro).sort("fecha", 1).to_list(length=5000)

    filas = []
    total_facturado = 0.0
    total_descuento = 0.0
    unidades_vendidas = 0
    for factura in facturas:
        usuario_doc = await db.usuarios.find_one({"_id": factura["usuarioId"]})
        nombre_cliente = (
            f"{usuario_doc.get('nombre', '')} {usuario_doc.get('apellido', '')}".strip()
            if usuario_doc
            else "Usuario eliminado"
        )
        items = factura.get("productos", []) or []
        num_items = sum(int(item.get("cantidad") or 0) for item in items)

        # Las anuladas se muestran en el detalle (para que quede constancia
        # de que existieron) pero no cuentan en los totales del resumen.
        if factura.get("estado") != "Anulada":
            total_facturado += float(factura.get("total", 0) or 0)
            total_descuento += float(factura.get("descuento", 0) or 0)
            unidades_vendidas += num_items

        filas.append(
            [
                factura.get("numero") or f"#{str(factura['_id'])[-8:].upper()}",
                nombre_cliente,
                formatear_fecha(factura.get("fecha")),
                f"{num_items} ítem(s)",
                formatear_moneda(factura.get("descuento")) if factura.get("descuento") else "—",
                formatear_moneda(factura.get("total")),
                factura.get("estado", "—"),
            ]
        )

    resumen = [
        ("Ventas", formatear_moneda(total_facturado)),
        ("Facturas", len(facturas)),
        ("Unidades vendidas", unidades_vendidas),
        ("Descuentos otorgados", formatear_moneda(total_descuento)),
    ]

    es_un_solo_dia = desde == hasta
    titulo = "Reporte diario de ventas" if es_un_solo_dia else "Reporte de ventas"

    filtros_texto = [
        formatear_fecha(fecha_desde, con_hora=False) if es_un_solo_dia else f"Del {desde} al {hasta}"
    ]
    if estado:
        filtros_texto.append(f"Estado: {estado}")
    subtitulo = " · ".join(filtros_texto)

    pdf = generar_pdf_reporte(
        titulo=titulo,
        subtitulo=subtitulo,
        resumen=resumen,
        encabezados=["Factura", "Cliente", "Fecha", "Ítems", "Descuento", "Total", "Estado"],
        filas=filas,
        anchos=[2.4 * cm, 3.8 * cm, 3 * cm, 1.8 * cm, 2.2 * cm, 2.4 * cm, 2.2 * cm],
        nota_vacio="No se registraron ventas en el periodo seleccionado.",
    )

    nombre_archivo = (
        f"reporte_ventas_{desde}.pdf" if es_un_solo_dia else f"reporte_ventas_{desde}_a_{hasta}.pdf"
    )
    return _respuesta_pdf(pdf, nombre_archivo)


# ==========================================
# REPORTE: INVENTARIO DE PRODUCTOS
# ==========================================

@router.get("/productos/pdf")
async def reporte_productos_pdf(
    estado: str | None = Query(None),
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    filtro = {}
    if estado:
        if estado not in ("Activo", "Inactivo"):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "El estado debe ser 'Activo' o 'Inactivo'."
            )
        filtro["estado"] = estado

    productos = await db.productos.find(filtro).sort("nombre", 1).to_list(length=2000)

    filas = []
    for p in productos:
        filas.append(
            [
                p.get("nombre", "—"),
                p.get("categoria", "—"),
                formatear_moneda(p.get("precio")),
                str(p.get("stock", "—")),
                p.get("estado", "—"),
            ]
        )

    activos = sum(1 for p in productos if p.get("estado") == "Activo")
    stock_bajo = sum(
        1 for p in productos if isinstance(p.get("stock"), (int, float)) and p.get("stock") <= 5
    )

    resumen = [
        ("Productos", len(productos)),
        ("Activos", activos),
        ("Inactivos", len(productos) - activos),
        ("Stock bajo (≤5)", stock_bajo),
    ]

    subtitulo = f"Estado: {estado}" if estado else "Catálogo completo"

    pdf = generar_pdf_reporte(
        titulo="Reporte de inventario",
        subtitulo=subtitulo,
        resumen=resumen,
        encabezados=["Producto", "Categoría", "Precio", "Stock", "Estado"],
        filas=filas,
        anchos=[5.5 * cm, 3.5 * cm, 3 * cm, 2 * cm, 3 * cm],
    )

    return _respuesta_pdf(pdf, "reporte_inventario.pdf")


# ==========================================
# REPORTE: USUARIOS
# ==========================================

@router.get("/usuarios/pdf")
async def reporte_usuarios_pdf(
    rol: str | None = Query(None),
    db=Depends(get_db),
    _admin: dict = Depends(requerir_roles("Administrador")),
):
    filtro = {}
    if rol:
        if rol not in ROLES_VALIDOS:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"El rol debe ser uno de {ROLES_VALIDOS}"
            )
        filtro["rol"] = rol

    usuarios = await db.usuarios.find(filtro).sort("createdAt", -1).to_list(length=2000)

    filas = []
    for u in usuarios:
        filas.append(
            [
                f"{u.get('nombre', '')} {u.get('apellido', '')}".strip(),
                u.get("correo", "—"),
                f"{u.get('tipoDocumento', '')} {u.get('numeroDocumento', '')}".strip(),
                u.get("rol", "—"),
                u.get("estado", "—"),
            ]
        )

    resumen = [
        ("Usuarios", len(usuarios)),
        ("Administradores", sum(1 for u in usuarios if u.get("rol") == "Administrador")),
        ("Empleados", sum(1 for u in usuarios if u.get("rol") == "Empleado")),
        ("Clientes", sum(1 for u in usuarios if u.get("rol") == "Cliente")),
    ]

    subtitulo = f"Rol: {rol}" if rol else "Todos los roles"

    pdf = generar_pdf_reporte(
        titulo="Reporte de usuarios",
        subtitulo=subtitulo,
        resumen=resumen,
        encabezados=["Usuario", "Correo", "Documento", "Rol", "Estado"],
        filas=filas,
        anchos=[4 * cm, 5 * cm, 3.2 * cm, 2.8 * cm, 2 * cm],
    )

    return _respuesta_pdf(pdf, "reporte_usuarios.pdf")


# ==========================================
# MI HISTORIAL DE COMPRAS (reporte personal, cualquier rol autenticado)
# ==========================================

@router.get("/mis-pedidos/pdf")
async def mi_historial_pdf(
    desde: str | None = Query(None, description="Fecha inicial YYYY-MM-DD"),
    hasta: str | None = Query(None, description="Fecha final YYYY-MM-DD"),
    estado: str | None = Query(None),
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Cliente", "Empleado", "Administrador")),
):
    filtro = {"usuarioId": oid(usuario["id"])}

    if estado:
        if estado not in ESTADOS_PEDIDO:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"El estado debe ser uno de {ESTADOS_PEDIDO}"
            )
        filtro["estado"] = estado

    rango_fecha = {}
    if desde:
        try:
            rango_fecha["$gte"] = datetime.fromisoformat(desde).replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "La fecha 'desde' no es válida.")
    if hasta:
        try:
            rango_fecha["$lte"] = datetime.fromisoformat(hasta).replace(
                tzinfo=timezone.utc
            ) + timedelta(days=1)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "La fecha 'hasta' no es válida.")
    if rango_fecha:
        filtro["fecha"] = rango_fecha

    pedidos = await db.pedidos.find(filtro).sort("fecha", -1).to_list(length=2000)

    filas = []
    total_gastado = 0.0
    for pedido in pedidos:
        if pedido.get("estado") != "Cancelado":
            total_gastado += float(pedido.get("total", 0) or 0)
        filas.append(
            [
                f"#{str(pedido['_id'])[-8:].upper()}",
                formatear_fecha(pedido.get("fecha")),
                f"{len(pedido.get('productos', []))} producto(s)",
                pedido.get("estado", "—"),
                formatear_moneda(pedido.get("total")),
            ]
        )

    resumen = [
        ("Compras", len(pedidos)),
        ("Total gastado", formatear_moneda(total_gastado)),
        ("Entregados", sum(1 for p in pedidos if p.get("estado") == "Entregado")),
        (
            "Activos",
            sum(1 for p in pedidos if p.get("estado") not in ("Entregado", "Cancelado")),
        ),
    ]

    filtros_texto = []
    if desde or hasta:
        filtros_texto.append(f"Del {desde or '…'} al {hasta or '…'}")
    if estado:
        filtros_texto.append(f"Estado: {estado}")
    nombre_completo = f"{usuario.get('nombre', '')} {usuario.get('apellido', '')}".strip()
    partes_subtitulo = [nombre_completo] + filtros_texto if filtros_texto else [nombre_completo, "Todas tus compras"]
    subtitulo = " · ".join(p for p in partes_subtitulo if p)

    pdf = generar_pdf_reporte(
        titulo="Mi historial de compras",
        subtitulo=subtitulo,
        resumen=resumen,
        encabezados=["Pedido", "Fecha", "Contenido", "Estado", "Total"],
        filas=filas,
        anchos=[2.3 * cm, 3.5 * cm, 4 * cm, 3.2 * cm, 3 * cm],
        nota_vacio="Todavía no tienes compras registradas.",
    )

    return _respuesta_pdf(pdf, "mi_historial_de_compras.pdf")


# ==========================================
# COMPROBANTE DE UN PEDIDO INDIVIDUAL
# ==========================================

async def _obtener_pedido_para_comprobante(pedido_id: str, db, usuario: dict) -> dict:
    """Busca el pedido y arma el mismo diccionario serializado (con los
    datos del cliente ya incrustados) que consumen tanto el comprobante en
    PDF como el de Excel. También aplica el mismo control de permisos: un
    cliente solo puede ver SU PROPIO pedido; administradores y empleados
    pueden ver cualquiera."""
    _id = oid(pedido_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de pedido inválido.")

    pedido = await db.pedidos.find_one({"_id": _id})
    if not pedido:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido no encontrado.")

    if usuario["rol"] == "Cliente" and str(pedido["usuarioId"]) != usuario["id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para ver este pedido.")

    usuario_doc = await db.usuarios.find_one({"_id": pedido["usuarioId"]})
    pedido_serializado = serializar_pedido(pedido)
    pedido_serializado["usuario"] = serializar_usuario(usuario_doc) if usuario_doc else None
    return pedido_serializado


@router.get("/pedidos/{pedido_id}/pdf")
async def comprobante_pedido_pdf(
    pedido_id: str,
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Administrador", "Empleado", "Cliente")),
):
    pedido_serializado = await _obtener_pedido_para_comprobante(pedido_id, db, usuario)

    pdf = generar_pdf_comprobante(pedido_serializado)
    numero = pedido_serializado["id"][-8:].upper()

    return _respuesta_pdf(pdf, f"comprobante_{numero}.pdf")


@router.get("/pedidos/{pedido_id}/excel")
async def comprobante_pedido_excel(
    pedido_id: str,
    db=Depends(get_db),
    usuario: dict = Depends(requerir_roles("Administrador", "Empleado", "Cliente")),
):
    pedido_serializado = await _obtener_pedido_para_comprobante(pedido_id, db, usuario)

    excel = generar_excel_comprobante(pedido_serializado)
    numero = pedido_serializado["id"][-8:].upper()

    return _respuesta_excel(excel, f"comprobante_{numero}.xlsx")
