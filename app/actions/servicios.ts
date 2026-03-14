"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getAuthBusiness() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const business = await prisma.business.findUnique({ where: { ownerId: user.id } });
  if (!business) redirect("/onboarding");
  return business;
}

const servicioSchema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  duration: z.coerce.number().min(15, "Mínimo 15 minutos"),
  price: z.coerce.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
});

export async function crearServicio(_prev: { error?: string }, formData: FormData) {
  const business = await getAuthBusiness();

  const raw = {
    name: formData.get("name") as string,
    duration: formData.get("duration") as string,
    price: formData.get("price") || null,
    description: formData.get("description") || null,
  };

  const result = servicioSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };

  await prisma.service.create({
    data: { ...result.data, businessId: business.id },
  });

  revalidatePath("/dashboard/servicios");
  redirect("/dashboard/servicios");
}

export async function editarServicio(_prev: { error?: string }, formData: FormData) {
  const business = await getAuthBusiness();
  const id = formData.get("id") as string;

  // Verificar propiedad
  const servicio = await prisma.service.findFirst({ where: { id, businessId: business.id } });
  if (!servicio) return { error: "Servicio no encontrado" };

  const raw = {
    name: formData.get("name") as string,
    duration: formData.get("duration") as string,
    price: formData.get("price") || null,
    description: formData.get("description") || null,
  };

  const result = servicioSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };

  await prisma.service.update({ where: { id }, data: result.data });

  revalidatePath("/dashboard/servicios");
  redirect("/dashboard/servicios");
}

export async function eliminarServicio(id: string) {
  const business = await getAuthBusiness();
  await prisma.service.deleteMany({ where: { id, businessId: business.id } });
  revalidatePath("/dashboard/servicios");
}
