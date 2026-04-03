"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare } from "lucide-react";
import { useSessionUser } from "@/hooks/useSessionUser";
import { getPusherClient } from "@/lib/pusher-client";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import type { ChatMessage } from "@/types";

interface SeenEntry {
  userId: string;
  userName: string;
  lastSeenAt: string;
}

interface ChatWindowProps {
  ticketId: string;
  createdById: string;
}

export function ChatWindow({ ticketId, createdById }: ChatWindowProps) {
  const { user } = useSessionUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [seenBy, setSeenBy] = useState<SeenEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  const markAsSeen = useCallback(async () => {
    try {
      await fetch(`/api/tickets/${ticketId}/seen`, { method: "PUT" });
    } catch {
      // silently fail
    }
  }, [ticketId]);

  const fetchSeenStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/seen`);
      if (res.ok) {
        const data = await res.json();
        setSeenBy(data);
      }
    } catch {
      // silently fail
    }
  }, [ticketId]);

  const fetchMessages = useCallback(
    async (cursor?: string) => {
      try {
        const params = new URLSearchParams();
        if (cursor) params.set("cursor", cursor);

        const res = await fetch(
          `/api/tickets/${ticketId}/messages?${params}`
        );
        if (res.ok) {
          const data = await res.json();
          if (cursor) {
            setMessages((prev) => [...data.messages, ...prev]);
          } else {
            setMessages(data.messages);
          }
          setHasMore(data.hasMore);
          setNextCursor(data.nextCursor);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [ticketId]
  );

  useEffect(() => {
    isInitialLoad.current = true;
    fetchMessages();
    fetchSeenStatus();
  }, [fetchMessages, fetchSeenStatus]);

  useEffect(() => {
    if (!loading && isInitialLoad.current) {
      bottomRef.current?.scrollIntoView();
      isInitialLoad.current = false;
      markAsSeen();
    }
  }, [loading, messages, markAsSeen]);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`private-ticket-${ticketId}`);

    channel.bind("new-message", (data: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === data._id)) return prev;
        return [...prev, data];
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      markAsSeen();
    });

    channel.bind("message-seen", (data: SeenEntry) => {
      setSeenBy((prev) => {
        const idx = prev.findIndex((s) => s.userId === data.userId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = data;
          return updated;
        }
        return [...prev, data];
      });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-ticket-${ticketId}`);
    };
  }, [ticketId, markAsSeen]);

  async function handleSend(content: string) {
    if (!content.trim() || sending) return;
    setSending(true);

    try {
      await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  }

  const otherSeenBy = seenBy.filter((s) => s.userId !== user?.id);

  if (loading) {
    return (
      <Card className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Chat do Ticket</h3>
        <span className="text-xs text-muted-foreground">
          ({messages.length} mensagens)
        </span>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {hasMore && (
          <div className="mb-4 text-center">
            <button
              onClick={() => nextCursor && fetchMessages(nextCursor)}
              className="text-xs text-primary hover:underline"
            >
              Carregar mensagens anteriores
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="mb-2 h-8 w-8" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs">Envie a primeira mensagem</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <MessageBubble
                key={msg._id}
                message={msg}
                isOwn={msg.senderId !== createdById}
                seenBy={otherSeenBy}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </ScrollArea>

      <MessageInput onSend={handleSend} disabled={sending} />
    </Card>
  );
}
