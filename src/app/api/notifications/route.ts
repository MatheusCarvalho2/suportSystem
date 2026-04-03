import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        message: true,
        ticketId: true,
        read: true,
        createdAt: true,
      },
    });

    const grouped = new Map<
      string,
      { id: string; message: string; ticketId: string | null; read: boolean; createdAt: string; count: number }
    >();

    for (const n of notifications) {
      const key = n.ticketId ?? n.id;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          id: n.id,
          message: n.message,
          ticketId: n.ticketId,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
          count: 1,
        });
      } else {
        existing.count += 1;
        if (!n.read) existing.read = false;
      }
    }

    return NextResponse.json(Array.from(grouped.values()));
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
