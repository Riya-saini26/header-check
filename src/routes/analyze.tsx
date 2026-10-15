import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertCircle, Code2, FileText, Globe, Loader2, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { fetchPageHtml } from "@/lib/fetch-page.functions";
import { analyzeHtml, SAMPLE_HTML } from "@/lib/heading-engine";
import { addToHistory, makeDemoReport } from "@/lib/history";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze a Page – HeadingCheck" },
      { name: "description", content: "Analyze a URL or pasted HTML to detect missing H1s, skipped levels, empty and duplicate headings." },
      { property: "og:title", content: "Analyze a Page – HeadingCheck" },
      { property: "og:description", content: "Detect heading structure problems from a URL or pasted HTML." },
    ],
  }),
  component: AnalyzePage,
});

function normalizeInputUrl(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withProto);
    if (!["http:", "https:"].includes(u.protocol) || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function AnalyzePage() {
  const navigate = useNavigate();
  const fetchPage = useServerFn(fetchPageHtml);
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState<null | { step: string; pct: number }>(null);
  const [error, setError] = useState<string | null>(null);

  const finish = (html: string, source: string, type: "url" | "html") => {
    setBusy({ step: "Detecting issues…", pct: 90 });
    const r = analyzeHtml(html, source, type);
    addToHistory(r);
    navigate({ to: "/report/$id", params: { id: r.id } });
  };

  const onUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const valid = normalizeInputUrl(url);
    if (!valid) return setError("Please enter a valid website URL, e.g. https://example.com");
    setBusy({ step: "Fetching page…", pct: 30 });
    try {
      const res = await fetchPage({ data: { url: valid } });
      if (!res.ok) { setBusy(null); return setError(res.error); }
      setBusy({ step: "Parsing HTML…", pct: 65 });
      finish(res.html, res.finalUrl, "url");
    } catch {
      setBusy(null);
      setError("Could not reach the analysis service. Try again, or paste the HTML instead.");
    }
  };

  const onHtml = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!html.trim()) return setError("Paste some HTML source code first.");
    setBusy({ step: "Parsing HTML…", pct: 50 });
    finish(html, "Pasted HTML", "html");
  };

  const loadDemo = () => {
    const r = makeDemoReport();
    addToHistory(r);
    navigate({ to: "/report/$id", params: { id: r.id } });
  };

  return (
    <>
      <PageHeader
        title="Analyze a page"
        description="Enter a URL or paste HTML. We extract every H1–H6 in document order and check the structure."
        actions={<Button variant="outline" onClick={loadDemo}><Sparkles /> Load demo report</Button>}
      />
      <Card className="p-6 shadow-card">
        <Tabs defaultValue="url" onValueChange={() => setError(null)}>
          <TabsList className="mb-6">
            <TabsTrigger value="url"><Globe /> Analyze by URL</TabsTrigger>
            <TabsTrigger value="html"><Code2 /> Analyze HTML</TabsTrigger>
          </TabsList>
          <TabsContent value="url">
            <form onSubmit={onUrl} className="space-y-3" noValidate>
              <Label htmlFor="url">Website URL</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input id="url" type="url" inputMode="url" placeholder="https://example.com/page" value={url} onChange={(e) => setUrl(e.target.value)} disabled={!!busy} className="h-11" aria-describedby="url-help" />
                <Button type="submit" disabled={!!busy} className="h-11 bg-brand shadow-glow">
                  {busy ? <Loader2 className="animate-spin" /> : <Globe />} Analyze Website
                </Button>
              </div>
              <p id="url-help" className="text-xs text-muted-foreground">
                Public http/https pages only. Private networks, login-protected pages and anti-bot protected sites are not bypassed — paste their HTML instead.
              </p>
            </form>
          </TabsContent>
          <TabsContent value="html">
            <form onSubmit={onHtml} className="space-y-3">
              <Label htmlFor="html">HTML source code</Label>
              <Textarea id="html" value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<html>…</html>" className="min-h-72 font-mono text-xs" disabled={!!busy} spellCheck={false} />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!!busy} className="bg-brand shadow-glow"><FileText /> Analyze HTML</Button>
                <Button type="button" variant="outline" onClick={() => { setHtml(SAMPLE_HTML); setError(null); }}><Sparkles /> Load Sample HTML</Button>
                <Button type="button" variant="ghost" onClick={() => { setHtml(""); setError(null); }}><Trash2 /> Clear</Button>
              </div>
              <p className="text-xs text-muted-foreground">Parsed locally in your browser. Pasted HTML is never rendered or executed.</p>
            </form>
          </TabsContent>
        </Tabs>

        {busy && (
          <div className="mt-6 space-y-2" role="status" aria-live="polite">
            <div className="flex items-center gap-2 text-sm font-medium"><Loader2 className="size-4 animate-spin text-primary" /> {busy.step}</div>
            <Progress value={busy.pct} />
          </div>
        )}
        {error && (
          <div role="alert" className="mt-6 flex items-start gap-2 rounded-lg bg-critical-soft p-3 text-sm text-critical">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
          </div>
        )}
      </Card>
    </>
  );
}
