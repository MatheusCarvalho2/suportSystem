import "dotenv/config";
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server } from "socket.io";
import { prisma } from "@/lib/prisma";
import { verifySocketToken } from "@/lib/socket-token";
import { registerTicketSocketEmitter } from "@/lib/socket-realtime";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

void app
  .prepare()
  .then(() => {
    const httpServer = createServer((req, res) => {
      const parsedUrl = parse(req.url ?? "/", true);
      void handle(req, res, parsedUrl);
    });

    const io = new Server(httpServer, {
      path: "/socket.io/",
      addTrailingSlash: false,
      cors: {
        origin: true,
        credentials: true,
      },
    });

    io.use((socket, next) => {
      const token = socket.handshake.auth.token as string | undefined;
      const payload = verifySocketToken(token);
      if (!payload) {
        next(new Error("unauthorized"));
        return;
      }
      socket.data.userId = payload.userId;
      next();
    });

    io.on("connection", (socket) => {
      socket.on(
        "join-ticket",
        async (ticketId: unknown, cb?: (err?: string) => void) => {
          if (typeof ticketId !== "string" || !ticketId) {
            cb?.("invalid ticket");
            return;
          }
          try {
            const ticket = await prisma.ticket.findUnique({
              where: { id: ticketId },
              select: { id: true },
            });
            if (!ticket) {
              cb?.("not found");
              return;
            }
            await socket.join(`ticket:${ticketId}`);
            cb?.();
          } catch {
            cb?.("error");
          }
        }
      );

      socket.on("leave-ticket", (ticketId: unknown) => {
        if (typeof ticketId === "string") {
          void socket.leave(`ticket:${ticketId}`);
        }
      });
    });

    registerTicketSocketEmitter((ticketId, event, data) => {
      io.to(`ticket:${ticketId}`).emit(event, data);
    });

    httpServer.listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
