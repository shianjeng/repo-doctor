// Cloudflare Worker: serves dist/ as static assets and runs checks at /api/check with the
// site's own GITHUB_TOKEN secret (5,000 requests/hour instead of 60 per visitor IP).
// Without the secret it answers 503 and the page falls back to calling GitHub from the browser.
import { analyzeRepository, parseRepo } from '../dist/lib/doctor.js';

const CACHE_SECONDS = 600;
const API_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...API_HEADERS, ...extra } });

export async function handleCheck(url, env, { analyze = analyzeRepository, cache = null, waitUntil = () => {} } = {}) {
  if (!env.GITHUB_TOKEN) return json({ error: 'Server checks are not configured.', code: 'not_configured' }, 503);
  let repository;
  try { repository = parseRepo(url.searchParams.get('repo') || ''); }
  catch (error) { return json({ error: error.message, code: 'bad_input' }, 400); }

  // One cache entry per repository, whatever form the visitor typed it in.
  const key = new Request(`https://repo-doctor.cache/api/check?repo=${encodeURIComponent(repository.toLowerCase())}`);
  const cached = cache && await cache.match(key);
  if (cached) return cached;

  try {
    const report = await analyze(repository, { token: env.GITHUB_TOKEN, publicOnly: true, timeout: 20000 });
    // The token's quota is shared by every visitor; it is not the visitor's own limit.
    report.rateLimit = null;
    report.checkedBy = 'server';
    const response = json(report, 200, { 'Cache-Control': `public, max-age=60, s-maxage=${CACHE_SECONDS}` });
    if (cache) waitUntil(cache.put(key, response.clone()));
    return response;
  } catch (error) {
    const status = error.code === 'not_found' ? 404 : error.code === 'rate_limit' ? 429 : 502;
    return json({ error: error.message, code: error.code || 'upstream', resetAt: error.resetAt || null }, status);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/check') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed.', code: 'method' }, 405, { Allow: 'GET' });
      return handleCheck(url, env, { cache: globalThis.caches?.default ?? null, waitUntil: promise => ctx.waitUntil(promise) });
    }
    return env.ASSETS.fetch(request);
  },
};
