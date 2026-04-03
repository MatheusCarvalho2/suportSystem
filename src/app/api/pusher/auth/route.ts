import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: Request) {
  try {
    if (!pusherServer) {
      return NextResponse.json(
        { error: "Pusher não configurado" },
        { status: 503 }
      );
    }

    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.text();
    const params = new URLSearchParams(body);
    const socketId = params.get("socket_id");
    const channel = params.get("channel_name");

    if (!socketId || !channel) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channel, {
      user_id: session.user.id,
      user_info: {
        name: session.user.name,
        email: session.user.email,
      },
    });

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("POST /api/pusher/auth error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
