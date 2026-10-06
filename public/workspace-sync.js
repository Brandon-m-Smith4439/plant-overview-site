(() => {
  "use strict";

  const transfer = window.PLANT_WORKSPACE_TRANSFER;
  const LAYOUT_KEY = "monroe-glass-plant-layout-v6";
  const DESIGN_KEY = window.PLANT_MACHINE_DESIGN_STORAGE_KEY || "monroe-glass-machine-designs-v1";
  const REVISION_KEY = "monroe-glass-workspace-revision-v1";
  const SYNC_EVENT = "plantsharedworkspacesync";
  let pushTimer = 0;
  let pushInFlight = null;

  function parseStored(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
  }

  function timestamp(value) {
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function localRevision() {
    let revision = Number(localStorage.getItem(REVISION_KEY)) || 0;
    const layout = parseStored(LAYOUT_KEY);
    revision = Math.max(revision, timestamp(layout?.updatedAt));
    const library = parseStored(DESIGN_KEY);
    revision = Math.max(revision, timestamp(library?.updatedAt));
    Object.values(library?.designs || {}).forEach((design) => {
      revision = Math.max(revision, timestamp(design?.updatedAt));
    });
    return revision;
  }

  function hasLocalWorkspace() {
    return localStorage.getItem(LAYOUT_KEY) !== null || localStorage.getItem(DESIGN_KEY) !== null;
  }

  function touchRevision(value = Date.now()) {
    const revision = Math.max(Number(value) || 0, Date.now());
    try { localStorage.setItem(REVISION_KEY, String(revision)); } catch {}
    return revision;
  }

  function localPayload() {
    if (!transfer || !hasLocalWorkspace()) return null;
    return transfer.createPayload(localStorage, {
      appVersion: document.documentElement.dataset.plantRelease || "0.13.60",
      sourceOrigin: window.location.origin,
    });
  }

  function dispatch(state, detail = {}) {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { state, ...detail } }));
  }

  async function remoteWorkspace() {
    try {
      const response = await fetch("/api/workspace", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 204) return null;
      if (!response.ok) throw new Error(`Workspace GET failed (${response.status}).`);
      return await response.json();
    } catch (error) {
      console.warn("Shared plant workspace could not be loaded; using browser/published data.", error);
      dispatch("offline");
      return null;
    }
  }

  async function pushNow({ forceRevision = false } = {}) {
    if (!transfer || window.monroeEditorAccess?.hasAccess?.() !== true) return false;
    if (pushInFlight) return pushInFlight;
    const payload = localPayload();
    if (!payload) return false;
    const revision = forceRevision ? touchRevision() : Math.max(1, localRevision() || touchRevision());
    pushInFlight = (async () => {
      try {
        const response = await fetch("/api/workspace", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ revision, payload }),
        });
        if (response.status === 409) {
          const conflict = await response.json();
          const current = conflict?.current;
          if (current?.payload && Number(current.revision) > revision) {
            transfer.applyPayload(localStorage, current.payload);
            try { localStorage.setItem(REVISION_KEY, String(Number(current.revision) || revision)); } catch {}
            window.PLANT_SHARED_WORKSPACE_APPLIED = true;
            dispatch("remote-newer", { revision: Number(current.revision) || 0 });
            return false;
          }
        }
        if (!response.ok) throw new Error(`Workspace PUT failed (${response.status}).`);
        const saved = await response.json();
        window.PLANT_SHARED_WORKSPACE_APPLIED = true;
        dispatch("saved", { revision: Number(saved?.revision) || revision });
        return true;
      } catch (error) {
        console.warn("Shared plant workspace could not be saved; browser autosave is still intact.", error);
        dispatch("save-failed");
        return false;
      } finally {
        pushInFlight = null;
      }
    })();
    return pushInFlight;
  }

  function schedulePush() {
    touchRevision();
    if (window.monroeEditorAccess?.hasAccess?.() !== true) return;
    if (pushTimer) window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => { void pushNow(); }, 420);
  }

  async function bootstrap() {
    if (!transfer) return false;
    const remote = await remoteWorkspace();
    const localRev = localRevision();
    const remoteRev = Math.max(0, Number(remote?.revision) || 0);
    const hasAccess = window.monroeEditorAccess?.hasAccess?.() === true;
    const protectedProfile = window.monroeEditorAccess?.hasEditorProfile?.() === true;

    // Protected editor browsers never lose their local workspace just because a
    // session expired. Once authenticated, the newer side wins and is shared.
    if (protectedProfile && !hasAccess) {
      window.PLANT_SHARED_WORKSPACE_APPLIED = true;
      dispatch("protected-local", { revision: localRev });
      return true;
    }

    if (hasAccess && hasLocalWorkspace() && (!remote || localRev > remoteRev)) {
      const pushed = await pushNow();
      if (pushed || !remote) {
        window.PLANT_SHARED_WORKSPACE_APPLIED = true;
        return true;
      }
    }

    if (remote?.payload && (!hasAccess || remoteRev >= localRev || !hasLocalWorkspace())) {
      transfer.applyPayload(localStorage, remote.payload);
      try { localStorage.setItem(REVISION_KEY, String(remoteRev || Date.now())); } catch {}
      window.PLANT_SHARED_WORKSPACE_APPLIED = true;
      dispatch("loaded", { revision: remoteRev });
      return true;
    }

    if (hasAccess && hasLocalWorkspace()) {
      window.PLANT_SHARED_WORKSPACE_APPLIED = true;
      return true;
    }
    return false;
  }

  const ready = bootstrap();
  window.PLANT_SHARED_WORKSPACE_READY = ready;
  window.PLANT_WORKSPACE_SYNC = Object.freeze({
    ready,
    localRevision,
    touchRevision,
    schedulePush,
    pushNow,
  });
})();
