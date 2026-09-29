// GitHub Action entry point (see action.yml). No dependencies: inputs arrive as INPUT_* variables,
// outputs and the job summary are appended to the files GitHub names in the environment.
import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { analyzeRepository, toMarkdown } from '../dist/lib/doctor.js';

// Workflow-command escaping from GitHub's documentation.
const escapeData = value => String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = value => escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');

export async function run({ env = process.env, analyze = analyzeRepository, log = console.log, append = appendFile } = {}) {
  const input = name => (env[`INPUT_${name.toUpperCase()}`] || '').trim();
  try {
    const repository = input('repository') || env.GITHUB_REPOSITORY;
    const minText = input('min-score');
    const minimum = minText === '' ? undefined : Number(minText);
    if (minimum !== undefined && (!/^\d+(?:\.\d+)?$/.test(minText) || minimum > 100)) throw new Error('min-score must be a number from 0 to 100.');

    const report = await analyze(repository, { token: input('token') || undefined });
    if (env.GITHUB_STEP_SUMMARY) await append(env.GITHUB_STEP_SUMMARY, `${toMarkdown(report)}\n`);
    if (env.GITHUB_OUTPUT) await append(env.GITHUB_OUTPUT, `score=${report.score ?? ''}\nhealth=${report.health}\ncoverage=${report.coverage}\nsuggestions=${report.suggestions.length}\n`);
    log(`::notice title=${escapeProperty('Repo Doctor')}::${escapeData(`${report.repository} scored ${report.score ?? '—'}/100 (${report.health}). ${report.suggestions.length} suggested fix${report.suggestions.length === 1 ? '' : 'es'}; see the job summary.`)}`);

    if (minimum === undefined) return 0;
    if (report.coverage < 100) {
      log(`::error title=${escapeProperty('Repo Doctor')}::${escapeData(`Only ${report.coverage}/100 of the scoring weight could be verified, so the minimum score of ${minimum} cannot be confirmed. See the notes in the job summary.`)}`);
      return 1;
    }
    if (report.score < minimum) {
      log(`::error title=${escapeProperty('Repo Doctor')}::${escapeData(`Score ${report.score}/100 is below the minimum of ${minimum}. Top fix: ${report.suggestions[0]?.fix ?? '—'}`)}`);
      return 1;
    }
    return 0;
  } catch (error) {
    log(`::error title=${escapeProperty('Repo Doctor')}::${escapeData(error.message)}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exitCode = await run();
