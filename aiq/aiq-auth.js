/**
 * AIQ Auth — Shared Supabase Singleton
 *
 * Replaces the inline createClient() calls that previously lived at the top
 * of each AIQ training track page. All four tracks load this file once and
 * share a single GoTrueClient instance, eliminating session race conditions
 * and redundant auth-state listeners.
 *
 * Usage (in track pages):
 *   const sb = AIQAuth.getClient();        // Supabase client
 *   const session = AIQAuth.getSession();  // Current session (may be null on first tick)
 *   await AIQAuth.signOut();               // Sign out and clear session
 */

(function () {
  if (window.AIQAuth) return; // Already initialized — don't create a second instance

  const SUPABASE_URL      = 'https://vmuvgdtfsdydvpxvdgso.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_SCYigpiHN0HkmkAREaB8ZQ_9GgT14fl';

  let _client  = null;
  let _session = null;

  function _init() {
    if (_client) return _client;
    const { createClient } = window.supabase;
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Keep _session in sync with auth state changes
    _client.auth.onAuthStateChange((_event, session) => {
      _session = session;
    });

    // Seed the initial session value
    _client.auth.getSession().then(({ data }) => {
      _session = data.session;
    });

    return _client;
  }

  window.AIQAuth = {
    /** Returns the shared Supabase client, creating it on first call. */
    getClient: function () {
      return _init();
    },
    /** Returns the most recently cached session object (null if not signed in). */
    getSession: function () {
      return _session;
    },
    /** Signs the user out and clears the cached session. */
    signOut: async function () {
      if (_client) await _client.auth.signOut();
      _session = null;
    }
  };
})();
