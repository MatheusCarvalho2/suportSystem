"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Loader2, Users, Ticket, Star } from "lucide-react";
import { toast } from "sonner";
import { useSessionUser } from "@/hooks/useSessionUser";
import Link from "next/link";

interface DevLink {
  id: string;
  user: { id: string; name: string; email: string };
}

interface Portal {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  createdAt: string;
  devLinks: DevLink[];
  _count: { tickets: number };
}

export default function PortalsPage() {
  const { user } = useSessionUser();
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isOperatorAdmin =
    user?.organizationType === "OPERATOR" && user?.role === "ADMIN";

  const fetchPortals = useCallback(async () => {
    try {
      const res = await fetch("/api/portals");
      if (res.ok) setPortals(await res.json());
    } catch {
      toast.error("Erro ao carregar portais");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortals();
  }, [fetchPortals]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
          url: formData.get("url"),
        }),
      });

      if (res.ok) {
        const portal = await res.json();
        setPortals((prev) => [portal, ...prev]);
        setDialogOpen(false);
        toast.success("Portal criado com sucesso");
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao criar portal");
      }
    } catch {
      toast.error("Erro ao criar portal");
    } finally {
      setCreating(false);
    }
  }

  const isMyPortal = (portal: Portal) =>
    portal.devLinks.some((link) => link.user.id === user?.id);

  const sortedPortals = [...portals].sort((a, b) => {
    const aIsMine = isMyPortal(a);
    const bIsMine = isMyPortal(b);
    if (aIsMine && !bIsMine) return -1;
    if (!aIsMine && bIsMine) return 1;
    return 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Portais</h1>
          <p className="text-muted-foreground">
            Gerencie os portais e seus desenvolvedores vinculados
          </p>
        </div>
        {isOperatorAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Portal
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Criar Portal</DialogTitle>
                  <DialogDescription>
                    Adicione um novo portal ao sistema
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea id="description" name="description" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      name="url"
                      type="url"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Criar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {portals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Nenhum portal cadastrado</h3>
            <p className="text-sm text-muted-foreground">
              {isOperatorAdmin
                ? "Crie o primeiro portal para começar."
                : "Nenhum portal disponível no momento."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedPortals.map((portal) => {
            const mine = isMyPortal(portal);
            return (
              <Link key={portal.id} href={`/dashboard/portals/${portal.id}`}>
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    mine
                      ? "border-primary/40 bg-portal-highlight ring-1 ring-primary/20"
                      : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                            mine ? "bg-primary" : "bg-muted"
                          }`}
                        >
                          <Globe
                            className={`h-4 w-4 ${
                              mine
                                ? "text-primary-foreground"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {portal.name}
                          </CardTitle>
                        </div>
                      </div>
                      {mine && (
                        <Star className="h-4 w-4 fill-primary text-primary" />
                      )}
                    </div>
                    {portal.description && (
                      <CardDescription className="line-clamp-2">
                        {portal.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Ticket className="h-3.5 w-3.5" />
                      {portal._count.tickets} tickets
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {portal.devLinks.length} devs
                    </span>
                    {mine && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        Meu portal
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
