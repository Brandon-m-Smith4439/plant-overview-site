import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceExtensions = new Set([".css", ".html", ".js", ".mjs", ".svg", ".ts", ".tsx"]);
const mojibakeMarkers = ["Â", "Ã", "â", "\uFFFD"];

async function collectSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectSourceFiles(entryPath));
    else if (sourceExtensions.has(path.extname(entry.name).toLowerCase())) files.push(entryPath);
  }
  return files;
}

const files = [
  ...await collectSourceFiles(path.join(root, "app")),
  ...await collectSourceFiles(path.join(root, "public")),
];

for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const marker of mojibakeMarkers) {
    assert.ok(
      !content.includes(marker),
      `${path.relative(root, file)} still contains suspicious encoding marker ${JSON.stringify(marker)}.`,
    );
  }
}

const dynamicStudio = await readFile(path.join(root, "public", "machine-design-studio.js"), "utf8");
assert.ok(dynamicStudio.includes("\\u00B7"), "Dynamic Studio separators must use encoding-safe Unicode escapes.");
assert.ok(dynamicStudio.includes("\\u00D7"), "Dynamic Studio multiplication signs must use encoding-safe Unicode escapes.");

const studioShell = await readFile(path.join(root, "app", "machine-studio", "page.tsx"), "utf8");
assert.ok(studioShell.includes("&middot;"), "React Studio static separators must use HTML entities.");

console.log(`UI encoding regression checks passed across ${files.length} app/public source files.`);
