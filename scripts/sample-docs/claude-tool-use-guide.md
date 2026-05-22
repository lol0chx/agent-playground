# Claude Tool Use — Quick Guide

Claude can call tools (functions) you define, then use the returned data to
answer the user. This is the foundation of agent-style workflows.

## Defining a tool

A tool definition is just JSON — name, description, and a JSON Schema for
inputs:

```json
{
  "name": "get_weather",
  "description": "Get current weather for a city.",
  "input_schema": {
    "type": "object",
    "properties": { "city": { "type": "string" } },
    "required": ["city"]
  }
}
```

Pass tools alongside your messages in the `tools` array of a Messages API
call. Claude will return one of:
- A normal `text` block with its final answer, OR
- A `tool_use` block containing the tool name and parsed arguments.

## Tool-use loop

When you receive a `tool_use` block:
1. Execute the tool with the provided arguments
2. Append a `tool_result` block to the conversation that references the
   `tool_use_id`
3. Call the model again with the updated message list

Repeat until the model returns a `text`-only response.

## Tips

- Write tool descriptions in plain English. Claude reads them — they aren't
  just for humans.
- Keep parameter schemas tight. Use enums and required fields wherever you
  can. The model is much better at filling in well-constrained tools.
- Stream responses so the user sees tool calls fire in real time.
- Don't pass secrets in tool descriptions or arguments — they end up in the
  model's context.

## Error handling

If a tool fails, return `is_error: true` on the `tool_result`. Claude will see
the error and usually either retry with different arguments or explain the
failure to the user. This is much more robust than throwing on the server.
