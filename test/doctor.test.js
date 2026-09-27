import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRepo, analyzeRepository, evaluateRepository, toMarkdown, roast } from '../dist/lib/doctor.js';
import { main } from '../bin/repo-doctor.js';
import { mkdtemp, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ok = value => ({ ok: true, value });
function fixture(paths = []) {
  return {
    repo: { full_name: 'octocat/hello-world', default_branch: 'main', description: 'A small example repository for testing repository health.', license: { spdx_id: 'MIT' }, stars: 0 },
    checkedAt: '2026-09-27T00:00:00.000Z',
    sources: {
      tree: ok({ tree: paths.map(path => ({ path, type: 'blob' })), truncated: false }),
      readme: ok('# Project\n## Installation\nnpm install\n## Usage\nExample\n![Demo](demo.gif)\n![CI](https://github.com/o/r/actions/workflows/ci.yml/badge.svg)'),
      community: ok({ files: {} }), release: ok({ tag_name: 'v1.0.0' }), label: ok({ name: 'good first issue' }),
    },
  };
}
const allPaths = ['README.md', 'LICENSE', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', '.github/ISSUE_TEMPLATE/bug.yml', '.github/workflows/ci.yml', 'test/main.test.js', 'SECURITY.md', '.github/dependabot.yml', '.github/workflows/codeql.yml', 'package.json', 'package-lock.json', 'src/index.js', '.editorconfig'];

test('repository parsing accepts canonical inputs and rejects non-repository or unsafe URLs', () => {
  for (const input of ['octocat/hello-world', ' https://github.com/octocat/hello-world/ ', 'https://github.com/octocat/hello-world.git']) assert.equal(parseRepo(input), 'octocat/hello-world');
  for (const input of ['https://evil.test/o/r', 'https://github.com.evil.test/o/r', 'https://github.com/o/r/tree/main', 'https://user:secret@github.com/o/r', 'https://github.com:444/o/r', 'http://github.com/o/r', 'o/..', 'o/r?x=y', 'https://github.com/o/r#readme', null, 'a/b/c']) assert.throws(() => parseRepo(input));
});

test('all recognized signals earn exactly 100 total points across five categories', () => {
  const report = evaluateRepository(fixture(allPaths));
  assert.equal(report.checks.length, 20);
  assert.equal(report.checks.reduce((n, c) => n + c.weight, 0), 100);
  assert.equal(report.score, 100); assert.equal(report.coverage, 100);
  assert.equal(report.suggestions.length, 0);
  assert.ok(report.categories.every(c => c.score === 100));
});

test('missing security policy loses ten points and becomes the first prescription', () => {
  const report = evaluateRepository(fixture(allPaths.filter(p => p !== 'SECURITY.md')));
  assert.equal(report.score, 90);
  assert.equal(report.suggestions[0].id, 'security');
  assert.match(roast(report), /doorbell/);
});

test('truncated tree preserves positive evidence but does not penalize absent paths', () => {
  const data = fixture(['package.json']); data.sources.tree.value.truncated = true;
  const report = evaluateRepository(data);
  assert.equal(report.checks.find(c => c.id === 'manifest').status, 'pass');
  assert.equal(report.checks.find(c => c.id === 'security').status, 'unknown');
  assert.ok(report.coverage < 100);
  assert.equal(report.health, 'Partial check');
});

test('failed README request is unknown, not a missing README', () => {
  const data = fixture(allPaths); data.sources.readme = { ok: false, error: 'rate limited' };
  const report = evaluateRepository(data);
  assert.equal(report.coverage, 75);
  assert.equal(report.score, 100);
  assert.equal(report.checks.find(c => c.id === 'readme').status, 'unknown');
  assert.equal(report.suggestions.length, 0);
});

test('community profile can supply inherited contribution documents', () => {
  const data = fixture([]); data.sources.community.value.files.contributing = { name: 'CONTRIBUTING.md' };
  assert.equal(evaluateRepository(data).checks.find(c => c.id === 'contributing').status, 'pass');
});

test('a CI badge alone is not counted as a demo', () => {
  const data = fixture([]); data.sources.readme.value = '# Hello\n![CI](https://github.com/o/r/actions/workflows/ci.yml/badge.svg)';
  assert.equal(evaluateRepository(data).checks.find(c => c.id === 'demo').status, 'warn');
});

test('lockfiles are not required for an unrecognized ecosystem', () => {
  const report = evaluateRepository(fixture(['docs/index.md']));
  assert.equal(report.checks.find(c => c.id === 'lockfile').status, 'pass');
  assert.match(report.checks.find(c => c.id === 'lockfile').evidence, /Not required/);
});

test('HTTP collection uses GitHub only, sends token, and preserves branch names containing slashes', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/o/r')) return Response.json({ full_name: 'o/r', default_branch: 'release/v1' });
    if (url.includes('/git/trees/')) return Response.json({ tree: [], truncated: false });
    if (url.endsWith('/readme')) return new Response('# Hello');
    if (url.endsWith('/community/profile')) return Response.json({ files: {} });
    return new Response('', { status: 404 });
  };
  const report = await analyzeRepository('o/r', { fetchImpl, token: 'test-token' });
  assert.equal(calls.length, 6);
  assert.ok(calls.every(c => c.url.startsWith('https://api.github.com/repos/o/r') && c.options.headers.Authorization === 'Bearer test-token'));
  assert.ok(calls.some(c => c.url.includes('release%2Fv1')));
  assert.equal(report.checks.find(c => c.id === 'releases').status, 'warn');
  assert.equal(report.coverage, 100);
});

test('rate limits and missing repositories return useful errors', async () => {
  await assert.rejects(analyzeRepository('o/r', { fetchImpl: async () => new Response('', { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' } }) }), /rate limit reached/);
  await assert.rejects(analyzeRepository('o/r', { fetchImpl: async () => new Response('', { status: 404 }) }), /not found or not accessible/);
});

test('empty repository tree response is a verified absence, not a fatal error', async () => {
  const report = await analyzeRepository('o/r', { fetchImpl: async url => {
    if (url.endsWith('/o/r')) return Response.json({ full_name: 'o/r', default_branch: 'main' });
    if (url.includes('/git/trees/')) return new Response('', { status: 409 });
    if (url.endsWith('/community/profile')) return Response.json({ files: {} });
    return new Response('', { status: 404 });
  } });
  assert.equal(report.coverage, 100);
  assert.equal(report.checks.find(c => c.id === 'readme').status, 'warn');
});

test('timeout does not wait indefinitely', async () => {
  const fetchImpl = (_url, { signal }) => new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error('late')), 100);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
  await assert.rejects(analyzeRepository('o/r', { fetchImpl, timeout: 5 }), /timed out/);
});

test('Markdown exports contain real scores, all fixes, and provenance', () => {
  const report = evaluateRepository(fixture([])); const md = toMarkdown(report);
  assert.match(md, /Repo Doctor/); assert.match(md, /Verified scoring weight: 100/);
  assert.match(md, /SECURITY.md/); assert.match(md, /2026-09-27/);
});

async function cli(args, report = evaluateRepository(fixture(allPaths))) {
  let out = '', err = ''; let calls = 0;
  const code = await main(args, { analyze: async () => { calls++; return report; }, stdout: { write: text => out += text }, stderr: { write: text => err += text }, env: {} });
  return { code, out, err, calls };
}

test('CLI JSON is clean and CI thresholds have predictable exit codes', async () => {
  const result = await cli(['o/r', '--json', '--min-score', '80']);
  assert.equal(result.code, 0); assert.equal(JSON.parse(result.out).score, 100); assert.equal(result.err, '');
  assert.equal((await cli(['o/r', '--min-score', '95'], evaluateRepository(fixture([])))).code, 1);
  const partial = evaluateRepository(fixture(allPaths)); partial.coverage = 90;
  assert.equal((await cli(['o/r', '--min-score', '80'], partial)).code, 2);
});

test('CLI rejects invalid flags and thresholds without contacting GitHub', async () => {
  for (const args of [['o/r', '--min-score', '101'], ['o/r', '--min-score', ''], ['o/r', '--json', '--markdown'], ['o/r', '--unknown'], []]) {
    const result = await cli(args); assert.equal(result.code, 2); assert.equal(result.calls, 0);
  }
  assert.equal((await cli(['--help'])).calls, 0);
});

test('CLI runs through the symlink used by npm link and npm installation', { skip: process.platform === 'win32' }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'repo-doctor-test-'));
  try {
    const link = join(directory, 'repo-doctor');
    await symlink(fileURLToPath(new URL('../bin/repo-doctor.js', import.meta.url)), link);
    const result = spawnSync(process.execPath, [link, '--version'], { encoding: 'utf8' });
    assert.equal(result.status, 0); assert.equal(result.stdout.trim(), '0.1.0');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
