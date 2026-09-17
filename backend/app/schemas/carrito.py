from pydantic import BaseModel, Field, model_validator


class CarritoAgregar(BaseModel):
    """Agrega una línea al carrito: un producto O un servicio (nunca ambos).

    Se mantiene 'productoId' como único campo obligatorio para productos
    (compatibilidad con el frontend actual de productos.jsx) y se agrega
    'servicioId' como alternativa opcional para que Servicios.jsx también
    pueda usar el mismo endpoint.
    """

    productoId: str | None = None
    servicioId: str | None = None
    cantidad: int = Field(1, ge=1)

    @model_validator(mode="after")
    def _validar_exactamente_uno(self):
        if bool(self.productoId) == bool(self.servicioId):
            raise ValueError("Debes indicar exactamente uno: productoId o servicioId.")
        return self


class CarritoActualizar(BaseModel):
    cantidad: int = Field(..., ge=0)


class PedidoEstadoActualizar(BaseModel):
    estado: str


class PedidoDescuentoActualizar(BaseModel):
    """Descuento (%) que un Administrador/Empleado aplica manualmente a un
    pedido que todavía está 'Pendiente', antes de que se despache."""

    porcentaje: float = Field(..., ge=0, le=100)
