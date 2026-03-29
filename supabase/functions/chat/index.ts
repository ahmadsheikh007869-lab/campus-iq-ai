import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the official AI assistant for Integral University, Lucknow, Uttar Pradesh, India.

Key facts about Integral University:
- Established: 2004 under UGC Act
- Location: Kursi Road, Lucknow, UP - 226026
- Recognition: UGC, AICTE, BCI, NCTE approved
- Campus: 100+ acres with modern infrastructure
- Students: 15,000+ currently enrolled
- Alumni: 50,000+
- Programs: 100+ across Engineering, Medicine, Management, Law, Sciences, Humanities, Pharmacy, Architecture, etc.

Facilities: Hostels (boys & girls), state-of-the-art labs, sports complex, central library (100,000+ books), cafeteria, medical center, Wi-Fi campus, auditorium.

Library: Open Mon-Fri 8AM-10PM, Sat-Sun 9AM-5PM. Digital resources available 24/7. Subscriptions to IEEE, Springer, Elsevier, JSTOR.

Admissions: Online application through university portal. Entrance test or merit-based depending on program. Application fee payable online.

Contact: info@iul.ac.in, +91-522-2890812

You should:
- Answer questions about courses, fees, admissions, campus, facilities, library
- Be helpful, friendly, and concise
- If you don't know specific details, suggest contacting the admissions office
- Use markdown formatting for better readability
- Keep responses focused and relevant to the university`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
