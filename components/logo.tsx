export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      {/* Ícono calendario */}
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="8" width="38" height="31" rx="5" fill="#3A3A3A" stroke="#555" strokeWidth="1.5"/>
        <rect x="9" y="3" width="6" height="11" rx="3" fill="#555"/>
        <rect x="25" y="3" width="6" height="11" rx="3" fill="#555"/>
        <rect x="1" y="8" width="38" height="11" rx="5" fill="#4A4A4A"/>
        <rect x="1" y="16" width="38" height="3" fill="#4A4A4A"/>
        <polyline points="9,26 17,34 32,17" stroke="#F97316" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      {/* Wordmark */}
      <span className="text-3xl font-bold tracking-tight text-white leading-none">
        Ag<span className="relative inline-block">
          {/* "é" naranja debajo */}
          <span className="text-[#F97316]">é</span>
          {/* "e" blanca encima — cubre el cuerpo dejando solo el tilde naranja */}
          <span className="absolute inset-0 text-white">e</span>
        </span>ndalo
      </span>
    </span>
  );
}
