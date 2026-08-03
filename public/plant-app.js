(() => {
  const data = window.PLANT_CAD_DATA;
  const equipmentData = window.PLANT_MACHINE_DATA;
  const canvas = document.getElementById("plant-canvas");
  if (!canvas || !data || !equipmentData) return;

  const ctx = canvas.getContext("2d");
  const sceneCanvas = window.createDepthCanvas?.(canvas, "depth-scene-canvas plant-depth-canvas") || null;
  const depthRenderer = sceneCanvas && window.createDepthSceneRenderer
    ? window.createDepthSceneRenderer(sceneCanvas)
    : { available: false, beginFrame() {}, addPolygon() {}, addLine() {}, render() {} };
  const defaultStages = [
    {
      title: "Empty shell",
      short: "Empty shell",
      era: "Starting point",
      description: "The production floor begins as an open industrial shell. The footprint, column locations, and production zones are grounded in the glass-plant areas of the facility drawing.",
      details: ["Open floor", "Unfinished columns", "CAD footprint"],
    },
    {
      title: "Trenches dug",
      short: "Trenches",
      era: "Underground work",
      description: "Utility trenches cut across the future equipment lanes, establishing routes for power, air, water, and process connections before the floor is restored.",
      details: ["Floor opened", "Utility routes", "Machine drops"],
    },
    {
      title: "Utilities set",
      short: "Utilities",
      era: "Infrastructure",
      description: "Underground services are placed and the trenches are closed. Marked connection points remain ready for the tempering, cutting, and material-handling equipment.",
      details: ["Services placed", "Floor patched", "Drops marked"],
    },
    {
      title: "Walls painted",
      short: "Paint",
      era: "Interior finish",
      description: "The plant shell changes from raw industrial surfaces to a brighter finished workspace, and every structural pillar receives a full-height yellow finish.",
      details: ["Bright walls", "Full yellow pillars", "Finished shell"],
    },
    {
      title: "Safety yellow",
      short: "Safety yellow",
      era: "Visual safety",
      description: "Aisles, impact zones, and equipment clearances are marked after the pillars have been fully painted yellow.",
      details: ["Aisle markings", "Impact zones", "Protected clearances"],
    },
    {
      title: "Crane runways set",
      short: "Crane steel",
      era: "Material handling",
      description: "Blue GORBEL runway steel is set over the processing lanes. The heavy-equipment bay receives the separate 5-ton bridge structure documented in the installation photos.",
      details: ["Blue runways", "GORBEL bridges", "5-ton bay"],
    },
    {
      title: "Barefoot tables set",
      short: "Barefoot",
      era: "Machine 1 of 8",
      description: "The Barefoot cutting tables are placed in the western production area using the drawing’s Barefoot label and its 3 x 6 and 4 x 9 table callouts.",
      details: ["DWG named", "Cutting tables", "West production area"],
    },
    {
      title: "SQ4020 waterjet set",
      short: "Waterjet",
      era: "Machine 2 of 8",
      description: "The SQ4020 waterjet appears at its named DWG installation detail. Its cutting table, abrasive tank, pump connection, and controller envelope follow the drawing coordinates.",
      details: ["DWG named", "SQ4020", "Cutout station"],
    },
    {
      title: "Waterjet filtration set",
      short: "Filtration",
      era: "Machine 3 of 8",
      description: "The waterjet pump, table tanks, abrasive-removal equipment, and controller are added as their own installation step beside the SQ4020.",
      details: ["DWG named", "Pump & tanks", "Water treatment"],
    },
    {
      title: "Kodiak 10-45 set",
      short: "Kodiak",
      era: "Machine 4 of 8",
      description: "The Kodiak 10-45 is installed beneath its 1,000-lb GORBEL bridge. The machine identity comes directly from the photos; the location is correlated to the compact CAD equipment cluster.",
      details: ["Photo identified", "CAD correlated", "GORBEL 1000 lb"],
    },
    {
      title: "Denver Surface #1 set",
      short: "Denver #1",
      era: "Machine 5 of 8",
      description: "The first Denver Surface unit is added at the western repeated equipment footprint beside the drawing’s roller-replacement clearance.",
      details: ["Photo identified", "Repeated CAD footprint", "GORBEL 1000 lb"],
    },
    {
      title: "Denver Surface #2 set",
      short: "Denver #2",
      era: "Machine 6 of 8",
      description: "The second Denver Surface unit is added independently at the eastern copy of the same CAD footprint, matching the paired installation seen in the photos.",
      details: ["Second unit", "Mirrored placement", "Own crane bridge"],
    },
    {
      title: "Tempering furnace set",
      short: "Furnace",
      era: "Machine 7 of 8",
      description: "The tempering furnace oven is assembled from the multi-truck delivery beneath the yellow 5-ton bridge. Its model position follows the DWG oven-layer block cluster.",
      details: ["Oven CAD layers", "8-truck arrival", "5-ton bridge"],
    },
    {
      title: "Fuze Cube set",
      short: "Fuze Cube",
      era: "Machine 8 of 8",
      description: "The Fuze Cube is installed at the point directly named in the facility drawing, east of the core processing line.",
      details: ["DWG named", "Exact drawing anchor", "Dedicated bridge"],
    },
    {
      title: "First raw glass",
      short: "Raw glass",
      era: "Material arrival",
      description: "The first sheets of raw glass arrive and populate the storage racks. Material flow can now be traced from receiving through the newly installed equipment.",
      details: ["Raw lites", "Storage racks", "Material flow"],
    },
    {
      title: "Plant offices built",
      short: "Plant offices",
      era: "Support spaces",
      description: "Plant-floor support offices and quality spaces are completed within the glass operation, adding the daily coordination points needed for startup.",
      details: ["Floor offices", "Quality space", "Team support"],
    },
    {
      title: "First production",
      short: "First production",
      era: "Startup",
      description: "The line comes alive. Glass advances through the production sequence, status beacons switch on, and the plant reaches its first working output.",
      details: ["Line active", "First output", "Startup team"],
    },
    {
      title: "Plant today",
      short: "Today",
      era: "Current state",
      description: "The glass plant operates as a connected system: incoming glass, cutting, tempering, storage, quality, and production support working across one floor.",
      details: ["Full operation", "Connected flow", "Current plant"],
    },
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
  const SYNC_CHANNEL_NAME = "monroe-glass-plant-sync-v1";
  const syncChannel = typeof window.BroadcastChannel === "function"
    ? new window.BroadcastChannel(SYNC_CHANNEL_NAME)
    : null;
  const APP_VERSION = "0.10.1";
  const WALL_IDS = ["west", "east", "south", "north-west", "north-east"];
  const defaultWalls = Object.fromEntries(WALL_IDS.map((id) => [id, true]));
  const defaultDesignLibrary = window.PLANT_MACHINE_DESIGNS || {};

  function normalizeFloor(value) {
    return {
      centerX: Number.isFinite(Number(value?.centerX)) ? Number(value.centerX) : defaultFloor.centerX,
      centerZ: Number.isFinite(Number(value?.centerZ)) ? Number(value.centerZ) : defaultFloor.centerZ,
      width: Math.max(40, Number(value?.width) || defaultFloor.width),
      length: Math.max(40, Number(value?.length) || defaultFloor.length),
    };
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

  function wallSections() {
    const bounds = floorBounds();
    const openingStart = Math.min(bounds[2] - 20, bounds[0] + Math.max(70, floor.width * 0.22));
    const openingEnd = Math.min(bounds[2], openingStart + Math.max(36, floor.width * 0.14));
    return [
      { id: "west", x: bounds[0], z: bounds[1], w: 3, d: floor.length, h: 24 },
      { id: "east", x: bounds[2] - 3, z: bounds[1], w: 3, d: floor.length, h: 24 },
      { id: "south", x: bounds[0], z: bounds[1], w: floor.width, d: 3, h: 24 },
      { id: "north-west", x: bounds[0], z: bounds[3] - 3, w: Math.max(3, openingStart - bounds[0]), d: 3, h: 24 },
      { id: "north-east", x: openingEnd, z: bounds[3] - 3, w: Math.max(3, bounds[2] - openingEnd), d: 3, h: 24 },
    ];
  }

  function clone(value) {
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
    }[type] || "";
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

  function normalizeMachine(machine, index = 0) {
    const normalized = {
      ...clone(machine),
      id: machine.id || uniqueId(machine.type || "object"),
      instanceId: machine.instanceId || `${machine.id || machine.type || "object"}-${index}`,
      name: machine.name || "Untitled object",
      short: machine.short || machine.name || "Object",
      type: machine.type || "genericBox",
      x: Number(machine.x) || 0,
      z: Number(machine.z) || 0,
      w: Math.max(0.5, Number(machine.w) || 10),
      d: Math.max(0.5, Number(machine.d) || 10),
      h: Math.max(0.5, Number(machine.h) || 5),
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
      category: machine.category || objectCategory(machine.type),
      designId: machine.designId || defaultDesignForType(machine.type),
      collisionMode: machine.collisionMode || (["bridgeCrane", "craneMachine", "person"].includes(machine.type) || isAnimationType(machine.type) ? "ignore" : "solid"),
      animationEnabled: machine.animationEnabled !== false,
      animationMode: ["none", "loop", "pingPong", "spin", "bob", "pulse", "blink"].includes(machine.animationMode)
        ? machine.animationMode
        : animationDefaults(machine.type).animationMode,
      animationAxis: ["x", "y", "z", "all"].includes(machine.animationAxis)
        ? machine.animationAxis
        : animationDefaults(machine.type).animationAxis,
      animationDistance: Number.isFinite(Number(machine.animationDistance))
        ? Number(machine.animationDistance)
        : animationDefaults(machine.type).animationDistance,
      animationSpeed: Math.max(0, Number.isFinite(Number(machine.animationSpeed))
        ? Number(machine.animationSpeed)
        : animationDefaults(machine.type).animationSpeed),
      animationPhase: Number.isFinite(Number(machine.animationPhase))
        ? Number(machine.animationPhase)
        : animationDefaults(machine.type).animationPhase,
      animationPauseSeconds: Math.max(0, Number.isFinite(Number(machine.animationPauseSeconds))
        ? Number(machine.animationPauseSeconds)
        : 0),
      animationGroupId: typeof machine.animationGroupId === "string" ? machine.animationGroupId : "",
      motionParentId: typeof machine.motionParentId === "string" ? machine.motionParentId : "",
    };
    if (normalized.crane) {
      normalized.crane = {
        system: normalized.crane.system || "GORBEL bridge",
        capacity: normalized.crane.capacity || "1000 lb",
        height: Math.max(4, Number(normalized.crane.height) || 20),
      };
    }
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
        placement_status: "illustrative",
        evidence: "Editable production-flow animation replacing the former hard-coded final-stage motion.",
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
    return source.map((stage,index) => ({
      id: stage.id || `stage-${index + 1}`,
      title: stage.title || `Stage ${index + 1}`,
      short: stage.short || stage.title || `Stage ${index + 1}`,
      era: stage.era || "Project phase",
      dateLabel: stage.dateLabel || "",
      description: stage.description || "",
      details: Array.isArray(stage.details) ? stage.details : [],
    }));
  }

  function loadLayout() {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (current?.version === 6 && Array.isArray(current.machines)) {
        return {
          machines: loadSceneAwareMachines(current),
          stages: normalizeStages(current.stages),
          floor: normalizeFloor(current.floor),
          hiddenColumns: Array.isArray(current.hiddenColumns) ? current.hiddenColumns : [],
          walls: { ...defaultWalls, ...(current.walls || {}) },
          playbackSpeed: Number(current.playbackSpeed) || 1,
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
          stages: normalizeStages(legacy.stages),
          floor: normalizeFloor(legacy.floor),
          hiddenColumns: Array.isArray(legacy.hiddenColumns) ? legacy.hiddenColumns : [],
          walls: { ...defaultWalls, ...(legacy.walls || {}) },
          playbackSpeed: Number(legacy.playbackSpeed) || 1,
        };
      }
      const older = JSON.parse(localStorage.getItem(OLDER_STORAGE_KEY) || "null");
      if (older?.version === 4 && Array.isArray(older.machines)) {
        return {
          machines: loadSceneAwareMachines(older),
          stages: normalizeStages(older.stages),
          floor: normalizeFloor(older.floor),
          hiddenColumns: Array.isArray(older.hiddenColumns) ? older.hiddenColumns : [],
          walls: { ...defaultWalls, ...(older.walls || {}) },
          playbackSpeed: Number(older.playbackSpeed) || 1,
        };
      }
      const oldest = JSON.parse(localStorage.getItem(OLDEST_STORAGE_KEY) || "null");
      if (oldest?.version === 3 && Array.isArray(oldest.machines)) {
        return {
          machines: loadSceneAwareMachines(oldest, true),
          stages: normalizeStages(defaultStages),
          floor: normalizeFloor(oldest.floor),
          hiddenColumns: Array.isArray(oldest.hiddenColumns) ? oldest.hiddenColumns : [],
          walls: { ...defaultWalls, ...(oldest.walls || {}) },
          playbackSpeed: 1,
        };
      }
    } catch (error) {
      console.warn("Saved layout could not be loaded.", error);
    }
    return {
      machines: defaultSceneMachines(),
      stages: normalizeStages(defaultStages),
      floor: normalizeFloor(defaultFloor),
      hiddenColumns: [],
      walls: { ...defaultWalls },
      playbackSpeed: 1,
    };
  }

  const savedLayout = loadLayout();
  let stages = savedLayout.stages;
  let machines = savedLayout.machines;
  let floor = savedLayout.floor;
  let designLibrary = loadDesignLibrary();

  const state = {
    yaw: -0.72,
    pitch: 0.62,
    zoom: 1,
    panX: 0,
    panZ: 0,
    stage: 0,
    stageFloat: 0,
    dragging: false,
    dragAction: "orbit",
    draggedMachineId: null,
    dragOffsetX: 0,
    dragOffsetZ: 0,
    pointerX: 0,
    pointerY: 0,
    showCad: false,
    showLabels: true,
    playing: false,
    playAt: 0,
    editing: false,
    editorTool: "machines",
    editorInteraction: "select",
    snapSize: 0.5,
    spacePressed: false,
    playbackSpeed: savedLayout.playbackSpeed,
    history: [],
    future: [],
    dragSnapshot: null,
    dragMoved: false,
    selectedMachineId: null,
    selectedMachineIds: new Set(),
    clipboard: null,
    hiddenColumns: new Set(savedLayout.hiddenColumns),
    walls: savedLayout.walls,
    previewObjectAnimations: false,
    lastFrameTime: 0,
  };

  function refreshDesignLibrary() {
    designLibrary = loadDesignLibrary();
  }

  function refreshMachineDesignAssignments() {
    try {
      const external = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (external?.version !== 6 || !Array.isArray(external.machines)) return false;
      const externalById = new Map(external.machines.map((machine) => [machine.instanceId, machine]));
      let changed = false;
      machines.forEach((machine) => {
        const incoming = externalById.get(machine.instanceId);
        if (!incoming) return;
        const nextDesignId = incoming.designId || "";
        if ((machine.designId || "") !== nextDesignId) {
          machine.designId = nextDesignId;
          changed = true;
        }
      });
      if (changed) updateEditorPanel();
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

  function snapshotLayout() {
    return {
      machines: clone(machines),
      stages: clone(stages),
      floor: clone(floor),
      hiddenColumns: [...state.hiddenColumns],
      walls: clone(state.walls),
      playbackSpeed: state.playbackSpeed,
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
    stages = normalizeStages(snapshot.stages);
    floor = normalizeFloor(snapshot.floor);
    state.hiddenColumns = new Set(snapshot.hiddenColumns || []);
    state.walls = { ...defaultWalls, ...(snapshot.walls || {}) };
    state.playbackSpeed = Number(snapshot.playbackSpeed) || 1;
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
    try {
      const previous = localStorage.getItem(STORAGE_KEY);
      if (previous) localStorage.setItem(BACKUP_STORAGE_KEY, previous);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 6,
        appVersion: APP_VERSION,
        sceneAnimationsInitialized: true,
        floorFeaturesInitialized: true,
        machines,
        stages,
        floor,
        hiddenColumns: [...state.hiddenColumns],
        walls: state.walls,
        playbackSpeed: state.playbackSpeed,
      }));
    } catch (error) {
      console.warn("Layout changes could not be saved to browser storage.", error);
    }
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

  function setSingleSelection(instanceId) {
    const ids = selectionIdsForObject(instanceId);
    state.selectedMachineId = instanceId || null;
    state.selectedMachineIds = new Set(ids);
  }

  function toggleMachineSelection(instanceId) {
    if (!instanceId) return;
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
    rootsToAttach.forEach((machine) => { machine.motionParentId = parent.instanceId; });
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
    const firstPoints = footprint(first, -padding, 0);
    const secondPoints = footprint(second, -padding, 0);
    const axes = [...rectangleAxes(firstPoints), ...rectangleAxes(secondPoints)];
    return axes.every((axis) => {
      const a = projectRectangle(firstPoints, axis);
      const b = projectRectangle(secondPoints, axis);
      return a[1] > b[0] && b[1] > a[0];
    });
  }

  function overlapPairs() {
    const candidates = collisionCandidates();
    const pairs = [];
    for (let firstIndex = 0; firstIndex < candidates.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
        const first = candidates[firstIndex];
        const second = candidates[secondIndex];
        if (machinesOverlap(first, second)) pairs.push([first, second]);
      }
    }
    return pairs;
  }

  function overlapIds() {
    const ids = new Set();
    overlapPairs().forEach(([first, second]) => {
      ids.add(first.instanceId);
      ids.add(second.instanceId);
    });
    return ids;
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
    state.zoom = Math.max(state.zoom, clamp(70 / Math.max(maxX - minX, maxZ - minZ, 1), 1.1, 2.5));
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
    const snap = Math.max(0.1, Number(state.snapSize) || 0.5);
    const bounds = floorBounds();
    movable.forEach((machine) => {
      machine.x = clamp(machine.x + deltaX * snap, bounds[0], bounds[2] - machine.w);
      machine.z = clamp(machine.z + deltaZ * snap, bounds[1], bounds[3] - machine.d);
      machine.rotationY = Math.round((Number(machine.rotationY ?? machine.rotation) + deltaRotation + 360) % 360);
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
      help.textContent = "Drag to orbit · Shift-drag to pan · Scroll to zoom";
      return;
    }
    help.textContent = state.editorInteraction === "navigate"
      ? "Navigate: drag to orbit · Shift/Space-drag to pan · scroll to zoom"
      : "Edit: drag an object · drag empty floor to pan · Alt/right-drag to orbit";
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

    const selection = panel.querySelector("[data-editor-selection]");
    if (selection) {
      if (state.editorTool === "timeline") selection.textContent = currentStage()?.title || "Timeline";
      else if (state.editorTool === "pillars") selection.textContent = "Structure controls";
      else selection.textContent = selectionCount > 1 ? `${selectionCount} objects selected` : (machine ? machine.name : "Select any model object");
    }

    panel.querySelectorAll("[data-needs-selection]").forEach((control) => {
      control.disabled = selectionCount === 0;
    });

    panel.querySelectorAll("[data-machine-field]").forEach((input) => {
      const field = input.dataset.machineField;
      input.disabled = !machine || selectionCount > 1;
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
      if (selectionCount > 1 && field === "color") {
        input.disabled = false;
        input.value = selectionItems[0]?.color || "#277d78";
        return;
      }
      const value = machine[field];
      if (["name", "type", "color", "collisionMode"].includes(field)) input.value = value ?? "";
      else input.value = String(Number(value ?? 0));
    });

    const depthLabel = panel.querySelector("[data-depth-label]");
    if (depthLabel) depthLabel.textContent = machine && isFloorFeatureType(machine.type) ? "Length" : "Depth";

    panel.querySelectorAll("[data-machine-check]").forEach((input) => {
      const field = input.dataset.machineCheck;
      input.disabled = !machine || selectionCount > 1;
      input.checked = machine ? machine[field] !== false : false;
      if (field === "locked") input.checked = machine?.locked === true;
    });

    panel.querySelectorAll("[data-animation-field]").forEach((input) => {
      const field = input.dataset.animationField;
      input.disabled = !machine || selectionCount > 1;
      input.value = machine ? String(machine[field] ?? "") : "";
    });
    panel.querySelectorAll("[data-animation-check]").forEach((input) => {
      input.disabled = !machine || selectionCount > 1;
      input.checked = Boolean(machine?.[input.dataset.animationCheck]);
    });
    const previewAnimations = panel.querySelector("[data-editor-action='preview-animations']");
    if (previewAnimations) {
      previewAnimations.classList.toggle("active", state.previewObjectAnimations);
      previewAnimations.textContent = state.previewObjectAnimations ? "Pause animations" : "Preview animations";
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
    panel.querySelectorAll("[data-floor-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const field = input.dataset.floorField;
        const value = Number(input.value);
        if (!Number.isFinite(value)) return;
        pushHistory();
        floor[field] = ["width", "length"].includes(field) ? Math.max(40, value) : value;
        persistLayout();
        updateEditorPanel();
        showToast("Floor dimensions updated.");
      });
    });

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
    updateEditorHelp();
    updateHistoryButtons();
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
      x: Number(state.clipboard.x) + 8,
      z: Number(state.clipboard.z) + 8,
      custom: true,
      locked: false,
      animationGroupId: "",
      motionParentId: "",
      placement_status: "user_added",
      evidence: "Copied in the interactive layout editor.",
    }, machines.length);
    machines.push(pasted);
    setSingleSelection(pasted.instanceId);
    state.clipboard = clone(pasted);
    persistLayout();
    updateEditorPanel();
    showToast("Object pasted.");
  }

  function swapStageReferences(first, second) {
    machines.forEach((machine) => {
      ["reveal", "retire"].forEach((field) => {
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
    stages.splice(removed, 1);
    machines.forEach((machine) => {
      if (machine.reveal === removed) machine.reveal = Math.max(0, removed - 1);
      else if (machine.reveal > removed) machine.reveal -= 1;
      if (machine.retire === removed) machine.retire = Math.max(machine.reveal, removed - 1);
      else if (machine.retire > removed && machine.retire < 99) machine.retire -= 1;
    });
    state.stage = clamp(removed, 0, stages.length - 1);
    state.stageFloat = state.stage;
    persistLayout();
    buildTimeline();
    setStage(state.stage);
    updateEditorPanel();
    showToast("Timeline stage removed.");
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
      stages,
      floor,
      hiddenColumns: [...state.hiddenColumns],
      walls: state.walls,
      playbackSpeed: state.playbackSpeed,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `monroe-glass-plant-layout-v${APP_VERSION}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    showToast("Layout JSON exported.");
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
      stages = normalizeStages(payload.stages);
      floor = normalizeFloor(payload.floor);
      state.hiddenColumns = new Set(payload.hiddenColumns || []);
      state.walls = { ...defaultWalls, ...(payload.walls || {}) };
      state.playbackSpeed = Number(payload.playbackSpeed) || 1;
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

  function setEditing(enabled) {
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
      button.textContent = enabled ? "Close editor" : "Edit layout";
    }
    if (play) play.hidden = enabled;
    if (enabled) {
      setStage(stages.length - 1);
      state.stageFloat = stages.length - 1;
    }
    requestAnimationFrame(updateCanvasSize);
    updateEditorHelp();
    updateEditorPanel();
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
        <button type="button" data-editor-tool="timeline">Timeline</button>
      </div>

      <div data-editor-section="machines">
        <div class="editor-object-browser">
          <label>Find an object<input type="search" data-object-search placeholder="Search machines, rooms, racks…"></label>
          <label>Object list<select data-object-picker><option value="">Choose an object…</option></select></label>
          <div class="object-browser-actions">
            <button type="button" data-editor-action="focus" data-needs-selection>Focus selected</button>
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
            <p>The parent carries the attached objects. Every child keeps playing its own animation inside the parent’s moving coordinate space.</p>
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
          <button type="button" data-nudge="rotate-negative" data-needs-selection>↶ Y 5°</button>
          <button type="button" data-nudge="rotate-positive" data-needs-selection>Y 5° ↷</button>
        </div>
        <div class="editor-properties">
          <label class="wide">Name<input data-machine-field="name" data-needs-selection type="text"></label>
          <label class="wide">Object type<select data-machine-field="type" data-needs-selection>${typeMarkup}</select></label>
          <label>X position<input data-machine-field="x" data-needs-selection type="number" step="0.5"></label>
          <label>Z position<input data-machine-field="z" data-needs-selection type="number" step="0.5"></label>
          <label>Rotation X°<input data-machine-field="rotationX" data-needs-selection type="number" step="5"></label>
          <label>Rotation Y°<input data-machine-field="rotationY" data-needs-selection type="number" step="5"></label>
          <label>Rotation Z°<input data-machine-field="rotationZ" data-needs-selection type="number" step="5"></label>
          <label>Width<input data-machine-field="w" data-needs-selection type="number" min="0.5" step="0.5"></label>
          <label><span data-depth-label>Depth</span><input data-machine-field="d" data-needs-selection type="number" min="0.5" step="0.5"></label>
          <label>Height<input data-machine-field="h" data-needs-selection type="number" min="0.5" step="0.5"></label>
          <label>Appears at<select data-machine-field="reveal" data-stage-select data-needs-selection></select></label>
          <label>Disappears after<select data-machine-field="retire" data-stage-select data-allow-never data-needs-selection></select></label>
          <label>Color<input data-machine-field="color" data-needs-selection type="color"></label>
          <label>Collision check<select data-machine-field="collisionMode" data-needs-selection>
            <option value="solid">Solid · warn on overlap</option>
            <option value="ignore">Ignore overlaps</option>
          </select></label>
          <label class="wide">Design preset<select data-design-picker data-needs-selection></select></label>
        </div>
        <div class="machine-design-actions">
          <button type="button" data-editor-action="machine-studio">Open Machine Design Studio</button>
          <span>Edit cabinets, rollers, beams, wheels, glass panels, colors, and component dimensions on a dedicated page.</span>
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
              <option value="spin">Rotate continuously</option>
              <option value="bob">Bob up and down</option>
              <option value="pulse">Pulse size</option>
              <option value="blink">Blink visibility</option>
            </select></label>
            <label>Axis<select data-animation-field="animationAxis">
              <option value="x">X axis</option><option value="y">Y axis</option><option value="z">Z axis</option><option value="all">All axes</option>
            </select></label>
            <label>Distance / amount<input data-animation-field="animationDistance" type="number" step="0.5"></label>
            <label>Speed (cycles/sec)<input data-animation-field="animationSpeed" type="number" min="0" step="0.01"></label>
            <label>Pause after movement (sec)<input data-animation-field="animationPauseSeconds" type="number" min="0" step="0.1"></label>
            <label>Phase offset °<input data-animation-field="animationPhase" type="number" step="5"></label>
          </div>
          <button type="button" data-editor-action="reverse-animation-path" data-needs-selection>Reverse movement direction</button>
          <p>The current object position is the animation center. Movement axes are local to the object, so rotating the object on X, Y, or Z rotates the direction of travel. Spin can rotate around X, Y, Z, or all three axes. Pause after movement holds back-and-forth animations at each end and holds other animations after each completed cycle. Animations pause automatically while editing unless Preview animations is enabled.</p>
        </fieldset>
        <div class="editor-actions">
          <button type="button" data-editor-action="copy" data-needs-selection>Copy</button>
          <button type="button" data-editor-action="paste" disabled>Paste</button>
          <button type="button" data-editor-action="delete" data-needs-selection>Remove</button>
        </div>
        <div class="editor-add">
          <p>Add to the 3D model</p>
          <input type="text" id="new-machine-name" placeholder="Optional custom name">
          <div><select id="new-machine-type">
            <optgroup label="Photo-refined machines">
              <option value="kodiak">KODIAK 10-45 polisher</option>
              <option value="waterjet">SQ4020 waterjet</option>
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
          </select><button type="button" data-editor-action="add">Add</button></div>
        </div>
      </div>

      <div data-editor-section="pillars" hidden>
        <div class="editor-callout">Click any yellow pillar to remove or restore it. Safety lines, trenches, and floor drains are regular selectable objects in the Objects tab, where their position, rotation, width, length, and timeline visibility can be edited.</div>
        <fieldset class="floor-controls">
          <legend>Floor layout dimensions</legend>
          <div>
            <label>Width (ft)<input type="number" min="40" step="5" data-floor-field="width"></label>
            <label>Length (ft)<input type="number" min="40" step="5" data-floor-field="length"></label>
            <label>Center X<input type="number" step="1" data-floor-field="centerX"></label>
            <label>Center Z<input type="number" step="1" data-floor-field="centerZ"></label>
          </div>
          <div class="floor-actions">
            <button type="button" data-editor-action="floor-fit">Fit floor around objects</button>
            <button type="button" data-editor-action="floor-cad">Restore CAD floor size</button>
          </div>
        </fieldset>
        <fieldset class="wall-controls">
          <legend>Exterior wall sections</legend>
          ${wallSections().map((wall) => `<label><input type="checkbox" data-wall-id="${wall.id}" checked>${wall.id.replace("-"," ")}</label>`).join("")}
        </fieldset>
        <button class="editor-wide-button" type="button" data-editor-action="restore-pillars">Restore every pillar</button>
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

      <div class="editor-footer">
        <button type="button" data-editor-action="export">Export layout</button>
        <button type="button" data-editor-action="import">Import layout</button>
        <input type="file" data-layout-file accept="application/json,.json" hidden>
        <button type="button" data-editor-action="reset">Reset project</button>
        <button type="button" data-editor-action="done" class="primary">Done editing</button>
      </div>
    `;
    frame.appendChild(panel);

    panel.querySelectorAll("[data-editor-tool]").forEach((button) => {
      button.addEventListener("click", () => {
        state.editorTool = button.dataset.editorTool;
        if (state.editorTool !== "machines") clearMachineSelection();
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
      persistLayout();
      updateEditorPanel();
      showToast(machine.designId ? "Custom design applied." : "Built-in model restored.");
    });
    panel.querySelector("[data-editor-action='machine-studio']")?.addEventListener("click", () => {
      const machine = selectedMachine();
      const standalone = /preview\.html$/i.test(window.location.pathname);
      const target = standalone ? "machine-studio.html" : "/machine-studio";
      const query = machine ? `?machine=${encodeURIComponent(machine.instanceId)}` : "";
      window.open(`${target}${query}`, "_blank", "noopener");
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
      state.snapSize = Number(event.target.value) || 0.5;
      updateEditorPanel();
    });
    panel.querySelectorAll("[data-nudge]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.nudge;
        if (action === "x-negative") nudgeSelectedMachine(-1,0,0);
        else if (action === "x-positive") nudgeSelectedMachine(1,0,0);
        else if (action === "z-negative") nudgeSelectedMachine(0,-1,0);
        else if (action === "z-positive") nudgeSelectedMachine(0,1,0);
        else if (action === "rotate-negative") nudgeSelectedMachine(0,0,-5);
        else if (action === "rotate-positive") nudgeSelectedMachine(0,0,5);
      });
    });

    panel.querySelectorAll("[data-machine-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const machine = selectedMachine();
        const selection = selectedMachines();
        if (!machine) return;
        const field = input.dataset.machineField;
        pushHistory();
        if (field === "color" && selection.length > 1) {
          const color = input.value.trim();
          if (/^#[0-9a-f]{6}$/i.test(color)) selection.forEach((item) => { item.color = color; });
          persistLayout();
          updateEditorPanel();
          showToast(`Updated the color of ${selection.length} selected objects.`);
          return;
        }
        if (["name", "type", "color", "collisionMode"].includes(field)) {
          const value = input.value.trim();
          if (field === "name") {
            machine.name = value || machine.name;
            machine.short = machine.name;
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
            machine.collisionMode = value === "ignore" ? "ignore" : "solid";
          } else if (/^#[0-9a-f]{6}$/i.test(value)) machine.color = value;
        } else {
          const value = Number(input.value);
          if (!Number.isFinite(value)) return;
          if (["w","d","h"].includes(field)) machine[field] = Math.max(.5,value);
          else if (field === "reveal") machine[field] = clamp(Math.round(value),0,stages.length-1);
          else if (field === "retire") machine[field] = value >= 99 ? 99 : clamp(Math.round(value),machine.reveal,stages.length-1);
          else {
            machine[field] = value;
            if (field === "rotationY") machine.rotation = value;
          }
        }
        persistLayout();
        updateEditorPanel();
      });
    });

    panel.querySelectorAll("[data-machine-check]").forEach((input) => {
      input.addEventListener("change", () => {
        const machine = selectedMachine();
        if (!machine) return;
        pushHistory();
        machine[input.dataset.machineCheck] = input.checked;
        persistLayout();
        updateEditorPanel();
      });
    });

    panel.querySelectorAll("[data-animation-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const machine = selectedMachine();
        if (!machine) return;
        pushHistory();
        const field = input.dataset.animationField;
        if (["animationMode", "animationAxis"].includes(field)) machine[field] = input.value;
        else {
          const value = Number(input.value);
          if (!Number.isFinite(value)) return;
          machine[field] = ["animationSpeed", "animationPauseSeconds"].includes(field) ? Math.max(0, value) : value;
        }
        persistLayout();
        updateEditorPanel();
      });
    });
    panel.querySelectorAll("[data-animation-check]").forEach((input) => {
      input.addEventListener("change", () => {
        const machine = selectedMachine();
        if (!machine) return;
        pushHistory();
        machine[input.dataset.animationCheck] = input.checked;
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
      persistLayout();
      updateEditorPanel();
      showToast("Floor fitted around visible objects.");
    });
    panel.querySelector("[data-editor-action='floor-cad']")?.addEventListener("click", () => {
      pushHistory();
      floor = normalizeFloor(defaultFloor);
      persistLayout();
      updateEditorPanel();
      showToast("CAD floor dimensions restored.");
    });

    panel.querySelector("[data-editor-action='restore-pillars']").addEventListener("click",() => {
      pushHistory();
      state.hiddenColumns.clear();
      persistLayout();
      updateEditorPanel();
      showToast("All pillars restored.");
    });
    panel.querySelector("[data-editor-action='reset']").addEventListener("click",() => {
      if (!window.confirm("Reset every object, timeline stage, pillar, and wall change?")) return;
      pushHistory();
      machines = defaultSceneMachines();
      stages = normalizeStages(defaultStages);
      floor = normalizeFloor(defaultFloor);
      state.hiddenColumns.clear();
      state.walls = { ...defaultWalls };
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
    const fileInput = panel.querySelector("[data-layout-file]");
    panel.querySelector("[data-editor-action='import']").addEventListener("click",() => fileInput.click());
    fileInput.addEventListener("change", async () => {
      await importLayout(fileInput.files?.[0]);
      fileInput.value = "";
    });
    panel.querySelector("[data-editor-action='done']").addEventListener("click",() => setEditing(false));
    panel.querySelectorAll("[data-wall-id]").forEach((input) => {
      input.addEventListener("change",() => {
        pushHistory();
        state.walls[input.dataset.wallId] = input.checked;
        persistLayout();
      });
    });
    updateEditorPanel();
  }

  async function toggleModelFullscreen(frame) {
    try {
      if (document.fullscreenElement === frame) await document.exitFullscreen();
      else await frame.requestFullscreen();
    } catch (error) {
      console.warn("Full-screen mode could not be opened.", error);
      showToast("Full-screen mode is unavailable in this browser.");
    }
  }

  function updateFullscreenControl(frame) {
    const button = frame.querySelector("[data-toggle='fullscreen']");
    if (!button) return;
    const active = document.fullscreenElement === frame;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.textContent = active ? "Exit full screen" : "Full screen";
  }

  function addControls() {
    const frame = canvas.closest(".model-frame");
    if (!frame) return;
    const controls = document.createElement("div");
    controls.className = "model-controls";
    controls.innerHTML = `
      <button type="button" data-view="overview" aria-label="Reset to overview">Overview</button>
      <button type="button" data-view="top" aria-label="View from above">Floor plan</button>
      <button type="button" data-toggle="labels" class="active" aria-pressed="true">Labels</button>
      <button type="button" data-toggle="fullscreen" aria-pressed="false">Full screen</button>
      <button type="button" data-toggle="editor" aria-pressed="false">Edit layout</button>
    `;
    frame.appendChild(controls);
    createEditorPanel(frame);
    const play = document.createElement("button");
    play.type = "button";
    play.id = "play-timeline";
    play.className = "play-button";
    play.innerHTML = `<span>▶</span> Play progress`;
    frame.appendChild(play);

    const legend = document.createElement("div");
    legend.className = "model-legend";
    legend.innerHTML = `<span><i class="dwg"></i>DWG named</span><span><i class="correlated"></i>Photo + CAD</span><span><i class="crane"></i>Crane system</span>`;
    frame.appendChild(legend);

    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.view === "top") {
          state.yaw = 0;
          state.pitch = 1.42;
          state.zoom = .9;
          state.panX = 0;
          state.panZ = 0;
        } else {
          state.yaw = -.72;
          state.pitch = .62;
          state.zoom = 1;
          state.panX = 0;
          state.panZ = 0;
        }
      });
    });
    document.querySelectorAll("[data-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.toggle === "editor") {
          setEditing(!state.editing);
          return;
        }
        if (button.dataset.toggle === "fullscreen") {
          toggleModelFullscreen(frame);
          return;
        }
        if (button.dataset.toggle === "labels") {
          state.showLabels = !state.showLabels;
          button.classList.toggle("active", state.showLabels);
          button.setAttribute("aria-pressed", String(state.showLabels));
        }
      });
    });
    document.addEventListener("fullscreenchange", () => updateFullscreenControl(frame));
    updateFullscreenControl(frame);
    play.addEventListener("click", () => {
      state.playing = !state.playing;
      state.playAt = performance.now() + 1200 / state.playbackSpeed;
      play.classList.toggle("active", state.playing);
      play.innerHTML = state.playing ? `<span>Ⅱ</span> Pause progress` : `<span>▶</span> Play progress`;
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
      <label class="timeline-speed-label" for="timeline-speed">
        <span>Playback</span>
        <select id="timeline-speed">
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="1.5">1.5×</option>
          <option value="2">2×</option>
        </select>
      </label>
      <button type="button" data-open-timeline-editor>Edit timeline</button>
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
    const speed = toolbar.querySelector("#timeline-speed");
    speed.value = String(state.playbackSpeed);
    speed.addEventListener("change", () => {
      state.playbackSpeed = Number(speed.value) || 1;
      persistLayout();
      showToast(`Playback speed set to ${state.playbackSpeed}×.`);
    });
    toolbar.querySelector("[data-open-timeline-editor]").addEventListener("click", () => {
      if (!state.editing) setEditing(true);
      state.editorTool = "timeline";
      clearMachineSelection();
      updateEditorPanel();
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

  function project(x, y, z) {
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

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return [
      (event.clientX - rect.left) * canvas.width / rect.width,
      (event.clientY - rect.top) * canvas.height / rect.height,
    ];
  }

  function worldFromScreen(event) {
    const [screenX,screenY] = canvasPoint(event);
    const cy = Math.cos(state.yaw);
    const sy = Math.sin(state.yaw);
    const sp = Math.max(.08,Math.sin(state.pitch));
    const scale = state.zoom * Math.min(canvas.width / 720, canvas.height / 420);
    const rx = (screenX - canvas.width/2) / scale;
    const rz = (screenY - canvas.height*.57) / (sp * scale);
    return [
      modelCenter()[0] + state.panX + rx*cy + rz*sy,
      modelCenter()[1] + state.panZ - rx*sy + rz*cy,
    ];
  }

  function angleRadians(item) {
    return (Number(item.rotation) || 0) * Math.PI / 180;
  }

  function localPoint(item, localX, y, localZ) {
    const angle = angleRadians(item);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const centeredX = localX - item.w / 2;
    const centeredZ = localZ - item.d / 2;
    return [
      item.x + item.w / 2 + centeredX * cosine - centeredZ * sine,
      y + (Number(item.renderY) || 0),
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
    return {
      x: centerPoint[0] - width / 2,
      y: centerPoint[1],
      z: centerPoint[2] - depth / 2,
      w: width,
      d: depth,
      h: height,
      color,
      rotation: Number(parent.rotation) || 0,
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
    data.columns.slice(0,96).forEach(([columnX,columnZ],index) => {
      const candidate = Math.hypot(columnX-x,columnZ-z);
      if (candidate < distance) {
        nearest = index;
        distance = candidate;
      }
    });
    return nearest;
  }

  function panCamera(deltaX,deltaY) {
    const cy = Math.cos(state.yaw);
    const sy = Math.sin(state.yaw);
    const sp = Math.max(.08,Math.sin(state.pitch));
    const scale = state.zoom * Math.min(canvas.width / 720, canvas.height / 420);
    const rx = deltaX/scale;
    const rz = deltaY/(sp*scale);
    state.panX -= rx*cy + rz*sy;
    state.panZ -= -rx*sy + rz*cy;
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
    if (alpha <= 0.01) return;
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
    faceDefinitions
      .map((face) => {
        const points = face.indices.map((index) => vertices[index]);
        return {
          ...face,
          points,
          depth: points.reduce((sum, point) => sum + project(...point)[2], 0) / points.length,
        };
      })
      .sort((first, second) => first.depth - second.depth)
      .forEach((face) => polygon(face.points, face.fill, face.stroke || "rgba(20,30,34,.12)", .7, alpha));
  }

  function drawCylinder3d({ radiusX, radiusY, halfDepth, color, alpha = 1, pointFromLocal, segments = 18 }) {
    if (alpha <= 0.01 || typeof pointFromLocal !== "function") return;
    const count = Math.max(8, Math.round(Number(segments) || 18));
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
    polygon([...front].reverse(), shade(color, -.22), "rgba(15,25,28,.22)", .65, alpha);
    polygon(back, color, "rgba(15,25,28,.22)", .65, alpha);
    for (let index = 0; index < count; index += 1) {
      const next = (index + 1) % count;
      const light = -.08 - .16 * (.5 + .5 * Math.cos(index / count * Math.PI * 2));
      polygon(
        [front[index], front[next], back[next], back[index]],
        shade(color, light),
        "rgba(15,25,28,.16)",
        .5,
        alpha,
      );
    }
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

  function overlayLine3d(start, end, color, width = 1, alpha = 1) {
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

  function rectanglesIntersect(first, second) {
    return !(
      first.right <= second.left ||
      first.left >= second.right ||
      first.bottom <= second.top ||
      first.top >= second.bottom
    );
  }

  function label(text, x, y, z, color, priority = false) {
    if (!state.showLabels) return;
    const point = project(x, y, z);
    ctx.save();
    ctx.font = `600 ${Math.max(10, canvas.width / 115)}px "Segoe UI", sans-serif`;
    const width = ctx.measureText(text).width + 16;
    const height = 20;
    const offsets = priority ? [0, -24, 24, -48, 48, -72] : [0, -24, 24, -48, 48];
    let rectangle = null;
    let drawY = point[1] - 25;
    for (const offset of offsets) {
      const candidateY = point[1] - 25 + offset;
      const candidate = {
        left: point[0] - width / 2,
        right: point[0] + width / 2,
        top: candidateY,
        bottom: candidateY + height,
      };
      if (!labelRects.some((used) => rectanglesIntersect(candidate, used))) {
        rectangle = candidate;
        drawY = candidateY;
        break;
      }
    }
    if (!rectangle && !priority) {
      ctx.restore();
      return;
    }
    rectangle ||= {
      left: point[0] - width / 2,
      right: point[0] + width / 2,
      top: drawY,
      bottom: drawY + height,
    };
    labelRects.push(rectangle);
    if (Math.abs(drawY - (point[1] - 25)) > 1) {
      ctx.beginPath();
      ctx.moveTo(point[0], point[1] - 4);
      ctx.lineTo(point[0], drawY + height);
      ctx.strokeStyle = "rgba(34,48,52,.38)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(24,32,37,.86)";
    ctx.fillRect(rectangle.left, drawY, width, height);
    ctx.fillStyle = color;
    ctx.fillRect(rectangle.left, drawY, 3, height);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(text, point[0], drawY + 14);
    ctx.restore();
  }

  function drawFloor() {
    const bounds = floorBounds();
    polygon(
      [[bounds[0],0,bounds[1]],[bounds[2],0,bounds[1]],[bounds[2],0,bounds[3]],[bounds[0],0,bounds[3]]],
      colors.floor,
      "#7c8582",
      1.3
    );
    for (let x = Math.ceil(bounds[0] / 25) * 25; x < bounds[2]; x += 25) {
      line3d([x,.03,bounds[1]],[x,.03,bounds[3]],"#8f9794",.7,.25);
    }
    for (let z = Math.ceil(bounds[1] / 25) * 25; z < bounds[3]; z += 25) {
      line3d([bounds[0],.03,z],[bounds[2],.03,z],"#8f9794",.7,.25);
    }
  }

  function drawCad() {
    if (!state.showCad) return;
    data.segments.forEach((segment) => {
      if (!["barefoot","tempering","storage","walls","safety"].includes(segment.c)) return;
      const [x1,z1,x2,z2] = segment.p;
      line3d([x1,.12,z1],[x2,.12,z2],segment.k,.85,segment.c === "safety" ? .2 : .34);
    });
  }

  function drawShell() {
    const painted = clamp(state.stageFloat - 2.35);
    const wall = painted > .5 ? colors.finished : colors.shell;
    wallSections().forEach((section) => {
      if (state.walls[section.id] !== false) box({ ...section, color: wall });
    });
  }

  function drawColumn(index) {
    const column = data.columns[index];
    if (!column || state.hiddenColumns.has(index)) return;
    const [x,z] = column;
    const painted = clamp(state.stageFloat - 2.35);
    const size = 2.1 + (2.32 - 2.1) * painted;
    const color = blendHexColors(colors.steel, colors.yellow, painted);

    // Render one closed pillar volume. The previous implementation stacked a
    // yellow coat directly over a steel pillar with both top faces at y=22,
    // which caused depth-buffer flicker on the cap during the paint timeline.
    box({ x:x-size/2,z:z-size/2,w:size,d:size,h:22,color });
  }

  function sceneDepth(x,z) {
    return project(x,0,z)[2];
  }

  function drawCrane(machine, machineAlpha) {
    if (!machine.crane) return;
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

  function designComponentPoints(component) {
    if (component.type === "group") return (component.children || []).flatMap(designComponentPoints);
    if (component.type === "beam") {
      return [[Number(component.x), Number(component.y), Number(component.z)], [Number(component.x2), Number(component.y2), Number(component.z2)]];
    }
    const width = Number(component.w || component.size || 0);
    const height = Number(component.h || component.size || component.thickness || 0);
    const depth = Number(component.d || component.size || 0);
    return [
      [Number(component.x), Number(component.y), Number(component.z)],
      [Number(component.x) + width, Number(component.y) + height, Number(component.z) + depth],
    ];
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
    if (component.type === "beam") {
      [component.x, component.y, component.z] = rotatePoint([Number(component.x), Number(component.y), Number(component.z)]);
      [component.x2, component.y2, component.z2] = rotatePoint([Number(component.x2), Number(component.y2), Number(component.z2)]);
    } else {
      const width = Number(component.w || component.size || 0);
      const height = Number(component.h || component.size || component.thickness || 0);
      const depth = Number(component.d || component.size || 0);
      const center = rotatePoint([Number(component.x) + width / 2, Number(component.y) + height / 2, Number(component.z) + depth / 2]);
      component.x = center[0] - width / 2;
      component.y = center[1] - height / 2;
      component.z = center[2] - depth / 2;
    }
    component.rotationX = (Number(component.rotationX) || 0) + rotationX;
    component.rotationY = (Number(component.rotationY ?? component.rotation) || 0) + rotationY;
    component.rotationZ = (Number(component.rotationZ) || 0) + rotationZ;
    component.rotation = component.rotationY;
  }

  function scaleDesignComponentAround(component, pivot, scaleX, scaleY, scaleZ) {
    if (component.type === "group") {
      (component.children || []).forEach((child) => scaleDesignComponentAround(child, pivot, scaleX, scaleY, scaleZ));
      return;
    }
    const scalePoint = (point) => [
      pivot[0] + (point[0] - pivot[0]) * scaleX,
      pivot[1] + (point[1] - pivot[1]) * scaleY,
      pivot[2] + (point[2] - pivot[2]) * scaleZ,
    ];
    if (component.type === "beam") {
      [component.x, component.y, component.z] = scalePoint([Number(component.x), Number(component.y), Number(component.z)]);
      [component.x2, component.y2, component.z2] = scalePoint([Number(component.x2), Number(component.y2), Number(component.z2)]);
      if (scaleX === scaleY && scaleY === scaleZ) component.thickness = Math.max(.02, Number(component.thickness) * scaleX);
      return;
    }
    const width = Number(component.w || component.size || 0);
    const height = Number(component.h || component.size || component.thickness || 0);
    const depth = Number(component.d || component.size || 0);
    const center = scalePoint([Number(component.x) + width / 2, Number(component.y) + height / 2, Number(component.z) + depth / 2]);
    if (["box", "glassPanel", "wheel", "cylinder", "sphere", "cone", "wedge"].includes(component.type)) {
      component.w = Math.max(.02, width * scaleX);
      component.h = Math.max(.02, height * scaleY);
      component.d = Math.max(.02, depth * scaleZ);
      if (component.type === "wheel") component.size = Math.max(component.w, component.h);
    } else if (component.type === "rollerBed") {
      component.w = Math.max(.02, width * scaleX);
      component.d = Math.max(.02, depth * scaleZ);
      component.thickness = Math.max(.02, Number(component.thickness) * scaleY);
    }
    const newWidth = Number(component.w || component.size || 0);
    const newHeight = Number(component.h || component.size || component.thickness || 0);
    const newDepth = Number(component.d || component.size || 0);
    component.x = center[0] - newWidth / 2;
    component.y = center[1] - newHeight / 2;
    component.z = center[2] - newDepth / 2;
  }

  function multiplyDesignOpacity(component, factor) {
    if (component.type === "group") {
      (component.children || []).forEach((child) => multiplyDesignOpacity(child, factor));
      return;
    }
    component.opacity = (Number(component.opacity) || 1) * factor;
  }

  function flattenDesignComponents(components) {
    return components.flatMap((component) => component.type === "group"
      ? flattenDesignComponents(component.children || [])
      : [component]);
  }

  function animateDesignComponentSelf(component, time) {
    if (
      component.animationEnabled === false ||
      !component.animationType ||
      component.animationType === "none" ||
      (state.editing && !state.previewObjectAnimations)
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
      if (animated.type === "group") {
        const pivot = designGroupCenter(animated.children || []);
        scaleDesignComponentAround(
          animated,
          pivot,
          axis === "x" || axis === "all" ? factor : 1,
          axis === "y" || axis === "all" ? factor : 1,
          axis === "z" || axis === "all" ? factor : 1,
        );
      } else if (["box", "glassPanel", "cylinder", "sphere", "cone", "wedge"].includes(animated.type)) {
        const centerX = Number(component.x) + Number(component.w) / 2;
        const centerY = Number(component.y) + Number(component.h) / 2;
        const centerZ = Number(component.z) + Number(component.d) / 2;
        if (axis === "x" || axis === "all") animated.w = Math.max(.02, Number(component.w) * factor);
        if (axis === "y" || axis === "all") animated.h = Math.max(.02, Number(component.h) * factor);
        if (axis === "z" || axis === "all") animated.d = Math.max(.02, Number(component.d) * factor);
        animated.x = centerX - Number(animated.w) / 2;
        animated.y = centerY - Number(animated.h) / 2;
        animated.z = centerZ - Number(animated.d) / 2;
      } else if (animated.type === "wheel") {
        if (axis === "x" || axis === "all") animated.w = Math.max(.1, Number(component.w) * factor);
        if (axis === "y" || axis === "all") animated.h = Math.max(.1, Number(component.h) * factor);
        if (axis === "z" || axis === "all") animated.d = Math.max(.05, Number(component.d) * factor);
      } else if (animated.type === "rollerBed") {
        const centerX = Number(component.x) + Number(component.w) / 2;
        const centerZ = Number(component.z) + Number(component.d) / 2;
        if (axis === "x" || axis === "all") animated.w = Math.max(.1, Number(component.w) * factor);
        if (axis === "z" || axis === "all") animated.d = Math.max(.1, Number(component.d) * factor);
        if (axis === "y" || axis === "all") animated.thickness = Math.max(.1, Number(component.thickness) * factor);
        animated.x = centerX - Number(animated.w) / 2;
        animated.z = centerZ - Number(animated.d) / 2;
      } else if (animated.type === "beam") {
        const centerX = (Number(component.x) + Number(component.x2)) / 2;
        const centerY = (Number(component.y) + Number(component.y2)) / 2;
        const centerZ = (Number(component.z) + Number(component.z2)) / 2;
        const scaleX = axis === "x" || axis === "all" ? factor : 1;
        const scaleY = axis === "y" || axis === "all" ? factor : 1;
        const scaleZ = axis === "z" || axis === "all" ? factor : 1;
        animated.x = centerX + (Number(component.x) - centerX) * scaleX;
        animated.y = centerY + (Number(component.y) - centerY) * scaleY;
        animated.z = centerZ + (Number(component.z) - centerZ) * scaleZ;
        animated.x2 = centerX + (Number(component.x2) - centerX) * scaleX;
        animated.y2 = centerY + (Number(component.y2) - centerY) * scaleY;
        animated.z2 = centerZ + (Number(component.z2) - centerZ) * scaleZ;
        if (axis === "all") animated.thickness = Math.max(.1, Number(component.thickness) * factor);
      }
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

  function designComponentAnimationDelta(component, animated) {
    const baseCenter = designGroupCenter([component]);
    const animatedCenter = designGroupCenter([animated]);
    const baseBounds = designComponentBounds(component);
    const animatedBounds = designComponentBounds(animated);
    const ratio = (next, base) => Math.abs(base) > .0001 ? next / base : 1;
    return {
      translation: animatedCenter.map((value, index) => value - baseCenter[index]),
      rotation: [
        (Number(animated.rotationX) || 0) - (Number(component.rotationX) || 0),
        (Number(animated.rotationY ?? animated.rotation) || 0) - (Number(component.rotationY ?? component.rotation) || 0),
        (Number(animated.rotationZ) || 0) - (Number(component.rotationZ) || 0),
      ],
      scale: [
        ratio(animatedBounds.maxX - animatedBounds.minX, baseBounds.maxX - baseBounds.minX),
        ratio(animatedBounds.maxY - animatedBounds.minY, baseBounds.maxY - baseBounds.minY),
        ratio(animatedBounds.maxZ - animatedBounds.minZ, baseBounds.maxZ - baseBounds.minZ),
      ],
      alpha: Math.max(.01, Number(animated.opacity ?? 1) / Math.max(.01, Number(component.opacity ?? 1))),
    };
  }

  function applyInheritedDesignTransform(component, transform, pivot) {
    const rendered = clone(component);
    scaleDesignComponentAround(rendered, pivot, ...transform.scale);
    rotateDesignComponentAround(rendered, pivot, ...transform.rotation);
    translateDesignComponent(rendered, ...transform.translation);
    if (Math.abs(transform.alpha - 1) > .0001) multiplyDesignOpacity(rendered, transform.alpha);
    return rendered;
  }

  function animateDesignComponent(component, time) {
    if (component.type !== "group") return animateDesignComponentSelf(component, time);
    const children = component.children || [];
    if (!children.length) return animateDesignComponentSelf(component, time);
    const driver = children.find((child) => child.id === component.motionDriverId)
      || children.find((child) => child.animationEnabled !== false && child.animationType && child.animationType !== "none")
      || children[0];
    const driverAnimated = animateDesignComponentSelf(driver, time);
    const inheritedTransform = designComponentAnimationDelta(driver, driverAnimated);
    const driverPivot = designGroupCenter([driver]);
    const animatedGroup = clone(component);
    animatedGroup.motionDriverId = driver.id;
    animatedGroup.children = children.map((child) => {
      const ownAnimated = child.id === driver.id ? clone(child) : animateDesignComponent(child, time);
      return applyInheritedDesignTransform(ownAnimated, inheritedTransform, driverPivot);
    });
    return animateDesignComponentSelf(animatedGroup, time);
  }

  function scaledComponentBox(machine, component, design) {
    const base = design.base || { w: machine.w, d: machine.d, h: machine.h };
    const scaleX = machine.w / Math.max(.01, Number(base.w) || machine.w);
    const scaleY = machine.h / Math.max(.01, Number(base.h) || machine.h);
    const scaleZ = machine.d / Math.max(.01, Number(base.d) || machine.d);
    const width = Math.max(.02, Number(component.w) * scaleX);
    const depth = Math.max(.02, Number(component.d) * scaleZ);
    const height = Math.max(.02, Number(component.h) * scaleY);
    const localCenterX = (Number(component.x) + Number(component.w) / 2) * scaleX;
    const localCenterZ = (Number(component.z) + Number(component.d) / 2) * scaleZ;
    const worldCenter = localPoint(machine, localCenterX, 0, localCenterZ);
    return {
      x: worldCenter[0] - width / 2,
      z: worldCenter[2] - depth / 2,
      y: Number(component.y) * scaleY + (Number(machine.renderY) || 0),
      w: width,
      d: depth,
      h: height,
      color: component.color || machine.color,
      rotationX: Number(component.rotationX) || 0,
      rotationY: (Number(machine.rotation) || 0) + (Number.isFinite(Number(component.rotationY)) ? Number(component.rotationY) : Number(component.rotation) || 0),
      rotationZ: Number(component.rotationZ) || 0,
      rotation: (Number(machine.rotation) || 0) + (Number.isFinite(Number(component.rotationY)) ? Number(component.rotationY) : Number(component.rotation) || 0),
    };
  }

  function drawDesignWheel(machine, component, design, alpha, grow = 1) {
    const base = design.base || { w: machine.w, d: machine.d, h: machine.h };
    const scaleX = machine.w / Math.max(.01, Number(base.w) || machine.w);
    const scaleY = machine.h / Math.max(.01, Number(base.h) || machine.h);
    const scaleZ = machine.d / Math.max(.01, Number(base.d) || machine.d);
    const center = [
      Number(component.x) * scaleX,
      Number(component.y) * scaleY * grow,
      Number(component.z) * scaleZ,
    ];
    const radiusX = Math.max(.025, Number(component.w || component.size || 1.2) * scaleX / 2);
    const radiusY = Math.max(.025, Number(component.h || component.size || 1.2) * scaleY * grow / 2);
    const halfDepth = Math.max(.02, Number(component.d || component.size * .64 || .75) * scaleZ / 2);
    const rotation = designComponentRotation(component);
    const pointFromWheelSpace = (offset) => {
      const rotated = rotateVector3(offset, ...rotation);
      return localPoint3d(
        machine,
        center[0] + rotated[0],
        center[1] + rotated[1],
        center[2] + rotated[2],
      );
    };
    drawCylinder3d({
      center,
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
    const base = design.base || { w: machine.w, d: machine.d, h: machine.h };
    const scaleX = machine.w / Math.max(.01, Number(base.w) || machine.w);
    const scaleY = machine.h / Math.max(.01, Number(base.h) || machine.h);
    const scaleZ = machine.d / Math.max(.01, Number(base.d) || machine.d);
    const center = [
      Number(component.x) + Number(component.w || 0) / 2,
      Number(component.y) + Number(component.h || 0) / 2,
      Number(component.z) + Number(component.d || 0) / 2,
    ];
    const rotated = rotatedDesignPoint(component, point, center);
    return localPoint3d(machine, rotated[0] * scaleX, rotated[1] * scaleY * grow, rotated[2] * scaleZ);
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

  function designBeamVertices(component) {
    const center = [
      (Number(component.x)+Number(component.x2))/2,
      (Number(component.y)+Number(component.y2))/2,
      (Number(component.z)+Number(component.z2))/2,
    ];
    const start = rotatedDesignPoint(component,[Number(component.x),Number(component.y),Number(component.z)],center);
    const end = rotatedDesignPoint(component,[Number(component.x2),Number(component.y2),Number(component.z2)],center);
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
    ];
  }

  function drawDesignBeam(machine, component, design, alpha, grow) {
    const base = design.base || { w: machine.w, d: machine.d, h: machine.h };
    const scaleX = machine.w / Math.max(.01,Number(base.w)||machine.w);
    const scaleY = machine.h / Math.max(.01,Number(base.h)||machine.h);
    const scaleZ = machine.d / Math.max(.01,Number(base.d)||machine.d);
    const vertices = designBeamVertices(component).map((point)=>localPoint3d(
      machine,point[0]*scaleX,point[1]*scaleY*grow,point[2]*scaleZ,
    ));
    drawClosedPrism(vertices,component.color || machine.color,alpha);
  }

  function drawDesignCylinder(machine, component, design, alpha, grow, topScale = 1) {
    const count = Math.max(8,Math.min(48,Math.round(Number(component.segments)||20)));
    const center = [
      Number(component.x)+Number(component.w)/2,
      Number(component.y)+Number(component.h)/2,
      Number(component.z)+Number(component.d)/2,
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
    const longitude=Math.max(10,Math.min(36,Math.round(Number(component.segments)||20)));
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

  function drawCustomDesign(machine, alpha, grow, time) {
    const design = machine.designId ? designLibrary[machine.designId] : null;
    if (!design || !Array.isArray(design.components)) return false;
    const base = design.base || { w: machine.w, d: machine.d, h: machine.h };
    const scaleX = machine.w / Math.max(.01, Number(base.w) || machine.w);
    const scaleY = machine.h / Math.max(.01, Number(base.h) || machine.h);
    const scaleZ = machine.d / Math.max(.01, Number(base.d) || machine.d);
    const visibleComponents = flattenDesignComponents(design.components
      .filter((component) => component.visible !== false)
      .map((component) => animateDesignComponent(component, time)))
      .filter((component) => component.visible !== false);
    visibleComponents.forEach((component) => {
      const componentAlpha = alpha * clamp(Number(component.opacity ?? 1), 0.05, 1);
      if (component.type === "box" || component.type === "glassPanel") {
        box(scaledComponentBox(machine, component, design), componentAlpha, grow);
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
        const width = Number(component.w) * scaleX;
        const depth = Number(component.d) * scaleZ;
        for (let index = 0; index < count; index += 1) {
          const ratio = count === 1 ? 0 : index / (count - 1);
          const localX = Number(component.x) + Number(component.w) * ratio;
          const start = [localX, Number(component.y), Number(component.z)];
          const end = [localX, Number(component.y), Number(component.z) + Number(component.d)];
          const center = [Number(component.x)+Number(component.w)/2,Number(component.y),Number(component.z)+Number(component.d)/2];
          const rotatedStart = rotatedDesignPoint(component,start,center);
          const rotatedEnd = rotatedDesignPoint(component,end,center);
          const roundedWidth = Math.max(.6, Number(component.thickness) || 1.5);
          ctx.save();
          ctx.lineCap = "round";
          localLine(machine,
            [rotatedStart[0] * scaleX, rotatedStart[1] * scaleY * grow, rotatedStart[2] * scaleZ],
            [rotatedEnd[0] * scaleX, rotatedEnd[1] * scaleY * grow, rotatedEnd[2] * scaleZ],
            component.color || "#c7d0cd",
            roundedWidth,
            componentAlpha,
          );
          ctx.restore();
        }
      } else if (component.type === "wheel") {
        drawDesignWheel(machine, component, design, componentAlpha, grow);
      }
    });
    return true;
  }

  function drawMachineShape(machine, alpha, grow, time) {
    if (drawCustomDesign(machine, alpha, grow, time)) return;
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
      box(localBox(machine,cabWidth*.15,.55,cabWidth*.65,.3,1.5*grow,"#8fc6d4",3.5*grow),alpha*.9,1);
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
        box(localBox(machine,Math.min(offset,machine.w-1.3),1.2,.45,Math.max(.5,machine.d-2.4),Math.max(2,machine.h*.72*grow),colors.glass,1.45*grow),alpha*.72,1);
      }
      [[cabWidth*.25,.2],[cabWidth*.75,.2],[machine.w*.65,.2],[machine.w*.88,.2]].forEach(([x,z]) => {
        box(localBox(machine,x-.55,z,.95,1.2,1.0*grow,"#1d2224",-.15),alpha,1);
      });
    } else if (machine.type === "aFrame" || machine.type === "aFrameTruck") {
      const isTruck = machine.type === "aFrameTruck";
      const peak = [machine.w/2,topHeight,machine.d/2];
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
      box(localBox(machine,1,1.4,.9,Math.max(.5,machine.w-2),Math.max(.3,machine.d*.12),Math.max(2,machine.h*.72),colors.glass),alpha*.54,1);
      box(localBox(machine,1,1.4,machine.d-Math.max(.4,machine.d*.12)-.9,Math.max(.5,machine.w-2),Math.max(.3,machine.d*.12),Math.max(2,machine.h*.72),colors.glass),alpha*.54,1);
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
        box(localBox(machine,Math.min(offset,machine.w-1),1,.55,Math.max(.5,machine.d-2),(machine.h+4)*grow,colors.glass),alpha*.82,1);
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
      box({ ...machine, rotationY: Number(machine.rotationY ?? machine.rotation) || 0, color: machine.color || colors.glass, y: Number(machine.renderY) || 0 }, alpha * .72, grow);
      localLine3d(machine,[machine.w/2,0,machine.d/2],[machine.w/2,machine.h*grow,machine.d/2],"rgba(255,255,255,.6)",1.2,alpha*.65);
    } else if (machine.type === "animatedBox") {
      box({ ...machine, rotationY: Number(machine.rotationY ?? machine.rotation) || 0, y: Number(machine.renderY) || 0 },alpha,grow);
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
    }
  }

  function drawOverlapIndicator(machine, overlappingIds) {
    if (!state.editing || !overlappingIds.has(machine.instanceId)) return;
    overlayPolygon(footprint(machine, .6, .18), "rgba(190,55,45,.12)", "#c33a32", 2.2, 1);
  }


  function animationWave(machine, time) {
    const speed = Math.max(0, Number(machine.animationSpeed) || 0);
    const pauseSeconds = Math.max(0, Number(machine.animationPauseSeconds) || 0);
    const phase = ((Number(machine.animationPhase) || 0) / 360 + 1) % 1;
    if (speed <= 0) return { cycle: 0, wrapped: 0, sine: 0, pingPong: 0 };

    const activeDuration = 1 / speed;
    const elapsed = Math.max(0, time / 1000 + phase * activeDuration);
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
        machineAnimationTransform(machine, time),
        machineBasePivot(machine),
      );
      motionAncestorChain(machine).forEach((parent) => {
        rendered = applyMachineAnimationTransform(
          rendered,
          machineAnimationTransform(parent, time),
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

  function visibleMachineEntries(time) {
    return machines.flatMap((machine) => {
      if (machine.visible === false) return [];
      const alpha = stageAlpha(machine.reveal,machine.retire);
      if (alpha <= .01) return [];
      const rendered = animatedMachine(machine, time);
      return [{
        kind: "machine",
        machine,
        rendered,
        alpha: alpha * (Number(rendered.renderAlpha) || 1),
        grow: clamp(state.stageFloat - machine.reveal + 1),
        depth: sceneDepth(rendered.x+rendered.w/2,rendered.z+rendered.d/2),
      }];
    });
  }

  function visibleColumnEntries() {
    return data.columns.slice(0,96).flatMap(([x,z],index) => (
      state.hiddenColumns.has(index)
        ? []
        : [{ kind: "column", index, depth: sceneDepth(x,z) }]
    ));
  }

  // The viewer is drawn on a 2D canvas, so there is no hardware depth buffer.
  // Columns and equipment must therefore share one painter-order list. Drawing
  // all columns first made front columns disappear behind equipment, while the
  // old outline pass made rear columns show through solid machines. Sorting both
  // object types together gives the expected result: rear columns are covered by
  // machinery and front columns remain visible without any see-through outline.
  function drawSceneObjects(time) {
    const overlappingIds = state.editing ? overlapIds() : new Set();
    const machineEntries = visibleMachineEntries(time);
    const sceneEntries = [...visibleColumnEntries(), ...machineEntries]
      .sort((first,second) => first.depth-second.depth);

    sceneEntries.forEach((entry) => {
      if (entry.kind === "column") {
        drawColumn(entry.index);
        return;
      }
      drawCrane(entry.rendered,entry.alpha);
      drawMachineShape(entry.rendered,entry.alpha,entry.grow,time);
    });

    // Editor marks and labels are UI overlays, so draw them after the physical
    // scene. This keeps selection feedback readable without changing occlusion.
    machineEntries.forEach(({ machine, rendered, alpha }) => {
      drawOverlapIndicator(machine, overlappingIds);
      drawSelection(rendered);
      if (alpha <= .15 || machine.showLabel === false) return;
      const current = Math.round(state.stageFloat) === machine.reveal;
      const source = machine.placement_status === "dwg_named"
        ? "DWG"
        : machine.placement_status === "user_added" ? "CUSTOM" : machine.placement_status === "illustrative" ? "ILLUSTRATIVE" : "PHOTO + CAD";
      label(
        `${machine.name}${current ? ` · ${source}` : ""}`,
        rendered.x + rendered.w/2,
        rendered.h + 5 + (Number(rendered.renderY) || 0),
        rendered.z + rendered.d/2,
        current ? colors.orange : colors.teal,
        state.selectedMachineIds.has(machine.instanceId) || current
      );
    });
  }

  function updateCanvasSize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
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
  }

  function draw(time) {
    state.lastFrameTime = time;
    updateCanvasSize();
    state.stageFloat += (state.stage - state.stageFloat) * .07;
    if (state.playing && time > state.playAt) {
      setStage(state.stage >= stages.length - 1 ? 0 : state.stage + 1);
      const baseDelay = state.stage === 0 ? 1600 : 3400;
      state.playAt = time + baseDelay / state.playbackSpeed;
    }
    ctx.clearRect(0,0,canvas.width,canvas.height);
    depthRenderer.beginFrame(canvas.width, canvas.height, project);
    labelRects = [];
    drawFloor();
    drawShell();
    drawSceneObjects(time);
    depthRenderer.render();
    requestAnimationFrame(draw);
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
    state.stage = clamp(Math.round(index), 0, stages.length - 1);
    const stage = stages[state.stage];
    const number = document.getElementById("stage-number");
    const title = document.getElementById("stage-title");
    const description = document.getElementById("stage-description");
    const previous = document.getElementById("previous-stage");
    const next = document.getElementById("next-stage");
    const fill = document.getElementById("timeline-fill");
    if (number) number.textContent = String(state.stage + 1).padStart(2,"0");
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
    if (state.editing && state.editorTool === "timeline") updateEditorPanel();
  }

  buildTimeline();
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button > 2) return;
    const wantsOrbit = event.altKey || event.button === 2;
    const additiveSelection = event.shiftKey || event.ctrlKey || event.metaKey;
    const selectableHit = state.editing && state.editorTool === "machines" && state.editorInteraction !== "navigate"
      ? machineAt(event)
      : null;
    const wantsPan = event.button === 1 || state.spacePressed || (event.shiftKey && !selectableHit);
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;

    if (state.editing) {
      if (state.editorTool === "timeline") return;
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
        const columnIndex = columnAt(event);
        if (columnIndex !== null) {
          pushHistory();
          if (state.hiddenColumns.has(columnIndex)) state.hiddenColumns.delete(columnIndex);
          else state.hiddenColumns.add(columnIndex);
          persistLayout();
          updateEditorPanel();
        }
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
      state.dragAction = wantsPan ? "pan" : "orbit";
    }
    state.dragging = true;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    const deltaX = event.clientX-state.pointerX;
    const deltaY = event.clientY-state.pointerY;
    if (state.dragAction === "machine") {
      const machine = selectedMachine();
      if (machine) {
        const [worldX,worldZ] = worldFromScreen(event);
        const snap = Math.max(0.1, Number(state.snapSize) || 0.5);
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
        updateEditorPanel();
      }
    } else if (state.dragAction === "pan") {
      panCamera(deltaX,deltaY);
    } else {
      state.yaw -= deltaX * .006;
      state.pitch = clamp(state.pitch - deltaY * .004, .16, 1.43);
    }
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
  });
  function finishPointer() {
    if (state.draggedMachineId && state.dragMoved && state.dragSnapshot) {
      pushHistory(state.dragSnapshot);
      persistLayout();
    }
    state.dragging = false;
    state.draggedMachineId = null;
    state.dragSnapshot = null;
    state.dragMoved = false;
    state.dragAction = "orbit";
  }
  canvas.addEventListener("pointerup",finishPointer);
  canvas.addEventListener("pointercancel",finishPointer);
  canvas.addEventListener("contextmenu",(event) => event.preventDefault());
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    state.zoom = clamp(state.zoom * (event.deltaY > 0 ? 1.08 : .92), .52, 2.5);
  }, { passive: false });

  window.addEventListener("focus", refreshExternalProjectChanges);
  window.addEventListener("pageshow", refreshExternalProjectChanges);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshExternalProjectChanges();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === DESIGN_STORAGE_KEY) refreshDesignLibrary();
    if (event.key === STORAGE_KEY) refreshMachineDesignAssignments();
  });
  syncChannel?.addEventListener("message", (event) => {
    if (event.data?.type === "design-library-updated") refreshDesignLibrary();
    if (event.data?.type === "layout-updated") refreshMachineDesignAssignments();
  });

  document.getElementById("next-stage")?.addEventListener("click", () => setStage(state.stage + 1));
  document.getElementById("previous-stage")?.addEventListener("click", () => setStage(state.stage - 1));
  window.addEventListener("keydown", (event) => {
    const typing = ["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName);
    if (!typing && event.code === "Space") {
      state.spacePressed = true;
      event.preventDefault();
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
  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") state.spacePressed = false;
  });
  window.addEventListener("blur", () => {
    state.spacePressed = false;
    finishPointer();
  });

  window.addEventListener("resize", updateCanvasSize);
  window.addEventListener("pagehide", () => syncChannel?.close());

  addControls();
  addTimelineToolbar();
  setStage(0);
  requestAnimationFrame(draw);
})();
