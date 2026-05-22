'use client';

import * as React from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'text/markdown': ['.md'],
  'text/plain': ['.txt'],
};

const MAX_BYTES = 5 * 1024 * 1024;

interface DocumentUploaderProps {
  onUploaded: () => void;
}

export function DocumentUploader({ onUploaded }: DocumentUploaderProps) {
  const [uploading, setUploading] = React.useState(false);

  const upload = React.useCallback(
    async (file: File) => {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/documents', {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? `Upload failed: ${res.status}`);
        }
        const data = (await res.json()) as { filename: string; chunks: number };
        toast.success('Document indexed', {
          description: `${data.filename} · ${data.chunks} chunks embedded`,
        });
        onUploaded();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        toast.error('Upload failed', { description: message });
      } finally {
        setUploading(false);
      }
    },
    [onUploaded],
  );

  const onDrop = React.useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const r = rejections[0];
        const reason = r?.errors[0]?.message ?? 'File rejected';
        toast.error('Rejected', { description: reason });
        return;
      }
      const file = accepted[0];
      if (file) void upload(file);
    },
    [upload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_BYTES,
    multiple: false,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/40',
        uploading && 'pointer-events-none opacity-60',
      )}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <Upload className="h-6 w-6 text-muted-foreground" />
      )}
      <div className="space-y-0.5 text-sm">
        <p className="font-medium">
          {uploading
            ? 'Embedding…'
            : isDragActive
              ? 'Drop the file to index it'
              : 'Drop a .pdf, .md, or .txt file'}
        </p>
        <p className="text-xs text-muted-foreground">
          Max 5 MB · chunked, embedded, and stored in pgvector
        </p>
      </div>
    </div>
  );
}
