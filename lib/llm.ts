// The only file that talks to the LLM provider. Server-side only.
// To swap providers, change this file (schemas passed in use Gemini's
// OpenAPI-style format: { type: "ARRAY" | "OBJECT" | "STRING" | ... }).
import "server-only";
import { ApiError, GoogleGenAI, type Part, type Schema } from "@google/genai";

const MODEL = "gemini-3.5-flash-lite";

export type LLMErrorCode = "config" | "rate_limit" | "parse" | "api";

export class LLMError extends Error {
  constructor(public code: LLMErrorCode, message: string) {
    super(message);
  }
}

export async function generateJSON<T>({
  prompt,
  schema,
  image,
  system,
}: {
  prompt: string;
  schema: object;
  image?: { data: string; mimeType: string }; // base64, no data: prefix
  system?: string; // stable instructions; sent as the system instruction so the provider can cache it
}): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LLMError("config", "GEMINI_API_KEY is not set on the server.");

  const parts: Part[] = [];
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  parts.push({ text: prompt });

  let text: string | undefined;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        ...(system ? { systemInstruction: system } : {}),
        responseMimeType: "application/json",
        responseSchema: schema as Schema,
      },
    });
    text = response.text;
  } catch (err) {
    console.error(err);
    if (err instanceof ApiError && err.status === 429) {
      throw new LLMError("rate_limit", "Too many requests, try again in a minute.");
    }
    if (err instanceof ApiError && (err.status === 400 || err.status === 403) && /api key/i.test(err.message)) {
      throw new LLMError("config", "Server API key is missing or invalid.");
    }
    throw new LLMError("api", "The AI service had a problem. Please try again.");
  }

  try {
    // JSON mode shouldn't add fences, but strip them just in case
    return JSON.parse((text ?? "").replace(/```(?:json)?/gi, "").trim()) as T;
  } catch {
    console.error("Unparseable model output:", text);
    throw new LLMError("parse", "Couldn't understand the AI response. Try again.");
  }
}

export function llmErrorStatus(code: LLMErrorCode): number {
  return { config: 500, rate_limit: 429, parse: 422, api: 502 }[code];
}
