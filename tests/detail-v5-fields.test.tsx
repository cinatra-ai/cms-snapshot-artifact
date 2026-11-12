// @vitest-environment node
// The detail display admits the decision-only snapshot of props version 5 and
// projects its content fields onto the version 2 content reader. These arms
// hold that for the CMS-fields form, the one form this package draws: at
// version 5 the field list draws exactly as at version 2, apart from its
// version attribute, and no review fact becomes a sentence on the page.

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveArtifactTextView } from "../src/content-view";
import CmsSnapshotDetail from "../src/renderers/detail";
import CmsSnapshotPreview from "../src/renderers/preview";
import { props, textContent } from "./props-fixture";

const SNAPSHOT = JSON.stringify({
  "post.title": "New headline",
  "post.content": "The full body copy under review.",
  "post.status": "draft",
});

type Snapshot = ReturnType<typeof props> & Record<string, unknown>;

const legacy = (): Snapshot => props(textContent(SNAPSHOT)) as Snapshot;

const v5 = (
  review: unknown = { reading: "continued", openLive: "https://acme.example/pricing", decidedAt: "2026-10-07T09:20:00.000Z" },
): Snapshot =>
  ({
    ...legacy(),
    propsApiVersion: 5,
    review,
    edit: { kind: "read-only", channelVersion: 2, reason: "read-only-surface" },
  }) as unknown as Snapshot;

const render = (snapshot: unknown): string => renderToStaticMarkup(<CmsSnapshotDetail {...(snapshot as never)} />);

const normalizeVersion = (html: string): string =>
  html.replace('data-props-api-version="5"', 'data-props-api-version="2"');

const assertNoPublicationSentence = (html: string): void => {
  expect(html).not.toContain("The change went to the site");
  expect(html).not.toContain("published it at");
  expect(html).not.toContain("09:20");
  expect(html).not.toMatch(/continued|decided on the revision above/i);
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("decision-only detail snapshots of the CMS-fields form", () => {
  it("admits v5 and draws the same field list as v2, read-only, from a frozen input", () => {
    const snapshot = v5();
    const before = JSON.stringify(snapshot);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const html = render(snapshot);
    expect(html).toContain('data-props-api-version="5"');
    expect(html).not.toContain("data-cms-detail-floor");
    expect(normalizeVersion(html)).toBe(render(legacy()));
    expect(html).toContain("New headline");
    expect(html).toContain('data-cms-field="post.title"');
    expect(html).toContain("3 fields under review");
    expect(html).not.toMatch(/<button|<input|<textarea|contenteditable/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(snapshot)).toBe(before);
    assertNoPublicationSentence(html);
  });

  it("never derives a publication sentence from decision-only, malformed or unassigned review facts", () => {
    const reviews: unknown[] = [
      undefined,
      null,
      {},
      { reading: "continued", openLive: "https://acme.example/pricing" },
      { reading: "continued", decidedAt: null },
      { reading: "continued", decidedAt: "not a time" },
      { reading: "pending", openLive: null, decidedAt: "2026-10-07T09:20:00.000Z" },
      { reading: "rejected", decidedAt: "2026-10-07T09:20:00.000Z" },
      { reading: "superseded", decidedAt: "2026-10-07T09:20:00.000Z" },
      {
        reading: "continued",
        decidedAt: "2026-10-07T09:20:00.000Z",
        effect: { recordedAt: "2026-10-08T09:20:00.000Z", record: { published: true, publishedAt: "2026-10-08T09:20:00.000Z" } },
      },
    ];
    for (const review of reviews) {
      const html = render(v5(review));
      expect(normalizeVersion(html)).toBe(render(legacy()));
      assertNoPublicationSentence(html);
    }
  });

  it("does not draw the artifact's ordinary timestamps", () => {
    const times = { createdAt: "2026-10-05T04:02:00.000Z", updatedAt: "2026-10-06T05:03:00.000Z" };
    const snapshot = v5();
    snapshot.artifact = { ...snapshot.artifact, ...times };
    const html = render(snapshot);
    expect(normalizeVersion(html)).toBe(render({ ...legacy(), artifact: { ...legacy().artifact, ...times } }));
    for (const time of Object.values(times)) expect(html).not.toContain(time);
    assertNoPublicationSentence(html);
  });

  it("keeps strict content floors when v5 carries mismatched or invalid content", () => {
    const cases = [
      { overrides: { representationRevisionId: "another-revision" }, reason: "content-revision-mismatch" },
      { overrides: { channelVersion: 2 }, reason: "channel-version" },
      { overrides: { cap: 0 }, reason: "invalid-content-projection" },
      { overrides: { projectedByteLength: -1 }, reason: "invalid-content-projection" },
      { overrides: { truncated: true }, reason: "invalid-content-projection" },
    ];
    for (const { overrides, reason } of cases) {
      const snapshot = v5();
      snapshot.content = { ...snapshot.content, ...overrides } as typeof snapshot.content;
      const html = render(snapshot);
      expect(html).toContain(`data-cms-detail-floor="${reason}"`);
      expect(html).not.toContain("New headline");
      assertNoPublicationSentence(html);
    }
  });

  it("leaves preview and the shared resolver strictly at v2 and refuses unknown detail versions", () => {
    expect(render(legacy())).toContain('data-props-api-version="2"');
    const preview = renderToStaticMarkup(<CmsSnapshotPreview {...legacy()} />);
    expect(preview).toContain('data-props-api-version="2"');
    expect(preview).toContain("data-cms-preview-summary");
    expect(preview).not.toContain("data-cms-preview-floor");
    expect(renderToStaticMarkup(<CmsSnapshotPreview {...(v5() as never)} />)).toContain(
      'data-cms-preview-floor="props-version"',
    );
    expect(resolveArtifactTextView(v5() as never)).toEqual({ kind: "floor", reason: "props-version" });
    for (const version of [undefined, 1, 3, 4, 6, 99, "5", Number.NaN]) {
      const html = render({ ...legacy(), propsApiVersion: version });
      expect(html).toContain('data-cms-detail-floor="props-version"');
      expect(html).not.toContain("New headline");
      assertNoPublicationSentence(html);
    }
  });
});
