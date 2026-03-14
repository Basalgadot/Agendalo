import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingFlow } from "./booking-flow";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AgendarPage({ params }: Props) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    include: {
      services: { where: { isActive: true }, orderBy: { name: "asc" } },
      professionals: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        include: { services: { select: { serviceId: true } } },
      },
    },
    // plan y trialEndsAt vienen automáticamente con include
  });

  if (!business) notFound();

  // Verificar si el trial/plan permite agendamiento
  const isTrialExpired =
    business.plan === "FREE_TRIAL" &&
    business.trialEndsAt != null &&
    business.trialEndsAt < new Date();

  const primary = business.primaryColor ?? "#F97316";

  if (isTrialExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5 text-center">
        <div className="max-w-sm">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl font-bold text-white"
            style={{ backgroundColor: primary }}
          >
            {business.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{business.name}</h1>
          <p className="text-gray-500 text-sm">
            El agendamiento en línea no está disponible en este momento.
            <br />
            Contáctanos directamente para reservar tu cita.
          </p>
          {business.phone && (
            <a
              href={`tel:${business.phone}`}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ backgroundColor: primary }}
            >
              Llamar: {business.phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        :root { --brand: ${primary}; }
        .brand-btn { background-color: ${primary}; color: #fff; }
        .brand-btn:hover { filter: brightness(0.9); }
        .brand-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: none; }
        .brand-text { color: ${primary}; }
        .brand-ring:focus { outline: 2px solid ${primary}; outline-offset: 2px; }
        .brand-selected { border-color: ${primary}; background-color: color-mix(in srgb, ${primary} 8%, white); }
        .brand-dot { background-color: ${primary}; }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        {/* Header mínimo — solo el nombre del negocio, sin branding de Agéndalo */}
        <header className="bg-white border-b border-gray-100 px-5 py-4">
          <a href={`/${slug}`} className="text-gray-900 font-semibold hover:opacity-80 transition-opacity">
            ← {business.name}
          </a>
        </header>

        <main className="max-w-lg mx-auto px-4 py-8">
          <BookingFlow
            slug={slug}
            businessName={business.name}
            services={business.services.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              duration: s.duration,
              price: s.price ? Number(s.price) : null,
            }))}
            professionals={business.professionals.map((p) => ({
              id: p.id,
              name: p.name,
              bio: p.bio,
              avatarUrl: p.avatarUrl,
              serviceIds: p.services.map((ps) => ps.serviceId),
            }))}
            slotDuration={business.slotDuration}
            primaryColor={primary}
          />
        </main>
      </div>
    </>
  );
}
