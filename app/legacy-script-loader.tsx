"use client";

import { useEffect } from "react";
import type * as ThreeNamespace from "three";

declare global {
  interface Window {
    THREE?: typeof ThreeNamespace;
    monroeEditorAccess?: { editingAllowed(): boolean; hasAccess(): boolean; requestAccess(): Promise<boolean>; isOwner?(): boolean; hasEditorProfile?(): boolean };
    PLANT_SHARED_WORKSPACE_READY?: Promise<unknown>;
  }
}

const LEGACY_BUILD_TOKEN = "0.13.66";
const scriptLoads = new Map<string, Promise<void>>();

function loadScript(source: string) {
  const cacheKey = `${LEGACY_BUILD_TOKEN}\u001f${source}`;
  const pending = scriptLoads.get(cacheKey);
  if (pending) return pending;

  const load = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const scriptUrl = new URL(source, window.location.href);
    // These large public viewer scripts intentionally keep stable filenames so
    // the standalone preview and saved work stay compatible. Production must
    // still receive a new URL for every release; otherwise the browser/CDN can
    // pair a fresh Next.js shell with an older plant renderer.
    scriptUrl.searchParams.set("release", LEGACY_BUILD_TOKEN);
    if (["127.0.0.1", "localhost", "::1"].includes(window.location.hostname)) {
      // Keep a per-document token locally as well so rebuilding the same release
      // cannot reuse a stale optimized-server response during development.
      scriptUrl.searchParams.set("local-build", String(Math.round(performance.timeOrigin)));
    }
    script.src = scriptUrl.href;
    script.async = false;
    script.dataset.plantLegacyScript = source;
    script.dataset.plantLegacyRelease = LEGACY_BUILD_TOKEN;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error(`Unable to load ${source}`)),
      { once: true },
    );
    document.body.appendChild(script);
  });

  scriptLoads.set(cacheKey, load);
  load.catch(() => scriptLoads.delete(cacheKey));
  return load;
}

export default function LegacyScriptLoader({ sources }: { sources: string[] }) {
  const sourceKey = sources.join("\u001f");

  useEffect(() => {
    let active = true;
    const entrySource = sourceKey.split("\u001f").filter(Boolean).at(-1);
    const teardownEntry = () => {
      if (!entrySource) return;
      window.dispatchEvent(new CustomEvent("plantlegacyteardown", {
        detail: { source: entrySource },
      }));
    };
    // A persisted page keeps its JavaScript heap and WebGL contexts alive in
    // the browser's back/forward cache. Release the outgoing viewport before it
    // is cached, then reload if it is revisited so it starts with one clean GPU
    // context instead of restoring a disposed renderer.
    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) teardownEntry();
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    const handleUnload = () => teardownEntry();
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    // These pages own unusually large WebGL scenes. Opt out of retaining an
    // outgoing document in desktop back/forward cache so its GPU allocation is
    // destroyed instead of competing with the next viewport.
    window.addEventListener("unload", handleUnload);

    async function loadInOrder() {
      // The legacy editors intentionally remain plain browser scripts so saved
      // projects and the standalone preview keep working. Load Three.js through
      // the application bundle first, then expose it to the retained renderer.
      // If WebGL/Three cannot initialize, depth-scene-renderer.js retains its
      // compatible Canvas/WebGL fallback path.
      if (!window.THREE) {
        window.THREE = await import("three");
      }
      for (const source of sourceKey.split("\u001f")) {
        if (!active || !source) return;
        await loadScript(source);
        if (source === "/shared-workspace.js") {
          await window.PLANT_SHARED_WORKSPACE_READY?.catch?.((error: unknown) => {
            console.warn("Shared plant workspace initialization failed; continuing with local data.", error);
          });
        }
      }
    }

    void loadInOrder().catch((error: unknown) => {
      console.error("Plant application scripts could not be started.", error);
    });

    return () => {
      active = false;
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("unload", handleUnload);
      if (!entrySource) return;
      teardownEntry();
      // Shared renderer/data scripts stay cached between routes. The final
      // route bootstrap must run again when its DOM is mounted again.
      scriptLoads.delete(`${LEGACY_BUILD_TOKEN}\u001f${entrySource}`);
      document.querySelectorAll<HTMLScriptElement>("script[data-plant-legacy-script]").forEach((script) => {
        if (script.dataset.plantLegacyScript === entrySource) script.remove();
      });
    };
  }, [sourceKey]);

  return null;
}