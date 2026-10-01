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
  // Seed fresh read-only browsers, but never overwrite a browser that has
  // authenticated as an editor. Session expiry may lock editing; it must not
  // erase that browser's local machines or custom designs.
  const editorProfileProtected = (() => {
    try {
      return window.localStorage.getItem("monroe-glass-editor-profile-v1") === "protected"
        || window.localStorage.getItem("monroe-glass-plant-layout-v6-backup") !== null
        || window.localStorage.getItem("monroe-glass-machine-designs-v1-backup") !== null;
    } catch { return false; }
  })();
  const hostedReadOnly = !["127.0.0.1", "localhost", "::1"].includes(window.location.hostname)
    && window.monroeEditorAccess?.editingAllowed?.() === false;
  if (hostedReadOnly && !editorProfileProtected) {
    try {
      const recoveryKey = "monroe-glass-recovery-before-publish-v1";
      if (!window.localStorage.getItem(recoveryKey)) {
        const items = {};
        for (const [key, value] of Object.entries(snapshot.items)) {
          const existing = window.localStorage.getItem(key);
          if (existing !== null && existing !== value) items[key] = existing;
        }
        if (Object.keys(items).length) {
          window.localStorage.setItem(recoveryKey, JSON.stringify({ capturedAt: new Date().toISOString(), appVersion: snapshot.appVersion, items }));
        }
      }
      for (const [key, value] of Object.entries(snapshot.items)) {
        window.localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error("The published plant workspace could not be seeded.", error);
    }
  }
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
