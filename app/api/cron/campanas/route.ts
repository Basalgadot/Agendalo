import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarCampana } from "@/lib/email";

export const dynamic = "force-dynamic";

// Corre cada día a las 9am UTC. Envía campañas programadas para hoy.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();

  // Campañas programadas cuya fecha ya llegó y aún no se han enviado
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

  let totalEnviados = 0;

  for (const campana of campanas) {
    // Obtener emails únicos de clientes con citas confirmadas en este negocio
    const bookings = await prisma.booking.findMany({
      where: {
        businessId: campana.businessId,
        guestEmail: { not: null },
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      select: { guestEmail: true },
      distinct: ["guestEmail"],
    });

    const emails = bookings
      .map((b) => b.guestEmail!)
      .filter(Boolean);

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
      data: {
        status: "SENT",
        sentAt: new Date(),
        recipientCount: enviados,
      },
    });

    totalEnviados += enviados;
  }

  return NextResponse.json({ ok: true, campanasProcesadas: campanas.length, emailsEnviados: totalEnviados });
}
