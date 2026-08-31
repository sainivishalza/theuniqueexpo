export default function Logo({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const sizes = { small: { box: "w-7 h-7", text: "text-sm", brand: "text-lg" }, default: { box: "w-8 h-8", text: "text-sm", brand: "text-xl" }, large: { box: "w-12 h-12", text: "text-lg", brand: "text-3xl" } };
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2.5 group">
      <div className={`${s.box} rounded-lg bg-gradient-to-br from-emerald-600 via-teal-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm`}>
        <svg viewBox="0 0 24 24" fill="none" className={`${size === "small" ? "w-4 h-4" : size === "large" ? "w-7 h-7" : "w-5 h-5"}`}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className={`${s.brand} font-extrabold tracking-tight text-gray-900 leading-none`}>
        <span className="text-emerald-600">The Unique</span> Expo
      </div>
    </div>
  );
}
