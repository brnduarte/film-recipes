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

/// f32 RGB in [0,1] → RGBA8 (alpha 255) for direct WebGL2 texture upload.
/// Shared by both the RAW and standard-image decode entry points.
fn to_rgba8(decoded: raw_decode::DecodedRaw) -> WasmDecodedImage {
    let mut rgba = Vec::with_capacity(decoded.width * decoded.height * 4);
    for chunk in decoded.pixels.chunks_exact(3) {
        rgba.push((chunk[0].clamp(0.0, 1.0) * 255.0) as u8);
        rgba.push((chunk[1].clamp(0.0, 1.0) * 255.0) as u8);
        rgba.push((chunk[2].clamp(0.0, 1.0) * 255.0) as u8);
        rgba.push(255);
    }
    WasmDecodedImage {
        width: decoded.width as u32,
        height: decoded.height as u32,
        rgba,
    }
}

/// Decode a RAW file's bytes (as received from a browser File/Blob) into an
/// RGBA8 image ready for WebGL2 upload. Errors are surfaced as JS exceptions.
#[wasm_bindgen]
pub fn decode_raw(bytes: Vec<u8>) -> Result<WasmDecodedImage, JsError> {
    let decoded = raw_decode::decode_raw_bytes(bytes).map_err(|e| JsError::new(&e.to_string()))?;
    Ok(to_rgba8(decoded))
}

/// Decode a standard (already-developed) image — JPEG, PNG, TIFF, or WebP —
/// into the same RGBA8 shape as `decode_raw`. The JS caller routes here vs.
/// `decode_raw` on file extension (see `packages/processing-web`).
#[wasm_bindgen]
pub fn decode_image(bytes: Vec<u8>) -> Result<WasmDecodedImage, JsError> {
    let decoded = raw_decode::decode_image_bytes(bytes).map_err(|e| JsError::new(&e.to_string()))?;
    Ok(to_rgba8(decoded))
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

/// Returns the named community "recipes" (Kodak Portra 400, Gold 200, etc.)
/// as a JSON-serialized `Recipe[]`, in the same fixed order as the display
/// metadata in packages/recipes-catalog's `NAMED_RECIPES`. The numeric values
/// stay single-sourced in Rust (recipe_engine::named_recipes); only
/// id/name/description live in TS.
#[wasm_bindgen]
pub fn named_recipes_json() -> String {
    use recipe_engine::named_recipes::*;
    let recipes = vec![
        // Kodak film stocks
        kodak_portra_160_recipe(),
        kodak_portra_400_recipe(),
        kodak_portra_800_recipe(),
        kodak_gold_200_recipe(),
        kodak_ultramax_400_recipe(),
        kodachrome_64_recipe(),
        kodachrome_25_recipe(),
        kodak_vision3_250d_recipe(),
        kodak_gold_max_expired_recipe(),
        // Fujifilm film stocks
        superia_xtra_400_recipe(),
        fujicolor_natura_1600_recipe(),
        reala_ace_recipe(),
        easy_reala_ace_recipe(),
        fujifilm_negative_recipe(),
        fujicolor_100_industrial_recipe(),
        pro_negative_160c_recipe(),
        provia_positive_recipe(),
        vivid_velvia_recipe(),
        // Nostalgic / retro looks
        nostalgia_negative_recipe(),
        timeless_negative_recipe(),
        nostalgic_air_recipe(),
        emulsion_86_recipe(),
        seventies_summer_recipe(),
        summer_of_1960_recipe(),
        california_summer_recipe(),
        classic_retro_recipe(),
        classic_amber_recipe(),
        classic_color_recipe(),
        pacific_blues_recipe(),
        pushed_analog_recipe(),
        // Cinema / Eterna looks
        vintage_cinema_recipe(),
        vintage_eterna_recipe(),
        eterna_summer_recipe(),
        cinestill_800t_recipe(),
        cinestill_400d_recipe(),
        vintage_bronze_recipe(),
        chrome_1960_recipe(),
        fluorescent_night_recipe(),
        // Black & White
        ilford_fp4_recipe(),
        classic_bw_recipe(),
        kodak_tmax_p3200_recipe(),
    ];
    serde_json::to_string(&recipes).expect("Recipe serialization is infallible")
}
