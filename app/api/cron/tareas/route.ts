import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarRecordatorioCita, enviarCampana } from "@/lib/email";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const dynamic = "force-dynamic";

// Cron único (cada hora). Hace dos tareas:
// 1. Recordatorios: citas que empiezan entre 2.5 y 3.5 horas desde ahora
// 2. Campañas: envía campañas programadas cuya fecha ya llegó
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();

  // — Tarea 1: Recordatorios —
  const windowStart = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 3.5 * 60 * 60 * 1000);
  const todayStr    = format(now, "yyyy-MM-dd");
  const fromTime    = format(windowStart, "HH:mm");
  const toTime      = format(windowEnd, "HH:mm");

  const citas = await prisma.booking.findMany({
    where: {
      date: new Date(`${todayStr}T12:00:00Z`),
      startTime: { gte: fromTime, lte: toTime },
      status: { in: ["CONFIRMED", "PENDING"] },
      reminderSent: false,
      guestEmail: { not: null },
    },
    include: {
      business: {
        select: {
          name: true, primaryColor: true, logoUrl: true,
          phone: true, address: true, instagram: true, website: true,
        },
      },
      service: { select: { name: true } },
      professional: { select: { name: true } },
    },
  });

  let recordatoriosEnviados = 0;
  for (const cita of citas) {
    try {
      await enviarRecordatorioCita({
        toEmail: cita.guestEmail!,
        toName: cita.guestName ?? "Cliente",
        business: cita.business,
        serviceName: cita.service.name,
        professionalName: cita.professional.name,
        date: format(cita.date, "EEEE d 'de' MMMM", { locale: es }),
        startTime: cita.startTime,
        endTime: cita.endTime,
      });
      await prisma.booking.update({ where: { id: cita.id }, data: { reminderSent: true } });
      recordatoriosEnviados++;
    } catch (err) {
      console.error(`[recordatorio] Error en cita ${cita.id}:`, err);
    }
  }

  // — Tarea 2: Campañas programadas —
  const campanas = await prisma.campaign.findMany({
    where: {
      status: "SCHEDULED",
      sentAt: null,
      scheduledAt: { lte: now },
    },
    include: {
      business: {
        select: {
          name: true, primaryColor: true, logoUrl: true,
          phone: true, address: true, instagram: true, website: true,
        },
      },
    },
  });

  let emailsCampanas = 0;
  for (const campana of campanas) {
    const bookings = await prisma.booking.findMany({
      where: {
        businessId: campana.businessId,
        guestEmail: { not: null },
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      select: { guestEmail: true },
      distinct: ["guestEmail"],
    });

    const emails = bookings.map((b) => b.guestEmail!).filter(Boolean);
    let enviados = 0;

    for (const email of emails) {
      try {
        await enviarCampana({
          toEmail: email,
          business: campana.business,
          subject: campana.subject,
          body: campana.body,
        });
        enviados++;
      } catch (err) {
        console.error(`[campana ${campana.id}] Error enviando a ${email}:`, err);
      }
    }

    await prisma.campaign.update({
      where: { id: campana.id },
      data: { status: "SENT", sentAt: new Date(), recipientCount: enviados },
    });

    emailsCampanas += enviados;
  }

  return NextResponse.json({
    ok: true,
    recordatorios: recordatoriosEnviados,
    campanas: campanas.length,
    emailsCampanas,
  });
}
