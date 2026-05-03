# CLAUDE.md — Notly

## Local Development

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

No build step. All JS files are plain scripts loaded via `<script src>` in `index.html`.

Syntax-check JS without a browser:
```bash
for f in js/**/*.js js/*.js pages/*.js; do node --check "$f"; done
```

## Architecture

### State — `js/store.js`

Single global object `S`, persisted to `localStorage` under key `notly_v1`.

```js
S = {
  notes: [],    // Note[]
  theme: 'dark' | 'light',
  filter: 'all' | 'text' | 'checklist' | 'dimension',
}
```

**Note shape:**
```js
{
  id: string,        // genId()
  type: 'text' | 'checklist' | 'dimension',
  title: string,
  pinned: boolean,
  created: ms,
  updated: ms,
  // text notes:
  content: string,
  // checklist notes:
  items: [{ text, checked }],
  // dimension notes:
  items: [{ label, value, unit }],
}
```

`saveS()` writes to localStorage. `loadS()` merges with DEFAULT_STATE for backwards safety.

### JS Load Order (`index.html`)

`store.js` → `api.js` → `components/header.js` → `components/card.js` → `components/modal.js` → `components/list.js` → `pages/home.js` → `pages/settings.js` → `app.js` → `sw-register.js`

### File Responsibilities

| File | Responsibility |
|------|---------------|
| `js/store.js` | State (S), localStorage, `genId`, `escHtml`, `formatDate` |
| `js/api.js` | `fetchWithRetry` — all external fetch calls go here |
| `js/app.js` | `init()` — calls `loadS`, `renderHeader`, `renderHome` |
| `js/components/header.js` | Top bar + filter chips; `renderHeader()`, `setFilter()` |
| `js/components/card.js` | `renderCard(note)` — card HTML + `buildPreview()` |
| `js/components/modal.js` | Add/edit note modal; checklist item add/remove; `saveNote()` |
| `js/components/list.js` | `toggleListItem()`, `renderListView()` for checklist notes |
| `pages/home.js` | `renderHome()`, `togglePin()`, `deleteNote()` |
| `pages/settings.js` | `openSettings()`, `toggleTheme()`, `clearAllData()` |

### Modal Pattern

`.mo` = overlay (`display:flex` when `.open` class added).  
`.ms` = sheet (bottom sheet on mobile, centered on desktop ≥640px).

### Checklist Editor State

During editing, `_draftItems[]` in `modal.js` is the source of truth.  
`syncChecklistFromDOM()` reads current input values into `_draftItems` before any add/remove re-render.  
`saveNote()` calls sync, filters empty items, then writes to `S.notes`.

### CSS Architecture

One CSS file per component under `css/components/`. Variables defined in `css/base.css` under `:root` (dark) and `[data-theme="light"]`. Never add inline `<style>` to `index.html`.

## Key Patterns

- **All JS is global scope** — functions defined anywhere are available everywhere. Load order matters.
- **Re-render on save** — `saveS(); renderHome();` is the standard pattern after any state change. Full `innerHTML` re-renders, no diffing.
- **No inline `<style>` or `<script>`** in `index.html`.
- **`escHtml()`** — always escape user content before inserting into innerHTML.

## Available Slash Commands

| Command | What it does |
|---------|-------------|
| `/serve` | Start dev server at http://localhost:8000 |
| `/check` | Syntax-check all JS files with `node --check` |
| `/new-component <name>` | Scaffold `js/components/<name>.js` + `css/components/<name>.css` |
| `/new-branch <name>` | Create `feature/<name>` or `fix/<name>` from latest main |
