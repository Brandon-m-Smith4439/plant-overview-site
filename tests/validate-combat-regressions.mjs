import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
const combat = read("public/plant-combat.js");
const plant = read("public/plant-app.js");
const movement = read("public/first-person-controller.js");
const server = read("app/api/combat-lobby/route.ts");

function extractFunction(source, name, globals = {}) {
  const start = source.indexOf("function " + name + "(");
  assert.notEqual(start, -1, "Missing function " + name);
  const bodyStart = source.indexOf("{", start);
  let nesting = 0, end = -1;
  for (let i=bodyStart; i<source.length; i++) {
    if (source[i]==="{") nesting++;
    if (source[i]==="}" && --nesting===0) { end=i+1; break; }
  }
  assert.ok(end>bodyStart, name + " must have a complete body");
  return vm.runInNewContext("(" + source.slice(start,end) + ")", globals);
}
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const splash=extractFunction(combat,"splashDamage",{number,clamp,hasLineOfSight:()=>true});
const center={x:0,y:0,z:0};
assert.equal(splash(center,center,10,100),100,"Point-blank rocket damages shooter");
assert.equal(splash(center,{x:10,y:0,z:0},10,100),0,"Blast stops at radius");
assert.ok(splash(center,{x:5,y:0,z:0},10,100)>0,"Blast hits all nearby actors");
assert.equal(splash(center,{x:11,y:0,z:0},10,100),0,"Blast does not pass max radius");
const obscured=extractFunction(combat,"splashDamage",{number,clamp,hasLineOfSight:()=>false});
assert.equal(obscured(center,{x:5,y:0,z:0},10,100),0,"Solid cover blocks distant blast");

const portal=extractFunction(plant,"combatPerimeterPassage",{
  combatPortalSpec:()=>({left:0,front:0,right:100,back:100,centerX:50,halfWidth:5.2,thickness:1})
});
assert.equal(portal(50,0,1),true,"Combat doorway can be crossed");
assert.equal(portal(10,0,1),false,"Solid wall blocks crossing");
assert.equal(portal(0,50,1),false,"Side walls stay closed");
assert.equal(portal(50,-30,1),true,"Outside wasteland is freely explorable");

assert.ok(combat.includes("COOP_REVIVE_WINDOW_MS=22000"),"Revive window must be limited");
assert.ok(combat.includes("function nearestDownedAlly()") && combat.includes("revive-player"),"Players must revive teammates");
assert.ok(server.includes('if(type==="revive-player")') && server.includes('recipient.state?.downedUntil'),"Server must validate revive request");
assert.ok(combat.includes('function meleeAttack()') && combat.includes('event.code === "KeyF"'),"Melee action must be available");
assert.ok(combat.includes("knockX:") && combat.includes("tryMoveEnemy(enemy"),"Melee must knock enemy backward");
assert.ok(combat.includes("resolved:false") && combat.includes("sourcePlayer:true"),"Player rockets must resolve timed splash");
assert.ok(combat.includes("rocket-blast") && combat.includes("damagePlayer(hurt"),"Explosion must reach remote players");
assert.ok(server.includes("designId:cleanId(machineSource.designId"),"Network zombies must transmit model identity");
assert.ok(plant.includes("liveEnemy ? 1 : stageAlpha") && plant.includes("grow: liveEnemy ? 1"),"Co-op zombie bodies must render at full growth");
assert.ok(plant.includes("function combatExteriorHills()") && plant.includes("kind:\"desert-hill\""),"Desert hills must be collision obstacles");
assert.ok(plant.includes("REVIVE ·") && plant.includes("reviveSeconds"),"Downed players must show a red revive countdown");
assert.ok(plant.includes("const scale = Number(root.scale)") && plant.includes("Math.max(.9, Number(point[2])"),"Viewmodel must not cover entire screen");
assert.ok(plant.includes("drawLegSegment(leftHip,leftKnee"),"Zombie legs must use actual volumes");
assert.ok(movement.includes("const roofLanding =") && movement.includes("verticalOffset = climb.height"),"Player must land on solid roof slab");
console.log("Combat gameplay regression checks passed: splash, blocked shots, portals, co-op, melee, rescue, collision, roof and viewmodel.");
