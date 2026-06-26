# H-3: AIQ Track Engine — Review Package

## What this does

Extracts **11 duplicated functions** from all 4 AIQ training track files into a single shared `aiq-track-engine.js`. The engine is an IIFE (same pattern as `stream.js` and `toast.js`).

**Functions extracted (removed from all 4 tracks):**

| Function | Lines saved (avg) |
|---|---|
| `showPage(id)` | 17 |
| `renderQuiz()` | 17 |
| `selectAnswer(i)` | 17 |
| `nextQuestion()` | 6 |
| `renderQuizComplete()` | 17 |
| `addMessage(role, text)` | 14 |
| `addTyping()` | 10 |
| `removeTyping()` | 1 |
| `handleChatKey(e)` | 1 |
| `autoResize(el)` | 2 |
| `askSuggested(btn)` | 1 |

**Total saved: ~100 lines × 4 files = ~400 lines removed from the codebase.**

**Not extracted (intentionally per-track):**
- `QUIZ` array — track-specific questions
- `initChat()` — track-specific opening message
- `sendMessage()` — track-specific system prompt referencing module content
- `checkAccess()` / gate flow — different auth per track (T1 = free+gate, T2-4 = Supabase paywall)
- `updateNavForAccess()` — different nav per track
- `INDUSTRY_KB` / `MATURITY` (track 1 only) — complex data, stays with track 1

---

## Per-track changes

### ALL 4 TRACKS: Add script tag

In `<head>`, after `<script src="aiq-auth.js"></script>`, add:
```html
<script src="aiq-track-engine.js"></script>
```

### ALL 4 TRACKS: Remove from inline `<script>`

Remove these variable declarations (engine initializes them on `window`):
```js
let chatHistory = [];
let quizState = { current: 0, answers: [], complete: false };
let completedPages = new Set();
let chatInitialized = false;   // tracks 2/3/4 only — track 1 doesn't have this
```

Remove these 11 functions entirely:
- `showPage(id)` and its `// ── NAVIGATION ──` comment
- `renderQuiz()` and its `// ── QUIZ ──` comment (track 1) or equivalent
- `selectAnswer(i)`
- `nextQuestion()`
- `renderQuizComplete()`
- `addMessage(role, text)`
- `addTyping()`
- `removeTyping()`
- `handleChatKey(e)`
- `autoResize(el)`
- `askSuggested(btn)`

### ALL 4 TRACKS: Update sendMessage

In the remaining `sendMessage()` function, change:
```js
// OLD:
messages: chatHistory

// NEW:
messages: window.chatHistory
```

### ALL 4 TRACKS: Add window.QUIZ after const QUIZ = [...]

After the closing `];` of the `const QUIZ = [...]` array, add:
```js
window.QUIZ = QUIZ;
```

---

## Track-specific changes

### Track 1 (`aiq-training-track1.html`)

**Change `let userName` → `var userName`** so the engine's `addMessage` can read `window.userName`:
```js
// OLD:
let userName = "";

// NEW:
var userName = "";
```

**Add `window.chatInitialized = true;`** in two places where `initChat()` is called:

1. Inside the session check (`window.onload` async block):
```js
// OLD:
initChat();
renderQuiz();

// NEW:
initChat();
window.chatInitialized = true;
renderQuiz();
```

2. Inside `unlockTraining()`:
```js
// OLD:
initChat();
renderQuiz();
updateNavForAccess();

// NEW:
initChat();
window.chatInitialized = true;
renderQuiz();
updateNavForAccess();
```

**Add quiz CTA config** (after `window.QUIZ = QUIZ;`):
```js
window.AIQ_QUIZ_CTA = '';
```

---

### Track 2 (`aiq-training-track2.html`)

**Add quiz CTA config** (after `window.QUIZ = QUIZ;`):
```js
window.AIQ_QUIZ_CTA = '<br><br><a href="https://buy.stripe.com/eVq4gzbXq4dW2fvh2J0kE05" class="btn-nav-primary" style="display:inline-block;text-decoration:none;margin-top:8px">Unlock Tracks 3 + 4 →</a>';
```

---

### Track 3 (`aiq-training-track3.html`)

**Add quiz CTA config** (after `window.QUIZ = QUIZ;`):
```js
window.AIQ_QUIZ_CTA = '<br><br><a href="https://buy.stripe.com/eVq00j0eI39S4nDeUB0kE04" class="btn-nav-primary" style="display:inline-block;text-decoration:none;margin-top:8px">Unlock Track 4 →</a>';
```

---

### Track 4 (`aiq-training-track4.html`)

**Add quiz completion config** (after `window.QUIZ = QUIZ;`):
```js
window.AIQ_QUIZ_CTA    = '';
window.AIQ_PERFECT_TITLE = 'Track Complete';
window.AIQ_PERFECT_MSG   = 'Excellent. You have completed the full AIQ training track. Move on to the AI Coach to apply what you have learned.';
```

---

## How the engine works

`aiq-track-engine.js` loads from `<head>` and runs its IIFE immediately:
1. Initializes shared state on `window` (quizState, chatHistory, completedPages, chatInitialized)
2. Defines all 11 shared functions
3. Exports them to `window.renderQuiz`, `window.addMessage`, etc.

Then the inline `<script>` at bottom of `<body>` runs:
1. Sets `window.QUIZ = QUIZ` — the engine's `renderQuiz()` reads this at call-time
2. Sets `window.AIQ_QUIZ_CTA` etc. — the engine's `renderQuizComplete()` reads at call-time
3. Defines `function initChat()` and `async function sendMessage()` — these become globals that the engine's `showPage`, `handleChatKey`, and `askSuggested` call by name

**Execution order is safe** because the engine functions only read QUIZ/config at call-time (when users click buttons), not at define-time.

---

## Git commands (after Joe applies)

```
git add aiq/aiq-track-engine.js aiq/aiq-training-track1.html aiq/aiq-training-track2.html aiq/aiq-training-track3.html aiq/aiq-training-track4.html
git commit -m "refactor(H-3): extract shared aiq-track-engine.js, remove 11×4 duplicated functions"
git push origin main
```
