const ALLOWED_ORIGINS = [
  'https://jsnmade.com',
  'https://www.jsnmade.com',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

const ANTHROPIC_URL     = 'https://api.anthropic.com/v1/messages';
const RESEND_URL        = 'https://api.resend.com/emails';
const FROM_EMAIL        = 'hello@jsnmade.com';
const NOTIFY_EMAIL      = 'jsnmade@pm.me';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL             = 'claude-sonnet-4-6';

const RATE_LIMIT_MAX    = 20;
const RATE_LIMIT_WINDOW = 3600;
const MAX_INPUT_CHARS   = 10000;

const APP_CONFIG = {
  'pipeline':  { max_tokens: 3500 },
  'messaging': { max_tokens: 1000 },
  'marketing': { max_tokens: 4000 },
  'listing':   { max_tokens: 1000 },
  'deal':      { max_tokens: 3000 },
  'roi':       { max_tokens: 2000 },
  'roleplay':  { max_tokens: 1500 },
};

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, origin);
    }

    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405, origin);
    }


    const url = new URL(request.url);

    // ── EMAIL ENDPOINT ──
    if (url.pathname === '/email') {
      if (!env.RESEND_API_KEY) {
        return corsResponse(JSON.stringify({ error: 'Email service not configured.' }), 500, origin);
      }
      let emailBody;
      try { emailBody = await request.json(); } catch {
        return corsResponse(JSON.stringify({ error: 'Invalid JSON.' }), 400, origin);
      }

      const { type, email, name } = emailBody;

      if (!email || !email.includes('@')) {
        return corsResponse(JSON.stringify({ error: 'Valid email required.' }), 400, origin);
      }

      if (type === 'early_access') {
        // Notify Joe
        await sendEmail(env, {
          to: 'jsnmade@pm.me',
          subject: 'New early access request — ' + email,
          html: '<p>New early access signup on jsnmade.com:</p><p><strong>' + email + '</strong>' + (name ? ' (' + name + ')' : '') + '</p>',
        });
        // Confirm to user
        const subject = "You're on the list — JSN Made";
        const html = `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b1120;color:#ffffff;border-radius:12px;">
            <div style="font-size:22px;font-weight:900;letter-spacing:0.04em;margin-bottom:8px;">JSN <span style="color:#00d4c8;">Made</span></div>
            <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:16px 0;">
            <p style="font-size:16px;margin-bottom:12px;">You're on the list.</p>
            <p style="font-size:14px;color:rgba(255,255,255,0.7);line-height:1.7;">We'll reach out directly when early access opens. No pitch decks, no spam.</p>
            <p style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:24px;">— Joe @ JSN Made</p>
          </div>`;
        const result = await sendEmail(env, { to: email, subject, html });
        if (!result.ok) {
          return corsResponse(JSON.stringify({ error: 'Email send failed.' }), 502, origin);
        }
        return corsResponse(JSON.stringify({ success: true }), 200, origin);
      }

      return corsResponse(JSON.stringify({ error: 'Unknown email type.' }), 400, origin);
    }

    if (env.RATE_LIMIT_KV) {
      const limited = await isRateLimited(request, env);
      if (limited) {
        return corsResponse(
          JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }),
          429, origin
        );
      }
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON in request body.' }), 400, origin);
    }

    const app = body.app || 'pipeline';
    const config = APP_CONFIG[app] || { max_tokens: 2000 };

    const validationError = validateBody(body, config);
    if (validationError) {
      return corsResponse(JSON.stringify({ error: validationError }), 400, origin);
    }

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY && body.user_id) {
      ctx.waitUntil(logSession(env, {
        user_id:      body.user_id,
        brokerage_id: body.brokerage_id || null,
        app:          app,
        mode:         body.mode || null,
        input:        body.messages?.[0]?.content?.slice(0, 1000) || null,
        tokens_used:  null,
      }));
    }

    const safePayload = {
      model:      MODEL,
      max_tokens: config.max_tokens,
      stream:     body.stream !== false,
      system:     body.system,
      messages:   body.messages,
    };

    let anthropicResponse;
    try {
      anthropicResponse = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'anthropic-version': ANTHROPIC_VERSION,
          'x-api-key':         env.ANTHROPIC_API_KEY,
        },
        body: JSON.stringify(safePayload),
      });
    } catch (err) {
      return corsResponse(
        JSON.stringify({ error: 'Failed to reach Anthropic API. Try again.' }),
        502, origin
      );
    }

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      return corsResponse(errText, anthropicResponse.status, origin);
    }

    if (safePayload.stream) {
      return new Response(anthropicResponse.body, {
        status: 200,
        headers: {
          'Content-Type':                 'text/event-stream',
          'Cache-Control':                'no-cache',
          'Access-Control-Allow-Origin':  getAllowedOrigin(origin),
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-tool-id',
        },
      });
    }

    const data = await anthropicResponse.json();
    return corsResponse(JSON.stringify(data), 200, origin);
  }
};

async function isRateLimited(request, env) {
  const ip  = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rl:${ip}`;
  try {
    const raw   = await env.RATE_LIMIT_KV.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= RATE_LIMIT_MAX) return true;
    await env.RATE_LIMIT_KV.put(key, String(count + 1), {
      expirationTtl: RATE_LIMIT_WINDOW,
    });
    return false;
  } catch {
    return false;
  }
}

async function logSession(env, data) {
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(data),
    });
  } catch(e) {
    console.error('Session log failed:', e.message);
  }
}

function validateBody(body, config) {
  if (!body.system || typeof body.system !== 'string') {
    return 'Missing or invalid system prompt.';
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return 'Missing or empty messages array.';
  }
  const userMsg = body.messages.find(m => m.role === 'user');
  if (!userMsg || typeof userMsg.content !== 'string') {
    return 'Missing user message content.';
  }
  if (userMsg.content.length > MAX_INPUT_CHARS) {
    return `Input too long. Maximum ${MAX_INPUT_CHARS.toLocaleString()} characters allowed.`;
  }
  const allowedRoles = new Set(['user', 'assistant']);
  for (const msg of body.messages) {
    if (!allowedRoles.has(msg.role)) {
      return `Invalid message role: ${msg.role}`;
    }
  }
  return null;
}

function getAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

function corsResponse(body, status, origin) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type':                 'application/json',
      'Access-Control-Allow-Origin':  getAllowedOrigin(origin),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-tool-id',
    },
  });
}

async function sendEmail(env, { to, subject, html }) {
  return await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'hello@jsnmade.com',
      to,
      subject,
      html,
    }),
  });
}
