import { describe, expect, it } from "vitest";

// Same build-time glob pattern as src/ui/design-guardrails.test.ts.
const sources = import.meta.glob("/src/**/*.{ts,tsx}", { eager: true, query: "?raw", import: "default" }) as Record<
  string,
  string
>;
const entries = Object.entries(sources).filter(([path]) => !/\.test\.tsx?$/.test(path));

describe("AI guardrails", () => {
  it("scans a non-empty source set", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("src/lib must not depend on features — pass feature specifics in as options", () => {
    const offenders = entries
      .filter(([path]) => path.startsWith("/src/lib/"))
      .filter(([, content]) => /from\s+["'](?:@\/features\/|(?:\.\.\/)+features\/)/.test(content))
      .map(([path]) => path);
    expect(offenders, "src/lib must not depend on features — pass feature specifics in as options").toEqual([]);
  });

  it("Call runStructured from @/lib/ai/structure instead of ai.run directly", () => {
    const offenders = entries
      .filter(([path]) => !path.startsWith("/src/lib/ai/"))
      .filter(([, content]) => /\bai\.run\(|\.run\(\s*["']@cf\//.test(content))
      .map(([path]) => path);
    expect(offenders, "Call runStructured from @/lib/ai/structure instead of ai.run directly").toEqual([]);
  });
});
