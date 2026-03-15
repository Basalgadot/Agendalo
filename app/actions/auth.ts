"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const registroSchema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const result = loginSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    if (error.message?.toLowerCase().includes("email not confirmed")) {
      redirect(`/confirmar-email?email=${encodeURIComponent(result.data.email)}`);
    }
    return { error: "Email o contraseña incorrectos" };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function registro(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const result = registroSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: { data: { name: result.data.name } },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.message?.includes("already registered")) {
      return { error: "Ya existe una cuenta con ese email" };
    }
    return { error: "Error al crear la cuenta. Intenta de nuevo." };
  }

  if (!data.user) {
    return { error: "Error al crear la cuenta. Intenta de nuevo." };
  }

  // Crear perfil en DB
  await prisma.user.upsert({
    where: { id: data.user.id },
    update: { name: result.data.name },
    create: {
      id: data.user.id,
      email: result.data.email,
      name: result.data.name,
      role: "BUSINESS_OWNER",
    },
  });

  // Enviar OTP de 6 dígitos para verificar email
  await supabase.auth.signInWithOtp({
    email: result.data.email,
    options: { shouldCreateUser: false },
  });

  redirect(`/confirmar-email?email=${encodeURIComponent(result.data.email)}`);
}

export async function verificarOtp(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const token = (formData.get("token") as string)?.trim();

  if (!token || token.length !== 6) {
    return { error: "Ingresa el código de 6 dígitos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { error: "Código incorrecto o expirado. Revisa tu email o solicita uno nuevo." };
  }

  if (data.user) {
    const name = (data.user.user_metadata?.name as string) ?? "Usuario";
    await prisma.user.upsert({
      where: { id: data.user.id },
      update: { name },
      create: {
        id: data.user.id,
        email: data.user.email!,
        name,
        role: "BUSINESS_OWNER",
      },
    });
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function reenviarOtp(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    return { error: "No se pudo reenviar el código. Intenta de nuevo." };
  }

  return { success: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
