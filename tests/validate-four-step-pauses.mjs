import assert from "node:assert/strict";
import fs from "node:fs";

const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const studioHtml = fs.readFileSync(new URL("../public/machine-studio.html", import.meta.url), "utf8");
const studioPage = fs.readFileSync(new URL("../app/machine-studio/page.tsx", import.meta.url), "utf8");

// v0.10.4 fields remain as migration fallbacks so existing saved animations retain timing.
assert.ok(studio.includes("animationSecondaryPauseSeconds"), "Designer legacy axis-2 pause migration is missing.");
assert.ok(plant.includes("animationSecondaryPauseSeconds"), "Plant legacy axis-2 pause migration is missing.");
for (const field of ["animationStep1PauseSeconds", "animationStep2PauseSeconds", "animationStep3PauseSeconds", "animationStep4PauseSeconds"]) {
  assert.ok(studio.includes(field), `Designer is missing ${field}.`);
  assert.ok(plant.includes(field), `Plant is missing ${field}.`);
  const timelineField = `step${field.match(/Step(\d)/)?.[1] || ""}Pause`;
  assert.ok(studioHtml.includes(timelineField) && studioPage.includes(timelineField), `Designer timeline UI is missing ${timelineField} from one entry point.`);
}
assert.ok(studio.includes("fourStepPauseDurations"), "Designer four-corner migration helper is missing.");
assert.ok(plant.includes("fourStepPauseDurations"), "Plant four-corner migration helper is missing.");
console.log("Four-step pause migration checks passed.");
