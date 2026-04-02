"use client";

import type { VoiceRecorderState } from "@/hooks/useVoiceRecorder";
import "./voice-mic.css";

interface VoiceMicButtonProps {
  state: VoiceRecorderState;
  amplitude: number;
  timeLeft: number;
  onTap: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMicButton({
  state,
  amplitude,
  timeLeft,
  onTap,
}: VoiceMicButtonProps) {
  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  return (
    <div className="voice-mic">
      <button
        className={`voice-mic__button${
          isRecording ? " voice-mic__button--recording" : ""
        }${isProcessing ? " voice-mic__button--processing" : ""}`}
        onClick={onTap}
        disabled={isProcessing}
        style={
          isRecording
            ? {
                boxShadow: `0 0 ${20 + amplitude * 40}px ${
                  8 + amplitude * 20
                }px rgba(255, 107, 107, ${0.3 + amplitude * 0.5})`,
              }
            : undefined
        }
      >
        <span
          className={`voice-mic__ring${
            isRecording ? " voice-mic__ring--active" : ""
          }`}
        />
        {isProcessing ? (
          <span className="voice-mic__spinner" />
        ) : isRecording ? (
          "⏹️"
        ) : (
          "🎙️"
        )}
      </button>

      {isRecording && (
        <div className="voice-mic__timer">{formatTime(timeLeft)}</div>
      )}

      {state === "idle" && (
        <p className="voice-mic__label">Tap to record</p>
      )}
      {isRecording && (
        <p className="voice-mic__label">Recording... Tap to stop</p>
      )}
      {state === "error" && (
        <p className="voice-mic__label voice-mic__label--error">
          Something went wrong
        </p>
      )}
      {state === "permission-denied" && (
        <p className="voice-mic__label voice-mic__label--error">
          Microphone access needed
        </p>
      )}
    </div>
  );
}
