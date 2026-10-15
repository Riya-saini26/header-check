import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Copy, FileSearch, Gauge, Heading1, Layers, ScanSearch, SquareDashed } from "lucide-react";
import type { ComponentType } from "react";
import { PageHeader } from "@/components/AppShell";
import { HistoryTable } from "@/components/HistoryTable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHistory } from "@/lib/history";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HeadingCheck – Poor Heading Structure Detection Tool" },
      { name: "description", content: "Analyze your headings. Improve your SEO. Detect missing H1s, skipped levels, empty, duplicate and generic headings." },
      { property: "og:title", content: "HeadingCheck – Poor Heading Structure Detection Tool" },
      { property: "og:description", content: "Analyze your headings. Improve your SEO." },
    ],
  }),
  component: Dashboard,
});

function Stat({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: ComponentType<{ className?: string }>; accent?: boolean }) {
  return (
    <Card className={accent ? "bg-brand p-5 text-primary-foreground shadow-glow" : "p-5 shadow-card"}>
      <div className="flex items-center justify-between">
        <span className={accent ? "text-sm opacity-90" : "text-sm text-muted-foreground"}>{label}</span>
        <Icon className={accent ? "size-5 opacity-90" : "size-5 text-primary"} />
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}

function Dashboard() {
  const { list, ready } = useHistory();
  const sum = (fn: (r: (typeof list)[number]) => number) => list.reduce((s, r) => s + fn(r), 0);
  const avg = list.length ? Math.round(sum((r) => r.score) / list.length) : "—";

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Analyze your headings. Improve your SEO."
        actions={<Button asChild size="lg" className="bg-brand shadow-glow"><Link to="/analyze"><ScanSearch /> Analyze New Page</Link></Button>}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Avg. structure score" value={ready ? avg : "…"} icon={Gauge} accent />
        <Stat label="Pages analyzed" value={list.length} icon={FileSearch} />
        <Stat label="Heading issues" value={sum((r) => r.issues.length)} icon={AlertTriangle} />
        <Stat label="Missing H1" value={sum((r) => r.counts["missing-h1"])} icon={Heading1} />
        <Stat label="Skipped levels" value={sum((r) => r.counts["skipped-level"])} icon={Layers} />
        <Stat label="Multiple H1" value={sum((r) => r.counts["multiple-h1"])} icon={Copy} />
        <Stat label="Empty headings" value={sum((r) => r.counts["empty-heading"])} icon={SquareDashed} />
        <Stat label="Duplicate headings" value={sum((r) => r.counts["duplicate-heading"])} icon={Copy} />
      </div>

      <Card className="mt-8 shadow-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Recent analyses</h2>
          <Link to="/history" className="text-sm font-medium text-primary hover:underline">View all</Link>
        </div>
        {ready && list.length ? (
          <HistoryTable list={list.slice(0, 5)} allowDelete={false} />
        ) : (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No analyses yet. Run one from the Analyze page or load the demo report.
          </div>
        )}
      </Card>
    </>
  );
}
