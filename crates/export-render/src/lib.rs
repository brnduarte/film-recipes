//! Full-res JPEG export: reruns the same Rust recipe pipeline used for the
//! live preview's parity harness (`recipe_engine::pipeline`) over an
//! already-decoded RGBA8 buffer, then encodes JPEG. EXIF is stripped by
//! default per the plan's privacy section (section 7) — this encoder simply
//! never writes EXIF, so "stripped by default" is a property of what it
//! doesn't do, not an active strip step. Opt-in "keep EXIF" is deferred
//! until there's a metadata source to keep: `raw-decode`'s `RawDevelop`
//! pipeline doesn't currently retain the source file's EXIF/GPS tags.
//!
//! Note on "full resolution": the plan describes export as re-decoding from
//! the original source so it never upscales a *downsampled* preview proxy.
//! No preview downsampling exists yet (documented Phase 1/2 follow-up in
//! `gl-pipeline`), so today's decoded RGBA buffer already *is* full
//! resolution — re-decoding from source bytes here would be redundant.
//! Revisit this function's signature (take source bytes + re-decode) once
//! preview downsampling is introduced.

use image::codecs::jpeg::JpegEncoder;
use image::{ImageBuffer, Rgb};
use recipe_engine::pipeline::apply_recipe_to_buffer;
use recipe_engine::recipe::{ManualAdjustments, Recipe};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ExportError {
    #[error("buffer length {0} doesn't match width*height*4 ({1})")]
    BufferSizeMismatch(usize, usize),
    #[error("JPEG encode failed: {0}")]
    Encode(String),
}

/// Renders a full-resolution JPEG from an already-decoded RGBA8 buffer by
/// running it through `apply_recipe_to_buffer` (the same source-of-truth
/// pixel pipeline the shader-parity harness checks the GLSL preview
/// against), then encoding to JPEG at the given quality (1-100).
pub fn render_jpeg(
    rgba: &[u8],
    width: u32,
    height: u32,
    recipe: &Recipe,
    manual: &ManualAdjustments,
    quality: u8,
) -> Result<Vec<u8>, ExportError> {
    let expected_len = width as usize * height as usize * 4;
    if rgba.len() != expected_len {
        return Err(ExportError::BufferSizeMismatch(rgba.len(), expected_len));
    }

    // RGBA8 -> interleaved RGB f32 [0,1], the pipeline's native format
    // (alpha is dropped: export is a flattened JPEG, no transparency).
    let mut pixels: Vec<f32> = Vec::with_capacity(width as usize * height as usize * 3);
    for chunk in rgba.chunks_exact(4) {
        pixels.push(chunk[0] as f32 / 255.0);
        pixels.push(chunk[1] as f32 / 255.0);
        pixels.push(chunk[2] as f32 / 255.0);
    }

    apply_recipe_to_buffer(&mut pixels, recipe, manual);

    let mut rgb8 = Vec::with_capacity(pixels.len());
    for chunk in pixels.chunks_exact(3) {
        rgb8.push((chunk[0].clamp(0.0, 1.0) * 255.0).round() as u8);
        rgb8.push((chunk[1].clamp(0.0, 1.0) * 255.0).round() as u8);
        rgb8.push((chunk[2].clamp(0.0, 1.0) * 255.0).round() as u8);
    }

    let image_buffer: ImageBuffer<Rgb<u8>, Vec<u8>> = ImageBuffer::from_raw(width, height, rgb8)
        .ok_or_else(|| ExportError::Encode("failed to construct image buffer".into()))?;

    let mut out = Vec::new();
    JpegEncoder::new_with_quality(&mut out, quality)
        .encode_image(&image_buffer)
        .map_err(|e| ExportError::Encode(e.to_string()))?;

    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use recipe_engine::recipe::Recipe;

    #[test]
    fn encodes_valid_jpeg_with_correct_dimensions() {
        let width = 4u32;
        let height = 3u32;
        let rgba = vec![128u8; (width * height * 4) as usize];
        let recipe = Recipe::provia_baseline();
        let manual = ManualAdjustments::default();

        let jpeg_bytes = render_jpeg(&rgba, width, height, &recipe, &manual, 90)
            .expect("export should succeed");

        assert!(!jpeg_bytes.is_empty());
        // JPEG magic bytes (SOI marker).
        assert_eq!(&jpeg_bytes[0..2], &[0xFF, 0xD8]);

        let decoded = image::load_from_memory(&jpeg_bytes).expect("re-decode should succeed");
        assert_eq!(decoded.width(), width);
        assert_eq!(decoded.height(), height);
    }

    #[test]
    fn rejects_mismatched_buffer_length() {
        let rgba = vec![0u8; 10]; // not width*height*4
        let recipe = Recipe::provia_baseline();
        let manual = ManualAdjustments::default();

        let result = render_jpeg(&rgba, 4, 4, &recipe, &manual, 90);
        assert!(matches!(result, Err(ExportError::BufferSizeMismatch(_, _))));
    }

    #[test]
    fn output_has_no_exif_segment() {
        // EXIF is stripped by default — verify no APP1/Exif marker is present
        // in the encoded bytes (image::codecs::jpeg never writes one).
        let width = 2u32;
        let height = 2u32;
        let rgba = vec![64u8; (width * height * 4) as usize];
        let recipe = Recipe::provia_baseline();
        let manual = ManualAdjustments::default();

        let jpeg_bytes = render_jpeg(&rgba, width, height, &recipe, &manual, 90)
            .expect("export should succeed");

        // APP1/Exif marker is 0xFF 0xE1 followed by "Exif\0\0".
        let has_exif_marker = jpeg_bytes
            .windows(6)
            .any(|w| w == b"Exif\0\0");
        assert!(!has_exif_marker, "exported JPEG should not contain an EXIF segment");
    }
}
