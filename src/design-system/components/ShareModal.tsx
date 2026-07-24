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
  onShareAction?: (shareType: "link" | "facebook" | "twitter" | "whatsapp") => void;
}

const sectionLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--font-size-sm)",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  marginBottom: "var(--space-xs)",
};

const socialLinkStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "44px",
  padding: "var(--space-xs) var(--space-sm)",
  background: "var(--color-surface-secondary)",
  color: "var(--color-text-primary)",
  border: "1px solid var(--color-border-light)",
  borderRadius: "var(--radius-md)",
  textAlign: "center",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "var(--font-size-sm)",
};

export function ShareModal({
  isOpen,
  onClose,
  shareUrl,
  title,
  description,
  onShareAction,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

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

  // Detect the native share sheet after mount (SSR-safe)
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  if (!isOpen) return null;

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, url: shareUrl });
      onShareAction?.("link");
    } catch {
      // User dismissed the share sheet — nothing to do
    }
  };

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

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--color-surface-overlay)",
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
          background: "var(--color-surface-primary)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
          zIndex: 1001,
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "var(--space-md)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--space-xs)",
            }}
          >
            <h2
              style={{
                fontSize: "var(--font-size-2xl)",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                margin: 0,
                fontFamily: "var(--font-display)",
              }}
            >
              Share {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "44px",
                height: "44px",
                flexShrink: 0,
                background: "none",
                border: "none",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--font-size-2xl)",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
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
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              margin: 0,
            }}
          >
            {description}
          </p>
        </div>

        {/* Native Share Sheet (when supported) */}
        {canNativeShare && (
          <div style={{ marginBottom: "var(--space-lg)" }}>
            <Button onClick={handleNativeShare} variant="primary" fullWidth>
              Share…
            </Button>
          </div>
        )}

        {/* Copy Link Section */}
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <label style={sectionLabelStyle}>Share Link</label>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-sm)",
            }}
          >
            <input
              type="text"
              value={shareUrl}
              readOnly
              style={{
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                padding: "var(--space-sm) var(--space-md)",
                border: "1px solid var(--color-border-medium)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
                background: "var(--color-surface-secondary)",
                color: "var(--color-text-primary)",
              }}
            />
            <Button onClick={handleCopyLink} variant="primary" fullWidth>
              {copied ? "✓ Copied!" : "Copy Link"}
            </Button>
          </div>
        </div>

        {/* Social Media Section */}
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <label style={sectionLabelStyle}>Share on Social Media</label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-sm)",
            }}
          >
            <a
              href={socialUrls.facebook}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleSocialClick("facebook")}
              style={socialLinkStyle}
            >
              Facebook
            </a>
            <a
              href={socialUrls.twitter}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleSocialClick("twitter")}
              style={socialLinkStyle}
            >
              Twitter
            </a>
            <a
              href={socialUrls.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleSocialClick("whatsapp")}
              style={socialLinkStyle}
            >
              WhatsApp
            </a>
          </div>
        </div>

        {/* QR Code Section */}
        <div>
          <label style={sectionLabelStyle}>QR Code</label>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-sm)",
              background: "var(--color-surface-secondary)",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-md)",
            }}
          >
            <QRCodeGenerator url={shareUrl} size={240} />
            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-secondary)",
                margin: 0,
                textAlign: "center",
              }}
            >
              Point your camera at the code to open
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
