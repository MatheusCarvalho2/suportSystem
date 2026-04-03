"use client";

import { useEffect, useState, useCallback, use } from "react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  ArrowLeft,
  ExternalLink,
  Plus,
  X,
  Loader2,
  Ticket as TicketIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useSessionUser } from "@/hooks/useSessionUser";
import Link from "next/link";

interface PortalDetail {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  createdAt: string;
  devLinks: {
    id: string;
    user: { id: string; name: string; email: string };
  }[];
  tickets: {
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    createdBy: { id: string; name: string };
    assignments: { user: { id: string; name: string } }[];
  }[];
  _count: { tickets: number };
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

const statusLabels: Record<string, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em Andamento",
  WAITING: "Aguardando",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
};

const priorityLabels: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export default function PortalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useSessionUser();
  const [portal, setPortal] = useState<PortalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const isOperatorAdmin =
    user?.organizationType === "OPERATOR" && user?.role === "ADMIN";

  const fetchPortal = useCallback(async () => {
    try {
      const res = await fetch(`/api/portals/${id}`);
      if (res.ok) setPortal(await res.json());
    } catch {
      toast.error("Erro ao carregar portal");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setTeamMembers(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchPortal();
    if (isOperatorAdmin) fetchTeamMembers();
  }, [fetchPortal, fetchTeamMembers, isOperatorAdmin]);

  async function handleAssignDev() {
    if (!selectedUserId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/portals/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      if (res.ok) {
        toast.success("Dev vinculado ao portal");
        setAssignDialogOpen(false);
        setSelectedUserId("");
        fetchPortal();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch {
      toast.error("Erro ao vincular dev");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemoveDev(userId: string) {
    try {
      const res = await fetch(`/api/portals/${id}/assign`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        toast.success("Dev removido do portal");
        fetchPortal();
      }
    } catch {
      toast.error("Erro ao remover dev");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!portal) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Portal não encontrado</p>
      </div>
    );
  }

  const assignedUserIds = new Set(portal.devLinks.map((l) => l.user.id));
  const availableMembers = teamMembers.filter(
    (m) => !assignedUserIds.has(m.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/portals">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            {portal.name}
          </h1>
          {portal.description && (
            <p className="text-muted-foreground">{portal.description}</p>
          )}
        </div>
        {portal.url && (
          <a
            href={portal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Acessar
            </Button>
          </a>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Desenvolvedores</CardTitle>
              {isOperatorAdmin && (
                <Dialog
                  open={assignDialogOpen}
                  onOpenChange={setAssignDialogOpen}
                >
                  <DialogTrigger render={<Button size="sm" variant="outline" />}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Vincular
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Vincular Dev ao Portal</DialogTitle>
                      <DialogDescription>
                        Selecione um membro da equipe para vincular
                      </DialogDescription>
                    </DialogHeader>
                    <Select
                      value={selectedUserId}
                      onValueChange={(v) => v !== null && setSelectedUserId(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um dev">
                          {(value: string) => {
                            const m = availableMembers.find((member) => member.id === value);
                            return m ? `${m.name} (${m.email})` : value;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {availableMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} ({member.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <DialogFooter>
                      <Button
                        onClick={handleAssignDev}
                        disabled={!selectedUserId || assigning}
                      >
                        {assigning && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Vincular
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {portal.devLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum dev vinculado
              </p>
            ) : (
              <div className="space-y-2">
                {portal.devLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{link.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {link.user.email}
                      </p>
                    </div>
                    {isOperatorAdmin && (
                      <button
                        onClick={() => handleRemoveDev(link.user.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Tickets Recentes ({portal._count.tickets})
            </CardTitle>
            <CardDescription>
              Últimos tickets abertos neste portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {portal.tickets.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <TicketIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Nenhum ticket neste portal
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {portal.tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/tickets/${ticket.id}`}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <div>
                      <p className="text-sm font-medium">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        por {ticket.createdBy.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {priorityLabels[ticket.priority]}
                      </Badge>
                      <Badge
                        variant={
                          ticket.status === "OPEN"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {statusLabels[ticket.status]}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
