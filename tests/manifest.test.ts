import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { cmsSnapshotArtifactManifest, CMS_SNAPSHOT_MIME } from "../src/index";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as {
  name: string;
  cinatra: {
    kind: string;
    apiVersion: string;
    displayName: string;
    artifact: {
      accepts: { file: { mimeTypes: string[] } };
      ui: {
        abiVersion: number;
        sdkAbiRange: string;
        renderers: Record<string, { entry: string; propsApiVersion: number; representations: string[] }>;
      };
    };
  };
};

describe("manifest — the typed export mirrors package.json byte-for-byte", () => {
  it("names the artifact per the kind convention (@cinatra-ai/<slug>-artifact)", () => {
    expect(pkg.name).toBe("@cinatra-ai/cms-snapshot-artifact");
    expect(pkg.cinatra.kind).toBe("artifact");
    expect(pkg.cinatra.apiVersion).toBe("cinatra.ai/v1");
    expect(pkg.cinatra.displayName).toBe("CMS Snapshot");
  });

  it("claims exactly the CMS-fields MIME at both slots", () => {
    expect(CMS_SNAPSHOT_MIME).toBe("application/vnd.cinatra.cms-fields+json");
    expect(pkg.cinatra.artifact.accepts.file.mimeTypes).toEqual([CMS_SNAPSHOT_MIME]);
    for (const slot of ["detail", "preview"] as const) {
      expect(pkg.cinatra.artifact.ui.renderers[slot].representations).toEqual([CMS_SNAPSHOT_MIME]);
    }
  });

  it("the typed manifest equals the package.json artifact.ui descriptor", () => {
    expect(cmsSnapshotArtifactManifest.accepts).toEqual(pkg.cinatra.artifact.accepts);
    expect(cmsSnapshotArtifactManifest.ui).toEqual(pkg.cinatra.artifact.ui);
  });
});
