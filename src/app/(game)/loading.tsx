/** Shown while a signed-in page loads its season from the database. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading your board" className="animate-pulse pt-16">
      <div className="mx-auto aspect-square w-full max-w-[34rem] rounded-[3%] bg-parchment-deep/70" />
      <div className="mt-4 h-40 rounded-[1.25rem] bg-parchment-deep/50" />
    </div>
  );
}
