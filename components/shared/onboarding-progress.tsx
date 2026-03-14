const pasos = [
  "Tu negocio",
  "Logo y portada",
  "Horarios",
  "Primer servicio",
  "Primer profesional",
];

export function OnboardingProgress({ actual }: { actual: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {pasos.map((nombre, i) => {
          const num = i + 1;
          const done = num < actual;
          const current = num === actual;
          return (
            <div key={num} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  done
                    ? "bg-primary border-primary text-white"
                    : current
                    ? "border-primary text-primary bg-white"
                    : "border-border text-muted-foreground bg-white"
                }`}
              >
                {done ? "✓" : num}
              </div>
              <span
                className={`text-xs mt-1 text-center hidden sm:block ${
                  current ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                {nombre}
              </span>
            </div>
          );
        })}
      </div>
      {/* Línea de progreso */}
      <div className="relative mt-1">
        <div className="h-1 bg-border rounded-full" />
        <div
          className="h-1 bg-primary rounded-full absolute top-0 left-0 transition-all"
          style={{ width: `${((actual - 1) / (pasos.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
