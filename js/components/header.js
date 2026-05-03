function renderHeader() {
  const el = document.getElementById('app-header');
  const filters = [
    { key: 'all',       label: 'Tümü' },
    { key: 'text',      label: '📝 Notlar' },
    { key: 'checklist', label: '✅ Listeler' },
    { key: 'dimension', label: '📐 Ölçüler' },
  ];

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
    </div>
  `;
}

function setFilter(f) {
  S.filter = f;
  saveS();
  renderHeader();
  renderHome();
}
