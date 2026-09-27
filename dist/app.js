import { analyzeRepository, badgeMarkdown, CATEGORIES, parseRepo, roast, toIssue, toMarkdown } from './lib/doctor.js';

const $ = id => document.getElementById(id);
let report = null;
let filter = 'all';
let busy = false;
let roastMode = false;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Only GitHub links produced by the scoring engine are rendered as anchors.
const githubLink = (url, label, className = 'fix-link') => /^https:\/\/github\.com\//.test(url || '')
  ? `<a class="${className}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} ↗</a>` : '';
const actionLink = action => action ? githubLink(action.prefill || action.url, action.label) : '';
const repoQuery = name => `?repo=${encodeURIComponent(name).replace('%2F', '/')}`;
const reportLink = () => `${location.origin}${location.pathname}${repoQuery(report.repository)}`;

const RECENT_KEY = 'repo-doctor:recent';
function readRecent() {
  try { const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(list) ? list.filter(r => typeof r?.repository === 'string').slice(0, 5) : []; }
  catch { return []; }
}
function remember(entry) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...readRecent().filter(r => r.repository !== entry.repository)].slice(0, 5))); } catch { /* Storage is optional. */ }
  renderRecent();
}
function renderRecent() {
  const recent = readRecent();
  $('recent').hidden = !recent.length;
  $('recent').innerHTML = recent.length ? `<span>RECENT</span>${recent.map(r => `<button type="button" data-repo="${escape(r.repository)}">${escape(r.repository)} <b>${r.score ?? '—'}</b></button>`).join('')}` : '';
}

async function copy(text, button) {
  const original = button.textContent;
  try { await navigator.clipboard.writeText(text); button.textContent = 'Copied ✓'; }
  catch { button.textContent = 'Copy failed'; }
  setTimeout(() => { button.textContent = original; }, 1600);
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderChecks() {
  const visible = report.checks.filter(c => filter === 'all' || c.status === filter);
  $('checks').innerHTML = CATEGORIES.map(category => {
    const items = visible.filter(c => c.category === category);
    if (!items.length) return '';
    return `<div class="check-group"><h4>${escape(category)}</h4>${items.map(c => `<details class="check ${c.status}"><summary><span class="check-icon">${c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '?'}</span><b>${escape(c.title)}</b><span class="check-status">${c.status === 'pass' ? 'LOOKING GOOD' : c.status === 'warn' ? 'NEEDS CARE' : 'UNKNOWN'}</span><span class="chevron">›</span></summary><p>${escape(c.evidence)}${c.status === 'warn' ? `<br><strong>Prescription:</strong> ${escape(c.fix)}` : ''}</p>${c.status === 'warn' && c.action ? `<div class="check-actions">${actionLink(c.action)}${c.action.snippet ? `<code>${escape(c.action.snippet)}</code><button type="button" class="copy-button" data-copy="${escape(c.action.snippet)}">Copy badge</button>` : ''}</div>` : ''}</details>`).join('')}</div>`;
  }).join('') || '<p class="empty-filter">No checks match this filter.</p>';
}

function render() {
  $('welcome').hidden = true;
  $('report').hidden = false;
  $('repo-name').textContent = report.repository;
  $('repo-name').href = report.url;
  $('repo-meta').textContent = `${report.language || 'Mixed languages'} · ${new Intl.NumberFormat('en', { notation: 'compact' }).format(report.stars || 0)} stars · Checked ${new Date(report.checkedAt).toLocaleString()}`;
  $('score').textContent = report.score ?? '—';
  document.querySelector('.score-ring').style.setProperty('--score', report.score ?? 0);
  $('health').textContent = `${report.health === 'Healthy' ? '↗ ' : ''}${report.health}`;
  $('coverage').textContent = `${report.checks.filter(c => c.status === 'pass').length} of ${report.checks.length} checks passed · ${report.coverage}% scoring coverage`;
  $('category-scores').innerHTML = report.categories.map(c => `<div class="category-row"><span>${escape(c.name)}</span><span>${c.score ?? '—'}<span> / 100</span></span></div><div class="bar"><span data-score="${c.score ?? 0}"></span></div>`).join('');
  $('category-scores').querySelectorAll('[data-score]').forEach(bar => { bar.style.width = `${bar.dataset.score}%`; });
  $('suggestions').innerHTML = report.suggestions.map(c => `<li><span>${escape(c.fix)}${c.action ? `<br>${actionLink(c.action)}` : ''}</span><small>${c.weight} POINTS</small></li>`).join('') || '<li><span>No missing signals detected. Keep your documentation and checks up to date.</span></li>';
  $('open-issue').hidden = !report.suggestions.length;
  $('notes').innerHTML = report.notes.map(n => `<p>ⓘ ${escape(n)}</p>`).join('');
  $('disclaimer').textContent = report.disclaimer;
  $('roast').textContent = roast(report);
  $('roast').hidden = !roastMode;
  const badge = badgeMarkdown(report, reportLink());
  $('badge-code').textContent = badge;
  $('badge-preview').src = badge.match(/\((https:\/\/img\.shields\.io[^)]+)\)/)[1];
  $('badge-preview').alt = `Repo Doctor ${report.score ?? '?'}/100`;
  renderChecks();
}

function setBusy(value) {
  busy = value;
  $('scan-button').disabled = value;
  document.querySelectorAll('[data-repo]').forEach(b => { b.disabled = value; });
  if (value) $('scan-button').textContent = 'Checking…';
  else $('scan-button').innerHTML = 'Check my repo <span>↗</span>';
  if (value) $('scan-form').setAttribute('aria-busy', 'true'); else $('scan-form').removeAttribute('aria-busy');
}

async function scan(repository, { scroll = true } = {}) {
  if (busy) throw new Error('A check is already running. Please wait.');
  setBusy(true);
  $('error').hidden = true;
  $('scan-status').textContent = 'Connecting to GitHub…';
  try {
    const next = await analyzeRepository(repository, { onProgress: message => { $('scan-status').textContent = `${message}…`; } });
    report = next;
    $('repo-input').value = `https://github.com/${report.repository}`;
    history.replaceState(null, '', repoQuery(report.repository));
    document.title = `${report.repository}: ${report.score ?? '—'}/100 · Repo Doctor`;
    render();
    remember({ repository: report.repository, score: report.score });
    const quota = report.rateLimit ? ` · ${report.rateLimit.remaining} GitHub API requests left this hour` : '';
    $('scan-status').textContent = `Check complete · ${report.checks.length} signals reviewed${report.coverage < 100 ? ' · some data could not be verified' : ''}${quota}.`;
    if (scroll) $('report').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    return { repository: report.repository, score: report.score, coverage: report.coverage, suggestions: report.suggestions.map(c => c.fix) };
  } catch (error) {
    $('error').textContent = error.message;
    $('error').hidden = false;
    $('scan-status').textContent = report ? `The new check failed. The previous report for ${report.repository} remains below.` : '';
    throw error;
  } finally {
    setBusy(false);
  }
}

$('scan-form').addEventListener('submit', e => { e.preventDefault(); scan($('repo-input').value).catch(() => {}); });
document.addEventListener('click', e => {
  const repo = e.target.closest('[data-repo]');
  if (repo && !repo.disabled) { $('repo-input').value = repo.dataset.repo; scan(repo.dataset.repo).catch(() => {}); return; }
  const copyButton = e.target.closest('[data-copy]');
  if (copyButton) copy(copyButton.dataset.copy, copyButton);
});
document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
  filter = b.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(other => other.setAttribute('aria-pressed', String(other === b)));
  renderChecks();
}));
for (const mode of ['doctor', 'roast']) $(mode + '-mode').addEventListener('click', () => {
  roastMode = mode === 'roast';
  $('doctor-mode').setAttribute('aria-pressed', String(!roastMode));
  $('roast-mode').setAttribute('aria-pressed', String(roastMode));
  $('roast').hidden = !roastMode;
});
$('export-markdown').addEventListener('click', () => {
  if (report) download(`${report.repository.replace('/', '-')}-health.md`, toMarkdown(report), 'text/markdown;charset=utf-8');
});
$('export-json').addEventListener('click', () => {
  if (report) download(`${report.repository.replace('/', '-')}-health.json`, JSON.stringify(report, null, 2), 'application/json');
});
$('share-report').addEventListener('click', e => { if (report) copy(reportLink(), e.currentTarget); });
$('copy-badge').addEventListener('click', e => { if (report) copy($('badge-code').textContent, e.currentTarget); });
$('open-issue').addEventListener('click', () => { if (report) open(toIssue(report).url, '_blank', 'noopener,noreferrer'); });

renderRecent();
const linked = new URLSearchParams(location.search).get('repo');
if (linked) {
  try { $('repo-input').value = `https://github.com/${parseRepo(linked)}`; scan(linked, { scroll: false }).catch(() => {}); }
  catch (error) { $('error').textContent = error.message; $('error').hidden = false; }
}

if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'check_repository', title: 'Check a GitHub repository',
      description: 'Read public GitHub data and display the repository health report on this page.',
      inputSchema: { type: 'object', properties: { repository: { type: 'string', description: 'owner/repository or https://github.com/owner/repository' } }, required: ['repository'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: input => scan(input?.repository),
    }, { signal: lifecycle.signal })).catch(() => {});
    addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  } catch { /* Optional browser capability. */ }
}
