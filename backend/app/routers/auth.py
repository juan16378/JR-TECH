from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.security import (
    crear_token,
    crear_token_reset,
    hashear_password,
    verificar_password,
)
from app.db.mongodb import get_db
from app.deps import get_current_user, requerir_roles
from app.models.usuario import serializar_usuario
from app.schemas.usuario import (
    CambiarPassword,
    MiPerfilActualizar,
    OlvidePassword,
    RestablecerPassword,
    UsuarioCrearInterno,
    UsuarioLogin,
    UsuarioRegistro,
)
from app.utils.email import enviar_correo_recuperacion

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


async def _crear_usuario(db, datos: dict, rol: str) -> dict:
    if await db.usuarios.find_one({"correo": datos["correo"]}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta registrada con ese correo electrónico.",
        )

    if await db.usuarios.find_one({"numeroDocumento": datos["numeroDocumento"]}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta registrada con ese número de documento.",
        )

    documento = {
        "nombre": datos["nombre"],
        "apellido": datos["apellido"],
        "tipoDocumento": datos["tipoDocumento"],
        "numeroDocumento": datos["numeroDocumento"],
        "direccion": datos["direccion"],
        "telefono": datos["telefono"],
        "correo": datos["correo"],
        "passwordHash": hashear_password(datos["password"]),
        "rol": rol,
        "estado": "Activo",
        "createdAt": datetime.now(timezone.utc),
    }

    resultado = await db.usuarios.insert_one(documento)
    documento["_id"] = resultado.inserted_id
    return serializar_usuario(documento)


# ==========================================
# REGISTRO DE CLIENTES (público)
# ==========================================

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def registrar(datos: UsuarioRegistro, db=Depends(get_db)):
    body = datos.model_dump()
    body["correo"] = body["correo"].lower()

    usuario = await _crear_usuario(db, body, rol="Cliente")

    return {
        "success": True,
        "message": "Registro exitoso. Ahora puedes iniciar sesión.",
        "usuario": usuario,
    }


# ==========================================
# LOGIN
# ==========================================

@router.post("/login")
async def iniciar_sesion(datos: UsuarioLogin, db=Depends(get_db)):
    correo = datos.correo.lower()

    usuario = await db.usuarios.find_one({"correo": correo})
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado. Regístrate para continuar.",
        )

    if not verificar_password(datos.password, usuario.get("passwordHash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta.",
        )

    if usuario.get("estado") != "Activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está inactiva. Contacta a un administrador.",
        )

    token = crear_token(
        {"sub": str(usuario["_id"]), "correo": usuario["correo"], "rol": usuario["rol"]}
    )

    return {
        "success": True,
        "message": "Inicio de sesión exitoso.",
        "token": token,
        "usuario": serializar_usuario(usuario),
    }


# ==========================================
# CREAR USUARIO INTERNO (Administrador crea Empleado/Administrador/Cliente)
# ==========================================

@router.post("/crear-usuario-interno", status_code=status.HTTP_201_CREATED)
async def crear_usuario_interno(
    datos: UsuarioCrearInterno,
    db=Depends(get_db),
    _admin: dict = Depends(requerir_roles("Administrador")),
):
    body = datos.model_dump()
    body["correo"] = body["correo"].lower()
    rol = body.pop("rol")

    usuario = await _crear_usuario(db, body, rol=rol)

    return {"success": True, "message": "Usuario creado correctamente.", "usuario": usuario}


# ==========================================
# MI PERFIL
# ==========================================

@router.get("/mi-perfil")
async def obtener_mi_perfil(usuario: dict = Depends(get_current_user)):
    return {"success": True, "usuario": usuario}


@router.put("/mi-perfil")
async def actualizar_mi_perfil(
    datos: MiPerfilActualizar,
    db=Depends(get_db),
    usuario: dict = Depends(get_current_user),
):
    from app.models.common import oid

    await db.usuarios.update_one(
        {"_id": oid(usuario["id"])}, {"$set": datos.model_dump()}
    )

    actualizado = await db.usuarios.find_one({"_id": oid(usuario["id"])})
    return {
        "success": True,
        "message": "Perfil actualizado correctamente.",
        "usuario": serializar_usuario(actualizado),
    }


# ==========================================
# CAMBIAR CONTRASEÑA (usuario autenticado)
# ==========================================

@router.put("/cambiar-password")
async def cambiar_password(
    datos: CambiarPassword,
    db=Depends(get_db),
    usuario: dict = Depends(get_current_user),
):
    from app.models.common import oid

    doc = await db.usuarios.find_one({"_id": oid(usuario["id"])})
    if not doc or not verificar_password(datos.passwordActual, doc.get("passwordHash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual no es correcta.",
        )

    await db.usuarios.update_one(
        {"_id": oid(usuario["id"])},
        {"$set": {"passwordHash": hashear_password(datos.passwordNueva)}},
    )

    return {"success": True, "message": "Tu contraseña se actualizó correctamente."}


# ==========================================
# RECUPERACIÓN DE CONTRASEÑA (público)
# ==========================================

@router.post("/olvide-password")
async def olvide_password(datos: OlvidePassword, db=Depends(get_db)):
    correo = datos.correo.lower()
    usuario = await db.usuarios.find_one({"correo": correo})

    # Por seguridad, siempre respondemos lo mismo exista o no la cuenta
    # (evita que alguien descubra qué correos están registrados).
    mensaje = "Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña."

    if usuario:
        token = crear_token_reset()
        expira = datetime.now(timezone.utc) + timedelta(
            minutes=settings.RESET_TOKEN_EXPIRE_MINUTES
        )

        await db.password_reset_tokens.delete_many({"usuarioId": usuario["_id"]})
        await db.password_reset_tokens.insert_one(
            {
                "usuarioId": usuario["_id"],
                "token": token,
                "expiresAt": expira,
                "used": False,
            }
        )

        enviar_correo_recuperacion(usuario["correo"], usuario["nombre"], token)

    return {"success": True, "message": mensaje}


@router.post("/restablecer-password")
async def restablecer_password(datos: RestablecerPassword, db=Depends(get_db)):
    registro = await db.password_reset_tokens.find_one({"token": datos.token, "used": False})

    if not registro:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace no es válido o ya fue utilizado. Solicita uno nuevo.",
        )

    expira = registro["expiresAt"]
    if expira.tzinfo is None:
        expira = expira.replace(tzinfo=timezone.utc)

    if expira < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace expiró. Solicita uno nuevo.",
        )

    await db.usuarios.update_one(
        {"_id": registro["usuarioId"]},
        {"$set": {"passwordHash": hashear_password(datos.password)}},
    )
    await db.password_reset_tokens.update_one(
        {"_id": registro["_id"]}, {"$set": {"used": True}}
    )

    return {"success": True, "message": "Tu contraseña se restableció correctamente."}
