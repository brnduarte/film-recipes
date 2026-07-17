# Film Recipes

Cross-platform film-simulation photo editor. All processing is local — no image data ever leaves the device. See the full implementation plan for architecture, phased roadmap, and rationale.

## Status: Phase 0 (spikes / risk reduction)

Currently validating the riskiest technical bets before full build-out:

- **Spike A** (in progress): RAW decode coverage via the `rawler` crate (`crates/raw-decode`).
- **Spike B** (not started): WASM decode + WebGL2 live-preview performance.
- **Spike C** (not started): Classic Chrome recipe accuracy (Rust + GLSL vs. a real reference JPEG).

### Running Spike A

```sh
cargo test -p raw-decode -- --nocapture
```

Drop real sample RAW files into `tests/fixtures/<format>/` (`raf`, `cr2`, `cr3`, `nef`, `arw`, `dng`, `orf` — RAF is highest priority). Formats with no samples are reported as `SKIPPED`, not failed, so the test is safe to run incrementally as samples become available. Sample files are gitignored — they are not committed to the repo.
