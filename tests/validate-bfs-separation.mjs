import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
const at = (p) => new URL("../" + p, import.meta.url);
const read = (p) => readFileSync(at(p), "utf8");
for (const path of ["public/plant-combat.js", "public/combat-multiplayer.js", "app/api/combat-lobby/route.ts"]) {
  assert.equal(existsSync(at(path)), false, "BFS must not ship " + path);
}
for (const src of ["/plant-combat.js", "/combat-multiplayer.js"]) assert.equal(read("app/page.tsx").includes(src), false);
assert.equal(read("app/plant-owner-7f3a9c/page.tsx").includes("owner-combat-card"), false);
for (const control of ['data-toggle="combat"', 'data-toggle="zombie"']) assert.equal(read("public/plant-app.js").includes(control), false);
assert.match(read("public/plant-app.js"), /const ownerCombatAllowed = \(\) => false;/);
assert.equal(read("public/preview.html").includes("plant-combat.js"), false);
assert.equal(read("public/preview.html").includes("combat-multiplayer.js"), false);
assert.equal(read("package.json").includes("validate-combat"), false);
assert.equal(read("public/shared-workspace.js").includes('"x-monroe-owner-session"'), false);
console.log("BFS separation checks passed.");
