import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.organizationType !== "OPERATOR" || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id: portalId } = await params;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const assignment = await prisma.portalAssignment.create({
      data: { portalId, userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("POST /api/portals/[id]/assign error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.organizationType !== "OPERATOR" || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id: portalId } = await params;
    const { userId } = await req.json();

    await prisma.portalAssignment.delete({
      where: { portalId_userId: { portalId, userId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/portals/[id]/assign error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
