import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
const plant=read("public/plant-app.js");
const combat=read("public/plant-combat.js");
const walk=read("public/first-person-controller.js");
const css=read("app/globals.css");
function isolate(source,name,context={}) {
  const start=source.indexOf("function "+name+"(");
  assert.notEqual(start,-1,"Missing function: "+name);
  const opening=source.indexOf("{",start);
  let depth=0,end=-1;
  for(let i=opening;i<source.length;i++){
    if(source[i]==="{")depth++;
    if(source[i]==="}" && --depth===0){end=i+1;break;}
  }
  assert.ok(end>opening,"Unclosed function "+name);
  return vm.runInNewContext("("+source.slice(start,end)+")",context);
}
const portals=[
  {id:"south",x:100,z:2},{id:"east",x:198,z:100},
  {id:"west",x:0,z:100,open:true},{id:"north",x:100,z:200,open:true}
];
const crossing=isolate(combat,"crossingPortalTarget",{options:{
  getPlantBounds:()=>[0,0,200,200],getPortalWaypoints:()=>portals
}});
assert.equal(crossing({x:-55,z:-30},{x:-55,z:45}),null,
  "Path entirely west of plant must not be sent through a south door");
assert.equal(crossing({x:240,z:-35},{x:260,z:45}),null,
  "Path entirely east of plant must not be sent through a south door");
assert.equal(crossing({x:225,z:245},{x:180,z:245}),null,
  "Path north of the plant must not be sent through an east door");
assert.equal(crossing({x:100,z:-25},{x:100,z:20})?.x,100,
  "Crossing the actual south wall should use its door");
assert.equal(crossing({x:230,z:100},{x:190,z:100})?.z,100,
  "Crossing the actual east wall should use its door");

const grove=isolate(plant,"combatDeadForestTrees",{
  floorBounds:()=>[0,0,200,200],
  combatExteriorLandmarks:()=>[],
  deadForestCache:{key:"",trees:[]}
});
const trees=grove();
assert.ok(trees.length>=275,"Tall forest needs many trees across the wasteland");
assert.ok(trees.every(tree=>tree.height>=40),
  "Dead trees must have tall upright trunks, not short sideways branches");
assert.ok(trees.some(tree=>tree.height>=85),
  "Wasteland needs landmark-scale trees taller than the outposts");
assert.ok(trees.filter(tree=>tree.grove>=8).length>=50,
  "Wasteland must have scattered trees between its dense groves");
assert.ok(trees.every(t=>t.x<0||t.x>200||t.z<0||t.z>200),
  "No trees may occupy the working plant floor");
assert.equal(JSON.stringify(grove()),JSON.stringify(trees),
  "Forest coordinates must remain consistent between co-op clients");
const drawing=plant.slice(plant.indexOf("function drawDeadForest("),
  plant.indexOf("function combatExteriorLandmarks("));
assert.ok(drawing.includes("h:h*.") && !drawing.includes("rotationZ:tree.phase"),
  "Tree trunks must extend vertically without being rotated sideways");

const drop=isolate(walk,"roofDropPosition");
const side=drop({x:20,z:20,w:20,d:20},{x:40.1,z:30},1.2);
assert.ok(side.x>=41.4 && side.z===30,
  "Stepping off a rooftop must clear the building facade before falling");
const corner=drop({x:20,z:20,w:20,d:20},{x:40.1,z:40.2},1.2);
assert.ok(corner.x>=41.4 && corner.z>=41.4,
  "Jumping off a roof corner must clear both walls");
assert.ok(walk.includes("roofJumpReady") && walk.includes("roofLanding"),
  "Grounded roof jumping and safe roof landing must both be supported");
assert.ok(walk.includes("roofDropPosition("),
  "Roof edge movement must call the facade clearance helper");

const layout=css.slice(css.lastIndexOf("v0.13.85"));
assert.ok(layout.includes(".combat-mode-active .combat-health-panel") &&
  /bottom\s*:\s*[^;]+/.test(layout) && /top\s*:\s*auto\s*!important/.test(layout),
  "Vitals must be anchored to the bottom left in desktop and mobile combat");
assert.ok(layout.includes(".combat-points-panel"),
  "Points panel must be moved clear of bottom-left vitals");

console.log("v0.13.85 regression checks passed: true perimeter crossings, tall upright forests, rooftop jumping/drop clearance, and bottom-left vitals.");
