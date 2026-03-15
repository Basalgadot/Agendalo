import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Clock } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    select: { name: true, description: true, coverUrl: true },
  });
  if (!business) return { title: "No encontrado" };
  return {
    title: business.name,
    description: business.description ?? `Agenda tu cita con ${business.name}`,
    openGraph: {
      title: business.name,
      description: business.description ?? `Agenda tu cita con ${business.name}`,
      ...(business.coverUrl && { images: [business.coverUrl] }),
    },
  };
}

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default async function BusinessPublicPage({ params }: Props) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    include: {
      services: { where: { isActive: true }, orderBy: { name: "asc" } },
      professionals: {
        where: { isActive: true },
        orderBy: { order: "asc" },
      },
      schedules: { where: { isOpen: true }, orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!business) notFound();

  const primary = business.primaryColor ?? "#F97316";
  const hex = primary.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return (
    <>
      {/* Colores de marca del negocio — sin mención de Agéndalo */}
      <style>{`
        :root { --brand: ${primary}; --brand-r: ${r}; --brand-g: ${g}; --brand-b: ${b}; }
        .brand-btn { background-color: ${primary}; color: #fff; }
        .brand-btn:hover { filter: brightness(0.9); }
        .brand-text { color: ${primary}; }
        .brand-bg-light { background-color: rgba(${r},${g},${b},0.08); }
        .brand-border { border-color: ${primary}; }
      `}</style>

      <div className="min-h-screen bg-white">
        {/* Cover */}
        {business.coverUrl ? (
          <div className="h-48 md:h-56 w-full relative overflow-hidden">
            <Image src={business.coverUrl} alt={business.name} fill className="object-cover" priority />
          </div>
        ) : (
          <div className="h-28 w-full" style={{ backgroundColor: primary }} />
        )}

        <div className="max-w-3xl mx-auto px-5">
          {/* Logo */}
          <div className="-mt-10 mb-3">
            {business.logoUrl ? (
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow overflow-hidden bg-white">
                <Image src={business.logoUrl} alt="" width={80} height={80} className="object-cover w-full h-full" />
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-2xl border-4 border-white shadow flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: primary }}
              >
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Nombre */}
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            {business.category && <p className="text-sm text-gray-500">{business.category}</p>}
          </div>

          {/* Info del negocio */}
          {(business.description || business.phone || business.address) && (
            <div className="brand-bg-light rounded-2xl p-5 mb-8 space-y-2">
              {business.description && <p className="text-gray-700">{business.description}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 pt-1">
                {business.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {business.phone}
                  </span>
                )}
                {business.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {business.address}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* CTA principal */}
          <div className="text-center mb-10">
            <Link
              href={`/${slug}/agendar`}
              className="brand-btn inline-flex items-center justify-center rounded-xl px-8 py-4 text-base font-semibold transition-all shadow-md"
            >
              Agendar una cita
            </Link>
          </div>

          {/* Servicios */}
          {business.services.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Servicios</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {business.services.map((s) => (
                  <div key={s.id} className="border border-gray-100 rounded-xl p-4 hover:brand-border transition-colors">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-gray-900">{s.name}</p>
                      {s.price && (
                        <span className="brand-text font-semibold text-sm ml-2 shrink-0">
                          ${Number(s.price).toLocaleString("es-CL")}
                        </span>
                      )}
                    </div>
                    {s.description && <p className="text-sm text-gray-500 mt-1">{s.description}</p>}
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {s.duration} min
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Profesionales (solo si hay más de uno) */}
          {business.professionals.length > 1 && (
            <section className="mb-10">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Nuestro equipo</h2>
              <div className="flex flex-wrap gap-4">
                {business.professionals.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    {p.avatarUrl ? (
                      <Image src={p.avatarUrl} alt={p.name} width={40} height={40} className="rounded-full object-cover w-10 h-10" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ backgroundColor: primary }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      {p.bio && <p className="text-xs text-gray-500">{p.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Horarios */}
          {business.schedules.length > 0 && (
            <section className="pb-16">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Horarios de atención</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {business.schedules.map((h) => (
                  <div key={h.dayOfWeek} className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
                    <p className="font-medium text-gray-700">{DIAS[h.dayOfWeek]}</p>
                    <p className="text-gray-500">{h.openTime} – {h.closeTime}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
