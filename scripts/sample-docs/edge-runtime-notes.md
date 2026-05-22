# Edge runtime — why we use it for streaming

Edge functions run on a V8 isolate at the CDN edge instead of a regional
Node.js Lambda. For a streaming chat endpoint this matters for three reasons:

1. **Time to first byte.** The handler is colocated with the user, so the
   TCP + TLS handshake is fast. Streams begin flushing in ~50–80 ms instead
   of ~250–400 ms from a single-region Lambda.

2. **No buffering.** Vercel's Node functions buffer responses up to 4 MB for
   API Gateway compatibility, which means a 2-minute streaming response only
   appears at the end. Edge functions are pure Fetch with native streaming —
   tokens arrive as the model emits them.

3. **Lower idle cost.** Edge isolates spin up in single-digit ms and don't
   incur Lambda's per-invocation memory billing. For a chat that's mostly
   waiting on the model, this is meaningfully cheaper.

## Trade-offs

- No native Node.js APIs (`fs`, `Buffer`, native modules). Anything that
  reads files or uses a Node-only library must run in the Node runtime.
- 1 MB compiled bundle limit on the chat route (after tree-shaking). The
  Vercel AI SDK is small; mathjs and the rest tree-shake well.
- Database access has to be HTTP-based. Postgres + pgvector via Neon's
  serverless driver works because it speaks HTTP under the hood. A
  TCP-based `pg` client would not.

This project pairs an edge chat route with a Node upload route to get the
best of both: streaming where it matters, full Node where we need
`pdf-parse`.
