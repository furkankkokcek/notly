function renderHeader() {
  const el = document.getElementById('app-header');
  const filters = [
    { key: 'all',       label: 'Tümü' },
    { key: 'text',      label: '📝 Notlar' },
    { key: 'checklist', label: '✅ Listeler' },
    { key: 'dimension', label: '📐 Ölçüler' },
  ];

  const allTags = [...new Set(S.notes.flatMap(n => n.tags || []))];
  const tagChips = allTags.map(t => `
    <button class="filter-btn tag-filter-btn ${S.tagFilter === t ? 'active' : ''}"
      onclick="setTagFilter(event,'${escHtml(t)}')">🏷 ${escHtml(t)}</button>
  `).join('');

  el.innerHTML = `
    <div class="header-inner">
      <h1 class="app-title">Notly</h1>
      <div class="header-actions">
        <button class="btn-icon" onclick="openSettings()" title="Ayarlar">⚙️</button>
      </div>
    </div>
    <div class="filter-bar">
      ${filters.map(f => `
        <button class="filter-btn ${S.filter === f.key ? 'active' : ''}"
          onclick="setFilter('${f.key}')">${f.label}</button>
      `).join('')}
      ${allTags.length ? '<span class="filter-divider">|</span>' + tagChips : ''}
      ${S.tagFilter ? `<button class="filter-btn clear-tag" onclick="clearTagFilter()">✕ Etiketi temizle</button>` : ''}
    </div>
  `;
}

function setFilter(f) {
  S.filter = f;
  saveS();
  renderHeader();
  renderHome();
}

function setTagFilter(e, tag) {
  if (e) e.stopPropagation();
  S.tagFilter = S.tagFilter === tag ? null : tag;
  saveS();
  renderHeader();
  renderHome();
}

function clearTagFilter() {
  S.tagFilter = null;
  saveS();
  renderHeader();
  renderHome();
}
