let editingNoteId  = null;
let _draftItems    = [];
let _draftColor    = null;
let _draftTags     = [];
let _currentType   = null;
let _autoSaveTimer = null;
let _detectTimer   = null;

const NOTE_COLORS = [
  { id: null,     hex: null,      label: 'Varsayılan' },
  { id: 'purple', hex: '#7c3aed', label: 'Mor'        },
  { id: 'blue',   hex: '#3b82f6', label: 'Mavi'       },
  { id: 'green',  hex: '#22c55e', label: 'Yeşil'      },
  { id: 'amber',  hex: '#f59e0b', label: 'Sarı'       },
  { id: 'red',    hex: '#ef4444', label: 'Kırmızı'    },
  { id: 'rose',   hex: '#ec4899', label: 'Pembe'      },
];

// ── Open / close ──────────────────────────────────────────────────────────────

function openNewNote() {
  editingNoteId = null;
  _draftItems   = [];
  _draftColor   = null;
  _draftTags    = [];
  showTypeSelector();
  document.getElementById('note-modal').classList.add('open');
}

function openNote(id) {
  editingNoteId = id;
  const note = S.notes.find(n => n.id === id);
  if (!note) return;
  _draftItems = JSON.parse(JSON.stringify(note.items || []));
  _draftColor = note.color || null;
  _draftTags  = [...(note.tags || [])];
  renderNoteEditor(note.type, note);
  document.getElementById('note-modal').classList.add('open');
}

function closeNoteModal() {
  clearTimeout(_autoSaveTimer);
  document.getElementById('note-modal').classList.remove('open');
  editingNoteId = null;
  _draftItems   = [];
  _draftColor   = null;
  _draftTags    = [];
  _currentType  = null;
}

// ── Type selector ─────────────────────────────────────────────────────────────

function showTypeSelector() {
  document.getElementById('note-modal-content').innerHTML = `
    <div class="modal-header">
      <div></div>
      <h2>Yeni Not</h2>
      <button class="btn-close" onclick="closeNoteModal()">✕</button>
    </div>
    <div class="type-selector">
      <button class="type-option" onclick="_draftItems=[];renderNoteEditor('text')">
        <span class="type-icon">📝</span><span>Metin Notu</span>
      </button>
      <button class="type-option" onclick="_draftItems=[];renderNoteEditor('checklist')">
        <span class="type-icon">✅</span><span>Alışveriş / Görev Listesi</span>
      </button>
      <button class="type-option" onclick="_draftItems=[];renderNoteEditor('dimension')">
        <span class="type-icon">📐</span><span>Ölçüler</span>
      </button>
      <button class="type-option type-option-paste" onclick="showPasteImporter()">
        <span class="type-icon">📋</span>
        <span>Yapıştır ve İçe Aktar</span>
        <span class="type-badge">Otomatik</span>
      </button>
    </div>
  `;
}

// ── Note editor ───────────────────────────────────────────────────────────────

function renderNoteEditor(type, note = null) {
  _currentType = type;
  const isEdit = !!note;
  const titleVal = note ? escHtml(note.title || '') : '';

  let body = '';
  if (type === 'text') {
    body = `<textarea id="note-content" placeholder="Bir şeyler yaz..." rows="8"
      ${isEdit ? 'oninput="_scheduleAutoSave()"' : ''}
    >${note ? escHtml(note.content || '') : ''}</textarea>`;
  } else if (type === 'checklist') {
    body = buildChecklistEditorHtml();
  } else if (type === 'dimension') {
    body = buildDimEditorHtml();
  }

  const actionArea = isEdit
    ? `<div class="save-indicator" id="save-indicator"></div>`
    : `<button class="btn-save" onclick="saveNote('${type}')">Kaydet</button>`;

  document.getElementById('note-modal-content').innerHTML = `
    <div class="modal-header">
      <button class="btn-back" onclick="${isEdit ? 'closeNoteModal()' : 'showTypeSelector()'}">
        ${isEdit ? '✕' : '←'}
      </button>
      <h2>${isEdit ? 'Notu Düzenle' : 'Yeni Not'}</h2>
      <button class="btn-close" onclick="closeNoteModal()">✕</button>
    </div>
    <div class="note-editor" onclick="if(!event.target.closest('.checklist-item-row,.section-header-row,.dim-item-row'))_deactivateAllRows()">
      <input type="text" id="note-title" class="note-title-input" placeholder="Başlık"
        value="${titleVal}" ${isEdit ? 'oninput="_scheduleAutoSave()"' : ''}>
      ${buildColorPickerHtml(_draftColor)}
      ${buildTagsEditorHtml(_draftTags)}
      ${body}
      ${actionArea}
    </div>
  `;

  document.getElementById('note-title').focus();
}

// ── Color picker ──────────────────────────────────────────────────────────────

function buildColorPickerHtml(currentColor) {
  return `
    <div class="color-picker-row">
      <span class="field-label">Renk</span>
      <div class="color-swatches">
        ${NOTE_COLORS.map(c => `
          <button class="color-swatch ${currentColor === c.id ? 'active' : ''}"
            title="${c.label}"
            onclick="setNoteColor(${c.id === null ? 'null' : `'${c.id}'`})"
            style="${c.hex ? `background:${c.hex}` : 'background:var(--surface2)'}">
            ${currentColor === c.id ? '✓' : ''}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function setNoteColor(colorId) {
  _draftColor = colorId;
  document.querySelectorAll('.color-swatch').forEach((s, i) => {
    const active = NOTE_COLORS[i]?.id === colorId;
    s.classList.toggle('active', active);
    s.textContent = active ? '✓' : '';
  });
  if (editingNoteId) saveNote(_currentType, false);
}

// ── Tags editor ───────────────────────────────────────────────────────────────

function buildTagsEditorHtml(tags) {
  const pills = tags.map(t => `
    <span class="tag-pill-edit">${escHtml(t)}
      <button onclick="removeTag('${escHtml(t)}')" tabindex="-1">×</button>
    </span>
  `).join('');
  return `
    <div class="tags-editor-row">
      <span class="field-label">Etiket</span>
      <div class="tags-input-wrap">
        <div class="tags-pills-edit" id="draft-tags-list">${pills}</div>
        <input type="text" id="tag-input" class="tag-input" placeholder="Etiket ekle…"
          onkeydown="if(event.key==='Enter'||event.key===','){event.preventDefault();addTag();}">
      </div>
    </div>
  `;
}

function _refreshTagPills() {
  const el = document.getElementById('draft-tags-list');
  if (!el) return;
  el.innerHTML = _draftTags.map(t => `
    <span class="tag-pill-edit">${escHtml(t)}
      <button onclick="removeTag('${escHtml(t)}')" tabindex="-1">×</button>
    </span>
  `).join('');
}

function addTag() {
  const input = document.getElementById('tag-input');
  const tag = input.value.trim().replace(/,/g, '');
  if (!tag || _draftTags.includes(tag)) { input.value = ''; return; }
  _draftTags.push(tag);
  input.value = '';
  _refreshTagPills();
  if (editingNoteId) saveNote(_currentType, false);
  input.focus();
}

function removeTag(tag) {
  _draftTags = _draftTags.filter(t => t !== tag);
  _refreshTagPills();
  if (editingNoteId) saveNote(_currentType, false);
}

// ── Checklist editor ──────────────────────────────────────────────────────────

function buildChecklistEditorHtml() {
  return `
    <div id="checklist-editor">
      <div id="checklist-items">${buildChecklistItemsHtml()}</div>
      <div class="add-item-area">
        <div class="add-item-input-wrap">
          <input type="text" id="new-item-input" placeholder="Öğe ekle veya ara…"
            oninput="onNewItemInput(this.value)"
            onkeydown="if(event.key==='Enter'){event.preventDefault();addCheckItem();}
                       if(event.key==='Escape')clearSuggestions();">
          <div id="item-suggestions" class="item-suggestions"></div>
        </div>
        <button class="btn-add-item" onclick="addCheckItem()">+ Ekle</button>
      </div>
      <button class="btn-add-section" onclick="addSectionHeader()">+ Bölüm Ekle</button>
    </div>
  `;
}

function buildChecklistItemsHtml() {
  return _draftItems.map((item, i) => {
    if (item.type === 'header') {
      return `
        <div class="section-header-row" onclick="activateItemRow(this)">
          <span class="section-icon">▶</span>
          <input type="text" class="section-header-input"
            value="${escHtml(item.text || '')}" placeholder="Bölüm adı…"
            onclick="event.stopPropagation()"
            oninput="_draftItems[${i}].text=this.value;_scheduleAutoSave()">
          <div class="item-controls">
            <button class="btn-move" onclick="event.stopPropagation();moveItem(${i},-1)">↑</button>
            <button class="btn-move" onclick="event.stopPropagation();moveItem(${i},1)">↓</button>
            <button class="btn-item-delete" onclick="event.stopPropagation();removeCheckItem(${i})">✕</button>
          </div>
        </div>
      `;
    }
    return `
      <div class="checklist-item-row ${item.checked ? 'done' : ''}" onclick="activateItemRow(this)">
        <input type="checkbox" ${item.checked ? 'checked' : ''}
          onclick="event.stopPropagation()"
          onchange="_draftItems[${i}].checked=this.checked;
                    this.closest('.checklist-item-row').classList.toggle('done',this.checked);
                    _scheduleAutoSave()">
        <input type="text" class="item-text-input"
          value="${escHtml(item.text || '')}" placeholder="Öğe…"
          onclick="event.stopPropagation()"
          oninput="_draftItems[${i}].text=this.value;_scheduleAutoSave()">
        <div class="item-controls">
          <button class="btn-move" onclick="event.stopPropagation();moveItem(${i},-1)">↑</button>
          <button class="btn-move" onclick="event.stopPropagation();moveItem(${i},1)">↓</button>
          <button class="btn-item-delete" onclick="event.stopPropagation();removeCheckItem(${i})">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function activateItemRow(el) {
  document.querySelectorAll('.checklist-item-row.active,.section-header-row.active,.dim-item-row.active')
    .forEach(r => { if (r !== el) r.classList.remove('active'); });
  el.classList.toggle('active');
}

function _deactivateAllRows() {
  document.querySelectorAll('.checklist-item-row.active,.section-header-row.active,.dim-item-row.active')
    .forEach(r => r.classList.remove('active'));
}

function syncChecklistFromDOM() {
  document.querySelectorAll('#checklist-items > div').forEach((row, i) => {
    if (!_draftItems[i]) return;
    if (_draftItems[i].type === 'header') {
      _draftItems[i].text = row.querySelector('.section-header-input')?.value || '';
    } else {
      _draftItems[i].text    = row.querySelector('.item-text-input')?.value || '';
      _draftItems[i].checked = row.querySelector('input[type="checkbox"]')?.checked || false;
    }
  });
}

function addCheckItem() {
  const input = document.getElementById('new-item-input');
  const text  = input.value.trim();
  if (!text) { input.focus(); return; }
  syncChecklistFromDOM();
  _draftItems.push({ text, checked: false });
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
  input.value = '';
  clearSuggestions();
  input.focus();
  if (editingNoteId) saveNote(_currentType, false);
}

function addSectionHeader() {
  syncChecklistFromDOM();
  _draftItems.push({ text: '', type: 'header' });
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
  const headers = document.querySelectorAll('.section-header-input');
  headers[headers.length - 1]?.focus();
  if (editingNoteId) saveNote(_currentType, false);
}

function removeCheckItem(idx) {
  syncChecklistFromDOM();
  _draftItems.splice(idx, 1);
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
  if (editingNoteId) saveNote(_currentType, false);
}

function moveItem(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= _draftItems.length) return;
  syncChecklistFromDOM();
  [_draftItems[idx], _draftItems[target]] = [_draftItems[target], _draftItems[idx]];
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
  if (editingNoteId) saveNote(_currentType, false);
}

// ── Autocomplete ──────────────────────────────────────────────────────────────

function onNewItemInput(val) {
  if (!val.trim()) { clearSuggestions(); return; }
  const q      = val.toLowerCase().trim();
  const inDraft = new Set(_draftItems.map(i => (i.text || '').toLowerCase()));
  const matches = [];
  for (const note of S.notes) {
    for (const item of note.items || []) {
      if (!item.text || item.type === 'header') continue;
      const t = item.text.toLowerCase();
      if (t.includes(q) && !inDraft.has(t) && !matches.includes(item.text)) {
        matches.push(item.text);
        if (matches.length >= 8) break;
      }
    }
    if (matches.length >= 8) break;
  }
  showSuggestions(matches);
}

function showSuggestions(matches) {
  const el = document.getElementById('item-suggestions');
  if (!el) return;
  el.innerHTML = matches.map(s =>
    `<button class="suggestion-item" onclick="selectSuggestion('${escHtml(s)}')">${escHtml(s)}</button>`
  ).join('');
}

function clearSuggestions() {
  const el = document.getElementById('item-suggestions');
  if (el) el.innerHTML = '';
}

function selectSuggestion(text) {
  syncChecklistFromDOM();
  _draftItems.push({ text, checked: false });
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
  const input = document.getElementById('new-item-input');
  if (input) { input.value = ''; input.focus(); }
  clearSuggestions();
  if (editingNoteId) saveNote(_currentType, false);
}

// ── Dimension editor ──────────────────────────────────────────────────────────

function buildDimEditorHtml() {
  return `
    <div id="dimension-editor">
      <div id="dim-items">${buildDimItemsHtml()}</div>
      <button class="btn-add-item" onclick="addDimItem()">+ Satır Ekle</button>
    </div>
  `;
}

function buildDimItemsHtml() {
  return _draftItems.map((item, i) => `
    <div class="dim-item-row" onclick="activateItemRow(this)">
      <input type="text" class="dim-label"
        value="${escHtml(item.label || '')}" placeholder="Etiket (örn. Koltuk eni)"
        onclick="event.stopPropagation()"
        oninput="_draftItems[${i}].label=this.value;_scheduleAutoSave()">
      <input type="text" class="dim-value"
        value="${escHtml(item.value || '')}" placeholder="180"
        onclick="event.stopPropagation()"
        oninput="_draftItems[${i}].value=this.value;_scheduleAutoSave()">
      <input type="text" class="dim-unit"
        value="${escHtml(item.unit || '')}" placeholder="cm"
        onclick="event.stopPropagation()"
        oninput="_draftItems[${i}].unit=this.value;_scheduleAutoSave()">
      <div class="item-controls">
        <button class="btn-move" onclick="event.stopPropagation();moveDimItem(${i},-1)">↑</button>
        <button class="btn-move" onclick="event.stopPropagation();moveDimItem(${i},1)">↓</button>
        <button class="btn-item-delete" onclick="event.stopPropagation();removeDimItem(${i})">✕</button>
      </div>
    </div>
  `).join('');
}

function syncDimFromDOM() {
  document.querySelectorAll('.dim-item-row').forEach((row, i) => {
    if (_draftItems[i]) {
      _draftItems[i].label = row.querySelector('.dim-label')?.value  || '';
      _draftItems[i].value = row.querySelector('.dim-value')?.value  || '';
      _draftItems[i].unit  = row.querySelector('.dim-unit')?.value   || '';
    }
  });
}

function addDimItem() {
  syncDimFromDOM();
  _draftItems.push({ label: '', value: '', unit: '' });
  document.getElementById('dim-items').innerHTML = buildDimItemsHtml();
  const labels = document.querySelectorAll('.dim-label');
  labels[labels.length - 1]?.focus();
  if (editingNoteId) saveNote(_currentType, false);
}

function removeDimItem(idx) {
  syncDimFromDOM();
  _draftItems.splice(idx, 1);
  document.getElementById('dim-items').innerHTML = buildDimItemsHtml();
  if (editingNoteId) saveNote(_currentType, false);
}

function moveDimItem(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= _draftItems.length) return;
  syncDimFromDOM();
  [_draftItems[idx], _draftItems[target]] = [_draftItems[target], _draftItems[idx]];
  document.getElementById('dim-items').innerHTML = buildDimItemsHtml();
  if (editingNoteId) saveNote(_currentType, false);
}

// ── Auto-save ─────────────────────────────────────────────────────────────────

function _scheduleAutoSave() {
  if (!editingNoteId) return;
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => saveNote(_currentType, false), 600);
}

function showSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.textContent = 'Kaydedildi ✓';
  el.classList.add('visible');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('visible'), 1500);
}

// ── Save ──────────────────────────────────────────────────────────────────────

function saveNote(type, closeAfter = true) {
  const titleEl = document.getElementById('note-title');
  if (!titleEl) return;
  const now      = Date.now();
  const noteData = {
    title:   titleEl.value.trim(),
    type,
    updated: now,
    color:   _draftColor,
    tags:    [..._draftTags],
  };

  if (type === 'text') {
    noteData.content = document.getElementById('note-content')?.value || '';
  } else if (type === 'checklist') {
    syncChecklistFromDOM();
    noteData.items = _draftItems.filter(i => (i.text || '').trim() || i.type === 'header');
  } else if (type === 'dimension') {
    syncDimFromDOM();
    noteData.items = _draftItems.filter(i => (i.label || '').trim() || (i.value || '').trim());
  }

  if (editingNoteId) {
    const idx = S.notes.findIndex(n => n.id === editingNoteId);
    if (idx !== -1) S.notes[idx] = { ...S.notes[idx], ...noteData };
  } else {
    S.notes.unshift({ id: genId(), pinned: false, hidden: false, created: now, ...noteData });
  }

  saveS();
  renderHome();
  renderHeader();

  if (closeAfter) {
    closeNoteModal();
  } else {
    showSaveIndicator();
  }
}

// ── Paste & Import ────────────────────────────────────────────────────────────

function showPasteImporter() {
  document.getElementById('note-modal-content').innerHTML = `
    <div class="modal-header">
      <button class="btn-back" onclick="showTypeSelector()">←</button>
      <h2>Yapıştır ve İçe Aktar</h2>
      <button class="btn-close" onclick="closeNoteModal()">✕</button>
    </div>
    <div class="note-editor">
      <p class="paste-hint">Aşağıya herhangi bir liste yapıştırın — alışveriş, ölçüler veya notlar. Her satır bir öğeye dönüşür.</p>
      <textarea id="paste-input" rows="13"
        placeholder="Alışveris Listesi&#10;Süt&#10;Ekmek&#10;&#10;veya&#10;&#10;Mutfak en 160 boy 170&#10;Yatak boy 256 en 293"></textarea>
      <div class="paste-detect-row" id="paste-detect-row"></div>
      <button class="btn-save" onclick="parsePasteAndImport()">İçe Aktar →</button>
    </div>
  `;
  const ta = document.getElementById('paste-input');
  ta.focus();
  ta.addEventListener('input', () => {
    clearTimeout(_detectTimer);
    _detectTimer = setTimeout(showPasteDetection, 300);
  });
}

function showPasteDetection() {
  const text = document.getElementById('paste-input')?.value.trim();
  const row  = document.getElementById('paste-detect-row');
  if (!row || !text) { if (row) row.innerHTML = ''; return; }
  const parsed = parsePasteContent(text);
  if (!parsed) { row.innerHTML = ''; return; }
  const icon  = parsed.type === 'dimension' ? '📐' : '✅';
  const label = parsed.type === 'dimension' ? 'Ölçüler' : 'Alışveriş / Görev Listesi';
  row.innerHTML = `
    <span class="paste-detected">
      ${icon} Algılandı: <strong>${label}</strong>
      — ${parsed.items.length} öğe
      ${parsed.title ? `· Başlık: <em>${escHtml(parsed.title)}</em>` : ''}
    </span>
  `;
}

function parsePasteContent(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (!lines.length) return null;

  const numCount  = l => (l.match(/\d+(?:\.\d+)?/g) || []).length;
  const isDimLine = l => numCount(l) >= 2;
  const isTitle   = l => /^\D+$/.test(l) && l.length <= 60;

  const body     = lines.slice(1);
  const dimScore = body.length ? body.filter(isDimLine).length / body.length : 0;
  const type     = dimScore > 0.5 ? 'dimension' : 'checklist';

  let title     = '';
  let itemLines = lines;
  if (lines.length > 1 && isTitle(lines[0]) && !isDimLine(lines[0])) {
    title     = lines[0];
    itemLines = lines.slice(1);
  }

  if (type === 'dimension') {
    return { type, title, items: itemLines.map(parseDimLine) };
  }
  return { type: 'checklist', title, items: itemLines.map(t => ({ text: t, checked: false })) };
}

function parseDimLine(line) {
  const nums     = (line.match(/\d+(?:\.\d+)?/g) || []);
  const rawLabel = (line.match(/^([^\d]+)/) || ['', ''])[1].trim();
  const label    = rawLabel
    .replace(/\s+(en|boy|yükseklik|derinlik|genişlik|uzunluk)\s*$/i, '')
    .trim() || line;
  return { label, value: nums[0] || '', unit: nums.slice(1).join(' × ') };
}

function parsePasteAndImport() {
  const text = document.getElementById('paste-input')?.value.trim();
  if (!text) { document.getElementById('paste-input')?.focus(); return; }
  const parsed = parsePasteContent(text);
  if (!parsed) return;
  _draftItems = parsed.items;
  renderNoteEditor(parsed.type, null);
  if (parsed.title) document.getElementById('note-title').value = parsed.title;
}
