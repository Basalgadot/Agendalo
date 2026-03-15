"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { enviarCampana } from "@/lib/email";

async function getAuthBusiness() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const business = await prisma.business.findUnique({ where: { ownerId: user.id } });
  if (!business) redirect("/onboarding");
  return business;
}

const campanaSchema = z.object({
  name:        z.string().min(1, "Nombre obligatorio"),
  subject:     z.string().min(1, "Asunto obligatorio"),
  body:        z.string().min(1, "Cuerpo obligatorio"),
  scheduledAt: z.string().optional(), // ISO string o vacío
});

export async function crearCampana(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const business = await getAuthBusiness();

  const raw = {
    name:        formData.get("name") as string,
    subject:     formData.get("subject") as string,
    body:        formData.get("body") as string,
    scheduledAt: formData.get("scheduledAt") as string,
  };

  const result = campanaSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };

  const scheduledAt = result.data.scheduledAt
    ? new Date(result.data.scheduledAt)
    : null;

  await prisma.campaign.create({
    data: {
      businessId:  business.id,
      name:        result.data.name,
      subject:     result.data.subject,
      body:        result.data.body,
      status:      scheduledAt ? "SCHEDULED" : "DRAFT",
      scheduledAt,
    },
  });

  revalidatePath("/dashboard/campanas");
  return {};
}

export async function eliminarCampana(id: string) {
  const business = await getAuthBusiness();
  await prisma.campaign.deleteMany({ where: { id, businessId: business.id } });
  revalidatePath("/dashboard/campanas");
}

export async function enviarCampanaAhora(id: string): Promise<{ error?: string; enviados?: number }> {
  const business = await getAuthBusiness();

  const campana = await prisma.campaign.findFirst({
    where: { id, businessId: business.id },
  });
  if (!campana) return { error: "Campaña no encontrada" };
  if (campana.status === "SENT") return { error: "Esta campaña ya fue enviada" };

  // Emails únicos de clientes con citas
  const bookings = await prisma.booking.findMany({
    where: {
      businessId: business.id,
      guestEmail: { not: null },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    select: { guestEmail: true },
    distinct: ["guestEmail"],
  });

  const emails = bookings.map((b) => b.guestEmail!).filter(Boolean);
  if (emails.length === 0) return { error: "No hay clientes con citas registradas para enviar" };

  let enviados = 0;
  const branding = {
    name: business.name,
    primaryColor: business.primaryColor,
    logoUrl: business.logoUrl,
    phone: business.phone,
    address: business.address,
    instagram: business.instagram,
    website: business.website,
  };

  for (const email of emails) {
    try {
      await enviarCampana({ toEmail: email, business: branding, subject: campana.subject, body: campana.body });
      enviados++;
    } catch {
      // continuar con el siguiente
    }
  }

  await prisma.campaign.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date(), recipientCount: enviados },
  });

  revalidatePath("/dashboard/campanas");
  return { enviados };
}
