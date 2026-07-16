// Sole IndexedDB write path, per the plan's privacy section 7: this is the
// only module in the app allowed to touch IndexedDB, and its exported
// functions only ever accept/return `Preset`/`PresetExport` shapes (see
// @fuji-recipes/core-types) — there is no code path here that could accept
// an image Blob/ArrayBuffer, since no function signature admits one. Photo
// pixel data lives only in an in-memory runtime map elsewhere in the app
// and is never passed to this module.
//
// Presets are the only thing persisted today. A `preferences` object store
// is deliberately not added yet — there is no actual user preference in the
// app to store (no theme toggle, no settings beyond presets), and adding an
// empty, unused store now would be speculative. Add it, and extend
// `clearAllData`, when a first real preference exists.

import { openDB, type IDBPDatabase } from "idb";
import type { Preset, PresetExport } from "@fuji-recipes/core-types";
import { CURRENT_PRESET_SCHEMA_VERSION } from "@fuji-recipes/core-types";

const DB_NAME = "fuji-recipes";
const DB_VERSION = 1;
const PRESETS_STORE = "presets";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PRESETS_STORE)) {
          db.createObjectStore(PRESETS_STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

/** All saved presets, ordered by their user-defined `order` field. */
export async function listPresets(): Promise<Preset[]> {
  const db = await getDb();
  const presets: Preset[] = await db.getAll(PRESETS_STORE);
  return presets.sort((a, b) => a.order - b.order);
}

export async function getPreset(id: string): Promise<Preset | undefined> {
  const db = await getDb();
  return db.get(PRESETS_STORE, id);
}

/** Upsert: creates a new preset or overwrites an existing one by `id`. */
export async function savePreset(preset: Preset): Promise<void> {
  const db = await getDb();
  await db.put(PRESETS_STORE, preset);
}

export async function deletePreset(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(PRESETS_STORE, id);
}

/** JSON export envelope for all presets, per the plan's section 3 format. */
export async function exportPresets(): Promise<PresetExport> {
  const presets = await listPresets();
  return {
    schema_version: CURRENT_PRESET_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    presets,
  };
}

/** Upserts every preset in `data` by `id` (does not clear existing presets first). */
export async function importPresets(data: PresetExport): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(PRESETS_STORE, "readwrite");
  await Promise.all([...data.presets.map((preset) => tx.store.put(preset)), tx.done]);
}

/**
 * Wipes all locally stored app data. Backs the settings "clear all app
 * data" control (plan section 7) — irreversible, callers are responsible
 * for confirming with the user first.
 */
export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.clear(PRESETS_STORE);
}
