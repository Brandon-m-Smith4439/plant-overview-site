(function () {
  "use strict";

  const WORKSPACE_KIND = "monroe-glass-plant-workspace";
  const WORKSPACE_VERSION = 1;
  const STORAGE_PREFIX = "monroe-glass-";

  function workspaceItems(storage) {
    const items = {};
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      const value = storage.getItem(key);
      if (value !== null) items[key] = value;
    }
    return items;
  }

  function createPayload(storage, metadata = {}) {
    return {
      kind: WORKSPACE_KIND,
      version: WORKSPACE_VERSION,
      appVersion: String(metadata.appVersion || "unknown"),
      exportedAt: new Date().toISOString(),
      sourceOrigin: String(metadata.sourceOrigin || "unknown"),
      items: workspaceItems(storage),
    };
  }

  function validatePayload(value) {
    const payload = typeof value === "string" ? JSON.parse(value) : value;
    if (!payload || payload.kind !== WORKSPACE_KIND || payload.version !== WORKSPACE_VERSION) {
      throw new Error("The selected file is not a Monroe Glass Plant workspace export.");
    }
    if (!payload.items || typeof payload.items !== "object" || Array.isArray(payload.items)) {
      throw new Error("The workspace export does not contain saved data.");
    }

    const items = {};
    for (const [key, storedValue] of Object.entries(payload.items)) {
      if (!key.startsWith(STORAGE_PREFIX) || typeof storedValue !== "string") continue;
      items[key] = storedValue;
    }
    if (!Object.keys(items).length) {
      throw new Error("No Monroe Glass Plant saved data was found in the workspace export.");
    }
    return { ...payload, items };
  }

  function applyPayload(storage, value) {
    const payload = validatePayload(value);
    const previous = new Map();
    const appliedKeys = [];

    try {
      for (const [key, storedValue] of Object.entries(payload.items)) {
        previous.set(key, storage.getItem(key));
        storage.setItem(key, storedValue);
        appliedKeys.push(key);
      }
    } catch (error) {
      for (const key of appliedKeys.reverse()) {
        const oldValue = previous.get(key);
        if (oldValue === null || oldValue === undefined) storage.removeItem(key);
        else storage.setItem(key, oldValue);
      }
      throw error;
    }

    return { payload, appliedKeys };
  }

  window.PLANT_WORKSPACE_TRANSFER = Object.freeze({
    WORKSPACE_KIND,
    WORKSPACE_VERSION,
    STORAGE_PREFIX,
    workspaceItems,
    createPayload,
    validatePayload,
    applyPayload,
  });
})();
