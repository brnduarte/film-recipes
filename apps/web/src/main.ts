import init, { decode_raw, init_panic_hook } from "./wasm/wasm_bridge.js";
import { GlPreview } from "./gl-preview";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <main style="font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem;">
    <h1>Fuji Recipes — Spike B</h1>
    <p>Decode a RAW file (WASM) once, then drag sliders — no re-decode, GPU-only preview.</p>
    <input id="file" type="file" accept=".nef,.raf,.cr2,.cr3,.arw,.dng,.orf" />
    <p id="status">Loading WASM module…</p>
    <canvas id="canvas" width="960" height="640" style="width: 100%; background: #111; display: block; margin-top: 1rem;"></canvas>
    <div style="margin-top: 1rem;">
      <label>Exposure <input id="exposure" type="range" min="-2" max="2" step="0.01" value="0" disabled /></label>
      <br />
      <label>Contrast <input id="contrast" type="range" min="0" max="1" step="0.01" value="0" disabled /></label>
    </div>
    <p id="perf" style="font-family: monospace; white-space: pre;"></p>
  </main>
`;

const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
const perfEl = document.querySelector<HTMLParagraphElement>("#perf")!;
const fileInput = document.querySelector<HTMLInputElement>("#file")!;
const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const exposureSlider = document.querySelector<HTMLInputElement>("#exposure")!;
const contrastSlider = document.querySelector<HTMLInputElement>("#contrast")!;

let preview: GlPreview | null = null;
let frameTimes: number[] = [];

async function main() {
  await init();
  init_panic_hook();
  preview = new GlPreview(canvas);
  statusEl.textContent = "WASM ready. Choose a RAW file.";
}

function redraw() {
  if (!preview) return;
  const t0 = performance.now();
  preview.draw(Number(exposureSlider.value), Number(contrastSlider.value));
  const t1 = performance.now();
  frameTimes.push(t1 - t0);
  if (frameTimes.length > 30) frameTimes.shift();
  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  perfEl.textContent = `GPU redraw: ${(t1 - t0).toFixed(2)}ms (avg over ${frameTimes.length}: ${avg.toFixed(2)}ms)`;
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file || !preview) return;
  statusEl.textContent = `Decoding ${file.name}…`;
  frameTimes = [];

  const bytes = new Uint8Array(await file.arrayBuffer());
  const t0 = performance.now();
  let decoded;
  try {
    decoded = decode_raw(bytes);
  } catch (err) {
    statusEl.textContent = `Decode failed: ${err}`;
    return;
  }
  const t1 = performance.now();

  canvas.width = decoded.width;
  canvas.height = decoded.height;
  const t2 = performance.now();
  preview.uploadImage(decoded.rgba, decoded.width, decoded.height);
  const t3 = performance.now();

  statusEl.textContent =
    `Decoded ${decoded.width}x${decoded.height} in ${(t1 - t0).toFixed(1)}ms, ` +
    `GPU upload in ${(t3 - t2).toFixed(1)}ms. Drag sliders below.`;

  exposureSlider.disabled = false;
  contrastSlider.disabled = false;
  redraw();
});

exposureSlider.addEventListener("input", redraw);
contrastSlider.addEventListener("input", redraw);

main();
