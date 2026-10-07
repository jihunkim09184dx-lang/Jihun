"use client";

import { useState, useTransition } from "react";
import { submitTrailerRequest } from "@/app/actions/trailerRequests";
import { Modal, PrimaryButton, SubtleButton } from "@/components/ui";
import type { ExhibitorTitle } from "@/lib/types";

/** Trailer block for a title card or table row: which trailer codes exist per
 * format, plus an Order button that opens the existing request flow. The
 * button only works once at least one trailer is marked ready. */
export function TrailerBlock({
  title,
  compact = false,
}: {
  title: ExhibitorTitle;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const has = title.trailers.length > 0;
  const ready = title.trailers.some((t) => t.ready);
  const allRequested =
    has && title.trailers.every((t) => t.assets.filter((a) => a.ready).every((a) => a.requested));
  const canOrder = ready && !allRequested;

  return (
    <div className={compact ? "flex flex-col gap-1.5" : "flex flex-col gap-1.5"}>
      {has ? (
        <div className="flex flex-col gap-1">
          {title.trailers.map((t) => (
            <div key={t.format} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-[11px] font-semibold text-muted">
                {t.format === "4DX" ? "4DX" : "ScreenX"}
              </span>
              <span className="flex flex-wrap gap-1">
                {t.codes.length === 0 && <span className="text-[11px] text-muted">Trailer</span>}
                {t.codes.map((c) => (
                  <span
                    key={c}
                    className={`min-w-4 rounded px-1.5 py-px text-center text-[11px] font-semibold ${
                      t.ready ? "bg-foreground/[0.07] text-foreground" : "bg-foreground/[0.04] text-muted"
                    }`}
                  >
                    {c}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">No trailer yet</p>
      )}

      <button
        type="button"
        disabled={!canOrder}
        onClick={() => setOpen(true)}
        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
          canOrder
            ? "border-foreground bg-surface text-foreground hover:bg-foreground hover:text-background"
            : "cursor-not-allowed border-line bg-background text-muted/70"
        }`}
      >
        {allRequested ? "Trailer requested" : "Order trailer"}
      </button>
      {!canOrder && !allRequested && (
        <p className="text-center text-[11px] text-muted">{has ? "Not ready yet" : "Check back soon"}</p>
      )}

      {open && <OrderModal title={title} onClose={() => setOpen(false)} />}
    </div>
  );
}

function OrderModal({ title, onClose }: { title: ExhibitorTitle; onClose: () => void }) {
  const options = title.trailers.flatMap((t) =>
    t.assets
      .filter((a) => a.ready && !a.requested)
      .map((a) => ({
        id: a.id,
        label: `${t.format === "4DX" ? "4DX" : "ScreenX"}${a.version ? ` · ${a.version}` : ""}`,
      }))
  );
  const [picked, setPicked] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(options.map((o) => [o.id, true]))
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const chosen = [...new Set(options.filter((o) => picked[o.id]).map((o) => o.id))];

  const send = () => {
    setError(null);
    startTransition(async () => {
      const results = await Promise.all(
        chosen.map((id) => {
          const fd = new FormData();
          fd.set("trailer_asset_id", String(id));
          return submitTrailerRequest(null, fd);
        })
      );
      const failed = results.find((r) => !r.ok);
      if (failed && !failed.ok) setError(failed.error);
      else setDone(true);
    });
  };

  return (
    <Modal title="Order trailer" onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="text-sm">Request sent. The CJ 4DPLEX team will get in touch once it is ready.</p>
          <div className="flex justify-end">
            <PrimaryButton onClick={onClose}>Close</PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium">{title.name}</p>
          <div className="space-y-1.5">
            {options.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={picked[o.id] ?? false}
                  onChange={(e) => setPicked((p) => ({ ...p, [o.id]: e.target.checked }))}
                />
                {o.label}
              </label>
            ))}
            {chosen.length === 0 && <p className="text-xs text-error">Pick at least one trailer.</p>}
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <SubtleButton disabled={pending} onClick={onClose}>
              Cancel
            </SubtleButton>
            <PrimaryButton disabled={pending || chosen.length === 0} onClick={send}>
              {pending ? "Sending…" : "Send request"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
