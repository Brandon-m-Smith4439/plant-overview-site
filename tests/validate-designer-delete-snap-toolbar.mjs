import assert from "node:assert/strict";
import fs from "node:fs";

const script = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../app/machine-studio/page.tsx", import.meta.url), "utf8");
const preview = fs.readFileSync(new URL("../public/machine-studio.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

for (const markup of [page, preview]) {
  const deleteIndex = markup.indexOf('id="delete-design"');
  const secondaryActionsIndex = markup.indexOf("More design actions");
  assert.ok(deleteIndex >= 0, "The Designer needs a whole-machine delete button.");
  assert.ok(deleteIndex < secondaryActionsIndex, "Whole-machine deletion must remain visible outside secondary actions.");
  assert.equal((markup.match(/id="delete-design"/g) || []).length, 1, "The machine delete action must have one unambiguous control.");
  for (const actionClass of ["library-action-new", "library-action-copy", "library-action-delete"]) {
    assert.ok(markup.includes(actionClass), `Machine actions are missing the ${actionClass} treatment.`);
  }
  for (const group of ["viewport-camera-group", "viewport-axes-group", "viewport-motion-group", "viewport-snap-group"]) {
    assert.ok(markup.includes(group), `Viewport controls are missing the ${group} group.`);
  }
  assert.ok(markup.includes('id="snap-step-summary"'), "The selected snap units must be explained next to the control.");
  for (const step of ["0.01", "0.025", "0.05", "0.075", "0.1"]) {
    assert.ok(markup.includes(`<option value="${step}"`), `The Designer snap control is missing ${step}.`);
  }
}

assert.match(script, /deletedDesignIds\.add\(id\)/, "Deleted presets must use a persistent tombstone so they do not reappear after reload.");
assert.match(script, /deleteButton\.textContent = "Delete machine"/, "Every machine log entry must expose the same delete action.");
assert.match(script, /degrees = snapRotationDegrees\(degrees\)/, "Rotation must use the selected snap step.");
assert.match(script, /factor = snapScaleFactor\(factor\)/, "Scaling must use the selected snap step.");
assert.ok(!script.includes("Math.round(degrees / 5) * 5"), "Rotation must not retain a hard-coded 5-degree snap.");
assert.ok(!script.includes("Math.round(factor / 0.05) * 0.05"), "Scaling must not retain a hard-coded 5-percent snap.");
assert.match(script, /snapToSelectedStep\(value \* 100\) \/ 100/, "Scale snapping must interpret the selection as percentage points.");
assert.match(script, /updateSnapStepControls\(\)/, "Snap state must update its units and numeric input steps.");
assert.match(script, /snapStep: 0\.1/, "The Designer default snap step must be 0.1.");

assert.ok(css.includes(".design-library-primary-actions"), "Visible machine actions need dedicated layout styling.");
assert.ok(css.includes(".library-action-new"), "New machine needs a primary visual treatment.");
assert.ok(css.includes(".library-action-copy"), "Save a copy needs a reusable-action visual treatment.");
assert.ok(css.includes(".library-action-delete"), "Delete machine needs a destructive visual treatment.");
assert.ok(css.includes(".viewport-control-group"), "Viewport control groups need consistent panel styling.");
assert.ok(css.includes(".snap-step-summary"), "The snap unit summary needs legible styling.");
assert.match(css, /\.studio-topbar \{ min-height: 58px;/, "The Designer header must preserve more vertical viewport space.");
assert.match(css, /\.viewport-control-group \{[\s\S]*?flex-direction: row;[\s\S]*?min-height: 38px;/, "Viewport controls must use the compact horizontal treatment.");
assert.match(script, /performanceGroup\.className = "viewport-control-group viewport-performance-group"/, "The injected Performance button must join the grouped command bar.");

console.log("Designer machine deletion, unified snapping, and grouped toolbar checks passed.");
