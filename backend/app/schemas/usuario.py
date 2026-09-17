import re

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.usuario import ROLES_VALIDOS, TIPOS_DOCUMENTO_VALIDOS

NOMBRE_REGEX = r"^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$"


def _validar_password_fuerte(password: str) -> str:
    if len(password) < 8:
        raise ValueError("La contraseña debe tener mínimo 8 caracteres.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("La contraseña necesita al menos una mayúscula.")
    if not re.search(r"[0-9]", password):
        raise ValueError("La contraseña necesita al menos un número.")
    return password


class UsuarioRegistro(BaseModel):
    """Body de POST /api/auth/register (formulario de registro de clientes)."""

    nombre: str = Field(..., min_length=2, max_length=50)
    apellido: str = Field(..., min_length=2, max_length=50)
    tipoDocumento: str
    numeroDocumento: str = Field(..., min_length=6, max_length=12)
    direccion: str = Field(..., min_length=5, max_length=150)
    telefono: str = Field(..., min_length=7, max_length=10)
    correo: EmailStr
    password: str

    @field_validator("nombre", "apellido")
    @classmethod
    def solo_letras(cls, v):
        if not re.match(NOMBRE_REGEX, v):
            raise ValueError("Solo se permiten letras.")
        return v.strip()

    @field_validator("tipoDocumento")
    @classmethod
    def tipo_doc_valido(cls, v):
        if v not in TIPOS_DOCUMENTO_VALIDOS:
            raise ValueError(f"tipoDocumento debe ser uno de {TIPOS_DOCUMENTO_VALIDOS}")
        return v

    @field_validator("numeroDocumento", "telefono")
    @classmethod
    def solo_numeros(cls, v):
        if not v.isdigit():
            raise ValueError("Solo se permiten números.")
        return v

    @field_validator("password")
    @classmethod
    def password_fuerte(cls, v):
        return _validar_password_fuerte(v)


class UsuarioCrearInterno(UsuarioRegistro):
    """Body de POST /api/auth/crear-usuario-interno (solo Administrador)."""

    rol: str = "Cliente"

    @field_validator("rol")
    @classmethod
    def rol_valido(cls, v):
        if v not in ROLES_VALIDOS:
            raise ValueError(f"rol debe ser uno de {ROLES_VALIDOS}")
        return v


class UsuarioLogin(BaseModel):
    correo: EmailStr
    password: str = Field(..., min_length=1)


class UsuarioActualizar(BaseModel):
    """Body de PUT /api/usuarios/{id} (edición desde el panel admin)."""

    nombre: str | None = Field(None, min_length=2, max_length=50)
    apellido: str | None = Field(None, min_length=2, max_length=50)
    tipoDocumento: str | None = None
    numeroDocumento: str | None = Field(None, min_length=6, max_length=12)
    direccion: str | None = Field(None, min_length=5, max_length=150)
    telefono: str | None = Field(None, min_length=7, max_length=10)

    @field_validator("tipoDocumento")
    @classmethod
    def tipo_doc_valido(cls, v):
        if v is not None and v not in TIPOS_DOCUMENTO_VALIDOS:
            raise ValueError(f"tipoDocumento debe ser uno de {TIPOS_DOCUMENTO_VALIDOS}")
        return v


class MiPerfilActualizar(BaseModel):
    """Body de PUT /api/auth/mi-perfil (el propio usuario edita su perfil)."""

    apellido: str = Field(..., min_length=2, max_length=50)
    telefono: str = Field(..., min_length=7, max_length=10)
    direccion: str = Field(..., min_length=5, max_length=150)

    @field_validator("telefono")
    @classmethod
    def solo_numeros(cls, v):
        if not v.isdigit():
            raise ValueError("Solo se permiten números.")
        return v


class CambiarPassword(BaseModel):
    passwordActual: str
    passwordNueva: str

    @field_validator("passwordNueva")
    @classmethod
    def password_fuerte(cls, v):
        return _validar_password_fuerte(v)


class OlvidePassword(BaseModel):
    correo: EmailStr


class RestablecerPassword(BaseModel):
    token: str
    password: str

    @field_validator("password")
    @classmethod
    def password_fuerte(cls, v):
        return _validar_password_fuerte(v)
