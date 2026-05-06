import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { connectMongoDB } from "@/lib/mongodb";
import { Message, ChatSeen } from "@/lib/mongoose-models";

const createTicketSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  portalId: z.string().uuid(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

function prismaErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const portalId = searchParams.get("portalId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const myPortals = searchParams.get("myPortals") !== "false";
    const limit = 20;

    const where: Record<string, unknown> = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (portalId) {
      where.portalId = portalId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (session.user.organizationType === "CLIENT") {
      where.createdBy = {
        organizationId: session.user.organizationId,
      };
    }

    if (myPortals && session.user.organizationType === "OPERATOR" && !portalId) {
      const userPortals = await prisma.portalAssignment.findMany({
        where: { userId: session.user.id },
        select: { portalId: true },
      });
      if (userPortals.length > 0) {
        where.portalId = { in: userPortals.map((p) => p.portalId) };
      }
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          portal: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          assignments: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    await connectMongoDB();

    const ticketIds = tickets.map((t) => t.id);

    const [lastMessages, seenRecords] = await Promise.all([
      Message.aggregate([
        { $match: { ticketId: { $in: ticketIds }, type: { $ne: "system" } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$ticketId", lastMessageAt: { $first: "$createdAt" } } },
      ]),
      ChatSeen.find({
        ticketId: { $in: ticketIds },
        userId: session.user.id,
      }).lean(),
    ]);

    const lastMsgMap = new Map<string, Date>();
    for (const lm of lastMessages) {
      lastMsgMap.set(lm._id, lm.lastMessageAt);
    }

    const seenMap = new Map<string, Date>();
    for (const s of seenRecords) {
      seenMap.set(s.ticketId, s.lastSeenAt);
    }

    const ticketsWithUnread = tickets.map((t) => {
      const lastMsg = lastMsgMap.get(t.id);
      const lastSeen = seenMap.get(t.id);
      let hasUnread = false;
      if (lastMsg) {
        hasUnread = !lastSeen || lastMsg > lastSeen;
      }
      return {
        ...t,
        hasUnread,
        lastMessageAt: lastMsg?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      tickets: ticketsWithUnread,
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    console.error("GET /api/tickets error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const data = createTicketSchema.parse(body);

    let ticket;
    try {
      ticket = await prisma.ticket.create({
        data: {
          title: data.title,
          description: data.description,
          portalId: data.portalId,
          priority: data.priority || "MEDIUM",
          createdById: session.user.id,
        },
        include: {
          portal: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          assignments: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });
    } catch (createErr) {
      const code = prismaErrorCode(createErr);
      console.error("POST /api/tickets prisma.ticket.create:", createErr);
      if (code === "P2003") {
        return NextResponse.json(
          {
            error:
              "portalId não existe neste banco ou usuário inválido. Confira se a produção usa o mesmo Postgres que local e se as migrações/seeds foram aplicadas.",
          },
          { status: 400 }
        );
      }
      throw createErr;
    }

    const senderDisplay =
      session.user.name?.trim() || session.user.email?.trim() || "Usuário";

    try {
      await connectMongoDB();
      await Message.create({
        ticketId: ticket.id,
        senderId: session.user.id,
        senderName: senderDisplay,
        content: `Ticket criado: ${ticket.title}`,
        type: "system",
      });
    } catch (mongoErr) {
      console.error(
        "POST /api/tickets MongoDB (após criar ticket; fazendo rollback):",
        mongoErr
      );
      await prisma.ticket.delete({ where: { id: ticket.id } }).catch((delErr) => {
        console.error("POST /api/tickets rollback ticket falhou:", delErr);
      });
      return NextResponse.json(
        {
          error:
            "MongoDB indisponível ao registrar a conversa do ticket. Na Vercel não use mongodb://localhost; use Atlas (ou outro host público) e libere Network Access para 0.0.0.0/0 ou IPs da Vercel.",
        },
        { status: 503 }
      );
    }

    const portalDevs = await prisma.portalAssignment.findMany({
      where: { portalId: data.portalId },
      select: { userId: true },
    });

    if (portalDevs.length === 1) {
      await prisma.ticketAssignment.create({
        data: { ticketId: ticket.id, userId: portalDevs[0].userId },
      });

      await Message.create({
        ticketId: ticket.id,
        senderId: "system",
        senderName: "Sistema",
        content: "Ticket atribuído automaticamente ao operador do portal",
        type: "system",
      });
    }

    if (portalDevs.length > 0) {
      const notifyDevs = portalDevs.length === 1 ? portalDevs : portalDevs;
      await prisma.notification.createMany({
        data: notifyDevs.map((dev) => ({
          userId: dev.userId,
          ticketId: ticket.id,
          message: `Novo ticket "${ticket.title}" no portal ${ticket.portal.name}`,
        })),
      });

      const { triggerPusher } = await import("@/lib/pusher-server");
      await Promise.all(
        notifyDevs.map((dev) =>
          triggerPusher(`private-user-${dev.userId}`, "new-notification", {
            id: `temp-${Date.now()}`,
            message: `Novo ticket "${ticket.title}" no portal ${ticket.portal.name}`,
            ticketId: ticket.id,
            read: false,
            createdAt: new Date().toISOString(),
          })
        )
      );
    }

    const ticketWithAssignments = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: {
        portal: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        assignments: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json(ticketWithAssignments, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("POST /api/tickets error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
