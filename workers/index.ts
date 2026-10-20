import postgres from "postgres";

export interface Env {
  GAME_ROOMS: DurableObjectNamespace;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  HYPERDRIVE?: Hyperdrive;
  ALLOWED_ORIGIN?: string;
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
    if (url.pathname.startsWith("/api/")) {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(env) });
      const user = await authenticate(request, env);
      if (!user) return corsJson({ error: "Invalid or missing session" }, 401, env);
      if (url.pathname === "/api/character" && (request.method === "GET" || request.method === "POST")) {
        return handleCharacterRequest(request, env, user.id);
      }
      return corsJson({ error: "Not found" }, 404, env);
    }
    if (url.pathname !== "/room") return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    const user = await authenticate(request, env);
    if (!user) return new Response("Invalid or missing session", { status: 401 });
    const roomId = url.searchParams.get("region") ?? "fern-hollow";
    if (!/^[a-z0-9-]{1,48}$/i.test(roomId)) return new Response("Invalid region", { status: 400 });
    const room = env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(roomId));
    const headers = new Headers(request.headers);
    headers.set("X-ERO-User-Id", user.id);
    headers.set("X-ERO-Region", roomId);
    return room.fetch(new Request(request, { headers }));
  }
};

function corsHeaders(env: Env): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400"
  });
}

function corsJson(body: unknown, status: number, env: Env): Response {
  const headers = corsHeaders(env);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

async function authenticate(request: Request, env: Env): Promise<{ id: string } | null> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ") || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;
  return verifySupabaseUser(token, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

async function handleCharacterRequest(request: Request, env: Env, userId: string): Promise<Response> {
  if (!env.HYPERDRIVE) {
    return corsJson({ error: "Database is not configured. Bind Neon through Cloudflare Hyperdrive." }, 503, env);
  }
  const sql = postgres(env.HYPERDRIVE.connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    fetch_types: false
  });
  try {
    if (request.method === "GET") {
      const rows = await sql`SELECT id::text AS id, display_name, region_id, x, y, health, gold
        FROM characters WHERE user_id = ${userId}::uuid ORDER BY created_at ASC LIMIT 1`;
      return corsJson({ character: rows[0] ?? null }, 200, env);
    }
    let body: { displayName?: unknown };
    try {
      body = await request.json() as { displayName?: unknown };
    } catch {
      return corsJson({ error: "Request body must be valid JSON" }, 400, env);
    }
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (!/^[A-Za-z][A-Za-z0-9 _-]{1,19}$/.test(displayName)) {
      return corsJson({ error: "Name must be 2–20 characters and use letters, numbers, spaces, _ or -." }, 400, env);
    }
    const character = await sql.begin(async (tx) => {
      await tx`INSERT INTO accounts (user_id) VALUES (${userId}::uuid) ON CONFLICT (user_id) DO NOTHING`;
      const existing = await tx`SELECT id::text AS id, display_name, region_id, x, y, health, gold
        FROM characters WHERE user_id = ${userId}::uuid ORDER BY created_at ASC LIMIT 1`;
      if (existing[0]) return existing[0];
      const created = await tx`INSERT INTO characters (user_id, display_name)
        VALUES (${userId}::uuid, ${displayName})
        RETURNING id::text AS id, display_name, region_id, x, y, health, gold`;
      const characterId = created[0].id as string;
      await tx`INSERT INTO character_skills (character_id, skill_id, xp) VALUES
        (${characterId}::uuid, 'adventuring', 0),
        (${characterId}::uuid, 'farming', 0),
        (${characterId}::uuid, 'combat', 0)
        ON CONFLICT (character_id, skill_id) DO NOTHING`;
      await tx`INSERT INTO inventory_items (character_id, item_id, quantity) VALUES
        (${characterId}::uuid, 'turnip_seed', 3)
        ON CONFLICT (character_id, item_id) DO NOTHING`;
      return created[0];
    });
    return corsJson({ character }, 200, env);
  } catch {
    // Do not return SQL details or connection strings to clients.
    return corsJson({ error: "Could not load or create the character." }, 500, env);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

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
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
        this.send(socket, { type: "error", message: "Invalid message" });
        return;
      }
      message = parsed as ClientMessage;
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
