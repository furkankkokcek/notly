let editingNoteId       = null;
let _draftItems         = [];
let _draftColor         = null;
let _currentType        = null;
let _dragIdx            = null;
let _dragSectionEnd     = null;
let _visibleItemIndices = [];
let _checklistMode      = 'task'; // 'task' | 'shopping'

const DEFAULT_SHOPPING_CATEGORIES = [
  'Meyve ve Sebzeler',
  'Süt ve Süt Ürünleri (Kahvaltılık)',
  'Et, Tavuk ve Balık Ürünleri',
  'Kuru Gıda ve Bakliyat',
  'Kahvaltılık ve Atıştırmalık',
  'İçecekler',
  'Temizlik ve Kişisel Bakım',
  'Ekmek ve Unlu Mamuller',
  'Dondurulmuş Gıdalar',
];
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

function buildListSubtypeHtml() {
  return `
    <div class="list-subtype-row">
      <button class="list-subtype-btn ${_checklistMode === 'task' ? 'active' : ''}"
        onclick="setChecklistMode('task')">✅ Görev Listesi</button>
      <button class="list-subtype-btn ${_checklistMode === 'shopping' ? 'active' : ''}"
        onclick="setChecklistMode('shopping')">🛒 Alışveriş Listesi</button>
    </div>
  `;
}

function setChecklistMode(mode) {
  _checklistMode = mode;
  document.querySelectorAll('.list-subtype-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(mode === 'shopping' ? 'Alışveriş' : 'Görev'));
  });
  _draftItems = mode === 'shopping'
    ? DEFAULT_SHOPPING_CATEGORIES.map(text => ({ type: 'header', text }))
    : [];
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
}

// ── Open / close ──────────────────────────────────────────────────────────────

function openNewNote() {
  editingNoteId  = null;
  _draftItems    = [];
  _draftColor    = null;
  _checklistMode = 'task';
  showTypeSelector();
  document.getElementById('note-modal').classList.add('open');
}

function openNote(id) {
  editingNoteId = id;
  const note = S.notes.find(n => n.id === id);
  if (!note) return;
  _draftItems = JSON.parse(JSON.stringify(note.items || []));
  _draftColor = note.color || null;
  renderNoteEditor(note.type, note);
  document.getElementById('note-modal').classList.add('open');
}

function closeNoteModal() {
  clearTimeout(_autoSaveTimer);
  _clearModalColor();
  document.getElementById('note-modal').classList.remove('open');
  editingNoteId = null;
  _draftItems   = [];
  _draftColor   = null;
  _currentType  = null;
}

function _applyModalColor(colorId) {
  const ms = document.querySelector('#note-modal .ms');
  if (!ms) return;
  NOTE_COLORS.forEach(c => { if (c.id) ms.classList.remove('modal-color-' + c.id); });
  if (colorId) ms.classList.add('modal-color-' + colorId);
}

function _clearModalColor() {
  const ms = document.querySelector('#note-modal .ms');
  if (!ms) return;
  NOTE_COLORS.forEach(c => { if (c.id) ms.classList.remove('modal-color-' + c.id); });
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
      <button class="type-option" onclick="_draftItems=[];_checklistMode='task';renderNoteEditor('checklist')">
        <span class="type-icon">✅</span><span>Liste</span>
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
    const subtypeBar = !note ? buildListSubtypeHtml() : '';
    body = subtypeBar + buildChecklistEditorHtml();
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
      ${body}
      ${actionArea}
    </div>
    <div class="note-toolbar">
      <div class="color-picker-popup" id="color-picker-popup">
        ${buildColorSwatchesHtml(_draftColor)}
      </div>
      <div class="toolbar-actions">
        <button class="toolbar-btn ${_draftColor ? 'active' : ''}" onclick="toggleColorPicker()" title="Renk seç">🎨</button>
        <button class="toolbar-btn" onclick="shareCurrentNote()" title="WhatsApp'ta paylaş">📤</button>
      </div>
    </div>
  `;

  _applyModalColor(_draftColor);
  document.getElementById('note-title').focus();
}

// ── Color picker ──────────────────────────────────────────────────────────────

function buildColorSwatchesHtml(currentColor) {
  return NOTE_COLORS.map(c => `
    <button class="color-swatch ${currentColor === c.id ? 'active' : ''}"
      title="${c.label}"
      onclick="setNoteColor(${c.id === null ? 'null' : `'${c.id}'`})"
      style="${c.hex ? `background:${c.hex}` : 'background:var(--surface2);border:2px dashed var(--border)'}">
    </button>
  `).join('');
}

function toggleColorPicker() {
  document.getElementById('color-picker-popup')?.classList.toggle('open');
}

function setNoteColor(colorId) {
  _draftColor = colorId;
  document.querySelectorAll('#color-picker-popup .color-swatch').forEach((s, i) => {
    s.classList.toggle('active', NOTE_COLORS[i]?.id === colorId);
  });
  const tb = document.querySelector('.toolbar-btn[title="Renk seç"]');
  if (tb) tb.classList.toggle('active', !!colorId);
  _applyModalColor(colorId);
  if (editingNoteId) saveNote(_currentType, false);
}

function shareCurrentNote() {
  const title = document.getElementById('note-title')?.value.trim() || '';
  let text = title ? `*${title}*\n\n` : '';
  if (_currentType === 'text') {
    text += document.getElementById('note-content')?.value || '';
  } else if (_currentType === 'checklist') {
    syncChecklistFromDOM();
    for (const item of _draftItems) {
      text += item.type === 'header'
        ? `\n*${item.text}*\n`
        : `${item.checked ? '✅' : '⬜'} ${item.text}\n`;
    }
  } else if (_currentType === 'dimension') {
    syncDimFromDOM();
    for (const item of _draftItems) {
      const dims = [item.en, item.boy, item.derinlik].filter(Boolean).join(' × ');
      text += `${item.label || ''}${dims ? ': ' + dims : ''}\n`;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text.trim())}`, '_blank');
}

// ── Checklist editor ──────────────────────────────────────────────────────────

function buildChecklistEditorHtml() {
  return `
    <div id="checklist-editor">
      <div id="checklist-items">${buildChecklistItemsHtml()}</div>
      <div id="inline-suggestions" class="item-suggestions" style="display:none;position:fixed;z-index:400"></div>
      <div class="add-item-area">
        <div class="add-item-input-wrap">
          <span class="add-item-plus">+</span>
          <input type="text" id="new-item-input" placeholder="Liste öğesi"
            oninput="onNewItemInput(this.value)"
            onkeydown="if(event.key==='Enter'){event.preventDefault();addCheckItem();}
                       if(event.key==='Escape')clearSuggestions();">
          <div id="item-suggestions" class="item-suggestions"></div>
        </div>
      </div>
      <button class="btn-add-section" onclick="addSectionHeader()">+ Bölüm Ekle</button>
    </div>
  `;
}

function buildChecklistItemsHtml() {
  _visibleItemIndices = [];
  let skipSection = false;
  const parts = [];

  _draftItems.forEach((item, i) => {
    const dragAttrs = `draggable="true"
      ondragstart="_onDragStart(event,${i})"
      ondragover="_onDragOver(event,${i})"
      ondragleave="_onDragLeave(event)"
      ondrop="_onDrop(event,${i})"
      ondragend="_onDragEnd(event)"`;

    if (item.type === 'header') {
      skipSection = item.collapsed || false;
      _visibleItemIndices.push(i);
      parts.push(`
        <div class="section-header-row ${item.collapsed ? 'collapsed' : ''}" ${dragAttrs} onclick="activateItemRow(this)">
          <span class="drag-handle">⠿</span>
          <span class="section-icon" onclick="event.stopPropagation();toggleSectionCollapse(${i})">${item.collapsed ? '▶' : '▼'}</span>
          <input type="text" class="section-header-input"
            value="${escHtml(item.text || '')}" placeholder="Bölüm adı…"
            onclick="event.stopPropagation()"
            oninput="_draftItems[${i}].text=this.value;_scheduleAutoSave()">
          <button class="btn-add-to-section" title="Bu bölüme öğe ekle"
            onclick="event.stopPropagation();addItemToSection(${i})">+ Öğe</button>
          <div class="item-controls">
            <button class="btn-item-delete" onclick="event.stopPropagation();removeCheckItem(${i})">✕</button>
          </div>
        </div>
      `);
    } else if (!skipSection) {
      _visibleItemIndices.push(i);
      parts.push(`
        <div class="checklist-item-row ${item.checked ? 'done' : ''}" ${dragAttrs} onclick="activateItemRow(this)">
          <span class="drag-handle">⠿</span>
          <input type="checkbox" ${item.checked ? 'checked' : ''}
            onclick="event.stopPropagation()"
            onchange="_draftItems[${i}].checked=this.checked;
                      if(this.checked){_draftItems[${i}].checkedAt=Date.now();}else{delete _draftItems[${i}].checkedAt;}
                      _sortAndRenderChecklist();
                      _scheduleAutoSave();">
          <input type="text" class="item-text-input"
            value="${escHtml(item.text || '')}" placeholder="Öğe…"
            onclick="event.stopPropagation()"
            oninput="_draftItems[${i}].text=this.value;_scheduleAutoSave();onInlineItemInput(event,${i})"
            onblur="setTimeout(clearInlineSuggestions,150)"
            onkeydown="onItemKeydown(event,${i})">
          <div class="item-controls">
            <button class="btn-item-delete" onclick="event.stopPropagation();removeCheckItem(${i})">✕</button>
          </div>
        </div>
      `);
    }
  });

  return parts.join('');
}

function _sortAndRenderChecklist() {
  // Group items into sections, sort each section independently
  const sections = [];
  let cur = { header: null, items: [] };
  for (const item of _draftItems) {
    if (item.type === 'header') { sections.push(cur); cur = { header: item, items: [] }; }
    else cur.items.push(item);
  }
  sections.push(cur);

  const sorted = [];
  for (const sec of sections) {
    if (sec.header) sorted.push(sec.header);
    const unchecked = sec.items.filter(i => !i.checked);
    const checked   = sec.items.filter(i => i.checked).sort((a, b) => (a.checkedAt || 0) - (b.checkedAt || 0));
    sorted.push(...unchecked, ...checked);
  }
  _draftItems = sorted;
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
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
  document.querySelectorAll('#checklist-items > div').forEach((row, domIdx) => {
    const i = _visibleItemIndices[domIdx];
    if (i === undefined || !_draftItems[i]) return;
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

function addItemToSection(headerIdx) {
  syncChecklistFromDOM();
  // Find end of this section (next header or end of array)
  let insertIdx = headerIdx + 1;
  while (insertIdx < _draftItems.length && _draftItems[insertIdx].type !== 'header') insertIdx++;
  // Insert before next header (or at end) but before any checked items in this section
  let insertBefore = insertIdx;
  for (let j = headerIdx + 1; j < insertIdx; j++) {
    if (_draftItems[j].checked) { insertBefore = j; break; }
  }
  _draftItems.splice(insertBefore, 0, { text: '', checked: false });
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
  const domIdx = _visibleItemIndices.indexOf(insertBefore);
  if (domIdx !== -1) {
    const rows = document.querySelectorAll('#checklist-items > div');
    rows[domIdx]?.querySelector('.item-text-input')?.focus();
  }
  if (editingNoteId) saveNote(_currentType, false);
}

function removeCheckItem(idx) {
  syncChecklistFromDOM();
  _draftItems.splice(idx, 1);
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
  if (editingNoteId) saveNote(_currentType, false);
}

function _onDragStart(e, idx) {
  _dragIdx = idx;
  if (_draftItems[idx]?.type === 'header') {
    _dragSectionEnd = idx + 1;
    while (_dragSectionEnd < _draftItems.length && _draftItems[_dragSectionEnd].type !== 'header') {
      _dragSectionEnd++;
    }
  } else {
    _dragSectionEnd = null;
  }
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => e.currentTarget.classList.add('dragging'), 0);
}

function _onDragOver(e, idx) {
  e.preventDefault();
  if (_dragIdx === null || _dragIdx === idx) return;
  e.dataTransfer.dropEffect = 'move';
  const row = e.currentTarget;
  document.querySelectorAll('.drag-over,.drag-over-section').forEach(r => r.classList.remove('drag-over','drag-over-section'));
  row.classList.add(row.classList.contains('section-header-row') ? 'drag-over-section' : 'drag-over');
}

function _onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over', 'drag-over-section');
}

function _onDrop(e, targetIdx) {
  e.preventDefault();
  if (_dragIdx === null || _dragIdx === targetIdx) { _onDragEnd(e); return; }
  syncChecklistFromDOM();

  if (_dragSectionEnd !== null) {
    const sectionLen = _dragSectionEnd - _dragIdx;
    const section = _draftItems.splice(_dragIdx, sectionLen);
    let insertAt = targetIdx > _dragIdx ? targetIdx - sectionLen : targetIdx;
    insertAt = Math.max(0, Math.min(insertAt, _draftItems.length));
    if (e.currentTarget.classList.contains('section-header-row')) {
      let afterSection = insertAt + 1;
      while (afterSection < _draftItems.length && _draftItems[afterSection].type !== 'header') afterSection++;
      insertAt = afterSection;
    }
    _draftItems.splice(insertAt, 0, ...section);
  } else {
    const dragged = _draftItems.splice(_dragIdx, 1)[0];
    const adjusted = targetIdx > _dragIdx ? targetIdx - 1 : targetIdx;
    const isHeader = e.currentTarget.classList.contains('section-header-row');
    _draftItems.splice(isHeader ? adjusted + 1 : adjusted, 0, dragged);
  }

  _dragIdx = null;
  _dragSectionEnd = null;
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
  if (editingNoteId) saveNote(_currentType, false);
}

function _onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.drag-over,.drag-over-section').forEach(r => r.classList.remove('drag-over','drag-over-section'));
  _dragIdx = null;
  _dragSectionEnd = null;
}

// ── Collapse / expand sections ────────────────────────────────────────────────

function toggleSectionCollapse(idx) {
  syncChecklistFromDOM();
  _draftItems[idx].collapsed = !_draftItems[idx].collapsed;
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
  if (editingNoteId) saveNote(_currentType, false);
}

// ── Inline item keydown (Enter = new item in same section) ────────────────────

function onItemKeydown(e, idx) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  syncChecklistFromDOM();
  _draftItems.splice(idx + 1, 0, { text: '', checked: false });
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
  const domIdx = _visibleItemIndices.indexOf(idx + 1);
  if (domIdx !== -1) {
    const rows = document.querySelectorAll('#checklist-items > div');
    rows[domIdx]?.querySelector('.item-text-input')?.focus();
  }
  if (editingNoteId) saveNote(_currentType, false);
}

// ── Inline item search ────────────────────────────────────────────────────────

function onInlineItemInput(e, idx) {
  const val = (e.target?.value || '').trim();
  const popup = document.getElementById('inline-suggestions');
  if (!popup) return;
  if (!val) { popup.style.display = 'none'; return; }
  const q = val.toLowerCase();
  const seen = new Set();
  const matches = [];
  const push = text => {
    if (!text) return;
    const lo = text.toLowerCase();
    if (lo.includes(q) && !seen.has(lo)) { seen.add(lo); matches.push(text); }
  };
  for (const item of _draftItems) { if (item.type !== 'header') push(item.text); }
  for (const note of S.notes) {
    for (const item of note.items || []) { if (item.type !== 'header') push(item.text); if (matches.length >= 8) break; }
    if (matches.length >= 8) break;
  }
  if (!matches.length) { popup.style.display = 'none'; return; }
  const rect = e.target.getBoundingClientRect();
  popup.style.left    = Math.round(rect.left) + 'px';
  popup.style.top     = Math.round(rect.bottom + 2) + 'px';
  popup.style.minWidth = Math.round(rect.width) + 'px';
  popup.style.display = 'block';
  popup.innerHTML = matches.map(s =>
    `<button class="suggestion-item" onmousedown="event.preventDefault();selectInlineSuggestion(${JSON.stringify(s)},${idx})">${escHtml(s)}</button>`
  ).join('');
}

function selectInlineSuggestion(text, idx) {
  syncChecklistFromDOM();
  if (_draftItems[idx]) _draftItems[idx].text = text;
  clearInlineSuggestions();
  document.getElementById('checklist-items').innerHTML = buildChecklistItemsHtml();
  if (editingNoteId) saveNote(_currentType, false);
}

function clearInlineSuggestions() {
  const el = document.getElementById('inline-suggestions');
  if (el) el.style.display = 'none';
}

// ── Autocomplete ──────────────────────────────────────────────────────────────

function onNewItemInput(val) {
  if (!val.trim()) { clearSuggestions(); return; }
  const q       = val.toLowerCase().trim();
  const seen    = new Set();
  const matches = [];

  const pushItem = text => {
    if (!text) return;
    const lo = text.toLowerCase();
    if (lo.includes(q) && !seen.has(lo)) {
      seen.add(lo);
      matches.push(text);
    }
  };

  // current draft items first
  for (const item of _draftItems) {
    if (item.type !== 'header') pushItem(item.text);
    if (matches.length >= 8) break;
  }

  // then all saved notes
  for (const note of S.notes) {
    for (const item of note.items || []) {
      if (item.type !== 'header') pushItem(item.text);
      if (matches.length >= 8) break;
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
      <div class="add-item-area">
        <div class="add-item-input-wrap">
          <span class="add-item-plus">+</span>
          <input type="text" id="new-dim-input" placeholder="Ölçü ekle…"
            onkeydown="if(event.key==='Enter'){event.preventDefault();addDimItemFromInput();}">
        </div>
      </div>
    </div>
  `;
}

function addDimItemFromInput() {
  const input = document.getElementById('new-dim-input');
  const label = input.value.trim();
  syncDimFromDOM();
  _draftItems.push({ label, en: '', boy: '', derinlik: '' });
  document.getElementById('dim-items').innerHTML = buildDimItemsHtml();
  input.value = '';
  const enInputs = document.querySelectorAll('.dim-en');
  enInputs[enInputs.length - 1]?.focus();
  if (editingNoteId) saveNote(_currentType, false);
}

function buildDimItemsHtml() {
  return _draftItems.map((item, i) => `
    <div class="dim-item-row" onclick="activateItemRow(this)">
      <input type="text" class="dim-label"
        value="${escHtml(item.label || '')}" placeholder="İsim"
        onclick="event.stopPropagation()"
        oninput="_draftItems[${i}].label=this.value;_scheduleAutoSave()">
      <input type="text" class="dim-en"
        value="${escHtml(item.en || '')}" placeholder="En"
        onclick="event.stopPropagation()"
        oninput="_draftItems[${i}].en=this.value;_scheduleAutoSave()">
      <input type="text" class="dim-boy"
        value="${escHtml(item.boy || '')}" placeholder="Boy"
        onclick="event.stopPropagation()"
        oninput="_draftItems[${i}].boy=this.value;_scheduleAutoSave()">
      <input type="text" class="dim-derinlik"
        value="${escHtml(item.derinlik || '')}" placeholder="Derinlik"
        onclick="event.stopPropagation()"
        oninput="_draftItems[${i}].derinlik=this.value;_scheduleAutoSave()">
      <div class="item-controls">
        <button class="btn-item-delete" onclick="event.stopPropagation();removeDimItem(${i})">✕</button>
      </div>
    </div>
  `).join('');
}

function syncDimFromDOM() {
  document.querySelectorAll('.dim-item-row').forEach((row, i) => {
    if (_draftItems[i]) {
      _draftItems[i].label    = row.querySelector('.dim-label')?.value    || '';
      _draftItems[i].en       = row.querySelector('.dim-en')?.value       || '';
      _draftItems[i].boy      = row.querySelector('.dim-boy')?.value      || '';
      _draftItems[i].derinlik = row.querySelector('.dim-derinlik')?.value || '';
    }
  });
}

function addDimItem() {
  syncDimFromDOM();
  _draftItems.push({ label: '', en: '', boy: '', derinlik: '' });
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
  };

  if (type === 'text') {
    noteData.content = document.getElementById('note-content')?.value || '';
  } else if (type === 'checklist') {
    syncChecklistFromDOM();
    noteData.items = _draftItems.filter(i => (i.text || '').trim() || i.type === 'header');
  } else if (type === 'dimension') {
    syncDimFromDOM();
    noteData.items = _draftItems.filter(i => (i.label || '').trim() || (i.en || '').trim());
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

  const numCount  = l => (l.match(/\d+/g) || []).length;
  const isDimLine = l => numCount(l) >= 2 || (numCount(l) === 1 && /[xX×]/.test(l));
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
  // Strip area-result patterns: =7,29m2 / = 28,38 m2 / =9,46m2
  let s = line.replace(/=\s*[\d,\.]+\s*m?\s*2?/gi, '').trim();
  // Normalize x/X/× to space, collapse whitespace
  s = s.replace(/\s*[xX×]\s*/g, ' ').replace(/\s+/g, ' ').trim();

  // Split label from numbers: everything up to last letter before a digit block
  const match = s.match(/^(.*?[A-Za-zÇçĞğİıÖöŞşÜü])\s+(\d.*)$/);
  let label   = '';
  let numPart = s;
  if (match) {
    label   = match[1].trim();
    numPart = match[2];
  }

  // Clean trailing dimension keywords and punctuation from label
  label = label
    .replace(/\s+(en|boy|yükseklik|derinlik|genişlik|uzunluk|maks?\.?)\s*$/i, '')
    .replace(/[:\-]+$/, '')
    .trim();

  // Extract integers only (dimensions are whole numbers; skip decimals like 7.29)
  const nums = (numPart.match(/\d+/g) || []).map(Number).filter(n => n >= 1);

  return {
    label:    label || s,
    en:       nums[0] ? String(nums[0]) : '',
    boy:      nums[1] ? String(nums[1]) : '',
    derinlik: nums[2] ? String(nums[2]) : '',
  };
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
