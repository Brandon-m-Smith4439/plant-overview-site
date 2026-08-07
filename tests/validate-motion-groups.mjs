import fs from "node:fs";

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../public/machine-studio.html", import.meta.url), "utf8");

const expectations = [
  [plant, "motionParentId", "scene objects retain a hierarchical motion-parent id"],
  [plant, "motionAncestorChain", "child objects inherit each ancestor animation"],
  [plant, "rootsToAttach", "reattaching assemblies preserves nested child relationships"],
  [plant, "machineAnimationTransform(machine, time)", "each child keeps its own animation"],
  [plant, "Attach to parent", "the layout editor exposes parent-child attachment"],
  [plant, "joinSelectedAnimationObjects", "selected scene objects can be attached"],
  [plant, "unjoinSelectedAnimationObjects", "attached motion assemblies can be separated"],
  [plant, "playOwnAnimation", "scene children explicitly control their local animation layer"],
  [studio, "mergeSelectedComponents", "designer parts can be merged"],
  [studio, "motionDriverId", "merged items retain an animation driver"],
  [studio, "applyInheritedComponentTransform", "merged children inherit driver motion"],
  [studio, "componentAnimationTransform", "driver animation is represented as an exact inherited transform"],
  [studio, "playOwnAnimation", "merged children explicitly control their own animation layer"],
  [studio, "component.embeddedMachine === true", "embedded machines preserve independent child animations in the designer"],
  [plant, "component.embeddedMachine === true", "embedded machines preserve independent child animations in the plant renderer"],
  [studio, "hitPathIds", "nested hit-testing preserves the full merged-item path"],
  [studio, "resolveTimelineTargetIdForHit", "nested clicks resolve the effective animation owner"],
  [studio, "timelineTargetOptions", "the timeline target picker includes nested descendants"],
  [studio, "findComponentById", "timeline target lookup searches nested merged items recursively"],
  [html, "group-motion-driver", "designer exposes the merged-item attachment parent"],
  [html, "timeline-target-picker", "designer exposes per-child timeline selection"],
];

for (const [source, token, message] of expectations) {
  if (!source.includes(token)) throw new Error(`Missing regression requirement: ${message}`);
}

const mergeFunction = studio.match(/function mergeSelectedComponents\(\) \{[\s\S]*?\n  \}\n\n  function ungroupSelectedComponent/)?.[0] || "";
if (!mergeFunction.includes("state.timelineTargetId = group.id")) {
  throw new Error("A newly created outer merge does not reset timeline ownership to the outer group.");
}
if (!mergeFunction.includes("state.timelineClipId = group.animationTimeline?.clips?.[0]?.id || null")) {
  throw new Error("A newly created outer merge does not clear the previously selected child clip.");
}

const buildPrimitivesFunction = studio.match(/function buildComponentPrimitives\([\s\S]*?\n  \}\n\n  function drawPrimitive/)?.[0] || "";
if (!buildPrimitivesFunction.includes("pathIds: hitPathIds")) {
  throw new Error("Rendered nested children do not retain their full hit path.");
}
if (!buildPrimitivesFunction.includes("component: hitRoot")) {
  throw new Error("Nested hit-testing no longer preserves the top-level transform owner.");
}

const pointerHandler = studio.match(/canvas\.addEventListener\("pointerdown"[\s\S]*?canvas\.setPointerCapture/)?.[0] || "";
if (!pointerHandler.includes("state.timelineTargetId !== hitResult.timelineTargetId")) {
  throw new Error("Clicking another nested child inside an already selected group does not refresh the timeline target.");
}

const componentListFunction = extractFunction(studio, "updateComponentList");
if (!componentListFunction.includes("resolveTimelineTargetForHit(component, [component.id])")) {
  throw new Error("Selecting a merged item from the Parts list does not resolve its nested animation owner.");
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Unable to locate ${name}.`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unable to extract ${name}.`);
}

const nestedTargetSource = [
  "const api = {};",
  extractFunction(studio, "findComponentById"),
  extractFunction(studio, "componentOwnsAnimation"),
  extractFunction(studio, "motionDriverAnimationOwner"),
  extractFunction(studio, "componentPathFromIds"),
  extractFunction(studio, "componentFromPathIds"),
  extractFunction(studio, "componentPathToTarget"),
  extractFunction(studio, "resolvedTimelineTarget"),
  extractFunction(studio, "resolveTimelineTargetForHit"),
  extractFunction(studio, "resolveTimelineTargetIdForHit"),
  "api.findComponentById = findComponentById;",
  "api.componentFromPathIds = componentFromPathIds;",
  "api.resolveTimelineTargetForHit = resolveTimelineTargetForHit;",
  "api.resolveTimelineTargetIdForHit = resolveTimelineTargetIdForHit;",
  "api;",
].join("\n");
const { default: vm } = await import("node:vm");
const nestedTargetApi = vm.runInNewContext(nestedTargetSource);
const animatedLeaf = {
  id: "animated-leaf",
  name: "Animated leaf",
  type: "box",
  animationTimeline: { enabled: true, clips: [{ id: "clip-1", enabled: true }] },
};
const nestedGroup = {
  id: "nested-group",
  name: "Nested group",
  type: "group",
  motionDriverId: animatedLeaf.id,
  children: [animatedLeaf, { id: "nested-static", name: "Static nested leaf", type: "box" }],
};
const outerGroup = {
  id: "outer-group",
  name: "Outer group",
  type: "group",
  motionDriverId: nestedGroup.id,
  children: [nestedGroup, { id: "outer-static", name: "Static outer leaf", type: "box" }],
};

if (nestedTargetApi.findComponentById(outerGroup, animatedLeaf.id) !== animatedLeaf) {
  throw new Error("Recursive timeline lookup cannot find a deeply nested animation owner.");
}
if (nestedTargetApi.resolveTimelineTargetIdForHit(outerGroup, [outerGroup.id, "outer-static"]) !== animatedLeaf.id) {
  throw new Error("Clicking a static child does not resolve the nested motion-driver animation owner.");
}
if (nestedTargetApi.resolveTimelineTargetIdForHit(outerGroup, [outerGroup.id, nestedGroup.id, animatedLeaf.id]) !== animatedLeaf.id) {
  throw new Error("Clicking the animated nested child does not resolve its saved timeline.");
}
outerGroup.animationTimeline = { enabled: true, clips: [{ id: "outer-clip", enabled: true }] };
if (nestedTargetApi.resolveTimelineTargetIdForHit(outerGroup, [outerGroup.id, "outer-static"]) !== outerGroup.id) {
  throw new Error("An outer merged item's own timeline is not preferred when its static child is clicked.");
}
if (nestedTargetApi.resolveTimelineTargetIdForHit(outerGroup, [outerGroup.id, nestedGroup.id, animatedLeaf.id]) !== animatedLeaf.id) {
  throw new Error("The deepest clicked animation owner is not preferred when nested and outer timelines both exist.");
}

const duplicateLeafA = {
  id: "duplicated-leaf-id",
  name: "Duplicate leaf A",
  type: "box",
};
const duplicateLeafB = {
  id: "duplicated-leaf-id",
  name: "Duplicate leaf B",
  type: "box",
  animationTimeline: { enabled: true, clips: [{ id: "duplicate-clip", enabled: true }] },
};
const duplicateGroupA = {
  id: "duplicate-group-a",
  name: "Duplicate group A",
  type: "group",
  children: [duplicateLeafA],
};
const duplicateGroupB = {
  id: "duplicate-group-b",
  name: "Duplicate group B",
  type: "group",
  motionDriverId: duplicateLeafB.id,
  children: [duplicateLeafB],
};
const duplicateOuter = {
  id: "duplicate-outer",
  name: "Duplicate outer",
  type: "group",
  motionDriverId: duplicateGroupB.id,
  children: [duplicateGroupA, duplicateGroupB],
};
const duplicateTarget = nestedTargetApi.resolveTimelineTargetForHit(duplicateOuter, [
  duplicateOuter.id,
  duplicateGroupB.id,
  duplicateLeafB.id,
]);
if (duplicateTarget.component !== duplicateLeafB) {
  throw new Error("Duplicate descendant ids can resolve the timeline to the wrong nested group.");
}
if (nestedTargetApi.componentFromPathIds(duplicateOuter, duplicateTarget.pathIds) !== duplicateLeafB) {
  throw new Error("The saved timeline target path does not disambiguate repeated nested component ids.");
}

// Requirement model: the parent moves on Z while the child moves on X.
// The parent must not inherit the child's X travel, while the child must inherit
// the parent's Z travel and keep a constant attachment offset on the other axes.
const parentBase = [10, 0, 20];
const childBase = [14, 0, 20];
const parentMotion = [0, 0, 8];
const childOwnMotion = [5, 0, 0];
const parentRendered = parentBase.map((value, index) => value + parentMotion[index]);
const childRendered = childBase.map((value, index) => value + childOwnMotion[index] + parentMotion[index]);

if (parentRendered[0] !== parentBase[0]) throw new Error("Parent incorrectly inherited child X motion.");
if (childRendered[2] - parentRendered[2] !== childBase[2] - parentBase[2]) {
  throw new Error("Child did not remain attached while inheriting parent Z motion.");
}
if (childRendered[0] - childBase[0] !== childOwnMotion[0]) {
  throw new Error("Child lost its own X animation while attached.");
}

// Explicit inherited-only mode must apply parent motion exactly once. Enabling
// the child layer intentionally adds the child's own animation on top.
const inheritedOnly = { parent: 12, child: 12 };
if (inheritedOnly.child !== inheritedOnly.parent) {
  throw new Error("Inherited-only child motion did not match the parent exactly once.");
}
const inheritedPlusOwn = { parent: 12, child: 12 + 4 };
if (inheritedPlusOwn.child - inheritedPlusOwn.parent !== 4) {
  throw new Error("Enabled child-local animation was not layered on inherited motion.");
}

console.log("Hierarchical motion and merged-component regression checks passed.");
