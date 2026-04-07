"use client";

import { useEffect, useCallback } from "react";
import type { VoiceCommandResult } from "@/api/voice-tools";
import "./query-result-overlay.css";

interface QueryResultOverlayProps {
  result: VoiceCommandResult;
  onDismiss: () => void;
}

export function QueryResultOverlay({ result, onDismiss }: QueryResultOverlayProps) {
  const { intent, interpretation, queryResult, rawTranscript } = result;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onDismiss]);

  const renderBody = useCallback(() => {
    if (!queryResult) {
      return <p className="qr-interpretation">{interpretation}</p>;
    }

    switch (intent) {
      case "list_catch":
        return <CatchResult data={queryResult} />;
      case "get_markets":
        return <MarketsResult data={queryResult} />;
      case "get_vendor_popups":
        return <PopupsResult data={queryResult} />;
      case "get_market_vendors":
        return <VendorsResult data={queryResult} />;
      case "get_order_status":
        return <OrderStatusResult data={queryResult} />;
      case "get_county_vendors":
        return <CountyVendorsResult data={queryResult} />;
      case "get_vendor_market_location":
        return <VendorLocationResult data={queryResult} />;
      default:
        return <GenericResult data={queryResult} interpretation={interpretation} />;
    }
  }, [intent, queryResult, interpretation]);

  return (
    <div className="qr-overlay" onClick={onDismiss}>
      <div className="qr-panel" onClick={(e) => e.stopPropagation()}>
        <div className="qr-header">
          <span className="qr-transcript">{rawTranscript}</span>
          <button className="qr-close" onClick={onDismiss} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="qr-body">{renderBody()}</div>
        <button className="qr-dismiss" onClick={onDismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}

// --- Per-intent result renderers ---

function CatchResult({ data }: { data: Record<string, unknown> }) {
  const items = data.items as Array<{ name: string; note: string }> | undefined;
  const headline = data.headline as string | null;
  const summary = data.summary as string | null;

  if (!items || items.length === 0) {
    return <p className="qr-empty">No catch posted today.</p>;
  }

  return (
    <div className="qr-catch">
      {headline && <h3 className="qr-catch-headline">{headline}</h3>}
      <ul className="qr-catch-list">
        {items.map((item, i) => (
          <li key={i} className="qr-catch-item">
            <span className="qr-catch-name">{item.name}</span>
            {item.note && <span className="qr-catch-note">{item.note}</span>}
          </li>
        ))}
      </ul>
      {summary && <p className="qr-catch-summary">{summary}</p>}
    </div>
  );
}

function MarketsResult({ data }: { data: Record<string, unknown> }) {
  const markets = data.markets as Array<{
    name: string;
    schedule: string;
    type: string;
    active: boolean;
    county?: string;
    city?: string;
  }> | undefined;

  if (!markets || markets.length === 0) {
    return <p className="qr-empty">No markets found.</p>;
  }

  return (
    <ul className="qr-market-list">
      {markets.map((m, i) => (
        <li key={i} className="qr-market-item">
          <div className="qr-market-name">
            {m.name}
            {m.type === "popup" && <span className="qr-badge-popup">Popup</span>}
          </div>
          <div className="qr-market-schedule">{m.schedule}</div>
          {m.county && <div className="qr-market-location">{m.city ? `${m.city}, ${m.county}` : m.county}</div>}
        </li>
      ))}
    </ul>
  );
}

function PopupsResult({ data }: { data: Record<string, unknown> }) {
  const popups = data.popups as Array<{
    name: string;
    schedule: string;
    expiresAt: string | null;
    locationDetails: string | null;
    county?: string;
    city?: string;
  }> | undefined;

  if (!popups || popups.length === 0) {
    return <p className="qr-empty">No upcoming popups.</p>;
  }

  return (
    <ul className="qr-popup-list">
      {popups.map((p, i) => (
        <li key={i} className="qr-popup-item">
          <div className="qr-popup-name">{p.name}</div>
          <div className="qr-popup-schedule">{p.schedule}</div>
          {p.expiresAt && (
            <div className="qr-popup-expires">
              Until {new Date(p.expiresAt).toLocaleDateString()}
            </div>
          )}
          {p.locationDetails && <div className="qr-popup-location">{p.locationDetails}</div>}
        </li>
      ))}
    </ul>
  );
}

function VendorsResult({ data }: { data: Record<string, unknown> }) {
  const marketName = data.marketName as string | undefined;
  const vendors = data.vendors as Array<{ name: string; slug: string }> | undefined;

  if (!vendors || vendors.length === 0) {
    return <p className="qr-empty">No vendors found at this market.</p>;
  }

  return (
    <div className="qr-vendors">
      {marketName && <h3 className="qr-vendors-title">Vendors at {marketName}</h3>}
      <ul className="qr-vendor-list">
        {vendors.map((v, i) => (
          <li key={i} className="qr-vendor-item">{v.name}</li>
        ))}
      </ul>
    </div>
  );
}

function OrderStatusResult({ data }: { data: Record<string, unknown> }) {
  if (!data.found) {
    return <p className="qr-empty">{(data.message as string) || "No order found."}</p>;
  }

  return (
    <div className="qr-order">
      <div className="qr-order-row">
        <span className="qr-order-label">Order</span>
        <span className="qr-order-value">#{data.orderNumber as number}</span>
      </div>
      <div className="qr-order-row">
        <span className="qr-order-label">Status</span>
        <span className="qr-order-status">{data.status as string}</span>
      </div>
      {typeof data.contactName === "string" && (
        <div className="qr-order-row">
          <span className="qr-order-label">Name</span>
          <span className="qr-order-value">{data.contactName}</span>
        </div>
      )}
      {typeof data.preferredDate === "string" && (
        <div className="qr-order-row">
          <span className="qr-order-label">Pickup</span>
          <span className="qr-order-value">
            {new Date(data.preferredDate).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}

function CountyVendorsResult({ data }: { data: Record<string, unknown> }) {
  const county = data.county as string;
  const vendors = data.vendors as Array<{ name: string; slug: string; type: string }> | undefined;

  if (!vendors || vendors.length === 0) {
    return <p className="qr-empty">No vendors found in {county}.</p>;
  }

  return (
    <div className="qr-vendors">
      <h3 className="qr-vendors-title">Vendors in {county}</h3>
      <ul className="qr-vendor-list">
        {vendors.map((v, i) => (
          <li key={i} className="qr-vendor-item">{v.name}</li>
        ))}
      </ul>
    </div>
  );
}

function VendorLocationResult({ data }: { data: Record<string, unknown> }) {
  const vendorName = data.vendorName as string;
  const marketName = data.marketName as string;
  const location = data.location as string | null;

  return (
    <div className="qr-location">
      <h3 className="qr-location-title">{vendorName} at {marketName}</h3>
      {location ? (
        <p className="qr-location-details">{location}</p>
      ) : (
        <p className="qr-empty">No location details available.</p>
      )}
      {typeof data.schedule === "string" && <p className="qr-location-schedule">{data.schedule}</p>}
    </div>
  );
}

function GenericResult({ data, interpretation }: { data: Record<string, unknown>; interpretation: string }) {
  return (
    <div className="qr-generic">
      <p className="qr-interpretation">{interpretation}</p>
      {Object.entries(data).length > 0 && (
        <div className="qr-generic-data">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="qr-generic-row">
              <span className="qr-generic-key">{key}</span>
              <span className="qr-generic-value">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
