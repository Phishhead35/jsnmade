/**
 * JSN Real Estate Performance System — Shared Navigation
 * ========================================================
 * Load this script in every app with:
 *   <script src="/jsn-nav.js"></script>
 * Place the tag just before </body> in each HTML file.
 *
 * It will:
 *  1. Check for a valid Supabase session
 *  2. Redirect to /login.html if not logged in
 *  3. Inject the nav bar at the top of the page
 *  4. Show agent name, plan tier, and app links
 *  5. Handle sign out
 */

(async function() {
  const SUPABASE_URL     = 'https://vmuvgdtfsdydvpxvdgso.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_SCYigpiHN0HkmkAREaB8ZQ_9GgT14fl';
  const LOGIN_URL        = '/login.html';

  const APPS = [
    { name: 'Pipeline',   file: '/jsn-pipeline-analyzer-v101.html',   short: 'PL' },
    { name: 'Roleplay',   file: '/JSN-Real-Estate-Roleplay-Coach.html', short: 'RC' },
    { name: 'Messaging',  file: '/client-messaging.html',              short: 'CM' },
    { name: 'Marketing',  file: '/jsn-marketing-kit.html',             short: 'MK' },
    { name: 'Listing',    file: '/jsn-listing-studio.html',            short: 'LS' },
    { name: 'Deals',      file: '/JSN-Property-Deal-Analyzer.html',    short: 'DA' },
    { name: 'ROI',        file: '/JSN-Rental-ROI-Assistant.html',      short: 'RI' },
  ];

  const TIER_COLORS = {
    free:  { bg: 'rgba(122,143,168,0.15)', color: '#a8bdd0', label: 'Free'  },
    pro:   { bg: 'rgba(0,212,200,0.12)',   color: '#00d4c8', label: 'Pro'   },
    team:  { bg: 'rgba(255,107,43,0.12)',  color: '#ff8c55', label: 'Team'  },
  };

  // ── LOAD SUPABASE ───────────────────────────────────────────
  function loadSupabase() {
    return new Promise((resolve) => {
      if (window.supabase) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = resolve;
      document.head.appendChild(s);
    });
  }

  await loadSupabase();

  const { createClient } = window.supabase;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── AUTH CHECK ──────────────────────────────────────────────
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = LOGIN_URL;
    return;
  }

  // ── GET USER PROFILE ────────────────────────────────────────
  let profile = { full_name: '', plan_tier: 'free', role: 'agent' };
  try {
    const { data } = await sb.from('users')
      .select('full_name, plan_tier, role')
      .eq('id', session.user.id)
      .single();
    if (data) profile = data;
  } catch(e) {}

  const firstName   = (profile.full_name || session.user.email || '').split(' ')[0];
  const tier        = profile.plan_tier || 'free';
  const tierStyle   = TIER_COLORS[tier] || TIER_COLORS.free;
  const currentPath = window.location.pathname.split('/').pop();

  // ── INJECT STYLES ───────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #jsn-nav {
      position: sticky; top: 0; z-index: 9999;
      background: rgba(8,15,30,0.97);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(0,212,200,0.13);
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      user-select: none;
    }
    #jsn-nav-inner {
      display: flex; align-items: center;
      padding: 0 20px; height: 48px; gap: 12px;
      max-width: 100%;
    }
    #jsn-nav .nav-logo {
      display: flex; align-items: center; gap: 8px;
      text-decoration: none; flex-shrink: 0;
    }
    #jsn-nav .nav-logo-mark {
      width: 28px; height: 28px;
      background: linear-gradient(135deg, #ff6b2b, #ff8c55);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: 13px; color: white;
      flex-shrink: 0;
    }
    #jsn-nav .nav-logo-text {
      font-weight: 800; font-size: 15px;
      letter-spacing: 0.03em; color: #ffffff;
    }
    #jsn-nav .nav-divider {
      width: 1px; height: 20px;
      background: rgba(0,212,200,0.2); flex-shrink: 0;
    }
    #jsn-nav .nav-apps {
      display: flex; gap: 2px; flex: 1; overflow-x: auto;
      scrollbar-width: none;
    }
    #jsn-nav .nav-apps::-webkit-scrollbar { display: none; }
    #jsn-nav .nav-app {
      display: flex; align-items: center;
      padding: 5px 10px; border-radius: 6px;
      text-decoration: none;
      font-size: 12px; font-weight: 700;
      letter-spacing: 0.04em; text-transform: uppercase;
      color: #7a8fa8; white-space: nowrap;
      transition: all 0.18s;
      border: 1px solid transparent;
    }
    #jsn-nav .nav-app:hover {
      color: #ffffff;
      background: rgba(255,255,255,0.05);
    }
    #jsn-nav .nav-app.active {
      color: #00d4c8;
      background: rgba(0,212,200,0.08);
      border-color: rgba(0,212,200,0.2);
    }
    #jsn-nav .nav-right {
      display: flex; align-items: center;
      gap: 10px; flex-shrink: 0; margin-left: auto;
    }
    #jsn-nav .nav-user {
      font-size: 13px; font-weight: 600;
      color: #a8bdd0; letter-spacing: 0.02em;
    }
    #jsn-nav .nav-tier {
      font-size: 10px; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase;
      padding: 3px 8px; border-radius: 4px;
    }
    #jsn-nav .nav-signout {
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.06em; text-transform: uppercase;
      color: #7a8fa8; background: none;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 5px; padding: 4px 10px;
      cursor: pointer; transition: all 0.18s;
      font-family: inherit;
    }
    #jsn-nav .nav-signout:hover {
      border-color: #ff3d52; color: #ff3d52;
    }
    #jsn-nav .nav-ham {
      display: none; flex-direction: column; gap: 4px;
      background: none; border: none; cursor: pointer; padding: 4px;
    }
    #jsn-nav .nav-ham span {
      display: block; width: 18px; height: 2px;
      background: #7a8fa8; border-radius: 2px;
    }
    @media (max-width: 768px) {
      #jsn-nav .nav-apps { display: none; }
      #jsn-nav .nav-apps.open {
        display: flex; flex-direction: column;
        position: fixed; top: 48px; left: 0; right: 0;
        background: rgba(8,15,30,0.98);
        border-bottom: 1px solid rgba(0,212,200,0.13);
        padding: 10px 16px; gap: 4px; z-index: 9998;
      }
      #jsn-nav .nav-ham { display: flex; }
      #jsn-nav .nav-logo-text { display: none; }
    }
  `;
  document.head.appendChild(style);

  // ── BUILD NAV HTML ──────────────────────────────────────────
  const nav = document.createElement('nav');
  nav.id = 'jsn-nav';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'JSN REPS suite navigation');

  const appLinks = APPS.map(app => {
    const isActive = currentPath === app.file.replace('/', '');
    return `<a class="nav-app${isActive ? ' active' : ''}"
      href="${app.file}"
      aria-current="${isActive ? 'page' : 'false'}"
      title="${app.name}">${app.name}</a>`;
  }).join('');

  nav.innerHTML = `
    <div id="jsn-nav-inner">
      <a class="nav-logo" href="/jsn-pipeline-analyzer-v101.html" aria-label="JSN REPS home">
        <div class="nav-logo-mark" aria-hidden="true">JSN</div>
        <span class="nav-logo-text">REPS</span>
      </a>
      <div class="nav-divider" aria-hidden="true"></div>
      <div class="nav-apps" id="navApps" role="list">
        ${appLinks}
      </div>
      <div class="nav-right">
        <span class="nav-user" aria-label="Signed in as ${firstName}">${firstName}</span>
        <span class="nav-tier" style="background:${tierStyle.bg};color:${tierStyle.color}"
          aria-label="Plan: ${tierStyle.label}">${tierStyle.label}</span>
        <button class="nav-signout" onclick="jsnSignOut()" aria-label="Sign out">Out</button>
        <button class="nav-ham" id="navHam" onclick="jsnToggleNav()"
          aria-label="Toggle app menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  `;

  // Insert nav as very first element in body
  document.body.insertBefore(nav, document.body.firstChild);

  // ── MOBILE TOGGLE ───────────────────────────────────────────
  window.jsnToggleNav = function() {
    const apps = document.getElementById('navApps');
    const ham  = document.getElementById('navHam');
    const open = apps.classList.toggle('open');
    ham.setAttribute('aria-expanded', String(open));
  };

  // Close mobile menu on link click
  document.querySelectorAll('.nav-app').forEach(a => {
    a.addEventListener('click', () => {
      document.getElementById('navApps').classList.remove('open');
    });
  });

  // ── SIGN OUT ────────────────────────────────────────────────
  window.jsnSignOut = async function() {
    await sb.auth.signOut();
    window.location.href = LOGIN_URL;
  };

  // ── UPDATE last_seen_at ─────────────────────────────────────
  try {
    await sb.from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', session.user.id);
  } catch(e) {}

})();
