(() => {
  const data = window.PLANT_CAD_DATA;
  const equipmentData = window.PLANT_MACHINE_DATA;
  const canvas = document.getElementById("plant-canvas");
  if (!canvas || !data || !equipmentData) return;

  const ctx = canvas.getContext("2d");
  const stages = [
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
      description: "The plant shell changes from raw industrial surfaces to a brighter finished workspace, improving light and visibility across the production floor.",
      details: ["Bright walls", "Improved light", "Finished shell"],
    },
    {
      title: "Safety yellow",
      short: "Safety yellow",
      era: "Visual safety",
      description: "Columns and impact zones receive their yellow safety finish. Aisles and equipment clearances begin to read as an organized production environment.",
      details: ["Yellow columns", "Aisle markings", "Protected zones"],
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
      era: "Machine 1 of 9",
      description: "The Barefoot cutting tables are placed in the western production area using the drawing’s Barefoot label and its 3 x 6 and 4 x 9 table callouts.",
      details: ["DWG named", "Cutting tables", "West production area"],
    },
    {
      title: "SQ4020 waterjet set",
      short: "Waterjet",
      era: "Machine 2 of 9",
      description: "The SQ4020 waterjet appears at its named DWG installation detail. Its cutting table, abrasive tank, pump connection, and controller envelope follow the drawing coordinates.",
      details: ["DWG named", "SQ4020", "Cutout station"],
    },
    {
      title: "Waterjet filtration set",
      short: "Filtration",
      era: "Machine 3 of 9",
      description: "The waterjet pump, table tanks, abrasive-removal equipment, and controller are added as their own installation step beside the SQ4020.",
      details: ["DWG named", "Pump & tanks", "Water treatment"],
    },
    {
      title: "Kodiak 10-45 set",
      short: "Kodiak",
      era: "Machine 4 of 9",
      description: "The Kodiak 10-45 is installed beneath its 1,000-lb GORBEL bridge. The machine identity comes directly from the photos; the location is correlated to the compact CAD equipment cluster.",
      details: ["Photo identified", "CAD correlated", "GORBEL 1000 lb"],
    },
    {
      title: "Denver Surface #1 set",
      short: "Denver #1",
      era: "Machine 5 of 9",
      description: "The first Denver Surface unit is added at the western repeated equipment footprint beside the drawing’s roller-replacement clearance.",
      details: ["Photo identified", "Repeated CAD footprint", "GORBEL 1000 lb"],
    },
    {
      title: "Denver Surface #2 set",
      short: "Denver #2",
      era: "Machine 6 of 9",
      description: "The second Denver Surface unit is added independently at the eastern copy of the same CAD footprint, matching the paired installation seen in the photos.",
      details: ["Second unit", "Mirrored placement", "Own crane bridge"],
    },
    {
      title: "Tempering furnace set",
      short: "Furnace",
      era: "Machine 7 of 9",
      description: "The tempering furnace oven is assembled from the multi-truck delivery beneath the yellow 5-ton bridge. Its model position follows the DWG oven-layer block cluster.",
      details: ["Oven CAD layers", "8-truck arrival", "5-ton bridge"],
    },
    {
      title: "Fuze Cube set",
      short: "Fuze Cube",
      era: "Machine 8 of 9",
      description: "The Fuze Cube is installed at the point directly named in the facility drawing, east of the core processing line.",
      details: ["DWG named", "Exact drawing anchor", "Dedicated bridge"],
    },
    {
      title: "Chop saw set",
      short: "Chop saw",
      era: "Machine 9 of 9",
      description: "The chop saw completes the equipment sequence at its named location beside the wire-shelving area.",
      details: ["DWG named", "Wire shelving area", "Final machine step"],
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

  const bounds = data.bounds;
  const center = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
  const state = {
    yaw: -0.72,
    pitch: 0.62,
    zoom: 1,
    stage: 0,
    stageFloat: 0,
    dragging: false,
    pointerX: 0,
    pointerY: 0,
    showCad: true,
    showLabels: true,
    playing: false,
    playAt: 0,
  };

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

  const machines = equipmentData.machines;

  const glassRacks = Array.from({ length: 6 }, (_, index) => ({
    x: 12 + index * 35,
    z: -210,
    w: 23,
    d: 9,
    h: 12,
  }));

  const trenches = [
    [-211, -99, 385, 3],
    [-90, -195, 3, 145],
    [43, -195, 3, 96],
    [145, -195, 3, 96],
  ];

  function addControls() {
    const frame = canvas.closest(".model-frame");
    if (!frame) return;
    const controls = document.createElement("div");
    controls.className = "model-controls";
    controls.innerHTML = `
      <button type="button" data-view="overview" aria-label="Reset to overview">Overview</button>
      <button type="button" data-view="top" aria-label="View from above">Floor plan</button>
      <button type="button" data-toggle="cad" class="active" aria-pressed="true">CAD lines</button>
      <button type="button" data-toggle="labels" class="active" aria-pressed="true">Labels</button>
    `;
    frame.appendChild(controls);
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
        } else {
          state.yaw = -.72;
          state.pitch = .62;
          state.zoom = 1;
        }
      });
    });
    document.querySelectorAll("[data-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.toggle === "cad" ? "showCad" : "showLabels";
        state[key] = !state[key];
        button.classList.toggle("active", state[key]);
        button.setAttribute("aria-pressed", String(state[key]));
      });
    });
    play.addEventListener("click", () => {
      state.playing = !state.playing;
      state.playAt = performance.now() + 2500;
      play.classList.toggle("active", state.playing);
      play.innerHTML = state.playing ? `<span>Ⅱ</span> Pause progress` : `<span>▶</span> Play progress`;
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
    x -= center[0];
    z -= center[1];
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

  function polygon(points, fill, stroke = null, lineWidth = 1, alpha = 1) {
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
    const value = parseInt(hex.slice(1), 16);
    const channel = (shift) => Math.max(0, Math.min(255, ((value >> shift) & 255) + Math.round(255 * amount)));
    return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
  }

  function box(item, alpha = 1, grow = 1) {
    const { x, z, w, d, h, color } = item;
    const height = h * grow;
    const base = [[x,0,z],[x+w,0,z],[x+w,0,z+d],[x,0,z+d]];
    const top = base.map(([px,,pz]) => [px,height,pz]);
    polygon([base[0],base[1],top[1],top[0]], shade(color,-.12), null, 1, alpha);
    polygon([base[1],base[2],top[2],top[1]], shade(color,-.22), null, 1, alpha);
    polygon([base[2],base[3],top[3],top[2]], shade(color,-.18), null, 1, alpha);
    polygon(top, color, "rgba(20,30,34,.28)", 1, alpha);
  }

  function line3d(start, end, color, width = 1, alpha = 1) {
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

  function label(text, x, y, z, color) {
    if (!state.showLabels) return;
    const point = project(x, y, z);
    ctx.save();
    ctx.font = `600 ${Math.max(10, canvas.width / 115)}px "Segoe UI", sans-serif`;
    const width = ctx.measureText(text).width + 16;
    ctx.fillStyle = "rgba(24,32,37,.82)";
    ctx.fillRect(point[0] - width / 2, point[1] - 25, width, 20);
    ctx.fillStyle = color;
    ctx.fillRect(point[0] - width / 2, point[1] - 25, 3, 20);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(text, point[0], point[1] - 11);
    ctx.restore();
  }

  function drawFloor() {
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
    box({ x: bounds[0], z: bounds[1], w: 3, d: bounds[3]-bounds[1], h: 24, color: wall });
    box({ x: bounds[2]-3, z: bounds[1], w: 3, d: bounds[3]-bounds[1], h: 24, color: wall });
    box({ x: bounds[0], z: bounds[1], w: bounds[2]-bounds[0], d: 3, h: 24, color: wall });
    box({ x: bounds[0], z: bounds[3]-3, w: 104, d: 3, h: 24, color: wall });
    box({ x: 174, z: bounds[3]-3, w: bounds[2]-174, d: 3, h: 24, color: wall });
  }

  function drawColumns() {
    const yellow = clamp(state.stageFloat - 3.25);
    data.columns.slice(0, 96).forEach(([x,z]) => {
      box({ x:x-1.05,z:z-1.05,w:2.1,d:2.1,h:22,color:colors.steel });
      if (yellow > .01) box({ x:x-1.16,z:z-1.16,w:2.32,d:2.32,h:7,color:colors.yellow },yellow,yellow);
    });
  }

  function drawTrenches() {
    const alpha = stageAlpha(1, 2.3);
    trenches.forEach(([x,z,w,d]) => {
      polygon([[x,.15,z],[x+w,.15,z],[x+w,.15,z+d],[x,.15,z+d]], "#4a3a31", "#cb8f55", 1.1, alpha);
      if (state.stageFloat >= 1.7) {
        const alongX = w > d;
        line3d(
          [x + (alongX ? 0 : w/2), .22, z + (alongX ? d/2 : 0)],
          [x + (alongX ? w : w/2), .22, z + (alongX ? d/2 : d)],
          colors.utility,
          3,
          clamp(state.stageFloat - 1.7)
        );
      }
    });
    const utilityAlpha = stageAlpha(2);
    [[-90,-99],[43,-109],[145,-109],[-211,-99]].forEach(([x,z]) => {
      box({x:x-1.4,z:z-1.4,w:2.8,d:2.8,h:.45,color:colors.utility},utilityAlpha);
    });
  }

  function drawSafety() {
    const alpha = stageAlpha(4);
    const lanes = [
      [-222,-205,86,4],[-136,-205,4,121],[-132,-88,315,4],[179,-205,4,121],
      [0,-124,170,3],[0,-153,170,3],
    ];
    lanes.forEach(([x,z,w,d]) => polygon([[x,.18,z],[x+w,.18,z],[x+w,.18,z+d],[x,.18,z+d]],colors.yellow,null,1,alpha*.82));
  }

  function drawCrane(machine, machineAlpha) {
    const railAlpha = stageAlpha(5);
    if (railAlpha <= .01) return;
    const padding = machine.crane.capacity === "5 ton" ? 7 : 3;
    const height = machine.crane.height;
    const left = machine.x - padding;
    const right = machine.x + machine.w + padding;
    const near = machine.z - padding;
    const far = machine.z + machine.d + padding;
    const runway = machine.crane.capacity === "5 ton" ? "#555f61" : "#2572a4";
    const bridge = machine.crane.capacity === "5 ton" ? "#e4b52d" : "#cdd3d3";
    const support = "#dcaf28";

    line3d([left,height,near],[right,height,near],runway,machine.crane.capacity === "5 ton" ? 4 : 3,railAlpha);
    line3d([left,height,far],[right,height,far],runway,machine.crane.capacity === "5 ton" ? 4 : 3,railAlpha);
    [[left,near],[right,near],[left,far],[right,far]].forEach(([x,z]) => {
      line3d([x,0,z],[x,height,z],support,2.2,railAlpha * .72);
    });

    if (machineAlpha <= .01) return;
    const bridgeX = machine.x + machine.w * .56;
    line3d([bridgeX,height+.2,near],[bridgeX,height+.2,far],bridge,machine.crane.capacity === "5 ton" ? 5 : 3.5,machineAlpha);
    line3d(
      [bridgeX-1.2,height+.65,machine.z+machine.d/2],
      [bridgeX+1.2,height+.65,machine.z+machine.d/2],
      machine.crane.capacity === "5 ton" ? "#333b3e" : colors.orange,
      5,
      machineAlpha
    );
    line3d(
      [bridgeX,height,machine.z+machine.d/2],
      [bridgeX,machine.h+1.2,machine.z+machine.d/2],
      "#33383a",
      1.7,
      machineAlpha
    );
  }

  function drawMachineShape(machine, alpha, grow) {
    const item = { ...machine, h: machine.h * grow };
    if (machine.type === "cutting") {
      box(item,alpha,1);
      for (let offset=7; offset<machine.w; offset+=9) {
        line3d([machine.x+offset,machine.h+.15,machine.z+3],[machine.x+offset,machine.h+.15,machine.z+machine.d-3],"#b8cfca",1,alpha);
      }
    } else if (machine.type === "waterjet") {
      box({ ...item, h: 3.5 * grow },alpha,1);
      box({x:machine.x+2,z:machine.z+2,w:machine.w*.48,d:machine.d-4,h:2.2*grow,color:"#58777e"},alpha,1);
      box({x:machine.x+machine.w-5,z:machine.z+2,w:3.5,d:3.5,h:8*grow,color:"#38494e"},alpha,1);
    } else if (machine.type === "filtration") {
      box(item,alpha,1);
      [1.4,3.8].forEach((offset) => {
        box({x:machine.x+offset,z:machine.z+1,w:1.7,d:machine.d-2,h:10*grow,color:"#438a9f"},alpha,1);
      });
    } else if (machine.type === "kodiak") {
      box({ ...item, h: 4.5 * grow },alpha,1);
      box({x:machine.x+2,z:machine.z+1,w:machine.w-4,d:2.2,h:7*grow,color:"#eef0ed"},alpha,1);
      box({x:machine.x+machine.w*.58,z:machine.z+1,w:6,d:machine.d-2,h:8.2*grow,color:"#495b60"},alpha,1);
    } else if (machine.type === "denver") {
      box({ ...item, d: 3.2, h: 13 * grow },alpha,1);
      box({x:machine.x+2,z:machine.z+3.2,w:machine.w-4,d:2.2,h:3*grow,color:"#7f8d8d"},alpha,1);
      for (let offset=4; offset<machine.w-2; offset+=4) {
        line3d([machine.x+offset,3*grow,machine.z+3.2],[machine.x+offset,3*grow,machine.z+5.4],"#d3d6d3",1.2,alpha);
      }
    } else if (machine.type === "furnace") {
      box(item,alpha,1);
      box({x:machine.x-8,z:machine.z+2,w:8,d:machine.d-4,h:3.4*grow,color:"#7f8988"},alpha,1);
      box({x:machine.x+machine.w,z:machine.z+2,w:10,d:machine.d-4,h:3.4*grow,color:"#7f8988"},alpha,1);
      for (let offset=-6; offset<machine.w+9; offset+=4) {
        line3d([machine.x+offset,3.7*grow,machine.z+2],[machine.x+offset,3.7*grow,machine.z+machine.d-2],"#d2d4cf",1,alpha);
      }
    } else if (machine.type === "cube") {
      box(item,alpha,1);
      box({x:machine.x+2,z:machine.z+2,w:machine.w-4,d:machine.d-4,h:machine.h+2,color:"#668e96"},alpha,grow);
    } else if (machine.type === "saw") {
      box(item,alpha,1);
      line3d([machine.x+2,machine.h+2,machine.z+1],[machine.x+6,machine.h+2,machine.z+machine.d-1],"#d8ddd9",3,alpha);
    } else {
      box(item,alpha,1);
    }
  }

  function drawMachines() {
    machines.forEach((machine) => {
      const alpha = stageAlpha(machine.reveal);
      const grow = clamp(state.stageFloat - machine.reveal + 1);
      drawCrane(machine,alpha);
      drawMachineShape(machine,alpha,grow);
      if (alpha > .15) {
        const current = Math.round(state.stageFloat) === machine.reveal;
        label(
          `${machine.name}${current ? ` · ${machine.placement_status === "dwg_named" ? "DWG" : "PHOTO + CAD"}` : ""}`,
          machine.x + machine.w/2,
          machine.h + 5,
          machine.z + machine.d/2,
          current ? colors.orange : colors.teal
        );
      }
    });

    const rackAlpha = stageAlpha(15);
    const rackGrow = clamp(state.stageFloat - 14);
    glassRacks.forEach((rack) => {
      box({ ...rack, color: colors.dark }, rackAlpha, rackGrow);
      line3d([rack.x,rack.h,rack.z],[rack.x+rack.w,rack.h,rack.z+rack.d],"#879196",1.3,rackAlpha);
    });
    if (rackAlpha > .2) label("Raw glass storage", 113, 15, -197, colors.blue);
  }

  function drawGlass(time) {
    const alpha = stageAlpha(15);
    glassRacks.forEach((rack,index) => {
      const count = state.stageFloat >= 18 ? 5 : 3;
      for (let panel=0; panel<count; panel++) {
        const offset = 2.4 + panel * 3.1;
        box({x:rack.x+offset,z:rack.z+1,w:.75,d:rack.d-2,h:rack.h+4,color:colors.glass},alpha,.92);
      }
    });
    if (state.stageFloat >= 17) {
      const progress = (time * .000035) % 1;
      const x = 22 + progress * 144;
      box({x,z:-106,w:1.2,d:13,h:10,color:colors.glass},stageAlpha(17),1);
      const beacon = .55 + Math.sin(time * .008) * .35;
      box({x:116,z:-100,w:2,d:2,h:18,color:"#d64a32"},beacon*stageAlpha(17),1);
    }
  }

  function drawOffices() {
    const alpha = stageAlpha(16);
    const grow = clamp(state.stageFloat - 15);
    const rooms = [
      {x:-225,z:8,w:28,d:36,h:12,color:colors.office,label:"Plant office"},
      {x:-195,z:8,w:30,d:36,h:12,color:"#c9d7d4",label:"Quality"},
      {x:-163,z:8,w:25,d:36,h:12,color:"#d8d2c5",label:"Team room"},
    ];
    rooms.forEach((room) => box(room,alpha,grow));
    if (alpha > .35) label("Plant-floor support", -181, 16, 27, colors.teal);
  }

  function drawPeople(time) {
    const alpha = stageAlpha(17);
    const people = [[-191,-133],[30,-91],[151,-98],[98,-169],[202,-137]];
    people.forEach(([x,z],index) => {
      const bob = Math.sin(time*.004+index)*.15;
      box({x:x-.65,z:z-.65,w:1.3,d:1.3,h:5.4+bob,color:index%2?colors.orange:colors.teal},alpha,1);
      box({x:x-.45,z:z-.45,w:.9,d:.9,h:6.5+bob,color:"#e6b993"},alpha,1);
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
  }

  function draw(time) {
    updateCanvasSize();
    state.stageFloat += (state.stage - state.stageFloat) * .07;
    if (state.playing && time > state.playAt) {
      setStage(state.stage >= stages.length - 1 ? 0 : state.stage + 1);
      state.playAt = time + (state.stage === 0 ? 1600 : 3400);
    }
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const gradient = ctx.createLinearGradient(0,0,0,canvas.height);
    gradient.addColorStop(0,"#e8e8e2");
    gradient.addColorStop(.65,"#cbd0cd");
    gradient.addColorStop(1,"#aeb6b3");
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    drawFloor();
    drawCad();
    drawTrenches();
    drawSafety();
    drawShell();
    drawColumns();
    drawMachines();
    drawGlass(time);
    drawOffices();
    drawPeople(time);
    requestAnimationFrame(draw);
  }

  function buildTimeline() {
    const timeline = document.getElementById("timeline-stages");
    const total = document.getElementById("stage-total");
    if (total) total.textContent = String(stages.length).padStart(2,"0");
    if (!timeline) return;
    timeline.innerHTML = stages.map((stage,index) => (
      `<li${index === 0 ? ` class="active"` : ""}><button type="button">${stage.short}</button></li>`
    )).join("");
    timeline.style.setProperty("--stage-count", String(stages.length));
    timeline.closest(".timeline")?.style.setProperty("--stage-count", String(stages.length));
  }

  function setStage(index) {
    state.stage = clamp(index, 0, stages.length - 1);
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
      let details = document.querySelector(".stage-details");
      if (!details) {
        details = document.createElement("div");
        details.className = "stage-details";
        description.after(details);
      }
      details.innerHTML = `<p>${stage.era}</p><ul>${stage.details.map((detail) => `<li>${detail}</li>`).join("")}</ul>`;
    }
    if (previous) previous.disabled = state.stage === 0;
    if (next) {
      next.disabled = state.stage === stages.length - 1;
      next.innerHTML = state.stage === stages.length - 1 ? `Current plant <span>✓</span>` : `Next stage <span>→</span>`;
    }
    if (fill) fill.style.width = `${state.stage / (stages.length - 1) * 100}%`;
    document.querySelectorAll("#timeline-stages li").forEach((item,index) => {
      item.classList.toggle("active", index === state.stage);
      item.classList.toggle("complete", index < state.stage);
      const button = item.querySelector("button");
      if (button) button.setAttribute("aria-current", index === state.stage ? "step" : "false");
    });
  }

  buildTimeline();
  canvas.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    state.yaw += (event.clientX - state.pointerX) * .006;
    state.pitch = clamp(state.pitch + (event.clientY - state.pointerY) * .004, .16, 1.43);
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
  });
  canvas.addEventListener("pointerup", () => { state.dragging = false; });
  canvas.addEventListener("pointercancel", () => { state.dragging = false; });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    state.zoom = clamp(state.zoom * (event.deltaY > 0 ? .92 : 1.08), .52, 2.5);
  }, { passive: false });

  document.getElementById("next-stage")?.addEventListener("click", () => setStage(state.stage + 1));
  document.getElementById("previous-stage")?.addEventListener("click", () => setStage(state.stage - 1));
  document.querySelectorAll("#timeline-stages li").forEach((item,index) => {
    item.querySelector("button")?.addEventListener("click", () => setStage(index));
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") setStage(state.stage + 1);
    if (event.key === "ArrowLeft") setStage(state.stage - 1);
  });
  window.addEventListener("resize", updateCanvasSize);

  addControls();
  setStage(0);
  requestAnimationFrame(draw);
})();
