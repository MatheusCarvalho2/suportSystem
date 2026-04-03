"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Ticket as TicketIcon,
  Plus,
  Loader2,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useSessionUser } from "@/hooks/useSessionUser";

interface TicketData {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  portal: { id: string; name: string };
  createdBy: { id: string; name: string; email: string };
  assignments: { user: { id: string; name: string } }[];
  hasUnread?: boolean;
  lastMessageAt?: string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
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

export default function TicketsPage() {
  const { user } = useSessionUser();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAllPortals, setShowAllPortals] = useState(false);

  const isOperator = user?.organizationType === "OPERATOR";

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);
      params.set("page", page.toString());
      if (showAllPortals) params.set("myPortals", "false");

      const res = await fetch(`/api/tickets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets);
        setTotalPages(data.pages);
      }
    } catch {
      toast.error("Erro ao carregar tickets");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page, showAllPortals]);

  useEffect(() => {
    const debounce = setTimeout(fetchTickets, 300);
    return () => clearTimeout(debounce);
  }, [fetchTickets]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-muted-foreground">
            Gerencie todos os tickets de suporte
          </p>
        </div>
        <Link href="/dashboard/tickets/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Ticket
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar tickets..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            if (v !== null) {
              setStatusFilter(v);
              setPage(1);
            }
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por status">
              {(value: string) => value === "ALL" ? "Todos" : (statusConfig[value]?.label ?? value)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="OPEN">Aberto</SelectItem>
            <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
            <SelectItem value="WAITING">Aguardando</SelectItem>
            <SelectItem value="RESOLVED">Resolvido</SelectItem>
            <SelectItem value="CLOSED">Fechado</SelectItem>
          </SelectContent>
        </Select>
        {isOperator && (
          <Button
            variant={showAllPortals ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowAllPortals((prev) => !prev);
              setPage(1);
            }}
            className="whitespace-nowrap"
          >
            {showAllPortals ? "Todos os portais" : "Meus portais"}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TicketIcon className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Nenhum ticket encontrado</h3>
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== "ALL"
                ? "Tente ajustar os filtros."
                : "Crie o primeiro ticket para começar."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="block">
              <Card className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${ticket.hasUnread ? "border-l-4 border-l-primary" : ""}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold truncate">
                        {ticket.title}
                      </h3>
                      {ticket.hasUnread && (
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <MessageCircle className="h-3 w-3" />
                          Nova
                        </span>
                      )}
                      <Badge variant={statusConfig[ticket.status]?.variant}>
                        {statusConfig[ticket.status]?.label}
                      </Badge>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          priorityConfig[ticket.priority]?.className
                        }`}
                      >
                        {priorityConfig[ticket.priority]?.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {ticket.description}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Portal: {ticket.portal.name}</span>
                      <span>Por: {ticket.createdBy.name}</span>
                      {ticket.assignments.length > 0 && (
                        <span>
                          Atribuído:{" "}
                          {ticket.assignments.map((a) => a.user.name).join(", ")}
                        </span>
                      )}
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(ticket.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
