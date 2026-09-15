import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import * as THREE from "three";

const rendererSource = fs.readFileSync("public/three-depth-scene-renderer.js", "utf8");
const plantSource = fs.readFileSync("public/plant-app.js", "utf8");

// Real Three geometry, matrices and disposal events; only the GPU driver is
// replaced. These checks measure resource churn, not browser FPS or GPU speed.
let driver;
class TestDriver {
  constructor() {
    TestDriver.active = this;
    this.info = { render: { calls:0,triangles:0,lines:0 }, memory:{geometries:0,textures:0}, programs:[] };
  }
  setPixelRatio() {}
  setClearColor() {}
  setSize() { this.resizes = (this.resizes || 0) + 1; }
  render(scene) {
    this.scene = scene;
    this.visible = [];
    scene.traverseVisible((object) => { if (object.geometry) this.visible.push(object); });
    this.info.render.calls = this.visible.length;
  }
  dispose() { this.disposed = true; }
}
const listeners = new Map();
const canvas = {
  hidden:false,
  addEventListener(name, callback) { listeners.set(name, callback); },
  removeEventListener(name) { listeners.delete(name); },
};
const context = { console, window: {
  THREE:{...THREE,WebGLRenderer:TestDriver}, createDepthSceneRenderer() { throw Error("unexpected fallback"); },
  CustomEvent:class { constructor(type, options) { this.type=type; this.detail=options.detail; } }, dispatchEvent() {},
} };
vm.runInNewContext(rendererSource, context);
const renderer = context.window.createDepthSceneRenderer(canvas);
driver = TestDriver.active;
const triangle = [[0,0,0],[1,0,0],[0,1,0]];
const draw = () => renderer.addPolygon(triangle, "#ffffff");
function frame() { renderer.beginFrame(1000,700,()=>{}, {mode:"walk",yaw:.2,pitch:.1}); }
function template(key, revision="v1") {
  if (renderer.beginTemplate(key, revision)) { draw(); renderer.endTemplate(); }
}
frame();
renderer.beginObject("body", "static"); draw(); renderer.endObject();
renderer.render();
const originalBody = driver.visible[0];
for (let i=0; i<600; i++) {
  frame();
  assert.equal(renderer.beginObject("body", "static"), false);
  template("part");
  renderer.addGeometryInstances("moving", "part", [{ x:i,y:0,z:0,scaleX:1,scaleY:1,scaleZ:1 }], i);
  renderer.render();
  assert.ok(driver.visible.includes(originalBody));
}
assert.equal(renderer.getStats().geometryBuilds, 2, "600 animation frames must retain body and template buffers");
assert.equal(driver.resizes, 1, "unchanged viewport must not resize every frame");
const buildsBefore = renderer.getStats().geometryBuilds;
for (let i=0; i<300; i++) {
  frame();
  renderer.beginObject("deforming", i); draw(); renderer.endObject(); renderer.render();
}
assert.equal(renderer.getStats().geometryBuilds - buildsBefore, 1, "same topology should update buffers in place");
assert.ok(renderer.getStats().geometryUpdates >= 299);

frame(); template("shared:template");
renderer.addGeometryInstances("different-prefix:batch", "shared:template", [{scaleX:1,scaleY:1,scaleZ:1}], "same");
renderer.render();
const oldInstance = driver.visible.find((object) => object.isInstancedMesh);
let instanceDisposed = 0;
oldInstance.addEventListener("dispose", () => instanceDisposed++);
renderer.clearRetained("shared:");
assert.equal(instanceDisposed, 1, "invalidating a template must dispose borrowers across prefixes");
frame(); template("shared:template");
renderer.addGeometryInstances("different-prefix:batch", "shared:template", [{scaleX:1,scaleY:1,scaleZ:1}], "same");
renderer.render();
assert.notEqual(driver.visible.find((object) => object.isInstancedMesh).geometry, oldInstance.geometry,
  "recreated template with same revision must not reuse disposed geometry");

const mixed = {rotationX:31,rotationY:67,rotationZ:-23,scaleX:1,scaleY:1,scaleZ:1};
frame(); template("rotation"); renderer.addGeometryInstances("rotations", "rotation", [mixed], "mixed"); renderer.render();
const matrix = new THREE.Matrix4();
driver.visible.find((object) => object.isInstancedMesh).getMatrixAt(0, matrix);
const expected = new THREE.Vector3(1,2,3)
  .applyAxisAngle(new THREE.Vector3(1,0,0),31*Math.PI/180)
  .applyAxisAngle(new THREE.Vector3(0,1,0),-67*Math.PI/180)
  .applyAxisAngle(new THREE.Vector3(0,0,1),-23*Math.PI/180);
assert.ok(expected.distanceTo(new THREE.Vector3(1,2,3).applyMatrix4(matrix)) < 1e-6);

listeners.get("webglcontextlost")({preventDefault(){}});
assert.equal(renderer.available,false);
assert.equal(renderer.beginObject("body","static"),true,"lost GPU must not suppress fallback drawing");
listeners.get("webglcontextrestored")();
assert.equal(renderer.available,true);
assert.equal(canvas.hidden,false);
frame(); assert.equal(renderer.beginObject("body","static"),true); draw(); renderer.endObject(); renderer.render();
// Exercise repeated eviction/re-entry, not just continuously visible objects.
for (let round=0; round<10; round++) {
  frame(); template("evicted"); renderer.addGeometryInstances("evicted:batch","evicted",[mixed],"same"); renderer.render();
  for (let i=0; i<182; i++) { frame(); renderer.render(); }
  assert.equal(renderer.getStats().retainedObjects,0);
}
renderer.dispose();
assert.equal(listeners.size,0);
assert.equal(driver.scene.children.length,0);
assert.equal(driver.disposed,true);

function extract(name) {
  const start=plantSource.indexOf(`function ${name}(`);
  assert.ok(start>=0, name);
  let cursor=plantSource.indexOf("(",start), parameterDepth=0;
  do {
    if (plantSource[cursor]==="(") parameterDepth++;
    if (plantSource[cursor]===")") parameterDepth--;
    cursor++;
  } while(parameterDepth>0);
  const body=plantSource.indexOf("{",cursor);
  let depth=0;
  for (let i=body;i<plantSource.length;i++) {
    if (plantSource[i]==="{") depth++;
    if (plantSource[i]==="}" && --depth===0) return plantSource.slice(start,i+1);
  }
  throw Error(name);
}
const math = vm.runInNewContext([
  "const state={}; const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));",
  "const DESIGN_SCALE_MODES=new Set(['preserve','match','stretch']); const MACHINE_SCALE_EDIT_MODES=new Set(['uniform','individual']);",
  ...["rotateVector3","objectRotation","localPoint3d","designBaseDimensions","normalizedDesignScaleMode",
    "normalizedMachineScaleEditMode","designPlacement","designComponentRotation","rotatedDesignPoint",
    "designPointToWorld","designLocalPointToWorld","affineMatrixFromPoints","designInstanceMatrix"].map(extract),
  "({designInstanceMatrix,designPointToWorld,designLocalPointToWorld})",
].join("\n"));
const design={base:{x:-10,y:3,z:9,w:20,h:10,d:30}};
const machine={x:40,y:2,z:70,w:36,h:15,d:24,rotationX:15,rotationY:65,rotationZ:-22,scaleEditMode:"individual"};
const part={x:-5,y:7,z:13,w:3,h:4,d:5,rotationX:21,rotationY:34,rotationZ:17};
const partMatrix=new THREE.Matrix4().fromArray(math.designInstanceMatrix(machine,design,part));
for (const p of [[0,0,0],[1,0,0],[0,1,0],[0,0,1],[.3,.5,.7]]) {
  const source=p.map((v,i)=>[part.x,part.y,part.z][i]+v*[part.w,part.h,part.d][i]);
  const expected=math.designPointToWorld(machine,part,design,source);
  assert.ok(new THREE.Vector3(...p).applyMatrix4(partMatrix).distanceTo(new THREE.Vector3(...expected))<1e-9,
    "unit-part instancing must match nonuniform scales, offset envelopes and compound rotations");
}
const bodyMatrix=new THREE.Matrix4().fromArray(math.designInstanceMatrix(machine,design));
const expectedBody=math.designLocalPointToWorld(machine,design,[2,6,12]);
assert.ok(new THREE.Vector3(12,3,3).applyMatrix4(bodyMatrix).distanceTo(new THREE.Vector3(...expectedBody))<1e-9);

// Reproduce the old first-person cache truncation: clipping must not run while
// recording retained geometry, but must still run in the compatible 2D path.
let clipped=0,submitted=0;
const clipContext={
  recordingReusableGeometry:false,suppressGeometryOutlines:false,
  depthRenderer:{available:true,retained:true,beginObject:()=>true,endObject(){},addPolygon(){submitted++;},addLine(){submitted++;}},
  clipPolygonToWalkNearPlane(){clipped++;return [];},clipLineToWalkNearPlane(){clipped++;return null;},
};
vm.createContext(clipContext);
vm.runInContext([extract("drawRetainedObject"),extract("polygon"),extract("line3d")].join("\n"),clipContext);
vm.runInContext("drawRetainedObject('camera-test','same',()=>{polygon([[0,0,0],[1,0,0],[0,1,0]],'#fff');line3d([0,0,0],[1,0,0],'#fff');})",clipContext);
assert.equal(clipped,0); assert.equal(submitted,2);
clipContext.depthRenderer.available=false;
vm.runInContext("drawRetainedObject('camera-test','same',()=>polygon([[0,0,0],[1,0,0],[0,1,0]],'#fff'))",clipContext);
assert.equal(clipped,1);

// Exercise the actual production partition/batch orchestration with hundreds
// of static parts, repeated machines, a moving box and a roller fallback.
const productionRenderer=context.window.createDepthSceneRenderer(canvas);
let staticDraws=0,unitDraws=0,animatedEvaluations=0,matrixBuilds=0;
let activeLod=3;
let activeProductionFrame=0;
const firstFrameDuplicateTransforms=[];
const productionDesign={
  base:{x:0,y:0,z:0,w:20,h:10,d:30},
  components:[
    ...Array.from({length:500},(_,id)=>({id:`body-${id}`,type:"box",x:id/100,y:0,z:0,w:1,h:1,d:1})),
    {id:"moving",type:"box",x:2,y:2,z:3,w:2,h:2,d:2,animationType:"oscillate",animationEnabled:true},
    {id:"rollers",type:"rollerBed",x:2,y:2,z:3,w:2,h:2,d:2,count:8,animationType:"oscillate",animationEnabled:true},
    {id:"nested-carrier",type:"group",animationType:"oscillate",animationEnabled:true,children:[
      {id:"copied-cup",type:"box",x:6,y:2,z:3,w:1,h:1,d:1},
      {id:"nested-copy",type:"group",children:[
        {id:"copied-cup",type:"box",x:12,y:2,z:3,w:1,h:1,d:1},
      ]},
    ]},
  ],
};
const savedDesign=JSON.stringify(productionDesign);
const runtime={
  console,
  state:{editing:false,selectedMachineIds:new Set(),animationsPaused:false,animationTimeOffset:0},
  window:{devicePixelRatio:1},
  renderPerformance:{pixelRatio:()=>1,cylinderSegments:()=>8},
  machineCurveSegments:()=>8,machineLodLevel:()=>activeLod,projectedPixelSpan:()=>120,
  depthRenderer:productionRenderer,designLibrary:{test:productionDesign},
  recordingReusableGeometry:false,suppressGeometryOutlines:false,
  designRenderPartitionCache:new WeakMap(),animatedVisibleDesignComponentsCache:new WeakMap(),
  objectRenderIdentity:()=>1,designBaseDimensions:()=>productionDesign.base,
  designHasAnimation:()=>true,
  designInstanceMatrix(...args) {
    matrixBuilds++;
    const [placed, , component] = args;
    if (activeProductionFrame === 0 && component?.id === "copied-cup") {
      firstFrameDuplicateTransforms.push(`${placed.instanceId}:${component.x}`);
    }
    return math.designInstanceMatrix(...args);
  },
  productionInstanceMatrixCache:new Map(),
  animateDesignComponent(component,time) { animatedEvaluations++;return {...component,x:component.x+time/1000}; },
  drawCustomDesign(machine,alpha,grow,time,lod,parts) {
    if(parts.length===500) staticDraws++;
    for(const part of parts) productionRenderer.addPolygon([[part.x,0,0],[part.x+1,0,0],[part.x,1,0]],"#ffffff");
  },
  drawDesignBox(){unitDraws++;productionRenderer.addPolygon(triangle,"#ffffff");},
};
vm.createContext(runtime);
vm.runInContext([
  "designContainsAnimation","designRenderPartition","sampledMovingComponents","rectangularSplitDesignComponents",
  "machineHasLayoutMotion","machineHasGeometryAnimation","machineAnimationSampleTime","renderedMachineRevision",
  "drawRetainedObject","recordGeometryTemplate","cachedProductionInstanceMatrix","drawProductionDesignInstances",
].map(extract).join("\n"),runtime);
const entries=[0,1].map((id)=>{
  const placed={...machine,instanceId:`copy-${id}`,designId:"test",color:"#ffffff",x:100*id};
  return {machine:placed,rendered:placed,alpha:1,grow:1};
});
for(let i=0;i<120;i++) {
  activeProductionFrame=i;
  activeLod = i % 2 ? 2 : 3;
  productionRenderer.beginFrame(1000,700,()=>{},{});
  assert.equal(runtime.drawProductionDesignInstances(entries,i*16.667).size,2);
  productionRenderer.render();
}
assert.deepEqual(
  [...new Set(firstFrameDuplicateTransforms)].sort(),
  ["copy-0:12","copy-0:6","copy-1:12","copy-1:6"],
  "repeated child IDs inside nested merged items must keep independent Plant Layout transforms",
);
assert.equal(staticDraws,1,"500 stationary parts in two animated machines should be recorded only once");
assert.equal(unitDraws,1,"repeated animated boxes must share a single unit mesh");
assert.ok(animatedEvaluations<=183,"distant copies must share 30 Hz samples and never clone the static body");
assert.ok(matrixBuilds<=365,"unchanged sampled animation frames must reuse production instance matrices");
assert.equal(JSON.stringify(productionDesign),savedDesign,"render optimization must never mutate saved designs");
assert.ok(productionRenderer.getStats().geometryBuilds<=4,"static, unit primitive and two roller fallbacks should retain their buffers");
productionRenderer.dispose();

const detailRuntime={
  state:{cameraMode:"walk",selectedMachineIds:new Set()},
  machineLodDecisionCache:new WeakMap(),walkLodHistory:new Map(),
  WALK_LOD_HYSTERESIS_RATIO:.12,detailedMachineBudgetRemaining:0,
  renderPerformance:{detailPixelThreshold:()=>22,walkDetailDistance:()=>145},
  projectedPixelSpan:(item)=>item.span,
  firstPersonDistanceToBox:(item)=>item.distance,
  isFloorFeatureType:(type)=>type==="floorDrain",
};
vm.createContext(detailRuntime);
vm.runInContext(extract("machineLodLevel"),detailRuntime);
for(const mode of ["walk","orbit"]) {
  detailRuntime.state.cameraMode=mode;
  for(const budget of [0,1,42]) for(const distance of [10,140,150,160,250,270,400]) {
    detailRuntime.detailedMachineBudgetRemaining=budget;
    detailRuntime.machineLodDecisionCache=new WeakMap();
    const level=detailRuntime.machineLodLevel({instanceId:"machine",type:"washer",distance,span:2});
    assert.ok(level >= (mode==="walk"?2:3),"distance or exhausted detail budgets must never replace visible machines with boxes");
  }
}
let drawnBoxes=0,drawnRollers=0;
const completePartsRuntime={
  console,state:{editing:false,selectedMachineIds:new Set()},
  designLibrary:{test:productionDesign},suppressGeometryOutlines:false,designSegmentCap:Infinity,
  machineCurveSegments:()=>8,designRenderPartCount:()=>productionDesign.components.length,
  visibleDesignComponents:()=>productionDesign.components,
  clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  drawDesignBox(){drawnBoxes++;},
  designRollerFrame:()=>({center:[0,0,0],rotation:[0,0,0],radius:1,halfDepth:2}),
  drawCylinder3d(){drawnRollers++;},
};
vm.createContext(completePartsRuntime);
vm.runInContext(extract("drawCustomDesign"),completePartsRuntime);
assert.equal(completePartsRuntime.drawCustomDesign({designId:"test",instanceId:"machine"},1,1,0,2),true);
assert.equal(drawnBoxes,501,"distant detail must keep every body and moving box");
assert.equal(drawnRollers,8,"distant roller beds must retain all rollers, not a slab");

console.log("Production renderer: 600 animation frames / 2 geometry builds; 300 deformation frames / 1 allocation; 10 eviction cycles passed. Matrix parity, context recovery and camera-independent caching passed. GPU/FPS not measured.");
