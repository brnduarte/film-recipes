//! RAW format dispatch/decode. Wraps `rawler` behind a small, stable API so the
//! rest of the pipeline (WASM bridge, Tauri native commands) never depends on
//! `rawler`'s types directly — this is the seam Phase 0 Spike A validates.

use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DecodeError {
    #[error("failed to read file: {0}")]
    Io(#[from] std::io::Error),
    #[error("unsupported or unrecognized RAW format")]
    Unsupported,
    #[error("decode failed: {0}")]
    Decode(String),
}

/// Result of a successful RAW decode: a flat linear RGB buffer plus dimensions.
/// This is intentionally minimal for Spike A — full demosaic/color-matrix output
/// shape will be finalized once decode coverage is validated.
pub struct DecodedRaw {
    pub width: usize,
    pub height: usize,
    /// Interleaved RGB, one f32 per channel per pixel.
    pub pixels: Vec<f32>,
}

/// Decode + fully develop a RAW file from a path: format auto-detection,
/// demosaic, white balance, color calibration, and sRGB conversion, all via
/// `rawler::imgop::develop::RawDevelop` (its default step set). This is the
/// real pipeline — not a stub — used by both Spike A (coverage) and Spike B
/// (WASM/WebGL2 preview perf), and later by `recipe-engine::pipeline` as the
/// decode stage feeding into recipe application.
pub fn decode_raw_file(path: &Path) -> Result<DecodedRaw, DecodeError> {
    use rawler::imgop::develop::RawDevelop;

    let raw_image = rawler::decode_file(path).map_err(|e| DecodeError::Decode(e.to_string()))?;

    let developed = RawDevelop::default()
        .develop_intermediate(&raw_image)
        .map_err(|e| DecodeError::Decode(e.to_string()))?;

    let dynamic_image = developed
        .to_dynamic_image()
        .ok_or_else(|| DecodeError::Decode("failed to materialize developed image buffer".into()))?;

    let rgb8 = dynamic_image.to_rgb8();
    let width = rgb8.width() as usize;
    let height = rgb8.height() as usize;
    let pixels = rgb8
        .into_raw()
        .into_iter()
        .map(|byte| byte as f32 / 255.0)
        .collect();

    Ok(DecodedRaw {
        width,
        height,
        pixels,
    })
}

/// Decode + fully develop a RAW file from an in-memory byte buffer (no
/// filesystem access) — the entry point used by the WASM bridge, since a
/// browser only ever hands us bytes, never a path. Shares the exact same
/// `RawDevelop` pipeline as `decode_raw_file` so native (Tauri) and
/// WASM/browser decode produce identical results.
pub fn decode_raw_bytes(bytes: Vec<u8>) -> Result<DecodedRaw, DecodeError> {
    use rawler::decoders::RawDecodeParams;
    use rawler::imgop::develop::RawDevelop;
    use rawler::rawsource::RawSource;

    let source = RawSource::new_from_slice(&bytes);
    let raw_image = rawler::decode(&source, &RawDecodeParams::default())
        .map_err(|e| DecodeError::Decode(e.to_string()))?;

    let developed = RawDevelop::default()
        .develop_intermediate(&raw_image)
        .map_err(|e| DecodeError::Decode(e.to_string()))?;

    let dynamic_image = developed
        .to_dynamic_image()
        .ok_or_else(|| DecodeError::Decode("failed to materialize developed image buffer".into()))?;

    let rgb8 = dynamic_image.to_rgb8();
    let width = rgb8.width() as usize;
    let height = rgb8.height() as usize;
    let pixels = rgb8
        .into_raw()
        .into_iter()
        .map(|byte| byte as f32 / 255.0)
        .collect();

    Ok(DecodedRaw {
        width,
        height,
        pixels,
    })
}

/// Decode a standard (already-developed) image — JPEG, PNG, TIFF, or WebP —
/// from an in-memory byte buffer, into the same `DecodedRaw` RGB shape the
/// RAW path produces, so the rest of the pipeline (WebGL2 upload, recipe
/// application, export) treats every source identically. Unlike
/// `decode_raw_bytes` there's no demosaic/white-balance/color-calibration
/// step: these formats are already sRGB, so we just decode to RGB8.
///
/// Routing between this and `decode_raw_bytes` is done by the caller on file
/// extension, not by content sniffing, because TIFF-based RAW formats (NEF,
/// CR2, ARW, DNG) share TIFF's magic bytes and would be misrouted here.
pub fn decode_image_bytes(bytes: Vec<u8>) -> Result<DecodedRaw, DecodeError> {
    use image::{DynamicImage, ImageDecoder, ImageReader};
    use std::io::Cursor;

    // Decode via a decoder (not `load_from_memory`) so we can read the EXIF
    // Orientation tag and physically rotate the pixels. Cameras store a
    // portrait shot as landscape sensor data plus an orientation flag; without
    // applying it, vertical photos come in sideways.
    let mut decoder = ImageReader::new(Cursor::new(&bytes))
        .with_guessed_format()
        .map_err(|e| DecodeError::Decode(e.to_string()))?
        .into_decoder()
        .map_err(|e| DecodeError::Decode(e.to_string()))?;
    let orientation = decoder
        .orientation()
        .map_err(|e| DecodeError::Decode(e.to_string()))?;
    let mut dynamic_image =
        DynamicImage::from_decoder(decoder).map_err(|e| DecodeError::Decode(e.to_string()))?;
    dynamic_image.apply_orientation(orientation);

    let rgb8 = dynamic_image.to_rgb8();
    let width = rgb8.width() as usize;
    let height = rgb8.height() as usize;
    let pixels = rgb8
        .into_raw()
        .into_iter()
        .map(|byte| byte as f32 / 255.0)
        .collect();

    Ok(DecodedRaw {
        width,
        height,
        pixels,
    })
}

#[cfg(test)]
mod exif_orientation {
    //! Regression test: standard-image decode must honor the EXIF Orientation
    //! tag, so portrait photos (stored as landscape sensor data + a rotate
    //! flag) come in upright instead of sideways.

    use super::*;

    /// A minimal EXIF APP1 segment carrying Orientation = 6 (rotate 90° CW),
    /// to be spliced in right after a JPEG's SOI marker.
    const EXIF_ORIENTATION_6_APP1: &[u8] = &[
        0xFF, 0xE1, 0x00, 0x22, // APP1 marker + length (34)
        b'E', b'x', b'i', b'f', 0x00, 0x00, // "Exif\0\0"
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF header (LE), IFD @ 8
        0x01, 0x00, // 1 IFD entry
        0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00,
        0x00, // tag 0x0112, SHORT, count 1, value 6
        0x00, 0x00, 0x00, 0x00, // next-IFD offset = 0
    ];

    #[test]
    fn portrait_shot_is_rotated_upright() {
        use image::{ImageFormat, RgbImage};
        use std::io::Cursor;

        // A landscape (wider than tall) source, as the sensor stores it.
        let landscape = RgbImage::from_fn(8, 4, |x, _| image::Rgb([(x * 30) as u8, 0, 0]));
        let mut jpeg = Vec::new();
        image::DynamicImage::ImageRgb8(landscape)
            .write_to(&mut Cursor::new(&mut jpeg), ImageFormat::Jpeg)
            .unwrap();

        // Splice the orientation-6 EXIF segment in right after SOI (FF D8).
        assert_eq!(&jpeg[..2], &[0xFF, 0xD8]);
        let mut with_exif = Vec::with_capacity(jpeg.len() + EXIF_ORIENTATION_6_APP1.len());
        with_exif.extend_from_slice(&jpeg[..2]);
        with_exif.extend_from_slice(EXIF_ORIENTATION_6_APP1);
        with_exif.extend_from_slice(&jpeg[2..]);

        let decoded = decode_image_bytes(with_exif).unwrap();
        // Orientation 6 swaps dimensions: 8x4 landscape becomes 4x8 portrait.
        assert!(
            decoded.height > decoded.width,
            "expected upright portrait after applying EXIF orientation, got {}x{}",
            decoded.width,
            decoded.height,
        );
    }
}

#[cfg(test)]
mod spike_a_coverage {
    //! Phase 0 Spike A: RAW decode coverage test.
    //!
    //! Drop sample files into `tests/fixtures/<format>/` at the repo root
    //! (raf, cr2, cr3, nef, arw, dng, orf). This test decodes every file found
    //! and reports a pass/fail matrix per format. Formats with no sample files
    //! are reported as SKIPPED, not FAILED, so this is safe to run before all
    //! samples are collected.

    use super::*;
    use std::collections::BTreeMap;
    use walkdir::WalkDir;

    const FORMATS: &[&str] = &["raf", "cr2", "cr3", "nef", "arw", "dng", "orf"];

    fn fixtures_root() -> std::path::PathBuf {
        // crates/raw-decode -> repo root -> tests/fixtures
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../tests/fixtures")
    }

    #[test]
    fn spike_a_raw_decode_coverage() {
        let root = fixtures_root();
        let mut results: BTreeMap<&str, (usize, usize)> = BTreeMap::new(); // (ok, total)

        for &fmt in FORMATS {
            let dir = root.join(fmt);
            if !dir.exists() {
                continue;
            }
            let mut ok = 0;
            let mut total = 0;
            for entry in WalkDir::new(&dir).into_iter().filter_map(|e| e.ok()) {
                if !entry.file_type().is_file() {
                    continue;
                }
                let is_hidden = entry
                    .file_name()
                    .to_str()
                    .map(|n| n.starts_with('.'))
                    .unwrap_or(false);
                if is_hidden {
                    continue;
                }
                total += 1;
                match decode_raw_file(entry.path()) {
                    Ok(img) => {
                        if img.width > 0 && img.height > 0 {
                            ok += 1;
                        }
                    }
                    Err(e) => {
                        eprintln!("[{fmt}] FAILED {}: {e}", entry.path().display());
                    }
                }
            }
            results.insert(fmt, (ok, total));
        }

        println!("\n=== Spike A: RAW decode coverage ===");
        for &fmt in FORMATS {
            match results.get(fmt) {
                Some((ok, total)) if *total > 0 => {
                    println!("  {fmt:<4} {ok}/{total} decoded");
                }
                _ => println!("  {fmt:<4} SKIPPED (no sample files in tests/fixtures/{fmt}/)"),
            }
        }
        println!("=====================================\n");

        // Fail only if a format that HAS samples fails to decode any of them —
        // never fail on missing samples, since those are provided out-of-band.
        for (fmt, (ok, total)) in &results {
            if *total > 0 {
                assert!(*ok > 0, "format {fmt} had {total} sample(s) but 0 decoded successfully");
            }
        }
    }
}
