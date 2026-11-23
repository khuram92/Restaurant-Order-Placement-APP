import { api } from "../lib/api";
import type { AssistantReply, ChatTurn } from "../types/assistant";

export const askAssistant = async (
  messages: ChatTurn[],
  location?: { lat: number; lng: number },
) => {
  const { data } = await api.post<AssistantReply>(
    "/assistant/chat",
    { messages, ...(location && { location }) },
    { timeout: 45000 },
  );
  return data;
};