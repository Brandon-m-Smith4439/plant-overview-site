import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceSource = fs.readFileSync(path.join(root, "public/animation-timeline-workspace.js"), "utf8");
const designerSource = fs.readFileSync(path.join(root, "public/machine-design-studio.js"), "utf8");
const html = fs.readFileSync(path.join(root, "public/machine-studio.html"), "utf8");
const tsx = fs.readFileSync(path.join(root, "app/machine-studio/page.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");

const context = { window: {}, Math, Number, String };
vm.createContext(context);
vm.runInContext(workspaceSource, context, { filename: "animation-timeline-workspace.js" });
const workspace = context.window.AnimationTimelineWorkspace;
assert.ok(workspace, "timeline workspace helper should attach to window");

assert.equal(workspace.snap(1.024, 0.05), 1, "timeline values should snap to the selected step");
assert.equal(workspace.snap(1.026, 0.05), 1.05, "timeline values should round to the nearest selected step");

const clips = [
  { id: "first", name: "First", start: 0, duration: 2 },
  { id: "second", name: "Second", start: 4, duration: 2 },
];
workspace.moveClip(clips, "second", 2.06, { step: 0.05, neighborTolerance: 0.1 });
assert.equal(clips[1].start, 2, "dragging a clip near another clip should snap it directly after that clip");
workspace.moveClip(clips, "first", 1.96, { step: 0.05, neighborTolerance: 0.1 });
assert.ok(Math.abs(clips[0].start - 1.95) < 1e-9, "clip movement should use exact snapped times");

const resize = [{ id: "clip", start: 2, duration: 3 }];
workspace.resizeClip(resize, "clip", "end", 6.02, { step: 0.05 });
assert.equal(resize[0].duration, 4, "dragging the right edge should extend clip duration");
workspace.resizeClip(resize, "clip", "start", 1.03, { step: 0.05 });
assert.equal(resize[0].start, 1.05, "dragging the left edge should update clip start");
assert.equal(resize[0].duration, 4.95, "dragging the left edge should preserve the original end time");

const ordered = workspace.sortClips([
  { id: "late", start: 5, duration: 1 },
  { id: "early", start: 1, duration: 1 },
  { id: "middle", start: 3, duration: 1 },
]);
assert.deepEqual(Array.from(ordered, (clip) => clip.id), ["early", "middle", "late"], "timeline rows should follow chronological order");
assert.equal(workspace.timeFromClientX(150, { left: 100, width: 200 }, 8), 2, "drop position should map to the correct timeline time");
assert.equal(workspace.contentDuration([{ start: 8, duration: 4 }]), 30, "timeline content should keep a 30-second minimum workspace");
assert.equal(workspace.displayDuration([{ start: 31, duration: 6 }]), 40, "timeline display should grow in five-second increments beyond 30 seconds");
assert.equal(workspace.timelinePixelWidth(30), 1320, "the 30-second timeline should use a precise pixels-per-second scale");
assert.equal(workspace.secondsFromPixelDelta(44), 1, "dragging 44 pixels should change timing by one second");
assert.equal(workspace.nextClipStart([{ start: 0, duration: 3 }, { start: 5, duration: 2 }]), 7, "clicked presets should append after the latest clip end");
const lanes = workspace.layoutClipsIntoLanes([
  { id: "a", start: 0, duration: 3 },
  { id: "b", start: 3, duration: 2 },
  { id: "overlap", start: 1, duration: 1 },
]);
assert.deepEqual(Array.from(lanes[0], (clip) => clip.id), ["a", "b"], "non-overlapping clips should read left to right on one lane");
assert.deepEqual(Array.from(lanes[1], (clip) => clip.id), ["overlap"], "overlapping clips should move to a separate lane");
const isolatedResize = [
  { id: "selected", start: 1, duration: 2 },
  { id: "untouched", start: 5, duration: 3 },
];
workspace.resizeClip(isolatedResize, "selected", "end", 4, { step: 0.05 });
assert.deepEqual(isolatedResize[1], { id: "untouched", start: 5, duration: 3 }, "resizing one clip must not change a neighboring clip");
const rippleResize = [
  { id: "selected", start: 1, duration: 2 },
  { id: "overlapping", start: 2, duration: 2 },
  { id: "downstream", start: 3, duration: 1 },
  { id: "later", start: 7, duration: 2 },
];
const rippleBaseline = rippleResize.map((clip) => ({ ...clip }));
const rippleResult = workspace.rippleResizeClipEnd(rippleResize, "selected", 5, {
  step: 0.05,
  baseline: rippleBaseline,
});
assert.equal(rippleResize[0].duration, 4, "ripple resizing should extend the selected clip");
assert.equal(rippleResize[1].start, 2, "clips that already overlap the selected clip should stay in place");
assert.equal(rippleResize[2].start, 5, "clips beginning at the original end should be pushed right");
assert.equal(rippleResize[3].start, 9, "all later clips should move by the same extension distance");
assert.deepEqual(Array.from(rippleResult.shiftedIds), ["downstream", "later"], "ripple resizing should report every shifted clip");
workspace.rippleResizeClipEnd(rippleResize, "selected", 2.5, {
  step: 0.05,
  baseline: rippleBaseline,
});
assert.equal(rippleResize[2].start, 3, "moving the cursor back left should restore downstream clips instead of accumulating offsets");
const deletion = [
  { id: "before", start: 0, duration: 2 },
  { id: "selected", start: 2, duration: 2 },
  { id: "after", start: 4, duration: 2 },
];
const deletionResult = workspace.removeClip(deletion, "selected");
assert.equal(deletionResult.removed.id, "selected", "timeline delete should remove the requested clip");
assert.deepEqual(Array.from(deletion, (clip) => clip.id), ["before", "after"], "timeline delete should keep neighboring clips");
assert.equal(workspace.removeClip(deletion, "missing"), null, "timeline delete should safely ignore a missing id");

for (const markup of [html, tsx]) {
  for (const token of [
    "toggle-animation-timeline",
    "animation-timeline-workspace",
    "timeline-type-palette",
    "timeline-target-picker",
    "timeline-ruler-tracks",
    "timeline-playhead",
    "timeline-play",
    "timeline-pause",
    "timeline-scroll-viewport",
    "timeline-snap-step",
    "timeline-clip-editor",
    "open-animation-timeline-panel",
  ]) {
    assert.ok(markup.includes(token), `docked timeline markup should include ${token}`);
  }
}

for (const token of [
  "data-animation-type",
  "dragstart",
  "data-timeline-resize",
  "timelineWorkspaceEngine.moveClip",
  "timelineWorkspaceEngine.resizeClip",
  "timelineWorkspaceEngine.rippleResizeClipEnd",
  "focusTimelineClip",
  "setTimelineOpen",
]) {
  assert.ok(designerSource.includes(token), `Designer timeline integration should include ${token}`);
}

for (const token of [
  ".animation-timeline-workspace",
  ".timeline-type-buttons",
  ".timeline-track-lane",
  ".timeline-scroll-viewport",
  ".timeline-track-body",
  ".timeline-resize-handle",
  ".design-viewport-panel.timeline-open",
]) {
  assert.ok(css.includes(token), `timeline workspace styling should include ${token}`);
}

console.log("Docked animation timeline workspace validation passed.");
