import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/voices", async (req, res) => {
    const apiKey = req.headers["xi-api-key"];
    if (!apiKey) return res.status(401).json({ error: "Missing API key" });

    try {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": apiKey as string },
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch voices" });
    }
  });

  app.post("/api/generate-voice", async (req, res) => {
    const { text, voiceId, provider, settings } = req.body;
    const apiKey = req.headers["authorization"];

    if (!apiKey) return res.status(401).json({ error: "Missing API key" });

    try {
      if (provider === "elevenlabs") {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey as string,
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: settings.stability,
              similarity_boost: settings.similarity_boost,
            },
          }),
        });

        if (!response.ok) throw new Error("ElevenLabs API failed");
        
        const buffer = await response.arrayBuffer();
        res.set("Content-Type", "audio/mpeg");
        res.send(Buffer.from(buffer));
      } else if (provider === "openai") {
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "tts-1",
            input: text,
            voice: voiceId,
            speed: settings.speed || 1.0,
          }),
        });

        if (!response.ok) throw new Error("OpenAI API failed");

        const buffer = await response.arrayBuffer();
        res.set("Content-Type", "audio/mpeg");
        res.send(Buffer.from(buffer));
      }
    } catch (error) {
      res.status(500).json({ error: "Generation failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
