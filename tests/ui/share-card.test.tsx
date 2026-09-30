import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { describe, expect, it } from "vitest";
import type { ShareCardData } from "@/application";
import { SHARE_SIZES, ShareCard, type ShareFormat } from "@/components/share/ShareCard";
import { makeBoard } from "@/domain";

const font = (file: string) => readFileSync(join(process.cwd(), "src/assets/fonts", file));
const FONTS = [
  { name: "Yatra One", data: font("YatraOne-Regular.ttf"), weight: 400 as const },
  { name: "Kalam", data: font("Kalam-Bold.ttf"), weight: 700 as const },
  { name: "Mukta", data: font("Mukta-Regular.ttf"), weight: 400 as const },
  { name: "Mukta", data: font("Mukta-SemiBold.ttf"), weight: 600 as const },
];

const card: ShareCardData = {
  seasonNumber: 2,
  day: 12,
  square: 47,
  won: false,
  habits: makeBoard(6, 6).map((h) => ({ ...h, label: `A long habit label number ${h.slot + 1}`, amount: 2 })),
  biggestLadder: { label: "Read 20 pages", squares: 18 },
  biggestSnake: null,
};

async function render(format: ShareFormat, data: ShareCardData) {
  const response = new ImageResponse(<ShareCard card={data} format={format} host="example.com" />, {
    ...SHARE_SIZES[format],
    fonts: FONTS,
  });
  return Buffer.from(await response.arrayBuffer());
}

describe("share card", () => {
  it.each(Object.entries(SHARE_SIZES) as [ShareFormat, { width: number; height: number }][])(
    "renders a %s PNG at its exact size",
    async (format, size) => {
      const png = await render(format, card);
      expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(size.width);
      expect(png.readUInt32BE(20)).toBe(size.height);
    },
    30_000,
  );

  it("renders a won season", async () => {
    const png = await render("instagram", { ...card, won: true, square: 100, day: 23 });
    expect(png.readUInt32BE(16)).toBe(1080);
  }, 30_000);
});
