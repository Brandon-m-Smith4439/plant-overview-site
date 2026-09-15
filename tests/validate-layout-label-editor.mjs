import assert from "node:assert/strict";
import fs from "node:fs";

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");

for (const field of [
  "labelUseMachineName",
  "labelText",
  "labelAbbreviation",
  "labelTextColor",
  "labelBackgroundColor",
  "labelSizePercent",
  "labelFontWeight",
  "labelUppercase",
  "labelAnchorXPercent",
  "labelAnchorYPercent",
  "labelAnchorZPercent",
  "labelHeightOffset",
]) {
  assert.ok(plant.includes(field), `Saved machine labels are missing ${field}.`);
}

assert.match(plant, /data-label-field="labelText"/);
assert.match(plant, /data-label-field="labelAbbreviation"/);
assert.match(plant, /data-label-field="labelTextColor"/);
assert.match(plant, /data-label-field="labelBackgroundColor"/);
assert.match(plant, /data-label-field="labelSizePercent"/);
assert.match(plant, /data-label-field="labelFontWeight"/);
assert.match(plant, /data-label-check="labelUppercase"/);
assert.match(plant, /data-editor-action="reset-selected-label"/);
assert.match(plant, /data-editor-action="refresh-labels"/);
assert.match(plant, /data-editor-action="reset-all-labels"/);
assert.match(plant, /data-editor-action="center-label-pointer"/);
assert.match(plant, /data-label-field="labelAnchorYPercent"/);
assert.match(plant, /function refreshLayoutLabels\(\{ resetCustom = false \} = \{\}\)/);
assert.match(plant, /if \(resetCustom \|\| machine\.labelUseMachineName !== false\)/, "Updating linked labels must preserve custom label text.");
assert.match(plant, /refreshLayoutLabels\(\{ resetCustom: true \}\)/, "The global reset must explicitly replace custom label text.");
assert.match(plant, /textColor: machine\.labelTextColor/);
assert.match(plant, /backgroundColor: machine\.labelBackgroundColor/);
assert.match(plant, /fontWeight: machine\.labelFontWeight/);

console.log("Custom layout label editing and refresh/reset validation passed.");
