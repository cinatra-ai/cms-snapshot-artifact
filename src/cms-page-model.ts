// THE PAGE CONTENT FORM — what an agent extension files when its run proposes a
// change to a page on a WordPress or a Drupal site, and the whole of what the
// page display reads. The agent creates the artifact and all of its content:
// the proposed words and the published words of the regions the change
// touches. This display draws from that content alone.
//
// PURE AND TOTAL: this module imports nothing, reaches nothing and never
// throws. Every text it is handed returns either a page or a named reason.
//
// The words are PLAIN TEXT. Nothing here, and nothing drawn from it, renders
// markup taken from the content.

/** The marker key the form carries, and the form version this display reads. */
export const CMS_PAGE_FORM_MARKER = "cinatraCmsPage";
export const CMS_PAGE_FORM_VERSION = 1;

/** How long the frame may take to load before it names the gap instead. */
export const FRAME_WATCHDOG_MS = 10000;

/** The most excerpts one form may carry. */
export const CMS_PAGE_MAX_EXCERPTS = 200;

export type CmsPageSystem = "wordpress" | "drupal";
export type CmsPageExcerptKind = "heading" | "paragraph" | "list-item";

/** One changed block of the page, in page order. */
export interface CmsPageExcerpt {
  /** The field the block lives in: title, content, excerpt, body, summary… */
  region: string;
  /** The block's index inside its region. */
  position: number;
  kind: CmsPageExcerptKind;
  /** The heading level, 1 to 6; 2 when a heading carries none. Null otherwise. */
  level: number | null;
  /** The block's plain words as the site publishes them ('' when added). */
  published: string;
  /** The block's plain words after the change ('' when removed). */
  proposed: string;
}

/** The parsed form. Addresses are already admitted: null when not framable. */
export interface CmsPage {
  system: CmsPageSystem;
  page: {
    title: string;
    /** The published page's own public https address — the frame's address. */
    address: string | null;
    /** The https address that opens the page in the CMS. */
    cmsAddress: string | null;
  };
  /** When the agent read the published words (ISO-8601), when stated. */
  readAt: string | null;
  excerpts: CmsPageExcerpt[];
}

export type CmsPageParseReason = "not-json" | "not-the-form" | "form-version" | "no-excerpts" | "malformed";

export type CmsPageParse = { ok: true; page: CmsPage } | { ok: false; reason: CmsPageParseReason };

const SYSTEMS: readonly string[] = ["wordpress", "drupal"];
const KINDS: readonly string[] = ["heading", "paragraph", "list-item"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The address, when it may be put in front of a reader: it parses as a URL,
 * its protocol is https, and it carries no user name or password. Else null. */
export function framableAddress(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
  return value;
}

/** Whether the frame is drawn or the gap is named in its place. */
export function frameState(input: { address: string | null; loaded: boolean; elapsedMs: number }): "frame" | "gap" {
  if (input.address === null) return "gap";
  if (!input.loaded && input.elapsedMs >= FRAME_WATCHDOG_MS) return "gap";
  return "frame";
}

function parseExcerpt(value: unknown): CmsPageExcerpt | null {
  if (!isRecord(value)) return null;
  const { region, position, kind, level, published, proposed } = value;
  if (typeof region !== "string" || region.length === 0) return null;
  if (typeof position !== "number" || !Number.isInteger(position) || position < 0) return null;
  if (typeof kind !== "string" || !KINDS.includes(kind)) return null;
  if (typeof published !== "string" || typeof proposed !== "string") return null;
  let headingLevel: number | null = null;
  if (kind === "heading") {
    if (level === undefined) headingLevel = 2;
    else if (typeof level === "number" && Number.isInteger(level) && level >= 1 && level <= 6) headingLevel = level;
    else return null;
  }
  return { region, position, kind: kind as CmsPageExcerptKind, level: headingLevel, published, proposed };
}

/** Read the form from the projected text. Never throws. */
export function parseCmsPage(text: string): CmsPageParse {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: "not-json" };
  }
  if (!isRecord(value) || !(CMS_PAGE_FORM_MARKER in value)) return { ok: false, reason: "not-the-form" };
  if (value[CMS_PAGE_FORM_MARKER] !== CMS_PAGE_FORM_VERSION) return { ok: false, reason: "form-version" };

  const excerpts = value.excerpts;
  if (excerpts === undefined || (Array.isArray(excerpts) && excerpts.length === 0)) {
    return { ok: false, reason: "no-excerpts" };
  }

  const system = value.system;
  const page = value.page;
  if (typeof system !== "string" || !SYSTEMS.includes(system)) return { ok: false, reason: "malformed" };
  if (!isRecord(page) || typeof page.title !== "string") return { ok: false, reason: "malformed" };
  if (!Array.isArray(excerpts) || excerpts.length > CMS_PAGE_MAX_EXCERPTS) return { ok: false, reason: "malformed" };

  const parsed: CmsPageExcerpt[] = [];
  for (const entry of excerpts) {
    const excerpt = parseExcerpt(entry);
    if (excerpt === null) return { ok: false, reason: "malformed" };
    parsed.push(excerpt);
  }

  return {
    ok: true,
    page: {
      system: system as CmsPageSystem,
      page: {
        title: page.title,
        address: framableAddress(page.address),
        cmsAddress: framableAddress(page.cmsAddress),
      },
      readAt: typeof value.readAt === "string" ? value.readAt : null,
      excerpts: parsed,
    },
  };
}

export type WordDiffOp = "same" | "removed" | "added";
export interface WordDiffSegment {
  op: WordDiffOp;
  text: string;
}

/** A word with the whitespace that follows it, so the spaces are kept. */
function tokens(text: string): string[] {
  const lead = /^\s*/.exec(text)?.[0] ?? "";
  const words = text.slice(lead.length).match(/\S+\s*/g) ?? [];
  if (lead.length > 0) {
    if (words.length === 0) return [lead];
    words[0] = lead + words[0];
  }
  return words;
}

/** Above this many cells the block is drawn as removed whole and added whole. */
const DIFF_CELL_LIMIT = 1_000_000;

interface Run {
  op: WordDiffOp;
  words: string[];
}

function pushWord(runs: Run[], op: WordDiffOp, word: string): void {
  const last = runs[runs.length - 1];
  if (last && last.op === op) last.words.push(word);
  else runs.push({ op, words: [word] });
}

/** Removed before added inside each change, adjacent runs of one kind joined. */
function normalize(runs: Run[]): Run[] {
  const out: Run[] = [];
  let removed: string[] = [];
  let added: string[] = [];
  const flush = (): void => {
    if (removed.length > 0) out.push({ op: "removed", words: removed });
    if (added.length > 0) out.push({ op: "added", words: added });
    removed = [];
    added = [];
  };
  for (const run of runs) {
    if (run.op === "removed") removed = removed.concat(run.words);
    else if (run.op === "added") added = added.concat(run.words);
    else {
      flush();
      const last = out[out.length - 1];
      if (last && last.op === "same") last.words = last.words.concat(run.words);
      else out.push({ op: "same", words: [...run.words] });
    }
  }
  flush();
  return out;
}

function changeWidth(runs: Run[], from: number, step: 1 | -1): number {
  let removed = 0;
  let added = 0;
  for (let i = from; i >= 0 && i < runs.length && runs[i].op !== "same"; i += step) {
    if (runs[i].op === "removed") removed += runs[i].words.length;
    else added += runs[i].words.length;
  }
  return Math.max(removed, added);
}

/** A short unchanged run caught between two changes, no longer than either,
 * reads as part of one change: it is folded into the removed and the added
 * words so a reader sees the phrase that changed, not scattered single words. */
function foldShortRuns(input: Run[]): Run[] {
  let runs = normalize(input);
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 1; i < runs.length - 1; i++) {
      const run = runs[i];
      if (run.op !== "same" || runs[i - 1].op === "same" || runs[i + 1].op === "same") continue;
      const width = run.words.length;
      if (width <= changeWidth(runs, i - 1, -1) && width <= changeWidth(runs, i + 1, 1)) {
        runs = normalize([
          ...runs.slice(0, i),
          { op: "removed", words: run.words },
          { op: "added", words: run.words },
          ...runs.slice(i + 1),
        ]);
        changed = true;
        break;
      }
    }
  }
  return runs;
}

function wholeChange(published: string[], proposed: string[]): Run[] {
  const runs: Run[] = [];
  if (published.length > 0) runs.push({ op: "removed", words: published });
  if (proposed.length > 0) runs.push({ op: "added", words: proposed });
  return runs;
}

/** The words two sides share, each with its own trailing whitespace kept: when
 * both sides space the word the proposed spacing is kept; when only one side
 * does (a word at the end of one text), that spacing is removed or added. */
function pushSame(runs: Run[], published: string, proposed: string): void {
  const word = published.trimEnd();
  const publishedSpace = published.slice(word.length);
  const proposedSpace = proposed.slice(proposed.trimEnd().length);
  if (publishedSpace === proposedSpace || (publishedSpace !== "" && proposedSpace !== "")) {
    pushWord(runs, "same", word + proposedSpace);
    return;
  }
  pushWord(runs, "same", word);
  if (publishedSpace !== "") pushWord(runs, "removed", publishedSpace);
  if (proposedSpace !== "") pushWord(runs, "added", proposedSpace);
}

/**
 * The words the change removes and adds, in place: a longest common
 * subsequence over whitespace-separated words that keeps the spaces, so the
 * removed and same segments read back the published words and the added and
 * same segments the proposed words. The words both sides open and close with
 * are matched first, so an unchanged text is always drawn unchanged. When
 * fewer than half of the proposed words survive the change, the block is shown
 * as removed whole and added whole, which is how a rewritten heading reads.
 */
export function wordDiff(published: string, proposed: string): WordDiffSegment[] {
  const a = tokens(published);
  const b = tokens(proposed);
  const key = (token: string): string => token.trim();
  let head = 0;
  while (head < a.length && head < b.length && key(a[head]) === key(b[head])) head++;
  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    key(a[a.length - 1 - tail]) === key(b[b.length - 1 - tail])
  ) {
    tail++;
  }
  const midA = a.slice(head, a.length - tail);
  const midB = b.slice(head, b.length - tail);

  const walked: Run[] = [];
  for (let k = 0; k < head; k++) pushSame(walked, a[k], b[k]);
  if (midA.length === 0 || midB.length === 0 || midA.length * midB.length > DIFF_CELL_LIMIT) {
    for (const run of wholeChange(midA, midB)) for (const word of run.words) pushWord(walked, run.op, word);
  } else {
    const table: Uint32Array[] = Array.from({ length: midA.length + 1 }, () => new Uint32Array(midB.length + 1));
    for (let i = midA.length - 1; i >= 0; i--) {
      for (let j = midB.length - 1; j >= 0; j--) {
        table[i][j] =
          key(midA[i]) === key(midB[j]) ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < midA.length && j < midB.length) {
      if (key(midA[i]) === key(midB[j])) {
        pushSame(walked, midA[i++], midB[j++]);
      } else if (table[i + 1][j] >= table[i][j + 1]) {
        pushWord(walked, "removed", midA[i++]);
      } else {
        pushWord(walked, "added", midB[j++]);
      }
    }
    while (i < midA.length) pushWord(walked, "removed", midA[i++]);
    while (j < midB.length) pushWord(walked, "added", midB[j++]);
  }
  for (let k = 0; k < tail; k++) pushSame(walked, a[a.length - tail + k], b[b.length - tail + k]);

  let runs = foldShortRuns(walked);
  const kept = runs.filter((run) => run.op === "same").reduce((sum, run) => sum + run.words.length, 0);
  if (kept * 2 < b.length && runs.some((run) => run.op !== "same")) runs = wholeChange(a, b);
  return runs.map((run) => ({ op: run.op, text: run.words.join("") }));
}

export interface CmsPageExcerptEntry {
  excerpt: CmsPageExcerpt;
  /** True when an unchanged run of the page lies between this excerpt and the
   * one before it, so an elision is drawn ahead of it. */
  elidedBefore: boolean;
}

/** The excerpts in their given order, each flagged when it does not follow the
 * one before it directly: another region, or a position more than one past. */
export function excerptGroups(excerpts: readonly CmsPageExcerpt[]): CmsPageExcerptEntry[] {
  return excerpts.map((excerpt, index) => {
    const previous = index > 0 ? excerpts[index - 1] : null;
    const elidedBefore =
      previous !== null && (previous.region !== excerpt.region || excerpt.position > previous.position + 1);
    return { excerpt, elidedBefore };
  });
}
