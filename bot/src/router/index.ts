import { classifyTaskComplexity } from "../langchain/index.js";

export type TaskKind = "simple" | "complex";

export interface TaskInput {
  title: string;
  description: string;
  /** Optional explicit override from user (e.g. "use Cursor" / "keep it simple") */
  hint?: "simple" | "complex";
}

/**
 * Classifies a task as simple (bot does it) or complex (trigger Cursor Cloud Agent).
 */
export async function routeTask(input: TaskInput): Promise<TaskKind> {
  if (input.hint) return input.hint;
  return classifyTaskComplexity(input.title, input.description);
}
