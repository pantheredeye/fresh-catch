"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface QRCodeGeneratorProps {
  url: string;
  size?: number;
}

export function QRCodeGenerator({ url, size = 256 }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 2,
      color: {
        // Canvas pixel colors (not CSS) — QR must stay dark-on-light to scan
        dark: "#0A2540", // var(--color-text-primary)
        light: "#FFFFFF",
      },
    }).catch((err) => setError(err.message));
  }, [url, size]);

  return (
    <div style={{ textAlign: "center" }}>
      {error ? (
        <p
          style={{
            color: "var(--color-status-error)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          {error}
        </p>
      ) : (
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            margin: "0 auto",
            maxWidth: "100%",
            height: "auto",
          }}
        />
      )}
    </div>
  );
}
