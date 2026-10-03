import { describe, expect, it } from "vitest";
import { formatSchedule } from "./display";

describe("formatSchedule", () => {
  it("joins digit ranges", () => {
    expect(formatSchedule("Fridays 10-6")).toBe("Fridays 10⁠-⁠6");
    expect(formatSchedule("Fridays 10 - 6")).toBe("Fridays 10⁠-⁠6");
  });
  it("leaves other text alone", () => {
    expect(formatSchedule("Sat-Sun")).toBe("Sat-Sun");
  });
});
