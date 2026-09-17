"""
Script de siembra (seed): crea el usuario Administrador inicial (a partir de
ADMIN_EMAIL / ADMIN_PASSWORD del .env) y algunos productos/servicios de
ejemplo, para tener datos con los que evidenciar el CRUD en Swagger/Postman.

Uso (con el entorno virtual activado, desde la carpeta backend/):
    python -m app.seed
"""

import asyncio
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.security import hashear_password

PRODUCTOS_EJEMPLO = [
    {
        "nombre": "Laptop Pro 14\"",
        "descripcion": "Portátil de alto rendimiento, 16GB RAM, 512GB SSD.",
        "precio": 4200000,
        "stock": 12,
        "imagen": "",
        "categoria": "Computadores",
        "estado": "Activo",
    },
    {
        "nombre": "Audífonos inalámbricos",
        "descripcion": "Cancelación de ruido activa, batería de 30 horas.",
        "precio": 350000,
        "stock": 40,
        "imagen": "",
        "categoria": "Accesorios",
        "estado": "Activo",
    },
    {
        "nombre": "Smartwatch Fit",
        "descripcion": "Monitor de ritmo cardíaco, GPS y resistencia al agua.",
        "precio": 620000,
        "stock": 25,
        "imagen": "",
        "categoria": "Wearables",
        "estado": "Activo",
    },
]

SERVICIOS_EJEMPLO = [
    {
        "nombre": "Mantenimiento preventivo de PC",
        "descripcion": "Limpieza física, optimización de software y diagnóstico general.",
        "precio": 60000,
        "estado": "Activo",
    },
    {
        "nombre": "Instalación de software",
        "descripcion": "Instalación y configuración de sistema operativo y programas base.",
        "precio": 40000,
        "estado": "Activo",
    },
]


async def sembrar():
    if not settings.MONGODB_URI:
        raise RuntimeError("MONGODB_URI no está definida en tu .env")

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    try:
        db = client.get_default_database()
    except Exception:
        db = None
    if db is None:
        db = client[settings.MONGODB_DB_NAME]

    # ---------- Administrador inicial ----------
    if settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD:
        existente = await db.usuarios.find_one({"correo": settings.ADMIN_EMAIL.lower()})
        if existente:
            print(f"Ya existe un usuario con el correo {settings.ADMIN_EMAIL}, no se creó de nuevo.")
        else:
            await db.usuarios.insert_one(
                {
                    "nombre": settings.ADMIN_NOMBRE,
                    "apellido": settings.ADMIN_APELLIDO,
                    "tipoDocumento": "CC",
                    "numeroDocumento": "1000000000",
                    "direccion": "Oficina principal",
                    "telefono": "3000000000",
                    "correo": settings.ADMIN_EMAIL.lower(),
                    "passwordHash": hashear_password(settings.ADMIN_PASSWORD),
                    "rol": "Administrador",
                    "estado": "Activo",
                    "createdAt": datetime.now(timezone.utc),
                }
            )
            print(f"Usuario Administrador creado: {settings.ADMIN_EMAIL} / (la contraseña definida en .env)")
    else:
        print("ADMIN_EMAIL / ADMIN_PASSWORD no están definidos en .env: no se creó administrador.")

    # ---------- Productos y servicios de ejemplo ----------
    if await db.productos.count_documents({}) == 0:
        await db.productos.insert_many(PRODUCTOS_EJEMPLO)
        print(f"{len(PRODUCTOS_EJEMPLO)} productos de ejemplo insertados.")
    else:
        print("La colección de productos ya tiene datos, no se insertaron ejemplos.")

    if await db.servicios.count_documents({}) == 0:
        await db.servicios.insert_many(SERVICIOS_EJEMPLO)
        print(f"{len(SERVICIOS_EJEMPLO)} servicios de ejemplo insertados.")
    else:
        print("La colección de servicios ya tiene datos, no se insertaron ejemplos.")

    client.close()


if __name__ == "__main__":
    asyncio.run(sembrar())
