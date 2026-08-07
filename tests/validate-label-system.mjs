import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plant = await readFile(new URL("../public/plant-app.js", import.meta.url), "utf8");

assert.ok(plant.includes('labelMode: "smart"'), "Smart labels must be the default label mode.");
assert.ok(plant.includes('const modes = ["smart", "all", "off"]'), "The label control must cycle through smart, all, and off modes.");
assert.ok(plant.includes("PRIMARY_LABEL_TYPES") && plant.includes("SUPPORT_LABEL_TYPES") && plant.includes("MINOR_LABEL_TYPES"), "Labels must use type-based importance and sizing groups.");
assert.ok(plant.includes("function compactMachineLabel"), "Machine labels need a dedicated shortening function.");
assert.ok(plant.includes("function shouldShowSmartLabel"), "Smart labels need zoom-aware visibility rules.");
assert.ok(plant.includes("function smartLabelBudget"), "Smart labels need a viewport and zoom density budget.");
assert.ok(plant.includes("labelCandidates") && plant.includes("profile.rank"), "Important equipment labels must be ordered before lower-priority labels.");
assert.ok(plant.includes('cssSize: 12') && plant.includes('cssSize: 9'), "Different object types must receive different label sizes.");
assert.ok(plant.includes("profile.maxChars"), "Label text must be constrained to a type-appropriate maximum length.");
assert.ok(!plant.includes('`${machine.name}${current ? ` · ${source}`'), "Long source metadata must not be appended to every current-stage label.");

console.log("Smart, zoom-aware, compact machine-label regression checks passed.");
