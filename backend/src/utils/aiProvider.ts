import { GoogleGenAI, type Content, type Part } from "@google/genai";

export type ChatTurn = { role: "user" | "assistant"; text: string };
export type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON schema of the arguments
};
export type RunTool = (name: string, args: Record<string, unknown>) => Promise<unknown>;

const MAX_STEPS = 4; 

let client: GoogleGenAI | null = null;
const gemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
};


export const chatWithTools = async ({
  system,
  history,
  tools,
  runTool,
}: {
  system: string;
  history: ChatTurn[];
  tools: ToolDef[];
  runTool: RunTool;
}): Promise<string> => {
  const model = process.env.AI_MODEL || "gemini-3.5-flash-lite";
  const contents: Content[] = history.map((t) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: [{ text: t.text }],
  }));
  const functionDeclarations = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parametersJsonSchema: t.parameters,
  }));

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await gemini().models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: system,
        tools: [{ functionDeclarations }],
        maxOutputTokens: 1024,
      },
    });

    const calls = res.functionCalls ?? [];
    if (calls.length === 0) {
      return res.text?.trim() || "Sorry, I couldn't answer that. Please try again.";
    }
    const modelTurn = res.candidates?.[0]?.content;
    if (modelTurn) contents.push(modelTurn);

    const parts: Part[] = await Promise.all(
      calls.map(async (call) => {
        let output: unknown;
        try {
          output = await runTool(call.name ?? "", (call.args ?? {}) as Record<string, unknown>);
        } catch (error) {
          console.error(`❌ Assistant tool ${call.name} failed:`, (error as Error).message);
          output = { error: "Couldn't load this right now" };
        }
        return {
          functionResponse: {
            name: call.name ?? "",
            ...(call.id && { id: call.id }),
            response: { output },
          },
        };
      }),
    );
    contents.push({ role: "user", parts });
  }

  return "Sorry, that took too long. Try asking in a simpler way.";
};