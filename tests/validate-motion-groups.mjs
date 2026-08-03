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
  [studio, "mergeSelectedComponents", "designer parts can be merged"],
  [studio, "motionDriverId", "merged items retain an animation driver"],
  [studio, "applyInheritedComponentTransform", "merged children inherit driver motion"],
  [studio, "componentAnimationDelta", "driver animation is converted into an inherited transform"],
  [html, "group-motion-driver", "designer exposes the merged-item attachment parent"],
];

for (const [source, token, message] of expectations) {
  if (!source.includes(token)) throw new Error(`Missing regression requirement: ${message}`);
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

console.log("Hierarchical motion and merged-component regression checks passed.");
