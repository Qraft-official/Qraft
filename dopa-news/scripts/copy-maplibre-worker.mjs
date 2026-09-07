/*
 * MapLibre resolves its worker from `import.meta.url`, which points at a
 * bundler chunk once the library is built into the app. The worker file is not
 * next to that chunk, so the request 404s and the map never renders.
 *
 * Copying the prebuilt worker into `public/maplibre/` lets us hand MapLibre a
 * stable, same-origin URL via `setWorkerUrl()` instead.
 */

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const from = path.join(root, "node_modules", "maplibre-gl", "dist");
const to = path.join(root, "public", "maplibre");

// The worker imports the shared chunk relatively, so both files must travel.
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

await mkdir(to, { recursive: true });
for (const file of FILES) {
  await copyFile(path.join(from, file), path.join(to, file));
}
console.log(`copied ${FILES.length} maplibre worker files to public/maplibre`);
