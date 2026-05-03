function renderHome() {
  const main = document.getElementById('main-content');
  const filtered = S.notes.filter(n => {
    if (S.filter !== 'all' && n.type !== S.filter) return false;
    if (S.tagFilter && !(n.tags || []).includes(S.tagFilter)) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updated - a.updated;
  });

  if (!sorted.length) {
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>Henüz not yok.</p>
        <p>Oluşturmak için <strong>+</strong> simgesine dokun.</p>
      </div>
    `;
    return;
  }
  main.innerHTML = `<div class="notes-grid">${sorted.map(renderCard).join('')}</div>`;
}

function togglePin(e, id) {
  e.stopPropagation();
  const note = S.notes.find(n => n.id === id);
  if (!note) return;
  note.pinned = !note.pinned;
  saveS();
  renderHome();
}

function toggleHidden(e, id) {
  e.stopPropagation();
  const note = S.notes.find(n => n.id === id);
  if (!note) return;
  note.hidden = !note.hidden;
  saveS();
  renderHome();
}

function deleteNote(e, id) {
  e.stopPropagation();
  if (!confirm('Bu not silinsin mi?')) return;
  S.notes = S.notes.filter(n => n.id !== id);
  saveS();
  renderHome();
  renderHeader();
}
