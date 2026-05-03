function toggleListItem(noteId, itemIdx) {
  const note = S.notes.find(n => n.id === noteId);
  if (!note || !note.items || !note.items[itemIdx]) return;
  note.items[itemIdx].checked = !note.items[itemIdx].checked;
  note.updated = Date.now();
  saveS();
  renderHome();
}

function renderListView(note) {
  const items = note.items || [];
  if (!items.length) return '<p style="opacity:.4;text-align:center;padding:20px">No items</p>';
  return `
    <div class="list-view">
      ${items.map((item, i) => `
        <div class="list-item ${item.checked ? 'checked' : ''}"
          onclick="toggleListItem('${note.id}', ${i})">
          <input type="checkbox" ${item.checked ? 'checked' : ''}
            onclick="event.stopPropagation();toggleListItem('${note.id}',${i})">
          <span class="list-item-text">${escHtml(item.text)}</span>
        </div>
      `).join('')}
    </div>
  `;
}
