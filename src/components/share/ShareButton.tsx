"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, ShareIcon } from "@/components/icons";

const FORMATS = [
  { id: "instagram", label: "Instagram", ratio: "4:5", aspect: "aspect-[4/5]" },
  { id: "x", label: "X", ratio: "16:9", aspect: "aspect-[16/9]" },
] as const;

type Format = (typeof FORMATS)[number]["id"];

/** One tap makes a PNG of the board; the sheet shares it (phones) or downloads it. */
export function ShareButton({
  seasonId,
  day,
  square,
  variant = "ghost",
}: {
  seasonId: string;
  day: number;
  square: number;
  variant?: "primary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  // The sheet lives in a portal that is only created on first use (never during server rendering).
  const [mounted, setMounted] = useState(false);
  const [format, setFormat] = useState<Format>("instagram");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The query string changes whenever the board does, so a fresh image is drawn.
  const src = `/share/${seasonId}/${format}?day=${day}&square=${square}`;
  const fileName = `moksha-patam-day-${day}-square-${square}${format === "x" ? "-x" : ""}.png`;

  async function share() {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: "image/png" });
      const text = `Day ${day} · Square ${square} on my Moksha Patam board`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Moksha Patam", text });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus("Saved to your downloads.");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") setStatus("Couldn't create the image. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const sheet = (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Share card"
            className="card w-full max-w-md rounded-b-none px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:rounded-b-[1.25rem]"
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Share your board</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-parchment-deep">
                <CloseIcon />
              </button>
            </div>
            <div role="radiogroup" aria-label="Image size" className="mt-3 grid grid-cols-2 gap-2 rounded-full bg-parchment-deep/70 p-1">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={format === f.id}
                  onClick={() => setFormat(f.id)}
                  className={`min-h-10 rounded-full text-sm font-semibold ${format === f.id ? "bg-paper shadow" : "text-ink-soft"}`}
                >
                  {f.label} <span className="font-normal opacity-70">{f.ratio}</span>
                </button>
              ))}
            </div>
            <div
              className={`relative mx-auto mt-3 overflow-hidden rounded-xl border border-gold/50 bg-parchment ${
                FORMATS.find((f) => f.id === format)!.aspect
              } ${format === "instagram" ? "max-h-[52vh]" : "w-full"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={src} src={src} alt={`Share card: Day ${day}, square ${square}`} className="h-full w-full object-contain" />
            </div>
            <button type="button" onClick={share} disabled={busy} className="btn btn-primary mt-4 w-full">
              <ShareIcon />
              {busy ? "Preparing…" : "Share image"}
            </button>
            {status ? (
              <p role="status" className="mt-2 text-center text-sm text-ink-soft">
                {status}
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        className={`btn w-full ${variant === "primary" ? "btn-primary" : "btn-ghost"}`}
      >
        <ShareIcon />
        Share card
      </button>
      {mounted ? createPortal(sheet, document.body) : null}
    </>
  );
}
