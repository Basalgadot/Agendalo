"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { slugify, toSubdomain } from "@/lib/slugify";
import { addDays } from "date-fns";
import { z } from "zod";

// Obtiene el usuario autenticado o redirige a login
async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

// Obtiene el negocio del usuario autenticado
async function getBusinessForUser(userId: string) {
  return prisma.business.findUnique({ where: { ownerId: userId } });
}

// ── PASO 1: Datos del negocio ─────────────────────────────────────────────────

const paso1Schema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  category: z.string().min(1, "Selecciona una categoría"),
  description: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export async function guardarPaso1(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  try {
    const user = await getAuthUser();

    const raw = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
    };

    const result = paso1Schema.safeParse(raw);
    if (!result.success) return { error: result.error.issues[0].message };

    let slug = slugify(result.data.name);
    const subdomain = toSubdomain(result.data.name);

    const existing = await prisma.business.findUnique({ where: { slug } });
    if (existing && existing.ownerId !== user.id) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    await prisma.business.upsert({
      where: { ownerId: user.id },
      update: { ...result.data, slug, subdomain },
      create: {
        ...result.data,
        slug,
        subdomain,
        ownerId: user.id,
        trialEndsAt: addDays(new Date(), 7),
      },
    });

    redirect("/onboarding?paso=2");
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[guardarPaso1]", msg);
    return { error: `Error: ${msg}` };
  }
}

// ── PASO 2: Logo y portada (URLs de Supabase Storage) ────────────────────────

export async function guardarPaso2(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser();

  const logoUrl = formData.get("logoUrl") as string | null;
  const coverUrl = formData.get("coverUrl") as string | null;

  await prisma.business.update({
    where: { ownerId: user.id },
    data: {
      ...(logoUrl && { logoUrl }),
      ...(coverUrl && { coverUrl }),
    },
  });

  redirect("/onboarding?paso=3");
}

// ── PASO 3: Horarios ──────────────────────────────────────────────────────────

const diasSemana = [0, 1, 2, 3, 4, 5, 6] as const;

export async function guardarPaso3(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser();
  const business = await getBusinessForUser(user.id);
  if (!business) redirect("/onboarding");

  const horarios = diasSemana.map((day) => ({
    dayOfWeek: day,
    isOpen: formData.get(`day_${day}_open`) === "on",
    openTime: (formData.get(`day_${day}_from`) as string) || "09:00",
    closeTime: (formData.get(`day_${day}_to`) as string) || "18:00",
  }));

  // Eliminar y recrear horarios
  await prisma.businessSchedule.deleteMany({ where: { businessId: business.id } });
  await prisma.businessSchedule.createMany({
    data: horarios.map((h) => ({ ...h, businessId: business.id })),
  });

  redirect("/onboarding?paso=4");
}

// ── PASO 4: Primer servicio ───────────────────────────────────────────────────

const paso4Schema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  duration: z.coerce.number().min(15, "Mínimo 15 minutos"),
  price: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
});

export async function guardarPaso4(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser();
  const business = await getBusinessForUser(user.id);
  if (!business) redirect("/onboarding");

  const raw = {
    name: formData.get("name") as string,
    duration: formData.get("duration") as string,
    price: formData.get("price") as string,
    description: formData.get("description") as string,
  };

  const result = paso4Schema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };

  await prisma.service.create({
    data: {
      ...result.data,
      price: result.data.price ?? null,
      description: result.data.description || null,
      businessId: business.id,
    },
  });

  redirect("/onboarding?paso=5");
}

// ── PASO 5: Primer profesional ────────────────────────────────────────────────

const paso5Schema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  bio: z.string().optional(),
});

export async function guardarPaso5(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser();
  const business = await getBusinessForUser(user.id);
  if (!business) redirect("/onboarding");

  const raw = {
    name: formData.get("name") as string,
    bio: formData.get("bio") as string,
  };

  const result = paso5Schema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };

  // Crear el profesional
  const profesional = await prisma.professional.create({
    data: {
      name: result.data.name,
      bio: result.data.bio || null,
      businessId: business.id,
    },
  });

  // Asignar todos los servicios existentes a este primer profesional
  const servicios = await prisma.service.findMany({ where: { businessId: business.id } });
  if (servicios.length > 0) {
    await prisma.professionalService.createMany({
      data: servicios.map((s) => ({
        professionalId: profesional.id,
        serviceId: s.id,
      })),
      skipDuplicates: true,
    });
  }

  // Marcar onboarding como completado
  await prisma.business.update({
    where: { id: business.id },
    data: { onboardingCompleted: true },
  });

  redirect("/dashboard");
}
