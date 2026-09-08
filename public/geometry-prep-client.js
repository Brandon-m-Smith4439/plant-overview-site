(() => {
  "use strict";

  const cache = new Map();
  const pending = new Map();
  let requestSequence = 0;
  let worker = null;
  let completed = 0;

  function cacheKey(design) {
    return `${design?.id || ""}:${design?.updatedAt || ""}`;
  }

  try {
    if (typeof Worker === "function") worker = new Worker("/geometry-prep-worker.js");
  } catch (error) {
    console.warn("Background geometry preparation is unavailable; using the normal render path.", error);
  }

  worker?.addEventListener("message", (event) => {
    const { requestId, result, error } = event.data || {};
    const request = pending.get(requestId);
    if (!request) return;
    pending.delete(requestId);
    if (result) {
      cache.set(request.key, result);
      completed += 1;
      request.resolve(result);
      if (request.notify !== false) {
        window.dispatchEvent(new CustomEvent("plantgeometryprepared", { detail: result }));
      }
    } else request.reject(new Error(error || "Geometry preparation failed."));
  });

  worker?.addEventListener("error", (event) => {
    console.warn("Background geometry preparation stopped; rendering will continue on the main thread.", event.error || event.message);
  });

  function prepareDesign(design, options = {}) {
    if (!design || !worker) return Promise.resolve(null);
    const key = cacheKey(design);
    if (cache.has(key)) return Promise.resolve(cache.get(key));
    const existing = [...pending.values()].find((request) => request.key === key);
    if (existing) return existing.promise;
    const requestId = `geometry-${++requestSequence}`;
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    pending.set(requestId, { key, promise, resolve, reject, notify: options.notify !== false });
    worker.postMessage({ requestId, design });
    return promise;
  }

  function prepareLibrary(library) {
    const designs = Object.values(library || {});
    return Promise.allSettled(designs.map((design) => prepareDesign(design, { notify: false })))
      .then((results) => {
        if (designs.length) {
          window.dispatchEvent(new CustomEvent("plantgeometryprepared", {
            detail: { batch: true, count: designs.length },
          }));
        }
        return results;
      });
  }

  function get(design) {
    return design ? cache.get(cacheKey(design)) || null : null;
  }

  window.plantGeometryPrep = {
    prepareDesign,
    prepareLibrary,
    get,
    stats: () => ({ cached: cache.size, pending: pending.size, completed, worker: Boolean(worker) }),
  };
})();
