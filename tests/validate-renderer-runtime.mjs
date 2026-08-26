import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/depth-scene-renderer.js", import.meta.url), "utf8");
const calls = { uploads: [], draws: 0, clears: 0 };
let glError = 0;
const gl = {
  VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
  ARRAY_BUFFER: 5, DYNAMIC_DRAW: 6, FLOAT: 7, TRIANGLES: 8, LINES: 9,
  COLOR_BUFFER_BIT: 16, DEPTH_BUFFER_BIT: 32, DEPTH_TEST: 10, LEQUAL: 11,
  CULL_FACE: 12, BLEND: 13, SRC_ALPHA: 14, ONE_MINUS_SRC_ALPHA: 15,
  createShader: () => ({}), shaderSource() {}, compileShader() {},
  getShaderParameter: () => true, getShaderInfoLog: () => "", deleteShader() {},
  createProgram: () => ({}), attachShader() {}, linkProgram() {},
  getProgramParameter: () => true, getProgramInfoLog: () => "", deleteProgram() {},
  getAttribLocation: (_, name) => name === "a_position" ? 0 : 1,
  createBuffer: () => ({}), bindBuffer() {}, bufferData() {},
  bufferSubData: (_, __, values) => calls.uploads.push(values.length),
  enableVertexAttribArray() {}, vertexAttribPointer() {},
  drawArrays: () => { calls.draws += 1; }, viewport() {}, clearColor() {},
  clearDepth() {}, clear: () => { calls.clears += 1; }, useProgram() {},
  enable() {}, disable() {}, depthFunc() {}, depthMask() {}, blendFunc() {}, lineWidth() {},
  isContextLost: () => false, getError: () => glError, NO_ERROR: 0,
};
const canvas = {
  width: 1,
  height: 1,
  hidden: false,
  addEventListener: () => {},
  getContext: (kind) => kind === "webgl2" ? gl : null,
};
const context = { window: {}, console };
vm.runInNewContext(source, context);
const renderer = context.window.createDepthSceneRenderer(canvas);
assert.equal(renderer.available, true, "WebGL renderer did not initialize in the smoke harness.");

const project = (x, y, z) => [x * 20 + 100, 100 - y * 20, z + x * .1];
for (let frame = 0; frame < 2; frame += 1) {
  renderer.beginFrame(800, 500, project);
  renderer.addPolygon([[0,0,0],[4,0,0],[4,3,1],[0,3,1]], "#68777a", 1, "#20302d", 1);
  renderer.addPolygon([[1,1,2],[3,1,2],[2,4,3]], "rgba(120,180,190,.6)", .6, null, 0, { transparent: true });
  renderer.addLine([0,0,0],[4,4,4],"#ffffff",2,1);
  assert.doesNotThrow(() => renderer.render(), `Renderer threw during frame ${frame + 1}.`);
}

glError = 1282;
renderer.beginFrame(800, 500, project);
renderer.addPolygon([[0,0,0],[4,0,0],[4,3,1],[0,3,1]], "#68777a", 1);
assert.doesNotThrow(() => renderer.render(), "Renderer must contain a graphics-driver error.");
assert.equal(renderer.available, false, "A WebGL startup error must switch the viewport to the compatible renderer.");
assert.equal(canvas.hidden, true, "A failed WebGL canvas must not cover the compatible viewport.");

assert.ok(calls.clears >= 3, "Renderer did not clear the frame buffer.");
assert.ok(calls.draws >= 3, "Renderer did not submit visible geometry.");
assert.ok(calls.uploads.every((length) => Number.isInteger(length) && length > 0), "Renderer submitted an invalid typed-array view.");
console.log("WebGL renderer initialization and repeated-frame smoke test passed.");
