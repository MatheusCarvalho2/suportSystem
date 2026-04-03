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

    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      recentTickets,
      portalStats,
    ] = await Promise.all([
      prisma.ticket.count({ where: ticketWhere }),
      prisma.ticket.count({ where: { ...ticketWhere, status: "OPEN" } }),
      prisma.ticket.count({ where: { ...ticketWhere, status: "IN_PROGRESS" } }),
      prisma.ticket.count({ where: { ...ticketWhere, status: "RESOLVED" } }),
      prisma.ticket.count({ where: { ...ticketWhere, status: "CLOSED" } }),
      prisma.ticket.findMany({
        where: ticketWhere,
        include: {
          portal: { select: { name: true } },
          createdBy: { select: { name: true } },
          assignments: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.portal.findMany({
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
      }),
    ]);

    const userPortalIds = new Set<string>();
    if (!isClient) {
      const userLinks = await prisma.portalAssignment.findMany({
        where: { userId: session.user.id },
        select: { portalId: true },
      });
      userLinks.forEach((l) => userPortalIds.add(l.portalId));
    }

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
