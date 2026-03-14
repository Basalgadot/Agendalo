export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AgendaClient } from "./agenda-client";
import { format } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: user.id } });
  if (!business) redirect("/onboarding");
  if (!business.onboardingCompleted) redirect("/onboarding");

  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(inicioSemana.getDate() + 6);

  const [citas, profesionales] = await Promise.all([
    prisma.booking.findMany({
      where: {
        businessId: business.id,
        date: { gte: inicioSemana, lte: finSemana },
      },
      include: { professional: true, service: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.professional.findMany({
      where: { businessId: business.id, isActive: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const trialDaysLeft = business.trialEndsAt
    ? Math.max(0, Math.ceil((business.trialEndsAt.getTime() - Date.now()) / 86400000))
    : null;

  const citasHoyCount = citas.filter(
    (c) => format(c.date, "yyyy-MM-dd") === format(hoy, "yyyy-MM-dd")
  ).length;

  return (
    <AgendaClient
      business={{
        id: business.id,
        name: business.name,
        slug: business.slug,
        plan: business.plan,
        trialDaysLeft,
      }}
      citas={citas.map((c) => ({
        id: c.id,
        date: format(c.date, "yyyy-MM-dd"),
        startTime: c.startTime,
        endTime: c.endTime,
        status: c.status,
        guestName: c.guestName,
        guestEmail: c.guestEmail,
        notes: c.notes,
        professional: { id: c.professional.id, name: c.professional.name },
        service: { id: c.service.id, name: c.service.name, duration: c.service.duration },
      }))}
      profesionales={profesionales.map((p) => ({ id: p.id, name: p.name }))}
      citasHoyCount={citasHoyCount}
      semanaInicio={format(inicioSemana, "yyyy-MM-dd")}
    />
  );
}
