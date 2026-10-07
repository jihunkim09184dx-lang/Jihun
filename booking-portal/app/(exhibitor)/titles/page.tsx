import { TitlesView } from "@/components/exhibitor/TitlesView";
import { getExhibitorTitles, getExhibitors, requireProfile } from "@/lib/data";

export default async function TitlesPage() {
  const { supabase } = await requireProfile();
  const exhibitors = await getExhibitors(supabase); // RLS scopes this to the user's own exhibitor
  const exhibitor = exhibitors[0];

  // lineup.format only ever holds "4DX"/"ScreenX"; Ultra screens book against
  // those base-format lineup rows, so Ultra folds into the 4DX family here.
  const formats: string[] = [];
  if (exhibitor?.["4dx"] || exhibitor?.ultra4dx) formats.push("4DX");
  if (exhibitor?.screenx) formats.push("ScreenX");

  const titles = await getExhibitorTitles(supabase, formats, !!exhibitor?.ultra4dx);

  return <TitlesView titles={titles} formats={formats} />;
}
