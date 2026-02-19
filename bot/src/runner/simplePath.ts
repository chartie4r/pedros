import { routeTask } from "../router/index.js";
import { generateSimpleFileChange } from "../langchain/index.js";
import {
  createBranchWithChangesAndPr,
  parseRepo,
  type FileChange,
} from "../github/index.js";

export interface SimplePathInput {
  title: string;
  description: string;
  repoUrlOrSlug: string;
  baseBranch?: string;
  hint?: "simple" | "complex";
}

export interface SimplePathResult {
  kind: "simple";
  prUrl: string;
  branch: string;
}

export interface SimplePathDelegated {
  kind: "complex";
  message: string;
}

/**
 * If task is simple: generate file change with LLM, push branch, create PR.
 * If complex: return delegated so caller can trigger Cursor.
 */
export async function runSimplePath(
  input: SimplePathInput
): Promise<SimplePathResult | SimplePathDelegated> {
  const kind = await routeTask({
    title: input.title,
    description: input.description,
    hint: input.hint,
  });

  if (kind === "complex") {
    return {
      kind: "complex",
      message: "Task classified as complex; use Cursor Cloud Agent.",
    };
  }

  const change = await generateSimpleFileChange(input.title, input.description);
  const repoRef = parseRepo(input.repoUrlOrSlug);
  const baseBranch = input.baseBranch ?? "main";
  const branchName = `bot/simple-${Date.now()}`;
  const changes: FileChange[] = [{ path: change.path, content: change.content }];

  const { prUrl, branch } = await createBranchWithChangesAndPr(
    repoRef,
    baseBranch,
    branchName,
    input.title,
    input.description,
    changes
  );

  return { kind: "simple", prUrl, branch };
}
