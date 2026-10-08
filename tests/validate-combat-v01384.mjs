import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read = (path) => fs.readFileSync(new URL("../"+path, import.meta.url), "utf8");
const combat = read("public/plant-combat.js");
const css = read("app/globals.css");
const server = read("app/api/combat-lobby/route.ts");
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function extract(name, globals={}) {
  const start = combat.indexOf("function "+name+"(");
  assert.ok(start>=0,"Missing function "+name);
  const opening=combat.indexOf("{",start);
  let depth=0,end=-1;
  for(let i=opening;i<combat.length;i++){
    if(combat[i]==="{")depth++;
    if(combat[i]==="}" && --depth===0){end=i+1;break;}
  }
  assert.ok(end>opening,name+" body not closed");
  return vm.runInNewContext("("+combat.slice(start,end)+")",globals);
}
const proximity=extract("zombieProximityLevel",{clamp});
assert.equal(proximity(120),0,"Distant zombies should be quiet");
assert.ok(proximity(5)>proximity(28),"Close zombies must be louder");
assert.ok(proximity(28)>proximity(70),"Approaching growls should rise smoothly");
assert.ok(proximity(5)<=1 && proximity(70)>=0,"Distance gain must remain normalized");

const countdown=extract("waveCountdownSeconds");
assert.equal(countdown(1000,12000),11,"Countdown should expose full remaining wave delay");
assert.equal(countdown(4500,12000),8,"Countdown should show seconds remaining");
assert.equal(countdown(12000,12000),0,"Timer reaches zero when wave begins");
assert.equal(countdown(13000,12000),0,"Timer may not become negative");
assert.ok(combat.includes("ZOMBIE_WAVE_BREAK_MS = 11000"),"There must be at least ten seconds between waves");
assert.ok(combat.includes("waveNextAt=now+ZOMBIE_WAVE_BREAK_MS"),"Wave clear must use the eleven-second interval");
assert.ok(combat.includes("NEXT WAVE IN") && combat.includes("waveCountdownSeconds("),
  "Wave panel must render a live seconds countdown");

const tension=extract("combatMusicIntensity",{clamp});
const quiet=tension(0,100,90,false);
const danger=tension(7,22,7,false);
assert.ok(danger>quiet,"Music should intensify with low health and nearby threats");
assert.ok(tension(7,22,7,true)<danger,"Wave breaks need quieter music");
assert.ok(combat.includes("function playCombatMusic(") && combat.includes("function playMusicStinger("),
  "Music must have dynamic score and distinct end-of-round stingers");
for(const cue of ["wave-clear","wave-start","wave-tick","zombie-growl"]){
  assert.ok(combat.includes('"'+cue+'":')||combat.includes(cue+":"),"Missing audio cue "+cue);
}
assert.ok(combat.includes("createStereoPanner") && combat.includes("nearestZombie"),
  "Ambient growls need directional, proximity-based spatialization");
assert.ok(combat.includes('playMusicStinger("victory")') &&
  combat.includes('playMusicStinger("death")'),"End screens must have distinct victory and death music");
assert.ok(combat.includes("SHIELD_MAX = 30"),"Shield max must be 30");
assert.ok(combat.includes("data-combat-shield-value>30"),"Initial shield value must show 30");
assert.ok(combat.includes("data-combat-points-value") && combat.includes("pointsValue.textContent"),
  "Points need their own readable HUD space");
assert.ok(css.includes(".combat-points-panel") && css.includes(".combat-shield-track"),
  "HUD must style the points and enlarged vitals");
assert.ok(server.includes("waveBreakRemainingMs"),"Co-op wave countdown must be relayed to every player");
console.log("v0.13.84 tests passed: directional zombie ambience, dynamic music, 11s wave break, countdown, 30 shield, points HUD and multiplayer sync.");
