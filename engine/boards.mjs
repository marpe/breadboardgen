// Board runner: node engine/boards.mjs <guide>
// Builds every board in guides/<guide>/boards.mjs and writes out/<guide>/<key>.svg (fallback drawing) and
// out/<guide>/<key>.3d.json (3D model). Prints each board's anchor coordinates as JSON, for pinning tags.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2];
if (!id) {
  console.error("usage: node engine/boards.mjs <guide>");
  process.exit(1);
}
const guideDir = join(root, "guides", id);
const boardsFile = join(guideDir, "boards.mjs");
if (!existsSync(boardsFile)) {
  console.error(`boards.mjs: no board file guides/${id}/boards.mjs`);
  process.exit(1);
}
const pillsFile = join(guideDir, "pills.json");
const placed = existsSync(pillsFile) ? JSON.parse(readFileSync(pillsFile, "utf8")) : {};
const out = join(root, "out", id);
mkdirSync(out, { recursive: true });

// Tag position precedence: pills.json[key][anchorKey] > pinned > auto-placement.
const finish = (key, { b, names, info = {}, pinned = {}, VH, title, desc }) => {
  const spec = { ...pinned, ...placed[key] };
  const report = {};
  for (const [name, anchorKey, cls] of names) {
    const a = b.anchors[anchorKey];
    report[anchorKey] = a;
    const pos = spec[anchorKey] || [null, null];
    b.pill(name, pos[0], pos[1], cls || "c-purple", anchorKey, info[anchorKey]);
  }
  writeFileSync(join(out, `${key}.svg`), b.render(VH, title, desc, `bb-${key}`));
  writeFileSync(join(out, `${key}.3d.json`), JSON.stringify(b.model3d()));
  console.log(key, JSON.stringify(report));
};

const { default: boards } = await import(pathToFileURL(boardsFile).href);
for (const [key, build] of Object.entries(boards)) {
  finish(key, build());
}
