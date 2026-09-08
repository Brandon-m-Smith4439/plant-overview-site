import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const controllerSource = fs.readFileSync(new URL("../public/first-person-controller.js", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const preview = fs.readFileSync(new URL("../public/preview.html", import.meta.url), "utf8");

assert.ok(controllerSource.includes("createPlantFirstPersonController"), "Dedicated first-person controller is missing.");
assert.ok(controllerSource.includes("requestPointerLock"), "First-person mode needs pointer-lock mouse look.");
assert.ok(controllerSource.includes('keys.has("KeyW")'), "Continuous WASD movement is missing.");
assert.ok(controllerSource.includes("verticalVelocity"), "Jump and gravity handling are missing.");
assert.ok(controllerSource.includes("Sliding collision"), "Collision sliding is missing.");
assert.ok(controllerSource.includes("onExitRequest"), "First-person Escape exit callback is missing.");
assert.ok(controllerSource.includes("stale focus block WASD"), "Focused-button WASD protection is missing.");
assert.ok(plant.includes("WALK_NEAR_CLIP"), "Perspective near-plane clipping is missing.");
assert.ok(plant.includes("walkFov"), "First-person field-of-view control is missing.");
assert.ok(plant.includes("clipPolygonToWalkNearPlane"), "Geometry behind the first-person camera must be clipped.");
assert.ok(plant.includes("walkCanOccupy"), "Plant collision checking is missing.");
assert.ok(plant.includes("findWalkSpawn"), "Safe first-person spawn search is missing.");
assert.ok(plant.includes("first-person-hud"), "First-person HUD markup is missing.");
assert.ok(css.includes(".first-person-hud"), "First-person HUD styling is missing.");
assert.ok(css.includes(".site-shell.first-person-site"), "Full-window first-person layout styling is missing.");
assert.ok(page.includes('/first-person-controller.js'), "Next page does not load the first-person controller.");
assert.ok(preview.includes('first-person-controller.js'), "Standalone preview does not load the first-person controller.");

const listeners = new Map();
const documentMock = {
  pointerLockElement: null,
  addEventListener(type, callback) { listeners.set(`document:${type}`, callback); },
  removeEventListener() {},
  exitPointerLock() { this.pointerLockElement = null; listeners.get("document:pointerlockchange")?.(); },
};
const windowMock = {
  addEventListener(type, callback) { listeners.set(`window:${type}`, callback); },
  removeEventListener() {},
};
const canvasMock = {
  addEventListener(type, callback) { listeners.set(`canvas:${type}`, callback); },
  removeEventListener() {},
  requestPointerLock() { documentMock.pointerLockElement = canvasMock; listeners.get("document:pointerlockchange")?.(); },
};
const context = { window: windowMock, document: documentMock, requestAnimationFrame(callback) { callback(); }, Math, Number, Set, console };
vm.runInNewContext(controllerSource, context, { filename: "first-person-controller.js" });
let camera = {
  x: 0, z: 0, yaw: 0, pitch: 0,
  walkSpeed: 10, walkSensitivity: 0.002,
  walkRadius: 1, walkCollision: true, walkHeadBob: false,
  walkVerticalOffset: 0, walkBobOffset: 0,
};
let exitRequests = 0;
const controller = windowMock.createPlantFirstPersonController({
  canvas: canvasMock,
  getCamera: () => camera,
  setCamera: (next) => { camera = { ...camera, ...next }; },
  canOccupy: () => true,
  onExitRequest: () => { exitRequests += 1; },
});
controller.start({ capture: false });
// Clicking the First person button leaves a button focused in normal browsers.
// Movement must still work even when keyboard events target that button.
listeners.get("document:keydown")?.({
  key: "w",
  code: "KeyW",
  target: { matches: (selector) => selector.includes("button") },
  preventDefault() {},
  repeat: false,
});
controller.update(1000);
controller.update(1100);
assert.ok(camera.z > 0, "Holding W must move continuously along the camera forward direction.");
listeners.get("document:keyup")?.({ code: "KeyW" });
controller.update(1200);
controller.update(1300);
camera = { ...camera, yaw: Math.PI };
const beforeStrafe = camera.x;
listeners.get("document:keydown")?.({
  key: "d",
  code: "KeyD",
  target: { matches: () => false },
  preventDefault() {},
  repeat: false,
});
controller.update(1400);
controller.update(1500);
assert.ok(camera.x > beforeStrafe, "D must move toward the same screen-right side shown in the Overview.");
listeners.get("document:keyup")?.({ code: "KeyD" });
const beforeLook = camera.yaw;
documentMock.pointerLockElement = canvasMock;
listeners.get("document:pointerlockchange")?.();
listeners.get("document:mousemove")?.({ movementX: 20, movementY: 0 });
assert.ok(camera.yaw < beforeLook, "Moving the mouse right must rotate the corrected first-person camera right.");
documentMock.pointerLockElement = null;
listeners.get("document:pointerlockchange")?.();
assert.equal(exitRequests, 1, "Releasing pointer lock with Escape must request a one-step first-person exit.");
listeners.get("document:keydown")?.({ key: "Escape", code: "Escape", target: { matches: () => false }, preventDefault() {}, repeat: false });
assert.equal(exitRequests, 2, "Escape keydown must also request a first-person exit when the browser delivers it.");
controller.stop();
assert.ok(plant.includes('event.key === "Escape"'), "Plant integration must exit first person on Escape.");
assert.ok(plant.includes("press Esc to exit"), "First-person instructions must describe one-step Escape exit.");
console.log("Full first-person navigation checks passed.");
