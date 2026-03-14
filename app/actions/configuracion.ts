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

const infoSchema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  description: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  slotDuration: z.coerce.number().refine((v) => [15, 30, 60].includes(v), "Duración inválida"),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido").optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
});

type ActionState = { error?: string; success?: boolean };

export async function guardarInfoNegocio(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const business = await getAuthBusiness();

  const raw = {
    name: formData.get("name") as string,
    description: formData.get("description") || null,
    phone: formData.get("phone") || null,
    address: formData.get("address") || null,
    slotDuration: formData.get("slotDuration") as string,
    primaryColor: formData.get("primaryColor") as string || null,
    logoUrl: formData.get("logoUrl") as string || null,
  };

  const result = infoSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };

  await prisma.business.update({ where: { id: business.id }, data: result.data });
  revalidatePath("/dashboard/configuracion");
  return { success: true };
}

const aparienciaSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido"),
  logoUrl: z.string().url("URL de logo inválida").optional().nullable().or(z.literal("")),
  coverUrl: z.string().url("URL de portada inválida").optional().nullable().or(z.literal("")),
});

export async function guardarApariencia(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const business = await getAuthBusiness();

  const raw = {
    primaryColor: (formData.get("primaryColor") as string) || "#F97316",
    logoUrl: (formData.get("logoUrl") as string) || null,
    coverUrl: (formData.get("coverUrl") as string) || null,
  };

  const result = aparienciaSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };

  await prisma.business.update({
    where: { id: business.id },
    data: {
      primaryColor: result.data.primaryColor,
      logoUrl: result.data.logoUrl || null,
      coverUrl: result.data.coverUrl || null,
    },
  });
  revalidatePath("/dashboard/configuracion");
  return { success: true };
}

const DIAS = [0, 1, 2, 3, 4, 5, 6] as const;

export async function guardarHorarios(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const business = await getAuthBusiness();

  const horarios = DIAS.map((day) => ({
    dayOfWeek: day,
    isOpen: formData.get(`day_${day}_open`) === "on",
    openTime: (formData.get(`day_${day}_from`) as string) || "09:00",
    closeTime: (formData.get(`day_${day}_to`) as string) || "18:00",
  }));

  await prisma.businessSchedule.deleteMany({ where: { businessId: business.id } });
  await prisma.businessSchedule.createMany({
    data: horarios.map((h) => ({ ...h, businessId: business.id })),
  });

  revalidatePath("/dashboard/configuracion");
  return { success: true };
}
