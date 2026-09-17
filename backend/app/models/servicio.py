from app.models.common import serializar_id


def serializar_servicio(doc: dict) -> dict:
    if not doc:
        return doc
    return serializar_id(doc)
