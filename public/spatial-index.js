(() => {
  "use strict";

  function createSpatialIndex(options = {}) {
    const cellSize = Math.max(1, Number(options.cellSize) || 40);
    const getBounds = options.getBounds || ((item) => item);
    const cells = new Map();
    const membership = new Map();
    let size = 0;

    function cellRange(bounds) {
      const minX = Number(bounds?.minX ?? bounds?.x) || 0;
      const minZ = Number(bounds?.minZ ?? bounds?.z) || 0;
      const maxX = Number(bounds?.maxX ?? (minX + (Number(bounds?.w) || 0))) || minX;
      const maxZ = Number(bounds?.maxZ ?? (minZ + (Number(bounds?.d) || 0))) || minZ;
      return {
        minX: Math.floor(Math.min(minX, maxX) / cellSize),
        maxX: Math.floor(Math.max(minX, maxX) / cellSize),
        minZ: Math.floor(Math.min(minZ, maxZ) / cellSize),
        maxZ: Math.floor(Math.max(minZ, maxZ) / cellSize),
      };
    }

    function keysFor(bounds) {
      const range = cellRange(bounds);
      const keys = [];
      for (let x = range.minX; x <= range.maxX; x += 1) {
        for (let z = range.minZ; z <= range.maxZ; z += 1) keys.push(`${x}:${z}`);
      }
      return keys;
    }

    function clear() {
      cells.clear();
      membership.clear();
      size = 0;
    }

    function setItems(items = []) {
      clear();
      items.forEach((item) => {
        const keys = keysFor(getBounds(item));
        membership.set(item, keys);
        keys.forEach((key) => {
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key).push(item);
        });
        size += 1;
      });
      return api;
    }

    function queryBounds(bounds) {
      const results = [];
      const seen = new Set();
      keysFor(bounds).forEach((key) => {
        (cells.get(key) || []).forEach((item) => {
          if (seen.has(item)) return;
          seen.add(item);
          results.push(item);
        });
      });
      return results;
    }

    function queryPoint(x, z, radius = 0) {
      const safeRadius = Math.max(0, Number(radius) || 0);
      return queryBounds({
        minX: Number(x) - safeRadius,
        maxX: Number(x) + safeRadius,
        minZ: Number(z) - safeRadius,
        maxZ: Number(z) + safeRadius,
      });
    }

    const api = {
      clear,
      setItems,
      queryBounds,
      queryPoint,
      get size() { return size; },
      get cellCount() { return cells.size; },
    };
    return api;
  }

  window.createPlantSpatialIndex = createSpatialIndex;
})();
