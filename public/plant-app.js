(() => {
  const data = window.PLANT_CAD_DATA;
  const canvas = document.getElementById("plant-canvas");
  if (!canvas || !data) return;

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
      title: "Machines installed",
      short: "Machines",
      era: "Equipment set",
      description: "The Barefoot cutting area, tempering line, washers, conveyors, glass racks, and supporting production cells take their places on the drawing-aligned floor.",
      details: ["Cutting line", "Tempering line", "Glass storage"],
    },
    {
      title: "First raw glass",
      short: "Raw glass",
      era: "Material arrival",
      description: "The first sheets of raw glass arrive and populate the storage racks. Material flow can now be traced from receiving to cutting, tempering, and staging.",
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

  const machines = [
    { x: -218, z: -192, w: 42, d: 82, h: 5, color: colors.teal, label: "Barefoot cutting" },
    { x: -174, z: -181, w: 22, d: 66, h: 7, color: "#427d79", label: "Cutting support" },
    { x: -78, z: -107, w: 58, d: 18, h: 9, color: colors.blue, label: "Washer & infeed" },
    { x: -16, z: -109, w: 118, d: 20, h: 13, color: colors.orange, label: "Tempering line" },
    { x: 106, z: -108, w: 52, d: 18, h: 8, color: "#b6532d", label: "Cooling & outfeed" },
    { x: 78, z: -184, w: 38, d: 28, h: 8, color: colors.teal, label: "Production cell" },
    { x: 122, z: -184, w: 38, d: 28, h: 8, color: colors.teal, label: "Production cell" },
    { x: 166, z: -184, w: 38, d: 28, h: 8, color: colors.teal, label: "Production cell" },
    { x: 78, z: -146, w: 30, d: 16, h: 7, color: "#63777e", label: "Inspection" },
    { x: 184, z: -143, w: 34, d: 18, h: 7, color: "#63777e", label: "Pack out" },
  ];

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
    legend.innerHTML = `<span><i class="barefoot"></i>Barefoot</span><span><i class="tempering"></i>Tempering</span><span><i class="storage"></i>Storage</span>`;
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

  function drawMachines() {
    const alpha = stageAlpha(5);
    const grow = clamp(state.stageFloat - 4);
    machines.forEach((machine) => box(machine,alpha,grow));
    glassRacks.forEach((rack) => {
      box({ ...rack, color: colors.dark }, alpha, grow);
      line3d([rack.x,rack.h,rack.z],[rack.x+rack.w,rack.h,rack.z+rack.d],"#879196",1.3,alpha);
    });
    const railAlpha = stageAlpha(5);
    [-36, 18].forEach((z) => {
      line3d([-146,20,z],[198,20,z],colors.orange,3,railAlpha);
      for (let x=-145; x<199; x+=43) line3d([x,20,z],[x,22,z],"#b9c0be",2,railAlpha);
    });
    if (alpha > .2) {
      label("Barefoot cutting", -197, 10, -152, colors.teal);
      label("Tempering line", 44, 17, -99, colors.orange);
      label("Glass storage", 113, 15, -197, colors.blue);
    }
  }

  function drawGlass(time) {
    const alpha = stageAlpha(6);
    glassRacks.forEach((rack,index) => {
      const count = state.stageFloat >= 9 ? 5 : 3;
      for (let panel=0; panel<count; panel++) {
        const offset = 2.4 + panel * 3.1;
        box({x:rack.x+offset,z:rack.z+1,w:.75,d:rack.d-2,h:rack.h+4,color:colors.glass},alpha,.92);
      }
    });
    if (state.stageFloat >= 8) {
      const progress = (time * .000035) % 1;
      const x = -68 + progress * 215;
      box({x,z:-106,w:1.2,d:13,h:10,color:colors.glass},stageAlpha(8),1);
      const beacon = .55 + Math.sin(time * .008) * .35;
      box({x:35,z:-100,w:2,d:2,h:18,color:"#d64a32"},beacon*stageAlpha(8),1);
    }
  }

  function drawOffices() {
    const alpha = stageAlpha(7);
    const grow = clamp(state.stageFloat - 6);
    const rooms = [
      {x:-225,z:8,w:28,d:36,h:12,color:colors.office,label:"Plant office"},
      {x:-195,z:8,w:30,d:36,h:12,color:"#c9d7d4",label:"Quality"},
      {x:-163,z:8,w:25,d:36,h:12,color:"#d8d2c5",label:"Team room"},
    ];
    rooms.forEach((room) => box(room,alpha,grow));
    if (alpha > .35) label("Plant-floor support", -181, 16, 27, colors.teal);
  }

  function drawPeople(time) {
    const alpha = stageAlpha(8);
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
