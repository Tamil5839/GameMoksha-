/**
 * The share image, laid out for Satori (next/og): flexbox only, inline
 * styles, and board drawings embedded as SVG images without any text.
 */
import type { ShareCardData } from "@/application";
import {
  BOARD_COLUMNS,
  FINAL_SQUARE,
  START_SQUARE,
  cellToSquare,
  paintBoard,
  squareCenter,
  squareToCell,
} from "@/domain";
import { clampPlaqueX, plaqueAnchor, plaqueLayout, type BoardHabit } from "@/components/board/BoardArt";
import { BOARD_COLORS as C, squareTint } from "@/components/board/palette";
import {
  gridPrims,
  ladderPrims,
  lotusPrims,
  mokshaLotusPrims,
  pawnPrims,
  primsToSvg,
  snakePrims,
} from "@/components/board/primitives";
import { shortLabel } from "@/components/board/shapes";

export type ShareFormat = "instagram" | "x";

export const SHARE_SIZES: Record<ShareFormat, { width: number; height: number }> = {
  instagram: { width: 1080, height: 1350 },
  x: { width: 1200, height: 675 },
};

const svgImage = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

function Board({ card, size }: { card: ShareCardData; size: number }) {
  const scale = size / 1000;
  const cell = size / BOARD_COLUMNS;
  const frame = Math.round(size * 0.035);
  const habits: readonly BoardHabit[] = card.habits;
  const { ladders, snakes } = paintBoard(habits);

  const art = primsToSvg([
    ...gridPrims(),
    ...mokshaLotusPrims(),
    ...ladders.flatMap((l) => ladderPrims(squareCenter(l.from), squareCenter(l.to))),
    ...snakes.flatMap((s) => snakePrims(squareCenter(s.head), squareCenter(s.tail), s.habit.slot)),
  ]);
  const pawnAt = squareCenter(card.square);
  const pawn = primsToSvg(pawnPrims(pawnAt.x, pawnAt.y, 1.5));

  const plaques = [
    ...ladders.map((l) => ({ habit: habits.find((h) => h.id === l.habit.id)!, at: plaqueAnchor("good", squareCenter(l.from)) })),
    ...snakes.map((s) => ({ habit: habits.find((h) => h.id === s.habit.id)!, at: plaqueAnchor("bad", squareCenter(s.head)) })),
  ];

  return (
    <div
      style={{
        display: "flex",
        padding: frame * 0.45,
        background: C.frame,
        borderRadius: frame * 0.9,
        boxShadow: "0 18px 40px -18px rgba(58,35,20,0.6)",
      }}
    >
      <div style={{ display: "flex", padding: frame * 0.55, background: C.frameBand, borderRadius: frame * 0.6 }}>
        <div style={{ display: "flex", position: "relative", width: size, height: size, flexDirection: "column" }}>
          {Array.from({ length: BOARD_COLUMNS }, (_, i) => BOARD_COLUMNS - 1 - i).map((row) => (
            <div key={row} style={{ display: "flex" }}>
              {Array.from({ length: BOARD_COLUMNS }, (_, col) => {
                const square = cellToSquare({ row, col });
                const cellRow = squareToCell(square).row;
                const background =
                  square === FINAL_SQUARE ? C.moksha : square === START_SQUARE ? C.start : squareTint(cellRow, col);
                return (
                  <div
                    key={col}
                    style={{
                      display: "flex",
                      width: cell,
                      height: cell,
                      background,
                      paddingLeft: cell * 0.08,
                      paddingTop: cell * 0.02,
                      fontFamily: "Kalam",
                      fontSize: cell * 0.27,
                      color: C.ink,
                      opacity: 0.95,
                    }}
                  >
                    {square}
                  </div>
                );
              })}
            </div>
          ))}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={svgImage(art)} width={size} height={size} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
          {plaques.map(({ habit, at }) => {
            const { text, width, badge } = plaqueLayout(habit);
            const x = clampPlaqueX(at.x, width);
            const color = habit.kind === "good" ? C.good : C.bad;
            return (
              <div
                key={habit.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  position: "absolute",
                  left: (x - width / 2) * scale,
                  top: (at.y - 21) * scale,
                  width: width * scale,
                  height: 42 * scale,
                  paddingLeft: 12 * scale,
                  paddingRight: 6 * scale,
                  background: C.plaque,
                  border: `${3.5 * scale}px solid ${color}`,
                  borderRadius: 13 * scale,
                  fontFamily: "Kalam",
                  fontSize: 24 * scale,
                  color: C.ink,
                }}
              >
                <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{text}</span>
                <span
                  style={{
                    display: "flex",
                    padding: `${1 * scale}px ${6 * scale}px`,
                    background: color,
                    color: "#fff8e7",
                    borderRadius: 9 * scale,
                    fontFamily: "Mukta",
                    fontSize: 19 * scale,
                    marginLeft: 4 * scale,
                  }}
                >
                  {badge}
                </span>
              </div>
            );
          })}
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: 0,
              top: cell * 0.76,
              width: cell,
              justifyContent: "center",
              fontFamily: "Yatra One",
              fontSize: cell * 0.19,
              color: C.frame,
            }}
          >
            Moksha
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={svgImage(pawn)} width={size} height={size} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
        </div>
      </div>
    </div>
  );
}

function Brand({ size }: { size: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={svgImage(primsToSvg(lotusPrims(32, 42, 0.85), "0 0 64 64"))} width={size} height={size} alt="" />
      <span
        style={{
          marginLeft: size * 0.2,
          fontFamily: "Mukta",
          fontWeight: 600,
          fontSize: size * 0.5,
          letterSpacing: size * 0.12,
          color: C.frameMotif,
        }}
      >
        MOKSHA PATAM
      </span>
    </div>
  );
}

function Stat({ kind, value, width }: { kind: "ladder" | "snake"; value: ShareCardData["biggestLadder"]; width: number }) {
  const good = kind === "ladder";
  const color = good ? C.good : C.bad;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        padding: "16px 22px",
        background: good ? "#e1e9c6" : "#f3d6cf",
        border: `3px solid ${color}`,
        borderRadius: 22,
      }}
    >
      <span style={{ fontFamily: "Mukta", fontWeight: 600, fontSize: 20, letterSpacing: 3, color }}>
        {good ? "BIGGEST LADDER" : "BIGGEST SNAKE"}
      </span>
      <span style={{ display: "flex", fontFamily: "Kalam", fontSize: 32, color: C.ink, marginTop: 2, whiteSpace: "nowrap" }}>
        {value
          ? `${shortLabel(value.label, 24)} ${good ? "+" : "−"}${value.squares}`
          : good
            ? "No ladders yet"
            : "No snakes so far"}
      </span>
    </div>
  );
}

function Title({ card, fontSize, stacked = false }: { card: ShareCardData; fontSize: number; stacked?: boolean }) {
  if (stacked && !card.won) {
    return (
      <div style={{ display: "flex", flexDirection: "column", fontFamily: "Yatra One", fontSize, color: C.ink, lineHeight: 1.08 }}>
        <span>Day {card.day} ·</span>
        <span>Square {card.square}</span>
      </div>
    );
  }
  return card.won ? (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontFamily: "Yatra One", fontSize: fontSize * 1.1, color: C.frameMotif, lineHeight: 1.05 }}>Moksha!</span>
      <span style={{ fontFamily: "Yatra One", fontSize: fontSize * 0.6, color: C.ink }}>
        Day {card.day} · Square {card.square}
      </span>
    </div>
  ) : (
    <span style={{ fontFamily: "Yatra One", fontSize, color: C.ink, lineHeight: 1.1 }}>
      Day {card.day} · Square {card.square}
    </span>
  );
}

const PAGE = {
  display: "flex",
  width: "100%",
  height: "100%",
  background: "radial-gradient(ellipse at 50% 0%, #fbf3df 0%, #f5e6c8 55%, #ead3a4 100%)",
  color: C.ink,
} as const;

/** The whole image: board with the pawn, "Day 12 · Square 47", biggest ladder and snake. */
export function ShareCard({ card, format, host }: { card: ShareCardData; format: ShareFormat; host: string }) {
  const footer = `Season ${card.seasonNumber} · ${host}`;
  if (format === "x") {
    return (
      <div style={{ ...PAGE, padding: 40, alignItems: "center" }}>
        <Board card={card} size={548} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 44, height: "100%", paddingTop: 18 }}>
          <Brand size={40} />
          <div style={{ display: "flex", marginTop: 26 }}>
            <Title card={card} fontSize={64} stacked />
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
            <Stat kind="ladder" value={card.biggestLadder} width={468} />
            <div style={{ display: "flex", height: 16 }} />
            <Stat kind="snake" value={card.biggestSnake} width={468} />
          </div>
          <span style={{ marginTop: "auto", fontFamily: "Mukta", fontSize: 22, color: C.ink, opacity: 0.7 }}>{footer}</span>
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...PAGE, flexDirection: "column", alignItems: "center", padding: "52px 60px 40px" }}>
      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
        <Brand size={48} />
        <span style={{ fontFamily: "Mukta", fontWeight: 600, fontSize: 26, color: C.ink, opacity: 0.75 }}>
          Season {card.seasonNumber}
        </span>
      </div>
      <div style={{ display: "flex", width: "100%", marginTop: 18 }}>
        <Title card={card} fontSize={card.won ? 76 : 80} />
      </div>
      <div style={{ display: "flex", marginTop: card.won ? 14 : 26 }}>
        <Board card={card} size={card.won ? 760 : 800} />
      </div>
      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", marginTop: 30 }}>
        <Stat kind="ladder" value={card.biggestLadder} width={470} />
        <Stat kind="snake" value={card.biggestSnake} width={470} />
      </div>
      <span style={{ marginTop: "auto", fontFamily: "Mukta", fontSize: 24, color: C.ink, opacity: 0.7 }}>{host}</span>
    </div>
  );
}
