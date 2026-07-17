// Slim translucent top bar for the mobile layout. Holds the app mark and the
// core actions (open image, adjustments toggle, export, log out) as compact
// icon buttons, so the image below can run full-bleed.

import type { ChangeEvent, ReactNode } from "react";

const ACCEPTED_EXTENSIONS =
  ".nef,.raf,.cr2,.cr3,.arw,.dng,.orf,.jpg,.jpeg,.png,.tif,.tiff,.webp";

const BTN_BASE =
  "flex size-9 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40";
const BTN_IDLE = "text-neutral-300 active:bg-white/10";
const BTN_ACTIVE = "bg-white/15 text-white";
const BTN_ACCENT = "bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white shadow";

function IconButton({
  label,
  onClick,
  disabled,
  active,
  accent,
  id,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  accent?: boolean;
  id?: string;
  children: ReactNode;
}) {
  const variant = active ? BTN_ACTIVE : accent ? BTN_ACCENT : BTN_IDLE;
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`${BTN_BASE} ${variant}`}
    >
      {children}
    </button>
  );
}

interface MobileTopBarProps {
  hasImage: boolean;
  adjustmentsOpen: boolean;
  onToggleAdjustments: () => void;
  onFileSelected: (file: File) => void;
  isDecoding: boolean;
  onExport: () => void;
  isExporting: boolean;
  onLogout: () => void;
}

export function MobileTopBar({
  hasImage,
  adjustmentsOpen,
  onToggleAdjustments,
  onFileSelected,
  isDecoding,
  onExport,
  isExporting,
  onLogout,
}: MobileTopBarProps) {
  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
    event.target.value = "";
  }

  return (
    <header className="glass glass-dark fixed inset-x-0 top-0 z-30 flex items-center justify-between px-3 py-2">
      <span className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-neutral-800 text-xs font-bold text-neutral-100 ring-1 ring-white/10">
          F
        </span>
        <span className="text-sm font-semibold text-neutral-100">Film Recipes</span>
      </span>

      <div className="flex items-center gap-1">
        {/* Open image — hidden file input styled as a button. */}
        <label
          aria-label="Open image"
          className={`${BTN_BASE} ${BTN_IDLE} ${isDecoding ? "pointer-events-none opacity-40" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 15l4-4a2 2 0 0 1 2.8 0L15 16" />
            <path d="M14 14l1.5-1.5a2 2 0 0 1 2.8 0L21 15" />
            <circle cx="15" cy="8" r="1.4" fill="currentColor" stroke="none" />
          </svg>
          <input
            id="file"
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            disabled={isDecoding}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </label>

        {hasImage && (
          <>
            <IconButton label="Adjustments" active={adjustmentsOpen} onClick={onToggleAdjustments}>
              <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4" />
                <circle cx="16" cy="6" r="2" fill="currentColor" stroke="none" />
                <circle cx="8" cy="12" r="2" fill="currentColor" stroke="none" />
                <circle cx="14" cy="18" r="2" fill="currentColor" stroke="none" />
              </svg>
            </IconButton>

            <IconButton id="export-jpeg" accent label={isExporting ? "Exporting…" : "Export JPEG"} disabled={isExporting} onClick={onExport}>
              <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v11" />
                <path d="M8 10l4 4 4-4" />
                <path d="M4 20h16" />
              </svg>
            </IconButton>
          </>
        )}

        <IconButton label="Log out" onClick={onLogout}>
          <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 12H4" />
            <path d="M9 7l-5 5 5 5" />
            <path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
          </svg>
        </IconButton>
      </div>
    </header>
  );
}
