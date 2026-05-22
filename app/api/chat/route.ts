import { anthropic } from '@ai-sdk/anthropic';
import { streamText, type CoreMessage } from 'ai';
import { tools } from '@/lib/tools';
import { ipFromRequest, rateLimit } from '@/lib/rate-limit';

// Edge runtime: low cold-start latency, fetch-based, and streams chunks to
// the browser as soon as the model emits them. Node runtime would buffer
// behind a regular Lambda response. See README ("Why edge runtime") for the
// full rationale.
export const runtime = 'edge';
export const maxDuration = 30;

const CHAT_MODEL = process.env.ANTHROPIC_CHAT_MODEL ?? 'claude-sonnet-4-5';

const SYSTEM_PROMPT = `You are the in-app assistant for the Foundry Agent Playground — a portfolio project demonstrating streaming chat, tool calling, and RAG.

You have access to three tools:
- search_docs(query): semantic search over documents the user has uploaded (use this for any question about specific files they've shared)
- get_current_time(timezone?): the current time in an IANA timezone, defaulting to UTC
- calculate(expression): a safe math evaluator

Guidelines:
- Prefer tool calls over guessing. Cite filenames + chunk indexes when summarizing retrieved content.
- Be concise. Use code blocks for code, math, or structured output.
- If a tool errors, explain what went wrong and suggest a fix instead of retrying blindly.
- Never invent file contents. If search_docs returns no hits, say so.`;

export async function POST(req: Request): Promise<Response> {
  const ip = ipFromRequest(req);
  const limit = rateLimit(`chat:${ip}`, 10, 10);
  if (!limit.success) {
    return new Response(
      JSON.stringify({
        error: `Rate limit exceeded. Try again in ${Math.ceil(limit.reset / 1000)}s.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(limit.reset / 1000)),
        },
      },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: { messages?: CoreMessage[] };
  try {
    body = (await req.json()) as { messages?: CoreMessage[] };
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const messages = body.messages ?? [];

  const result = await streamText({
    model: anthropic(CHAT_MODEL),
    system: SYSTEM_PROMPT,
    messages,
    tools,
    // Let the model call tools, get results, and continue reasoning in one
    // streaming response. 5 hops is generous for the 3 tools we expose.
    maxSteps: 5,
    temperature: 0.4,
  });

  return result.toDataStreamResponse({
    getErrorMessage: (err: unknown) => {
      if (err instanceof Error) return err.message;
      return 'Unknown error from chat backend.';
    },
  });
}
