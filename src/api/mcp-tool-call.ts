"use server";

import { env } from "cloudflare:workers";
import { requestInfo } from "rwsdk/worker";
import { requireCsrf } from "@/session/csrf";
import { voiceTools } from "./voice-tools";
import { toolRegistry, TIER_LIMITS } from "./mcp-server";

/**
 * Execute an MCP tool from the command bar (admin or customer).
 * Uses the same tool registry, handlers, rate limits, and audit logging
 * as external MCP clients — just invoked via server function instead of HTTP.
 *
 * Admin callers: full tool access.
 * Customer callers: only tools with roles: ["customer"] in voice-tools registry.
 */
export async function executeMcpTool(
  csrfToken: string,
  toolName: string,
  args: Record<string, unknown>,
  targetOrgId?: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  requireCsrf(csrfToken);

  const { ctx } = requestInfo;

  if (!ctx.user) {
    return { success: false, error: "Authentication required" };
  }

  // Resolve target org + role from memberships
  let organizationId: string;
  let callerRole: string;

  if (targetOrgId && targetOrgId !== ctx.currentOrganization?.id) {
    const membership = ctx.user.memberships?.find(
      (m) => m.organizationId === targetOrgId,
    );
    organizationId = targetOrgId;
    callerRole = membership?.role ?? "customer";
  } else if (ctx.currentOrganization) {
    organizationId = ctx.currentOrganization.id;
    callerRole = ctx.currentOrganization.role ?? "owner";
  } else {
    return { success: false, error: "No organization context" };
  }

  const isAdmin = ["owner", "manager"].includes(callerRole);

  // Verify tool allows caller's role
  if (!isAdmin) {
    const voiceTool = voiceTools[toolName];
    if (!voiceTool?.roles?.includes(callerRole)) {
      return { success: false, error: "You don't have access to this tool" };
    }
  }

  const tool = toolRegistry[toolName];
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }
  const startMs = Date.now();

  // Rate limit via McpDO
  try {
    const limit = TIER_LIMITS[tool.tier];
    const windowStart = startMs - (startMs % limit.windowMs);
    const doId = env.MCP_DURABLE_OBJECT.idFromName(organizationId);
    const stub = env.MCP_DURABLE_OBJECT.get(doId);
    const count = await stub.incrementRateLimit(tool.tier, windowStart);
    if (count > limit.maxCalls) {
      return {
        success: false,
        error: `Rate limit exceeded for ${tool.tier} tier. Try again later.`,
      };
    }
  } catch {
    // Rate limiting must not block the call
  }

  // Execute handler
  const result = await tool.handler(args, organizationId, callerRole);

  // Signal: fire-and-forget tool call to Signal Agent
  try {
    const signalStub = env.SIGNAL_DURABLE_OBJECT.get(
      env.SIGNAL_DURABLE_OBJECT.idFromName(organizationId),
    );
    signalStub.ingest({
      type: "tool", source: "mcp", content: toolName,
      intent: toolName, role: callerRole, orgId: organizationId, timestamp: Date.now(),
    }).catch(() => {});
  } catch {}

  // Audit log via McpDO
  const durationMs = Date.now() - startMs;
  try {
    const doId = env.MCP_DURABLE_OBJECT.idFromName(organizationId);
    const stub = env.MCP_DURABLE_OBJECT.get(doId);
    stub.logToolCall({
      session_id: `admin-ui-${ctx.user?.id ?? "unknown"}`,
      tool_name: toolName,
      input_hash: hashInput(args),
      result_status: result.isError ? "error" : "success",
      caller_role: callerRole,
      timestamp: startMs,
      duration_ms: durationMs,
    });
  } catch {
    // Audit logging must not crash the call
  }

  if (result.isError) {
    const errorText = result.content[0]?.text ?? "Tool execution failed";
    return { success: false, error: errorText };
  }

  // Parse the JSON result text back to data
  try {
    const data = JSON.parse(result.content[0]?.text ?? "{}");
    return { success: true, data };
  } catch {
    return { success: true, data: result.content[0]?.text };
  }
}

function hashInput(input: unknown): string {
  const str = JSON.stringify(input ?? {});
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}
