"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingSummary {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string;
  endTime: string;
  status: string;
  guestName: string | null;
  serviceName: string;
  professionalName: string;
  primaryColor: string;
}

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function CalendarioClient({ bookings }: { bookings: BookingSummary[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(
    today.toISOString().split("T")[0]
  );

  const primary = bookings[0]?.primaryColor ?? "#F97316";

  // Días del mes
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  // Lunes=0 … Domingo=6 (europeo)
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  // Agrupar bookings por fecha
  const byDate: Record<string, BookingSummary[]> = {};
  for (const b of bookings) {
    if (!byDate[b.date]) byDate[b.date] = [];
    byDate[b.date].push(b);
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Completar hasta múltiplo de 7
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = today.toISOString().split("T")[0];
  const selectedBookings = selectedDate ? (byDate[selectedDate] ?? []) : [];

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Calendario</h1>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Header navegación */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="font-semibold text-gray-900">
            {MESES[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Encabezados días */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DIAS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Grid días */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="h-14 border-b border-r border-gray-50 last:border-r-0" />;

            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayBookings = byDate[dateStr] ?? [];
            const hasBookings = dayBookings.length > 0;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  "h-14 flex flex-col items-center justify-start pt-2 border-b border-r border-gray-50 last:border-r-0 hover:bg-gray-50 transition-colors relative",
                  isSelected && "bg-gray-50"
                )}
              >
                <span
                  className={cn(
                    "text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium",
                    isToday && "text-white",
                    !isToday && isSelected && "text-gray-900",
                    !isToday && !isSelected && "text-gray-700"
                  )}
                  style={isToday ? { backgroundColor: primary } : {}}
                >
                  {day}
                </span>
                {hasBookings && (
                  <div className="flex gap-0.5 mt-1">
                    {dayBookings.slice(0, 3).map((_, idx) => (
                      <div
                        key={idx}
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: primary }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Citas del día seleccionado */}
      {selectedDate && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-CL", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </h3>

          {selectedBookings.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center bg-white rounded-xl border border-gray-100">
              Sin citas este día
            </p>
          ) : (
            <div className="space-y-2">
              {selectedBookings
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((b) => (
                  <div
                    key={b.id}
                    className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-4"
                  >
                    <div
                      className="w-1 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: primary }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {b.guestName ?? "Cliente"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {b.serviceName} · {b.professionalName}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-700 shrink-0">
                      {b.startTime}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
