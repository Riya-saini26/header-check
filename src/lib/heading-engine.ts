// Pure heading analysis engine. No UI or React dependencies.

export type Severity = "critical" | "warning" | "suggestion";

export type IssueCategory =
  | "missing-h1"
  | "multiple-h1"
  | "skipped-level"
  | "empty-heading"
  | "duplicate-heading"
  | "generic-heading"
  | "poor-hierarchy"
  | "long-heading"
  | "non-text-heading";

export interface HeadingItem {
  index: number; // 1-based document order
  level: number; // 1-6
  text: string; // normalized
  hasImage: boolean;
  accessibleName: string; // text + img alt + aria-label
}

export interface Issue {
  id: string;
  category: IssueCategory;
  title: string;
  severity: Severity;
  headingIndex?: number;
  headingLevel?: number;
  headingText?: string;
  explanation: string;
  recommendation: string;
}

export interface AnalysisResult {
  id: string;
  source: string; // URL or "Pasted HTML"
  sourceType: "url" | "html" | "demo";
  analyzedAt: string;
  pageTitle: string;
  headings: HeadingItem[];
  issues: Issue[];
  score: number;
  counts: Record<IssueCategory, number>;
  levelCounts: number[]; // index 0 => H1
}

export interface EngineOptions {
  maxLength: number;
}

export const DEFAULT_OPTIONS: EngineOptions = { maxLength: 70 };

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  "missing-h1": "Missing H1",
  "multiple-h1": "Multiple H1",
  "skipped-level": "Skipped level",
  "empty-heading": "Empty heading",
  "duplicate-heading": "Duplicate",
  "generic-heading": "Generic",
  "poor-hierarchy": "Poor hierarchy",
  "long-heading": "Too long",
  "non-text-heading": "Non-text",
};

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 20, warning: 8, suggestion: 3 };

const GENERIC = new Set([
  "click here", "read more", "more", "learn more", "untitled", "heading", "title",
  "here", "link", "details", "info", "information", "welcome", "home", "page",
  "section", "new section", "lorem ipsum", "click", "see more", "view more", "text",
]);

export function normalizeText(s: string | null | undefined): string {
  return (s ?? "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
}

export function extractHeadings(doc: Document): HeadingItem[] {
  const nodes = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6"));
  return nodes.map((el, i) => {
    const text = normalizeText(el.textContent);
    const imgs = Array.from(el.querySelectorAll("img, svg"));
    const alts = imgs.map((img) => normalizeText(img.getAttribute("alt") || img.getAttribute("aria-label"))).filter(Boolean);
    const aria = normalizeText(el.getAttribute("aria-label"));
    const accessibleName = normalizeText([aria, text, ...alts].filter(Boolean).join(" "));
    return {
      index: i + 1,
      level: Number(el.tagName.substring(1)),
      text,
      hasImage: imgs.length > 0,
      accessibleName,
    };
  });
}

export function parseHtml(html: string): Document {
  // DOMParser does not execute scripts and the document is never attached to the page.
  return new DOMParser().parseFromString(html, "text/html");
}

let counter = 0;
const uid = () => `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function detectIssues(headings: HeadingItem[], opts: EngineOptions = DEFAULT_OPTIONS): Issue[] {
  const issues: Issue[] = [];
  const push = (i: Omit<Issue, "id">) => issues.push({ ...i, id: uid() });
  const h1s = headings.filter((h) => h.level === 1);

  if (headings.length === 0) {
    push({
      category: "missing-h1", severity: "critical", title: "No headings found",
      explanation: "The page contains no H1–H6 elements. Screen-reader users and search engines rely on headings to understand page structure.",
      recommendation: "Add a single descriptive H1 and use H2–H6 to structure each section. Avoid styling plain text to look like headings.",
    });
    return issues;
  }

  if (h1s.length === 0) {
    push({
      category: "missing-h1", severity: "critical", title: "Missing H1 heading",
      explanation: "No H1 was found. The H1 is the primary signal describing the page's main topic.",
      recommendation: "Add one H1 near the top of the main content that clearly describes the page topic.",
    });
  } else if (h1s.length > 1) {
    h1s.slice(1).forEach((h) =>
      push({
        category: "multiple-h1", severity: "warning", title: "Multiple H1 headings — review",
        headingIndex: h.index, headingLevel: 1, headingText: h.text,
        explanation: `The page has ${h1s.length} H1 headings. This is valid HTML, but multiple H1s can dilute the main topic and confuse the document outline.`,
        recommendation: "Review whether this H1 should be an H2. Keep one H1 for the main topic unless your design deliberately uses sectioned H1s.",
      }),
    );
  }

  // Skipped levels & poor hierarchy
  let prev = 0;
  headings.forEach((h, i) => {
    if (i === 0 && h.level > 1) {
      push({
        category: "poor-hierarchy", severity: "warning", title: `Document starts with H${h.level}`,
        headingIndex: h.index, headingLevel: h.level, headingText: h.text,
        explanation: "The first heading in the document is not an H1, so the outline starts at a lower level than expected.",
        recommendation: "Start the main content with an H1, or confirm that an H1 exists elsewhere and comes first.",
      });
    } else if (prev && h.level > prev + 1) {
      push({
        category: "skipped-level", severity: "warning", title: `Skipped heading level (H${prev} → H${h.level})`,
        headingIndex: h.index, headingLevel: h.level, headingText: h.text,
        explanation: `An H${h.level} follows an H${prev} without an H${prev + 1} in between. Assistive tech users navigating by headings may think content is missing.`,
        recommendation: `Change this heading to H${prev + 1}, or add an intermediate H${prev + 1}. Use CSS for size, not heading level.`,
      });
    }
    if (h1s.length > 0 && i > 0 && h.level === 1 && headings[0].level !== 1 && h === h1s[0]) {
      push({
        category: "poor-hierarchy", severity: "suggestion", title: "H1 appears after other headings",
        headingIndex: h.index, headingLevel: 1, headingText: h.text,
        explanation: `${i} heading(s) appear before the first H1, which creates a confusing outline.`,
        recommendation: "Move the H1 before other content headings, or demote headings that appear above it (e.g. in navigation) to non-heading elements.",
      });
    }
    prev = h.level;
  });

  // Empty, non-text, generic, long
  headings.forEach((h) => {
    const base = { headingIndex: h.index, headingLevel: h.level, headingText: h.text || "(empty)" };
    if (!h.text && !h.hasImage) {
      push({
        ...base, category: "empty-heading", severity: "critical", title: `Empty H${h.level} heading`,
        explanation: "This heading has no text. Screen readers announce an empty heading, which is confusing and adds no structure.",
        recommendation: "Add descriptive text or remove the empty heading element.",
      });
    } else if (!h.text && h.hasImage) {
      push({
        ...base, headingText: h.accessibleName || "(image only)", category: "non-text-heading",
        severity: h.accessibleName ? "suggestion" : "warning",
        title: h.accessibleName ? `H${h.level} contains only an image — review` : `H${h.level} has no accessible name`,
        explanation: h.accessibleName
          ? "This heading consists only of an image/icon. Its alt text gives it a name, but visible text is more robust for SEO and users."
          : "This heading contains only decorative or image content without alt text, so it has no meaningful accessible name.",
        recommendation: "Use real text inside the heading, or give the image meaningful alt text describing the section. Manual review recommended.",
      });
    }
    if (h.text && GENERIC.has(h.text.toLowerCase().replace(/[.!?:…»>]+$/g, "").trim())) {
      push({
        ...base, category: "generic-heading", severity: "warning", title: `Generic heading "${h.text}"`,
        explanation: "Vague headings do not describe the section's topic, hurting both scanning and search relevance.",
        recommendation: "Rewrite the heading to describe what the section is about (e.g. \"Read more\" → \"Pricing plans for small teams\").",
      });
    }
    if (h.text.length > opts.maxLength) {
      push({
        ...base, category: "long-heading", severity: "suggestion", title: `Long heading (${h.text.length} characters)`,
        explanation: `This heading exceeds ${opts.maxLength} characters. Long headings are harder to scan and may be truncated. This is a readability suggestion, not an SEO error.`,
        recommendation: "Shorten the heading to its key message and move supporting detail into the paragraph below.",
      });
    }
  });

  // Duplicates
  const groups = new Map<string, HeadingItem[]>();
  headings.forEach((h) => {
    if (!h.text) return;
    const k = h.text.toLowerCase();
    groups.set(k, [...(groups.get(k) ?? []), h]);
  });
  groups.forEach((list) => {
    if (list.length < 2) return;
    list.slice(1).forEach((h) =>
      push({
        category: "duplicate-heading", severity: "warning", title: `Duplicate heading "${h.text}"`,
        headingIndex: h.index, headingLevel: h.level, headingText: h.text,
        explanation: `This text is used by ${list.length} headings (positions ${list.map((x) => "#" + x.index).join(", ")}). Identical headings make sections indistinguishable when navigating.`,
        recommendation: "Make each heading unique so it describes its own section.",
      }),
    );
  });

  return issues;
}

export function computeScore(issues: Issue[]): number {
  const penalty = issues.reduce((s, i) => s + SEVERITY_WEIGHT[i.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function analyzeHtml(
  html: string,
  source: string,
  sourceType: AnalysisResult["sourceType"],
  opts: EngineOptions = DEFAULT_OPTIONS,
): AnalysisResult {
  const doc = parseHtml(html);
  const headings = extractHeadings(doc);
  const issues = detectIssues(headings, opts);
  const counts = Object.fromEntries(Object.keys(CATEGORY_LABELS).map((k) => [k, 0])) as Record<IssueCategory, number>;
  issues.forEach((i) => counts[i.category]++);
  const levelCounts = [0, 0, 0, 0, 0, 0];
  headings.forEach((h) => levelCounts[h.level - 1]++);
  return {
    id: uid(),
    source,
    sourceType,
    analyzedAt: new Date().toISOString(),
    pageTitle: normalizeText(doc.querySelector("title")?.textContent) || "(no title)",
    headings,
    issues,
    score: computeScore(issues),
    counts,
    levelCounts,
  };
}

export function statusFor(score: number): { label: string; tone: "good" | "fair" | "poor" } {
  if (score >= 80) return { label: "Good", tone: "good" };
  if (score >= 50) return { label: "Needs work", tone: "fair" };
  return { label: "Poor", tone: "poor" };
}

export function outlineText(headings: HeadingItem[]): string {
  return headings.map((h) => `${"  ".repeat(h.level - 1)}H${h.level} — ${h.text || "(empty)"}`).join("\n");
}

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function toCsv(r: AnalysisResult): string {
  const rows: unknown[][] = [
    ["HeadingCheck report"], ["Source", r.source], ["Analyzed", r.analyzedAt], ["Score", r.score], [],
    ["Severity", "Issue", "Category", "Heading #", "Level", "Heading text", "Explanation", "Recommendation"],
    ...r.issues.map((i) => [i.severity, i.title, CATEGORY_LABELS[i.category], i.headingIndex ?? "", i.headingLevel ? `H${i.headingLevel}` : "", i.headingText ?? "", i.explanation, i.recommendation]),
    [], ["Heading #", "Level", "Text"],
    ...r.headings.map((h) => [h.index, `H${h.level}`, h.text]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function summaryText(r: AnalysisResult): string {
  const sev = (s: Severity) => r.issues.filter((i) => i.severity === s).length;
  return [
    `HeadingCheck summary — ${r.source}`,
    `Score: ${r.score}/100 (${statusFor(r.score).label})`,
    `Headings: ${r.headings.length} (${r.levelCounts.map((c, i) => `H${i + 1}:${c}`).join(" ")})`,
    `Issues: ${r.issues.length} — ${sev("critical")} critical, ${sev("warning")} warnings, ${sev("suggestion")} suggestions`,
    "",
    ...r.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.title}${i.headingIndex ? ` (heading #${i.headingIndex})` : ""}`),
    "",
    "Score is a heuristic, not an official Google ranking metric.",
  ].join("\n");
}

export const SAMPLE_HTML = `<!doctype html>
<html>
<head><title>Acme Studio – Sample Page</title></head>
<body>
  <header><nav><a href="/">Home</a></nav></header>
  <main>
    <h2>Our Services</h2>
    <p>We build websites.</p>
    <h4>Web Development</h4>
    <p>Fast, modern sites.</p>
    <h2>Our Services</h2>
    <h3></h3>
    <h3>Click Here</h3>
    <h3>Everything you ever wanted to know about our incredibly thorough search engine optimisation process</h3>
    <h2>Contact Us</h2>
  </main>
</body>
</html>`;
