import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlPreview, RecipeThumbnailRenderer } from "@film-recipes/gl-pipeline";
import { decode, exportJpeg, getNamedRecipes } from "@film-recipes/processing-web";
import { adaptRecipe, adaptManual } from "@film-recipes/adaptive";
import { NAMED_RECIPES } from "@film-recipes/recipes-catalog";
import { clearAllData } from "@film-recipes/storage";
import type { ManualAdjustments, Recipe } from "@film-recipes/core-types";
import { useEditorStore, NEUTRAL_MANUAL } from "./store";
import { useAuthStore } from "./auth";
import { useIsMobile, isMobileViewport } from "./hooks/useIsMobile";
import { useImageGestures } from "./hooks/useImageGestures";
import { ImportZone } from "./components/ImportZone";
import { RecipeSelector } from "./components/RecipeSelector";
import { AdjustmentsPanel } from "./components/AdjustmentsPanel";
import { IconSidebar } from "./components/IconSidebar";
import { SplitSlider } from "./components/SplitSlider";
import { MobileTopBar } from "./components/mobile/MobileTopBar";
import { RecipeCarousel } from "./components/mobile/RecipeCarousel";

const EXPORT_JPEG_QUALITY = 92;

// Numeric manual fields the auto-adapt tween interpolates. color_grade is set at
// the end of the tween (it isn't a scalar we can lerp frame-by-frame).
const ANIMATED_FIELDS = [
  "exposure",
  "white_balance",
  "contrast",
  "highlights",
  "shadows",
  "saturation",
  "black_level",
  "white_level",
] as const;

const ADAPT_ANIM_MS = 550;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// easeInOutQuad — gentle acceleration in, gentle deceleration out.
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<GlPreview | null>(null);
  const thumbRendererRef = useRef<RecipeThumbnailRenderer | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ w: 960, h: 640 });
  // Preview cross-fade: a brief opacity dip → rise whenever a new recipe is
  // applied, so the newly graded look eases in rather than snapping.
  const [previewOpacity, setPreviewOpacity] = useState(1);
  const [fadeInstant, setFadeInstant] = useState(false);
  // Handle of the in-flight slider tween, so a new adaptation cancels the old.
  const adaptAnimRef = useRef<number | null>(null);
  // Adjustments start hidden on mobile (revealed via the top-bar toggle) and
  // docked-open on desktop.
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(() => !isMobileViewport());

  const status = useEditorStore((s) => s.status);
  const decoded = useEditorStore((s) => s.decoded);
  const namedRecipes = useEditorStore((s) => s.namedRecipes);
  const selectedRecipeId = useEditorStore((s) => s.selectedRecipeId);
  const manual = useEditorStore((s) => s.manual);
  const splitX = useEditorStore((s) => s.splitX);
  const recipeThumbnails = useEditorStore((s) => s.recipeThumbnails);
  const setStatus = useEditorStore((s) => s.setStatus);
  const setNamedRecipes = useEditorStore((s) => s.setNamedRecipes);
  const setDecoded = useEditorStore((s) => s.setDecoded);
  const setSelectedRecipeId = useEditorStore((s) => s.setSelectedRecipeId);
  const setSplitX = useEditorStore((s) => s.setSplitX);
  const setManual = useEditorStore((s) => s.setManual);
  const resetManual = useEditorStore((s) => s.resetManual);
  const setRecipeThumbnails = useEditorStore((s) => s.setRecipeThumbnails);
  const lastPrediction = useEditorStore((s) => s.lastPrediction);
  const adaptStrength = useEditorStore((s) => s.adaptStrength);
  const setLastPrediction = useEditorStore((s) => s.setLastPrediction);
  const setAdaptStrength = useEditorStore((s) => s.setAdaptStrength);
  const signOut = useAuthStore((s) => s.signOut);

  const isMobile = useIsMobile();

  // Mobile shows the fully-graded recipe (split at 0). Press-and-hold on the
  // image temporarily swings the split to 1 to reveal the untouched original.
  const handlePeek = useCallback((peeking: boolean) => setSplitX(peeking ? 1 : 0), [setSplitX]);
  const gestures = useImageGestures({ enabled: isMobile, onPeekChange: handlePeek });

  // Entering the mobile layout parks the before/after split on the recipe.
  useEffect(() => {
    if (isMobile) setSplitX(0);
  }, [isMobile, setSplitX]);

  // One-time setup: compile the GL preview program and load the named
  // community recipes from Rust (via WASM).
  useEffect(() => {
    if (canvasRef.current) {
      previewRef.current = new GlPreview(canvasRef.current);
    }
    getNamedRecipes()
      .then((named) => {
        setNamedRecipes(named);
        setStatus("Ready. Choose an image file.");
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
    previewRef.current.draw(splitX, selectedRecipe, manual);
  }, [decoded, selectedRecipe, manual, splitX]);

  // Subtle "apply" fade: drop the preview opacity instantly (transition off),
  // then ease it back to full on the next frame so the new grade fades in.
  const pulsePreview = useCallback(() => {
    if (prefersReducedMotion()) return;
    setFadeInstant(true);
    setPreviewOpacity(0.4);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFadeInstant(false);
        setPreviewOpacity(1);
      });
    });
  }, []);

  // Tween the manual sliders from their current values to `target` so the
  // handles glide and the preview eases into the adapted grade.
  const animateManualTo = useCallback(
    (target: ManualAdjustments) => {
      if (adaptAnimRef.current !== null) cancelAnimationFrame(adaptAnimRef.current);
      if (prefersReducedMotion()) {
        setManual({ ...target });
        adaptAnimRef.current = null;
        return;
      }
      const from = useEditorStore.getState().manual;
      const start = performance.now();
      const step = (now: number) => {
        const k = easeInOut(Math.min(1, (now - start) / ADAPT_ANIM_MS));
        const patch: Partial<ManualAdjustments> = {};
        for (const field of ANIMATED_FIELDS) {
          patch[field] = from[field] + (target[field] - from[field]) * k;
        }
        setManual(patch);
        if (k < 1) {
          adaptAnimRef.current = requestAnimationFrame(step);
        } else {
          setManual({ ...target });
          adaptAnimRef.current = null;
        }
      };
      adaptAnimRef.current = requestAnimationFrame(step);
    },
    [setManual],
  );

  // Cancel any in-flight tween on unmount.
  useEffect(() => () => {
    if (adaptAnimRef.current !== null) cancelAnimationFrame(adaptAnimRef.current);
  }, []);

  // On-device "AI", applied automatically: whenever a new photo is loaded or the
  // recipe changes, analyze the photo, calibrate the selected recipe to it, and
  // ease the predicted grade onto the sliders. Fully local — nothing about the
  // image leaves the device. Manual slider tweaks do NOT retrigger this (it does
  // not depend on `manual`), so hand-edits are preserved until the next
  // photo/recipe change.
  useEffect(() => {
    if (!decoded || !selectedRecipe) return;
    const { prediction, manual: adapted } = adaptRecipe(decoded, selectedRecipe, selectedRecipeId);
    setLastPrediction(prediction);
    setAdaptStrength(prediction.strength);
    pulsePreview();
    animateManualTo(adapted);
    setStatus(
      `Adapted for ${prediction.analysis_context.scene.replace("_", " ")} · ${prediction.analysis_context.exposure_bias_detected.replace(/_/g, " ")}.`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decoded, selectedRecipeId, recipesById]);

  async function handleFileSelected(file: File) {
    if (!previewRef.current) return;
    setIsDecoding(true);
    setStatus(`Decoding ${file.name}…`);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const image = await decode(bytes, file.name);
      previewRef.current.uploadImage(image.rgba, image.width, image.height);
      setCanvasSize({ w: image.width, h: image.height });
      setZoom(1);
      // A fresh photo always starts from the top-of-list recipe, not whatever
      // was last selected in the session. The auto-adapt effect then calibrates
      // it to this photo.
      setSelectedRecipeId(NAMED_RECIPES[0].id);
      setDecoded(image);
      setRecipeThumbnails({});
      // A fresh photo invalidates any prior adaptive prediction.
      setLastPrediction(null);
      setAdaptStrength(100);
      setStatus(`Decoded ${image.width}x${image.height}. Pick a recipe and fine-tune with the sliders.`);
      // Pre-render each recipe on a tiny proxy of this photo so the list shows
      // the actual expected result per look. Runs after the main image is up.
      void generateThumbnails(image);
    } catch (err) {
      setStatus(`Decode failed: ${err}`);
    } finally {
      setIsDecoding(false);
    }
  }

  // Bake a 50px preview of the just-decoded photo for every recipe. Updates
  // the store in small batches so swatches fade in progressively rather than
  // all-at-once after a long pause.
  async function generateThumbnails(image: { rgba: Uint8Array; width: number; height: number }) {
    if (!thumbRendererRef.current) thumbRendererRef.current = new RecipeThumbnailRenderer(100);
    const renderer = thumbRendererRef.current;
    await renderer.setImage(image.rgba, image.width, image.height);

    const next: Record<string, string> = {};
    for (let i = 0; i < NAMED_RECIPES.length; i++) {
      const entry = NAMED_RECIPES[i];
      const recipe = namedRecipes[i];
      if (!recipe) continue;
      next[entry.id] = renderer.render(recipe, NEUTRAL_MANUAL);
      // Flush a batch every 6 recipes, yielding to the event loop. Uses
      // setTimeout (not rAF, which is throttled/paused in background tabs) so
      // generation always completes even if the window isn't focused.
      if (i % 6 === 5) {
        setRecipeThumbnails({ ...next });
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    setRecipeThumbnails({ ...next });
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
      link.download = "film-recipe-export.jpg";
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Exported JPEG.");
    } catch (err) {
      setStatus(`Export failed: ${err}`);
    } finally {
      setIsExporting(false);
    }
  }

  // Re-scale the cached prediction's deltas as the strength slider moves — no
  // re-analysis, just a cheap re-blend. Cancels any in-flight adapt tween so a
  // drag takes over immediately.
  function handleStrengthChange(strength: number) {
    if (adaptAnimRef.current !== null) {
      cancelAnimationFrame(adaptAnimRef.current);
      adaptAnimRef.current = null;
    }
    setAdaptStrength(strength);
    if (lastPrediction) setManual(adaptManual(lastPrediction, strength));
  }

  // Wipes every saved preset from IndexedDB. Irreversible, so it confirms with
  // the user first, then unloads the current image and resets the edit state
  // so the user returns to the empty import prompt.
  async function handleClearData() {
    const confirmed = window.confirm(
      "Clear all app data? This permanently deletes every saved preset from this device and cannot be undone.",
    );
    if (!confirmed) return;

    setIsClearing(true);
    try {
      await clearAllData();
      setDecoded(null);
      resetManual();
      setLastPrediction(null);
      setAdaptStrength(100);
      setSplitX(0.5);
      setRecipeThumbnails({});
      setCanvasSize({ w: 960, h: 640 });
      setZoom(1);
      setStatus("All app data cleared.");
    } finally {
      setIsClearing(false);
    }
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

  // Left inset for the image stage: icon rail (56px) + recipe panel (272px)
  // when an image is loaded, otherwise just the rail.
  const stagePadding = hasImage ? "pl-[328px]" : "pl-14";

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-neutral-800 text-neutral-100">
      {/* Shared image stage. The canvas is always mounted (never remounted on a
          mobile/desktop swap) so GlPreview keeps its context and uploaded
          image. On desktop it insets right of the rail + recipe panel and is
          scaled by the zoom buttons; on mobile it runs full-bleed and is
          panned/pinch-zoomed via touch gestures. */}
      <div
        className={
          isMobile
            ? "absolute inset-0 flex items-center justify-center"
            : `absolute inset-0 flex items-center justify-center p-4 transition-all duration-500 ease-out ${stagePadding}`
        }
        style={isMobile ? { touchAction: "none" } : undefined}
        {...(isMobile ? gestures.handlers : {})}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          style={{
            ...(isMobile
              ? {
                  transform: `translate3d(${gestures.transform.x}px, ${gestures.transform.y}px, 0) scale(${gestures.transform.scale})`,
                }
              : { transform: `scale(${zoom})` }),
            opacity: hasImage && !isDecoding ? previewOpacity : 0,
          }}
          className={`max-h-full max-w-full origin-center ${
            fadeInstant ? "" : "transition-opacity duration-500 ease-out"
          } ${isMobile ? "" : "rounded-lg"}`}
        />
      </div>

      {/* Loading veil shown while a file is being decoded (shared). */}
      {isDecoding && (
        <div className="animate-fade-in absolute inset-0 z-40 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="size-10 animate-spin rounded-full border-2 border-white/25 border-t-white/90" />
            <span className="text-sm font-medium text-neutral-200">Decoding…</span>
          </div>
        </div>
      )}

      {isMobile ? (
        <>
          <MobileTopBar
            hasImage={hasImage}
            adjustmentsOpen={adjustmentsOpen}
            onToggleAdjustments={() => setAdjustmentsOpen((v) => !v)}
            onFileSelected={handleFileSelected}
            isDecoding={isDecoding}
            onExport={handleExport}
            isExporting={isExporting}
            onLogout={signOut}
          />

          {hasImage ? (
            <RecipeCarousel
              value={selectedRecipeId}
              onValueChange={setSelectedRecipeId}
              disabled={!hasImage}
              thumbnails={recipeThumbnails}
            />
          ) : (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
              <div className="animate-rise-in w-full max-w-md">
                <ImportZone onFileSelected={handleFileSelected} disabled={isDecoding} />
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Draggable before/after divider laid over the preview. */}
          {hasImage && !isDecoding && (
            <SplitSlider
              canvasRef={canvasRef}
              splitX={splitX}
              onChange={setSplitX}
              deps={[canvasSize.w, canvasSize.h, zoom, adjustmentsOpen]}
            />
          )}

          {/* Collapsed icon rail on the far left (logo, tools, login). */}
          <IconSidebar
            hasImage={hasImage}
            adjustmentsOpen={adjustmentsOpen}
            onToggleAdjustments={() => setAdjustmentsOpen((v) => !v)}
            onFileSelected={handleFileSelected}
            isDecoding={isDecoding}
            onExport={handleExport}
            isExporting={isExporting}
            onClearData={handleClearData}
            isClearing={isClearing}
            onLogin={signOut}
          />

          {/* Recipe list panel, docked to the right edge of the icon rail. */}
          {hasImage && (
            <aside className="animate-slide-in-left absolute inset-y-0 left-14 z-20 flex w-[272px] flex-col border-r border-white/10 bg-neutral-900/70 backdrop-blur-xl">
              <div className="px-4 pb-3 pt-4">
                <h1 className="text-base font-semibold">Film Recipes</h1>
                <p id="status" className="mt-0.5 line-clamp-2 text-xs text-neutral-400">
                  {status}
                </p>
              </div>
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Recipes</div>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                <RecipeSelector
                  value={selectedRecipeId}
                  onValueChange={setSelectedRecipeId}
                  disabled={!hasImage}
                  thumbnails={recipeThumbnails}
                />
              </div>
            </aside>
          )}

          {/* Empty state: title + centered import prompt while there's no image. */}
          {!hasImage && (
            <>
              <div className="absolute left-20 top-4 z-10">
                <h1 className="text-lg font-semibold">Film Recipes</h1>
                <p id="status" className="text-xs text-neutral-300">
                  {status}
                </p>
              </div>
              <div className="absolute inset-0 z-10 flex items-center justify-center p-6 pl-14">
                <div className="animate-rise-in w-full max-w-md">
                  <ImportZone onFileSelected={handleFileSelected} disabled={isDecoding} />
                </div>
              </div>
            </>
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
        </>
      )}

      {/* Floating, draggable adjustments window — centered on mobile. */}
      {hasImage && adjustmentsOpen && (
        <AdjustmentsPanel
          disabled={false}
          initialCenter={isMobile}
          strength={adaptStrength}
          onStrengthChange={handleStrengthChange}
          prediction={lastPrediction}
        />
      )}
    </main>
  );
}
