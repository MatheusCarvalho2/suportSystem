import Pusher from "pusher";

const globalForPusher = globalThis as unknown as {
  pusherServer: Pusher | null | undefined;
};

function createPusherServer(): Pusher | null {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    return null;
  }

  const host = process.env.PUSHER_HOST;

  return new Pusher({
    appId,
    key,
    secret,
    ...(host
      ? { host, port: process.env.PUSHER_PORT || "6001", useTLS: false }
      : { cluster, useTLS: true }),
  });
}

export const pusherServer =
  globalForPusher.pusherServer !== undefined
    ? globalForPusher.pusherServer
    : createPusherServer();

if (process.env.NODE_ENV !== "production")
  globalForPusher.pusherServer = pusherServer;

export async function triggerPusher(
  channel: string,
  event: string,
  data: unknown
) {
  if (!pusherServer) return;
  try {
    await pusherServer.trigger(channel, event, data);
  } catch (err) {
    console.warn("[Pusher] trigger failed (skipping):", err);
  }
}
