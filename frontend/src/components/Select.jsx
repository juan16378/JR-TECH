import { IconWarning } from "./Icons";

function Select({
  label,
  name,
  value,
  onChange,
  error,
  options,
}) {
  return (
    <div className="group space-y-1.5">

      {/* ETIQUETA */}
      <label
        htmlFor={name}
        className="block text-sm font-bold text-white transition-colors duration-200 group-focus-within:text-cyan-300"
      >
        {label}
      </label>

      <div className="relative">

        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={`w-full cursor-pointer appearance-none rounded-xl border-2 bg-white px-4 py-3 pr-10 text-sm font-semibold text-slate-900 outline-none transition-all duration-300 ${
            error
              ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
              : "border-slate-200 hover:border-cyan-300 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20"
          }`}
        >

          <option
            value=""
            className="text-slate-500"
          >
            Seleccione una opción
          </option>

          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="text-slate-900"
            >
              {option.label}
            </option>
          ))}

        </select>

        {/* FLECHA */}
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-bold text-cyan-600">
          ▼
        </div>

      </div>

      {/* ERROR */}
      {error && (
        <p className="flex items-center gap-1 text-xs font-semibold text-red-400">
          <IconWarning className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}

    </div>
  );
}

export default Select;