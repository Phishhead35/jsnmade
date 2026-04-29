/**
 * JSN Made — Constant Contact Lead Capture Worker
 * 
 * Deploy this as a Cloudflare Worker in your jsnmade repo.
 * Set these environment variables in your Cloudflare dashboard:
 *   CC_ACCESS_TOKEN  — your Constant Contact OAuth access token
 *   CC_LIST_ID       — your "AI Tool Leads" list ID
 */

export default {
  async fetch(request, env) {

    // Allow CORS from your domain (and localhost for testing)
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

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    // Parse incoming body from the training page
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { firstName, lastName, email, score, level, track, domainScores } = body;

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Build the Constant Contact contact payload
    // Custom fields store the score data for segmentation
    const ccPayload = {
      email_address: {
        address: email,
        permission_to_send: "explicit"
      },
      first_name: firstName || "",
      last_name: lastName || "",
      list_memberships: [env.CC_LIST_ID],
      custom_fields: [
        {
          custom_field_id: "ai_score",
          value: String(score ?? "")
        },
        {
          custom_field_id: "ai_level",
          value: level ?? ""
        },
        {
          custom_field_id: "ai_track",
          value: track ?? ""
        },
        {
          custom_field_id: "ai_domain_scores",
          value: domainScores
            ? `Data:${domainScores.data ?? "?"} Strategy:${domainScores.strategy ?? "?"} Talent:${domainScores.talent ?? "?"} Current:${domainScores.current ?? "?"} Gov:${domainScores.governance ?? "?"}`
            : ""
        }
      ]
    };

    // POST to Constant Contact v3 API
    try {
      const ccResponse = await fetch(
        "https://api.cc.email/v3/contacts",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.CC_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(ccPayload)
        }
      );

      const ccData = await ccResponse.json().catch(() => ({}));

      // 200 = created, 409 = already exists (update instead)
      if (ccResponse.ok || ccResponse.status === 409) {

        // If contact already exists, update their list membership
        if (ccResponse.status === 409) {
          const updatePayload = {
            list_memberships: [env.CC_LIST_ID]
          };
          // PATCH the existing contact
          if (ccData.contact_id) {
            await fetch(
              `https://api.cc.email/v3/contacts/${ccData.contact_id}`,
              {
                method: "PUT",
                headers: {
                  "Authorization": `Bearer ${env.CC_ACCESS_TOKEN}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ ...ccPayload, ...updatePayload })
              }
            );
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Log error details for debugging
      console.error("CC API error:", ccResponse.status, JSON.stringify(ccData));
      return new Response(JSON.stringify({ error: "Constant Contact error", detail: ccData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      console.error("Worker fetch error:", err);
      return new Response(JSON.stringify({ error: "Worker error", detail: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
