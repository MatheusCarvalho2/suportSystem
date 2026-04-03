import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongoDB } from "@/lib/mongodb";
import { ChatSeen } from "@/lib/mongoose-models";
import { triggerPusher } from "@/lib/pusher-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: ticketId } = await params;
    await connectMongoDB();

    const seenRecords = await ChatSeen.find({ ticketId }).lean();

    return NextResponse.json(
      seenRecords.map((r) => ({
        userId: r.userId,
        userName: r.userName,
        lastSeenAt: r.lastSeenAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("GET /api/tickets/[id]/seen error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: ticketId } = await params;
    const now = new Date();

    await connectMongoDB();

    await ChatSeen.findOneAndUpdate(
      { ticketId, userId: session.user.id },
      {
        ticketId,
        userId: session.user.id,
        userName: session.user.name,
        lastSeenAt: now,
      },
      { upsert: true, new: true }
    );

    await triggerPusher(`private-ticket-${ticketId}`, "message-seen", {
      userId: session.user.id,
      userName: session.user.name,
      lastSeenAt: now.toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/tickets/[id]/seen error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
