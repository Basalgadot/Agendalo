export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfesionalesClient } from "./profesionales-client";

export default async function ProfesionalesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: user.id } });
  if (!business) redirect("/onboarding");

  const [profesionales, servicios] = await Promise.all([
    prisma.professional.findMany({
      where: { businessId: business.id },
      include: { services: { include: { service: true } } },
      orderBy: { order: "asc" },
    }),
    prisma.service.findMany({
      where: { businessId: business.id, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <ProfesionalesClient profesionales={profesionales} servicios={servicios} />;
}
