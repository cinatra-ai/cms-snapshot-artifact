// @cinatra-ai/cms-snapshot-artifact — a dynamically-installable artifact renderer
// for application/vnd.cinatra.cms-fields+json.
//
// A CMS content snapshot (object type `@cinatra-ai/objects:cms-content-snapshot`)
// is the pinned, reviewable state of a CMS change: a flat `{ path: value }` JSON
// object of the reviewed post fields (the connector's canonical CMS-fields
// serialization). No system base covers this media type, so before this renderer
// the artifact-review surface had no way to DRAW it and floored to "review target
// unavailable". This ships an extension-owned renderer per v1 slot (detail +
// preview) that mounts in the host page's main realm sharing the host React
// singleton, requests NO host ports, and renders only from the host-authorized
// props snapshot — presenting the reviewed fields READ-ONLY with the reviewed
// scope visible so a human can see and decide the change from the review page.
// Every failure degrades to a never-blank floor (no content, fetch error, or
// non-CMS bytes shown raw).

// The slot renderers (default-exported React components the host mounts).
export { default as CmsSnapshotDetail } from "./renderers/detail";
export { default as CmsSnapshotPreview } from "./renderers/preview";

// The pure presentational view (loaded fields + scope) — shared with the tests.
export { CmsFieldsView, CmsScope, CmsFieldRow } from "./cms-view";

// The host-supplied props contract this renderer binds to (v1, no host ports).
export { PROPS_API_VERSION } from "./renderer-props";
export type { ArtifactRendererProps } from "./renderer-props";

// The pure, never-throwing CMS-fields model (shared by the views and the tests).
export { parseCmsFields, scopePaths, summarizeCms, labelForPath } from "./cms-model";
export type { CmsField, CmsFieldsParse } from "./cms-model";

/** The MIME this renderer draws — a CMS content snapshot's canonical serialization. */
export const CMS_SNAPSHOT_MIME = "application/vnd.cinatra.cms-fields+json";

/** The typed mirror of the authoritative `cinatra.artifact` descriptor declared
 * in package.json — this extension claims exactly the CMS-fields MIME and ships a
 * renderer for the detail and preview slots. */
export interface CmsSnapshotArtifactManifest {
  accepts: { file: { mimeTypes: string[] } };
  ui: {
    abiVersion: 1;
    sdkAbiRange: string;
    renderers: {
      detail: { entry: string; propsApiVersion: number; representations: string[] };
      preview: { entry: string; propsApiVersion: number; representations: string[] };
    };
  };
}

export const cmsSnapshotArtifactManifest: CmsSnapshotArtifactManifest = {
  accepts: { file: { mimeTypes: [CMS_SNAPSHOT_MIME] } },
  ui: {
    abiVersion: 1,
    sdkAbiRange: "^2.5.0",
    renderers: {
      detail: {
        entry: "./src/renderers/detail.tsx",
        propsApiVersion: 1,
        representations: [CMS_SNAPSHOT_MIME],
      },
      preview: {
        entry: "./src/renderers/preview.tsx",
        propsApiVersion: 1,
        representations: [CMS_SNAPSHOT_MIME],
      },
    },
  },
};
