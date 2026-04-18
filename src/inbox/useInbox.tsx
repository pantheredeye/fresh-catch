"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ConversationRow {
  id: string;
  customerName: string;
  customerPhone: string | null;
  status: string;
  lastMessagePreview: string | null;
  lastMessageSenderType: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface InboxState {
  unreadCount: number;
  conversations: ConversationRow[];
  connected: boolean;
}

const InboxContext = createContext<InboxState | null>(null);

export function InboxProvider({
  organizationId,
  children,
}: {
  organizationId: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<InboxState>({
    unreadCount: 0,
    conversations: [],
    connected: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);

  useEffect(() => {
    let stopped = false;

    function connect() {
      if (stopped) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws/inbox/${organizationId}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        reconnectDelayRef.current = 1000;
        setState((s) => ({ ...s, connected: true }));
      });

      ws.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "inbox") {
          setState({
            unreadCount: data.unreadCount,
            conversations: data.conversations,
            connected: true,
          });
        }
      });

      ws.addEventListener("close", () => {
        wsRef.current = null;
        setState((s) => ({ ...s, connected: false }));
        if (stopped) return;
        const delay = reconnectDelayRef.current;
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(delay * 2, 30000);
          connect();
        }, delay);
      });

      ws.addEventListener("error", () => ws.close());
    }

    connect();

    return () => {
      stopped = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [organizationId]);

  return (
    <InboxContext.Provider value={state}>
      {children}
    </InboxContext.Provider>
  );
}

export function useInbox(): InboxState {
  const ctx = useContext(InboxContext);
  if (!ctx) {
    throw new Error("useInbox must be used within InboxProvider");
  }
  return ctx;
}
