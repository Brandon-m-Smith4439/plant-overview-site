import assert from "node:assert/strict";
import fs from "node:fs";

const combat = fs.readFileSync(new URL("../public/plant-combat.js", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const access = fs.readFileSync(new URL("../public/editor-access.js", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const owner = fs.readFileSync(new URL("../app/plant-owner-7f3a9c/page.tsx", import.meta.url), "utf8");
const preview = fs.readFileSync(new URL("../public/preview.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

assert.ok(combat.includes("createPlantCombatMode"), "Combat controller factory is missing.");
assert.ok(combat.includes("rayAabb") && combat.includes("hasLineOfSight"), "Enemy AI line-of-sight checks are missing.");
assert.ok(combat.includes("rifle") && combat.includes("handgun"), "Primary rifle and secondary handgun loadout is missing.");
assert.ok(combat.includes("Digit1") && combat.includes("Digit2") && combat.includes("KeyR"), "Weapon switching and reload controls are missing.");
assert.ok(combat.includes("getOccluders") && combat.includes("nearestObstacleDistance"), "Shots and enemy sight must respect plant occluders.");
assert.ok(combat.includes("playerHealth") && combat.includes("damagePlayer"), "Player health/damage flow is missing.");
assert.ok(combat.includes("updateEnemyMotion") && combat.includes("tryMoveEnemy"), "Enemy combat movement and obstacle-aware roaming are missing.");
assert.ok(combat.includes("enemyRenderState") && combat.includes("movementBlend") && combat.includes("walkPhase"), "Enemy animation state is not exposed to the plant renderer.");
assert.ok(combat.includes("muzzleFlashUntil") && combat.includes("recoilUntil") && combat.includes("tracerUntil"), "Enemy firing animation effects are incomplete.");
assert.ok(combat.includes("showIncomingDirection") && combat.includes("combat-damage-direction"), "Incoming-fire direction indicators are not wired to enemy shots.");
assert.ok(combat.includes("incomingDirectionName") && combat.includes("combat-direction-callout"), "Readable directional fire callouts are missing.");
assert.ok(combat.includes("blockedUntil") && combat.includes("aimLockUntil") && combat.includes("lastSeenAt"), "Enemy anti-spin steering and aim-lock state are missing.");
assert.ok(combat.includes("enemy.rotationY = faceAngle(source, playerTarget)") && combat.includes("enemy.aimLockUntil = now + (loadout.melee ? 260 : 520)"), "Enemy firing must authoritatively face the player.");
assert.ok(combat.includes("Killed by ") && combat.includes("killerRevealUntil") && combat.includes("playerDeathDuration = 5000") && combat.includes("roundOverlay.hidden = true"), "Five-second death killer reveal flow is missing.");
assert.ok(plant.includes("leftKnee") && plant.includes("rightKnee") && plant.includes("leftFoot") && plant.includes("rightFoot"), "Two-segment enemy walking gait is missing.");
assert.ok(plant.includes("rgba(255,231,151,.98)") && plant.includes("tracerTarget"), "Visible two-layer enemy bullet tracers are missing.");
assert.ok(combat.includes("hitReactUntil") && combat.includes("defeatedAt") && combat.includes("deathProgress"), "Enemy hit/death animations are incomplete.");
assert.ok(combat.includes("playerRenderState") && combat.includes("reloadProgress") && combat.includes("recoilProgress"), "Player weapon animation state is missing.");
assert.ok(combat.includes("roundState") && combat.includes("Restart combat"), "Win/defeat restart flow is missing.");
assert.ok(combat.includes("countdownEndsAt") && combat.includes("COMBAT STARTS IN"), "Two-second combat countdown is missing.");
assert.ok(combat.includes('resetRound({ countdown: true })'), "Combat and restart must enter the countdown state before AI becomes active.");
assert.ok(combat.includes('roundState !== "playing"'), "Weapons and enemy damage must stay locked until the countdown ends.");
assert.ok(access.includes("isOwner"), "Browser editor access must expose owner-session status.");
assert.ok(plant.includes('dataset.toggle = "combat"') || plant.includes('data-toggle="combat"'), "Owner-only Combat mode button is missing from the plant controls.");
assert.ok(plant.includes("combatEnemyMachines") && plant.includes("animatedperson"), "Person/team-member machines are not wired as enemy AI.");
assert.ok(plant.includes("combatOccluders"), "Plant geometry is not wired into combat line of sight.");
assert.ok(plant.includes('kind: "pillar"'), "Pillars must be explicit combat line-of-sight obstacles.");
assert.ok(plant.includes("drawCombatEnemy") && plant.includes("combatState"), "The plant renderer is not using live combat animation poses.");
assert.ok(plant.includes("drawFirstPersonCombatWeapon") && plant.includes("drawViewmodelBox") && plant.includes("viewmodelProject"), "The player weapon must be real canvas-rendered 3D geometry.");
assert.ok(plant.includes("combatEnemyPoseParent") && plant.includes("deathDirection"), "Enemy death animation must pivot the body down to the floor.");
assert.ok(plant.includes("playDeathCinematic") && plant.includes("combat-death-cinematic") && plant.includes("releasePointer"), "Death camera must fall and animate toward the killer before restart.");
assert.ok(plant.includes("combat.killerReveal"), "Killer world marker is missing.");
assert.ok(plant.includes("walkHitsStructuralColumn"), "Pillar walking collision must have a direct safety check.");
assert.ok(plant.includes("window.createPlantCombatMode"), "Plant viewer does not create the combat controller.");
assert.ok(page.includes('/plant-combat.js'), "Next plant page does not load the combat controller.");
assert.ok(preview.includes('plant-combat.js'), "Standalone preview does not load the combat controller.");
assert.ok(owner.includes('href="/?owner=combat"'), "Owner dashboard does not expose a Combat Mode launcher.");
assert.ok(css.includes(".combat-hud") && css.includes(".combat-weapon-panel"), "Combat HUD styling is missing.");
assert.ok(css.includes(".combat-damage-direction") && css.includes("combat-direction-fade"), "Directional incoming-fire indicators are missing.");
assert.ok(css.includes(".combat-direction-callout") && css.includes(".combat-round-overlay.killer-reveal"), "Enhanced direction readability and killer reveal styling are missing.");
assert.ok(css.includes(".combat-mode-active .first-person-hud"), "Normal first-person HUD must get out of the way during combat.");
console.log("Owner-only combat mode checks passed.");

const controlsStart = plant.indexOf('controls.innerHTML =');
const controlsEnd = plant.indexOf('frame.appendChild(controls)', controlsStart);
const controlsMarkup = plant.slice(controlsStart, controlsEnd);
assert.ok(controlsMarkup.indexOf('data-toggle="walk"') >= 0, "First person control is missing.");
assert.ok(controlsMarkup.indexOf('data-toggle="combat"') > controlsMarkup.indexOf('data-toggle="walk"'), "Combat mode must render immediately after First person for owners.");
assert.ok(plant.includes('window.requestAnimationFrame(() => {') && plant.includes('combatController.start();'), "Combat should enter first person before starting the countdown.");

// v0.13.55: every custom person must bypass retained instancing so combat-owned
// movement/rotation/weapons are actually rendered. Published Helper instances
// are explicit regression coverage for the person-design path.
assert.ok(plant.includes('combatController?.isActive?.() && combatEnemyMachine(machine)) return;'), "Shared design instancing must skip combat people.");
assert.ok(plant.includes('combatController?.isActive?.() && combatEnemyMachine(machine)) continue;'), "Production design instancing must skip combat people.");
assert.ok(plant.includes('staticIdentityParts'), "Combat people must preserve their custom person appearance while adding articulated limbs/weapons.");
assert.ok(combat.includes('return 180 - Math.atan2(dx, dz) * 180 / Math.PI;'), "Enemy facing must use the local -Z weapon basis instead of mirrored left/right aiming.");
assert.ok(combat.includes('playerDeathDuration = 5000'), "Death replay must last five seconds before restart/exit UI appears.");
assert.ok(plant.includes('playDeathCinematic') && plant.includes('combat-death-cinematic'), "Animated player fall/killer camera replay is missing.");
assert.ok(plant.includes('canOccupyHard: walkCanOccupyHard'), "Structural pillars must remain hard first-person collision even when optional collision is off.");

const workspaceSource = fs.readFileSync(new URL("../public/published-workspace.js", import.meta.url), "utf8");
const snapshotMatch = workspaceSource.match(/const snapshot = (\{.*\});\n/s);
assert.ok(snapshotMatch, "Published workspace snapshot is missing.");
const snapshot = JSON.parse(snapshotMatch[1]);
const publishedLayout = JSON.parse(snapshot.items["monroe-glass-plant-layout-v6"]);
const publishedDesigns = JSON.parse(snapshot.items["monroe-glass-machine-designs-v1"]).designs;
const publishedPeople = publishedLayout.machines.filter((machine) => {
  const design = publishedDesigns[machine.designId];
  return ["person", "animatedperson"].includes(String(machine.type || "").toLowerCase())
    || String(design?.machineType || "").toLowerCase() === "person";
});
assert.ok(publishedPeople.length >= 10, "Published person-machine coverage unexpectedly collapsed.");
assert.equal(publishedPeople.filter((machine) => machine.name === "Helper").length, 2, "Helper must be included in combat coverage as both published person instances.");

// v0.13.57: shield, combat-owned Esc menu, death input lock, and killer outline/name.
assert.ok(combat.includes("SHIELD_MAX = 22") && combat.includes("SHIELD_RECHARGE_DELAY_MS") && combat.includes("updatePlayerShield"), "Rechargeable combat shield is missing.");
assert.ok(combat.includes("combat-pause-overlay") && combat.includes("handleEscape") && combat.includes("setPaused"), "Combat Mode must own a dedicated Esc pause menu.");
assert.ok(combat.includes("options.setMovementLocked?.(true)") && combat.includes("isDefeated: () => roundState === \"lost\""), "Death must lock player movement and expose defeated state.");
assert.ok(plant.includes("setInputLocked") && plant.includes("combatController.handleEscape?.(reason)"), "First-person input/escape routing is not separated for Combat Mode.");
assert.ok(plant.includes("combatController?.isActive?.()") && plant.includes("the death menu stays authoritative"), "Esc must not open the normal pause menu during Combat Mode death.");
assert.ok(plant.includes("rgba(255,48,42,.98)") && plant.includes("combat.killerName") && plant.includes("ctx.fillText(name"), "Fatal shooter must receive a red 3D outline and visible name label.");
assert.ok(plant.includes("- .3));") && plant.includes("elapsed / 1050"), "Player death camera must collapse close to floor level before focusing the killer.");
assert.ok(css.includes(".combat-shield-track") && css.includes(".combat-pause-overlay") && css.includes(".combat-mode-active .first-person-menu"), "Shield/combat pause/menu separation styling is missing.");
const firstPersonControllerSource = fs.readFileSync(new URL("../public/first-person-controller.js", import.meta.url), "utf8");
assert.ok(firstPersonControllerSource.includes("setInputLocked") && firstPersonControllerSource.includes("if (inputLocked)"), "First-person controller cannot hard-lock movement after death/pause.");

// v0.13.57: player tracers/impacts, blood effects, ADS scope, enemy loadout variety, and reduced shield.
assert.ok(combat.includes("SHIELD_MAX = 22") && combat.includes("SHIELD_RECHARGE_PER_SECOND = 7"), "Combat shield must be reduced to about half strength.");
assert.ok(combat.includes("ENEMY_WEAPONS") && combat.includes("sniper") && combat.includes("bazooka") && combat.includes("chainsaw") && combat.includes("shotgun") && combat.includes("smg"), "Randomized enemy weapon catalog is incomplete.");
assert.ok(combat.includes("record.weaponKey = ENEMY_WEAPON_KEYS") && combat.includes("loadout.melee"), "Enemy loadouts must randomize and drive melee/ranged AI behavior.");
assert.ok(combat.includes("pushTracer") && combat.includes("pushImpact") && combat.includes("resolveWorldImpact") && combat.includes("combatEffects"), "Player tracers and persistent impact decals are missing.");
assert.ok(combat.includes("pushBloodBurst") && combat.includes("bloodPools") && combat.includes("startAt: now + 850"), "Enemy hit blood and delayed death pools are missing.");
assert.ok(combat.includes("event.button === 2") && combat.includes("setAiming") && combat.includes("combat-scope-overlay"), "Right-click aim/scope flow is missing.");
assert.ok(plant.includes("drawCombatWorldEffects") && plant.includes("bloodBursts") && plant.includes("bloodPools"), "Combat world effects are not rendered in the plant scene.");
assert.ok(plant.includes('enemyWeapon === "sniper"') && plant.includes('enemyWeapon === "bazooka"') && plant.includes('enemyWeapon === "chainsaw"'), "Distinct 3D enemy weapon models are missing.");
assert.ok(plant.includes("state.combatAimFov") && plant.includes("setAimZoom"), "Scoped aiming must narrow the first-person FOV.");
assert.ok(css.includes(".combat-scope-overlay") && css.includes(".combat-scope-lens"), "Scope overlay styling is missing.");
assert.ok(plant.includes("function combatLabelsSuppressed()") && plant.includes("combatLabelsSuppressed() || !WORLD_MACHINE_LABELS"), "Machine labels must be suppressed while Combat Mode is active.");
assert.ok(plant.includes("SCREEN_SPACE_LABELS && !combatLabelsSuppressed()") && plant.includes("combatLabelsSuppressed() || !SCREEN_SPACE_LABELS"), "Process-step and route-tag labels must be suppressed while Combat Mode is active.");
