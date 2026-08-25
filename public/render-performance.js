(() => {
  "use strict";

  const STORAGE_KEY = "monroe-glass-render-performance-v1";
  const MODES = {
    auto: {
      label: "Auto",
      pixelRatioCap: 1.35,
      idleFps: 8,
      animationFps: 30,
      interactionFps: 55,
      shadowLayers: 1,
      cylinderSegments: 14,
      maxShadowParts: 28,
      pillarShadows: false,
    },
    quality: {
      label: "Quality",
      pixelRatioCap: 1.75,
      idleFps: 15,
      animationFps: 45,
      interactionFps: 60,
      shadowLayers: 2,
      cylinderSegments: 22,
      maxShadowParts: 72,
      pillarShadows: true,
    },
    balanced: {
      label: "Balanced",
      pixelRatioCap: 1.25,
      idleFps: 8,
      animationFps: 30,
      interactionFps: 50,
      shadowLayers: 1,
      cylinderSegments: 12,
      maxShadowParts: 24,
      pillarShadows: false,
    },
    performance: {
      label: "Performance",
      pixelRatioCap: 1,
      idleFps: 5,
      animationFps: 24,
      interactionFps: 40,
      shadowLayers: 0,
      cylinderSegments: 8,
      maxShadowParts: 0,
      pillarShadows: false,
    },
  };

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return {
        mode: MODES[saved?.mode] ? saved.mode : "auto",
        shadows: ["auto", "full", "reduced", "off"].includes(saved?.shadows) ? saved.shadows : "auto",
        showFps: saved?.showFps === true,
      };
    } catch {
      return { mode: "auto", shadows: "auto", showFps: false };
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Performance preferences are optional. Rendering continues if storage is blocked.
    }
  }

  function createRenderPerformanceController(options = {}) {
    const settings = loadSettings();
    let dirty = true;
    let interactionUntil = 0;
    let lastRenderAt = 0;
    let currentPixelRatioCap = MODES[settings.mode].pixelRatioCap;
    let sampleTotal = 0;
    let sampleCount = 0;
    let slowWindows = 0;
    let fastWindows = 0;
    let measuredFps = 0;
    let fpsFrameCount = 0;
    let fpsWindowStart = performance.now();
    let panel = null;
    let fpsBadge = null;
    let statusNode = null;

    function modeConfig() {
      return MODES[settings.mode] || MODES.auto;
    }

    function shadowLayerCount() {
      if (settings.shadows === "off") return 0;
      if (settings.shadows === "full") return 2;
      if (settings.shadows === "reduced") return 1;
      return modeConfig().shadowLayers;
    }

    function maxShadowParts() {
      if (shadowLayerCount() <= 0) return 0;
      if (settings.shadows === "full") return Math.max(72, modeConfig().maxShadowParts);
      if (settings.shadows === "reduced") return Math.min(24, modeConfig().maxShadowParts || 24);
      const adaptiveScale = settings.mode === "auto"
        ? clamp(currentPixelRatioCap / MODES.auto.pixelRatioCap, .6, 1)
        : 1;
      return Math.round(modeConfig().maxShadowParts * adaptiveScale);
    }

    function pillarShadowsEnabled() {
      if (settings.shadows === "off" || settings.shadows === "reduced") return false;
      if (settings.shadows === "full") return true;
      return modeConfig().pillarShadows;
    }

    function targetFps(activity = {}) {
      const config = modeConfig();
      if (activity.interacting || performance.now() < interactionUntil) return config.interactionFps;
      if (activity.animating) return config.animationFps;
      return config.idleFps;
    }

    function shouldRender(time, activity = {}) {
      if (document.hidden) return false;
      const fps = Math.max(1, targetFps(activity));
      const interval = 1000 / fps;
      const forced = dirty || activity.force === true;
      if (!forced && time - lastRenderAt < interval) return false;
      if (forced && time - lastRenderAt < Math.min(8, interval)) return false;
      lastRenderAt = time;
      dirty = false;
      return true;
    }

    function invalidate() {
      dirty = true;
    }

    function noteInteraction(duration = 180) {
      interactionUntil = Math.max(interactionUntil, performance.now() + duration);
      dirty = true;
    }

    function pixelRatio(devicePixelRatio = 1) {
      return Math.max(0.75, Math.min(Number(devicePixelRatio) || 1, currentPixelRatioCap));
    }

    function cylinderSegments(requested = 20) {
      const requestedCount = Math.max(8, Math.round(Number(requested) || 20));
      const adaptiveScale = settings.mode === "auto"
        ? clamp(currentPixelRatioCap / MODES.auto.pixelRatioCap, .6, 1)
        : 1;
      return Math.max(8, Math.min(requestedCount, Math.round(modeConfig().cylinderSegments * adaptiveScale)));
    }

    function recordFrame(durationMs) {
      if (!Number.isFinite(durationMs) || durationMs < 0) return;
      sampleTotal += durationMs;
      sampleCount += 1;
      fpsFrameCount += 1;
      const now = performance.now();
      if (now - fpsWindowStart >= 1000) {
        measuredFps = fpsFrameCount * 1000 / Math.max(1, now - fpsWindowStart);
        fpsFrameCount = 0;
        fpsWindowStart = now;
        updateStatus();
      }
      if (settings.mode !== "auto" || sampleCount < 30) return;
      const average = sampleTotal / sampleCount;
      sampleTotal = 0;
      sampleCount = 0;
      if (average > 28) {
        slowWindows += 1;
        fastWindows = 0;
      } else if (average < 13) {
        fastWindows += 1;
        slowWindows = 0;
      } else {
        slowWindows = 0;
        fastWindows = 0;
      }
      if (slowWindows >= 2) {
        currentPixelRatioCap = clamp(currentPixelRatioCap - 0.1, 0.85, 1.45);
        slowWindows = 0;
        invalidate();
      } else if (fastWindows >= 4) {
        currentPixelRatioCap = clamp(currentPixelRatioCap + 0.05, 0.85, 1.45);
        fastWindows = 0;
        invalidate();
      }
    }

    function updateStatus() {
      const config = modeConfig();
      const shadowText = shadowLayerCount() === 0 ? "off" : shadowLayerCount() === 1 ? "reduced" : "full";
      const text = `${MODES[settings.mode].label} · ${Math.round(measuredFps || config.animationFps)} FPS · ${pixelRatio(window.devicePixelRatio).toFixed(2)}× · shadows ${shadowText}`;
      if (statusNode) statusNode.textContent = text;
      if (fpsBadge) {
        fpsBadge.hidden = !settings.showFps;
        fpsBadge.textContent = `${Math.round(measuredFps || config.animationFps)} FPS`;
      }
    }

    function applySettings(next) {
      if (next.mode && MODES[next.mode]) settings.mode = next.mode;
      if (next.shadows && ["auto", "full", "reduced", "off"].includes(next.shadows)) settings.shadows = next.shadows;
      if (typeof next.showFps === "boolean") settings.showFps = next.showFps;
      currentPixelRatioCap = MODES[settings.mode].pixelRatioCap;
      saveSettings(settings);
      invalidate();
      updateStatus();
      window.dispatchEvent(new CustomEvent("renderperformancechange", { detail: { ...settings } }));
    }

    function mount(frame, optionsOverride = {}) {
      if (!frame || panel) return panel;
      const buttonHost = optionsOverride.buttonHost || frame.querySelector(".model-controls") || frame;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "render-performance-button";
      button.textContent = "Performance";
      button.setAttribute("aria-expanded", "false");
      buttonHost.appendChild(button);

      panel = document.createElement("section");
      panel.className = "render-performance-panel";
      panel.hidden = true;
      panel.innerHTML = `
        <div class="render-performance-heading">
          <div><p>Rendering</p><strong>Performance settings</strong></div>
          <button type="button" data-performance-close aria-label="Close performance settings">×</button>
        </div>
        <label>Mode
          <select data-performance-mode>
            <option value="auto">Auto (recommended)</option>
            <option value="balanced">Balanced</option>
            <option value="quality">Quality</option>
            <option value="performance">Performance</option>
          </select>
        </label>
        <label>Shadows
          <select data-performance-shadows>
            <option value="auto">Follow mode</option>
            <option value="full">Full</option>
            <option value="reduced">Reduced</option>
            <option value="off">Off</option>
          </select>
        </label>
        <label class="render-performance-check"><input type="checkbox" data-performance-fps> Show FPS</label>
        <p class="render-performance-status" data-performance-status></p>
        <p class="render-performance-note">Auto lowers render resolution and geometry detail only when a sustained slowdown is detected.</p>
      `;
      frame.appendChild(panel);
      fpsBadge = document.createElement("div");
      fpsBadge.className = "render-fps-badge";
      fpsBadge.hidden = !settings.showFps;
      frame.appendChild(fpsBadge);
      statusNode = panel.querySelector("[data-performance-status]");
      const mode = panel.querySelector("[data-performance-mode]");
      const shadows = panel.querySelector("[data-performance-shadows]");
      const showFps = panel.querySelector("[data-performance-fps]");
      mode.value = settings.mode;
      shadows.value = settings.shadows;
      showFps.checked = settings.showFps;
      const setOpen = (open) => {
        panel.hidden = !open;
        button.classList.toggle("active", open);
        button.setAttribute("aria-expanded", String(open));
      };
      button.addEventListener("click", () => setOpen(panel.hidden));
      panel.querySelector("[data-performance-close]").addEventListener("click", () => setOpen(false));
      mode.addEventListener("change", () => applySettings({ mode: mode.value }));
      shadows.addEventListener("change", () => applySettings({ shadows: shadows.value }));
      showFps.addEventListener("change", () => applySettings({ showFps: showFps.checked }));
      updateStatus();
      return panel;
    }

    window.addEventListener("resize", invalidate);
    window.addEventListener("focus", invalidate);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) invalidate(); });
    document.addEventListener("input", invalidate, true);
    document.addEventListener("change", invalidate, true);

    return {
      settings,
      shouldRender,
      invalidate,
      noteInteraction,
      pixelRatio,
      cylinderSegments,
      shadowLayerCount,
      maxShadowParts,
      pillarShadowsEnabled,
      recordFrame,
      mount,
      get measuredFps() { return measuredFps; },
    };
  }

  window.createRenderPerformanceController = createRenderPerformanceController;
})();
