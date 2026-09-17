from pydantic import BaseModel, Field, field_validator

from app.models.producto import CATEGORIAS_VALIDAS, MARCAS_VALIDAS


class ProductoCrear(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    descripcion: str = Field(..., min_length=2, max_length=1000)
    precio: float = Field(..., gt=0)
    stock: int = Field(..., ge=0)
    imagen: str | None = ""
    categoria: str
    marca: str

    @field_validator("categoria")
    @classmethod
    def categoria_valida(cls, v):
        if v not in CATEGORIAS_VALIDAS:
            raise ValueError(f"categoria debe ser una de {CATEGORIAS_VALIDAS}")
        return v

    @field_validator("marca")
    @classmethod
    def marca_valida(cls, v):
        if v not in MARCAS_VALIDAS:
            raise ValueError(f"marca debe ser una de {MARCAS_VALIDAS}")
        return v


class ProductoActualizar(BaseModel):
    nombre: str | None = Field(None, min_length=2, max_length=100)
    descripcion: str | None = Field(None, min_length=2, max_length=1000)
    precio: float | None = Field(None, gt=0)
    stock: int | None = Field(None, ge=0)
    imagen: str | None = None
    categoria: str | None = None
    marca: str | None = None

    @field_validator("categoria")
    @classmethod
    def categoria_valida(cls, v):
        if v is not None and v not in CATEGORIAS_VALIDAS:
            raise ValueError(f"categoria debe ser una de {CATEGORIAS_VALIDAS}")
        return v

    @field_validator("marca")
    @classmethod
    def marca_valida(cls, v):
        if v is not None and v not in MARCAS_VALIDAS:
            raise ValueError(f"marca debe ser una de {MARCAS_VALIDAS}")
        return v
