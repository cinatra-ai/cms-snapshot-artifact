import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CmsFieldsView } from "../src/cms-view";
import CmsSnapshotDetail from "../src/renderers/detail";
import CmsSnapshotPreview from "../src/renderers/preview";
import type { ArtifactRendererProps } from "../src/renderer-props";

function props(over: Partial<ArtifactRendererProps> = {}): ArtifactRendererProps {
  return {
    propsApiVersion: 1,
    artifact: {
      id: "art_1",
      title: "Homepage hero",
      objectType: "@cinatra-ai/objects:cms-content-snapshot",
      mime: "application/vnd.cinatra.cms-fields+json",
      size: 10,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      ownerLevel: "organization",
      visibility: "organization",
      sourceUrl: null,
    },
    representation: { revisionId: "rev_1", mime: "application/vnd.cinatra.cms-fields+json" },
    urls: { preview: "/p", download: "/d" },
    identity: { kind: "extension", extension: "@cinatra-ai/cms-snapshot-artifact" },
    actions: { download: "/d", openInSource: null },
    ...over,
  } as ArtifactRendererProps;
}

describe("CmsFieldsView (loaded snapshot)", () => {
  const snapshot = JSON.stringify({
    "post.title": "New headline",
    "post.content": "The full body copy under review.",
    "post.status": "draft",
  });

  it("renders the reviewed fields read-only with labels, paths, and values", () => {
    const html = renderToStaticMarkup(<CmsFieldsView text={snapshot} />);
    expect(html).toContain("New headline");
    expect(html).toContain("The full body copy under review.");
    expect(html).toContain('data-cms-field="post.title"');
    expect(html).toContain('data-cms-field="post.content"');
    // Labels present.
    expect(html).toContain(">Title<");
    expect(html).toContain(">Content<");
  });

  it("shows the reviewed scope — the covered field paths", () => {
    const html = renderToStaticMarkup(<CmsFieldsView text={snapshot} />);
    expect(html).toContain("data-cms-scope");
    expect(html).toContain("Reviewed scope");
    expect(html).toContain("3 fields under review");
    expect(html).toContain('data-cms-scope-path="post.title"');
    expect(html).toContain('data-cms-scope-path="post.status"');
  });

  it("floors to raw bytes (never blank) on malformed content", () => {
    const html = renderToStaticMarkup(<CmsFieldsView text="totally not json" />);
    expect(html).toContain("data-cms-detail-malformed");
    expect(html).toContain("totally not json");
  });

  it("floors to a notice on an empty field set", () => {
    const html = renderToStaticMarkup(<CmsFieldsView text="{}" />);
    expect(html).toContain("data-cms-detail-nofields");
  });
});

describe("detail + preview renderers (static markup)", () => {
  it("detail renders the header/title and download and never blanks", () => {
    const html = renderToStaticMarkup(<CmsSnapshotDetail {...props()} />);
    expect(html).toContain("data-cms-artifact-detail");
    expect(html).toContain("Homepage hero");
    expect(html).toContain("data-cms-download");
  });

  it("detail with no url shows the no-content floor", () => {
    const html = renderToStaticMarkup(
      <CmsSnapshotDetail {...props({ urls: { preview: null, download: null }, actions: { download: null, openInSource: null } })} />,
    );
    expect(html).toContain("data-cms-detail-empty");
  });

  it("preview with a url renders its shell (never blank)", () => {
    const html = renderToStaticMarkup(<CmsSnapshotPreview {...props()} />);
    expect(html).toContain("data-cms-artifact-preview");
  });
});
