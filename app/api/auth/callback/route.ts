import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error("[auth/callback] exchangeCodeForSession error:", error);
      return NextResponse.redirect(`${origin}/login?error=invalid_code`);
    }

    // Upsert user en la DB (puede que ya exista del registro)
    try {
      const name = (data.user.user_metadata?.name as string) ?? "Usuario";
      await prisma.user.upsert({
        where: { id: data.user.id },
        update: {},
        create: {
          id: data.user.id,
          email: data.user.email!,
          name,
          role: "BUSINESS_OWNER",
        },
      });
    } catch (dbError) {
      // Si falla la DB, igual dejamos pasar — la sesión ya está creada
      console.error("[auth/callback] DB upsert error:", dbError);
    }

    // Ver si ya completó el onboarding
    const existing = await prisma.business.findFirst({
      where: { ownerId: data.user.id },
      select: { onboardingCompleted: true },
    }).catch(() => null);

    const destination = existing?.onboardingCompleted ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(`${origin}${destination}`);

  } catch (err) {
    console.error("[auth/callback] unexpected error:", err);
    return NextResponse.redirect(`${origin}/login?error=callback_failed`);
  }
}
