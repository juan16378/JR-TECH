from app.models.common import serializar_id

ROLES_VALIDOS = ["Administrador", "Empleado", "Cliente"]
TIPOS_DOCUMENTO_VALIDOS = ["CC", "CE", "TI", "PASAPORTE"]


def serializar_usuario(doc: dict) -> dict:
    """Convierte un documento de la colección 'usuarios' a la forma pública
    que se envía al frontend. NUNCA incluye el hash de la contraseña."""
    if not doc:
        return doc
    doc = serializar_id(doc)
    doc.pop("passwordHash", None)
    return doc
