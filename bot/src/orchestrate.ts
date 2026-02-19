import type { ParsedLinearSession } from "./linear/index.js";
import { emitResponse, emitError } from "./linear/index.js";
import { runSimplePath, runCursorPath } from "./runner/index.js";

const defaultRepo = process.env.GITHUB_REPO ?? "";
const defaultBaseBranch = process.env.GITHUB_DEFAULT_BRANCH ?? "main";

/**
 * Process a Linear agent session: route task, run simple or Cursor path, report back.
 */
export async function processLinearSession(parsed: ParsedLinearSession): Promise<void> {
  const prompt = [parsed.promptContext, parsed.userPrompt].filter(Boolean).join("\n\n");
  const title = parsed.issueTitle || "Task";
  const description = parsed.issueDescription || prompt || "No description.";
  const repo = defaultRepo;

  if (!repo) {
    await emitError(
      parsed.agentSessionId,
      "GITHUB_REPO is not set. Set it to e.g. owner/repo or full GitHub URL."
    );
    return;
  }

  try {
    const simpleResult = await runSimplePath({
      title,
      description,
      repoUrlOrSlug: repo,
      baseBranch: defaultBaseBranch,
    });

    if (simpleResult.kind === "simple") {
      await emitResponse(
        parsed.agentSessionId,
        `Done. PR: ${simpleResult.prUrl}`
      );
      return;
    }

    const cursorResult = await runCursorPath({
      prompt: `${title}\n\n${description}`,
      repository: repo,
      baseBranch: defaultBaseBranch,
    });

    const msg = cursorResult.prUrl
      ? `Cursor agent started. PR: ${cursorResult.prUrl}`
      : `Cursor agent started (id: ${cursorResult.id}). Branch: ${cursorResult.branch ?? "pending"}.`;
    await emitResponse(parsed.agentSessionId, msg);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await emitError(parsed.agentSessionId, `Error: ${message}`);
  }
}
