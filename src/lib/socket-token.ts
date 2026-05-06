import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
}

export interface SocketTokenPayload {
  userId: string;
  exp: number;
}

export function signSocketToken(userId: string, ttlMs = 60 * 60 * 1000): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET ou NEXTAUTH_SECRET é obrigatório para WebSocket");
  }
  const payload: SocketTokenPayload = {
    userId,
    exp: Date.now() + ttlMs,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifySocketToken(token: string | undefined): SocketTokenPayload | null {
  if (!token || typeof token !== "string") return null;
  const secret = getSecret();
  if (!secret) return null;

  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payloadB64 || !sig) return null;

  const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as SocketTokenPayload;
    if (!payload.userId || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
