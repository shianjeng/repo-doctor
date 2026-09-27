import * as templates from './templates.js';

export const VERSION = '0.3.0';
export const CATEGORIES = ['Documentation', 'Community', 'CI/CD', 'Security', 'Structure'];
export const PROJECT_URL = 'https://github.com/shianjeng/repo-doctor';

const NAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})\/[a-zA-Z0-9_.-]{1,100}$/;

// Accepts owner/repo, any github.com page inside a repository (tree, blob, issues, ?tab=…),
// scheme-less github.com/owner/repo, and SSH clone URLs. Only the owner/repo pair is kept.
export function parseRepo(input) {
  if (typeof input !== 'string' || input.length > 300) throw new Error('Enter a GitHub URL or owner/repository.');
  let value = input.trim();
  const ssh = value.match(/^(?:ssh:\/\/)?git@github\.com[:/](.+)$/i);
  if (ssh) value = ssh[1];
  else if (/^(?:www\.)?github\.com\//i.test(value)) value = `https://${value}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !ssh) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Invalid repository URL.'); }
    if (!['https:', 'http:'].includes(url.protocol) || !['github.com', 'www.github.com'].includes(url.hostname) || url.port || url.username || url.password)
      throw new Error('Use a GitHub repository URL such as https://github.com/owner/repo.');
    value = url.pathname.split('/').filter(Boolean).slice(0, 2).join('/');
  } else if (value.includes('?') || value.includes('#')) {
    throw new Error('Enter owner/repository or its GitHub URL.');
  }
  value = value.replace(/\/+$/, '').replace(/\.git$/i, '');
  if (!NAME.test(value) || ['.', '..'].includes(value.split('/')[1]))
    throw new Error('Enter owner/repository or its GitHub URL, for example shianjeng/repo-doctor.');
  return value;
}

export class GitHubError extends Error {
  constructor(message, status, { code = null, resetAt = null } = {}) {
    super(message); this.name = 'GitHubError'; this.status = status; this.code = code; this.resetAt = resetAt;
  }
}

// No arbitrary URLs, repository execution, cloning, or HTML rendering.
// publicOnly: refuse private repositories even if the token could read them (used by the website's server).
export async function collectRepository(input, { token, fetchImpl = fetch, timeout = 25000, onProgress = () => {}, publicOnly = false } = {}) {
  const name = parseRepo(input);
  const signal = AbortSignal.timeout(timeout);
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let rateLimit = null;
  async function request(path, { text = false, absent = [] } = {}) {
    let response;
    try {
      response = await fetchImpl(`https://api.github.com/repos/${name}${path}`, {
        headers: text ? { ...headers, Accept: 'application/vnd.github.raw+json' } : headers, signal,
      });
    } catch {
      throw signal.aborted
        ? new GitHubError('The GitHub check timed out. Please try again.', 0, { code: 'timeout' })
        : new GitHubError('Could not reach GitHub. Check your connection and try again.', 0, { code: 'network' });
    }
    const remaining = Number(response.headers.get('x-ratelimit-remaining'));
    const limit = Number(response.headers.get('x-ratelimit-limit'));
    if (response.headers.has('x-ratelimit-remaining') && Number.isFinite(remaining) && (!rateLimit || remaining < rateLimit.remaining)) {
      const reset = Number(response.headers.get('x-ratelimit-reset'));
      rateLimit = { remaining, limit: Number.isFinite(limit) ? limit : null, reset: Number.isFinite(reset) && reset ? new Date(reset * 1000).toISOString() : null };
    }
    if (absent.includes(response.status)) return null;
    if (!response.ok) {
      const status = response.status;
      if (status === 404) throw new GitHubError('Repository not found or not accessible. Check its spelling; the website supports public repositories.', status, { code: 'not_found' });
      if (status === 401) throw new GitHubError('GitHub rejected the token. Check GITHUB_TOKEN.', status, { code: 'bad_token' });
      if (status === 429 || (status === 403 && response.headers.get('x-ratelimit-remaining') === '0')) {
        const reset = Number(response.headers.get('x-ratelimit-reset'));
        const resetAt = reset ? new Date(reset * 1000).toISOString() : null;
        throw new GitHubError(`GitHub API rate limit reached.${resetAt ? ` It resets at ${resetAt}.` : ' Try again later.'}`, status, { code: 'rate_limit', resetAt });
      }
      if (status === 403) throw new GitHubError('GitHub denied this request. Check access permissions or try again later.', status, { code: 'denied' });
      throw new GitHubError(`GitHub returned HTTP ${status}.`, status);
    }
    return text ? response.text() : response.json();
  }
  onProgress('Finding repository');
  const repo = await request('');
  if (publicOnly && repo.private) throw new GitHubError('Repository not found or not accessible. Check its spelling; the website supports public repositories.', 404, { code: 'not_found' });
  onProgress('Reading README, project files, and community signals');
  const tasks = {
    tree: () => request(`/git/trees/${encodeURIComponent(repo.default_branch || 'HEAD')}?recursive=1`, { absent: [409] }),
    readme: () => request('/readme', { text: true, absent: [404] }),
    // The community profile is only served for public repositories.
    community: () => request('/community/profile', { absent: [404] }),
    release: () => request('/releases/latest', { absent: [404] }),
    // GitHub creates the label by default, so look for issues that actually use it. 410: issues disabled.
    firstIssues: () => request('/issues?labels=good%20first%20issue&state=all&per_page=1', { absent: [404, 410] }),
  };
  const results = await Promise.all(Object.entries(tasks).map(async ([key, fn]) => {
    try { return [key, { ok: true, value: await fn() }]; }
    catch (error) { return [key, { ok: false, error: error.message }]; }
  }));
  return { repo, sources: Object.fromEntries(results), checkedAt: new Date().toISOString(), rateLimit };
}

const path = value => value.split('/').map(encodeURIComponent).join('/');

function newFile(base, branch, filename, content) {
  const url = `${base}/new/${path(branch)}?filename=${encodeURIComponent(filename)}`;
  return { url, prefill: content ? `${url}&value=${encodeURIComponent(content)}` : url };
}

export function evaluateRepository({ repo, sources, checkedAt, rateLimit = null }) {
  const checks = [];
  const base = `https://github.com/${repo.full_name}`;
  const branch = repo.default_branch || 'main';
  const tree = sources.tree;
  const files = tree.ok ? (tree.value?.tree || []).filter(f => f.type === 'blob').map(f => f.path) : [];
  const completeTree = tree.ok && !tree.value?.truncated;
  const locate = regex => files.find(p => regex.test(p));
  const fileSignal = regex => locate(regex) ? true : completeTree ? false : null;
  const community = sources.community;
  const communityFiles = community.ok ? community.value?.files : null;
  const readme = sources.readme;
  const text = readme.ok ? (readme.value || '') : '';
  const doc = regex => readme.ok ? regex.test(text) : null;
  // A failed profile request leaves inherited organization files unknown; an absent profile (private repo) does not.
  const communityFile = (name, pattern) => {
    if (communityFiles?.[name]) return true;
    const local = fileSignal(pattern);
    return local === true ? true : community.ok ? local : null;
  };
  const rootDoc = name => new RegExp(`^(?:\\.github/|docs/)?${name}(?:\\.[^/]+)?$`, 'i');
  const readmePath = locate(/^readme(?:\.[^/]+)?$/i) || locate(/^(?:\.github|docs)\/readme(?:\.[^/]+)?$/i);
  const editReadme = readmePath ? { label: 'Edit README on GitHub', url: `${base}/edit/${path(branch)}/${path(readmePath)}` } : null;
  const add = (id, category, title, weight, signal, evidence, fix, action = null) => checks.push({
    id, category, title, weight, status: signal === null ? 'unknown' : signal ? 'pass' : 'warn',
    evidence: signal === null ? 'This signal could not be verified from the available GitHub data.' : evidence,
    fix, action,
  });

  add('readme', 'Documentation', 'README', 10, readme.ok ? !!text.trim() : null,
    text.trim() ? 'GitHub returned a non-empty README.' : 'No readable README was found.',
    'Write a README explaining what the project does, who it is for, and how to get started.',
    { label: 'Create README.md on GitHub', ...newFile(base, branch, 'README.md', templates.README(repo.full_name)) });
  add('installation', 'Documentation', 'Installation instructions', 5,
    doc(/(?:^|\n)\s*#{1,6}\s+.*(?:install|getting started|quick\s*start|setup|build|安装|安裝|快速开始|セットアップ|インストール)|(?:(?:npm|pnpm|yarn|bun|pip3?|pipx|uv|poetry|cargo|brew|gem|go|composer|dotnet|conda|apt(?:-get)?)\s+(?:install|add|get|require|i)\b|git clone|docker (?:run|compose|pull)|npx\s+\S)/im),
    'README scanned for installation or quick-start instructions.', 'Add an Installation or Quick start section with a tested, copyable command.', editReadme);
  add('usage', 'Documentation', 'Usage examples', 5, doc(/(?:^|\n)\s*#{1,6}\s+.*(?:usage|example|how to|tutorial|demo|使用|用法|示例|例子|使い方)/im),
    'README scanned for a usage or examples heading.', 'Show a minimal input/output example under a Usage heading.', editReadme);
  const demoInReadme = doc(/!\[[^\]]*\]\((?![^)]*(?:shields\.io|badge|actions\/workflows))[^)]+\)|<(?:video|img)\b[^>]*\bsrc\s*=\s*["'](?![^"']*(?:shields\.io|badge|actions\/workflows))|\[(?:[^\]]*(?:demo|playground|preview|live|try it)[^\]]*)\]\(https?:\/\//i);
  const homepage = /^https?:\/\//i.test(repo.homepage || '') ? repo.homepage : '';
  add('demo', 'Documentation', 'Demo or visual preview', 3, homepage ? true : demoInReadme,
    homepage && !demoInReadme ? `Repository website: ${homepage}` : 'README scanned for a non-badge image, video, or labeled demo link, and the repository website field checked.',
    'Add a screenshot, demo GIF, or live demo link above installation, or set the repository website.', editReadme);
  const workflows = files.filter(p => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(p));
  const mainWorkflow = workflows.find(p => /(?:^|\/)(?:ci|test|tests|build|main)\.ya?ml$/i.test(p)) || workflows.find(p => !/codeql|dependabot|release|pages|stale|label/i.test(p));
  const badgeFile = mainWorkflow?.split('/').pop();
  add('badge', 'Documentation', 'CI status badge', 2,
    doc(/(?:actions\/workflows\/[^\s)]+\/badge\.svg|travis-ci\.(?:org|com)\/[^\s)]+\.svg|circleci\.com\/[^\s)]+\.svg|gitlab\.com\/[^\s)]+\/pipeline\.svg|img\.shields\.io\/(?:github\/(?:actions\/)?(?:workflow\/)?status|github\/actions|github\/check-runs|circleci|travis))/i),
    'README scanned for a recognized CI badge URL.', 'Add a CI status badge linked to the workflow results.',
    editReadme && badgeFile ? { ...editReadme, snippet: `[![CI](${base}/actions/workflows/${encodeURIComponent(badgeFile)}/badge.svg)](${base}/actions/workflows/${encodeURIComponent(badgeFile)})` } : editReadme);

  const spdx = repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : null;
  add('license', 'Community', 'License', 8, spdx ? true : communityFile('license', /^(?:licen[sc]e|copying)(?:[.-][^/]+)?$/i),
    spdx ? `GitHub identified ${spdx}.` : 'Checked GitHub metadata and conventional license files; file presence does not establish legal validity.',
    'Choose an appropriate open-source license and add its full text in LICENSE.',
    { label: 'Choose a license on GitHub', url: `${base}/community/license/new?branch=${encodeURIComponent(branch)}` });
  add('contributing', 'Community', 'Contributing guide', 5, communityFile('contributing', rootDoc('contributing')),
    'Checked repository and GitHub community-profile contributing files.', 'Add CONTRIBUTING.md with setup, checks, and the pull request process.',
    { label: 'Create CONTRIBUTING.md on GitHub', ...newFile(base, branch, 'CONTRIBUTING.md', templates.CONTRIBUTING(repo.full_name)) });
  add('conduct', 'Community', 'Code of conduct', 2, communityFile('code_of_conduct', rootDoc('code_of_conduct')),
    'Checked repository and GitHub community-profile conduct files.', 'Add a CODE_OF_CONDUCT.md and a working private reporting channel.',
    { label: 'Add a code of conduct on GitHub', url: `${base}/community/code-of-conduct/new?branch=${encodeURIComponent(branch)}` });
  add('templates', 'Community', 'Issue templates', 3, communityFiles?.issue_template ? true : fileSignal(/^(?:\.github\/issue_template\/[^/]+\.(?:md|ya?ml)|(?:\.github\/|docs\/)?issue_template\.md)$/i),
    'Scanned for issue templates and issue forms.', 'Add a bug report and feature request template in .github/ISSUE_TEMPLATE/.',
    { label: 'Set up issue templates on GitHub', url: `${base}/issues/templates/edit` });
  const firstIssues = sources.firstIssues;
  add('first-issue', 'Community', 'Good first issues', 2, repo.has_issues === false ? false : firstIssues.ok ? Array.isArray(firstIssues.value) && firstIssues.value.length > 0 : null,
    repo.has_issues === false ? 'Issues are disabled, so newcomers have nowhere to start.' : 'Looked for at least one issue (open or closed) labeled “good first issue”. GitHub creates the label by default, so the label alone does not count.',
    'Label a small, well-described task as good first issue so newcomers know where to start.',
    { label: 'Open a good first issue on GitHub', url: `${base}/issues/new?labels=${encodeURIComponent('good first issue')}` });

  const ciFile = templates.ciWorkflow(files);
  add('ci', 'CI/CD', 'CI configuration', 10,
    fileSignal(/^(?:\.github\/workflows\/[^/]+\.ya?ml|\.circleci\/config\.ya?ml|\.travis\.yml|azure-pipelines\.ya?ml|Jenkinsfile|\.gitlab-ci\.ya?ml|bitbucket-pipelines\.yml|\.buildkite\/[^/]+\.ya?ml|\.drone\.yml|\.woodpecker(?:\.ya?ml|\/[^/]+\.ya?ml))$/i),
    'Recognized automation configuration. Workflow execution and passing status are not verified.', 'Add a CI workflow that runs the project’s checks on pushes and pull requests.',
    ciFile ? { label: 'Create a CI workflow on GitHub', ...newFile(base, branch, '.github/workflows/ci.yml', ciFile) } : { label: 'Choose a workflow on GitHub', url: `${base}/actions/new` });
  add('tests', 'CI/CD', 'Test files', 6, fileSignal(/(?:^|\/)(?:tests?|__tests__|spec|specs)\/.+|(?:^|\/)(?:test_[^/]+\.py|[^/]+(?:[._](?:test|spec)\.[^/]+|_test\.(?:go|py|exs?)|Tests?\.(?:swift|kt|java|cs)))$/i),
    'Scanned conventional test paths and filenames; coverage and correctness are not measured.', 'Add a focused test for the main user journey and run it in CI.');
  add('releases', 'CI/CD', 'Published release', 4, sources.release.ok ? !!sources.release.value : null,
    sources.release.value?.tag_name ? `Latest non-prerelease: ${sources.release.value.tag_name}.` : 'No published, non-draft, non-prerelease GitHub release found.',
    'Publish a versioned GitHub release with installation details and change notes.',
    { label: 'Draft a release on GitHub', url: `${base}/releases/new` });

  add('security', 'Security', 'Security policy', 10, fileSignal(rootDoc('security')),
    'Scanned this repository for SECURITY.md or an equivalent conventional policy file.', 'Add SECURITY.md with supported versions and a private vulnerability reporting route.',
    { label: 'Create SECURITY.md on GitHub', ...newFile(base, branch, 'SECURITY.md', templates.SECURITY(repo.full_name)) });
  add('dependencies', 'Security', 'Dependency update configuration', 5, fileSignal(/^(?:\.github\/dependabot\.ya?ml|(?:\.github\/|\.gitlab\/)?renovate(?:\.json5?)?|\.renovaterc(?:\.json5?)?)$/i),
    'Scanned for Dependabot or Renovate configuration. Organization settings are not visible here.', 'Configure Dependabot or Renovate for supported dependency ecosystems.',
    { label: 'Create dependabot.yml on GitHub', ...newFile(base, branch, '.github/dependabot.yml', templates.dependabot(files)) });
  add('security-automation', 'Security', 'Security workflow signal', 5, fileSignal(/^\.github\/workflows\/[^/]*(?:codeql|security|snyk|semgrep|audit|scorecard|trivy|gitleaks|osv|zizmor)[^/]*\.ya?ml$/i),
    'Workflow filenames are a heuristic. Default setup and organization-level scanners may not be visible.', 'Add a suitable security scanner, or verify your existing GitHub default setup manually.',
    { label: 'Open code security settings', url: `${base}/settings/security_analysis` });

  add('manifest', 'Structure', 'Project manifest', 6, fileSignal(/(?:^|\/)(?:package\.json|deno\.jsonc?|pyproject\.toml|setup\.py|setup\.cfg|requirements[^/]*\.txt|Pipfile|Cargo\.toml|go\.mod|pom\.xml|build\.gradle(?:\.kts)?|build\.sbt|Gemfile|[^/]+\.gemspec|composer\.json|Package\.swift|pubspec\.yaml|mix\.exs|[^/]+\.(?:csproj|fsproj|sln|cabal)|Project\.toml|DESCRIPTION|CMakeLists\.txt|meson\.build|Makefile|flake\.nix)$/i),
    'Scanned for recognized package or build manifests.', 'Add a standard package/build manifest, or document how this repository is organized.');
  const lockApplicable = fileSignal(/(?:^|\/)(?:package\.json|Cargo\.toml|Gemfile|composer\.json|pyproject\.toml|Pipfile|pubspec\.yaml|mix\.exs)$/i);
  add('lockfile', 'Structure', 'Dependency lockfile', 4, lockApplicable === false ? true : fileSignal(/(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|deno\.lock|Cargo\.lock|poetry\.lock|uv\.lock|pdm\.lock|Pipfile\.lock|Gemfile\.lock|composer\.lock|pubspec\.lock|mix\.lock|requirements[^/]*\.txt)$/i),
    lockApplicable === false ? 'Not required by the ecosystems detected; no penalty applied.' : 'Scanned recognized lockfiles and pinned requirement files. Some libraries intentionally omit them.',
    'Commit a dependency lockfile when appropriate for your ecosystem and distribution model.');
  add('layout', 'Structure', 'Organized source or docs', 3, fileSignal(/^(?:src|app|lib|pkg|cmd|internal|docs|examples|packages|crates|bin|source|include)\/.+/i),
    'Scanned conventional source, documentation, and example directories.', 'Group source, documentation, or examples in a clearly named directory.');
  add('editor', 'Structure', 'Formatting configuration', 2, fileSignal(/(?:^|\/)(?:\.editorconfig|\.prettierrc(?:\.[^/]+)?|prettier\.config\.[^/]+|biome\.jsonc?|\.rustfmt\.toml|rustfmt\.toml|ruff\.toml|\.clang-format|\.eslintrc(?:\.[^/]+)?|eslint\.config\.[^/]+|\.golangci\.ya?ml|\.rubocop\.yml|\.swiftformat|\.swiftlint\.yml|\.pre-commit-config\.yaml)$/i),
    'Scanned conventional formatting/lint configuration filenames.', 'Add an .editorconfig or an ecosystem-specific formatter configuration.',
    { label: 'Create .editorconfig on GitHub', ...newFile(base, branch, '.editorconfig', templates.EDITORCONFIG) });

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
  if (community.ok && !community.value) notes.push('GitHub’s community profile is unavailable (usual for private repositories); community files inherited from an organization were not checked.');
  if (repo.archived) notes.push('This repository is archived. Recommendations may not match its maintenance goals.');
  if (repo.fork) notes.push('This repository is a fork. Community files may live in the upstream project.');
  if (!repo.description || repo.description.trim().length < 30) notes.push('The About description is short or missing. Describe the project’s purpose and audience (unscored heuristic).');
  if (Array.isArray(repo.topics) && !repo.topics.length) notes.push('No repository topics are set. Topics help people discover the project in GitHub search (unscored).');
  return {
    version: VERSION, repository: repo.full_name, url: base, defaultBranch: branch, description: repo.description || '',
    language: repo.language, stars: repo.stargazers_count, checkedAt, score, coverage: possible, earned,
    health: possible < 100 ? 'Partial check' : score >= 80 ? 'Healthy' : score >= 55 ? 'Needs attention' : 'Needs care',
    categories, checks, notes, rateLimit,
    suggestions: checks.filter(c => c.status === 'warn').sort((a, b) => b.weight - a.weight),
    disclaimer: 'Repository hygiene signals, not a security audit or code-quality guarantee. File detection is heuristic; CI results and test coverage are not verified.',
  };
}

export async function analyzeRepository(input, options) {
  return evaluateRepository(await collectRepository(input, options));
}

const ROASTS = {
  readme: 'Your code has entered the witness protection program. A README would help people find out what it does.',
  ci: 'No CI? Bold. Every merge is a trust fall with no one there to catch it.',
  security: 'Your repo has a front door, but no doorbell for security reports. Give the good hackers somewhere to knock.',
  license: 'No license means “all rights reserved.” You built a playground and put a fence around it.',
  tests: '“Works on my machine” is doing a lot of heavy lifting here. Let a test share the load.',
  contributing: 'You invited the internet to collaborate, then forgot to send the directions.',
  installation: 'Great project. Now if only anyone could figure out how to install it.',
  usage: 'It installs! And then… vibes. Show people what to actually type.',
  releases: 'No releases — just a main branch and a prayer. Tag something; your future self will thank you.',
  demo: 'A thousand lines of README, and still no show-and-tell. Give your project its close-up.',
  dependencies: 'Your dependencies are aging like milk, and nobody is checking the date. Let a bot do it.',

  partial: 'The lab results are incomplete. Even a roast needs evidence.',
  minor: 'Only minor paperwork left. It is hard to roast a repo that flosses.',
  clean: 'Annoyingly respectable. You have made this roast considerably harder.',
};

// Which roast applies; the website translates by this id.
export function roastId(report) {
  const missing = new Set(report.suggestions.map(c => c.id));
  const id = ['readme', 'ci', 'security', 'license', 'tests', 'contributing', 'installation', 'usage', 'releases', 'demo', 'dependencies'].find(key => missing.has(key));
  if (id) return id;
  if (report.coverage < 100) return 'partial';
  return report.suggestions.length ? 'minor' : 'clean';
}

export function roast(report) {
  return ROASTS[roastId(report)];
}

export function badgeColor(score) {
  return score === null ? 'lightgrey' : score >= 80 ? 'brightgreen' : score >= 55 ? 'yellow' : 'orange';
}

// A static shields.io badge. `link` defaults to this project; the website passes its own report URL.
export function badgeMarkdown(report, link = PROJECT_URL) {
  const message = encodeURIComponent(`${report.score ?? '?'}/100`).replace(/-/g, '--');
  return `[![Repo Doctor](https://img.shields.io/badge/repo%20doctor-${message}-${badgeColor(report.score)})](${link})`;
}

// A GitHub issue with the fixes as a task list, for maintainers who want to track them.
export function toIssue(report) {
  const title = `Repo health: ${report.suggestions.length} improvement${report.suggestions.length === 1 ? '' : 's'} suggested by Repo Doctor`;
  const lines = report.suggestions.map(c => `- [ ] **${c.title}** — ${c.fix}${c.action ? ` ([${c.action.label}](${c.action.url}))` : ''}`);
  const body = `Repo Doctor scored this repository **${report.score ?? '—'}/100** (${report.health}) on ${report.checkedAt.slice(0, 10)}.\n\n${lines.join('\n') || 'No missing signals detected.'}\n\n_${report.disclaimer}_\n\nGenerated by [Repo Doctor](${PROJECT_URL}) v${report.version}.`;
  return { title, body, url: `${report.url}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}` };
}

export function toMarkdown(report) {
  const safe = value => String(value ?? '').replace(/[\r\n|]/g, ' ').replace(/[<>]/g, '').replace(/([\\`*_\[\]])/g, '\\$1');
  return `# Repo Doctor — ${safe(report.repository)}\n\n**${report.score ?? '—'}/100 · ${report.health}**\n\nChecked: ${report.checkedAt}\nVerified scoring weight: ${report.coverage}/100\n\n| Category | Score |\n| --- | --- |\n${report.categories.map(c => `| ${c.name} | ${c.score ?? 'Unknown'}/100 |`).join('\n')}\n\n## Checks\n\n${report.checks.map(c => `- ${c.status === 'pass' ? '✓' : c.status === 'warn' ? '⚠' : '?'} **${c.title}** — ${safe(c.evidence)}`).join('\n')}\n\n## Suggested fixes\n\n${report.suggestions.map((c, i) => `${i + 1}. ${c.fix}${c.action ? ` [${c.action.label}](${c.action.url})` : ''}${c.action?.snippet ? `\n\n   \`\`\`markdown\n   ${c.action.snippet}\n   \`\`\`` : ''}`).join('\n') || 'No missing signals detected.'}\n${report.notes.length ? `\n## Notes\n\n${report.notes.map(n => `- ${safe(n)}`).join('\n')}\n` : ''}\n${report.disclaimer}\n`;
}
