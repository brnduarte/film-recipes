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
