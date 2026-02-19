export type AgentSessionEventAction = "created" | "prompted";

export interface LinearAgentSessionEventPayload {
  action: AgentSessionEventAction;
  agentSession?: {
    id: string;
    issue?: { id: string; title?: string; description?: string };
    comment?: { body?: string };
    promptContext?: string;
    previousComments?: Array<{ body?: string }>;
    guidance?: string;
  };
  agentActivity?: { body?: string };
}

export interface ParsedLinearSession {
  agentSessionId: string;
  action: AgentSessionEventAction;
  promptContext: string;
  issueId: string | null;
  issueTitle: string;
  issueDescription: string;
  commentBody: string | null;
  userPrompt: string | null;
}
