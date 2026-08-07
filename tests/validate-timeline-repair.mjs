import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const timelineSource = fs.readFileSync(path.join(root, "public/animation-timeline.js"), "utf8");
const workspaceSource = fs.readFileSync(path.join(root, "public/animation-timeline-workspace.js"), "utf8");
const designerSource = fs.readFileSync(path.join(root, "public/machine-design-studio.js"), "utf8");
const html = fs.readFileSync(path.join(root, "public/machine-studio.html"), "utf8");
const tsx = fs.readFileSync(path.join(root, "app/machine-studio/page.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");

const context = { window: {}, console, Date, Math, Number, String };
vm.createContext(context);
vm.runInContext(timelineSource, context, { filename: "animation-timeline.js" });
vm.runInContext(workspaceSource, context, { filename: "animation-timeline-workspace.js" });

const timeline = context.window.MachineAnimationTimeline;
const workspace = context.window.AnimationTimelineWorkspace;
assert.ok(timeline && workspace, "timeline modules should load");

const repaired = timeline.normalizeTimeline({
  enabled: true,
  loop: true,
  playbackRate: 1,
  duration: 886370,
  clips: [],
});
assert.equal(repaired.duration, 0, "legacy runaway span metadata should be removed during normalization");
assert.equal(timeline.timelineDuration(repaired), 30, "a repaired empty timeline should return to the 30-second workspace");
assert.equal(
  timeline.timelineDuration({ duration: 886370, clips: [{ start: 28, duration: 5 }] }),
  35,
  "saved span metadata should not override the final clip endpoint",
);

const clips = [
  { id: "first", name: "First", start: 0, duration: 3 },
  { id: "selected", name: "Selected", start: 3, duration: 4 },
  { id: "last", name: "Last", start: 7, duration: 2 },
];
const removed = workspace.removeClip(clips, "selected");
assert.equal(removed?.removed?.id, "selected", "removeClip should report the selected clip");
assert.deepEqual(Array.from(clips, (clip) => clip.id), ["first", "last"], "removeClip should mutate the live timeline array only once");
assert.equal(removed?.nextClipId, "last", "delete should select the clip occupying the removed clip's chronological position");
assert.equal(workspace.removeClip(clips, "missing"), null, "a missing clip id should not remove the final array entry");
assert.deepEqual(Array.from(clips, (clip) => clip.id), ["first", "last"], "missing-clip deletion should leave the timeline unchanged");

for (const markup of [html, tsx]) {
  const workspaceStart = markup.indexOf("animation-timeline-workspace");
  const inspectorStart = markup.indexOf("part-animation-panel");
  const palette = markup.indexOf('id="timeline-type-palette"');
  assert.ok(workspaceStart >= 0 && inspectorStart > workspaceStart, "right inspector should follow the bottom timeline workspace");
  assert.ok(palette > inspectorStart, "animation selection should live in the right Animation inspector");
  assert.ok(markup.includes("timeline-inspector-library"), "right inspector should include the animation library card");
  assert.ok(markup.includes("readonly") || markup.includes("readOnly"), "timeline span should be read-only and automatic");
}

for (const token of [
  "function deleteSelectedTimelineClip()",
  "timelineWorkspaceEngine.removeClip",
  "if (!component.animationTimeline || !Array.isArray(component.animationTimeline.clips))",
  "state.timelineOpen && state.partTab === \"animation\"",
]) {
  assert.ok(designerSource.includes(token), `Designer should include repaired timeline behavior: ${token}`);
}

for (const token of [
  "--animation-timeline-height",
  ".timeline-inspector-library",
  ".timeline-inspector-type-buttons",
  "grid-template-columns: minmax(0, 1fr)",
  "min-height: 220px",
]) {
  assert.ok(css.includes(token), `timeline layout should include ${token}`);
}

console.log("Timeline repair and enlarged-workspace validation passed.");
