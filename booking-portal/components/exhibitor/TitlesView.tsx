"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { setNotShowing, undoNotShowing } from "@/app/actions/titleResponses";
import { TrailerBlock } from "@/components/exhibitor/TrailerOrder";
import { todayIso } from "@/lib/display";
import type { BaseFormat, ExhibitorTitle } from "@/lib/types";

type View = "cards" | "table" | "calendar";
type StatusFilter = "all" | "needs" | "booked" | "waiting" | "passed";

const VIEWS: { key: View; label: string }[] = [
  { key: "cards", label: "Cards" },
  { key: "table", label: "Table" },
  { key: "calendar", label: "Calendar" },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function dateObj(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}
function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function shortDate(iso: string | null): string {
  if (!iso) return "TBC";
  return dateObj(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
function mondayOf(iso: string): string {
  const d = dateObj(iso);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return isoOf(d);
}
function addDays(iso: string, n: number): string {
  const d = dateObj(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return isoOf(d);
}

function summarise(t: ExhibitorTitle) {
  const a = t.formats.map((f) => t.answers[f]);
  return {
    needs: a.some((x) => x.kind === "none"),
    booked: a.some((x) => x.kind === "booked" && x.status === "confirmed"),
    waiting: a.some((x) => x.kind === "booked" && x.status === "requested"),
    passed: a.some((x) => x.kind === "not_showing"),
    allPassed: a.length > 0 && a.every((x) => x.kind === "not_showing"),
    undecided: t.formats.filter((f) => t.answers[f]?.kind === "none"),
  };
}

function FormatLogo({ format }: { format: BaseFormat }) {
  const is4dx = format === "4DX";
  return (
    <Image
      src={is4dx ? "/4dx-logo-black.png" : "/screenx-logo-black.png"}
      alt={format}
      width={is4dx ? 2000 : 2800}
      height={is4dx ? 805 : 500}
      className={is4dx ? "h-3 w-auto" : "h-2.5 w-auto"}
    />
  );
}

function Poster({ url, className = "" }: { url: string | null; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed/CDN URL or static placeholder
    <img
      src={url ?? "/poster-placeholder.svg"}
      alt=""
      loading="lazy"
      className={`object-cover ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Answer buttons and status lines (shared by cards, table and calendar)
// ---------------------------------------------------------------------------

function AnswerArea({ t }: { t: ExhibitorTitle }) {
  const s = summarise(t);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean } & { error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
    });
  };

  const labelFor = (formats: BaseFormat[]) =>
    formats.length === t.formats.length ? "" : ` ${formats.map((f) => (f === "4DX" ? "4DX" : "SX")).join(" + ")}`;

  return (
    <div className="flex flex-col gap-2">
      {s.undecided.length > 0 && (
        <div className="flex gap-1.5">
          <Link
            href={`/bookings?tab=request&title=${encodeURIComponent(t.titleNo)}`}
            className="flex-1 whitespace-nowrap rounded-full bg-foreground px-2 py-1.5 text-center text-xs font-semibold text-background hover:opacity-90"
          >
            Book{labelFor(s.undecided)}
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setNotShowing(t.titleNo, s.undecided))}
            className="flex-1 whitespace-nowrap rounded-full border border-line bg-surface px-2 py-1.5 text-xs font-semibold hover:border-foreground/40 disabled:opacity-50"
          >
            Not showing
          </button>
        </div>
      )}

      {t.formats.map((f) => {
        const a = t.answers[f];
        if (a.kind === "booked") {
          return (
            <div key={f} className="flex items-center justify-between gap-2 text-xs font-semibold">
              <span className={a.status === "confirmed" ? "text-confirmed" : "text-requested"}>
                {a.status === "confirmed" ? "✓ " : ""}
                {t.formats.length > 1 ? `${f === "4DX" ? "4DX" : "ScreenX"} ` : ""}
                {a.status === "confirmed" ? "booked" : "requested"} {shortDate(a.date)}
              </span>
              <Link
                href={`/bookings?tab=table`}
                className="text-[11px] font-medium text-muted underline hover:text-foreground"
              >
                Change
              </Link>
            </div>
          );
        }
        return null;
      })}

      {s.passed && (
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted">
          <span>
            Not showing
            {!s.allPassed
              ? ` ${t.formats.filter((f) => t.answers[f].kind === "not_showing").map((f) => (f === "4DX" ? "4DX" : "ScreenX")).join(", ")}`
              : ""}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => undoNotShowing(t.titleNo))}
            className="text-[11px] font-medium underline hover:text-foreground disabled:opacity-50"
          >
            Undo
          </button>
        </div>
      )}
      {error && <p className="text-[11px] text-error">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function TitleCard({ t }: { t: ExhibitorTitle }) {
  const s = summarise(t);
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-xl border bg-surface shadow-sm ${
        s.needs ? "border-requested/50" : "border-line"
      }`}
    >
      <div className="relative aspect-[2/3] w-full bg-foreground/5">
        <Poster
          url={t.posterUrl}
          className={`h-full w-full ${s.allPassed ? "opacity-45 grayscale" : ""}`}
        />
        {s.needs && (
          <span className="absolute right-2 top-2 rounded-full border border-requested/50 bg-requested/10 px-2 py-0.5 text-[10px] font-bold text-requested backdrop-blur-sm">
            Needs answer
          </span>
        )}
        <span className="absolute bottom-2 left-2 rounded-md bg-foreground/90 px-2 py-0.5 text-[11px] font-semibold text-background">
          Opens {shortDate(t.releaseDate)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p
          className={`min-h-[2.75rem] text-sm font-semibold leading-snug line-clamp-2 ${s.allPassed ? "text-muted" : ""}`}
          title={t.name}
        >
          {t.name}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {t.formats.map((f) => (
            <FormatLogo key={f} format={f} />
          ))}
        </div>
        <AnswerArea t={t} />
        <div className="mt-auto flex min-h-[8.25rem] flex-col gap-1.5 border-t border-line pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Trailers</p>
          {s.allPassed ? <p className="text-xs text-muted/70">Not needed</p> : <div className="mt-auto"><TrailerBlock title={t} /></div>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function TitleTable({ titles }: { titles: ExhibitorTitle[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Opens</th>
            <th className="px-4 py-3">Formats</th>
            <th className="w-64 px-4 py-3">Your answer</th>
            <th className="w-48 px-4 py-3">Trailers</th>
          </tr>
        </thead>
        <tbody>
          {titles.map((t) => {
            const s = summarise(t);
            return (
              <tr key={t.titleNo} className="border-b border-line last:border-0 align-top">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Poster url={t.posterUrl} className="h-14 w-9 shrink-0 rounded" />
                    <span className={`font-semibold ${s.allPassed ? "text-muted" : ""}`}>{t.name}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{shortDate(t.releaseDate)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.formats.map((f) => (
                      <FormatLogo key={f} format={f} />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <AnswerArea t={t} />
                </td>
                <td className="px-4 py-3">
                  {s.allPassed ? <span className="text-xs text-muted/70">Not needed</span> : <TrailerBlock title={t} compact />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar: one band per week. Release dates differ by country, so titles
// sit together in their week with no day alignment.
// ---------------------------------------------------------------------------

function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}
function shiftMonth(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function WeekChip({ t }: { t: ExhibitorTitle }) {
  const s = summarise(t);
  const state = s.allPassed
    ? { label: "Not showing", cls: "text-muted" }
    : s.booked
      ? { label: "Booked", cls: "text-confirmed" }
      : s.waiting
        ? { label: "Waiting for CJ", cls: "text-requested" }
        : s.needs
          ? { label: "Needs answer", cls: "text-requested" }
          : { label: "", cls: "" };
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border bg-surface p-2 ${
        s.needs ? "border-requested/50" : "border-line"
      } ${s.allPassed ? "opacity-60" : ""}`}
    >
      <Poster url={t.posterUrl} className="h-16 w-11 shrink-0 rounded" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug line-clamp-2" title={t.name}>
          {t.name}
        </p>
        <p className="text-[11px] text-muted">Opens {shortDate(t.releaseDate)}</p>
        {state.label && <p className={`text-[11px] font-semibold ${state.cls}`}>{state.label}</p>}
      </div>
    </div>
  );
}

function WeekCalendar({ titles }: { titles: ExhibitorTitle[] }) {
  const dated = titles.filter((t) => t.releaseDate);
  const today = todayIso();
  const [month, setMonth] = useState(() => {
    const cur = monthKeyOf(today);
    if (dated.some((t) => monthKeyOf(t.releaseDate!) === cur)) return cur;
    const first = dated.map((t) => t.releaseDate!).sort()[0];
    return first ? monthKeyOf(first) : cur;
  });

  const weeks = useMemo(() => {
    const first = `${month}-01`;
    const next = `${shiftMonth(month, 1)}-01`;
    const out: { monday: string; items: ExhibitorTitle[] }[] = [];
    for (let m = mondayOf(first); m < next; m = addDays(m, 7)) {
      const end = addDays(m, 7);
      out.push({
        monday: m,
        items: dated.filter((t) => t.releaseDate! >= m && t.releaseDate! < end && monthKeyOf(t.releaseDate!) === month),
      });
    }
    return out;
  }, [dated, month]);

  const undated = titles.filter((t) => !t.releaseDate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">{monthLabel(month)}</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-foreground/40"
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setMonth(monthKeyOf(today))}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-foreground/40"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-foreground/40"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">
        Release dates vary by country, so titles are grouped by the week they open.
      </p>

      <div className="space-y-2">
        {weeks.map((w) => (
          <div key={w.monday} className="flex gap-4 rounded-xl border border-line bg-surface p-3">
            <div className="w-28 shrink-0 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Week of</p>
              <p className="text-sm font-bold">{shortDate(w.monday)}</p>
            </div>
            {w.items.length === 0 ? (
              <p className="self-center text-xs text-muted/70">No releases</p>
            ) : (
              <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2">
                {w.items.map((t) => (
                  <WeekChip key={t.titleNo} t={t} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {undated.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Date to be confirmed</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2">
            {undated.map((t) => (
              <WeekChip key={t.titleNo} t={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TitlesView({ titles, formats }: { titles: ExhibitorTitle[]; formats: string[] }) {
  const [view, setView] = useState<View>("cards");
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [showRegional, setShowRegional] = useState(false);

  const byFormat = useMemo(
    () =>
      format
        ? titles
            .filter((t) => t.formats.includes(format as BaseFormat))
            .map((t) => ({ ...t, formats: [format as BaseFormat] }))
        : titles,
    [titles, format]
  );
  const hollywood = useMemo(() => byFormat.filter((t) => t.titleType === "Hollywood"), [byFormat]);
  const pool = showRegional ? byFormat : hollywood;
  const hiddenCount = byFormat.length - hollywood.length;

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? pool.filter((t) => t.name.toLowerCase().includes(q)) : pool;
  }, [pool, query]);

  const counts = useMemo(() => {
    const c = { all: pool.length, needs: 0, booked: 0, waiting: 0, passed: 0 };
    for (const t of pool) {
      const s = summarise(t);
      if (s.needs) c.needs++;
      if (s.booked) c.booked++;
      if (s.waiting) c.waiting++;
      if (s.passed) c.passed++;
    }
    return c;
  }, [pool]);

  const shown = useMemo(
    () =>
      searched.filter((t) => {
        const s = summarise(t);
        switch (status) {
          case "needs":
            return s.needs;
          case "booked":
            return s.booked;
          case "waiting":
            return s.waiting;
          case "passed":
            return s.passed;
          default:
            return true;
        }
      }),
    [searched, status]
  );

  const answered = counts.all - counts.needs;
  const pills: { key: StatusFilter; label: string; count: number; amber?: boolean }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "needs", label: "Needs answer", count: counts.needs, amber: true },
    { key: "booked", label: "Booked", count: counts.booked },
    { key: "waiting", label: "Waiting for CJ", count: counts.waiting },
    { key: "passed", label: "Not showing", count: counts.passed },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Titles</h1>
          <p className="mt-1 text-sm text-muted">
            Every release in your market. Book it, or tap Not showing if you are passing.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles"
            className="w-60 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
          <div className="flex gap-0.5 rounded-[10px] border border-line bg-background p-[3px]">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                className={`rounded-[7px] px-4 py-1.5 text-[13px] font-semibold transition ${
                  view === v.key ? "bg-foreground text-background" : "text-muted hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {counts.needs > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-requested/30 bg-requested/10 px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-bold text-requested">
              {counts.needs} {counts.needs === 1 ? "title needs" : "titles need"} your answer
            </p>
            <p className="text-xs text-requested/90">
              Not showing is a valid answer. It tells CJ you are passing, so nobody needs to chase you.
            </p>
          </div>
          <div className="hidden w-52 sm:block">
            <p className="mb-1 text-right text-[11px] text-requested">
              {answered} of {counts.all} answered
            </p>
            <div className="h-1.5 rounded-full bg-requested/20">
              <div
                className="h-1.5 rounded-full bg-requested"
                style={{ width: `${counts.all ? (answered / counts.all) * 100 : 0}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatus("needs")}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
          >
            Show these
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {formats.length > 1 &&
          ["", ...formats].map((f) => (
            <button
              key={f || "all"}
              type="button"
              onClick={() => setFormat(f)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
                format === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-line bg-surface text-muted hover:text-foreground"
              }`}
            >
              {f || "All formats"}
            </button>
          ))}
        {formats.length > 1 && <span className="mx-1 h-5 w-px bg-line" />}
        {pills.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setStatus(p.key)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
              status === p.key
                ? "border-foreground bg-foreground text-background"
                : p.amber && p.count > 0
                  ? "border-requested/50 bg-requested/10 text-requested"
                  : "border-line bg-surface text-muted hover:text-foreground"
            }`}
          >
            {p.label} <span className="opacity-65">{p.count}</span>
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs font-medium text-muted">
          <input type="checkbox" checked={showRegional} onChange={(e) => setShowRegional(e.target.checked)} />
          Also show regional titles{!showRegional && hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ""}
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">
          {titles.length === 0 ? "No upcoming confirmed titles for your formats right now." : "No titles match."}
        </p>
      ) : view === "cards" ? (
        <div className="grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {shown.map((t) => (
            <TitleCard key={t.titleNo} t={t} />
          ))}
        </div>
      ) : view === "table" ? (
        <TitleTable titles={shown} />
      ) : (
        <WeekCalendar titles={shown} />
      )}
    </div>
  );
}
