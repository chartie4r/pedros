import { launchCloudAgent } from "../cursor/index.js";

export interface CursorPathInput {
  prompt: string;
  repository: string;
  baseBranch?: string;
}

export interface CursorPathResult {
  id: string;
  status: string;
  branch?: string;
  prUrl?: string;
}

export async function runCursorPath(input: CursorPathInput): Promise<CursorPathResult> {
  const result = await launchCloudAgent({
    prompt: input.prompt,
    repository: input.repository,
    baseBranch: input.baseBranch,
  });
  return {
    id: result.id,
    status: result.status,
    branch: result.branch,
    prUrl: result.prUrl,
  };
}
