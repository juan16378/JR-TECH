from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


class MongoDB:
    client: AsyncIOMotorClient = None
    db = None


mongodb = MongoDB()


async def conectar_mongo():
    """Se llama una vez, al arrancar el servidor (evento startup de FastAPI)."""
    if not settings.MONGODB_URI:
        raise RuntimeError(
            "MONGODB_URI no está definida. Revisa tu archivo .env"
        )

    print("Conectando a MongoDB...")

    mongodb.client = AsyncIOMotorClient(settings.MONGODB_URI)

    # Si la URI ya incluye el nombre de la base de datos (.../JRTECHAPI?...)
    # se usa ese; si no, se usa MONGODB_DB_NAME del .env.
    try:
        mongodb.db = mongodb.client.get_default_database()
    except Exception:
        mongodb.db = None

    if mongodb.db is None:
        mongodb.db = mongodb.client[settings.MONGODB_DB_NAME]

    # Verifica que la conexión realmente funcione
    await mongodb.client.admin.command("ping")

    await crear_indices()

    print("=================================")
    print("MongoDB conectado correctamente")
    print(f"Base de datos: {mongodb.db.name}")
    print("=================================")


async def crear_indices():
    """Índices únicos / de búsqueda, equivalentes a llaves e integridad
    referencial en una base de datos relacional."""
    db = mongodb.db

    await db.usuarios.create_index("correo", unique=True)
    await db.usuarios.create_index("numeroDocumento", unique=True)

    await db.productos.create_index("nombre")
    await db.servicios.create_index("nombre")

    await db.carrito.create_index([("usuarioId", 1), ("productoId", 1)], unique=True)
    await db.favoritos.create_index([("usuarioId", 1), ("productoId", 1)], unique=True)

    await db.pedidos.create_index("usuarioId")

    await db.password_reset_tokens.create_index("token", unique=True)
    await db.password_reset_tokens.create_index("expiresAt", expireAfterSeconds=0)


async def cerrar_mongo():
    """Se llama al apagar el servidor."""
    if mongodb.client:
        mongodb.client.close()
        print("Conexión a MongoDB cerrada")


def get_db():
    """Dependencia para inyectar la base de datos en los routers."""
    return mongodb.db
