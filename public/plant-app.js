(() => {
  const data = window.PLANT_CAD_DATA;
  const equipmentData = window.PLANT_MACHINE_DATA;
  const canvas = document.getElementById("plant-canvas");
  if (!canvas || !data || !equipmentData) return;
  const VIEWPORT_RUNTIME_KEY = "__MONROE_ACTIVE_VIEWPORT_RUNTIME__";
  const previousViewportRuntime = window[VIEWPORT_RUNTIME_KEY];
  if (previousViewportRuntime?.dispose) {
    try { previousViewportRuntime.dispose(); }
    catch (error) { console.warn("The previous plant viewport could not be fully released.", error); }
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
  const modelFrame = canvas.closest(".model-frame");
  const timelineEngine = window.MachineAnimationTimeline || null;
  const sceneCanvas = window.createDepthCanvas?.(canvas, "depth-scene-canvas plant-depth-canvas") || null;
  const depthRenderer = sceneCanvas && window.createDepthSceneRenderer
    ? window.createDepthSceneRenderer(sceneCanvas)
    : { available: false, beginFrame() {}, addPolygon() {}, addLine() {}, render() {} };
  const renderPerformance = window.createRenderPerformanceController
    ? window.createRenderPerformanceController({ id: "plant-layout" })
    : {
        shouldRender() { return true; }, invalidate() {}, noteInteraction() {},
        pixelRatio(value) { return Math.min(Number(value) || 1, 1.25); },
        cylinderSegments(value) { return Math.max(8, Math.min(14, Number(value) || 14)); },
        shadowLayerCount() { return 1; }, maxShadowParts() { return 24; }, maxShadowMachines() { return 36; },
        maxDetailedMachines() { return 48; },
        detailPixelThreshold() { return 18; },
        walkDetailDistance() { return 135; }, walkDrawDistance() { return 420; },
        pillarShadowsEnabled() { return false; }, recordFrame() {}, mount() {},
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
  const defaultStages = [
    {
      title: "Empty shell",
      short: "Empty shell",
      era: "Starting point",
      description: "Before equipment arrives, the glass-production footprint is a clear industrial shell. The CAD-derived floor bounds and structural grid establish the scale, working lanes, and future production zones that guide every stage that follows.",
      details: ["Open floor", "Unfinished columns", "CAD footprint"],
    },
    {
      title: "Trenches dug",
      short: "Trenches",
      era: "Underground work",
      description: "Crews open the concrete along planned equipment corridors so utilities can reach each future work center. These trenches define the hidden network for electrical power, compressed air, process water, drainage, and machine connections.",
      details: ["Floor opened", "Utility routes", "Machine drops"],
    },
    {
      title: "Utilities set",
      short: "Utilities",
      era: "Infrastructure",
      description: "The underground services are installed, tested, and covered as the production floor is restored. Clearly located connection points remain ready for cutting, tempering, filtration, and material-handling equipment without reopening major sections of concrete.",
      details: ["Services placed", "Floor patched", "Drops marked"],
    },
    {
      title: "Walls painted",
      short: "Paint",
      era: "Interior finish",
      description: "The unfinished shell begins to read as a purpose-built production space. Fresh wall finishes brighten the work area, improve visual consistency, and create a cleaner background for equipment, safety markings, and daily operations.",
      details: ["Bright walls", "Full yellow pillars", "Finished shell"],
    },
    {
      title: "Safety yellow",
      short: "Safety yellow",
      era: "Visual safety",
      description: "High-visibility finishes and floor markings establish the plant's safety language. Travel aisles, impact areas, equipment clearances, and structural hazards become easier to recognize before production traffic begins.",
      details: ["Aisle markings", "Impact zones", "Protected clearances"],
    },
    {
      title: "Crane runways set",
      short: "Crane steel",
      era: "Material handling",
      description: "Blue GORBEL runway steel is erected above the processing lanes to support safe glass handling at each work center. The heavy-equipment bay receives its separate 5-ton bridge structure, matching the installation sequence documented in the project photos.",
      details: ["Blue runways", "GORBEL bridges", "5-ton bay"],
    },
    {
      title: "Barefoot tables set",
      short: "Barefoot",
      era: "Machine 1 of 8",
      description: "The Barefoot cutting tables become the first major processing equipment placed in the western production area. Their positions follow the drawing's named Barefoot location and the 3 × 6 and 4 × 9 table callouts, establishing the beginning of the cutting workflow.",
      details: ["DWG named", "Cutting tables", "West production area"],
    },
    {
      title: "SQ4020 waterjet set",
      short: "Waterjet",
      era: "Machine 2 of 8",
      description: "The SQ4020 waterjet is set at its named installation location in the facility drawing. The cutting table, abrasive system, pump connection, and controller are arranged as one coordinated cell so shaped-glass processing can join the main production flow.",
      details: ["DWG named", "SQ4020", "Cutout station"],
    },
    {
      title: "Waterjet filtration set",
      short: "Filtration",
      era: "Machine 3 of 8",
      description: "The supporting filtration and water-management equipment is installed beside the SQ4020. Pumps, table tanks, abrasive-removal components, and controls complete the utility loop required for reliable waterjet operation.",
      details: ["DWG named", "Pump & tanks", "Water treatment"],
    },
    {
      title: "Kodiak 10-45 set",
      short: "Kodiak",
      era: "Machine 4 of 8",
      description: "The Kodiak 10-45 is positioned beneath its 1,000-lb GORBEL bridge, giving operators overhead assistance for moving heavy glass. The equipment identity is photo-confirmed and its placement is correlated to the compact machine cluster shown in the facility plan.",
      details: ["Photo identified", "CAD correlated", "GORBEL 1000 lb"],
    },
    {
      title: "Denver Surface #1 set",
      short: "Denver #1",
      era: "Machine 5 of 8",
      description: "The first Denver Surface unit is installed at the western repeated equipment footprint. Its working envelope respects the roller-replacement clearance shown in the drawing while the overhead bridge supports glass loading and service access.",
      details: ["Photo identified", "Repeated CAD footprint", "GORBEL 1000 lb"],
    },
    {
      title: "Denver Surface #2 set",
      short: "Denver #2",
      era: "Machine 6 of 8",
      description: "A second Denver Surface unit is added at the eastern copy of the same planned footprint. Together, the paired machines expand edge-processing capacity while retaining independent crane coverage and maintenance clearance.",
      details: ["Second unit", "Mirrored placement", "Own crane bridge"],
    },
    {
      title: "Tempering furnace set",
      short: "Furnace",
      era: "Machine 7 of 8",
      description: "The tempering furnace is assembled from its multi-truck delivery beneath the yellow 5-ton bridge. Its long process line follows the oven-layer block cluster in the facility drawing, creating the plant's central heat-treatment path.",
      details: ["Oven CAD layers", "8-truck arrival", "5-ton bridge"],
    },
    {
      title: "Fuze Cube set",
      short: "Fuze Cube",
      era: "Machine 8 of 8",
      description: "The Fuze Cube is installed at its directly named location east of the core processing line. This dedicated finishing station adds another specialized operation while remaining connected to the plant's established glass-handling route.",
      details: ["DWG named", "Exact drawing anchor", "Dedicated bridge"],
    },
    {
      title: "First raw glass",
      short: "Raw glass",
      era: "Material arrival",
      description: "The first raw glass sheets arrive and begin filling the storage racks, turning the completed installation into an active material system. For the first time, the route from receiving and storage through cutting, processing, and tempering can be followed across the floor.",
      details: ["Raw lites", "Storage racks", "Material flow"],
    },
    {
      title: "Plant offices built",
      short: "Plant offices",
      era: "Support spaces",
      description: "Plant-floor offices, quality areas, and team support spaces are completed inside the glass operation. These rooms provide the nearby coordination, inspection, and production support needed to move from equipment installation into controlled startup.",
      details: ["Floor offices", "Quality space", "Team support"],
    },
    {
      title: "First production",
      short: "First production",
      era: "Startup",
      description: "The line comes alive as glass advances through the coordinated production sequence for the first time. Operators, material-handling equipment, and status systems work together to produce the plant's first completed output and validate the new process.",
      details: ["Line active", "First output", "Startup team"],
    },
    {
      title: "Plant today",
      short: "Today",
      era: "Current state",
      description: "Today the glass plant operates as one connected production system. Incoming raw glass, storage, cutting, specialty processing, tempering, quality checks, and plant support are linked across the floor in the layout developed through every earlier stage.",
      details: ["Full operation", "Connected flow", "Current plant"],
    },
  ];

  const legacyStageDescriptionPrefixes = [
    "The production floor begins", "Utility trenches cut", "Underground services are placed",
    "The plant shell changes", "Aisles, impact zones", "Blue GORBEL runway steel",
    "The Barefoot cutting tables", "The SQ4020 waterjet appears", "The waterjet pump",
    "The Kodiak 10-45 is installed", "The first Denver Surface unit", "The second Denver Surface unit",
    "The tempering furnace oven", "The Fuze Cube is installed", "The first sheets of raw glass",
    "Plant-floor support offices", "The line comes alive", "The glass plant operates",
  ];

  const cadBounds = data.bounds;
  const defaultFloor = {
    centerX: (cadBounds[0] + cadBounds[2]) / 2,
    centerZ: (cadBounds[1] + cadBounds[3]) / 2,
    width: cadBounds[2] - cadBounds[0],
    length: cadBounds[3] - cadBounds[1],
  };
  const STORAGE_KEY = "monroe-glass-plant-layout-v6";
  const LEGACY_STORAGE_KEY = "monroe-glass-plant-layout-v5";
  const OLDER_STORAGE_KEY = "monroe-glass-plant-layout-v4";
  const OLDEST_STORAGE_KEY = "monroe-glass-plant-layout-v3";
  const BACKUP_STORAGE_KEY = "monroe-glass-plant-layout-v6-backup";
  const MIGRATION_BACKUP_KEY = "monroe-glass-plant-layout-v5-before-v0.4";
  const DESIGN_STORAGE_KEY = window.PLANT_MACHINE_DESIGN_STORAGE_KEY || "monroe-glass-machine-designs-v1";
  const DESIGN_BACKUP_STORAGE_KEY = `${DESIGN_STORAGE_KEY}-backup`;
  const EDITOR_PROFILE_KEY = "monroe-glass-editor-profile-v1";
  const PUBLISH_RECOVERY_STORAGE_KEY = "monroe-glass-recovery-before-publish-v1";
  const PRE_RECOVERY_LAYOUT_KEY = "monroe-glass-plant-layout-v6-pre-recovery";
  const PRE_RECOVERY_DESIGN_KEY = "monroe-glass-machine-designs-v1-pre-recovery";
  const SYNC_CHANNEL_NAME = "monroe-glass-plant-sync-v1";
  const syncChannel = typeof window.BroadcastChannel === "function"
    ? new window.BroadcastChannel(SYNC_CHANNEL_NAME)
    : null;
  const workspaceTransfer = window.PLANT_WORKSPACE_TRANSFER || null;
  const APP_VERSION = "0.13.79";

  function editorProfileProtected() {
    try {
      return window.monroeEditorAccess?.hasEditorProfile?.() === true
        || localStorage.getItem(EDITOR_PROFILE_KEY) === "protected"
        || localStorage.getItem(BACKUP_STORAGE_KEY) !== null
        || localStorage.getItem(DESIGN_BACKUP_STORAGE_KEY) !== null;
    } catch { return false; }
  }

  function capturePublishedWorkspaceRecovery(publishedWorkspace) {
    if (!publishedWorkspace?.items || localStorage.getItem(PUBLISH_RECOVERY_STORAGE_KEY)) return;
    const items = {};
    Object.entries(publishedWorkspace.items).forEach(([key, publishedValue]) => {
      const existing = localStorage.getItem(key);
      if (existing !== null && existing !== publishedValue) items[key] = existing;
    });
    if (!Object.keys(items).length) return;
    localStorage.setItem(PUBLISH_RECOVERY_STORAGE_KEY, JSON.stringify({
      capturedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      items,
    }));
  }

  function applyPublishedWorkspace() {
    const publishedWorkspace = window.PLANT_PUBLISHED_WORKSPACE;
    // A browser that has ever authenticated as an editor owns its local
    // workspace permanently. Session expiry may lock editing again, but a
    // public page load must never replace that browser's machines/designs.
    if (!publishedWorkspace || !workspaceTransfer) return;
    if (window.monroeEditorAccess?.editingAllowed?.() !== false || editorProfileProtected()) return;
    try {
      capturePublishedWorkspaceRecovery(publishedWorkspace);
      workspaceTransfer.applyPayload(localStorage, publishedWorkspace);
    } catch (error) {
      console.error("The published plant workspace could not be loaded.", error);
    }
  }

  applyPublishedWorkspace();
  const MIN_FLOOR_DIMENSION = 40;
  const MAX_FLOOR_DIMENSION = 5000;
  const MAX_FLOOR_GRID_LINES = 120;
  const BASE_COLUMN_COUNT = data.columns.length;
  const MAX_GENERATED_COLUMNS = 6000;
  const defaultColumnGrid = {
    autoExtend: true,
    spacingX: 40,
    spacingZ: 30,
    anchorX: -220.04,
    anchorZ: -199.97,
  };
  const WALL_IDS = ["west", "east", "south", "north-west", "north-east"];
  const defaultWalls = Object.fromEntries(WALL_IDS.map((id) => [id, true]));
  const defaultPaintSettings = Object.freeze({
    wallStageId: "stage-4",
    columnStageId: "stage-4",
    wallBefore: "#a6aaa7",
    wallAfter: "#e9e7df",
    columnBefore: "#596365",
    columnAfter: "#e3ad28",
  });
  const defaultRoofSettings = Object.freeze({
    enabled: true,
    overviewVisible: false,
    splitPercent: 50,
    leftHeight: 50,
    rightHeight: 75,
    trussSpacing: 24,
    roofColor: "#79878b",
    trussColor: "#11181c",
  });
  const defaultWallGeometry = Object.freeze({
    height: 24,
    thickness: 3,
    extendToRoof: true,
  });
  const defaultDesignLibrary = window.PLANT_MACHINE_DESIGNS || {};

  function normalizePaintSettings(value) {
    const color = (candidate, fallback) => /^#[0-9a-f]{6}$/i.test(String(candidate || "")) ? String(candidate) : fallback;
    return {
      wallStageId: String(value?.wallStageId || defaultPaintSettings.wallStageId),
      columnStageId: String(value?.columnStageId || defaultPaintSettings.columnStageId),
      wallBefore: color(value?.wallBefore, defaultPaintSettings.wallBefore),
      wallAfter: color(value?.wallAfter, defaultPaintSettings.wallAfter),
      columnBefore: color(value?.columnBefore, defaultPaintSettings.columnBefore),
      columnAfter: color(value?.columnAfter, defaultPaintSettings.columnAfter),
    };
  }

  function normalizeRoofSettings(value) {
    const color = (candidate, fallback) => /^#[0-9a-f]{6}$/i.test(String(candidate || "")) ? String(candidate) : fallback;
    return {
      enabled: value?.enabled !== false,
      overviewVisible: value?.overviewVisible === true,
      splitPercent: clamp(Number(value?.splitPercent) || defaultRoofSettings.splitPercent, 10, 90),
      leftHeight: clamp(Number(value?.leftHeight) || defaultRoofSettings.leftHeight, 25, 140),
      rightHeight: clamp(Number(value?.rightHeight) || defaultRoofSettings.rightHeight, 25, 140),
      trussSpacing: clamp(Number(value?.trussSpacing) || defaultRoofSettings.trussSpacing, 10, 80),
      roofColor: color(value?.roofColor, defaultRoofSettings.roofColor),
      trussColor: color(value?.trussColor, defaultRoofSettings.trussColor),
    };
  }

  function normalizeWallGeometry(value) {
    return {
      height: clamp(Number(value?.height) || defaultWallGeometry.height, 8, 150),
      thickness: clamp(Number(value?.thickness) || defaultWallGeometry.thickness, .25, 20),
      extendToRoof: value?.extendToRoof !== false,
    };
  }

  function normalizeFloor(value) {
    return {
      centerX: Number.isFinite(Number(value?.centerX)) ? Number(value.centerX) : defaultFloor.centerX,
      centerZ: Number.isFinite(Number(value?.centerZ)) ? Number(value.centerZ) : defaultFloor.centerZ,
      width: clamp(Number(value?.width) || defaultFloor.width, MIN_FLOOR_DIMENSION, MAX_FLOOR_DIMENSION),
      length: clamp(Number(value?.length) || defaultFloor.length, MIN_FLOOR_DIMENSION, MAX_FLOOR_DIMENSION),
    };
  }

  function normalizeColumnGrid(value) {
    return {
      autoExtend: value?.autoExtend !== false,
      spacingX: clamp(Number(value?.spacingX) || defaultColumnGrid.spacingX, 5, 250),
      spacingZ: clamp(Number(value?.spacingZ) || defaultColumnGrid.spacingZ, 5, 250),
      anchorX: Number.isFinite(Number(value?.anchorX)) ? Number(value.anchorX) : defaultColumnGrid.anchorX,
      anchorZ: Number.isFinite(Number(value?.anchorZ)) ? Number(value.anchorZ) : defaultColumnGrid.anchorZ,
    };
  }

  function normalizeColumnOverrides(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).flatMap(([key, position]) => {
      const x = Number(position?.x);
      const z = Number(position?.z);
      return Number.isFinite(x) && Number.isFinite(z) ? [[key, { x, z }]] : [];
    }));
  }

  function loadDesignLibrary() {
    try {
      const saved = JSON.parse(localStorage.getItem(DESIGN_STORAGE_KEY) || "null");
      const overrides = saved?.designs && typeof saved.designs === "object" ? saved.designs : {};
      return { ...clone(defaultDesignLibrary), ...clone(overrides) };
    } catch (error) {
      console.warn("Machine design overrides could not be loaded.", error);
      return clone(defaultDesignLibrary);
    }
  }

  function floorBounds() {
    return [
      floor.centerX - floor.width / 2,
      floor.centerZ - floor.length / 2,
      floor.centerX + floor.width / 2,
      floor.centerZ + floor.length / 2,
    ];
  }

  function modelCenter() {
    return [floor.centerX, floor.centerZ];
  }

  let structuralColumnCache = null;
  let columnOverrides = {};
  let columnOverridesRevision = 0;
  let structuralColumnMeta = { baseCount: 0, generatedCount: 0, totalCount: 0, limited: false, stride: 1 };

  function invalidateStructuralColumns() {
    structuralColumnCache = null;
  }

  function columnIsInsideFloor(x, z, bounds = floorBounds()) {
    return x >= bounds[0] && x <= bounds[2] && z >= bounds[1] && z <= bounds[3];
  }

  function structuralColumns() {
    const bounds = floorBounds();
    const grid = normalizeColumnGrid(columnGrid);
    const signature = [
      ...bounds.map((value) => Number(value).toFixed(3)),
      grid.autoExtend, grid.spacingX, grid.spacingZ, grid.anchorX, grid.anchorZ,
      columnOverridesRevision,
    ].join("|");
    if (structuralColumnCache?.signature === signature) return structuralColumnCache.columns;

    const applyOverride = (column) => ({ ...column, ...(columnOverrides[column.key] || {}) });
    const columns = data.columns.slice(0, BASE_COLUMN_COUNT)
      .map(([x, z], baseIndex) => applyOverride({ key: `cad:${baseIndex}`, source: "cad", baseIndex, x, z }))
      .filter((column) => columnIsInsideFloor(column.x, column.z, bounds));
    const baseCount = columns.length;
    let generatedCount = 0;
    let limited = false;
    let stride = 1;

    if (grid.autoExtend) {
      // Keep generated supports one quarter-bay inside the exterior wall. This
      // follows the existing CAD grid while avoiding columns directly inside a
      // wall when the floor is enlarged by only part of a bay.
      const insetX = Math.min(12, grid.spacingX * .25);
      const insetZ = Math.min(10, grid.spacingZ * .25);
      const minIx = Math.ceil((bounds[0] + insetX - grid.anchorX) / grid.spacingX);
      const maxIx = Math.floor((bounds[2] - insetX - grid.anchorX) / grid.spacingX);
      const minIz = Math.ceil((bounds[1] + insetZ - grid.anchorZ) / grid.spacingZ);
      const maxIz = Math.floor((bounds[3] - insetZ - grid.anchorZ) / grid.spacingZ);
      const rawCount = Math.max(0, maxIx - minIx + 1) * Math.max(0, maxIz - minIz + 1);
      stride = rawCount > MAX_GENERATED_COLUMNS
        ? Math.max(1, Math.ceil(Math.sqrt(rawCount / MAX_GENERATED_COLUMNS)))
        : 1;
      limited = stride > 1;
      const tolerance = .25;
      const existing = new Set(columns.map((column) => `${column.x.toFixed(2)}:${column.z.toFixed(2)}`));

      for (let ix = minIx; ix <= maxIx; ix += stride) {
        const x = grid.anchorX + ix * grid.spacingX;
        for (let iz = minIz; iz <= maxIz; iz += stride) {
          const z = grid.anchorZ + iz * grid.spacingZ;
          const outsideOriginal = x < cadBounds[0] - tolerance || x > cadBounds[2] + tolerance ||
            z < cadBounds[1] - tolerance || z > cadBounds[3] + tolerance;
          if (!outsideOriginal) continue;
          const coordinateKey = `${x.toFixed(2)}:${z.toFixed(2)}`;
          if (existing.has(coordinateKey)) continue;
          columns.push(applyOverride({ key: `grid:${ix}:${iz}`, source: "generated", baseIndex: null, gridX: ix, gridZ: iz, x, z }));
          existing.add(coordinateKey);
          generatedCount += 1;
        }
      }
    }

    structuralColumnMeta = { baseCount, generatedCount, totalCount: columns.length, limited, stride };
    structuralColumnCache = { signature, columns };
    return columns;
  }

  function isColumnHidden(column) {
    if (!column) return true;
    return column.source === "cad"
      ? state.hiddenColumns.has(column.baseIndex)
      : state.hiddenColumnKeys.has(column.key);
  }

  function wallSections() {
    const bounds = floorBounds();
    const thickness = state?.wallGeometry?.thickness || defaultWallGeometry.thickness;
    const height = state?.wallGeometry?.height || defaultWallGeometry.height;
    const openingStart = Math.min(bounds[2] - 20, bounds[0] + Math.max(70, floor.width * 0.22));
    const openingEnd = Math.min(bounds[2], openingStart + Math.max(36, floor.width * 0.14));
    return [
      { id: "west", x: bounds[0], z: bounds[1], w: thickness, d: floor.length, h: height },
      { id: "east", x: bounds[2] - thickness, z: bounds[1], w: thickness, d: floor.length, h: height },
      { id: "south", x: bounds[0], z: bounds[1], w: floor.width, d: thickness, h: height },
      { id: "north-west", x: bounds[0], z: bounds[3] - thickness, w: Math.max(thickness, openingStart - bounds[0]), d: thickness, h: height },
      { id: "north-east", x: openingEnd, z: bounds[3] - thickness, w: Math.max(thickness, bounds[2] - openingEnd), d: thickness, h: height },
    ];
  }

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function isAnimationType(type) {
    return ["animatedGlass", "animatedBox", "animatedPerson", "animatedCart", "animatedBeacon"].includes(type);
  }

  function isFloorFeatureType(type) {
    return ["safetyLine", "trench", "floorDrain"].includes(type);
  }

  function objectCategory(type) {
    if (isAnimationType(type)) return "animation";
    if (isFloorFeatureType(type)) return "floor";
    if (["glassRack", "room", "person"].includes(type)) return "support";
    return "equipment";
  }

  function defaultDesignForType(type) {
    return {
      generic: "generic-machine",
      genericBox: "generic-box-standard",
      cutting: "cutting-standard",
      waterjet: "waterjet-standard",
      filtration: "filtration-standard",
      kodiak: "kodiak-standard",
      denver: "denver-standard",
      washer: "washer-standard",
      furnace: "furnace-standard",
      cube: "fusecube-standard",
      wrapping: "wrapping-standard",
      shipping: "shipping-standard",
      aFrame: "aframe-cart-standard",
      aFrameTruck: "aframe-truck-standard",
      craneMachine: "crane-machine-standard",
      bridgeCrane: "bridge-crane-standard",
      glassRack: "glass-rack-standard",
      room: "room-standard",
      person: "team-member-standard",
      safetyLine: "safety-line-standard",
      trench: "utility-trench-standard",
      floorDrain: "floor-drain-standard",
    }[type] || "";
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

  function designBaseDimensions(design, machine = null) {
    const base = design?.base || {};
    return {
      x: Number(base.x) || 0,
      y: Number(base.y) || 0,
      z: Number(base.z) || 0,
      w: Math.max(.01, Number(base.w) || Number(machine?.w) || 1),
      d: Math.max(.01, Number(base.d) || Number(machine?.d) || 1),
      h: Math.max(.01, Number(base.h) || Number(machine?.h) || 1),
    };
  }

  function currentMachineScale(machine) {
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

  function syncMachineDimensionsToDesign(machine, design, { preserveScale = true } = {}) {
    if (!machine || !design) return false;
    const base = designBaseDimensions(design, machine);
    const scale = preserveScale ? currentMachineScale(machine) : { x: 1, y: 1, z: 1, editMode: "uniform" };
    const oldWidth = Math.max(.01, Number(machine.w) || base.w);
    const oldDepth = Math.max(.01, Number(machine.d) || base.d);
    const width = base.w * scale.x;
    const depth = base.d * scale.z;
    const height = base.h * scale.y;
    const changed = Math.abs(oldWidth - width) > .0001
      || Math.abs(oldDepth - depth) > .0001
      || Math.abs(Number(machine.h) - height) > .0001
      || Math.abs((Number(machine.naturalW) || 0) - base.w) > .0001
      || Math.abs((Number(machine.naturalD) || 0) - base.d) > .0001
      || Math.abs((Number(machine.naturalH) || 0) - base.h) > .0001;
    // Keep the object's floor-plan center fixed while its editable envelope
    // changes to the studio design dimensions at its existing layout scale.
    machine.x = Number(machine.x) + (oldWidth - width) / 2;
    machine.z = Number(machine.z) + (oldDepth - depth) / 2;
    machine.w = width;
    machine.d = depth;
    machine.h = height;
    machine.naturalW = base.w;
    machine.naturalD = base.d;
    machine.naturalH = base.h;
    machine.scaleEditMode = scale.editMode;
    refreshMachineScaleMetadata(machine);
    return changed;
  }

  function syncMachineNameToDesign(machine, design) {
    if (!machine || !design || machine.useDesignName === false) return false;
    const name = String(design.name || machine.name || "Untitled object").trim() || "Untitled object";
    const changed = machine.name !== name || machine.short !== name || machine.useDesignName !== true;
    machine.name = name;
    machine.short = name;
    machine.useDesignName = true;
    return changed;
  }

  let designLibrary = {};

  function machineReferenceDimensions(machine) {
    const design = machine?.designId ? designLibrary?.[machine.designId] : null;
    if (design) return designBaseDimensions(design, machine);
    return {
      w: Math.max(.01, Number(machine?.naturalW) || Number(machine?.w) || 1),
      d: Math.max(.01, Number(machine?.naturalD) || Number(machine?.d) || 1),
      h: Math.max(.01, Number(machine?.naturalH) || Number(machine?.h) || 1),
    };
  }

  function refreshMachineScaleMetadata(machine) {
    if (!machine) return;
    const reference = machineReferenceDimensions(machine);
    machine.scaleXPercent = Math.max(.01, Number(machine.w) / reference.w * 100);
    machine.scaleYPercent = Math.max(.01, Number(machine.h) / reference.h * 100);
    machine.scaleZPercent = Math.max(.01, Number(machine.d) / reference.d * 100);
  }

  function resizeMachineAroundCenter(machine, field, value) {
    const next = Math.max(.01, Number(value) || .01);
    if (field === "w") {
      const centerX = Number(machine.x) + Number(machine.w) / 2;
      machine.w = next;
      machine.x = centerX - next / 2;
    } else if (field === "d") {
      const centerZ = Number(machine.z) + Number(machine.d) / 2;
      machine.d = next;
      machine.z = centerZ - next / 2;
    } else if (field === "h") {
      machine.h = next;
    }
    refreshMachineScaleMetadata(machine);
  }

  function setMachineScalePercent(machine, axis, percent) {
    if (!machine) return;
    const value = clamp(Number(percent) || 100, 1, 10000);
    const reference = machineReferenceDimensions(machine);
    if (axis === "uniform") {
      machine.scaleEditMode = "uniform";
      if (machine.designScaleMode === "match" && Math.abs(value - 100) > .0001) machine.designScaleMode = "preserve";
      resizeMachineAroundCenter(machine, "w", reference.w * value / 100);
      resizeMachineAroundCenter(machine, "h", reference.h * value / 100);
      resizeMachineAroundCenter(machine, "d", reference.d * value / 100);
      machine.scaleXPercent = value;
      machine.scaleYPercent = value;
      machine.scaleZPercent = value;
      return;
    }
    machine.scaleEditMode = "individual";
    if (machine.designId) machine.designScaleMode = "stretch";
    if (axis === "x") resizeMachineAroundCenter(machine, "w", reference.w * value / 100);
    if (axis === "y") resizeMachineAroundCenter(machine, "h", reference.h * value / 100);
    if (axis === "z") resizeMachineAroundCenter(machine, "d", reference.d * value / 100);
  }

  function designPlacement(machine, design) {
    const base = designBaseDimensions(design, machine);
    const mode = normalizedDesignScaleMode(machine?.designScaleMode);
    const ratioX = Math.max(.0001, Number(machine.w) || base.w) / base.w;
    const ratioY = Math.max(.0001, Number(machine.h) || base.h) / base.h;
    const ratioZ = Math.max(.0001, Number(machine.d) || base.d) / base.d;
    let scaleX = ratioX;
    let scaleY = ratioY;
    let scaleZ = ratioZ;
    const scaleEditMode = normalizedMachineScaleEditMode(machine?.scaleEditMode, machine);
    if (scaleEditMode === "uniform") {
      const ratiosNearlyEqual = Math.max(ratioX, ratioY, ratioZ) - Math.min(ratioX, ratioY, ratioZ) < .0001;
      const uniform = ratiosNearlyEqual
        ? Math.max(.0001, (ratioX + ratioY + ratioZ) / 3)
        : Math.max(.0001, Math.min(ratioX, ratioY, ratioZ));
      scaleX = uniform;
      scaleY = uniform;
      scaleZ = uniform;
    }
    return {
      base, mode, scaleEditMode, scaleX, scaleY, scaleZ,
      offsetX: (Number(machine.w) - base.w * scaleX) / 2 - base.x * scaleX,
      offsetY: -base.y * scaleY,
      offsetZ: (Number(machine.d) - base.d * scaleZ) / 2 - base.z * scaleZ,
    };
  }

  function animationDefaults(type) {
    const defaults = {
      animatedGlass: { animationMode: "pingPong", animationAxis: "x", animationDistance: 144, animationSpeed: 0.035, animationPhase: 0 },
      animatedBox: { animationMode: "pingPong", animationAxis: "x", animationDistance: 30, animationSpeed: 0.12, animationPhase: 0 },
      animatedPerson: { animationMode: "pingPong", animationAxis: "z", animationDistance: 18, animationSpeed: 0.08, animationPhase: 0 },
      animatedCart: { animationMode: "pingPong", animationAxis: "x", animationDistance: 36, animationSpeed: 0.07, animationPhase: 0 },
      animatedBeacon: { animationMode: "blink", animationAxis: "y", animationDistance: 0, animationSpeed: 1.25, animationPhase: 0 },
    };
    return defaults[type] || { animationMode: "none", animationAxis: "x", animationDistance: 10, animationSpeed: 0.1, animationPhase: 0 };
  }

  const PROCESS_POINTER_FLOW_DEFINITIONS = Object.freeze([
    { key: "cutting", text: "Cutting", order: 0 },
    { key: "polisher", text: "Polisher", order: 1 },
    { key: "denver-cnc", text: "Denver CNC", order: 2 },
    { key: "waterjet", text: "Waterjet", order: 3 },
    { key: "washer", text: "Washer", order: 4 },
    { key: "tempering", text: "Tempering Line", order: 5 },
    { key: "wrap", text: "Wrap", order: 6 },
    { key: "glass-truck", text: "Glass Truck", order: 7 },
    { key: "rack", text: "Rack", order: 8 },
  ]);
  const PROCESS_POINTER_FLOW_BY_KEY = new Map(PROCESS_POINTER_FLOW_DEFINITIONS.map((item) => [item.key, item]));
  const PROCESS_STEP_NUMBER_BY_ROLE = Object.freeze({
    cutting: 1,
    polisher: 2,
    "denver-cnc": 3,
    waterjet: 3,
    washer: 4,
    tempering: 5,
    wrap: 6,
    "glass-truck": 7,
    rack: 7,
  });
  const DEFAULT_PROCESS_CONNECTION_LINKS = Object.freeze([
    ["cutting", "polisher"],
    ["polisher", "denver-cnc"],
    ["polisher", "waterjet"],
    ["denver-cnc", "washer"],
    ["waterjet", "washer"],
    ["washer", "tempering"],
    ["tempering", "wrap"],
    ["wrap", "glass-truck"],
    ["wrap", "rack"],
  ]);

  function processPointerFlowDefinition(key) {
    return PROCESS_POINTER_FLOW_BY_KEY.get(String(key || "")) || null;
  }

  function processPointerFlowLabel(key) {
    const definition = processPointerFlowDefinition(key);
    return definition ? { ...definition } : null;
  }

  function assignedProcessFlowForMachine(machine) {
    const key = processPointerKeyForMachine(machine);
    return key ? processPointerFlowLabel(key, machine) : null;
  }

  function normalizeMachine(machine, index = 0) {
    const labelUsesMachineName = machine.labelUseMachineName !== false;
    const normalized = {
      ...clone(machine),
      id: machine.id || uniqueId(machine.type || "object"),
      instanceId: machine.instanceId || `${machine.id || machine.type || "object"}-${index}`,
      name: machine.name || "Untitled object",
      short: machine.short || machine.name || "Object",
      type: machine.type || "genericBox",
      x: Number(machine.x) || 0,
      y: Number(machine.y) || 0,
      z: Number(machine.z) || 0,
      w: Math.max(0.01, Number(machine.w) || 10),
      d: Math.max(0.01, Number(machine.d) || 10),
      h: Math.max(0.01, Number(machine.h) || 5),
      naturalW: Math.max(0.01, Number(machine.naturalW) || Number(machine.w) || 10),
      naturalD: Math.max(0.01, Number(machine.naturalD) || Number(machine.d) || 10),
      naturalH: Math.max(0.01, Number(machine.naturalH) || Number(machine.h) || 5),
      scaleXPercent: Math.max(.01, Number(machine.scaleXPercent) || 100),
      scaleYPercent: Math.max(.01, Number(machine.scaleYPercent) || 100),
      scaleZPercent: Math.max(.01, Number(machine.scaleZPercent) || 100),
      scaleEditMode: normalizedMachineScaleEditMode(machine.scaleEditMode, machine),
      rotationX: Number(machine.rotationX) || 0,
      rotationY: Number.isFinite(Number(machine.rotationY)) ? Number(machine.rotationY) : Number(machine.rotation) || 0,
      rotationZ: Number(machine.rotationZ) || 0,
      rotation: Number.isFinite(Number(machine.rotationY)) ? Number(machine.rotationY) : Number(machine.rotation) || 0,
      reveal: Number.isFinite(Number(machine.reveal)) ? Number(machine.reveal) : 0,
      retire: Number.isFinite(Number(machine.retire)) ? Number(machine.retire) : 99,
      color: machine.color || "#277d78",
      visible: machine.visible !== false,
      locked: machine.locked === true,
      showLabel: machine.showLabel !== false,
      labelShowToday: machine.labelShowToday === true,
      labelReveal: Number.isFinite(Number(machine.labelReveal))
        ? clamp(Math.round(Number(machine.labelReveal)), 0, 98)
        : clamp(Math.round(Number(machine.reveal) || 0), 0, 98),
      labelRetire: Number.isFinite(Number(machine.labelRetire))
        ? (Number(machine.labelRetire) >= 99 ? 99 : clamp(Math.round(Number(machine.labelRetire)), 0, 98))
        : clamp(Math.round(Number(machine.reveal) || 0), 0, 98),
      labelUseMachineName: labelUsesMachineName,
      labelText: labelUsesMachineName ? "" : String(machine.labelText || machine.name || "Object"),
      labelAbbreviation: String(machine.labelAbbreviation || "").trim(),
      labelTextColor: /^#[0-9a-f]{6}$/i.test(String(machine.labelTextColor || "")) ? machine.labelTextColor : "#ffffff",
      labelBackgroundColor: /^#[0-9a-f]{6}$/i.test(String(machine.labelBackgroundColor || "")) ? machine.labelBackgroundColor : "#141c20",
      labelSizePercent: Math.max(5, Number(machine.labelSizePercent) || 100),
      labelFontWeight: ["regular", "semibold", "bold"].includes(machine.labelFontWeight) ? machine.labelFontWeight : "semibold",
      labelUppercase: machine.labelUppercase === true,
      labelAnchorXPercent: clamp(Number.isFinite(Number(machine.labelAnchorXPercent)) ? Number(machine.labelAnchorXPercent) : 50, -1000, 1100),
      labelAnchorYPercent: clamp(Number.isFinite(Number(machine.labelAnchorYPercent)) ? Number(machine.labelAnchorYPercent) : 100, -1000, 1100),
      labelAnchorZPercent: clamp(Number.isFinite(Number(machine.labelAnchorZPercent)) ? Number(machine.labelAnchorZPercent) : 50, -1000, 1100),
      labelHeightOffset: clamp(Number.isFinite(Number(machine.labelHeightOffset)) ? Number(machine.labelHeightOffset) : 4, 0, 200),
      // v0.13.38: machine labels now live at stable world-space offsets.
      // Keep the legacy screen offsets in saved layouts for backward compatibility,
      // but do not use them for normal machine-label placement.
      labelWorldOffsetX: clamp(Number.isFinite(Number(machine.labelWorldOffsetX)) ? Number(machine.labelWorldOffsetX) : 0, -80, 80),
      labelWorldOffsetZ: clamp(Number.isFinite(Number(machine.labelWorldOffsetZ)) ? Number(machine.labelWorldOffsetZ) : 0, -80, 80),
      labelRotationY: clamp(Number.isFinite(Number(machine.labelRotationY)) ? Number(machine.labelRotationY) : 0, -180, 180),
      labelTurnToCamera: machine.labelTurnToCamera !== false,
      labelTurnSpeedPercent: clamp(Number.isFinite(Number(machine.labelTurnSpeedPercent)) ? Number(machine.labelTurnSpeedPercent) : 100, 25, 200),
      labelDepthFeet: clamp(Number.isFinite(Number(machine.labelDepthFeet)) ? Number(machine.labelDepthFeet) : .35, .1, 2),
      labelTextExtrudeFeet: clamp(Number.isFinite(Number(machine.labelTextExtrudeFeet)) ? Number(machine.labelTextExtrudeFeet) : .065, .02, .3),
      labelGlowPercent: clamp(Number.isFinite(Number(machine.labelGlowPercent)) ? Number(machine.labelGlowPercent) : 55, 0, 100),
      labelZoomMinPercent: clamp(Number.isFinite(Number(machine.labelZoomMinPercent)) ? Number(machine.labelZoomMinPercent) : 88, 70, 100),
      labelZoomMaxPercent: clamp(Number.isFinite(Number(machine.labelZoomMaxPercent)) ? Number(machine.labelZoomMaxPercent) : 112, 100, 140),
      labelPriority: ["automatic", "major", "normal", "support"].includes(machine.labelPriority) ? machine.labelPriority : "automatic",
      labelScreenOffsetX: clamp(Number.isFinite(Number(machine.labelScreenOffsetX)) ? Number(machine.labelScreenOffsetX) : 0, -400, 400),
      labelScreenOffsetY: clamp(Number.isFinite(Number(machine.labelScreenOffsetY)) ? Number(machine.labelScreenOffsetY) : 0, -400, 400),
      labelLineColor: /^#[0-9a-f]{6}$/i.test(String(machine.labelLineColor || "")) ? machine.labelLineColor : "#52b7aa",
      labelLineWidth: clamp(Number.isFinite(Number(machine.labelLineWidth)) ? Number(machine.labelLineWidth) : 1.65, .5, 10),
      labelLineOpacity: clamp(Number.isFinite(Number(machine.labelLineOpacity)) ? Number(machine.labelLineOpacity) : 100, 10, 100),
      labelLineStyle: ["solid", "dashed", "dotted"].includes(machine.labelLineStyle) ? machine.labelLineStyle : "solid",
      labelLineShape: ["straight", "elbow"].includes(machine.labelLineShape) ? machine.labelLineShape : "straight",
      labelLeaderSide: ["auto", "top", "bottom", "left", "right"].includes(machine.labelLeaderSide) ? machine.labelLeaderSide : "auto",
      labelTargetStyle: ["dot", "ring", "arrow", "none"].includes(machine.labelTargetStyle) ? machine.labelTargetStyle : "dot",
      labelTargetSize: clamp(Number.isFinite(Number(machine.labelTargetSize)) ? Number(machine.labelTargetSize) : 3.2, 1, 12),
      processStepLabelEnabled: machine.processStepLabelEnabled === true,
      processStepNumber: Number.isFinite(Number(machine.processStepNumber)) ? clamp(Math.round(Number(machine.processStepNumber)), 1, 99) : 0,
      processStepLabelText: String(machine.processStepLabelText || "").trim().slice(0, 80),
      processPointerVisible: machine.processPointerVisible !== false,
      processPointerText: String(machine.processPointerText || "").trim(),
      processPointerAnchorXPercent: clamp(Number.isFinite(Number(machine.processPointerAnchorXPercent)) ? Number(machine.processPointerAnchorXPercent) : (Number.isFinite(Number(machine.labelAnchorXPercent)) ? Number(machine.labelAnchorXPercent) : 50), -1000, 1100),
      processPointerAnchorYPercent: clamp(Number.isFinite(Number(machine.processPointerAnchorYPercent)) ? Number(machine.processPointerAnchorYPercent) : (Number.isFinite(Number(machine.labelAnchorYPercent)) ? Number(machine.labelAnchorYPercent) : 100), -1000, 1100),
      processPointerAnchorZPercent: clamp(Number.isFinite(Number(machine.processPointerAnchorZPercent)) ? Number(machine.processPointerAnchorZPercent) : (Number.isFinite(Number(machine.labelAnchorZPercent)) ? Number(machine.labelAnchorZPercent) : 50), -1000, 1100),
      processPointerLabelOffset: clamp(Number.isFinite(Number(machine.processPointerLabelOffset)) ? Number(machine.processPointerLabelOffset) : (Number.isFinite(Number(machine.labelHeightOffset)) ? Number(machine.labelHeightOffset) : 4), 0, 60),
      processPointerScreenOffsetX: clamp(Number.isFinite(Number(machine.processPointerScreenOffsetX)) ? Number(machine.processPointerScreenOffsetX) : (Number.isFinite(Number(machine.labelScreenOffsetX)) ? Number(machine.labelScreenOffsetX) : 0), -500, 500),
      processPointerScreenOffsetY: clamp(Number.isFinite(Number(machine.processPointerScreenOffsetY)) ? Number(machine.processPointerScreenOffsetY) : (Number.isFinite(Number(machine.labelScreenOffsetY)) ? Number(machine.labelScreenOffsetY) : 0), -500, 500),
      processPointerColor: /^#[0-9a-f]{6}$/i.test(String(machine.processPointerColor || "")) ? machine.processPointerColor : (/^#[0-9a-f]{6}$/i.test(String(machine.labelLineColor || "")) ? machine.labelLineColor : "#52b7aa"),
      processPointerWidth: clamp(Number.isFinite(Number(machine.processPointerWidth)) ? Number(machine.processPointerWidth) : (Number.isFinite(Number(machine.labelLineWidth)) ? Number(machine.labelLineWidth) : 1.65), .5, 12),
      processPointerOpacity: clamp(Number.isFinite(Number(machine.processPointerOpacity)) ? Number(machine.processPointerOpacity) : (Number.isFinite(Number(machine.labelLineOpacity)) ? Number(machine.labelLineOpacity) : 100), 5, 100),
      processPointerStyle: ["solid", "dashed", "dotted"].includes(machine.processPointerStyle) ? machine.processPointerStyle : (["solid", "dashed", "dotted"].includes(machine.labelLineStyle) ? machine.labelLineStyle : "solid"),
      processPointerShape: ["straight", "elbow"].includes(machine.processPointerShape) ? machine.processPointerShape : (["straight", "elbow"].includes(machine.labelLineShape) ? machine.labelLineShape : "straight"),
      processPointerLeaderSide: ["auto", "top", "bottom", "left", "right"].includes(machine.processPointerLeaderSide) ? machine.processPointerLeaderSide : (["auto", "top", "bottom", "left", "right"].includes(machine.labelLeaderSide) ? machine.labelLeaderSide : "auto"),
      processPointerEndStyle: ["dot", "ring", "arrow", "none"].includes(machine.processPointerEndStyle) ? machine.processPointerEndStyle : (["dot", "ring", "arrow", "none"].includes(machine.labelTargetStyle) ? machine.labelTargetStyle : "arrow"),
      processPointerEndSize: clamp(Number.isFinite(Number(machine.processPointerEndSize)) ? Number(machine.processPointerEndSize) : (Number.isFinite(Number(machine.labelTargetSize)) ? Number(machine.labelTargetSize) : 3.2), 1, 14),
      category: machine.category || objectCategory(machine.type),
      designId: machine.designId || defaultDesignForType(machine.type),
      designScaleMode: normalizedDesignScaleMode(machine.designScaleMode || (isFloorFeatureType(machine.type) ? "stretch" : "preserve")),
      collisionMode: machine.collisionMode || (["bridgeCrane", "craneMachine", "person"].includes(machine.type) || isAnimationType(machine.type) ? "ignore" : "solid"),
      animationEnabled: machine.animationEnabled !== false,
      animationMode: ["none", "loop", "pingPong", "fourStep", "spin", "bob", "pulse", "blink"].includes(machine.animationMode)
        ? machine.animationMode
        : animationDefaults(machine.type).animationMode,
      animationAxis: ["x", "y", "z", "all"].includes(machine.animationAxis)
        ? machine.animationAxis
        : animationDefaults(machine.type).animationAxis,
      animationSecondaryAxis: ["x", "y", "z"].includes(machine.animationSecondaryAxis)
        ? machine.animationSecondaryAxis
        : "z",
      animationDistance: Number.isFinite(Number(machine.animationDistance))
        ? Number(machine.animationDistance)
        : animationDefaults(machine.type).animationDistance,
      animationSecondaryDistance: Number.isFinite(Number(machine.animationSecondaryDistance))
        ? Number(machine.animationSecondaryDistance)
        : 10,
      animationSpeed: Math.max(0, Number.isFinite(Number(machine.animationSpeed))
        ? Number(machine.animationSpeed)
        : animationDefaults(machine.type).animationSpeed),
      animationPhase: Number.isFinite(Number(machine.animationPhase))
        ? Number(machine.animationPhase)
        : animationDefaults(machine.type).animationPhase,
      animationPauseSeconds: Math.max(0, Number.isFinite(Number(machine.animationPauseSeconds))
        ? Number(machine.animationPauseSeconds)
        : 0),
      animationSecondaryPauseSeconds: Math.max(0, Number.isFinite(Number(machine.animationSecondaryPauseSeconds))
        ? Number(machine.animationSecondaryPauseSeconds)
        : (Number.isFinite(Number(machine.animationPauseSeconds)) ? Number(machine.animationPauseSeconds) : 0)),
      animationStep1PauseSeconds: Math.max(0, Number.isFinite(Number(machine.animationStep1PauseSeconds))
        ? Number(machine.animationStep1PauseSeconds)
        : (Number.isFinite(Number(machine.animationPauseSeconds)) ? Number(machine.animationPauseSeconds) : 0)),
      animationStep2PauseSeconds: Math.max(0, Number.isFinite(Number(machine.animationStep2PauseSeconds))
        ? Number(machine.animationStep2PauseSeconds)
        : (Number.isFinite(Number(machine.animationSecondaryPauseSeconds))
          ? Number(machine.animationSecondaryPauseSeconds)
          : (Number.isFinite(Number(machine.animationPauseSeconds)) ? Number(machine.animationPauseSeconds) : 0))),
      animationStep3PauseSeconds: Math.max(0, Number.isFinite(Number(machine.animationStep3PauseSeconds))
        ? Number(machine.animationStep3PauseSeconds)
        : (Number.isFinite(Number(machine.animationPauseSeconds)) ? Number(machine.animationPauseSeconds) : 0)),
      animationStep4PauseSeconds: Math.max(0, Number.isFinite(Number(machine.animationStep4PauseSeconds))
        ? Number(machine.animationStep4PauseSeconds)
        : (Number.isFinite(Number(machine.animationSecondaryPauseSeconds))
          ? Number(machine.animationSecondaryPauseSeconds)
          : (Number.isFinite(Number(machine.animationPauseSeconds)) ? Number(machine.animationPauseSeconds) : 0))),
      animationGroupId: typeof machine.animationGroupId === "string" ? machine.animationGroupId : "",
      motionParentId: typeof machine.motionParentId === "string" ? machine.motionParentId : "",
      playOwnAnimation: machine.playOwnAnimation !== false,
      playOwnAnimationWasExplicit: typeof machine.playOwnAnimation === "boolean",
    };
    if (normalized.labelRetire < 99 && normalized.labelRetire < normalized.labelReveal) {
      normalized.labelRetire = normalized.labelReveal;
    }
    if (normalized.crane) {
      normalized.crane = {
        system: normalized.crane.system || "GORBEL bridge",
        capacity: normalized.crane.capacity || "1000 lb",
        height: Math.max(4, Number(normalized.crane.height) || 20),
      };
    }
    // Existing layouts did not store scale metadata. Derive it from the
    // current numeric dimensions so migration never changes the visible size.
    refreshMachineScaleMetadata(normalized);
    return normalized;
  }

  function supportObjects() {
    const racks = Array.from({ length: 6 }, (_, index) => ({
      id: `raw-glass-rack-${index + 1}`,
      instanceId: `raw-glass-rack-${index + 1}`,
      name: `Raw glass rack ${index + 1}`,
      short: `Rack ${index + 1}`,
      type: "glassRack",
      reveal: 14,
      x: 12 + index * 35,
      z: -210,
      w: 23,
      d: 9,
      h: 12,
      color: "#303b40",
      placement_status: "photo_correlated",
      evidence: "Editable raw-glass storage rack based on the current plant layout.",
    }));
    const rooms = [
      { id: "plant-office", name: "Plant office", x: -225, z: 8, w: 28, d: 36, h: 12, color: "#d8d2c5" },
      { id: "quality-office", name: "Quality", x: -195, z: 8, w: 30, d: 36, h: 12, color: "#c9d7d4" },
      { id: "team-room", name: "Team room", x: -163, z: 8, w: 25, d: 36, h: 12, color: "#d8d2c5" },
    ].map((room) => ({
      ...room,
      instanceId: room.id,
      short: room.name,
      type: "room",
      reveal: 15,
      placement_status: "photo_correlated",
      evidence: "Editable plant-floor support space.",
    }));
    const people = [[-191,-133],[30,-91],[151,-98],[98,-169],[202,-137]].map(([x,z], index) => ({
      id: `team-member-${index + 1}`,
      instanceId: `team-member-${index + 1}`,
      name: `Team member ${index + 1}`,
      short: `Person ${index + 1}`,
      type: "person",
      reveal: 16,
      x,
      z,
      w: 1.6,
      d: 1.6,
      h: 6.5,
      color: index % 2 ? "#dd6735" : "#1e7b78",
      placement_status: "illustrative",
      evidence: "Editable illustrative production team marker.",
    }));
    return [...racks, ...rooms, ...people];
  }

  function normalizeMachines(items) {
    return (Array.isArray(items) ? items : []).map((item,index) => normalizeMachine(item,index));
  }


  function defaultAnimationObjects() {
    return [
      {
        id: "production-glass-animation",
        instanceId: "production-glass-animation",
        name: "Production glass flow",
        short: "Moving glass",
        type: "animatedGlass",
        reveal: 16,
        retire: 99,
        x: 22,
        z: -106,
        w: 1.2,
        d: 13,
        h: 10,
        color: "#8fc6d4",
        showLabel: false,
        collisionMode: "ignore",
        placement_status: "illustrative",        evidence: "Editable production-flow animation replacing the former hard-coded final-stage motion.",
        animationEnabled: true,
        animationMode: "pingPong",
        animationAxis: "x",
        animationDistance: 144,
        animationSpeed: 0.035,
        animationPhase: 0,
      },
      {
        id: "production-beacon-animation",
        instanceId: "production-beacon-animation",
        name: "Production status beacon",
        short: "Beacon",
        type: "animatedBeacon",
        reveal: 16,
        retire: 99,
        x: 116,
        z: -100,
        w: 2,
        d: 2,
        h: 18,
        color: "#d64a32",
        showLabel: false,
        collisionMode: "ignore",
        placement_status: "illustrative",
        evidence: "Editable final-stage status animation.",
        animationEnabled: true,
        animationMode: "blink",
        animationAxis: "y",
        animationDistance: 0,
        animationSpeed: 1.25,
        animationPhase: 0,
      },
    ];
  }

  function defaultFloorFeatureObjects() {
    const trenchSpecs = [
      [-211, -99, 385, 3],
      [-90, -195, 3, 145],
      [43, -195, 3, 96],
      [145, -195, 3, 96],
    ];
    const safetySpecs = [
      [-222,-205,86,4],[-136,-205,4,121],[-132,-88,315,4],[179,-205,4,121],
      [0,-124,170,3],[0,-153,170,3],
    ];
    const trenches = trenchSpecs.map(([x,z,w,d], index) => ({
      id: `utility-trench-${index + 1}`,
      instanceId: `utility-trench-${index + 1}`,
      name: `Utility trench ${index + 1}`,
      short: `Trench ${index + 1}`,
      type: "trench",
      reveal: 1,
      retire: 2,
      x, z, w, d,
      h: 0.22,
      color: "#4a3a31",
      showLabel: false,
      collisionMode: "ignore",
      placement_status: "dwg_named",
      evidence: "Editable utility trench derived from the original construction sequence.",
    }));
    const safetyLines = safetySpecs.map(([x,z,w,d], index) => ({
      id: `safety-line-${index + 1}`,
      instanceId: `safety-line-${index + 1}`,
      name: `Safety yellow line ${index + 1}`,
      short: `Safety line ${index + 1}`,
      type: "safetyLine",
      reveal: 4,
      retire: 99,
      x, z, w, d,
      h: 0.08,
      color: "#e3ad28",
      showLabel: false,
      collisionMode: "ignore",
      placement_status: "dwg_named",
      evidence: "Editable safety marking based on the original plant-floor lane layout.",
    }));
    const drains = [{
      id: "floor-drain-1",
      instanceId: "floor-drain-1",
      name: "Square floor drain 1",
      short: "Floor drain",
      type: "floorDrain",
      reveal: 2,
      retire: 99,
      x: 40.5,
      z: -111.5,
      w: 3,
      d: 3,
      h: 0.18,
      color: "#465155",
      showLabel: false,
      collisionMode: "ignore",
      placement_status: "user_added",
      evidence: "Editable square floor-drain model added to the plant layout.",
    }];
    return [...trenches, ...safetyLines, ...drains];
  }

  function mergeDefaultFloorFeatureObjects(items) {
    const result = normalizeMachines(items);
    const ids = new Set(result.map((item) => item.id));
    defaultFloorFeatureObjects().forEach((item, index) => {
      if (!ids.has(item.id)) result.push(normalizeMachine(item, result.length + index));
    });
    return result;
  }

  function mergeDefaultAnimationObjects(items) {
    const result = normalizeMachines(items);
    const ids = new Set(result.map((item) => item.id));
    defaultAnimationObjects().forEach((item, index) => {
      if (!ids.has(item.id)) result.push(normalizeMachine(item, result.length + index));
    });
    return result;
  }

  function loadSceneAwareMachines(layout, includeSupportObjects = false) {
    let base = includeSupportObjects
      ? mergeSupportObjects(layout?.machines || [])
      : normalizeMachines(layout?.machines || []);
    // Once initialized, user-deleted scene objects stay deleted instead of being
    // silently recreated on the next load.
    if (layout?.sceneAnimationsInitialized !== true) base = mergeDefaultAnimationObjects(base);
    if (layout?.floorFeaturesInitialized !== true) base = mergeDefaultFloorFeatureObjects(base);
    return base;
  }

  function defaultSceneMachines() {
    return mergeDefaultFloorFeatureObjects(mergeDefaultAnimationObjects(initialMachines()));
  }

  function mergeSupportObjects(items) {
    const result = normalizeMachines(items);
    const ids = new Set(result.map((item) => item.id));
    supportObjects().forEach((item,index) => {
      if (!ids.has(item.id)) result.push(normalizeMachine(item,result.length + index));
    });
    return result;
  }

  function initialMachines() {
    return mergeSupportObjects([
      ...equipmentData.machines,
      ...(equipmentData.fixtures || []),
    ]);
  }

  function normalizeStages(stageList) {
    const source = Array.isArray(stageList) && stageList.length ? stageList : defaultStages;
    return source.map((stage,index) => {
      const template = defaultStages[index];
      const id = stage.id || `stage-${index + 1}`;
      const isBuiltIn = Boolean(template) && (id === `stage-${index + 1}` || stage.title === template.title);
      const legacyPrefix = legacyStageDescriptionPrefixes[index];
      const shouldRefreshDescription = isBuiltIn && (!stage.description || (legacyPrefix && stage.description.startsWith(legacyPrefix)));
      return {
        id,
        title: stage.title || `Stage ${index + 1}`,
        short: stage.short || stage.title || `Stage ${index + 1}`,
        era: stage.era || "Project phase",
        dateLabel: stage.dateLabel || "",
        description: shouldRefreshDescription ? template.description : (stage.description || ""),
        details: Array.isArray(stage.details) ? stage.details : [],
      };
    });
  }

  function normalizeStageDuration(value) {
    return clamp(Math.round((Number(value) || 5) / 5) * 5, 5, 120);
  }

  function createDefaultProcessPointerAssignments(machineList) {
    const groups = new Map();
    (machineList || []).forEach((machine) => {
      const flow = necessaryFlowLabel(machine);
      if (!flow || !machine?.instanceId) return;
      if (!groups.has(flow.key)) groups.set(flow.key, []);
      groups.get(flow.key).push(machine);
    });
    const planPoint = (machine) => [
      Number(machine?.x || 0) + Number(machine?.w || 0) / 2,
      Number(machine?.z || 0) + Number(machine?.d || 0) / 2,
    ];
    const distanceSquared = (first, second) => {
      const dx = first[0] - second[0];
      const dz = first[1] - second[1];
      return dx * dx + dz * dz;
    };
    const nearest = (items, targetPoint) => {
      if (!items?.length) return null;
      return items.reduce((best, item) => (
        !best || distanceSquared(planPoint(item), targetPoint) < distanceSquared(planPoint(best), targetPoint)
          ? item
          : best
      ), null);
    };
    const midpoint = (...items) => {
      const points = items.filter(Boolean).map(planPoint);
      if (!points.length) return [0, 0];
      return [
        points.reduce((sum, point) => sum + point[0], 0) / points.length,
        points.reduce((sum, point) => sum + point[1], 0) / points.length,
      ];
    };
    const largest = (items = []) => items.reduce((best, item) => (
      !best || Number(item.w || 0) * Number(item.d || 0) > Number(best.w || 0) * Number(best.d || 0)
        ? item
        : best
    ), null);

    // Migrate the old automatic flow once using the complete saved plant, not
    // the camera-dependent set of entries rendered in the current frame.
    const selected = new Map();
    const cutting = largest(groups.get("cutting"));
    if (cutting) selected.set("cutting", cutting);
    const polisher = nearest(groups.get("polisher"), planPoint(cutting));
    if (polisher) selected.set("polisher", polisher);
    const denver = nearest(groups.get("denver-cnc"), planPoint(polisher || cutting));
    if (denver) selected.set("denver-cnc", denver);
    const waterjet = nearest(groups.get("waterjet"), planPoint(polisher || cutting));
    if (waterjet) selected.set("waterjet", waterjet);
    const washer = nearest(groups.get("washer"), midpoint(denver, waterjet, polisher));
    if (washer) selected.set("washer", washer);
    const tempering = nearest(groups.get("tempering"), planPoint(washer));
    if (tempering) selected.set("tempering", tempering);
    const wrap = nearest(groups.get("wrap"), planPoint(tempering || washer));
    if (wrap) selected.set("wrap", wrap);
    const truck = nearest(groups.get("glass-truck"), planPoint(wrap));
    if (truck) selected.set("glass-truck", truck);
    const rack = nearest(groups.get("rack"), planPoint(wrap));
    if (rack) selected.set("rack", rack);

    return Object.fromEntries([...selected].map(([key, machine]) => [key, machine.instanceId]));
  }

  function normalizeProcessPointerAssignments(value, machineList, { fillDefaults = false } = {}) {
    const availableIds = new Set((machineList || []).map((machine) => machine?.instanceId).filter(Boolean));
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const result = {};
    const usedMachineIds = new Set();
    PROCESS_POINTER_FLOW_DEFINITIONS.forEach(({ key }) => {
      const instanceId = String(source[key] || "");
      if (!instanceId || !availableIds.has(instanceId) || usedMachineIds.has(instanceId)) return;
      result[key] = instanceId;
      usedMachineIds.add(instanceId);
    });
    if (fillDefaults) {
      const defaults = createDefaultProcessPointerAssignments(machineList);
      PROCESS_POINTER_FLOW_DEFINITIONS.forEach(({ key }) => {
        const instanceId = String(defaults[key] || "");
        if (result[key] || !instanceId || !availableIds.has(instanceId) || usedMachineIds.has(instanceId)) return;
        result[key] = instanceId;
        usedMachineIds.add(instanceId);
      });
    }
    return result;
  }

  function processConnectionKey(sourceId, targetId) {
    return `object:${String(sourceId || "")}->${String(targetId || "")}`;
  }

  function processConnectionRoleForObject(instanceId) {
    if (!instanceId) return "";
    return PROCESS_POINTER_FLOW_DEFINITIONS.find(({ key }) => state?.processPointers?.[key] === instanceId)?.key || "";
  }

  // Process-line endpoints may intentionally sit well outside the source or
  // destination object. 0..100 is the object itself; the extended range gives
  // enough room to route cleanly around equipment without creating fake helper
  // objects just to hold an endpoint.
  const PROCESS_CONNECTION_ANCHOR_MIN_PERCENT = -1000;
  const PROCESS_CONNECTION_ANCHOR_MAX_PERCENT = 1100;
  const PROCESS_FLOW_MAX_PIVOTS = 24;

  function normalizeProcessFlowPivotPoints(value) {
    if (!Array.isArray(value)) return [];
    const used = new Set();
    return value.slice(0, PROCESS_FLOW_MAX_PIVOTS).map((pivot, index) => {
      const x = Number(pivot?.x);
      const z = Number(pivot?.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
      let id = String(pivot?.id || `pivot-${index + 1}`).replace(/[^a-z0-9_-]/gi, "-").slice(0, 48) || `pivot-${index + 1}`;
      while (used.has(id)) id = `${id}-${index + 1}`;
      used.add(id);
      return { id, x, z };
    }).filter(Boolean);
  }

  function defaultProcessConnection(sourceId, targetId, { fromKey = "", toKey = "" } = {}) {
    return {
      key: processConnectionKey(sourceId, targetId),
      sourceId,
      targetId,
      fromKey: processPointerFlowDefinition(fromKey)?.key || "",
      toKey: processPointerFlowDefinition(toKey)?.key || "",
      visible: true,
      startAnchorXPercent: 50,
      startAnchorYPercent: 100,
      startAnchorZPercent: 50,
      endAnchorXPercent: 50,
      endAnchorYPercent: 100,
      endAnchorZPercent: 50,
      flowTurn1Progress: 34,
      flowTurn1Offset: 0,
      flowTurn2Progress: 66,
      flowTurn2Offset: 0,
      flowPivotMode: "legacy",
      flowPivotPoints: [],
      flowCurvePercent: 68,
      flowFloorHeight: 0.18,
      flowSpeed: 42,
      flowGlow: 100,
      tagVisible: false,
      tagText: "",
      tagLift: 4,
      tagScreenOffsetX: 0,
      tagScreenOffsetY: 0,
      color: "#52b7aa",
      width: 1.65,
      opacity: 100,
      style: "solid",
      shape: "straight",
      endStyle: "arrow",
      endSize: 3.2,
    };
  }

  function normalizeProcessConnection(value, sourceId, targetId, fallback = null) {
    const defaults = { ...defaultProcessConnection(sourceId, targetId), ...(fallback || {}) };
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const readNumber = (field, min, max) => {
      const candidate = Number(source[field]);
      const base = Number(defaults[field]);
      return clamp(Number.isFinite(candidate) ? candidate : base, min, max);
    };
    const fromKey = processPointerFlowDefinition(source.fromKey)?.key || processPointerFlowDefinition(defaults.fromKey)?.key || "";
    const toKey = processPointerFlowDefinition(source.toKey)?.key || processPointerFlowDefinition(defaults.toKey)?.key || "";
    return {
      ...defaults,
      key: processConnectionKey(sourceId, targetId),
      sourceId,
      targetId,
      fromKey,
      toKey,
      visible: source.visible !== undefined ? source.visible !== false : defaults.visible !== false,
      startAnchorXPercent: readNumber("startAnchorXPercent", PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT),
      startAnchorYPercent: readNumber("startAnchorYPercent", PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT),
      startAnchorZPercent: readNumber("startAnchorZPercent", PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT),
      endAnchorXPercent: readNumber("endAnchorXPercent", PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT),
      endAnchorYPercent: readNumber("endAnchorYPercent", PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT),
      endAnchorZPercent: readNumber("endAnchorZPercent", PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT),
      flowTurn1Progress: readNumber("flowTurn1Progress", 0, 100),
      flowTurn1Offset: readNumber("flowTurn1Offset", -500, 500),
      flowTurn2Progress: readNumber("flowTurn2Progress", 0, 100),
      flowTurn2Offset: readNumber("flowTurn2Offset", -500, 500),
      flowPivotMode: source.flowPivotMode === "custom" ? "custom" : (Array.isArray(source.flowPivotPoints) && source.flowPivotPoints.length ? "custom" : "legacy"),
      flowPivotPoints: normalizeProcessFlowPivotPoints(source.flowPivotPoints),
      flowCurvePercent: readNumber("flowCurvePercent", 0, 100),
      flowFloorHeight: readNumber("flowFloorHeight", 0.02, 30),
      flowSpeed: readNumber("flowSpeed", 0, 180),
      flowGlow: readNumber("flowGlow", 0, 200),
      tagVisible: source.tagVisible !== undefined ? source.tagVisible === true : defaults.tagVisible === true,
      tagText: String(source.tagText ?? defaults.tagText ?? "").trim().slice(0, 120),
      tagLift: readNumber("tagLift", 0, 60),
      tagScreenOffsetX: readNumber("tagScreenOffsetX", -500, 500),
      tagScreenOffsetY: readNumber("tagScreenOffsetY", -500, 500),
      color: /^#[0-9a-f]{6}$/i.test(String(source.color || "")) ? source.color : defaults.color,
      width: readNumber("width", .5, 12),
      opacity: readNumber("opacity", 5, 100),
      style: ["solid", "dashed", "dotted"].includes(source.style) ? source.style : defaults.style,
      shape: ["straight", "elbow"].includes(source.shape) ? source.shape : defaults.shape,
      endStyle: ["arrow", "dot", "ring", "none"].includes(source.endStyle) ? source.endStyle : defaults.endStyle,
      endSize: readNumber("endSize", 1, 14),
    };
  }

  function legacyProcessConnectionFallback(fromKey, toKey, assignments, machineList) {
    const machineByInstanceId = new Map((machineList || []).map((machine) => [machine?.instanceId, machine]));
    const sourceId = assignments?.[fromKey] || "";
    const targetId = assignments?.[toKey] || "";
    const fromMachine = machineByInstanceId.get(sourceId);
    const toMachine = machineByInstanceId.get(targetId);
    const fallback = defaultProcessConnection(sourceId, targetId, { fromKey, toKey });
    if (fromMachine) {
      fallback.visible = fromMachine.processPointerVisible !== false;
      fallback.startAnchorXPercent = Number(fromMachine.processPointerAnchorXPercent ?? 50);
      fallback.startAnchorYPercent = Number(fromMachine.processPointerAnchorYPercent ?? 100);
      fallback.startAnchorZPercent = Number(fromMachine.processPointerAnchorZPercent ?? 50);
      fallback.tagLift = Number(fromMachine.processPointerLabelOffset ?? 4);
      fallback.tagScreenOffsetX = Number(fromMachine.processPointerScreenOffsetX ?? 0);
      fallback.tagScreenOffsetY = Number(fromMachine.processPointerScreenOffsetY ?? 0);
      fallback.color = fromMachine.processPointerColor || fallback.color;
      fallback.width = Number(fromMachine.processPointerWidth ?? fallback.width);
      fallback.opacity = Number(fromMachine.processPointerOpacity ?? fallback.opacity);
      fallback.style = fromMachine.processPointerStyle || fallback.style;
      fallback.shape = fromMachine.processPointerShape || fallback.shape;
      fallback.endStyle = fromMachine.processPointerEndStyle || fallback.endStyle;
      fallback.endSize = Number(fromMachine.processPointerEndSize ?? fallback.endSize);
    }
    if (toMachine) {
      fallback.endAnchorXPercent = Number(toMachine.processPointerAnchorXPercent ?? 50);
      fallback.endAnchorYPercent = Number(toMachine.processPointerAnchorYPercent ?? 100);
      fallback.endAnchorZPercent = Number(toMachine.processPointerAnchorZPercent ?? 50);
    }
    return fallback;
  }

  function normalizeProcessConnections(value, assignments, machineList, { fillDefaults = false } = {}) {
    const result = {};
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const availableIds = new Set((machineList || []).map((machine) => machine?.instanceId).filter(Boolean));
    Object.entries(source).forEach(([storedKey, raw]) => {
      const legacyPieces = String(storedKey || "").replace(/^object:/, "").split("->");
      const fromKey = processPointerFlowDefinition(raw?.fromKey)?.key || "";
      const toKey = processPointerFlowDefinition(raw?.toKey)?.key || "";
      const legacyFromKey = fromKey || (processPointerFlowDefinition(legacyPieces[0])?.key || "");
      const legacyToKey = toKey || (processPointerFlowDefinition(legacyPieces[1])?.key || "");
      const sourceId = String(raw?.sourceId || (legacyFromKey ? assignments?.[legacyFromKey] : "") || (storedKey.startsWith("object:") ? legacyPieces[0] : ""));
      const targetId = String(raw?.targetId || (legacyToKey ? assignments?.[legacyToKey] : "") || (storedKey.startsWith("object:") ? legacyPieces[1] : ""));
      if (!sourceId || !targetId || sourceId === targetId || !availableIds.has(sourceId) || !availableIds.has(targetId)) return;
      const key = processConnectionKey(sourceId, targetId);
      result[key] = normalizeProcessConnection(raw, sourceId, targetId, {
        fromKey: legacyFromKey,
        toKey: legacyToKey,
      });
    });
    if (fillDefaults) {
      DEFAULT_PROCESS_CONNECTION_LINKS.forEach(([fromKey, toKey]) => {
        const sourceId = String(assignments?.[fromKey] || "");
        const targetId = String(assignments?.[toKey] || "");
        if (!sourceId || !targetId || sourceId === targetId || !availableIds.has(sourceId) || !availableIds.has(targetId)) return;
        const key = processConnectionKey(sourceId, targetId);
        if (result[key]) return;
        result[key] = normalizeProcessConnection(
          null,
          sourceId,
          targetId,
          legacyProcessConnectionFallback(fromKey, toKey, assignments, machineList),
        );
      });
    }
    return result;
  }

  function loadLayout() {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (current?.version === 6 && Array.isArray(current.machines)) {
        return {
          machines: loadSceneAwareMachines(current),
          processPointers: current.processPointers && typeof current.processPointers === "object" ? current.processPointers : {},
          processPointersInitialized: current.processPointersInitialized === true,
          processConnections: current.processConnections && typeof current.processConnections === "object" ? current.processConnections : {},
          processConnectionsInitialized: current.processConnectionsInitialized === true,
          stages: normalizeStages(current.stages),
          floor: normalizeFloor(current.floor),
          columnGrid: normalizeColumnGrid(current.columnGrid),
          hiddenColumns: Array.isArray(current.hiddenColumns) ? current.hiddenColumns : [],
          hiddenColumnKeys: Array.isArray(current.hiddenColumnKeys) ? current.hiddenColumnKeys : [],
          columnOverrides: normalizeColumnOverrides(current.columnOverrides),
          walls: { ...defaultWalls, ...(current.walls || {}) },
          wallGeometry: normalizeWallGeometry(current.wallGeometry),
          paint: normalizePaintSettings(current.paint),
          roof: normalizeRoofSettings(current.roof),
          playbackSpeed: Number(current.playbackSpeed) || 1,
          stageDurationSeconds: normalizeStageDuration(current.stageDurationSeconds),
        };
      }
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      const legacy = JSON.parse(legacyRaw || "null");
      if (legacy?.version === 5 && Array.isArray(legacy.machines)) {
        if (legacyRaw && !localStorage.getItem(MIGRATION_BACKUP_KEY)) {
          localStorage.setItem(MIGRATION_BACKUP_KEY, legacyRaw);
        }
        return {
          machines: loadSceneAwareMachines(legacy),
          processPointers: {},
          processPointersInitialized: false,
          processConnections: {},
          processConnectionsInitialized: false,
          stages: normalizeStages(legacy.stages),
          floor: normalizeFloor(legacy.floor),
          columnGrid: normalizeColumnGrid(legacy.columnGrid),
          hiddenColumns: Array.isArray(legacy.hiddenColumns) ? legacy.hiddenColumns : [],
          hiddenColumnKeys: Array.isArray(legacy.hiddenColumnKeys) ? legacy.hiddenColumnKeys : [],
          columnOverrides: normalizeColumnOverrides(legacy.columnOverrides),
          walls: { ...defaultWalls, ...(legacy.walls || {}) },
          wallGeometry: normalizeWallGeometry(legacy.wallGeometry),
          paint: normalizePaintSettings(legacy.paint),
          roof: normalizeRoofSettings(legacy.roof),
          playbackSpeed: Number(legacy.playbackSpeed) || 1,
          stageDurationSeconds: normalizeStageDuration(legacy.stageDurationSeconds),
        };
      }
      const older = JSON.parse(localStorage.getItem(OLDER_STORAGE_KEY) || "null");
      if (older?.version === 4 && Array.isArray(older.machines)) {
        return {
          machines: loadSceneAwareMachines(older),
          processPointers: {},
          processPointersInitialized: false,
          processConnections: {},
          processConnectionsInitialized: false,
          stages: normalizeStages(older.stages),
          floor: normalizeFloor(older.floor),
          columnGrid: normalizeColumnGrid(older.columnGrid),
          hiddenColumns: Array.isArray(older.hiddenColumns) ? older.hiddenColumns : [],
          hiddenColumnKeys: Array.isArray(older.hiddenColumnKeys) ? older.hiddenColumnKeys : [],
          columnOverrides: normalizeColumnOverrides(older.columnOverrides),
          walls: { ...defaultWalls, ...(older.walls || {}) },
          wallGeometry: normalizeWallGeometry(older.wallGeometry),
          paint: normalizePaintSettings(older.paint),
          roof: normalizeRoofSettings(older.roof),
          playbackSpeed: Number(older.playbackSpeed) || 1,
          stageDurationSeconds: normalizeStageDuration(older.stageDurationSeconds),
        };
      }
      const oldest = JSON.parse(localStorage.getItem(OLDEST_STORAGE_KEY) || "null");
      if (oldest?.version === 3 && Array.isArray(oldest.machines)) {
        return {
          machines: loadSceneAwareMachines(oldest, true),
          processPointers: {},
          processPointersInitialized: false,
          processConnections: {},
          processConnectionsInitialized: false,
          stages: normalizeStages(defaultStages),
          floor: normalizeFloor(oldest.floor),
          columnGrid: normalizeColumnGrid(oldest.columnGrid),
          hiddenColumns: Array.isArray(oldest.hiddenColumns) ? oldest.hiddenColumns : [],
          hiddenColumnKeys: Array.isArray(oldest.hiddenColumnKeys) ? oldest.hiddenColumnKeys : [],
          columnOverrides: normalizeColumnOverrides(oldest.columnOverrides),
          walls: { ...defaultWalls, ...(oldest.walls || {}) },
          wallGeometry: normalizeWallGeometry(oldest.wallGeometry),
          paint: normalizePaintSettings(oldest.paint),
          roof: normalizeRoofSettings(oldest.roof),
          playbackSpeed: 1,
          stageDurationSeconds: 5,
        };
      }
    } catch (error) {
      console.warn("Saved layout could not be loaded.", error);
    }
    return {
      machines: defaultSceneMachines(),
      processPointers: {},
      processPointersInitialized: false,
      processConnections: {},
      processConnectionsInitialized: false,
      stages: normalizeStages(defaultStages),
      floor: normalizeFloor(defaultFloor),
      columnGrid: normalizeColumnGrid(defaultColumnGrid),
      hiddenColumns: [],
      hiddenColumnKeys: [],
      columnOverrides: {},
      walls: { ...defaultWalls },
      wallGeometry: normalizeWallGeometry(defaultWallGeometry),
      paint: normalizePaintSettings(defaultPaintSettings),
      roof: normalizeRoofSettings(defaultRoofSettings),
      playbackSpeed: 1,
      stageDurationSeconds: 5,
    };
  }

  const savedLayout = loadLayout();
  let stages = savedLayout.stages;
  let machines = savedLayout.machines;
  const initialProcessPointers = normalizeProcessPointerAssignments(savedLayout.processPointers, machines, {
    fillDefaults: savedLayout.processPointersInitialized !== true,
  });
  const initialProcessConnections = normalizeProcessConnections(savedLayout.processConnections, initialProcessPointers, machines, {
    fillDefaults: savedLayout.processConnectionsInitialized !== true,
  });
  // v0.10.2 automatically suppressed a child animation when it matched its
  // parent. Preserve that visual behavior once, then store an explicit choice
  // that the user can change from the active-member animation controls.
  machines.forEach((machine) => {
    if (machine.motionParentId && !machine.playOwnAnimationWasExplicit) {
      const parent = machines.find((item) => item.instanceId === machine.motionParentId);
      machine.playOwnAnimation = parent ? !animationSettingsMatch(machine, parent) : true;
    }
    delete machine.playOwnAnimationWasExplicit;
  });
  let floor = savedLayout.floor;
  let columnGrid = normalizeColumnGrid(savedLayout.columnGrid);
  columnOverrides = normalizeColumnOverrides(savedLayout.columnOverrides);
  designLibrary = loadDesignLibrary();
  function prepareLayoutDesignLibrary() {
    const activeDesigns = {};
    machines.forEach((machine) => {
      if (machine.designId && designLibrary[machine.designId]) activeDesigns[machine.designId] = designLibrary[machine.designId];
    });
    window.plantGeometryPrep?.prepareLibrary(activeDesigns);
  }
  prepareLayoutDesignLibrary();

  const OVERVIEW_CAMERA = Object.freeze({
    yaw: -0.72,
    pitch: 0.52,
    zoom: 1.18,
    panX: 0,
    panZ: 0,
  });

  // v0.13.39 comparison mode: all normal machine labels are rendered as
  // depth-tested world-space billboards inside the WebGL scene. The previous
  // canvas/screen-space label layer is intentionally disabled so the two
  // systems cannot be mistaken for one another during review.
  const WORLD_MACHINE_LABELS = true;
  const SCREEN_SPACE_LABELS = false;

  const state = {
    yaw: OVERVIEW_CAMERA.yaw,
    pitch: OVERVIEW_CAMERA.pitch,
    zoom: OVERVIEW_CAMERA.zoom,
    cameraMode: "orbit",
    walkSpeed: 15,
    walkEyeHeight: 5.5,
    walkFov: 72,
    walkSensitivity: 0.0022,
    walkRadius: 1.2,
    walkCollision: true,
    walkHeadBob: true,
    walkVerticalOffset: 0,
    walkBobOffset: 0,
    panX: 0,
    panZ: 0,
    stage: 0,
    stageFloat: 0,
    dragging: false,
    dragAction: "orbit",
    draggedMachineId: null,
    draggedColumnKey: null,
    dragOffsetX: 0,
    dragOffsetZ: 0,
    pointerX: 0,
    pointerY: 0,
    showCad: false,
    showLabels: true,
    labelMode: "all",
    labelTextMode: "full",
    todayLabelMode: "full",
    processPointers: initialProcessPointers,
    processConnections: initialProcessConnections,
    selectedProcessConnectionKey: "",
    playing: false,
    playAt: 0,
    editing: false,
    editorTool: "machines",
    objectEditorTab: "select",
    editorInteraction: "select",
    snapSize: 0.1,
    spacePressed: false,
    playbackSpeed: savedLayout.playbackSpeed,
    stageDurationSeconds: savedLayout.stageDurationSeconds,
    history: [],
    future: [],
    dragSnapshot: null,
    dragMoved: false,
    selectedMachineId: null,
    selectedMachineIds: new Set(),
    selectedColumnKey: null,
    clipboard: null,
    hiddenColumns: new Set(savedLayout.hiddenColumns),
    hiddenColumnKeys: new Set(savedLayout.hiddenColumnKeys || []),
    walls: savedLayout.walls,
    wallGeometry: normalizeWallGeometry(savedLayout.wallGeometry),
    paint: normalizePaintSettings(savedLayout.paint),
    roof: normalizeRoofSettings(savedLayout.roof),
    previewObjectAnimations: false,
    animationsPaused: false,
    animationPausedAt: 0,
    animationTimeOffset: 0,
    lastFrameTime: 0,
    lastRenderedAt: 0,
    visibleAnimationsActive: false,
  };

  let firstPersonController = null;
  let combatController = null;

  function combatLabelsSuppressed() {
    return combatController?.isActive?.() === true;
  }
  let openFirstPersonOptions = () => {};
  let showWalkthroughInvitation = () => {};
  let walkReturnView = null;
  let walkStartedFullscreen = false;
  const WALK_DRAW_HYSTERESIS = 32;
  const WALK_LOD_HYSTERESIS_RATIO = .12;
  const walkLodHistory = new Map();
  const walkVisibleMachineIds = new Set();
  let walkShadowMachineIds = new Set();

  function resetWalkRenderHistory() {
    walkLodHistory.clear();
    walkVisibleMachineIds.clear();
    walkShadowMachineIds = new Set();
  }

  function refreshDesignLibrary() {
    designLibrary = loadDesignLibrary();
    prepareLayoutDesignLibrary();
    // Collision envelopes live in the design library, not on the placed
    // machine. Rebuild the first-person index even when the machine's outer
    // dimensions did not change; otherwise newly added compound boxes can be
    // rendered correctly while walking still uses the previous cached shape.
    invalidateWalkSpatialIndex();
    resetWalkRenderHistory();
    let changed = false;
    machines.forEach((machine) => {
      const design = machine.designId ? designLibrary[machine.designId] : null;
      if (!design) return;
      changed = syncMachineNameToDesign(machine, design) || changed;
      if (design.custom === true || normalizedDesignScaleMode(machine.designScaleMode) === "match") {
        changed = syncMachineDimensionsToDesign(machine, design) || changed;
      }
    });
    if (changed) persistLayout();
    else renderPerformance.invalidate?.("design-library-refresh");
  }

  function refreshMachineDesignAssignments() {
    try {
      const external = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (external?.version !== 6 || !Array.isArray(external.machines)) return false;
      const externalById = new Map(external.machines.map((machine) => [machine.instanceId, machine]));
      let changed = false;
      const localIds = new Set(machines.map((machine) => machine.instanceId));
      external.machines.forEach((incoming, index) => {
        if (!incoming?.instanceId || localIds.has(incoming.instanceId)) return;
        machines.push(normalizeMachine(incoming, machines.length + index));
        localIds.add(incoming.instanceId);
        changed = true;
      });
      machines.forEach((machine) => {
        const incoming = externalById.get(machine.instanceId);
        if (!incoming) return;
        const synchronizedFields = [
          "name", "short", "type", "x", "y", "z", "w", "d", "h",
          "naturalW", "naturalD", "naturalH", "scaleXPercent", "scaleYPercent", "scaleZPercent", "scaleEditMode",
          "rotationX", "rotationY", "rotationZ", "rotation", "color", "visible", "locked", "showLabel", "useDesignName",
          "labelUseMachineName", "labelText", "labelAbbreviation", "labelTextColor", "labelBackgroundColor", "labelSizePercent", "labelFontWeight", "labelUppercase", "labelShowToday",
          "labelReveal", "labelRetire",
          "labelAnchorXPercent", "labelAnchorYPercent", "labelAnchorZPercent", "labelHeightOffset", "labelScreenOffsetX", "labelScreenOffsetY",
          "labelLineColor", "labelLineWidth", "labelLineOpacity", "labelLineStyle", "labelLineShape", "labelLeaderSide", "labelTargetStyle", "labelTargetSize",
          "processPointerVisible", "processPointerText", "processPointerAnchorXPercent", "processPointerAnchorYPercent", "processPointerAnchorZPercent",
          "processPointerLabelOffset", "processPointerScreenOffsetX", "processPointerScreenOffsetY", "processPointerColor",
          "processPointerWidth", "processPointerOpacity", "processPointerStyle", "processPointerShape",
          "processPointerLeaderSide", "processPointerEndStyle", "processPointerEndSize",
        ];
        synchronizedFields.forEach((field) => {
          if (incoming[field] !== undefined && String(machine[field] ?? "") !== String(incoming[field] ?? "")) {
            machine[field] = incoming[field];
            changed = true;
          }
        });
        const synchronizedRotationY = Number(machine.rotationY ?? machine.rotation) || 0;
        if (Number(machine.rotation) !== synchronizedRotationY || Number(machine.rotationY) !== synchronizedRotationY) {
          machine.rotationY = synchronizedRotationY;
          machine.rotation = synchronizedRotationY;
          changed = true;
        }
        const nextDesignId = incoming.designId || "";
        const nextScaleMode = normalizedDesignScaleMode(incoming.designScaleMode);
        if ((machine.designId || "") !== nextDesignId) {
          machine.designId = nextDesignId;
          changed = true;
        }
        if (machine.designScaleMode !== nextScaleMode) {
          machine.designScaleMode = nextScaleMode;
          changed = true;
        }
        if (nextDesignId && designLibrary[nextDesignId]
          && (designLibrary[nextDesignId].custom === true || nextScaleMode === "match")) {
          changed = syncMachineDimensionsToDesign(machine, designLibrary[nextDesignId]) || changed;
        } else refreshMachineScaleMetadata(machine);
      });
      if (changed) {
        invalidateWalkSpatialIndex();
        updateEditorPanel();
        renderPerformance.invalidate?.();
      }
      return changed;
    } catch (error) {
      console.warn("External machine assignments could not be refreshed.", error);
      return false;
    }
  }

  function refreshExternalProjectChanges() {
    refreshDesignLibrary();
    refreshMachineDesignAssignments();
  }

  const colors = {
    shell: "#a6aaa7",
    finished: "#e9e7df",
    floor: "#aeb4b1",
    yellow: "#e3ad28",
    steel: "#596365",
    orange: "#dd6735",
    teal: "#1e7b78",
    blue: "#5689a5",
    glass: "#8fc6d4",
    dark: "#303b40",
    office: "#d8d2c5",
    utility: "#2f7771",
  };

  const VISUAL_COLOR_PRESETS = {
    "plant-teal": { name: "Plant teal", accent: "#52b7aa", background: "#132126", text: "#ffffff" },
    "glass-blue": { name: "Glass blue", accent: "#65b8d4", background: "#10202a", text: "#ffffff" },
    "process-blue": { name: "Process blue", accent: "#5b8def", background: "#111827", text: "#ffffff" },
    "process-green": { name: "Process green", accent: "#62c782", background: "#102019", text: "#ffffff" },
    amber: { name: "Amber", accent: "#e6b84a", background: "#241d10", text: "#ffffff" },
    orange: { name: "Orange", accent: "#e8864c", background: "#24170f", text: "#ffffff" },
    red: { name: "Alert red", accent: "#e66a73", background: "#251316", text: "#ffffff" },
    purple: { name: "Purple", accent: "#9b82df", background: "#1c1728", text: "#ffffff" },
    steel: { name: "Steel", accent: "#9aa7ad", background: "#171d20", text: "#ffffff" },
  };

  function matchingLabelColorPreset(machine) {
    if (!machine) return "custom";
    const textColor = String(machine.labelTextColor || "").toLowerCase();
    const backgroundColor = String(machine.labelBackgroundColor || "").toLowerCase();
    const accentColor = String(machine.labelLineColor || "").toLowerCase();
    const match = Object.entries(VISUAL_COLOR_PRESETS).find(([, preset]) => (
      preset.text.toLowerCase() === textColor &&
      preset.background.toLowerCase() === backgroundColor &&
      preset.accent.toLowerCase() === accentColor
    ));
    return match?.[0] || "custom";
  }

  function matchingProcessColorPreset(connection) {
    if (!connection) return "custom";
    const color = String(connection.color || "").toLowerCase();
    const match = Object.entries(VISUAL_COLOR_PRESETS).find(([, preset]) => preset.accent.toLowerCase() === color);
    return match?.[0] || "custom";
  }

  function snapshotLayout() {
    return {
      machines: clone(machines),
      processPointers: clone(state.processPointers),
      processConnections: clone(state.processConnections),
      stages: clone(stages),
      floor: clone(floor),
      columnGrid: clone(columnGrid),
      hiddenColumns: [...state.hiddenColumns],
      hiddenColumnKeys: [...state.hiddenColumnKeys],
      columnOverrides: clone(columnOverrides),
      walls: clone(state.walls),
      wallGeometry: clone(state.wallGeometry),
      paint: clone(state.paint),
      roof: clone(state.roof),
      playbackSpeed: state.playbackSpeed,
      stageDurationSeconds: state.stageDurationSeconds,
    };
  }

  function pushHistory(snapshot = snapshotLayout()) {
    state.history.push(snapshot);
    if (state.history.length > 60) state.history.shift();
    state.future.length = 0;
    updateHistoryButtons();
  }

  function restoreSnapshot(snapshot) {
    machines = normalizeMachines(snapshot.machines || []);
    state.processPointers = normalizeProcessPointerAssignments(snapshot.processPointers, machines);
    state.processConnections = normalizeProcessConnections(snapshot.processConnections, state.processPointers, machines, {
      fillDefaults: snapshot.processConnections === undefined,
    });
    state.selectedProcessConnectionKey = "";
    stages = normalizeStages(snapshot.stages);
    floor = normalizeFloor(snapshot.floor);
    columnGrid = normalizeColumnGrid(snapshot.columnGrid);
    state.hiddenColumns = new Set(snapshot.hiddenColumns || []);
    state.hiddenColumnKeys = new Set(snapshot.hiddenColumnKeys || []);
    columnOverrides = normalizeColumnOverrides(snapshot.columnOverrides);
    columnOverridesRevision += 1;
    invalidateStructuralColumns();
    state.walls = { ...defaultWalls, ...(snapshot.walls || {}) };
    state.wallGeometry = normalizeWallGeometry(snapshot.wallGeometry);
    state.paint = normalizePaintSettings(snapshot.paint);
    state.roof = normalizeRoofSettings(snapshot.roof);
    state.playbackSpeed = Number(snapshot.playbackSpeed) || 1;
    state.stageDurationSeconds = normalizeStageDuration(snapshot.stageDurationSeconds);
    state.stage = clamp(state.stage, 0, stages.length - 1);
    state.stageFloat = state.stage;
    const availableIds = new Set(machines.map((item) => item.instanceId));
    state.selectedMachineIds = new Set([...state.selectedMachineIds].filter((id) => availableIds.has(id)));
    state.selectedMachineId = availableIds.has(state.selectedMachineId)
      ? state.selectedMachineId
      : [...state.selectedMachineIds].at(-1) || null;
    if (state.selectedMachineId) state.selectedMachineIds.add(state.selectedMachineId);
    buildTimeline();
    setStage(state.stage);
    updateEditorPanel();
    persistLayout();
  }

  function undoLayout() {
    const snapshot = state.history.pop();
    if (!snapshot) return;
    state.future.push(snapshotLayout());
    restoreSnapshot(snapshot);
    showToast("Undid the last layout change.");
    updateHistoryButtons();
  }

  function redoLayout() {
    const snapshot = state.future.pop();
    if (!snapshot) return;
    state.history.push(snapshotLayout());
    restoreSnapshot(snapshot);
    showToast("Restored the layout change.");
    updateHistoryButtons();
  }

  function persistLayout() {
    invalidateWalkSpatialIndex();
    state.processPointers = normalizeProcessPointerAssignments(state.processPointers, machines);
    state.processConnections = normalizeProcessConnections(state.processConnections, state.processPointers, machines);
    try {
      const previous = localStorage.getItem(STORAGE_KEY);
      if (previous) localStorage.setItem(BACKUP_STORAGE_KEY, previous);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 6,
        appVersion: APP_VERSION,
        updatedAt: new Date().toISOString(),
        sceneAnimationsInitialized: true,
        floorFeaturesInitialized: true,
        machines,
        processPointers: state.processPointers,
        processPointersInitialized: true,
        processConnections: state.processConnections,
        processConnectionsInitialized: true,
        stages,
        floor,
        columnGrid,
        hiddenColumns: [...state.hiddenColumns],
        hiddenColumnKeys: [...state.hiddenColumnKeys],
        columnOverrides,
        walls: state.walls,
        wallGeometry: state.wallGeometry,
        paint: state.paint,
        roof: state.roof,
        playbackSpeed: state.playbackSpeed,
        stageDurationSeconds: state.stageDurationSeconds,
      }));
      window.PLANT_SHARED_WORKSPACE?.schedulePublish?.();
      try { syncChannel?.postMessage({ source: "plant-layout", type: "layout-updated", at: Date.now() }); } catch (error) { console.warn("Layout update could not be broadcast.", error); }
    } catch (error) {
      console.warn("Layout changes could not be saved to browser storage.", error);
    }
    // Static scenes render only when invalidated. Every persisted editor change
    // can alter the machine envelope, linked design placement, labels, stages,
    // or structure, so make the saved result visible immediately instead of
    // waiting for a later camera movement or animation frame.
    renderPerformance.invalidate();
  }

  function refreshLayoutLabels({ resetCustom = false } = {}) {
    designLibrary = loadDesignLibrary();
    let renamedMachines = 0;
    let refreshedLabels = 0;
    machines.forEach((machine) => {
      const design = machine.designId ? designLibrary[machine.designId] : null;
      if (design && syncMachineNameToDesign(machine, design)) renamedMachines += 1;
      if (resetCustom || machine.labelUseMachineName !== false) {
        if (machine.labelUseMachineName === false || machine.labelText) refreshedLabels += 1;
        machine.labelUseMachineName = true;
        machine.labelText = "";
      }
      if (resetCustom) machine.labelAbbreviation = "";
    });
    persistLayout();
    renderPerformance.invalidate();
    return { renamedMachines, refreshedLabels };
  }

  function normalizeSelection() {
    const availableIds = new Set(machines.map((machine) => machine.instanceId));
    state.selectedMachineIds = new Set([...state.selectedMachineIds].filter((id) => availableIds.has(id)));
    if (state.selectedMachineId && availableIds.has(state.selectedMachineId)) {
      state.selectedMachineIds.add(state.selectedMachineId);
    } else {
      state.selectedMachineId = [...state.selectedMachineIds].at(-1) || null;
    }
  }

  function selectedMachine() {
    normalizeSelection();
    return machines.find((machine) => machine.instanceId === state.selectedMachineId) || null;
  }
  function selectedMachines() {
    normalizeSelection();
    return machines.filter((machine) => state.selectedMachineIds.has(machine.instanceId));
  }

  function machineById(instanceId) {
    return machines.find((machine) => machine.instanceId === instanceId) || null;
  }

  function processPointerKeyForMachine(machine) {
    if (!machine?.instanceId) return "";
    return PROCESS_POINTER_FLOW_DEFINITIONS.find(({ key }) => state.processPointers?.[key] === machine.instanceId)?.key || "";
  }

  function assignProcessPointerToMachine(key, machine) {
    if (!machine?.instanceId) return { key: "", previousKey: "", displacedMachine: null };
    const normalizedKey = processPointerFlowDefinition(key)?.key || "";
    const previousKey = processPointerKeyForMachine(machine);
    Object.entries(state.processPointers || {}).forEach(([flowKey, instanceId]) => {
      if (instanceId === machine.instanceId) delete state.processPointers[flowKey];
    });
    let displacedMachine = null;
    if (normalizedKey) {
      const previousTargetId = state.processPointers[normalizedKey];
      if (previousTargetId && previousTargetId !== machine.instanceId) displacedMachine = machineById(previousTargetId);
      state.processPointers[normalizedKey] = machine.instanceId;
    }
    return { key: normalizedKey, previousKey, displacedMachine };
  }

  function processConnectionObjectName(instanceId) {
    const item = machineById(instanceId);
    return item?.name || item?.short || "Missing object";
  }

  function processConnectionEndpointRole(connection, endpoint) {
    if (!connection) return "";
    const isTarget = endpoint === "target";
    const roleKey = isTarget ? connection.toKey : connection.fromKey;
    const instanceId = isTarget ? connection.targetId : connection.sourceId;
    if (roleKey && state.processPointers?.[roleKey] === instanceId) return roleKey;
    return processConnectionRoleForObject(instanceId);
  }

  function processConnectionEndpointText(connection, endpoint) {
    const isTarget = endpoint === "target";
    const instanceId = isTarget ? connection?.targetId : connection?.sourceId;
    const roleKey = processConnectionEndpointRole(connection, endpoint);
    return processPointerFlowDefinition(roleKey)?.text || processConnectionObjectName(instanceId);
  }

  function processConnectionObjectOptionLabel(machine) {
    if (!machine) return "Object";
    const typeLabel = TYPE_LABEL_FALLBACKS[machine.type] || String(machine.type || "Object").replace(/([a-z])([A-Z])/g, "$1 $2");
    return `${machine.name || machine.short || typeLabel} · ${typeLabel}`;
  }

  function processConnectionObjectOptions() {
    return [...machines]
      .filter((machine) => machine?.instanceId)
      .sort((first, second) => processConnectionObjectOptionLabel(first).localeCompare(processConnectionObjectOptionLabel(second)));
  }

  function allProcessConnectionEntries() {
    return Object.entries(state.processConnections || {})
      .map(([key, connection]) => ({ key, connection }))
      .filter(({ connection }) => connection?.sourceId && connection?.targetId && machineById(connection.sourceId) && machineById(connection.targetId))
      .sort((first, second) => processConnectionDisplayName(first.connection).localeCompare(processConnectionDisplayName(second.connection)));
  }

  function processConnectionEntriesForNode(nodeKey) {
    const instanceId = state.processPointers?.[nodeKey];
    if (!instanceId) return [];
    return allProcessConnectionEntries()
      .filter(({ connection }) => connection.sourceId === instanceId || connection.targetId === instanceId)
      .map(({ key, connection }) => ({
        key,
        connection,
        outgoing: connection.sourceId === instanceId,
        otherKey: connection.sourceId === instanceId ? processConnectionEndpointRole(connection, "target") : processConnectionEndpointRole(connection, "source"),
      }));
  }

  function processNodeMachineName(nodeKey) {
    const machine = machineById(state.processPointers?.[nodeKey]);
    return machine?.name || "Unassigned machine";
  }

  function processConnectionDisplayName(connection, { includeMachines = false } = {}) {
    if (!connection) return "Process connection";
    const sourceName = processConnectionObjectName(connection.sourceId);
    const targetName = processConnectionObjectName(connection.targetId);
    const fromText = processConnectionEndpointText(connection, "source");
    const toText = processConnectionEndpointText(connection, "target");
    if (!includeMachines || (fromText === sourceName && toText === targetName)) return `${sourceName} → ${targetName}`;
    return `${fromText} · ${sourceName} → ${toText} · ${targetName}`;
  }

  function selectedProcessConnection() {
    const entries = allProcessConnectionEntries();
    if (!entries.length) {
      state.selectedProcessConnectionKey = "";
      return null;
    }
    const current = entries.find((entry) => entry.key === state.selectedProcessConnectionKey) || entries[0];
    state.selectedProcessConnectionKey = current.key;
    return current.connection;
  }

  function retargetProcessConnection(connection, sourceId, targetId) {
    if (!connection || !sourceId || !targetId || sourceId === targetId || !machineById(sourceId) || !machineById(targetId)) return null;
    const nextKey = processConnectionKey(sourceId, targetId);
    if (nextKey !== connection.key && state.processConnections[nextKey]) return null;
    const previousKey = connection.key;
    const next = normalizeProcessConnection({
      ...connection,
      sourceId,
      targetId,
      fromKey: processConnectionRoleForObject(sourceId),
      toKey: processConnectionRoleForObject(targetId),
    }, sourceId, targetId);
    if (previousKey !== nextKey) delete state.processConnections[previousKey];
    state.processConnections[nextKey] = next;
    state.selectedProcessConnectionKey = nextKey;
    return next;
  }

  function applyProcessConnectionField(connection, field, rawValue) {
    if (!connection || !field) return false;
    if (field === "tagText") {
      connection.tagText = String(rawValue ?? "").trim().slice(0, 120);
      return true;
    }
    if (field === "color") {
      if (!/^#[0-9a-f]{6}$/i.test(String(rawValue || ""))) return false;
      connection.color = String(rawValue);
      return true;
    }
    if (field === "style") {
      connection.style = ["solid", "dashed", "dotted"].includes(rawValue) ? rawValue : "solid";
      return true;
    }
    if (field === "shape") {
      connection.shape = ["straight", "elbow"].includes(rawValue) ? rawValue : "straight";
      return true;
    }
    if (field === "endStyle") {
      connection.endStyle = ["arrow", "dot", "ring", "none"].includes(rawValue) ? rawValue : "arrow";
      return true;
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return false;
    const ranges = {
      startAnchorXPercent: [PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT],
      startAnchorYPercent: [PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT],
      startAnchorZPercent: [PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT],
      endAnchorXPercent: [PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT],
      endAnchorYPercent: [PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT],
      endAnchorZPercent: [PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT],
      flowTurn1Progress: [0, 100], flowTurn1Offset: [-500, 500],
      flowTurn2Progress: [0, 100], flowTurn2Offset: [-500, 500],
      flowCurvePercent: [0, 100], flowFloorHeight: [0.02, 30],
      flowSpeed: [0, 180], flowGlow: [0, 200],
      tagLift: [0, 60], tagScreenOffsetX: [-500, 500], tagScreenOffsetY: [-500, 500],
      width: [.5, 12], opacity: [5, 100], endSize: [1, 14],
    };
    if (!ranges[field]) return false;
    const [min, max] = ranges[field];
    connection[field] = clamp(value, min, max);
    return true;
  }

  function animationGroupMembers(groupId) {
    if (!groupId) return [];
    return machines.filter((machine) => machine.animationGroupId === groupId);
  }

  function motionChildren(instanceId) {
    if (!instanceId) return [];
    return machines.filter((machine) => machine.motionParentId === instanceId);
  }

  function motionRoot(machine) {
    if (!machine) return null;
    let current = machine;
    const visited = new Set([current.instanceId]);
    while (current.motionParentId) {
      const parent = machineById(current.motionParentId);
      if (!parent || visited.has(parent.instanceId)) break;
      visited.add(parent.instanceId);
      current = parent;
    }
    return current;
  }

  function motionDescendants(instanceId, visited = new Set()) {
    if (!instanceId || visited.has(instanceId)) return [];
    visited.add(instanceId);
    const result = [];
    motionChildren(instanceId).forEach((child) => {
      if (visited.has(child.instanceId)) return;
      result.push(child, ...motionDescendants(child.instanceId, visited));
    });
    return result;
  }

  function motionAssemblyMembers(machine) {
    if (!machine) return [];
    if (machine.animationGroupId && !machine.motionParentId) {
      const legacyMembers = animationGroupMembers(machine.animationGroupId);
      if (legacyMembers.length > 1) return legacyMembers;
    }
    const root = motionRoot(machine);
    return root ? [root, ...motionDescendants(root.instanceId)] : [machine];
  }

  function selectionIdsForObject(instanceId) {
    const machine = machineById(instanceId);
    return motionAssemblyMembers(machine).map((item) => item.instanceId);
  }

  function commitActiveLayoutEditorEdit() {
    const active = document.activeElement;
    if (!active || typeof active.matches !== "function" || !active.closest?.(".layout-editor")) return;
    if (!active.matches("input, select, textarea")) return;
    // Preserve the object that owned the field until its pending change has
    // committed. Otherwise clicking a second object can feed the first
    // object's coordinates into the newly selected object.
    active.blur();
  }

  function setSingleSelection(instanceId) {
    commitActiveLayoutEditorEdit();
    const ids = selectionIdsForObject(instanceId);
    state.selectedMachineId = instanceId || null;
    state.selectedMachineIds = new Set(ids);
  }

  function toggleMachineSelection(instanceId) {
    if (!instanceId) return;
    commitActiveLayoutEditorEdit();
    const ids = selectionIdsForObject(instanceId);
    const removing = ids.every((id) => state.selectedMachineIds.has(id));
    ids.forEach((id) => {
      if (removing) state.selectedMachineIds.delete(id);
      else state.selectedMachineIds.add(id);
    });
    if (removing && ids.includes(state.selectedMachineId)) {
      state.selectedMachineId = [...state.selectedMachineIds].at(-1) || null;
    } else if (!removing) {
      state.selectedMachineId = instanceId;
    }
  }

  function clearMachineSelection() {
    commitActiveLayoutEditorEdit();
    state.selectedMachineId = null;
    state.selectedMachineIds.clear();
  }

  function joinSelectedAnimationObjects() {
    const selection = selectedMachines();
    if (selection.length < 2) {
      showToast("Select at least two objects to create an attached motion assembly.");
      return;
    }
    const picker = document.querySelector("[data-motion-parent-picker]");
    const parentId = picker?.value || state.selectedMachineId || selection.at(-1)?.instanceId;
    const parent = selection.find((machine) => machine.instanceId === parentId);
    if (!parent) {
      showToast("Choose which selected object should carry the other objects.");
      return;
    }
    pushHistory();
    const selectedIds = new Set(selection.map((machine) => machine.instanceId));
    // Detach the chosen parent from any selected ancestor first. This allows a
    // hierarchy to be re-rooted without creating a cycle.
    parent.motionParentId = "";
    selection.forEach((machine) => { machine.animationGroupId = ""; });
    // Attach only the roots of the other selected assemblies. Existing child
    // relationships below those roots stay intact, which makes nested chains
    // such as bridge -> trolley -> tool head possible through the UI.
    const rootsToAttach = selection.filter((machine) => (
      machine.instanceId !== parent.instanceId &&
      (!machine.motionParentId || !selectedIds.has(machine.motionParentId))
    ));
    rootsToAttach.forEach((machine) => {
      machine.motionParentId = parent.instanceId;
      machine.playOwnAnimation = !animationSettingsMatch(machine, parent);
    });
    parent.playOwnAnimation = true;
    state.selectedMachineIds = new Set([parent, ...motionDescendants(parent.instanceId)].map((machine) => machine.instanceId));
    state.selectedMachineId = parent.instanceId;
    persistLayout();
    updateEditorPanel();
    showToast(`${parent.name} is now the motion parent. Attached objects inherit its animation and keep their own animation.`);
  }

  function unjoinSelectedAnimationObjects() {
    const selection = selectedMachines();
    const legacyGroups = new Set(selection.map((machine) => machine.animationGroupId).filter(Boolean));
    const hasHierarchy = selection.some((machine) => machine.motionParentId || motionChildren(machine.instanceId).length);
    if (!legacyGroups.size && !hasHierarchy) {
      showToast("The current selection is not part of an attached motion assembly.");
      return;
    }
    pushHistory();
    const selectionIds = new Set(selection.map((machine) => machine.instanceId));
    machines.forEach((machine) => {
      if (selectionIds.has(machine.instanceId)) machine.motionParentId = "";
      if (legacyGroups.has(machine.animationGroupId)) machine.animationGroupId = "";
    });
    persistLayout();
    updateEditorPanel();
    showToast("Motion assembly separated. Every object keeps its individual animation settings.");
  }

  function collisionCandidates() {
    return machines.filter((machine) => (
      machine.visible !== false &&
      machine.collisionMode === "solid" &&
      stageAlpha(machine.reveal, machine.retire) > 0.08
    ));
  }

  function machineHasWalkHitbox(machine) {
    if (!machine || machine.visible === false) return false;
    // The layout editor's collisionMode controls placement/overlap warnings.
    // Physical plant objects keep their envelope as a first-person hitbox even
    // when those warnings are disabled. Open crane frames, people, animated
    // indicators, and floor markings intentionally remain walk-through.
    if (isFloorFeatureType(machine.type)) return false;
    // Standalone animation markers stay walk-through. A custom Designer
    // machine can legitimately use an animatedBox/animatedCart type while also
    // owning explicit hitboxes; do not discard the whole machine before those
    // envelopes are evaluated.
    if (isAnimationType(machine.type) && !(machine.designId && designLibrary[machine.designId])) return false;
    if (machine.type === "person") return false;
    if (["bridgeCrane", "craneMachine"].includes(machine.type)) {
      const design = machine.designId ? designLibrary[machine.designId] : null;
      // Open crane structures remain walk-through unless the Designer has real
      // envelopes. Once pillar/post envelopes are authored, those boxes become
      // authoritative for first-person, bullets, and enemy pathing.
      if (!designCollisionEnvelopes(design).length) return false;
    }
    return stageAlpha(machine.reveal, machine.retire) > 0.08;
  }

  function walkCollisionCandidates() {
    return machines.filter(machineHasWalkHitbox);
  }

  function designCollisionEnvelopes(design) {
    const shapedEnvelopes = Array.isArray(design?.collisionEnvelopes)
      ? design.collisionEnvelopes.filter((envelope) => envelope && typeof envelope === "object")
      : [];
    // Machine-level boxes and blue part-level boxes are additive. Returning
    // early here used to make every component envelope disappear from walking
    // collision as soon as one custom machine envelope was added. The outlines
    // still rendered in the Designer, which made the failure especially hard
    // to diagnose on compound machines such as the tempering line.
    const envelopes = [...shapedEnvelopes];
    const visit = (component) => {
      if (!component || component.visible === false) return;
      if (component.collisionEnvelope && typeof component.collisionEnvelope === "object") {
        envelopes.push(component.collisionEnvelope);
      }
      if (component.type === "group") (component.children || []).forEach(visit);
    };
    (design?.components || []).forEach(visit);
    return envelopes;
  }

  function walkHitboxesForMachine(machine) {
    const design = machine.designId ? designLibrary[machine.designId] : null;
    let envelopes = designCollisionEnvelopes(design);
    if (!design) return [machine];
    const identity = `${machine.type || ""} ${machine.name || ""} ${design.machineType || ""} ${design.name || ""}`;
    if (/cutting/i.test(identity)) {
      // Cutting-table base footprints are additive to saved custom envelopes while preserving the service gap between the tables.
      // Previously this fallback only ran when the design had zero envelopes,
      // so one unrelated/incomplete blue envelope made the table itself walk-through.
      const cuttingBaseEnvelopes = flattenDesignComponents(design.components || []).filter((component) => (
        component?.type === "box" && /(?:cutting table base|operator console|left-base|right-base|console)/i.test(`${component.name || ""} ${component.id || ""}`)
      )).map((component) => ({ x:component.x, y:component.y, z:component.z, w:component.w, h:component.h, d:component.d, automatic:true, cuttingBase:true }));
      envelopes = [...envelopes, ...cuttingBaseEnvelopes];
      if (!cuttingBaseEnvelopes.length && design.base) {
        envelopes.push({ x:0,y:0,z:0,w:Number(design.base.w)||Number(machine.w),h:Number(design.base.h)||Number(machine.h),d:Number(design.base.d)||Number(machine.d),automatic:true,cuttingBase:true });
      }
    }
    if (!envelopes.length) return [machine];
    const placement = designPlacement(machine, design);
    const hitboxes = envelopes.map((envelope) => {
      const width = Math.max(.01, (Number(envelope.w) || .01) * placement.scaleX);
      const height = Math.max(.01, (Number(envelope.h) || .01) * placement.scaleY);
      const depth = Math.max(.01, (Number(envelope.d) || .01) * placement.scaleZ);
      const center = designLocalPointToWorld(machine, design, [
        Number(envelope.x) + Number(envelope.w) / 2,
        Number(envelope.y) + Number(envelope.h) / 2,
        Number(envelope.z) + Number(envelope.d) / 2,
      ]);
      return {
        x: center[0] - width / 2,
        y: center[1] - height / 2,
        z: center[2] - depth / 2,
        w: width,
        h: height,
        d: depth,
        rotationY: Number(machine.rotationY ?? machine.rotation) || 0,
        rotation: Number(machine.rotationY ?? machine.rotation) || 0,
        // Every explicit Designer envelope is a walk-around footprint. Its Y
        // dimension remains useful for editing and visualization, but walking
        // collision is intentionally floor-plan based so a raised or offset
        // blue part envelope cannot silently become pass-through.
        floorBlocking: true,
      };
    });
    const designIdentity = `${machine.type || ""} ${machine.name || ""} ${design.machineType || ""} ${design.name || ""}`;
    if (/temper|furnace/i.test(designIdentity)) {
      // The tempering line is a long compound/animated assembly. Its primary
      // design envelope is the final safety net around the complete line, while
      // detailed boxes refine individual sections. This also protects older
      // saved designs whose nested envelope metadata is incomplete.
      hitboxes.unshift({ ...machine, floorBlocking: true, walkHitboxSource: "tempering-base" });
    }
    return hitboxes;
  }

  let walkSpatialIndex = null;
  let walkSpatialDirty = true;
  let machineSpatialIndex = null;
  let machineSpatialDirty = true;

  function invalidateWalkSpatialIndex() {
    walkSpatialDirty = true;
    machineSpatialDirty = true;
  }

  function currentMachineSpatialIndex() {
    if (!machineSpatialDirty && machineSpatialIndex) return machineSpatialIndex;
    const items = machines.map((machine) => {
      const radius = Math.hypot(Math.max(.01, Number(machine.w) || .01), Math.max(.01, Number(machine.d) || .01)) / 2;
      const centerX = Number(machine.x) + Number(machine.w) / 2;
      const centerZ = Number(machine.z) + Number(machine.d) / 2;
      return { machine, x: centerX - radius, z: centerZ - radius, w: radius * 2, d: radius * 2 };
    });
    machineSpatialIndex = window.createPlantSpatialIndex?.({ cellSize: 80 }) || null;
    machineSpatialIndex?.setItems(items);
    machineSpatialDirty = false;
    return machineSpatialIndex;
  }

  function currentWalkSpatialIndex() {
    if (!walkSpatialDirty && walkSpatialIndex) return walkSpatialIndex;
    const entries = [];
    structuralColumns().forEach((column) => {
      if (isColumnHidden(column)) return;
      entries.push({ kind: "column", column, x: column.x - 1.18, z: column.z - 1.18, w: 2.36, d: 2.36 });
    });
    displayedWallSections().forEach((wall) => {
      if (state.walls[wall.id] === false) return;
      entries.push({ kind: "wall", wall, x: wall.x, z: wall.z, w: wall.w, d: wall.d });
    });
    walkCollisionCandidates().forEach((machine) => {
      walkHitboxesForMachine(machine).forEach((hitbox) => {
        const angle = angleRadians(hitbox);
        const halfWidth = Math.max(.05, Number(hitbox.w) / 2);
        const halfDepth = Math.max(.05, Number(hitbox.d) / 2);
        const extentX = Math.abs(Math.cos(angle)) * halfWidth + Math.abs(Math.sin(angle)) * halfDepth;
        const extentZ = Math.abs(Math.sin(angle)) * halfWidth + Math.abs(Math.cos(angle)) * halfDepth;
        const centerX = Number(hitbox.x) + halfWidth;
        const centerZ = Number(hitbox.z) + halfDepth;
        entries.push({ kind: "machine", machine, hitbox, x: centerX - extentX, z: centerZ - extentZ, w: extentX * 2, d: extentZ * 2 });
      });
    });
    walkSpatialIndex = window.createPlantSpatialIndex?.({ cellSize: 36 }) || null;
    walkSpatialIndex?.setItems(entries);
    walkSpatialDirty = false;
    return walkSpatialIndex;
  }

  function circleIntersectsMachine(worldX, worldZ, radius, machine) {
    const angle = -angleRadians(machine);
    const centerX = Number(machine.x) + Number(machine.w) / 2;
    const centerZ = Number(machine.z) + Number(machine.d) / 2;
    const dx = worldX - centerX;
    const dz = worldZ - centerZ;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const localX = dx * cosine - dz * sine;
    const localZ = dx * sine + dz * cosine;
    const halfWidth = Math.max(0.05, Number(machine.w) / 2);
    const halfDepth = Math.max(0.05, Number(machine.d) / 2);
    const closestX = clamp(localX, -halfWidth, halfWidth);
    const closestZ = clamp(localZ, -halfDepth, halfDepth);
    return Math.hypot(localX - closestX, localZ - closestZ) <= radius;
  }

  function walkHitsStructuralColumn(worldX, worldZ, radius = state.walkRadius) {
    const margin = Math.max(0.45, Number(radius) || 1.2);
    const columnRadius = margin + 1.18;
    const columnRadiusSquared = columnRadius * columnRadius;
    return structuralColumns().some((column) => {
      if (isColumnHidden(column)) return false;
      const dx = worldX - Number(column.x);
      const dz = worldZ - Number(column.z);
      return dx * dx + dz * dz < columnRadiusSquared;
    });
  }

  function walkCanOccupyHard(worldX, worldZ, radius = state.walkRadius) {
    const bounds = floorBounds();
    const margin = Math.max(0.45, Number(radius) || 1.2);
    if (worldX < bounds[0] + margin || worldX > bounds[2] - margin
        || worldZ < bounds[1] + margin || worldZ > bounds[3] - margin) return false;
    return !walkHitsStructuralColumn(worldX, worldZ, margin);
  }

  function walkCanOccupy(worldX, worldZ, radius = state.walkRadius) {
    const bounds = floorBounds();
    const wallMargin = Math.max(0.45, Number(radius) || 1.2);
    if (worldX < bounds[0] + wallMargin || worldX > bounds[2] - wallMargin ||
        worldZ < bounds[1] + wallMargin || worldZ > bounds[3] - wallMargin) return false;

    // Pillars remain solid even if the broad-phase spatial index is stale.
    if (walkHitsStructuralColumn(worldX, worldZ, wallMargin)) return false;

    const index = typeof currentWalkSpatialIndex === "function" ? currentWalkSpatialIndex() : null;
    const nearby = index
      ? index.queryPoint(worldX, worldZ, wallMargin + 2)
      : [
          ...structuralColumns().filter((column) => !isColumnHidden(column)).map((column) => ({ kind: "column", column })),
          ...displayedWallSections().filter((wall) => state.walls[wall.id] !== false).map((wall) => ({ kind: "wall", wall })),
          ...walkCollisionCandidates().flatMap((machine) => walkHitboxesForMachine(machine).map((hitbox) => ({ kind: "machine", machine, hitbox }))),
        ];
    const columnRadius = wallMargin + 1.18;
    const columnRadiusSquared = columnRadius * columnRadius;
    for (const entry of nearby) {
      if (entry.kind === "column") {
        const dx = worldX - entry.column.x;
        const dz = worldZ - entry.column.z;
        if (dx * dx + dz * dz < columnRadiusSquared) return false;
        continue;
      }
      if (entry.kind === "wall") {
        if (circleIntersectsMachine(worldX, worldZ, wallMargin, entry.wall)) return false;
        continue;
      }
      const hitbox = entry.hitbox;
        const baseY = Number(hitbox.y) || 0;
        const height = Number(hitbox.h) || 0;
        if (!hitbox.floorBlocking && (baseY > state.walkEyeHeight + 1 || baseY + height < 0.35)) continue;
        const angle = angleRadians(hitbox);
        const halfWidth = Math.max(.05, Number(hitbox.w) / 2);
        const halfDepth = Math.max(.05, Number(hitbox.d) / 2);
        const worldHalfWidth = Math.abs(Math.cos(angle)) * halfWidth + Math.abs(Math.sin(angle)) * halfDepth;
        const worldHalfDepth = Math.abs(Math.sin(angle)) * halfWidth + Math.abs(Math.cos(angle)) * halfDepth;
        const centerX = Number(hitbox.x) + Number(hitbox.w) / 2;
        const centerZ = Number(hitbox.z) + Number(hitbox.d) / 2;
        if (Math.abs(worldX - centerX) > worldHalfWidth + wallMargin
            || Math.abs(worldZ - centerZ) > worldHalfDepth + wallMargin) continue;
        if (circleIntersectsMachine(worldX, worldZ, wallMargin, hitbox)) return false;
    }
    return true;
  }

  function combatEnemyMachine(machine) {
    const type = String(machine?.type || "").toLowerCase();
    const design = machine?.designId ? designLibrary[machine.designId] : null;
    const designType = String(design?.machineType || "").toLowerCase();
    return type === "person" || type === "animatedperson" || designType === "person";
  }

  function combatBaseEnemyMachines() {
    const stage = Number.isFinite(Number(state.stageFloat)) ? Number(state.stageFloat) : Number(state.stage) || 0;
    return machines.filter((machine) => {
      if (!combatEnemyMachine(machine) || machine.visible === false) return false;
      const reveal = Number.isFinite(Number(machine.reveal)) ? Number(machine.reveal) : 0;
      const retire = Number.isFinite(Number(machine.retire)) ? Number(machine.retire) : 99;
      return reveal <= stage && retire > stage;
    });
  }

  function combatHeadVolume(machine, x = Number(machine?.x), z = Number(machine?.z)) {
    if (!machine) return null;
    const positioned = { ...machine, x:Number(x), z:Number(z) };
    const design = positioned.designId ? designLibrary[positioned.designId] : null;
    const heads = (design?.components || []).filter((component) => /^head$/i.test(String(component?.name || ""))
      && component?.type === "box"
      && ["x","y","z","w","h","d"].every((key) => Number.isFinite(Number(component?.[key]))));
    if (heads.length) {
      heads.sort((first,second) => (Number(second.w)*Number(second.h)*Number(second.d))-(Number(first.w)*Number(first.h)*Number(first.d)));
      const boxSpec = scaledComponentBox(positioned, heads[0], design);
      return {
        center:{ x:Number(boxSpec.x)+Number(boxSpec.w)/2, y:Number(boxSpec.y)+Number(boxSpec.h)/2, z:Number(boxSpec.z)+Number(boxSpec.d)/2 },
        radius:Math.max(.34,Math.min(.78,Math.max(Number(boxSpec.w),Number(boxSpec.h),Number(boxSpec.d))*.48)),
      };
    }
    const height=Math.max(1,Number(positioned.h)||6.5);
    return {
      center:{x:Number(x)+(Number(positioned.w)||1.8)/2,y:(Number(positioned.y)||0)+height*.80,z:Number(z)+(Number(positioned.d)||1.8)/2},
      radius:Math.max(.38,Math.min(height>9?1.7:.66,Math.min(Number(positioned.w)||1.8,Number(positioned.d)||1.8)*.32)),
    };
  }

  function combatGlassComponent(component) {
    if (!component || component.visible === false) return false;
    const name=String(component.name || component.id || "").toLowerCase();
    const opacity=Number(component.opacity ?? 1);
    return component.type === "glassPanel"
      || /glass|window|windshield|cutting surface|observation/.test(name)
      || (opacity < .9 && ["#8fc6d4","#9ed8e6","#a8dce8"].includes(String(component.color || "").toLowerCase()));
  }

  function carrierGlassComponent(machine, component) {
    if (combatGlassComponent(component)) return true;
    const carrier=/^(?:glassRack|aFrame|aFrameTruck|shipping)$/i.test(String(machine?.type || ""));
    if (!carrier || component?.visible === false) return false;
    const name=String(component?.name || component?.id || "").toLowerCase();
    return /(?:lite|sheet|load|pane)/.test(name) && ["box","glassPanel"].includes(component?.type);
  }

  function proceduralGlassShattered(machine, componentId) {
    const machineId=String(machine?.instanceId || machine?.id || machine?.name || "machine");
    return combatController?.isActive?.() && combatController.isGlassShattered?.(machineId,componentId);
  }

  function proceduralCombatGlassOccluders(machine) {
    const type=String(machine?.type || "");
    const specs=[];
    if (type === "glassRack") {
      const count=state.stageFloat >= stages.length-1 ? 5 : 3;
      for(let panel=0;panel<count;panel+=1){
        const offset=2.2+panel*Math.max(1.3,(machine.w-5)/Math.max(1,count-1));
        specs.push({id:`procedural-lite-${panel}`,box:localBox3d(machine,Math.min(offset,machine.w-1),1,.55,Math.max(.5,machine.d-2),Math.max(2,machine.h+4),colors.glass)});
      }
    } else if (type === "aFrame" || type === "aFrameTruck") {
      const panelDepth=Math.max(.3,machine.d*.12);
      specs.push({id:"procedural-glass-left",box:localBox3d(machine,1,.9,Math.max(.5,machine.w-2),panelDepth,Math.max(2,machine.h*.72),colors.glass,1.4)});
      specs.push({id:"procedural-glass-right",box:localBox3d(machine,1,machine.d-panelDepth-.9,Math.max(.5,machine.w-2),panelDepth,Math.max(2,machine.h*.72),colors.glass,1.4)});
    } else if (type === "shipping") {
      const cabWidth=machine.w*.3;
      specs.push({id:"procedural-windshield",box:localBox3d(machine,cabWidth*.15,.55,cabWidth*.65,.3,1.5,colors.glass,3.5)});
      const rackStart=cabWidth+.6;
      for(let panel=0;panel<4;panel+=1){
        const offset=rackStart+1.2+panel*Math.max(1.4,(machine.w-rackStart-3)/3);
        specs.push({id:`procedural-glass-${panel}`,box:localBox3d(machine,Math.min(offset,machine.w-1.3),1.2,.45,Math.max(.5,machine.d-2.4),Math.max(2,machine.h*.72),colors.glass,1.45)});
      }
    } else if (type === "animatedGlass") {
      specs.push({id:"procedural-glass-body",box:{...machine,y:Number(machine.renderY ?? machine.y)||0}});
    }
    const machineId=String(machine.instanceId || machine.id || machine.name || "machine");
    return specs.map(({id,box})=>({kind:"glass",machineId,componentId:id,glassId:`${machineId}:${id}`,glassRadius:Math.max(.8,Math.min(5,Math.hypot(Number(box.w),Number(box.h),Number(box.d))*.14)),...box}));
  }

  function combatGlassOccluders(machine, time = performance.now()) {
    const renderedMachine = machineHasLayoutMotion(machine) ? animatedMachine(machine, time) : machine;
    const design=renderedMachine?.designId ? designLibrary[renderedMachine.designId] : null;
    if (!design) return proceduralCombatGlassOccluders(renderedMachine);
    // Use the exact animated/nested parts that are visible this frame. This makes
    // glass stay shootable while groups, carts, bridges, racks, and machine parts
    // move through timeline/legacy animation states.
    const glassParts = visibleDesignComponents(design, time).flatMap((component) => (
      component?.type === "group" ? flattenDesignComponents([component]) : [component]
    ));
    const authored=glassParts.filter((component) => ["box", "glassPanel"].includes(component.type) && carrierGlassComponent(renderedMachine,component)).map((component) => {
      const spec=scaledComponentBox(renderedMachine,component,design);
      const angle=angleRadians(spec);
      const halfWidth=Math.max(.025,Number(spec.w)/2), halfDepth=Math.max(.025,Number(spec.d)/2);
      const extentX=Math.abs(Math.cos(angle))*halfWidth+Math.abs(Math.sin(angle))*halfDepth;
      const extentZ=Math.abs(Math.sin(angle))*halfWidth+Math.abs(Math.cos(angle))*halfDepth;
      const centerX=Number(spec.x)+halfWidth, centerZ=Number(spec.z)+halfDepth;
      return {
        kind:"glass", machineId:String(machine.instanceId || machine.id || machine.name || "machine"), componentId:String(component.id || component.name || "glass"),
        glassId:`${String(machine.instanceId || machine.id || machine.name || "machine")}:${String(component.id || component.name || "glass")}`,
        glassRadius:Math.max(.8,Math.min(4,Math.hypot(Number(spec.w),Number(spec.h),Number(spec.d))*.12)),
        x:centerX-extentX,y:Number(spec.y),z:centerZ-extentZ,w:extentX*2,h:Math.max(.04,Number(spec.h)),d:extentZ*2,
      };
    });
    return authored.length ? authored : proceduralCombatGlassOccluders(renderedMachine);
  }

  function combatEnemyMachines() {
    // Endless uses synthetic zombies only. Original plant people remain in the
    // editor data but are not actors, props, or labels during the survival run.
    const base = combatController?.isEndlessZombie?.() ? [] : combatBaseEnemyMachines();
    const spawned = combatController?.isActive?.() ? (combatController.spawnedEnemyMachines?.() || []) : [];
    return spawned.length ? [...base, ...spawned] : base;
  }

  const COMBAT_OCCLUDER_CACHE_MS = 34;
  let combatOccluderCache = { at: -Infinity, entries: [] };

  function combatOccluders() {
    const now = performance.now();
    if (now - combatOccluderCache.at < COMBAT_OCCLUDER_CACHE_MS) return combatOccluderCache.entries;
    const entries = [];
    const defaultHeight = Math.max(12, Number(state.wallGeometry?.height) || 24);
    structuralColumns().forEach((column) => {
      if (isColumnHidden(column)) return;
      const pillarHalfSize = 1.35;
      entries.push({
        kind: "pillar",
        x: Number(column.x) - pillarHalfSize,
        y: 0,
        z: Number(column.z) - pillarHalfSize,
        w: pillarHalfSize * 2,
        h: Math.max(defaultHeight, displayedColumnHeight(column)),
        d: pillarHalfSize * 2,
      });
    });
    displayedWallSections().forEach((wall) => {
      if (state.walls[wall.id] === false) return;
      entries.push({
        x: Number(wall.x) || 0,
        y: Number(wall.y) || 0,
        z: Number(wall.z) || 0,
        w: Math.max(.05, Number(wall.w) || .05),
        h: Math.max(.05, Number(wall.h) || defaultHeight),
        d: Math.max(.05, Number(wall.d) || .05),
      });
    });
    const combatTime=now;
    machines.forEach((machine) => {
      if (machine.visible === false || combatEnemyMachine(machine) || stageAlpha(machine.reveal,machine.retire) <= .08) return;
      combatGlassOccluders(machine, combatTime).forEach((glass) => entries.push(glass));
    });
    walkCollisionCandidates().forEach((machine) => {
      if (combatEnemyMachine(machine)) return;
      walkHitboxesForMachine(machine).forEach((hitbox) => {
        const angle = angleRadians(hitbox);
        const halfWidth = Math.max(.05, Number(hitbox.w) / 2);
        const halfDepth = Math.max(.05, Number(hitbox.d) / 2);
        const extentX = Math.abs(Math.cos(angle)) * halfWidth + Math.abs(Math.sin(angle)) * halfDepth;
        const extentZ = Math.abs(Math.sin(angle)) * halfWidth + Math.abs(Math.cos(angle)) * halfDepth;
        const centerX = Number(hitbox.x) + halfWidth;
        const centerZ = Number(hitbox.z) + halfDepth;
        entries.push({
          kind:"machine",
          machineId:String(machine.instanceId || machine.id || machine.name || "machine"),
          x: centerX - extentX,
          y: Number(hitbox.y) || 0,
          z: centerZ - extentZ,
          w: extentX * 2,
          h: Math.max(.05, Number(hitbox.h) || defaultHeight),
          d: extentZ * 2,
        });
      });
    });
    combatOccluderCache = { at: now, entries };
    return entries;
  }

  function findWalkSpawn(preferredX, preferredZ) {
    const bounds = floorBounds();
    const radius = Math.max(0.5, Number(state.walkRadius) || 1.2);
    const clampedX = clamp(preferredX, bounds[0] + radius, bounds[2] - radius);
    const clampedZ = clamp(preferredZ, bounds[1] + radius, bounds[3] - radius);
    if (walkCanOccupy(clampedX, clampedZ, radius)) return [clampedX, clampedZ];
    const step = 4;
    for (let ring = 1; ring <= 80; ring += 1) {
      for (let offset = -ring; offset <= ring; offset += 1) {
        const candidates = [
          [clampedX + offset * step, clampedZ - ring * step],
          [clampedX + offset * step, clampedZ + ring * step],
          [clampedX - ring * step, clampedZ + offset * step],
          [clampedX + ring * step, clampedZ + offset * step],
        ];
        for (const [x, z] of candidates) {
          const safeX = clamp(x, bounds[0] + radius, bounds[2] - radius);
          const safeZ = clamp(z, bounds[1] + radius, bounds[3] - radius);
          if (walkCanOccupy(safeX, safeZ, radius)) return [safeX, safeZ];
        }
      }
    }
    return [clampedX, clampedZ];
  }

  function rectangleAxes(points) {
    const axes = [];
    for (let index = 0; index < 2; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      const edgeX = next[0] - current[0];
      const edgeZ = next[2] - current[2];
      const length = Math.hypot(edgeX, edgeZ) || 1;
      axes.push([-edgeZ / length, edgeX / length]);
    }
    return axes;
  }

  function projectRectangle(points, axis) {
    const values = points.map((point) => point[0] * axis[0] + point[2] * axis[1]);
    return [Math.min(...values), Math.max(...values)];
  }

  function machinesOverlap(first, second, padding = 0.15) {
    const firstHitboxes = first?.designId && designLibrary[first.designId]
      ? walkHitboxesForMachine(first)
      : [first];
    const secondHitboxes = second?.designId && designLibrary[second.designId]
      ? walkHitboxesForMachine(second)
      : [second];
    return firstHitboxes.some((firstHitbox) => secondHitboxes.some((secondHitbox) => {
      const firstPoints = footprint(firstHitbox, -padding, 0);
      const secondPoints = footprint(secondHitbox, -padding, 0);
      const axes = [...rectangleAxes(firstPoints), ...rectangleAxes(secondPoints)];
      return axes.every((axis) => {
        const a = projectRectangle(firstPoints, axis);
        const b = projectRectangle(secondPoints, axis);
        return a[1] > b[0] && b[1] > a[0];
      });
    }));
  }

  let overlapCacheSignature = "";
  let overlapCacheIds = new Set();
  let overlapCachePairs = [];

  function overlapSignature(candidates) {
    return candidates.map((machine) => [
      machine.instanceId, Number(machine.x).toFixed(2), Number(machine.z).toFixed(2),
      Number(machine.w).toFixed(2), Number(machine.d).toFixed(2),
      Number(machine.rotationY ?? machine.rotation ?? 0).toFixed(2), machine.collisionMode,
      machine.designId ? designLibrary[machine.designId]?.updatedAt || "" : "",
    ].join(":" )).join("|");
  }

  function overlapPairs() {
    const candidates = collisionCandidates();
    const signature = overlapSignature(candidates);
    if (signature === overlapCacheSignature) return overlapCachePairs;

    // Use a broad-phase spatial grid before the precise rotated-rectangle SAT
    // test. This keeps selection/paste updates near-linear for a full plant
    // instead of comparing every object against every other object twice.
    const cellSize = 40;
    const cells = new Map();
    candidates.forEach((machine, index) => {
      const points = footprint(machine, 0, 0);
      const xs = points.map((point) => point[0]);
      const zs = points.map((point) => point[2]);
      const minCellX = Math.floor(Math.min(...xs) / cellSize);
      const maxCellX = Math.floor(Math.max(...xs) / cellSize);
      const minCellZ = Math.floor(Math.min(...zs) / cellSize);
      const maxCellZ = Math.floor(Math.max(...zs) / cellSize);
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
          const key = `${cellX}:${cellZ}`;
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key).push(index);
        }
      }
    });

    const tested = new Set();
    const pairs = [];
    const ids = new Set();
    cells.forEach((indices) => {
      for (let firstOffset = 0; firstOffset < indices.length; firstOffset += 1) {
        for (let secondOffset = firstOffset + 1; secondOffset < indices.length; secondOffset += 1) {
          const firstIndex = indices[firstOffset];
          const secondIndex = indices[secondOffset];
          const pairKey = firstIndex < secondIndex ? `${firstIndex}:${secondIndex}` : `${secondIndex}:${firstIndex}`;
          if (tested.has(pairKey)) continue;
          tested.add(pairKey);
          const first = candidates[firstIndex];
          const second = candidates[secondIndex];
          if (!machinesOverlap(first, second)) continue;
          pairs.push([first, second]);
          ids.add(first.instanceId);
          ids.add(second.instanceId);
        }
      }
    });
    overlapCacheSignature = signature;
    overlapCachePairs = pairs;
    overlapCacheIds = ids;
    return overlapCachePairs;
  }

  function overlapIds() {
    overlapPairs();
    return overlapCacheIds;
  }

  function selectedHasOverlap(machine, ignoreId = null) {
    return collisionCandidates().some((candidate) => (
      candidate.instanceId !== machine.instanceId &&
      candidate.instanceId !== ignoreId &&
      machinesOverlap(machine, candidate)
    ));
  }

  function findOpenPosition(machine, startX = machine.x, startZ = machine.z) {
    const bounds = floorBounds();
    const snap = Math.max(0.25, Number(state.snapSize) || 0.5);
    const original = { x: machine.x, z: machine.z };
    const maxRing = 80;
    for (let ring = 0; ring <= maxRing; ring += 1) {
      const radius = ring * snap;
      const candidates = ring === 0 ? [[0, 0]] : [];
      if (ring > 0) {
        for (let step = -ring; step <= ring; step += 1) {
          candidates.push([step * snap, -radius], [step * snap, radius]);
          if (Math.abs(step) !== ring) candidates.push([-radius, step * snap], [radius, step * snap]);
        }
      }
      for (const [deltaX, deltaZ] of candidates) {
        machine.x = clamp(startX + deltaX, bounds[0], bounds[2] - machine.w);
        machine.z = clamp(startZ + deltaZ, bounds[1], bounds[3] - machine.d);
        if (!selectedHasOverlap(machine)) return { x: machine.x, z: machine.z };
      }
    }
    machine.x = original.x;
    machine.z = original.z;
    return null;
  }

  function findOpenPositionAcrossFloor(machine, startX = machine.x, startZ = machine.z) {
    const nearby = findOpenPosition(machine, startX, startZ);
    if (nearby) return nearby;
    const bounds = floorBounds();
    const original = { x: machine.x, z: machine.z };
    const step = Math.max(5, Number(state.snapSize) || .5, Math.min(Number(machine.w) || 5, Number(machine.d) || 5) / 2);
    const columns = Math.max(1, Math.floor(Math.max(0, floor.width - machine.w) / step));
    const rows = Math.max(1, Math.floor(Math.max(0, floor.length - machine.d) / step));
    const centerColumn = Math.round((clamp(startX, bounds[0], bounds[2] - machine.w) - bounds[0]) / step);
    const centerRow = Math.round((clamp(startZ, bounds[1], bounds[3] - machine.d) - bounds[1]) / step);
    const maxRing = Math.max(columns, rows);
    let checked = 0;
    const maxChecks = 5000;
    for (let ring = 0; ring <= maxRing && checked < maxChecks; ring += 1) {
      for (let rowOffset = -ring; rowOffset <= ring && checked < maxChecks; rowOffset += 1) {
        for (let columnOffset = -ring; columnOffset <= ring && checked < maxChecks; columnOffset += 1) {
          if (ring && Math.max(Math.abs(columnOffset), Math.abs(rowOffset)) !== ring) continue;
          const column = centerColumn + columnOffset;
          const row = centerRow + rowOffset;
          if (column < 0 || row < 0 || column > columns || row > rows) continue;
          checked += 1;
          machine.x = clamp(bounds[0] + column * step, bounds[0], bounds[2] - machine.w);
          machine.z = clamp(bounds[1] + row * step, bounds[1], bounds[3] - machine.d);
          if (!selectedHasOverlap(machine)) return { x: machine.x, z: machine.z };
        }
      }
    }
    machine.x = original.x;
    machine.z = original.z;
    return null;
  }

  function separateSelectedObject() {
    const machine = selectedMachine();
    if (!machine) return;
    if (machine.collisionMode !== "solid") {
      showToast("This object is configured to ignore collision checks.");
      return;
    }
    if (!selectedHasOverlap(machine)) {
      showToast(`${machine.name} is not overlapping another solid object.`);
      return;
    }
    pushHistory();
    const position = findOpenPosition(machine);
    if (!position) {
      state.history.pop();
      updateHistoryButtons();
      showToast("No nearby open position was found.");
      return;
    }
    persistLayout();
    updateEditorPanel();
    showToast(`Moved ${machine.name} to the nearest open space.`);
  }

  function resolveAllOverlaps() {
    const pairsBefore = overlapPairs();
    if (!pairsBefore.length) {
      showToast("No solid-object overlaps were found.");
      return;
    }
    pushHistory();
    let moved = 0;
    const protectedIds = new Set();
    for (const [first, second] of pairsBefore) {
      if (!machinesOverlap(first, second)) continue;
      const candidate = second.locked || protectedIds.has(second.instanceId) ? first : second;
      if (candidate.locked) continue;
      const position = findOpenPosition(candidate);
      if (position) {
        moved += 1;
        protectedIds.add(candidate.instanceId);
      }
    }
    persistLayout();
    updateEditorPanel();
    showToast(moved ? `Separated ${moved} overlapping object${moved === 1 ? "" : "s"}.` : "Overlaps involve locked objects and were not moved.");
  }

  function selectNextOverlap() {
    const pairs = overlapPairs();
    if (!pairs.length) {
      showToast("No solid-object overlaps were found.");
      return;
    }
    const flattened = [...new Set(pairs.flat().map((machine) => machine.instanceId))];
    const currentIndex = flattened.indexOf(state.selectedMachineId);
    setSingleSelection(flattened[(currentIndex + 1) % flattened.length]);
    state.editorTool = "machines";
    focusSelectedMachine();
    updateEditorPanel();
  }

  function uniqueId(prefix = "machine") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  }

  function designerMachineDesigns() {
    return Object.values(designLibrary)
      .filter((design) => design?.custom === true && Array.isArray(design.components) && design.components.length)
      .sort((first, second) => String(first.name || first.id).localeCompare(String(second.name || second.id)));
  }

  function designMachineColor(design) {
    const pending = [...(design?.components || [])];
    while (pending.length) {
      const component = pending.shift();
      if (Array.isArray(component?.children)) pending.unshift(...component.children);
      if (component?.visible === false || Number(component?.opacity) <= 0) continue;
      if (/^#[0-9a-f]{6}$/i.test(component?.color || "")) return component.color;
    }
    return "#277d78";
  }

  function designMachineType(design) {
    const value = String(design?.machineType || "custom-machine")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return value || "custom-machine";
  }

  function machineTemplateFromDesign(design, requestedName, revealStage = state.stage) {
    const base = designBaseDimensions(design);
    const name = requestedName?.trim() || design.name || "New custom machine";
    const type = designMachineType(design);
    return normalizeMachine({
      id: uniqueId(type),
      instanceId: uniqueId(`${type}-instance`),
      name,
      short: name,
      useDesignName: !requestedName?.trim(),
      type,
      category: "equipment",
      reveal: Number.isFinite(Number(revealStage)) ? Number(revealStage) : state.stage,
      retire: 99,
      x: modelCenter()[0] + state.panX - base.w / 2,
      y: 0,
      z: modelCenter()[1] + state.panZ - base.d / 2,
      w: base.w,
      d: base.d,
      h: base.h,      naturalW: base.w,
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
      color: designMachineColor(design),
      visible: true,
      locked: false,
      showLabel: true,
      designId: design.id,
      designScaleMode: "match",
      collisionMode: "solid",
      placement_status: "designer_created",
      evidence: "Created from a reusable Machine Design Studio design in the Plant Layout editor.",
      custom: true,
      crane: null,
      animationEnabled: false,
      animationMode: "none",
    });
  }

  function machineTemplate(type, requestedName) {
    const defaults = {
      generic: {
        name: requestedName || "New machine",
        short: requestedName || "New machine",
        type: "generic",
        w: 20, d: 10, h: 8,
        color: "#277d78",
        crane: { system: "GORBEL bridge", capacity: "1000 lb", height: 20 },
      },
      genericBox: {
        name: requestedName || "General box",
        short: requestedName || "General box",
        type: "genericBox",
        w: 12, d: 12, h: 8,
        color: "#67757a",
        crane: null,
      },
      cutting: {
        name: requestedName || "Barefoot cutting tables",
        short: requestedName || "Cutting tables",
        type: "cutting",
        w: 54, d: 66, h: 5,
        color: "#267e79",
        crane: { system: "GORBEL bridge", capacity: "1000 lb", height: 19 },
      },
      waterjet: {
        name: requestedName || "SQ4020 waterjet",
        short: requestedName || "Waterjet",
        type: "waterjet",
        w: 27, d: 18, h: 8,
        color: "#347f9f",
        crane: { system: "GORBEL bridge", capacity: "1000 lb", height: 19 },
      },
      filtration: {
        name: requestedName || "Waterjet pump & filtration",
        short: requestedName || "Filtration",
        type: "filtration",
        w: 7, d: 10, h: 8,
        color: "#276b8b",
        crane: null,
      },
      kodiak: {
        name: requestedName || "KODIAK 10-45 polisher",
        short: requestedName || "Polisher",
        type: "kodiak",
        w: 25, d: 9, h: 8,
        color: "#d4d8d5",
        crane: { system: "GORBEL bridge", capacity: "1000 lb", height: 20 },
      },
      denver: {
        name: requestedName || "Denver Surface CNC",
        short: requestedName || "Denver CNC",
        type: "denver",
        w: 37, d: 10, h: 14,
        color: "#d9dcda",
        crane: { system: "GORBEL bridge", capacity: "1000 lb", height: 21 },
      },
      washer: {
        name: requestedName || "Zafferani glass washer",
        short: requestedName || "Washer",
        type: "washer",
        w: 22, d: 9, h: 12,
        color: "#bfc7c5",
        crane: null,
      },
      furnace: {
        name: requestedName || "Tempering furnace",
        short: requestedName || "Tempering",
        type: "furnace",
        w: 42, d: 12, h: 10,
        color: "#d56535",
        crane: { system: "Engineered Systems bridge", capacity: "5 ton", height: 23 },
      },
      cube: {
        name: requestedName || "Diamon-Fusion FuseCube",
        short: requestedName || "Diamon Fusion",
        type: "cube",
        w: 16, d: 14, h: 12,
        color: "#285b91",
        crane: null,
      },
      wrapping: {
        name: requestedName || "Glass wrapping station",
        short: requestedName || "Wrapping",
        type: "wrapping",
        w: 26, d: 12, h: 8,
        color: "#aeb8b5",
        crane: null,
      },
      shipping: {
        name: requestedName || "Shipping glass rack",
        short: requestedName || "Shipping",
        type: "shipping",
        w: 24, d: 10, h: 12,
        color: "#d9dedb",
        crane: null,
      },
      aFrame: {
        name: requestedName || "A-frame glass cart",
        short: requestedName || "A-frame",
        type: "aFrame",
        w: 12, d: 6, h: 9,
        color: "#d85f34",
        crane: null,
        designId: "aframe-cart-standard",
      },
      aFrameTruck: {
        name: requestedName || "A-frame glass truck",
        short: requestedName || "A-frame truck",
        type: "aFrameTruck",
        w: 20, d: 8, h: 11,
        color: "#d85f34",
        crane: null,
        designId: "aframe-truck-standard",
      },
      craneMachine: {
        name: requestedName || "Freestanding gantry crane",
        short: requestedName || "Gantry crane",
        type: "craneMachine",
        w: 18, d: 14, h: 18,
        color: "#e2b32d",
        crane: null,
      },
      bridgeCrane: {
        name: requestedName || "Overhead bridge crane",
        short: requestedName || "Bridge crane",
        type: "bridgeCrane",
        w: 36, d: 22, h: 21,
        color: "#2675a7",
        crane: null,
      },
      glassRack: {
        name: requestedName || "Raw glass rack",
        short: requestedName || "Glass rack",
        type: "glassRack",
        w: 23, d: 9, h: 12,
        color: "#303b40",
        crane: null,
      },
      room: {
        name: requestedName || "Plant room",
        short: requestedName || "Room",
        type: "room",
        w: 24, d: 20, h: 12,
        color: "#d8d2c5",
        crane: null,
      },
      person: {
        name: requestedName || "Team member",
        short: requestedName || "Person",
        type: "person",
        w: 1.6, d: 1.6, h: 6.5,
        color: "#1e7b78",
        crane: null,
        designId: "team-member-standard",
      },
      safetyLine: {
        name: requestedName || "Safety yellow line",
        short: requestedName || "Safety line",
        type: "safetyLine",
        w: 40, d: 3, h: 0.08,
        color: "#e3ad28",
        crane: null,
        showLabel: false,
        collisionMode: "ignore",
      },
      trench: {
        name: requestedName || "Utility trench",
        short: requestedName || "Trench",
        type: "trench",
        w: 40, d: 3, h: 0.22,
        color: "#4a3a31",
        crane: null,
        showLabel: false,
        collisionMode: "ignore",
      },
      floorDrain: {
        name: requestedName || "Square floor drain",
        short: requestedName || "Floor drain",
        type: "floorDrain",
        w: 3, d: 3, h: 0.18,
        color: "#465155",
        crane: null,
        showLabel: false,
        collisionMode: "ignore",
      },
      animatedGlass: {
        name: requestedName || "Moving vertical glass",
        short: requestedName || "Moving glass",
        type: "animatedGlass",
        w: 1.2, d: 13, h: 10,
        color: "#8fc6d4",
        crane: null,
        showLabel: false,
        collisionMode: "ignore",
        animationEnabled: true,
        animationMode: "loop",
        animationAxis: "x",
        animationDistance: 60,
        animationSpeed: 0.06,
      },
      animatedBox: {
        name: requestedName || "Moving material box",
        short: requestedName || "Moving box",
        type: "animatedBox",
        w: 5, d: 4, h: 4,
        color: "#b7814a",
        crane: null,
        collisionMode: "ignore",
        animationEnabled: true,
        animationMode: "pingPong",
        animationAxis: "x",
        animationDistance: 30,
        animationSpeed: 0.12,
      },
      animatedPerson: {
        name: requestedName || "Walking team member",
        short: requestedName || "Walking person",
        type: "animatedPerson",
        w: 1.8, d: 1.8, h: 6.5,
        color: "#1e7b78",
        crane: null,
        collisionMode: "ignore",
        animationEnabled: true,
        animationMode: "pingPong",
        animationAxis: "z",
        animationDistance: 18,
        animationSpeed: 0.08,
      },
      animatedCart: {
        name: requestedName || "Moving material cart",
        short: requestedName || "Moving cart",
        type: "animatedCart",
        w: 8, d: 5, h: 4,
        color: "#d85f34",
        crane: null,
        collisionMode: "ignore",
        animationEnabled: true,
        animationMode: "pingPong",
        animationAxis: "x",
        animationDistance: 36,
        animationSpeed: 0.07,
      },
      animatedBeacon: {
        name: requestedName || "Animated status beacon",
        short: requestedName || "Status beacon",
        type: "animatedBeacon",
        w: 2, d: 2, h: 12,
        color: "#d64a32",
        crane: null,
        showLabel: false,
        collisionMode: "ignore",
        animationEnabled: true,
        animationMode: "blink",
        animationAxis: "y",
        animationDistance: 0,
        animationSpeed: 1.25,
      },
    };
    const template = defaults[type] || defaults.genericBox;
    const offset = machines.filter((machine) => machine.custom).length * 4;
    return normalizeMachine({
      id: uniqueId(type),
      instanceId: uniqueId(type),
      reveal: state.stage,
      retire: 99,
      x: modelCenter()[0] + state.panX - template.w/2 + offset,
      z: modelCenter()[1] + state.panZ - template.d/2 + offset,
      rotation: 0,
      visible: true,
      locked: false,
      showLabel: true,
      placement_status: "user_added",
      evidence: "Added in the interactive layout editor.",
      custom: true,
      ...template,
    });
  }

  function updateHistoryButtons() {
    document.querySelectorAll("[data-editor-action='undo']").forEach((button) => {
      button.disabled = state.history.length === 0;
    });
    document.querySelectorAll("[data-editor-action='redo']").forEach((button) => {
      button.disabled = state.future.length === 0;
    });
  }

  function currentStage() {
    return stages[state.stage] || stages[0];
  }

  function showToast(message) {
    let toast = document.querySelector(".plant-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "plant-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      canvas.closest(".model-frame")?.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => toast.classList.remove("visible"), 2200);
  }

  function focusSelectedMachine() {
    const selection = selectedMachines();
    if (!selection.length) return;
    const minX = Math.min(...selection.map((machine) => machine.x));
    const maxX = Math.max(...selection.map((machine) => machine.x + machine.w));
    const minZ = Math.min(...selection.map((machine) => machine.z));
    const maxZ = Math.max(...selection.map((machine) => machine.z + machine.d));
    state.panX = (minX + maxX) / 2 - modelCenter()[0];
    state.panZ = (minZ + maxZ) / 2 - modelCenter()[1];
    state.zoom = Math.max(state.zoom, clamp(70 / Math.max(maxX - minX, maxZ - minZ, 1), 1.1, 7));
    showToast(selection.length === 1 ? `Focused on ${selection[0].name}.` : `Focused on ${selection.length} selected objects.`);
  }

  function nudgeSelectedMachine(deltaX = 0, deltaZ = 0, deltaRotation = 0) {
    const selection = selectedMachines();
    if (!selection.length) return;
    const movable = selection.filter((machine) => !machine.locked);
    if (!movable.length) {
      showToast(selection.length === 1 ? `${selection[0].name} is locked.` : "All selected objects are locked.");
      return;
    }
    pushHistory();
    const snap = Math.max(0.01, Number(state.snapSize) || 0.1);
    const bounds = floorBounds();
    movable.forEach((machine) => {
      machine.x = clamp(machine.x + deltaX * snap, bounds[0], bounds[2] - machine.w);
      machine.z = clamp(machine.z + deltaZ * snap, bounds[1], bounds[3] - machine.d);
      machine.rotationY = ((Number(machine.rotationY ?? machine.rotation) + deltaRotation * snap) % 360 + 360) % 360;
      machine.rotation = machine.rotationY;
    });
    persistLayout();
    updateEditorPanel();
    if (movable.length !== selection.length) showToast(`Moved ${movable.length} objects; locked objects were left in place.`);
  }

  function updateEditorHelp() {
    const frame = canvas.closest(".model-frame");
    frame?.classList.toggle("editor-navigating", state.editing && state.editorInteraction === "navigate");
    const help = document.querySelector(".view-help");
    if (!help) return;
    if (!state.editing) {
      if (combatController?.isActive?.()) {
        help.textContent = "Combat mode · WASD move · mouse aim · Mouse 1 fire · 1/2 switch weapons · R reload";
        return;
      }
      const touchFirstViewport = window.matchMedia?.("(max-width: 760px), (hover: none) and (pointer: coarse)")?.matches;
      help.textContent = state.cameraMode === "walk"
        ? "First person · WASD move · mouse look · Shift sprint · Space jump"
        : touchFirstViewport
          ? "Drag to orbit · Pinch to zoom · Two-finger drag to pan"
          : "Right-drag orbit · Middle-drag pan · Wheel up/down zoom";
      return;
    }
    help.textContent = state.editorInteraction === "navigate"
      ? "Navigate: right-drag orbit · middle/Shift/Space-drag pan · wheel zoom"
      : "Edit: drag an object · middle-drag pan · right/Alt-drag orbit";
  }

  const BULK_MACHINE_FIELDS = new Set([
    "y", "rotationX", "rotationY", "rotationZ", "w", "d", "h",
    "reveal", "retire", "color", "collisionMode",
  ]);
  const BULK_MACHINE_CHECKS = new Set(["visible", "showLabel", "locked"]);

  function commonMachineValue(items, field) {
    if (!items.length) return { mixed: false, value: "" };
    const first = items[0]?.[field];
    return {
      value: first ?? "",
      mixed: items.some((item) => String(item?.[field] ?? "") !== String(first ?? "")),
    };
  }

  function updateEditorPanel() {
    const machine = selectedMachine();
    const selectionItems = selectedMachines();
    const selectionCount = selectionItems.length;
    const panel = document.querySelector(".layout-editor");
    if (!panel) return;

    panel.querySelectorAll("[data-editor-section]").forEach((section) => {
      section.hidden = section.dataset.editorSection !== state.editorTool;
    });
    panel.querySelectorAll("[data-object-editor-panel]").forEach((section) => {
      section.hidden = section.dataset.objectEditorPanel !== state.objectEditorTab;
    });
    panel.querySelectorAll("[data-object-editor-tab]").forEach((button) => {
      const active = button.dataset.objectEditorTab === state.objectEditorTab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });

    const selection = panel.querySelector("[data-editor-selection]");
    if (selection) {
      if (state.editorTool === "timeline") selection.textContent = currentStage()?.title || "Timeline";
      else if (state.editorTool === "pillars") {
        const column = structuralColumns().find((item) => item.key === state.selectedColumnKey);
        selection.textContent = column ? `Pillar ${column.key}` : "Structure controls";
      }
      else if (state.editorTool === "project") selection.textContent = "Project tools";
      else selection.textContent = selectionCount > 1 ? `${selectionCount} objects selected` : (machine ? machine.name : "Select any model object");
    }

    panel.querySelectorAll("[data-needs-selection]").forEach((control) => {
      control.disabled = selectionCount === 0;
    });

    panel.querySelectorAll("[data-machine-field]").forEach((input) => {
      const field = input.dataset.machineField;
      const bulkEditable = BULK_MACHINE_FIELDS.has(field);
      input.disabled = !machine || (selectionCount > 1 && !bulkEditable);
      input.dataset.mixed = "false";
      input.removeAttribute("title");
      if (input.dataset.stageSelect !== undefined) {
        const includeNever = input.dataset.allowNever !== undefined;
        input.innerHTML = stages.map((stage,index) => (
          `<option value="${index}">${String(index + 1).padStart(2,"0")} · ${escapeHtml(stage.short)}</option>`
        )).join("") + (includeNever ? `<option value="99">Never</option>` : "");
      }
      if (!machine) {
        input.value = "";
        return;
      }
      if (selectionCount > 1) {
        if (!bulkEditable) {
          input.value = "";
          return;
        }
        const common = commonMachineValue(selectionItems, field);
        input.value = String(common.value ?? "");
        input.dataset.mixed = String(common.mixed);
        if (common.mixed) input.title = "Mixed values. Changing this setting applies it to all selected objects.";
        return;
      }
      const value = machine[field];
      if (["name", "type", "color", "collisionMode", "designScaleMode"].includes(field)) input.value = value ?? "";
      else input.value = String(Number(value ?? 0));
    });

    const scaleModes = selectionItems.map((item) => normalizedMachineScaleEditMode(item.scaleEditMode, item));
    const commonScaleMode = scaleModes[0] || "uniform";
    const mixedScaleModes = scaleModes.some((value) => value !== commonScaleMode);
    panel.querySelectorAll("[data-machine-scale-mode]").forEach((button) => {
      const active = !mixedScaleModes && button.dataset.machineScaleMode === commonScaleMode;
      button.disabled = selectionCount === 0;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    panel.querySelectorAll("[data-scale-fields]").forEach((group) => {
      const mode = group.dataset.scaleFields;
      group.hidden = selectionCount === 0
        ? mode !== "uniform"
        : (!mixedScaleModes && mode !== commonScaleMode);
    });
    const scaleModeHelp = panel.querySelector("[data-scale-mode-help]");
    if (scaleModeHelp) {
      scaleModeHelp.textContent = !selectionCount
        ? "Select an object to edit its scale."
        : mixedScaleModes
          ? "Selected objects use mixed scaling modes. Choose Uniform or Individual axes to make them consistent."
          : commonScaleMode === "uniform"
            ? "Uniform scaling keeps width, height, and depth proportional."
            : "Individual scaling lets X, Y, and Z use different percentages.";
    }

    panel.querySelectorAll("[data-machine-scale]").forEach((input) => {
      const axis = input.dataset.machineScale;
      input.disabled = selectionCount === 0;
      input.dataset.mixed = "false";
      if (!selectionCount) {
        input.value = "";
        return;
      }
      const values = selectionItems.map((item) => {
        refreshMachineScaleMetadata(item);
        if (axis === "uniform") {
          const all = [item.scaleXPercent, item.scaleYPercent, item.scaleZPercent];
          return Math.max(...all) - Math.min(...all) < .01 ? all[0] : "";
        }
        return item[`scale${axis.toUpperCase()}Percent`];
      });
      const first = values[0];
      const mixed = values.some((value) => String(value) !== String(first));
      input.value = mixed ? "" : String(Number(first).toFixed(2));
      input.dataset.mixed = String(mixed);
      input.placeholder = mixed ? "Mixed" : "100.00";
      input.title = mixed ? "Mixed values. Enter a percentage to apply it to every selected object." : "";
    });

    const depthLabel = panel.querySelector("[data-depth-label]");
    if (depthLabel) depthLabel.textContent = machine && isFloorFeatureType(machine.type) ? "Length" : "Depth";


    panel.querySelectorAll("[data-machine-check]").forEach((input) => {
      const field = input.dataset.machineCheck;
      input.disabled = !machine || (selectionCount > 1 && !BULK_MACHINE_CHECKS.has(field));
      if (selectionCount > 1 && BULK_MACHINE_CHECKS.has(field)) {
        const values = selectionItems.map((item) => field === "locked" ? item.locked === true : item[field] !== false);
        input.checked = values.every(Boolean);
        input.indeterminate = values.some(Boolean) && !values.every(Boolean);
      } else {
        input.indeterminate = false;
        input.checked = machine ? (field === "locked" ? machine.locked === true : machine[field] !== false) : false;
      }
    });

    panel.querySelectorAll("[data-label-field]").forEach((input) => {
      const field = input.dataset.labelField;
      input.disabled = !machine;
      if (input.dataset.stageSelect !== undefined) {
        const includeNever = input.dataset.allowNever !== undefined;
        input.innerHTML = stages.map((stage, index) => (
          `<option value="${index}">${String(index + 1).padStart(2, "0")} · ${escapeHtml(stage.short)}</option>`
        )).join("") + (includeNever ? `<option value="99">Never</option>` : "");
      }
      if (!machine) {
        if (input.type !== "color") input.value = "";
        return;
      }
      if (field === "labelText") {
        input.value = machine.labelUseMachineName === false ? String(machine.labelText || "") : machine.name;
        input.placeholder = machine.name;
      } else if (field === "labelAbbreviation") {
        input.value = String(machine.labelAbbreviation || "");
        input.placeholder = compactMachineLabel(machine, machineLabelProfile(machine));
      } else input.value = String(machine[field] ?? "");
    });

    panel.querySelectorAll("[data-label-check]").forEach((input) => {
      input.disabled = !machine;
      input.checked = Boolean(machine?.[input.dataset.labelCheck]);
    });
    const labelColorPicker = panel.querySelector("[data-label-color-picker]");
    if (labelColorPicker) {
      const presetKey = machine ? matchingLabelColorPreset(machine) : "custom";
      const preset = VISUAL_COLOR_PRESETS[presetKey];
      const background = machine?.labelBackgroundColor || "#141c20";
      const accent = machine?.labelLineColor || "#52b7aa";
      const textColor = machine?.labelTextColor || "#ffffff";
      const colorName = labelColorPicker.querySelector("[data-label-color-name]");
      const backgroundPreview = labelColorPicker.querySelector("[data-label-color-preview-background]");
      const accentPreview = labelColorPicker.querySelector("[data-label-color-preview-accent]");
      const textPreview = labelColorPicker.querySelector("[data-label-color-preview-text]");
      if (colorName) colorName.textContent = preset?.name || "Custom colors";
      if (backgroundPreview) backgroundPreview.style.background = background;
      if (accentPreview) accentPreview.style.background = accent;
      if (textPreview) textPreview.style.background = textColor;
      labelColorPicker.querySelectorAll("[data-label-color-swatch]").forEach((button) => {
        button.classList.toggle("active", Boolean(machine) && button.dataset.labelColorSwatch === presetKey);
      });
    }
    const labelSourceSummary = panel.querySelector("[data-label-source-summary]");
    if (labelSourceSummary) {
      labelSourceSummary.textContent = !machine
        ? "Select an object to edit its label."
        : selectionCount > 1
          ? `Editing the active member: ${machine.name}.`
          : machine.labelUseMachineName === false
            ? `Custom label for ${machine.name}.`
            : `Linked to machine name: ${machine.name}`;
    }

    const assignedProcessPointerKey = machine ? processPointerKeyForMachine(machine) : "";
    const processPointerAssignment = panel.querySelector("[data-process-pointer-assignment]");
    if (processPointerAssignment) {
      processPointerAssignment.disabled = !machine;
      processPointerAssignment.value = assignedProcessPointerKey;
    }
    const removeProcessNode = panel.querySelector("[data-editor-action='remove-process-node']");
    if (removeProcessNode) removeProcessNode.disabled = !machine || !assignedProcessPointerKey;

    const connectionEntries = allProcessConnectionEntries();
    const activeConnection = selectedProcessConnection();
    const processConnectionSelect = panel.querySelector("[data-process-connection-select]");
    if (processConnectionSelect) {
      processConnectionSelect.innerHTML = connectionEntries.length
        ? connectionEntries.map(({ key, connection }) => `<option value="${escapeHtml(key)}">${escapeHtml(processConnectionDisplayName(connection, { includeMachines: true }))}</option>`).join("")
        : `<option value="">No object-to-object process pointers</option>`;
      processConnectionSelect.disabled = connectionEntries.length === 0;
      processConnectionSelect.value = activeConnection?.key || "";
    }

    const selectableObjects = processConnectionObjectOptions();
    const buildObjectOptions = (placeholder) => `<option value="">${placeholder}</option>${selectableObjects.map((item) => `<option value="${escapeHtml(item.instanceId)}">${escapeHtml(processConnectionObjectOptionLabel(item))}</option>`).join("")}`;
    const processConnectionEditSource = panel.querySelector("[data-process-connection-edit-source]");
    const processConnectionEditTarget = panel.querySelector("[data-process-connection-edit-target]");
    if (processConnectionEditSource) {
      processConnectionEditSource.innerHTML = buildObjectOptions("Choose source object");
      processConnectionEditSource.disabled = !activeConnection;
      processConnectionEditSource.value = activeConnection?.sourceId || "";
    }
    if (processConnectionEditTarget) {
      processConnectionEditTarget.innerHTML = buildObjectOptions("Choose destination object");
      processConnectionEditTarget.disabled = !activeConnection;
      processConnectionEditTarget.value = activeConnection?.targetId || "";
    }
    const processConnectionSource = panel.querySelector("[data-process-connection-source]");
    const processConnectionTarget = panel.querySelector("[data-process-connection-target]");
    if (processConnectionSource) {
      processConnectionSource.innerHTML = buildObjectOptions("Choose source object");
      processConnectionSource.disabled = selectableObjects.length < 2;
      const preferred = selectedMachine()?.instanceId || activeConnection?.sourceId || "";
      processConnectionSource.value = selectableObjects.some((item) => item.instanceId === preferred) ? preferred : "";
    }
    if (processConnectionTarget) {
      processConnectionTarget.innerHTML = buildObjectOptions("Choose destination object");
      processConnectionTarget.disabled = selectableObjects.length < 2;
      processConnectionTarget.value = "";
    }
    const selectedSourceId = String(processConnectionSource?.value || "");
    const selectedTargetId = String(processConnectionTarget?.value || "");
    const addProcessConnection = panel.querySelector("[data-editor-action='add-process-connection']");
    if (addProcessConnection) addProcessConnection.disabled = !selectedSourceId || !selectedTargetId || selectedSourceId === selectedTargetId;
    const removeProcessConnection = panel.querySelector("[data-editor-action='remove-process-connection']");
    if (removeProcessConnection) removeProcessConnection.disabled = !activeConnection;
    panel.querySelectorAll("[data-process-connection-field]").forEach((input) => {
      const field = input.dataset.processConnectionField;
      input.disabled = !activeConnection;
      if (!activeConnection) {
        if (input.type !== "color") input.value = "";
        return;
      }
      input.value = String(activeConnection[field] ?? "");
    });
    panel.querySelectorAll("[data-process-connection-check]").forEach((input) => {
      input.disabled = !activeConnection;
      input.checked = Boolean(activeConnection?.[input.dataset.processConnectionCheck]);
    });
    const processColorPreset = panel.querySelector("[data-process-color-preset]");
    if (processColorPreset) {
      processColorPreset.disabled = !activeConnection;
      processColorPreset.value = activeConnection ? matchingProcessColorPreset(activeConnection) : "custom";
    }
    const processPivotList=panel.querySelector("[data-process-pivot-list]");
    if(processPivotList){
      if(!activeConnection){processPivotList.innerHTML='<p class="process-route-tag-preview">Select a process route to edit its exact pivot coordinates.</p>';}
      else{
        const pivots=processConnectionExactPivotPoints(activeConnection);
        processPivotList.innerHTML=pivots.length?pivots.map((pivot,index)=>`<div class="process-pivot-row" data-process-pivot-row="${escapeHtml(pivot.id)}"><span class="process-pivot-index">${index+1}</span><label>X (ft)<input type="number" step="0.1" data-process-pivot-field="x" data-process-pivot-id="${escapeHtml(pivot.id)}" data-process-pivot-index="${index}" value="${Number(pivot.x).toFixed(2)}"></label><label>Z (ft)<input type="number" step="0.1" data-process-pivot-field="z" data-process-pivot-id="${escapeHtml(pivot.id)}" data-process-pivot-index="${index}" value="${Number(pivot.z).toFixed(2)}"></label><button type="button" data-editor-action="remove-process-pivot" data-process-pivot-id="${escapeHtml(pivot.id)}" data-process-pivot-index="${index}" aria-label="Remove pivot ${index+1}">Remove</button></div>`).join(""):'<p class="process-route-tag-preview">No pivots. The route runs directly from S to E. Use Add pivot point to create an exact turn.</p>';
      }
    }
    const addPivotButton=panel.querySelector("[data-editor-action='add-process-pivot']"),clearPivotButton=panel.querySelector("[data-editor-action='clear-process-pivots']");
    if(addPivotButton)addPivotButton.disabled=!activeConnection||processConnectionExactPivotPoints(activeConnection).length>=PROCESS_FLOW_MAX_PIVOTS;
    if(clearPivotButton)clearPivotButton.disabled=!activeConnection||processConnectionExactPivotPoints(activeConnection).length===0;
    const processRouteTagPreview = panel.querySelector("[data-process-route-tag-preview]");
    if (processRouteTagPreview) {
      const automaticText = activeConnection
        ? `${processConnectionEndpointText(activeConnection, "source")} → ${processConnectionEndpointText(activeConnection, "target")}`
        : "";
      const customText = String(activeConnection?.tagText || "").trim();
      processRouteTagPreview.textContent = activeConnection
        ? `Route tag preview: ${customText || automaticText}${customText ? " · custom text" : " · automatic text"}`
        : "Select a line to edit its route-tag text.";
    }
    ["center-process-connection-start", "center-process-connection-end", "reset-process-connection"].forEach((action) => {
      const button = panel.querySelector(`[data-editor-action='${action}']`);
      if (button) button.disabled = !activeConnection;
    });
    const processPointerSummary = panel.querySelector("[data-process-pointer-summary]");
    if (processPointerSummary) {
      processPointerSummary.textContent = activeConnection
        ? `Editing the flowing floor route: ${processConnectionDisplayName(activeConnection, { includeMachines: true })}. Move S / E or add, remove, type, and drag exact numbered floor pivots to route around equipment. Machine-label callouts remain separate.`
        : "No process route exists yet. Choose any source object and destination object below to create one.";
    }

    const editingMotionMember = selectionCount > 1 && selectionItems.some((item) => item.motionParentId || motionChildren(item.instanceId).length);
    panel.querySelectorAll("[data-animation-field]").forEach((input) => {
      const field = input.dataset.animationField;
      input.disabled = !machine;
      input.dataset.mixed = "false";
      input.removeAttribute("title");
      if (selectionCount > 1 && !editingMotionMember) {
        const common = commonMachineValue(selectionItems, field);
        input.value = String(common.value ?? "");
        input.dataset.mixed = String(common.mixed);
        if (common.mixed) input.title = "Mixed values. Changing this setting applies it to all selected objects.";
      } else {
        input.value = machine ? String(machine[field] ?? "") : "";
        if (editingMotionMember) input.title = `Editing animation for ${machine?.name || "the active member"} only.`;
      }
    });
    panel.querySelectorAll("[data-animation-check]").forEach((input) => {
      input.disabled = !machine;
      const field = input.dataset.animationCheck;
      if (selectionCount > 1 && !editingMotionMember) {
        const values = selectionItems.map((item) => Boolean(item[field]));
        input.checked = values.every(Boolean);
        input.indeterminate = values.some(Boolean) && !values.every(Boolean);
      } else {
        input.indeterminate = false;
        input.checked = Boolean(machine?.[field]);
        if (editingMotionMember) input.title = `Editing animation for ${machine?.name || "the active member"} only.`;
      }
    });
    const previewAnimations = panel.querySelector("[data-editor-action='preview-animations']");
    if (previewAnimations) {
      previewAnimations.classList.toggle("active", state.previewObjectAnimations);
      previewAnimations.textContent = state.previewObjectAnimations ? "Pause animations" : "Preview animations";
    }

    const addDesignPicker = panel.querySelector("#new-design-machine");
    if (addDesignPicker) {
      const previousDesignId = addDesignPicker.value;
      const designs = designerMachineDesigns();
      addDesignPicker.innerHTML = designs.length
        ? designs.map((design) => {
          const base = designBaseDimensions(design);
          return `<option value="${escapeHtml(design.id)}">${escapeHtml(design.name || design.id)} · ${base.w.toFixed(1)} × ${base.d.toFixed(1)} × ${base.h.toFixed(1)} ft</option>`;
        }).join("")
        : `<option value="">No saved custom designs</option>`;
      addDesignPicker.disabled = designs.length === 0;
      addDesignPicker.value = designs.some((design) => design.id === previousDesignId)
        ? previousDesignId
        : (designs[0]?.id || "");
      const addDesignButton = panel.querySelector("[data-editor-action='add-design-machine']");
      if (addDesignButton) addDesignButton.disabled = designs.length === 0;
      const status = panel.querySelector("[data-add-design-status]");
      if (status) status.textContent = designs.length
        ? `${designs.length} saved custom machine design${designs.length === 1 ? " is" : "s are"} ready to add.`
        : "No custom machines are saved yet. Open Machine Design Studio, choose New, build the machine, and return here.";
    }
    const addDesignStage = panel.querySelector("#new-design-machine-stage");
    if (addDesignStage) {
      const previousStage = addDesignStage.value;
      addDesignStage.innerHTML = stages.map((stage, index) => (
        `<option value="${index}">${String(index + 1).padStart(2, "0")} · ${escapeHtml(stage.short)}</option>`
      )).join("");
      addDesignStage.value = previousStage !== "" && Number(previousStage) < stages.length
        ? previousStage
        : String(state.stage);
    }

    const designPicker = panel.querySelector("[data-design-picker]");
    if (designPicker) {
      const availableDesigns = Object.values(designLibrary)
        .filter((design) => design && Array.isArray(design.components))
        .sort((first, second) => String(first.name).localeCompare(String(second.name)));
      designPicker.innerHTML = `<option value="">Built-in object model</option>${availableDesigns.map((design) => (
        `<option value="${escapeHtml(design.id)}">${escapeHtml(design.name)}${design.machineType ? ` · ${escapeHtml(design.machineType)}` : ""}</option>`
      )).join("")}`;
      designPicker.disabled = !machine || selectionCount > 1;
      designPicker.value = machine?.designId || "";
    }
    const activeDesign = machine?.designId ? designLibrary[machine.designId] : null;
    const designSizingSummary = panel.querySelector("[data-design-sizing-summary]");
    if (designSizingSummary) {
      if (!machine) designSizingSummary.textContent = "Select one object to control custom-design sizing.";
      else if (!activeDesign) designSizingSummary.textContent = "The built-in model uses the plant object's dimensions.";
      else {
        const base = designBaseDimensions(activeDesign, machine);
        const mode = normalizedDesignScaleMode(machine.designScaleMode);
        const modeLabel = mode === "match" ? "kept synchronized" : mode === "stretch" ? "stretched independently" : "uniformly fitted";
        designSizingSummary.textContent = `Design ${base.w.toFixed(1)} × ${base.d.toFixed(1)} × ${base.h.toFixed(1)} ft · ${modeLabel}.`;
      }
    }
    const syncDesignButton = panel.querySelector("[data-editor-action='sync-design-dimensions']");
    if (syncDesignButton) syncDesignButton.disabled = selectionCount !== 1 || !activeDesign;

    const multiSelectionPanel = panel.querySelector("[data-multi-selection]");
    if (multiSelectionPanel) multiSelectionPanel.hidden = selectionCount < 2;
    const multiSelectionSummary = panel.querySelector("[data-multi-selection-summary]");
    if (multiSelectionSummary) {
      const hierarchyRoot = motionRoot(machine);
      const attached = selectionItems.some((item) => item.motionParentId || motionChildren(item.instanceId).length);
      multiSelectionSummary.textContent = selectionCount === 1
        ? "1 object selected. Shift-click or Ctrl-click other objects to add them."
        : attached && hierarchyRoot
          ? `${selectionCount} attached objects selected. Motion parent: ${hierarchyRoot.name}.`
          : `${selectionCount} objects selected. Choose a motion parent before attaching them.`;
    }
    const groupColor = panel.querySelector("[data-group-color]");
    if (groupColor) {
      groupColor.disabled = selectionCount === 0;
      groupColor.value = selectionItems[0]?.color || "#277d78";
    }
    const motionParentPicker = panel.querySelector("[data-motion-parent-picker]");
    if (motionParentPicker) {
      const previousValue = motionParentPicker.value;
      motionParentPicker.innerHTML = selectionItems.map((item) => (
        `<option value="${escapeHtml(item.instanceId)}">${escapeHtml(item.name)}</option>`
      )).join("");
      const existingRootId = motionRoot(machine)?.instanceId || "";
      const preferredParent = selectionItems.some((item) => item.instanceId === previousValue)
        ? previousValue
        : (selectionItems.some((item) => item.instanceId === existingRootId)
          ? existingRootId
          : (selectionItems.some((item) => item.instanceId === state.selectedMachineId)
            ? state.selectedMachineId
            : selectionItems[0]?.instanceId || ""));
      motionParentPicker.value = preferredParent;
      motionParentPicker.disabled = selectionCount < 2;
    }
    const motionActivePicker = panel.querySelector("[data-motion-active-picker]");
    if (motionActivePicker) {
      motionActivePicker.innerHTML = selectionItems.map((item) => (
        `<option value="${escapeHtml(item.instanceId)}">${escapeHtml(item.name)}</option>`
      )).join("");
      motionActivePicker.value = machine?.instanceId || selectionItems[0]?.instanceId || "";
      motionActivePicker.disabled = selectionCount < 2;
    }
    const ownAnimationToggle = panel.querySelector("[data-motion-own-animation]");
    if (ownAnimationToggle) {
      const root = motionRoot(machine);
      ownAnimationToggle.checked = machine ? machine.playOwnAnimation !== false : false;
      ownAnimationToggle.disabled = !machine || !machine.motionParentId || machine.instanceId === root?.instanceId;
      ownAnimationToggle.title = ownAnimationToggle.disabled
        ? "Choose an attached child as the active member to control its local animation layer."
        : "When enabled, this child keeps its own animation while inheriting every parent transform.";
    }
    const commonAnimationMode = selectionCount > 1 ? commonMachineValue(selectionItems, "animationMode") : { mixed: false, value: machine?.animationMode };
    const objectIsFourStep = !commonAnimationMode.mixed && commonAnimationMode.value === "fourStep";
    panel.querySelectorAll("[data-object-four-step]").forEach((element) => {
      element.hidden = !objectIsFourStep;
    });
    panel.querySelectorAll("[data-object-standard-pause]").forEach((element) => {
      element.hidden = objectIsFourStep;
    });
    const joinMotionButton = panel.querySelector("[data-editor-action='join-animation-group']");
    if (joinMotionButton) joinMotionButton.disabled = selectionCount < 2;
    const unjoinMotionButton = panel.querySelector("[data-editor-action='unjoin-animation-group']");
    if (unjoinMotionButton) {
      const groupIds = new Set(selectionItems.map((item) => item.animationGroupId).filter(Boolean));
      const hierarchyLinked = selectionItems.some((item) => item.motionParentId || motionChildren(item.instanceId).length);
      unjoinMotionButton.disabled = groupIds.size === 0 && !hierarchyLinked;
    }

    panel.querySelectorAll("[data-floor-field]").forEach((input) => {
      input.value = String(floor[input.dataset.floorField]);
    });
    panel.querySelectorAll("[data-column-grid-field]").forEach((input) => {
      input.value = String(columnGrid[input.dataset.columnGridField]);
    });
    panel.querySelectorAll("[data-roof-field]").forEach((input) => {
      input.value = String(state.roof[input.dataset.roofField]);
    });
    panel.querySelectorAll("[data-roof-check]").forEach((input) => {
      input.checked = Boolean(state.roof[input.dataset.roofCheck]);
    });
    panel.querySelectorAll("[data-wall-geometry-field]").forEach((input) => {
      input.value = String(state.wallGeometry[input.dataset.wallGeometryField]);
    });
    panel.querySelectorAll("[data-wall-geometry-check]").forEach((input) => {
      input.checked = Boolean(state.wallGeometry[input.dataset.wallGeometryCheck]);
    });
    const autoColumns = panel.querySelector("[data-column-grid-check='autoExtend']");
    if (autoColumns) autoColumns.checked = columnGrid.autoExtend !== false;
    structuralColumns();
    const columnSummary = panel.querySelector("[data-column-grid-summary]");
    if (columnSummary) {
      const spacingNote = structuralColumnMeta.limited
        ? ` Performance safeguard is using every ${structuralColumnMeta.stride}th grid line on this unusually large floor.`
        : "";
      columnSummary.textContent = `${structuralColumnMeta.baseCount} CAD columns + ${structuralColumnMeta.generatedCount} extension columns.${spacingNote}`;
      columnSummary.classList.toggle("warning", structuralColumnMeta.limited);
    }
    const selectedColumn = structuralColumns().find((column) => column.key === state.selectedColumnKey) || null;
    panel.querySelectorAll("[data-column-position-field]").forEach((input) => {
      const field = input.dataset.columnPositionField;
      input.disabled = !selectedColumn;
      input.value = selectedColumn ? String(Number(selectedColumn[field]).toFixed(3).replace(/\.?0+$/, "")) : "";
    });
    const selectedColumnSummary = panel.querySelector("[data-selected-column-summary]");
    if (selectedColumnSummary) selectedColumnSummary.textContent = selectedColumn
      ? `${selectedColumn.source === "cad" ? "CAD" : "Extended-grid"} pillar ${selectedColumn.key} selected. Drag it in the plant view or enter exact coordinates.`
      : "Select a visible pillar in the plant view, then drag it or enter exact coordinates.";
    panel.querySelectorAll("[data-column-selection-action]").forEach((button) => {
      button.disabled = !selectedColumn;
    });

    const overlaps = overlapPairs();
    const overlapSummary = panel.querySelector("[data-overlap-summary]");
    if (overlapSummary) {
      overlapSummary.textContent = overlaps.length
        ? `${overlaps.length} solid-object overlap${overlaps.length === 1 ? "" : "s"} detected.`
        : "No solid-object overlaps detected.";
      overlapSummary.classList.toggle("warning", overlaps.length > 0);
    }
    const separateButton = panel.querySelector("[data-editor-action='separate-selected']");
    if (separateButton) separateButton.disabled = selectionCount !== 1 || !machine || machine.collisionMode !== "solid" || !selectedHasOverlap(machine);

    const craneToggle = panel.querySelector("[data-crane-toggle]");
    if (craneToggle) {
      craneToggle.disabled = selectionCount !== 1 || !machine || machine.type === "bridgeCrane" || machine.type === "craneMachine";
      craneToggle.checked = Boolean(machine?.crane);
    }
    panel.querySelectorAll("[data-crane-field]").forEach((input) => {
      const field = input.dataset.craneField;
      input.disabled = selectionCount !== 1 || !machine?.crane;
      input.value = machine?.crane ? machine.crane[field] ?? "" : "";
    });

    const stage = currentStage();
    panel.querySelectorAll("[data-stage-field]").forEach((input) => {
      const field = input.dataset.stageField;
      input.value = field === "details" ? (stage?.details || []).join(", ") : stage?.[field] || "";
    });
    const earlier = panel.querySelector("[data-editor-action='stage-earlier']");
    const later = panel.querySelector("[data-editor-action='stage-later']");
    const remove = panel.querySelector("[data-editor-action='stage-delete']");
    if (earlier) earlier.disabled = state.stage <= 0;
    if (later) later.disabled = state.stage >= stages.length - 1;
    if (remove) remove.disabled = stages.length <= 2;

    const paste = panel.querySelector("[data-editor-action='paste']");
    if (paste) paste.disabled = !state.clipboard;
    const copyButton = panel.querySelector("[data-editor-action='copy']");
    if (copyButton) copyButton.disabled = selectionCount !== 1;
    const machineStudioButton = panel.querySelector("[data-editor-action='machine-studio']");
    if (machineStudioButton) machineStudioButton.disabled = selectionCount !== 1;
    const reverseAnimationButton = panel.querySelector("[data-editor-action='reverse-animation-path']");
    if (reverseAnimationButton) reverseAnimationButton.disabled = selectionCount !== 1;
    panel.querySelectorAll("[data-editor-tool]").forEach((button) => {
      button.classList.toggle("active", button.dataset.editorTool === state.editorTool);
    });
    panel.querySelectorAll("[data-wall-id]").forEach((input) => {
      input.checked = state.walls[input.dataset.wallId] !== false;
    });
    panel.querySelectorAll("[data-paint-stage]").forEach((input) => {
      const field = input.dataset.paintStage;
      input.innerHTML = stages.map((stage, index) => (
        `<option value="${escapeHtml(stage.id)}">${String(index + 1).padStart(2, "0")} · ${escapeHtml(stage.short)}</option>`
      )).join("");
      const requested = state.paint[field];
      input.value = stages.some((stage) => stage.id === requested)
        ? requested
        : (stages[Math.min(3, stages.length - 1)]?.id || stages[0]?.id || "");
    });
    panel.querySelectorAll("[data-paint-color]").forEach((input) => {
      input.value = state.paint[input.dataset.paintColor];
    });

    const objectSearch = panel.querySelector("[data-object-search]");
    const objectPicker = panel.querySelector("[data-object-picker]");
    if (objectPicker) {
      const query = objectSearch?.value.trim().toLowerCase() || "";
      const filteredObjects = machines
        .filter((item) => !query || `${item.name} ${item.type}`.toLowerCase().includes(query))
        .sort((first, second) => first.name.localeCompare(second.name));
      objectPicker.innerHTML = `<option value="">Choose an object…</option>${filteredObjects.map((item) => (
        `<option value="${escapeHtml(item.instanceId)}">${isFloorFeatureType(item.type) ? "Floor · " : ""}${escapeHtml(item.name)}${item.locked ? " · locked" : ""}${item.visible === false ? " · hidden" : ""}</option>`
      )).join("")}`;
      objectPicker.value = selectionCount === 1 ? (machine?.instanceId || "") : "";
    }
    panel.querySelectorAll("[data-editor-mode]").forEach((button) => {
      const active = button.dataset.editorMode === state.editorInteraction;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const snapSelect = panel.querySelector("[data-editor-snap]");
    if (snapSelect) snapSelect.value = String(state.snapSize);
    panel.querySelectorAll('[data-machine-field="x"], [data-machine-field="y"], [data-machine-field="z"], [data-machine-field="rotationX"], [data-machine-field="rotationY"], [data-machine-field="rotationZ"], [data-machine-scale]').forEach((input) => {
      input.step = String(Math.max(.01, Number(state.snapSize) || .1));
    });
    updateEditorHelp();
    updateHistoryButtons();
    updateRecoveryPanel(panel);
  }

  // Dragging can deliver hundreds of pointer events per second. Updating the
  // full inspector there rebuilt select lists, overlap summaries, and every
  // control. Keep the live path limited to the coordinates users are watching.
  function updateEditorLiveTransformFields() {
    const machine = selectedMachine();
    const panel = document.querySelector(".layout-editor");
    if (!machine || !panel) return;    ["x", "y", "z"].forEach((field) => {
      const input = panel.querySelector(`[data-machine-field='${field}']`);
      if (input && document.activeElement !== input) input.value = String(Number(machine[field] || 0));
    });
  }

  function deleteSelectedMachine() {
    const selection = selectedMachines();
    if (!selection.length) return;
    pushHistory();
    const ids = new Set(selection.map((machine) => machine.instanceId));
    machines = machines.filter((machine) => !ids.has(machine.instanceId));
    clearMachineSelection();
    persistLayout();
    updateEditorPanel();
    showToast(selection.length === 1 ? "Object removed." : `${selection.length} objects removed.`);
  }

  function copySelectedMachine() {
    const machine = selectedMachine();
    if (!machine) return;
    state.clipboard = clone(machine);
    updateEditorPanel();
    showToast("Object copied.");
  }

  function pasteMachine() {
    if (!state.clipboard) return;
    pushHistory();
    const pasted = normalizeMachine({
      ...clone(state.clipboard),
      id: uniqueId(state.clipboard.type),
      instanceId: uniqueId(state.clipboard.type),
      name: `${state.clipboard.name} copy`,
      short: `${state.clipboard.short || state.clipboard.name} copy`,
      custom: true,
      locked: false,
      animationGroupId: "",
      motionParentId: "",
      placement_status: "user_added",
      evidence: "Copied in the interactive layout editor.",
    }, machines.length);
    machines.push(pasted);
    setSingleSelection(pasted.instanceId);
    persistLayout();
    updateEditorPanel();
    showToast("Object pasted in the original position.");
  }

  function swapStageReferences(first, second) {
    machines.forEach((machine) => {
      ["reveal", "retire", "labelReveal", "labelRetire"].forEach((field) => {
        if (machine[field] === first) machine[field] = second;
        else if (machine[field] === second) machine[field] = first;
      });
    });
  }

  function moveCurrentStage(direction) {
    const target = state.stage + direction;
    if (target < 0 || target >= stages.length) return;
    pushHistory();
    [stages[state.stage], stages[target]] = [stages[target], stages[state.stage]];
    swapStageReferences(state.stage, target);
    state.stage = target;
    state.stageFloat = target;
    persistLayout();
    buildTimeline();
    setStage(target);
    updateEditorPanel();
    showToast("Timeline stage moved.");
  }

  function addTimelineStage() {
    pushHistory();
    const insertAt = state.stage + 1;
    machines.forEach((machine) => {
      if (machine.reveal >= insertAt) machine.reveal += 1;
      if (machine.retire >= insertAt && machine.retire < 99) machine.retire += 1;
      if (machine.labelReveal >= insertAt) machine.labelReveal += 1;
      if (machine.labelRetire >= insertAt && machine.labelRetire < 99) machine.labelRetire += 1;
    });
    stages.splice(insertAt, 0, {
      id: uniqueId("stage"),
      title: "New project stage",
      short: "New stage",
      era: "Custom phase",
      dateLabel: "",
      description: "Describe what changed during this phase of the plant project.",
      details: ["Custom stage"],
    });
    state.stage = insertAt;
    state.stageFloat = insertAt;
    persistLayout();
    buildTimeline();
    setStage(insertAt);
    updateEditorPanel();
    showToast("New timeline stage added.");
  }

  function deleteTimelineStage() {
    if (stages.length <= 2) return;
    pushHistory();
    const removed = state.stage;
    const removedStageId = stages[removed]?.id;
    stages.splice(removed, 1);
    machines.forEach((machine) => {
      if (machine.reveal === removed) machine.reveal = Math.max(0, removed - 1);
      else if (machine.reveal > removed) machine.reveal -= 1;
      if (machine.retire === removed) machine.retire = Math.max(machine.reveal, removed - 1);
      else if (machine.retire > removed && machine.retire < 99) machine.retire -= 1;
      if (machine.labelReveal === removed) machine.labelReveal = Math.max(0, removed - 1);
      else if (machine.labelReveal > removed) machine.labelReveal -= 1;
      if (machine.labelRetire === removed) machine.labelRetire = Math.max(machine.labelReveal, removed - 1);
      else if (machine.labelRetire > removed && machine.labelRetire < 99) machine.labelRetire -= 1;
    });
    state.stage = clamp(removed, 0, stages.length - 1);
    state.stageFloat = state.stage;
    const replacementPaintStageId = stages[state.stage]?.id || stages[0]?.id;
    if (state.paint.wallStageId === removedStageId) state.paint.wallStageId = replacementPaintStageId;
    if (state.paint.columnStageId === removedStageId) state.paint.columnStageId = replacementPaintStageId;
    persistLayout();
    buildTimeline();
    setStage(state.stage);
    updateEditorPanel();
    showToast("Timeline stage removed.");
  }

  function downloadJson(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function exportLayout() {
    const payload = {
      version: 6,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      source: equipmentData.source,
      sceneAnimationsInitialized: true,
      floorFeaturesInitialized: true,
      machines,
      processPointers: state.processPointers,
      processPointersInitialized: true,
      processConnections: state.processConnections,
      processConnectionsInitialized: true,
      stages,
      floor,
      columnGrid,
      hiddenColumns: [...state.hiddenColumns],
      hiddenColumnKeys: [...state.hiddenColumnKeys],
      columnOverrides,
      walls: state.walls,
      wallGeometry: state.wallGeometry,
      paint: state.paint,
      roof: state.roof,
      playbackSpeed: state.playbackSpeed,
      stageDurationSeconds: state.stageDurationSeconds,
    };
    downloadJson(payload, `monroe-glass-plant-layout-v${APP_VERSION}.json`);
    showToast("Layout JSON exported.");
  }

  function createPlant3mf(machineList, scaleDenominator, includeStructure) {
    if (!window.PlantThreeMf) throw new Error("3MF export is unavailable. Reload the page and try again.");
    const entries = [];
    const solids = [];
    machineList.forEach((machine) => {
      const design = machine.designId ? designLibrary[machine.designId] : null;
      if (design?.components?.length) {
        entries.push({
          design,
          transform: (point) => designLocalPointToWorld(machine, design, point, 1),
        });
      } else {
        solids.push({
          x: machine.x, y: machine.y, z: machine.z,
          w: machine.w, h: machine.h, d: machine.d,
          rotationX: machine.rotationX, rotationY: machine.rotationY ?? machine.rotation, rotationZ: machine.rotationZ,
          color: machine.color,
        });
      }
    });
    if (includeStructure) {
      const bounds = floorBounds();
      solids.push({ x:bounds[0], y:-.3, z:bounds[1], w:floor.width, h:.3, d:floor.length, color:colors.floor });
      displayedWallSections().forEach((wall) => {
        if (state.walls[wall.id] !== false) solids.push({ ...wall, color:state.paint.wallAfter });
      });
      const columnRoofProfile = displayedRoofProfile();
      structuralColumns().forEach((column) => {
        if (!isColumnHidden(column)) solids.push({ x:column.x-1.16, y:0, z:column.z-1.16, w:2.32, h:displayedColumnHeight(column, columnRoofProfile), d:2.32, color:state.paint.columnAfter });
      });
    }
    return window.PlantThreeMf.createLayout({ entries, solids, scaleDenominator, name: includeStructure ? "Monroe Glass Plant" : machineList[0]?.name || "Machine" });
  }

  function exportPlant3mf(selectedOnly = false) {
    try {
      const scaleDenominator = Number(document.querySelector("[data-3mf-scale]")?.value) || 100;
      const finalStage = Math.max(0, stages.length - 1);
      const source = selectedOnly
        ? selectedMachines().slice(0, 1)
        : machines.filter((machine) => machine.visible !== false && machine.reveal <= finalStage && machine.retire > finalStage && !isFloorFeatureType(machine.type));
      if (!source.length) throw new Error(selectedOnly ? "Select a machine before exporting it." : "There are no printable machines in the final layout.");
      const blob = createPlant3mf(source, scaleDenominator, !selectedOnly);
      const baseName = selectedOnly ? source[0].name : "monroe-glass-plant-layout";
      window.PlantThreeMf.download(blob, `${window.PlantThreeMf.safeName(baseName, "plant-model")}-1-to-${scaleDenominator}.3mf`);
      showToast(`${selectedOnly ? source[0].name : "Complete plant layout"} exported as a color 3MF at 1:${scaleDenominator}.`);
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "The 3MF could not be created.");
    }
  }

  function exportWorkspace() {
    if (!workspaceTransfer) {
      window.alert("Full workspace transfer is unavailable. Reload the page and try again.");
      return;
    }
    const payload = workspaceTransfer.createPayload(localStorage, {
      appVersion: APP_VERSION,
      sourceOrigin: window.location.origin || "local-file",
    });
    const itemCount = Object.keys(payload.items).length;
    if (!itemCount) {
      window.alert("No saved Monroe Glass Plant work was found in this browser location.");
      return;
    }
    downloadJson(payload, `monroe-glass-plant-workspace-${new Date().toISOString().slice(0, 10)}.json`);
    showToast(`Full workspace exported with ${itemCount} saved data section${itemCount === 1 ? "" : "s"}.`);
  }

  function parseStorageJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
  }

  function recoverySummary() {
    const currentLayout = parseStorageJson(STORAGE_KEY);
    const backupLayout = parseStorageJson(BACKUP_STORAGE_KEY);
    const currentDesigns = parseStorageJson(DESIGN_STORAGE_KEY);
    const backupDesigns = parseStorageJson(DESIGN_BACKUP_STORAGE_KEY);
    const publishRecovery = parseStorageJson(PUBLISH_RECOVERY_STORAGE_KEY);
    return {
      currentMachines: Array.isArray(currentLayout?.machines) ? currentLayout.machines.length : 0,
      backupMachines: Array.isArray(backupLayout?.machines) ? backupLayout.machines.length : 0,
      currentDesigns: currentDesigns?.designs && typeof currentDesigns.designs === "object" ? Object.keys(currentDesigns.designs).length : 0,
      backupDesigns: backupDesigns?.designs && typeof backupDesigns.designs === "object" ? Object.keys(backupDesigns.designs).length : 0,
      hasLayoutBackup: Array.isArray(backupLayout?.machines),
      hasDesignBackup: Boolean(backupDesigns?.designs && typeof backupDesigns.designs === "object"),
      hasPublishRecovery: Boolean(publishRecovery?.items && typeof publishRecovery.items === "object"),
    };
  }

  function updateRecoveryPanel(panel = document.querySelector(".layout-editor")) {
    if (!panel) return;
    const summary = recoverySummary();
    const message = panel.querySelector("[data-recovery-summary]");
    if (message) {
      message.textContent = `Current: ${summary.currentMachines} layout objects / ${summary.currentDesigns} saved designs. Previous layout backup: ${summary.backupMachines || "none"} objects. Design backup: ${summary.backupDesigns || "none"} designs.`;
    }
    const layoutButton = panel.querySelector("[data-editor-action='recover-layout-backup']");
    const designButton = panel.querySelector("[data-editor-action='recover-design-backup']");
    const publishButton = panel.querySelector("[data-editor-action='recover-publish-snapshot']");
    if (layoutButton) layoutButton.disabled = !summary.hasLayoutBackup;
    if (designButton) designButton.disabled = !summary.hasDesignBackup;
    if (publishButton) publishButton.disabled = !summary.hasPublishRecovery;
  }

  function protectThisEditorBrowser() {
    try {
      localStorage.setItem(EDITOR_PROFILE_KEY, "protected");
      window.monroeEditorAccess?.protectEditorProfile?.();
    } catch {}
  }

  function recoverStorageValue(sourceKey, targetKey, safetyKey, label) {
    const sourceValue = localStorage.getItem(sourceKey);
    if (!sourceValue) {
      window.alert(`No ${label} is available in this browser.`);
      return;
    }
    const currentValue = localStorage.getItem(targetKey);
    if (!window.confirm(`Restore the ${label}? The current value will be preserved as a pre-recovery safety copy before the page reloads.`)) return;
    try {
      if (currentValue) localStorage.setItem(safetyKey, currentValue);
      localStorage.setItem(targetKey, sourceValue);
      protectThisEditorBrowser();
      window.alert(`${label[0].toUpperCase()}${label.slice(1)} restored. The page will reload now.`);
      window.location.reload();
    } catch (error) {
      console.error(error);
      window.alert(`The ${label} could not be restored.`);
    }
  }

  function recoverPublishedWorkspaceSnapshot() {
    const recovery = parseStorageJson(PUBLISH_RECOVERY_STORAGE_KEY);
    if (!recovery?.items || typeof recovery.items !== "object") {
      window.alert("No pre-publish rescue snapshot is available in this browser.");
      return;
    }
    if (!window.confirm("Restore the workspace captured immediately before a published snapshot replaced it? Current layout/design data will be preserved as pre-recovery safety copies.")) return;
    try {
      const currentLayout = localStorage.getItem(STORAGE_KEY);
      const currentDesigns = localStorage.getItem(DESIGN_STORAGE_KEY);
      if (currentLayout) localStorage.setItem(PRE_RECOVERY_LAYOUT_KEY, currentLayout);
      if (currentDesigns) localStorage.setItem(PRE_RECOVERY_DESIGN_KEY, currentDesigns);
      Object.entries(recovery.items).forEach(([key, value]) => {
        if (typeof value === "string" && key.startsWith("monroe-glass-")) localStorage.setItem(key, value);
      });
      protectThisEditorBrowser();
      window.alert("The pre-publish workspace was restored. The page will reload now.");
      window.location.reload();
    } catch (error) {
      console.error(error);
      window.alert("The pre-publish workspace could not be restored.");
    }
  }

  async function importLayout(file) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload.machines) || !Array.isArray(payload.stages)) {
        throw new Error("The selected file is not a plant layout export.");
      }
      pushHistory();
      machines = loadSceneAwareMachines(payload);
      state.processPointers = normalizeProcessPointerAssignments(payload.processPointers, machines, {
        fillDefaults: payload.processPointersInitialized !== true,
      });
      state.processConnections = normalizeProcessConnections(payload.processConnections, state.processPointers, machines, {
        fillDefaults: payload.processConnectionsInitialized !== true,
      });
      state.selectedProcessConnectionKey = "";
      stages = normalizeStages(payload.stages);
      floor = normalizeFloor(payload.floor);
      columnGrid = normalizeColumnGrid(payload.columnGrid);
      state.hiddenColumns = new Set(payload.hiddenColumns || []);
      state.hiddenColumnKeys = new Set(payload.hiddenColumnKeys || []);
      columnOverrides = normalizeColumnOverrides(payload.columnOverrides);
      columnOverridesRevision += 1;
      invalidateStructuralColumns();
      state.walls = { ...defaultWalls, ...(payload.walls || {}) };
      state.wallGeometry = normalizeWallGeometry(payload.wallGeometry);
      state.paint = normalizePaintSettings(payload.paint);
      state.roof = normalizeRoofSettings(payload.roof);
      state.playbackSpeed = Number(payload.playbackSpeed) || 1;
      state.stageDurationSeconds = normalizeStageDuration(payload.stageDurationSeconds);
      state.stage = clamp(state.stage, 0, stages.length - 1);
      state.stageFloat = state.stage;
      clearMachineSelection();
      persistLayout();
      buildTimeline();
      setStage(state.stage);
      updateEditorPanel();
      showToast("Layout imported successfully.");
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "The layout file could not be imported.");
    }
  }

  async function importWorkspace(file) {
    if (!file) return;
    if (!workspaceTransfer) {
      window.alert("Full workspace transfer is unavailable. Reload the page and try again.");
      return;
    }
    try {
      const payload = workspaceTransfer.validatePayload(await file.text());
      const itemCount = Object.keys(payload.items).length;
      if (!window.confirm(`Import ${itemCount} saved workspace section${itemCount === 1 ? "" : "s"} from ${payload.sourceOrigin || "another browser location"}? This replaces matching saved data in this browser location.`)) return;
      workspaceTransfer.applyPayload(localStorage, payload);
      window.alert("Full workspace imported successfully. The site will reload with the transferred layout, machines, settings, and backups.");
      window.location.reload();
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "The workspace file could not be imported.");
    }
  }

  function setEditing(enabled) {
    if (enabled && window.monroeEditorAccess?.editingAllowed?.() === false) {
      showToast("Editing is locked. Open the private owner workspace first.");
      return;
    }
    if (enabled && !state.editing && !window.monroeEditorAccess?.hasAccess?.()) {
      window.monroeEditorAccess?.requestAccess?.().then((granted) => {
        if (granted) setEditing(true);
      });
      return;
    }
    state.editing = enabled;
    state.playing = false;
    state.previewObjectAnimations = !enabled;
    state.dragging = false;
    state.draggedMachineId = null;
    const panel = document.querySelector(".layout-editor");
    const button = document.querySelector("[data-toggle='editor']");
    const play = document.getElementById("play-timeline");
    canvas.closest(".model-frame")?.classList.toggle("editing",enabled);
    canvas.closest(".experience")?.classList.toggle("editing-layout",enabled);
    if (panel) panel.hidden = !enabled;
    if (button) {
      button.classList.toggle("active",enabled);
      button.setAttribute("aria-pressed",String(enabled));
      button.setAttribute("aria-label", enabled ? "Close layout editor" : "Edit layout");
      button.dataset.tooltip = enabled ? "Close layout editor" : "Edit layout";
      button.innerHTML = enabled ? "&#10005;" : "&#9998;";
    }
    if (play) play.hidden = enabled;
    if (enabled) {
      setStage(stages.length - 1);
      state.stageFloat = stages.length - 1;
    }
    requestAnimationFrame(() => updateCanvasSize(true));
    updateEditorHelp();
    updateEditorPanel();
  }

  function navigateAfterPlantRelease(target) {
    teardownPlantApplication();
    // Allow queued GPU commands and context-loss cleanup to finish before the
    // Designer requests another hardware context in this browser process.
    window.setTimeout(() => window.location.assign(target), 120);
  }

  function createEditorPanel(frame) {
    const typeOptions = [
      ["generic", "Generic machine"],
      ["genericBox", "General box"],
      ["aFrame", "A-frame glass cart"],
      ["aFrameTruck", "A-frame glass truck"],
      ["craneMachine", "Freestanding gantry crane"],
      ["bridgeCrane", "Overhead bridge crane"],
      ["glassRack", "Raw glass rack"],
      ["room", "Office / room"],
      ["person", "Team member marker"],
      ["cutting", "Barefoot cutting table"],
      ["waterjet", "Waterjet"],
      ["filtration", "Filtration equipment"],
      ["kodiak", "Kodiak"],
      ["denver", "Denver Surface CNC"],
      ["washer", "Zafferani glass washer"],
      ["furnace", "Tempering furnace"],
      ["cube", "Diamon-Fusion FuseCube"],
      ["wrapping", "Glass wrapping station"],
      ["shipping", "Shipping glass rack"],
      ["safetyLine", "Safety yellow floor line"],
      ["trench", "Utility trench"],
      ["floorDrain", "Square floor drain"],
      ["animatedGlass", "Animation · vertical glass"],
      ["animatedBox", "Animation · moving box"],
      ["animatedPerson", "Animation · walking team member"],
      ["animatedCart", "Animation · material cart"],
      ["animatedBeacon", "Animation · status beacon"],
    ];
    const typeMarkup = typeOptions.map(([value,labelText]) => `<option value="${value}">${labelText}</option>`).join("");
    const panel = document.createElement("section");
    panel.className = "layout-editor";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="editor-heading">
        <div><p>Plant model studio · v${APP_VERSION}</p><h3 data-editor-selection>Select an item</h3></div>
        <span>Saved locally</span>
      </div>
      <div class="editor-history" role="group" aria-label="Layout history">
        <button type="button" data-editor-action="undo" disabled>↶ Undo</button>
        <button type="button" data-editor-action="redo" disabled>↷ Redo</button>
      </div>
      <div class="editor-tools" role="group" aria-label="Editor selection mode">
        <button type="button" data-editor-tool="machines" class="active">Objects</button>
        <button type="button" data-editor-tool="pillars">Structure</button>
        <button type="button" data-editor-tool="timeline">Stages</button>
        <button type="button" data-editor-tool="project">Project</button>
      </div>

      <div data-editor-section="machines">
        <div class="object-editor-tabs" role="tablist" aria-label="Object editing sections">
          <button type="button" data-object-editor-tab="select" class="active" aria-selected="true">Select</button>
          <button type="button" data-object-editor-tab="transform" aria-selected="false">Transform</button>
          <button type="button" data-object-editor-tab="labels" aria-selected="false">Labels</button>
          <button type="button" data-object-editor-tab="pointers" aria-selected="false">Pointers</button>
          <button type="button" data-object-editor-tab="animation" aria-selected="false">Animation</button>
          <button type="button" data-object-editor-tab="add" aria-selected="false">Add</button>
        </div>
        <section data-object-editor-panel="select" class="object-editor-panel">
        <div class="editor-object-browser">
          <label>Find an object<input type="search" data-object-search placeholder="Search machines, rooms, racks…"></label>
          <label>Object list<select data-object-picker><option value="">Choose an object…</option></select></label>
          <div class="object-browser-actions">
            <button class="focus-selection-button" type="button" data-editor-action="focus" data-needs-selection>Frame selected object(s)</button>
            <button type="button" data-editor-action="select-production-glass">Select moving glass</button>
            <button type="button" data-editor-action="select-floor-feature">Select floor feature</button>
          </div>
          <p class="object-browser-help">Shift-click, Ctrl-click, or Command-click models to select multiple objects.</p>
        </div>
        <div class="multi-selection-panel" data-multi-selection hidden>
          <div>
            <strong>Multiple selection</strong>
            <p data-multi-selection-summary>Shift-click or Ctrl-click objects in the model to select them together.</p>
          </div>
          <label>Selected color<input type="color" data-group-color value="#277d78"></label>
          <div class="motion-parent-control">
            <label>Motion parent<select data-motion-parent-picker></select></label>
            <label>Active member<select data-motion-active-picker></select></label>
            <label class="motion-own-toggle"><input type="checkbox" data-motion-own-animation> Play the active member’s own animation on top of inherited motion</label>
            <p>The parent carries the attached objects. Each child can independently play or pause its own local animation while remaining attached.</p>
          </div>
          <div class="motion-group-actions">
            <button type="button" data-editor-action="join-animation-group">Attach to parent</button>
            <button type="button" data-editor-action="unjoin-animation-group">Separate motion</button>
          </div>
          <button type="button" data-editor-action="clear-selection">Clear selection</button>
        </div>
        <div class="editor-navigation">
          <div class="editor-mode-switch" role="group" aria-label="Editor interaction mode">
            <button type="button" data-editor-mode="select" class="active" aria-pressed="true">Select & move</button>
            <button type="button" data-editor-mode="navigate" aria-pressed="false">Navigate view</button>
          </div>
          <label>Movement snap<select data-editor-snap>
            <option value="0.01">0.01 ft</option>
            <option value="0.025">0.025 ft</option>
            <option value="0.05">0.05 ft</option>
            <option value="0.075">0.075 ft</option>
            <option value="0.1">0.1 ft</option>
            <option value="0.5">0.5 ft</option>
            <option value="1">1 ft</option>
            <option value="2">2 ft</option>
            <option value="5">5 ft</option>
          </select></label>
        </div>
        <div class="editor-nudge" role="group" aria-label="Nudge selected object">
          <button type="button" data-nudge="x-negative" data-needs-selection>← X</button>
          <button type="button" data-nudge="z-negative" data-needs-selection>↑ Z</button>
          <button type="button" data-nudge="z-positive" data-needs-selection>↓ Z</button>
          <button type="button" data-nudge="x-positive" data-needs-selection>X →</button>
          <button type="button" data-nudge="rotate-negative" data-needs-selection>↶ Y step</button>
          <button type="button" data-nudge="rotate-positive" data-needs-selection>Y step ↷</button>
        </div>
        </section>
        <section data-object-editor-panel="transform" class="object-editor-panel" hidden>
        <div class="editor-properties editor-transform-properties">
          <label class="wide">Name<input data-machine-field="name" data-needs-selection type="text"></label>
          <label class="wide">Object type<select data-machine-field="type" data-needs-selection>${typeMarkup}</select></label>
          <fieldset class="editor-transform-group wide"><legend>Position (ft)</legend><div>
            <label>X<input data-machine-field="x" data-needs-selection type="number" step="0.1"></label>
            <label>Y<input data-machine-field="y" data-needs-selection type="number" step="0.1"></label>
            <label>Z<input data-machine-field="z" data-needs-selection type="number" step="0.1"></label>
          </div></fieldset>
          <fieldset class="editor-transform-group wide"><legend>Rotation (degrees)</legend><div>
            <label>X<input data-machine-field="rotationX" data-needs-selection type="number" step="1"></label>
            <label>Y<input data-machine-field="rotationY" data-needs-selection type="number" step="1"></label>
            <label>Z<input data-machine-field="rotationZ" data-needs-selection type="number" step="1"></label>
          </div></fieldset>
          <fieldset class="editor-transform-group wide"><legend>Dimensions (ft)</legend><div>
            <label>Width<input data-machine-field="w" data-needs-selection type="number" min="0.01" step="0.01"></label>
            <label><span data-depth-label>Depth</span><input data-machine-field="d" data-needs-selection type="number" min="0.01" step="0.01"></label>
            <label>Height<input data-machine-field="h" data-needs-selection type="number" min="0.01" step="0.01"></label>
          </div></fieldset>
          <fieldset class="editor-transform-group wide scale-control-panel"><legend>Scale</legend>
            <div class="scale-mode-selector" role="group" aria-label="Scaling mode">
              <button type="button" data-machine-scale-mode="uniform" aria-pressed="true">Uniform</button>
              <button type="button" data-machine-scale-mode="individual" aria-pressed="false">Individual axes</button>
            </div>
            <div class="scale-value-fields scale-uniform-fields" data-scale-fields="uniform">
              <label>Uniform scale (%)<input data-machine-scale="uniform" data-needs-selection type="number" min="1" max="10000" step="1" placeholder="100.00"></label>
            </div>
            <div class="scale-value-fields scale-axis-fields" data-scale-fields="individual" hidden>
              <label>X scale (%)<input data-machine-scale="x" data-needs-selection type="number" min="1" max="10000" step="1" placeholder="100.00"></label>
              <label>Y scale (%)<input data-machine-scale="y" data-needs-selection type="number" min="1" max="10000" step="1" placeholder="100.00"></label>
              <label>Z scale (%)<input data-machine-scale="z" data-needs-selection type="number" min="1" max="10000" step="1" placeholder="100.00"></label>
            </div>
            <p data-scale-mode-help>Uniform scaling keeps width, height, and depth proportional.</p>
            <p>Dimensions above show the final size in feet. Scale percentages are relative to the object's original or linked-design size.</p>
          </fieldset>
          <label>Appears at<select data-machine-field="reveal" data-stage-select data-needs-selection></select></label>
          <label>Disappears after<select data-machine-field="retire" data-stage-select data-allow-never data-needs-selection></select></label>
          <label>Color<input data-machine-field="color" data-needs-selection type="color"></label>
          <label>Collision check<select data-machine-field="collisionMode" data-needs-selection>
            <option value="solid">Solid · warn on overlap</option>
            <option value="ignore">Ignore overlaps</option>
          </select></label>
          <label class="wide">Design preset<select data-design-picker data-needs-selection></select></label>
          <label class="wide">Design sizing<select data-machine-field="designScaleMode" data-needs-selection>
            <option value="preserve">Preserve proportions · fit uniformly</option>
            <option value="match">Match design dimensions · keep synced</option>
            <option value="stretch">Stretch to plant object · independent axes</option>
          </select></label>
        </div>
        <div class="machine-design-actions">
          <button type="button" data-editor-action="machine-studio">Open Machine Design Studio</button>
          <button type="button" data-editor-action="sync-design-dimensions">Sync plant dimensions to design</button>
          <span data-design-sizing-summary>Edit the design on its dedicated page. Preserve proportions is the recommended default.</span>
        </div>
        <div class="overlap-tools">
          <p data-overlap-summary>No solid-object overlaps detected.</p>
          <div>
            <button type="button" data-editor-action="find-overlap">Find overlap</button>
            <button type="button" data-editor-action="separate-selected" data-needs-selection>Separate selected</button>
            <button type="button" data-editor-action="resolve-overlaps">Resolve all</button>
          </div>
        </div>
        <div class="editor-checks">
          <label><input type="checkbox" data-machine-check="visible"> Visible</label>
          <label><input type="checkbox" data-machine-check="showLabel"> Label</label>
          <label><input type="checkbox" data-machine-check="locked"> Lock position</label>
        </div>
        <fieldset class="crane-controls">
          <legend>Attached overhead crane</legend>
          <label class="crane-toggle"><input type="checkbox" data-crane-toggle> Enable attached crane</label>
          <div>
            <label>System<input type="text" data-crane-field="system"></label>
            <label>Capacity<input type="text" data-crane-field="capacity"></label>
            <label>Rail height<input type="number" min="4" step="0.5" data-crane-field="height"></label>
          </div>
        </fieldset>
        </section>
        <section data-object-editor-panel="labels" class="object-editor-panel label-editor-panel" hidden>
        <fieldset class="label-controls label-controls-revamp">
          <legend>3D machine label</legend>
          <p data-label-source-summary>Select one object to edit its label.</p>

          <div class="label-settings-section">
            <div class="label-settings-heading"><strong>Content</strong><span>What the physical billboard says and where it is used.</span></div>
            <label class="wide">Main label<input type="text" data-label-field="labelText" data-needs-selection placeholder="Uses the machine name"></label>
            <label class="wide">Abbreviated label<input type="text" data-label-field="labelAbbreviation" data-needs-selection placeholder="Automatically shortened when left blank"></label>
            <div class="label-toggle-stack">
              <label class="process-pointer-toggle"><input type="checkbox" data-label-check="labelUppercase" data-needs-selection> Uppercase label</label>
              <label class="process-pointer-toggle"><input type="checkbox" data-label-check="labelShowToday" data-needs-selection> Show in Today Overview · Necessary labels</label>
            </div>
          </div>

          <div class="label-settings-section">
            <div class="label-settings-heading"><strong>Appearance</strong><span>Size, type and physical sign treatment.</span></div>
            <div class="label-color-picker" data-label-color-picker>
              <button type="button" class="label-color-trigger" data-label-color-trigger data-needs-selection aria-expanded="false">
                <span class="label-color-preview" aria-hidden="true">
                  <i data-label-color-preview-background></i><i data-label-color-preview-accent></i><i data-label-color-preview-text></i>
                </span>
                <span class="label-color-trigger-copy"><strong data-label-color-name>Custom colors</strong><small>Click to choose a preset or make a custom palette</small></span>
                <span class="label-color-chevron" aria-hidden="true">⌄</span>
              </button>
              <div class="label-color-popover" data-label-color-popover hidden>
                <div class="label-custom-color-grid">
                  <label>Background<input type="color" data-label-field="labelBackgroundColor" data-needs-selection value="#141c20"></label>
                  <label>Text<input type="color" data-label-field="labelTextColor" data-needs-selection value="#ffffff"></label>
                  <label>Accent / leader<input type="color" data-label-field="labelLineColor" data-needs-selection value="#52b7aa"></label>
                </div>
                <div class="label-preset-footer">
                  <span>Preset colors</span>
                  <div class="label-color-swatches" role="group" aria-label="Label color presets">
                    <button type="button" data-label-color-swatch="plant-teal" data-needs-selection title="Plant teal" aria-label="Plant teal"><i style="--swatch:#52b7aa"></i></button>
                    <button type="button" data-label-color-swatch="glass-blue" data-needs-selection title="Glass blue" aria-label="Glass blue"><i style="--swatch:#65b8d4"></i></button>
                    <button type="button" data-label-color-swatch="process-blue" data-needs-selection title="Process blue" aria-label="Process blue"><i style="--swatch:#5b8def"></i></button>
                    <button type="button" data-label-color-swatch="process-green" data-needs-selection title="Process green" aria-label="Process green"><i style="--swatch:#62c782"></i></button>
                    <button type="button" data-label-color-swatch="amber" data-needs-selection title="Amber" aria-label="Amber"><i style="--swatch:#e6b84a"></i></button>
                    <button type="button" data-label-color-swatch="orange" data-needs-selection title="Orange" aria-label="Orange"><i style="--swatch:#e8864c"></i></button>
                    <button type="button" data-label-color-swatch="red" data-needs-selection title="Alert red" aria-label="Alert red"><i style="--swatch:#e66a73"></i></button>
                    <button type="button" data-label-color-swatch="purple" data-needs-selection title="Purple" aria-label="Purple"><i style="--swatch:#9b82df"></i></button>
                    <button type="button" data-label-color-swatch="steel" data-needs-selection title="Steel" aria-label="Steel"><i style="--swatch:#9aa7ad"></i></button>
                  </div>
                </div>
              </div>
            </div>
            <div class="label-format-grid label-appearance-grid">
              <label>Size (%)<input type="number" data-label-field="labelSizePercent" data-needs-selection min="5" step="5" value="100"></label>
              <label>Weight<select data-label-field="labelFontWeight" data-needs-selection><option value="regular">Regular</option><option value="semibold">Semibold</option><option value="bold">Bold</option></select></label>
              <label>Text glow (%)<input type="number" data-label-field="labelGlowPercent" data-needs-selection min="0" max="100" step="5"></label>
              <label>Sign depth (ft)<input type="number" data-label-field="labelDepthFeet" data-needs-selection min="0.1" max="2" step="0.05"></label>
              <label>Raised text (ft)<input type="number" data-label-field="labelTextExtrudeFeet" data-needs-selection min="0.02" max="0.3" step="0.005"></label>
            </div>
            <p class="label-help">Size has no upper limit. Enter any percentage you need for unusually small or large signs.</p>
          </div>

          <div class="label-settings-section">
            <div class="label-settings-heading"><strong>Position</strong><span>0–100% is inside the machine. Values below 0 or above 100 move the label outside its bounds, just like process-route endpoints.</span></div>
            <div class="label-format-grid label-position-grid">
              <label>Label X (%)<input type="number" data-label-field="labelAnchorXPercent" data-needs-selection min="-1000" max="1100" step="5"></label>
              <label>Label Y (%)<input type="number" data-label-field="labelAnchorYPercent" data-needs-selection min="-1000" max="1100" step="5"></label>
              <label>Label Z (%)<input type="number" data-label-field="labelAnchorZPercent" data-needs-selection min="-1000" max="1100" step="5"></label>
              <label>Extra lift Y (ft)<input type="number" data-label-field="labelHeightOffset" data-needs-selection min="0" max="200" step="0.5"></label>
              <label>Facing offset (°)<input type="number" data-label-field="labelRotationY" data-needs-selection min="-180" max="180" step="5"></label>
            </div>
            <label class="process-pointer-toggle label-camera-toggle"><input type="checkbox" data-label-check="labelTurnToCamera" data-needs-selection> Gently turn the label toward the camera</label>
          </div>

          <details class="label-advanced-settings">
            <summary>Advanced motion & leader</summary>
            <div class="label-format-grid">
              <label>Camera follow speed (%)<input type="number" data-label-field="labelTurnSpeedPercent" data-needs-selection min="25" max="200" step="5"></label>
              <label>Zoom min size (%)<input type="number" data-label-field="labelZoomMinPercent" data-needs-selection min="70" max="100" step="1"></label>
              <label>Zoom max size (%)<input type="number" data-label-field="labelZoomMaxPercent" data-needs-selection min="100" max="140" step="1"></label>
              <label>Leader width<input type="number" data-label-field="labelLineWidth" data-needs-selection min="0.5" max="10" step="0.25"></label>
              <label>Leader opacity (%)<input type="number" data-label-field="labelLineOpacity" data-needs-selection min="10" max="100" step="5"></label>
            </div>
          </details>

          <details class="label-advanced-settings process-step-label-controls">
            <summary>Necessary process-step label</summary>
            <p>Add a compact numbered process label for this machine when needed.</p>
            <label class="process-pointer-toggle"><input type="checkbox" data-label-check="processStepLabelEnabled" data-needs-selection> Add custom process-step label</label>
            <div class="label-format-grid">
              <label>Step number<input type="number" data-label-field="processStepNumber" data-needs-selection min="1" max="99" step="1" placeholder="1"></label>
              <label>Process label text<input type="text" data-label-field="processStepLabelText" data-needs-selection maxlength="80" placeholder="Uses machine name"></label>
            </div>
          </details>

          <div class="label-action-grid">
            <button type="button" data-editor-action="reset-selected-label" data-needs-selection>Reset label text</button>
            <button type="button" data-editor-action="reset-label-world-position" data-needs-selection>Reset label position</button>
            <button type="button" data-editor-action="refresh-labels">Update linked labels</button>
            <button type="button" data-editor-action="reset-all-labels">Reset all labels to machine names</button>
          </div>
          <p class="label-help label-cleanup-note">Legacy screen-space timing, importance and duplicate X/Z offset controls were removed from this panel because the active labels are physical 3D billboards. Existing saved values remain readable for backward compatibility.</p>
        </fieldset>
        </section>
        <section data-object-editor-panel="pointers" class="object-editor-panel process-pointer-panel" hidden>
          <div class="process-pointer-intro">
            <div><strong>Flowing floor-route editor</strong><span data-process-pointer-summary>Select a machine-to-machine floor route here. This tab does not edit the small machine-label callout or its leader.</span></div>
          </div>
          <div class="process-pointer-note"><strong>What this edits</strong><span>The production route is now a glowing animated path on the floor. Select a route below to retarget its machines, move its floor endpoints, bend its two turn controls, change its curve, glow, speed, and route tag.</span></div>
          <fieldset class="process-pointer-controls process-connection-picker">
            <legend>1 · Choose the process line</legend>
            <label class="wide">Line to edit<select data-process-connection-select><option value="">No object-to-object process pointers</option></select></label>
            <label class="process-pointer-toggle"><input type="checkbox" data-process-connection-check="visible"> Show selected object-to-object line</label>
            <div class="process-pointer-actions">
              <button type="button" data-editor-action="remove-process-connection">Remove selected line</button>
            </div>
          </fieldset>
          <fieldset class="process-pointer-controls process-connection-picker">
            <legend>2 · Point this line to any object</legend>
            <p>Retarget the selected line directly. Both ends can be any placed machine, person, rack, truck, table, custom object, or other layout object.</p>
            <label class="wide">Source object<select data-process-connection-edit-source><option value="">Choose source object</option></select></label>
            <label class="wide">Destination object<select data-process-connection-edit-target><option value="">Choose destination object</option></select></label>
          </fieldset>
          <fieldset class="process-pointer-controls process-connection-picker">
            <legend>3 · Add another object-to-object pointer</legend>
            <p>Create another independent process pointer between any two placed objects.</p>
            <label class="wide">Source object<select data-process-connection-source><option value="">Choose source object</option></select></label>
            <label class="wide">Destination object<select data-process-connection-target><option value="">Choose destination object</option></select></label>
            <div class="process-pointer-actions"><button type="button" data-editor-action="add-process-connection">Add process line</button></div>
          </fieldset>
          <fieldset class="process-pointer-controls">
            <legend>4 · Start point · source object</legend>
            <p>X and Z place the floor-route start relative to the source object. Values below 0% or above 100% move it outside the object. The range now extends to -1000% / 1100%. You can also drag the S handle directly on the floor. Y is retained for older saved routes; the flowing route height is controlled below.</p>
            <div class="process-pointer-grid">
              <label>Start X (%)<input type="number" data-process-connection-field="startAnchorXPercent" min="-1000" max="1100" step="5"></label>
              <label>Start Y (%)<input type="number" data-process-connection-field="startAnchorYPercent" min="-1000" max="1100" step="5"></label>
              <label>Start Z (%)<input type="number" data-process-connection-field="startAnchorZPercent" min="-1000" max="1100" step="5"></label>
            </div>
            <div class="process-pointer-actions"><button type="button" data-editor-action="center-process-connection-start">Center source point</button></div>
          </fieldset>
          <fieldset class="process-pointer-controls">
            <legend>5 · End point · destination object</legend>
            <p>X and Z place the floor-route end relative to the destination object. Values below 0% or above 100% move it outside the object. The range now extends to -1000% / 1100%. You can also drag the E handle directly on the floor. Y is retained for older saved routes; the flowing route height is controlled below.</p>
            <div class="process-pointer-grid">
              <label>End X (%)<input type="number" data-process-connection-field="endAnchorXPercent" min="-1000" max="1100" step="5"></label>
              <label>End Y (%)<input type="number" data-process-connection-field="endAnchorYPercent" min="-1000" max="1100" step="5"></label>
              <label>End Z (%)<input type="number" data-process-connection-field="endAnchorZPercent" min="-1000" max="1100" step="5"></label>
            </div>
            <div class="process-pointer-actions"><button type="button" data-editor-action="center-process-connection-end">Center destination point</button></div>
          </fieldset>
          <fieldset class="process-pointer-controls process-floor-flow-controls">
            <legend>6 · Exact floor path pivots</legend>
            <p>Each pivot is an exact plant-floor X / Z coordinate. Add as many turn points as needed, remove any point, type exact coordinates, or drag the numbered handles directly on the floor. The route always follows S → pivots in order → E.</p>
            <div class="process-pivot-list" data-process-pivot-list><p class="process-route-tag-preview">Select a process route to edit its exact pivot coordinates.</p></div>
            <div class="process-pointer-actions process-pivot-actions">
              <button type="button" data-editor-action="add-process-pivot">Add pivot point</button>
              <button type="button" data-editor-action="clear-process-pivots">Remove all pivots</button>
            </div>
            <div class="process-pointer-grid process-flow-behavior-grid">
              <label>Curve / rounding (%)<input type="number" data-process-connection-field="flowCurvePercent" min="0" max="100" step="5"></label>
              <label>Route Y height (ft)<input type="number" data-process-connection-field="flowFloorHeight" min="0.02" max="30" step="0.02"></label>
              <label>Flow speed (stable world rate)<input type="number" data-process-connection-field="flowSpeed" min="0" max="180" step="2"></label>
              <label>Glow strength (%)<input type="number" data-process-connection-field="flowGlow" min="0" max="200" step="5"></label>
            </div>
            <p class="process-route-tag-preview">S / E can still be dragged far outside the machines. Numbered pivot handles use exact X / Z coordinates and can also be dragged directly. Raising Route Y lifts the path off the floor and progressively turns the flat ribbon into a physical 3D rail.</p>
          </fieldset>
          <fieldset class="process-pointer-controls">
            <legend>7 · Flow appearance</legend>
            <div class="process-pointer-grid">
              <label>Color preset<select data-process-color-preset>
                <option value="custom">Custom</option>
                <option value="plant-teal">Plant teal</option>
                <option value="glass-blue">Glass blue</option>
                <option value="process-blue">Process blue</option>
                <option value="process-green">Process green</option>
                <option value="amber">Amber</option>
                <option value="orange">Orange</option>
                <option value="red">Alert red</option>
                <option value="purple">Purple</option>
                <option value="steel">Steel</option>
              </select></label>
              <label>Custom color<input type="color" data-process-connection-field="color"></label>
              <label>Core width (world scale)<input type="number" data-process-connection-field="width" min="0.5" max="12" step="0.25"></label>
              <label>Opacity (%)<input type="number" data-process-connection-field="opacity" min="5" max="100" step="5"></label>
              <label>Flow pattern<select data-process-connection-field="style"><option value="solid">Continuous glow</option><option value="dashed">Moving segments</option><option value="dotted">Moving dots</option></select></label>
              <label>Corner style<select data-process-connection-field="shape"><option value="straight">Rounded / arched</option><option value="elbow">Sharp turns</option></select></label>
              <label>Destination marker<select data-process-connection-field="endStyle"><option value="arrow">Arrow</option><option value="dot">Dot</option><option value="ring">Ring</option><option value="none">None</option></select></label>
              <label>Marker size<input type="number" data-process-connection-field="endSize" min="1" max="14" step="0.5"></label>
            </div>
            <div class="process-pointer-actions"><button type="button" data-editor-action="reset-process-connection">Reset selected flow path</button></div>
          </fieldset>
          <fieldset class="process-pointer-controls">
            <legend>8 · Optional custom route tag</legend>
            <label class="process-pointer-toggle"><input type="checkbox" data-process-connection-check="tagVisible"> Show route tag on this line</label>
            <label class="wide process-route-tag-text">Route tag text<input type="text" data-process-connection-field="tagText" maxlength="120" placeholder="Automatic numbered machine labels are shown by default"></label>
            <p class="process-route-tag-preview" data-process-route-tag-preview>Select a line to edit its route-tag text.</p>
            <p>Type any text you want. Leave it blank to use the automatic source → destination wording.</p>
            <div class="process-pointer-grid">
              <label>Lift (ft)<input type="number" data-process-connection-field="tagLift" min="0" max="60" step="0.5"></label>
              <label>Tag X (px)<input type="number" data-process-connection-field="tagScreenOffsetX" min="-500" max="500" step="2"></label>
              <label>Tag Y (px)<input type="number" data-process-connection-field="tagScreenOffsetY" min="-500" max="500" step="2"></label>
            </div>
          </fieldset>
          <fieldset class="process-pointer-controls process-node-assignment">
            <legend>Optional Necessary-label process role</legend>
            <p>This is separate from pointer endpoints. Use it only when a selected object should represent Cutting, Polisher, Waterjet, etc. for the Today Necessary-label mode. Object-to-object pointers can connect to anything whether or not it has a process role.</p>
            <label class="wide">Selected machine process role<select data-process-pointer-assignment data-needs-selection>
              <option value="">Not in process flow</option>
              <option value="cutting">Cutting</option>
              <option value="polisher">Polisher</option>
              <option value="denver-cnc">Denver CNC</option>
              <option value="waterjet">Waterjet</option>
              <option value="washer">Washer</option>
              <option value="tempering">Tempering Line</option>
              <option value="wrap">Wrap</option>
              <option value="glass-truck">Glass Truck</option>
              <option value="rack">Rack</option>
            </select></label>
            <div class="process-pointer-actions"><button type="button" data-editor-action="remove-process-node" data-needs-selection>Remove selected machine from process flow</button></div>
          </fieldset>
          <div class="process-pointer-note"><strong>Machine labels are separate</strong><span>To edit a small machine label box or its short leader, use <b>Objects → Label</b>. The glowing floor route and route tag remain independent from those machine-label settings.</span></div>
        </section>
        <section data-object-editor-panel="animation" class="object-editor-panel" hidden>
        <fieldset class="object-animation-controls">
          <legend>Object animation</legend>
          <div class="animation-preview-row">
            <label><input type="checkbox" data-animation-check="animationEnabled"> Enable this animation</label>
            <button type="button" data-editor-action="preview-animations">Preview animations</button>
          </div>
          <div class="animation-control-grid">
            <label>Motion<select data-animation-field="animationMode">
              <option value="none">None</option>
              <option value="loop">Loop across a path</option>
              <option value="pingPong">Move back and forth</option>
              <option value="fourStep">Four-step path</option>
              <option value="spin">Rotate continuously</option>
              <option value="bob">Bob up and down</option>
              <option value="pulse">Pulse size</option>
              <option value="blink">Blink visibility</option>
            </select></label>
            <label>Axis<select data-animation-field="animationAxis">
              <option value="x">X axis</option><option value="y">Y axis</option><option value="z">Z axis</option><option value="all">All axes</option>
            </select></label>
            <label>Distance / amount 1<input data-animation-field="animationDistance" type="number" step="0.5"></label>
            <label data-object-four-step hidden>Axis 2<select data-animation-field="animationSecondaryAxis"><option value="x">X axis</option><option value="y">Y axis</option><option value="z">Z axis</option></select></label>
            <label data-object-four-step hidden>Distance 2<input data-animation-field="animationSecondaryDistance" type="number" step="0.5"></label>
            <label>Speed (cycles/sec)<input data-animation-field="animationSpeed" type="number" min="0" step="0.01"></label>
            <label data-object-standard-pause>Pause after cycle / endpoint (sec)<input data-animation-field="animationPauseSeconds" type="number" min="0" step="0.1"></label>
            <label data-object-four-step hidden>Pause after step 1<input data-animation-field="animationStep1PauseSeconds" type="number" min="0" step="0.1"><small>Axis 1 outbound</small></label>
            <label data-object-four-step hidden>Pause after step 2<input data-animation-field="animationStep2PauseSeconds" type="number" min="0" step="0.1"><small>Axis 2 outbound</small></label>
            <label data-object-four-step hidden>Pause after step 3<input data-animation-field="animationStep3PauseSeconds" type="number" min="0" step="0.1"><small>Axis 1 return</small></label>
            <label data-object-four-step hidden>Pause after step 4<input data-animation-field="animationStep4PauseSeconds" type="number" min="0" step="0.1"><small>Axis 2 return</small></label>
            <label>Phase offset °<input data-animation-field="animationPhase" type="number" step="5"></label>
          </div>
          <button type="button" data-editor-action="reverse-animation-path" data-needs-selection>Reverse movement direction</button>
          <p>The current object position is the animation origin. Movement axes are local to the object, so rotating the object rotates the direction of travel. Four-step path moves along axis 1, then axis 2, returns along axis 1, and returns along axis 2—for example up, forward, down, backward. Each of the four path corners has its own pause timer, so outbound and return waits can be tuned independently. Animations pause automatically while editing unless Preview animations is enabled.</p>
        </fieldset>
        </section>
        <section data-object-editor-panel="add" class="object-editor-panel" hidden>
        <div class="editor-actions">
          <button type="button" data-editor-action="copy" data-needs-selection>Copy</button>
          <button type="button" data-editor-action="paste" disabled>Paste</button>
          <button type="button" data-editor-action="delete" data-needs-selection>Remove</button>
        </div>
        <details class="editor-add" open>
          <summary>Add to the 3D model</summary>
          <section class="editor-add-design" aria-label="Add a saved Machine Design Studio machine">
            <div class="editor-add-title">
              <div><strong>Saved designer machine</strong><span>Insert a reusable machine created in Machine Design Studio.</span></div>
              <button type="button" data-editor-action="refresh-add-designs">Refresh</button>
            </div>
            <label>Machine design<select id="new-design-machine"><option value="">No saved custom designs</option></select></label>
            <label>Plant name<input type="text" id="new-design-machine-name" placeholder="Uses the design name"></label>
            <div class="editor-add-grid">
              <label>Appearance stage<select id="new-design-machine-stage"></select></label>
              <label>Placement<select id="new-design-machine-placement">
                <option value="open">Find open floor space</option>
                <option value="view">Center of current view</option>
                <option value="plant">Plant center</option>
              </select></label>
            </div>
            <p class="editor-add-status" data-add-design-status>Custom designs saved in Machine Design Studio appear here automatically.</p>
            <div class="editor-add-actions">
              <button type="button" data-editor-action="open-new-machine-designer">Create or edit designs</button>
              <button type="button" class="primary" data-editor-action="add-design-machine">Add designer machine</button>
            </div>
          </section>
          <details class="editor-add-standard">
            <summary>Standard machines, objects, animations, and floor features</summary>
            <input type="text" id="new-machine-name" placeholder="Optional custom name">
            <div><select id="new-machine-type">
              <optgroup label="Photo-refined machines">
                <option value="cutting">Barefoot cutting tables</option>
                <option value="kodiak">KODIAK 10-45 polisher</option>
                <option value="waterjet">SQ4020 waterjet</option>
                <option value="filtration">Waterjet pump & filtration</option>
                <option value="denver">Denver Surface CNC</option>
                <option value="washer">Zafferani glass washer</option>
                <option value="furnace">Tempering furnace</option>
                <option value="cube">Diamon-Fusion FuseCube</option>
                <option value="wrapping">Glass wrapping station</option>
                <option value="shipping">Shipping glass rack</option>
              </optgroup>
              <optgroup label="Floor features">
                <option value="safetyLine">Safety yellow floor line</option>
                <option value="trench">Utility trench</option>
                <option value="floorDrain">Square floor drain</option>
              </optgroup>
              <optgroup label="Animations">
                <option value="animatedGlass">Vertical glass · back and forth</option>
                <option value="animatedBox">Material box · back and forth</option>
                <option value="animatedPerson">Team member · walking path</option>
                <option value="animatedCart">Material cart · shuttle path</option>
                <option value="animatedBeacon">Status beacon · blinking</option>
              </optgroup>
              <optgroup label="General objects">
                <option value="generic">Generic machine</option>
                <option value="genericBox">General box</option>
                <option value="aFrame">A-frame glass cart</option>
                <option value="aFrameTruck">A-frame glass truck</option>
                <option value="craneMachine">Freestanding gantry crane</option>
                <option value="bridgeCrane">Overhead bridge crane</option>
                <option value="glassRack">Raw glass rack</option>
                <option value="room">Office / room</option>
                <option value="person">Team member marker</option>
              </optgroup>
            </select><button type="button" data-editor-action="add">Add standard object</button></div>
          </details>
        </details>
        </section>
      </div>

      <div data-editor-section="pillars" hidden>
        <div class="editor-callout">Click a visible pillar to select it, then drag to move it. Middle-drag still pans and right-drag still orbits. Extended floor sections continue the established structural bay grid automatically.</div>
        <fieldset class="column-position-controls">
          <legend>Selected pillar</legend>
          <p data-selected-column-summary>Select a visible pillar in the plant view, then drag it or enter exact coordinates.</p>
          <div class="column-grid-values">
            <label>X position (ft)<input type="number" step="0.01" data-column-position-field="x" disabled></label>
            <label>Z position (ft)<input type="number" step="0.01" data-column-position-field="z" disabled></label>
          </div>
          <div class="floor-actions">
            <button type="button" data-column-selection-action data-editor-action="reset-pillar-position" disabled>Reset position</button>
            <button type="button" data-column-selection-action data-editor-action="remove-pillar" disabled>Remove pillar</button>
          </div>
        </fieldset>
        <fieldset class="floor-controls">
          <legend>Floor layout dimensions</legend>
          <div>
            <label>Width (ft)<input type="number" min="40" max="5000" step="5" data-floor-field="width"></label>
            <label>Length (ft)<input type="number" min="40" max="5000" step="5" data-floor-field="length"></label>
            <label>Center X<input type="number" step="1" data-floor-field="centerX"></label>
            <label>Center Z<input type="number" step="1" data-floor-field="centerZ"></label>
          </div>
          <div class="floor-actions">
            <button type="button" data-editor-action="floor-fit">Fit floor around objects</button>
            <button type="button" data-editor-action="floor-cad">Restore CAD floor size</button>
          </div>
          <p class="floor-limit-note">Supported range: 40–5,000 ft. Grid spacing adapts automatically on large floors.</p>
        </fieldset>
        <fieldset class="roof-controls">
          <legend>Roof and truss configuration</legend>
          <p>The left section uses the lower roof height; the right section begins at the split point and uses the higher roof.</p>
          <div class="roof-checks">
            <label><input type="checkbox" data-roof-check="enabled"> Roof enabled in first person</label>
            <label><input type="checkbox" data-roof-check="overviewVisible"> Show roof in overview</label>
          </div>
          <div class="roof-control-grid">
            <label>Split from left (%)<input type="number" min="10" max="90" step="5" data-roof-field="splitPercent"></label>
            <label>Left height (ft)<input type="number" min="25" max="140" step="1" data-roof-field="leftHeight"></label>
            <label>Right height (ft)<input type="number" min="25" max="140" step="1" data-roof-field="rightHeight"></label>
            <label>Truss spacing (ft)<input type="number" min="10" max="80" step="1" data-roof-field="trussSpacing"></label>
            <label>Roof color<input type="color" data-roof-field="roofColor"></label>
            <label>Truss color<input type="color" data-roof-field="trussColor"></label>
          </div>
          <button type="button" data-editor-action="roof-defaults">Restore 50 / 75 ft roof defaults</button>
        </fieldset>
        <fieldset class="column-grid-controls">          <legend>Automatic structural columns</legend>
          <label class="column-grid-toggle"><input type="checkbox" data-column-grid-check="autoExtend" checked> Extend the CAD column grid into new floor sections</label>
          <div class="column-grid-values">
            <label>X bay spacing (ft)<input type="number" min="5" max="250" step="1" data-column-grid-field="spacingX"></label>
            <label>Z bay spacing (ft)<input type="number" min="5" max="250" step="1" data-column-grid-field="spacingZ"></label>
          </div>
          <p data-column-grid-summary>Column grid ready.</p>
          <button type="button" data-editor-action="column-grid-defaults">Restore 40 × 30 ft CAD bay spacing</button>
        </fieldset>
        <fieldset class="paint-controls">
          <legend>Paint schedule and colors</legend>
          <p>Choose when the finish transitions happen and the colors shown before and after each stage.</p>
          <div class="paint-control-grid">
            <label class="paint-stage-field">Walls painted at<select data-paint-stage="wallStageId"></select></label>
            <label>Wall before<input type="color" data-paint-color="wallBefore"></label>
            <label>Wall after<input type="color" data-paint-color="wallAfter"></label>
            <label class="paint-stage-field">Pillars painted at<select data-paint-stage="columnStageId"></select></label>
            <label>Pillar before<input type="color" data-paint-color="columnBefore"></label>
            <label>Pillar after<input type="color" data-paint-color="columnAfter"></label>
          </div>
          <button type="button" data-editor-action="paint-defaults">Restore paint defaults</button>
        </fieldset>
        <fieldset class="wall-controls">
          <legend>Exterior wall sections</legend>
          ${wallSections().map((wall) => `<label><input type="checkbox" data-wall-id="${wall.id}" checked>${wall.id.replace("-"," ")}</label>`).join("")}
        </fieldset>
        <fieldset class="roof-controls wall-geometry-controls">
          <legend>Wall dimensions and collision envelope</legend>
          <p>These dimensions control both the visible structure and its first-person hitbox.</p>
          <div class="roof-control-grid">
            <label>Wall height (ft)<input type="number" min="8" max="150" step="1" data-wall-geometry-field="height"></label>
            <label>Wall thickness (ft)<input type="number" min="0.25" max="20" step="0.25" data-wall-geometry-field="thickness"></label>
          </div>
          <div class="roof-checks"><label><input type="checkbox" data-wall-geometry-check="extendToRoof"> Extend walls to the full building height (roof can stay hidden)</label></div>
          <button type="button" data-editor-action="wall-geometry-defaults">Restore wall defaults</button>
        </fieldset>
        <button class="editor-wide-button" type="button" data-editor-action="restore-pillars">Restore every pillar and position</button>
      </div>

      <div class="timeline-editor" data-editor-section="timeline" hidden>
        <div class="editor-properties">
          <label class="wide">Stage title<input data-stage-field="title" type="text"></label>
          <label>Short label<input data-stage-field="short" type="text"></label>
          <label>Phase<input data-stage-field="era" type="text"></label>
          <label>Date / period<input data-stage-field="dateLabel" type="text" placeholder="Example: January 2025"></label>
          <label class="wide">Description<textarea data-stage-field="description" rows="4"></textarea></label>
          <label class="wide">Detail chips<input data-stage-field="details" type="text" placeholder="Separate details with commas"></label>
        </div>
        <div class="editor-actions timeline-actions">
          <button type="button" data-editor-action="stage-earlier">← Earlier</button>
          <button type="button" data-editor-action="stage-later">Later →</button>
        </div>
        <div class="editor-actions timeline-actions">
          <button type="button" data-editor-action="stage-add">Add after</button>
          <button type="button" data-editor-action="stage-delete">Delete stage</button>
        </div>
      </div>

      <div class="editor-project" data-editor-section="project" hidden>
        <div class="editor-callout"><strong>Move all saved work</strong><p>Use the full workspace file to move the layout, machines, custom designs, settings, and backups from preview.html into this site or another browser.</p></div>
        <div class="editor-callout"><strong>Recovery & backups</strong><p data-recovery-summary>Checking saved recovery data...</p><p>Restore only the section you need. Current data is preserved as a pre-recovery safety copy before anything is replaced.</p></div>
        <div class="editor-project-actions">
          <button type="button" data-editor-action="recover-layout-backup">Restore previous layout backup</button>
          <button type="button" data-editor-action="recover-design-backup">Restore previous machine-design backup</button>
          <button type="button" data-editor-action="recover-publish-snapshot">Restore pre-publish rescue snapshot</button>
          <button type="button" data-editor-action="export-workspace">Export full workspace</button>
          <button type="button" data-editor-action="import-workspace">Import full workspace</button>
          <input type="file" data-workspace-file accept="application/json,.json" hidden>
          <button type="button" data-editor-action="export">Export layout</button>
          <button type="button" data-editor-action="import">Import layout</button>
          <input type="file" data-layout-file accept="application/json,.json" hidden>
          <label class="three-mf-scale">3MF print scale<select data-3mf-scale><option value="12">1:12</option><option value="24">1:24</option><option value="50">1:50</option><option value="100" selected>1:100</option><option value="200">1:200</option></select></label>
          <button type="button" data-editor-action="export-3mf">Export complete color 3MF</button>
          <button type="button" data-editor-action="export-selected-3mf">Export selected machine 3MF</button>
          <button type="button" data-editor-action="reset" class="danger-subtle">Reset project</button>
        </div>
      </div>
      <div class="editor-close-bar"><button type="button" data-editor-action="done" class="primary">Done editing</button></div>
    `;
    const closeBar = panel.querySelector(".editor-close-bar");
    const scrollRegion = document.createElement("div");
    scrollRegion.className = "editor-scroll-region";
    while (panel.firstChild && panel.firstChild !== closeBar) {
      scrollRegion.appendChild(panel.firstChild);
    }
    panel.insertBefore(scrollRegion, closeBar);
    frame.appendChild(panel);

    // The editor owns scrolling while the pointer is over its control region.
    // Drive scrollTop directly so trackpads/mouse wheels still scroll the sidebar
    // even when a surrounding viewer or browser scroll chain would otherwise win.
    scrollRegion.tabIndex = 0;
    scrollRegion.setAttribute("aria-label", "Layout editor controls");
    scrollRegion.addEventListener("wheel", (event) => {
      const maxScrollTop = Math.max(0, scrollRegion.scrollHeight - scrollRegion.clientHeight);
      if (maxScrollTop <= 0) return;
      const previousScrollTop = scrollRegion.scrollTop;
      const nextScrollTop = clamp(previousScrollTop + event.deltaY, 0, maxScrollTop);
      scrollRegion.scrollTop = nextScrollTop;
      event.stopPropagation();
      if (Math.abs(nextScrollTop - previousScrollTop) > .1) event.preventDefault();
    }, { passive: false });
    scrollRegion.addEventListener("touchmove", (event) => event.stopPropagation(), { passive: true });

    const syncEditorViewportHeight = () => {
      const visualViewport = window.visualViewport;
      const viewportTop = visualViewport ? visualViewport.offsetTop : 0;
      const viewportHeight = visualViewport ? visualViewport.height : window.innerHeight;
      const viewportBottom = viewportTop + viewportHeight;
      const frameRect = frame.getBoundingClientRect();
      const visibleTop = Math.max(frameRect.top, viewportTop + 8);
      const visibleBottom = Math.min(frameRect.bottom, viewportBottom - 8);
      const topWithinFrame = Math.max(0, visibleTop - frameRect.top);
      const available = Math.max(96, visibleBottom - visibleTop);

      panel.style.top = `${Math.floor(topWithinFrame)}px`;
      panel.style.bottom = "auto";
      panel.style.height = `${Math.floor(available)}px`;
      panel.style.maxHeight = `${Math.floor(available)}px`;
      panel.style.setProperty("--editor-viewport-height", `${Math.floor(available)}px`);
    };
    syncEditorViewportHeight();
    window.addEventListener("resize", syncEditorViewportHeight);
    window.addEventListener("scroll", syncEditorViewportHeight, { passive: true });
    window.visualViewport?.addEventListener("resize", syncEditorViewportHeight);
    window.visualViewport?.addEventListener("scroll", syncEditorViewportHeight);
    document.addEventListener("fullscreenchange", syncEditorViewportHeight);

    panel.querySelectorAll("[data-editor-tool]").forEach((button) => {
      button.addEventListener("click", () => {
        state.editorTool = button.dataset.editorTool;
        // Keep a machine selection while visiting Project so the selected
        // instance can be exported. Pillar editing remains mutually exclusive.
        if (state.editorTool === "pillars") clearMachineSelection();
        else state.selectedColumnKey = null;
        updateEditorPanel();
      });
    });
    panel.querySelectorAll("[data-object-editor-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.objectEditorTab = button.dataset.objectEditorTab;
        updateEditorPanel();
      });
    });

    const objectSearch = panel.querySelector("[data-object-search]");
    objectSearch?.addEventListener("input", updateEditorPanel);
    panel.querySelector("[data-object-picker]")?.addEventListener("change", (event) => {
      setSingleSelection(event.target.value || null);
      state.editorTool = "machines";
      const machine = selectedMachine();
      if (machine && stageAlpha(machine.reveal, machine.retire) <= .08) {
        setStage(Math.min(stages.length - 1, Math.max(0, Number(machine.reveal) || 0)));
      }
      updateEditorPanel();
    });
    panel.querySelector("[data-editor-action='focus']")?.addEventListener("click", focusSelectedMachine);
    panel.querySelector("[data-editor-action='select-production-glass']")?.addEventListener("click", () => {
      const movingGlass = machines.find((item) => item.id === "production-glass-animation")
        || machines.find((item) => item.type === "animatedGlass");
      if (!movingGlass) {
        showToast("No moving-glass animation is currently in the scene.");
        return;
      }
      state.editorTool = "machines";
      setSingleSelection(movingGlass.instanceId);
      state.previewObjectAnimations = false;
      setStage(Math.min(stages.length - 1, Math.max(0, Number(movingGlass.reveal) || 0)));
      focusSelectedMachine();
      updateEditorPanel();
      showToast("Moving glass selected. Its path, speed, size, position, and rotation are ready to edit.");
    });
    panel.querySelector("[data-editor-action='select-floor-feature']")?.addEventListener("click", () => {
      const floorFeatures = machines.filter((item) => isFloorFeatureType(item.type));
      if (!floorFeatures.length) {
        showToast("No editable floor features are currently in the scene.");
        return;
      }
      const currentIndex = floorFeatures.findIndex((item) => item.instanceId === state.selectedMachineId);
      const target = floorFeatures[(currentIndex + 1) % floorFeatures.length];
      state.editorTool = "machines";
      state.editorInteraction = "select";
      setSingleSelection(target.instanceId);
      setStage(Math.min(stages.length - 1, Math.max(0, Number(target.reveal) || 0)));
      focusSelectedMachine();
      updateEditorPanel();
      showToast(`${target.name} selected. Position, width, length, and rotation are ready to edit.`);
    });
    panel.querySelector("[data-editor-action='join-animation-group']")?.addEventListener("click", joinSelectedAnimationObjects);
    panel.querySelector("[data-editor-action='unjoin-animation-group']")?.addEventListener("click", unjoinSelectedAnimationObjects);
    panel.querySelector("[data-motion-active-picker]")?.addEventListener("change", (event) => {
      const target = machineById(event.target.value);
      if (!target) return;
      state.selectedMachineId = target.instanceId;
      state.selectedMachineIds = new Set(motionAssemblyMembers(target).map((item) => item.instanceId));
      updateEditorPanel();
    });
    panel.querySelector("[data-motion-own-animation]")?.addEventListener("change", (event) => {
      const machine = selectedMachine();
      if (!machine?.motionParentId) return;
      pushHistory();
      machine.playOwnAnimation = event.target.checked;
      persistLayout();
      updateEditorPanel();
      showToast(event.target.checked
        ? `${machine.name} now plays its own animation while following its parent.`
        : `${machine.name} now follows only inherited parent motion.`);
    });
    panel.querySelector("[data-group-color]")?.addEventListener("change", (event) => {
      const selection = selectedMachines();
      const color = String(event.target.value || "");
      if (!selection.length || !/^#[0-9a-f]{6}$/i.test(color)) return;
      pushHistory();
      selection.forEach((machine) => { machine.color = color; });
      persistLayout();
      updateEditorPanel();
      showToast(`Applied ${color.toUpperCase()} to ${selection.length} selected object${selection.length === 1 ? "" : "s"}.`);
    });
    panel.querySelector("[data-editor-action='clear-selection']")?.addEventListener("click", () => {
      clearMachineSelection();
      updateEditorPanel();
    });

    panel.querySelector("[data-design-picker]")?.addEventListener("change", (event) => {
      const machine = selectedMachine();
      if (!machine) return;
      pushHistory();
      machine.designId = event.target.value || "";
      if (machine.designId && designLibrary[machine.designId]) {
        const base = designBaseDimensions(designLibrary[machine.designId], machine);
        machine.naturalW = base.w;
        machine.naturalD = base.d;
        machine.naturalH = base.h;
        refreshMachineScaleMetadata(machine);
      }
      if (machine.designId && normalizedDesignScaleMode(machine.designScaleMode) === "match") {
        syncMachineDimensionsToDesign(machine, designLibrary[machine.designId], { preserveScale: false });
      }
      persistLayout();
      updateEditorPanel();
      showToast(machine.designId ? "Custom design applied with the selected sizing mode." : "Built-in model restored.");
    });
    panel.querySelector("[data-editor-action='machine-studio']")?.addEventListener("click", () => {
      const machine = selectedMachine();
      const standalone = /preview\.html$/i.test(window.location.pathname);
      const target = standalone ? "machine-studio.html" : "/machine-studio";
      const query = machine ? `?machine=${encodeURIComponent(machine.instanceId)}` : "";
      // Keep the editor and viewer in one tab. Opening a second tab left the
      // original full plant renderer resident on the GPU; returning from the
      // Designer then created another complete plant renderer and could cut
      // the foreground viewport to roughly 12 FPS on integrated graphics.
      navigateAfterPlantRelease(`${target}${query}`);
    });
    panel.querySelector("[data-editor-action='sync-design-dimensions']")?.addEventListener("click", () => {
      const machine = selectedMachine();
      const design = machine?.designId ? designLibrary[machine.designId] : null;
      if (!machine || !design) {
        showToast("Apply a custom design before syncing dimensions.");
        return;
      }
      pushHistory();
      machine.designScaleMode = "match";
      syncMachineDimensionsToDesign(machine, design, { preserveScale: false });
      persistLayout();
      updateEditorPanel();
      showToast(`Plant dimensions now match ${design.name} and will stay synchronized.`);
    });
    panel.querySelector("[data-editor-action='find-overlap']")?.addEventListener("click", selectNextOverlap);
    panel.querySelector("[data-editor-action='separate-selected']")?.addEventListener("click", separateSelectedObject);
    panel.querySelector("[data-editor-action='resolve-overlaps']")?.addEventListener("click", resolveAllOverlaps);
    panel.querySelectorAll("[data-editor-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        state.editorInteraction = button.dataset.editorMode;
        updateEditorPanel();
      });
    });
    panel.querySelector("[data-editor-snap]")?.addEventListener("change", (event) => {
      state.snapSize = Number(event.target.value) || 0.1;
      updateEditorPanel();
    });
    panel.querySelectorAll("[data-nudge]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.nudge;
        if (action === "x-negative") nudgeSelectedMachine(-1,0,0);
        else if (action === "x-positive") nudgeSelectedMachine(1,0,0);
        else if (action === "z-negative") nudgeSelectedMachine(0,-1,0);
        else if (action === "z-positive") nudgeSelectedMachine(0,1,0);
        else if (action === "rotate-negative") nudgeSelectedMachine(0,0,-1);
        else if (action === "rotate-positive") nudgeSelectedMachine(0,0,1);
      });
    });

    panel.querySelectorAll("[data-machine-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const machine = selectedMachine();
        const selection = selectedMachines();
        if (!machine) return;
        const field = input.dataset.machineField;
        const bulkSelection = selection.length > 1;
        if (bulkSelection && !BULK_MACHINE_FIELDS.has(field)) return;
        pushHistory();
        const targets = bulkSelection ? selection : [machine];
        if (["name", "type", "color", "collisionMode", "designScaleMode"].includes(field)) {
          const value = input.value.trim();
          if (field === "name") {
            machine.name = value || machine.name;
            machine.short = machine.name;
            machine.useDesignName = false;
          } else if (field === "type") {
            machine.type = value;
            machine.category = objectCategory(value);
            const suggestedDesign = defaultDesignForType(value);
            machine.designId = suggestedDesign || "";
            if (isAnimationType(value)) {
              Object.assign(machine, animationDefaults(value), {
                animationEnabled: true,
                collisionMode: "ignore",
              });
            } else if (isFloorFeatureType(value)) {
              machine.animationEnabled = false;
              machine.animationMode = "none";
              machine.collisionMode = "ignore";
              machine.showLabel = false;
              if (value === "safetyLine") {
                machine.h = 0.08;
                machine.color = "#e3ad28";
              } else if (value === "trench") {
                machine.h = 0.22;
                machine.color = "#4a3a31";
              } else {
                machine.h = 0.18;
                machine.color = "#465155";
              }
            }
          } else if (field === "collisionMode") {
            targets.forEach((item) => { item.collisionMode = value === "ignore" ? "ignore" : "solid"; });
          } else if (field === "designScaleMode") {
            machine.designScaleMode = normalizedDesignScaleMode(value);
            if (machine.designScaleMode === "match" && machine.designId && designLibrary[machine.designId]) {
              syncMachineDimensionsToDesign(machine, designLibrary[machine.designId], { preserveScale: false });
            }
          } else if (/^#[0-9a-f]{6}$/i.test(value)) {
            targets.forEach((item) => { item.color = value; });
          }
        } else {
          let value = Number(input.value);
          if (!Number.isFinite(value)) return;
          if (["x", "y", "z", "rotationX", "rotationY", "rotationZ"].includes(field)) {
            const step = Math.max(.01, Number(state.snapSize) || .1);
            value = Math.round(value / step) * step;
          }
          targets.forEach((item) => {
            if (["w","d","h"].includes(field)) {
              if (normalizedMachineScaleEditMode(item.scaleEditMode, item) === "uniform") {
                const reference = machineReferenceDimensions(item);
                const referenceValue = field === "w" ? reference.w : field === "d" ? reference.d : reference.h;
                setMachineScalePercent(item, "uniform", Math.max(.01, value) / Math.max(.01, referenceValue) * 100);
              } else {
                item.scaleEditMode = "individual";
                if (item.designId) item.designScaleMode = "stretch";
                resizeMachineAroundCenter(item, field, Math.max(.01,value));
              }
            }
            else if (field === "reveal") item[field] = clamp(Math.round(value),0,stages.length-1);
            else if (field === "retire") item[field] = value >= 99 ? 99 : clamp(Math.round(value),item.reveal,stages.length-1);
            else {
              item[field] = value;
              if (field === "rotationY") item.rotation = value;
            }
          });
        }
        persistLayout();
        updateEditorPanel();
        if (bulkSelection) showToast(`Updated ${field} for ${selection.length} selected objects.`);
      });
    });


    panel.querySelectorAll("[data-machine-scale-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const selection = selectedMachines();
        if (!selection.length) return;
        const mode = normalizedMachineScaleEditMode(button.dataset.machineScaleMode);
        pushHistory();
        selection.forEach((item) => {
          refreshMachineScaleMetadata(item);
          if (mode === "uniform") {
            const average = (Number(item.scaleXPercent) + Number(item.scaleYPercent) + Number(item.scaleZPercent)) / 3;
            setMachineScalePercent(item, "uniform", average);
          } else item.scaleEditMode = "individual";
        });
        persistLayout();
        updateEditorPanel();
        showToast(mode === "uniform"
          ? `Uniform scaling selected for ${selection.length} object${selection.length === 1 ? "" : "s"}.`
          : `Individual-axis scaling selected for ${selection.length} object${selection.length === 1 ? "" : "s"}.`);
      });
    });

    panel.querySelectorAll("[data-machine-scale]").forEach((input) => {
      input.addEventListener("change", () => {
        const selection = selectedMachines();
        if (!selection.length) return;
        const step = Math.max(.01, Number(state.snapSize) || .1);
        const percent = Math.round(Number(input.value) / step) * step;
        if (!Number.isFinite(percent)) return;
        pushHistory();
        selection.forEach((item) => setMachineScalePercent(item, input.dataset.machineScale, percent));
        persistLayout();
        updateEditorPanel();
        showToast(`Scale updated for ${selection.length} object${selection.length === 1 ? "" : "s"}.`);
      });
    });

    panel.querySelectorAll("[data-machine-check]").forEach((input) => {
      input.addEventListener("change", () => {
        const machine = selectedMachine();
        const selection = selectedMachines();
        if (!machine) return;
        const field = input.dataset.machineCheck;
        const targets = selection.length > 1 && BULK_MACHINE_CHECKS.has(field) ? selection : [machine];
        pushHistory();
        targets.forEach((item) => { item[field] = input.checked; });
        input.indeterminate = false;
        persistLayout();
        updateEditorPanel();
      });
    });

    panel.querySelectorAll("[data-label-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const machine = selectedMachine();
        if (!machine) return;
        const field = input.dataset.labelField;
        pushHistory();
        if (field === "labelText") {
          const value = input.value.trim();
          machine.labelUseMachineName = !value || value === machine.name;
          machine.labelText = machine.labelUseMachineName ? "" : value;
        } else if (field === "labelAbbreviation") {
          machine.labelAbbreviation = input.value.trim();
        } else if (field === "processStepLabelText") {
          machine.processStepLabelText = input.value.trim().slice(0, 80);
        } else if (field === "processStepNumber") {
          const value = Number(input.value);
          machine.processStepNumber = Number.isFinite(value) ? clamp(Math.round(value), 1, 99) : 0;
        } else if (["labelTextColor", "labelBackgroundColor", "labelLineColor"].includes(field)) {
          if (/^#[0-9a-f]{6}$/i.test(input.value)) machine[field] = input.value;
        } else if (field === "labelSizePercent") {
          machine.labelSizePercent = Math.max(5, Number(input.value) || 100);
        } else if (field === "labelReveal") {
          const value = Number(input.value);
          if (Number.isFinite(value)) {
            machine.labelReveal = clamp(Math.round(value), 0, stages.length - 1);
            if (machine.labelRetire < 99 && machine.labelRetire < machine.labelReveal) machine.labelRetire = machine.labelReveal;
          }
        } else if (field === "labelRetire") {
          const value = Number(input.value);
          if (Number.isFinite(value)) machine.labelRetire = value >= 99 ? 99 : clamp(Math.round(value), machine.labelReveal, stages.length - 1);
        } else if (["labelAnchorXPercent", "labelAnchorYPercent", "labelAnchorZPercent"].includes(field)) {
          const value = Number(input.value);
          if (Number.isFinite(value)) {
            machine[field] = clamp(value, -1000, 1100);
            // Extended anchors replace the old world X/Z offset controls. Once
            // the user moves an anchor, clear legacy offsets so placement is exact.
            machine.labelWorldOffsetX = 0;
            machine.labelWorldOffsetZ = 0;
          }
        } else if (field === "labelHeightOffset") {
          const value = Number(input.value);
          if (Number.isFinite(value)) machine.labelHeightOffset = clamp(value, 0, 200);
        } else if (["labelWorldOffsetX", "labelWorldOffsetZ"].includes(field)) {
          const value = Number(input.value);
          if (Number.isFinite(value)) machine[field] = clamp(value, -80, 80);
        } else if (field === "labelRotationY") {
          const value = Number(input.value);
          if (Number.isFinite(value)) machine.labelRotationY = clamp(value, -180, 180);
        } else if (field === "labelTurnSpeedPercent") {
          const value = Number(input.value);
          if (Number.isFinite(value)) machine.labelTurnSpeedPercent = clamp(value, 25, 200);
        } else if (field === "labelDepthFeet") {
          const value = Number(input.value);
          if (Number.isFinite(value)) machine.labelDepthFeet = clamp(value, .1, 2);
        } else if (field === "labelTextExtrudeFeet") {
          const value = Number(input.value);
          if (Number.isFinite(value)) machine.labelTextExtrudeFeet = clamp(value, .02, .3);
        } else if (field === "labelGlowPercent") {
          const value = Number(input.value);
          if (Number.isFinite(value)) machine.labelGlowPercent = clamp(value, 0, 100);
        } else if (field === "labelZoomMinPercent") {
          const value = Number(input.value);
          if (Number.isFinite(value)) machine.labelZoomMinPercent = clamp(value, 70, 100);
        } else if (field === "labelZoomMaxPercent") {
          const value = Number(input.value);
          if (Number.isFinite(value)) machine.labelZoomMaxPercent = clamp(value, 100, 140);
        } else if (field === "labelPriority") {
          machine.labelPriority = ["automatic", "major", "normal", "support"].includes(input.value) ? input.value : "automatic";
        } else if (field === "labelLineWidth") {
          const value = Number(input.value);
          if (Number.isFinite(value)) machine.labelLineWidth = clamp(value, .5, 10);
        } else if (field === "labelLineOpacity") {
          const value = Number(input.value);
          if (Number.isFinite(value)) machine.labelLineOpacity = clamp(value, 10, 100);
        } else if (field === "labelTargetSize") {
          const value = Number(input.value);
          if (Number.isFinite(value)) machine.labelTargetSize = clamp(value, 1, 12);
        } else if (field === "labelLineStyle") {
          machine.labelLineStyle = ["solid", "dashed", "dotted"].includes(input.value) ? input.value : "solid";
        } else if (field === "labelLineShape") {
          machine.labelLineShape = ["straight", "elbow"].includes(input.value) ? input.value : "straight";
        } else if (field === "labelLeaderSide") {
          machine.labelLeaderSide = ["auto", "top", "bottom", "left", "right"].includes(input.value) ? input.value : "auto";
        } else if (field === "labelTargetStyle") {
          machine.labelTargetStyle = ["dot", "ring", "arrow", "none"].includes(input.value) ? input.value : "dot";
        } else if (field === "labelFontWeight") {
          machine.labelFontWeight = ["regular", "semibold", "bold"].includes(input.value) ? input.value : "semibold";
        }
        persistLayout();
        renderPerformance.invalidate();
        updateEditorPanel();
      });
    });
    const labelColorTrigger = panel.querySelector("[data-label-color-trigger]");
    const labelColorPopover = panel.querySelector("[data-label-color-popover]");
    const closeLabelColorPopover = () => {
      if (!labelColorPopover || !labelColorTrigger) return;
      labelColorPopover.hidden = true;
      labelColorTrigger.setAttribute("aria-expanded", "false");
    };
    labelColorTrigger?.addEventListener("click", (event) => {
      event.preventDefault();
      if (!labelColorPopover) return;
      labelColorPopover.hidden = !labelColorPopover.hidden;
      labelColorTrigger.setAttribute("aria-expanded", String(!labelColorPopover.hidden));
    });
    panel.querySelectorAll("[data-label-color-swatch]").forEach((button) => {
      button.addEventListener("click", () => {
        const preset = VISUAL_COLOR_PRESETS[button.dataset.labelColorSwatch];
        if (!preset) return;
        const machine = selectedMachine();
        if (!machine) return;
        const selection = selectedMachines();
        const targets = selection.length ? selection : [machine];
        pushHistory();
        targets.forEach((item) => {
          item.labelTextColor = preset.text;
          item.labelBackgroundColor = preset.background;
          item.labelLineColor = preset.accent;
        });
        persistLayout();
        renderPerformance.invalidate();
        updateEditorPanel();
        showToast(preset.name + " applied to " + targets.length + " 3D label" + (targets.length === 1 ? "." : "s."));
      });
    });
    document.addEventListener("pointerdown", (event) => {
      const picker = panel.querySelector("[data-label-color-picker]");
      if (!picker || picker.contains(event.target)) return;
      closeLabelColorPopover();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeLabelColorPopover();
    });

    panel.querySelectorAll("[data-label-check]").forEach((input) => {
      input.addEventListener("change", () => {
        const machine = selectedMachine();
        if (!machine) return;
        pushHistory();
        machine[input.dataset.labelCheck] = input.checked;
        if (input.dataset.labelCheck === "labelShowToday") {
          labelVisualStates.delete(String(machine.instanceId));
          showToast(input.checked
            ? `${machine.name} label enabled in Necessary mode.`
            : `${machine.name} label hidden in Necessary mode. Process pointers stay visible.`);
        } else if (input.dataset.labelCheck === "processStepLabelEnabled" && input.checked) {
          if (!(Number(machine.processStepNumber) > 0) && !processStepNumber(processConnectionRoleForObject(machine.instanceId))) {
            const existingNumbers = machines.map((item) => Number(item.processStepNumber) || processStepNumber(processConnectionRoleForObject(item.instanceId)) || 0);
            machine.processStepNumber = clamp(Math.max(0, ...existingNumbers) + 1, 1, 99);
          }
          showToast(`${machine.name} added to the compact Necessary process labels.`);
        }
        persistLayout();
        renderPerformance.invalidate();
        updateEditorPanel();
      });
    });
    panel.querySelector("[data-editor-action='reset-selected-label']")?.addEventListener("click", () => {
      const machine = selectedMachine();
      if (!machine) return;
      pushHistory();
      machine.labelUseMachineName = true;
      machine.labelText = "";
      machine.labelAbbreviation = "";
      persistLayout();
      renderPerformance.invalidate();
      updateEditorPanel();
      showToast(`Label reset to ${machine.name}.`);
    });
    panel.querySelector("[data-editor-action='reset-label-world-position']")?.addEventListener("click", () => {
      const machine = selectedMachine();
      if (!machine) return;
      pushHistory();
      machine.labelWorldOffsetX = 0;
      machine.labelWorldOffsetZ = 0;
      machine.labelHeightOffset = 4;
      machine.labelRotationY = 0;
      labelVisualStates.delete(String(machine.instanceId));
      persistLayout();
      renderPerformance.invalidate();
      updateEditorPanel();
      showToast(`${machine.name} label position reset above the machine.`);
    });
    panel.querySelector("[data-process-pointer-assignment]")?.addEventListener("change", (event) => {
      const machine = selectedMachine();
      if (!machine) return;
      pushHistory();
      const result = assignProcessPointerToMachine(event.target.value, machine);
      state.selectedProcessConnectionKey = "";
      persistLayout();
      renderPerformance.invalidate();
      updateEditorPanel();
      if (!result.key) {
        showToast(`Removed ${machine.name} from the Today process flow.`);
        return;
      }
      const flow = processPointerFlowDefinition(result.key);
      const displaced = result.displacedMachine ? ` It was moved from ${result.displacedMachine.name}.` : "";
      showToast(`${machine.name} is now the ${flow?.text || "process"} node.${displaced}`);
    });
    panel.querySelector("[data-editor-action='remove-process-node']")?.addEventListener("click", () => {
      const machine = selectedMachine();
      if (!machine || !processPointerKeyForMachine(machine)) return;
      pushHistory();
      assignProcessPointerToMachine("", machine);
      state.selectedProcessConnectionKey = "";
      persistLayout();
      renderPerformance.invalidate();
      updateEditorPanel();
      showToast(`Removed ${machine.name} from the Today process flow. Machine labels were unchanged.`);
    });

    panel.querySelector("[data-process-connection-select]")?.addEventListener("change", (event) => {
      state.selectedProcessConnectionKey = String(event.target.value || "");
      updateEditorPanel();
      renderPerformance.invalidate();
    });
    const retargetSelectedConnectionFromControls = () => {
      const connection = selectedProcessConnection();
      if (!connection) return;
      const sourceId = String(panel.querySelector("[data-process-connection-edit-source]")?.value || "");
      const targetId = String(panel.querySelector("[data-process-connection-edit-target]")?.value || "");
      if (!sourceId || !targetId || sourceId === targetId) {
        updateEditorPanel();
        return;
      }
      const nextKey = processConnectionKey(sourceId, targetId);
      if (nextKey !== connection.key && state.processConnections[nextKey]) {
        showToast("That object-to-object process pointer already exists.");
        updateEditorPanel();
        return;
      }
      pushHistory();
      const next = retargetProcessConnection(connection, sourceId, targetId);
      if (!next) {
        state.history.pop();
        updateHistoryButtons();
        updateEditorPanel();
        return;
      }
      persistLayout();
      renderPerformance.invalidate();
      updateEditorPanel();
      showToast(`Process pointer now connects ${processConnectionDisplayName(next)}. Machine labels were unchanged.`);
    };
    panel.querySelector("[data-process-connection-edit-source]")?.addEventListener("change", retargetSelectedConnectionFromControls);
    panel.querySelector("[data-process-connection-edit-target]")?.addEventListener("change", retargetSelectedConnectionFromControls);

    const refreshAddProcessConnectionButton = () => {
      const sourceId = String(panel.querySelector("[data-process-connection-source]")?.value || "");
      const targetId = String(panel.querySelector("[data-process-connection-target]")?.value || "");
      const button = panel.querySelector("[data-editor-action='add-process-connection']");
      if (button) button.disabled = !sourceId || !targetId || sourceId === targetId;
    };
    panel.querySelector("[data-process-connection-source]")?.addEventListener("change", refreshAddProcessConnectionButton);
    panel.querySelector("[data-process-connection-target]")?.addEventListener("change", refreshAddProcessConnectionButton);
    panel.querySelector("[data-editor-action='add-process-connection']")?.addEventListener("click", () => {
      const sourceId = String(panel.querySelector("[data-process-connection-source]")?.value || "");
      const targetId = String(panel.querySelector("[data-process-connection-target]")?.value || "");
      if (!sourceId || !targetId || sourceId === targetId || !machineById(sourceId) || !machineById(targetId)) return;
      const key = processConnectionKey(sourceId, targetId);
      if (state.processConnections[key]) {
        state.selectedProcessConnectionKey = key;
        updateEditorPanel();
        showToast("That object-to-object process pointer already exists, so it was selected instead.");
        return;
      }
      pushHistory();
      state.processConnections[key] = defaultProcessConnection(sourceId, targetId, {
        fromKey: processConnectionRoleForObject(sourceId),
        toKey: processConnectionRoleForObject(targetId),
      });
      state.selectedProcessConnectionKey = key;
      persistLayout();
      renderPerformance.invalidate();
      updateEditorPanel();
      showToast(`${processConnectionDisplayName(state.processConnections[key], { includeMachines: true })} process line is ready to edit.`);
    });
    panel.querySelector("[data-editor-action='remove-process-connection']")?.addEventListener("click", () => {
      const connection = selectedProcessConnection();
      if (!connection) return;
      pushHistory();
      const label = processConnectionDisplayName(connection);
      delete state.processConnections[connection.key];
      state.selectedProcessConnectionKey = "";
      persistLayout();
      renderPerformance.invalidate();
      updateEditorPanel();
      showToast(`Removed the ${label} object-to-object process pointer. Machine labels were unchanged.`);
    });

    panel.querySelector("[data-process-color-preset]")?.addEventListener("change", (event) => {
      const preset = VISUAL_COLOR_PRESETS[event.target.value];
      const connection = selectedProcessConnection();
      if (!preset || !connection) return;
      pushHistory();
      connection.color = preset.accent;
      persistLayout();
      renderPerformance.invalidate();
      updateEditorPanel();
      showToast(preset.name + " applied to the selected process route.");
    });

    panel.querySelectorAll("[data-process-connection-field]").forEach((input) => {
      if (input.dataset.processConnectionField === "tagText") return;
      input.addEventListener("change", () => {
        const connection = selectedProcessConnection();
        if (!connection) return;
        pushHistory();
        if (!applyProcessConnectionField(connection, input.dataset.processConnectionField, input.value)) return;
        persistLayout();
        renderPerformance.invalidate();
        updateEditorPanel();
      });
    });
    panel.addEventListener("change",(event)=>{
      const input=event.target.closest?.("[data-process-pivot-field]");if(!input)return;
      const connection=selectedProcessConnection();if(!connection)return;
      const pivots=materializeProcessFlowPivots(connection),pivotId=String(input.dataset.processPivotId||""),pivotIndex=Number(input.dataset.processPivotIndex),found=pivots.findIndex((pivot)=>pivot.id===pivotId),index=found>=0?found:pivotIndex,value=Number(input.value);if(!Number.isFinite(value)||!Number.isFinite(index)||!pivots[index]){updateEditorPanel();return;}
      pushHistory();pivots[index][input.dataset.processPivotField]=value;connection.flowPivotPoints=pivots;connection.flowPivotMode="custom";persistLayout();renderPerformance.invalidate();updateEditorPanel();
    });
    panel.addEventListener("click",(event)=>{
      const removeButton=event.target.closest?.("[data-editor-action='remove-process-pivot']");if(!removeButton)return;
      const connection=selectedProcessConnection();if(!connection)return;pushHistory();materializeProcessFlowPivots(connection);const pivotId=String(removeButton.dataset.processPivotId||"");let changed=removeProcessFlowPivot(connection,pivotId);if(!changed){const index=Number(removeButton.dataset.processPivotIndex);if(Number.isFinite(index)&&connection.flowPivotPoints[index]){connection.flowPivotPoints.splice(index,1);changed=true;}}
      if(changed){persistLayout();renderPerformance.invalidate();updateEditorPanel();showToast("Process pivot removed.");}else{state.history.pop();updateHistoryButtons();}
    });
    panel.querySelector("[data-editor-action='add-process-pivot']")?.addEventListener("click",()=>{const connection=selectedProcessConnection();if(!connection)return;pushHistory();const pivot=addProcessFlowPivot(connection);if(!pivot){state.history.pop();updateHistoryButtons();showToast(`A route can contain up to ${PROCESS_FLOW_MAX_PIVOTS} pivot points.`);return;}persistLayout();renderPerformance.invalidate();updateEditorPanel();showToast("Added an exact process pivot. Drag its numbered handle or type X / Z coordinates.");});
    panel.querySelector("[data-editor-action='clear-process-pivots']")?.addEventListener("click",()=>{const connection=selectedProcessConnection();if(!connection)return;pushHistory();const changed=clearProcessFlowPivots(connection);if(!changed){state.history.pop();updateHistoryButtons();return;}persistLayout();renderPerformance.invalidate();updateEditorPanel();showToast("Removed all route pivots. The flow now runs directly from S to E.");});

    const routeTagTextInput = panel.querySelector("[data-process-connection-field='tagText']");
    routeTagTextInput?.addEventListener("focus", () => {
      const connection = selectedProcessConnection();
      if (!connection || routeTagTextInput.dataset.historyStarted === "true") return;
      pushHistory();
      routeTagTextInput.dataset.historyStarted = "true";
    });
    routeTagTextInput?.addEventListener("input", () => {
      const connection = selectedProcessConnection();
      if (!connection) return;
      applyProcessConnectionField(connection, "tagText", routeTagTextInput.value);
      persistLayout();
      renderPerformance.invalidate();
      const preview = panel.querySelector("[data-process-route-tag-preview]");
      if (preview) {
        const automaticText = `${processConnectionEndpointText(connection, "source")} → ${processConnectionEndpointText(connection, "target")}`;
        const customText = String(connection.tagText || "").trim();
        preview.textContent = `Route tag preview: ${customText || automaticText}${customText ? " · custom text" : " · automatic text"}`;
      }
    });
    routeTagTextInput?.addEventListener("blur", () => {
      delete routeTagTextInput.dataset.historyStarted;
      updateEditorPanel();
    });
    panel.querySelectorAll("[data-process-connection-check]").forEach((input) => {
      input.addEventListener("change", () => {
        const connection = selectedProcessConnection();
        if (!connection) return;
        pushHistory();
        connection[input.dataset.processConnectionCheck] = input.checked;
        persistLayout();
        renderPerformance.invalidate();
        updateEditorPanel();
      });
    });
    panel.querySelector("[data-editor-action='center-process-connection-start']")?.addEventListener("click", () => {
      const connection = selectedProcessConnection();
      if (!connection) return;
      pushHistory();
      connection.startAnchorXPercent = 50;
      connection.startAnchorYPercent = 100;
      connection.startAnchorZPercent = 50;
      persistLayout();
      renderPerformance.invalidate();
      updateEditorPanel();
      showToast("Process connection start point centered on the source object.");
    });
    panel.querySelector("[data-editor-action='center-process-connection-end']")?.addEventListener("click", () => {
      const connection = selectedProcessConnection();
      if (!connection) return;
      pushHistory();
      connection.endAnchorXPercent = 50;
      connection.endAnchorYPercent = 100;
      connection.endAnchorZPercent = 50;
      persistLayout();
      renderPerformance.invalidate();
      updateEditorPanel();
      showToast("Process connection end point centered on the destination object.");
    });
    panel.querySelector("[data-editor-action='reset-process-connection']")?.addEventListener("click", () => {
      const connection = selectedProcessConnection();
      if (!connection) return;
      pushHistory();
      const reset = defaultProcessConnection(connection.sourceId, connection.targetId, { fromKey: processConnectionEndpointRole(connection, "source"), toKey: processConnectionEndpointRole(connection, "target") });
      state.processConnections[connection.key] = reset;
      state.selectedProcessConnectionKey = reset.key;
      persistLayout();
      renderPerformance.invalidate();
      updateEditorPanel();
      showToast(`Reset the ${processConnectionDisplayName(reset)} machine-to-machine pointer. Machine labels were unchanged.`);
    });
    panel.querySelector("[data-editor-action='refresh-labels']")?.addEventListener("click", () => {
      pushHistory();
      const result = refreshLayoutLabels();
      updateEditorPanel();
      showToast(`Linked labels updated${result.renamedMachines ? `; ${result.renamedMachines} machine name${result.renamedMachines === 1 ? "" : "s"} refreshed from designs` : ""}. Custom labels were preserved.`);
    });
    panel.querySelector("[data-editor-action='reset-all-labels']")?.addEventListener("click", () => {
      pushHistory();
      refreshLayoutLabels({ resetCustom: true });
      updateEditorPanel();
      showToast(`All ${machines.length} labels now use their machine names.`);
    });

    panel.querySelectorAll("[data-animation-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const machine = selectedMachine();
        const selection = selectedMachines();
        if (!machine) return;
        const editingMotionMember = selection.length > 1 && selection.some((item) => item.motionParentId || motionChildren(item.instanceId).length);
        const targets = editingMotionMember ? [machine] : (selection.length > 1 ? selection : [machine]);
        pushHistory();
        const field = input.dataset.animationField;
        if (["animationMode", "animationAxis", "animationSecondaryAxis"].includes(field)) targets.forEach((item) => { item[field] = input.value; });
        else {
          const value = Number(input.value);
          if (!Number.isFinite(value)) return;
          const normalized = ["animationSpeed", "animationPauseSeconds", "animationSecondaryPauseSeconds", "animationStep1PauseSeconds", "animationStep2PauseSeconds", "animationStep3PauseSeconds", "animationStep4PauseSeconds"].includes(field) ? Math.max(0, value) : value;
          targets.forEach((item) => { item[field] = normalized; });
        }
        persistLayout();
        updateEditorPanel();
      });
    });
    panel.querySelectorAll("[data-animation-check]").forEach((input) => {
      input.addEventListener("change", () => {
        const machine = selectedMachine();
        const selection = selectedMachines();
        if (!machine) return;
        const editingMotionMember = selection.length > 1 && selection.some((item) => item.motionParentId || motionChildren(item.instanceId).length);
        const targets = editingMotionMember ? [machine] : (selection.length > 1 ? selection : [machine]);
        pushHistory();
        targets.forEach((item) => { item[input.dataset.animationCheck] = input.checked; });
        input.indeterminate = false;
        persistLayout();
        updateEditorPanel();
      });
    });
    panel.querySelector("[data-editor-action='preview-animations']")?.addEventListener("click", () => {
      state.previewObjectAnimations = !state.previewObjectAnimations;
      updateEditorPanel();
      showToast(state.previewObjectAnimations ? "Animation preview started." : "Animations paused at their base positions.");
    });
    panel.querySelector("[data-editor-action='reverse-animation-path']")?.addEventListener("click", () => {
      const machine = selectedMachine();
      if (!machine) return;
      pushHistory();
      machine.animationDistance = -(Number(machine.animationDistance) || 0);
      persistLayout();
      updateEditorPanel();
      showToast("Animation direction reversed.");
    });

    panel.querySelector("[data-crane-toggle]").addEventListener("change", (event) => {
      const machine = selectedMachine();
      if (!machine) return;
      pushHistory();
      machine.crane = event.target.checked
        ? { system: "GORBEL bridge", capacity: "1000 lb", height: Math.max(machine.h + 4, 20) }
        : null;
      persistLayout();
      updateEditorPanel();
    });

    panel.querySelectorAll("[data-crane-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const machine = selectedMachine();
        if (!machine?.crane) return;
        pushHistory();
        const field = input.dataset.craneField;
        machine.crane[field] = field === "height" ? Math.max(4, Number(input.value) || 20) : input.value.trim();
        persistLayout();
        updateEditorPanel();
      });
    });

    panel.querySelectorAll("[data-floor-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const field = input.dataset.floorField;
        const value = Number(input.value);
        if (!Number.isFinite(value)) return;
        pushHistory();
        if (["width", "length"].includes(field)) {
          floor[field] = clamp(value, MIN_FLOOR_DIMENSION, MAX_FLOOR_DIMENSION);
          input.value = String(floor[field]);
          if (value !== floor[field]) showToast(`Floor ${field} was limited to ${MAX_FLOOR_DIMENSION.toLocaleString()} ft.`);
        } else floor[field] = value;
        invalidateStructuralColumns();
        persistLayout();
        updateEditorPanel();
        showToast("Floor dimensions updated.");
      });
    });

    panel.querySelector("[data-column-grid-check='autoExtend']")?.addEventListener("change", (event) => {
      pushHistory();
      columnGrid.autoExtend = event.target.checked;
      invalidateStructuralColumns();
      persistLayout();
      updateEditorPanel();
      showToast(columnGrid.autoExtend ? "Automatic extension columns enabled." : "Automatic extension columns hidden.");
    });
    panel.querySelectorAll("[data-column-grid-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const field = input.dataset.columnGridField;
        const value = Number(input.value);
        if (!Number.isFinite(value)) return;
        pushHistory();
        columnGrid[field] = clamp(value, 5, 250);
        invalidateStructuralColumns();
        persistLayout();
        updateEditorPanel();
        showToast("Structural bay spacing updated.");
      });
    });
    panel.querySelector("[data-editor-action='column-grid-defaults']")?.addEventListener("click", () => {
      pushHistory();
      columnGrid = normalizeColumnGrid(defaultColumnGrid);
      invalidateStructuralColumns();
      persistLayout();
      updateEditorPanel();
      showToast("CAD column spacing restored to 40 × 30 ft.");
    });

    panel.querySelectorAll("[data-roof-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const field = input.dataset.roofField;
        pushHistory();
        if (["roofColor", "trussColor"].includes(field)) {
          if (/^#[0-9a-f]{6}$/i.test(input.value)) state.roof[field] = input.value;
        } else {
          const ranges = {
            splitPercent: [10, 90], leftHeight: [25, 140], rightHeight: [25, 140], trussSpacing: [10, 80],
          };
          const [minimum, maximum] = ranges[field] || [0, 500];
          state.roof[field] = clamp(Number(input.value) || state.roof[field], minimum, maximum);
        }
        persistLayout();
        updateEditorPanel();
        showToast("Roof configuration updated.");
      });
    });
    panel.querySelectorAll("[data-roof-check]").forEach((input) => {
      input.addEventListener("change", () => {
        pushHistory();
        state.roof[input.dataset.roofCheck] = input.checked;
        persistLayout();
        updateEditorPanel();
        showToast(input.dataset.roofCheck === "enabled" ? (input.checked ? "Roof enabled." : "Roof removed.") : (input.checked ? "Roof shown in the overview." : "Roof hidden from the overview."));
      });
    });
    panel.querySelector("[data-editor-action='roof-defaults']")?.addEventListener("click", () => {
      pushHistory();
      state.roof = normalizeRoofSettings(defaultRoofSettings);
      persistLayout();
      updateEditorPanel();
      showToast("Roof restored to the 50 / 75 ft split configuration.");
    });
    panel.querySelectorAll("[data-wall-geometry-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const field = input.dataset.wallGeometryField;        const value = Number(input.value);
        if (!Number.isFinite(value)) return;
        pushHistory();
        state.wallGeometry[field] = field === "height" ? clamp(value, 8, 150) : clamp(value, .25, 20);
        persistLayout();
        updateEditorPanel();
        showToast("Wall dimensions and first-person hitboxes updated.");
      });
    });
    panel.querySelectorAll("[data-wall-geometry-check]").forEach((input) => {
      input.addEventListener("change", () => {
        pushHistory();
        state.wallGeometry[input.dataset.wallGeometryCheck] = input.checked;
        persistLayout();
        updateEditorPanel();
        showToast(input.checked ? "Walls now extend to the full building height, independent of roof visibility." : "Walls now use the custom wall height.");
      });
    });
    panel.querySelector("[data-editor-action='wall-geometry-defaults']")?.addEventListener("click", () => {
      pushHistory();
      state.wallGeometry = normalizeWallGeometry(defaultWallGeometry);
      persistLayout();
      updateEditorPanel();
      showToast("Wall height, thickness, and collision defaults restored.");
    });

    panel.querySelectorAll("[data-stage-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const stage = currentStage();
        if (!stage) return;
        pushHistory();
        const field = input.dataset.stageField;
        stage[field] = field === "details"
          ? input.value.split(",").map((item) => item.trim()).filter(Boolean)
          : input.value.trim();
        persistLayout();
        buildTimeline();
        setStage(state.stage);
        updateEditorPanel();
      });
    });

    panel.querySelector("[data-editor-action='undo']").addEventListener("click",undoLayout);
    panel.querySelector("[data-editor-action='redo']").addEventListener("click",redoLayout);
    panel.querySelector("[data-editor-action='copy']").addEventListener("click",copySelectedMachine);
    panel.querySelector("[data-editor-action='paste']").addEventListener("click",pasteMachine);
    panel.querySelector("[data-editor-action='delete']").addEventListener("click",deleteSelectedMachine);
    panel.querySelector("[data-editor-action='stage-earlier']").addEventListener("click",() => moveCurrentStage(-1));
    panel.querySelector("[data-editor-action='stage-later']").addEventListener("click",() => moveCurrentStage(1));
    panel.querySelector("[data-editor-action='stage-add']").addEventListener("click",addTimelineStage);
    panel.querySelector("[data-editor-action='stage-delete']").addEventListener("click",deleteTimelineStage);
    panel.querySelector("[data-editor-action='refresh-add-designs']")?.addEventListener("click", () => {
      refreshDesignLibrary();
      updateEditorPanel();
      showToast("Saved Machine Design Studio models refreshed.");
    });
    panel.querySelector("[data-editor-action='open-new-machine-designer']")?.addEventListener("click", () => {
      const standalone = /preview\.html$/i.test(window.location.pathname);
      navigateAfterPlantRelease(standalone ? "machine-studio.html" : "/machine-studio");
    });
    panel.querySelector("[data-editor-action='add-design-machine']")?.addEventListener("click", () => {
      refreshDesignLibrary();
      const designId = panel.querySelector("#new-design-machine")?.value || "";
      const design = designLibrary[designId];
      if (!design) {
        updateEditorPanel();
        showToast("Choose a saved Machine Design Studio design first.");
        return;
      }
      const requestedName = panel.querySelector("#new-design-machine-name")?.value.trim() || "";
      const revealStage = Number(panel.querySelector("#new-design-machine-stage")?.value);
      const placement = panel.querySelector("#new-design-machine-placement")?.value || "open";
      const machine = machineTemplateFromDesign(design, requestedName, revealStage);
      if (placement === "plant") {
        machine.x = modelCenter()[0] - machine.w / 2;
        machine.z = modelCenter()[1] - machine.d / 2;
      } else {
        machine.x = modelCenter()[0] + state.panX - machine.w / 2;
        machine.z = modelCenter()[1] + state.panZ - machine.d / 2;
      }
      pushHistory();
      if (placement === "open" && !findOpenPositionAcrossFloor(machine, machine.x, machine.z)) {
        state.history.pop();
        updateHistoryButtons();
        showToast("No open position was found near the current view. Try Plant center or move the view to an open area.");
        return;
      }
      machines.push(machine);
      setSingleSelection(machine.instanceId);
      state.editorTool = "machines";
      const nameInput = panel.querySelector("#new-design-machine-name");
      if (nameInput) nameInput.value = "";
      persistLayout();
      focusSelectedMachine();
      updateEditorPanel();
      showToast(`${machine.name} added from Machine Design Studio.`);
    });

    panel.querySelector("[data-editor-action='add']").addEventListener("click",() => {
      const type = panel.querySelector("#new-machine-type").value;
      const requestedName = panel.querySelector("#new-machine-name").value.trim();
      pushHistory();
      const machine = machineTemplate(type,requestedName);
      machines.push(machine);
      setSingleSelection(machine.instanceId);
      state.editorTool = "machines";
      panel.querySelector("#new-machine-name").value = "";
      persistLayout();
      updateEditorPanel();
      showToast(`${machine.name} added.`);
    });
    panel.querySelector("[data-editor-action='floor-fit']")?.addEventListener("click", () => {
      const visible = machines.filter((machine) => machine.visible !== false);
      if (!visible.length) return;
      pushHistory();
      const padding = 20;
      const minX = Math.min(...visible.map((machine) => machine.x)) - padding;
      const minZ = Math.min(...visible.map((machine) => machine.z)) - padding;
      const maxX = Math.max(...visible.map((machine) => machine.x + machine.w)) + padding;
      const maxZ = Math.max(...visible.map((machine) => machine.z + machine.d)) + padding;
      floor = normalizeFloor({ centerX: (minX + maxX) / 2, centerZ: (minZ + maxZ) / 2, width: maxX - minX, length: maxZ - minZ });
      invalidateStructuralColumns();
      persistLayout();
      updateEditorPanel();
      showToast("Floor fitted around visible objects.");
    });
    panel.querySelector("[data-editor-action='floor-cad']")?.addEventListener("click", () => {
      pushHistory();
      floor = normalizeFloor(defaultFloor);
      invalidateStructuralColumns();
      persistLayout();
      updateEditorPanel();
      showToast("CAD floor dimensions restored.");
    });

    panel.querySelector("[data-editor-action='restore-pillars']").addEventListener("click",() => {
      pushHistory();
      state.hiddenColumns.clear();
      state.hiddenColumnKeys.clear();
      columnOverrides = {};
      columnOverridesRevision += 1;
      state.selectedColumnKey = null;
      invalidateStructuralColumns();
      persistLayout();
      updateEditorPanel();
      showToast("All CAD and generated pillars restored to their grid positions.");
    });
    panel.querySelector("[data-editor-action='reset']").addEventListener("click",() => {
      if (!window.confirm("Reset every object, timeline stage, pillar, and wall change?")) return;
      pushHistory();
      machines = defaultSceneMachines();
      stages = normalizeStages(defaultStages);
      floor = normalizeFloor(defaultFloor);
      columnGrid = normalizeColumnGrid(defaultColumnGrid);
      state.hiddenColumns.clear();
      state.hiddenColumnKeys.clear();
      columnOverrides = {};
      columnOverridesRevision += 1;
      state.selectedColumnKey = null;
      invalidateStructuralColumns();
      state.walls = { ...defaultWalls };
      state.wallGeometry = normalizeWallGeometry(defaultWallGeometry);
      state.roof = normalizeRoofSettings(defaultRoofSettings);
      clearMachineSelection();
      state.stage = 0;
      state.stageFloat = 0;
      persistLayout();
      buildTimeline();
      setStage(0);
      updateEditorPanel();
      showToast("Project reset to the supplied baseline.");
    });
    panel.querySelector("[data-editor-action='export']").addEventListener("click",exportLayout);
    panel.querySelector("[data-editor-action='export-3mf']")?.addEventListener("click", () => exportPlant3mf(false));
    panel.querySelector("[data-editor-action='export-selected-3mf']")?.addEventListener("click", () => exportPlant3mf(true));
    const fileInput = panel.querySelector("[data-layout-file]");
    panel.querySelector("[data-editor-action='import']").addEventListener("click",() => fileInput.click());
    fileInput.addEventListener("change", async () => {
      await importLayout(fileInput.files?.[0]);
      fileInput.value = "";
    });
    panel.querySelector("[data-editor-action='export-workspace']").addEventListener("click",exportWorkspace);
    const workspaceFileInput = panel.querySelector("[data-workspace-file]");
    panel.querySelector("[data-editor-action='import-workspace']").addEventListener("click",() => workspaceFileInput.click());
    workspaceFileInput.addEventListener("change", async () => {
      await importWorkspace(workspaceFileInput.files?.[0]);
      workspaceFileInput.value = "";
    });
    panel.querySelector("[data-editor-action='recover-layout-backup']")?.addEventListener("click", () => {
      recoverStorageValue(BACKUP_STORAGE_KEY, STORAGE_KEY, PRE_RECOVERY_LAYOUT_KEY, "previous layout backup");
    });
    panel.querySelector("[data-editor-action='recover-design-backup']")?.addEventListener("click", () => {
      recoverStorageValue(DESIGN_BACKUP_STORAGE_KEY, DESIGN_STORAGE_KEY, PRE_RECOVERY_DESIGN_KEY, "previous machine-design backup");
    });
    panel.querySelector("[data-editor-action='recover-publish-snapshot']")?.addEventListener("click", recoverPublishedWorkspaceSnapshot);
    panel.querySelector("[data-editor-action='done']").addEventListener("click",() => setEditing(false));
    panel.querySelectorAll("[data-paint-stage]").forEach((input) => {
      input.addEventListener("change", () => {
        pushHistory();
        state.paint[input.dataset.paintStage] = input.value;
        persistLayout();
        updateEditorPanel();
        showToast(input.dataset.paintStage === "wallStageId" ? "Wall paint stage updated." : "Pillar paint stage updated.");
      });
    });
    panel.querySelectorAll("[data-paint-color]").forEach((input) => {
      input.addEventListener("change", () => {
        pushHistory();
        state.paint[input.dataset.paintColor] = input.value;
        persistLayout();
        updateEditorPanel();
        showToast("Plant paint colors updated.");
      });
    });
    panel.querySelector("[data-editor-action='paint-defaults']")?.addEventListener("click", () => {
      pushHistory();
      state.paint = normalizePaintSettings(defaultPaintSettings);
      persistLayout();
      updateEditorPanel();
      showToast("Wall and pillar paint defaults restored.");
    });
    panel.querySelectorAll("[data-wall-id]").forEach((input) => {
      input.addEventListener("change",() => {
        pushHistory();
        state.walls[input.dataset.wallId] = input.checked;
        persistLayout();
      });
    });
    panel.querySelectorAll("[data-column-position-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const column = structuralColumns().find((item) => item.key === state.selectedColumnKey);
        const value = Number(input.value);
        if (!column || !Number.isFinite(value)) return;
        pushHistory();
        const step = Math.max(.01, Number(state.snapSize) || .1);
        const nextValue = Math.round(value / step) * step;
        setColumnPosition(
          column.key,
          input.dataset.columnPositionField === "x" ? nextValue : column.x,
          input.dataset.columnPositionField === "z" ? nextValue : column.z,
        );
        persistLayout();
        updateEditorPanel();
        showToast("Pillar position updated.");
      });
    });
    panel.querySelector("[data-editor-action='reset-pillar-position']")?.addEventListener("click", () => {
      const key = state.selectedColumnKey;
      if (!key || !columnOverrides[key]) return;
      pushHistory();
      delete columnOverrides[key];
      columnOverridesRevision += 1;
      invalidateStructuralColumns();
      persistLayout();
      updateEditorPanel();
      showToast("Pillar returned to its grid position.");
    });
    panel.querySelector("[data-editor-action='remove-pillar']")?.addEventListener("click", () => {
      const column = structuralColumns().find((item) => item.key === state.selectedColumnKey);
      if (!column) return;
      pushHistory();
      if (column.source === "cad") state.hiddenColumns.add(column.baseIndex);
      else state.hiddenColumnKeys.add(column.key);
      state.selectedColumnKey = null;
      persistLayout();
      updateEditorPanel();
      showToast("Pillar removed. Restore every pillar returns it.");
    });
    updateEditorPanel();
  }

  function fullscreenTarget(frame) {
    return document.querySelector(".site-shell") || frame;
  }

  function nativeFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function touchFullscreenViewport() {
    return Boolean(window.matchMedia?.("(hover: none) and (pointer: coarse)")?.matches || window.innerWidth <= 900);
  }

  function setFullscreenFallback(frame, active) {
    const target = fullscreenTarget(frame);
    target?.classList.toggle("viewer-fullscreen-fallback", Boolean(active));
    document.documentElement.classList.toggle("viewer-fullscreen-fallback-active", Boolean(active));
    document.body?.classList.toggle("viewer-fullscreen-fallback-active", Boolean(active));
    canvasSizeDirty = true;
    renderPerformance.invalidate?.("fullscreen-fallback");
  }

  function viewerFullscreenActive(frame) {
    const target = fullscreenTarget(frame);
    return nativeFullscreenElement() === target || target?.classList.contains("viewer-fullscreen-fallback");
  }

  async function enterViewerFullscreen(frame) {
    const target = fullscreenTarget(frame);
    if (!target) return false;
    if (viewerFullscreenActive(frame)) return true;
    const request = target.requestFullscreen || target.webkitRequestFullscreen;
    if (typeof request === "function") {
      try {
        await Promise.resolve(request.call(target));
        if (nativeFullscreenElement() === target) {
          setFullscreenFallback(frame, false);
          return true;
        }
      } catch (error) {
        if (!touchFullscreenViewport()) console.warn("Full-screen mode could not be opened.", error);
      }
    }
    if (touchFullscreenViewport()) {
      setFullscreenFallback(frame, true);
      return true;
    }
    return false;
  }

  async function exitViewerFullscreen(frame) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (nativeFullscreenElement() && typeof exit === "function") {
      try { await Promise.resolve(exit.call(document)); }
      catch (error) { console.warn("Full-screen mode could not be closed cleanly.", error); }
    }
    setFullscreenFallback(frame, false);
  }

  async function toggleModelFullscreen(frame) {
    if (viewerFullscreenActive(frame)) {
      await exitViewerFullscreen(frame);
    } else if (!await enterViewerFullscreen(frame)) {
      showToast("Full-screen mode is unavailable in this browser.");
    }
    updateFullscreenControl(frame);
  }

  function updateFullscreenControl(frame) {
    const button = frame.querySelector("[data-toggle='fullscreen']");
    if (!button) return;
    const active = viewerFullscreenActive(frame);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", active ? "Exit full screen" : "Full screen");
    button.dataset.tooltip = active ? "Exit full screen" : "Full screen";
    button.innerHTML = active
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  }

  function playProgressButtonMarkup(playing) {
    return `<span class="timeline-progress-icon ${playing ? "pause" : "play"}" aria-hidden="true"></span>${playing ? "Pause progress" : "Play progress"}`;
  }

  function addControls() {
    const frame = canvas.closest(".model-frame");
    if (!frame) return;
    const controls = document.createElement("div");
    controls.className = "model-controls";
    const ownerCombatAllowed = () => window.monroeEditorAccess?.isOwner?.() === true;
    controls.innerHTML = `
      <button type="button" data-view="overview" aria-label="Reset to overview">Overview</button>
      <button type="button" data-toggle="walk" aria-pressed="false">First person</button>
      <button type="button" data-toggle="combat" class="combat-mode-button" aria-pressed="false" hidden>Combat mode</button>
      <button type="button" data-toggle="zombie" class="zombie-mode-button" aria-pressed="false" hidden>Zombie mode</button>
    `;
    frame.appendChild(controls);
    const fullscreenToggle = document.createElement("button");
    fullscreenToggle.type = "button";
    fullscreenToggle.className = "fullscreen-toggle-button viewer-icon-button";
    fullscreenToggle.dataset.toggle = "fullscreen";
    fullscreenToggle.setAttribute("aria-pressed", "false");
    frame.appendChild(fullscreenToggle);
    const editLayout = document.createElement("button");
    editLayout.type = "button";
    editLayout.className = "layout-edit-button";
    editLayout.dataset.toggle = "editor";
    editLayout.setAttribute("aria-pressed", "false");
    editLayout.setAttribute("aria-label", "Edit layout");
    editLayout.dataset.tooltip = "Edit layout";
    editLayout.innerHTML = "&#9998;";
    if (window.monroeEditorAccess?.editingAllowed?.() !== false) frame.appendChild(editLayout);
    const motionToggle = document.createElement("button");
    motionToggle.type = "button";
    motionToggle.className = "motion-toggle-button";
    motionToggle.dataset.toggle = "animations";
    motionToggle.setAttribute("aria-pressed", "false");
    motionToggle.setAttribute("aria-label", "Pause motion");
    motionToggle.dataset.tooltip = "Pause motion";
    motionToggle.innerHTML = '<span class="pause-glyph" aria-hidden="true"><i></i><i></i></span>';
    frame.appendChild(motionToggle);
    const labelOptionsToggle = document.createElement("button");
    labelOptionsToggle.type = "button";
    labelOptionsToggle.className = "label-options-button viewer-icon-button";
    labelOptionsToggle.setAttribute("aria-label", "Production flow and roof options");
    labelOptionsToggle.setAttribute("aria-expanded", "false");
    labelOptionsToggle.dataset.tooltip = "Production flow and roof";
    labelOptionsToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h12l4 6-4 6H4z"/><circle cx="8" cy="12" r="1.5"/></svg>';
    frame.appendChild(labelOptionsToggle);
    const labelOptions = document.createElement("section");
    labelOptions.className = "label-options-popover";
    labelOptions.hidden = true;
    labelOptions.innerHTML = `
      <div class="label-options-heading"><strong>Today view</strong><span>The glowing glass-flow route is always on for Today. These buttons only choose which 3D machine billboards are shown and how they are named.</span></div>
      <div class="label-mode-options today-label-mode-options" role="group" aria-label="Today overview label style">
        <button type="button" data-label-display="necessary">Necessary</button>
        <button type="button" data-label-display="abbreviated">Abbreviated</button>
        <button type="button" data-label-display="full">Full names</button>
      </div>
      <span class="label-options-note">Route: Cutting → Polisher → Denver CNC / Waterjet → Washer → Tempering Line → Wrap → Glass Truck / Rack. Route width and motion use plant-world units so overview and first-person movement stay stable.</span>
      <label class="roof-overview-toggle"><input type="checkbox" data-roof-overview> Show roof in overview</label>
      <span class="label-options-note">Roof remains available in first person when enabled in the editor.</span>
    `;
    frame.appendChild(labelOptions);
    const updateLabelOptions = () => {
      const today = isTodayOverview();
      labelOptions.querySelectorAll("[data-label-display]").forEach((button) => {
        const active = button.dataset.labelDisplay === state.todayLabelMode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
        button.disabled = !today;
      });
      const roofToggle = labelOptions.querySelector("[data-roof-overview]");
      if (roofToggle) roofToggle.checked = Boolean(state.roof.overviewVisible);
      labelOptionsToggle.classList.toggle("active", today);
    };
    const closeLabelOptions = () => {
      labelOptions.hidden = true;
      labelOptionsToggle.setAttribute("aria-expanded", "false");
    };
    labelOptionsToggle.addEventListener("click", () => {
      labelOptions.hidden = !labelOptions.hidden;
      labelOptionsToggle.setAttribute("aria-expanded", String(!labelOptions.hidden));
      if (!labelOptions.hidden) updateLabelOptions();
    });
    labelOptions.querySelectorAll("[data-label-display]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!isTodayOverview()) return;
        const mode = button.dataset.labelDisplay;
        if (!["necessary", "abbreviated", "full"].includes(mode)) return;
        state.todayLabelMode = mode;
        state.labelTextMode = mode === "necessary" ? "abbreviated" : mode;
        state.showLabels = true;
        labelVisualStates.clear();
        updateLabelOptions();
        renderPerformance.invalidate?.("today-label-mode");
        showToast(
          mode === "necessary"
            ? "Today shows only the glass-flow labels."
            : mode === "abbreviated"
              ? "Today shows abbreviated machine labels."
              : "Today shows full machine labels."
        );
      });
    });
    labelOptions.querySelector("[data-roof-overview]")?.addEventListener("change", (event) => {
      pushHistory();
      state.roof.overviewVisible = event.target.checked;
      persistLayout();
      updateLabelOptions();
      showToast(event.target.checked ? "Roof shown in the overview." : "Roof hidden from the overview.");
    });
    addLifecycleListener(document, "pointerdown", (event) => {
      if (!labelOptions.hidden && !labelOptions.contains(event.target) && event.target !== labelOptionsToggle) closeLabelOptions();
    });
    updateLabelOptions();
    renderPerformance.mount(frame, { showControls: false, alwaysShowFps: true });
    createEditorPanel(frame);
    const play = document.createElement("button");
    play.type = "button";
    play.id = "play-timeline";
    play.className = "play-button";
    play.innerHTML = playProgressButtonMarkup(false);
    frame.appendChild(play);

    const reticle = document.createElement("div");
    reticle.className = "walkthrough-reticle";
    reticle.hidden = true;
    reticle.setAttribute("aria-hidden", "true");
    frame.appendChild(reticle);

    const firstPersonHud = document.createElement("section");
    firstPersonHud.className = "first-person-hud";
    firstPersonHud.hidden = true;
    firstPersonHud.innerHTML = `
      <div class="first-person-status">
        <span class="first-person-title">First-person walk</span>
        <span data-first-person-lock>Click the model to capture the mouse</span>
      </div>
      <div class="first-person-keys" aria-label="First-person controls">
        <span><b>WASD</b> move</span><span><b>Mouse</b> look</span><span><b>Shift</b> sprint</span><span><b>Space</b> jump</span><span><b>Ctrl/C</b> crouch</span><span><b>Esc</b> options</span>
      </div>
      <div class="first-person-actions">
        <button type="button" data-first-person-action="capture">Capture mouse</button>
        <button type="button" data-first-person-action="settings">Settings</button>
        <button type="button" data-first-person-action="exit" class="primary">Exit first person</button>
      </div>
      <div class="first-person-settings" data-first-person-settings hidden>
        <label>Walking speed <span data-walk-speed-value>${state.walkSpeed.toFixed(0)} ft/s</span>
          <input data-walk-setting="walkSpeed" type="range" min="2" max="40" step="1" value="${state.walkSpeed}">
        </label>
        <label>Eye height <span data-walk-height-value>${state.walkEyeHeight.toFixed(1)} ft</span>
          <input data-walk-setting="walkEyeHeight" type="range" min="3" max="8" step="0.1" value="${state.walkEyeHeight}">
        </label>
        <label>Field of view <span data-walk-fov-value>${state.walkFov.toFixed(0)}°</span>
          <input data-walk-setting="walkFov" type="range" min="45" max="105" step="1" value="${state.walkFov}">
        </label>
        <label>Mouse sensitivity <span data-walk-sensitivity-value>${(state.walkSensitivity * 1000).toFixed(1)}</span>
          <input data-walk-setting="walkSensitivity" type="range" min="0.5" max="6" step="0.1" value="${state.walkSensitivity * 1000}">
        </label>
        <label class="first-person-check"><input data-walk-setting="walkCollision" type="checkbox" checked> Stop at machines, pillars, and walls</label>
        <label class="first-person-check"><input data-walk-setting="walkHeadBob" type="checkbox" checked> Subtle walking motion</label>
      </div>
    `;
    frame.appendChild(firstPersonHud);

    const firstPersonTouchControls = document.createElement("section");
    firstPersonTouchControls.className = "first-person-touch-controls";
    firstPersonTouchControls.hidden = true;
    firstPersonTouchControls.setAttribute("aria-label", "Mobile first-person controls");
    firstPersonTouchControls.innerHTML = `
      <div class="touch-walk-pad" aria-label="Movement controls">
        <button type="button" data-touch-move="forward" aria-label="Move forward">↑</button>
        <button type="button" data-touch-move="left" aria-label="Move left">←</button>
        <button type="button" data-touch-move="back" aria-label="Move backward">↓</button>
        <button type="button" data-touch-move="right" aria-label="Move right">→</button>
      </div>
      <div class="touch-look-pad" data-touch-look aria-label="Drag to look"><span>Drag to look</span></div>
      <div class="touch-walk-actions">
        <button type="button" data-touch-action="run" aria-pressed="false">Run</button>
        <button type="button" data-touch-action="jump">Jump</button>
        <button type="button" data-touch-action="crouch" aria-pressed="false">Crouch</button>
        <button type="button" data-touch-action="exit" class="touch-exit">Exit</button>
      </div>
      <div class="touch-combat-actions" aria-label="Mobile combat controls">
        <button type="button" data-touch-combat="fire" class="touch-combat-fire">FIRE</button>
        <button type="button" data-touch-combat="aim" aria-pressed="false">AIM</button>
        <button type="button" data-touch-combat="reload">RELOAD</button>
        <button type="button" data-touch-combat="swap">SWAP</button>
        <button type="button" data-touch-combat="menu">MENU</button>
      </div>
    `;
    frame.appendChild(firstPersonTouchControls);

    const firstPersonMenu = document.createElement("section");
    firstPersonMenu.className = "first-person-menu";
    firstPersonMenu.hidden = true;
    firstPersonMenu.setAttribute("aria-label", "First-person options");
    firstPersonMenu.innerHTML = `
      <div class="first-person-menu-card">
        <p>Walkthrough paused</p>
        <h2>First-person options</h2>
        <span>Continue walking, return to the overview while keeping it full screen, or exit back to the centered page view.</span>
        <div>
          <button type="button" data-first-person-menu="resume" class="primary">Continue walking</button>
          <button type="button" data-first-person-menu="overview">Overview · full screen</button>
          <button type="button" data-first-person-menu="exit">Exit to page</button>
        </div>
      </div>
    `;
    frame.appendChild(firstPersonMenu);

    const walkthroughInvite = document.createElement("section");
    walkthroughInvite.className = "walkthrough-invite";
    walkthroughInvite.hidden = true;
    walkthroughInvite.setAttribute("role", "status");
    walkthroughInvite.innerHTML = `
      <button type="button" class="walkthrough-invite-close" data-walkthrough-invite="dismiss" aria-label="Dismiss walkthrough suggestion">&times;</button>
      <span class="walkthrough-invite-icon" aria-hidden="true">&#8594;</span>
      <div><strong>Give the plant a walkthrough</strong><span>Step onto the finished production floor in first person.</span></div>
      <button type="button" class="primary" data-walkthrough-invite="start">Start walking</button>
    `;
    frame.appendChild(walkthroughInvite);
    const dismissWalkthroughInvitation = () => {
      walkthroughInvite.hidden = true;
      frame.querySelector("[data-toggle='walk']")?.classList.remove("walkthrough-highlight");
    };
    showWalkthroughInvitation = () => {
      walkthroughInvite.hidden = false;
      frame.querySelector("[data-toggle='walk']")?.classList.add("walkthrough-highlight");
    };
    walkthroughInvite.querySelector("[data-walkthrough-invite='dismiss']")?.addEventListener("click", dismissWalkthroughInvitation);
    walkthroughInvite.querySelector("[data-walkthrough-invite='start']")?.addEventListener("click", () => {
      dismissWalkthroughInvitation();
      frame.querySelector("[data-toggle='walk']")?.click();
    });

    const isTouchWalkViewport = () => Boolean(
      window.matchMedia?.("(hover: none) and (pointer: coarse)")?.matches || window.innerWidth <= 900
    );

    const setFirstPersonMenu = (open) => {
      if (state.cameraMode !== "walk") open = false;
      firstPersonMenu.hidden = !open;
      const touchWalk = isTouchWalkViewport();
      firstPersonHud.hidden = open || state.cameraMode !== "walk" || touchWalk;
      firstPersonTouchControls.hidden = open || state.cameraMode !== "walk" || !touchWalk;
      if (open) {
        firstPersonController?.release?.();
        window.requestAnimationFrame(() => firstPersonMenu.querySelector("button")?.focus());
      }
    };
    openFirstPersonOptions = setFirstPersonMenu;

    const updateFirstPersonHud = (locked) => {
      const lockText = firstPersonHud.querySelector("[data-first-person-lock]");
      const capture = firstPersonHud.querySelector("[data-first-person-action='capture']");
      const touchWalk = isTouchWalkViewport();
      if (lockText) lockText.textContent = touchWalk ? "Use the left pad to move · drag the right side to look" : locked ? "Mouse captured · Esc opens options" : "Click the model to capture the mouse · Esc opens options";
      if (capture) capture.hidden = locked || touchWalk;
      frame.classList.toggle("pointer-locked", locked);
    };

    let walkModeTransitioning = false;
    let setWalkMode = null;

    firstPersonController = window.createPlantFirstPersonController?.({
      canvas,
      getCamera: () => ({
        x: modelCenter()[0] + state.panX,
        z: modelCenter()[1] + state.panZ,
        yaw: state.yaw,
        pitch: state.pitch,
        walkSpeed: state.walkSpeed,
        walkSensitivity: state.walkSensitivity,
        walkRadius: state.walkRadius,
        walkCollision: state.walkCollision,
        walkHeadBob: state.walkHeadBob,
        walkVerticalOffset: state.walkVerticalOffset,
        walkBobOffset: state.walkBobOffset,
      }),
      setCamera: (next) => {
        if (Number.isFinite(next.x)) state.panX = next.x - modelCenter()[0];
        if (Number.isFinite(next.z)) state.panZ = next.z - modelCenter()[1];
        if (Number.isFinite(next.yaw)) state.yaw = next.yaw;
        if (Number.isFinite(next.pitch)) state.pitch = next.pitch;
        if (Number.isFinite(next.walkVerticalOffset)) state.walkVerticalOffset = next.walkVerticalOffset;
        if (Number.isFinite(next.walkBobOffset)) state.walkBobOffset = next.walkBobOffset;
      },
      canOccupy: walkCanOccupy,
      canOccupyHard: walkCanOccupyHard,
      onLockChange: updateFirstPersonHud,
      onMovement: () => renderPerformance.noteInteraction(120),
      onExitRequest: (reason) => {
        if (state.cameraMode !== "walk" || walkModeTransitioning) return;
        if (combatController?.isActive?.()) {
          setFirstPersonMenu(false);
          combatController.handleEscape?.(reason);
          return;
        }
        setFirstPersonMenu(true);
      },
    }) || null;

    setWalkMode = (enabled, options = {}) => {
      const capturePointer = options.capture !== false;
      const experience = frame.closest(".experience");
      const siteShell = frame.closest(".site-shell");
      if (enabled === (state.cameraMode === "walk")) {
        if (enabled && capturePointer && !isTouchWalkViewport()) firstPersonController?.capture();
        return;
      }
      state.cameraMode = enabled ? "walk" : "orbit";
      resetWalkRenderHistory();
      frame.classList.toggle("walkthrough-mode", enabled);
      experience?.classList.toggle("first-person-active", enabled);
      siteShell?.classList.toggle("first-person-site", enabled);
      const touchWalk = isTouchWalkViewport();
      reticle.hidden = !enabled;
      firstPersonMenu.hidden = true;
      firstPersonHud.hidden = !enabled || touchWalk;
      firstPersonTouchControls.hidden = !enabled || !touchWalk;
      const walkButton = frame.querySelector("[data-toggle='walk']");
      if (walkButton) {
        walkButton.classList.toggle("active", enabled);
        walkButton.setAttribute("aria-pressed", String(enabled));
        walkButton.textContent = enabled ? "Exit first person" : "First person";
      }
      if (enabled) {
        dismissWalkthroughInvitation();
        closeLabelOptions();
        setEditing(false);
        document.activeElement?.blur?.();
        canvas.tabIndex = 0;
        canvas.focus?.({ preventScroll: true });
        walkReturnView = { yaw: state.yaw, pitch: state.pitch, zoom: state.zoom, panX: state.panX, panZ: state.panZ };
        const [spawnX, spawnZ] = findWalkSpawn(modelCenter()[0] + state.panX, modelCenter()[1] + state.panZ);
        state.panX = spawnX - modelCenter()[0];
        state.panZ = spawnZ - modelCenter()[1];
        // Orbit stores the rotation applied to the plant, while first person
        // stores the direction the camera faces. Those directions are opposite:
        // convert by 180 degrees so the walkthrough sees the same world
        // orientation as the overview instead of looking out the back of it.
        state.yaw = Math.atan2(Math.sin(state.yaw + Math.PI), Math.cos(state.yaw + Math.PI));
        state.pitch = 0;
        state.walkVerticalOffset = 0;
        state.walkBobOffset = 0;
        state.combatAimFov = null;
        firstPersonController?.start({ capture: false });
        const captureWalkthrough = () => {
          canvasSizeDirty = true;
          renderPerformance.invalidate?.("first-person-fullscreen");
          if (capturePointer && !touchWalk) firstPersonController?.capture();
        };
        walkStartedFullscreen = false;
        Promise.resolve(enterViewerFullscreen(frame)).then((active) => {
          walkStartedFullscreen = Boolean(active);
          updateFullscreenControl(frame);
          captureWalkthrough();
        }).catch((error) => {
          console.warn("First-person fullscreen could not be opened; using the full-window fallback.", error);
          captureWalkthrough();
        });
        showToast(touchWalk ? "First person started full screen. Rotate your phone anytime; use the left pad to move and drag the right side to look." : "First person started full screen. Use WASD and the mouse; press Esc for options.");
      } else {
        if (combatController?.isActive?.()) combatController.stop();
        walkModeTransitioning = true;
        firstPersonController?.stop();
        Object.keys(touchMoveState).forEach((key) => { touchMoveState[key] = false; });
        firstPersonTouchControls.querySelectorAll(".active").forEach((control) => control.classList.remove("active"));
        firstPersonTouchControls.querySelectorAll("[aria-pressed='true']").forEach((control) => control.setAttribute("aria-pressed", "false"));
        state.walkVerticalOffset = 0;
        state.walkBobOffset = 0;
        if (walkReturnView) Object.assign(state, walkReturnView);
        walkReturnView = null;
        const shouldExitFullscreen = options.exitFullscreen !== false;
        const shouldCenterView = options.centerView !== false && shouldExitFullscreen;
        const centerOverview = () => {
          if (!shouldCenterView) return;
          window.requestAnimationFrame(() => experience?.scrollIntoView?.({ behavior: "smooth", block: "center" }));
        };
        if (shouldExitFullscreen && viewerFullscreenActive(frame)) {
          Promise.resolve(exitViewerFullscreen(frame)).then(centerOverview).catch(centerOverview);
        } else centerOverview();
        walkStartedFullscreen = false;
        walkModeTransitioning = false;
        showToast("Returned to the overview camera.");
      }
      updateFirstPersonHud(false);
      updateEditorHelp();
    };

    const syncCombatButtons = (active, mode = combatController?.getMode?.() || "combat") => {
      const combatButton = frame.querySelector("[data-toggle='combat']");
      const zombieButton = frame.querySelector("[data-toggle='zombie']");
      if (combatButton) {
        const selected = Boolean(active && mode === "combat");
        combatButton.classList.toggle("active", selected);
        combatButton.classList.remove("combat-ready");
        combatButton.setAttribute("aria-pressed", String(selected));
        combatButton.textContent = selected ? "Exit combat" : "Combat mode";
      }
      if (zombieButton) {
        const selected = Boolean(active && mode === "zombie");
        zombieButton.classList.toggle("active", selected);
        zombieButton.setAttribute("aria-pressed", String(selected));
        zombieButton.textContent = selected ? "Exit zombies" : "Zombie mode";
      }
      updateEditorHelp();
    };

    const syncCombatAvailability = () => {
      const allowed = ownerCombatAllowed();
      ["combat", "zombie"].forEach((mode) => {
        const button = frame.querySelector(`[data-toggle='${mode}']`);
        if (!button) return;
        button.hidden = !allowed;
        button.setAttribute("aria-hidden", String(!allowed));
      });
      if (!allowed && combatController?.isActive?.()) combatController.stop();
    };
    syncCombatAvailability();
    addLifecycleListener(window, "plantowneraccesschange", syncCombatAvailability);
    addLifecycleListener(window, "pageshow", syncCombatAvailability);
    addLifecycleListener(window, "focus", syncCombatAvailability);

    const setCombatMode = (enabled, mode = "combat") => {
      if (!ownerCombatAllowed() || !combatController) return;
      if (enabled) {
        if (combatController.isActive?.()) combatController.stop();
        setStage(stages.length - 1);
        state.stageFloat = stages.length - 1;
        if (state.cameraMode !== "walk") setWalkMode(true, { capture: false });
        window.requestAnimationFrame(() => {
          if (state.cameraMode !== "walk" || combatController?.isActive?.()) return;
          combatController.start(mode);
          syncCombatButtons(true, mode);
          showToast(mode === "zombie" ? "Choose Zombie difficulty and Normal or Endless mode, then press Start." : "Combat starts in 2 seconds. Get ready.");
        });
      } else {
        combatController.stop();
        syncCombatButtons(false, mode);
        if (state.cameraMode === "walk") setWalkMode(false);
      }
    };

    combatController = window.createPlantCombatMode?.({
      frame,
      canvas,
      isOwner: () => window.monroeEditorAccess?.isOwner?.() === true,
      getPlayer: () => ({
        x: modelCenter()[0] + state.panX,
        y: Math.max(1.5, Number(state.walkEyeHeight) + Number(state.walkVerticalOffset || 0) + Number(state.walkBobOffset || 0)),
        z: modelCenter()[1] + state.panZ,
        yaw: state.yaw,
        pitch: state.pitch,
        moving: firstPersonController?.isMoving?.() === true,
        engaged: state.cameraMode === "walk" && (
          firstPersonController?.isPointerLocked?.() === true
          || window.matchMedia?.("(hover: none) and (pointer: coarse)")?.matches === true
          || Number(navigator.maxTouchPoints || 0) > 0
        ),
      }),
      getEnemies: combatBaseEnemyMachines,
      getCharacters: combatBaseEnemyMachines,
      getEnemyHeadVolume: combatHeadVolume,
      getOccluders: combatOccluders,
      getBounds: floorBounds,
      getWeaponMuzzleAnchor: (weaponKey,aiming) => {
        const design=designLibrary["combat-weapon-"+String(weaponKey||"rifle")];
        const anchor=design?.combatAnchors?.[aiming?"adsMuzzle":"hipMuzzle"];
        return anchor ? {...anchor,length:Number(design.base?.w)||3.9,depth:Number(design.base?.d)||1.25} : null;
      },
      canPlaceStation: (x,z,radius=2.3) => walkCanOccupy(x,z,radius),
      isPointerLocked: () => firstPersonController?.isPointerLocked?.() === true,
      capture: () => firstPersonController?.capture?.(),
      setMovementLocked: (locked) => firstPersonController?.setInputLocked?.(locked),
      setAimZoom: (enabled, weapon) => {
        state.combatAimFov = enabled ? (weapon === "sniper" ? Math.max(27, state.walkFov * .43) : weapon === "rifle" ? Math.max(50, state.walkFov * .76) : Math.max(46, state.walkFov * .78)) : null;
        renderPerformance.invalidate?.("combat-aim-zoom");
      },
      hideWalkMenu: () => setFirstPersonMenu(false),
      releasePointer: () => {
        walkModeTransitioning = true;
        firstPersonController?.release?.();
        window.setTimeout(() => { walkModeTransitioning = false; }, 120);
      },
      focusEnemy: (target) => {
        if (!target) return;
        const playerX = modelCenter()[0] + state.panX;
        const playerY = Math.max(.85, Number(state.walkEyeHeight) + Number(state.walkVerticalOffset || 0));
        const playerZ = modelCenter()[1] + state.panZ;
        const dx = Number(target.x) - playerX;
        const dy = Number(target.y) - playerY;
        const dz = Number(target.z) - playerZ;
        const horizontal = Math.max(.001, Math.hypot(dx, dz));
        state.yaw = Math.atan2(dx, dz);
        state.pitch = clamp(Math.atan2(dy, horizontal), -1.12, 1.12);
        renderPerformance.invalidate?.("combat-killer-focus");
      },
      playDeathCinematic: ({ target, durationMs = 5000 } = {}) => {
        const serial = (state.combatDeathCinematicSerial || 0) + 1;
        state.combatDeathCinematicSerial = serial;
        const startedAt = performance.now();
        const startYaw = Number(state.yaw) || 0;
        const startPitch = Number(state.pitch) || 0;
        const startVertical = Number(state.walkVerticalOffset) || 0;
        const playerX = modelCenter()[0] + state.panX;
        const playerZ = modelCenter()[1] + state.panZ;
        const finalVertical = Math.min(startVertical, -(Math.max(3.8, Number(state.walkEyeHeight) || 5.6) - .3));
        const targetYaw = target ? Math.atan2(Number(target.x) - playerX, Number(target.z) - playerZ) : startYaw;
        const finalEyeY = Math.max(.85, Number(state.walkEyeHeight) + finalVertical);
        const targetHorizontal = target ? Math.max(.001, Math.hypot(Number(target.x) - playerX, Number(target.z) - playerZ)) : 1;
        const targetPitch = target ? clamp(Math.atan2(Number(target.y) - finalEyeY, targetHorizontal), -.9, .9) : startPitch;
        const smooth = (value) => value * value * (3 - 2 * value);
        const shortestAngle = (from, to) => {
          let delta = to - from;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          return delta;
        };
        const tick = (now) => {
          if (state.combatDeathCinematicSerial !== serial || !combatController?.isActive?.()) return;
          const elapsed = Math.max(0, now - startedAt);
          const fall = smooth(clamp(elapsed / 1050, 0, 1));
          const focus = smooth(clamp((elapsed - 1050) / 2050, 0, 1));
          state.walkVerticalOffset = startVertical + (finalVertical - startVertical) * fall;
          state.walkBobOffset = 0;
          state.yaw = startYaw + shortestAngle(startYaw, targetYaw) * focus;
          const fallPitch = startPitch + (-.68 - startPitch) * fall;
          state.pitch = fallPitch + (targetPitch - fallPitch) * focus;
          renderPerformance.invalidate?.("combat-death-cinematic");
          if (elapsed < durationMs) window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
      },
      resetDeathCinematic: () => {
        state.combatDeathCinematicSerial = (state.combatDeathCinematicSerial || 0) + 1;
        state.walkVerticalOffset = 0;
        state.walkBobOffset = 0;
        state.pitch = clamp(Number(state.pitch) || 0, -.35, .35);
        renderPerformance.invalidate?.("combat-death-reset");
      },
      exitCombat: () => setCombatMode(false, combatController?.getMode?.() || "combat"),
      invalidate: () => renderPerformance.invalidate?.("combat-mode"),
      onStateChange: syncCombatButtons,
      onCombatStart: () => {
        if (combatController?.getMode?.() !== "zombie") {
          const settings=combatController?.getCombatSettings?.() || {};
          const difficulty=String(settings.difficulty || "normal").replace(/^./,(value)=>value.toUpperCase());
          showToast(`${difficulty} Combat started${settings.matchType === "private" ? " · Private Match" : settings.matchType === "coop" ? " · Co-op" : ""}.`);
          return;
        }
        const settings = combatController?.getZombieSettings?.() || {};
        const difficulty = String(settings.difficulty || "normal").replace(/^./,(value)=>value.toUpperCase());
        showToast(settings.endless ? `${difficulty} Endless started — survive as long as possible.` : `${difficulty} Normal started — clear every zombie in the plant.`);
      },
    }) || null;

    if (ownerCombatAllowed() && new URLSearchParams(window.location.search).get("owner") === "combat") {
      const combatButton = frame.querySelector("[data-toggle='combat']");
      const zombieButton = frame.querySelector("[data-toggle='zombie']");
      combatButton?.classList.add("combat-ready");
      zombieButton?.classList.add("combat-ready");
      showToast("Owner modes are ready. Choose Combat mode or Zombie mode.");
    }

    const touchMoveState = { forward: false, back: false, left: false, right: false };
    const syncTouchMove = () => {
      firstPersonController?.setTouchMove?.(
        Number(touchMoveState.forward) - Number(touchMoveState.back),
        Number(touchMoveState.right) - Number(touchMoveState.left),
      );
    };
    firstPersonTouchControls.querySelectorAll("[data-touch-move]").forEach((button) => {
      const direction = button.dataset.touchMove;
      const setPressed = (pressed, event) => {
        event?.preventDefault?.();
        if (pressed) event?.currentTarget?.setPointerCapture?.(event.pointerId);
        touchMoveState[direction] = pressed;
        button.classList.toggle("active", pressed);
        syncTouchMove();
      };
      button.addEventListener("pointerdown", (event) => setPressed(true, event));
      ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => button.addEventListener(type, (event) => setPressed(false, event)));
    });
    const runButton = firstPersonTouchControls.querySelector("[data-touch-action='run']");
    const setRun = (active, event) => {
      event?.preventDefault?.();
      runButton?.classList.toggle("active", active);
      runButton?.setAttribute("aria-pressed", String(active));
      firstPersonController?.setTouchSprint?.(active);
    };
    runButton?.addEventListener("pointerdown", (event) => {
      event.currentTarget?.setPointerCapture?.(event.pointerId);
      setRun(true, event);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => runButton?.addEventListener(type, (event) => setRun(false, event)));
    firstPersonTouchControls.querySelector("[data-touch-action='jump']")?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      firstPersonController?.requestJump?.();
    });
    const crouchButton = firstPersonTouchControls.querySelector("[data-touch-action='crouch']");
    crouchButton?.addEventListener("click", () => {
      const active = crouchButton.getAttribute("aria-pressed") !== "true";
      crouchButton.setAttribute("aria-pressed", String(active));
      crouchButton.classList.toggle("active", active);
      firstPersonController?.setTouchCrouch?.(active);
    });
    firstPersonTouchControls.querySelector("[data-touch-action='exit']")?.addEventListener("click", () => {
      if (combatController?.isActive?.()) combatController.handleEscape?.("mobile-exit");
      else setWalkMode(false);
    });
    const touchLookPad = firstPersonTouchControls.querySelector("[data-touch-look]");
    let touchLookPointer = null;
    let touchLookX = 0;
    let touchLookY = 0;
    touchLookPad?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      touchLookPointer = event.pointerId;
      touchLookX = event.clientX;
      touchLookY = event.clientY;
      touchLookPad.setPointerCapture?.(event.pointerId);
      touchLookPad.classList.add("active");
    });
    touchLookPad?.addEventListener("pointermove", (event) => {
      if (event.pointerId !== touchLookPointer) return;
      event.preventDefault();
      const dx = event.clientX - touchLookX;
      const dy = event.clientY - touchLookY;
      touchLookX = event.clientX;
      touchLookY = event.clientY;
      firstPersonController?.lookBy?.(dx, dy, 1.35);
    });
    const endTouchLook = (event) => {
      if (event.pointerId !== touchLookPointer) return;
      touchLookPointer = null;
      touchLookPad?.classList.remove("active");
    };
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => touchLookPad?.addEventListener(type, endTouchLook));

    const touchFireButton = firstPersonTouchControls.querySelector("[data-touch-combat='fire']");
    const setTouchFire = (active, event) => {
      event?.preventDefault?.();
      if (active) event?.currentTarget?.setPointerCapture?.(event.pointerId);
      touchFireButton?.classList.toggle("active", active);
      combatController?.setTriggerHeld?.(active);
    };
    touchFireButton?.addEventListener("pointerdown", (event) => setTouchFire(true, event));
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => touchFireButton?.addEventListener(type, (event) => setTouchFire(false, event)));

    const touchAimButton = firstPersonTouchControls.querySelector("[data-touch-combat='aim']");
    touchAimButton?.addEventListener("click", (event) => {
      event.preventDefault();
      if (!combatController?.isActive?.()) return;
      const activeAim = touchAimButton.getAttribute("aria-pressed") !== "true";      touchAimButton.setAttribute("aria-pressed", String(activeAim));
      touchAimButton.classList.toggle("active", activeAim);
      combatController.setAiming?.(activeAim);
    });
    firstPersonTouchControls.querySelector("[data-touch-combat='reload']")?.addEventListener("click", (event) => {
      event.preventDefault();
      combatController?.reload?.();
    });
    firstPersonTouchControls.querySelector("[data-touch-combat='swap']")?.addEventListener("click", (event) => {
      event.preventDefault();
      combatController?.toggleWeapon?.();
      if (touchAimButton) {
        touchAimButton.setAttribute("aria-pressed", "false");
        touchAimButton.classList.remove("active");
      }
    });
    firstPersonTouchControls.querySelector("[data-touch-combat='menu']")?.addEventListener("click", (event) => {
      event.preventDefault();
      combatController?.handleEscape?.("mobile-menu");
    });

    firstPersonHud.querySelector("[data-first-person-action='capture']")?.addEventListener("click", () => firstPersonController?.capture());
    firstPersonHud.querySelector("[data-first-person-action='exit']")?.addEventListener("click", () => setWalkMode(false));
    firstPersonHud.querySelector("[data-first-person-action='settings']")?.addEventListener("click", () => {
      const settingsPanel = firstPersonHud.querySelector("[data-first-person-settings]");
      if (settingsPanel) settingsPanel.hidden = !settingsPanel.hidden;
    });
    firstPersonHud.querySelectorAll("[data-walk-setting]").forEach((input) => {
      input.addEventListener("input", () => {
        const field = input.dataset.walkSetting;
        if (["walkCollision", "walkHeadBob"].includes(field)) state[field] = input.checked;
        else if (field === "walkSensitivity") state.walkSensitivity = Number(input.value) / 1000;
        else state[field] = Number(input.value);
        const speedValue = firstPersonHud.querySelector("[data-walk-speed-value]");
        const heightValue = firstPersonHud.querySelector("[data-walk-height-value]");
        const fovValue = firstPersonHud.querySelector("[data-walk-fov-value]");
        const sensitivityValue = firstPersonHud.querySelector("[data-walk-sensitivity-value]");
        if (speedValue) speedValue.textContent = `${state.walkSpeed.toFixed(0)} ft/s`;
        if (heightValue) heightValue.textContent = `${state.walkEyeHeight.toFixed(1)} ft`;
        if (fovValue) fovValue.textContent = `${state.walkFov.toFixed(0)}°`;
        if (sensitivityValue) sensitivityValue.textContent = (state.walkSensitivity * 1000).toFixed(1);
        renderPerformance.noteInteraction(180);
      });
    });

    firstPersonMenu.querySelector("[data-first-person-menu='resume']")?.addEventListener("click", () => {
      setFirstPersonMenu(false);
      firstPersonController?.capture();
    });
    firstPersonMenu.querySelector("[data-first-person-menu='overview']")?.addEventListener("click", async () => {
      const fullscreenReady = await enterViewerFullscreen(frame);
      setWalkMode(false, { exitFullscreen: !fullscreenReady, centerView: !fullscreenReady });
    });
    firstPersonMenu.querySelector("[data-first-person-menu='exit']")?.addEventListener("click", () => {
      setWalkMode(false, { exitFullscreen: true, centerView: true });
    });

    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        if (state.cameraMode === "walk") setWalkMode(false);
        if (button.dataset.view === "top") {
          state.yaw = 0;
          state.pitch = 1.42;
          state.zoom = .9;
          state.panX = 0;
          state.panZ = 0;
        } else if (button.dataset.view === "low") {
          state.yaw = -.72;
          state.pitch = .035;
          state.zoom = 1.8;
          state.panX = 0;
          state.panZ = 0;
        } else {
          Object.assign(state, OVERVIEW_CAMERA);
        }
      });
    });
    frame.querySelectorAll("[data-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.toggle === "editor") {
          if (state.cameraMode === "walk") setWalkMode(false);
          setEditing(!state.editing);
          return;
        }
        if (button.dataset.toggle === "combat") {
          const sameMode = combatController?.isActive?.() && combatController?.getMode?.() === "combat";
          setCombatMode(!sameMode, "combat");
          return;
        }
        if (button.dataset.toggle === "zombie") {
          const sameMode = combatController?.isActive?.() && combatController?.getMode?.() === "zombie";
          setCombatMode(!sameMode, "zombie");
          return;
        }
        if (button.dataset.toggle === "walk") {
          setWalkMode(state.cameraMode !== "walk");
          return;
        }
        if (button.dataset.toggle === "fullscreen") {
          toggleModelFullscreen(frame);
          return;
        }
        if (button.dataset.toggle === "animations") {
          const now = performance.now();
          if (state.animationsPaused) {
            state.animationTimeOffset += Math.max(0, now - state.animationPausedAt);
            state.animationsPaused = false;
          } else {
            state.animationsPaused = true;
            state.animationPausedAt = now;
          }
          const motionLabel = state.animationsPaused ? "Resume motion" : "Pause motion";
          button.classList.toggle("active", state.animationsPaused);
          button.setAttribute("aria-pressed", String(state.animationsPaused));
          button.setAttribute("aria-label", motionLabel);
          button.dataset.tooltip = motionLabel;
          button.innerHTML = state.animationsPaused
            ? '<span class="play-glyph" aria-hidden="true"></span>'
            : '<span class="pause-glyph" aria-hidden="true"><i></i><i></i></span>';
          showToast(state.animationsPaused ? "All model animations paused in place." : "Model animations resumed from the paused frame.");
          return;
        }
        if (button.dataset.toggle === "labels") {
          const modes = ["smart", "all", "off"];
          const currentIndex = Math.max(0, modes.indexOf(state.labelMode));
          state.labelMode = modes[(currentIndex + 1) % modes.length];
          state.showLabels = state.labelMode !== "off";
          button.classList.toggle("active", state.showLabels);
          button.setAttribute("aria-pressed", String(state.showLabels));
          button.textContent = state.labelMode === "smart"
            ? "Smart labels"
            : state.labelMode === "all" ? "All labels" : "Labels off";
          showToast(
            state.labelMode === "smart"
              ? "Smart labels prioritize major equipment and reduce clutter as you zoom out."
              : state.labelMode === "all"
                ? "All eligible labels are enabled; collision avoidance still prevents unreadable stacking."
                : "Machine labels hidden."
          );
        }
      });
    });
    const handleFullscreenChange = () => {
      updateFullscreenControl(frame);
      canvasSizeDirty = true;
      renderPerformance.invalidate?.("fullscreen-change");
      if (state.cameraMode === "walk" && walkStartedFullscreen && !viewerFullscreenActive(frame)) setFirstPersonMenu(true);
    };
    addLifecycleListener(document, "fullscreenchange", handleFullscreenChange);
    addLifecycleListener(document, "webkitfullscreenchange", handleFullscreenChange);
    const handleViewportGeometryChange = () => {
      canvasSizeDirty = true;
      renderPerformance.invalidate?.("viewport-geometry-change");
      updateFullscreenControl(frame);
    };
    addLifecycleListener(window, "resize", handleViewportGeometryChange);
    addLifecycleListener(window, "orientationchange", () => window.setTimeout(handleViewportGeometryChange, 80));
    addLifecycleListener(window.visualViewport, "resize", handleViewportGeometryChange);
    addLifecycleListener(window.screen?.orientation, "change", handleViewportGeometryChange);
    updateFullscreenControl(frame);
    play.addEventListener("click", () => {
      if (!state.playing && state.stage >= stages.length - 1) setStage(0);
      state.playing = !state.playing;
      state.playAt = performance.now() + state.stageDurationSeconds * 1000;
      play.classList.toggle("active", state.playing);
      play.innerHTML = playProgressButtonMarkup(state.playing);
    });
  }

  function addTimelineToolbar() {
    const timeline = document.querySelector(".timeline");
    if (!timeline || timeline.querySelector(".timeline-toolbar")) return;
    const toolbar = document.createElement("div");
    toolbar.className = "timeline-toolbar";
    toolbar.innerHTML = `
      <label class="timeline-scrubber-label" for="timeline-scrubber">
        <span>Scrub timeline</span>
        <input id="timeline-scrubber" type="range" min="0" max="${Math.max(0, stages.length - 1)}" value="${state.stage}" step="1">
      </label>
      <label class="timeline-duration-label" for="timeline-duration">
        <span>Time between stages</span>
        <select id="timeline-duration">
          <option value="5">5 seconds</option>
          <option value="10">10 seconds</option>
          <option value="15">15 seconds</option>
          <option value="20">20 seconds</option>
          <option value="25">25 seconds</option>
          <option value="30">30 seconds</option>
          <option value="35">35 seconds</option>
          <option value="40">40 seconds</option>
          <option value="45">45 seconds</option>
          <option value="60">60 seconds</option>
        </select>
      </label>
    `;
    timeline.prepend(toolbar);
    if (!timeline.querySelector(".timeline-track-scroll")) {
      const trackScroll = document.createElement("div");
      trackScroll.className = "timeline-track-scroll";
      const progress = timeline.querySelector(".timeline-progress");
      const stageList = timeline.querySelector("#timeline-stages");
      if (progress && stageList) {
        progress.before(trackScroll);
        trackScroll.append(progress,stageList);
      }
    }
    const scrubber = toolbar.querySelector("#timeline-scrubber");
    scrubber.addEventListener("input", () => setStage(Number(scrubber.value)));
    const duration = toolbar.querySelector("#timeline-duration");
    duration.value = String(normalizeStageDuration(state.stageDurationSeconds));
    duration.addEventListener("change", () => {
      state.stageDurationSeconds = normalizeStageDuration(duration.value);
      if (state.playing) state.playAt = performance.now() + state.stageDurationSeconds * 1000;
      persistLayout();
      showToast(`${state.stageDurationSeconds} seconds between stages.`);
    });
  }

  function clamp(value, minimum = 0, maximum = 1) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function stageAlpha(reveal, retire = 99) {
    const enter = clamp(state.stageFloat - reveal + 1);
    const leave = clamp(retire - state.stageFloat + 1);
    return enter * leave;
  }

  const WALK_NEAR_CLIP = 0.18;

  function project(x, y, z) {
    if (state.cameraMode === "walk") {
      const cameraX = modelCenter()[0] + state.panX;
      const cameraHeight = state.walkEyeHeight + state.walkVerticalOffset + state.walkBobOffset;
      const cameraZ = modelCenter()[1] + state.panZ;
      const dx = x - cameraX;
      const dy = y - cameraHeight;
      const dz = z - cameraZ;
      const cosineYaw = Math.cos(state.yaw);
      const sineYaw = Math.sin(state.yaw);
      // Walk yaw is the overview rotation plus 180 degrees, so its conventional
      // right vector would mirror the Overview from left to right. Use the
      // opposite horizontal basis to keep both views on the same plant axes.
      const cameraXAxis = -dx * cosineYaw + dz * sineYaw;
      const forward = dx * sineYaw + dz * cosineYaw;
      const cosinePitch = Math.cos(state.pitch);
      const sinePitch = Math.sin(state.pitch);
      const cameraVertical = dy * cosinePitch - forward * sinePitch;
      const cameraDepth = forward * cosinePitch + dy * sinePitch;
      const safeDepth = Math.max(WALK_NEAR_CLIP, cameraDepth);
      const fieldOfView = clamp(Number(state.walkFov) || 72, 45, 105) * Math.PI / 180;
      const focalLength = canvas.height / Math.max(0.1, 2 * Math.tan(fieldOfView / 2));
      // Perspective depth must be reciprocal before it reaches the screen-space
      // depth renderer. Camera-space Z is not linear after perspective division;
      // interpolating it across already projected triangles causes rear surfaces
      // to win the depth test and appear through cabinets or walls. 1/Z is linear
      // in screen space, so it gives the depth buffer the same ordering a normal
      // perspective projection matrix would produce.
      const reciprocalDepth = 1 / safeDepth;
      return [
        canvas.width / 2 + cameraXAxis * focalLength / safeDepth,
        canvas.height / 2 - cameraVertical * focalLength / safeDepth,
        reciprocalDepth,
        cameraDepth,
      ];
    }

    x -= modelCenter()[0] + state.panX;
    z -= modelCenter()[1] + state.panZ;
    const cy = Math.cos(state.yaw);
    const sy = Math.sin(state.yaw);
    const rx = x * cy - z * sy;
    const rz = x * sy + z * cy;
    const cp = Math.cos(state.pitch);
    const sp = Math.sin(state.pitch);
    const scale = state.zoom * Math.min(canvas.width / 720, canvas.height / 420);
    return [
      canvas.width / 2 + rx * scale,
      canvas.height * .57 - (y * cp - rz * sp) * scale,
      y * sp + rz * cp,
    ];
  }

  function structuralHeightProfile() {
    const bounds = floorBounds();
    return {
      splitX: bounds[0] + (bounds[2] - bounds[0]) * state.roof.splitPercent / 100,
      leftHeight: state.roof.leftHeight,
      rightHeight: state.roof.rightHeight,
    };
  }

  function displayedRoofProfile() {
    const roofIsVisible = state.roof.enabled && (state.cameraMode === "walk" || state.roof.overviewVisible);
    return roofIsVisible ? structuralHeightProfile() : null;
  }

  function displayedColumnHeight(column, heightProfile = structuralHeightProfile()) {
    if (!heightProfile) return 22;
    return Number(column?.x) < heightProfile.splitX ? heightProfile.leftHeight : heightProfile.rightHeight;
  }

  function displayedWallSections() {
    const sections = wallSections();
    const roofProfile = structuralHeightProfile();
    if (!state.wallGeometry.extendToRoof) return sections;
    const heightAt = (x) => x < roofProfile.splitX ? roofProfile.leftHeight : roofProfile.rightHeight;
    const result = [];
    sections.forEach((section) => {
      const horizontalWall = section.w > section.d;
      const sectionEnd = section.x + section.w;
      if (horizontalWall && section.x < roofProfile.splitX && sectionEnd > roofProfile.splitX) {
        result.push({ ...section, w: roofProfile.splitX - section.x, h: roofProfile.leftHeight });
        result.push({ ...section, x: roofProfile.splitX, w: sectionEnd - roofProfile.splitX, h: roofProfile.rightHeight });
      } else {
        result.push({ ...section, h: heightAt(section.x + section.w / 2) });
      }
    });
    return result;
  }

  function rendererViewState() {
    if (state.cameraMode === "walk") {
      return {
        mode: "walk",
        centerX: modelCenter()[0] + state.panX,
        cameraY: state.walkEyeHeight + state.walkVerticalOffset + state.walkBobOffset,
        centerZ: modelCenter()[1] + state.panZ,
        yaw: state.yaw,
        pitch: state.pitch,
        fov: Number.isFinite(state.combatAimFov) ? state.combatAimFov : state.walkFov,
        near: WALK_NEAR_CLIP,
        far: Math.max(900, renderPerformance.walkDrawDistance() * 3),
      };
    }
    return {
      mode: "orbit",
      centerX: modelCenter()[0] + state.panX,
      centerZ: modelCenter()[1] + state.panZ,
      yaw: state.yaw,
      pitch: state.pitch,
      scale: state.zoom * Math.min(canvas.width / 720, canvas.height / 420),
      originY: .57,
      depthRange: Math.max(1600, Math.hypot(floor.width, floor.length) * 2.5),
    };
  }

  function drawRetainedObject(key, revision, callback) {
    if (!depthRenderer.available) {
      callback();
      return true;
    }
    const shouldBuild = typeof depthRenderer.beginObject !== "function"
      || depthRenderer.beginObject(key, revision) !== false;
    if (!shouldBuild) return false;
    const previousReusableState = recordingReusableGeometry;
    recordingReusableGeometry = depthRenderer.retained === true;
    try {
      callback();
    } finally {
      recordingReusableGeometry = previousReusableState;
      depthRenderer.endObject?.();
    }
    return true;
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return [
      (event.clientX - rect.left) * canvas.width / rect.width,
      (event.clientY - rect.top) * canvas.height / rect.height,
    ];
  }

  function worldFromCanvasPoint(screenX, screenY) {
    const cy = Math.cos(state.yaw);
    const sy = Math.sin(state.yaw);
    const rawSin = Math.sin(state.pitch);
    const sp = Math.abs(rawSin) < .04 ? (rawSin < 0 ? -.04 : .04) : rawSin;
    const cp = Math.cos(state.pitch);
    const scale = state.zoom * Math.min(canvas.width / 720, canvas.height / 420);
    const cameraY = state.cameraMode === "walk" ? state.walkEyeHeight : 0;
    const rx = (screenX - canvas.width/2) / scale;
    const rz = (screenY - canvas.height*.57 - cameraY * cp * scale) / (sp * scale);
    return [
      modelCenter()[0] + state.panX + rx*cy + rz*sy,
      modelCenter()[1] + state.panZ - rx*sy + rz*cy,
    ];
  }

  function worldFromScreen(event) {
    return worldFromCanvasPoint(...canvasPoint(event));
  }

  function overheadViewBounds(paddingPixels = 100) {
    if (state.cameraMode === "walk") return null;
    const padding = Math.max(0, Number(paddingPixels) || 0);
    const points = [
      worldFromCanvasPoint(-padding, -padding),
      worldFromCanvasPoint(canvas.width + padding, -padding),
      worldFromCanvasPoint(canvas.width + padding, canvas.height + padding),
      worldFromCanvasPoint(-padding, canvas.height + padding),
    ];
    return {
      minX: Math.min(...points.map((point) => point[0])),
      maxX: Math.max(...points.map((point) => point[0])),
      minZ: Math.min(...points.map((point) => point[1])),
      maxZ: Math.max(...points.map((point) => point[1])),
    };
  }

  function angleRadians(item) {
    const rotationY = Number.isFinite(Number(item?.rotationY))
      ? Number(item.rotationY)
      : Number(item?.rotation) || 0;
    return rotationY * Math.PI / 180;
  }

  function localPoint(item, localX, y, localZ) {
    const angle = angleRadians(item);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const centeredX = localX - item.w / 2;
    const centeredZ = localZ - item.d / 2;
    return [
      item.x + item.w / 2 + centeredX * cosine - centeredZ * sine,
      y + (Number(item.renderY ?? item.y) || 0),
      item.z + item.d / 2 + centeredX * sine + centeredZ * cosine,
    ];
  }

  function footprint(item, padding = 0, y = 0) {
    return [
      localPoint(item, -padding, y, -padding),
      localPoint(item, item.w + padding, y, -padding),
      localPoint(item, item.w + padding, y, item.d + padding),
      localPoint(item, -padding, y, item.d + padding),
    ];
  }

  function localBox(parent, localX, localZ, width, depth, height, color, baseY = 0) {
    const centerPoint = localPoint(parent, localX + width / 2, baseY, localZ + depth / 2);
    const rotationY = Number.isFinite(Number(parent.rotationY))
      ? Number(parent.rotationY)
      : Number(parent.rotation) || 0;
    return {
      x: centerPoint[0] - width / 2,
      y: centerPoint[1],
      z: centerPoint[2] - depth / 2,
      w: width,
      d: depth,
      h: height,
      color,
      rotationY,
      rotation: rotationY,
    };
  }

  function localLine(parent, start, end, color, width = 1, alpha = 1) {
    line3d(
      localPoint(parent, start[0], start[1], start[2]),
      localPoint(parent, end[0], end[1], end[2]),
      color,
      width,
      alpha
    );
  }

  function objectRotation(parent) {
    return [
      Number(parent.rotationX) || 0,
      Number.isFinite(Number(parent.rotationY)) ? Number(parent.rotationY) : Number(parent.rotation) || 0,
      Number(parent.rotationZ) || 0,
    ];
  }

  function localPoint3d(parent, localX, localY, localZ) {
    const baseY = Number(parent.renderY ?? parent.y) || 0;
    const center = [parent.x + parent.w / 2, baseY + parent.h / 2, parent.z + parent.d / 2];
    const offset = [localX - parent.w / 2, localY - parent.h / 2, localZ - parent.d / 2];
    const rotated = rotateVector3(offset, ...objectRotation(parent));
    return [center[0] + rotated[0], center[1] + rotated[1], center[2] + rotated[2]];
  }

  function localBox3d(parent, localX, localZ, width, depth, height, color, baseY = 0) {
    const center = localPoint3d(parent, localX + width / 2, baseY + height / 2, localZ + depth / 2);
    const [rotationX, rotationY, rotationZ] = objectRotation(parent);
    return {
      x: center[0] - width / 2,
      y: center[1] - height / 2,
      z: center[2] - depth / 2,
      w: width,
      d: depth,
      h: height,
      color,
      rotationX,
      rotationY,
      rotationZ,
      rotation: rotationY,
    };
  }

  function localLine3d(parent, start, end, color, width = 1, alpha = 1) {
    line3d(
      localPoint3d(parent, start[0], start[1], start[2]),
      localPoint3d(parent, end[0], end[1], end[2]),
      color,
      width,
      alpha
    );
  }

  function pointInsideMachine(machine, x, z, padding = 2) {
    const angle = -angleRadians(machine);
    const centerX = machine.x + machine.w / 2;
    const centerZ = machine.z + machine.d / 2;
    const deltaX = x - centerX;
    const deltaZ = z - centerZ;
    const localX = deltaX * Math.cos(angle) - deltaZ * Math.sin(angle) + machine.w / 2;
    const localZ = deltaX * Math.sin(angle) + deltaZ * Math.cos(angle) + machine.d / 2;
    return localX >= -padding && localX <= machine.w + padding && localZ >= -padding && localZ <= machine.d + padding;
  }

  function machineAt(event) {
    const [x,z] = worldFromScreen(event);
    return machines
      .filter((machine) => machine.visible !== false)
      .filter((machine) => stageAlpha(machine.reveal, machine.retire) > .08)
      .map((machine) => ({ source: machine, rendered: animatedMachine(machine, state.lastFrameTime) }))
      .filter(({ rendered }) => pointInsideMachine(rendered,x,z))
      .sort((a,b) => a.rendered.w*a.rendered.d - b.rendered.w*b.rendered.d)[0]?.source || null;
  }

  function columnAt(event) {
    const [x,z] = worldFromScreen(event);
    let nearest = null;
    let distance = 6;
    structuralColumns().forEach((column) => {
      if (isColumnHidden(column)) return;
      const candidate = Math.hypot(column.x-x,column.z-z);
      if (candidate < distance) {
        nearest = column;
        distance = candidate;
      }
    });
    return nearest;
  }

  function setColumnPosition(key, x, z) {
    if (!key || !Number.isFinite(x) || !Number.isFinite(z)) return false;
    const bounds = floorBounds();
    columnOverrides[key] = {
      x: clamp(x, bounds[0] + 1.1, bounds[2] - 1.1),
      z: clamp(z, bounds[1] + 1.1, bounds[3] - 1.1),
    };
    columnOverridesRevision += 1;
    invalidateStructuralColumns();
    renderPerformance.invalidate();
    return true;
  }

  function processAnchorPercentsFromWorld(machine, worldX, worldZ, time = state.lastFrameTime) {
    const rendered = machineHasLayoutMotion(machine) ? animatedMachine(machine, time) : machine;
    if (!rendered) return null;
    const angle = angleRadians(rendered), cosine = Math.cos(angle), sine = Math.sin(angle);
    const centerX = rendered.x + rendered.w / 2, centerZ = rendered.z + rendered.d / 2;
    const deltaX = worldX - centerX, deltaZ = worldZ - centerZ;
    const centeredX = deltaX * cosine + deltaZ * sine;
    const centeredZ = -deltaX * sine + deltaZ * cosine;
    return {
      x: clamp((centeredX + rendered.w / 2) / Math.max(.01, rendered.w) * 100, PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT),
      z: clamp((centeredZ + rendered.d / 2) / Math.max(.01, rendered.d) * 100, PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT),
    };
  }

  function selectedProcessFlowRoute(time = state.lastFrameTime) {
    const connection = selectedProcessConnection();
    if (!connection) return null;
    const fromEntry = processEndpointEntry(machineById(connection.sourceId), time);
    const toEntry = processEndpointEntry(machineById(connection.targetId), time);
    return fromEntry && toEntry ? processRouteTagDescriptor(fromEntry, toEntry, connection) : null;
  }

  function processFlowHandleAt(event){
    if(!state.editing||state.editorTool!=="machines"||state.objectEditorTab!=="pointers"||state.cameraMode==="walk")return null;
    const route=selectedProcessFlowRoute();if(!route)return null;
    const point=canvasPoint(event),rect=canvas.getBoundingClientRect(),pixelScale=canvas.width/Math.max(1,rect.width),hitRadius=16*pixelScale;
    const candidates=[{kind:"start",world:route.startWorld},{kind:"end",world:route.endWorld},...(route.bendPoints||[]).map((pivot,index)=>({kind:"pivot",pivotId:pivot.id||`pivot-${index+1}`,pivotIndex:index,world:pivot.point}))];
    return candidates.map((candidate)=>{const screen=project(...candidate.world);return{...candidate,distance:Number.isFinite(screen[0])&&Number.isFinite(screen[1])?Math.hypot(point[0]-screen[0],point[1]-screen[1]):Infinity};}).filter((candidate)=>candidate.distance<=hitRadius).sort((a,b)=>a.distance-b.distance)[0]||null;
  }

  function updateDraggedProcessEndpoint(endpoint, event) {
    const connection = selectedProcessConnection();
    if (!connection) return false;
    const machine = machineById(endpoint === "start" ? connection.sourceId : connection.targetId);
    if (!machine) return false;
    const [worldX, worldZ] = worldFromScreen(event), local = processAnchorPercentsFromWorld(machine, worldX, worldZ);
    if (!local) return false;
    const xField = endpoint === "start" ? "startAnchorXPercent" : "endAnchorXPercent";
    const zField = endpoint === "start" ? "startAnchorZPercent" : "endAnchorZPercent";
    const changed = Math.abs(Number(connection[xField]) - local.x) > .0001 || Math.abs(Number(connection[zField]) - local.z) > .0001;
    connection[xField] = local.x;
    connection[zField] = local.z;
    const panel = document.querySelector(".layout-editor");
    const xInput = panel?.querySelector(`[data-process-connection-field="${xField}"]`);
    const zInput = panel?.querySelector(`[data-process-connection-field="${zField}"]`);
    if (xInput) xInput.value = local.x.toFixed(1);
    if (zInput) zInput.value = local.z.toFixed(1);
    renderPerformance.invalidate?.("process-endpoint-drag");
    return changed;
  }


  function updateDraggedProcessPivot(pivotId,pivotIndex,event){
    const connection=selectedProcessConnection();if(!connection)return false;
    const pivots=materializeProcessFlowPivots(connection);if(!pivots.length)return false;
    let index=pivots.findIndex((pivot)=>pivot.id===pivotId);if(index<0&&Number.isFinite(Number(pivotIndex)))index=clamp(Math.round(Number(pivotIndex)),0,pivots.length-1);if(index<0)return false;
    const[worldX,worldZ]=worldFromScreen(event),snap=Math.max(.01,Number(state.snapSize)||.1),x=Math.round(worldX/snap)*snap,z=Math.round(worldZ/snap)*snap,pivot=pivots[index],changed=Math.abs(pivot.x-x)>.0001||Math.abs(pivot.z-z)>.0001;
    pivot.x=x;pivot.z=z;connection.flowPivotPoints=pivots;connection.flowPivotMode="custom";
    const panel=document.querySelector(".layout-editor"),xInput=panel?.querySelector(`[data-process-pivot-field="x"][data-process-pivot-id="${pivot.id}"]`),zInput=panel?.querySelector(`[data-process-pivot-field="z"][data-process-pivot-id="${pivot.id}"]`);
    if(xInput)xInput.value=x.toFixed(2);if(zInput)zInput.value=z.toFixed(2);renderPerformance.invalidate?.("process-pivot-drag");return changed;
  }

  function panCamera(deltaX,deltaY) {
    const cy = Math.cos(state.yaw);
    const sy = Math.sin(state.yaw);
    const rawSin = Math.sin(state.pitch);
    const direction = rawSin < 0 ? -1 : 1;
    const sp = direction * Math.max(Math.sin(.62), Math.abs(rawSin));
    const scale = state.zoom * Math.min(canvas.width / 720, canvas.height / 420);
    const screenX = Number(deltaX) || 0;
    const screenY = Number(deltaY) || 0;
    const distance = Math.hypot(screenX, screenY);
    const limitScale = distance > 160 ? 160 / distance : 1;
    const safeDeltaX = screenX * limitScale;
    const safeDeltaY = screenY * limitScale;
    const rx = safeDeltaX/scale;
    const rz = safeDeltaY/(sp*scale);
    state.panX -= rx*cy + rz*sy;
    state.panZ -= -rx*sy + rz*cy;
  }

  function clipPolygonToWalkNearPlane(points) {
    if (state.cameraMode !== "walk" || !Array.isArray(points) || points.length < 3) return points;
    const output = [];
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const previous = points[(index + points.length - 1) % points.length];
      const currentDepth = project(...current)[3];
      const previousDepth = project(...previous)[3];
      const currentInside = currentDepth >= WALK_NEAR_CLIP;
      const previousInside = previousDepth >= WALK_NEAR_CLIP;
      if (currentInside !== previousInside) {
        const denominator = currentDepth - previousDepth;
        const amount = Math.abs(denominator) < 0.000001 ? 0 : (WALK_NEAR_CLIP - previousDepth) / denominator;
        output.push([
          previous[0] + (current[0] - previous[0]) * amount,
          previous[1] + (current[1] - previous[1]) * amount,
          previous[2] + (current[2] - previous[2]) * amount,
        ]);
      }
      if (currentInside) output.push(current);
    }
    return output;
  }

  function clipLineToWalkNearPlane(start, end) {
    if (state.cameraMode !== "walk") return [start, end];
    const startDepth = project(...start)[3];
    const endDepth = project(...end)[3];
    const startInside = startDepth >= WALK_NEAR_CLIP;
    const endInside = endDepth >= WALK_NEAR_CLIP;
    if (!startInside && !endInside) return null;
    if (startInside && endInside) return [start, end];
    const denominator = endDepth - startDepth;
    const amount = Math.abs(denominator) < 0.000001 ? 0 : (WALK_NEAR_CLIP - startDepth) / denominator;
    const intersection = [
      start[0] + (end[0] - start[0]) * amount,
      start[1] + (end[1] - start[1]) * amount,
      start[2] + (end[2] - start[2]) * amount,
    ];
    return startInside ? [start, intersection] : [intersection, end];
  }

  let suppressGeometryOutlines = false;
  let recordingReusableGeometry = false;

  function polygon(points, fill, stroke = null, lineWidth = 1, alpha = 1, options = {}) {
    if (!recordingReusableGeometry) points = clipPolygonToWalkNearPlane(points);
    if (!points || points.length < 3) return;
    if (alpha <= 0.01) return;
    if (suppressGeometryOutlines) stroke = null;
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
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    ctx.restore();
  }

  function overlayPolygon(points, fill, stroke = null, lineWidth = 1, alpha = 1) {
    points = clipPolygonToWalkNearPlane(points);
    if (!points || points.length < 3 || alpha <= 0.01) return;
    const projected = points.map((point) => project(...point));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    projected.forEach((point, index) => index ? ctx.lineTo(point[0], point[1]) : ctx.moveTo(point[0], point[1]));
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    ctx.restore();
  }

  function shade(hex, amount) {
    const safeHex = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#67757a";
    const value = parseInt(safeHex.slice(1), 16);
    const channel = (shift) => Math.max(0, Math.min(255, ((value >> shift) & 255) + Math.round(255 * amount)));
    return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
  }

  function blendHexColors(from, to, amount) {
    const safeFrom = /^#[0-9a-f]{6}$/i.test(from) ? from : "#000000";
    const safeTo = /^#[0-9a-f]{6}$/i.test(to) ? to : "#ffffff";
    const progress = clamp(Number(amount) || 0);
    const first = parseInt(safeFrom.slice(1), 16);
    const second = parseInt(safeTo.slice(1), 16);
    const channel = (shift) => Math.round(
      ((first >> shift) & 255) + (((second >> shift) & 255) - ((first >> shift) & 255)) * progress
    );
    return `#${[channel(16),channel(8),channel(0)].map((value) => value.toString(16).padStart(2,"0")).join("")}`;
  }

  function rotateVector3(vector, rotationX = 0, rotationY = 0, rotationZ = 0) {
    let [x, y, z] = vector;
    const radians = (value) => (Number(value) || 0) * Math.PI / 180;
    let cosine = Math.cos(radians(rotationX));
    let sine = Math.sin(radians(rotationX));
    [y, z] = [y * cosine - z * sine, y * sine + z * cosine];
    cosine = Math.cos(radians(rotationY));
    sine = Math.sin(radians(rotationY));
    [x, z] = [x * cosine - z * sine, x * sine + z * cosine];
    cosine = Math.cos(radians(rotationZ));
    sine = Math.sin(radians(rotationZ));
    [x, y] = [x * cosine - y * sine, x * sine + y * cosine];
    return [x, y, z];
  }

  function boxVertices3d(item, grow = 1) {
    const baseY = Number(item.y) || 0;
    const width = Math.max(.01, Number(item.w) || .01);
    const depth = Math.max(.01, Number(item.d) || .01);
    const height = Math.max(.01, (Number(item.h) || .01) * grow);
    const center = [item.x + width / 2, baseY + height / 2, item.z + depth / 2];
    const rotationX = Number(item.rotationX) || 0;
    const rotationY = Number.isFinite(Number(item.rotationY)) ? Number(item.rotationY) : Number(item.rotation) || 0;
    const rotationZ = Number(item.rotationZ) || 0;
    return [
      [-width/2,-height/2,-depth/2],[width/2,-height/2,-depth/2],[width/2,-height/2,depth/2],[-width/2,-height/2,depth/2],
      [-width/2,height/2,-depth/2],[width/2,height/2,-depth/2],[width/2,height/2,depth/2],[-width/2,height/2,depth/2],
    ].map((offset) => {
      const rotated = rotateVector3(offset, rotationX, rotationY, rotationZ);
      return [center[0] + rotated[0], center[1] + rotated[1], center[2] + rotated[2]];
    });
  }

  function box(item, alpha = 1, grow = 1) {
    if (alpha <= 0.01) return;
    const vertices = boxVertices3d(item, grow);
    const faceDefinitions = [
      { indices:[0,1,5,4], fill:shade(item.color,-.12) },
      { indices:[1,2,6,5], fill:shade(item.color,-.22) },
      { indices:[2,3,7,6], fill:shade(item.color,-.18) },
      { indices:[3,0,4,7], fill:shade(item.color,-.08) },
      { indices:[3,2,1,0], fill:shade(item.color,-.28) },
      { indices:[4,5,6,7], fill:item.color, stroke:"rgba(20,30,34,.28)" },
    ];
    const faces = faceDefinitions.map((face) => {
      const points = face.indices.map((index) => vertices[index]);
      return {
        ...face,
        points,
        depth: depthRenderer.available ? 0 : points.reduce((sum, point) => sum + project(...point)[2], 0) / points.length,
      };
    });
    if (!depthRenderer.available) faces.sort((first, second) => first.depth - second.depth);
    faces.forEach((face) => polygon(face.points, face.fill, face.stroke || "rgba(20,30,34,.12)", .7, alpha));
  }

  function drawCylinder3d({
    radiusX, radiusY, halfDepth, color, alpha = 1, pointFromLocal,
    segments = 18, minimumSegments = 8, outline = true,
  }) {
    if (alpha <= 0.01 || typeof pointFromLocal !== "function") return;
    const requestedSegments = Math.max(minimumSegments, Math.round(Number(segments) || 18));
    const count = Math.max(minimumSegments, Math.min(requestedSegments, renderPerformance.cylinderSegments(requestedSegments)));
    const front = [];
    const back = [];
    for (let index = 0; index < count; index += 1) {
      const angle = index / count * Math.PI * 2;
      const x = Math.cos(angle) * Math.max(.01, Number(radiusX) || .01);
      const y = Math.sin(angle) * Math.max(.01, Number(radiusY) || .01);
      front.push(pointFromLocal([x, y, -Math.max(.01, Number(halfDepth) || .01)]));
      back.push(pointFromLocal([x, y, Math.max(.01, Number(halfDepth) || .01)]));
    }

    // Caps and every curved side segment are sent through the shared depth
    // renderer. Wheels therefore write to and test against the same depth
    // buffer as cabinets, floors, walls, and the rest of the machine.
    const capStroke = outline ? "rgba(15,25,28,.22)" : null;
    const sideStroke = outline ? "rgba(15,25,28,.16)" : null;
    polygon([...front].reverse(), shade(color, -.22), capStroke, .65, alpha);
    polygon(back, color, capStroke, .65, alpha);
    for (let index = 0; index < count; index += 1) {
      const next = (index + 1) % count;
      const light = -.08 - .16 * (.5 + .5 * Math.cos(index / count * Math.PI * 2));
      polygon(
        [front[index], front[next], back[next], back[index]],
        shade(color, light),
        sideStroke,
        .5,
        alpha,
      );
    }
  }

  function line3d(start, end, color, width = 1, alpha = 1) {
    const clipped = recordingReusableGeometry ? [start, end] : clipLineToWalkNearPlane(start, end);
    if (!clipped) return;
    [start, end] = clipped;
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

  function overlayLine3d(start, end, color, width = 1, alpha = 1) {
    const clipped = clipLineToWalkNearPlane(start, end);
    if (!clipped) return;
    [start, end] = clipped;
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

  let labelRects = [];
  const labelVisualStates = new Map();
  let labelTransitionsActive = true;

  const PRIMARY_LABEL_TYPES = new Set([
    "cutting", "waterjet", "filtration", "kodiak", "denver", "furnace",
    "cube", "washer", "wrapping", "shipping",
  ]);
  const SUPPORT_LABEL_TYPES = new Set([
    "craneMachine", "bridgeCrane", "glassRack", "room", "generic", "genericBox",
  ]);
  const MINOR_LABEL_TYPES = new Set([
    "aFrame", "aFrameTruck", "person", "animatedPerson", "animatedCart",
    "animatedGlass", "animatedBox", "animatedBeacon",
  ]);

  const TYPE_LABEL_FALLBACKS = {
    cutting: "Barefoot",
    waterjet: "Waterjet",
    filtration: "Filtration",
    kodiak: "Kodiak",
    denver: "Denver",
    furnace: "Furnace",
    cube: "Fuze Cube",
    washer: "Washer",
    wrapping: "Wrap station",
    shipping: "Shipping rack",
    craneMachine: "Gantry crane",
    bridgeCrane: "Bridge crane",
    glassRack: "Glass rack",
    aFrame: "A-frame cart",
    aFrameTruck: "A-frame truck",
    person: "Team member",
    animatedPerson: "Team member",
    animatedCart: "Moving cart",
    animatedGlass: "Moving glass",
    animatedBox: "Moving box",
    animatedBeacon: "Beacon",
    safetyLine: "Safety line",
    trench: "Trench",
    floorDrain: "Floor drain",
  };

  function isTodayStage() {
    return Math.round(state.stageFloat) >= Math.max(0, stages.length - 1);
  }

  function isTodayOverview() {
    return state.cameraMode !== "walk" && isTodayStage();
  }

  function isStageEquipmentLabelCandidate(machine) {
    if (!machine || isFloorFeatureType(machine.type)) return false;
    const name = String(machine.labelText || machine.name || machine.short || "").toLowerCase();
    if (machine.type === "room") return /office|maintenance/.test(name);
    if (["person", "animatedPerson", "safetyLine"].includes(machine.type)) return false;
    if (/^(cage|computer machine|cutting table computer|bay door)$/.test(name.trim())) return false;
    return true;
  }

  function necessaryFlowLabel(machine) {
    if (!machine || !isStageEquipmentLabelCandidate(machine)) return null;
    const type = String(machine.type || "").toLowerCase();
    const source = [machine.name, machine.short, machine.labelText, machine.labelAbbreviation]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (type === "cutting" || /cutting table/.test(source)) return processPointerFlowLabel("cutting", machine);
    if (type === "kodiak" && !/skiati/.test(source)) return processPointerFlowLabel("polisher", machine);
    if (type === "denver" || /denver/.test(source)) return processPointerFlowLabel("denver-cnc", machine);
    if (type === "waterjet" || /waterjet/.test(source)) return processPointerFlowLabel("waterjet", machine);
    if (type === "washer" || /washer/.test(source)) return processPointerFlowLabel("washer", machine);
    if (type === "furnace" || /tempering line/.test(source)) return processPointerFlowLabel("tempering", machine);
    if (type === "wrapping" || /wrapp/.test(source)) return processPointerFlowLabel("wrap", machine);
    if (type === "aframetruck" || /glass truck/.test(source)) return processPointerFlowLabel("glass-truck", machine);
    if (type === "glassrack" && Number(machine.reveal) >= 11) return processPointerFlowLabel("rack", machine);
    return null;
  }

  const TODAY_FLOW_LINKS = DEFAULT_PROCESS_CONNECTION_LINKS;

  function flowEntryWorldAnchor(entry, connection, endpoint) {
    const rendered = entry?.rendered;
    if (!rendered || !connection) return null;
    const prefix = endpoint === "end" ? "end" : "start";
    return localPoint(
      rendered,
      rendered.w * clamp(Number(connection[`${prefix}AnchorXPercent`] ?? 50), PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT) / 100,
      rendered.h * clamp(Number(connection[`${prefix}AnchorYPercent`] ?? 100), PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT) / 100,
      rendered.d * clamp(Number(connection[`${prefix}AnchorZPercent`] ?? 50), PROCESS_CONNECTION_ANCHOR_MIN_PERCENT, PROCESS_CONNECTION_ANCHOR_MAX_PERCENT) / 100,
    );
  }

  function processEndpointEntry(machine, time = state.lastFrameTime) {
    if (!machine || machine.visible === false) return null;
    const alpha = stageAlpha(machine.reveal, machine.retire);
    if (alpha <= .01) return null;
    const rendered = machineHasLayoutMotion(machine) ? animatedMachine(machine, time) : machine;
    return { machine, rendered, alpha, grow: 1 };
  }

  function buildTodayProcessObjectEntries(machineEntries, time = state.lastFrameTime) {
    const entries = new Map(
      (machineEntries || [])
        .filter((entry) => entry?.alpha > .01 && entry?.machine?.instanceId)
        .map((entry) => [entry.machine.instanceId, entry])
    );
    // First Person and aggressive overview culling may omit a route endpoint
    // machine from the render list. The route itself is a navigation aid and
    // must stay persistent, so rebuild any missing endpoint from the saved
    // machine record instead of tying route lifetime to camera visibility.
    Object.values(state.processConnections || {}).forEach((connection) => {      if (!connection || connection.visible === false) return;
      [connection.sourceId, connection.targetId].forEach((instanceId) => {
        if (!instanceId || entries.has(instanceId)) return;
        const fallback = processEndpointEntry(machineById(instanceId), time);
        if (fallback) entries.set(instanceId, fallback);
      });
    });
    machines.forEach((machine) => {
      if (machine?.processStepLabelEnabled !== true || entries.has(machine.instanceId)) return;
      const fallback = processEndpointEntry(machine, time);
      if (fallback) entries.set(machine.instanceId, fallback);
    });
    return entries;
  }

  function processFlowFloorAnchor(entry, connection, endpoint) {
    const anchor = flowEntryWorldAnchor(entry, connection, endpoint);
    if (!anchor) return null;
    const floorHeight = clamp(Number(connection?.flowFloorHeight ?? .18), .02, 30);
    return [anchor[0], floorHeight, anchor[2]];
  }

  function legacyProcessFlowControlPoints(startWorld,endWorld,connection){
    const dx=endWorld[0]-startWorld[0],dz=endWorld[2]-startWorld[2],routeLength=Math.max(.001,Math.hypot(dx,dz));
    const normalX=-dz/routeLength,normalZ=dx/routeLength;
    const turns=[
      {progress:clamp(Number(connection?.flowTurn1Progress??34),0,100)/100,offset:clamp(Number(connection?.flowTurn1Offset??0),-500,500),index:1},
      {progress:clamp(Number(connection?.flowTurn2Progress??66),0,100)/100,offset:clamp(Number(connection?.flowTurn2Offset??0),-500,500),index:2},
    ].sort((a,b)=>a.progress-b.progress||a.index-b.index);
    const bendPoints=turns.map((turn)=>({id:`legacy-${turn.index}`,index:turn.index,point:[startWorld[0]+dx*turn.progress+normalX*turn.offset,startWorld[1],startWorld[2]+dz*turn.progress+normalZ*turn.offset]}));
    return{points:[startWorld,...bendPoints.map((item)=>item.point),endWorld],bendPoints};
  }

  function processFlowControlPoints(startWorld,endWorld,connection){
    if(connection?.flowPivotMode==="custom"){
      const pivots=normalizeProcessFlowPivotPoints(connection.flowPivotPoints);
      const bendPoints=pivots.map((pivot,index)=>({id:pivot.id,index:index+1,point:[pivot.x,startWorld[1],pivot.z]}));
      return{points:[startWorld,...bendPoints.map((item)=>item.point),endWorld],bendPoints};
    }
    return legacyProcessFlowControlPoints(startWorld,endWorld,connection);
  }

  function processConnectionExactPivotPoints(connection,time=state.lastFrameTime){
    if(!connection)return[];
    if(connection.flowPivotMode==="custom")return normalizeProcessFlowPivotPoints(connection.flowPivotPoints);
    const fromEntry=processEndpointEntry(machineById(connection.sourceId),time),toEntry=processEndpointEntry(machineById(connection.targetId),time);
    if(!fromEntry||!toEntry)return[];
    const startWorld=processFlowFloorAnchor(fromEntry,connection,"start"),endWorld=processFlowFloorAnchor(toEntry,connection,"end");
    if(!startWorld||!endWorld)return[];
    return legacyProcessFlowControlPoints(startWorld,endWorld,connection).bendPoints.map((item,index)=>({id:`pivot-${index+1}`,x:item.point[0],z:item.point[2]}));
  }

  function materializeProcessFlowPivots(connection,time=state.lastFrameTime){
    if(!connection)return[];
    if(connection.flowPivotMode!=="custom"){
      connection.flowPivotPoints=processConnectionExactPivotPoints(connection,time);
      connection.flowPivotMode="custom";
    }else connection.flowPivotPoints=normalizeProcessFlowPivotPoints(connection.flowPivotPoints);
    return connection.flowPivotPoints;
  }

  function createProcessPivotId(connection){
    const existing=new Set(normalizeProcessFlowPivotPoints(connection?.flowPivotPoints).map((item)=>item.id));
    let index=existing.size+1,id=`pivot-${index}`;
    while(existing.has(id)){index+=1;id=`pivot-${index}`;}
    return id;
  }

  function addProcessFlowPivot(connection,time=state.lastFrameTime){
    if(!connection)return null;
    const pivots=materializeProcessFlowPivots(connection,time);
    if(pivots.length>=PROCESS_FLOW_MAX_PIVOTS)return null;
    const route=selectedProcessFlowRoute(time);if(!route)return null;
    const points=[route.startWorld,...pivots.map((pivot)=>[pivot.x,route.startWorld[1],pivot.z]),route.endWorld];
    let insertAt=0,maxDistance=-1;
    for(let index=0;index<points.length-1;index+=1){const distance=floorPointDistance(points[index],points[index+1]);if(distance>maxDistance){maxDistance=distance;insertAt=index;}}
    const a=points[insertAt],b=points[insertAt+1],pivot={id:createProcessPivotId(connection),x:(a[0]+b[0])/2,z:(a[2]+b[2])/2};
    pivots.splice(insertAt,0,pivot);connection.flowPivotPoints=pivots;connection.flowPivotMode="custom";return pivot;
  }

  function removeProcessFlowPivot(connection,pivotId){
    if(!connection)return false;
    const pivots=materializeProcessFlowPivots(connection);const before=pivots.length;
    connection.flowPivotPoints=pivots.filter((pivot)=>pivot.id!==pivotId);connection.flowPivotMode="custom";return connection.flowPivotPoints.length!==before;
  }

  function clearProcessFlowPivots(connection){
    if(!connection)return false;materializeProcessFlowPivots(connection);const changed=connection.flowPivotPoints.length>0;connection.flowPivotPoints=[];connection.flowPivotMode="custom";return changed;
  }

  function floorPointDistance(first,second){return Math.hypot((second?.[0]||0)-(first?.[0]||0),(second?.[2]||0)-(first?.[2]||0));}

  function roundedProcessFlowPath(controlPoints,connection){
    const points=(controlPoints||[]).filter(Boolean);
    if(points.length<3)return points;
    const roundness=connection?.shape!=="elbow"?clamp(Number(connection?.flowCurvePercent??68),0,100)/100:0;
    if(roundness<=.001)return points;
    const result=[points[0]];
    for(let index=1;index<points.length-1;index+=1){
      const corner=points[index], next=points[index+1], actualPrevious=points[index-1];
      const incomingLength=floorPointDistance(actualPrevious,corner), outgoingLength=floorPointDistance(corner,next);
      if(incomingLength<.01||outgoingLength<.01){result.push(corner);continue;}
      const radius=Math.min(incomingLength,outgoingLength)*.44*roundness;
      const incomingX=(corner[0]-actualPrevious[0])/incomingLength,incomingZ=(corner[2]-actualPrevious[2])/incomingLength;
      const outgoingX=(next[0]-corner[0])/outgoingLength,outgoingZ=(next[2]-corner[2])/outgoingLength;
      const before=[corner[0]-incomingX*radius,corner[1],corner[2]-incomingZ*radius];
      const after=[corner[0]+outgoingX*radius,corner[1],corner[2]+outgoingZ*radius];
      if(floorPointDistance(result[result.length-1],before)>.01)result.push(before);
      for(let sample=1;sample<=8;sample+=1){const t=sample/8,inv=1-t;result.push([inv*inv*before[0]+2*inv*t*corner[0]+t*t*after[0],corner[1],inv*inv*before[2]+2*inv*t*corner[2]+t*t*after[2]]);}
    }
    result.push(points[points.length-1]);return result;
  }

  function projectedProcessFlowSegments(worldPath){
    const segments=[];let active=[];
    const flush=()=>{if(active.length>=2)segments.push(active);active=[];};
    (worldPath||[]).forEach((worldPoint)=>{const screenPoint=project(...worldPoint);const valid=Number.isFinite(screenPoint[0])&&Number.isFinite(screenPoint[1]);const inFront=state.cameraMode!=="walk"||Number(screenPoint[3])>=WALK_NEAR_CLIP*1.02;if(!valid||!inFront){flush();return;}active.push(screenPoint);});
    flush();return segments;
  }

  function traceProjectedProcessFlow(segment){if(!segment?.length)return;ctx.beginPath();ctx.moveTo(segment[0][0],segment[0][1]);for(let index=1;index<segment.length;index+=1)ctx.lineTo(segment[index][0],segment[index][1]);}

  function processRouteTagDescriptor(fromEntry,toEntry,connection){
    if(!connection||connection.visible===false)return null;
    const startWorld=processFlowFloorAnchor(fromEntry,connection,"start"),endWorld=processFlowFloorAnchor(toEntry,connection,"end");if(!startWorld||!endWorld)return null;
    const controls=processFlowControlPoints(startWorld,endWorld,connection),worldPath=roundedProcessFlowPath(controls.points,connection),midpoint=worldPath[Math.floor(Math.max(0,worldPath.length-1)/2)]||[(startWorld[0]+endWorld[0])/2,startWorld[1],(startWorld[2]+endWorld[2])/2];
    const color=/^#[0-9a-f]{6}$/i.test(String(connection.color||""))?connection.color:"#52b7aa",automaticRouteText=`${processConnectionEndpointText(connection,"source")} → ${processConnectionEndpointText(connection,"target")}`,text=String(connection.tagText||"").trim()||automaticRouteText;
    return{text,worldMidpoint:midpoint,connection,color,startWorld,endWorld,controlPoints:controls.points,bendPoints:controls.bendPoints,worldPath,fromEntry,toEntry};
  }

  function drawProcessFlowEndMarker(route,projectedSegments,pixelScale){
    const connection=route?.connection,endStyle=["arrow","dot","ring","none"].includes(connection?.endStyle)?connection.endStyle:"none";if(endStyle==="none")return;
    const endProjection=project(...route.endWorld);if(state.cameraMode==="walk"&&endProjection[3]<WALK_NEAR_CLIP)return;
    const finalSegment=projectedSegments[projectedSegments.length-1];if(!finalSegment?.length)return;const end=finalSegment[finalSegment.length-1],previous=finalSegment[Math.max(0,finalSegment.length-2)]||end,dx=end[0]-previous[0],dy=end[1]-previous[1],length=Math.max(.001,Math.hypot(dx,dy)),ux=dx/length,uy=dy/length,normalX=-uy,normalY=ux,markerSize=clamp(Number(connection.endSize)||3.2,1,14)*pixelScale;
    ctx.save();ctx.globalAlpha=clamp(Number(connection.opacity)||100,5,100)/100;ctx.fillStyle=route.color;ctx.strokeStyle="#ecffff";if(endStyle==="arrow"){const arrowSize=Math.max(5*pixelScale,markerSize*1.8);ctx.beginPath();ctx.moveTo(end[0],end[1]);ctx.lineTo(end[0]-ux*arrowSize+normalX*arrowSize*.48,end[1]-uy*arrowSize+normalY*arrowSize*.48);ctx.lineTo(end[0]-ux*arrowSize-normalX*arrowSize*.48,end[1]-uy*arrowSize-normalY*arrowSize*.48);ctx.closePath();ctx.fill();}else if(endStyle==="dot"){ctx.beginPath();ctx.arc(end[0],end[1],Math.max(2.5*pixelScale,markerSize),0,Math.PI*2);ctx.fill();}else if(endStyle==="ring"){ctx.beginPath();ctx.arc(end[0],end[1],Math.max(3*pixelScale,markerSize),0,Math.PI*2);ctx.lineWidth=Math.max(1.4*pixelScale,markerSize*.35);ctx.stroke();}ctx.restore();
  }

  function drawProcessFlowHandle(point,label,color,pixelScale,{strong=false}={}){
    const screen=project(...point);if(state.cameraMode==="walk"&&screen[3]<WALK_NEAR_CLIP)return;
    if(!Number.isFinite(screen[0])||!Number.isFinite(screen[1]))return;
    const radius=(strong?8.2:6.5)*pixelScale;
    ctx.save();ctx.shadowColor=color;ctx.shadowBlur=(strong?14:10)*pixelScale;ctx.fillStyle=strong?"rgba(255,255,255,.99)":"rgba(245,255,255,.98)";ctx.strokeStyle=color;ctx.lineWidth=(strong?2.7:2.2)*pixelScale;ctx.beginPath();ctx.arc(screen[0],screen[1],radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#092522";ctx.font=`700 ${Math.max(8,(strong?9.5:9)*pixelScale)}px "Segoe UI", sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(label,screen[0],screen[1]+.4*pixelScale);ctx.restore();
  }

  function drawProcessFlowEditHandles(route,pixelScale){
    const editingThisConnection=state.editing&&state.objectEditorTab==="pointers"&&route?.connection?.key===state.selectedProcessConnectionKey;if(!editingThisConnection)return;
    drawProcessFlowHandle(route.startWorld,"S",route.color,pixelScale,{strong:true});
    route.bendPoints?.forEach(({index,point})=>drawProcessFlowHandle(point,String(index),route.color,pixelScale));
    drawProcessFlowHandle(route.endWorld,"E",route.color,pixelScale,{strong:true});
  }

  function worldRouteSegmentPolygon(start,end,width,yOffset=0){
    const dx=end[0]-start[0],dz=end[2]-start[2],length=Math.hypot(dx,dz);if(length<.001)return null;
    const half=Math.max(.02,width)/2,nx=-dz/length*half,nz=dx/length*half;
    return[
      [start[0]+nx,start[1]+yOffset,start[2]+nz],
      [end[0]+nx,end[1]+yOffset,end[2]+nz],
      [end[0]-nx,end[1]+yOffset,end[2]-nz],
      [start[0]-nx,start[1]+yOffset,start[2]-nz],
    ];
  }

  function addWorldRouteRibbon(path,width,color,alpha,yOffset=0){
    if(typeof depthRenderer.addPolygon!=="function")return;
    for(let index=0;index<(path?.length||0)-1;index+=1){
      const polygon=worldRouteSegmentPolygon(path[index],path[index+1],width,yOffset);
      if(polygon)depthRenderer.addPolygon(polygon,color,alpha,null,1,{transparent:true});
    }
  }

  function worldRouteSegmentPrismFaces(start,end,width,thickness,yOffset=0){
    const dx=end[0]-start[0],dz=end[2]-start[2],length=Math.hypot(dx,dz);if(length<.001)return[];
    const halfWidth=Math.max(.02,width)/2,halfHeight=Math.max(.02,thickness)/2;
    const nx=-dz/length*halfWidth,nz=dx/length*halfWidth;
    const sy=start[1]+yOffset,ey=end[1]+yOffset;
    const slt=[start[0]+nx,sy+halfHeight,start[2]+nz],srt=[start[0]-nx,sy+halfHeight,start[2]-nz];
    const elt=[end[0]+nx,ey+halfHeight,end[2]+nz],ert=[end[0]-nx,ey+halfHeight,end[2]-nz];
    const slb=[start[0]+nx,sy-halfHeight,start[2]+nz],srb=[start[0]-nx,sy-halfHeight,start[2]-nz];
    const elb=[end[0]+nx,ey-halfHeight,end[2]+nz],erb=[end[0]-nx,ey-halfHeight,end[2]-nz];
    return[
      [slt,elt,ert,srt],
      [slb,srb,erb,elb],
      [slb,elb,elt,slt],
      [srb,srt,ert,erb],
      [slb,slt,srt,srb],
      [elb,erb,ert,elt],
    ];
  }

  function addWorldRoutePrism(path,width,thickness,color,alpha,yOffset=0){
    if(typeof depthRenderer.addPolygon!=="function")return;
    for(let index=0;index<(path?.length||0)-1;index+=1){
      const faces=worldRouteSegmentPrismFaces(path[index],path[index+1],width,thickness,yOffset);
      faces.forEach((face,faceIndex)=>{
        const faceAlpha=faceIndex===0?alpha:alpha*.82;
        depthRenderer.addPolygon(face,color,faceAlpha,null,1,{transparent:true});
      });
    }
  }

  function worldRouteMetrics(path){
    const segments=[];let total=0;
    for(let index=0;index<(path?.length||0)-1;index+=1){
      const start=path[index],end=path[index+1],length=floorPointDistance(start,end);
      if(length<.001)continue;
      segments.push({start,end,length,from:total,to:total+length});total+=length;
    }
    return{segments,total};
  }

  function worldRoutePointAt(metrics,distance){
    const value=clamp(distance,0,metrics.total);
    const segment=metrics.segments.find((item)=>value<=item.to+.0001)||metrics.segments[metrics.segments.length-1];
    if(!segment)return null;
    const t=clamp((value-segment.from)/Math.max(.001,segment.length),0,1);
    return[
      segment.start[0]+(segment.end[0]-segment.start[0])*t,
      segment.start[1]+(segment.end[1]-segment.start[1])*t,
      segment.start[2]+(segment.end[2]-segment.start[2])*t,
    ];
  }

  function worldRouteSlice(metrics,startDistance,endDistance){
    if(!metrics?.segments?.length||endDistance<=startDistance)return[];
    const start=clamp(startDistance,0,metrics.total),end=clamp(endDistance,0,metrics.total);
    if(end<=start)return[];
    const points=[worldRoutePointAt(metrics,start)];
    metrics.segments.forEach((segment)=>{if(segment.to>start+.001&&segment.to<end-.001)points.push(segment.end);});
    points.push(worldRoutePointAt(metrics,end));
    return points.filter(Boolean);
  }

  function drawWorldProcessEndMarker(route,width,opacity,surfaceLift=.035){
    const connection=route?.connection,style=["arrow","dot","ring","none"].includes(connection?.endStyle)?connection.endStyle:"none";if(style==="none")return;
    const path=route.worldPath||[];if(path.length<2)return;
    const end=path[path.length-1],previous=path[path.length-2],dx=end[0]-previous[0],dz=end[2]-previous[2],length=Math.hypot(dx,dz);if(length<.001)return;
    const ux=dx/length,uz=dz/length,nx=-uz,nz=ux,size=Math.max(width*2.4,clamp(Number(connection.endSize)||3.2,1,14)*.22),y=surfaceLift;
    if(style==="arrow"){
      depthRenderer.addPolygon?.([
        [end[0],end[1]+y,end[2]],
        [end[0]-ux*size+nx*size*.55,end[1]+y,end[2]-uz*size+nz*size*.55],
        [end[0]-ux*size-nx*size*.55,end[1]+y,end[2]-uz*size-nz*size*.55],
      ],route.color,opacity,null,1,{transparent:true});
      return;
    }
    const radius=style==="dot"?size*.55:size*.7,points=[];
    for(let index=0;index<16;index+=1){const angle=index/16*Math.PI*2;points.push([end[0]+Math.cos(angle)*radius,end[1]+y,end[2]+Math.sin(angle)*radius]);}
    depthRenderer.addPolygon?.(points,route.color,style==="ring"?opacity*.55:opacity,null,1,{transparent:true});
  }

  function drawFloorProcessFlow(fromEntry,toEntry,connection,time){
    const route=processRouteTagDescriptor(fromEntry,toEntry,connection);if(!route?.worldPath?.length)return route;
    const opacity=clamp(Number(connection.opacity)||100,5,100)/100;
    const coreWidth=clamp(Number(connection.width)||1.65,.5,12)*.42;
    const glow=clamp(Number(connection.flowGlow??100),0,200)/100;
    const animationTime=effectiveAnimationTime(time);
    const speedFeetPerSecond=clamp(Number(connection.flowSpeed??42),0,180)*.12;
    const style=["solid","dashed","dotted"].includes(connection.style)?connection.style:"solid";

    // Near the floor the route stays a clean ribbon. As Route Y is raised, the
    // same path progressively gains vertical thickness and becomes a physical
    // 3D rail with top, bottom and side faces. Everything remains depth-tested.
    const routeY=clamp(Number(connection.flowFloorHeight??.18),.02,30);
    const elevationFactor=clamp((routeY-.26)/1.05,0,1);
    const routeThickness=Math.max(.06,coreWidth*(.16+elevationFactor*.68));
    if(elevationFactor>.01){
      addWorldRoutePrism(route.worldPath,coreWidth*(2.15+glow*.62),routeThickness*1.45,route.color,opacity*(.06+glow*.045),0);
      addWorldRoutePrism(route.worldPath,coreWidth*1.45,routeThickness*1.08,route.color,opacity*.34,0);
      addWorldRoutePrism(route.worldPath,coreWidth,routeThickness,route.color,opacity*.90,0);
    }else{
      addWorldRouteRibbon(route.worldPath,coreWidth*(2.5+glow*.9),route.color,opacity*(.08+glow*.055),-.015);
      addWorldRouteRibbon(route.worldPath,coreWidth*1.55,route.color,opacity*.34,.005);
      addWorldRouteRibbon(route.worldPath,coreWidth,route.color,opacity*.88,.018);
    }

    const metrics=worldRouteMetrics(route.worldPath);
    if(metrics.total>.01&&speedFeetPerSecond>0){
      const dashLength=style==="dotted"?1.35:style==="dashed"?4.5:3.4;
      const gapLength=style==="dotted"?5.6:style==="dashed"?6.6:8.8;
      const period=dashLength+gapLength;
      const phase=((animationTime/1000*speedFeetPerSecond)%period+period)%period;
      // Move the white highlight from the route source toward its destination.
      // The previous world-space conversion advanced the pattern backward.
      for(let start=phase-period;start<metrics.total;start+=period){
        const from=Math.max(0,start),to=Math.min(metrics.total,start+dashLength);if(to<=from)continue;
        const slice=worldRouteSlice(metrics,from,to);
        if(elevationFactor>.01){
          const highlightThickness=Math.max(.045,routeThickness*.20);
          addWorldRoutePrism(slice,Math.max(.12,coreWidth*.38),highlightThickness,"#eaffff",opacity*.98,routeThickness/2+highlightThickness/2+.012);
        }else{
          addWorldRouteRibbon(slice,Math.max(.12,coreWidth*.38),"#eaffff",opacity*.98,.045);
        }
      }
    }
    drawWorldProcessEndMarker(route,coreWidth,opacity,elevationFactor>.01?routeThickness/2+.035:.035);
    return route;
  }

  function processStepNumber(role){return PROCESS_STEP_NUMBER_BY_ROLE[String(role||"")]||null;}

  function processStepMachineRect(entry,padding=0){
    const samples=projectedBoxMetrics(entry?.rendered).visibleSamples||[];
    if(!samples.length)return null;
    const xs=samples.map((point)=>point[0]),ys=samples.map((point)=>point[1]);
    return{left:Math.min(...xs)-padding,right:Math.max(...xs)+padding,top:Math.min(...ys)-padding,bottom:Math.max(...ys)+padding};
  }

  function processStepLabelText(machine,maxWidth,fontSize){
    const full=String(machine?.processStepLabelText||machine?.name||machine?.short||"Process step").trim()||"Process step";
    let text=full;
    ctx.font=`600 ${fontSize}px "Segoe UI", sans-serif`;
    if(ctx.measureText(text).width<=maxWidth)return text;
    while(text.length>6&&ctx.measureText(`${text}…`).width>maxWidth)text=text.slice(0,-1);
    return `${text.trimEnd()}…`;
  }

  function collectProcessStepNodes(entriesById,routes){
    const nodes=new Map();
    const ensureNode=(id,entry,role,routeColor,worldPoint)=>{
      if(!entry?.machine)return;
      const customEnabled=entry.machine.processStepLabelEnabled===true;
      const roleNumber=processStepNumber(role);
      const customNumber=Number(entry.machine.processStepNumber)||0;
      const number=customNumber>0?clamp(Math.round(customNumber),1,99):roleNumber;
      if(!number||(!roleNumber&&!customEnabled))return;
      const current=nodes.get(id)||{id,entry,role,number,points:[],color:routeColor||entry.machine.labelLineColor||"#52b7aa"};
      current.entry=entry;current.role=role||current.role;current.number=number;current.color=routeColor||current.color;
      if(worldPoint)current.points.push(worldPoint);nodes.set(id,current);
    };
    routes.forEach((route)=>{
      const connection=route.connection;
      [["source",route.startWorld],["target",route.endWorld]].forEach(([endpoint,worldPoint])=>{
        const id=endpoint==="source"?connection.sourceId:connection.targetId,entry=entriesById.get(id);if(!entry)return;
        const role=processConnectionEndpointRole(connection,endpoint)||processConnectionRoleForObject(id);
        ensureNode(id,entry,role,route.color,worldPoint);
      });
    });
    entriesById.forEach((entry,id)=>{
      if(entry?.machine?.processStepLabelEnabled!==true||nodes.has(id))return;
      const role=processConnectionRoleForObject(id),floorHeight=.18,worldPoint=[entry.rendered.x+entry.rendered.w/2,floorHeight,entry.rendered.z+entry.rendered.d/2];
      ensureNode(id,entry,role,entry.machine.labelLineColor||"#52b7aa",worldPoint);
    });
    return[...nodes.values()].map((node)=>{
      const points=node.points.length?node.points:[[node.entry.rendered.x+node.entry.rendered.w/2,.18,node.entry.rendered.z+node.entry.rendered.d/2]];
      return{...node,worldPoint:[points.reduce((sum,p)=>sum+p[0],0)/points.length,points.reduce((sum,p)=>sum+p[1],0)/points.length,points.reduce((sum,p)=>sum+p[2],0)/points.length]};
    }).sort((a,b)=>a.number-b.number||String(a.entry.machine.name).localeCompare(String(b.entry.machine.name)));
  }

  function drawProcessStepLabel(node,protectedMachineRects=[]){
    if (combatLabelsSuppressed() || !SCREEN_SPACE_LABELS) return;
    const anchor=project(...node.worldPoint);if(state.cameraMode==="walk"&&anchor[3]<WALK_NEAR_CLIP)return;
    if(!Number.isFinite(anchor[0])||!Number.isFinite(anchor[1]))return;
    const rect=canvas.getBoundingClientRect(),pixelScale=canvas.width/Math.max(1,rect.width),spanCss=projectedPixelSpan(node.entry.rendered)/Math.max(.001,pixelScale);
    // Keep labels readable in screen space without letting world zoom turn them
    // into giant overlays that cover machines.
    const fontCss=state.cameraMode==="walk"?clamp(10+Math.log2(Math.max(1,spanCss)/45)*.45,9.5,12):clamp(8.1+Math.log2(Math.max(1,spanCss)/34)*.42,8.1,10.4);
    const fontSize=fontCss*pixelScale,badgeRadius=clamp(fontCss+3.2,12,15.5)*pixelScale,maxWidth=clamp(78+spanCss*.12,82,state.cameraMode==="walk"?132:112)*pixelScale;
    ctx.save();const text=processStepLabelText(node.entry.machine,maxWidth,fontSize),textWidth=Math.min(maxWidth,ctx.measureText(text).width),paddingX=6*pixelScale,labelWidth=textWidth+paddingX*2,labelHeight=(fontCss+8)*pixelScale;
    const ownMachineRect=state.cameraMode==="walk"?null:processStepMachineRect(node.entry,4*pixelScale);
    const protectedRects=state.cameraMode==="walk"?[]:protectedMachineRects.filter(Boolean);
    const naturalTop=ownMachineRect?ownMachineRect.top:anchor[1]-badgeRadius*2;
    const preferredY=naturalTop-labelHeight/2-4*pixelScale;
    const verticalCss=(preferredY-anchor[1])/pixelScale;
    const candidates=[[0,verticalCss],[28,verticalCss],[-28,verticalCss],[56,verticalCss],[-56,verticalCss],[0,verticalCss-24],[32,verticalCss-24],[-32,verticalCss-24],[64,verticalCss-24],[-64,verticalCss-24],[0,verticalCss-48],[40,verticalCss-48],[-40,verticalCss-48]];
    let placement=null;
    for(const[offsetXCss,offsetYCss]of candidates){const x=anchor[0]+offsetXCss*pixelScale,y=anchor[1]+offsetYCss*pixelScale,box={left:x-labelWidth/2,right:x+labelWidth/2,top:y-labelHeight/2,bottom:y+labelHeight/2},padded=paddedLabelRectangle(box,3*pixelScale),onCanvas=box.right>0&&box.left<canvas.width&&box.bottom>0&&box.top<canvas.height,machineConflict=protectedRects.some((machineRect)=>rectanglesIntersect(padded,machineRect)),labelConflict=labelRects.some((used)=>rectanglesIntersect(padded,used));if(onCanvas&&!machineConflict&&!labelConflict){placement={x,y,box,padded};break;}}
    if(!placement){const y=Math.max(labelHeight/2+2*pixelScale,preferredY),box={left:anchor[0]-labelWidth/2,right:anchor[0]+labelWidth/2,top:y-labelHeight/2,bottom:y+labelHeight/2};placement={x:anchor[0],y,box,padded:paddedLabelRectangle(box,3*pixelScale)};}
    const badgeBox={left:anchor[0]-badgeRadius-2*pixelScale,right:anchor[0]+badgeRadius+2*pixelScale,top:anchor[1]-badgeRadius-2*pixelScale,bottom:anchor[1]+badgeRadius+2*pixelScale};
    if(Math.hypot(placement.x-anchor[0],placement.y-anchor[1])>badgeRadius+8*pixelScale){ctx.beginPath();ctx.moveTo(anchor[0],anchor[1]-badgeRadius*.55);ctx.lineTo(placement.x,placement.y+labelHeight/2);ctx.strokeStyle="rgba(232,255,252,.78)";ctx.lineWidth=Math.max(.75,pixelScale);ctx.stroke();}
    ctx.shadowColor=node.color;ctx.shadowBlur=8*pixelScale;ctx.fillStyle="rgba(8,34,31,.96)";ctx.strokeStyle="rgba(232,255,252,.96)";ctx.lineWidth=1.6*pixelScale;ctx.beginPath();ctx.arc(anchor[0],anchor[1],badgeRadius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#ffffff";ctx.font=`700 ${Math.max(9.5,fontCss+1.2)*pixelScale}px "Segoe UI", sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(node.number),anchor[0],anchor[1]+.4*pixelScale);
    ctx.fillStyle="rgba(7,25,23,.94)";ctx.strokeStyle=node.color;ctx.lineWidth=Math.max(.8,pixelScale);if(typeof ctx.roundRect==="function"){ctx.beginPath();ctx.roundRect(placement.box.left,placement.box.top,labelWidth,labelHeight,5*pixelScale);ctx.fill();ctx.stroke();}else{ctx.fillRect(placement.box.left,placement.box.top,labelWidth,labelHeight);ctx.strokeRect(placement.box.left,placement.box.top,labelWidth,labelHeight);}ctx.fillStyle="#f6fffd";ctx.font=`600 ${fontSize}px "Segoe UI", sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,placement.x,placement.y+.2*pixelScale);ctx.restore();
    labelRects.push(placement.padded);labelRects.push(badgeBox);
  }

  function drawSelectedCustomRouteTag(route) {
    if (combatLabelsSuppressed() || !SCREEN_SPACE_LABELS) return;
    if (!state.editing || state.objectEditorTab !== "pointers" || route?.connection?.key !== state.selectedProcessConnectionKey || route.connection.tagVisible !== true) return;
    const connection = route.connection;
    const text = String(connection.tagText || "").trim() || `${processConnectionEndpointText(connection,"source")} → ${processConnectionEndpointText(connection,"target")}`;
    const world = [route.worldMidpoint[0], route.worldMidpoint[1] + clamp(Number(connection.tagLift ?? 4), 0, 60), route.worldMidpoint[2]];
    const point = project(...world);
    if (state.cameraMode === "walk" && point[3] < WALK_NEAR_CLIP) return;
    const rect = canvas.getBoundingClientRect(), pixelScale = canvas.width / Math.max(1, rect.width);
    const x = point[0] + clamp(Number(connection.tagScreenOffsetX ?? 0), -500, 500) * pixelScale;
    const y = point[1] + clamp(Number(connection.tagScreenOffsetY ?? 0), -500, 500) * pixelScale;
    ctx.save();
    const fontSize = 8.3 * pixelScale;ctx.font=`600 ${fontSize}px "Segoe UI", sans-serif`;
    const width = ctx.measureText(text).width + 10 * pixelScale, height = 18 * pixelScale;
    const box = { left:x-width/2, right:x+width/2, top:y-height/2, bottom:y+height/2 };
    ctx.fillStyle="rgba(30,35,34,.9)";ctx.strokeStyle=route.color;ctx.lineWidth=Math.max(.75,pixelScale);
    if(typeof ctx.roundRect==="function"){ctx.beginPath();ctx.roundRect(box.left,box.top,width,height,5*pixelScale);ctx.fill();ctx.stroke();}else{ctx.fillRect(box.left,box.top,width,height);ctx.strokeRect(box.left,box.top,width,height);}
    ctx.fillStyle="#f5fffd";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,x,y+.2*pixelScale);ctx.restore();
    labelRects.push(paddedLabelRectangle(box,3*pixelScale));
  }

  function processFlowAnimationActive(){if(state.animationsPaused||!isTodayStage())return false;return Object.values(state.processConnections||{}).some((connection)=>connection?.visible!==false&&clamp(Number(connection.flowSpeed??42),0,180)>0);}

  function drawTodayProductionFlow(machineEntries,time){
    const entriesById=buildTodayProcessObjectEntries(machineEntries,time),routes=[];
    Object.values(state.processConnections||{}).sort((first,second)=>processConnectionDisplayName(first).localeCompare(processConnectionDisplayName(second))).forEach((connection)=>{if(connection?.visible===false)return;const fromEntry=entriesById.get(connection.sourceId),toEntry=entriesById.get(connection.targetId);if(!fromEntry||!toEntry)return;const route=drawFloorProcessFlow(fromEntry,toEntry,connection,time);if(route)routes.push(route);});
    return{entriesById,routes};
  }

  function drawTodayProductionFlowOverlay(flow){
    if(!flow)return;
    const {entriesById,routes}=flow;
    if(state.editing&&state.objectEditorTab==="pointers"){
      const rect=canvas.getBoundingClientRect(),pixelScale=canvas.width/Math.max(1,rect.width);
      routes.forEach((route)=>drawProcessFlowEditHandles(route,pixelScale));
    }
    if(SCREEN_SPACE_LABELS && !combatLabelsSuppressed()){
      const protectedMachineRects=state.cameraMode==="walk"?[]:[...entriesById.values()].map((entry)=>processStepMachineRect(entry,3)).filter(Boolean);
      collectProcessStepNodes(entriesById,routes).forEach((node)=>drawProcessStepLabel(node,protectedMachineRects));
      routes.forEach(drawSelectedCustomRouteTag);
    }
  }

  function rectanglesIntersect(first, second) {
    return !(
      first.right <= second.left ||
      first.left >= second.right ||
      first.bottom <= second.top ||
      first.top >= second.bottom
    );
  }

  function paddedLabelRectangle(rectangle, padding) {
    return {
      left: rectangle.left - padding,
      right: rectangle.right + padding,
      top: rectangle.top - padding,
      bottom: rectangle.bottom + padding,
    };
  }


  function labelLeaderConnection(rectangle, anchorPoint, requestedSide, pixelScale) {
    const padding = 5 * pixelScale;
    const side = requestedSide === "auto"
      ? (() => {
          const distances = {
            top: Math.abs(anchorPoint[1] - rectangle.top),
            bottom: Math.abs(anchorPoint[1] - rectangle.bottom),
            left: Math.abs(anchorPoint[0] - rectangle.left),
            right: Math.abs(anchorPoint[0] - rectangle.right),
          };
          return Object.entries(distances).sort((first, second) => first[1] - second[1])[0][0];
        })()
      : requestedSide;
    if (side === "top") return { side, x: clamp(anchorPoint[0], rectangle.left + padding, rectangle.right - padding), y: rectangle.top };
    if (side === "left") return { side, x: rectangle.left, y: clamp(anchorPoint[1], rectangle.top + padding, rectangle.bottom - padding) };
    if (side === "right") return { side, x: rectangle.right, y: clamp(anchorPoint[1], rectangle.top + padding, rectangle.bottom - padding) };
    return { side: "bottom", x: clamp(anchorPoint[0], rectangle.left + padding, rectangle.right - padding), y: rectangle.bottom };
  }

  function labelLineDash(style, width, pixelScale) {
    const scale = Math.max(1, width * pixelScale);
    if (style === "dashed") return [Math.max(4, scale * 3.4), Math.max(3, scale * 2.2)];
    if (style === "dotted") return [Math.max(1, scale * .8), Math.max(3, scale * 2.1)];
    return [];
  }

  function traceLabelLeader(connection, anchorPoint, shape) {
    ctx.beginPath();
    ctx.moveTo(connection.x, connection.y);
    if (shape === "elbow") {
      if (["top", "bottom"].includes(connection.side)) {
        const midY = connection.y + (anchorPoint[1] - connection.y) * .52;
        ctx.lineTo(connection.x, midY);
        ctx.lineTo(anchorPoint[0], midY);
      } else {
        const midX = connection.x + (anchorPoint[0] - connection.x) * .52;
        ctx.lineTo(midX, connection.y);
        ctx.lineTo(midX, anchorPoint[1]);
      }
    }
    ctx.lineTo(anchorPoint[0], anchorPoint[1]);
  }

  function compactLabelViewport() {
    if (state.cameraMode === "walk") return false;
    const rect = canvas.getBoundingClientRect();
    const coarseTouch = window.matchMedia?.("(hover: none) and (pointer: coarse)")?.matches;
    return rect.width <= 820 || Boolean(coarseTouch && rect.width <= 900 && rect.height <= 500);
  }

  function machineLabelProfile(machine) {
    const type = machine?.type || "generic";
    const area = Math.max(0, Number(machine?.w) || 0) * Math.max(0, Number(machine?.d) || 0);
    let profile = isFloorFeatureType(type)
      ? { rank: 0, cssSize: 8.5, maxChars: 12 }
      : PRIMARY_LABEL_TYPES.has(type)
        ? { rank: 4, cssSize: 12, maxChars: 18 }
        : SUPPORT_LABEL_TYPES.has(type)
          ? { rank: 2, cssSize: 10, maxChars: 15 }
          : MINOR_LABEL_TYPES.has(type)
            ? { rank: 1, cssSize: 9, maxChars: 13 }
            : area >= 220
              ? { rank: 3, cssSize: 11, maxChars: 17 }
              : { rank: 2, cssSize: 10, maxChars: 15 };
    if (machine?.labelPriority === "major") profile = { rank: 4, cssSize: Math.max(profile.cssSize, 12), maxChars: Math.max(profile.maxChars, 18) };
    else if (machine?.labelPriority === "normal") profile = { rank: 2, cssSize: 10, maxChars: 15 };
    else if (machine?.labelPriority === "support") profile = { rank: 1, cssSize: 9, maxChars: 13 };
    const sizeScale = Math.max(5, Number(machine?.labelSizePercent) || 100) / 100;
    const compactViewport = compactLabelViewport();
    const zoomCharacterScale = state.cameraMode === "walk"
      ? 1
      : clamp(.62 + state.zoom * .34, .68, 1.35);
    return {
      ...profile,
      cssSize: profile.cssSize * sizeScale * (compactViewport ? 1.02 : 1),
      maxChars: Math.max(7, Math.round(profile.maxChars * Math.min(sizeScale, 1.45) * zoomCharacterScale * (compactViewport ? .74 : 1))),
    };
  }

  function machineLabelText(machine) {
    const fallback = TYPE_LABEL_FALLBACKS[machine?.type] || "Object";
    const source = machine?.labelUseMachineName === false
      ? machine.labelText
      : (machine?.name || machine?.short);
    const value = String(source || machine?.name || machine?.short || fallback).trim() || fallback;
    return machine?.labelUppercase ? value.toUpperCase() : value;
  }

  function compactMachineLabel(machine, profile) {
    const fallback = TYPE_LABEL_FALLBACKS[machine?.type] || "Object";
    let value = machineLabelText(machine);
    const substitutions = [
      [/Barefoot cutting tables?/gi, "Barefoot"],
      [/Tempering furnace oven/gi, "Furnace"],
      [/Waterjet pump\s*(?:&|and)\s*filtration/gi, "Filtration"],
      [/Freestanding crane machine/gi, "Gantry crane"],
      [/A-frame glass truck/gi, "A-frame truck"],
      [/A-frame glass cart/gi, "A-frame cart"],
      [/Vertical glass moving/gi, "Moving glass"],
      [/\b(machine|equipment|system|workstation)\b/gi, ""],
    ];
    if (machine?.labelUseMachineName !== false) {
      substitutions.forEach(([pattern, replacement]) => {
        value = value.replace(pattern, replacement);
      });
    }
    value = value.replace(/\s{2,}/g, " ").replace(/\s+([#-])/g, " $1").trim() || fallback;
    if (value.length <= profile.maxChars) return value;
    const clipped = value.slice(0, Math.max(1, profile.maxChars - 1));
    const boundary = clipped.lastIndexOf(" ");
    return `${(boundary >= Math.floor(profile.maxChars * .55) ? clipped.slice(0, boundary) : clipped).trim()}…`;
  }

  function displayMachineLabel(machine, profile) {
    if (state.cameraMode !== "walk" && !isTodayStage()) {
      const roomName = machine?.type === "room" ? String(machine?.name || "").trim() : "";
      return roomName || machineLabelText(machine);
    }
    if (isTodayOverview() && state.todayLabelMode === "necessary") {
      return machineLabelText(machine);
    }
    const resolvedMode = state.cameraMode === "walk" ? "full" : state.todayLabelMode;
    if (resolvedMode === "abbreviated") {
      const customAbbreviation = String(machine?.labelAbbreviation || "").trim();
      if (customAbbreviation) return machine?.labelUppercase ? customAbbreviation.toUpperCase() : customAbbreviation;
      return compactMachineLabel(machine, profile);
    }
    return machineLabelText(machine);
  }

  function smartLabelMinimumRank(wasVisible = false) {
    const effectiveZoom = state.zoom + (wasVisible ? .07 : 0);
    if (effectiveZoom < .22) return 4;
    if (effectiveZoom < .34) return 3;
    if (effectiveZoom < .52) return 2;
    return 1;
  }

  function shouldShowSmartLabel(profile, selected, current, wasVisible = false) {
    if (selected || current) return true;
    if (state.labelMode === "all") return true;
    if (profile.rank <= 0) return false;
    return profile.rank >= smartLabelMinimumRank(wasVisible);
  }

  function smartLabelBudget() {
    if (state.cameraMode === "walk") return state.labelMode === "all" ? 16 : 10;
    if (!isTodayStage()) return Number.POSITIVE_INFINITY;
    if (isTodayOverview()) return Number.POSITIVE_INFINITY;
    if (state.labelMode === "all") return Number.POSITIVE_INFINITY;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 430) {
      if (state.zoom < .55) return 4;
      if (state.zoom < 1.05) return 5;
      return 6;
    }
    if (rect.width <= 820 || compactLabelViewport()) {
      if (state.zoom < .55) return 6;
      if (state.zoom < 1.05) return 8;
      return 10;
    }
    if (state.todayLabelMode === "full" && state.zoom >= .78) return Number.POSITIVE_INFINITY;
    const viewportBudget = Math.floor((rect.width * rect.height) / 36000);
    const zoomFactor = clamp(state.zoom, .72, 1.45);
    return Math.round(clamp(viewportBudget * zoomFactor, 12, 48));
  }

  function smartLabelRepeatLimit(profile) {
    if (!isTodayStage()) return Number.POSITIVE_INFINITY;
    if (isTodayOverview()) return state.todayLabelMode === "necessary" ? 1 : Number.POSITIVE_INFINITY;
    if (state.labelMode === "all") return Number.POSITIVE_INFINITY;
    if (compactLabelViewport()) return profile.rank >= 3 && state.zoom >= 1.05 ? 2 : 1;
    if (state.cameraMode !== "walk" && state.todayLabelMode === "full" && state.zoom >= .78) return Number.POSITIVE_INFINITY;
    if (state.cameraMode === "walk") return profile.rank >= 3 ? 2 : 1;
    if (state.zoom < .55) return profile.rank >= 3 ? 2 : 1;
    if (state.zoom < 1.05) return profile.rank >= 3 ? 2 : 1;
    return profile.rank >= 3 ? 3 : 2;
  }

  function updateLabelVisualState(key, targetVisible, time) {
    const visual = labelVisualStates.get(key) || {
      alpha: 0,
      targetVisible: false,
      lastTime: time - 16.667,
      lastSeen: time,
      slot: 0,
      drawX: null,
      drawY: null,
    };
    const elapsed = clamp(time - visual.lastTime, 0, 80);
    const duration = targetVisible ? 115 : 190;
    const blend = 1 - Math.exp(-elapsed / duration);
    visual.alpha += ((targetVisible ? 1 : 0) - visual.alpha) * blend;
    if (visual.alpha < .012 && !targetVisible) visual.alpha = 0;
    if (visual.alpha > .988 && targetVisible) visual.alpha = 1;
    visual.targetVisible = targetVisible;
    visual.lastTime = time;
    visual.lastSeen = time;
    labelVisualStates.set(key, visual);
    if ((targetVisible && visual.alpha < 1) || (!targetVisible && visual.alpha > 0)) labelTransitionsActive = true;
    return { visual, elapsed };
  }

  function trimLabelVisualStates(activeKeys, time) {
    labelVisualStates.forEach((visual, key) => {
      if (!activeKeys.has(key) && time - visual.lastSeen > 800) labelVisualStates.delete(key);
    });
  }

  function machineLabelZoomScale(depth = 0) {
    if (state.cameraMode === "walk") {
      const labelHorizon = 96;
      return clamp(1.58 - Math.max(0, depth) / labelHorizon * .34, 1.22, 1.58);
    }
    // Make zoom communicate hierarchy: compact tags keep the full-floor view
    // readable, while close inspection gets comfortably larger labels.
    return clamp(.48 + Math.sqrt(Math.max(.02, state.zoom) / 1.2) * .5, .64, 1.34);
  }

  function label(text, x, y, z, color, options = {}) {
    if (combatLabelsSuppressed() || !SCREEN_SPACE_LABELS || !state.showLabels || state.labelMode === "off") return { drawn: false, targetVisible: false };
    const labelKey = String(options.labelKey || text);
    const labelTime = Number(options.time) || state.lastFrameTime;
    const previousVisual = labelVisualStates.get(labelKey);
    let targetVisible = Boolean(options.visibleTarget);
    const anchorPoint = project(x, y, z);
    const labelWorldX = x + clamp(Number(options.worldOffsetX) || 0, -80, 80);
    const labelWorldY = y + Math.max(0, Number(options.labelLiftFeet) || 0);
    const labelWorldZ = z + clamp(Number(options.worldOffsetZ) || 0, -80, 80);
    const point = project(labelWorldX, labelWorldY, labelWorldZ);
    const rect = canvas.getBoundingClientRect();
    const pixelScale = canvas.width / Math.max(1, rect.width);
    const selected = Boolean(options.selected);
    const current = Boolean(options.current);
    const screenMargin = 28 * pixelScale;
    const projectionVisible = !(state.cameraMode === "walk" && point[3] < WALK_NEAR_CLIP) && !(
      point[0] < -screenMargin || point[0] > canvas.width + screenMargin ||
      point[1] < -screenMargin || point[1] > canvas.height + screenMargin
    );
    targetVisible = targetVisible && projectionVisible;
    if (state.cameraMode === "walk") {
      const walkLabelDistance = previousVisual?.targetVisible ? 104 : 92;
      targetVisible = targetVisible && point[3] <= walkLabelDistance;
    }
    const zoomScale = machineLabelZoomScale(point[3]);
    const cssFontSize = (Number(options.cssSize) || 10) * zoomScale + (selected ? .8 : 0);
    const fontSize = Math.max(6.5 * pixelScale, cssFontSize * pixelScale);
    const paddingX = clamp(6.4 * zoomScale, 4.5, 8) * pixelScale;
    const indicatorSpace = clamp(8 * zoomScale, 5.5, 10) * pixelScale;
    const height = Math.max(13 * pixelScale, (cssFontSize + 7.5 * zoomScale) * pixelScale);
    const collisionGap = clamp(3.5 * zoomScale, 2.5, 5.5) * pixelScale * (compactLabelViewport() ? 1.35 : 1);
    ctx.save();
    const fontWeight = options.fontWeight === "bold" ? 750 : options.fontWeight === "regular" ? 450 : 600;
    ctx.font = `${fontWeight} ${fontSize}px "Segoe UI", sans-serif`;
    const width = ctx.measureText(text).width + paddingX * 2 + indicatorSpace;
    // World labels do not search for alternate 2D screen slots. Their location is
    // derived only from the machine anchor plus the saved XYZ-style world offset,
    // so orbiting and zooming never makes a label jump to another side.
    let targetRectangle = null;
    if (targetVisible) {
      const candidateX = point[0];
      const candidateY = point[1] - height / 2;
      targetRectangle = {
        left: candidateX - width / 2,
        right: candidateX + width / 2,
        top: candidateY,
        bottom: candidateY + height,
      };
      const onCanvas = targetRectangle.right > -screenMargin &&
        targetRectangle.left < canvas.width + screenMargin &&
        targetRectangle.bottom > -screenMargin &&
        targetRectangle.top < canvas.height + screenMargin;
      if (!onCanvas) targetRectangle = null;
    }
    targetVisible = Boolean(targetRectangle);
    const { visual } = updateLabelVisualState(labelKey, targetVisible, labelTime);
    if (targetRectangle) {
      // Keep the card locked to its projected 3D location. Opacity still eases,
      // but position updates immediately with the camera and machine transform.
      visual.drawX = (targetRectangle.left + targetRectangle.right) / 2;
      visual.drawY = targetRectangle.top;
    }
    if (visual.alpha <= 0 || !Number.isFinite(visual.drawX) || !Number.isFinite(visual.drawY)) {
      ctx.restore();
      return { drawn: false, targetVisible };
    }
    const drawY = visual.drawY;
    const rectangle = {
      left: visual.drawX - width / 2,
      right: visual.drawX + width / 2,
      top: drawY,
      bottom: drawY + height,
    };
    if (visual.alpha > .12) labelRects.push(paddedLabelRectangle(rectangle, collisionGap));
    const labelAlpha = (selected ? .99 : current ? .96 : clamp(.82 + zoomScale * .09, .87, .95)) * visual.alpha;
    ctx.globalAlpha = labelAlpha;
    const savedBackground = String(options.backgroundColor || "");
    const customBackground = /^#[0-9a-f]{6}$/i.test(savedBackground) &&
      !["#141c20", "#132126"].includes(savedBackground.toLowerCase());
    const background = customBackground ? options.backgroundColor : selected ? "#2b241b" : current ? "#142827" : "#132126";
    const accent = selected ? "#f5b353" : current ? "#52b7aa" : color;
    const savedLineColor = /^#[0-9a-f]{6}$/i.test(String(options.lineColor || "")) ? options.lineColor : accent;
    const lineWidth = clamp(Number(options.lineWidth) || 1.65, .5, 10);
    const lineOpacity = clamp(Number(options.lineOpacity) || 100, 10, 100) / 100;
    const lineStyle = ["solid", "dashed", "dotted"].includes(options.lineStyle) ? options.lineStyle : "solid";
    const lineShape = ["straight", "elbow"].includes(options.lineShape) ? options.lineShape : "straight";
    const leaderSide = ["auto", "top", "bottom", "left", "right"].includes(options.leaderSide) ? options.leaderSide : "auto";
    const targetStyle = ["dot", "ring", "arrow", "none"].includes(options.targetStyle) ? options.targetStyle : "dot";
    const targetSize = clamp(Number(options.targetSize) || 3.2, 1, 12) * pixelScale;
    const pointerTarget = [anchorPoint[0], anchorPoint[1] - 1.5 * pixelScale];
    const connection = labelLeaderConnection(rectangle, pointerTarget, leaderSide, pixelScale);
    if (targetVisible) {
      ctx.save();
      ctx.globalAlpha = labelAlpha * lineOpacity;
      ctx.setLineDash(labelLineDash(lineStyle, lineWidth, pixelScale));
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      traceLabelLeader(connection, pointerTarget, lineShape);
      ctx.strokeStyle = "rgba(9,18,21,.82)";
      ctx.lineWidth = Math.max(lineWidth * pixelScale + 2.15 * pixelScale, 2.8 * pixelScale);
      ctx.stroke();
      traceLabelLeader(connection, pointerTarget, lineShape);
      ctx.strokeStyle = savedLineColor;
      ctx.lineWidth = Math.max(.75 * pixelScale, lineWidth * pixelScale);
      ctx.stroke();
      ctx.restore();
    }
    const radius = Math.min(6 * pixelScale, height * .28);
    ctx.shadowColor = "rgba(3,10,13,.28)";
    ctx.shadowBlur = Math.max(2, 5.5 * zoomScale * pixelScale);
    ctx.shadowOffsetY = Math.max(1, 1.5 * pixelScale);
    ctx.fillStyle = background;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(rectangle.left, drawY, width, height, radius);
      ctx.fill();
    } else ctx.fillRect(rectangle.left, drawY, width, height);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = selected ? "rgba(245,179,83,.82)" : current ? "rgba(82,183,170,.62)" : "rgba(220,235,232,.25)";
    ctx.lineWidth = Math.max(.8, pixelScale * (selected ? 1.05 : .7));
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(rectangle.left, drawY, width, height, radius);
      ctx.stroke();
    } else ctx.strokeRect(rectangle.left, drawY, width, height);
    ctx.fillStyle = accent;
    const accentWidth = Math.max(2, 2.4 * zoomScale * pixelScale);
    const accentInset = Math.max(3, 4 * zoomScale * pixelScale);
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(rectangle.left + accentInset, drawY + height * .25, accentWidth, height * .5, accentWidth / 2);
      ctx.fill();
    } else ctx.fillRect(rectangle.left + accentInset, drawY + height * .25, accentWidth, height * .5);
    ctx.fillStyle = /^#[0-9a-f]{6}$/i.test(String(options.textColor || "")) ? options.textColor : "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, rectangle.left + paddingX + indicatorSpace, drawY + height / 2 + pixelScale * .15);
    if (targetVisible && targetStyle !== "none") {
      ctx.save();
      ctx.globalAlpha = labelAlpha * lineOpacity;
      ctx.fillStyle = savedLineColor;
      ctx.strokeStyle = savedLineColor;
      ctx.lineWidth = Math.max(1, lineWidth * pixelScale * .75);
      if (targetStyle === "ring") {
        ctx.beginPath();
        ctx.arc(pointerTarget[0], pointerTarget[1], Math.max(2, targetSize), 0, Math.PI * 2);
        ctx.stroke();
      } else if (targetStyle === "arrow") {
        const dx = pointerTarget[0] - connection.x;
        const dy = pointerTarget[1] - connection.y;
        const angle = Math.atan2(dy, dx);
        const size = Math.max(4 * pixelScale, targetSize * 1.8);
        ctx.beginPath();
        ctx.moveTo(pointerTarget[0], pointerTarget[1]);
        ctx.lineTo(pointerTarget[0] - Math.cos(angle - .48) * size, pointerTarget[1] - Math.sin(angle - .48) * size);
        ctx.lineTo(pointerTarget[0] - Math.cos(angle + .48) * size, pointerTarget[1] - Math.sin(angle + .48) * size);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(pointerTarget[0], pointerTarget[1], Math.max(2.8 * pixelScale, targetSize + 1.2 * pixelScale), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(9,18,21,.86)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pointerTarget[0], pointerTarget[1], Math.max(1.5 * pixelScale, targetSize * .62), 0, Math.PI * 2);
        ctx.fillStyle = savedLineColor;
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    return { drawn: true, targetVisible };
  }

  function drawFloor() {
    const bounds = floorBounds();
    polygon(
      [[bounds[0],0,bounds[1]],[bounds[2],0,bounds[1]],[bounds[2],0,bounds[3]],[bounds[0],0,bounds[3]]],
      colors.floor,
      "#7c8582",
      1.3
    );
    const niceGridStep = (span) => {
      const minimumStep = Math.max(1, span / MAX_FLOOR_GRID_LINES);
      const magnitude = 10 ** Math.floor(Math.log10(minimumStep));
      const normalized = minimumStep / magnitude;
      const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
      return Math.max(25, nice * magnitude);
    };
    const gridX = niceGridStep(floor.width);
    const gridZ = niceGridStep(floor.length);
    for (let x = Math.ceil(bounds[0] / gridX) * gridX, count = 0; x < bounds[2] && count < MAX_FLOOR_GRID_LINES; x += gridX, count += 1) {
      line3d([x,.03,bounds[1]],[x,.03,bounds[3]],"#8f9794",.7,.25);
    }
    for (let z = Math.ceil(bounds[1] / gridZ) * gridZ, count = 0; z < bounds[3] && count < MAX_FLOOR_GRID_LINES; z += gridZ, count += 1) {
      line3d([bounds[0],.03,z],[bounds[2],.03,z],"#8f9794",.7,.25);
    }
  }

  function drawShell() {
    const painted = paintProgress(state.paint.wallStageId, 3);
    const wall = blendHexColors(state.paint.wallBefore, state.paint.wallAfter, painted);
    displayedWallSections().forEach((section) => {
      if (state.walls[section.id] !== false) box({ ...section, color: wall });
    });
  }

  function roofSections() {
    const bounds = floorBounds();
    const splitX = bounds[0] + (bounds[2] - bounds[0]) * state.roof.splitPercent / 100;
    return [
      { x1: bounds[0], x2: splitX, z1: bounds[1], z2: bounds[3], height: state.roof.leftHeight },
      { x1: splitX, x2: bounds[2], z1: bounds[1], z2: bounds[3], height: state.roof.rightHeight },
    ].filter((section) => section.x2 - section.x1 > 1);
  }

  function drawTrussMember(start, end, thickness, color, alpha) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const dz = end[2] - start[2];
    const horizontalLength = Math.hypot(dx, dy);
    const size = Math.max(.35, Number(thickness) || .35);
    if (Math.abs(dz) > horizontalLength) {
      box({
        x: start[0] - size / 2,
        y: start[1] - size / 2,
        z: Math.min(start[2], end[2]),
        w: size,
        h: size,
        d: Math.max(size, Math.abs(dz)),
        color,
      }, alpha);
      return;
    }
    box({
      x: (start[0] + end[0]) / 2 - horizontalLength / 2,
      y: (start[1] + end[1]) / 2 - size / 2,
      z: (start[2] + end[2]) / 2 - size / 2,
      w: Math.max(size, horizontalLength),
      h: size,
      d: size,
      rotationZ: Math.atan2(dy, dx) * 180 / Math.PI,
      color,
    }, alpha);
  }

  function drawRoofTruss(section, z, alpha) {
    const bottomY = section.height - 5;
    const topY = section.height - 1.1;
    const bayCount = Math.max(3, Math.min(8, Math.round((section.x2 - section.x1) / 24)));
    const bayWidth = (section.x2 - section.x1) / bayCount;
    drawTrussMember([section.x1, bottomY, z], [section.x2, bottomY, z], .78, state.roof.trussColor, alpha);
    drawTrussMember([section.x1, topY, z], [section.x2, topY, z], .62, state.roof.trussColor, alpha);
    for (let bay = 0; bay < bayCount; bay += 1) {
      const x1 = section.x1 + bay * bayWidth;
      const x2 = x1 + bayWidth;
      if (bay % 2 === 0) drawTrussMember([x1, bottomY, z], [x2, topY, z], .58, state.roof.trussColor, alpha);
      else drawTrussMember([x1, topY, z], [x2, bottomY, z], .58, state.roof.trussColor, alpha);
    }
  }

  function drawRoof() {
    if (!state.roof.enabled || (state.cameraMode !== "walk" && !state.roof.overviewVisible)) return;
    const walking = state.cameraMode === "walk";
    const panelAlpha = walking ? 1 : .18;
    const trussAlpha = walking ? 1 : .62;
    const roofColor = state.roof.roofColor;
    const sections = roofSections();
    sections.forEach((section) => {
      box({
        x: section.x1,
        y: section.height - .9,
        z: section.z1,
        w: section.x2 - section.x1,
        h: .9,
        d: section.z2 - section.z1,
        color: roofColor,
      }, panelAlpha);
      const span = section.z2 - section.z1;
      const spacing = Math.max(10, state.roof.trussSpacing);
      const trussCount = Math.max(2, Math.min(32, Math.ceil(span / spacing) + 1));
      for (let index = 0; index < trussCount; index += 1) {
        const z = section.z1 + span * index / Math.max(1, trussCount - 1);
        drawRoofTruss(section, z, trussAlpha);
      }
      const centerX = (section.x1 + section.x2) / 2;
      [section.x1, centerX, section.x2].forEach((x) => {
        drawTrussMember([x, section.height - 2.2, section.z1], [x, section.height - 2.2, section.z2], .65, state.roof.trussColor, trussAlpha);
      });
    });
    if (sections.length === 2 && Math.abs(sections[0].height - sections[1].height) > .5) {
      const lower = Math.min(sections[0].height, sections[1].height);
      const upper = Math.max(sections[0].height, sections[1].height);
      const splitX = sections[0].x2;
      box({
        x: splitX - .25,
        y: lower,
        z: sections[0].z1,
        w: .5,
        h: upper - lower,
        d: sections[0].z2 - sections[0].z1,
        color: roofColor,
      }, panelAlpha);
      const span = sections[0].z2 - sections[0].z1;
      const braceCount = Math.max(2, Math.min(32, Math.ceil(span / state.roof.trussSpacing) + 1));
      for (let index = 0; index < braceCount; index += 1) {
        const z = sections[0].z1 + span * index / Math.max(1, braceCount - 1);
        box({ x: splitX - .32, y: lower, z: z - .32, w: .64, h: upper - lower, d: .64, color: state.roof.trussColor }, trussAlpha);
      }
    }
  }

  function paintProgress(stageId, fallbackIndex) {
    const requestedIndex = stages.findIndex((stage) => stage.id === stageId);
    const targetIndex = requestedIndex >= 0 ? requestedIndex : clamp(fallbackIndex, 0, stages.length - 1);
    return clamp(state.stageFloat - Math.max(0, targetIndex - 1));
  }

  function drawColumn(index) {
    const column = typeof index === "object"
      ? index
      : structuralColumns().find((item) => item.source === "cad" && item.baseIndex === index);
    if (!column || isColumnHidden(column)) return;
    const { x, z } = column;
    const painted = paintProgress(state.paint.columnStageId, 3);
    const size = 2.1 + (2.32 - 2.1) * painted;
    const color = blendHexColors(state.paint.columnBefore, state.paint.columnAfter, painted);
    const height = displayedColumnHeight(column);

    const base = project(x, 0, z);
    const top = project(x, height, z);
    if (!state.editing && state.cameraMode !== "walk" && Math.hypot(top[0] - base[0], top[1] - base[1]) < 18) {
      line3d([x, 0, z], [x, height, z], color, 2.1, 1);
      return;
    }

    // Render one closed pillar volume. The previous implementation stacked a
    // yellow coat directly over a steel pillar with both top faces at y=22,
    // which caused depth-buffer flicker on the cap during the paint timeline.
    box({ x:x-size/2,z:z-size/2,w:size,d:size,h:height,color });
  }
  function sceneDepth(x,z) {
    return project(x,0,z)[2];
  }

  function drawCrane(machine, machineAlpha) {
    if (!machine.crane) return;
    if (!shouldDrawDetailedMachine(machine)) return;
    const railAlpha = stageAlpha(5);
    if (railAlpha <= .01) return;
    const padding = machine.crane.capacity === "5 ton" ? 7 : 3;
    const height = machine.crane.height;
    const runway = machine.crane.capacity === "5 ton" ? "#555f61" : "#2572a4";
    const bridge = machine.crane.capacity === "5 ton" ? "#e4b52d" : "#cdd3d3";
    const support = "#dcaf28";

    localLine(machine,[-padding,height,-padding],[machine.w+padding,height,-padding],runway,machine.crane.capacity === "5 ton" ? 4 : 3,railAlpha);
    localLine(machine,[-padding,height,machine.d+padding],[machine.w+padding,height,machine.d+padding],runway,machine.crane.capacity === "5 ton" ? 4 : 3,railAlpha);
    [[-padding,-padding],[machine.w+padding,-padding],[-padding,machine.d+padding],[machine.w+padding,machine.d+padding]].forEach(([x,z]) => {
      localLine(machine,[x,0,z],[x,height,z],support,2.2,railAlpha * .72);
    });

    if (machineAlpha <= .01) return;
    const bridgeX = machine.w * .56;
    localLine(machine,[bridgeX,height+.2,-padding],[bridgeX,height+.2,machine.d+padding],bridge,machine.crane.capacity === "5 ton" ? 5 : 3.5,machineAlpha);
    localLine(machine,[bridgeX-1.2,height+.65,machine.d/2],[bridgeX+1.2,height+.65,machine.d/2],machine.crane.capacity === "5 ton" ? "#333b3e" : colors.orange,5,machineAlpha);
    localLine(machine,[bridgeX,height,machine.d/2],[bridgeX,machine.h+1.2,machine.d/2],"#33383a",1.7,machineAlpha);
  }

  function drawRollerBed(machine, startX, endX, nearZ, farZ, y, spacing, color, alpha, width = 1.5) {
    const usable = Math.max(0, endX - startX);
    for (let offset = 0; offset <= usable; offset += Math.max(0.75, spacing)) {
      localLine(machine,[startX + offset,y,nearZ],[startX + offset,y,farZ],color,width,alpha);
    }
  }

  function drawControlConsole(machine, localX, localZ, width, depth, height, baseY, alpha) {
    box(localBox(machine,localX,localZ,width,depth,height,"#e4e8e5",baseY),alpha,1);
    box(localBox(machine,localX + width*.12,localZ-.08,width*.76,.16,height*.34,"#26363d",baseY + height*.48),alpha,1);
    box(localBox(machine,localX + width*.22,localZ-.13,width*.56,.12,height*.18,"#51a8c6",baseY + height*.56),alpha*.95,1);
  }


  function componentAnimationWave(component, time) {
    const speed = Math.max(0, Number(component.animationSpeed) || 0);
    const pauseSeconds = Math.max(0, Number(component.animationPauseSeconds) || 0);
    const phase = ((Number(component.animationPhase) || 0) / 360 + 1) % 1;
    if (speed <= 0) return { cycle: 0, wrapped: 0, sine: 0, pingPong: 0 };
    const activeDuration = 1 / speed;
    const elapsed = Math.max(0, effectiveAnimationTime(time) / 1000 + phase * activeDuration);
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

  function designComponentCenter(component) {
    if (!component) return [0,0,0];
    if (component.type === "group") return designGroupCenter(component.children || []);
    if (["box", "glassPanel", "cylinder", "sphere", "cone", "wedge", "text"].includes(component.type)) {
      return [
        Number(component.x) + Number(component.w) / 2,
        Number(component.y) + Number(component.h) / 2,
        Number(component.z) + Number(component.d) / 2,
      ];
    }
    if (component.type === "beam") {
      return [
        (Number(component.x) + Number(component.x2)) / 2,
        (Number(component.y) + Number(component.y2)) / 2,
        (Number(component.z) + Number(component.z2)) / 2,
      ];
    }
    if (component.type === "rollerBed") {
      return [
        Number(component.x) + Number(component.w) / 2,
        Number(component.y),
        Number(component.z) + Number(component.d) / 2,
      ];
    }
    // Wheels use x/y/z as their center in both editors, not as a lower corner.
    return [Number(component.x), Number(component.y), Number(component.z)];
  }

  function designComponentPoints(component) {
    if (!component) return [];
    if (component.type === "group") return (component.children || []).flatMap(designComponentPoints);
    if (component.type === "beam") return designBeamVertices(component);

    const center = designComponentCenter(component);
    const rotation = designComponentRotation(component);
    if (["box", "glassPanel", "text"].includes(component.type)) {
      const halfWidth = Math.max(.001, Number(component.w) / 2);
      const halfHeight = Math.max(.001, Number(component.h) / 2);
      const halfDepth = Math.max(.001, Number(component.d) / 2);
      return [
        [-halfWidth,-halfHeight,-halfDepth], [halfWidth,-halfHeight,-halfDepth],
        [halfWidth,-halfHeight,halfDepth], [-halfWidth,-halfHeight,halfDepth],
        [-halfWidth,halfHeight,-halfDepth], [halfWidth,halfHeight,-halfDepth],
        [halfWidth,halfHeight,halfDepth], [-halfWidth,halfHeight,halfDepth],
      ].map((offset) => {
        const rotated = rotateVector3(offset, ...rotation);
        return center.map((value, index) => value + rotated[index]);
      });
    }

    if (component.type === "cylinder" || component.type === "cone") {
      const requestedSegments = Math.max(8, Math.round(Number(component.segments) || 20));
      const count = renderPerformance.cylinderSegments(requestedSegments);
      const topScale = component.type === "cone" ? 0 : 1;
      const points = [];
      for (const layer of [-1, 1]) {
        const radiusScale = layer < 0 ? 1 : topScale;
        for (let index = 0; index < count; index += 1) {
          const angle = index / count * Math.PI * 2;
          const rotated = rotateVector3([
            Math.cos(angle) * Number(component.w) / 2 * radiusScale,
            layer * Number(component.h) / 2,
            Math.sin(angle) * Number(component.d) / 2 * radiusScale,
          ], ...rotation);
          points.push(center.map((value, axis) => value + rotated[axis]));
        }
      }
      return points;
    }

    if (component.type === "sphere") {
      const offsets = [
        [-Number(component.w) / 2, 0, 0], [Number(component.w) / 2, 0, 0],
        [0, -Number(component.h) / 2, 0], [0, Number(component.h) / 2, 0],
        [0, 0, -Number(component.d) / 2], [0, 0, Number(component.d) / 2],
      ];
      return offsets.map((offset) => {
        const rotated = rotateVector3(offset, ...rotation);
        return center.map((value, index) => value + rotated[index]);
      });
    }

    if (component.type === "wedge") {
      const local = [
        [-Number(component.w)/2,-Number(component.h)/2,-Number(component.d)/2],
        [ Number(component.w)/2,-Number(component.h)/2,-Number(component.d)/2],
        [ Number(component.w)/2,-Number(component.h)/2, Number(component.d)/2],
        [-Number(component.w)/2,-Number(component.h)/2, Number(component.d)/2],
        [-Number(component.w)/2, Number(component.h)/2,-Number(component.d)/2],
        [-Number(component.w)/2, Number(component.h)/2, Number(component.d)/2],
      ];
      return local.map((offset) => {
        const rotated = rotateVector3(offset, ...rotation);
        return center.map((value, index) => value + rotated[index]);
      });
    }

    if (component.type === "rollerBed") {
      const radius = Math.max(.05, Number(component.thickness) / 2);
      const corners = [
        [Number(component.x) - radius, Number(component.y) - radius, Number(component.z)],
        [Number(component.x) + Number(component.w) + radius, Number(component.y) - radius, Number(component.z)],
        [Number(component.x) + Number(component.w) + radius, Number(component.y) + radius, Number(component.z) + Number(component.d)],
        [Number(component.x) - radius, Number(component.y) + radius, Number(component.z) + Number(component.d)],
        [Number(component.x) - radius, Number(component.y) + radius, Number(component.z)],
        [Number(component.x) + Number(component.w) + radius, Number(component.y) - radius, Number(component.z) + Number(component.d)],
      ];
      return corners.map((point) => rotatedDesignPoint(component, point, center));
    }

    if (component.type === "wheel") {
      const radiusX = Math.max(.05, Number(component.w) / 2);
      const radiusY = Math.max(.05, Number(component.h) / 2);
      const halfDepth = Math.max(.025, Number(component.d) / 2);
      const points = [];
      for (const localZ of [-halfDepth, halfDepth]) {
        for (let index = 0; index < 16; index += 1) {
          const angle = index / 16 * Math.PI * 2;
          const rotated = rotateVector3([
            Math.cos(angle) * radiusX,
            Math.sin(angle) * radiusY,
            localZ,
          ], ...rotation);
          points.push(center.map((value, axis) => value + rotated[axis]));
        }
      }
      return points;
    }

    return [center];
  }

  function designGroupCenter(children) {
    const points = children.flatMap(designComponentPoints);
    if (!points.length) return [0,0,0];
    return [
      (Math.min(...points.map((point) => point[0])) + Math.max(...points.map((point) => point[0]))) / 2,
      (Math.min(...points.map((point) => point[1])) + Math.max(...points.map((point) => point[1]))) / 2,
      (Math.min(...points.map((point) => point[2])) + Math.max(...points.map((point) => point[2]))) / 2,
    ];
  }

  function translateDesignComponent(component, dx, dy, dz) {
    if (component.type === "group") {
      (component.children || []).forEach((child) => translateDesignComponent(child, dx, dy, dz));
      return;
    }
    component.x = Number(component.x) + dx;
    component.y = Number(component.y) + dy;
    component.z = Number(component.z) + dz;
    if (component.type === "beam") {
      component.x2 = Number(component.x2) + dx;
      component.y2 = Number(component.y2) + dy;
      component.z2 = Number(component.z2) + dz;
    }
  }

  function rotateDesignComponentAround(component, pivot, rotationX, rotationY, rotationZ) {
    if (component.type === "group") {
      (component.children || []).forEach((child) => rotateDesignComponentAround(child, pivot, rotationX, rotationY, rotationZ));
      return;
    }
    const rotatePoint = (point) => {
      const offset = [point[0] - pivot[0], point[1] - pivot[1], point[2] - pivot[2]];
      const rotated = rotateVector3(offset, rotationX, rotationY, rotationZ);
      return [pivot[0] + rotated[0], pivot[1] + rotated[1], pivot[2] + rotated[2]];
    };
    // Match Machine Design Studio's component-center rotation semantics for every
    // leaf shape. Beam endpoints remain the authored local axis and the beam's
    // rotation fields carry its orientation; rotating both endpoints here as well
    // would apply the same animation rotation twice in Plant Overview.
    const currentCenter = designComponentCenter(component);
    const targetCenter = rotatePoint(currentCenter);
    translateDesignComponent(
      component,
      targetCenter[0] - currentCenter[0],
      targetCenter[1] - currentCenter[1],
      targetCenter[2] - currentCenter[2],
    );
    component.rotationX = (Number(component.rotationX) || 0) + rotationX;
    component.rotationY = (Number(component.rotationY ?? component.rotation) || 0) + rotationY;
    component.rotationZ = (Number(component.rotationZ) || 0) + rotationZ;
    component.rotation = component.rotationY;
  }

  function scaleDesignComponentAround(component, pivot, scaleX, scaleY, scaleZ) {
    const scaleAxis = (target, axis, requestedFactor) => {
      const factor = clamp(Number(requestedFactor) || 1, .05, 20);
      if (Math.abs(factor - 1) < .00001) return;
      if (target.type === "group") {
        (target.children || []).forEach((child) => scaleAxis(child, axis, factor));
        return;
      }

      const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;
      const originalCenter = designComponentCenter(target);
      if (["box", "glassPanel", "cylinder", "sphere", "cone", "wedge"].includes(target.type)) {
        if (axis === "x") target.w = Math.max(.02, Number(target.w) * factor);
        if (axis === "y") target.h = Math.max(.02, Number(target.h) * factor);
        if (axis === "z") target.d = Math.max(.02, Number(target.d) * factor);
        target.x = originalCenter[0] - Number(target.w) / 2;
        target.y = originalCenter[1] - Number(target.h) / 2;
        target.z = originalCenter[2] - Number(target.d) / 2;
      } else if (target.type === "rollerBed") {
        if (axis === "x") target.w = Math.max(.1, Number(target.w) * factor);
        if (axis === "z") target.d = Math.max(.1, Number(target.d) * factor);
        if (axis === "y") target.thickness = Math.max(.2, Number(target.thickness) * factor);
        target.x = originalCenter[0] - Number(target.w) / 2;
        target.y = originalCenter[1];
        target.z = originalCenter[2] - Number(target.d) / 2;
      } else if (target.type === "beam") {
        if (axis === "x") {
          const start = [Number(target.x), Number(target.y), Number(target.z)];
          const end = [Number(target.x2), Number(target.y2), Number(target.z2)];
          const delta = end.map((value, index) => value - start[index]);
          const length = Math.max(.0001, Math.hypot(...delta));
          const direction = delta.map((value) => value / length);
          const halfLength = length / 2 * factor;
          target.x = originalCenter[0] - direction[0] * halfLength;
          target.y = originalCenter[1] - direction[1] * halfLength;
          target.z = originalCenter[2] - direction[2] * halfLength;
          target.x2 = originalCenter[0] + direction[0] * halfLength;
          target.y2 = originalCenter[1] + direction[1] * halfLength;
          target.z2 = originalCenter[2] + direction[2] * halfLength;
        } else if (axis === "y") {
          target.thicknessY = Math.max(.2, Number(target.thicknessY || target.thickness) * factor);
        } else if (axis === "z") {
          target.thicknessZ = Math.max(.2, Number(target.thicknessZ || target.thickness) * factor);
        }
        target.thickness = Math.max(Number(target.thicknessY || target.thickness || 0), Number(target.thicknessZ || target.thickness || 0), .2);
      } else if (target.type === "wheel") {
        if (axis === "x") target.w = Math.max(.1, Number(target.w) * factor);
        if (axis === "y") target.h = Math.max(.1, Number(target.h) * factor);
        if (axis === "z") target.d = Math.max(.05, Number(target.d) * factor);
        target.size = Math.max(Number(target.w), Number(target.h));
      }

      const resizedCenter = designComponentCenter(target);
      const targetCenter = [...originalCenter];
      targetCenter[axisIndex] = pivot[axisIndex] + (originalCenter[axisIndex] - pivot[axisIndex]) * factor;
      translateDesignComponent(
        target,
        targetCenter[0] - resizedCenter[0],
        targetCenter[1] - resizedCenter[1],
        targetCenter[2] - resizedCenter[2],
      );
    };

    scaleAxis(component, "x", scaleX);
    scaleAxis(component, "y", scaleY);
    scaleAxis(component, "z", scaleZ);
  }

  function scaleDesignSelectionTogether(component, pivot, factor, axis) {
    const requestedFactor = clamp(Number(factor) || 1, .05, 20);
    if (Math.abs(requestedFactor - 1) < .00001) return;

    // Mirror Machine Design Studio's scaleSelectionTogether behavior. Nested
    // groups first resize around their own current bounds center, then the whole
    // group center moves relative to the external motion-driver pivot. Scaling
    // every descendant directly around the external pivot is close, but drifts
    // for rotated nested groups after non-uniform scaling.
    const originalCenter = designComponentCenter(component);
    scaleDesignComponentAround(
      component,
      originalCenter,
      axis === "x" ? requestedFactor : 1,
      axis === "y" ? requestedFactor : 1,
      axis === "z" ? requestedFactor : 1,
    );
    const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;
    const targetCenter = [...originalCenter];
    targetCenter[axisIndex] = pivot[axisIndex] + (originalCenter[axisIndex] - pivot[axisIndex]) * requestedFactor;
    const currentCenter = designComponentCenter(component);
    translateDesignComponent(
      component,
      targetCenter[0] - currentCenter[0],
      targetCenter[1] - currentCenter[1],
      targetCenter[2] - currentCenter[2],
    );
  }

  function multiplyDesignOpacity(component, factor) {
    if (component.type === "group") {
      (component.children || []).forEach((child) => multiplyDesignOpacity(child, factor));
      return;
    }
    const baseOpacity = Number.isFinite(Number(component.opacity)) ? Number(component.opacity) : 1;
    component.opacity = clamp(baseOpacity * factor, 0, 1);
  }

  function flattenDesignComponents(components) {
    return components.flatMap((component) => component.type === "group"
      ? flattenDesignComponents(component.children || [])
      : [component]);
  }

  // Expand the saved part into temporary box fragments only for drawing. The
  // design library remains compact and keeps the original editable geometry.
  function rectangularSplitDesignComponents(component) {
    const effect = component?.rectangularSplit;
    if (!effect || Number(effect.progress) <= 0.0001 || !timelineEngine?.rectangularSplitCells) {
      return component?.type === "group"
        ? (component.children || []).flatMap(rectangularSplitDesignComponents)
        : [component];
    }

    const points = designComponentPoints(component);
    if (!points.length) return [component];
    const split = timelineEngine.rectangularSplitCells(effect);
    const boxLike = ["box", "glassPanel", "cylinder", "sphere", "cone", "wedge"].includes(component.type);
    const bounds = {
      minX: Math.min(...points.map((point) => point[0])),
      maxX: Math.max(...points.map((point) => point[0])),
      minY: Math.min(...points.map((point) => point[1])),
      maxY: Math.max(...points.map((point) => point[1])),
      minZ: Math.min(...points.map((point) => point[2])),
      maxZ: Math.max(...points.map((point) => point[2])),
    };
    const center = boxLike
      ? [
          Number(component.x) + Number(component.w) / 2,
          Number(component.y) + Number(component.h) / 2,
          Number(component.z) + Number(component.d) / 2,
        ]
      : [
          (bounds.minX + bounds.maxX) / 2,
          (bounds.minY + bounds.maxY) / 2,
          (bounds.minZ + bounds.maxZ) / 2,
        ];
    const dimensions = boxLike
      ? [Math.max(.02, Number(component.w) || .02), Math.max(.02, Number(component.h) || .02), Math.max(.02, Number(component.d) || .02)]
      : [Math.max(.02, bounds.maxX - bounds.minX), Math.max(.02, bounds.maxY - bounds.minY), Math.max(.02, bounds.maxZ - bounds.minZ)];
    const baseRotation = boxLike ? designComponentRotation(component) : [0, 0, 0];
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
      const rotatedCenterOffset = rotateVector3(localCenterOffset, ...baseRotation);
      const rotatedSpread = rotateVector3(localSpread, ...baseRotation);
      const fragmentCenter = [
        center[0] + rotatedCenterOffset[0] + rotatedSpread[0],
        center[1] + rotatedCenterOffset[1] + rotatedSpread[1],
        center[2] + rotatedCenterOffset[2] + rotatedSpread[2],
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

  function designComponentPathAxes(component, firstAmount, secondAmount) {
    const firstAxis = ["x", "y", "z"].includes(component.animationAxis) ? component.animationAxis : "y";
    let secondAxis = ["x", "y", "z"].includes(component.animationSecondaryAxis) ? component.animationSecondaryAxis : "z";
    if (secondAxis === firstAxis) secondAxis = firstAxis === "z" ? "x" : "z";
    const rotation = [Number(component.rotationX)||0, Number(component.rotationY ?? component.rotation)||0, Number(component.rotationZ)||0];
    const axisVector = (axis) => rotateVector3(axis === "x" ? [1,0,0] : axis === "y" ? [0,1,0] : [0,0,1], ...rotation);
    const firstVector = axisVector(firstAxis);
    const secondVector = axisVector(secondAxis);
    return [0,1,2].map((index) => firstVector[index] * firstAmount + secondVector[index] * secondAmount);
  }

  function fourStepPauseDurations(source) {
    const legacyAxis1 = Math.max(0, Number(source.animationPauseSeconds) || 0);
    const legacyAxis2 = Math.max(0, Number.isFinite(Number(source.animationSecondaryPauseSeconds))
      ? Number(source.animationSecondaryPauseSeconds)
      : legacyAxis1);
    return [
      Math.max(0, Number.isFinite(Number(source.animationStep1PauseSeconds)) ? Number(source.animationStep1PauseSeconds) : legacyAxis1),
      Math.max(0, Number.isFinite(Number(source.animationStep2PauseSeconds)) ? Number(source.animationStep2PauseSeconds) : legacyAxis2),
      Math.max(0, Number.isFinite(Number(source.animationStep3PauseSeconds)) ? Number(source.animationStep3PauseSeconds) : legacyAxis1),
      Math.max(0, Number.isFinite(Number(source.animationStep4PauseSeconds)) ? Number(source.animationStep4PauseSeconds) : legacyAxis2),
    ];
  }

  function fourStepOffset(source, time, firstAmount, secondAmount, combine) {
    const speed = Math.max(0, Number(source.animationSpeed) || 0);
    if (speed <= 0) return [0,0,0];
    const pauses = fourStepPauseDurations(source);
    const activeDuration = 1 / speed;
    const legDuration = activeDuration / 4;
    const totalDuration = activeDuration + pauses.reduce((sum, value) => sum + value, 0);
    const phase = ((Number(source.animationPhase) || 0) / 360 + 1) % 1;
    const elapsed = Math.max(0, effectiveAnimationTime(time) / 1000 + phase * totalDuration);
    let local = ((elapsed % totalDuration) + totalDuration) % totalDuration;
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
        return combine(
          interpolate(leg.from[0], leg.to[0], progress),
          interpolate(leg.from[1], leg.to[1], progress),
        );
      }
      local -= legDuration;
      if (local < pauses[index]) return combine(leg.to[0], leg.to[1]);
      local -= pauses[index];
    }
    return [0,0,0];
  }

  function designComponentFourStepOffset(component, time) {
    return fourStepOffset(
      component,
      time,
      Number(component.animationAmount) || 0,
      Number(component.animationSecondaryAmount) || 0,
      (first, second) => designComponentPathAxes(component, first, second),
    );
  }

  function timelineRotationOperations(timelineState) {
    const explicitOperations = Array.isArray(timelineState?.rotationOperations)
      ? timelineState.rotationOperations
        .map((operation) => ({
          rotation: (operation?.rotation || [0, 0, 0]).map((value) => Number(value) || 0),
          pivotOffset: (operation?.pivotOffset || [0, 0, 0]).map((value) => Number(value) || 0),
        }))
        .filter((operation) => operation.rotation.some((value) => Math.abs(value) > .00001))
      : [];
    if (explicitOperations.length) return explicitOperations;
    const fallbackRotation = (timelineState?.rotation || [0, 0, 0]).map((value) => Number(value) || 0);
    return fallbackRotation.some((value) => Math.abs(value) > .00001)
      ? [{ rotation: fallbackRotation, pivotOffset: [0, 0, 0] }]
      : [];
  }

  function applyDesignTimelineAnimation(animated, source, timelineState) {
    const rotation = designComponentRotation(source);
    const localTranslation = timelineState.translation || [0, 0, 0];
    const worldTranslation = rotateVector3(localTranslation, ...rotation);
    const sourceCenter = designGroupCenter([source]);
    timelineRotationOperations(timelineState).forEach((operation) => {
      const worldPivotOffset = rotateVector3(operation.pivotOffset, ...rotation);
      const pivot = sourceCenter.map((value, index) => value + worldPivotOffset[index]);
      ["x", "y", "z"].forEach((axis, index) => {
        const degrees = Number(operation.rotation[index]) || 0;
        if (Math.abs(degrees) < .00001) return;
        rotateDesignComponentAround(
          animated,
          pivot,
          axis === "x" ? degrees : 0,
          axis === "y" ? degrees : 0,
          axis === "z" ? degrees : 0,
        );
      });
    });
    translateDesignComponent(animated, ...worldTranslation);

    // Match Machine Design Studio exactly: timeline scaling is applied after
    // rotation/translation, one axis at a time. A rotated merged group can shift
    // its bounds center slightly after a non-uniform axis scale, so recompute the
    // pivot before each axis instead of reusing one approximate group center.
    const timelineScale = (timelineState.scale || [1, 1, 1]).map((value) => Number(value) || 1);
    ["x", "y", "z"].forEach((axis, index) => {
      const factor = timelineScale[index];
      if (Math.abs(factor - 1) < .00001) return;
      const scalePivot = designGroupCenter([animated]);
      scaleDesignComponentAround(
        animated,
        scalePivot,
        axis === "x" ? factor : 1,
        axis === "y" ? factor : 1,
        axis === "z" ? factor : 1,
      );
    });

    const timelineOpacity = Number.isFinite(Number(timelineState.opacity)) ? clamp(Number(timelineState.opacity), 0, 1) : 1;
    if (Math.abs(timelineOpacity - 1) > .00001) {
      multiplyDesignOpacity(animated, timelineOpacity);
    }
    if (typeof timelineState.visible === "boolean") animated.visible = timelineState.visible;
    if (timelineState.rectangularSplit) animated.rectangularSplit = clone(timelineState.rectangularSplit);
    else delete animated.rectangularSplit;
    return animated;
  }

  const designTimelineDurationCache = new WeakMap();

  function designComponentTimelines(components) {
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

  function designSharedTimelineSettings(design) {
    const saved = design?.animationTimelineSettings;
    return {
      loop: saved?.loop !== false,
      playbackRate: clamp(Number(saved?.playbackRate ?? 1) || 0, 0, 20),
    };
  }

  function designSharedTimelineDuration(design) {
    if (design && designTimelineDurationCache.has(design)) return designTimelineDurationCache.get(design);
    const timelines = designComponentTimelines(design?.components);
    const duration = timelineEngine?.sharedTimelineDuration
      ? timelineEngine.sharedTimelineDuration(timelines)
      : Math.max(timelineEngine?.MIN_TIMELINE_SECONDS || 30, ...timelines.map((timeline) => timelineEngine?.timelineDuration?.(timeline) || 0));
    if (design) designTimelineDurationCache.set(design, duration);
    return duration;
  }

  function evaluateDesignTimeline(timeline, time, design) {
    const settings = designSharedTimelineSettings(design);
    return timelineEngine.evaluateTimeline(timeline, effectiveAnimationTime(time) / 1000, {
      sharedClock: true,
      duration: designSharedTimelineDuration(design),
      loop: settings.loop,
      playbackRate: settings.playbackRate,
    });
  }

  function designComponentAnimationTransform(component, time, design) {
    const transform = { translation: [0,0,0], rotation: [0,0,0], rotationOperations: [], scale: [1,1,1], alpha: 1, visible: null, rectangularSplit: null };
    if (state.editing && !state.previewObjectAnimations) return transform;
    if (timelineEngine && component.animationTimeline && Array.isArray(component.animationTimeline.clips)) {
      if (component.animationTimeline.enabled === false || !component.animationTimeline.clips.some((clip) => clip.enabled !== false)) return transform;
      const timelineState = evaluateDesignTimeline(component.animationTimeline, time, design);
      transform.translation = rotateVector3(timelineState.translation || [0, 0, 0], ...designComponentRotation(component));
      transform.rotation = (timelineState.rotation || [0, 0, 0]).map((value) => Number(value) || 0);
      transform.rotationOperations = timelineRotationOperations(timelineState).map((operation) => ({
        rotation: operation.rotation,
        // Store inherited pivot offsets in world coordinates so every merged
        // sibling rotates around the same point as the motion-driver part.
        pivotOffset: rotateVector3(operation.pivotOffset, ...designComponentRotation(component)),
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
      transform.translation = designComponentFourStepOffset(component, time);
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

  function animateDesignComponentSelf(component, time, design) {
    if (state.editing && !state.previewObjectAnimations) return clone(component);
    if (timelineEngine && component.animationTimeline && Array.isArray(component.animationTimeline.clips)) {
      if (component.animationTimeline.enabled === false || !component.animationTimeline.clips.some((clip) => clip.enabled !== false)) return clone(component);
      const animated = clone(component);
      const timelineState = evaluateDesignTimeline(component.animationTimeline, time, design);
      return applyDesignTimelineAnimation(animated, component, timelineState);
    }
    if (
      component.animationEnabled === false ||
      !component.animationType ||
      component.animationType === "none"
    ) return clone(component);
    const animated = clone(component);
    const { cycle, wrapped, sine, pingPong } = componentAnimationWave(component, time);
    const amount = Number(component.animationAmount) || 0;
    const axis = component.animationAxis || "x";
    const offset = component.animationType === "loop"
      ? (wrapped - 0.5) * amount
      : component.animationType === "oscillate"
        ? pingPong * amount
        : sine * amount / 2;
    const translate = (dx,dy,dz) => translateDesignComponent(animated, dx, dy, dz);
    if (["oscillate", "loop"].includes(component.animationType)) {
      translate(axis === "x" || axis === "all" ? offset : 0, axis === "y" || axis === "all" ? offset : 0, axis === "z" || axis === "all" ? offset : 0);
    } else if (component.animationType === "fourStep") {
      translate(...designComponentFourStepOffset(component, time));
    } else if (component.animationType === "bob") translate(0, offset, 0);
    else if (component.animationType === "spin") {
      const spin = cycle * (amount || 360);
      if (animated.type === "group") {
        const pivot = designGroupCenter(animated.children || []);
        rotateDesignComponentAround(
          animated,
          pivot,
          axis === "x" || axis === "all" ? spin : 0,
          axis === "y" || axis === "all" ? spin : 0,
          axis === "z" || axis === "all" ? spin : 0,
        );
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
      const pivot = animated.type === "group"
        ? designGroupCenter(animated.children || [])
        : designComponentCenter(animated);
      // Legacy pulse animations use the same shape-aware scaler as timeline
      // clips so beams, wheels, roller beds, and nested groups match Designer.
      scaleDesignComponentAround(
        animated,
        pivot,
        axis === "x" || axis === "all" ? factor : 1,
        axis === "y" || axis === "all" ? factor : 1,
        axis === "z" || axis === "all" ? factor : 1,
      );
    } else if (component.animationType === "blink") {
      const factor = sine > -0.15 ? 1 : 0.08;
      if (animated.type === "group") multiplyDesignOpacity(animated, factor);
      else animated.opacity = (Number(animated.opacity) || 1) * factor;
    }
    return animated;
  }

  function designComponentBounds(component) {
    const points = designComponentPoints(component);
    return {
      minX: Math.min(...points.map((point) => point[0])),
      maxX: Math.max(...points.map((point) => point[0])),
      minY: Math.min(...points.map((point) => point[1])),
      maxY: Math.max(...points.map((point) => point[1])),
      minZ: Math.min(...points.map((point) => point[2])),
      maxZ: Math.max(...points.map((point) => point[2])),
    };
  }

  function applyInheritedDesignTransform(component, transform, pivot, includeRenderEffects = false) {
    const rendered = clone(component);
    ["x", "y", "z"].forEach((axis, index) => {
      const factor = Number(transform.scale[index]) || 1;
      if (Math.abs(factor - 1) < .0001) return;
      scaleDesignSelectionTogether(rendered, pivot, factor, axis);
    });
    const inheritedRotationOperations = Array.isArray(transform.rotationOperations) && transform.rotationOperations.length
      ? transform.rotationOperations
      : [{ rotation: transform.rotation || [0, 0, 0], pivotOffset: [0, 0, 0] }];
    inheritedRotationOperations.forEach((operation) => {
      const operationPivot = pivot.map((value, index) => value + (Number(operation.pivotOffset?.[index]) || 0));
      rotateDesignComponentAround(rendered, operationPivot, ...(operation.rotation || [0, 0, 0]));
    });
    translateDesignComponent(rendered, ...transform.translation);
    if (Math.abs(transform.alpha - 1) > .0001) multiplyDesignOpacity(rendered, transform.alpha);
    if (typeof transform.visible === "boolean") rendered.visible = transform.visible;
    if (includeRenderEffects && transform.rectangularSplit) rendered.rectangularSplit = clone(transform.rectangularSplit);
    return rendered;
  }

  function animateDesignComponent(component, time, design) {
    if (component.type !== "group") return animateDesignComponentSelf(component, time, design);
    const children = component.children || [];
    if (!children.length) return animateDesignComponentSelf(component, time, design);
    if (component.embeddedMachine === true) {
      // Embedded machines preserve the source machine's independent child
      // animations. The parent design still supplies the one shared playback
      // clock, and an animation on the wrapper moves the complete machine.
      const animatedMachine = clone(component);
      animatedMachine.children = children.map((child) => (
        child.playOwnAnimation === false ? clone(child) : animateDesignComponent(child, time, design)
      ));
      return animateDesignComponentSelf(animatedMachine, time, design);
    }
    const driver = children.find((child) => child.id === component.motionDriverId)
      || children.find((child) => child.animationTimeline?.enabled !== false && child.animationTimeline?.clips?.some((clip) => clip.enabled !== false))
      || children.find((child) => child.animationEnabled !== false && child.animationType && child.animationType !== "none")
      || children[0];
    const inheritedTransform = designComponentAnimationTransform(driver, time, design);
    const driverPivot = designGroupCenter([driver]);
    const animatedGroup = clone(component);
    animatedGroup.motionDriverId = driver.id;
    animatedGroup.children = children.map((child) => {
      const playsLocalAnimation = child.id !== driver.id && child.playOwnAnimation !== false;
      const ownAnimated = playsLocalAnimation ? animateDesignComponent(child, time, design) : clone(child);
      return applyInheritedDesignTransform(ownAnimated, inheritedTransform, driverPivot, child.id === driver.id);
    });
    return animateDesignComponentSelf(animatedGroup, time, design);
  }

  function scaledComponentBox(machine, component, design) {
    const placement = designPlacement(machine, design);
    const width = Math.max(.02, Number(component.w) * placement.scaleX);
    const depth = Math.max(.02, Number(component.d) * placement.scaleZ);
    const height = Math.max(.02, Number(component.h) * placement.scaleY);
    const localCenter = [
      placement.offsetX + (Number(component.x) + Number(component.w) / 2) * placement.scaleX,
      placement.offsetY + (Number(component.y) + Number(component.h) / 2) * placement.scaleY,
      placement.offsetZ + (Number(component.z) + Number(component.d) / 2) * placement.scaleZ,
    ];
    const worldCenter = localPoint3d(machine, ...localCenter);
    return {
      x: worldCenter[0] - width / 2,
      y: worldCenter[1] - height / 2,
      z: worldCenter[2] - depth / 2,
      w: width,
      d: depth,
      h: height,
      color: component.color || machine.color,
      rotationX: (Number(machine.rotationX) || 0) + (Number(component.rotationX) || 0),
      rotationY: (Number(machine.rotationY ?? machine.rotation) || 0) + (Number.isFinite(Number(component.rotationY)) ? Number(component.rotationY) : Number(component.rotation) || 0),
      rotationZ: (Number(machine.rotationZ) || 0) + (Number(component.rotationZ) || 0),
      rotation: (Number(machine.rotationY ?? machine.rotation) || 0) + (Number.isFinite(Number(component.rotationY)) ? Number(component.rotationY) : Number(component.rotation) || 0),
    };
  }

  function designLocalPointToWorld(machine, design, point, grow = 1) {
    const placement = designPlacement(machine, design);
    return localPoint3d(
      machine,
      placement.offsetX + Number(point[0]) * placement.scaleX,
      placement.offsetY + Number(point[1]) * placement.scaleY * grow,
      placement.offsetZ + Number(point[2]) * placement.scaleZ,
    );
  }

  function drawDesignBox(machine, component, design, alpha, grow = 1) {
    const vertices = designComponentPoints(component).map((point) => designLocalPointToWorld(machine, design, point, grow));
    if (vertices.length < 8) return;
    const faceDefinitions = [
      { indices:[0,1,5,4], fill:shade(component.color || machine.color,-.12) },
      { indices:[1,2,6,5], fill:shade(component.color || machine.color,-.22) },
      { indices:[2,3,7,6], fill:shade(component.color || machine.color,-.18) },
      { indices:[3,0,4,7], fill:shade(component.color || machine.color,-.08) },
      { indices:[3,2,1,0], fill:shade(component.color || machine.color,-.28) },
      { indices:[4,5,6,7], fill:component.color || machine.color, stroke:"rgba(20,30,34,.28)" },
    ];
    faceDefinitions.forEach((face) => polygon(
      face.indices.map((index) => vertices[index]),
      face.fill,
      face.stroke || "rgba(20,30,34,.12)",
      .7,
      alpha,
    ));
  }

  function drawDesignWheel(machine, component, design, alpha, grow = 1) {
    const center = [
      Number(component.x),
      Number(component.y),
      Number(component.z),
    ];
    const radiusX = Math.max(.025, Number(component.w || component.size || 1.2) / 2);
    const radiusY = Math.max(.025, Number(component.h || component.size || 1.2) / 2);
    const halfDepth = Math.max(.02, Number(component.d || component.size * .64 || .75) / 2);
    const rotation = designComponentRotation(component);
    const pointFromWheelSpace = (offset) => {
      // Rotate in source-design coordinates first, then apply the destination
      // machine's placement scale. This is the same transform order used by the
      // Designer and prevents non-uniform Plant Layout scaling from skewing an
      // animated wheel's axis or pivot.
      const rotated = rotateVector3(offset, ...rotation);
      return designLocalPointToWorld(machine, design, [
        center[0] + rotated[0],
        center[1] + rotated[1],
        center[2] + rotated[2],
      ], grow);
    };
    drawCylinder3d({
      radiusX,
      radiusY,
      halfDepth,
      color: component.color || "#20272a",
      alpha,
      pointFromLocal: pointFromWheelSpace,
      segments: 20,
    });
  }

  function designComponentRotation(component) {
    return [
      Number(component.rotationX) || 0,
      Number.isFinite(Number(component.rotationY)) ? Number(component.rotationY) : Number(component.rotation) || 0,
      Number(component.rotationZ) || 0,
    ];
  }

  function rotatedDesignPoint(component, point, center) {
    const offset = [point[0]-center[0], point[1]-center[1], point[2]-center[2]];
    const rotated = rotateVector3(offset, ...designComponentRotation(component));
    return [center[0]+rotated[0], center[1]+rotated[1], center[2]+rotated[2]];
  }

  function designPointToWorld(machine, component, design, point, grow = 1) {
    const placement = designPlacement(machine, design);
    const center = [
      Number(component.x) + Number(component.w || 0) / 2,
      Number(component.y) + Number(component.h || 0) / 2,
      Number(component.z) + Number(component.d || 0) / 2,
    ];
    const rotated = rotatedDesignPoint(component, point, center);
    return localPoint3d(
      machine,
      placement.offsetX + rotated[0] * placement.scaleX,
      placement.offsetY + rotated[1] * placement.scaleY * grow,
      placement.offsetZ + rotated[2] * placement.scaleZ,
    );
  }

  function drawClosedPrism(vertices, color, alpha) {
    const faces = [
      [0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0],[0,1,2,3],[4,7,6,5],
    ];
    const shades = [-.12,-.22,-.18,-.08,-.28,0];
    faces.forEach((indices,index) => polygon(
      indices.map((vertexIndex) => vertices[vertexIndex]),
      shades[index] ? shade(color, shades[index]) : color,
      "rgba(20,30,34,.16)",
      .55,
      alpha,
    ));
  }

  function designBeamSourceFrame(component) {
    const start = [Number(component.x),Number(component.y),Number(component.z)];
    const end = [Number(component.x2),Number(component.y2),Number(component.z2)];
    const direction = [end[0]-start[0],end[1]-start[1],end[2]-start[2]];
    const length = Math.max(.0001,Math.hypot(...direction));
    const forward = direction.map((value)=>value/length);
    const helper = Math.abs(forward[1]) < .88 ? [0,1,0] : [1,0,0];
    let side = [
      forward[1]*helper[2]-forward[2]*helper[1],
      forward[2]*helper[0]-forward[0]*helper[2],
      forward[0]*helper[1]-forward[1]*helper[0],
    ];
    const sideLength = Math.max(.0001,Math.hypot(...side));
    side = side.map((value)=>value/sideLength);
    const up = [
      side[1]*forward[2]-side[2]*forward[1],
      side[2]*forward[0]-side[0]*forward[2],
      side[0]*forward[1]-side[1]*forward[0],
    ];
    return { start, end, forward, side, up };
  }

  function designBeamVertices(component) {
    const center = [
      (Number(component.x)+Number(component.x2))/2,
      (Number(component.y)+Number(component.y2))/2,
      (Number(component.z)+Number(component.z2))/2,
    ];
    const { start, end, side, up } = designBeamSourceFrame(component);
    const halfSide = Math.max(.03,Number(component.thicknessZ || component.thickness || 2)*.08);
    const halfUp = Math.max(.03,Number(component.thicknessY || component.thickness || 2)*.08);
    const corner=(point,sideSign,upSign)=>[
      point[0]+side[0]*halfSide*sideSign+up[0]*halfUp*upSign,
      point[1]+side[1]*halfSide*sideSign+up[1]*halfUp*upSign,
      point[2]+side[2]*halfSide*sideSign+up[2]*halfUp*upSign,
    ];
    return [
      corner(start,-1,-1),corner(start,1,-1),corner(start,1,1),corner(start,-1,1),
      corner(end,-1,-1),corner(end,1,-1),corner(end,1,1),corner(end,-1,1),
    ].map((point)=>rotatedDesignPoint(component,point,center));
  }

  function drawDesignBeam(machine, component, design, alpha, grow) {
    const placement = designPlacement(machine, design);
    const vertices = designBeamVertices(component).map((point)=>localPoint3d(
      machine,
      placement.offsetX + point[0] * placement.scaleX,
      placement.offsetY + point[1] * placement.scaleY * grow,
      placement.offsetZ + point[2] * placement.scaleZ,
    ));
    drawClosedPrism(vertices,component.color || machine.color,alpha);
  }

  function drawDesignCylinder(machine, component, design, alpha, grow, topScale = 1) {
    const count = Math.min(designSegmentCap, renderPerformance.cylinderSegments(component.segments || 20));
    const center = [
      Number(component.x)+Number(component.w)/2,
      Number(component.y)+Number(component.h)/2,      Number(component.z)+Number(component.d)/2,
    ];
    const rings=[];
    for (const layer of [-1,1]) {
      const scale = layer < 0 ? 1 : topScale;
      rings.push(Array.from({length:count},(_,index)=>{
        const angle=index/count*Math.PI*2;
        const point=[
          center[0]+Math.cos(angle)*Number(component.w)/2*scale,
          center[1]+layer*Number(component.h)/2,
          center[2]+Math.sin(angle)*Number(component.d)/2*scale,
        ];
        return designPointToWorld(machine,component,design,point,grow);
      }));
    }
    polygon([...rings[0]].reverse(),shade(component.color,-.22),"rgba(15,25,28,.18)",.5,alpha);
    if (topScale > .001) polygon(rings[1],component.color,"rgba(15,25,28,.18)",.5,alpha);
    for (let index=0;index<count;index+=1) {
      const next=(index+1)%count;
      const sidePoints = topScale > .001
        ? [rings[0][index],rings[0][next],rings[1][next],rings[1][index]]
        : [rings[0][index],rings[0][next],rings[1][index]];
      polygon(sidePoints,shade(component.color,-.08-.15*(.5+.5*Math.cos(index/count*Math.PI*2))),"rgba(15,25,28,.12)",.4,alpha);
    }
  }

  function drawDesignSphere(machine, component, design, alpha, grow) {
    const longitude = Math.max(8, Math.min(designSegmentCap, renderPerformance.cylinderSegments(component.segments || 20)));
    const latitude=Math.max(6,Math.round(longitude/2));
    const center=[Number(component.x)+Number(component.w)/2,Number(component.y)+Number(component.h)/2,Number(component.z)+Number(component.d)/2];
    const rings=[];
    for (let lat=0;lat<=latitude;lat+=1) {
      const phi=-Math.PI/2+lat/latitude*Math.PI;
      rings.push(Array.from({length:longitude},(_,lon)=>{
        const theta=lon/longitude*Math.PI*2;
        return designPointToWorld(machine,component,design,[
          center[0]+Math.cos(phi)*Math.cos(theta)*Number(component.w)/2,
          center[1]+Math.sin(phi)*Number(component.h)/2,
          center[2]+Math.cos(phi)*Math.sin(theta)*Number(component.d)/2,
        ],grow);
      }));
    }
    for (let lat=0;lat<latitude;lat+=1) for (let lon=0;lon<longitude;lon+=1) {
      const next=(lon+1)%longitude;
      polygon([rings[lat][lon],rings[lat][next],rings[lat+1][next],rings[lat+1][lon]],shade(component.color,-.2+.2*(lat+1)/latitude),"rgba(15,25,28,.1)",.3,alpha);
    }
  }

  function drawDesignWedge(machine, component, design, alpha, grow) {
    const x=Number(component.x),y=Number(component.y),z=Number(component.z),w=Number(component.w),h=Number(component.h),d=Number(component.d);
    const points=[
      [x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d],[x,y+h,z],[x,y+h,z+d],
    ].map((point)=>designPointToWorld(machine,component,design,point,grow));
    const faces=[[0,1,2,3],[0,4,1],[3,2,5],[0,3,5,4],[1,4,5,2]];
    const shades=[-.24,-.1,-.2,0,-.14];
    faces.forEach((indices,index)=>polygon(indices.map((vertexIndex)=>points[vertexIndex]),shades[index]?shade(component.color,shades[index]):component.color,"rgba(15,25,28,.16)",.5,alpha));
  }

  function designRollerFrame(component, index, count) {
    const safeCount = Math.max(2, Math.round(Number(count) || Number(component.count) || 2));
    const ratio = safeCount === 1 ? 0 : clamp(Number(index) || 0, 0, safeCount - 1) / (safeCount - 1);
    const localCenter = [
      Number(component.x) + Number(component.w) * ratio,
      Number(component.y),
      Number(component.z) + Number(component.d) / 2,
    ];
    return {
      center: rotatedDesignPoint(component, localCenter, designComponentCenter(component)),
      rotation: designComponentRotation(component),
      radius: Math.max(.05, Number(component.thickness) / 2 || .75),
      halfDepth: Math.max(.05, Number(component.d) / 2),
    };
  }

  const staticVisibleDesignComponentsCache = new WeakMap();
  const animatedVisibleDesignComponentsCache = new WeakMap();
  const designRenderPartitionCache = new WeakMap();
  let designSegmentCap = Infinity;

  function designRenderPartition(design) {
    if (designRenderPartitionCache.has(design)) return designRenderPartitionCache.get(design);
    const stationary = [];
    const moving = [];
    for (const component of design.components || []) {
      if (component.visible === false) continue;
      (designContainsAnimation([component]) ? moving : stationary).push(component);
    }
    const result = { stationary: stationary.flatMap(rectangularSplitDesignComponents), moving };
    designRenderPartitionCache.set(design, result);
    return result;
  }

  function sampledMovingComponents(design, time) {
    // Three bounded distance bands share samples between copies of a design.
    let samples = animatedVisibleDesignComponentsCache.get(design);
    if (!samples) {
      samples = new Map();
      animatedVisibleDesignComponentsCache.set(design, samples);
    }
    const key = `${time}:${state.editing}:${state.previewObjectAnimations}:${state.animationsPaused}:${state.animationTimeOffset}`;
    if (samples.has(key)) return samples.get(key);
    const parts = designRenderPartition(design).moving
      .map((component) => animateDesignComponent(component, time, design))
      .flatMap(rectangularSplitDesignComponents)
      .filter((component) => component.visible !== false);
    if (samples.size >= 4) samples.delete(samples.keys().next().value);
    samples.set(key, parts);
    return parts;
  }

  function visibleDesignComponents(design, time) {
    if (designHasAnimation(design)) {
      return [...designRenderPartition(design).stationary, ...sampledMovingComponents(design, time)];
    }
    if (!staticVisibleDesignComponentsCache.has(design)) {
      staticVisibleDesignComponentsCache.set(design, design.components
        .filter((component) => component.visible !== false)
        .flatMap(rectangularSplitDesignComponents)
        .filter((component) => component.visible !== false));
    }
    return staticVisibleDesignComponentsCache.get(design);
  }

  function representativeDesignComponents(components, maximum = 16) {
    if (!Array.isArray(components) || components.length <= maximum) return components || [];
    const chosen = new Set();
    const semanticTypes = ["glassPanel", "wheel", "text", "rollerBed", "wedge"];
    semanticTypes.forEach((type) => {
      const first = components.findIndex((component) => component.type === type);
      if (first >= 0 && chosen.size < 4) chosen.add(first);
    });
    const evenlySpacedCount = Math.max(2, maximum - chosen.size);
    for (let index = 0; index < evenlySpacedCount; index += 1) {
      chosen.add(Math.round(index * (components.length - 1) / Math.max(1, evenlySpacedCount - 1)));
    }
    for (let index = 0; chosen.size < maximum && index < components.length; index += 1) chosen.add(index);
    return [...chosen]
      .sort((first, second) => first - second)
      .slice(0, maximum)
      .map((index) => components[index]);
  }

  function drawCustomDesign(machine, alpha, grow, time, lodLevel = 3, componentsOverride = null, segmentCap = machineCurveSegments(machine)) {
    const design = machine.designId ? designLibrary[machine.designId] : null;
    if (!design || !Array.isArray(design.components)) return false;
    const previousOutlineSuppression = suppressGeometryOutlines;
    const previousSegmentCap = designSegmentCap;
    designSegmentCap = segmentCap;
    suppressGeometryOutlines = previousOutlineSuppression || (
      !state.editing
      && !state.selectedMachineIds.has(machine.instanceId)
      && designRenderPartCount(design) > 4
    );
    const visibleComponents = componentsOverride || visibleDesignComponents(design, time);
    // Distance detail reduces curve tessellation, not the machine's parts.
    const renderComponents = lodLevel >= 2 ? visibleComponents : representativeDesignComponents(visibleComponents);
    try {
      renderComponents.forEach((component) => {
      if (combatController?.isActive?.() && carrierGlassComponent(machine,component) && combatController.isGlassShattered?.(machine.instanceId,component.id)) return;
      const componentAlpha = alpha * clamp(Number(component.opacity ?? 1), 0, 1);
      if (component.type === "box" || component.type === "glassPanel" || component.type === "text") {
        drawDesignBox(machine, component, design, componentAlpha, grow);
      } else if (component.type === "cylinder") {
        drawDesignCylinder(machine,component,design,componentAlpha,grow,1);
      } else if (component.type === "sphere") {
        drawDesignSphere(machine,component,design,componentAlpha,grow);
      } else if (component.type === "cone") {
        drawDesignCylinder(machine,component,design,componentAlpha,grow,0);
      } else if (component.type === "wedge") {
        drawDesignWedge(machine,component,design,componentAlpha,grow);
      } else if (component.type === "beam") {
        drawDesignBeam(machine,component,design,componentAlpha,grow);
      } else if (component.type === "rollerBed") {
        const count = Math.max(2, Math.round(Number(component.count) || 10));
        for (let index = 0; index < count; index += 1) {
          // Match the Designer exactly: both the roller center and its cross-
          // section rotate around the roller-bed assembly center.
          const { center, rotation, radius, halfDepth } = designRollerFrame(component, index, count);
          drawCylinder3d({
            radiusX: radius,
            radiusY: radius,
            halfDepth,
            color: component.color || "#c7d0cd",
            alpha: componentAlpha,
            segments: 6,
            minimumSegments: 6,
            outline: false,
            pointFromLocal: (offset) => {
              const rotated = rotateVector3(offset, ...rotation);
              return designLocalPointToWorld(machine, design, [
                center[0] + rotated[0],
                center[1] + rotated[1],
                center[2] + rotated[2],
              ], grow);
            },
          });
        }
      } else if (component.type === "wheel") {
        drawDesignWheel(machine, component, design, componentAlpha, grow);
      }
      });
    } catch (error) {
      console.error(`Custom machine ${machine.instanceId || machine.name || "unknown"} could not be drawn; using its safe layout envelope instead.`, error);
      return false;
    } finally {
      suppressGeometryOutlines = previousOutlineSuppression;
      designSegmentCap = previousSegmentCap;
    }
    return true;
  }

  let projectedBoundsCache = new WeakMap();
  let detailedDesignDecisionCache = new WeakMap();
  let detailedMachineDecisionCache = new WeakMap();
  let machineLodDecisionCache = new WeakMap();
  const designPartCountCache = new WeakMap();
  let detailedPartBudgetRemaining = Number.POSITIVE_INFINITY;
  let detailedMachineBudgetRemaining = Number.POSITIVE_INFINITY;
  let visibleColumnEntriesCache = null;
  const renderObjectIds = new WeakMap();
  let nextRenderObjectId = 1;

  function objectRenderIdentity(value) {
    if (!value || typeof value !== "object") return "";
    if (!renderObjectIds.has(value)) renderObjectIds.set(value, nextRenderObjectId++);
    return renderObjectIds.get(value);
  }

  function componentRenderPartCount(component) {
    if (!component || component.visible === false) return 0;
    if (component.type === "group") {
      return (component.children || []).reduce((total, child) => total + componentRenderPartCount(child), 0);
    }
    if (component.type === "rollerBed") return Math.max(2, Math.round(Number(component.count) || 10));
    return 1;
  }

  function designRenderPartCount(design) {
    if (!design || typeof design !== "object") return 0;
    const prepared = window.plantGeometryPrep?.get(design);
    if (prepared && Number.isFinite(Number(prepared.partCount))) return Number(prepared.partCount);
    if (!designPartCountCache.has(design)) {
      designPartCountCache.set(design, (design.components || []).reduce(
        (total, component) => total + componentRenderPartCount(component),
        0,
      ));
    }
    return designPartCountCache.get(design);
  }

  function firstPersonDistanceToBox(item) {
    if (state.cameraMode !== "walk") return 0;
    const cameraX = modelCenter()[0] + state.panX;
    const cameraZ = modelCenter()[1] + state.panZ;
    const width = Math.max(.01, Number(item.w) || .01);
    const depth = Math.max(.01, Number(item.d) || .01);
    const centerX = (Number(item.x) || 0) + width / 2;
    const centerZ = (Number(item.z) || 0) + depth / 2;
    // A rotation-invariant bounding circle is conservative: a long machine is
    // never discarded merely because its rotated end extends beyond its saved
    // axis-aligned envelope.
    return Math.max(0, Math.hypot(cameraX - centerX, cameraZ - centerZ) - Math.hypot(width, depth) / 2);
  }

  function projectedBoxMetrics(item) {
    if (item && typeof item === "object" && projectedBoundsCache.has(item)) return projectedBoundsCache.get(item);
    const x = Number(item.x) || 0;
    const y = Number(item.renderY ?? item.y) || 0;
    const z = Number(item.z) || 0;
    const width = Math.max(.01, Number(item.w) || .01);
    const depth = Math.max(.01, Number(item.d) || .01);
    const height = Math.max(.01, Number(item.h) || .01);
    const centerPoint = project(x + width / 2, y + height / 2, z + depth / 2);
    const groundCorners = footprint(item, 0, 0).map(([sampleX,,sampleZ]) => [sampleX, sampleZ]);
    const samples = [y, y + height].flatMap((sampleY) => (
      groundCorners.map(([sampleX, sampleZ]) => project(sampleX, sampleY, sampleZ))
    ));
    const visibleSamples = state.cameraMode === "walk"
      ? samples.filter((point) => point[3] >= WALK_NEAR_CLIP)
      : samples;
    const xs = visibleSamples.map((point) => point[0]);
    const ys = visibleSamples.map((point) => point[1]);
    const metrics = {
      centerPoint,
      visibleSamples,
      span: visibleSamples.length
        ? Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
        : 0,
    };
    if (item && typeof item === "object") projectedBoundsCache.set(item, metrics);
    return metrics;
  }

  function projectedPixelSpan(item) {
    return projectedBoxMetrics(item).span;
  }

  function machineLodLevel(machine) {
    if (!machine || typeof machine !== "object") return 3;
    if (machineLodDecisionCache.has(machine)) return machineLodDecisionCache.get(machine);
    if (state.selectedMachineIds.has(machine.instanceId)) {
      machineLodDecisionCache.set(machine, 3);
      return 3;
    }
    const threshold = Math.max(4, renderPerformance.detailPixelThreshold());
    const span = projectedPixelSpan(machine);
    const score = span / threshold;
    const boundaries = [0, .55, 1.25, 3];
    let level = score >= boundaries[3] ? 3 : score >= boundaries[2] ? 2 : score >= boundaries[1] ? 1 : 0;
    if (isFloorFeatureType(machine.type)) level = Math.min(2, Math.max(1, level));
    // Orbit views always show every visible machine component, even at the
    // farthest zoom. Lower detail levels remain available to first-person
    // distance culling and compact floor features only.
    const minimumOverviewLevel = state.cameraMode !== "walk" && !isFloorFeatureType(machine.type) ? 3 : 0;
    level = Math.max(level, minimumOverviewLevel);
    if (state.cameraMode === "walk") {
      const distance = firstPersonDistanceToBox(machine);
      const nearDistance = renderPerformance.walkDetailDistance();
      const farDistance = nearDistance * 1.8;
      const band = Math.max(8, nearDistance * WALK_LOD_HYSTERESIS_RATIO);
      const previous = walkLodHistory.get(machine.instanceId);
      let walkLevel = distance > farDistance ? 1 : distance > nearDistance ? 2 : 3;
      if (previous === 3 && distance <= nearDistance + band) walkLevel = 3;
      else if (previous === 2) {
        if (distance < nearDistance - band) walkLevel = 3;
        else if (distance <= farDistance + band) walkLevel = 2;
      } else if (previous === 1 && distance >= farDistance - band) walkLevel = 1;
      level = walkLevel;
      walkLodHistory.set(machine.instanceId, level);
    }
    // Every submitted machine keeps recognizable geometry. Offscreen and
    // behind-camera equipment is still culled before drawing; exhausting the
    // per-frame budget must not turn visible machines into solid boxes.
    if (!isFloorFeatureType(machine.type)) level = Math.max(2, level);
    if (level >= 2 && detailedMachineBudgetRemaining > 0) detailedMachineBudgetRemaining -= 1;
    machineLodDecisionCache.set(machine, level);
    return level;
  }

  function shouldDrawDetailedMachine(machine) {
    if (!machine || typeof machine !== "object") return true;
    if (detailedMachineDecisionCache.has(machine)) return detailedMachineDecisionCache.get(machine);
    if (isFloorFeatureType(machine.type) || state.selectedMachineIds.has(machine.instanceId)) {
      detailedMachineDecisionCache.set(machine, true);
      return true;
    }
    const detailed = machineLodLevel(machine) >= 2;
    detailedMachineDecisionCache.set(machine, detailed);
    return detailed;
  }

  function shouldDrawDetailedCustomDesign(machine, design) {
    if (machine && typeof machine === "object" && detailedDesignDecisionCache.has(machine)) {
      return detailedDesignDecisionCache.get(machine);
    }
    if (!design || !Array.isArray(design.components)) return true;
    if (machineLodLevel(machine) < 3) {
      detailedDesignDecisionCache.set(machine, false);
      return false;
    }
    const selected = state.selectedMachineIds.has(machine.instanceId);
    const partCount = designRenderPartCount(design);
    if (selected) {
      detailedDesignDecisionCache.set(machine, true);
      return true;
    }
    let detailed = partCount <= 4;
    if (state.cameraMode === "walk" && firstPersonDistanceToBox(machine) > renderPerformance.walkDetailDistance()) {
      detailed = projectedPixelSpan(machine) >= renderPerformance.detailPixelThreshold() * 1.75;
    } else if (!detailed) detailed = projectedPixelSpan(machine) >= renderPerformance.detailPixelThreshold();
    if (detailed && partCount > detailedPartBudgetRemaining) detailed = false;
    if (detailed) detailedPartBudgetRemaining = Math.max(0, detailedPartBudgetRemaining - partCount);
    if (machine && typeof machine === "object") detailedDesignDecisionCache.set(machine, detailed);
    return detailed;
  }

  function combatEnemyPoseParent(machine, combat) {
    const death = clamp(Number(combat?.deathProgress) || 0, 0, 1);
    const roll = clamp(Number(combat?.rollProgress) || 0, 0, 1);
    if (death <= .001 && roll <= .001) return machine;
    if (death <= .001 && roll > .001) {
      const direction = Number(combat?.rollDirection) < 0 ? -1 : 1;
      const arc = Math.sin(roll*Math.PI);
      return {
        ...machine,
        renderY: Number(machine.renderY ?? machine.y) + arc*.52,
        rotationY: Number(machine.rotationY ?? machine.rotation) || 0,
        rotation: Number(machine.rotationY ?? machine.rotation) || 0,
        rotationZ: (Number(machine.rotationZ)||0) + direction*roll*360,
      };
    }
    const eased = 1 - Math.pow(1 - death, 3);
    const direction = Number(combat?.deathDirection) < 0 ? -1 : 1;
    const deathPushX = Number(combat?.deathPushX) || 0;
    const deathPushZ = Number(combat?.deathPushZ) || 0;
    const width = Math.max(.01, Number(machine.w) || 1.8);
    const depth = Math.max(.01, Number(machine.d) || 1.8);
    const height = Math.max(.01, Number(machine.h) || 6.5);
    const rotationX = (Number(machine.rotationX) || 0) + direction * eased * 86;
    const rotationY = Number(machine.rotationY ?? machine.rotation) || 0;
    const rotationZ = Number(machine.rotationZ) || 0;
    const baseY = Number(machine.renderY ?? machine.y) || 0;
    const pivot = [Number(machine.x) + width / 2 + deathPushX * eased, baseY + eased * .28, Number(machine.z) + depth / 2 + deathPushZ * eased];
    const footOffset = rotateVector3([0, -height / 2, 0], rotationX, rotationY, rotationZ);
    const center = [pivot[0] - footOffset[0], pivot[1] - footOffset[1], pivot[2] - footOffset[2]];
    return {
      ...machine,
      x: center[0] - width / 2,
      renderY: center[1] - height / 2,
      z: center[2] - depth / 2,
      rotationX,
      rotationY,
      rotation: rotationY,
      rotationZ,
    };
  }

  function drawCombatEnemy(machine, alpha, grow, time) {
    const combat = machine.combatState || {};
    const actor = combatEnemyPoseParent(machine, combat);
    const width = Math.max(1.4, Number(actor.w) || 1.8);
    const depth = Math.max(1.2, Number(actor.d) || 1.8);
    const height = Math.max(5.5, Number(actor.h) || 6.5) * grow;
    const movement = combat.defeated ? 0 : clamp(Number(combat.movementBlend) || 0, 0, 1);
    const phase = Number(combat.walkPhase) || time * .008;
    const zombieGait = combat.zombie ? String(combat.gaitClass||"walker") : "combat";
    const gaitStride = combat.zombie ? Number(combat.gaitStride)||.53 : .55;
    const gaitSwing = combat.zombie ? Number(combat.gaitSwing)||.4 : .45;
    const gaitBob = combat.zombie ? Number(combat.gaitBob)||.11 : .12;
    const gaitLean = combat.zombie ? Number(combat.gaitLean)||0 : 0;
    const stride = Math.sin(phase) * gaitStride * movement;
    const liftLeft = Math.max(0, Math.sin(phase)) * gaitBob * 1.5 * movement;
    const liftRight = Math.max(0, Math.sin(phase + Math.PI)) * gaitBob * 1.5 * movement;
    const hit = clamp(Number(combat.hitReact) || 0, 0, 1);
    const zombiePreset = combat.zombie ? designLibrary["combat-zombie-"+zombieGait] : null;
    const design = zombiePreset || (machine.designId ? designLibrary[machine.designId] : null);
    const designParts = Array.isArray(design?.components) ? design.components : [];
    const namedPart = (pattern) => designParts.find((part) => pattern.test(String(part?.name || "")));
    const zombie = Boolean(combat.zombie);
    const bodyColor = zombie ? (combat.giant ? "#755348" : "#465744") : (namedPart(/torso/i)?.color || machine.color || "#1e7b78");
    const skin = zombie ? (combat.giant ? "#96ad72" : "#839b68") : (namedPart(/head/i)?.color || "#e6b993");
    const pants = zombie ? "#2a332d" : (namedPart(/(?:left|right) leg/i)?.color || "#26363d");
    const boot = "#161d21";
    const weapon = "#20282d";
    const weaponLight = "#4b5960";
    const vest = namedPart(/hard hat/i)?.color || "#e3ad28";

    // Keep each custom person's torso/head/hair/hat/accessories instead of
    // replacing every named employee with one generic combat body. Arms and
    // legs are omitted here because the articulated combat limbs below own them.
    if (design && ["person","combatzombie"].includes(String(design.machineType || "").toLowerCase())) {
      const staticIdentityParts = designParts.filter((part) => !/(?:left|right)\s+(?:arm|leg)/i.test(String(part?.name || "")) && !/(?:eye|pupil)/i.test(String(part?.name||"")));
      if (staticIdentityParts.length) {
        drawCustomDesign(actor, alpha, grow, time, 3, staticIdentityParts, machineCurveSegments(actor));
      }
    } else {
      box(localBox3d(actor,width*.25,depth*.24,width*.5,depth*.52,height*.34,bodyColor,height*.4),alpha,1);
      box(localBox3d(actor,width*.2,depth*.17,width*.6,depth*.12,height*.18,vest,height*.5),alpha*.96,1);
      box(localBox3d(actor,width*.32,depth*.3,width*.36,depth*.38,height*.14,skin,height*.75),alpha,1);
      box(localBox3d(actor,width*.25,depth*.23,width*.5,depth*.52,height*.05,vest,height*.88),alpha,1);
    }

    // Zombie treatment is applied to the actual rendered head volume, not to a
    // flat mask guessed from the person's overall bounds. The largest named
    // Head box is selected, re-tinted in-place, then large protruding eyes are
    // placed just in front of that box so they stay visible on custom models.
    const headCandidates = designParts.filter((part) => /^head$/i.test(String(part?.name || ""))
      && ["x","y","z","w","h","d"].every((key) => Number.isFinite(Number(part?.[key]))));
    const headPart = headCandidates.sort((a,b) => (Number(b.w)*Number(b.h)*Number(b.d)) - (Number(a.w)*Number(a.h)*Number(a.d)))[0] || null;
    const eyeWhite = zombie ? "#f7e76f" : "#f5f6f2";
    const pupil = zombie ? "#b31318" : "#172228";
    if (design && headPart) {
      const hx=Number(headPart.x), hy=Number(headPart.y), hz=Number(headPart.z);
      const hw=Math.max(.05,Number(headPart.w)), hh=Math.max(.05,Number(headPart.h)), hd=Math.max(.05,Number(headPart.d));
      const eyeD=Math.max(.055,hd*.075);
      const inheritedRotation={
        rotationX:Number(headPart.rotationX)||0,
        rotationY:Number.isFinite(Number(headPart.rotationY))?Number(headPart.rotationY):(Number(headPart.rotation)||0),
        rotationZ:Number(headPart.rotationZ)||0,
      };
      if (zombie) drawDesignBox(actor,{...headPart,color:skin},design,alpha*.995,grow);
      // Eye decals are attached to the model's upper head in actor-space below,
      // not to Designer component coordinates that can be scaled/offset into a neck.
      // Keep the custom head texture and scars, but render the eyes once for all actors.
      if (zombie) {
        const faceFront=hz-eyeD*.92;
        const woundA=[
          designLocalPointToWorld(actor,design,[hx+hw*.12,hy+hh*.39,faceFront],grow),
          designLocalPointToWorld(actor,design,[hx+hw*.43,hy+hh*.20,faceFront-eyeD*.18],grow),
        ];
        const woundB=[
          designLocalPointToWorld(actor,design,[hx+hw*.84,hy+hh*.36,faceFront],grow),
          designLocalPointToWorld(actor,design,[hx+hw*.64,hy+hh*.15,faceFront-eyeD*.14],grow),
        ];
        line3d(woundA[0],woundA[1],"#681d20",2.7,alpha*.9);
        line3d(woundB[0],woundB[1],"#4b2523",2.5,alpha*.82);
      }
    } else {
      // Built-in/fallback people get a complete green head cube plus large
      // protruding eyes so Zombie Mode remains readable without a design.
      const headX=width*.32, headY=height*.73, headZ=depth*.30, headW=width*.36, headH=height*.14, headD=depth*.38;
      if (zombie) box(localBox3d(actor,headX,headZ,headW,headD,headH,skin,headY),alpha*.995,1);
      // Same upper-face coordinates are used for generic and custom characters.
    }

    // Use head-local coordinates instead of absolute actor height: older
    // employee models put their head lower/higher than the generic fallback.
    // Custom eye anchors follow the selected model's actual head bounds and
    // rotate with the head part, preventing eyes inside the neck or mouth.
    if (design && headPart) {
      const anchors=design.combatAnchors||{};
      const minFront=Number(headPart.z)-Math.max(.05,Number(headPart.d)*.11);
      const eyeSize=Math.max(.07,Number(headPart.w)*.105);
      const eyeH=Math.max(.08,Number(headPart.h)*.15);
      const eyeD=Math.max(.07,Number(headPart.d)*.105);
      for(const [side,fraction] of [["left",.24],["right",.65]]) {
        const saved=anchors[side+"Eye"];
        const px=Number.isFinite(Number(saved?.x))?Number(saved.x):Number(headPart.x)+Number(headPart.w)*fraction;
        const py=Number.isFinite(Number(saved?.y))?Number(saved.y):Number(headPart.y)+Number(headPart.h)*.74;
        const pz=Number.isFinite(Number(saved?.z))?Number(saved.z):minFront;
        const shape={x:px,y:py,z:pz,w:eyeSize,h:eyeH,d:eyeD,color:eyeWhite,
          rotationX:Number(headPart.rotationX)||0,rotationY:Number(headPart.rotationY)||0,
          rotationZ:Number(headPart.rotationZ)||0};
        drawDesignBox(actor,shape,design,alpha,grow);
        drawDesignBox(actor,{...shape,x:px+eyeSize*.32,y:py+eyeH*.12,z:pz-eyeD*.42,
          w:eyeSize*.38,h:eyeH*.72,d:eyeD*.55,color:pupil},design,alpha,grow);
      }
    } else {
      const fallbackHead={x:width*.32,y:height*.73,z:depth*.30,w:width*.36,h:height*.14,d:depth*.38};
      const eyeY=fallbackHead.y+fallbackHead.h*.74;
      const eyeZ=fallbackHead.z-Math.max(.05,fallbackHead.d*.12);
      [fallbackHead.x+fallbackHead.w*.18,fallbackHead.x+fallbackHead.w*.65].forEach(eyeX=>{
        const eyeWidth=fallbackHead.w*.18,eyeHeight=fallbackHead.h*.20,eyeDepth=.11;
        box(localBox3d(actor,eyeX,eyeZ,eyeWidth,eyeDepth,eyeHeight,eyeWhite,eyeY),alpha,1);
        box(localBox3d(actor,eyeX+eyeWidth*.32,eyeZ-.052,eyeWidth*.36,.07,eyeHeight*.65,pupil,eyeY+eyeHeight*.12),alpha,1);
      });
    }

    // Two-segment legs create an actual walking gait instead of sliding feet.
    const hipY = height * .43;
    const kneeY = height * .22;
    const leftHip = [width*.38, hipY, depth*.5];
    const rightHip = [width*.62, hipY, depth*.5];
    const leftKnee = [width*.35, kneeY + liftLeft*.45, depth*.5 + stride*.48];
    const rightKnee = [width*.65, kneeY + liftRight*.45, depth*.5 - stride*.48];
    const leftFoot = [width*.3, .12 + liftLeft, depth*.5 + stride];
    const rightFoot = [width*.7, .12 + liftRight, depth*.5 - stride];
    // Shamblers drag their feet with little lift; runners and sprinters pump
    // knees much higher, and giants use a deliberately heavy stomping cadence.
    if (combat.zombie) {
      const sway=Math.sin(phase*.5)*gaitSwing*movement;
      const bounce=Math.abs(Math.cos(phase))*gaitBob*movement;
      leftKnee[1]+=bounce*.14;rightKnee[1]+=bounce*.14;
      if(zombieGait==="sprinter"||zombieGait==="runner"){
        const frontLean=gaitLean*Math.PI/180;
        // Lean is applied through shoulder pose, not actor world orientation,
        // to preserve stable headshot geometry and network hit volumes.
        leftFoot[2]+=Math.sin(frontLean)*.25;
        rightFoot[2]+=Math.sin(frontLean)*.25;
      }
      leftKnee[0]-=sway*.06;rightKnee[0]+=sway*.06;
    }
    localLine3d(actor,leftHip,leftKnee,pants,3.4,alpha);
    localLine3d(actor,leftKnee,leftFoot,pants,3.1,alpha);
    localLine3d(actor,rightHip,rightKnee,pants,3.4,alpha);
    localLine3d(actor,rightKnee,rightFoot,pants,3.1,alpha);
    box(localBox3d(actor,leftFoot[0]-.18,leftFoot[2]-.34,.42,.7,.2,boot,leftFoot[1]-.1),alpha,1);
    box(localBox3d(actor,rightFoot[0]-.18,rightFoot[2]-.34,.42,.7,.2,boot,rightFoot[1]-.1),alpha,1);

    // Torso/head identity is rendered above; the articulated combat limbs and
    // weapon below share the same actor transform so rotation and death stay aligned.

    const enemyWeapon = String(combat.weaponKey || "rifle");
    const shotProgress = clamp(Number(combat.shotProgress) || 0, 0, 1);
    const reloadProgress = clamp(Number(combat.reloadProgress) || 0, 0, 1);
    const shotPulse = combat.firing ? Math.sin(Math.PI * shotProgress) : 0;
    const reloadWave = combat.reloading ? Math.sin(Math.PI * reloadProgress) : 0;
    const meleeLunge = enemyWeapon === "chainsaw" ? shotPulse : 0;
    const recoil = (combat.recoil ? .10 : 0) + shotPulse * (enemyWeapon === "sniper" ? .28 : (enemyWeapon === "rocket" || enemyWeapon === "bazooka") ? .34 : .18);
    const shoulderY = height*.68;
    const gripY = height*.58 - recoil*.68 - reloadWave*.12;
    const gripZ = -.08;
    const weaponCenterX = width*.72;
    const supportX = width*.58;
    const leftShoulder = [width*.28,shoulderY,depth*.48];
    const rightShoulder = [width*.72,shoulderY,depth*.48];
    const supportReloadBack = (enemyWeapon === "rocket" || enemyWeapon === "bazooka") ? 1.02 : .42;
    const supportReloadDown = (enemyWeapon === "rocket" || enemyWeapon === "bazooka") ? .18 : .50;
    const leftGrip = [
      supportX - hit*.05 + reloadWave*width*.10,
      gripY-.035-supportReloadDown*reloadWave,
      -.72+supportReloadBack*reloadWave,
    ];
    const rightGrip = [weaponCenterX + hit*.045,gripY+.025,gripZ + meleeLunge*.08];

    // Both arms reach a real right-hand weapon. During enemy reloads the
    // support hand visibly leaves the fore-end and reaches toward the magazine
    // or launcher breech; firing adds a short recoil/lunge pose instead of only
    // flashing the muzzle.
    localLine3d(actor,leftShoulder,leftGrip,bodyColor,3.6,alpha);
    localLine3d(actor,rightShoulder,rightGrip,bodyColor,3.6,alpha);

    const reloadTilt = combat.reloading
      ? reloadWave * ((enemyWeapon === "rocket" || enemyWeapon === "bazooka") ? .19 : enemyWeapon === "sniper" ? .12 : .085)
      : 0;
    const reloadDrop = combat.reloading
      ? -reloadWave * ((enemyWeapon === "rocket" || enemyWeapon === "bazooka") ? .42 : .18)
      : 0;
    const weaponZKick = shotPulse*.22 - meleeLunge*.72;
    const weaponPoint = (x,y,z) => [x, y + reloadDrop + z*reloadTilt, z + weaponZKick];
    const weaponBox = (centerX, centerZ, w, d, h, color, centerY) => {
      const posed = weaponPoint(centerX, centerY, centerZ);
      box(localBox3d(actor,posed[0]-w/2,posed[2]-d/2,w,d,h,color,posed[1]-h/2),alpha,1);
    };
    const weaponLine = (from,to,color=weapon,thickness=5,opacity=alpha) => {
      localLine3d(actor,weaponPoint(from[0],from[1],from[2]),weaponPoint(to[0],to[1],to[2]),color,thickness,opacity);
    };
    const barrel = (fromZ,toZ,color=weapon,thickness=7,y=gripY+.025,x=weaponCenterX) => {
      weaponLine([x,y,fromZ],[x,y,toZ],color,thickness,alpha);
    };
    const magazineDrop = combat.reloading && !["rocket","bazooka","chainsaw"].includes(enemyWeapon)
      ? reloadWave * (enemyWeapon === "sniper" ? .72 : .88)
      : 0;
    let weaponMuzzleX = weaponCenterX;
    let weaponMuzzleY = gripY+.025;
    let weaponMuzzleZ = -2.42;

    // The same editable Combat Weapon geometry drives enemy-held firearms.
    // Local +X on the asset becomes forward (-Z) for the character.
    const enemyModel=designLibrary["combat-weapon-"+(enemyWeapon==="bazooka"?"rocket":enemyWeapon)];
    if(enemyModel?.machineType==="combatWeapon" && enemyModel.components?.length) {
      const base=enemyModel.base||{},bw=Math.max(.2,Number(base.w)||4);
      const bd=Math.max(.2,Number(base.d)||1.25),bh=Math.max(.2,Number(base.h)||1.65);
      const barrelLength=enemyWeapon==="sniper"?3.5:enemyWeapon==="chainsaw"?2.1:2.8;
      for(const component of enemyModel.components) {
        if(component.type!=="box"||component.visible===false)continue;
        const px=weaponCenterX+((Number(component.z)||0)+(Number(component.d)||0)/2-bd/2)*width*.37/bd;
        const py=gripY+((Number(component.y)||0)+(Number(component.h)||0)/2-bh/2)*height*.18/bh;
        const pz=-(Number(component.x)||0)*barrelLength/bw-.12;
        const ww=Math.max(.04,(Number(component.d)||.1)*width*.37/bd);
        const dd=Math.max(.04,(Number(component.w)||.1)*barrelLength/bw);
        const hh=Math.max(.04,(Number(component.h)||.1)*height*.18/bh);
        const posed=weaponPoint(px,py,pz);
        box(localBox3d(actor,posed[0]-ww/2,posed[2]-dd/2,ww,dd,hh,component.color||weapon,posed[1]-hh/2),alpha,1);
      }
      const anchor=enemyModel.combatAnchors?.hipMuzzle || {x:bw,y:bh*.52,z:bd*.5};
      weaponMuzzleX=weaponCenterX+(Number(anchor.z)-bd*.5)*width*.37/bd;
      weaponMuzzleY=gripY+(Number(anchor.y)-bh*.5)*height*.18/bh;
      weaponMuzzleZ=-Number(anchor.x)*barrelLength/bw-.12;
    } else if (enemyWeapon === "chainsaw") {
      // Heavy layered motor housing + thick guide bar + moving chain teeth.
      weaponMuzzleX = weaponCenterX;
      weaponMuzzleY = gripY-.02;
      weaponBox(weaponCenterX,-.32,width*.62,.88,.66,"#b83f2c",gripY-.04);
      weaponBox(weaponCenterX+width*.04,-.30,width*.44,.58,.38,"#e1603e",gripY+.08);
      weaponBox(weaponCenterX-width*.10,-.18,width*.18,.40,.46,"#252c2f",gripY-.03);
      weaponBox(weaponCenterX+width*.18,-.36,width*.15,.36,.34,"#171d20",gripY+.03);
      weaponBox(weaponCenterX,-1.52,width*.31,1.92,.25,"#bcc5c5",gripY-.04);
      weaponBox(weaponCenterX,-1.56,width*.20,1.98,.11,"#444e52",gripY-.025);
      weaponLine([weaponCenterX-width*.27,gripY+.34,-.12],[weaponCenterX+width*.21,gripY+.62,-.44],"#1a2023",7.2);
      weaponLine([weaponCenterX+width*.21,gripY+.62,-.44],[weaponCenterX+width*.30,gripY+.20,-.78],"#1a2023",7.2);
      weaponLine([weaponCenterX-width*.26,gripY+.17,.10],[weaponCenterX-width*.31,gripY-.18,-.25],"#171d20",6.8);
      const chainOffset = (time * .0018) % .16;
      for (let tooth=0; tooth<12; tooth+=1) {
        const z=-.68-((tooth*.16+chainOffset)%1.90);
        const side = tooth % 2 === 0 ? -1 : 1;
        weaponLine([weaponCenterX+side*width*.105,gripY+.08,z],[weaponCenterX+side*width*.15,gripY+.15,z-.075],"#f0c75c",2.25);
        weaponLine([weaponCenterX-side*width*.105,gripY-.14,z],[weaponCenterX-side*width*.15,gripY-.20,z-.075],"#d8a941",2.0);
      }
      weaponMuzzleZ=-2.58;
    } else if (enemyWeapon === "bazooka") {
      weaponBox(weaponCenterX,-1.04,width*.52,2.70,.60,"#48614e",gripY+.08);
      weaponBox(weaponCenterX,.32,width*.64,.48,.72,"#2d4033",gripY+.08);
      weaponBox(weaponCenterX,-2.46,width*.64,.42,.70,"#9aa99d",gripY+.08);
      weaponBox(weaponCenterX,-.48,width*.18,1.60,.78,"#334a3a",gripY+.08);
      weaponBox(weaponCenterX+width*.08,-.20,width*.20,.38,.68,"#172019",gripY-.42);
      weaponBox(weaponCenterX-width*.12,-.54,width*.18,.36,.26,"#111a15",gripY+.53);
      barrel(-.30,-2.82,"#273b2e",15,gripY+.08);
      weaponMuzzleY=gripY+.08;
      weaponMuzzleZ=-2.82;
    } else if (enemyWeapon === "rocket") {
      // Large shoulder-fired launcher built from multiple 3D collars, rails,
      // grips and a rear exhaust section so it reads as a weapon from every angle.
      weaponBox(weaponCenterX,-1.12,width*.68,3.10,.82,"#354b3d",gripY+.12);
      weaponBox(weaponCenterX,-1.12,width*.76,2.34,.56,"#4d6754",gripY+.12);
      weaponBox(weaponCenterX,.46,width*.82,.56,.94,"#23352a",gripY+.12);
      weaponBox(weaponCenterX,-2.74,width*.80,.56,.92,"#6f8574",gripY+.12);
      weaponBox(weaponCenterX,-3.08,width*.58,.34,.66,"#b7c4b8",gripY+.12);
      weaponBox(weaponCenterX,-1.10,width*.17,2.46,.98,"#26392e",gripY+.12);
      weaponBox(weaponCenterX,-1.10,width*.78,.24,.18,"#94a78f",gripY+.59);
      weaponBox(weaponCenterX+width*.11,-.48,width*.22,.42,.78,"#18231c",gripY-.42);
      weaponBox(weaponCenterX-width*.15,-.58,width*.20,.48,.30,"#101812",gripY+.60);
      weaponBox(weaponCenterX+width*.05,-1.46,width*.22,.52,.24,"#111a15",gripY+.60);
      barrel(.22,-3.30,"#17241c",18,gripY+.12);
      weaponLine([weaponCenterX-width*.25,gripY+.13,.50],[weaponCenterX-width*.34,gripY+.13,.94],"#d49b48",6.4);
      if (combat.reloading) {
        const insert = clamp((reloadProgress-.38)/.48,0,1);
        weaponBox(weaponCenterX-width*.04,.96-insert*.82,width*.44,.72,.48,"#707f69",gripY+.12-reloadWave*.22);
      }
      weaponMuzzleY=gripY+.12;
      weaponMuzzleZ=-3.30;
    } else if (enemyWeapon === "sniper") {
      weaponBox(weaponCenterX,.48,width*.50,.92,.54,"#29353a",gripY-.01);
      weaponBox(weaponCenterX,.70,width*.60,.34,.64,"#1e282d",gripY-.01);
      weaponBox(weaponCenterX,-.34,width*.58,.94,.48,"#20292e",gripY-.01);
      weaponBox(weaponCenterX,-1.12,width*.46,1.04,.36,"#46565d",gripY+.02);
      weaponBox(weaponCenterX+.02,-.30,width*.22,.34,.74,"#151c20",gripY-.49);
      weaponBox(weaponCenterX+.01,-.30,width*.24,.34,.66,"#1b2529",gripY-.70-magazineDrop);
      barrel(-.78,-3.22,weapon,7.2,gripY+.06);
      barrel(-3.02,-3.54,"#151d21",10.0,gripY+.06);
      weaponBox(weaponCenterX,-.54,width*.34,1.22,.26,"#0e1519",gripY+.42);
      weaponBox(weaponCenterX,-.54,width*.23,1.34,.20,"#63747c",gripY+.44);
      weaponBox(weaponCenterX,-.12,width*.37,.12,.35,"#171f23",gripY+.44);
      weaponBox(weaponCenterX,-.95,width*.37,.12,.35,"#171f23",gripY+.44);
      weaponBox(weaponCenterX,-.54,width*.13,1.42,.12,"#b5bec2",gripY+.45);
      weaponLine([weaponCenterX-width*.15,gripY-.02,-1.62],[weaponCenterX-width*.34,gripY-.64,-2.02],"#20292d",3.4);
      weaponLine([weaponCenterX+width*.15,gripY-.02,-1.62],[weaponCenterX+width*.34,gripY-.64,-2.02],"#20292d",3.4);
      weaponMuzzleY=gripY+.06;
      weaponMuzzleZ=-3.54;
    } else if (enemyWeapon === "shotgun") {
      weaponBox(weaponCenterX,.30,width*.42,.70,.46,"#553923",gripY-.03);
      weaponBox(weaponCenterX,-.34,width*.52,.78,.42,weapon,gripY-.01);
      weaponBox(weaponCenterX,-1.05,width*.42,.92,.36,"#6b4a2e",gripY+.01);
      barrel(-.72,-2.44,"#20282d",8.2,gripY+.05);
      barrel(-.72,-2.44,"#5a6468",3.3,gripY+.12,weaponCenterX+width*.06);
      weaponMuzzleY=gripY+.05;
      weaponMuzzleZ=-2.44;
    } else if (enemyWeapon === "smg") {
      weaponBox(weaponCenterX,.15,width*.38,.62,.42,"#2a3439",gripY-.03);
      weaponBox(weaponCenterX,-.38,width*.52,.76,.46,weapon,gripY-.02);
      weaponBox(weaponCenterX,-.86,width*.38,.52,.35,weaponLight,gripY+.02);
      weaponBox(weaponCenterX+.02,-.28,width*.20,.30,.70,"#151c20",gripY-.49-magazineDrop);
      barrel(-.62,-1.70,weapon,7.0,gripY+.04);
      weaponMuzzleY=gripY+.04;
      weaponMuzzleZ=-1.70;
    } else if (enemyWeapon === "pistol") {
      weaponBox(weaponCenterX,-.40,width*.38,.80,.30,weapon,gripY+.03);
      weaponBox(weaponCenterX,-.31,width*.22,.32,.60,"#171f22",gripY-.39-magazineDrop*.45);
      weaponBox(weaponCenterX,-.44,width*.30,.58,.09,"#748087",gripY+.20);
      barrel(-.62,-1.36,weapon,5.8,gripY+.06);
      weaponMuzzleY=gripY+.06;
      weaponMuzzleZ=-1.36;
    } else {
      // Full 3D service rifle: thick butt stock, layered receiver, handguard,
      // pistol grip, detachable curved magazine, top rail, holo optic and muzzle brake.
      weaponBox(weaponCenterX,.54,width*.54,.90,.58,"#29343a",gripY-.04);
      weaponBox(weaponCenterX,.78,width*.62,.30,.44,"#1b2428",gripY-.04);
      weaponBox(weaponCenterX,-.24,width*.62,.98,.52,weapon,gripY-.02);
      weaponBox(weaponCenterX,-.82,width*.54,.58,.44,"#37464d",gripY+.00);
      weaponBox(weaponCenterX,-1.22,width*.48,.62,.40,weaponLight,gripY+.01);
      weaponBox(weaponCenterX+.02,-.22,width*.22,.36,.78,"#151d21",gripY-.52);
      weaponBox(weaponCenterX+.02,-.28,width*.24,.38,.64,"#1a2226",gripY-.78-magazineDrop);
      weaponBox(weaponCenterX+.02,-.42,width*.25,.34,.58,"#202a2f",gripY-.98-magazineDrop*.92);
      weaponBox(weaponCenterX,-.48,width*.38,.80,.13,"#10181c",gripY+.34);
      weaponBox(weaponCenterX,-.46,width*.25,.40,.30,"#27343a",gripY+.49);
      weaponBox(weaponCenterX,-.46,width*.15,.50,.18,"#7d8b91",gripY+.51);
      weaponBox(weaponCenterX,-1.15,width*.58,.12,.12,"#929da2",gripY+.25);
      barrel(-.88,-2.42,weapon,8.0,gripY+.05);
      barrel(-2.24,-2.72,"#151c20",10.0,gripY+.05);
      weaponBox(weaponCenterX,-2.64,width*.28,.28,.24,"#20292d",gripY+.05);
      weaponLine([weaponCenterX-width*.20,gripY+.05,-2.72],[weaponCenterX-width*.28,gripY+.05,-2.91],"#353f44",3.4);
      weaponLine([weaponCenterX+width*.20,gripY+.05,-2.72],[weaponCenterX+width*.28,gripY+.05,-2.91],"#353f44",3.4);
      weaponMuzzleY=gripY+.05;
      weaponMuzzleZ=-2.91;
    }

    const posedMuzzle = weaponPoint(weaponMuzzleX,weaponMuzzleY,weaponMuzzleZ);
    weaponMuzzleX = posedMuzzle[0];
    weaponMuzzleY = posedMuzzle[1];
    weaponMuzzleZ = posedMuzzle[2];
    const muzzle = localPoint3d(actor,weaponMuzzleX,weaponMuzzleY,weaponMuzzleZ);
    if (combat.muzzleFlash && enemyWeapon !== "chainsaw") {
      const flashLength = (enemyWeapon === "bazooka" || enemyWeapon === "rocket") ? 1.55 : 1.05;
      localLine3d(actor,[weaponMuzzleX,weaponMuzzleY,weaponMuzzleZ],[weaponMuzzleX,weaponMuzzleY,weaponMuzzleZ-flashLength],(enemyWeapon === "bazooka" || enemyWeapon === "rocket") ? "#ff7c32" : "#ffd26c",(enemyWeapon === "bazooka" || enemyWeapon === "rocket") ? 13 : 9,alpha);
      localLine3d(actor,[weaponMuzzleX-.28,weaponMuzzleY,weaponMuzzleZ-.48],[weaponMuzzleX+.28,weaponMuzzleY,weaponMuzzleZ-.48],"#fff3bc",6,alpha);
      localLine3d(actor,[weaponMuzzleX,weaponMuzzleY-.28,weaponMuzzleZ-.48],[weaponMuzzleX,weaponMuzzleY+.32,weaponMuzzleZ-.48],"#ff9140",6,alpha);
    }
    if (combat.tracerTarget) {
      const target = [Number(combat.tracerTarget.x), Number(combat.tracerTarget.y), Number(combat.tracerTarget.z)];
      const tracerStyle = String(combat.tracerStyle || "rifle");
      const glow = tracerStyle === "sniper" ? "rgba(120,211,255,.36)" : (tracerStyle === "bazooka" || tracerStyle === "rocket") ? "rgba(255,89,24,.42)" : "rgba(255,116,38,.28)";
      const core = tracerStyle === "sniper" ? "rgba(197,241,255,.98)" : (tracerStyle === "bazooka" || tracerStyle === "rocket") ? "rgba(255,210,106,.98)" : "rgba(255,231,151,.98)";
      line3d(muzzle,target,glow,(tracerStyle === "bazooka" || tracerStyle === "rocket") ? 9 : 5.8,alpha*.58);
      line3d(muzzle,target,core,(tracerStyle === "bazooka" || tracerStyle === "rocket") ? 2.8 : 1.65,alpha*.98);
    }
    if (combat.allyOutline) {
      const outlineItem={...actor,x:Number(actor.x)-.11,y:Number(actor.renderY ?? actor.y)-.06,z:Number(actor.z)-.11,w:width+.22,d:depth+.22,h:height+.28};
      const vertices=boxVertices3d(outlineItem,1);
      const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      edges.forEach(([from,to]) => overlayLine3d(vertices[from],vertices[to],"rgba(72,183,255,.96)",3.4,alpha*.95));
    }
    if (combat.killerReveal) {
      const outlineItem = {
        ...actor,
        x: Number(actor.x) - .14,
        y: Number(actor.renderY ?? actor.y) - .08,
        z: Number(actor.z) - .14,
        w: width + .28,
        d: depth + .28,
        h: height + .34,
      };
      const vertices = boxVertices3d(outlineItem, 1);
      const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      edges.forEach(([from,to]) => overlayLine3d(vertices[from],vertices[to],"rgba(255,48,42,.98)",4.2,alpha));
      const name = String(combat.killerName || machine.name || "Enemy");
      const labelPoint = project(...localPoint3d(actor,width*.5,height+1.35,depth*.5));
      if (labelPoint[0] > -240 && labelPoint[0] < canvas.width + 240 && labelPoint[1] > -100 && labelPoint[1] < canvas.height + 100) {
        const pixelScale = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
        ctx.save();
        ctx.font = `800 ${Math.max(13,15*pixelScale)}px "Segoe UI", sans-serif`;
        const labelWidth = ctx.measureText(name).width + 22*pixelScale;
        const labelHeight = 28*pixelScale;
        const left = labelPoint[0] - labelWidth/2;
        const top = labelPoint[1] - labelHeight/2;
        ctx.fillStyle = "rgba(45,5,7,.94)";
        ctx.strokeStyle = "rgba(255,56,48,.98)";
        ctx.lineWidth = Math.max(2,2.2*pixelScale);
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(left,top,labelWidth,labelHeight,7*pixelScale);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(left,top,labelWidth,labelHeight);
          ctx.strokeRect(left,top,labelWidth,labelHeight);
        }
        ctx.fillStyle = "#fff4f2";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name,labelPoint[0],labelPoint[1]+.5*pixelScale);
        ctx.restore();
      }
    }
  }

  function drawCombatKillerOverlay(time) {
    if (!combatController?.isActive?.()) return;
    for (const machine of combatEnemyMachines()) {
      if (!combatEnemyMachine(machine) || machine.visible === false) continue;
      const combat = combatController.enemyRenderState?.(machine.instanceId, time);
      if (!combat?.killerReveal) continue;
      let rendered = machineHasLayoutMotion(machine) ? animatedMachine(machine, time) : machine;
      rendered = {
        ...rendered,
        x: Number(combat.x),
        z: Number(combat.z),
        rotationY: Number(combat.rotationY),
        rotation: Number(combat.rotationY),
        combatState: combat,
      };
      const actor = combatEnemyPoseParent(rendered, combat);
      const width = Math.max(1.4, Number(actor.w) || 1.8);
      const depth = Math.max(1.2, Number(actor.d) || 1.8);
      const height = Math.max(5.5, Number(actor.h) || 6.5);
      const outlineItem = {
        ...actor,
        x: Number(actor.x) - .16,
        y: Number(actor.renderY ?? actor.y) - .08,
        z: Number(actor.z) - .16,
        w: width + .32,
        d: depth + .32,
        h: height + .38,
      };
      const vertices = boxVertices3d(outlineItem, 1);
      const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      edges.forEach(([from,to]) => overlayLine3d(vertices[from],vertices[to],"rgba(255,38,34,.98)",4.6,1));

      const name = String(combat.killerName || machine.name || "Enemy");
      const labelPoint = project(...localPoint3d(actor,width*.5,height+1.4,depth*.5));
      if (labelPoint[0] < -240 || labelPoint[0] > canvas.width + 240 || labelPoint[1] < -100 || labelPoint[1] > canvas.height + 100) continue;
      const pixelScale = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
      ctx.save();
      ctx.font = `800 ${Math.max(13,15*pixelScale)}px "Segoe UI", sans-serif`;
      const labelWidth = ctx.measureText(name).width + 24*pixelScale;
      const labelHeight = 30*pixelScale;
      const left = labelPoint[0] - labelWidth/2;
      const top = labelPoint[1] - labelHeight/2;
      ctx.fillStyle = "rgba(50,4,7,.96)";
      ctx.strokeStyle = "rgba(255,52,45,1)";
      ctx.lineWidth = Math.max(2,2.4*pixelScale);
      ctx.shadowColor = "rgba(255,35,30,.72)";
      ctx.shadowBlur = 16*pixelScale;
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(left,top,labelWidth,labelHeight,7*pixelScale);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(left,top,labelWidth,labelHeight);
        ctx.strokeRect(left,top,labelWidth,labelHeight);
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff6f4";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name,labelPoint[0],labelPoint[1]+.5*pixelScale);
      ctx.restore();
    }
  }

  function viewmodelProject(point) {
    const depth = Math.max(.18, Number(point[2]) || .18);
    const fov = 61 * Math.PI / 180;
    const focal = canvas.height / Math.max(.1, 2 * Math.tan(fov / 2));
    return [canvas.width/2 + Number(point[0]) * focal / depth, canvas.height/2 - Number(point[1]) * focal / depth, depth];
  }

  function viewmodelPoint(point, root) {
    const rotated = rotateVector3(point, root.rotationX, root.rotationY, root.rotationZ);
    return [rotated[0] + root.x, rotated[1] + root.y, rotated[2] + root.z];
  }

  function drawViewmodelPolygon(points, fill, stroke = "rgba(255,255,255,.08)", alpha = 1) {
    const projected = points.map(viewmodelProject);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    projected.forEach((point,index) => index ? ctx.lineTo(point[0],point[1]) : ctx.moveTo(point[0],point[1]));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, canvas.width/1100); ctx.stroke(); }
    ctx.restore();
  }

  function drawViewmodelBox(spec, root, alpha = 1) {
    const width = Number(spec.w), height = Number(spec.h), depth = Number(spec.d);
    const center = [Number(spec.x),Number(spec.y),Number(spec.z)];
    const local = [
      [-width/2,-height/2,-depth/2],[width/2,-height/2,-depth/2],[width/2,-height/2,depth/2],[-width/2,-height/2,depth/2],
      [-width/2,height/2,-depth/2],[width/2,height/2,-depth/2],[width/2,height/2,depth/2],[-width/2,height/2,depth/2],
    ].map((offset) => {
      const part = rotateVector3(offset, spec.rotationX||0, spec.rotationY||0, spec.rotationZ||0);
      return viewmodelPoint([center[0]+part[0],center[1]+part[1],center[2]+part[2]],root);
    });
    const faces = [
      {i:[0,1,5,4],c:shade(spec.color,-.08)},{i:[1,2,6,5],c:shade(spec.color,-.22)},
      {i:[2,3,7,6],c:shade(spec.color,-.14)},{i:[3,0,4,7],c:shade(spec.color,-.03)},
      {i:[3,2,1,0],c:shade(spec.color,-.28)},{i:[4,5,6,7],c:spec.color},
    ].map((face) => ({...face,points:face.i.map((index)=>local[index])}));
    faces.sort((a,b) => b.points.reduce((sum,p)=>sum+p[2],0) - a.points.reduce((sum,p)=>sum+p[2],0));
    faces.forEach((face)=>drawViewmodelPolygon(face.points,face.c,"rgba(8,14,17,.22)",alpha));
  }

  const remotePlayerVisuals = new Map();
  const ALLY_LABEL_FADE_DISTANCE = 78;
  const ALLY_OUTLINE_DISTANCE = 118;
  const ALLY_LABEL_HIDE_DISTANCE = 150;

  function smoothRemotePlayerState(player, time) {
    const target=player?.state || {};
    const id=String(player?.id || "remote");
    let visual=remotePlayerVisuals.get(id);
    const targetX=Number(target.x), targetZ=Number(target.z), targetYaw=Number(target.yaw)||0;
    if (!Number.isFinite(targetX) || !Number.isFinite(targetZ)) return target;
    if (!visual) {
      visual={x:targetX,z:targetZ,yaw:targetYaw,targetX,targetZ,targetYaw,lastTargetAt:time,lastFrameAt:time,vx:Number(target.vx)||0,vz:Number(target.vz)||0};
      remotePlayerVisuals.set(id,visual);
    }
    if (targetX !== visual.targetX || targetZ !== visual.targetZ || targetYaw !== visual.targetYaw) {
      const elapsed=Math.max(.016,(time-visual.lastTargetAt)/1000);
      visual.vx=Number.isFinite(Number(target.vx)) ? Number(target.vx) : clamp((targetX-visual.targetX)/elapsed,-28,28);
      visual.vz=Number.isFinite(Number(target.vz)) ? Number(target.vz) : clamp((targetZ-visual.targetZ)/elapsed,-28,28);
      visual.targetX=targetX; visual.targetZ=targetZ; visual.targetYaw=targetYaw; visual.lastTargetAt=time;
    }
    const frameDt=clamp((time-visual.lastFrameAt)/1000,0,0.08);
    visual.lastFrameAt=time;
    const age=clamp((time-visual.lastTargetAt)/1000,0,.24);
    const predict=target.moving === false ? 0 : age;
    const desiredX=visual.targetX+visual.vx*predict, desiredZ=visual.targetZ+visual.vz*predict;
    const gap=Math.hypot(desiredX-visual.x,desiredZ-visual.z);
    const blend=gap>16 ? 1 : 1-Math.exp(-Math.max(.001,frameDt)*13);
    visual.x+=(desiredX-visual.x)*blend; visual.z+=(desiredZ-visual.z)*blend;
    let yawDelta=((visual.targetYaw-visual.yaw+Math.PI)%(Math.PI*2))-Math.PI;
    visual.yaw+=yawDelta*Math.min(1,blend*1.35);
    return {...target,x:visual.x,z:visual.z,yaw:visual.yaw};
  }

  function remotePlayerDistance(playerState) {
    const cameraX=modelCenter()[0]+state.panX, cameraZ=modelCenter()[1]+state.panZ;
    return Math.hypot(Number(playerState.x)-cameraX,Number(playerState.z)-cameraZ);
  }

  function drawCombatRemotePlayers(time) {
    if (!combatController?.isActive?.()) return;
    const lobby=combatController.multiplayerLobby?.();
    if (!lobby || lobby.status !== "started") return;
    for (const player of combatController.remotePlayers?.() || []) {
      const playerState=smoothRemotePlayerState(player,time);
      if (!Number.isFinite(Number(playerState.x)) || !Number.isFinite(Number(playerState.z))) continue;
      const allyDistance=remotePlayerDistance(playerState);
      const template=machines.find((machine,index) => String(machine.instanceId || machine.id || machine.name || `enemy-${index}`) === String(player.characterId || ""))
        || combatBaseEnemyMachines()[0];
      if (!template) continue;
      const width=Math.max(1.4,Number(template.w)||1.8),depth=Math.max(1.2,Number(template.d)||1.8);
      const rendered={
        ...template,
        instanceId:`remote-player:${player.id}`,
        name:player.name || "Teammate",
        x:Number(playerState.x)-width/2,
        z:Number(playerState.z)-depth/2,
        y:Number(template.y)||0,
        rotationY:180-(Number(playerState.yaw)||0)*180/Math.PI,
        rotation:180-(Number(playerState.yaw)||0)*180/Math.PI,
        combatState:{
          zombie:lobby.config?.mode === "zombie" && lobby.config?.matchType !== "private",
          movementBlend:playerState.moving ? 1 : .08,
          walkPhase:time*.008 + (String(player.id||"").length%7)*.71,
          weaponKey:playerState.weapon === "handgun" ? "pistol" : (playerState.weapon || "rifle"),
          shotProgress:0,reloadProgress:0,firing:false,muzzleFlash:false,recoil:false,hitReact:0,defeated:playerState.alive === false,deathProgress:playerState.alive === false ? 1 : 0,
          health:Number(playerState.health ?? 100),
          allyOutline:lobby.config?.matchType === "coop" && allyDistance >= ALLY_OUTLINE_DISTANCE,
        },
      };
      drawCombatEnemy(rendered,1,1,time);
    }
  }

  function drawCombatRemotePlayerLabels(time) {
    if (!combatController?.isActive?.()) return;
    const lobby=combatController.multiplayerLobby?.();
    if (!lobby || lobby.status !== "started") return;
    const pixelScale=canvas.width/Math.max(1,canvas.getBoundingClientRect().width);
    for (const player of combatController.remotePlayers?.() || []) {
      const playerState=smoothRemotePlayerState(player,time);
      if (!Number.isFinite(Number(playerState.x)) || !Number.isFinite(Number(playerState.z))) continue;
      const allyDistance=remotePlayerDistance(playerState);
      if (lobby.config?.matchType === "coop" && allyDistance >= ALLY_LABEL_HIDE_DISTANCE) continue;
      const template=machines.find((machine,index) => String(machine.instanceId || machine.id || machine.name || `enemy-${index}`) === String(player.characterId || ""));
      const characterName=String(template?.name || template?.short || "Plant character");
      const point=project(Number(playerState.x),Number(playerState.y || 5.5)+1.25,Number(playerState.z));
      if (point[0] < -260 || point[0] > canvas.width+260 || point[1] < -120 || point[1] > canvas.height+120) continue;
      const playerName=String(player.name || "Player");
      const distanceScale=lobby.config?.matchType === "coop" ? clamp(1-(Math.max(0,allyDistance-28)/122)*.5,.5,1) : 1;
      const labelAlpha=lobby.config?.matchType === "coop" ? clamp((ALLY_LABEL_HIDE_DISTANCE-allyDistance)/(ALLY_LABEL_HIDE_DISTANCE-ALLY_LABEL_FADE_DISTANCE),0,1) : 1;
      ctx.save();
      ctx.globalAlpha=labelAlpha;
      ctx.font=`800 ${Math.max(9,14*pixelScale*distanceScale)}px "Segoe UI", sans-serif`;
      const primaryWidth=ctx.measureText(playerName).width;
      ctx.font=`650 ${Math.max(7,10.5*pixelScale*distanceScale)}px "Segoe UI", sans-serif`;
      const secondary=`${characterName}`;
      const secondaryWidth=ctx.measureText(secondary).width;
      const width=Math.max(primaryWidth,secondaryWidth)+24*pixelScale*distanceScale;
      const height=42*pixelScale*distanceScale;
      const left=point[0]-width/2, top=point[1]-height/2;
      ctx.fillStyle="rgba(5,18,24,.88)";
      ctx.strokeStyle=lobby.config?.matchType === "private" ? "rgba(255,103,91,.9)" : "rgba(112,217,255,.88)";
      ctx.lineWidth=Math.max(1.4,1.7*pixelScale);
      ctx.shadowColor="rgba(0,0,0,.42)";
      ctx.shadowBlur=10*pixelScale;
      if (typeof ctx.roundRect === "function") { ctx.beginPath();ctx.roundRect(left,top,width,height,8*pixelScale);ctx.fill();ctx.stroke(); }
      else { ctx.fillRect(left,top,width,height);ctx.strokeRect(left,top,width,height); }
      ctx.shadowBlur=0;
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle="#f6fcff";ctx.font=`800 ${Math.max(9,14*pixelScale*distanceScale)}px "Segoe UI", sans-serif`;
      ctx.fillText(playerName,point[0],point[1]-7*pixelScale);
      ctx.fillStyle="rgba(205,231,241,.72)";ctx.font=`650 ${Math.max(7,10.5*pixelScale*distanceScale)}px "Segoe UI", sans-serif`;
      ctx.fillText(characterName,point[0],point[1]+10*pixelScale);
      ctx.restore();
    }
  }

  const COMBAT_EXPLOSION_VISUAL_SCALE = 3;
  const COMBAT_GLASS_SHATTER_VISUAL_SCALE = 3;

  function drawCombatWorldEffects(time) {
    if (!combatController?.isActive?.()) return;
    const effects = combatController.combatEffects?.(time);
    if (!effects) return;
    const lerpPoint = (from,to,t) => [
      Number(from.x) + (Number(to.x)-Number(from.x))*t,
      Number(from.y) + (Number(to.y)-Number(from.y))*t,
      Number(from.z) + (Number(to.z)-Number(from.z))*t,
    ];
    const impactBasis = (normal) => {
      const nx=Math.abs(Number(normal?.x)||0), ny=Math.abs(Number(normal?.y)||0), nz=Math.abs(Number(normal?.z)||0);
      if (ny >= nx && ny >= nz) return [[1,0,0],[0,0,1]];
      if (nx >= nz) return [[0,1,0],[0,0,1]];
      return [[1,0,0],[0,1,0]];
    };

    // Survival stations use real 3D geometry, not a billboard. The Mystery
    // Box is wide enough for a full-sized long gun and keeps the roll display
    // visible from a first-person approach.
    for (const station of effects.stations || []) {
      const health=station.type==="health";
      const x=Number(station.x),z=Number(station.z);
      if (!Number.isFinite(x)||!Number.isFinite(z)) continue;
      const pulse=.74+.26*Math.sin(time*.006);
      const body=health?"#23433f":"#29203e";
      const accent=health?"#62f1c8":"#e4a8fa";
      const width=health?3.1:5.4;
      const depth=health?2.1:3.0;
      const frontZ=z-depth*.5;
      box({x:x-width*.5,y:.15,z:frontZ,w:width,h:2.12,d:depth,color:"#11171e",rotationY:0},.99,1);
      box({x:x-width*.5+.14,y:.38,z:frontZ-.05,w:width-.28,h:1.64,d:.22,color:body,rotationY:0},.96,1);
      box({x:x-width*.5+.12,y:2.18,z:frontZ-.10,w:width-.24,h:.32,d:depth+.18,color:health?"#a6e6cd":"#5f447e",rotationY:0},1,1);
      box({x:x-width*.5+.34,y:2.55,z:frontZ+.18,w:width-.68,h:.19,d:depth-.36,color:health?"#85d1b7":"#aa78d9",rotationY:0},.85,1);
      if (!health) {
        // Three recessed glowing reel windows along the wide front.
        for (let i=0;i<3;i++) {
          const reelX=x-2.04+i*1.37;
          box({x:reelX,y:1.13,z:frontZ-.16,w:1.25,h:.75,d:.13,color:"#0a0d1b",rotationY:0},1,1);
          box({x:reelX+.09,y:1.22,z:frontZ-.22,w:1.06,h:.53,d:.09,color:i===1?"#7748af":"#39294e",rotationY:0},i===1?pulse:.9,1);
        }
        line3d([x-2.13,1.07,frontZ-.28],[x+2.13,1.07,frontZ-.28],"rgba(235,181,255,.9)",2.6,pulse);
        const offer=station.offer;
        if (offer) {
          const rolling=offer.phase==="rolling";
          const isReturning=offer.phase==="lowering";
          const raise=Math.max(0,Math.min(1,Number(offer.rise)||0));
          const bob=(offer.phase==="ready"?Math.sin(time*.0034)*.11:0);
          const weaponY=2.92+raise*2.65+bob;
          const weaponKey=String(offer.weaponKey||"rifle");
          const mysteryWeaponDesign=designLibrary["combat-weapon-"+weaponKey];
          if (mysteryWeaponDesign?.components?.length) {
            const base=mysteryWeaponDesign.base||{},ww=Math.max(.2,Number(base.w)||4);
            const hh=Math.max(.2,Number(base.h)||1.65),dd=Math.max(.2,Number(base.d)||1.25);
            drawCustomDesign({id:"mystery-display-"+weaponKey,instanceId:"mystery-display-"+weaponKey,
              type:"combatWeapon",designId:mysteryWeaponDesign.id,
              x:x-ww/2,y:weaponY-hh*.52,z:z-dd/2,w:ww,h:hh,d:dd,
              color:"#d5dce6",rotationY:0},1,1,time,3,mysteryWeaponDesign.components,12);
          } else {
                    const pistol=/pistol|revolver/i.test(weaponKey);
          const rocket=/rocket/i.test(weaponKey);
          const sniper=/sniper|dmr/i.test(weaponKey);
          const shotgun=/shotgun/i.test(weaponKey);
          const lmg=/lmg/i.test(weaponKey);
          const longGun=!pistol;
          const length=pistol?2.0:rocket?4.0:sniper?4.55:lmg?4.25:3.9;
          const left=x-length*.5;
          const tone=rolling?"#d2a1fb":isReturning?"#776a83":"#d7e4ed";
          // Barrel points to +X. Receiver, grip, stock, optic, magazine and
          // muzzle are recognizable silhouette parts for every prize category.
          box({x:left+.68,y:weaponY,z:z-.32,w:pistol?.9:1.65,h:.48,d:.62,color:tone,rotationY:0},1,1);
          box({x:left+(pistol?1.52:2.25),y:weaponY+.18,z:z-.17,w:pistol?.45:rocket?1.5:sniper?1.85:1.43,h:rocket?.37:.23,d:rocket?.47:.25,color:rocket?"#798a96":"#a0b1b9",rotationY:0},1,1);
          box({x:left+.89,y:weaponY-.68,z:z-.23,w:.34,h:.84,d:.35,color:"#1e252e",rotationY:0},1,1);
          if (longGun) {
            box({x:left+.06,y:weaponY-.12,z:z-.26,w:.74,h:.38,d:.5,color:"#2a303d",rotationY:0},1,1);
            box({x:left+1.46,y:weaponY-.45,z:z-.24,w:.45,h:.59,d:.38,color:shotgun?"#6a4730":"#2a303d",rotationY:0},1,1);
            box({x:left+1.13,y:weaponY+.5,z:z-.22,w:sniper?.9:.56,h:.22,d:.34,color:"#161f2a",rotationY:0},1,1);
            if (lmg) box({x:left+1.65,y:weaponY-.6,z:z-.27,w:.9,h:.42,d:.47,color:"#58616b",rotationY:0},1,1);
          }
          if (rocket) box({x:left+2.5,y:weaponY+.08,z:z-.36,w:1.05,h:.46,d:.62,color:"#c07e32",rotationY:0},.96,1);
          }
          const haloRadius=1.25+raise*.75;
          const ring=[];
          for(let i=0;i<22;i++) {const angle=i*Math.PI/11;ring.push([x+Math.cos(angle)*haloRadius,weaponY-.75,z+Math.sin(angle)*.82]);}
          polygon(ring,"rgba(166,105,242,.055)","rgba(236,171,255,.64)",1.7,.55+pulse*.32,{transparent:true});
          // The reel text changes alongside the physical prize model, slows to
          // the chosen gun, then says TAKE before dropping back through the lid.
          const reelPoint=project(x,2.0,frontZ-.26);
          if (Number.isFinite(reelPoint?.[0]) && Number.isFinite(reelPoint?.[1]) && reelPoint[3]>0) {
            const scale=canvas.width/Math.max(1,canvas.getBoundingClientRect().width);
            ctx.save();
            ctx.textAlign="center";ctx.textBaseline="middle";
            ctx.font=`900 ${Math.max(12,14*scale)}px "Segoe UI",sans-serif`;
            const ticker=rolling ? "◀ "+String(offer.weaponName||"WEAPON").toUpperCase()+" ▶" : String(offer.finalWeaponName||"WEAPON").toUpperCase();
            ctx.strokeStyle="rgba(7,7,17,.96)";ctx.lineWidth=3.5*scale;
            ctx.strokeText(ticker,reelPoint[0],reelPoint[1]);
            ctx.fillStyle=rolling?"#f0c6ff":isReturning?"#b4a3c7":"#ffeaa8";
            ctx.fillText(ticker,reelPoint[0],reelPoint[1]);
            ctx.restore();
          }
        }
      } else {
        box({x:x-.58,y:1.24,z:frontZ-.12,w:1.16,h:.26,d:.13,color:"#a7ffe5",rotationY:0},1,1);
        box({x:x-.13,y:.85,z:frontZ-.15,w:.26,h:1.04,d:.16,color:"#a7ffe5",rotationY:0},1,1);
      }
      const radius=health?3.4:4.0;
      const floorRing=[];
      for(let i=0;i<24;i++) {const angle=i/24*Math.PI*2;floorRing.push([x+Math.cos(angle)*radius,.07,z+Math.sin(angle)*radius]);}
      polygon(floorRing,health?"rgba(77,223,171,.045)":"rgba(164,108,248,.06)",health?"rgba(99,248,189,.62)":"rgba(220,165,255,.72)",1.5,pulse,{transparent:true});
      const labelY=health?3.95:station.offer?.phase==="ready"?7.2:5.1;
      const textPoint=project(x,labelY,z);
      if (Number.isFinite(textPoint?.[0]) && Number.isFinite(textPoint?.[1]) && textPoint[3]>0) {
        const scale=canvas.width/Math.max(1,canvas.getBoundingClientRect().width);
        const offer=station.offer;
        const label=health?"HEALTH STATION · 800 PTS":!offer?"MYSTERY BOX · 950 PTS":
          offer.phase==="rolling"?"MYSTERY BOX · ROLLING":
          offer.phase==="rising"?"YOUR WEAPON IS RISING":
          offer.phase==="ready"?"PRESS E TO TAKE · "+String(offer.remainingSeconds)+"S":
          "WEAPON RETURNING";
        ctx.save();
        ctx.font=`800 ${Math.max(11,12*scale)}px "Segoe UI",sans-serif`;
        ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.strokeStyle="rgba(10,18,25,.92)";ctx.lineWidth=3*scale;
        ctx.strokeText(label,textPoint[0],textPoint[1]);
        ctx.fillStyle=health?"#a4ffe1":"#ffe0a2";
        ctx.fillText(label,textPoint[0],textPoint[1]);
        ctx.restore();
      }
    }

    for (const pickup of effects.pickups || []) {
      if (!pickup.active) continue;
      const pulse=.5+.5*Math.sin(time*.005 + Number(String(pickup.id||"").replace(/\D/g,""))*.7);
      const hover=.18+Math.sin(time*.003 + pulse)*.08;
      const crate={x:Number(pickup.x)-.62,y:Number(pickup.y)+hover,z:Number(pickup.z)-.48,w:1.24,h:.72,d:.96,color:"#d6a72f",rotationY:0};
      box(crate,.98,1);
      const y=crate.y+crate.h+.045;
      line3d([pickup.x-.34,y,pickup.z],[pickup.x+.34,y,pickup.z],"rgba(255,245,182,.98)",5.2,1);
      line3d([pickup.x,y,pickup.z-.34],[pickup.x,y,pickup.z+.34],"rgba(255,245,182,.98)",5.2,1);
      const ring=[];
      const radius=1.05+pulse*.22;
      for(let i=0;i<18;i++){const a=i/18*Math.PI*2;ring.push([pickup.x+Math.cos(a)*radius,.055,pickup.z+Math.sin(a)*radius]);}
      polygon(ring,"rgba(227,174,48,.08)","rgba(247,207,88,.5)",1.4,.55+pulse*.25,{transparent:true});
    }

    for (const effect of effects.tracers || []) {
      const progress = clamp((time - effect.startAt) / Math.max(1,effect.duration),0,1);
      const head = Math.min(1,progress*1.25);
      const tail = Math.max(0,head-.32);
      const a = lerpPoint(effect.origin,effect.target,tail);
      const b = lerpPoint(effect.origin,effect.target,head);
      const style = String(effect.style || "player");
      const glow = style === "player-aim" ? "rgba(126,220,255,.42)" : "rgba(255,182,84,.38)";
      const core = style === "player-aim" ? "rgba(220,249,255,.98)" : "rgba(255,245,196,.98)";
      line3d(a,b,glow,6.2,1-progress*.35);
      line3d(a,b,core,1.65,1-progress*.2);
    }

    for (const rocket of effects.rockets || []) {
      if (time < rocket.startAt) continue;
      const progress=clamp((time-rocket.startAt)/Math.max(1,rocket.duration),0,1);
      const head=lerpPoint(rocket.origin,rocket.target,progress);
      const tail=lerpPoint(rocket.origin,rocket.target,Math.max(0,progress-.1));
      line3d(tail,head,"rgba(255,225,145,.98)",4.2,1);
      line3d(lerpPoint(rocket.origin,rocket.target,Math.max(0,progress-.2)),tail,"rgba(255,96,34,.5)",9,.8);
      const puff=.12;
      polygon([[head[0]-puff,head[1],head[2]],[head[0],head[1]+puff,head[2]],[head[0]+puff,head[1],head[2]],[head[0],head[1]-puff,head[2]]],"rgba(255,214,111,.96)",null,1,.96,{transparent:true});
    }

    for (const effect of effects.glassShards || []) {
      const t=clamp((time-effect.startAt)/Math.max(1,effect.duration),0,1);
      const center=[Number(effect.point.x),Number(effect.point.y),Number(effect.point.z)];
      const normal=[Number(effect.normal?.x)||0,Number(effect.normal?.y)||0,Number(effect.normal?.z)||0];
      const radius=(Number(effect.radius)||1.8)*COMBAT_GLASS_SHATTER_VISUAL_SCALE;
      for(let i=0;i<20;i++){
        const a=i/20*Math.PI*2+(Number(effect.seed)||0)*.01;
        const speed=.35+(i%6)*.12;
        const spread=radius*(.16+t*speed);
        const lift=(.35+(i%5)*.09)*t-1.25*t*t;
        const start=[center[0]+normal[0]*.03,center[1]+normal[1]*.03,center[2]+normal[2]*.03];
        const end=[start[0]+Math.cos(a)*spread+normal[0]*t*.8,start[1]+lift+normal[1]*t*.8,start[2]+Math.sin(a)*spread+normal[2]*t*.8];
        line3d(start,end,i%3===0?"rgba(221,251,255,.96)":"rgba(126,210,229,.86)",i%4===0?3.1:1.8,1-t*.78);
        const shard=.08+(i%4)*.025;
        polygon([[end[0]-shard,end[1],end[2]],[end[0]+shard,end[1]+shard*1.7,end[2]],[end[0]+shard*.3,end[1]-shard,end[2]+shard]],"rgba(159,225,238,.36)","rgba(225,252,255,.74)",.7,1-t*.72,{transparent:true});
      }
      const flash=Math.sin(Math.min(1,t*2.2)*Math.PI);
      if(flash>0){
        const ring=[];const ringRadius=radius*(.15+t*.72);
        for(let i=0;i<18;i++){const a=i/18*Math.PI*2;ring.push([center[0]+Math.cos(a)*ringRadius,center[1]+.02,center[2]+Math.sin(a)*ringRadius]);}
        polygon(ring,"rgba(159,228,241,.08)","rgba(218,250,255,.55)",1.5,flash*.85,{transparent:true});
      }
    }

    for (const effect of effects.impacts || []) {
      const [u,v]=impactBasis(effect.normal);
      const n=[Number(effect.normal?.x)||0,Number(effect.normal?.y)||0,Number(effect.normal?.z)||0];
      const center=[Number(effect.point.x)+n[0]*.008,Number(effect.point.y)+n[1]*.008,Number(effect.point.z)+n[2]*.008];
      const radius=Number(effect.size)||.105;
      const points=[];
      for(let i=0;i<10;i++){
        const a=i/10*Math.PI*2;
        const wobble=.82+.16*Math.sin(a*3+(effect.seed||0));
        points.push([center[0]+(u[0]*Math.cos(a)+v[0]*Math.sin(a))*radius*wobble,center[1]+(u[1]*Math.cos(a)+v[1]*Math.sin(a))*radius*wobble,center[2]+(u[2]*Math.cos(a)+v[2]*Math.sin(a))*radius*wobble]);
      }
      const rim=effect.kind === "floor" ? "rgba(134,117,91,.58)" : "rgba(156,164,163,.5)";
      polygon(points,"rgba(18,18,16,.94)",rim,1,.98,{transparent:false});
    }

    for (const burst of effects.bloodBursts || []) {
      const elapsed = clamp((time-burst.startAt)/Math.max(1,burst.duration),0,1);
      const intensity=Number(burst.intensity)||1;
      for (let i=0;i<14;i++) {        const angle = burst.seed*.17 + i*.63;
        const distance = (.42 + (i%4)*.16) * (elapsed*1.55) * intensity;
        const rise = (.55 + (i%3)*.18)*elapsed - 1.18*elapsed*elapsed;
        const start=[Number(burst.point.x),Number(burst.point.y),Number(burst.point.z)];
        const end = [start[0]+Math.cos(angle)*distance,start[1]+rise,start[2]+Math.sin(angle)*distance];
        line3d(start,end,i%3===0?"rgba(186,24,28,.94)":"rgba(126,10,14,.94)",i%4===0?3.6:2.4,1-elapsed*.82);
      }
    }

    for (const fountain of effects.bloodFountains || []) {
      if (time < fountain.startAt) continue;
      const elapsed=clamp((time-fountain.startAt)/Math.max(1,fountain.duration),0,1);
      for(let i=0;i<9;i++){
        const phase=(elapsed*1.8 + i/9)%1;
        const angle=fountain.seed*.11+i*.71;
        const spread=.16+.2*phase;
        const y=Number(fountain.y)+phase*2.4-1.9*phase*phase;
        const a=[Number(fountain.x),Number(fountain.y),Number(fountain.z)];
        const b=[Number(fountain.x)+Math.cos(angle)*spread,y,Number(fountain.z)+Math.sin(angle)*spread];
        line3d(a,b,"rgba(154,12,18,.92)",2.7,Math.sin(phase*Math.PI));
      }
    }

    for (const pool of effects.bloodPools || []) {
      if (time < pool.startAt) continue;
      const grow = clamp((time-pool.startAt)/1650,0,1);
      const radius = .42 + grow*1.6;
      const points=[];
      for(let i=0;i<20;i++) {
        const angle=i/20*Math.PI*2;
        const wobble=.78 + .22*Math.sin(angle*3+pool.seed);
        points.push([Number(pool.x)+Math.cos(angle)*radius*wobble,Number(pool.y),Number(pool.z)+Math.sin(angle)*radius*.66*wobble]);
      }
      polygon(points,"rgba(86,8,12,.78)","rgba(122,12,16,.64)",1.2,.92,{transparent:true});
    }

    for (const explosion of effects.explosions || []) {
      if (time < explosion.startAt) continue;
      const t=clamp((time-explosion.startAt)/Math.max(1,explosion.duration),0,1);
      const radius=(.5+Math.sin(t*Math.PI)*3.8)*(Number(explosion.radius||9)/9)*COMBAT_EXPLOSION_VISUAL_SCALE;
      const center=[Number(explosion.point.x),Number(explosion.point.y)+.35,Number(explosion.point.z)];
      for(let i=0;i<12;i++){
        const a=i/12*Math.PI*2 + (explosion.seed||0)*.01;
        const edge=[center[0]+Math.cos(a)*radius,center[1]+Math.sin(a*2)*radius*.28,center[2]+Math.sin(a)*radius];
        line3d(center,edge,i%2?"rgba(255,93,24,.82)":"rgba(255,213,78,.95)",5.5*(1-t)+1.2,1-t*.7);
      }
      const ring=[];
      for(let i=0;i<18;i++){const a=i/18*Math.PI*2;ring.push([center[0]+Math.cos(a)*radius,Number(explosion.point.y)+.08,center[2]+Math.sin(a)*radius]);}
      polygon(ring,"rgba(255,91,24,.12)","rgba(255,171,48,.72)",2,1-t,{transparent:true});
    }
  }

  function drawFirstPersonCombatWeapon(time) {
    if (state.cameraMode !== "walk" || !combatController?.isActive?.()) return;
    const combat = combatController.playerRenderState?.(time);
    if (!combat) return;
    const pixelRatio = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
    const moving = combat.moving ? 1 : 0;
    const walkPhase = time * (combat.sprinting ? .0155 : .0125);
    const bobX = Math.sin(walkPhase) * .028 * moving;
    const bobY = Math.abs(Math.cos(walkPhase)) * .035 * moving;
    const recoil = clamp(Number(combat.recoilProgress)||0,0,1);
    const reload = clamp(Number(combat.reloadProgress)||0,0,1);
    const reloadArc = Math.sin(reload * Math.PI);
    const aim = combat.aiming ? 1 : 0;
    const death = clamp(Number(combat.deathProgress) || 0, 0, 1);
    const deathDrop = Math.sin(Math.min(1, death * 2) * Math.PI / 2);
    const rifleAds = combat.weapon === "rifle" && aim > .5;
    const root = {
      // ADS keeps the rifle low enough that the dedicated HUD holographic sight
      // stays completely open. Hip fire returns the weapon to the right side.
      x: .34 + bobX*(1-aim*.78) - aim*(rifleAds?.27:.34) + deathDrop*.18,
      y: -.25 - bobY*(1-aim*.8) - aim*(rifleAds?.19:.085) - reloadArc*.12 + recoil*.045 - deathDrop*.72,
      z: 1.15 - aim*(rifleAds?.12:.22) - recoil*.11 + reloadArc*.08 + deathDrop*.12,
      rotationX: -4 - recoil*6 + reloadArc*18 + deathDrop*28,
      rotationY: -6 + aim*5.2 + bobX*40*(1-aim*.8),
      rotationZ: -2 + Math.sin(walkPhase*.5)*1.1*moving + reloadArc*30 + deathDrop*24,
    };
    const metal="#303a40", dark="#151c20", mid="#4f5b61", skin="#d7a381", steel="#77858b", accent="#202a2f";
    let parts = combat.weapon === "handgun" ? [
      {x:.02,y:.04,z:-.06,w:.3,h:.15,d:.72,color:metal},
      {x:.02,y:.13,z:-.08,w:.25,h:.035,d:.56,color:steel},
      {x:.02,y:.105,z:.19,w:.16,h:.055,d:.19,color:"#11171a"},
      {x:.02,y:.105,z:-.33,w:.08,h:.07,d:.08,color:"#a8b1b4"},
      {x:.02,y:-.15,z:.16,w:.19,h:.36,d:.25,color:dark,rotationX:-12},
      {x:.02,y:-.04,z:.19,w:.23,h:.07,d:.18,color:accent},
      {x:.02,y:.01,z:-.55,w:.09,h:.085,d:.4,color:dark},
      {x:.02,y:.01,z:-.77,w:.12,h:.1,d:.08,color:"#222b2f"},
      {x:.0,y:-.22,z:.12,w:.22,h:.17,d:.26,color:skin,rotationX:-8},
      {x:-.18,y:-.16,z:.12,w:.17,h:.15,d:.24,color:skin,rotationZ:-12},
    ] : combat.weapon === "sniper" ? [
      // Long, heavy precision rifle with a raised scope and narrow barrel.
      {x:0,y:-.06,z:.70,w:.32,h:.26,d:.68,color:dark},
      {x:0,y:-.03,z:.24,w:.36,h:.24,d:.58,color:metal},
      {x:0,y:-.23,z:.20,w:.17,h:.40,d:.22,color:dark,rotationX:-11},
      {x:0,y:-.25,z:-.08,w:.18,h:.38,d:.20,color:dark,rotationX:7},
      {x:0,y:-.025,z:-.58,w:.24,h:.16,d:.88,color:mid},
      {x:0,y:-.005,z:-1.28,w:.085,h:.085,d:.86,color:dark},
      {x:0,y:-.005,z:-1.72,w:.13,h:.11,d:.12,color:"#242e32"},
      {x:0,y:.19,z:-.12,w:.16,h:.14,d:.62,color:"#11181c"},
      {x:-.11,y:.19,z:-.12,w:.045,h:.20,d:.12,color:steel},
      {x:.11,y:.19,z:-.12,w:.045,h:.20,d:.12,color:steel},
      {x:.05,y:-.34,z:.16,w:.24,h:.19,d:.30,color:skin,rotationX:-8},
      {x:-.22,y:-.16,z:-.68,w:.20,h:.18,d:.36,color:skin,rotationZ:-14},
    ] : combat.weapon === "rocket" ? [
      // Shoulder-fired rocket launcher: thick tube, rear bell, grips, and sight.
      {x:0,y:.00,z:.05,w:.48,h:.48,d:1.78,color:"#394a3d"},
      {x:0,y:.00,z:.82,w:.62,h:.62,d:.28,color:"#222b25"},
      {x:0,y:.00,z:-.92,w:.54,h:.54,d:.22,color:"#28372e"},
      {x:.04,y:-.28,z:.24,w:.18,h:.42,d:.22,color:dark,rotationX:-8},
      {x:-.05,y:-.24,z:-.42,w:.18,h:.34,d:.22,color:dark,rotationX:8},
      {x:.0,y:.33,z:-.18,w:.22,h:.10,d:.34,color:steel},
      {x:.16,y:.36,z:-.20,w:.06,h:.22,d:.10,color:mid},
      {x:.04,y:-.38,z:.22,w:.25,h:.20,d:.32,color:skin},
      {x:-.24,y:-.30,z:-.42,w:.23,h:.20,d:.32,color:skin,rotationZ:-10},
    ] : combat.weapon === "chainsaw" ? [
      // Compact combat chainsaw with a visible motor body, twin handles, and blade bar.
      {x:0,y:-.02,z:.30,w:.52,h:.42,d:.62,color:"#b54b24"},
      {x:0,y:.02,z:-.28,w:.28,h:.18,d:.92,color:steel},
      {x:0,y:.02,z:-.82,w:.18,h:.12,d:.52,color:"#c9d0cf"},
      {x:0,y:.14,z:-.58,w:.25,h:.06,d:.86,color:"#343d3d"},
      {x:.18,y:.26,z:.18,w:.10,h:.38,d:.34,color:dark,rotationZ:-16},
      {x:-.18,y:.20,z:.00,w:.10,h:.34,d:.44,color:dark,rotationZ:14},
      {x:.16,y:-.30,z:.20,w:.24,h:.19,d:.30,color:skin,rotationX:-8},
      {x:-.22,y:-.20,z:-.08,w:.22,h:.18,d:.34,color:skin,rotationZ:-12},
    ] : combat.weapon === "shotgun" ? [
      // Zombie Mode pump shotgun: broad stock, receiver, wood fore-end and twin barrel silhouette.
      {x:0,y:-.055,z:.62,w:.36,h:.28,d:.72,color:"#4d3526"},
      {x:0,y:-.04,z:.18,w:.36,h:.24,d:.58,color:metal},
      {x:0,y:-.025,z:-.42,w:.30,h:.19,d:.62,color:"#6a4930"},
      {x:0,y:.025,z:-.78,w:.11,h:.10,d:.92,color:dark},
      {x:.07,y:.085,z:-.80,w:.08,h:.07,d:.88,color:steel},
      {x:0,y:-.20,z:.15,w:.17,h:.36,d:.22,color:dark,rotationX:-12},
      {x:.03,y:-.30,z:.18,w:.24,h:.18,d:.30,color:skin,rotationX:-8},
      {x:-.23,y:-.15,z:-.39,w:.20,h:.18,d:.38,color:skin,rotationZ:-12},
    ] : [
      // Stock and buffer tube.
      {x:0,y:-.055,z:.68,w:.33,h:.27,d:.58,color:dark},
      {x:0,y:-.02,z:.42,w:.16,h:.13,d:.36,color:mid},
      // Upper/lower receiver sit below the sight line so ADS stays clear.
      {x:0,y:-.055,z:.08,w:.4,h:.25,d:.72,color:metal},
      {x:0,y:.085,z:.04,w:.34,h:.055,d:.72,color:steel},
      {x:0,y:-.23,z:.13,w:.18,h:.43,d:.22,color:dark,rotationX:-12},
      // Curved magazine is the reloadable part.
      {x:0,y:-.255,z:-.12,w:.2,h:.46,d:.22,color:dark,rotationX:9},
      // Handguard, gas block, barrel, muzzle device.
      {x:0,y:-.035,z:-.61,w:.29,h:.2,d:.66,color:mid},
      {x:0,y:.075,z:-.62,w:.31,h:.045,d:.57,color:steel},
      {x:0,y:-.025,z:-1.08,w:.1,h:.1,d:.62,color:dark},
      {x:0,y:-.025,z:-1.43,w:.145,h:.13,d:.12,color:"#252f33"},
      // Raised holographic sight: open center, two side posts, thin top and base.
      {x:0,y:.18,z:-.22,w:.28,h:.045,d:.24,color:"#182126"},
      {x:-.105,y:.305,z:-.22,w:.045,h:.25,d:.075,color:mid},
      {x:.105,y:.305,z:-.22,w:.045,h:.25,d:.075,color:mid},
      {x:0,y:.43,z:-.22,w:.25,h:.04,d:.075,color:mid},
      {x:0,y:.325,z:-.255,w:.19,h:.035,d:.035,color:"#4b7780"},
      // Hands support the grip and forward handguard without covering the optic.
      {x:.04,y:-.34,z:.12,w:.25,h:.19,d:.3,color:skin,rotationX:-8},
      {x:-.22,y:-.17,z:-.61,w:.2,h:.18,d:.36,color:skin,rotationZ:-14},
    ];
    // All fourteen authored combat weapons are real designer parts. Convert
    // the shared +X-forward modeling convention into the first-person -Z axis.
    // Editing and saving a weapon in Machine Studio changes its live viewmodel.
    const sharedWeaponModel=designLibrary["combat-weapon-"+String(combat.weapon||"rifle")];
    if (sharedWeaponModel?.machineType==="combatWeapon" && sharedWeaponModel.components?.length) {
      const base=sharedWeaponModel.base||{};
      const bw=Math.max(.3,Number(base.w)||4),bh=Math.max(.3,Number(base.h)||1.65),bd=Math.max(.3,Number(base.d)||1.25);
      const factor=Math.min(1,3.75/bw);
      parts=sharedWeaponModel.components.filter(part=>part.visible!==false && part.type==="box").map(part=>({
        x:((Number(part.z)||0)+(Number(part.d)||.1)*.5-bd*.5)*.63,
        y:((Number(part.y)||0)+(Number(part.h)||.1)*.5-bh*.5)*.72,
        z:(bw*.5-(Number(part.x)||0)-(Number(part.w)||.1)*.5)*factor,
        w:Math.max(.02,(Number(part.d)||.1)*.63),
        h:Math.max(.02,(Number(part.h)||.1)*.72),
        d:Math.max(.02,(Number(part.w)||.1)*factor),
        color:part.color||"#58686c",
        rotationX:Number(part.rotationX)||0,rotationY:Number(part.rotationY)||0,rotationZ:Number(part.rotationZ)||0,
      }));
    }
    // During reload the magazine visibly drops and returns instead of the whole gun merely rotating.
    parts.forEach((part,index) => {
      const magazineIndex = sharedWeaponModel ? -1 : combat.weapon === "rifle" ? 5 : -1;
      // Rifle optic parts (10-14) disappear while zoomed/ADS so the separate
      // screen-space holographic aiming sight cannot be blocked by the gun model.
      if (!sharedWeaponModel && combat.weapon === "rifle" && rifleAds && index >= 10 && index <= 14) return;
      if (!sharedWeaponModel && combat.weapon === "sniper" && aim > .5 && index >= 7 && index <= 9) return;
      const spec = {...part};
      if (index === magazineIndex && reload > .05) {
        const eject = reload < .5 ? reload*2 : (1-reload)*2;
        spec.y -= .42 * clamp(eject,0,1);
        spec.rotationZ = (spec.rotationZ||0) + 18*clamp(eject,0,1);
      }
      drawViewmodelBox(spec,root,1);
    });
    if (combat.weapon === "rifle" && !rifleAds && !sharedWeaponModel) {
      // Hip fire keeps the physical holographic sight on the rifle model; ADS
      // hides it so the dedicated aiming sight remains completely unobstructed.
      // glass is framed by the physical sight posts and carries its own red reticle.
      const glassLocal = [
        [-.092,.245,-.275],[.092,.245,-.275],[.092,.405,-.275],[-.092,.405,-.275],
      ].map((point) => viewmodelPoint(point,root));
      drawViewmodelPolygon(glassLocal,"rgba(75,177,193,.11)","rgba(152,226,236,.38)",.94);
      const reticleWorld = viewmodelPoint([0,.325,-.283],root);
      const reticlePoint = viewmodelProject(reticleWorld);
      const reticleRadius = Math.max(3.2, canvas.width/390);
      ctx.save();
      ctx.strokeStyle="rgba(255,66,72,.96)";
      ctx.fillStyle="rgba(255,72,76,.94)";
      ctx.shadowColor="rgba(255,54,60,.72)";
      ctx.shadowBlur=Math.max(5,canvas.width/260);
      ctx.lineWidth=Math.max(1.2,canvas.width/1500);
      ctx.beginPath();ctx.arc(reticlePoint[0],reticlePoint[1],reticleRadius,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.arc(reticlePoint[0],reticlePoint[1],Math.max(1.2,reticleRadius*.22),0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
    if (combat.muzzleFlash) {
      const customAnchor=sharedWeaponModel?.combatAnchors?.[aim>.5?"adsMuzzle":"hipMuzzle"];
      const muzzleLocal = customAnchor ? [
        (Number(customAnchor.z)-(Number(sharedWeaponModel.base?.d)||1.25)*.5)*.63,
        (Number(customAnchor.y)-(Number(sharedWeaponModel.base?.h)||1.65)*.5)*.72,
        ((Number(sharedWeaponModel.base?.w)||4)*.5-Number(customAnchor.x))*Math.min(1,3.75/(Number(sharedWeaponModel.base?.w)||4)),
      ] : combat.weapon === "handgun" ? [0,.01,-.78]
        : combat.weapon === "shotgun" ? [0,.04,-1.26]
        : combat.weapon === "sniper" ? [0,-.005,-1.78]
        : combat.weapon === "rocket" ? [0,0,-1.05]
        : [0,-.025,-1.49];
      const muzzle = viewmodelPoint(muzzleLocal,root);
      const p=viewmodelProject(muzzle);
      const radius=Math.max(16,42*pixelRatio);
      ctx.save();
      ctx.translate(p[0],p[1]);
      ctx.globalCompositeOperation="lighter";
      const gradient=ctx.createRadialGradient(0,0,0,0,0,radius);
      gradient.addColorStop(0,"rgba(255,255,255,1)");
      gradient.addColorStop(.22,"rgba(255,235,151,.95)");
      gradient.addColorStop(.55,"rgba(255,126,45,.58)");
      gradient.addColorStop(1,"rgba(255,73,24,0)");
      ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
  }

  function drawMachineShape(machine, alpha, grow, time) {
    const customDesign = machine.designId ? designLibrary[machine.designId] : null;
    if (combatController?.isActive?.() && machine.combatState && combatEnemyMachine(machine)) {
      drawCombatEnemy(machine, alpha, grow, time);
      return;
    }
    const lodLevel = machineLodLevel(machine);
    if (lodLevel < 2) {
      box({
        ...machine,
        y: Number(machine.renderY ?? machine.y) || 0,
        color: machine.color || "#68777a",
      }, alpha, grow);
      return;
    }
    if (customDesign && drawCustomDesign(machine, alpha, grow, time, lodLevel)) return;
    const topHeight = machine.h * grow;
    if (machine.type === "cutting") {
      box(localBox(machine,0,0,machine.w,machine.d,1.25*grow,shade(machine.color,-.08)),alpha,1);
      box(localBox(machine,1,1,Math.max(.5,machine.w-2),Math.max(.5,machine.d-2),.42*grow,"#96c4c8",1.24*grow),alpha*.9,1);
      for (let offset=5; offset<machine.w; offset+=7) {
        localLine(machine,[offset,1.72*grow,2],[offset,1.72*grow,machine.d-2],"#d8e5e2",1,alpha*.75);
      }
      for (let offset=6; offset<machine.d; offset+=9) {
        localLine(machine,[2,1.74*grow,offset],[machine.w-2,1.74*grow,offset],"#56777a",.8,alpha*.58);
      }
      drawControlConsole(machine,Math.max(1,machine.w-6),1,4.6,3.2,4.4*grow,1.2*grow,alpha);
    } else if (machine.type === "waterjet") {
      const basinHeight = Math.max(.8,3.2*grow);
      box(localBox(machine,0,0,machine.w,machine.d,basinHeight,shade(machine.color,-.05)),alpha,1);
      box(localBox(machine,1.1,1.1,Math.max(.5,machine.w-2.2),Math.max(.5,machine.d-2.2),.28*grow,"#7fc3cf",basinHeight-.08),alpha*.92,1);
      localLine(machine,[.7,basinHeight+.18,.7],[machine.w-.7,basinHeight+.18,.7],"#d8dedc",3,alpha);
      localLine(machine,[.7,basinHeight+.18,machine.d-.7],[machine.w-.7,basinHeight+.18,machine.d-.7],"#d8dedc",3,alpha);
      localLine(machine,[1.2,basinHeight+.25,1.1],[1.2,basinHeight+.25,machine.d-1.1],"#174c79",3.2,alpha);
      localLine(machine,[machine.w-1.2,basinHeight+.25,1.1],[machine.w-1.2,basinHeight+.25,machine.d-1.1],"#174c79",3.2,alpha);
      const gantryZ = machine.d*.58;
      localLine(machine,[1.3,basinHeight,gantryZ],[1.3,7.4*grow,gantryZ],"#c8cecb",4,alpha);
      localLine(machine,[machine.w-1.3,basinHeight,gantryZ],[machine.w-1.3,7.4*grow,gantryZ],"#c8cecb",4,alpha);
      localLine(machine,[1.3,7.2*grow,gantryZ],[machine.w-1.3,7.2*grow,gantryZ],"#d5d9d6",6,alpha);
      const headX = machine.w*.58;
      box(localBox(machine,headX-.7,gantryZ-.55,1.4,1.1,2.1*grow,"#3a4a50",5.1*grow),alpha,1);
      localLine(machine,[headX,5.2*grow,gantryZ],[headX,basinHeight+.5,gantryZ],"#b2c5c7",1.5,alpha);
      localLine(machine,[headX+.7,7.7*grow,gantryZ],[machine.w-2,8.4*grow,machine.d*.16],"#e5bd2d",2.4,alpha*.9);
      drawControlConsole(machine,Math.max(.5,machine.w-4.5),.35,3.6,2.6,5.2*grow,basinHeight,alpha);
    } else if (machine.type === "filtration") {
      box(localBox(machine,0,0,machine.w,machine.d,1.2*grow,shade(machine.color,-.16)),alpha,1);
      const tankWidth = Math.max(.8,(machine.w-1.5)/3);
      for (let index=0; index<3; index++) {
        box(localBox(machine,.35 + index*tankWidth,.8,tankWidth*.72,Math.max(.5,machine.d-1.6),Math.max(1,7.2*grow),index === 1 ? "#438a9f" : "#5f99aa",1.1*grow),alpha,1);
      }
      localLine(machine,[.5,8.4*grow,1],[machine.w-.5,8.4*grow,1],"#cfd6d4",2,alpha);
      localLine(machine,[machine.w*.5,8.4*grow,1],[machine.w*.5,2*grow,machine.d-.5],"#cfd6d4",1.5,alpha);
    } else if (machine.type === "kodiak") {
      box(localBox(machine,0,0,machine.w,machine.d,1.05*grow,"#313b3f"),alpha,1);
      box(localBox(machine,.35,.35,Math.max(.5,machine.w-.7),Math.max(.5,machine.d-.7),2.8*grow,"#ecefeb",1.0*grow),alpha,1);
      box(localBox(machine,.5,.55,Math.max(.5,machine.w-.9),1.15,1.0*grow,"#7d8988",3.55*grow),alpha,1);
      drawRollerBed(machine,1,machine.w-1,.4,2.0,4.72*grow,1.4,"#c5cfcc",alpha,1.1);
      const motorCount = 10;
      const motorStep = (machine.w-2) / motorCount;
      for (let index=0; index<motorCount; index++) {
        const motorX = 1 + index*motorStep + motorStep*.12;
        box(localBox(machine,motorX,machine.d*.58,motorStep*.7,Math.max(.6,machine.d*.28),2.15*grow,"#144783",.55*grow),alpha,1);
        box(localBox(machine,motorX + motorStep*.12,machine.d*.55,motorStep*.46,.45,.48*grow,"#e0e5e2",2.7*grow),alpha,1);
      }
      box(localBox(machine,machine.w*.54,.25,machine.w*.3,2.05,3.7*grow,"#d8ddda",4.3*grow),alpha,1);
      drawControlConsole(machine,machine.w*.72,.05,machine.w*.18,1.7,3.3*grow,4.5*grow,alpha);
      for (let offset=1.5; offset<machine.w; offset+=5) {
        localLine(machine,[offset,0,.4],[offset,-.45,.4],"#1f272a",2.2,alpha);
        localLine(machine,[offset,0,machine.d-.4],[offset,-.45,machine.d-.4],"#1f272a",2.2,alpha);
      }
    } else if (machine.type === "denver") {
      box(localBox(machine,0,0,machine.w,machine.d,1.0*grow,"#4d585b"),alpha,1);
      box(localBox(machine,.5,machine.d*.42,Math.max(.5,machine.w-1),machine.d*.28,2.3*grow,"#909c9b",1.0*grow),alpha,1);
      drawRollerBed(machine,1,machine.w-1,machine.d*.34,machine.d*.78,3.4*grow,2.3,"#d7ddda",alpha,1.4);
      const towerX = machine.w*.45;
      const towerWidth = Math.max(4,machine.w*.15);
      box(localBox(machine,towerX,machine.d*.08,towerWidth,machine.d*.84,Math.max(2,topHeight),"#151d22"),alpha,1);
      box(localBox(machine,towerX-.9,machine.d*.12,.9,machine.d*.76,Math.max(2,topHeight*.94),"#edf0ed",.2*grow),alpha,1);
      box(localBox(machine,towerX+towerWidth,machine.d*.12,.9,machine.d*.76,Math.max(2,topHeight*.94),"#edf0ed",.2*grow),alpha,1);
      box(localBox(machine,towerX+towerWidth*.14,machine.d*.02,towerWidth*.72,.24,topHeight*.52,"#253139",topHeight*.23),alpha*.94,1);
      localLine(machine,[towerX+towerWidth*.5,topHeight*.18,machine.d*.02],[towerX+towerWidth*.5,topHeight*.87,machine.d*.02],"#6888a8",3.2,alpha);
      drawControlConsole(machine,Math.max(.4,machine.w-4.2),.25,3.6,2.3,4.1*grow,2.4*grow,alpha);
      localLine(machine,[.8,4.1*grow,machine.d-.2],[machine.w-.8,4.1*grow,machine.d-.2],"#d9b126",2,alpha*.8);
      for (let offset=1; offset<machine.w; offset+=6) {
        localLine(machine,[offset,0,machine.d-.15],[offset,4.1*grow,machine.d-.15],"#d9b126",1.2,alpha*.72);
      }
    } else if (machine.type === "washer") {
      box(localBox(machine,0,0,machine.w,machine.d,1.2*grow,"#318d98"),alpha,1);
      const enclosureX = machine.w*.24;
      const enclosureWidth = machine.w*.52;
      box(localBox(machine,enclosureX,.5,enclosureWidth,Math.max(.5,machine.d-1),Math.max(2,topHeight),"#c7cdcb",1.0*grow),alpha,1);
      localLine(machine,[machine.w*.5,1.5*grow,.38],[machine.w*.5,topHeight*.9,.38],"#6f7877",1.1,alpha);
      localLine(machine,[enclosureX+1,topHeight*.7,.35],[enclosureX+enclosureWidth-1,topHeight*.7,.35],"#eef1ef",1.1,alpha);
      box(localBox(machine,enclosureX+.7,.2,enclosureWidth*.24,.22,1.25*grow,"#26518c",topHeight*.45),alpha,1);
      drawRollerBed(machine,.4,enclosureX,.75,machine.d-.75,3.0*grow,1.6,"#d1d9d6",alpha,1.2);
      drawRollerBed(machine,enclosureX+enclosureWidth,machine.w-.4,.75,machine.d-.75,3.0*grow,1.6,"#d1d9d6",alpha,1.2);
    } else if (machine.type === "furnace") {
      box(localBox(machine,0,0,machine.w,machine.d,1.4*grow,"#343d40"),alpha,1);
      drawRollerBed(machine,.5,machine.w-.5,1,machine.d-1,3.05*grow,1.5,"#d9493f",alpha,2.2);
      const hoodX = machine.w*.2;
      const hoodWidth = machine.w*.6;
      box(localBox(machine,hoodX,.8,hoodWidth,Math.max(.5,machine.d-1.6),5.6*grow,"#e8e9e5",3.2*grow),alpha,1);
      box(localBox(machine,hoodX-.25,1.5,.35,Math.max(.5,machine.d-3),3.9*grow,"#30383b",3.6*grow),alpha,1);
      box(localBox(machine,hoodX+hoodWidth-.1,1.5,.35,Math.max(.5,machine.d-3),3.9*grow,"#30383b",3.6*grow),alpha,1);
      for (let offset=hoodX+3; offset<hoodX+hoodWidth; offset+=5) {
        box(localBox(machine,offset,.9,1.2,1.2,1.8*grow,"#b8bfbd",8.4*grow),alpha,1);
      }
      drawControlConsole(machine,Math.max(.5,machine.w-4.3),.3,3.7,2.5,4.2*grow,3.0*grow,alpha);
    } else if (machine.type === "cube") {
      box(localBox(machine,0,0,machine.w,machine.d,Math.max(2,topHeight),"#285b91"),alpha,1);
      box(localBox(machine,machine.w*.15,-.08,machine.w*.7,.2,topHeight*.84,"#1d4b7d",topHeight*.08),alpha,1);
      box(localBox(machine,machine.w*.2,-.14,machine.w*.22,.12,topHeight*.2,"#152d3b",topHeight*.58),alpha,1);
      drawControlConsole(machine,machine.w*.64,-.18,machine.w*.22,.32,topHeight*.28,topHeight*.47,alpha);
      for (let offset=machine.w*.18; offset<machine.w*.82; offset+=Math.max(.8,machine.w*.09)) {
        localLine(machine,[offset,topHeight*.2,-.18],[offset,topHeight*.34,-.18],"#9bb7c2",.8,alpha*.75);
      }
      box(localBox(machine,machine.w*.42,machine.d*.34,machine.w*.18,machine.d*.18,topHeight*.36,"#27445d",topHeight),alpha,1);
    } else if (machine.type === "wrapping") {
      box(localBox(machine,0,0,machine.w,machine.d,1.0*grow,"#5f696b"),alpha,1);
      drawRollerBed(machine,.5,machine.w-.5,.6,machine.d-.6,3.4*grow,1.5,"#aeb9b6",alpha,1.8);
      [[.5,.5],[machine.w-.5,.5],[.5,machine.d-.5],[machine.w-.5,machine.d-.5]].forEach(([x,z]) => {
        localLine(machine,[x,0,z],[x,3.3*grow,z],"#d9ddda",2.3,alpha);
      });
      box(localBox(machine,1,machine.d*.58,3.6,2.6,2.2*grow,"#24568b",3.5*grow),alpha,1);
      localLine(machine,[machine.w*.22,6.5*grow,machine.d*.05],[machine.w*.78,6.5*grow,machine.d*.05],"#8f9896",3,alpha);
      localLine(machine,[machine.w*.28,6.5*grow,machine.d*.05],[machine.w*.28,3.7*grow,machine.d*.05],"#8f9896",2,alpha);
      localLine(machine,[machine.w*.72,6.5*grow,machine.d*.05],[machine.w*.72,3.7*grow,machine.d*.05],"#8f9896",2,alpha);
      drawControlConsole(machine,Math.max(.5,machine.w-3.8),.15,3.2,2.1,3.8*grow,3.3*grow,alpha);
    } else if (machine.type === "shipping") {
      box(localBox(machine,0,0,machine.w,machine.d,1.3*grow,"#333a3c"),alpha,1);
      const cabWidth = machine.w*.3;
      box(localBox(machine,0,.8,cabWidth,Math.max(.5,machine.d-1.6),4.3*grow,"#e1e5e2",1.2*grow),alpha,1);
      if (!proceduralGlassShattered(machine,"procedural-windshield")) box(localBox(machine,cabWidth*.15,.55,cabWidth*.65,.3,1.5*grow,"#8fc6d4",3.5*grow),alpha*.9,1);
      const rackStart = cabWidth+.6;
      const peak = Math.max(3,topHeight);
      localLine(machine,[rackStart,1.3*grow,.5],[machine.w-.5,1.3*grow,.5],"#cfd5d2",3,alpha);
      localLine(machine,[rackStart,1.3*grow,machine.d-.5],[machine.w-.5,1.3*grow,machine.d-.5],"#cfd5d2",3,alpha);
      for (let offset=rackStart; offset<=machine.w-.5; offset+=Math.max(3,(machine.w-rackStart)/5)) {
        localLine(machine,[offset,1.3*grow,.5],[offset,peak,machine.d/2],"#cfd5d2",2,alpha);
        localLine(machine,[offset,1.3*grow,machine.d-.5],[offset,peak,machine.d/2],"#cfd5d2",2,alpha);
      }
      for (let panel=0; panel<4; panel++) {
        const offset = rackStart+1.2+panel*Math.max(1.4,(machine.w-rackStart-3)/3);
        if (!proceduralGlassShattered(machine,`procedural-glass-${panel}`)) box(localBox(machine,Math.min(offset,machine.w-1.3),1.2,.45,Math.max(.5,machine.d-2.4),Math.max(2,machine.h*.72*grow),colors.glass,1.45*grow),alpha*.72,1);
      }
      [[cabWidth*.25,.2],[cabWidth*.75,.2],[machine.w*.65,.2],[machine.w*.88,.2]].forEach(([x,z]) => {
        box(localBox(machine,x-.55,z,.95,1.2,1.0*grow,"#1d2224",-.15),alpha,1);
      });
    } else if (machine.type === "aFrame" || machine.type === "aFrameTruck") {
      const isTruck = machine.type === "aFrameTruck";
      box(localBox(machine,0,0,machine.w,machine.d,.75,machine.color,.1),alpha,1);
      localLine(machine,[0,1,0],[machine.w,1,0],machine.color,isTruck ? 4 : 3,alpha);
      localLine(machine,[0,1,machine.d],[machine.w,1,machine.d],machine.color,isTruck ? 4 : 3,alpha);
      const braceCount = isTruck ? 5 : 4;
      for (let index = 0; index < braceCount; index += 1) {
        const x = .5 + (machine.w - 1) * (braceCount === 1 ? 0 : index / (braceCount - 1));
        localLine(machine,[x,1,.6],[x,topHeight,machine.d/2],machine.color,isTruck ? 3 : 2.5,alpha);
        localLine(machine,[x,1,machine.d-.6],[x,topHeight,machine.d/2],machine.color,isTruck ? 3 : 2.5,alpha);
      }
      localLine(machine,[.5,topHeight,machine.d/2],[machine.w-.5,topHeight,machine.d/2],machine.color,isTruck ? 4 : 3,alpha);
      if (!proceduralGlassShattered(machine,"procedural-glass-left")) box(localBox3d(machine,1,.9,Math.max(.5,machine.w-2),Math.max(.3,machine.d*.12),Math.max(2,machine.h*.72),colors.glass,1.4),alpha*.54,1);
      if (!proceduralGlassShattered(machine,"procedural-glass-right")) box(localBox3d(machine,1,machine.d-Math.max(.3,machine.d*.12)-.9,Math.max(.5,machine.w-2),Math.max(.3,machine.d*.12),Math.max(2,machine.h*.72),colors.glass,1.4),alpha*.54,1);
      const wheelXs = isTruck ? [1.5,machine.w/2,machine.w-1.5] : [1,machine.w-1];
      wheelXs.forEach((x) => {
        [0.7,machine.d-.7].forEach((z) => {
          drawCylinder3d({
            center: [x, .2, z],
            radiusX: isTruck ? .72 : .55,
            radiusY: isTruck ? .72 : .55,
            halfDepth: isTruck ? .34 : .28,
            color: "#20272a",
            alpha,
            pointFromLocal: (offset) => localPoint3d(machine, x + offset[0], .2 + offset[1], z + offset[2]),
            segments: 16,
          });
        });
      });
      if (isTruck) {
        localLine(machine,[-4,1.2,machine.d/2],[0,1.2,machine.d/2],"#4e5a5c",3,alpha);
        localLine(machine,[-4,1.2,machine.d/2-.7],[-4,1.2,machine.d/2+.7],"#4e5a5c",3,alpha);
      } else {
        localLine(machine,[.2,1,machine.d-.15],[.2,5.5,machine.d-.15],"#4e5a5c",2.4,alpha);
        localLine(machine,[.2,5.5,machine.d-.15],[2.5,5.5,machine.d-.15],"#4e5a5c",2.4,alpha);
      }
    } else if (machine.type === "craneMachine" || machine.type === "bridgeCrane") {
      const beamColor = machine.type === "bridgeCrane" ? "#566165" : machine.color;
      [[0,0],[machine.w,0],[0,machine.d],[machine.w,machine.d]].forEach(([x,z]) => {
        localLine(machine,[x,0,z],[x,topHeight,z],machine.color,4,alpha);
      });
      localLine(machine,[0,topHeight,0],[machine.w,topHeight,0],machine.color,5,alpha);
      localLine(machine,[0,topHeight,machine.d],[machine.w,topHeight,machine.d],machine.color,5,alpha);
      const bridgeX = machine.w*.55;
      localLine(machine,[bridgeX,topHeight+.2,0],[bridgeX,topHeight+.2,machine.d],beamColor,5,alpha);
      localLine(machine,[bridgeX,topHeight,machine.d/2],[bridgeX,Math.min(3,topHeight*.4),machine.d/2],"#30383b",2,alpha);
      if (machine.type === "bridgeCrane") {
        localLine(machine,[bridgeX-1.2,topHeight+.55,machine.d/2],[bridgeX+1.2,topHeight+.55,machine.d/2],colors.orange,5,alpha);
      }
    } else if (machine.type === "glassRack") {
      const peak = Math.max(2,topHeight);
      localLine(machine,[0,0,0],[machine.w,0,0],machine.color,3,alpha);
      localLine(machine,[0,0,machine.d],[machine.w,0,machine.d],machine.color,3,alpha);
      for (let offset=0; offset<=machine.w; offset+=Math.max(4,machine.w/4)) {
        localLine(machine,[offset,0,0],[offset,peak,machine.d/2],machine.color,2.5,alpha);
        localLine(machine,[offset,0,machine.d],[offset,peak,machine.d/2],machine.color,2.5,alpha);
      }
      const panelCount = state.stageFloat >= stages.length - 1 ? 5 : 3;
      for (let panel=0; panel<panelCount; panel++) {
        const offset = 2.2 + panel * Math.max(1.3,(machine.w-5)/Math.max(1,panelCount-1));
        if (!proceduralGlassShattered(machine,`procedural-lite-${panel}`)) box(localBox(machine,Math.min(offset,machine.w-1),1,.55,Math.max(.5,machine.d-2),(machine.h+4)*grow,colors.glass),alpha*.82,1);
      }
    } else if (machine.type === "room") {
      box(machine,alpha,grow);
      box(localBox(machine,machine.w*.38,-.08,Math.max(3,machine.w*.22),.18,Math.min(8,topHeight*.72),"#596365"),alpha,1);
      localLine(machine,[2,Math.min(topHeight*.62,7),-.12],[machine.w-2,Math.min(topHeight*.62,7),-.12],"#8fc6d4",3,alpha*.75);
    } else if (machine.type === "person") {
      const bob = Math.sin(time*.004 + machine.x*.1) * .12;
      const bodyHeight = Math.max(.5,(machine.h-1.2)*grow+bob);
      box(localBox(machine,machine.w*.18,machine.d*.18,machine.w*.64,machine.d*.64,bodyHeight,machine.color),alpha,1);
      box(localBox(machine,machine.w*.25,machine.d*.25,machine.w*.5,machine.d*.5,Math.max(.4,1.1*grow),"#e6b993",bodyHeight),alpha,1);
    } else if (machine.type === "safetyLine") {
      box({ ...machine, y: 0.035, h: Math.max(0.035, machine.h), color: machine.color || colors.yellow }, alpha * .92, grow);
    } else if (machine.type === "trench") {
      const trenchHeight = Math.max(0.08, machine.h);
      box({ ...machine, y: 0.025, h: trenchHeight, color: machine.color || "#4a3a31" }, alpha, grow);
      if (machine.w >= machine.d) {
        localLine3d(machine,[0,trenchHeight+.035,machine.d/2],[machine.w,trenchHeight+.035,machine.d/2],colors.utility,2.2,alpha*.92);
      } else {
        localLine3d(machine,[machine.w/2,trenchHeight+.035,0],[machine.w/2,trenchHeight+.035,machine.d],colors.utility,2.2,alpha*.92);
      }
    } else if (machine.type === "floorDrain") {
      const drainHeight = Math.max(.08, machine.h);
      box({ ...machine, y: 0.03, h: drainHeight, color: machine.color || "#465155" }, alpha, grow);
      box(localBox3d(machine,machine.w*.08,machine.d*.08,machine.w*.84,machine.d*.84,Math.max(.025,drainHeight*.18),"#252d30",drainHeight+.035),alpha,1);
      const lineCount = Math.max(3, Math.min(10, Math.round(Math.max(machine.w,machine.d) * 1.5)));
      for (let index = 1; index < lineCount; index += 1) {
        const ratio = index / lineCount;
        localLine3d(machine,[machine.w*.12 + machine.w*.76*ratio,drainHeight+.08,machine.d*.12],[machine.w*.12 + machine.w*.76*ratio,drainHeight+.08,machine.d*.88],"#879194",1,alpha);
        localLine3d(machine,[machine.w*.12,drainHeight+.081,machine.d*.12 + machine.d*.76*ratio],[machine.w*.88,drainHeight+.081,machine.d*.12 + machine.d*.76*ratio],"#879194",1,alpha);
      }
    } else if (machine.type === "animatedGlass") {
      if (!proceduralGlassShattered(machine,"procedural-glass-body")) box({ ...machine, rotationY: Number(machine.rotationY ?? machine.rotation) || 0, color: machine.color || colors.glass, y: Number(machine.renderY ?? machine.y) || 0 }, alpha * .72, grow);
      localLine3d(machine,[machine.w/2,0,machine.d/2],[machine.w/2,machine.h*grow,machine.d/2],"rgba(255,255,255,.6)",1.2,alpha*.65);
    } else if (machine.type === "animatedBox") {
      box({ ...machine, rotationY: Number(machine.rotationY ?? machine.rotation) || 0, y: Number(machine.renderY ?? machine.y) || 0 },alpha,grow);
      box(localBox3d(machine,machine.w*.08,machine.d*.08,machine.w*.84,machine.d*.84,machine.h*.16,shade(machine.color,.12),machine.h*.84),alpha,1);
    } else if (machine.type === "animatedPerson") {
      box(localBox3d(machine,machine.w*.2,machine.d*.2,machine.w*.6,machine.d*.6,Math.max(.5,machine.h-1.2),machine.color,0),alpha,1);
      box(localBox3d(machine,machine.w*.28,machine.d*.28,machine.w*.44,machine.d*.44,1.05,"#e6b993",machine.h-1.15),alpha,1);
      localLine3d(machine,[machine.w*.3,machine.h*.35,machine.d*.5],[machine.w*.05,machine.h*.05,machine.d*.5],"#26363d",1.8,alpha);
      localLine3d(machine,[machine.w*.7,machine.h*.35,machine.d*.5],[machine.w*.95,machine.h*.05,machine.d*.5],"#26363d",1.8,alpha);
    } else if (machine.type === "animatedCart") {
      box(localBox3d(machine,0,0,machine.w,machine.d,1,machine.color,.8),alpha,1);
      [[.8,.7],[machine.w-.8,.7],[.8,machine.d-.7],[machine.w-.8,machine.d-.7]].forEach(([x,z]) => {
        box(localBox3d(machine,x-.35,z-.35,.7,.7,.7,"#20272a",.1),alpha,1);
      });
      box(localBox3d(machine,machine.w*.12,machine.d*.12,machine.w*.76,machine.d*.76,Math.max(.5,machine.h-1.8),shade(machine.color,.08),1.8),alpha,1);
    } else if (machine.type === "animatedBeacon") {
      box(localBox3d(machine,machine.w*.38,machine.d*.38,machine.w*.24,machine.d*.24,Math.max(.5,machine.h-1.5),"#596365",0),alpha,1);
      box(localBox3d(machine,0,0,machine.w,machine.d,1.5,machine.color,machine.h-1.5),alpha,1);
    } else if (machine.type === "generic") {
      box(machine,alpha,grow);
      box(localBox(machine,machine.w*.12,machine.d*.12,machine.w*.76,machine.d*.2,1.2*grow,shade(machine.color,.12),Math.max(0,topHeight-.2)),alpha,1);
      localLine(machine,[machine.w*.2,topHeight+.12,machine.d*.72],[machine.w*.8,topHeight+.12,machine.d*.72],"#d9e1de",2,alpha);
    } else {
      box(machine,alpha,grow);
    }
  }

  function drawSelection(machine) {
    if (!state.editing || !state.selectedMachineIds.has(machine.instanceId)) return;
    overlayPolygon(footprint(machine,2,.3),"rgba(228,109,58,.12)","#e46d3a",3,1);
    const centerPoint = localPoint(machine,machine.w/2,.4,machine.d/2);
    const directionPoint = localPoint(machine,machine.w/2,.4,-5);
    overlayLine3d(centerPoint,directionPoint,"#e46d3a",2.5,1);

    if (machine.animationEnabled && ["loop", "pingPong"].includes(machine.animationMode)) {
      const axis = machine.animationAxis || "x";
      const localDirection = axis === "x"
        ? [1,0,0]
        : axis === "y"
          ? [0,1,0]
          : axis === "z"
            ? [0,0,1]
            : [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];
      const direction = rotateVector3(localDirection, ...objectRotation(machine));
      const halfDistance = Math.abs(Number(machine.animationDistance) || 0) / 2;
      const center = [machine.x + machine.w/2, machine.h/2, machine.z + machine.d/2];
      const start = center.map((value,index) => value - direction[index] * halfDistance);
      const end = center.map((value,index) => value + direction[index] * halfDistance);
      overlayLine3d(start,end,"#2675a7",3,1);
    } else if (machine.animationEnabled && machine.animationMode === "fourStep") {
      const origin = [machine.x + machine.w/2, machine.h/2, machine.z + machine.d/2];
      const first = combineMachinePathAxes(machine, Number(machine.animationDistance) || 0, 0);
      const corner = combineMachinePathAxes(machine, Number(machine.animationDistance) || 0, Number(machine.animationSecondaryDistance) || 0);
      const second = combineMachinePathAxes(machine, 0, Number(machine.animationSecondaryDistance) || 0);
      const points = [origin, origin.map((value,index) => value + first[index]), origin.map((value,index) => value + corner[index]), origin.map((value,index) => value + second[index]), origin];
      for (let index = 0; index < points.length - 1; index += 1) overlayLine3d(points[index], points[index + 1], "#2675a7", 3, 1);
    }
  }

  function drawOverlapIndicator(machine, overlappingIds) {
    if (!state.editing || !overlappingIds.has(machine.instanceId)) return;
    overlayPolygon(footprint(machine, .6, .18), "rgba(190,55,45,.12)", "#c33a32", 2.2, 1);
  }


  function effectiveAnimationTime(time) {
    const reference = state.animationsPaused ? state.animationPausedAt : time;
    return Math.max(0, reference - state.animationTimeOffset);
  }

  function animationSettingsMatch(first, second) {
    if (!first || !second) return false;
    const fields = [
      "animationEnabled", "animationMode", "animationAxis", "animationSecondaryAxis",
      "animationDistance", "animationSecondaryDistance", "animationSpeed", "animationPauseSeconds", "animationSecondaryPauseSeconds", "animationStep1PauseSeconds", "animationStep2PauseSeconds", "animationStep3PauseSeconds", "animationStep4PauseSeconds", "animationPhase",
    ];
    if (!fields.every((field) => String(first[field] ?? "") === String(second[field] ?? ""))) return false;
    if (["loop", "pingPong"].includes(first.animationMode)) {
      return objectRotation(first).every((value, index) => Math.abs(value - objectRotation(second)[index]) < 0.0001);
    }
    return true;
  }

  function localMachineAnimationTransform(machine, time) {
    if (machine.motionParentId && machine.playOwnAnimation === false) {
      return { translation: [0,0,0], rotation: [0,0,0], scale: [1,1,1], alpha: 1 };
    }
    return machineAnimationTransform(machine, time);
  }

  function animationWave(machine, time) {
    const speed = Math.max(0, Number(machine.animationSpeed) || 0);
    const pauseSeconds = Math.max(0, Number(machine.animationPauseSeconds) || 0);
    const phase = ((Number(machine.animationPhase) || 0) / 360 + 1) % 1;
    if (speed <= 0) return { cycle: 0, wrapped: 0, sine: 0, pingPong: 0 };

    const activeDuration = 1 / speed;
    const elapsed = Math.max(0, effectiveAnimationTime(time) / 1000 + phase * activeDuration);
    if (machine.animationMode === "pingPong") {
      const quarterDuration = activeDuration / 4;
      const totalDuration = activeDuration + pauseSeconds * 2;
      const localTime = ((elapsed % totalDuration) + totalDuration) % totalDuration;
      let position;
      if (localTime < quarterDuration) {
        position = Math.sin(localTime / quarterDuration * Math.PI / 2);
      } else if (localTime < quarterDuration + pauseSeconds) {
        position = 1;
      } else if (localTime < quarterDuration + pauseSeconds + activeDuration / 2) {
        const progress = (localTime - quarterDuration - pauseSeconds) / (activeDuration / 2);
        position = Math.sin(Math.PI / 2 + progress * Math.PI);
      } else if (localTime < quarterDuration + pauseSeconds * 2 + activeDuration / 2) {
        position = -1;
      } else {
        const progress = (localTime - quarterDuration - pauseSeconds * 2 - activeDuration / 2) / quarterDuration;
        position = Math.sin(Math.PI * 1.5 + progress * Math.PI / 2);
      }
      return {
        cycle: elapsed / totalDuration,
        wrapped: (position + 1) / 2,
        sine: position,
        pingPong: position / 2,
      };
    }

    const totalDuration = activeDuration + pauseSeconds;
    const localTime = ((elapsed % totalDuration) + totalDuration) % totalDuration;
    const wrapped = localTime < activeDuration ? localTime / activeDuration : 1;
    const cycle = Math.floor(elapsed / totalDuration) + wrapped;
    return { cycle, wrapped, sine: Math.sin(wrapped * Math.PI * 2), pingPong: wrapped - 0.5 };
  }

  function combineMachinePathAxes(machine, firstAmount, secondAmount) {
    const firstAxis = ["x", "y", "z"].includes(machine.animationAxis) ? machine.animationAxis : "y";
    let secondAxis = ["x", "y", "z"].includes(machine.animationSecondaryAxis) ? machine.animationSecondaryAxis : "z";
    if (secondAxis === firstAxis) secondAxis = firstAxis === "z" ? "x" : "z";
    const axisVector = (axis) => rotateVector3(axis === "x" ? [1,0,0] : axis === "y" ? [0,1,0] : [0,0,1], ...objectRotation(machine));
    const firstVector = axisVector(firstAxis);
    const secondVector = axisVector(secondAxis);
    return [0,1,2].map((index) => firstVector[index] * firstAmount + secondVector[index] * secondAmount);
  }

  function machineFourStepOffset(machine, time) {
    return fourStepOffset(
      machine,
      time,
      Number(machine.animationDistance) || 0,
      Number(machine.animationSecondaryDistance) || 0,
      (first, second) => combineMachinePathAxes(machine, first, second),
    );
  }

  function machineAnimationTransform(machine, time) {
    const identity = {
      translation: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      alpha: 1,
    };
    if (!machine.animationEnabled || machine.animationMode === "none" || (state.editing && !state.previewObjectAnimations)) return identity;
    const { cycle, wrapped, sine, pingPong } = animationWave(machine, time);
    const amount = Number(machine.animationDistance) || 0;
    const axis = machine.animationAxis || "x";
    const localDirection = axis === "x"
      ? [1,0,0]
      : axis === "y"
        ? [0,1,0]
        : axis === "z"
          ? [0,0,1]
          : [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];
    const pathDirection = rotateVector3(localDirection, ...objectRotation(machine));
    const transform = clone(identity);
    const applyOffset = (offset) => {
      transform.translation[0] += pathDirection[0] * offset;
      transform.translation[1] += pathDirection[1] * offset;
      transform.translation[2] += pathDirection[2] * offset;
    };
    if (machine.animationMode === "loop") applyOffset((wrapped - 0.5) * amount);
    else if (machine.animationMode === "pingPong") applyOffset(pingPong * amount);
    else if (machine.animationMode === "fourStep") transform.translation = machineFourStepOffset(machine, time);
    else if (machine.animationMode === "bob") transform.translation[1] += sine * amount / 2;
    else if (machine.animationMode === "spin") {
      const spin = cycle * (amount || 360);
      if (axis === "x" || axis === "all") transform.rotation[0] += spin;
      if (axis === "y" || axis === "all") transform.rotation[1] += spin;
      if (axis === "z" || axis === "all") transform.rotation[2] += spin;
    } else if (machine.animationMode === "pulse") {
      const factor = Math.max(0.08, 1 + sine * amount / 200);
      if (axis === "x" || axis === "all") transform.scale[0] *= factor;
      if (axis === "y" || axis === "all") transform.scale[1] *= factor;
      if (axis === "z" || axis === "all") transform.scale[2] *= factor;
    } else if (machine.animationMode === "blink") {
      transform.alpha *= sine > -0.15 ? 1 : 0.12;
    }
    return transform;
  }

  function combineAnimationTransforms(transforms) {
    return transforms.reduce((combined, transform) => {
      combined.translation = combined.translation.map((value, index) => value + transform.translation[index]);
      combined.rotation = combined.rotation.map((value, index) => value + transform.rotation[index]);
      combined.scale = combined.scale.map((value, index) => value * transform.scale[index]);
      combined.alpha *= transform.alpha;
      return combined;
    }, { translation: [0,0,0], rotation: [0,0,0], scale: [1,1,1], alpha: 1 });
  }

  function animationGroupPivot(groupMembers) {
    const minX = Math.min(...groupMembers.map((item) => item.x));
    const maxX = Math.max(...groupMembers.map((item) => item.x + item.w));
    const minY = Math.min(...groupMembers.map((item) => Number(item.renderY ?? item.y) || 0));
    const maxY = Math.max(...groupMembers.map((item) => (Number(item.renderY ?? item.y) || 0) + item.h));
    const minZ = Math.min(...groupMembers.map((item) => item.z));
    const maxZ = Math.max(...groupMembers.map((item) => item.z + item.d));
    return [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
  }

  function applyMachineAnimationTransform(machine, transform, pivot) {
    const rendered = { ...machine };
    const center = [
      machine.x + machine.w / 2,
      (Number(machine.renderY ?? machine.y) || 0) + machine.h / 2,
      machine.z + machine.d / 2,
    ];
    const offset = [
      (center[0] - pivot[0]) * transform.scale[0],
      (center[1] - pivot[1]) * transform.scale[1],
      (center[2] - pivot[2]) * transform.scale[2],
    ];
    const rotatedOffset = rotateVector3(offset, ...transform.rotation);
    const targetCenter = [
      pivot[0] + rotatedOffset[0] + transform.translation[0],
      pivot[1] + rotatedOffset[1] + transform.translation[1],
      pivot[2] + rotatedOffset[2] + transform.translation[2],
    ];
    rendered.w = Math.max(0.02, machine.w * transform.scale[0]);
    rendered.h = Math.max(0.02, machine.h * transform.scale[1]);
    rendered.d = Math.max(0.02, machine.d * transform.scale[2]);
    rendered.x = targetCenter[0] - rendered.w / 2;
    rendered.renderY = targetCenter[1] - rendered.h / 2;
    rendered.z = targetCenter[2] - rendered.d / 2;
    rendered.rotationX = (Number(machine.rotationX) || 0) + transform.rotation[0];
    rendered.rotationY = (Number(machine.rotationY ?? machine.rotation) || 0) + transform.rotation[1];
    rendered.rotationZ = (Number(machine.rotationZ) || 0) + transform.rotation[2];
    rendered.rotation = rendered.rotationY;
    rendered.renderAlpha = (Number(machine.renderAlpha ?? 1) || 0) * transform.alpha;
    return rendered;
  }

  function machineBasePivot(machine) {
    return [
      machine.x + machine.w / 2,
      (Number(machine.renderY ?? machine.y) || 0) + machine.h / 2,
      machine.z + machine.d / 2,
    ];
  }

  function motionAncestorChain(machine) {
    const ancestors = [];
    const visited = new Set([machine.instanceId]);
    let parentId = machine.motionParentId;
    while (parentId) {
      const parent = machineById(parentId);
      if (!parent || visited.has(parent.instanceId)) break;
      ancestors.push(parent);
      visited.add(parent.instanceId);
      parentId = parent.motionParentId;
    }
    return ancestors;
  }

  function animatedMachine(machine, time) {
    // New attached-motion assemblies are hierarchical: a child first plays its
    // own animation, then inherits each parent's animation from the nearest
    // parent outward. This keeps the child physically attached while allowing,
    // for example, X travel on a bridge that is itself travelling on Z.
    if (machine.motionParentId) {
      let rendered = applyMachineAnimationTransform(
        machine,
        localMachineAnimationTransform(machine, time),
        machineBasePivot(machine),
      );
      motionAncestorChain(machine).forEach((parent) => {
        rendered = applyMachineAnimationTransform(
          rendered,
          localMachineAnimationTransform(parent, time),
          machineBasePivot(parent),
        );
      });
      return rendered;
    }

    // Keep older saved motion groups working until the user reattaches them
    // with the hierarchical parent control.
    if (machine.animationGroupId) {
      const groupMembers = animationGroupMembers(machine.animationGroupId);
      const transforms = groupMembers.map((member) => machineAnimationTransform(member, time));
      const combined = combineAnimationTransforms(transforms);
      const pivot = animationGroupPivot(groupMembers);
      return applyMachineAnimationTransform(machine, combined, pivot);
    }

    return applyMachineAnimationTransform(
      machine,
      machineAnimationTransform(machine, time),
      machineBasePivot(machine),
    );
  }

  function visibilitySensitiveMachine(machine) {
    const design=machine?.designId ? designLibrary[machine.designId] : null;
    const identity=`${machine?.type || ""} ${machine?.name || ""} ${design?.machineType || ""} ${design?.name || ""}`.toLowerCase();
    return /crane|cutting|barefoot|furnace|temper/.test(identity);
  }

  function firstPersonVisibilityBounds(machine, rendered, time) {
    if (state.cameraMode !== "walk" || !visibilitySensitiveMachine(machine)) return rendered;
    const design=rendered?.designId ? designLibrary[rendered.designId] : null;
    if (!design) return rendered;
    const components=visibleDesignComponents(design,time).flatMap((component) => (
      component?.type === "group" ? flattenDesignComponents([component]) : [component]
    ));
    const points=[];
    for (const component of components) {
      if (component?.visible === false) continue;
      for (const point of designComponentPoints(component)) points.push(designLocalPointToWorld(rendered,design,point,1));
    }
    if (!points.length) return rendered;
    const minX=Math.min(...points.map((point)=>point[0])), maxX=Math.max(...points.map((point)=>point[0]));
    const minY=Math.min(...points.map((point)=>point[1])), maxY=Math.max(...points.map((point)=>point[1]));
    const minZ=Math.min(...points.map((point)=>point[2])), maxZ=Math.max(...points.map((point)=>point[2]));
    const padding=1.5;
    return {x:minX-padding,y:minY-padding,z:minZ-padding,w:maxX-minX+padding*2,h:maxY-minY+padding*2,d:maxZ-minZ+padding*2};
  }

  function projectedBoxVisible(item, margin = 180) {
    if (state.cameraMode === "walk") {
      // Bound first-person work by distance before projecting eight corners.
      // Quality mode keeps a much longer horizon, while nearby peripheral
      // machines still use the generous screen margin below and never blink.
      if (firstPersonDistanceToBox(item) > renderPerformance.walkDrawDistance() + WALK_DRAW_HYSTERESIS) return false;
    }

    const { centerPoint, visibleSamples } = projectedBoxMetrics(item);
    if (!visibleSamples.length) return false;
    const anchor = state.cameraMode === "walk" && centerPoint[3] < WALK_NEAR_CLIP ? visibleSamples[0] : centerPoint;
    const radius = Math.max(24, ...visibleSamples.map((point) => Math.hypot(point[0] - anchor[0], point[1] - anchor[1])));
    const safeMargin = state.cameraMode === "walk" ? Math.max(margin, 260) : margin;
    return anchor[0] + radius >= -safeMargin
      && anchor[0] - radius <= canvas.width + safeMargin
      && anchor[1] + radius >= -safeMargin
      && anchor[1] - radius <= canvas.height + safeMargin;
  }

  function designContainsAnimation(components) {
    return (components || []).some((component) => (
      component?.animationTimeline?.enabled !== false && component?.animationTimeline?.clips?.some((clip) => clip.enabled !== false)
    ) || (
      component?.animationEnabled === true && component.animationType && component.animationType !== "none"
    ) || (component?.type === "group" && designContainsAnimation(component.children)));
  }

  const designAnimationPresenceCache = new WeakMap();

  function designHasAnimation(design) {
    if (!design || typeof design !== "object") return false;
    const prepared = window.plantGeometryPrep?.get(design);
    if (prepared && typeof prepared.hasAnimation === "boolean") return prepared.hasAnimation;
    if (!designAnimationPresenceCache.has(design)) {
      designAnimationPresenceCache.set(design, designContainsAnimation(design.components));
    }
    return designAnimationPresenceCache.get(design);
  }

  function machineHasGeometryAnimation(machine, design = null) {
    return Boolean(
      machineHasLayoutMotion(machine)
      || designHasAnimation(design || (machine?.designId ? designLibrary[machine.designId] : null))
    );
  }

  function machineHasLayoutMotion(machine) {
    return Boolean(
      machine?.motionParentId
      || machine?.animationGroupId
      || (machine?.animationEnabled === true && machine.animationMode && machine.animationMode !== "none")
    );
  }

  function renderedMachineRevision(machine, rendered, alpha = 1, grow = 1) {
    return [
      machine?.instanceId,
      rendered?.x, rendered?.renderY ?? rendered?.y, rendered?.z,
      rendered?.w, rendered?.h, rendered?.d,
      rendered?.rotationX, rendered?.rotationY ?? rendered?.rotation, rendered?.rotationZ,
      rendered?.color, Number(alpha).toFixed(3), Number(grow).toFixed(3),
      rendered?.designId || "", rendered?.crane?.height || "", rendered?.crane?.capacity || "",
    ].join(":");
  }

  function visibleEntriesHaveActiveAnimations(entries) {
    if (state.animationsPaused || (state.editing && !state.previewObjectAnimations)) return false;
    return entries.some(({ machine }) => {
      if (machine.animationEnabled === true && machine.animationMode && machine.animationMode !== "none") return true;
      const design = machine.designId ? designLibrary[machine.designId] : null;
      return designHasAnimation(design);
    });
  }

  function visibleMachineEntries(time) {
    const entries = [];
    const spatialIndex = currentMachineSpatialIndex();
    const overviewBounds = state.cameraMode === "walk" ? null : overheadViewBounds();
    const indexedMachines = state.cameraMode === "walk" && spatialIndex
      ? spatialIndex.queryPoint(
          modelCenter()[0] + state.panX,
          modelCenter()[1] + state.panZ,
          renderPerformance.walkDrawDistance() + WALK_DRAW_HYSTERESIS,
        ).map((entry) => entry.machine)
      : overviewBounds && spatialIndex
        ? spatialIndex.queryBounds(overviewBounds).map((entry) => entry.machine)
        : machines;
    // Moving machines can enter the view from outside their saved index cell.
    const sourceMachines = new Set(indexedMachines);
    machines.forEach((machine) => {
      if (machineHasLayoutMotion(machine) || (state.cameraMode === "walk" && visibilitySensitiveMachine(machine)) || (combatController?.isActive?.() && combatEnemyMachine(machine))) sourceMachines.add(machine);
    });
    if (combatController?.isActive?.()) combatEnemyMachines().forEach((machine) => sourceMachines.add(machine));
    for (const machine of sourceMachines) {
      if (machine.visible === false) continue;
      if (combatController?.isEndlessZombie?.() && combatEnemyMachine(machine) && !machine.combatSpawned) continue;
      if (combatController?.isActive?.() && combatEnemyMachine(machine)) {
        const characterId=String(machine.instanceId || machine.id || machine.name || "");
        if (combatController.isCharacterOccupied?.(characterId)) continue;
      }
      const alpha = stageAlpha(machine.reveal,machine.retire);
      if (alpha <= .01) continue;
      let rendered = machineHasLayoutMotion(machine) ? animatedMachine(machine, time) : machine;
      if (combatController?.isActive?.() && combatEnemyMachine(machine)) {
        const combatState = combatController.enemyRenderState?.(machine.instanceId, time);
        if (combatState) {
          rendered = {
            ...rendered,
            x: Number(combatState.x),
            z: Number(combatState.z),
            rotationY: Number(combatState.rotationY),
            rotation: Number(combatState.rotationY),
            rotationZ: (Number(rendered.rotationZ) || 0) + (combatState.defeated ? 0 : combatState.hitReact * 5),
            renderY: (Number(rendered.renderY ?? rendered.y) || 0)
              + (combatState.defeated ? 0 : Math.abs(Math.sin(combatState.walkPhase || 0)) * .08 * combatState.movementBlend),
            combatState,
          };
        }
      }
      const visibilityBounds = state.cameraMode === "walk" ? firstPersonVisibilityBounds(machine, rendered, time) : rendered;
      let walkDistanceAlpha = 1;
      if (state.cameraMode === "walk") {
        const distance = firstPersonDistanceToBox(visibilityBounds);
        const drawDistance = renderPerformance.walkDrawDistance();
        const wasVisible = walkVisibleMachineIds.has(machine.instanceId);
        const visibilityLimit = drawDistance + (wasVisible ? WALK_DRAW_HYSTERESIS : WALK_DRAW_HYSTERESIS * .45);
        if (distance > visibilityLimit) {
          walkVisibleMachineIds.delete(machine.instanceId);
          walkLodHistory.delete(machine.instanceId);
          continue;
        }
        walkVisibleMachineIds.add(machine.instanceId);
        const fadeStart = drawDistance - WALK_DRAW_HYSTERESIS;
        const fadeProgress = clamp((distance - fadeStart) / (WALK_DRAW_HYSTERESIS * 2), 0, 1);
        walkDistanceAlpha = 1 - fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
      }
      if (!projectedBoxVisible(visibilityBounds)) continue;
      entries.push({
        kind: "machine",
        machine,
        rendered,
        alpha: alpha * walkDistanceAlpha * (Number.isFinite(Number(rendered.renderAlpha)) ? Number(rendered.renderAlpha) : 1),
        grow: clamp(state.stageFloat - machine.reveal + 1),
        depth: sceneDepth(rendered.x+rendered.w/2,rendered.z+rendered.d/2),
      });
    }
    return entries;
  }

  function visibleColumnEntries() {
    if (visibleColumnEntriesCache) return visibleColumnEntriesCache;
    const entries = [];
    const columnRoofProfile = displayedRoofProfile();
    for (const column of structuralColumns()) {
      if (isColumnHidden(column)) continue;
      const { x, z } = column;
      if (state.cameraMode === "walk" && firstPersonDistanceToBox({ x: x - 1.16, z: z - 1.16, w: 2.32, d: 2.32 }) > renderPerformance.walkDrawDistance() + WALK_DRAW_HYSTERESIS) continue;
      const height = displayedColumnHeight(column, columnRoofProfile);
      const base = project(x, 0, z);
      const top = project(x, height, z);
      if (state.cameraMode === "walk" && base[3] < WALK_NEAR_CLIP && top[3] < WALK_NEAR_CLIP) continue;
      const margin = 80;
      const left = Math.min(base[0], top[0]) - 10;
      const right = Math.max(base[0], top[0]) + 10;
      const upper = Math.min(base[1], top[1]) - 10;
      const lower = Math.max(base[1], top[1]) + 10;
      if (right < -margin || left > canvas.width + margin || lower < -margin || upper > canvas.height + margin) continue;
      entries.push({ kind: "column", column, depth: sceneDepth(x,z) });
    }
    visibleColumnEntriesCache = entries;
    return entries;
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

  function expandedShadowPolygon(points, expansion, y = 0.035) {
    const centerX = points.reduce((sum, point) => sum + point[0], 0) / Math.max(1, points.length);
    const centerZ = points.reduce((sum, point) => sum + point[2], 0) / Math.max(1, points.length);
    return points.map((point) => {
      const dx = point[0] - centerX;
      const dz = point[2] - centerZ;
      const length = Math.max(0.001, Math.hypot(dx, dz));
      return [point[0] + dx / length * expansion, y, point[2] + dz / length * expansion];
    });
  }

  function drawSoftGroundShadow(basePoints, height, strength = 1) {
    if (!basePoints || basePoints.length < 3 || height <= 0.05) return;
    const castDistance = clamp(height * 0.22, 0.35, 8);
    const castX = castDistance * -0.62;
    const castZ = castDistance * 0.78;
    const shifted = basePoints.map((point) => [point[0] + castX, 0.035, point[2] + castZ]);
    const hull = convexHullXZ([...basePoints.map((point) => [point[0], 0.035, point[2]]), ...shifted]);
    const layerCount = renderPerformance.shadowLayerCount();
    if (layerCount <= 0) return;
    const layers = layerCount >= 2
      ? [{ expansion: 1.0, alpha: 0.04 }, { expansion: 0.2, alpha: 0.085 }]
      : [{ expansion: 0.45, alpha: 0.075 }];
    layers.forEach((layer, index) => polygon(
      expandedShadowPolygon(hull, layer.expansion, 0.035 + index * 0.002),
      "#182126",
      null,
      0,
      layer.alpha * strength,
      { transparent: true, depthBias: -0.0002 - index * 0.00003 },
    ));
  }

  function shadowRectangle(x, z, w, d, y = 0.035) {
    return [[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d]];
  }

  function designComponentShadowPoints(machine, component, design, grow = 1) {
    if (!component || component.visible === false) return [];
    if (component.type === "group") return (component.children || []).flatMap((child) => designComponentShadowPoints(machine, child, design, grow));
    if (component.type === "beam") {
      const start = designPointToWorld(machine, component, design, [Number(component.x), Number(component.y), Number(component.z)], grow);
      const end = designPointToWorld(machine, component, design, [Number(component.x2), Number(component.y2), Number(component.z2)], grow);
      const thickness = Math.max(.08, Number(component.thicknessZ || component.thickness || 1) * designPlacement(machine, design).scaleZ);
      const dx = end[0] - start[0];
      const dz = end[2] - start[2];
      const length = Math.max(.001, Math.hypot(dx, dz));
      const nx = -dz / length * thickness / 2;
      const nz = dx / length * thickness / 2;
      return [[[start[0]+nx,.035,start[2]+nz],[end[0]+nx,.035,end[2]+nz],[end[0]-nx,.035,end[2]-nz],[start[0]-nx,.035,start[2]-nz]]];
    }
    const boxed = scaledComponentBox(machine, {
      ...component,
      w: Number(component.w || component.size || component.thickness || 1),
      h: Number(component.h || component.size || component.thickness || 1),
      d: Number(component.d || component.size || component.thickness || 1),
    }, design);
    return [footprint(boxed, 0, 0).map(([x,,z]) => [x,.035,z])];
  }

  function drawMachineShadowCasters(machine, rendered, alpha, grow, time) {
    if (state.cameraMode !== "walk") {
      // A single footprint shadow is visually stable in the overview and much
      // cheaper than rebuilding every animated bridge, roller, and crane part.
      // Layout-level movement still moves this footprint with the machine.
      const footprintPoints = footprint(rendered, 0, 0).map(([x,,z]) => [x, 0.045, z]);
      const strength = ["person", "animatedPerson"].includes(machine.type) ? .48 : .62;
      drawSoftGroundShadow(footprintPoints, Math.max(.5, Number(rendered.h) || .5), alpha * strength);
      return;
    }
    const design = rendered.designId ? designLibrary[rendered.designId] : null;
    if (
      state.cameraMode === "walk"
      && (!state.selectedMachineIds.has(machine.instanceId)
        || machineHasGeometryAnimation(machine, design) || machineLodLevel(rendered) < 3)
    ) {
      // Animated component shadows and far-detail shadow pieces can cross one
      // another at walking height. A retained footprint stays grounded and
      // removes the frame-to-frame flashing without hiding the machine motion.
      const footprintPoints = footprint(rendered, 0, 0).map(([x,,z]) => [x, 0.035, z]);
      drawSoftGroundShadow(footprintPoints, Math.max(.5, Number(rendered.h) || .5), alpha * .62);
      return;
    }
    if (design?.components?.length) {
      if (!shouldDrawDetailedCustomDesign(rendered, design)) {
        const footprintPoints = footprint(rendered, 0, 0).map(([x,,z]) => [x, 0.035, z]);
        drawSoftGroundShadow(footprintPoints, Math.max(.5, Number(rendered.h) || .5), alpha * .62);        return;
      }
      const shadowLimit = renderPerformance.maxShadowParts();
      if (shadowLimit <= 0) return;
      const animated = flattenDesignComponents(visibleDesignComponents(design, time))
        .slice(0, shadowLimit);
      animated.forEach((component) => {
        const componentAlpha = alpha * clamp(Number(component.opacity ?? 1), 0, 1);
        const bounds = designComponentBounds(component);
        designComponentShadowPoints(rendered, component, design, grow).forEach((points) => {
          drawSoftGroundShadow(points, Math.max(.2, bounds.maxY - bounds.minY), componentAlpha * .62);
        });
      });
      return;
    }
    if (["bridgeCrane", "craneMachine"].includes(machine.type)) {
      const post = Math.max(.25, Math.min(1.2, Math.min(rendered.w, rendered.d) * .06));
      [[rendered.x,rendered.z],[rendered.x+rendered.w-post,rendered.z],[rendered.x,rendered.z+rendered.d-post],[rendered.x+rendered.w-post,rendered.z+rendered.d-post]]
        .forEach(([x,z]) => drawSoftGroundShadow(shadowRectangle(x,z,post,post), rendered.h, alpha * .5));
      drawSoftGroundShadow(shadowRectangle(rendered.x, rendered.z + rendered.d / 2 - post / 2, rendered.w, post), rendered.h, alpha * .32);
      return;
    }
    const footprintPoints = footprint(rendered, 0, 0).map(([x,,z]) => [x, 0.035, z]);
    const strength = ["person", "animatedPerson"].includes(machine.type) ? .55 : .72;
    drawSoftGroundShadow(footprintPoints, Math.max(.5, Number(rendered.h) || .5), alpha * strength);
  }

  function drawSceneShadows(machineEntries, time) {
    const shadowBudget = renderPerformance.maxShadowMachines();
    if (shadowBudget <= 0) return;
    let shadowEntries = machineEntries;
    if (machineEntries.length > shadowBudget) {
      shadowEntries = machineEntries.map((entry) => ({
        entry,
        selected: state.selectedMachineIds.has(entry.machine.instanceId),
        screenSpan: projectedPixelSpan(entry.rendered),
        walkDistanceBucket: Math.floor(firstPersonDistanceToBox(entry.rendered) / 20),
        retainedWalkShadow: walkShadowMachineIds.has(entry.machine.instanceId),
      }))
        .sort((first, second) => (
          Number(second.selected) - Number(first.selected)
          || (state.cameraMode === "walk"
            ? (first.walkDistanceBucket - (first.retainedWalkShadow ? 2 : 0))
              - (second.walkDistanceBucket - (second.retainedWalkShadow ? 2 : 0))
              || Number(second.retainedWalkShadow) - Number(first.retainedWalkShadow)
              || String(first.entry.machine.instanceId).localeCompare(String(second.entry.machine.instanceId))
            : second.screenSpan - first.screenSpan)
        ))
        .slice(0, shadowBudget);
    }
    if (state.cameraMode === "walk") {
      walkShadowMachineIds = new Set(shadowEntries.map((candidate) => (candidate.entry || candidate).machine.instanceId));
    }
    const normalizedEntries = shadowEntries
      .map((candidate) => candidate.entry || candidate)
      .filter(({ machine, alpha }) => alpha > 0.03 && !isFloorFeatureType(machine.type));
    const animatedEntries = [];
    const staticEntries = [];
    normalizedEntries.forEach((entry) => {
      // Internal motion uses a stable contact footprint in both camera modes.
      const shadowMoves = machineHasLayoutMotion(entry.machine);
      (shadowMoves ? animatedEntries : staticEntries).push(entry);
    });
    const settingsRevision = [
      state.cameraMode,
      renderPerformance.shadowLayerCount(),
      renderPerformance.maxShadowParts(),
      shadowBudget,
    ].join(":");
    // Keep the established plant in one retained shadow batch, and isolate the
    // few objects currently fading/growing into the scene. Previously one new
    // machine invalidated and rebuilt every existing machine shadow on each
    // transition frame, with the worst spike at Today's Production.
    const settledStaticEntries = staticEntries.filter(({ alpha, grow }) => alpha >= .9999 && grow >= .9999);
    const transitioningStaticEntries = staticEntries.filter(({ alpha, grow }) => alpha < .9999 || grow < .9999);
    if (settledStaticEntries.length) {
      const revision = `${settingsRevision}|${settledStaticEntries.map(({ machine, rendered, alpha, grow }) => (
        `${renderedMachineRevision(machine, rendered, alpha, grow)}:${objectRenderIdentity(rendered.designId ? designLibrary[rendered.designId] : null)}:${machineLodLevel(rendered)}:${state.selectedMachineIds.has(machine.instanceId)}`
      )).join("|")}`;
      drawRetainedObject("plant:shadows:static", revision, () => {
        settledStaticEntries.forEach(({ machine, rendered, alpha, grow }) => drawMachineShadowCasters(machine, rendered, alpha, grow, time));
      });
    }
    transitioningStaticEntries.forEach(({ machine, rendered, alpha, grow }) => {
      const revision = `${settingsRevision}:${renderedMachineRevision(machine, rendered, alpha, grow)}:${machineLodLevel(rendered)}`;
      drawRetainedObject(`plant:shadows:transition:${machine.instanceId}`, revision,
        () => drawMachineShadowCasters(machine, rendered, alpha, grow, time));
    });
    if (animatedEntries.length) {
      animatedEntries.forEach(({ machine, rendered, alpha, grow }) => {
        const sampleTime = machineAnimationSampleTime(rendered, time);
        const shadowMachine = animatedMachine(machine, sampleTime);
        const revision = `${settingsRevision}:${sampleTime}:${renderedMachineRevision(machine, shadowMachine, alpha, grow)}`;
        drawRetainedObject(`plant:shadows:moving:${machine.instanceId}`, revision,
          () => drawMachineShadowCasters(machine, shadowMachine, alpha, grow, sampleTime));
      });
    }
    if (!renderPerformance.pillarShadowsEnabled()) return;
    const columns = visibleColumnEntries();
    const columnRoofProfile = displayedRoofProfile();
    const columnRevision = `${settingsRevision}|${columns.map(({ column }) => `${column.key}:${column.x}:${column.z}:${displayedColumnHeight(column, columnRoofProfile)}`).join("|")}`;
    drawRetainedObject("plant:shadows:columns", columnRevision, () => {
      columns.forEach(({ column }) => {
        const { x, z } = column;
        const size = 2.32;
        drawSoftGroundShadow([
          [x-size/2,0.035,z-size/2], [x+size/2,0.035,z-size/2],
          [x+size/2,0.035,z+size/2], [x-size/2,0.035,z+size/2],
        ], displayedColumnHeight(column, columnRoofProfile), 0.55);
      });
    });
  }

  function drawSharedDesignInstances(machineEntries, time) {
    if (
      !depthRenderer.available
      || typeof depthRenderer.beginTemplate !== "function"
      || typeof depthRenderer.addGeometryInstances !== "function"
    ) return new Set();
    const groups = new Map();
    machineEntries.forEach((entry) => {
      const { machine, rendered, alpha, grow } = entry;
      if (combatController?.isActive?.() && combatEnemyMachine(machine)) return;
      const design = rendered.designId ? designLibrary[rendered.designId] : null;
      const lodLevel = machineLodLevel(rendered);
      if (
        !design
        || lodLevel < 2
        || designRenderPartCount(design) <= 4
        || state.editing
        || machineHasGeometryAnimation(machine, design)
        || state.selectedMachineIds.has(machine.instanceId)
        || alpha < .985
        || grow < .999
      ) return;
      const key = `${rendered.designId}:${rendered.color || "#68777a"}:lod-${lodLevel}:curves-${machineCurveSegments(rendered)}`;
      if (!groups.has(key)) groups.set(key, { key, design, lodLevel, entries: [] });
      groups.get(key).entries.push(entry);
    });
    const instancedIds = new Set();
    groups.forEach(({ key, design, lodLevel, entries }) => {
      if (entries.length < 2) return;
      const base = designBaseDimensions(design, entries[0].rendered);
      const templateKey = `plant:design-template:${key}`;
      const templateRevision = [
        objectRenderIdentity(design),
        design.updatedAt || "",
        `lod-${lodLevel}`,
        renderPerformance.settings?.mode || "auto",
      ].join(":");
      const shouldBuild = depthRenderer.beginTemplate(templateKey, templateRevision) !== false;
      if (shouldBuild) {
        const canonical = {
          ...entries[0].rendered,
          instanceId: `template:${key}`,
          x: -base.w / 2,
          y: -base.h / 2,
          renderY: -base.h / 2,
          z: -base.d / 2,
          w: base.w,
          h: base.h,
          d: base.d,
          rotation: 0,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          designScaleMode: "stretch",
          scaleEditMode: "individual",
        };
        const previousReusableState = recordingReusableGeometry;
        recordingReusableGeometry = true;
        try {
          drawCustomDesign(canonical, 1, 1, time, lodLevel, null, machineCurveSegments(entries[0].rendered));
        } finally {
          recordingReusableGeometry = previousReusableState;
          depthRenderer.endTemplate();
        }
      }
      const instances = entries.map(({ rendered }) => {
        const placement = designPlacement(rendered, design);
        return {
          x: Number(rendered.x) + Number(rendered.w) / 2,
          y: Number(rendered.renderY ?? rendered.y) + Number(rendered.h) / 2,
          z: Number(rendered.z) + Number(rendered.d) / 2,
          offsetY: base.h * placement.scaleY / 2 - Number(rendered.h) / 2,
          scaleX: placement.scaleX,
          scaleY: placement.scaleY,
          scaleZ: placement.scaleZ,
          rotationX: rendered.rotationX,
          rotationY: rendered.rotationY ?? rendered.rotation,
          rotationZ: rendered.rotationZ,
        };
      });
      const revision = entries.map(({ machine, rendered, alpha, grow }) => renderedMachineRevision(machine, rendered, alpha, grow)).join("|");
      if (depthRenderer.addGeometryInstances(`plant:design-instances:${key}`, templateKey, instances, revision)) {
        entries.forEach(({ machine }) => instancedIds.add(machine.instanceId));
      }
    });
    return instancedIds;
  }

  const machineCurveHistory = new Map();
  function machineCurveSegments(machine) {
    const maximum = renderPerformance.cylinderSegments(32);
    if (state.editing || state.selectedMachineIds.has(machine.instanceId)
      || renderPerformance.settings?.mode === "quality") return maximum;
    const span = projectedPixelSpan(machine) / Math.max(.75, renderPerformance.pixelRatio(window.devicePixelRatio));
    const previous = machineCurveHistory.get(machine.instanceId) || 8;
    // Hysteresis keeps topology stable while the camera crosses a distance band.
    const segments = span > (previous > 8 ? 110 : 145) ? maximum : 8;
    machineCurveHistory.set(machine.instanceId, segments);
    return segments;
  }

  function machineAnimationSampleTime(machine, time) {
    const span = projectedPixelSpan(machine) / Math.max(.75, renderPerformance.pixelRatio(window.devicePixelRatio));
    const interval = state.selectedMachineIds.has(machine.instanceId) || span > 220
      ? 1000 / 60 : span > 85 ? 1000 / 30 : 1000 / 20;
    // Sample the shared clock; never advance an offscreen object's private clock.
    return state.animationsPaused ? state.animationPausedAt : Math.floor(time / interval) * interval;
  }

  function affineMatrixFromPoints(origin, x, y, z) {
    return [
      x[0]-origin[0], x[1]-origin[1], x[2]-origin[2], 0,
      y[0]-origin[0], y[1]-origin[1], y[2]-origin[2], 0,
      z[0]-origin[0], z[1]-origin[1], z[2]-origin[2], 0,
      origin[0], origin[1], origin[2], 1,
    ];
  }

  function designInstanceMatrix(machine, design, component = null) {
    const base = component || designBaseDimensions(design, machine);
    const origin = [Number(base.x), Number(base.y), Number(base.z)];
    const dimensions = component ? [Number(base.w), Number(base.h), Number(base.d)] : [1,1,1];
    const world = (point) => component
      ? designPointToWorld(machine, component, design, point)
      : designLocalPointToWorld(machine, design, point);
    return affineMatrixFromPoints(world(origin), ...dimensions.map((size, axis) => (
      world(origin.map((value, index) => value + (axis === index ? size : 0)))
    )));
  }

  // Matrix construction applies every machine/component rotation and scale and
  // is one of the hottest CPU paths in a detailed animated overview. Reuse the
  // most recent matrix for each part while its sampled animation frame is
  // unchanged. The bounded map prevents a long editing session from retaining
  // deleted machines forever.
  const productionInstanceMatrixCache = new Map();
  function cachedProductionInstanceMatrix(machine, design, component, partKey, revision) {
    const key = `${machine.instanceId}:${partKey}`;
    const cached = productionInstanceMatrixCache.get(key);
    if (cached?.revision === revision) return cached.matrix;
    const matrix = designInstanceMatrix(machine, design, component);
    productionInstanceMatrixCache.delete(key);
    productionInstanceMatrixCache.set(key, { revision, matrix });
    if (productionInstanceMatrixCache.size > 4096) {
      productionInstanceMatrixCache.delete(productionInstanceMatrixCache.keys().next().value);
    }
    return matrix;
  }

  function recordGeometryTemplate(key, revision, callback) {
    if (depthRenderer.beginTemplate(key, revision) === false) return;
    const previous = recordingReusableGeometry;
    const previousOutlines = suppressGeometryOutlines;
    recordingReusableGeometry = true;
    suppressGeometryOutlines = true;
    try { callback(); } finally {
      recordingReusableGeometry = previous;
      suppressGeometryOutlines = previousOutlines;
      depthRenderer.endTemplate();
    }
  }

  function drawProductionDesignInstances(entries, time) {
    const handled = new Set();
    if (!depthRenderer.available || !depthRenderer.addGeometryInstances || state.editing) return handled;
    const batches = new Map();
    const queue = (key, templateKey, instance, revision) => {
      if (!batches.has(key)) batches.set(key, { templateKey, instances: [], revisions: [] });
      const batch = batches.get(key);
      batch.instances.push(instance);
      batch.revisions.push(revision);
    };
    for (const { machine, rendered, alpha, grow } of entries) {
      if (combatController?.isActive?.() && combatEnemyMachine(machine)) continue;
      const design = designLibrary[rendered.designId];
      if (!design || !machineHasGeometryAnimation(machine, design) || machineLodLevel(rendered) < 2
        || state.selectedMachineIds.has(machine.instanceId) || alpha < .9999 || grow < .9999) continue;
      const partition = designRenderPartition(design);
      const segments = machineCurveSegments(rendered);
      const sampleTime = machineAnimationSampleTime(rendered, time);
      const base = designBaseDimensions(design, rendered);
      const placementRevision = renderedMachineRevision(machine, rendered, alpha, grow);
      const designRevision = objectRenderIdentity(design);
      if (partition.stationary.length) {
        const templateKey = `plant:production-static:${rendered.designId}:${rendered.color}:${segments}`;
        recordGeometryTemplate(templateKey, designRevision, () => {
          const canonical = { ...rendered, x:0, y:0, renderY:0, z:0, w:base.w, h:base.h, d:base.d,
            rotation:0, rotationX:0, rotationY:0, rotationZ:0, scaleEditMode:"individual", designScaleMode:"stretch" };
          drawCustomDesign(canonical, 1, 1, time, 3, partition.stationary, segments);
        });
        queue(`${templateKey}:batch`, templateKey, {
          matrix: cachedProductionInstanceMatrix(
            rendered,
            design,
            null,
            "stationary-body",
            `${placementRevision}:${designRevision}`,
          ),
        }, placementRevision);
      }
      const fallback = [];
      const moving = sampledMovingComponents(design, sampleTime);
      moving.forEach((component, index) => {
        const opacity = Number(component.opacity ?? 1);
        // These shapes are affine: keep one unit mesh and upload transforms.
        // Beams, wheels and roller assemblies retain the shape-aware renderer.
        if (!["box", "glassPanel", "text", "cylinder", "cone", "sphere", "wedge"].includes(component.type)
          || opacity < .9999 || ![component.w, component.h, component.d].every((value) => Number(value) >= .002)) {
          fallback.push(component);
          return;
        }
        const color = component.color || rendered.color || "#68777a";
        const curveCount = Math.min(segments, renderPerformance.cylinderSegments(component.segments || 20));
        const templateKey = `plant:moving-part:${component.type}:${color}:${curveCount}`;
        recordGeometryTemplate(templateKey, "unit-v1", () => {
          const unit = { x:0,y:0,z:0,w:1,h:1,d:1,rotation:0,rotationX:0,rotationY:0,rotationZ:0,
            scaleEditMode:"individual", designScaleMode:"stretch", color };
          const part = { ...unit, type:component.type, segments:curveCount };
          const unitDesign = { base: {x:0,y:0,z:0,w:1,h:1,d:1} };
          if (["box", "glassPanel", "text"].includes(part.type)) drawDesignBox(unit, part, unitDesign, 1);
          else if (part.type === "sphere") drawDesignSphere(unit, part, unitDesign, 1, 1);
          else if (part.type === "wedge") drawDesignWedge(unit, part, unitDesign, 1, 1);
          else drawDesignCylinder(unit, part, unitDesign, 1, 1, part.type === "cone" ? 0 : 1);
        });
        // Copied nested groups can retain the same child IDs. The Designer
        // renders those children directly, but the production matrix cache
        // previously treated every repeated ID as the same part and stacked
        // beams/cups at the first child's transform. Include the deterministic
        // flattened render position so every visible child owns one cache slot.
        const componentKey = `${index}:${component.id || "component"}`;
        const componentRevision = `${placementRevision}:${designRevision}:${sampleTime}:${componentKey}`;
        queue(`${templateKey}:batch`, templateKey, {
          matrix: cachedProductionInstanceMatrix(rendered, design, component, componentKey, componentRevision),
        }, componentRevision);
      });
      if (fallback.length) {
        drawRetainedObject(`plant:production-moving:${machine.instanceId}`,
          `${placementRevision}:${designRevision}:${sampleTime}:${segments}`, () => {
            drawCustomDesign(rendered, alpha, grow, sampleTime, 3, fallback, segments);
          });
      }
      handled.add(machine.instanceId);
    }
    batches.forEach((batch, key) => depthRenderer.addGeometryInstances(key, batch.templateKey, batch.instances, batch.revisions.join("|")));
    return handled;
  }

  // The viewer is drawn on a 2D canvas, so there is no hardware depth buffer.
  // Columns and equipment must therefore share one painter-order list. Drawing
  // all columns first made front columns disappear behind equipment, while the
  // old outline pass made rear columns show through solid machines. Sorting both
  // object types together gives the expected result: rear columns are covered by
  // machinery and front columns remain visible without any see-through outline.
  function drawWorldMachineLabels(machineEntries, time) {
    if (combatLabelsSuppressed() || !WORLD_MACHINE_LABELS || !state.showLabels || state.labelMode === "off") return;
    if (typeof depthRenderer.addWorldLabel !== "function") return;
    (machineEntries || []).forEach(({ machine, rendered, alpha }) => {
      if (!machine || !rendered || alpha <= .15 || isFloorFeatureType(machine.type)) return;
      if (machine.showLabel === false) return;
      const profile = machineLabelProfile(machine);
      if (isTodayStage() && state.todayLabelMode === "necessary" && machine.labelShowToday !== true) return;
      const text = displayMachineLabel(machine, profile);
      if (!text) return;
      const labelAnchorX = clamp(Number(machine.labelAnchorXPercent ?? 50), -1000, 1100);
      const labelAnchorY = clamp(Number(machine.labelAnchorYPercent ?? 100), -1000, 1100);
      const labelAnchorZ = clamp(Number(machine.labelAnchorZPercent ?? 50), -1000, 1100);
      const anchor = localPoint(
        rendered,
        rendered.w * labelAnchorX / 100,
        rendered.h * labelAnchorY / 100,
        rendered.d * labelAnchorZ / 100,
      );
      // Keep the leader attached to the nearest point on the machine even when
      // the billboard itself is intentionally moved beyond the machine bounds.
      const leaderAnchor = localPoint(
        rendered,
        rendered.w * clamp(labelAnchorX, 0, 100) / 100,
        rendered.h * clamp(labelAnchorY, 0, 100) / 100,
        rendered.d * clamp(labelAnchorZ, 0, 100) / 100,
      );
      const x = anchor[0] + clamp(Number(machine.labelWorldOffsetX ?? 0), -80, 80);
      const y = anchor[1] + Math.max(0, clamp(Number(machine.labelHeightOffset ?? 4), 0, 200));
      const z = anchor[2] + clamp(Number(machine.labelWorldOffsetZ ?? 0), -80, 80);
      const sizeMultiplier = Math.max(5, Number(machine.labelSizePercent) || 100) / 100;
      const baseHeight = profile.rank >= 4 ? 4.6 : profile.rank <= 1 ? 2.8 : 3.5;
      const labelHeight = Math.max(.25, baseHeight * sizeMultiplier);
      const zoomFactor = Math.max(.05, state.zoom / OVERVIEW_CAMERA.zoom);
      const zoomMinimum = clamp(Number(machine.labelZoomMinPercent ?? 88) / 100, .7, 1);
      const zoomMaximum = clamp(Number(machine.labelZoomMaxPercent ?? 112) / 100, 1, 1.4);
      const adaptiveScale = clamp(Math.pow(zoomFactor, .22), zoomMinimum, zoomMaximum);
      const displayedLabelHeight = labelHeight * adaptiveScale;
      const borderColor = /^#[0-9a-f]{6}$/i.test(String(machine.labelLineColor || ""))
        ? machine.labelLineColor
        : colors.teal;
      depthRenderer.addWorldLabel(`plant:world-label:${machine.instanceId}`, {
        text,
        position: [x, y, z],
        height: labelHeight,
        depth: clamp(Number(machine.labelDepthFeet ?? .35), .1, 2),
        textExtrudeFeet: clamp(Number(machine.labelTextExtrudeFeet ?? .065), .02, .3),
        rotationY: clamp(Number(machine.labelRotationY ?? 0), -180, 180),
        turnToCamera: machine.labelTurnToCamera !== false,
        turnSpeedPercent: clamp(Number(machine.labelTurnSpeedPercent ?? 100), 25, 200),
        glowStrength: clamp(Number(machine.labelGlowPercent ?? 55), 0, 100),
        fontWeight: machine.labelFontWeight || "semibold",
        zoomFactor,
        zoomMinPercent: clamp(Number(machine.labelZoomMinPercent ?? 88), 70, 100),
        zoomMaxPercent: clamp(Number(machine.labelZoomMaxPercent ?? 112), 100, 140),
        opacity: clamp(alpha, .25, 1),
        textColor: machine.labelTextColor || "#ffffff",
        backgroundColor: machine.labelBackgroundColor || "#132126",
        borderColor,
      });
      depthRenderer.addLine?.(
        leaderAnchor,
        [x, y - displayedLabelHeight * .52, z],
        borderColor,
        Math.max(1, Number(machine.labelLineWidth) || 1.25),
        clamp((Number(machine.labelLineOpacity) || 100) / 100, .15, 1),
        { depthBias: -0.0002 },
      );
    });
  }

  function drawSceneObjects(time, presentPhysicalScene = null) {
    const overlappingIds = state.editing ? overlapIds() : new Set();
    const machineEntries = visibleMachineEntries(time);
    state.visibleAnimationsActive = visibleEntriesHaveActiveAnimations(machineEntries) || processFlowAnimationActive();
    detailedPartBudgetRemaining = renderPerformance.maxDetailedParts?.() ?? Number.POSITIVE_INFINITY;
    detailedMachineBudgetRemaining = renderPerformance.maxDetailedMachines?.() ?? Number.POSITIVE_INFINITY;
    machineEntries
      .map((entry) => ({
        ...entry,
        selected: state.selectedMachineIds.has(entry.machine.instanceId),
        screenSpan: projectedPixelSpan(entry.rendered),
      }))
      .sort((first, second) => Number(second.selected) - Number(first.selected) || second.screenSpan - first.screenSpan)
      .forEach(({ rendered }) => {
        shouldDrawDetailedMachine(rendered);
        if (rendered.designId && designLibrary[rendered.designId]) {
          shouldDrawDetailedCustomDesign(rendered, designLibrary[rendered.designId]);
        }
      });
    drawSceneShadows(machineEntries, time);
    const columnEntries = visibleColumnEntries();
    const useInstancedColumns = typeof depthRenderer.addBoxInstances === "function";
    if (useInstancedColumns) {
      const painted = paintProgress(state.paint.columnStageId, 3);
      const size = 2.1 + (2.32 - 2.1) * painted;
      const color = blendHexColors(state.paint.columnBefore, state.paint.columnAfter, painted);
      const columnRoofProfile = displayedRoofProfile();
      const columnBoxes = columnEntries.map(({ column }) => ({
        x: column.x - size / 2,
        y: 0,
        z: column.z - size / 2,
        w: size,
        h: displayedColumnHeight(column, columnRoofProfile),
        d: size,
        color,
      }));
      const columnRevision = `${size.toFixed(3)}:${color}|${columnEntries.map(({ column }) => `${column.key}:${column.x}:${column.z}:${displayedColumnHeight(column, columnRoofProfile)}`).join("|")}`;
      depthRenderer.addBoxInstances("plant:structural-columns", columnBoxes, columnRevision);
    }
    const instancedProxyEntries = typeof depthRenderer.addBoxInstances === "function"
      ? machineEntries.filter(({ machine, rendered, alpha, grow }) => (
          machineLodLevel(rendered) < 2 && alpha >= .985 && grow >= .999
          && !(combatController?.isActive?.() && combatEnemyMachine(machine))
        ))
      : [];
    if (instancedProxyEntries.length) {
      const proxyBoxes = instancedProxyEntries.map(({ rendered }) => ({
        x: rendered.x,
        y: Number(rendered.renderY ?? rendered.y) || 0,
        z: rendered.z,
        w: rendered.w,
        h: machineLodLevel(rendered) === 0 ? Math.min(1.2, rendered.h) : rendered.h,
        d: rendered.d,
        rotationX: rendered.rotationX,
        rotationY: rendered.rotationY ?? rendered.rotation,
        rotationZ: rendered.rotationZ,
        color: rendered.color || "#68777a",
      }));
      const proxyRevision = instancedProxyEntries.map(({ machine, rendered, alpha, grow }) => (
        `${renderedMachineRevision(machine, rendered, alpha, grow)}:${machineLodLevel(rendered)}`
      )).join("|");
      depthRenderer.addBoxInstances("plant:machine-lod-proxies", proxyBoxes, proxyRevision);
    }
    const instancedProxyIds = new Set(instancedProxyEntries.map(({ machine }) => machine.instanceId));
    const instancedDesignIds = drawSharedDesignInstances(machineEntries, time);
    drawProductionDesignInstances(machineEntries, time).forEach((id) => instancedDesignIds.add(id));
    const sceneEntries = [
      ...(useInstancedColumns ? [] : columnEntries),
      ...machineEntries.filter(({ machine }) => !instancedProxyIds.has(machine.instanceId)),
    ];
    if (!depthRenderer.available) sceneEntries.sort((first,second) => first.depth-second.depth);

    sceneEntries.forEach((entry) => {
      if (entry.kind === "column") {
        drawColumn(entry.column);
        return;
      }
      const { machine, rendered, alpha, grow } = entry;
      const design = rendered.designId ? designLibrary[rendered.designId] : null;
      const animated = !instancedDesignIds.has(machine.instanceId) && machineHasGeometryAnimation(machine, design);
      const revision = [
        rendered.x, rendered.y, rendered.z, rendered.w, rendered.h, rendered.d,
        rendered.rotationX, rendered.rotationY ?? rendered.rotation, rendered.rotationZ,
        rendered.color, rendered.type, rendered.designId || "", machineLodLevel(rendered),
        instancedDesignIds.has(machine.instanceId) ? "shared-design" : "individual-design",
        alpha.toFixed(3), grow.toFixed(3), rendered.crane?.height || "", rendered.crane?.capacity || "",
        animated ? Math.floor(time / (renderPerformance.animationSampleMs?.() || 33)) : "static",
        design ? objectRenderIdentity(design) : "",
        machineCurveSegments(rendered),
      ].join("|");
      drawRetainedObject(`plant:machine:${machine.instanceId}`, revision, () => {
        drawCrane(rendered,alpha);
        if (!instancedDesignIds.has(machine.instanceId)) drawMachineShape(rendered,alpha,grow,time);
      });
    });

    // Today production routes are physical world-space floor geometry. Submit
    // them before the scene is presented so the depth buffer lets machines hide
    // route sections correctly.
    const todayProductionFlow = isTodayStage() ? drawTodayProductionFlow(machineEntries, time) : null;

    // World-space labels and Combat Mode effects are physical depth-tested scene geometry.
    // Submitting impacts, blood, rockets and tracers before the scene is presented keeps
    // them from bleeding through machines, walls or structural pillars.
    drawWorldMachineLabels(machineEntries, time);
    drawCombatRemotePlayers(time);
    drawCombatWorldEffects(time);
    state.visibleAnimationsActive = state.visibleAnimationsActive || Boolean(depthRenderer.worldLabelsAnimating?.());
    presentPhysicalScene?.();
    // Remote-player identity tags are screen-space UI, so draw them only after
    // the depth scene has been presented. Each tag shows both the lobby player
    // name and the plant character they selected.
    drawCombatRemotePlayerLabels(time);

    // Editor marks and route editing handles are UI overlays.
    machineEntries.forEach(({ machine, rendered }) => {
      drawOverlapIndicator(machine, overlappingIds);
      drawSelection(rendered);
    });
    drawTodayProductionFlowOverlay(todayProductionFlow);
    if (SCREEN_SPACE_LABELS && (!isTodayStage() || isTodayOverview())) {
      // Construction stages use each machine label's independent reveal/retire
      // window. Legacy layouts default to the original one-stage label behavior.
      const labelBudget = smartLabelBudget();
    let ordinaryLabelsDrawn = 0;
    const repeatedLabelsDrawn = new Map();
    const activeLabelKeys = new Set();
    const stageSpecificLabels = state.cameraMode !== "walk" && !isTodayStage();
    const necessaryTodayLabels = isTodayOverview() && state.todayLabelMode === "necessary";
    const labelCandidates = machineEntries
      .filter(({ machine, alpha }) => (
        alpha > .15 &&
        (machine.showLabel !== false || stageSpecificLabels || necessaryTodayLabels)
      ))
      .map((entry) => {
        const labelKey = String(entry.machine.instanceId);
        activeLabelKeys.add(labelKey);
        const selected = state.selectedMachineIds.has(entry.machine.instanceId);
        const labelReveal = Number.isFinite(Number(entry.machine.labelReveal)) ? Number(entry.machine.labelReveal) : Number(entry.machine.reveal) || 0;
        const labelRetire = Number.isFinite(Number(entry.machine.labelRetire)) ? Number(entry.machine.labelRetire) : labelReveal;
        const labelTimelineAlpha = stageAlpha(labelReveal, labelRetire);
        const current = Math.round(state.stageFloat) === labelReveal;
        const stageCurrent = state.stage === labelReveal;
        const flow = necessaryTodayLabels ? assignedProcessFlowForMachine(entry.machine) : null;
        const profile = machineLabelProfile(entry.machine);
        const text = displayMachineLabel(entry.machine, profile);
        const repeatKey = necessaryTodayLabels || stageSpecificLabels
          ? labelKey
          : `${entry.machine.type || "generic"}|${text.toLocaleLowerCase()}`;
        const priorVisual = labelVisualStates.get(labelKey);
        const wasVisible = Boolean(priorVisual?.targetVisible || priorVisual?.alpha > .5);
        let eligible;
        if (stageSpecificLabels) {
          eligible = selected || (labelTimelineAlpha > .15 && isStageEquipmentLabelCandidate(entry.machine));
        } else if (necessaryTodayLabels) {
          eligible = entry.machine.labelShowToday === true;
        } else if (isTodayOverview()) {
          eligible = selected || isStageEquipmentLabelCandidate(entry.machine);
        } else {
          eligible = shouldShowSmartLabel(profile, selected, current, wasVisible);
        }
        return {
          ...entry,
          selected,
          current,
          stageCurrent,
          flow,
          flowOrder: flow?.order ?? 99,
          profile,
          text,
          repeatKey,
          labelKey,
          eligible,
        };
      })
      .sort((first, second) => (
        Number(second.selected) - Number(first.selected) ||
        Number(second.eligible) - Number(first.eligible) ||
        first.flowOrder - second.flowOrder ||
        Number(second.current) - Number(first.current) ||
        second.profile.rank - first.profile.rank ||
        second.rendered.w * second.rendered.d - first.rendered.w * first.rendered.d
      ));

    labelCandidates.forEach(({ machine, rendered, selected, current, stageCurrent, flow, profile, text, repeatKey, labelKey, eligible }) => {
      const priority = selected || (stageSpecificLabels && stageCurrent);
      const repeatedCount = repeatedLabelsDrawn.get(repeatKey) || 0;
      const withinBudget = priority || ordinaryLabelsDrawn < labelBudget;
      const withinRepeatLimit = priority || repeatedCount < smartLabelRepeatLimit(profile);
      const visibleTarget = Boolean(text) && eligible && withinBudget && withinRepeatLimit;
      const pointerAnchor = localPoint(
        rendered,
        rendered.w * clamp(Number(machine.labelAnchorXPercent ?? 50), -1000, 1100) / 100,
        rendered.h * clamp(Number(machine.labelAnchorYPercent ?? 100), -1000, 1100) / 100,
        rendered.d * clamp(Number(machine.labelAnchorZPercent ?? 50), -1000, 1100) / 100,
      );
      const result = label(
        text,
        pointerAnchor[0], pointerAnchor[1], pointerAnchor[2],
        current ? colors.orange : colors.teal,
        {
          labelKey,
          time,
          visibleTarget,
          labelLiftFeet: clamp(Number(machine.labelHeightOffset ?? 4), 0, 200),
          forceVisible: stageSpecificLabels || necessaryTodayLabels || (
            isTodayOverview() &&
            ["full", "abbreviated"].includes(state.todayLabelMode)
          ),
          priority,
          selected,
          current,
          cssSize: profile.cssSize,
          textColor: machine.labelTextColor,
          backgroundColor: machine.labelBackgroundColor,
          worldOffsetX: clamp(Number(machine.labelWorldOffsetX ?? 0), -80, 80),
          worldOffsetZ: clamp(Number(machine.labelWorldOffsetZ ?? 0), -80, 80),
          lineColor: machine.labelLineColor,
          lineWidth: machine.labelLineWidth,
          lineOpacity: machine.labelLineOpacity,
          lineStyle: machine.labelLineStyle,
          lineShape: machine.labelLineShape,
          leaderSide: machine.labelLeaderSide,
          targetStyle: machine.labelTargetStyle,
          targetSize: machine.labelTargetSize,
          fontWeight: machine.labelFontWeight,
        }
      );
      if (result.targetVisible) {
        repeatedLabelsDrawn.set(repeatKey, repeatedCount + 1);
        if (!priority) ordinaryLabelsDrawn += 1;
      }
    });
      trimLabelVisualStates(activeLabelKeys, time);
    } else {
      // Today in first-person keeps the view clean; the production-flow overlay
      // is an overview aid rather than a wall of floating labels.
      trimLabelVisualStates(new Set(), time);
    }

    machineEntries.forEach(({ rendered, alpha, grow }) => {
      const design = rendered.designId ? designLibrary[rendered.designId] : null;
      if (alpha > .08 && design && shouldDrawDetailedCustomDesign(rendered, design)) {
        drawDesignTextLabels(rendered, alpha, grow, time);
      }
    });
  }

  function drawDesignTextLabels(machine, alpha, grow, time) {
    const design = machine.designId ? designLibrary[machine.designId] : null;
    if (!design || !Array.isArray(design.components)) return;
    const visit = (component, inheritedOpacity = 1) => {
      if (!component || component.visible === false) return;
      const opacity = inheritedOpacity * clamp(Number(component.opacity ?? 1), 0, 1);
      if (component.type === "group") {
        (component.children || []).forEach((child) => visit(child, opacity));
        return;
      }
      if (component.type !== "text" || !String(component.text || "").trim()) return;
      const renderedComponent = animateDesignComponent(component, time, design);
      const center = designComponentCenter(renderedComponent);
      const world = designLocalPointToWorld(machine, design, center, grow);
      const widthPoint = designLocalPointToWorld(machine, design, [center[0] + Number(renderedComponent.w) / 2, center[1], center[2]], grow);
      const screen = project(...world);
      const widthScreen = Math.max(34, Math.hypot(...project(...widthPoint).slice(0,2).map((value, index) => value - screen[index])) * 2);
      const fontSize = clamp(widthScreen / Math.max(3, String(renderedComponent.text).length * .58), 9, 30);
      ctx.save();
      ctx.globalAlpha = alpha * opacity;
      ctx.font = `800 ${fontSize}px "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(2, fontSize * .14);
      ctx.strokeStyle = "rgba(14,28,26,.72)";
      ctx.fillStyle = /^#[0-9a-f]{6}$/i.test(renderedComponent.textColor || "") ? renderedComponent.textColor : "#ffffff";
      ctx.strokeText(String(renderedComponent.text), screen[0], screen[1], widthScreen * .86);
      ctx.fillText(String(renderedComponent.text), screen[0], screen[1], widthScreen * .86);
      ctx.restore();
    };
    design.components.forEach((component) => visit(component));
  }

  function niceRulerStep(span) {
    const target = Math.max(1, span / 10);
    const magnitude = 10 ** Math.floor(Math.log10(target));
    const normalized = target / magnitude;
    const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return factor * magnitude;
  }

  function drawLayoutRulers() {
    if (!state.editing || state.cameraMode === "walk") return;
    const [minX, minZ, maxX, maxZ] = floorBounds();
    const y = .2;
    const majorStep = niceRulerStep(Math.max(maxX - minX, maxZ - minZ));
    const minorStep = majorStep / 5;
    const tickLength = Math.max(1.4, majorStep * .055);
    const edgeColor = "rgba(20,89,82,.9)";
    const tickColor = "rgba(34,108,99,.76)";
    [[minX,minZ,maxX,minZ],[maxX,minZ,maxX,maxZ],[maxX,maxZ,minX,maxZ],[minX,maxZ,minX,minZ]].forEach(([x1,z1,x2,z2]) => {
      overlayLine3d([x1,y,z1],[x2,y,z2],edgeColor,2,1);
    });

    const labels = [];
    const addLabel = (text, point) => labels.push({ text, point: project(...point) });
    let index = 0;
    for (let x = minX; x <= maxX + minorStep * .1; x += minorStep, index += 1) {
      const major = index % 5 === 0;
      const length = major ? tickLength : tickLength * .48;
      overlayLine3d([x,y,minZ],[x,y,minZ + length],tickColor,major ? 1.8 : 1,major ? .95 : .62);
      overlayLine3d([x,y,maxZ],[x,y,maxZ - length],tickColor,major ? 1.8 : 1,major ? .95 : .62);
      if (major) addLabel(`${Math.round(x - minX)} ft`, [x,y,minZ + tickLength * 1.8]);
    }
    index = 0;
    for (let z = minZ; z <= maxZ + minorStep * .1; z += minorStep, index += 1) {
      const major = index % 5 === 0;
      const length = major ? tickLength : tickLength * .48;
      overlayLine3d([minX,y,z],[minX + length,y,z],tickColor,major ? 1.8 : 1,major ? .95 : .62);
      overlayLine3d([maxX,y,z],[maxX - length,y,z],tickColor,major ? 1.8 : 1,major ? .95 : .62);
      if (major && index > 0) addLabel(`${Math.round(z - minZ)} ft`, [minX + tickLength * 1.8,y,z]);
    }

    addLabel(`${Math.round(maxX - minX)} ft wide`, [(minX + maxX) / 2,y,minZ + tickLength * 3]);
    addLabel(`${Math.round(maxZ - minZ)} ft long`, [minX + tickLength * 3,y,(minZ + maxZ) / 2]);
    const pixelScale = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
    ctx.save();
    ctx.font = `700 ${10 * pixelScale}px "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    labels.forEach(({ text, point }) => {
      if (point[0] < -80 || point[0] > canvas.width + 80 || point[1] < -40 || point[1] > canvas.height + 40) return;
      const width = ctx.measureText(text).width + 8 * pixelScale;
      const height = 17 * pixelScale;
      ctx.fillStyle = "rgba(248,252,250,.9)";
      ctx.fillRect(point[0] - width / 2, point[1] - height / 2, width, height);
      ctx.strokeStyle = "rgba(34,108,99,.5)";
      ctx.strokeRect(point[0] - width / 2, point[1] - height / 2, width, height);
      ctx.fillStyle = "#155b55";
      ctx.fillText(text, point[0], point[1]);
    });
    ctx.restore();
  }

  let canvasSizeDirty = true;
  let lastSkyPosition = "";

  function updateSkyBackground() {
    if (!modelFrame) return;
    // Move a wide, repeating panorama opposite the camera rotation. The
    // seamless horizontal wrap reads as a cloud sphere surrounding the plant
    // without adding another WebGL scene or texture upload.
    const horizontal = Math.round(-state.yaw * 245);
    const verticalOffset = state.cameraMode === "walk" ? state.walkVerticalOffset * 3 : 0;
    const vertical = Math.round(clamp(state.pitch * 115 + verticalOffset, -120, 170));
    const position = `${horizontal}:${vertical}`;
    if (position === lastSkyPosition) return;
    lastSkyPosition = position;
    modelFrame.style.setProperty("--sky-x", `${horizontal}px`);
    modelFrame.style.setProperty("--sky-y", `${vertical}px`);
  }

  function updateCanvasSize(force = false) {
    if (!force && !canvasSizeDirty) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = renderPerformance.pixelRatio(window.devicePixelRatio || 1);
    const width = Math.round(rect.width * ratio);
    const height = Math.round(rect.height * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // The WebGL scene canvas is a sibling below the 2D interaction canvas.
    // When the docked editor changes the interaction canvas width/height, keep
    // the hardware-rendered scene in the exact same CSS box. Otherwise models
    // stretch across the full frame while hitboxes and labels use the reduced
    // editor viewport, producing the apparent left/right shift.
    if (sceneCanvas) {
      const frameRect = sceneCanvas.parentElement?.getBoundingClientRect();
      const left = frameRect ? rect.left - frameRect.left : 0;
      const top = frameRect ? rect.top - frameRect.top : 0;
      const styles = {
        left: `${left}px`,
        top: `${top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      };
      Object.entries(styles).forEach(([property,value]) => {
        if (sceneCanvas.style[property] !== value) sceneCanvas.style[property] = value;
      });
      sceneCanvas.style.right = "auto";
      sceneCanvas.style.bottom = "auto";
    }
    canvasSizeDirty = false;
  }

  function draw(time) {
    if (!applicationActive) return;
    animationFrameId = requestAnimationFrame(draw);
    const firstPersonMoving = firstPersonController?.update(time) || false;
    const stageMoving = Math.abs(state.stage - state.stageFloat) > .001;
    const animating = state.playing || stageMoving || state.visibleAnimationsActive || firstPersonMoving || labelTransitionsActive;
    if (!renderPerformance.shouldRender(time, {
      interacting: state.dragging || firstPersonController?.isMoving(),
      animating,
    })) return;
    projectedBoundsCache = new WeakMap();
    detailedDesignDecisionCache = new WeakMap();
    detailedMachineDecisionCache = new WeakMap();
    machineLodDecisionCache = new WeakMap();
    visibleColumnEntriesCache = null;
    labelTransitionsActive = false;
    const frameStartedAt = performance.now();
    renderPerformance.beginProfile?.();
    state.lastFrameTime = time;
    const elapsed = state.lastRenderedAt ? Math.min(80, Math.max(0, time - state.lastRenderedAt)) : 16.667;
    state.lastRenderedAt = time;
    updateCanvasSize();
    updateSkyBackground();
    const blend = 1 - Math.pow(.93, elapsed / 16.667);
    state.stageFloat += (state.stage - state.stageFloat) * blend;
    if (Math.abs(state.stage - state.stageFloat) < .0005) state.stageFloat = state.stage;
    if (state.playing && time > state.playAt) {
      if (state.stage >= stages.length - 1) {
        state.playing = false;
        const play = document.getElementById("play-timeline");
        if (play) { play.classList.remove("active"); play.textContent = "Play progress"; }
        showWalkthroughInvitation();
        showToast("Timeline complete — stopped at Today’s Production.");
      } else {
        setStage(state.stage + 1);
        state.playAt = time + state.stageDurationSeconds * 1000;
      }
    }
    ctx.clearRect(0,0,canvas.width,canvas.height);
    depthRenderer.beginFrame(canvas.width, canvas.height, project, rendererViewState());
    labelRects = [];
    renderPerformance.beginPhase?.("structure");
    const bounds = floorBounds();
    drawRetainedObject("plant:floor", `${bounds.join("|")}|${colors.floor}`, drawFloor);
    drawRetainedObject(
      "plant:shell",
      `${bounds.join("|")}|${paintProgress(state.paint.wallStageId, 3).toFixed(3)}|${state.paint.wallBefore}|${state.paint.wallAfter}|${JSON.stringify(state.walls)}|${state.cameraMode}|${JSON.stringify(state.roof)}`,
      drawShell,
    );
    drawRetainedObject(
      "plant:roof",
      `${bounds.join("|")}|${state.cameraMode}|${JSON.stringify(state.roof)}`,
      drawRoof,
    );
    renderPerformance.beginPhase?.("machines");
    let physicalScenePresented = false;
    drawSceneObjects(time, () => {
      renderPerformance.beginPhase?.("gpu");
      depthRenderer.render();
      physicalScenePresented = true;
      renderPerformance.beginPhase?.("overlays");
    });
    // Defensive fallback for future scene refactors: every rendered frame must
    // present the physical scene exactly once even if there were no machines.
    if (!physicalScenePresented) {
      renderPerformance.beginPhase?.("gpu");
      depthRenderer.render();
      renderPerformance.beginPhase?.("overlays");
    }
    drawLayoutRulers();
    drawCombatKillerOverlay(time);
    drawFirstPersonCombatWeapon(time);
    renderPerformance.setRendererStats?.(depthRenderer.getStats?.());
    renderPerformance.endPhase?.();
    renderPerformance.recordFrame(performance.now() - frameStartedAt);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[character]);
  }

  function buildTimeline() {
    const timeline = document.getElementById("timeline-stages");
    const total = document.getElementById("stage-total");
    if (total) total.textContent = String(stages.length).padStart(2,"0");
    if (!timeline) return;
    timeline.innerHTML = stages.map((stage,index) => (
      `<li${index === state.stage ? ` class="active"` : ""}><button type="button" title="${escapeHtml(stage.title)}">${escapeHtml(stage.short)}</button></li>`
    )).join("");
    timeline.style.setProperty("--stage-count", String(stages.length));
    timeline.closest(".timeline")?.style.setProperty("--stage-count", String(stages.length));
    timeline.querySelectorAll("li").forEach((item,index) => {
      item.querySelector("button")?.addEventListener("click", () => setStage(index));
    });
    const scrubber = document.getElementById("timeline-scrubber");
    if (scrubber) {
      scrubber.max = String(Math.max(0, stages.length - 1));
      scrubber.value = String(state.stage);
    }
  }

  function setStage(index) {
    const previousStage = state.stage;
    state.stage = clamp(Math.round(index), 0, stages.length - 1);
    invalidateWalkSpatialIndex();
    const stage = stages[state.stage];
    const number = document.getElementById("stage-number");
    const title = document.getElementById("stage-title");
    const description = document.getElementById("stage-description");
    const previous = document.getElementById("previous-stage");
    const next = document.getElementById("next-stage");
    const fill = document.getElementById("timeline-fill");
    if (number) number.textContent = String(state.stage + 1).padStart(2,"0");
    const mobileCount = document.getElementById("mobile-stage-count");
    const mobileTitle = document.getElementById("mobile-stage-title");
    const mobileDescription = document.getElementById("mobile-stage-description");
    const mobilePrevious = document.getElementById("mobile-previous-stage");
    const mobileNext = document.getElementById("mobile-next-stage");
    if (mobileCount) mobileCount.textContent = `Stage ${String(state.stage + 1).padStart(2,"0")} of ${String(stages.length).padStart(2,"0")}`;
    if (mobileTitle) mobileTitle.textContent = stage.title;
    if (mobileDescription) mobileDescription.textContent = stage.description;
    if (mobilePrevious) mobilePrevious.disabled = state.stage === 0;
    if (mobileNext) mobileNext.disabled = state.stage === stages.length - 1;
    const todayOverviewStage = state.stage === stages.length - 1;
    document.querySelectorAll("[data-label-display]").forEach((button) => {
      const active = button.dataset.labelDisplay === state.todayLabelMode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      button.disabled = !todayOverviewStage;
    });
    document.querySelector(".label-options-button")?.classList.toggle("active", todayOverviewStage);
    if (title) title.textContent = stage.title;
    if (description) {
      description.textContent = stage.description;
      let date = document.querySelector(".stage-date");
      if (!date) {
        date = document.createElement("p");
        date.className = "stage-date";
        title?.before(date);
      }
      date.textContent = stage.dateLabel || "Timeline stage";
      date.hidden = !stage.dateLabel;
      let details = document.querySelector(".stage-details");
      if (!details) {
        details = document.createElement("div");
        details.className = "stage-details";
        description.after(details);
      }
      details.innerHTML = `<p>${escapeHtml(stage.era)}</p><ul>${stage.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>`;
    }
    if (previous) previous.disabled = state.stage === 0;
    if (next) {
      next.disabled = state.stage === stages.length - 1;
      next.innerHTML = state.stage === stages.length - 1 ? `Current plant <span>✓</span>` : `Next stage <span>→</span>`;
    }
    if (fill) fill.style.width = `${stages.length > 1 ? state.stage / (stages.length - 1) * 100 : 100}%`;
    document.querySelectorAll("#timeline-stages li").forEach((item,itemIndex) => {
      item.classList.toggle("active", itemIndex === state.stage);
      item.classList.toggle("complete", itemIndex < state.stage);
      const button = item.querySelector("button");
      if (button) button.setAttribute("aria-current", itemIndex === state.stage ? "step" : "false");
    });
    const scrubber = document.getElementById("timeline-scrubber");
    if (scrubber) scrubber.value = String(state.stage);
    const stagePanel = document.querySelector(".stage-panel");    if (stagePanel && previousStage !== state.stage) {
      stagePanel.classList.remove("stage-transitioning");
      void stagePanel.offsetWidth;
      stagePanel.classList.add("stage-transitioning");
      window.setTimeout(() => stagePanel.classList.remove("stage-transitioning"), 520);
    }
    if (state.editing && state.editorTool === "timeline") updateEditorPanel();
  }

  buildTimeline();
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

  const activeTouchPointers = new Map();
  const TOUCH_PAN_MULTIPLIER = 2.15;
  let touchGestureDistance = 0;
  let touchGestureCenter = null;
  const touchPoints = () => Array.from(activeTouchPointers.values());
  const touchDistance = (points) => {
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };
  const touchCenter = (points) => {
    if (!points.length) return null;
    const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
    return { x: total.x / points.length, y: total.y / points.length };
  };
  const resetTouchGesture = () => {
    const points = touchPoints();
    touchGestureDistance = touchDistance(points);
    touchGestureCenter = touchCenter(points);
    if (points.length === 1) {
      state.pointerX = points[0].x;
      state.pointerY = points[0].y;
    }
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button === 1) event.preventDefault();
    if (state.cameraMode === "walk") return;
    if (event.button > 2) return;
    if (event.pointerType === "touch" && !state.editing) {
      event.preventDefault();
      activeTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      state.dragging = true;
      state.dragAction = activeTouchPointers.size > 1 ? "touch-gesture" : "orbit";
      resetTouchGesture();
      renderPerformance.noteInteraction(300);
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    const wantsOrbit = event.altKey || event.button === 2;
    const additiveSelection = event.shiftKey || event.ctrlKey || event.metaKey;
    const processHandleHit = !wantsOrbit && event.button === 0 ? processFlowHandleAt(event) : null;
    const selectableHit = !processHandleHit && state.editing && state.editorTool === "machines" && state.editorInteraction !== "navigate"
      ? machineAt(event)
      : null;
    const wantsPan = event.button === 1 || state.spacePressed || (event.shiftKey && !selectableHit);
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;

    if (state.editing) {
      if (state.editorTool === "timeline") return;
      if(processHandleHit){
        state.dragAction=processHandleHit.kind==="pivot"?`process-pivot:${processHandleHit.pivotId}:${processHandleHit.pivotIndex}`:`process-${processHandleHit.kind}`;
        state.dragSnapshot=snapshotLayout();state.dragMoved=false;state.dragging=true;renderPerformance.noteInteraction(300);canvas.setPointerCapture(event.pointerId);return;
      }
      if (selectableHit && additiveSelection) {
        toggleMachineSelection(selectableHit.instanceId);
        updateEditorPanel();
        const count = selectedMachines().length;
        showToast(`${count} object${count === 1 ? "" : "s"} selected.`);
        return;
      }
      if (!selectableHit && (event.ctrlKey || event.metaKey)) return;
      const navigating = state.editorInteraction === "navigate" || wantsPan || wantsOrbit;
      if (state.editorTool === "pillars" && !navigating) {
        const column = columnAt(event);
        state.selectedColumnKey = column?.key || null;
        updateEditorPanel();
        if (!column) return;
        const [worldX, worldZ] = worldFromScreen(event);
        state.draggedColumnKey = column.key;
        state.dragOffsetX = worldX - column.x;
        state.dragOffsetZ = worldZ - column.z;
        state.dragAction = "column";
        state.dragSnapshot = snapshotLayout();
        state.dragMoved = false;
        state.dragging = true;
        renderPerformance.noteInteraction(260);
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (navigating) {
        state.dragAction = wantsPan ? "pan" : "orbit";
      } else {
        const machine = selectableHit || machineAt(event);
        setSingleSelection(machine?.instanceId || null);
        updateEditorPanel();
        if (machine) {
          if (machine.locked) {
            showToast(`${machine.name} is locked. Clear “Lock position” to drag it.`);
            return;
          }
          const [worldX,worldZ] = worldFromScreen(event);
          state.draggedMachineId = machine.instanceId;
          state.dragOffsetX = worldX-machine.x;
          state.dragOffsetZ = worldZ-machine.z;
          state.dragAction = "machine";
          state.dragSnapshot = snapshotLayout();
          state.dragMoved = false;
        } else {
          state.dragAction = "pan";
        }
      }
    } else {
      if (!wantsOrbit && !wantsPan) return;
      state.dragAction = wantsPan ? "pan" : "orbit";
    }
    state.dragging = true;
    renderPerformance.noteInteraction(260);
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" && !state.editing && activeTouchPointers.has(event.pointerId)) {
      event.preventDefault();
      activeTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const points = touchPoints();
      renderPerformance.noteInteraction(180);
      if (points.length >= 2) {
        const center = touchCenter(points);
        const distance = touchDistance(points);
        if (touchGestureCenter && center) {
          panCamera(
            (center.x - touchGestureCenter.x) * TOUCH_PAN_MULTIPLIER,
            (center.y - touchGestureCenter.y) * TOUCH_PAN_MULTIPLIER,
          );
        }
        if (touchGestureDistance > 0 && distance > 0) {
          state.zoom = clamp(state.zoom * (distance / touchGestureDistance), .2, 10);
        }
        touchGestureCenter = center;
        touchGestureDistance = distance;
        state.dragAction = "touch-gesture";
      } else if (points.length === 1) {
        const point = points[0];
        const deltaX = point.x - state.pointerX;
        const deltaY = point.y - state.pointerY;
        state.yaw -= deltaX * .006;
        state.pitch = clamp(state.pitch + deltaY * .004, .02, 1.48);
        state.pointerX = point.x;
        state.pointerY = point.y;
        touchGestureCenter = point;
        touchGestureDistance = 0;
        state.dragAction = "orbit";
      }
      return;
    }
    if (!state.dragging) return;
    renderPerformance.noteInteraction(140);
    const deltaX = event.clientX-state.pointerX;
    const deltaY = event.clientY-state.pointerY;
    if(state.dragAction==="process-start"||state.dragAction==="process-end"){
      const endpoint=state.dragAction==="process-start"?"start":"end";if(updateDraggedProcessEndpoint(endpoint,event))state.dragMoved=true;
    }else if(String(state.dragAction).startsWith("process-pivot:")){
      const[,pivotId,pivotIndex]=String(state.dragAction).split(":");if(updateDraggedProcessPivot(pivotId,Number(pivotIndex),event))state.dragMoved=true;
    } else if (state.dragAction === "column") {
      const column = structuralColumns().find((item) => item.key === state.draggedColumnKey);
      if (column) {
        const [worldX, worldZ] = worldFromScreen(event);
        const snap = Math.max(.01, Number(state.snapSize) || .1);
        const nextX = Math.round((worldX - state.dragOffsetX) / snap) * snap;
        const nextZ = Math.round((worldZ - state.dragOffsetZ) / snap) * snap;
        if (Math.abs(nextX - column.x) > .000001 || Math.abs(nextZ - column.z) > .000001) {
          state.dragMoved = true;
          setColumnPosition(column.key, nextX, nextZ);
        }
      }
    } else if (state.dragAction === "machine") {
      const machine = selectedMachine();
      if (machine) {
        const [worldX,worldZ] = worldFromScreen(event);
        const snap = Math.max(0.01, Number(state.snapSize) || 0.1);
        const bounds = floorBounds();
        const nextX = Math.round(clamp(worldX-state.dragOffsetX,bounds[0],bounds[2]-machine.w)/snap)*snap;
        const nextZ = Math.round(clamp(worldZ-state.dragOffsetZ,bounds[1],bounds[3]-machine.d)/snap)*snap;
        const moveX = nextX - machine.x;
        const moveZ = nextZ - machine.z;
        if (moveX !== 0 || moveZ !== 0) state.dragMoved = true;
        selectedMachines().filter((item) => !item.locked).forEach((item) => {
          item.x = clamp(item.x + moveX, bounds[0], bounds[2] - item.w);
          item.z = clamp(item.z + moveZ, bounds[1], bounds[3] - item.d);
        });
        updateEditorLiveTransformFields();
      }
    } else if (state.dragAction === "pan") {
      panCamera(deltaX,deltaY);
    } else {
      state.yaw -= deltaX * .006;
      state.pitch = state.cameraMode === "walk"
        ? clamp(state.pitch + deltaY * .003, .02, .38)
        : clamp(state.pitch + deltaY * .004, .02, 1.48);
    }
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
  });
  function finishPointer(event) {
    if (!event && activeTouchPointers.size) {
      activeTouchPointers.clear();
      touchGestureCenter = null;
      touchGestureDistance = 0;
    }
    if (event?.pointerType === "touch" && !state.editing) {
      activeTouchPointers.delete(event.pointerId);
      if (activeTouchPointers.size) {
        resetTouchGesture();
        state.dragging = true;
        state.dragAction = activeTouchPointers.size > 1 ? "touch-gesture" : "orbit";
        return;
      }
      touchGestureCenter = null;
      touchGestureDistance = 0;
    }
    if ((state.draggedMachineId || state.draggedColumnKey || String(state.dragAction).startsWith("process-")) && state.dragMoved && state.dragSnapshot) {
      pushHistory(state.dragSnapshot);
      persistLayout();
      updateEditorPanel();
    }
    state.dragging = false;
    state.draggedMachineId = null;
    state.draggedColumnKey = null;
    state.dragSnapshot = null;
    state.dragMoved = false;
    state.dragAction = "orbit";
  }
  canvas.addEventListener("pointerup",finishPointer);
  canvas.addEventListener("pointercancel",finishPointer);
  canvas.addEventListener("contextmenu",(event) => event.preventDefault());
  canvas.addEventListener("wheel", (event) => {
    if (state.cameraMode === "walk") return;
    event.preventDefault();
    renderPerformance.noteInteraction(260);
    state.zoom = clamp(state.zoom * (event.deltaY > 0 ? .9 : 1.1), .2, 10);
  }, { passive: false });

  addLifecycleListener(window, "focus", refreshExternalProjectChanges);
  addLifecycleListener(window, "pageshow", refreshExternalProjectChanges);
  addLifecycleListener(document, "visibilitychange", () => {
    if (!document.hidden) refreshExternalProjectChanges();
  });
  addLifecycleListener(window, "storage", (event) => {
    if (event.key === DESIGN_STORAGE_KEY) refreshDesignLibrary();
    if (event.key === STORAGE_KEY) refreshMachineDesignAssignments();
  });
  syncChannel?.addEventListener("message", (event) => {
    if (event.data?.type === "design-library-updated") refreshDesignLibrary();
    if (event.data?.type === "layout-updated") refreshMachineDesignAssignments();
  });

  document.getElementById("next-stage")?.addEventListener("click", () => setStage(state.stage + 1));
  document.getElementById("previous-stage")?.addEventListener("click", () => setStage(state.stage - 1));
  document.getElementById("mobile-next-stage")?.addEventListener("click", () => setStage(state.stage + 1));
  document.getElementById("mobile-previous-stage")?.addEventListener("click", () => setStage(state.stage - 1));
  addLifecycleListener(window, "keydown", (event) => {
    const typing = ["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName);
    if (!typing && event.code === "Space") {
      state.spacePressed = true;
      event.preventDefault();
    }
    if (!typing && state.cameraMode === "walk") {
      if (event.key === "Escape") {
        event.preventDefault();
        if (combatController?.isActive?.()) {
          // The first-person controller owns Esc in Combat Mode. Its capture-phase
          // handler routes to the dedicated combat pause menu. After death, the
          // combat controller intentionally ignores Esc so the death menu stays authoritative.
          return;
        }
        openFirstPersonOptions(true);
        return;
      }
      if (["w", "a", "s", "d", " "].includes(event.key.toLowerCase())) return;
    }
    if (!typing && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === "f") {
      const frame = canvas.closest(".model-frame");
      if (frame) toggleModelFullscreen(frame);
      return;
    }
    const modifier = event.ctrlKey || event.metaKey;
    if (state.editing && !typing && modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redoLayout();
      else undoLayout();
      return;
    }
    if (state.editing && !typing && modifier && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redoLayout();
      return;
    }
    if (state.editing && !typing && modifier && event.key.toLowerCase() === "a") {
      event.preventDefault();
      const visibleIds = machines.filter((machine) => machine.visible !== false && stageAlpha(machine.reveal, machine.retire) > .08).map((machine) => machine.instanceId);
      state.selectedMachineIds = new Set(visibleIds);
      state.selectedMachineId = visibleIds.at(-1) || null;
      updateEditorPanel();
      showToast(`${visibleIds.length} visible objects selected.`);
      return;
    }
    if (state.editing && !typing && modifier && event.key.toLowerCase() === "c") {
      event.preventDefault();
      copySelectedMachine();
      return;
    }
    if (state.editing && !typing && modifier && event.key.toLowerCase() === "v") {
      event.preventDefault();
      pasteMachine();
      return;
    }
    if (state.editing && !typing && (event.key === "Delete" || event.key === "Backspace")) {
      event.preventDefault();
      deleteSelectedMachine();
      return;
    }
    if (state.editing && event.key === "Escape") {
      setEditing(false);
      return;
    }
    if (typing) return;
    if (event.key === "ArrowRight") setStage(state.stage + 1);
    if (event.key === "ArrowLeft") setStage(state.stage - 1);
  });
  addLifecycleListener(window, "keyup", (event) => {
    if (event.code === "Space") state.spacePressed = false;
  });
  addLifecycleListener(window, "blur", () => {
    state.spacePressed = false;
    finishPointer();
  });

  const canvasResizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => {
        canvasSizeDirty = true;
        renderPerformance.invalidate();
      })
    : null;
  canvasResizeObserver?.observe(canvas);
  addLifecycleListener(window, "resize", () => updateCanvasSize(true));
  addLifecycleListener(window, "renderperformancechange", (event) => {
    canvasSizeDirty = true;
    if (!event.detail?.adaptive) updateCanvasSize(true);
    renderPerformance.invalidate();
  });
  function teardownPlantApplication(event) {
    if (event?.detail?.source && event.detail.source !== "/plant-app.js") return;
    if (!applicationActive) return;
    applicationActive = false;
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    if (geometryPreparedFrame) window.cancelAnimationFrame(geometryPreparedFrame);
    canvasResizeObserver?.disconnect();
    firstPersonController?.destroy?.();
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
    source: "/plant-app.js",
    dispose: teardownPlantApplication,
  };
  addLifecycleListener(window, "plantlegacyteardown", teardownPlantApplication);
  addLifecycleListener(window, "pagehide", (event) => {
    if (!event.persisted) teardownPlantApplication();
  });

  addControls();
  addTimelineToolbar();
  const initialParams = new URLSearchParams(window.location.search);
  const initialMachine = machines.find((machine) => machine.instanceId === initialParams.get("machine"));
  if (initialMachine) {
    setSingleSelection(initialMachine.instanceId);
    if (initialParams.get("edit") === "1") setEditing(true);
    else setStage(clamp(initialMachine.reveal, 0, stages.length - 1));
    focusSelectedMachine();
    showToast(`${initialMachine.name} is ready to position.`);
  } else {
    setStage(0);
    if (initialParams.get("owner") === "layout" && window.monroeEditorAccess?.hasAccess?.()) {
      requestAnimationFrame(() => setEditing(true));
    }
  }
  animationFrameId = requestAnimationFrame(draw);
})();