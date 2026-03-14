"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!dbUser || dbUser.role !== "SUPERADMIN") redirect("/dashboard");
}

export async function toggleBusinessActive(businessId: string): Promise<{ error?: string }> {
  await requireSuperadmin();

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { isActive: true },
  });
  if (!business) return { error: "Negocio no encontrado" };

  await prisma.business.update({
    where: { id: businessId },
    data: { isActive: !business.isActive },
  });

  revalidatePath("/admin");
  return {};
}
