// @vitest-environment node
// THE PROPS VERSION IS ONE NUMBER, DECLARED IN THREE PLACES, and they may never
// drift: the module constant the display checks a snapshot against, the
// `propsApiVersion` each renderer entry declares in the authoritative manifest,
// and the typed mirror this package exports.
//
// WHY IT MATTERS MORE THAN IT LOOKS. The host resolves a display, reads the
// version it declares, and builds the snapshot AT THAT VERSION. A manifest that
// declares one version while the display checks another does not fail loudly —
// it floors every reader, on every surface, with a snapshot the host built
// exactly as asked.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ARTIFACT_CONTENT_CHANNEL_VERSION } from "../src/artifact-content-channel";
import { cmsSnapshotArtifactManifest } from "../src/index";
import { PROPS_API_VERSION } from "../src/renderer-props";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as {
  cinatra: {
    artifact: {
      ui: { renderers: Record<string, { entry: string; propsApiVersion: number }> };
    };
  };
};

const SLOTS = ["detail", "preview"] as const;

describe("the props version this display is built against", () => {
  it("is 2 — the version whose snapshot carries the content channel", () => {
    expect(PROPS_API_VERSION).toBe(2);
  });

  it("is declared by every renderer entry in the authoritative manifest", () => {
    const renderers = pkg.cinatra.artifact.ui.renderers;
    expect(Object.keys(renderers).sort()).toEqual([...SLOTS].sort());
    for (const slot of SLOTS) {
      expect(renderers[slot].propsApiVersion, slot).toBe(PROPS_API_VERSION);
    }
  });

  it("is declared by the exported typed manifest, in lock-step with package.json", () => {
    for (const slot of SLOTS) {
      const declared = cmsSnapshotArtifactManifest.ui.renderers[slot as keyof typeof cmsSnapshotArtifactManifest.ui.renderers];
      expect((declared as { propsApiVersion: number }).propsApiVersion, slot).toBe(PROPS_API_VERSION);
    }
  });
});

describe("the content-channel version this display reads a projection at", () => {
  it("is 1 — a projection built at any other version is refused, not guessed at", () => {
    expect(ARTIFACT_CONTENT_CHANNEL_VERSION).toBe(1);
  });

  it("is a SEPARATE number from the props version, and must stay separately readable", () => {
    expect(ARTIFACT_CONTENT_CHANNEL_VERSION).not.toBe(PROPS_API_VERSION);
  });
});

import {
  ARTIFACT_OWNER_LEVELS,
  ARTIFACT_VISIBILITIES,
  EFFECTIVE_IDENTITY_KINDS,
} from "../src/renderer-props";

describe("the props mirror names the shapes the host actually sends", () => {
  // A MIRROR THAT ACCEPTS ANYTHING PROVES NOTHING. This display binds
  // structurally to the host's snapshot, so the enumerations are the whole
  // value of mirroring the contract at all: widened to `string`, the mirror
  // would have gone on typechecking against a host that had already changed
  // underneath it. These are the host's own projections, pinned as values so
  // the drift is a failing test rather than a display that renders nothing.
  it("projects ownership and visibility at the host's levels", () => {
    expect([...ARTIFACT_OWNER_LEVELS]).toEqual(["user", "team", "organization", "workspace"]);
    expect([...ARTIFACT_VISIBILITIES]).toEqual(["private", "team", "organization", "public"]);
  });

  it("knows both effective identities, the one without a primary extension included", () => {
    // The retired binding/classic `basis` and the `selectable` activation
    // barrier are gone from the host contract. A mirror that still required
    // them would refuse every snapshot the host now builds, so their absence
    // here is the fix, not an omission.
    expect([...EFFECTIVE_IDENTITY_KINDS]).toEqual(["extension", "no-primary"]);
  });
});
