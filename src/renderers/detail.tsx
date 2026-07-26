"use client";

// The `detail` slot renderer for application/vnd.cinatra.cms-fields+json.
//
// The full review-target view of a CMS content snapshot: the reviewed fields
// (title / content / …) presented READ-ONLY, with the reviewed SCOPE (the closed
// set of field paths the connector placed under review) shown explicitly so a
// human can SEE and DECIDE the change from the page. Requests no host ports;
// renders only from the authorized props snapshot; a never-blank floor for every
// state (no content, loading, fetch error, malformed bytes shown raw, and an
// empty field set — the loaded/malformed/empty rendering lives in `CmsFieldsView`).

import { type CSSProperties, type ReactNode } from "react";

import { CmsFieldsView } from "../cms-view";
import { type ArtifactRendererProps } from "../renderer-props";
import { useArtifactText } from "../use-artifact-text";

const wrapStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 };

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const titleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--foreground, #111827)",
  margin: 0,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const linkStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--primary, #2563eb)",
  textDecoration: "none",
  flex: "none",
};

const noticeStyle: CSSProperties = {
  fontFamily:
    'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace)',
  fontSize: "12px",
  color: "var(--muted-foreground, #6b7280)",
  padding: "8px 0",
};

const skeletonStyle: CSSProperties = {
  height: "96px",
  borderRadius: "6px",
  background: "var(--muted, #f3f4f6)",
  opacity: 0.7,
};

function Body({ url }: { url: string | null }): ReactNode {
  const state = useArtifactText(url);
  switch (state.status) {
    case "no-content":
      return (
        <div style={noticeStyle} data-cms-detail-empty>
          No CMS content is available for this snapshot.
        </div>
      );
    case "loading":
      return <div style={skeletonStyle} aria-busy="true" data-cms-detail-loading />;
    case "error":
      return (
        <div style={noticeStyle} data-cms-detail-error>
          {state.message}.
        </div>
      );
    case "loaded":
      return <CmsFieldsView text={state.text} />;
  }
}

/**
 * The default-exported detail renderer. The host mounts this in the main realm
 * with the shared React singleton; it owns no React root.
 */
export default function CmsSnapshotDetail(props: ArtifactRendererProps): ReactNode {
  const url = props.urls.preview ?? props.urls.download;
  const title = props.artifact.title ?? "CMS content snapshot";
  const download = props.actions.download ?? props.urls.download;
  return (
    <div style={wrapStyle} data-cms-artifact-detail>
      <div style={headerStyle}>
        <p style={titleStyle} title={title}>
          {title}
        </p>
        {download ? (
          <a style={linkStyle} href={download} download data-cms-download>
            Download
          </a>
        ) : null}
      </div>
      <Body url={url} />
    </div>
  );
}
