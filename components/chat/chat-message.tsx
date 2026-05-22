'use client';

import type { Message, ToolInvocation } from 'ai';
import { Bot, User } from 'lucide-react';
import { ToolCallCard, type ToolCallState } from '@/components/chat/tool-call-card';
import { Markdown } from '@/components/chat/markdown';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
}

function pluckResult(inv: ToolInvocation): {
  state: ToolCallState;
  result: unknown;
} {
  switch (inv.state) {
    case 'result':
      return { state: 'result', result: inv.result };
    case 'call':
    case 'partial-call':
    default:
      return { state: 'pending', result: undefined };
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const invocations = message.toolInvocations ?? [];

  return (
    <div
      className={cn(
        'flex w-full gap-3 px-4 py-5',
        isUser ? 'bg-transparent' : 'bg-muted/30',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
          isUser
            ? 'bg-background text-foreground'
            : 'bg-primary text-primary-foreground',
        )}
        aria-hidden
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="text-xs font-medium text-muted-foreground">
          {isUser ? 'You' : 'Assistant'}
        </div>
        {invocations.length > 0 && (
          <div className="space-y-1">
            {invocations.map((inv) => {
              const { state, result } = pluckResult(inv);
              return (
                <ToolCallCard
                  key={inv.toolCallId}
                  name={inv.toolName}
                  args={inv.args}
                  result={result}
                  state={state}
                />
              );
            })}
          </div>
        )}
        {message.content && <Markdown content={message.content} />}
      </div>
    </div>
  );
}
