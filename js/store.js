const DEFAULT_STATE = {
  notes: [],
  theme: 'dark',
  filter: 'all',
};

let S = {};
let _changesSinceExport = 0;

function loadS() {
  try {
    const raw = localStorage.getItem('notly_v1');
    S = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
  } catch {
    S = { ...DEFAULT_STATE };
  }
  _changesSinceExport = parseInt(localStorage.getItem('notly_chg') || '0');
  applyTheme();
}

function saveS() {
  localStorage.setItem('notly_v1', JSON.stringify(S));
  _changesSinceExport++;
  localStorage.setItem('notly_chg', String(_changesSinceExport));
  if (_changesSinceExport >= 20 && _changesSinceExport % 20 === 0) {
    document.dispatchEvent(new CustomEvent('notly:exportprompt', { detail: { count: _changesSinceExport } }));
  }
}

function resetChangeCounter() {
  _changesSinceExport = 0;
  localStorage.setItem('notly_chg', '0');
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', S.theme);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}
