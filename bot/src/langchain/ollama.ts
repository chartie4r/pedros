import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const model = process.env.OLLAMA_MODEL ?? "llama3.2";

const llm = new ChatOllama({
  baseUrl,
  model,
  temperature: 0.2,
  maxRetries: 2,
});

export async function summarize(text: string): Promise<string> {
  const response = await llm.invoke([
    new SystemMessage("You are a concise summarizer. Reply with a short summary only."),
    new HumanMessage(`Summarize this in 1-3 sentences:\n\n${text}`),
  ]);
  return typeof response.content === "string" ? response.content : String(response.content);
}

export async function classifyTaskComplexity(
  title: string,
  description: string
): Promise<"simple" | "complex"> {
  const response = await llm.invoke([
    new SystemMessage(
      "You classify dev tasks. Reply with exactly one word: simple or complex. " +
        "Simple = small change, one or few files, clear scope. Complex = multi-file, unclear scope, or needs exploration."
    ),
    new HumanMessage(`Title: ${title}\n\nDescription:\n${description}`),
  ]);
  const content = typeof response.content === "string" ? response.content : String(response.content);
  const normalized = content.trim().toLowerCase();
  return normalized.startsWith("complex") ? "complex" : "simple";
}

export interface SimpleFileChange {
  path: string;
  content: string;
}

/**
 * Ask the LLM to produce a single file change (path + full content) for a small task.
 * Output must be valid JSON: { "path": "...", "content": "..." }
 */
export async function generateSimpleFileChange(
  taskTitle: string,
  taskDescription: string
): Promise<SimpleFileChange> {
  const response = await llm.invoke([
    new SystemMessage(
      "You are a coding assistant. For the given task, output exactly one JSON object with two keys: " +
        '"path" (file path relative to repo root) and "content" (full file content as a string). ' +
        "Escape quotes and newlines in content properly. No markdown, no explanation, only the JSON."
    ),
    new HumanMessage(`Task: ${taskTitle}\n\n${taskDescription}`),
  ]);
  const raw = typeof response.content === "string" ? response.content : String(response.content);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : raw;
  const parsed = JSON.parse(jsonStr) as SimpleFileChange;
  if (!parsed.path || typeof parsed.content !== "string") {
    throw new Error("LLM did not return valid { path, content }");
  }
  return { path: parsed.path, content: parsed.content };
}

export { llm };
