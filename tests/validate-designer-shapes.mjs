import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [studio, plant, html, css] = await Promise.all([
  readFile(path.join(root, "public", "machine-design-studio.js"), "utf8"),
  readFile(path.join(root, "public", "plant-app.js"), "utf8"),
  readFile(path.join(root, "public", "machine-studio.html"), "utf8"),
  readFile(path.join(root, "app", "globals.css"), "utf8"),
]);


const tsx = await readFile(path.join(root, "app", "machine-studio", "page.tsx"), "utf8");
assert.ok(tsx.includes("function StudioIcon") && tsx.includes("studio-vector-icon"), "The live Machine Design Studio must use self-contained SVG icons.");
assert.ok(studio.includes("timeline-vector-icon") && studio.includes("function animationTypeIcon"), "Timeline animation controls must use SVG icons.");
assert.ok(studio.includes("component-visibility-dot"), "Component visibility controls must not depend on font glyphs.");
assert.ok(html.includes("studio-vector-icon"), "The standalone Machine Studio must mirror the SVG icon controls.");

for (const shape of ["cylinder", "sphere", "cone", "wedge"]) {
  assert.ok(studio.includes(`\"${shape}\"`), `${shape} must be normalized by the designer.`);
  assert.ok(html.includes(`value=\"${shape}\"`), `${shape} must be available in the shape picker.`);
}

assert.ok(studio.includes("buildVerticalCylinderPrimitives"), "Cylinder geometry must render as closed 3D geometry.");
assert.ok(studio.includes("buildSpherePrimitives"), "Sphere geometry must render as an ellipsoid mesh.");
assert.ok(studio.includes("buildConePrimitives"), "Cone geometry must render as closed 3D geometry.");
assert.ok(studio.includes("buildWedgePrimitives"), "Wedge geometry must render as a closed prism.");
assert.ok(plant.includes("drawDesignCylinder") && plant.includes("drawDesignSphere") && plant.includes("drawDesignWedge"), "New shapes must render after assignment to the plant model.");

assert.ok(studio.includes('transformSpace: "local"'), "Local transforms must be the default.");
assert.ok(studio.includes("componentLocalAxes"), "Transform handles must follow part-relative axes.");
assert.ok(html.includes('data-transform-space="local"') && html.includes('data-transform-space="world"'), "The designer must expose Local and World transform modes.");

assert.ok(studio.includes("thicknessY") && studio.includes("thicknessZ"), "Beams must have independent cross-section dimensions.");
assert.match(studio, /component\.type === "beam"[\s\S]*?halfLength[\s\S]*?thicknessY[\s\S]*?thicknessZ/, "Beam scaling must independently change length, height, and width.");
assert.ok(plant.includes("drawDesignBeam") && plant.includes("drawClosedPrism"), "Plant-view beams must render as depth-tested closed prisms.");

assert.ok(css.includes("shape-quick-grid") && css.includes("studio-collapsible") && css.includes("transform-space-toggle"), "The condensed polished designer controls must be styled.");

console.log("Designer shape, local-transform, and beam-scaling regression checks passed.");
