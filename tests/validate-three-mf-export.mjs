import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/three-mf-exporter.js", import.meta.url), "utf8");
const context = { window: {}, Blob, TextEncoder, URL, document: {}, setTimeout, console };
vm.runInNewContext(source, context);
assert.ok(context.window.PlantThreeMf, "The shared 3MF exporter must initialize.");

const design = {
  name: "Color test machine",
  components: [
    { type:"box", x:0, y:0, z:0, w:2, h:1, d:1, color:"#e3ad28" },
    { type:"cylinder", x:2, y:0, z:0, w:1, h:2, d:1, color:"#287fbe" },
  ],
};
const blob = context.window.PlantThreeMf.createDesign({ design, scaleDenominator:12 });
assert.equal(blob.type, "model/3mf", "3MF downloads must use the registered model media type.");
const bytes = new Uint8Array(await blob.arrayBuffer());
assert.equal(String.fromCharCode(...bytes.slice(0, 4)), "PK\u0003\u0004", "A 3MF must be an OPC ZIP package.");
const packageText = new TextDecoder("utf-8", { fatal:false }).decode(bytes);
for (const required of ["[Content_Types].xml", "_rels/.rels", "3D/3dmodel.model", "<basematerials", "#E3AD28FF", "#287FBEFF", "<build>"]) {
  assert.ok(packageText.includes(required), `3MF package is missing ${required}.`);
}
assert.match(packageText, /<vertex x="-?\d+\.\d{5}" y="0\.00000"/, "Exported geometry must be normalized onto the print bed in millimeters.");

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
assert.ok(plant.includes("exportPlant3mf") && plant.includes("Export complete color 3MF") && plant.includes("Export selected machine 3MF"), "The layout editor must export the complete plant and one selected machine.");
assert.ok(studio.includes('getElementById("export-design-3mf")'), "The Machine Design Studio must export its current machine as 3MF.");

console.log("Color 3MF package and export-control checks passed.");
