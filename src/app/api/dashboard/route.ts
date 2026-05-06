import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const isClient = session.user.organizationType === "CLIENT";

    const ticketWhere: Record<string, unknown> = {};
    if (isClient) {
      ticketWhere.createdBy = {
        organizationId: session.user.organizationId,
      };
    }

    // Uma transação sequencial evita várias sessões em paralelo no pooler Supabase
    // (erro "MaxClientsInSessionMode: max clients reached").
    const {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      recentTickets,
      portalStats,
      userPortalIds,
    } = await prisma.$transaction(async (tx) => {
      const totalTickets = await tx.ticket.count({ where: ticketWhere });
      const openTickets = await tx.ticket.count({
        where: { ...ticketWhere, status: "OPEN" },
      });
      const inProgressTickets = await tx.ticket.count({
        where: { ...ticketWhere, status: "IN_PROGRESS" },
      });
      const resolvedTickets = await tx.ticket.count({
        where: { ...ticketWhere, status: "RESOLVED" },
      });
      const closedTickets = await tx.ticket.count({
        where: { ...ticketWhere, status: "CLOSED" },
      });
      const recentTickets = await tx.ticket.findMany({
        where: ticketWhere,
        include: {
          portal: { select: { name: true } },
          createdBy: { select: { name: true } },
          assignments: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      const portalStats = await tx.portal.findMany({
        include: {
          tickets: {
            where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
            select: { id: true },
          },
          devLinks: {
            include: { user: { select: { id: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const userPortalIds = new Set<string>();
      if (!isClient) {
        const userLinks = await tx.portalAssignment.findMany({
          where: { userId: session.user.id },
          select: { portalId: true },
        });
        userLinks.forEach((l) => userPortalIds.add(l.portalId));
      }

      return {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        recentTickets,
        portalStats,
        userPortalIds,
      };
    });

    const portalsWithMeta = portalStats.map((p) => ({
      id: p.id,
      name: p.name,
      ticketCount: p.tickets.length,
      devCount: p.devLinks.length,
      isMine: userPortalIds.has(p.id),
    }));

    return NextResponse.json({
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      waitingTickets: totalTickets - openTickets - inProgressTickets - resolvedTickets - closedTickets,
      recentTickets,
      portals: portalsWithMeta,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
