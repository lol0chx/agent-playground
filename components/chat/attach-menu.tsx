'use client';

import * as React from 'react';
import { ImagePlus, Library, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

interface AttachMenuProps {
  onPickImages: (files: File[]) => void;
  onOpenDocuments: () => void;
  disabled?: boolean;
}

export function AttachMenu({
  onPickImages,
  onOpenDocuments,
  disabled,
}: AttachMenuProps) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const accepted: File[] = [];
    for (const f of Array.from(fileList)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(f.type)) {
        toast.error('Unsupported image type', {
          description: `${f.name}: only PNG, JPEG, WebP, GIF are allowed.`,
        });
        continue;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error('Image too large', {
          description: `${f.name}: max ${MAX_IMAGE_BYTES / 1024 / 1024} MB per image.`,
        });
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length > 0) onPickImages(accepted);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          // reset so picking the same file twice fires onChange again
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled}
        aria-label="Attach"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 shrink-0"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute bottom-full left-0 z-30 mb-2 w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
            'animate-in fade-in-0 zoom-in-95',
          )}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              setOpen(false);
              fileInputRef.current?.click();
            }}
          >
            <ImagePlus className="h-4 w-4" />
            <div className="flex flex-col">
              <span className="font-medium">Attach image</span>
              <span className="text-[11px] text-muted-foreground">
                PNG, JPEG, WebP, GIF · max 3&nbsp;MB
              </span>
            </div>
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              setOpen(false);
              onOpenDocuments();
            }}
          >
            <Library className="h-4 w-4" />
            <div className="flex flex-col">
              <span className="font-medium">Documents</span>
              <span className="text-[11px] text-muted-foreground">
                Upload & manage the searchable library
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
