"use client";

import { useEffect } from "react";
import type * as ThreeNamespace from "three";

declare global {
  interface Window {
    THREE?: typeof ThreeNamespace;
    monroeEditorAccess?: { hasAccess(): boolean; requestAccess(): Promise<boolean> };
  }
}

const scriptLoads = new Map<string, Promise<void>>();

function loadScript(source: string) {
  const pending = scriptLoads.get(source);
  if (pending) return pending;

  const load = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const scriptUrl = new URL(source, window.location.href);
    if (["127.0.0.1", "localhost", "::1"].includes(window.location.hostname)) {
      // Public legacy scripts use stable filenames. A per-document local token
      // prevents an optimized local server from reusing an older one-hour
      // browser cache entry after a fresh source build.
      scriptUrl.searchParams.set("local-build", String(Math.round(performance.timeOrigin)));
    }
    script.src = scriptUrl.href;
    script.async = false;
    script.dataset.plantLegacyScript = source;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error(`Unable to load ${source}`)),
      { once: true },
    );
    document.body.appendChild(script);
  });

  scriptLoads.set(source, load);
  load.catch(() => scriptLoads.delete(source));
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
      scriptLoads.delete(entrySource);
      document.querySelectorAll<HTMLScriptElement>("script[data-plant-legacy-script]").forEach((script) => {
        if (script.dataset.plantLegacyScript === entrySource) script.remove();
      });
    };
  }, [sourceKey]);

  return null;
}
