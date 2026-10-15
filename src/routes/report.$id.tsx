import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ReportView } from "@/components/ReportView";
import { Button } from "@/components/ui/button";
import { getReport } from "@/lib/history";
import type { AnalysisResult } from "@/lib/heading-engine";

export const Route = createFileRoute("/report/$id")({
  head: () => ({
    meta: [
      { title: "Analysis Report – HeadingCheck" },
      { name: "description", content: "Heading outline, issues, score and statistics for an analyzed page." },
      { property: "og:title", content: "Analysis Report – HeadingCheck" },
      { property: "og:description", content: "Heading outline, issues, score and statistics for an analyzed page." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const [state, setState] = useState<{ ready: boolean; report?: AnalysisResult }>({ ready: false });
  useEffect(() => setState({ ready: true, report: getReport(id) }), [id]);

  if (!state.ready) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  if (!state.report)
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-semibold">Report not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been deleted from your history.</p>
        <Button asChild className="mt-6 bg-brand"><Link to="/analyze">Analyze a page</Link></Button>
      </div>
    );
  return <ReportView report={state.report} />;
}
