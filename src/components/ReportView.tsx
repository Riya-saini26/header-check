import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, ClipboardCopy, Download, Info, ListTree, RotateCcw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScoreRing, SeverityBadge, StatusBadge } from "@/components/ScoreBadge";
import { CATEGORY_LABELS, outlineText, summaryText, toCsv, type AnalysisResult, type Severity } from "@/lib/heading-engine";
import { cn } from "@/lib/utils";

const FILTERS: { key: "all" | Severity; label: string }[] = [
  { key: "all", label: "All issues" },
  { key: "critical", label: "Critical" },
  { key: "warning", label: "Warnings" },
  { key: "suggestion", label: "Suggestions" },
];
const SEV_ORDER: Record<Severity, number> = { critical: 0, warning: 1, suggestion: 2 };
const LEVEL_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

async function copy(text: string, msg: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(msg);
  } catch {
    toast.error("Clipboard is not available in this browser.");
  }
}

export function ReportView({ report }: { report: AnalysisResult }) {
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const [sort, setSort] = useState<"severity" | "position" | "category">("severity");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const sevCount = (s: Severity) => report.issues.filter((i) => i.severity === s).length;
  const issues = useMemo(() => {
    const list = report.issues.filter((i) => filter === "all" || i.severity === filter);
    return [...list].sort((a, b) =>
      sort === "severity" ? SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || (a.headingIndex ?? 0) - (b.headingIndex ?? 0)
      : sort === "position" ? (a.headingIndex ?? 0) - (b.headingIndex ?? 0)
      : CATEGORY_LABELS[a.category].localeCompare(CATEGORY_LABELS[b.category]),
    );
  }, [report, filter, sort]);

  const levelData = report.levelCounts.map((c, i) => ({ name: `H${i + 1}`, value: c }));
  const catData = Object.entries(report.counts).filter(([, v]) => v > 0).map(([k, v]) => ({ name: CATEGORY_LABELS[k as keyof typeof CATEGORY_LABELS], value: v }));
  const issueHeadings = new Set(report.issues.map((i) => i.headingIndex).filter(Boolean));

  const downloadCsv = () => {
    const blob = new Blob([toCsv(report)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `headingcheck-report-${report.analyzedAt.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-6 animate-rise">
      {report.sourceType === "demo" && (
        <div className="flex items-center gap-2 rounded-xl border border-violet/30 bg-accent px-4 py-3 text-sm text-accent-foreground" role="note">
          <Info className="size-4 shrink-0" aria-hidden /> Demo report — generated from the built-in sample HTML, clearly labeled sample data.
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Analysis report</p>
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl" title={report.source}>{report.source}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            “{report.pageTitle}” · {new Date(report.analyzedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => copy(summaryText(report), "Summary copied")}><ClipboardCopy /> Copy summary</Button>
          <Button variant="outline" onClick={downloadCsv}><Download /> Download CSV</Button>
          <Button asChild className="bg-brand shadow-glow"><Link to="/analyze"><RotateCcw /> Analyze another page</Link></Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center gap-4 p-6 text-center shadow-card">
          <ScoreRing score={report.score} />
          <StatusBadge score={report.score} />
          <div className="grid w-full grid-cols-3 gap-2 text-center">
            {(["critical", "warning", "suggestion"] as Severity[]).map((s) => (
              <div key={s} className="rounded-lg bg-muted p-2">
                <div className="text-lg font-bold tabular-nums">{sevCount(s)}</div>
                <div className="text-[11px] capitalize text-muted-foreground">{s === "warning" ? "warnings" : s + (s === "critical" ? "" : "s")}</div>
              </div>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            This score is a heuristic based on the detected heading issues (critical −20, warning −8, suggestion −3). It is not an official Google ranking score.
          </p>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><ListTree className="size-5 text-primary" aria-hidden /> Heading outline</h2>
            <Button variant="ghost" size="sm" disabled={!report.headings.length} onClick={() => copy(outlineText(report.headings), "Outline copied")}>
              <ClipboardCopy /> Copy outline
            </Button>
          </div>
          {report.headings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No headings were found in this document.</p>
          ) : (
            <ol className="max-h-[360px] space-y-1 overflow-auto pr-2 font-mono text-sm">
              {report.headings.map((h) => (
                <li key={h.index} className="flex items-baseline gap-2" style={{ paddingLeft: `${(h.level - 1) * 1.25}rem` }}>
                  <span className="w-7 shrink-0 text-right text-xs text-muted-foreground">#{h.index}</span>
                  <span className="shrink-0 rounded bg-accent px-1.5 text-xs font-semibold text-accent-foreground">H{h.level}</span>
                  <span className={cn("break-words", !h.text && "italic text-muted-foreground", issueHeadings.has(h.index) && "text-critical")}>
                    {h.text || (h.hasImage ? `(image${h.accessibleName ? `: ${h.accessibleName}` : ""})` : "(empty)")}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold">Heading level distribution</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={levelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="value" name="Headings" radius={[6, 6, 0, 0]}>
                  {levelData.map((_, i) => <Cell key={i} fill={LEVEL_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold">Issues by category</h2>
          {catData.length === 0 ? (
            <div className="grid h-56 place-items-center text-sm text-muted-foreground"><span className="flex items-center gap-2"><CheckCircle2 className="size-5 text-success" /> No issues detected</span></div>
          ) : (
            <div className="flex h-56 items-center gap-4">
              <ResponsiveContainer width="55%">
                <PieChart>
                  <Pie data={catData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {catData.map((_, i) => <Cell key={i} fill={LEVEL_COLORS[i % 6]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex-1 space-y-1.5 text-sm">
                {catData.map((d, i) => (
                  <li key={d.name} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: LEVEL_COLORS[i % 6] }} />
                    <span className="flex-1">{d.name}</span>
                    <span className="font-semibold tabular-nums">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <section aria-labelledby="issues-h">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="issues-h" className="text-lg font-semibold">Issue report ({report.issues.length})</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Filter by severity" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  aria-pressed={filter === f.key}
                  className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors", filter === f.key ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground")}
                >
                  {f.label} ({f.key === "all" ? report.issues.length : sevCount(f.key)})
                </button>
              ))}
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="h-9 w-40 bg-card" aria-label="Sort issues"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="severity">Sort: Severity</SelectItem>
                <SelectItem value="position">Sort: Position</SelectItem>
                <SelectItem value="category">Sort: Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {issues.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground shadow-card">No issues in this filter.</Card>
        ) : (
          <ul className="space-y-3">
            {issues.map((i) => {
              const isOpen = open.has(i.id);
              return (
                <li key={i.id}>
                  <Card className="overflow-hidden shadow-card">
                    <button onClick={() => toggle(i.id)} aria-expanded={isOpen} className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/50">
                      <SeverityBadge severity={i.severity} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{i.title}</div>
                        {i.headingIndex && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            Heading #{i.headingIndex} · H{i.headingLevel} · <span className="font-mono">{i.headingText}</span>
                          </div>
                        )}
                      </div>
                      <ChevronDown className={cn("mt-0.5 size-4 shrink-0 transition-transform", isOpen && "rotate-180")} aria-hidden />
                    </button>
                    {isOpen && (
                      <div className="grid gap-4 border-t bg-muted/40 p-4 text-sm sm:grid-cols-2">
                        <div><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why it matters</div>{i.explanation}</div>
                        <div><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">How to fix</div>{i.recommendation}</div>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Heading analysis is an automated aid. Findings like multiple H1s, generic wording and image-only headings need human judgment in context.
        </p>
      </section>
    </div>
  );
}
