"use client";

import { useState, useCallback } from "react";
import { Card } from "@/design-system";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { VoiceMicButton } from "@/components/VoiceMicButton";
import { clearCatch, publishCatch } from "./catch-functions";
import "./catch.css";

type InputMode = "voice" | "text";

type CatchPhase =
  | "idle"
  | "processing"
  | "review"
  | "publishing"
  | "done"
  | "error";

interface CatchContent {
  headline: string;
  items: { name: string; note: string }[];
  summary: string;
}

interface CatchUpdateData {
  id: string;
  formattedContent: string;
  rawTranscript: string;
  status: string;
  createdAt: string;
}

interface CatchUIProps {
  currentCatch: CatchUpdateData | null;
}

export function CatchUI({ currentCatch }: CatchUIProps) {
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const [phase, setPhase] = useState<CatchPhase>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<CatchContent | null>(null);
  const [liveCatch, setLiveCatch] = useState(currentCatch);
  const [textInput, setTextInput] = useState("");
  const [draft, setDraft] = useState<CatchContent | null>(null);
  const [rawTranscript, setRawTranscript] = useState("");

  const uploadAudio = useCallback(async (blob: Blob) => {
    setPhase("processing");

    try {
      const buffer = await blob.arrayBuffer();
      const response = await fetch("/api/catch/record", {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: buffer,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || `Upload failed (${response.status})`
        );
      }

      const data = (await response.json()) as {
        formatted: CatchContent;
        rawTranscript: string;
      };
      setDraft(data.formatted);
      setRawTranscript(data.rawTranscript);
      setPhase("review");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Upload failed"
      );
      setPhase("error");
    }
  }, []);

  const recorder = useVoiceRecorder({ onAudioReady: uploadAudio });

  const submitText = useCallback(async () => {
    if (!textInput.trim()) return;
    setPhase("processing");

    try {
      const response = await fetch("/api/catch/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || `Submit failed (${response.status})`
        );
      }

      const data = (await response.json()) as {
        formatted: CatchContent;
        rawTranscript: string;
      };
      setDraft(data.formatted);
      setRawTranscript(data.rawTranscript);
      setTextInput("");
      setPhase("review");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Submit failed"
      );
      setPhase("error");
    }
  }, [textInput]);

  const handleMicTap = useCallback(() => {
    if (recorder.state === "recording") {
      recorder.stopRecording();
    } else {
      setResult(null);
      setPhase("idle");
      recorder.setState("idle");
      recorder.startRecording();
    }
  }, [recorder]);

  const handleRetry = useCallback(() => {
    recorder.retryUpload();
  }, [recorder]);

  const handleReRecord = useCallback(() => {
    setResult(null);
    setDraft(null);
    setRawTranscript("");
    setErrorMessage("");
    setPhase("idle");
    recorder.setState("idle");
  }, [recorder]);

  const handleClearCatch = useCallback(async () => {
    const res = await clearCatch();
    if (res.success) {
      setLiveCatch(null);
      setResult(null);
      setPhase("idle");
    }
  }, []);

  const handlePublish = useCallback(async () => {
    if (!draft) return;
    setPhase("publishing");
    try {
      const res = await publishCatch(draft, rawTranscript);
      if (res.success) {
        setResult(draft);
        setLiveCatch(null);
        setDraft(null);
        setPhase("done");
      } else {
        setErrorMessage(res.error || "Publish failed");
        setPhase("error");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Publish failed");
      setPhase("error");
    }
  }, [draft, rawTranscript]);

  const updateDraftHeadline = useCallback((headline: string) => {
    setDraft((prev) => prev ? { ...prev, headline } : prev);
  }, []);

  const updateDraftSummary = useCallback((summary: string) => {
    setDraft((prev) => prev ? { ...prev, summary } : prev);
  }, []);

  const updateDraftItem = useCallback((index: number, field: "name" | "note", value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }, []);

  const removeDraftItem = useCallback((index: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });
  }, []);

  const addDraftItem = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, items: [...prev.items, { name: "", note: "" }] };
    });
  }, []);

  // Derive effective UI state from recorder state + catch phase
  const isRecording = recorder.state === "recording";
  const isPermissionDenied = recorder.state === "permission-denied";
  const showIdle = phase === "idle" && !isRecording && !isPermissionDenied;
  const showDone = phase === "done";

  // Parse current catch content
  let currentCatchContent: CatchContent | null = null;
  if (liveCatch) {
    try {
      currentCatchContent = JSON.parse(liveCatch.formattedContent);
    } catch {
      // ignore parse errors
    }
  }

  return (
    <Card variant="centered" maxWidth="600px">
      <div className="catch-page">
        <h1 className="catch-page__title">Fresh Catch</h1>

        {/* Input Mode Toggle */}
        {(showIdle || showDone) && (
          <div className="catch-mode-toggle">
            <button
              className={`catch-mode-toggle__btn${inputMode === "voice" ? " catch-mode-toggle__btn--active" : ""}`}
              onClick={() => setInputMode("voice")}
            >
              Voice
            </button>
            <button
              className={`catch-mode-toggle__btn${inputMode === "text" ? " catch-mode-toggle__btn--active" : ""}`}
              onClick={() => setInputMode("text")}
            >
              Type
            </button>
          </div>
        )}

        {/* Permission Denied */}
        {isPermissionDenied && (
          <div className="catch-permission">
            <div className="catch-permission__icon">🎙️</div>
            <h2 className="catch-permission__title">Microphone Access Needed</h2>
            <p className="catch-permission__text">
              Microphone access is needed to record your catch update. Please
              enable it in your browser settings and try again.
            </p>
            <button
              className="catch-btn catch-btn--primary"
              onClick={() => {
                recorder.setState("idle");
                recorder.startRecording();
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Processing */}
        {phase === "processing" && (
          <div className="catch-processing">
            <div className="catch-processing__spinner" />
            <p className="catch-processing__text">
              {inputMode === "voice" ? "Transcribing & formatting..." : "Formatting..."}
            </p>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="catch-error">
            <div className="catch-error__message">{errorMessage}</div>
            <div className="catch-error__actions">
              {inputMode === "voice" && recorder.blob && (
                <button
                  className="catch-btn catch-btn--primary"
                  onClick={handleRetry}
                >
                  Retry Upload
                </button>
              )}
              <button
                className="catch-btn catch-btn--secondary"
                onClick={handleReRecord}
              >
                {inputMode === "voice" ? "Re-record" : "Try Again"}
              </button>
            </div>
          </div>
        )}

        {/* Mic Button (voice mode: idle + recording + done) */}
        {inputMode === "voice" && (showIdle || isRecording || showDone) && (
          <VoiceMicButton
            state={isRecording ? "recording" : "idle"}
            amplitude={recorder.amplitude}
            timeLeft={recorder.timeLeft}
            onTap={handleMicTap}
          />
        )}

        {/* Text Input (text mode: idle + done) */}
        {inputMode === "text" && (showIdle || showDone) && (
          <div className="catch-text">
            <textarea
              className="catch-text__input"
              placeholder="Type what's fresh today..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={4}
            />
            <p className="catch-text__hint">
              AI will format your text — you can edit before publishing
            </p>
            <button
              className="catch-btn catch-btn--primary catch-text__submit"
              onClick={submitText}
              disabled={!textInput.trim()}
            >
              Format with AI
            </button>
          </div>
        )}

        {/* Publishing */}
        {phase === "publishing" && (
          <div className="catch-processing">
            <div className="catch-processing__spinner" />
            <p className="catch-processing__text">Publishing...</p>
          </div>
        )}

        {/* Review / Edit */}
        {phase === "review" && draft && (
          <div className="catch-review">
            <h2 className="catch-review__title">Review & Edit</h2>
            <div className="catch-review__field">
              <label className="catch-review__label">Headline</label>
              <input
                className="catch-review__input"
                value={draft.headline}
                onChange={(e) => updateDraftHeadline(e.target.value)}
              />
            </div>
            <div className="catch-review__field">
              <label className="catch-review__label">Items</label>
              {draft.items.map((item, i) => (
                <div key={i} className="catch-review__item">
                  <input
                    className="catch-review__input catch-review__input--name"
                    value={item.name}
                    onChange={(e) => updateDraftItem(i, "name", e.target.value)}
                    placeholder="Fish name"
                  />
                  <input
                    className="catch-review__input catch-review__input--note"
                    value={item.note}
                    onChange={(e) => updateDraftItem(i, "note", e.target.value)}
                    placeholder="Description"
                  />
                  <button
                    className="catch-review__remove"
                    onClick={() => removeDraftItem(i)}
                    title="Remove item"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button
                className="catch-btn catch-btn--secondary catch-review__add"
                onClick={addDraftItem}
              >
                + Add Item
              </button>
            </div>
            <div className="catch-review__field">
              <label className="catch-review__label">Summary</label>
              <input
                className="catch-review__input"
                value={draft.summary}
                onChange={(e) => updateDraftSummary(e.target.value)}
              />
            </div>
            <div className="catch-review__actions">
              <button
                className="catch-btn catch-btn--primary"
                onClick={handlePublish}
              >
                Publish
              </button>
              <button
                className="catch-btn catch-btn--secondary"
                onClick={handleReRecord}
              >
                Re-do
              </button>
            </div>
          </div>
        )}

        {/* Done Result */}
        {showDone && result && (
          <div className="catch-result">
            <div className="catch-result__success">&#10003; Catch Updated</div>
            <h2 className="catch-result__headline">{result.headline}</h2>
            <ul className="catch-result__items">
              {result.items.map((item, i) => (
                <li key={i} className="catch-result__item">
                  <span className="catch-result__item-name">{item.name}</span>
                  {" — "}
                  <span className="catch-result__item-note">{item.note}</span>
                </li>
              ))}
            </ul>
            <p className="catch-result__summary">{result.summary}</p>
            <div className="catch-result__actions">
              <button
                className="catch-btn catch-btn--secondary"
                onClick={handleReRecord}
              >
                {inputMode === "voice" ? "Re-record" : "New Update"}
              </button>
              <button
                className="catch-btn catch-btn--outline"
                onClick={handleClearCatch}
              >
                Clear Catch
              </button>
            </div>
          </div>
        )}

        {/* Current Live Catch */}
        {phase !== "processing" && phase !== "publishing" && phase !== "review" && (
          <div className="catch-current">
            <h3 className="catch-current__header">
              Currently showing to customers:
            </h3>
            {currentCatchContent ? (
              <div className="catch-result">
                <h2 className="catch-result__headline">
                  {currentCatchContent.headline}
                </h2>
                <ul className="catch-result__items">
                  {currentCatchContent.items.map((item, i) => (
                    <li key={i} className="catch-result__item">
                      <span className="catch-result__item-name">
                        {item.name}
                      </span>
                      {" — "}
                      <span className="catch-result__item-note">
                        {item.note}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="catch-result__summary">
                  {currentCatchContent.summary}
                </p>
                {showIdle && (
                  <button
                    className="catch-btn catch-btn--outline"
                    onClick={handleClearCatch}
                  >
                    Clear Catch
                  </button>
                )}
              </div>
            ) : (
              <p className="catch-current__empty">
                No catch currently displayed
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
