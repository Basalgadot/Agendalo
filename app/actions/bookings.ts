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

export async function crearCitaManual(formData: FormData): Promise<{ error?: string }> {
  const business = await getAuthBusiness();

  const serviceId = formData.get("serviceId") as string;
  const professionalId = formData.get("professionalId") as string;
  const date = formData.get("date") as string; // "yyyy-MM-dd"
  const startTime = formData.get("startTime") as string; // "HH:mm"
  const guestName = formData.get("guestName") as string;
  const guestPhone = (formData.get("guestPhone") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!serviceId || !professionalId || !date || !startTime || !guestName) {
    return { error: "Completa todos los campos obligatorios" };
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: business.id },
  });
  if (!service) return { error: "Servicio no encontrado" };

  const [h, m] = startTime.split(":").map(Number);
  const endMinutes = h * 60 + m + service.duration;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

  try {
    await prisma.booking.create({
      data: {
        businessId: business.id,
        serviceId,
        professionalId,
        date: new Date(`${date}T12:00:00Z`),
        startTime,
        endTime,
        status: "CONFIRMED",
        confirmedAt: new Date(),
        guestName,
        guestPhone,
        notes,
      },
    });
  } catch {
    return { error: "No se pudo crear la cita. Intenta de nuevo." };
  }

  revalidatePath("/dashboard");
  return {};
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
