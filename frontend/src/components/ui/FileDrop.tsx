'use client';

import { useRef, useState, type DragEvent } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';

/**
 * Accessible drag-and-drop file picker with client-side type/size guards.
 * Server-side validation is still mandatory (magic-byte sniffing, AV scan).
 */
export function FileDrop({
  onFiles,
  accept = '.csv,.xlsx,.pdf,.jpg,.jpeg,.png',
  multiple = false,
  maxSizeMb = 10,
  label = 'Drag a file here or click to browse',
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const accepted = accept.split(',').map((a) => a.trim().toLowerCase());

  const handle = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list);
    for (const f of picked) {
      const ext = `.${f.name.split('.').pop()?.toLowerCase()}`;
      if (!accepted.includes(ext)) {
        setError(`"${f.name}" is not an accepted file type (${accept}).`);
        return;
      }
      if (f.size > maxSizeMb * 1024 * 1024) {
        setError(`"${f.name}" exceeds the ${maxSizeMb} MB limit.`);
        return;
      }
    }
    setError(null);
    const next = multiple ? [...files, ...picked] : picked.slice(0, 1);
    setFiles(next);
    onFiles(next);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handle(e.dataTransfer.files);
  };

  const remove = (i: number) => {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    onFiles(next);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition',
          dragging
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400',
        )}
      >
        <UploadCloud className="mb-2 size-7 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="mt-1 text-xs text-slate-500">
          {accept} · up to {maxSizeMb} MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handle(e.target.files)}
        />
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {files.map((f, i) => (
        <div
          key={`${f.name}-${i}`}
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
        >
          <FileText className="size-4 shrink-0 text-slate-400" />
          <span className="flex-1 truncate text-sm text-slate-700">{f.name}</span>
          <span className="text-xs text-slate-400">{formatBytes(f.size)}</span>
          <button onClick={() => remove(i)} aria-label={`Remove ${f.name}`}>
            <X className="size-4 text-slate-400 hover:text-rose-600" />
          </button>
        </div>
      ))}
    </div>
  );
}
