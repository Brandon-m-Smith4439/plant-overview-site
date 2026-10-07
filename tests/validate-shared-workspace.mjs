import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const studioPage = fs.readFileSync(new URL("../app/machine-studio/page.tsx", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../app/legacy-script-loader.tsx", import.meta.url), "utf8");
const shared = fs.readFileSync(new URL("../public/shared-workspace.js", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/shared-workspace/route.ts", import.meta.url), "utf8");
const sessionRoute = fs.readFileSync(new URL("../app/api/editor-session/route.ts", import.meta.url), "utf8");

assert.ok(page.includes('"/shared-workspace.js"'), "Plant viewer must load the shared workspace synchronizer.");
assert.ok(studioPage.includes('"/shared-workspace.js"'), "Machine Studio must load the shared workspace synchronizer.");
assert.ok(loader.includes('source === "/shared-workspace.js"') && loader.includes("PLANT_SHARED_WORKSPACE_READY"), "Legacy loader must wait for shared workspace hydration before starting renderers.");
assert.ok(shared.includes("monroe-glass-machine-designs-v1") && shared.includes("monroe-glass-plant-layout-v6"), "Shared workspace must use the exact desktop design/layout keys consumed by mobile and desktop.");
assert.ok(shared.includes("localRevision") && shared.includes("remoteRevision") && shared.includes("local-newer"), "Shared workspace must reconcile local/remote revisions without blindly overwriting protected editor data.");
assert.ok(shared.includes("schedulePublish") && shared.includes('method: "PUT"'), "Owner edits must automatically publish after local saves.");
assert.ok(plant.includes("PLANT_SHARED_WORKSPACE?.schedulePublish?.()"), "Plant layout saves must publish to shared workspace.");
assert.ok(studio.includes("PLANT_SHARED_WORKSPACE?.schedulePublish?.()"), "Machine design/envelope saves must publish to shared workspace.");
assert.ok(plant.includes("updatedAt: new Date().toISOString()"), "Plant layout saves need timestamps for cross-device conflict resolution.");
assert.ok(studio.includes("plantLayout.updatedAt = new Date().toISOString()"), "Machine Studio layout saves need timestamps for cross-device conflict resolution.");
assert.ok(route.includes("PLANT_WORKSPACE_PATH") && route.includes("/data/plant-workspace.json"), "Shared workspace route must target Railway durable storage.");
assert.ok(route.includes("rename(temporary, target)"), "Shared workspace writes must be atomic.");
assert.ok(route.includes("ownerSessionValid") && sessionRoute.includes("pbkdf2Sync"), "Shared workspace publication must remain owner-gated.");
assert.ok(!shared.includes("mobile-envelope") && !plant.includes("mobile-envelope"), "Mobile must not maintain a separate collision-envelope source.");

console.log("Shared desktop/mobile workspace envelope checks passed.");
