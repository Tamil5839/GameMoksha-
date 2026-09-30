import type { ReactNode } from "react";
import { BottomNav } from "@/components/shell/BottomNav";
import { requirePlayer } from "@/server/session";

export default async function GameLayout({ children }: { children: ReactNode }) {
  await requirePlayer("/board");
  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 pb-28">
      {children}
      <BottomNav />
    </div>
  );
}
