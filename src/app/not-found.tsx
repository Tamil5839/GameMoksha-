import Link from "next/link";
import { Lotus } from "@/components/brand/Lotus";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <Lotus className="h-20 w-20" />
      <h1 className="mt-4 font-display text-3xl">A snake took this page</h1>
      <p className="mt-2 text-ink-soft">It slid somewhere we can&apos;t find. Let&apos;s get you back on the board.</p>
      <Link href="/board" className="btn btn-primary mt-6">
        Back to my board
      </Link>
    </main>
  );
}
