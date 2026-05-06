import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { signSocketToken } from "@/lib/socket-token";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const token = signSocketToken(session.user.id);
    return NextResponse.json({ token });
  } catch (error) {
    console.error("GET /api/socket/token error:", error);
    return NextResponse.json(
      { error: "Falha ao emitir token do socket" },
      { status: 500 }
    );
  }
}
