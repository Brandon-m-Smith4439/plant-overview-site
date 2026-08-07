import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const timelineSource = fs.readFileSync(path.join(root, "public/animation-timeline.js"), "utf8");
const designerSource = fs.readFileSync(path.join(root, "public/machine-design-studio.js"), "utf8");
const plantSource = fs.readFileSync(path.join(root, "public/plant-app.js"), "utf8");
const machineHtml = fs.readFileSync(path.join(root, "public/machine-studio.html"), "utf8");

const context = { window: {}, console, Date, Math };
vm.createContext(context);
vm.runInContext(timelineSource, context, { filename: "animation-timeline.js" });
const engine = context.window.MachineAnimationTimeline;
assert.ok(engine, "animation timeline module should attach to window");

const expectedTypes = ["move", "oscillate", "loop", "fourStep", "rotate", "bob", "pulse", "splitRectangles", "fadeIn", "fadeOut", "blink", "visibility", "wait"];
assert.deepEqual(Array.from(engine.TYPES, (item) => item.value), expectedTypes, "timeline should publish every supported animation type");
assert.equal(engine.MIN_TIMELINE_SECONDS, 30, "all animation timelines should begin with a 30-second workspace");
for (const type of expectedTypes) {
  const clip = engine.createClip(type, 0);
  assert.ok(clip.duration > 0, `${type} should have a non-zero preset duration`);
  assert.equal(clip.duration, engine.PRESETS[type].duration, `${type} should use its published preset duration`);
}

const legacy = engine.normalizeTimeline(null, {
  animationEnabled: true,
  animationType: "oscillate",
  animationAxis: "z",
  animationAmount: 12,
  animationSpeed: 0.5,
  animationPauseSeconds: 0.75,
});
assert.equal(legacy.clips.length, 1, "legacy animation settings should migrate into one timeline clip");
assert.equal(legacy.clips[0].type, "oscillate");
assert.equal(legacy.clips[0].axis, "z");
assert.equal(legacy.clips[0].amount, 12);
assert.equal(legacy.clips[0].pauseAtPositive, 0.75, "legacy oscillation pause should migrate to the forward endpoint");
assert.equal(legacy.clips[0].pauseAtNegative, 0.75, "legacy oscillation pause should migrate to the return endpoint");

const legacyLoop = engine.normalizeTimeline(null, {
  animationEnabled: true,
  animationType: "loop",
  animationAxis: "x",
  animationAmount: 6,
  animationSpeed: 1,
  animationPauseSeconds: 1.25,
});
assert.equal(legacyLoop.clips[0].cyclePause, 1.25, "legacy loop pause should migrate to the cycle pause");

const moveTimeline = {
  enabled: true,
  loop: false,
  duration: 2,
  playbackRate: 1,
  clips: [{ type: "move", start: 0, duration: 2, amount: 10, axis: "x", easing: "linear", holdEnd: true }],
};
assert.equal(engine.evaluateTimeline(moveTimeline, 1).translation[0], 5, "move clip should interpolate through its duration");
assert.equal(engine.evaluateTimeline(moveTimeline, 5).translation[0], 10, "non-looping move clip should hold its final value");

assert.equal(engine.evaluateTimeline({ ...moveTimeline, loop: true, duration: 5 }, 3).translation[0], 10, "looping timelines should hold a clip's final value until the timeline wraps");
assert.equal(engine.timelineDuration({ duration: 1, clips: [{ start: 2, duration: 3 }] }), 30, "timeline length should keep the 30-second minimum");
assert.equal(engine.timelineDuration({ duration: 30, clips: [{ start: 29, duration: 6 }] }), 35, "timeline length should expand when a clip runs beyond 30 seconds");
assert.equal(engine.timelineDuration({ duration: 30, clips: [{ start: 31, duration: 6 }] }), 40, "timeline length should round up in five-second increments after 30 seconds");
assert.equal(engine.timelineDuration({ duration: 886370, clips: [] }), 30, "runaway saved span metadata should not enlarge an empty timeline");
assert.equal(engine.normalizeTimeline({ duration: 886370, clips: [] }).duration, 0, "normalization should repair legacy span metadata");
assert.equal(engine.sharedTimelineDuration([
  { clips: [{ start: 0, duration: 4 }] },
  { clips: [{ start: 33, duration: 3 }] },
]), 40, "the shared machine clock should expand to the latest clip across every part");

const sharedClockClip = [{ type: "move", start: 0, duration: 4, amount: 8, axis: "x", easing: "linear", holdEnd: true }];
const fastLocalTimeline = { enabled: true, loop: true, playbackRate: 4, clips: sharedClockClip };
const slowLocalTimeline = { enabled: true, loop: false, playbackRate: 0.25, clips: sharedClockClip };
const sharedOptions = { sharedClock: true, duration: 30, loop: true, playbackRate: 1 };
assert.equal(engine.evaluateTimeline(fastLocalTimeline, 2, sharedOptions).translation[0], 4, "shared-clock evaluation should ignore a part's legacy local speed");
assert.equal(engine.evaluateTimeline(slowLocalTimeline, 2, sharedOptions).translation[0], 4, "every part should sample the same absolute machine time");

const endpointPauseTimeline = {
  enabled: true,
  loop: false,
  duration: 8,
  clips: [{
    type: "oscillate",
    start: 0,
    duration: 8,
    cycleSeconds: 4,
    pauseAtPositive: 2,
    pauseAtNegative: 2,
    amount: 10,
    axis: "x",
    easing: "linear",
  }],
};
assert.equal(engine.evaluateTimeline(endpointPauseTimeline, 1.25).translation[0], 5, "oscillation should hold at its positive endpoint during the configured pause");
assert.equal(engine.evaluateTimeline(endpointPauseTimeline, 5.25).translation[0], -5, "oscillation should hold at its negative endpoint during the configured pause");

const cyclePauseTimeline = {
  enabled: true,
  loop: false,
  duration: 4,
  clips: [{
    type: "loop",
    start: 0,
    duration: 4,
    cycleSeconds: 2,
    cyclePause: 2,
    amount: 10,
    axis: "x",
    easing: "linear",
  }],
};
assert.equal(engine.evaluateTimeline(cyclePauseTimeline, 3).translation[0], 5, "loop motion should hold its endpoint during the configured cycle pause");

const overlapTimeline = {
  enabled: true,
  loop: false,
  duration: 2,
  clips: [
    { type: "move", start: 0, duration: 2, amount: 8, axis: "x", easing: "linear" },
    { type: "move", start: 0, duration: 2, amount: 4, axis: "y", easing: "linear" },
  ],
};
assert.deepEqual(Array.from(engine.evaluateTimeline(overlapTimeline, 1).translation), [4, 2, 0], "overlapping clips should compose on the same part");

const rotateClip = engine.createClip("rotate", 0);
assert.equal(rotateClip.amount, 90, "rotate clips should default to a 90-degree target angle");
assert.equal(rotateClip.holdEnd, true, "rotate clips should hold their requested final orientation");
assert.deepEqual([rotateClip.rotationPivotX, rotateClip.rotationPivotY, rotateClip.rotationPivotZ], [0, 0, 0], "rotate clips should default to the part center");

const rotate = engine.evaluateTimeline({ enabled: true, loop: false, clips: [{ type: "rotate", start: 0, duration: 2, amount: 90, axis: "y", rotationPivotX: -2, rotationPivotY: 1, rotationPivotZ: 3, easing: "linear", holdEnd: true }] }, 1);
assert.equal(rotate.rotation[1], 45, "rotate clips should interpolate to a fixed target angle instead of accumulating cycles");
assert.equal(rotate.rotationOperations.length, 1, "rotate clips should expose one pivot-aware rotation operation");
assert.deepEqual(Array.from(rotate.rotationOperations[0].rotation), [0, 45, 0], "rotate operation should preserve the selected axis");
assert.deepEqual(Array.from(rotate.rotationOperations[0].pivotOffset), [-2, 1, 3], "rotate operation should preserve its local pivot offsets");

const completedRotation = engine.evaluateTimeline({ enabled: true, loop: false, clips: [{ type: "rotate", start: 0, duration: 1, amount: 90, axis: "z", easing: "linear", holdEnd: true }] }, 1.5);
assert.equal(completedRotation.rotation[2], 90, "completed rotate clips should stop at the requested angle instead of continuing to spin");

const flippedRotation = engine.evaluateTimeline({ enabled: true, loop: false, clips: [{ type: "rotate", start: 0, duration: 2, amount: -90, axis: "z", easing: "linear", holdEnd: true }] }, 1);
assert.equal(flippedRotation.rotation[2], -45, "a flipped Rotate clip should use the negative angle without a separate animation-engine direction mode");

const migratedSpin = engine.normalizeClip({ type: "spin", amount: 270, axis: "x" });
assert.equal(migratedSpin.type, "rotate", "saved timeline spin clips should migrate to keyed rotate clips");
assert.equal(migratedSpin.amount, 270, "spin migration should preserve the saved degree amount");
assert.equal(engine.createClip("spin", 0).type, "rotate", "legacy callers that create a spin clip should receive a Rotate clip");

const restoredDirectionClip = engine.normalizeClip({ type: "rotate", amount: 90, rotationDirection: "negative" });
assert.equal(restoredDirectionClip.amount, -90, "version 0.12.9 reverse-direction clips should migrate back to the stable signed-angle format");
assert.equal(restoredDirectionClip.rotationDirection, undefined, "the withdrawn direction field should not remain in normalized clips");

const pulse = engine.evaluateTimeline({ enabled: true, loop: false, duration: 1, clips: [{ type: "pulse", start: 0, duration: 1, cycleSeconds: 1, amount: 20, axis: "all", easing: "linear" }] }, 0.25);
assert.ok(pulse.scale.every((value) => Math.abs(value - 1.2) < 1e-9), "pulse clip should scale every requested axis");

const splitClip = engine.createClip("splitRectangles", 0);
assert.equal(splitClip.axis, "all", "rectangular split should default to spreading across all axes");
assert.equal(splitClip.splitColumnsMin, 3, "rectangular split should default to at least three columns");
assert.equal(splitClip.splitColumnsMax, 6, "rectangular split should default to at most six columns");
assert.equal(splitClip.splitRows, 3, "rectangular split should default to three even rows");
assert.equal(splitClip.splitLayers, 1, "rectangular split should default to one depth layer");
const splitState = engine.evaluateTimeline({
  enabled: true,
  loop: false,
  clips: [{
    type: "splitRectangles",
    start: 0,
    duration: 2,
    amount: 8,
    axis: "x",
    splitColumnsMin: 3,
    splitColumnsMax: 5,
    splitRows: 2,
    splitLayers: 2,
    splitSeed: 41,
    splitRotation: 60,
    easing: "linear",
    holdEnd: true,
  }],
}, 1);
assert.equal(splitState.rectangularSplit.progress, 0.5, "rectangular split should follow clip progress");
assert.equal(splitState.rectangularSplit.distance, 8, "rectangular split should expose its spread distance");
assert.equal(splitState.rectangularSplit.axis, "x", "rectangular split should preserve the selected spread axis");
assert.ok(splitState.rectangularSplit.columns >= 3 && splitState.rectangularSplit.columns <= 5, "rectangular split should choose a column count inside the configured range");
const firstLayout = engine.rectangularSplitCells(splitState.rectangularSplit);
const secondLayout = engine.rectangularSplitCells(splitState.rectangularSplit);
assert.equal(firstLayout.cells.length, firstLayout.columns * 2 * 2, "rectangular split should build the selected column count across every row and layer");
assert.ok(firstLayout.cells.every((cell) => Math.abs(cell.direction[0]) === 1 && cell.direction[1] === 0 && cell.direction[2] === 0), "X-axis rectangular splits should spread only along X");
assert.deepEqual(firstLayout.cells, secondLayout.cells, "rectangular split randomness should be deterministic for a saved seed");

const normalizedLegacySplit = engine.normalizeClip({ type: "splitRectangles", splitColumns: 3, axis: "x" });
assert.equal(normalizedLegacySplit.axis, "all", "version 0.12.6 split clips should retain their original all-axis spread");
const legacyFixedSplit = engine.rectangularSplitCells({ splitColumns: 3, splitRows: 2, splitLayers: 2, splitSeed: 41 });
assert.equal(legacyFixedSplit.columns, 3, "legacy fixed-column splits should retain their saved column count");
assert.equal(legacyFixedSplit.cells.length, 12, "legacy fixed-column splits should retain their original grid size");

const fadeInTimeline = {
  enabled: true,
  loop: false,
  clips: [{ type: "fadeIn", start: 2, duration: 2, easing: "linear", holdEnd: true }],
};
assert.equal(engine.evaluateTimeline(fadeInTimeline, 1).opacity, 0, "fade-in clips should keep the part invisible before they begin");
assert.equal(engine.evaluateTimeline(fadeInTimeline, 3).opacity, 0.5, "fade-in clips should interpolate opacity across their duration");
assert.equal(engine.evaluateTimeline(fadeInTimeline, 5).opacity, 1, "fade-in clips should hold full opacity after completion");

const fadeOutTimeline = {
  enabled: true,
  loop: false,
  clips: [{ type: "fadeOut", start: 0, duration: 2, easing: "linear", holdEnd: true }],
};
assert.equal(engine.evaluateTimeline(fadeOutTimeline, 1).opacity, 0.5, "fade-out clips should interpolate opacity across their duration");
assert.equal(engine.evaluateTimeline(fadeOutTimeline, 3).opacity, 0, "fade-out clips should hold zero opacity after completion");

const fadeSequence = {
  enabled: true,
  loop: false,
  clips: [
    { type: "fadeOut", start: 0, duration: 2, easing: "linear", holdEnd: true },
    { type: "fadeIn", start: 4, duration: 2, easing: "linear", holdEnd: true },
  ],
};
assert.equal(engine.evaluateTimeline(fadeSequence, 3).opacity, 0, "a completed fade-out should remain invisible until the next fade clip");
assert.equal(engine.evaluateTimeline(fadeSequence, 5).opacity, 0.5, "a later fade-in should restore opacity from zero");
assert.equal(engine.evaluateTimeline(fadeSequence, 7).opacity, 1, "a fade-out and fade-in sequence should end fully visible");

const blinkTimeline = {
  enabled: true,
  loop: false,
  duration: 2,
  clips: [{ type: "blink", start: 0, duration: 2, cycleSeconds: 1, blinkDutyCycle: 0.5, blinkMinOpacity: 0.1, easing: "step" }],
};
assert.equal(engine.evaluateTimeline(blinkTimeline, 0.25).opacity, 1, "blink should remain visible during the configured visible portion");
assert.equal(engine.evaluateTimeline(blinkTimeline, 0.75).opacity, 0.1, "blink should enter its dim portion even with the default step easing");
assert.equal(engine.evaluateTimeline(blinkTimeline, 1.25).opacity, 1, "blink should restart its visible portion on the next cycle");
assert.equal(
  engine.evaluateTimeline({ ...blinkTimeline, clips: [{ ...blinkTimeline.clips[0], blinkMinOpacity: 0 }] }, 0.75).opacity,
  0,
  "blink should support a fully invisible minimum opacity",
);
assert.equal(engine.normalizeClip({ type: "blink", blinkMinOpacity: 0 }).blinkMinOpacity, 0, "blink normalization should preserve a zero minimum opacity");

const hidden = engine.evaluateTimeline({ enabled: true, loop: false, duration: 1, clips: [{ type: "visibility", start: 0, duration: 1, visibilityAction: "hide", easing: "step" }] }, 0.25);
assert.equal(hidden.visible, false, "visibility clip should be able to hide a part");
const shown = engine.evaluateTimeline({ enabled: true, loop: false, duration: 1, clips: [{ type: "visibility", start: 0, duration: 1, visibilityAction: "show", easing: "step" }] }, 0.25);
assert.equal(shown.visible, true, "visibility clip should be able to show a part");
const toggledVisibility = { enabled: true, loop: false, duration: 3, clips: [{ type: "visibility", start: 0, duration: 3, cycleSeconds: 1, visibilityAction: "toggle", easing: "step" }] };
assert.equal(engine.evaluateTimeline(toggledVisibility, 0.25).visible, true, "toggle visibility should show during its first cycle");
assert.equal(engine.evaluateTimeline(toggledVisibility, 1.25).visible, false, "toggle visibility should switch state on the next cycle");
assert.equal(engine.evaluateTimeline(toggledVisibility, 2.25).visible, true, "toggle visibility should continue alternating by cycle");

const fourStep = engine.evaluateTimeline({ enabled: true, loop: false, duration: 4, clips: [{ type: "fourStep", start: 0, duration: 4, cycleSeconds: 4, amount: 8, secondaryAmount: 4, axis: "x", secondaryAxis: "z", easing: "linear" }] }, 1);
assert.ok(Math.abs(fourStep.translation[0] - 8) < 1e-9, "four-step clip should reach the first path corner");
assert.ok(Math.abs(fourStep.translation[2]) < 1e-9, "four-step clip should preserve the secondary axis at the first corner");

const loopAcrossPath = engine.evaluateTimeline({ enabled: true, loop: false, duration: 2, clips: [{ type: "loop", start: 0, duration: 2, cycleSeconds: 2, amount: 8, axis: "z", easing: "linear" }] }, 1.5);
assert.equal(loopAcrossPath.translation[2], 2, "loop-across-path should advance along the selected axis");

const bob = engine.evaluateTimeline({ enabled: true, loop: false, duration: 2, clips: [{ type: "bob", start: 0, duration: 2, cycleSeconds: 2, amount: 4, easing: "linear" }] }, 0.5);
assert.ok(Math.abs(bob.translation[1] - 2) < 1e-9, "bob should move vertically through its cycle");

const wait = engine.evaluateTimeline({ enabled: true, loop: false, duration: 2, clips: [{ type: "wait", start: 0, duration: 2, easing: "linear", holdEnd: true }] }, 1);
assert.deepEqual(Array.from(wait.translation), [0, 0, 0], "wait should not translate the part");
assert.deepEqual(Array.from(wait.rotation), [0, 0, 0], "wait should not rotate the part");
assert.deepEqual(Array.from(wait.scale), [1, 1, 1], "wait should not scale the part");
assert.equal(wait.opacity, 1, "wait should not alter opacity");
assert.equal(wait.visible, null, "wait should not alter visibility");

for (const token of [
  "toggle-animation-timeline",
  "animation-timeline-workspace",
  "timeline-target-picker",
  "timeline-type-palette",
  "timeline-ruler-tracks",
  "timeline-playhead",
  "timeline-play",
  "timeline-pause",
  "timeline-scroll-viewport",
  "timeline-clip-editor",
  "data-timeline-clip-field=\"start\"",
  "data-timeline-clip-field=\"duration\"",
  "data-timeline-clip-field=\"cycleSeconds\"",
  "data-timeline-clip-field=\"pauseAtPositive\"",
  "data-timeline-clip-field=\"pauseAtNegative\"",
  "data-timeline-clip-field=\"cyclePause\"",
  "data-timeline-clip-field=\"easing\"",
  "timeline-axis-label",
  "data-timeline-clip-field=\"axis\"",
  "data-timeline-clip-field=\"amount\"",
  "timeline-flip-rotation",
  "timeline-rotation-direction",
  "data-timeline-clip-field=\"visibilityAction\"",
  "data-timeline-clip-field=\"splitColumnsMin\"",
  "data-timeline-clip-field=\"splitColumnsMax\"",
  "data-timeline-clip-field=\"splitRows\"",
  "data-timeline-clip-field=\"splitLayers\"",
  "data-timeline-clip-field=\"splitSeed\"",
  "data-timeline-clip-field=\"splitRotation\"",
  "data-timeline-clip-field=\"step4Pause\"",
]) {
  assert.ok(machineHtml.includes(token), `Machine Designer should include timeline UI token: ${token}`);
}

assert.ok(designerSource.includes("animationTimeline"), "Designer should normalize and save component timelines");
assert.ok(designerSource.includes("evaluateTimelineOnSharedClock"), "Designer preview should evaluate every part from the shared machine clock");
assert.ok(designerSource.includes("animationTimelineSettings"), "Designer should persist machine-wide loop and speed settings");
assert.ok(designerSource.includes("version: 17"), "Designer library payload should advance to version 17");
assert.ok(plantSource.includes("applyDesignTimelineAnimation"), "Plant Layout should render Designer timeline clips");
assert.ok(plantSource.includes("evaluateDesignTimeline"), "Plant Layout should evaluate saved Designer timelines from the shared machine clock");
assert.ok(designerSource.includes("rectangularSplitRenderComponents"), "Designer preview should render rectangular split fragments");
assert.ok(plantSource.includes("rectangularSplitDesignComponents"), "Plant Layout should render rectangular split fragments");
assert.ok(designerSource.includes("timelineOpacity") && plantSource.includes("timelineOpacity"), "Both render paths should preserve zero-opacity fade values");
assert.ok(designerSource.includes("rotateAnimatedComponentAroundPoint"), "Designer preview should rotate parts around custom timeline pivot points");
assert.ok(designerSource.includes('document.getElementById("timeline-flip-rotation")') && designerSource.includes("clip.amount = -currentAngle"), "Rotate clips should expose a button that flips the existing signed angle");
assert.ok(plantSource.includes("rotationOperations") && plantSource.includes("worldPivotOffset"), "Plant Layout should apply pivot-aware rotation operations");
assert.ok(!machineHtml.includes('data-timeline-for="loop spin'), "Rotate clips should no longer expose continuous-spin cycle controls");

console.log("Animation timeline validation passed.");
