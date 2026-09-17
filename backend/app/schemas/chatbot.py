from pydantic import BaseModel, Field


class MensajeHistorial(BaseModel):
    autor: str  # "usuario" | "bot"
    texto: str = Field(..., max_length=2000)


class ChatbotMensaje(BaseModel):
    mensaje: str = Field(..., min_length=1, max_length=1000)
    # Últimos turnos de la conversación (sin incluir `mensaje`, que es el
    # turno nuevo), para que el modelo tenga contexto de lo ya hablado.
    historial: list[MensajeHistorial] = Field(default_factory=list, max_length=20)
