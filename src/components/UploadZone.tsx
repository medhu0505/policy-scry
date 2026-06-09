import { useCallback, useRef, useState } from "react";
import { FileText, ScrollText, UploadCloud, CheckCircle2 } from "lucide-react";

interface Props {
  label: string;
  description: string;
  accept: string;
  icon: "doc" | "rules";
  file: File | null;
  meta: string | null;
  uploading: boolean;
  onFile: (file: File) => void;
}

export function UploadZone({
  label,
  description,
  accept,
  icon,
  file,
  meta,
  uploading,
  onFile,
}: Props) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const f = files?.[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  const Icon = icon === "doc" ? FileText : ScrollText;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={[
        "group relative flex h-72 cursor-pointer flex-col items-center justify-center gap-4",
        "rounded-lg border-2 border-dashed bg-surface/40 px-8 py-10 transition-all",
        drag
          ? "border-cyan glow-cyan bg-surface"
          : "border-border hover:border-cyan/60 hover:bg-surface/70",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex h-14 w-14 items-center justify-center rounded-md border border-cyan/30 bg-cyan/5 text-cyan">
        {file ? <CheckCircle2 className="h-7 w-7" /> : <Icon className="h-7 w-7" />}
      </div>

      <div className="text-center">
        <div className="text-mono text-xs uppercase tracking-[0.18em] text-cyan">
          {label}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">{description}</div>
      </div>

      {file ? (
        <div className="mt-1 w-full max-w-xs rounded border border-border bg-background/60 px-3 py-2 text-center">
          <div className="text-mono truncate text-xs text-foreground">
            {file.name}
          </div>
          <div className="text-mono mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {uploading ? "Uploading..." : meta ?? `${(file.size / 1024).toFixed(1)} KB`}
          </div>
        </div>
      ) : (
        <div className="text-mono flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <UploadCloud className="h-3.5 w-3.5" />
          Drop file or click to browse
        </div>
      )}
    </div>
  );
}
