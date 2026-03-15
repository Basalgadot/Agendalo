"use client";

import { useState, useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Trash2, Plus, Users, Eye } from "lucide-react";
import { crearCampana, eliminarCampana, enviarCampanaAhora } from "@/app/actions/campanas";

type Campana = {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
};

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

interface Props {
  campanas: Campana[];
  clientesCount: number;
}

export function CampanasClient({ campanas, clientesCount }: Props) {
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [preview, setPreview] = useState<Campana | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [enviandoMsg, setEnviandoMsg] = useState<string | null>(null);
  const [state, action, pending] = useActionState(crearCampana, { error: undefined });

  async function handleEnviarAhora(id: string) {
    setEnviando(id);
    setEnviandoMsg(null);
    const result = await enviarCampanaAhora(id);
    setEnviando(null);
    if (result.error) {
      setEnviandoMsg(`Error: ${result.error}`);
    } else {
      setEnviandoMsg(`✅ Enviado a ${result.enviados} cliente${result.enviados !== 1 ? "s" : ""}`);
    }
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

      {/* Lista de campañas */}
      {campanas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-base">Aún no tienes campañas.</p>
            <p className="text-sm mt-1">Crea una para enviarla a todos tus clientes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campanas.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold truncate">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">📧 {c.subject}</p>
                  {c.status === "SENT" && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enviada {c.sentAt} · {c.recipientCount} destinatarios
                    </p>
                  )}
                  {c.status === "SCHEDULED" && c.scheduledAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">Programada para {c.scheduledAt}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreview(c)}
                    className="gap-1"
                  >
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
          ))}
        </div>
      )}

      {/* Modal nueva campaña */}
      <Dialog open={nuevaOpen} onOpenChange={setNuevaOpen}>
        <DialogContent className="max-w-lg">
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
              <p className="text-xs text-muted-foreground">Solo para que tú la identifiques, no lo verán los clientes.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Asunto del email *</Label>
              <Input name="subject" placeholder="Ej: 🎉 Oferta especial este viernes" required />
            </div>
            <div className="space-y-1.5">
              <Label>Mensaje *</Label>
              <textarea
                name="body"
                rows={6}
                required
                placeholder={"Hola,\n\nQueríamos avisarte que este viernes tenemos un 20% de descuento...\n\n¡Te esperamos!"}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Escribe el mensaje en texto libre. Se enviará con el logo y datos de tu negocio como encabezado.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Programar envío (opcional)</Label>
              <input
                type="datetime-local"
                name="scheduledAt"
                className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm"
              />
              <p className="text-xs text-muted-foreground">Déjalo vacío si quieres enviarlo manualmente cuando quieras.</p>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
