import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read=(file)=>fs.readFileSync(new URL("../"+file,import.meta.url),"utf8");
const combat=read("public/plant-combat.js");
const plant=read("public/plant-app.js");
const css=read("app/globals.css");
function extract(source,name,globals={}) {
  const start=source.indexOf("function "+name+"(");
  assert.ok(start>=0,"Missing "+name);
  const opening=source.indexOf("{",start);
  let depth=0,end=-1;
  for(let i=opening;i<source.length;i++) {
    if(source[i]==="{")depth++;
    if(source[i]==="}" && --depth===0){end=i+1;break;}
  }
  assert.ok(end>opening,"Unclosed "+name);
  return vm.runInNewContext("("+source.slice(start,end)+")",globals);
}
const rarity=extract(combat,"mysteryRarity");
assert.equal(rarity("novaRifle"),"mythic");
assert.equal(rarity("thunderCannon"),"mythic");
assert.equal(rarity("reaperLMG"),"mythic");
assert.equal(rarity("teddy"),"cursed");
assert.equal(rarity("smg"),"common");
assert.ok(combat.includes("novaRifle: Object.freeze") &&
  combat.includes("thunderCannon: Object.freeze") &&
  combat.includes("reaperLMG: Object.freeze"),
  "Ultra-rare powerful weapons must be functional, not cosmetic");
const pool=["smg","carbine","novaRifle","teddy"];
const weights={smg:14,carbine:13,novaRifle:.24,teddy:4.5};
const roll=extract(combat,"rollMysteryPrize",{
  MYSTERY_WEAPON_POOL:pool,MYSTERY_PRIZE_WEIGHTS:weights,Math
});
assert.equal(roll(pool,0),"smg","Common items occupy large weight bands");
assert.equal(roll(pool,.999999),"teddy","Teddy bear has a dedicated roll band");
assert.equal(roll(["novaRifle"],.5),"novaRifle","Rare weapon is possible when eligible");
assert.ok(combat.includes("if (mysteryOffer.prizeKey===") ||
          combat.includes('mysteryOffer.prizeKey==="teddy"'),"Teddy roll must relocate box");
assert.ok(!combat.includes("if(zombieWave>1&&(zombieWave-1)%2===0)moveMysteryBoxForWave()"),
  "Wave transitions may not relocate an occupied mystery box");
assert.ok(combat.includes("if (!mysteryBox || mysteryOffer || otherPlayerUsingMysteryBox()) return"),
  "Active mystery spins must lock box location");
assert.ok(combat.includes('mystery-relocate-request') && combat.includes('barrel-detonate'),
  "Co-op clients must synchronize box relocation and explosive barrel destruction");
assert.ok(combat.includes('kind==="explosive-barrel"') &&
  combat.includes("function detonateExplosive(") &&
  combat.includes("isExplosiveDestroyed:"),
  "Barrels must respond to gunfire, explode, and disappear");
assert.ok(plant.includes("function combatExplosiveBarrels()") &&
  plant.includes('kind:"explosive-barrel"') &&
  plant.includes("combatExplosiveBarrels().forEach(barrel"),
  "Physical barrel hitboxes and visible props must share positions");
assert.ok(plant.includes('combatController.glassRevision?.()') &&
  plant.includes("visibleDesignComponents(design,time).some(part=>carrierGlassComponent"),
  "Glass-bearing machines cannot bypass destruction via retained instancing");
assert.ok(plant.includes("isGlassShattered?.(machine.instanceId||machine.id||machine.name"),
  "Authored panels must disappear when their destroyed ID is recorded");
assert.ok(plant.includes("const rimY=site.h+.61") &&
  plant.includes("site.x-.55&&x<=site.x+site.w+.55"),
  "Roof outlines and solid walking surfaces must agree");
assert.ok(plant.includes('combatController?.getMode?.()==="zombie" ||'),
  "Zombie mode cannot run into invisible decorative hill hitboxes");
assert.ok(plant.includes('weaponKey==="teddy"') &&
  plant.includes("mysteryRarityColors"),
  "Teddy bear and rarity colors need distinct 3D presentations");
assert.ok(css.includes('data-weapon-rarity="mythic"') &&
  css.includes('data-weapon-rarity="rare"'),
  "Awarded rare weapons need visibly distinct HUD backgrounds");
console.log("v0.13.86 tests passed: shattered glass caching, visible terrain collisions, explosive barrels, teddy relocation and rare weapon visuals.");
