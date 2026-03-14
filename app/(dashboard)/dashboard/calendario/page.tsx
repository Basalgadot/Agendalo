export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CalendarioClient } from "./calendario-client";

export default async function CalendarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: user.id } });
  if (!business) redirect("/onboarding");

  // Traer citas del mes actual y el siguiente
  const now = new Date();
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const fin = new Date(now.getFullYear(), now.getMonth() + 2, 0); // fin del mes siguiente

  const bookings = await prisma.booking.findMany({
    where: {
      businessId: business.id,
      date: { gte: inicio, lte: fin },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    include: { service: true, professional: true },
    orderBy: { date: "asc" },
  });

  return (
    <CalendarioClient
      bookings={bookings.map((b) => ({
        id: b.id,
        date: b.date.toISOString().split("T")[0],
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        guestName: b.guestName,
        serviceName: b.service.name,
        professionalName: b.professional.name,
        primaryColor: business.primaryColor ?? "#6C47FF",
      }))}
    />
  );
}
