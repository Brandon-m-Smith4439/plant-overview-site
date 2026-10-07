import assert from "node:assert/strict";
import fs from "node:fs";

const workspaceRoute = fs.readFileSync(new URL("../app/api/shared-workspace/route.ts", import.meta.url), "utf8");
const sessionRoute = fs.readFileSync(new URL("../app/api/editor-session/route.ts", import.meta.url), "utf8");
const sync = fs.readFileSync(new URL("../public/shared-workspace.js", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../app/legacy-script-loader.tsx", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const studioPage = fs.readFileSync(new URL("../app/machine-studio/page.tsx", import.meta.url), "utf8");
const editor = fs.readFileSync(new URL("../public/editor-access.js", import.meta.url), "utf8");

assert.ok(workspaceRoute.includes("PLANT_WORKSPACE_PATH") && workspaceRoute.includes("plant-workspace.json"), "Shared workspace API must persist to the configured durable file.");
assert.ok(workspaceRoute.includes("ownerSessionValid(request)") && workspaceRoute.includes("export async function PUT"), "Shared workspace writes must require the authenticated editor session.");
assert.ok(sessionRoute.includes("HttpOnly") && sessionRoute.includes("SameSite=Strict"), "Editor session must use a protected HttpOnly cookie.");
assert.ok(sync.includes('const API_PATH = "/api/shared-workspace"') && sync.includes('method: "PUT"'), "Workspace sync must load and publish through the shared API.");
assert.ok(sync.includes("remoteRev >= localRev") && sync.includes("localRev > remoteRev + 1000"), "Workspace sync must reconcile newer desktop/mobile revisions rather than blindly overwriting either side.");
assert.ok(loader.includes("PLANT_SHARED_WORKSPACE_READY") && loader.includes('source === "/shared-workspace.js"'), "Legacy renderer must wait for shared workspace hydration before booting.");
assert.ok(page.indexOf('"/shared-workspace.js"') < page.indexOf('"/plant-app.js"'), "Plant page must hydrate the shared workspace before plant rendering.");
assert.ok(studioPage.indexOf('"/shared-workspace.js"') < studioPage.indexOf('"/machine-design-studio.js"'), "Machine Studio must hydrate shared designs before editor boot.");
assert.ok(plant.includes("PLANT_SHARED_WORKSPACE") && plant.includes("schedulePublish"), "Plant edits must respect shared hydration and publish layout changes.");
assert.ok(studio.includes("PLANT_SHARED_WORKSPACE") && studio.includes("schedulePublish") && studio.includes("updatedAt: new Date().toISOString()"), "Machine Design Studio must timestamp and publish envelope/design edits.");
assert.ok(editor.includes('fetch("/api/editor-session"') && editor.includes("monroe-glass-editor-access-v2"), "Owner login must establish the server editor session used for shared saves.");

console.log("Shared workspace sync validation passed.");
