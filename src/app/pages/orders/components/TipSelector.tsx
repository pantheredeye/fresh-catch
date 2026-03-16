"use client";

import { useState } from "react";

interface TipSelectorProps {
  onTipChange: (tipCents: number) => void;
  currentTip: number;
}

type TipOption = "none" | "500" | "1000" | "custom";

export function TipSelector({ onTipChange, currentTip }: TipSelectorProps) {
  const [selected, setSelected] = useState<TipOption>(() => {
    if (currentTip === 0) return "none";
    if (currentTip === 500) return "500";
    if (currentTip === 1000) return "1000";
    return "custom";
  });
  const [customDollars, setCustomDollars] = useState(() => {
    if (currentTip > 0 && currentTip !== 500 && currentTip !== 1000) {
      return (currentTip / 100).toString();
    }
    return "";
  });

  const handleSelect = (option: TipOption) => {
    setSelected(option);
    if (option === "none") {
      onTipChange(0);
    } else if (option === "500") {
      onTipChange(500);
    } else if (option === "1000") {
      onTipChange(1000);
    } else if (option === "custom") {
      const cents = Math.round(parseFloat(customDollars || "0") * 100);
      onTipChange(cents);
    }
  };

  const handleCustomChange = (value: string) => {
    setCustomDollars(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      onTipChange(Math.round(parsed * 100));
    } else {
      onTipChange(0);
    }
  };

  const presets: { label: string; value: TipOption }[] = [
    { label: "No Tip", value: "none" },
    { label: "$5", value: "500" },
    { label: "$10", value: "1000" },
    { label: "Custom", value: "custom" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      <span style={{
        fontSize: "var(--font-size-sm)",
        fontWeight: 600,
        color: "var(--color-text-secondary)",
      }}>
        Add a tip
      </span>
      <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
        {presets.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleSelect(value)}
            style={{
              padding: "var(--space-xs) var(--space-md)",
              borderRadius: "var(--radius-md)",
              border: selected === value
                ? "2px solid var(--color-action-primary)"
                : "1px solid var(--color-border-light)",
              background: selected === value
                ? "var(--color-action-primary)"
                : "var(--color-surface-primary)",
              color: selected === value
                ? "var(--color-text-inverse)"
                : "var(--color-text-primary)",
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {selected === "custom" && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
          <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-md)" }}>$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={customDollars}
            onChange={(e) => handleCustomChange(e.target.value)}
            style={{
              width: "100px",
              padding: "var(--space-xs) var(--space-sm)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-input)",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-primary)",
              background: "var(--color-surface-primary)",
            }}
          />
        </div>
      )}
    </div>
  );
}
