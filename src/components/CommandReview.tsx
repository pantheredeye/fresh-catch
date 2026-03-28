"use client";

import { useState, useCallback, useEffect } from "react";
import type { VoiceCommandResult } from "@/api/voice-tools";
import "./command-review.css";

// --- Shared types for form data ---

interface CatchItem {
  name: string;
  note: string;
}

interface CatchFormData {
  headline: string;
  items: CatchItem[];
  summary: string;
}

interface MarketFormData {
  name: string;
  schedule: string;
  active: boolean;
  locationDetails: string;
  customerInfo: string;
  catchPreview: CatchItem[];
}

interface PopupFormData extends MarketFormData {
  expiresAt: string;
  notes: string;
}

// --- Props ---

interface CommandReviewProps {
  result: VoiceCommandResult;
  onSave: (intent: string, data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  onRetry: () => void;
}

// --- Helpers ---

function parseCatchPreview(raw: unknown): CatchItem[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.items && Array.isArray(parsed.items)) return parsed.items;
  } catch {
    // ignore
  }
  return [];
}

// --- Sub-forms ---

function CatchReviewForm({
  data,
  onChange,
}: {
  data: CatchFormData;
  onChange: (d: CatchFormData) => void;
}) {
  const updateItem = (i: number, field: "name" | "note", value: string) => {
    const items = [...data.items];
    items[i] = { ...items[i], [field]: value };
    onChange({ ...data, items });
  };

  const removeItem = (i: number) => {
    onChange({ ...data, items: data.items.filter((_, idx) => idx !== i) });
  };

  const addItem = () => {
    onChange({ ...data, items: [...data.items, { name: "", note: "" }] });
  };

  return (
    <>
      <div className="cr-field">
        <label className="cr-label">Headline</label>
        <input
          className="cr-input"
          value={data.headline}
          onChange={(e) => onChange({ ...data, headline: e.target.value })}
        />
      </div>
      <div className="cr-field">
        <label className="cr-label">Items</label>
        {data.items.map((item, i) => (
          <div key={i} className="cr-item-row">
            <input
              className="cr-input cr-input--name"
              value={item.name}
              onChange={(e) => updateItem(i, "name", e.target.value)}
              placeholder="Fish name"
            />
            <input
              className="cr-input cr-input--note"
              value={item.note}
              onChange={(e) => updateItem(i, "note", e.target.value)}
              placeholder="Description"
            />
            <button
              className="cr-remove"
              onClick={() => removeItem(i)}
              title="Remove item"
            >
              &times;
            </button>
          </div>
        ))}
        <button className="cr-btn cr-btn--secondary" onClick={addItem}>
          + Add Item
        </button>
      </div>
      <div className="cr-field">
        <label className="cr-label">Summary</label>
        <input
          className="cr-input"
          value={data.summary}
          onChange={(e) => onChange({ ...data, summary: e.target.value })}
        />
      </div>
    </>
  );
}

function MarketReviewForm({
  data,
  onChange,
}: {
  data: MarketFormData;
  onChange: (d: MarketFormData) => void;
}) {
  const updateCatchItem = (
    i: number,
    field: "name" | "note",
    value: string,
  ) => {
    const catchPreview = [...data.catchPreview];
    catchPreview[i] = { ...catchPreview[i], [field]: value };
    onChange({ ...data, catchPreview });
  };

  const removeCatchItem = (i: number) => {
    onChange({
      ...data,
      catchPreview: data.catchPreview.filter((_, idx) => idx !== i),
    });
  };

  const addCatchItem = () => {
    onChange({
      ...data,
      catchPreview: [...data.catchPreview, { name: "", note: "" }],
    });
  };

  return (
    <>
      <div className="cr-field">
        <label className="cr-label">Market Name *</label>
        <input
          className="cr-input"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="Enter market name"
        />
      </div>
      <div className="cr-field">
        <label className="cr-label">Schedule</label>
        <input
          className="cr-input"
          value={data.schedule}
          onChange={(e) => onChange({ ...data, schedule: e.target.value })}
          placeholder="e.g., Saturdays 8am-2pm"
        />
      </div>
      <div className="cr-field">
        <label className="cr-label">Location Details</label>
        <textarea
          className="cr-textarea"
          value={data.locationDetails}
          onChange={(e) =>
            onChange({ ...data, locationDetails: e.target.value })
          }
          placeholder="Booth location, setup notes, parking info..."
          rows={3}
        />
      </div>
      <div className="cr-field">
        <label className="cr-label">Customer Information</label>
        <textarea
          className="cr-textarea"
          value={data.customerInfo}
          onChange={(e) => onChange({ ...data, customerInfo: e.target.value })}
          placeholder="Payment methods, what to bring..."
          rows={3}
        />
      </div>
      {data.catchPreview.length > 0 && (
        <div className="cr-field">
          <label className="cr-label">Catch Preview</label>
          {data.catchPreview.map((item, i) => (
            <div key={i} className="cr-item-row">
              <input
                className="cr-input cr-input--name"
                value={item.name}
                onChange={(e) => updateCatchItem(i, "name", e.target.value)}
                placeholder="Fish name"
              />
              <input
                className="cr-input cr-input--note"
                value={item.note}
                onChange={(e) => updateCatchItem(i, "note", e.target.value)}
                placeholder="Description"
              />
              <button
                className="cr-remove"
                onClick={() => removeCatchItem(i)}
                title="Remove item"
              >
                &times;
              </button>
            </div>
          ))}
          <button
            className="cr-btn cr-btn--secondary"
            onClick={addCatchItem}
          >
            + Add Item
          </button>
        </div>
      )}
      <div className="cr-field">
        <label className="cr-label">Status</label>
        <div className="cr-toggle-row">
          <input
            type="checkbox"
            id="cr-active"
            checked={data.active}
            onChange={(e) => onChange({ ...data, active: e.target.checked })}
          />
          <label htmlFor="cr-active" className="cr-toggle-label">
            Market is active
          </label>
        </div>
      </div>
    </>
  );
}

function PopupReviewForm({
  data,
  onChange,
}: {
  data: PopupFormData;
  onChange: (d: PopupFormData) => void;
}) {
  return (
    <>
      <div className="cr-popup-badge">Popup</div>
      <div className="cr-field cr-field--prominent">
        <label className="cr-label cr-label--prominent">Expires At *</label>
        <input
          type="datetime-local"
          className="cr-input cr-input--date"
          value={data.expiresAt ? data.expiresAt.slice(0, 16) : ""}
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              ...data,
              expiresAt: val ? new Date(val).toISOString() : "",
            });
          }}
        />
      </div>
      <MarketReviewForm
        data={data}
        onChange={(market) => onChange({ ...data, ...market })}
      />
      {data.notes && (
        <div className="cr-field">
          <label className="cr-label">Notes</label>
          <textarea
            className="cr-textarea"
            value={data.notes}
            onChange={(e) => onChange({ ...data, notes: e.target.value })}
            rows={2}
          />
        </div>
      )}
    </>
  );
}

// --- Main Component ---

export function CommandReview({
  result,
  onSave,
  onCancel,
  onRetry,
}: CommandReviewProps) {
  const [saving, setSaving] = useState(false);

  // Initialize form data from voice result
  const [catchData, setCatchData] = useState<CatchFormData>(() => ({
    headline: (result.data.headline as string) || "",
    items: Array.isArray(result.data.items)
      ? (result.data.items as CatchItem[])
      : [],
    summary: (result.data.summary as string) || "",
  }));

  const [marketData, setMarketData] = useState<MarketFormData>(() => ({
    name: (result.data.name as string) || "",
    schedule: (result.data.schedule as string) || "",
    active: true,
    locationDetails: (result.data.locationDetails as string) || "",
    customerInfo: (result.data.customerInfo as string) || "",
    catchPreview: parseCatchPreview(result.data.catchPreview),
  }));

  const [popupData, setPopupData] = useState<PopupFormData>(() => ({
    name: (result.data.name as string) || "",
    schedule: (result.data.schedule as string) || "",
    active: true,
    locationDetails: (result.data.locationDetails as string) || "",
    customerInfo: (result.data.customerInfo as string) || "",
    catchPreview: parseCatchPreview(result.data.catchPreview),
    expiresAt: (result.data.expiresAt as string) || "",
    notes: (result.data.notes as string) || "",
  }));

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      let data: Record<string, unknown>;
      switch (result.reviewType) {
        case "catch":
          data = { ...catchData };
          break;
        case "market-create":
          data = {
            ...marketData,
            catchPreview:
              marketData.catchPreview.length > 0
                ? JSON.stringify({ items: marketData.catchPreview })
                : undefined,
          };
          break;
        case "popup-create":
          data = {
            ...popupData,
            catchPreview:
              popupData.catchPreview.length > 0
                ? JSON.stringify({ items: popupData.catchPreview })
                : undefined,
          };
          break;
        default:
          data = result.data;
      }
      await onSave(result.intent, data);
    } finally {
      setSaving(false);
    }
  }, [result, catchData, marketData, popupData, onSave]);

  // Determine if save is enabled
  const canSave = (() => {
    switch (result.reviewType) {
      case "catch":
        return catchData.headline.trim().length > 0 && catchData.items.length > 0;
      case "market-create":
        return marketData.name.trim().length > 0;
      case "popup-create":
        return popupData.name.trim().length > 0 && popupData.expiresAt.length > 0;
      default:
        return true;
    }
  })();

  return (
    <div className="cr-overlay">
      <div className="cr-panel">
        {/* Header */}
        <div className="cr-header">
          <p className="cr-interpretation">{result.interpretation}</p>
          {result.confidence < 0.8 && (
            <div className="cr-confidence-warning">
              Low confidence ({Math.round(result.confidence * 100)}%) — please
              review carefully
            </div>
          )}
        </div>

        {/* Form body */}
        <div className="cr-body">
          {result.reviewType === "catch" && (
            <CatchReviewForm data={catchData} onChange={setCatchData} />
          )}
          {result.reviewType === "market-create" && (
            <MarketReviewForm data={marketData} onChange={setMarketData} />
          )}
          {result.reviewType === "popup-create" && (
            <PopupReviewForm data={popupData} onChange={setPopupData} />
          )}
        </div>

        {/* Actions */}
        <div className="cr-actions">
          <button
            className="cr-btn cr-btn--primary"
            onClick={handleSave}
            disabled={saving || !canSave}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button className="cr-btn cr-btn--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="cr-btn cr-btn--outline" onClick={onRetry}>
            Re-record
          </button>
        </div>
      </div>
    </div>
  );
}
