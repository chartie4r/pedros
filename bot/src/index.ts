import express from "express";
import rateLimit from "express-rate-limit";
import { summarize, classifyTaskComplexity } from "./langchain/index.js";
import {
  verifyLinearWebhook,
  parseAgentSessionEvent,
  acknowledgeSession,
  isDuplicateAgentSessionEvent,
} from "./linear/index.js";
import { processLinearSession } from "./orchestrate.js";
import type { LinearAgentSessionEventPayload } from "./linear/index.js";
import { startTelegramPolling } from "./telegram/index.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests" },
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);
app.use("/summarize", apiLimiter);
app.use("/classify", apiLimiter);
app.use("/webhooks/linear", rateLimit({ windowMs: 60 * 1000, max: 30 }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "pedros-bot" });
});

app.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Missing or invalid 'text' in body" });
      return;
    }
    const result = await summarize(text);
    res.json({ summary: result });
  } catch (err) {
    console.error("Summarize error:", err);
    res.status(500).json({ error: "Summarization failed" });
  }
});

app.post("/classify", async (req, res) => {
  try {
    const { title = "", description = "" } = req.body as { title?: string; description?: string };
    const complexity = await classifyTaskComplexity(
      String(title),
      String(description)
    );
    res.json({ complexity });
  } catch (err) {
    console.error("Classify error:", err);
    res.status(500).json({ error: "Classification failed" });
  }
});

app.post("/webhooks/linear", (req, res) => {
  const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
  const payloadStr = rawBody ? rawBody.toString("utf8") : JSON.stringify(req.body);
  const signature = req.headers["linear-signature"] as string | undefined;

  if (process.env.LINEAR_WEBHOOK_SECRET && !verifyLinearWebhook(payloadStr, signature)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let body: LinearAgentSessionEventPayload;
  try {
    body = rawBody ? JSON.parse(payloadStr) : (req.body as LinearAgentSessionEventPayload);
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  if (isDuplicateAgentSessionEvent(body)) {
    res.status(200).send();
    return;
  }

  const parsed = parseAgentSessionEvent(body);
  if (!parsed) {
    res.status(200).send();
    return;
  }

  res.status(200).send();

  setImmediate(async () => {
    try {
      await acknowledgeSession(parsed);
      await processLinearSession(parsed);
    } catch (err) {
      console.error("Linear webhook processing error:", err);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Pedros bot listening on port ${PORT}`);
  if (process.env.TELEGRAM_BOT_TOKEN) {
    startTelegramPolling();
    console.log("Telegram polling started");
  }
});
