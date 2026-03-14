export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ServiciosClient } from "./servicios-client";

export default async function ServiciosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: user.id } });
  if (!business) redirect("/onboarding");

  const servicios = await prisma.service.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "asc" },
  });

  return <ServiciosClient servicios={servicios} />;
}
