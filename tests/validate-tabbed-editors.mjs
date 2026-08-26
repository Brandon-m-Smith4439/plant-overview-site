import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const machineHtml = fs.readFileSync(path.join(root, "public/machine-studio.html"), "utf8");
const machineTsx = fs.readFileSync(path.join(root, "app/machine-studio/page.tsx"), "utf8");
const plantSource = fs.readFileSync(path.join(root, "public/plant-app.js"), "utf8");
const designerSource = fs.readFileSync(path.join(root, "public/machine-design-studio.js"), "utf8");
const previewHtml = fs.readFileSync(path.join(root, "public/preview.html"), "utf8");
const appPage = fs.readFileSync(path.join(root, "app/page.tsx"), "utf8");
const legacyLoader = fs.readFileSync(path.join(root, "app/legacy-script-loader.tsx"), "utf8");

function count(source, token) {
  return source.split(token).length - 1;
}

for (const tab of ["designs", "parts", "add", "plant"]) {
  assert.ok(machineHtml.includes(`data-browser-tab="${tab}"`), `Designer left panel should include ${tab} tab`);
  assert.ok(machineHtml.includes(`data-browser-panel="${tab}"`), `Designer left panel should include ${tab} panel`);
}
for (const tab of ["properties", "transform", "animation"]) {
  assert.ok(machineHtml.includes(`data-part-tab="${tab}"`), `Designer right panel should include ${tab} tab`);
  assert.ok(machineHtml.includes(`data-part-panel="${tab}"`), `Designer right panel should include ${tab} panel`);
}
for (const tab of ["select", "transform", "animation", "add"]) {
  assert.ok(plantSource.includes(`data-object-editor-tab="${tab}"`), `Plant object editor should include ${tab} tab`);
  assert.ok(plantSource.includes(`data-object-editor-panel="${tab}"`), `Plant object editor should include ${tab} panel`);
}
for (const section of ["machines", "pillars", "timeline", "project"]) {
  assert.ok(plantSource.includes(`data-editor-section="${section}"`), `Plant editor should include ${section} section`);
}

const publicIds = [...machineHtml.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = [...new Set(publicIds.filter((id, index) => publicIds.indexOf(id) !== index))];
assert.deepEqual(duplicates, [], "Designer HTML should not contain duplicate IDs");
const tsxIds = new Set([...machineTsx.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
for (const id of publicIds) assert.ok(tsxIds.has(id), `Designer TSX is missing public editor control: ${id}`);
assert.equal(count(machineHtml, 'id="toggle-animation-timeline"'), 1, "Designer should expose one timeline tool button");
assert.equal(count(machineHtml, 'id="animation-timeline-workspace"'), 1, "Designer should expose one docked timeline workspace");
assert.equal(count(designerSource, 'document.getElementById("toggle-animation-timeline")?.addEventListener'), 1, "timeline tool handler should only be registered once");
assert.equal(count(designerSource, 'document.getElementById("timeline-target-picker")?.addEventListener'), 1, "timeline target handler should only be registered once");
assert.equal(count(plantSource, 'data-editor-action="done"'), 1, "Plant editor should expose one persistent Done editing action");
assert.equal(count(plantSource, 'document.querySelectorAll("[data-object-editor-tab]")'), 0, "Plant editor tab lookup should remain panel-scoped");
assert.ok(count(plantSource, 'panel.querySelectorAll("[data-object-editor-tab]")') >= 2, "Plant editor tabs should update and register through the panel");

const machineTimelineScript = machineHtml.indexOf('<script src="animation-timeline.js"></script>');
const machineWorkspaceScript = machineHtml.indexOf('<script src="animation-timeline-workspace.js"></script>');
const machineAppScript = machineHtml.indexOf('<script src="machine-design-studio.js"></script>');
assert.ok(machineTimelineScript >= 0 && machineTimelineScript < machineWorkspaceScript && machineWorkspaceScript < machineAppScript, "Designer timeline modules should load before the Designer application");
const previewTimelineScript = previewHtml.indexOf('<script src="animation-timeline.js"></script>');
const previewWorkspaceScript = previewHtml.indexOf('<script src="workspace-transfer.js"></script>');
const plantAppScript = previewHtml.indexOf('<script src="plant-app.js"></script>');
assert.ok(previewTimelineScript >= 0 && previewTimelineScript < plantAppScript, "Plant timeline engine should load before the Plant application");
assert.ok(previewWorkspaceScript >= 0 && previewWorkspaceScript < plantAppScript, "Workspace transfer should load before the Plant application");
assert.ok(machineTsx.includes('"/animation-timeline.js"') && machineTsx.includes('"/animation-timeline-workspace.js"') && machineTsx.indexOf('"/animation-timeline.js"') < machineTsx.indexOf('"/animation-timeline-workspace.js"') && machineTsx.indexOf('"/animation-timeline-workspace.js"') < machineTsx.indexOf('"/machine-design-studio.js"'), "Designer TSX should load both timeline modules first");
assert.ok(appPage.includes('"/animation-timeline.js"') && appPage.indexOf('"/animation-timeline.js"') < appPage.indexOf('"/plant-app.js"'), "Plant TSX should load the timeline engine first");
assert.ok(appPage.includes('"/workspace-transfer.js"') && appPage.indexOf('"/workspace-transfer.js"') < appPage.indexOf('"/plant-app.js"'), "Plant TSX should load workspace transfer before the Plant application");
assert.ok(appPage.includes("<LegacyScriptLoader") && machineTsx.includes("<LegacyScriptLoader"), "App routes should defer legacy scene scripts until React has hydrated.");
assert.ok(legacyLoader.includes('useEffect(() => {') && legacyLoader.includes("await loadScript(source)"), "Legacy scripts should load sequentially after hydration.");
assert.ok(!appPage.includes("<script ") && !machineTsx.includes("<script "), "App routes must not run DOM-mutating scene scripts during hydration.");

console.log("Tabbed editor validation passed.");
