function Button({
  children,
  type = "button",
  onClick,
  disabled = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 px-5 py-3 font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
    >
      {/* Efecto de brillo */}
      <span className="absolute inset-0 -translate-x-full bg-white/30 transition-transform duration-700 group-hover:translate-x-full" />

      <span className="relative flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}

export default Button;