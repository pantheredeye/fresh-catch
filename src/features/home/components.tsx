import type { FC } from "hono/jsx";
import type { Market, Vendor } from "@/lib/db";
import type { CatchContent, CatchItem } from "@/features/catch/pipeline";
import { formatPrice, mapsHref, smsHref, telHref, vendorDisplayName, formatPhoneDisplay } from "@/lib/format";
import { formatSchedule } from "@/features/markets/display";
import { Button } from "@/ui/button";
import { SectionHeading } from "@/ui/section-heading";
import { FishArt } from "./fish-art";

export type HeroData = {
  market: Market | null;
  /** True when no market anywhere has structured hours — `market` is just the first active regular market, shown via its free-text `schedule`. */
  scheduleFallback: boolean;
  /** "Next stop" / "Here today" — the orange tag lives up here on the banner, not on the route list below. */
  tag: string | null;
  dateLine: string | null;
  hoursLine: string | null;
};

/** Hero (item 3, shallow band) — name + day/time only; address and directions live in the route list below. */
export const Hero: FC<HeroData> = ({ market, scheduleFallback, tag, dateLine, hoursLine }) => {
  if (!market) {
    return (
      <div class="stack">
        <h1 class="hero-name">No markets posted yet</h1>
        <p class="muted">Check back soon.</p>
      </div>
    );
  }
  return (
    <div class="stack">
      {dateLine ? <p class="hero-date">{dateLine}</p> : null}
      {tag ? <span class="tag">{tag}</span> : null}
      <h1 class="hero-name">{market.name}</h1>
      {hoursLine ? (
        <p class="hero-when">{hoursLine}</p>
      ) : scheduleFallback ? (
        <p class="hero-when">{formatSchedule(market.schedule)}</p>
      ) : null}
    </div>
  );
};

const PIN_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
  </svg>
);

export type SavedPin = { marketId: string; name: string; description: string };

/**
 * Saved band (item 4). Server renders a pin for every market that has a
 * computable occurrence, `hidden` by default; `favorites.js` un-hides the
 * band and hides all but the favorited pins, per the
 * `.favorite-toggle[data-market-id]` contract it already owns.
 */
export const SavedBand: FC<{ pins: SavedPin[] }> = ({ pins }) => (
  <div class="band band-paper saved" hidden id="saved-band">
    <div class="wrap">
      <div class="hdrow hdrow-sm">
        <h2 class="hd hd-sm">Your saved markets</h2>
        <span class="hd-meta" id="saved-count">
          0 saved
        </span>
      </div>
      {pins.map((pin) => (
        <a class="pin" href={`/markets/${pin.marketId}`} data-market-id={pin.marketId} hidden>
          {PIN_ICON}
          <span>
            <b>{pin.name}</b>
            <em>{pin.description}</em>
          </span>
        </a>
      ))}
    </div>
  </div>
);

function requestLabel(item: CatchItem): string {
  return item.priceCents !== undefined
    ? `Request ${item.name}, ${formatPrice(item.priceCents)} a pound`
    : `Request ${item.name}`;
}

const ARROW_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="3.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

/** Splits a label so its last word + the arrow can't wrap apart. */
const WithArrow: FC<{ label: string }> = ({ label }) => {
  const i = label.lastIndexOf(" ");
  return (
    <span>
      {i === -1 ? null : `${label.slice(0, i)} `}
      <span class="nowrap">
        {label.slice(i + 1)}
        {ARROW_ICON}
      </span>
    </span>
  );
};

const FishRow: FC<{ item: CatchItem; position: "first" | "middle" | "last" }> = ({ item, position }) => {
  const rowClass = ["fish", position === "first" ? "first" : "", position === "last" ? "last" : "", item.soldOut ? "out" : ""]
    .filter(Boolean)
    .join(" ");
  const askHref = `/requests/new?type=question&species=${encodeURIComponent(item.name)}`;

  const body = (
    <>
      <FishArt name={item.name} />
      <div class="fbody">
        <h3>
          {item.name}
          {item.soldOut ? <span class="tag tag-muted">Sold out</span> : null}
        </h3>
        {item.soldOut ? (
          <a class="req" href={askHref}>
            <WithArrow label="Ask about it" />
          </a>
        ) : (
          <span class="req">
            <WithArrow label={requestLabel(item)} />
          </span>
        )}
      </div>
      <div class="fside">
        {item.soldOut ? (
          <>
            {item.priceCents !== undefined ? <s class="price">{formatPrice(item.priceCents)}</s> : null}
          </>
        ) : item.priceCents !== undefined ? (
          <span class="price">{formatPrice(item.priceCents)}</span>
        ) : null}
      </div>
    </>
  );

  if (item.soldOut) {
    return <div class={rowClass}>{body}</div>;
  }
  return (
    <a class={rowClass} href={`/requests/new?species=${encodeURIComponent(item.name)}`} aria-label={requestLabel(item)}>
      {body}
    </a>
  );
};

/** True when at least one posted item carries a price — gates the "per pound" label and the call-for-price copy. */
export function hasPrices(content: CatchContent | null): boolean {
  return Boolean(content?.items.some((item) => item.priceCents !== undefined && !item.soldOut));
}

/** Fish board (item 5, sand band) — the weekly list, or a plain notice when nothing's posted. */
export const FishBoard: FC<{ content: CatchContent | null; weekOf: string | null }> = ({ content, weekOf }) => (
  <>
    <SectionHeading title="On ice this week" meta={hasPrices(content) ? "per pound" : undefined} />
    {content && content.items.length > 0 ? (
      <>
        <p class="stamp">{weekOf}. The list is set each Monday.</p>
        <div class="stack-tight">
          {content.items.map((item, index) => (
            <FishRow item={item} position={index === 0 ? "first" : index === content.items.length - 1 ? "last" : "middle"} />
          ))}
        </div>
      </>
    ) : (
      <p class="muted">Check back soon — nothing posted yet this week.</p>
    )}
  </>
);

export type RouteRow = {
  market: Market;
  isPopup: boolean;
  dayLabel: string | null;
  hoursLabel: string | null;
  addressLabel: string | null;
  isToday: boolean;
  todayTag: string | null;
};

/** One stop on the week's route (item 6) — today's row gets `.now` + a tag, per handoff §3's split-control amendment. */
const RouteRowView: FC<{ row: RouteRow; vendor: Vendor | null }> = ({ row, vendor }) => {
  const { market, dayLabel, hoursLabel, addressLabel, isToday, todayTag } = row;
  const name = vendorDisplayName(vendor);
  const hasAddress = Boolean(market.address);
  const hasPhone = Boolean(vendor?.phone);
  return (
    <div class={isToday ? "mk now" : "mk"}>
      {todayTag ? <span class="tag">{todayTag}</span> : null}
      {dayLabel ? <p class="dy">{dayLabel}</p> : null}
      <h3>
        <a href={`/markets/${market.id}`}>{market.name}</a>
      </h3>
      {hoursLabel || market.schedule?.trim() ? <p class="hrs2">{hoursLabel || formatSchedule(market.schedule)}</p> : null}
      {addressLabel ? <p class="addr2">{addressLabel}</p> : null}
      {hasAddress ? (
        <a class="mk-dir" href={mapsHref(market.address!)} aria-label={`Directions to ${market.name}`}>
          Directions →
        </a>
      ) : null}
      {hasPhone ? (
        <Button variant="secondary" href={telHref(vendor!.phone!)}>
          Call {name} about {market.name}
        </Button>
      ) : null}
    </div>
  );
};

export const RouteBand: FC<{ rows: RouteRow[]; vendor: Vendor | null }> = ({ rows, vendor }) => {
  const popups = rows.filter((row) => row.isPopup);
  const markets = rows.filter((row) => !row.isPopup);
  return (
    <>
      {popups.length > 0 ? (
        <>
          <SectionHeading title="Popups" meta={`${popups.length} live`} />
          {popups.map((row) => (
            <RouteRowView row={row} vendor={vendor} />
          ))}
          <p>
            <a href="/markets/past">Past popups →</a>
          </p>
        </>
      ) : null}
      <SectionHeading title="Our markets" meta={`${markets.length} stop${markets.length === 1 ? "" : "s"}`} />
      {markets.length === 0 ? (
        <p class="muted">No markets posted yet.</p>
      ) : (
        markets.map((row) => <RouteRowView row={row} vendor={vendor} />)
      )}
    </>
  );
};

/** Request fallback copy shared by ClosingBand and CallCard — phone set → call/text, else a request button. */
function holdCopy(hasPhone: boolean, priced: boolean): string {
  const lead = hasPhone ? (priced ? "Call or text." : "Call/text for price.") : priced ? "Send a request." : "Ask for a price.";
  return `${lead} We'll touch base on availability and pickup.`;
}

/** Closing band (item 7, deep) — mobile-only CTA; desktop shows the CallCard instead. */
export const ClosingBand: FC<{ vendor: Vendor | null; priced: boolean }> = ({ vendor, priced }) => (
  <>
    <h2>Want one held?</h2>
    <p>{holdCopy(Boolean(vendor?.phone), priced)}</p>
    {vendor?.phone ? (
      <>
        <Button href={telHref(vendor.phone)}>Call {formatPhoneDisplay(vendor.phone)}</Button>
        <Button variant="secondary" href={smsHref(vendor.phone)}>
          Text {formatPhoneDisplay(vendor.phone)}
        </Button>
      </>
    ) : (
      <Button href="/requests/new">Request a hold</Button>
    )}
  </>
);

/** Desktop-only (≥1024) CTA card in the sticky right column — replaces the mobile ActionBar and closing band; hidden below via CSS. */
export const CallCard: FC<{ vendor: Vendor | null; priced: boolean }> = ({ vendor, priced }) => {
  if (!vendor?.phone) {
    return (
      <div class="card call-card">
        <h2 class="hd hd-sm">Want one held?</h2>
        <p class="muted">{holdCopy(false, priced)}</p>
        <Button href="/requests/new">Request a hold</Button>
      </div>
    );
  }
  return (
    <div class="card call-card">
      <h2 class="hd hd-sm">Want one held?</h2>
      <p class="muted">{priced ? "Call or text." : "Call/text for price."}</p>
      <Button href={telHref(vendor.phone)}>Call {formatPhoneDisplay(vendor.phone)}</Button>
      <Button variant="secondary" href={smsHref(vendor.phone)}>
        Text {formatPhoneDisplay(vendor.phone)}
      </Button>
    </div>
  );
};
