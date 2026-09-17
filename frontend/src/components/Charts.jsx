/**
 * Gráficas reutilizables para los dashboards (Admin / Empleado / Cliente).
 * Sin librerías externas: SVG e HTML planos, en el mismo estilo visual del
 * resto del sitio (fondo oscuro, acentos cian/violeta/ámbar...).
 *
 * - AreaLineChart: una sola serie en el tiempo (ingresos, pedidos por día).
 * - CategoryBarChart: barras verticales para comparar categorías (nominal).
 * - StatusBreakdownBars: barras horizontales de proporción (estados, activo/inactivo).
 */

const SURFACE = "#0b111d";

// ==========================================
// LÍNEA / ÁREA (una sola serie en el tiempo)
// ==========================================

export function AreaLineChart({
    data,
    color = "#22d3ee",
    height = 130,
    formatValue = (v) => v,
    vacio = "Sin datos en este período.",
}) {
    const hayDatos = data.length > 0 && data.some((d) => d.value > 0);
    const max = Math.max(1, ...data.map((d) => d.value));
    const n = data.length;

    const puntos = data.map((d, i) => {
        const x = n > 1 ? (i / (n - 1)) * 100 : 50;
        const y = 92 - (d.value / max) * 80;
        return { ...d, x, y };
    });

    const lineaPoints = puntos.map((p) => `${p.x},${p.y}`).join(" ");
    const areaPoints = `0,100 ${lineaPoints} 100,100`;

    const ultimo = puntos[puntos.length - 1];

    return (
        <div>
            <div className="relative" style={{ height }}>
                {!hayDatos && (
                    <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-600">
                        {vacio}
                    </p>
                )}

                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="h-full w-full overflow-visible"
                >
                    {/* línea base (eje) */}
                    <line x1="0" y1="100" x2="100" y2="100" stroke="#1e293b" strokeWidth="0.5" />

                    {hayDatos && (
                        <>
                            <polygon points={areaPoints} fill={color} opacity="0.1" />
                            <polyline
                                points={lineaPoints}
                                fill="none"
                                stroke={color}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                            {puntos.map((p, i) => (
                                <g key={i}>
                                    {/* área de hover más grande que el punto visible */}
                                    <circle cx={p.x} cy={p.y} r="4" fill="transparent">
                                        <title>
                                            {p.label}: {formatValue(p.value)}
                                        </title>
                                    </circle>
                                    {i === puntos.length - 1 && (
                                        <circle
                                            cx={p.x}
                                            cy={p.y}
                                            r="1.6"
                                            fill={color}
                                            stroke={SURFACE}
                                            strokeWidth="1"
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    )}
                                </g>
                            ))}
                        </>
                    )}
                </svg>

                {hayDatos && (
                    <span
                        className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-slate-200 shadow"
                        style={{
                            left: `${ultimo.x}%`,
                            top: `${(ultimo.y / 100) * height - 6}px`,
                        }}
                    >
                        {formatValue(ultimo.value)}
                    </span>
                )}
            </div>

            <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                {puntos.map((p, i) => (
                    <span key={i} className={n > 10 && i % 2 !== 0 ? "hidden sm:inline" : ""}>
                        {p.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ==========================================
// BARRAS VERTICALES (comparar categorías)
// ==========================================

export function CategoryBarChart({ data, height = 160, formatValue = (v) => v, vacio = "Sin datos todavía." }) {
    const hayDatos = data.length > 0 && data.some((d) => d.value > 0);
    const max = Math.max(1, ...data.map((d) => d.value));

    if (!hayDatos) {
        return (
            <div className="flex items-center justify-center text-xs text-slate-600" style={{ height }}>
                {vacio}
            </div>
        );
    }

    return (
        <div className="flex items-end justify-between gap-2" style={{ height }}>
            {data.map((d) => {
                const alturaPct = Math.max(3, (d.value / max) * 100);

                return (
                    <div
                        key={d.label}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                        title={`${d.label}: ${formatValue(d.value)}`}
                    >
                        <span className="text-[10px] font-bold text-slate-300">
                            {d.value > 0 ? formatValue(d.value) : ""}
                        </span>
                        <div className="flex w-full flex-1 items-end justify-center">
                            <div
                                className="w-full max-w-[26px] rounded-t-[4px] transition-all duration-500"
                                style={{
                                    height: `${alturaPct}%`,
                                    backgroundColor: d.color,
                                    minHeight: 3,
                                }}
                            />
                        </div>
                        <span className="w-full truncate text-center text-[9px] leading-tight text-slate-500">
                            {d.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ==========================================
// BARRAS HORIZONTALES DE PROPORCIÓN (estados, activo/inactivo...)
// ==========================================

export function StatusBreakdownBars({ data, formatValue = (v) => v }) {
    const total = data.reduce((suma, d) => suma + d.value, 0);

    return (
        <div className="flex flex-col gap-3">
            {data.map((d) => {
                const pct = total > 0 ? (d.value / total) * 100 : 0;

                return (
                    <div key={d.label} className="flex items-center gap-3">
                        <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: d.color }}
                        />
                        <span className="w-28 flex-shrink-0 truncate text-xs font-semibold text-slate-300 sm:w-32">
                            {d.label}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: d.color }}
                            />
                        </div>
                        <span className="w-10 flex-shrink-0 text-right text-xs font-bold text-slate-400" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {formatValue(d.value)}
                        </span>
                    </div>
                );
            })}

            {total === 0 && (
                <p className="text-center text-xs text-slate-600">Sin datos todavía.</p>
            )}
        </div>
    );
}

// ==========================================
// DONA (proporción entre varias categorías — catálogo por categoría...)
//
// Con leyenda numérica al lado: en una dona nunca alcanza con el ángulo de
// cada segmento para comparar valores parecidos, así que el porcentaje y
// el color de cada categoría se repiten como texto.
// ==========================================

export function DonutChart({ data, size = 160, formatValue = (v) => v, vacio = "Sin datos todavía." }) {
    const total = data.reduce((suma, d) => suma + d.value, 0);

    if (total === 0) {
        return (
            <div className="flex items-center justify-center text-xs text-slate-600" style={{ height: size }}>
                {vacio}
            </div>
        );
    }

    const RADIO = 15.9155; // radio tal que la circunferencia sea ≈100, para trabajar directo en porcentajes
    const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

    let acumulado = 0;
    const segmentos = data
        .filter((d) => d.value > 0)
        .map((d) => {
            const pct = (d.value / total) * 100;
            const segmento = {
                ...d,
                pct,
                dasharray: `${(pct / 100) * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`,
                dashoffset: -((acumulado / 100) * CIRCUNFERENCIA),
            };
            acumulado += pct;
            return segmento;
        });

    return (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r={RADIO} fill="none" stroke="#1e293b" strokeWidth="4" />
                    {segmentos.map((s) => (
                        <circle
                            key={s.label}
                            cx="18"
                            cy="18"
                            r={RADIO}
                            fill="none"
                            stroke={s.color}
                            strokeWidth="4"
                            strokeDasharray={s.dasharray}
                            strokeDashoffset={s.dashoffset}
                        >
                            <title>
                                {s.label}: {formatValue(s.value)} ({s.pct.toFixed(0)}%)
                            </title>
                        </circle>
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-white">{formatValue(total)}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total</span>
                </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {data.map((d) => {
                    const pct = total > 0 ? (d.value / total) * 100 : 0;

                    return (
                        <div key={d.label} className="flex min-w-0 items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                style={{ backgroundColor: d.color }}
                            />
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-300">
                                {d.label}
                            </span>
                            <span className="flex-shrink-0 text-xs font-bold text-slate-500" style={{ fontVariantNumeric: "tabular-nums" }}>
                                {pct.toFixed(0)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ==========================================
// MEDIDOR (una sola proporción contra un total — servicios activos...)
//
// Para dos categorías (activo/inactivo) una dona de 2 gajos es difícil de
// leer; un anillo con un solo porcentaje al centro comunica lo mismo de
// forma más directa.
// ==========================================

export function Meter({ value, total, color = "#34d399", size = 150, etiquetaCentro = "Activos", descripcion, vacio = "Sin datos todavía." }) {
    if (!total) {
        return (
            <div className="flex items-center justify-center text-xs text-slate-600" style={{ height: size }}>
                {vacio}
            </div>
        );
    }

    const pct = Math.round((value / total) * 100);
    const RADIO = 15.9155;
    const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
    const relleno = (pct / 100) * CIRCUNFERENCIA;

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative shrink-0" style={{ width: size, height: size }}>
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r={RADIO} fill="none" stroke="#1e293b" strokeWidth="4" />
                    <circle
                        cx="18"
                        cy="18"
                        r={RADIO}
                        fill="none"
                        stroke={color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${relleno} ${CIRCUNFERENCIA}`}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white">{pct}%</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{etiquetaCentro}</span>
                </div>
            </div>

            {descripcion && <p className="text-center text-xs text-slate-500">{descripcion}</p>}
        </div>
    );
}
