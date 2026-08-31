// @vitest-environment node
// BOTH SLOTS DRAW FROM THE CONTENT CHANNEL — the acceptance this wave is for:
// "The json, cms-snapshot and text displays draw through the content channel on
// every host."
//
// The projected snapshot must reach the DRAWN output, on the first-party
// snapshot and on the one a host builds inside a third-party application alike,
// and no request may leave the display while it happens.

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { contentFloorMessage, contentFloorSummary } from "../src/content-view";
import CmsSnapshotDetail from "../src/renderers/detail";
import CmsSnapshotPreview from "../src/renderers/preview";
import { islandProps, noContent, props, textContent } from "./props-fixture";

const SNAPSHOT = JSON.stringify({
  "post.title": "New headline",
  "post.content": "The full body copy under review.",
  "post.status": "draft",
});

/** Render with every network entry point this environment has replaced by a
 * recorder, so a display that reached for one is caught in the act. */
function drawWatched(node: Parameters<typeof renderToStaticMarkup>[0]): {
  html: string;
  calls: number;
} {
  const fetchSpy = vi.fn();
  const xhrSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubGlobal(
    "XMLHttpRequest",
    class {
      constructor() {
        xhrSpy();
      }
    },
  );
  const html = renderToStaticMarkup(node);
  return { html, calls: fetchSpy.mock.calls.length + xhrSpy.mock.calls.length };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the detail slot draws the projected snapshot", () => {
  it("puts the host-projected fields in the drawn output and asks the network for nothing", () => {
    const { html, calls } = drawWatched(<CmsSnapshotDetail {...props(textContent(SNAPSHOT))} />);
    expect(calls).toBe(0);
    expect(html).toContain("New headline");
    expect(html).toContain("The full body copy under review.");
    expect(html).toContain('data-cms-field="post.title"');
    expect(html).not.toContain("aria-busy");
  });

  it("keeps the reviewed scope visible, drawn from the projection", () => {
    const html = renderToStaticMarkup(<CmsSnapshotDetail {...props(textContent(SNAPSHOT))} />);
    expect(html).toContain("data-cms-scope");
    expect(html).toContain("3 fields under review");
  });

  it("draws the same snapshot inside a third-party application, where a session address is unreachable", () => {
    const { html, calls } = drawWatched(<CmsSnapshotDetail {...islandProps(textContent(SNAPSHOT))} />);
    expect(calls).toBe(0);
    expect(html).toContain("New headline");
  });

  it("stamps the props version it was drawn at, so a surface can read which contract it got", () => {
    const html = renderToStaticMarkup(<CmsSnapshotDetail {...props(textContent(SNAPSHOT))} />);
    expect(html).toContain('data-props-api-version="2"');
  });

  it("loads no subresource of its own — no frame, no picture, no address on an element", () => {
    const { html } = drawWatched(<CmsSnapshotDetail {...props(textContent(SNAPSHOT))} />);
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("src=");
  });

  it("offers the byte reference as the download address, which is the one an island reader can use", () => {
    const html = renderToStaticMarkup(<CmsSnapshotDetail {...islandProps(textContent(SNAPSHOT))} />);
    expect(html).toContain("/api/lifecycle-views/artifact-bytes");
  });

  it("says how much of a truncated snapshot it is showing", () => {
    const html = renderToStaticMarkup(
      <CmsSnapshotDetail
        {...props(textContent(SNAPSHOT, { truncated: true, byteLength: 900000, projectedByteLength: 262144 }))}
      />,
    );
    expect(html).toContain("data-cms-detail-truncated");
    expect(html).toContain("262,144");
    expect(html).toContain("900,000");
  });
});

describe("the detail slot floors, named and never blank", () => {
  it("floors with the named reason when the host builds an older props version", () => {
    const html = renderToStaticMarkup(
      <CmsSnapshotDetail {...({ ...props(textContent(SNAPSHOT)), propsApiVersion: 1 } as never)} />,
    );
    expect(html).toContain('data-cms-detail-floor="props-version"');
    expect(html).toContain(contentFloorMessage("props-version"));
    expect(html.replace(/<[^>]*>/g, "").trim().length).toBeGreaterThan(0);
  });

  it("floors with the named reason when the surface handed it no projection", () => {
    const { content: _dropped, ...rest } = props(textContent(SNAPSHOT));
    const html = renderToStaticMarkup(<CmsSnapshotDetail {...(rest as never)} />);
    expect(html).toContain('data-cms-detail-floor="content-unavailable"');
  });

  it("floors with the channel's own named absence", () => {
    const html = renderToStaticMarkup(<CmsSnapshotDetail {...props(noContent("over-cap"))} />);
    expect(html).toContain('data-cms-detail-floor="content-over-cap"');
    expect(html).toContain(contentFloorMessage("content-over-cap"));
  });

  it("still draws its header, and never throws, on a snapshot that is barely one", () => {
    const html = renderToStaticMarkup(<CmsSnapshotDetail {...({ propsApiVersion: 2 } as never)} />);
    expect(html).toContain("data-cms-artifact-detail");
    expect(html).toContain('data-cms-detail-floor="content-unavailable"');
  });
});

describe("the preview slot draws the projected snapshot", () => {
  it("summarizes the host-projected fields and asks the network for nothing", () => {
    const { html, calls } = drawWatched(<CmsSnapshotPreview {...props(textContent(SNAPSHOT))} />);
    expect(calls).toBe(0);
    expect(html).toContain("data-cms-preview-summary");
    expect(html).not.toContain("aria-busy");
  });

  it("floors with the named reason, in one compact line", () => {
    const html = renderToStaticMarkup(<CmsSnapshotPreview {...props(noContent("absent"))} />);
    expect(html).toContain('data-cms-preview-floor="content-absent"');
    expect(html).toContain(contentFloorSummary("content-absent"));
  });

  it("loads no subresource of its own", () => {
    const { html } = drawWatched(<CmsSnapshotPreview {...props(textContent(SNAPSHOT))} />);
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("src=");
  });
});
