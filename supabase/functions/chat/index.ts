import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the official AI assistant for Integral University, Lucknow, Uttar Pradesh, India.
You are an expert on everything related to Integral University. You answer questions about courses, fees, admissions, campus life, facilities, library, research, placements, events, and more.

IMPORTANT RULES:
- Answer ONLY based on the provided context when available
- If context contains relevant information, use it as your PRIMARY source — do not contradict it
- Be helpful, friendly, professional and concise
- Use markdown formatting for better readability (bold, bullet points, tables for fee data)
- When listing courses or fees, format as a clear table
- If you don't know specific details, suggest contacting the admissions office at info@iul.ac.in or call +91 93351 77775
- Never mention how you were built or any development platform
- You represent Integral University officially
- For greetings, respond warmly and suggest what the user can ask about

Key facts:
- NAAC A+ Accredited
- UGC approved under Sections 2(f) and 12B
- Location: Kursi Road, Lucknow, UP - 226026
- 225+ Faculty, 15000+ Students, 41000+ Alumni
- 100+ acre campus with modern infrastructure
- Website: www.iul.ac.in
- Admissions: admission.iul.ac.in
- Contact: +91 93351 77775, info@iul.ac.in`;

function extractSearchTerms(query: string): string[] {
  const stopWords = new Set([
    "what", "which", "where", "when", "how", "does", "about", "tell",
    "please", "could", "would", "should", "there", "their", "they",
    "this", "that", "have", "with", "from", "your", "will", "been",
    "more", "some", "than", "them", "into", "also", "just", "very",
    "much", "many", "most", "each", "both", "such", "like", "know",
    "want", "need", "give", "show", "find", "information", "details",
  ]);
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 12);
}

function buildOrFilter(terms: string[], columns: string[]): string {
  const parts: string[] = [];
  for (const t of terms) {
    for (const col of columns) {
      parts.push(`${col}.ilike.%${t}%`);
    }
  }
  return parts.join(",");
}

async function fetchContext(supabase: any, terms: string[]): Promise<string> {
  if (terms.length === 0) return "";
  const sections: string[] = [];

  try {
    const { data: docs } = await supabase
      .from("documents")
      .select("title, content, category")
      .or(buildOrFilter(terms, ["content", "title", "category"]))
      .limit(8);
    if (docs?.length) {
      sections.push("--- UNIVERSITY KNOWLEDGE BASE ---\n" +
        docs.map((d: any) => `[${d.title}] (${d.category}): ${d.content}`).join("\n\n"));
    }
  } catch (e) { console.error("Documents search error:", e); }

  try {
    const { data: courses } = await supabase
      .from("courses")
      .select("name, department, duration, annual_fee, total_fee, description")
      .or(buildOrFilter(terms, ["name", "department", "description"]))
      .limit(15);
    if (courses?.length) {
      sections.push("--- COURSE DATA ---\n" +
        courses.map((c: any) =>
          `${c.name} | Dept: ${c.department} | Duration: ${c.duration} yrs | Annual Fee: ₹${c.annual_fee} | Total Fee: ₹${c.total_fee}${c.description ? " | " + c.description : ""}`
        ).join("\n"));
    }
  } catch (e) { console.error("Courses search error:", e); }

  try {
    const { data: faqs } = await supabase
      .from("faqs")
      .select("question, answer, category")
      .or(buildOrFilter(terms, ["question", "answer"]))
      .limit(8);
    if (faqs?.length) {
      sections.push("--- FAQ DATA ---\n" +
        faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"));
    }
  } catch (e) { console.error("FAQs search error:", e); }

  try {
    const { data: info } = await supabase
      .from("university_info")
      .select("title, content, section")
      .or(buildOrFilter(terms, ["title", "content", "section"]))
      .limit(5);
    if (info?.length) {
      sections.push("--- UNIVERSITY INFO ---\n" +
        info.map((i: any) => `[${i.section} - ${i.title}]: ${i.content}`).join("\n\n"));
    }
  } catch (e) { console.error("University info search error:", e); }

  return sections.length > 0 ? "\n\n" + sections.join("\n\n") : "";
}

// Try OpenAI API with retry
async function tryOpenAI(apiKey: string, messages: any[]): Promise<Response | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 1000));
    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          stream: true,
          temperature: 0.6,
          max_tokens: 4096,
        }),
      });
      if (resp.ok) return resp;
      const errText = await resp.text();
      console.error(`OpenAI attempt ${attempt + 1} failed: ${resp.status}`, errText);
      // Don't retry on quota/auth errors
      if (resp.status === 401 || resp.status === 403 || errText.includes("insufficient_quota")) {
        return null;
      }
    } catch (e) {
      console.error(`OpenAI attempt ${attempt + 1} network error:`, e);
    }
  }
  return null;
}

// Fallback to Lovable AI Gateway
async function tryLovableAI(apiKey: string, messages: any[]): Promise<Response | null> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });
    if (resp.ok) return resp;
    const errText = await resp.text();
    console.error("Lovable AI fallback failed:", resp.status, errText);
    if (resp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (resp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI service needs credits. Please contact the administrator." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return null;
  } catch (e) {
    console.error("Lovable AI network error:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();

    const lastUserMsg =
      [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    // Fetch context from database
    let documentContext = "";
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const terms = extractSearchTerms(lastUserMsg);
      documentContext = await fetchContext(supabase, terms);
    } catch (e) {
      console.error("Context fetch error:", e);
    }

    const systemWithContext = documentContext
      ? SYSTEM_PROMPT +
        "\n\nUse the following context to answer the user's question. Prioritize this information over general knowledge:" +
        documentContext
      : SYSTEM_PROMPT;

    const aiMessages = [
      { role: "system", content: systemWithContext },
      ...messages,
    ];

    // Strategy: Try OpenAI first, fallback to Lovable AI Gateway
    let streamResponse: Response | null = null;
    let provider = "none";

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (OPENAI_API_KEY) {
      console.log("Trying OpenAI...");
      streamResponse = await tryOpenAI(OPENAI_API_KEY, aiMessages);
      if (streamResponse) provider = "openai";
    }

    if (!streamResponse) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        console.log("Falling back to AI gateway...");
        streamResponse = await tryLovableAI(LOVABLE_API_KEY, aiMessages);
        if (streamResponse) {
          // Check if it's an error response we constructed
          if (streamResponse.headers.get("Content-Type")?.includes("application/json")) {
            return streamResponse; // Return error as-is
          }
          provider = "gateway";
        }
      }
    }

    if (!streamResponse) {
      return new Response(
        JSON.stringify({ error: "AI service is temporarily unavailable. Please try again later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Streaming response from: ${provider}`);

    // Both OpenAI and Lovable AI Gateway return OpenAI-compatible SSE
    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
