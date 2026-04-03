"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  Loader2,
  MoreHorizontal,
  Shield,
  Trash2,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSessionUser } from "@/hooks/useSessionUser";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  portalLinks?: { portal: { id: string; name: string } }[];
}

export default function TeamPage() {
  const { user } = useSessionUser();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState("MEMBER");

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) setMembers(await res.json());
    } catch {
      toast.error("Erro ao carregar equipe");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          role: newRole,
        }),
      });

      if (res.ok) {
        toast.success("Membro adicionado");
        setDialogOpen(false);
        fetchMembers();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch {
      toast.error("Erro ao adicionar membro");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleRole(member: TeamMember) {
    const newRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success(`Papel alterado para ${newRole === "ADMIN" ? "Admin" : "Membro"}`);
        fetchMembers();
      }
    } catch {
      toast.error("Erro ao alterar papel");
    }
  }

  async function handleRemove(member: TeamMember) {
    if (!confirm(`Remover ${member.name} da equipe?`)) return;
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Membro removido");
        setMembers((prev) => prev.filter((m) => m.id !== member.id));
      }
    } catch {
      toast.error("Erro ao remover membro");
    }
  }

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
          <h1 className="text-2xl font-bold">Equipe</h1>
          <p className="text-muted-foreground">
            Gerencie os membros da sua organização
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Membro
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Adicionar Membro</DialogTitle>
                <DialogDescription>
                  Crie uma conta para um novo membro da equipe
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha inicial</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Papel</Label>
                  <Select value={newRole} onValueChange={(v) => v !== null && setNewRole(v)}>
                    <SelectTrigger>
                      <SelectValue>
                        {(value: string) => value === "ADMIN" ? "Admin" : "Membro"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Membro</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Adicionar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Membros ({members.length})
          </CardTitle>
          <CardDescription>
            {user?.organizationType === "OPERATOR"
              ? "Desenvolvedores e administradores"
              : "Membros do suporte nível 1"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                {user?.organizationType === "OPERATOR" && (
                  <TableHead>Portais</TableHead>
                )}
                <TableHead>Desde</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.role === "ADMIN" ? "default" : "secondary"
                      }
                    >
                      {member.role === "ADMIN" ? "Admin" : "Membro"}
                    </Badge>
                  </TableCell>
                  {user?.organizationType === "OPERATOR" && (
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.portalLinks?.map((link) => (
                          <Badge
                            key={link.portal.id}
                            variant="outline"
                            className="text-xs"
                          >
                            <Globe className="mr-1 h-2.5 w-2.5" />
                            {link.portal.name}
                          </Badge>
                        ))}
                        {(!member.portalLinks ||
                          member.portalLinks.length === 0) && (
                          <span className="text-xs text-muted-foreground">
                            Nenhum
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground text-xs">
                    {format(new Date(member.createdAt), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    {member.id !== user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleToggleRole(member)}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            {member.role === "ADMIN"
                              ? "Tornar Membro"
                              : "Tornar Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRemove(member)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
