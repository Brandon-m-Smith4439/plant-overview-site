(() => {
  "use strict";

  if (window.monroeEditorAccess?.editingAllowed?.() === false) return;
  const canvas = document.getElementById("machine-design-canvas");
  if (!canvas) return;
  if (!window.monroeEditorAccess?.hasAccess?.()) {
    window.monroeEditorAccess?.requestAccess?.().then((granted) => {
      if (granted) window.location.reload();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- this file also powers the standalone preview.
      else window.location.assign("preview.html");
    });
    return;
  }
  const VIEWPORT_RUNTIME_KEY = "__MONROE_ACTIVE_VIEWPORT_RUNTIME__";
  const previousViewportRuntime = window[VIEWPORT_RUNTIME_KEY];
  if (previousViewportRuntime?.dispose) {
    try { previousViewportRuntime.dispose(); }
    catch (error) { console.warn("The previous design viewport could not be fully released.", error); }
  }
  const viewportRuntimeToken = {};
  let applicationActive = true;
  let animationFrameId = 0;
  let geometryPreparedFrame = 0;
  const lifecycleListeners = [];
  function addLifecycleListener(target, type, listener, options) {
    target?.addEventListener?.(type, listener, options);
    lifecycleListeners.push(() => target?.removeEventListener?.(type, listener, options));
  }
  function removeLifecycleListeners() {
    lifecycleListeners.splice(0).forEach((remove) => remove());
  }

  const ctx = canvas.getContext("2d");
  const sceneCanvas = window.createDepthCanvas?.(canvas, "depth-scene-canvas machine-depth-canvas") || null;
  const depthRenderer = sceneCanvas && window.createDepthSceneRenderer
    ? window.createDepthSceneRenderer(sceneCanvas)
    : { available: false, beginFrame() {}, addPolygon() {}, addLine() {}, render() {} };
  const renderPerformance = window.createRenderPerformanceController
    ? window.createRenderPerformanceController({ id: "machine-design-studio" })
    : {
        shouldRender() { return true; }, invalidate() {}, noteInteraction() {},
        pixelRatio(value) { return Math.min(Number(value) || 1, 1.25); },
        cylinderSegments(value) { return Math.max(8, Math.min(14, Number(value) || 14)); },
        shadowLayerCount() { return 1; }, maxShadowParts() { return 24; },
        recordFrame() {}, mount() {},
      };
  const handleRendererFallback = () => renderPerformance.invalidate();
  const handleGeometryPrepared = () => {
    if (!applicationActive || geometryPreparedFrame) return;
    geometryPreparedFrame = window.requestAnimationFrame(() => {
      geometryPreparedFrame = 0;
      renderPerformance.invalidate?.("geometry-prepared");
    });
  };
  addLifecycleListener(window, "plant-renderer-fallback", handleRendererFallback);
  addLifecycleListener(window, "plantgeometryprepared", handleGeometryPrepared);
  const APP_VERSION = "0.13.14";
  const timelineEngine = window.MachineAnimationTimeline || null;
  const timelineWorkspaceEngine = window.AnimationTimelineWorkspace || null;
  const MIN_DESIGN_ENVELOPE = 0.01;
  const MAX_ENVELOPE_CLEARANCE_INCHES = 120;
  const DEFAULT_PAN_PITCH_SCALE = Math.sin(0.62);
  const MAX_PAN_POINTER_DELTA = 160;
  const MARQUEE_DRAG_THRESHOLD = 5;
  const DESIGN_KEY = window.PLANT_MACHINE_DESIGN_STORAGE_KEY || "monroe-glass-machine-designs-v1";
  const LAYOUT_KEY = "monroe-glass-plant-layout-v6";
  const LEGACY_LAYOUT_KEY = "monroe-glass-plant-layout-v5";
  const SYNC_CHANNEL_NAME = "monroe-glass-plant-sync-v1";
  const syncChannel = typeof window.BroadcastChannel === "function"
    ? new window.BroadcastChannel(SYNC_CHANNEL_NAME)
    : null;
  const defaults = clone(window.PLANT_MACHINE_DESIGNS || {});
  const builtinIds = new Set(Object.keys(defaults));
  let deletedDesignIds = new Set();
  const AXIS_COLORS = { x: "#d94b45", y: "#3f9a65", z: "#3d7fc4" };
  const TOOL_LABELS = {
    select: ["Select", "Click a part to select it"],
    move: ["Move", "Drag an axis handle or the orange center handle"],
    rotate: ["Rotate", "Drag a colored ring around the selected part"],
    scale: ["Scale", "Drag one axis handle or the orange uniform handle"],
    pan: ["Pan", "Drag the viewport to move the camera"],
  };
  const COMPONENT_TYPES = [
    "box", "cylinder", "sphere", "cone", "wedge",
    "glassPanel", "beam", "arrow", "rollerBed", "wheel", "text", "group",
  ];

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function uniqueId(prefix = "item") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function validColor(value, fallback = "#68777a") {
    return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    })[character]);
  }


  function broadcastProjectUpdate(type, detail = {}) {
    if (!syncChannel) return;
    try {
      syncChannel.postMessage({
        source: "machine-design-studio",
        type,
        at: Date.now(),
        ...detail,
      });
    } catch (error) {
      console.warn("Project update could not be broadcast.", error);
    }
  }

  function safeId(value) {
    return String(value || "machine")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "machine";
  }

  function normalizeComponent(component, index = 0) {
    const type = COMPONENT_TYPES.includes(component?.type) ? component.type : "box";
    const normalized = {
      id: component?.id || uniqueId(type),
      name: component?.name || `${type} ${index + 1}`,
      type,
      x: Number(component?.x) || 0,
      y: Number(component?.y) || 0,
      z: Number(component?.z) || 0,
      color: validColor(component?.color, type === "glassPanel" ? "#8fc6d4" : "#68777a"),
      opacity: clamp(Number(component?.opacity ?? (type === "glassPanel" ? 0.55 : 1)), 0.05, 1),
      visible: component?.visible !== false,
      rotationX: Number(component?.rotationX) || 0,
      rotationY: Number.isFinite(Number(component?.rotationY))
        ? Number(component.rotationY)
        : Number(component?.rotation) || 0,
      rotationZ: Number(component?.rotationZ) || 0,
      scaleXPercent: Math.max(.01, Number(component?.scaleXPercent) || 100),
      scaleYPercent: Math.max(.01, Number(component?.scaleYPercent) || 100),
      scaleZPercent: Math.max(.01, Number(component?.scaleZPercent) || 100),
      animationEnabled: component?.animationEnabled !== false,
      animationType: ["none", "oscillate", "loop", "fourStep", "spin", "bob", "pulse", "blink"].includes(component?.animationType)
        ? component.animationType
        : "none",
      animationAxis: ["x", "y", "z", "all"].includes(component?.animationAxis) ? component.animationAxis : "x",
      animationSecondaryAxis: ["x", "y", "z"].includes(component?.animationSecondaryAxis) ? component.animationSecondaryAxis : "z",
      animationAmount: Number.isFinite(Number(component?.animationAmount)) ? Number(component.animationAmount) : 10,
      animationSecondaryAmount: Number.isFinite(Number(component?.animationSecondaryAmount)) ? Number(component.animationSecondaryAmount) : 10,
      animationSpeed: Math.max(0, Number.isFinite(Number(component?.animationSpeed)) ? Number(component.animationSpeed) : 0.1),
      animationPauseSeconds: Math.max(0, Number.isFinite(Number(component?.animationPauseSeconds)) ? Number(component.animationPauseSeconds) : 0),
      animationSecondaryPauseSeconds: Math.max(0, Number.isFinite(Number(component?.animationSecondaryPauseSeconds))
        ? Number(component.animationSecondaryPauseSeconds)
        : (Number.isFinite(Number(component?.animationPauseSeconds)) ? Number(component.animationPauseSeconds) : 0)),
      animationStep1PauseSeconds: Math.max(0, Number.isFinite(Number(component?.animationStep1PauseSeconds))
        ? Number(component.animationStep1PauseSeconds)
        : (Number.isFinite(Number(component?.animationPauseSeconds)) ? Number(component.animationPauseSeconds) : 0)),
      animationStep2PauseSeconds: Math.max(0, Number.isFinite(Number(component?.animationStep2PauseSeconds))
        ? Number(component.animationStep2PauseSeconds)
        : (Number.isFinite(Number(component?.animationSecondaryPauseSeconds))
          ? Number(component.animationSecondaryPauseSeconds)
          : (Number.isFinite(Number(component?.animationPauseSeconds)) ? Number(component.animationPauseSeconds) : 0))),
      animationStep3PauseSeconds: Math.max(0, Number.isFinite(Number(component?.animationStep3PauseSeconds))
        ? Number(component.animationStep3PauseSeconds)
        : (Number.isFinite(Number(component?.animationPauseSeconds)) ? Number(component.animationPauseSeconds) : 0)),
      animationStep4PauseSeconds: Math.max(0, Number.isFinite(Number(component?.animationStep4PauseSeconds))
        ? Number(component.animationStep4PauseSeconds)
        : (Number.isFinite(Number(component?.animationSecondaryPauseSeconds))
          ? Number(component.animationSecondaryPauseSeconds)
          : (Number.isFinite(Number(component?.animationPauseSeconds)) ? Number(component.animationPauseSeconds) : 0))),
      animationPhase: Number.isFinite(Number(component?.animationPhase)) ? Number(component.animationPhase) : 0,
      playOwnAnimation: component?.playOwnAnimation !== false,
      animationTimeline: timelineEngine
        ? timelineEngine.normalizeTimeline(component?.animationTimeline, component)
        : { enabled: component?.animationEnabled !== false, loop: true, playbackRate: 1, duration: 0, clips: [] },
    };
    // Keep the legacy Y-rotation field so existing plant layouts and older
    // exported designs continue to load without losing orientation.
    normalized.rotation = normalized.rotationY;

    if (["box", "glassPanel", "cylinder", "sphere", "cone", "wedge", "text"].includes(type)) {
      normalized.w = Math.max(0.02, Number(component?.w) || 4);
      normalized.h = Math.max(0.02, Number(component?.h) || 4);
      normalized.d = Math.max(0.02, Number(component?.d) || (["glassPanel", "text"].includes(type) ? 0.25 : 4));
      if (["cylinder", "sphere", "cone"].includes(type)) {
        normalized.segments = Math.max(8, Math.min(48, Math.round(Number(component?.segments) || 20)));
      }
      if (type === "text") {
        normalized.text = String(component?.text || component?.name || "LABEL").slice(0, 120);
        normalized.textColor = validColor(component?.textColor, "#ffffff");
      }
    } else if (["beam", "arrow"].includes(type)) {
      normalized.x2 = Number.isFinite(Number(component?.x2)) ? Number(component.x2) : normalized.x + 5;
      normalized.y2 = Number.isFinite(Number(component?.y2)) ? Number(component.y2) : normalized.y;
      normalized.z2 = Number.isFinite(Number(component?.z2)) ? Number(component.z2) : normalized.z;
      normalized.thickness = Math.max(0.05, Number(component?.thickness) || (type === "arrow" ? 0.45 : 2));
      normalized.thicknessY = Math.max(0.05, Number(component?.thicknessY) || normalized.thickness);
      normalized.thicknessZ = Math.max(0.05, Number(component?.thicknessZ) || normalized.thickness);
      if (type === "arrow") {
        normalized.headLength = Math.max(0.1, Number(component?.headLength) || 1.5);
        normalized.headWidth = Math.max(0.1, Number(component?.headWidth) || 1.35);
      }
    } else if (type === "rollerBed") {
      normalized.w = Math.max(0.1, Number(component?.w) || 8);
      normalized.d = Math.max(0.1, Number(component?.d) || 5);
      normalized.count = Math.max(2, Math.round(Number(component?.count) || 8));
      normalized.thickness = Math.max(0.2, Number(component?.thickness) || 1.5);
    } else if (type === "wheel") {
      const legacySize = Math.max(0.1, Number(component?.size) || 1.2);
      normalized.w = Math.max(0.1, Number(component?.w) || legacySize);
      normalized.h = Math.max(0.1, Number(component?.h) || legacySize);
      normalized.d = Math.max(0.05, Number(component?.d) || legacySize * 0.64);
      // Retain the legacy field for exported v1/v2 designs and the plant viewer.
      normalized.size = Math.max(normalized.w, normalized.h);
    } else if (type === "group") {
      const rawChildren = Array.isArray(component?.children) ? component.children : [];
      normalized.children = rawChildren.map(normalizeComponent);
      normalized.color = validColor(component?.color, normalized.children[0]?.color || "#68777a");
      // Embedded machines intentionally reuse the group geometry model while
      // retaining source metadata. Their children animate independently instead
      // of inheriting one attachment driver's motion.
      normalized.embeddedMachine = component?.embeddedMachine === true;
      if (normalized.embeddedMachine) {
        normalized.embeddedMachineSourceId = String(component?.embeddedMachineSourceId || "");
        normalized.embeddedMachineSourceName = String(component?.embeddedMachineSourceName || component?.name || "Embedded machine");
        normalized.embeddedMachineSourceUpdatedAt = String(component?.embeddedMachineSourceUpdatedAt || "");
      }
      const requestedDriver = typeof component?.motionDriverId === "string" ? component.motionDriverId : "";
      const automaticDriver = normalized.children.find((child) => child.animationTimeline?.enabled !== false && child.animationTimeline?.clips?.some((clip) => clip.enabled !== false))
        || normalized.children.find((child) => child.animationEnabled !== false && child.animationType && child.animationType !== "none")
        || normalized.children[0];
      normalized.motionDriverId = normalized.children.some((child) => child.id === requestedDriver)
        ? requestedDriver
        : (automaticDriver?.id || "");
      normalized.activeAnimationChildId = normalized.children.some((child) => child.id === component?.activeAnimationChildId)
        ? component.activeAnimationChildId
        : (normalized.children[0]?.id || "");
      const driver = normalized.children.find((child) => child.id === normalized.motionDriverId) || normalized.children[0];
      normalized.children.forEach((child, childIndex) => {
        if (typeof rawChildren[childIndex]?.playOwnAnimation !== "boolean") {
          child.playOwnAnimation = child.id === driver?.id ? true : !componentAnimationSettingsMatch(child, driver);
        }
      });
    }
    if (component?.collisionEnvelope && typeof component.collisionEnvelope === "object") {
      normalized.collisionEnvelope = {
        x: Number(component.collisionEnvelope.x) || 0,
        y: Number(component.collisionEnvelope.y) || 0,
        z: Number(component.collisionEnvelope.z) || 0,
        w: Math.max(MIN_DESIGN_ENVELOPE, Number(component.collisionEnvelope.w) || MIN_DESIGN_ENVELOPE),
        h: Math.max(MIN_DESIGN_ENVELOPE, Number(component.collisionEnvelope.h) || MIN_DESIGN_ENVELOPE),
        d: Math.max(MIN_DESIGN_ENVELOPE, Number(component.collisionEnvelope.d) || MIN_DESIGN_ENVELOPE),
      };
    } else normalized.collisionEnvelope = null;
    return normalized;
  }

  function firstSavedTimelineSettings(components) {
    const stack = [...(components || [])];
    while (stack.length) {
      const component = stack.shift();
      const timeline = component?.animationTimeline;
      if (timeline && typeof timeline === "object") {
        const requestedRate = Number(timeline.playbackRate);
        return {
          loop: timeline.loop !== false,
          playbackRate: clamp(Number.isFinite(requestedRate) ? requestedRate : 1, 0, 20),
        };
      }
      stack.unshift(...(component?.children || []));
    }
    return { loop: true, playbackRate: 1 };
  }

  function normalizeSharedTimelineSettings(design) {
    const legacy = firstSavedTimelineSettings(design?.components);
    const saved = design?.animationTimelineSettings;
    return {
      loop: saved?.loop === undefined ? legacy.loop : saved.loop !== false,
      playbackRate: clamp(Number(saved?.playbackRate ?? legacy.playbackRate) || 0, 0, 20),
    };
  }

  const DESIGN_SCALE_MODES = new Set(["preserve", "match", "stretch"]);
  const MACHINE_SCALE_EDIT_MODES = new Set(["uniform", "individual"]);

  function normalizedDesignScaleMode(value) {
    return DESIGN_SCALE_MODES.has(value) ? value : "preserve";
  }

  function normalizedMachineScaleEditMode(value, machine = null) {
    if (MACHINE_SCALE_EDIT_MODES.has(value)) return value;
    const values = machine ? [
      Number(machine.scaleXPercent) || 100,
      Number(machine.scaleYPercent) || 100,
      Number(machine.scaleZPercent) || 100,
    ] : [100, 100, 100];
    const axesDiffer = Math.max(...values) - Math.min(...values) > .01;
    if (machine?.designId) {
      return normalizedDesignScaleMode(machine.designScaleMode) === "stretch" ? "individual" : "uniform";
    }
    return axesDiffer ? "individual" : "uniform";
  }

  function currentPlantObjectScale(machine) {
    const reference = {
      w: Math.max(.01, Number(machine?.naturalW) || Number(machine?.w) || 1),
      d: Math.max(.01, Number(machine?.naturalD) || Number(machine?.d) || 1),
      h: Math.max(.01, Number(machine?.naturalH) || Number(machine?.h) || 1),
    };
    const scales = {
      x: Math.max(.0001, Number(machine?.w) || reference.w) / reference.w,
      y: Math.max(.0001, Number(machine?.h) || reference.h) / reference.h,
      z: Math.max(.0001, Number(machine?.d) || reference.d) / reference.d,
    };
    const editMode = normalizedMachineScaleEditMode(machine?.scaleEditMode, machine);
    if (editMode === "uniform") {
      const values = [scales.x, scales.y, scales.z];
      const uniform = Math.max(...values) - Math.min(...values) < .0001
        ? values.reduce((total, value) => total + value, 0) / values.length
        : Math.min(...values);
      scales.x = uniform;
      scales.y = uniform;
      scales.z = uniform;
    }
    return { ...scales, editMode };
  }

  function syncPlantObjectDimensions(machine, design, { preserveScale = true } = {}) {
    if (!machine || !design?.base) return false;
    const baseWidth = Math.max(MIN_DESIGN_ENVELOPE, Number(design.base.w) || Number(machine.w) || 1);
    const baseDepth = Math.max(MIN_DESIGN_ENVELOPE, Number(design.base.d) || Number(machine.d) || 1);
    const baseHeight = Math.max(MIN_DESIGN_ENVELOPE, Number(design.base.h) || Number(machine.h) || 1);
    const scale = preserveScale ? currentPlantObjectScale(machine) : { x: 1, y: 1, z: 1, editMode: "uniform" };
    const width = baseWidth * scale.x;
    const depth = baseDepth * scale.z;
    const height = baseHeight * scale.y;
    const oldWidth = Math.max(.01, Number(machine.w) || width);
    const oldDepth = Math.max(.01, Number(machine.d) || depth);
    const changed = Math.abs(oldWidth - width) > .0001
      || Math.abs(oldDepth - depth) > .0001
      || Math.abs(Number(machine.h) - height) > .0001
      || Math.abs((Number(machine.naturalW) || 0) - baseWidth) > .0001
      || Math.abs((Number(machine.naturalD) || 0) - baseDepth) > .0001
      || Math.abs((Number(machine.naturalH) || 0) - baseHeight) > .0001;
    // Preserve the plant object's center so syncing a design does not move it.
    machine.x = Number(machine.x) + (oldWidth - width) / 2;
    machine.z = Number(machine.z) + (oldDepth - depth) / 2;
    machine.w = width;
    machine.d = depth;
    machine.h = height;
    machine.naturalW = baseWidth;
    machine.naturalD = baseDepth;
    machine.naturalH = baseHeight;
    machine.scaleXPercent = scale.x * 100;
    machine.scaleYPercent = scale.y * 100;
    machine.scaleZPercent = scale.z * 100;
    machine.scaleEditMode = scale.editMode;
    return changed;
  }

  function syncPlantObjectName(machine, design) {
    if (!machine || !design || machine.useDesignName === false) return false;
    const name = String(design.name || "New machine").trim() || "New machine";
    const short = conciseMachineName(name);
    const changed = machine.name !== name || machine.short !== short || machine.useDesignName !== true;
    machine.name = name;
    machine.short = short;
    machine.useDesignName = true;
    return changed;
  }

  function normalizeDesign(design, fallbackId = uniqueId("design")) {
    const base = design?.base || {};
    const normalizedBase = {
      x: Number(base.x) || 0,
      y: Number(base.y) || 0,
      z: Number(base.z) || 0,
      w: Math.max(MIN_DESIGN_ENVELOPE, Number(base.w) || 20),
      d: Math.max(MIN_DESIGN_ENVELOPE, Number(base.d) || 10),
      h: Math.max(MIN_DESIGN_ENVELOPE, Number(base.h) || 8),
    };
    const collisionEnvelopes = (Array.isArray(design?.collisionEnvelopes) ? design.collisionEnvelopes : [])
      .map((envelope, index) => ({
        id: String(envelope?.id || uniqueId("envelope")),
        name: String(envelope?.name || `Envelope box ${index + 1}`),
        x: Number.isFinite(Number(envelope?.x)) ? Number(envelope.x) : normalizedBase.x,
        y: Number.isFinite(Number(envelope?.y)) ? Number(envelope.y) : normalizedBase.y,
        z: Number.isFinite(Number(envelope?.z)) ? Number(envelope.z) : normalizedBase.z,
        w: Math.max(MIN_DESIGN_ENVELOPE, Number(envelope?.w) || normalizedBase.w),
        h: Math.max(MIN_DESIGN_ENVELOPE, Number(envelope?.h) || normalizedBase.h),
        d: Math.max(MIN_DESIGN_ENVELOPE, Number(envelope?.d) || normalizedBase.d),
      }));
    return {
      id: design?.id || fallbackId,
      name: design?.name || "Untitled machine design",
      machineType: design?.machineType || "generic",
      description: design?.description || "",
      base: normalizedBase,
      collisionEnvelopes,
      animationTimelineSettings: normalizeSharedTimelineSettings(design),
      components: (Array.isArray(design?.components) ? design.components : []).map(normalizeComponent),
      custom: design?.custom === true || !builtinIds.has(design?.id),
      updatedAt: design?.updatedAt || new Date().toISOString(),
    };
  }

  function loadLibrary() {
    let saved = {};
    try {
      const payload = JSON.parse(localStorage.getItem(DESIGN_KEY) || "null");
      saved = payload?.designs && typeof payload.designs === "object" ? payload.designs : {};
      deletedDesignIds = new Set(Array.isArray(payload?.deletedDesignIds) ? payload.deletedDesignIds : []);
    } catch (error) {
      console.warn("Saved machine designs could not be loaded.", error);
    }
    const result = {};
    Object.entries({ ...defaults, ...saved }).forEach(([id, design]) => {
      if (deletedDesignIds.has(id)) return;
      result[id] = normalizeDesign({ ...design, id }, id);
    });
    return result;
  }

  function loadLayout() {
    for (const key of [LAYOUT_KEY, LEGACY_LAYOUT_KEY]) {
      try {
        const payload = JSON.parse(localStorage.getItem(key) || "null");
        if (payload && Array.isArray(payload.machines)) return { ...payload, sourceKey: key };
      } catch (error) {
        console.warn(`Could not load ${key}.`, error);
      }
    }
    return { version: 6, machines: [], stages: [], floor: null, hiddenColumns: [], walls: {}, playbackSpeed: 1 };
  }

  let library = loadLibrary();
  let plantLayout = loadLayout();
  const queryMachineId = new URLSearchParams(window.location.search).get("machine");
  const queryMachine = plantLayout.machines.find((machine) => machine.instanceId === queryMachineId);

  function recommendedDesignId(machine) {
    if (!machine) return "";
    const preferred = {
      generic: "generic-machine",
      genericBox: "generic-box-standard",
      cutting: "cutting-standard",
      filtration: "filtration-standard",
      craneMachine: "crane-machine-standard",
      bridgeCrane: "bridge-crane-standard",
      room: "room-standard",
      person: "team-member-standard",
      kodiak: "kodiak-standard",
      waterjet: "waterjet-standard",
      denver: "denver-standard",
      washer: "washer-standard",
      furnace: "furnace-standard",
      cube: "fusecube-standard",
      wrapping: "wrapping-standard",
      shipping: "shipping-standard",
      glassRack: "glass-rack-standard",
      aFrame: "aframe-cart-standard",
      aFrameTruck: "aframe-truck-standard",
      safetyLine: "safety-line-standard",
      trench: "utility-trench-standard",
      floorDrain: "floor-drain-standard",
    }[machine.type];
    if (preferred && library[preferred]) return preferred;
    const matching = Object.values(library).find((design) => design.machineType === machine.type);
    return matching?.id || "";
  }

  function fallbackDesignForMachine(machine) {
    const w = Math.max(0.5, Number(machine?.w) || 20);
    const d = Math.max(0.5, Number(machine?.d) || 10);
    const h = Math.max(0.5, Number(machine?.h) || 8);
    const color = validColor(machine?.color, "#68777a");
    const components = [
      { id: uniqueId("box"), name: "Main body", type: "box", x: 0, y: 0, z: 0, w, h, d, color, opacity: 1, visible: true, rotationX: 0, rotationY: 0, rotationZ: 0 },
    ];
    if (machine?.type === "cutting") {
      components[0].h = Math.max(0.5, h * 0.72);
      components.push({ id: uniqueId("glassPanel"), name: "Cutting table surface", type: "glassPanel", x: w * 0.03, y: h * 0.72, z: d * 0.03, w: w * 0.94, h: Math.max(0.12, h * 0.08), d: d * 0.94, color: "#8fc6d4", opacity: 0.65, visible: true, rotationX: 0, rotationY: 0, rotationZ: 0 });
    } else if (machine?.type === "filtration") {
      components[0].w = w * 0.42;
      components.push({ id: uniqueId("box"), name: "Filter tank", type: "box", x: w * 0.52, y: 0, z: d * 0.08, w: w * 0.2, h, d: d * 0.84, color: "#438a9f", opacity: 1, visible: true, rotationX: 0, rotationY: 0, rotationZ: 0 });
      components.push({ id: uniqueId("box"), name: "Pump tank", type: "box", x: w * 0.76, y: 0, z: d * 0.08, w: w * 0.2, h, d: d * 0.84, color: "#438a9f", opacity: 1, visible: true, rotationX: 0, rotationY: 0, rotationZ: 0 });
    }
    return normalizeDesign({
      id: uniqueId("starter-design"),
      name: `${machine?.name || "Machine"} editable starter`,
      machineType: machine?.type || "generic",
      description: "Editable starter generated from the current plant object's dimensions and color.",
      base: { w, d, h },
      custom: true,
      components,
    });
  }

  function plantReferenceDimensions(machine, design = null) {
    const source = design || (machine?.designId ? library[machine.designId] : null);
    if (source?.base) return {
      w: Math.max(.01, Number(source.base.w) || 1),
      d: Math.max(.01, Number(source.base.d) || 1),
      h: Math.max(.01, Number(source.base.h) || 1),
    };
    return {
      w: Math.max(.01, Number(machine?.naturalW) || Number(machine?.w) || 1),
      d: Math.max(.01, Number(machine?.naturalD) || Number(machine?.d) || 1),
      h: Math.max(.01, Number(machine?.naturalH) || Number(machine?.h) || 1),
    };
  }

  function refreshPlantScaleMetadata(machine, design = null) {
    if (!machine) return;
    const reference = plantReferenceDimensions(machine, design);
    machine.scaleXPercent = Math.max(.01, Number(machine.w) / reference.w * 100);
    machine.scaleYPercent = Math.max(.01, Number(machine.h) / reference.h * 100);
    machine.scaleZPercent = Math.max(.01, Number(machine.d) / reference.d * 100);
  }

  function resizePlantMachine(machine, field, value) {
    if (!machine) return;
    const next = Math.max(MIN_DESIGN_ENVELOPE, Number(value) || MIN_DESIGN_ENVELOPE);
    if (field === "w") {
      const center = Number(machine.x) + Number(machine.w) / 2;
      machine.w = next;
      machine.x = center - next / 2;
    } else if (field === "d") {
      const center = Number(machine.z) + Number(machine.d) / 2;
      machine.d = next;
      machine.z = center - next / 2;
    } else if (field === "h") machine.h = next;
    refreshPlantScaleMetadata(machine);
  }

  function setPlantScalePercent(machine, axis, percent) {
    if (!machine) return;
    const value = clamp(Number(percent) || 100, 1, 10000);
    const reference = plantReferenceDimensions(machine);
    if (axis === "uniform") {
      machine.scaleEditMode = "uniform";
      if (machine.designScaleMode === "match" && Math.abs(value - 100) > .0001) machine.designScaleMode = "preserve";
      resizePlantMachine(machine, "w", reference.w * value / 100);
      resizePlantMachine(machine, "h", reference.h * value / 100);
      resizePlantMachine(machine, "d", reference.d * value / 100);
      machine.scaleXPercent = value;
      machine.scaleYPercent = value;
      machine.scaleZPercent = value;
      return;
    }
    machine.scaleEditMode = "individual";
    if (machine.designId) machine.designScaleMode = "stretch";
    if (axis === "x") resizePlantMachine(machine, "w", reference.w * value / 100);
    if (axis === "y") resizePlantMachine(machine, "h", reference.h * value / 100);
    if (axis === "z") resizePlantMachine(machine, "d", reference.d * value / 100);
  }

  function linkedDesignId(machine) {
    if (!machine) return "";
    if (machine.designId && library[machine.designId] && !builtinIds.has(machine.designId)) return machine.designId;
    const sourceId = machine.designId && library[machine.designId] ? machine.designId : recommendedDesignId(machine);
    const source = sourceId && library[sourceId] ? library[sourceId] : fallbackDesignForMachine(machine);
    const stableId = `machine-${safeId(machine.instanceId)}-design`;
    if (!library[stableId]) {
      library[stableId] = normalizeDesign({
        ...clone(source),
        id: stableId,
        name: `${machine.name || source.name} custom`,
        machineType: machine.type || source.machineType,
        description: `Live-linked design for ${machine.name || "this plant object"}.`,
        custom: true,
        sourceDesignId: sourceId || null,
        components: source.components.map((component) => ({
          ...clone(component),
          id: uniqueId(component.type),
        })),
      }, stableId);
    }
    return stableId;
  }

  const initialDesignId = queryMachine
    ? linkedDesignId(queryMachine)
    : Object.keys(library)[0] || "";

  const state = {
    designId: initialDesignId,
    componentId: null,
    selectedComponentIds: new Set(),
    selectAllParts: false,
    yaw: -0.72,
    pitch: 0.62,
    zoom: 1,
    panX: 0,
    panY: 0,
    panZ: 0,
    tool: "select",
    snapEnabled: true,
    snapStep: 0.1,
    transformSpace: "local",
    dragging: false,
    drag: null,
    pointerX: 0,
    pointerY: 0,
    history: [],
    future: [],
    drawnComponents: [],
    renderPrimitives: [],
    hitPrimitives: [],
    hoverHandle: null,
    browserTab: "designs",
    inspectorTab: "object",
    partTab: "properties",
    timelineTargetId: null,
    timelineTargetPathIds: [],
    timelineClipId: null,
    timelineScrubSeconds: null,
    timelineOpen: false,
    timelineDrag: null,
    timelineDragFrame: 0,
    previewAnimations: true,
    animationPausedAt: 0,
    animationTimeOffset: 0,
    lastFrameTime: 0,
    lastRenderedAt: 0,
    geometryRevision: 1,
    linkedMachineId: queryMachine?.instanceId || null,
    lastCreatedMachineId: null,
    showDesignEnvelope: true,
    designEnvelopeId: null,
    componentClipboard: [],
  };

  function currentDesign() {
    return library[state.designId] || null;
  }

  function markDesignGeometryDirty({ invalidate = true } = {}) {
    state.geometryRevision = (Number(state.geometryRevision) || 0) + 1;
    if (invalidate) renderPerformance.invalidate?.("design-geometry");
  }

  function componentTimelines(components) {
    const timelines = [];
    const visit = (component) => {
      if (!component) return;
      if (component.animationTimeline && Array.isArray(component.animationTimeline.clips)) {
        timelines.push(component.animationTimeline);
      }
      (component.children || []).forEach(visit);
    };
    (components || []).forEach(visit);
    return timelines;
  }

  function sharedDesignTimelineSettings(design = currentDesign()) {
    if (!design) return { loop: true, playbackRate: 1 };
    if (!design.animationTimelineSettings) {
      design.animationTimelineSettings = normalizeSharedTimelineSettings(design);
    }
    return design.animationTimelineSettings;
  }

  function sharedDesignTimelineDuration(design = currentDesign()) {
    const timelines = componentTimelines(design?.components);
    return timelineEngine?.sharedTimelineDuration
      ? timelineEngine.sharedTimelineDuration(timelines)
      : Math.max(timelineEngine?.MIN_TIMELINE_SECONDS || 30, ...timelines.map((timeline) => timelineEngine?.timelineDuration?.(timeline) || 0));
  }

  function sharedDesignTimelineSeconds(now = state.lastFrameTime || performance.now(), design = currentDesign()) {
    const duration = sharedDesignTimelineDuration(design);
    const settings = sharedDesignTimelineSettings(design);
    const scaled = Math.max(0, designAnimationTime(now) / 1000 * Math.max(0, Number(settings.playbackRate) || 0));
    return settings.loop === false ? Math.min(scaled, duration) : ((scaled % duration) + duration) % duration;
  }

  function evaluateTimelineOnSharedClock(timeline, now, design = currentDesign()) {
    const settings = sharedDesignTimelineSettings(design);
    const scrubbing = Number.isFinite(state.timelineScrubSeconds);
    const seconds = scrubbing ? Math.max(0, state.timelineScrubSeconds) : designAnimationTime(now) / 1000;
    return timelineEngine.evaluateTimeline(timeline, seconds, {
      sharedClock: true,
      duration: sharedDesignTimelineDuration(design),
      loop: scrubbing ? false : settings.loop,
      playbackRate: scrubbing ? 1 : settings.playbackRate,
    });
  }

  function selectedComponent() {
    if (state.selectAllParts || state.selectedComponentIds.size !== 1) return null;
    const id = [...state.selectedComponentIds][0] || state.componentId;
    return currentDesign()?.components.find((component) => component.id === id) || null;
  }

  function selectionComponents() {
    const design = currentDesign();
    if (!design) return [];
    if (state.selectAllParts) return design.components;
    const ids = state.selectedComponentIds.size
      ? state.selectedComponentIds
      : new Set(state.componentId ? [state.componentId] : []);
    return design.components.filter((component) => ids.has(component.id));
  }

  function selectAllComponents() {
    const design = currentDesign();
    if (!design?.components.length) return;
    commitActiveInspectorEdit();
    state.selectAllParts = true;
    state.timelineTargetId = null;
    state.timelineTargetPathIds = [];
    state.timelineClipId = null;
    state.selectedComponentIds = new Set(design.components.map((component) => component.id));
    state.componentId = null;
    state.browserTab = "parts";
    state.inspectorTab = "object";
    updateInterface();
    showToast(`Selected all ${design.components.length} machine parts.`);
  }

  let deferredLibrarySave = 0;

  function writeLibraryNow() {
    if (deferredLibrarySave) window.clearTimeout(deferredLibrarySave);
    deferredLibrarySave = 0;
    const saveState = document.getElementById("save-state");
    if (saveState) saveState.textContent = "Saving\u2026";
    Object.keys(library).forEach((id) => deletedDesignIds.delete(id));
    localStorage.setItem(DESIGN_KEY, JSON.stringify({
      version: 17,
      updatedAt: new Date().toISOString(),
      // JSON.stringify already walks the object graph once. Cloning every
      // design first doubled both the allocation and traversal cost whenever
      // a detailed component was pasted.
      designs: library,
      deletedDesignIds: [...deletedDesignIds],
    }));
    broadcastProjectUpdate("design-library-updated", { designId: state?.designId || null });
    if (saveState) window.setTimeout(() => { saveState.textContent = "Auto-saved"; }, 180);
  }

  function saveLibrary({ defer = false } = {}) {
    if (!defer) {
      writeLibraryNow();
      return;
    }
    const saveState = document.getElementById("save-state");
    if (saveState) saveState.textContent = "Saving...";
    if (deferredLibrarySave) window.clearTimeout(deferredLibrarySave);
    deferredLibrarySave = window.setTimeout(writeLibraryNow, 70);
  }

  function saveLayout() {
    plantLayout.version = 6;
    plantLayout.appVersion = APP_VERSION;
    delete plantLayout.sourceKey;
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(plantLayout));
    broadcastProjectUpdate("layout-updated", { machineId: state?.linkedMachineId || null });
  }

  function syncLinkedMachineToCurrentDesign({ syncName = false } = {}) {
    if (!state.designId) return;
    const design = currentDesign();
    if (!design) return;
    let changed = false;
    const linkedMachine = state.linkedMachineId
      ? plantLayout.machines.find((item) => item.instanceId === state.linkedMachineId)
      : null;
    const linkedDesignChanged = Boolean(linkedMachine && linkedMachine.designId !== state.designId);
    if (linkedDesignChanged) {
      linkedMachine.designId = state.designId;
      linkedMachine.designScaleMode = normalizedDesignScaleMode(linkedMachine.designScaleMode);
      linkedMachine.useDesignName = true;
      changed = true;
    }
    plantLayout.machines.forEach((machine) => {
      machine.designScaleMode = normalizedDesignScaleMode(machine.designScaleMode);
      if (machine.designId !== state.designId) return;
      if (syncName || (linkedDesignChanged && machine === linkedMachine)) changed = syncPlantObjectName(machine, design) || changed;
      changed = syncPlantObjectDimensions(machine, design) || changed;
    });
    if (changed) saveLayout();
  }

  function snapshot() {
    return {
      designId: state.designId,
      design: clone(currentDesign()),
      componentId: state.componentId,
      selectedComponentIds: [...state.selectedComponentIds],
      selectAllParts: state.selectAllParts,
    };
  }

  function pushHistory(item = snapshot()) {
    if (!item?.design) return;
    state.history.push(item);
    if (state.history.length > 100) state.history.shift();
    state.future.length = 0;
    updateHistoryButtons();
  }

  function restoreHistory(item) {
    if (!item?.design) return;
    const previousName = library[item.designId]?.name || "";
    library[item.designId] = normalizeDesign(item.design, item.designId);
    state.designId = item.designId;
    state.componentId = item.componentId;
    state.selectedComponentIds = new Set(item.selectedComponentIds || (item.componentId ? [item.componentId] : []));
    state.selectAllParts = item.selectAllParts === true;
    state.designEnvelopeId = null;
    markDesignGeometryDirty({ invalidate: false });
    saveLibrary();
    syncLinkedMachineToCurrentDesign({ syncName: previousName !== library[item.designId].name });
    updateInterface();
  }

  function undo() {
    const item = state.history.pop();
    if (!item) return;
    state.future.push(snapshot());
    restoreHistory(item);
    showToast("Undid the last design change.");
  }

  function redo() {
    const item = state.future.pop();
    if (!item) return;
    state.history.push(snapshot());
    restoreHistory(item);
    showToast("Restored the design change.");
  }

  function updateHistoryButtons() {
    const undoButton = document.getElementById("undo-design");
    const redoButton = document.getElementById("redo-design");
    if (undoButton) undoButton.disabled = state.history.length === 0;
    if (redoButton) redoButton.disabled = state.future.length === 0;
  }

  function showToast(message) {
    const toast = document.getElementById("design-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => toast.classList.remove("visible"), 2200);
  }

  function commit(message = "", { syncName = false } = {}) {
    const design = currentDesign();
    if (!design) return;
    componentAnimationPresenceCache = new WeakMap();
    design.updatedAt = new Date().toISOString();
    markDesignGeometryDirty({ invalidate: false });
    window.plantGeometryPrep?.prepareDesign(design);
    saveLibrary({ defer: true });
    syncLinkedMachineToCurrentDesign({ syncName });
    updateInterface();
    if (message) showToast(message);
  }

  function snapToSelectedStep(value) {
    if (!state.snapEnabled) return value;
    const step = Math.max(0.01, state.snapStep);
    return Math.round(value / step) * step;
  }

  function snapValue(value) {
    return snapToSelectedStep(value);
  }

  function snapRotationDegrees(value) {
    return snapToSelectedStep(value);
  }

  function snapScaleFactor(value) {
    if (!state.snapEnabled) return value;
    // Scale inputs are displayed as percentages, so a 0.5 snap step means
    // half-percent scaling while the same selection means 0.5 ft or 0.5 degrees for
    // move and rotate.
    return Math.max(0.05, snapToSelectedStep(value * 100) / 100);
  }

  function updateSnapStepControls() {
    const step = Math.max(0.01, Number(state.snapStep) || 0.1);
    const stepText = Number(step.toFixed(3)).toString();
    const enabled = state.snapEnabled !== false;
    const select = document.getElementById("snap-step");
    if (select) {
      select.disabled = !enabled;
      select.value = stepText;
    }
    const summary = document.getElementById("snap-step-summary");
    if (summary) summary.textContent = enabled
      ? `${stepText} ft move / ${stepText} deg rotate / ${stepText}% scale`
      : "Free movement, rotation, and scaling";
    document.querySelectorAll("[data-component-field]").forEach((input) => {
      if (["x", "y", "z", "x2", "y2", "z2", "rotationX", "rotationY", "rotationZ"].includes(input.dataset.componentField)) {
        input.step = stepText;
      }
    });
    document.querySelectorAll("[data-component-envelope-field]").forEach((input) => { input.step = stepText; });
    document.querySelectorAll("[data-component-scale]").forEach((input) => { input.step = stepText; });
  }

  function newComponent(type) {
    const design = currentDesign();
    const base = design?.base || { w: 20, d: 10, h: 8 };
    const common = {
      id: uniqueId(type),
      name: {
        box: "New box",
        cylinder: "New cylinder",
        sphere: "New sphere",
        cone: "New cone",
        wedge: "New wedge",
        glassPanel: "New glass panel",
        beam: "New frame beam",
        arrow: "New direction arrow",
        rollerBed: "New roller bed",
        wheel: "New wheel",
        text: "New text label",
      }[type] || "New component",
      type,
      x: (Number(base.x) || 0) + base.w * 0.25,
      y: Number(base.y) || 0,
      z: (Number(base.z) || 0) + base.d * 0.25,
      color: type === "glassPanel" ? "#8fc6d4" : type === "wheel" ? "#20272a" : "#68777a",
      opacity: type === "glassPanel" ? 0.55 : 1,
      visible: true,
      rotation: 0,
      animationEnabled: true,
      animationType: "none",
      animationAxis: "x",
      animationSecondaryAxis: "z",
      animationAmount: 10,
      animationSecondaryAmount: 10,
      animationSpeed: 0.1,
      animationPauseSeconds: 0,
      animationSecondaryPauseSeconds: 0,
      animationStep1PauseSeconds: 0,
      animationStep2PauseSeconds: 0,
      animationStep3PauseSeconds: 0,
      animationStep4PauseSeconds: 0,
      animationPhase: 0,
      playOwnAnimation: true,
    };
    if (["box", "glassPanel", "cylinder", "sphere", "cone", "wedge", "text"].includes(type)) {
      Object.assign(common, {
        w: type === "text" ? Math.max(3, base.w * .3) : base.w * (type === "sphere" ? 0.3 : 0.5),
        h: type === "text" ? Math.max(1, base.h * .14) : base.h * (type === "glassPanel" ? 0.65 : 0.5),
        d: ["glassPanel", "text"].includes(type) ? 0.25 : base.d * (type === "sphere" ? 0.3 : 0.5),
      });
      if (["cylinder", "sphere", "cone"].includes(type)) common.segments = 20;
      if (type === "text") Object.assign(common, { text: "MACHINE LABEL", textColor: "#ffffff", color: "#176f69" });
    } else if (["beam", "arrow"].includes(type)) {
      Object.assign(common, {
        x2: (Number(base.x) || 0) + base.w * 0.75,
        y2: Number(base.y) || 0,
        z2: (Number(base.z) || 0) + base.d * 0.25,
        thickness: type === "arrow" ? 0.45 : 2,
        thicknessY: type === "arrow" ? 0.45 : 2,
        thicknessZ: type === "arrow" ? 0.45 : 2,
      });
      if (type === "arrow") Object.assign(common, { headLength: 1.5, headWidth: 1.35, color: "#e38a2c" });
    } else if (type === "rollerBed") {
      Object.assign(common, { w: base.w * 0.5, d: base.d * 0.5, count: 8, thickness: 1.5 });
    } else if (type === "wheel") {
      Object.assign(common, { w: 1.2, h: 1.2, d: 0.75, size: 1.2 });
    }
    return normalizeComponent(common);
  }

  function cloneComponentTreeForEmbedding(component) {
    const source = clone(component);
    const copied = clone(source);
    copied.id = uniqueId(source.type || "part");

    // Clip ids only need to be unique within a target timeline, but refreshing
    // them here avoids duplicate editor state when the same machine is embedded
    // more than once and later separated into editable parts.
    if (copied.animationTimeline && Array.isArray(copied.animationTimeline.clips)) {
      copied.animationTimeline.clips = copied.animationTimeline.clips.map((clip) => ({
        ...clip,
        id: uniqueId("clip"),
      }));
    }

    if (source.type === "group" && Array.isArray(source.children)) {
      const copiedChildren = source.children.map((child) => cloneComponentTreeForEmbedding(child));
      const directIdMap = new Map(source.children.map((child, index) => [child.id, copiedChildren[index]?.id]));
      copied.children = copiedChildren;
      copied.motionDriverId = directIdMap.get(source.motionDriverId) || copiedChildren[0]?.id || "";
      copied.activeAnimationChildId = directIdMap.get(source.activeAnimationChildId) || copiedChildren[0]?.id || "";
    }

    return normalizeComponent(copied);
  }

  function embeddedMachineOptions() {
    return Object.values(library)
      .filter((design) => design?.id !== state.designId && Array.isArray(design?.components) && design.components.length)
      .sort((first, second) => {
        const customOrder = Number(second.custom === true) - Number(first.custom === true);
        return customOrder || String(first.name || first.id).localeCompare(String(second.name || second.id));
      });
  }

  function updateEmbeddedMachinePicker() {
    const select = document.getElementById("add-machine-design");
    const button = document.getElementById("add-machine-design-button");
    const status = document.getElementById("add-machine-design-status");
    if (!select) return;

    const previous = select.value;
    const options = embeddedMachineOptions();
    const custom = options.filter((design) => design.custom === true);
    const presets = options.filter((design) => design.custom !== true);
    const optionMarkup = (design) => `<option value="${escapeHtml(design.id)}">${escapeHtml(design.name)} \u00B7 ${escapeHtml(design.machineType || "generic")}</option>`;
    select.innerHTML = [
      custom.length ? `<optgroup label="My machines">${custom.map(optionMarkup).join("")}</optgroup>` : "",
      presets.length ? `<optgroup label="Preset machines">${presets.map(optionMarkup).join("")}</optgroup>` : "",
    ].join("") || `<option value="">No other machine designs available</option>`;

    if (options.some((design) => design.id === previous)) select.value = previous;
    else if (options[0]) select.value = options[0].id;
    if (button) button.disabled = options.length === 0;

    const source = library[select.value];
    if (status) {
      status.textContent = source
        ? `${source.name} \u00B7 ${source.components.length} top-level part${source.components.length === 1 ? "" : "s"} \u00B7 inserted as one editable machine.`
        : "Create or save another machine design first, then return here to insert it.";
    }
  }

  function addMachineDesignToCurrentDesign(sourceId) {
    const design = currentDesign();
    const source = sourceId ? library[sourceId] : null;
    if (!design || !source || source.id === design.id || !Array.isArray(source.components) || !source.components.length) {
      showToast("Choose another saved machine to add.");
      return;
    }

    const sourceBounds = designGeometryBounds(source);
    if (!sourceBounds) {
      showToast("That machine does not contain visible geometry to add.");
      return;
    }

    pushHistory();
    const children = source.components.map((component) => cloneComponentTreeForEmbedding(component));
    // Keep the destination envelope unchanged when embedding another machine.
    // Component coordinates are already stored in real design units, so changing
    // the envelope here would change the Plant Layout placement scale for every
    // existing part when the plant instance is in Preserve/Stretch sizing mode.
    // The embedded snapshot therefore keeps the exact size it had in its source
    // design. Users can intentionally resize the envelope later with Tight fit.
    const sourceCenterX = (sourceBounds.minX + sourceBounds.maxX) / 2;
    const sourceCenterZ = (sourceBounds.minZ + sourceBounds.maxZ) / 2;
    const targetCenterX = (Number(design.base?.x) || 0) + Number(design.base?.w || 0) / 2;
    const targetCenterZ = (Number(design.base?.z) || 0) + Number(design.base?.d || 0) / 2;
    const dx = targetCenterX - sourceCenterX;
    const dy = (Number(design.base?.y) || 0) - sourceBounds.minY;
    const dz = targetCenterZ - sourceCenterZ;
    children.forEach((child) => translateComponent(child, dx, dy, dz));

    const embedded = normalizeComponent({
      id: uniqueId("machine"),
      name: source.name || "Embedded machine",
      type: "group",
      color: visibleDesignColor(source),
      opacity: 1,
      visible: true,
      animationEnabled: true,
      animationType: "none",
      playOwnAnimation: true,
      embeddedMachine: true,
      embeddedMachineSourceId: source.id,
      embeddedMachineSourceName: source.name || source.id,
      embeddedMachineSourceUpdatedAt: source.updatedAt || "",
      motionDriverId: children[0]?.id || "",
      activeAnimationChildId: children[0]?.id || "",
      children,
    });

    design.components.push(embedded);
    state.selectAllParts = false;
    state.componentId = embedded.id;
    state.selectedComponentIds = new Set([embedded.id]);
    state.timelineTargetId = embedded.id;
    state.timelineTargetPathIds = [embedded.id];
    state.timelineClipId = embedded.animationTimeline?.clips?.[0]?.id || null;
    state.browserTab = "parts";
    state.inspectorTab = "object";
    setTool("move");
    fitView();
    commit(`${source.name} added as an embedded machine.`);
  }

  function selectDesign(id) {
    if (!library[id] || id === state.designId) return;
    commitActiveInspectorEdit();
    const designList = document.getElementById("design-list");
    const canReuseDesignList = Array.from(designList?.querySelectorAll("[data-design-id]") || [])
      .some((button) => button.dataset.designId === id);
    state.designId = id;
    window.plantGeometryPrep?.prepareDesign(library[id]);
    state.designEnvelopeId = null;
    state.componentId = library[id].components[0]?.id || null;
    state.selectedComponentIds = new Set(state.componentId ? [state.componentId] : []);
    state.selectAllParts = false;
    state.timelineTargetId = state.componentId;
    state.timelineTargetPathIds = state.componentId ? [state.componentId] : [];
    state.timelineClipId = null;
    state.history.length = 0;
    state.future.length = 0;
    markDesignGeometryDirty({ invalidate: false });
    fitView();
    // Static designs render only when explicitly invalidated. Mark the canvas
    // dirty immediately so the newly selected machine appears on the next
    // animation frame instead of waiting for another viewport interaction.
    renderPerformance.invalidate?.("design-switch");
    // Existing machines can take the lightweight selection-only path. Newly
    // created, imported, or Save As designs need one complete list refresh so
    // their row appears immediately without leaving and reopening Designer.
    updateInterface({ designSwitch: canReuseDesignList });
  }

  function selectComponent(
    id,
    openParts = false,
    additive = false,
    requestedTimelineTargetId = null,
    requestedTimelineTargetPathIds = null,
  ) {
    const design = currentDesign();
    if (id && !design?.components.some((component) => component.id === id)) return;
    commitActiveInspectorEdit();
    state.selectAllParts = false;
    if (!id) {
      state.componentId = null;
      state.selectedComponentIds.clear();
    } else if (additive) {
      if (state.selectedComponentIds.has(id)) state.selectedComponentIds.delete(id);
      else state.selectedComponentIds.add(id);
      state.componentId = state.selectedComponentIds.has(id) ? id : [...state.selectedComponentIds].at(-1) || null;
    } else {
      state.componentId = id;
      state.selectedComponentIds = new Set([id]);
    }
    state.inspectorTab = "object";
    const selectedRoot = !additive && state.componentId
      ? design?.components.find((component) => component.id === state.componentId) || null
      : null;
    const requestedPathTarget = selectedRoot
      ? componentFromPathIds(selectedRoot, requestedTimelineTargetPathIds)
      : null;
    const requestedIdTarget = selectedRoot && requestedTimelineTargetId
      ? findComponentById(selectedRoot, requestedTimelineTargetId)
      : null;
    const timelineTarget = requestedPathTarget || requestedIdTarget || selectedRoot;
    state.timelineTargetId = timelineTarget?.id || state.componentId;
    state.timelineTargetPathIds = selectedRoot && timelineTarget
      ? componentPathToTarget(selectedRoot, timelineTarget)?.map((component) => component.id) || [selectedRoot.id]
      : [];
    state.timelineClipId = null;
    if (openParts) state.browserTab = "parts";
    updateInterface();
  }

  function createDesign() {
    const id = uniqueId("custom-design");
    library[id] = normalizeDesign({
      id,
      name: "New custom machine",
      machineType: "generic",
      description: "Build this reusable machine by adding and arranging shapes.",
      base: { w: 20, d: 10, h: 8 },
      custom: true,
      components: [],
    }, id);
    saveLibrary();
    selectDesign(id);
    state.browserTab = "add";
    state.inspectorTab = "design";
    updateInterface();
    showToast("Blank machine created. Add your first shape from the Build panel.");
  }

  function saveCurrentDesign(options = {}) {
    const design = currentDesign();
    if (!design) {
      showToast("Create or select a machine design first.");
      return false;
    }
    design.updatedAt = new Date().toISOString();
    saveLibrary();
    syncLinkedMachineToCurrentDesign();
    updateInterface();
    if (!options.silent) showToast(`${design.name} saved.`);
    return true;
  }

  function openSaveAsDialog() {
    const design = currentDesign();
    if (!design) return;
    const dialog = document.getElementById("save-design-as-dialog");
    const name = document.getElementById("save-design-as-name");
    const type = document.getElementById("save-design-as-type");
    if (!dialog || typeof dialog.showModal !== "function") {
      const requestedName = window.prompt("Save machine design as", `${design.name} copy`)?.trim();
      if (requestedName) saveDesignAs(requestedName, design.machineType);
      return;
    }
    if (name) name.value = builtinIds.has(design.id) ? `${design.name} custom` : `${design.name} copy`;
    if (type) type.value = design.machineType || "generic";
    dialog.showModal();
    window.setTimeout(() => name?.select(), 0);
  }

  function saveDesignAs(requestedName, requestedType) {
    const design = currentDesign();
    const name = String(requestedName || "").trim();
    if (!design || !name) return false;
    const id = uniqueId("custom-design");
    library[id] = normalizeDesign({
      ...clone(design),
      id,
      name,
      machineType: String(requestedType || design.machineType || "generic").trim() || "generic",
      custom: true,
      sourceDesignId: design.id,
      components: design.components.map((component) => cloneComponentTreeForEmbedding(component)),
    }, id);
    saveLibrary();
    selectDesign(id);
    showToast(`${name} saved as a reusable machine.`);
    return true;
  }

  function duplicateDesign() {
    openSaveAsDialog();
  }

  function resetDesign() {
    const id = state.designId;
    if (!id || !defaults[id]) {
      showToast("This custom design has no built-in preset to restore.");
      return;
    }
    if (!window.confirm(`Restore ${defaults[id].name} to its supplied component design?`)) return;
    pushHistory();
    library[id] = normalizeDesign({ ...clone(defaults[id]), id }, id);
    state.selectAllParts = false;
    state.componentId = library[id].components[0]?.id || null;
    state.selectedComponentIds = new Set(state.componentId ? [state.componentId] : []);
    commit("Preset restored.", { syncName: true });
  }

  function deleteDesign(requestedId = null) {
    const id = typeof requestedId === "string" ? requestedId : state.designId;
    const design = library[id];
    if (!id || !design) return;
    if (!window.confirm(`Delete ${design.name} from the machine library? Plant objects using it will return to their built-in model.`)) return;
    plantLayout.machines.forEach((machine) => {
      if (machine.designId === id) machine.designId = "";
    });
    saveLayout();
    deletedDesignIds.add(id);
    delete library[id];
    saveLibrary();
    const nextId = Object.keys(library)[0] || "";
    if (id === state.designId) {
      state.designId = null;
      if (nextId) selectDesign(nextId);
      else createDesign();
    } else {
      updateInterface();
    }
    showToast(`${design.name} deleted from the machine library.`);
  }

  function duplicateSelectedComponent() {
    const design = currentDesign();
    const components = selectionComponents();
    if (!design || !components.length) return;
    pushHistory();
    const copies = components.map((component) => {
      const copy = cloneComponentTreeForEmbedding(component);
      copy.name = `${component.name} copy`;
      translateComponent(copy, state.snapStep, 0, state.snapStep);
      return copy;
    });
    design.components.push(...copies);
    state.selectAllParts = false;
    state.selectedComponentIds = new Set(copies.map((component) => component.id));
    state.componentId = copies.at(-1)?.id || null;
    state.browserTab = "parts";
    commit(`${copies.length} component${copies.length === 1 ? "" : "s"} duplicated.`);
  }

  function copySelectedComponents({ announce = true } = {}) {
    const components = selectionComponents();
    if (!components.length) return false;
    state.componentClipboard = components.map(clone);
    if (announce) showToast(`${components.length} part${components.length === 1 ? "" : "s"} copied.`);
    return true;
  }

  function pasteComponents() {
    const design = currentDesign();
    if (!design || !state.componentClipboard.length) {
      showToast("Copy a part before pasting.");
      return;
    }
    pushHistory();
    const copies = state.componentClipboard.map((component) => {
      return cloneComponentTreeForEmbedding(component);
    });
    design.components.push(...copies);
    state.selectAllParts = false;
    state.selectedComponentIds = new Set(copies.map((component) => component.id));
    state.componentId = copies.at(-1)?.id || null;
    state.browserTab = "parts";
    commit(`${copies.length} copied part${copies.length === 1 ? "" : "s"} pasted in the original position.`);
  }

  function cutSelectedComponents() {
    const design = currentDesign();
    const components = selectionComponents();
    if (!design || !components.length) return;
    state.componentClipboard = components.map(clone);
    pushHistory();
    const ids = new Set(components.map((component) => component.id));
    design.components = design.components.filter((component) => !ids.has(component.id));
    state.selectAllParts = false;
    state.componentId = design.components[0]?.id || null;
    state.selectedComponentIds = new Set(state.componentId ? [state.componentId] : []);
    commit(`${components.length} part${components.length === 1 ? "" : "s"} cut.`);
  }

  function deleteSelectedComponent() {
    const design = currentDesign();
    const components = selectionComponents();
    if (!design || !components.length) return;
    pushHistory();
    const ids = new Set(components.map((component) => component.id));
    design.components = design.components.filter((component) => !ids.has(component.id));
    state.selectAllParts = false;
    state.componentId = design.components[0]?.id || null;
    state.selectedComponentIds = new Set(state.componentId ? [state.componentId] : []);
    commit(`${components.length} component${components.length === 1 ? "" : "s"} deleted.`);
  }

  function mergeSelectedComponents() {
    const design = currentDesign();
    const components = selectionComponents();
    if (!design || components.length < 2) {
      showToast("Select at least two parts to merge them.");
      return;
    }
    pushHistory();
    const selectedIds = new Set(components.map((component) => component.id));
    const insertionIndex = Math.min(...components.map((component) => design.components.findIndex((item) => item.id === component.id)));
    const group = normalizeComponent({
      id: uniqueId("group"),
      name: "Merged item",
      type: "group",
      color: components[0]?.color || "#68777a",
      visible: true,
      opacity: 1,
      animationEnabled: true,
      animationType: "none",
      animationAxis: "x",
      animationSecondaryAxis: "z",
      animationAmount: 10,
      animationSecondaryAmount: 10,
      animationSpeed: 0.1,
      animationPauseSeconds: 0,
      animationSecondaryPauseSeconds: 0,
      animationStep1PauseSeconds: 0,
      animationStep2PauseSeconds: 0,
      animationStep3PauseSeconds: 0,
      animationStep4PauseSeconds: 0,
      animationPhase: 0,
      playOwnAnimation: true,
      motionDriverId: components.some((component) => component.id === state.componentId)
        ? state.componentId
        : (components.find((component) => component.animationTimeline?.enabled !== false && component.animationTimeline?.clips?.some((clip) => clip.enabled !== false))?.id
          || components.find((component) => component.animationEnabled !== false && component.animationType !== "none")?.id
          || components[0]?.id || ""),
      children: components.map(clone),
    });
    group.activeAnimationChildId = group.children[0]?.id || "";
    const driver = group.children.find((child) => child.id === group.motionDriverId) || group.children[0];
    group.children.forEach((child) => {
      child.playOwnAnimation = child.id === driver?.id ? true : !componentAnimationSettingsMatch(child, driver);
    });
    design.components = design.components.filter((component) => !selectedIds.has(component.id));
    design.components.splice(Math.max(0, insertionIndex), 0, group);
    state.selectAllParts = false;
    state.componentId = group.id;
    state.selectedComponentIds = new Set([group.id]);
    // A merge creates a new animation owner. Reset the timeline to the new
    // outer group so a previously selected child, including a nested merged
    // item, cannot silently receive clips intended for the whole assembly.
    state.timelineTargetId = group.id;
    state.timelineTargetPathIds = [group.id];
    state.timelineClipId = group.animationTimeline?.clips?.[0]?.id || null;
    commit(`${components.length} parts merged. ${group.children.find((child) => child.id === group.motionDriverId)?.name || "The active part"} carries the assembly while every child keeps its own animation.`);
  }

  function ungroupSelectedComponent() {
    const design = currentDesign();
    const group = selectedComponent();
    if (!design || group?.type !== "group" || !Array.isArray(group.children)) {
      showToast("Select a merged item to separate it.");
      return;
    }
    pushHistory();
    const index = design.components.findIndex((component) => component.id === group.id);
    const children = group.children.map((child) => normalizeComponent({ ...clone(child), id: uniqueId(child.type) }));
    design.components.splice(index, 1, ...children);
    state.selectAllParts = false;
    state.selectedComponentIds = new Set(children.map((child) => child.id));
    state.componentId = children.at(-1)?.id || null;
    commit(`Merged item separated into ${children.length} parts.`);
  }

  function moveComponentOrder(direction) {
    const design = currentDesign();
    const component = selectedComponent();
    if (!design || !component) return;
    const index = design.components.findIndex((item) => item.id === component.id);
    const target = index + direction;
    if (target < 0 || target >= design.components.length) return;
    pushHistory();
    [design.components[index], design.components[target]] = [design.components[target], design.components[index]];
    commit();
  }

  function setTool(tool) {
    if (!TOOL_LABELS[tool]) return;
    state.tool = tool;
    document.querySelectorAll("[data-design-mode]").forEach((button) => {
      const active = button.dataset.designMode === tool;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    canvas.dataset.tool = tool;
    updateToolLabel();
    document.querySelectorAll("[data-transform-space]").forEach((button) => {
      const active = button.dataset.transformSpace === state.transformSpace;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function updateToolLabel() {
    const label = document.getElementById("active-tool-label");
    const [title, help] = TOOL_LABELS[state.tool] || TOOL_LABELS.select;
    if (label) label.innerHTML = `<strong>${escapeHtml(title)}</strong> \u00B7 ${escapeHtml(help)}`;
  }

  function setBrowserTab(tab, { refresh = true } = {}) {
    state.browserTab = tab;
    document.querySelectorAll("[data-browser-tab]").forEach((button) => {
      const active = button.dataset.browserTab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-browser-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.browserPanel !== tab;
    });
    if (refresh && tab === "add") updateEmbeddedMachinePicker();
    if (refresh && tab === "plant") updateAssignmentPanel();
  }

  function setInspectorTab(tab, { refresh = true } = {}) {
    state.inspectorTab = tab;
    document.querySelectorAll("[data-inspector-tab]").forEach((button) => {
      const active = button.dataset.inspectorTab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-inspector-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.inspectorPanel !== tab;
    });
    if (refresh && tab === "design") updateDesignFields({ includeEnvelope: true });
  }


  function setTimelineOpen(open, { focusInspector = false } = {}) {
    state.timelineOpen = Boolean(open);
    const workspace = document.getElementById("animation-timeline-workspace");
    const viewport = canvas.closest(".design-viewport-panel");
    const toolButton = document.getElementById("toggle-animation-timeline");
    if (workspace) workspace.hidden = !state.timelineOpen;
    viewport?.classList.toggle("timeline-open", state.timelineOpen);
    if (toolButton) {
      toolButton.classList.toggle("active", state.timelineOpen);
      toolButton.setAttribute("aria-pressed", String(state.timelineOpen));
    }
    if (state.timelineOpen && focusInspector) {
      setInspectorTab("object");
      setPartTab("animation");
    }
    window.requestAnimationFrame(() => {
      updateCanvasSize();
      updateAnimationTimelineUI();
      renderPerformance.invalidate?.("timeline-workspace");
    });
  }

  function setPartTab(tab) {
    state.partTab = ["properties", "transform", "animation"].includes(tab) ? tab : "properties";
    document.querySelectorAll("[data-part-tab]").forEach((button) => {
      const active = button.dataset.partTab === state.partTab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-part-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.partPanel !== state.partTab;
    });
  }

  function findComponentById(component, id) {
    if (!component || !id) return null;
    if (component.id === id) return component;
    for (const child of component.children || []) {
      const match = findComponentById(child, id);
      if (match) return match;
    }
    return null;
  }

  function componentOwnsAnimation(component) {
    if (!component) return false;
    const timeline = component.animationTimeline;
    if (timeline && Array.isArray(timeline.clips)) {
      return timeline.enabled !== false && timeline.clips.some((clip) => clip.enabled !== false);
    }
    return component.animationEnabled !== false
      && Boolean(component.animationType)
      && component.animationType !== "none";
  }

  function motionDriverAnimationOwner(component) {
    if (!component) return null;
    if (componentOwnsAnimation(component)) return component;
    if (component.type !== "group" || !(component.children || []).length) return null;
    const driver = component.children.find((child) => child.id === component.motionDriverId)
      || component.children.find(componentOwnsAnimation)
      || component.children.find((child) => motionDriverAnimationOwner(child));
    return driver ? motionDriverAnimationOwner(driver) : null;
  }

  function componentPathFromIds(root, pathIds) {
    if (!root) return [];
    const path = [root];
    let current = root;
    const ids = Array.isArray(pathIds) ? pathIds : [];
    const startIndex = ids[0] === root.id ? 1 : 0;
    for (let index = startIndex; index < ids.length; index += 1) {
      const child = (current.children || []).find((item) => item.id === ids[index]);
      if (!child) break;
      path.push(child);
      current = child;
    }
    return path;
  }

  function componentFromPathIds(root, pathIds) {
    const path = componentPathFromIds(root, pathIds);
    const ids = Array.isArray(pathIds) ? pathIds : [];
    return path.length && path.length === ids.length ? path.at(-1) : null;
  }

  function componentPathToTarget(root, target) {
    if (!root || !target) return null;
    if (root === target) return [root];
    for (const child of root.children || []) {
      const childPath = componentPathToTarget(child, target);
      if (childPath) return [root, ...childPath];
    }
    return null;
  }

  function resolvedTimelineTarget(component, path) {
    return {
      component,
      pathIds: path.map((item) => item.id),
    };
  }

  function resolveTimelineTargetForHit(root, pathIds) {
    const path = componentPathFromIds(root, pathIds);
    for (let index = path.length - 1; index >= 0; index -= 1) {
      if (componentOwnsAnimation(path[index])) {
        return resolvedTimelineTarget(path[index], path.slice(0, index + 1));
      }
    }
    for (let index = path.length - 1; index >= 0; index -= 1) {
      const owner = motionDriverAnimationOwner(path[index]);
      const ownerPath = componentPathToTarget(root, owner);
      if (owner && ownerPath) return resolvedTimelineTarget(owner, ownerPath);
    }
    return resolvedTimelineTarget(root, [root]);
  }

  // This small ID-only adapter is also exercised directly by the nested-motion
  // regression harness, while the live UI uses the richer target object above.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function resolveTimelineTargetIdForHit(root, pathIds) {
    return resolveTimelineTargetForHit(root, pathIds).component?.id || null;
  }

  function timelineTargetOptions(component) {
    const targets = [];
    const visit = (item, depth, parentPathIds) => {
      const pathIds = [...parentPathIds, item.id];
      const qualifier = depth === 0
        ? (item.type === "group" ? "whole merged item" : "part")
        : (item.type === "group" ? "nested merged item" : "child");
      targets.push({
        id: item.id,
        key: JSON.stringify(pathIds),
        pathIds,
        name: `${depth ? `${"\u21B3 ".repeat(depth)}` : ""}${item.name} \u00B7 ${qualifier}`,
        component: item,
      });
      (item.children || []).forEach((child) => visit(child, depth + 1, pathIds));
    };
    if (component) visit(component, 0, []);
    return targets;
  }

  function timelineTargetComponent() {
    const component = selectedComponent();
    if (!component) return null;
    return componentFromPathIds(component, state.timelineTargetPathIds)
      || findComponentById(component, state.timelineTargetId)
      || component;
  }

  function ensureTimeline(component) {
    if (!component || !timelineEngine) return null;
    // normalizeComponent() already normalizes every loaded/new part. Avoid
    // replacing the timeline object on every lookup because event handlers may
    // otherwise remove a clip from a stale array while the component keeps a
    // newer normalized copy.
    if (!component.animationTimeline || !Array.isArray(component.animationTimeline.clips)) {
      component.animationTimeline = timelineEngine.normalizeTimeline(component.animationTimeline, component);
    }
    return component.animationTimeline;
  }

  function selectedTimelineClip() {
    const timeline = ensureTimeline(timelineTargetComponent());
    if (!timeline) return null;
    return timeline.clips.find((clip) => clip.id === state.timelineClipId) || timeline.clips[0] || null;
  }

  function animationTypeOptions(selected = "") {
    return (timelineEngine?.TYPES || []).map((type) => `<option value="${escapeHtml(type.value)}"${type.value === selected ? " selected" : ""}>${escapeHtml(type.label)}</option>`).join("");
  }

  function timelineCurrentSeconds(now = state.lastFrameTime || performance.now()) {
    if (Number.isFinite(state.timelineScrubSeconds)) return Math.max(0, state.timelineScrubSeconds);
    if (!timelineEngine || !currentDesign()) return 0;
    return sharedDesignTimelineSeconds(now);
  }

  function updateTimelinePlayhead(now = state.lastFrameTime || performance.now()) {
    if (!state.timelineOpen) return;
    const target = timelineTargetComponent();
    const timeline = target?.animationTimeline;
    const input = document.getElementById("timeline-playhead");
    const label = document.getElementById("timeline-time-label");
    if (!timelineEngine || !timeline || !input) return;
    const duration = sharedDesignTimelineDuration();
    const seconds = Math.min(duration, timelineCurrentSeconds(now));
    input.max = String(duration);
    if (document.activeElement !== input) input.value = String(seconds);
    if (label) label.textContent = `${seconds.toFixed(2)}s / ${duration.toFixed(2)}s`;
    document.querySelectorAll("[data-timeline-clip-id]").forEach((row) => {
      const clip = timeline.clips.find((item) => item.id === row.dataset.timelineClipId);
      row.classList.toggle("playing", Boolean(clip && seconds >= clip.start && seconds <= clip.start + clip.duration));
    });
  }

  function timelineSnapStep() {
    return Math.max(0.01, Number(document.getElementById("timeline-snap-step")?.value) || 0.05);
  }

  function animationTypeIcon(type) {
    const paths = {
      move: '<path d="M5 18 18 5M11 5h7v7"/>',
      oscillate: '<path d="M4 12h16M7 9l-3 3 3 3m10-6 3 3-3 3"/>',
      loop: '<path d="M6 8h9a4 4 0 0 1 0 8H9"/><path d="m11 13-3 3 3 3"/>',
      fourStep: '<path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z"/>',
      rotate: '<path d="M19 8V4l-3 2.2A8 8 0 1 0 20 13"/><path d="M19 4h-4"/>',
      bob: '<path d="M12 4v16m-3-13 3-3 3 3m-6 10 3 3 3-3"/>',
      pulse: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/>',
      splitRectangles: '<path d="M4 5h7v14H4zM13 5h7v6h-7zM13 13h7v6h-7z"/>',
      fadeIn: '<path d="M12 4a8 8 0 1 1 0 16Z"/><path d="M12 4v16"/>',
      fadeOut: '<path d="M12 4a8 8 0 1 0 0 16Z"/><path d="M12 4v16"/>',
      blink: '<circle cx="12" cy="12" r="7"/><path d="M12 5v14"/>',
      visibility: '<path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z"/><circle cx="12" cy="12" r="2.5"/>',
      wait: '<path d="M8 5v14M16 5v14"/>',
    };
    return `<svg class="studio-vector-icon timeline-vector-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[type] || '<path d="m12 3 5 5-5 5-5-5 5-5Z"/>'}</svg>`;
  }

  function orderedTimelineClips(timeline) {
    return timelineWorkspaceEngine?.sortClips
      ? timelineWorkspaceEngine.sortClips(timeline?.clips || [])
      : [...(timeline?.clips || [])].sort((first, second) => (first.start || 0) - (second.start || 0));
  }

  function updateAnimationTimelineUI() {
    const selected = selectionComponents();
    const component = selectedComponent();
    const bulkSelection = state.selectAllParts || selected.length > 1;
    const targetPicker = document.getElementById("timeline-target-picker");
    const targetHelp = document.getElementById("timeline-target-help");
    const card = document.querySelector(".animation-timeline-card");
    const empty = document.getElementById("timeline-empty");
    const editor = document.getElementById("timeline-clip-editor");
    const palette = document.getElementById("timeline-type-palette");
    const tracks = document.getElementById("timeline-ruler-tracks");
    const scale = document.getElementById("timeline-ruler-scale");
    const scrollCanvas = document.getElementById("timeline-scroll-canvas");
    if (!timelineEngine || !targetPicker || !card || !empty || !editor) return;

    if (palette && !palette.children.length) {
      palette.innerHTML = (timelineEngine.TYPES || []).map((type) => `
        <button type="button" draggable="true" data-animation-type="${escapeHtml(type.value)}" title="Drag ${escapeHtml(type.label)} onto the timeline">
          <span>${animationTypeIcon(type.value)}</span>
          <span class="timeline-type-copy"><strong>${escapeHtml(type.label)}</strong><em>${Number(type.presetDuration || 2).toFixed(0)} sec preset</em></span>
        </button>`).join("");
    }

    const renderEmptyTimeline = (message) => {
      const duration = timelineEngine.MIN_TIMELINE_SECONDS || 30;
      const width = timelineWorkspaceEngine?.timelinePixelWidth?.(duration) || 1320;
      if (scrollCanvas) scrollCanvas.style.width = `${width}px`;
      if (scale) {
        scale.innerHTML = Array.from({ length: 7 }, (_, index) => `<span style="left:${index / 6 * 100}%">${index * 5}s</span>`).join("");
      }
      if (tracks) {
        tracks.dataset.timelineDuration = String(duration);
        tracks.dataset.pixelsPerSecond = String(timelineWorkspaceEngine?.PIXELS_PER_SECOND || 44);
        tracks.innerHTML = `<div class="timeline-empty-drop-zone" data-timeline-drop-lane><strong>${escapeHtml(message)}</strong><span>The ruler starts at 0 seconds and runs to 30 seconds.</span></div>`;
      }
    };

    if (!component || bulkSelection) {
      targetPicker.innerHTML = '<option value="">Select one part</option>';
      targetPicker.disabled = true;
      card.classList.add("empty-target");
      if (palette) palette.querySelectorAll("button").forEach((button) => { button.disabled = true; });
      empty.hidden = false;
      empty.querySelector("strong").textContent = bulkSelection ? "Select one part to edit its timeline." : "Select a part to create an animation timeline.";
      empty.querySelector("p").textContent = "Timelines are edited one part at a time so every clip keeps a clear owner.";
      editor.hidden = true;
      renderEmptyTimeline("Select one part to begin");
      if (targetHelp) targetHelp.textContent = "Select one machine part, then add or drag an animation type onto the timeline.";
      return;
    }

    if (palette) palette.querySelectorAll("button").forEach((button) => { button.disabled = false; });
    const targets = timelineTargetOptions(component);
    const requestedTargetKey = JSON.stringify(state.timelineTargetPathIds || []);
    const selectedTarget = targets.find((item) => item.key === requestedTargetKey)
      || targets.find((item) => item.id === state.timelineTargetId)
      || targets[0];
    state.timelineTargetId = selectedTarget?.id || component.id;
    state.timelineTargetPathIds = selectedTarget?.pathIds || [component.id];
    targetPicker.innerHTML = targets.map((item) => `<option value="${escapeHtml(item.key)}">${escapeHtml(item.name)}</option>`).join("");
    targetPicker.value = selectedTarget?.key || JSON.stringify([component.id]);
    targetPicker.disabled = targets.length <= 1;
    const target = selectedTarget?.component || component;
    const timeline = ensureTimeline(target);
    const sharedSettings = sharedDesignTimelineSettings();
    card.classList.remove("empty-target");
    if (targetHelp) targetHelp.textContent = target === component
      ? `Editing ${target.name} on the shared machine clock. Drag a clip body to overlap it with another clip; extending its right edge pushes later clips right.`
      : `Editing child part ${target.name} inside ${component.name}. Its clips keep their own track positions but play from the same machine-wide clock.`;

    const clips = timeline.clips;
    if (!clips.some((clip) => clip.id === state.timelineClipId)) state.timelineClipId = clips[0]?.id || null;
    const activeClip = selectedTimelineClip();
    const duration = sharedDesignTimelineDuration();
    const summary = document.getElementById("timeline-summary");
    if (summary) summary.textContent = `${clips.length} clip${clips.length === 1 ? "" : "s"} \u00B7 0\u2013${duration.toFixed(0)} sec`;

    const masterValues = {
      "timeline-enabled": timeline.enabled,
      "timeline-loop": sharedSettings.loop,
      "timeline-playback-rate": sharedSettings.playbackRate,
      "timeline-duration": duration,
    };
    Object.entries(masterValues).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (!input || document.activeElement === input) return;
      if (input.type === "checkbox") input.checked = Boolean(value);
      else input.value = String(value);
    });

    document.querySelectorAll('[data-timeline-clip-field="type"]').forEach((select) => {
      if (!select.options.length) select.innerHTML = animationTypeOptions(activeClip?.type || "move");
    });

    const tickStep = duration <= 60 ? 5 : duration <= 120 ? 10 : duration <= 300 ? 30 : 60;
    if (scale) {
      const ticks = [];
      for (let seconds = 0; seconds <= duration + 1e-9; seconds += tickStep) ticks.push(seconds);
      if (ticks[ticks.length - 1] < duration) ticks.push(duration);
      scale.innerHTML = ticks.map((seconds) => `<span style="left:${seconds / duration * 100}%">${seconds.toFixed(0)}s</span>`).join("");
    }

    const canvasWidth = timelineWorkspaceEngine?.timelinePixelWidth?.(duration) || Math.max(960, duration * 44);
    if (scrollCanvas) scrollCanvas.style.width = `${canvasWidth}px`;
    const lanes = timelineWorkspaceEngine?.layoutClipsIntoLanes
      ? timelineWorkspaceEngine.layoutClipsIntoLanes(clips)
      : orderedTimelineClips(timeline).map((clip) => [clip]);
    const clipMarkup = lanes.map((lane, laneIndex) => {
      const laneClips = lane.map((clip) => {
        const left = Math.max(0, Math.min(100, clip.start / duration * 100));
        const width = Math.max(0.25, Math.min(100 - left, clip.duration / duration * 100));
        const active = clip.id === state.timelineClipId ? " active" : "";
        const disabled = clip.enabled === false ? " disabled" : "";
        return `<button type="button" class="timeline-track${active}${disabled}" data-timeline-clip-id="${escapeHtml(clip.id)}" style="--clip-left:${left}%;--clip-width:${width}%" title="${escapeHtml(timelineEngine.describeClip(clip))}">
          <i class="timeline-resize-handle start" data-timeline-resize="start" aria-label="Resize start of ${escapeHtml(clip.name)}"></i>
          <span class="timeline-track-body" data-timeline-drag-body>
            <span class="timeline-track-icon">${animationTypeIcon(clip.type)}</span>
            <span class="timeline-track-copy"><strong>${escapeHtml(clip.name)}</strong><small>${clip.start.toFixed(2)}s \u2192 ${(clip.start + clip.duration).toFixed(2)}s \u00B7 ${clip.duration.toFixed(2)}s</small></span>
          </span>
          <i class="timeline-resize-handle end" data-timeline-resize="end" aria-label="Resize end of ${escapeHtml(clip.name)}"></i>
        </button>`;
      }).join("");
      return `<div class="timeline-track-row" data-timeline-lane="${laneIndex + 1}"><span class="timeline-row-number">${laneIndex + 1}</span><div class="timeline-track-lane" data-timeline-drop-lane>${laneClips}</div></div>`;
    }).join("");
    if (tracks) {
      tracks.dataset.timelineDuration = String(duration);
      tracks.dataset.pixelsPerSecond = String(timelineWorkspaceEngine?.PIXELS_PER_SECOND || 44);
      tracks.innerHTML = clipMarkup || '<div class="timeline-empty-drop-zone" data-timeline-drop-lane><strong>Drop an animation here</strong><span>or click a preset to append it from left to right</span></div>';
    }

    empty.hidden = Boolean(activeClip);
    if (!activeClip) {
      empty.querySelector("strong").textContent = clips.length ? "No animation clip selected." : "No animation clips yet.";
      empty.querySelector("p").textContent = clips.length
        ? "Click a clip in the bottom timeline to open all of its settings here."
        : "Open the timeline, then click or drag an animation type to add the first clip.";
    }
    editor.hidden = !activeClip;
    if (activeClip) {
      const description = document.getElementById("timeline-clip-description");
      if (description) description.textContent = timelineEngine.describeClip(activeClip);
      editor.querySelectorAll("[data-timeline-clip-field]").forEach((input) => {
        const field = input.dataset.timelineClipField;
        if (document.activeElement !== input) input.value = String(activeClip[field] ?? "");
      });
      editor.querySelectorAll("[data-timeline-clip-check]").forEach((input) => {
        const field = input.dataset.timelineClipCheck;
        input.checked = Boolean(activeClip[field]);
      });
      editor.querySelectorAll("[data-timeline-for]").forEach((element) => {
        element.hidden = !element.dataset.timelineFor.split(/\s+/).includes(activeClip.type);
      });
      const axisLabel = document.getElementById("timeline-axis-label");
      if (axisLabel) axisLabel.textContent = activeClip.type === "splitRectangles" ? "Spread axis" : "Axis";
      const amountLabel = document.getElementById("timeline-amount-label");
      if (amountLabel) {
        amountLabel.textContent = activeClip.type === "rotate"
          ? "Rotation angle (degrees)"
          : activeClip.type === "pulse"
            ? "Scale change (%)"
            : activeClip.type === "splitRectangles"
              ? "Fragment spread (ft)"
              : activeClip.type === "bob"
              ? "Vertical distance (ft)"
              : "Distance (ft)";
      }
      const rotationDirection = document.getElementById("timeline-rotation-direction");
      if (rotationDirection) {
        const angle = Number(activeClip.amount) || 0;
        rotationDirection.textContent = Math.abs(angle) < 0.00001
          ? "Current direction: none (angle is 0\u00B0)"
          : `Current direction: ${angle < 0 ? "reverse (-)" : "forward (+)"}`;
      }
    }
    const playing = state.previewAnimations && !Number.isFinite(state.timelineScrubSeconds);
    const playButton = document.getElementById("timeline-play");
    const pauseButton = document.getElementById("timeline-pause");
    if (playButton) {
      playButton.disabled = playing;
      playButton.classList.toggle("active", playing);
    }
    if (pauseButton) {
      pauseButton.disabled = !playing;
      pauseButton.classList.toggle("active", !playing);
    }
    updateTimelinePlayhead();
  }

  function setAnimationPreview(playing, restart = false) {
    const now = performance.now();
    if (restart) {
      state.animationTimeOffset = now;
      state.animationPausedAt = now;
      state.timelineScrubSeconds = null;
    }
    if (playing && !state.previewAnimations) {
      if (Number.isFinite(state.timelineScrubSeconds)) {
        const rate = Math.max(0.0001, Number(sharedDesignTimelineSettings().playbackRate) || 0.0001);
        state.animationTimeOffset = now - state.timelineScrubSeconds * 1000 / rate;
      }
      else state.animationTimeOffset += Math.max(0, now - state.animationPausedAt);
    }
    if (!playing && state.previewAnimations) state.animationPausedAt = now;
    state.previewAnimations = playing;
    if (playing) state.timelineScrubSeconds = null;
    const topButton = document.getElementById("preview-design-animations");
    if (topButton) {
      topButton.classList.toggle("active", playing);
      topButton.textContent = playing ? "Pause animations" : "Resume animations";
    }
    updateAnimationTimelineUI();
    renderPerformance.invalidate?.("animation-preview");
  }

  function updateDesignList() {
    const list = document.getElementById("design-list");
    const count = document.getElementById("design-count");
    const query = document.getElementById("design-search")?.value.trim().toLowerCase() || "";
    const designs = Object.values(library)
      .filter((design) => !query || `${design.name} ${design.machineType} ${design.description}`.toLowerCase().includes(query))
      .sort((first, second) => first.name.localeCompare(second.name));
    if (count) count.textContent = `${Object.keys(library).length} design${Object.keys(library).length === 1 ? "" : "s"}`;
    if (!list) return;
    list.innerHTML = designs.map((design) => `
      <div class="design-list-row ${design.id === state.designId ? "active" : ""}">
        <button type="button" data-design-id="${escapeHtml(design.id)}" class="design-list-select ${design.id === state.designId ? "active" : ""}">
          <span>${escapeHtml(design.name)}</span>
          <small>${escapeHtml(design.machineType)} \u00B7 ${design.components.length} parts${builtinIds.has(design.id) ? " \u00B7 preset" : " \u00B7 custom"}</small>
        </button>
        <button type="button" class="design-list-delete" data-delete-design-id="${escapeHtml(design.id)}" title="Delete ${escapeHtml(design.name)}" aria-label="Delete ${escapeHtml(design.name)}">&times;</button>
      </div>
    `).join("") || `<p class="studio-empty">No designs match this search.</p>`;
    list.querySelectorAll("[data-design-id]").forEach((button) => {
      button.addEventListener("click", () => selectDesign(button.dataset.designId));
    });
    list.querySelectorAll("[data-delete-design-id]").forEach((button) => {
      button.addEventListener("click", () => deleteDesign(button.dataset.deleteDesignId));
    });
  }

  function updateDesignListSelection() {
    const list = document.getElementById("design-list");
    if (!list) return;
    list.querySelectorAll("[data-design-id]").forEach((button) => {
      button.classList.toggle("active", button.dataset.designId === state.designId);
      button.closest(".design-list-row")?.classList.toggle("active", button.dataset.designId === state.designId);
    });
  }

  function envelopePointsForComponent(component, visibleOnly = false) {
    if (!component || (visibleOnly && component.visible === false)) return [];
    if (component.type === "group") {
      return (component.children || []).flatMap((child) => envelopePointsForComponent(child, visibleOnly));
    }
    return componentWorldPoints(component);
  }

  function designGeometryBounds(design, visibleOnly = false) {
    const points = (design?.components || []).flatMap((component) => envelopePointsForComponent(component, visibleOnly));
    if (!points.length) return null;
    return {
      minX: Math.min(...points.map((point) => point[0])),
      maxX: Math.max(...points.map((point) => point[0])),
      minY: Math.min(...points.map((point) => point[1])),
      maxY: Math.max(...points.map((point) => point[1])),
      minZ: Math.min(...points.map((point) => point[2])),
      maxZ: Math.max(...points.map((point) => point[2])),
    };
  }

  function updateEnvelopeStatus(design) {
    const status = document.getElementById("design-envelope-status");
    if (!status) return;
    const bounds = designGeometryBounds(design);
    if (!design || !bounds) {
      status.textContent = "Add at least one part, then use Tight fit to build the envelope around it.";
      status.classList.remove("warning");
      return;
    }
    const geometry = {
      w: bounds.maxX - bounds.minX,
      d: bounds.maxZ - bounds.minZ,
      h: bounds.maxY - bounds.minY,
    };
    const baseX = Number(design.base.x) || 0;
    const baseY = Number(design.base.y) || 0;
    const baseZ = Number(design.base.z) || 0;
    const outside = bounds.minX < baseX - 0.0005
      || bounds.minY < baseY - 0.0005
      || bounds.minZ < baseZ - 0.0005
      || bounds.maxX > baseX + design.base.w + 0.0005
      || bounds.maxY > baseY + design.base.h + 0.0005
      || bounds.maxZ > baseZ + design.base.d + 0.0005;
    status.textContent = `Envelope at ${baseX.toFixed(3)}, ${baseY.toFixed(3)}, ${baseZ.toFixed(3)} ft \u00B7 Size ${design.base.w.toFixed(3)} \u00D7 ${design.base.d.toFixed(3)} \u00D7 ${design.base.h.toFixed(3)} ft \u00B7 Tight part bounds ${geometry.w.toFixed(3)} \u00D7 ${geometry.d.toFixed(3)} \u00D7 ${geometry.h.toFixed(3)} ft${outside ? " \u00B7 Some geometry extends outside the envelope." : ""}`;
    status.classList.toggle("warning", outside);
  }

  function updateDesignFields({ includeEnvelope = true } = {}) {
    const design = currentDesign();
    const map = {
      "design-name": design?.name || "",
      "design-machine-type": design?.machineType || "",
      "design-description": design?.description || "",
      "design-base-x": design?.base.x ?? 0,
      "design-base-y": design?.base.y ?? 0,
      "design-base-z": design?.base.z ?? 0,
      "design-base-w": design?.base.w || "",
      "design-base-d": design?.base.d || "",
      "design-base-h": design?.base.h || "",
    };
    Object.entries(map).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (input && document.activeElement !== input) input.value = String(value);
    });
    const deleteButton = document.getElementById("delete-design");
    if (deleteButton) {
      deleteButton.disabled = !design;
      deleteButton.textContent = "Delete machine";
      deleteButton.title = design ? `Delete ${design.name}` : "Select a machine to delete";
    }
    const resetButton = document.getElementById("reset-design");
    if (resetButton) resetButton.disabled = !design || !defaults[design.id];
    const showEnvelope = document.getElementById("show-design-envelope");
    if (showEnvelope && document.activeElement !== showEnvelope) showEnvelope.checked = state.showDesignEnvelope;
    updateDesignEnvelopeShapeEditor(design);
    if (includeEnvelope) updateEnvelopeStatus(design);
  }

  function designEnvelopePieces(design = currentDesign()) {
    if (!design) return [];
    if (!Array.isArray(design.collisionEnvelopes)) design.collisionEnvelopes = [];
    return design.collisionEnvelopes;
  }

  function selectedDesignEnvelopePiece(design = currentDesign()) {
    const pieces = designEnvelopePieces(design);
    let selected = pieces.find((piece) => piece.id === state.designEnvelopeId) || null;
    if (!selected && pieces.length) {
      selected = pieces[0];
      state.designEnvelopeId = selected.id;
    }
    return selected;
  }

  function updateDesignEnvelopeShapeEditor(design = currentDesign()) {
    const pieces = designEnvelopePieces(design);
    const selected = selectedDesignEnvelopePiece(design);
    const picker = document.getElementById("design-envelope-piece");
    const signature = pieces.map((piece) => `${piece.id}:${piece.name}`).join("|");
    if (picker && picker.dataset.signature !== signature) {
      picker.dataset.signature = signature;
      picker.innerHTML = pieces.length
        ? pieces.map((piece, index) => `<option value="${escapeHtml(piece.id)}">${escapeHtml(piece.name || `Envelope box ${index + 1}`)}</option>`).join("")
        : `<option value="">Base rectangle (automatic)</option>`;
    }
    if (picker) {
      picker.disabled = pieces.length === 0;
      picker.value = selected?.id || "";
    }
    document.querySelectorAll("[data-design-envelope-field]").forEach((input) => {
      const field = input.dataset.designEnvelopeField;
      input.disabled = !selected;
      if (document.activeElement !== input) input.value = selected ? String(selected[field]) : "";
    });
    const count = document.getElementById("design-envelope-piece-count");
    if (count) count.textContent = pieces.length ? `${pieces.length} editable box${pieces.length === 1 ? "" : "es"}` : "Base rectangle";
    document.getElementById("duplicate-design-envelope-piece")?.toggleAttribute("disabled", !selected);
    document.getElementById("remove-design-envelope-piece")?.toggleAttribute("disabled", !selected);
  }

  let componentListStructureSignature = "";

  function updateComponentList() {
    const list = document.getElementById("component-list");
    const count = document.getElementById("component-count");
    const design = currentDesign();
    const query = document.getElementById("component-search")?.value.trim().toLowerCase() || "";
    const components = (design?.components || []).filter((component) => !query || `${component.name} ${component.type}`.toLowerCase().includes(query));
    if (count) count.textContent = `${design?.components.length || 0} part${design?.components.length === 1 ? "" : "s"}`;
    if (!list) return;
    const structureSignature = `${state.designId}|${query}|${components.map((component) => [
      component.id, component.name, component.type, component.color, component.visible !== false,
      component.embeddedMachine === true, componentHasAnimation(component),
    ].join(":" )).join("|")}`;
    if (componentListStructureSignature === structureSignature) {
      list.querySelectorAll("[data-component-row]").forEach((row) => {
        row.classList.toggle("active", state.selectAllParts || state.selectedComponentIds.has(row.dataset.componentRow));
      });
      return;
    }
    componentListStructureSignature = structureSignature;
    list.innerHTML = components.map((component, index) => `
      <div class="component-tree-row ${state.selectAllParts || state.selectedComponentIds.has(component.id) ? "active" : ""}" data-component-row="${escapeHtml(component.id)}">
        <button type="button" class="component-visibility" data-toggle-component="${escapeHtml(component.id)}" title="${component.visible === false ? "Show" : "Hide"} component" aria-label="${component.visible === false ? "Show" : "Hide"} ${escapeHtml(component.name)}"><span class="component-visibility-dot${component.visible === false ? " is-hidden" : ""}" aria-hidden="true"></span></button>
        <button type="button" class="component-select" data-component-id="${escapeHtml(component.id)}">
          <i style="background:${escapeHtml(component.color)}"></i><span><strong>${escapeHtml(component.name)}</strong><small>${index + 1} \u00B7 ${escapeHtml(component.embeddedMachine ? "machine" : component.type)}${component.embeddedMachine ? " \u00B7 embedded" : ""}${componentHasAnimation(component) ? ` \u00B7 animated` : ""}</small></span>
        </button>
      </div>
    `).join("") || `<p class="studio-empty">No parts match this search.</p>`;
    list.querySelectorAll("[data-component-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const component = design.components.find((item) => item.id === button.dataset.componentId);
        const additive = event.shiftKey || event.ctrlKey || event.metaKey;
        const timelineTarget = !additive && component
          ? resolveTimelineTargetForHit(component, [component.id])
          : null;
        selectComponent(
          button.dataset.componentId,
          false,
          additive,
          timelineTarget?.component?.id || null,
          timelineTarget?.pathIds || null,
        );
      });
    });
    list.querySelectorAll("[data-toggle-component]").forEach((button) => {
      button.addEventListener("click", () => {
        const component = design.components.find((item) => item.id === button.dataset.toggleComponent);
        if (!component) return;
        pushHistory();
        component.visible = component.visible === false;
        commit(component.visible ? "Component shown." : "Component hidden.");
      });
    });
  }

  const BULK_COMPONENT_FIELDS = new Set([
    "color", "opacity", "animationType", "animationAxis", "animationSecondaryAxis",
    "animationAmount", "animationSecondaryAmount", "animationSpeed", "animationPauseSeconds", "animationSecondaryPauseSeconds", "animationStep1PauseSeconds", "animationStep2PauseSeconds", "animationStep3PauseSeconds", "animationStep4PauseSeconds", "animationPhase",
  ]);
  const BULK_COMPONENT_CHECKS = new Set(["visible", "animationEnabled"]);

  function commonSelectionValue(components, field) {
    if (!components.length) return { mixed: false, value: "" };
    const first = components[0]?.[field];
    const mixed = components.some((component) => String(component?.[field] ?? "") !== String(first ?? ""));
    return { mixed, value: first ?? "" };
  }

  function recolorComponentTree(component, color) {
    component.color = color;
    if (component.type === "group") (component.children || []).forEach((child) => recolorComponentTree(child, color));
  }

  function updateComponentProperties() {
    const section = document.getElementById("component-properties");
    const empty = document.getElementById("empty-component-state");
    const selected = selectionComponents();
    const component = selectedComponent();
    const selectedCount = selected.length;
    const wholeDesign = state.selectAllParts;
    const multiSelection = selectedCount > 1;
    const bulkSelection = wholeDesign || multiSelection;
    const typeLabel = document.getElementById("selected-component-type");
    if (section) {
      section.hidden = selectedCount === 0;
      section.classList.toggle("multi-component-edit", bulkSelection);
    }
    if (empty) {
      empty.hidden = selectedCount > 0;
      const title = empty.querySelector("strong");
      const help = empty.querySelector("p");
      if (title) title.textContent = "Select a part in the viewport or Parts list.";
      if (help) help.textContent = "Use Move, Rotate, or Scale after selecting a component. Transform controls always stay above the model.";
    }
    if (typeLabel) typeLabel.textContent = wholeDesign
      ? `All ${currentDesign()?.components.length || 0} parts \u00B7 shared settings`
      : multiSelection ? `${selectedCount} selected parts \u00B7 shared settings` : (component ? component.type : "Nothing selected");

    document.getElementById("select-all-components")?.classList.toggle("active", wholeDesign);
    document.getElementById("duplicate-component")?.toggleAttribute("disabled", selectedCount === 0);
    document.getElementById("delete-component")?.toggleAttribute("disabled", selectedCount === 0);
    document.getElementById("merge-components")?.toggleAttribute("disabled", selectedCount < 2);
    document.getElementById("ungroup-component")?.toggleAttribute("disabled", component?.type !== "group");
    document.getElementById("move-component-up")?.toggleAttribute("disabled", !component);
    document.getElementById("move-component-down")?.toggleAttribute("disabled", !component);
    document.querySelectorAll("[data-mirror-component]").forEach((button) => {
      button.toggleAttribute("disabled", selectedCount === 0);
    });
    if (!selectedCount || !section) return;

    const primary = component || selected[0];
    section.querySelectorAll("[data-component-field]").forEach((input) => {
      const field = input.dataset.componentField;
      if (document.activeElement === input) return;
      const bulkEditable = BULK_COMPONENT_FIELDS.has(field);
      input.disabled = bulkSelection && !bulkEditable;
      input.dataset.mixed = "false";
      input.removeAttribute("title");

      if (bulkSelection) {
        const common = commonSelectionValue(selected, field);
        if (bulkEditable) {
          input.value = String(common.value ?? "");
          input.dataset.mixed = String(common.mixed);
          if (common.mixed) input.title = "Mixed values. Changing this control applies the new value to every selected part.";
        } else {
          input.value = "";
          input.placeholder = field === "name" ? `${selectedCount} selected parts` : "Use transform handles";
        }
        return;
      }

      input.placeholder = "";
      if (primary.type === "group" && ["x", "y", "z"].includes(field)) {
        const center = componentCenter(primary);
        input.value = center[{ x: 0, y: 1, z: 2 }[field]] ?? 0;
      } else if (primary.type === "beam" && field === "length") {
        input.value = pointDistance([primary.x, primary.y, primary.z], [primary.x2, primary.y2, primary.z2]).toFixed(2);
      } else input.value = primary[field] ?? "";
    });

    section.querySelectorAll("[data-component-scale]").forEach((input) => {
      const axis = input.dataset.componentScale;
      input.disabled = selectedCount === 0;
      const values = selected.map((item) => {
        if (axis === "uniform") {
          const all = [Number(item.scaleXPercent) || 100, Number(item.scaleYPercent) || 100, Number(item.scaleZPercent) || 100];
          return Math.max(...all) - Math.min(...all) < .01 ? all[0] : "";
        }
        return Number(item[`scale${axis.toUpperCase()}Percent`]) || 100;
      });
      const first = values[0];
      const mixed = values.some((value) => String(value) !== String(first));
      if (document.activeElement !== input) input.value = mixed ? "" : Number(first).toFixed(2);
      input.placeholder = mixed ? "Mixed" : "100";
      input.dataset.mixed = String(mixed);
    });

    section.querySelectorAll("[data-component-check]").forEach((input) => {
      const field = input.dataset.componentCheck;
      input.disabled = bulkSelection && !BULK_COMPONENT_CHECKS.has(field);
      if (bulkSelection && BULK_COMPONENT_CHECKS.has(field)) {
        const values = selected.map((item) => item[field] !== false);
        input.checked = values.every(Boolean);
        input.indeterminate = values.some(Boolean) && !values.every(Boolean);
      } else {
        input.indeterminate = false;
        input.checked = primary[field] !== false;
      }
    });

    section.querySelectorAll("[data-for-component]").forEach((element) => {
      if (bulkSelection) {
        element.hidden = true;
        return;
      }
      const supported = element.dataset.forComponent.split(/\s+/);
      element.hidden = !supported.includes(primary.type);
    });

    const motionDriver = document.getElementById("group-motion-driver");
    const groupChildPicker = document.getElementById("group-animation-child");
    const groupChildPanel = document.querySelector("[data-group-child-animation]");
    const children = !bulkSelection && primary.type === "group" ? (primary.children || []) : [];
    if (motionDriver) {
      motionDriver.innerHTML = children.map((child) => (
        `<option value="${escapeHtml(child.id)}">${escapeHtml(child.name)}${componentHasAnimation(child) ? " \u00B7 animated" : ""}</option>`
      )).join("");
      motionDriver.value = children.some((child) => child.id === primary.motionDriverId)
        ? primary.motionDriverId
        : (children[0]?.id || "");
      motionDriver.disabled = bulkSelection || primary.type !== "group" || children.length === 0;
    }
    if (groupChildPicker) {
      groupChildPicker.innerHTML = children.map((child) => `<option value="${escapeHtml(child.id)}">${escapeHtml(child.name)}</option>`).join("");
      const activeId = children.some((child) => child.id === primary.activeAnimationChildId)
        ? primary.activeAnimationChildId
        : (children[0]?.id || "");
      primary.activeAnimationChildId = activeId;
      groupChildPicker.value = activeId;
      groupChildPicker.disabled = children.length === 0;
    }
    const activeChild = children.find((child) => child.id === primary.activeAnimationChildId) || children[0] || null;
    if (groupChildPanel) {
      groupChildPanel.hidden = primary.type !== "group" || !activeChild;
      groupChildPanel.querySelectorAll("[data-group-child-field]").forEach((input) => {
        const field = input.dataset.groupChildField;
        if (document.activeElement !== input) input.value = activeChild ? String(activeChild[field] ?? "") : "";
        input.disabled = !activeChild;
      });
      groupChildPanel.querySelectorAll("[data-group-child-check]").forEach((input) => {
        const field = input.dataset.groupChildCheck;
        input.checked = activeChild ? activeChild[field] !== false : false;
        const driverOwnToggle = field === "playOwnAnimation" && activeChild?.id === primary.motionDriverId;
        input.disabled = !activeChild || driverOwnToggle;
        input.title = driverOwnToggle
          ? "The attachment parent always plays its own animation because that motion carries the assembly."
          : "";
      });
      const childIsFourStep = activeChild?.animationType === "fourStep";
      const childFourStep = groupChildPanel.querySelector("[data-child-four-step-controls]");
      if (childFourStep) childFourStep.hidden = !childIsFourStep;
      const childStandardPause = groupChildPanel.querySelector("[data-child-standard-pause]");
      if (childStandardPause) childStandardPause.hidden = childIsFourStep;
    }
    const fourStepControls = section.querySelector("[data-four-step-controls]");
    const mode = bulkSelection ? commonSelectionValue(selected, "animationType") : { mixed: false, value: primary.animationType };
    const isFourStep = !mode.mixed && mode.value === "fourStep";
    if (fourStepControls) fourStepControls.hidden = !isFourStep;
    const standardPause = section.querySelector("[data-standard-animation-pause]");
    if (standardPause) standardPause.hidden = isFourStep;

    const envelope = !bulkSelection ? primary.collisionEnvelope : null;
    section.querySelectorAll("[data-component-envelope-field]").forEach((input) => {
      const field = input.dataset.componentEnvelopeField;
      input.disabled = !envelope;
      if (document.activeElement !== input) input.value = envelope ? String(envelope[field]) : "";
    });
    const envelopeStatus = document.getElementById("component-envelope-status");
    if (envelopeStatus) envelopeStatus.textContent = bulkSelection
      ? "Select one part to edit its individual envelope."
      : envelope
        ? "This part envelope is active in the layout and first-person collision system."
        : "No individual envelope yet. Add one fitted to this part.";
    document.getElementById("fit-component-envelope")?.toggleAttribute("disabled", bulkSelection || !primary);
    document.getElementById("remove-component-envelope")?.toggleAttribute("disabled", bulkSelection || !envelope);

  }

  function commitActiveInspectorEdit() {
    const active = document.activeElement;
    if (!active || typeof active.matches !== "function") return;
    if (!active.matches([
      "[data-component-field]",
      "[data-component-scale]",
      "[data-component-check]",
      "[data-component-envelope-field]",
      "[data-group-child-field]",
      "[data-group-child-check]",
      "#design-name",
      "#design-machine-type",
      "#design-description",
      "#design-base-x",
      "#design-base-y",
      "#design-base-z",
      "#design-base-w",
      "#design-base-d",
      "#design-base-h",
    ].join(","))) return;
    // Text and number inputs emit their pending change synchronously as focus
    // leaves. Do this while the old selection is still current so that a click
    // on another part cannot apply the previous part's transform values to it.
    active.blur();
  }

  function visibleDesignColor(design) {
    const stack = [...(design?.components || [])];
    while (stack.length) {
      const component = stack.shift();
      if (!component || component.visible === false) continue;
      if (component.type === "group") {
        stack.unshift(...(component.children || []));
        continue;
      }
      return validColor(component.color, "#277d78");
    }
    return "#277d78";
  }

  function conciseMachineName(value) {
    const name = String(value || "New machine").trim() || "New machine";
    return name.length <= 28 ? name : `${name.slice(0, 25).trimEnd()}\u2026`;
  }

  function plantFloorBounds() {
    const floor = plantLayout.floor || {};
    const width = Math.max(40, Number(floor.width) || 470.83);
    const length = Math.max(40, Number(floor.length) || 262.5);
    const centerX = Number.isFinite(Number(floor.centerX)) ? Number(floor.centerX) : 2.085;
    const centerZ = Number.isFinite(Number(floor.centerZ)) ? Number(floor.centerZ) : -81.25;
    return {
      centerX,
      centerZ,
      minX: centerX - width / 2,
      maxX: centerX + width / 2,
      minZ: centerZ - length / 2,
      maxZ: centerZ + length / 2,
    };
  }

  function plantObjectBlocksPlacement(machine) {
    if (!machine || machine.visible === false) return false;
    if (["safetyLine", "trench", "floorDrain", "person", "animatedBeacon"].includes(machine.type)) return false;
    return machine.collisionMode !== "ignore";
  }

  function candidateOverlapsPlant(candidate, padding = 4) {
    return plantLayout.machines.some((machine) => {
      if (!plantObjectBlocksPlacement(machine)) return false;
      const left = Number(machine.x) - padding;
      const right = Number(machine.x) + Math.max(.02, Number(machine.w) || 1) + padding;
      const near = Number(machine.z) - padding;
      const far = Number(machine.z) + Math.max(.02, Number(machine.d) || 1) + padding;
      return candidate.x < right
        && candidate.x + candidate.w > left
        && candidate.z < far
        && candidate.z + candidate.d > near;
    });
  }

  function findPlantPlacement(width, depth, mode = "auto") {
    const floor = plantFloorBounds();
    const centered = {
      x: floor.centerX - width / 2,
      z: floor.centerZ - depth / 2,
      w: width,
      d: depth,
    };
    if (mode === "origin") return { x: -width / 2, z: -depth / 2 };
    if (mode === "center") return { x: centered.x, z: centered.z };
    if (!candidateOverlapsPlant(centered) && centered.x >= floor.minX && centered.x + width <= floor.maxX && centered.z >= floor.minZ && centered.z + depth <= floor.maxZ) {
      return { x: centered.x, z: centered.z };
    }

    const stepX = Math.max(10, Math.min(30, width * .55 + 6));
    const stepZ = Math.max(10, Math.min(30, depth * .55 + 6));
    const fits = (candidate) => candidate.x >= floor.minX + 2
      && candidate.x + width <= floor.maxX - 2
      && candidate.z >= floor.minZ + 2
      && candidate.z + depth <= floor.maxZ - 2;
    for (let ring = 1; ring <= 80; ring += 1) {
      for (let offset = -ring; offset <= ring; offset += 1) {
        const points = [
          [offset, -ring], [offset, ring], [-ring, offset], [ring, offset],
        ];
        for (const [gridX, gridZ] of points) {
          const candidate = {
            x: centered.x + gridX * stepX,
            z: centered.z + gridZ * stepZ,
            w: width,
            d: depth,
          };
          if (fits(candidate) && !candidateOverlapsPlant(candidate)) return { x: candidate.x, z: candidate.z };
        }
      }
    }
    return { x: centered.x, z: centered.z };
  }

  function populateCreationStages() {
    const select = document.getElementById("new-plant-machine-stage");
    if (!select) return;
    const currentValue = select.value || "last";
    const stages = Array.isArray(plantLayout.stages) ? plantLayout.stages : [];
    select.innerHTML = stages.length
      ? stages.map((stage, index) => `<option value="${index}">${escapeHtml(stage.title || stage.short || `Stage ${index + 1}`)}${index === stages.length - 1 ? " \u00B7 current" : ""}</option>`).join("")
      : '<option value="0">Current plant</option>';
    const preferred = currentValue === "last" ? String(Math.max(0, stages.length - 1)) : currentValue;
    select.value = [...select.options].some((option) => option.value === preferred)
      ? preferred
      : String(Math.max(0, stages.length - 1));
  }

  function createPlantMachineFromCurrentDesign() {
    const design = currentDesign();
    if (!design) {
      showToast("Create or select a design first.");
      return null;
    }
    if (!saveCurrentDesign({ silent: true })) return null;
    if (!Array.isArray(plantLayout.machines)) plantLayout.machines = [];
    const base = designBaseDimensions(design);
    const requestedName = document.getElementById("new-plant-machine-name")?.value.trim();
    const name = requestedName || design.name || "New machine";
    const placementMode = document.getElementById("new-plant-machine-placement")?.value || "auto";
    const placement = findPlantPlacement(base.w, base.d, placementMode);
    const stageValue = Number(document.getElementById("new-plant-machine-stage")?.value);
    const reveal = Number.isFinite(stageValue)
      ? Math.max(0, stageValue)
      : Math.max(0, (plantLayout.stages?.length || 1) - 1);
    const type = safeId(design.machineType || design.name || "custom-machine");
    const id = uniqueId(type);
    const instanceId = uniqueId(`${type}-instance`);
    const machine = {
      id,
      instanceId,
      name,
      short: conciseMachineName(name),
      useDesignName: !requestedName,
      type,
      category: "equipment",
      reveal,
      retire: 99,
      x: placement.x,
      y: 0,
      z: placement.z,
      w: base.w,
      d: base.d,
      h: base.h,
      naturalW: base.w,
      naturalD: base.d,
      naturalH: base.h,
      scaleXPercent: 100,
      scaleYPercent: 100,
      scaleZPercent: 100,
      scaleEditMode: "uniform",
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      rotation: 0,
      color: visibleDesignColor(design),
      visible: true,
      locked: false,
      showLabel: true,
      designId: design.id,
      designScaleMode: "match",
      collisionMode: "solid",
      placement_status: "designer_created",
      evidence: "Created from a reusable Machine Design Studio design.",
      custom: true,
      crane: null,
      animationEnabled: false,
      animationMode: "none",
      animationAxis: "x",
      animationSecondaryAxis: "z",
      animationDistance: 10,
      animationSecondaryDistance: 10,
      animationSpeed: .1,
      animationPauseSeconds: 0,
      animationStep1PauseSeconds: 0,
      animationStep2PauseSeconds: 0,
      animationStep3PauseSeconds: 0,
      animationStep4PauseSeconds: 0,
      animationPhase: 0,
    };
    plantLayout.machines.push(machine);
    state.linkedMachineId = instanceId;
    state.lastCreatedMachineId = instanceId;
    saveLibrary();
    saveLayout();
    updateAssignmentPanel();
    const assignment = document.getElementById("machine-assignment");
    if (assignment) assignment.value = instanceId;
    updateAssignmentPanel();
    const status = document.getElementById("create-plant-machine-status");
    if (status) {
      status.dataset.state = "success";
      status.textContent = `${name} was added to the Plant Layout at X ${machine.x.toFixed(1)}, Z ${machine.z.toFixed(1)}.`;
    }
    const openButton = document.getElementById("open-created-plant-machine");
    if (openButton) {
      openButton.hidden = false;
      openButton.dataset.machineId = instanceId;
    }
    const nameInput = document.getElementById("new-plant-machine-name");
    if (nameInput) nameInput.value = "";
    showToast(`${name} saved and added to the Plant Layout.`);
    return machine;
  }

  function plantLayoutUrl(machineId = "") {
    const isStaticStudio = /machine-studio\.html$/i.test(window.location.pathname);
    const base = isStaticStudio ? "preview.html" : "/";
    const query = new URLSearchParams({ edit: "1" });
    if (machineId) query.set("machine", machineId);
    return `${base}?${query.toString()}`;
  }

  function updateAssignmentPanel() {
    populateCreationStages();
    const design = currentDesign();
    const createButton = document.getElementById("create-plant-machine");
    if (createButton) createButton.disabled = !design;
    const createName = document.getElementById("new-plant-machine-name");
    if (createName && document.activeElement !== createName) createName.placeholder = design ? `Defaults to ${design.name}` : "Select a design first";
    const select = document.getElementById("machine-assignment");
    if (!select) return;
    const currentValue = select.value || queryMachineId || "";
    const machines = [...plantLayout.machines].sort((first, second) => String(first.name).localeCompare(String(second.name)));
    select.innerHTML = `<option value="">Choose a machine\u2026</option>${machines.map((machine) => (
      `<option value="${escapeHtml(machine.instanceId)}">${escapeHtml(machine.name || machine.type)} \u00B7 ${escapeHtml(machine.type || "object")}${machine.designId ? " \u00B7 custom design" : ""}</option>`
    )).join("")}`;
    select.value = machines.some((machine) => machine.instanceId === currentValue) ? currentValue : "";
    const status = document.getElementById("assignment-status");
    const machine = machines.find((item) => item.instanceId === select.value);
    const sizingMode = document.getElementById("assignment-scale-mode");
    const syncButton = document.getElementById("sync-machine-dimensions");
    if (machine) machine.scaleEditMode = normalizedMachineScaleEditMode(machine.scaleEditMode, machine);
    if (sizingMode) {
      sizingMode.disabled = !machine;
      sizingMode.value = normalizedDesignScaleMode(machine?.designScaleMode);
    }
    if (syncButton) syncButton.disabled = !machine || !currentDesign();
    document.querySelectorAll("[data-instance-field]").forEach((input) => {
      const field = input.dataset.instanceField;
      input.disabled = !machine;
      if (!machine || document.activeElement === input) return;
      input.value = Number(machine[field] ?? 0).toFixed(["x","y","z","w","d","h"].includes(field) ? 2 : 1);
    });
    document.querySelectorAll("[data-instance-scale]").forEach((input) => {
      const axis = input.dataset.instanceScale;
      input.disabled = !machine;
      if (!machine || document.activeElement === input) return;
      refreshPlantScaleMetadata(machine);
      if (axis === "uniform") {
        const values = [machine.scaleXPercent, machine.scaleYPercent, machine.scaleZPercent];
        input.value = Math.max(...values) - Math.min(...values) < .01 ? Number(values[0]).toFixed(2) : "";
        input.placeholder = input.value ? "100" : "Mixed";
      } else input.value = Number(machine[`scale${axis.toUpperCase()}Percent`] || 100).toFixed(2);
    });
    if (status) {
      const design = machine?.designId && library[machine.designId] ? library[machine.designId] : currentDesign();
      const dimensions = design?.base ? `${Number(design.base.w).toFixed(1)} \u00D7 ${Number(design.base.d).toFixed(1)} \u00D7 ${Number(design.base.h).toFixed(1)} ft` : "no custom envelope";
      const mode = normalizedDesignScaleMode(machine?.designScaleMode);
      const modeLabel = mode === "match" ? "matches and stays synced" : mode === "stretch" ? "stretches on each axis" : "preserves proportions";
      status.textContent = machine
        ? `${machine.name} \u00B7 ${dimensions} \u00B7 ${modeLabel}.${machine.instanceId === state.linkedMachineId ? " Every saved design change updates this plant object automatically." : ""}`
        : "Assignments save directly to the plant layout stored in this browser.";
    }
  }

  let deferredDesignSwitchRefresh = 0;
  let deferredDesignSwitchTimer = 0;

  function scheduleDesignSwitchPanelRefresh() {
    if (deferredDesignSwitchRefresh) window.cancelAnimationFrame(deferredDesignSwitchRefresh);
    if (deferredDesignSwitchTimer) window.clearTimeout(deferredDesignSwitchTimer);
    const designId = state.designId;
    deferredDesignSwitchRefresh = window.requestAnimationFrame(() => {
      deferredDesignSwitchRefresh = 0;
      // A zero-delay task after requestAnimationFrame lets the browser paint the
      // new machine first. Saved plant linking and secondary panels still catch
      // up immediately afterward, and rapid clicks collapse to the final choice.
      deferredDesignSwitchTimer = window.setTimeout(() => {
        deferredDesignSwitchTimer = 0;
        if (state.designId !== designId) return;
        syncLinkedMachineToCurrentDesign();
        if (state.browserTab === "add") updateEmbeddedMachinePicker();
        if (state.inspectorTab === "design") updateEnvelopeStatus(currentDesign());
        if (state.timelineOpen || state.partTab === "animation") updateAnimationTimelineUI();
        if (state.browserTab === "plant") updateAssignmentPanel();
      }, 0);
    });
  }

  function updateInterface({ designSwitch = false } = {}) {
    if (designSwitch) updateDesignListSelection();
    else updateDesignList();
    if (!designSwitch) updateEmbeddedMachinePicker();
    updateDesignFields({ includeEnvelope: !designSwitch });
    updateComponentList();
    updateComponentProperties();
    if (!designSwitch) updateAnimationTimelineUI();
    if (!designSwitch) updateAssignmentPanel();
    updateHistoryButtons();
    setBrowserTab(state.browserTab, { refresh: false });
    setInspectorTab(state.inspectorTab, { refresh: false });
    setPartTab(state.partTab);
    updateToolLabel();
    if (designSwitch) scheduleDesignSwitchPanelRefresh();
  }

  function selectionBounds(components = selectionComponents()) {
    const points = components.flatMap((component) => componentWorldPoints(component));
    if (!points.length) return null;
    return {
      minX: Math.min(...points.map((point) => point[0])),
      maxX: Math.max(...points.map((point) => point[0])),
      minY: Math.min(...points.map((point) => point[1])),
      maxY: Math.max(...points.map((point) => point[1])),
      minZ: Math.min(...points.map((point) => point[2])),
      maxZ: Math.max(...points.map((point) => point[2])),
    };
  }

  function selectionCenter(components = selectionComponents()) {
    const bounds = selectionBounds(components);
    return bounds
      ? [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2, (bounds.minZ + bounds.maxZ) / 2]
      : [0, 0, 0];
  }

  function componentCenter(component) {
    if (component.type === "group") return selectionCenter(component.children || []);
    if (["box", "glassPanel", "cylinder", "sphere", "cone", "wedge", "text"].includes(component.type)) {
      return [component.x + component.w / 2, component.y + component.h / 2, component.z + component.d / 2];
    }
    if (["beam", "arrow"].includes(component.type)) {
      return [(component.x + component.x2) / 2, (component.y + component.y2) / 2, (component.z + component.z2) / 2];
    }
    if (component.type === "rollerBed") return [component.x + component.w / 2, component.y, component.z + component.d / 2];
    return [component.x, component.y, component.z];
  }

  function project(x, y, z) {
    const design = currentDesign();
    const centerX = (Number(design?.base.x) || 0) + (design?.base.w || 20) / 2 + state.panX;
    const centerZ = (Number(design?.base.z) || 0) + (design?.base.d || 10) / 2 + state.panZ;
    x -= centerX;
    y -= state.panY;
    z -= centerZ;
    const cy = Math.cos(state.yaw);
    const sy = Math.sin(state.yaw);
    const rx = x * cy - z * sy;
    const rz = x * sy + z * cy;
    const cp = Math.cos(state.pitch);
    const sp = Math.sin(state.pitch);
    const scale = state.zoom * Math.min(canvas.width / 50, canvas.height / 28);
    return [canvas.width / 2 + rx * scale, canvas.height * 0.56 - (y * cp - rz * sp) * scale, y * sp + rz * cp];
  }

  function rendererViewState() {
    const design = currentDesign();
    return {
      mode: "orbit",
      centerX: (Number(design?.base.x) || 0) + (design?.base.w || 20) / 2 + state.panX,
      centerY: state.panY,
      centerZ: (Number(design?.base.z) || 0) + (design?.base.d || 10) / 2 + state.panZ,
      yaw: state.yaw,
      pitch: state.pitch,
      scale: state.zoom * Math.min(canvas.width / 50, canvas.height / 28),
      originY: .56,
      depthRange: Math.max(100, Math.hypot(design?.base.w || 20, design?.base.d || 10, design?.base.h || 8) * 12),
    };
  }

  function drawRetainedObject(key, revision, callback) {
    const shouldBuild = typeof depthRenderer.beginObject !== "function"
      || depthRenderer.beginObject(key, revision) !== false;
    if (!shouldBuild) return false;
    callback();
    depthRenderer.endObject?.();
    return true;
  }

  function designGeometrySignature(design, animationTick = "static") {
    return [state.designId, state.geometryRevision, design?.updatedAt || "", animationTick].join("|");
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return [
      (event.clientX - rect.left) * canvas.width / rect.width,
      (event.clientY - rect.top) * canvas.height / rect.height,
    ];
  }

  function navigationPitchScale() {
    const direction = state.pitch < 0 ? -1 : 1;
    return direction * Math.max(DEFAULT_PAN_PITCH_SCALE, Math.abs(Math.sin(state.pitch)));
  }

  function stabilizedPanDelta(deltaX, deltaY) {
    const screenX = Number(deltaX) || 0;
    const screenY = Number(deltaY) || 0;
    const distance = Math.hypot(screenX, screenY);
    if (distance <= MAX_PAN_POINTER_DELTA) return [screenX, screenY];
    // Keep genuine movement from low-frequency pointer events. Only reject a
    // very large discontinuity (for example, a cursor warp after capture),
    // which avoids both the former 16px slow-down and occasional camera fling.
    const limitScale = MAX_PAN_POINTER_DELTA / distance;
    return [screenX * limitScale, screenY * limitScale];
  }

  function worldFromScreen(event) {
    const [screenX, screenY] = canvasPoint(event);
    const design = currentDesign();
    const centerX = (Number(design?.base.x) || 0) + (design?.base.w || 20) / 2 + state.panX;
    const centerZ = (Number(design?.base.z) || 0) + (design?.base.d || 10) / 2 + state.panZ;
    const cy = Math.cos(state.yaw);
    const sy = Math.sin(state.yaw);
    const cp = Math.cos(state.pitch);
    const sp = navigationPitchScale();
    const scale = state.zoom * Math.min(canvas.width / 50, canvas.height / 28);
    const rx = (screenX - canvas.width / 2) / scale;
    const verticalScreenWorld = (screenY - canvas.height * 0.56) / scale;
    const rz = (verticalScreenWorld - state.panY * cp) / sp;
    return [centerX + rx * cy + rz * sy, centerZ - rx * sy + rz * cy];
  }

  function polygon(points, fill, stroke = null, lineWidth = 1, alpha = 1, options = {}) {
    if (alpha <= 0.01) return;
    if (depthRenderer.available) {
      depthRenderer.addPolygon(points, fill, alpha, stroke, lineWidth, {
        transparent: alpha < 0.985,
        ...options,
      });
      return;
    }
    const projected = points.map((point) => project(...point));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    projected.forEach((point, index) => index ? ctx.lineTo(point[0], point[1]) : ctx.moveTo(point[0], point[1]));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
    ctx.restore();
  }

  function line3d(start, end, color, width = 1, alpha = 1) {
    if (alpha <= 0.01) return;
    if (depthRenderer.available) {
      depthRenderer.addLine(start, end, color, width, alpha);
      return;
    }
    const a = project(...start);
    const b = project(...end);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.restore();
  }

  function shade(hex, amount) {
    const color = validColor(hex);
    const value = parseInt(color.slice(1), 16);
    const channel = (shift) => Math.max(0, Math.min(255, ((value >> shift) & 255) + Math.round(255 * amount)));
    return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
  }

  function degreesToRadians(value) {
    return (Number(value) || 0) * Math.PI / 180;
  }

  function rotateVector3(vector, rotationX = 0, rotationY = 0, rotationZ = 0) {
    let [x, y, z] = vector;
    const rx = degreesToRadians(rotationX);
    const ry = degreesToRadians(rotationY);
    const rz = degreesToRadians(rotationZ);

    // X rotation.
    let cosine = Math.cos(rx);
    let sine = Math.sin(rx);
    [y, z] = [y * cosine - z * sine, y * sine + z * cosine];

    // Y rotation.
    cosine = Math.cos(ry);
    sine = Math.sin(ry);
    [x, z] = [x * cosine - z * sine, x * sine + z * cosine];

    // Z rotation.
    cosine = Math.cos(rz);
    sine = Math.sin(rz);
    [x, y] = [x * cosine - y * sine, x * sine + y * cosine];
    return [x, y, z];
  }

  function rotatePoint3(point, center, rotationX = 0, rotationY = 0, rotationZ = 0) {
    const rotated = rotateVector3(
      [point[0] - center[0], point[1] - center[1], point[2] - center[2]],
      rotationX,
      rotationY,
      rotationZ,
    );
    return [center[0] + rotated[0], center[1] + rotated[1], center[2] + rotated[2]];
  }

  function componentRotation(component) {
    return [
      Number(component.rotationX) || 0,
      Number.isFinite(Number(component.rotationY)) ? Number(component.rotationY) : Number(component.rotation) || 0,
      Number(component.rotationZ) || 0,
    ];
  }

  function setComponentRotation(component, axis, value) {
    const field = axis === "x" ? "rotationX" : axis === "z" ? "rotationZ" : "rotationY";
    component[field] = Number(value) || 0;
    if (axis === "y") component.rotation = component.rotationY;
  }

  function rotationMatrixFromEuler(rotation = [0, 0, 0]) {
    const xAxis = rotateVector3([1, 0, 0], ...rotation);
    const yAxis = rotateVector3([0, 1, 0], ...rotation);
    const zAxis = rotateVector3([0, 0, 1], ...rotation);
    return [
      [xAxis[0], yAxis[0], zAxis[0]],
      [xAxis[1], yAxis[1], zAxis[1]],
      [xAxis[2], yAxis[2], zAxis[2]],
    ];
  }

  function multiplyRotationMatrices(first, second) {
    return first.map((row, rowIndex) => row.map((_, columnIndex) => (
      first[rowIndex][0] * second[0][columnIndex]
      + first[rowIndex][1] * second[1][columnIndex]
      + first[rowIndex][2] * second[2][columnIndex]
    )));
  }

  function transposeRotationMatrix(matrix) {
    return matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]));
  }

  function transformVectorByMatrix(matrix, vector) {
    return matrix.map((row) => row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2]);
  }

  function rotationMatrixForAxis(axis, degrees, vectors = null) {
    const rotation = axis === "x" ? [degrees, 0, 0] : axis === "z" ? [0, 0, degrees] : [0, degrees, 0];
    const localRotation = rotationMatrixFromEuler(rotation);
    if (!vectors) return localRotation;
    const basis = [
      [vectors.x[0], vectors.y[0], vectors.z[0]],
      [vectors.x[1], vectors.y[1], vectors.z[1]],
      [vectors.x[2], vectors.y[2], vectors.z[2]],
    ];
    return multiplyRotationMatrices(multiplyRotationMatrices(basis, localRotation), transposeRotationMatrix(basis));
  }

  function setComponentRotationFromMatrix(component, matrix) {
    const rotationY = Math.asin(clamp(matrix[2][0], -1, 1));
    const cosineY = Math.cos(rotationY);
    const rotationX = Math.abs(cosineY) > 0.000001
      ? Math.atan2(matrix[2][1], matrix[2][2])
      : Math.atan2(-matrix[1][2], matrix[1][1]);
    const rotationZ = Math.abs(cosineY) > 0.000001 ? Math.atan2(matrix[1][0], matrix[0][0]) : 0;
    component.rotationX = rotationX * 180 / Math.PI;
    component.rotationY = rotationY * 180 / Math.PI;
    component.rotationZ = rotationZ * 180 / Math.PI;
    component.rotation = component.rotationY;
  }

  function boxVertices(component) {
    const center = componentCenter(component);
    const halfX = component.w / 2;
    const halfY = component.h / 2;
    const halfZ = component.d / 2;
    return [
      [-halfX, -halfY, -halfZ], [halfX, -halfY, -halfZ], [halfX, -halfY, halfZ], [-halfX, -halfY, halfZ],
      [-halfX, halfY, -halfZ], [halfX, halfY, -halfZ], [halfX, halfY, halfZ], [-halfX, halfY, halfZ],
    ].map((offset) => {
      const rotated = rotateVector3(offset, ...componentRotation(component));
      return [center[0] + rotated[0], center[1] + rotated[1], center[2] + rotated[2]];
    });
  }

  function faceDepth(points) {
    return points.reduce((sum, point) => sum + project(...point)[2], 0) / Math.max(1, points.length);
  }

  function vectorBetween(start, end) {
    return [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
  }

  function faceIsVisible() {
    // The WebGL depth buffer now resolves hidden surfaces. Keep every closed
    // face available so no side disappears because of winding or camera angle.
    return true;
  }

  function pointDistance(first, second) {
    return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
  }

  function interpolatePoint(first, second, amount) {
    return [
      first[0] + (second[0] - first[0]) * amount,
      first[1] + (second[1] - first[1]) * amount,
      first[2] + (second[2] - first[2]) * amount,
    ];
  }

  function bilinearPoint(points, u, v) {
    return interpolatePoint(
      interpolatePoint(points[0], points[1], u),
      interpolatePoint(points[3], points[2], u),
      v,
    );
  }

  function primitiveKey(order, subOrder) {
    return order * 1000000 + subOrder;
  }

  function polygonPrimitive(component, points, fill, stroke, lineWidth, alpha, order, subOrder) {
    return {
      kind: "polygon",
      component,
      points,
      fill,
      stroke,
      lineWidth,
      alpha,
      depth: faceDepth(points),
      order: primitiveKey(order, subOrder),
    };
  }

  function linePrimitive(component, start, end, color, width, alpha, order, subOrder) {
    return {
      kind: "line",
      component,
      start,
      end,
      color,
      width,
      alpha,
      depth: (project(...start)[2] + project(...end)[2]) / 2,
      order: primitiveKey(order, subOrder),
    };
  }

  function buildQuadFacePrimitives(component, points, fill, alpha, order, subOrder, options = {}) {
    if (!faceIsVisible(points, alpha)) return [];
    const targetSize = Math.max(2.5, Number(options.targetSize) || 5);
    const uLength = Math.max(pointDistance(points[0], points[1]), pointDistance(points[3], points[2]));
    const vLength = Math.max(pointDistance(points[0], points[3]), pointDistance(points[1], points[2]));
    const uSegments = depthRenderer.available ? 1 : clamp(Math.ceil(uLength / targetSize), 1, 14);
    const vSegments = depthRenderer.available ? 1 : clamp(Math.ceil(vLength / targetSize), 1, 14);
    const primitives = [];
    let cell = 0;
    for (let vIndex = 0; vIndex < vSegments; vIndex += 1) {
      for (let uIndex = 0; uIndex < uSegments; uIndex += 1) {
        const u0 = uIndex / uSegments;
        const u1 = (uIndex + 1) / uSegments;
        const v0 = vIndex / vSegments;
        const v1 = (vIndex + 1) / vSegments;
        primitives.push(polygonPrimitive(
          component,
          [
            bilinearPoint(points, u0, v0),
            bilinearPoint(points, u1, v0),
            bilinearPoint(points, u1, v1),
            bilinearPoint(points, u0, v1),
          ],
          fill,
          null,
          0,
          alpha,
          order,
          subOrder + cell,
        ));
        cell += 1;
      }
    }
    const edgeColor = options.edgeColor || "rgba(15,25,28,.22)";
    const edgeWidth = options.edgeWidth ?? 0.8;
    const edgeBase = subOrder + 5000;
    let edgePiece = 0;
    for (let index = 0; index < 4; index += 1) {
      const start = points[index];
      const end = points[(index + 1) % 4];
      const segments = depthRenderer.available ? 1 : clamp(Math.ceil(pointDistance(start, end) / targetSize), 1, 14);
      for (let segment = 0; segment < segments; segment += 1) {
        primitives.push(linePrimitive(
          component,
          interpolatePoint(start, end, segment / segments),
          interpolatePoint(start, end, (segment + 1) / segments),
          edgeColor,
          edgeWidth,
          alpha,
          order,
          edgeBase + edgePiece,
        ));
        edgePiece += 1;
      }
    }
    return primitives;
  }

  function buildBoxPrimitives(component, order) {
    const vertices = boxVertices(component);
    // Winding is outward on every face so back-face removal is reliable.
    const faceDefinitions = [
      { indices: [0, 4, 5, 1], shade: -0.12 },
      { indices: [1, 5, 6, 2], shade: -0.22 },
      { indices: [2, 6, 7, 3], shade: -0.18 },
      { indices: [3, 7, 4, 0], shade: -0.08 },
      { indices: [0, 1, 2, 3], shade: -0.28 },
      { indices: [4, 7, 6, 5], shade: 0 },
    ];
    return faceDefinitions.flatMap((face, index) => {
      const points = face.indices.map((vertexIndex) => vertices[vertexIndex]);
      const fill = face.shade ? shade(component.color, face.shade) : component.color;
      return buildQuadFacePrimitives(component, points, fill, component.opacity, order, index * 10000, {
        targetSize: 4,
      });
    });
  }

  function beamSourceFrame(component) {
    const start = [component.x, component.y, component.z];
    const end = [component.x2, component.y2, component.z2];
    const direction = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
    const length = Math.max(0.0001, Math.hypot(...direction));
    const forward = direction.map((value) => value / length);
    const helper = Math.abs(forward[1]) < 0.88 ? [0, 1, 0] : [1, 0, 0];
    let side = [
      forward[1] * helper[2] - forward[2] * helper[1],
      forward[2] * helper[0] - forward[0] * helper[2],
      forward[0] * helper[1] - forward[1] * helper[0],
    ];
    const sideLength = Math.max(0.0001, Math.hypot(...side));
    side = side.map((value) => value / sideLength);
    const up = [
      side[1] * forward[2] - side[2] * forward[1],
      side[2] * forward[0] - side[0] * forward[2],
      side[0] * forward[1] - side[1] * forward[0],
    ];
    return { start, end, forward, side, up };
  }

  function beamVertices(component) {
    const center = componentCenter(component);
    const rotation = componentRotation(component);
    const { start, end, side, up } = beamSourceFrame(component);
    const halfSide = Math.max(0.03, Number(component.thicknessZ || component.thickness) * 0.08);
    const halfUp = Math.max(0.03, Number(component.thicknessY || component.thickness) * 0.08);
    const corner = (point, sideSign, upSign) => [
      point[0] + side[0] * halfSide * sideSign + up[0] * halfUp * upSign,
      point[1] + side[1] * halfSide * sideSign + up[1] * halfUp * upSign,
      point[2] + side[2] * halfSide * sideSign + up[2] * halfUp * upSign,
    ];
    return [
      corner(start, -1, -1), corner(start, 1, -1), corner(start, 1, 1), corner(start, -1, 1),
      corner(end, -1, -1), corner(end, 1, -1), corner(end, 1, 1), corner(end, -1, 1),
    ].map((point) => rotatePoint3(point, center, ...rotation));
  }

  function buildPrismPrimitives(component, vertices, order, color = component.color, alpha = component.opacity, subOrderOffset = 0) {
    const faces = [
      [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3],
      [3, 7, 4, 0], [0, 1, 2, 3], [4, 7, 6, 5],
    ];
    const shades = [-0.12, -0.22, -0.16, -0.08, -0.18, 0];
    return faces.flatMap((indices, index) => {
      const points = indices.map((vertexIndex) => vertices[vertexIndex]);
      const fill = shades[index] ? shade(color, shades[index]) : color;
      return buildQuadFacePrimitives(component, points, fill, alpha, order, subOrderOffset + index * 10000, {
        targetSize: 4,
        edgeColor: "rgba(15,25,28,.2)",
        edgeWidth: 0.75,
      });
    });
  }

  function buildBeamPrimitives(component, order) {
    return buildPrismPrimitives(component, beamVertices(component), order);
  }

  function arrowGeometryPoints(component) {
    const frame = beamSourceFrame(component);
    const center = componentCenter(component);
    const rotation = componentRotation(component);
    const totalLength = pointDistance(frame.start, frame.end);
    const headLength = Math.min(totalLength * 0.45, Math.max(0.1, Number(component.headLength) || 1.5));
    const headWidth = Math.max(0.1, Number(component.headWidth) || 1.35);
    const base = [
      frame.end[0] - frame.forward[0] * headLength,
      frame.end[1] - frame.forward[1] * headLength,
      frame.end[2] - frame.forward[2] * headLength,
    ];
    const wing = (sideSign, upSign) => [
      base[0] + frame.side[0] * headWidth * 0.5 * sideSign + frame.up[0] * headWidth * 0.5 * upSign,
      base[1] + frame.side[1] * headWidth * 0.5 * sideSign + frame.up[1] * headWidth * 0.5 * upSign,
      base[2] + frame.side[2] * headWidth * 0.5 * sideSign + frame.up[2] * headWidth * 0.5 * upSign,
    ];
    return {
      start: rotatePoint3(frame.start, center, ...rotation),
      end: rotatePoint3(frame.end, center, ...rotation),
      wings: [[1,0],[-1,0],[0,1],[0,-1]].map(([sideSign, upSign]) => rotatePoint3(wing(sideSign, upSign), center, ...rotation)),
    };
  }

  function buildArrowPrimitives(component, order) {
    const geometry = arrowGeometryPoints(component);
    const width = clamp((Number(component.thickness) || 0.45) * 5, 2, 14);
    const primitives = [
      linePrimitive(component, geometry.start, geometry.end, component.color, width, component.opacity, order, 0),
    ];
    geometry.wings.forEach((wing, index) => {
      primitives.push(linePrimitive(component, geometry.end, wing, component.color, Math.max(2, width * .86), component.opacity, order, index + 1));
    });
    return primitives;
  }

  function cylinderVertices(component, localCenter, radiusX, radiusY, halfLength, segments = 16) {
    const parentCenter = componentCenter(component);
    const vertices = [];
    for (const localZ of [-halfLength, halfLength]) {
      for (let index = 0; index < segments; index += 1) {
        const angle = index / segments * Math.PI * 2;
        const localPoint = [
          localCenter[0] + Math.cos(angle) * radiusX,
          localCenter[1] + Math.sin(angle) * radiusY,
          localCenter[2] + localZ,
        ];
        vertices.push(rotatePoint3(localPoint, parentCenter, ...componentRotation(component)));
      }
    }
    return vertices;
  }

  function buildCylinderPrimitives(component, vertices, order, color, alpha, subOrderOffset = 0) {
    const segments = vertices.length / 2;
    const primitives = [];
    const front = Array.from({ length: segments }, (_, index) => segments - 1 - index);
    const back = Array.from({ length: segments }, (_, index) => segments + index);
    const capDefinitions = [
      { indices: front, fill: shade(color, -0.2), subOrder: subOrderOffset },
      { indices: back, fill: color, subOrder: subOrderOffset + 1 },
    ];
    capDefinitions.forEach((cap) => {
      const points = cap.indices.map((index) => vertices[index]);
      if (faceIsVisible(points, alpha)) {
        primitives.push(polygonPrimitive(component, points, cap.fill, "rgba(15,25,28,.2)", 0.7, alpha, order, cap.subOrder));
      }
    });
    for (let index = 0; index < segments; index += 1) {
      const next = (index + 1) % segments;
      const points = [vertices[index], vertices[next], vertices[segments + next], vertices[segments + index]];
      if (!faceIsVisible(points, alpha)) continue;
      const light = -0.08 - 0.16 * (0.5 + 0.5 * Math.cos(index / segments * Math.PI * 2));
      primitives.push(polygonPrimitive(
        component,
        points,
        shade(color, light),
        "rgba(15,25,28,.18)",
        0.55,
        alpha,
        order,
        subOrderOffset + 2 + index,
      ));
    }
    return primitives;
  }

  function buildRollerPrimitives(component, order) {
    const result = [];
    const count = Math.max(2, component.count);
    const radius = Math.max(0.05, Number(component.thickness) / 2);
    const center = componentCenter(component);
    for (let index = 0; index < count; index += 1) {
      const localX = component.x + component.w * index / (count - 1);
      const vertices = cylinderVertices(
        component,
        [localX, component.y, center[2]],
        radius,
        radius,
        component.d / 2,
        renderPerformance.cylinderSegments(14),
      );
      result.push(...buildCylinderPrimitives(
        component,
        vertices,
        order,
        component.color,
        component.opacity,
        index * 100,
      ));
    }
    return result;
  }

  function wheelVertices(component, segments = 20) {
    const center = componentCenter(component);
    const radiusX = Math.max(0.05, Number(component.w) / 2);
    const radiusY = Math.max(0.05, Number(component.h) / 2);
    const halfDepth = Math.max(0.025, Number(component.d) / 2);
    return cylinderVertices(component, center, radiusX, radiusY, halfDepth, segments);
  }

  function buildWheelPrimitives(component, order) {
    return buildCylinderPrimitives(component, wheelVertices(component, renderPerformance.cylinderSegments(20)), order, component.color, component.opacity);
  }

  function verticalCylinderVertices(component, segments = 20, topScale = 1) {
    const center = componentCenter(component);
    const count = renderPerformance.cylinderSegments(segments || 20);
    const vertices = [];
    for (const layer of [-1, 1]) {
      const scale = layer < 0 ? 1 : topScale;
      for (let index = 0; index < count; index += 1) {
        const angle = index / count * Math.PI * 2;
        const offset = [
          Math.cos(angle) * component.w / 2 * scale,
          layer * component.h / 2,
          Math.sin(angle) * component.d / 2 * scale,
        ];
        const rotated = rotateVector3(offset, ...componentRotation(component));
        vertices.push([center[0] + rotated[0], center[1] + rotated[1], center[2] + rotated[2]]);
      }
    }
    return vertices;
  }

  function buildVerticalCylinderPrimitives(component, order) {
    return buildCylinderPrimitives(
      component,
      verticalCylinderVertices(component, component.segments || 20, 1),
      order,
      component.color,
      component.opacity,
    );
  }

  function buildConePrimitives(component, order) {
    const count = renderPerformance.cylinderSegments(component.segments || 20);
    const center = componentCenter(component);
    const base = [];
    for (let index = 0; index < count; index += 1) {
      const angle = index / count * Math.PI * 2;
      const offset = [Math.cos(angle) * component.w / 2, -component.h / 2, Math.sin(angle) * component.d / 2];
      const rotated = rotateVector3(offset, ...componentRotation(component));
      base.push([center[0] + rotated[0], center[1] + rotated[1], center[2] + rotated[2]]);
    }
    const apexOffset = rotateVector3([0, component.h / 2, 0], ...componentRotation(component));
    const apex = [center[0] + apexOffset[0], center[1] + apexOffset[1], center[2] + apexOffset[2]];
    const primitives = [polygonPrimitive(component, [...base].reverse(), shade(component.color, -.22), "rgba(15,25,28,.2)", .6, component.opacity, order, 0)];
    for (let index = 0; index < count; index += 1) {
      const next = (index + 1) % count;
      primitives.push(polygonPrimitive(component, [base[index], base[next], apex], shade(component.color, -.08 - .16 * (.5 + .5 * Math.cos(index / count * Math.PI * 2))), "rgba(15,25,28,.16)", .45, component.opacity, order, index + 1));
    }
    return primitives;
  }

  function buildSpherePrimitives(component, order) {
    const center = componentCenter(component);
    const longitude = Math.max(8, renderPerformance.cylinderSegments(component.segments || 20));
    const latitude = Math.max(6, Math.round(longitude / 2));
    const rings = [];
    for (let lat = 0; lat <= latitude; lat += 1) {
      const phi = -Math.PI / 2 + lat / latitude * Math.PI;
      const ring = [];
      for (let lon = 0; lon < longitude; lon += 1) {
        const theta = lon / longitude * Math.PI * 2;
        const offset = [
          Math.cos(phi) * Math.cos(theta) * component.w / 2,
          Math.sin(phi) * component.h / 2,
          Math.cos(phi) * Math.sin(theta) * component.d / 2,
        ];
        const rotated = rotateVector3(offset, ...componentRotation(component));
        ring.push([center[0] + rotated[0], center[1] + rotated[1], center[2] + rotated[2]]);
      }
      rings.push(ring);
    }
    const primitives = [];
    let subOrder = 0;
    for (let lat = 0; lat < latitude; lat += 1) {
      for (let lon = 0; lon < longitude; lon += 1) {
        const next = (lon + 1) % longitude;
        const points = [rings[lat][lon], rings[lat][next], rings[lat + 1][next], rings[lat + 1][lon]];
        const light = -0.22 + 0.22 * ((lat + 1) / latitude);
        primitives.push(polygonPrimitive(
          component,
          points,
          shade(component.color, light),
          "rgba(15,25,28,.12)",
          0.35,
          component.opacity,
          order,
          subOrder,
        ));
        subOrder += 1;
      }
    }
    return primitives;
  }

  function wedgeVertices(component) {
    const center = componentCenter(component);
    const local = [
      [-component.w/2,-component.h/2,-component.d/2],
      [ component.w/2,-component.h/2,-component.d/2],
      [ component.w/2,-component.h/2, component.d/2],
      [-component.w/2,-component.h/2, component.d/2],
      [-component.w/2, component.h/2,-component.d/2],
      [-component.w/2, component.h/2, component.d/2],
    ];
    return local.map((offset) => {
      const rotated = rotateVector3(offset, ...componentRotation(component));
      return [center[0] + rotated[0], center[1] + rotated[1], center[2] + rotated[2]];
    });
  }

  function buildWedgePrimitives(component, order) {
    const vertices = wedgeVertices(component);
    const faces = [
      [0,1,2,3], [0,4,1], [3,2,5], [0,3,5,4], [1,4,5,2],
    ];
    const shades = [-.24,-.1,-.2,0,-.14];
    return faces.map((indices, index) => polygonPrimitive(
      component,
      indices.map((vertexIndex) => vertices[vertexIndex]),
      shades[index] ? shade(component.color, shades[index]) : component.color,
      "rgba(15,25,28,.2)",
      .6,
      component.opacity,
      order,
      index,
    ));
  }


  function designAnimationTime(time) {
    if (Number.isFinite(state.timelineScrubSeconds)) return Math.max(0, state.timelineScrubSeconds * 1000);
    const reference = state.previewAnimations ? time : state.animationPausedAt;
    return Math.max(0, reference - state.animationTimeOffset);
  }

  function componentAnimationSettingsMatch(first, second) {
    if (!first || !second) return false;
    const fields = [
      "animationEnabled", "animationType", "animationAxis", "animationSecondaryAxis",
      "animationAmount", "animationSecondaryAmount", "animationSpeed", "animationPauseSeconds", "animationSecondaryPauseSeconds", "animationStep1PauseSeconds", "animationStep2PauseSeconds", "animationStep3PauseSeconds", "animationStep4PauseSeconds", "animationPhase",
    ];
    return fields.every((field) => String(first[field] ?? "") === String(second[field] ?? ""))
      && JSON.stringify(first.animationTimeline || null) === JSON.stringify(second.animationTimeline || null);
  }

  function localAnimationAxisVector(component, axis) {
    const base = axis === "x" ? [1,0,0] : axis === "y" ? [0,1,0] : [0,0,1];
    return rotateVector3(base, ...componentRotation(component));
  }

  function combineAxisOffsets(component, firstAmount, secondAmount) {
    const firstAxis = ["x", "y", "z"].includes(component.animationAxis) ? component.animationAxis : "y";
    let secondAxis = ["x", "y", "z"].includes(component.animationSecondaryAxis) ? component.animationSecondaryAxis : "z";
    if (secondAxis === firstAxis) secondAxis = firstAxis === "z" ? "x" : "z";
    const firstVector = localAnimationAxisVector(component, firstAxis);
    const secondVector = localAnimationAxisVector(component, secondAxis);
    return [0,1,2].map((index) => firstVector[index] * firstAmount + secondVector[index] * secondAmount);
  }

  function fourStepPauseDurations(component) {
    const legacyAxis1 = Math.max(0, Number(component.animationPauseSeconds) || 0);
    const legacyAxis2 = Math.max(0, Number.isFinite(Number(component.animationSecondaryPauseSeconds))
      ? Number(component.animationSecondaryPauseSeconds)
      : legacyAxis1);
    return [
      Math.max(0, Number.isFinite(Number(component.animationStep1PauseSeconds)) ? Number(component.animationStep1PauseSeconds) : legacyAxis1),
      Math.max(0, Number.isFinite(Number(component.animationStep2PauseSeconds)) ? Number(component.animationStep2PauseSeconds) : legacyAxis2),
      Math.max(0, Number.isFinite(Number(component.animationStep3PauseSeconds)) ? Number(component.animationStep3PauseSeconds) : legacyAxis1),
      Math.max(0, Number.isFinite(Number(component.animationStep4PauseSeconds)) ? Number(component.animationStep4PauseSeconds) : legacyAxis2),
    ];
  }

  function fourStepPathOffset(component, time) {
    const speed = Math.max(0, Number(component.animationSpeed) || 0);
    if (speed <= 0) return [0,0,0];
    const pauses = fourStepPauseDurations(component);
    const activeDuration = 1 / speed;
    const legDuration = activeDuration / 4;
    const totalDuration = activeDuration + pauses.reduce((sum, value) => sum + value, 0);
    const phase = ((Number(component.animationPhase) || 0) / 360 + 1) % 1;
    const elapsed = Math.max(0, designAnimationTime(time) / 1000 + phase * totalDuration);
    let local = ((elapsed % totalDuration) + totalDuration) % totalDuration;
    const firstAmount = Number(component.animationAmount) || 0;
    const secondAmount = Number(component.animationSecondaryAmount) || 0;
    const smooth = (value) => (1 - Math.cos(clamp(value, 0, 1) * Math.PI)) / 2;
    const interpolate = (from, to, progress) => from + (to - from) * smooth(progress);
    const legs = [
      { from: [0, 0], to: [firstAmount, 0] },
      { from: [firstAmount, 0], to: [firstAmount, secondAmount] },
      { from: [firstAmount, secondAmount], to: [0, secondAmount] },
      { from: [0, secondAmount], to: [0, 0] },
    ];
    for (let index = 0; index < legs.length; index += 1) {
      const leg = legs[index];
      if (local < legDuration) {
        const progress = legDuration > 0 ? local / legDuration : 1;
        return combineAxisOffsets(
          component,
          interpolate(leg.from[0], leg.to[0], progress),
          interpolate(leg.from[1], leg.to[1], progress),
        );
      }
      local -= legDuration;
      if (local < pauses[index]) return combineAxisOffsets(component, leg.to[0], leg.to[1]);
      local -= pauses[index];
    }
    return [0,0,0];
  }

  function componentAnimationTransform(component, time) {
    const transform = { translation: [0,0,0], rotation: [0,0,0], rotationOperations: [], scale: [1,1,1], alpha: 1, visible: null, rectangularSplit: null };
    if (timelineEngine && component.animationTimeline && Array.isArray(component.animationTimeline.clips)) {
      if (component.animationTimeline.enabled === false || !component.animationTimeline.clips.some((clip) => clip.enabled !== false)) return transform;
      const timelineState = evaluateTimelineOnSharedClock(component.animationTimeline, time);
      const localTranslation = timelineState.translation || [0, 0, 0];
      ["x", "y", "z"].forEach((axis, index) => {
        const vector = localAnimationAxisVector(component, axis);
        transform.translation[0] += vector[0] * (Number(localTranslation[index]) || 0);
        transform.translation[1] += vector[1] * (Number(localTranslation[index]) || 0);
        transform.translation[2] += vector[2] * (Number(localTranslation[index]) || 0);
      });
      transform.rotation = (timelineState.rotation || [0, 0, 0]).map((value) => Number(value) || 0);
      transform.rotationOperations = timelineRotationOperations(timelineState).map((operation) => ({
        rotation: operation.rotation,
        // The timeline stores pivot offsets in the part's local coordinates.
        // Convert them once so merged siblings inherit the same world pivot.
        pivotOffset: rotateVector3(operation.pivotOffset, ...componentRotation(component)),
      }));
      transform.scale = (timelineState.scale || [1, 1, 1]).map((value) => Number(value) || 1);
      transform.alpha = Number.isFinite(Number(timelineState.opacity)) ? clamp(Number(timelineState.opacity), 0, 1) : 1;
      transform.visible = typeof timelineState.visible === "boolean" ? timelineState.visible : null;
      transform.rectangularSplit = timelineState.rectangularSplit ? clone(timelineState.rectangularSplit) : null;
      return transform;
    }
    if (component.animationEnabled === false || !component.animationType || component.animationType === "none") return transform;
    const { cycle, wrapped, sine, pingPong } = componentAnimationWave(component, time);
    const amount = Number(component.animationAmount) || 0;
    const axis = component.animationAxis || "x";
    const offset = component.animationType === "loop"
      ? (wrapped - 0.5) * amount
      : component.animationType === "oscillate"
        ? pingPong * amount
        : sine * amount / 2;
    if (["oscillate", "loop"].includes(component.animationType)) {
      if (axis === "x" || axis === "all") transform.translation[0] = offset;
      if (axis === "y" || axis === "all") transform.translation[1] = offset;
      if (axis === "z" || axis === "all") transform.translation[2] = offset;
    } else if (component.animationType === "fourStep") {
      transform.translation = fourStepPathOffset(component, time);
    } else if (component.animationType === "bob") transform.translation[1] = offset;
    else if (component.animationType === "spin") {
      const spin = cycle * (amount || 360);
      if (axis === "x" || axis === "all") transform.rotation[0] = spin;
      if (axis === "y" || axis === "all") transform.rotation[1] = spin;
      if (axis === "z" || axis === "all") transform.rotation[2] = spin;
    } else if (component.animationType === "pulse") {
      const factor = Math.max(0.08, 1 + sine * amount / 200);
      if (axis === "x" || axis === "all") transform.scale[0] = factor;
      if (axis === "y" || axis === "all") transform.scale[1] = factor;
      if (axis === "z" || axis === "all") transform.scale[2] = factor;
    } else if (component.animationType === "blink") transform.alpha = sine > -0.15 ? 1 : 0.08;
    return transform;
  }

  function componentAnimationWave(component, time) {
    const speed = Math.max(0, Number(component.animationSpeed) || 0);
    const pauseSeconds = Math.max(0, Number(component.animationPauseSeconds) || 0);
    const phase = ((Number(component.animationPhase) || 0) / 360 + 1) % 1;
    if (speed <= 0) return { cycle: 0, wrapped: 0, sine: 0, pingPong: 0 };
    const activeDuration = 1 / speed;
    const elapsed = Math.max(0, designAnimationTime(time) / 1000 + phase * activeDuration);
    if (component.animationType === "oscillate") {
      const quarterDuration = activeDuration / 4;
      const totalDuration = activeDuration + pauseSeconds * 2;
      const localTime = ((elapsed % totalDuration) + totalDuration) % totalDuration;
      let position;
      if (localTime < quarterDuration) position = Math.sin(localTime / quarterDuration * Math.PI / 2);
      else if (localTime < quarterDuration + pauseSeconds) position = 1;
      else if (localTime < quarterDuration + pauseSeconds + activeDuration / 2) {
        const progress = (localTime - quarterDuration - pauseSeconds) / (activeDuration / 2);
        position = Math.sin(Math.PI / 2 + progress * Math.PI);
      } else if (localTime < quarterDuration + pauseSeconds * 2 + activeDuration / 2) position = -1;
      else {
        const progress = (localTime - quarterDuration - pauseSeconds * 2 - activeDuration / 2) / quarterDuration;
        position = Math.sin(Math.PI * 1.5 + progress * Math.PI / 2);
      }
      return { cycle: elapsed / totalDuration, wrapped: (position + 1) / 2, sine: position, pingPong: position / 2 };
    }
    const totalDuration = activeDuration + pauseSeconds;
    const localTime = ((elapsed % totalDuration) + totalDuration) % totalDuration;
    const wrapped = localTime < activeDuration ? localTime / activeDuration : 1;
    const cycle = Math.floor(elapsed / totalDuration) + wrapped;
    return { cycle, wrapped, sine: Math.sin(wrapped * Math.PI * 2), pingPong: wrapped - 0.5 };
  }

  function timelineRotationOperations(timelineState) {
    const explicitOperations = Array.isArray(timelineState?.rotationOperations)
      ? timelineState.rotationOperations
        .map((operation) => ({
          rotation: (operation?.rotation || [0, 0, 0]).map((value) => Number(value) || 0),
          pivotOffset: (operation?.pivotOffset || [0, 0, 0]).map((value) => Number(value) || 0),
        }))
        .filter((operation) => operation.rotation.some((value) => Math.abs(value) > 0.00001))
      : [];
    if (explicitOperations.length) return explicitOperations;
    const fallbackRotation = (timelineState?.rotation || [0, 0, 0]).map((value) => Number(value) || 0);
    return fallbackRotation.some((value) => Math.abs(value) > 0.00001)
      ? [{ rotation: fallbackRotation, pivotOffset: [0, 0, 0] }]
      : [];
  }

  function rotateAnimatedComponentAroundPoint(component, pivot, degrees, axis) {
    if (Math.abs(Number(degrees) || 0) < 0.00001) return;
    const original = clone(component);
    const originalCenter = componentCenter(original);
    rotateComponent(component, degrees, axis, original);
    const rotationVector = axis === "x" ? [degrees, 0, 0] : axis === "z" ? [0, 0, degrees] : [0, degrees, 0];
    const targetCenter = rotatePoint3(originalCenter, pivot, ...rotationVector);
    translateComponent(component, targetCenter[0] - originalCenter[0], targetCenter[1] - originalCenter[1], targetCenter[2] - originalCenter[2]);
  }

  function applyTimelineAnimation(animated, source, timelineState) {
    const localTranslation = timelineState.translation || [0, 0, 0];
    const worldTranslation = [0, 0, 0];
    ["x", "y", "z"].forEach((axis, index) => {
      const vector = localAnimationAxisVector(source, axis);
      worldTranslation[0] += vector[0] * (Number(localTranslation[index]) || 0);
      worldTranslation[1] += vector[1] * (Number(localTranslation[index]) || 0);
      worldTranslation[2] += vector[2] * (Number(localTranslation[index]) || 0);
    });

    const sourceCenter = componentCenter(source);
    timelineRotationOperations(timelineState).forEach((operation) => {
      const worldPivotOffset = rotateVector3(operation.pivotOffset, ...componentRotation(source));
      const pivot = sourceCenter.map((value, index) => value + worldPivotOffset[index]);
      ["x", "y", "z"].forEach((axis, index) => {
        rotateAnimatedComponentAroundPoint(animated, pivot, operation.rotation[index], axis);
      });
    });
    translateComponent(animated, ...worldTranslation);

    const scales = timelineState.scale || [1, 1, 1];
    ["x", "y", "z"].forEach((axis, index) => {
      const factor = Number(scales[index]) || 1;
      if (Math.abs(factor - 1) < 0.00001) return;
      scaleComponent(animated, factor, axis, clone(animated));
    });
    const timelineOpacity = Number.isFinite(Number(timelineState.opacity)) ? clamp(Number(timelineState.opacity), 0, 1) : 1;
    if (Math.abs(timelineOpacity - 1) > 0.00001) {
      multiplyComponentOpacity(animated, timelineOpacity);
    }
    if (typeof timelineState.visible === "boolean") animated.visible = timelineState.visible;
    if (timelineState.rectangularSplit) animated.rectangularSplit = clone(timelineState.rectangularSplit);
    else delete animated.rectangularSplit;
    return animated;
  }

  function animateComponentSelf(component, time) {
    const timeline = component.animationTimeline;
    if (timelineEngine && timeline && Array.isArray(timeline.clips)) {
      if (timeline.enabled === false || !timeline.clips.some((clip) => clip.enabled !== false)) return clone(component);
      const animated = clone(component);
      const timelineState = evaluateTimelineOnSharedClock(timeline, time);
      return applyTimelineAnimation(animated, component, timelineState);
    }
    if (component.animationEnabled === false || !component.animationType || component.animationType === "none") return clone(component);
    const animated = clone(component);
    const { cycle, wrapped, sine, pingPong } = componentAnimationWave(component, time);
    const amount = Number(component.animationAmount) || 0;
    const axis = component.animationAxis || "x";
    const offset = component.animationType === "loop"
      ? (wrapped - 0.5) * amount
      : component.animationType === "oscillate"
        ? pingPong * amount
        : sine * amount / 2;
    if (["oscillate", "loop"].includes(component.animationType)) {
      translateComponent(animated, axis === "x" || axis === "all" ? offset : 0, axis === "y" || axis === "all" ? offset : 0, axis === "z" || axis === "all" ? offset : 0);
    } else if (component.animationType === "fourStep") {
      translateComponent(animated, ...fourStepPathOffset(component, time));
    } else if (component.animationType === "bob") translateComponent(animated, 0, offset, 0);
    else if (component.animationType === "spin") {
      const spin = cycle * (amount || 360);
      if (component.type === "group") {
        if (axis === "all") {
          ["x", "y", "z"].forEach((rotationAxis) => rotateComponent(animated, spin, rotationAxis, clone(animated)));
        } else rotateComponent(animated, spin, axis, component);
      } else {
        if (axis === "x" || axis === "all") animated.rotationX = (Number(animated.rotationX) || 0) + spin;
        if (axis === "y" || axis === "all") {
          animated.rotationY = (Number(animated.rotationY ?? animated.rotation) || 0) + spin;
          animated.rotation = animated.rotationY;
        }
        if (axis === "z" || axis === "all") animated.rotationZ = (Number(animated.rotationZ) || 0) + spin;
      }
    } else if (component.animationType === "pulse") {
      const factor = Math.max(0.08, 1 + sine * amount / 200);
      scaleComponent(animated, factor, axis === "all" ? "center" : axis, component);
    } else if (component.animationType === "blink") {
      animated.opacity = (Number(animated.opacity) || 1) * (sine > -0.15 ? 1 : 0.08);
    }
    return animated;
  }

  function multiplyComponentOpacity(component, factor) {
    const baseOpacity = Number.isFinite(Number(component.opacity)) ? Number(component.opacity) : 1;
    component.opacity = clamp(baseOpacity * factor, 0, 1);
  }

  function applyInheritedComponentTransform(component, transform, pivot, includeRenderEffects = false) {
    let rendered = clone(component);
    ["x", "y", "z"].forEach((axis, index) => {
      const factor = Number(transform.scale[index]) || 1;
      if (Math.abs(factor - 1) < 0.0001) return;
      const original = clone(rendered);
      scaleSelectionTogether([rendered], [original], pivot, factor, axis);
    });
    const inheritedRotationOperations = Array.isArray(transform.rotationOperations) && transform.rotationOperations.length
      ? transform.rotationOperations
      : [{ rotation: transform.rotation || [0, 0, 0], pivotOffset: [0, 0, 0] }];
    inheritedRotationOperations.forEach((operation) => {
      const operationPivot = pivot.map((value, index) => value + (Number(operation.pivotOffset?.[index]) || 0));
      ["x", "y", "z"].forEach((axis, index) => {
        rotateAnimatedComponentAroundPoint(rendered, operationPivot, Number(operation.rotation?.[index]) || 0, axis);
      });
    });
    translateComponent(rendered, ...transform.translation);
    const inheritedAlpha = Number.isFinite(Number(transform.alpha)) ? clamp(Number(transform.alpha), 0, 1) : 1;
    if (Math.abs(inheritedAlpha - 1) > 0.0001) multiplyComponentOpacity(rendered, inheritedAlpha);
    if (typeof transform.visible === "boolean") rendered.visible = transform.visible;
    if (includeRenderEffects && transform.rectangularSplit) rendered.rectangularSplit = clone(transform.rectangularSplit);
    return rendered;
  }

  function animatedComponent(component, time) {
    if (component.type !== "group") return animateComponentSelf(component, time);

    const children = component.children || [];
    if (!children.length) return animateComponentSelf(component, time);
    if (component.embeddedMachine === true) {
      // A machine embedded inside another machine is a structural container, not
      // an attachment group. Preserve every child's own animation on the shared
      // machine clock, then apply any animation authored on the embedded machine
      // wrapper to the complete inserted assembly.
      const animatedMachine = clone(component);
      animatedMachine.children = children.map((child) => (
        child.playOwnAnimation === false ? clone(child) : animatedComponent(child, time)
      ));
      return animateComponentSelf(animatedMachine, time);
    }
    const driver = children.find((child) => child.id === component.motionDriverId)
      || children.find((child) => child.animationTimeline?.enabled !== false && child.animationTimeline?.clips?.some((clip) => clip.enabled !== false))
      || children.find((child) => child.animationEnabled !== false && child.animationType && child.animationType !== "none")
      || children[0];
    const inheritedTransform = componentAnimationTransform(driver, time);
    const driverPivot = componentCenter(driver);

    const animatedGroup = clone(component);
    animatedGroup.motionDriverId = driver.id;
    animatedGroup.children = children.map((child) => {
      // Parent motion is inherited exactly once. Each child then has an explicit
      // local animation layer that can be enabled or disabled independently.
      const playsLocalAnimation = child.id !== driver.id && child.playOwnAnimation !== false;
      const ownAnimated = playsLocalAnimation ? animatedComponent(child, time) : clone(child);
      return applyInheritedComponentTransform(ownAnimated, inheritedTransform, driverPivot, child.id === driver.id);
    });

    return animateComponentSelf(animatedGroup, time);
  }

  // Rectangular splitting is resolved at render time so saved component geometry
  // remains unchanged and normal editing resumes as soon as the clip is inactive.
  function rectangularSplitRenderComponents(component) {
    const effect = component?.rectangularSplit;
    if (!effect || Number(effect.progress) <= 0.0001 || !timelineEngine?.rectangularSplitCells) return [component];

    if (component.type === "group" && !(component.children || []).length) return [component];
    const split = timelineEngine.rectangularSplitCells(effect);
    const boxLike = ["box", "glassPanel", "cylinder", "sphere", "cone", "wedge"].includes(component.type);
    const bounds = componentWorldBounds(component);
    const center = boxLike
      ? componentCenter(component)
      : [
          (bounds.minX + bounds.maxX) / 2,
          (bounds.minY + bounds.maxY) / 2,
          (bounds.minZ + bounds.maxZ) / 2,
        ];
    const dimensions = boxLike
      ? [Math.max(0.02, Number(component.w) || 0.02), Math.max(0.02, Number(component.h) || 0.02), Math.max(0.02, Number(component.d) || 0.02)]
      : [Math.max(0.02, bounds.maxX - bounds.minX), Math.max(0.02, bounds.maxY - bounds.minY), Math.max(0.02, bounds.maxZ - bounds.minZ)];
    const baseRotation = boxLike ? componentRotation(component) : [0, 0, 0];
    const fragmentSize = [
      dimensions[0] / split.columns,
      dimensions[1] / split.rows,
      dimensions[2] / split.layers,
    ];
    const progress = split.progress;

    return split.cells.map((cell) => {
      const localCenterOffset = [
        cell.center[0] * dimensions[0],
        cell.center[1] * dimensions[1],
        cell.center[2] * dimensions[2],
      ];
      const localSpread = cell.direction.map((value) => value * split.distance * progress);
      const worldCenterOffset = rotateVector3(localCenterOffset, ...baseRotation);
      const worldSpread = rotateVector3(localSpread, ...baseRotation);
      const fragmentCenter = [
        center[0] + worldCenterOffset[0] + worldSpread[0],
        center[1] + worldCenterOffset[1] + worldSpread[1],
        center[2] + worldCenterOffset[2] + worldSpread[2],
      ];
      const rotation = baseRotation.map((value, axis) => value + cell.rotation[axis] * progress);
      return {
        id: `${component.id || "component"}-rectangle-${cell.index}`,
        name: `${component.name || "Part"} rectangle ${cell.index + 1}`,
        type: "box",
        x: fragmentCenter[0] - fragmentSize[0] / 2,
        y: fragmentCenter[1] - fragmentSize[1] / 2,
        z: fragmentCenter[2] - fragmentSize[2] / 2,
        w: fragmentSize[0],
        h: fragmentSize[1],
        d: fragmentSize[2],
        color: component.color || "#68777a",
        opacity: clamp(Number(component.opacity ?? 1), 0, 1),
        visible: component.visible !== false,
        rotationX: rotation[0],
        rotationY: rotation[1],
        rotationZ: rotation[2],
        rotation: rotation[1],
      };
    });
  }

  function buildComponentPrimitives(component, order, hitContext = null) {
    const hitRoot = hitContext?.root || component;
    const inheritedPathIds = Array.isArray(hitContext?.pathIds) ? hitContext.pathIds : [];
    const appendComponentId = hitContext?.appendComponentId !== false;
    const hitPathIds = appendComponentId && component?.id
      ? [...inheritedPathIds, component.id]
      : inheritedPathIds;
    if (component.visible === false) return [];
    if (component.rectangularSplit && Number(component.rectangularSplit.progress) > 0.0001) {
      return rectangularSplitRenderComponents(component).flatMap((fragment, fragmentIndex) => (
        buildComponentPrimitives(fragment, order + fragmentIndex / 1000, {
          root: hitRoot,
          pathIds: hitPathIds,
          appendComponentId: false,
        })
      ));
    }
    if (component.type === "group") {
      const groupOpacity = clamp(Number(component.opacity ?? 1), 0, 1);
      return (component.children || []).flatMap((child, childIndex) => {
        const renderedChild = { ...child, opacity: clamp(Number(child.opacity ?? 1), 0, 1) * groupOpacity };
        return buildComponentPrimitives(renderedChild, order + childIndex / 1000, {
          root: hitRoot,
          pathIds: hitPathIds,
        });
      });
    }
    let primitives = [];
    if (["box", "glassPanel", "text"].includes(component.type)) primitives = buildBoxPrimitives(component, order);
    else if (component.type === "cylinder") primitives = buildVerticalCylinderPrimitives(component, order);
    else if (component.type === "sphere") primitives = buildSpherePrimitives(component, order);
    else if (component.type === "cone") primitives = buildConePrimitives(component, order);
    else if (component.type === "wedge") primitives = buildWedgePrimitives(component, order);
    else if (component.type === "beam") primitives = buildBeamPrimitives(component, order);
    else if (component.type === "arrow") primitives = buildArrowPrimitives(component, order);
    else if (component.type === "rollerBed") primitives = buildRollerPrimitives(component, order);
    else if (component.type === "wheel") primitives = buildWheelPrimitives(component, order);
    return primitives.map((primitive) => ({
      ...primitive,
      component: hitRoot,
      hitPathIds,
    }));
  }

  function drawPrimitive(primitive) {
    if (primitive.kind === "polygon") {
      polygon(primitive.points, primitive.fill, primitive.stroke, primitive.lineWidth, primitive.alpha);
    } else if (primitive.kind === "line") {
      line3d(primitive.start, primitive.end, primitive.color, primitive.width, primitive.alpha);
    }
  }

  function drawTextComponentOverlays(components) {
    const labels = [];
    const visit = (component, inheritedOpacity = 1) => {
      if (!component || component.visible === false) return;
      const opacity = inheritedOpacity * clamp(Number(component.opacity ?? 1), 0, 1);
      if (component.type === "group") {
        (component.children || []).forEach((child) => visit(child, opacity));
        return;
      }
      if (component.type === "text" && String(component.text || "").trim()) labels.push({ component, opacity });
    };
    (components || []).forEach((component) => visit(component));
    labels.forEach(({ component, opacity }) => {
      const center = componentCenter(component);
      const screen = project(...center);
      const points = componentWorldPoints(component).map((point) => project(...point));
      const width = points.length ? Math.max(...points.map((point) => point[0])) - Math.min(...points.map((point) => point[0])) : 80;
      const height = points.length ? Math.max(...points.map((point) => point[1])) - Math.min(...points.map((point) => point[1])) : 20;
      const fontSize = clamp(Math.min(Math.max(10, height * .58), Math.max(10, width / Math.max(2, String(component.text).length * .58))), 10, 42);
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font = `800 ${fontSize}px Inter, Segoe UI, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(2, fontSize * .14);
      ctx.strokeStyle = "rgba(14,28,26,.72)";
      ctx.fillStyle = validColor(component.textColor, "#ffffff");
      ctx.strokeText(String(component.text), screen[0], screen[1], Math.max(30, width * .86));
      ctx.fillText(String(component.text), screen[0], screen[1], Math.max(30, width * .86));
      ctx.restore();
    });
  }

  function drawSelectionOverlay(selection) {
    const components = Array.isArray(selection) ? selection : (selection ? [selection] : []);
    const points = components.filter((component) => component.visible !== false).flatMap(componentScreenPoints);
    if (!points.length) return;
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const left = Math.min(...xs) - 5;
    const top = Math.min(...ys) - 5;
    const width = Math.max(10, Math.max(...xs) - Math.min(...xs) + 10);
    const height = Math.max(10, Math.max(...ys) - Math.min(...ys) + 10);
    ctx.save();
    ctx.setLineDash([8, 5]);
    ctx.strokeStyle = "rgba(255,255,255,.92)";
    ctx.lineWidth = 4;
    ctx.strokeRect(left, top, width, height);
    ctx.strokeStyle = "#e46d3a";
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, width, height);
    ctx.restore();
  }

  function marqueeScreenRect(drag = state.drag) {
    if (!drag || drag.kind !== "marquee") return null;
    const left = Math.min(drag.startX, drag.currentX);
    const top = Math.min(drag.startY, drag.currentY);
    return {
      left,
      top,
      right: Math.max(drag.startX, drag.currentX),
      bottom: Math.max(drag.startY, drag.currentY),
      width: Math.abs(drag.currentX - drag.startX),
      height: Math.abs(drag.currentY - drag.startY),
    };
  }

  function drawSelectionMarquee() {
    const rectangle = marqueeScreenRect();
    if (!rectangle || !state.drag?.moved) return;
    ctx.save();
    ctx.fillStyle = "rgba(42, 132, 255, 0.18)";
    ctx.strokeStyle = "rgba(102, 181, 255, 0.96)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.fillRect(rectangle.left, rectangle.top, rectangle.width, rectangle.height);
    ctx.strokeRect(rectangle.left, rectangle.top, rectangle.width, rectangle.height);
    ctx.restore();
  }

  function componentIntersectsMarquee(component, rectangle) {
    if (!component || component.visible === false || !rectangle) return false;
    const points = componentScreenPoints(component);
    if (!points.length) return false;
    const left = Math.min(...points.map((point) => point[0]));
    const right = Math.max(...points.map((point) => point[0]));
    const top = Math.min(...points.map((point) => point[1]));
    const bottom = Math.max(...points.map((point) => point[1]));
    return right >= rectangle.left
      && left <= rectangle.right
      && bottom >= rectangle.top
      && top <= rectangle.bottom;
  }

  function updateMarqueeSelection(drag = state.drag) {
    const rectangle = marqueeScreenRect(drag);
    if (!rectangle || !drag?.moved) return;
    const selectedIds = new Set(drag.initialSelectedIds || []);
    state.drawnComponents.forEach((entry) => {
      if (componentIntersectsMarquee(entry.renderedComponent, rectangle) && entry.component?.id) {
        selectedIds.add(entry.component.id);
      }
    });
    state.selectAllParts = false;
    state.selectedComponentIds = selectedIds;
    state.componentId = [...selectedIds].at(-1) || null;
    state.timelineTargetId = selectedIds.size === 1 ? state.componentId : null;
    state.timelineTargetPathIds = state.timelineTargetId ? [state.timelineTargetId] : [];
    state.timelineClipId = null;
    renderPerformance.invalidate();
  }


  function convexHullXZ(points) {
    const unique = [...new Map(points.map((point) => [`${point[0].toFixed(5)}:${point[2].toFixed(5)}`, point])).values()]
      .sort((first, second) => first[0] - second[0] || first[2] - second[2]);
    if (unique.length <= 3) return unique;
    const cross = (origin, first, second) => (first[0] - origin[0]) * (second[2] - origin[2]) - (first[2] - origin[2]) * (second[0] - origin[0]);
    const lower = [];
    unique.forEach((point) => {
      while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
      lower.push(point);
    });
    const upper = [];
    [...unique].reverse().forEach((point) => {
      while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
      upper.push(point);
    });
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }

  function drawDesignerShadow(component) {
    if (!component || component.visible === false) return;
    if (component.rectangularSplit && Number(component.rectangularSplit.progress) > 0.0001) {
      rectangularSplitRenderComponents(component).slice(0, 80).forEach(drawDesignerShadow);
      return;
    }
    const points = componentWorldPoints(component);
    if (points.length < 3) return;
    const minimumY = Math.min(...points.map((point) => point[1]));
    const maximumY = Math.max(...points.map((point) => point[1]));
    const height = Math.max(0.1, maximumY - Math.min(0, minimumY));
    const base = convexHullXZ(points.map((point) => [point[0], 0.025, point[2]]));
    if (base.length < 3) return;
    const castDistance = clamp(height * 0.2, 0.22, 4.5);
    const shifted = base.map((point) => [point[0] - castDistance * 0.62, 0.025, point[2] + castDistance * 0.78]);
    const hull = convexHullXZ([...base, ...shifted]);
    const centerX = hull.reduce((sum, point) => sum + point[0], 0) / hull.length;
    const centerZ = hull.reduce((sum, point) => sum + point[2], 0) / hull.length;
    const layerCount = renderPerformance.shadowLayerCount();
    if (layerCount <= 0) return;
    const layers = layerCount >= 2
      ? [{ expansion: 0.55, alpha: 0.04 }, { expansion: 0, alpha: 0.08 }]
      : [{ expansion: 0.15, alpha: 0.07 }];
    layers.forEach((layer, index) => {
      const expanded = hull.map((point) => {
        const dx = point[0] - centerX;
        const dz = point[2] - centerZ;
        const length = Math.max(0.001, Math.hypot(dx, dz));
        return [point[0] + dx / length * layer.expansion, 0.025 + index * 0.002, point[2] + dz / length * layer.expansion];
      });
      const shadowOpacity = Number.isFinite(Number(component.opacity)) ? clamp(Number(component.opacity), 0, 1) : 1;
      polygon(expanded, "#162126", null, 0, layer.alpha * shadowOpacity, {
        transparent: true,
        depthBias: -0.0002 - index * 0.00003,
      });
    });
  }

  function drawGrid() {
    const design = currentDesign();
    if (!design) return;
    const padding = Math.max(5, Math.max(design.base.w, design.base.d) * 0.3);
    const baseX = Number(design.base.x) || 0;
    const baseY = Number(design.base.y) || 0;
    const baseZ = Number(design.base.z) || 0;
    const minX = Math.min(0, baseX) - padding;
    const maxX = Math.max(0, baseX + design.base.w) + padding;
    const minZ = Math.min(0, baseZ) - padding;
    const maxZ = Math.max(0, baseZ + design.base.d) + padding;
    const belowFloor = state.pitch < 0;
    const floorAlpha = belowFloor ? 0.14 : 1;
    const gridAlpha = belowFloor ? 0.12 : 0.22;
    const majorGridAlpha = belowFloor ? 0.2 : 0.35;
    polygon(
      [[minX, 0, minZ], [maxX, 0, minZ], [maxX, 0, maxZ], [minX, 0, maxZ]],
      "#dce2de",
      "#7f8b87",
      1,
      floorAlpha,
      { transparent: belowFloor },
    );
    const span = Math.max(maxX - minX, maxZ - minZ);
    const minimumStep = Math.max(0.5, span / 120);
    const magnitude = 10 ** Math.floor(Math.log10(minimumStep));
    const normalized = minimumStep / magnitude;
    const niceStep = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
    const step = Math.max(0.5, state.snapStep, niceStep);
    const majorEvery = Math.max(1, Math.round(Math.max(5, step * 5) / step));
    let lineIndex = 0;
    for (let x = Math.ceil(minX / step) * step; x <= maxX; x += step) {
      const major = lineIndex % majorEvery === 0;
      line3d([x, 0.01, minZ], [x, 0.01, maxZ], major ? "#7f8b87" : "#aab4af", major ? 1 : 0.55, major ? majorGridAlpha : gridAlpha);
      lineIndex += 1;
    }
    lineIndex = 0;
    for (let z = Math.ceil(minZ / step) * step; z <= maxZ; z += step) {
      const major = lineIndex % majorEvery === 0;
      line3d([minX, 0.01, z], [maxX, 0.01, z], major ? "#7f8b87" : "#aab4af", major ? 1 : 0.55, major ? majorGridAlpha : gridAlpha);
      lineIndex += 1;
    }
    line3d([0, 0.04, 0], [maxX - padding * 0.75, 0.04, 0], AXIS_COLORS.x, 2, 1);
    line3d([0, 0.04, 0], [0, 0.04, maxZ - padding * 0.75], AXIS_COLORS.z, 2, 1);
    line3d([0, 0, 0], [0, Math.max(0, baseY + design.base.h) + padding * 0.3, 0], AXIS_COLORS.y, 2, 1);
  }

  function drawDesignEnvelope() {
    const design = currentDesign();
    if (!design || !state.showDesignEnvelope) return;
    const w = Math.max(MIN_DESIGN_ENVELOPE, Number(design.base.w) || MIN_DESIGN_ENVELOPE);
    const d = Math.max(MIN_DESIGN_ENVELOPE, Number(design.base.d) || MIN_DESIGN_ENVELOPE);
    const h = Math.max(MIN_DESIGN_ENVELOPE, Number(design.base.h) || MIN_DESIGN_ENVELOPE);
    const x = Number(design.base.x) || 0;
    const y = Number(design.base.y) || 0;
    const z = Number(design.base.z) || 0;
    const corners = [
      [x, y, z], [x+w, y, z], [x+w, y, z+d], [x, y, z+d],
      [x, y+h, z], [x+w, y+h, z], [x+w, y+h, z+d], [x, y+h, z+d],
    ];
    const edges = [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7],
    ];
    edges.forEach(([start, end]) => line3d(corners[start], corners[end], "#187d74", 1.5, 0.72));
    designEnvelopePieces(design).forEach((envelope) => {
      const selected = envelope.id === state.designEnvelopeId;
      drawWireEnvelope(envelope, selected ? "#e46d3a" : "#8a52b8", selected ? .98 : .7, selected ? 2.2 : 1.45);
    });
  }

  function drawWireEnvelope(envelope, color, alpha = .8, width = 1.35) {
    if (!envelope) return;
    const x = Number(envelope.x) || 0;
    const y = Number(envelope.y) || 0;
    const z = Number(envelope.z) || 0;
    const w = Math.max(MIN_DESIGN_ENVELOPE, Number(envelope.w) || MIN_DESIGN_ENVELOPE);
    const h = Math.max(MIN_DESIGN_ENVELOPE, Number(envelope.h) || MIN_DESIGN_ENVELOPE);
    const d = Math.max(MIN_DESIGN_ENVELOPE, Number(envelope.d) || MIN_DESIGN_ENVELOPE);
    const corners = [
      [x,y,z], [x+w,y,z], [x+w,y,z+d], [x,y,z+d],
      [x,y+h,z], [x+w,y+h,z], [x+w,y+h,z+d], [x,y+h,z+d],
    ];
    [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]
      .forEach(([start, end]) => line3d(corners[start], corners[end], color, width, alpha));
  }

  function drawComponentEnvelopes(components) {
    if (!state.showDesignEnvelope) return;
    const visit = (component) => {
      if (!component) return;
      if (component.collisionEnvelope) {
        const selected = state.selectedComponentIds.has(component.id) || state.selectAllParts;
        drawWireEnvelope(component.collisionEnvelope, selected ? "#e46d3a" : "#397fc0", selected ? .95 : .58, selected ? 2 : 1.15);
      }
      if (component.type === "group") (component.children || []).forEach(visit);
    };
    (components || []).forEach(visit);
  }

  function componentWorldPoints(component) {
    if (component.type === "group") return (component.children || []).flatMap(componentWorldPoints);
    if (["box", "glassPanel", "text"].includes(component.type)) return boxVertices(component);
    if (component.type === "cylinder") return verticalCylinderVertices(component, component.segments || 20, 1);
    if (component.type === "sphere") {
      const center = componentCenter(component);
      return [
        [-component.w/2,0,0],[component.w/2,0,0],[0,-component.h/2,0],[0,component.h/2,0],[0,0,-component.d/2],[0,0,component.d/2],
      ].map((offset) => {
        const rotated = rotateVector3(offset, ...componentRotation(component));
        return [center[0]+rotated[0],center[1]+rotated[1],center[2]+rotated[2]];
      });
    }
    if (component.type === "cone") return verticalCylinderVertices(component, component.segments || 20, 0);
    if (component.type === "wedge") return wedgeVertices(component);
    if (component.type === "beam") return beamVertices(component);
    if (component.type === "arrow") { const geometry = arrowGeometryPoints(component); return [geometry.start, geometry.end, ...geometry.wings]; }
    if (component.type === "rollerBed") {
      const radius = Math.max(0.05, Number(component.thickness) / 2);
      const corners = [
        [component.x - radius, component.y - radius, component.z],
        [component.x + component.w + radius, component.y - radius, component.z],
        [component.x + component.w + radius, component.y + radius, component.z + component.d],
        [component.x - radius, component.y + radius, component.z + component.d],
        [component.x - radius, component.y + radius, component.z],
        [component.x + component.w + radius, component.y - radius, component.z + component.d],
      ];
      const center = componentCenter(component);
      return corners.map((point) => rotatePoint3(point, center, ...componentRotation(component)));
    }
    if (component.type === "wheel") return wheelVertices(component, 16);
    return [componentCenter(component)];
  }

  function componentScreenPoints(component) {
    return componentWorldPoints(component).map((point) => project(...point));
  }

  function distanceToSegment(point, start, end) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) return Math.hypot(point[0] - start[0], point[1] - start[1]);
    const t = clamp(((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared, 0, 1);
    return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
  }

  function pointInPolygon(point, polygonPoints) {
    let inside = false;
    for (let index = 0, previous = polygonPoints.length - 1; index < polygonPoints.length; previous = index, index += 1) {
      const [x1, y1] = polygonPoints[index];
      const [x2, y2] = polygonPoints[previous];
      const denominator = Math.abs(y2 - y1) < 0.000001 ? (y2 >= y1 ? 0.000001 : -0.000001) : y2 - y1;
      const intersects = ((y1 > point[1]) !== (y2 > point[1]))
        && point[0] < (x2 - x1) * (point[1] - y1) / denominator + x1;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function primitiveHit(primitive, point) {
    if (primitive.kind === "polygon") {
      return pointInPolygon(point, primitive.points.map((worldPoint) => project(...worldPoint)));
    }
    if (primitive.kind === "line") {
      return distanceToSegment(point, project(...primitive.start), project(...primitive.end)) <= Math.max(7, primitive.width + 4);
    }
    return false;
  }

  function componentAt(event) {
    const point = canvasPoint(event);
    for (let index = state.hitPrimitives.length - 1; index >= 0; index -= 1) {
      const primitive = state.hitPrimitives[index];
      if (primitive.component?.visible === false || !primitiveHit(primitive, point)) continue;
      const root = currentDesign()?.components.find((component) => component.id === primitive.component?.id) || null;
      if (!root) continue;
      const timelineTarget = resolveTimelineTargetForHit(root, primitive.hitPathIds);
      return {
        component: root,
        timelineTargetId: timelineTarget.component?.id || root.id,
        timelineTargetPathIds: timelineTarget.pathIds,
      };
    }
    return null;
  }

  function gizmoWorldLength() {
    const design = currentDesign();
    return clamp(Math.max(design?.base.w || 20, design?.base.d || 10, design?.base.h || 8) * 0.17, 2.5, 7);
  }

  function normalizedVector(vector, fallback = [1,0,0]) {
    const length = Math.hypot(...vector);
    return length > 0.00001 ? vector.map((value) => value / length) : fallback;
  }

  function componentLocalAxes(component) {
    if (["beam", "arrow"].includes(component?.type)) {
      const rotation = componentRotation(component);
      const frame = beamSourceFrame(component);
      return {
        x: normalizedVector(rotateVector3(frame.forward, ...rotation), [1,0,0]),
        y: normalizedVector(rotateVector3(frame.up, ...rotation), [0,1,0]),
        z: normalizedVector(rotateVector3(frame.side, ...rotation), [0,0,1]),
      };
    }
    const rotation = component ? componentRotation(component) : [0,0,0];
    return {
      x: normalizedVector(rotateVector3([1,0,0], ...rotation), [1,0,0]),
      y: normalizedVector(rotateVector3([0,1,0], ...rotation), [0,1,0]),
      z: normalizedVector(rotateVector3([0,0,1], ...rotation), [0,0,1]),
    };
  }

  function ringPoints(axis, center, radius, vectors, segments = 72) {
    const first = axis === "x" ? vectors.y : vectors.x;
    const second = axis === "x" ? vectors.z : axis === "y" ? vectors.z : vectors.y;
    return Array.from({ length: segments + 1 }, (_, index) => {
      const angle = index / segments * Math.PI * 2;
      return [
        center[0] + (first[0] * Math.cos(angle) + second[0] * Math.sin(angle)) * radius,
        center[1] + (first[1] * Math.cos(angle) + second[1] * Math.sin(angle)) * radius,
        center[2] + (first[2] * Math.cos(angle) + second[2] * Math.sin(angle)) * radius,
      ];
    });
  }

  function gizmoGeometry() {
    const components = selectionComponents();
    if (!components.length) return null;
    const component = selectedComponent();
    const groupedSelection = components.length > 1;
    const center = groupedSelection ? selectionCenter(components) : componentCenter(component || components[0]);
    const length = gizmoWorldLength();
    const centerScreen = project(...center);
    const useLocalAxes = state.transformSpace === "local" && !groupedSelection;
    const vectors = useLocalAxes ? componentLocalAxes(component || components[0]) : {
      x: [1,0,0], y: [0,1,0], z: [0,0,1],
    };
    const endpoint = (axis) => [
      center[0] + vectors[axis][0] * length,
      center[1] + vectors[axis][1] * length,
      center[2] + vectors[axis][2] * length,
    ];
    return {
      center,
      length,
      centerScreen,
      vectors,
      axes: {
        x: { world: endpoint("x"), screen: project(...endpoint("x")) },
        y: { world: endpoint("y"), screen: project(...endpoint("y")) },
        z: { world: endpoint("z"), screen: project(...endpoint("z")) },
      },
      rings: {
        x: ringPoints("x", center, length * 0.78, vectors).map((point) => project(...point)),
        y: ringPoints("y", center, length * 0.9, vectors).map((point) => project(...point)),
        z: ringPoints("z", center, length * 1.02, vectors).map((point) => project(...point)),
      },
    };
  }

  function drawArrow(start, end, color, square = false, highlighted = false) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.lineWidth = highlighted ? 9 : 8;
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = highlighted ? 6 : 4;
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    if (square) {
      const size = highlighted ? 16 : 13;
      ctx.fillRect(end[0] - size / 2, end[1] - size / 2, size, size);
      ctx.strokeRect(end[0] - size / 2, end[1] - size / 2, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(end[0], end[1], highlighted ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawScreenPolyline(points, color, highlighted = false) {
    if (points.length < 2) return;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255,255,255,.94)";
    ctx.lineWidth = highlighted ? 9 : 7;
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point[0], point[1]) : ctx.moveTo(point[0], point[1]));
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = highlighted ? 6 : 4;
    ctx.stroke();
    ctx.restore();
  }

  function drawGizmo() {
    const geometry = gizmoGeometry();
    if (!geometry || state.tool === "select" || state.tool === "pan") return;
    const { centerScreen, axes, rings } = geometry;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.3)";
    ctx.shadowBlur = 4;
    if (state.tool === "move" || state.tool === "scale") {
      Object.entries(axes).forEach(([axis, value]) => drawArrow(
        centerScreen,
        value.screen,
        AXIS_COLORS[axis],
        state.tool === "scale",
        state.hoverHandle === axis,
      ));
      ctx.fillStyle = "#f3a13b";
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      if (state.tool === "move") {
        ctx.fillRect(centerScreen[0] - 8, centerScreen[1] - 8, 16, 16);
        ctx.strokeRect(centerScreen[0] - 8, centerScreen[1] - 8, 16, 16);
      } else {
        ctx.beginPath();
        ctx.arc(centerScreen[0], centerScreen[1], 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (state.tool === "rotate") {
      ["x", "y", "z"].forEach((axis) => drawScreenPolyline(rings[axis], AXIS_COLORS[axis], state.hoverHandle === axis));
    }
    ctx.restore();
  }

  function nearestRingHit(point, ring) {
    let result = { distance: Infinity, tangent: [1, 0] };
    for (let index = 1; index < ring.length; index += 1) {
      const start = ring[index - 1];
      const end = ring[index];
      const distance = distanceToSegment(point, start, end);
      if (distance < result.distance) {
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const length = Math.max(0.0001, Math.hypot(dx, dy));
        result = { distance, tangent: [dx / length, dy / length] };
      }
    }
    return result;
  }

  function gizmoHit(event) {
    const geometry = gizmoGeometry();
    if (!geometry) return null;
    const point = canvasPoint(event);
    const { centerScreen, axes, rings } = geometry;
    if (state.tool === "rotate") {
      const candidates = ["x", "y", "z"].map((axis) => ({ axis, ...nearestRingHit(point, rings[axis]) }))
        .sort((first, second) => first.distance - second.distance);
      return candidates[0]?.distance <= 12 ? candidates[0] : null;
    }
    if (Math.hypot(point[0] - centerScreen[0], point[1] - centerScreen[1]) <= 16) return { axis: "center" };
    for (const [axis, value] of Object.entries(axes)) {
      if (Math.hypot(point[0] - value.screen[0], point[1] - value.screen[1]) <= 18) return { axis };
      if (distanceToSegment(point, centerScreen, value.screen) <= 10) return { axis };
    }
    return null;
  }

  function updateCanvasSize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = renderPerformance.pixelRatio(window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  let componentAnimationPresenceCache = new WeakMap();

  function componentHasAnimation(component) {
    if (!component) return false;
    if (componentAnimationPresenceCache.has(component)) return componentAnimationPresenceCache.get(component);
    let animated = false;
    if (component.animationTimeline && Array.isArray(component.animationTimeline.clips)) {
      animated = component.animationTimeline.enabled !== false && component.animationTimeline.clips.some((clip) => clip.enabled !== false)
        || (component.type === "group" && (component.children || []).some(componentHasAnimation));
    } else if (component.visible === false) {
      animated = component.type === "group" && (component.children || []).some(componentHasAnimation);
    } else if (component.animationEnabled === true && component.animationType && component.animationType !== "none") {
      animated = true;
    } else {
      animated = component.type === "group" && (component.children || []).some(componentHasAnimation);
    }
    componentAnimationPresenceCache.set(component, animated);
    return animated;
  }

  function draw(time) {
    if (!applicationActive) return;
    animationFrameId = requestAnimationFrame(draw);
    const design = currentDesign();
    const sourceComponents = design?.components || [];
    const animating = state.previewAnimations && sourceComponents.some(componentHasAnimation);
    if (!renderPerformance.shouldRender(time, { interacting: state.dragging, animating })) return;
    const frameStartedAt = performance.now();
    renderPerformance.beginProfile?.();
    state.lastFrameTime = time;
    state.lastRenderedAt = time;
    updateCanvasSize();
    const belowFloor = state.pitch < 0;
    canvas.classList.toggle("below-floor-view", belowFloor);
    const cameraPosition = document.getElementById("designer-camera-position");
    if (cameraPosition) cameraPosition.textContent = belowFloor ? "Below floor \u00B7 floor transparent" : "Above floor \u00B7 full orbit enabled";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    depthRenderer.beginFrame(canvas.width, canvas.height, project, rendererViewState());
    renderPerformance.beginPhase?.("grid");
    drawRetainedObject(
      "designer:grid",
      `${design?.base?.x}|${design?.base?.y}|${design?.base?.z}|${design?.base?.w}|${design?.base?.h}|${design?.base?.d}`,
      drawGrid,
    );

    const animationTick = animating ? Math.floor(time / (renderPerformance.animationSampleMs?.() || 33)) : "static";
    const geometrySignature = designGeometrySignature(design, animationTick);
    let components = state.lastRenderedComponents || sourceComponents;
    renderPerformance.beginPhase?.("geometry");
    const rebuildGeometry = typeof depthRenderer.beginObject !== "function"
      || depthRenderer.beginObject(`designer:design:${state.designId}`, geometrySignature) !== false;
    if (rebuildGeometry) {
      components = sourceComponents.map((component) => (
        componentHasAnimation(component) ? animatedComponent(component, time) : component
      ));
      state.lastRenderedComponents = components;
      const shadowLimit = renderPerformance.maxShadowParts();
      if (shadowLimit > 0) components.slice(0, shadowLimit).forEach(drawDesignerShadow);
      state.renderPrimitives = components.flatMap((component, index) => buildComponentPrimitives(component, index));
      state.renderPrimitives.sort((first, second) => {
        const depthDifference = first.depth - second.depth;
        if (Math.abs(depthDifference) > 0.00001) return depthDifference;
        const firstLayer = first.kind === "line" ? 2 : first.alpha < 0.985 ? 1 : 0;
        const secondLayer = second.kind === "line" ? 2 : second.alpha < 0.985 ? 1 : 0;
        return firstLayer - secondLayer || first.order - second.order;
      });
      state.renderPrimitives.forEach(drawPrimitive);
      drawDesignEnvelope();
      drawComponentEnvelopes(sourceComponents);
      depthRenderer.endObject?.();
    }
    state.hitPrimitives = state.renderPrimitives;
    state.drawnComponents = components.map((component, index) => ({
      component: sourceComponents[index],
      renderedComponent: component,
      depth: project(...componentCenter(component))[2],
      order: index,
    })).sort((first, second) => first.depth - second.depth || first.order - second.order);
    renderPerformance.beginPhase?.("gpu");
    depthRenderer.render();
    renderPerformance.setRendererStats?.(depthRenderer.getStats?.());
    renderPerformance.beginPhase?.("overlays");
    drawTextComponentOverlays(components);
    const selectedIds = state.selectAllParts
      ? new Set(state.drawnComponents.map((entry) => entry.component?.id))
      : state.selectedComponentIds;
    const selectedRendered = state.drawnComponents
      .filter((entry) => selectedIds.has(entry.component?.id))
      .map((entry) => entry.renderedComponent);
    drawSelectionOverlay(selectedRendered);
    drawGizmo();
    drawSelectionMarquee();
    updateTimelinePlayhead(time);
    renderPerformance.endPhase?.();
    renderPerformance.recordFrame(performance.now() - frameStartedAt);
  }

  function fitView() {
    const design = currentDesign();
    if (!design) return;
    state.panX = 0;
    state.panY = 0;
    state.panZ = 0;
    state.zoom = clamp(20 / Math.max(design.base.w, design.base.d, design.base.h * 1.4), 0.45, 2.4);
  }

  function focusSelected() {
    const design = currentDesign();
    const components = selectionComponents();
    if (!design || !components.length) return;
    const center = selectionCenter(components);
    state.panX = center[0] - ((Number(design.base.x) || 0) + design.base.w / 2);
    state.panY = center[1];
    state.panZ = center[2] - ((Number(design.base.z) || 0) + design.base.d / 2);
    state.zoom = clamp(components.length > 1 ? 20 / Math.max(design.base.w, design.base.d, design.base.h * 1.4) : state.zoom * 1.2, 0.25, 4);
    showToast(components.length > 1 ? `Focused ${components.length} selected parts.` : `Focused ${components[0].name}.`);
  }

  function panCamera(deltaX, deltaY) {
    const cy = Math.cos(state.yaw);
    const sy = Math.sin(state.yaw);
    const cp = Math.cos(state.pitch);
    const sp = Math.sin(state.pitch);
    const scale = state.zoom * Math.min(canvas.width / 50, canvas.height / 28);
    const [safeDeltaX, safeDeltaY] = stabilizedPanDelta(deltaX, deltaY);
    const rx = safeDeltaX / Math.max(1, scale);
    const screenVertical = safeDeltaY / Math.max(1, scale);
    const rz = screenVertical * sp;
    // Follow the camera's screen-up vector. Near a horizontal view vertical
    // drag moves the camera target vertically; near a top view it moves across
    // floor depth. Their squared projection always sums to one, so the model
    // follows the pointer at the same speed for every pitch.
    state.panX -= rx * cy + rz * sy;
    state.panY += screenVertical * cp;
    state.panZ -= -rx * sy + rz * cy;
  }

  function translateComponent(component, dx, dy, dz) {
    if (component.collisionEnvelope) {
      component.collisionEnvelope.x += dx;
      component.collisionEnvelope.y += dy;
      component.collisionEnvelope.z += dz;
    }
    if (component.type === "group") {
      (component.children || []).forEach((child) => translateComponent(child, dx, dy, dz));
      return;
    }
    component.x += dx;
    component.y += dy;
    component.z += dz;
    if (["beam", "arrow"].includes(component.type)) {
      component.x2 += dx;
      component.y2 += dy;
      component.z2 += dz;
    }
  }

  function rotateComponent(component, degrees, axis = "y", original = component) {
    if (component.type === "group") {
      Object.assign(component, clone(original));
      const children = component.children || [];
      const originals = original.children || [];
      rotateSelectionByEuler(children, originals, selectionCenter(originals), degrees, axis);
      component.rotationX = (Number(original.rotationX) || 0) + (axis === "x" ? degrees : 0);
      component.rotationY = (Number(original.rotationY ?? original.rotation) || 0) + (axis === "y" ? degrees : 0);
      component.rotationZ = (Number(original.rotationZ) || 0) + (axis === "z" ? degrees : 0);
      component.rotation = component.rotationY;
      return;
    }
    Object.assign(component, clone(original));
    const [rotationX, rotationY, rotationZ] = componentRotation(original);
    const source = axis === "x" ? rotationX : axis === "z" ? rotationZ : rotationY;
    setComponentRotation(component, axis, source + degrees);
  }

  function scaleComponent(component, factor, axis = "center", original = component) {
    factor = clamp(factor, 0.05, 20);
    const originalScaleX = Number(original.scaleXPercent) || 100;
    const originalScaleY = Number(original.scaleYPercent) || 100;
    const originalScaleZ = Number(original.scaleZPercent) || 100;
    if (component.type === "group") {
      Object.assign(component, clone(original));
      const children = component.children || [];
      const originals = original.children || [];
      scaleSelectionTogether(children, originals, selectionCenter(originals), factor, axis);
      component.scaleXPercent = axis === "center" || axis === "x" ? originalScaleX * factor : originalScaleX;
      component.scaleYPercent = axis === "center" || axis === "y" ? originalScaleY * factor : originalScaleY;
      component.scaleZPercent = axis === "center" || axis === "z" ? originalScaleZ * factor : originalScaleZ;
      return;
    }
    const uniform = axis === "center";
    if (["box", "glassPanel", "cylinder", "sphere", "cone", "wedge", "text"].includes(component.type)) {
      const center = componentCenter(original);
      const scaleX = uniform || axis === "x" ? factor : 1;
      const scaleY = uniform || axis === "y" ? factor : 1;
      const scaleZ = uniform || axis === "z" ? factor : 1;
      component.w = Math.max(0.02, original.w * scaleX);
      component.h = Math.max(0.02, original.h * scaleY);
      component.d = Math.max(0.02, original.d * scaleZ);
      component.x = center[0] - component.w / 2;
      component.y = center[1] - component.h / 2;
      component.z = center[2] - component.d / 2;
    } else if (component.type === "rollerBed") {
      const center = componentCenter(original);
      const scaleX = uniform || axis === "x" ? factor : 1;
      const scaleZ = uniform || axis === "z" ? factor : 1;
      component.w = Math.max(0.1, original.w * scaleX);
      component.d = Math.max(0.1, original.d * scaleZ);
      component.x = center[0] - component.w / 2;
      component.z = center[2] - component.d / 2;
      if (uniform || axis === "y") component.thickness = Math.max(0.2, original.thickness * factor);
    } else if (["beam", "arrow"].includes(component.type)) {
      const center = componentCenter(original);
      const start = [Number(original.x), Number(original.y), Number(original.z)];
      const end = [Number(original.x2), Number(original.y2), Number(original.z2)];
      const direction = normalizedVector(vectorBetween(start, end), [1,0,0]);
      const halfLength = pointDistance(start, end) / 2 * (uniform || axis === "x" ? factor : 1);
      component.x = center[0] - direction[0] * halfLength;
      component.y = center[1] - direction[1] * halfLength;
      component.z = center[2] - direction[2] * halfLength;
      component.x2 = center[0] + direction[0] * halfLength;
      component.y2 = center[1] + direction[1] * halfLength;
      component.z2 = center[2] + direction[2] * halfLength;
      component.thicknessY = Math.max(0.2, Number(original.thicknessY || original.thickness) * (uniform || axis === "y" ? factor : 1));
      component.thicknessZ = Math.max(0.2, Number(original.thicknessZ || original.thickness) * (uniform || axis === "z" ? factor : 1));
      component.thickness = Math.max(component.thicknessY, component.thicknessZ);
    } else if (component.type === "wheel") {
      const scaleX = uniform || axis === "x" ? factor : 1;
      const scaleY = uniform || axis === "y" ? factor : 1;
      const scaleZ = uniform || axis === "z" ? factor : 1;
      component.w = Math.max(0.1, original.w * scaleX);
      component.h = Math.max(0.1, original.h * scaleY);
      component.d = Math.max(0.05, original.d * scaleZ);
      component.size = Math.max(component.w, component.h);
    }
    if (axis === "center") {
      component.scaleXPercent = originalScaleX * factor;
      component.scaleYPercent = originalScaleY * factor;
      component.scaleZPercent = originalScaleZ * factor;
    } else {
      component.scaleXPercent = axis === "x" ? originalScaleX * factor : originalScaleX;
      component.scaleYPercent = axis === "y" ? originalScaleY * factor : originalScaleY;
      component.scaleZPercent = axis === "z" ? originalScaleZ * factor : originalScaleZ;
    }
  }

  function rotateSelectionByEuler(components, originals, pivot, degrees, axis) {
    const rotationVector = axis === "x" ? [degrees, 0, 0] : axis === "z" ? [0, 0, degrees] : [0, degrees, 0];
    components.forEach((component, index) => {
      const original = originals[index];
      if (!original) return;
      Object.assign(component, clone(original));
      const originalCenter = componentCenter(original);
      const offset = [originalCenter[0] - pivot[0], originalCenter[1] - pivot[1], originalCenter[2] - pivot[2]];
      const rotatedOffset = rotateVector3(offset, ...rotationVector);
      const targetCenter = [pivot[0] + rotatedOffset[0], pivot[1] + rotatedOffset[1], pivot[2] + rotatedOffset[2]];
      translateComponent(component, targetCenter[0] - originalCenter[0], targetCenter[1] - originalCenter[1], targetCenter[2] - originalCenter[2]);
      const [rotationX, rotationY, rotationZ] = componentRotation(original);
      const source = axis === "x" ? rotationX : axis === "z" ? rotationZ : rotationY;
      setComponentRotation(component, axis, source + degrees);
    });
  }

  function rotateComponentTreeAroundPivot(component, original, pivot, rotationMatrix) {
    Object.assign(component, clone(original));
    if (component.type === "group") {
      const children = component.children || [];
      const originalChildren = original.children || [];
      children.forEach((child, index) => {
        if (originalChildren[index]) rotateComponentTreeAroundPivot(child, originalChildren[index], pivot, rotationMatrix);
      });
    } else {
      const originalCenter = componentCenter(original);
      const offset = [originalCenter[0] - pivot[0], originalCenter[1] - pivot[1], originalCenter[2] - pivot[2]];
      const rotatedOffset = transformVectorByMatrix(rotationMatrix, offset);
      const targetCenter = [pivot[0] + rotatedOffset[0], pivot[1] + rotatedOffset[1], pivot[2] + rotatedOffset[2]];
      translateComponent(component, targetCenter[0] - originalCenter[0], targetCenter[1] - originalCenter[1], targetCenter[2] - originalCenter[2]);
    }
    const originalRotation = rotationMatrixFromEuler(componentRotation(original));
    setComponentRotationFromMatrix(component, multiplyRotationMatrices(rotationMatrix, originalRotation));
  }

  function rotateSelectionTogether(components, originals, pivot, degrees, axis, rotationVectors = null) {
    const rotationMatrix = rotationMatrixForAxis(axis, degrees, rotationVectors);
    components.forEach((component, index) => {
      const original = originals[index];
      if (original) rotateComponentTreeAroundPivot(component, original, pivot, rotationMatrix);
    });
  }

  function mirrorPointAcrossAxis(point, pivot, axis) {
    const result = [...point];
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];
    result[axisIndex] = pivot[axisIndex] * 2 - result[axisIndex];
    return result;
  }

  function mirrorComponentTree(component, original, pivot, axis) {
    Object.assign(component, clone(original));
    const reflection = axis === "x"
      ? [[-1, 0, 0], [0, 1, 0], [0, 0, 1]]
      : axis === "y"
        ? [[1, 0, 0], [0, -1, 0], [0, 0, 1]]
        : [[1, 0, 0], [0, 1, 0], [0, 0, -1]];

    if (component.type === "group") {
      const children = component.children || [];
      const originalChildren = original.children || [];
      children.forEach((child, index) => {
        if (originalChildren[index]) mirrorComponentTree(child, originalChildren[index], pivot, axis);
      });
    } else if (["beam", "arrow"].includes(component.type)) {
      const start = mirrorPointAcrossAxis([original.x, original.y, original.z], pivot, axis);
      const end = mirrorPointAcrossAxis([original.x2, original.y2, original.z2], pivot, axis);
      [component.x, component.y, component.z] = start;
      [component.x2, component.y2, component.z2] = end;
    } else {
      const originalCenter = componentCenter(original);
      const targetCenter = mirrorPointAcrossAxis(originalCenter, pivot, axis);
      translateComponent(
        component,
        targetCenter[0] - originalCenter[0],
        targetCenter[1] - originalCenter[1],
        targetCenter[2] - originalCenter[2],
      );
    }

    // Reflection changes handedness. Reflecting both the world and local axes
    // produces an equivalent right-handed rotation that existing renderers can
    // store without negative dimensions or scale values.
    const originalRotation = rotationMatrixFromEuler(componentRotation(original));
    const mirroredRotation = multiplyRotationMatrices(
      multiplyRotationMatrices(reflection, originalRotation),
      reflection,
    );
    setComponentRotationFromMatrix(component, mirroredRotation);
  }

  function mirrorSelection(axis) {
    if (!["x", "y", "z"].includes(axis)) return;
    const components = selectionComponents();
    if (!components.length) return;
    pushHistory();
    const originals = components.map(clone);
    const pivot = selectionCenter(originals);
    components.forEach((component, index) => mirrorComponentTree(component, originals[index], pivot, axis));
    commit(`Mirrored ${components.length > 1 ? `${components.length} selected parts` : components[0].name} across ${axis.toUpperCase()}.`);
  }

  function scaleSelectionTogether(components, originals, pivot, factor, axis) {
    const uniform = axis === "center";
    const scaleX = uniform || axis === "x" ? factor : 1;
    const scaleY = uniform || axis === "y" ? factor : 1;
    const scaleZ = uniform || axis === "z" ? factor : 1;
    components.forEach((component, index) => {
      const original = originals[index];
      Object.assign(component, clone(original));
      const originalCenter = componentCenter(original);
      scaleComponent(component, factor, axis, original);
      const targetCenter = [
        pivot[0] + (originalCenter[0] - pivot[0]) * scaleX,
        pivot[1] + (originalCenter[1] - pivot[1]) * scaleY,
        pivot[2] + (originalCenter[2] - pivot[2]) * scaleZ,
      ];
      const currentCenter = componentCenter(component);
      translateComponent(component, targetCenter[0] - currentCenter[0], targetCenter[1] - currentCenter[1], targetCenter[2] - currentCenter[2]);
    });
  }

  function axisDragAmount(axis, totalDeltaX, totalDeltaY, geometry) {
    const endpoint = geometry.axes[axis]?.screen;
    if (!endpoint) return 0;
    const vectorX = endpoint[0] - geometry.centerScreen[0];
    const vectorY = endpoint[1] - geometry.centerScreen[1];
    const length = Math.max(1, Math.hypot(vectorX, vectorY));
    const unitX = vectorX / length;
    const unitY = vectorY / length;
    return (totalDeltaX * unitX + totalDeltaY * unitY) / length * geometry.length;
  }

  function beginTransform(event, handle) {
    const components = selectionComponents();
    if (!components.length) return false;
    const point = canvasPoint(event);
    const geometry = gizmoGeometry();
    const [worldX, worldZ] = worldFromScreen(event);
    state.drag = {
      kind: "transform",
      tool: state.tool,
      handle: handle?.axis || handle || "center",
      rotationTangent: handle?.tangent || [1, 0],
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPoint: point,
      startWorldX: worldX,
      startWorldZ: worldZ,
      startAngle: Math.atan2(point[1] - geometry.centerScreen[1], point[0] - geometry.centerScreen[0]),
      startDistance: Math.max(10, Math.hypot(point[0] - geometry.centerScreen[0], point[1] - geometry.centerScreen[1])),
      geometry,
      selectionAll: components.length > 1,
      targetIds: components.map((component) => component.id),
      componentsBefore: components.map(clone),
      pivot: components.length > 1 ? selectionCenter(components) : componentCenter(components[0]),
      historyBefore: snapshot(),
    };
    return true;
  }

  function applyTransform(event) {
    const drag = state.drag;
    if (!drag || drag.kind !== "transform") return;
    const design = currentDesign();
    const targets = drag.targetIds.map((id) => design?.components.find((component) => component.id === id)).filter(Boolean);
    if (!targets.length) return;
    targets.forEach((component, index) => Object.assign(component, clone(drag.componentsBefore[index])));
    const totalDeltaX = event.clientX - drag.startClientX;
    const totalDeltaY = event.clientY - drag.startClientY;

    if (drag.tool === "move") {
      let dx = 0;
      let dy = 0;
      let dz = 0;
      if (drag.handle === "center") {
        const [worldX, worldZ] = worldFromScreen(event);
        dx = snapValue(worldX - drag.startWorldX);
        dz = snapValue(worldZ - drag.startWorldZ);
      } else {
        const amount = axisDragAmount(drag.handle, totalDeltaX, totalDeltaY, drag.geometry);
        const delta = snapValue(amount);
        const vector = drag.geometry.vectors?.[drag.handle] || {
          x:[1,0,0], y:[0,1,0], z:[0,0,1],
        }[drag.handle];
        dx = vector[0] * delta;
        dy = vector[1] * delta;
        dz = vector[2] * delta;
      }
      targets.forEach((component) => translateComponent(component, dx, dy, dz));
    } else if (drag.tool === "rotate") {
      const point = canvasPoint(event);
      const currentAngle = Math.atan2(point[1] - drag.geometry.centerScreen[1], point[0] - drag.geometry.centerScreen[0]);
      let angleDelta = currentAngle - drag.startAngle;
      while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
      while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
      let degrees = angleDelta * 180 / Math.PI;
      degrees = snapRotationDegrees(degrees);
      if (drag.selectionAll || targets[0].type === "group") {
        rotateSelectionTogether(targets, drag.componentsBefore, drag.pivot, degrees, drag.handle, drag.geometry.vectors);
      } else rotateComponent(targets[0], degrees, drag.handle, drag.componentsBefore[0]);
    } else if (drag.tool === "scale") {
      let factor;
      if (drag.handle === "center") {
        const point = canvasPoint(event);
        const distance = Math.max(5, Math.hypot(point[0] - drag.geometry.centerScreen[0], point[1] - drag.geometry.centerScreen[1]));
        factor = distance / drag.startDistance;
      } else {
        const amount = axisDragAmount(drag.handle, totalDeltaX, totalDeltaY, drag.geometry);
        if (drag.selectionAll) {
          const bounds = selectionBounds(drag.componentsBefore);
          const size = drag.handle === "x" ? bounds.maxX - bounds.minX : drag.handle === "y" ? bounds.maxY - bounds.minY : bounds.maxZ - bounds.minZ;
          factor = 1 + amount / Math.max(0.1, size);
        } else {
          const original = drag.componentsBefore[0];
          const beamLength = original.type === "beam"
            ? pointDistance([original.x, original.y, original.z], [original.x2, original.y2, original.z2])
            : 0;
          const size = drag.handle === "x"
            ? (original.type === "beam" ? beamLength : original.w || 1)
            : drag.handle === "y"
              ? (original.type === "beam" ? Number(original.thicknessY || original.thickness) * .16 : original.h || original.size || 1)
              : (original.type === "beam" ? Number(original.thicknessZ || original.thickness) * .16 : original.d || 1);
          factor = 1 + amount / Math.max(0.1, size);
        }
      }
      factor = clamp(factor, 0.05, 20);
      factor = snapScaleFactor(factor);
      if (drag.selectionAll) scaleSelectionTogether(targets, drag.componentsBefore, drag.pivot, factor, drag.handle);
      else scaleComponent(targets[0], factor, drag.handle, drag.componentsBefore[0]);
    }
    markDesignGeometryDirty({ invalidate: false });
    updateComponentProperties();
  }

  function finishPointer(event) {
    if (state.drag?.kind === "transform") {
      const design = currentDesign();
      const current = state.drag.targetIds.map((id) => design?.components.find((component) => component.id === id)).filter(Boolean);
      if (JSON.stringify(current) !== JSON.stringify(state.drag.componentsBefore)) {
        pushHistory(state.drag.historyBefore);
        commit(`${TOOL_LABELS[state.drag.tool][0]} applied to ${state.drag.selectionAll ? "the entire machine" : "the selected part"}.`);
      }
    } else if (state.drag?.kind === "marquee") {
      const drag = state.drag;
      if (event?.type === "pointercancel") {
        state.selectAllParts = drag.initialSelectAllParts === true;
        state.selectedComponentIds = new Set(drag.initialSelectedIds || []);
        state.componentId = drag.initialComponentId || null;
        state.timelineTargetId = drag.initialTimelineTargetId || null;
        state.timelineTargetPathIds = [...(drag.initialTimelineTargetPathIds || [])];
        state.timelineClipId = drag.initialTimelineClipId || null;
      } else {
        if (Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)) {
          const [currentX, currentY] = canvasPoint(event);
          drag.currentX = currentX;
          drag.currentY = currentY;
          drag.moved = drag.moved
            || Math.hypot(currentX - drag.startX, currentY - drag.startY) >= MARQUEE_DRAG_THRESHOLD;
        }
        updateMarqueeSelection(drag);
        if (drag.moved) {
          updateInterface();
          const count = state.selectedComponentIds.size;
          showToast(count ? `Selected ${count} machine part${count === 1 ? "" : "s"}.` : "No machine parts were inside the selection box.");
        }
      }
    }
    state.dragging = false;
    state.drag = null;
    canvas.style.cursor = state.tool === "pan" ? "grab" : "default";
    renderPerformance.invalidate();
  }

  // Middle-button dragging pans the 3D scene. Cancel the browser's native
  // autoscroll gesture so panning cannot scroll the surrounding page when the
  // viewport is not fullscreen. `mousedown` is handled explicitly because
  // desktop browsers may start autoscroll before the pointer event completes.
  canvas.addEventListener("mousedown", (event) => {
    if (event.button === 1) event.preventDefault();
  }, { passive: false });
  canvas.addEventListener("auxclick", (event) => {
    if (event.button === 1) event.preventDefault();
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button === 1) event.preventDefault();
    if (event.button > 2) return;
    commitActiveInspectorEdit();
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    state.dragging = true;
    renderPerformance.noteInteraction(260);

    const orbitRequested = event.button === 2 || event.altKey;
    const initialHitResult = event.button === 0 ? componentAt(event) : null;
    const initialHit = initialHitResult?.component || null;
    const additiveSelection = event.shiftKey || event.ctrlKey || event.metaKey;
    const panRequested = event.button === 1 || state.tool === "pan" || (event.shiftKey && !initialHit);

    if (orbitRequested) {
      state.drag = { kind: "orbit" };
    } else if (panRequested) {
      state.drag = { kind: "pan" };
    } else if (event.button === 0) {
      // Transform controls are an interface overlay. Test them before scene
      // geometry so a handle remains draggable even when it is visually
      // located inside another solid component.
      const overlayHandle = ["move", "rotate", "scale"].includes(state.tool) ? gizmoHit(event) : null;
      if (event.ctrlKey && !initialHit && !overlayHandle) {
        const [startX, startY] = canvasPoint(event);
        state.drag = {
          kind: "marquee",
          startX,
          startY,
          currentX: startX,
          currentY: startY,
          moved: false,
          initialSelectedIds: new Set(state.selectedComponentIds),
          initialComponentId: state.componentId,
          initialSelectAllParts: state.selectAllParts,
          initialTimelineTargetId: state.timelineTargetId,
          initialTimelineTargetPathIds: [...state.timelineTargetPathIds],
          initialTimelineClipId: state.timelineClipId,
        };
        canvas.style.cursor = "crosshair";
      } else if (overlayHandle && selectionComponents().length) {
        beginTransform(event, overlayHandle);
      } else {
        const hitResult = initialHitResult || componentAt(event);
        const hit = hitResult?.component || null;
        if (hit && (additiveSelection || !state.selectedComponentIds.has(hit.id))) {
          selectComponent(
            hit.id,
            true,
            additiveSelection,
            hitResult.timelineTargetId,
            hitResult.timelineTargetPathIds,
          );
        } else if (hit && !additiveSelection && state.tool === "select" && state.timelineTargetId !== hitResult.timelineTargetId) {
          state.timelineTargetId = hitResult.timelineTargetId || hit.id;
          state.timelineTargetPathIds = hitResult.timelineTargetPathIds || [hit.id];
          state.timelineClipId = null;
          updateInterface();
        } else if (hit && !additiveSelection && state.tool === "select") {
          const currentTargetPath = JSON.stringify(state.timelineTargetPathIds || []);
          const requestedTargetPath = JSON.stringify(hitResult.timelineTargetPathIds || [hit.id]);
          if (currentTargetPath !== requestedTargetPath) {
            state.timelineTargetPathIds = hitResult.timelineTargetPathIds || [hit.id];
            state.timelineClipId = null;
            updateInterface();
          }
        }
        if (selectionComponents().length && ["move", "rotate", "scale"].includes(state.tool) && hit && state.selectedComponentIds.has(hit.id)) {
          beginTransform(event, { axis: state.tool === "rotate" ? "y" : "center", tangent: [1, 0] });
        } else {
          state.drag = { kind: "select", startX: event.clientX, startY: event.clientY };
          if (!hit && state.tool === "select" && !additiveSelection) selectComponent(null);
        }
      }
    }
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    renderPerformance.noteInteraction(state.dragging ? 140 : 60);
    if (!state.dragging || !state.drag) {
      const hover = ["move", "rotate", "scale"].includes(state.tool) ? gizmoHit(event) : null;
      state.hoverHandle = hover?.axis || null;
      canvas.style.cursor = hover ? "pointer" : (state.tool === "pan" ? "grab" : "default");
      return;
    }
    state.hoverHandle = null;
    const deltaX = event.clientX - state.pointerX;
    const deltaY = event.clientY - state.pointerY;
    if (state.drag.kind === "orbit") {
      // Grab-and-drag camera motion: the scene follows the pointer in both axes.
      state.yaw -= deltaX * 0.006;
      state.pitch = clamp(state.pitch + deltaY * 0.004, -1.53, 1.53);
    } else if (state.drag.kind === "pan") {
      panCamera(deltaX, deltaY);
    } else if (state.drag.kind === "marquee") {
      const [currentX, currentY] = canvasPoint(event);
      state.drag.currentX = currentX;
      state.drag.currentY = currentY;
      state.drag.moved = state.drag.moved
        || Math.hypot(currentX - state.drag.startX, currentY - state.drag.startY) >= MARQUEE_DRAG_THRESHOLD;
      updateMarqueeSelection(state.drag);
    } else if (state.drag.kind === "transform") {
      applyTransform(event);
    }
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
  });

  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    renderPerformance.noteInteraction(260);
    // Slicer-style wheel navigation: scroll up zooms in; scroll down zooms out.
    state.zoom = clamp(state.zoom * (event.deltaY > 0 ? 0.9 : 1.1), 0.1, 10);
  }, { passive: false });
  canvas.addEventListener("dblclick", (event) => {
    const hitResult = componentAt(event);
    const hit = hitResult?.component || null;
    if (hit) {
      selectComponent(
        hit.id,
        true,
        false,
        hitResult.timelineTargetId,
        hitResult.timelineTargetPathIds,
      );
      focusSelected();
    } else fitView();
  });

  document.querySelectorAll("[data-browser-tab]").forEach((button) => {
    button.addEventListener("click", () => setBrowserTab(button.dataset.browserTab));
  });
  document.querySelectorAll("[data-inspector-tab]").forEach((button) => {
    button.addEventListener("click", () => setInspectorTab(button.dataset.inspectorTab));
  });
  document.querySelectorAll("[data-design-mode]").forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.designMode));
  });

  document.querySelectorAll("[data-part-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setPartTab(button.dataset.partTab);
      if (button.dataset.partTab === "animation") setTimelineOpen(true);
    });
  });

  document.getElementById("toggle-animation-timeline")?.addEventListener("click", () => {
    setTimelineOpen(!state.timelineOpen, { focusInspector: true });
  });
  document.getElementById("open-animation-timeline-panel")?.addEventListener("click", () => {
    setTimelineOpen(true, { focusInspector: true });
  });
  document.getElementById("close-animation-timeline")?.addEventListener("click", () => {
    setTimelineOpen(false);
  });

  function focusTimelineClip(clipId) {
    if (!clipId) return;
    state.timelineClipId = clipId;
    setTimelineOpen(true);
    setInspectorTab("object");
    setPartTab("animation");
    updateAnimationTimelineUI();
    const inspector = document.querySelector(".studio-inspector-panel");
    inspector?.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  document.getElementById("timeline-target-picker")?.addEventListener("change", (event) => {
    const component = selectedComponent();
    const targets = timelineTargetOptions(component);
    const selectedTarget = targets.find((item) => item.key === event.target.value) || targets[0] || null;
    state.timelineTargetId = selectedTarget?.id || component?.id || null;
    state.timelineTargetPathIds = selectedTarget?.pathIds || (component?.id ? [component.id] : []);
    const timeline = ensureTimeline(timelineTargetComponent());
    state.timelineClipId = timeline?.clips?.[0]?.id || null;
    updateAnimationTimelineUI();
  });

  ["timeline-enabled", "timeline-loop", "timeline-playback-rate"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", (event) => {
      const target = timelineTargetComponent();
      const timeline = ensureTimeline(target);
      if (!timeline) return;
      pushHistory();
      if (id === "timeline-enabled") timeline.enabled = event.target.checked;
      else if (id === "timeline-loop") sharedDesignTimelineSettings().loop = event.target.checked;
      else if (id === "timeline-playback-rate") sharedDesignTimelineSettings().playbackRate = clamp(Number(event.target.value) || 0, 0, 20);
      if (target !== selectedComponent()) target.playOwnAnimation = true;
      commit(id === "timeline-enabled"
        ? "Animation target settings updated."
        : "Shared machine timeline settings updated.");
    });
  });

  function addTimelineClip(type, requestedStart = null, { append = false } = {}) {
    const target = timelineTargetComponent();
    const timeline = ensureTimeline(target);
    if (!timeline || !timelineEngine) {
      showToast("Select one machine part before adding an animation.");
      return null;
    }
    const definition = timelineEngine.TYPES.find((item) => item.value === type) || timelineEngine.TYPES[0];
    if (!definition) return null;
    const automaticStart = append
      ? (timelineWorkspaceEngine?.nextClipStart?.(timeline.clips) ?? orderedTimelineClips(timeline).reduce((latest, item) => Math.max(latest, item.start + item.duration), 0))
      : timelineCurrentSeconds();
    const start = Math.max(0, Number.isFinite(Number(requestedStart)) ? Number(requestedStart) : automaticStart);
    pushHistory();
    const clip = timelineEngine.createClip(definition.value, start);
    const typeCount = timeline.clips.filter((item) => item.type === definition.value).length + 1;
    clip.name = `${definition.label} ${typeCount}`;
    timeline.clips.push(clip);
    timeline.clips = orderedTimelineClips(timeline);
    if (target !== selectedComponent()) target.playOwnAnimation = true;
    state.timelineClipId = clip.id;
    state.timelineOpen = true;
    state.inspectorTab = "object";
    state.partTab = "animation";
    commit(`${clip.name} added to ${target.name}.`);
    setTimelineOpen(true, { focusInspector: true });
    return clip;
  }

  const timelinePalette = document.getElementById("timeline-type-palette");
  timelinePalette?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-animation-type]");
    if (!button || button.disabled) return;
    addTimelineClip(button.dataset.animationType, null, { append: true });
  });
  timelinePalette?.addEventListener("dragstart", (event) => {
    const button = event.target.closest("[data-animation-type]");
    if (!button || button.disabled || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-machine-animation-type", button.dataset.animationType || "move");
    event.dataTransfer.setData("text/plain", button.dataset.animationType || "move");
    button.classList.add("dragging");
  });
  timelinePalette?.addEventListener("dragend", (event) => {
    event.target.closest("[data-animation-type]")?.classList.remove("dragging");
    document.getElementById("timeline-ruler-tracks")?.classList.remove("drop-active");
  });

  function selectTimelineClipFromEvent(event) {
    const button = event.target.closest("[data-timeline-clip-id]");
    if (!button) return;
    focusTimelineClip(button.dataset.timelineClipId);
  }

  const timelineTracks = document.getElementById("timeline-ruler-tracks");
  timelineTracks?.addEventListener("click", selectTimelineClipFromEvent);
  timelineTracks?.addEventListener("dragover", (event) => {
    const types = Array.from(event.dataTransfer?.types || []);
    if (!types.includes("application/x-machine-animation-type") && !types.includes("text/plain")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    timelineTracks.classList.add("drop-active");
  });
  timelineTracks?.addEventListener("dragleave", (event) => {
    if (!timelineTracks.contains(event.relatedTarget)) timelineTracks.classList.remove("drop-active");
  });
  timelineTracks?.addEventListener("drop", (event) => {
    event.preventDefault();
    timelineTracks.classList.remove("drop-active");
    const type = event.dataTransfer?.getData("application/x-machine-animation-type") || event.dataTransfer?.getData("text/plain") || "move";
    const target = timelineTargetComponent();
    const timeline = ensureTimeline(target);
    if (!timeline) return;
    const duration = timelineEngine.timelineDuration(timeline);
    const lane = event.target.closest(".timeline-track-lane") || timelineTracks;
    const rectangle = lane.getBoundingClientRect();
    const dropTime = timelineWorkspaceEngine?.timeFromClientX
      ? timelineWorkspaceEngine.timeFromClientX(event.clientX, rectangle, duration)
      : clamp((event.clientX - rectangle.left) / Math.max(1, rectangle.width), 0, 1) * duration;
    const snappedTime = timelineWorkspaceEngine?.snap
      ? timelineWorkspaceEngine.snap(dropTime, timelineSnapStep())
      : dropTime;
    addTimelineClip(type, snappedTime);
  });

  timelineTracks?.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const track = event.target.closest("[data-timeline-clip-id]");
    if (!track) return;
    const resizeHandle = event.target.closest("[data-timeline-resize]");
    const dragBody = event.target.closest("[data-timeline-drag-body]");
    if (!resizeHandle && !dragBody) {
      focusTimelineClip(track.dataset.timelineClipId);
      return;
    }
    const target = timelineTargetComponent();
    const timeline = ensureTimeline(target);
    const clip = timeline?.clips?.find((item) => item.id === track.dataset.timelineClipId);
    if (!clip) return;
    event.preventDefault();
    event.stopPropagation();
    focusTimelineClip(clip.id);
    const mode = resizeHandle?.dataset.timelineResize || "move";
    state.timelineDrag = {
      clipId: clip.id,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      originalStart: clip.start,
      originalDuration: clip.duration,
      originalClips: timeline.clips.map((item) => ({
        id: item.id,
        start: item.start,
        duration: item.duration,
      })),
      pixelsPerSecond: Math.max(1, Number(timelineTracks.dataset.pixelsPerSecond) || timelineWorkspaceEngine?.PIXELS_PER_SECOND || 44),
      before: snapshot(),
      changed: false,
    };
    try { timelineTracks.setPointerCapture(event.pointerId); } catch {}
    document.body.classList.add("timeline-dragging");
    document.body.dataset.timelineDragMode = mode;
  });

  function renderTimelineDragFrame() {
    state.timelineDragFrame = 0;
    updateAnimationTimelineUI();
    renderPerformance.noteInteraction(120);
    renderPerformance.invalidate?.("timeline-drag");
  }

  addLifecycleListener(window, "pointermove", (event) => {
    const drag = state.timelineDrag;
    if (!drag) return;
    const timeline = ensureTimeline(timelineTargetComponent());
    const clip = timeline?.clips?.find((item) => item.id === drag.clipId);
    if (!timeline || !clip) return;
    const deltaPixels = event.clientX - drag.startX;
    if (!drag.changed && Math.abs(deltaPixels) < 2) return;
    event.preventDefault();
    if (!drag.changed) {
      pushHistory(drag.before);
      drag.changed = true;
    }
    const deltaSeconds = timelineWorkspaceEngine?.secondsFromPixelDelta
      ? timelineWorkspaceEngine.secondsFromPixelDelta(deltaPixels, drag.pixelsPerSecond)
      : deltaPixels / drag.pixelsPerSecond;
    const scrollViewport = document.getElementById("timeline-scroll-viewport");
    if (scrollViewport) {
      const rectangle = scrollViewport.getBoundingClientRect();
      const edgeZone = 42;
      if (event.clientX > rectangle.right - edgeZone) scrollViewport.scrollLeft += 12;
      else if (event.clientX < rectangle.left + edgeZone) scrollViewport.scrollLeft -= 12;
    }
    clip.start = drag.originalStart;
    clip.duration = drag.originalDuration;
    if (drag.mode === "start") {
      const nextStart = drag.originalStart + deltaSeconds;
      if (timelineWorkspaceEngine?.resizeClip) {
        timelineWorkspaceEngine.resizeClip(timeline.clips, clip.id, "start", nextStart, { step: timelineSnapStep() });
      } else {
        const originalEnd = drag.originalStart + drag.originalDuration;
        clip.start = clamp(nextStart, 0, originalEnd - 0.05);
        clip.duration = originalEnd - clip.start;
      }
    } else if (drag.mode === "end") {
      const nextEnd = drag.originalStart + drag.originalDuration + deltaSeconds;
      if (timelineWorkspaceEngine?.rippleResizeClipEnd) {
        const ripple = timelineWorkspaceEngine.rippleResizeClipEnd(timeline.clips, clip.id, nextEnd, {
          step: timelineSnapStep(),
          baseline: drag.originalClips,
        });
        drag.rippleShiftedIds = ripple?.shiftedIds || [];
      } else if (timelineWorkspaceEngine?.resizeClip) {
        timelineWorkspaceEngine.resizeClip(timeline.clips, clip.id, "end", nextEnd, { step: timelineSnapStep() });
      } else clip.duration = Math.max(0.05, nextEnd - drag.originalStart);
    } else {
      const nextStart = drag.originalStart + deltaSeconds;
      if (timelineWorkspaceEngine?.moveClip) {
        timelineWorkspaceEngine.moveClip(timeline.clips, clip.id, nextStart, {
          step: timelineSnapStep(),
          snapToNeighbors: true,
          neighborTolerance: Math.max(timelineSnapStep() * 2.5, 8 / drag.pixelsPerSecond),
        });
      } else clip.start = Math.max(0, nextStart);
    }
    if (!state.timelineDragFrame) state.timelineDragFrame = window.requestAnimationFrame(renderTimelineDragFrame);
  }, { passive: false });

  function finishTimelineDrag() {
    const drag = state.timelineDrag;
    if (!drag) return;
    state.timelineDrag = null;
    document.body.classList.remove("timeline-dragging");
    delete document.body.dataset.timelineDragMode;
    try {
      if (drag.pointerId !== undefined && timelineTracks?.hasPointerCapture?.(drag.pointerId)) timelineTracks.releasePointerCapture(drag.pointerId);
    } catch {}
    if (state.timelineDragFrame) {
      window.cancelAnimationFrame(state.timelineDragFrame);
      state.timelineDragFrame = 0;
    }
    const timeline = ensureTimeline(timelineTargetComponent());
    const clip = timeline?.clips?.find((item) => item.id === drag.clipId);
    if (drag.changed && timeline && clip) {
      timeline.clips = orderedTimelineClips(timeline);
      commit(drag.mode === "move"
        ? `${clip.name} moved to ${clip.start.toFixed(2)} seconds.`
        : drag.mode === "end" && drag.rippleShiftedIds?.length
          ? `${clip.name} duration changed to ${clip.duration.toFixed(2)} seconds and pushed ${drag.rippleShiftedIds.length} later clip${drag.rippleShiftedIds.length === 1 ? "" : "s"} right.`
          : `${clip.name} duration changed to ${clip.duration.toFixed(2)} seconds.`);
    } else updateAnimationTimelineUI();
  }
  addLifecycleListener(window, "pointerup", finishTimelineDrag);
  addLifecycleListener(window, "pointercancel", finishTimelineDrag);

  document.getElementById("timeline-clip-editor")?.addEventListener("change", (event) => {
    const fieldInput = event.target.closest("[data-timeline-clip-field]");
    const checkInput = event.target.closest("[data-timeline-clip-check]");
    const clip = selectedTimelineClip();
    const target = timelineTargetComponent();
    const timeline = ensureTimeline(target);
    if (!clip || !target || !timeline || (!fieldInput && !checkInput)) return;
    pushHistory();
    if (checkInput) {
      clip[checkInput.dataset.timelineClipCheck] = checkInput.checked;
    } else {
      const field = fieldInput.dataset.timelineClipField;
      const numericFields = new Set(["start", "duration", "cycleSeconds", "cyclePause", "pauseAtPositive", "pauseAtNegative", "repeatCount", "phase", "amount", "secondaryAmount", "rotationPivotX", "rotationPivotY", "rotationPivotZ", "splitColumns", "splitColumnsMin", "splitColumnsMax", "splitRows", "splitLayers", "splitSeed", "splitRotation", "step1Pause", "step2Pause", "step3Pause", "step4Pause", "blinkMinOpacity", "blinkDutyCycle"]);
      clip[field] = numericFields.has(field) ? Number(fieldInput.value) : fieldInput.value;
      Object.assign(clip, timelineEngine.normalizeClip(clip));
    }
    timeline.clips = orderedTimelineClips(timeline);
    if (target !== selectedComponent()) target.playOwnAnimation = true;
    commit(`${clip.name} timeline clip updated.`);
  });

  document.getElementById("timeline-flip-rotation")?.addEventListener("click", () => {
    const target = timelineTargetComponent();
    const timeline = ensureTimeline(target);
    const clip = selectedTimelineClip();
    if (!target || !timeline || clip?.type !== "rotate") return;
    const currentAngle = Number(clip.amount) || 0;
    if (Math.abs(currentAngle) < 0.00001) {
      showToast("Set a non-zero rotation angle before flipping the animation.");
      return;
    }
    pushHistory();
    // Rotation direction is represented by the sign of the existing angle.
    // Flipping that sign preserves the stable v0.12.8 animation engine and
    // avoids introducing a second direction field into saved designs.
    clip.amount = -currentAngle;
    Object.assign(clip, timelineEngine.normalizeClip(clip));
    timeline.clips = orderedTimelineClips(timeline);
    commit(`${clip.name} flipped to ${clip.amount < 0 ? "reverse" : "forward"} rotation.`);
  });

  document.getElementById("timeline-duplicate-clip")?.addEventListener("click", () => {
    const target = timelineTargetComponent();
    const timeline = ensureTimeline(target);
    const clip = selectedTimelineClip();
    if (!timeline || !clip || !timelineEngine) return;
    pushHistory();
    const copy = timelineEngine.normalizeClip({
      ...clone(clip),
      id: uniqueId(clip.type),
      name: `${clip.name} copy`,
      start: clip.start + Math.max(0.1, clip.duration),
    });
    timeline.clips.push(copy);
    timeline.clips = orderedTimelineClips(timeline);
    if (target !== selectedComponent()) target.playOwnAnimation = true;
    state.timelineClipId = copy.id;
    commit(`${copy.name} added.`);
    focusTimelineClip(copy.id);
  });

  function deleteSelectedTimelineClip() {
    const target = timelineTargetComponent();
    const timeline = ensureTimeline(target);
    if (!target || !timeline || !timeline.clips.length) return false;
    const clipId = state.timelineClipId || timeline.clips[0]?.id;
    const clip = timeline.clips.find((item) => item.id === clipId);
    if (!clip) return false;
    pushHistory();
    const result = timelineWorkspaceEngine?.removeClip
      ? timelineWorkspaceEngine.removeClip(timeline.clips, clip.id)
      : (() => {
          const index = timeline.clips.findIndex((item) => item.id === clip.id);
          if (index < 0) return null;
          const [removed] = timeline.clips.splice(index, 1);
          timeline.clips = orderedTimelineClips(timeline);
          return {
            removed,
            nextClipId: timeline.clips[Math.min(index, Math.max(0, timeline.clips.length - 1))]?.id || null,
          };
        })();
    if (!result?.removed) return false;
    state.timelineClipId = result.nextClipId;
    if (target !== selectedComponent()) target.playOwnAnimation = true;
    commit(`${result.removed.name} removed from the timeline.`);
    return true;
  }

  document.getElementById("timeline-delete-clip")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    deleteSelectedTimelineClip();
  });

  document.getElementById("timeline-playhead")?.addEventListener("input", (event) => {
    const seconds = Math.max(0, Number(event.target.value) || 0);
    if (state.previewAnimations) state.animationPausedAt = performance.now();
    state.previewAnimations = false;
    state.timelineScrubSeconds = seconds;
    updateTimelinePlayhead();
    const topButton = document.getElementById("preview-design-animations");
    if (topButton) {
      topButton.classList.remove("active");
      topButton.textContent = "Resume animations";
    }
    document.getElementById("timeline-play")?.classList.remove("active");
    document.getElementById("timeline-pause")?.classList.add("active");
    renderPerformance.invalidate?.("timeline-scrub");
  });

  document.getElementById("timeline-play")?.addEventListener("click", () => {
    setAnimationPreview(true);
  });
  document.getElementById("timeline-pause")?.addEventListener("click", () => {
    setAnimationPreview(false);
  });
  document.getElementById("timeline-restart")?.addEventListener("click", () => {
    setAnimationPreview(true, true);
    showToast("Animation preview restarted from 0 seconds.");
  });

  function setView(view) {
    document.querySelectorAll("[data-design-view]").forEach((item) => item.classList.toggle("active", item.dataset.designView === view));
    if (view === "iso") { state.yaw = -0.72; state.pitch = 0.62; }
    else if (view === "low") { state.yaw = -0.72; state.pitch = 0.025; state.zoom = Math.max(state.zoom, 1.6); }
    else if (view === "front") { state.yaw = 0; state.pitch = 0.025; }
    else if (view === "side") { state.yaw = Math.PI / 2; state.pitch = 0.025; }
    else if (view === "top") { state.yaw = 0; state.pitch = 1.5; }
    else fitView();
  }
  document.querySelectorAll("[data-design-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.designView));
  });

  document.getElementById("snap-enabled")?.addEventListener("change", (event) => {
    state.snapEnabled = event.target.checked;
    updateSnapStepControls();
  });
  document.getElementById("snap-step")?.addEventListener("change", (event) => {
    state.snapStep = Math.max(0.01, Number(event.target.value) || 0.1);
    updateSnapStepControls();
  });
  document.querySelectorAll("[data-transform-space]").forEach((button) => {
    button.addEventListener("click", () => {
      state.transformSpace = button.dataset.transformSpace === "world" ? "world" : "local";
      document.querySelectorAll("[data-transform-space]").forEach((candidate) => {
        const active = candidate.dataset.transformSpace === state.transformSpace;
        candidate.classList.toggle("active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      showToast(state.transformSpace === "local" ? "Local transforms follow the selected part." : "World transforms follow the plant axes.");
    });
  });
  document.getElementById("preview-design-animations")?.addEventListener("click", () => {
    setAnimationPreview(!state.previewAnimations || Number.isFinite(state.timelineScrubSeconds));
    showToast(state.previewAnimations ? "Animation preview resumed from the paused frame." : "Animation preview paused in place.");
  });

  document.getElementById("design-search")?.addEventListener("input", updateDesignList);
  document.getElementById("component-search")?.addEventListener("input", updateComponentList);
  document.getElementById("select-all-components")?.addEventListener("click", selectAllComponents);
  document.getElementById("merge-components")?.addEventListener("click", mergeSelectedComponents);
  document.getElementById("ungroup-component")?.addEventListener("click", ungroupSelectedComponent);
  document.getElementById("new-design")?.addEventListener("click", createDesign);
  document.getElementById("duplicate-design")?.addEventListener("click", duplicateDesign);
  document.getElementById("save-design")?.addEventListener("click", saveCurrentDesign);
  document.getElementById("save-design-as")?.addEventListener("click", openSaveAsDialog);
  document.getElementById("save-and-place-design")?.addEventListener("click", () => {
    const machine = createPlantMachineFromCurrentDesign();
    if (!machine) return;
    setBrowserTab("plant");
    const assignment = document.getElementById("machine-assignment");
    if (assignment) assignment.value = machine.instanceId;
    updateAssignmentPanel();
  });
  document.getElementById("cancel-save-design-as")?.addEventListener("click", () => {
    document.getElementById("save-design-as-dialog")?.close();
  });
  document.querySelector("[data-close-save-as]")?.addEventListener("click", () => {
    document.getElementById("save-design-as-dialog")?.close();
  });
  document.getElementById("save-design-as-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("save-design-as-name")?.value;
    const type = document.getElementById("save-design-as-type")?.value;
    if (!String(name || "").trim()) return;
    if (saveDesignAs(name, type)) document.getElementById("save-design-as-dialog")?.close();
  });
  document.getElementById("reset-design")?.addEventListener("click", resetDesign);
  document.getElementById("delete-design")?.addEventListener("click", deleteDesign);
  document.getElementById("undo-design")?.addEventListener("click", undo);
  document.getElementById("redo-design")?.addEventListener("click", redo);
  document.getElementById("duplicate-component")?.addEventListener("click", duplicateSelectedComponent);
  document.getElementById("copy-component")?.addEventListener("click", () => copySelectedComponents());
  document.getElementById("paste-component")?.addEventListener("click", pasteComponents);
  document.getElementById("cut-component")?.addEventListener("click", cutSelectedComponents);
  document.getElementById("delete-component")?.addEventListener("click", deleteSelectedComponent);
  document.getElementById("move-component-up")?.addEventListener("click", () => moveComponentOrder(-1));
  document.getElementById("move-component-down")?.addEventListener("click", () => moveComponentOrder(1));

  const designFieldMap = {
    "design-name": ["name", "text"],
    "design-machine-type": ["machineType", "text"],
    "design-description": ["description", "text"],
    "design-base-x": ["x", "position"],
    "design-base-y": ["y", "position"],
    "design-base-z": ["z", "position"],
    "design-base-w": ["w", "base"],
    "design-base-d": ["d", "base"],
    "design-base-h": ["h", "base"],
  };
  Object.entries(designFieldMap).forEach(([id, [field, kind]]) => {
    document.getElementById(id)?.addEventListener("change", (event) => {
      const design = currentDesign();
      if (!design) return;
      pushHistory();
      if (kind === "base") design.base[field] = Math.max(MIN_DESIGN_ENVELOPE, snapToSelectedStep(Number(event.target.value) || design.base[field]));
      else if (kind === "position") {
        const previous = Number(design.base[field]) || 0;
        const value = Number(event.target.value);
        design.base[field] = Number.isFinite(value) ? snapToSelectedStep(value) : design.base[field];
        const delta = design.base[field] - previous;
        // Camera panning is relative to the envelope center on X/Z. Counter
        // that center shift so moving the envelope is visibly independent from
        // the camera instead of appearing fixed in the viewport.
        if (field === "x") state.panX -= delta;
        if (field === "z") state.panZ -= delta;
      }
      else design[field] = event.target.value.trim() || (field === "name" ? design.name : "");
      commit("", { syncName: field === "name" });
    });
  });

  function addComponentOfType(type) {
    const design = currentDesign();
    if (!design || !COMPONENT_TYPES.includes(type) || type === "group") return;
    pushHistory();
    const component = newComponent(type);
    design.components.push(component);
    state.selectAllParts = false;
    state.componentId = component.id;
    state.selectedComponentIds = new Set([component.id]);
    state.browserTab = "parts";
    state.inspectorTab = "object";
    setTool("move");
    commit(`${component.name} added.`);
  }

  document.querySelectorAll("[data-add-component]").forEach((button) => {
    button.addEventListener("click", () => addComponentOfType(button.dataset.addComponent));
  });
  document.getElementById("add-component-button")?.addEventListener("click", () => {
    addComponentOfType(document.getElementById("add-component-type")?.value || "box");
  });
  document.getElementById("add-machine-design")?.addEventListener("change", updateEmbeddedMachinePicker);
  document.getElementById("add-machine-design-button")?.addEventListener("click", () => {
    addMachineDesignToCurrentDesign(document.getElementById("add-machine-design")?.value || "");
  });

  document.querySelectorAll("[data-component-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const components = selectionComponents();
      const component = selectedComponent();
      if (!components.length) return;
      const field = input.dataset.componentField;
      const bulkSelection = state.selectAllParts || components.length > 1;
      if (bulkSelection) {
        if (!BULK_COMPONENT_FIELDS.has(field)) return;
        pushHistory();
        if (field === "color") {
          const color = validColor(input.value, components[0]?.color || "#68777a");
          components.forEach((item) => recolorComponentTree(item, color));
        } else if (["animationType", "animationAxis", "animationSecondaryAxis"].includes(field)) {
          components.forEach((item) => { item[field] = input.value; });
        } else {
          const number = Number(input.value);
          if (!Number.isFinite(number)) return;
          const value = ["opacity"].includes(field)
            ? clamp(number, 0.05, 1)
            : ["animationSpeed", "animationPauseSeconds", "animationSecondaryPauseSeconds", "animationStep1PauseSeconds", "animationStep2PauseSeconds", "animationStep3PauseSeconds", "animationStep4PauseSeconds"].includes(field)
              ? Math.max(0, number)
              : number;
          components.forEach((item) => { item[field] = value; });
        }
        commit(`Updated ${field} for ${components.length} selected parts.`);
        return;
      }
      if (!component) return;
      pushHistory();
      if (["name", "type", "color", "text", "textColor", "animationType", "animationAxis", "animationSecondaryAxis"].includes(field)) {
        if (field === "type") {
          const replacement = normalizeComponent({ ...component, type: input.value, id: component.id, name: component.name });
          const index = currentDesign().components.findIndex((item) => item.id === component.id);
          currentDesign().components[index] = replacement;
        } else if (field === "color" || field === "textColor") {
          component[field] = validColor(input.value, component[field] || (field === "textColor" ? "#ffffff" : component.color));
          if (field === "color" && component.type === "group") {
            const recolor = (item) => {
              item.color = component.color;
              if (item.type === "group") (item.children || []).forEach(recolor);
            };
            (component.children || []).forEach(recolor);
          }
        } else if (["animationType", "animationAxis", "animationSecondaryAxis"].includes(field)) component[field] = input.value;
        else if (field === "text") component.text = input.value.trim().slice(0, 120) || "LABEL";
        else component.name = input.value.trim() || component.name;
      } else {
        let number = Number(input.value);
        if (!Number.isFinite(number)) return;
        if (["x", "y", "z", "x2", "y2", "z2", "rotationX", "rotationY", "rotationZ", "w", "h", "d", "size", "thickness", "thicknessY", "thicknessZ", "length"].includes(field)) {
          number = snapToSelectedStep(number);
        }
        if (["w", "h", "d", "size", "thickness", "thicknessY", "thicknessZ"].includes(field)) {
          const previous = Math.max(.0001, Number(component[field]) || Number(component.thickness) || 1);
          component[field] = Math.max(field === "d" && component.type === "wheel" ? 0.05 : 0.02, number);
          const ratio = component[field] / previous;
          if (field === "w") component.scaleXPercent = (Number(component.scaleXPercent) || 100) * ratio;
          if (field === "h") component.scaleYPercent = (Number(component.scaleYPercent) || 100) * ratio;
          if (field === "d") component.scaleZPercent = (Number(component.scaleZPercent) || 100) * ratio;
          if (field === "thicknessY" || (field === "thickness" && component.type === "rollerBed")) component.scaleYPercent = (Number(component.scaleYPercent) || 100) * ratio;
          if (field === "thicknessZ") component.scaleZPercent = (Number(component.scaleZPercent) || 100) * ratio;
          if (component.type === "beam" && ["thicknessY", "thicknessZ"].includes(field)) component.thickness = Math.max(component.thicknessY, component.thicknessZ);
          if (component.type === "wheel" && ["w", "h"].includes(field)) component.size = Math.max(component.w, component.h);
        }
        else if (field === "count") component.count = Math.max(2, Math.round(number));
        else if (field === "segments") component.segments = Math.max(8, Math.min(48, Math.round(number)));
        else if (field === "length" && component.type === "beam") {
          const center = componentCenter(component);
          const previousLength = Math.max(.0001, pointDistance([component.x, component.y, component.z], [component.x2, component.y2, component.z2]));
          const direction = normalizedVector(vectorBetween([component.x, component.y, component.z], [component.x2, component.y2, component.z2]), [1,0,0]);
          const half = Math.max(.01, number) / 2;
          component.scaleXPercent = (Number(component.scaleXPercent) || 100) * (half * 2 / previousLength);
          component.x = center[0] - direction[0] * half;
          component.y = center[1] - direction[1] * half;
          component.z = center[2] - direction[2] * half;
          component.x2 = center[0] + direction[0] * half;
          component.y2 = center[1] + direction[1] * half;
          component.z2 = center[2] + direction[2] * half;
        }
        else if (["x2", "y2", "z2"].includes(field) && component.type === "beam") {
          const previousLength = Math.max(.0001, pointDistance([component.x, component.y, component.z], [component.x2, component.y2, component.z2]));
          component[field] = number;
          const nextLength = Math.max(.0001, pointDistance([component.x, component.y, component.z], [component.x2, component.y2, component.z2]));
          component.scaleXPercent = (Number(component.scaleXPercent) || 100) * nextLength / previousLength;
        }
        else if (field === "opacity") component.opacity = clamp(number, 0.05, 1);
        else if (["animationSpeed", "animationPauseSeconds", "animationSecondaryPauseSeconds", "animationStep1PauseSeconds", "animationStep2PauseSeconds", "animationStep3PauseSeconds", "animationStep4PauseSeconds"].includes(field)) component[field] = Math.max(0, number);
        else if (component.type === "group" && ["x", "y", "z"].includes(field)) {
          const center = componentCenter(component);
          const axisIndex = { x: 0, y: 1, z: 2 }[field];
          const delta = number - center[axisIndex];
          translateComponent(component, field === "x" ? delta : 0, field === "y" ? delta : 0, field === "z" ? delta : 0);
        }
        else if (["rotationX", "rotationY", "rotationZ"].includes(field)) {
          if (component.type === "group") {
            const axis = field.at(-1).toLowerCase();
            const current = Number(component[field]) || 0;
            const original = clone(component);
            rotateSelectionTogether([component], [original], componentCenter(original), number - current, axis);
          } else {
            component[field] = number;
            if (field === "rotationY") component.rotation = number;
          }
        } else component[field] = number;
      }
      commit();
    });
  });

  document.getElementById("fit-component-envelope")?.addEventListener("click", () => {
    const component = selectedComponent();
    if (!component || selectionComponents().length !== 1) return;
    const bounds = componentWorldBounds(component);
    pushHistory();
    component.collisionEnvelope = {
      x: bounds.minX,
      y: bounds.minY,
      z: bounds.minZ,
      w: Math.max(MIN_DESIGN_ENVELOPE, bounds.maxX - bounds.minX),
      h: Math.max(MIN_DESIGN_ENVELOPE, bounds.maxY - bounds.minY),
      d: Math.max(MIN_DESIGN_ENVELOPE, bounds.maxZ - bounds.minZ),
    };
    commit("Individual part envelope fitted.");
  });

  document.getElementById("remove-component-envelope")?.addEventListener("click", () => {
    const component = selectedComponent();
    if (!component?.collisionEnvelope || selectionComponents().length !== 1) return;
    pushHistory();
    component.collisionEnvelope = null;
    commit("Individual part envelope removed.");
  });

  document.querySelectorAll("[data-component-envelope-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const component = selectedComponent();
      const envelope = component?.collisionEnvelope;
      const value = Number(input.value);
      if (!envelope || selectionComponents().length !== 1 || !Number.isFinite(value)) return;
      pushHistory();
      const field = input.dataset.componentEnvelopeField;
      const snapped = snapToSelectedStep(value);
      envelope[field] = ["w", "h", "d"].includes(field)
        ? Math.max(MIN_DESIGN_ENVELOPE, snapped)
        : snapped;
      commit("Individual part envelope updated.");
    });
  });

  document.querySelectorAll("[data-component-scale]").forEach((input) => {
    input.addEventListener("change", () => {
      const components = selectionComponents();
      if (!components.length) return;
      const requested = snapToSelectedStep(Number(input.value));
      if (!Number.isFinite(requested)) return;
      const axis = input.dataset.componentScale;
      pushHistory();
      components.forEach((component) => {
        if (axis === "uniform") {
          for (const localAxis of ["x", "y", "z"]) {
            const current = Number(component[`scale${localAxis.toUpperCase()}Percent`]) || 100;
            scaleComponent(component, clamp(requested / Math.max(.01, current), .05, 20), localAxis, clone(component));
          }
        } else {
          const current = Number(component[`scale${axis.toUpperCase()}Percent`]) || 100;
          scaleComponent(component, clamp(requested / Math.max(.01, current), .05, 20), axis, clone(component));
        }
      });
      commit(`Scale updated for ${components.length} part${components.length === 1 ? "" : "s"}.`);
    });
  });

  document.querySelectorAll("[data-mirror-component]").forEach((button) => {
    button.addEventListener("click", () => mirrorSelection(button.dataset.mirrorComponent));
  });

  document.querySelectorAll("[data-component-check]").forEach((input) => {
    input.addEventListener("change", () => {
      const components = selectionComponents();
      const component = selectedComponent();
      if (!components.length) return;
      const field = input.dataset.componentCheck;
      const bulkSelection = state.selectAllParts || components.length > 1;
      if (bulkSelection) {
        if (!BULK_COMPONENT_CHECKS.has(field)) return;
        pushHistory();
        components.forEach((item) => { item[field] = input.checked; });
        input.indeterminate = false;
        commit(`Updated ${field} for ${components.length} selected parts.`);
        return;
      }
      if (!component) return;
      pushHistory();
      component[field] = input.checked;
      commit();
    });
  });

  document.getElementById("group-motion-driver")?.addEventListener("change", (event) => {
    const component = selectedComponent();
    if (component?.type !== "group") return;
    const child = (component.children || []).find((item) => item.id === event.target.value);
    if (!child) return;
    pushHistory();
    component.motionDriverId = child.id;
    child.playOwnAnimation = true;
    commit(`${child.name} now carries the merged assembly. Every other child keeps its separately controlled local animation.`);
  });

  document.getElementById("group-animation-child")?.addEventListener("change", (event) => {
    const component = selectedComponent();
    if (component?.type !== "group") return;
    component.activeAnimationChildId = event.target.value;
    updateComponentProperties();
  });

  document.querySelectorAll("[data-group-child-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const component = selectedComponent();
      if (component?.type !== "group") return;
      const child = (component.children || []).find((item) => item.id === component.activeAnimationChildId);
      if (!child) return;
      const field = input.dataset.groupChildField;
      pushHistory();
      if (["animationType", "animationAxis", "animationSecondaryAxis"].includes(field)) child[field] = input.value;
      else {
        const value = Number(input.value);
        if (!Number.isFinite(value)) return;
        child[field] = ["animationSpeed", "animationPauseSeconds", "animationSecondaryPauseSeconds", "animationStep1PauseSeconds", "animationStep2PauseSeconds", "animationStep3PauseSeconds", "animationStep4PauseSeconds"].includes(field) ? Math.max(0, value) : value;
      }
      commit(`${child.name} animation updated.`);
    });
  });

  document.querySelectorAll("[data-group-child-check]").forEach((input) => {
    input.addEventListener("change", () => {
      const component = selectedComponent();
      if (component?.type !== "group") return;
      const child = (component.children || []).find((item) => item.id === component.activeAnimationChildId);
      if (!child || child.id === component.motionDriverId) return;
      pushHistory();
      child[input.dataset.groupChildCheck] = input.checked;
      commit(input.checked
        ? `${child.name} now plays its own animation on top of the parent motion.`
        : `${child.name} now follows only the parent motion.`);
    });
  });

  document.getElementById("center-component")?.addEventListener("click", () => {
    const design = currentDesign();
    const component = selectedComponent();
    if (!design || !component) return;
    pushHistory();
    const center = componentCenter(component);
    const targetX = (Number(design.base.x) || 0) + design.base.w / 2;
    const targetZ = (Number(design.base.z) || 0) + design.base.d / 2;
    const bounds = componentWorldBounds(component);
    translateComponent(component, targetX - center[0], (Number(design.base.y) || 0) - bounds.minY, targetZ - center[2]);
    commit("Component centered.");
  });

  function activeRotationAxis() {
    return document.getElementById("rotation-axis")?.value || "y";
  }

  function rotateSelectedBy(degrees, axis = activeRotationAxis()) {
    const components = selectionComponents();
    if (!components.length) return;
    pushHistory();
    if (components.length > 1 || components[0].type === "group") {
      rotateSelectionTogether(components, components.map(clone), selectionCenter(components), degrees, axis);
    } else rotateComponent(components[0], degrees, axis, clone(components[0]));
    commit(`Rotated ${components.length > 1 ? `${components.length} selected parts` : axis.toUpperCase()} ${degrees > 0 ? "+" : ""}${degrees}\u00B0.`);
  }
  document.getElementById("rotate-negative")?.addEventListener("click", () => rotateSelectedBy(-90));
  document.getElementById("rotate-positive")?.addEventListener("click", () => rotateSelectedBy(90));
  document.getElementById("reset-rotation")?.addEventListener("click", () => {
    const components = selectionComponents();
    if (!components.length) return;
    pushHistory();
    components.forEach((component) => {
      component.rotationX = 0;
      component.rotationY = 0;
      component.rotationZ = 0;
      component.rotation = 0;
    });
    commit(components.length > 1 ? "Selected-part rotations reset." : "All-axis rotation reset.");
  });

  function componentWorldBounds(component) {
    const points = componentWorldPoints(component);
    return {
      minX: Math.min(...points.map((point) => point[0])),
      maxX: Math.max(...points.map((point) => point[0])),
      minY: Math.min(...points.map((point) => point[1])),
      maxY: Math.max(...points.map((point) => point[1])),
      minZ: Math.min(...points.map((point) => point[2])),
      maxZ: Math.max(...points.map((point) => point[2])),
    };
  }

  function baseEnvelopePiece(design, name = "Envelope box 1") {
    return {
      id: uniqueId("envelope"),
      name,
      x: Number(design?.base?.x) || 0,
      y: Number(design?.base?.y) || 0,
      z: Number(design?.base?.z) || 0,
      w: Math.max(MIN_DESIGN_ENVELOPE, Number(design?.base?.w) || 1),
      h: Math.max(MIN_DESIGN_ENVELOPE, Number(design?.base?.h) || 1),
      d: Math.max(MIN_DESIGN_ENVELOPE, Number(design?.base?.d) || 1),
    };
  }

  document.getElementById("design-envelope-piece")?.addEventListener("change", (event) => {
    state.designEnvelopeId = event.target.value || null;
    updateDesignEnvelopeShapeEditor();
    renderPerformance.invalidate?.("envelope-piece-selection");
  });

  document.getElementById("add-design-envelope-piece")?.addEventListener("click", () => {
    const design = currentDesign();
    if (!design) return;
    pushHistory();
    const pieces = designEnvelopePieces(design);
    const source = selectedDesignEnvelopePiece(design) || baseEnvelopePiece(design);
    const index = pieces.length + 1;
    const piece = {
      ...clone(source),
      id: uniqueId("envelope"),
      name: `Envelope box ${index}`,
    };
    if (pieces.length) piece.x += Math.max(state.snapStep, piece.w * .15);
    pieces.push(piece);
    state.designEnvelopeId = piece.id;
    commit(pieces.length === 1 ? "Editable machine envelope created." : "Envelope box added; move or resize it to shape the hitbox.");
  });

  document.getElementById("duplicate-design-envelope-piece")?.addEventListener("click", () => {
    const design = currentDesign();
    const source = selectedDesignEnvelopePiece(design);
    if (!design || !source) return;
    pushHistory();
    const pieces = designEnvelopePieces(design);
    const piece = {
      ...clone(source),
      id: uniqueId("envelope"),
      name: `Envelope box ${pieces.length + 1}`,
      x: Number(source.x) + Math.max(state.snapStep, Number(source.w) * .15),
    };
    pieces.push(piece);
    state.designEnvelopeId = piece.id;
    commit("Envelope box duplicated.");
  });

  document.getElementById("remove-design-envelope-piece")?.addEventListener("click", () => {
    const design = currentDesign();
    const selected = selectedDesignEnvelopePiece(design);
    if (!design || !selected) return;
    pushHistory();
    design.collisionEnvelopes = designEnvelopePieces(design).filter((piece) => piece.id !== selected.id);
    state.designEnvelopeId = design.collisionEnvelopes[0]?.id || null;
    commit(design.collisionEnvelopes.length ? "Envelope box removed." : "Custom shape removed; the automatic envelope is active.");
  });

  document.getElementById("reset-design-envelope-shape")?.addEventListener("click", () => {
    const design = currentDesign();
    if (!design) return;
    pushHistory();
    const piece = baseEnvelopePiece(design);
    design.collisionEnvelopes = [piece];
    state.designEnvelopeId = piece.id;
    commit("Machine hitbox reset to one editable base box.");
  });

  document.querySelectorAll("[data-design-envelope-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const piece = selectedDesignEnvelopePiece();
      const value = Number(input.value);
      if (!piece || !Number.isFinite(value)) return;
      pushHistory();
      const field = input.dataset.designEnvelopeField;
      const snapped = snapToSelectedStep(value);
      piece[field] = ["w", "h", "d"].includes(field)
        ? Math.max(MIN_DESIGN_ENVELOPE, snapped)
        : snapped;
      commit("Machine envelope shape updated.");
    });
  });

  document.getElementById("fit-envelope")?.addEventListener("click", () => {
    const design = currentDesign();
    if (!design || !design.components.length) return;
    const visibleOnly = document.getElementById("envelope-fit-scope")?.value === "visible";
    const bounds = designGeometryBounds(design, visibleOnly);
    if (!bounds) {
      showToast(visibleOnly ? "No visible parts are available to fit." : "Add at least one part before fitting the envelope.");
      return;
    }
    const clearanceInches = clamp(
      Number(document.getElementById("envelope-fit-clearance")?.value) || 0,
      0,
      MAX_ENVELOPE_CLEARANCE_INCHES,
    );
    const clearance = clearanceInches / 12;
    pushHistory();
    design.base.x = bounds.minX - clearance;
    design.base.y = bounds.minY - clearance;
    design.base.z = bounds.minZ - clearance;
    design.base.w = Math.max(MIN_DESIGN_ENVELOPE, bounds.maxX - bounds.minX + clearance * 2);
    design.base.h = Math.max(MIN_DESIGN_ENVELOPE, bounds.maxY - bounds.minY + clearance * 2);
    design.base.d = Math.max(MIN_DESIGN_ENVELOPE, bounds.maxZ - bounds.minZ + clearance * 2);
    commit(`Design envelope fitted tightly to ${visibleOnly ? "visible" : "all"} parts${clearanceInches ? ` with ${clearanceInches.toFixed(3)} in clearance` : ""}.`);
  });

  document.getElementById("show-design-envelope")?.addEventListener("change", (event) => {
    state.showDesignEnvelope = event.target.checked;
    renderPerformance.invalidate();
    updateEnvelopeStatus(currentDesign());
  });

  document.getElementById("create-plant-machine")?.addEventListener("click", createPlantMachineFromCurrentDesign);
  document.getElementById("open-created-plant-machine")?.addEventListener("click", (event) => {
    window.location.href = plantLayoutUrl(event.currentTarget.dataset.machineId || state.lastCreatedMachineId || "");
  });
  document.getElementById("machine-assignment")?.addEventListener("change", updateAssignmentPanel);
  document.querySelectorAll("[data-instance-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = document.getElementById("machine-assignment")?.value;
      const machine = plantLayout.machines.find((item) => item.instanceId === id);
      const value = Number(input.value);
      if (!machine || !Number.isFinite(value)) return;
      const field = input.dataset.instanceField;
      if (["w","d","h"].includes(field)) {
        machine.scaleEditMode = "individual";
        if (machine.designId) machine.designScaleMode = "stretch";
        resizePlantMachine(machine, field, value);
      }
      else machine[field] = value;
      saveLayout();
      updateAssignmentPanel();
      showToast(`${machine.name} ${field} updated in the plant layout.`);
    });
  });
  document.querySelectorAll("[data-instance-scale]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = document.getElementById("machine-assignment")?.value;
      const machine = plantLayout.machines.find((item) => item.instanceId === id);
      const value = Number(input.value);
      if (!machine || !Number.isFinite(value)) return;
      setPlantScalePercent(machine, input.dataset.instanceScale, value);
      saveLayout();
      updateAssignmentPanel();
      showToast(`${machine.name} scale updated in the plant layout.`);
    });
  });
  document.getElementById("assignment-scale-mode")?.addEventListener("change", (event) => {
    const id = document.getElementById("machine-assignment")?.value;
    const machine = plantLayout.machines.find((item) => item.instanceId === id);
    const design = currentDesign();
    if (!machine) return;
    machine.designScaleMode = normalizedDesignScaleMode(event.target.value);
    if (machine.designScaleMode === "match" && design) syncPlantObjectDimensions(machine, design, { preserveScale: false });
    saveLayout();
    updateAssignmentPanel();
    showToast(machine.designScaleMode === "match"
      ? "Plant dimensions now follow the design envelope."
      : machine.designScaleMode === "stretch"
        ? "The design will stretch independently to the plant object."
        : "The design will preserve its proportions.");
  });
  document.getElementById("sync-machine-dimensions")?.addEventListener("click", () => {
    const id = document.getElementById("machine-assignment")?.value;
    const machine = plantLayout.machines.find((item) => item.instanceId === id);
    const design = currentDesign();
    if (!machine || !design) { showToast("Choose a plant object and design first."); return; }
    machine.designId = design.id;
    machine.designScaleMode = "match";
    machine.useDesignName = true;
    syncPlantObjectName(machine, design);
    syncPlantObjectDimensions(machine, design, { preserveScale: false });
    state.linkedMachineId = machine.instanceId;
    saveLayout();
    updateAssignmentPanel();
    showToast(`${machine.name} now matches the design dimensions and will stay synchronized.`);
  });
  document.getElementById("apply-machine")?.addEventListener("click", () => {
    const id = document.getElementById("machine-assignment")?.value;
    const machine = plantLayout.machines.find((item) => item.instanceId === id);
    const design = currentDesign();
    if (!machine || !design) { showToast("Choose a plant object first."); return; }
    machine.designId = design.id;
    machine.designScaleMode = normalizedDesignScaleMode(document.getElementById("assignment-scale-mode")?.value);
    machine.useDesignName = true;
    syncPlantObjectName(machine, design);
    if (machine.designScaleMode === "match") syncPlantObjectDimensions(machine, design, { preserveScale: false });
    state.linkedMachineId = machine.instanceId;
    saveLayout();
    updateAssignmentPanel();
    showToast(`${design.name} applied to ${machine.name}.`);
  });
  document.getElementById("apply-type")?.addEventListener("click", () => {
    const id = document.getElementById("machine-assignment")?.value;
    const source = plantLayout.machines.find((item) => item.instanceId === id);
    const design = currentDesign();
    if (!source || !design) { showToast("Choose a plant object first."); return; }
    state.linkedMachineId = source.instanceId;
    let count = 0;
    const scaleMode = normalizedDesignScaleMode(document.getElementById("assignment-scale-mode")?.value);
    plantLayout.machines.forEach((machine) => {
      if (machine.type === source.type) {
        machine.designId = design.id;
        machine.designScaleMode = scaleMode;
        machine.useDesignName = true;
        syncPlantObjectName(machine, design);
        if (scaleMode === "match") syncPlantObjectDimensions(machine, design, { preserveScale: false });
        count += 1;
      }
    });
    saveLayout();
    updateAssignmentPanel();
    showToast(`${design.name} applied to ${count} ${source.type} object${count === 1 ? "" : "s"}.`);
  });
  document.getElementById("clear-machine-design")?.addEventListener("click", () => {
    const id = document.getElementById("machine-assignment")?.value;
    const machine = plantLayout.machines.find((item) => item.instanceId === id);
    if (!machine) { showToast("Choose a plant object first."); return; }
    machine.designId = "";
    machine.useDesignName = false;
    if (state.linkedMachineId === machine.instanceId) state.linkedMachineId = null;
    saveLayout();
    updateAssignmentPanel();
    showToast(`${machine.name} returned to its built-in model.`);
  });

  document.getElementById("export-design")?.addEventListener("click", () => {
    const design = currentDesign();
    if (!design) return;
    const blob = new Blob([JSON.stringify({ version: 17, exportedAt: new Date().toISOString(), design }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${design.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "machine-design"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Machine design exported.");
  });
  document.getElementById("export-design-3mf")?.addEventListener("click", () => {
    const design = currentDesign();
    if (!design) return;
    if (!window.PlantThreeMf) { showToast("3MF export is unavailable. Reload the page and try again."); return; }
    try {
      const scaleDenominator = Number(document.getElementById("design-3mf-scale")?.value) || 12;
      const blob = window.PlantThreeMf.createDesign({ design, scaleDenominator, name: design.name });
      window.PlantThreeMf.download(blob, `${window.PlantThreeMf.safeName(design.name, "machine-design")}-1-to-${scaleDenominator}.3mf`);
      showToast(`${design.name} exported as a color 3MF at 1:${scaleDenominator}.`);
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "The 3MF could not be created.");
    }
  });

  const importFile = document.getElementById("import-design-file");
  document.getElementById("import-design")?.addEventListener("click", () => importFile?.click());
  importFile?.addEventListener("change", async () => {
    try {
      const payload = JSON.parse(await importFile.files?.[0]?.text());
      const source = payload?.design || payload;
      if (!source || !Array.isArray(source.components)) throw new Error("The selected file does not contain a machine design.");
      let id = source.id || uniqueId("imported-design");
      if (library[id]) id = uniqueId(id);
      library[id] = normalizeDesign({ ...source, id, name: source.name || "Imported machine design", custom: true }, id);
      saveLibrary();
      selectDesign(id);
      showToast("Machine design imported.");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "The machine design could not be imported.");
    } finally {
      importFile.value = "";
    }
  });

  function nudgeSelected(dx, dy, dz) {
    const components = selectionComponents();
    if (!components.length) return;
    pushHistory();
    components.forEach((component) => translateComponent(component, dx, dy, dz));
    commit(components.length > 1 ? `${components.length} parts nudged together.` : undefined);
  }

  addLifecycleListener(window, "keydown", (event) => {
    const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (event.shiftKey) openSaveAsDialog();
      else saveCurrentDesign();
      return;
    }
    if (modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (modifier && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
    if (!typing && modifier && event.key.toLowerCase() === "a") { event.preventDefault(); selectAllComponents(); return; }
    if (!typing && modifier && event.key.toLowerCase() === "c") { event.preventDefault(); copySelectedComponents(); return; }
    if (!typing && modifier && event.key.toLowerCase() === "v") { event.preventDefault(); pasteComponents(); return; }
    if (!typing && modifier && event.key.toLowerCase() === "x") { event.preventDefault(); cutSelectedComponents(); return; }
    if (!typing && modifier && event.key.toLowerCase() === "d") { event.preventDefault(); duplicateSelectedComponent(); return; }
    if (typing) return;

    const key = event.key.toLowerCase();
    if (key === "v") setTool("select");
    else if (key === "m") setTool("move");
    else if (key === "r") setTool("rotate");
    else if (key === "s") setTool("scale");
    else if (key === "h") setTool("pan");
    else if (key === "a") setTimelineOpen(!state.timelineOpen, { focusInspector: true });
    else if (key === "f") fitView();
    else if (key === "0") setView("iso");
    else if (key === "1") setView("front");
    else if (key === "2") setView("side");
    else if (key === "3") setView("top");
    else if (key === "4") setView("low");
    else if ((event.key === "Delete" || event.key === "Backspace") && state.timelineOpen && state.partTab === "animation" && selectedTimelineClip()) {
      event.preventDefault();
      deleteSelectedTimelineClip();
    }
    else if (event.key === "Delete" || event.key === "Backspace") deleteSelectedComponent();
    else if (event.key === "Escape" && state.timelineOpen) setTimelineOpen(false);
    else if (event.key === "Escape") setTool("select");
    else if (event.key === "ArrowLeft") { event.preventDefault(); nudgeSelected(-state.snapStep, 0, 0); }
    else if (event.key === "ArrowRight") { event.preventDefault(); nudgeSelected(state.snapStep, 0, 0); }
    else if (event.key === "ArrowUp") { event.preventDefault(); nudgeSelected(0, event.shiftKey ? state.snapStep : 0, event.shiftKey ? 0 : -state.snapStep); }
    else if (event.key === "ArrowDown") { event.preventDefault(); nudgeSelected(0, event.shiftKey ? -state.snapStep : 0, event.shiftKey ? 0 : state.snapStep); }
    else if (event.key === ".") focusSelected();
  });

  const viewportPanel = canvas.closest(".design-viewport-panel");
  if (viewportPanel) {
    const viewportSettings = viewportPanel.querySelector(".viewport-settings");
    renderPerformance.mount(viewportPanel, {
      buttonHost: viewportSettings || viewportPanel,
    });
    const performanceButton = viewportPanel.querySelector(".render-performance-button");
    if (viewportSettings && performanceButton && !performanceButton.closest(".viewport-performance-group")) {
      const performanceGroup = document.createElement("div");
      performanceGroup.className = "viewport-control-group viewport-performance-group";
      const performanceLabel = document.createElement("span");
      performanceLabel.className = "viewport-control-label";
      performanceLabel.textContent = "Rendering";
      performanceGroup.append(performanceLabel, performanceButton);
      viewportSettings.appendChild(performanceGroup);
    }
  }
  addLifecycleListener(window, "renderperformancechange", () => {
    updateCanvasSize();
    renderPerformance.invalidate();
  });

  if (!state.designId) createDesign();
  else {
    state.selectAllParts = false;
    state.componentId = currentDesign()?.components[0]?.id || null;
    state.selectedComponentIds = new Set(state.componentId ? [state.componentId] : []);
    fitView();
    updateInterface();
  }
  function reloadPlantLayout() {
    const latest = loadLayout();
    if (!latest?.machines) return;
    plantLayout = latest;
    updateAssignmentPanel();
  }
  addLifecycleListener(window, "storage", (event) => {
    if (event.key === LAYOUT_KEY || event.key === LEGACY_LAYOUT_KEY) reloadPlantLayout();
  });
  syncChannel?.addEventListener("message", (event) => {
    if (event.data?.source !== "machine-design-studio" && event.data?.type === "layout-updated") reloadPlantLayout();
  });
  addLifecycleListener(window, "focus", reloadPlantLayout);
  addLifecycleListener(document, "visibilitychange", () => { if (!document.hidden) reloadPlantLayout(); });
  function teardownMachineDesigner(event) {
    if (event?.detail?.source && event.detail.source !== "/machine-design-studio.js") return;
    if (!applicationActive) return;
    applicationActive = false;
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    if (geometryPreparedFrame) window.cancelAnimationFrame(geometryPreparedFrame);
    if (deferredDesignSwitchRefresh) window.cancelAnimationFrame(deferredDesignSwitchRefresh);
    if (deferredDesignSwitchTimer) window.clearTimeout(deferredDesignSwitchTimer);
    if (deferredLibrarySave) writeLibraryNow();
    renderPerformance.dispose?.();
    depthRenderer.dispose?.();
    sceneCanvas?.remove();
    syncChannel?.close();
    removeLifecycleListeners();
    if (window[VIEWPORT_RUNTIME_KEY]?.token === viewportRuntimeToken) {
      delete window[VIEWPORT_RUNTIME_KEY];
    }
  }
  window[VIEWPORT_RUNTIME_KEY] = {
    token: viewportRuntimeToken,
    source: "/machine-design-studio.js",
    dispose: teardownMachineDesigner,
  };
  document.querySelectorAll(".studio-layout-link, .studio-back-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      // Release the Designer's frame loop and WebGL context before the plant
      // starts allocating its much larger retained scene.
      event.preventDefault();
      const target = link.href;
      teardownMachineDesigner();
      window.setTimeout(() => window.location.assign(target), 120);
    });
  });
  addLifecycleListener(window, "plantlegacyteardown", teardownMachineDesigner);
  addLifecycleListener(window, "pagehide", (event) => {
    if (!event.persisted) teardownMachineDesigner();
  });
  setTool("select");
  updateSnapStepControls();
  window.plantGeometryPrep?.prepareDesign(currentDesign());
  animationFrameId = requestAnimationFrame(draw);
})();
