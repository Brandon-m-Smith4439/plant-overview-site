import fs from "node:fs";
import path from "node:path";

const target = path.resolve(
  "node_modules/vinext/dist/server/static-file-cache.js",
);

if (!fs.existsSync(target)) {
  console.error(`[local-start] vinext static cache was not found: ${target}`);
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");
const buggy = "relativePath: path.relative(base, batch[j]),";
const fixed =
  'relativePath: path.relative(base, batch[j]).split(path.sep).join("/"),';

if (original.includes(fixed)) {
  console.log("[local-start] vinext Windows static-asset path fix is ready.");
  process.exit(0);
}

if (!original.includes(buggy)) {
  console.error(
    "[local-start] vinext changed and the Windows static-asset fix could not be applied safely.",
  );
  process.exit(1);
}

fs.writeFileSync(target, original.replace(buggy, fixed), "utf8");
console.log("[local-start] Applied vinext Windows static-asset path fix.");
