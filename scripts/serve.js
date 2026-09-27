import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { handleCheck } from '../worker/index.js';
const root = fileURLToPath(new URL('../dist', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
// Mirror the production headers from dist/_headers (only the catch-all `/*` block is used).
const headers = Object.fromEntries((await readFile(resolve(root, '_headers'), 'utf8').catch(() => ''))
  .split('\n').filter(line => /^\s+[\w-]+:/.test(line)).map(line => line.trim().split(/:\s*(.*)/s).slice(0, 2)));
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    // Same endpoint as production. Without GITHUB_TOKEN it answers 503 and the page calls GitHub directly.
    if (url.pathname === '/api/check') {
      const response = await handleCheck(url, process.env);
      res.writeHead(response.status, Object.fromEntries(response.headers)).end(await response.text());
      return;
    }
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(root + sep) || path.endsWith(`${sep}_headers`)) { res.writeHead(404).end('Not found'); return; }
    const body = await readFile(path);
    res.writeHead(200, { ...headers, 'Content-Type': `${types[extname(path)] || 'application/octet-stream'}; charset=utf-8` }).end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`Repo Doctor: http://127.0.0.1:${server.address().port}`));
