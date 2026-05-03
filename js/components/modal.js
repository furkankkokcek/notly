let editingNoteId = null;
let _draftItems = [];

// ── Open / close ──────────────────────────────────────────────────────────────

function openNewNote() {
  editingNoteId = null;
  _draftItems = [];
  showTypeSelector();
  document.getElementById('note-modal').classList.add('open');
}

function openNote(id) {
  editingNoteId = id;
  const note = S.notes.find(n => n.id === id);
  if (!note) return;
  _draftItems = JSON.parse(JSON.stringify(note.items || []));
  renderNoteEditor(note.type, note);
  document.getElementById('note-modal').classList.add('open');
}

function closeNoteModal() {
  document.getElementById('note-modal').classList.remove('open');
  editingNoteId = null;
  _draftItems = [];
}

// ── Type selector ─────────────────────────────────────────────────────────────

function showTypeSelector() {
  document.getElementById('note-modal-content').innerHTML = `
    <div class="modal-header">
      <div></div>
      <h2>New Note</h2>
      <button class="btn-close" onclick="closeNoteModal()">✕</button>
    </div>
    <div class="type-selector">
      <button class="type-option" onclick="_draftItems=[];renderNoteEditor('text')">
        <span class="type-icon">📝</span><span>Text Note</span>
      </button>
      <button class="type-option" onclick="_draftItems=[];renderNoteEditor('checklist')">
        <span class="type-icon">✅</span><span>Shopping / Task List</span>
      </button>
      <button class="type-option" onclick="_draftItems=[];renderNoteEditor('dimension')">
        <span class="type-icon">📐</span><span>Dimensions</span>
      </button>
      <button class="type-option type-option-paste" onclick="showPasteImporter()">
        <span class="type-icon">📋</span>
        <span>Paste &amp; Import</span>
        <span class="type-badge">Auto-detect</span>
      </button>
    </div>
  `;
}

// ── Note editor ───────────────────────────────────────────────────────────────

function renderNoteEditor(type, note = null) {
  const isEdit = !!note;
  const titleVal = note ? escHtml(note.title || '') : '';
  let body = '';

  if (type === 'text') {
    body = `<textarea id="note-content" placeholder="Write something..." rows="9">${note ? escHtml(note.content || '') : ''}</textarea>`;
  } else if (type === 'checklist') {
    body = buildChecklistEditorHtml();
  } else if (type === 'dimension') {
    body = buildDimEditorHtml();
  }

  document.getElementById('note-modal-content').innerHTML = `
    <div class="modal-header">
      <button class="btn-back" onclick="${isEdit ? 'closeNoteModal()' : 'showTypeSelector()'}">
        ${isEdit ? '✕' : '←'}
      </button>
      <h2>${isEdit ? 'Edit' : 'New'} Note</h2>
      <button class="btn-close" onclick="closeNoteModal()">✕</button>
    </div>
    <div class="note-editor">
      <input type="text" id="note-title" placeholder="Title" value="${titleVal}">
      ${body}
      <button class="btn-save" onclick="saveNote('${type}')">
        ${isEdit ? 'Update' : 'Save'}
      </button>
    </div>
  `;

  document.getElementById('note-title').focus();
}

// ── Checklist editor ──────────────────────────────────────────────────────────

function buildChecklistEditorHtml() {
  return `
    <div id="checklist-editor">
      <div id="checklist-items">${buildChecklistItemsHtml()}</div>
      <div class="add-item-row">
        <input type="text" id="new-item-input" placeholder="Add item…"
          onkeydown="if(event.key==='Enter'){event.preventDefault();addCheckItem();}">
        <button class="btn-add-item" onclick="addCheckItem()">+ Add</button>
      </div>
    </div>
  `;
}

function buildChecklistItemsHtml() {
  return _draftItems.map((item, i) => `
    <div class="checklist-item-row ${item.checked ? 'done' : ''}">
      <input type="checkbox" ${item.checked ? 'checked' : ''}
        onchange="_draftItems[${i}].checked=this.checked;this.closest('.checklist-item-row').classList.toggle('done',this.checked)">
      <input type="text" class="item-text-input"
        value="${escHtml(item.text)}" placeholder="Item…">
      <button class="btn-item-delete" onclick="removeCheckItem(${i})">✕</button>
    </div>
  `).join('');
}

function syncChecklistFromDOM() {
  document.querySelectorAll('.checklist-item-row').forEach((row, i) => {
    if (_draftItems[i]) {
      _draftItems[i].text    = row.querySelector('.item-text-input').value;
      _draftItems[i].checked = row.querySelector('input[type="checkbox"]').checked;
    }
  });
}

function addCheckItem() {
  const input = document.getElementById('new-item-input');
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  syncChecklistFromDOM();
  _draftItems.push({ text, checked: false });
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
  input.value = '';
  input.focus();
}

function removeCheckItem(idx) {
  syncChecklistFromDOM();
  _draftItems.splice(idx, 1);
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
}

// ── Dimension editor ──────────────────────────────────────────────────────────

function buildDimEditorHtml() {
  return `
    <div id="dimension-editor">
      <div id="dim-items">${buildDimItemsHtml()}</div>
      <button class="btn-add-item" onclick="addDimItem()">+ Add Row</button>
    </div>
  `;
}

function buildDimItemsHtml() {
  return _draftItems.map((item, i) => `
    <div class="dim-item-row">
      <input type="text" class="dim-label"
        value="${escHtml(item.label)}" placeholder="Label (e.g. Sofa width)">
      <input type="text" class="dim-value"
        value="${escHtml(item.value)}" placeholder="180">
      <input type="text" class="dim-unit"
        value="${escHtml(item.unit || '')}" placeholder="cm">
      <button class="btn-item-delete" onclick="removeDimItem(${i})">✕</button>
    </div>
  `).join('');
}

function syncDimFromDOM() {
  document.querySelectorAll('.dim-item-row').forEach((row, i) => {
    if (_draftItems[i]) {
      _draftItems[i].label = row.querySelector('.dim-label').value;
      _draftItems[i].value = row.querySelector('.dim-value').value;
      _draftItems[i].unit  = row.querySelector('.dim-unit').value;
    }
  });
}

function addDimItem() {
  syncDimFromDOM();
  _draftItems.push({ label: '', value: '', unit: '' });
  document.getElementById('dim-items').innerHTML = buildDimItemsHtml();
  const labels = document.querySelectorAll('.dim-label');
  labels[labels.length - 1]?.focus();
}

function removeDimItem(idx) {
  syncDimFromDOM();
  _draftItems.splice(idx, 1);
  document.getElementById('dim-items').innerHTML = buildDimItemsHtml();
}

// ── Save ──────────────────────────────────────────────────────────────────────

function saveNote(type) {
  const title = document.getElementById('note-title').value.trim();
  const now = Date.now();
  const noteData = { title, type, updated: now };

  if (type === 'text') {
    noteData.content = document.getElementById('note-content').value;
  } else if (type === 'checklist') {
    syncChecklistFromDOM();
    noteData.items = _draftItems.filter(i => i.text.trim());
  } else if (type === 'dimension') {
    syncDimFromDOM();
    noteData.items = _draftItems.filter(i => i.label.trim() || i.value.trim());
  }

  if (editingNoteId) {
    const idx = S.notes.findIndex(n => n.id === editingNoteId);
    if (idx !== -1) S.notes[idx] = { ...S.notes[idx], ...noteData };
  } else {
    S.notes.unshift({ id: genId(), pinned: false, created: now, ...noteData });
  }

  saveS();
  closeNoteModal();
  renderHome();
}

// ── Paste & Import ────────────────────────────────────────────────────────────

function showPasteImporter() {
  document.getElementById('note-modal-content').innerHTML = `
    <div class="modal-header">
      <button class="btn-back" onclick="showTypeSelector()">←</button>
      <h2>Paste &amp; Import</h2>
      <button class="btn-close" onclick="closeNoteModal()">✕</button>
    </div>
    <div class="note-editor">
      <p class="paste-hint">Paste any list below — shopping items, dimensions, or notes. Each line becomes an item.</p>
      <textarea id="paste-input" rows="13"
        placeholder="Alışveris Listesi&#10;Süt&#10;Ekmek&#10;Yumurta&#10;&#10;or&#10;&#10;Koltuk  300 190 100&#10;Tv ünitesi 165 44&#10;Kitaplık 60 40 182"></textarea>
      <div class="paste-detect-row" id="paste-detect-row"></div>
      <button class="btn-save" onclick="parsePasteAndImport()">Import →</button>
    </div>
  `;
  const ta = document.getElementById('paste-input');
  ta.focus();
  ta.addEventListener('input', debounceDetect);
}

let _detectTimer = null;
function debounceDetect() {
  clearTimeout(_detectTimer);
  _detectTimer = setTimeout(showPasteDetection, 300);
}

function showPasteDetection() {
  const text = document.getElementById('paste-input').value.trim();
  const row = document.getElementById('paste-detect-row');
  if (!row) return;
  if (!text) { row.innerHTML = ''; return; }
  const parsed = parsePasteContent(text);
  if (!parsed) { row.innerHTML = ''; return; }
  const icon  = parsed.type === 'dimension' ? '📐' : '✅';
  const label = parsed.type === 'dimension' ? 'Dimensions' : 'Shopping / Task List';
  row.innerHTML = `
    <span class="paste-detected">
      ${icon} Detected: <strong>${label}</strong>
      — ${parsed.items.length} item${parsed.items.length !== 1 ? 's' : ''}
      ${parsed.title ? `· Title: <em>${escHtml(parsed.title)}</em>` : ''}
    </span>
  `;
}

function parsePasteContent(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (!lines.length) return null;

  // Dimension line: text ending in a letter/char, then 1+ space, then 2+ space-separated integers
  const isDimLine = l => /^(.*?[^\d\s])\s+(\d+(?:\s+\d+)+)$/.test(l);
  // Title: first line has no digits at all and is reasonably short
  const isTitle = l => /^\D+$/.test(l) && l.length <= 60;

  const body = lines.slice(1);
  const dimScore = body.length ? body.filter(isDimLine).length / body.length : 0;
  const type = dimScore > 0.5 ? 'dimension' : 'checklist';

  let title = '';
  let itemLines = lines;
  if (lines.length > 1 && isTitle(lines[0]) && !isDimLine(lines[0])) {
    title = lines[0];
    itemLines = lines.slice(1);
  }

  if (type === 'dimension') {
    const items = itemLines.map(line => {
      const m = line.match(/^(.*?[^\d\s])\s+(\d+(?:\s+\d+)*)$/);
      if (m) {
        const nums = m[2].split(/\s+/);
        return {
          label: m[1].trim(),
          value: nums[0],
          unit: nums.length > 1 ? nums.slice(1).join(' × ') : '',
        };
      }
      return { label: line, value: '', unit: '' };
    });
    return { type, title, items };
  }

  return {
    type: 'checklist',
    title,
    items: itemLines.map(t => ({ text: t, checked: false })),
  };
}

function parsePasteAndImport() {
  const text = document.getElementById('paste-input').value.trim();
  if (!text) { document.getElementById('paste-input').focus(); return; }
  const parsed = parsePasteContent(text);
  if (!parsed) return;
  _draftItems = parsed.items;
  renderNoteEditor(parsed.type, null);
  if (parsed.title) document.getElementById('note-title').value = parsed.title;
}
