/**
 * aiq-track-engine.js  —  shared quiz + chat engine for AIQ training tracks
 *
 * Eliminates 11 duplicated functions across all 4 training track files.
 * Load via <script src="aiq-track-engine.js"></script> in <head>, after aiq-auth.js.
 *
 * HANDLES:
 *   Navigation:  showPage
 *   Quiz engine: renderQuiz, selectAnswer, nextQuestion, renderQuizComplete
 *   Chat DOM:    addMessage, addTyping, removeTyping
 *   Utilities:   handleChatKey, autoResize, askSuggested
 *
 * EACH TRACK MUST define in its own <script>:
 *   window.QUIZ = QUIZ;                  required — array of quiz question objects
 *   window.AIQ_QUIZ_CTA = '';            optional — HTML injected after quiz results (default: '')
 *   window.AIQ_PERFECT_TITLE = '...';   optional — title for 80%+ score (default: 'Excellent Work')
 *   window.AIQ_PERFECT_MSG   = '...';   optional — message for 80%+ score
 *
 * EACH TRACK MUST keep in its own <script> (NOT extracted):
 *   function initChat()         — track-specific opening message
 *   async function sendMessage() — track-specific system prompt + API fetch
 *   checkAccess() or gate flow  — auth is different per track
 *
 * SHARED STATE (do NOT re-declare with let/const in track files):
 *   window.quizState, window.chatHistory, window.completedPages, window.chatInitialized
 *
 * For track 1 only: change `let userName = ""` → `var userName = ""`
 * so window.userName is accessible for the addMessage name label.
 */
(function () {

  // ── SHARED STATE DEFAULTS ──────────────────────────────────────────────────
  // Engine initializes; track files must NOT re-declare these with let/const.
  window.quizState      = window.quizState      || { current: 0, answers: [], complete: false };
  window.chatHistory    = window.chatHistory    || [];
  window.completedPages = window.completedPages || new Set();
  window.chatInitialized = false; // always reset on page load

  // ── NAVIGATION ─────────────────────────────────────────────────────────────
  function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + id).classList.add('active');
    const nav = document.getElementById('nav-' + id);
    if (nav) {
      nav.classList.add('active');
      if (!nav.querySelector('.nav-check') && id.startsWith('lesson')) {
        window.completedPages.add(id);
      }
    }
    if (id === 'quiz') renderQuiz();
    if (id === 'chat' && !window.chatInitialized) {
      if (typeof window.initChat === 'function') window.initChat();
      window.chatInitialized = true;
    }
    if (window.innerWidth <= 768) {
      document.querySelector('.main').scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }

  // ── QUIZ ENGINE ────────────────────────────────────────────────────────────
  function renderQuiz() {
    const body = document.getElementById('quiz-body');
    if (!body) return;
    if (window.quizState.complete) { renderQuizComplete(); return; }
    const q = window.QUIZ[window.quizState.current];
    const letters = ['A', 'B', 'C', 'D'];
    body.innerHTML = `
      <div class="quiz-progress"><div class="quiz-progress-fill" style="width:${(window.quizState.current / window.QUIZ.length) * 100}%"></div></div>
      <div style="font-family:var(--mono);font-size:10px;color:#FFFFFF;margin-bottom:16px;letter-spacing:0.1em">Question ${window.quizState.current + 1} of ${window.QUIZ.length}</div>
      <div class="quiz-q">${q.q}</div>
      <div class="quiz-options">
        ${q.opts.map((o, i) => `<button class="quiz-option" onclick="selectAnswer(${i})"><span class="quiz-opt-letter">${letters[i]}</span>${o}</button>`).join('')}
      </div>
      <div class="quiz-feedback" id="quiz-feedback"></div>
      <div id="quiz-next-btn"></div>
    `;
  }

  function selectAnswer(i) {
    const q = window.QUIZ[window.quizState.current];
    const opts = document.querySelectorAll('.quiz-option');
    opts.forEach(o => o.style.pointerEvents = 'none');
    opts[i].classList.add(i === q.correct ? 'correct' : 'wrong');
    if (i !== q.correct) opts[q.correct].classList.add('correct');
    window.quizState.answers.push(i);
    const fb = document.getElementById('quiz-feedback');
    fb.className = 'quiz-feedback show ' + (i === q.correct ? 'correct' : 'wrong');
    fb.textContent = (i === q.correct ? '✓ ' : '✗ ') + q.feedback;
    document.getElementById('quiz-next-btn').innerHTML = `
      <button class="btn-nav-primary" style="margin-top:8px" onclick="nextQuestion()">
        ${window.quizState.current < window.QUIZ.length - 1 ? 'Next Question →' : 'See Results →'}
      </button>`;
  }

  function nextQuestion() {
    window.quizState.current++;
    if (window.quizState.current >= window.QUIZ.length) {
      window.quizState.complete = true;
      renderQuizComplete();
    } else {
      renderQuiz();
    }
  }

  function renderQuizComplete() {
    const correct = window.quizState.answers.filter((a, i) => a === window.QUIZ[i].correct).length;
    const pct = Math.round((correct / window.QUIZ.length) * 100);
    const perfectTitle = window.AIQ_PERFECT_TITLE || 'Excellent Work';
    const perfectMsg   = window.AIQ_PERFECT_MSG
      || 'Strong understanding. Move on to the AI Coach to apply these concepts.';
    const title = pct >= 80 ? perfectTitle : pct >= 60 ? 'Good Work' : 'Keep Going';
    const msg = pct >= 80 ? perfectMsg
      : pct >= 60 ? 'Good foundation. Review any questions you missed, then work with the AI Coach.'
      : 'Consider re-reading the modules before moving forward. The AI Coach can help clarify any concepts.';
    document.getElementById('quiz-body').innerHTML = `
      <div class="quiz-score-final">
        <div class="quiz-score-circle">
          <span class="big">${correct}/${window.QUIZ.length}</span>
          <span class="small">${pct}%</span>
        </div>
        <div class="quiz-result-title">${title}</div>
        <p class="quiz-result-body">${msg}</p>
        <button class="btn-nav-primary" onclick="showPage('chat')">Continue to AI Coach →</button>
        ${window.AIQ_QUIZ_CTA || ''}
      </div>`;
    const nav = document.getElementById('nav-quiz');
    if (nav && !nav.querySelector('.nav-check')) nav.innerHTML += '<span class="nav-check">✓</span>';
  }

  // ── CHAT DOM ───────────────────────────────────────────────────────────────
  function addMessage(role, text) {
    window.chatHistory.push({ role: role === 'ai' ? 'assistant' : 'user', content: text });
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerHTML = `
      <div class="msg-avatar ${role}">${role === 'ai' ? 'AI' : 'ME'}</div>
      <div class="msg-bubble">
        <div class="msg-name">${role === 'ai' ? 'AI Coach' : (window.userName || 'You')}</div>
        <div class="msg-text"><p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p></div>
      </div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function addTyping() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'msg ai';
    div.id = 'typing-indicator';
    div.innerHTML = `<div class="msg-avatar ai">AI</div><div class="msg-bubble"><div class="msg-name">AI Coach</div><div class="msg-text"><div class="typing"><span></span><span></span><span></span></div></div></div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('typing-indicator');
    if (t) t.remove();
  }

  // ── INPUT HELPERS ──────────────────────────────────────────────────────────
  function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendMessage(); }
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  function askSuggested(btn) {
    window.sendMessage(btn.textContent);
  }

  // ── EXPORTS ────────────────────────────────────────────────────────────────
  window.showPage           = showPage;
  window.renderQuiz         = renderQuiz;
  window.selectAnswer       = selectAnswer;
  window.nextQuestion       = nextQuestion;
  window.renderQuizComplete = renderQuizComplete;
  window.addMessage         = addMessage;
  window.addTyping          = addTyping;
  window.removeTyping       = removeTyping;
  window.handleChatKey      = handleChatKey;
  window.autoResize         = autoResize;
  window.askSuggested       = askSuggested;

})();
