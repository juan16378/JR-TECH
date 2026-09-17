"""
Modelos = la forma en que los datos viven en la base de datos (documentos de
MongoDB) y las funciones que los convierten a/desde diccionarios de Python.

Esto se mantiene separado de app/schemas, que son los esquemas de validación
de entrada/salida de la API (Pydantic). Ver punto 6 de la guía del avance.
"""

from bson import ObjectId


def oid(valor: str) -> ObjectId | None:
    """Convierte un string a ObjectId de Mongo. None si no es válido."""
    try:
        return ObjectId(valor)
    except Exception:
        return None


def serializar_id(doc: dict) -> dict:
    """Reemplaza el _id (ObjectId) de Mongo por un campo 'id' en texto,
    que es el formato que consume el frontend de React."""
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc
