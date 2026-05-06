"use client";

import { io, type Socket } from "socket.io-client";

export async function fetchSocketToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/socket/token");
    if (!res.ok) return null;
    const body = (await res.json()) as { token?: string };
    return body.token ?? null;
  } catch {
    return null;
  }
}

export function createTicketSocket(token: string): Socket {
  return io({
    path: "/socket.io/",
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
}

export function joinTicketRoom(
  socket: Socket,
  ticketId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.emit("join-ticket", ticketId, (err?: string) => {
      if (err) reject(new Error(err));
      else resolve();
    });
  });
}
