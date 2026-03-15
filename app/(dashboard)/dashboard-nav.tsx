"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { Calendar, Settings, Users, Scissors, LayoutDashboard, Megaphone } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Agenda", icon: LayoutDashboard },
  { href: "/dashboard/calendario", label: "Calendario", icon: Calendar },
  { href: "/dashboard/servicios", label: "Servicios", icon: Scissors },
  { href: "/dashboard/profesionales", label: "Profesionales", icon: Users },
  { href: "/dashboard/campanas", label: "Campañas", icon: Megaphone },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-4 space-y-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full justify-start gap-3",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
