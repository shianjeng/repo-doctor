import { analyzeRepository, badgeMarkdown, CATEGORIES, parseRepo, roast, roastId, toIssue, toMarkdown } from './lib/doctor.js';
import { categoryName, detectLanguage, errorText, LANGUAGES, localizeReport, roastText, t } from './i18n.js';

const $ = id => document.getElementById(id);
let report = null;
let filter = 'all';
let busy = false;
let roastMode = false;
let serverAvailable = true;
let lastStatus = null;
let lastError = null;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Only GitHub links produced by the scoring engine are rendered as anchors.
const githubLink = (url, label, className = 'fix-link') => /^https:\/\/github\.com\//.test(url || '')
  ? `<a class="${className}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} ↗</a>` : '';
const repoQuery = name => `?repo=${encodeURIComponent(name).replace('%2F', '/')}`;
const reportLink = () => `${location.origin}${location.pathname}${repoQuery(report.repository)}`;

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* Storage is optional. */ } },
};
let lang = detectLanguage(location.search, storage.get('repo-doctor:lang'));

function applyLanguage() {
  document.documentElement.lang = { zh: 'zh-CN', ja: 'ja' }[lang] || 'en';
  $('language').value = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(lang, el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(lang, el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(lang, el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(lang, el.dataset.i18nAria)); });
  document.querySelectorAll('[data-category]').forEach(el => { el.textContent = categoryName(lang, el.dataset.category); });
  if (busy) $('scan-button').textContent = t(lang, 'scan.busy');
  if (lastStatus) setStatus(...lastStatus);
  if (lastError) showError(lastError);
  renderRecent();
  if (report) render();
  else document.title = t(lang, 'meta.title');
}

function setStatus(key, params = {}) {
  lastStatus = key ? [key, params] : null;
  if (!key) { $('scan-status').textContent = ''; return; }
  if (key === 'done') {
    $('scan-status').textContent = t(lang, 'status.done', params) + (params.partial ? t(lang, 'status.partial') : '') + (params.quota !== undefined ? t(lang, 'status.quota', { n: params.quota }) : '') + (lang === 'en' ? '.' : '');
  } else $('scan-status').textContent = t(lang, `status.${key}`, params);
}

function showError(error) {
  lastError = error;
  $('error').hidden = !error;
  if (error) $('error').textContent = errorText(lang, error);
}

const RECENT_KEY = 'repo-doctor:recent';
function readRecent() {
  try { const list = JSON.parse(storage.get(RECENT_KEY) || '[]'); return Array.isArray(list) ? list.filter(r => typeof r?.repository === 'string').slice(0, 5) : []; }
  catch { return []; }
}
function remember(entry) {
  storage.set(RECENT_KEY, JSON.stringify([entry, ...readRecent().filter(r => r.repository !== entry.repository)].slice(0, 5)));
  renderRecent();
}
function renderRecent() {
  const recent = readRecent();
  $('recent').hidden = !recent.length;
  $('recent').innerHTML = recent.length ? `<span>${escape(t(lang, 'recent'))}</span>${recent.map(r => `<button type="button" data-repo="${escape(r.repository)}">${escape(r.repository)} <b>${r.score ?? '—'}</b></button>`).join('')}` : '';
}

async function copy(text, button) {
  const original = button.textContent;
  try { await navigator.clipboard.writeText(text); button.textContent = t(lang, 'copy.done'); }
  catch { button.textContent = t(lang, 'copy.fail'); }
  setTimeout(() => { button.textContent = original; }, 1600);
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderChecks(L) {
  const visible = report.checks.filter(c => filter === 'all' || c.status === filter);
  $('checks').innerHTML = CATEGORIES.map(category => {
    const items = visible.filter(c => c.category === category);
    if (!items.length) return '';
    return `<div class="check-group"><h4>${escape(L.category(category))}</h4>${items.map(c => {
      const text = L.check(c);
      const actions = c.status === 'warn' && c.action ? `<div class="check-actions">${githubLink(c.action.prefill || c.action.url, text.actionLabel)}${c.action.snippet ? `<code>${escape(c.action.snippet)}</code><button type="button" class="copy-button" data-copy="${escape(c.action.snippet)}">${escape(t(lang, 'copy.badge'))}</button>` : ''}</div>` : '';
      return `<details class="check ${c.status}"><summary><span class="check-icon">${c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '?'}</span><b>${escape(text.title)}</b><span class="check-status">${escape(t(lang, `status.${c.status}`))}</span><span class="chevron">›</span></summary><p>${escape(text.evidence)}${c.status === 'warn' ? `<br><strong>${escape(t(lang, 'rx.label'))}</strong> ${escape(text.fix)}` : ''}</p>${actions}</details>`;
    }).join('')}</div>`;
  }).join('') || `<p class="empty-filter">${escape(t(lang, 'filter.empty'))}</p>`;
}

function render() {
  const L = localizeReport(lang, report);
  $('welcome').hidden = true;
  $('report').hidden = false;
  document.title = t(lang, 'doc.title', { repo: report.repository, score: report.score ?? '—' });
  $('repo-name').textContent = report.repository;
  $('repo-name').href = report.url;
  $('repo-meta').textContent = t(lang, 'meta.line', {
    language: report.language || t(lang, 'meta.mixed'),
    stars: new Intl.NumberFormat(lang, { notation: 'compact' }).format(report.stars || 0),
    date: new Date(report.checkedAt).toLocaleString(lang),
  });
  $('score').textContent = report.score ?? '—';
  document.querySelector('.score-ring').style.setProperty('--score', report.score ?? 0);
  $('health').textContent = `${report.health === 'Healthy' ? '↗ ' : ''}${L.health}`;
  $('coverage').textContent = t(lang, 'coverage', { passed: report.checks.filter(c => c.status === 'pass').length, total: report.checks.length, coverage: report.coverage });
  $('category-scores').innerHTML = report.categories.map(c => `<div class="category-row"><span>${escape(L.category(c.name))}</span><span>${c.score ?? '—'}<span> / 100</span></span></div><div class="bar"><span data-score="${c.score ?? 0}"></span></div>`).join('');
  $('category-scores').querySelectorAll('[data-score]').forEach(bar => { bar.style.width = `${bar.dataset.score}%`; });
  $('suggestions').innerHTML = report.suggestions.map(c => {
    const text = L.check(c);
    return `<li><span>${escape(text.fix)}${c.action ? `<br>${githubLink(c.action.prefill || c.action.url, text.actionLabel)}` : ''}</span><small>${escape(t(lang, 'points', { n: c.weight }))}</small></li>`;
  }).join('') || `<li><span>${escape(t(lang, 'rx.none'))}</span></li>`;
  $('open-issue').hidden = !report.suggestions.length;
  $('notes').innerHTML = L.notes.map(n => `<p>ⓘ ${escape(n)}</p>`).join('');
  $('disclaimer').textContent = L.disclaimer;
  $('roast').textContent = roastText(lang, roastId(report), roast(report));
  $('roast').hidden = !roastMode;
  const badge = badgeMarkdown(report, reportLink());
  $('badge-code').textContent = badge;
  $('badge-preview').src = badge.match(/\((https:\/\/img\.shields\.io[^)]+)\)/)[1];
  $('badge-preview').alt = `Repo Doctor ${report.score ?? '?'}/100`;
  renderChecks(L);
}

function setBusy(value) {
  busy = value;
  $('scan-button').disabled = value;
  document.querySelectorAll('[data-repo]').forEach(b => { b.disabled = value; });
  if (value) $('scan-button').textContent = t(lang, 'scan.busy');
  else $('scan-button').innerHTML = t(lang, 'scan.button');
  if (value) $('scan-form').setAttribute('aria-busy', 'true'); else $('scan-form').removeAttribute('aria-busy');
}

const codedError = ({ error, code, resetAt }) => Object.assign(new Error(error || 'Request failed.'), { code, resetAt });

// Prefer this site's server (its own GitHub token, shared cache). Fall back to calling GitHub
// from the browser when the server is not configured, unreachable, or itself rate-limited.
async function check(repository) {
  if (serverAvailable) {
    setStatus('server');
    try {
      const response = await fetch(`/api/check${repoQuery(repository)}`, { signal: AbortSignal.timeout(30000) });
      const body = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
      if (response.ok && body?.checks) return body;
      if (body?.code === 'not_found' || body?.code === 'bad_input') throw codedError(body);
      if (!body || body.code === 'not_configured') serverAvailable = false;
    } catch (error) {
      if (error.code === 'not_found' || error.code === 'bad_input') throw error;
    }
  }
  setStatus('connecting');
  return analyzeRepository(repository, { onProgress: message => setStatus(message) });
}

async function scan(input, { scroll = true } = {}) {
  if (busy) throw Object.assign(new Error('A check is already running.'), { code: 'busy' });
  let repository;
  try { repository = parseRepo(input); }
  catch (error) { showError({ code: 'bad_input', message: error.message }); throw error; }
  setBusy(true);
  showError(null);
  try {
    report = await check(repository);
    $('repo-input').value = `https://github.com/${report.repository}`;
    history.replaceState(null, '', repoQuery(report.repository) + (new URLSearchParams(location.search).has('lang') ? `&lang=${lang}` : ''));
    render();
    remember({ repository: report.repository, score: report.score });
    setStatus('done', { n: report.checks.length, partial: report.coverage < 100, quota: report.rateLimit?.remaining });
    if (scroll) $('report').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    return { repository: report.repository, score: report.score, coverage: report.coverage, suggestions: report.suggestions.map(c => c.fix) };
  } catch (error) {
    showError(error);
    if (report) setStatus('keep', { repo: report.repository }); else setStatus(null);
    throw error;
  } finally {
    setBusy(false);
  }
}

$('language').innerHTML = Object.entries(LANGUAGES).map(([code, name]) => `<option value="${code}">${name}</option>`).join('');
$('language').addEventListener('change', e => {
  lang = e.target.value;
  storage.set('repo-doctor:lang', lang);
  const params = new URLSearchParams(location.search);
  if (params.has('lang')) { params.set('lang', lang); history.replaceState(null, '', `?${params}`.replace('%2F', '/')); }
  applyLanguage();
});
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
  renderChecks(localizeReport(lang, report));
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

applyLanguage();
const linked = new URLSearchParams(location.search).get('repo');
if (linked) {
  $('repo-input').value = linked;
  scan(linked, { scroll: false }).catch(() => {});
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
