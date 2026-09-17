import { IconWarning } from "./Icons";

function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  maxLength,
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

      {/* CAMPO */}
      <div className="relative">

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full rounded-xl border-2 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-white outline-none transition-all duration-300 placeholder:text-slate-500 ${
            error
              ? "border-red-400/60 bg-red-500/5 focus:border-red-400 focus:ring-4 focus:ring-red-500/20"
              : "border-slate-700 hover:border-cyan-400/40 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20"
          }`}
        />

        {/* Brillo inferior */}
        {!error && (
          <div className="pointer-events-none absolute bottom-0 left-4 right-4 h-[2px] scale-x-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-transform duration-300 group-focus-within:scale-x-100" />
        )}

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

export default Input;