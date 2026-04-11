"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { VoiceMicButton } from "@/components/VoiceMicButton";
import type { VoiceCommandResult } from "@/api/voice-tools";
import "./command-bar.css";

type InputMode = "voice" | "text";

const HINT_CONTEXTS: Record<string, string[]> = {
  catch: ["what's fresh today", "update the catch"],
  markets: ["add market", "create popup", "update details"],
  customer: ["what's fresh today", "check my order", "market hours"],
  default: ["update catch", "add market", "create popup"],
};

interface CommandBarProps {
  onResult: (result: VoiceCommandResult) => void;
  hintContext?: string;
  /** Target organization for voice commands (e.g. vendor being browsed) */
  targetOrgId?: string;
  /** Controlled open state */
  isOpen: boolean;
  /** Called when the sheet wants to close */
  onClose: () => void;
}

export function CommandBar({ onResult, hintContext, targetOrgId, isOpen, onClose }: CommandBarProps) {
  const open = isOpen;
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const [textInput, setTextInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const hints = HINT_CONTEXTS[hintContext ?? "default"] ?? HINT_CONTEXTS.default;

  const voiceUrl = targetOrgId
    ? `/api/voice/command?targetOrgId=${encodeURIComponent(targetOrgId)}`
    : "/api/voice/command";

  const uploadAudio = useCallback(
    async (blob: Blob) => {
      setProcessing(true);
      setError(null);
      try {
        const buffer = await blob.arrayBuffer();
        const response = await fetch(voiceUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: buffer,
        });
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        const result = (await response.json()) as VoiceCommandResult;
        onResult(result);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setProcessing(false);
      }
    },
    [onResult, voiceUrl],
  );

  const recorder = useVoiceRecorder({ onAudioReady: uploadAudio });

  const submitText = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? textInput).trim();
    if (!text) return;
    setProcessing(true);
    setError(null);
    try {
      const response = await fetch(voiceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const result = (await response.json()) as VoiceCommandResult;
      if (!overrideText) setTextInput("");
      onResult(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setProcessing(false);
    }
  }, [textInput, onResult, voiceUrl]);

  const handleMicTap = useCallback(() => {
    if (recorder.state === "recording") {
      recorder.stopRecording();
    } else {
      recorder.setState("idle");
      recorder.startRecording();
    }
  }, [recorder]);

  const handleClose = useCallback(() => {
    if (recorder.state === "recording") {
      recorder.stopRecording();
    }
    recorder.setState("idle");
    setProcessing(false);
    setError(null);
    onClose();
  }, [recorder]);

  // Reset recorder when sheet closes
  useEffect(() => {
    if (!open) {
      recorder.setState("idle");
    }
  }, [open]);

  // Escape key closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  const handleHintClick = (hint: string) => {
    if (inputMode === "voice") {
      submitText(hint);
    } else {
      setTextInput(hint);
    }
  };

  const isRecording = recorder.state === "recording";
  const showVoice = inputMode === "voice" && !processing;
  const showText = inputMode === "text" && !processing;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`command-bar__backdrop${open ? " command-bar__backdrop--open" : ""}`}
        onClick={handleClose}
      />

      {/* Half-sheet */}
      <div
        ref={sheetRef}
        className={`command-bar__sheet${open ? " command-bar__sheet--open" : ""}`}
      >
        <div className="command-bar__handle" />
        <div className="command-bar__content">
          {/* Mode toggle */}
          {!processing && (
            <div className="command-bar__mode-toggle">
              <button
                className={`command-bar__mode-btn${inputMode === "voice" ? " command-bar__mode-btn--active" : ""}`}
                onClick={() => setInputMode("voice")}
              >
                Voice
              </button>
              <button
                className={`command-bar__mode-btn${inputMode === "text" ? " command-bar__mode-btn--active" : ""}`}
                onClick={() => setInputMode("text")}
              >
                Type
              </button>
            </div>
          )}

          {/* Processing */}
          {processing && (
            <div className="command-bar__processing">
              <div className="command-bar__spinner" />
              <p className="command-bar__processing-text">
                {inputMode === "voice" ? "Transcribing..." : "Processing..."}
              </p>
            </div>
          )}

          {/* Error */}
          {error && !processing && (
            <div className="command-bar__error">
              <p>{error}</p>
              <button
                className="command-bar__error-dismiss"
                onClick={() => setError(null)}
              >
                Try again
              </button>
            </div>
          )}

          {/* Voice mode */}
          {showVoice && (
            <VoiceMicButton
              state={isRecording ? "recording" : "idle"}
              amplitude={recorder.amplitude}
              timeLeft={recorder.timeLeft}
              onTap={handleMicTap}
            />
          )}

          {/* Text mode */}
          {showText && (
            <div className="command-bar__text-area">
              <textarea
                className="command-bar__textarea"
                placeholder={hints[0] ?? "What would you like to do?"}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitText();
                  }
                }}
              />
              <button
                className="command-bar__submit"
                onClick={() => submitText()}
                disabled={!textInput.trim()}
              >
                Send
              </button>
            </div>
          )}

          {/* Hint chips */}
          {!processing && !isRecording && (
            <div className="command-bar__hints">
              {hints.map((hint) => (
                <button
                  key={hint}
                  className="command-bar__hint"
                  onClick={() => handleHintClick(hint)}
                >
                  {hint}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
