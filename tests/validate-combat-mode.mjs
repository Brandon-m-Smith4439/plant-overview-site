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
assert.ok(combat.includes("roundState") && combat.includes("Restart combat"), "Win/defeat restart flow is missing.");
assert.ok(combat.includes("countdownEndsAt") && combat.includes("COMBAT STARTS IN"), "Two-second combat countdown is missing.");
assert.ok(combat.includes('resetRound({ countdown: true })'), "Combat and restart must enter the countdown state before AI becomes active.");
assert.ok(combat.includes('roundState !== "playing"'), "Weapons and enemy damage must stay locked until the countdown ends.");
assert.ok(access.includes("isOwner"), "Browser editor access must expose owner-session status.");
assert.ok(plant.includes('dataset.toggle = "combat"') || plant.includes('data-toggle="combat"'), "Owner-only Combat mode button is missing from the plant controls.");
assert.ok(plant.includes("combatEnemyMachines") && plant.includes("animatedperson"), "Person/team-member machines are not wired as enemy AI.");
assert.ok(plant.includes("combatOccluders"), "Plant geometry is not wired into combat line of sight.");
assert.ok(plant.includes("window.createPlantCombatMode"), "Plant viewer does not create the combat controller.");
assert.ok(page.includes('/plant-combat.js'), "Next plant page does not load the combat controller.");
assert.ok(preview.includes('plant-combat.js'), "Standalone preview does not load the combat controller.");
assert.ok(owner.includes('href="/?owner=combat"'), "Owner dashboard does not expose a Combat Mode launcher.");
assert.ok(css.includes(".combat-hud") && css.includes(".combat-weapon-panel"), "Combat HUD styling is missing.");
assert.ok(css.includes(".combat-mode-active .first-person-hud"), "Normal first-person HUD must get out of the way during combat.");
console.log("Owner-only combat mode checks passed.");

const controlsStart = plant.indexOf('controls.innerHTML =');
const controlsEnd = plant.indexOf('frame.appendChild(controls)', controlsStart);
const controlsMarkup = plant.slice(controlsStart, controlsEnd);
assert.ok(controlsMarkup.indexOf('data-toggle="walk"') >= 0, "First person control is missing.");
assert.ok(controlsMarkup.indexOf('data-toggle="combat"') > controlsMarkup.indexOf('data-toggle="walk"'), "Combat mode must render immediately after First person for owners.");
assert.ok(plant.includes('window.requestAnimationFrame(() => {') && plant.includes('combatController.start();'), "Combat should enter first person before starting the countdown.");
