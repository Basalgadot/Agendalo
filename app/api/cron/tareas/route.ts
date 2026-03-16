import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarRecordatorioCita, enviarCampana } from "@/lib/email";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const dynamic = "force-dynamic";

type RecurrenceRule =
  | { type: "daily" }
  | { type: "weekly"; days: number[] }   // 0=Dom, 1=Lun, ..., 6=Sáb
  | { type: "monthly"; dayOfMonth: number };

function debeEnviarHoy(
  scheduledDates: Date[],
  recurrenceRule: string | null,
  recurrenceEndAt: Date | null,
  lastSentDate: string | null,
  todayStr: string,
  dayOfWeek: number,
  dayOfMonth: number
): boolean {
  if (lastSentDate === todayStr) return false; // ya se envió hoy

  // Fechas específicas
  if (scheduledDates.length > 0) {
    const matchesDate = scheduledDates.some(
      (d) => format(d, "yyyy-MM-dd") === todayStr
    );
    if (matchesDate) return true;
  }

  // Recurrencia
  if (recurrenceRule) {
    if (recurrenceEndAt && recurrenceEndAt < new Date()) return false;
    const rule = JSON.parse(recurrenceRule) as RecurrenceRule;
    if (rule.type === "daily") return true;
    if (rule.type === "weekly") return rule.days.includes(dayOfWeek);
    if (rule.type === "monthly") return rule.dayOfMonth === dayOfMonth;
  }

  return false;
}

// Corre cada día a las 9am UTC. Hace dos cosas:
// 1. Recordatorios: avisa a los clientes con cita hoy
// 2. Campañas: envía campañas programadas para hoy (fechas fijas o recurrencia)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const todayDate = new Date(`${todayStr}T12:00:00Z`);
  const dayOfWeek = now.getDay();   // 0=Dom ... 6=Sáb
  const dayOfMonth = now.getDate();

  // — Tarea 1: Recordatorios del día —
  const citas = await prisma.booking.findMany({
    where: {
      date: todayDate,
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

  // — Tarea 2: Campañas programadas para hoy —
  const campanas = await prisma.campaign.findMany({
    where: { status: "SCHEDULED" },
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
    const debeSalir = debeEnviarHoy(
      campana.scheduledDates,
      campana.recurrenceRule,
      campana.recurrenceEndAt,
      campana.lastSentDate,
      todayStr,
      dayOfWeek,
      dayOfMonth
    );
    if (!debeSalir) continue;

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

    const isRecurring = !!campana.recurrenceRule;
    await prisma.campaign.update({
      where: { id: campana.id },
      data: {
        status: isRecurring ? "SCHEDULED" : "SENT",
        sentAt: isRecurring ? undefined : new Date(),
        lastSentDate: todayStr,
        recipientCount: { increment: enviados },
      },
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
