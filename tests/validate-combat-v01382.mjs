import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read=(name)=>fs.readFileSync(new URL("../"+name,import.meta.url),"utf8");
const plant=read("public/plant-app.js");
const combat=read("public/plant-combat.js");
const controller=read("public/first-person-controller.js");
const server=read("app/api/combat-lobby/route.ts");
const css=read("app/globals.css");
function extract(source,name,globals={}){
  const start=source.indexOf("function "+name+"(");
  assert.ok(start>=0,"Missing "+name);
  const opening=source.indexOf("{",start);
  let depth=0,end=-1;
  for(let i=opening;i<source.length;i++){
    if(source[i]==="{")depth++;
    if(source[i]==="}" && --depth===0){end=i+1;break;}
  }
  assert.ok(end>opening,"Function "+name+" complete");
  return vm.runInNewContext("("+source.slice(start,end)+")",globals);
}
const portalSpec=()=>({left:0,front:0,right:100,back:100,centerX:50,centerZ:50,halfWidth:6.2,thickness:1,height:20});
const portalWalls=extract(plant,"combatPortalWallSections",{combatPortalSpec:portalSpec});
const sections=portalWalls();
assert.equal(sections.length,6,"South/east should contain two solid wall sections and one door lintel each");
assert.ok(sections.every(part=>/^south|^east/.test(part.id)),"North and west are open");
assert.equal(sections.filter(p=>p.id.endsWith("-lintel")).length,2,"Both doorways have overhead lintels");
const portalOpen=extract(plant,"combatPerimeterPassage",{combatPortalSpec:portalSpec});
assert.equal(portalOpen(50,0,1),true,"South passage is open");
assert.equal(portalOpen(10,0,1),false,"South wall remains solid");
assert.equal(portalOpen(100,50,1),true,"East passage is open");
assert.equal(portalOpen(100,20,1),false,"East wall remains solid");
assert.equal(portalOpen(0,50,1),true,"West wall is fully removed");
assert.equal(portalOpen(50,100,1),true,"North wall is fully removed");
const gateway=extract(combat,"crossingPortalTarget",{
  options:{getPlantBounds:()=>[0,0,100,100],getPortalWaypoints:()=>[
    {id:"south",x:50,z:0},{id:"east",x:100,z:50}]}
});
const south=gateway({x:30,z:-20},{x:30,z:20});
assert.equal(south.x,50,"AI should aim for south door, not run into wall");
assert.ok(south.z>0,"South goal should land inside plant");
const east=gateway({x:120,z:30},{x:80,z:30});
assert.equal(east.z,50,"AI should aim for east door, not run into wall");
assert.equal(gateway({x:-10,z:50},{x:30,z:50}),null,"AI can cross the open west side directly");
assert.ok(plant.includes("const shape={type:\"box\"")&&plant.includes("const white={type:\"box\""),
  "Zombie eyes must be actual Designer box geometry; missing type silently renders nothing");
assert.ok(plant.includes("for (const side of [-1,1])")&&plant.includes("eyeWhite"),
  "Eye meshes must be guaranteed visible on both sides of every zombie head");
assert.ok(plant.includes("enemyWeapon===\"chainsaw\"")&&plant.includes("const slashPulse")&&plant.includes("tooth<12"),
  "3D chainsaw must show moving chain teeth and attack swings");
assert.ok(combat.includes("attacking:Boolean(enemy.shotStartedAt")&&server.includes("attacking:Boolean(source.attacking)"),
  "Co-op clients need the attack animation state from the host");
assert.ok(combat.includes("COOP_REVIVE_HOLD_MS=3500")&&combat.includes("function cancelReviveHold()"),
  "Holding E for several seconds is mandatory and releasing E cancels progress");
assert.ok(combat.includes('multiplayer.sendEvent("revive-begin"')&&
  server.includes('now-start.createdAt<3000'),"Server must enforce minimum revive hold duration");
assert.ok(combat.includes("function becomePlayerZombie()")&&combat.includes("playerZombie=true"),
  "Expired unrevived co-op zombie players must turn into hostile zombies");
assert.ok(combat.includes("revenant:playerZombie")&&server.includes("revenant: Boolean(source.revenant)"),
  "Host and other players must receive the transformed player's identity");
assert.ok(plant.includes("zombie:Boolean(playerState.revenant)"),"Living teammates must remain human");
assert.ok(combat.includes('Boolean(state.revenant)===Boolean(playerZombie)')&&
  server.includes("Boolean(existing.state.revenant)===Boolean(target.state.revenant)"),
  "Survivors cannot hurt teammates unless one is a zombie");
assert.ok(controller.includes("next.x = climb.landingX")&&plant.includes("landingZ:site.z+site.d-2"),
  "Ladder completion must place users on the roof, never within its walls");
assert.ok(plant.includes("function exteriorWalkAllowed")&&plant.includes("const onRoof="),
  "POI walls must prevent passing through the building at floor height");
assert.ok(combat.includes("data-combat-pause-health")&&css.includes(".combat-pause-card"),
  "A tactical pause dashboard with real health and enemy stats should replace the old dialog");
assert.ok(css.includes("var(--revive-progress,0)"),"Held revive animation should display real progress");
console.log("v0.13.82 gameplay checks passed: south/east doors, AI portals, zombie eyes, chainsaw, hold revive, transformed players, roofs, pause UI.");
