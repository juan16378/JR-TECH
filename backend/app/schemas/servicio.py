from pydantic import BaseModel, Field


class ServicioCrear(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    descripcion: str = Field(..., min_length=2, max_length=1000)
    precio: float = Field(..., gt=0)


class ServicioActualizar(BaseModel):
    nombre: str | None = Field(None, min_length=2, max_length=100)
    descripcion: str | None = Field(None, min_length=2, max_length=1000)
    precio: float | None = Field(None, gt=0)
