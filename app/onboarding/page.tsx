"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { OnboardingProgress } from "@/components/shared/onboarding-progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Suspense } from "react";
import {
  guardarPaso1,
  guardarPaso2,
  guardarPaso3,
  guardarPaso4,
  guardarPaso5,
} from "@/app/actions/onboarding";

const CATEGORIAS = [
  "Barbería",
  "Salón de belleza",
  "Tatuajes y piercings",
  "Veterinaria",
  "Psicología",
  "Dentista",
  "Fisioterapia",
  "Peluquería canina",
  "Spa y masajes",
  "Nutrición",
  "Entrenamiento personal",
  "Otro",
];

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function OnboardingContent() {
  const searchParams = useSearchParams();
  const paso = Number(searchParams.get("paso") || "1");

  return (
    <div>
      <OnboardingProgress actual={paso} />

      {paso === 1 && <Paso1 />}
      {paso === 2 && <Paso2 />}
      {paso === 3 && <Paso3 />}
      {paso === 4 && <Paso4 />}
      {paso === 5 && <Paso5 />}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="text-center text-muted-foreground">Cargando...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}

// ── Paso 1: Datos del negocio ─────────────────────────────────────────────────
function Paso1() {
  const [state, action, pending] = useActionState(guardarPaso1, { error: undefined } as { error?: string });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuéntanos sobre tu negocio</CardTitle>
        <CardDescription>Esta información aparecerá en tu página pública.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state?.error && <ErrorMsg msg={state.error} />}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del negocio *</Label>
            <Input id="name" name="name" placeholder="Barbería Hermanos Cortez" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoría *</Label>
            <select
              id="category"
              name="category"
              required
              className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Selecciona una categoría</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción corta (opcional)</Label>
            <Input id="description" name="description" placeholder="Los mejores cortes del barrio desde 2010" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input id="phone" name="phone" placeholder="+56 9 1234 5678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección (opcional)</Label>
              <Input id="address" name="address" placeholder="Av. Principal 123" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Guardando..." : "Continuar →"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Paso 2: Logo y portada ────────────────────────────────────────────────────
function Paso2() {
  const [state, action, pending] = useActionState(guardarPaso2, { error: undefined } as { error?: string });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Imagen de tu negocio</CardTitle>
        <CardDescription>
          Puedes saltarte este paso y subir las fotos después desde la configuración.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state?.error && <ErrorMsg msg={state.error} />}
          <p className="text-sm text-muted-foreground bg-secondary rounded-lg p-4">
            La subida de imágenes se habilitará una vez conectes tu cuenta de Supabase. Por ahora puedes continuar.
          </p>
          <input type="hidden" name="logoUrl" value="" />
          <input type="hidden" name="coverUrl" value="" />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Guardando..." : "Continuar →"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Paso 3: Horarios ──────────────────────────────────────────────────────────
function Paso3() {
  const [state, action, pending] = useActionState(guardarPaso3, { error: undefined } as { error?: string });

  // Por defecto: L-V abierto 09:00–18:00, S 09:00–14:00, D cerrado
  const defaults = [
    { open: false, from: "09:00", to: "18:00" }, // 0 Dom
    { open: true,  from: "09:00", to: "18:00" }, // 1 Lun
    { open: true,  from: "09:00", to: "18:00" }, // 2 Mar
    { open: true,  from: "09:00", to: "18:00" }, // 3 Mié
    { open: true,  from: "09:00", to: "18:00" }, // 4 Jue
    { open: true,  from: "09:00", to: "18:00" }, // 5 Vie
    { open: true,  from: "09:00", to: "14:00" }, // 6 Sáb
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horarios de atención</CardTitle>
        <CardDescription>¿Cuándo está abierto tu negocio?</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          {state?.error && <ErrorMsg msg={state.error} />}
          {DIAS.map((dia, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`day_${i}_open`}
                name={`day_${i}_open`}
                defaultChecked={defaults[i].open}
                className="accent-primary w-4 h-4"
              />
              <label htmlFor={`day_${i}_open`} className="w-20 text-sm font-medium">{dia}</label>
              <Input
                name={`day_${i}_from`}
                type="time"
                defaultValue={defaults[i].from}
                className="w-32 text-sm"
              />
              <span className="text-muted-foreground text-sm">a</span>
              <Input
                name={`day_${i}_to`}
                type="time"
                defaultValue={defaults[i].to}
                className="w-32 text-sm"
              />
            </div>
          ))}
          <Button type="submit" className="w-full mt-4" disabled={pending}>
            {pending ? "Guardando..." : "Continuar →"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Paso 4: Primer servicio ───────────────────────────────────────────────────
function Paso4() {
  const [state, action, pending] = useActionState(guardarPaso4, { error: undefined } as { error?: string });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tu primer servicio</CardTitle>
        <CardDescription>Agrega el servicio que más ofreces. Podrás agregar más después.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state?.error && <ErrorMsg msg={state.error} />}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del servicio *</Label>
            <Input id="name" name="name" placeholder="Ej: Corte de cabello" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duración (minutos) *</Label>
              <Input id="duration" name="duration" type="number" min={15} step={15} defaultValue={30} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Precio (opcional)</Label>
              <Input id="price" name="price" type="number" min={0} step={1} placeholder="0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input id="description" name="description" placeholder="Incluye lavado y secado" />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Guardando..." : "Continuar →"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Paso 5: Primer profesional ────────────────────────────────────────────────
function Paso5() {
  const [state, action, pending] = useActionState(guardarPaso5, { error: undefined } as { error?: string });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tu primer profesional</CardTitle>
        <CardDescription>¿Quién va a atender las citas? Puedes ser tú mismo.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state?.error && <ErrorMsg msg={state.error} />}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" placeholder="Ej: Carlos Cortez" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio corta (opcional)</Label>
            <Input id="bio" name="bio" placeholder="Ej: 10 años de experiencia en cortes modernos" />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Terminando configuración..." : "¡Listo, abrir mi agenda! →"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{msg}</p>
  );
}
