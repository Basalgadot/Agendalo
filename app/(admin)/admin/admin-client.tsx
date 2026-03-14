"use client";

import { useState, useTransition } from "react";
import { toggleBusinessActive } from "@/app/actions/admin";

interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  plan: string;
  isActive: boolean;
  trialEndsAt: string | null;
  trialExpired: boolean;
  bookingCount: number;
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  trial: number;
  trialExpired: number;
}

const PLAN_LABEL: Record<string, string> = {
  FREE_TRIAL: "Trial",
  FREE: "Gratis",
  PRO: "Pro",
};

const PLAN_COLOR: Record<string, string> = {
  FREE_TRIAL: "bg-amber-100 text-amber-700",
  FREE: "bg-gray-100 text-gray-600",
  PRO: "bg-indigo-100 text-indigo-700",
};

export function AdminClient({ businesses: initial, stats }: { businesses: BusinessRow[]; stats: Stats }) {
  const [businesses, setBusinesses] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string) {
    startTransition(async () => {
      const result = await toggleBusinessActive(id);
      if (!result.error) {
        setBusinesses((prev) =>
          prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
        );
      }
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Panel de administración</h1>
      <p className="text-gray-500 text-sm mb-8">Todos los negocios registrados en la plataforma.</p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total negocios", value: stats.total, color: "text-gray-900" },
          { label: "Activos", value: stats.active, color: "text-emerald-600" },
          { label: "En trial", value: stats.trial, color: "text-amber-600" },
          { label: "Trial vencido", value: stats.trialExpired, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Negocio</th>
              <th className="px-5 py-3 font-medium">Dueño</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Trial vence</th>
              <th className="px-5 py-3 font-medium text-right">Citas</th>
              <th className="px-5 py-3 font-medium text-right">Estado</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((b) => (
              <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <a
                    href={`/${b.slug}`}
                    target="_blank"
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {b.name}
                  </a>
                  <p className="text-xs text-gray-400">{b.slug}</p>
                </td>
                <td className="px-5 py-3 text-gray-600">{b.ownerEmail}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${PLAN_COLOR[b.plan] ?? "bg-gray-100 text-gray-600"}`}>
                    {PLAN_LABEL[b.plan] ?? b.plan}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {b.trialEndsAt ? (
                    <span className={b.trialExpired ? "text-red-600 font-medium" : "text-gray-600"}>
                      {new Date(b.trialEndsAt).toLocaleDateString("es-CL")}
                      {b.trialExpired && " (vencido)"}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">
                  {b.bookingCount}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleToggle(b.id)}
                    disabled={isPending}
                    className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                      b.isActive
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-red-100 text-red-600 hover:bg-red-200"
                    }`}
                  >
                    {b.isActive ? "Activo" : "Pausado"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {businesses.length === 0 && (
          <p className="text-center text-gray-400 py-12">Aún no hay negocios registrados.</p>
        )}
      </div>
    </div>
  );
}
