"use client";

import { useActionState, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Clock, DollarSign } from "lucide-react";
import { crearServicio, editarServicio, eliminarServicio } from "@/app/actions/servicios";
import type { Service } from "@/types";

interface Props {
  servicios: Service[];
}

function ServicioForm({
  servicio,
  action,
  pending,
}: {
  servicio?: Service;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={action} className="space-y-4">
      {servicio && <input type="hidden" name="id" value={servicio.id} />}
      <div className="space-y-2">
        <Label>Nombre *</Label>
        <Input name="name" defaultValue={servicio?.name} placeholder="Ej: Corte de cabello" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Duración (minutos) *</Label>
          <Input name="duration" type="number" min={15} step={15} defaultValue={servicio?.duration ?? 30} required />
        </div>
        <div className="space-y-2">
          <Label>Precio (opcional)</Label>
          <Input name="price" type="number" min={0} step={100} defaultValue={servicio?.price?.toString() ?? ""} placeholder="0" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descripción (opcional)</Label>
        <Input name="description" defaultValue={servicio?.description ?? ""} placeholder="Incluye lavado y secado" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando..." : servicio ? "Guardar cambios" : "Crear servicio"}
      </Button>
    </form>
  );
}

export function ServiciosClient({ servicios }: Props) {
  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState<Service | null>(null);

  const [crearState, crearAction, crearPending] = useActionState(crearServicio, { error: undefined } as { error?: string });
  const [editarState, editarAction, editarPending] = useActionState(editarServicio, { error: undefined } as { error?: string });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Servicios</h1>
          <p className="text-muted-foreground text-sm">
            {servicios.length} {servicios.length === 1 ? "servicio" : "servicios"}
          </p>
        </div>
        <Button onClick={() => setShowCrear(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo servicio
        </Button>
      </div>

      {servicios.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground mb-4">Aún no tienes servicios configurados.</p>
            <Button onClick={() => setShowCrear(true)}>Crear primer servicio</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {servicios.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{s.name}</p>
                  {s.description && (
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  )}
                  <div className="flex gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {s.duration} min
                    </span>
                    {s.price && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        {Number(s.price).toLocaleString("es-CL")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setEditando(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => eliminarServicio(s.id)}
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
            <DialogTitle>Nuevo servicio</DialogTitle>
          </DialogHeader>
          {crearState?.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {crearState.error}
            </p>
          )}
          <ServicioForm action={crearAction} pending={crearPending} />
        </DialogContent>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={!!editando} onOpenChange={() => setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar servicio</DialogTitle>
          </DialogHeader>
          {editarState?.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {editarState.error}
            </p>
          )}
          {editando && <ServicioForm servicio={editando} action={editarAction} pending={editarPending} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
