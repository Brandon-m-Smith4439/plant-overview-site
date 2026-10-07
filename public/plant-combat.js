(() => {
  "use strict";

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const SHIELD_MAX = 22;
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
    normal: Object.freeze({ key:"normal", label:"Normal", description:"Clear every zombie currently in the plant. No respawns." }),
    endless: Object.freeze({ key:"endless", label:"Endless", description:"Zombies keep spawning from the plant edges. Survive as long as possible." }),
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
      '<div class="combat-health-panel">',
        '<div class="combat-health-heading"><span>HEALTH</span><strong data-combat-health-value>100</strong></div>',
        '<div class="combat-health-track"><span data-combat-health-bar></span></div>',
        '<div class="combat-shield-heading"><span>SHIELD</span><strong data-combat-shield-value>22</strong></div>',
        '<div class="combat-shield-track"><span data-combat-shield-bar></span></div>',
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
              '<button type="button" data-zombie-run="normal"><b>Normal · Clear Plant</b><small>Kill every zombie. No respawns.</small></button>',
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
        '<div>',
          '<p>COMBAT PAUSED</p>',
          '<h2>Combat options</h2>',
          '<span>Resume the fight or leave Combat Mode. The normal walkthrough menu stays separate.</span>',
          '<div class="combat-pause-actions">',
            '<button type="button" data-combat-pause-action="resume" class="primary">Resume combat</button>',
            '<button type="button" data-combat-pause-action="exit">Exit combat</button>',
          '</div>',
        '</div>',
      '</div>',
      '<div class="combat-weapon-panel">',
        '<div class="combat-weapon-copy">',
          '<span data-combat-slot>PRIMARY</span>',
          '<strong data-combat-weapon>RIFLE</strong>',
          '<small data-combat-status>Ready</small>',
        '</div>',
        '<div class="combat-ammo"><strong data-combat-mag>30</strong><span>/</span><b data-combat-reserve>120</b></div>',
        '<div class="combat-controls">Mouse 1 fire - <b>Right click</b> aim - <b>1/2</b> switch - <b>R</b> reload</div>',
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
          '</div>',
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

    const healthValue = hud.querySelector("[data-combat-health-value]");
    const healthBar = hud.querySelector("[data-combat-health-bar]");
    const shieldValue = hud.querySelector("[data-combat-shield-value]");
    const shieldBar = hud.querySelector("[data-combat-shield-bar]");
    const shieldTrack = hud.querySelector(".combat-shield-track");
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

    const enemies = new Map();
    const ammunition = Object.fromEntries(Object.entries(WEAPONS).map(([key, weapon]) => [key, { magazine: weapon.magazine, reserve: weapon.reserve }]));
    const worldEffects = { tracers: [], impacts: [], bloodBursts: [], bloodPools: [], bloodFountains: [], rockets: [], explosions: [], pickups: [], glassShards: [] };
    const shatteredGlass = new Set();

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
      const primary = PLAYER_PRIMARY_WEAPONS.includes(selectedPrimaryWeapon) ? selectedPrimaryWeapon : modeConfig().defaultWeapon;
      return [primary, "handgun"];
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
      restartButton.disabled = false;
      restartButton.innerHTML = '<span class="combat-restart-icon" aria-hidden="true">↻</span><span class="combat-restart-copy"><strong>Play again</strong><small>Restart ' + modeConfig().label.toLowerCase() + ' mode</small></span>';
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
        y: number(record.machine?.y) + size.h * .54,
        z: number(record.z, number(record.machine?.z)) + size.d / 2,
        radius: clamp(Math.max(size.w, size.d) * .46, .58, 1.35),
      };
    }

    function enemyHitVolumes(record) {
      const size = enemyDimensions(record);
      const baseX = number(record.x, number(record.machine?.x));
      const baseY = number(record.machine?.y);
      const baseZ = number(record.z, number(record.machine?.z));
      const designedHead = options.getEnemyHeadVolume?.(record.machine, baseX, baseZ);
      const fallbackHead = {
        center: { x: baseX + size.w * .5, y: baseY + size.h * .805, z: baseZ + size.d * .5 },
        radius: clamp(Math.min(size.w, size.d) * .31, .38, .62),
      };
      const head = designedHead?.center && Number.isFinite(number(designedHead.radius, NaN))
        ? { center:{ x:number(designedHead.center.x), y:number(designedHead.center.y), z:number(designedHead.center.z) }, radius:clamp(number(designedHead.radius), .32, .78) }
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
      record.nextShotAt = 0;
      record.alerted = false;
      record.lastSeenAt = 0;
      record.lastKnownPlayerX = record.x;
      record.lastKnownPlayerZ = record.z;
      record.aimLockUntil = 0;
      record.killerRevealUntil = 0;
      record.movementBlend = .16;
      record.walkPhase = unit * Math.PI * 2;
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
      return record;
    }

    function syncEnemies(reset = false) {
      const excludedCharacters = new Set([selectedCharacterId, ...(multiplayer?.remotePlayers?.() || []).map((player) => String(player.characterId || ""))].filter(Boolean));
      const source = matchType === "private" ? [] : (Array.isArray(options.getEnemies?.()) ? options.getEnemies().filter((machine, index) => !excludedCharacters.has(enemyId(machine, index))) : []);
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

    function spawnZombie(now = performance.now()) {
      if (!active || gameMode !== "zombie") return null;
      const excludedCharacters=new Set([selectedCharacterId,...(multiplayer?.remotePlayers?.()||[]).map((player)=>String(player.characterId||""))].filter(Boolean));
      const templates = Array.isArray(options.getEnemies?.()) ? options.getEnemies().filter((machine,index) => machine && !excludedCharacters.has(enemyId(machine,index))) : [];
      const template = templates.length ? templates[zombieSpawnSerial % templates.length] : null;
      if (!template) return null;
      const id = `zombie-spawn-${++zombieSpawnSerial}`;
      const machine = {
        ...template,
        id, instanceId:id, name:`Zombie ${zombieSpawnSerial}`, short:"Zombie",
        visible:true, locked:true, showLabel:false, collisionMode:"ignore", combatSpawned:true,
      };
      const record = { id, synthetic:true };
      resetEnemyRecord(record, machine, zombieSpawnSerial);
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

    function zombieAliveCap(now) {
      const elapsed = Math.max(0, (now - (roundStartedAt || now)) / 1000);
      const cap = (12 + Math.floor(elapsed / 35) * 2) * zombieDifficultyConfig().aliveCap;
      return Math.min(38, Math.max(6, Math.round(cap)));
    }

    function cleanupZombieCorpses(now) {
      if (gameMode !== "zombie") return;
      for (const [id, enemy] of enemies.entries()) {
        if (!enemy.synthetic || enemy.health > 0 || !enemy.defeatedAt) continue;
        if (now - enemy.defeatedAt > 5200) enemies.delete(id);
      }
    }

    function updateZombieSpawns(now) {
      if (!zombieEndless() || roundState !== "playing") return;
      const elapsed = Math.max(0, (now - (roundStartedAt || now)) / 1000);
      const interval = Math.max(850, (3200 - elapsed * 5.5) * zombieDifficultyConfig().spawnRate);
      if (nextZombieSpawnAt <= 0) nextZombieSpawnAt = now + 900;
      if (now < nextZombieSpawnAt || aliveEnemies().length >= zombieAliveCap(now)) return;
      spawnZombie(now);
      nextZombieSpawnAt = now + interval * (.78 + Math.random() * .42);
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

    function markEnemyDefeated(enemy, now, impactDirection = null) {
      if (!enemy || enemy.defeatedAt > 0) return;
      enemy.health = 0;
      enemy.defeatedAt = now;
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

    function resolveExplosionDamage(now) {
      const player = options.getPlayer?.();
      if (!player) return;
      for (const explosion of worldEffects.explosions) {
        if (explosion.resolved || now < explosion.startAt) continue;
        explosion.resolved = true;
        const distance = Math.hypot(number(player.x)-explosion.point.x, number(player.y,5.5)-explosion.point.y, number(player.z)-explosion.point.z);
        if (distance > explosion.radius) continue;
        const sourceEnemy = enemies.get(String(explosion.sourceEnemyId||""));
        const playerPoint = {x:number(player.x),y:number(player.y,5.5),z:number(player.z)};
        if (!hasLineOfSight({x:explosion.point.x,y:explosion.point.y+.2,z:explosion.point.z},playerPoint)) continue;
        const falloff = clamp(1-distance/Math.max(.1,explosion.radius),.18,1);
        const base = explosion.damageMin + Math.random()*Math.max(0,explosion.damageMax-explosion.damageMin);
        damagePlayer(base*falloff, sourceEnemy, player);
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
        const candidates = [
          { zone: "head", distance: headDistance },
          { zone: "body", distance: bodyDistance },
        ];
        for (const candidate of candidates) {
          if (!Number.isFinite(candidate.distance) || candidate.distance > bestDistance || candidate.distance >= wallDistance - .05) continue;
          best = { enemy, zone: candidate.zone };
          bestDistance = candidate.distance;
        }
      }
      return best ? { ...best, distance: bestDistance } : null;
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
        if (baseY > size.h || baseY + height < .15) continue;
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
      } else if (now - enemy.lastSeenAt < 1600) {
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

      const length = Math.hypot(moveX, moveZ);
      const step = length > .001 ? Math.min(1.1, speed * deltaSeconds) : 0;
      const moved = step > 0 ? tryMoveEnemy(enemy, moveX / length * step, moveZ / length * step) : false;

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
      enemy.walkPhase += deltaSeconds * (moved ? 8.5 * enemy.speedBias : .8);
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
        muzzleFlash: now < playerMuzzleUntil,
        recoilProgress,
        reloading,
        reloadProgress,
        moving: Boolean(player.moving),
        sprinting: Boolean(player.sprinting),
        engaged: Boolean(player.engaged),
        aiming,
        scopeActive: aiming && Boolean(currentWeapon().scope),
        gameMode,
        defeated: roundState === "lost",
        deathProgress,
      };
    }

    function setAiming(next) {
      const allowed = active && !paused && roundState === "playing" && !reloading && !currentWeapon().melee;
      aiming = Boolean(next && allowed);
      frame.classList.toggle("combat-aiming", aiming);
      if (scopeOverlay) scopeOverlay.hidden = !(aiming && Boolean(currentWeapon().scope));
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

    function showDamage() {
      damageVignette?.classList.remove("visible");
      void damageVignette?.offsetWidth;
      damageVignette?.classList.add("visible");
      window.setTimeout(() => damageVignette?.classList.remove("visible"), 190);
    }

    function syncHud() {
      const weapon = currentWeapon();
      const ammo = currentAmmo();
      const all = [...enemies.values()];
      const alive = all.filter((enemy) => enemy.health > 0).length;
      if (healthValue) healthValue.textContent = String(Math.max(0, Math.ceil(playerHealth)));
      if (healthBar) healthBar.style.width = clamp(playerHealth, 0, 100) + "%";
      if (shieldValue) shieldValue.textContent = String(Math.max(0, Math.ceil(playerShield)));
      if (shieldBar) shieldBar.style.width = (clamp(playerShield, 0, SHIELD_MAX) / SHIELD_MAX * 100) + "%";
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
      if (slotCopy) slotCopy.textContent = selectedWeapon === playerLoadout()[0] ? "PRIMARY" : "SECONDARY";
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
      if (statusCopy && !reloading && performance.now() >= transientStatusUntil) statusCopy.textContent = "Ready";
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
        if (pauseOverlay) pauseOverlay.hidden = false;
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
      if (["lost","won"].includes(roundState)) return true;
      if (paused && reason === "pointer-lock-released") return true;
      return setPaused(!paused);
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

    function finishRound(kind, killer = null, player = null) {
      const endedAt = performance.now();
      roundState = kind;
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
      setTransientStatus(next === playerLoadout()[0] ? "Primary equipped" : "Secondary equipped", 650);
      syncHud();
    }

    function startReload() {
      if (!active || reloading || roundState !== "playing") return;
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
        if (headshot) headshotKills += 1;
        else regularKills += 1;
      } else if (target.enemy.health > 0) {
        triggerCombatRoll(target.enemy, now, headshot ? .18 : .46);
      }
      pushBloodBurst(target.enemy, finalPoint, now, defeated);
      if (matchType === "coop" && multiplayer?.getLobby?.()) {
        multiplayer.sendEvent?.("enemy-hit",{enemyId:target.enemy.id,damage:appliedDamage,headshot},"").catch(()=>{});
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
      const ads = Boolean(weapon?.scope && isAiming);
      const forwardOffset = weapon?.key === "chainsaw" ? 1.05 : weapon?.key === "rocket" ? 1.22 : weapon?.key === "sniper" ? 1.72 : weapon?.key === "shotgun" ? 1.46 : weapon?.key === "handgun" ? .94 : (ads ? 1.66 : 1.34);
      const rightOffset = weapon?.key === "chainsaw" ? .2 : weapon?.key === "rocket" ? .3 : weapon?.key === "sniper" ? (ads ? .03 : .36) : weapon?.key === "shotgun" ? .18 : weapon?.key === "handgun" ? .28 : (ads ? .06 : .42);
      const upOffset = weapon?.key === "chainsaw" ? -.34 : weapon?.key === "rocket" ? -.22 : weapon?.key === "sniper" ? (ads ? -.11 : -.28) : weapon?.key === "shotgun" ? -.20 : weapon?.key === "handgun" ? -.24 : (ads ? -.13 : -.30);
      return {
        x: origin.x + direction.x * forwardOffset + right.x * rightOffset + up.x * upOffset,
        y: origin.y + direction.y * forwardOffset + right.y * rightOffset + up.y * upOffset,
        z: origin.z + direction.z * forwardOffset + right.z * rightOffset + up.z * upOffset,
      };
    }

    function fire() {
      if (!active || reloading || roundState !== "playing") return;
      const player = options.getPlayer?.();
      if (!player?.engaged) return;
      const now = performance.now();
      const weapon = currentWeapon();
      const ammo = currentAmmo();
      if (now < nextPlayerShotAt) return;
      nextPlayerShotAt = now + weapon.fireInterval;
      if (!weapon.noAmmo && ammo.magazine <= 0) { startReload(); return; }
      if (!weapon.noAmmo) ammo.magazine -= 1;
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
        if (matchType === "private" && remoteTarget && remoteTarget.distance <= worldImpact.distance + .05) {
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
        if (defeatedHit && aliveEnemies().length === 0 && enemies.size > 0 && (gameMode !== "zombie" || zombieRunType === "normal")) scheduleVictory();
      }
      if (weapon.key === "shotgun") {
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
      } else if (shieldTrack) {
        shieldTrack.classList.remove("hit");
        void shieldTrack.offsetWidth;
        shieldTrack.classList.add("hit");
        window.setTimeout(() => shieldTrack.classList.remove("hit"), 220);
      }
      showIncomingDirection(enemy, player, true);
      const sourceName = String(enemy?.machine?.name || "Enemy");
      if (absorbed > 0 && playerShield <= 0) setTransientStatus("Shield broken - " + sourceName, 800);
      else if (absorbed > 0 && healthDamage <= 0) setTransientStatus("Shield hit - " + sourceName, 520);
      else setTransientStatus("Incoming fire - " + sourceName, 600);
      if (playerHealth <= 0) finishRound("lost", enemy, player);
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
      const shotDuration = loadout.melee ? 360 : loadout.explosive ? 390 : loadout.key === "sniper" ? 320 : 230;
      enemy.shotStartedAt = now;
      enemy.shotEndsAt = now + shotDuration;
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
      syncEnemies(false);
      if (coopFollower()) {
        applyHostEnemySyncState(multiplayer?.getLobby?.());
        lastFrameAt=now;
        lastThreatCount=aliveEnemies().length;
        syncHud();
        return;
      }
      const deltaSeconds = lastFrameAt > 0 ? clamp((now - lastFrameAt) / 1000, 0, .06) : 1 / 60;
      lastFrameAt = now;
      if (!player?.engaged || roundState !== "playing") {
        lastThreatCount = 0;
        aliveEnemies().forEach((enemy) => {
          enemy.movementBlend += (.14 - enemy.movementBlend) * Math.min(1, deltaSeconds * 6);
          enemy.walkPhase += deltaSeconds * 1.4;
        });
        syncHud();
        return;
      }

      const playerTarget = { x: number(player.x), y: number(player.y, 5.5), z: number(player.z) };
      let threats = 0;
      for (const enemy of aliveEnemies()) {
        let source = enemyCenter(enemy);
        let distance = Math.hypot(playerTarget.x - source.x, playerTarget.y - source.y, playerTarget.z - source.z);
        const loadout = ENEMY_WEAPONS[enemy.weaponKey] || ENEMY_WEAPONS.rifle;
        let reloading = updateEnemyReload(enemy, loadout, now);
        if (!loadout.melee && !reloading && enemy.ammoInMagazine <= 0 && now >= enemy.nextShotAt) {
          reloading = beginEnemyReload(enemy, loadout, now);
        }
        const sightRange = loadout.sightRange || Math.max(loadout.range + 22, 42);
        let lineOfSight = distance <= sightRange && hasLineOfSight(source, playerTarget);
        updateEnemyMotion(enemy, playerTarget, now, deltaSeconds, lineOfSight);

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
        if (!reloading && now >= enemy.nextShotAt) fireEnemy(enemy, playerTarget, distance, now);
      }
      lastThreatCount = threats;
      syncHud();
    }

    function resetRound({ countdown = false } = {}) {
      if (victoryTimer) window.clearTimeout(victoryTimer);
      victoryTimer = 0;
      playerHealth = 100;
      lastLocalSyncSample = null;
      playerShield = SHIELD_MAX;
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
      worldEffects.pickups.length = 0;
      lastDamageAt = 0;
      lastShieldUpdateAt = 0;
      paused = false;
      pausedAt = 0;
      selectedWeapon = selectedPrimaryWeapon;
      regularKills = 0;
      headshotKills = 0;
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
      if (zombieEndless() && matchType !== "private") {
        const initialExtra = Math.max(0, Math.round(zombieDifficultyConfig().initialExtra ?? ZOMBIE_INITIAL_EXTRA));
        for (let index=0; index<initialExtra; index+=1) spawnZombie(performance.now());
      }
      if (roundOverlay) {
        roundOverlay.hidden = true;
        roundOverlay.classList.remove("killer-reveal", "victory");
      }
      if (killerReveal) killerReveal.hidden = true;
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
        setTransientStatus(gameMode === "zombie" ? (zombieEndless() ? "Survive! Zombies will keep spawning." : "Clear the plant! No respawns.") : "Fight!", 1000);
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
      updatePlayerShield(now);
      resolveExplosionDamage(now);
      if (!updateCountdown(now)) {
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

    function exportEnemySyncState() {
      return [...enemies.values()].map((enemy) => ({
        id:String(enemy.id || ""), x:number(enemy.x), z:number(enemy.z), rotationY:number(enemy.rotationY),
        health:Math.max(0,number(enemy.health)), weaponKey:String(enemy.weaponKey || "rifle"),
        movementBlend:clamp(number(enemy.movementBlend,.08),0,1), walkPhase:number(enemy.walkPhase),
        synthetic:Boolean(enemy.synthetic), defeatedAt:number(enemy.defeatedAt),
        machine:{
          name:String(enemy.machine?.name || (enemy.synthetic ? "Zombie" : "Enemy")),
          w:Math.max(.4,number(enemy.machine?.w,1.8)), d:Math.max(.4,number(enemy.machine?.d,1.8)),
          h:Math.max(1,number(enemy.machine?.h,6.5)), y:number(enemy.machine?.y),
        },
      }));
    }

    function applyHostEnemySyncState(lobby = multiplayer?.getLobby?.()) {
      if (!coopFollower() || !lobby) return false;
      const host=(lobby.players||[]).find((player) => player.id===lobby.hostId);
      const snapshots=Array.isArray(host?.state?.enemies) ? host.state.enemies : null;
      if (!snapshots) return false;
      syncEnemies(false);
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
            w:Math.max(.4,number(snapshot.machine?.w,1.8)),d:Math.max(.4,number(snapshot.machine?.d,1.8)),h:Math.max(1,number(snapshot.machine?.h,6.5)),visible:true,
          };
          enemy={id};
          enemies.set(id,enemy);
          resetEnemyRecord(enemy,machine,enemies.size);
          enemy.synthetic=Boolean(snapshot.synthetic || !base);
        }
        enemy.x=number(snapshot.x,enemy.x); enemy.z=number(snapshot.z,enemy.z);
        enemy.rotationY=number(snapshot.rotationY,enemy.rotationY); enemy.health=Math.max(0,number(snapshot.health,enemy.health));
        enemy.weaponKey=String(snapshot.weaponKey || enemy.weaponKey || "rifle"); enemy.weaponLabel=ENEMY_WEAPONS[enemy.weaponKey]?.label || enemy.weaponLabel || "Rifle";
        enemy.movementBlend=clamp(number(snapshot.movementBlend,enemy.movementBlend),0,1); enemy.walkPhase=number(snapshot.walkPhase,enemy.walkPhase);
        enemy.synthetic=Boolean(snapshot.synthetic);
        if (enemy.health<=0) {
          enemy.defeatedAt=number(snapshot.defeatedAt,enemy.defeatedAt || performance.now());
          enemy.deathAnimationStartedAt=enemy.deathAnimationStartedAt || enemy.defeatedAt;
        }
      }
      [...enemies.entries()].forEach(([id,enemy]) => { if (enemy.synthetic && !seen.has(id)) enemies.delete(id); });
      const sharedGlass=Array.isArray(host?.state?.glass) ? host.state.glass : [];
      sharedGlass.forEach((glassId) => shatteredGlass.add(String(glassId || "")));
      return true;
    }

    function multiplayerEvent(event,lobby) {
      if (!event) return;
      if (event.type === "player-hit" && event.targetId === multiplayer?.playerId && matchType === "private" && roundState === "playing") {
        const sender=(lobby?.players||[]).find((player) => player.id===event.senderId);
        const state=sender?.state || {};
        const killerWeaponKey=String(event.payload?.weapon || state.weapon || "rifle");
        const fakeEnemy={ id:event.senderId, x:number(state.x)-.9, z:number(state.z)-.9, weaponKey:killerWeaponKey, weaponLabel:WEAPONS[killerWeaponKey]?.shortLabel || ENEMY_WEAPONS[killerWeaponKey]?.label || "Weapon", machine:{name:sender?.name||"Opponent",x:number(state.x)-.9,y:0,z:number(state.z)-.9,w:1.8,d:1.8,h:6.5} };
        damagePlayer(number(event.payload?.damage),fakeEnemy,options.getPlayer?.());
        return;
      }
      if (event.type === "glass-shatter" && matchType === "coop") {
        applyGlassShatterPayload(event.payload, performance.now(), false);
        return;
      }
      if (event.type === "enemy-hit" && matchType === "coop" && roundState === "playing") {
        if (!multiplayer?.isHost?.()) return;
        const enemy=enemies.get(String(event.payload?.enemyId || ""));
        if (!enemy || enemy.health <= 0) return;
        const damage=Math.max(0,number(event.payload?.damage));
        enemy.health=Math.max(0,enemy.health-damage);
        enemy.hitReactUntil=performance.now()+180;
        if (enemy.health<=0) markEnemyDefeated(enemy,performance.now());
      }
    }

    function multiplayerUpdate(lobby) {
      syncLobbyUi(lobby);
      if (!active || !lobby) return;
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
        health:playerHealth,shield:playerShield,weapon:roundState === "setup" ? selectedPrimaryWeapon : selectedWeapon,alive:roundState!=="lost",kills:regularKills+headshotKills,headshots:headshotKills,
      };
      if (matchType === "coop" && multiplayer?.isHost?.() && roundState !== "setup") {
        state.enemies=exportEnemySyncState();
        state.glass=[...shatteredGlass];
      }
      return state;
    }

    function findRemotePlayerTarget(origin,direction,range) {
      if (matchType !== "private" || !multiplayer) return null;
      let best=null,bestDistance=range;
      for (const player of multiplayer.remotePlayers?.() || []) {
        const state=player.state || {};
        if (state.alive === false || number(state.health,100)<=0) continue;
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
      options.onStateChange?.(false, gameMode);
      options.invalidate?.();
    }

    function handleKeyDown(event) {
      if (!active || roundState === "setup") return;
      if (event.target?.matches?.("input, select, textarea, [contenteditable='true']")) return;
      if (event.code === "Digit1") {
        event.preventDefault();
        switchWeapon(playerLoadout()[0]);
      } else if (event.code === "Digit2") {
        event.preventDefault();
        switchWeapon(playerLoadout()[1]);
      } else if (event.code === "KeyR") {
        event.preventDefault();
        startReload();
      }
    }

    function handleMouseDown(event) {
      if (!active || paused || ["lost","won"].includes(roundState) || options.isPointerLocked?.() !== true) return;
      if (event.button === 2) { event.preventDefault(); setAiming(true); return; }
      if (event.button !== 0) return;
      event.preventDefault();
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
      if (!active || paused || ["lost", "won"].includes(roundState)) return;
      if (currentWeapon().automatic) mouseHeld = true;
      fire();
    }

    function handleBlur() {
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

    hud.querySelector("[data-combat-restart]")?.addEventListener("click", () => {
      resetRound({ countdown: true });
      options.capture?.();
    });
    hud.querySelector("[data-combat-pause-action='resume']")?.addEventListener("click", () => setPaused(false));
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
        switchWeapon(selectedWeapon === loadout[0] ? loadout[1] : loadout[0]);
      },
      getMode: () => gameMode,
      getZombieSettings: () => ({ difficulty:zombieDifficulty, runType:zombieRunType, endless:zombieEndless() }),
      getCombatSettings: () => ({ difficulty:combatDifficulty, matchType, characterId:selectedCharacterId, weapon:selectedPrimaryWeapon }),
      remotePlayers: () => multiplayer?.remotePlayers?.() || [],
      selectedCharacterId: () => selectedCharacterId,
      isCharacterOccupied: (characterId) => new Set([selectedCharacterId, ...(multiplayer?.remotePlayers?.() || []).map((player) => String(player.characterId || ""))].filter(Boolean)).has(String(characterId || "")),
      multiplayerLobby: () => multiplayer?.getLobby?.() || null,
      isGlassShattered: (machineId, componentId) => shatteredGlass.has(`${machineId}:${componentId}`),
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
        document.removeEventListener("keydown", handleKeyDown, true);
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