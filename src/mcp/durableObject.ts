import { DurableObject } from "cloudflare:workers";

/**
 * Per-org Durable Object for MCP session state, tool call audit logging,
 * and rate limiting. Uses SQLite storage for structured data.
 */
export class McpDurableObject extends DurableObject {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
  }

  async fetch(request: Request): Promise<Response> {
    // MCP request routing will be wired in a later step
    const url = new URL(request.url);
    return new Response(JSON.stringify({ status: "ok", path: url.pathname }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
