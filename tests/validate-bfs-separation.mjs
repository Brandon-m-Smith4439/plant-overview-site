import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
const at = (file) => new URL("../" + file, import.meta.url);
const read = (file) => readFileSync(at(file), "utf8");
const absentFiles = [
  "public/plant-combat.js",
  "public/combat-multiplayer.js",
  "app/api/combat-lobby/route.ts",
];
absentFiles.forEach(file => assert.equal(existsSync(at(file)), false, "Company edition must exclude " + file));
const forbiddenPublic = /(?:combatController|createPlantCombatMode|data-toggle=['"](?:combat|zombie)['"]|createCombat|combat-lobby|combat-hud|mystery-box|combat-weapon-|combat-zombie-)/i;
for (const file of ["app/page.tsx","app/plant-owner-7f3a9c/page.tsx","public/plant-app.js","public/preview.html","public/machine-studio.html","app/globals.css","public/machine-designs.js"]) {
 assert.doesNotMatch(read(file), forbiddenPublic, "Unexpected unrelated interactive feature in "+file);
}
assert.doesNotMatch(read("app/globals.css"), /(?:combat-|zombie-|game-over|weapon-)/i);
assert.doesNotMatch(read("public/machine-designs.js"), /(?:combatWeapon|combatZombie|combat-weapon-|combat-zombie-)/i);
assert.doesNotMatch(read("public/machine-studio.html"), /(?:combat|zombie|weapon|mystery)/i);
assert.doesNotMatch(read("README.md") + read("CHANGELOG.md"), /\b(?:combat|zombie|weapon|multiplayer|game)\b/i);
assert.match(read("public/published-workspace.js"), /PLANT_PUBLISHED_WORKSPACE\s*=\s*null/);
assert.ok(read("public/plant-app.js").includes("processConnections"));
assert.ok(read("public/plant-app.js").includes("processPointers"));
assert.ok(read("public/machine-design-studio.js").includes("function loadLibrary"));
assert.doesNotMatch(read("package.json"), /validate-combat/);
assert.equal(read("public/shared-workspace.js").includes('"x-monroe-owner-session"'), false);
console.log("BFS company-only code, assets, labels, route/pointer data and editor separation passed.");
