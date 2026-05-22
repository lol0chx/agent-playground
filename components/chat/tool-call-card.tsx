'use client';

import * as React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Calculator,
  Clock,
  Database,
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn, formatMs, truncate } from '@/lib/utils';

export type ToolCallState = 'pending' | 'result' | 'error';

interface ToolCallCardProps {
  name: string;
  args: unknown;
  result?: unknown;
  state: ToolCallState;
  durationMs?: number;
}

const TOOL_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  search_docs: { icon: Database, label: 'search_docs' },
  get_current_time: { icon: Clock, label: 'get_current_time' },
  calculate: { icon: Calculator, label: 'calculate' },
};

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function ArgsView({ args }: { args: unknown }) {
  const pretty = React.useMemo(() => safeStringify(args), [args]);
  return (
    <pre className="overflow-x-auto rounded-md bg-muted/60 p-3 font-mono text-xs leading-relaxed">
      {pretty}
    </pre>
  );
}

interface RagHit {
  filename: string;
  chunk_index: number;
  similarity: number;
  content: string;
}

interface RagShape {
  hits: RagHit[];
}

function isRagResult(r: unknown): r is RagShape {
  if (!r || typeof r !== 'object') return false;
  const maybe = (r as { hits?: unknown }).hits;
  return Array.isArray(maybe);
}

function RagResultView({ result }: { result: RagShape }) {
  if (result.hits.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No matching chunks found. Try uploading a document first.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {result.hits.map((hit, i) => (
        <div
          key={i}
          className="rounded-md border bg-muted/40 p-3 text-xs leading-relaxed"
        >
          <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
            <span className="truncate font-medium">
              {hit.filename} · chunk {hit.chunk_index}
            </span>
            <Badge variant="outline" className="font-mono text-[10px]">
              {(hit.similarity * 100).toFixed(1)}%
            </Badge>
          </div>
          <p className="text-foreground/90">{truncate(hit.content, 320)}</p>
        </div>
      ))}
    </div>
  );
}

function JsonResultView({ result }: { result: unknown }) {
  const pretty = React.useMemo(() => safeStringify(result), [result]);
  return (
    <pre className="overflow-x-auto rounded-md bg-muted/60 p-3 font-mono text-xs leading-relaxed">
      {pretty}
    </pre>
  );
}

function ResultView({ name, result }: { name: string; result: unknown }) {
  if (name === 'search_docs' && isRagResult(result)) {
    return <RagResultView result={result} />;
  }
  return <JsonResultView result={result} />;
}

function PendingShimmer() {
  return (
    <div className="space-y-2">
      <div className="shimmer h-3 w-3/4 rounded bg-muted" />
      <div className="shimmer h-3 w-5/6 rounded bg-muted" />
      <div className="shimmer h-3 w-2/3 rounded bg-muted" />
    </div>
  );
}

export function ToolCallCard({
  name,
  args,
  result,
  state,
  durationMs,
}: ToolCallCardProps) {
  const meta = TOOL_META[name] ?? { icon: Wrench, label: name };
  const Icon = meta.icon;
  const [argsOpen, setArgsOpen] = React.useState(false);
  const [resultOpen, setResultOpen] = React.useState(true);

  return (
    <Card className="my-2 overflow-hidden border-border/80 bg-card/60">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <span className="font-mono text-sm font-semibold">{meta.label}</span>
          {state === 'pending' && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> running
            </Badge>
          )}
          {state === 'result' && (
            <Badge
              variant="secondary"
              className="gap-1 text-green-600 dark:text-green-400"
            >
              <CheckCircle2 className="h-3 w-3" /> done
            </Badge>
          )}
          {state === 'error' && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" /> error
            </Badge>
          )}
        </div>
        {typeof durationMs === 'number' && state !== 'pending' && (
          <span className="font-mono text-[11px] text-muted-foreground">
            {formatMs(durationMs)}
          </span>
        )}
      </div>

      <div className="space-y-2 p-3">
        <button
          type="button"
          onClick={() => setArgsOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {argsOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          Arguments
        </button>
        {argsOpen && <ArgsView args={args} />}

        <button
          type="button"
          onClick={() => setResultOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {resultOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          Output
        </button>
        {resultOpen && (
          <div
            className={cn(
              'transition-opacity',
              state === 'pending' && 'opacity-90',
            )}
          >
            {state === 'pending' ? (
              <PendingShimmer />
            ) : state === 'error' ? (
              <pre className="overflow-x-auto rounded-md bg-destructive/10 p-3 font-mono text-xs text-destructive">
                {typeof result === 'string' ? result : safeStringify(result)}
              </pre>
            ) : (
              <ResultView name={name} result={result} />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
