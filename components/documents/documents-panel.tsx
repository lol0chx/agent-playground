'use client';

import * as React from 'react';
import { Library } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DocumentUploader } from '@/components/documents/document-uploader';
import {
  DocumentList,
  type DocumentEntry,
} from '@/components/documents/document-list';

export function DocumentsPanel() {
  const [open, setOpen] = React.useState(false);
  const [documents, setDocuments] = React.useState<DocumentEntry[] | null>(
    null,
  );
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents');
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = (await res.json()) as { documents: DocumentEntry[] };
      setDocuments(data.documents);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load';
      toast.error('Could not list documents', { description: message });
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open && documents === null) {
      void refresh();
    }
  }, [open, documents, refresh]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Library className="h-4 w-4" />
          <span className="hidden sm:inline">Docs</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Documents</DialogTitle>
          <DialogDescription>
            Upload .pdf, .md, or .txt files. They&apos;re chunked, embedded with
            OpenAI <code className="text-[0.85em]">text-embedding-3-small</code>
            , and stored in pgvector. The <code>search_docs</code> tool will
            then find relevant chunks at chat time.
          </DialogDescription>
        </DialogHeader>
        <DocumentUploader onUploaded={refresh} />
        <DocumentList
          documents={documents}
          loading={loading}
          onChanged={refresh}
        />
      </DialogContent>
    </Dialog>
  );
}
