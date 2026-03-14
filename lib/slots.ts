/**
 * Lógica de disponibilidad de slots.
 * Calcula los horarios libres para un profesional en un día dado,
 * restando las citas existentes y los bloqueos configurados.
 */

export interface SlotTime {
  startTime: string; // "10:00"
  endTime: string;   // "10:30"
  available: boolean;
}

// Convierte "HH:MM" a minutos desde medianoche
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Convierte minutos desde medianoche a "HH:MM"
function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

interface ComputeSlotsInput {
  // Horario de apertura/cierre del día
  openTime: string;  // "09:00"
  closeTime: string; // "18:00"
  // Duración del servicio en minutos
  serviceDuration: number;
  // Duración mínima de slot (de la configuración del negocio)
  slotDuration: number;
  // Citas ya existentes para ese profesional y día
  existingBookings: Array<{ startTime: string; endTime: string; status: string }>;
  // Bloqueos configurados
  blockedSlots: Array<{ startTime: string; endTime: string }>;
}

export function computeAvailableSlots(input: ComputeSlotsInput): SlotTime[] {
  const {
    openTime,
    closeTime,
    serviceDuration,
    slotDuration,
    existingBookings,
    blockedSlots,
  } = input;

  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  const step = slotDuration; // intervalo entre slots (ej: 30 min)

  // Intervalos ocupados (citas activas + bloqueos)
  const occupied: Array<{ start: number; end: number }> = [
    ...existingBookings
      .filter((b) => !["CANCELLED", "NO_SHOW"].includes(b.status))
      .map((b) => ({ start: toMinutes(b.startTime), end: toMinutes(b.endTime) })),
    ...blockedSlots.map((bl) => ({
      start: toMinutes(bl.startTime),
      end: toMinutes(bl.endTime),
    })),
  ];

  const slots: SlotTime[] = [];
  let current = open;

  while (current + serviceDuration <= close) {
    const slotEnd = current + serviceDuration;

    // Verificar si el slot se solapa con algún intervalo ocupado
    const isOccupied = occupied.some(
      (o) => current < o.end && slotEnd > o.start
    );

    slots.push({
      startTime: fromMinutes(current),
      endTime: fromMinutes(slotEnd),
      available: !isOccupied,
    });

    current += step;
  }

  return slots;
}
