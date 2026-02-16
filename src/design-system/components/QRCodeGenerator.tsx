"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "../Button";

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
        dark: "#0A2540", // var(--deep-navy)
        light: "#FFFFFF",
      },
    }).catch((err) => setError(err.message));
  }, [url, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");
    link.download = "fresh-catch-qr.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div style={{ textAlign: "center" }}>
      {error ? (
        <p style={{ color: "var(--color-action-secondary)", fontSize: "14px" }}>{error}</p>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            style={{ display: "block", margin: "0 auto" }}
          />
          <div style={{ marginTop: "var(--space-md)" }}>
            <Button onClick={handleDownload} variant="primary">
              Download QR Code
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
