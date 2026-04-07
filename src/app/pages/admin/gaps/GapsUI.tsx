"use client";

import { useState, useTransition } from "react";
import { getGapLog } from "./functions";
import type { GapLogRow } from "@/mcp/durableObject";

type SortField = "timestamp" | "reason";
type SortDir = "asc" | "desc";

const REASON_LABELS: Record<string, string> = {
  no_tool: "No matching tool",
  insufficient_data: "Insufficient data",
  model_uncertain: "Model uncertain",
  api_error: "API error",
  max_rounds: "Max rounds exceeded",
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + "\u2026";
}

interface GapsUIProps {
  initialGaps: GapLogRow[];
}

export function GapsUI({ initialGaps }: GapsUIProps) {
  const [gaps, setGaps] = useState(initialGaps);
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isPending, startTransition] = useTransition();

  const sorted = [...gaps].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function handleRefresh() {
    startTransition(async () => {
      const fresh = await getGapLog();
      setGaps(fresh);
    });
  }

  const arrow = (field: SortField) =>
    sortField === field ? (sortDir === "asc" ? " \u2191" : " \u2193") : "";

  return (
    <div style={{ padding: "var(--space-md)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-md)",
        }}
      >
        <h2
          style={{
            fontSize: "var(--font-size-xl)",
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          Unanswered Questions
        </h2>
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

      {sorted.length === 0 ? (
        <p
          style={{
            color: "var(--color-text-secondary)",
            textAlign: "center",
            padding: "var(--space-2xl)",
          }}
        >
          No unanswered questions yet. This is where customer questions the AI
          couldn't handle will appear.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid var(--color-border-subtle)",
                  textAlign: "left",
                }}
              >
                <th
                  onClick={() => toggleSort("timestamp")}
                  style={{
                    padding: "var(--space-sm)",
                    cursor: "pointer",
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Date{arrow("timestamp")}
                </th>
                <th
                  style={{
                    padding: "var(--space-sm)",
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Question
                </th>
                <th
                  onClick={() => toggleSort("reason")}
                  style={{
                    padding: "var(--space-sm)",
                    cursor: "pointer",
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Reason{arrow("reason")}
                </th>
                <th
                  style={{
                    padding: "var(--space-sm)",
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Conversation
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((gap) => (
                <tr
                  key={gap.id}
                  style={{
                    borderBottom: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <td
                    style={{
                      padding: "var(--space-sm)",
                      whiteSpace: "nowrap",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {formatDate(gap.timestamp)}
                  </td>
                  <td
                    style={{
                      padding: "var(--space-sm)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {truncate(gap.question, 120)}
                  </td>
                  <td
                    style={{
                      padding: "var(--space-sm)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px var(--space-xs)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "var(--font-size-xs)",
                        background: "var(--color-surface-secondary)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {REASON_LABELS[gap.reason] ?? gap.reason}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "var(--space-sm)",
                      fontFamily: "monospace",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    {gap.conversation_id.slice(0, 8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p
        style={{
          marginTop: "var(--space-md)",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-tertiary)",
        }}
      >
        {sorted.length} unanswered question{sorted.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
