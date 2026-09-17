from app.models.common import serializar_id

# Listas fijas: se usan tanto para validar en el backend (Pydantic, abajo en
# app/schemas/producto.py) como para poblar los <select> del frontend, así
# el catálogo siempre queda organizado en las mismas categorías/marcas.
CATEGORIAS_VALIDAS = [
    "Celulares",
    "Computadores portátiles",
    "Computadores de escritorio",
    "Tablets",
    "Relojes inteligentes",
    "Audífonos",
    "Accesorios",
    "Videojuegos y consolas",
]

MARCAS_VALIDAS = ["Samsung", "Apple", "Xiaomi", "PlayStation", "Xbox"]


def serializar_producto(doc: dict) -> dict:
    if not doc:
        return doc
    return serializar_id(doc)
