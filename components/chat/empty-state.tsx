'use client';

import { Sparkles, BookOpen, Clock, Calculator } from 'lucide-react';
import { Card } from '@/components/ui/card';

const SUGGESTIONS = [
  {
    icon: BookOpen,
    title: 'Search uploaded docs',
    prompt: 'Search the uploaded docs for "tool calling" and summarize what you find.',
  },
  {
    icon: Clock,
    title: 'Get the current time',
    prompt: 'What time is it right now in Tokyo?',
  },
  {
    icon: Calculator,
    title: 'Crunch some math',
    prompt: 'What is the compound interest on $5,000 at 4.5% APR over 12 years?',
  },
  {
    icon: Sparkles,
    title: 'Combine tools',
    prompt:
      'Search the docs for "edge runtime", explain why it matters, and tell me what time it is in PT.',
  },
];

interface EmptyStateProps {
  onPick: (prompt: string) => void;
}

export function EmptyState({ onPick }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-gradient-to-br from-primary/10 via-transparent to-primary/5">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Foundry Agent Playground
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          A streaming Claude agent with tool calls and RAG. Try one of the
          prompts below, or ask anything.
        </p>
      </div>
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, title, prompt }) => (
          <Card
            key={title}
            onClick={() => onPick(prompt)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onPick(prompt);
            }}
            className="cursor-pointer p-3 text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {prompt}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
