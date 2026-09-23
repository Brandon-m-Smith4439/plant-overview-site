import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const preview = fs.readFileSync(new URL("../public/preview.html", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const transferSource = fs.readFileSync(new URL("../public/workspace-transfer.js", import.meta.url), "utf8");
const publishedSource = fs.readFileSync(new URL("../public/published-workspace.js", import.meta.url), "utf8");

assert.ok(page.indexOf('"/published-workspace.js"') > page.indexOf('"/workspace-transfer.js"'));
assert.ok(preview.indexOf('src="published-workspace.js"') > preview.indexOf('src="workspace-transfer.js"'));
assert.match(plant, /applyPublishedWorkspace\(\);/);
assert.doesNotMatch(plant, /hostname\.endsWith\("\.chatgpt\.site"\)/);
assert.match(plant, /editingAllowed\?\.\(\) !== false/);
assert.match(publishedSource, /const hostedReadOnly = !\["127\.0\.0\.1", "localhost", "::1"\]\.includes\(window\.location\.hostname\)/);
assert.match(publishedSource, /monroeEditorAccess\?\.editingAllowed\?\.\(\) === false/);

const sandbox = { window: { location: { hostname: "localhost" } } };
vm.createContext(sandbox);
vm.runInContext(transferSource, sandbox);
vm.runInContext(publishedSource, sandbox);

const snapshot = sandbox.window.PLANT_PUBLISHED_WORKSPACE;
assert.equal(snapshot.kind, "monroe-glass-plant-workspace");
assert.deepEqual(
  Object.keys(snapshot.items).sort(),
  ["monroe-glass-machine-designs-v1", "monroe-glass-plant-layout-v6"],
);

const designs = JSON.parse(snapshot.items["monroe-glass-machine-designs-v1"]);
const layout = JSON.parse(snapshot.items["monroe-glass-plant-layout-v6"]);
assert.equal(designs.version, 17);
assert.equal(Object.keys(designs.designs).length, 42);
assert.equal(layout.version, 6);
assert.equal(layout.machines.length, 98);

const values = new Map();
const storage = {
  get length() { return values.size; },
  key(index) { return [...values.keys()][index] ?? null; },
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); },
};
const applied = sandbox.window.PLANT_WORKSPACE_TRANSFER.applyPayload(storage, snapshot);
assert.deepEqual([...applied.appliedKeys].sort(), Object.keys(snapshot.items).sort());
assert.equal(JSON.parse(storage.getItem("monroe-glass-plant-layout-v6")).machines.length, 98);
assert.equal(Object.keys(JSON.parse(storage.getItem("monroe-glass-machine-designs-v1")).designs).length, 42);

const hostedValues = new Map();
const hostedSandbox = {
  window: {
    location: { hostname: "monroe-glass-plant-evolution-production.up.railway.app" },
    monroeEditorAccess: { editingAllowed: () => false },
    localStorage: {
      setItem(key, value) { hostedValues.set(key, String(value)); },
    },
  },
  console,
};
vm.createContext(hostedSandbox);
vm.runInContext(publishedSource, hostedSandbox);
assert.equal(JSON.parse(hostedValues.get("monroe-glass-plant-layout-v6")).machines.length, 98);
assert.equal(Object.keys(JSON.parse(hostedValues.get("monroe-glass-machine-designs-v1")).designs).length, 42);

console.log("Published workspace validation passed.");
