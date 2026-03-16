"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { enviarCampana } from "@/lib/email";
import { format } from "date-fns";

async function getAuthBusiness() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const business = await prisma.business.findUnique({ where: { ownerId: user.id } });
  if (!business) redirect("/onboarding");
  return business;
}

const campanaSchema = z.object({
  name:    z.string().min(1, "Nombre obligatorio"),
  subject: z.string().min(1, "Asunto obligatorio"),
  body:    z.string().min(1, "Cuerpo obligatorio"),
});

export async function crearCampana(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const business = await getAuthBusiness();

  const raw = {
    name:    formData.get("name") as string,
    subject: formData.get("subject") as string,
    body:    formData.get("body") as string,
  };

  const result = campanaSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };

  // Fechas específicas
  const dateCount = parseInt(formData.get("dateCount") as string) || 0;
  const scheduledDates: Date[] = [];
  for (let i = 0; i < dateCount; i++) {
    const d = formData.get(`date_${i}`) as string;
    if (d) scheduledDates.push(new Date(d));
  }

  // Recurrencia
  const recurrenceType = formData.get("recurrenceType") as string;
  let recurrenceRule: string | null = null;
  let recurrenceEndAt: Date | null = null;

  if (recurrenceType && recurrenceType !== "none") {
    const rule: Record<string, unknown> = { type: recurrenceType };
    if (recurrenceType === "weekly") {
      const days = formData.getAll("recurrenceDays").map(Number);
      rule.days = days;
    }
    if (recurrenceType === "monthly") {
      rule.dayOfMonth = parseInt(formData.get("recurrenceDayOfMonth") as string) || 1;
    }
    recurrenceRule = JSON.stringify(rule);
    const endAtStr = formData.get("recurrenceEndAt") as string;
    if (endAtStr) recurrenceEndAt = new Date(endAtStr);
  }

  const isScheduled = scheduledDates.length > 0 || recurrenceRule !== null;

  await prisma.campaign.create({
    data: {
      businessId: business.id,
      name:       result.data.name,
      subject:    result.data.subject,
      body:       result.data.body,
      status:     isScheduled ? "SCHEDULED" : "DRAFT",
      scheduledDates,
      recurrenceRule,
      recurrenceEndAt,
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
    name: business.name, primaryColor: business.primaryColor, logoUrl: business.logoUrl,
    phone: business.phone, address: business.address, instagram: business.instagram, website: business.website,
  };

  for (const email of emails) {
    try {
      await enviarCampana({ toEmail: email, business: branding, subject: campana.subject, body: campana.body });
      enviados++;
    } catch { /* continuar */ }
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const isRecurring = !!campana.recurrenceRule;

  await prisma.campaign.update({
    where: { id },
    data: {
      // Recurrentes quedan SCHEDULED para seguir disparando
      status: isRecurring ? "SCHEDULED" : "SENT",
      sentAt: isRecurring ? undefined : new Date(),
      lastSentDate: today,
      recipientCount: { increment: enviados },
    },
  });

  revalidatePath("/dashboard/campanas");
  return { enviados };
}
