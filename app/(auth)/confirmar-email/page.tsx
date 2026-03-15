"use client";

import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reenviarConfirmacion } from "@/app/actions/auth";
import { Mail, CheckCircle2 } from "lucide-react";

function ConfirmarEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [state, action, pending] = useActionState(
    reenviarConfirmacion,
    { error: undefined } as { error?: string; success?: boolean }
  );

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Revisa tu correo</CardTitle>
        <CardDescription>
          Enviamos un link de confirmación a{" "}
          <span className="font-medium text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            Abre el email que te enviamos
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            Haz clic en el botón <strong className="text-foreground">"Confirmar cuenta"</strong>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            Serás redirigido automáticamente al panel
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-center text-sm text-muted-foreground mb-3">
            ¿No te llegó el email?
          </p>
          <form action={action}>
            <input type="hidden" name="email" value={email} />
            {state?.success && (
              <p className="text-sm text-center text-green-400 mb-2">
                Email reenviado — revisa tu bandeja de entrada y spam
              </p>
            )}
            {state?.error && (
              <p className="text-sm text-center text-destructive mb-2">
                {state.error}
              </p>
            )}
            <Button variant="outline" className="w-full" type="submit" disabled={pending}>
              {pending ? "Enviando..." : "Reenviar email"}
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
