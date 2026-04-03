"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4">
      <AlertCircle className="h-16 w-16 text-destructive" />
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="text-muted-foreground">
        Ocorreu um erro inesperado. Tente novamente.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
