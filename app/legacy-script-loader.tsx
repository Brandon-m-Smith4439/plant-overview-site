"use client";

import { useEffect } from "react";
import type * as ThreeNamespace from "three";

declare global {
  interface Window {
    THREE?: typeof ThreeNamespace;
  }
}

const scriptLoads = new Map<string, Promise<void>>();

function loadScript(source: string) {
  const pending = scriptLoads.get(source);
  if (pending) return pending;

  const load = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = source;
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
      const entrySource = sourceKey.split("\u001f").filter(Boolean).at(-1);
      if (!entrySource) return;
      window.dispatchEvent(new CustomEvent("plantlegacyteardown", {
        detail: { source: entrySource },
      }));
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
