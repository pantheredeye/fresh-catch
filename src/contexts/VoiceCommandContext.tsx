"use client";

import { createContext, useContext } from "react";

interface VoiceCommandContextValue {
  openCommandBar: () => void;
}

const VoiceCommandContext = createContext<VoiceCommandContextValue | null>(null);

export function VoiceCommandProvider({
  onOpen,
  children,
}: {
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <VoiceCommandContext.Provider value={{ openCommandBar: onOpen }}>
      {children}
    </VoiceCommandContext.Provider>
  );
}

export function useVoiceCommand() {
  const ctx = useContext(VoiceCommandContext);
  if (!ctx) throw new Error("useVoiceCommand must be used within VoiceCommandProvider");
  return ctx;
}
