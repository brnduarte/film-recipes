//! wasm-bindgen glue exposing `raw-decode` to JS (`packages/processing-web`).
//! Phase 0 Spike B scope: prove decode-in-WASM + hand a real pixel buffer
//! back to JS for WebGL2 upload, and let JS time both halves.

use wasm_bindgen::prelude::*;

/// Decoded image handed back to JS: dimensions plus an RGBA8 buffer
/// (alpha always 255) so it can be uploaded directly as a WebGL2 texture
/// via `texImage2D` with no further conversion on the JS side.
#[wasm_bindgen]
pub struct WasmDecodedImage {
    width: u32,
    height: u32,
    rgba: Vec<u8>,
}

#[wasm_bindgen]
impl WasmDecodedImage {
    #[wasm_bindgen(getter)]
    pub fn width(&self) -> u32 {
        self.width
    }

    #[wasm_bindgen(getter)]
    pub fn height(&self) -> u32 {
        self.height
    }

    /// Returns the RGBA8 buffer. wasm-bindgen copies this into a JS
    /// Uint8Array; fine for a Phase 0 perf spike, revisit with a shared
    /// ArrayBuffer view if the copy shows up in profiling later.
    #[wasm_bindgen(getter)]
    pub fn rgba(&self) -> Vec<u8> {
        self.rgba.clone()
    }
}

/// Decode a RAW file's bytes (as received from a browser File/Blob) into an
/// RGBA8 image ready for WebGL2 upload. Errors are surfaced as JS exceptions.
#[wasm_bindgen]
pub fn decode_raw(bytes: Vec<u8>) -> Result<WasmDecodedImage, JsError> {
    let decoded = raw_decode::decode_raw_bytes(bytes).map_err(|e| JsError::new(&e.to_string()))?;

    // decode_raw_bytes returns f32 RGB in [0,1]; convert to RGBA8 for texture upload.
    let mut rgba = Vec::with_capacity(decoded.width * decoded.height * 4);
    for chunk in decoded.pixels.chunks_exact(3) {
        rgba.push((chunk[0].clamp(0.0, 1.0) * 255.0) as u8);
        rgba.push((chunk[1].clamp(0.0, 1.0) * 255.0) as u8);
        rgba.push((chunk[2].clamp(0.0, 1.0) * 255.0) as u8);
        rgba.push(255);
    }

    Ok(WasmDecodedImage {
        width: decoded.width as u32,
        height: decoded.height as u32,
        rgba,
    })
}

/// Called once from JS on module init for panic messages in the browser console.
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

/// Renders a full-resolution JPEG export from an already-decoded RGBA8
/// buffer (the same buffer `decode_raw` hands back for preview upload),
/// applying `recipe_json`/`manual_json` through the Rust recipe pipeline —
/// see `export-render`'s doc comment for why re-decoding from source isn't
/// needed yet. `recipe_json`/`manual_json` are the same JSON shapes as
/// `Recipe`/`ManualAdjustments` in `packages/core-types`. `quality` is
/// 1-100. Returns raw JPEG bytes with no EXIF segment.
#[wasm_bindgen]
pub fn export_jpeg(
    rgba: Vec<u8>,
    width: u32,
    height: u32,
    recipe_json: String,
    manual_json: String,
    quality: u8,
) -> Result<Vec<u8>, JsError> {
    let recipe: recipe_engine::recipe::Recipe =
        serde_json::from_str(&recipe_json).map_err(|e| JsError::new(&format!("invalid recipe JSON: {e}")))?;
    let manual: recipe_engine::recipe::ManualAdjustments = serde_json::from_str(&manual_json)
        .map_err(|e| JsError::new(&format!("invalid manual adjustments JSON: {e}")))?;

    export_render::render_jpeg(&rgba, width, height, &recipe, &manual, quality)
        .map_err(|e| JsError::new(&e.to_string()))
}

/// Returns all 12 built-in recipes as a JSON-serialized `Recipe[]`, keyed by
/// each `Recipe`'s own `film_simulation` field. This is the runtime source
/// the UI's recipe selector reads actual recipe values from — see
/// packages/recipes-catalog/src/index.ts's doc comment: display metadata
/// (name/description) lives in TS, but the numeric recipe values stay
/// single-sourced here in Rust rather than being hand-duplicated in TS.
#[wasm_bindgen]
pub fn built_in_recipes_json() -> String {
    let recipes = vec![
        recipe_engine::recipe::Recipe::provia_baseline(),
        recipe_engine::velvia::velvia_recipe(),
        recipe_engine::astia::astia_recipe(),
        recipe_engine::classic_chrome::classic_chrome_recipe(),
        recipe_engine::classic_neg::classic_neg_recipe(),
        recipe_engine::pro_neg::pro_neg_hi_recipe(),
        recipe_engine::pro_neg::pro_neg_std_recipe(),
        recipe_engine::eterna::eterna_recipe(),
        recipe_engine::eterna::eterna_bleach_bypass_recipe(),
        recipe_engine::acros::acros_recipe(),
        recipe_engine::monochrome::monochrome_recipe(),
        recipe_engine::monochrome::sepia_recipe(),
    ];
    serde_json::to_string(&recipes).expect("Recipe serialization is infallible")
}

/// Returns the named community "recipes" (Kodak Portra 400, Gold 200, etc.)
/// as a JSON-serialized `Recipe[]`, in the same fixed order as the display
/// metadata in packages/recipes-catalog's `NAMED_RECIPES`. Like
/// `built_in_recipes_json`, the numeric values stay single-sourced in Rust
/// (recipe_engine::named_recipes); only id/name/description live in TS.
#[wasm_bindgen]
pub fn named_recipes_json() -> String {
    let recipes = vec![
        recipe_engine::named_recipes::kodak_portra_400_recipe(),
        recipe_engine::named_recipes::kodak_gold_200_recipe(),
        recipe_engine::named_recipes::kodak_portra_800_recipe(),
        recipe_engine::named_recipes::bright_kodak_recipe(),
        recipe_engine::named_recipes::grainy_day_recipe(),
        recipe_engine::named_recipes::wes_anderson_recipe(),
    ];
    serde_json::to_string(&recipes).expect("Recipe serialization is infallible")
}
