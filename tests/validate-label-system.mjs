import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plant = await readFile(new URL("../public/plant-app.js", import.meta.url), "utf8");

assert.ok(plant.includes('labelMode: "smart"'), "Smart labels must be the default label mode.");
assert.ok(plant.includes('const modes = ["smart", "all", "off"]'), "The label control must cycle through smart, all, and off modes.");
assert.ok(plant.includes("PRIMARY_LABEL_TYPES") && plant.includes("SUPPORT_LABEL_TYPES") && plant.includes("MINOR_LABEL_TYPES"), "Labels must use type-based importance and sizing groups.");
assert.ok(plant.includes("function compactMachineLabel"), "Machine labels need a dedicated shortening function.");
assert.ok(plant.includes("function shouldShowSmartLabel"), "Smart labels need zoom-aware visibility rules.");
assert.ok(plant.includes("function smartLabelBudget"), "Smart labels need a viewport and zoom density budget.");
assert.ok(plant.includes("function smartLabelRepeatLimit"), "Smart labels must limit repeated cart, person, and support-equipment names.");
assert.ok(plant.includes("labelCandidates") && plant.includes("profile.rank"), "Important equipment labels must be ordered before lower-priority labels.");
assert.ok(plant.includes('cssSize: 12') && plant.includes('cssSize: 9'), "Different object types must receive different label sizes.");
assert.ok(plant.includes("profile.maxChars"), "Label text must be constrained to a type-appropriate maximum length.");
assert.ok(plant.includes("const priority = selected;"), "Only an actively selected object may bypass the smart-label density budget.");
assert.ok(plant.includes("repeatedLabelsDrawn"), "Repeated equipment labels must be tracked while composing each frame.");
assert.ok(plant.includes("clamp(viewportBudget * zoomFactor, 12, 48)"), "Abbreviated mode must show more useful labels from the overview without becoming unbounded.");
assert.ok(plant.includes("function smartLabelMinimumRank") && plant.includes("wasVisible ? .07 : 0"), "Zoom thresholds must use hysteresis instead of toggling labels at one exact value.");
assert.ok(plant.includes("function updateLabelVisualState") && plant.includes("labelTransitionsActive"), "Labels must fade smoothly when their visibility changes.");
assert.ok(plant.includes("preferredSlot") && plant.includes("slotHoldUntil"), "Labels must remember and briefly hold their collision slot instead of snapping between positions.");
assert.ok(plant.includes("positionBlend") && plant.includes("visual.drawX"), "Label position changes must be interpolated.");
assert.ok(plant.includes("Math.exp(-elapsed / 24)") && plant.includes("sideOffset"), "Labels must settle quickly into pointer-connected side positions without excessive momentum.");
assert.ok(plant.includes("displayMachineLabel") && plant.includes('labelTextMode === "abbreviated"'), "The viewer must support full and abbreviated label text.");
assert.ok(plant.includes('data-label-display="full"') && plant.includes('data-label-display="off"'), "The label icon must expose full, abbreviated, and off choices.");
assert.ok(plant.includes("labelAnchorXPercent") && plant.includes("labelAnchorYPercent") && plant.includes("labelAnchorZPercent") && plant.includes("labelHeightOffset"), "Each machine label must expose an editable three-axis pointer anchor and label height.");
assert.ok(plant.includes("labelAbbreviation") && plant.includes('data-label-field="labelAbbreviation"'), "Each machine must support an editable abbreviated label.");
assert.ok(plant.includes('ctx.strokeStyle = "rgba(9,18,21,.78)"') && plant.includes("Math.max(3.6, 3.2 * pixelScale)"), "Pointers must use a high-contrast line and obvious target marker.");
assert.ok(plant.includes("walkLabelDistance") && plant.includes("labelHorizon = 96"), "First-person labels must be larger and load only near their machines.");
assert.ok(plant.includes("options.forceVisible") && plant.includes('state.labelTextMode === "full"'), "Full overview mode must keep every eligible machine label visible.");
assert.ok(plant.includes('ctx.textAlign = "left"'), "Professional machine tags must use easy-to-scan left-aligned text.");
assert.ok(plant.includes('const accent = selected ? "#f5b353"'), "Selected and current equipment must receive distinct status accents.");
assert.ok(!plant.includes('`${machine.name}${current ? ` · ${source}`'), "Long source metadata must not be appended to every current-stage label.");

console.log("Professional, decluttered, zoom-aware machine-label regression checks passed.");
