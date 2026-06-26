/**
 * toast.js  —  shared toast notification helper for JSNMade
 *
 * Replaces 4 inline toast implementations across REPS tools.
 * Drop one <script src="/toast.js"></script> per page; remove the inline function.
 *
 * API:
 *   toast(msg)          neutral grey notification
 *   toast(msg, 'ok')    success  — cyan border + text
 *   toast(msg, 'err')   error    — orange border + text
 *
 * window.showToast is aliased to toast for backward compatibility
 * with JSN-Rental-ROI-Assistant.html (its callers are renamed in the patch).
 */
(function () {
  let _timer = null;
  let _el    = null;

  function toast(msg, type = '') {
    // Cancel any existing toast before showing the new one
    if (_el) { _el.remove(); _el = null; }
    clearTimeout(_timer);

    const t = document.createElement('div');
    t.textContent = msg;

    // Base styles — uses JSNMade design tokens with hard-coded fallbacks
    // so this works on every page regardless of which CSS vars are defined.
    Object.assign(t.style, {
      position:     'fixed',
      bottom:       '22px',
      right:        '22px',
      background:   'var(--navy3, #192236)',
      border:       '1px solid var(--border, rgba(255,255,255,0.1))',
      color:        'var(--white, #ffffff)',
      padding:      '11px 18px',
      borderRadius: '8px',
      fontSize:     '12px',
      fontFamily:   "'DM Mono', monospace",
      boxShadow:    '0 4px 24px rgba(0,0,0,0.45)',
      zIndex:       '9999',
      opacity:      '1',
      transition:   'opacity 0.3s',
      lineHeight:   '1.4',
      userSelect:   'none',
      pointerEvents:'none',
    });

    // Type overrides
    if (type === 'ok') {
      t.style.borderColor = 'var(--cyan, #00d4c8)';
      t.style.color       = 'var(--cyan, #00d4c8)';
    } else if (type === 'err') {
      t.style.borderColor = 'var(--orange, #ff6b2b)';
      t.style.color       = 'var(--orange, #ff6b2b)';
    }

    document.body.appendChild(t);
    _el = t;

    _timer = setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => { if (t.parentNode) t.remove(); _el = null; }, 300);
    }, 3000);
  }

  // Export
  window.toast     = toast;
  window.showToast = toast; // alias — lets Rental ROI callers work unchanged
})();
