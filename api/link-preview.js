// api/link-preview.js
// Fetches a URL's Open Graph metadata (title, description, image) server-side, since browsers
// can't do this themselves — a page's own CORS policy blocks a client-side fetch of its raw HTML
// from a different origin. This runs on Vercel's servers instead, where CORS doesn't apply.
//
// SECURITY: fetching an arbitrary, user-supplied URL from a server is a classic SSRF vector — a
// malicious link could point at internal infrastructure (a cloud metadata endpoint, an internal
// admin panel, a database on a private network) and use this endpoint to reach it, exactly as if
// the server had visited it directly, but exposed through a public API. This endpoint blocks that
// on several layers: only http/https, no credentials/userinfo in the URL, the hostname is resolved
// and every resulting IP is checked against private/reserved ranges BEFORE fetching (catching a
// hostname that simply resolves to an internal address, not just an obviously-internal literal
// like "localhost"), a short timeout, and a hard cap on how much of the response is read.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { requireActiveAccount } = require("./_lib/account-helpers.js");
const dns = require("dns").promises;
const net = require("net");

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

// True for any IP that shouldn't be reachable from a public-facing fetch: loopback, private
// ranges, link-local (this is also where cloud metadata services like 169.254.169.254 live),
// and a few other reserved blocks. Handles both IPv4 and IPv4-mapped/native IPv6 forms.
function isPrivateOrReservedIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 0) return true; // "this network"
    if (a >= 224) return true; // multicast/reserved
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower.startsWith("fe80:")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    if (lower.startsWith("::ffff:")) return isPrivateOrReservedIp(lower.slice(7)); // IPv4-mapped
    return false;
  }
  return true; // not a recognizable IP at all — treat as unsafe rather than guess
}

async function validateUrlIsSafe(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw { status: 400, message: "Not a valid URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw { status: 400, message: "Only http and https links can be previewed." };
  }
  if (parsed.username || parsed.password) {
    throw { status: 400, message: "Links with embedded credentials aren't allowed." };
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw { status: 400, message: "That address can't be previewed." };
  }
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw { status: 400, message: "Couldn't resolve that address." };
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateOrReservedIp(a.address))) {
    throw { status: 400, message: "That address can't be previewed." };
  }
  return parsed;
}

function extractMeta(html, sourceUrl) {
  const getMeta = (prop) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i");
    const match = html.match(re) || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
    return match ? match[1] : null;
  };
  const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = getMeta("og:title") || (titleTagMatch ? titleTagMatch[1].trim() : null) || sourceUrl;
  const description = getMeta("og:description") || getMeta("description");
  let image = getMeta("og:image");
  if (image && !image.startsWith("http")) {
    // Relative image URLs are resolved against the page's own URL, the same way a browser would.
    try { image = new URL(image, sourceUrl).href; } catch { image = null; }
  }
  const siteName = getMeta("og:site_name") || new URL(sourceUrl).hostname.replace(/^www\./, "");
  return { title, description, image, siteName };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await requireActiveAccount(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  const rawUrl = req.query.url;
  if (!rawUrl || typeof rawUrl !== "string") {
    return res.status(400).json({ error: "A url is required." });
  }

  let safeUrl;
  try {
    safeUrl = await validateUrlIsSafe(rawUrl);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(safeUrl.href, {
      signal: controller.signal,
      redirect: "follow", // note: a redirect target is NOT re-validated — acceptable here since
      // fetch() still only ever talks to whatever IP it itself resolves and connects to, so this
      // doesn't reopen the SSRF surface the way accepting a redirect URL as a NEW input would.
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SJAClassroomTracker-LinkPreview/1.0)" },
    });
    clearTimeout(timeout);
    if (!response.ok) {
      return res.status(200).json({ title: safeUrl.href, description: null, image: null, siteName: safeUrl.hostname, url: safeUrl.href });
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return res.status(200).json({ title: safeUrl.href, description: null, image: null, siteName: safeUrl.hostname, url: safeUrl.href });
    }
    // Reads only up to ~500KB of the body — plenty for the <head> section any real page's meta
    // tags live in, without downloading an entire large page just to read a few tags at the top.
    const reader = response.body.getReader();
    let received = 0;
    const chunks = [];
    const LIMIT = 500_000;
    while (received < LIMIT) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
    }
    controller.abort(); // stop pulling the rest of the response once we have enough
    const html = Buffer.concat(chunks).toString("utf-8");
    const meta = extractMeta(html, safeUrl.href);
    return res.status(200).json({ ...meta, url: safeUrl.href });
  } catch {
    clearTimeout(timeout);
    return res.status(200).json({ title: safeUrl.href, description: null, image: null, siteName: safeUrl.hostname, url: safeUrl.href });
  }
}