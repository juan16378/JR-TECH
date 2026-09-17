import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from app.db.mongodb import get_db
from app.deps import requerir_roles
from app.models.common import oid
from app.models.producto import serializar_producto
from app.schemas.producto import ProductoActualizar, ProductoCrear

router = APIRouter(prefix="/api/productos", tags=["Productos"])

# ==========================================
# SUBIDA DE IMÁGENES DESDE EL DISPOSITIVO
# ==========================================
# Carpeta física donde se guardan las imágenes subidas (servida como
# archivos estáticos en app/main.py bajo la ruta pública "/uploads").

DIRECTORIO_UPLOADS = Path(__file__).resolve().parent.parent.parent / "uploads" / "productos"
DIRECTORIO_UPLOADS.mkdir(parents=True, exist_ok=True)

EXTENSIONES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
TAMANO_MAXIMO_MB = 5


@router.post("/subir-imagen")
async def subir_imagen_producto(
    request: Request,
    archivo: UploadFile = File(...),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    """Permite adjuntar una imagen desde el computador/celular en lugar de
    pegar una URL. Guarda el archivo en disco y devuelve la URL pública
    con la que luego se guarda el producto (mismo campo `imagen` de siempre)."""

    extension = Path(archivo.filename or "").suffix.lower()
    if extension not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Formato de imagen no permitido. Usa JPG, PNG, GIF o WEBP.",
        )

    contenido = await archivo.read()
    if len(contenido) > TAMANO_MAXIMO_MB * 1024 * 1024:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"La imagen supera el tamaño máximo permitido ({TAMANO_MAXIMO_MB} MB).",
        )
    if not contenido:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El archivo está vacío.")

    nombre_archivo = f"{uuid.uuid4().hex}{extension}"
    ruta_destino = DIRECTORIO_UPLOADS / nombre_archivo
    ruta_destino.write_bytes(contenido)

    url = f"{str(request.base_url).rstrip('/')}/uploads/productos/{nombre_archivo}"
    return {"success": True, "message": "Imagen subida correctamente.", "url": url}


@router.get("")
async def listar_productos(db=Depends(get_db)):
    """Lectura pública: el catálogo se muestra sin necesidad de iniciar sesión."""
    productos = await db.productos.find().sort("nombre", 1).to_list(length=1000)
    return {"success": True, "productos": [serializar_producto(p) for p in productos]}


@router.get("/{producto_id}")
async def obtener_producto(producto_id: str, db=Depends(get_db)):
    _id = oid(producto_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de producto inválido.")

    producto = await db.productos.find_one({"_id": _id})
    if not producto:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado.")

    return {"success": True, "producto": serializar_producto(producto)}


@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_producto(
    datos: ProductoCrear,
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    documento = datos.model_dump()
    documento["estado"] = "Activo"

    resultado = await db.productos.insert_one(documento)
    documento["_id"] = resultado.inserted_id

    return {"success": True, "message": "Producto creado correctamente.", "producto": serializar_producto(documento)}


@router.put("/{producto_id}")
async def actualizar_producto(
    producto_id: str,
    datos: ProductoActualizar,
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    _id = oid(producto_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de producto inválido.")

    cambios = {k: v for k, v in datos.model_dump().items() if v is not None}
    if not cambios:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No se enviaron campos para actualizar.")

    resultado = await db.productos.update_one({"_id": _id}, {"$set": cambios})
    if resultado.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado.")

    producto = await db.productos.find_one({"_id": _id})
    return {"success": True, "message": "Producto actualizado correctamente.", "producto": serializar_producto(producto)}


@router.patch("/{producto_id}/estado")
async def cambiar_estado_producto(
    producto_id: str,
    db=Depends(get_db),
    _usuario: dict = Depends(requerir_roles("Administrador", "Empleado")),
):
    _id = oid(producto_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de producto inválido.")

    producto = await db.productos.find_one({"_id": _id})
    if not producto:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado.")

    nuevo_estado = "Inactivo" if producto.get("estado") == "Activo" else "Activo"
    await db.productos.update_one({"_id": _id}, {"$set": {"estado": nuevo_estado}})

    producto["estado"] = nuevo_estado
    return {"success": True, "message": f"Producto marcado como {nuevo_estado}.", "producto": serializar_producto(producto)}


@router.delete("/{producto_id}")
async def eliminar_producto(
    producto_id: str,
    db=Depends(get_db),
    _admin: dict = Depends(requerir_roles("Administrador")),
):
    _id = oid(producto_id)
    if not _id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de producto inválido.")

    resultado = await db.productos.delete_one({"_id": _id})
    if resultado.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado.")

    return {"success": True, "message": "Producto eliminado correctamente."}
