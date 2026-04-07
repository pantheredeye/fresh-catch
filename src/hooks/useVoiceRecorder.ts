"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type VoiceRecorderState =
  | "idle"
  | "recording"
  | "processing"
  | "done"
  | "error"
  | "permission-denied";

interface UseVoiceRecorderOptions {
  maxDuration?: number; // seconds, default 120
  onAudioReady: (blob: Blob) => void | Promise<void>;
}

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/mp4";
  const types = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/webm",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  // Safari fallback — mp4 is most likely supported even if isTypeSupported lies
  return "audio/mp4";
}

export function useVoiceRecorder({
  maxDuration = 120,
  onAudioReady,
}: UseVoiceRecorderOptions) {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [amplitude, setAmplitude] = useState(0);
  const [timeLeft, setTimeLeft] = useState(maxDuration);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const onAudioReadyRef = useRef(onAudioReady);
  onAudioReadyRef.current = onAudioReady;

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

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

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
        onAudioReadyRef.current(blob);
      };

      recorder.start(1000);

      setTimeLeft(maxDuration);
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
        setState("error");
      }
    }
  }, [cleanup, maxDuration, stopRecording, startAmplitudeLoop]);

  const retryUpload = useCallback(() => {
    if (blobRef.current) {
      onAudioReadyRef.current(blobRef.current);
    }
  }, []);

  return {
    state,
    setState,
    amplitude,
    timeLeft,
    startRecording,
    stopRecording,
    retryUpload,
    blob: blobRef.current,
  };
}
