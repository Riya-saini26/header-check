import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { HistoryTable } from "@/components/HistoryTable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clearHistory, useHistory } from "@/lib/history";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Analysis History – HeadingCheck" },
      { name: "description", content: "All your previous heading structure analyses, saved in your browser." },
      { property: "og:title", content: "Analysis History – HeadingCheck" },
      { property: "og:description", content: "All your previous heading structure analyses." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { list, ready } = useHistory();
  return (
    <>
      <PageHeader
        title="Analysis history"
        description="Saved locally in this browser (up to 50 reports)."
        actions={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={!list.length}><Trash2 /> Delete all history</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all history?</AlertDialogTitle>
                <AlertDialogDescription>This removes every saved report from this browser. It can't be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearHistory}>Delete all</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />
      <Card className="shadow-card">
        {!ready ? <div className="h-40 animate-pulse" /> : list.length ? <HistoryTable list={list} /> : (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No analyses yet. <Link to="/analyze" className="font-medium text-primary underline">Analyze your first page</Link>.
          </div>
        )}
      </Card>
    </>
  );
}
