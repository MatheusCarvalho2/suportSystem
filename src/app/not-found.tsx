import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Headphones } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4">
      <Headphones className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">
        A página que você procura não existe ou foi movida.
      </p>
      <Link href="/dashboard">
        <Button>Voltar ao Dashboard</Button>
      </Link>
    </div>
  );
}
