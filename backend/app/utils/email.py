"""
Envío de correo: recuperación de contraseña, factura de una compra y aviso de
respuesta a una PQR.

Usa smtplib con las credenciales SMTP definidas en .env. Si el SMTP no está
configurado o falla, ninguna de estas funciones rompe la petición que las
llama: se registra el error/aviso en consola y el flujo principal (crear el
pedido, responder la PQR) sigue funcionando igual, para poder probar todo sin
depender de un servidor de correo real (útil para las evidencias con
Postman).

Los tres correos comparten una misma plantilla visual (_plantilla_correo),
con la identidad del sitio (logo circular + degradado cian/azul, fondo
oscuro) en vez de HTML suelto repetido en cada función. El logo se manda
como imagen incrustada (Content-ID), no como una URL externa, porque el
sitio corre en local durante el desarrollo y una URL a localhost no cargaría
en el cliente de correo de quien lo reciba.
"""

import smtplib
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape as escapar_html
from pathlib import Path

from app.core.config import settings

# Versión circular y con fondo transparente del logo (ver app/assets/logo.png,
# usado también en el membrete de los PDF), pensada para verse bien sobre el
# fondo oscuro del encabezado del correo en vez del fondo blanco original.
RUTA_LOGO_CORREO = Path(__file__).resolve().parent.parent / "assets" / "logo_correo.png"
LOGO_CID = "logo_jrtech"


def _construir_mensaje(
    destinatario: str,
    asunto: str,
    texto_plano: str,
    html: str,
    adjuntos: list[tuple[str, bytes, str]] | None = None,
) -> MIMEMultipart:
    """Arma el correo completo: texto plano + HTML (alternative), el logo
    incrustado como imagen en línea (related) y, si se pasan, adjuntos
    aparte como la factura en PDF (mixed)."""
    mensaje = MIMEMultipart("mixed")
    mensaje["Subject"] = asunto
    mensaje["From"] = settings.EMAIL_FROM
    mensaje["To"] = destinatario

    relacionado = MIMEMultipart("related")

    alternativo = MIMEMultipart("alternative")
    alternativo.attach(MIMEText(texto_plano, "plain"))
    alternativo.attach(MIMEText(html, "html"))
    relacionado.attach(alternativo)

    if RUTA_LOGO_CORREO.exists():
        with open(RUTA_LOGO_CORREO, "rb") as archivo_logo:
            imagen_logo = MIMEImage(archivo_logo.read(), _subtype="png")
        imagen_logo.add_header("Content-ID", f"<{LOGO_CID}>")
        imagen_logo.add_header("Content-Disposition", "inline", filename="logo.png")
        relacionado.attach(imagen_logo)

    mensaje.attach(relacionado)

    for nombre_archivo, contenido, subtipo in adjuntos or []:
        adjunto = MIMEApplication(contenido, _subtype=subtipo)
        adjunto.add_header("Content-Disposition", "attachment", filename=nombre_archivo)
        mensaje.attach(adjunto)

    return mensaje


def _enviar(mensaje: MIMEMultipart, destinatario: str, timeout: int = 15) -> None:
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.sendmail(settings.SMTP_USER, [destinatario], mensaje.as_string())


def _plantilla_correo(
    icono: str,
    color_icono: str,
    titulo: str,
    cuerpo_html: str,
    cta_texto: str | None = None,
    cta_enlace: str | None = None,
) -> str:
    """Envuelve el contenido propio de cada correo (cuerpo_html) en una
    misma tarjeta: franja de degradado arriba, encabezado con el logo,
    insignia de color + título propio de ese correo, el cuerpo, un botón
    opcional y un pie de página. Usa tablas con estilos en línea (no
    <style> externo ni flexbox/grid) porque es lo único que se renderiza de
    forma confiable en clientes de correo como Gmail u Outlook."""

    logo_html = (
        f'<img src="cid:{LOGO_CID}" width="52" height="52" alt="JR TECH" '
        f'style="display:block;border-radius:50%;">'
        if RUTA_LOGO_CORREO.exists()
        else ""
    )

    boton_html = ""
    if cta_texto and cta_enlace:
        boton_html = f"""
        <tr>
          <td align="center" style="padding:6px 32px 32px;">
            <a href="{cta_enlace}"
               style="display:inline-block;background-color:#22d3ee;background-image:linear-gradient(135deg,#22d3ee,#3b82f6);
                      color:#0b1120;font-family:Arial, Helvetica, sans-serif;font-size:15px;font-weight:bold;
                      text-decoration:none;padding:14px 32px;border-radius:999px;">
              {cta_texto}
            </a>
          </td>
        </tr>"""

    return f"""\
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JR TECH</title>
</head>
<body style="margin:0;padding:0;background-color:#e2e8f0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#e2e8f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:520px;background-color:#0b1120;border-radius:18px;overflow:hidden;">

          <!-- FRANJA DE MARCA -->
          <tr>
            <td style="height:6px;line-height:6px;font-size:0;background-color:#22d3ee;
                       background-image:linear-gradient(90deg,#22d3ee,#3b82f6);">&nbsp;</td>
          </tr>

          <!-- ENCABEZADO: logo + wordmark -->
          <tr>
            <td style="padding:26px 32px 22px;border-bottom:1px solid #1e293b;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:52px;">{logo_html}</td>
                  <td style="padding-left:14px;font-family:Arial, Helvetica, sans-serif;">
                    <p style="margin:0;font-size:18px;font-weight:900;color:#f8fafc;letter-spacing:0.3px;">JR TECH</p>
                    <p style="margin:2px 0 0;font-size:11px;font-weight:bold;color:#22d3ee;letter-spacing:0.4px;">
                      TIENDA DE TECNOLOGÍA Y SERVICIOS TÉCNICOS
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- INSIGNIA + TÍTULO -->
          <tr>
            <td style="padding:28px 32px 4px;font-family:Arial, Helvetica, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:44px;height:44px;background-color:{color_icono}1f;border-radius:12px;
                             text-align:center;vertical-align:middle;font-size:20px;line-height:44px;">{icono}</td>
                  <td style="padding-left:14px;vertical-align:middle;">
                    <p style="margin:0;font-size:19px;font-weight:900;color:#f8fafc;">{escapar_html(titulo)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CUERPO -->
          <tr>
            <td style="padding:18px 32px 8px;font-family:Arial, Helvetica, sans-serif;color:#e2e8f0;">
              {cuerpo_html}
            </td>
          </tr>
{boton_html}
          <!-- PIE -->
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #1e293b;">
              <p style="margin:0;font-family:Arial, Helvetica, sans-serif;font-size:12px;color:#64748b;line-height:18px;">
                JR TECH · Tienda de tecnología y servicios técnicos<br>
                Este es un correo automático, por favor no respondas directamente a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def enviar_correo_recuperacion(destinatario: str, nombre: str, token: str) -> None:
    enlace = f"{settings.FRONTEND_URL}/restablecer-password?token={token}"

    print("=================================")
    print(f"Enlace de recuperación para {destinatario}:")
    print(enlace)
    print("=================================")

    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASS:
        print("SMTP no configurado en .env: solo se generó el enlace anterior.")
        return

    texto_plano = (
        f"Hola {nombre},\n\n"
        "Recibimos una solicitud para restablecer tu contraseña en JR TECH.\n"
        f"Ingresa a este enlace para crear una nueva contraseña:\n{enlace}\n\n"
        f"Este enlace vence en {settings.RESET_TOKEN_EXPIRE_MINUTES} minutos.\n"
        "Si tú no solicitaste esto, puedes ignorar este correo."
    )

    cuerpo_html = f"""
        <p style="margin:0 0 4px;font-size:15px;">Hola <b>{escapar_html(nombre)}</b>,</p>
        <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#94a3b8;">
          Recibimos una solicitud para restablecer tu contraseña en JR TECH. Usa el botón de
          abajo para crear una nueva.
        </p>
        <p style="margin:0;font-size:13px;line-height:20px;color:#64748b;">
          Este enlace vence en {settings.RESET_TOKEN_EXPIRE_MINUTES} minutos. Si tú no
          solicitaste esto, puedes ignorar este correo con tranquilidad.
        </p>"""

    html = _plantilla_correo("🔑", "#22d3ee", "Restablece tu contraseña", cuerpo_html, "Restablecer contraseña", enlace)
    mensaje = _construir_mensaje(destinatario, "Recupera tu contraseña - JR TECH", texto_plano, html)

    try:
        _enviar(mensaje, destinatario, timeout=10)
        print(f"Correo de recuperación enviado a {destinatario}")
    except Exception as error:
        print(f"No se pudo enviar el correo de recuperación: {error}")


def enviar_correo_factura(destinatario: str, nombre: str, factura: dict, pdf_bytes: bytes) -> None:
    """Envía la factura de una compra recién realizada con el PDF adjunto.
    La factura sigue disponible para descargar desde el perfil del cliente
    en cualquier momento (GET /api/facturas/{id}/pdf); este correo es un
    canal adicional, no el único — si el SMTP no está configurado o falla,
    la compra ya quedó registrada de todas formas."""
    numero = factura.get("numero") or "—"
    total = float(factura.get("total") or 0)

    print(f"Enviando factura {numero} por correo a {destinatario}...")

    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASS:
        print("SMTP no configurado en .env: la factura no se envió por correo (sigue disponible para descargar desde el perfil).")
        return

    enlace_perfil = f"{settings.FRONTEND_URL}/perfil"

    texto_plano = (
        f"Hola {nombre},\n\n"
        f"Gracias por tu compra en JR TECH. Adjunto encontrarás tu factura {numero} "
        f"por ${total:,.0f}.\n\n"
        f"También puedes descargarla cuando quieras desde tu perfil, en la sección "
        f"'Mis facturas': {enlace_perfil}"
    )

    cuerpo_html = f"""
        <p style="margin:0 0 4px;font-size:15px;">Hola <b>{escapar_html(nombre)}</b>,</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#94a3b8;">
          ¡Gracias por tu compra! Adjunto a este correo encontrarás tu factura en PDF.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background-color:#111827;border-radius:12px;">
          <tr>
            <td style="padding:18px 20px;">
              <p style="margin:0 0 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;">
                Factura
              </p>
              <p style="margin:0 0 14px;font-size:18px;font-weight:900;color:#22d3ee;">
                {escapar_html(numero)}
              </p>
              <p style="margin:0 0 2px;font-size:12px;color:#94a3b8;">Total pagado</p>
              <p style="margin:0;font-size:24px;font-weight:900;color:#f8fafc;">${total:,.0f}</p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#64748b;">
          También puedes descargarla en PDF o Excel cuando quieras desde tu perfil.
        </p>"""

    html = _plantilla_correo("🧾", "#34d399", "¡Compra confirmada!", cuerpo_html, "Ver mis facturas", enlace_perfil)
    mensaje = _construir_mensaje(
        destinatario,
        f"Tu factura {numero} - JR TECH",
        texto_plano,
        html,
        adjuntos=[(f"factura_{numero}.pdf", pdf_bytes, "pdf")],
    )

    try:
        _enviar(mensaje, destinatario, timeout=15)
        print(f"Factura {numero} enviada por correo a {destinatario}")
    except Exception as error:
        print(f"No se pudo enviar la factura por correo: {error}")


def enviar_correo_respuesta_pqr(destinatario: str, nombre: str, asunto_pqr: str, mensaje_respuesta: str) -> None:
    """Avisa al cliente que su PQR recibió una respuesta nueva del equipo."""
    print(f"Notificando respuesta de PQR a {destinatario}...")

    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASS:
        print("SMTP no configurado en .env: no se pudo notificar la respuesta de la PQR por correo.")
        return

    enlace = f"{settings.FRONTEND_URL}/perfil"

    vista_previa = mensaje_respuesta.strip()
    if len(vista_previa) > 280:
        vista_previa = vista_previa[:280].rstrip() + "…"

    texto_plano = (
        f"Hola {nombre},\n\n"
        f'Nuestro equipo respondió tu PQR "{asunto_pqr}":\n\n'
        f'"{vista_previa}"\n\n'
        f"Ingresa a tu perfil para ver la conversación completa y responder si lo necesitas:\n{enlace}"
    )

    cuerpo_html = f"""
        <p style="margin:0 0 4px;font-size:15px;">Hola <b>{escapar_html(nombre)}</b>,</p>
        <p style="margin:0 0 14px;font-size:14px;line-height:22px;color:#94a3b8;">
          Nuestro equipo respondió tu PQR:
        </p>
        <p style="margin:0 0 14px;font-size:15px;font-weight:bold;color:#f8fafc;">
          {escapar_html(asunto_pqr)}
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background-color:#111827;border-radius:8px;">
          <tr>
            <td style="padding:14px 16px;border-left:3px solid #a78bfa;font-size:13px;
                       line-height:20px;color:#cbd5e1;font-style:italic;">
              &ldquo;{escapar_html(vista_previa)}&rdquo;
            </td>
          </tr>
        </table>"""

    html = _plantilla_correo("💬", "#a78bfa", "Tu PQR tiene respuesta", cuerpo_html, "Ver la conversación completa", enlace)
    mensaje = _construir_mensaje(destinatario, f"Respondimos tu PQR: {asunto_pqr} - JR TECH", texto_plano, html)

    try:
        _enviar(mensaje, destinatario, timeout=10)
        print(f"Notificación de respuesta de PQR enviada a {destinatario}")
    except Exception as error:
        print(f"No se pudo enviar la notificación de PQR por correo: {error}")
