"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { Info, Check, CheckCheck } from "lucide-react";

const BR_TZ = "America/Sao_Paulo";

interface SeenEntry {
  userId: string;
  userName: string;
  lastSeenAt: string;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  seenBy?: SeenEntry[];
}

export function MessageBubble({ message, isOwn, seenBy = [] }: MessageBubbleProps) {
  if (message.type === "system") {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <Info className="h-3 w-3 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{message.content}</p>
        <span className="text-[10px] text-muted-foreground">
          {format(new TZDate(message.createdAt, BR_TZ), "HH:mm", { locale: ptBR })}
        </span>
      </div>
    );
  }

  const messageTime = new Date(message.createdAt).getTime();
  const wasSeen = seenBy.some(
    (s) => new Date(s.lastSeenAt).getTime() >= messageTime
  );

  return (
    <div className={cn("flex", isOwn ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5",
          isOwn
            ? "rounded-bl-md bg-primary text-primary-foreground"
            : "rounded-br-md bg-muted"
        )}
      >
        {isOwn && (
          <p className="mb-0.5 text-xs font-semibold text-primary-foreground/80">
            {message.senderName}
          </p>
        )}
        {!isOwn && (
          <p className="mb-0.5 text-xs font-semibold text-primary">
            {message.senderName}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1",
            isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          <span className="text-[10px]">
            {format(new TZDate(message.createdAt, BR_TZ), "HH:mm", { locale: ptBR })}
          </span>
          {wasSeen ? (
            <CheckCheck className={cn("h-3.5 w-3.5", isOwn ? "text-blue-300" : "text-blue-500")} />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </div>
      </div>
    </div>
  );
}
