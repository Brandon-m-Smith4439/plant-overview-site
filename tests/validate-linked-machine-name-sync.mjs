import assert from "node:assert/strict";
import fs from "node:fs";

const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");

const nameSyncStart = studio.indexOf("function syncPlantObjectName(");
const nameSyncEnd = studio.indexOf("function normalizeDesign(", nameSyncStart);
const nameSync = studio.slice(nameSyncStart, nameSyncEnd);
assert.ok(nameSyncStart >= 0 && nameSyncEnd > nameSyncStart, "Linked plant-machine name synchronization is missing.");
assert.match(nameSync, /machine\.useDesignName === false/, "An explicit Plant Layout name must remain an instance-level override.");
assert.match(nameSync, /machine\.name = name;/, "A linked instance must receive the reusable design name.");
assert.match(nameSync, /machine\.short = short;/, "A linked instance label must refresh with the reusable design name.");
assert.match(nameSync, /machine\.useDesignName = true;/, "Legacy linked instances must be migrated to explicit linked naming.");

const linkedSyncStart = studio.indexOf("function syncLinkedMachineToCurrentDesign(");
const linkedSyncEnd = studio.indexOf("if (queryMachine && state.designId)", linkedSyncStart);
const linkedSync = studio.slice(linkedSyncStart, linkedSyncEnd);
assert.match(linkedSync, /machine\.designId !== state\.designId/, "Name propagation must be limited to machines using the renamed design.");
assert.match(linkedSync, /if \(syncName \|\| \(linkedDesignChanged && machine === linkedMachine\)\)/, "Design renames and newly linked machines must refresh their layout names.");
assert.match(linkedSync, /syncPlantObjectName\(machine, design\)/, "Every matching layout instance must use the shared name-sync helper.");

assert.match(studio, /commit\("", \{ syncName: field === "name" \}\)/, "Changing the Machine inspector name must request linked-name propagation.");
assert.match(studio, /syncLinkedMachineToCurrentDesign\(\{ syncName: previousName !== library\[item\.designId\]\.name \}\)/, "Undo and redo must propagate restored machine names.");
assert.match(studio, /useDesignName: !requestedName,[\s\S]*?designId: design\.id/, "Machines created by Designer must follow the design name unless given an explicit plant name.");
assert.match(studio, /machine\.useDesignName = true;[\s\S]*?syncPlantObjectName\(machine, design\);/, "Applying a design must restore linked naming.");

assert.match(plant, /"showLabel", "useDesignName"/, "An open Plant Layout must import linked-name state from the saved layout.");
assert.match(plant, /useDesignName: !requestedName\?\.trim\(\)/, "Plant Layout insertions must distinguish default and custom instance names.");
assert.match(plant, /machine\.short = machine\.name;[\s\S]*?machine\.useDesignName = false;/, "Manually renaming a layout instance must preserve that explicit override.");

console.log("Reusable design name propagation and Plant Layout override checks passed.");
