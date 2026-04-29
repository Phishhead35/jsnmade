/**
 * JSN Made — Anthropic API Proxy Worker
 * Deploy as a Cloudflare Worker.
 * Set environment variable in Cloudflare dashboard:
 *   ANTHROPIC_API_KEY — your Anthropic API key (as a Secret)
 */

export default {
  async fetch(request, env) {

    const allowedOrigins = [
      "https://jsnmade.com",
      "https://jsnmade.pages.dev",
      "http://localhost",
      "http://127.0.0.1"
    ];

    const origin = request.headers.get("Origin") || "";
    const corsOrigin = allowedOrigins.some(o => origin.startsWith(o))
      ? origin
      : allowedOrigins[0];

    const corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: body.model || "claude-sonnet-4-20250514",
          max_tokens: body.max_tokens || 1000,
          system: body.system || "",
          messages: body.messages || []
        })
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Proxy error", detail: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
