"use client";

import { useActionState, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { guardarInfoNegocio, guardarHorarios, guardarApariencia } from "@/app/actions/configuracion";
import { ImageUpload } from "@/components/image-upload";
import type { Business, BusinessSchedule } from "@/types";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Paleta de colores predefinidos para fácil selección
const COLORES_PRESET = [
  "#F97316", "#EF4444", "#EC4899", "#8B5CF6",
  "#3B82F6", "#06B6D4", "#10B981", "#84CC16",
  "#F59E0B", "#6B7280",
];

function ColorPicker({ defaultValue }: { defaultValue: string }) {
  const [color, setColor] = useState(defaultValue);
  return (
    <div className="space-y-3">
      <input type="hidden" name="primaryColor" value={color} />
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {COLORES_PRESET.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
            style={{ backgroundColor: c }}
          />
        ))}
        {/* Custom color input */}
        <label className="w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden relative" title="Color personalizado">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <span className="text-xs text-muted-foreground">+</span>
        </label>
      </div>
      {/* Preview */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
          style={{ backgroundColor: color }}
        >
          Vista previa del botón
        </button>
        <span className="text-xs text-muted-foreground font-mono">{color}</span>
      </div>
    </div>
  );
}

interface Props {
  business: Business;
  schedules: BusinessSchedule[];
}

export function ConfiguracionClient({ business, schedules }: Props) {
  const [infoState, infoAction, infoPending] = useActionState(guardarInfoNegocio, { error: undefined, success: undefined });
  const [horariosState, horariosAction, horariosPending] = useActionState(guardarHorarios, { error: undefined, success: undefined });
  const [aparienciaState, aparienciaAction, aparienciaPending] = useActionState(guardarApariencia, { error: undefined, success: undefined });

  // Construir mapa de horarios por día
  const scheduleMap = Object.fromEntries(
    schedules.map((s) => [s.dayOfWeek, s])
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agendalo.app";

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Configuración</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Personaliza tu negocio y horarios de atención.
      </p>

      {/* Link público */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground mb-1">Tu página pública para compartir</p>
          <p className="font-mono text-sm font-medium text-primary">
            {appUrl}/{business.slug}
          </p>
          {business.subdomain && (
            <p className="font-mono text-xs text-muted-foreground mt-1">
              {business.subdomain}.agendalo.app
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="info">
        <TabsList className="mb-6 h-auto gap-2 bg-transparent p-0">
          <TabsTrigger
            value="info"
            className="px-5 py-2.5 rounded-lg border border-border bg-card text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary"
          >
            Información
          </TabsTrigger>
          <TabsTrigger
            value="horarios"
            className="px-5 py-2.5 rounded-lg border border-border bg-card text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary"
          >
            Horarios
          </TabsTrigger>
          <TabsTrigger
            value="apariencia"
            className="px-5 py-2.5 rounded-lg border border-border bg-card text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary"
          >
            Apariencia
          </TabsTrigger>
        </TabsList>

        {/* Información del negocio */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos del negocio</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={infoAction} className="space-y-4">
                {infoState?.error && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    {infoState.error}
                  </p>
                )}
                {(infoState as { success?: boolean })?.success && (
                  <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-md flex items-center gap-2">
                    <Check className="h-4 w-4" /> Cambios guardados
                  </p>
                )}
                <div className="space-y-2">
                  <Label>Nombre del negocio *</Label>
                  <Input name="name" defaultValue={business.name} required />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input name="description" defaultValue={business.description ?? ""} placeholder="Describe tu negocio..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input name="phone" defaultValue={business.phone ?? ""} placeholder="+56 9 1234 5678" />
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input name="address" defaultValue={business.address ?? ""} placeholder="Av. Principal 123" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Instagram</Label>
                    <Input name="instagram" defaultValue={(business as { instagram?: string }).instagram ?? ""} placeholder="@tunegocio" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email de contacto</Label>
                    <Input name="email" type="email" defaultValue={business.email ?? ""} placeholder="contacto@tunegocio.cl" />
                    <p className="text-xs text-muted-foreground">Aquí recibirás las notificaciones de nuevas citas.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Duración mínima de slots</Label>
                  <select
                    name="slotDuration"
                    defaultValue={business.slotDuration}
                    className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-sm"
                  >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={60}>60 minutos</option>
                  </select>
                </div>
                <Button type="submit" disabled={infoPending}>
                  {infoPending ? "Guardando..." : "Guardar información"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Apariencia */}
        <TabsContent value="apariencia">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identidad visual</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={aparienciaAction} className="space-y-5">
                {aparienciaState?.error && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    {aparienciaState.error}
                  </p>
                )}
                {(aparienciaState as { success?: boolean })?.success && (
                  <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-md flex items-center gap-2">
                    <Check className="h-4 w-4" /> Apariencia guardada
                  </p>
                )}
                <div className="space-y-2">
                  <Label>Color principal</Label>
                  <ColorPicker defaultValue={business.primaryColor ?? "#F97316"} />
                  <p className="text-xs text-muted-foreground">
                    Define el color de botones y acentos en tu página pública.
                  </p>
                </div>
                <ImageUpload
                  name="logoUrl"
                  defaultValue={business.logoUrl}
                  label="Logo del negocio"
                  hint="Aparece en la esquina superior de tu página. Recomendado: imagen cuadrada 200×200px."
                />
                <ImageUpload
                  name="coverUrl"
                  defaultValue={business.coverUrl}
                  label="Imagen de portada"
                  hint="Banner superior de tu página. Recomendado: 1200×400px."
                />
                <Button type="submit" disabled={aparienciaPending}>
                  {aparienciaPending ? "Guardando..." : "Guardar apariencia"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Horarios */}
        <TabsContent value="horarios">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Horarios de atención</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={horariosAction} className="space-y-3">
                {horariosState?.error && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    {horariosState.error}
                  </p>
                )}
                {(horariosState as { success?: boolean })?.success && (
                  <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-md flex items-center gap-2">
                    <Check className="h-4 w-4" /> Horarios actualizados
                  </p>
                )}
                {DIAS.map((dia, i) => {
                  const h = scheduleMap[i];
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`day_${i}_open`}
                        name={`day_${i}_open`}
                        defaultChecked={h?.isOpen ?? (i >= 1 && i <= 6)}
                        className="accent-primary w-4 h-4"
                      />
                      <label htmlFor={`day_${i}_open`} className="w-20 text-sm font-medium">
                        {dia}
                      </label>
                      <Input
                        name={`day_${i}_from`}
                        type="time"
                        defaultValue={h?.openTime ?? "09:00"}
                        className="w-32 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">a</span>
                      <Input
                        name={`day_${i}_to`}
                        type="time"
                        defaultValue={h?.closeTime ?? "18:00"}
                        className="w-32 text-sm"
                      />
                    </div>
                  );
                })}
                <Button type="submit" className="mt-4" disabled={horariosPending}>
                  {horariosPending ? "Guardando..." : "Guardar horarios"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
