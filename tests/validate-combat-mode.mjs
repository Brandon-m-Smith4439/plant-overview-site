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
const multiplayer = fs.readFileSync(new URL("../public/combat-multiplayer.js", import.meta.url), "utf8");
const lobbyRoute = fs.readFileSync(new URL("../app/api/combat-lobby/route.ts", import.meta.url), "utf8");

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
assert.ok(combat.includes("function resetCombatSessionUi()"), "Combat needs one idempotent session-UI reset so stale end screens cannot survive an exit/re-entry cycle.");
const startLifecycleStart = combat.indexOf('function start(mode = "combat")');
const stopLifecycleStart = combat.indexOf("function stop()", startLifecycleStart);
const startLifecycleBody = combat.slice(startLifecycleStart, stopLifecycleStart);
const stopLifecycleEnd = combat.indexOf("function handleKeyDown", stopLifecycleStart);
const stopLifecycleBody = combat.slice(stopLifecycleStart, stopLifecycleEnd);
assert.ok(startLifecycleBody.includes("resetCombatSessionUi()") && startLifecycleBody.indexOf("resetCombatSessionUi()") < startLifecycleBody.indexOf("active = true"), "Entering combat must clear stale victory/death UI before the new session becomes active.");
assert.ok(stopLifecycleBody.includes("resetCombatSessionUi()") && stopLifecycleBody.indexOf("resetCombatSessionUi()") < stopLifecycleBody.indexOf("if (!active) return"), "Leaving combat must clear stale session UI even when stop() is called after combat is already inactive.");
assert.ok(combat.includes("countdownEndsAt") && combat.includes("COMBAT STARTS IN"), "Two-second combat countdown is missing.");
assert.ok(combat.includes('resetRound({countdown:true})') || combat.includes('resetRound({ countdown: true })'), "Combat and restart must enter the countdown state before AI becomes active.");
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

// v0.13.71: authoritative co-op enemies, smoothed allies, distance-aware ally tags/outlines, and animated glass coverage.
assert.ok(combat.includes("exportEnemySyncState") && combat.includes("applyHostEnemySyncState") && combat.includes("coopFollower"), "Co-op clients must share the host enemy state instead of simulating separate enemies.");
assert.ok(combat.includes('if (!multiplayer?.isHost?.()) return;') && combat.includes('event.type === "enemy-hit"'), "Only the co-op host may authoritatively apply remote enemy-hit events.");
assert.ok(multiplayer.includes("REMOTE_STATE_INTERVAL_MS") && multiplayer.includes("setInterval(heartbeat, REMOTE_STATE_INTERVAL_MS)"), "Multiplayer heartbeat cadence must be explicit and tuned for responsive movement.");
assert.ok(plant.includes("smoothRemotePlayerState") && plant.includes("remotePlayerVisuals"), "Remote player movement must interpolate/extrapolate network snapshots instead of teleporting between them.");
assert.ok(plant.includes("allyOutline") && plant.includes("ALLY_OUTLINE_DISTANCE") && plant.includes("ALLY_LABEL_FADE_DISTANCE"), "Co-op allies need distance-aware name tags that transition into a blue outline.");
const remoteLabelStart = plant.indexOf("function drawCombatRemotePlayerLabels(time)");
const remoteLabelEnd = plant.indexOf("function drawCombatWorldEffects", remoteLabelStart);
const remoteLabelBody = plant.slice(remoteLabelStart, remoteLabelEnd);
assert.ok(remoteLabelStart >= 0 && remoteLabelBody.includes("const allyDistance=remotePlayerDistance(playerState);"), "Remote ally labels must compute their own distance before applying scale/fade rules.");
const remotePlayerStart = plant.indexOf("function drawCombatRemotePlayers(time)");
const remotePlayerEnd = plant.indexOf("function drawCombatRemotePlayerLabels(time)", remotePlayerStart);
const remotePlayerBody = plant.slice(remotePlayerStart, remotePlayerEnd);
assert.ok(remotePlayerStart >= 0 && remotePlayerBody.includes("allyOutline") && !remotePlayerBody.includes("allyDistance >= ALLY_LABEL_HIDE_DISTANCE"), "Far co-op allies must stay rendered as a blue outline after their name tag fades away.");
assert.ok(plant.includes("visibleDesignComponents(design, time).flatMap") && plant.includes("combatGlassOccluders(machine, time"), "Combat glass hitboxes must follow nested animated design geometry at the current animation frame.");
assert.ok(combat.includes('sendEvent?.("glass-shatter"') && combat.includes('event.type === "glass-shatter"'), "Co-op glass destruction must be broadcast so both players see the same shattered panes.");
console.log("Owner-only combat mode checks passed.");

const controlsStart = plant.indexOf('controls.innerHTML =');
const controlsEnd = plant.indexOf('frame.appendChild(controls)', controlsStart);
const controlsMarkup = plant.slice(controlsStart, controlsEnd);
assert.ok(controlsMarkup.indexOf('data-toggle="walk"') >= 0, "First person control is missing.");
assert.ok(controlsMarkup.indexOf('data-toggle="combat"') > controlsMarkup.indexOf('data-toggle="walk"'), "Combat mode must render immediately after First person for owners.");
assert.ok(plant.includes('window.requestAnimationFrame(() => {') && plant.includes('combatController.start(mode);'), "Combat should enter first person before starting the countdown.");
assert.ok(plant.includes('setWalkMode(true, { capture: false })'), "Combat/Zombie setup must enter first person without capturing the mouse.");
assert.ok(plant.includes('const capturePointer = options.capture !== false;') && plant.includes('if (capturePointer && !touchWalk) firstPersonController?.capture();'), "First-person startup must honor capture:false so the setup cursor stays free until Start Match.");
// v0.13.70: selectable player weapons, multiplayer identity labels/character hiding, death weapon/blood, and shared glass destruction.
assert.ok(combat.includes('data-match-weapon="rifle"') && combat.includes('data-match-weapon="sniper"') && combat.includes('data-match-weapon="shotgun"') && combat.includes('data-match-weapon="rocket"') && combat.includes('data-match-weapon="chainsaw"'), "Match setup must offer Rifle, Sniper, Shotgun, Rocket Launcher, and Chainsaw.");
assert.ok(combat.includes("selectedPrimaryWeapon") && combat.includes("function playerLoadout()"), "Chosen setup weapon must drive the player's primary loadout.");
assert.ok(combat.includes("sniper: Object.freeze") && combat.includes("rocket: Object.freeze") && combat.includes("chainsaw: Object.freeze"), "Player weapon catalog is missing sniper, rocket launcher, or chainsaw behavior.");
assert.ok(plant.includes("drawCombatRemotePlayerLabels") && plant.includes("player.name") && plant.includes("characterName"), "Remote multiplayer players must show player-name and selected-character name tags.");
assert.ok(plant.includes("isCharacterOccupied") && combat.includes("isCharacterOccupied:"), "Selected multiplayer characters must be hidden from their original plant positions during combat.");
assert.ok(combat.includes("Killed with") && combat.includes("event.payload?.weapon"), "Death screen must report the weapon that eliminated the player, including private-match kills.");
assert.ok(css.includes(".combat-death-blood") && combat.includes("combat-player-dead"), "Player death needs a persistent bloody screen treatment.");
assert.ok(combat.includes("nearestOpaqueObstacleDistance") && combat.includes("AI GLASS"), "Enemy AI shots must be able to break machine glass instead of treating it as an opaque sight wall.");
assert.ok(plant.includes('["box", "glassPanel"].includes(component.type)') && plant.includes("combatGlassComponent(component)"), "Glass-panel design components must participate in destructible machine glass.");

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
assert.ok(combat.includes("sightRange: 165") && combat.includes("moveSpeed: 2.8") && combat.includes("6.2 * enemy.speedBias * loadout.moveSpeed") && combat.includes("4.45 : 3.15"), "Chainsaw enemies must detect farther and sustain a much faster rush/pursuit profile.");
assert.ok(combat.includes("triggerCombatRoll") && combat.includes("rollStartedAt") && plant.includes("rollProgress") && plant.includes("rotationZ"), "Enemy combat-roll behavior/animation is missing.");
assert.ok(plant.includes("large protruding eyes") && plant.includes("#f5f6f2"), "Combat people must retain visible eyes.");
assert.ok(css.includes("combat-holo-sight") && css.includes("combat-holo-glass") && !css.includes("border-radius:50%;\n  border:clamp(3px,.4vw,6px)"), "Rifle ADS must use a holographic sight instead of the old circular scope.");
assert.ok(combat.includes("function playerMuzzleOrigin") && combat.includes("rightOffset"), "Player tracer muzzle must originate at the rendered gun and follow ADS/hip-fire position.");
assert.ok(css.includes("combat-hitmarker.visible i") && css.includes("#ff4e55"), "Person hits must use a red hit marker instead of bullet-hole decals.");

// v0.13.59: celebratory victory, touch combat, corrected combat eyes, and loadout-specific 3D weapons.
assert.ok(combat.includes('"FLOOR RECLAIMED" : "PLANT SECURED"') && combat.includes('"ZOMBIE PLANT CLEARED" : "VICTORY"') && combat.includes("victoryTime"), "Victory screen must present a celebratory PLANT SECURED state with round stats.");
assert.ok(css.includes(".combat-round-overlay.victory") && css.includes(".combat-victory-confetti") && css.includes("@keyframes combat-confetti-fall"), "Victory screen celebratory animation styling is missing.");
assert.ok(plant.includes('data-touch-combat="fire"') && plant.includes('data-touch-combat="aim"') && plant.includes('data-touch-combat="reload"') && plant.includes('data-touch-combat="swap"'), "Mobile Combat Mode action controls are missing.");
assert.ok(plant.includes("navigator.maxTouchPoints") && combat.includes("setTriggerHeld") && combat.includes("setAiming: (enabled)"), "Touch players must be combat-engaged without desktop pointer lock and expose fire/aim APIs.");
assert.ok(css.includes(".combat-mode-active .touch-combat-actions") && css.includes(".touch-combat-fire"), "Mobile Combat Mode controls are not styled for touch screens.");
assert.ok(plant.includes("const eyeY=height*.835") && plant.includes("const eyeZ=depth*.285") && plant.includes("eyeWidth*.38"), "Combat eyes must be above the mouth on the upper head rather than the neck.");
assert.ok(plant.includes("Large shoulder-fired launcher built from multiple 3D collars") && plant.includes("weaponMuzzleZ=-3.30"), "Enemy Rocket Launcher must render as a layered shoulder-fired 3D weapon.");
assert.ok(plant.includes("Full 3D service rifle") && plant.includes('enemyWeapon === "sniper"') && plant.includes('enemyWeapon === "chainsaw"'), "AI rifle, sniper, and chainsaw models must have distinct detailed right-hand 3D geometry.");
// v0.13.61: shared envelopes, reliable owner Combat entry, stronger weapon placement, and deterministic deaths.
const sharedWorkspace = fs.readFileSync(new URL("../public/shared-workspace.js", import.meta.url), "utf8");
const sharedWorkspaceRoute = fs.readFileSync(new URL("../app/api/shared-workspace/route.ts", import.meta.url), "utf8");
assert.ok(page.includes('/shared-workspace.js'), "Plant page must hydrate the shared cross-device workspace before the renderer boots.");
assert.ok(sharedWorkspace.includes("monroe-glass-machine-designs-v1") && sharedWorkspace.includes("monroe-glass-plant-layout-v6") && sharedWorkspace.includes("schedulePublish"), "Shared workspace must sync both design envelopes and layout data across devices.");
assert.ok(sharedWorkspaceRoute.includes("PLANT_WORKSPACE_PATH") && sharedWorkspaceRoute.includes("writeFile") && sharedWorkspaceRoute.includes("ownerSessionValid"), "Shared workspace API must persist owner changes on durable server storage.");
assert.ok(plant.includes('data-toggle="combat" class="combat-mode-button"') && plant.includes("syncCombatAvailability") && plant.includes("plantowneraccesschange"), "Desktop owner Combat button must stay in the toolbar and resync owner visibility after startup.");
assert.ok(plant.includes("const weaponCenterX = width*.72") && plant.includes("Both arms reach a real right-hand weapon"), "Enemy weapons must stay in a readable right-hand pose instead of centered through the torso.");
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
assert.ok(combat.includes('zombie: Object.freeze') && combat.includes('defaultWeapon: "shotgun"') && combat.includes("PLAYER_PRIMARY_WEAPONS") && combat.includes('carriedWeapons.length ? carriedWeapons'), "Zombie Mode must retain the shotgun option and support the selected starting loadout and acquired weapons.");
assert.ok(combat.includes('record.weaponKey = record.zombie ? "chainsaw"') && combat.includes('1.55 * zombieDifficultyConfig().speed') && combat.includes('combatDifficultyConfig().speed'), "Zombie AI must be chainsaw-only while Combat and Zombie movement are difficulty-scaled independently.");
assert.ok(plant.includes('headCandidates') && plant.includes('drawDesignBox(actor,{...headPart,color:skin}') && plant.includes('const eyeWhite = zombie ? "#f7e76f"'), "Zombie face/eye overlays must anchor to the actual custom-person Head component.");
assert.ok(combat.includes('function enemyHitVolumes') && combat.includes('zone: "head"') && combat.includes('zone: "body"') && combat.includes('HEADSHOT_DAMAGE_MULTIPLIER = 3'), "Combat hit detection must have separate head/body volumes and real headshot damage.");
assert.ok(combat.includes('headshotKills += 1') && combat.includes('regularKills += 1') && combat.includes('data-combat-headshot-kills') && combat.includes('data-combat-regular-kills'), "Regular-kill and headshot-kill statistics must be tracked separately.");
assert.ok(combat.includes('HIGH_SCORE_STORAGE_KEY') && combat.includes('recordRoundTime') && combat.includes('bestClearTime') && combat.includes('zombieScoreKey'), "Combat and Zombie Mode clear/survival times must persist independently as high scores.");
assert.ok(combat.includes('function playerMuzzleOrigin') && combat.includes('const ads = Boolean(weapon?.scope && isAiming)') && combat.includes('const rightOffset'), "Player tracers must follow the rendered gun muzzle in hip-fire and scoped ADS.");
assert.ok(plant.includes('Hip fire keeps the physical holographic sight on the rifle model') && plant.includes('drawViewmodelPolygon(glassLocal') && plant.includes('reticleRadius'), "The player rifle must keep its holographic glass and reticle on the 3D model outside ADS.");
assert.ok(css.includes('.combat-restart-button') && css.includes('.combat-restart-icon') && css.includes('.combat-restart-copy'), "Victory/death restart control must use the polished replay button presentation.");


// v0.13.65: continuous survival spawns, ammo pickups, real zombie heads, crane envelopes, and machine-safe death falls.
assert.ok(combat.includes("function updateZombieSpawns") && combat.includes("spawnZombie(now,giant)") && combat.includes("zombieAliveCap()"), "Endless Zombie Mode must spawn counted waves of zombies from map edges.");
assert.ok(combat.includes("function resetAmmoPickups") && combat.includes("function updateAmmoPickups") && combat.includes("AMMO_PICKUP_RESPAWN_MS = 18000"), "Survival mode must provide respawning ammo pickups around the layout.");
assert.ok(combat.includes('survivalScore ? Math.max(...scores) : Math.min(...scores)') && combat.includes("recordRoundTime(survivalSeconds)"), "Zombie Endless high score must track longest survival while Normal tracks fastest clear.");
assert.ok(plant.includes("drawDesignBox(actor,{...headPart,color:skin}") && plant.includes("large protruding eyes"), "Zombie visuals must repaint the actual Head geometry and show visible eyes.");
assert.ok(combat.includes("deathPushX") && combat.includes("deathPushZ") && plant.includes("deathPushX * eased"), "Death falls near machines must include obstacle-aware corpse drift.");
assert.ok(plant.includes('["bridgeCrane", "craneMachine"].includes(machine.type)') && plant.includes("designCollisionEnvelopes(design).length"), "Authored crane pillar envelopes must become real collision while envelope-free cranes remain pass-through.");
assert.ok(css.includes(".combat-exit-button") && css.includes(".combat-exit-copy"), "Exit Mode must receive the same polished end-screen control treatment as Restart.");

assert.ok(combat.includes("function cleanupZombieCorpses") && combat.includes("now - enemy.defeatedAt > 5200"), "Spawned zombie corpses must retire after their fall so survival mode does not accumulate actors forever.");
assert.ok(plant.includes("service gap between the tables") && plant.includes("component?.type === \"box\""), "Cutting-line fallback collision must use its separate table/console geometry instead of one oversized footprint.");


// v0.13.66: Zombie difficulty, Normal vs Endless runs, and corrected camera-relative damage indicators.
assert.ok(combat.includes("ZOMBIE_DIFFICULTIES") && combat.includes('nightmare: Object.freeze') && combat.includes('data-match-difficulty="nightmare"'), "Zombie Mode must provide Easy, Normal, Hard, and Nightmare difficulty options.");
assert.ok(combat.includes("ZOMBIE_RUN_TYPES") && combat.includes('data-zombie-run="normal"') && combat.includes('data-zombie-run="endless"'), "Zombie Mode must offer Normal plant-clear and Endless survival run types.");
assert.ok(combat.includes('function canRespawnAfterDeath()') && combat.includes('zombieRunType === "normal"') && combat.includes('!zombieEndless()'), "Normal Zombie Mode must allow respawns while Endless Zombie preserves permanent deaths.");
assert.ok(combat.includes('100 * activeDifficultyConfig().health') && combat.includes('activeDifficultyConfig().damage') && combat.includes('zombieDifficultyConfig().spawnRate') && combat.includes('zombieDifficultyConfig().aliveCap'), "Zombie difficulty must affect health, damage, speed/spawn pressure, and alive cap.");
assert.ok(combat.includes('let relative = number(player.yaw) - worldAngle') && combat.includes('First-person rendering mirrors horizontal world X'), "Incoming-fire indicators must use the mirrored first-person camera basis so left/right are not reversed.");
assert.ok(css.includes('.combat-zombie-setup') && css.includes('pointer-events: auto') && css.includes('.combat-zombie-choice-grid') && css.includes('.combat-zombie-setup-actions'), "The shared combat setup must be clickable and visually polished.");


// v0.13.67: shared setup, Combat difficulty, actual head volumes, breakable glass, character selection, and password-gated multiplayer lobby.
assert.ok(combat.includes("COMBAT_DIFFICULTIES") && combat.includes("combatDifficultyConfig") && combat.includes("fireRate") && combat.includes("accuracy"), "Combat Mode must have Easy/Normal/Hard/Nightmare difficulty scaling for enemy health, speed, damage, accuracy and fire rate.");
assert.ok(combat.includes('nightmare: Object.freeze({ key:"nightmare", label:"Nightmare", health:1.58, speed:1') && combat.includes('normal: Object.freeze({ key:"normal", label:"Normal", health:1, speed:.72'), "Nightmare must preserve the prior full zombie speed while lower difficulties reduce it.");
assert.ok(combat.includes("data-match-setup") && combat.includes("data-match-difficulty") && combat.includes("data-character-options") && combat.includes("data-match-type"), "Combat and Zombie Mode must share a working pre-match setup with difficulty, character and match type controls.");
assert.ok(combat.includes("function availableCharacters") && combat.includes("selectedCharacterId") && combat.includes("excludedCharacters"), "Players must be able to select a plant person and selected characters must be removed from the AI pool.");
assert.ok(combat.includes("getEnemyHeadVolume") && plant.includes("function combatHeadVolume") && plant.includes('/^head$/i') && combat.includes("Stop the body volume below the neck"), "Headshots must follow the actual rendered Head component instead of the neck/body overlap.");
assert.ok(plant.includes("combatGlassOccluders") && combat.includes("pushGlassShatter") && combat.includes("glassShards") && plant.includes("isGlassShattered"), "Shooting machine glass must create shatter/explosion effects and remove broken glass from rendering/collision.");
assert.ok(page.includes('/combat-multiplayer.js') && multiplayer.includes("createCombatMultiplayer") && multiplayer.includes("setInterval(heartbeat, REMOTE_STATE_INTERVAL_MS)"), "The plant must load the multiplayer lobby client and synchronize player state continuously.");
assert.ok(lobbyRoute.includes("Owner password session required") && lobbyRoute.includes('action === "create"') && lobbyRoute.includes('action === "join"') && lobbyRoute.includes('action === "event"'), "Multiplayer lobbies must require the owner-password server session and support create/join/game events.");
assert.ok(combat.includes('data-match-type="private"') && combat.includes('data-match-type="coop"') && combat.includes('player-hit') && combat.includes('enemy-hit'), "Lobby setup must support Private Match plus shared Combat/Zombie co-op hit events.");
assert.ok(plant.includes("drawCombatRemotePlayers") && combat.includes("remotePlayers"), "Remote lobby players must render as their selected plant characters on the layout.");

// v0.13.78: mystery prize stages, conditional pickup, and obstacle-aware routing.
assert.ok(combat.includes("MYSTERY_ROLL_DURATION_MS = 4800") && combat.includes("MYSTERY_REEL_STEPS = 35") && combat.includes("Math.pow(1 - progress, 2.3)"), "Mystery box reel should visibly spin and decelerate before landing on its prize.");
assert.ok(combat.includes('phase === "rolling" ? MYSTERY_WEAPON_POOL[index] : offer.prizeKey') && combat.includes("MYSTERY_RISE_DURATION_MS = 1750"), "The displayed reel must stop on the gun that rises from the box.");
assert.ok(combat.includes("MYSTERY_CLAIM_WINDOW_MS = 11500") && combat.includes("MYSTERY_LOWER_DURATION_MS = 2300") && combat.includes("now >= mysteryOffer.despawnAt"), "Unclaimed guns must visibly lower, despawn, and release the box for a new spin.");
assert.ok(combat.includes('if (phase === "ready") return claimMysteryWeapon();') && combat.includes('mysteryOffer = null;') && combat.includes("playerPoints -= cost"), "Paying must start the reel; a separate E claim grants the gun without a second charge.");
assert.ok(combat.includes("mysteryOffer=null;healthStation=null;nearestStation=null") && combat.includes('"rollEndsAt","riseEndsAt","lowerStartsAt","despawnAt"'), "Restart/exit must reset prizes, and pause must freeze active mystery timers.");
assert.ok(plant.includes("const width=health?3.1:5.4") && plant.includes("const offer=station.offer") && plant.includes("weaponY=2.92+raise*2.65+bob"), "The physically wider 3D box must animate a prize above its lid.");
assert.ok(css.includes(".combat-station-prompt.mystery-ready") && css.includes(".combat-station-prompt.mystery-rolling"), "Take-weapon and spinning states need distinct HUD feedback.");
assert.ok(combat.includes("function navigationRoute(") && combat.includes("function navigationStraight(") && combat.includes("NAV_ROUTE_MAX_EXPANSIONS") && combat.includes("NAV_REBUILDS_PER_FRAME"), "Enemies must navigate physical envelopes using capped, cached waypoint routing.");
assert.ok(combat.includes("navigateEnemy(enemy,center,playerTarget,now)") && combat.includes("enemy.navBlockedFrames"), "Combat and Zombie pursuit must use detours when straight pursuit is obstructed.");
assert.ok(plant.includes("combatController?.isEndlessZombie?.() ? [] : combatBaseEnemyMachines()") && plant.includes("!machine.combatSpawned"), "Endless mode must suppress standing plant people while retaining synthetic zombies.");
assert.ok(combat.includes('isEndlessZombie: () => active && zombieEndless()'), "The renderer must read the active Endless state, not a stale setup selection.");

// v0.13.77: waves, points, special enemies, stations, weapons, and cinematic respawn choice.
assert.ok(combat.includes('roundState="respawn-choice"') && combat.includes("function resumePlayerAfterDeath") && combat.includes('roundState==="respawn-choice"'), "Respawn must wait for a full cinematic and an explicit player choice.");
assert.ok(combat.includes('playerDeathDuration=RESPAWN_DELAY_MS') && combat.includes("RESPAWN_DELAY_MS = 5000") && combat.includes('Killed by '), "The full five-second who-killed-you replay must play before the choice.");
assert.ok(combat.includes('zombieWave%5===0') && combat.includes("beginZombieWave") && combat.includes("waveDefeated>=waveTotal"), "Endless mode must progress through counted waves with special rounds.");
assert.ok(combat.includes('spawnZombie(now,giant)') && combat.includes('record.health*=Math.min') && combat.includes('giant ? 7 : 1'), "Later special rounds must spawn and scale giant zombies.");
assert.ok(combat.includes('MYSTERY_BOX_COST = 950') && combat.includes('HEALTH_STATION_COST = 800') && combat.includes('playerPoints-=cost'), "Purchases must deduct mystery box and health-station costs from points.");
assert.ok(combat.includes('headshot?150:100') && combat.includes('waveSpecial?2:1'), "Headshots and special-wave kills must award bonus points.");
assert.ok(combat.includes("MAX_CARRIED_WEAPONS = 3") && combat.includes("MYSTERY_WEAPON_POOL") && combat.includes("data-combat-inventory"), "Random mystery weapons and three carried slots must be supported.");
assert.ok(combat.includes("combat-team-panel") && combat.includes("teamPanel") && lobbyRoute.includes("points:"), "All multiplayer survivors must have visible synchronized points.");
assert.ok(combat.includes("healthStation=findStationPosition") && combat.includes("lastHealthPurchaseWave") && plant.includes("effects.stations"), "The health station must appear on special waves, with per-player purchase tracking and world rendering.");
assert.ok(plant.includes("const eyeY=height*.835") && plant.includes("const eyeZ=depth*.285"), "Enemy eyes must be placed on the upper face rather than neck height.");
assert.ok(css.includes(".combat-wave-progress") && css.includes(".combat-station-prompt") && css.includes(".combat-weapon-inventory"), "Survival HUD, interactions and inventory must have responsive styling.");

// v0.13.76: host-coordinated replay, collision ordering and rack/truck geometry.
assert.ok(combat.includes('sendEvent("round-restart"') && combat.includes('event.type === "round-restart"'), "Co-op replay must broadcast to all players.");
assert.ok(combat.includes("The host restarts the entire team") && combat.includes("if (!multiplayer.isHost?.()) return;"), "Co-op clients must wait for the host replay.");
assert.ok(combat.includes('event.senderId !== lobby.hostId') && lobbyRoute.includes('["coop-victory", "round-restart"].includes(type)'), "Only the host may send victory/restart events.");
assert.ok(combat.includes('hitObstacle?.kind === "machine" && hitObstacle.machineId') && plant.includes('machineId:String(machine.instanceId || machine.id || machine.name || "machine")'), "Coarse machine hulls must not absorb shots targeting glass panes.");
assert.ok(plant.includes('box(localBox3d(machine,1,.9,Math.max(.5,machine.w-2)') && plant.includes('box(localBox3d(machine,1,machine.d-Math.max(.3,machine.d*.12)-.9'), "A-frame glass must use correct geometry on both faces.");
assert.ok(plant.includes('box:localBox3d(machine,Math.min(offset,machine.w-1),1,.55'), "Rack glass hitboxes must align to visible panes.");

// v0.13.68: combat lobby authorization must be backed by the signed owner cookie only.
assert.ok(lobbyRoute.includes('SESSION_COOKIE = "monroe-glass-owner-server-v1"') && lobbyRoute.includes('timingSafeEqual') && lobbyRoute.includes('Owner password session required.'), "Combat multiplayer must validate the signed owner-password session cookie server-side.");
assert.ok(!lobbyRoute.includes('x-monroe-owner-session') && !lobbyRoute.includes('clientOwner && sameOrigin'), "Combat lobby authorization must not trust a client-supplied owner marker.");

