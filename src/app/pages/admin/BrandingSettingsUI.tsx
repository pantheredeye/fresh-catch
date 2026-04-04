"use client";

import { useState, useTransition } from "react";
import { Button } from "@/design-system";
import { updateAccentColor } from "./branding-functions";
import "./admin.css";

export function BrandingSettingsUI({
  orgId,
  orgName,
  accentColor,
  csrfToken,
}: {
  orgId: string;
  orgName: string;
  accentColor: string | null;
  csrfToken: string;
}) {
  const [color, setColor] = useState(accentColor ?? "#0066CC");
  const [hasCustomColor, setHasCustomColor] = useState(!!accentColor);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await updateAccentColor(
        csrfToken,
        orgId,
        hasCustomColor ? color : null
      );
      if (result.success) {
        setMessage("Accent color saved");
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div style={{ maxWidth: "var(--width-sm)", margin: "0 auto", padding: "var(--space-lg)" }}>
      <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-sm)", color: "var(--color-text-primary)" }}>
        Branding
      </h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", marginBottom: "var(--space-lg)" }}>
        Customize your storefront accent color for {orgName}
      </p>

      <div style={{
        background: "var(--color-surface-primary)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-md)",
        border: "1px solid var(--color-border-light)",
      }}>
        <label style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-md)",
          cursor: "pointer",
          fontSize: "var(--font-size-md)",
          color: "var(--color-text-primary)",
        }}>
          <input
            type="checkbox"
            checked={hasCustomColor}
            onChange={(e) => setHasCustomColor(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          Use custom accent color
        </label>

        {hasCustomColor && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-md)" }}>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{
                width: 48,
                height: 48,
                border: "2px solid var(--color-border-light)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                padding: 2,
              }}
            />
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
                {color.toUpperCase()}
              </div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
                Click swatch to change
              </div>
            </div>
          </div>
        )}

        {hasCustomColor && (
          <div style={{
            padding: "var(--space-sm)",
            borderRadius: "var(--radius-sm)",
            background: color,
            color: "white",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            textAlign: "center",
            marginBottom: "var(--space-md)",
          }}>
            Preview: Button with accent color
          </div>
        )}

        <div style={{ width: "100%" }}>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>

        {message && (
          <div style={{
            marginTop: "var(--space-sm)",
            padding: "var(--space-xs)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-status-success-bg)",
            color: "var(--color-status-success-border)",
            fontSize: "var(--font-size-sm)",
            textAlign: "center",
          }}>
            {message}
          </div>
        )}
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
