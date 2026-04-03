import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const updatePortalSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  url: z.string().optional(),
});

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

    const portal = await prisma.portal.findUnique({
      where: { id },
      include: {
        devLinks: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        tickets: {
          include: {
            createdBy: { select: { id: true, name: true } },
            assignments: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: { select: { tickets: true } },
      },
    });

    if (!portal) {
      return NextResponse.json({ error: "Portal não encontrado" }, { status: 404 });
    }

    return NextResponse.json(portal);
  } catch (error) {
    console.error("GET /api/portals/[id] error:", error);
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

    if (session.user.organizationType !== "OPERATOR" || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = updatePortalSchema.parse(body);

    const portal = await prisma.portal.update({
      where: { id },
      data,
      include: {
        devLinks: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { tickets: true } },
      },
    });

    return NextResponse.json(portal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("PATCH /api/portals/[id] error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
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

    const { id } = await params;

    await prisma.portal.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/portals/[id] error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
