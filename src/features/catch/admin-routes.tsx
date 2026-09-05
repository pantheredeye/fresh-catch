import { Hono } from "hono";
import type { Bindings, Variables } from "@/types";
import { Document } from "@/ui/document";
import { csrfProtect, requireAdmin } from "@/features/auth/middleware";
import { CatchPipelineError, runCatchPipeline, type CatchPipelineInput } from "./pipeline";
import { parsePublishForm } from "./validation";
import { getLiveCatchUpdate, publishCatchUpdate } from "./queries";
import { CatchPage } from "./components";

export const catchAdminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

catchAdminRoutes.use("/admin/catch", requireAdmin());
catchAdminRoutes.use("/admin/catch/*", requireAdmin());

catchAdminRoutes.get("/admin/catch", async (c) => {
  const live = await getLiveCatchUpdate();
  return c.html(
    <Document title="Catch of the week — Admin">
      <CatchPage live={live} csrfToken={c.var.session!.csrfToken} />
    </Document>,
  );
});

/**
 * Draft only — no DB write. Not CSRF-gated: it's a read-style call behind
 * `requireAdmin()`, and its body is either raw audio bytes or JSON, neither
 * of which carries a form-encoded CSRF field. Publishing (below) is the
 * mutating step and is CSRF-protected.
 */
catchAdminRoutes.post("/admin/catch/record", async (c) => {
  const contentType = c.req.header("content-type") ?? "";
  try {
    let input: CatchPipelineInput;
    if (contentType.includes("application/json")) {
      const body = await c.req.json<{ text?: string }>();
      input = { kind: "text", text: body.text ?? "" };
    } else {
      const audio = await c.req.arrayBuffer();
      if (audio.byteLength === 0) throw new CatchPipelineError("No audio data", { status: 400 });
      input = { kind: "audio", audio };
    }

    const draft = await runCatchPipeline(c.env.AI, input);
    return c.json(draft);
  } catch (error) {
    if (error instanceof CatchPipelineError) {
      return c.json({ error: error.message, rawTranscript: error.rawTranscript }, error.status as 400 | 500 | 501);
    }
    console.error("catch record failed:", error);
    return c.json({ error: "Something went wrong" }, 500);
  }
});

catchAdminRoutes.post("/admin/catch/publish", csrfProtect(), async (c) => {
  const body = await c.req.parseBody();
  const result = parsePublishForm(body);
  if (!result.success) {
    return c.text(result.error, 400);
  }

  await publishCatchUpdate({
    recordedBy: c.var.session!.email,
    rawTranscript: result.data.rawTranscript,
    formattedContent: JSON.stringify(result.data.content),
  });
  return c.redirect("/admin/catch");
});
