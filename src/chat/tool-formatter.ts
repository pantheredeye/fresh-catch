/**
 * Template-based formatter for quick-action tool results.
 * Converts raw JSON tool output into readable chat text. No LLM call.
 */

interface CatchItem {
  name: string;
  note: string;
}

interface CatchData {
  headline?: string | null;
  items: CatchItem[];
  summary?: string | null;
}

interface MarketData {
  markets: Array<{
    name: string;
    schedule: string;
    type: string;
    active: boolean;
    locationDetails?: string | null;
    customerInfo?: string | null;
    county?: string | null;
    city?: string | null;
  }>;
}

interface PopupData {
  popups: Array<{
    name: string;
    schedule: string;
    expiresAt?: string | null;
    locationDetails?: string | null;
    county?: string | null;
    city?: string | null;
  }>;
}

export function formatListCatch(json: string): string {
  try {
    const data: CatchData = JSON.parse(json);
    if (!data.items || data.items.length === 0) {
      return "No catch available right now — check back soon!";
    }
    const lines: string[] = [];
    lines.push(data.headline ?? "Here's what's fresh today:");
    for (const item of data.items) {
      lines.push(`• ${item.name}${item.note ? ` — ${item.note}` : ""}`);
    }
    if (data.summary) lines.push(`\n${data.summary}`);
    return lines.join("\n");
  } catch {
    return "No catch available right now — check back soon!";
  }
}

export function formatGetMarkets(json: string): string {
  try {
    const data: MarketData = JSON.parse(json);
    if (!data.markets || data.markets.length === 0) {
      return "No markets listed right now.";
    }
    const lines: string[] = ["Market schedule:"];
    for (const m of data.markets) {
      let line = `• ${m.name} — ${m.schedule}`;
      if (m.locationDetails) line += ` (${m.locationDetails})`;
      lines.push(line);
    }
    return lines.join("\n");
  } catch {
    return "No markets listed right now.";
  }
}

export function formatGetVendorPopups(json: string): string {
  try {
    const data: PopupData = JSON.parse(json);
    if (!data.popups || data.popups.length === 0) {
      return "No upcoming popups right now.";
    }
    const lines: string[] = ["Upcoming popups:"];
    for (const p of data.popups) {
      let line = `• ${p.name} — ${p.schedule}`;
      if (p.locationDetails) line += ` (${p.locationDetails})`;
      lines.push(line);
    }
    return lines.join("\n");
  } catch {
    return "No upcoming popups right now.";
  }
}

const formatters: Record<string, (json: string) => string> = {
  list_catch: formatListCatch,
  get_markets: formatGetMarkets,
  get_vendor_popups: formatGetVendorPopups,
};

export function formatToolResult(tool: string, json: string): string {
  const formatter = formatters[tool];
  if (!formatter) return "Sorry, I couldn't process that request.";
  return formatter(json);
}
