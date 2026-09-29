"use client";

// THE ONE FRAME the page display draws: the published page itself, embedded
// live at the width the surface gives it. It loads the page's own public https
// address, already admitted by the model's framable-address rule, and nothing
// of this package's own content. It is sandboxed with no permission at all,
// sends no referrer, and loads lazily.
//
// A site that does not answer is a condition of the embed, never a reading of
// its own: with no framable address, or once the watchdog elapses without a
// load, the frame's own place names the gap, and the changes beneath it are
// drawn as always.

import { type CSSProperties, type ReactNode, useEffect, useState } from "react";

import { FRAME_WATCHDOG_MS, frameState } from "../cms-page-model";

export const PAGE_GAP_MESSAGE = "The page cannot be shown here. The changes are below.";

const frameStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "480px",
  border: "1px solid var(--border, #e5e7eb)",
  borderRadius: "6px",
  background: "var(--background, #ffffff)",
};

const gapStyle: CSSProperties = {
  fontSize: "13px",
  color: "var(--muted-foreground, #6b7280)",
  padding: "16px 12px",
  border: "1px dashed var(--border, #e5e7eb)",
  borderRadius: "6px",
};

export function PageFrame({ address, title }: { address: string | null; title: string }): ReactNode {
  const [loaded, setLoaded] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setElapsedMs(0);
    if (address === null) return undefined;
    const timer = setTimeout(() => setElapsedMs(FRAME_WATCHDOG_MS), FRAME_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, [address]);

  const markLoaded = (): void => setLoaded(true);

  if (address === null || frameState({ address, loaded, elapsedMs }) === "gap") {
    return (
      <div role="status" style={gapStyle} data-cms-page-gap>
        {PAGE_GAP_MESSAGE}
      </div>
    );
  }

  return (
    <iframe src={address} title={title} sandbox="" referrerPolicy="no-referrer" loading="lazy" style={frameStyle} onLoad={markLoaded} data-cms-page-frame />
  );
}
