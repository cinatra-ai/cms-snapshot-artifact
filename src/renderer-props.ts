// The props snapshot a dynamically-loaded artifact renderer receives.
//
// This mirrors the host-supplied, versioned, fully-SERIALIZABLE snapshot a v1
// renderer is handed (propsApiVersion 1). A v1 renderer requests NO host ports:
// it renders ONLY from this authorized snapshot — plain JSON data (row metadata,
// the resolved representation, host-authorized URLs, and navigational action
// hrefs). No closures, host context, or callable ports cross this boundary.
//
// The type is declared locally (not imported) so this extension stays a
// self-contained source mirror with no first-party host dependency: the renderer
// binds structurally to whatever snapshot the host serializes at mount.

/** The host-authorized snapshot handed to a v1 slot renderer. */
export interface ArtifactRendererProps {
  /** The props-contract version this snapshot conforms to. The host refuses to
   * mount a renderer whose expected `propsApiVersion` this does not satisfy. */
  propsApiVersion: number;
  /** Row metadata (a projection of the authorized artifact summary). */
  artifact: {
    id: string;
    title: string | null;
    objectType: string;
    mime: string;
    size: number;
    createdAt: string;
    updatedAt: string;
    ownerLevel: string;
    visibility: string;
    sourceUrl: string | null;
  };
  /** The resolved representation to serve (null when none is materialized). */
  representation: {
    revisionId: string;
    mime: string;
  } | null;
  /** Host-authorized URLs, already access-checked before this snapshot is built —
   * the renderer just references them. */
  urls: {
    preview: string | null;
    download: string | null;
  };
  /** The resolved effective identity, flattened to plain data. */
  identity: {
    kind: string;
    extension: string | null;
    basis: string | null;
    selectable: boolean;
  };
  /** Sanctioned action handles — SERIALIZABLE navigational hrefs only. */
  actions: {
    download: string | null;
    openInSource: string | null;
  };
}

/** The props-contract version this renderer is built against. */
export const PROPS_API_VERSION = 1;
