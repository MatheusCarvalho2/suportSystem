"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Building } from "lucide-react";
import { useSessionUser } from "@/hooks/useSessionUser";

export default function SettingsPage() {
  const { user } = useSessionUser();

  const orgLabel =
    user?.organizationType === "OPERATOR"
      ? "Operador (Desenvolvimento)"
      : "Cliente (Suporte N1)";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua conta e perfil</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Perfil
          </CardTitle>
          <CardDescription>Suas informações de conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={user?.name || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Papel</Label>
            <div>
              <Badge variant={user?.role === "ADMIN" ? "default" : "secondary"}>
                {user?.role === "ADMIN" ? "Administrador" : "Membro"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Organização
          </CardTitle>
          <CardDescription>Informações da sua organização</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da organização</Label>
            <Input value={user?.organizationName || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div>
              <Badge variant="outline">{orgLabel}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Segurança
          </CardTitle>
          <CardDescription>Gerenciamento de senha</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            Alterar Senha (em breve)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
