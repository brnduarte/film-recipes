// Web RAW decode backend: thin wrapper around the wasm-bridge WASM module
// (crates/wasm-bridge, built into ./wasm via `pnpm --filter processing-web
// build:wasm`). This is the "web" half of the plan's decode seam — Tauri
// desktop will get an equivalent `processing-native` wrapper around the
// same crates compiled natively (Phase 3), invoked via `tauri.invoke`
// instead of WASM.
//
// Deliberately just `decode()` for now, not a full ProcessingBackend
// interface (decode/renderPreview/renderExport) — renderPreview is already
// shared/identical on both platforms and lives in @film-recipes/gl-pipeline
// (GlPreview), and renderExport doesn't exist yet (no export-render work
// has started). Introducing the full interface now, before there's a second
// implementation or a second consumer, would be speculative; add it when
// processing-native is built.
//
// Currently runs decode on the main thread; moving it into a Web Worker (so
// large RAW decodes don't block the UI thread) is a documented Phase 1/2
// follow-up, not yet done.

import init, { decode_raw, decode_image, export_jpeg, init_panic_hook, named_recipes_json } from "./wasm/wasm_bridge.js";
import type { ManualAdjustments, Recipe } from "@film-recipes/core-types";

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

// RAW extensions go through rawler's demosaic/develop pipeline; everything
// else (JPEG/PNG/TIFF/WebP) is an already-developed image decoded straight to
// RGB. We route on extension, not content sniffing, because TIFF-based RAW
// formats (NEF/CR2/ARW/DNG) share TIFF's magic bytes.
const RAW_EXTENSIONS = new Set([
  "raf", "nef", "cr2", "cr3", "arw", "dng", "orf", "rw2", "pef", "srw", "raw",
]);

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

/**
 * Decode an image file's bytes into an RGBA8 image ready for WebGL2 upload.
 * `filename` selects the decode path: RAW formats go through the rawler
 * develop pipeline, standard formats (JPEG/PNG/TIFF/WebP) are decoded directly.
 */
export async function decode(bytes: Uint8Array, filename: string): Promise<DecodedImage> {
  await ensureWasmInit();
  const decoded = RAW_EXTENSIONS.has(extensionOf(filename))
    ? decode_raw(bytes)
    : decode_image(bytes);
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
