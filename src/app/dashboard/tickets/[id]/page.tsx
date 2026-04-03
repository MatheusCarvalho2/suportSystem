"use client";

import { useEffect, useState, useCallback, use } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Globe,
  User,
  Calendar,
  UserPlus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSessionUser } from "@/hooks/useSessionUser";
import { getPusherClient } from "@/lib/pusher-client";
import { ChatWindow } from "@/components/chat/ChatWindow";
import Link from "next/link";

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  portal: { id: string; name: string };
  createdBy: { id: string; name: string; email: string };
  assignments: {
    user: { id: string; name: string; email: string };
  }[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  OPEN: { label: "Aberto", variant: "default" },
  IN_PROGRESS: { label: "Em Andamento", variant: "secondary" },
  WAITING: { label: "Aguardando", variant: "outline" },
  RESOLVED: { label: "Resolvido", variant: "secondary" },
  CLOSED: { label: "Fechado", variant: "outline" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  LOW: { label: "Baixa", className: "bg-blue-100 text-blue-700" },
  MEDIUM: { label: "Média", className: "bg-yellow-100 text-yellow-700" },
  HIGH: { label: "Alta", className: "bg-orange-100 text-orange-700" },
  URGENT: { label: "Urgente", className: "bg-red-100 text-red-700" },
};

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useSessionUser();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const [resolutionForm, setResolutionForm] = useState({
    resolutionCause: "",
    impactedArea: "",
    actionTaken: "",
    resolutionStatus: "",
  });

  const isOperator = user?.organizationType === "OPERATOR";

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`);
      if (res.ok) setTicket(await res.json());
    } catch {
      toast.error("Erro ao carregar ticket");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`private-ticket-${id}`);
    channel.bind("ticket-updated", (data: TicketDetail) => {
      setTicket(data);
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-ticket-${id}`);
    };
  }, [id]);

  useEffect(() => {
    if (isOperator) {
      fetch("/api/users")
        .then((res) => res.json())
        .then(setTeamMembers)
        .catch(() => {});
    }
  }, [isOperator]);

  async function handleStatusChange(status: string) {
    if (status === "CLOSED") {
      setCloseDialogOpen(true);
      return;
    }
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTicket(updated);
        toast.success("Status atualizado");
      }
    } catch {
      toast.error("Erro ao atualizar status");
    }
  }

  async function handleCloseTicket(e: React.FormEvent) {
    e.preventDefault();
    setClosingTicket(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CLOSED",
          ...resolutionForm,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTicket(updated);
        setCloseDialogOpen(false);
        setResolutionForm({
          resolutionCause: "",
          impactedArea: "",
          actionTaken: "",
          resolutionStatus: "",
        });
        toast.success("Ticket encerrado com sucesso");
      }
    } catch {
      toast.error("Erro ao encerrar ticket");
    } finally {
      setClosingTicket(false);
    }
  }

  async function handleAssign() {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignUserId: selectedUserId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTicket(updated);
        setAssignDialogOpen(false);
        setSelectedUserId("");
        toast.success("Dev atribuído ao ticket");
      }
    } catch {
      toast.error("Erro ao atribuir dev");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Ticket não encontrado</p>
      </div>
    );
  }

  const assignedIds = new Set(ticket.assignments.map((a) => a.user.id));
  const availableMembers = teamMembers.filter((m) => !assignedIds.has(m.id));

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 lg:flex-row">
      <div className="flex flex-col gap-4 lg:w-80 shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/tickets">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold truncate">{ticket.title}</h1>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Status</p>
              {isOperator ? (
                <Select
                  value={ticket.status}
                  onValueChange={(v) => v !== null && void handleStatusChange(v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue>
                      {(value: string) => statusConfig[value]?.label ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Aberto</SelectItem>
                    <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                    <SelectItem value="WAITING">Aguardando</SelectItem>
                    <SelectItem value="RESOLVED">Resolvido</SelectItem>
                    <SelectItem value="CLOSED">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={statusConfig[ticket.status]?.variant}>
                  {statusConfig[ticket.status]?.label}
                </Badge>
              )}
            </div>

            <div>
              <p className="text-muted-foreground mb-1">Prioridade</p>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  priorityConfig[ticket.priority]?.className
                }`}
              >
                {priorityConfig[ticket.priority]?.label}
              </span>
            </div>

            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                Portal
              </p>
              <Link
                href={`/dashboard/portals/${ticket.portal.id}`}
                className="text-primary hover:underline"
              >
                {ticket.portal.name}
              </Link>
            </div>

            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                Criado por
              </p>
              <p>{ticket.createdBy.name}</p>
            </div>

            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Criado em
              </p>
              <p>
                {format(new Date(ticket.createdAt), "dd MMM yyyy, HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-muted-foreground flex items-center gap-1">
                  <UserPlus className="h-3.5 w-3.5" />
                  Atribuídos
                </p>
                {isOperator && (
                  <Dialog
                    open={assignDialogOpen}
                    onOpenChange={setAssignDialogOpen}
                  >
                    <DialogTrigger render={<Button variant="ghost" size="sm" className="h-6 text-xs" />}>
                      + Atribuir
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Atribuir Dev</DialogTitle>
                        <DialogDescription>
                          Selecione um dev para atribuir ao ticket
                        </DialogDescription>
                      </DialogHeader>
                      <Select
                        value={selectedUserId}
                        onValueChange={(v) => v !== null && setSelectedUserId(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione">
                            {(value: string) => availableMembers.find((m) => m.id === value)?.name ?? value}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {availableMembers.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <DialogFooter>
                        <Button
                          onClick={handleAssign}
                          disabled={!selectedUserId}
                        >
                          Atribuir
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {ticket.assignments.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ninguém atribuído</p>
              ) : (
                <div className="space-y-1">
                  {ticket.assignments.map((a) => (
                    <p key={a.user.id} className="text-xs">
                      {a.user.name}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-muted-foreground mb-1">Descrição</p>
              <p className="whitespace-pre-wrap text-xs">{ticket.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 min-h-0">
        <ChatWindow ticketId={id} createdById={ticket.createdBy.id} />
      </div>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCloseTicket}>
            <DialogHeader>
              <DialogTitle>Encerrar Ticket</DialogTitle>
              <DialogDescription>
                Preencha as informações de resolução para encerrar o ticket
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="resolutionCause">Causa</Label>
                <Textarea
                  id="resolutionCause"
                  placeholder="Ex: Instabilidade no portal BLL/BNC"
                  value={resolutionForm.resolutionCause}
                  onChange={(e) =>
                    setResolutionForm((prev) => ({ ...prev, resolutionCause: e.target.value }))
                  }
                  rows={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="impactedArea">Área impactada</Label>
                <Input
                  id="impactedArea"
                  placeholder="Ex: Cadastro de Proposta"
                  value={resolutionForm.impactedArea}
                  onChange={(e) =>
                    setResolutionForm((prev) => ({ ...prev, impactedArea: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actionTaken">Ação tomada</Label>
                <Textarea
                  id="actionTaken"
                  placeholder="Ex: Orientado sobre instabilidade"
                  value={resolutionForm.actionTaken}
                  onChange={(e) =>
                    setResolutionForm((prev) => ({ ...prev, actionTaken: e.target.value }))
                  }
                  rows={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolutionStatus">Status da resolução</Label>
                <Input
                  id="resolutionStatus"
                  placeholder="Ex: Orientado"
                  value={resolutionForm.resolutionStatus}
                  onChange={(e) =>
                    setResolutionForm((prev) => ({ ...prev, resolutionStatus: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCloseDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={closingTicket}>
                {closingTicket && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Encerrar Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
