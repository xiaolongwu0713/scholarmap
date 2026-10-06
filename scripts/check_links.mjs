#!/usr/bin/env node
// Broken-link check: fetches every sitemap URL plus every internal link found on those
// pages, and exits 1 if any returns 4xx/5xx. Also pings the backend health check.
// --sitemap-only skips the internal links (the daily check). --sample=N checks only N random
// internal links (the weekly check); without it every internal link is checked (monthly).
//
//   node scripts/check_links.mjs [--sitemap-only | --sample=N] [siteUrl] [apiUrl]
//
// Node 20+, no dependencies. Concurrency stays low and the full crawl waits 2 s between
// requests: uncached ISR pages render on demand against the small backend.

const args = process.argv.slice(2);
const SITEMAP_ONLY = args.includes('--sitemap-only');
const SAMPLE = Number(args.find((a) => a.startsWith('--sample='))?.split('=')[1]) || 0;
const [siteArg, apiArg] = args.filter((a) => !a.startsWith('--'));
const SITE = (siteArg || 'https://labscout.io').replace(/\/$/, '');
const API = (apiArg || 'https://scholarmap-q1k1.onrender.com').replace(/\/$/, '');
const CONCURRENCY = 1;
// Pause between requests in the full crawl to spare the small database
const DELAY_MS = SITEMAP_ONLY ? 0 : 2_000;
const TIMEOUT_MS = 60_000;
// Not public pages: API routes, the Sentry tunnel, static assets
const SKIP = [/^\/api\//, /^\/monitoring/, /^\/_next\//, /\.(png|jpe?g|svg|webp|ico|css|js|xml|txt|pdf)$/];

async function get(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': 'LabScout-LinkCheck/1.0' },
      });
      // Retry server errors once: a cold ISR render can time out on the first hit
      if (res.status >= 500 && attempt < 2) continue;
      const type = res.headers.get('content-type') || '';
      return { status: res.status, body: /html|xml/.test(type) ? await res.text() : '' };
    } catch (error) {
      if (attempt < 2) continue;
      return { status: 0, body: '', error: String(error.cause?.code || error.name || error) };
    }
  }
}

function internalLinks(html) {
  const paths = new Set();
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    let path;
    if (href.startsWith('/') && !href.startsWith('//')) path = href;
    else if (href.startsWith(SITE + '/')) path = href.slice(SITE.length);
    else continue;
    path = path.split('#')[0].replace(/&amp;/g, '&');
    if (path && !SKIP.some((re) => re.test(path))) paths.add(path);
  }
  return paths;
}

async function runPool(items, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        await worker(items[next++]);
        if (DELAY_MS) await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }),
  );
}

const broken = [];

const health = await get(`${API}/healthz`);
if (health.status !== 200) broken.push({ url: `${API}/healthz`, status: health.status, error: health.error, from: '(backend)' });

const sitemap = await get(`${SITE}/sitemap.xml`);
if (sitemap.status !== 200) {
  console.error(`sitemap.xml returned ${sitemap.status}`);
  process.exit(1);
}
const sitemapPaths = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE, '') || '/');

// Referrer for each discovered path, for the report
const seen = new Map(sitemapPaths.map((p) => [p, 'sitemap.xml']));
const discovered = [];

await runPool(sitemapPaths, async (path) => {
  const { status, body, error } = await get(SITE + path);
  if (status >= 400 || status === 0) broken.push({ url: path, status, error, from: 'sitemap.xml' });
  if (SITEMAP_ONLY) return;
  for (const link of internalLinks(body)) {
    if (!seen.has(link)) {
      seen.set(link, path);
      discovered.push(link);
    }
  }
});

// Linked pages come from a few shared templates, so a random sample catches a broken pattern
let linked = discovered;
if (SAMPLE && SAMPLE < discovered.length) {
  linked = [...discovered];
  for (let i = linked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [linked[i], linked[j]] = [linked[j], linked[i]];
  }
  linked = linked.slice(0, SAMPLE);
}

await runPool(linked, async (path) => {
  const { status, error } = await get(SITE + path);
  if (status >= 400 || status === 0) broken.push({ url: path, status, error, from: seen.get(path) });
});

const linkedNote = linked.length < discovered.length ? ` (random sample of ${discovered.length})` : '';
console.log(`Checked ${sitemapPaths.length} sitemap URLs + ${linked.length} linked URLs${linkedNote} on ${SITE}`);
if (broken.length === 0) {
  console.log('No broken links.');
  process.exit(0);
}
console.log(`\n${broken.length} broken:`);
for (const b of broken.sort((a, c) => a.url.localeCompare(c.url))) {
  console.log(`  ${b.status || b.error}  ${b.url}  (linked from ${b.from})`);
}
process.exit(1);
