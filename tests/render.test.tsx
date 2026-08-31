import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CmsFieldsView } from "../src/cms-view";
import CmsSnapshotDetail from "../src/renderers/detail";
import CmsSnapshotPreview from "../src/renderers/preview";
import { noContent, props, textContent } from "./props-fixture";

const SNAPSHOT = JSON.stringify({
  "post.title": "New headline",
  "post.content": "The full body copy under review.",
  "post.status": "draft",
});

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
  it("detail draws the projected snapshot with its header/title and download", () => {
    const html = renderToStaticMarkup(<CmsSnapshotDetail {...props(textContent(SNAPSHOT))} />);
    expect(html).toContain("data-cms-artifact-detail");
    expect(html).toContain("Homepage hero");
    expect(html).toContain("data-cms-download");
    expect(html).toContain("New headline");
  });

  it("detail floors, named and never blank, when the channel has nothing to give it", () => {
    const html = renderToStaticMarkup(<CmsSnapshotDetail {...props(noContent("absent"))} />);
    expect(html).toContain('data-cms-detail-floor="content-absent"');
    expect(html.replace(/<[^>]*>/g, "").trim().length).toBeGreaterThan(0);
  });

  it("preview draws its shell and a summary of the projected snapshot", () => {
    const html = renderToStaticMarkup(<CmsSnapshotPreview {...props(textContent(SNAPSHOT))} />);
    expect(html).toContain("data-cms-artifact-preview");
    expect(html).toContain("data-cms-preview-summary");
  });

  it("neither slot draws a loading state — there is nothing to wait for", () => {
    expect(renderToStaticMarkup(<CmsSnapshotDetail {...props(textContent(SNAPSHOT))} />)).not.toContain(
      "aria-busy",
    );
    expect(renderToStaticMarkup(<CmsSnapshotPreview {...props(textContent(SNAPSHOT))} />)).not.toContain(
      "aria-busy",
    );
  });
});
