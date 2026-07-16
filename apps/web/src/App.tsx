import { useEffect, useMemo, useRef, useState } from "react";
import { GlPreview } from "@fuji-recipes/gl-pipeline";
import { decode, exportJpeg, getBuiltInRecipes, getNamedRecipes } from "@fuji-recipes/processing-web";
import { BUILT_IN_RECIPES, NAMED_RECIPES } from "@fuji-recipes/recipes-catalog";
import type { ManualAdjustments, Recipe } from "@fuji-recipes/core-types";
import { useEditorStore } from "./store";
import { ImportZone } from "./components/ImportZone";
import { RecipeSelector } from "./components/RecipeSelector";
import { BeforeAfterToggle } from "./components/BeforeAfterToggle";
import { ClearDataButton } from "./components/ClearDataButton";

const EXPORT_JPEG_QUALITY = 92;

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<GlPreview | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const status = useEditorStore((s) => s.status);
  const decoded = useEditorStore((s) => s.decoded);
  const recipes = useEditorStore((s) => s.recipes);
  const namedRecipes = useEditorStore((s) => s.namedRecipes);
  const selectedRecipeId = useEditorStore((s) => s.selectedRecipeId);
  const manualExposure = useEditorStore((s) => s.manualExposure);
  const showOriginal = useEditorStore((s) => s.showOriginal);
  const setStatus = useEditorStore((s) => s.setStatus);
  const setRecipes = useEditorStore((s) => s.setRecipes);
  const setNamedRecipes = useEditorStore((s) => s.setNamedRecipes);
  const setDecoded = useEditorStore((s) => s.setDecoded);
  const setSelectedRecipeId = useEditorStore((s) => s.setSelectedRecipeId);
  const setManualExposure = useEditorStore((s) => s.setManualExposure);
  const setShowOriginal = useEditorStore((s) => s.setShowOriginal);

  // One-time setup: compile the GL preview program and load both the built-in
  // film simulations and the named community recipes from Rust (via WASM).
  useEffect(() => {
    if (canvasRef.current) {
      previewRef.current = new GlPreview(canvasRef.current);
    }
    Promise.all([getBuiltInRecipes(), getNamedRecipes()])
      .then(([builtIn, named]) => {
        setRecipes(builtIn);
        setNamedRecipes(named);
        setStatus("WASM ready. Choose a RAW file.");
      })
      .catch((err) => setStatus(`Failed to initialize: ${err}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve the selected catalog id to an actual Recipe: built-ins pair to a
  // Recipe by film_simulation; named recipes pair positionally with the Rust
  // `named_recipes_json` order that NAMED_RECIPES mirrors.
  const recipesById = useMemo(() => {
    const map = new Map<string, Recipe>();
    for (const entry of BUILT_IN_RECIPES) {
      const recipe = recipes.find((r) => r.film_simulation === entry.filmSimulation);
      if (recipe) map.set(entry.id, recipe);
    }
    NAMED_RECIPES.forEach((entry, i) => {
      const recipe = namedRecipes[i];
      if (recipe) map.set(entry.id, recipe);
    });
    return map;
  }, [recipes, namedRecipes]);

  const selectedRecipe = recipesById.get(selectedRecipeId) ?? null;

  // Cheap GPU-only redraw on every recipe/exposure/before-after change — no
  // re-decode, per the plan's "decode once, GPU-only interaction" design.
  useEffect(() => {
    if (!previewRef.current || !decoded || !selectedRecipe) return;
    previewRef.current.draw(showOriginal, selectedRecipe, manualExposure);
  }, [decoded, selectedRecipe, manualExposure, showOriginal]);

  async function handleFileSelected(file: File) {
    if (!previewRef.current) return;
    setIsDecoding(true);
    setStatus(`Decoding ${file.name}…`);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const image = await decode(bytes);
      if (canvasRef.current) {
        canvasRef.current.width = image.width;
        canvasRef.current.height = image.height;
      }
      previewRef.current.uploadImage(image.rgba, image.width, image.height);
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
      const manual: ManualAdjustments = {
        exposure: manualExposure,
        wb_temp_override: null,
        wb_tint_override: null,
        sharpness_override: null,
        vignette: 0,
      };
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

  const hasImage = decoded !== null;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 bg-neutral-950 p-6 text-neutral-100">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Fuji Recipes</h1>
          <p id="status" className="text-sm text-neutral-400">
            {status}
          </p>
        </div>
        <ClearDataButton onCleared={() => setStatus("All app data cleared.")} />
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <canvas ref={canvasRef} width={960} height={640} className="w-full rounded-lg bg-black" />
          {hasImage && <BeforeAfterToggle showOriginal={showOriginal} onShowOriginalChange={setShowOriginal} />}
          <ImportZone onFileSelected={handleFileSelected} disabled={isDecoding} />
        </div>

        <div className="flex flex-col gap-4">
          <RecipeSelector value={selectedRecipeId} onValueChange={setSelectedRecipeId} disabled={!hasImage} />
          <label className="flex flex-col gap-1 text-sm text-neutral-300">
            Exposure {manualExposure.toFixed(2)} EV
            <input
              id="exposure"
              type="range"
              min={-2}
              max={2}
              step={0.01}
              value={manualExposure}
              disabled={!hasImage || showOriginal}
              onChange={(event) => setManualExposure(Number(event.target.value))}
            />
          </label>
          <button
            id="export-jpeg"
            type="button"
            onClick={handleExport}
            disabled={!hasImage || isExporting}
            className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
          >
            {isExporting ? "Exporting…" : "Export JPEG"}
          </button>
        </div>
      </div>
    </main>
  );
}
