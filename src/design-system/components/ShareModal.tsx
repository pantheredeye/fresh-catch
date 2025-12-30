"use client";
import { useState, useEffect } from "react";
import { QRCodeGenerator } from "./QRCodeGenerator";
import { Button } from "../Button";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  title: string;
  description: string;
  onShareAction?: (shareType: "link" | "qr" | "facebook" | "twitter" | "whatsapp") => void;
}

export function ShareModal({
  isOpen,
  onClose,
  shareUrl,
  title,
  description,
  onShareAction,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onShareAction?.("link");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const socialUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(title + " - " + shareUrl)}`,
  };

  const handleSocialClick = (platform: "facebook" | "twitter" | "whatsapp") => {
    onShareAction?.(platform);
  };

  const handleQRDownload = () => {
    onShareAction?.("qr");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 1000,
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "var(--surface-primary)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-xl)",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
          zIndex: 1001,
          boxShadow: "var(--shadow-lg)",
          border: "1px solid rgba(0,102,204,0.1)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--space-sm)",
            }}
          >
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "var(--deep-navy)",
                margin: 0,
                fontFamily: "var(--font-display)",
              }}
            >
              Share {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "var(--cool-gray)",
                padding: 0,
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p
            style={{
              fontSize: "14px",
              color: "var(--cool-gray)",
              margin: 0,
            }}
          >
            {description}
          </p>
        </div>

        {/* Copy Link Section */}
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--deep-navy)",
              marginBottom: "var(--space-xs)",
            }}
          >
            Share Link
          </label>
          <div
            style={{
              display: "flex",
              gap: "var(--space-sm)",
            }}
          >
            <input
              type="text"
              value={shareUrl}
              readOnly
              style={{
                flex: 1,
                padding: "var(--space-sm) var(--space-md)",
                border: "1px solid rgba(0,102,204,0.2)",
                borderRadius: "var(--radius-md)",
                fontSize: "14px",
                background: "var(--surface-secondary)",
                color: "var(--text-primary)",
              }}
            />
            <Button onClick={handleCopyLink} variant="primary">
              {copied ? "✓ Copied!" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Social Media Section */}
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--deep-navy)",
              marginBottom: "var(--space-sm)",
            }}
          >
            Share on Social Media
          </label>
          <div
            style={{
              display: "flex",
              gap: "var(--space-sm)",
              justifyContent: "center",
            }}
          >
            <a
              href={socialUrls.facebook}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleSocialClick("facebook")}
              style={{
                flex: 1,
                padding: "var(--space-md)",
                background: "#1877F2",
                color: "white",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Facebook
            </a>
            <a
              href={socialUrls.twitter}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleSocialClick("twitter")}
              style={{
                flex: 1,
                padding: "var(--space-md)",
                background: "#1DA1F2",
                color: "white",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Twitter
            </a>
            <a
              href={socialUrls.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleSocialClick("whatsapp")}
              style={{
                flex: 1,
                padding: "var(--space-md)",
                background: "#25D366",
                color: "white",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              WhatsApp
            </a>
          </div>
        </div>

        {/* QR Code Section */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--deep-navy)",
              marginBottom: "var(--space-sm)",
            }}
          >
            QR Code
          </label>
          <div onClick={handleQRDownload}>
            <QRCodeGenerator url={shareUrl} size={240} />
          </div>
        </div>
      </div>
    </>
  );
}
