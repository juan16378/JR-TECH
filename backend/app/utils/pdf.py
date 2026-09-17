"""
Utilidades para generar reportes en PDF.

Se usa ReportLab (en vez de, por ejemplo, WeasyPrint) porque es una librería
100% Python: no requiere instalar dependencias de sistema (GTK/Pango/Cairo),
lo cual suele ser un dolor de cabeza en Windows. Con `pip install reportlab`
es suficiente.

Este módulo define dos "constructores" de PDF reutilizables:
  - generar_pdf_reporte(...): reportes tabulares (pedidos, inventario,
    usuarios) con una fila de tarjetas de resumen arriba de la tabla.
  - generar_pdf_comprobante(...): comprobante de un pedido individual,
    con formato de factura.

Los routers en app/routers/reportes.py arman los datos (consultando Mongo)
y llaman a estas funciones solo para "dibujar" el PDF.
"""

from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ==========================================
# DATOS DE LA EMPRESA (membrete de factura)
# ==========================================
# Mismos datos de contacto usados en el resto del sitio (footer, botón de
# WhatsApp) para que el PDF sea coherente con la página.

NOMBRE_EMPRESA = "JR TECH STORE"
ESLOGAN_EMPRESA = "Tecnología · Innovación · Calidad"
NIT_EMPRESA = "901.234.567-8"
REGIMEN_EMPRESA = "Régimen: Responsable de IVA"
DIRECCION_EMPRESA = "Cra. 45 #26-85, Bogotá D.C., Colombia"
TELEFONO_EMPRESA = "+57 300 123 4567"
CORREO_EMPRESA = "contacto@jrtech.com"
WEB_EMPRESA = "www.jrtech.com"

RUTA_LOGO = Path(__file__).resolve().parent.parent / "assets" / "logo.png"

# ==========================================
# PALETA (coherente con el tema oscuro cian/azul del sitio,
# adaptada a un documento imprimible sobre fondo blanco)
# ==========================================

NAVY = colors.HexColor("#0b1120")
CYAN = colors.HexColor("#0891b2")
SLATE = colors.HexColor("#475569")
SLATE_CLARO = colors.HexColor("#f1f5f9")
BORDE = colors.HexColor("#e2e8f0")
TEXTO = colors.HexColor("#0f172a")
BLANCO = colors.white

_stylesheet = getSampleStyleSheet()

ESTILO_MARCA = ParagraphStyle(
    "Marca",
    parent=_stylesheet["Normal"],
    fontName="Helvetica-Bold",
    fontSize=11,
    textColor=CYAN,
    spaceAfter=4,
)

ESTILO_EMPRESA_NOMBRE = ParagraphStyle(
    "EmpresaNombre",
    parent=_stylesheet["Normal"],
    fontName="Helvetica-Bold",
    fontSize=14,
    textColor=NAVY,
    spaceAfter=1,
)

ESTILO_EMPRESA_ESLOGAN = ParagraphStyle(
    "EmpresaEslogan",
    parent=_stylesheet["Normal"],
    fontName="Helvetica-Oblique",
    fontSize=8,
    textColor=CYAN,
    spaceAfter=4,
)

ESTILO_EMPRESA_DATO = ParagraphStyle(
    "EmpresaDato",
    parent=_stylesheet["Normal"],
    fontName="Helvetica",
    fontSize=7.8,
    textColor=SLATE,
    leading=10.5,
)

ESTILO_TITULO = ParagraphStyle(
    "TituloReporte",
    parent=_stylesheet["Heading1"],
    fontName="Helvetica-Bold",
    fontSize=18,
    textColor=NAVY,
    spaceAfter=2,
)

ESTILO_SUBTITULO = ParagraphStyle(
    "SubtituloReporte",
    parent=_stylesheet["Normal"],
    fontName="Helvetica",
    fontSize=9.5,
    textColor=SLATE,
)

ESTILO_SECCION = ParagraphStyle(
    "Seccion",
    parent=_stylesheet["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=11,
    textColor=NAVY,
    spaceBefore=4,
    spaceAfter=8,
)

ESTILO_CELDA = ParagraphStyle(
    "Celda",
    parent=_stylesheet["Normal"],
    fontName="Helvetica",
    fontSize=8.5,
    textColor=TEXTO,
    leading=11,
)

ESTILO_CELDA_HEADER = ParagraphStyle(
    "CeldaHeader",
    parent=_stylesheet["Normal"],
    fontName="Helvetica-Bold",
    fontSize=8.5,
    textColor=BLANCO,
)

ESTILO_STAT_ETIQUETA = ParagraphStyle(
    "StatEtiqueta",
    parent=_stylesheet["Normal"],
    fontName="Helvetica-Bold",
    fontSize=7.5,
    textColor=SLATE,
)

ESTILO_STAT_VALOR = ParagraphStyle(
    "StatValor",
    parent=_stylesheet["Normal"],
    fontName="Helvetica-Bold",
    fontSize=15,
    textColor=NAVY,
    spaceBefore=2,
)


# ==========================================
# FORMATEADORES (equivalentes a los del frontend)
# ==========================================

def formatear_moneda(valor) -> str:
    if valor is None:
        return "—"
    try:
        return "$ " + f"{float(valor):,.0f}".replace(",", ".")
    except (TypeError, ValueError):
        return f"${valor}"


def formatear_fecha(fecha, con_hora: bool = True) -> str:
    if not fecha:
        return "—"
    if isinstance(fecha, str):
        try:
            fecha = datetime.fromisoformat(fecha.replace("Z", "+00:00"))
        except ValueError:
            return fecha
    patron = "%d/%m/%Y %H:%M" if con_hora else "%d/%m/%Y"
    try:
        return fecha.strftime(patron)
    except (TypeError, ValueError):
        return "—"


# ==========================================
# MEMBRETE (logo + datos de la empresa, arriba de cada PDF)
# ==========================================

def _membrete(nit: str | None = None):
    """Tabla con el logo a la izquierda y los datos fiscales/de contacto
    de la empresa a la derecha. `nit` permite mostrar un texto distinto en
    ese campo (por ejemplo, incluir el régimen tributario en la factura)."""

    info_empresa = [
        Paragraph(NOMBRE_EMPRESA, ESTILO_EMPRESA_NOMBRE),
        Paragraph(ESLOGAN_EMPRESA, ESTILO_EMPRESA_ESLOGAN),
        Paragraph(f"NIT {nit or NIT_EMPRESA}", ESTILO_EMPRESA_DATO),
        Paragraph(DIRECCION_EMPRESA, ESTILO_EMPRESA_DATO),
        Paragraph(f"{TELEFONO_EMPRESA}  ·  {CORREO_EMPRESA}  ·  {WEB_EMPRESA}", ESTILO_EMPRESA_DATO),
    ]

    if RUTA_LOGO.exists():
        logo = Image(str(RUTA_LOGO), width=2.1 * cm, height=2.1 * cm)
        filas = [[logo, info_empresa]]
        anchos = [2.6 * cm, 15.9 * cm]
    else:
        # Si por alguna razón el archivo del logo no está disponible, el
        # membrete se sigue mostrando (solo sin la imagen) en vez de romper
        # la generación del PDF.
        filas = [[info_empresa]]
        anchos = [18.5 * cm]

    tabla = Table(filas, colWidths=anchos)
    tabla.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return tabla


def _linea_membrete():
    return HRFlowable(width="100%", thickness=0.8, color=BORDE, spaceBefore=10, spaceAfter=14)


# ==========================================
# PIE DE PÁGINA (número de página + fecha de generación)
# ==========================================

def _pie_de_pagina(titulo_reporte: str):
    def dibujar(canvas, doc):
        canvas.saveState()
        ancho, _alto = A4

        canvas.setStrokeColor(BORDE)
        canvas.setLineWidth(0.6)
        canvas.line(1.5 * cm, 1.35 * cm, ancho - 1.5 * cm, 1.35 * cm)

        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(SLATE)
        generado = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
        canvas.drawString(
            1.5 * cm, 1.0 * cm,
            f"{NOMBRE_EMPRESA} · {titulo_reporte} · Generado el {generado}",
        )
        canvas.drawRightString(ancho - 1.5 * cm, 1.0 * cm, f"Página {doc.page}")

        canvas.restoreState()

    return dibujar


# ==========================================
# TARJETAS DE RESUMEN (fila de estadísticas)
# ==========================================

def _tabla_resumen(items):
    """items: lista de tuplas (etiqueta, valor)."""
    if not items:
        return None

    celdas = []
    for etiqueta, valor in items:
        celdas.append(
            Table(
                [
                    [Paragraph(str(etiqueta).upper(), ESTILO_STAT_ETIQUETA)],
                    [Paragraph(str(valor), ESTILO_STAT_VALOR)],
                ],
                colWidths=[4.2 * cm],
                style=TableStyle(
                    [
                        ("BOX", (0, 0), (-1, -1), 0.7, BORDE),
                        ("BACKGROUND", (0, 0), (-1, -1), SLATE_CLARO),
                        ("LEFTPADDING", (0, 0), (-1, -1), 10),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                        ("TOPPADDING", (0, 0), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                    ]
                ),
            )
        )

    fila = Table([celdas], hAlign="LEFT")
    fila.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return fila


# ==========================================
# TABLA DE DATOS (encabezado oscuro + filas en cebra)
# ==========================================

def _tabla_datos(encabezados, filas, anchos=None):
    data = [[Paragraph(h, ESTILO_CELDA_HEADER) for h in encabezados]]
    for fila in filas:
        data.append(
            [
                celda if isinstance(celda, Paragraph) else Paragraph(str(celda), ESTILO_CELDA)
                for celda in fila
            ]
        )

    tabla = Table(data, colWidths=anchos, repeatRows=1)

    estilo = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), BLANCO),
        ("LINEBELOW", (0, 0), (-1, 0), 0.8, NAVY),
        ("GRID", (0, 1), (-1, -1), 0.4, BORDE),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            estilo.append(("BACKGROUND", (0, i), (-1, i), SLATE_CLARO))
    tabla.setStyle(TableStyle(estilo))
    return tabla


# ==========================================
# REPORTE TABULAR GENÉRICO
# ==========================================

def generar_pdf_reporte(
    titulo: str,
    subtitulo: str,
    resumen,
    encabezados,
    filas,
    anchos=None,
    nota_vacio="No hay datos para los filtros seleccionados.",
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=1.6 * cm,
        bottomMargin=1.8 * cm,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        title=titulo,
    )

    elementos = [
        _membrete(),
        _linea_membrete(),
        Paragraph(titulo, ESTILO_TITULO),
        Paragraph(subtitulo, ESTILO_SUBTITULO),
        Spacer(1, 14),
    ]

    tabla_stats = _tabla_resumen(resumen)
    if tabla_stats:
        elementos.append(tabla_stats)
        elementos.append(Spacer(1, 18))

    if filas:
        elementos.append(_tabla_datos(encabezados, filas, anchos))
    else:
        elementos.append(Paragraph(nota_vacio, ESTILO_SUBTITULO))

    pie = _pie_de_pagina(titulo)
    doc.build(elementos, onFirstPage=pie, onLaterPages=pie)
    return buffer.getvalue()


# ==========================================
# TOTALES DE LA FACTURA (Subtotal + IVA + Total)
# ==========================================

def lineas_totales_pedido(pedido: dict) -> list[tuple[str, str]]:
    """Filas del bloque de totales de la factura: Subtotal, Descuento (si
    aplica), IVA (si el pedido los tiene guardados) y siempre el TOTAL.

    Los pedidos hechos antes de que la tienda empezara a cobrar IVA no
    tienen los campos 'subtotal'/'iva' guardados, así que para esos solo se
    muestra el total tal como se cobró, sin inventar un desglose que nunca
    se le cobró al cliente. Se usa tanto en el PDF como en el Excel para
    que ambos formatos muestren exactamente lo mismo.
    """
    filas = []
    if pedido.get("subtotal") is not None and pedido.get("iva") is not None:
        porcentaje = pedido.get("ivaPorcentaje")
        etiqueta_iva = f"IVA ({porcentaje * 100:.0f}%)" if porcentaje is not None else "IVA"
        filas.append(("Subtotal", formatear_moneda(pedido.get("subtotal"))))

        descuento = pedido.get("descuento")
        if descuento:
            porcentaje_descuento = pedido.get("descuentoPorcentaje")
            etiqueta_descuento = (
                f"Descuento ({porcentaje_descuento:.0f}%)" if porcentaje_descuento else "Descuento"
            )
            filas.append((etiqueta_descuento, f"-{formatear_moneda(descuento)}"))

        filas.append((etiqueta_iva, formatear_moneda(pedido.get("iva"))))
    filas.append(("TOTAL", formatear_moneda(pedido.get("total"))))
    return filas


def _tabla_totales(pedido: dict):
    filas = lineas_totales_pedido(pedido)
    data = [["", etiqueta, valor] for etiqueta, valor in filas]
    ultima_fila = len(data) - 1

    tabla = Table(data, colWidths=[9.5 * cm, 3 * cm, 3 * cm])
    tabla.setStyle(
        TableStyle(
            [
                ("FONTNAME", (1, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (1, 0), (-1, -1), 9.5),
                ("TEXTCOLOR", (1, 0), (-1, -1), SLATE),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                # La fila del TOTAL se resalta igual que antes.
                ("FONTNAME", (1, ultima_fila), (-1, ultima_fila), "Helvetica-Bold"),
                ("FONTSIZE", (1, ultima_fila), (-1, ultima_fila), 13),
                ("TEXTCOLOR", (1, ultima_fila), (-1, ultima_fila), NAVY),
                ("LINEABOVE", (1, ultima_fila), (-1, ultima_fila), 0.8, NAVY),
                ("TOPPADDING", (0, ultima_fila), (-1, ultima_fila), 8),
            ]
        )
    )
    return tabla


# ==========================================
# COMPROBANTE DE UN PEDIDO INDIVIDUAL
# ==========================================

def generar_pdf_comprobante(pedido: dict) -> bytes:
    buffer = BytesIO()
    # Este mismo generador dibuja tanto el comprobante de un pedido como la
    # factura persistida (colección 'facturas'): una factura trae
    # 'pedidoId' apuntando al pedido del que se originó; un pedido no.
    id_pedido_relacionado = pedido.get("pedidoId") or pedido.get("id")
    numero_pedido = (id_pedido_relacionado or "")[-8:].upper() or "—"

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=1.6 * cm,
        bottomMargin=1.8 * cm,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        title=f"Comprobante de pedido {numero_pedido}",
    )

    usuario = pedido.get("usuario") or {}
    nombre_cliente = f"{usuario.get('nombre', '')} {usuario.get('apellido', '')}".strip() or "Usuario eliminado"
    # Las facturas guardadas como su propio registro (colección 'facturas')
    # ya traen un número real; los pedidos antiguos (sin factura persistida)
    # siguen derivándolo del ID del pedido, como se hacía antes.
    numero_factura = pedido.get("numero") or f"FE-{numero_pedido}"

    elementos = [
        _membrete(nit=f"{NIT_EMPRESA}  ·  {REGIMEN_EMPRESA}"),
        _linea_membrete(),
        Paragraph("Factura de venta electrónica", ESTILO_TITULO),
        Paragraph(
            f"N.º {numero_factura} · Pedido #{numero_pedido} · {formatear_fecha(pedido.get('fecha'))}",
            ESTILO_SUBTITULO,
        ),
        Spacer(1, 16),
    ]

    documento_cliente = "—"
    if usuario.get("numeroDocumento"):
        documento_cliente = f"{usuario.get('tipoDocumento') or ''} {usuario['numeroDocumento']}".strip()

    # Una factura persistida trae su propio 'estado' (Emitida/Anulada); un
    # pedido "suelto" (comprobante generado sin factura, caso legado) trae
    # el estado de envío (Pendiente/Procesando/.../Cancelado).
    es_factura = pedido.get("pedidoId") is not None
    etiqueta_estado = "Estado de la factura" if es_factura else "Estado del pedido"

    filas_cliente = [
        ["Cliente", nombre_cliente],
        ["Documento", documento_cliente],
        ["Correo", usuario.get("correo") or "—"],
        ["Teléfono", usuario.get("telefono") or "—"],
        ["Dirección", usuario.get("direccion") or "—"],
        [etiqueta_estado, pedido.get("estado") or "—"],
    ]
    tabla_cliente = Table(
        [
            [Paragraph(f"<b>{k}</b>", ESTILO_CELDA), Paragraph(str(v), ESTILO_CELDA)]
            for k, v in filas_cliente
        ],
        colWidths=[4 * cm, 11 * cm],
    )
    tabla_cliente.setStyle(
        TableStyle(
            [
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -2), 0.3, BORDE),
            ]
        )
    )
    elementos.append(tabla_cliente)
    elementos.append(Spacer(1, 18))
    elementos.append(Paragraph("Productos y servicios", ESTILO_SECCION))

    filas_items = []
    for item in pedido.get("productos", []) or []:
        es_servicio = item.get("tipo") == "servicio"
        nombre_defecto = "Servicio eliminado" if es_servicio else "Producto eliminado"
        filas_items.append(
            [
                "Servicio" if es_servicio else "Producto",
                item.get("nombre") or nombre_defecto,
                str(item.get("cantidad", "—")),
                formatear_moneda(item.get("precio")),
                formatear_moneda(item.get("subtotal")),
            ]
        )

    elementos.append(
        _tabla_datos(
            ["Tipo", "Ítem", "Cantidad", "Precio unitario", "Subtotal"],
            filas_items,
            anchos=[2.2 * cm, 5.3 * cm, 2 * cm, 3 * cm, 3 * cm],
        )
    )

    elementos.append(Spacer(1, 14))
    elementos.append(_tabla_totales(pedido))

    titulo_pie = f"Comprobante #{numero_pedido}"
    pie = _pie_de_pagina(titulo_pie)
    doc.build(elementos, onFirstPage=pie, onLaterPages=pie)
    return buffer.getvalue()
