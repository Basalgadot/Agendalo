import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseISO, isValid, format } from "date-fns";
import { es } from "date-fns/locale";
import { enviarConfirmacionCliente, enviarNotificacionNegocio } from "@/lib/email";

const bodySchema = z.object({
  businessSlug: z.string(),
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  date: z.string(),       // "2026-03-20"
  startTime: z.string(),  // "10:00"
  endTime: z.string(),    // "10:30"
  // Cliente registrado
  clientId: z.string().optional(),
  // Cliente invitado
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const result = bodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const data = result.data;

  // Validar que hay datos de cliente (registrado o invitado)
  if (!data.clientId && (!data.guestName || !data.guestEmail || !data.guestPhone)) {
    return NextResponse.json(
      { error: "Se requiere nombre, email y teléfono del cliente" },
      { status: 400 }
    );
  }

  const parsedDate = parseISO(data.date);
  if (!isValid(parsedDate)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  // Verificar que el negocio existe
  const business = await prisma.business.findUnique({
    where: { slug: data.businessSlug, isActive: true },
    select: {
      id: true, name: true, slug: true, plan: true, email: true,
      primaryColor: true, logoUrl: true, phone: true, address: true,
      instagram: true, website: true,
    },
  });
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  // Verificar límite de citas en plan FREE (20/mes)
  if (business.plan === "FREE") {
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const citasMes = await prisma.booking.count({
      where: {
        businessId: business.id,
        createdAt: { gte: inicioMes },
        status: { not: "CANCELLED" },
      },
    });
    if (citasMes >= 20) {
      return NextResponse.json(
        { error: "Este negocio alcanzó su límite de citas del mes" },
        { status: 403 }
      );
    }
  }

  // Verificar que el slot sigue disponible (doble check de race condition)
  const conflicto = await prisma.booking.findFirst({
    where: {
      professionalId: data.professionalId,
      date: parsedDate,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      AND: [
        { startTime: { lt: data.endTime } },
        { endTime: { gt: data.startTime } },
      ],
    },
  });

  if (conflicto) {
    return NextResponse.json(
      { error: "Este horario ya no está disponible. Por favor elige otro." },
      { status: 409 }
    );
  }

  // Obtener servicio y profesional para los emails
  const [service, professional] = await Promise.all([
    prisma.service.findUnique({ where: { id: data.serviceId } }),
    prisma.professional.findUnique({ where: { id: data.professionalId } }),
  ]);

  if (!service || !professional) {
    return NextResponse.json({ error: "Servicio o profesional no encontrado" }, { status: 404 });
  }

  // Crear la cita
  const booking = await prisma.booking.create({
    data: {
      date: parsedDate,
      startTime: data.startTime,
      endTime: data.endTime,
      status: "CONFIRMED",
      confirmedAt: new Date(),
      notes: data.notes || null,
      businessId: business.id,
      serviceId: data.serviceId,
      professionalId: data.professionalId,
      clientId: data.clientId || null,
      guestName: data.guestName || null,
      guestEmail: data.guestEmail || null,
      guestPhone: data.guestPhone || null,
    },
  });

  // Enviar emails (en paralelo, sin bloquear la respuesta)
  const clientName = data.guestName ?? "Cliente";
  const clientEmail = data.guestEmail;
  const dateLabel = format(parsedDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });

  const emailPromises = [];

  const businessBranding = {
    name: business.name,
    primaryColor: business.primaryColor,
    logoUrl: business.logoUrl,
    phone: business.phone,
    address: business.address,
    instagram: business.instagram,
    website: business.website,
  };

  if (clientEmail) {
    emailPromises.push(
      enviarConfirmacionCliente({
        toEmail: clientEmail,
        toName: clientName,
        business: businessBranding,
        serviceName: service.name,
        professionalName: professional.name,
        date: dateLabel,
        startTime: data.startTime,
        endTime: data.endTime,
      })
    );
  }

  if (business.email) {
    emailPromises.push(
      enviarNotificacionNegocio({
        toEmail: business.email,
        business: businessBranding,
        clientName,
        clientEmail: data.guestEmail,
        clientPhone: data.guestPhone,
        serviceName: service.name,
        professionalName: professional.name,
        date: dateLabel,
        startTime: data.startTime,
      })
    );
  }

  // Enviar emails sin await (no bloquear respuesta al usuario)
  Promise.allSettled(emailPromises).catch(() => {});

  return NextResponse.json({
    bookingId: booking.id,
    message: "Cita confirmada",
  });
}
