"use client";

interface QuickAction {
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  /** If set, navigate instead of sending WS message */
  href?: string;
  /** Optimistic message shown as customer bubble */
  optimisticText?: string;
  disabled?: boolean;
  /** If true, triggers onAskAi instead of onAction */
  isAskAi?: boolean;
  variant?: "default" | "coral";
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "What's fresh?",
    tool: "list_catch",
    args: {},
    optimisticText: "What's fresh today?",
  },
  {
    label: "Market schedule",
    tool: "get_markets",
    args: { activeOnly: true },
    optimisticText: "What's the market schedule?",
  },
  {
    label: "Upcoming popups",
    tool: "get_vendor_popups",
    args: {},
    optimisticText: "Any upcoming popups?",
  },
  {
    label: "Place an order",
    href: "/orders/new",
    variant: "coral",
  },
  {
    label: "Ask AI",
    isAskAi: true,
  },
];

interface ChatQuickActionsProps {
  onAction: (tool: string, args: Record<string, unknown>, optimisticText: string) => void;
  onAskAi?: () => void;
}

export function ChatQuickActions({ onAction, onAskAi }: ChatQuickActionsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-sm)",
        overflowX: "auto",
        scrollbarWidth: "none",
        padding: "var(--space-sm) var(--space-md)",
        flexShrink: 0,
      }}
    >
      <style>{`
        .chat-quick-actions-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      {QUICK_ACTIONS.map((action) => {
        if (action.href) {
          return (
            <a
              key={action.label}
              href={action.href}
              style={{
                ...pillStyle,
                background: "var(--color-action-secondary)",
                color: "var(--color-text-inverse)",
                textDecoration: "none",
              }}
            >
              {action.label}
            </a>
          );
        }

        return (
          <button
            key={action.label}
            disabled={action.disabled}
            onClick={() => {
              if (action.isAskAi && onAskAi) {
                onAskAi();
              } else if (action.tool && !action.disabled) {
                onAction(action.tool, action.args ?? {}, action.optimisticText ?? action.label);
              }
            }}
            style={{
              ...pillStyle,
              ...(action.disabled
                ? {
                    opacity: 0.5,
                    cursor: "default",
                  }
                : {
                    cursor: "pointer",
                  }),
            }}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

const pillStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  padding: "var(--space-xs) var(--space-md)",
  borderRadius: "var(--radius-full)",
  background: "var(--color-surface-secondary)",
  color: "var(--color-text-primary)",
  border: "1px solid var(--color-border-subtle)",
  fontSize: "var(--font-size-sm)",
  fontFamily: "inherit",
  lineHeight: 1.4,
  flexShrink: 0,
};
