"""
Dependencias de FastAPI para autenticación (JWT) y autorización (roles).

Se usan como `Depends(...)` en los routers para proteger endpoints, tal como
lo exige el punto 13 de la guía ("Protección de endpoints").
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decodificar_token
from app.db.mongodb import get_db
from app.models.common import oid
from app.models.usuario import serializar_usuario

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db=Depends(get_db),
) -> dict:
    """Verifica: existencia del token, firma, expiración y usuario asociado."""

    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se envió un token de autenticación (Authorization: Bearer <token>).",
        )

    payload = decodificar_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido, mal firmado o expirado.",
        )

    usuario_id = payload.get("sub")
    id_valido = oid(usuario_id) if usuario_id else None
    if id_valido is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: no contiene un usuario asociado.",
        )

    usuario = await db.usuarios.find_one({"_id": id_valido})
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El usuario asociado a este token ya no existe.",
        )

    if usuario.get("estado") != "Activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está inactiva. Contacta a un administrador.",
        )

    return serializar_usuario(usuario)


async def get_current_user_opcional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db=Depends(get_db),
) -> dict | None:
    """Igual que get_current_user, pero para endpoints públicos que se
    comportan distinto si hay una sesión iniciada (p. ej. el chatbot:
    cualquier visitante puede usarlo, pero solo si hay token puede
    preguntarle por SUS PROPIOS pedidos). Nunca lanza 401/403: si el token
    falta, es inválido o el usuario ya no existe/está inactivo, simplemente
    devuelve None en vez de cortar la petición."""

    if credentials is None or not credentials.credentials:
        return None

    payload = decodificar_token(credentials.credentials)
    if payload is None:
        return None

    usuario_id = payload.get("sub")
    id_valido = oid(usuario_id) if usuario_id else None
    if id_valido is None:
        return None

    usuario = await db.usuarios.find_one({"_id": id_valido})
    if not usuario or usuario.get("estado") != "Activo":
        return None

    return serializar_usuario(usuario)


def requerir_roles(*roles_permitidos: str):
    """Dependencia factory: solo deja pasar a los roles indicados.
    La autorización definitiva siempre ocurre aquí, en el Backend."""

    async def verificador(usuario: dict = Depends(get_current_user)) -> dict:
        if usuario.get("rol") not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos suficientes para realizar esta acción.",
            )
        return usuario

    return verificador
