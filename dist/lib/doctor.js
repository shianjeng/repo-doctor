export const VERSION = '0.1.0';
export const CATEGORIES = ['Documentation', 'Community', 'CI/CD', 'Security', 'Structure'];

export function parseRepo(input) {
  if (typeof input !== 'string' || input.length > 300) throw new Error('Enter a GitHub URL or owner/repository.');
  let value = input.trim();
  if (/^https?:\/\//i.test(value)) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Invalid repository URL.'); }
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash)
      throw new Error('Use a repository URL such as https://github.com/owner/repo.');
    value = url.pathname.replace(/^\//, '').replace(/\/$/, '');
  }
  value = value.replace(/\.git$/, '');
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})\/[a-zA-Z0-9_.-]{1,100}$/.test(value) || ['.', '..'].includes(value.split('/')[1]))
    throw new Error('Enter owner/repository or its GitHub URL, without a branch or file path.');
  return value;
}

export class GitHubError extends Error {
  constructor(message, status) { super(message); this.name = 'GitHubError'; this.status = status; }
}

// No arbitrary URLs, repository execution, cloning, or HTML rendering.
export async function collectRepository(input, { token, fetchImpl = fetch, timeout = 25000, onProgress = () => {} } = {}) {
  const name = parseRepo(input);
  const signal = AbortSignal.timeout(timeout);
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;
  async function request(path, { text = false, absent = [] } = {}) {
    let response;
    try {
      response = await fetchImpl(`https://api.github.com/repos/${name}${path}`, {
        headers: text ? { ...headers, Accept: 'application/vnd.github.raw+json' } : headers, signal,
      });
    } catch (error) {
      throw new GitHubError(signal.aborted ? 'The GitHub check timed out. Please try again.' : 'Could not reach GitHub. Check your connection and try again.', 0);
    }
    if (absent.includes(response.status)) return null;
    if (!response.ok) {
      let message = `GitHub returned HTTP ${response.status}.`;
      if (response.status === 404) message = 'Repository not found or not accessible. Check its spelling; the website supports public repositories.';
      if (response.status === 401) message = 'GitHub rejected the token. Check GITHUB_TOKEN.';
      if (response.status === 403 || response.status === 429) {
        const reset = response.headers.get('x-ratelimit-reset');
        message = response.headers.get('x-ratelimit-remaining') === '0' || response.status === 429
          ? `GitHub API rate limit reached.${reset ? ` Resets at ${new Date(Number(reset) * 1000).toISOString()}.` : ' Try again later.'} The CLI supports GITHUB_TOKEN.`
          : 'GitHub denied this request. Check access permissions or try again later.';
      }
      throw new GitHubError(message, response.status);
    }
    return text ? response.text() : response.json();
  }
  onProgress('Finding repository');
  const repo = await request('');
  onProgress('Reading README, project files, and community signals');
  const tasks = {
    tree: () => request(`/git/trees/${encodeURIComponent(repo.default_branch || 'HEAD')}?recursive=1`, { absent: [409] }),
    readme: () => request('/readme', { text: true, absent: [404] }),
    community: () => request('/community/profile'),
    release: () => request('/releases/latest', { absent: [404] }),
    label: () => request('/labels/good%20first%20issue', { absent: [404] }),
  };
  const results = await Promise.all(Object.entries(tasks).map(async ([key, fn]) => {
    try { return [key, { ok: true, value: await fn() }]; }
    catch (error) { return [key, { ok: false, error: error.message }]; }
  }));
  return { repo, sources: Object.fromEntries(results), checkedAt: new Date().toISOString() };
}

export function evaluateRepository({ repo, sources, checkedAt }) {
  const checks = [];
  const tree = sources.tree;
  const files = tree.ok ? (tree.value?.tree || []).filter(f => f.type === 'blob').map(f => f.path) : [];
  const completeTree = tree.ok && !tree.value?.truncated;
  const locate = regex => files.find(p => regex.test(p));
  const fileSignal = regex => locate(regex) ? true : completeTree ? false : null;
  const community = sources.community;
  const readme = sources.readme;
  const text = readme.ok ? (readme.value || '') : '';
  const doc = regex => readme.ok ? regex.test(text) : null;
  const communityFile = (name, pattern) => {
    if (community.ok && community.value?.files?.[name]) return true;
    const local = fileSignal(pattern);
    return local === true ? true : community.ok ? local : null;
  };
  const rootDoc = name => new RegExp(`^(?:\\.github/|docs/)?${name}(?:\\.[^/]+)?$`, 'i');
  const add = (id, category, title, weight, signal, evidence, fix) => checks.push({
    id, category, title, weight, status: signal === null ? 'unknown' : signal ? 'pass' : 'warn',
    evidence: signal === null ? 'This signal could not be verified from the available GitHub data.' : evidence,
    fix,
  });
  add('readme', 'Documentation', 'README', 10, readme.ok ? !!text.trim() : null, text.trim() ? 'GitHub returned a non-empty README.' : 'No readable README was found.', 'Write a README explaining what the project does, who it is for, and how to get started.');
  add('installation', 'Documentation', 'Installation instructions', 5, doc(/(?:^|\n)\s*#{1,6}\s+.*(?:install|getting started|quick\s*start|setup|安装|安裝|セットアップ)|(?:npm|pnpm|pip|cargo|brew)\s+(?:install|add)/im), 'README scanned for installation or quick-start instructions.', 'Add an Installation or Quick start section with a tested, copyable command.');
  add('usage', 'Documentation', 'Usage examples', 5, doc(/(?:^|\n)\s*#{1,6}\s+.*(?:usage|example|how to|使用|用法|使い方)/im), 'README scanned for a usage or examples heading.', 'Show a minimal input/output example under a Usage heading.');
  add('demo', 'Documentation', 'Demo or visual preview', 3, doc(/!\[[^\]]*\]\((?![^)]*(?:shields\.io|badge|actions\/workflows))[^)]+\)|<(?:video|img)\b[^>]*\bsrc\s*=\s*["'](?![^"']*(?:shields\.io|badge|actions\/workflows))|\[(?:[^\]]*(?:demo|playground|preview)[^\]]*)\]\(https?:\/\//i), 'README scanned for a non-badge image, video, or labeled demo link.', 'Add a screenshot, demo GIF, or live demo link above installation.');
  add('badge', 'Documentation', 'CI status badge', 2, doc(/(?:actions\/workflows\/[^\s)]+\/badge\.svg|travis-ci\.(?:org|com)\/[^\s)]+\.svg|circleci\.com\/[^\s)]+\.svg|img\.shields\.io\/(?:github\/actions|circleci|travis))/i), 'README scanned for a recognized CI badge URL.', 'Add a CI status badge linked to the workflow results.');
  add('license', 'Community', 'License', 8, repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? true : communityFile('license', /^(?:licen[sc]e|copying)(?:\.[^/]+)?$/i), repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? `GitHub identified ${repo.license.spdx_id}.` : 'Checked GitHub metadata and conventional license files; file presence does not establish legal validity.', 'Choose an appropriate open-source license and add its full text in LICENSE.');
  add('contributing', 'Community', 'Contributing guide', 5, communityFile('contributing', rootDoc('contributing')), 'Checked repository and GitHub community-profile contributing files.', 'Add CONTRIBUTING.md with setup, checks, and the pull request process.');
  add('conduct', 'Community', 'Code of conduct', 2, communityFile('code_of_conduct', rootDoc('code_of_conduct')), 'Checked repository and GitHub community-profile conduct files.', 'Add a CODE_OF_CONDUCT.md and a working private reporting channel.');
  add('templates', 'Community', 'Issue templates', 3, fileSignal(/^(?:\.github\/issue_template\/[^/]+\.(?:md|ya?ml)|(?:\.github\/|docs\/)?issue_template\.md)$/i), 'Scanned for issue templates and issue forms.', 'Add a bug report and feature request template in .github/ISSUE_TEMPLATE/.');
  add('first-issue', 'Community', 'Good first issue label', 2, sources.label.ok ? !!sources.label.value : null, 'Checked for the standard “good first issue” label; this does not verify labeled open issues.', 'Create a good first issue label and apply it to a small, well-described task.');
  add('ci', 'CI/CD', 'CI configuration', 10, fileSignal(/^(?:\.github\/workflows\/[^/]+\.ya?ml|\.circleci\/config\.yml|\.travis\.yml|azure-pipelines\.ya?ml|Jenkinsfile|\.gitlab-ci\.yml)$/i), 'Recognized automation configuration. Workflow execution and passing status are not verified.', 'Add a CI workflow that runs the project’s checks on pushes and pull requests.');
  add('tests', 'CI/CD', 'Test files', 6, fileSignal(/(?:^|\/)(?:tests?|__tests__|spec)\/.+|(?:^|\/)(?:test_[^/]+\.py|[^/]+(?:[._](?:test|spec)\.[^/]+|_test\.go))$/i), 'Scanned conventional test paths and filenames; coverage and correctness are not measured.', 'Add a focused test for the main user journey and run it in CI.');
  add('releases', 'CI/CD', 'Published release', 4, sources.release.ok ? !!sources.release.value : null, sources.release.value?.tag_name ? `Latest non-prerelease: ${sources.release.value.tag_name}.` : 'No published, non-draft, non-prerelease GitHub release found.', 'Publish a versioned GitHub release with installation details and change notes.');
  add('security', 'Security', 'Security policy', 10, fileSignal(rootDoc('security')), 'Scanned this repository for SECURITY.md or an equivalent conventional policy file.', 'Add SECURITY.md with supported versions and a private vulnerability reporting route.');
  add('dependencies', 'Security', 'Dependency update configuration', 5, fileSignal(/^(?:\.github\/dependabot\.ya?ml|(?:\.github\/)?renovate(?:\.json5?|rc(?:\.json)?)|\.renovaterc(?:\.json)?)$/i), 'Scanned for Dependabot or Renovate configuration. Organization settings are not visible here.', 'Configure Dependabot or Renovate for supported dependency ecosystems.');
  add('security-automation', 'Security', 'Security workflow signal', 5, fileSignal(/^\.github\/workflows\/[^/]*(?:codeql|security|snyk|semgrep|audit|scorecard)[^/]*\.ya?ml$/i), 'Workflow filenames are a heuristic. Default setup and organization-level scanners may not be visible.', 'Add a suitable security scanner, or verify your existing GitHub default setup manually.');
  add('manifest', 'Structure', 'Project manifest', 6, fileSignal(/(?:^|\/)(?:package\.json|pyproject\.toml|setup\.py|requirements[^/]*\.txt|Cargo\.toml|go\.mod|pom\.xml|build\.gradle(?:\.kts)?|Gemfile|composer\.json|Package\.swift|[^/]+\.csproj|CMakeLists\.txt|Makefile)$/i), 'Scanned for recognized package or build manifests.', 'Add a standard package/build manifest, or document how this repository is organized.');
  const lockApplicable = fileSignal(/(?:^|\/)(?:package\.json|Cargo\.toml|Gemfile|composer\.json|pyproject\.toml|go\.mod)$/i);
  add('lockfile', 'Structure', 'Dependency lockfile', 4, lockApplicable === false ? true : fileSignal(/(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|Cargo\.lock|poetry\.lock|uv\.lock|Pipfile\.lock|Gemfile\.lock|composer\.lock|go\.sum)$/i), lockApplicable === false ? 'Not required by the ecosystems detected; no penalty applied.' : 'Scanned recognized lockfiles. Some libraries intentionally omit them.', 'Commit a dependency lockfile when appropriate for your ecosystem and distribution model.');
  add('layout', 'Structure', 'Organized source or docs', 3, fileSignal(/^(?:src|app|lib|pkg|cmd|docs|examples|packages|dist|bin)\/.+/i), 'Scanned conventional source, documentation, and example directories.', 'Group source, documentation, or examples in a clearly named directory.');
  add('editor', 'Structure', 'Formatting configuration', 2, fileSignal(/(?:^|\/)(?:\.editorconfig|\.prettierrc(?:\.[^/]+)?|prettier\.config\.[^/]+|ruff\.toml|\.clang-format|rustfmt\.toml|\.eslintrc(?:\.[^/]+)?|eslint\.config\.[^/]+)$/i), 'Scanned conventional formatting/lint configuration filenames.', 'Add an .editorconfig or an ecosystem-specific formatter configuration.');
  const verified = checks.filter(c => c.status !== 'unknown');
  const possible = verified.reduce((n, c) => n + c.weight, 0);
  const earned = verified.filter(c => c.status === 'pass').reduce((n, c) => n + c.weight, 0);
  const score = possible ? Math.round(earned / possible * 100) : null;
  const categories = CATEGORIES.map(name => {
    const items = verified.filter(c => c.category === name);
    const max = items.reduce((n, c) => n + c.weight, 0);
    return { name, score: max ? Math.round(items.filter(c => c.status === 'pass').reduce((n, c) => n + c.weight, 0) / max * 100) : null };
  });
  const notes = Object.entries(sources).filter(([, s]) => !s.ok).map(([name, s]) => `${name}: ${s.error}`);
  if (tree.value?.truncated) notes.push('GitHub truncated the file tree. Absent file signals are unknown, not missing.');
  if (repo.archived) notes.push('This repository is archived. Recommendations may not match its maintenance goals.');
  if (!repo.description || repo.description.trim().length < 30) notes.push('The About description is short or missing. Describe the project’s purpose and audience (unscored heuristic).');
  return {
    version: VERSION, repository: repo.full_name, url: `https://github.com/${repo.full_name}`, description: repo.description || '',
    language: repo.language, stars: repo.stargazers_count, checkedAt, score, coverage: possible, earned,
    health: possible < 100 ? 'Partial check' : score >= 80 ? 'Healthy' : score >= 55 ? 'Needs attention' : 'Needs care',
    categories, checks, notes, suggestions: checks.filter(c => c.status === 'warn').sort((a, b) => b.weight - a.weight),
    disclaimer: 'Repository hygiene signals, not a security audit or code-quality guarantee. File detection is heuristic; CI results and test coverage are not verified.',
  };
}

export async function analyzeRepository(input, options) {
  return evaluateRepository(await collectRepository(input, options));
}

export function roast(report) {
  const missing = new Set(report.suggestions.map(c => c.id));
  if (missing.has('readme')) return 'Your code has entered the witness protection program. A README would help people find out what it does.';
  if (missing.has('security')) return 'Your repo has a front door, but no doorbell for security reports. Give the good hackers somewhere to knock.';
  if (missing.has('tests')) return '“Works on my machine” is doing a lot of heavy lifting here. Let a test share the load.';
  if (missing.has('contributing')) return 'You invited the internet to collaborate, then forgot to send the directions.';
  if (missing.has('demo')) return 'A thousand lines of README, and still no show-and-tell. Give your project its close-up.';
  return report.coverage < 100 ? 'The lab results are incomplete. Even a roast needs evidence.' : 'Annoyingly respectable. You have made this roast considerably harder.';
}

export function toMarkdown(report) {
  const safe = value => String(value ?? '').replace(/[\r\n|]/g, ' ').replace(/[<>]/g, '').replace(/([\\`*_\[\]])/g, '\\$1');
  return `# Repo Doctor — ${safe(report.repository)}\n\n**${report.score ?? '—'}/100 · ${report.health}**\n\nChecked: ${report.checkedAt}\nVerified scoring weight: ${report.coverage}/100\n\n| Category | Score |\n| --- | --- |\n${report.categories.map(c => `| ${c.name} | ${c.score ?? 'Unknown'}/100 |`).join('\n')}\n\n## Checks\n\n${report.checks.map(c => `- ${c.status === 'pass' ? '✓' : c.status === 'warn' ? '⚠' : '?'} **${c.title}** — ${safe(c.evidence)}`).join('\n')}\n\n## Suggested fixes\n\n${report.suggestions.map((c, i) => `${i + 1}. ${c.fix}`).join('\n') || 'No missing signals detected.'}\n${report.notes.length ? `\n## Notes\n\n${report.notes.map(n => `- ${safe(n)}`).join('\n')}\n` : ''}\n${report.disclaimer}\n`;
}
