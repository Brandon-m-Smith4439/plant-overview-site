import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeLegacyReleaseToken } from "../scripts/generate-legacy-release-token.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();
const token = computeLegacyReleaseToken(root);
assert.ok(token.startsWith(release + "-"), "Asset cache key must include current version.");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "plant-cache-"));
try {
  fs.mkdirSync(path.join(fixture, "public"));
  fs.mkdirSync(path.join(fixture, "app"));
  fs.writeFileSync(path.join(fixture, "VERSION"), release);
  fs.writeFileSync(path.join(fixture, "public", "plant-app.js"), "original-script");
  fs.writeFileSync(path.join(fixture, "public", "plant-combat.js"), "original-combat");
  fs.writeFileSync(path.join(fixture, "app", "globals.css"), "base-styles");
  const baseline = computeLegacyReleaseToken(fixture);
  fs.writeFileSync(path.join(fixture, "public", "plant-combat.js"), "updated-combat");
  assert.notEqual(computeLegacyReleaseToken(fixture), baseline, "Combat source changes must invalidate browser cache.");
  fs.writeFileSync(path.join(fixture, "public", "plant-combat.js"), "original-combat");
  fs.writeFileSync(path.join(fixture, "app", "globals.css"), "updated-styles");
  assert.notEqual(computeLegacyReleaseToken(fixture), baseline, "Stylesheet changes must invalidate browser cache.");
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
const loader = fs.readFileSync(path.join(root, "app", "legacy-script-loader.tsx"), "utf8");
assert.match(loader, /import\s*\{\s*LEGACY_RELEASE_TOKEN\s*\}\s*from\s*["']\.\/legacy-release-token["']/, "Loader must import generated release fingerprint.");
assert.match(loader, /LEGACY_BUILD_TOKEN\s*=\s*LEGACY_RELEASE_TOKEN/, "Loader must use source fingerprint.");
assert.match(loader, /scriptUrl\.searchParams\.set\(["']release["'], LEGACY_BUILD_TOKEN\)/, "All scripts must receive cache-busting URL.");
assert.equal(release, JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version, "VERSION and package version must agree.");
console.log("Legacy release cache checks passed. Release token: " + token);
