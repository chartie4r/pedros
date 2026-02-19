import crypto from "node:crypto";
import type { LinearAgentSessionEventPayload, ParsedLinearSession } from "./types.js";
import { emitThought } from "./client.js";

const WEBHOOK_SECRET = process.env.LINEAR_WEBHOOK_SECRET ?? "";

const processedKeys = new Map<string, number>();
const IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000;

function cleanupIdempotency(): void {
  const now = Date.now();
  for (const [key, ts] of processedKeys.entries()) {
    if (now - ts > IDEMPOTENCY_WINDOW_MS) processedKeys.delete(key);
  }
}

export function isDuplicateAgentSessionEvent(body: LinearAgentSessionEventPayload): boolean {
  const id = body.agentSession?.id;
  const action = body.action;
  if (!id) return false;
  const key = `${id}:${action}`;
  cleanupIdempotency();
  if (processedKeys.has(key)) return true;
  processedKeys.set(key, Date.now());
  return false;
}

export function verifyLinearWebhook(payload: string, signature: string | undefined): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(digest, "hex"));
}

export function parseAgentSessionEvent(body: LinearAgentSessionEventPayload): ParsedLinearSession | null {
  const session = body.agentSession;
  if (!session?.id) return null;

  const promptContext = session.promptContext ?? "";
  const issue = session.issue;
  const issueId = issue?.id ?? null;
  const issueTitle = issue?.title ?? "";
  const issueDescription = issue?.description ?? "";
  const commentBody = session.comment?.body ?? null;
  const userPrompt = body.action === "prompted" ? body.agentActivity?.body ?? null : null;

  return {
    agentSessionId: session.id,
    action: body.action,
    promptContext,
    issueId,
    issueTitle,
    issueDescription,
    commentBody,
    userPrompt,
  };
}

export async function acknowledgeSession(parsed: ParsedLinearSession): Promise<void> {
  await emitThought(
    parsed.agentSessionId,
    "Session received. I'm analyzing the task and will proceed shortly."
  );
}
