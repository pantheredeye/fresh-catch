"use client";

import { useState, useCallback, useEffect } from "react";
import type { VoiceCommandResult } from "@/api/voice-tools";
import { voiceTools } from "@/api/voice-tools";
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

interface MarketUpdateFormData {
  marketId: string;
  marketName: string;
  changes: Record<string, { old: unknown; new: string }>;
  unchanged: Record<string, string>;
  editingUnchanged: Set<string>;
  expiresAt: string;
}

interface MarketCatchFormData {
  marketId: string;
  marketName: string;
  items: CatchItem[];
}

// --- Props ---

interface CommandReviewProps {
  result: VoiceCommandResult;
  onSave: (intent: string, data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  onRetry: () => void;
}

// --- Helpers ---

function toEndOfDay(dateStr: string): string {
  if (!dateStr) return "";
  // dateStr is YYYY-MM-DD from date input
  return new Date(`${dateStr}T23:59:59`).toISOString();
}

function toDateInputValue(isoStr: string): string {
  if (!isoStr) return "";
  try {
    return new Date(isoStr).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDateInPast(dateStr: string): boolean {
  if (!dateStr) return false;
  return dateStr < getTodayStr();
}

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
  const dateVal = toDateInputValue(data.expiresAt);
  const pastDate = isDateInPast(dateVal);

  return (
    <>
      <div className="cr-popup-badge">Popup</div>
      <div className="cr-field cr-field--prominent">
        <label className="cr-label cr-label--prominent">
          Popup expires end of day on: *
        </label>
        <input
          type="date"
          className="cr-input cr-input--date"
          value={dateVal}
          min={getTodayStr()}
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              ...data,
              expiresAt: val ? toEndOfDay(val) : "",
            });
          }}
        />
        {pastDate && (
          <span className="cr-date-validation">
            Date must be today or in the future
          </span>
        )}
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

// --- Market Update Diff Form ---

const MARKET_FIELD_LABELS: Record<string, string> = {
  name: "Market Name",
  schedule: "Schedule",
  locationDetails: "Location Details",
  customerInfo: "Customer Information",
  expiresAt: "Expires At",
};

function MarketUpdateReviewForm({
  data,
  onChange,
}: {
  data: MarketUpdateFormData;
  onChange: (d: MarketUpdateFormData) => void;
}) {
  const [showUnchanged, setShowUnchanged] = useState(false);

  const toggleUnchanged = (field: string) => {
    const next = new Set(data.editingUnchanged);
    if (next.has(field)) {
      next.delete(field);
    } else {
      next.add(field);
    }
    onChange({ ...data, editingUnchanged: next });
  };

  const updateChange = (field: string, value: string) => {
    onChange({
      ...data,
      changes: {
        ...data.changes,
        [field]: { ...data.changes[field], new: value },
      },
    });
  };

  const updateUnchanged = (field: string, value: string) => {
    // Promote to changes
    const newChanges = {
      ...data.changes,
      [field]: { old: data.unchanged[field], new: value },
    };
    const newUnchanged = { ...data.unchanged };
    delete newUnchanged[field];
    onChange({
      ...data,
      changes: newChanges,
      unchanged: newUnchanged,
    });
  };

  const isDateField = (field: string) => field === "expiresAt";

  const renderDateInput = (
    value: string,
    onChangeVal: (val: string) => void,
  ) => {
    const dateVal = toDateInputValue(value);
    const pastDate = isDateInPast(dateVal);
    return (
      <>
        <input
          type="date"
          className="cr-input cr-input--date"
          value={dateVal}
          min={getTodayStr()}
          onChange={(e) => {
            const val = e.target.value;
            onChangeVal(val ? toEndOfDay(val) : "");
          }}
        />
        {pastDate && (
          <span className="cr-date-validation">
            Date must be today or in the future
          </span>
        )}
      </>
    );
  };

  return (
    <>
      {/* Changed fields - highlighted */}
      {Object.entries(data.changes).length > 0 && (
        <div className="cr-diff-section">
          <label className="cr-label cr-label--diff-changed">Changed</label>
          {Object.entries(data.changes).map(([field, { old: oldVal, new: newVal }]) => (
            <div key={field} className="cr-diff-field cr-diff-field--changed">
              <label className="cr-label">{MARKET_FIELD_LABELS[field] || field}</label>
              <div className="cr-diff-old">
                {isDateField(field) && oldVal
                  ? new Date(oldVal as string).toLocaleDateString()
                  : String(oldVal || "(empty)")}
              </div>
              {isDateField(field)
                ? renderDateInput(newVal, (val) => updateChange(field, val))
                : (
                  <input
                    className="cr-input cr-diff-new"
                    value={newVal}
                    onChange={(e) => updateChange(field, e.target.value)}
                  />
                )}
            </div>
          ))}
        </div>
      )}

      {/* Unchanged fields - collapsed behind toggle */}
      {Object.keys(data.unchanged).length > 0 && (
        <div className="cr-diff-section cr-diff-section--unchanged">
          <button
            className="cr-show-all-toggle"
            onClick={() => setShowUnchanged(!showUnchanged)}
            type="button"
          >
            {showUnchanged ? "− Hide unchanged fields" : `+ Show all fields (${Object.keys(data.unchanged).length} unchanged)`}
          </button>
          {showUnchanged && Object.entries(data.unchanged).map(([field, value]) => (
            <div
              key={field}
              className={`cr-diff-field cr-diff-field--unchanged ${data.editingUnchanged.has(field) ? "cr-diff-field--editing" : ""}`}
            >
              <div className="cr-diff-unchanged-header" onClick={() => toggleUnchanged(field)}>
                <label className="cr-label">{MARKET_FIELD_LABELS[field] || field}</label>
                <span className="cr-diff-unchanged-value">
                  {isDateField(field) && value
                    ? new Date(value).toLocaleDateString()
                    : value || "(empty)"}
                </span>
                <span className="cr-diff-edit-hint">
                  {data.editingUnchanged.has(field) ? "−" : "+"}
                </span>
              </div>
              {data.editingUnchanged.has(field) && (
                isDateField(field)
                  ? renderDateInput(value, (val) => updateUnchanged(field, val))
                  : (
                    <input
                      className="cr-input"
                      value={value}
                      onChange={(e) => updateUnchanged(field, e.target.value)}
                    />
                  )
              )}
            </div>
          ))}
        </div>
      )}

      {/* Always show date picker for popup expiresAt */}
      {data.expiresAt !== undefined && !data.changes.expiresAt && !data.unchanged.expiresAt && (
        <div className="cr-field cr-field--prominent">
          <label className="cr-label cr-label--prominent">
            Popup expires end of day on:
          </label>
          {renderDateInput(data.expiresAt, (val) =>
            onChange({ ...data, expiresAt: val })
          )}
        </div>
      )}
    </>
  );
}

// --- Market Catch Review Form ---

function MarketCatchReviewForm({
  data,
  onChange,
}: {
  data: MarketCatchFormData;
  onChange: (d: MarketCatchFormData) => void;
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
        <label className="cr-label">Market</label>
        <input
          className="cr-input cr-input--readonly"
          value={data.marketName}
          readOnly
        />
      </div>
      <div className="cr-field">
        <label className="cr-label">Catch Items</label>
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
    </>
  );
}

// --- Confidence Warning ---

function ConfidenceWarning({
  result,
  onRetry,
  onIntentChange,
}: {
  result: VoiceCommandResult;
  onRetry: () => void;
  onIntentChange: (intent: string) => void;
}) {
  const [showIntentPicker, setShowIntentPicker] = useState(false);

  return (
    <div className="cr-low-confidence">
      <div className="cr-low-confidence-text">
        I&apos;m not sure about this. Did you mean: &ldquo;{result.interpretation}&rdquo;?
      </div>
      <div className="cr-low-confidence-actions">
        <button
          className="cr-btn cr-btn--outline cr-btn--sm"
          onClick={() => setShowIntentPicker(!showIntentPicker)}
        >
          That&apos;s not right
        </button>
      </div>
      {showIntentPicker && (
        <div className="cr-intent-picker">
          <button className="cr-btn cr-btn--secondary cr-btn--sm" onClick={onRetry}>
            Re-record
          </button>
          <select
            className="cr-input cr-intent-select"
            value=""
            onChange={(e) => {
              if (e.target.value) onIntentChange(e.target.value);
            }}
          >
            <option value="">Select action...</option>
            {Object.entries(voiceTools).map(([intent, tool]) => (
              <option key={intent} value={intent}>
                {tool.description}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
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
  const [error, setError] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState(result);

  // Handle manual intent change from confidence warning
  const handleIntentChange = useCallback(
    (newIntent: string) => {
      const tool = voiceTools[newIntent];
      if (!tool) return;
      setActiveResult({
        ...activeResult,
        intent: newIntent,
        reviewType: tool.reviewType,
        confidence: 1.0, // User explicitly chose this
      });
    },
    [activeResult],
  );

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

  const [marketUpdateData, setMarketUpdateData] = useState<MarketUpdateFormData>(() => {
    // Build diff: separate changed fields from original data
    const data = result.data;
    const originalData = (data._original as Record<string, unknown>) || {};
    const changes: Record<string, { old: unknown; new: string }> = {};
    const unchanged: Record<string, string> = {};

    const diffFields = ["name", "schedule", "subtitle", "locationDetails", "customerInfo"];
    for (const field of diffFields) {
      if (data[field] !== undefined && data[field] !== originalData[field]) {
        changes[field] = { old: originalData[field], new: String(data[field] || "") };
      } else if (originalData[field] !== undefined) {
        unchanged[field] = String(originalData[field] || "");
      }
    }

    return {
      marketId: (data.marketId as string) || "",
      marketName: (data.name as string) || (originalData.name as string) || "",
      changes,
      unchanged,
      editingUnchanged: new Set<string>(),
      expiresAt: (data.expiresAt as string) || (originalData.expiresAt as string) || "",
    };
  });

  const [marketCatchData, setMarketCatchData] = useState<MarketCatchFormData>(() => ({
    marketId: (result.data.marketId as string) || "",
    marketName: (result.data.marketName as string) || (result.data.name as string) || "",
    items: parseCatchPreview(result.data.catchPreview),
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
    setError(null);
    try {
      let data: Record<string, unknown>;
      switch (activeResult.reviewType) {
        case "catch":
          data = {
            ...catchData,
            rawTranscript: activeResult.rawTranscript,
          };
          break;
        case "market-create":
          data = {
            ...marketData,
            catchPreview:
              marketData.catchPreview.length > 0
                ? JSON.stringify({ items: marketData.catchPreview })
                : undefined,
            rawTranscript: activeResult.rawTranscript,
          };
          break;
        case "popup-create":
          data = {
            ...popupData,
            type: "popup",
            catchPreview:
              popupData.catchPreview.length > 0
                ? JSON.stringify({ items: popupData.catchPreview })
                : undefined,
            rawTranscript: activeResult.rawTranscript,
          };
          break;
        case "market-update": {
          // Collect only changed fields
          const changedFields: Record<string, unknown> = {};
          for (const [field, { new: newVal }] of Object.entries(marketUpdateData.changes)) {
            changedFields[field] = newVal;
          }
          data = {
            marketId: marketUpdateData.marketId,
            ...changedFields,
            rawTranscript: activeResult.rawTranscript,
          };
          if (marketUpdateData.expiresAt) {
            data.expiresAt = marketUpdateData.expiresAt;
          }
          break;
        }
        case "market-catch":
          data = {
            marketId: marketCatchData.marketId,
            catchPreview: JSON.stringify({ items: marketCatchData.items }),
            rawTranscript: activeResult.rawTranscript,
          };
          break;
        default:
          data = activeResult.data;
      }
      await onSave(activeResult.intent, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [activeResult, catchData, marketData, popupData, marketUpdateData, marketCatchData, onSave]);

  // Determine if save is enabled
  const canSave = (() => {
    switch (activeResult.reviewType) {
      case "catch":
        return catchData.headline.trim().length > 0 && catchData.items.length > 0;
      case "market-create":
        return marketData.name.trim().length > 0;
      case "popup-create":
        return popupData.name.trim().length > 0 && popupData.expiresAt.length > 0 && !isDateInPast(toDateInputValue(popupData.expiresAt));
      case "market-update":
        return marketUpdateData.marketId.length > 0 && Object.keys(marketUpdateData.changes).length > 0;
      case "market-catch":
        return marketCatchData.marketId.length > 0 && marketCatchData.items.length > 0;
      default:
        return true;
    }
  })();

  return (
    <div className="cr-overlay">
      <div className="cr-panel">
        {/* Header */}
        <div className="cr-header">
          <p className="cr-interpretation">{activeResult.interpretation}</p>
          {activeResult.confidence < 0.7 && (
            <ConfidenceWarning
              result={activeResult}
              onRetry={onRetry}
              onIntentChange={handleIntentChange}
            />
          )}
          {activeResult.confidence >= 0.7 && activeResult.confidence < 0.8 && (
            <div className="cr-confidence-warning">
              Low confidence ({Math.round(activeResult.confidence * 100)}%) — please
              review carefully
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="cr-error-banner">
            {error}
          </div>
        )}

        {/* Form body */}
        <div className="cr-body">
          {activeResult.reviewType === "catch" && (
            <CatchReviewForm data={catchData} onChange={setCatchData} />
          )}
          {activeResult.reviewType === "market-create" && (
            <MarketReviewForm data={marketData} onChange={setMarketData} />
          )}
          {activeResult.reviewType === "popup-create" && (
            <PopupReviewForm data={popupData} onChange={setPopupData} />
          )}
          {activeResult.reviewType === "market-update" && (
            <MarketUpdateReviewForm data={marketUpdateData} onChange={setMarketUpdateData} />
          )}
          {activeResult.reviewType === "market-catch" && (
            <MarketCatchReviewForm data={marketCatchData} onChange={setMarketCatchData} />
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
