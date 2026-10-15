import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ScoreBadge";
import { removeFromHistory } from "@/lib/history";
import type { AnalysisResult } from "@/lib/heading-engine";

export function HistoryTable({ list, allowDelete = true }: { list: AnalysisResult[]; allowDelete?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Page</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Issues</th>
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">Status</th>
            {allowDelete && <th className="px-4 py-3"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
              <td className="max-w-xs px-4 py-3">
                <Link to="/report/$id" params={{ id: r.id }} className="block truncate font-medium text-primary hover:underline">{r.source}</Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(r.analyzedAt).toLocaleString()}</td>
              <td className="px-4 py-3 tabular-nums">{r.issues.length}</td>
              <td className="px-4 py-3 font-semibold tabular-nums">{r.score}</td>
              <td className="px-4 py-3"><StatusBadge score={r.score} /></td>
              {allowDelete && (
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" aria-label={`Delete analysis of ${r.source}`} onClick={() => removeFromHistory(r.id)}><Trash2 /></Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
