import { PageHead } from "@/components/team/PageHead";
import { getLineupResponses } from "@/lib/teamLineup";
import { getTeamContext } from "@/lib/teamContext";
import { scopeSuffix } from "@/lib/teamScope";

function shortDate(iso: string | null): string {
  if (!iso) return "TBC";
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function NameList({ label, names, tone }: { label: string; names: string[]; tone: string }) {
  if (names.length === 0) return null;
  return (
    <p className="text-xs">
      <span className={`font-semibold ${tone}`}>{label}:</span>{" "}
      <span className="text-ink2">{names.join(", ")}</span>
    </p>
  );
}

export default async function LineupResponsesPage() {
  const { supabase, scope, exhibitors } = await getTeamContext();
  const rows = await getLineupResponses(supabase, exhibitors);

  return (
    <>
      <PageHead
        title="Title answers"
        subtitle={`Who has booked, passed on, or not yet answered each upcoming title, for exhibitors ${scopeSuffix(scope)}.`}
      />
      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink2">No upcoming confirmed titles.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wider text-ink2">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Opens</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3 text-right">Booked</th>
                <th className="px-4 py-3 text-right">Not showing</th>
                <th className="px-4 py-3 text-right">No answer yet</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.flatMap((r) =>
                r.formats.map((f, i) => (
                  <tr key={`${r.titleNo}-${f.format}`} className="border-b border-line align-top last:border-0">
                    <td className="px-4 py-3 font-semibold">{i === 0 ? r.name : ""}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink2">{i === 0 ? shortDate(r.releaseDate) : ""}</td>
                    <td className="px-4 py-3 text-ink2">{f.format === "4DX" ? "4DX" : "ScreenX"}</td>
                    <td className="num px-4 py-3 text-right font-semibold text-good">{f.booked.length}</td>
                    <td className="num px-4 py-3 text-right font-semibold text-ink2">{f.notShowing.length}</td>
                    <td
                      className={`num px-4 py-3 text-right font-semibold ${f.noAnswer.length ? "text-warn" : "text-ink2"}`}
                    >
                      {f.noAnswer.length}
                    </td>
                    <td className="px-4 py-3">
                      {f.noAnswer.length + f.notShowing.length + f.booked.length > 0 && (
                        <details>
                          <summary className="cursor-pointer text-xs font-medium underline">Show</summary>
                          <div className="mt-2 space-y-1">
                            <NameList label="Booked" names={f.booked} tone="text-good" />
                            <NameList label="Not showing" names={f.notShowing} tone="text-ink2" />
                            <NameList label="No answer" names={f.noAnswer} tone="text-warn" />
                          </div>
                        </details>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
