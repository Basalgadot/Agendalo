export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CampanasClient } from "./campanas-client";
import { format } from "date-fns";

export default async function CampanasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: user.id } });
  if (!business) redirect("/onboarding");

  const [campanas, clientesCount] = await Promise.all([
    prisma.campaign.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.findMany({
      where: { businessId: business.id, guestEmail: { not: null }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      select: { guestEmail: true },
      distinct: ["guestEmail"],
    }).then((r) => r.length),
  ]);

  return (
    <CampanasClient
      campanas={campanas.map((c) => ({
        id: c.id,
        name: c.name,
        subject: c.subject,
        body: c.body,
        status: c.status,
        scheduledDates: c.scheduledDates.map((d) => format(d, "yyyy-MM-dd")),
        recurrenceRule: c.recurrenceRule,
        recurrenceEndAt: c.recurrenceEndAt ? format(c.recurrenceEndAt, "dd/MM/yyyy") : null,
        sentAt: c.sentAt ? format(c.sentAt, "dd/MM/yyyy HH:mm") : null,
        recipientCount: c.recipientCount,
      }))}
      clientesCount={clientesCount}
    />
  );
}
