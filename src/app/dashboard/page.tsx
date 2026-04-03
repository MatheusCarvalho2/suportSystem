"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Globe,
  ArrowRight,
  Star,
  Hourglass,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

interface DashboardData {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  waitingTickets: number;
  recentTickets: {
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    portal: { name: string };
    createdBy: { name: string };
    assignments: { user: { name: string } }[];
  }[];
  portals: {
    id: string;
    name: string;
    ticketCount: number;
    devCount: number;
    isMine: boolean;
  }[];
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) setData(await res.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Erro ao carregar dashboard</p>
      </div>
    );
  }

  const stats = [
    {
      title: "Total de Tickets",
      value: data.totalTickets,
      icon: Ticket,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Abertos",
      value: data.openTickets,
      icon: AlertCircle,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Em Andamento",
      value: data.inProgressTickets,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "Aguardando",
      value: data.waitingTickets,
      icon: Hourglass,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Resolvidos",
      value: data.resolvedTickets,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Fechados",
      value: data.closedTickets,
      icon: XCircle,
      color: "text-gray-500",
      bg: "bg-gray-50",
    },
  ];

  const myPortals = data.portals.filter((p) => p.isMine);
  const otherPortals = data.portals.filter((p) => !p.isMine);
  const sortedPortals = [...myPortals, ...otherPortals];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema de suporte
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tickets Recentes</CardTitle>
              <Link
                href="/dashboard/tickets"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Ver todos
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription>
              Últimos tickets criados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentTickets.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <Ticket className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Nenhum ticket ainda
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/tickets/${ticket.id}`}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {ticket.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {ticket.portal.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(ticket.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          priorityConfig[ticket.priority]?.className
                        }`}
                      >
                        {priorityConfig[ticket.priority]?.label}
                      </span>
                      <Badge
                        variant={statusConfig[ticket.status]?.variant}
                        className="text-[10px]"
                      >
                        {statusConfig[ticket.status]?.label}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Portais</CardTitle>
              <Link
                href="/dashboard/portals"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Ver todos
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription>
              Resumo dos portais e seus tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.portals.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <Globe className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Nenhum portal cadastrado
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedPortals.map((portal) => (
                  <Link
                    key={portal.id}
                    href={`/dashboard/portals/${portal.id}`}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-accent ${
                      portal.isMine
                        ? "border-primary/30 bg-portal-highlight"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {portal.isMine && (
                        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      )}
                      <p className="text-sm font-medium">{portal.name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{portal.ticketCount} tickets</span>
                      <span>{portal.devCount} devs</span>
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
