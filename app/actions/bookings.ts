"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function getAuthBusiness() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const business = await prisma.business.findUnique({ where: { ownerId: user.id } });
  if (!business) redirect("/onboarding");
  return business;
}

export async function cambiarEstadoCita(citaId: string, nuevoEstado: string) {
  const business = await getAuthBusiness();

  // Verificar que la cita pertenece a este negocio
  const cita = await prisma.booking.findFirst({
    where: { id: citaId, businessId: business.id },
  });
  if (!cita) return;

  const data: Record<string, unknown> = { status: nuevoEstado };
  if (nuevoEstado === "CONFIRMED") data.confirmedAt = new Date();
  if (nuevoEstado === "CANCELLED") data.cancelledAt = new Date();

  await prisma.booking.update({ where: { id: citaId }, data });
  revalidatePath("/dashboard");
}
