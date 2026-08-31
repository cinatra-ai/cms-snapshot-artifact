// @vitest-environment node
// THE RESOLVER'S WHOLE MATRIX — the one decision leaf this package's slots share.
//
// It is TOTAL, so every branch is named here: the content it draws, and each
// separate reason it cannot. A floor that is reached by no test is a floor a
// reader could meet without anyone having read the sentence it shows them.

import { describe, expect, it } from "vitest";

import { ARTIFACT_CONTENT_CHANNEL_VERSION } from "../src/artifact-content-channel";
import {
  byteDownloadHref,
  contentFloorMessage,
  contentFloorSummary,
  resolveArtifactTextView,
  type ContentFloorReason,
} from "../src/content-view";
import { PROPS_API_VERSION } from "../src/renderer-props";
import { ISLAND_BYTE_ADDRESS, islandProps, noContent, props, REVISION_ID, textContent } from "./props-fixture";

const ALL_REASONS: ContentFloorReason[] = [
  "malformed-props",
  "props-version",
  "channel-version",
  "content-unavailable",
  "content-absent",
  "content-over-cap",
  "content-unsupported-form",
  "content-not-text",
  "content-revision-mismatch",
  "invalid-content-projection",
  "empty-content",
];

const SAMPLE = '{"post.title":"New headline","post.content":"The full body copy under review."}';

describe("the content channel this display reads", () => {
  it("is read at channel version 1", () => {
    expect(ARTIFACT_CONTENT_CHANNEL_VERSION).toBe(1);
  });

  it("is carried on a snapshot at the props version this display declares", () => {
    expect(PROPS_API_VERSION).toBe(2);
  });
});

describe("resolveArtifactTextView — the content it draws", () => {
  it("draws the text the host projected, from the props and from nowhere else", () => {
    const view = resolveArtifactTextView(props(textContent(SAMPLE)));
    expect(view).toEqual({
      kind: "text",
      text: SAMPLE,
      revisionId: REVISION_ID,
      truncated: false,
      byteLength: Buffer.byteLength(SAMPLE, "utf8"),
      projectedByteLength: Buffer.byteLength(SAMPLE, "utf8"),
    });
  });

  it("draws the same text inside a third-party application, where no session address is reachable", () => {
    const view = resolveArtifactTextView(islandProps(textContent(SAMPLE)));
    expect(view.kind).toBe("text");
    expect(view.kind === "text" ? view.text : null).toBe(SAMPLE);
  });

  it("carries the host's truncation facts through, so the reader is told what they are seeing", () => {
    const view = resolveArtifactTextView(
      props(textContent(SAMPLE, { truncated: true, byteLength: 900_000, projectedByteLength: 262_144 })),
    );
    expect(view.kind === "text" ? view.truncated : null).toBe(true);
    expect(view.kind === "text" ? view.byteLength : null).toBe(900_000);
    expect(view.kind === "text" ? view.projectedByteLength : null).toBe(262_144);
  });
});

describe("resolveArtifactTextView — the named floors, never a blank", () => {
  function reasonFor(input: unknown): ContentFloorReason | null {
    const view = resolveArtifactTextView(input as never);
    return view.kind === "floor" ? view.reason : null;
  }

  it("floors when the host builds an OLDER props version, which carries no content field", () => {
    expect(reasonFor({ ...props(textContent(SAMPLE)), propsApiVersion: 1 })).toBe("props-version");
  });

  it("floors when the snapshot does not say which version it was built at", () => {
    const { propsApiVersion: _dropped, ...rest } = props(textContent(SAMPLE));
    expect(reasonFor(rest)).toBe("props-version");
  });

  it("floors when the surface handed the display NO projection at all", () => {
    const { content: _dropped, ...rest } = props(textContent(SAMPLE));
    expect(reasonFor(rest)).toBe("content-unavailable");
  });

  it("holds an unwired surface APART from an artifact that stores nothing", () => {
    const { content: _dropped, ...rest } = props(textContent(SAMPLE));
    expect(reasonFor(rest)).not.toBe(reasonFor(props(noContent("absent"))));
  });

  it("floors on a projection built at a channel version it does not read", () => {
    expect(reasonFor(props(textContent(SAMPLE, { channelVersion: 2 })))).toBe("channel-version");
  });

  it("names each absence the channel reports", () => {
    expect(reasonFor(props(noContent("absent")))).toBe("content-absent");
    expect(reasonFor(props(noContent("over-cap")))).toBe("content-over-cap");
    expect(reasonFor(props(noContent("unsupported-form")))).toBe("content-unsupported-form");
  });

  it("floors on an absence spelled in a way this channel version does not define", () => {
    expect(reasonFor(props({ ...noContent("absent"), reason: "vanished" } as never))).toBe(
      "invalid-content-projection",
    );
  });

  it("floors on every projection class that is not text", () => {
    const shared = { channelVersion: 1, representationRevisionId: REVISION_ID, byteLength: 4, projectedByteLength: 4, cap: 4096 };
    expect(reasonFor(props({ kind: "configuration", configuration: {}, digest: "d", ...shared } as never))).toBe("content-not-text");
    expect(reasonFor(props({ kind: "page", pageVersion: 1, page: {}, ...shared } as never))).toBe("content-not-text");
    expect(
      reasonFor(props({ kind: "object", source: "snapshot", objectType: "t", data: {}, digest: "d", ...shared } as never)),
    ).toBe("content-not-text");
  });

  it("floors on a projection of a kind this display does not know at all", () => {
    expect(reasonFor(props({ kind: "hologram", channelVersion: 1 } as never))).toBe("invalid-content-projection");
  });

  it("floors on a text projection that is missing a field it must believe", () => {
    const { encoding: _dropped, ...incomplete } = textContent(SAMPLE) as Record<string, unknown>;
    expect(reasonFor(props(incomplete as never))).toBe("invalid-content-projection");
  });

  it("refuses to label one revision's content with another revision's name", () => {
    expect(reasonFor(props(textContent(SAMPLE, { representationRevisionId: "rev_other" })))).toBe(
      "content-revision-mismatch",
    );
  });

  it("floors when the snapshot has no materialized representation to agree with", () => {
    expect(reasonFor(props(textContent(SAMPLE), { representation: null }))).toBe("content-revision-mismatch");
  });

  it("floors, rather than drawing an empty panel, on an empty projection", () => {
    expect(reasonFor(props(textContent("   \n  ")))).toBe("empty-content");
  });

  it("is TOTAL: it returns a view for an input that is not a snapshot at all", () => {
    expect(reasonFor(null)).toBe("malformed-props");
    expect(reasonFor(undefined)).toBe("malformed-props");
    expect(reasonFor([])).toBe("malformed-props");
    expect(reasonFor("a string")).toBe("malformed-props");
    expect(reasonFor(7)).toBe("malformed-props");
  });

  it("never throws on any of them", () => {
    for (const input of [null, undefined, [], "x", 7, {}, { propsApiVersion: 2 }]) {
      expect(() => resolveArtifactTextView(input as never)).not.toThrow();
    }
  });
});

describe("the floor sentences", () => {
  it("gives every reason its own non-empty full sentence", () => {
    const messages = ALL_REASONS.map(contentFloorMessage);
    expect(messages.every((m) => m.trim().length > 0)).toBe(true);
    expect(new Set(messages).size).toBe(ALL_REASONS.length);
  });

  it("gives every reason its own non-empty compact line", () => {
    const summaries = ALL_REASONS.map(contentFloorSummary);
    expect(summaries.every((m) => m.trim().length > 0)).toBe(true);
    expect(new Set(summaries).size).toBe(ALL_REASONS.length);
  });
});

describe("byteDownloadHref — the address a reader may be handed", () => {
  it("prefers the snapshot's byte reference over the session address", () => {
    const snapshot = props(textContent(SAMPLE), {
      bytes: { road: "island", preview: ISLAND_BYTE_ADDRESS, download: ISLAND_BYTE_ADDRESS },
    });
    expect(byteDownloadHref(snapshot)).toBe(ISLAND_BYTE_ADDRESS);
  });

  it("is the island address inside a third-party application, where the session address is gone", () => {
    expect(byteDownloadHref(islandProps(textContent(SAMPLE)))).toBe(ISLAND_BYTE_ADDRESS);
  });

  it("falls back to the session action when an older snapshot carries no byte reference", () => {
    const { bytes: _dropped, ...rest } = props(textContent(SAMPLE));
    expect(byteDownloadHref(rest as never)).toBe("/api/artifacts/art_1/versions/rev_1/content");
  });

  it("is null, never undefined-shaped, when there is no address at all", () => {
    expect(byteDownloadHref(null)).toBeNull();
    expect(
      byteDownloadHref(props(textContent(SAMPLE), { bytes: undefined, actions: { download: null, openInSource: null }, urls: { preview: null, download: null } })),
    ).toBeNull();
  });
});

describe("the projection's arithmetic is checked before it is quoted to a reader", () => {
  // THIS DISPLAY STATES THESE NUMBERS AS FACT — "showing the first N of M
  // bytes" — so a projection whose numbers cannot all be true must never reach
  // that sentence. Each case below produced a drawn, false statement before the
  // resolver measured what it was handed.
  const impossible: Array<[string, Partial<Parameters<typeof textContent>[1]>]> = [
    ["a negative prefix", { truncated: true, byteLength: 1, projectedByteLength: -1 }],
    ["a prefix that is not a number at all", { projectedByteLength: Number.NaN, byteLength: Number.NaN }],
    ["an infinite whole", { truncated: true, byteLength: Number.POSITIVE_INFINITY }],
    ["a fractional byte count", { truncated: true, byteLength: 10.5, projectedByteLength: 4 }],
    ["a prefix larger than the whole", { truncated: true, byteLength: 4, projectedByteLength: 9 }],
    ["a prefix larger than the cap it was built under", { truncated: true, byteLength: 99, projectedByteLength: 40, cap: 8 }],
    ["a missing cap", { cap: undefined as unknown as number }],
    ["a cap of nothing", { cap: 0 }],
    ["a truncation the numbers deny", { truncated: true, byteLength: 4, projectedByteLength: 4 }],
    ["a whole the truncation flag denies", { truncated: false, byteLength: 900, projectedByteLength: 4 }],
  ];

  for (const [what, overrides] of impossible) {
    it(`floors, named, on ${what}`, () => {
      const view = resolveArtifactTextView(props(textContent("some drawn text", overrides)));
      expect(view.kind).toBe("floor");
      if (view.kind !== "floor") return;
      expect(view.reason).toBe("invalid-content-projection");
      expect(contentFloorMessage(view.reason).trim().length).toBeGreaterThan(0);
    });
  }

  it("still draws a projection whose numbers are all consistent", () => {
    const whole = resolveArtifactTextView(props(textContent("some drawn text")));
    expect(whole.kind).toBe("text");

    const prefix = resolveArtifactTextView(
      props(textContent("some drawn text", { truncated: true, byteLength: 4096 })),
    );
    expect(prefix.kind).toBe("text");
    if (prefix.kind !== "text") return;
    expect(prefix.truncated).toBe(true);
    expect(prefix.projectedByteLength).toBeLessThan(prefix.byteLength);
  });
});
