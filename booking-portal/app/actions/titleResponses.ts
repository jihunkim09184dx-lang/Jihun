"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/data";
import { bookingErrorMessage } from "@/lib/display";
import type { ActionResult } from "@/app/actions/bookings";

function revalidateTitleViews() {
  revalidatePath("/titles");
  revalidatePath("/lineup");
}

/** Exhibitor: tell CJ we are not showing this title in the given format(s). */
export async function setNotShowing(titleNo: string, formats: string[]): Promise<ActionResult> {
  const { supabase, user, profile } = await requireProfile();
  if (profile.role !== "exhibitor" || !profile.exhibitor_unique) {
    return { ok: false, error: "Only exhibitor accounts can answer on titles." };
  }
  const valid = formats.filter((f) => f === "4DX" || f === "ScreenX");
  if (!titleNo || valid.length === 0) return { ok: false, error: "Missing title." };

  const { error } = await supabase.from("title_responses").upsert(
    valid.map((format) => ({
      exhibitor_unique: profile.exhibitor_unique,
      title_no: titleNo,
      format,
      response: "not_showing",
      responded_by: user.email,
      responded_at: new Date().toISOString(),
    })),
    { onConflict: "exhibitor_unique,title_no,format" }
  );
  if (error) return { ok: false, error: bookingErrorMessage(error.message) };
  revalidateTitleViews();
  return { ok: true, submitted: valid.length };
}

/** Exhibitor: take back a "not showing" answer so the title is undecided again. */
export async function undoNotShowing(titleNo: string): Promise<ActionResult> {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "exhibitor" || !profile.exhibitor_unique) {
    return { ok: false, error: "Only exhibitor accounts can answer on titles." };
  }
  const { error } = await supabase
    .from("title_responses")
    .delete()
    .eq("exhibitor_unique", profile.exhibitor_unique)
    .eq("title_no", titleNo);
  if (error) return { ok: false, error: bookingErrorMessage(error.message) };
  revalidateTitleViews();
  return { ok: true, submitted: 1 };
}
