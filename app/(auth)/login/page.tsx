"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { GoogleButton } from "@/components/google-button";

const initialState = { error: undefined };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Bienvenido de vuelta</CardTitle>
        <CardDescription>Ingresa a tu cuenta de agéndalo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleButton />

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            o con email
          </span>
        </div>

        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {state.error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="tu@email.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required />
          </div>
          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? "Ingresando..." : "Iniciar sesión"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="text-primary hover:underline font-medium">
            Registra tu negocio
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
