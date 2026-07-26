"use client";

// The `preview` slot renderer for application/vnd.cinatra.cms-fields+json.
//
// The neutral inline-preview capability consumed by in-core reuse sites: a
// single legible line summarizing the snapshot (field count + title/first
// fields), degrading to a raw notice when the bytes are not a CMS-fields object.
// Never blank. Requests no host ports; renders only from the authorized props
// snapshot.

import { type CSSProperties, type ReactNode } from "react";

import { summarizeCms } from "../cms-model";
import { type ArtifactRendererProps } from "../renderer-props";
import { useArtifactText } from "../use-artifact-text";

const shellStyle: CSSProperties = { display: "flex", alignItems: "center", minWidth: 0, maxWidth: "100%" };

const mutedStyle: CSSProperties = {
  fontFamily:
    'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace)',
  fontSize: "12px",
  color: "var(--muted-foreground, #6b7280)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const skeletonStyle: CSSProperties = {
  height: "16px",
  width: "180px",
  borderRadius: "4px",
  background: "var(--muted, #f3f4f6)",
  opacity: 0.7,
};

function Body({ url }: { url: string | null }): ReactNode {
  const state = useArtifactText(url);
  switch (state.status) {
    case "no-content":
      return (
        <span style={mutedStyle} data-cms-preview-empty>
          No CMS content
        </span>
      );
    case "loading":
      return <span style={skeletonStyle} aria-busy="true" data-cms-preview-loading />;
    case "error":
      return (
        <span style={mutedStyle} data-cms-preview-error>
          content unavailable
        </span>
      );
    case "loaded":
      return (
        <span style={mutedStyle} data-cms-preview-summary>
          {summarizeCms(state.text)}
        </span>
      );
  }
}

/**
 * The default-exported preview renderer. Mounted in the main realm with the
 * shared React singleton; owns no React root.
 */
export default function CmsSnapshotPreview(props: ArtifactRendererProps): ReactNode {
  const url = props.urls.preview ?? props.urls.download;
  return (
    <div style={shellStyle} data-cms-artifact-preview>
      <Body url={url} />
    </div>
  );
}
