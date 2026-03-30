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
- If context contains relevant information, use it as your PRIMARY source
- Be helpful, friendly, professional and concise
- Use markdown formatting for better readability
- If you don't know specific details, suggest contacting the admissions office at info@iul.ac.in or call +91 93351 77775
- Never mention how you were built or any development platform
- You represent Integral University officially

Key facts:
- NAAC A+ Accredited
- UGC approved under Sections 2(f) and 12B
- Location: Kursi Road, Lucknow, UP - 226026
- 225+ Faculty, 15000+ Students, 41000+ Alumni
- 100+ acre campus with modern infrastructure
- Website: www.iul.ac.in
- Admissions: admission.iul.ac.in
- Contact: +91 93351 77775, info@iul.ac.in`;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // Get last user message for document search
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    // Search documents for relevant context
    let documentContext = "";
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Search documents using text matching
      const searchTerms = lastUserMsg
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 8);

      if (searchTerms.length > 0) {
        // Search documents
        const orFilter = searchTerms
          .map((t: string) => `content.ilike.%${t}%,title.ilike.%${t}%`)
          .join(",");
        const { data: docs } = await supabase
          .from("documents")
          .select("title, content")
          .or(orFilter)
          .limit(5);

        if (docs && docs.length > 0) {
          documentContext =
            "\n\n--- UNIVERSITY KNOWLEDGE BASE ---\n" +
            docs.map((d: any) => `[${d.title}]: ${d.content}`).join("\n\n");
        }

        // Also search courses
        const { data: courses } = await supabase
          .from("courses")
          .select("name, department, duration, annual_fee, total_fee, description")
          .or(
            searchTerms
              .map((t: string) => `name.ilike.%${t}%,department.ilike.%${t}%`)
              .join(",")
          )
          .limit(10);

        if (courses && courses.length > 0) {
          documentContext +=
            "\n\n--- COURSE DATA ---\n" +
            courses
              .map(
                (c: any) =>
                  `${c.name} (${c.department}): ${c.duration} years, Annual Fee: ₹${c.annual_fee}, Total Fee: ₹${c.total_fee}${c.description ? ". " + c.description : ""}`
              )
              .join("\n");
        }

        // Search FAQs
        const { data: faqs } = await supabase
          .from("faqs")
          .select("question, answer")
          .or(
            searchTerms
              .map(
                (t: string) =>
                  `question.ilike.%${t}%,answer.ilike.%${t}%`
              )
              .join(",")
          )
          .limit(5);

        if (faqs && faqs.length > 0) {
          documentContext +=
            "\n\n--- FAQ DATA ---\n" +
            faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
        }
      }
    } catch (e) {
      console.error("Document search error:", e);
    }

    const systemWithContext = documentContext
      ? SYSTEM_PROMPT +
        "\n\nUse the following context to answer the user's question. Prioritize this information over general knowledge:" +
        documentContext
      : SYSTEM_PROMPT;

    // Call Gemini API directly
    const geminiMessages = [
      { role: "user", parts: [{ text: systemWithContext }] },
      { role: "model", parts: [{ text: "Understood. I am the Integral University AI assistant. I will answer questions using the provided context and my knowledge about the university." }] },
    ];

    for (const msg of messages) {
      geminiMessages.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
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

    // Transform Gemini SSE to OpenAI-compatible SSE format
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

            let newlineIdx;
            while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, newlineIdx);
              buffer = buffer.slice(newlineIdx + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ") || line.trim() === "") continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const text =
                  parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (text) {
                  const chunk = JSON.stringify({
                    choices: [{ delta: { content: text } }],
                  });
                  controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                }
              } catch {
                // skip malformed
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
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
