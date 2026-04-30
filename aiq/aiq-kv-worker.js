/**
 * JSN AIQ — KV Lead Storage Worker
 * 
 * Handles two routes:
 *   POST /submit — stores assessment results to KV (called from aiq-readiness.html)
 *   GET  /leads  — returns all leads for admin dashboard (requires password)
 * 
 * Environment variables to set in Cloudflare dashboard:
 *   AIQ_LEADS    — KV namespace binding (bind to your aiq_leads namespace)
 *   ADMIN_PASSWORD — your chosen admin password (set as a Secret)
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request, env) {

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    // ── POST /submit — store a completed assessment ──────────────────────
    if (request.method === "POST" && url.pathname === "/submit") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const { name, email, score, level, domainScores, industry, timestamp } = body;

      // Email is optional — assessment completes anonymously
      // Name and email are added later when user goes through training gate

      const key = `lead:${Date.now()}:${email.replace(/[^a-zA-Z0-9@._-]/g, "")}`;

      const record = {
        name: name || "Unknown",
        email,
        score: score ?? 0,
        level: level || "Unknown",
        industry: industry || "Not specified",
        domainScores: domainScores || {},
        timestamp: timestamp || new Date().toISOString(),
        submittedAt: new Date().toISOString()
      };

      try {
        await env.AIQ_LEADS.put(key, JSON.stringify(record));
        return json({ success: true }, 200);
      } catch (err) {
        console.error("KV write error:", err);
        return json({ error: "Storage error" }, 500);
      }
    }

    // ── GET /leads — retrieve all leads for admin ────────────────────────
    if (request.method === "GET" && url.pathname === "/leads") {
      const auth = request.headers.get("Authorization") || "";
      const password = auth.replace("Bearer ", "");

      if (password !== env.ADMIN_PASSWORD) {
        return json({ error: "Unauthorized" }, 401);
      }

      try {
        const list = await env.AIQ_LEADS.list({ prefix: "lead:" });
        const leads = [];

        for (const key of list.keys) {
          const value = await env.AIQ_LEADS.get(key.name);
          if (value) {
            try {
              leads.push(JSON.parse(value));
            } catch {
              // skip malformed records
            }
          }
        }

        // Sort by submittedAt descending (newest first)
        leads.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

        return json({ leads, total: leads.length }, 200);
      } catch (err) {
        console.error("KV read error:", err);
        return json({ error: "Read error" }, 500);
      }
    }

    return json({ error: "Not found" }, 404);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}
