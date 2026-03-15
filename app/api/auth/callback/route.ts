import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
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
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
