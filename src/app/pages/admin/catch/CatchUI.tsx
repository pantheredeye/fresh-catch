"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/design-system";
import { clearCatch, publishCatch } from "./catch-functions";
import "./catch.css";

type InputMode = "voice" | "text";

type CatchState =
  | "idle"
  | "recording"
  | "processing"
  | "review"
  | "publishing"
  | "done"
  | "error"
  | "permission-denied";

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

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const types = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/webm",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "audio/webm";
}

export function CatchUI({ currentCatch }: CatchUIProps) {
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const [state, setState] = useState<CatchState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<CatchContent | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [amplitude, setAmplitude] = useState(0);
  const [liveCatch, setLiveCatch] = useState(currentCatch);
  const [textInput, setTextInput] = useState("");
  const [draft, setDraft] = useState<CatchContent | null>(null);
  const [rawTranscript, setRawTranscript] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const uploadAudio = useCallback(async (blob: Blob) => {
    setState("processing");

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
      setState("review");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Upload failed"
      );
      setState("error");
    }
  }, []);

  const submitText = useCallback(async () => {
    if (!textInput.trim()) return;
    setState("processing");

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
      setState("review");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Submit failed"
      );
      setState("error");
    }
  }, [textInput]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startAmplitudeLoop = useCallback(() => {
    const tick = () => {
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
      setAmplitude(avg / 255);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      // Set up audio analysis
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        cleanup();
        uploadAudio(blob);
      };

      recorder.start(1000); // collect in 1s chunks

      // Countdown timer
      setTimeLeft(120);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      startAmplitudeLoop();
      setState("recording");
    } catch (err) {
      cleanup();
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setState("permission-denied");
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to access microphone"
        );
        setState("error");
      }
    }
  }, [cleanup, uploadAudio, stopRecording, startAmplitudeLoop]);

  const handleMicClick = useCallback(() => {
    if (state === "recording") {
      stopRecording();
    } else if (state === "idle" || state === "done") {
      blobRef.current = null;
      setResult(null);
      startRecording();
    }
  }, [state, stopRecording, startRecording]);

  const handleRetry = useCallback(() => {
    if (blobRef.current) {
      uploadAudio(blobRef.current);
    }
  }, [uploadAudio]);

  const handleReRecord = useCallback(() => {
    blobRef.current = null;
    setResult(null);
    setDraft(null);
    setRawTranscript("");
    setErrorMessage("");
    setState("idle");
  }, []);

  const handleClearCatch = useCallback(async () => {
    const res = await clearCatch();
    if (res.success) {
      setLiveCatch(null);
      setResult(null);
      setState("idle");
    }
  }, []);

  const handleRetryPermission = useCallback(() => {
    setState("idle");
    startRecording();
  }, [startRecording]);

  const handlePublish = useCallback(async () => {
    if (!draft) return;
    setState("publishing");
    try {
      const res = await publishCatch(draft, rawTranscript);
      if (res.success) {
        setResult(draft);
        setLiveCatch(null);
        setDraft(null);
        setState("done");
      } else {
        setErrorMessage(res.error || "Publish failed");
        setState("error");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Publish failed");
      setState("error");
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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

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
        {(state === "idle" || state === "done") && (
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
        {state === "permission-denied" && (
          <div className="catch-permission">
            <div className="catch-permission__icon">🎙️</div>
            <h2 className="catch-permission__title">Microphone Access Needed</h2>
            <p className="catch-permission__text">
              Microphone access is needed to record your catch update. Please
              enable it in your browser settings and try again.
            </p>
            <button
              className="catch-btn catch-btn--primary"
              onClick={handleRetryPermission}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Processing */}
        {state === "processing" && (
          <div className="catch-processing">
            <div className="catch-processing__spinner" />
            <p className="catch-processing__text">
              {inputMode === "voice" ? "Transcribing & formatting..." : "Formatting..."}
            </p>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="catch-error">
            <div className="catch-error__message">{errorMessage}</div>
            <div className="catch-error__actions">
              {inputMode === "voice" && blobRef.current && (
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
        {inputMode === "voice" && (state === "idle" || state === "recording" || state === "done") && (
          <div className="catch-mic">
            <button
              className={`catch-mic__button ${
                state === "recording" ? "catch-mic__button--recording" : ""
              }`}
              onClick={handleMicClick}
              style={
                state === "recording"
                  ? {
                      boxShadow: `0 0 ${20 + amplitude * 40}px ${
                        8 + amplitude * 20
                      }px rgba(255, 107, 107, ${0.3 + amplitude * 0.5})`,
                    }
                  : undefined
              }
            >
              <span className={`catch-mic__ring${state === "recording" ? " catch-mic__ring--recording" : ""}`} />
              {state === "recording" ? "⏹️" : "🎙️"}
            </button>

            {state === "recording" && (
              <>
                <div className="catch-mic__timer">{formatTime(timeLeft)}</div>
                <p className="catch-mic__label">Recording... Tap to stop</p>
              </>
            )}

            {state === "idle" && (
              <p className="catch-mic__label">Tap to record — you can edit before publishing</p>
            )}
          </div>
        )}

        {/* Text Input (text mode: idle + done) */}
        {inputMode === "text" && (state === "idle" || state === "done") && (
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
        {state === "publishing" && (
          <div className="catch-processing">
            <div className="catch-processing__spinner" />
            <p className="catch-processing__text">Publishing...</p>
          </div>
        )}

        {/* Review / Edit */}
        {state === "review" && draft && (
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
        {state === "done" && result && (
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
        {state !== "processing" && state !== "publishing" && state !== "review" && (
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
                {state === "idle" && (
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
