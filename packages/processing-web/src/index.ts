// Web RAW decode backend: thin wrapper around the wasm-bridge WASM module
// (crates/wasm-bridge, built into ./wasm via `pnpm --filter processing-web
// build:wasm`). This is the "web" half of the plan's decode seam — Tauri
// desktop will get an equivalent `processing-native` wrapper around the
// same crates compiled natively (Phase 3), invoked via `tauri.invoke`
// instead of WASM.
//
// Deliberately just `decode()` for now, not a full ProcessingBackend
// interface (decode/renderPreview/renderExport) — renderPreview is already
// shared/identical on both platforms and lives in @fuji-recipes/gl-pipeline
// (GlPreview), and renderExport doesn't exist yet (no export-render work
// has started). Introducing the full interface now, before there's a second
// implementation or a second consumer, would be speculative; add it when
// processing-native is built.
//
// Currently runs decode on the main thread; moving it into a Web Worker (so
// large RAW decodes don't block the UI thread) is a documented Phase 1/2
// follow-up, not yet done.

import init, {
  built_in_recipes_json,
  decode_raw,
  export_jpeg,
  init_panic_hook,
  named_recipes_json,
} from "./wasm/wasm_bridge.js";
import type { ManualAdjustments, Recipe } from "@fuji-recipes/core-types";

export interface DecodedImage {
  width: number;
  height: number;
  rgba: Uint8Array;
}

let wasmReady: Promise<void> | null = null;

function ensureWasmInit(): Promise<void> {
  if (!wasmReady) {
    wasmReady = init().then(() => {
      init_panic_hook();
    });
  }
  return wasmReady;
}

/** Decode a RAW file's bytes into an RGBA8 image ready for WebGL2 upload. */
export async function decode(bytes: Uint8Array): Promise<DecodedImage> {
  await ensureWasmInit();
  const decoded = decode_raw(bytes);
  return { width: decoded.width, height: decoded.height, rgba: decoded.rgba };
}

/**
 * Renders a full-resolution JPEG export from an already-decoded image (see
 * `decode()`), applying `recipe`/`manual` through the Rust recipe pipeline —
 * the same source-of-truth math the live preview's shader-parity harness
 * checks the GLSL preview against. `quality` is 1-100. Returns raw JPEG
 * bytes with no EXIF segment (stripped by default, see `export-render`).
 */
export async function exportJpeg(
  image: DecodedImage,
  recipe: Recipe,
  manual: ManualAdjustments,
  quality: number,
): Promise<Uint8Array> {
  await ensureWasmInit();
  return export_jpeg(image.rgba, image.width, image.height, JSON.stringify(recipe), JSON.stringify(manual), quality);
}

/**
 * The Phase 1 built-in recipes (Provia, Velvia, Classic Chrome, Acros), read
 * from Rust — see `built_in_recipes_json` in crates/wasm-bridge/src/lib.rs.
 * This is the runtime source of actual `Recipe` values; keyed by each
 * recipe's own `film_simulation` for pairing with recipes-catalog's display
 * metadata.
 */
export async function getBuiltInRecipes(): Promise<Recipe[]> {
  await ensureWasmInit();
  return JSON.parse(built_in_recipes_json()) as Recipe[];
}

/**
 * The named community recipes (Kodak Portra 400, Gold 200, Wes Anderson,
 * etc.), read from Rust — see `named_recipes_json` in
 * crates/wasm-bridge/src/lib.rs. Returned in the same fixed order as
 * recipes-catalog's `NAMED_RECIPES`, which supplies each one's id/name/
 * description (several share the same `film_simulation`, so they're paired
 * positionally, not by film simulation).
 */
export async function getNamedRecipes(): Promise<Recipe[]> {
  await ensureWasmInit();
  return JSON.parse(named_recipes_json()) as Recipe[];
}
