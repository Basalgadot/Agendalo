import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Users, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Nav — fondo #2D2D2D igual que el borde del logo */}
      <nav className="bg-[#2D2D2D] border-b border-[#444444] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="Agéndalo"
              width={160}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
          <div className="flex gap-3">
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              Iniciar sesión
            </Link>
            <Link href="/registro" className={buttonVariants({ variant: "default" })}>
              Registrar mi negocio
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-foreground mb-6 leading-tight">
          Tu negocio listo para recibir citas{" "}
          <span className="text-primary">en minutos</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          La plataforma más simple para gestionar citas online en Latinoamérica.
          Barberías, salones, veterinarias, psicólogos y más.
        </p>
        <Link
          href="/registro"
          className={cn(buttonVariants({ size: "lg" }), "text-base px-8 py-6")}
        >
          Empieza gratis — 7 días de prueba
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            icon: Zap,
            title: "Onboarding en 5 min",
            desc: "Configura tu negocio y empieza a recibir citas el mismo día.",
          },
          {
            icon: Calendar,
            title: "Agenda inteligente",
            desc: "Vista semanal y diaria. Crea y gestiona citas con un clic.",
          },
          {
            icon: Clock,
            title: "Disponibilidad automática",
            desc: "El sistema muestra solo los horarios realmente libres.",
          },
          {
            icon: Users,
            title: "Página para tus clientes",
            desc: "Tus clientes agendan solos desde tu página personalizada.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-card border border-border rounded-xl p-6">
            <Icon className="text-primary mb-3 h-6 w-6" />
            <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
