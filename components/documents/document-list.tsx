'use client';

import * as React from 'react';
import { FileText, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export interface DocumentEntry {
  id: number;
  filename: string;
  uploaded_at: string;
  chunk_count: number;
}

interface DocumentListProps {
  documents: DocumentEntry[] | null;
  loading: boolean;
  onChanged: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function DocumentList({
  documents,
  loading,
  onChanged,
}: DocumentListProps) {
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const remove = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      toast.success('Document removed');
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast.error('Delete failed', { description: message });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && !documents) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
        No documents yet. Upload one above.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {documents.map((d) => (
        <li
          key={d.id}
          className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm"
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{d.filename}</p>
            <p className="text-[11px] text-muted-foreground">
              {d.chunk_count} chunk{d.chunk_count === 1 ? '' : 's'} ·{' '}
              {formatDate(d.uploaded_at)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${d.filename}`}
            disabled={deletingId === d.id}
            onClick={() => void remove(d.id)}
          >
            {deletingId === d.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </li>
      ))}
    </ul>
  );
}
