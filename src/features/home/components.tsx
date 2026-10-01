import type { FC } from "hono/jsx";
import type { Market, Vendor } from "@/lib/db";
import type { CatchContent, CatchItem } from "@/features/catch/pipeline";
import { WEEKDAY_NAMES, formatPrice, mapsHref, smsHref, telHref, vendorDisplayName, formatPhoneDisplay } from "@/lib/format";
import { Button } from "@/ui/button";
import { SectionHeading } from "@/ui/section-heading";
import { SplitControl } from "@/ui/split-control";
import { FishArt } from "./fish-art";

export type HeroData = {
  market: Market | null;
  /** True when no market anywhere has structured hours — `market` is just the first active regular market, shown via its free-text `schedule`. */
  scheduleFallback: boolean;
  dateLine: string | null;
  hoursLine: string | null;
  addressLine: string | null;
  then: { weekday: number; market: { name: string } } | null;
};

/** Hero (item 3, shallow band) — the one big answer: where, when, how to get there. */
export const Hero: FC<HeroData & { vendor: Vendor | null }> = ({
  market,
  scheduleFallback,
  dateLine,
  hoursLine,
  addressLine,
  then,
  vendor,
}) => {
  if (!market) {
    return (
      <div class="stack">
        <h1 class="h-display">No markets posted yet</h1>
        <p class="muted">Check back soon.</p>
      </div>
    );
  }
  const name = vendorDisplayName(vendor);
  return (
    <div class="stack">
      {dateLine ? <p class="hero-date">{dateLine}</p> : null}
      <h1 class="h-display">{market.name}</h1>
      {hoursLine ? (
        <p class="hero-hrs">{hoursLine}</p>
      ) : scheduleFallback ? (
        <p class="hero-hrs">{market.schedule}</p>
      ) : null}
      {addressLine ? <p class="hero-addr">{addressLine}</p> : null}
      {then ? (
        <p class="hero-then">
          Then {WEEKDAY_NAMES[then.weekday]}, {then.market.name}.
        </p>
      ) : null}
      {market.address ? <Button href={mapsHref(market.address)}>Directions to {market.name}</Button> : null}
      {vendor?.phone ? (
        <Button variant="secondary" href={telHref(vendor.phone)}>
          Call {name}, {formatPhoneDisplay(vendor.phone)}
        </Button>
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

const FishRow: FC<{ item: CatchItem; position: "first" | "middle" | "last" }> = ({ item, position }) => {
  const rowClass = ["fish", position === "first" ? "first" : "", position === "last" ? "last" : "", item.soldOut ? "out" : ""]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <div class="fbody">
        <h3>{item.name}</h3>
        <p>{item.note}</p>
        {!item.soldOut ? (
          <span class="req">
            {requestLabel(item)} {ARROW_ICON}
          </span>
        ) : null}
      </div>
      <div class="fside">
        {item.soldOut ? (
          <span class="price">Sold out</span>
        ) : item.priceCents !== undefined ? (
          <span class="price">{formatPrice(item.priceCents)}</span>
        ) : null}
        <FishArt name={item.name} />
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
export const FishBoard: FC<{ content: CatchContent | null; weekOf: string | null; vendor: Vendor | null }> = ({
  content,
  weekOf,
  vendor,
}) => (
  <>
    <SectionHeading title="On ice this week" meta={hasPrices(content) ? "per pound" : undefined} />
    {content && content.items.length > 0 ? (
      <>
        <p class="stamp">{weekOf}. {vendorDisplayName(vendor)} sets the list each Monday.</p>
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
  const { market, isPopup, dayLabel, hoursLabel, addressLabel, isToday, todayTag } = row;
  const name = vendorDisplayName(vendor);
  const hasAddress = Boolean(market.address);
  const hasPhone = Boolean(vendor?.phone);
  return (
    <div class={isToday ? "mk now" : "mk"}>
      {isToday && todayTag ? <span class="tag">{todayTag}</span> : null}
      {dayLabel ? <p class="dy">{dayLabel}</p> : null}
      <h3>
        {market.name}
        {isPopup ? " (popup)" : ""}
      </h3>
      {hoursLabel ? <p class="hrs2">{hoursLabel}</p> : <p class="hrs2">{market.schedule}</p>}
      {addressLabel ? <p class="addr2">{addressLabel}</p> : null}
      {hasAddress && hasPhone ? (
        <SplitControl
          items={[
            { href: mapsHref(market.address!), label: "Directions", ariaLabel: `Directions to ${market.name}` },
            { href: telHref(vendor!.phone!), label: `Call ${name}`, ariaLabel: `Call ${name} about ${market.name}` },
          ]}
        />
      ) : hasAddress ? (
        <Button href={mapsHref(market.address!)}>Directions to {market.name}</Button>
      ) : hasPhone ? (
        <Button variant="secondary" href={telHref(vendor!.phone!)}>
          Call {name} about {market.name}
        </Button>
      ) : null}
    </div>
  );
};

export const RouteBand: FC<{ rows: RouteRow[]; vendor: Vendor | null }> = ({ rows, vendor }) => (
  <>
    <SectionHeading title="The week's route" meta={`${rows.length} stop${rows.length === 1 ? "" : "s"}`} />
    <p class="stamp">The same days all year.</p>
    {rows.length === 0 ? <p class="muted">No markets posted yet.</p> : rows.map((row) => <RouteRowView row={row} vendor={vendor} />)}
    <p>
      <a href="/markets/past">Past popups →</a>
    </p>
  </>
);

/** Closing band (item 7, deep) — coral-fill primary on dark ground via the existing .band-deep override. */
export const ClosingBand: FC<{ vendor: Vendor | null; priced: boolean }> = ({ vendor, priced }) => {
  const name = vendorDisplayName(vendor);
  return (
    <>
      <h2>Ask {name} to hold one</h2>
      <p>
        {priced ? "Call or text." : "Call/text for price."} {name} will touch base on availability and pickup.
      </p>
      {vendor?.phone ? (
        <>
          <Button href={telHref(vendor.phone)}>Call {formatPhoneDisplay(vendor.phone)}</Button>
          <Button variant="secondary" href={smsHref(vendor.phone)}>
            Text {formatPhoneDisplay(vendor.phone)}
          </Button>
        </>
      ) : null}
    </>
  );
};
