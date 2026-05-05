/**
 * JSN Made / REPS Auth Library
 * Include in every REPS tool HTML file via:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
 *   <script src="/reps/auth.js"></script>
 *
 * Provides:
 *   JSNAuth.init()           — call once on page load
 *   JSNAuth.getSession()     — returns current session or null
 *   JSNAuth.getJWT()         — returns access token string or null
 *   JSNAuth.requireAuth()    — shows modal if not logged in, resolves when authed
 *   JSNAuth.signOut()        — signs user out
 *   JSNAuth.onAuthChange(fn) — subscribe to auth state changes
 */

(function (global) {
  "use strict";

  const SUPABASE_URL = "https://vmuvgdtfsdydvpxvdgso.supabase.co";
  const SUPABASE_ANON_KEY = "%%SUPABASE_ANON_KEY%%"; // replaced at deploy or set via meta tag

  let _supabase = null;
  let _session = null;
  let _authResolvers = [];
  let _modalInjected = false;

  // ============================================================
  // Init
  // ============================================================
  async function init() {
    // Allow anon key override via meta tag
    const metaKey = document.querySelector('meta[name="sb-anon-key"]');
    const anonKey = (metaKey && metaKey.content) || SUPABASE_ANON_KEY;

    _supabase = supabase.createClient(SUPABASE_URL, anonKey);

    // Restore session from storage
    const { data } = await _supabase.auth.getSession();
    _session = data.session;

    // Listen for auth state changes
    _supabase.auth.onAuthStateChange((event, session) => {
      _session = session;
      _authResolvers.forEach((resolve) => resolve(session));
      _authResolvers = [];
      document.dispatchEvent(new CustomEvent("jsn:authchange", { detail: { session, event } }));
    });

    injectStyles();
  }

  // ============================================================
  // Public API
  // ============================================================
  function getSession() {
    return _session;
  }

  function getJWT() {
    return _session?.access_token || null;
  }

  function onAuthChange(fn) {
    document.addEventListener("jsn:authchange", (e) => fn(e.detail));
  }

  async function signOut() {
    await _supabase.auth.signOut();
    _session = null;
    document.dispatchEvent(new CustomEvent("jsn:authchange", { detail: { session: null, event: "SIGNED_OUT" } }));
  }

  /**
   * If the user is already authed, resolves immediately.
   * Otherwise shows the auth modal and resolves when they sign in.
   */
  function requireAuth() {
    return new Promise((resolve) => {
      if (_session) {
        resolve(_session);
        return;
      }
      _authResolvers.push(resolve);
      showModal();
    });
  }

  // ============================================================
  // Auth Modal
  // ============================================================
  function showModal() {
    if (!_modalInjected) injectModal();
    const overlay = document.getElementById("jsn-auth-overlay");
    if (overlay) {
      overlay.style.display = "flex";
      setTimeout(() => overlay.classList.add("jsn-visible"), 10);
    }
  }

  function hideModal() {
    const overlay = document.getElementById("jsn-auth-overlay");
    if (overlay) {
      overlay.classList.remove("jsn-visible");
      setTimeout(() => (overlay.style.display = "none"), 300);
    }
  }

  function injectModal() {
    _modalInjected = true;

    const overlay = document.createElement("div");
    overlay.id = "jsn-auth-overlay";
    overlay.innerHTML = `
      <div class="jsn-auth-modal">
        <div class="jsn-auth-logo">
          <span class="jsn-auth-logo-jsn">JSN</span><span class="jsn-auth-logo-made">Made</span>
        </div>
        <div class="jsn-auth-tabs">
          <button class="jsn-tab active" data-tab="signin">Sign In</button>
          <button class="jsn-tab" data-tab="signup">Create Account</button>
        </div>

        <div class="jsn-auth-panel" id="jsn-panel-signin">
          <p class="jsn-auth-subtitle">Access your REPS tools</p>
          <div class="jsn-field">
            <label>Email</label>
            <input type="email" id="jsn-signin-email" placeholder="you@company.com" autocomplete="email" />
          </div>
          <div class="jsn-field">
            <label>Password</label>
            <input type="password" id="jsn-signin-password" placeholder="Password" autocomplete="current-password" />
          </div>
          <div class="jsn-auth-error" id="jsn-signin-error"></div>
          <button class="jsn-auth-btn" id="jsn-signin-btn">Sign In</button>
          <p class="jsn-auth-forgot"><a href="#" id="jsn-forgot-link">Forgot password?</a></p>
        </div>

        <div class="jsn-auth-panel hidden" id="jsn-panel-signup">
          <p class="jsn-auth-subtitle">Start free. No credit card required.</p>
          <div class="jsn-field">
            <label>Email</label>
            <input type="email" id="jsn-signup-email" placeholder="you@company.com" autocomplete="email" />
          </div>
          <div class="jsn-field">
            <label>Password</label>
            <input type="password" id="jsn-signup-password" placeholder="Min 8 characters" autocomplete="new-password" />
          </div>
          <div class="jsn-auth-error" id="jsn-signup-error"></div>
          <button class="jsn-auth-btn" id="jsn-signup-btn">Create Account</button>
        </div>

        <div class="jsn-auth-panel hidden" id="jsn-panel-forgot">
          <p class="jsn-auth-subtitle">Enter your email to reset your password.</p>
          <div class="jsn-field">
            <label>Email</label>
            <input type="email" id="jsn-forgot-email" placeholder="you@company.com" />
          </div>
          <div class="jsn-auth-error" id="jsn-forgot-error"></div>
          <button class="jsn-auth-btn" id="jsn-forgot-btn">Send Reset Link</button>
          <p class="jsn-auth-forgot"><a href="#" id="jsn-back-link">Back to Sign In</a></p>
        </div>

        <div class="jsn-auth-panel hidden jsn-auth-success" id="jsn-panel-success">
          <div class="jsn-success-icon">&#10003;</div>
          <p id="jsn-success-msg">Check your inbox to confirm your email.</p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    bindModalEvents();
  }

  function bindModalEvents() {
    // Tab switching
    document.querySelectorAll(".jsn-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".jsn-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const target = tab.dataset.tab;
        document.querySelectorAll(".jsn-auth-panel").forEach((p) => p.classList.add("hidden"));
        document.getElementById(`jsn-panel-${target}`).classList.remove("hidden");
      });
    });

    // Sign in
    document.getElementById("jsn-signin-btn").addEventListener("click", async () => {
      const email = document.getElementById("jsn-signin-email").value.trim();
      const password = document.getElementById("jsn-signin-password").value;
      const errorEl = document.getElementById("jsn-signin-error");
      errorEl.textContent = "";

      if (!email || !password) {
        errorEl.textContent = "Please fill in all fields.";
        return;
      }

      setLoading("jsn-signin-btn", true);
      const { error } = await _supabase.auth.signInWithPassword({ email, password });
      setLoading("jsn-signin-btn", false);

      if (error) {
        errorEl.textContent = error.message;
      } else {
        hideModal();
      }
    });

    // Sign up
    document.getElementById("jsn-signup-btn").addEventListener("click", async () => {
      const email = document.getElementById("jsn-signup-email").value.trim();
      const password = document.getElementById("jsn-signup-password").value;
      const errorEl = document.getElementById("jsn-signup-error");
      errorEl.textContent = "";

      if (!email || !password) {
        errorEl.textContent = "Please fill in all fields.";
        return;
      }
      if (password.length < 8) {
        errorEl.textContent = "Password must be at least 8 characters.";
        return;
      }

      setLoading("jsn-signup-btn", true);
      const { error } = await _supabase.auth.signUp({ email, password });
      setLoading("jsn-signup-btn", false);

      if (error) {
        errorEl.textContent = error.message;
      } else {
        showPanel("success");
        document.getElementById("jsn-success-msg").textContent =
          "Account created! Check your inbox to confirm your email, then sign in.";
      }
    });

    // Forgot password
    document.getElementById("jsn-forgot-link").addEventListener("click", (e) => {
      e.preventDefault();
      showPanel("forgot");
    });

    document.getElementById("jsn-back-link").addEventListener("click", (e) => {
      e.preventDefault();
      showPanel("signin");
    });

    document.getElementById("jsn-forgot-btn").addEventListener("click", async () => {
      const email = document.getElementById("jsn-forgot-email").value.trim();
      const errorEl = document.getElementById("jsn-forgot-error");
      errorEl.textContent = "";

      if (!email) {
        errorEl.textContent = "Enter your email address.";
        return;
      }

      setLoading("jsn-forgot-btn", true);
      const { error } = await _supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reps/reset-password.html`,
      });
      setLoading("jsn-forgot-btn", false);

      if (error) {
        errorEl.textContent = error.message;
      } else {
        showPanel("success");
        document.getElementById("jsn-success-msg").textContent =
          "Password reset link sent. Check your inbox.";
      }
    });

    // Enter key on inputs
    ["jsn-signin-email", "jsn-signin-password"].forEach((id) => {
      document.getElementById(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.getElementById("jsn-signin-btn").click();
      });
    });
  }

  function showPanel(name) {
    document.querySelectorAll(".jsn-auth-panel").forEach((p) => p.classList.add("hidden"));
    document.getElementById(`jsn-panel-${name}`).classList.remove("hidden");
  }

  function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    btn.disabled = loading;
    btn.textContent = loading ? "..." : btn.textContent.replace("...", "");
    if (btnId === "jsn-signin-btn") btn.textContent = loading ? "Signing In..." : "Sign In";
    if (btnId === "jsn-signup-btn") btn.textContent = loading ? "Creating Account..." : "Create Account";
    if (btnId === "jsn-forgot-btn") btn.textContent = loading ? "Sending..." : "Send Reset Link";
  }

  // ============================================================
  // Styles
  // ============================================================
  function injectStyles() {
    if (document.getElementById("jsn-auth-styles")) return;
    const style = document.createElement("style");
    style.id = "jsn-auth-styles";
    style.textContent = `
      #jsn-auth-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(11,17,32,0.92);
        backdrop-filter: blur(6px);
        z-index: 9999;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      #jsn-auth-overlay.jsn-visible { opacity: 1; }

      .jsn-auth-modal {
        background: #0f1929;
        border: 1px solid rgba(0,212,200,0.2);
        border-radius: 16px;
        padding: 40px;
        width: 100%;
        max-width: 420px;
        margin: 20px;
        box-shadow: 0 24px 80px rgba(0,0,0,0.6);
      }

      .jsn-auth-logo {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        margin-bottom: 28px;
        text-align: center;
      }
      .jsn-auth-logo-jsn { color: #00d4c8; }
      .jsn-auth-logo-made { color: #ffffff; margin-left: 4px; }

      .jsn-auth-tabs {
        display: flex;
        gap: 0;
        margin-bottom: 24px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .jsn-tab {
        flex: 1;
        background: none;
        border: none;
        padding: 10px 16px;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.4);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition: all 0.2s;
      }
      .jsn-tab.active {
        color: #00d4c8;
        border-bottom-color: #00d4c8;
      }
      .jsn-tab:hover:not(.active) { color: rgba(255,255,255,0.7); }

      .jsn-auth-subtitle {
        color: rgba(255,255,255,0.55);
        font-family: 'Barlow', sans-serif;
        font-size: 14px;
        margin: 0 0 20px;
        text-align: center;
      }

      .jsn-auth-panel.hidden { display: none; }

      .jsn-field {
        margin-bottom: 16px;
      }
      .jsn-field label {
        display: block;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.5);
        margin-bottom: 6px;
      }
      .jsn-field input {
        width: 100%;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 8px;
        padding: 11px 14px;
        font-family: 'DM Mono', monospace;
        font-size: 14px;
        color: #ffffff;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .jsn-field input:focus {
        border-color: #00d4c8;
        background: rgba(0,212,200,0.04);
      }
      .jsn-field input::placeholder { color: rgba(255,255,255,0.2); }

      .jsn-auth-error {
        color: #ff6b2b;
        font-family: 'Barlow', sans-serif;
        font-size: 13px;
        min-height: 18px;
        margin-bottom: 12px;
      }

      .jsn-auth-btn {
        width: 100%;
        background: #00d4c8;
        color: #0b1120;
        border: none;
        border-radius: 8px;
        padding: 13px;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
      }
      .jsn-auth-btn:hover { background: #00bfb4; }
      .jsn-auth-btn:active { transform: scale(0.98); }
      .jsn-auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      .jsn-auth-forgot {
        text-align: center;
        margin-top: 14px;
        font-family: 'Barlow', sans-serif;
        font-size: 13px;
      }
      .jsn-auth-forgot a {
        color: rgba(255,255,255,0.45);
        text-decoration: none;
      }
      .jsn-auth-forgot a:hover { color: #00d4c8; }

      .jsn-auth-success {
        text-align: center;
        padding: 20px 0;
      }
      .jsn-success-icon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: rgba(0,212,200,0.15);
        border: 2px solid #00d4c8;
        color: #00d4c8;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
      }
      #jsn-success-msg {
        color: rgba(255,255,255,0.8);
        font-family: 'Barlow', sans-serif;
        font-size: 15px;
        line-height: 1.5;
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // Expose public API
  // ============================================================
  global.JSNAuth = {
    init,
    getSession,
    getJWT,
    requireAuth,
    signOut,
    onAuthChange,
  };
})(window);
