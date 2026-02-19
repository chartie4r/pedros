import { LinearClient } from "@linear/sdk";

const apiKey = process.env.LINEAR_API_KEY;
let client: LinearClient | null = null;

export function getLinearClient(): LinearClient {
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is not set");
  }
  if (!client) {
    client = new LinearClient({ apiKey });
  }
  return client;
}

const AGENT_ACTIVITY_MUTATION = `
  mutation AgentActivityCreate($input: AgentActivityCreateInput!) {
    agentActivityCreate(input: $input) {
      success
      agentActivity { id }
    }
  }
`;

async function createAgentActivity(
  agentSessionId: string,
  content: { type: string; body?: string }
): Promise<void> {
  const linear = getLinearClient();
  const result = await (linear as unknown as { client: { request: (q: string, v: object) => Promise<unknown> } })
    .client.request(AGENT_ACTIVITY_MUTATION, {
      input: { agentSessionId, content },
    });
  if (result && typeof result === "object" && "agentActivityCreate" in result) {
    const create = (result as { agentActivityCreate?: { success?: boolean } }).agentActivityCreate;
    if (create && !create.success) throw new Error("agentActivityCreate failed");
  }
}

export async function emitThought(agentSessionId: string, body: string): Promise<void> {
  await createAgentActivity(agentSessionId, { type: "thought", body });
}

export async function emitResponse(agentSessionId: string, body: string): Promise<void> {
  await createAgentActivity(agentSessionId, { type: "response", body });
}

export async function emitError(agentSessionId: string, body: string): Promise<void> {
  await createAgentActivity(agentSessionId, { type: "error", body });
}
