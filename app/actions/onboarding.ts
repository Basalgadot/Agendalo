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

    // Garantizar que el User existe en nuestra DB
    // Si hay un registro con el mismo email pero distinto id (registro previo fallido), lo limpiamos
    await prisma.user.deleteMany({
      where: { email: user.email!, NOT: { id: user.id } },
    });
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email!, name: (user.user_metadata?.name as string) ?? "Usuario" },
      create: {
        id: user.id,
        email: user.email!,
        name: (user.user_metadata?.name as string) ?? "Usuario",
        role: "BUSINESS_OWNER",
      },
    });

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

// ── PASO 4: Servicios ─────────────────────────────────────────────────────────

const servicioSchema = z.object({
  name: z.string().min(2, "Nombre de servicio muy corto"),
  duration: z.coerce.number().min(15, "Mínimo 15 minutos"),
  price: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
});

export async function guardarPaso4(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser();
  const business = await getBusinessForUser(user.id);
  if (!business) redirect("/onboarding");

  const count = Number(formData.get("service_count") || "1");
  const servicios = [];

  for (let i = 0; i < count; i++) {
    const raw = {
      name: formData.get(`service_${i}_name`) as string,
      duration: formData.get(`service_${i}_duration`) as string,
      price: formData.get(`service_${i}_price`) as string,
      description: formData.get(`service_${i}_description`) as string,
    };
    const result = servicioSchema.safeParse(raw);
    if (!result.success) return { error: `Servicio ${i + 1}: ${result.error.issues[0].message}` };
    servicios.push(result.data);
  }

  await prisma.service.createMany({
    data: servicios.map((s) => ({
      name: s.name,
      duration: s.duration,
      price: s.price ?? null,
      description: s.description || null,
      businessId: business.id,
    })),
  });

  redirect("/onboarding?paso=5");
}

// ── PASO 5: Profesionales ─────────────────────────────────────────────────────

const profesionalSchema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  bio: z.string().optional(),
});

export async function guardarPaso5(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser();
  const business = await getBusinessForUser(user.id);
  if (!business) redirect("/onboarding");

  const count = Number(formData.get("prof_count") || "1");
  const profesionalesData = [];

  for (let i = 0; i < count; i++) {
    const raw = {
      name: formData.get(`prof_${i}_name`) as string,
      bio: formData.get(`prof_${i}_bio`) as string,
    };
    const result = profesionalSchema.safeParse(raw);
    if (!result.success) return { error: `Persona ${i + 1}: ${result.error.issues[0].message}` };
    profesionalesData.push(result.data);
  }

  // Crear todos los profesionales y asignarles todos los servicios
  const servicios = await prisma.service.findMany({ where: { businessId: business.id } });

  for (const pd of profesionalesData) {
    const profesional = await prisma.professional.create({
      data: {
        name: pd.name,
        bio: pd.bio || null,
        businessId: business.id,
      },
    });

    if (servicios.length > 0) {
      await prisma.professionalService.createMany({
        data: servicios.map((s) => ({
          professionalId: profesional.id,
          serviceId: s.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  // Marcar onboarding como completado
  await prisma.business.update({
    where: { id: business.id },
    data: { onboardingCompleted: true },
  });

  redirect("/dashboard");
}
