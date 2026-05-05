/**
 * JSN Made / REPS Paywall Library
 * Include after auth.js in every REPS tool:
 *   <script src="/reps/paywall.js"></script>
 *
 * Provides:
 *   JSNPaywall.check(toolId)    — checks auth + tier + usage. Returns status object.
 *   JSNPaywall.recordUse(toolId) — increments usage after a successful generation
 *   JSNPaywall.showUpgrade()    — displays the upgrade modal manually
 */

(function (global) {
  "use strict";

  const WORKER_URL = "https://jsn-reps-paywall.wewearsmiles.workers.dev";

  const STRIPE_LINKS = {
    pro: "https://buy.stripe.com/dRm5kD0eI5i02fv8wd0kE07",
    team: "https://buy.stripe.com/00w4gz8Le4dWaM14fX0kE08",
  };

  const FREE_LIMITS = {
    reps_contract: 3,
    reps_email: 5,
    reps_followup: 5,
    reps_objection: 5,
    reps_discovery: 3,
    reps_roleplay: 2,
    reps_pipeline: 3,
  };

  let _upgradeInjected = false;

  // ============================================================
  // check — main entry point for every tool on load
  // Returns: { allowed: bool, tier, used, limit, email }
  // If not authed, shows auth modal first then checks.
  // If over limit, shows upgrade modal.
  // ============================================================
  async function check(toolId) {
    // Ensure authenticated
    const session = await JSNAuth.requireAuth();
    const jwt = session.access_token;

    let status;
    try {
      const res = await fetch(`${WORKER_URL}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jwt, tool_id: toolId }),
      });
      status = await res.json();
    } catch (err) {
      console.error("Paywall check failed:", err);
      // Fail open on network error (don't block user)
      return { allowed: true, tier: "unknown", used: 0, limit: -1 };
    }

    if (!status.allowed) {
      showUpgradeModal(status);
    }

    return status;
  }

  // ============================================================
  // recordUse — call after a successful AI generation
  // ============================================================
  async function recordUse(toolId) {
    const jwt = JSNAuth.getJWT();
    if (!jwt) return;

    try {
      await fetch(`${WORKER_URL}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jwt, tool_id: toolId }),
      });
    } catch (err) {
      console.warn("Failed to record usage:", err);
    }
  }

  // ============================================================
  // Upgrade Modal
  // ============================================================
  function showUpgrade() {
    showUpgradeModal({ tier: "free", used: null, limit: null });
  }

  function showUpgradeModal(status) {
    if (!_upgradeInjected) injectUpgradeModal();
    injectUpgradeStyles();

    const overlay = document.getElementById("jsn-upgrade-overlay");

    // Update dynamic content
    const usageEl = document.getElementById("jsn-upgrade-usage");
    if (usageEl && status.limit > 0) {
      usageEl.textContent = `You've used ${status.used} of ${status.limit} free generations this month.`;
    }

    const tierBadge = document.getElementById("jsn-upgrade-tier");
    if (tierBadge) {
      tierBadge.textContent = status.tier === "pro" ? "Team" : "Pro or Team";
    }

    overlay.style.display = "flex";
    setTimeout(() => overlay.classList.add("jsn-visible"), 10);
  }

  function hideUpgradeModal() {
    const overlay = document.getElementById("jsn-upgrade-overlay");
    if (overlay) {
      overlay.classList.remove("jsn-visible");
      setTimeout(() => (overlay.style.display = "none"), 300);
    }
  }

  function injectUpgradeModal() {
    _upgradeInjected = true;

    const overlay = document.createElement("div");
    overlay.id = "jsn-upgrade-overlay";
    overlay.innerHTML = `
      <div class="jsn-upgrade-modal">
        <div class="jsn-upgrade-badge">Limit Reached</div>
        <h2 class="jsn-upgrade-headline">Unlock Unlimited REPS Access</h2>
        <p class="jsn-upgrade-usage" id="jsn-upgrade-usage"></p>
        <p class="jsn-upgrade-copy">
          Upgrade to <strong id="jsn-upgrade-tier">Pro or Team</strong> for unlimited generations across all 7 REPS tools, priority support, and team collaboration features.
        </p>

        <div class="jsn-upgrade-plans">
          <div class="jsn-plan">
            <div class="jsn-plan-name">Pro</div>
            <div class="jsn-plan-price">$49<span>/mo</span></div>
            <ul class="jsn-plan-features">
              <li>Unlimited generations</li>
              <li>All 7 REPS tools</li>
              <li>Priority support</li>
            </ul>
            <a href="${STRIPE_LINKS.pro}" class="jsn-plan-btn" target="_blank" rel="noopener">
              Upgrade to Pro
            </a>
          </div>

          <div class="jsn-plan jsn-plan-featured">
            <div class="jsn-plan-popular">Most Popular</div>
            <div class="jsn-plan-name">Team</div>
            <div class="jsn-plan-price">$149<span>/mo</span></div>
            <ul class="jsn-plan-features">
              <li>Everything in Pro</li>
              <li>Up to 5 seats</li>
              <li>Team analytics</li>
              <li>Onboarding call</li>
            </ul>
            <a href="${STRIPE_LINKS.team}" class="jsn-plan-btn jsn-plan-btn-featured" target="_blank" rel="noopener">
              Upgrade to Team
            </a>
          </div>
        </div>

        <button class="jsn-upgrade-dismiss" id="jsn-upgrade-dismiss">
          Continue with Free plan
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("jsn-upgrade-dismiss").addEventListener("click", () => {
      hideUpgradeModal();
    });
  }

  function injectUpgradeStyles() {
    if (document.getElementById("jsn-upgrade-styles")) return;
    const style = document.createElement("style");
    style.id = "jsn-upgrade-styles";
    style.textContent = `
      #jsn-upgrade-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(11,17,32,0.94);
        backdrop-filter: blur(8px);
        z-index: 9998;
        align-items: center;
        justify-content: center;
        padding: 20px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      #jsn-upgrade-overlay.jsn-visible { opacity: 1; }

      .jsn-upgrade-modal {
        background: #0f1929;
        border: 1px solid rgba(0,212,200,0.25);
        border-radius: 20px;
        padding: 44px 40px;
        width: 100%;
        max-width: 640px;
        text-align: center;
        box-shadow: 0 32px 100px rgba(0,0,0,0.7);
      }

      .jsn-upgrade-badge {
        display: inline-block;
        background: rgba(255,107,43,0.15);
        border: 1px solid rgba(255,107,43,0.4);
        color: #ff6b2b;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        padding: 4px 12px;
        border-radius: 100px;
        margin-bottom: 16px;
      }

      .jsn-upgrade-headline {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 32px;
        font-weight: 800;
        color: #ffffff;
        margin: 0 0 10px;
        letter-spacing: 0.01em;
        text-transform: uppercase;
      }

      .jsn-upgrade-usage {
        font-family: 'DM Mono', monospace;
        font-size: 13px;
        color: rgba(255,255,255,0.45);
        margin: 0 0 14px;
      }

      .jsn-upgrade-copy {
        font-family: 'Barlow', sans-serif;
        font-size: 15px;
        color: rgba(255,255,255,0.65);
        line-height: 1.6;
        margin: 0 0 28px;
      }
      .jsn-upgrade-copy strong { color: #00d4c8; }

      .jsn-upgrade-plans {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
      }

      .jsn-plan {
        flex: 1;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 24px 20px;
        text-align: left;
        position: relative;
      }

      .jsn-plan-featured {
        border-color: rgba(0,212,200,0.4);
        background: rgba(0,212,200,0.05);
      }

      .jsn-plan-popular {
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        background: #00d4c8;
        color: #0b1120;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 3px 10px;
        border-radius: 100px;
        white-space: nowrap;
      }

      .jsn-plan-name {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.5);
        margin-bottom: 6px;
      }

      .jsn-plan-price {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 36px;
        font-weight: 800;
        color: #ffffff;
        line-height: 1;
        margin-bottom: 16px;
      }
      .jsn-plan-price span {
        font-size: 16px;
        font-weight: 500;
        color: rgba(255,255,255,0.4);
      }

      .jsn-plan-features {
        list-style: none;
        margin: 0 0 20px;
        padding: 0;
      }
      .jsn-plan-features li {
        font-family: 'Barlow', sans-serif;
        font-size: 13px;
        color: rgba(255,255,255,0.65);
        padding: 5px 0;
        padding-left: 18px;
        position: relative;
      }
      .jsn-plan-features li::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(0,212,200,0.6);
      }

      .jsn-plan-btn {
        display: block;
        text-align: center;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        color: #ffffff;
        text-decoration: none;
        border-radius: 8px;
        padding: 11px;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        transition: all 0.2s;
      }
      .jsn-plan-btn:hover {
        background: rgba(255,255,255,0.14);
        border-color: rgba(255,255,255,0.3);
      }

      .jsn-plan-btn-featured {
        background: #00d4c8;
        border-color: #00d4c8;
        color: #0b1120;
      }
      .jsn-plan-btn-featured:hover {
        background: #00bfb4;
        border-color: #00bfb4;
        color: #0b1120;
      }

      .jsn-upgrade-dismiss {
        background: none;
        border: none;
        color: rgba(255,255,255,0.3);
        font-family: 'Barlow', sans-serif;
        font-size: 13px;
        cursor: pointer;
        text-decoration: underline;
        padding: 8px;
      }
      .jsn-upgrade-dismiss:hover { color: rgba(255,255,255,0.55); }

      @media (max-width: 520px) {
        .jsn-upgrade-plans { flex-direction: column; }
        .jsn-upgrade-modal { padding: 32px 24px; }
        .jsn-upgrade-headline { font-size: 26px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // Expose
  // ============================================================
  global.JSNPaywall = {
    check,
    recordUse,
    showUpgrade,
  };
})(window);
