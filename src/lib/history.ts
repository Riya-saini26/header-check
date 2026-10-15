import { useCallback, useEffect, useState } from "react";
import type { AnalysisResult } from "./heading-engine";
import { analyzeHtml, SAMPLE_HTML } from "./heading-engine";

const KEY = "headingcheck.history.v1";
const EVT = "headingcheck-history";

export function loadHistory(): AnalysisResult[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function save(list: AnalysisResult[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
  window.dispatchEvent(new Event(EVT));
}

export function addToHistory(r: AnalysisResult) {
  save([r, ...loadHistory().filter((x) => x.id !== r.id)]);
}
export function removeFromHistory(id: string) {
  save(loadHistory().filter((x) => x.id !== id));
}
export function clearHistory() {
  save([]);
}
export function getReport(id: string) {
  return loadHistory().find((x) => x.id === id);
}

export function makeDemoReport(): AnalysisResult {
  const r = analyzeHtml(SAMPLE_HTML, "Demo report (sample data)", "demo");
  return r;
}

export function useHistory() {
  const [list, setList] = useState<AnalysisResult[]>([]);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(() => setList(loadHistory()), []);
  useEffect(() => {
    refresh();
    setReady(true);
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);
  return { list, ready };
}
