import { useEffect, useMemo, useState } from "react";
import { AreaLineChart, DonutChart, Meter, StatusBreakdownBars } from "./Charts";
import { IconBox, IconChartBar, IconChat, IconCoin, IconReceipt, IconUsers, IconWrench } from "./Icons";
import PanelLayout from "./PanelLayout";

// ==========================================
// Página de estadísticas compartida por Administrador y Empleado
// (ruta /admin/estadisticas). Además de las gráficas originales, esta
// versión agrega una fila de KPI (indicadores clave) arriba y un filtro de
// rango de fechas (Hoy / 7 días / 30 días) que recalcula tanto los KPI como
// las gráficas que tienen sentido en el tiempo (ventas/pedidos). Los
// indicadores "de estado actual" (PQR abiertas, servicios activos,
// catálogo) no dependen del rango: son una foto de ahora mismo, no de un
// período.
// ==========================================

import { API_URL } from "../config";

// Mismas 8 categorías fijas de app/models/producto.py (backend), con un
// color propio y en el mismo orden para que la gráfica sea consistente
// cada vez que se recarga.
const CATEGORIAS_COLOR = {
    "Celulares": "#22d3ee",
    "Computadores portátiles": "#fb923c",
    "Computadores de escritorio": "#a78bfa",
    "Tablets": "#f472b6",
    "Relojes inteligentes": "#3b82f6",
    "Audífonos": "#fbbf24",
    "Accesorios": "#34d399",
    "Videojuegos y consolas": "#818cf8",
};

// Mismos colores por estado de pedido que ya se usan en Perfil.jsx
// (estiloEstado/barraEstado), para que un pedido "Entregado" sea siempre
// el mismo verde en cualquier pantalla del sitio.
const ESTADOS_COLOR = {
    Pendiente: "#64748b",
    Procesando: "#fbbf24",
    Enviado: "#22d3ee",
    Entregado: "#34d399",
    Cancelado: "#f87171",
};

// Mismos colores que usa el tablero Kanban de PQR (GestionPQR.jsx).
const PQR_ESTADOS_COLOR = {
    Abierta: "#fbbf24",
    "En proceso": "#22d3ee",
    Cerrada: "#34d399",
};

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Rangos de fecha disponibles para el filtro del dashboard.
const RANGOS = [
    { dias: 1, label: "Hoy" },
    { dias: 7, label: "7 días" },
    { dias: 30, label: "30 días" },
];

const formatearMoneda = (valor) => {
    try {
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
            notation: valor >= 1000000 ? "compact" : "standard",
        }).format(valor || 0);
    } catch {
        return `$${valor || 0}`;
    }
};

// Etiqueta de un día del eje X: con 1 día basta "Hoy"; con hasta 7 el nombre
// corto del día alcanza y es más legible; con 30 el nombre del día se
// repetiría varias veces y confundiría, así que se usa "d/m".
const formatearEtiquetaDia = (fecha, dias) => {
    if (dias === 1) return "Hoy";
    if (dias <= 7) return DIAS_SEMANA[fecha.getDay()];
    return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
};

// Agrupa `items` (cualquier lista con un campo `fecha`) en `dias` cubetas
// diarias consecutivas terminando hoy, sumando `obtenerValor(item)` en la
// cubeta del día que le corresponda. Reutilizable para ingresos, pedidos, etc.
function agruparPorDia(items, dias, obtenerValor) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const cubetas = Array.from({ length: dias }, (_, i) => {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - (dias - 1 - i));
        return { fecha, label: formatearEtiquetaDia(fecha, dias), value: 0 };
    });

    items.forEach((item) => {
        if (!item.fecha) return;
        const f = new Date(item.fecha);
        f.setHours(0, 0, 0, 0);
        const cubeta = cubetas.find((c) => c.fecha.getTime() === f.getTime());
        if (cubeta) cubeta.value += obtenerValor(item);
    });

    return cubetas.map(({ label, value }) => ({ label, value }));
}

// Clases completas por color (Tailwind necesita ver el nombre de la clase
// escrito literalmente en el código para generarla; una plantilla como
// `bg-${color}-400/10` no funciona), mismo criterio que COLORES en Perfil.jsx.
const KPI_COLOR = {
    cyan: "bg-cyan-400/10 text-cyan-300",
    orange: "bg-orange-400/10 text-orange-300",
    amber: "bg-amber-400/10 text-amber-300",
    violet: "bg-violet-400/10 text-violet-300",
};

// Tarjeta de indicador clave (KPI), reutilizada para las 4 del encabezado.
function TarjetaKpi({ icono: Icono, color, etiqueta, valor, subtitulo }) {
    return (
        <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-4 sm:p-5">
            <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${KPI_COLOR[color]}`}>
                    <Icono className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{etiqueta}</p>
            </div>
            <p className="mt-3 truncate text-2xl font-black text-white">{valor}</p>
            {subtitulo && <p className="mt-1 text-xs text-slate-500">{subtitulo}</p>}
        </div>
    );
}

function GestionEstadisticas() {
    const usuarioGuardado =
        localStorage.getItem("usuario") || sessionStorage.getItem("usuario");
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

    // Mismo criterio que GestionProductos.jsx: esta página vive en una sola
    // ruta compartida, y adentro decide qué mostrar según el rol de quien
    // inició sesión.
    const rol = usuario?.rol === "Empleado" ? "Empleado" : "Administrador";
    const esAdmin = rol === "Administrador";

    const obtenerToken = () =>
        localStorage.getItem("token") || sessionStorage.getItem("token");

    const [rango, setRango] = useState(RANGOS[1]); // 7 días por defecto

    const [pedidos, setPedidos] = useState([]);
    const [productos, setProductos] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [facturas, setFacturas] = useState([]);
    const [pqr, setPqr] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [cargandoDatos, setCargandoDatos] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            setCargandoDatos(true);
            try {
                const headers = { Authorization: `Bearer ${obtenerToken()}` };

                // Pedidos, facturas y PQR los usan ambos roles; productos y
                // usuarios solo el Administrador, para no pedirle al backend
                // algo que el Empleado no va a graficar (ni tiene permiso de
                // consultar, en el caso de usuarios).
                const peticiones = [
                    fetch(`${API_URL}/pedidos/todos`, { headers }),
                    fetch(`${API_URL}/servicios`),
                    fetch(`${API_URL}/facturas`, { headers }),
                    fetch(`${API_URL}/pqr`, { headers }),
                ];

                if (esAdmin) {
                    peticiones.push(fetch(`${API_URL}/productos`));
                    peticiones.push(fetch(`${API_URL}/usuarios`, { headers }));
                }

                const [respPedidos, respServicios, respFacturas, respPqr, respProductos, respUsuarios] =
                    await Promise.all(peticiones);

                const datosPedidos = await respPedidos.json().catch(() => ({}));
                const datosServicios = await respServicios.json().catch(() => ({}));
                const datosFacturas = await respFacturas.json().catch(() => ({}));
                const datosPqr = await respPqr.json().catch(() => ({}));

                setPedidos(Array.isArray(datosPedidos.pedidos) ? datosPedidos.pedidos : []);
                setServicios(Array.isArray(datosServicios.servicios) ? datosServicios.servicios : []);
                setFacturas(Array.isArray(datosFacturas.facturas) ? datosFacturas.facturas : []);
                setPqr(Array.isArray(datosPqr.pqr) ? datosPqr.pqr : []);

                if (esAdmin && respProductos) {
                    const datosProductos = await respProductos.json().catch(() => ({}));
                    setProductos(Array.isArray(datosProductos.productos) ? datosProductos.productos : []);
                }
                if (esAdmin && respUsuarios) {
                    const datosUsuarios = await respUsuarios.json().catch(() => ({}));
                    setUsuarios(Array.isArray(datosUsuarios.usuarios) ? datosUsuarios.usuarios : []);
                }
            } catch (err) {
                console.error("❌ Error al cargar datos de estadísticas:", err);
            } finally {
                setCargandoDatos(false);
            }
        };

        cargarDatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [esAdmin]);

    // ==========================================
    // FILTRO DE RANGO — todo lo que depende de una fecha se recalcula con
    // el mismo punto de corte (medianoche de hace `rango.dias - 1` días).
    // ==========================================

    const inicioRango = useMemo(() => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const inicio = new Date(hoy);
        inicio.setDate(inicio.getDate() - (rango.dias - 1));
        return inicio;
    }, [rango]);

    const dentroDelRango = (fecha) => {
        if (!fecha) return false;
        return new Date(fecha) >= inicioRango;
    };

    const pedidosEnRango = useMemo(() => pedidos.filter((p) => dentroDelRango(p.fecha)), [pedidos, inicioRango]);
    const facturasVigentes = useMemo(() => facturas.filter((f) => f.estado !== "Anulada"), [facturas]);
    const facturasVigentesEnRango = useMemo(
        () => facturasVigentes.filter((f) => dentroDelRango(f.fecha)),
        [facturasVigentes, inicioRango]
    );

    // ==========================================
    // KPI (indicadores clave del encabezado)
    // ==========================================

    const ventasRango = useMemo(
        () => facturasVigentesEnRango.reduce((acc, f) => acc + (Number(f.total) || 0), 0),
        [facturasVigentesEnRango]
    );

    const pqrAbiertas = useMemo(() => pqr.filter((p) => p.estado !== "Cerrada").length, [pqr]);

    const clientesRegistrados = useMemo(
        () => usuarios.filter((u) => u.rol === "Cliente").length,
        [usuarios]
    );

    // ==========================================
    // GRÁFICAS EN EL TIEMPO (dependen del rango seleccionado)
    // ==========================================

    // Ventas por día (Admin) — a partir de las FACTURAS (el registro real
    // de cada venta, con su descuento ya aplicado), no de los pedidos: es
    // el mismo criterio que el reporte diario de ventas en PDF.
    const ventasPorDia = useMemo(
        () => agruparPorDia(facturasVigentes, rango.dias, (f) => Number(f.total) || 0),
        [facturasVigentes, rango]
    );

    // Cantidad de pedidos recibidos por día (Empleado) — volumen de trabajo,
    // no dinero.
    const pedidosPorDia = useMemo(
        () => agruparPorDia(pedidos, rango.dias, () => 1),
        [pedidos, rango]
    );

    // Pedidos agrupados por estado, DENTRO DEL RANGO seleccionado — a
    // diferencia de PQR/servicios/catálogo, que son una foto del estado
    // actual y no cambian con el filtro.
    const pedidosPorEstado = useMemo(() => {
        return Object.keys(ESTADOS_COLOR).map((estado) => ({
            label: estado,
            value: pedidosEnRango.filter((p) => p.estado === estado).length,
            color: ESTADOS_COLOR[estado],
        }));
    }, [pedidosEnRango]);

    // ==========================================
    // ESTADO ACTUAL (no dependen del rango de fechas)
    // ==========================================

    const pqrPorEstado = useMemo(() => {
        return Object.keys(PQR_ESTADOS_COLOR).map((estado) => ({
            label: estado,
            value: pqr.filter((p) => p.estado === estado).length,
            color: PQR_ESTADOS_COLOR[estado],
        }));
    }, [pqr]);

    // Productos por categoría (Admin), siempre en el mismo orden fijo.
    const productosPorCategoria = useMemo(() => {
        return Object.keys(CATEGORIAS_COLOR).map((categoria) => ({
            label: categoria,
            value: productos.filter((p) => p.categoria === categoria).length,
            color: CATEGORIAS_COLOR[categoria],
        }));
    }, [productos]);

    // Servicios activos vs inactivos (Empleado).
    const serviciosPorEstado = useMemo(() => {
        return [
            {
                label: "Activos",
                value: servicios.filter((s) => s.estado === "Activo").length,
                color: "#34d399",
            },
            {
                label: "Inactivos",
                value: servicios.filter((s) => s.estado !== "Activo").length,
                color: "#f87171",
            },
        ];
    }, [servicios]);

    // Mismo dato de servicios, como una sola proporción (Admin): cuántos de
    // los servicios totales están activos.
    const serviciosActivos = useMemo(
        () => servicios.filter((s) => s.estado === "Activo").length,
        [servicios]
    );
    const serviciosTotal = servicios.length;

    return (
        <PanelLayout rol={rol} seccionActiva="estadisticas" subtitulo="Diagramas de estadísticas">

            <section className="mb-6">
                <div className="mb-2 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                        Reportes
                    </span>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                            Dashboard de estadísticas
                        </h2>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                            {esAdmin
                                ? "Ventas, pedidos, PQR y catálogo de JR TECH, en una sola vista."
                                : "Pedidos, ventas, PQR y servicios de JR TECH, en una sola vista."}
                        </p>
                    </div>

                    {/* FILTRO DE RANGO */}
                    <div className="inline-flex items-center gap-1 self-start rounded-xl border border-slate-800 bg-[#0b111d] p-1">
                        {RANGOS.map((r) => (
                            <button
                                key={r.dias}
                                onClick={() => setRango(r)}
                                className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                                    rango.dias === r.dias
                                        ? "bg-cyan-400 text-slate-950"
                                        : "text-slate-400 hover:text-white"
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* KPI */}
            <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {cargandoDatos ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-800/40" />
                    ))
                ) : (
                    <>
                        <TarjetaKpi
                            icono={IconCoin}
                            color="cyan"
                            etiqueta="Ventas"
                            valor={formatearMoneda(ventasRango)}
                            subtitulo={`${rango.label} · ${facturasVigentesEnRango.length} factura(s)`}
                        />
                        <TarjetaKpi
                            icono={IconReceipt}
                            color="orange"
                            etiqueta="Pedidos"
                            valor={pedidosEnRango.length}
                            subtitulo={rango.label}
                        />
                        <TarjetaKpi
                            icono={IconChat}
                            color="amber"
                            etiqueta="PQR abiertas"
                            valor={pqrAbiertas}
                            subtitulo={`de ${pqr.length} en total`}
                        />
                        {esAdmin ? (
                            <TarjetaKpi
                                icono={IconUsers}
                                color="violet"
                                etiqueta="Usuarios"
                                valor={usuarios.length}
                                subtitulo={`${clientesRegistrados} clientes`}
                            />
                        ) : (
                            <TarjetaKpi
                                icono={IconWrench}
                                color="violet"
                                etiqueta="Servicios activos"
                                valor={serviciosActivos}
                                subtitulo={`de ${serviciosTotal} en total`}
                            />
                        )}
                    </>
                )}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">

                {esAdmin ? (
                    <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5 lg:col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                                    <IconChartBar className="h-4 w-4" />
                                </div>
                                <p className="text-sm font-bold text-white">Ventas · {rango.label.toLowerCase()}</p>
                            </div>
                            <span className="text-xs font-bold text-cyan-300">
                                {formatearMoneda(ventasPorDia.reduce((s, d) => s + d.value, 0))}
                            </span>
                        </div>

                        {cargandoDatos ? (
                            <div className="h-32 animate-pulse rounded-xl bg-slate-800/40" />
                        ) : (
                            <AreaLineChart
                                data={ventasPorDia}
                                color="#22d3ee"
                                formatValue={formatearMoneda}
                                vacio="Todavía no hay ventas registradas en este período."
                            />
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5 lg:col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                                    <IconChartBar className="h-4 w-4" />
                                </div>
                                <p className="text-sm font-bold text-white">Pedidos recibidos · {rango.label.toLowerCase()}</p>
                            </div>
                            <span className="text-xs font-bold text-cyan-300">
                                {pedidosPorDia.reduce((s, d) => s + d.value, 0)} en total
                            </span>
                        </div>

                        {cargandoDatos ? (
                            <div className="h-32 animate-pulse rounded-xl bg-slate-800/40" />
                        ) : (
                            <AreaLineChart
                                data={pedidosPorDia}
                                color="#22d3ee"
                                vacio="Todavía no hay pedidos registrados en este período."
                            />
                        )}
                    </div>
                )}

                <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300">
                            <IconReceipt className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-bold text-white">Pedidos por estado · {rango.label.toLowerCase()}</p>
                    </div>

                    {cargandoDatos ? (
                        <div className="h-32 animate-pulse rounded-xl bg-slate-800/40" />
                    ) : (
                        <StatusBreakdownBars data={pedidosPorEstado} />
                    )}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                            <IconChat className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-bold text-white">PQR por estado</p>
                    </div>

                    {cargandoDatos ? (
                        <div className="h-32 animate-pulse rounded-xl bg-slate-800/40" />
                    ) : (
                        <StatusBreakdownBars data={pqrPorEstado} />
                    )}
                </div>

                {esAdmin ? (
                    <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                                <IconWrench className="h-4 w-4" />
                            </div>
                            <p className="text-sm font-bold text-white">Servicios</p>
                        </div>

                        {cargandoDatos ? (
                            <div className="h-32 animate-pulse rounded-xl bg-slate-800/40" />
                        ) : (
                            <Meter
                                value={serviciosActivos}
                                total={serviciosTotal}
                                etiquetaCentro="Activos"
                                descripcion={`${serviciosActivos} de ${serviciosTotal} servicios activos`}
                                vacio="Todavía no hay servicios registrados."
                            />
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                                <IconWrench className="h-4 w-4" />
                            </div>
                            <p className="text-sm font-bold text-white">Servicios activos</p>
                        </div>

                        {cargandoDatos ? (
                            <div className="h-32 animate-pulse rounded-xl bg-slate-800/40" />
                        ) : (
                            <StatusBreakdownBars data={serviciosPorEstado} />
                        )}
                    </div>
                )}

                {esAdmin && (
                    <div className="rounded-2xl border border-slate-800 bg-[#0b111d] p-5 lg:col-span-2">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300">
                                <IconBox className="h-4 w-4" />
                            </div>
                            <p className="text-sm font-bold text-white">Catálogo por categoría</p>
                        </div>

                        {cargandoDatos ? (
                            <div className="h-48 animate-pulse rounded-xl bg-slate-800/40" />
                        ) : (
                            <DonutChart data={productosPorCategoria} vacio="Todavía no hay productos registrados." />
                        )}
                    </div>
                )}

            </section>

        </PanelLayout>
    );
}

export default GestionEstadisticas;
