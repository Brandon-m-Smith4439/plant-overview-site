import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..");
const plant = fs.readFileSync(path.join(root, "public/plant-app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");

assert.match(plant, /id="new-design-machine"/);
assert.match(plant, /id="new-design-machine-name"/);
assert.match(plant, /id="new-design-machine-stage"/);
assert.match(plant, /id="new-design-machine-placement"/);
assert.match(plant, /data-editor-action="add-design-machine"/);
assert.match(plant, /function machineTemplateFromDesign\(design, requestedName, revealStage = state\.stage\)/);
assert.match(plant, /designId: design\.id/);
assert.match(plant, /designScaleMode: "match"/);
assert.match(plant, /placement_status: "designer_created"/);
assert.match(plant, /machines\.push\(machine\)/);
assert.match(plant, /findOpenPositionAcrossFloor\(machine, machine\.x, machine\.z\)/);
assert.match(css, /\.editor-add-design/);
console.log("Plant Layout designer-machine insertion validation passed.");
