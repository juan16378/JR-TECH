from pydantic import BaseModel, Field


class PQRCrear(BaseModel):
    tipo: str
    asunto: str = Field(..., min_length=3, max_length=150)
    mensaje: str = Field(..., min_length=10, max_length=3000)


class PQREstadoActualizar(BaseModel):
    estado: str


class PQRMensajeCrear(BaseModel):
    texto: str = Field(..., min_length=1, max_length=3000)
