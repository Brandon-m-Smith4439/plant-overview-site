import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = [
  "../app/machine-studio/page.tsx",
  "../public/machine-studio.html",
  "../public/machine-design-studio.js",
  "../public/preview.html",
];

const mojibakeMarkers = ["Â", "Ã", "â", "\uFFFD"];

for (const relativePath of files) {
  const content = await readFile(new URL(relativePath, import.meta.url), "utf8");
  for (const marker of mojibakeMarkers) {
    assert.ok(
      !content.includes(marker),
      `${relativePath} still contains suspicious encoding marker ${JSON.stringify(marker)}.`,
    );
  }
}

const dynamicStudio = await readFile(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
assert.ok(dynamicStudio.includes("\\u00B7"), "Dynamic Studio separators must use encoding-safe Unicode escapes.");
assert.ok(dynamicStudio.includes("\\u00D7"), "Dynamic Studio multiplication signs must use encoding-safe Unicode escapes.");

const studioShell = await readFile(new URL("../app/machine-studio/page.tsx", import.meta.url), "utf8");
assert.ok(studioShell.includes("&middot;"), "React Studio static separators must use HTML entities.");

console.log("UI encoding regression checks passed.");
