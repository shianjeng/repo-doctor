#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { analyzeRepository, badgeMarkdown, roast, toIssue, toMarkdown, VERSION } from '../dist/lib/doctor.js';

export const HELP = `Repo Doctor — a little care for your code.

Usage: repo-doctor <owner/repo | GitHub URL> [options]

  --json              Print machine-readable JSON
  --markdown          Print a Markdown report
  --roast             Add a gentle, evidence-based roast
  --badge             Print a Markdown score badge for your README
  --issue             Print a GitHub link that opens the fixes as a task-list issue
  --min-score <0-100> Exit 1 below a minimum score (CI mode)
  --help, -h          Show this help
  --version, -v       Show version

Accepts owner/repo, any github.com URL inside the repository, or git@github.com:owner/repo.git.
Optional GITHUB_TOKEN enables authenticated requests / private repositories.
Exit codes: 0 completed; 1 below threshold; 2 error or incomplete CI check.
No cloning, code execution, writes to GitHub, or AI API key required.
`;

const clean = value => String(value).replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ');
export function toTerminal(report, withRoast = false) {
  const row = (left, right = '') => `│ ${clean(left).padEnd(23)}${clean(right).padStart(12)} │`;
  const lines = [
    '╭─────────────────────────────────────╮', row('Repo Doctor 🩺'),
    '├─────────────────────────────────────┤', row('Score', `${report.score ?? '—'}/100`),
    ...report.categories.map(c => row(c.name, `${c.score ?? '—'}/100`)),
    '╰─────────────────────────────────────╯',
    `${report.repository} · ${report.health}`, `Verified scoring weight: ${report.coverage}/100`, '',
    ...report.checks.map(c => `${c.status === 'pass' ? '✓' : c.status === 'warn' ? '⚠' : '?'} ${c.title}`),
    '', 'Suggested fixes', ...report.suggestions.flatMap((c, i) => [`${i + 1}. ${c.fix}`, ...(c.action ? [`   → ${c.action.url}`] : []), ...(c.action?.snippet ? [`   ${c.action.snippet}`] : [])]),
    ...report.notes.map(n => `Note: ${n}`), '', report.disclaimer,
  ];
  if (withRoast) lines.push('', `Roast: ${roast(report)}`);
  return lines.map(clean).join('\n') + '\n';
}

export async function main(args = process.argv.slice(2), { analyze = analyzeRepository, stdout = process.stdout, stderr = process.stderr, env = process.env } = {}) {
  try {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, strict: true, options: {
      json: { type: 'boolean' }, markdown: { type: 'boolean' }, roast: { type: 'boolean' },
      badge: { type: 'boolean' }, issue: { type: 'boolean' }, 'min-score': { type: 'string' }, help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
    } });
    if (values.help) { stdout.write(HELP); return 0; }
    if (values.version) { stdout.write(`${VERSION}\n`); return 0; }
    if (positionals.length !== 1) throw new Error('Provide exactly one GitHub repository. Use --help for examples.');
    if ([values.json, values.markdown, values.badge, values.issue].filter(Boolean).length > 1) throw new Error('Choose only one of --json, --markdown, --badge, or --issue.');
    const minimum = values['min-score'] === undefined ? undefined : Number(values['min-score']);
    if (minimum !== undefined && (!/^\d+(?:\.\d+)?$/.test(values['min-score']) || minimum < 0 || minimum > 100)) throw new Error('--min-score must be a number from 0 to 100.');
    const report = await analyze(positionals[0], { token: env.GITHUB_TOKEN });
    stdout.write(values.json ? JSON.stringify(report, null, 2) + '\n'
      : values.markdown ? toMarkdown(report)
      : values.badge ? badgeMarkdown(report) + '\n'
      : values.issue ? toIssue(report).url + '\n'
      : toTerminal(report, values.roast));
    if (!env.GITHUB_TOKEN && report.rateLimit && report.rateLimit.remaining < 12)
      stderr.write(`Repo Doctor: ${report.rateLimit.remaining} unauthenticated GitHub API requests left this hour. Set GITHUB_TOKEN for a higher limit.\n`);
    if (minimum !== undefined && report.coverage < 100) {
      stderr.write('Repo Doctor: incomplete check; refusing to pass the CI threshold with unverified signals.\n');
      return 2;
    }
    return minimum !== undefined && (report.score === null || report.score < minimum) ? 1 : 0;
  } catch (error) { stderr.write(`Repo Doctor: ${clean(error.message)}\n`); return 2; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exitCode = await main();
