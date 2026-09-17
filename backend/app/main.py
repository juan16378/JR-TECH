import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.mongodb import cerrar_mongo, conectar_mongo
from app.routers import (
    auth,
    carrito,
    chatbot,
    facturas,
    favoritos,
    pedidos,
    pqr,
    productos,
    reportes,
    servicios,
    usuarios,
)

app = FastAPI(
    title="JR TECH API",
    description=(
        "Backend de JR TECH construido con FastAPI + MongoDB (autorizado por el "
        "instructor como alternativa NoSQL a una base de datos relacional). "
        "Incluye autenticación JWT, hashing de contraseñas, control de roles y "
        "operaciones CRUD para usuarios, productos, servicios, carrito, "
        "favoritos y pedidos."
    ),
    version="1.0.0",
)

# ==========================================
# CORS
# ==========================================
# Permite que el frontend de React (Vite) pueda hacer peticiones a esta API.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# ARCHIVOS ESTÁTICOS (imágenes subidas desde el dispositivo)
# ==========================================
# Las imágenes de productos subidas por el admin/empleado se guardan en
# disco (ver app/routers/productos.py) y se sirven públicamente aquí.

os.makedirs("uploads/productos", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ==========================================
# MANEJO DE ERRORES
# ==========================================
# El frontend siempre espera un JSON con la forma {"message": "..."} cuando
# algo falla, así que normalizamos aquí las excepciones de FastAPI/Pydantic.

@app.exception_handler(HTTPException)
async def manejar_http_exception(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def manejar_validation_error(request: Request, exc: RequestValidationError):
    errores = exc.errors()
    primer_error = errores[0] if errores else {}
    campo = ".".join(str(p) for p in primer_error.get("loc", []) if p != "body")
    mensaje = primer_error.get("msg", "Datos inválidos.")

    if campo:
        mensaje = f"{campo}: {mensaje}"

    # 'ctx' puede traer objetos (p. ej. ValueError) que no son serializables
    # a JSON directamente, así que se descarta y solo se conserva el texto.
    errores_serializables = [
        {"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")}
        for e in errores
    ]

    return JSONResponse(
        status_code=422,
        content={"success": False, "message": mensaje, "errores": errores_serializables},
    )


# ==========================================
# EVENTOS DE ARRANQUE / APAGADO
# ==========================================

@app.on_event("startup")
async def al_iniciar():
    await conectar_mongo()


@app.on_event("shutdown")
async def al_apagar():
    await cerrar_mongo()


# ==========================================
# RUTAS
# ==========================================

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(productos.router)
app.include_router(servicios.router)
app.include_router(carrito.router)
app.include_router(favoritos.router)
app.include_router(pedidos.router)
app.include_router(facturas.router)
app.include_router(pqr.router)
app.include_router(reportes.router)
app.include_router(chatbot.router)


@app.get("/")
def raiz():
    return {
        "success": True,
        "message": "API JR TECH (FastAPI + MongoDB) funcionando correctamente",
    }


@app.get("/api/test")
def probar():
    return {
        "success": True,
        "message": "Backend FastAPI conectado correctamente",
    }
