# H-5 Toast Consolidation — Review Package

## What's in this folder

| File | Purpose |
|------|---------|
| `toast.js` | New shared helper — copy to root of `D:\jsnmade\` |
| `CHANGES.md` | This file — exact changes needed in each live HTML |

Once approved, say "apply H-5" and all 4 edits + the file copy will happen in one shot.

---

## New file to add to repo

**`toast.js`** → copy to `D:\jsnmade\toast.js`

- Single `toast(msg, type='')` function
- `type = 'ok'` → cyan border/text
- `type = 'err'` → orange border/text
- Cancels prior toast before showing next one (no stacking)
- `window.showToast` aliased to `toast` for safety (Rental ROI calls are renamed anyway)

---

## File 1 — `jsn-pipeline-analyzer-v101.html`

**Add script tag** — find this line (near other script src tags, ~line 1326):
```
<script src="/stream.js"></script>
```
Add immediately after:
```
<script src="/toast.js"></script>
```

**Remove inline implementation** — delete these 16 lines:
```javascript
// ── TOAST ─────────────────────────────────────────────────────────────────
function toast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom: '22px', right: '22px',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text)', padding: '10px 16px',
    borderRadius: '4px', fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    zIndex: '999', transition: 'opacity 0.3s'
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}
```

**Call sites:** 1 call — no changes needed (`toast(...)` signature is unchanged).

---

## File 2 — `JSN-Property-Deal-Analyzer.html`

**Add script tag** — find the stream.js script tag and add after:
```
<script src="/toast.js"></script>
```

**Remove inline implementation** — delete these 14 lines:
```javascript
function toast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', bottom:'22px', right:'22px',
    background:'var(--navy3)', border:'1px solid var(--border)',
    color:'var(--white)', padding:'11px 18px',
    borderRadius:'8px', fontSize:'13px',
    boxShadow:'0 4px 24px rgba(0,0,0,0.45)',
    zIndex:'999', transition:'opacity 0.3s'
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 3000);
}
```

**Call sites:** 4 calls — no changes needed.

---

## File 3 — `JSN-Rental-ROI-Assistant.html`

**Add script tag** — add after stream.js script tag:
```
<script src="/toast.js"></script>
```

**Remove inline implementation** — delete these 14 lines:
```javascript
function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom: '24px', right: '24px',
    background: 'var(--navy3)', border: '1px solid var(--border)',
    color: 'var(--white)', padding: '12px 20px',
    borderRadius: '8px', fontSize: '13px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    zIndex: '999', transition: 'opacity 0.3s'
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}
```

**Call sites — rename `showToast` → `toast`** (4 replacements):

| Find | Replace |
|------|---------|
| `showToast('Please enter at least a monthly rent amount to begin analysis.');` | `toast('Please enter at least a monthly rent amount to begin analysis.');` |
| `showToast('⚠️ No API key configured...` | `toast('⚠️ No API key configured...` |
| `showToast('Analysis copied to clipboard')` | `toast('Analysis copied to clipboard')` |
| `showToast('Copy failed — try selecting the text manually')` | `toast('Copy failed — try selecting the text manually')` |

---

## File 4 — `JSN-Real-Estate-Roleplay-Coach.html`

**Add script tag** — add before `</body>` (or after other script tags):
```
<script src="/toast.js"></script>
```

**Remove CSS rules** — in the `<style>` block, delete these 3 lines:
```css
.toast{position:fixed;bottom:20px;right:20px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:9px 14px;font-family:'DM Mono',monospace;font-size:11px;color:var(--text);z-index:999;animation:fadeUp .2s ease}
.toast.ok{border-color:var(--success);color:var(--success);box-shadow:0 0 14px rgba(0,229,160,.2)}
.toast.err{border-color:var(--danger);color:var(--danger)}
```

**Remove `let tt;` variable** — delete this line (just above the function):
```javascript
let tt;
```

**Remove inline implementation** — delete these 5 lines:
```javascript
function toast(msg,type=''){
  document.querySelector('.toast')?.remove();clearTimeout(tt);
  const d=document.createElement('div');d.className=`toast ${type}`;d.textContent=msg;
  document.body.appendChild(d);tt=setTimeout(()=>d.remove(),3000);
}
```

**Call sites:** 7 calls — no changes needed. The new `toast(msg, type)` API is identical.
The type values used are `'ok'` and `'err'` — both supported by the new helper.

---

## Summary

| File | Lines removed | Lines added | Call site changes |
|------|--------------|-------------|-------------------|
| `jsn-pipeline-analyzer-v101.html` | 16 | 1 (`<script>`) | 0 |
| `JSN-Property-Deal-Analyzer.html` | 14 | 1 (`<script>`) | 0 |
| `JSN-Rental-ROI-Assistant.html` | 14 | 1 (`<script>`) | 4 renames |
| `JSN-Real-Estate-Roleplay-Coach.html` | 9 (3 CSS + 1 var + 5 JS) | 1 (`<script>`) | 0 |
| **`toast.js`** | — | 65 (new file) | — |
