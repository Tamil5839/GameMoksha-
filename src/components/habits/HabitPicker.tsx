"use client";

import { useActionState, useId, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_RULES,
  SUGGESTED_BAD_HABITS,
  SUGGESTED_GOOD_HABITS,
  describeProblem,
  normalizeLabel,
  validateHabitSelection,
  type HabitKind,
} from "@/domain";
import { CloseIcon, LadderIcon, SnakeIcon } from "@/components/icons";
import type { SeasonFormState } from "@/app/onboarding/actions";

type Action = (state: SeasonFormState, formData: FormData) => Promise<SeasonFormState>;

const { min: MIN, max: MAX } = DEFAULT_RULES.habitsPerKind;
const MAX_LENGTH = DEFAULT_RULES.maxHabitLabelLength;

const KIND = {
  good: {
    title: "Ladders",
    subtitle: "Good habits that lift you up",
    suggestions: SUGGESTED_GOOD_HABITS,
    icon: <LadderIcon className="h-5 w-5" />,
    accent: "text-leaf-deep",
    chipOn: "bg-leaf text-paper border-leaf",
    placeholder: "e.g. Practised guitar",
  },
  bad: {
    title: "Snakes",
    subtitle: "Bad habits that pull you down",
    suggestions: SUGGESTED_BAD_HABITS,
    icon: <SnakeIcon className="h-5 w-5" />,
    accent: "text-maroon",
    chipOn: "bg-maroon text-paper border-maroon",
    placeholder: "e.g. Skipped lunch",
  },
} as const;

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function HabitPicker({
  action,
  initialGood = [],
  initialBad = [],
  submitLabel,
  footerNote,
  aboveNav = false,
}: {
  action: Action;
  initialGood?: readonly string[];
  initialBad?: readonly string[];
  submitLabel: string;
  footerNote?: ReactNode;
  /** Sit above the bottom tab bar instead of at the very bottom. */
  aboveNav?: boolean;
}) {
  const [picked, setPicked] = useState<Record<HabitKind, string[]>>({ good: [...initialGood], bad: [...initialBad] });
  const [state, formAction, pending] = useActionState(action, {});
  const [timeZone] = useState(browserTimeZone);

  const check = useMemo(() => validateHabitSelection(picked, DEFAULT_RULES), [picked]);
  const same = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();
  const isPicked = (label: string) => [...picked.good, ...picked.bad].some((l) => same(l, label));

  const add = (kind: HabitKind, raw: string) => {
    const label = normalizeLabel(raw);
    if (!label || isPicked(label) || picked[kind].length >= MAX) return false;
    setPicked((p) => ({ ...p, [kind]: [...p[kind], label] }));
    return true;
  };
  const remove = (kind: HabitKind, label: string) =>
    setPicked((p) => ({ ...p, [kind]: p[kind].filter((l) => l !== label) }));
  const toggle = (kind: HabitKind, label: string) =>
    picked[kind].some((l) => same(l, label)) ? remove(kind, picked[kind].find((l) => same(l, label))!) : add(kind, label);

  const serverProblems = state.problems?.length ? state.problems : state.message ? [state.message] : [];

  return (
    <form action={formAction} className={aboveNav ? "pb-44" : "pb-36"}>
      <input type="hidden" name="timeZone" value={timeZone} />
      {picked.good.map((label) => (
        <input key={`g-${label}`} type="hidden" name="good" value={label} />
      ))}
      {picked.bad.map((label) => (
        <input key={`b-${label}`} type="hidden" name="bad" value={label} />
      ))}

      {(["good", "bad"] as const).map((kind) => (
        <KindSection
          key={kind}
          kind={kind}
          picked={picked[kind]}
          isTaken={isPicked}
          onToggle={(label) => toggle(kind, label)}
          onAdd={(label) => add(kind, label)}
          onRemove={(label) => remove(kind, label)}
        />
      ))}

      <div
        className={`fixed inset-x-0 z-20 border-t border-gold/40 bg-paper/95 px-4 pt-3 backdrop-blur ${
          aboveNav ? "bottom-[calc(4rem+env(safe-area-inset-bottom))] pb-3" : "bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
        }`}
      >
        <div className="mx-auto max-w-xl">
          {serverProblems.length > 0 ? (
            <ul role="alert" className="mb-2 text-sm text-maroon">
              {serverProblems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : !check.ok ? (
            <p className="mb-2 text-sm text-ink-soft">{describeProblem(check.problems[0])}</p>
          ) : (
            <p className="mb-2 text-sm text-leaf-deep">
              {picked.good.length} ladders and {picked.bad.length} snakes. Ready to paint your board.
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={!check.ok || pending}>
            {pending ? "Painting your board…" : submitLabel}
          </button>
          {footerNote ? <div className="mt-2 text-center text-xs text-ink-soft">{footerNote}</div> : null}
        </div>
      </div>
    </form>
  );
}

function KindSection({
  kind,
  picked,
  isTaken,
  onToggle,
  onAdd,
  onRemove,
}: {
  kind: HabitKind;
  picked: string[];
  isTaken: (label: string) => boolean;
  onToggle: (label: string) => void;
  onAdd: (label: string) => boolean;
  onRemove: (label: string) => void;
}) {
  const meta = KIND[kind];
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const full = picked.length >= MAX;
  const custom = picked.filter((l) => !meta.suggestions.some((s) => s.toLocaleLowerCase() === l.toLocaleLowerCase()));

  const submitDraft = () => {
    if (onAdd(draft)) setDraft("");
  };

  return (
    <section className="card mt-5 p-4" aria-labelledby={`${inputId}-title`}>
      <div className="flex items-center justify-between">
        <h2 id={`${inputId}-title`} className={`flex items-center gap-2 font-display text-2xl ${meta.accent}`}>
          {meta.icon}
          {meta.title}
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
            picked.length >= MIN ? "bg-leaf-soft text-leaf-deep" : "bg-parchment-deep text-ink-soft"
          }`}
        >
          {picked.length} / {MIN}–{MAX}
        </span>
      </div>
      <p className="text-ink-soft">{meta.subtitle}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {meta.suggestions.map((label) => {
          const on = picked.some((l) => l.toLocaleLowerCase() === label.toLocaleLowerCase());
          const blocked = !on && (full || isTaken(label));
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              disabled={blocked}
              onClick={() => onToggle(label)}
              className={`min-h-10 rounded-full border px-3.5 text-[0.95rem] transition-colors ${
                on ? meta.chipOn : "border-ink-soft/30 bg-paper text-ink"
              } disabled:opacity-40`}
            >
              {label}
            </button>
          );
        })}
        {custom.map((label) => (
          <button
            key={label}
            type="button"
            aria-pressed
            onClick={() => onRemove(label)}
            className={`flex min-h-10 items-center gap-1 rounded-full border px-3.5 text-[0.95rem] ${meta.chipOn}`}
          >
            {label}
            <CloseIcon className="h-4 w-4" />
            <span className="sr-only">Remove</span>
          </button>
        ))}
      </div>

      <label htmlFor={inputId} className="mt-4 block text-sm font-semibold">
        Or write your own
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id={inputId}
          value={draft}
          maxLength={MAX_LENGTH}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitDraft();
            }
          }}
          placeholder={full ? `You have ${MAX} already` : meta.placeholder}
          className="field min-w-0 flex-1"
        />
        <button type="button" onClick={submitDraft} disabled={full || !draft.trim()} className="btn btn-ghost px-4">
          Add
        </button>
      </div>
      <p className="mt-1 text-right text-xs text-ink-soft tabular-nums">
        {draft.length}/{MAX_LENGTH}
      </p>

      {picked.length > 0 ? (
        <ol className="mt-2 space-y-1.5">
          {picked.map((label, i) => (
            <li key={label} className="flex items-center gap-3 rounded-xl bg-parchment/70 px-3 py-2">
              <span className={`font-hand text-lg font-bold ${meta.accent}`}>{i + 1}</span>
              <span className="flex-1">{label}</span>
              <button
                type="button"
                onClick={() => onRemove(label)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-parchment-deep"
                aria-label={`Remove ${label}`}
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
