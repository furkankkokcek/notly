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
      <h2>Ayarlar</h2>
      <button class="btn-close" onclick="closeSettings()">✕</button>
    </div>
    <div class="settings-body">
      <div class="setting-row">
        <span>Tema</span>
        <button class="btn-toggle" onclick="toggleTheme()">
          ${S.theme === 'dark' ? '☀️ Açık tema' : '🌙 Koyu tema'}
        </button>
      </div>
      <div class="setting-row">
        <span>Kayıtlı not</span>
        <span style="color:var(--accent);font-weight:600">${S.notes.length}</span>
      </div>
      <div class="setting-section-label">Veri</div>
      <div class="setting-row">
        <div class="setting-row-info">
          <span>Yedek al</span>
          <small>Tüm notları JSON olarak indir</small>
        </div>
        <button class="btn-toggle" onclick="exportNotes()">⬇ İndir</button>
      </div>
      <div class="setting-row">
        <div class="setting-row-info">
          <span>Yedek yükle</span>
          <small>JSON dosyasından notları birleştir</small>
        </div>
        <button class="btn-toggle" onclick="importNotes()">⬆ Yükle</button>
      </div>
      <div class="setting-row">
        <span>Tüm verileri temizle</span>
        <button class="btn-danger" onclick="clearAllData()">Temizle</button>
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

function exportNotes() {
  const data = JSON.stringify(S.notes, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `notly-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  resetChangeCounter();
  dismissExportBanner();
}

function importNotes() {
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error();
        const existingIds = new Set(S.notes.map(n => n.id));
        const fresh = imported.filter(n => n && n.id && !existingIds.has(n.id));
        const dupes = imported.length - fresh.length;
        if (!fresh.length) { alert('İçe aktarılacak yeni not yok.'); return; }
        const msg = dupes
          ? `${fresh.length} not içe aktarılsın mı? (${dupes} kopya atlandı)`
          : `${fresh.length} not içe aktarılsın mı?`;
        if (!confirm(msg)) return;
        S.notes = [...fresh, ...S.notes];
        saveS();
        closeSettings();
        renderHome();
        renderHeader();
      } catch {
        alert('Geçersiz yedek dosyası. Lütfen Notly dışa aktarma (.json) kullanın.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearAllData() {
  if (!confirm('TÜM notlar silinsin mi? Bu işlem geri alınamaz.')) return;
  S.notes = [];
  S.tagFilter = null;
  saveS();
  closeSettings();
  renderHeader();
  renderHome();
}

// ── Export reminder banner ────────────────────────────────────────────────────

document.addEventListener('notly:exportprompt', e => showExportBanner(e.detail.count));

function showExportBanner(count) {
  if (document.getElementById('export-banner')) return;
  const banner = document.createElement('div');
  banner.id        = 'export-banner';
  banner.className = 'export-banner';
  banner.innerHTML = `
    <button class="btn-dismiss" onclick="dismissExportBanner()">✕</button>
    <span class="export-banner-msg">💾 ${count} değişiklik yapıldı — verilerinizi yedekleyin!</span>
    <button class="btn-export-save" onclick="exportNotes()">💾 Yedekle</button>
  `;
  document.body.appendChild(banner);
}

function dismissExportBanner() {
  document.getElementById('export-banner')?.remove();
}
