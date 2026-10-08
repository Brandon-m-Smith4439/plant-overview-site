import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read=(file)=>fs.readFileSync(new URL("../"+file,import.meta.url),"utf8");
const combat=read("public/plant-combat.js");
const plant=read("public/plant-app.js");
const walk=read("public/first-person-controller.js");
const api=read("app/api/combat-lobby/route.ts");
const css=read("app/globals.css");
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,Number(value)||0));
const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
function isolate(source,name,context={}){
  const start=source.indexOf("function "+name+"(");
  assert.notEqual(start,-1,"Function missing: "+name);
  const opening=source.indexOf("{",start);
  let depth=0,end=-1;
  for(let i=opening;i<source.length;i++){
    if(source[i]==="{")depth++;
    if(source[i]==="}"&&--depth===0){end=i+1;break;}
  }
  assert.ok(end>opening,"Unclosed function "+name);
  return vm.runInNewContext("("+source.slice(start,end)+")",context);
}

const death=isolate(combat,"synchronizeEnemyDeathPose",{number,clamp});
const a={health:0},b={health:0};
assert.equal(death(a,{deathAgeMs:240,deathDirection:-1,deathPushX:1.2},5240),true);
assert.equal(death(b,{deathAgeMs:240,deathDirection:-1,deathPushX:1.2},100240),true);
assert.equal(5240-a.deathAnimationStartedAt,240,"Death progress must use local clock");
assert.equal(100240-b.deathAnimationStartedAt,240,"Second browser's local clock must be irrelevant");
assert.equal(a.deathDirection,-1);
death(a,{deathAgeMs:390},5390);
assert.equal(a.deathAnimationStartedAt,5000,"Later packets must not restart death animation");
assert.equal(death({health:42},{deathAgeMs:200},5000),false,"Alive actors must not enter death animation");
assert.ok(combat.includes("deathAgeMs:enemy.health<=0")&&api.includes("deathAgeMs: Math.max"),
  "Death elapsed time must survive the host -> server -> client round trip");
assert.ok(combat.includes("deathPushZ:number(enemy.deathPushZ)")&&api.includes("deathPushZ:"),
  "Falling direction and impulse must also synchronize");

const forest=isolate(plant,"combatDeadForestTrees",{
  floorBounds:()=>[0,0,200,200],
  combatExteriorLandmarks:()=>[],
  deadForestCache:{key:"",trees:[]},
});
const trees=forest();
assert.ok(trees.length>=115,"Large dense patches need at least 115 skeletal trees");
assert.equal(JSON.stringify(forest()),JSON.stringify(trees),"Forest generation must be deterministic");
assert.ok(trees.every(t=>t.x<0||t.x>200||t.z<0||t.z>200),
  "Trees must not grow in the normal plant work area");
assert.ok(new Set(trees.map(t=>t.grove)).size>=5,"Forests must consist of multiple distinct groves");
const outsider=isolate(plant,"exteriorWalkAllowed",{
  combatController:{isActive:()=>true,getMode:()=>"zombie"},
  combatWorldBounds:()=>[-180,-180,380,380],
  combatExteriorHills:()=>[],
  combatExteriorLandmarks:()=>[],
  combatDeadForestTrees:()=>[{x:10,z:-30,radius:.6}],
  state:{walkVerticalOffset:0},clamp,
});
assert.equal(outsider(10,-30,1.2),false,"Trees must physically block players");
assert.equal(outsider(34,-30,1.2),true,"Clear gaps between trees remain walkable");
assert.ok(plant.includes('kind:"forest-trunk"')&&plant.includes("drawDeadForest(time)"),
  "AI nav and rendering must share the same branch forest geometry");
assert.ok(plant.includes("drawZombieMoon")&&plant.includes("drawDeadForest(performance.now())"),
  "Zombie mode should show the blocky lunar body and its forest");
assert.ok(plant.includes("Patches of silver illumination"),"Night scene should show lunar ground illumination");

const sprint=isolate(combat,"playerIsSprinting",{
  options:{getPlayer:()=>({sprinting:true,moving:true})},
  roundState:"playing",paused:false,
});
assert.equal(sprint(),true,"Moving sprinting players are unarmed while sprinting");
const idle=isolate(combat,"playerIsSprinting",{
  options:{getPlayer:()=>({sprinting:true,moving:false})},
  roundState:"playing",paused:false,
});
assert.equal(idle(),false,"Holding Shift while motionless does not disable firing");
assert.ok(walk.includes("isSprinting: () => enabled")&&plant.includes("sprinting: firstPersonController?.isSprinting"),
  "First-person sprint must reach the combat controller");
assert.ok(combat.includes("playerIsSprinting() || reviveHold")&&combat.includes("function fire()"),
  "Gun fire must be blocked for running and reviving players");
assert.ok(combat.includes("!playerIsSprinting() && !reviveHold"),
  "Sprinting must also prevent aiming down sights");
assert.ok(plant.includes("const sprint=Boolean(combat.sprinting")&&plant.includes("(sprint?-34:0)"),
  "Sprint animation must lower and rotate the weapon");

assert.ok(combat.includes("revivingTargetId:reviveHold?.targetId")&&api.includes("revivingTargetId: cleanId"),
  "Revive progress must be transferred to peer renderers");
assert.ok(plant.includes("reviving:Boolean(playerState.revivingTargetId)")&&
  plant.includes("if(combat.reviving)")&&plant.includes("reviveProgress"),
  "Other clients and first-person view must animate reviving arms");
assert.ok(combat.includes("playCombatSound")&&combat.includes("SOUND_PRESETS=Object.freeze"),
  "A procedural sound palette must be available without remote assets");
for(const cue of ["explosion","shield-break","health-hit","revive","chainsaw","zombie-growl","footstep","reload-end","wind"]){
  assert.ok(combat.includes(cue+":" )||combat.includes('"'+cue+'":'),
    "Missing audio cue: "+cue);
}
assert.ok(combat.includes("setCombatSoundEnabled")&&css.includes(".combat-pause-audio"),
  "Players must be able to mute sound in the pause menu");
assert.ok(css.includes(".combat-vitals-alert")&&css.includes(".combat-health-critical")&&
  css.includes(".combat-shield-break-flash"),
  "HUD needs clear critical health and shield-break states");
console.log("v0.13.83 tests passed: co-op death clocks, forest collision, moon, sprint lock, revive poses, sound and vital gauges.");
