import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import { z } from "zod";

function createServer() {
  const server = new McpServer({
    name: "fresh-catch-test",
    version: "1.0.0",
  });

  server.tool(
    "echo",
    "Returns the input message back",
    { message: z.string() },
    async ({ message }) => ({
      content: [{ type: "text", text: message }],
    }),
  );

  return server;
}

export async function handleMcpTest(
  request: Request,
): Promise<Response> {
  const handler = createMcpHandler(createServer(), { route: "/mcp-test" });
  const executionCtx = {
    waitUntil: () => {},
    passThroughOnException: () => {},
  } as unknown as ExecutionContext;
  return handler(request, {} as Env, executionCtx);
}
