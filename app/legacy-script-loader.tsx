"use client";

import { useEffect } from "react";

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
    };
  }, [sourceKey]);

  return null;
}
