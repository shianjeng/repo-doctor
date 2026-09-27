import { analyzeRepository, CATEGORIES, roast, toMarkdown } from './lib/doctor.js';

const $ = id => document.getElementById(id);
let report = null;
let filter = 'all';
let busy = false;
let roastMode = false;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function renderChecks() {
  const visible = report.checks.filter(c => filter === 'all' || c.status === filter);
  $('checks').innerHTML = CATEGORIES.map(category => {
    const items = visible.filter(c => c.category === category);
    if (!items.length) return '';
    return `<div class="check-group"><h4>${escape(category)}</h4>${items.map(c => `<details class="check ${c.status}"><summary><span class="check-icon">${c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '?'}</span><b>${escape(c.title)}</b><span class="check-status">${c.status === 'pass' ? 'LOOKING GOOD' : c.status === 'warn' ? 'NEEDS CARE' : 'UNKNOWN'}</span><span class="chevron">›</span></summary><p>${escape(c.evidence)}${c.status === 'warn' ? `<br><strong>Prescription:</strong> ${escape(c.fix)}` : ''}</p></details>`).join('')}</div>`;
  }).join('') || '<p class="empty-filter">No checks in this category.</p>';
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
  $('category-scores').innerHTML = report.categories.map(c => `<div class="category-row"><span>${escape(c.name)}</span><span>${c.score ?? '—'}<span> / 100</span></span></div><div class="bar"><span style="width:${c.score ?? 0}%"></span></div>`).join('');
  $('suggestions').innerHTML = report.suggestions.slice(0, 5).map(c => `<li><span>${escape(c.fix)}</span><small>${c.weight} POINTS</small></li>`).join('') || '<li><span>No missing signals detected. Keep your documentation and checks up to date.</span></li>';
  $('notes').innerHTML = report.notes.map(n => `<p>ⓘ ${escape(n)}</p>`).join('');
  $('disclaimer').textContent = report.disclaimer;
  $('roast').textContent = roast(report);
  $('roast').hidden = !roastMode;
  renderChecks();
}

async function scan(repository) {
  if (busy) throw new Error('A check is already running. Please wait.');
  busy = true;
  $('scan-button').disabled = true;
  document.querySelectorAll('[data-repo]').forEach(b => b.disabled = true);
  $('scan-button').textContent = 'Checking…';
  $('error').hidden = true;
  $('scan-status').textContent = 'Connecting to GitHub…';
  $('scan-form').setAttribute('aria-busy', 'true');
  try {
    const next = await analyzeRepository(repository, { onProgress: message => { $('scan-status').textContent = `${message}…`; } });
    report = next;
    $('repo-input').value = repository;
    render();
    $('scan-status').textContent = `Check complete · ${report.checks.length} signals reviewed${report.coverage < 100 ? ' · some data could not be verified' : ''}.`;
    $('report').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    return { repository: report.repository, score: report.score, coverage: report.coverage, suggestions: report.suggestions.map(c => c.fix) };
  } catch (error) {
    $('error').textContent = error.message;
    $('error').hidden = false;
    $('scan-status').textContent = report ? `The new check failed. The previous report for ${report.repository} remains below.` : '';
    throw error;
  } finally {
    busy = false;
    $('scan-button').disabled = false;
    document.querySelectorAll('[data-repo]').forEach(b => b.disabled = false);
    $('scan-button').innerHTML = 'Check my repo <span>↗</span>';
    $('scan-form').removeAttribute('aria-busy');
  }
}
$('scan-form').addEventListener('submit', e => { e.preventDefault(); scan($('repo-input').value).catch(() => {}); });
document.querySelectorAll('[data-repo]').forEach(b => b.addEventListener('click', () => { $('repo-input').value = b.dataset.repo; scan(b.dataset.repo).catch(() => {}); }));
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
$('export-report').addEventListener('click', () => {
  if (!report) return;
  const url = URL.createObjectURL(new Blob([toMarkdown(report)], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `${report.repository.replace('/', '-')}-health.md`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

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
