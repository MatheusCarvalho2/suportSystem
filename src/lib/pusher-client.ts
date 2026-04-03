import PusherClient from "pusher-js";

let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) return null;

  if (!pusherClientInstance) {
    const host = process.env.NEXT_PUBLIC_PUSHER_HOST;

    pusherClientInstance = new PusherClient(key, {
      cluster,
      ...(host
        ? {
            wsHost: host,
            wsPort: parseInt(process.env.NEXT_PUBLIC_PUSHER_PORT || "6001"),
            forceTLS: false,
            disableStats: true,
            enabledTransports: ["ws", "wss"],
          }
        : {}),
      authEndpoint: "/api/pusher/auth",
    });
  }
  return pusherClientInstance;
}
