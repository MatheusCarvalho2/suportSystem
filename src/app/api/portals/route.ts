import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const createPortalSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  url: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const portals = await prisma.portal.findMany({
      include: {
        devLinks: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(portals);
  } catch (error) {
    console.error("GET /api/portals error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.organizationType !== "OPERATOR" || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const data = createPortalSchema.parse(body);

    const portal = await prisma.portal.create({
      data: {
        name: data.name,
        description: data.description,
        url: data.url,
      },
      include: {
        devLinks: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { tickets: true } },
      },
    });

    return NextResponse.json(portal, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("POST /api/portals error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
