'use client';

import * as React from 'react';
import { CodeBlock } from '@/components/chat/code-block';
import { cn } from '@/lib/utils';

/**
 * Minimal markdown renderer that handles only what we need from Claude:
 *   - fenced code blocks (```lang\n...\n```)
 *   - inline code (`x`)
 *   - **bold**, *italic*
 *   - paragraph + soft line breaks
 *   - bullet/numbered lists
 *
 * Pulling in remark/rehype would add ~150 kB to the client bundle for a chat
 * that mostly streams prose + code blocks. Keep it tight.
 */

type Token =
  | { type: 'code'; language: string; value: string }
  | { type: 'text'; value: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const re = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: input.slice(lastIndex, match.index) });
    }
    tokens.push({
      type: 'code',
      language: match[1] ?? 'text',
      value: match[2] ?? '',
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < input.length) {
    tokens.push({ type: 'text', value: input.slice(lastIndex) });
  }
  return tokens;
}

function renderInline(text: string): React.ReactNode[] {
  // `inline code`, **bold**, *italic*
  const parts: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('`')) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]"
        >
          {t.slice(1, -1)}
        </code>,
      );
    } else if (t.startsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {t.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <em key={key++} className="italic">
          {t.slice(1, -1)}
        </em>,
      );
    }
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderTextBlock(text: string, baseKey: number): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let para: string[] = [];
  let list: { kind: 'ul' | 'ol'; items: string[] } | null = null;
  let key = baseKey;

  const flushPara = () => {
    if (para.length) {
      nodes.push(
        <p key={`p-${key++}`} className="whitespace-pre-wrap leading-relaxed">
          {renderInline(para.join('\n'))}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const Tag = list.kind === 'ul' ? 'ul' : 'ol';
      nodes.push(
        <Tag
          key={`l-${key++}`}
          className={cn(
            'my-1 space-y-1 pl-6',
            list.kind === 'ul' ? 'list-disc' : 'list-decimal',
          )}
        >
          {list.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </Tag>,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ul) {
      flushPara();
      if (!list || list.kind !== 'ul') {
        flushList();
        list = { kind: 'ul', items: [] };
      }
      list.items.push(ul[1] ?? '');
      continue;
    }
    if (ol) {
      flushPara();
      if (!list || list.kind !== 'ol') {
        flushList();
        list = { kind: 'ol', items: [] };
      }
      list.items.push(ol[1] ?? '');
      continue;
    }
    if (line.trim() === '') {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();

  return <div className="space-y-2">{nodes}</div>;
}

export function Markdown({ content }: { content: string }) {
  const tokens = React.useMemo(() => tokenize(content), [content]);
  return (
    <div className="text-sm">
      {tokens.map((tok, i) =>
        tok.type === 'code' ? (
          <CodeBlock key={i} language={tok.language} value={tok.value} />
        ) : (
          <React.Fragment key={i}>{renderTextBlock(tok.value, i * 100)}</React.Fragment>
        ),
      )}
    </div>
  );
}
