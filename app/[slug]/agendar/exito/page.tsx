import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Calendar, ArrowRight } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bookingId?: string; name?: string }>;
}

export default async function ExitoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { bookingId, name } = await searchParams;

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    select: { name: true, primaryColor: true, email: true, phone: true },
  });

  if (!business) notFound();

  let booking = null;
  if (bookingId) {
    booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, professional: true },
    });
  }

  const primary = business.primaryColor ?? "#F97316";

  return (
    <>
      <style>{`
        .brand-btn { background-color: ${primary}; color: #fff; }
        .brand-btn:hover { filter: brightness(0.9); }
        .brand-text { color: ${primary}; }
        .brand-circle { background-color: color-mix(in srgb, ${primary} 10%, white); color: ${primary}; }
      `}</style>

      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5 py-12">
        <div className="max-w-sm w-full text-center">
          {/* Ícono de éxito */}
          <div className="brand-circle w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10" style={{ color: primary }} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {name ? `¡Listo, ${name}!` : "¡Cita confirmada!"}
          </h1>
          <p className="text-gray-500 mb-6">
            Tu cita en <strong>{business.name}</strong> está confirmada. Te enviamos los detalles a tu email.
          </p>

          {/* Detalle de la cita */}
          {booking && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 text-left space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <span>
                  {new Date(booking.date).toLocaleDateString("es-CL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
              <p className="text-gray-600 pl-6">
                {booking.startTime} – {booking.endTime}
              </p>
              <p className="text-gray-700 font-medium pl-6">{booking.service.name}</p>
              <p className="text-gray-500 pl-6">con {booking.professional.name}</p>
            </div>
          )}

          {/* Acciones */}
          <div className="space-y-3">
            <Link
              href={`/${slug}`}
              className="brand-btn flex items-center justify-center gap-2 rounded-xl py-3 font-medium transition-all"
            >
              Volver al inicio
              <ArrowRight className="h-4 w-4" />
            </Link>

            {/* Google Calendar link manual */}
            {booking && (
              <a
                href={buildGoogleCalendarUrl(booking, business.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Calendar className="h-4 w-4" />
                Agregar a Google Calendar
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function buildGoogleCalendarUrl(
  booking: { date: Date; startTime: string; endTime: string; service: { name: string }; professional: { name: string } },
  businessName: string
): string {
  // Convertir fecha + hora a formato Google Calendar (YYYYMMDDTHHMMSS)
  const dateStr = new Date(booking.date).toISOString().split("T")[0].replace(/-/g, "");
  const start = `${dateStr}T${booking.startTime.replace(":", "")}00`;
  const end = `${dateStr}T${booking.endTime.replace(":", "")}00`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${booking.service.name} — ${businessName}`,
    dates: `${start}/${end}`,
    details: `Cita con ${booking.professional.name}`,
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}
