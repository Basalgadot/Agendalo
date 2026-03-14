import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAvailableSlots } from "@/lib/slots";
import { parseISO, isValid } from "date-fns";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = req.nextUrl;

  const date = searchParams.get("date");      // "2026-03-20"
  const serviceId = searchParams.get("serviceId");
  const professionalId = searchParams.get("professionalId"); // puede ser "any"

  if (!date || !serviceId) {
    return NextResponse.json({ error: "Faltan parámetros: date, serviceId" }, { status: 400 });
  }

  const parsedDate = parseISO(date);
  if (!isValid(parsedDate)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const dayOfWeek = parsedDate.getDay(); // 0=domingo

  // Buscar negocio
  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    include: {
      schedules: { where: { dayOfWeek } },
      blockedSlots: {
        where: {
          date: parsedDate,
          OR: [
            { isAllDay: true },
            { isAllDay: false },
          ],
        },
      },
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  // Verificar horario del negocio ese día
  const horarioDia = business.schedules[0];
  if (!horarioDia || !horarioDia.isOpen) {
    return NextResponse.json({ slots: [] }); // día cerrado
  }

  // Buscar servicio
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: business.id, isActive: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  // Determinar profesionales a consultar
  let professionals;
  if (professionalId && professionalId !== "any") {
    professionals = await prisma.professional.findMany({
      where: { id: professionalId, businessId: business.id, isActive: true },
      include: { scheduleOverrides: { where: { dayOfWeek } } },
    });
  } else {
    // Profesionales que ofrecen este servicio
    professionals = await prisma.professional.findMany({
      where: {
        businessId: business.id,
        isActive: true,
        services: { some: { serviceId } },
      },
      include: { scheduleOverrides: { where: { dayOfWeek } } },
    });
  }

  if (professionals.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  // Calcular slots para cada profesional y combinar disponibilidad
  const slotsMap: Map<string, { startTime: string; endTime: string; available: boolean; professionalIds: string[] }> = new Map();

  for (const prof of professionals) {
    // Horario del profesional (override o el del negocio)
    const overrideHorario = prof.scheduleOverrides[0];
    const openTime = overrideHorario?.openTime ?? horarioDia.openTime;
    const closeTime = overrideHorario?.closeTime ?? horarioDia.closeTime;
    const isOpenDay = overrideHorario ? overrideHorario.isOpen : horarioDia.isOpen;

    if (!isOpenDay) continue;

    // Citas existentes para este profesional en esta fecha
    const bookings = await prisma.booking.findMany({
      where: { professionalId: prof.id, date: parsedDate },
      select: { startTime: true, endTime: true, status: true },
    });

    // Bloqueos para este profesional (o globales del negocio)
    const bloqueos = business.blockedSlots.filter(
      (b) => !b.professionalId || b.professionalId === prof.id
    );

    const profSlots = computeAvailableSlots({
      openTime,
      closeTime,
      serviceDuration: service.duration,
      slotDuration: business.slotDuration,
      existingBookings: bookings,
      blockedSlots: bloqueos.map((b) => ({
        startTime: b.isAllDay ? openTime : b.startTime,
        endTime: b.isAllDay ? closeTime : b.endTime,
      })),
    });

    for (const slot of profSlots) {
      const key = slot.startTime;
      if (!slotsMap.has(key)) {
        slotsMap.set(key, { ...slot, professionalIds: [] });
      }
      const existing = slotsMap.get(key)!;
      // El slot está disponible si AL MENOS UN profesional está disponible
      if (slot.available) {
        existing.available = true;
        existing.professionalIds.push(prof.id);
      }
    }
  }

  const slots = Array.from(slotsMap.values()).sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  return NextResponse.json({ slots });
}
