// Collapsed vertical icon rail pinned to the far left. Holds the app mark at
// the top and quick actions (open image, adjustments, export) plus clear-data
// and account/login at the bottom. The recipe list panel docks directly to
// its right edge. Every item shows a hover tooltip since it's icon-only.

import type { ChangeEvent, ReactNode } from "react";

const ACCEPTED_EXTENSIONS =
  ".nef,.raf,.cr2,.cr3,.arw,.dng,.orf,.jpg,.jpeg,.png,.tif,.tiff,.webp";

const RAIL_BUTTON_BASE =
  "group relative flex size-10 items-center justify-center rounded-xl transition-all duration-200 ease-out hover:scale-105 disabled:pointer-events-none disabled:opacity-40";
const RAIL_BUTTON_IDLE = "text-neutral-400 hover:bg-white/8 hover:text-neutral-100";
const RAIL_BUTTON_ACTIVE = "bg-white/15 text-white";
const RAIL_BUTTON_ACCENT =
  "bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white shadow-lg hover:from-fuchsia-400 hover:to-indigo-400";

/** Styled hover tooltip that floats to the right of an icon-only rail item. */
function Tooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-md bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-100 opacity-0 shadow-lg ring-1 ring-white/10 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
    >
      {label}
    </span>
  );
}

interface RailButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  /** Highlight the button with the app's purple accent (used for Export). */
  accent?: boolean;
  id?: string;
  onClick?: () => void;
  children: ReactNode;
}

function RailButton({ label, active, disabled, accent, id, onClick, children }: RailButtonProps) {
  const variant = active ? RAIL_BUTTON_ACTIVE : accent ? RAIL_BUTTON_ACCENT : RAIL_BUTTON_IDLE;
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`${RAIL_BUTTON_BASE} ${variant}`}
    >
      {children}
      <Tooltip label={label} />
    </button>
  );
}

interface IconSidebarProps {
  hasImage: boolean;
  adjustmentsOpen: boolean;
  onToggleAdjustments: () => void;
  onFileSelected: (file: File) => void;
  isDecoding: boolean;
  onExport: () => void;
  isExporting: boolean;
  onClearData: () => void;
  isClearing: boolean;
  onLogin: () => void;
}

export function IconSidebar({
  hasImage,
  adjustmentsOpen,
  onToggleAdjustments,
  onFileSelected,
  isDecoding,
  onExport,
  isExporting,
  onClearData,
  isClearing,
  onLogin,
}: IconSidebarProps) {
  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
    // Reset so selecting the same file again still fires a change event.
    event.target.value = "";
  }

  return (
    <nav className="absolute inset-y-0 left-0 z-30 flex w-14 flex-col items-center gap-1 border-r border-white/10 bg-neutral-900/70 py-3 backdrop-blur-xl">
      {/* App mark */}
      <div className="group relative mb-2 flex size-10 items-center justify-center rounded-xl bg-neutral-800 text-sm font-bold text-neutral-100 shadow-lg ring-1 ring-white/10">
        F
        <Tooltip label="Fuji Recipes" />
      </div>

      {hasImage && (
        <>
          {/* Open image — hidden file input styled as a rail button. */}
          <label
            aria-label="Open image"
            className={`${RAIL_BUTTON_BASE} ${RAIL_BUTTON_IDLE} ${isDecoding ? "pointer-events-none opacity-40" : "cursor-pointer"}`}
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
            <Tooltip label="Open image" />
          </label>

          <RailButton label="Adjustments" active={adjustmentsOpen} onClick={onToggleAdjustments}>
            <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4" />
              <circle cx="16" cy="6" r="2" fill="currentColor" stroke="none" />
              <circle cx="8" cy="12" r="2" fill="currentColor" stroke="none" />
              <circle cx="14" cy="18" r="2" fill="currentColor" stroke="none" />
            </svg>
          </RailButton>

          <RailButton id="export-jpeg" accent label={isExporting ? "Exporting…" : "Export JPEG"} disabled={isExporting} onClick={onExport}>
            <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v11" />
              <path d="M8 10l4 4 4-4" />
              <path d="M4 20h16" />
            </svg>
          </RailButton>
        </>
      )}

      {/* Clear data + account/login — pinned to the bottom */}
      <div className="mt-auto flex flex-col items-center gap-1">
        <RailButton id="clear-all-data" label={isClearing ? "Clearing…" : "Clear all app data"} disabled={isClearing} onClick={onClearData}>
          <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            <path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </RailButton>

        <RailButton label="Log out" onClick={onLogin}>
          <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 12H4" />
            <path d="M9 7l-5 5 5 5" />
            <path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
          </svg>
        </RailButton>
      </div>
    </nav>
  );
}
