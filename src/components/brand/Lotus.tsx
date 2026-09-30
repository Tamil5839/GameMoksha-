const PETAL = "M32 11 C39.5 21 39.5 35 32 46 C24.5 35 24.5 21 32 11 Z";

/** The lotus of Moksha, drawn as five painted petals over still water. */
export function Lotus({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <g stroke="#93301f" strokeWidth="1.6" strokeLinejoin="round">
        {[-66, 66].map((angle) => (
          <path key={angle} d={PETAL} fill="#f4b983" transform={`rotate(${angle} 32 46)`} />
        ))}
        {[-33, 33].map((angle) => (
          <path key={angle} d={PETAL} fill="#e8793f" transform={`rotate(${angle} 32 46)`} />
        ))}
        <path d={PETAL} fill="#c2412b" />
      </g>
      <path d="M11 51 Q32 59 53 51" fill="none" stroke="#c9982f" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Lotus className="h-8 w-8" />
      <span className="font-display text-xl leading-none text-ink">Moksha Patam</span>
    </span>
  );
}
