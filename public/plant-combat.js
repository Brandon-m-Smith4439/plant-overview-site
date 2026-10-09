(() => {
  "use strict";

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const SHIELD_MAX = 30;
  const ZOMBIE_WAVE_BREAK_MS = 11000;
  const SHIELD_RECHARGE_DELAY_MS = 2800;
  const SHIELD_RECHARGE_PER_SECOND = 7;
  const HEADSHOT_DAMAGE_MULTIPLIER = 3;
  const HIGH_SCORE_STORAGE_KEY = "monroe-glass-combat-highscores-v1";
  const GAME_MODES = Object.freeze({
    combat: Object.freeze({ key: "combat", label: "Combat", enemyLabel: "Enemies", defaultWeapon: "rifle" }),
    zombie: Object.freeze({ key: "zombie", label: "Zombie", enemyLabel: "Zombies", defaultWeapon: "shotgun", survival: true }),
  });
  const PLAYER_PRIMARY_WEAPONS = Object.freeze(["rifle", "sniper", "shotgun", "rocket", "chainsaw"]);
  const ZOMBIE_EDGE_INSET = 8;
  const ZOMBIE_INITIAL_EXTRA = 4;
  const AMMO_PICKUP_RESPAWN_MS = 18000;
  const AMMO_PICKUP_RADIUS = 3.25;
  const ZOMBIE_SETTINGS_STORAGE_KEY = "monroe-glass-zombie-settings-v2";
  const COMBAT_SETTINGS_STORAGE_KEY = "monroe-glass-combat-settings-v1";
  const RESPAWN_DELAY_MS = 5000;
  const MYSTERY_BOX_COST = 950;
  const MYSTERY_ROLL_DURATION_MS = 4800;
  const ZOMBIE_GAITS = Object.freeze({
    shambler:{speed:.58,cycle:3.2,stride:.34,swing:.22,bob:.08,lean:2},
    walker:{speed:.85,cycle:5.1,stride:.53,swing:.40,bob:.11,lean:4},
    runner:{speed:1.21,cycle:8.8,stride:.82,swing:.70,bob:.20,lean:10},
    sprinter:{speed:1.52,cycle:12.6,stride:1.04,swing:.94,bob:.27,lean:17},
    giant:{speed:.66,cycle:3.4,stride:.64,swing:.51,bob:.16,lean:6},
  });
  const MYSTERY_RISE_DURATION_MS = 1750;
  const MYSTERY_CLAIM_WINDOW_MS = 11500;
  const MYSTERY_LOWER_DURATION_MS = 2300;
  const MYSTERY_REEL_STEPS = 35;
  const HEALTH_STATION_COST = 800;
  const MAX_CARRIED_WEAPONS = 3;
  const MYSTERY_WEAPON_POOL = Object.freeze(["smg","carbine","lmg","burst","revolver","dmr","autoShotgun","heavyPistol","sniper","rocket","shotgun","novaRifle","thunderCannon","reaperLMG"]);
  const MYSTERY_REEL_POOL = Object.freeze([...MYSTERY_WEAPON_POOL,"teddy"]);
  const MYSTERY_PRIZE_WEIGHTS = Object.freeze({
    smg:14,carbine:13,lmg:12,burst:11,revolver:11,dmr:10,autoShotgun:10,
    heavyPistol:11,sniper:8,rocket:6,shotgun:10,novaRifle:.24,thunderCannon:.16,reaperLMG:.1,teddy:4.5
  });
  function mysteryRarity(key) {
    if(key==="teddy")return "cursed";
    if(["novaRifle","thunderCannon","reaperLMG"].includes(key))return "mythic";
    if(["rocket","sniper","dmr"].includes(key))return "epic";
    if(["lmg","autoShotgun","revolver"].includes(key))return "rare";
    if(["carbine","burst","heavyPistol"].includes(key))return "uncommon";
    return "common";
  }
  function rollMysteryPrize(available,random=Math.random()) {
    const pool=available.filter(key=>key==="teddy"||MYSTERY_WEAPON_POOL.includes(key));
    const total=pool.reduce((sum,key)=>sum+(MYSTERY_PRIZE_WEIGHTS[key]||0),0);
    if(!total)return "teddy";
    let target=Math.min(.999999999,Math.max(0,random))*total;
    for(const key of pool){target-=MYSTERY_PRIZE_WEIGHTS[key]||0;if(target<0)return key;}
    return pool[pool.length-1];
  }
  const HOST_ENEMY_SYNC_INTERVAL_MS = 180;
  const COOP_ENEMY_PREDICTION_MS = 240;
  // Occupancy-grid routing is deliberately capped and cached: it runs only
  // when the straight path is obstructed, never once per enemy per frame.
  const NAV_CELL_SIZE = 3.25;
  const NAV_BUCKET_SIZE = 13;
  const NAV_ROUTE_MAX_EXPANSIONS = 650;
  const NAV_ROUTE_REPLAN_MS = 900;
  const NAV_REBUILDS_PER_FRAME = 2;
  const ZOMBIE_DIFFICULTIES = Object.freeze({
    easy: Object.freeze({ key:"easy", label:"Easy", health:.72, speed:.58, damage:.70, spawnRate:1.45, aliveCap:.72, initialExtra:1, pickupRespawn:.72 }),
    normal: Object.freeze({ key:"normal", label:"Normal", health:1, speed:.72, damage:1, spawnRate:1.18, aliveCap:.9, initialExtra:3, pickupRespawn:.9 }),
    hard: Object.freeze({ key:"hard", label:"Hard", health:1.28, speed:.86, damage:1.22, spawnRate:.9, aliveCap:1.08, initialExtra:5, pickupRespawn:1.08 }),
    nightmare: Object.freeze({ key:"nightmare", label:"Nightmare", health:1.58, speed:1, damage:1.48, spawnRate:.66, aliveCap:1.38, initialExtra:8, pickupRespawn:1.28 }),
  });
  const COMBAT_DIFFICULTIES = Object.freeze({
    easy: Object.freeze({ key:"easy", label:"Easy", health:.74, speed:.82, damage:.68, accuracy:.82, fireRate:1.22 }),
    normal: Object.freeze({ key:"normal", label:"Normal", health:1, speed:1, damage:1, accuracy:1, fireRate:1 }),
    hard: Object.freeze({ key:"hard", label:"Hard", health:1.22, speed:1.10, damage:1.20, accuracy:1.08, fireRate:.88 }),
    nightmare: Object.freeze({ key:"nightmare", label:"Nightmare", health:1.48, speed:1.22, damage:1.46, accuracy:1.16, fireRate:.74 }),
  });
  const ZOMBIE_RUN_TYPES = Object.freeze({
    normal: Object.freeze({ key:"normal", label:"Normal", description:"Clear the plant. Death replay, then choose Respawn or Exit." }),
    endless: Object.freeze({ key:"endless", label:"Endless", description:"Survive escalating waves, giant bosses, and every fifth special wave. No respawns." }),
  });

  const ENEMY_WEAPONS = Object.freeze({
    rifle: Object.freeze({ key: "rifle", label: "Rifle", range: 125, preferredMin: 28, preferredMax: 62, moveSpeed: 1, fireMin: 720, fireMax: 1320, magazine: 24, reloadMs: 1900, damageMin: 6, damageMax: 11, accuracyNear: .76, accuracyFalloff: 225, tracer: "rifle" }),
    smg: Object.freeze({ key: "smg", label: "SMG", range: 95, preferredMin: 18, preferredMax: 44, moveSpeed: 1.16, fireMin: 280, fireMax: 520, magazine: 32, reloadMs: 1700, damageMin: 4, damageMax: 7, accuracyNear: .68, accuracyFalloff: 170, tracer: "smg" }),
    shotgun: Object.freeze({ key: "shotgun", label: "Shotgun", range: 58, preferredMin: 11, preferredMax: 28, moveSpeed: 1.08, fireMin: 1050, fireMax: 1550, magazine: 6, reloadMs: 2350, damageMin: 10, damageMax: 18, accuracyNear: .84, accuracyFalloff: 92, tracer: "shotgun" }),
    sniper: Object.freeze({ key: "sniper", label: "Sniper", range: 180, preferredMin: 72, preferredMax: 125, moveSpeed: .78, fireMin: 2200, fireMax: 3300, magazine: 5, reloadMs: 2750, damageMin: 18, damageMax: 27, accuracyNear: .9, accuracyFalloff: 360, tracer: "sniper" }),
    bazooka: Object.freeze({ key: "bazooka", label: "Bazooka", range: 130, sightRange: 150, preferredMin: 48, preferredMax: 92, moveSpeed: .72, fireMin: 2600, fireMax: 3900, magazine: 1, reloadMs: 3100, damageMin: 16, damageMax: 24, accuracyNear: .72, accuracyFalloff: 240, tracer: "bazooka", explosive: true, projectileSpeed: 92, explosionRadius: 9 }),
    rocket: Object.freeze({ key: "rocket", label: "Rocket Launcher", range: 155, sightRange: 170, preferredMin: 58, preferredMax: 108, moveSpeed: .68, fireMin: 3100, fireMax: 4500, magazine: 1, reloadMs: 3500, damageMin: 22, damageMax: 34, accuracyNear: .78, accuracyFalloff: 285, tracer: "rocket", explosive: true, projectileSpeed: 76, explosionRadius: 11 }),
    pistol: Object.freeze({ key: "pistol", label: "Pistol", range: 88, preferredMin: 18, preferredMax: 42, moveSpeed: 1.08, fireMin: 760, fireMax: 1180, magazine: 12, reloadMs: 1500, damageMin: 7, damageMax: 11, accuracyNear: .74, accuracyFalloff: 165, tracer: "pistol" }),
    chainsaw: Object.freeze({ key: "chainsaw", label: "Chainsaw", melee: true, range: 5.4, sightRange: 165, preferredMin: 0, preferredMax: 4.9, moveSpeed: 2.8, fireMin: 430, fireMax: 650, damageMin: 13, damageMax: 20, accuracyNear: 1, accuracyFalloff: 1, tracer: null }),
  });
  const ENEMY_WEAPON_KEYS = Object.freeze(Object.keys(ENEMY_WEAPONS));

  const WEAPONS = Object.freeze({
    rifle: Object.freeze({
      key: "rifle",
      shortLabel: "Rifle",
      magazine: 30,
      reserve: 120,
      damage: 34,
      range: 220,
      fireInterval: 105,
      reloadMs: 1700,
      automatic: true,
      scope: true,
    }),
    handgun: Object.freeze({
      key: "handgun",
      shortLabel: "Pistol",
      magazine: 15,
      reserve: 60,
      damage: 55,
      range: 140,
      fireInterval: 280,
      reloadMs: 1250,
      automatic: false,
    }),
    shotgun: Object.freeze({
      key: "shotgun",
      shortLabel: "Shotgun",
      magazine: 8,
      reserve: 48,
      damage: 15,
      range: 72,
      fireInterval: 780,
      reloadMs: 1850,
      automatic: false,
      pellets: 8,
      // Wide buckshot cone. Every pellet gets its own visible tracer.
      spread: .09,
    }),
    sniper: Object.freeze({
      key: "sniper", shortLabel: "Sniper", magazine: 5, reserve: 25, damage: 108,
      range: 360, fireInterval: 980, reloadMs: 2450, automatic: false, scope: true,
    }),
    rocket: Object.freeze({
      key: "rocket", shortLabel: "Rocket Launcher", magazine: 1, reserve: 7, damage: 145,
      range: 245, fireInterval: 1350, reloadMs: 2850, automatic: false, explosive: true, projectileSpeed: 84, explosionRadius: 10,
    }),
    smg: Object.freeze({key:"smg",shortLabel:"Viper SMG",magazine:42,reserve:252,damage:24,range:155,fireInterval:66,reloadMs:1300,automatic:true,visual:"rifle"}),
    carbine: Object.freeze({key:"carbine",shortLabel:"Tactical Carbine",magazine:36,reserve:180,damage:41,range:235,fireInterval:112,reloadMs:1550,automatic:true,scope:true,visual:"rifle"}),
    lmg: Object.freeze({key:"lmg",shortLabel:"Belt-Fed LMG",magazine:90,reserve:360,damage:30,range:205,fireInterval:88,reloadMs:3900,automatic:true,visual:"rifle"}),
    burst: Object.freeze({key:"burst",shortLabel:"Burst Rifle",magazine:33,reserve:165,damage:53,range:235,fireInterval:205,reloadMs:1600,automatic:false,scope:true,visual:"rifle"}),
    revolver: Object.freeze({key:"revolver",shortLabel:"Magnum Revolver",magazine:6,reserve:66,damage:126,range:165,fireInterval:490,reloadMs:1750,automatic:false,visual:"handgun"}),
    dmr: Object.freeze({key:"dmr",shortLabel:"Precision DMR",magazine:12,reserve:72,damage:89,range:320,fireInterval:365,reloadMs:1900,automatic:false,scope:true,visual:"sniper"}),
    autoShotgun: Object.freeze({key:"autoShotgun",shortLabel:"Auto Shotgun",magazine:16,reserve:96,damage:13,range:80,fireInterval:265,reloadMs:2250,automatic:true,pellets:9,spread:.11,visual:"shotgun"}),
    heavyPistol: Object.freeze({key:"heavyPistol",shortLabel:"Heavy Pistol",magazine:12,reserve:84,damage:79,range:170,fireInterval:235,reloadMs:1400,automatic:false,visual:"handgun"}),
    novaRifle: Object.freeze({key:"novaRifle",shortLabel:"NOVA Disruptor",magazine:65,reserve:390,damage:175,range:280,fireInterval:72,reloadMs:1580,automatic:true,visual:"rifle",scope:true}),
    thunderCannon: Object.freeze({key:"thunderCannon",shortLabel:"Thunder Cannon",magazine:7,reserve:63,damage:270,range:110,fireInterval:590,reloadMs:2200,automatic:false,pellets:12,spread:.045,visual:"shotgun"}),
    reaperLMG: Object.freeze({key:"reaperLMG",shortLabel:"Reaper Minigun",magazine:180,reserve:720,damage:115,range:255,fireInterval:56,reloadMs:3700,automatic:true,visual:"rifle"}),
    chainsaw: Object.freeze({
      key: "chainsaw", shortLabel: "Chainsaw", magazine: 1, reserve: 0, damage: 92,
      range: 5.8, fireInterval: 390, reloadMs: 0, automatic: true, melee: true, noAmmo: true,
    }),
  });

  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const stableUnit = (value) => {
    const text = String(value || "");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return ((hash >>> 0) % 10000) / 10000;
  };

  function enemyId(machine, index = 0) {
    return String(machine?.instanceId || machine?.id || machine?.name || ("enemy-" + index));
  }

  function normalizeDirection(direction) {
    const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
    return { x: direction.x / length, y: direction.y / length, z: direction.z / length };
  }

  function raySphere(origin, direction, center, radius) {
    const ox = origin.x - center.x;
    const oy = origin.y - center.y;
    const oz = origin.z - center.z;
    const projection = ox * direction.x + oy * direction.y + oz * direction.z;
    const c = ox * ox + oy * oy + oz * oz - radius * radius;
    const discriminant = projection * projection - c;
    if (discriminant < 0) return Infinity;
    const root = Math.sqrt(discriminant);
    const first = -projection - root;
    const second = -projection + root;
    if (first >= 0) return first;
    if (second >= 0) return second;
    return Infinity;
  }

  function rayAabb(origin, direction, box, maximumDistance = Infinity) {
    let near = 0;
    let far = maximumDistance;
    const axes = [
      ["x", number(box.x), number(box.x) + Math.max(.01, number(box.w, .01))],
      ["y", number(box.y), number(box.y) + Math.max(.01, number(box.h, .01))],
      ["z", number(box.z), number(box.z) + Math.max(.01, number(box.d, .01))],
    ];
    for (const [axis, minimum, maximum] of axes) {
      const component = direction[axis];
      const position = origin[axis];
      if (Math.abs(component) < 1e-7) {
        if (position < minimum || position > maximum) return Infinity;
        continue;
      }
      let first = (minimum - position) / component;
      let second = (maximum - position) / component;
      if (first > second) [first, second] = [second, first];
      near = Math.max(near, first);
      far = Math.min(far, second);
      if (near > far) return Infinity;
    }
    return far >= 0 ? Math.max(0, near) : Infinity;
  }

  function circleHitsAabb(x, z, radius, box) {
    const minimumX = number(box.x);
    const maximumX = minimumX + Math.max(.01, number(box.w, .01));
    const minimumZ = number(box.z);
    const maximumZ = minimumZ + Math.max(.01, number(box.d, .01));
    const closestX = clamp(x, minimumX, maximumX);
    const closestZ = clamp(z, minimumZ, maximumZ);
    const dx = x - closestX;
    const dz = z - closestZ;
    return dx * dx + dz * dz < radius * radius;
  }

  function directionFromCamera(player) {
    const pitch = number(player?.pitch);
    const horizontal = Math.cos(pitch);
    return normalizeDirection({
      x: Math.sin(number(player?.yaw)) * horizontal,
      y: Math.sin(pitch),
      z: Math.cos(number(player?.yaw)) * horizontal,
    });
  }

  window.createPlantCombatMode = function createPlantCombatMode(options = {}) {
    const frame = options.frame;
    const canvas = options.canvas;
    if (!frame || !canvas || options.isOwner?.() !== true) return null;

    const hud = document.createElement("section");
    hud.className = "combat-hud";
    hud.hidden = true;
    hud.setAttribute("aria-label", "Owner combat mode HUD");
    hud.innerHTML = [
      '<div class="combat-topbar">',
        '<div class="combat-mode-badge" data-combat-mode-badge><span></span> OWNER COMBAT MODE</div>',
        '<div class="combat-high-score" data-combat-high-score>BEST --:--</div>',
        '<div class="combat-enemy-counter" data-combat-enemies>Enemies 0 / 0</div>',
      '</div>',
      '<div class="combat-wave-panel" data-combat-wave-panel hidden><div class="combat-wave-heading"><strong data-combat-wave-heading>WAVE 1</strong><span data-combat-wave-count>0 / 0</span></div><div class="combat-wave-progress"><i data-combat-wave-bar></i></div><small data-combat-wave-note>Survive every wave</small></div>',
      '<div class="combat-team-panel" data-combat-team-panel hidden></div>',
      '<div class="combat-points-panel" data-combat-points-panel hidden><span>AVAILABLE POINTS</span><strong data-combat-points-value>0</strong><small>USE AT STATIONS</small></div>',
      '<div class="combat-health-panel">',
        '<div class="combat-health-heading"><span>HEALTH</span><strong data-combat-health-value>100</strong></div>',
        '<div class="combat-health-track"><span data-combat-health-bar></span></div>',
        '<div class="combat-shield-heading"><span>SHIELD</span><strong data-combat-shield-value>30</strong></div>',
        '<div class="combat-shield-track"><span data-combat-shield-bar></span></div>',
        '<div class="combat-vitals-alert" data-combat-shield-warning hidden>⚠ SHIELD DOWN · NO PROTECTION</div>',
        '<div class="combat-vitals-status" data-combat-vitals-status>SHIELD ONLINE</div>',
        '<small data-combat-threat>No threats in sight</small>',
      '</div>',
      '<div class="combat-hitmarker" data-combat-hitmarker aria-hidden="true"><i></i><i></i><i></i><i></i></div>',
      '<div class="combat-damage-vignette" data-combat-damage aria-hidden="true"></div>',
      '<div class="combat-death-blood" aria-hidden="true"></div>',
      '<div class="combat-countdown" data-combat-countdown hidden>',
        '<span>COMBAT STARTS IN</span>',
        '<strong data-combat-countdown-value>2</strong>',
      '</div>',
      '<div class="combat-damage-directions" data-combat-damage-directions aria-hidden="true"></div>',
      '<div class="combat-direction-callout" data-combat-direction-callout hidden><strong></strong><span></span></div>',
      '<div class="combat-scope-overlay combat-holo-overlay" data-combat-scope hidden aria-hidden="true">',
        '<div class="combat-holo-sight"><span class="combat-holo-glass"></span><i class="horizontal"></i><i class="vertical"></i><b></b></div>',
      '</div>',
      '<div class="combat-zombie-setup" data-match-setup hidden>',
        '<div class="combat-zombie-setup-card combat-match-setup-card">',
          '<p data-match-setup-kicker>MATCH SETUP</p>',
          '<h2 data-match-setup-title>Choose your match</h2>',
          '<span data-match-setup-copy>Select difficulty, your plant character, and how you want to play.</span>',
          '<div class="combat-zombie-setup-section">',
            '<strong>DIFFICULTY</strong>',
            '<div class="combat-zombie-choice-grid" data-match-difficulty-options>',
              '<button type="button" data-match-difficulty="easy"><b>Easy</b><small>More forgiving AI</small></button>',
              '<button type="button" data-match-difficulty="normal" class="active"><b>Normal</b><small>Balanced challenge</small></button>',
              '<button type="button" data-match-difficulty="hard"><b>Hard</b><small>Faster, tougher enemies</small></button>',
              '<button type="button" data-match-difficulty="nightmare"><b>Nightmare</b><small>Maximum pressure</small></button>',
            '</div>',
          '</div>',
          '<div class="combat-zombie-setup-section" data-zombie-run-section>',
            '<strong>ZOMBIE RUN</strong>',
            '<div class="combat-zombie-choice-grid run-type" data-zombie-run-options>',
              '<button type="button" data-zombie-run="normal"><b>Normal · Clear Plant</b><small>Kill every zombie · respawns enabled</small></button>',
              '<button type="button" data-zombie-run="endless" class="active"><b>Endless Survival</b><small>Edge spawns continue until you die.</small></button>',
            '</div>',
          '</div>',
          '<div class="combat-zombie-setup-section">',
            '<strong>STARTING WEAPON</strong>',
            '<div class="combat-zombie-choice-grid weapon-type" data-match-weapon-options>',
              '<button type="button" data-match-weapon="rifle" class="active"><b>Rifle</b><small>Fast automatic all-rounder</small></button>',
              '<button type="button" data-match-weapon="sniper"><b>Sniper</b><small>Long range · heavy headshots</small></button>',
              '<button type="button" data-match-weapon="shotgun"><b>Shotgun</b><small>Wide close-range buckshot</small></button>',
              '<button type="button" data-match-weapon="rocket"><b>Rocket Launcher</b><small>Slow explosive heavy weapon</small></button>',
              '<button type="button" data-match-weapon="chainsaw"><b>Chainsaw</b><small>Fast melee · no ammunition</small></button>',
            '</div>',
          '</div>',
          '<div class="combat-zombie-setup-section">',
            '<strong>CHARACTER</strong>',
            '<div class="combat-character-grid" data-character-options></div>',
          '</div>',
          '<div class="combat-zombie-setup-section">',
            '<strong>MATCH TYPE</strong>',
            '<div class="combat-zombie-choice-grid match-type" data-match-type-options>',
              '<button type="button" data-match-type="solo" class="active"><b>Solo</b><small>Play by yourself</small></button>',
              '<button type="button" data-match-type="coop"><b>Co-op</b><small>Join teammates in the plant</small></button>',
              '<button type="button" data-match-type="private"><b>Private Match</b><small>Player vs player</small></button>',
            '</div>',
          '</div>',
          '<div class="combat-lobby-panel" data-lobby-section hidden>',
            '<div class="combat-lobby-fields">',
              '<label><span>PLAYER NAME</span><input type="text" data-lobby-name maxlength="32" placeholder="Player"></label>',
              '<label><span>LOBBY CODE</span><input type="text" data-lobby-code maxlength="8" placeholder="ABCDE"></label>',
              '<label><span>OWNER PASSWORD</span><input type="password" data-lobby-password autocomplete="current-password" placeholder="Required to create/join"></label>',
            '</div>',
            '<div class="combat-lobby-actions">',
              '<button type="button" data-lobby-create>Create lobby</button>',
              '<button type="button" data-lobby-join>Join lobby</button>',
              '<button type="button" data-lobby-ready hidden>Ready</button>',
              '<button type="button" data-lobby-start hidden class="primary">Start match</button>',
            '</div>',
            '<div class="combat-lobby-status" data-lobby-status>Not connected</div>',
            '<div class="combat-lobby-players" data-lobby-players></div>',
          '</div>',
          '<div class="combat-zombie-setup-actions">',
            '<button type="button" data-match-start class="primary">Start Match</button>',
            '<button type="button" data-match-cancel>Cancel</button>',
          '</div>',
        '</div>',
      '</div>',
      '<div class="combat-pause-overlay" data-combat-pause hidden>',
        '<div class="combat-pause-card">',
          '<header class="combat-pause-header">',
            '<div class="combat-pause-emblem" aria-hidden="true"><span>Ⅱ</span></div>',
            '<div class="combat-pause-heading"><p data-combat-pause-mode>TACTICAL INTERMISSION</p><h2>Game paused<span class="combat-pause-dot">.</span></h2>',
              '<span data-combat-pause-subtitle>Take stock of your situation before rejoining the fight.</span></div>',
            '<span class="combat-pause-esc">ESC</span>',
          '</header>',
          '<div class="combat-pause-divider"></div>',
          '<div class="combat-pause-stats">',
            '<div><small>HEALTH</small><strong data-combat-pause-health>100</strong><em>HP REMAINING</em></div>',
            '<div><small>HOSTILES</small><strong data-combat-pause-hostiles>0</strong><em>ACTIVE THREATS</em></div>',
            '<div><small>ELAPSED</small><strong data-combat-pause-elapsed>00:00</strong><em>MATCH TIME</em></div>',
          '</div>',
          '<div class="combat-pause-controls"><h3>FIELD CONTROLS</h3>',
            '<div><span><kbd>W A S D</kbd> Move</span><span><kbd>SHIFT</kbd> Sprint</span>',
              '<span><kbd>F</kbd> Melee</span><span><kbd>HOLD E</kbd> Revive</span>',
              '<span><kbd>R</kbd> Reload</span><span><kbd>SPACE</kbd> Climb</span></div>',
          '</div>',
          '<div class="combat-pause-actions">',
            '<button type="button" data-combat-pause-action="resume" class="primary"><span>▶</span> RESUME GAME <small>RETURN TO ACTION</small></button>',
            '<button type="button" data-combat-pause-action="exit"><span>↩</span> LEAVE MATCH <small>EXIT TO PLANT</small></button>',
          '</div>',
          '<button type="button" class="combat-pause-audio" data-combat-pause-action="audio" aria-pressed="false">♫ AUDIO & MUSIC: ON</button>',
          '<footer class="combat-pause-footer"><i></i> THE PLANT IS STILL WAITING FOR YOU <i></i></footer>',
        '</div>',
      '</div>',
      '<div class="combat-station-prompt" data-combat-station-prompt hidden><span data-combat-station-label></span><button type="button" data-combat-station-buy>BUY [E]</button></div>',
      '<div class="combat-weapon-panel">',
        '<div class="combat-weapon-copy">',
          '<span data-combat-slot>PRIMARY</span>',
          '<strong data-combat-weapon>RIFLE</strong>',
          '<small data-combat-status>Ready</small>',
        '</div>',
        '<div class="combat-ammo"><strong data-combat-mag>30</strong><span>/</span><b data-combat-reserve>120</b></div>',
        '<div class="combat-weapon-inventory" data-combat-inventory></div>',
        '<div class="combat-controls">Fire · Right click aim · <b>1/2/3</b> weapons · <b>R</b> reload · <b>F</b> melee · <b>E</b> buy/revive</div>',
      '</div>',
      '<div class="combat-round-overlay" data-combat-round hidden>',
        '<div class="combat-round-card">',
          '<div class="combat-victory-confetti" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>',
          '<div class="combat-victory-seal" aria-hidden="true"><span>✓</span><small>SECURE</small></div>',
          '<p data-combat-round-kicker>ROUND COMPLETE</p>',
          '<h2 data-combat-round-title>Plant secured</h2>',
          '<span data-combat-round-copy>All enemy AI has been defeated.</span>',
          '<div class="combat-victory-stats" data-combat-victory-stats>',
            '<div><span data-combat-time-label>CLEAR TIME</span><strong data-combat-victory-time>00:00</strong></div>',
            '<div><span>BEST TIME</span><strong data-combat-best-time>--:--</strong></div>',
            '<div><span>REGULAR KILLS</span><strong data-combat-regular-kills>0</strong></div>',
            '<div><span>HEADSHOT KILLS</span><strong data-combat-headshot-kills>0</strong></div>',
            '<div><span>HEALTH</span><strong data-combat-victory-health>100</strong></div>',
            '<div><span>SHIELD</span><strong data-combat-victory-shield>22</strong></div>',
            '<div><span>DEATHS</span><strong data-combat-deaths>0</strong></div>',
          '</div>',
          '<div class="combat-scoreboard" data-combat-scoreboard hidden></div>',
          '<div class="combat-killer-reveal" data-combat-killer hidden>',
            '<span>ELIMINATED BY</span>',
            '<strong data-combat-killer-name>Enemy</strong>',
            '<small data-combat-killer-detail></small>',
          '</div>',
          '<div class="combat-round-actions" data-combat-round-actions>',
            '<button type="button" data-combat-restart class="combat-restart-button"><span class="combat-restart-icon" aria-hidden="true">↻</span><span class="combat-restart-copy"><strong>Play again</strong><small>Restart combat</small></span></button>',
            '<button type="button" data-combat-exit class="combat-exit-button"><span class="combat-exit-icon" aria-hidden="true">↗</span><span class="combat-exit-copy"><strong>Exit mode</strong><small>Return to plant overview</small></span></button>',
          '</div>',
        '</div>',
      '</div>',
    ].join("");
    frame.appendChild(hud);

    // Web Audio-generated effects ship with the application: no remote sample
    // fetches, licensing dependencies, autoplay, or unbounded looping voices.
    let audioContext=null,noiseBuffer=null;
    let soundEnabled=true;
    try{soundEnabled=window.localStorage?.getItem("monroe-combat-sound")!=="off";}catch{}
    const SOUND_PRESETS=Object.freeze({
      rifle:{freq:145,tail:.17,type:"sawtooth",noise:.55,gain:.25,slide:.24},
      handgun:{freq:200,tail:.13,type:"square",noise:.4,gain:.19,slide:.40},
      shotgun:{freq:100,tail:.29,type:"sawtooth",noise:.8,gain:.35,slide:.12},
      sniper:{freq:110,tail:.31,type:"sawtooth",noise:.75,gain:.32,slide:.13},
      rocket:{freq:76,tail:.48,type:"sawtooth",noise:.52,gain:.33,slide:.36},
      explosion:{freq:48,tail:.95,type:"sawtooth",noise:.95,gain:.44,slide:.10},
      "enemy-shot":{freq:180,tail:.15,type:"sawtooth",noise:.37,gain:.17,slide:.48},
      "enemy-down":{freq:88,tail:.32,type:"triangle",noise:.19,gain:.14,slide:.38},
      chainsaw:{freq:98,tail:.35,type:"sawtooth",noise:.46,gain:.23,slide:1.8},
      melee:{freq:250,tail:.17,type:"triangle",noise:.4,gain:.23,slide:.36},
      reload:{freq:900,tail:.09,type:"square",noise:.18,gain:.12,slide:.57},
      "reload-end":{freq:1100,tail:.09,type:"sine",noise:.11,gain:.10,slide:1.23},
      "health-hit":{freq:120,tail:.33,type:"sawtooth",noise:.36,gain:.28,slide:.46},
      "shield-hit":{freq:480,tail:.25,type:"sine",noise:.28,gain:.17,slide:.48},
      "shield-break":{freq:740,tail:.49,type:"sawtooth",noise:.61,gain:.32,slide:.18},
      revive:{freq:500,tail:.75,type:"sine",noise:.08,gain:.19,slide:1.8},
      "revive-start":{freq:350,tail:.25,type:"sine",noise:.03,gain:.12,slide:1.36},
      "zombie-turn":{freq:95,tail:.92,type:"sawtooth",noise:.39,gain:.25,slide:.34},
      footstep:{freq:88,tail:.12,type:"triangle",noise:.29,gain:.13,slide:.68},
      "zombie-growl":{freq:67,tail:.9,type:"sawtooth",noise:.34,gain:.26,slide:.54},
      wind:{freq:58,tail:1.55,type:"sine",noise:.9,gain:.08,slide:.89},
      "wave-clear":{freq:560,tail:1.05,type:"triangle",noise:.04,gain:.26,slide:1.48},
      "wave-start":{freq:130,tail:.82,type:"sawtooth",noise:.46,gain:.28,slide:2.65},
      "wave-tick":{freq:720,tail:.11,type:"sine",noise:0,gain:.16,slide:1.15},
      "shield-ready":{freq:660,tail:.41,type:"sine",noise:.02,gain:.10,slide:1.5},
      pickup:{freq:620,tail:.18,type:"sine",noise:.08,gain:.15,slide:1.52},
      pause:{freq:250,tail:.13,type:"triangle",noise:.06,gain:.12,slide:.75},
    });
    let soundEventsInWindow=0,soundWindowStartsAt=0;
    let nextFootstepAt=0,nextAmbientAt=0,nextMusicAt=0,musicBeat=0,shieldWasEmpty=false,lastWaveTick=0;
    function zombieProximityLevel(distance) {
      return Math.pow(clamp((95-distance)/90,0,1),1.6);
    }
    function waveCountdownSeconds(now,endAt) {
      return Math.max(0,Math.ceil((endAt-now)/1000));
    }
    function combatMusicIntensity(nearby,health,nearestDistance,intermission) {
      const level=clamp(.12+Math.min(8,nearby)*.048+
        (1-clamp(health/100,0,1))*.3+
        Math.pow(clamp((95-nearestDistance)/90,0,1),1.6)*.38,0,1);
      return intermission?level*.20:level;
    }
    function unlockCombatAudio(){
      if(!soundEnabled)return null;
      const Context=window.AudioContext||window.webkitAudioContext;
      if(!Context)return null;
      try{
        if(!audioContext)audioContext=new Context({latencyHint:"interactive"});
        if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
        return audioContext;
      }catch{return null;}
    }
    function playCombatSound(cue,volume=1,pan=0){
      const ctx=audioContext;
      if(!soundEnabled||!ctx||ctx.state!=="running")return;
      const preset=SOUND_PRESETS[cue]||SOUND_PRESETS.pickup;
      const now=ctx.currentTime;
      if(now-soundWindowStartsAt>1){soundWindowStartsAt=now;soundEventsInWindow=0;}
      if(++soundEventsInWindow>26)return; // Many zombies can die at once.
      const tail=preset.tail,level=Math.min(.55,Math.max(.01,preset.gain*Math.max(0,volume)));
      try{
        const osc=ctx.createOscillator(),tone=ctx.createGain();
        osc.type=preset.type;
        osc.frequency.setValueAtTime(preset.freq*(.93+Math.random()*.14),now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(24,preset.freq*preset.slide),now+tail);
        tone.gain.setValueAtTime(.001,now);
        tone.gain.linearRampToValueAtTime(level,now+.007);
        tone.gain.exponentialRampToValueAtTime(.001,now+tail);
        const spatial=typeof ctx.createStereoPanner==="function" ? ctx.createStereoPanner() : null;
        if(spatial){
          spatial.pan.setValueAtTime(clamp(pan,-.85,.85),now);
          spatial.connect(ctx.destination);
        }
        osc.connect(tone);tone.connect(spatial||ctx.destination);
        osc.start(now);osc.stop(now+tail+.015);
        if(preset.noise>.01){
          if(!noiseBuffer){
            noiseBuffer=ctx.createBuffer(1,Math.round(ctx.sampleRate*2),ctx.sampleRate);
            const samples=noiseBuffer.getChannelData(0);
            for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.78;
          }
          const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
          noise.buffer=noiseBuffer;
          filter.type=(cue==="wind"||cue==="explosion")?"lowpass":"highpass";
          filter.frequency.value=cue==="wind"?470:cue==="explosion"?850:1300;
          gain.gain.setValueAtTime(.0001,now);
          gain.gain.linearRampToValueAtTime(level*preset.noise*.55,now+.005);
          gain.gain.exponentialRampToValueAtTime(.0001,now+tail);
          noise.connect(filter);filter.connect(gain);gain.connect(spatial||ctx.destination);
          noise.start(now,Math.random()*.3,tail);
        }
      }catch{/* Audio is cosmetic; never interrupt combat if a device lacks it. */}
    }
    // Short procedural score phrases stay quiet under footsteps and weapon
    // sounds, and get faster/denser only when threat distance or health warrants.
    function playMusicTone(frequency,start,duration,gain=.02,type="sine"){
      const ctx=audioContext;
      if(!ctx || ctx.state!=="running" || !soundEnabled)return;
      try{
        const osc=ctx.createOscillator(),amp=ctx.createGain();
        osc.type=type;
        osc.frequency.setValueAtTime(Math.max(35,frequency),start);
        amp.gain.setValueAtTime(.0001,start);
        amp.gain.linearRampToValueAtTime(Math.max(.001,gain),start+.055);
        amp.gain.exponentialRampToValueAtTime(.0001,start+duration);
        osc.connect(amp);amp.connect(ctx.destination);
        osc.start(start);osc.stop(start+duration+.02);
      }catch{/* Best-effort music on low-power browsers. */}
    }
    function playMusicStinger(kind){
      if(!soundEnabled)return;
      const ctx=unlockCombatAudio();
      if(!ctx || ctx.state!=="running")return;
      nextMusicAt=performance.now()+5100;
      const win=kind==="victory";
      const scale=win?[0,4,7,12,16,19]:[0,-2,-5,-7,-12,-14];
      const base=win?220:146.83;
      const start=ctx.currentTime+.035;
      scale.forEach((step,i)=>{
        const frequency=base*Math.pow(2,step/12);
        playMusicTone(frequency,start+i*(win?.22:.29),win?.68:1.12,win?.055:.044,win?"triangle":"sawtooth");
        if(i%2===0)playMusicTone(frequency*.5,start+i*(win?.22:.29),.82,.019,"sine");
      });
    }
    function playCombatMusic(now){
      if(!soundEnabled || !audioContext || audioContext.state!=="running"
        || paused || roundState!=="playing" || now<nextMusicAt)return;
      const player=options.getPlayer?.();
      const targets=aliveEnemies();
      const nearestDistance=player?targets.reduce((dist,e)=>{
        const center=enemyCenter(e);
        return Math.min(dist,Math.hypot(center.x-number(player.x),center.z-number(player.z)));
      },120):120;
      const closeCount=player?targets.filter(e=>{
        const center=enemyCenter(e);
        return Math.hypot(center.x-number(player.x),center.z-number(player.z))<29;
      }).length:0;
      const intensity=combatMusicIntensity(closeCount,playerHealth,nearestDistance,Boolean(waveNextAt));
      const stepMs=1200-intensity*520;
      const notes=[0,3,7,10,7,3,-2,3];
      const note=notes[musicBeat%notes.length]+((Math.floor(musicBeat/8)%2)?-5:0);
      const frequency=110*Math.pow(2,note/12);
      const t=audioContext.currentTime+.015;
      playMusicTone(frequency,t,stepMs/1000*.92,.009+intensity*.027,"triangle");
      if(musicBeat%4===0)playMusicTone(frequency*.5,t,Math.max(.8,stepMs/1000*1.8),.009+intensity*.013,"sine");
      if(intensity>.55 && musicBeat%2===0)
        playMusicTone(frequency*2,t+.17,.28,.005+intensity*.009,"sawtooth");
      musicBeat++;
      nextMusicAt=now+stepMs;
    }
    function updateCombatSoundscape(now){
      if(roundState!=="playing"||paused)return;
      const player=options.getPlayer?.();
      if(player?.moving && now>=nextFootstepAt){
        playCombatSound("footstep",player.sprinting?.85:.43);
        nextFootstepAt=now+(player.sprinting?270:420);
      }
      if(now>=nextAmbientAt){
        let nearestZombie=null,nearestDistance=120;
        if(gameMode==="zombie" && player){
          for(const enemy of aliveEnemies()){
            const center=enemyCenter(enemy);
            const distance=Math.hypot(center.x-number(player.x),center.z-number(player.z));
            if(distance<nearestDistance){nearestDistance=distance;nearestZombie=center;}
          }
        }
        if(nearestZombie){
          const proximity=zombieProximityLevel(nearestDistance);
          const angle=Math.atan2(nearestZombie.x-number(player.x),nearestZombie.z-number(player.z));
          const pan=Math.sin(angle-number(player.yaw));
          playCombatSound("zombie-growl",.07+proximity*.90,pan);
          nextAmbientAt=now+(3450-proximity*2400)+Math.random()*320;
        }else{
          playCombatSound("wind",.16);
          nextAmbientAt=now+3600+Math.random()*1400;
        }
      }
      const seconds=waveNextAt?waveCountdownSeconds(now,waveNextAt):0;
      if(seconds>0 && seconds<=5 && seconds!==lastWaveTick){
        lastWaveTick=seconds;
        playCombatSound("wave-tick",.34);
      }else if(!seconds){lastWaveTick=0;}
      playCombatMusic(now);
    }
    function setCombatSoundEnabled(enabled){
      soundEnabled=Boolean(enabled);
      try{window.localStorage?.setItem("monroe-combat-sound",soundEnabled?"on":"off");}catch{}
      if(soundEnabled)unlockCombatAudio();
      else if(audioContext && audioContext.state==="running")audioContext.suspend().catch(()=>{});
      const control=hud.querySelector('[data-combat-pause-action="audio"]');
      if(control){
        control.textContent=soundEnabled?"♫ AUDIO & MUSIC: ON":"♪ AUDIO & MUSIC: MUTED";
        control.setAttribute("aria-pressed",String(!soundEnabled));
      }
      if(soundEnabled)playCombatSound("pickup",.6);
    }

    const pointsPanel = hud.querySelector("[data-combat-points-panel]");
    const pointsValue = hud.querySelector("[data-combat-points-value]");
    const healthValue = hud.querySelector("[data-combat-health-value]");
    const healthBar = hud.querySelector("[data-combat-health-bar]");
    const shieldValue = hud.querySelector("[data-combat-shield-value]");
    const shieldBar = hud.querySelector("[data-combat-shield-bar]");
    const shieldTrack = hud.querySelector(".combat-shield-track");
    const shieldWarning=hud.querySelector("[data-combat-shield-warning]");
    const vitalsStatus=hud.querySelector("[data-combat-vitals-status]");
    const enemyCounter = hud.querySelector("[data-combat-enemies]");
    const modeBadge = hud.querySelector("[data-combat-mode-badge]");
    const highScoreCopy = hud.querySelector("[data-combat-high-score]");
    const threatCopy = hud.querySelector("[data-combat-threat]");
    const weaponCopy = hud.querySelector("[data-combat-weapon]");
    const slotCopy = hud.querySelector("[data-combat-slot]");
    const statusCopy = hud.querySelector("[data-combat-status]");
    const magazineCopy = hud.querySelector("[data-combat-mag]");
    const reserveCopy = hud.querySelector("[data-combat-reserve]");
    const damageDirections = hud.querySelector("[data-combat-damage-directions]");
    const directionCallout = hud.querySelector("[data-combat-direction-callout]");
    const scopeOverlay = hud.querySelector("[data-combat-scope]");
    const hitmarker = hud.querySelector("[data-combat-hitmarker]");
    const damageVignette = hud.querySelector("[data-combat-damage]");
    const countdownOverlay = hud.querySelector("[data-combat-countdown]");
    const countdownValue = hud.querySelector("[data-combat-countdown-value]");
    const countdownLabel = countdownOverlay?.querySelector("span");
    const roundOverlay = hud.querySelector("[data-combat-round]");
    const roundKicker = hud.querySelector("[data-combat-round-kicker]");
    const roundTitle = hud.querySelector("[data-combat-round-title]");
    const roundCopy = hud.querySelector("[data-combat-round-copy]");
    const killerReveal = hud.querySelector("[data-combat-killer]");
    const killerName = hud.querySelector("[data-combat-killer-name]");
    const killerDetail = hud.querySelector("[data-combat-killer-detail]");
    const roundActions = hud.querySelector("[data-combat-round-actions]");
    const restartButton = hud.querySelector("[data-combat-restart]");
    const pauseOverlay = hud.querySelector("[data-combat-pause]");
    const matchSetup = hud.querySelector("[data-match-setup]");
    const setupKicker = hud.querySelector("[data-match-setup-kicker]");
    const setupTitle = hud.querySelector("[data-match-setup-title]");
    const setupCopy = hud.querySelector("[data-match-setup-copy]");
    const difficultyOptions = [...hud.querySelectorAll("[data-match-difficulty]")];
    const zombieRunSection = hud.querySelector("[data-zombie-run-section]");
    const zombieRunOptions = [...hud.querySelectorAll("[data-zombie-run]")];
    const weaponOptions = [...hud.querySelectorAll("[data-match-weapon]")];
    const characterOptions = hud.querySelector("[data-character-options]");
    const matchTypeOptions = [...hud.querySelectorAll("[data-match-type]")];
    const matchStartButton = hud.querySelector("[data-match-start]");
    const lobbySection = hud.querySelector("[data-lobby-section]");
    const lobbyNameInput = hud.querySelector("[data-lobby-name]");
    const lobbyCodeInput = hud.querySelector("[data-lobby-code]");
    const lobbyPasswordInput = hud.querySelector("[data-lobby-password]");
    const lobbyCreateButton = hud.querySelector("[data-lobby-create]");
    const lobbyJoinButton = hud.querySelector("[data-lobby-join]");
    const lobbyReadyButton = hud.querySelector("[data-lobby-ready]");
    const lobbyStartButton = hud.querySelector("[data-lobby-start]");
    const lobbyStatus = hud.querySelector("[data-lobby-status]");
    const lobbyPlayers = hud.querySelector("[data-lobby-players]");
    const victoryTime = hud.querySelector("[data-combat-victory-time]");
    const bestTime = hud.querySelector("[data-combat-best-time]");
    const timeLabel = hud.querySelector("[data-combat-time-label]");
    const regularKillsCopy = hud.querySelector("[data-combat-regular-kills]");
    const headshotKillsCopy = hud.querySelector("[data-combat-headshot-kills]");
    const victoryHealth = hud.querySelector("[data-combat-victory-health]");
    const victoryShield = hud.querySelector("[data-combat-victory-shield]");
    const deathCountCopy = hud.querySelector("[data-combat-deaths]");
    const scoreboard = hud.querySelector("[data-combat-scoreboard]");
    const wavePanel = hud.querySelector("[data-combat-wave-panel]");
    const waveHeading = hud.querySelector("[data-combat-wave-heading]");
    const waveCount = hud.querySelector("[data-combat-wave-count]");
    const waveBar = hud.querySelector("[data-combat-wave-bar]");
    const waveNote = hud.querySelector("[data-combat-wave-note]");
    const teamPanel = hud.querySelector("[data-combat-team-panel]");
    const inventoryPanel = hud.querySelector("[data-combat-inventory]");
    const stationPrompt = hud.querySelector("[data-combat-station-prompt]");
    const stationLabel = hud.querySelector("[data-combat-station-label]");
    const stationBuyButton = hud.querySelector("[data-combat-station-buy]");

    const enemies = new Map();
    const ammunition = Object.fromEntries(Object.entries(WEAPONS).map(([key, weapon]) => [key, { magazine: weapon.magazine, reserve: weapon.reserve }]));
    const worldEffects = { tracers: [], impacts: [], bloodBursts: [], bloodPools: [], bloodFountains: [], rockets: [], explosions: [], pickups: [], glassShards: [] };
    const shatteredGlass = new Set();
    const destroyedExplosives = new Set();

    let active = false;
    let aiming = false;
    let playerHealth = 100;
    let playerShield = SHIELD_MAX;
    let lastDamageAt = 0;
    let lastShieldUpdateAt = 0;
    let paused = false;
    let pausedAt = 0;
    let gameMode = "combat";
    let selectedPrimaryWeapon = "rifle";
    let selectedWeapon = "rifle";
    let regularKills = 0;
    let headshotKills = 0;
    let playerDeaths = 0;
    let playerPoints = 0;
    let carriedWeapons = [];
    let zombieWave = 0;
    let waveTotal = 0;
    let waveSpawned = 0;
    let waveDefeated = 0;
    let waveNextAt = 0;
    let waveSpecial = false;
    let mysteryBox = null;
    // Pending prizes are per-player, never granted until the second E press.
    let mysteryOffer = null;
    let healthStation = null;
    let lastHealthPurchaseWave = -1;
    let nearestStation = null;
    let lastStationHudAt = -Infinity;
    let reloading = false;
    let reloadSerial = 0;
    let nextPlayerShotAt = 0;
    let playerRecoilUntil = 0;
    let playerMuzzleUntil = 0;
    let reloadStartedAt = 0;
    let reloadEndsAt = 0;
    let mouseHeld = false;
    let frameRequest = 0;
    let lastFrameAt = 0;
    let lastThreatCount = 0;
    let roundState = "playing";
    let countdownEndsAt = 0;
    let countdownDisplay = 0;
    let transientStatusUntil = 0;
    let playerDeathStartedAt = 0;
    let playerDeathDuration = 5000;
    let respawnEndsAt = 0;
    let respawnDisplay = 0;
    const COOP_REVIVE_WINDOW_MS=22000;
    const COOP_REVIVE_RADIUS=9;
    const COOP_REVIVE_HOLD_MS=3500;
    let reviveHold=null;
    let lastReviveAnimationAt=0;
    let playerZombie=false;
    let reviveUntil=0;
    let nextMeleeAt=0;
    let meleeSwingUntil=0;
    let lastRevivePromptAt=0;
    const revivePrompt=document.createElement("div");
    revivePrompt.className="combat-revive-prompt";
    revivePrompt.hidden=true;
    hud.appendChild(revivePrompt);
    let directionCalloutTimer = 0;
    let roundRevealSerial = 0;
    let roundStartedAt = 0;
    let victoryTimer = 0;
    let zombieSpawnSerial = 0;
    let zombieSpawnCount = 0;
    let nextZombieSpawnAt = 0;
    let zombieDifficulty = "normal";
    let combatDifficulty = "normal";
    let zombieRunType = "endless";
    let selectedCharacterId = "";
    let matchType = "solo";
    let multiplayer = null;
    let multiplayerStartedRevision = 0;
    let lastLocalSyncSample = null;
    let lastHostEnemySyncAt = -Infinity;
    let cachedEnemySyncState = [];
    let hostWorldSeq = 0;
    let lastAppliedHostWorldSeq = -1;
    const hostEnemySyncSamples = new Map();
    const roundStatOverrides = new Map();
    const navCache = {at:-Infinity,buckets:new Map(),bounds:null,obstacles:[]};
    let navFramePlans = 0;
    // Prevent network reconciliation from awarding the same zombie twice.
    const creditedKillIds = new Set();

    function readZombieSettings() {
      try {
        const parsed = JSON.parse(window.localStorage?.getItem(ZOMBIE_SETTINGS_STORAGE_KEY) || "{}");
        if (ZOMBIE_DIFFICULTIES[parsed?.difficulty]) zombieDifficulty = parsed.difficulty;
        if (ZOMBIE_RUN_TYPES[parsed?.runType]) zombieRunType = parsed.runType;
      } catch {}
    }
    readZombieSettings();
    try {
      const parsed = JSON.parse(window.localStorage?.getItem(COMBAT_SETTINGS_STORAGE_KEY) || "{}");
      if (COMBAT_DIFFICULTIES[parsed?.difficulty]) combatDifficulty = parsed.difficulty;
      if (parsed?.characterId) selectedCharacterId = String(parsed.characterId);
      if (PLAYER_PRIMARY_WEAPONS.includes(parsed?.weapon)) selectedPrimaryWeapon = parsed.weapon;
    } catch {}

    function zombieDifficultyConfig() {
      return ZOMBIE_DIFFICULTIES[zombieDifficulty] || ZOMBIE_DIFFICULTIES.normal;
    }

    function combatDifficultyConfig() {
      return COMBAT_DIFFICULTIES[combatDifficulty] || COMBAT_DIFFICULTIES.normal;
    }

    function activeDifficultyConfig() {
      return gameMode === "zombie" ? zombieDifficultyConfig() : combatDifficultyConfig();
    }

    function activeDifficultyKey() {
      return gameMode === "zombie" ? zombieDifficulty : combatDifficulty;
    }

    function zombieRunConfig() {
      return ZOMBIE_RUN_TYPES[zombieRunType] || ZOMBIE_RUN_TYPES.endless;
    }

    function zombieEndless() {
      return gameMode === "zombie" && zombieRunType === "endless";
    }

    function zombieScoreKey(mode = gameMode) {
      return mode === "zombie" ? `zombie:${zombieRunType}:${zombieDifficulty}` : `combat:${combatDifficulty}`;
    }

    function saveModeSettings() {
      try { window.localStorage?.setItem(ZOMBIE_SETTINGS_STORAGE_KEY, JSON.stringify({ difficulty:zombieDifficulty, runType:zombieRunType })); } catch {}
      try { window.localStorage?.setItem(COMBAT_SETTINGS_STORAGE_KEY, JSON.stringify({ difficulty:combatDifficulty, characterId:selectedCharacterId, weapon:selectedPrimaryWeapon })); } catch {}
    }

    function modeConfig() {
      return GAME_MODES[gameMode] || GAME_MODES.combat;
    }

    function playerLoadout() {
      return carriedWeapons.length ? carriedWeapons : [PLAYER_PRIMARY_WEAPONS.includes(selectedPrimaryWeapon) ? selectedPrimaryWeapon : modeConfig().defaultWeapon,"handgun"];
    }

    function currentWeapon() {
      return WEAPONS[selectedWeapon] || WEAPONS[playerLoadout()[0]];
    }

    function currentAmmo() {
      return ammunition[selectedWeapon] || ammunition[modeConfig().defaultWeapon];
    }

    function formatTime(totalSeconds) {
      if (!Number.isFinite(totalSeconds)) return "--:--";
      const seconds = Math.max(0, Math.round(totalSeconds));
      return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
    }

    function readHighScores() {
      try {
        const parsed = JSON.parse(window.localStorage?.getItem(HIGH_SCORE_STORAGE_KEY) || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch { return {}; }
    }

    const highScores = readHighScores();

    function bestClearTime(mode = gameMode) {
      const key = zombieScoreKey(mode);
      let list = highScores[key];
      // Preserve the old v0.13.65 Zombie survival score as the default Normal/Endless record.
      if ((!Array.isArray(list) || !list.length) && mode === "zombie" && zombieDifficulty === "normal" && zombieRunType === "endless") list = highScores.zombie;
      const survivalScore = mode === "zombie" && zombieRunType === "endless";
      if (!Array.isArray(list) || !list.length) return survivalScore ? 0 : Infinity;
      const scores = list.filter(Number.isFinite);
      if (!scores.length) return survivalScore ? 0 : Infinity;
      return survivalScore ? Math.max(...scores) : Math.min(...scores);
    }

    function recordRoundTime(seconds) {
      const safeSeconds = Math.max(0, Math.round(number(seconds)));
      const key = zombieScoreKey();
      const survivalScore = zombieEndless();
      const list = Array.isArray(highScores[key]) ? highScores[key].filter(Number.isFinite) : [];
      list.push(safeSeconds);
      list.sort(survivalScore ? (a, b) => b - a : (a, b) => a - b);
      highScores[key] = list.slice(0, 10);
      try { window.localStorage?.setItem(HIGH_SCORE_STORAGE_KEY, JSON.stringify(highScores)); } catch {}
      return highScores[key][0];
    }

    function syncRestartButton() {
      if (!restartButton) return;
      if (roundState==="respawn-choice") {
        const waiting=reviveUntil>Date.now();
        restartButton.disabled=waiting;
        restartButton.innerHTML=waiting
          ? '<span class="combat-restart-icon" aria-hidden="true">✚</span><span class="combat-restart-copy"><strong>Awaiting revive</strong><small>Teammates can rescue you before the timer runs out</small></span>'
          : '<span class="combat-restart-icon" aria-hidden="true">↻</span><span class="combat-restart-copy"><strong>Respawn</strong><small>Return to your team with full health</small></span>';
        return;
      }
      const waitingForHost=matchType==="coop" && multiplayer?.getLobby?.() && !multiplayer.isHost?.();
      restartButton.disabled=Boolean(waitingForHost);
      restartButton.innerHTML=waitingForHost ? '<span class="combat-restart-icon" aria-hidden="true">⌛</span><span class="combat-restart-copy"><strong>Waiting for host</strong><small>The host restarts the entire team</small></span>' : '<span class="combat-restart-icon" aria-hidden="true">↻</span><span class="combat-restart-copy"><strong>Play again</strong><small>Restart ' + modeConfig().label.toLowerCase() + ' mode</small></span>';
    }

    function enemyDimensions(record) {
      const machine = record.machine || {};
      return {
        w: Math.max(.4, number(machine.w, 1.8)),
        d: Math.max(.4, number(machine.d, 1.8)),
        h: Math.max(1, number(machine.h, 6.5)),
      };
    }

    function enemyCenter(record) {
      const size = enemyDimensions(record);
      return {
        x: number(record.x, number(record.machine?.x)) + size.w / 2,
        y: number(record.machine?.y) + number(record.elevation) + size.h * .54,
        z: number(record.z, number(record.machine?.z)) + size.d / 2,
        radius: clamp(Math.max(size.w, size.d) * .46, .58, 1.35),
      };
    }

    function enemyHitVolumes(record) {
      const size = enemyDimensions(record);
      const baseX = number(record.x, number(record.machine?.x));
      const baseY = number(record.machine?.y) + number(record.elevation);
      const baseZ = number(record.z, number(record.machine?.z));
      const designedHead = options.getEnemyHeadVolume?.({...record.machine,y:baseY}, baseX, baseZ);
      const fallbackHead = {
        center: { x: baseX + size.w * .5, y: baseY + size.h * .805, z: baseZ + size.d * .5 },
        radius: clamp(Math.min(size.w, size.d) * .36, .46, .86),
      };
      const head = designedHead?.center && Number.isFinite(number(designedHead.radius, NaN))
        ? { center:{ x:number(designedHead.center.x), y:number(designedHead.center.y), z:number(designedHead.center.z) }, radius:clamp(number(designedHead.radius)*1.12, .44, 1.05) }
        : fallbackHead;
      return {
        head,
        body: {
          x: baseX + size.w * .17,
          y: baseY + size.h * .07,
          z: baseZ + size.d * .18,
          w: size.w * .66,
          // Stop the body volume below the neck so aiming at the rendered head
          // can no longer resolve as a nearer torso hit.
          h: size.h * .61,
          d: size.d * .64,
        },
      };
    }

    function resetEnemyRecord(record, machine, index) {
      const unit = stableUnit(record.id || enemyId(machine, index));
      record.machine = machine;
      record.health = 100 * activeDifficultyConfig().health;
      record.x = number(machine?.x);
      record.z = number(machine?.z);
      record.anchorX = record.x;
      record.anchorZ = record.z;
      record.rotationY = number(machine?.rotationY ?? machine?.rotation);
      record.heading = unit * Math.PI * 2;
      record.nextHeadingAt = 0;
      record.blockedUntil = 0;
      record.navRoute = null;
      record.navIndex = 0;
      record.navTargetX = NaN;
      record.navTargetZ = NaN;
      record.navExpires = 0;
      record.navBlockedFrames = 0;
      record.navLastX = record.x;
      record.navLastZ = record.z;
      record.nextShotAt = 0;
      record.alerted = false;
      record.lastSeenAt = 0;
      record.lastKnownPlayerX = record.x;
      record.lastKnownPlayerZ = record.z;
      record.aimLockUntil = 0;
      record.killerRevealUntil = 0;
      record.movementBlend = .16;
      record.walkPhase = unit * Math.PI * 2;
      record.elevation = 0;
      record.firingUntil = 0;
      record.muzzleFlashUntil = 0;
      record.recoilUntil = 0;
      record.shotStartedAt = 0;
      record.shotEndsAt = 0;
      record.reloadStartedAt = 0;
      record.reloadUntil = 0;
      record.hitReactUntil = 0;
      record.defeatedAt = 0;
      record.deathAnimationStartedAt = 0;
      record.deathDirection = unit > .5 ? 1 : -1;
      record.deathPushX = 0;
      record.deathPushZ = 0;
      record.zombie = gameMode === "zombie";
      record.weaponKey = record.zombie ? "chainsaw" : (ENEMY_WEAPON_KEYS[Math.floor(Math.random() * ENEMY_WEAPON_KEYS.length)] || "rifle");
      record.weaponLabel = ENEMY_WEAPONS[record.weaponKey]?.label || "Rifle";
      // The pre-v0.13.67 zombie sprint is now Nightmare. Lower difficulties
      // deliberately scale down from that exact speed rather than speeding it up.
      record.modeSpeedMultiplier = record.zombie ? 1.55 * zombieDifficultyConfig().speed : combatDifficultyConfig().speed;
      record.ammoInMagazine = Math.max(0, Math.floor(number(ENEMY_WEAPONS[record.weaponKey]?.magazine, 0)));
      record.tracerUntil = 0;
      record.tracerTarget = null;
      record.tracerStyle = "rifle";
      record.rollStartedAt = 0;
      record.rollUntil = 0;
      record.nextRollAt = 0;
      record.rollDirection = unit > .5 ? 1 : -1;
      record.strafeSign = unit > .5 ? 1 : -1;
      record.speedBias = .86 + unit * .3;
      record.gaitClass = record.zombie ? "walker" : "combat";
      record.gaitCycle = 7.5;
      record.gaitStride = .55;record.gaitSwing=.4;record.gaitBob=.1;record.gaitLean=0;
      record.navProgressAt = 0;
      record.navProgressDistance=Infinity;
      return record;
    }

    function syncEnemies(reset = false) {
      const excludedCharacters = new Set([selectedCharacterId, ...(multiplayer?.remotePlayers?.() || []).map((player) => String(player.characterId || ""))].filter(Boolean));
      const source = matchType === "private" || zombieEndless() ? [] : (Array.isArray(options.getEnemies?.()) ? options.getEnemies().filter((machine, index) => !excludedCharacters.has(enemyId(machine, index))) : []);
      const seen = new Set();
      source.forEach((machine, index) => {
        const id = enemyId(machine, index);
        seen.add(id);
        let record = enemies.get(id);
        if (!record) {
          record = { id };
          enemies.set(id, record);
          resetEnemyRecord(record, machine, index);
        } else {
          record.machine = machine;
          if (reset) resetEnemyRecord(record, machine, index);
        }
      });
      [...enemies.entries()].forEach(([id, record]) => {
        if (!seen.has(id) && !record.synthetic) enemies.delete(id);
      });
      return [...enemies.values()];
    }

    function aliveEnemies() {
      return [...enemies.values()].filter((enemy) => enemy.health > 0);
    }

    function spawnedEnemyMachines() {
      return [...enemies.values()].filter((enemy) => enemy.synthetic && enemy.machine).map((enemy) => enemy.machine);
    }

    function pointBlockedByObstacle(x, z, radius = 1.4) {
      const obstacles = Array.isArray(options.getOccluders?.()) ? options.getOccluders() : [];
      return obstacles.some((obstacle) => {
        const baseY = number(obstacle.y);
        const height = Math.max(.01, number(obstacle.h, 20));
        if (baseY > 7 || baseY + height < .15) return false;
        return circleHitsAabb(x, z, radius, obstacle);
      });
    }

    function edgeSpawnPoint(record, player = options.getPlayer?.()) {
      const bounds = options.getBounds?.();
      if (!Array.isArray(bounds) || bounds.length < 4) return null;
      const minimumX = number(bounds[0]), minimumZ = number(bounds[1]), maximumX = number(bounds[2]), maximumZ = number(bounds[3]);
      const inset = ZOMBIE_EDGE_INSET;
      const radius = clamp(Math.max(enemyDimensions(record).w, enemyDimensions(record).d) * .46, .72, 1.45);
      for (let attempt = 0; attempt < 36; attempt += 1) {
        const edge = Math.floor(Math.random() * 4);
        const x = edge < 2
          ? minimumX + inset + Math.random() * Math.max(1, maximumX - minimumX - inset * 2)
          : (edge === 2 ? minimumX + inset : maximumX - inset);
        const z = edge >= 2
          ? minimumZ + inset + Math.random() * Math.max(1, maximumZ - minimumZ - inset * 2)
          : (edge === 0 ? minimumZ + inset : maximumZ - inset);
        if (player && Math.hypot(x - number(player.x), z - number(player.z)) < 32) continue;
        if (pointBlockedByObstacle(x, z, radius)) continue;
        if (aliveEnemies().some((enemy) => { const center = enemyCenter(enemy); return Math.hypot(center.x - x, center.z - z) < radius + center.radius + 1.2; })) continue;
        return { x, z };
      }
      return null;
    }

    function spawnZombie(now = performance.now(), giant = false) {
      if (!active || gameMode !== "zombie") return null;
      const excludedCharacters=new Set([selectedCharacterId,...(multiplayer?.remotePlayers?.()||[]).map((player)=>String(player.characterId||""))].filter(Boolean));
      const templates = Array.isArray(options.getEnemies?.()) ? options.getEnemies().filter((machine,index) => machine && !excludedCharacters.has(enemyId(machine,index))) : [];
      // Zombie survival must still work even if the plant has only one or no
      // eligible person models after lobby character selection.
      const template = templates.length ? templates[zombieSpawnSerial % templates.length]
        : {id:"zombie-template",type:"person",name:"Zombie",x:0,y:0,z:0,w:1.8,d:1.8,h:6.5,color:"#465744"};
      const id = `zombie-spawn-${++zombieSpawnSerial}`;
      const machine = {
        ...template,
        id, instanceId:id, name:giant ? `GIANT ${template.name || "Plant member"}` : `${template.name || "Plant member"} · Zombie`,
        short:giant ? "GIANT" : (template.short || template.name || "Zombie"),
        designId:giant ? "" : template.designId,
        w:giant ? Math.max(3.2,number(template.w,1.8)*2.05) : template.w,
        d:giant ? Math.max(3.2,number(template.d,1.8)*2.05) : template.d,
        h:giant ? Math.max(10.5,number(template.h,6.5)*1.9) : template.h,
        visible:true, locked:true, showLabel:false, collisionMode:"ignore", combatSpawned:true,
      };
      const record = { id, synthetic:true };
      resetEnemyRecord(record, machine, zombieSpawnSerial);
      record.giant=Boolean(giant);
      record.wave=zombieWave;
      record.health*=Math.min(5,1+Math.max(0,zombieWave-1)*.13)*(giant ? 7 : 1);
      record.modeSpeedMultiplier*=1+Math.min(.65,Math.max(0,zombieWave-1)*.018);
      const roll=stableUnit(id+":gait"),danger=Math.min(.25,Math.max(0,zombieWave-1)*.019);
      record.gaitClass=giant ? "giant" : roll<.22-danger*.4 ? "shambler" : roll<.66-danger ? "walker" : roll<.93-danger*.55 ? "runner" : "sprinter";
      const gait=ZOMBIE_GAITS[record.gaitClass];
      record.modeSpeedMultiplier*=gait.speed;
      record.gaitCycle=gait.cycle*(.89+stableUnit(id+":cadence")*.22);
      record.gaitStride=gait.stride;record.gaitSwing=gait.swing;record.gaitBob=gait.bob;record.gaitLean=gait.lean;
      const spawn = edgeSpawnPoint(record);
      if (!spawn) return null;
      record.x = spawn.x - enemyDimensions(record).w / 2;
      record.z = spawn.z - enemyDimensions(record).d / 2;
      record.anchorX = record.x;
      record.anchorZ = record.z;
      record.machine = { ...machine, x:record.x, z:record.z };
      record.lastSeenAt = now;
      const player = options.getPlayer?.();
      if (player) { record.lastKnownPlayerX = number(player.x); record.lastKnownPlayerZ = number(player.z); }
      enemies.set(id, record);
      zombieSpawnCount += 1;
      return record;
    }

    function zombieAliveCap() {
      return Math.min(32,Math.max(7,Math.round((9 + zombieWave * 1.6) * zombieDifficultyConfig().aliveCap)));
    }

    function findStationPosition(distance=10,seed="station") {
      const player=options.getPlayer?.() || {};
      const bounds=options.getBounds?.() || [];
      const px=number(player.x), pz=number(player.z);
      for (let step=0;step<24;step++) {
        const angle=step*Math.PI/12 + stableUnit(seed)*Math.PI*2;
        const radius=distance+(step%4)*3.4;
        const x=px+Math.cos(angle)*radius,z=pz+Math.sin(angle)*radius;
        if (bounds.length>=4 && (x<number(bounds[0])+4 || x>number(bounds[2])-4 || z<number(bounds[1])+4 || z>number(bounds[3])-4)) continue;
        // Health stations are deliberately separated from the permanent
        // Mystery Box so either purchase remains easy to target on foot.
        if (String(seed).startsWith("medic") && mysteryBox && Math.hypot(x-mysteryBox.x,z-mysteryBox.z)<12) continue;
        const stationRadius = String(seed).startsWith("mystery") ? 3.05 : 2.3;
        if (!pointBlockedByObstacle(x,z,stationRadius) && options.canPlaceStation?.(x,z,stationRadius)!==false) return {x,z};
      }
      // A blocked station is not placed inside solid machinery.
      return null;
    }

    function mysteryPhase(now = performance.now()) {
      if (!mysteryOffer) return "idle";
      // Pause freezes the reel and claim timer until the regular pause-time
      // offset is applied on resume.
      if (paused && pausedAt) now = Math.min(now, pausedAt);
      if(mysteryOffer.prizeKey==="teddy"){
        if(now<mysteryOffer.rollEndsAt)return "rolling";
        if(now<mysteryOffer.rollEndsAt+1750)return "teddy";
        // The box moves only after its complete reel; never while in use.
        mysteryOffer=null;
        moveMysteryBoxForWave(true);
        return "idle";
      }
      if (now >= mysteryOffer.despawnAt) {
        mysteryOffer = null; // Unclaimed prize has lowered and can be rerolled.
        return "idle";
      }
      if (now < mysteryOffer.rollEndsAt) return "rolling";
      // The physical gun rises while the reel spins and is at its peak as the
      // chosen weapon stops. There is no second waiting/rising phase.
      if (now < mysteryOffer.lowerStartsAt) return "ready";
      return "lowering";
    }

    function mysteryPresentation(now = performance.now()) {
      const phase = mysteryPhase(now);
      if (phase === "idle") return null;
      const offer = mysteryOffer;
      if (paused && pausedAt) now = Math.min(now, pausedAt);
      const progress = clamp((now - offer.startedAt) / MYSTERY_ROLL_DURATION_MS, 0, 1);
      // Decelerating reel uses an exact integer number of steps so the
      // final visible slot always lands on the actual random prize.
      const steps = Math.min(MYSTERY_REEL_STEPS, Math.floor(MYSTERY_REEL_STEPS * (1 - Math.pow(1 - progress, 2.3))));
      const index = (offer.prizeIndex + steps - MYSTERY_REEL_STEPS + MYSTERY_REEL_POOL.length * 4) % MYSTERY_REEL_POOL.length;
      const weaponKey = phase === "rolling" ? MYSTERY_REEL_POOL[index] : offer.prizeKey;
      const rise = phase==="rolling" ? progress*progress*(3-2*progress)
        : phase==="ready" ? 1
        : 1 - (1 - Math.pow(1 - clamp((now - offer.lowerStartsAt) / MYSTERY_LOWER_DURATION_MS, 0, 1), 2));
      return {
        phase, weaponKey, weaponName: weaponKey==="teddy"?"Teddy Bear":WEAPONS[weaponKey]?.shortLabel || "Weapon",
        finalWeaponName: offer.prizeKey==="teddy"?"Teddy Bear":WEAPONS[offer.prizeKey]?.shortLabel || "Weapon",
        rarity:mysteryRarity(weaponKey),finalRarity:mysteryRarity(offer.prizeKey),
        rise: clamp(rise, 0, 1), reelStep: steps,
        remainingSeconds: Math.max(0, Math.ceil((offer.lowerStartsAt - now) / 1000)),
      };
    }

    function claimMysteryWeapon() {
      if (mysteryPhase() !== "ready" || !mysteryOffer) return false;
      const key = mysteryOffer.prizeKey;
      if (!WEAPONS[key]) return false;
      if (carriedWeapons.length < MAX_CARRIED_WEAPONS) carriedWeapons.push(key);
      else {
        // Equip the slot you want to replace before taking your prize.
        const replacement = Math.max(0, carriedWeapons.indexOf(selectedWeapon));
        carriedWeapons[replacement] = key;
      }
      ammunition[key] = {magazine:WEAPONS[key].magazine,reserve:WEAPONS[key].reserve};
      selectedWeapon = key;
      reloading = false;
      reloadSerial += 1;
      mouseHeld = false;
      setAiming(false);
      mysteryOffer = null;
      setTransientStatus(`CLAIMED ${WEAPONS[key].shortLabel.toUpperCase()} · EQUIPPED`,2100);
      syncHud();
      multiplayer?.heartbeat?.();
      return true;
    }

    function buyNearbyStation() {
      if (!active || paused || roundState !== "playing" || gameMode !== "zombie" || !nearestStation) return false;
      const isHealth = nearestStation === "health";
      if (!isHealth) {
        const phase = mysteryPhase();
        if (phase === "ready") return claimMysteryWeapon();
        if (phase !== "idle") {
          setTransientStatus(phase === "rolling" ? "MYSTERY REEL IS SPINNING" : "WAIT FOR THE WEAPON TO APPEAR",900);
          return false;
        }
      }
      const cost = isHealth ? HEALTH_STATION_COST : MYSTERY_BOX_COST;
      if (playerPoints < cost) {
        setTransientStatus(`NEED ${cost - playerPoints} MORE POINTS`,1600);
        return false;
      }
      if (isHealth && playerHealth >= 100) {
        setTransientStatus("HEALTH ALREADY FULL",1350);
        return false;
      }
      if (isHealth) {
        playerPoints -= cost;
        playerHealth = 100; playerShield = SHIELD_MAX;
        lastHealthPurchaseWave = zombieWave;
        setTransientStatus(`FULL HEALTH RESTORED · -${cost} POINTS`,1800);
      } else {
        const pool = MYSTERY_WEAPON_POOL.filter(key => WEAPONS[key] && !carriedWeapons.includes(key));
        const choices = [...(pool.length ? pool : MYSTERY_WEAPON_POOL.filter(key => WEAPONS[key])),"teddy"];
        const key = rollMysteryPrize(choices);
        const now = performance.now();
        const rollEndsAt = now + MYSTERY_ROLL_DURATION_MS;
        const riseEndsAt = rollEndsAt;
        const lowerStartsAt = rollEndsAt + MYSTERY_CLAIM_WINDOW_MS;
        mysteryOffer = {
          prizeKey:key, prizeIndex:MYSTERY_REEL_POOL.indexOf(key),
          startedAt:now,rollEndsAt,riseEndsAt,lowerStartsAt,
          despawnAt:lowerStartsAt+MYSTERY_LOWER_DURATION_MS,
        };
        // Charge only when rolling starts; no weapon or second charge until
        // another E press on the fully risen prize. Ignoring it forfeits it.
        playerPoints -= cost;
        setTransientStatus(`MYSTERY REEL SPINNING · -${cost} POINTS`,1800);
      }
      nearestStation = null;
      syncHud();
      multiplayer?.heartbeat?.();
      return true;
    }

    function moveMysteryBoxForWave(fromTeddy=false) {
      // No wave-based relocation. A teddy roll moves a box only after the
      // animation has completely finished; never interrupt a live offer.
      if (!mysteryBox || mysteryOffer) return;
      const previous=mysteryBox,bounds=options.getBounds?.()||[];
      if(bounds.length<4)return;
      const margin=9,minX=number(bounds[0])+margin,maxX=number(bounds[2])-margin;
      const minZ=number(bounds[1])+margin,maxZ=number(bounds[3])-margin;
      if(maxX<=minX||maxZ<=minZ)return;
      const player=options.getPlayer?.()||{},picks=[];
      for(let i=0;i<90;i++) {
        const x=minX+Math.random()*(maxX-minX),z=minZ+Math.random()*(maxZ-minZ);
        if(Math.hypot(x-previous.x,z-previous.z)<24 || Math.hypot(x-number(player.x),z-number(player.z))<11)continue;
        if(healthStation && Math.hypot(x-healthStation.x,z-healthStation.z)<13)continue;
        if(pointBlockedByObstacle(x,z,3.05)||options.canPlaceStation?.(x,z,3.05)===false)continue;
        picks.push({x,z});
        if(picks.length>=10)break;
      }
      if(!picks.length)return;
      mysteryBox=picks[Math.floor(Math.random()*picks.length)];
      nearestStation=null;
      if(fromTeddy && matchType==="coop" && multiplayer?.getLobby?.())
        multiplayer.sendEvent?.("mystery-relocate",{x:mysteryBox.x,z:mysteryBox.z},"").catch(()=>{});
      setTransientStatus("MYSTERY BOX HAS MOVED · FIND ITS NEW LOCATION",2350);
    }

    function beginZombieWave(now) {
      zombieWave+=1;
      // Mystery Box relocates only when a teddy bear is rolled, not on waves.
      waveSpecial=zombieWave%5===0;
      waveTotal=Math.min(72,Math.max(5,Math.round((5+zombieWave*3)*zombieDifficultyConfig().aliveCap)));
      waveSpawned=0;
      waveDefeated=0;
      waveNextAt=0;
      nextZombieSpawnAt=now+1050;
      playCombatSound("wave-start",.86);
      lastWaveTick=0;
      if (waveSpecial) {
        healthStation=findStationPosition(13, `medic-${zombieWave}`);
        setTransientStatus(`WAVE ${zombieWave} · GIANTS INCOMING · HEALTH STATION OPEN`,2400);
      } else {
        healthStation=null;
        setTransientStatus(`WAVE ${zombieWave} · ${waveTotal} ZOMBIES`,1800);
      }
    }

    function cleanupZombieCorpses(now) {
      if (gameMode !== "zombie") return;
      for (const [id, enemy] of enemies.entries()) {
        if (!enemy.synthetic || enemy.health > 0 || !enemy.defeatedAt) continue;
        if (now - enemy.defeatedAt > 5200) enemies.delete(id);
      }
    }

    function updateZombieSpawns(now) {
      if (!zombieEndless() || coopFollower() || !["playing","respawning","respawn-choice","lost"].includes(roundState)) return;
      if (roundState==="lost" && !(matchType==="coop" && multiplayer?.isHost?.() && (multiplayer.remotePlayers?.()||[]).some((entry)=>entry.state?.alive!==false))) return;
      if (!zombieWave) beginZombieWave(now);
      if (waveSpawned>=waveTotal) {
        if (waveDefeated>=waveTotal) {
          if (!waveNextAt) {waveNextAt=now+ZOMBIE_WAVE_BREAK_MS;playCombatSound("wave-clear",.90);setTransientStatus(`WAVE ${zombieWave} CLEARED · NEXT IN 11 SECONDS`,2500);}
          if (now>=waveNextAt) beginZombieWave(now);
        }
        return;
      }
      if (now<nextZombieSpawnAt || aliveEnemies().length>=zombieAliveCap()) return;
      const giant=waveSpecial
        ? (waveSpawned===Math.floor(waveTotal*.45) || waveSpawned===waveTotal-1)
        : zombieWave>=7 && zombieWave%3===0 && waveSpawned===Math.floor(waveTotal*.7);
      if (spawnZombie(now,giant)) waveSpawned++;
      const interval=Math.max(360,Math.round((1680-zombieWave*36)*zombieDifficultyConfig().spawnRate));
      nextZombieSpawnAt=now+interval*(.78+Math.random()*.42);
    }

    function pickupCandidatePositions() {
      const bounds = options.getBounds?.();
      if (!Array.isArray(bounds) || bounds.length < 4) return [];
      const minX=number(bounds[0]), minZ=number(bounds[1]), maxX=number(bounds[2]), maxZ=number(bounds[3]);
      const fractions = [[.18,.22],[.38,.18],[.62,.22],[.82,.30],[.22,.56],[.48,.52],[.74,.58],[.35,.78],[.68,.80]];
      const result=[];
      for (const [fx,fz] of fractions) {
        const baseX=minX+(maxX-minX)*fx, baseZ=minZ+(maxZ-minZ)*fz;
        let point=null;
        for(let ring=0;ring<7&&!point;ring+=1){
          const radius=ring*5.5;
          const angle=ring*2.31;
          const x=baseX+Math.cos(angle)*radius, z=baseZ+Math.sin(angle)*radius;
          if(x<minX+6||x>maxX-6||z<minZ+6||z>maxZ-6) continue;
          if(pointBlockedByObstacle(x,z,2.1)) continue;
          point={x,z};
        }
        if(point) result.push(point);
      }
      return result;
    }

    function resetAmmoPickups() {
      worldEffects.pickups.length = 0;
      pickupCandidatePositions().forEach((point,index) => {
        worldEffects.pickups.push({ id:`ammo-${index+1}`, x:point.x, y:.18, z:point.z, active:true, nextActiveAt:0, collectedAt:0 });
      });
    }

    function updateAmmoPickups(now, player = options.getPlayer?.()) {
      if (!active || !player?.engaged) return;
      for (const pickup of worldEffects.pickups) {
        if (!pickup.active) {
          if (now >= pickup.nextActiveAt) pickup.active = true;
          else continue;
        }
        if (Math.hypot(number(player.x)-pickup.x, number(player.z)-pickup.z) > AMMO_PICKUP_RADIUS) continue;
        const primary=WEAPONS[selectedPrimaryWeapon] || WEAPONS.rifle;
        const primaryAmmo=ammunition[selectedPrimaryWeapon];
        const beforePrimary=primaryAmmo?.reserve ?? 0, beforePistol=ammunition.handgun.reserve;
        const primaryGain=primary.key === "rocket" ? 2 : primary.key === "sniper" ? 6 : primary.key === "shotgun" ? 12 : 45;
        if (!primary.noAmmo && primaryAmmo) primaryAmmo.reserve=Math.min(primary.reserve,primaryAmmo.reserve+primaryGain);
        ammunition.handgun.reserve=Math.min(WEAPONS.handgun.reserve,ammunition.handgun.reserve+24);
        const gained=(primaryAmmo?.reserve ?? 0)>beforePrimary || ammunition.handgun.reserve>beforePistol;
        if (!gained) continue;
        pickup.active=false; pickup.collectedAt=now; pickup.nextActiveAt=now+AMMO_PICKUP_RESPAWN_MS*zombieDifficultyConfig().pickupRespawn;
        setTransientStatus(primary.noAmmo ? "Pistol ammo pickup" : `${primary.shortLabel} ammo +${primaryGain}`, 1200);
        syncHud();
      }
    }

    function nearestObstacleHit(origin, direction, maximumDistance) {
      const obstacles = Array.isArray(options.getOccluders?.()) ? options.getOccluders() : [];
      let nearest = maximumDistance;
      let hitObstacle = null;
      for (const obstacle of obstacles) {
        if (obstacle?.kind === "glass" && shatteredGlass.has(String(obstacle.glassId || ""))) continue;
        const distance = rayAabb(origin, direction, obstacle, nearest);
        if (Number.isFinite(distance) && distance < nearest) { nearest = distance; hitObstacle = obstacle; }
      }
      if (hitObstacle?.kind === "machine" && hitObstacle.machineId) {
        let paneDistance=maximumDistance, pane=null;
        for (const obstacle of obstacles) {
          if (obstacle?.kind !== "glass" || obstacle.machineId !== hitObstacle.machineId || shatteredGlass.has(String(obstacle.glassId || ""))) continue;
          const distance=rayAabb(origin,direction,obstacle,paneDistance);
          if (Number.isFinite(distance) && distance<paneDistance) {paneDistance=distance;pane=obstacle;}
        }
        if (pane) {hitObstacle=pane;nearest=paneDistance;}
      }
      return hitObstacle ? { distance: nearest, obstacle: hitObstacle } : null;
    }

    function nearestObstacleDistance(origin, direction, maximumDistance) {
      return nearestObstacleHit(origin, direction, maximumDistance)?.distance ?? maximumDistance;
    }

    function nearestOpaqueObstacleDistance(origin, direction, maximumDistance) {
      const obstacles = Array.isArray(options.getOccluders?.()) ? options.getOccluders() : [];
      let nearest = maximumDistance;
      for (const obstacle of obstacles) {
        if (obstacle?.kind === "glass") continue;
        const distance = rayAabb(origin, direction, obstacle, nearest);
        if (Number.isFinite(distance) && distance < nearest) nearest = distance;
      }
      return nearest;
    }

    function pointAlongRay(origin, direction, distance) {
      return { x: origin.x + direction.x * distance, y: origin.y + direction.y * distance, z: origin.z + direction.z * distance };
    }

    function impactNormalForBox(point, box) {
      const minX = number(box.x), maxX = minX + Math.max(.01, number(box.w, .01));
      const minY = number(box.y), maxY = minY + Math.max(.01, number(box.h, .01));
      const minZ = number(box.z), maxZ = minZ + Math.max(.01, number(box.d, .01));
      const candidates = [
        [Math.abs(point.x-minX), {x:-1,y:0,z:0}], [Math.abs(point.x-maxX), {x:1,y:0,z:0}],
        [Math.abs(point.y-minY), {x:0,y:-1,z:0}], [Math.abs(point.y-maxY), {x:0,y:1,z:0}],
        [Math.abs(point.z-minZ), {x:0,y:0,z:-1}], [Math.abs(point.z-maxZ), {x:0,y:0,z:1}],
      ];
      candidates.sort((a,b) => a[0]-b[0]);
      return candidates[0][1];
    }

    function resolveWorldImpact(origin, direction, maximumDistance) {
      const obstacleHit = nearestObstacleHit(origin, direction, maximumDistance);
      let distance = obstacleHit?.distance ?? maximumDistance;
      let kind = obstacleHit ? String(obstacleHit.obstacle?.kind || "surface") : "air";
      let normal = obstacleHit ? impactNormalForBox(pointAlongRay(origin, direction, distance), obstacleHit.obstacle) : {x:0,y:0,z:0};
      if (direction.y < -.0001) {
        const floorDistance = (origin.y - .04) / -direction.y;
        if (floorDistance >= 0 && floorDistance < distance && floorDistance <= maximumDistance) { distance = floorDistance; kind = "floor"; normal = {x:0,y:1,z:0}; }
      }
      return { distance, kind, normal, obstacle: obstacleHit?.obstacle || null, point: pointAlongRay(origin, direction, distance), landed: kind !== "air" };
    }

    function pushTracer(origin, target, now, style = "player") {
      worldEffects.tracers.push({ origin: { ...origin }, target: { ...target }, startAt: now, duration: style === "sniper" ? 230 : style === "bazooka" ? 320 : 170, style });
      if (worldEffects.tracers.length > 90) worldEffects.tracers.splice(0, worldEffects.tracers.length - 90);
    }

    function pushImpact(point, now, kind = "surface", normal = {x:0,y:0,z:1}) {
      worldEffects.impacts.push({ point: { ...point }, normal: { ...normal }, startAt: now, expiresAt: now + 90000, kind, size: .105, seed: Math.random() * 1000 });
      if (worldEffects.impacts.length > 180) worldEffects.impacts.splice(0, worldEffects.impacts.length - 180);
    }

    function applyGlassShatterPayload(payload, now, announce = true) {
      const glassId = String(payload?.glassId || "");
      if (!glassId || shatteredGlass.has(glassId)) return false;
      shatteredGlass.add(glassId);
      worldEffects.glassShards.push({
        glassId,
        machineId:String(payload?.machineId || ""),
        componentId:String(payload?.componentId || ""),
        point:{x:number(payload?.point?.x),y:number(payload?.point?.y),z:number(payload?.point?.z)},
        normal:{x:number(payload?.normal?.x),y:number(payload?.normal?.y),z:number(payload?.normal?.z,1)},
        startAt:now,
        duration:1250,
        radius:Math.max(.7, Math.min(3.4, number(payload?.radius, 1.8))),
        seed:Math.random()*1000,
      });
      if (worldEffects.glassShards.length > 36) worldEffects.glassShards.splice(0, worldEffects.glassShards.length - 36);
      if (announce) setTransientStatus("GLASS SHATTERED", 650);
      return true;
    }

    function pushGlassShatter(worldImpact, now) {
      const obstacle = worldImpact?.obstacle || {};
      const payload={
        glassId:String(obstacle.glassId || `${obstacle.machineId || "glass"}:${obstacle.componentId || "surface"}`),
        machineId:String(obstacle.machineId || ""),
        componentId:String(obstacle.componentId || ""),
        point:{...worldImpact.point},
        normal:{...(worldImpact.normal || {x:0,y:0,z:1})},
        radius:Math.max(.7, Math.min(3.4, number(obstacle.glassRadius, 1.8))),
      };
      if (!applyGlassShatterPayload(payload, now, true)) return;
      if (matchType === "coop" && multiplayer?.getLobby?.()) {
        multiplayer.sendEvent?.("glass-shatter",payload,"").catch(()=>{});
      }
    }

    function detonateExplosive(worldImpact,now){
      const o=worldImpact?.obstacle||{};
      if(o.kind!=="explosive-barrel")return false;
      const id=String(o.barrelId||"");
      if(!id || destroyedExplosives.has(id))return false;
      destroyedExplosives.add(id);
      const point={x:number(o.x)+number(o.w)*.5,y:2,z:number(o.z)+number(o.d)*.5};
      worldEffects.explosions.push({point,startAt:now,duration:900,radius:12,
        damageMax:175,sourcePlayer:true,resolved:false,seed:Math.random()*1000});
      if(matchType==="coop" && multiplayer?.getLobby?.())
        multiplayer.sendEvent?.("barrel-detonate",{id,point},"").catch(()=>{});
      setTransientStatus("EXPLOSIVE BARREL DETONATED",950);
      return true;
    }

    function markEnemyDefeated(enemy, now, impactDirection = null) {
      if (!enemy || enemy.defeatedAt > 0) return;
      enemy.health = 0;
      enemy.defeatedAt = now;
      const local=options.getPlayer?.();
      const distance=Math.hypot(number(local?.x)-number(enemy.x),number(local?.z)-number(enemy.z));
      playCombatSound("enemy-down",clamp(35/Math.max(10,distance),.1,.8));
      if (zombieEndless() && !coopFollower() && enemy.wave === zombieWave) waveDefeated=Math.min(waveTotal,waveDefeated+1);
      // Start the fall on the exact kill frame. Corpses also get a small
      // obstacle-aware slide so a nearby machine cannot visually swallow the
      // rotating body and make the death look like a frozen standing pose.
      enemy.deathAnimationStartedAt = now;
      const center = enemyCenter(enemy);
      let pushX = number(impactDirection?.x), pushZ = number(impactDirection?.z);
      let nearestDistance = Infinity;
      for (const obstacle of (Array.isArray(options.getOccluders?.()) ? options.getOccluders() : [])) {
        const cx = number(obstacle.x) + Math.max(.01, number(obstacle.w,.01))/2;
        const cz = number(obstacle.z) + Math.max(.01, number(obstacle.d,.01))/2;
        const distance = Math.hypot(center.x-cx,center.z-cz);
        if (distance >= nearestDistance || distance > 5.2) continue;
        const dx=center.x-cx,dz=center.z-cz,length=Math.hypot(dx,dz)||1;
        pushX=dx/length; pushZ=dz/length; nearestDistance=distance;
      }
      const pushLength=Math.hypot(pushX,pushZ)||1;
      enemy.deathPushX = pushX/pushLength * 1.15;
      enemy.deathPushZ = pushZ/pushLength * 1.15;
      enemy.movementBlend = 0;
      enemy.rollUntil = 0;
      enemy.rollStartedAt = 0;
      enemy.firingUntil = 0;
      enemy.muzzleFlashUntil = 0;
      enemy.aimLockUntil = 0;
    }

    function triggerCombatRoll(enemy, now, chance = .5) {
      if (!enemy || enemy.health <= 0 || now < enemy.nextRollAt || Math.random() > chance) return false;
      enemy.rollDirection = Math.random() > .5 ? 1 : -1;
      enemy.rollStartedAt = now;
      enemy.rollUntil = now + 640;
      enemy.nextRollAt = now + 2400 + Math.random() * 1900;
      enemy.strafeSign = enemy.rollDirection;
      return true;
    }

    function nearMissEnemy(origin, direction, range, excludedEnemy = null) {
      let best = null;
      let bestLateral = 3.2;
      const wallDistance = nearestObstacleDistance(origin, direction, range);
      for (const enemy of aliveEnemies()) {
        if (enemy === excludedEnemy) continue;
        const center = enemyCenter(enemy);
        const vx = center.x-origin.x, vy=center.y-origin.y, vz=center.z-origin.z;
        const along = vx*direction.x + vy*direction.y + vz*direction.z;
        if (along <= 0 || along >= Math.min(range, wallDistance)) continue;
        const px = origin.x + direction.x*along, py=origin.y + direction.y*along, pz=origin.z + direction.z*along;
        const lateral = Math.hypot(center.x-px, center.y-py, center.z-pz);
        if (lateral < bestLateral) { bestLateral = lateral; best = enemy; }
      }
      return best;
    }

    function pushBloodBurst(enemy, point, now, defeated = false) {
      worldEffects.bloodBursts.push({ point: { ...point }, startAt: now, duration: 680, seed: Math.random() * 1000, intensity: defeated ? 1.35 : 1 });
      if (worldEffects.bloodBursts.length > 72) worldEffects.bloodBursts.splice(0, worldEffects.bloodBursts.length - 72);
      if (defeated) {
        const center = enemyCenter(enemy);
        worldEffects.bloodPools.push({ x: center.x, y: .035, z: center.z, startAt: now + 920, expiresAt: now + 120000, seed: Math.random() * 1000 });
        if (Math.random() < .28) {
          worldEffects.bloodFountains.push({ x:center.x, y:number(enemy.machine?.y)+.7, z:center.z, startAt: now + 1250 + Math.random()*650, duration: 1450 + Math.random()*550, seed: Math.random()*1000 });
        }
        if (worldEffects.bloodPools.length > 40) worldEffects.bloodPools.splice(0, worldEffects.bloodPools.length - 40);
        if (worldEffects.bloodFountains.length > 18) worldEffects.bloodFountains.splice(0, worldEffects.bloodFountains.length - 18);
      }
    }

    function pushExplosiveProjectile(enemy, playerTarget, now, loadout) {
      const source = enemyCenter(enemy);
      const muzzle = { x: source.x, y: source.y + .08, z: source.z };
      const desired = { ...playerTarget };
      const toTarget = { x: desired.x-muzzle.x, y: desired.y-muzzle.y, z: desired.z-muzzle.z };
      const distance = Math.max(.01, Math.hypot(toTarget.x,toTarget.y,toTarget.z));
      const direction = normalizeDirection(toTarget);
      const impact = resolveWorldImpact(muzzle,direction,Math.min(distance,loadout.range));
      if (impact.kind === "glass") pushGlassShatter(impact, now); // AI GLASS: explosive rounds break the actual machine pane.
      const finalPoint = impact.landed && impact.distance < distance-.1 ? impact.point : desired;
      const travelDistance = Math.hypot(finalPoint.x-muzzle.x,finalPoint.y-muzzle.y,finalPoint.z-muzzle.z);
      const duration = clamp(travelDistance / Math.max(35,loadout.projectileSpeed||80) * 1000, 260, 1250);
      worldEffects.rockets.push({ origin:muzzle, target:{...finalPoint}, startAt:now, duration, style:loadout.key });
      worldEffects.explosions.push({ point:{...finalPoint}, startAt:now+duration, duration:900, radius:loadout.explosionRadius||9, sourceEnemyId:enemy.id, damageMin:loadout.damageMin, damageMax:loadout.damageMax, resolved:false, seed:Math.random()*1000 });
      if (worldEffects.rockets.length > 24) worldEffects.rockets.splice(0,worldEffects.rockets.length-24);
      if (worldEffects.explosions.length > 28) worldEffects.explosions.splice(0,worldEffects.explosions.length-28);
    }

    function splashDamage(point, target, radius, baseDamage) {
      const distance=Math.hypot(number(target.x)-point.x,number(target.y)-point.y,number(target.z)-point.z);
      if(distance>=radius)return 0;
      // Solid machinery or walls protect distant targets, without making
      // a point-blank impact inexplicably deal no damage.
      if(distance>2.25 && !hasLineOfSight({x:point.x,y:point.y+.25,z:point.z},target))return 0;
      return Math.max(0,number(baseDamage))*clamp(1-distance/Math.max(.1,radius),0,1);
    }

    function resolveExplosionDamage(now) {
      const player=options.getPlayer?.();
      for(const explosion of worldEffects.explosions){
        if(explosion.resolved || now<explosion.startAt)continue;
        explosion.resolved=true;
        playCombatSound("explosion",.88);
        const radius=clamp(number(explosion.radius,10),1,14);
        const baseDamage=number(explosion.damageMax,145);
        const sourceEnemy=enemies.get(String(explosion.sourceEnemyId||""));
        if(player){
          const localPoint={x:number(player.x),y:number(player.y,5.5),z:number(player.z)};
          const hurt=splashDamage(explosion.point,localPoint,radius,baseDamage);
          if(hurt>0){
            const source=sourceEnemy || {
              id:"player-rocket",x:explosion.point.x,z:explosion.point.z,
              weaponKey:"rocket",weaponLabel:"Rocket Launcher",
              machine:{name:explosion.sourcePlayer?"Your rocket":"Rocket blast"}
            };
            // Rocket splash also harms the shooter when firing too close.
            damagePlayer(hurt,source,player);
          }
        }
        // Host owns enemy health; co-op clients report damage to the host
        // through the established enemy-hit channel via applyPlayerHit.
        if(!coopFollower()){
          for(const enemy of aliveEnemies()){
            const center=enemyCenter(enemy);
            const hurt=splashDamage(explosion.point,center,radius,baseDamage);
            if(hurt<=0)continue;
            if(explosion.sourcePlayer){
              applyPlayerHit({enemy,zone:"body",distance:Math.max(.001,Math.hypot(
                center.x-explosion.point.x,center.y-explosion.point.y,center.z-explosion.point.z))},
                normalizeDirection({x:center.x-explosion.point.x,y:center.y-explosion.point.y,z:center.z-explosion.point.z}),
                explosion.point,hurt,now);
            }else{
              // Enemy rockets also damage nearby zombies and other enemy AI.
              enemy.health=Math.max(0,enemy.health-hurt);
              enemy.hitReactUntil=now+220;
              if(enemy.health<=0)markEnemyDefeated(enemy,now);
              pushBloodBurst(enemy,center,now,enemy.health<=0);
            }
          }
        }else if(explosion.sourcePlayer){
          for(const enemy of aliveEnemies()){
            const center=enemyCenter(enemy);
            const hurt=splashDamage(explosion.point,center,radius,baseDamage);
            if(hurt<=0)continue;
            applyPlayerHit({enemy,zone:"body",distance:Math.max(.001,Math.hypot(
              center.x-explosion.point.x,center.y-explosion.point.y,center.z-explosion.point.z))},
              normalizeDirection({x:center.x-explosion.point.x,y:center.y-explosion.point.y,z:center.z-explosion.point.z}),
              explosion.point,hurt,now);
          }
        }
        // One timed blast event makes player-fired and AI-fired rockets hurt
        // every nearby multiplayer character (including co-op teammates).
        if(multiplayer?.getLobby?.() && matchType!=="solo"){
          if(explosion.sourcePlayer || (explosion.sourceEnemyId && multiplayer.isHost?.())){
            multiplayer.sendEvent?.("rocket-blast",{
              point:explosion.point,radius,damage:baseDamage,
              enemyId:explosion.sourceEnemyId||"",weapon:"rocket"
            },"").catch(()=>{});
          }
        }
        if(explosion.sourcePlayer && aliveEnemies().length===0 && enemies.size>0 &&
            (gameMode!=="zombie" || zombieRunType==="normal") &&
            (matchType!=="coop" || multiplayer?.isHost?.()))scheduleVictory();
      }
    }

    function combatEffects(now = performance.now()) {
      worldEffects.tracers = worldEffects.tracers.filter((effect) => now < effect.startAt + effect.duration);
      worldEffects.bloodBursts = worldEffects.bloodBursts.filter((effect) => now < effect.startAt + effect.duration);
      worldEffects.bloodFountains = worldEffects.bloodFountains.filter((effect) => now < effect.startAt + effect.duration);
      worldEffects.impacts = worldEffects.impacts.filter((effect) => now < effect.expiresAt);
      worldEffects.bloodPools = worldEffects.bloodPools.filter((effect) => now < effect.expiresAt);
      worldEffects.rockets = worldEffects.rockets.filter((effect) => now < effect.startAt + effect.duration + 80);
      worldEffects.explosions = worldEffects.explosions.filter((effect) => now < effect.startAt + effect.duration);
      worldEffects.glassShards = worldEffects.glassShards.filter((effect) => now < effect.startAt + effect.duration);
      worldEffects.stations=gameMode==="zombie" ? [
        ...(mysteryBox ? [{...mysteryBox,type:"mystery",label:"MYSTERY BOX",cost:MYSTERY_BOX_COST,offer:mysteryPresentation(now)}] : []),
        ...(healthStation ? [{...healthStation,type:"health",label:"HEALTH STATION",cost:HEALTH_STATION_COST}] : []),
      ] : [];
      return worldEffects;
    }

    function hasLineOfSight(from, to) {
      const delta = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
      const distance = Math.hypot(delta.x, delta.y, delta.z);
      if (distance <= .01) return true;
      const direction = normalizeDirection(delta);
      // Intact machine glass is visible cover, not an opaque sight wall. If it
      // is the first thing between AI and the player, allow the AI to take the
      // shot; fireEnemy will collide with that pane, shatter it, and stop the
      // bullet before it can hurt the player.
      const firstHit=nearestObstacleHit(from,direction,distance);
      if (firstHit?.obstacle?.kind === "glass") return true;
      return nearestOpaqueObstacleDistance(from, direction, distance) >= distance - .45;
    }

    function findTarget(origin, direction, range) {
      const wallDistance = nearestObstacleDistance(origin, direction, range);
      let best = null;
      let bestDistance = range;
      for (const enemy of aliveEnemies()) {        const volumes = enemyHitVolumes(enemy);
        const headDistance = raySphere(origin, direction, volumes.head.center, volumes.head.radius);
        const bodyDistance = rayAabb(origin, direction, volumes.body, bestDistance);
        // Head is authoritative when head and neck/body volumes overlap.
        const candidates = Number.isFinite(headDistance) && headDistance < wallDistance-.05
          ? [{zone:"head",distance:headDistance}]
          : [{zone:"body",distance:bodyDistance}];
        for (const candidate of candidates) {
          if (!Number.isFinite(candidate.distance) || candidate.distance > bestDistance || candidate.distance >= wallDistance - .05) continue;
          best = { enemy, zone: candidate.zone };
          bestDistance = candidate.distance;
        }
      }
      return best ? { ...best, distance: bestDistance } : null;
    }

    // Build one lightweight broad-phase grid from the same actual machine,
    // wall, and column envelopes used for first-person collision. Glass keeps
    // collision only when it really has a physical panel at foot height.
    function navigationRadius(record) {
      const size=enemyDimensions(record);
      // Allow extra elbow-room around cage corners and machine envelopes so
      // waypoint shortcuts do not cut the actor too close to the geometry.
      return clamp(Math.max(size.w,size.d)*.42+.42,.88,2.05);
    }

    function navigationWorld(now=performance.now()) {
      if (now-navCache.at<1100 && navCache.obstacles.length) return navCache;
      navCache.at=now;
      navCache.bounds=options.getBounds?.() || null;
      navCache.obstacles=[];
      navCache.buckets=new Map();
      const occluders=Array.isArray(options.getOccluders?.()) ? options.getOccluders() : [];
      for (const o of occluders) {
        const x=number(o.x,NaN),z=number(o.z,NaN);
        const w=number(o.w),d=number(o.d);
        if (!Number.isFinite(x)||!Number.isFinite(z)||w<=0||d<=0) continue;
        if (number(o.y)>7 || number(o.y)+number(o.h,20)<.4) continue;
        if (o.kind==="glass" && shatteredGlass.has(String(o.glassId||""))) continue;
        const obstacle={x,z,w,d};
        if(o.kind==="desert-hill" && number(o.navRadius)>0){
          obstacle.cx=x+w*.5;obstacle.cz=z+d*.5;
          obstacle.navRadius=number(o.navRadius);
        }
        navCache.obstacles.push(obstacle);
        const minX=Math.floor((x-1.4)/NAV_BUCKET_SIZE),maxX=Math.floor((x+w+1.4)/NAV_BUCKET_SIZE);
        const minZ=Math.floor((z-1.4)/NAV_BUCKET_SIZE),maxZ=Math.floor((z+d+1.4)/NAV_BUCKET_SIZE);
        for(let bx=minX;bx<=maxX;bx++) for(let bz=minZ;bz<=maxZ;bz++) {
          const key=bx+":"+bz;
          if (!navCache.buckets.has(key)) navCache.buckets.set(key,[]);
          navCache.buckets.get(key).push(obstacle);
        }
      }
      return navCache;
    }

    function navigationCandidates(x,z,context) {
      return context.buckets.get(Math.floor(x/NAV_BUCKET_SIZE)+":"+Math.floor(z/NAV_BUCKET_SIZE)) || [];
    }

    function navigationOpen(x,z,radius,context) {
      if (context.bounds?.length>=4 && (
        x<context.bounds[0]+radius || x>context.bounds[2]-radius ||
        z<context.bounds[1]+radius || z>context.bounds[3]-radius)) return false;
      for (const o of navigationCandidates(x,z,context)) {
        if (o.navRadius) {
          if(Math.hypot(x-o.cx,z-o.cz)<radius+o.navRadius)return false;
        } else if (circleHitsAabb(x,z,radius,o)) return false;
      }
      return true;
    }

    function navigationStraight(from,to,radius,context) {
      const dx=to.x-from.x,dz=to.z-from.z;
      const distance=Math.hypot(dx,dz);
      if (distance<.08) return true;
      // Segment versus radius-expanded rectangles, using only nearby buckets.
      const minBX=Math.floor((Math.min(from.x,to.x)-radius)/NAV_BUCKET_SIZE);
      const maxBX=Math.floor((Math.max(from.x,to.x)+radius)/NAV_BUCKET_SIZE);
      const minBZ=Math.floor((Math.min(from.z,to.z)-radius)/NAV_BUCKET_SIZE);
      const maxBZ=Math.floor((Math.max(from.z,to.z)+radius)/NAV_BUCKET_SIZE);
      const visited=new Set();
      for (let bx=minBX;bx<=maxBX;bx++) for(let bz=minBZ;bz<=maxBZ;bz++) {
        for (const o of context.buckets.get(bx+":"+bz)||[]) {
          if (visited.has(o)) continue;
          visited.add(o);
          if(o.navRadius){
            const lengthSquared=dx*dx+dz*dz;
            const t=lengthSquared>0?clamp(((o.cx-from.x)*dx+(o.cz-from.z)*dz)/lengthSquared,0,1):0;
            if(Math.hypot(from.x+t*dx-o.cx,from.z+t*dz-o.cz)<o.navRadius+radius+.08)return false;
            continue;
          }
          const left=o.x-radius-.08,right=o.x+o.w+radius+.08;
          const top=o.z-radius-.08,bottom=o.z+o.d+radius+.08;
          let enter=0,exit=1;
          for(const [origin,delta,low,high] of [[from.x,dx,left,right],[from.z,dz,top,bottom]]) {
            if (Math.abs(delta)<1e-6) {if(origin<low||origin>high){enter=2;break;}continue;}
            const a=(low-origin)/delta,b=(high-origin)/delta;
            enter=Math.max(enter,Math.min(a,b));
            exit=Math.min(exit,Math.max(a,b));
            if(enter>exit) break;
          }
          if(enter<=exit && enter<=1 && exit>=0) return false;
        }
      }
      return true;
    }

    function navigationRoute(enemy,start,goal,now) {
      const context=navigationWorld(now);
      const radius=navigationRadius(enemy);
      if (navigationStraight(start,goal,radius,context)) return [];
      const startX=Math.floor(start.x/NAV_CELL_SIZE),startZ=Math.floor(start.z/NAV_CELL_SIZE);
      const goalX=Math.floor(goal.x/NAV_CELL_SIZE),goalZ=Math.floor(goal.z/NAV_CELL_SIZE);
      const key=(x,z)=>x+":"+z;
      const point=(x,z)=>({x:(x+.5)*NAV_CELL_SIZE,z:(z+.5)*NAV_CELL_SIZE});
      const originKey=key(startX,startZ);
      const open=[{x:startX,z:startZ,g:0,f:0,parent:null}];
      const known=new Map([[originKey,open[0]]]),closed=new Set();
      let nearest=open[0],nearestScore=Math.hypot(start.x-goal.x,start.z-goal.z);
      let finished=null,expanded=0;
      const steps=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      while(open.length && expanded<NAV_ROUTE_MAX_EXPANSIONS) {
        let best=0;
        for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
        const current=open.splice(best,1)[0],cid=key(current.x,current.z);
        if(closed.has(cid))continue;
        closed.add(cid);expanded++;
        const worldPoint=point(current.x,current.z);
        const toGoal=Math.hypot(worldPoint.x-goal.x,worldPoint.z-goal.z);
        if(toGoal<nearestScore) {nearestScore=toGoal;nearest=current;}
        if(toGoal<=NAV_CELL_SIZE*1.5 && navigationStraight(worldPoint,goal,radius,context)) {finished=current;break;}
        for(const [sx,sz] of steps) {
          const nx=current.x+sx,nz=current.z+sz,nid=key(nx,nz);
          if(closed.has(nid))continue;
          const dest=point(nx,nz);
          if(!navigationOpen(dest.x,dest.z,radius,context))continue;
          // Diagonal corner cutting would send enemies through an envelope.
          if(sx && sz && (!navigationOpen(point(current.x+sx,current.z).x,point(current.x+sx,current.z).z,radius,context)
            || !navigationOpen(point(current.x,current.z+sz).x,point(current.x,current.z+sz).z,radius,context)))continue;
          const g=current.g+(sx&&sz?1.414:1),prior=known.get(nid);
          if(prior && prior.g<=g)continue;
          const node={x:nx,z:nz,g,f:g+Math.hypot(dest.x-goal.x,dest.z-goal.z)/NAV_CELL_SIZE,parent:current};
          known.set(nid,node);open.push(node);
        }
      }
      // A partial route is useful when the target is enclosed; keep advancing
      // around nearby barriers and replan after the player moves.
      let cursor=finished||nearest;
      if(cursor===open[0] || cursor===known.get(originKey))return [];
      const reverse=[];
      while(cursor?.parent && reverse.length<120){reverse.push(point(cursor.x,cursor.z));cursor=cursor.parent;}
      reverse.reverse();
      if(finished) reverse.push(goal);
      // String-pull across traversable segments to remove grid-staircase jitter.
      const route=[];let last=start;
      for(let i=0;i<reverse.length;) {
        let furthest=i;
        for(let j=i+1;j<reverse.length;j++) {
          if(navigationStraight(last,reverse[j],radius,context))furthest=j;
          else break;
        }
        route.push(reverse[furthest]);last=reverse[furthest];i=furthest+1;
      }
      return route;
    }

    function navigateEnemy(enemy,center,target,now) {
      const context=navigationWorld(now),radius=navigationRadius(enemy);
      const targetChanged=Math.hypot(number(enemy.navTargetX,center.x)-target.x,number(enemy.navTargetZ,center.z)-target.z)>7;
      // Direct-path checks are broad-phase cached for moving enemies. Pathfinding
      // is much more expensive than motion interpolation at 60+ FPS.
      const needsDirectCheck=!enemy.navLineCheckedAt || now-enemy.navLineCheckedAt>290
        || Math.hypot(center.x-number(enemy.navLineStartX,center.x),center.z-number(enemy.navLineStartZ,center.z))>3.6
        || targetChanged;
      if(needsDirectCheck) {
        enemy.navDirectOpen=navigationStraight(center,target,radius,context);
        enemy.navLineCheckedAt=now;
        enemy.navLineStartX=center.x;
        enemy.navLineStartZ=center.z;
      }
      if(enemy.navDirectOpen) {
        enemy.navRoute=null;
        enemy.navIndex=0;
        enemy.navExpires=0;
        enemy.navTargetX=target.x;enemy.navTargetZ=target.z;
        return target;
      }
      if ((now>=enemy.navExpires || targetChanged || enemy.navBlockedFrames>13) && navFramePlans<NAV_REBUILDS_PER_FRAME) {
        navFramePlans++;
        enemy.navRoute=navigationRoute(enemy,center,target,now);
        enemy.navIndex=0;
        enemy.navTargetX=target.x;enemy.navTargetZ=target.z;
        enemy.navExpires=now+NAV_ROUTE_REPLAN_MS+(stableUnit(enemy.id)*300);
        enemy.navBlockedFrames=0;
      }
      const path=enemy.navRoute;
      if(!path?.length)return target;
      while(enemy.navIndex<path.length-1 && Math.hypot(path[enemy.navIndex].x-center.x,path[enemy.navIndex].z-center.z)<NAV_CELL_SIZE*.72)enemy.navIndex++;
      // Can skip waypoints when the player has moved into a newly open lane.
      if (enemy.navIndex<path.length-1 && navigationStraight(center,path[enemy.navIndex+1],radius,context))enemy.navIndex++;
      return path[Math.min(enemy.navIndex,path.length-1)];
    }

    function enemyCanOccupy(record, centerX, centerZ) {
      const size = enemyDimensions(record);
      const radius = clamp(Math.max(size.w, size.d) * .42, .55, 1.2);
      const bounds = options.getBounds?.();
      if (Array.isArray(bounds) && bounds.length >= 4) {
        if (
          centerX < number(bounds[0]) + radius
          || centerX > number(bounds[2]) - radius
          || centerZ < number(bounds[1]) + radius
          || centerZ > number(bounds[3]) - radius
        ) return false;
      }
      const obstacles = Array.isArray(options.getOccluders?.()) ? options.getOccluders() : [];
      for (const obstacle of obstacles) {
        const baseY = number(obstacle.y);
        const height = Math.max(.01, number(obstacle.h, 20));
        if (baseY > number(record.elevation)+size.h || baseY + height < number(record.elevation)+.15) continue;
        if(obstacle.kind==="desert-hill" && number(obstacle.navRadius)>0){
          if(Math.hypot(centerX-(number(obstacle.x)+number(obstacle.w)*.5),
            centerZ-(number(obstacle.z)+number(obstacle.d)*.5))<number(obstacle.navRadius)+radius)return false;
          continue;
        }
        if (circleHitsAabb(centerX, centerZ, radius, obstacle)) return false;
      }
      for (const other of aliveEnemies()) {
        if (other === record) continue;
        const otherCenter = enemyCenter(other);
        const minimum = radius + otherCenter.radius * .65;
        if (Math.hypot(centerX - otherCenter.x, centerZ - otherCenter.z) < minimum) return false;
      }
      return true;
    }

    function tryMoveEnemy(record, dx, dz) {
      if (!dx && !dz) return false;
      const size = enemyDimensions(record);
      const centerX = number(record.x) + size.w / 2;
      const centerZ = number(record.z) + size.d / 2;
      const attempts = [
        [centerX + dx, centerZ + dz],
        [centerX + dx, centerZ],
        [centerX, centerZ + dz],
      ];
      for (const [nextX, nextZ] of attempts) {
        if (!enemyCanOccupy(record, nextX, nextZ)) continue;
        record.x = nextX - size.w / 2;
        record.z = nextZ - size.d / 2;
        return true;
      }
      return false;
    }

    function faceAngle(from, to) {
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      // Combat actors and their rifles point down local -Z. Mirror the camera
      // heading into that local basis so left/right aiming is not reversed.
      return 180 - Math.atan2(dx, dz) * 180 / Math.PI;
    }

    function crossingPortalTarget(from,to) {
      const bounds=options.getPlantBounds?.();
      if(!Array.isArray(bounds)||bounds.length<4)return null;
      const [left,front,right,back]=bounds.map(Number);
      const portals=options.getPortalWaypoints?.()||[];
      const south=portals.find(p=>p.id==="south");
      const east=portals.find(p=>p.id==="east");
      // Route across a real doorway instead of steering straight into solid walls.
      // A coordinate crossing is only a wall crossing when the segment actually
      // intersects that wall's finite span. Outside the building corners, both
      // actors can walk directly across the same line without using a door.
      if(south && ((from.z<front-.5&&to.z>front+.5)||(from.z>front+.5&&to.z<front-.5))) {
        const t=(front-from.z)/(to.z-from.z);
        const crossingX=from.x+(to.x-from.x)*t;
        if(crossingX>=left && crossingX<=right)
          return {x:south.x,z:front+(from.z<front ? 5 : -5)};
      }
      if(east && ((from.x>right+.5&&to.x<right-.5)||(from.x<right-.5&&to.x>right+.5))) {
        const t=(right-from.x)/(to.x-from.x);
        const crossingZ=from.z+(to.z-from.z)*t;
        if(crossingZ>=front && crossingZ<=back)
          return {x:right+(from.x>right ? -5 : 5),z:east.z};
      }
      return null; // North/west are open boundaries.
    }
    function updateEnemyMotion(enemy, playerTarget, now, deltaSeconds, lineOfSight) {
      if (enemy.health <= 0) {
        enemy.movementBlend = 0;
        return;
      }
      const center = enemyCenter(enemy);
      const dxToPlayer = playerTarget.x - center.x;
      const dzToPlayer = playerTarget.z - center.z;
      const distance = Math.max(.001, Math.hypot(dxToPlayer, dzToPlayer));
      const towardX = dxToPlayer / distance;
      const towardZ = dzToPlayer / distance;
      const strafeX = -towardZ * enemy.strafeSign;
      const strafeZ = towardX * enemy.strafeSign;
      let moveX = 0;
      let moveZ = 0;
      const loadout = ENEMY_WEAPONS[enemy.weaponKey] || ENEMY_WEAPONS.rifle;
      if (enemy.zombie) {
        const gait=ZOMBIE_GAITS[enemy.gaitClass]||ZOMBIE_GAITS.walker;
        enemy.gaitCycle=enemy.gaitCycle||gait.cycle;
        enemy.gaitStride=gait.stride;enemy.gaitSwing=gait.swing;enemy.gaitBob=gait.bob;enemy.gaitLean=gait.lean;
      }
      if (now < enemy.rollUntil) {
        const sideX = -towardZ * enemy.rollDirection;
        const sideZ = towardX * enemy.rollDirection;
        const rollStep = Math.min(1.05, 10.5 * deltaSeconds);
        tryMoveEnemy(enemy, sideX * rollStep, sideZ * rollStep);
        enemy.rotationY = faceAngle(enemyCenter(enemy), playerTarget);
        enemy.movementBlend = 1;
        enemy.walkPhase += deltaSeconds * 13;
        return;
      }
      let speed = 3.2 * enemy.speedBias * loadout.moveSpeed;
      let desiredRotation = enemy.rotationY;
      let aimLocked = false;

      if (lineOfSight) {
        enemy.lastSeenAt = now;
        enemy.lastKnownPlayerX = playerTarget.x;
        enemy.lastKnownPlayerZ = playerTarget.z;
        enemy.aimLockUntil = Math.max(enemy.aimLockUntil, now + 320);
        desiredRotation = faceAngle(center, playerTarget);
        aimLocked = true;
        if (loadout.melee) {
          if (distance > loadout.preferredMax) {
            // Chainsaw AI is intentionally a high-pressure melee threat. Its
            // weapon weighting now produces a true sprint instead of a slightly
            // faster version of the normal ranged advance.
            moveX = towardX; moveZ = towardZ; speed = 6.2 * enemy.speedBias * loadout.moveSpeed * number(enemy.modeSpeedMultiplier, 1);
          }
        } else if (distance > loadout.preferredMax) {
          moveX = towardX * .88 + strafeX * .22;
          moveZ = towardZ * .88 + strafeZ * .22;
          speed = 4.45 * enemy.speedBias * loadout.moveSpeed * number(enemy.modeSpeedMultiplier, 1);
        } else if (distance < loadout.preferredMin) {
          moveX = -towardX * .78 + strafeX * .48;
          moveZ = -towardZ * .78 + strafeZ * .48;
          speed = 3.9 * enemy.speedBias * loadout.moveSpeed * number(enemy.modeSpeedMultiplier, 1);
        } else {
          moveX = strafeX; moveZ = strafeZ; speed = 3.35 * enemy.speedBias * loadout.moveSpeed * number(enemy.modeSpeedMultiplier, 1);
        }
      } else if (now - enemy.lastSeenAt < 9000) {
        const remembered = { x: enemy.lastKnownPlayerX, z: enemy.lastKnownPlayerZ };
        const rememberedDx = remembered.x - center.x;
        const rememberedDz = remembered.z - center.z;
        const rememberedDistance = Math.max(.001, Math.hypot(rememberedDx, rememberedDz));
        desiredRotation = faceAngle(center, remembered);
        aimLocked = now < enemy.aimLockUntil;
        if (rememberedDistance > 4) {
          moveX = rememberedDx / rememberedDistance;
          moveZ = rememberedDz / rememberedDistance;
          speed = (loadout.melee ? 4.45 : 3.15) * enemy.speedBias * (loadout.melee ? loadout.moveSpeed : 1) * number(enemy.modeSpeedMultiplier, 1);
        }
      } else {
        if (now >= enemy.nextHeadingAt) {
          const size = enemyDimensions(enemy);
          const anchorCenterX = number(enemy.anchorX) + size.w / 2;
          const anchorCenterZ = number(enemy.anchorZ) + size.d / 2;
          const homeDistance = Math.hypot(center.x - anchorCenterX, center.z - anchorCenterZ);
          if (homeDistance > 42) {
            enemy.heading = Math.atan2(anchorCenterX - center.x, anchorCenterZ - center.z);
          } else {
            enemy.heading += (stableUnit(enemy.id + ":" + Math.floor(now / 2200)) - .5) * 1.35;
          }
          enemy.nextHeadingAt = now + 2100 + stableUnit(enemy.id + ":" + Math.floor(now / 3100)) * 2100;
        }
        moveX = Math.sin(enemy.heading);
        moveZ = Math.cos(enemy.heading);
        desiredRotation = 180 - enemy.heading * 180 / Math.PI;
        speed = 2.35 * enemy.speedBias * number(enemy.modeSpeedMultiplier, 1);
      }

      const isPursuing=(lineOfSight || now-enemy.lastSeenAt<9000) && distance>loadout.preferredMax
        && (moveX*towardX+moveZ*towardZ)>.23;
      if(isPursuing) {
        const portalGoal=crossingPortalTarget(center,playerTarget);
        const routeGoal=portalGoal||playerTarget;
        const waypoint=navigateEnemy(enemy,center,routeGoal,now);
        if(waypoint!==playerTarget || portalGoal) {
          const wx=waypoint.x-center.x,wz=waypoint.z-center.z,wl=Math.hypot(wx,wz)||1;
          moveX=wx/wl;moveZ=wz/wl;
          if(portalGoal && wl<1.3){
            const side=portalGoal.z===playerTarget.z?0:1;
            moveX=(playerTarget.x-center.x)/Math.max(1,Math.hypot(playerTarget.x-center.x,playerTarget.z-center.z));
            moveZ=(playerTarget.z-center.z)/Math.max(1,Math.hypot(playerTarget.x-center.x,playerTarget.z-center.z));
          }
        }
      } else {
        enemy.navRoute=null;enemy.navIndex=0;
      }
      // Zombies follow players up the exterior POI ladders rather than remaining
      // ground-bound whenever the player reaches a roof.
      const rooftops=Array.isArray(options.getLadderSites?.())?options.getLadderSites():[];
      const targetRoof=rooftops.find(site=>
        playerTarget.x>=site.x-1 && playerTarget.x<=site.x+site.w+1 &&
        playerTarget.z>=site.z-1 && playerTarget.z<=site.z+site.d+1 &&
        number(playerTarget.y)>site.h+2);
      const climbSite=targetRoof && number(enemy.elevation)<targetRoof.h+.6
        ? targetRoof : (enemy.climbSiteId ? rooftops.find(site=>site.id===enemy.climbSiteId) : null);
      if(climbSite && number(enemy.elevation)<climbSite.h+.6){
        enemy.climbing=true;
        enemy.climbSiteId=climbSite.id;
        const gap=Math.hypot(center.x-climbSite.ladderX,center.z-climbSite.ladderZ);
        if(gap>1.35){
          moveX=(climbSite.ladderX-center.x)/gap;
          moveZ=(climbSite.ladderZ-center.z)/gap;
        }else{
          moveX=0;moveZ=0;
          enemy.elevation=Math.min(climbSite.h+.6,number(enemy.elevation)+deltaSeconds*6);
          enemy.rotationY=faceAngle(center,playerTarget);
        }
      }else if(enemy.climbSiteId && number(enemy.elevation)>0){
        const site=rooftops.find(item=>item.id===enemy.climbSiteId);
        enemy.climbing=false;
        if(site && number(enemy.elevation)>=site.h){
          enemy.elevation=site.h+.6;
          // Stay on the rooftop while walking; don't path through the building.
          const gap=Math.hypot(center.x-playerTarget.x,center.z-playerTarget.z)||1;
          moveX=(playerTarget.x-center.x)/gap;moveZ=(playerTarget.z-center.z)/gap;
        }
      }else{
        enemy.climbing=false;
      }
      const length = Math.hypot(moveX, moveZ);
      const step = length > .001 ? Math.min(1.1, speed * deltaSeconds) : 0;
      const moved = step > 0 ? tryMoveEnemy(enemy, moveX / length * step, moveZ / length * step) : false;
      if (moved) enemy.navBlockedFrames=0;
      else if (isPursuing && step>0) enemy.navBlockedFrames=Math.min(30,(enemy.navBlockedFrames||0)+1);
      // Sliding against the side of a cage can technically count as movement,
      // yet make no progress toward the player. Treat that as stuck too.
      if(isPursuing) {
        const current=enemyCenter(enemy);
        const remaining=Math.hypot(current.x-playerTarget.x,current.z-playerTarget.z);
        if(!enemy.navProgressAt||remaining<number(enemy.navProgressDistance,Infinity)-1.0){
          enemy.navProgressAt=now;enemy.navProgressDistance=remaining;
        } else if(now-enemy.navProgressAt>1050){
          enemy.navExpires=0;
          enemy.navBlockedFrames=16;
          enemy.navDirectOpen=false;
          enemy.navLineCheckedAt=0;
          enemy.navProgressAt=now;
          enemy.navProgressDistance=remaining;
          enemy.strafeSign*=-1;
        }
      }else {
        enemy.navProgressAt=0;
        enemy.navProgressDistance=Infinity;
      }

      // When engaging, facing the player is authoritative even while strafing or blocked.
      // When wandering, only rotate after a successful move. This prevents blocked actors
      // from spinning in place while repeatedly choosing new headings.
      if (aimLocked || lineOfSight || now < enemy.aimLockUntil) {
        enemy.rotationY = desiredRotation;
      } else if (moved) {
        enemy.rotationY = desiredRotation;
      }

      if (!moved && step > 0 && now >= enemy.blockedUntil) {
        enemy.strafeSign *= -1;
        const turn = .55 + stableUnit(enemy.id + ":blocked:" + Math.floor(now / 650)) * .55;
        enemy.heading += enemy.strafeSign * turn;
        enemy.nextHeadingAt = now + 1100;
        enemy.blockedUntil = now + 720;
      }
      enemy.movementBlend += ((moved ? 1 : .08) - enemy.movementBlend) * Math.min(1, deltaSeconds * 8);
      enemy.walkPhase += deltaSeconds * (moved ? (enemy.zombie ? enemy.gaitCycle||5.1 : 8.5*enemy.speedBias) : .8);
    }

    function enemyRenderState(id, now = performance.now()) {
      const enemy = enemies.get(String(id || ""));
      if (!enemy) return null;
      const defeated = enemy.health <= 0;
      if (defeated && !enemy.defeatedAt) enemy.defeatedAt = now;
      if (defeated && !enemy.deathAnimationStartedAt) enemy.deathAnimationStartedAt = now;
      const deathProgress = defeated ? clamp((now - enemy.deathAnimationStartedAt) / 1120, 0, 1) : 0;
      const rollProgress = !defeated && enemy.rollStartedAt > 0 && now < enemy.rollUntil
        ? clamp((now-enemy.rollStartedAt)/Math.max(1,enemy.rollUntil-enemy.rollStartedAt),0,1)
        : 0;
      const hitReact = !defeated && now < enemy.hitReactUntil
        ? clamp((enemy.hitReactUntil - now) / 220, 0, 1)
        : 0;
      const shotProgress = !defeated && enemy.shotStartedAt > 0 && now < enemy.shotEndsAt
        ? clamp((now - enemy.shotStartedAt) / Math.max(1, enemy.shotEndsAt - enemy.shotStartedAt), 0, 1)
        : 0;
      const reloading = !defeated && enemy.reloadStartedAt > 0 && now < enemy.reloadUntil;
      const reloadProgress = reloading
        ? clamp((now - enemy.reloadStartedAt) / Math.max(1, enemy.reloadUntil - enemy.reloadStartedAt), 0, 1)
        : 0;
      return {
        id: enemy.id,
        x: enemy.x,
        z: enemy.z,
        rotationY: enemy.rotationY,
        movementBlend: defeated ? 0 : enemy.movementBlend,
        walkPhase: enemy.walkPhase,
        elevation: number(enemy.elevation),climbing:Boolean(enemy.climbing),
        gaitClass: enemy.gaitClass, gaitStride: enemy.gaitStride, gaitSwing: enemy.gaitSwing,
        gaitBob: enemy.gaitBob, gaitLean: enemy.gaitLean,
        firing: now < enemy.firingUntil,
        muzzleFlash: now < enemy.muzzleFlashUntil,
        recoil: now < enemy.recoilUntil,
        shotProgress,
        reloading,
        reloadProgress,
        ammoInMagazine: Math.max(0, Math.floor(number(enemy.ammoInMagazine, 0))),
        magazineSize: Math.max(0, Math.floor(number(ENEMY_WEAPONS[enemy.weaponKey]?.magazine, 0))),
        hitReact,
        defeated,
        deathProgress,
        deathDirection: enemy.deathDirection || 1,
        rollProgress,
        rollDirection: enemy.rollDirection || 1,
        tracerTarget: now < enemy.tracerUntil ? enemy.tracerTarget : null,
        tracerStyle: enemy.tracerStyle || enemy.weaponKey || "rifle",
        weaponKey: enemy.weaponKey || "rifle",
        zombie: Boolean(enemy.zombie),
        giant:Boolean(enemy.giant),
        weaponLabel: enemy.weaponLabel || ENEMY_WEAPONS[enemy.weaponKey]?.label || "Rifle",
        melee: Boolean(ENEMY_WEAPONS[enemy.weaponKey]?.melee),
        killerReveal: now < enemy.killerRevealUntil,
        killerName: now < enemy.killerRevealUntil ? String(enemy.machine?.name || "Enemy") : "",
        aiming: enemy.alerted || now < enemy.aimLockUntil,
        health: enemy.health,
      };
    }

    function setTransientStatus(text, duration = 850) {
      if (statusCopy) statusCopy.textContent = text;
      transientStatusUntil = performance.now() + duration;
    }

    function incomingDirectionName(relative) {
      const degrees = ((relative * 180 / Math.PI) + 360) % 360;
      if (degrees < 22.5 || degrees >= 337.5) return "FRONT";
      if (degrees < 67.5) return "FRONT-RIGHT";
      if (degrees < 112.5) return "RIGHT";
      if (degrees < 157.5) return "BACK-RIGHT";
      if (degrees < 202.5) return "BEHIND";
      if (degrees < 247.5) return "BACK-LEFT";
      if (degrees < 292.5) return "LEFT";
      return "FRONT-LEFT";
    }

    function showIncomingDirection(enemy, player, hit = false) {
      if (!damageDirections || !enemy || !player) return;
      const source = enemyCenter(enemy);
      const dx = source.x - number(player.x);
      const dz = source.z - number(player.z);
      const worldAngle = Math.atan2(dx, dz);
      // First-person rendering mirrors horizontal world X. Damage indicators must
      // use that same camera basis or left/right appear reversed on screen.
      let relative = number(player.yaw) - worldAngle;
      while (relative > Math.PI) relative -= Math.PI * 2;
      while (relative < -Math.PI) relative += Math.PI * 2;
      const indicator = document.createElement("span");
      indicator.className = "combat-damage-direction" + (hit ? " hit" : " near-miss");
      indicator.style.setProperty("--damage-angle", (relative * 180 / Math.PI).toFixed(2) + "deg");
      indicator.innerHTML = "<i></i><em></em>";
      damageDirections.appendChild(indicator);
      window.setTimeout(() => indicator.remove(), hit ? 1250 : 850);

      if (directionCallout) {
        const name = String(enemy?.machine?.name || "Enemy");
        const direction = incomingDirectionName(relative);
        const strong = directionCallout.querySelector("strong");
        const detail = directionCallout.querySelector("span");
        directionCallout.classList.toggle("hit", hit);
        directionCallout.classList.toggle("near-miss", !hit);
        if (strong) strong.textContent = (hit ? "HIT FROM " : "FIRE FROM ") + direction;
        if (detail) detail.textContent = name;
        directionCallout.hidden = false;
        if (directionCalloutTimer) window.clearTimeout(directionCalloutTimer);
        directionCalloutTimer = window.setTimeout(() => {
          directionCallout.hidden = true;
          directionCalloutTimer = 0;
        }, hit ? 1350 : 900);
      }
    }

    function playerRenderState(now = performance.now()) {
      const player = options.getPlayer?.() || {};
      const weapon = currentWeapon();
      const recoilRemaining = Math.max(0, playerRecoilUntil - now);
      const recoilProgress = recoilRemaining > 0 ? clamp(recoilRemaining / Math.max(1, weapon.fireInterval * .95), 0, 1) : 0;
      const reloadDuration = Math.max(1, reloadEndsAt - reloadStartedAt);
      const reloadProgress = reloading ? clamp((now - reloadStartedAt) / reloadDuration, 0, 1) : 0;
      const deathProgress = playerDeathStartedAt > 0
        ? clamp((now - playerDeathStartedAt) / Math.max(1, playerDeathDuration), 0, 1)
        : 0;
      return {
        weapon: selectedWeapon,
        firing: now < playerRecoilUntil,
        reviving:Boolean(reviveHold),
        reviveProgress:reviveHold?clamp((now-reviveHold.startedAt)/COOP_REVIVE_HOLD_MS,0,1):0,
        muzzleFlash: now < playerMuzzleUntil,
        recoilProgress,
        meleeSwingProgress:now<meleeSwingUntil?clamp((meleeSwingUntil-now)/330,0,1):0,
        reloading,
        reloadProgress,
        moving: Boolean(player.moving),
        sprinting: Boolean(player.sprinting),
        engaged: Boolean(player.engaged),
        aiming,
        scopeActive: aiming && !currentWeapon().melee,
        gameMode,
        defeated: roundState === "lost",
        deathProgress,
      };
    }

    function setAiming(next) {
      const allowed = active && !paused && roundState === "playing" &&
        !reloading && !currentWeapon().melee && !playerIsSprinting() && !reviveHold;
      aiming = Boolean(next && allowed);
      frame.classList.toggle("combat-aiming", aiming);
      if (scopeOverlay) scopeOverlay.hidden = !(aiming && !currentWeapon().melee);
      options.setAimZoom?.(aiming, selectedWeapon);
      options.invalidate?.();
    }

    function showHitmarker(defeated = false, headshot = false) {
      hitmarker?.classList.remove("visible", "defeated", "headshot");
      void hitmarker?.offsetWidth;
      hitmarker?.classList.add("visible");
      if (defeated) hitmarker?.classList.add("defeated");
      if (headshot) hitmarker?.classList.add("headshot");
      window.setTimeout(() => hitmarker?.classList.remove("visible", "defeated", "headshot"), 160);
    }

    function playerIsSprinting(){
      const player=options.getPlayer?.();
      return Boolean(player?.sprinting && player?.moving && roundState==="playing" && !paused);
    }

    function showDamage() {
      damageVignette?.classList.remove("visible");
      void damageVignette?.offsetWidth;
      damageVignette?.classList.add("visible");
      window.setTimeout(() => damageVignette?.classList.remove("visible"), 190);
    }

    function syncHud() {
      const weapon = currentWeapon();
      const ammo = currentAmmo();
      // Expire abandoned prizes even when the player walks away from the box.
      mysteryPhase();
      const all = [...enemies.values()];
      const alive = all.filter((enemy) => enemy.health > 0).length;
      if(pointsPanel)pointsPanel.hidden=gameMode!=="zombie";
      if(pointsValue)pointsValue.textContent=playerPoints.toLocaleString();
      if (healthValue) healthValue.textContent = String(Math.max(0, Math.ceil(playerHealth)));
      if (healthBar) healthBar.style.width = clamp(playerHealth, 0, 100) + "%";
      if (shieldValue) shieldValue.textContent = String(Math.max(0, Math.ceil(playerShield)));
      if (shieldBar) shieldBar.style.width = (clamp(playerShield, 0, SHIELD_MAX) / SHIELD_MAX * 100) + "%";
      const shieldDown=playerShield<=.01 && !playerZombie;
      const critical=playerHealth<=32;
      frame.classList.toggle("combat-shield-down",shieldDown && roundState==="playing");
      frame.classList.toggle("combat-health-critical",critical && roundState==="playing");
      frame.classList.toggle("combat-is-sprinting",playerIsSprinting());
      frame.dataset.weaponRarity=mysteryRarity(selectedWeapon);
      frame.classList.toggle("combat-is-reviving",Boolean(reviveHold));
      if(shieldWarning)shieldWarning.hidden=!shieldDown;
      if(vitalsStatus)vitalsStatus.textContent=playerZombie?"INFECTED · NO SHIELD"
        :shieldDown?"SHIELD OFFLINE — SEEK COVER"
        :critical?"CRITICAL HEALTH — FIND COVER"
        :playerShield<SHIELD_MAX*.4?"SHIELD LOW":"SHIELD ONLINE";
      const mode = modeConfig();
      const modeStamp = gameMode === "zombie" ? `zombie:${zombieDifficulty}:${zombieRunType}` : gameMode;
      if (modeBadge && modeBadge.dataset.mode !== modeStamp) {
        modeBadge.dataset.mode = modeStamp;
        modeBadge.innerHTML = '<span></span> ' + (gameMode === "zombie" ? `ZOMBIE · ${zombieDifficultyConfig().label.toUpperCase()} · ${zombieRunConfig().label.toUpperCase()}` : "OWNER COMBAT MODE");
      }
      if (highScoreCopy) {
        const nextHighScore = (gameMode === "zombie" ? (zombieEndless() ? "BEST SURVIVAL " : "BEST CLEAR ") : "BEST ") + formatTime(bestClearTime());
        if (highScoreCopy.textContent !== nextHighScore) highScoreCopy.textContent = nextHighScore;
      }
      if (enemyCounter) enemyCounter.textContent = gameMode === "zombie"
        ? `Zombies ${alive} alive · ${regularKills + headshotKills} kills`
        : mode.enemyLabel + " " + alive + " / " + all.length;
      if (slotCopy) {
        const slot=playerLoadout().indexOf(selectedWeapon);
        slotCopy.textContent=slot===0?"PRIMARY":slot===1?"SECONDARY":"THIRD WEAPON";
      }
      if (weaponCopy) weaponCopy.textContent = weapon.shortLabel.toUpperCase();
      if (magazineCopy) magazineCopy.textContent = weapon.noAmmo ? "MELEE" : String(ammo.magazine);
      if (reserveCopy) reserveCopy.textContent = weapon.noAmmo ? "" : String(ammo.reserve);
      frame.classList.toggle("combat-under-fire", lastThreatCount > 0);
      if (threatCopy) {
        threatCopy.textContent = all.length === 0
          ? "No person / team-member machines found"
          : lastThreatCount > 0
            ? String(lastThreatCount) + (lastThreatCount === 1 ? (gameMode === "zombie" ? " zombie is" : " enemy has") : (gameMode === "zombie" ? " zombies are" : " enemies have")) + (gameMode === "zombie" ? " charging" : " line of sight")
            : (gameMode === "zombie" ? "No zombies in striking range" : "No threats in sight");
      }
      if (statusCopy && !reloading && performance.now() >= transientStatusUntil)
        statusCopy.textContent = reviveHold?"HOLD E · REVIVING":playerIsSprinting()?"SPRINT · WEAPON LOWERED":"Ready";
      if (wavePanel) wavePanel.hidden=!zombieEndless();
      if (zombieEndless()) {
        const breakSeconds=waveNextAt?waveCountdownSeconds(performance.now(),waveNextAt):0;
        wavePanel?.classList.toggle("intermission",breakSeconds>0);
        if(waveHeading)waveHeading.textContent=breakSeconds ? `WAVE ${zombieWave} CLEARED` : `WAVE ${zombieWave || 1}${waveSpecial?" · SPECIAL":""}`;
        if(waveCount)waveCount.textContent=breakSeconds ? `NEXT IN ${breakSeconds}s` : `${waveDefeated} / ${waveTotal || "—"} KILLED`;
        if(waveBar)waveBar.style.width=breakSeconds?(clamp((ZOMBIE_WAVE_BREAK_MS-(waveNextAt-performance.now()))/ZOMBIE_WAVE_BREAK_MS,0,1)*100)+"%":(waveTotal?clamp(waveDefeated/waveTotal*100,0,100):0)+"%";
        if(waveNote)waveNote.textContent=breakSeconds ? `NEXT WAVE IN ${breakSeconds} SECONDS · RELOAD & PREPARE` : waveSpecial ? "GIANTS · DOUBLE REWARDS · HEALTH STATION" : "Zombies grow stronger every wave";
      }
      if (teamPanel) {
        teamPanel.hidden=gameMode!=="zombie" && matchType==="solo";
        if (!teamPanel.hidden) {
          const lobby=multiplayer?.getLobby?.();
          const players=lobby?.players?.length ? lobby.players : [{id:"solo",name:multiplayer?.storedName?.() || "You",state:{points:playerPoints,kills:regularKills+headshotKills,deaths:playerDeaths}}];
          const rows=players.map((entry)=>{
            const me=!lobby || entry.id===multiplayer?.playerId;
            const pts=me?playerPoints:Math.max(0,Math.floor(number(entry.state?.points)));
            const safeName=String(entry.name || "Player").replace(/[<>&"']/g,"");
            return `<div class="combat-team-player${me?" me":""}"><span>${safeName}${me?" (YOU)":""}</span><strong>${pts.toLocaleString()} PTS</strong></div>`;
          }).join("");
          const markup='<strong class="combat-team-heading">SURVIVORS · POINTS</strong>'+rows;
          if (teamPanel.innerHTML!==markup) teamPanel.innerHTML=markup;
        }
      }
      if (inventoryPanel) {
        const markup=playerLoadout().map((key,index)=>`<span class="${selectedWeapon===key?"active":""}"><b>${index+1}</b> ${WEAPONS[key]?.shortLabel || key}</span>`).join("");
        if (inventoryPanel.innerHTML!==markup) inventoryPanel.innerHTML=markup;
      }
      if (stationPrompt) {
        nearestStation=null;
        if (gameMode==="zombie" && roundState==="playing" && !playerZombie) {
          const player=options.getPlayer?.();
          if (player) {
            let nearestDistance=6;
            for (const [type,station] of [["mystery",mysteryBox],["health",healthStation]]) {
              if (!station || (type==="health" && lastHealthPurchaseWave===zombieWave)) continue;
              const distance=Math.hypot(number(player.x)-station.x,number(player.z)-station.z);
              if (distance<=nearestDistance) {nearestDistance=distance;nearestStation=type;}
            }
          }
        }
        stationPrompt.hidden=!nearestStation;
        const offerState = nearestStation === "mystery" ? mysteryPhase() : "idle";
        stationPrompt.classList.toggle("mystery-rolling",offerState==="rolling" || offerState==="rising");
        stationPrompt.classList.toggle("mystery-ready",offerState==="ready");
        stationPrompt.classList.toggle("mystery-returning",offerState==="lowering");
        if (nearestStation) {
          const health=nearestStation==="health",cost=health?HEALTH_STATION_COST:MYSTERY_BOX_COST;
          if (!health) {
            const offer = mysteryPresentation();
            if (!offer) {
              if (stationLabel) stationLabel.textContent=`MYSTERY BOX · ${cost} PTS · BALANCE ${playerPoints.toLocaleString()}`;
              if (stationBuyButton) {stationBuyButton.textContent="ROLL [E]";stationBuyButton.disabled=playerPoints<cost;}
            } else if (offer.phase==="rolling") {
              if (stationLabel) stationLabel.textContent=`ROLLING · ${offer.weaponName.toUpperCase()} · SLOWING DOWN...`;
              if (stationBuyButton) {stationBuyButton.textContent="SPINNING";stationBuyButton.disabled=true;}
            } else if (offer.phase==="rising") {
              if (stationLabel) stationLabel.textContent=`${offer.finalWeaponName.toUpperCase()} · RISING OUT OF BOX`;
              if (stationBuyButton) {stationBuyButton.textContent="RISING...";stationBuyButton.disabled=true;}
            } else if (offer.phase==="teddy") {
              if (stationLabel) stationLabel.textContent="TEDDY BEAR! THE MYSTERY BOX IS MOVING · NO WEAPON";
              if (stationBuyButton) {stationBuyButton.textContent="TEDDY!";stationBuyButton.disabled=true;}
            } else if (offer.phase==="ready") {
              if (stationLabel) stationLabel.textContent=`${offer.finalRarity.toUpperCase()} · TAKE ${offer.finalWeaponName.toUpperCase()} · ${offer.remainingSeconds}S LEFT`;
              if (stationBuyButton) {stationBuyButton.textContent="TAKE [E]";stationBuyButton.disabled=false;}
            } else {
              if (stationLabel) stationLabel.textContent="UNCLAIMED WEAPON RETURNING TO BOX";
              if (stationBuyButton) {stationBuyButton.textContent="RETURNING";stationBuyButton.disabled=true;}
            }
          } else {
            if (stationLabel) stationLabel.textContent=`FULL HEALTH · ${cost} PTS · YOU HAVE ${playerPoints.toLocaleString()}`;
            if (stationBuyButton) {stationBuyButton.textContent="BUY [E]";stationBuyButton.disabled=playerPoints<cost || playerHealth>=100;}
          }
        }
      }
    }

    function updatePlayerShield(now) {
      const previous = lastShieldUpdateAt || now;
      const deltaSeconds = clamp((now - previous) / 1000, 0, .12);
      lastShieldUpdateAt = now;
      if (!active || paused || roundState !== "playing" || playerShield >= SHIELD_MAX) return;
      if (now - lastDamageAt < SHIELD_RECHARGE_DELAY_MS) return;
      const previousShield = playerShield;
      playerShield = Math.min(SHIELD_MAX, playerShield + SHIELD_RECHARGE_PER_SECOND * deltaSeconds);
      if (playerShield !== previousShield) syncHud();
    }

    function shiftPauseTimers(duration) {
      if (!(duration > 0)) return;
      if (roundState === "countdown" && countdownEndsAt) countdownEndsAt += duration;
      if (nextPlayerShotAt) nextPlayerShotAt += duration;
      if (reloadStartedAt) reloadStartedAt += duration;
      if (reloadEndsAt) reloadEndsAt += duration;
      if (mysteryOffer) {
        for (const field of ["startedAt","rollEndsAt","riseEndsAt","lowerStartsAt","despawnAt"]) mysteryOffer[field] += duration;
      }
      enemies.forEach((enemy) => {
        for (const key of ["nextHeadingAt","nextShotAt","firingUntil","muzzleFlashUntil","recoilUntil","shotStartedAt","shotEndsAt","reloadStartedAt","reloadUntil","hitReactUntil","tracerUntil","aimLockUntil","blockedUntil"]) {
          if (enemy[key]) enemy[key] += duration;
        }
      });
    }

    function setPaused(next, { capture = true } = {}) {
      if (!active || ["lost","won"].includes(roundState)) return false;
      const requested = Boolean(next);
      if (requested === paused) return true;
      if (requested) {
        paused = true;
        pausedAt = performance.now();
        mouseHeld = false;
        setAiming(false);
        frame.classList.add("combat-paused");
        cancelReviveHold();
        if (pauseOverlay) {
          pauseOverlay.hidden=false;
          const mode=pauseOverlay.querySelector("[data-combat-pause-mode]");
          const subtitle=pauseOverlay.querySelector("[data-combat-pause-subtitle]");
          const health=pauseOverlay.querySelector("[data-combat-pause-health]");
          const hostiles=pauseOverlay.querySelector("[data-combat-pause-hostiles]");
          const elapsed=pauseOverlay.querySelector("[data-combat-pause-elapsed]");
          if(mode)mode.textContent=gameMode==="zombie"?"ZOMBIE SURVIVAL • "+String(zombieRunType).toUpperCase():"PLANT COMBAT • "+String(matchType).toUpperCase();
          if(subtitle)subtitle.textContent=playerZombie?"INFECTED • HUNT THE LIVING":gameMode==="zombie"?"Survive together. Hold E to rescue a downed teammate.":"Review your loadout, objectives, and surroundings.";
          if(health)health.textContent=Math.round(playerHealth)+"";
          if(hostiles)hostiles.textContent=String(aliveEnemies().length);
          if(elapsed)elapsed.textContent=formatTime(Math.max(0,Math.floor((pausedAt-(roundStartedAt||pausedAt))/1000)));
        }
        options.hideWalkMenu?.();
        options.setMovementLocked?.(true);
        options.releasePointer?.();
        window.requestAnimationFrame(() => pauseOverlay?.querySelector("button")?.focus());
      } else {
        const duration = Math.max(0, performance.now() - pausedAt);
        shiftPauseTimers(duration);
        paused = false;
        pausedAt = 0;
        frame.classList.remove("combat-paused");
        if (pauseOverlay) pauseOverlay.hidden = true;
      if (matchSetup) matchSetup.hidden = true;
        options.setMovementLocked?.(false);
        if (capture) window.requestAnimationFrame(() => options.capture?.());
      }
      options.invalidate?.();
      return true;
    }

    function handleEscape(reason = "escape-key") {
      if (!active) return false;
      options.hideWalkMenu?.();
      if (["lost","won","respawning","respawn-choice"].includes(roundState)) return true;
      if (paused && reason === "pointer-lock-released") return true;
      return setPaused(!paused);
    }

    function canRespawnAfterDeath() {
      return matchType !== "private" && (gameMode === "combat" || (gameMode === "zombie" && zombieRunType === "normal"));
    }
    function nearestDownedAlly(){
      if(matchType!=="coop" || !multiplayer?.getLobby?.() || roundState!=="playing")return null;
      const local=options.getPlayer?.();
      if(!local)return null;
      let nearest=null,best=COOP_REVIVE_RADIUS;
      for(const ally of multiplayer.remotePlayers?.()||[]){
        const state=ally.state||{};
        if(state.alive!==false || number(state.downedUntil,0)<=Date.now())continue;
        const distance=Math.hypot(number(local.x)-number(state.x),number(local.z)-number(state.z));
        if(distance<best){best=distance;nearest={ally,distance,seconds:Math.ceil((state.downedUntil-Date.now())/1000)};}
      }
      return nearest;
    }
    function updateRevivePrompt(now=performance.now()){
      if(now-lastRevivePromptAt<100)return;
      lastRevivePromptAt=now;
      const target=nearestDownedAlly();
      if(!target || (reviveHold && reviveHold.targetId!==target.ally.id))reviveHold=null;
      revivePrompt.hidden=!target;
      if(!target)return;
      const held=reviveHold?.targetId===target.ally.id;
      if(held && playerIsSprinting())cancelReviveHold();
      const fraction=held?clamp((now-reviveHold.startedAt)/COOP_REVIVE_HOLD_MS,0,1):0;
      revivePrompt.style.setProperty("--revive-progress",String(fraction));
      revivePrompt.textContent=held
        ? `REVIVING ${target.ally.name||"TEAMMATE"} · ${Math.ceil((1-fraction)*COOP_REVIVE_HOLD_MS/1000)}s · ${target.seconds}s LEFT`
        : `HOLD [E] FOR ${Math.ceil(COOP_REVIVE_HOLD_MS/1000)}s TO REVIVE ${target.ally.name||"TEAMMATE"} · ${target.seconds}s LEFT`;
      if(held && fraction>=1 && !reviveHold.sent){
        reviveHold.sent=true;
        // Server validates both the start event and continuous elapsed time.
        multiplayer.sendEvent("revive-player",{},target.ally.id)
          .then(()=>setTransientStatus("REVIVE COMPLETE",1100))
          .catch(()=>{reviveHold=null;setTransientStatus("Revive interrupted - try again",1100);});
      }
    }
    function beginReviveHold(){
      const target=nearestDownedAlly();
      if(!target||reviveHold)return false;
      if(playerIsSprinting())return false;
      reviveHold={targetId:target.ally.id,startedAt:performance.now(),sent:false};
      lastReviveAnimationAt=performance.now();
      setAiming(false);mouseHeld=false;
      playCombatSound("revive-start");
      multiplayer.sendEvent("revive-begin",{},target.ally.id)
        .catch(()=>{reviveHold=null;setTransientStatus("Revive unavailable",1200);});
      updateRevivePrompt(performance.now()+101);
      return true;
    }
    function cancelReviveHold(){reviveHold=null;revivePrompt.style.setProperty("--revive-progress","0%");}

    function localRoundStats() {
      return { kills:regularKills+headshotKills, headshots:headshotKills, deaths:playerDeaths, points:playerPoints };
    }

    function rememberRemoteRoundStats(playerId, stats = {}) {
      const id=String(playerId || "");
      if (!id) return;
      const previous=roundStatOverrides.get(id) || {kills:0,headshots:0,deaths:0};
      roundStatOverrides.set(id,{
        kills:Math.max(previous.kills,Math.max(0,Math.floor(number(stats.kills)))),
        headshots:Math.max(previous.headshots,Math.max(0,Math.floor(number(stats.headshots)))),
        deaths:Math.max(previous.deaths,Math.max(0,Math.floor(number(stats.deaths)))),
      });
    }

    function roundLeaderboard() {
      if (matchType === "solo" || !multiplayer?.getLobby?.()) return [];
      const lobby=multiplayer.getLobby();
      const localId=String(multiplayer.playerId || "");
      return (lobby?.players || []).map((entry) => {
        const state=entry.state || {};
        const override=entry.id===localId ? localRoundStats() : roundStatOverrides.get(String(entry.id || ""));
        const stats=override || state;
        return {
          id:String(entry.id || ""),
          name:String(entry.name || "Player"),
          character:String(characterNameForId(entry.characterId) || "Plant character"),
          kills:Math.max(0,Math.floor(number(stats.kills))),
          headshots:Math.max(0,Math.floor(number(stats.headshots))),
          deaths:Math.max(0,Math.floor(number(stats.deaths))),
          points:entry.id===localId ? playerPoints : Math.max(0,Math.floor(number(state.points))),
        };
      }).sort((a,b) => b.kills-a.kills || a.deaths-b.deaths || a.name.localeCompare(b.name));
    }

    function renderRoundLeaderboard(entries = roundLeaderboard()) {
      if (!scoreboard) return entries;
      scoreboard.innerHTML="";
      scoreboard.hidden=!Array.isArray(entries) || entries.length < 2;
      if (scoreboard.hidden) return entries;
      const mostKills=Math.max(...entries.map((entry)=>number(entry.kills)));
      const mostDeaths=Math.max(...entries.map((entry)=>number(entry.deaths)));
      const title=document.createElement("div");
      title.className="combat-scoreboard-heading";
      title.innerHTML='<strong>TEAM LEADERBOARD</strong><span>KILLS · DEATHS · HEADSHOTS</span>';
      scoreboard.appendChild(title);
      entries.forEach((entry,index) => {
        const row=document.createElement("div");
        row.className="combat-scoreboard-row";
        const rank=document.createElement("b"); rank.textContent=String(index+1);
        const identity=document.createElement("div");
        const playerName=document.createElement("strong"); playerName.textContent=entry.name;
        const character=document.createElement("small"); character.textContent=entry.character;
        identity.append(playerName,character);
        const kills=document.createElement("span"); kills.innerHTML=`<small>K</small><strong>${entry.kills}</strong>`;
        const deaths=document.createElement("span"); deaths.innerHTML=`<small>D</small><strong>${entry.deaths}</strong>`;
        const headshots=document.createElement("span"); headshots.innerHTML=`<small>HS</small><strong>${entry.headshots}</strong>`;
        const badges=document.createElement("em");
        const labels=[];
        if (gameMode==="zombie") labels.push(`${entry.points.toLocaleString()} PTS`);
        if (entry.kills===mostKills) labels.push("KILL LEADER");
        if (mostDeaths>0 && entry.deaths===mostDeaths) labels.push("MOST DEATHS");
        badges.textContent=labels.join(" · ");
        row.append(rank,identity,kills,deaths,headshots,badges);
        scoreboard.appendChild(row);
      });
      return entries;
    }

    function recordPlayerDeath() {
      playerDeaths += 1;
      const stats=localRoundStats();
      if (matchType === "coop" && multiplayer?.getLobby?.()) {
        multiplayer.sendEvent?.("player-death",stats,"").catch(()=>{});
      }
      return stats;
    }

    function beginPlayerRespawn(killer, player) {
      const now=performance.now();
      const source=killer?enemyCenter(killer):null;
      const killerLabel=String(killer?.machine?.name || "Zombie");
      const distance=source&&player ? Math.hypot(source.x-number(player.x),source.z-number(player.z)) : 0;
      roundState="respawning";
      reviveUntil=matchType==="coop"&&multiplayer?.getLobby?.()
        ? Date.now()+COOP_REVIVE_WINDOW_MS : 0;
      respawnEndsAt=now+RESPAWN_DELAY_MS;
      playerDeathStartedAt=now;
      playerDeathDuration=RESPAWN_DELAY_MS;
      paused=false;pausedAt=0;mouseHeld=false;
      setAiming(false);
      frame.classList.remove("combat-paused");
      frame.classList.add("combat-death-cinematic","combat-player-dead");
      if (pauseOverlay) pauseOverlay.hidden=true;
      if (countdownOverlay) countdownOverlay.hidden=true;
      if (roundOverlay) {roundOverlay.hidden=true;roundOverlay.classList.remove("victory","killer-reveal");}
      if (killerReveal) killerReveal.hidden=false;
      if (killerName) killerName.textContent=killerLabel;
      if (killerDetail) killerDetail.textContent=(distance ? Math.round(distance)+" ft away · " : "")+(killer?.weaponLabel || "Melee");
      if (roundKicker) roundKicker.textContent="PLAYER DOWN";
      if (roundTitle) roundTitle.textContent="Killed by "+killerLabel;
      if (roundCopy) roundCopy.textContent="Death replay complete. Choose Respawn to return with full health, or Exit Combat.";
      if (deathCountCopy) deathCountCopy.textContent=String(playerDeaths);
      if (regularKillsCopy) regularKillsCopy.textContent=String(regularKills);
      if (headshotKillsCopy) headshotKillsCopy.textContent=String(headshotKills);
      options.hideWalkMenu?.();
      options.setMovementLocked?.(true);
      options.releasePointer?.();
      if (killer) killer.killerRevealUntil=now+RESPAWN_DELAY_MS+700;
      options.playDeathCinematic?.({target:source,killerId:killer?.id||null,killerName:killerLabel,durationMs:playerDeathDuration});
      setTransientStatus("DOWNED · WATCHING DEATH REPLAY",1400);
      multiplayer?.heartbeat?.();
      options.invalidate?.();
    }

    function updatePlayerRespawn(now) {
      if(roundState!=="respawning" && roundState!=="respawn-choice")return false;
      const waiting=reviveUntil>Date.now();
      if(roundState==="respawning" && now<respawnEndsAt)return true;
      if(roundState==="respawning"){
        respawnEndsAt=0;
        roundState="respawn-choice";
        if(roundOverlay){roundOverlay.hidden=false;roundOverlay.classList.remove("victory","killer-reveal");}
        if(killerReveal)killerReveal.hidden=false;
        roundActions?.classList.remove("locked");
        options.releasePointer?.();
      }
      if(waiting){
        if(roundCopy)roundCopy.textContent="Teammate can revive you · "+Math.ceil((reviveUntil-Date.now())/1000)+" seconds remaining.";
        syncRestartButton();
        return true;
      }
      if(reviveUntil){
        reviveUntil=0;
        if(gameMode==="zombie" && matchType==="coop" && multiplayer?.getLobby?.()){
          becomePlayerZombie();
          return false;
        }
        if(!canRespawnAfterDeath()){
          finishRound("lost");
          return true;
        }
        if(roundCopy)roundCopy.textContent="Revive window expired. Select Respawn to return to the fight.";
      }
      syncRestartButton();
      return true;
    }

    function becomePlayerZombie(){
      if(!active || gameMode!=="zombie" || matchType!=="coop")return false;
      roundRevealSerial++;
      playerZombie=true;reviveUntil=0;respawnEndsAt=0;respawnDisplay=0;
      playCombatSound("zombie-turn",1);
      playerHealth=165;playerShield=0;selectedWeapon="chainsaw";
      playerDeathStartedAt=0;roundState="playing";
      frame.classList.remove("combat-death-cinematic","combat-player-dead");
      if(roundOverlay)roundOverlay.hidden=true;
      if(killerReveal)killerReveal.hidden=true;
      options.resetDeathCinematic?.();
      options.setMovementLocked?.(false);
      setTransientStatus("YOU TURNED · HUNT THE SURVIVING PLAYERS",4000);
      syncHud();multiplayer?.heartbeat?.();
      window.requestAnimationFrame(()=>options.capture?.());
      options.invalidate?.();
      return true;
    }

    function resumePlayerAfterDeath(revived=false) {
      if (!active || !["respawn-choice","respawning"].includes(roundState)) return false;
      if(!revived && (roundState==="respawning" || reviveUntil>Date.now()))return false;
      roundRevealSerial++;
      respawnEndsAt=0;respawnDisplay=0;reviveUntil=0;playerZombie=false;
      playerHealth=revived?75:100;playerShield=revived?0:SHIELD_MAX;
      lastDamageAt=performance.now();lastShieldUpdateAt=lastDamageAt;
      playerDeathStartedAt=0;roundState="playing";
      frame.classList.remove("combat-death-cinematic","combat-player-dead");
      if (roundOverlay) roundOverlay.hidden=true;
      if (killerReveal) killerReveal.hidden=true;
      options.resetDeathCinematic?.();
      options.setMovementLocked?.(false);
      setTransientStatus(revived?"REVIVED BY TEAMMATE":"RESPAWNED · BACK IN THE FIGHT",1200);
      playCombatSound(revived?"revive":"pickup",.85);
      syncHud();
      multiplayer?.heartbeat?.();
      window.requestAnimationFrame(()=>options.capture?.());
      options.invalidate?.();
      return true;
    }

    function scheduleVictory() {
      if (victoryTimer || !active) return;
      // Give the final defeated person enough rendered time to visibly hit the floor
      // before the celebratory overlay covers the scene.
      victoryTimer = window.setTimeout(() => {
        victoryTimer = 0;
        if (!active || aliveEnemies().length > 0 || !enemies.size) return;
        finishRound("won");
      }, 1325);
    }

    function finishRound(kind, killer = null, player = null, leaderboardOverride = null) {
      const endedAt = performance.now();
      roundState = kind;
      if(kind==="won")playMusicStinger("victory");
      else playMusicStinger("death");
      respawnEndsAt = 0;
      respawnDisplay = 0;
      paused = false;
      setAiming(false);
      pausedAt = 0;
      mouseHeld = false;
      lastThreatCount = 0;
      frame.classList.remove("combat-paused");
      if (pauseOverlay) pauseOverlay.hidden = true;
      options.hideWalkMenu?.();
      options.setMovementLocked?.(true);
      syncHud();
      if (!roundOverlay) return;
      roundOverlay.classList.toggle("victory", kind === "won");
      const revealSerial = ++roundRevealSerial;
      if (kind === "won") {
        playerDeathStartedAt = 0;
        frame.classList.remove("combat-death-cinematic");
        options.resetDeathCinematic?.();
        if (countdownLabel) countdownLabel.textContent="COMBAT STARTS IN";
        if (countdownOverlay) countdownOverlay.hidden=true;
        roundOverlay.hidden = false;
        roundOverlay.classList.remove("killer-reveal");
        options.releasePointer?.();
        roundActions?.classList.remove("locked");
        syncRestartButton();
        if (killerReveal) killerReveal.hidden = true;
        const clearSeconds = Math.max(0, Math.round((endedAt - (roundStartedAt || endedAt)) / 1000));
        const bestSeconds = recordRoundTime(clearSeconds);
        if (timeLabel) timeLabel.textContent = "CLEAR TIME";
        if (victoryTime) victoryTime.textContent = formatTime(clearSeconds);
        if (bestTime) bestTime.textContent = formatTime(bestSeconds);
        if (regularKillsCopy) regularKillsCopy.textContent = String(regularKills);
        if (headshotKillsCopy) headshotKillsCopy.textContent = String(headshotKills);
        if (victoryHealth) victoryHealth.textContent = String(Math.round(playerHealth));
        if (victoryShield) victoryShield.textContent = String(Math.round(playerShield));
        if (deathCountCopy) deathCountCopy.textContent = String(playerDeaths);
        const leaderboard=renderRoundLeaderboard(Array.isArray(leaderboardOverride) ? leaderboardOverride : roundLeaderboard());
        if (matchType === "coop" && multiplayer?.isHost?.() && !leaderboardOverride) multiplayer.sendEvent?.("coop-victory",{leaderboard},"").catch(()=>{});
        if (roundKicker) roundKicker.textContent = gameMode === "zombie" ? "ZOMBIE PLANT CLEARED" : "VICTORY";
        if (roundTitle) roundTitle.textContent = gameMode === "zombie" ? "FLOOR RECLAIMED" : "PLANT SECURED";
        if (roundCopy) roundCopy.textContent = gameMode === "zombie" ? `${zombieDifficultyConfig().label} clear complete. Every zombie in the plant is down.` : "All hostiles neutralized. The production floor is secure.";
      } else {
        const source = killer ? enemyCenter(killer) : null;
        const killerLabel = String(killer?.machine?.name || "Enemy");
        const distance = source && player
          ? Math.hypot(source.x - number(player.x), source.z - number(player.z))
          : 0;
        playerDeathStartedAt = performance.now();
        playerDeathDuration = 5000;
        frame.classList.add("combat-death-cinematic", "combat-player-dead");
        if (killer) killer.killerRevealUntil = playerDeathStartedAt + 6500;
        if (killerReveal) killerReveal.hidden = false;
        if (killerName) killerName.textContent = killerLabel;
        if (killerDetail) {
          const weaponLabel = killer?.weaponLabel || ENEMY_WEAPONS[killer?.weaponKey]?.label || "Weapon";
          killerDetail.textContent = (distance > 0 ? Math.round(distance) + " ft away" : "Last attacker") + " - " + weaponLabel;
        }
        if (roundKicker) roundKicker.textContent = "PLAYER DOWN";
        if (roundTitle) roundTitle.textContent = "Killed by " + killerLabel;
        const deathWeaponLabel = killer?.weaponLabel || WEAPONS[killer?.weaponKey]?.shortLabel || ENEMY_WEAPONS[killer?.weaponKey]?.label || "Weapon";
        if (roundCopy) roundCopy.textContent = `Killed with ${deathWeaponLabel}. Death replay complete. Restart when ready.`;
        const survivalSeconds = Math.max(0, Math.round((endedAt - (roundStartedAt || endedAt)) / 1000));
        const bestSurvival = zombieEndless() ? recordRoundTime(survivalSeconds) : bestClearTime();
        if (timeLabel) timeLabel.textContent = "SURVIVAL TIME";
        if (victoryTime) victoryTime.textContent = formatTime(survivalSeconds);
        if (bestTime) bestTime.textContent = formatTime(bestSurvival);
        if (regularKillsCopy) regularKillsCopy.textContent = String(regularKills);
        if (headshotKillsCopy) headshotKillsCopy.textContent = String(headshotKills);
        if (victoryHealth) victoryHealth.textContent = String(Math.round(playerHealth));
        if (victoryShield) victoryShield.textContent = String(Math.round(playerShield));
        if (deathCountCopy) deathCountCopy.textContent = String(playerDeaths);
        renderRoundLeaderboard();
        syncRestartButton();
        roundActions?.classList.remove("locked");
        roundOverlay.hidden = true;
        roundOverlay.classList.add("killer-reveal");
        window.setTimeout(() => {
          options.hideWalkMenu?.();
          options.releasePointer?.();
        }, 35);
        options.playDeathCinematic?.({
          target: source,
          killerId: killer?.id || null,
          killerName: killerLabel,
          durationMs: playerDeathDuration,
        });
        window.setTimeout(() => {
          if (!active || revealSerial !== roundRevealSerial || roundState !== "lost") return;
          roundOverlay.hidden = false;
          options.invalidate?.();
        }, playerDeathDuration);
      }
      options.onRoundEnd?.(kind, killer?.id || null);
      options.invalidate?.();
    }

    function switchWeapon(next) {
      if (!WEAPONS[next] || !playerLoadout().includes(next) || selectedWeapon === next || !active || roundState !== "playing") return;
      reloadSerial += 1;
      reloading = false;
      reloadStartedAt = 0;
      reloadEndsAt = 0;
      selectedWeapon = next;
      mouseHeld = false;
      setAiming(false);
      nextPlayerShotAt = performance.now() + 120;
      setTransientStatus("Equipped " + (WEAPONS[next]?.shortLabel || "weapon"),650);
      syncHud();
    }

    function startReload() {
      if (!active || reloading || roundState !== "playing" ||
          reviveHold || (playerIsSprinting() && !currentWeapon().melee)) return;
      const weapon = currentWeapon();
      const ammo = currentAmmo();
      if (weapon.noAmmo) return;
      if (ammo.magazine >= weapon.magazine || ammo.reserve <= 0) {
        setTransientStatus(ammo.reserve <= 0 ? "No reserve ammo" : "Magazine full");
        return;
      }
      reloading = true;
      mouseHeld = false;
      setAiming(false);
      playCombatSound("reload",.8);
      reloadStartedAt = performance.now();
      reloadEndsAt = reloadStartedAt + weapon.reloadMs;
      const serial = ++reloadSerial;
      if (statusCopy) statusCopy.textContent = "Reloading...";
      syncHud();
      window.setTimeout(() => {
        if (!active || serial !== reloadSerial) return;
        const missing = weapon.magazine - ammo.magazine;
        const loaded = Math.min(missing, ammo.reserve);
        ammo.magazine += loaded;
        ammo.reserve -= loaded;
        reloading = false;
        reloadStartedAt = 0;
        reloadEndsAt = 0;
        setTransientStatus("Reloaded", 600);
        playCombatSound("reload-end",.85);
        syncHud();
      }, weapon.reloadMs);
    }

    function shotDirection(baseDirection, yaw, pitch, spread = 0) {
      if (!(spread > 0)) return baseDirection;
      const right = { x: -Math.cos(yaw), y: 0, z: Math.sin(yaw) };
      const up = normalizeDirection({
        x: -Math.sin(yaw) * Math.sin(pitch),
        y: Math.cos(pitch),
        z: -Math.cos(yaw) * Math.sin(pitch),
      });
      const horizontal = (Math.random() - .5) * spread * 2;
      const vertical = (Math.random() - .5) * spread * 2;
      return normalizeDirection({
        x: baseDirection.x + right.x * horizontal + up.x * vertical,
        y: baseDirection.y + right.y * horizontal + up.y * vertical,
        z: baseDirection.z + right.z * horizontal + up.z * vertical,
      });
    }

    function applyPlayerHit(target, direction, origin, damage, now) {
      if (!target) return { defeated: false, headshot: false, point: null };
      const headshot = target.zone === "head";
      const finalPoint = pointAlongRay(origin, direction, target.distance);
      const appliedDamage = damage * (headshot ? HEADSHOT_DAMAGE_MULTIPLIER : 1);
      const wasAlive = target.enemy.health > 0;
      target.enemy.health = Math.max(0, target.enemy.health - appliedDamage);
      target.enemy.hitReactUntil = now + 220;
      const defeated = wasAlive && target.enemy.health <= 0;
      if (defeated) {
        markEnemyDefeated(target.enemy, now, direction);
        if (!creditedKillIds.has(target.enemy.id)) {
          creditedKillIds.add(target.enemy.id);
          if (headshot) headshotKills += 1;
          else regularKills += 1;
          if (gameMode==="zombie") {
            const earned=(headshot?150:100)*(target.enemy.giant?5:1)*(waveSpecial?2:1);
            playerPoints+=earned;
            setTransientStatus(`+${earned} POINTS · ${headshot?"HEADSHOT":"KILL"}`,900);
          }
        }
      } else if (target.enemy.health > 0) {
        triggerCombatRoll(target.enemy, now, headshot ? .18 : .46);
      }
      pushBloodBurst(target.enemy, finalPoint, now, defeated);
      if (matchType === "coop" && multiplayer?.getLobby?.()) {
        multiplayer.sendEvent?.("enemy-hit",{enemyId:target.enemy.id,damage:appliedDamage,headshot,defeated,kills:regularKills+headshotKills,headshots:headshotKills,deaths:playerDeaths},"").catch(()=>{});
      }
      return { defeated, headshot, point: finalPoint };
    }

    function playerMuzzleOrigin(origin, direction, yaw, pitch, weapon, isAiming) {
      const right = { x: -Math.cos(yaw), y: 0, z: Math.sin(yaw) };
      const up = normalizeDirection({
        x: -Math.sin(yaw) * Math.sin(pitch),
        y: Math.cos(pitch),
        z: -Math.cos(yaw) * Math.sin(pitch),
      });
      const ads = Boolean(!weapon?.melee && isAiming);
      let forwardOffset = weapon?.key === "chainsaw" ? 1.05 : weapon?.key === "rocket" ? 1.22 : weapon?.key === "sniper" ? 1.72 : weapon?.key === "shotgun" ? 1.46 : weapon?.key === "handgun" ? .94 : (ads ? 1.66 : 1.34);
      let rightOffset = weapon?.key === "chainsaw" ? .2 : weapon?.key === "rocket" ? .3 : weapon?.key === "sniper" ? (ads ? .03 : .36) : weapon?.key === "shotgun" ? .18 : weapon?.key === "handgun" ? .28 : (ads ? .06 : .42);
      let upOffset = weapon?.key === "chainsaw" ? -.34 : weapon?.key === "rocket" ? -.22 : weapon?.key === "sniper" ? (ads ? -.11 : -.28) : weapon?.key === "shotgun" ? -.20 : weapon?.key === "handgun" ? -.24 : (ads ? -.13 : -.30);
      // Shared designer muzzle anchors shift hip-fire and ADS shot emergence.
      const custom=options.getWeaponMuzzleAnchor?.(weapon?.key,ads);
      if(custom && Number.isFinite(Number(custom.x))) {
        forwardOffset+=clamp((Number(custom.x)-Number(custom.length||3.9))*.23,-.38,.38);
        rightOffset+=clamp((Number(custom.z)-Number(custom.depth||1.25)*.5)*.27,-.21,.21);
        upOffset+=clamp((Number(custom.y)-.87)*.26,-.22,.22);
      }
      return {
        x: origin.x + direction.x * forwardOffset + right.x * rightOffset + up.x * upOffset,
        y: origin.y + direction.y * forwardOffset + right.y * rightOffset + up.y * upOffset,
        z: origin.z + direction.z * forwardOffset + right.z * rightOffset + up.z * upOffset,
      };
    }

    function meleeAttack(){
      if(!active||paused||roundState!=="playing")return false;
      const now=performance.now();
      if(now<nextMeleeAt)return false;
      const player=options.getPlayer?.();
      if(!player?.engaged)return false;
      nextMeleeAt=now+780;
      meleeSwingUntil=now+330;
      playCombatSound(playerZombie?"chainsaw":"melee",.85);
      const origin={x:number(player.x),y:number(player.y,5.5),z:number(player.z)};
      const direction=directionFromCamera(player);
      const target=findTarget(origin,direction,6.5);
      if(!playerZombie && target && target.enemy.health>0 && target.distance<=6.5){
        const impact=pointAlongRay(origin,direction,target.distance);
        const enemy=target.enemy;
        const previousHealth=enemy.health;
        enemy.health=Math.max(0,enemy.health-42);
        enemy.hitReactUntil=now+360;
        enemy.blockedUntil=now+500;
        const shove=normalizeDirection({x:enemyCenter(enemy).x-origin.x,y:0,z:enemyCenter(enemy).z-origin.z});
        tryMoveEnemy(enemy,shove.x*3.5,shove.z*3.5);
        pushBloodBurst(enemy,impact,now,enemy.health<=0);
        if(previousHealth>0 && enemy.health<=0){
          markEnemyDefeated(enemy,now,shove);
          regularKills++;
        }
        if(matchType==="coop" && multiplayer?.getLobby?.())
          multiplayer.sendEvent?.("enemy-hit",{enemyId:enemy.id,damage:42,
            knockX:shove.x*3.5,knockZ:shove.z*3.5,deaths:playerDeaths,
            kills:regularKills+headshotKills},"").catch(()=>{});
        showHitmarker(enemy.health<=0,false);
      }
      if((matchType==="private" || playerZombie) && multiplayer?.getLobby?.()){
        const remote=findRemotePlayerTarget(origin,direction,6.5);
        if(remote && remote.distance<=6.5)
          multiplayer.sendEvent?.("player-hit",{damage:playerZombie?62:32,
            headshot:false,weapon:playerZombie?"chainsaw":"melee"},remote.player.id).catch(()=>{});
      }
      setTransientStatus("MELEE · [F] TO STRIKE",420);
      options.invalidate?.();
      return true;
    }

    function fire() {
      if(playerZombie){meleeAttack();return;}
      if (!active || reloading || roundState !== "playing" ||
          playerIsSprinting() || reviveHold) return;
      const player = options.getPlayer?.();
      if (!player?.engaged) return;
      const now = performance.now();
      const weapon = currentWeapon();
      const ammo = currentAmmo();
      if (now < nextPlayerShotAt) return;
      nextPlayerShotAt = now + weapon.fireInterval;
      if (!weapon.noAmmo && ammo.magazine <= 0) { startReload(); return; }
      if (!weapon.noAmmo) ammo.magazine -= 1;
      playCombatSound(weapon.key==="rocket"?"rocket":weapon.key==="chainsaw"?"chainsaw":
        SOUND_PRESETS[weapon.key]?weapon.key:weapon.key==="smg"?"rifle":"handgun",.95);
      playerRecoilUntil = now + Math.max(90, weapon.fireInterval * .9);
      playerMuzzleUntil = weapon.melee ? 0 : now + 68;

      const origin = { x: number(player.x), y: number(player.y, 5.5), z: number(player.z) };
      const direction = directionFromCamera(player);
      const yaw = number(player.yaw);
      const pitch = number(player.pitch);
      // Muzzle origin follows the rendered gun: hip-fire stays at the visible
      // right-side barrel, while rifle ADS moves the tracer forward/center with
      // the lowered aiming viewmodel instead of leaving it at the hip position.
      const muzzle = playerMuzzleOrigin(origin, direction, yaw, pitch, weapon, aiming);

      if(weapon.explosive){
        // Rockets have travel time and detonating splash, not hitscan damage.
        // Select the nearest actual surface/actor so close-range rockets explode
        // where they hit rather than passing through a zombie or another player.
        const worldImpact=resolveWorldImpact(origin,direction,weapon.range);
        const enemyTarget=findTarget(origin,direction,weapon.range);
        const playerTarget=findRemotePlayerTarget(origin,direction,weapon.range);
        let hitDistance=worldImpact.distance;
        let destination=worldImpact.point;
        if(enemyTarget && enemyTarget.distance<hitDistance){
          hitDistance=enemyTarget.distance;
          destination=pointAlongRay(origin,direction,hitDistance);
        }
        if(playerTarget && playerTarget.distance<hitDistance){
          hitDistance=playerTarget.distance;
          destination=pointAlongRay(origin,direction,hitDistance);
        }
        if(worldImpact.kind==="glass" && worldImpact.distance<=hitDistance+.05)pushGlassShatter(worldImpact,now);
        if(worldImpact.kind==="explosive-barrel" && worldImpact.distance<=hitDistance+.05)detonateExplosive(worldImpact,now);
        const travel=Math.hypot(destination.x-muzzle.x,destination.y-muzzle.y,destination.z-muzzle.z);
        const duration=clamp(travel/Math.max(35,weapon.projectileSpeed||84)*1000,150,1100);
        worldEffects.rockets.push({origin:{...muzzle},target:{...destination},startAt:now,duration,style:"player-rocket"});
        worldEffects.explosions.push({point:{...destination},startAt:now+duration,duration:900,
          radius:weapon.explosionRadius||10,damageMin:weapon.damage,damageMax:weapon.damage,
          sourcePlayer:true,resolved:false,seed:Math.random()*1000});
        if(worldEffects.rockets.length>24)worldEffects.rockets.splice(0,worldEffects.rockets.length-24);
        if(worldEffects.explosions.length>28)worldEffects.explosions.splice(0,worldEffects.explosions.length-28);
        if(!weapon.noAmmo && ammo.magazine<=0 && ammo.reserve>0)setTransientStatus("Magazine empty - R to reload",1300);
        syncHud();options.invalidate?.();
        return;
      }
      const pelletCount = Math.max(1, Math.floor(number(weapon.pellets, 1)));
      const hits = [];
      const pelletEndpoints = [];
      let centerFinalPoint = resolveWorldImpact(origin, direction, weapon.range).point;
      for (let pellet = 0; pellet < pelletCount; pellet += 1) {
        const pelletDirection = shotDirection(direction, yaw, pitch, number(weapon.spread));
        const target = findTarget(origin, pelletDirection, weapon.range);
        const remoteTarget = findRemotePlayerTarget(origin, pelletDirection, weapon.range);
        const worldImpact = resolveWorldImpact(origin, pelletDirection, weapon.range);
        let finalPoint = worldImpact.point;
        if ((matchType === "private" || matchType==="coop" && remoteTarget?.player?.state?.revenant===true)
             && remoteTarget && remoteTarget.distance <= worldImpact.distance + .05) {
          finalPoint = pointAlongRay(origin,pelletDirection,remoteTarget.distance);
          const headshot = remoteTarget.zone === "head";
          const damage = weapon.damage * (headshot ? HEADSHOT_DAMAGE_MULTIPLIER : 1);
          multiplayer?.sendEvent?.("player-hit",{damage,headshot,weapon:weapon.key},remoteTarget.player.id).catch(()=>{});
          hits.push({defeated:false,headshot,point:finalPoint,private:true});
        } else if (target && target.distance <= worldImpact.distance + .05 && target.enemy.health > 0) {
          const result = applyPlayerHit(target, pelletDirection, origin, weapon.damage, now);
          finalPoint = result.point || finalPoint;
          hits.push(result);
        } else {
          if (worldImpact.landed) {
            if (worldImpact.kind === "glass") pushGlassShatter(worldImpact, now);
            else if(worldImpact.kind==="explosive-barrel")detonateExplosive(worldImpact,now);
            else pushImpact(worldImpact.point, now, worldImpact.kind, worldImpact.normal);
          }
          const dodge = nearMissEnemy(origin,pelletDirection,weapon.range,null);
          if (dodge && pellet === 0) triggerCombatRoll(dodge,now,.62);
        }
        pelletEndpoints.push(finalPoint);
        if (pellet === 0) centerFinalPoint = finalPoint;
      }

      const defeatedHit = hits.find((hit) => hit.defeated);
      const headshotHit = hits.find((hit) => hit.headshot);
      if (hits.length) {
        showHitmarker(Boolean(defeatedHit), Boolean(headshotHit));
        if (defeatedHit) setTransientStatus(defeatedHit.headshot ? "HEADSHOT KILL" : "Enemy down", 950);
        else setTransientStatus(headshotHit ? "Headshot" : "Hit", headshotHit ? 650 : 420);
        if (defeatedHit && aliveEnemies().length === 0 && enemies.size > 0 && (gameMode !== "zombie" || zombieRunType === "normal") && (matchType !== "coop" || multiplayer?.isHost?.())) scheduleVictory();
      }
      if (number(weapon.pellets,1)>1) {
        // Render the actual buckshot cone rather than collapsing all pellets into
        // one center tracer. Eight pellets are fired; at least six remain visible
        // even when some impacts are close together.
        pelletEndpoints.forEach((endpoint, pelletIndex) => {
          pushTracer(muzzle, endpoint, now + pelletIndex * 2, "player-shotgun");
        });
      } else if (weapon.explosive) {
        const travelDistance=Math.hypot(centerFinalPoint.x-muzzle.x,centerFinalPoint.y-muzzle.y,centerFinalPoint.z-muzzle.z);
        const duration=clamp(travelDistance/Math.max(35,weapon.projectileSpeed||84)*1000,180,1100);
        worldEffects.rockets.push({origin:{...muzzle},target:{...centerFinalPoint},startAt:now,duration,style:"player-rocket"});
        worldEffects.explosions.push({point:{...centerFinalPoint},startAt:now+duration,duration:900,radius:weapon.explosionRadius||10,sourcePlayer:true,resolved:true,seed:Math.random()*1000});
      } else if (!weapon.melee) {
        pushTracer(muzzle, centerFinalPoint, now, weapon.key === "sniper" ? "sniper" : (aiming ? "player-aim" : "player"));
      }
      if (!weapon.noAmmo && ammo.magazine <= 0 && ammo.reserve > 0) setTransientStatus("Magazine empty - R to reload", 1300);
      syncHud();
      options.invalidate?.();
    }

    function damagePlayer(amount, enemy, player) {
      if (!active || paused || roundState !== "playing") return;
      const now = performance.now();
      const incoming = Math.max(0, number(amount)) * (matchType === "private" ? 1 : activeDifficultyConfig().damage);
      lastDamageAt = now;
      const absorbed = Math.min(playerShield, incoming);
      playerShield = Math.max(0, playerShield - absorbed);
      const healthDamage = Math.max(0, incoming - absorbed);
      if (healthDamage > 0) {
        playerHealth = Math.max(0, playerHealth - healthDamage);
        showDamage();
        playCombatSound("health-hit",.9);
        frame.classList.remove("combat-health-hit");
        void frame.offsetWidth;
        frame.classList.add("combat-health-hit");
        window.setTimeout(()=>frame.classList.remove("combat-health-hit"),570);
      } else if (shieldTrack) {
        playCombatSound("shield-hit",.85);
        shieldTrack.classList.remove("hit");
        void shieldTrack.offsetWidth;
        shieldTrack.classList.add("hit");
        window.setTimeout(() => shieldTrack.classList.remove("hit"), 220);
      }
      if(absorbed>0 && playerShield<=0){
        playCombatSound("shield-break",1);
        frame.classList.add("combat-shield-break-flash");
        window.setTimeout(()=>frame.classList.remove("combat-shield-break-flash"),1100);
      }
      showIncomingDirection(enemy, player, true);
      const sourceName = String(enemy?.machine?.name || "Enemy");
      if (absorbed > 0 && playerShield <= 0) setTransientStatus("Shield broken - " + sourceName, 800);
      else if (absorbed > 0 && healthDamage <= 0) setTransientStatus("Shield hit - " + sourceName, 520);
      else setTransientStatus("Incoming fire - " + sourceName, 600);
      if (playerHealth <= 0) {
        playCombatSound("zombie-turn",.8);
        recordPlayerDeath();
        if(playerZombie)finishRound("lost",enemy,player);
        else if (canRespawnAfterDeath() || (matchType==="coop" && multiplayer?.getLobby?.()))beginPlayerRespawn(enemy,player);
        else finishRound("lost", enemy, player);
      }
      syncHud();
    }

    function beginEnemyReload(enemy, loadout, now) {
      const magazine = Math.max(0, Math.floor(number(loadout?.magazine, 0)));
      if (!enemy || loadout?.melee || magazine <= 0 || enemy.reloadUntil > now) return false;
      enemy.reloadStartedAt = now;
      enemy.reloadUntil = now + Math.max(500, number(loadout.reloadMs, 1900));
      enemy.nextShotAt = Math.max(enemy.nextShotAt || 0, enemy.reloadUntil + 140);
      enemy.aimLockUntil = Math.max(enemy.aimLockUntil || 0, now + 260);
      return true;
    }

    function updateEnemyReload(enemy, loadout, now) {
      if (!enemy?.reloadUntil) return false;
      if (now < enemy.reloadUntil) return true;
      enemy.ammoInMagazine = Math.max(0, Math.floor(number(loadout?.magazine, 0)));
      enemy.reloadStartedAt = 0;
      enemy.reloadUntil = 0;
      enemy.nextShotAt = Math.max(enemy.nextShotAt || 0, now + 120);
      return false;
    }

    function fireEnemy(enemy, playerTarget, distance, now) {
      const loadout = ENEMY_WEAPONS[enemy.weaponKey] || ENEMY_WEAPONS.rifle;
      if (!loadout.melee) {
        if (updateEnemyReload(enemy, loadout, now)) return;
        if (enemy.ammoInMagazine <= 0) {
          beginEnemyReload(enemy, loadout, now);
          return;
        }
        enemy.ammoInMagazine = Math.max(0, enemy.ammoInMagazine - 1);
      }
      const source = enemyCenter(enemy);
      enemy.rotationY = faceAngle(source, playerTarget);
      enemy.lastSeenAt = now;
      enemy.lastKnownPlayerX = playerTarget.x;
      enemy.lastKnownPlayerZ = playerTarget.z;
      enemy.aimLockUntil = now + (loadout.melee ? 300 : 560);
      const shotDuration = loadout.melee ? 430 : loadout.explosive ? 390 : loadout.key === "sniper" ? 320 : 230;
      enemy.shotStartedAt = now;
      enemy.shotEndsAt = now + shotDuration;
      if(loadout.melee){
        const listener=options.getPlayer?.();
        const distance=Math.hypot(number(listener?.x)-number(enemy.x),number(listener?.z)-number(enemy.z));
        playCombatSound("chainsaw",clamp(22/Math.max(8,distance),.09,.62));
      }else if(Math.random()<.26){
        const listener=options.getPlayer?.();
        const distance=Math.hypot(number(listener?.x)-number(enemy.x),number(listener?.z)-number(enemy.z));
        playCombatSound("enemy-shot",clamp(22/Math.max(8,distance),.09,.5));
      }
      enemy.firingUntil = now + shotDuration;
      enemy.muzzleFlashUntil = loadout.melee ? 0 : now + (loadout.explosive ? 145 : loadout.key === "sniper" ? 105 : 88);
      enemy.recoilUntil = now + (loadout.key === "sniper" || loadout.explosive ? 290 : 195);
      const fireRateScale = gameMode === "combat" ? combatDifficultyConfig().fireRate : 1;
      enemy.nextShotAt = now + (loadout.fireMin + Math.random() * Math.max(0, loadout.fireMax - loadout.fireMin)) * fireRateScale;
      if (!loadout.melee && enemy.ammoInMagazine <= 0) enemy.nextShotAt = Math.min(enemy.nextShotAt, now + shotDuration + 90);
      const player = options.getPlayer?.() || playerTarget;

      if (loadout.melee) {
        if (distance <= loadout.range) {
          damagePlayer(loadout.damageMin + Math.random() * (loadout.damageMax - loadout.damageMin), enemy, player);
        } else {
          enemy.nextShotAt = now + 180;
        }
        return;
      }

      if (loadout.explosive) {
        const accuracyScale = gameMode === "combat" ? combatDifficultyConfig().accuracy : 1;
        const hitChance = clamp((loadout.accuracyNear - distance / loadout.accuracyFalloff) * accuracyScale, .16, .96);
        const hit = Math.random() <= hitChance;
        const spread = hit ? 1.4 : 7.5 + Math.random()*6;
        const rocketTarget = {
          x: playerTarget.x + (Math.random()-.5)*spread,
          y: .14 + Math.random()*.22,
          z: playerTarget.z + (Math.random()-.5)*spread,
        };
        enemy.tracerTarget = null;
        enemy.tracerUntil = 0;
        pushExplosiveProjectile(enemy,rocketTarget,now,loadout);
        if (!hit) showIncomingDirection(enemy,player,false);
        return;
      }

      const accuracyScale = gameMode === "combat" ? combatDifficultyConfig().accuracy : 1;
      const hitChance = clamp((loadout.accuracyNear - distance / loadout.accuracyFalloff) * accuracyScale, .14, .97);
      const hit = Math.random() <= hitChance;
      const missScale = hit ? 0 : (loadout.key === "sniper" ? 2.2 : loadout.key === "bazooka" ? 5.2 : 3.5) + Math.random() * 4.5;
      enemy.tracerTarget = {
        x: playerTarget.x + (Math.random() - .5) * missScale,
        y: playerTarget.y + (Math.random() - .5) * missScale * .32,
        z: playerTarget.z + (Math.random() - .5) * missScale,
      };
      enemy.tracerStyle = loadout.tracer || loadout.key;
      enemy.tracerUntil = now + (loadout.key === "sniper" ? 260 : loadout.key === "bazooka" ? 360 : 180);
      const aiShotDelta={x:enemy.tracerTarget.x-source.x,y:enemy.tracerTarget.y-source.y,z:enemy.tracerTarget.z-source.z};
      const aiShotDistance=Math.hypot(aiShotDelta.x,aiShotDelta.y,aiShotDelta.z);
      const aiShotDirection=normalizeDirection(aiShotDelta);
      const worldImpact=resolveWorldImpact(source,aiShotDirection,Math.min(loadout.range,aiShotDistance));
      if (worldImpact.landed && worldImpact.distance < aiShotDistance-.05) {
        enemy.tracerTarget={...worldImpact.point};
        if (worldImpact.kind === "glass") {
          pushGlassShatter(worldImpact, now); // AI GLASS: bullets explode the same panes the player can break.
          return;
        }
        pushImpact(worldImpact.point,now,worldImpact.kind,worldImpact.normal);
        return;
      }
      if (hit) {
        damagePlayer(loadout.damageMin + Math.random() * (loadout.damageMax - loadout.damageMin), enemy, player);
      } else {
        showIncomingDirection(enemy, player, false);
        setTransientStatus("Incoming " + loadout.label.toLowerCase() + " fire", 360);
      }
    }

    function updateEnemyAi(now) {
      const player = options.getPlayer?.();
      navFramePlans=0;
      const deltaSeconds = lastFrameAt > 0 ? clamp((now - lastFrameAt) / 1000, 0, .06) : 1 / 60;
      lastFrameAt = now;
      if (coopFollower()) {
        smoothCoopEnemyVisuals(now, deltaSeconds);
        lastThreatCount=aliveEnemies().length;
        syncHud();
        return;
      }
      syncEnemies(false);
      const hostWithAllies=matchType==="coop" && multiplayer?.isHost?.() && (multiplayer.remotePlayers?.()||[]).some((entry)=>entry.state?.alive!==false);
      if ((!player?.engaged || roundState!=="playing") && !hostWithAllies) {
        lastThreatCount = 0;
        aliveEnemies().forEach((enemy) => {
          enemy.movementBlend += (.14 - enemy.movementBlend) * Math.min(1, deltaSeconds * 6);
          enemy.walkPhase += deltaSeconds * 1.4;
        });
        syncHud();
        return;
      }

      const localTarget={x:number(player?.x),y:number(player?.y,5.5),z:number(player?.z)};
      const remoteTargets=matchType==="coop" && multiplayer?.isHost?.() ? (multiplayer.remotePlayers?.()||[]).filter((entry)=>entry.state?.alive!==false && number(entry.state?.health,100)>0).map((entry)=>({id:entry.id,x:number(entry.state?.x),y:number(entry.state?.y,5.5),z:number(entry.state?.z)})) : [];
      const targets=[...(roundState==="playing" && !playerZombie ? [{...localTarget,id:""}] : []),...remoteTargets];
      let threats = 0;
      for (const enemy of aliveEnemies()) {
        let source = enemyCenter(enemy);
        const target=targets.reduce((closest,item)=>!closest || Math.hypot(item.x-source.x,item.z-source.z)<Math.hypot(closest.x-source.x,closest.z-source.z)?item:closest,null);
        if (!target) continue;
        const playerTarget={x:target.x,y:target.y,z:target.z};
        let distance = Math.hypot(playerTarget.x - source.x, playerTarget.y - source.y, playerTarget.z - source.z);
        const loadout = ENEMY_WEAPONS[enemy.weaponKey] || ENEMY_WEAPONS.rifle;
        let reloading = updateEnemyReload(enemy, loadout, now);
        if (!loadout.melee && !reloading && enemy.ammoInMagazine <= 0 && now >= enemy.nextShotAt) {
          reloading = beginEnemyReload(enemy, loadout, now);
        }
        const sightRange = loadout.sightRange || Math.max(loadout.range + 22, 42);
        let lineOfSight = distance <= sightRange && hasLineOfSight(source, playerTarget);
        // Zombies always pursue the exact current location of the nearest living player,
        // even when a wall or machine temporarily blocks direct sight.
        updateEnemyMotion(enemy, playerTarget, now, deltaSeconds, enemy.zombie ? true : lineOfSight);

        source = enemyCenter(enemy);
        distance = Math.hypot(playerTarget.x - source.x, playerTarget.y - source.y, playerTarget.z - source.z);
        lineOfSight = distance <= loadout.range && hasLineOfSight(source, playerTarget);
        enemy.alerted = lineOfSight;
        if (!lineOfSight) continue;

        threats += 1;
        enemy.lastSeenAt = now;
        enemy.lastKnownPlayerX = playerTarget.x;
        enemy.lastKnownPlayerZ = playerTarget.z;
        enemy.aimLockUntil = Math.max(enemy.aimLockUntil, now + 320);
        enemy.rotationY = faceAngle(source, playerTarget);
        if (!reloading && now >= enemy.nextShotAt) {
          if (target.id && enemy.zombie && matchType==="coop") {
            const hitDamage=loadout.damageMin+Math.random()*Math.max(0,loadout.damageMax-loadout.damageMin);
            enemy.nextShotAt=now+Math.max(450,loadout.fireMin);
            enemy.shotStartedAt=now;enemy.shotEndsAt=now+360;
            multiplayer?.sendEvent?.("npc-hit",{enemyId:enemy.id,damage:hitDamage},target.id).catch(()=>{});
          } else if (!target.id) fireEnemy(enemy, playerTarget, distance, now);
        }
      }
      lastThreatCount = threats;
      syncHud();
    }

    function resetRound({ countdown = false } = {}) {
      if (victoryTimer) window.clearTimeout(victoryTimer);
      victoryTimer = 0;
      playerHealth = 100;
      lastLocalSyncSample = null;
      lastHostEnemySyncAt = -Infinity;
      cachedEnemySyncState = [];
      hostEnemySyncSamples.clear();
      hostWorldSeq = 0;
      lastAppliedHostWorldSeq = -1;
      playerShield = SHIELD_MAX;
      reviveUntil=0;reviveHold=null;playerZombie=false;nextMeleeAt=0;meleeSwingUntil=0;revivePrompt.hidden=true;
      aiming = false;
      frame.classList.remove("combat-aiming");
      if (scopeOverlay) scopeOverlay.hidden = true;
      options.setAimZoom?.(false, selectedWeapon);
      worldEffects.tracers.length = 0;
      worldEffects.impacts.length = 0;
      worldEffects.bloodBursts.length = 0;
      worldEffects.bloodPools.length = 0;
      worldEffects.bloodFountains.length = 0;
      worldEffects.rockets.length = 0;
      worldEffects.explosions.length = 0;
      worldEffects.glassShards.length = 0;
      shatteredGlass.clear();
      destroyedExplosives.clear();
      worldEffects.pickups.length = 0;
      lastDamageAt = 0;
      lastShieldUpdateAt = 0;
      paused = false;
      pausedAt = 0;
      selectedWeapon = selectedPrimaryWeapon;
      regularKills = 0;
      headshotKills = 0;
      playerDeaths = 0;
      playerPoints = 0;
      carriedWeapons=[selectedPrimaryWeapon,"handgun"].filter((weapon,index,array)=>WEAPONS[weapon]&&array.indexOf(weapon)===index);
      zombieWave=0;waveTotal=0;waveSpawned=0;waveDefeated=0;waveNextAt=0;waveSpecial=false;
      mysteryBox=null;mysteryOffer=null;healthStation=null;nearestStation=null;lastHealthPurchaseWave=-1;
      respawnEndsAt = 0;
      respawnDisplay = 0;
      roundStatOverrides.clear();
      creditedKillIds.clear();
      reloading = false;
      reloadStartedAt = 0;
      reloadEndsAt = 0;
      playerRecoilUntil = 0;
      playerMuzzleUntil = 0;
      reloadSerial += 1;
      nextPlayerShotAt = 0;
      playerRecoilUntil = 0;
      playerMuzzleUntil = 0;
      reloadStartedAt = 0;
      reloadEndsAt = 0;
      mouseHeld = false;
      lastThreatCount = 0;
      lastFrameAt = 0;
      playerDeathStartedAt = 0;
      roundStartedAt = 0;
      zombieSpawnCount = 0;
      nextZombieSpawnAt = 0;
      [...enemies.entries()].forEach(([id, record]) => { if (record.synthetic) enemies.delete(id); });
      frame.classList.remove("combat-death-cinematic", "combat-paused", "combat-player-dead");
      if (pauseOverlay) pauseOverlay.hidden = true;
      options.setMovementLocked?.(false);
      options.hideWalkMenu?.();
      options.resetDeathCinematic?.();
      Object.entries(WEAPONS).forEach(([key, weapon]) => {
        if (!ammunition[key]) ammunition[key]={magazine:weapon.magazine,reserve:weapon.reserve};
        ammunition[key].magazine=weapon.magazine;
        ammunition[key].reserve=weapon.reserve;
      });
      syncEnemies(true);
      if (matchType !== "private") resetAmmoPickups();
      if (zombieEndless()) mysteryBox=findStationPosition(10,"mystery");
      if (roundOverlay) {
        roundOverlay.hidden = true;
        roundOverlay.classList.remove("killer-reveal", "victory");
      }
      if (killerReveal) killerReveal.hidden = true;
      if (scoreboard) { scoreboard.hidden=true; scoreboard.innerHTML=""; }
      if (deathCountCopy) deathCountCopy.textContent="0";
      if (countdownLabel) countdownLabel.textContent="COMBAT STARTS IN";
      if (roundActions) roundActions.classList.remove("locked");
      syncRestartButton();
      roundRevealSerial += 1;

      if (countdown) {
        roundState = "countdown";
        countdownEndsAt = performance.now() + 2000;
        countdownDisplay = 2;
        if (countdownValue) countdownValue.textContent = "2";
        if (countdownOverlay) countdownOverlay.hidden = false;
        setTransientStatus(gameMode === "zombie" ? (zombieEndless() ? "Endless zombies incoming" : "Clear the plant") : "Get ready", 2200);
      } else {
        roundState = "playing";
        roundStartedAt = performance.now();
        countdownEndsAt = 0;
        countdownDisplay = 0;
        if (countdownOverlay) countdownOverlay.hidden = true;
      if (pauseOverlay) pauseOverlay.hidden = true;
        setTransientStatus(enemies.size ? (gameMode === "zombie" ? (zombieEndless() ? "Survive as long as you can" : "Clear every zombie in the plant") : "Combat ready") : "No enemy AI found", 1200);
      }
      syncHud();
      options.invalidate?.();
    }

    function updateCountdown(now) {
      if (roundState !== "countdown") return false;
      const remaining = Math.max(0, countdownEndsAt - now);
      if (remaining <= 0) {
        roundState = "playing";
        roundStartedAt = now;
        nextZombieSpawnAt = zombieEndless() ? now + 900 : 0;
        countdownEndsAt = 0;
        countdownDisplay = 0;
        if (countdownValue) countdownValue.textContent = "FIGHT";
        setTransientStatus(gameMode === "zombie" ? (zombieEndless() ? "Survive! Zombies will keep spawning." : "Clear the plant! Respawns enabled.") : "Fight!", 1000);
        window.setTimeout(() => {
          if (countdownOverlay && roundState !== "countdown") countdownOverlay.hidden = true;
        }, 350);
        options.onCombatStart?.();
        return true;
      }
      const nextDisplay = Math.max(1, Math.ceil(remaining / 1000));
      if (nextDisplay !== countdownDisplay) {
        countdownDisplay = nextDisplay;
        if (countdownValue) countdownValue.textContent = String(nextDisplay);
      }
      return true;    }

    function loop(now) {
      if (!active) return;
      if (roundState === "setup") {
        lastFrameAt = now;
        lastShieldUpdateAt = now;
        options.invalidate?.();
        frameRequest = window.requestAnimationFrame(loop);
        return;
      }
      if (paused) {
        lastFrameAt = now;
        lastShieldUpdateAt = now;
        options.invalidate?.();
        frameRequest = window.requestAnimationFrame(loop);
        return;
      }
      updateRevivePrompt(now);
      if (updatePlayerRespawn(now)) {
        if (matchType==="coop" && multiplayer?.isHost?.()) {
          cleanupZombieCorpses(now);
          updateZombieSpawns(now);
          updateEnemyAi(now);
        }
        multiplayer?.heartbeat?.();
        options.invalidate?.();
        frameRequest = window.requestAnimationFrame(loop);
        return;
      }
      updatePlayerShield(now);
      updateCombatSoundscape(now);
      resolveExplosionDamage(now);
      if (!updateCountdown(now)) {
        if(playerIsSprinting()){
          mouseHeld=false;
          if(aiming)setAiming(false);
        }
        if (mouseHeld && currentWeapon().automatic) fire();
        cleanupZombieCorpses(now);
        updateZombieSpawns(now);
        updateAmmoPickups(now);
        updateEnemyAi(now);
        updatePrivateOutcome();
        multiplayer?.heartbeat?.();
      } else {
        lastFrameAt = now;
      }
      options.invalidate?.();
      frameRequest = window.requestAnimationFrame(loop);
    }

    function availableCharacters() {
      const source = Array.isArray(options.getCharacters?.()) ? options.getCharacters() : (Array.isArray(options.getEnemies?.()) ? options.getEnemies() : []);
      return source.filter(Boolean);
    }

    function ensureSelectedCharacter() {
      const characters = availableCharacters();
      if (!characters.length) { selectedCharacterId = ""; return null; }
      const selected = characters.find((machine,index) => enemyId(machine,index) === selectedCharacterId);
      if (selected) return selected;
      selectedCharacterId = enemyId(characters[0],0);
      return characters[0];
    }

    function renderCharacterOptions() {
      if (!characterOptions) return;
      const characters = availableCharacters();
      ensureSelectedCharacter();
      characterOptions.innerHTML = "";
      characters.forEach((machine,index) => {
        const id = enemyId(machine,index);
        const button=document.createElement("button");
        button.type="button";
        button.dataset.characterId=id;
        button.className=id===selectedCharacterId?"active":"";
        button.innerHTML=`<b>${String(machine.name || machine.short || `Person ${index+1}`).replace(/[<>&]/g,"")}</b><small>${String(machine.short || "Plant character").replace(/[<>&]/g,"")}</small>`;
        characterOptions.appendChild(button);
      });
    }

    function characterNameForId(characterId) {
      const id=String(characterId || "");
      const characters=availableCharacters();
      const match=characters.find((machine,index) => enemyId(machine,index) === id);
      return String(match?.name || match?.short || "Plant character");
    }

    function setupConfig() {
      return {
        mode:gameMode,
        difficulty:activeDifficultyKey(),
        runType:gameMode === "zombie" ? zombieRunType : "normal",
        matchType:matchType === "private" ? "private" : "coop",
      };
    }

    function setLobbyStatus(text, tone = "") {
      if (!lobbyStatus) return;
      lobbyStatus.textContent=String(text || "");
      lobbyStatus.dataset.tone=tone;
    }

    function syncLobbyUi(nextLobby = multiplayer?.getLobby?.()) {
      if (!lobbySection) return;
      const multiplayerMode=matchType !== "solo";
      lobbySection.hidden=!multiplayerMode;
      if (matchStartButton) matchStartButton.hidden=multiplayerMode;
      if (!multiplayerMode) return;
      const lobby=nextLobby;
      if (lobbyNameInput && !lobbyNameInput.value) lobbyNameInput.value=multiplayer?.storedName?.() || "Player";
      if (!lobby) {
        lobbyCreateButton.hidden=false; lobbyJoinButton.hidden=false;
        lobbyReadyButton.hidden=true; lobbyStartButton.hidden=true;
        setLobbyStatus("Create a lobby or enter a code to join one.");
        if (lobbyPlayers) lobbyPlayers.innerHTML="";
        return;
      }
      if (lobbyCodeInput) lobbyCodeInput.value=lobby.code || "";
      lobbyCreateButton.hidden=true; lobbyJoinButton.hidden=true;
      const host=multiplayer?.isHost?.()===true;
      lobbyStartButton.hidden=!host || lobby.status === "started";
      lobbyReadyButton.hidden=host || lobby.status === "started";
      const me=multiplayer?.localPlayer?.();
      if (lobbyReadyButton) lobbyReadyButton.textContent=me?.ready?"Ready ✓":"Mark ready";
      setLobbyStatus(`${host?"HOST · ":""}LOBBY ${lobby.code} · ${lobby.status === "started"?"MATCH STARTED":"WAITING"}`, lobby.status);
      if (lobbyPlayers) lobbyPlayers.innerHTML=(lobby.players||[]).map((player) => {
        const isHost=player.id===lobby.hostId;
        const isMe=player.id===multiplayer?.playerId;
        const characterName=characterNameForId(player.characterId).replace(/[<>&]/g,"");
        const playerWeapon=WEAPONS[String(player.state?.weapon || "")]?.shortLabel || "";
        const detail=[isHost?"HOST":"PLAYER",player.ready?"READY":"",characterName,playerWeapon].filter(Boolean).join(" · ");
        return `<div class="combat-lobby-player${isMe?" me":""}"><b>${String(player.name||"Player").replace(/[<>&]/g,"")}</b><span>${detail}</span></div>`;
      }).join("");
    }

    function syncMatchSetupControls() {
      const currentDifficulty=activeDifficultyKey();
      difficultyOptions.forEach((button) => button.classList.toggle("active", button.dataset.matchDifficulty === currentDifficulty));
      zombieRunOptions.forEach((button) => button.classList.toggle("active", button.dataset.zombieRun === zombieRunType));
      weaponOptions.forEach((button) => button.classList.toggle("active", button.dataset.matchWeapon === selectedPrimaryWeapon));
      matchTypeOptions.forEach((button) => {
        const privateButton=button.dataset.matchType === "private";
        button.hidden=privateButton && gameMode === "zombie";
        button.classList.toggle("active", button.dataset.matchType === matchType);
      });
      if (gameMode === "zombie" && matchType === "private") matchType="coop";
      if (zombieRunSection) zombieRunSection.hidden=gameMode !== "zombie";
      if (setupKicker) setupKicker.textContent=gameMode === "zombie" ? "ZOMBIE MODE SETUP" : "COMBAT MODE SETUP";
      if (setupTitle) setupTitle.textContent=gameMode === "zombie" ? "Choose your zombie run" : "Choose your combat match";
      if (setupCopy) setupCopy.textContent=gameMode === "zombie"
        ? "Choose difficulty, run type, starting weapon, your character, and Solo or Co-op. Nightmare matches the original full-speed zombies."
        : "Choose enemy difficulty, starting weapon, your plant character, and Solo, Co-op, or a Private Match against another player.";
      if (matchStartButton) matchStartButton.textContent=gameMode === "zombie" ? "Start Zombie Mode" : "Start Combat Mode";
      renderCharacterOptions();
      syncLobbyUi();
      syncHud();
    }

    function applyLobbyConfig(lobby) {
      if (!lobby?.config) return;
      gameMode=lobby.config.mode === "zombie" ? "zombie" : "combat";
      frame.classList.toggle("zombie-mode-active", gameMode === "zombie");
      if (gameMode === "zombie" && ZOMBIE_DIFFICULTIES[lobby.config.difficulty]) zombieDifficulty=lobby.config.difficulty;
      if (gameMode === "combat" && COMBAT_DIFFICULTIES[lobby.config.difficulty]) combatDifficulty=lobby.config.difficulty;
      if (ZOMBIE_RUN_TYPES[lobby.config.runType]) zombieRunType=lobby.config.runType;
      matchType=lobby.config.matchType === "private" ? "private" : "coop";
      const me=(lobby.players||[]).find((player) => player.id===multiplayer?.playerId);
      if (me?.characterId) selectedCharacterId=me.characterId;
      saveModeSettings();
      syncMatchSetupControls();
    }

    function beginConfiguredRound() {
      selectedWeapon=selectedPrimaryWeapon;
      saveModeSettings();
      if (matchSetup) matchSetup.hidden=true;
      options.setMovementLocked?.(false);
      resetRound({countdown:true});
      options.capture?.();
    }

    async function authenticateLobby() {
      if (!multiplayer) throw new Error("Multiplayer is unavailable in this browser.");
      await multiplayer.authenticate(lobbyPasswordInput?.value || "");
      if (lobbyPasswordInput) lobbyPasswordInput.value="";
    }

    async function createLobby() {
      try {
        await authenticateLobby();
        const name=String(lobbyNameInput?.value || "Player").trim() || "Player";
        await multiplayer.create(setupConfig(), {name,characterId:selectedCharacterId});
        setLobbyStatus("Lobby created. Share the code with another owner-password user.","ok");
        syncLobbyUi();
      } catch(error) { setLobbyStatus(error?.message || "Could not create lobby.","error"); }
    }

    async function joinLobby() {
      try {
        await authenticateLobby();
        const code=String(lobbyCodeInput?.value || "").trim().toUpperCase();
        const name=String(lobbyNameInput?.value || "Player").trim() || "Player";
        const lobby=await multiplayer.join(code,{name,characterId:selectedCharacterId});
        applyLobbyConfig(lobby);
        setLobbyStatus("Joined lobby. Choose your character and mark ready.","ok");
      } catch(error) { setLobbyStatus(error?.message || "Could not join lobby.","error"); }
    }

    async function hostStartLobby() {
      const lobby=multiplayer?.getLobby?.();
      if (!lobby || !multiplayer?.isHost?.()) return;
      if (matchType === "private" && (lobby.players||[]).length < 2) { setLobbyStatus("Private Match needs at least two players.","error"); return; }
      try {
        await multiplayer.configure(setupConfig());
        await multiplayer.startMatch();
      } catch(error) { setLobbyStatus(error?.message || "Could not start lobby.","error"); }
    }

    function coopFollower() {
      return matchType === "coop" && Boolean(multiplayer) && !multiplayer.isHost?.();
    }

    function exportEnemySyncState(now = performance.now()) {
      const seen=new Set();
      cachedEnemySyncState=[...enemies.values()].map((enemy) => {
        const id=String(enemy.id || "");
        seen.add(id);
        const x=number(enemy.x), z=number(enemy.z);
        const previous=hostEnemySyncSamples.get(id);
        const elapsed=previous ? Math.max(.016,(now-previous.at)/1000) : HOST_ENEMY_SYNC_INTERVAL_MS/1000;
        const vx=previous ? clamp((x-previous.x)/elapsed,-36,36) : 0;
        const vz=previous ? clamp((z-previous.z)/elapsed,-36,36) : 0;
        hostEnemySyncSamples.set(id,{x,z,at:now});
        const snapshot={
          id,x,z,vx,vz,rotationY:number(enemy.rotationY),giant:Boolean(enemy.giant),
          elevation:number(enemy.elevation),climbing:Boolean(enemy.climbing),
          attacking:Boolean(enemy.shotStartedAt && now<enemy.shotEndsAt),
          attackProgress:enemy.shotStartedAt && now<enemy.shotEndsAt
            ? clamp((now-enemy.shotStartedAt)/Math.max(1,enemy.shotEndsAt-enemy.shotStartedAt),0,1):0,
          health:Math.max(0,number(enemy.health)), weaponKey:String(enemy.weaponKey || "rifle"),
          movementBlend:clamp(number(enemy.movementBlend,.08),0,1), walkPhase:number(enemy.walkPhase),
          gaitClass:String(enemy.gaitClass||"walker"),
          synthetic:Boolean(enemy.synthetic), defeatedAt:number(enemy.defeatedAt),
          // Monotonic clocks are local to each browser; synchronize elapsed
          // animation age, never the host's performance.now() timestamp.
          deathAgeMs:enemy.health<=0 ? clamp(now-number(enemy.deathAnimationStartedAt,now),0,6000) : 0,
          deathDirection:number(enemy.deathDirection,1),
          deathPushX:number(enemy.deathPushX),deathPushZ:number(enemy.deathPushZ),
        };
        if (enemy.synthetic) snapshot.machine={
          name:String(enemy.machine?.name || "Zombie"),
          w:Math.max(.4,number(enemy.machine?.w,1.8)), d:Math.max(.4,number(enemy.machine?.d,1.8)),
          h:Math.max(1,number(enemy.machine?.h,6.5)), y:number(enemy.machine?.y),
          designId:String(enemy.machine?.designId||""),sourceId:String(enemy.machine?.instanceId||""),
        };
        return snapshot;
      });
      [...hostEnemySyncSamples.keys()].forEach((id)=>{ if(!seen.has(id)) hostEnemySyncSamples.delete(id); });
      lastHostEnemySyncAt=now;
      hostWorldSeq+=1;
      return cachedEnemySyncState;
    }

    function hostEnemySyncPacket(now = performance.now()) {
      if (now-lastHostEnemySyncAt < HOST_ENEMY_SYNC_INTERVAL_MS) return null;
      return { worldSeq:hostWorldSeq+1, enemies:exportEnemySyncState(now), glass:[...shatteredGlass] };
    }

    function smoothCoopEnemyVisuals(now, deltaSeconds) {
      const blend=1-Math.exp(-Math.max(.001,deltaSeconds)*15);
      for (const enemy of enemies.values()) {
        const sync=enemy.remoteSync;
        if (!sync) continue;
        const age=clamp(now-sync.receivedAt,0,COOP_ENEMY_PREDICTION_MS)/1000;
        const predict=enemy.health>0 ? age : 0;
        const desiredX=sync.targetX+sync.vx*predict;
        const desiredZ=sync.targetZ+sync.vz*predict;
        const gap=Math.hypot(desiredX-number(enemy.x),desiredZ-number(enemy.z));
        if (gap>14) { enemy.x=desiredX; enemy.z=desiredZ; }
        else {
          enemy.x=number(enemy.x)+(desiredX-number(enemy.x))*blend;
          enemy.z=number(enemy.z)+(desiredZ-number(enemy.z))*blend;
        }
        let turn=((sync.targetRotationY-number(enemy.rotationY)+540)%360)-180;
        enemy.rotationY=number(enemy.rotationY)+turn*Math.min(1,blend*1.35);
        enemy.movementBlend += (sync.movementBlend-enemy.movementBlend)*Math.min(1,deltaSeconds*10);
        if (enemy.health>0) enemy.walkPhase += deltaSeconds*(1.4+Math.hypot(sync.vx,sync.vz)*1.7);
      }
    }

    function synchronizeEnemyDeathPose(enemy,snapshot,receivedAt){
      if(!enemy || enemy.health>0)return false;
      // Snapshot carries AGE rather than the remote machine's monotonic clock.
      const age=clamp(number(snapshot.deathAgeMs),0,6000);
      const localStart=receivedAt-age;
      enemy.deathAnimationStartedAt=enemy.deathAnimationStartedAt>0
        ? Math.min(enemy.deathAnimationStartedAt,localStart) : localStart;
      enemy.defeatedAt=enemy.deathAnimationStartedAt;
      enemy.deathDirection=number(snapshot.deathDirection,enemy.deathDirection||1);
      enemy.deathPushX=number(snapshot.deathPushX);
      enemy.deathPushZ=number(snapshot.deathPushZ);
      enemy.movementBlend=0;
      enemy.firingUntil=0;
      enemy.rollUntil=0;
      return true;
    }

    function applyHostEnemySyncState(lobby = multiplayer?.getLobby?.()) {
      if (!coopFollower() || !lobby) return false;
      const host=(lobby.players||[]).find((player) => player.id===lobby.hostId);
      const worldSeq=number(host?.state?.worldSeq,-1);
      if (worldSeq>=0 && worldSeq===lastAppliedHostWorldSeq) return false;
      const snapshots=Array.isArray(host?.state?.enemies) ? host.state.enemies : null;
      if (!snapshots) return false;
      lastAppliedHostWorldSeq=worldSeq;
      syncEnemies(false);
      const receivedAt=performance.now();
      const seen=new Set();
      for (const snapshot of snapshots) {
        const id=String(snapshot?.id || "");
        if (!id) continue;
        seen.add(id);
        let enemy=enemies.get(id);
        if (!enemy) {
          const base=(Array.isArray(options.getEnemies?.()) ? options.getEnemies() : []).find((machine,index) => enemyId(machine,index)===id);
          const machine=base || {
            id,instanceId:id,name:String(snapshot.machine?.name || "Zombie"),type:"person",x:number(snapshot.x)-.9,y:number(snapshot.machine?.y),z:number(snapshot.z)-.9,
            w:Math.max(.4,number(snapshot.machine?.w,1.8)),d:Math.max(.4,number(snapshot.machine?.d,1.8)),h:Math.max(1,number(snapshot.machine?.h,6.5)),
            designId:String(snapshot.machine?.designId||""),visible:true,combatSpawned:true,
            reveal:0,retire:99,
          };
          enemy={id};
          enemies.set(id,enemy);
          resetEnemyRecord(enemy,machine,enemies.size);
          enemy.synthetic=Boolean(snapshot.synthetic || !base);
          enemy.machine.reveal=Number.isFinite(Number(enemy.machine.reveal))?Number(enemy.machine.reveal):0;
          enemy.machine.retire=Number.isFinite(Number(enemy.machine.retire))?Number(enemy.machine.retire):99;
          if(snapshot.machine?.designId)enemy.machine.designId=String(snapshot.machine.designId);
          enemy.x=number(snapshot.x,enemy.x); enemy.z=number(snapshot.z,enemy.z); enemy.rotationY=number(snapshot.rotationY,enemy.rotationY);
        }
        enemy.remoteSync={
          targetX:number(snapshot.x,enemy.x), targetZ:number(snapshot.z,enemy.z), targetRotationY:number(snapshot.rotationY,enemy.rotationY),
          vx:number(snapshot.vx), vz:number(snapshot.vz), movementBlend:clamp(number(snapshot.movementBlend,enemy.movementBlend),0,1), receivedAt,
        };
        const previouslyAlive=enemy.health>0;
        enemy.health=Math.max(0,number(snapshot.health,enemy.health));
        if(previouslyAlive&&enemy.health<=0){
          const listener=options.getPlayer?.();
          const distance=Math.hypot(number(listener?.x)-number(enemy.x),number(listener?.z)-number(enemy.z));
          playCombatSound("enemy-down",clamp(35/Math.max(10,distance),.1,.8));
        }
        // Corpse locations remain authoritative; do not smooth a fallen
        // employee back into a standing/animated walking position.
        if(enemy.health<=0) {
          enemy.x=number(snapshot.x,enemy.x);
          enemy.z=number(snapshot.z,enemy.z);
          enemy.remoteSync=null;
        }
        enemy.elevation=Math.max(0,number(snapshot.elevation,enemy.elevation));
        enemy.climbing=Boolean(snapshot.climbing);
        if(snapshot.attacking){
          const duration=String(snapshot.weaponKey||enemy.weaponKey)==="chainsaw"?430:320;
          enemy.shotStartedAt=receivedAt-clamp(number(snapshot.attackProgress),0,1)*duration;
          enemy.shotEndsAt=enemy.shotStartedAt+duration;
        }else{
          enemy.shotEndsAt=0;
          enemy.shotStartedAt=0;
        }
        enemy.weaponKey=String(snapshot.weaponKey || enemy.weaponKey || "rifle"); enemy.weaponLabel=ENEMY_WEAPONS[enemy.weaponKey]?.label || enemy.weaponLabel || "Rifle";
        enemy.synthetic=Boolean(snapshot.synthetic);
        enemy.giant=Boolean(snapshot.giant);
        enemy.zombie=gameMode==="zombie";
        const key=String(snapshot.gaitClass||"walker");
        enemy.gaitClass=ZOMBIE_GAITS[key]?key:(enemy.giant?"giant":"walker");
        const gait=ZOMBIE_GAITS[enemy.gaitClass];
        enemy.gaitCycle=gait.cycle;enemy.gaitStride=gait.stride;enemy.gaitSwing=gait.swing;
        enemy.gaitBob=gait.bob;enemy.gaitLean=gait.lean;
        synchronizeEnemyDeathPose(enemy,snapshot,receivedAt);
      }
      [...enemies.entries()].forEach(([id,enemy]) => { if (enemy.synthetic && !seen.has(id)) enemies.delete(id); });
      const sharedGlass=Array.isArray(host?.state?.glass) ? host.state.glass : [];
      sharedGlass.forEach((glassId) => shatteredGlass.add(String(glassId || "")));
      return true;
    }

    function multiplayerEvent(event,lobby) {
      if (!event) return;
      if(event.type==="revive-player" && matchType==="coop" &&
          event.targetId===multiplayer?.playerId && reviveUntil>Date.now()
          && ["respawning","respawn-choice"].includes(roundState)){
        const sender=(lobby?.players||[]).find(p=>p.id===event.senderId);
        const s=sender?.state||{},local=options.getPlayer?.();
        if(!sender||!local||s.alive!==true)return;
        if(Math.hypot(number(s.x)-number(local.x),number(s.z)-number(local.z))>COOP_REVIVE_RADIUS+1.5)return;
        resumePlayerAfterDeath(true);
        return;
      }
      if(event.type==="rocket-blast" && event.senderId!==multiplayer?.playerId &&
          ["private","coop"].includes(matchType) && roundState==="playing"){
        // Remote explosions apply once on the receiving player's client.
        // Damage is computed from the receiver's live position, never from a
        // client-asserted victim or arbitrary raw-damage multiplier.
        const sourcePlayer=(lobby?.players||[]).find(p=>p.id===event.senderId);
        if(!sourcePlayer)return;
        const enemyId=String(event.payload?.enemyId||"");
        if(enemyId && event.senderId!==lobby?.hostId)return;
        const raw=event.payload?.point||{};
        const point={x:number(raw.x,NaN),y:number(raw.y,NaN),z:number(raw.z,NaN)};
        if(![point.x,point.y,point.z].every(Number.isFinite))return;
        const radius=clamp(number(event.payload?.radius,10),1,14);
        const damage=clamp(number(event.payload?.damage,145),0,190);
        const victim=options.getPlayer?.();
        if(!victim)return;
        const local={x:number(victim.x),y:number(victim.y,5.5),z:number(victim.z)};
        const hurt=splashDamage(point,local,radius,damage);
        worldEffects.explosions.push({point,startAt:performance.now(),duration:800,
          radius,resolved:true,seed:Math.random()*1000});
        if(hurt>0){
          const enemy=enemyId ? enemies.get(enemyId) : null;
          const source=enemy||{
            id:event.senderId,x:point.x,z:point.z,weaponKey:"rocket",weaponLabel:"Rocket Launcher",
            machine:{name:sourcePlayer.name||"Player"}
          };
          damagePlayer(hurt,source,victim);
        }
        return;
      }
      if (event.type==="npc-hit" && matchType==="coop" && event.senderId===lobby?.hostId && event.targetId===multiplayer?.playerId && roundState==="playing") {
        const enemy=enemies.get(String(event.payload?.enemyId || ""));
        if (enemy && enemy.health>0) damagePlayer(Math.min(80,Math.max(0,number(event.payload?.damage))),enemy,options.getPlayer?.());
        return;
      }
      if (event.type === "player-hit" && event.targetId === multiplayer?.playerId &&
          (matchType === "private" || matchType==="coop") && roundState === "playing") {
        const sender=(lobby?.players||[]).find((player) => player.id===event.senderId);
        const state=sender?.state || {};
        // Friendly fire is forbidden except when one of the two players is undead.
        if(matchType==="coop" && Boolean(state.revenant)===Boolean(playerZombie))return;
        const killerWeaponKey=String(event.payload?.weapon || state.weapon || "rifle");
        const fakeEnemy={ id:event.senderId, x:number(state.x)-.9, z:number(state.z)-.9, weaponKey:killerWeaponKey, weaponLabel:WEAPONS[killerWeaponKey]?.shortLabel || ENEMY_WEAPONS[killerWeaponKey]?.label || "Weapon", machine:{name:sender?.name||"Opponent",x:number(state.x)-.9,y:0,z:number(state.z)-.9,w:1.8,d:1.8,h:6.5} };
        damagePlayer(number(event.payload?.damage),fakeEnemy,options.getPlayer?.());
        return;
      }
      if (event.type === "glass-shatter" && matchType === "coop") {
        applyGlassShatterPayload(event.payload, performance.now(), false);
        return;
      }
      if(event.type==="mystery-relocate" && matchType==="coop" && gameMode==="zombie"){
        const x=number(event.payload?.x,NaN),z=number(event.payload?.z,NaN);
        if(Number.isFinite(x)&&Number.isFinite(z) && mysteryBox){
          mysteryBox={x,z};mysteryOffer=null;nearestStation=null;
          multiplayer?.heartbeat?.();
        }
        return;
      }
      if(event.type==="barrel-detonate" && matchType==="coop"){
        const id=String(event.payload?.id||"");
        if(!id || destroyedExplosives.has(id))return;
        destroyedExplosives.add(id);
        const raw=event.payload?.point||{};
        const point={x:number(raw.x),y:number(raw.y),z:number(raw.z)};
        worldEffects.explosions.push({point,startAt:performance.now(),duration:900,
          radius:12,resolved:true,seed:Math.random()*1000});
        return;
      }
      if (event.type === "player-death" && matchType === "coop") {
        rememberRemoteRoundStats(event.senderId,event.payload || {});
        return;
      }
      if (event.type === "coop-victory" && matchType === "coop") {
        if (!active || lobby?.status !== "started" || event.senderId !== lobby.hostId || !["countdown","playing","respawning"].includes(roundState)) return;
        finishRound("won",null,null,Array.isArray(event.payload?.leaderboard) ? event.payload.leaderboard : null);
        return;
      }
      if (event.type === "round-restart" && matchType === "coop") {
        if (!active || lobby?.status !== "started" || event.senderId !== lobby.hostId || roundState === "setup") return;
        resetRound({countdown:true});
        options.capture?.();
        return;
      }
      if (event.type === "enemy-hit" && matchType === "coop" && ["playing","respawning","respawn-choice","lost"].includes(roundState)) {
        if (!multiplayer?.isHost?.()) return;
        rememberRemoteRoundStats(event.senderId,event.payload || {});
        const enemy=enemies.get(String(event.payload?.enemyId || ""));
        if (!enemy || enemy.health <= 0) return;
        const damage=Math.max(0,number(event.payload?.damage));
        enemy.health=Math.max(0,enemy.health-damage);
        enemy.hitReactUntil=performance.now()+180;
        if(number(event.payload?.knockX)||number(event.payload?.knockZ))
          tryMoveEnemy(enemy,clamp(number(event.payload.knockX),-4,4),
            clamp(number(event.payload.knockZ),-4,4));
        if (enemy.health<=0) {
          markEnemyDefeated(enemy,performance.now());
          if (aliveEnemies().length===0 && enemies.size>0 && (gameMode!=="zombie" || zombieRunType==="normal")) scheduleVictory();
        }
      }
    }

    function multiplayerUpdate(lobby) {
      if (roundState === "setup") syncLobbyUi(lobby);
      if (!active || !lobby) return;
      if (zombieEndless() && coopFollower() && lobby.status==="started") {
        const host=(lobby.players||[]).find((entry)=>entry.id===lobby.hostId)?.state;
        if (host) {
          const previousWave=zombieWave;
          zombieWave=Math.max(0,Math.floor(number(host.wave,zombieWave)));
          if(zombieWave>previousWave && roundState==="playing"){
            playCombatSound("wave-start",.70);
            lastWaveTick=0;
          }
          waveTotal=Math.max(0,Math.floor(number(host.waveTotal,waveTotal)));
          waveSpawned=Math.max(0,Math.floor(number(host.waveSpawned,waveSpawned)));
          waveDefeated=Math.max(0,Math.floor(number(host.waveDefeated,waveDefeated)));
          const hostCountdown=Math.max(0,Math.floor(number(host.waveBreakRemainingMs)));
          if(hostCountdown && !waveNextAt)playCombatSound("wave-clear",.65);
          waveNextAt=hostCountdown?performance.now()+hostCountdown:0;
          waveSpecial=zombieWave>0 && zombieWave%5===0;
          if (Number.isFinite(Number(host.boxX)) && Number.isFinite(Number(host.boxZ))) mysteryBox={x:Number(host.boxX),z:Number(host.boxZ)};
          healthStation=waveSpecial && host.healthX!=null && host.healthZ!=null ? {x:number(host.healthX),z:number(host.healthZ)} : null;
        }
      }
      if (["won","lost"].includes(roundState)) syncRestartButton();
      (lobby.players || []).forEach((entry)=>{ if (entry.id !== multiplayer?.playerId) rememberRemoteRoundStats(entry.id,entry.state || {}); });
      if (lobby.status === "started" && roundState !== "setup") applyHostEnemySyncState(lobby);
      if (lobby.status === "started" && roundState === "setup" && multiplayerStartedRevision !== lobby.revision) {
        multiplayerStartedRevision=lobby.revision;
        applyLobbyConfig(lobby);
        beginConfiguredRound();
      }
    }

    function multiplayerPlayerState() {
      const player=options.getPlayer?.() || {};
      const now=performance.now();
      const x=number(player.x), z=number(player.z);
      const elapsed=lastLocalSyncSample ? Math.max(.016,(now-lastLocalSyncSample.at)/1000) : .12;
      const vx=lastLocalSyncSample ? clamp((x-lastLocalSyncSample.x)/elapsed,-28,28) : 0;
      const vz=lastLocalSyncSample ? clamp((z-lastLocalSyncSample.z)/elapsed,-28,28) : 0;
      lastLocalSyncSample={x,z,at:now};
      const state={
        x,y:number(player.y,5.5),z,yaw:number(player.yaw),pitch:number(player.pitch),vx,vz,moving:Boolean(player.moving),
        health:playerHealth,shield:playerShield,weapon:roundState === "setup" ? selectedPrimaryWeapon : selectedWeapon,
        sprinting:Boolean(player.sprinting && player.moving),
        revivingTargetId:reviveHold?.targetId||"",
        reviveProgress:reviveHold?clamp((now-reviveHold.startedAt)/COOP_REVIVE_HOLD_MS,0,1):0,
        alive:!playerZombie && !["lost","respawning","respawn-choice"].includes(roundState),
        revenant:playerZombie,
        meleeSwing:now<meleeSwingUntil?clamp((meleeSwingUntil-now)/330,0,1):0,
        downedUntil:reviveUntil>Date.now()?reviveUntil:0,
        kills:regularKills+headshotKills,headshots:headshotKills,deaths:playerDeaths,points:playerPoints,
      };
      if (zombieEndless() && multiplayer?.isHost?.()) Object.assign(state,{
        wave:zombieWave,waveTotal,waveSpawned,waveDefeated,
        waveBreakRemainingMs:waveNextAt?Math.max(0,Math.ceil(waveNextAt-now)):0,
        boxX:mysteryBox?.x,boxZ:mysteryBox?.z,healthX:healthStation?.x,healthZ:healthStation?.z
      });
      if (matchType === "coop" && multiplayer?.isHost?.() && roundState !== "setup") {
        const worldPacket=hostEnemySyncPacket(now);
        if (worldPacket) Object.assign(state,worldPacket);
      }
      return state;
    }

    function findRemotePlayerTarget(origin,direction,range) {
      if ((matchType!=="private" && matchType!=="coop") || !multiplayer)return null;
      let best=null,bestDistance=range;
      for (const player of multiplayer.remotePlayers?.() || []) {
        const state=player.state || {};
        if(number(state.health,100)<=0)continue;
        if(matchType==="coop" && (playerZombie ? state.alive!==true : state.revenant!==true))continue;
        if(matchType==="private" && state.alive===false)continue;
        const x=number(state.x), y=number(state.y,5.5), z=number(state.z);
        const head={x,y:y-.42,z};
        const headDistance=raySphere(origin,direction,head,.52);
        const bodyDistance=rayAabb(origin,direction,{x:x-.48,y:y-5.2,z:z-.42,w:.96,h:4.45,d:.84},bestDistance);
        for (const candidate of [{zone:"head",distance:headDistance},{zone:"body",distance:bodyDistance}]) {
          if (!Number.isFinite(candidate.distance) || candidate.distance>=bestDistance) continue;
          best={player,zone:candidate.zone,distance:candidate.distance}; bestDistance=candidate.distance;
        }
      }
      return best;
    }

    function updatePrivateOutcome() {
      if (matchType !== "private" || roundState !== "playing" || !multiplayer) return;
      const remotes=multiplayer.remotePlayers?.() || [];
      if (!remotes.length) return;
      if (remotes.every((player) => player.state?.alive === false || number(player.state?.health,100)<=0)) scheduleVictory();
    }

    function resetCombatSessionUi() {
      creditedKillIds.clear();
      carriedWeapons=[];
      playerPoints=0;
      zombieWave=0;waveTotal=0;waveSpawned=0;waveDefeated=0;waveNextAt=0;
      mysteryBox=null;mysteryOffer=null;healthStation=null;nearestStation=null;lastHealthPurchaseWave=-1;
      // This reset is intentionally idempotent. Combat can be exited through
      // several paths (round-end buttons, toolbar toggle, first-person exit),
      // and some of those paths can call stop() after the controller is already
      // inactive. Always clear the end-of-round presentation before either
      // returning or starting another session so stale restart/exit UI cannot
      // leak into the next setup screen.
      roundRevealSerial += 1;
      roundState = "setup";
      countdownEndsAt = 0;
      countdownDisplay = 0;
      playerDeathStartedAt = 0;
      respawnEndsAt = 0;
      respawnDisplay = 0;
      paused = false;
      pausedAt = 0;
      frame.classList.remove("combat-under-fire", "combat-death-cinematic", "combat-paused", "combat-player-dead");
      if (hud) hud.hidden = true;
      if (countdownOverlay) countdownOverlay.hidden = true;
      if (countdownLabel) countdownLabel.textContent="COMBAT STARTS IN";
      if (pauseOverlay) pauseOverlay.hidden = true;
      if (roundOverlay) {
        roundOverlay.hidden = true;
        roundOverlay.classList.remove("killer-reveal", "victory");
      }
      if (killerReveal) killerReveal.hidden = true;
      if (roundActions) roundActions.classList.remove("locked");
      if (matchSetup) matchSetup.hidden = true;
      restartButton && (restartButton.disabled = false);
      options.resetDeathCinematic?.();
    }

    function openMatchSetup() {
      roundState="setup";
      ensureSelectedCharacter();
      syncMatchSetupControls();
      if (matchSetup) matchSetup.hidden=false;
      options.setMovementLocked?.(true);
      options.releasePointer?.();
      syncHud();
      options.invalidate?.();
    }

    function start(mode = "combat") {
      if (active || options.isOwner?.() !== true) return false;
      gameMode = GAME_MODES[mode] ? mode : "combat";
      resetCombatSessionUi();
      active = true;
      frame.classList.toggle("zombie-mode-active", gameMode === "zombie");
      hud.hidden = false;
      paused = false;
      pausedAt = 0;
      frame.classList.add("combat-mode-active");
      options.hideWalkMenu?.();
      matchType="solo";
      openMatchSetup();
      options.onStateChange?.(true, gameMode);
      frameRequest = window.requestAnimationFrame(loop);
      return true;
    }

    function stop() {
      resetCombatSessionUi();
      if (!active) return;
      if (victoryTimer) window.clearTimeout(victoryTimer);
      victoryTimer = 0;
      active = false;
      paused = false;
      pausedAt = 0;
      mouseHeld = false;
      reloading = false;
      reloadSerial += 1;
      if (frameRequest) window.cancelAnimationFrame(frameRequest);
      frameRequest = 0;
      countdownEndsAt = 0;
      countdownDisplay = 0;
      lastFrameAt = 0;
      roundStartedAt = 0;
      hud.hidden = true;
      frame.classList.remove("combat-mode-active", "zombie-mode-active", "combat-under-fire", "combat-death-cinematic", "combat-paused", "combat-player-dead");
      options.setMovementLocked?.(false);
      options.hideWalkMenu?.();
      playerDeathStartedAt = 0;
      options.resetDeathCinematic?.();
      if (countdownOverlay) countdownOverlay.hidden = true;
      if (roundOverlay) {
        roundOverlay.hidden = true;
        roundOverlay.classList.remove("killer-reveal");
      }
      if (directionCalloutTimer) window.clearTimeout(directionCalloutTimer);
      directionCalloutTimer = 0;
      if (directionCallout) directionCallout.hidden = true;
      if (matchSetup) matchSetup.hidden = true;
      multiplayer?.leave?.();
      multiplayerStartedRevision=0;
      reviveUntil=0;reviveHold=null;playerZombie=false;revivePrompt.hidden=true;
      options.onStateChange?.(false, gameMode);
      options.invalidate?.();
    }

    function handleKeyDown(event) {
      if (!active || roundState === "setup") return;
      unlockCombatAudio();
      if (event.target?.matches?.("input, select, textarea, [contenteditable='true']")) return;
      if(playerZombie && ["KeyE","Digit1","Digit2","Digit3","KeyR"].includes(event.code)){
        event.preventDefault();
        return; // Player-controlled zombies fight with chainsaws, not human loadouts.
      }
      if (event.code === "KeyE") {
        event.preventDefault();
        if(event.repeat)return;
        if(nearestDownedAlly())beginReviveHold();
        else buyNearbyStation();
        return;
      }
      if (event.code === "KeyF") {event.preventDefault();if(!reviveHold)meleeAttack();return;}
      if (event.code === "Digit1") {
        event.preventDefault();
        switchWeapon(playerLoadout()[0]);
      } else if (event.code === "Digit2") {
        event.preventDefault();
        switchWeapon(playerLoadout()[1]);
      } else if (event.code === "Digit3") {
        event.preventDefault();
        switchWeapon(playerLoadout()[2]);
      } else if (event.code === "KeyR") {
        event.preventDefault();
        startReload();
      }
    }

    function handleKeyUp(event){
      if(event.code==="KeyE")cancelReviveHold();
    }
    function handleMouseDown(event) {
      unlockCombatAudio();
      if (!active || paused || ["lost","won"].includes(roundState) || options.isPointerLocked?.() !== true) return;
      if (event.button === 2) { event.preventDefault(); setAiming(true); return; }
      if (event.button !== 0) return;
      event.preventDefault();
      if(playerIsSprinting()||reviveHold)return;
      if (currentWeapon().automatic) mouseHeld = true;
      fire();
    }

    function handleMouseUp(event) {
      if (event.button === 0) mouseHeld = false;
      if (event.button === 2) { event.preventDefault(); setAiming(false); }
    }

    function handleContextMenu(event) {
      if (!active) return;
      event.preventDefault();
    }

    function setTriggerHeld(held) {
      const next = Boolean(held);
      if (!next) {
        mouseHeld = false;
        return;
      }
      if (!active || paused || ["lost", "won"].includes(roundState) ||
          playerIsSprinting() || reviveHold) return;
      if (currentWeapon().automatic) mouseHeld = true;
      fire();
    }

    function handleBlur() {
      cancelReviveHold();
      mouseHeld = false;
      setAiming(false);
    }

    multiplayer = window.createCombatMultiplayer?.({
      getState:multiplayerPlayerState,
      onUpdate:multiplayerUpdate,
      onEvent:multiplayerEvent,
      onError:(error) => { if (matchType !== "solo") setLobbyStatus(error?.message || "Lobby connection problem.","error"); },
    }) || null;

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    window.addEventListener("blur", handleBlur);

    difficultyOptions.forEach((button) => button.addEventListener("click", () => {
      const key=button.dataset.matchDifficulty;
      if (gameMode === "zombie" && ZOMBIE_DIFFICULTIES[key]) zombieDifficulty=key;
      if (gameMode === "combat" && COMBAT_DIFFICULTIES[key]) combatDifficulty=key;
      syncMatchSetupControls();
      if (multiplayer?.isHost?.()) multiplayer.configure(setupConfig()).catch(()=>{});
    }));
    zombieRunOptions.forEach((button) => button.addEventListener("click", () => {
      if (!ZOMBIE_RUN_TYPES[button.dataset.zombieRun]) return;
      zombieRunType=button.dataset.zombieRun;
      syncMatchSetupControls();
      if (multiplayer?.isHost?.()) multiplayer.configure(setupConfig()).catch(()=>{});
    }));
    weaponOptions.forEach((button) => button.addEventListener("click", () => {
      const next=String(button.dataset.matchWeapon || "");
      if (!PLAYER_PRIMARY_WEAPONS.includes(next)) return;
      selectedPrimaryWeapon=next;
      if (roundState === "setup") selectedWeapon=next;
      saveModeSettings();
      syncMatchSetupControls();
      multiplayer?.heartbeat?.();
    }));
    matchTypeOptions.forEach((button) => button.addEventListener("click", () => {
      const next=button.dataset.matchType;
      if (!['solo','coop','private'].includes(next) || (gameMode === 'zombie' && next === 'private')) return;
      if (next !== matchType && multiplayer?.getLobby?.()) multiplayer.leave?.();
      matchType=next;
      syncMatchSetupControls();
    }));
    characterOptions?.addEventListener("click", (event) => {
      const button=event.target?.closest?.("[data-character-id]");
      if (!button) return;
      selectedCharacterId=String(button.dataset.characterId || "");
      saveModeSettings();
      renderCharacterOptions();
      multiplayer?.updateIdentity?.(lobbyNameInput?.value || "Player",selectedCharacterId);
    });
    matchStartButton?.addEventListener("click", () => { if (matchType === "solo") beginConfiguredRound(); });
    hud.querySelector("[data-match-cancel]")?.addEventListener("click", () => { stop(); options.exitCombat?.(); });
    lobbyCreateButton?.addEventListener("click", createLobby);
    lobbyJoinButton?.addEventListener("click", joinLobby);
    lobbyReadyButton?.addEventListener("click", () => multiplayer?.ready?.(!multiplayer.localPlayer?.()?.ready,{name:lobbyNameInput?.value,characterId:selectedCharacterId}).catch((error)=>setLobbyStatus(error?.message,"error")));
    lobbyStartButton?.addEventListener("click", hostStartLobby);
    lobbyNameInput?.addEventListener("input", () => multiplayer?.updateIdentity?.(lobbyNameInput.value,selectedCharacterId));

    hud.querySelector("[data-combat-restart]")?.addEventListener("click", async () => {
      if (roundState==="respawn-choice") {resumePlayerAfterDeath();return;}
      if (matchType === "coop" && multiplayer?.getLobby?.()) {
        if (!multiplayer.isHost?.()) return;
        try { await multiplayer.sendEvent("round-restart",{},""); }
        catch { setTransientStatus("Could not restart the team. Check your lobby connection.",2000); return; }
      }
      if (!active) return;
      resetRound({countdown:true});
      options.capture?.();
    });
    stationBuyButton?.addEventListener("click", () => buyNearbyStation());
    setCombatSoundEnabled(soundEnabled);
    hud.querySelector("[data-combat-pause-action='audio']")?.addEventListener("click", () => {
      setCombatSoundEnabled(!soundEnabled);
    });
    hud.querySelector("[data-combat-pause-action='resume']")?.addEventListener("click", () => {
      unlockCombatAudio();
      playCombatSound("pause",.7);
      setPaused(false);
    });
    hud.querySelector("[data-combat-pause-action='exit']")?.addEventListener("click", () => {
      stop();
      options.exitCombat?.();
    });
    hud.querySelector("[data-combat-exit]")?.addEventListener("click", () => {
      stop();
      options.exitCombat?.();
    });

    return {
      start,
      stop,
      restart: resetRound,
      switchWeapon,
      toggleWeapon: () => {
        const loadout = playerLoadout();
        switchWeapon(loadout[(Math.max(0,loadout.indexOf(selectedWeapon))+1)%loadout.length]);
      },
      getMode: () => gameMode,
      getZombieSettings: () => ({ difficulty:zombieDifficulty, runType:zombieRunType, endless:zombieEndless() }),
      isEndlessZombie: () => active && zombieEndless(),
      getCombatSettings: () => ({ difficulty:combatDifficulty, matchType, characterId:selectedCharacterId, weapon:selectedPrimaryWeapon }),
      remotePlayers: () => multiplayer?.remotePlayers?.() || [],
      selectedCharacterId: () => selectedCharacterId,
      isCharacterOccupied: (characterId) => new Set([selectedCharacterId, ...(multiplayer?.remotePlayers?.() || []).map((player) => String(player.characterId || ""))].filter(Boolean)).has(String(characterId || "")),
      multiplayerLobby: () => multiplayer?.getLobby?.() || null,
      isGlassShattered: (machineId, componentId) => shatteredGlass.has(`${machineId}:${componentId}`),
      isExplosiveDestroyed: (id) => destroyedExplosives.has(String(id)),
      glassRevision: () => shatteredGlass.size,
      explosiveRevision: () => destroyedExplosives.size,
      reload: startReload,
      fire,
      setAiming: (enabled) => setAiming(Boolean(enabled)),
      setTriggerHeld,
      handleEscape,
      pause: () => setPaused(true),
      resume: () => setPaused(false),
      isPaused: () => paused,
      isDefeated: () => roundState === "lost",
      isRoundComplete: () => roundState === "won",
      isActive: () => active,
      playerRenderState,
      enemyRenderState,
      combatEffects,
      spawnedEnemyMachines,
      isEnemyDefeated(id) {
        const record = enemies.get(String(id || ""));
        return Boolean(record && record.health <= 0);
      },
      destroy() {
        stop();
        revivePrompt.remove();
        document.removeEventListener("keydown", handleKeyDown, true);
        document.removeEventListener("keyup", handleKeyUp, true);
        document.removeEventListener("mousedown", handleMouseDown, true);
        document.removeEventListener("mouseup", handleMouseUp, true);
        document.removeEventListener("contextmenu", handleContextMenu, true);
        window.removeEventListener("blur", handleBlur);
        multiplayer?.destroy?.();
        hud.remove();
      },
    };
  };
})();