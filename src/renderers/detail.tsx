"use client";

// The `detail` slot renderer for application/vnd.cinatra.cms-fields+json.
//
// The full review-target view of a CMS content snapshot: the reviewed fields
// (title / content / …) presented READ-ONLY, with the reviewed SCOPE (the closed
// set of field paths the connector placed under review) shown explicitly so a
// human can SEE and DECIDE the change from the page.
//
// IT DRAWS FROM THE CONTENT CHANNEL AND FROM NOTHING ELSE. The snapshot arrives
// on these props, read from the pinned revision on the server and capped there —
// this display makes no request of its own, on any road. That is what lets a
// reviewer read the change inside a third-party application, where a display
// reaching for bytes from the browser carries no credential and paints an empty
// plate.
//
// NEVER BLANK, NEVER THROWN: content it cannot draw becomes a named floor; the
// loaded / malformed / empty renderings live in `CmsFieldsView`, and the page
// content form an agent extension files is drawn by `CmsPageView`.

import { type CSSProperties, type ReactNode } from "react";

import { CmsPageView } from "../cms-page-view";
import { CmsFieldsView } from "../cms-view";
import {
  byteDownloadHref,
  contentFloorMessage,
  resolveArtifactTextView,
  type ArtifactTextView,
} from "../content-view";
import { PROPS_API_VERSION, type ArtifactRendererProps } from "../renderer-props";

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

function Body({ view }: { view: Exclude<ArtifactTextView, { kind: "page" }> }): ReactNode {
  if (view.kind === "floor") {
    return (
      <div style={noticeStyle} data-cms-detail-floor={view.reason}>
        {contentFloorMessage(view.reason)}
      </div>
    );
  }
  return (
    <>
      <CmsFieldsView text={view.text} />
      {view.truncated ? (
        <p style={noticeStyle} data-cms-detail-truncated>
          {`Showing the first ${view.projectedByteLength.toLocaleString("en-US")} of ${view.byteLength.toLocaleString("en-US")} bytes. Download it to read the whole of it.`}
        </p>
      ) : null}
    </>
  );
}

/**
 * The default-exported detail renderer. The host mounts this in the main realm
 * with the shared React singleton; it owns no React root.
 */
export default function CmsSnapshotDetail(props: ArtifactRendererProps): ReactNode {
  const view = resolveArtifactTextView(props);
  if (view.kind === "page") {
    // THE PAGE CONTENT FORM is one view: the page in its frame, the changes
    // beneath it and the link under them — nothing else around it.
    return (
      <div style={wrapStyle} data-cms-artifact-detail data-props-api-version={PROPS_API_VERSION}>
        <CmsPageView page={view.page} revisionId={view.revisionId} />
      </div>
    );
  }
  const title = props?.artifact?.title ?? "CMS content snapshot";
  const download = byteDownloadHref(props);
  return (
    <div style={wrapStyle} data-cms-artifact-detail data-props-api-version={PROPS_API_VERSION}>
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
      <Body view={view} />
    </div>
  );
}
