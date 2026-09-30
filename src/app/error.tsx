"use client";

import { Lotus } from "@/components/brand/Lotus";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <Lotus className="h-20 w-20" />
      <h1 className="mt-4 font-display text-3xl">Something slipped</h1>
      <p className="mt-2 text-ink-soft">We couldn&apos;t load your board just now. Your progress is safe.</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-6">
        Try again
      </button>
    </main>
  );
}
