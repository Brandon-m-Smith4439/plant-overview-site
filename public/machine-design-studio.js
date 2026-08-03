(() => {
  "use strict";

  const canvas = document.getElementById("machine-design-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const sceneCanvas = window.createDepthCanvas?.(canvas, "depth-scene-canvas machine-depth-canvas") || null;
  const depthRenderer = sceneCanvas && window.createDepthSceneRenderer
    ? window.createDepthSceneRenderer(sceneCanvas)
    : { available: false, beginFrame() {}, addPolygon() {}, addLine() {}, render() {} };
  const DESIGN_KEY = window.PLANT_MACHINE_DESIGN_STORAGE_KEY || "monroe-glass-machine-designs-v1";
  const LAYOUT_KEY = "monroe-glass-plant-layout-v6";
  const LEGACY_LAYOUT_KEY = "monroe-glass-plant-layout-v5";
  const SYNC_CHANNEL_NAME = "monroe-glass-plant-sync-v1";
  const syncChannel = typeof window.BroadcastChannel === "function"
    ? new window.BroadcastChannel(SYNC_CHANNEL_NAME)
    : null;
  const defaults = clone(window.PLANT_MACHINE_DESIGNS || {});
  const builtinIds = new Set(Object.keys(defaults));
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
    "glassPanel", "beam", "rollerBed", "wheel", "group",
  ];

  function clone(value) {
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
      animationEnabled: component?.animationEnabled !== false,
      animationType: ["none", "oscillate", "loop", "spin", "bob", "pulse", "blink"].includes(component?.animationType)
        ? component.animationType
        : "none",
      animationAxis: ["x", "y", "z", "all"].includes(component?.animationAxis) ? component.animationAxis : "x",
      animationAmount: Number.isFinite(Number(component?.animationAmount)) ? Number(component.animationAmount) : 10,
      animationSpeed: Math.max(0, Number.isFinite(Number(component?.animationSpeed)) ? Number(component.animationSpeed) : 0.1),
      animationPauseSeconds: Math.max(0, Number.isFinite(Number(component?.animationPauseSeconds)) ? Number(component.animationPauseSeconds) : 0),
      animationPhase: Number.isFinite(Number(component?.animationPhase)) ? Number(component.animationPhase) : 0,
    };
    // Keep the legacy Y-rotation field so existing plant layouts and older
    // exported designs continue to load without losing orientation.
    normalized.rotation = normalized.rotationY;

    if (["box", "glassPanel", "cylinder", "sphere", "cone", "wedge"].includes(type)) {
      normalized.w = Math.max(0.02, Number(component?.w) || 4);
      normalized.h = Math.max(0.02, Number(component?.h) || 4);
      normalized.d = Math.max(0.02, Number(component?.d) || (type === "glassPanel" ? 0.25 : 4));
      if (["cylinder", "sphere", "cone"].includes(type)) {
        normalized.segments = Math.max(8, Math.min(48, Math.round(Number(component?.segments) || 20)));
      }
    } else if (type === "beam") {
      normalized.x2 = Number.isFinite(Number(component?.x2)) ? Number(component.x2) : normalized.x + 5;
      normalized.y2 = Number.isFinite(Number(component?.y2)) ? Number(component.y2) : normalized.y;
      normalized.z2 = Number.isFinite(Number(component?.z2)) ? Number(component.z2) : normalized.z;
      normalized.thickness = Math.max(0.2, Number(component?.thickness) || 2);
      normalized.thicknessY = Math.max(0.2, Number(component?.thicknessY) || normalized.thickness);
      normalized.thicknessZ = Math.max(0.2, Number(component?.thicknessZ) || normalized.thickness);
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
      normalized.children = (Array.isArray(component?.children) ? component.children : []).map(normalizeComponent);
      normalized.color = validColor(component?.color, normalized.children[0]?.color || "#68777a");
      const requestedDriver = typeof component?.motionDriverId === "string" ? component.motionDriverId : "";
      const automaticDriver = normalized.children.find((child) => child.animationEnabled !== false && child.animationType && child.animationType !== "none")
        || normalized.children[0];
      normalized.motionDriverId = normalized.children.some((child) => child.id === requestedDriver)
        ? requestedDriver
        : (automaticDriver?.id || "");
    }
    return normalized;
  }

  function normalizeDesign(design, fallbackId = uniqueId("design")) {
    const base = design?.base || {};
    return {
      id: design?.id || fallbackId,
      name: design?.name || "Untitled machine design",
      machineType: design?.machineType || "generic",
      description: design?.description || "",
      base: {
        w: Math.max(0.5, Number(base.w) || 20),
        d: Math.max(0.5, Number(base.d) || 10),
        h: Math.max(0.5, Number(base.h) || 8),
      },
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
    } catch (error) {
      console.warn("Saved machine designs could not be loaded.", error);
    }
    const result = {};
    Object.entries({ ...defaults, ...saved }).forEach(([id, design]) => {
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
    machine.designId = stableId;
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
    panZ: 0,
    tool: "select",
    snapEnabled: true,
    snapStep: 0.5,
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
    previewAnimations: true,
    lastFrameTime: 0,
    linkedMachineId: queryMachine?.instanceId || null,
  };

  function currentDesign() {
    return library[state.designId] || null;
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
    state.selectAllParts = true;
    state.selectedComponentIds = new Set(design.components.map((component) => component.id));
    state.componentId = null;
    state.browserTab = "parts";
    state.inspectorTab = "object";
    updateInterface();
    showToast(`Selected all ${design.components.length} machine parts.`);
  }

  function saveLibrary() {
    const saveState = document.getElementById("save-state");
    if (saveState) saveState.textContent = "Saving…";
    const designs = {};
    Object.entries(library).forEach(([id, design]) => {
      designs[id] = { ...clone(design), updatedAt: new Date().toISOString() };
    });
    localStorage.setItem(DESIGN_KEY, JSON.stringify({ version: 6, updatedAt: new Date().toISOString(), designs }));
    broadcastProjectUpdate("design-library-updated", { designId: state?.designId || null });
    if (saveState) window.setTimeout(() => { saveState.textContent = "Auto-saved"; }, 180);
  }

  function saveLayout() {
    plantLayout.version = 6;
    plantLayout.appVersion = "0.10.1";
    delete plantLayout.sourceKey;
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(plantLayout));
    broadcastProjectUpdate("layout-updated", { machineId: state?.linkedMachineId || null });
  }

  function syncLinkedMachineToCurrentDesign() {
    if (!state.linkedMachineId || !state.designId) return;
    const machine = plantLayout.machines.find((item) => item.instanceId === state.linkedMachineId);
    if (!machine) return;
    if (machine.designId !== state.designId) {
      machine.designId = state.designId;
      saveLayout();
    }
  }

  if (queryMachine && state.designId) {
    queryMachine.designId = state.designId;
    saveLibrary();
    saveLayout();
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
    library[item.designId] = normalizeDesign(item.design, item.designId);
    state.designId = item.designId;
    state.componentId = item.componentId;
    state.selectedComponentIds = new Set(item.selectedComponentIds || (item.componentId ? [item.componentId] : []));
    state.selectAllParts = item.selectAllParts === true;
    saveLibrary();
    syncLinkedMachineToCurrentDesign();
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

  function commit(message = "") {
    const design = currentDesign();
    if (!design) return;
    design.updatedAt = new Date().toISOString();
    saveLibrary();
    syncLinkedMachineToCurrentDesign();
    updateInterface();
    if (message) showToast(message);
  }

  function snapValue(value) {
    if (!state.snapEnabled) return value;
    const step = Math.max(0.01, state.snapStep);
    return Math.round(value / step) * step;
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
        rollerBed: "New roller bed",
        wheel: "New wheel",
      }[type] || "New component",
      type,
      x: base.w * 0.25,
      y: 0,
      z: base.d * 0.25,
      color: type === "glassPanel" ? "#8fc6d4" : type === "wheel" ? "#20272a" : "#68777a",
      opacity: type === "glassPanel" ? 0.55 : 1,
      visible: true,
      rotation: 0,
      animationEnabled: true,
      animationType: "none",
      animationAxis: "x",
      animationAmount: 10,
      animationSpeed: 0.1,
      animationPauseSeconds: 0,
      animationPhase: 0,
    };
    if (["box", "glassPanel", "cylinder", "sphere", "cone", "wedge"].includes(type)) {
      Object.assign(common, {
        w: base.w * (type === "sphere" ? 0.3 : 0.5),
        h: base.h * (type === "glassPanel" ? 0.65 : 0.5),
        d: type === "glassPanel" ? 0.25 : base.d * (type === "sphere" ? 0.3 : 0.5),
      });
      if (["cylinder", "sphere", "cone"].includes(type)) common.segments = 20;
    } else if (type === "beam") {
      Object.assign(common, { x2: base.w * 0.75, y2: 0, z2: base.d * 0.25, thickness: 2, thicknessY: 2, thicknessZ: 2 });
    } else if (type === "rollerBed") {
      Object.assign(common, { w: base.w * 0.5, d: base.d * 0.5, count: 8, thickness: 1.5 });
    } else if (type === "wheel") {
      Object.assign(common, { w: 1.2, h: 1.2, d: 0.75, size: 1.2 });
    }
    return normalizeComponent(common);
  }

  function selectDesign(id) {
    if (!library[id]) return;
    state.designId = id;
    state.componentId = library[id].components[0]?.id || null;
    state.selectedComponentIds = new Set(state.componentId ? [state.componentId] : []);
    state.selectAllParts = false;
    state.history.length = 0;
    state.future.length = 0;
    syncLinkedMachineToCurrentDesign();
    fitView();
    updateInterface();
  }

  function selectComponent(id, openParts = false, additive = false) {
    const design = currentDesign();
    if (id && !design?.components.some((component) => component.id === id)) return;
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
    if (openParts) state.browserTab = "parts";
    updateInterface();
  }

  function createDesign() {
    const id = uniqueId("custom-design");
    library[id] = normalizeDesign({
      id,
      name: "New custom machine",
      machineType: "generic",
      description: "Component-based custom machine design.",
      base: { w: 20, d: 10, h: 8 },
      custom: true,
      components: [
        { id: uniqueId("box"), name: "Main cabinet", type: "box", x: 0, y: 0, z: 0, w: 20, h: 6, d: 10, color: "#277d78", opacity: 1, rotation: 0, visible: true },
      ],
    }, id);
    saveLibrary();
    selectDesign(id);
    showToast("New machine design created.");
  }

  function duplicateDesign() {
    const design = currentDesign();
    if (!design) return;
    const id = uniqueId("custom-design");
    library[id] = normalizeDesign({
      ...clone(design),
      id,
      name: `${design.name} copy`,
      custom: true,
      components: design.components.map((component) => ({ ...clone(component), id: uniqueId(component.type) })),
    }, id);
    saveLibrary();
    selectDesign(id);
    showToast("Design duplicated.");
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
    commit("Preset restored.");
  }

  function deleteDesign() {
    const id = state.designId;
    if (!id) return;
    if (builtinIds.has(id)) {
      showToast("Built-in presets cannot be deleted.");
      return;
    }
    if (!window.confirm(`Delete ${library[id].name}? Machines using it will return to their built-in model.`)) return;
    plantLayout.machines.forEach((machine) => {
      if (machine.designId === id) machine.designId = "";
    });
    saveLayout();
    delete library[id];
    saveLibrary();
    selectDesign(Object.keys(library)[0] || "");
    showToast("Custom design deleted.");
  }

  function duplicateSelectedComponent() {
    const design = currentDesign();
    const components = selectionComponents();
    if (!design || !components.length) return;
    pushHistory();
    const copies = components.map((component) => {
      const copy = normalizeComponent({
        ...clone(component),
        id: uniqueId(component.type),
        name: `${component.name} copy`,
        x: component.type === "group" ? component.x : Number(component.x) + state.snapStep,
        z: component.type === "group" ? component.z : Number(component.z) + state.snapStep,
        x2: component.type === "beam" ? Number(component.x2) + state.snapStep : component.x2,
        z2: component.type === "beam" ? Number(component.z2) + state.snapStep : component.z2,
      });
      if (copy.type === "group") translateComponent(copy, state.snapStep, 0, state.snapStep);
      return copy;
    });
    design.components.push(...copies);
    state.selectAllParts = false;
    state.selectedComponentIds = new Set(copies.map((component) => component.id));
    state.componentId = copies.at(-1)?.id || null;
    state.browserTab = "parts";
    commit(`${copies.length} component${copies.length === 1 ? "" : "s"} duplicated.`);
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
      animationAmount: 10,
      animationSpeed: 0.1,
      animationPauseSeconds: 0,
      animationPhase: 0,
      motionDriverId: components.some((component) => component.id === state.componentId)
        ? state.componentId
        : (components.find((component) => component.animationEnabled !== false && component.animationType !== "none")?.id || components[0]?.id || ""),
      children: components.map(clone),
    });
    design.components = design.components.filter((component) => !selectedIds.has(component.id));
    design.components.splice(Math.max(0, insertionIndex), 0, group);
    state.selectAllParts = false;
    state.componentId = group.id;
    state.selectedComponentIds = new Set([group.id]);
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
    if (label) label.innerHTML = `<strong>${escapeHtml(title)}</strong> · ${escapeHtml(help)}`;
  }

  function setBrowserTab(tab) {
    state.browserTab = tab;
    document.querySelectorAll("[data-browser-tab]").forEach((button) => {
      const active = button.dataset.browserTab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-browser-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.browserPanel !== tab;
    });
  }

  function setInspectorTab(tab) {
    state.inspectorTab = tab;
    document.querySelectorAll("[data-inspector-tab]").forEach((button) => {
      const active = button.dataset.inspectorTab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-inspector-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.inspectorPanel !== tab;
    });
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
      <button type="button" data-design-id="${escapeHtml(design.id)}" class="${design.id === state.designId ? "active" : ""}">
        <span>${escapeHtml(design.name)}</span>
        <small>${escapeHtml(design.machineType)} · ${design.components.length} parts${builtinIds.has(design.id) ? " · preset" : " · custom"}</small>
      </button>
    `).join("") || `<p class="studio-empty">No designs match this search.</p>`;
    list.querySelectorAll("[data-design-id]").forEach((button) => {
      button.addEventListener("click", () => selectDesign(button.dataset.designId));
    });
  }

  function updateDesignFields() {
    const design = currentDesign();
    const map = {
      "design-name": design?.name || "",
      "design-machine-type": design?.machineType || "",
      "design-description": design?.description || "",
      "design-base-w": design?.base.w || "",
      "design-base-d": design?.base.d || "",
      "design-base-h": design?.base.h || "",
    };
    Object.entries(map).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (input && document.activeElement !== input) input.value = String(value);
    });
    const deleteButton = document.getElementById("delete-design");
    if (deleteButton) deleteButton.disabled = !design || builtinIds.has(design.id);
    const resetButton = document.getElementById("reset-design");
    if (resetButton) resetButton.disabled = !design || !defaults[design.id];
  }

  function updateComponentList() {
    const list = document.getElementById("component-list");
    const count = document.getElementById("component-count");
    const design = currentDesign();
    const query = document.getElementById("component-search")?.value.trim().toLowerCase() || "";
    const components = (design?.components || []).filter((component) => !query || `${component.name} ${component.type}`.toLowerCase().includes(query));
    if (count) count.textContent = `${design?.components.length || 0} part${design?.components.length === 1 ? "" : "s"}`;
    if (!list) return;
    list.innerHTML = components.map((component, index) => `
      <div class="component-tree-row ${state.selectAllParts || state.selectedComponentIds.has(component.id) ? "active" : ""}" data-component-row="${escapeHtml(component.id)}">
        <button type="button" class="component-visibility" data-toggle-component="${escapeHtml(component.id)}" title="${component.visible === false ? "Show" : "Hide"} component" aria-label="${component.visible === false ? "Show" : "Hide"} ${escapeHtml(component.name)}">${component.visible === false ? "○" : "●"}</button>
        <button type="button" class="component-select" data-component-id="${escapeHtml(component.id)}">
          <i style="background:${escapeHtml(component.color)}"></i><span><strong>${escapeHtml(component.name)}</strong><small>${index + 1} · ${escapeHtml(component.type)}${component.animationType && component.animationType !== "none" ? ` · animated` : ""}</small></span>
        </button>
      </div>
    `).join("") || `<p class="studio-empty">No parts match this search.</p>`;
    list.querySelectorAll("[data-component-id]").forEach((button) => {
      button.addEventListener("click", (event) => selectComponent(
        button.dataset.componentId,
        false,
        event.shiftKey || event.ctrlKey || event.metaKey,
      ));
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

  function updateComponentProperties() {
    const section = document.getElementById("component-properties");
    const empty = document.getElementById("empty-component-state");
    const component = selectedComponent();
    const selectedCount = selectionComponents().length;
    const wholeDesign = state.selectAllParts;
    const multiSelection = !wholeDesign && selectedCount > 1;
    const typeLabel = document.getElementById("selected-component-type");
    if (section) section.hidden = !component;
    if (empty) {
      empty.hidden = Boolean(component);
      const title = empty.querySelector("strong");
      const help = empty.querySelector("p");
      if (wholeDesign) {
        if (title) title.textContent = "Entire machine selected.";
        if (help) help.textContent = "Use Move, Rotate, or Scale to transform every part together around the machine center. Click any individual part to return to single-part editing.";
      } else if (multiSelection) {
        if (title) title.textContent = `${selectedCount} parts selected.`;
        if (help) help.textContent = "Transform these parts together or use Merge selected to turn them into one reusable item.";
      } else {
        if (title) title.textContent = "Select a part in the viewport or Parts list.";
        if (help) help.textContent = "Use Move, Rotate, or Scale after selecting a component. Transform controls always stay above the model. Colored handles match the X, Y, and Z axes.";
      }
    }
    if (typeLabel) typeLabel.textContent = wholeDesign
      ? `All ${currentDesign()?.components.length || 0} parts`
      : multiSelection ? `${selectedCount} selected parts` : (component ? component.type : "Nothing selected");

    document.getElementById("select-all-components")?.classList.toggle("active", wholeDesign);
    document.getElementById("duplicate-component")?.toggleAttribute("disabled", selectedCount === 0);
    document.getElementById("delete-component")?.toggleAttribute("disabled", selectedCount === 0);
    document.getElementById("merge-components")?.toggleAttribute("disabled", selectedCount < 2);
    document.getElementById("ungroup-component")?.toggleAttribute("disabled", component?.type !== "group");
    document.getElementById("move-component-up")?.toggleAttribute("disabled", !component);
    document.getElementById("move-component-down")?.toggleAttribute("disabled", !component);
    if (!component || !section) return;

    section.querySelectorAll("[data-component-field]").forEach((input) => {
      const field = input.dataset.componentField;
      if (document.activeElement === input) return;
      if (component.type === "group" && ["x", "y", "z"].includes(field)) {
        const center = componentCenter(component);
        input.value = center[{ x: 0, y: 1, z: 2 }[field]] ?? 0;
      } else if (component.type === "beam" && field === "length") {
        input.value = pointDistance([component.x, component.y, component.z], [component.x2, component.y2, component.z2]).toFixed(2);
      } else input.value = component[field] ?? "";
    });
    section.querySelectorAll("[data-component-check]").forEach((input) => {
      input.checked = component[input.dataset.componentCheck] !== false;
    });
    section.querySelectorAll("[data-for-component]").forEach((element) => {
      const supported = element.dataset.forComponent.split(/\s+/);
      element.hidden = !supported.includes(component.type);
    });
    const motionDriver = document.getElementById("group-motion-driver");
    if (motionDriver) {
      const children = component.type === "group" ? (component.children || []) : [];
      motionDriver.innerHTML = children.map((child) => (
        `<option value="${escapeHtml(child.id)}">${escapeHtml(child.name)}${child.animationType && child.animationType !== "none" ? ` · ${escapeHtml(child.animationType)}` : ""}</option>`
      )).join("");
      motionDriver.value = children.some((child) => child.id === component.motionDriverId)
        ? component.motionDriverId
        : (children[0]?.id || "");
      motionDriver.disabled = component.type !== "group" || children.length === 0;
    }
  }

  function updateAssignmentPanel() {
    const select = document.getElementById("machine-assignment");
    if (!select) return;
    const currentValue = select.value || queryMachineId || "";
    const machines = [...plantLayout.machines].sort((first, second) => String(first.name).localeCompare(String(second.name)));
    select.innerHTML = `<option value="">Choose a machine…</option>${machines.map((machine) => (
      `<option value="${escapeHtml(machine.instanceId)}">${escapeHtml(machine.name || machine.type)} · ${escapeHtml(machine.type || "object")}${machine.designId ? " · custom design" : ""}</option>`
    )).join("")}`;
    select.value = machines.some((machine) => machine.instanceId === currentValue) ? currentValue : "";
    const status = document.getElementById("assignment-status");
    const machine = machines.find((item) => item.instanceId === select.value);
    if (status) {
      status.textContent = machine
        ? (machine.instanceId === state.linkedMachineId
          ? `${machine.name} is live-linked to ${machine.designId && library[machine.designId] ? library[machine.designId].name : "the current design"}. Every saved change updates the plant model automatically.`
          : `${machine.name} currently uses ${machine.designId && library[machine.designId] ? library[machine.designId].name : "its built-in model"}.`)
        : "Assignments save directly to the plant layout stored in this browser.";
    }
  }

  function updateInterface() {
    updateDesignList();
    updateDesignFields();
    updateComponentList();
    updateComponentProperties();
    updateAssignmentPanel();
    updateHistoryButtons();
    setBrowserTab(state.browserTab);
    setInspectorTab(state.inspectorTab);
    updateToolLabel();
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
    if (["box", "glassPanel", "cylinder", "sphere", "cone", "wedge"].includes(component.type)) {
      return [component.x + component.w / 2, component.y + component.h / 2, component.z + component.d / 2];
    }
    if (component.type === "beam") {
      return [(component.x + component.x2) / 2, (component.y + component.y2) / 2, (component.z + component.z2) / 2];
    }
    if (component.type === "rollerBed") return [component.x + component.w / 2, component.y, component.z + component.d / 2];
    return [component.x, component.y, component.z];
  }

  function project(x, y, z) {
    const design = currentDesign();
    const centerX = (design?.base.w || 20) / 2 + state.panX;
    const centerZ = (design?.base.d || 10) / 2 + state.panZ;
    x -= centerX;
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

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return [
      (event.clientX - rect.left) * canvas.width / rect.width,
      (event.clientY - rect.top) * canvas.height / rect.height,
    ];
  }

  function worldFromScreen(event) {
    const [screenX, screenY] = canvasPoint(event);
    const design = currentDesign();
    const centerX = (design?.base.w || 20) / 2 + state.panX;
    const centerZ = (design?.base.d || 10) / 2 + state.panZ;
    const cy = Math.cos(state.yaw);
    const sy = Math.sin(state.yaw);
    const sp = Math.max(0.08, Math.sin(state.pitch));
    const scale = state.zoom * Math.min(canvas.width / 50, canvas.height / 28);
    const rx = (screenX - canvas.width / 2) / scale;
    const rz = (screenY - canvas.height * 0.56) / (sp * scale);
    return [centerX + rx * cy + rz * sy, centerZ - rx * sy + rz * cy];
  }

  function polygon(points, fill, stroke = null, lineWidth = 1, alpha = 1) {
    if (alpha <= 0.01) return;
    if (depthRenderer.available) {
      depthRenderer.addPolygon(points, fill, alpha, stroke, lineWidth, {
        transparent: alpha < 0.985,
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

  function transformAroundComponent(component, point) {
    return rotatePoint3(point, componentCenter(component), ...componentRotation(component));
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

  function cameraVector() {
    const cp = Math.cos(state.pitch);
    return [Math.sin(state.yaw) * cp, Math.sin(state.pitch), Math.cos(state.yaw) * cp];
  }

  function vectorBetween(start, end) {
    return [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
  }

  function crossProduct(first, second) {
    return [
      first[1] * second[2] - first[2] * second[1],
      first[2] * second[0] - first[0] * second[2],
      first[0] * second[1] - first[1] * second[0],
    ];
  }

  function dotProduct(first, second) {
    return first[0] * second[0] + first[1] * second[1] + first[2] * second[2];
  }

  function faceNormal(points) {
    if (points.length < 3) return [0, 0, 0];
    return crossProduct(vectorBetween(points[0], points[1]), vectorBetween(points[0], points[2]));
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
    const uSegments = clamp(Math.ceil(uLength / targetSize), 1, 14);
    const vSegments = clamp(Math.ceil(vLength / targetSize), 1, 14);
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
      const segments = clamp(Math.ceil(pointDistance(start, end) / targetSize), 1, 14);
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

  function beamVertices(component) {
    const center = componentCenter(component);
    const rotation = componentRotation(component);
    const start = rotatePoint3([component.x, component.y, component.z], center, ...rotation);
    const end = rotatePoint3([component.x2, component.y2, component.z2], center, ...rotation);
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
    ];
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
        14,
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
    return buildCylinderPrimitives(component, wheelVertices(component, 20), order, component.color, component.opacity);
  }

  function verticalCylinderVertices(component, segments = 20, topScale = 1) {
    const center = componentCenter(component);
    const count = Math.max(8, Math.round(Number(segments) || 20));
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
    const count = Math.max(8, Math.round(Number(component.segments) || 20));
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
    const longitude = Math.max(10, Math.round(Number(component.segments) || 20));
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


  function componentAnimationWave(component, time) {
    const speed = Math.max(0, Number(component.animationSpeed) || 0);
    const pauseSeconds = Math.max(0, Number(component.animationPauseSeconds) || 0);
    const phase = ((Number(component.animationPhase) || 0) / 360 + 1) % 1;
    if (speed <= 0) return { cycle: 0, wrapped: 0, sine: 0, pingPong: 0 };
    const activeDuration = 1 / speed;
    const elapsed = Math.max(0, time / 1000 + phase * activeDuration);
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

  function animateComponentSelf(component, time) {
    if (!state.previewAnimations || component.animationEnabled === false || !component.animationType || component.animationType === "none") return clone(component);
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

  function componentAnimationDelta(component, animated) {
    const baseCenter = componentCenter(component);
    const animatedCenter = componentCenter(animated);
    const baseBounds = componentWorldBounds(component);
    const animatedBounds = componentWorldBounds(animated);
    const safeRatio = (animatedSize, baseSize) => Math.abs(baseSize) > 0.0001 ? animatedSize / baseSize : 1;
    const baseRotation = componentRotation(component);
    const animatedRotation = componentRotation(animated);
    return {
      translation: animatedCenter.map((value, index) => value - baseCenter[index]),
      rotation: animatedRotation.map((value, index) => value - baseRotation[index]),
      scale: [
        safeRatio(animatedBounds.maxX - animatedBounds.minX, baseBounds.maxX - baseBounds.minX),
        safeRatio(animatedBounds.maxY - animatedBounds.minY, baseBounds.maxY - baseBounds.minY),
        safeRatio(animatedBounds.maxZ - animatedBounds.minZ, baseBounds.maxZ - baseBounds.minZ),
      ],
      alpha: Math.max(0.01, Number(animated.opacity ?? 1) / Math.max(0.01, Number(component.opacity ?? 1))),
    };
  }

  function multiplyComponentOpacity(component, factor) {
    component.opacity = clamp((Number(component.opacity ?? 1) || 1) * factor, 0.01, 1);
    if (component.type === "group") (component.children || []).forEach((child) => multiplyComponentOpacity(child, factor));
  }

  function applyInheritedComponentTransform(component, transform, pivot) {
    let rendered = clone(component);
    ["x", "y", "z"].forEach((axis, index) => {
      const factor = Number(transform.scale[index]) || 1;
      if (Math.abs(factor - 1) < 0.0001) return;
      const original = clone(rendered);
      scaleSelectionTogether([rendered], [original], pivot, factor, axis);
    });
    ["x", "y", "z"].forEach((axis, index) => {
      const degrees = Number(transform.rotation[index]) || 0;
      if (Math.abs(degrees) < 0.0001) return;
      const original = clone(rendered);
      rotateSelectionTogether([rendered], [original], pivot, degrees, axis);
    });
    translateComponent(rendered, ...transform.translation);
    if (Math.abs((Number(transform.alpha) || 1) - 1) > 0.0001) multiplyComponentOpacity(rendered, Number(transform.alpha) || 1);
    return rendered;
  }

  function animatedComponent(component, time) {
    if (component.type !== "group") return animateComponentSelf(component, time);

    const children = component.children || [];
    if (!children.length) return animateComponentSelf(component, time);
    const driver = children.find((child) => child.id === component.motionDriverId)
      || children.find((child) => child.animationEnabled !== false && child.animationType && child.animationType !== "none")
      || children[0];
    const driverAnimated = animateComponentSelf(driver, time);
    const inheritedTransform = componentAnimationDelta(driver, driverAnimated);
    const driverPivot = componentCenter(driver);

    const animatedGroup = clone(component);
    animatedGroup.motionDriverId = driver.id;
    animatedGroup.children = children.map((child) => {
      // The driver animation moves the whole merged assembly once. Other
      // children first play their own animation, then inherit the driver
      // transform so they stay attached in the driver's moving coordinate space.
      const ownAnimated = child.id === driver.id ? clone(child) : animatedComponent(child, time);
      return applyInheritedComponentTransform(ownAnimated, inheritedTransform, driverPivot);
    });

    return animateComponentSelf(animatedGroup, time);
  }

  function buildComponentPrimitives(component, order) {
    if (component.visible === false) return [];
    if (component.type === "group") {
      const groupOpacity = clamp(Number(component.opacity ?? 1), 0.05, 1);
      return (component.children || []).flatMap((child, childIndex) => {
        const renderedChild = { ...child, opacity: clamp(Number(child.opacity ?? 1), 0.05, 1) * groupOpacity };
        return buildComponentPrimitives(renderedChild, order + childIndex / 1000);
      }).map((primitive) => ({ ...primitive, component }));
    }
    if (["box", "glassPanel"].includes(component.type)) return buildBoxPrimitives(component, order);
    if (component.type === "cylinder") return buildVerticalCylinderPrimitives(component, order);
    if (component.type === "sphere") return buildSpherePrimitives(component, order);
    if (component.type === "cone") return buildConePrimitives(component, order);
    if (component.type === "wedge") return buildWedgePrimitives(component, order);
    if (component.type === "beam") return buildBeamPrimitives(component, order);
    if (component.type === "rollerBed") return buildRollerPrimitives(component, order);
    if (component.type === "wheel") return buildWheelPrimitives(component, order);
    return [];
  }

  function drawPrimitive(primitive) {
    if (primitive.kind === "polygon") {
      polygon(primitive.points, primitive.fill, primitive.stroke, primitive.lineWidth, primitive.alpha);
    } else if (primitive.kind === "line") {
      line3d(primitive.start, primitive.end, primitive.color, primitive.width, primitive.alpha);
    }
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

  function drawGrid() {
    const design = currentDesign();
    if (!design) return;
    const padding = Math.max(5, Math.max(design.base.w, design.base.d) * 0.3);
    const minX = -padding;
    const maxX = design.base.w + padding;
    const minZ = -padding;
    const maxZ = design.base.d + padding;
    polygon([[minX, 0, minZ], [maxX, 0, minZ], [maxX, 0, maxZ], [minX, 0, maxZ]], "#dce2de", "#7f8b87", 1, 1);
    const step = Math.max(0.5, state.snapStep);
    const majorEvery = Math.max(1, Math.round(5 / step));
    let lineIndex = 0;
    for (let x = Math.ceil(minX / step) * step; x <= maxX; x += step) {
      const major = lineIndex % majorEvery === 0;
      line3d([x, 0.01, minZ], [x, 0.01, maxZ], major ? "#7f8b87" : "#aab4af", major ? 1 : 0.55, major ? 0.35 : 0.22);
      lineIndex += 1;
    }
    lineIndex = 0;
    for (let z = Math.ceil(minZ / step) * step; z <= maxZ; z += step) {
      const major = lineIndex % majorEvery === 0;
      line3d([minX, 0.01, z], [maxX, 0.01, z], major ? "#7f8b87" : "#aab4af", major ? 1 : 0.55, major ? 0.35 : 0.22);
      lineIndex += 1;
    }
    line3d([0, 0.04, 0], [design.base.w + padding * 0.25, 0.04, 0], AXIS_COLORS.x, 2, 1);
    line3d([0, 0.04, 0], [0, 0.04, design.base.d + padding * 0.25], AXIS_COLORS.z, 2, 1);
    line3d([0, 0, 0], [0, design.base.h + padding * 0.3, 0], AXIS_COLORS.y, 2, 1);
  }

  function componentWorldPoints(component) {
    if (component.type === "group") return (component.children || []).flatMap(componentWorldPoints);
    if (["box", "glassPanel"].includes(component.type)) return boxVertices(component);
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
      if (primitive.component?.visible !== false && primitiveHit(primitive, point)) return primitive.component;
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
    if (component?.type === "beam") {
      const center = componentCenter(component);
      const start = rotatePoint3([component.x, component.y, component.z], center, ...componentRotation(component));
      const end = rotatePoint3([component.x2, component.y2, component.z2], center, ...componentRotation(component));
      const x = normalizedVector(vectorBetween(start, end), [1,0,0]);
      const helper = Math.abs(x[1]) < .88 ? [0,1,0] : [0,0,1];
      const z = normalizedVector(crossProduct(x, helper), [0,0,1]);
      const y = normalizedVector(crossProduct(z, x), [0,1,0]);
      return { x, y, z };
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
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function draw(time) {
    state.lastFrameTime = time;
    updateCanvasSize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    depthRenderer.beginFrame(canvas.width, canvas.height, project);
    drawGrid();

    const design = currentDesign();
    const sourceComponents = design?.components || [];
    const components = sourceComponents.map((component) => animatedComponent(component, time));
    state.renderPrimitives = components.flatMap((component, index) => buildComponentPrimitives(component, index));
    state.renderPrimitives.sort((first, second) => {
      const depthDifference = first.depth - second.depth;
      if (Math.abs(depthDifference) > 0.00001) return depthDifference;
      const firstLayer = first.kind === "line" ? 2 : first.alpha < 0.985 ? 1 : 0;
      const secondLayer = second.kind === "line" ? 2 : second.alpha < 0.985 ? 1 : 0;
      return firstLayer - secondLayer || first.order - second.order;
    });
    state.hitPrimitives = state.renderPrimitives;
    state.drawnComponents = components.map((component, index) => ({
      component: sourceComponents[index],
      renderedComponent: component,
      depth: project(...componentCenter(component))[2],
      order: index,
    })).sort((first, second) => first.depth - second.depth || first.order - second.order);
    state.renderPrimitives.forEach(drawPrimitive);
    depthRenderer.render();
    const selectedIds = state.selectAllParts
      ? new Set(state.drawnComponents.map((entry) => entry.component?.id))
      : state.selectedComponentIds;
    const selectedRendered = state.drawnComponents
      .filter((entry) => selectedIds.has(entry.component?.id))
      .map((entry) => entry.renderedComponent);
    drawSelectionOverlay(selectedRendered);
    drawGizmo();
    requestAnimationFrame(draw);
  }

  function fitView() {
    const design = currentDesign();
    if (!design) return;
    state.panX = 0;
    state.panZ = 0;
    state.zoom = clamp(20 / Math.max(design.base.w, design.base.d, design.base.h * 1.4), 0.45, 2.4);
  }

  function focusSelected() {
    const design = currentDesign();
    const components = selectionComponents();
    if (!design || !components.length) return;
    const center = selectionCenter(components);
    state.panX = center[0] - design.base.w / 2;
    state.panZ = center[2] - design.base.d / 2;
    state.zoom = clamp(components.length > 1 ? 20 / Math.max(design.base.w, design.base.d, design.base.h * 1.4) : state.zoom * 1.2, 0.25, 4);
    showToast(components.length > 1 ? `Focused ${components.length} selected parts.` : `Focused ${components[0].name}.`);
  }

  function panCamera(deltaX, deltaY) {
    const cy = Math.cos(state.yaw);
    const sy = Math.sin(state.yaw);
    const sp = Math.max(0.08, Math.sin(state.pitch));
    const scale = state.zoom * Math.min(canvas.width / 50, canvas.height / 28);
    const rx = deltaX / Math.max(1, scale);
    const rz = deltaY / Math.max(1, sp * scale);
    state.panX -= rx * cy + rz * sy;
    state.panZ -= -rx * sy + rz * cy;
  }

  function translateComponent(component, dx, dy, dz) {
    if (component.type === "group") {
      (component.children || []).forEach((child) => translateComponent(child, dx, dy, dz));
      return;
    }
    component.x += dx;
    component.y += dy;
    component.z += dz;
    if (component.type === "beam") {
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
      rotateSelectionTogether(children, originals, selectionCenter(originals), degrees, axis);
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
    if (component.type === "group") {
      Object.assign(component, clone(original));
      const children = component.children || [];
      const originals = original.children || [];
      scaleSelectionTogether(children, originals, selectionCenter(originals), factor, axis);
      return;
    }
    const uniform = axis === "center";
    if (["box", "glassPanel", "cylinder", "sphere", "cone", "wedge"].includes(component.type)) {
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
    } else if (component.type === "beam") {
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
  }

  function rotateSelectionTogether(components, originals, pivot, degrees, axis) {
    const rotationVector = axis === "x" ? [degrees, 0, 0] : axis === "z" ? [0, 0, degrees] : [0, degrees, 0];
    components.forEach((component, index) => {
      const original = originals[index];
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
      let degrees = (totalDeltaX * drag.rotationTangent[0] + totalDeltaY * drag.rotationTangent[1]) * 0.7;
      if (state.snapEnabled) degrees = Math.round(degrees / 5) * 5;
      if (drag.selectionAll) rotateSelectionTogether(targets, drag.componentsBefore, drag.pivot, degrees, drag.handle);
      else rotateComponent(targets[0], degrees, drag.handle, drag.componentsBefore[0]);
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
      if (state.snapEnabled) factor = Math.max(0.05, Math.round(factor / 0.05) * 0.05);
      if (drag.selectionAll) scaleSelectionTogether(targets, drag.componentsBefore, drag.pivot, factor, drag.handle);
      else scaleComponent(targets[0], factor, drag.handle, drag.componentsBefore[0]);
    }
    updateComponentProperties();
  }

  function finishPointer() {
    if (state.drag?.kind === "transform") {
      const design = currentDesign();
      const current = state.drag.targetIds.map((id) => design?.components.find((component) => component.id === id)).filter(Boolean);
      if (JSON.stringify(current) !== JSON.stringify(state.drag.componentsBefore)) {
        pushHistory(state.drag.historyBefore);
        commit(`${TOOL_LABELS[state.drag.tool][0]} applied to ${state.drag.selectionAll ? "the entire machine" : "the selected part"}.`);
      }
    }
    state.dragging = false;
    state.drag = null;
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button > 2) return;
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    state.dragging = true;

    const orbitRequested = event.button === 2 || event.altKey;
    const initialHit = event.button === 0 ? componentAt(event) : null;
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
      if (overlayHandle && selectionComponents().length) {
        beginTransform(event, overlayHandle);
      } else {
        const hit = initialHit || componentAt(event);
        if (hit && (additiveSelection || !state.selectedComponentIds.has(hit.id))) selectComponent(hit.id, true, additiveSelection);
        const selected = selectedComponent();
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
      // Natural horizontal orbit: dragging right rotates the model toward the right.
      state.yaw += deltaX * 0.006;
      state.pitch = clamp(state.pitch - deltaY * 0.004, 0.08, 1.5);
    } else if (state.drag.kind === "pan") {
      panCamera(deltaX, deltaY);
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
    state.zoom = clamp(state.zoom * (event.deltaY > 0 ? 0.9 : 1.1), 0.2, 5);
  }, { passive: false });
  canvas.addEventListener("dblclick", (event) => {
    const hit = componentAt(event);
    if (hit) {
      selectComponent(hit.id, true);
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

  function setView(view) {
    document.querySelectorAll("[data-design-view]").forEach((item) => item.classList.toggle("active", item.dataset.designView === view));
    if (view === "iso") { state.yaw = -0.72; state.pitch = 0.62; }
    else if (view === "front") { state.yaw = 0; state.pitch = 0.08; }
    else if (view === "side") { state.yaw = Math.PI / 2; state.pitch = 0.08; }
    else if (view === "top") { state.yaw = 0; state.pitch = 1.5; }
    else fitView();
  }
  document.querySelectorAll("[data-design-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.designView));
  });

  document.getElementById("snap-enabled")?.addEventListener("change", (event) => {
    state.snapEnabled = event.target.checked;
  });
  document.getElementById("snap-step")?.addEventListener("change", (event) => {
    state.snapStep = Math.max(0.01, Number(event.target.value) || 0.5);
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
  document.getElementById("preview-design-animations")?.addEventListener("click", (event) => {
    state.previewAnimations = !state.previewAnimations;
    event.currentTarget.classList.toggle("active", state.previewAnimations);
    event.currentTarget.textContent = state.previewAnimations ? "Pause animations" : "Play animations";
    showToast(state.previewAnimations ? "Animation preview started." : "Animation preview paused at each part's base position.");
  });

  document.getElementById("design-search")?.addEventListener("input", updateDesignList);
  document.getElementById("component-search")?.addEventListener("input", updateComponentList);
  document.getElementById("select-all-components")?.addEventListener("click", selectAllComponents);
  document.getElementById("merge-components")?.addEventListener("click", mergeSelectedComponents);
  document.getElementById("ungroup-component")?.addEventListener("click", ungroupSelectedComponent);
  document.getElementById("new-design")?.addEventListener("click", createDesign);
  document.getElementById("duplicate-design")?.addEventListener("click", duplicateDesign);
  document.getElementById("reset-design")?.addEventListener("click", resetDesign);
  document.getElementById("delete-design")?.addEventListener("click", deleteDesign);
  document.getElementById("undo-design")?.addEventListener("click", undo);
  document.getElementById("redo-design")?.addEventListener("click", redo);
  document.getElementById("duplicate-component")?.addEventListener("click", duplicateSelectedComponent);
  document.getElementById("delete-component")?.addEventListener("click", deleteSelectedComponent);
  document.getElementById("move-component-up")?.addEventListener("click", () => moveComponentOrder(-1));
  document.getElementById("move-component-down")?.addEventListener("click", () => moveComponentOrder(1));

  const designFieldMap = {
    "design-name": ["name", "text"],
    "design-machine-type": ["machineType", "text"],
    "design-description": ["description", "text"],
    "design-base-w": ["w", "base"],
    "design-base-d": ["d", "base"],
    "design-base-h": ["h", "base"],
  };
  Object.entries(designFieldMap).forEach(([id, [field, kind]]) => {
    document.getElementById(id)?.addEventListener("change", (event) => {
      const design = currentDesign();
      if (!design) return;
      pushHistory();
      if (kind === "base") design.base[field] = Math.max(0.5, Number(event.target.value) || design.base[field]);
      else design[field] = event.target.value.trim() || (field === "name" ? design.name : "");
      commit();
      if (kind === "base") fitView();
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

  document.querySelectorAll("[data-component-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const component = selectedComponent();
      if (!component) return;
      pushHistory();
      const field = input.dataset.componentField;
      if (["name", "type", "color", "animationType", "animationAxis"].includes(field)) {
        if (field === "type") {
          const replacement = normalizeComponent({ ...component, type: input.value, id: component.id, name: component.name });
          const index = currentDesign().components.findIndex((item) => item.id === component.id);
          currentDesign().components[index] = replacement;
        } else if (field === "color") {
          component.color = validColor(input.value, component.color);
          if (component.type === "group") {
            const recolor = (item) => {
              item.color = component.color;
              if (item.type === "group") (item.children || []).forEach(recolor);
            };
            (component.children || []).forEach(recolor);
          }
        } else if (["animationType", "animationAxis"].includes(field)) component[field] = input.value;
        else component.name = input.value.trim() || component.name;
      } else {
        const number = Number(input.value);
        if (!Number.isFinite(number)) return;
        if (["w", "h", "d", "size", "thickness", "thicknessY", "thicknessZ"].includes(field)) {
          component[field] = Math.max(field === "d" && component.type === "wheel" ? 0.05 : 0.02, number);
          if (component.type === "beam" && ["thicknessY", "thicknessZ"].includes(field)) component.thickness = Math.max(component.thicknessY, component.thicknessZ);
          if (component.type === "wheel" && ["w", "h"].includes(field)) component.size = Math.max(component.w, component.h);
        }
        else if (field === "count") component.count = Math.max(2, Math.round(number));
        else if (field === "segments") component.segments = Math.max(8, Math.min(48, Math.round(number)));
        else if (field === "length" && component.type === "beam") {
          const center = componentCenter(component);
          const direction = normalizedVector(vectorBetween([component.x, component.y, component.z], [component.x2, component.y2, component.z2]), [1,0,0]);
          const half = Math.max(.01, number) / 2;
          component.x = center[0] - direction[0] * half;
          component.y = center[1] - direction[1] * half;
          component.z = center[2] - direction[2] * half;
          component.x2 = center[0] + direction[0] * half;
          component.y2 = center[1] + direction[1] * half;
          component.z2 = center[2] + direction[2] * half;
        }
        else if (field === "opacity") component.opacity = clamp(number, 0.05, 1);
        else if (["animationSpeed", "animationPauseSeconds"].includes(field)) component[field] = Math.max(0, number);
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
            rotateComponent(component, number - current, axis, clone(component));
          } else {
            component[field] = number;
            if (field === "rotationY") component.rotation = number;
          }
        } else component[field] = number;
      }
      commit();
    });
  });

  document.querySelectorAll("[data-component-check]").forEach((input) => {
    input.addEventListener("change", () => {
      const component = selectedComponent();
      if (!component) return;
      pushHistory();
      component[input.dataset.componentCheck] = input.checked;
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
    commit(`${child.name} now carries the merged assembly. Other child animations remain relative to it.`);
  });

  document.getElementById("center-component")?.addEventListener("click", () => {
    const design = currentDesign();
    const component = selectedComponent();
    if (!design || !component) return;
    pushHistory();
    const center = componentCenter(component);
    translateComponent(component, design.base.w / 2 - center[0], -Math.min(0, component.y), design.base.d / 2 - center[2]);
    commit("Component centered.");
  });

  function activeRotationAxis() {
    return document.getElementById("rotation-axis")?.value || "y";
  }

  function rotateSelectedBy(degrees, axis = activeRotationAxis()) {
    const components = selectionComponents();
    if (!components.length) return;
    pushHistory();
    if (components.length > 1) rotateSelectionTogether(components, components.map(clone), selectionCenter(components), degrees, axis);
    else rotateComponent(components[0], degrees, axis, clone(components[0]));
    commit(`Rotated ${components.length > 1 ? `${components.length} selected parts` : axis.toUpperCase()} ${degrees > 0 ? "+" : ""}${degrees}°.`);
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

  document.getElementById("fit-envelope")?.addEventListener("click", () => {
    const design = currentDesign();
    if (!design || !design.components.length) return;
    pushHistory();
    const bounds = design.components.map(componentWorldBounds);
    const minX = Math.min(...bounds.map((item) => item.minX));
    const minY = Math.min(...bounds.map((item) => item.minY));
    const minZ = Math.min(...bounds.map((item) => item.minZ));
    const maxX = Math.max(...bounds.map((item) => item.maxX));
    const maxY = Math.max(...bounds.map((item) => item.maxY));
    const maxZ = Math.max(...bounds.map((item) => item.maxZ));
    design.components.forEach((component) => translateComponent(component, -minX, -minY, -minZ));
    design.base.w = Math.max(0.5, maxX - minX);
    design.base.h = Math.max(0.5, maxY - minY);
    design.base.d = Math.max(0.5, maxZ - minZ);
    fitView();
    commit("Design envelope fitted around all parts.");
  });

  document.getElementById("machine-assignment")?.addEventListener("change", updateAssignmentPanel);
  document.getElementById("apply-machine")?.addEventListener("click", () => {
    const id = document.getElementById("machine-assignment")?.value;
    const machine = plantLayout.machines.find((item) => item.instanceId === id);
    const design = currentDesign();
    if (!machine || !design) { showToast("Choose a plant object first."); return; }
    machine.designId = design.id;
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
    plantLayout.machines.forEach((machine) => {
      if (machine.type === source.type) { machine.designId = design.id; count += 1; }
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
    if (state.linkedMachineId === machine.instanceId) state.linkedMachineId = null;
    saveLayout();
    updateAssignmentPanel();
    showToast(`${machine.name} returned to its built-in model.`);
  });

  document.getElementById("export-design")?.addEventListener("click", () => {
    const design = currentDesign();
    if (!design) return;
    const blob = new Blob([JSON.stringify({ version: 6, exportedAt: new Date().toISOString(), design }, null, 2)], { type: "application/json" });
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

  window.addEventListener("keydown", (event) => {
    const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
    if (modifier && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
    if (!typing && modifier && event.key.toLowerCase() === "a") { event.preventDefault(); selectAllComponents(); return; }
    if (!typing && modifier && event.key.toLowerCase() === "d") { event.preventDefault(); duplicateSelectedComponent(); return; }
    if (typing) return;

    const key = event.key.toLowerCase();
    if (key === "v") setTool("select");
    else if (key === "m") setTool("move");
    else if (key === "r") setTool("rotate");
    else if (key === "s") setTool("scale");
    else if (key === "h") setTool("pan");
    else if (key === "f") fitView();
    else if (key === "0") setView("iso");
    else if (key === "1") setView("front");
    else if (key === "2") setView("side");
    else if (key === "3") setView("top");
    else if (event.key === "Delete" || event.key === "Backspace") deleteSelectedComponent();
    else if (event.key === "Escape") setTool("select");
    else if (event.key === "ArrowLeft") { event.preventDefault(); nudgeSelected(-state.snapStep, 0, 0); }
    else if (event.key === "ArrowRight") { event.preventDefault(); nudgeSelected(state.snapStep, 0, 0); }
    else if (event.key === "ArrowUp") { event.preventDefault(); nudgeSelected(0, event.shiftKey ? state.snapStep : 0, event.shiftKey ? 0 : -state.snapStep); }
    else if (event.key === "ArrowDown") { event.preventDefault(); nudgeSelected(0, event.shiftKey ? -state.snapStep : 0, event.shiftKey ? 0 : state.snapStep); }
    else if (event.key === ".") focusSelected();
  });

  if (!state.designId) createDesign();
  else {
    state.selectAllParts = false;
    state.componentId = currentDesign()?.components[0]?.id || null;
    state.selectedComponentIds = new Set(state.componentId ? [state.componentId] : []);
    fitView();
    updateInterface();
  }
  window.addEventListener("pagehide", () => syncChannel?.close());
  setTool("select");
  requestAnimationFrame(draw);
})();
