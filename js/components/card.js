const TYPE_ICON = { text: '📝', checklist: '✅', dimension: '📐' };

function renderCard(note) {
  const icon       = TYPE_ICON[note.type] || '📝';
  const colorClass = note.color ? `card-color-${note.color}` : '';
  const preview    = note.hidden ? '<span class="hidden-text">🔒 Gizli içerik</span>' : buildPreview(note);
  return `
    <div class="card ${note.pinned ? 'pinned' : ''} ${colorClass}" onclick="openNote('${note.id}')">
      <div class="card-header">
        <span class="type-icon">${icon}</span>
        <span class="card-title">${escHtml(note.title || 'Başlıksız')}</span>
        <button class="btn-pin ${note.pinned ? 'active' : ''}"
          onclick="togglePin(event,'${note.id}')" title="Sabitle">📌</button>
      </div>
      <div class="card-preview">${preview}</div>
      <div class="card-footer">
        <span class="card-date">${formatDate(note.updated)}</span>
        <div class="card-actions">
          <button class="btn-card-action" title="${note.hidden ? 'Göster' : 'Gizle'}"
            onclick="toggleHidden(event,'${note.id}')">${note.hidden ? '👁' : '🙈'}</button>
          <button class="btn-card-action" title="WhatsApp'ta paylaş"
            onclick="shareToWhatsApp(event,'${note.id}')">📤</button>
          <button class="btn-card-action btn-delete" title="Sil"
            onclick="deleteNote(event,'${note.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `;
}

function buildPreview(note) {
  if (note.type === 'text') {
    return escHtml((note.content || '').slice(0, 120));
  }

  if (note.type === 'checklist') {
    const items = (note.items || []).filter(i => i.type !== 'header');
    if (!items.length) return '<span style="opacity:.4">Öğe yok</span>';
    const done = items.filter(i => i.checked).length;
    const rows = items.slice(0, 4).map(i =>
      `<span class="preview-item ${i.checked ? 'done' : ''}">${i.checked ? '☑' : '☐'} ${escHtml(i.text)}</span>`
    ).join('');
    const more = items.length > 4 ? `<span class="preview-more">+${items.length - 4} daha</span>` : '';
    return `<div class="preview-list">${rows}${more}</div>
            <div class="progress-text">${done} / ${items.length} tamamlandı</div>`;
  }

  if (note.type === 'dimension') {
    const items = note.items || [];
    if (!items.length) return '<span style="opacity:.4">Ölçü yok</span>';
    return items.slice(0, 4).map(i => {
      const dims = [i.en, i.boy, i.derinlik].filter(Boolean).join(' × ');
      return `<span class="dim-row">${escHtml(i.label || '')}${dims ? ': ' + escHtml(dims) : ''}</span>`;
    }).join('');
  }
  return '';
}

function shareToWhatsApp(e, id) {
  e.stopPropagation();
  const note = S.notes.find(n => n.id === id);
  if (!note) return;
  let text = note.title ? `*${note.title}*\n\n` : '';
  if (note.type === 'text') {
    text += note.content || '';
  } else if (note.type === 'checklist') {
    for (const item of note.items || []) {
      text += item.type === 'header'
        ? `\n*${item.text}*\n`
        : `${item.checked ? '✅' : '⬜'} ${item.text}\n`;
    }
  } else if (note.type === 'dimension') {
    for (const item of note.items || []) {
      const dims = [item.en, item.boy, item.derinlik].filter(Boolean).join(' × ');
      text += `${item.label || ''}${dims ? ': ' + dims : ''}\n`;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text.trim())}`, '_blank');
}
