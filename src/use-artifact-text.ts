"use client";

// Shared client hook: fetch an artifact's authorized content as text.
//
// A v1 renderer receives host-authorized URLs (already access-checked) in its
// props snapshot and references them directly — it holds no host ports. This
// hook resolves the preview/download URL to text with same-origin credentials,
// abort-safe against unmount, and reports a total status the renderer maps to a
// never-blank state.

import { useEffect, useState } from "react";

export type ArtifactTextState =
  | { status: "no-content" }
  | { status: "loading" }
  | { status: "loaded"; text: string }
  | { status: "error"; message: string };

/**
 * Fetch `url` as text. `null` url short-circuits to `no-content` (rendered
 * synchronously, so the never-blank floor needs no network round-trip). The
 * fetch is aborted on unmount / url change; a late resolution is ignored.
 */
export function useArtifactText(url: string | null): ArtifactTextState {
  const [state, setState] = useState<ArtifactTextState>(
    url ? { status: "loading" } : { status: "no-content" },
  );

  useEffect(() => {
    if (!url) {
      setState({ status: "no-content" });
      return;
    }
    setState({ status: "loading" });
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(url, { credentials: "same-origin", signal: controller.signal });
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "error", message: `content unavailable (HTTP ${res.status})` });
          return;
        }
        const text = await res.text();
        if (cancelled) return;
        setState({ status: "loaded", text });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({ status: "error", message: "could not load content" });
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url]);

  return state;
}
