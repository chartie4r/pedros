import * as ollama from "./ollama.js";
import * as openai from "./openai.js";

const useOpenAI = Boolean(process.env.OPENAI_API_KEY);

export async function summarize(text: string): Promise<string> {
  return useOpenAI ? openai.summarize(text) : ollama.summarize(text);
}

export async function classifyTaskComplexity(
  title: string,
  description: string
): Promise<"simple" | "complex"> {
  return useOpenAI
    ? openai.classifyTaskComplexity(title, description)
    : ollama.classifyTaskComplexity(title, description);
}

export async function generateSimpleFileChange(
  taskTitle: string,
  taskDescription: string
): Promise<{ path: string; content: string }> {
  return useOpenAI
    ? openai.generateSimpleFileChange(taskTitle, taskDescription)
    : ollama.generateSimpleFileChange(taskTitle, taskDescription);
}

export { llm } from "./ollama.js";
export type { SimpleFileChange } from "./ollama.js";
