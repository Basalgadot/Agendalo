export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ConfiguracionClient } from "./configuracion-client";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { ownerId: user.id },
    include: { schedules: { orderBy: { dayOfWeek: "asc" } } },
  });
  if (!business) redirect("/onboarding");

  return <ConfiguracionClient business={business} schedules={business.schedules} />;
}
