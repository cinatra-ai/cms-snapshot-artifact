// THE DECISION LEAF every slot of this package shares: it maps the authorized
// host snapshot to exactly one of two outcomes, and it is the only place in this
// package that reads the content channel.
//
//   `text` — the pinned text the host projected, with what the channel said
//     about it (the revision it was read from, and whether the host cut it to
//     its cap).
//   `floor` — a NAMED reason it cannot be drawn. Never blank, never a throw: a
//     display that threw would take the surface around it down with it.
//
// TOTAL: every input returns a view, including an input that is not a snapshot
// at all. Nothing here reaches the network, and nothing downstream of it does
// either — the whole point of the channel is that the content is already here.

import {
  ARTIFACT_CONTENT_CHANNEL_VERSION,
  type ArtifactContentProjection,
} from "./artifact-content-channel";
import { PROPS_API_VERSION, type ArtifactRendererProps } from "./renderer-props";

/** Why this display is drawing a floor instead of the content. */
export type ContentFloorReason =
  | "malformed-props"
  | "props-version"
  | "channel-version"
  | "content-unavailable"
  | "content-absent"
  | "content-over-cap"
  | "content-unsupported-form"
  | "content-not-text"
  | "content-revision-mismatch"
  | "invalid-content-projection"
  | "empty-content";

/** What this display can be showing. */
export type ArtifactTextView =
  | {
      kind: "text";
      /** The pinned text, exactly as the channel projected it. */
      text: string;
      /** The revision the channel read the text from. */
      revisionId: string;
      truncated: boolean;
      byteLength: number;
      projectedByteLength: number;
    }
  | { kind: "floor"; reason: ContentFloorReason };

/** A display must never throw on a shape it did not expect, so the input is
 * accepted loosely and every surprise lands on the floor. */
export type ArtifactTextViewInput = Partial<ArtifactRendererProps> | null | undefined;

const FLOOR_MESSAGES: Record<ContentFloorReason, string> = {
  "malformed-props": "This CMS snapshot cannot be drawn: the view was opened without anything to show.",
  "props-version":
    "This CMS snapshot cannot be drawn: it was handed a snapshot of a version this display does not read.",
  "channel-version":
    "This CMS snapshot cannot be drawn: its content arrived in a form of the content channel this display does not read.",
  "content-unavailable": "This CMS snapshot cannot be drawn here: this view was not given the content to show.",
  "content-absent": "No content is available to show for the revision being viewed.",
  "content-over-cap": "This CMS snapshot is too large to show here. Download it to read the whole of it.",
  "content-unsupported-form": "This artifact is not text, so this view has nothing to draw.",
  "content-not-text":
    "This artifact holds something other than a text document, so this view has nothing to draw.",
  "content-revision-mismatch":
    "This CMS snapshot cannot be drawn: the content handed to this view was read from a different revision than the one being viewed.",
  "invalid-content-projection": "This CMS snapshot cannot be drawn: the content handed to this view is incomplete.",
  "empty-content": "This CMS snapshot is empty.",
};

const FLOOR_SUMMARIES: Record<ContentFloorReason, string> = {
  "malformed-props": "nothing to show",
  "props-version": "unsupported snapshot version",
  "channel-version": "unsupported content version",
  "content-unavailable": "content not supplied",
  "content-absent": "no content",
  "content-over-cap": "too large to preview",
  "content-unsupported-form": "not text",
  "content-not-text": "not a text document",
  "content-revision-mismatch": "revision mismatch",
  "invalid-content-projection": "content incomplete",
  "empty-content": "empty",
};

/** The sentence a reader sees for a floor on the full view. One per reason. */
export function contentFloorMessage(reason: ContentFloorReason): string {
  return FLOOR_MESSAGES[reason] ?? FLOOR_MESSAGES["malformed-props"];
}

/** The compact line a floor gets on the one-line slot. One per reason. */
export function contentFloorSummary(reason: ContentFloorReason): string {
  return FLOOR_SUMMARIES[reason] ?? FLOOR_SUMMARIES["malformed-props"];
}

/** The address this display may hand a reader for the bytes themselves.
 *
 * The byte reference the snapshot carries is preferred over the session hrefs:
 * on a cookie surface the two are the same address, and inside a third-party
 * application only the first one is reachable. Absent at an older props version,
 * which is why it is read defensively and never assumed. */
export function byteDownloadHref(props: ArtifactTextViewInput): string | null {
  if (props === null || props === undefined || typeof props !== "object") return null;
  const snapshot = props as Partial<ArtifactRendererProps>;
  return snapshot.bytes?.download ?? snapshot.actions?.download ?? snapshot.urls?.download ?? null;
}

/** A byte count the channel may honestly state: a whole, finite, non-negative
 * number. `NaN`, an infinity and a fraction are all rejected here rather than
 * reaching a sentence a reader would read as fact. */
function isByteCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function floor(reason: ContentFloorReason): ArtifactTextView {
  return { kind: "floor", reason };
}

/** Resolve what to draw. Total: it returns a view for every input. */
export function resolveArtifactTextView(props: ArtifactTextViewInput): ArtifactTextView {
  if (props === null || props === undefined || typeof props !== "object" || Array.isArray(props)) {
    return floor("malformed-props");
  }

  const snapshot = props as Partial<ArtifactRendererProps>;

  // STRICT, in both directions: a snapshot that does not SAY which version it
  // was built at is as unreadable as one built at another version. The host
  // resolves the display, reads the version it declares, and builds the
  // snapshot at that version — so a snapshot without that stamp, or at an older
  // one that has no content field to read, is not one this display agreed to.
  if (snapshot.propsApiVersion !== PROPS_API_VERSION) {
    return floor("props-version");
  }

  const content = snapshot.content as ArtifactContentProjection | undefined;
  if (content === null || content === undefined || typeof content !== "object") {
    // The snapshot carried no projection at all — a surface that does not hand
    // its displays content. Held APART from a projection that says, itself,
    // that there is nothing stored: this display must never report an unwired
    // surface as an artifact with nothing in it.
    return floor("content-unavailable");
  }

  // The channel's OWN version is checked before anything on the projection is
  // read, `none` included: a projection built at another channel version may
  // spell its own absence differently, and reading it at this shape would be a
  // guess.
  if (content.channelVersion !== ARTIFACT_CONTENT_CHANNEL_VERSION) {
    return floor("channel-version");
  }

  const projection = content as { [key: string]: unknown };
  const kind = projection.kind;

  if (kind === "none") {
    const reason = projection.reason;
    if (reason === "over-cap") return floor("content-over-cap");
    if (reason === "unsupported-form") return floor("content-unsupported-form");
    if (reason === "absent") return floor("content-absent");
    return floor("invalid-content-projection");
  }

  if (kind === "configuration" || kind === "page" || kind === "object") {
    return floor("content-not-text");
  }

  if (kind !== "text") {
    return floor("invalid-content-projection");
  }

  const text = projection.text;
  const contentRevisionId = projection.representationRevisionId;
  const byteLength = projection.byteLength;
  const projectedByteLength = projection.projectedByteLength;
  const truncated = projection.truncated;
  const cap = projection.cap;
  if (
    typeof text !== "string" ||
    typeof contentRevisionId !== "string" ||
    contentRevisionId.length === 0 ||
    typeof truncated !== "boolean" ||
    projection.encoding !== "utf-8"
  ) {
    return floor("invalid-content-projection");
  }

  // THE MEASUREMENTS ARE CHECKED, NOT TAKEN ON TRUST. This display quotes these
  // two numbers back to a reader as "the first N of M bytes", so a projection
  // whose arithmetic is impossible would have this display state a falsehood
  // about the work under review — `NaN`, a negative prefix, or a prefix larger
  // than the whole. A projection that cannot be true is floored, named, rather
  // than drawn with a sentence that cannot be true either.
  if (
    !isByteCount(byteLength) ||
    !isByteCount(projectedByteLength) ||
    !isByteCount(cap) ||
    cap === 0 ||
    projectedByteLength > byteLength ||
    projectedByteLength > cap
  ) {
    return floor("invalid-content-projection");
  }

  // TRUNCATION AND THE NUMBERS AGREE, or neither is believed: `truncated` says
  // the text is a PREFIX of a larger content, which is true exactly when fewer
  // bytes are carried than the revision holds. The two disagreeing means one of
  // them is wrong and this display cannot tell which.
  if (truncated !== projectedByteLength < byteLength) {
    return floor("invalid-content-projection");
  }

  // THE PINNED REVISION AND THE DRAWN REVISION ARE THE SAME ONE, or nothing is
  // drawn. The surface says which revision it is showing; the channel says
  // which revision it read the content from. If those disagree — or if the
  // artifact has no materialized representation at all while the projection
  // claims one — this display would be labelling one revision's content with
  // another's, and that is worse than drawing nothing.
  const representation = snapshot.representation as { revisionId?: unknown } | null | undefined;
  if (
    representation === null ||
    representation === undefined ||
    typeof representation !== "object" ||
    representation.revisionId !== contentRevisionId
  ) {
    return floor("content-revision-mismatch");
  }

  if (text.trim().length === 0) {
    return floor("empty-content");
  }

  return {
    kind: "text",
    text,
    revisionId: contentRevisionId,
    truncated,
    byteLength,
    projectedByteLength,
  };
}
