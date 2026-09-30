import { describe, expect, it } from "vitest";
import { formatDate, formatDay, formatDelta } from "@/components/format";

describe("formatting", () => {
  it("formats local dates without shifting them across time zones", () => {
    expect(formatDay("2026-09-30")).toBe("Wed 30 Sep");
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
  });

  it("formats square changes with a real minus sign", () => {
    expect(formatDelta(9)).toBe("+9");
    expect(formatDelta(-3)).toBe("−3");
    expect(formatDelta(0)).toBe("±0");
  });
});
