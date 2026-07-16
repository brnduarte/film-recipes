# RAW decoder licensing: `rawler` is LGPL-2.1, not permissive

## Status
Open — decision needed before Phase 1.

## What we assumed in the plan
The implementation plan chose `rawler` as the RAW decode library specifically
because it was believed to be "pure Rust, permissive license" — explicitly
positioned as the alternative to LibRaw, which the plan ruled out because of
LGPL redistribution implications for a WASM bundle.

## What we found
While vendoring `rawler` 0.7.2 into `third_party/rawler/` (to patch out
`Instant::now()` calls that panic on `wasm32-unknown-unknown`), inspection of
the crate showed:

- `Cargo.toml` declares `license = "LGPL-2.1"`.
- A per-file SPDX header survey (`grep -rl "SPDX-License-Identifier" src`)
  found a mixed codebase: 37 files marked `LGPL-2.1`, 50 files marked `MIT`.

So `rawler` is **not** permissively licensed overall — it carries the same
category of LGPL obligation the plan was trying to avoid by not using LibRaw.

## Why this matters for this app specifically
- The app statically links/bundles the decoder into a WASM binary (browser)
  and a native binary (Tauri desktop) — there is no dynamic linking step.
- LGPL-2.1 requires that end users be able to relink/replace the LGPL'd
  library. Static-linking LGPL code into a single compiled artifact (WASM or
  native binary) without also providing relinkable object files/instructions
  is a well-known LGPL compliance gray area — this is the exact concern the
  plan raised about LibRaw.
- We've now also vendored and *modified* `rawler` locally
  (`third_party/rawler/`, three files patched to remove debug timing calls).
  LGPL-2.1 explicitly permits modification, but requires that modified source
  be made available under the same license to anyone who receives the binary
  — i.e., if we ship this app, we must publish/offer the modified rawler
  source (the `third_party/rawler/` diff), not just the unmodified upstream.

## Options
1. **Stay on rawler, accept LGPL-2.1 obligations.** Ship the
   `third_party/rawler/` source (or a diff against upstream 0.7.2) alongside
   the app, and provide a way for users to relink a patched decoder — most
   realistically satisfied for the web build by *not* statically bundling
   the WASM at build time in a way that forbids substitution (e.g., loading
   the `.wasm` as a separate fetched asset users could swap, and documenting
   how), and for the Tauri build by dynamic-linking the native decoder as a
   shared library rather than compiling it directly into the app binary.
   Requires legal review before shipping past Phase 0.
2. **Switch RAW decode library.** Re-run Spike A's format-coverage
   validation against an alternative with a clearer permissive license
   (e.g., re-evaluate crates.io for MIT/Apache-2.0-only RAW decoders, or a
   narrower single-purpose decoder if full multi-format coverage isn't
   available permissively). Costs re-validation time but removes the
   compliance question entirely.
3. **Keep rawler for now, treat this as a pre-ship blocker only.** Continue
   Phase 0/1 development (spikes and MVP are not "shipping" in the
   distribution sense), but hard-block Phase 3/4 (desktop packaging, PWA
   public deployment) until this is resolved via option 1 or 2.

## Recommendation
Proceed with option 3 for now: rawler is fine to keep validating
architecture and building the MVP against, since no compiled artifact is
being distributed yet. This must be resolved (via option 1 or 2) before any
public web deployment or desktop app distribution in Phase 3/4.

## Vendored patch details
`third_party/rawler/` is a copy of upstream `rawler` 0.7.2 with three
`std::time::Instant::now()` debug-timing calls removed (they panic on
`wasm32-unknown-unknown`, which has no time support):
- `src/imgop/sensor/bayer/ppg.rs`
- `src/imgop/sensor/xtrans/xtrans_fast.rs`
- `src/decompressors/crx/decoder.rs`

No functional/pixel-output change — purely removes `log::debug!` timing
instrumentation. Applied workspace-wide via `[patch.crates-io]` in the root
`Cargo.toml`.
