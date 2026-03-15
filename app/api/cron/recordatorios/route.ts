import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarRecordatorioCita } from "@/lib/email";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const dynamic = "force-dynamic";

// Vercel llama este endpoint cada hora. Enviamos recordatorio a citas
// que empiecen entre 2.5 y 3.5 horas desde ahora (ventana de 1 hora).
export async function GET(req: NextRequest) {
  // Protección básica: solo Vercel Cron o llamadas con el secret
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 2.5 * 60 * 60 * 1000); // +2:30h
  const windowEnd   = new Date(now.getTime() + 3.5 * 60 * 60 * 1000); // +3:30h

  const todayStr = format(now, "yyyy-MM-dd");

  // Formatear las horas de la ventana como "HH:mm" para comparar con startTime (string)
  const fromTime = format(windowStart, "HH:mm");
  const toTime   = format(windowEnd,   "HH:mm");

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

  let enviados = 0;

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

      await prisma.booking.update({
        where: { id: cita.id },
        data: { reminderSent: true },
      });

      enviados++;
    } catch (err) {
      console.error(`[recordatorio] Error en cita ${cita.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, enviados, revisadas: citas.length });
}
