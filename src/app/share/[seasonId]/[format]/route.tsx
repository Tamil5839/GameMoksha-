import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { loadShareCard } from "@/application";
import { SHARE_SIZES, ShareCard, type ShareFormat } from "@/components/share/ShareCard";
import { gameDeps } from "@/server/game";
import { getPlayer } from "@/server/session";

// Fonts are read once per server instance.
const fontFile = (name: string) => readFile(join(process.cwd(), "src/assets/fonts", name));
const [yatra, kalam, muktaRegular, muktaSemiBold] = await Promise.all([
  fontFile("YatraOne-Regular.ttf"),
  fontFile("Kalam-Bold.ttf"),
  fontFile("Mukta-Regular.ttf"),
  fontFile("Mukta-SemiBold.ttf"),
]);

const FONTS = [
  { name: "Yatra One", data: yatra, weight: 400 as const, style: "normal" as const },
  { name: "Kalam", data: kalam, weight: 700 as const, style: "normal" as const },
  { name: "Mukta", data: muktaRegular, weight: 400 as const, style: "normal" as const },
  { name: "Mukta", data: muktaSemiBold, weight: 600 as const, style: "normal" as const },
];

/** PNG share card of the player's own season: /share/{seasonId}/instagram or /x. */
export async function GET(request: NextRequest, ctx: RouteContext<"/share/[seasonId]/[format]">) {
  const { seasonId, format } = await ctx.params;
  if (!(format in SHARE_SIZES)) return new Response("Unknown format", { status: 404 });

  const player = await getPlayer();
  if (!player) return new Response("Please sign in", { status: 401 });

  const card = await loadShareCard(await gameDeps(), player.id, seasonId);
  if (!card) return new Response("Season not found", { status: 404 });

  const host = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ?? request.nextUrl.host;
  return new ImageResponse(<ShareCard card={card} format={format as ShareFormat} host={host} />, {
    ...SHARE_SIZES[format as ShareFormat],
    fonts: FONTS,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="moksha-patam-day-${card.day}-square-${card.square}.png"`,
    },
  });
}
