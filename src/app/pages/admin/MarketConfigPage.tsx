import { RequestInfo } from "rwsdk/worker";
import { MarketConfig } from "./MarketConfig";

/**
 * MarketConfigPage - Server component wrapper for admin market configuration
 *
 * This allows Evan to configure his 9 markets on the 2-week rotation schedule.
 * Will handle market setup, location details, scheduling patterns, and special events.
 */
export function MarketConfigPage(requestInfo: RequestInfo) {
  return <MarketConfig ctx={requestInfo.ctx} />;
}