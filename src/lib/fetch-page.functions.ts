import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 12000;
const MAX_REDIRECTS = 5;

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".lan") || h.endsWith(".home.arpa")) return true;
  if (!h.includes(".") && !h.includes(":")) return true; // single-label intranet names
  // IPv4
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    return false;
  }
  if (/^\d+$/.test(h) || /^0x/i.test(h)) return true; // decimal/hex encoded IPs
  // IPv6
  if (h.includes(":")) {
    if (h === "::" || h === "::1") return true;
    if (/^f[cd]/.test(h) || /^fe[89ab]/.test(h)) return true;
    if (h.startsWith("::ffff:")) return true;
    return false;
  }
  return false;
}

function validateUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Only http:// and https:// URLs are allowed.");
  if (u.username || u.password) throw new Error("URLs with embedded credentials are not allowed.");
  if (u.port && !["80", "443", "8080", "8443"].includes(u.port)) throw new Error("This port is not allowed.");
  if (isBlockedHost(u.hostname)) throw new Error("Local, private, or internal network addresses cannot be analyzed.");
  return u;
}

export type FetchPageResult = { ok: true; html: string; finalUrl: string } | { ok: false; error: string };

export const fetchPageHtml = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ url: z.string().min(1).max(2048) }).parse(d))
  .handler(async ({ data }): Promise<FetchPageResult> => {
    try {
      let current = validateUrl(data.url.trim());
      let res: Response | null = null;
      for (let i = 0; i <= MAX_REDIRECTS; i++) {
        res = await fetch(current.toString(), {
          redirect: "manual",
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: {
            "User-Agent": "HeadingCheck/1.0 (+heading structure analyzer)",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
          if (i === MAX_REDIRECTS) return { ok: false, error: "Too many redirects." };
          current = validateUrl(new URL(res.headers.get("location")!, current).toString());
          continue;
        }
        break;
      }
      if (!res) return { ok: false, error: "No response received." };
      if (res.status === 401 || res.status === 403)
        return { ok: false, error: `The site refused access (HTTP ${res.status}). It may require login or block automated tools. Paste the page's HTML instead.` };
      if (res.status === 429 || res.status === 503)
        return { ok: false, error: `The site is rate-limiting or protected by anti-bot measures (HTTP ${res.status}). Paste the HTML instead.` };
      if (!res.ok) return { ok: false, error: `The page returned HTTP ${res.status}.` };
      const type = res.headers.get("content-type") ?? "";
      if (type && !/html|xml/i.test(type)) return { ok: false, error: `The URL is not an HTML page (content-type: ${type.split(";")[0]}).` };
      const len = Number(res.headers.get("content-length") ?? 0);
      if (len > MAX_BYTES) return { ok: false, error: "The page is too large to analyze (over 3 MB)." };

      const reader = res.body?.getReader();
      if (!reader) return { ok: false, error: "Empty response." };
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel();
          return { ok: false, error: "The page is too large to analyze (over 3 MB)." };
        }
        chunks.push(value);
      }
      const buf = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
      const html = new TextDecoder("utf-8").decode(buf);
      return { ok: true, html, finalUrl: current.toString() };
    } catch (e) {
      const err = e as Error;
      if (err?.name === "TimeoutError" || err?.name === "AbortError") return { ok: false, error: "The site took too long to respond (timeout)." };
      console.error("fetchPageHtml failed", err);
      return { ok: false, error: err?.message?.length && err.message.length < 160 ? err.message : "The page could not be reached." };
    }
  });
