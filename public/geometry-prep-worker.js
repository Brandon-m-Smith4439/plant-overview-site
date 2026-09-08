"use strict";

function hashText(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function prepareDesign(design = {}) {
  let partCount = 0;
  let hasAnimation = false;
  const signature = [];
  const visit = (component) => {
    if (!component) return;
    signature.push(
      component.id, component.type, component.visible !== false, component.opacity,
      component.x, component.y, component.z, component.x2, component.y2, component.z2,
      component.w, component.h, component.d, component.size, component.count,
      component.thickness, component.thicknessY, component.thicknessZ,
      component.rotationX, component.rotationY ?? component.rotation, component.rotationZ,
      component.color, component.text,
    );
    if (component.visible !== false && component.type !== "group") {
      partCount += component.type === "rollerBed"
        ? Math.max(2, Math.round(Number(component.count) || 10))
        : 1;
    }
    hasAnimation = hasAnimation || Boolean(
      component.animationTimeline?.enabled !== false
      && component.animationTimeline?.clips?.some((clip) => clip.enabled !== false)
    ) || Boolean(
      component.animationEnabled === true
      && component.animationType
      && component.animationType !== "none"
    );
    (component.children || []).forEach(visit);
  };
  (design.components || []).forEach(visit);
  return {
    designId: design.id || "",
    revision: design.updatedAt || "",
    signature: hashText(signature.join("|")),
    partCount,
    hasAnimation,
  };
}

self.addEventListener("message", (event) => {
  const { requestId, design } = event.data || {};
  if (!requestId || !design) return;
  try {
    self.postMessage({ requestId, result: prepareDesign(design) });
  } catch (error) {
    self.postMessage({ requestId, error: error instanceof Error ? error.message : String(error) });
  }
});
