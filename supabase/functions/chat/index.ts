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

// Extract meaningful search terms from query
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

// Build OR filter for ilike matching across given columns
function buildOrFilter(terms: string[], columns: string[]): string {
  const parts: string[] = [];
  for (const t of terms) {
    for (const col of columns) {
      parts.push(`${col}.ilike.%${t}%`);
    }
  }
  return parts.join(",");
}

// Fetch all relevant context from the database
async function fetchContext(supabase: any, terms: string[]): Promise<string> {
  if (terms.length === 0) return "";

  const sections: string[] = [];

  // 1. Documents (PDF knowledge base) — primary source
  try {
    const { data: docs } = await supabase
      .from("documents")
      .select("title, content, category")
      .or(buildOrFilter(terms, ["content", "title", "category"]))
      .limit(8);

    if (docs?.length) {
      sections.push(
        "--- UNIVERSITY KNOWLEDGE BASE ---\n" +
          docs.map((d: any) => `[${d.title}] (${d.category}): ${d.content}`).join("\n\n")
      );
    }
  } catch (e) {
    console.error("Documents search error:", e);
  }

  // 2. Courses — structured data
  try {
    const { data: courses } = await supabase
      .from("courses")
      .select("name, department, duration, annual_fee, total_fee, description")
      .or(buildOrFilter(terms, ["name", "department", "description"]))
      .limit(15);

    if (courses?.length) {
      sections.push(
        "--- COURSE DATA ---\n" +
          courses
            .map(
              (c: any) =>
                `${c.name} | Dept: ${c.department} | Duration: ${c.duration} yrs | Annual Fee: ₹${c.annual_fee} | Total Fee: ₹${c.total_fee}${c.description ? " | " + c.description : ""}`
            )
            .join("\n")
      );
    }
  } catch (e) {
    console.error("Courses search error:", e);
  }

  // 3. FAQs
  try {
    const { data: faqs } = await supabase
      .from("faqs")
      .select("question, answer, category")
      .or(buildOrFilter(terms, ["question", "answer"]))
      .limit(8);

    if (faqs?.length) {
      sections.push(
        "--- FAQ DATA ---\n" +
          faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
      );
    }
  } catch (e) {
    console.error("FAQs search error:", e);
  }

  // 4. University Info sections
  try {
    const { data: info } = await supabase
      .from("university_info")
      .select("title, content, section")
      .or(buildOrFilter(terms, ["title", "content", "section"]))
      .limit(5);

    if (info?.length) {
      sections.push(
        "--- UNIVERSITY INFO ---\n" +
          info.map((i: any) => `[${i.section} - ${i.title}]: ${i.content}`).join("\n\n")
      );
    }
  } catch (e) {
    console.error("University info search error:", e);
  }

  return sections.length > 0 ? "\n\n" + sections.join("\n\n") : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // Get last user message for context search
    const lastUserMsg =
      [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    // Search all data sources for relevant context
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

    // Build Gemini conversation
    const geminiMessages = [
      { role: "user", parts: [{ text: systemWithContext }] },
      {
        role: "model",
        parts: [
          {
            text: "Understood. I am the Integral University AI assistant. I will answer questions using the provided context and my knowledge about the university.",
          },
        ],
      },
    ];

    for (const msg of messages) {
      geminiMessages.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform Gemini SSE → OpenAI-compatible SSE
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let idx;
            while ((idx = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ") || line.trim() === "") continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const text =
                  parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (text) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`
                    )
                  );
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } catch (e) {
          console.error("Stream error:", e);
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
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
