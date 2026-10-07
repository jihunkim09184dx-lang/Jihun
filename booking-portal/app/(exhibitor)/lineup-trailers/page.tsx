import { redirect } from "next/navigation";

// Dashboard and Lineup & Trailers were merged into the Titles page.
export default function LineupTrailersRedirect() {
  redirect("/titles");
}
