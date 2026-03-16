"use client";

import { useState, useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Trash2, Plus, Users, Eye, ChevronLeft, ChevronRight, X, Repeat2, CalendarDays } from "lucide-react";
import { crearCampana, eliminarCampana, enviarCampanaAhora } from "@/app/actions/campanas";
import { cn } from "@/lib/utils";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, parseISO,
} from "date-fns";
import { es } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

type Campana = {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: string;
  scheduledDates: string[];        // "yyyy-MM-dd"
  recurrenceRule: string | null;
  recurrenceEndAt: string | null;
  sentAt: string | null;
  recipientCount: number;
};

type RecurrenceType = "none" | "daily" | "weekly" | "monthly";

const DIAS_SEMANA = [
  { label: "Lu", value: 1 }, { label: "Ma", value: 2 }, { label: "Mi", value: 3 },
  { label: "Ju", value: 4 }, { label: "Vi", value: 5 }, { label: "Sá", value: 6 },
  { label: "Do", value: 0 },
];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programada",
  SENT: "Enviada",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  SENT: "bg-green-100 text-green-700",
};

// ─── Multi-date calendar ──────────────────────────────────────────────────────

function MultiDatePicker({
  selectedDates,
  onToggle,
}: {
  selectedDates: Date[];
  onToggle: (date: Date) => void;
}) {
  const [viewDate, setViewDate] = useState(new Date());

  const monthStart = startOfMonth(viewDate);
  const monthEnd   = endOfMonth(viewDate);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd     = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const isSelected = (d: Date) => selectedDates.some((s) => isSameDay(s, d));
  const isToday    = (d: Date) => isSameDay(d, new Date());
  const isPast     = (d: Date) => d < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="border border-border rounded-lg p-3 bg-background">
      {/* Navegación del mes */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setViewDate(subMonths(viewDate, 1))}
          className="p-1 rounded hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium capitalize">
          {format(viewDate, "MMMM yyyy", { locale: es })}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          className="p-1 rounded hover:bg-secondary transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Nombres de días */}
      <div className="grid grid-cols-7 mb-1">
        {["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map((d) => (
          <div key={d} className="text-xs text-muted-foreground text-center py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Días */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewDate);
          const selected = isSelected(day);
          const today = isToday(day);
          const past = isPast(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => !past && inMonth && onToggle(day)}
              disabled={!inMonth || past}
              className={cn(
                "h-8 w-8 rounded-md text-sm mx-auto flex items-center justify-center transition-colors",
                !inMonth && "invisible",
                past && inMonth && "text-muted-foreground/40 cursor-not-allowed",
                selected && "bg-primary text-primary-foreground font-semibold",
                !selected && today && !past && "border border-primary text-primary font-medium",
                !selected && !today && !past && inMonth && "hover:bg-secondary cursor-pointer",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Scheduling section ───────────────────────────────────────────────────────

function ProgramacionForm() {
  const [mode, setMode] = useState<"none" | "dates" | "recurrence">("none");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("weekly");
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState(new Date().getDate());
  const [endDate, setEndDate] = useState("");

  function toggleDate(date: Date) {
    setSelectedDates((prev) => {
      const exists = prev.some((d) => isSameDay(d, date));
      return exists ? prev.filter((d) => !isSameDay(d, date)) : [...prev, date].sort((a, b) => a.getTime() - b.getTime());
    });
  }

  function toggleWeekDay(day: number) {
    setWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  return (
    <div className="space-y-3">
      {/* Hidden inputs para el server action */}
      {mode === "dates" && (
        <>
          <input type="hidden" name="dateCount" value={selectedDates.length} />
          {selectedDates.map((d, i) => (
            <input key={i} type="hidden" name={`date_${i}`} value={d.toISOString()} />
          ))}
        </>
      )}
      {mode === "recurrence" && (
        <>
          <input type="hidden" name="recurrenceType" value={recurrenceType} />
          {recurrenceType === "weekly" &&
            weekDays.map((d) => (
              <input key={d} type="hidden" name="recurrenceDays" value={d} />
            ))}
          {recurrenceType === "monthly" && (
            <input type="hidden" name="recurrenceDayOfMonth" value={dayOfMonth} />
          )}
          {endDate && <input type="hidden" name="recurrenceEndAt" value={new Date(endDate).toISOString()} />}
        </>
      )}

      {/* Selector de modo */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { value: "none", label: "Sin programar", icon: null },
          { value: "dates", label: "Fechas fijas", icon: <CalendarDays className="h-3.5 w-3.5" /> },
          { value: "recurrence", label: "Recurrencia", icon: <Repeat2 className="h-3.5 w-3.5" /> },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMode(opt.value as typeof mode)}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
              mode === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Fechas específicas */}
      {mode === "dates" && (
        <div className="space-y-2">
          <MultiDatePicker selectedDates={selectedDates} onToggle={toggleDate} />
          {selectedDates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedDates.map((d) => (
                <span
                  key={d.toISOString()}
                  className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                >
                  {format(d, "d MMM", { locale: es })}
                  <button type="button" onClick={() => toggleDate(d)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recurrencia */}
      {mode === "recurrence" && (
        <div className="space-y-3 border border-border rounded-lg p-3">
          {/* Tipo de recurrencia */}
          <div className="space-y-1.5">
            <Label className="text-xs">Se repite</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: "daily", label: "Todos los días" },
                { value: "weekly", label: "Semanal" },
                { value: "monthly", label: "Mensual" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRecurrenceType(opt.value as RecurrenceType)}
                  className={cn(
                    "px-2 py-1.5 rounded-md border text-xs font-medium transition-colors",
                    recurrenceType === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Días de la semana */}
          {recurrenceType === "weekly" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Qué días</Label>
              <div className="flex gap-1.5">
                {DIAS_SEMANA.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleWeekDay(d.value)}
                    className={cn(
                      "h-8 w-8 rounded-full text-xs font-medium border transition-colors",
                      weekDays.includes(d.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Día del mes */}
          {recurrenceType === "monthly" && (
            <div className="space-y-1.5">
              <Label className="text-xs">El día</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                  className="w-20 h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground">de cada mes</span>
              </div>
            </div>
          )}

          {/* Fecha de fin (opcional) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Termina (opcional)</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-xs text-muted-foreground">Déjalo vacío para que no tenga fecha límite.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  campanas: Campana[];
  clientesCount: number;
}

export function CampanasClient({ campanas, clientesCount }: Props) {
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [preview, setPreview]     = useState<Campana | null>(null);
  const [enviando, setEnviando]   = useState<string | null>(null);
  const [enviandoMsg, setEnviandoMsg] = useState<string | null>(null);
  const [state, action, pending]  = useActionState(crearCampana, { error: undefined });

  async function handleEnviarAhora(id: string) {
    setEnviando(id);
    setEnviandoMsg(null);
    const result = await enviarCampanaAhora(id);
    setEnviando(null);
    if (result.error) {
      setEnviandoMsg(`Error: ${result.error}`);
    } else {
      setEnviandoMsg(`Enviado a ${result.enviados} cliente${result.enviados !== 1 ? "s" : ""}`);
    }
  }

  function programacionLabel(c: Campana): string | null {
    if (c.recurrenceRule) {
      const rule = JSON.parse(c.recurrenceRule);
      if (rule.type === "daily") return "Todos los días";
      if (rule.type === "weekly") {
        const nombres = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
        const dias = (rule.days as number[]).sort().map((d: number) => nombres[d]).join(", ");
        return `Semanal: ${dias}`;
      }
      if (rule.type === "monthly") return `El día ${rule.dayOfMonth} de cada mes`;
    }
    if (c.scheduledDates.length > 0) {
      const fechas = c.scheduledDates
        .map((d) => format(parseISO(d), "d MMM", { locale: es }))
        .join(", ");
      return `Fechas: ${fechas}`;
    }
    return null;
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Campañas de email</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {clientesCount} cliente{clientesCount !== 1 ? "s" : ""} en tu base de datos
          </p>
        </div>
        <Button onClick={() => setNuevaOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nueva campaña
        </Button>
      </div>

      {enviandoMsg && (
        <div className="mb-4 text-sm px-4 py-3 rounded-lg bg-secondary border border-border">
          {enviandoMsg}
        </div>
      )}

      {campanas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-base">Aún no tienes campañas.</p>
            <p className="text-sm mt-1">Crea una para enviarla a todos tus clientes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campanas.map((c) => {
            const prog = programacionLabel(c);
            const isRecurring = !!c.recurrenceRule;
            return (
              <Card key={c.id}>
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold truncate">{c.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status]}`}>
                        {isRecurring ? "Recurrente" : STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">📧 {c.subject}</p>
                    {prog && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        {isRecurring ? <Repeat2 className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
                        {prog}
                        {c.recurrenceEndAt && ` · hasta ${c.recurrenceEndAt}`}
                      </p>
                    )}
                    {c.status === "SENT" && !isRecurring && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enviada {c.sentAt} · {c.recipientCount} destinatarios
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setPreview(c)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {c.status !== "SENT" && (
                      <Button
                        size="sm"
                        onClick={() => handleEnviarAhora(c.id)}
                        disabled={enviando === c.id}
                        className="gap-1"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {enviando === c.id ? "Enviando..." : "Enviar ahora"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => eliminarCampana(c.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal nueva campaña */}
      <Dialog open={nuevaOpen} onOpenChange={setNuevaOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva campaña</DialogTitle>
          </DialogHeader>
          <form action={action} className="space-y-4">
            {state?.error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{state.error}</p>
            )}
            <div className="space-y-1.5">
              <Label>Nombre interno *</Label>
              <Input name="name" placeholder="Ej: Promo fin de semana" required />
              <p className="text-xs text-muted-foreground">Solo para que tú la identifiques.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Asunto del email *</Label>
              <Input name="subject" placeholder="Ej: 🎉 Oferta especial este viernes" required />
            </div>
            <div className="space-y-1.5">
              <Label>Mensaje *</Label>
              <textarea
                name="body"
                rows={5}
                required
                placeholder={"Hola,\n\nQueríamos avisarte que este viernes tenemos un 20% de descuento...\n\n¡Te esperamos!"}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Programación</Label>
              <ProgramacionForm />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={pending} className="flex-1">
                {pending ? "Guardando..." : "Guardar campaña"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setNuevaOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal preview */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Asunto</p>
                <p className="font-medium">{preview.subject}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Mensaje</p>
                <p className="whitespace-pre-wrap text-muted-foreground bg-secondary rounded-lg p-3">{preview.body}</p>
              </div>
              {programacionLabel(preview) && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Programación</p>
                  <p className="font-medium">{programacionLabel(preview)}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
