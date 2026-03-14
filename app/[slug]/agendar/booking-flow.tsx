"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isToday, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, DollarSign, User, Check } from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number | null;
}

interface Professional {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  serviceIds: string[];
}

interface SlotTime {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface Props {
  slug: string;
  businessName: string;
  services: Service[];
  professionals: Professional[];
  slotDuration: number;
  primaryColor: string;
}

type Step = 1 | 2 | 3 | 4;

// ─── Componente principal ─────────────────────────────────────────────────────

export function BookingFlow({ slug, businessName, services, professionals, slotDuration, primaryColor }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null); // null = sin preferencia
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotTime | null>(null);
  const [slots, setSlots] = useState<SlotTime[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario invitado
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");

  const service = services.find((s) => s.id === serviceId);

  // Profesionales que ofrecen el servicio seleccionado
  const profsFiltrados = serviceId
    ? professionals.filter((p) => p.serviceIds.includes(serviceId))
    : professionals;

  const professional = profsFiltrados.find((p) => p.id === professionalId);

  // ── Cargar slots al seleccionar fecha ──
  const cargarSlots = useCallback(async (date: Date, svcId: string, profId: string | null) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const url = new URL(`/api/businesses/${slug}/slots`, window.location.origin);
      url.searchParams.set("date", format(date, "yyyy-MM-dd"));
      url.searchParams.set("serviceId", svcId);
      if (profId) url.searchParams.set("professionalId", profId);
      const res = await fetch(url.toString());
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [slug]);

  // ── Confirmar cita ──
  async function confirmarCita() {
    if (!serviceId || !selectedDate || !selectedSlot || !guestName || !guestEmail || !guestPhone) return;
    setSubmitting(true);
    setError(null);

    // Si no eligió profesional, usar el primero disponible en ese slot
    const availableSlot = slots.find((s) => s.startTime === selectedSlot.startTime && s.available);
    const finalProfId = professionalId ?? (profsFiltrados[0]?.id ?? null);

    if (!finalProfId) {
      setError("No hay profesionales disponibles");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessSlug: slug,
          serviceId,
          professionalId: finalProfId,
          date: format(selectedDate, "yyyy-MM-dd"),
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          guestName,
          guestEmail,
          guestPhone,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Ocurrió un error. Intenta de nuevo.");
        setSubmitting(false);
        return;
      }

      router.push(`/${slug}/agendar/exito?bookingId=${data.bookingId}&name=${encodeURIComponent(guestName)}`);
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.");
      setSubmitting(false);
    }
  }

  // ── Step 1: Seleccionar servicio ──────────────────────────────────────────

  if (step === 1) {
    return (
      <div>
        <StepHeader title="¿Qué servicio necesitas?" step={1} total={4} />
        <div className="space-y-3">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setServiceId(s.id);
                // Si solo hay un profesional para este servicio → saltar paso 2
                const profs = professionals.filter((p) => p.serviceIds.includes(s.id));
                if (profs.length === 1) {
                  setProfessionalId(profs[0].id);
                  setStep(3);
                } else {
                  setProfessionalId(null);
                  setStep(2);
                }
              }}
              className={`w-full text-left border-2 rounded-xl p-4 transition-all ${
                serviceId === s.id ? "brand-selected border-2" : "border-gray-100 hover:border-gray-200 bg-white"
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="font-semibold text-gray-900">{s.name}</p>
                {s.price && (
                  <span className="brand-text font-bold text-sm ml-2 shrink-0">
                    ${s.price.toLocaleString("es-CL")}
                  </span>
                )}
              </div>
              {s.description && <p className="text-sm text-gray-500 mt-0.5">{s.description}</p>}
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {s.duration} minutos
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 2: Seleccionar profesional ───────────────────────────────────────

  if (step === 2) {
    return (
      <div>
        <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Atrás
        </button>
        <StepHeader title="¿Con quién quieres atenderte?" step={2} total={4} />
        <div className="space-y-3">
          {/* Opción: Sin preferencia */}
          <button
            onClick={() => { setProfessionalId(null); setStep(3); }}
            className="w-full text-left border-2 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Sin preferencia</p>
                <p className="text-sm text-gray-500">Cualquier profesional disponible</p>
              </div>
            </div>
          </button>

          {profsFiltrados.map((p) => (
            <button
              key={p.id}
              onClick={() => { setProfessionalId(p.id); setStep(3); }}
              className={`w-full text-left border-2 rounded-xl p-4 transition-all ${
                professionalId === p.id ? "brand-selected" : "border-gray-100 hover:border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  {p.bio && <p className="text-sm text-gray-500">{p.bio}</p>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 3: Seleccionar fecha y hora ──────────────────────────────────────

  if (step === 3) {
    const today = new Date();
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(calMonth),
      end: endOfMonth(calMonth),
    });

    return (
      <div>
        <button onClick={() => setStep(profsFiltrados.length > 1 ? 2 : 1)} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Atrás
        </button>
        <StepHeader title="Elige fecha y hora" step={3} total={4} />

        {/* Calendario */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          {/* Nav mes */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}
              disabled={calMonth.getMonth() === today.getMonth() && calMonth.getFullYear() === today.getFullYear()}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="font-semibold capitalize">{format(calMonth, "MMMM yyyy", { locale: es })}</p>
            <button
              onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Cabecera días */}
          <div className="grid grid-cols-7 mb-1">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
              <p key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</p>
            ))}
          </div>

          {/* Días */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Padding inicial */}
            {Array.from({ length: startOfMonth(calMonth).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {daysInMonth.map((day) => {
              const isPast = isBefore(day, today) && !isToday(day);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              return (
                <button
                  key={day.toISOString()}
                  disabled={isPast}
                  onClick={() => {
                    setSelectedDate(day);
                    if (serviceId) cargarSlots(day, serviceId, professionalId);
                  }}
                  className={`
                    h-9 w-9 mx-auto rounded-full text-sm font-medium transition-all
                    ${isPast ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100 cursor-pointer"}
                    ${isSelected ? "brand-btn" : ""}
                    ${isToday(day) && !isSelected ? "brand-text font-bold" : ""}
                  `}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slots del día */}
        {selectedDate && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="font-semibold text-sm text-gray-700 mb-3">
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </p>

            {loadingSlots && (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
              </div>
            )}

            {!loadingSlots && slots.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">No hay horarios disponibles este día</p>
            )}

            {!loadingSlots && slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {slots.filter((s) => s.available).map((slot) => (
                  <button
                    key={slot.startTime}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setStep(4);
                    }}
                    className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      selectedSlot?.startTime === slot.startTime
                        ? "brand-btn border-transparent"
                        : "border-gray-100 hover:border-gray-300 bg-white"
                    }`}
                  >
                    {slot.startTime}
                  </button>
                ))}
                {slots.every((s) => !s.available) && (
                  <p className="col-span-3 text-center text-sm text-gray-500 py-4">
                    No hay horarios disponibles este día
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Step 4: Datos del cliente + confirmación ──────────────────────────────

  return (
    <div>
      <button onClick={() => setStep(3)} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" /> Atrás
      </button>
      <StepHeader title="Tus datos" step={4} total={4} />

      {/* Resumen */}
      {service && selectedDate && selectedSlot && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 text-sm">
          <p className="font-semibold text-gray-800 mb-2">Resumen de tu cita</p>
          <div className="space-y-1 text-gray-600">
            <p><span className="text-gray-400">Servicio:</span> {service.name}</p>
            {professional && <p><span className="text-gray-400">Profesional:</span> {professional.name}</p>}
            <p><span className="text-gray-400">Fecha:</span> {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}</p>
            <p><span className="text-gray-400">Hora:</span> {selectedSlot.startTime} – {selectedSlot.endTime}</p>
            {service.price && (
              <p className="brand-text font-semibold">${service.price.toLocaleString("es-CL")}</p>
            )}
          </div>
        </div>
      )}

      {/* Formulario invitado */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="María González"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors"
          />
          <p className="text-xs text-gray-400 mt-1">Te enviaremos la confirmación aquí</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
          <input
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="+56 9 1234 5678"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alguna indicación especial..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      <button
        onClick={confirmarCita}
        disabled={submitting || !guestName || !guestEmail || !guestPhone}
        className="brand-btn w-full mt-4 rounded-xl py-4 font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Confirmando..." : "Confirmar cita"}
      </button>
    </div>
  );
}

// ─── Helper: Header del paso ──────────────────────────────────────────────────

function StepHeader({ title, step, total }: { title: string; step: number; total: number }) {
  return (
    <div className="mb-5">
      <p className="text-xs text-gray-400 mb-1">Paso {step} de {total}</p>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {/* Barra de progreso */}
      <div className="h-1 bg-gray-100 rounded-full mt-3">
        <div
          className="h-1 rounded-full brand-btn transition-all"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
