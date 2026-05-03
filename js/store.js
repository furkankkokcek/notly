const DEFAULT_STATE = {
  notes: [],
  theme: 'dark',
  filter: 'all',
};

let S = {};

function loadS() {
  try {
    const raw = localStorage.getItem('notly_v1');
    S = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
  } catch {
    S = { ...DEFAULT_STATE };
  }
  applyTheme();
}

function saveS() {
  localStorage.setItem('notly_v1', JSON.stringify(S));
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
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
