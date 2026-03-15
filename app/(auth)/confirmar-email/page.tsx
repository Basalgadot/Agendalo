"use client";

import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verificarOtp, reenviarOtp } from "@/app/actions/auth";
import { Mail } from "lucide-react";

function ConfirmarEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [verifyState, verifyAction, verifyPending] = useActionState(
    verificarOtp,
    { error: undefined } as { error?: string; success?: boolean }
  );

  const [resendState, resendAction, resendPending] = useActionState(
    reenviarOtp,
    { error: undefined } as { error?: string; success?: boolean }
  );

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Confirma tu correo</CardTitle>
        <CardDescription>
          Enviamos un código de 6 dígitos a{" "}
          <span className="font-medium text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={verifyAction} className="space-y-4">
          <input type="hidden" name="email" value={email} />

          {verifyState?.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {verifyState.error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="token">Código de verificación</Label>
            <Input
              id="token"
              name="token"
              placeholder="123456"
              maxLength={6}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              required
            />
          </div>

          <Button className="w-full" type="submit" disabled={verifyPending}>
            {verifyPending ? "Verificando..." : "Confirmar cuenta"}
          </Button>
        </form>

        <div className="border-t border-border pt-4">
          <p className="text-center text-sm text-muted-foreground mb-3">
            ¿No te llegó el código?
          </p>
          <form action={resendAction}>
            <input type="hidden" name="email" value={email} />
            {resendState?.success && (
              <p className="text-sm text-center text-green-400 mb-2">
                Código reenviado — revisa tu bandeja de entrada
              </p>
            )}
            {resendState?.error && (
              <p className="text-sm text-center text-destructive mb-2">
                {resendState.error}
              </p>
            )}
            <Button
              variant="outline"
              className="w-full"
              type="submit"
              disabled={resendPending}
            >
              {resendPending ? "Enviando..." : "Reenviar código"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConfirmarEmailPage() {
  return (
    <Suspense>
      <ConfirmarEmailContent />
    </Suspense>
  );
}
