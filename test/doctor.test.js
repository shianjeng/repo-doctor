import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRepo, analyzeRepository, evaluateRepository, toMarkdown, roast, badgeMarkdown, toIssue, compareReports, englishView, VERSION } from '../dist/lib/doctor.js';
import { ciWorkflow, dependabot } from '../dist/lib/templates.js';
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
      community: ok({ files: {} }), release: ok({ tag_name: 'v1.0.0' }), firstIssues: ok([{ number: 1 }]),
    },
  };
}
const allPaths = ['README.md', 'LICENSE', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', '.github/ISSUE_TEMPLATE/bug.yml', '.github/workflows/ci.yml', 'test/main.test.js', 'SECURITY.md', '.github/dependabot.yml', '.github/workflows/codeql.yml', 'package.json', 'package-lock.json', 'src/index.js', '.editorconfig'];

test('repository parsing accepts canonical inputs and rejects non-repository or unsafe URLs', () => {
  for (const input of ['octocat/hello-world', ' https://github.com/octocat/hello-world/ ', 'https://github.com/octocat/hello-world.git',
    'https://github.com/octocat/hello-world?tab=readme-ov-file', 'https://github.com/octocat/hello-world/tree/main/src', 'https://github.com/octocat/hello-world#readme',
    'https://www.github.com/octocat/hello-world', 'github.com/octocat/hello-world', 'http://github.com/octocat/hello-world/issues/1',
    'git@github.com:octocat/hello-world.git', 'ssh://git@github.com/octocat/hello-world.git']) assert.equal(parseRepo(input), 'octocat/hello-world', input);
  for (const input of ['https://evil.test/o/r', 'https://github.com.evil.test/o/r', 'evil.test/github.com/o/r', 'https://user:secret@github.com/o/r', 'https://github.com:444/o/r',
    'ftp://github.com/o/r', 'javascript:alert(1)', 'https://github.com/o', 'o/..', 'o/r?x=y', null, 'a/b/c', '-o/r']) assert.throws(() => parseRepo(input), String(input));
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
  // Six requests, plus the owner's .github repository because this repository has no community files.
  assert.equal(calls.length, 7);
  assert.ok(calls.some(c => c.url.includes('/issues?labels=good%20first%20issue')));
  assert.ok(calls.some(c => c.url === 'https://api.github.com/repos/o/.github/git/trees/HEAD?recursive=1'));
  assert.ok(calls.every(c => /^https:\/\/api\.github\.com\/repos\/o\/(?:r|\.github)[/?]?/.test(c.url) && c.options.headers.Authorization === 'Bearer test-token'));
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
  for (const args of [['o/r', '--min-score', '101'], ['o/r', '--min-score', ''], ['o/r', '--json', '--markdown'], ['o/r', '--badge', '--issue'], ['o/r', '--unknown'], []]) {
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
    assert.equal(result.status, 0); assert.equal(result.stdout.trim(), VERSION);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('the good first issue label alone does not pass; a labeled issue or disabled issues decide it', () => {
  const unused = fixture(allPaths); unused.sources.firstIssues = ok([]);
  assert.equal(evaluateRepository(unused).checks.find(c => c.id === 'first-issue').status, 'warn');
  const disabled = fixture(allPaths); disabled.repo.has_issues = false;
  assert.match(evaluateRepository(disabled).checks.find(c => c.id === 'first-issue').evidence, /disabled/);
});

test('an absent community profile (private repository) falls back to repository files instead of unknown', () => {
  const data = fixture(allPaths); data.sources.community = ok(null);
  const report = evaluateRepository(data);
  assert.equal(report.coverage, 100);
  assert.equal(report.checks.find(c => c.id === 'contributing').status, 'pass');
  assert.ok(report.notes.some(n => /community profile is unavailable/.test(n)));
  const failed = fixture([]); failed.sources.community = { ok: false, error: 'rate limited' };
  assert.equal(evaluateRepository(failed).checks.find(c => c.id === 'contributing').status, 'unknown');
});

test('a repository website counts as a live demo', () => {
  const data = fixture([]); data.sources.readme.value = '# Hello'; data.repo.homepage = 'https://example.org';
  const check = evaluateRepository(data).checks.find(c => c.id === 'demo');
  assert.equal(check.status, 'pass'); assert.match(check.evidence, /example\.org/);
});

test('every fix link stays on github.com, targets the default branch, and prefills starter files', () => {
  const data = fixture(['package.json', '.github/workflows/test.yml', 'README.md']); data.repo.default_branch = 'release/v1';
  const report = evaluateRepository(data);
  for (const c of report.checks.filter(c => c.action)) {
    assert.ok(c.action.url.startsWith('https://github.com/octocat/hello-world/'), c.id);
    if (c.action.prefill) assert.ok(c.action.prefill.startsWith(c.action.url), c.id);
  }
  const security = report.checks.find(c => c.id === 'security').action;
  assert.equal(security.url, 'https://github.com/octocat/hello-world/new/release/v1?filename=SECURITY.md');
  assert.match(decodeURIComponent(security.prefill), /Report a vulnerability/);
  assert.match(report.checks.find(c => c.id === 'badge').action?.snippet || '', /actions\/workflows\/test\.yml\/badge\.svg/);
  assert.equal(report.checks.find(c => c.id === 'installation').action.url, 'https://github.com/octocat/hello-world/edit/release/v1/README.md');
  assert.match(decodeURIComponent(report.checks.find(c => c.id === 'ci').action.prefill), /npm install/);
});

test('starter templates adapt to the detected ecosystem', () => {
  assert.match(ciWorkflow(['package.json', 'package-lock.json']), /npm ci/);
  assert.match(ciWorkflow(['go.mod']), /go test/);
  assert.equal(ciWorkflow(['index.html']), null);
  const config = dependabot(['package.json', 'sub/requirements.txt', '.github/workflows/ci.yml']);
  for (const name of ['npm', 'pip', 'github-actions']) assert.match(config, new RegExp(`package-ecosystem: ${name}`));
});

test('badge and issue exports carry the real score and every fix', () => {
  const report = evaluateRepository(fixture(allPaths.filter(p => p !== 'SECURITY.md')));
  assert.equal(badgeMarkdown(report, 'https://doctor.example/?repo=o/r'), '[![Repo Doctor](https://img.shields.io/badge/repo%20doctor-90%2F100-brightgreen)](https://doctor.example/?repo=o/r)');
  const issue = toIssue(report);
  assert.match(issue.title, /1 improvement suggested/);
  assert.match(issue.body, /- \[ \] \*\*Security policy\*\*/);
  assert.ok(issue.url.startsWith('https://github.com/octocat/hello-world/issues/new?title='));
  assert.equal(new URL(issue.url).searchParams.get('body'), issue.body);
});

test('rate-limit headers are reported with the lowest remaining count', async () => {
  let remaining = 50;
  const report = await analyzeRepository('o/r', { fetchImpl: async url => {
    const headers = { 'x-ratelimit-remaining': String(remaining--), 'x-ratelimit-limit': '60', 'x-ratelimit-reset': '1800000000' };
    if (url.endsWith('/o/r')) return Response.json({ full_name: 'o/r', default_branch: 'main' }, { headers });
    return new Response('', { status: 404, headers });
  } });
  assert.equal(report.rateLimit.remaining, 45); assert.equal(report.rateLimit.limit, 60);
});

test('CLI badge and issue modes print one line each', async () => {
  const badge = await cli(['o/r', '--badge']);
  assert.equal(badge.code, 0); assert.match(badge.out, /^\[!\[Repo Doctor\]\(https:\/\/img\.shields\.io\/badge\/repo%20doctor-100%2F100-brightgreen\)\]/);
  const issue = await cli(['o/r', '--issue']);
  assert.match(issue.out, /^https:\/\/github\.com\/octocat\/hello-world\/issues\/new\?title=/);
});

test('server endpoint needs a token, validates input, hides private repositories, and caches by repository', async () => {
  const { handleCheck } = await import('../worker/index.js');
  const url = repo => new URL(`https://doctor.example/api/check?repo=${encodeURIComponent(repo)}`);
  assert.equal((await handleCheck(url('o/r'), {})).status, 503);
  assert.equal((await handleCheck(url('not a repo'), { GITHUB_TOKEN: 't' })).status, 400);

  const seen = [];
  const analyze = async (repo, options) => { seen.push({ repo, options }); return { ...evaluateRepository(fixture(allPaths)), rateLimit: { remaining: 4999 } }; };
  const store = new Map();
  const cache = { match: async key => store.get(key.url)?.clone(), put: async (key, response) => { store.set(key.url, response); } };
  const pending = [];
  const first = await handleCheck(url('https://github.com/O/R?tab=readme-ov-file'), { GITHUB_TOKEN: 't' }, { analyze, cache, waitUntil: p => pending.push(p) });
  await Promise.all(pending);
  const body = await first.json();
  assert.equal(first.status, 200); assert.equal(body.score, 100); assert.equal(body.rateLimit, null); assert.equal(body.checkedBy, 'server');
  assert.deepEqual(seen[0].options, { token: 't', publicOnly: true, timeout: 20000 });
  assert.equal((await handleCheck(url('o/r'), { GITHUB_TOKEN: 't' }, { analyze, cache })).status, 200);
  assert.equal(seen.length, 1, 'second request is served from cache');

  const failing = code => async () => { throw Object.assign(new Error('x'), { code, resetAt: code === 'rate_limit' ? '2030-01-01T00:00:00.000Z' : null }); };
  assert.equal((await handleCheck(url('o/r'), { GITHUB_TOKEN: 't' }, { analyze: failing('not_found') })).status, 404);
  const limited = await handleCheck(url('o/r'), { GITHUB_TOKEN: 't' }, { analyze: failing('rate_limit') });
  assert.equal(limited.status, 429); assert.equal((await limited.json()).resetAt, '2030-01-01T00:00:00.000Z');
});

test('publicOnly refuses private repositories even when the token can read them', async () => {
  const fetchImpl = async url => url.endsWith('/o/r') ? Response.json({ full_name: 'o/r', private: true }) : new Response('', { status: 404 });
  await assert.rejects(analyzeRepository('o/r', { fetchImpl, publicOnly: true }), error => error.code === 'not_found');
});

test('rate-limit errors carry a code and reset time for translated messages', async () => {
  await assert.rejects(analyzeRepository('o/r', { fetchImpl: async () => new Response('', { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' } }) }),
    error => error.code === 'rate_limit' && error.resetAt === '2027-01-15T08:00:00.000Z');
});

test('Chinese and Japanese translations cover every check, variant, note, and roast', async () => {
  const { localizeReport, roastText, t, errorText, detectLanguage } = await import('../dist/i18n.js');
  const variants = [fixture([]), fixture(allPaths), fixture(['docs/x.md'])];
  variants[0].repo.homepage = 'https://example.org'; variants[0].sources.readme.value = '# x';
  variants[1].repo.has_issues = false; variants[1].sources.release = ok(null);
  variants[2].sources.readme = { ok: false, error: 'GitHub API rate limit reached. It resets at 2030-01-01T00:00:00.000Z.' };
  variants[2].repo.fork = true; variants[2].repo.archived = true; variants[2].repo.topics = []; variants[2].sources.community = ok(null);
  for (const lang of ['zh', 'ja']) {
    for (const data of variants) {
      const report = evaluateRepository(data);
      const L = localizeReport(lang, report);
      for (const c of report.checks) {
        const text = L.check(c);
        if (c.id !== 'readme') assert.notEqual(text.title, c.title, `${lang} title ${c.id}`);
        assert.notEqual(text.fix, c.fix, `${lang} fix ${c.id}`);
        assert.notEqual(text.evidence, c.evidence, `${lang} evidence ${c.id} ${c.status}`);
        if (c.action) assert.notEqual(text.actionLabel, c.action.label, `${lang} action ${c.id}`);
      }
      L.notes.forEach((note, i) => assert.notEqual(note, report.notes[i], `${lang} note ${report.notes[i]}`));
      assert.notEqual(L.health, report.health); assert.notEqual(L.disclaimer, report.disclaimer);
    }
    for (const id of ['readme', 'ci', 'security', 'license', 'tests', 'contributing', 'installation', 'usage', 'releases', 'demo', 'dependencies', 'partial', 'minor', 'clean'])
      assert.notEqual(roastText(lang, id, 'EN'), 'EN', `${lang} roast ${id}`);
    assert.notEqual(t(lang, 'hero.title'), t('en', 'hero.title'));
    assert.match(errorText(lang, { code: 'rate_limit', resetAt: '2030-01-01T00:00:00.000Z' }), /\d{2}:\d{2}/);
  }
  assert.equal(detectLanguage('?lang=ja', 'zh', ['en-US']), 'ja');
  assert.equal(detectLanguage('', null, ['zh-TW', 'en']), 'zh');
  assert.equal(detectLanguage('?lang=xx', null, ['fr-FR']), 'en');
});

test('every UI string has Chinese and Japanese text', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../dist/i18n.js', import.meta.url), 'utf8'));
  const { t } = await import('../dist/i18n.js');
  const keys = [...source.slice(source.indexOf('en: {'), source.indexOf('zh: {')).matchAll(/'([\w.\/ ,-]+)':/g)].map(m => m[1]);
  assert.ok(keys.length > 80);
  const same = new Set(['action.markdown', 'action.json']);
  for (const lang of ['zh', 'ja']) for (const key of keys) if (!same.has(key)) assert.notEqual(t(lang, key), t('en', key), `${lang} ${key}`);
});

test('community files inherited from the owner’s .github repository count, and a failed lookup is unknown', () => {
  const data = fixture(allPaths.filter(p => !['SECURITY.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', '.github/ISSUE_TEMPLATE/bug.yml'].includes(p)));
  data.sources.inherited = ok({ tree: ['SECURITY.md', 'CONTRIBUTING.md', 'profile/README.md', '.github/ISSUE_TEMPLATE/bug.yml'].map(path => ({ path, type: 'blob' })) });
  const report = evaluateRepository(data);
  const byId = id => report.checks.find(c => c.id === id);
  assert.equal(byId('security').status, 'pass');
  assert.match(byId('security').evidence, /^Inherited from octocat\/.github: SECURITY\.md\./);
  assert.equal(byId('contributing').status, 'pass');
  assert.equal(byId('templates').status, 'pass');
  assert.equal(byId('conduct').status, 'warn');
  data.sources.inherited = { ok: false, error: 'GitHub API rate limit reached.' };
  const failed = evaluateRepository(data);
  assert.equal(failed.checks.find(c => c.id === 'security').status, 'unknown');
  assert.equal(failed.health, 'Partial check');
});

test('the owner’s .github repository is only requested when a community file is missing', async () => {
  const run = async paths => {
    const calls = [];
    await analyzeRepository('o/r', { fetchImpl: async url => {
      calls.push(url);
      if (url.endsWith('/o/r')) return Response.json({ full_name: 'o/r', default_branch: 'main' });
      if (url.includes('/o/r/git/trees/')) return Response.json({ tree: paths.map(path => ({ path, type: 'blob' })), truncated: false });
      if (url.endsWith('/community/profile')) return Response.json({ files: {} });
      return new Response('', { status: 404 });
    } });
    return calls.filter(url => url.includes('/o/.github/')).length;
  };
  assert.equal(await run(['SECURITY.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', '.github/ISSUE_TEMPLATE/bug.yml']), 0);
  assert.equal(await run(['README.md']), 1);
});

test('secondary rate limits (Retry-After) are reported as rate limits', async () => {
  const before = Date.now();
  await assert.rejects(analyzeRepository('o/r', { fetchImpl: async () => new Response('', { status: 403, headers: { 'retry-after': '60', 'x-ratelimit-remaining': '4000' } }) }),
    error => error.code === 'rate_limit' && Date.parse(error.resetAt) >= before + 59000);
});

test('grouped top-level directories count as an organized layout', () => {
  const report = evaluateRepository(fixture(['cli/main.rs', 'runtime/lib.rs', 'README.md']));
  assert.equal(report.checks.find(c => c.id === 'layout').status, 'pass');
  assert.equal(evaluateRepository(fixture(['main.py', 'README.md'])).checks.find(c => c.id === 'layout').status, 'warn');
});

test('compareReports lists score change, newly passing, and newly failing checks', () => {
  const report = evaluateRepository(fixture(allPaths.filter(p => p !== 'SECURITY.md')));
  const passedBefore = report.checks.filter(c => c.status === 'pass' && c.id !== 'license').map(c => c.id).concat('security');
  const diff = compareReports({ score: 70, passed: passedBefore, checkedAt: '2026-09-01T00:00:00.000Z' }, report);
  assert.equal(diff.delta, 20);
  assert.deepEqual(diff.fixed, ['license']);
  assert.deepEqual(diff.regressed, ['security']);
  assert.equal(compareReports(null, report), null);
  assert.deepEqual(compareReports({ score: 90 }, report), { since: null, delta: 0, fixed: [], regressed: [] });
});

test('exports accept a translated view', () => {
  const report = evaluateRepository(fixture([]));
  const view = { ...englishView(report), text: { ...englishView(report).text, fixes: 'Fixes-X', issueMany: '{n} items-X' }, check: c => ({ title: `T-${c.id}`, fix: `F-${c.id}`, evidence: 'E', actionLabel: 'A' }) };
  const md = toMarkdown(report, view);
  assert.match(md, /## Fixes-X/); assert.match(md, /\*\*T-security\*\*/); assert.match(md, /F-security \[A\]\(https:\/\/github\.com\//);
  const issue = toIssue(report, view);
  assert.match(issue.title, /^\d+ items-X$/); assert.match(issue.body, /- \[ \] \*\*T-security\*\* — F-security/);
});

test('README detection accepts Setext/HTML headings, install links, code examples, and documentation links', () => {
  const status = (readme, id) => { const data = fixture([]); data.sources.readme.value = readme; return evaluateRepository(data).checks.find(c => c.id === id).status; };
  assert.equal(status('Proj\n\nInstallation\n============\n', 'installation'), 'pass');
  assert.equal(status('<h2 align="center">Getting Started</h2>', 'installation'), 'pass');
  assert.equal(status('See [Install Flutter](https://docs.flutter.dev/get-started/install).', 'installation'), 'pass');
  assert.equal(status('Read docs/intro/install.txt for instructions on installing Django.', 'installation'), 'pass');
  assert.equal(status('# Flask\n\nA lightweight web framework.\n\nSome intro\n---\n', 'installation'), 'warn');
  assert.equal(status('## Features\n- fast', 'usage'), 'pass');
  assert.equal(status('```\na\n```\n\n```\nb\n```', 'usage'), 'pass');
  assert.equal(status('All documentation is in the "docs" directory and online at\nhttps://docs.example.org/.', 'usage'), 'pass');
  assert.equal(status('Read the `user guide <https://example.org/guide>`_.', 'usage'), 'pass');
  assert.equal(status('```\npip install x\n```', 'usage'), 'warn');
});

test('server re-checks skip the cache at most once a minute per repository', async () => {
  const { handleCheck } = await import('../worker/index.js');
  const store = new Map();
  const cache = { match: async key => store.get(key.url)?.clone(), put: async (key, response) => { store.set(key.url, response); } };
  let checks = 0; let clock = Date.parse('2026-09-30T00:00:00Z');
  const analyze = async () => { checks++; return { ...evaluateRepository(fixture(allPaths)), checkedAt: new Date(clock).toISOString() }; };
  const request = async query => { const pending = []; const response = await handleCheck(new URL(`https://doctor.example/api/check?${query}`), { GITHUB_TOKEN: 't' }, { analyze, cache, now: () => clock, waitUntil: p => pending.push(p), log: { error() {}, warn() {} } }); await Promise.all(pending); return response; };
  await request('repo=o/r');
  await request('repo=o/r&fresh=1');
  assert.equal(checks, 1, 'a fresh request within a minute of the cached check reuses it');
  clock += 61_000;
  await request('repo=o/r');
  assert.equal(checks, 1, 'without fresh=1 the cache is used');
  const fresh = await request('repo=o/r&fresh=1');
  assert.equal(checks, 2);
  assert.equal(fresh.headers.get('X-Checked-At'), new Date(clock).toISOString());
});

test('server logs an expired or revoked token', async () => {
  const { handleCheck } = await import('../worker/index.js');
  const logged = [];
  const response = await handleCheck(new URL('https://doctor.example/api/check?repo=o/r'), { GITHUB_TOKEN: 't' }, {
    analyze: async () => { throw Object.assign(new Error('GitHub rejected the token.'), { code: 'bad_token' }); }, log: { error: m => logged.push(m), warn: m => logged.push(m) },
  });
  assert.equal(response.status, 502);
  assert.match(logged[0], /GITHUB_TOKEN/);
});

test('GitHub Action writes the summary and outputs, and enforces min-score', async () => {
  const { run } = await import('../action/index.js');
  const act = async (inputs, report = evaluateRepository(fixture(allPaths.filter(p => p !== 'SECURITY.md')))) => {
    const files = {}; const lines = []; let options;
    const code = await run({
      env: { GITHUB_REPOSITORY: 'octocat/hello-world', GITHUB_STEP_SUMMARY: 'summary', GITHUB_OUTPUT: 'output', ...inputs },
      analyze: async (repo, opts) => { options = { repo, ...opts }; return report; },
      log: line => lines.push(line), append: async (file, text) => { files[file] = (files[file] || '') + text; },
    });
    return { code, files, lines, options };
  };
  const ok = await act({ 'INPUT_TOKEN': 'workflow-token' });
  assert.equal(ok.code, 0);
  assert.deepEqual(ok.options, { repo: 'octocat/hello-world', token: 'workflow-token' });
  assert.match(ok.files.summary, /^# Repo Doctor — octocat\/hello-world/);
  assert.match(ok.files.output, /^score=90\nhealth=Healthy\ncoverage=100\nsuggestions=1\n$/);
  assert.match(ok.lines[0], /^::notice title=Repo Doctor::octocat\/hello-world scored 90\/100 \(Healthy\)\. 1 suggested fix;/);
  const low = await act({ 'INPUT_MIN-SCORE': '95' });
  assert.equal(low.code, 1); assert.match(low.lines.at(-1), /^::error title=Repo Doctor::Score 90\/100 is below the minimum of 95/);
  const partial = evaluateRepository(fixture(allPaths)); partial.coverage = 90;
  assert.equal((await act({ 'INPUT_MIN-SCORE': '10' }, partial)).code, 1);
  const bad = await act({ 'INPUT_MIN-SCORE': 'high' });
  assert.equal(bad.code, 1); assert.match(bad.lines[0], /min-score must be a number/);
  assert.equal((await act({ 'INPUT_REPOSITORY': 'other/repo' })).options.repo, 'other/repo');
});

test('terminal colors only when enabled, and never from repository text', async () => {
  const { toTerminal } = await import('../bin/repo-doctor.js');
  const report = evaluateRepository(fixture([]));
  report.notes.push('evil \u001b[31m note');
  assert.ok(!toTerminal(report).includes('\u001b'));
  const colored = toTerminal(report, false, true);
  assert.match(colored, /\u001b\[33m⚠ /);
  assert.ok(!colored.includes('\u001b[31m note'));
  let out = '';
  await main(['o/r'], { analyze: async () => report, stdout: { write: t => out += t, isTTY: true }, stderr: { write() {} }, env: {} });
  assert.ok(out.includes('\u001b['));
  out = '';
  await main(['o/r', '--no-color'], { analyze: async () => report, stdout: { write: t => out += t, isTTY: true }, stderr: { write() {} }, env: {} });
  assert.ok(!out.includes('\u001b'));
});

test('translations cover inherited files and translated exports', async () => {
  const { localizeReport } = await import('../dist/i18n.js');
  const data = fixture(allPaths.filter(p => p !== 'SECURITY.md'));
  data.sources.inherited = ok({ tree: [{ path: 'SECURITY.md', type: 'blob' }] });
  const report = evaluateRepository(data);
  const security = report.checks.find(c => c.id === 'security');
  assert.match(localizeReport('zh', report).check(security).evidence, /^继承自 octocat\/.github\/SECURITY\.md/);
  assert.match(localizeReport('ja', report).check(security).evidence, /^octocat\/.github\/SECURITY\.md から継承/);
  const failed = fixture([]); failed.sources.inherited = { ok: false, error: 'GitHub API rate limit reached. It resets at 2030-01-01T00:00:00.000Z.' };
  assert.match(localizeReport('zh', evaluateRepository(failed)).notes.find(n => n.includes('.github')), /^所有者的 \.github 仓库 请求失败：已达到 GitHub 每小时请求上限/);
  const md = toMarkdown(report, localizeReport('ja', report));
  assert.match(md, /## 診断項目/); assert.match(md, /\*\*セキュリティポリシー\*\*/);
  const issue = toIssue(evaluateRepository(fixture([])), localizeReport('zh', evaluateRepository(fixture([]))));
  assert.match(issue.title, /^Repo Doctor 建议了 \d+ 项仓库改进$/);
});
