/**
 * JSN AIQ -- Email Results Worker
 * Deploy as: jsn-aiq-coach.wewearsmiles.workers.dev
 *
 * Route:
 *   POST /send-aiq-results
 *
 * Environment variables (set in Cloudflare dashboard):
 *   RESEND_API_KEY  -- Resend API key (Secret)
 *   CC_API_KEY      -- Constant Contact API key (plain string, no OAuth needed)
 *
 * Behavior:
 *   1. Validates input
 *   2. Sends formatted results email via Resend
 *   3. Adds email to Constant Contact AIQ list (fails silently if error)
 *   4. Returns { success: true } or { success: false, error: "..." }
 */

const CC_LIST_ID = "2528c85a-4372-11f1-9166-02420a320003";

const ALLOWED_ORIGINS = [
  "https://jsnmade.com",
  "https://www.jsnmade.com",
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);

    // ── POST /send-aiq-results ─────────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/send-aiq-results") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ success: false, error: "Invalid JSON" }, 400, origin);
      }

      const { email, overallScore, maturityLevel, domainScores } = body;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ success: false, error: "Invalid email address" }, 400, origin);
      }

      // 1. Send email via Resend (blocking -- must succeed)
      const emailResult = await sendResendEmail(env.RESEND_API_KEY, {
        email,
        overallScore: overallScore ?? 0,
        maturityLevel: maturityLevel || "Unknown",
        domainScores: domainScores || {},
      });

      if (!emailResult.success) {
        return json({ success: false, error: emailResult.error }, 500, origin);
      }

      // 2. Add to Constant Contact (non-blocking, silent fail)
      addToConstantContact(env.CC_API_KEY, email).catch((err) => {
        console.warn("Constant Contact write failed silently:", err.message || err);
      });

      return json({ success: true }, 200, origin);
    }

    return json({ success: false, error: "Not found" }, 404, origin);
  },
};

// ── Resend ─────────────────────────────────────────────────────────────────

async function sendResendEmail(apiKey, { email, overallScore, maturityLevel, domainScores }) {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const domainEntries = Object.entries(domainScores);

  const textBody = buildTextBody(date, overallScore, maturityLevel, domainEntries);
  const htmlBody = buildHtmlBody(date, overallScore, maturityLevel, domainEntries);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "JSNMade <noreply@jsnmade.com>",
        to: [email],
        subject: "Your JSN AIQ Results",
        text: textBody,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend API error:", errText);
      return { success: false, error: "Email delivery failed" };
    }

    return { success: true };
  } catch (err) {
    console.error("Resend fetch error:", err);
    return { success: false, error: "Network error sending email" };
  }
}

function buildTextBody(date, overallScore, maturityLevel, domainEntries) {
  const domainLines = domainEntries.map(([name, score]) => `  - ${name}: ${score}`).join("\n");
  return [
    "Your AI Readiness Results",
    date,
    "",
    `Overall Score: ${overallScore}/100`,
    `Maturity Level: ${maturityLevel}`,
    "",
    "Domain Scores:",
    domainLines,
    "",
    "Ready to build on this?",
    "Start with Track 1 -- free: jsnmade.com/aiq",
    "",
    "Questions? Reply to this email or reach us at JSNMade@pm.me",
  ].join("\n");
}

function buildHtmlBody(date, overallScore, maturityLevel, domainEntries) {
  const domainRowsHtml = domainEntries
    .map(
      ([name, score]) =>
        `<tr>
          <td style="padding:7px 0;color:#ffffff;font-family:'IBM Plex Mono',monospace,sans-serif;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.06)">${name}</td>
          <td style="padding:7px 0 7px 20px;color:#00d4c8;font-family:'IBM Plex Mono',monospace,sans-serif;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid rgba(255,255,255,0.06)">${score}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Your JSN AIQ Results</title>
</head>
<body style="margin:0;padding:0;background:#0b1120;font-family:'IBM Plex Mono',monospace,sans-serif;-webkit-font-smoothing:antialiased">
  <div style="max-width:560px;margin:0 auto;padding:48px 28px">

    <!-- Header -->
    <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#00d4c8;margin-bottom:32px">
      JSN Made // AIQ Assessment
    </div>

    <!-- Title -->
    <h1 style="font-size:26px;font-weight:400;color:#ffffff;margin:0 0 6px 0;line-height:1.25;font-family:Georgia,serif">
      Your AI Readiness Results
    </h1>
    <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:40px">${date}</div>

    <!-- Score card -->
    <div style="background:#121c2f;border:1px solid rgba(29,198,194,0.2);padding:28px;margin-bottom:24px">
      <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:12px">
        Overall Score
      </div>
      <div style="font-size:52px;font-weight:400;color:#00d4c8;line-height:1;margin-bottom:8px">
        ${overallScore}<span style="font-size:16px;color:rgba(255,255,255,0.35)">/100</span>
      </div>
      <div style="font-size:12px;color:#ffffff;letter-spacing:0.14em;text-transform:uppercase">
        ${maturityLevel}
      </div>
    </div>

    <!-- Domain scores -->
    <div style="background:#121c2f;border:1px solid rgba(29,198,194,0.1);padding:24px;margin-bottom:36px">
      <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:18px">
        Domain Scores
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${domainRowsHtml}
      </table>
    </div>

    <!-- CTA -->
    <a href="https://jsnmade.com/aiq"
       style="display:inline-block;background:#ff6b2b;color:#ffffff;padding:14px 28px;
              font-family:'IBM Plex Mono',monospace,sans-serif;font-size:11px;font-weight:700;
              letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;margin-bottom:36px">
      Start Track 1 -- Free
    </a>

    <!-- Footer -->
    <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;font-size:11px;color:rgba(255,255,255,0.35);line-height:1.8">
      Questions? Reply to this email or reach us at
      <a href="mailto:JSNMade@pm.me" style="color:#00d4c8;text-decoration:none">JSNMade@pm.me</a>
    </div>

  </div>
</body>
</html>`;
}

// ── Constant Contact ───────────────────────────────────────────────────────

async function addToConstantContact(apiKey, email) {
  // Uses the sign_up_form endpoint -- no OAuth, static API key only.
  // Upserts the contact and adds them to the AIQ list.
  const res = await fetch("https://api.cc.email/v3/contacts/sign_up_form", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: email,
      list_memberships: [CC_LIST_ID],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`CC API ${res.status}: ${errText}`);
  }

  return { success: true };
}
