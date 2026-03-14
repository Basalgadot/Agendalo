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

const profesionalSchema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  bio: z.string().optional().nullable(),
  order: z.coerce.number().default(0),
});

export async function crearProfesional(_prev: { error?: string }, formData: FormData) {
  const business = await getAuthBusiness();

  const raw = {
    name: formData.get("name") as string,
    bio: formData.get("bio") || null,
    order: formData.get("order") || "0",
  };

  const result = profesionalSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };

  const profesional = await prisma.professional.create({
    data: { ...result.data, businessId: business.id },
  });

  // Asignar servicios seleccionados
  const serviceIds = formData.getAll("serviceIds") as string[];
  if (serviceIds.length > 0) {
    await prisma.professionalService.createMany({
      data: serviceIds.map((sId) => ({ professionalId: profesional.id, serviceId: sId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/dashboard/profesionales");
  redirect("/dashboard/profesionales");
}

export async function editarProfesional(_prev: { error?: string }, formData: FormData) {
  const business = await getAuthBusiness();
  const id = formData.get("id") as string;

  const existente = await prisma.professional.findFirst({ where: { id, businessId: business.id } });
  if (!existente) return { error: "Profesional no encontrado" };

  const raw = {
    name: formData.get("name") as string,
    bio: formData.get("bio") || null,
    order: formData.get("order") || "0",
  };

  const result = profesionalSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };

  await prisma.professional.update({ where: { id }, data: result.data });

  // Actualizar servicios: eliminar y recrear
  await prisma.professionalService.deleteMany({ where: { professionalId: id } });
  const serviceIds = formData.getAll("serviceIds") as string[];
  if (serviceIds.length > 0) {
    await prisma.professionalService.createMany({
      data: serviceIds.map((sId) => ({ professionalId: id, serviceId: sId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/dashboard/profesionales");
  redirect("/dashboard/profesionales");
}

export async function eliminarProfesional(id: string) {
  const business = await getAuthBusiness();
  await prisma.professional.deleteMany({ where: { id, businessId: business.id } });
  revalidatePath("/dashboard/profesionales");
}
