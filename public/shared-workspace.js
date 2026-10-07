(() => {
  "use strict";

  const WORKSPACE_KEYS = [
    "monroe-glass-machine-designs-v1",
    "monroe-glass-plant-layout-v6",
  ];
  const API_PATH = "/api/shared-workspace";
  const SYNC_STATE_KEY = "monroe-glass-shared-workspace-sync-v1";
  let publishTimer = 0;
  let inFlight = null;
  let lastRemoteRevision = 0;

  function parseTimestamp(value) {
    const timestamp = Date.parse(String(value || ""));
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function itemUpdatedAt(storedValue) {
    try { return parseTimestamp(JSON.parse(storedValue || "null")?.updatedAt); }
    catch { return 0; }
  }

  function localRevision() {
    let newest = 0;
    for (const key of WORKSPACE_KEYS) newest = Math.max(newest, itemUpdatedAt(localStorage.getItem(key)));
    return newest;
  }

  function localItems() {
    const items = {};
    for (const key of WORKSPACE_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) items[key] = value;
    }
    return items;
  }

  function localPayload() {
    const transfer = window.PLANT_WORKSPACE_TRANSFER;
    const payload = transfer?.createPayload
      ? transfer.createPayload(localStorage, { appVersion: window.PLANT_APP_VERSION || "0.13.72", sourceOrigin: window.location.origin })
      : { kind: "monroe-glass-plant-workspace", version: 1, appVersion: "0.13.72", exportedAt: new Date().toISOString(), sourceOrigin: window.location.origin, items: localItems() };
    payload.items = Object.fromEntries(Object.entries(payload.items || {}).filter(([key]) => WORKSPACE_KEYS.includes(key)));
    payload.sourceUpdatedAt = localRevision() ? new Date(localRevision()).toISOString() : "";
    return payload;
  }

  function remoteRevision(workspace) {
    return Math.max(
      parseTimestamp(workspace?.payload?.sourceUpdatedAt),
      ...Object.values(workspace?.payload?.items || {}).map(itemUpdatedAt),
    );
  }

  function itemsDiffer(remoteItems) {
    return WORKSPACE_KEYS.some((key) => typeof remoteItems?.[key] === "string" && remoteItems[key] !== localStorage.getItem(key));
  }

  function applyRemote(workspace) {
    const payload = workspace?.payload;
    if (!payload?.items || !itemsDiffer(payload.items)) return false;
    const previous = {};
    try {
      for (const key of WORKSPACE_KEYS) {
        const incoming = payload.items[key];
        if (typeof incoming !== "string") continue;
        const current = localStorage.getItem(key);
        if (current !== null && current !== incoming) previous[key] = current;
        localStorage.setItem(key, incoming);
      }
      if (Object.keys(previous).length) {
        localStorage.setItem("monroe-glass-recovery-before-shared-sync-v1", JSON.stringify({ capturedAt: new Date().toISOString(), items: previous }));
      }
      localStorage.setItem(SYNC_STATE_KEY, JSON.stringify({ syncedAt: new Date().toISOString(), remoteUpdatedAt: workspace.updatedAt || null }));
      try { window.dispatchEvent(new CustomEvent("plantsharedworkspaceapplied", { detail: { workspace } })); } catch {}
      return true;
    } catch (error) {
      console.warn("Shared plant workspace could not be applied.", error);
      return false;
    }
  }

  async function getRemote() {
    const response = await fetch(API_PATH, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error(`Shared workspace request failed (${response.status}).`);
    return (await response.json())?.workspace || null;
  }

  async function publishNow() {
    if (window.monroeEditorAccess?.isOwner?.() !== true) return null;
    const payload = localPayload();
    if (!Object.keys(payload.items || {}).length) return null;
    const response = await fetch(API_PATH, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-monroe-owner-session": "granted" },
      body: JSON.stringify({ payload }),
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(`Shared workspace publish failed (${response.status}).`);
    const workspace = (await response.json())?.workspace || null;
    lastRemoteRevision = Math.max(lastRemoteRevision, remoteRevision(workspace));
    return workspace;
  }

  async function syncNow() {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      let remote = null;
      try { remote = await getRemote(); }
      catch (error) {
        console.warn("Shared plant workspace is unavailable; using this browser's saved workspace.", error);
        return { source: "local", applied: false };
      }

      const owner = window.monroeEditorAccess?.isOwner?.() === true;
      const localRev = localRevision();
      const remoteRev = remoteRevision(remote);
      lastRemoteRevision = remoteRev;

      if (!remote?.payload?.items) {
        if (owner) {
          try { await publishNow(); return { source: "local-published", applied: false }; }
          catch (error) { console.warn("Initial shared workspace publish failed.", error); }
        }
        return { source: "local", applied: false };
      }

      if (owner && localRev > remoteRev + 1000) {
        try { await publishNow(); return { source: "local-published", applied: false }; }
        catch (error) { console.warn("Newer owner workspace could not be published.", error); }
      }

      const protectedEditor = window.monroeEditorAccess?.hasEditorProfile?.() === true;
      if (!protectedEditor || remoteRev >= localRev || owner) {
        return { source: "remote", applied: applyRemote(remote) };
      }
      return { source: "local-newer", applied: false };
    })().finally(() => { inFlight = null; });
    return inFlight;
  }

  function schedulePublish(delay = 550) {
    if (window.monroeEditorAccess?.isOwner?.() !== true) return;
    if (publishTimer) window.clearTimeout(publishTimer);
    publishTimer = window.setTimeout(() => {
      publishTimer = 0;
      publishNow().catch((error) => console.warn("Shared workspace auto-publish failed.", error));
    }, Math.max(80, Number(delay) || 550));
  }

  const ready = syncNow();
  window.PLANT_SHARED_WORKSPACE_READY = ready;
  window.PLANT_SHARED_WORKSPACE = Object.freeze({ ready, syncNow, schedulePublish, publishNow, localRevision: () => localRevision(), remoteRevision: () => lastRemoteRevision });
})();