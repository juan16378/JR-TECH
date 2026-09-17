"""
Utilidades de seguridad:
- Hashing de contraseñas (bcrypt, vía passlib).
- Creación y verificación de JSON Web Tokens (JWT).

Las contraseñas NUNCA se almacenan ni se comparan en texto plano.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


# ==========================================
# CONTRASEÑAS
# ==========================================
# Se usa la librería bcrypt directamente (en vez de passlib) para evitar
# incompatibilidades conocidas entre passlib y las versiones recientes de
# bcrypt. bcrypt solo admite contraseñas de hasta 72 bytes; se truncan de
# forma segura para no romper con contraseñas muy largas.

def hashear_password(password: str) -> str:
    """Genera el hash seguro (bcrypt) de una contraseña en texto plano."""
    clave = password.encode("utf-8")[:72]
    return bcrypt.hashpw(clave, bcrypt.gensalt()).decode("utf-8")


def verificar_password(password_plano: str, password_hash: str) -> bool:
    """Compara una contraseña en texto plano contra su hash almacenado."""
    try:
        clave = password_plano.encode("utf-8")[:72]
        return bcrypt.checkpw(clave, password_hash.encode("utf-8"))
    except Exception:
        return False


# ==========================================
# JSON WEB TOKEN (JWT)
# ==========================================

def crear_token(datos: dict, expira_minutos: int | None = None) -> str:
    """Genera un JWT firmado que contiene la identidad del usuario."""
    payload = datos.copy()

    minutos = expira_minutos or settings.JWT_EXPIRE_MINUTES
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=minutos)

    payload.update({"exp": expiracion, "iat": datetime.now(timezone.utc)})

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decodificar_token(token: str) -> dict | None:
    """Verifica la firma y expiración del token. Devuelve el payload o None."""
    try:
        return jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        return None


def crear_token_reset() -> str:
    """Token opaco (no JWT) de un solo uso para restablecer contraseña."""
    import secrets

    return secrets.token_urlsafe(32)
