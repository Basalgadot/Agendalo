"use client";

import { useActionState, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { crearProfesional, editarProfesional, eliminarProfesional } from "@/app/actions/profesionales";
import type { Service } from "@/types";

type ProfesionalConServicios = {
  id: string;
  name: string;
  bio: string | null;
  order: number;
  isActive: boolean;
  services: { service: Service }[];
};

interface Props {
  profesionales: ProfesionalConServicios[];
  servicios: Service[];
}

function ProfesionalForm({
  profesional,
  servicios,
  action,
  pending,
}: {
  profesional?: ProfesionalConServicios;
  servicios: Service[];
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  const serviciosAsignados = profesional?.services.map((s) => s.service.id) ?? [];

  return (
    <form action={action} className="space-y-4">
      {profesional && <input type="hidden" name="id" value={profesional.id} />}
      <div className="space-y-2">
        <Label>Nombre *</Label>
        <Input name="name" defaultValue={profesional?.name} placeholder="Ej: Carlos Cortez" required />
      </div>
      <div className="space-y-2">
        <Label>Bio corta (opcional)</Label>
        <Input name="bio" defaultValue={profesional?.bio ?? ""} placeholder="10 años de experiencia..." />
      </div>
      {servicios.length > 0 && (
        <div className="space-y-2">
          <Label>Servicios que ofrece</Label>
          <div className="space-y-2">
            {servicios.map((s) => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="serviceIds"
                  value={s.id}
                  defaultChecked={serviciosAsignados.includes(s.id)}
                  className="accent-primary"
                />
                <span className="text-sm">{s.name}</span>
                <span className="text-xs text-muted-foreground">({s.duration} min)</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando..." : profesional ? "Guardar cambios" : "Agregar profesional"}
      </Button>
    </form>
  );
}

export function ProfesionalesClient({ profesionales, servicios }: Props) {
  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState<ProfesionalConServicios | null>(null);

  const [crearState, crearAction, crearPending] = useActionState(crearProfesional, { error: undefined } as { error?: string });
  const [editarState, editarAction, editarPending] = useActionState(editarProfesional, { error: undefined } as { error?: string });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Profesionales</h1>
          <p className="text-muted-foreground text-sm">
            {profesionales.length} {profesionales.length === 1 ? "profesional" : "profesionales"}
          </p>
        </div>
        <Button onClick={() => setShowCrear(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo profesional
        </Button>
      </div>

      {profesionales.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground mb-4">Aún no tienes profesionales configurados.</p>
            <Button onClick={() => setShowCrear(true)}>Agregar profesional</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {profesionales.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{p.name}</p>
                    {p.bio && <p className="text-sm text-muted-foreground">{p.bio}</p>}
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {p.services.map(({ service }) => (
                        <Badge key={service.id} variant="secondary" className="text-xs">
                          {service.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setEditando(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => eliminarProfesional(p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear */}
      <Dialog open={showCrear} onOpenChange={setShowCrear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo profesional</DialogTitle>
          </DialogHeader>
          {crearState?.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {crearState.error}
            </p>
          )}
          <ProfesionalForm servicios={servicios} action={crearAction} pending={crearPending} />
        </DialogContent>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={!!editando} onOpenChange={() => setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar profesional</DialogTitle>
          </DialogHeader>
          {editarState?.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {editarState.error}
            </p>
          )}
          {editando && (
            <ProfesionalForm
              profesional={editando}
              servicios={servicios}
              action={editarAction}
              pending={editarPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
