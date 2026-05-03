function openSettings() {
  renderSettingsContent();
  document.getElementById('settings-modal').classList.add('open');
}

function closeSettings() {
  document.getElementById('settings-modal').classList.remove('open');
}

function renderSettingsContent() {
  document.getElementById('settings-content').innerHTML = `
    <div class="modal-header">
      <div></div>
      <h2>Settings</h2>
      <button class="btn-close" onclick="closeSettings()">✕</button>
    </div>
    <div class="settings-body">
      <div class="setting-row">
        <span>Theme</span>
        <button class="btn-toggle" onclick="toggleTheme()">
          ${S.theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
        </button>
      </div>
      <div class="setting-row">
        <span>Notes saved</span>
        <span style="color:var(--accent);font-weight:600">${S.notes.length}</span>
      </div>
      <div class="setting-row">
        <span>Clear all data</span>
        <button class="btn-danger" onclick="clearAllData()">Clear</button>
      </div>
      <div class="setting-footer">Notly v1.0.0</div>
    </div>
  `;
}

function toggleTheme() {
  S.theme = S.theme === 'dark' ? 'light' : 'dark';
  saveS();
  applyTheme();
  renderSettingsContent();
}

function clearAllData() {
  if (!confirm('Delete ALL notes? This cannot be undone.')) return;
  S.notes = [];
  saveS();
  closeSettings();
  renderHome();
}
