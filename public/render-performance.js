(() => {
  "use strict";

  const STORAGE_KEY = "monroe-glass-render-performance-v1";
  const MODES = {
    auto: {
      label: "Auto",
      pixelRatioCap: 1.2,
      idleFps: 6,
      animationFps: 60,
      interactionFps: 60,
      shadowLayers: 1,
      cylinderSegments: 12,
      maxShadowParts: 20,
      maxShadowMachines: 28,
      maxDetailedMachines: 42,
      maxDetailedParts: 700,
      detailPixelThreshold: 22,
      walkDetailDistance: 145,
      walkDrawDistance: 440,
      pillarShadows: false,
    },
    quality: {
      label: "Quality",
      pixelRatioCap: 1.75,
      idleFps: 15,
      animationFps: 60,
      interactionFps: 60,
      shadowLayers: 2,
      cylinderSegments: 22,
      maxShadowParts: 72,
      maxShadowMachines: 96,
      maxDetailedMachines: 120,
      maxDetailedParts: 1800,
      detailPixelThreshold: 8,
      walkDetailDistance: 240,
      walkDrawDistance: 650,
      pillarShadows: true,
    },
    balanced: {
      label: "Balanced",
      pixelRatioCap: 1.25,
      idleFps: 8,
      animationFps: 60,
      interactionFps: 60,
      shadowLayers: 1,
      cylinderSegments: 12,
      maxShadowParts: 24,
      maxShadowMachines: 36,
      maxDetailedMachines: 48,
      maxDetailedParts: 700,
      detailPixelThreshold: 18,
      walkDetailDistance: 135,
      walkDrawDistance: 420,
      pillarShadows: false,
    },
    performance: {
      label: "Performance",
      pixelRatioCap: 1,
      idleFps: 5,
      animationFps: 60,
      interactionFps: 60,
      shadowLayers: 0,
      cylinderSegments: 8,
      maxShadowParts: 0,
      maxShadowMachines: 0,
      maxDetailedMachines: 20,
      maxDetailedParts: 280,
      detailPixelThreshold: 30,
      walkDetailDistance: 95,
      walkDrawDistance: 330,
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

  function createRenderPerformanceController() {
    const settings = loadSettings();
    let dirty = true;
    let interactionUntil = 0;
    let lastRenderAt = 0;
    let currentPixelRatioCap = MODES[settings.mode].pixelRatioCap;
    let currentComplexityScale = 1;
    let sampleTotal = 0;
    let sampleCount = 0;
    let slowWindows = 0;
    let fastWindows = 0;
    let lastAdaptiveChangeAt = Number.NEGATIVE_INFINITY;
    let measuredFps = 0;
    let fpsFrameCount = 0;
    let fpsWindowStart = performance.now();
    let panel = null;
    let fpsBadge = null;
    let statusNode = null;
    let diagnosticsNode = null;
    let activeProfile = null;
    let phaseName = "";
    let phaseStartedAt = 0;
    const phaseAverages = new Map();
    let rendererStats = null;
    let lastProfile = Object.create(null);
    let benchmark = null;
    let benchmarkResult = null;
    let benchmarkButton = null;
    let benchmarkStatusNode = null;

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
        ? currentComplexityScale
        : 1;
      return Math.round(modeConfig().maxShadowParts * adaptiveScale);
    }

    function maxShadowMachines() {
      if (shadowLayerCount() <= 0) return 0;
      if (settings.shadows === "full") return Math.max(96, modeConfig().maxShadowMachines);
      if (settings.shadows === "reduced") return Math.min(28, modeConfig().maxShadowMachines || 28);
      // Keep the chosen shadow casters stable while Auto adjusts resolution and
      // geometry detail. Changing this count every adaptation window made
      // shadows at the budget boundary blink in and out of the overview.
      return modeConfig().maxShadowMachines;
    }

    function detailPixelThreshold() {
      if (settings.mode !== "auto") return modeConfig().detailPixelThreshold;
      const adaptiveScale = clamp(1 / currentComplexityScale, 1, 2.2);
      return Math.round(modeConfig().detailPixelThreshold * adaptiveScale);
    }

    function maxDetailedParts() {
      const scale = settings.mode === "auto" ? currentComplexityScale : 1;
      return Math.max(120, Math.round(modeConfig().maxDetailedParts * scale));
    }

    function maxDetailedMachines() {
      const scale = settings.mode === "auto" ? currentComplexityScale : 1;
      return Math.max(10, Math.round(modeConfig().maxDetailedMachines * scale));
    }

    function walkDetailDistance() {
      return modeConfig().walkDetailDistance;
    }

    function walkDrawDistance() {
      return modeConfig().walkDrawDistance;
    }

    function pillarShadowsEnabled() {
      if (settings.shadows === "off" || settings.shadows === "reduced") return false;
      if (settings.shadows === "full") return true;
      return modeConfig().pillarShadows;
    }

    function animationSampleMs() {
      if (settings.mode === "quality") return 1000 / 60;
      if (settings.mode === "performance") return 1000 / 24;
      return currentComplexityScale < .7 ? 1000 / 24 : 1000 / 30;
    }

    function beginProfile() {
      activeProfile = Object.create(null);
      phaseName = "";
      phaseStartedAt = 0;
    }

    function beginPhase(name) {
      endPhase();
      phaseName = String(name || "other");
      phaseStartedAt = performance.now();
    }

    function endPhase() {
      if (!activeProfile || !phaseName || !phaseStartedAt) return;
      activeProfile[phaseName] = (activeProfile[phaseName] || 0) + performance.now() - phaseStartedAt;
      phaseName = "";
      phaseStartedAt = 0;
    }

    function setRendererStats(nextStats) {
      rendererStats = nextStats && typeof nextStats === "object" ? { ...nextStats } : null;
    }

    function finishProfile() {
      endPhase();
      if (!activeProfile) return lastProfile;
      lastProfile = { ...activeProfile };
      Object.entries(activeProfile).forEach(([name, duration]) => {
        const previous = phaseAverages.get(name) || Number(duration);
        phaseAverages.set(name, previous * .88 + Number(duration) * .12);
      });
      activeProfile = null;
      return lastProfile;
    }

    function targetFps(activity = {}) {
      const config = modeConfig();
      if (activity.interacting || performance.now() < interactionUntil) return config.interactionFps;
      if (activity.animating) return config.animationFps;
      return config.idleFps;
    }

    function shouldRender(time, activity = {}) {
      if (document.hidden) return false;
      const forced = dirty || activity.force === true;
      const continuouslyActive = Boolean(benchmark)
        || activity.interacting
        || activity.animating
        || performance.now() < interactionUntil;
      // A static canvas does not change between frames. Leaving it on-screen
      // costs nothing, so wait for an explicit invalidation instead of
      // redrawing the same plant or machine several times every second.
      if (!forced && !continuouslyActive) return false;
      const fps = Math.max(1, targetFps(activity));
      const interval = 1000 / fps;
      if (!forced && time - lastRenderAt < interval) return false;
      if (forced && time - lastRenderAt < Math.min(8, interval)) return false;
      const elapsed = time - lastRenderAt;
      lastRenderAt = forced || !lastRenderAt ? time : time - (elapsed % interval);
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
        ? currentComplexityScale
        : 1;
      return Math.max(8, Math.min(requestedCount, Math.round(modeConfig().cylinderSegments * adaptiveScale)));
    }

    function percentile(values, amount) {
      if (!values.length) return 0;
      const sorted = [...values].sort((first, second) => first - second);
      return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * amount) - 1))];
    }

    function completeBenchmark() {
      if (!benchmark) return null;
      const finished = benchmark;
      benchmark = null;
      const durations = finished.samples.map((sample) => sample.durationMs);
      const wallTimeMs = Math.max(1, performance.now() - finished.startedAt);
      const phaseTotals = Object.create(null);
      finished.samples.forEach((sample) => Object.entries(sample.phases || {}).forEach(([name, duration]) => {
        phaseTotals[name] = (phaseTotals[name] || 0) + Number(duration);
      }));
      const averagePhases = Object.fromEntries(Object.entries(phaseTotals).map(([name, total]) => [
        name,
        total / Math.max(1, finished.samples.length),
      ]));
      benchmarkResult = {
        recordedAt: new Date().toISOString(),
        durationMs: wallTimeMs,
        frames: finished.samples.length,
        fps: finished.samples.length * 1000 / wallTimeMs,
        averageFrameMs: durations.reduce((total, value) => total + value, 0) / Math.max(1, durations.length),
        p95FrameMs: percentile(durations, .95),
        maximumFrameMs: Math.max(0, ...durations),
        phases: averagePhases,
        renderer: rendererStats ? { ...rendererStats } : null,
        geometryPreparation: window.plantGeometryPrep?.stats?.() || null,
        settings: { ...settings, pixelRatio: pixelRatio(window.devicePixelRatio), complexity: currentComplexityScale },
      };
      window.__MONROE_RENDER_BENCHMARK__ = benchmarkResult;
      window.dispatchEvent(new CustomEvent("renderbenchmarkcomplete", { detail: benchmarkResult }));
      if (benchmarkButton) {
        benchmarkButton.disabled = false;
        benchmarkButton.textContent = "Run 10-second benchmark";
      }
      if (benchmarkStatusNode) {
        benchmarkStatusNode.textContent = `${benchmarkResult.fps.toFixed(1)} FPS | ${benchmarkResult.averageFrameMs.toFixed(1)} ms average | ${benchmarkResult.p95FrameMs.toFixed(1)} ms p95`;
      }
      updateStatus();
      return benchmarkResult;
    }

    function startBenchmark(durationMs = 10000) {
      if (benchmark) return false;
      benchmark = {
        startedAt: performance.now(),
        durationMs: Math.max(1000, Number(durationMs) || 10000),
        samples: [],
      };
      benchmarkResult = null;
      if (benchmarkButton) {
        benchmarkButton.disabled = true;
        benchmarkButton.textContent = "Benchmark running...";
      }
      if (benchmarkStatusNode) benchmarkStatusNode.textContent = "Move or orbit the view while the benchmark runs.";
      invalidate();
      return true;
    }

    function exportBenchmark() {
      if (!benchmarkResult) return false;
      const blob = new Blob([JSON.stringify(benchmarkResult, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `monroe-plant-performance-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      return true;
    }

    function recordFrame(durationMs) {
      if (!Number.isFinite(durationMs) || durationMs < 0) return;
      const completedProfile = finishProfile();
      if (benchmark) {
        benchmark.samples.push({
          at: performance.now() - benchmark.startedAt,
          durationMs,
          phases: { ...completedProfile },
          renderer: rendererStats ? { ...rendererStats } : null,
        });
        if (performance.now() - benchmark.startedAt >= benchmark.durationMs) completeBenchmark();
      }
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
      if (settings.mode !== "auto" || sampleCount < 12) return;
      const average = sampleTotal / sampleCount;
      sampleTotal = 0;
      sampleCount = 0;
      if (average > 18.5) {
        slowWindows += 1;
        fastWindows = 0;
      } else if (average < 13) {
        fastWindows += 1;
        slowWindows = 0;
      } else {
        slowWindows = 0;
        fastWindows = 0;
      }
      const adaptiveElapsed = now - lastAdaptiveChangeAt;
      if (slowWindows >= 2 && adaptiveElapsed >= 1200) {
        const severe = average > 34;
        const sceneHeavy = Number(rendererStats?.calls) > 120
          || Number(rendererStats?.triangles) > 180000
          || Number(phaseAverages.get("machines")) > Number(phaseAverages.get("gpu"));
        const resolutionStep = sceneHeavy ? (severe ? .08 : .04) : (severe ? .16 : .09);
        const complexityStep = sceneHeavy ? (severe ? .25 : .14) : (severe ? .14 : .08);
        currentPixelRatioCap = clamp(currentPixelRatioCap - resolutionStep, 0.75, MODES.auto.pixelRatioCap);
        currentComplexityScale = clamp(currentComplexityScale - complexityStep, .35, 1);
        slowWindows = 0;
        lastAdaptiveChangeAt = now;
        invalidate();
        const notify = () => window.dispatchEvent(new CustomEvent("renderperformancechange", {
          detail: { ...settings, adaptive: true },
        }));
        if (typeof queueMicrotask === "function") queueMicrotask(notify);
        else notify();
      } else if (fastWindows >= 12 && adaptiveElapsed >= 3000) {
        currentPixelRatioCap = clamp(currentPixelRatioCap + 0.05, 0.75, MODES.auto.pixelRatioCap);
        currentComplexityScale = clamp(currentComplexityScale + 0.06, .35, 1);
        fastWindows = 0;
        lastAdaptiveChangeAt = now;
        invalidate();
        const notify = () => window.dispatchEvent(new CustomEvent("renderperformancechange", {
          detail: { ...settings, adaptive: true },
        }));
        if (typeof queueMicrotask === "function") queueMicrotask(notify);
        else notify();
      }
    }

    function updateStatus() {
      const config = modeConfig();
      const shadowText = shadowLayerCount() === 0 ? "off" : shadowLayerCount() === 1 ? "reduced" : "full";
      const detailText = settings.mode === "auto" ? ` · detail ${Math.round(currentComplexityScale * 100)}%` : "";
      const text = `${MODES[settings.mode].label} · ${Math.round(measuredFps || config.animationFps)} FPS · ${pixelRatio(window.devicePixelRatio).toFixed(2)}×${detailText} · shadows ${shadowText}`;
      if (statusNode) statusNode.textContent = text;
      if (fpsBadge) {
        fpsBadge.hidden = !settings.showFps;
        fpsBadge.textContent = `${Math.round(measuredFps || config.animationFps)} FPS`;
      }
      if (diagnosticsNode) {
        const phases = [...phaseAverages.entries()]
          .sort((first, second) => second[1] - first[1])
          .map(([name, duration]) => `${name} ${duration.toFixed(1)}ms`)
          .join(" · ");
        const gpu = rendererStats
          ? `${rendererStats.renderer || "renderer"} · ${rendererStats.calls || 0} calls · ${rendererStats.triangles || 0} tris · ${rendererStats.retainedObjects || 0} cached · ${rendererStats.instances || 0} instances`
          : "Renderer metrics become available after the first frame.";
        diagnosticsNode.textContent = `${gpu}${phases ? `\nCPU · ${phases}` : ""}`;
      }
    }

    function applySettings(next) {
      if (next.mode && MODES[next.mode]) settings.mode = next.mode;
      if (next.shadows && ["auto", "full", "reduced", "off"].includes(next.shadows)) settings.shadows = next.shadows;
      if (typeof next.showFps === "boolean") settings.showFps = next.showFps;
      currentPixelRatioCap = MODES[settings.mode].pixelRatioCap;
      currentComplexityScale = 1;
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
        <p class="render-performance-diagnostics" data-performance-diagnostics></p>
        <div class="render-performance-benchmark-actions">
          <button type="button" data-performance-benchmark>Run 10-second benchmark</button>
          <button type="button" data-performance-export disabled>Export result</button>
        </div>
        <p class="render-performance-benchmark-status" data-performance-benchmark-status>No benchmark recorded yet.</p>
        <p class="render-performance-note">Auto targets 60 FPS and lowers render resolution, shadow work, and distant geometry detail when a slowdown is detected. Selected objects remain detailed.</p>
      `;
      frame.appendChild(panel);
      fpsBadge = document.createElement("div");
      fpsBadge.className = "render-fps-badge";
      fpsBadge.hidden = !settings.showFps;
      frame.appendChild(fpsBadge);
      statusNode = panel.querySelector("[data-performance-status]");
      diagnosticsNode = panel.querySelector("[data-performance-diagnostics]");
      benchmarkButton = panel.querySelector("[data-performance-benchmark]");
      benchmarkStatusNode = panel.querySelector("[data-performance-benchmark-status]");
      const exportButton = panel.querySelector("[data-performance-export]");
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
      benchmarkButton.addEventListener("click", () => startBenchmark(10000));
      exportButton.addEventListener("click", exportBenchmark);
      window.addEventListener("renderbenchmarkcomplete", () => { exportButton.disabled = !benchmarkResult; });
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
      maxShadowMachines,
      maxDetailedMachines,
      maxDetailedParts,
      detailPixelThreshold,
      walkDetailDistance,
      walkDrawDistance,
      pillarShadowsEnabled,
      animationSampleMs,
      beginProfile,
      beginPhase,
      endPhase,
      setRendererStats,
      recordFrame,
      startBenchmark,
      exportBenchmark,
      mount,
      get measuredFps() { return measuredFps; },
      get benchmarkResult() { return benchmarkResult ? { ...benchmarkResult } : null; },
    };
  }

  window.createRenderPerformanceController = createRenderPerformanceController;
})();
