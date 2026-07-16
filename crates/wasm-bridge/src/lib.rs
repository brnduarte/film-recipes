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
