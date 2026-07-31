(() => {
  const box = (id, name, x, y, z, w, h, d, color, extra = {}) => ({
    id, name, type: "box", x, y, z, w, h, d, color, opacity: 1, rotation: 0, visible: true, ...extra,
  });
  const beam = (id, name, x, y, z, x2, y2, z2, color, thickness = 2, extra = {}) => ({
    id, name, type: "beam", x, y, z, x2, y2, z2, color, thickness, opacity: 1, visible: true, ...extra,
  });
  const rollers = (id, name, x, y, z, w, d, color, count = 12, extra = {}) => ({
    id, name, type: "rollerBed", x, y, z, w, d, count, color, thickness: 1.5, opacity: 1, visible: true, ...extra,
  });
  const wheel = (id, name, x, y, z, size = 1.2, color = "#20272a", extra = {}) => ({
    id, name, type: "wheel", x, y, z, w: size, h: size, d: size * 0.64, size, color, opacity: 1, visible: true, ...extra,
  });
  const glass = (id, name, x, y, z, w, h, d, extra = {}) => box(
    id, name, x, y, z, w, h, d, "#8fc6d4", { opacity: 0.55, ...extra },
  );

  const designs = {
    "generic-machine": {
      id: "generic-machine",
      name: "Generic enclosed machine",
      machineType: "generic",
      description: "A clean enclosed machine starter with a cabinet, work deck, and operator console.",
      base: { w: 20, d: 10, h: 8 },
      components: [
        box("base", "Base cabinet", 0, 0, 0, 20, 5.5, 10, "#277d78"),
        box("deck", "Work deck", 1, 5.5, 1, 18, 0.8, 8, "#a7c8c4"),
        box("console", "Operator console", 15.5, 6.3, 0.3, 4, 2.7, 2.8, "#e4e8e5"),
        box("screen", "Console screen", 16.2, 7.1, 0.12, 2.6, 1.1, 0.2, "#2c677d"),
      ],
    },
    "kodiak-standard": {
      id: "kodiak-standard",
      name: "KODIAK 10-45 detailed",
      machineType: "kodiak",
      description: "Long enclosed polishing body with ten lower spindle motors, conveyor, hood, and controls.",
      base: { w: 25, d: 9, h: 8 },
      components: [
        box("frame", "Lower frame", 0, 0, 0, 25, 1, 9, "#30393d"),
        box("body", "Main cabinet", 0.4, 1, 0.4, 24.2, 2.8, 8.2, "#edf0ed"),
        box("hood", "Upper hood", 13.5, 3.8, 0.3, 8, 3.4, 2.3, "#d5dbd8"),
        rollers("conveyor", "Glass conveyor", 0.8, 4.1, 0.5, 23.4, 2.1, "#c7d0cd", 15),
        box("console", "Control cabinet", 19.2, 4.3, 0.1, 4.4, 3.1, 1.8, "#e4e8e5"),
        box("screen", "Touchscreen", 20.1, 5.25, -0.05, 2.6, 1.15, 0.18, "#4a9fbd"),
        ...Array.from({ length: 10 }, (_, index) => box(
          `motor-${index + 1}`, `Spindle motor ${index + 1}`, 1 + index * 2.25, 0.45, 5.7, 1.55, 2.15, 2.35, "#13477f",
        )),
        ...[2, 7, 12, 17, 22].flatMap((x, index) => [
          wheel(`wheel-front-${index}`, "Front caster", x, -0.15, 0.4),
          wheel(`wheel-rear-${index}`, "Rear caster", x, -0.15, 8.6),
        ]),
      ],
    },
    "waterjet-standard": {
      id: "waterjet-standard",
      name: "SQ4020 waterjet detailed",
      machineType: "waterjet",
      description: "Open water tank, cutting bridge, gantry uprights, cutting head, and operator console.",
      base: { w: 27, d: 18, h: 8 },
      components: [
        box("tank", "Water tank", 0, 0, 0, 27, 3.2, 18, "#1f75b8"),
        box("water", "Water surface", 0.6, 3.2, 0.6, 25.8, 0.25, 16.8, "#9acbd5", { opacity: 0.7 }),
        box("left-rail", "Left gantry rail", 1.2, 3.45, 1.1, 1.5, 4.2, 15.8, "#718184"),
        box("right-rail", "Right gantry rail", 24.3, 3.45, 1.1, 1.5, 4.2, 15.8, "#718184"),
        beam("bridge", "Cutting bridge", 2, 7.2, 9, 25, 7.2, 9, "#b7c0be", 5),
        beam("head-rail", "Cutting head rail", 13.5, 7.2, 3, 13.5, 7.2, 15, "#d6dbd8", 3),
        box("head", "Cutting head", 12.5, 5.1, 8.2, 2, 2.6, 1.6, "#d18f35"),
        box("console", "Operator console", 23, 3.45, -0.1, 3.5, 4.3, 2.8, "#e8ebe8"),
        box("screen", "Console touchscreen", 23.7, 5.2, -0.22, 2.1, 1.25, 0.2, "#4da6c5"),
      ],
    },
    "denver-standard": {
      id: "denver-standard",
      name: "Denver Surface CNC detailed",
      machineType: "denver",
      description: "Vertical CNC support table, tall machining tower, safety rail, and operator console.",
      base: { w: 37, d: 10, h: 14 },
      components: [
        box("base", "Base frame", 0, 0, 0, 37, 1, 10, "#4d585b"),
        rollers("support", "Glass support rollers", 0.8, 3.2, 3.3, 35.4, 4.2, "#d7ddda", 17),
        box("tower", "Machining tower", 16.5, 1, 0.8, 5.7, 13, 8.4, "#182126"),
        box("tower-left", "Left tower trim", 15.6, 1.4, 1.2, 0.9, 12.1, 7.6, "#edf0ed"),
        box("tower-right", "Right tower trim", 22.2, 1.4, 1.2, 0.9, 12.1, 7.6, "#edf0ed"),
        glass("tower-window", "Tower observation window", 17.3, 4.2, 0.55, 4.1, 7.2, 0.22, { opacity: 0.32 }),
        box("console", "Operator console", 32.8, 3.1, 0.2, 3.7, 4.2, 2.3, "#e4e8e5"),
        box("screen", "Console screen", 33.5, 4.6, 0.02, 2.3, 1.3, 0.18, "#4aa5c2"),
        beam("safety-top", "Safety rail top", 0.8, 4.2, 9.8, 36.2, 4.2, 9.8, "#d9b126", 2),
      ],
    },
    "washer-standard": {
      id: "washer-standard",
      name: "Vertical washer detailed",
      machineType: "washer",
      description: "Stainless enclosed washer with teal base, access doors, and infeed/outfeed rollers.",
      base: { w: 22, d: 9, h: 12 },
      components: [
        box("base", "Teal base", 0, 0, 0, 22, 1.4, 9, "#318d98"),
        box("cabinet", "Stainless enclosure", 5.2, 1.4, 0.5, 11.6, 10.6, 8, "#c9cfcd"),
        box("left-door", "Left access door", 5.35, 2, 0.32, 5.55, 8.9, 0.2, "#d9dddb"),
        box("right-door", "Right access door", 11.1, 2, 0.32, 5.55, 8.9, 0.2, "#d4d8d6"),
        beam("door-seam", "Door seam", 11, 2.1, 0.18, 11, 10.8, 0.18, "#66706f", 1),
        rollers("infeed", "Infeed rollers", 0.3, 3.1, 0.8, 4.9, 7.4, "#d3dad7", 6),
        rollers("outfeed", "Outfeed rollers", 16.8, 3.1, 0.8, 4.9, 7.4, "#d3dad7", 6),
        box("panel", "Control panel", 4.5, 4.2, 0.12, 0.5, 3.3, 1.2, "#d9b12d"),
      ],
    },
    "furnace-standard": {
      id: "furnace-standard",
      name: "Tempering line detailed",
      machineType: "furnace",
      description: "Long red roller conveyor with white furnace hood, dark end frames, and control cabinet.",
      base: { w: 42, d: 12, h: 10 },
      components: [
        box("base", "Conveyor base", 0, 0, 0, 42, 1.4, 12, "#343d40"),
        rollers("rollers", "Tempering rollers", 0.5, 3.1, 0.8, 41, 10.4, "#d94840", 28, { thickness: 2.3 }),
        box("hood", "Furnace hood", 8.4, 3.3, 0.9, 25.2, 5.7, 10.2, "#e9eae7"),
        box("left-end", "Left end frame", 8.1, 3.6, 1.4, 0.5, 4, 9.2, "#30383b"),
        box("right-end", "Right end frame", 33.4, 3.6, 1.4, 0.5, 4, 9.2, "#30383b"),
        box("console", "Control cabinet", 37.4, 3, 0.3, 3.8, 4.4, 2.6, "#e4e8e5"),
        box("screen", "Control screen", 38.1, 4.5, 0.12, 2.4, 1.4, 0.2, "#4aa4c0"),
      ],
    },
    "fusecube-standard": {
      id: "fusecube-standard",
      name: "Diamon-Fusion FuseCube detailed",
      machineType: "cube",
      description: "Tall blue coating cabinet with front door, observation window, controls, vents, and top exhaust.",
      base: { w: 16, d: 14, h: 12 },
      components: [
        box("cabinet", "Blue cabinet", 0, 0, 0, 16, 12, 14, "#285b91"),
        box("door", "Front door", 2.4, 0.9, -0.1, 11.2, 10.1, 0.25, "#1d4b7d"),
        glass("window", "Observation window", 3.1, 7, -0.23, 3.5, 2.5, 0.16, { opacity: 0.38 }),
        box("console", "Touch control", 10.3, 5.7, -0.25, 3.1, 3.2, 0.25, "#e6e9e6"),
        box("screen", "Touchscreen", 10.85, 6.6, -0.39, 2, 1.2, 0.16, "#4ca4c1"),
        box("exhaust", "Top exhaust", 6.8, 12, 4.8, 3, 4, 3, "#27445d"),
      ],
    },
    "wrapping-standard": {
      id: "wrapping-standard",
      name: "Glass wrapping station detailed",
      machineType: "wrapping",
      description: "Roller conveyor station with support frame, film head, operator controls, and overhead bar.",
      base: { w: 26, d: 12, h: 8 },
      components: [
        box("base", "Base frame", 0, 0, 0, 26, 1, 12, "#5f696b"),
        rollers("rollers", "Transfer rollers", 0.5, 3.4, 0.6, 25, 10.8, "#aeb9b6", 17, { thickness: 1.8 }),
        box("film-head", "Film head", 1, 3.5, 7, 3.7, 2.3, 2.7, "#24568b"),
        beam("overhead", "Overhead support", 5.8, 6.6, 0.2, 20.2, 6.6, 0.2, "#8f9896", 3),
        beam("left-post", "Left post", 7.3, 3.7, 0.2, 7.3, 6.6, 0.2, "#8f9896", 2),
        beam("right-post", "Right post", 18.7, 3.7, 0.2, 18.7, 6.6, 0.2, "#8f9896", 2),
        box("console", "Operator console", 22.2, 3.3, 0.2, 3.3, 3.8, 2.2, "#e4e8e5"),
      ],
    },
    "shipping-standard": {
      id: "shipping-standard",
      name: "Shipping pickup and rack",
      machineType: "shipping",
      description: "Pickup cab with a tall A-frame glass rack and visible loaded glass lites.",
      base: { w: 24, d: 10, h: 12 },
      components: [
        box("chassis", "Truck chassis", 0, 0, 0, 24, 1.3, 10, "#333a3c"),
        box("cab", "Pickup cab", 0, 1.3, 0.8, 7.2, 4.3, 8.4, "#e1e5e2"),
        glass("windshield", "Windshield", 1.1, 3.9, 0.45, 4.8, 1.5, 0.25, { opacity: 0.5 }),
        beam("rack-base-a", "Rack base left", 7.8, 1.5, 0.6, 23.5, 1.5, 0.6, "#cfd5d2", 3),
        beam("rack-base-b", "Rack base right", 7.8, 1.5, 9.4, 23.5, 1.5, 9.4, "#cfd5d2", 3),
        ...[8, 11.5, 15, 18.5, 22].flatMap((x, index) => [
          beam(`rack-side-a-${index}`, "Rack upright", x, 1.5, 0.6, x, 11, 5, "#cfd5d2", 2),
          beam(`rack-side-b-${index}`, "Rack upright", x, 1.5, 9.4, x, 11, 5, "#cfd5d2", 2),
        ]),
        ...[9.2, 12.6, 16, 19.4].map((x, index) => glass(`glass-${index}`, `Loaded glass ${index + 1}`, x, 1.8, 1.3, 0.45, 8.5, 7.4)),
        ...[2, 5.7, 15.5, 21.5].flatMap((x, index) => [
          wheel(`wheel-a-${index}`, "Wheel", x, -0.2, 0.4, 1.5),
          wheel(`wheel-b-${index}`, "Wheel", x, -0.2, 9.6, 1.5),
        ]),
      ],
    },

    "generic-box-standard": {
      id: "generic-box-standard",
      name: "General equipment box",
      machineType: "genericBox",
      description: "Closed configurable equipment enclosure with a raised base, service doors, vents, and a status panel.",
      base: { w: 12, d: 12, h: 8 },
      components: [
        box("base", "Raised base", 0, 0, 0, 12, 0.7, 12, "#3f4a4e"),
        box("cabinet", "Main enclosure", 0.4, 0.7, 0.4, 11.2, 7.3, 11.2, "#67757a"),
        box("left-door", "Left service door", 1.1, 1.4, 0.16, 4.4, 5.7, 0.22, "#77858a"),
        box("right-door", "Right service door", 6.5, 1.4, 0.16, 4.4, 5.7, 0.22, "#718085"),
        box("status", "Status panel", 8.3, 5.5, -0.08, 2.2, 1.1, 0.18, "#3f9fb8"),
        ...Array.from({ length: 5 }, (_, index) => beam(
          `vent-${index}`, "Vent slot", 1.4 + index * 1.6, 1.1, 11.85, 2.4 + index * 1.6, 1.1, 11.85, "#2f3a3e", 0.55,
        )),
      ],
    },
    "cutting-standard": {
      id: "cutting-standard",
      name: "Barefoot cutting line",
      machineType: "cutting",
      description: "Paired low cutting tables with glass surfaces, moving bridge rails, operator control, and service cabinets.",
      base: { w: 54, d: 66, h: 7 },
      components: [
        box("left-base", "Left cutting table base", 0, 0, 0, 25.5, 2.3, 66, "#267e79"),
        box("right-base", "Right cutting table base", 28.5, 0, 0, 25.5, 2.3, 66, "#267e79"),
        glass("left-glass", "Left cutting surface", 0.8, 2.3, 0.8, 23.9, 0.35, 64.4, { opacity: 0.72 }),
        glass("right-glass", "Right cutting surface", 29.3, 2.3, 0.8, 23.9, 0.35, 64.4, { opacity: 0.72 }),
        beam("left-bridge", "Left cutter bridge", 2, 5.2, 22, 23.5, 5.2, 22, "#d9e2df", 3, {
          animationType: "oscillate", animationAxis: "z", animationAmount: 34, animationSpeed: 0.035,
        }),
        beam("right-bridge", "Right cutter bridge", 30.5, 5.2, 42, 52, 5.2, 42, "#d9e2df", 3, {
          animationType: "oscillate", animationAxis: "z", animationAmount: 34, animationSpeed: 0.035, animationPhase: 180,
        }),
        box("console", "Operator console", 23, 2.6, -1.5, 6, 4.4, 4, "#e4e8e5"),
        box("screen", "Touchscreen", 24.1, 4.1, -1.72, 3.8, 1.5, 0.2, "#4aa5c2"),
      ],
    },
    "filtration-standard": {
      id: "filtration-standard",
      name: "Waterjet filtration skid",
      machineType: "filtration",
      description: "Pump and filtration skid with paired tanks, plumbing manifold, control cabinet, and service base.",
      base: { w: 7, d: 10, h: 9 },
      components: [
        box("skid", "Skid base", 0, 0, 0, 7, 0.7, 10, "#344147"),
        box("pump", "Pump cabinet", 0.4, 0.7, 0.5, 2.2, 4.2, 9, "#276b8b"),
        box("tank-a", "Filter tank A", 3, 0.7, 0.8, 1.55, 8.1, 3.6, "#438a9f"),
        box("tank-b", "Filter tank B", 5, 0.7, 0.8, 1.55, 8.1, 3.6, "#438a9f"),
        beam("manifold", "Upper manifold", 3.2, 8.2, 2.6, 6.35, 8.2, 2.6, "#b8c7c8", 1.1),
        beam("return", "Return pipe", 3.2, 6.8, 7.6, 6.35, 6.8, 7.6, "#b8c7c8", 1.1),
        box("controls", "Control box", 3.1, 1, 5.2, 3.4, 3.2, 4.1, "#e1e6e4"),
        box("screen", "Status screen", 3.75, 2.1, 5.02, 2.1, 1.1, 0.18, "#49a4bf"),
      ],
    },
    "crane-machine-standard": {
      id: "crane-machine-standard",
      name: "Freestanding gantry crane",
      machineType: "craneMachine",
      description: "Four-post freestanding gantry with runway rails, moving bridge, trolley, hook line, and base plates.",
      base: { w: 18, d: 14, h: 18 },
      components: [
        ...[[0,0],[18,0],[0,14],[18,14]].flatMap(([x,z], index) => [
          box(`plate-${index}`, "Base plate", x - 0.55, 0, z - 0.55, 1.1, 0.3, 1.1, "#4e5759"),
          beam(`post-${index}`, "Support post", x, 0.3, z, x, 17, z, "#e2b32d", 3.2),
        ]),
        beam("runway-front", "Front runway", 0, 17, 0, 18, 17, 0, "#e2b32d", 4.2),
        beam("runway-rear", "Rear runway", 0, 17, 14, 18, 17, 14, "#e2b32d", 4.2),
        beam("bridge", "Moving bridge", 10, 17.35, 0, 10, 17.35, 14, "#596365", 4.6, {
          animationType: "oscillate", animationAxis: "x", animationAmount: 10, animationSpeed: 0.09,
        }),
        box("trolley", "Crane trolley", 8.8, 16.8, 5.6, 2.4, 1.1, 2.8, "#dd6735", {
          animationType: "oscillate", animationAxis: "x", animationAmount: 10, animationSpeed: 0.09,
        }),
        beam("hook-line", "Hook line", 10, 16.8, 7, 10, 5.5, 7, "#30383b", 1.2, {
          animationType: "oscillate", animationAxis: "x", animationAmount: 10, animationSpeed: 0.09,
        }),
        box("hook", "Hook block", 9.55, 4.6, 6.55, 0.9, 1.1, 0.9, "#30383b", {
          animationType: "oscillate", animationAxis: "x", animationAmount: 10, animationSpeed: 0.09,
        }),
      ],
    },
    "bridge-crane-standard": {
      id: "bridge-crane-standard",
      name: "Overhead bridge crane",
      machineType: "bridgeCrane",
      description: "Overhead runway frame with structural columns, twin runway beams, traveling bridge, trolley, and suspended hook.",
      base: { w: 36, d: 22, h: 21 },
      components: [
        ...[[0,0],[36,0],[0,22],[36,22]].map(([x,z], index) => beam(`column-${index}`, "Crane column", x, 0, z, x, 20, z, "#d8aa28", 3.4)),
        beam("runway-a", "Runway A", 0, 20, 0, 36, 20, 0, "#2675a7", 4.5),
        beam("runway-b", "Runway B", 0, 20, 22, 36, 20, 22, "#2675a7", 4.5),
        beam("bridge", "Bridge beam", 18, 20.35, 0, 18, 20.35, 22, "#cfd5d2", 5, {
          animationType: "oscillate", animationAxis: "x", animationAmount: 24, animationSpeed: 0.05,
        }),
        box("trolley", "Trolley", 16.7, 19.8, 9.3, 2.6, 1.2, 3.4, "#dd6735", {
          animationType: "oscillate", animationAxis: "x", animationAmount: 24, animationSpeed: 0.05,
        }),
        beam("cable", "Hoist cable", 18, 19.8, 11, 18, 7, 11, "#30383b", 1.25, {
          animationType: "oscillate", animationAxis: "x", animationAmount: 24, animationSpeed: 0.05,
        }),
        box("hook", "Hook block", 17.45, 6, 10.45, 1.1, 1.4, 1.1, "#30383b", {
          animationType: "oscillate", animationAxis: "x", animationAmount: 24, animationSpeed: 0.05,
        }),
      ],
    },
    "glass-rack-standard": {
      id: "glass-rack-standard",
      name: "Raw glass storage rack",
      machineType: "glassRack",
      description: "Fixed A-frame raw-glass rack with repeated braces, padded lower rails, stop posts, and loaded glass lites.",
      base: { w: 23, d: 9, h: 12 },
      components: [
        beam("left-base", "Left base rail", 0, 0.5, 0.7, 23, 0.5, 0.7, "#303b40", 3.2),
        beam("right-base", "Right base rail", 0, 0.5, 8.3, 23, 0.5, 8.3, "#303b40", 3.2),
        ...[0.7, 6.1, 11.5, 16.9, 22.3].flatMap((x, index) => [
          beam(`brace-a-${index}`, "Rack brace", x, 0.5, 0.8, x, 11.6, 4.5, "#303b40", 2.4),
          beam(`brace-b-${index}`, "Rack brace", x, 0.5, 8.2, x, 11.6, 4.5, "#303b40", 2.4),
        ]),
        beam("ridge", "Top ridge", 0.7, 11.6, 4.5, 22.3, 11.6, 4.5, "#303b40", 3),
        ...[2.5, 6.5, 10.5, 14.5, 18.5].map((x, index) => glass(`lite-${index}`, `Stored glass lite ${index + 1}`, x, 1, 1.2, 0.35, 9.4, 6.6, { opacity: 0.6 })),
      ],
    },
    "room-standard": {
      id: "room-standard",
      name: "Plant office or support room",
      machineType: "room",
      description: "Enclosed floor office with opaque walls, entry door, windows, ceiling cap, and simple interior furnishings.",
      base: { w: 24, d: 20, h: 12 },
      components: [
        box("room-shell", "Opaque room shell", 0, 0, 0, 24, 12, 20, "#d8d2c5"),
        box("door", "Entry door", 9.5, 0, -0.18, 5, 8.2, 0.25, "#596365"),
        glass("window-left", "Left window", 1.8, 5.3, -0.3, 6.4, 3.8, 0.2, { opacity: 0.38 }),
        glass("window-right", "Right window", 15.8, 5.3, -0.3, 6.4, 3.8, 0.2, { opacity: 0.38 }),
        box("desk-a", "Desk A", 2.2, 0.2, 3, 7, 2.6, 3.2, "#8f7d66"),
        box("desk-b", "Desk B", 14.8, 0.2, 12.5, 7, 2.6, 3.2, "#8f7d66"),
      ],
    },
    "team-member-standard": {
      id: "team-member-standard",
      name: "Plant team member",
      machineType: "person",
      description: "Editable team-member figure with head, torso, safety vest, hard hat, arms, and legs.",
      base: { w: 2.2, d: 1.8, h: 6.5 },
      components: [
        box("torso", "Torso", 0.55, 2.5, 0.35, 1.1, 2.25, 1.1, "#1e7b78"),
        box("vest", "Safety vest", 0.48, 3.05, 0.18, 1.24, 1.2, 0.2, "#e3ad28"),
        box("head", "Head", 0.68, 4.75, 0.48, 0.84, 0.9, 0.84, "#e6b993"),
        box("hard-hat", "Hard hat", 0.58, 5.56, 0.38, 1.04, 0.32, 1.04, "#e3ad28"),
        beam("left-arm", "Left arm", 0.55, 4.25, 0.9, 0.1, 2.65, 0.9, "#1e7b78", 1.1),
        beam("right-arm", "Right arm", 1.65, 4.25, 0.9, 2.1, 2.65, 0.9, "#1e7b78", 1.1),
        beam("left-leg", "Left leg", 0.82, 2.5, 0.9, 0.55, 0, 0.9, "#26363d", 1.15),
        beam("right-leg", "Right leg", 1.38, 2.5, 0.9, 1.65, 0, 0.9, "#26363d", 1.15),
      ],
    },
    "aframe-cart-standard": {
      id: "aframe-cart-standard",
      name: "A-frame glass cart",
      machineType: "aFrame",
      description: "Mobile shop cart with a low deck, four casters, braced A-frame, push handle, and glass padding.",
      base: { w: 12, d: 6, h: 9 },
      components: [
        box("deck", "Cart deck", 0, 0.6, 0, 12, 0.7, 6, "#d85f34"),
        beam("left-base", "Left lower rail", 0.3, 1.3, 0.5, 11.7, 1.3, 0.5, "#d85f34", 3),
        beam("right-base", "Right lower rail", 0.3, 1.3, 5.5, 11.7, 1.3, 5.5, "#d85f34", 3),
        ...[0.5, 4, 8, 11.5].flatMap((x, index) => [
          beam(`brace-a-${index}`, "A-frame brace", x, 1.3, 0.7, x, 8.8, 3, "#d85f34", 2.5),
          beam(`brace-b-${index}`, "A-frame brace", x, 1.3, 5.3, x, 8.8, 3, "#d85f34", 2.5),
        ]),
        beam("peak", "Peak rail", 0.5, 8.8, 3, 11.5, 8.8, 3, "#d85f34", 3),
        glass("glass-left", "Glass lite left", 1, 1.6, 0.9, 10, 6.8, 0.35, { rotation: 14 }),
        glass("glass-right", "Glass lite right", 1, 1.6, 4.75, 10, 6.8, 0.35, { rotation: -14 }),
        beam("handle-a", "Push handle upright", 0.2, 1.2, 5.8, 0.2, 5.5, 5.8, "#4e5a5c", 2.3),
        beam("handle-b", "Push handle", 0.2, 5.5, 5.8, 2.5, 5.5, 5.8, "#4e5a5c", 2.3),
        wheel("wheel-1", "Caster", 1, 0, 0.8),
        wheel("wheel-2", "Caster", 11, 0, 0.8),
        wheel("wheel-3", "Caster", 1, 0, 5.2),
        wheel("wheel-4", "Caster", 11, 0, 5.2),
      ],
    },
    "aframe-truck-standard": {
      id: "aframe-truck-standard",
      name: "A-frame glass truck",
      machineType: "aFrameTruck",
      description: "Heavy mobile glass truck with long deck, six wheels, central A-frame, removable stakes, and tow handle.",
      base: { w: 20, d: 8, h: 11 },
      components: [
        box("deck", "Heavy deck", 0, 0.8, 0, 20, 0.9, 8, "#d85f34"),
        beam("base-left", "Left base rail", 0.4, 1.7, 0.6, 19.6, 1.7, 0.6, "#d85f34", 3.5),
        beam("base-right", "Right base rail", 0.4, 1.7, 7.4, 19.6, 1.7, 7.4, "#d85f34", 3.5),
        ...[0.8, 5.5, 10, 14.5, 19.2].flatMap((x, index) => [
          beam(`stake-a-${index}`, "Left A-frame stake", x, 1.7, 0.8, x, 10.6, 4, "#d85f34", 3),
          beam(`stake-b-${index}`, "Right A-frame stake", x, 1.7, 7.2, x, 10.6, 4, "#d85f34", 3),
        ]),
        beam("peak", "Top ridge", 0.8, 10.6, 4, 19.2, 10.6, 4, "#d85f34", 3.5),
        glass("load-left", "Glass load left", 1.3, 2, 1.1, 17.4, 7.7, 0.5, { rotation: 12 }),
        glass("load-right", "Glass load right", 1.3, 2, 6.4, 17.4, 7.7, 0.5, { rotation: -12 }),
        beam("tow-arm", "Tow arm", -4, 1.2, 4, 0, 1.2, 4, "#4e5a5c", 3),
        beam("tow-loop", "Tow loop", -4, 1.2, 3.4, -4, 1.2, 4.6, "#4e5a5c", 3),
        ...[1.5, 10, 18.5].flatMap((x, index) => [
          wheel(`wheel-left-${index}`, "Left wheel", x, 0, 0.7, 1.5),
          wheel(`wheel-right-${index}`, "Right wheel", x, 0, 7.3, 1.5),
        ]),
      ],
    },
  };

  window.PLANT_MACHINE_DESIGN_STORAGE_KEY = "monroe-glass-machine-designs-v1";
  window.PLANT_MACHINE_DESIGNS = designs;
})();
