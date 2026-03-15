import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { DashboardNav } from "./dashboard-nav";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { logout } from "@/app/actions/auth";
import { LogOut } from "lucide-react";

function LogoutButton() {
  return (
    <form action={logout} className="px-4 pb-2">
      <button
        type="submit"
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </form>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { ownerId: user.id },
    select: { plan: true, trialEndsAt: true },
  });

  // Calcular estado del trial
  let trialLabel: string | null = null;
  let trialExpired = false;

  if (business) {
    if (business.plan === "FREE_TRIAL") {
      if (business.trialEndsAt) {
        const daysLeft = Math.ceil(
          (business.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= 0) {
          trialExpired = true;
          trialLabel = "Plan de prueba vencido";
        } else {
          trialLabel = `Plan de prueba · ${daysLeft} día${daysLeft === 1 ? "" : "s"} restante${daysLeft === 1 ? "" : "s"}`;
        }
      }
    } else if (business.plan === "FREE") {
      trialLabel = "Plan gratuito · 20 citas/mes";
    } else if (business.plan === "PRO") {
      trialLabel = "Plan Pro";
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border">
          <Link href="/">
            <Logo className="scale-75 origin-left" />
          </Link>
        </div>

        <DashboardNav />

        <LogoutButton />

        {trialLabel && (
          <div
            className={cn(
              "p-4 border-t border-border",
              trialExpired ? "bg-red-50 border-red-100" : ""
            )}
          >
            <p
              className={cn(
                "text-xs text-center",
                trialExpired ? "text-red-600 font-semibold" : "text-muted-foreground"
              )}
            >
              {trialLabel}
            </p>
            {trialExpired && (
              <p className="text-xs text-red-400 text-center mt-1">
                Tu página de reservas está pausada
              </p>
            )}
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 bg-secondary overflow-auto">{children}</main>
    </div>
  );
}
