import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { connectMongoDB } from "@/lib/mongodb";
import { Message } from "@/lib/mongoose-models";
import { triggerPusher } from "@/lib/pusher-server";

const updateTicketSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignUserId: z.string().uuid().optional(),
  unassignUserId: z.string().uuid().optional(),
  resolutionCause: z.string().optional(),
  impactedArea: z.string().optional(),
  actionTaken: z.string().optional(),
  resolutionStatus: z.string().optional(),
});

const statusLabels: Record<string, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em Andamento",
  WAITING: "Aguardando",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        portal: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("GET /api/tickets/[id] error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = updateTicketSchema.parse(body);

    if (data.assignUserId) {
      await prisma.ticketAssignment.create({
        data: { ticketId: id, userId: data.assignUserId },
      });

      const assignedUser = await prisma.user.findUnique({
        where: { id: data.assignUserId },
        select: { name: true },
      });

      await connectMongoDB();
      await Message.create({
        ticketId: id,
        senderId: session.user.id,
        senderName: session.user.name,
        content: `${assignedUser?.name} foi atribuído ao ticket`,
        type: "system",
      });
    }

    if (data.unassignUserId) {
      await prisma.ticketAssignment.delete({
        where: {
          ticketId_userId: { ticketId: id, userId: data.unassignUserId },
        },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (data.status) updateData.status = data.status;
    if (data.priority) updateData.priority = data.priority;

    if (data.status === "CLOSED") {
      updateData.resolutionCause = data.resolutionCause ?? null;
      updateData.impactedArea = data.impactedArea ?? null;
      updateData.actionTaken = data.actionTaken ?? null;
      updateData.resolutionStatus = data.resolutionStatus ?? null;
      updateData.resolvedAt = new Date();
    }

    let ticket;
    if (Object.keys(updateData).length > 0) {
      ticket = await prisma.ticket.update({
        where: { id },
        data: updateData,
        include: {
          portal: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          assignments: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (data.status) {
        await connectMongoDB();
        await Message.create({
          ticketId: id,
          senderId: session.user.id,
          senderName: session.user.name,
          content: `Status alterado para ${statusLabels[data.status]}`,
          type: "system",
        });
      }
    } else {
      ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          portal: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          assignments: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
    }

    await triggerPusher(`private-ticket-${id}`, "ticket-updated", ticket);

    return NextResponse.json(ticket);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("PATCH /api/tickets/[id] error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
