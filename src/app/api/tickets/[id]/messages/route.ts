import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { connectMongoDB } from "@/lib/mongodb";
import { Message } from "@/lib/mongoose-models";
import { triggerPusher } from "@/lib/pusher-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: ticketId } = await params;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 50;

    await connectMongoDB();

    const query: Record<string, unknown> = { ticketId };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = messages.length > limit;
    const result = hasMore ? messages.slice(0, limit) : messages;

    return NextResponse.json({
      messages: result.reverse(),
      hasMore,
      nextCursor: hasMore
        ? (result[0] as unknown as { createdAt: Date }).createdAt.toISOString()
        : null,
    });
  } catch (error) {
    console.error("GET /api/tickets/[id]/messages error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: ticketId } = await params;
    const { content, type = "text", fileUrl } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Conteúdo é obrigatório" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const message = await Message.create({
      ticketId,
      senderId: session.user.id,
      senderName: session.user.name,
      content: content.trim(),
      type,
      fileUrl,
    });

    const messageData = {
      _id: message._id.toString(),
      ticketId,
      senderId: session.user.id,
      senderName: session.user.name,
      content: content.trim(),
      type,
      fileUrl,
      createdAt: message.createdAt.toISOString(),
    };

    await triggerPusher(
      `private-ticket-${ticketId}`,
      "new-message",
      messageData
    );

    if (session.user.organizationType === "OPERATOR" && type === "text") {
      const existingAssignments = await prisma.ticketAssignment.findMany({
        where: { ticketId },
      });

      if (existingAssignments.length === 0) {
        await prisma.ticketAssignment.create({
          data: { ticketId, userId: session.user.id },
        });

        const systemMsg = await Message.create({
          ticketId,
          senderId: "system",
          senderName: "Sistema",
          content: `${session.user.name} foi atribuído ao ticket`,
          type: "system",
        });

        const systemData = {
          _id: systemMsg._id.toString(),
          ticketId,
          senderId: "system",
          senderName: "Sistema",
          content: `${session.user.name} foi atribuído ao ticket`,
          type: "system",
          createdAt: systemMsg.createdAt.toISOString(),
        };

        await triggerPusher(
          `private-ticket-${ticketId}`,
          "new-message",
          systemData
        );

        await prisma.notification.deleteMany({
          where: {
            ticketId,
            userId: { not: session.user.id },
            read: false,
          },
        });
      }
    }

    return NextResponse.json(messageData, { status: 201 });
  } catch (error) {
    console.error("POST /api/tickets/[id]/messages error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
