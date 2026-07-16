import { useEffect, useMemo, useRef, useState } from "react";
import { GlPreview } from "@fuji-recipes/gl-pipeline";
import { decode, exportJpeg, getNamedRecipes } from "@fuji-recipes/processing-web";
import { NAMED_RECIPES } from "@fuji-recipes/recipes-catalog";
import type { Recipe } from "@fuji-recipes/core-types";
import { useEditorStore } from "./store";
import { ImportZone } from "./components/ImportZone";
import { RecipeSelector } from "./components/RecipeSelector";
import { AdjustmentsPanel } from "./components/AdjustmentsPanel";
import { BeforeAfterToggle } from "./components/BeforeAfterToggle";
import { ClearDataButton } from "./components/ClearDataButton";

const EXPORT_JPEG_QUALITY = 92;

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<GlPreview | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ w: 960, h: 640 });

  const status = useEditorStore((s) => s.status);
  const decoded = useEditorStore((s) => s.decoded);
  const namedRecipes = useEditorStore((s) => s.namedRecipes);
  const selectedRecipeId = useEditorStore((s) => s.selectedRecipeId);
  const manual = useEditorStore((s) => s.manual);
  const showOriginal = useEditorStore((s) => s.showOriginal);
  const setStatus = useEditorStore((s) => s.setStatus);
  const setNamedRecipes = useEditorStore((s) => s.setNamedRecipes);
  const setDecoded = useEditorStore((s) => s.setDecoded);
  const setSelectedRecipeId = useEditorStore((s) => s.setSelectedRecipeId);
  const setShowOriginal = useEditorStore((s) => s.setShowOriginal);
  const resetManual = useEditorStore((s) => s.resetManual);

  // One-time setup: compile the GL preview program and load the named
  // community recipes from Rust (via WASM).
  useEffect(() => {
    if (canvasRef.current) {
      previewRef.current = new GlPreview(canvasRef.current);
    }
    getNamedRecipes()
      .then((named) => {
        setNamedRecipes(named);
        setStatus("WASM ready. Choose a RAW file.");
      })
      .catch((err) => setStatus(`Failed to initialize: ${err}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve the selected catalog id to an actual Recipe: named recipes pair
  // positionally with the Rust `named_recipes_json` order that NAMED_RECIPES
  // mirrors.
  const recipesById = useMemo(() => {
    const map = new Map<string, Recipe>();
    NAMED_RECIPES.forEach((entry, i) => {
      const recipe = namedRecipes[i];
      if (recipe) map.set(entry.id, recipe);
    });
    return map;
  }, [namedRecipes]);

  const selectedRecipe = recipesById.get(selectedRecipeId) ?? null;

  // Cheap GPU-only redraw on every recipe/exposure/before-after change — no
  // re-decode, per the plan's "decode once, GPU-only interaction" design.
  useEffect(() => {
    if (!previewRef.current || !decoded || !selectedRecipe) return;
    previewRef.current.draw(showOriginal, selectedRecipe, manual);
  }, [decoded, selectedRecipe, manual, showOriginal]);

  async function handleFileSelected(file: File) {
    if (!previewRef.current) return;
    setIsDecoding(true);
    setStatus(`Decoding ${file.name}…`);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const image = await decode(bytes);
      previewRef.current.uploadImage(image.rgba, image.width, image.height);
      setCanvasSize({ w: image.width, h: image.height });
      setZoom(1);
      setDecoded(image);
      setStatus(`Decoded ${image.width}x${image.height}. Pick a recipe and adjust exposure below.`);
    } catch (err) {
      setStatus(`Decode failed: ${err}`);
    } finally {
      setIsDecoding(false);
    }
  }

  async function handleExport() {
    if (!decoded || !selectedRecipe) return;
    setIsExporting(true);
    setStatus("Exporting JPEG…");
    try {
      const jpegBytes = await exportJpeg(decoded, selectedRecipe, manual, EXPORT_JPEG_QUALITY);
      const blob = new Blob([new Uint8Array(jpegBytes)], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "fuji-recipe-export.jpg";
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Exported JPEG.");
    } catch (err) {
      setStatus(`Export failed: ${err}`);
    } finally {
      setIsExporting(false);
    }
  }

  // Clearing app data also unloads the current image from the screen and
  // resets the edit state, so the user returns to the empty import prompt.
  function handleCleared() {
    setDecoded(null);
    resetManual();
    setShowOriginal(false);
    setCanvasSize({ w: 960, h: 640 });
    setZoom(1);
    setStatus("All app data cleared.");
  }

  const ZOOM_STEP = 1.25;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 6;
  function zoomIn() {
    setZoom((z) => Math.min(ZOOM_MAX, +(z * ZOOM_STEP).toFixed(2)));
  }
  function zoomOut() {
    setZoom((z) => Math.max(ZOOM_MIN, +(z / ZOOM_STEP).toFixed(2)));
  }

  const hasImage = decoded !== null;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-neutral-800 text-neutral-100">
      {/* Image stage. Canvas is always mounted so GlPreview can attach on
          first render; it stays hidden until an image is decoded. The canvas
          is sized to the full viewport height with width following the
          image's aspect ratio (`h-full w-auto`) — so portrait images fit the
          screen height without being rotated or stretched. `zoom` scales it
          up for inspecting detail; `overflow-hidden` on <main> clips it. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          style={{ transform: `scale(${zoom})` }}
          className={`h-full w-auto origin-center ${hasImage ? "" : "invisible"}`}
        />
      </div>

      {/* Top overlay: title/status on the left, actions on the right. */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div>
          <h1 className="text-lg font-semibold">Fuji Recipes</h1>
          <p id="status" className="text-xs text-neutral-300">
            {status}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasImage && (
            <>
              <ImportZone onFileSelected={handleFileSelected} disabled={isDecoding} compact />
              <BeforeAfterToggle showOriginal={showOriginal} onShowOriginalChange={setShowOriginal} />
              <button
                id="export-jpeg"
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="glass glass-hover rounded-md px-4 py-1.5 text-sm font-medium text-neutral-50 transition-colors disabled:opacity-50"
              >
                {isExporting ? "Exporting…" : "Export JPEG"}
              </button>
            </>
          )}
          <ClearDataButton onCleared={handleCleared} />
        </div>
      </header>

      {/* Centered import prompt while there's no image. */}
      {!hasImage && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <ImportZone onFileSelected={handleFileSelected} disabled={isDecoding} />
          </div>
        </div>
      )}

      {/* Zoom controls for inspecting detail (scales the full-res canvas). */}
      {hasImage && (
        <div className="glass glass-dark absolute bottom-3 right-4 z-30 flex items-center gap-1 rounded-full p-1 text-neutral-100">
          <button
            id="zoom-out"
            type="button"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            aria-label="Zoom out"
            className="glass-hover flex size-7 items-center justify-center rounded-full text-lg leading-none disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-12 text-center text-xs tabular-nums text-neutral-300">{Math.round(zoom * 100)}%</span>
          <button
            id="zoom-in"
            type="button"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            aria-label="Zoom in"
            className="glass-hover flex size-7 items-center justify-center rounded-full text-lg leading-none disabled:opacity-40"
          >
            +
          </button>
        </div>
      )}

      {/* Recipe chip strip along the bottom, sitting in front of a 50px
          dark-grey footer whose gradient goes from transparent at the top to
          ~80% opacity at the bottom. */}
      {hasImage && (
        <div className="absolute inset-x-0 bottom-0 z-20">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[50px] bg-gradient-to-b from-transparent to-neutral-900/80" />
          <div className="relative px-4 pb-3 pt-6">
            <RecipeSelector value={selectedRecipeId} onValueChange={setSelectedRecipeId} disabled={!hasImage} />
          </div>
        </div>
      )}

      {/* Floating, draggable adjustments window. */}
      {hasImage && <AdjustmentsPanel disabled={showOriginal} />}
    </main>
  );
}
