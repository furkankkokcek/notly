const TYPE_ICON = { text: '📝', checklist: '✅', dimension: '📐' };

function renderCard(note) {
  const icon = TYPE_ICON[note.type] || '📝';
  const preview = buildPreview(note);
  return `
    <div class="card ${note.pinned ? 'pinned' : ''}" onclick="openNote('${note.id}')">
      <div class="card-header">
        <span class="type-icon">${icon}</span>
        <span class="card-title">${escHtml(note.title || 'Untitled')}</span>
        <button class="btn-pin ${note.pinned ? 'active' : ''}"
          onclick="togglePin(event,'${note.id}')" title="Pin">📌</button>
      </div>
      <div class="card-preview">${preview}</div>
      <div class="card-footer">
        <span class="card-date">${formatDate(note.updated)}</span>
        <button class="btn-delete"
          onclick="deleteNote(event,'${note.id}')" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}

function buildPreview(note) {
  if (note.type === 'text') {
    return escHtml((note.content || '').slice(0, 120));
  }

  if (note.type === 'checklist') {
    const items = note.items || [];
    if (!items.length) return '<span style="opacity:.4">No items yet</span>';
    const done = items.filter(i => i.checked).length;
    const rows = items.slice(0, 4).map(i =>
      `<span class="preview-item ${i.checked ? 'done' : ''}">${i.checked ? '☑' : '☐'} ${escHtml(i.text)}</span>`
    ).join('');
    const more = items.length > 4
      ? `<span class="preview-more">+${items.length - 4} more</span>`
      : '';
    return `<div class="preview-list">${rows}${more}</div>
            <div class="progress-text">${done} / ${items.length} done</div>`;
  }

  if (note.type === 'dimension') {
    const items = note.items || [];
    if (!items.length) return '<span style="opacity:.4">No dimensions yet</span>';
    return items.slice(0, 4).map(i =>
      `<span class="dim-row">${escHtml(i.label)}: ${escHtml(i.value)} ${escHtml(i.unit || '')}</span>`
    ).join('');
  }

  return '';
}
