"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useSessionUser } from "@/hooks/useSessionUser";
import { getPusherClient } from "@/lib/pusher-client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

interface GroupedNotification {
  id: string;
  message: string;
  ticketId: string | null;
  read: boolean;
  createdAt: string;
  count: number;
}

export function NotificationBell() {
  const { user } = useSessionUser();
  const [notifications, setNotifications] = useState<GroupedNotification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user?.id) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`private-user-${user.id}`);
    channel.bind(
      "new-notification",
      (data: { id: string; message: string; ticketId: string | null; read: boolean; createdAt: string }) => {
        setNotifications((prev) => {
          const key = data.ticketId;
          if (key) {
            const idx = prev.findIndex((n) => n.ticketId === key);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = {
                ...data,
                count: updated[idx].count + 1,
                read: false,
              };
              const [item] = updated.splice(idx, 1);
              return [item, ...updated];
            }
          }
          return [{ ...data, count: 1 }, ...prev];
        });
      }
    );
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${user.id}`);
    };
  }, [user?.id, fetchNotifications]);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silently fail
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </p>
          ) : (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                href={
                  notification.ticketId
                    ? `/dashboard/tickets/${notification.ticketId}`
                    : "#"
                }
                onClick={() => setOpen(false)}
                className={`block border-b px-4 py-3 transition-colors hover:bg-accent ${
                  !notification.read ? "bg-accent/50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm flex-1">{notification.message}</p>
                  {notification.count > 1 && (
                    <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                      {notification.count}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </Link>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
