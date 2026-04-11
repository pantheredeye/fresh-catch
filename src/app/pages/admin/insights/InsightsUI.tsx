"use client";

import { useState, useTransition } from "react";
import { refreshInsights, refreshEntities, refreshStats } from "./functions";
import type { InsightRow, EntityRow, SignalStatsRow } from "@/signal/durableObject";

const INSIGHT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  demand: { label: "Demand", color: "var(--color-action-primary)" },
  gap: { label: "Gap", color: "var(--color-status-warning)" },
  trend: { label: "Trend", color: "var(--color-status-success)" },
  suggestion: { label: "Suggestion", color: "var(--color-action-secondary)" },
};

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  high: { bg: "rgba(255, 107, 107, 0.15)", color: "var(--color-status-error)" },
  medium: { bg: "rgba(255, 193, 7, 0.15)", color: "var(--color-status-warning)" },
  low: { bg: "var(--color-surface-secondary)", color: "var(--color-text-secondary)" },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  product: "Product",
  location: "Location",
  feature: "Feature",
  question: "Question",
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString();
}

export function InsightsUI({
  initialInsights,
  initialEntities,
  initialStats,
}: {
  initialInsights: InsightRow[];
  initialEntities: EntityRow[];
  initialStats: SignalStatsRow[];
}) {
  const [insights, setInsights] = useState(initialInsights);
  const [entities, setEntities] = useState(initialEntities);
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();

  const totalSignals = stats.reduce((sum, s) => sum + s.count, 0);

  function handleRefresh() {
    startTransition(async () => {
      const [i, e, s] = await Promise.all([
        refreshInsights(),
        refreshEntities(),
        refreshStats(),
      ]);
      setInsights(i);
      setEntities(e);
      setStats(s);
    });
  }

  return (
    <div style={{ padding: "var(--space-md)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-lg)" }}>
        <div>
          <h2 style={{ fontSize: "var(--font-size-xl)", color: "var(--color-text-primary)", margin: 0 }}>
            Customer Insights
          </h2>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", margin: "var(--space-xs) 0 0" }}>
            {totalSignals} interactions tracked this week
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          style={{
            padding: "var(--space-xs) var(--space-md)",
            background: "var(--color-action-primary)",
            color: "var(--color-text-inverse)",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: isPending ? "wait" : "pointer",
            fontSize: "var(--font-size-sm)",
          }}
        >
          {isPending ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "var(--space-lg)", alignItems: "start" }}>
        {/* Insights list */}
        <div>
          {insights.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "var(--space-2xl)",
              color: "var(--color-text-secondary)",
              background: "var(--color-surface-secondary)",
              borderRadius: "var(--radius-lg)",
            }}>
              <p style={{ fontSize: "var(--font-size-md)", marginBottom: "var(--space-xs)" }}>
                No insights yet
              </p>
              <p style={{ fontSize: "var(--font-size-sm)" }}>
                Insights are generated daily from customer interactions. Start chatting with customers or use voice commands to build up signal data.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              {insights.map((insight) => {
                const typeInfo = INSIGHT_TYPE_LABELS[insight.type] ?? { label: insight.type, color: "var(--color-text-secondary)" };
                const priorityStyle = PRIORITY_STYLES[insight.priority] ?? PRIORITY_STYLES.low;
                return (
                  <div
                    key={insight.id}
                    style={{
                      padding: "var(--space-md)",
                      background: "var(--color-surface-primary)",
                      border: "1px solid var(--color-border-subtle)",
                      borderRadius: "var(--radius-md)",
                      borderLeft: `3px solid ${typeInfo.color}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-xs)" }}>
                      <div style={{ display: "flex", gap: "var(--space-xs)", alignItems: "center" }}>
                        <span style={{
                          fontSize: "var(--font-size-xs)",
                          padding: "1px var(--space-xs)",
                          borderRadius: "var(--radius-sm)",
                          background: `${typeInfo.color}22`,
                          color: typeInfo.color,
                          fontWeight: 600,
                        }}>
                          {typeInfo.label}
                        </span>
                        <span style={{
                          fontSize: "var(--font-size-xs)",
                          padding: "1px var(--space-xs)",
                          borderRadius: "var(--radius-sm)",
                          background: priorityStyle.bg,
                          color: priorityStyle.color,
                        }}>
                          {insight.priority}
                        </span>
                      </div>
                      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                        {formatDate(insight.generated_at)}
                      </span>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: "var(--font-size-sm)",
                      color: "var(--color-text-primary)",
                      lineHeight: 1.5,
                    }}>
                      {insight.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar: top entities */}
        <div>
          <h3 style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-primary)", marginBottom: "var(--space-sm)" }}>
            Top Mentions (7d)
          </h3>
          {entities.length === 0 ? (
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
              No entity data yet
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
              {entities.map((entity) => (
                <div
                  key={entity.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "var(--space-xs) var(--space-sm)",
                    background: "var(--color-surface-primary)",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                      {entity.name}
                    </span>
                    <span style={{
                      marginLeft: "var(--space-xs)",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-tertiary)",
                    }}>
                      {ENTITY_TYPE_LABELS[entity.type] ?? entity.type}
                    </span>
                  </div>
                  <span style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: 600,
                    color: "var(--color-action-primary)",
                    minWidth: 24,
                    textAlign: "right",
                  }}>
                    {entity.mention_count}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Signal breakdown */}
          {stats.length > 0 && (
            <div style={{ marginTop: "var(--space-lg)" }}>
              <h3 style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-primary)", marginBottom: "var(--space-sm)" }}>
                Signal Breakdown
              </h3>
              {Object.entries(
                stats.reduce<Record<string, number>>((acc, s) => {
                  acc[s.type] = (acc[s.type] ?? 0) + s.count;
                  return acc;
                }, {}),
              ).map(([type, count]) => (
                <div
                  key={type}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "var(--space-xs) 0",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    borderBottom: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <span style={{ textTransform: "capitalize" }}>{type}</span>
                  <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
