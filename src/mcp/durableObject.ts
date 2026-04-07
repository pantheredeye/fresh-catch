import { DurableObject } from "cloudflare:workers";
import { createMcpRequestHandler } from "@/api/mcp-server";

export type ToolCallStatus = "success" | "error";
export type ToolTier = "read" | "write" | "llm";
export type GapReason = "no_tool" | "insufficient_data" | "model_uncertain" | "api_error" | "max_rounds";

export type ToolCallRow = {
  id: string;
  session_id: string;
  tool_name: string;
  input_hash: string;
  result_status: ToolCallStatus;
  timestamp: number;
  duration_ms: number;
  [key: string]: SqlStorageValue;
};

export type RateLimitRow = {
  tool_tier: ToolTier;
  window_start: number;
  call_count: number;
  [key: string]: SqlStorageValue;
};

export type GapLogRow = {
  id: string;
  conversation_id: string;
  question: string;
  reason: GapReason;
  timestamp: number;
  [key: string]: SqlStorageValue;
};

export type ResponseCacheRow = {
  cache_key: string;
  response_text: string;
  created_at: number;
  expires_at: number;
  hit_count: number;
  [key: string]: SqlStorageValue;
};

/**
 * Per-org Durable Object for MCP session state, tool call audit logging,
 * and rate limiting. Uses SQLite storage for structured data.
 */
export class McpDurableObject extends DurableObject {
  private sql: SqlStorage;
  private schemaReady = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
  }

  /** Lazily create tables on first access. Idempotent. */
  private ensureSchema(): void {
    if (this.schemaReady) return;

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS tool_calls (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        input_hash TEXT NOT NULL,
        result_status TEXT NOT NULL CHECK(result_status IN ('success', 'error')),
        timestamp INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL
      )
    `);

    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_tool_calls_tool_name ON tool_calls(tool_name)
    `);

    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_tool_calls_timestamp ON tool_calls(timestamp)
    `);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        tool_tier TEXT PRIMARY KEY CHECK(tool_tier IN ('read', 'write', 'llm')),
        window_start INTEGER NOT NULL,
        call_count INTEGER NOT NULL DEFAULT 0
      )
    `);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS gap_log (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        question TEXT NOT NULL,
        reason TEXT NOT NULL CHECK(reason IN ('no_tool', 'insufficient_data', 'model_uncertain', 'api_error', 'max_rounds')),
        timestamp INTEGER NOT NULL
      )
    `);

    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_gap_log_timestamp ON gap_log(timestamp)
    `);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS response_cache (
        cache_key TEXT PRIMARY KEY,
        response_text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        hit_count INTEGER NOT NULL DEFAULT 0
      )
    `);

    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_response_cache_expires ON response_cache(expires_at)
    `);

    this.schemaReady = true;
  }

  /** Log a tool call to the audit table. */
  logToolCall(entry: Omit<ToolCallRow, "id">): void {
    this.ensureSchema();
    const id = crypto.randomUUID();
    this.sql.exec(
      `INSERT INTO tool_calls (id, session_id, tool_name, input_hash, result_status, timestamp, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      entry.session_id,
      entry.tool_name,
      entry.input_hash,
      entry.result_status,
      entry.timestamp,
      entry.duration_ms,
    );
  }

  /** Query audit log by tool name. */
  getCallsByToolName(toolName: string): ToolCallRow[] {
    this.ensureSchema();
    return this.sql
      .exec<ToolCallRow>(
        `SELECT * FROM tool_calls WHERE tool_name = ? ORDER BY timestamp DESC`,
        toolName,
      )
      .toArray();
  }

  /** Query audit log by time range (inclusive). */
  getCallsByTimeRange(startMs: number, endMs: number): ToolCallRow[] {
    this.ensureSchema();
    return this.sql
      .exec<ToolCallRow>(
        `SELECT * FROM tool_calls WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC`,
        startMs,
        endMs,
      )
      .toArray();
  }

  /**
   * Increment rate limit counter for a tier within the given window.
   * Returns the updated call count.
   */
  incrementRateLimit(tier: ToolTier, windowStartMs: number): number {
    this.ensureSchema();

    // Reset counter if window has changed, otherwise increment
    this.sql.exec(
      `INSERT INTO rate_limits (tool_tier, window_start, call_count)
       VALUES (?, ?, 1)
       ON CONFLICT(tool_tier) DO UPDATE SET
         call_count = CASE
           WHEN window_start = excluded.window_start THEN call_count + 1
           ELSE 1
         END,
         window_start = excluded.window_start`,
      tier,
      windowStartMs,
    );

    const row = this.sql
      .exec<RateLimitRow>(
        `SELECT * FROM rate_limits WHERE tool_tier = ?`,
        tier,
      )
      .one();

    return row.call_count;
  }

  /** Log an unanswered customer question. */
  logGap(entry: { conversation_id: string; question: string; reason: GapReason }): void {
    this.ensureSchema();
    const id = crypto.randomUUID();
    this.sql.exec(
      `INSERT INTO gap_log (id, conversation_id, question, reason, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      id,
      entry.conversation_id,
      entry.question,
      entry.reason,
      Date.now(),
    );
  }

  /** Query gap log entries, newest first. */
  getGaps(limit = 100): GapLogRow[] {
    this.ensureSchema();
    return this.sql
      .exec<GapLogRow>(
        `SELECT * FROM gap_log ORDER BY timestamp DESC LIMIT ?`,
        limit,
      )
      .toArray();
  }

  // --- Response cache ---

  /** Normalize a query string for cache key: lowercase, trim, collapse whitespace. */
  private normalizeCacheKey(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, " ");
  }

  /** Look up a cached response. Returns text if hit, null if miss/expired. */
  getCachedResponse(query: string): string | null {
    this.ensureSchema();
    const key = this.normalizeCacheKey(query);
    const now = Date.now();

    // Delete expired entries opportunistically
    this.sql.exec(`DELETE FROM response_cache WHERE expires_at <= ?`, now);

    const rows = this.sql
      .exec<ResponseCacheRow>(
        `SELECT * FROM response_cache WHERE cache_key = ? AND expires_at > ?`,
        key,
        now,
      )
      .toArray();

    if (rows.length === 0) return null;

    // Bump hit count
    this.sql.exec(
      `UPDATE response_cache SET hit_count = hit_count + 1 WHERE cache_key = ?`,
      key,
    );

    return rows[0].response_text;
  }

  /** Store a response in the cache with a TTL in milliseconds. */
  cacheResponse(query: string, responseText: string, ttlMs: number = 5 * 60 * 1000): void {
    this.ensureSchema();
    const key = this.normalizeCacheKey(query);
    const now = Date.now();

    this.sql.exec(
      `INSERT INTO response_cache (cache_key, response_text, created_at, expires_at, hit_count)
       VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(cache_key) DO UPDATE SET
         response_text = excluded.response_text,
         created_at = excluded.created_at,
         expires_at = excluded.expires_at,
         hit_count = 0`,
      key,
      responseText,
      now,
      now + ttlMs,
    );
  }

  /** Invalidate all cached responses (e.g., when catch/market data changes). */
  invalidateResponseCache(): void {
    this.ensureSchema();
    this.sql.exec(`DELETE FROM response_cache`);
  }

  /** Get current rate limit state for a tier. */
  getRateLimit(tier: ToolTier): RateLimitRow | null {
    this.ensureSchema();
    const rows = this.sql
      .exec<RateLimitRow>(
        `SELECT * FROM rate_limits WHERE tool_tier = ?`,
        tier,
      )
      .toArray();
    return rows[0] ?? null;
  }

  async fetch(request: Request): Promise<Response> {
    const organizationId =
      request.headers.get("X-Org-Id") ?? "unknown";
    const orgName =
      request.headers.get("X-Org-Name") ?? undefined;
    const sessionId =
      request.headers.get("X-Session-Id") ?? crypto.randomUUID();

    // Create a fresh handler per request — each MCP SSE connection
    // needs its own McpServer instance for transport isolation
    const handler = createMcpRequestHandler({
      organizationId,
      orgName,
      sessionId,
      mcpDO: this,
    });

    // ExecutionContext shim for createMcpHandler (DO doesn't have a native one)
    const ctxShim = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    } as unknown as ExecutionContext;

    try {
      return await handler(request, this.env, ctxShim);
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Internal server error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }
}
