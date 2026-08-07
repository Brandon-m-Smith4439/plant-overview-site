import assert from "node:assert/strict";
import fs from "node:fs";

const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const studioHtml = fs.readFileSync(new URL("../public/machine-studio.html", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");

for (const field of ["animationStep1PauseSeconds", "animationStep2PauseSeconds", "animationStep3PauseSeconds", "animationStep4PauseSeconds"]) {
  assert.ok(studio.includes(field), `Designer is missing ${field}.`);
  const timelineField = `step${field.match(/Step(\d)/)?.[1] || ""}Pause`;
  assert.ok(studioHtml.includes(timelineField), `Designer timeline UI is missing ${timelineField}.`);
  assert.ok(plant.includes(field), `Plant layout is missing ${field}.`);
}
assert.ok(studio.includes("pauses.reduce((sum, value) => sum + value, 0)"), "Designer four-step duration does not sum all four waits.");
assert.ok(plant.includes("function fourStepOffset(source, time, firstAmount, secondAmount, combine)"), "Shared plant four-step helper is missing.");
assert.ok(plant.includes("if (local < pauses[index])"), "Plant four-step helper does not pause independently after each leg.");
console.log("Independent four-corner animation pause checks passed.");


function fourCornerPosition(seconds, pauses) {
  const legDuration = 0.25;
  const total = legDuration * 4 + pauses.reduce((sum, value) => sum + value, 0);
  let local = ((seconds % total) + total) % total;
  const legs = [
    { from: [0, 0], to: [10, 0] },
    { from: [10, 0], to: [10, 20] },
    { from: [10, 20], to: [0, 20] },
    { from: [0, 20], to: [0, 0] },
  ];
  for (let index = 0; index < legs.length; index += 1) {
    const leg = legs[index];
    if (local < legDuration) {
      const progress = local / legDuration;
      return [
        leg.from[0] + (leg.to[0] - leg.from[0]) * progress,
        leg.from[1] + (leg.to[1] - leg.from[1]) * progress,
      ];
    }
    local -= legDuration;
    if (local < pauses[index]) return leg.to;
    local -= pauses[index];
  }
  return [0, 0];
}

// Up and forward each wait five seconds; down and backward continue immediately.
const requestedPauses = [5, 5, 0, 0];
assert.deepEqual(fourCornerPosition(1, requestedPauses), [10, 0], "Step 1 should hold for five seconds.");
assert.deepEqual(fourCornerPosition(5.6, requestedPauses), [10, 20], "Step 2 should hold for five seconds.");
assert.notDeepEqual(fourCornerPosition(10.7, requestedPauses), [10, 20], "Step 3 should not add a wait.");
