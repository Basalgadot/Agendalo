"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  AlertCircle,
  ExternalLink,
  Plus,
} from "lucide-react";
import { format, addDays, parseISO, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { cambiarEstadoCita, crearCitaManual } from "@/app/actions/bookings";

type CitaResumen = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  guestName: string | null;
  guestEmail: string | null;
  notes: string | null;
  professional: { id: string; name: string };
  service: { id: string; name: string; duration: number };
};

interface Props {
  business: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    trialDaysLeft: number | null;
  };
  citas: CitaResumen[];
  profesionales: { id: string; name: string }[];
  servicios: { id: string; name: string; duration: number }[];
  citasHoyCount: number;
  semanaInicio: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No se presentó",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  NO_SHOW: "bg-red-100 text-red-800",
};

export function AgendaClient({ business, citas, profesionales, servicios, citasHoyCount, semanaInicio }: Props) {
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [filtroProf, setFiltroProf] = useState<string>("todos");
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaResumen | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [nuevaCitaOpen, setNuevaCitaOpen] = useState(false);
  const [creandoCita, setCreandoCita] = useState(false);
  const [errorNuevaCita, setErrorNuevaCita] = useState<string | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agendalo.app";

  // Calcular días de la semana actual
  const baseInicioSemana = parseISO(semanaInicio);
  const inicioSemanaActual = addDays(baseInicioSemana, semanaOffset * 7);
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(inicioSemanaActual, i));

  // Filtrar citas
  const citasFiltradas = citas.filter((c) =>
    filtroProf === "todos" || c.professional.id === filtroProf
  );

  // Agrupar por fecha
  const citasPorDia: Record<string, CitaResumen[]> = {};
  diasSemana.forEach((dia) => {
    citasPorDia[format(dia, "yyyy-MM-dd")] = [];
  });
  citasFiltradas.forEach((c) => {
    if (citasPorDia[c.date]) citasPorDia[c.date].push(c);
  });

  async function handleNuevaCita(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreandoCita(true);
    setErrorNuevaCita(null);
    const formData = new FormData(e.currentTarget);
    const result = await crearCitaManual(formData);
    setCreandoCita(false);
    if (result?.error) {
      setErrorNuevaCita(result.error);
    } else {
      setNuevaCitaOpen(false);
      (e.target as HTMLFormElement).reset();
    }
  }

  async function handleCambiarEstado(nuevoEstado: string) {
    if (!citaSeleccionada) return;
    setCambiandoEstado(true);
    await cambiarEstadoCita(citaSeleccionada.id, nuevoEstado);
    setCambiandoEstado(false);
    setCitaSeleccionada(null);
  }

  return (
    <div className="p-6">
      {/* Banner trial */}
      {business.trialDaysLeft !== null && business.trialDaysLeft <= 7 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Tu período de prueba vence en{" "}
            <strong>{business.trialDaysLeft} días</strong>.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <a
            href={`${appUrl}/${business.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary flex items-center gap-1 hover:underline mt-0.5"
          >
            Ver mi página pública <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {citasHoyCount} cita{citasHoyCount !== 1 ? "s" : ""} hoy
          </div>
          <Button onClick={() => setNuevaCitaOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Nueva cita
          </Button>
        </div>
      </div>

      {/* Filtro por profesional */}
      {profesionales.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFiltroProf("todos")}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              filtroProf === "todos"
                ? "bg-primary text-white border-primary"
                : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            Todos
          </button>
          {profesionales.map((p) => (
            <button
              key={p.id}
              onClick={() => setFiltroProf(p.id)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                filtroProf === p.id
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:border-primary"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Navegación de semana */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="outline" size="icon" onClick={() => setSemanaOffset((o) => o - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(diasSemana[0], "d MMM", { locale: es })} –{" "}
          {format(diasSemana[6], "d MMM yyyy", { locale: es })}
        </span>
        <Button variant="outline" size="icon" onClick={() => setSemanaOffset((o) => o + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {semanaOffset !== 0 && (
          <Button variant="ghost" className="text-xs" onClick={() => setSemanaOffset(0)}>
            Hoy
          </Button>
        )}
      </div>

      {/* Grilla semanal */}
      <div className="grid grid-cols-7 gap-2">
        {diasSemana.map((dia) => {
          const key = format(dia, "yyyy-MM-dd");
          const citasDia = citasPorDia[key] || [];
          const esHoy = isToday(dia);

          return (
            <div key={key} className="min-h-[200px]">
              {/* Header del día */}
              <div
                className={`text-center py-2 rounded-lg mb-2 ${
                  esHoy ? "bg-primary text-white" : "bg-secondary border border-border"
                }`}
              >
                <p className="text-xs font-medium uppercase">
                  {format(dia, "EEE", { locale: es })}
                </p>
                <p className="text-lg font-bold">{format(dia, "d")}</p>
              </div>

              {/* Citas del día */}
              <div className="space-y-1">
                {citasDia.map((cita) => (
                  <button
                    key={cita.id}
                    onClick={() => setCitaSeleccionada(cita)}
                    className="w-full text-left"
                  >
                    <div
                      className={`px-2 py-1.5 rounded-md text-xs border cursor-pointer hover:shadow-sm transition-shadow ${STATUS_COLORS[cita.status]}`}
                    >
                      <p className="font-semibold">
                        {cita.startTime}
                      </p>
                      <p className="truncate">{cita.guestName || "Cliente"}</p>
                      <p className="truncate text-xs opacity-75">{cita.service.name}</p>
                    </div>
                  </button>
                ))}
                {citasDia.length === 0 && (
                  <div className="h-16 rounded-md border border-dashed border-border" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal nueva cita */}
      <Dialog open={nuevaCitaOpen} onOpenChange={setNuevaCitaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva cita</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNuevaCita} className="space-y-4">
            {errorNuevaCita && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{errorNuevaCita}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Servicio *</label>
                <select name="serviceId" required className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm">
                  <option value="">Selecciona...</option>
                  {servicios.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.duration} min)</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Profesional *</label>
                <select name="professionalId" required className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm">
                  <option value="">Selecciona...</option>
                  {profesionales.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha *</label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={format(new Date(), "yyyy-MM-dd")}
                  className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Hora de inicio *</label>
                <input
                  type="time"
                  name="startTime"
                  required
                  className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre del cliente *</label>
              <input
                type="text"
                name="guestName"
                required
                placeholder="María González"
                className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Teléfono (opcional)</label>
              <input
                type="tel"
                name="guestPhone"
                placeholder="+56 9 1234 5678"
                className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notas (opcional)</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Indicaciones especiales..."
                className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={creandoCita} className="flex-1">
                {creandoCita ? "Creando..." : "Crear cita"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setNuevaCitaOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal detalle de cita */}
      <Dialog open={!!citaSeleccionada} onOpenChange={() => setCitaSeleccionada(null)}>
        <DialogContent>
          {citaSeleccionada && (
            <>
              <DialogHeader>
                <DialogTitle>Detalle de cita</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[citaSeleccionada.status]}`}>
                    {STATUS_LABELS[citaSeleccionada.status]}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{citaSeleccionada.guestName || "Cliente registrado"}</span>
                    {citaSeleccionada.guestEmail && (
                      <span className="text-muted-foreground">({citaSeleccionada.guestEmail})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(parseISO(citaSeleccionada.date), "EEEE d 'de' MMMM", { locale: es })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{citaSeleccionada.startTime} – {citaSeleccionada.endTime}</span>
                  </div>
                  <div className="bg-secondary rounded-lg px-3 py-2">
                    <p className="font-medium">{citaSeleccionada.service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      con {citaSeleccionada.professional.name} · {citaSeleccionada.service.duration} min
                    </p>
                  </div>
                  {citaSeleccionada.notes && (
                    <p className="text-muted-foreground italic">"{citaSeleccionada.notes}"</p>
                  )}
                </div>

                {/* Acciones de estado */}
                {citaSeleccionada.status !== "CANCELLED" && citaSeleccionada.status !== "COMPLETED" && (
                  <div className="border-t border-border pt-4 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Cambiar estado</p>
                    <div className="flex flex-wrap gap-2">
                      {citaSeleccionada.status !== "CONFIRMED" && (
                        <Button size="sm" onClick={() => handleCambiarEstado("CONFIRMED")} disabled={cambiandoEstado}>
                          Confirmar
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleCambiarEstado("COMPLETED")} disabled={cambiandoEstado}>
                        Completada
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCambiarEstado("NO_SHOW")} disabled={cambiandoEstado}>
                        No se presentó
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleCambiarEstado("CANCELLED")} disabled={cambiandoEstado}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
