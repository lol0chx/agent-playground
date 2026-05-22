# Vercel AI SDK — Overview

The Vercel AI SDK is a TypeScript toolkit for building AI-powered applications
with React, Next.js, Vue, Svelte, and Node.js. It standardises model access,
streaming, and tool calling across providers like OpenAI, Anthropic, and Google
so you can swap models without rewriting your app.

## Streaming

`streamText({ model, messages, tools })` returns a `StreamTextResult` that you
can either pipe into a `useChat`-compatible response with
`toDataStreamResponse()` or read manually as an async iterable. Streaming keeps
time-to-first-token under 500 ms in practice and makes the app feel
instantaneous compared to a buffered `await` on the entire response.

## Tool calling

Define tools with the `tool()` helper:

```ts
import { tool } from 'ai';
import { z } from 'zod';

const myTool = tool({
  description: 'Look up the weather for a city.',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => fetchWeather(city),
});
```

The SDK serialises the Zod schema into the provider's native tool format
(OpenAI function calling, Anthropic tool use, etc.) and parses the model's tool
call back into typed arguments before invoking `execute`.

## Multi-step agents

Pass `maxSteps: 5` to `streamText` and the SDK will automatically resolve tool
calls, feed their results back into the model, and keep streaming the
follow-up reasoning — all inside a single HTTP response. This is the
"agent loop" without the boilerplate.

## React integration

The `useChat()` hook in `ai/react` is a wrapper around `fetch()` that:
- Manages a message list with optimistic updates
- Streams server tokens into the latest assistant message
- Exposes `stop()`, `reload()`, and `setMessages()` for control
- Surfaces tool invocations on each message as `message.toolInvocations`

Pair it with shadcn/ui and Tailwind for a production-grade chat UI in roughly
200 lines of code.
