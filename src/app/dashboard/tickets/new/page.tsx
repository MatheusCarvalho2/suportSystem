"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Portal {
  id: string;
  name: string;
}

export default function NewTicketPage() {
  const router = useRouter();
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(false);
  const [portalId, setPortalId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  useEffect(() => {
    fetch("/api/portals")
      .then((res) => res.json())
      .then(setPortals)
      .catch(() => toast.error("Erro ao carregar portais"));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description"),
          portalId,
          priority,
        }),
      });

      if (res.ok) {
        const ticket = await res.json();
        toast.success("Ticket criado com sucesso");
        router.push(`/dashboard/tickets/${ticket.id}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao criar ticket");
      }
    } catch {
      toast.error("Erro ao criar ticket");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tickets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Novo Ticket</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Abrir Ticket de Suporte</CardTitle>
            <CardDescription>
              Descreva o problema detalhadamente para que possamos ajudar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portal">Portal</Label>
              <Select value={portalId} onValueChange={(v) => v !== null && setPortalId(v)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o portal">
                    {(value: string) => portals.find((p) => p.id === value)?.name ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {portals.map((portal) => (
                    <SelectItem key={portal.id} value={portal.id}>
                      {portal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                name="title"
                placeholder="Resumo do problema"
                required
                minLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Descreva o problema em detalhes..."
                rows={6}
                required
                minLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => v !== null && setPriority(v)}>
                <SelectTrigger>
                  <SelectValue>
                    {(value: string) => {
                      const labels: Record<string, string> = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta", URGENT: "Urgente" };
                      return labels[value] ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baixa</SelectItem>
                  <SelectItem value="MEDIUM">Média</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={loading || !portalId}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Ticket
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
