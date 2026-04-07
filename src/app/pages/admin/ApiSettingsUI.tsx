"use client";

import { useState, useTransition } from "react";
import { Button, Badge } from "@/design-system";
import { createApiKey } from "./api-key-functions";
import "./admin.css";

export function ApiSettingsUI({
  orgId,
  existingKeyPrefix,
  csrfToken,
}: {
  orgId: string;
  existingKeyPrefix: string | null;
  csrfToken: string;
}) {
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [keyPrefix, setKeyPrefix] = useState(existingKeyPrefix);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setError(null);
    setCopied(false);

    startTransition(async () => {
      const result = await createApiKey(csrfToken, orgId);
      if (result.success) {
        setRawKey(result.key);
        setKeyPrefix(result.prefix);
      } else {
        setError(result.error);
      }
    });
  };

  const handleCopy = async () => {
    if (!rawKey) return;
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: "var(--width-sm)", margin: "0 auto", padding: "var(--space-lg)" }}>
      <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-sm)", color: "var(--color-text-primary)" }}>
        MCP API Key
      </h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", marginBottom: "var(--space-lg)" }}>
        Generate an API key for external MCP access
      </p>

      <div style={{
        background: "var(--color-surface-primary)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-md)",
        border: "1px solid var(--color-border-light)",
      }}>
        {/* Existing key display */}
        {keyPrefix && !rawKey && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
            <code style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-primary)",
              background: "var(--color-surface-secondary)",
              padding: "var(--space-xs) var(--space-sm)",
              borderRadius: "var(--radius-sm)",
            }}>
              {keyPrefix}
            </code>
            <Badge variant="mint">Active</Badge>
          </div>
        )}

        {/* Raw key display (after generation) */}
        {rawKey && (
          <div style={{ marginBottom: "var(--space-md)" }}>
            <div style={{
              padding: "var(--space-sm)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-status-warning-bg)",
              color: "var(--color-status-warning-border)",
              fontSize: "var(--font-size-sm)",
              marginBottom: "var(--space-sm)",
            }}>
              Key generated — copy it now, it won't be shown again
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <code style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-primary)",
                background: "var(--color-surface-secondary)",
                padding: "var(--space-xs) var(--space-sm)",
                borderRadius: "var(--radius-sm)",
                wordBreak: "break-all",
                flex: 1,
              }}>
                {rawKey}
              </code>
              <Button
                variant="secondary"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        )}

        <div style={{ width: "100%" }}>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isPending}
          >
            {isPending ? "Generating..." : keyPrefix ? "Regenerate Key" : "Generate API Key"}
          </Button>
        </div>

        {error && (
          <div style={{
            marginTop: "var(--space-sm)",
            padding: "var(--space-xs)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-status-error-bg)",
            color: "var(--color-status-error)",
            fontSize: "var(--font-size-sm)",
            textAlign: "center",
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
