import "server-only";
import { getBookingVMs, getUpcomingTitles } from "@/lib/data";
import { deriveTitleType, titleDisplayName } from "@/lib/display";
import { baseFormat, type BaseFormat, type Exhibitor } from "@/lib/types";

type Supabase = Parameters<typeof getBookingVMs>[0];

export type LineupResponseRow = {
  titleNo: string;
  name: string;
  releaseDate: string | null;
  titleType: string | null;
  formats: {
    format: BaseFormat;
    booked: string[];
    notShowing: string[];
    noAnswer: string[];
  }[];
};

function exhibitorName(e: Exhibitor): string {
  return e.exhibitor_erp ?? e.exhibitor_unique;
}

/**
 * For every upcoming confirmed title and format: which in-scope exhibitors
 * have booked or requested it, which said "not showing", and which have not
 * answered yet. Only exhibitors that run the format are counted.
 */
export async function getLineupResponses(
  supabase: Supabase,
  exhibitors: Exhibitor[]
): Promise<LineupResponseRow[]> {
  const ids = new Set(exhibitors.map((e) => e.exhibitor_unique));
  const [lineup, bookings, responses] = await Promise.all([
    getUpcomingTitles(supabase, ["4DX", "ScreenX"], 400),
    getBookingVMs(supabase),
    supabase.from("title_responses").select("exhibitor_unique, title_no, format"),
  ]);
  if (responses.error) throw new Error(`Failed to load title responses: ${responses.error.message}`);

  const live = new Set<string>();
  for (const b of bookings) {
    if (!b.titleNo || (b.status !== "requested" && b.status !== "confirmed")) continue;
    live.add(`${b.exhibitorId}|${b.titleNo}|${baseFormat(b.format)}`);
  }
  const passed = new Set(
    (responses.data ?? []).map(
      (r: { exhibitor_unique: string; title_no: string; format: string }) =>
        `${r.exhibitor_unique}|${r.title_no}|${r.format}`
    )
  );

  const eligible = (fmt: BaseFormat) =>
    exhibitors.filter((e) => ids.has(e.exhibitor_unique) && (fmt === "4DX" ? e["4dx"] || e.ultra4dx : e.screenx));

  const byTitle = new Map<string, LineupResponseRow>();
  for (const l of lineup) {
    const fmt = baseFormat(l.format);
    let row = byTitle.get(l.title_no);
    if (!row) {
      row = {
        titleNo: l.title_no,
        name: titleDisplayName(l.title?.film_imdb_db ?? null, l.title?.erp_title, l.title_no),
        releaseDate: l.first_available_release_date,
        titleType: deriveTitleType(l.notes),
        formats: [],
      };
      byTitle.set(l.title_no, row);
    }
    if (row.formats.some((f) => f.format === fmt)) continue;
    const entry = { format: fmt, booked: [] as string[], notShowing: [] as string[], noAnswer: [] as string[] };
    for (const e of eligible(fmt)) {
      const key = `${e.exhibitor_unique}|${l.title_no}|${fmt}`;
      if (live.has(key)) entry.booked.push(exhibitorName(e));
      else if (passed.has(key)) entry.notShowing.push(exhibitorName(e));
      else entry.noAnswer.push(exhibitorName(e));
    }
    for (const list of [entry.booked, entry.notShowing, entry.noAnswer]) list.sort((a, b) => a.localeCompare(b));
    row.formats.push(entry);
  }

  return [...byTitle.values()]
    .filter((r) => r.titleType === "Hollywood")
    .sort((a, b) => (a.releaseDate ?? "9999").localeCompare(b.releaseDate ?? "9999") || a.name.localeCompare(b.name));
}
