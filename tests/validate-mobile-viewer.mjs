import fs from "node:fs";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const layout = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(page.includes('className="mobile-stage-dock"'), "Mobile stage dock is missing.");
assert(page.includes("Drag to orbit · Pinch to zoom · Two-finger drag to pan"), "Mobile gesture guidance is missing.");
assert(layout.includes('viewportFit: "cover"'), "Edge-to-edge mobile viewport support is missing.");
assert(css.includes("@media (hover: none) and (pointer: coarse)"), "Coarse-touch rules are missing.");
assert(css.includes(".mobile-stage-dock"), "Mobile stage dock styling is missing.");
assert(css.includes("min-height: 44px"), "Touch-sized controls are missing.");
assert(css.includes(".studio-desktop-only-notice"), "Machine Design Studio desktop-only mobile notice is missing.");
assert(app.includes('event.pointerType === "touch" && !state.editing'), "Public touch camera handling is missing.");
assert(app.includes("state.zoom * (distance / touchGestureDistance)"), "Pinch zoom handling is missing.");
assert(app.includes("TOUCH_PAN_MULTIPLIER = 2.15") && app.includes("* TOUCH_PAN_MULTIPLIER"), "Two-finger pan must use the stronger mobile pan multiplier.");
assert(app.includes('document.getElementById("mobile-next-stage")'), "Mobile stage controls are not wired.");
assert(page.includes('id="mobile-stage-description"'), "Compact mobile stage description is missing.");
assert(css.includes("-webkit-line-clamp: unset") && css.includes("font-size: 6.8px"), "Mobile stage descriptions must be allowed to fit completely at phone sizes.");
assert(app.includes("drawTodayProductionFlow") && app.includes("TODAY_FLOW_LINKS"), "Mobile Today must use the same production-flow overlay as desktop.");
assert(css.includes(".stage-panel,") && css.includes(".timeline {") && css.includes("display: none !important"), "Desktop stage panel/timeline must be hidden on mobile.");
assert(!app.includes('document.querySelector("#timeline-stages li.active")?.scrollIntoView'), "Mobile stage changes must not scroll the page to the timeline.");
assert(!app.includes('document.getElementById("mobile-stage-summary")?.addEventListener("click"'), "Compact mobile stage summary must not jump the page to the desktop stage card.");
assert(app.includes("timeline-progress-icon"), "Formatted play-progress icon is missing.");
assert(app.includes("enterViewerFullscreen") && app.includes("viewer-fullscreen-fallback"), "Mobile fullscreen fallback is missing.");
assert(app.includes('addLifecycleListener(window, "orientationchange"'), "Mobile fullscreen must react to phone rotation.");
assert(app.includes("first-person-touch-controls"), "Mobile first-person control surface is missing.");
assert(app.includes("setTouchMove"), "Mobile first-person movement is not wired.");
assert(app.includes("lookBy?.(dx, dy, 1.35)"), "Mobile drag-to-look is not wired.");
assert(app.includes("compactLabelViewport"), "Mobile label-density adaptation is missing.");
assert(app.includes("if (rect.width <= 430)") && app.includes("rect.width <= 820 || compactLabelViewport()"), "Phone, tablet, and short touch-landscape label budgets must use compact viewport rules.");
assert(app.includes('(hover: none) and (pointer: coarse)') && app.includes("rect.height <= 500"), "Short coarse-touch landscape must use mobile label-density rules.");

console.log("Mobile viewer validation passed.");
