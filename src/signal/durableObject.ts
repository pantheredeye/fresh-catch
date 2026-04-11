import { DurableObject } from "cloudflare:workers";

export type SignalType = "chat" | "voice" | "tool" | "gap";
export type EntityType = "product" | "location" | "feature" | "question";
export type InsightType = "demand" | "gap" | "trend" | "suggestion";
export type InsightPriority = "high" | "medium" | "low";

export type IngestPayload = {
  type: SignalType;
  source: string;
  content: string;
  intent?: string;
  role?: string;
  orgId: string;
  timestamp: number;
};

export type InsightRow = {
  id: string;
  type: InsightType;
  content: string;
  priority: InsightPriority;
  generated_at: number;
  expires_at: number;
  seen: number;
  [key: string]: SqlStorageValue;
};

export type EntityRow = {
  id: string;
  name: string;
  type: EntityType;
  first_seen: number;
  last_seen: number;
  mention_count: number;
  [key: string]: SqlStorageValue;
};

export type SignalStatsRow = {
  type: string;
  day: string;
  count: number;
  [key: string]: SqlStorageValue;
};

const RETENTION_DAYS = 30;
const ANALYSIS_HOUR = 6; // 6 AM UTC
const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/**
 * Per-org Signal Agent — collects customer interaction signals
 * and generates daily demand insights via Workers AI.
 * No external API keys needed — uses Cloudflare AI binding.
 */
export class SignalDurableObject extends DurableObject {
  private sql: SqlStorage;
  private schemaReady = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
  }

  private ensureSchema(): void {
    if (this.schemaReady) return;

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS signals (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        content TEXT NOT NULL,
        intent TEXT,
        role TEXT,
        org_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_signals_ts ON signals(timestamp)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(type)`);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        mention_count INTEGER NOT NULL DEFAULT 1
      )
    `);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_entities_count ON entities(mention_count DESC)`);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS signal_entities (
        signal_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        PRIMARY KEY (signal_id, entity_id)
      )
    `);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        generated_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        seen INTEGER NOT NULL DEFAULT 0
      )
    `);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_insights_generated ON insights(generated_at DESC)`);

    this.schemaReady = true;
  }

  // --- Public RPC methods ---

  async ingest(payload: IngestPayload): Promise<void> {
    this.ensureSchema();

    this.sql.exec(
      `INSERT INTO signals (id, type, source, content, intent, role, org_id, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      payload.type,
      payload.source,
      payload.content,
      payload.intent ?? null,
      payload.role ?? null,
      payload.orgId,
      payload.timestamp,
    );

    // Ensure daily analysis alarm is set
    this.ctx.waitUntil(this.ensureAlarm());
  }

  async getInsights(opts?: { since?: number; limit?: number; unseenOnly?: boolean }): Promise<InsightRow[]> {
    this.ensureSchema();
    const since = opts?.since ?? 0;
    const limit = opts?.limit ?? 50;
    const seenFilter = opts?.unseenOnly ? "AND seen = 0" : "";

    return this.sql
      .exec<InsightRow>(
        `SELECT * FROM insights WHERE generated_at > ? ${seenFilter}
         ORDER BY generated_at DESC LIMIT ?`,
        since,
        limit,
      )
      .toArray();
  }

  async getTopEntities(opts?: { days?: number; limit?: number }): Promise<EntityRow[]> {
    this.ensureSchema();
    const days = opts?.days ?? 7;
    const since = Date.now() - days * 86400000;
    const limit = opts?.limit ?? 20;

    return this.sql
      .exec<EntityRow>(
        `SELECT e.* FROM entities e
         JOIN signal_entities se ON e.id = se.entity_id
         JOIN signals s ON se.signal_id = s.id
         WHERE s.timestamp > ?
         GROUP BY e.id
         ORDER BY COUNT(*) DESC
         LIMIT ?`,
        since,
        limit,
      )
      .toArray();
  }

  async getSignalStats(opts?: { days?: number }): Promise<SignalStatsRow[]> {
    this.ensureSchema();
    const days = opts?.days ?? 7;
    const since = Date.now() - days * 86400000;

    return this.sql
      .exec<SignalStatsRow>(
        `SELECT type, date(timestamp/1000, 'unixepoch') as day, COUNT(*) as count
         FROM signals WHERE timestamp > ?
         GROUP BY type, day ORDER BY day DESC`,
        since,
      )
      .toArray();
  }

  async markInsightSeen(id: string): Promise<void> {
    this.ensureSchema();
    this.sql.exec(`UPDATE insights SET seen = 1 WHERE id = ?`, id);
  }

  // --- Alarm handler (daily analysis) ---

  async alarm(): Promise<void> {
    this.ensureSchema();
    await this.runAnalysis();
    this.cleanupOldSignals();
    await this.scheduleNextAlarm();
  }

  // --- Internal methods ---

  private async runAnalysis(): Promise<void> {
    const sevenDaysAgo = Date.now() - 7 * 86400000;

    // Gather signals summary
    const signalCounts = this.sql
      .exec<{ type: string; count: number }>(
        `SELECT type, COUNT(*) as count FROM signals WHERE timestamp > ? GROUP BY type`,
        sevenDaysAgo,
      )
      .toArray();

    const totalSignals = signalCounts.reduce((sum, r) => sum + r.count, 0);
    if (totalSignals === 0) return;

    // Recent signal samples (last 50 for context)
    const recentSignals = this.sql
      .exec<{ id: string; type: string; content: string; intent: string }>(
        `SELECT id, type, content, intent FROM signals
         WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 50`,
        sevenDaysAgo,
      )
      .toArray();

    // Previous insights (to avoid repeating)
    const previousInsights = this.sql
      .exec<{ content: string }>(
        `SELECT content FROM insights WHERE generated_at > ? ORDER BY generated_at DESC LIMIT 10`,
        sevenDaysAgo,
      )
      .toArray();

    const ai = (this.env as unknown as { AI: Ai }).AI;

    // Step 1: Extract entities from recent signals (batched)
    await this.batchExtractEntities(ai, recentSignals);

    // Reload top entities after extraction
    const topEntities = this.sql
      .exec<{ name: string; type: string; mentions: number }>(
        `SELECT e.name, e.type, COUNT(*) as mentions FROM entities e
         JOIN signal_entities se ON e.id = se.entity_id
         JOIN signals s ON se.signal_id = s.id
         WHERE s.timestamp > ?
         GROUP BY e.id ORDER BY mentions DESC LIMIT 20`,
        sevenDaysAgo,
      )
      .toArray();

    // Step 2: Generate insights
    try {
      const prompt = `You analyze customer interaction signals for a seafood vendor. Generate actionable insights.
Return ONLY valid JSON, no other text: { "insights": [{ "type": "demand|gap|trend|suggestion", "content": "concise insight", "priority": "high|medium|low" }] }
Rules:
- "demand": items/services customers are actively asking for
- "gap": things customers want but vendor doesn't offer
- "trend": patterns changing over time
- "suggestion": actionable recommendations
- Be specific and concise (1-2 sentences per insight)
- Focus on what's actionable for the vendor
- Don't repeat previous insights unless the situation has changed

## Signal Summary (last 7 days)
${signalCounts.map((r) => `- ${r.type}: ${r.count} interactions`).join("\n")}

## Top Entities
${topEntities.map((e) => `- ${e.name} (${e.type}): ${e.mentions} mentions`).join("\n") || "None yet"}

## Recent Interactions (sample)
${recentSignals.map((s) => `[${s.type}] ${s.content}${s.intent ? ` → ${s.intent}` : ""}`).join("\n")}

## Previous Insights (avoid repeating)
${previousInsights.map((i) => `- ${i.content}`).join("\n") || "None yet"}

Generate insights based on this data.`;

      const result = await ai.run(AI_MODEL, {
        messages: [{ role: "user", content: prompt }],
      }) as { response?: string };

      const text = result.response;
      if (!text) return;

      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;

      const parsed = JSON.parse(jsonMatch[0]) as {
        insights: { type: InsightType; content: string; priority: InsightPriority }[];
      };

      if (!Array.isArray(parsed.insights)) return;

      const now = Date.now();
      const expiresAt = now + 7 * 86400000;

      for (const insight of parsed.insights) {
        this.sql.exec(
          `INSERT INTO insights (id, type, content, priority, generated_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          crypto.randomUUID(),
          insight.type,
          insight.content,
          insight.priority,
          now,
          expiresAt,
        );
      }
    } catch (err) {
      console.error("[SignalDO] Insight generation failed:", err);
    }
  }

  /** Batch extract entities from signals that don't have any yet */
  private async batchExtractEntities(
    ai: Ai,
    signals: { id: string; type: string; content: string; intent: string }[],
  ): Promise<void> {
    // Find signals without entity links
    const unlinked = signals.filter((s) => {
      const linked = this.sql
        .exec<{ count: number }>(
          `SELECT COUNT(*) as count FROM signal_entities WHERE signal_id = ?`,
          s.id,
        )
        .toArray();
      return linked[0]?.count === 0;
    });

    if (unlinked.length === 0) return;

    // Batch up to 30 signals into one AI call
    const batch = unlinked.slice(0, 30);
    const batchText = batch
      .map((s, i) => `${i + 1}. [${s.type}] ${s.content}`)
      .join("\n");

    try {
      const prompt = `Extract entities from these customer interactions. Return ONLY valid JSON, no other text.
Format: { "results": [{ "index": 1, "entities": [{ "name": "lowercase name", "type": "product|location|feature|question" }] }] }
Rules:
- "product": seafood items (shrimp, salmon, halibut, etc)
- "location": markets, areas, addresses
- "feature": capabilities they're asking about (delivery, pre-order, etc)
- "question": specific questions they need answered
- Return empty entities array if no clear entities for that interaction
- Normalize names: "wild caught salmon" and "wild salmon" → "wild salmon"

Interactions:
${batchText}`;

      const result = await ai.run(AI_MODEL, {
        messages: [{ role: "user", content: prompt }],
      }) as { response?: string };

      const text = result.response;
      if (!text) return;

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;

      const parsed = JSON.parse(jsonMatch[0]) as {
        results: { index: number; entities: { name: string; type: EntityType }[] }[];
      };

      if (!Array.isArray(parsed.results)) return;

      const now = Date.now();
      for (const item of parsed.results) {
        const signal = batch[item.index - 1];
        if (!signal || !Array.isArray(item.entities)) continue;

        for (const entity of item.entities) {
          const name = entity.name.toLowerCase().trim();
          if (!name) continue;

          // Upsert entity
          const existing = this.sql
            .exec<EntityRow>(`SELECT * FROM entities WHERE name = ? AND type = ?`, name, entity.type)
            .toArray();

          let entityId: string;
          if (existing.length > 0) {
            entityId = existing[0].id;
            this.sql.exec(
              `UPDATE entities SET last_seen = ?, mention_count = mention_count + 1 WHERE id = ?`,
              now,
              entityId,
            );
          } else {
            entityId = crypto.randomUUID();
            this.sql.exec(
              `INSERT INTO entities (id, name, type, first_seen, last_seen, mention_count)
               VALUES (?, ?, ?, ?, ?, 1)`,
              entityId,
              name,
              entity.type,
              now,
              now,
            );
          }

          this.sql.exec(
            `INSERT OR IGNORE INTO signal_entities (signal_id, entity_id) VALUES (?, ?)`,
            signal.id,
            entityId,
          );
        }
      }
    } catch (err) {
      console.error("[SignalDO] Batch entity extraction failed:", err);
    }
  }

  private cleanupOldSignals(): void {
    const cutoff = Date.now() - RETENTION_DAYS * 86400000;

    this.sql.exec(
      `DELETE FROM signal_entities WHERE signal_id IN
       (SELECT id FROM signals WHERE timestamp < ?)`,
      cutoff,
    );
    this.sql.exec(`DELETE FROM signals WHERE timestamp < ?`, cutoff);
    this.sql.exec(`DELETE FROM insights WHERE expires_at < ?`, Date.now());
    this.sql.exec(
      `DELETE FROM entities WHERE id NOT IN (SELECT DISTINCT entity_id FROM signal_entities)`,
    );
  }

  private async ensureAlarm(): Promise<void> {
    const existing = await this.ctx.storage.getAlarm();
    if (existing) return;
    await this.scheduleNextAlarm();
  }

  private async scheduleNextAlarm(): Promise<void> {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(ANALYSIS_HOUR, 0, 0, 0);
    if (next <= now) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    await this.ctx.storage.setAlarm(next.getTime());
  }
}
