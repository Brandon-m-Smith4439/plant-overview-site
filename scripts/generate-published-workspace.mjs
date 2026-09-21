import fs from "node:fs";
import path from "node:path";

const [sourcePath, targetPath = "public/published-workspace.js"] = process.argv.slice(2);
if (!sourcePath) {
  throw new Error("Usage: node scripts/generate-published-workspace.mjs <workspace-export.json> [output.js]");
}

const source = JSON.parse(fs.readFileSync(path.resolve(sourcePath), "utf8"));
const publishedKeys = [
  "monroe-glass-machine-designs-v1",
  "monroe-glass-plant-layout-v6",
];
const missingKeys = publishedKeys.filter((key) => typeof source.items?.[key] !== "string");
if (missingKeys.length) {
  throw new Error(`Workspace export is missing: ${missingKeys.join(", ")}`);
}

const snapshot = {
  kind: source.kind,
  version: source.version,
  appVersion: source.appVersion,
  exportedAt: source.exportedAt,
  sourceOrigin: source.sourceOrigin,
  publishedAt: new Date().toISOString(),
  items: Object.fromEntries(publishedKeys.map((key) => [key, source.items[key]])),
};
const serialized = JSON.stringify(snapshot)
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029");
const output = `// Generated from the approved local Monroe Glass Plant workspace.
(() => {
  "use strict";
  const snapshot = ${serialized};
  window.PLANT_PUBLISHED_WORKSPACE = Object.freeze({
    ...snapshot,
    items: Object.freeze(snapshot.items),
  });
})();
`;

const resolvedTarget = path.resolve(targetPath);
fs.mkdirSync(path.dirname(resolvedTarget), { recursive: true });
fs.writeFileSync(resolvedTarget, output);
console.log(JSON.stringify({
  target: resolvedTarget,
  bytes: Buffer.byteLength(output),
  exportedAt: snapshot.exportedAt,
  publishedAt: snapshot.publishedAt,
  keys: publishedKeys,
}, null, 2));
