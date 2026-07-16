import { useState, type ChangeEvent, type DragEvent } from "react";

const ACCEPTED_EXTENSIONS = ".nef,.raf,.cr2,.cr3,.arw,.dng,.orf";

interface ImportZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ImportZone({ onFileSelected, disabled, compact }: ImportZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
    // Reset so selecting the same file again still fires a change event.
    event.target.value = "";
  }

  if (compact) {
    return (
      <label className="glass glass-hover cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-neutral-200 transition-colors">
        Open RAW
        <input
          id="file"
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          disabled={disabled}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </label>
    );
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center shadow-xl backdrop-blur-xl transition-colors ${
        isDragOver ? "border-neutral-300/70 bg-white/15" : "border-white/25 bg-white/8"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <p className="text-sm text-neutral-300">Drag a RAW file here, or</p>
      <label className="cursor-pointer rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white">
        Choose file
        <input
          id="file"
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          disabled={disabled}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </label>
      <p className="text-xs text-neutral-500">NEF, RAF, CR2, CR3, ARW, DNG, ORF</p>
    </div>
  );
}
