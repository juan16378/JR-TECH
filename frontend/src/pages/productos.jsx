import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { API_URL } from "../config";
import Toast, { useToasts } from "../components/Toast";
import StepsIndicator from "../components/StepsIndicator";
import {
  IconBox,
  IconCart,
  IconCheckCircle,
  IconDesktop,
  IconDownload,
  IconFileSpreadsheet,
  IconGamepad,
  IconHeadphones,
  IconHeart,
  IconLaptop,
  IconLock,
  IconSearch,
  IconSmartphone,
  IconSparkles,
  IconTablet,
  IconTrash,
  IconTruck,
  IconWarning,
  IconWatch,
  IconWifi,
  IconWrench,
  IconX,
} from "../components/Icons";

const UMBRAL_ENVIO_GRATIS = 300000;
const PRECIO_MAXIMO_DEFECTO = 5000000;

// Mismo porcentaje que app/models/pedido.py (backend) — se usa aquí solo
// para mostrar el desglose en el carrito ANTES de comprar; el valor que de
// verdad se cobra siempre lo calcula y guarda el backend en /api/pedidos.
const IVA_PORCENTAJE = 0.19;

// Deben coincidir con CATEGORIAS_VALIDAS/MARCAS_VALIDAS en
// backend/app/models/producto.py, así el catálogo público siempre muestra
// todas las categorías/marcas disponibles, tengan o no productos aún.
const CATEGORIAS_VALIDAS = [
  "Celulares",
  "Computadores portátiles",
  "Computadores de escritorio",
  "Tablets",
  "Relojes inteligentes",
  "Audífonos",
  "Accesorios",
  "Videojuegos y consolas",
];

const MARCAS_VALIDAS = ["Samsung", "Apple", "Xiaomi", "PlayStation", "Xbox"];

// Un ícono propio por categoría para que la barra de filtros se lea como un
// menú organizado (en vez de una fila de texto plano apretado).
const ICONOS_CATEGORIA = {
  Celulares: IconSmartphone,
  "Computadores portátiles": IconLaptop,
  "Computadores de escritorio": IconDesktop,
  Tablets: IconTablet,
  "Relojes inteligentes": IconWatch,
  Audífonos: IconHeadphones,
  Accesorios: IconBox,
  "Videojuegos y consolas": IconGamepad,
};

// Chip removible de un filtro activo (categoría, marca, búsqueda, etc.).
// Está fuera del componente porque no depende de ningún estado local suyo.
// Mismos estados que ESTADOS_PEDIDO en backend/app/models/pedido.py, sin
// "Cancelado" (ese se muestra aparte, no como un paso más de la barra).
const PASOS_PEDIDO = ["Pendiente", "Procesando", "Enviado", "Entregado"];

const pasoActualPedido = (estado) => {
  const indice = PASOS_PEDIDO.indexOf(estado);
  return indice === -1 ? 1 : indice + 1;
};

function ChipFiltro({ etiqueta, onQuitar }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 py-1.5 pl-3 pr-2 text-xs font-bold text-cyan-300">
      {etiqueta}
      <button
        onClick={onQuitar}
        aria-label={`Quitar filtro: ${etiqueta}`}
        className="flex h-4 w-4 items-center justify-center rounded-full transition hover:bg-cyan-400/20"
      >
        <IconX className="h-3 w-3" />
      </button>
    </span>
  );
}

function Productos() {
  const navigate = useNavigate();

  /* ============================
     USUARIO ACTUAL
  ============================ */

  const [usuario, setUsuario] = useState(() => {
    const guardado =
      localStorage.getItem("usuario") || sessionStorage.getItem("usuario");
    try {
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });

  const obtenerToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const headersAuth = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${obtenerToken()}`,
  });

  /* ============================
     PRODUCTOS DESDE EL BACKEND
  ============================ */

  const [productosDB, setProductosDB] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState("");

  const cargarProductos = async () => {
    setCargandoProductos(true);
    setErrorProductos("");

    try {
      const respuesta = await fetch(`${API_URL}/productos`);

      let datos = {};
      try {
        datos = await respuesta.json();
      } catch {
        datos = {};
      }

      if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudieron cargar los productos.");
      }

      const lista = Array.isArray(datos.productos) ? datos.productos : [];
      setProductosDB(lista.filter((p) => p.estado === "Activo"));
    } catch (err) {
      console.error("❌ Error al cargar productos:", err);
      setErrorProductos(
        err.message || "No se pudieron cargar los productos. Intenta de nuevo."
      );
    } finally {
      setCargandoProductos(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  /* ============================
     CATEGORÍAS Y PRECIO MÁXIMO (dinámicos)
  ============================ */

  const categorias = ["Todos", ...CATEGORIAS_VALIDAS];
  const marcas = ["Todas", ...MARCAS_VALIDAS];

  const precioMaximoDisponible = useMemo(() => {
    if (productosDB.length === 0) return PRECIO_MAXIMO_DEFECTO;
    return Math.max(...productosDB.map((p) => p.precio));
  }, [productosDB]);

  /* ============================
     FILTROS / UI
  ============================ */

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todos");
  const [marcaSeleccionada, setMarcaSeleccionada] = useState("Todas");
  const [busquedaInput, setBusquedaInput] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("relevancia");
  const [precioMax, setPrecioMax] = useState(PRECIO_MAXIMO_DEFECTO);
  const [soloFavoritos, setSoloFavoritos] = useState(false);

  useEffect(() => {
    setPrecioMax(precioMaximoDisponible);
  }, [precioMaximoDisponible]);

  /* ============================
     CARRITO Y FAVORITOS (backend, por usuario)
  ============================ */

  const [carrito, setCarrito] = useState([]);
  const [favoritos, setFavoritos] = useState([]); // array de IDs de producto

  const cargarCarrito = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/carrito`, {
        headers: headersAuth(),
      });

      let datos = {};
      try {
        datos = await respuesta.json();
      } catch {
        datos = {};
      }

      if (!respuesta.ok) return;

      setCarrito(Array.isArray(datos.carrito) ? datos.carrito : []);
    } catch (err) {
      console.error("❌ Error al cargar el carrito:", err);
    }
  };

  const cargarFavoritos = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/favoritos`, {
        headers: headersAuth(),
      });

      let datos = {};
      try {
        datos = await respuesta.json();
      } catch {
        datos = {};
      }

      if (!respuesta.ok) return;

      const lista = Array.isArray(datos.favoritos) ? datos.favoritos : [];
      setFavoritos(lista.map((p) => p.id));
    } catch (err) {
      console.error("❌ Error al cargar favoritos:", err);
    }
  };

  useEffect(() => {
    if (!usuario) {
      setCarrito([]);
      setFavoritos([]);
      return;
    }
    cargarCarrito();
    cargarFavoritos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  /* ============================
     CERRAR MODAL CON ESC
  ============================ */

  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [productoVista, setProductoVista] = useState(null);
  const [agregados, setAgregados] = useState({});
  const { toasts, mostrarToast } = useToasts();
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);
  const [descargandoFactura, setDescargandoFactura] = useState(false);
  const [descargandoFacturaExcel, setDescargandoFacturaExcel] = useState(false);

  // Pasarela de pago simulada: los datos de "tarjeta" son solo para la
  // ilusión visual del formulario, nunca se envían al backend ni se
  // guardan en ningún lado — el cobro real no existe, es un proyecto
  // académico. finalizarCompra() sigue siendo la única función que de
  // verdad crea el pedido (POST /api/pedidos).
  const [mostrarPago, setMostrarPago] = useState(false);
  const [tarjeta, setTarjeta] = useState({ numero: "", nombre: "", vencimiento: "", cvv: "" });
  const [errorPago, setErrorPago] = useState("");
  const [campoEnfocado, setCampoEnfocado] = useState(null);
  // formulario -> procesando -> aprobado: controla qué se muestra dentro
  // del modal mientras "corre" la simulación de pago.
  const [pagoEtapa, setPagoEtapa] = useState("formulario");
  const [pagoPaso, setPagoPaso] = useState(0);

  useEffect(() => {
    const alPresionarTecla = (e) => {
      if (e.key === "Escape") {
        setProductoVista(null);
        setCarritoAbierto(false);
        // No se deja cerrar con Escape mientras la pasarela está
        // "procesando" o mostrando el resultado, para que esa animación
        // siempre se vea completa.
        if (mostrarPago && pagoEtapa === "formulario") {
          setMostrarPago(false);
          setErrorPago("");
        }
      }
    };
    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
  }, [mostrarPago, pagoEtapa]);

  /* ============================
     DEBOUNCE DE BÚSQUEDA
  ============================ */

  useEffect(() => {
    const temporizador = setTimeout(() => setBusqueda(busquedaInput), 250);
    return () => clearTimeout(temporizador);
  }, [busquedaInput]);

  /* ============================
     TOASTS
  ============================ */

  /* ============================
     REQUIERE LOGIN
  ============================ */

  const requiereLogin = () => {
    if (usuario) return false;

    mostrarToast(
      "Necesitas tener una cuenta para hacer esto. Inicia sesión o regístrate.",
      "advertencia"
    );

    setTimeout(() => navigate("/login"), 1200);
    return true;
  };

  /* ============================
     FILTRAR + ORDENAR PRODUCTOS
  ============================ */

  const productosFiltrados = useMemo(() => {
    let resultado = productosDB.filter((producto) => {
      const coincideCategoria =
        categoriaSeleccionada === "Todos" ||
        producto.categoria === categoriaSeleccionada;

      const coincideMarca =
        marcaSeleccionada === "Todas" || producto.marca === marcaSeleccionada;

      const coincideBusqueda = producto.nombre
        ?.toLowerCase()
        .includes(busqueda.toLowerCase());

      const coincidePrecio = producto.precio <= precioMax;

      const coincideFavorito = !soloFavoritos || favoritos.includes(producto.id);

      return (
        coincideCategoria &&
        coincideMarca &&
        coincideBusqueda &&
        coincidePrecio &&
        coincideFavorito
      );
    });

    switch (orden) {
      case "precio-asc":
        resultado = [...resultado].sort((a, b) => a.precio - b.precio);
        break;
      case "precio-desc":
        resultado = [...resultado].sort((a, b) => b.precio - a.precio);
        break;
      default:
        break;
    }

    return resultado;
  }, [
    productosDB,
    categoriaSeleccionada,
    marcaSeleccionada,
    busqueda,
    orden,
    precioMax,
    soloFavoritos,
    favoritos,
  ]);

  /* ============================
     FAVORITOS
  ============================ */

  const alternarFavorito = async (producto) => {
    if (requiereLogin()) return;

    const esFavoritoActual = favoritos.includes(producto.id);

    // Optimista: actualizamos la UI antes de la respuesta
    setFavoritos((actuales) =>
      esFavoritoActual
        ? actuales.filter((id) => id !== producto.id)
        : [...actuales, producto.id]
    );

    try {
      const respuesta = await fetch(`${API_URL}/favoritos/${producto.id}`, {
        method: "POST",
        headers: headersAuth(),
      });

      let datos = {};
      try {
        datos = await respuesta.json();
      } catch {
        datos = {};
      }

      if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudo actualizar favoritos.");
      }

      mostrarToast(
        datos.esFavorito
          ? `${producto.nombre} agregado a favoritos`
          : `${producto.nombre} salió de tus favoritos`,
        datos.esFavorito ? "exito" : "info"
      );
    } catch (err) {
      console.error("❌ Error al actualizar favoritos:", err);
      // Revertimos si falló
      setFavoritos((actuales) =>
        esFavoritoActual
          ? [...actuales, producto.id]
          : actuales.filter((id) => id !== producto.id)
      );
      mostrarToast(err.message || "No se pudo actualizar favoritos.", "advertencia");
    }
  };

  /* ============================
     AGREGAR AL CARRITO
  ============================ */

  const agregarAlCarrito = async (producto) => {
    if (requiereLogin()) return;

    try {
      const respuesta = await fetch(`${API_URL}/carrito`, {
        method: "POST",
        headers: headersAuth(),
        body: JSON.stringify({ productoId: producto.id, cantidad: 1 }),
      });

      let datos = {};
      try {
        datos = await respuesta.json();
      } catch {
        datos = {};
      }

      if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudo agregar al carrito.");
      }

      setCarrito(Array.isArray(datos.carrito) ? datos.carrito : []);
      mostrarToast(`${producto.nombre} añadido al carrito`, "exito");

      setAgregados((actuales) => ({ ...actuales, [producto.id]: true }));
      setTimeout(() => {
        setAgregados((actuales) => ({ ...actuales, [producto.id]: false }));
      }, 1400);
    } catch (err) {
      console.error("❌ Error al agregar al carrito:", err);
      mostrarToast(err.message || "No se pudo agregar al carrito.", "advertencia");
    }
  };

  /* ============================
     AUMENTAR / DISMINUIR / ELIMINAR
  ============================ */

  const actualizarCantidad = async (productoId, nuevaCantidad) => {
    try {
      const respuesta = await fetch(`${API_URL}/carrito/${productoId}`, {
        method: "PATCH",
        headers: headersAuth(),
        body: JSON.stringify({ cantidad: nuevaCantidad }),
      });

      let datos = {};
      try {
        datos = await respuesta.json();
      } catch {
        datos = {};
      }

      if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudo actualizar el carrito.");
      }

      setCarrito(Array.isArray(datos.carrito) ? datos.carrito : []);
    } catch (err) {
      console.error("❌ Error al actualizar el carrito:", err);
      mostrarToast(err.message || "No se pudo actualizar el carrito.", "advertencia");
    }
  };

  const aumentarCantidad = (id) => {
    const item = carrito.find((i) => i.id === id);
    if (item) actualizarCantidad(id, item.cantidad + 1);
  };

  const disminuirCantidad = (id) => {
    const item = carrito.find((i) => i.id === id);
    if (item) actualizarCantidad(id, item.cantidad - 1);
  };

  const eliminarProductoCarrito = (id) => {
    actualizarCantidad(id, 0);
  };

  const vaciarCarrito = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/carrito`, {
        method: "DELETE",
        headers: headersAuth(),
      });

      let datos = {};
      try {
        datos = await respuesta.json();
      } catch {
        datos = {};
      }

      if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudo vaciar el carrito.");
      }

      setCarrito([]);
      mostrarToast("Carrito vaciado", "info");
    } catch (err) {
      console.error("❌ Error al vaciar el carrito:", err);
      mostrarToast(err.message || "No se pudo vaciar el carrito.", "advertencia");
    }
  };

  /* ============================
     PASARELA DE PAGO (SIMULADA)
  ============================ */

  // Solo formatean lo que el usuario escribe (agrupar en 4, insertar "/"),
  // no validan nada todavía — eso lo hace validarTarjeta().
  const formatearNumeroTarjeta = (valor) => {
    const soloDigitos = valor.replace(/\D/g, "").slice(0, 16);
    return soloDigitos.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatearVencimiento = (valor) => {
    const soloDigitos = valor.replace(/\D/g, "").slice(0, 4);
    if (soloDigitos.length <= 2) return soloDigitos;
    return `${soloDigitos.slice(0, 2)}/${soloDigitos.slice(2)}`;
  };

  const alCambiarCampoTarjeta = (campo, valor) => {
    setErrorPago("");
    setTarjeta((anterior) => ({
      ...anterior,
      [campo]:
        campo === "numero"
          ? formatearNumeroTarjeta(valor)
          : campo === "vencimiento"
          ? formatearVencimiento(valor)
          : campo === "cvv"
          ? valor.replace(/\D/g, "").slice(0, 4)
          : valor,
    }));
  };

  // Validación de SOLO FORMATO, como corresponde a una simulación: no
  // verifica que la tarjeta exista, tenga fondos ni nada real — solo que
  // el formulario esté diligenciado de forma coherente.
  const validarTarjeta = () => {
    const numeroLimpio = tarjeta.numero.replace(/\s/g, "");
    if (numeroLimpio.length !== 16) {
      return "El número de tarjeta debe tener 16 dígitos.";
    }
    if (!tarjeta.nombre.trim()) {
      return "Escribe el nombre que aparece en la tarjeta.";
    }
    const coincideVencimiento = /^(0[1-9]|1[0-2])\/\d{2}$/.exec(tarjeta.vencimiento);
    if (!coincideVencimiento) {
      return "La fecha de vencimiento debe tener el formato MM/AA.";
    }
    if (tarjeta.cvv.length < 3) {
      return "El CVV debe tener 3 o 4 dígitos.";
    }
    return "";
  };

  // Vista previa numérica de la tarjeta: rellena con puntos lo que falte
  // por escribir, agrupado de a 4, para que la tarjeta visual se sienta
  // "viva" mientras el usuario escribe.
  const previsualizarNumeroTarjeta = () => {
    const digitos = tarjeta.numero.replace(/\s/g, "");
    const relleno = "•".repeat(Math.max(0, 16 - digitos.length));
    return (digitos + relleno).replace(/(.{4})/g, "$1 ").trim();
  };

  // Solo cambia el color/gradiente de la tarjeta visual según el primer
  // dígito escrito — un detalle estético, no identifica ninguna franquicia
  // real ni usa logos de terceros.
  const colorTarjeta = (() => {
    const primerDigito = tarjeta.numero.replace(/\D/g, "")[0];
    if (primerDigito === "4") return "from-blue-500 via-indigo-500 to-indigo-700";
    if (primerDigito === "5") return "from-fuchsia-500 via-purple-500 to-purple-700";
    if (primerDigito === "3") return "from-emerald-500 via-teal-500 to-teal-700";
    if (primerDigito === "6") return "from-amber-500 via-orange-500 to-orange-700";
    return "from-cyan-500 via-sky-600 to-blue-700";
  })();

  // Un pequeño sello decorativo que va cambiando de forma junto con el
  // color, para que la tarjeta se sienta más "viva" mientras se escribe —
  // es solo geometría genérica, no un logo de ninguna franquicia real.
  const selloTarjeta = (() => {
    const primerDigito = tarjeta.numero.replace(/\D/g, "")[0];
    if (primerDigito === "4") return "rounded-full";
    if (primerDigito === "5") return "rotate-45 rounded-none";
    if (primerDigito === "3") return "rounded-none [clip-path:polygon(50%_0%,100%_38%,82%_100%,18%_100%,0%_38%)]";
    if (primerDigito === "6") return "rounded-sm";
    return "rounded-full opacity-40";
  })();

  const PASOS_PROCESANDO_PAGO = [
    "Verificando los datos de la tarjeta...",
    "Conectando con tu banco...",
    "Confirmando la transacción...",
  ];

  const alConfirmarPago = async () => {
    const error = validarTarjeta();
    if (error) {
      setErrorPago(error);
      return;
    }

    setErrorPago("");
    setProcesandoPago(true);
    setPagoEtapa("procesando");

    // Simulación por etapas (nunca se contacta a ningún banco real): cada
    // paso solo avanza la barra de progreso y el texto que se muestra.
    for (let i = 0; i < PASOS_PROCESANDO_PAGO.length; i++) {
      setPagoPaso(i);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 550));
    }

    const exito = await finalizarCompra();

    if (exito) {
      setPagoEtapa("aprobado");
      await new Promise((resolve) => setTimeout(resolve, 900));
      setMostrarPago(false);
      setPagoEtapa("formulario");
      setPagoPaso(0);
      setTarjeta({ numero: "", nombre: "", vencimiento: "", cvv: "" });
    } else {
      // finalizarCompra ya mostró el toast con el motivo del error; solo
      // regresamos al formulario para que pueda intentar de nuevo.
      setPagoEtapa("formulario");
    }

    setProcesandoPago(false);
  };

  /* ============================
     FINALIZAR COMPRA (checkout real)
  ============================ */

  // Devuelve true/false según si el pedido se creó de verdad, para que
  // alConfirmarPago (la pasarela simulada) sepa si debe mostrar la etapa
  // de "aprobado" o volver al formulario a que el usuario reintente.
  const finalizarCompra = async () => {
    if (requiereLogin()) return false;

    setProcesandoPago(true);

    try {
      const respuesta = await fetch(`${API_URL}/pedidos`, {
        method: "POST",
        headers: headersAuth(),
      });

      let datos = {};
      try {
        datos = await respuesta.json();
      } catch {
        datos = {};
      }

      if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudo completar la compra.");
      }

      setCarrito([]);
      setCarritoAbierto(false);
      setPedidoConfirmado(datos.pedido || null);
      mostrarToast("¡Compra realizada con éxito!", "celebracion");
      cargarProductos(); // refresca el stock mostrado
      return true;
    } catch (err) {
      console.error("❌ Error al finalizar la compra:", err);
      mostrarToast(err.message || "No se pudo completar la compra.", "advertencia");
      return false;
    } finally {
      setProcesandoPago(false);
    }
  };

  /* ============================
     FACTURA (PDF/Excel) DEL PEDIDO RECIÉN COMPRADO
  ============================ */

  const descargarBlob = async (url, nombreArchivo) => {
    const respuesta = await fetch(url, { headers: headersAuth() });

    if (!respuesta.ok) {
      let datos = {};
      try {
        datos = await respuesta.json();
      } catch {
        datos = {};
      }
      throw new Error(datos.message || "No se pudo generar la factura.");
    }

    const blob = await respuesta.blob();
    const urlBlob = window.URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = urlBlob;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.URL.revokeObjectURL(urlBlob);
  };

  const descargarFacturaCompra = async () => {
    if (!pedidoConfirmado?.id) return;

    setDescargandoFactura(true);
    try {
      await descargarBlob(
        `${API_URL}/reportes/pedidos/${pedidoConfirmado.id}/pdf`,
        `factura_${pedidoConfirmado.id.slice(-8)}.pdf`
      );
    } catch (err) {
      console.error("❌ Error al descargar la factura:", err);
      mostrarToast(err.message || "No se pudo generar la factura.", "advertencia");
    } finally {
      setDescargandoFactura(false);
    }
  };

  const descargarFacturaCompraExcel = async () => {
    if (!pedidoConfirmado?.id) return;

    setDescargandoFacturaExcel(true);
    try {
      await descargarBlob(
        `${API_URL}/reportes/pedidos/${pedidoConfirmado.id}/excel`,
        `factura_${pedidoConfirmado.id.slice(-8)}.xlsx`
      );
    } catch (err) {
      console.error("❌ Error al descargar la factura en Excel:", err);
      mostrarToast(err.message || "No se pudo generar la factura.", "advertencia");
    } finally {
      setDescargandoFacturaExcel(false);
    }
  };

  /* ============================
     TOTALES
  ============================ */

  const cantidadTotal = carrito.reduce((total, producto) => total + producto.cantidad, 0);
  const precioTotal = carrito.reduce(
    (total, producto) => total + producto.precio * producto.cantidad,
    0
  );
  const faltaParaEnvioGratis = Math.max(UMBRAL_ENVIO_GRATIS - precioTotal, 0);
  const porcentajeEnvioGratis = Math.min((precioTotal / UMBRAL_ENVIO_GRATIS) * 100, 100);

  // Desglose de IVA del carrito (antes de comprar). El total que de verdad
  // se cobra lo calcula el backend al confirmar la compra; esto es solo
  // para que el cliente vea el IVA ANTES de pagar, no solo en la factura.
  const ivaCarrito = precioTotal * IVA_PORCENTAJE;
  const totalConIva = precioTotal + ivaCarrito;

  const formatoPrecio = (precio) =>
    (precio || 0).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });

  // Escapa caracteres especiales de regex para poder buscar el término tal
  // cual lo escribió el usuario (por ejemplo si escribe "iPhone (2023)").
  const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Resalta la parte del texto que coincide con la búsqueda actual,
  // devolviendo fragmentos de React (no HTML crudo) para que sea seguro
  // sin importar lo que el usuario haya escrito.
  const resaltarCoincidencia = (texto, termino) => {
    if (!termino?.trim()) return texto;

    const partes = texto.split(new RegExp(`(${escaparRegex(termino.trim())})`, "gi"));
    if (partes.length === 1) return texto;

    return partes.map((parte, indice) =>
      parte.toLowerCase() === termino.trim().toLowerCase() ? (
        <mark key={indice} className="rounded bg-cyan-400/25 text-cyan-200">
          {parte}
        </mark>
      ) : (
        <span key={indice}>{parte}</span>
      )
    );
  };

  /* ============================
     IMAGEN CON RESPALDO
  ============================ */

  const ImagenProducto = ({ producto, className }) => {
    const [fallo, setFallo] = useState(false);

    // Los ítems de tipo "servicio" (agregados desde /servicios) nunca
    // tienen imagen: se muestra un ícono de herramienta en vez del ícono
    // genérico de caja, para distinguirlos de un producto sin foto.
    if (!producto.imagen || fallo) {
      const IconoRespaldo = producto.tipo === "servicio" ? IconWrench : IconBox;
      return (
        <div className={`flex items-center justify-center bg-slate-800 text-slate-500 ${className}`}>
          <IconoRespaldo className="h-10 w-10" />
        </div>
      );
    }

    return (
      <img
        src={producto.imagen}
        alt={producto.nombre}
        onError={() => setFallo(true)}
        loading="lazy"
        decoding="async"
        className={className}
      />
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-10">
      {/* ============================
          TOASTS
      ============================ */}

      <Toast toasts={toasts} />

      {/* ============================
          ENCABEZADO
      ============================ */}

      <section className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 p-7 shadow-2xl sm:p-10">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                  JR TECH Store
                </span>

                <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Tecnología que
                  <span className="block bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">
                    quieres tener.
                  </span>
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Encuentra celulares, computadores, accesorios y videojuegos en un solo
                  lugar. Envío gratis en compras superiores a {formatoPrecio(UMBRAL_ENVIO_GRATIS)}.
                </p>

                {!usuario && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <IconLock className="h-3.5 w-3.5 flex-shrink-0" /> Inicia sesión para guardar favoritos, armar tu carrito y comprar.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSoloFavoritos((v) => !v)}
                  className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 font-bold shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                    soloFavoritos
                      ? "border-pink-400 bg-pink-400/10 text-pink-300"
                      : "border-slate-700 bg-slate-950 text-white hover:border-pink-400/50"
                  }`}
                  title="Ver solo favoritos"
                >
                  <IconHeart className="h-5 w-5" filled={soloFavoritos} />
                  {favoritos.length > 0 && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-pink-400 px-1.5 text-xs font-black text-slate-950">
                      {favoritos.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => (requiereLogin() ? null : setCarritoAbierto(true))}
                  className="group relative flex items-center justify-center gap-3 rounded-2xl border border-cyan-400/30 bg-slate-950 px-5 py-4 font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400 hover:shadow-cyan-400/20"
                >
                  <span className="transition-transform group-hover:scale-110">
                    <IconCart className="h-6 w-6" />
                  </span>
                  <span className="hidden sm:inline">Mi carrito</span>
                  {cantidadTotal > 0 && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-cyan-400 px-1.5 text-xs font-black text-slate-950">
                      {cantidadTotal}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================
          CATEGORÍAS + FILTROS + RESULTADOS
      ============================ */}

      <section className="mx-auto mt-8 max-w-7xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
          {/* ============================
              CATEGORÍAS (lista lateral)
          ============================ */}

          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
              <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                Categorías
              </p>

              <div className="flex flex-col gap-1">
                {categorias.map((categoria) => {
                  const IconoCategoria = ICONOS_CATEGORIA[categoria] || IconSparkles;
                  const activa = categoriaSeleccionada === categoria;

                  return (
                    <button
                      key={categoria}
                      onClick={() => setCategoriaSeleccionada(categoria)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-all duration-200 ${
                        activa
                          ? "bg-cyan-400/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/40"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                          activa ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-cyan-300"
                        }`}
                      >
                        <IconoCategoria className="h-4 w-4" />
                      </span>
                      <span className="flex-1">{categoria}</span>
                      {activa && <IconCheckCircle className="h-4 w-4 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* ============================
              BUSCADOR / ORDEN / MARCA / PRECIO + RESULTADOS
          ============================ */}

          <div className="flex flex-col gap-6">
            <div className="sticky top-4 z-40 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <IconSearch className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={busquedaInput}
                    onChange={(e) => setBusquedaInput(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                  {busquedaInput && (
                    <button
                      onClick={() => setBusquedaInput("")}
                      aria-label="Limpiar búsqueda"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-300"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <select
                    value={orden}
                    onChange={(e) => setOrden(e.target.value)}
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white outline-none transition focus:border-cyan-400"
                  >
                    <option value="relevancia">Ordenar: Relevancia</option>
                    <option value="precio-asc">Precio: menor a mayor</option>
                    <option value="precio-desc">Precio: mayor a menor</option>
                  </select>

                  <select
                    value={marcaSeleccionada}
                    onChange={(e) => setMarcaSeleccionada(e.target.value)}
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white outline-none transition focus:border-cyan-400"
                  >
                    {marcas.map((marca) => (
                      <option key={marca} value={marca}>
                        {marca === "Todas" ? "Marca: Todas" : marca}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Precio máximo</span>
                  <span className="text-cyan-300">{formatoPrecio(precioMax)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={precioMaximoDisponible}
                  step={50000}
                  value={precioMax}
                  onChange={(e) => setPrecioMax(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan-400"
                />
              </div>
            </div>

            <div>
              {!cargandoProductos && !errorProductos && (
                <div className="mb-5 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-slate-400">
                      Mostrando <span className="font-bold text-white">{productosFiltrados.length}</span>{" "}
                      productos
                    </p>

                    {(busqueda ||
                      categoriaSeleccionada !== "Todos" ||
                      marcaSeleccionada !== "Todas" ||
                      soloFavoritos ||
                      precioMax < precioMaximoDisponible) && (
                      <button
                        onClick={() => {
                          setBusquedaInput("");
                          setCategoriaSeleccionada("Todos");
                          setMarcaSeleccionada("Todas");
                          setSoloFavoritos(false);
                          setPrecioMax(precioMaximoDisponible);
                        }}
                        className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>

                  {/* Chips por cada filtro activo: cada uno se puede quitar
                      individualmente, sin tener que borrar todo. */}
                  {(busqueda ||
                    categoriaSeleccionada !== "Todos" ||
                    marcaSeleccionada !== "Todas" ||
                    soloFavoritos ||
                    precioMax < precioMaximoDisponible) && (
                    <div className="flex flex-wrap gap-2">
                      {busqueda && (
                        <ChipFiltro etiqueta={`Búsqueda: "${busqueda}"`} onQuitar={() => setBusquedaInput("")} />
                      )}
                      {categoriaSeleccionada !== "Todos" && (
                        <ChipFiltro
                          etiqueta={`Categoría: ${categoriaSeleccionada}`}
                          onQuitar={() => setCategoriaSeleccionada("Todos")}
                        />
                      )}
                      {marcaSeleccionada !== "Todas" && (
                        <ChipFiltro
                          etiqueta={`Marca: ${marcaSeleccionada}`}
                          onQuitar={() => setMarcaSeleccionada("Todas")}
                        />
                      )}
                      {soloFavoritos && (
                        <ChipFiltro etiqueta="Solo favoritos" onQuitar={() => setSoloFavoritos(false)} />
                      )}
                      {precioMax < precioMaximoDisponible && (
                        <ChipFiltro
                          etiqueta={`Hasta ${formatoPrecio(precioMax)}`}
                          onQuitar={() => setPrecioMax(precioMaximoDisponible)}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {cargandoProductos && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
                      <div className="h-60 animate-pulse bg-slate-800" />
                      <div className="space-y-3 p-5">
                        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800" />
                        <div className="h-3 w-full animate-pulse rounded bg-slate-800" />
                        <div className="h-3 w-4/5 animate-pulse rounded bg-slate-800" />
                        <div className="h-8 w-full animate-pulse rounded bg-slate-800" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!cargandoProductos && errorProductos && (
                <div className="rounded-3xl border border-slate-800 bg-slate-900 py-20 text-center">
                  <IconWarning className="mx-auto h-10 w-10 text-amber-400" />
                  <h2 className="mt-4 text-xl font-bold text-white">No pudimos cargar los productos</h2>
                  <p className="mt-2 text-sm text-slate-400">{errorProductos}</p>
                  <button
                    onClick={cargarProductos}
                    className="mt-5 rounded-xl bg-cyan-400 px-5 py-2.5 font-bold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {!cargandoProductos && !errorProductos && (
                <>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {productosFiltrados.map((producto) => {
                      const esFavorito = favoritos.includes(producto.id);
                      const fueAgregado = agregados[producto.id];
                      const sinStock = producto.stock <= 0;

                      return (
                        <article
                          key={producto.id}
                          className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-cyan-400/40 hover:shadow-2xl hover:shadow-cyan-400/10"
                        >
                          <div
                            className="relative h-60 cursor-pointer overflow-hidden bg-white"
                            onClick={() => setProductoVista(producto)}
                          >
                            <ImagenProducto
                              producto={producto}
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent opacity-0 transition group-hover:opacity-100" />

                            <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-slate-950/90 px-3 py-1.5 text-xs font-bold text-cyan-300 backdrop-blur">
                              {producto.categoria}
                            </span>

                            {sinStock && (
                              <span className="absolute right-3 top-3 rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 backdrop-blur">
                                Agotado
                              </span>
                            )}

                            {!sinStock && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alternarFavorito(producto);
                                }}
                                className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition-all duration-300 ${
                                  esFavorito
                                    ? "border-pink-400/50 bg-pink-400/20 text-pink-300"
                                    : "border-white/10 bg-slate-950/80 text-white hover:text-pink-300"
                                }`}
                                title={esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
                              >
                                <IconHeart className="h-4 w-4" filled={esFavorito} />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProductoVista(producto);
                              }}
                              className="absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-3 rounded-full border border-white/10 bg-slate-950/90 px-4 py-2 text-xs font-bold text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                            >
                              Vista rápida
                            </button>
                          </div>

                          <div className="p-5">
                            <h2 className="text-lg font-black text-white">
                              {resaltarCoincidencia(producto.nombre, busqueda)}
                            </h2>

                            <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-400">
                              {producto.descripcion}
                            </p>

                            <div className="mt-5 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs text-slate-500">Precio</p>
                                <span className="text-lg font-black text-cyan-400">
                                  {formatoPrecio(producto.precio)}
                                </span>
                              </div>

                              <button
                                onClick={() => agregarAlCarrito(producto)}
                                disabled={sinStock}
                                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black shadow-lg transition-all duration-300 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${
                                  fueAgregado
                                    ? "bg-emerald-400 text-slate-950 shadow-emerald-400/30"
                                    : "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-cyan-500/10 hover:shadow-cyan-400/30"
                                }`}
                              >
                                {fueAgregado ? <IconCheckCircle className="h-4 w-4" /> : <IconCart className="h-4 w-4" />}
                                {fueAgregado ? "Agregado" : sinStock ? "Agotado" : "Agregar"}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {productosFiltrados.length === 0 && (
                    <div className="rounded-3xl border border-slate-800 bg-slate-900 py-20 text-center">
                      <IconSearch className="mx-auto h-10 w-10 text-slate-600" />
                      <h2 className="mt-4 text-xl font-bold text-white">No encontramos productos</h2>
                      <p className="mt-2 text-sm text-slate-400">
                        {productosDB.length === 0
                          ? "Todavía no hay productos publicados."
                          : "Intenta buscar otro producto, cambiar de categoría o ajustar el precio."}
                      </p>
                      {productosDB.length > 0 && (
                        <button
                          onClick={() => {
                            setBusquedaInput("");
                            setCategoriaSeleccionada("Todos");
                            setMarcaSeleccionada("Todas");
                            setSoloFavoritos(false);
                            setPrecioMax(precioMaximoDisponible);
                          }}
                          className="mt-5 rounded-xl bg-cyan-400 px-5 py-2.5 font-bold text-slate-950 transition hover:bg-cyan-300"
                        >
                          Ver todos
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          MODAL: PASARELA DE PAGO
      ================================================== */}

      {mostrarPago && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
            {pagoEtapa === "formulario" && (
              <>
                <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <IconLock className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Pago seguro</span>
                  </div>
                  <button
                    onClick={() => {
                      setMostrarPago(false);
                      setErrorPago("");
                    }}
                    aria-label="Cerrar"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/5 hover:text-white"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-6 pt-6">
                  {/* Tarjeta visual interactiva: se actualiza en vivo con lo que
                      el usuario escribe y gira para mostrar el CVV en el reverso. */}
                  <div className="relative mx-auto h-48 w-full max-w-[320px]" style={{ perspective: "1200px" }}>
                    <div
                      className={`relative h-full w-full transition-transform duration-500 ease-out ${
                        campoEnfocado ? "scale-[1.03]" : ""
                      }`}
                      style={{
                        transformStyle: "preserve-3d",
                        transform: campoEnfocado === "cvv" ? "rotateY(180deg)" : "rotateY(0deg)",
                      }}
                    >
                      {/* Frente */}
                      <div
                        className={`absolute inset-0 flex flex-col justify-between rounded-2xl bg-gradient-to-br ${colorTarjeta} p-5 shadow-xl shadow-black/40`}
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="h-8 w-11 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500 opacity-90" />
                          <div className="flex flex-col items-end gap-2">
                            <IconWifi className="h-5 w-5 rotate-90 text-white/70" />
                            <span
                              className={`h-3.5 w-3.5 bg-white/40 transition-all duration-300 ${selloTarjeta}`}
                              aria-hidden="true"
                            />
                          </div>
                        </div>

                        <p className="font-mono text-xl tracking-[0.2em] text-white drop-shadow">
                          {previsualizarNumeroTarjeta()}
                        </p>

                        <div className="flex items-end justify-between text-white">
                          <div className="min-w-0">
                            <p className="text-[9px] uppercase tracking-wide text-white/60">Titular</p>
                            <p className="truncate font-mono text-sm uppercase tracking-wide">
                              {tarjeta.nombre || "NOMBRE APELLIDO"}
                            </p>
                          </div>
                          <div className="shrink-0 pl-3 text-right">
                            <p className="text-[9px] uppercase tracking-wide text-white/60">Vence</p>
                            <p className="font-mono text-sm">{tarjeta.vencimiento || "MM/AA"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Reverso */}
                      <div
                        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colorTarjeta} shadow-xl shadow-black/40`}
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                      >
                        <div className="mt-6 h-10 w-full bg-slate-950/80" />
                        <div className="mt-5 flex justify-end px-5">
                          <div className="flex h-9 w-16 items-center justify-center rounded bg-white text-sm font-black tracking-widest text-slate-900">
                            {tarjeta.cvv || "•••"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-400">
                        Número de tarjeta
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0000 0000 0000 0000"
                        value={tarjeta.numero}
                        onChange={(e) => alCambiarCampoTarjeta("numero", e.target.value)}
                        onFocus={() => setCampoEnfocado("numero")}
                        onBlur={() => setCampoEnfocado(null)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-400">
                        Nombre en la tarjeta
                      </label>
                      <input
                        type="text"
                        placeholder="Como aparece en la tarjeta"
                        value={tarjeta.nombre}
                        onChange={(e) => alCambiarCampoTarjeta("nombre", e.target.value)}
                        onFocus={() => setCampoEnfocado("nombre")}
                        onBlur={() => setCampoEnfocado(null)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-400">
                          Vencimiento
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="MM/AA"
                          value={tarjeta.vencimiento}
                          onChange={(e) => alCambiarCampoTarjeta("vencimiento", e.target.value)}
                          onFocus={() => setCampoEnfocado("vencimiento")}
                          onBlur={() => setCampoEnfocado(null)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-400">CVV</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="123"
                          value={tarjeta.cvv}
                          onChange={(e) => alCambiarCampoTarjeta("cvv", e.target.value)}
                          onFocus={() => setCampoEnfocado("cvv")}
                          onBlur={() => setCampoEnfocado(null)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
                        />
                      </div>
                    </div>

                    {errorPago && (
                      <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-xs font-semibold text-red-300">
                        {errorPago}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3">
                    <span className="text-sm font-bold text-slate-400">Total a pagar</span>
                    <span className="text-lg font-black text-cyan-400">{formatoPrecio(totalConIva)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 px-6 pb-6 pt-5">
                  <button
                    onClick={alConfirmarPago}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3.5 font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-cyan-400/30"
                  >
                    <IconLock className="h-4 w-4" />
                    Pagar {formatoPrecio(totalConIva)}
                  </button>
                  <button
                    onClick={() => {
                      setMostrarPago(false);
                      setErrorPago("");
                    }}
                    className="py-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-300"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {pagoEtapa === "procesando" && (
              <div className="flex flex-col items-center px-8 py-14 text-center">
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-cyan-400/15 border-t-cyan-400" />
                  <IconLock className="h-6 w-6 text-cyan-300" />
                </div>
                <p className="mt-6 text-sm font-bold text-white">{PASOS_PROCESANDO_PAGO[pagoPaso]}</p>
                <div className="mt-5 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500 ease-out"
                    style={{ width: `${((pagoPaso + 1) / PASOS_PROCESANDO_PAGO.length) * 100}%` }}
                  />
                </div>
                <p className="mt-4 text-xs text-slate-500">No cierres ni recargues esta ventana.</p>
              </div>
            )}

            {pagoEtapa === "aprobado" && (
              <div className="flex flex-col items-center px-8 py-14 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 [animation:popIn_0.35s_ease-out]">
                  <IconCheckCircle className="h-8 w-8" />
                </span>
                <p className="mt-5 text-lg font-black text-white">¡Pago aprobado!</p>
                <p className="mt-1 text-sm text-slate-400">Generando tu factura...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================
          MODAL: COMPRA CONFIRMADA + FACTURA
      ================================================== */}

      {pedidoConfirmado && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-emerald-400/20 bg-slate-900 p-7 text-center shadow-2xl">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <IconCheckCircle className="h-7 w-7" />
            </span>

            <h2 className="mt-4 text-xl font-black text-white">¡Compra realizada!</h2>
            <p className="mt-1 text-sm text-slate-400">
              Pedido #{pedidoConfirmado.id?.slice(-8)?.toUpperCase()}
            </p>

            <p className="mt-4 text-3xl font-black text-cyan-400">
              {formatoPrecio(pedidoConfirmado.total)}
            </p>

            {pedidoConfirmado.subtotal != null && pedidoConfirmado.iva != null && (
              <div className="mx-auto mt-3 max-w-[220px] space-y-1 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatoPrecio(pedidoConfirmado.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>IVA ({Math.round((pedidoConfirmado.ivaPorcentaje ?? IVA_PORCENTAJE) * 100)}%)</span>
                  <span>{formatoPrecio(pedidoConfirmado.iva)}</span>
                </div>
              </div>
            )}

            {pedidoConfirmado.estado && pedidoConfirmado.estado !== "Cancelado" && (
              <div className="mt-6">
                <StepsIndicator actual={pasoActualPedido(pedidoConfirmado.estado)} pasos={PASOS_PEDIDO} />
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              Puedes seguir el estado de tu pedido y descargar tu factura desde tu perfil.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={descargarFacturaCompra}
                  disabled={descargandoFactura}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  <IconDownload className="h-4 w-4" />
                  {descargandoFactura ? "Generando..." : "PDF"}
                </button>

                <button
                  onClick={descargarFacturaCompraExcel}
                  disabled={descargandoFacturaExcel}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-300 transition hover:-translate-y-0.5 hover:bg-emerald-400/15 disabled:opacity-60"
                >
                  <IconFileSpreadsheet className="h-4 w-4" />
                  {descargandoFacturaExcel ? "Generando..." : "Excel"}
                </button>
              </div>

              <button
                onClick={() => navigate("/perfil")}
                className="rounded-xl border border-slate-700 py-2.5 text-sm font-bold text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
              >
                Ver mi historial de compras
              </button>

              <button
                onClick={() => setPedidoConfirmado(null)}
                className="py-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          MODAL VISTA RÁPIDA
      ================================================== */}

      {productoVista && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setProductoVista(null)}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setProductoVista(null)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/80 text-white transition hover:bg-red-500/20 hover:text-red-400"
            >
              <IconX className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="h-64 bg-white sm:h-full">
                <ImagenProducto producto={productoVista} className="h-full w-full object-cover" />
              </div>

              <div className="flex flex-col p-6">
                <div className="flex flex-wrap gap-2">
                  <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                    {productoVista.categoria}
                  </span>
                  {productoVista.marca && (
                    <span className="w-fit rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-bold text-slate-300">
                      {productoVista.marca}
                    </span>
                  )}
                </div>

                <h2 className="mt-3 text-2xl font-black text-white">{productoVista.nombre}</h2>

                <p className="mt-4 text-sm leading-6 text-slate-400">
                  {productoVista.descripcion}
                </p>

                <p className="mt-3 text-xs text-slate-500">
                  {productoVista.stock > 0
                    ? `${productoVista.stock} unidades disponibles`
                    : "Sin stock disponible"}
                </p>

                <div className="mt-6">
                  <p className="text-xs text-slate-500">Precio</p>
                  <span className="text-2xl font-black text-cyan-400">
                    {formatoPrecio(productoVista.precio)}
                  </span>
                </div>

                <div className="mt-auto flex gap-3 pt-6">
                  <button
                    onClick={() => alternarFavorito(productoVista)}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border transition ${
                      favoritos.includes(productoVista.id)
                        ? "border-pink-400/50 bg-pink-400/10 text-pink-300"
                        : "border-slate-700 bg-slate-950 text-white hover:border-pink-400/50"
                    }`}
                  >
                    <IconHeart className="h-5 w-5" filled={favoritos.includes(productoVista.id)} />
                  </button>

                  <button
                    onClick={() => {
                      agregarAlCarrito(productoVista);
                      setProductoVista(null);
                    }}
                    disabled={productoVista.stock <= 0}
                    className="flex-1 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {productoVista.stock > 0 ? "Agregar al carrito" : "Sin stock"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          FONDO DEL CARRITO
      ================================================== */}

      {carritoAbierto && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm"
          onClick={() => setCarritoAbierto(false)}
        />
      )}

      {/* ==================================================
          CARRITO LATERAL
      ================================================== */}

      <aside
        className={`fixed right-0 top-0 z-[110] flex h-full w-full max-w-md flex-col border-l border-cyan-400/20 bg-slate-900 shadow-2xl shadow-black/50 transition-transform duration-300 ${
          carritoAbierto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">JR TECH</p>
            <h2 className="mt-1 text-2xl font-black text-white">Mi carrito</h2>
          </div>
          <button
            onClick={() => setCarritoAbierto(false)}
            aria-label="Cerrar carrito"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {carrito.length > 0 && (
          <div className="border-b border-white/10 bg-slate-950/60 p-4">
            {faltaParaEnvioGratis > 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                Te faltan{" "}
                <span className="font-bold text-cyan-300">
                  {formatoPrecio(faltaParaEnvioGratis)}
                </span>{" "}
                para envío gratis <IconTruck className="h-3.5 w-3.5 flex-shrink-0" />
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <IconSparkles className="h-3.5 w-3.5 flex-shrink-0" /> ¡Tu pedido tiene envío gratis!
              </p>
            )}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${porcentajeEnvioGratis}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {carrito.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                <IconCart className="h-9 w-9" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">Tu carrito está vacío</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                Agrega productos y aparecerán aquí.
              </p>
              <button
                onClick={() => setCarritoAbierto(false)}
                className="mt-5 rounded-xl bg-cyan-400 px-5 py-2.5 font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                Seguir comprando
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {carrito.map((producto) => (
                <div key={producto.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex gap-3">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-white">
                      <ImagenProducto producto={producto} className="h-full w-full object-cover" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <h3 className="truncate font-bold text-white">
                          {producto.nombre}
                          {producto.tipo === "servicio" && (
                            <span className="ml-2 inline-flex items-center rounded-full border border-violet-400/30 bg-violet-400/10 px-1.5 py-0.5 align-middle text-[9px] font-black uppercase tracking-wide text-violet-300">
                              Servicio
                            </span>
                          )}
                        </h3>
                        <button
                          onClick={() => eliminarProductoCarrito(producto.id)}
                          className="text-slate-500 transition hover:text-red-400"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-1 text-sm font-bold text-cyan-400">
                        {formatoPrecio(producto.precio)}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => disminuirCantidad(producto.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 font-bold text-white transition hover:bg-cyan-400 hover:text-slate-950"
                        >
                          −
                        </button>
                        <span className="min-w-6 text-center text-sm font-bold text-white">
                          {producto.cantidad}
                        </span>
                        <button
                          onClick={() => aumentarCantidad(producto.id)}
                          disabled={producto.tipo !== "servicio" && producto.cantidad >= producto.stock}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 font-bold text-white transition hover:bg-cyan-400 hover:text-slate-950 disabled:opacity-40"
                        >
                          +
                        </button>
                        <span className="ml-auto text-xs text-slate-500">
                          Subtotal:{" "}
                          <span className="font-bold text-slate-300">
                            {formatoPrecio(producto.precio * producto.cantidad)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {carrito.length > 0 && (
          <div className="border-t border-white/10 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-400">Productos</span>
              <span className="font-bold text-white">{cantidadTotal}</span>
            </div>

            <div className="mb-4 space-y-1.5 border-t border-white/10 pt-4 text-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{formatoPrecio(precioTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>IVA ({Math.round(IVA_PORCENTAJE * 100)}%)</span>
                <span>{formatoPrecio(ivaCarrito)}</span>
              </div>
            </div>

            <div className="mb-5 flex items-center justify-between">
              <span className="text-lg font-bold text-white">Total</span>
              <span className="text-xl font-black text-cyan-400">
                {formatoPrecio(totalConIva)}
              </span>
            </div>

            <button
              disabled={procesandoPago}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3.5 font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-cyan-400/30 disabled:opacity-60"
              onClick={() => {
                if (requiereLogin()) return;
                setErrorPago("");
                setMostrarPago(true);
              }}
            >
              {procesandoPago ? "Procesando..." : "Confirmar compra →"}
            </button>

            <button
              onClick={vaciarCarrito}
              className="mt-3 w-full py-2 text-sm font-semibold text-slate-500 transition hover:text-red-400"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}

export default Productos;