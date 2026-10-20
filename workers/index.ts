export interface Env {
  GAME_ROOMS: DurableObjectNamespace;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

type ClientMessage =
  | { type: "hello"; characterId: string }
  | { type: "move"; x: number; y: number; seq: number }
  | { type: "ping"; at: number };

const WORLD_LIMIT = 1920;
const RATE_WINDOW_MS = 1000;
const MAX_MESSAGES_PER_WINDOW = 30;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "elder-realms-game-gateway" });
    }
    if (url.pathname !== "/room") return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return new Response("Authentication required", { status: 401 });
    }
    const token = authorization.slice("Bearer ".length).trim();
    if (!token || !env.SUPABASE_URL) {
      return new Response("Authentication is not configured", { status: 503 });
    }
    const user = await verifySupabaseUser(token, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    if (!user) return new Response("Invalid or expired session", { status: 401 });

    const roomId = url.searchParams.get("region") ?? "fern-hollow";
    if (!/^[a-z0-9-]{1,48}$/i.test(roomId)) return new Response("Invalid region", { status: 400 });
    const room = env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(roomId));
    const headers = new Headers(request.headers);
    headers.set("X-ERO-User-Id", user.id);
    headers.set("X-ERO-Region", roomId);
    return room.fetch(new Request(request, { headers }));
  }
};

async function verifySupabaseUser(
  accessToken: string,
  supabaseUrl: string,
  anonKey: string
): Promise<{ id: string } | null> {
  const authUrl = new URL("/auth/v1/user", supabaseUrl);
  try {
    const response = await fetch(authUrl, {
      headers: { Authorization: "Bearer " + accessToken, apikey: anonKey }
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { id?: unknown };
    return typeof data.id === "string" ? { id: data.id } : null;
  } catch {
    return null;
  }
}

export class GameRoom {
  private sockets = new Map<WebSocket, { userId: string; characterId: string; x: number; y: number; seq: number }>();
  private rate = new Map<WebSocket, { startedAt: number; count: number }>();

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    const userId = request.headers.get("X-ERO-User-Id");
    if (!userId) return new Response("Unauthenticated", { status: 401 });
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.sockets.set(server, { userId, characterId: "", x: 330, y: 350, seq: 0 });
    this.rate.set(server, { startedAt: Date.now(), count: 0 });
    server.addEventListener("message", (event) => this.onMessage(server, String(event.data)));
    server.addEventListener("close", () => this.removeSocket(server));
    server.addEventListener("error", () => this.removeSocket(server));
    this.send(server, { type: "welcome", region: request.headers.get("X-ERO-Region"), players: this.snapshot() });
    this.broadcast({ type: "players", players: this.snapshot() }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  private onMessage(socket: WebSocket, raw: string): void {
    const player = this.sockets.get(socket);
    if (!player) return;
    const now = Date.now();
    const counter = this.rate.get(socket) ?? { startedAt: now, count: 0 };
    if (now - counter.startedAt > RATE_WINDOW_MS) {
      counter.startedAt = now;
      counter.count = 0;
    }
    counter.count += 1;
    this.rate.set(socket, counter);
    if (counter.count > MAX_MESSAGES_PER_WINDOW || raw.length > 2048) {
      socket.close(1008, "Rate limit exceeded");
      this.removeSocket(socket);
      return;
    }

    let message: ClientMessage;
    try {
      message = JSON.parse(raw) as ClientMessage;
    } catch {
      this.send(socket, { type: "error", message: "Malformed JSON" });
      return;
    }
    if (message.type === "hello") {
      if (typeof message.characterId !== "string" || message.characterId.length > 64) return;
      // TODO: verify character ownership against Neon before accepting this identity.
      player.characterId = message.characterId;
      this.broadcast({ type: "players", players: this.snapshot() });
      return;
    }
    if (message.type === "ping") {
      this.send(socket, { type: "pong", at: typeof message.at === "number" ? message.at : now });
      return;
    }
    if (message.type === "move") {
      if (!Number.isFinite(message.x) || !Number.isFinite(message.y) ||
          !Number.isInteger(message.seq) || message.seq <= player.seq) return;
      // Initial boundary checks only; speed, collision, and server-tick validation are still required.
      const x = Math.max(0, Math.min(WORLD_LIMIT, message.x));
      const y = Math.max(0, Math.min(1440, message.y));
      player.x = x;
      player.y = y;
      player.seq = message.seq;
      this.broadcast({ type: "player-moved", userId: player.userId, characterId: player.characterId, x, y, seq: player.seq }, socket);
    }
  }

  private snapshot() {
    return [...this.sockets.values()].map(({ userId, characterId, x, y, seq }) => ({
      userId, characterId, x, y, seq
    }));
  }

  private send(socket: WebSocket, message: unknown): void {
    try { socket.send(JSON.stringify(message)); } catch { this.removeSocket(socket); }
  }

  private broadcast(message: unknown, except?: WebSocket): void {
    const serialized = JSON.stringify(message);
    for (const socket of this.sockets.keys()) {
      if (socket === except) continue;
      try { socket.send(serialized); } catch { this.removeSocket(socket); }
    }
  }

  private removeSocket(socket: WebSocket): void {
    this.sockets.delete(socket);
    this.rate.delete(socket);
    this.broadcast({ type: "players", players: this.snapshot() });
  }
}
