'use client';

import * as React from 'react';
import { useChat } from 'ai/react';
import type { Attachment } from 'ai';
import { ArrowUp, Github, RefreshCw, Square, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/chat/empty-state';
import { ChatMessage } from '@/components/chat/chat-message';
import { AttachMenu } from '@/components/chat/attach-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { DocumentsPanel } from '@/components/documents/documents-panel';
import { cn } from '@/lib/utils';

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function Chat() {
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    reload,
    setMessages,
  } = useChat({
    api: '/api/chat',
    onError: (err) => {
      toast.error('Chat error', { description: err.message });
    },
  });

  const bottomRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [docsOpen, setDocsOpen] = React.useState(false);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const onPickSuggestion = (prompt: string) => {
    setInput(prompt);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const onPickImages = React.useCallback(async (files: File[]) => {
    try {
      const newOnes = await Promise.all(
        files.map(async (f) => ({
          name: f.name,
          contentType: f.type,
          url: await readAsDataUrl(f),
        })),
      );
      setAttachments((prev) => [...prev, ...newOnes]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read image';
      toast.error('Could not attach image', { description: message });
    }
  }, []);

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    handleSubmit(e, {
      experimental_attachments:
        attachments.length > 0 ? attachments : undefined,
    });
    setAttachments([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || attachments.length > 0) && !isLoading) {
        const form = e.currentTarget.form;
        form?.requestSubmit();
      }
    }
  };

  const canSend =
    !isLoading && (input.trim().length > 0 || attachments.length > 0);

  return (
    <div className="flex h-dvh w-full flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">F</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight">
              Foundry Agent Playground
            </p>
            <p className="text-xs text-muted-foreground">
              Claude · Vercel AI SDK · pgvector
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setMessages([])}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="View source on GitHub"
            asChild
          >
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <EmptyState onPick={onPickSuggestion} />
          ) : (
            <div className="flex flex-col divide-y">
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
              {error && (
                <div className="flex items-center justify-between gap-3 border-y border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                  <span className="text-destructive">{error.message}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reload()}
                    className="gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </Button>
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Composer */}
      <div className="sticky bottom-0 z-10 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <form
          onSubmit={submit}
          className="mx-auto w-full max-w-3xl"
        >
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <div
                  key={`${a.name}-${i}`}
                  className="group relative h-16 w-16 overflow-hidden rounded-md border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.url}
                    alt={a.name ?? 'attachment'}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    aria-label={`Remove ${a.name ?? 'attachment'}`}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow group-hover:opacity-100 focus:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <AttachMenu
              onPickImages={(files) => void onPickImages(files)}
              onOpenDocuments={() => setDocsOpen(true)}
              disabled={isLoading}
            />
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask anything — attach an image or upload a doc to search."
                className={cn(
                  'block w-full resize-none rounded-lg border border-input bg-background px-4 py-3 pr-12 text-sm shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'min-h-[48px] max-h-40',
                )}
              />
              <Button
                type={isLoading ? 'button' : 'submit'}
                size="icon"
                onClick={isLoading ? () => stop() : undefined}
                disabled={!isLoading && !canSend}
                className="absolute bottom-1.5 right-1.5 h-9 w-9 rounded-md"
                aria-label={isLoading ? 'Stop generating' : 'Send message'}
              >
                {isLoading ? (
                  <Square className="h-4 w-4 fill-current" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
          Streaming responses via the Vercel AI SDK · Powered by Claude
          Sonnet 4.5 · RAG over Neon + pgvector
        </p>
      </div>

      <DocumentsPanel open={docsOpen} onOpenChange={setDocsOpen} />
    </div>
  );
}
