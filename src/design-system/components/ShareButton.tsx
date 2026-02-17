"use client";
import { useState } from "react";
import { ShareModal } from "./ShareModal";
import { Button } from "../Button";

interface ShareButtonProps {
  shareUrl: string;
  title: string;
  description?: string;
  variant?: "button" | "icon";
  size?: "sm" | "md" | "lg";
  onShareAction?: (shareType: "link" | "qr" | "facebook" | "twitter" | "whatsapp") => void;
}

export function ShareButton({
  shareUrl,
  title,
  description = "Share this with friends and family",
  variant = "button",
  size = "md",
  onShareAction,
}: ShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            width: size === "sm" ? "40px" : size === "lg" ? "56px" : "48px",
            height: size === "sm" ? "40px" : size === "lg" ? "56px" : "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--color-gradient-primary)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontSize: size === "sm" ? "18px" : size === "lg" ? "24px" : "20px",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.2s ease",
          }}
          title="Share"
        >
          🔗
        </button>
        <ShareModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          shareUrl={shareUrl}
          title={title}
          description={description}
          onShareAction={onShareAction}
        />
      </>
    );
  }

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)} size={size}>
        🔗 Share
      </Button>
      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        shareUrl={shareUrl}
        title={title}
        description={description}
        onShareAction={onShareAction}
      />
    </>
  );
}
