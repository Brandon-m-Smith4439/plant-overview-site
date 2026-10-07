import assert from "node:assert/strict";
import fs from "node:fs";

const combat = fs.readFileSync(new URL("../public/plant-combat.js", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const access = fs.readFileSync(new URL("../public/editor-access.js", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const owner = fs.readFileSync(new URL("../app/plant-owner-7f3a9c/page.tsx", import.meta.url), "utf8");
const ownerGate = fs.readFileSync(new URL("../app/editor-access-gate.tsx", import.meta.url), "utf8");
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
assert.ok(combat.includes("enemy.rotationY = faceAngle(source, playerTarget)") && combat.includes("enemy.aimLockUntil = now + (loadout.melee ? 300 : 560)"), "Enemy firing must authoritatively face the player.");
assert.ok(combat.includes("Killed by ") && combat.includes("killerRevealUntil") && combat.includes("playerDeathDuration = 5000") && combat.includes("roundOverlay.hidden = true"), "Five-second death killer reveal flow is missing.");
assert.ok(plant.includes("leftKnee") && plant.includes("rightKnee") && plant.includes("leftFoot") && plant.includes("rightFoot"), "Two-segment enemy walking gait is missing.");
assert.ok(plant.includes("rgba(255,231,151,.98)") && plant.includes("tracerTarget"), "Visible two-layer enemy bullet tracers are missing.");
assert.ok(combat.includes("hitReactUntil") && combat.includes("defeatedAt") && combat.includes("deathProgress"), "Enemy hit/death animations are incomplete.");
assert.ok(combat.includes("playerRenderState") && combat.includes("reloadProgress") && combat.includes("recoilProgress"), "Player weapon animation state is missing.");
assert.ok(combat.includes("roundState") && combat.includes("data-combat-restart"), "Win/defeat restart flow is missing.");
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
assert.ok(plant.includes('window.requestAnimationFrame(() => {') && plant.includes('combatController.start(mode);'), "Combat should enter first person before starting the countdown.");

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

// v0.13.58: shield, combat-owned Esc menu, death input lock, and killer outline/name.
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

// v0.13.58: player tracers/impacts, blood effects, ADS scope, enemy loadout variety, and reduced shield.
assert.ok(combat.includes("SHIELD_MAX = 22") && combat.includes("SHIELD_RECHARGE_PER_SECOND = 7"), "Combat shield must be reduced to about half strength.");
assert.ok(combat.includes("ENEMY_WEAPONS") && combat.includes("sniper") && combat.includes("bazooka") && combat.includes("chainsaw") && combat.includes("shotgun") && combat.includes("smg"), "Randomized enemy weapon catalog is incomplete.");
assert.ok(combat.includes("ENEMY_WEAPON_KEYS[Math.floor(Math.random() * ENEMY_WEAPON_KEYS.length)]") && combat.includes("loadout.melee"), "Combat Mode enemy loadouts must randomize and drive melee/ranged AI behavior.");
assert.ok(combat.includes("pushTracer") && combat.includes("pushImpact") && combat.includes("resolveWorldImpact") && combat.includes("combatEffects"), "Player tracers and persistent impact decals are missing.");
assert.ok(combat.includes("pushBloodBurst") && combat.includes("bloodPools") && combat.includes("startAt: now + 920"), "Enemy hit blood and delayed death pools are missing.");
assert.ok(combat.includes("event.button === 2") && combat.includes("setAiming") && combat.includes("combat-scope-overlay"), "Right-click aim/scope flow is missing.");
assert.ok(plant.includes("drawCombatWorldEffects") && plant.includes("bloodBursts") && plant.includes("bloodPools"), "Combat world effects are not rendered in the plant scene.");
assert.ok(plant.includes('enemyWeapon === "sniper"') && plant.includes('enemyWeapon === "bazooka"') && plant.includes('enemyWeapon === "chainsaw"'), "Distinct 3D enemy weapon models are missing.");
assert.ok(plant.includes("state.combatAimFov") && plant.includes("setAimZoom"), "Scoped aiming must narrow the first-person FOV.");
assert.ok(css.includes(".combat-scope-overlay") && css.includes(".combat-holo-sight"), "Holographic aim overlay styling is missing.");
assert.ok(plant.includes("function combatLabelsSuppressed()") && plant.includes("combatLabelsSuppressed() || !WORLD_MACHINE_LABELS"), "Machine labels must be suppressed while Combat Mode is active.");
assert.ok(plant.includes("SCREEN_SPACE_LABELS && !combatLabelsSuppressed()") && plant.includes("combatLabelsSuppressed() || !SCREEN_SPACE_LABELS"), "Process-step and route-tag labels must be suppressed while Combat Mode is active.");

// v0.13.58: depth-tested combat effects, holographic ADS, explosive rockets, dodge rolls, and combat-face/death polish.
assert.ok(combat.includes("impactNormalForBox") && combat.includes("size: .105") && combat.includes("normal: { ...normal }"), "Bullet holes must be constant-size world-space decals aligned to the struck surface.");
assert.ok(plant.includes("drawCombatWorldEffects(time);") && plant.indexOf("drawCombatWorldEffects(time);") < plant.indexOf("presentPhysicalScene?.();"), "Combat tracers/decals/blood must enter the physical depth-tested scene before presentation.");
assert.ok(combat.includes("bloodFountains") && plant.includes("effects.bloodFountains") && plant.includes("14;i++"), "Stronger blood bursts and occasional post-death blood fountains are missing.");
assert.ok(combat.includes('rocket: Object.freeze') && combat.includes("pushExplosiveProjectile") && combat.includes("resolveExplosionDamage"), "Rocket Launcher projectile/explosion behavior is missing.");
assert.ok(combat.includes("sightRange: 145") && combat.includes("moveSpeed: 2") && combat.includes("const sightRange = loadout.sightRange"), "Melee enemies must detect farther and rush at double-speed loadout weighting.");
assert.ok(combat.includes("triggerCombatRoll") && combat.includes("rollStartedAt") && plant.includes("rollProgress") && plant.includes("rotationZ"), "Enemy combat-roll behavior/animation is missing.");
assert.ok(plant.includes("large protruding eyes") && plant.includes("#f5f6f2"), "Combat people must retain visible eyes.");
assert.ok(css.includes("combat-holo-sight") && css.includes("combat-holo-glass") && !css.includes("border-radius:50%;\n  border:clamp(3px,.4vw,6px)"), "Rifle ADS must use a holographic sight instead of the old circular scope.");
assert.ok(combat.includes("function playerMuzzleOrigin") && combat.includes("rightOffset"), "Player tracer muzzle must originate at the rendered gun and follow ADS/hip-fire position.");
assert.ok(css.includes("combat-hitmarker.visible i") && css.includes("#ff4e55"), "Person hits must use a red hit marker instead of bullet-hole decals.");

// v0.13.59: celebratory victory, touch combat, corrected combat eyes, and loadout-specific 3D weapons.
assert.ok(combat.includes('"FLOOR RECLAIMED" : "PLANT SECURED"') && combat.includes('"ZOMBIE WAVE CLEARED" : "VICTORY"') && combat.includes("victoryTime"), "Victory screen must present a celebratory PLANT SECURED state with round stats.");
assert.ok(css.includes(".combat-round-overlay.victory") && css.includes(".combat-victory-confetti") && css.includes("@keyframes combat-confetti-fall"), "Victory screen celebratory animation styling is missing.");
assert.ok(plant.includes('data-touch-combat="fire"') && plant.includes('data-touch-combat="aim"') && plant.includes('data-touch-combat="reload"') && plant.includes('data-touch-combat="swap"'), "Mobile Combat Mode action controls are missing.");
assert.ok(plant.includes("navigator.maxTouchPoints") && combat.includes("setTriggerHeld") && combat.includes("setAiming: (enabled)"), "Touch players must be combat-engaged without desktop pointer lock and expose fire/aim APIs.");
assert.ok(css.includes(".combat-mode-active .touch-combat-actions") && css.includes(".touch-combat-fire"), "Mobile Combat Mode controls are not styled for touch screens.");
assert.ok(plant.includes("const eyeY=hy+hh*.57") && plant.includes("const eyeZ=hz-eyeD*1.38"), "Combat eyes must stay anchored high and visibly in front of the actual head face plane.");
assert.ok(plant.includes("Large shoulder-fired launcher") && plant.includes("weaponMuzzleZ=-3.18"), "Enemy Rocket Launcher must render as a large shoulder-fired 3D weapon.");
assert.ok(plant.includes("Thick right-side service rifle") && plant.includes('enemyWeapon === "sniper"') && plant.includes('enemyWeapon === "chainsaw"'), "AI rifle, sniper, and chainsaw models must have distinct detailed right-hand 3D geometry.");
// v0.13.61: shared envelopes, reliable owner Combat entry, stronger weapon placement, and deterministic deaths.
const sharedWorkspace = fs.readFileSync(new URL("../public/shared-workspace.js", import.meta.url), "utf8");
const sharedWorkspaceRoute = fs.readFileSync(new URL("../app/api/shared-workspace/route.ts", import.meta.url), "utf8");
assert.ok(page.includes('/shared-workspace.js'), "Plant page must hydrate the shared cross-device workspace before the renderer boots.");
assert.ok(sharedWorkspace.includes("monroe-glass-machine-designs-v1") && sharedWorkspace.includes("monroe-glass-plant-layout-v6") && sharedWorkspace.includes("schedulePublish"), "Shared workspace must sync both design envelopes and layout data across devices.");
assert.ok(sharedWorkspaceRoute.includes("PLANT_WORKSPACE_PATH") && sharedWorkspaceRoute.includes("writeFile") && sharedWorkspaceRoute.includes("ownerSessionValid"), "Shared workspace API must persist owner changes on durable server storage.");
assert.ok(plant.includes('data-toggle="combat" class="combat-mode-button"') && plant.includes("syncCombatAvailability") && plant.includes("plantowneraccesschange"), "Desktop owner Combat button must stay in the toolbar and resync owner visibility after startup.");
assert.ok(plant.includes("const weaponCenterX = width*.72") && plant.includes("Both arms reach a real right-hand weapon"), "Enemy weapons must be shifted into a readable right-hand pose instead of centered through the torso.");
assert.ok(plant.includes("Raised holographic sight: open center") && plant.includes("rifleAds && index >= 10 && index <= 14") && plant.includes('magazineIndex = combat.weapon === "rifle" ? 5'), "Player rifle ADS must hide its physical optic while preserving explicit magazine reload animation.");
assert.ok(combat.includes("deathAnimationStartedAt") && combat.includes("/ 1120") && combat.includes("scheduleVictory") && combat.includes("1325"), "Enemy death animation must start on the first rendered defeated frame and finish before final victory covers the scene.");


// v0.13.62: owner-session handoff, enemy firearm reloads, animated weapon handling, and chainsaw sprint pressure.
assert.ok(ownerGate.includes("useEffect") && ownerGate.includes("if (!editingAvailable || !hasEditorAccess()) return;") && ownerGate.includes("grantEditorAccess();"), "Already-authenticated owner workspace visits must stamp the owner session so Combat Mode stays visible after returning to the plant.");
assert.ok(combat.includes("beginEnemyReload") && combat.includes("updateEnemyReload") && combat.includes("ammoInMagazine") && combat.includes("reloadUntil") && combat.includes("enemy.ammoInMagazine <= 0 && now >= enemy.nextShotAt"), "Enemy firearms must use real magazines and proactively reload when empty rather than firing forever.");
assert.ok(combat.includes("shotProgress") && combat.includes("reloadProgress") && combat.includes("magazineSize"), "Enemy firing/reload animation progress must be exposed to the renderer.");
assert.ok(combat.includes('rifle: Object.freeze({ key: "rifle"') && combat.includes("magazine: 24, reloadMs: 1900") && combat.includes("magazine: 5, reloadMs: 2750") && combat.includes("magazine: 1, reloadMs: 3500"), "Rifle, sniper, and rocket enemy reload timings are missing.");
assert.ok(plant.includes("shotPulse") && plant.includes("reloadWave") && plant.includes("support hand visibly leaves the fore-end") && plant.includes("magazineDrop"), "Enemy shooting and reloading must visibly animate arms and weapon geometry.");
assert.ok(plant.includes("Heavy layered motor housing") && plant.includes("chainOffset") && plant.includes("Full 3D service rifle") && plant.includes("multiple 3D collars"), "Chainsaw, rifle, sniper, and rocket launcher 3D revamps are incomplete.");


// v0.13.63: separate Zombie Mode, persistent clear times, true headshots, gun-side tracers, and end-screen kill stats.
assert.ok(plant.includes('data-toggle="zombie" class="zombie-mode-button"') && plant.includes('setCombatMode(!sameMode, "zombie")'), "Owner controls must expose a separate Zombie Mode beside Combat Mode.");
assert.ok(combat.includes('zombie: Object.freeze') && combat.includes('defaultWeapon: "shotgun"') && combat.includes('loadout: Object.freeze(["shotgun", "handgun"])'), "Zombie Mode must use the shotgun + pistol player loadout.");
assert.ok(combat.includes('record.weaponKey = record.zombie ? "chainsaw"') && combat.includes('record.modeSpeedMultiplier = record.zombie ? 1.55 : 1'), "Zombie AI must be chainsaw-only and significantly faster than normal Combat Mode enemies.");
assert.ok(plant.includes('headCandidates') && plant.includes('drawDesignBox(actor,{...headPart,color:skin}') && plant.includes('const eyeWhite = zombie ? "#f7e76f"'), "Zombie face/eye overlays must anchor to the actual custom-person Head component.");
assert.ok(combat.includes('function enemyHitVolumes') && combat.includes('zone: "head"') && combat.includes('zone: "body"') && combat.includes('HEADSHOT_DAMAGE_MULTIPLIER = 3'), "Combat hit detection must have separate head/body volumes and real headshot damage.");
assert.ok(combat.includes('headshotKills += 1') && combat.includes('regularKills += 1') && combat.includes('data-combat-headshot-kills') && combat.includes('data-combat-regular-kills'), "Regular-kill and headshot-kill statistics must be tracked separately.");
assert.ok(combat.includes('HIGH_SCORE_STORAGE_KEY') && combat.includes('recordRoundTime') && combat.includes('bestClearTime') && combat.includes('highScores[gameMode]'), "Combat and Zombie Mode clear times must persist independently as high scores.");
assert.ok(combat.includes('function playerMuzzleOrigin') && combat.includes('const ads = weapon?.key === "rifle" && Boolean(isAiming)') && combat.includes('const rightOffset'), "Player tracers must follow the rendered gun muzzle in hip-fire and rifle ADS.");
assert.ok(plant.includes('Hip fire keeps the physical holographic sight on the rifle model') && plant.includes('drawViewmodelPolygon(glassLocal') && plant.includes('reticleRadius'), "The player rifle must keep its holographic glass and reticle on the 3D model outside ADS.");
assert.ok(css.includes('.combat-restart-button') && css.includes('.combat-restart-icon') && css.includes('.combat-restart-copy'), "Victory/death restart control must use the polished replay button presentation.");


// v0.13.64: head-anchored zombie faces, unobstructed rifle ADS, muzzle-following tracers, visible buckshot spread, and immediate death falls.
assert.ok(plant.includes("const headPart = designParts.find") && plant.includes("canAnchorFaceToHead") && plant.includes("designLocalPointToWorld(actor,design"), "Zombie masks/eyes must be transformed from each person's actual Head component.");
assert.ok(plant.includes('const rifleAds = combat.weapon === "rifle" && aim > .5') && plant.includes('rifleAds && index >= 10 && index <= 14') && plant.includes('combat.weapon === "rifle" && !rifleAds'), "Rifle ADS must hide the physical optic/glass so the HUD holographic sight stays unobstructed.");
assert.ok(combat.includes("function playerMuzzleOrigin") && combat.includes("ads ? 1.66 : 1.34") && combat.includes("ads ? .06 : .42"), "Rifle tracer origin must move with the muzzle between ADS and hip fire.");
assert.ok(combat.includes("pellets: 8") && combat.includes("spread: .09") && combat.includes("pelletEndpoints.forEach") && combat.includes('pushTracer(muzzle, endpoint, now + pelletIndex * 2, "player-shotgun")'), "Shotgun must fire a wide eight-pellet spread with separate visible tracers.");
assert.ok(combat.includes("enemy.deathAnimationStartedAt = now") && !combat.includes("enemy.deathAnimationStartedAt = 0;\n      enemy.movementBlend = 0;"), "Enemy death animation must begin on the kill frame rather than waiting for a later render pass.");


// v0.13.65: continuous survival spawns, ammo pickups, real zombie heads, crane envelopes, and machine-safe death falls.
assert.ok(combat.includes("function updateZombieSpawns") && combat.includes("spawnZombie(now)") && combat.includes("zombieAliveCap(now)"), "Zombie Mode must continuously spawn additional edge zombies during survival.");
assert.ok(combat.includes("function resetAmmoPickups") && combat.includes("function updateAmmoPickups") && combat.includes("AMMO_PICKUP_RESPAWN_MS = 18000"), "Survival mode must provide respawning ammo pickups around the layout.");
assert.ok(combat.includes('mode === "zombie" ? Math.max(...scores)') && combat.includes("recordRoundTime(survivalSeconds)"), "Zombie high score must track longest survival time.");
assert.ok(plant.includes("drawDesignBox(actor,{...headPart,color:skin}") && plant.includes("large protruding eyes"), "Zombie visuals must repaint the actual Head geometry and show visible eyes.");
assert.ok(combat.includes("deathPushX") && combat.includes("deathPushZ") && plant.includes("deathPushX * eased"), "Death falls near machines must include obstacle-aware corpse drift.");
assert.ok(plant.includes('["bridgeCrane", "craneMachine"].includes(machine.type)') && plant.includes("designCollisionEnvelopes(design).length"), "Authored crane pillar envelopes must become real collision while envelope-free cranes remain pass-through.");
assert.ok(css.includes(".combat-exit-button") && css.includes(".combat-exit-copy"), "Exit Mode must receive the same polished end-screen control treatment as Restart.");

assert.ok(combat.includes("function cleanupZombieCorpses") && combat.includes("now - enemy.defeatedAt > 5200"), "Spawned zombie corpses must retire after their fall so survival mode does not accumulate actors forever.");
assert.ok(plant.includes("service gap between the tables") && plant.includes("component?.type === \"box\""), "Cutting-line fallback collision must use its separate table/console geometry instead of one oversized footprint.");
