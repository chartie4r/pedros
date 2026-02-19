/**
 * Cursor Cloud Agents API client.
 * API key from Cursor Dashboard → Integrations.
 * Endpoint docs: https://cursor.com/docs/cloud-agent/api/endpoints
 */

const apiKey = process.env.CURSOR_API_KEY;
const baseUrl = process.env.CURSOR_AGENT_API_URL ?? "https://api.cursor.com";

function getAuthHeader(): string {
  if (!apiKey) throw new Error("CURSOR_API_KEY is not set");
  const encoded = Buffer.from(`${apiKey}:`, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

export interface LaunchAgentInput {
  prompt: string;
  repository: string;
  baseBranch?: string;
}

export interface LaunchAgentResult {
  id: string;
  status: string;
  branch?: string;
  prUrl?: string;
}

/**
 * Launch a Cursor Cloud Agent with the given prompt and repo.
 * Cursor clones the repo, runs the agent, and pushes to a new branch.
 * Exact request shape may depend on API version; adjust body if needed.
 */
export async function launchCloudAgent(input: LaunchAgentInput): Promise<LaunchAgentResult> {
  const url = `${baseUrl}/v1/cloud-agent/tasks`;
  const body = {
    prompt: input.prompt,
    repository: input.repository,
    baseBranch: input.baseBranch ?? "main",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cursor API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { id?: string; status?: string; branch?: string; prUrl?: string };
  return {
    id: data.id ?? "",
    status: data.status ?? "unknown",
    branch: data.branch,
    prUrl: data.prUrl,
  };
}
