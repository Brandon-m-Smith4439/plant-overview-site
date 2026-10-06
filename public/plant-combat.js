(() => {
  "use strict";

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const SHIELD_MAX = 45;
  const SHIELD_RECHARGE_DELAY_MS = 2800;
  const SHIELD_RECHARGE_PER_SECOND = 11;

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
    }),
    handgun: Object.freeze({
      key: "handgun",
      shortLabel: "Handgun",
      magazine: 15,
      reserve: 60,
      damage: 55,
      range: 140,
      fireInterval: 280,
      reloadMs: 1250,
      automatic: false,
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
        '<div class="combat-mode-badge"><span></span> OWNER COMBAT MODE</div>',
        '<div class="combat-enemy-counter" data-combat-enemies>Enemies 0 / 0</div>',
      '</div>',
      '<div class="combat-health-panel">',
        '<div class="combat-health-heading"><span>HEALTH</span><strong data-combat-health-value>100</strong></div>',
        '<div class="combat-health-track"><span data-combat-health-bar></span></div>',
        '<div class="combat-shield-heading"><span>SHIELD</span><strong data-combat-shield-value>45</strong></div>',
        '<div class="combat-shield-track"><span data-combat-shield-bar></span></div>',
        '<small data-combat-threat>No threats in sight</small>',
      '</div>',
      '<div class="combat-hitmarker" data-combat-hitmarker aria-hidden="true"><i></i><i></i><i></i><i></i></div>',
      '<div class="combat-damage-vignette" data-combat-damage aria-hidden="true"></div>',
      '<div class="combat-countdown" data-combat-countdown hidden>',
        '<span>COMBAT STARTS IN</span>',
        '<strong data-combat-countdown-value>2</strong>',
      '</div>',
      '<div class="combat-damage-directions" data-combat-damage-directions aria-hidden="true"></div>',
      '<div class="combat-direction-callout" data-combat-direction-callout hidden><strong></strong><span></span></div>',
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
        '<div class="combat-controls">Mouse 1 fire - <b>1</b> rifle - <b>2</b> handgun - <b>R</b> reload</div>',
      '</div>',
      '<div class="combat-round-overlay" data-combat-round hidden>',
        '<div>',
          '<p data-combat-round-kicker>ROUND COMPLETE</p>',
          '<h2 data-combat-round-title>Plant secured</h2>',
          '<span data-combat-round-copy>All enemy AI has been defeated.</span>',
          '<div class="combat-killer-reveal" data-combat-killer hidden>',
            '<span>ELIMINATED BY</span>',
            '<strong data-combat-killer-name>Enemy</strong>',
            '<small data-combat-killer-detail></small>',
          '</div>',
          '<div class="combat-round-actions" data-combat-round-actions>',
            '<button type="button" data-combat-restart>Restart combat</button>',
            '<button type="button" data-combat-exit>Exit combat</button>',
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
    const threatCopy = hud.querySelector("[data-combat-threat]");
    const weaponCopy = hud.querySelector("[data-combat-weapon]");
    const slotCopy = hud.querySelector("[data-combat-slot]");
    const statusCopy = hud.querySelector("[data-combat-status]");
    const magazineCopy = hud.querySelector("[data-combat-mag]");
    const reserveCopy = hud.querySelector("[data-combat-reserve]");
    const damageDirections = hud.querySelector("[data-combat-damage-directions]");
    const directionCallout = hud.querySelector("[data-combat-direction-callout]");
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

    const enemies = new Map();
    const ammunition = {
      rifle: { magazine: WEAPONS.rifle.magazine, reserve: WEAPONS.rifle.reserve },
      handgun: { magazine: WEAPONS.handgun.magazine, reserve: WEAPONS.handgun.reserve },
    };

    let active = false;
    let playerHealth = 100;
    let playerShield = SHIELD_MAX;
    let lastDamageAt = 0;
    let lastShieldUpdateAt = 0;
    let paused = false;
    let pausedAt = 0;
    let selectedWeapon = "rifle";
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

    function currentWeapon() {
      return WEAPONS[selectedWeapon];
    }

    function currentAmmo() {
      return ammunition[selectedWeapon];
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
        y: number(record.machine?.y) + size.h * .62,
        z: number(record.z, number(record.machine?.z)) + size.d / 2,
        radius: clamp(Math.max(size.w, size.d) * .55, .75, 2.2),
      };
    }

    function resetEnemyRecord(record, machine, index) {
      const unit = stableUnit(record.id || enemyId(machine, index));
      record.machine = machine;
      record.health = 100;
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
      record.hitReactUntil = 0;
      record.defeatedAt = 0;
      record.deathDirection = unit > .5 ? 1 : -1;
      record.tracerUntil = 0;
      record.tracerTarget = null;
      record.strafeSign = unit > .5 ? 1 : -1;
      record.speedBias = .86 + unit * .3;
      return record;
    }

    function syncEnemies(reset = false) {
      const source = Array.isArray(options.getEnemies?.()) ? options.getEnemies() : [];
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
      [...enemies.keys()].forEach((id) => {
        if (!seen.has(id)) enemies.delete(id);
      });
      return [...enemies.values()];
    }

    function aliveEnemies() {
      return [...enemies.values()].filter((enemy) => enemy.health > 0);
    }

    function nearestObstacleDistance(origin, direction, maximumDistance) {
      const obstacles = Array.isArray(options.getOccluders?.()) ? options.getOccluders() : [];
      let nearest = maximumDistance;
      for (const obstacle of obstacles) {
        const distance = rayAabb(origin, direction, obstacle, nearest);
        if (Number.isFinite(distance) && distance < nearest) nearest = distance;
      }
      return nearest;
    }

    function hasLineOfSight(from, to) {
      const delta = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
      const distance = Math.hypot(delta.x, delta.y, delta.z);
      if (distance <= .01) return true;
      const direction = normalizeDirection(delta);
      return nearestObstacleDistance(from, direction, distance) >= distance - .45;
    }

    function findTarget(origin, direction, range) {
      const wallDistance = nearestObstacleDistance(origin, direction, range);
      let best = null;
      let bestDistance = range;
      for (const enemy of aliveEnemies()) {
        const center = enemyCenter(enemy);
        const distance = raySphere(origin, direction, center, center.radius);
        if (!Number.isFinite(distance) || distance > bestDistance || distance >= wallDistance - .05) continue;
        best = enemy;
        bestDistance = distance;
      }
      return best ? { enemy: best, distance: bestDistance } : null;
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
      let speed = 3.2 * enemy.speedBias;
      let desiredRotation = enemy.rotationY;
      let aimLocked = false;

      if (lineOfSight) {
        enemy.lastSeenAt = now;
        enemy.lastKnownPlayerX = playerTarget.x;
        enemy.lastKnownPlayerZ = playerTarget.z;
        enemy.aimLockUntil = Math.max(enemy.aimLockUntil, now + 320);
        desiredRotation = faceAngle(center, playerTarget);
        aimLocked = true;
        if (distance > 46) {
          moveX = towardX * .82 + strafeX * .28;
          moveZ = towardZ * .82 + strafeZ * .28;
          speed = 4.7 * enemy.speedBias;
        } else if (distance < 17) {
          moveX = -towardX * .72 + strafeX * .58;
          moveZ = -towardZ * .72 + strafeZ * .58;
          speed = 4.1 * enemy.speedBias;
        } else {
          moveX = strafeX;
          moveZ = strafeZ;
          speed = 3.7 * enemy.speedBias;
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
          speed = 3.15 * enemy.speedBias;
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
        speed = 2.35 * enemy.speedBias;
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
      const deathProgress = defeated ? clamp((now - enemy.defeatedAt) / 650, 0, 1) : 0;
      const hitReact = !defeated && now < enemy.hitReactUntil
        ? clamp((enemy.hitReactUntil - now) / 220, 0, 1)
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
        hitReact,
        defeated,
        deathProgress,
        deathDirection: enemy.deathDirection || 1,
        tracerTarget: now < enemy.tracerUntil ? enemy.tracerTarget : null,
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
      let relative = worldAngle - number(player.yaw);
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
        defeated: roundState === "lost",
        deathProgress,
      };
    }

    function showHitmarker(defeated = false) {
      hitmarker?.classList.remove("visible", "defeated");
      void hitmarker?.offsetWidth;
      hitmarker?.classList.add("visible");
      if (defeated) hitmarker?.classList.add("defeated");
      window.setTimeout(() => hitmarker?.classList.remove("visible", "defeated"), 130);
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
      if (enemyCounter) enemyCounter.textContent = "Enemies " + alive + " / " + all.length;
      if (slotCopy) slotCopy.textContent = selectedWeapon === "rifle" ? "PRIMARY" : "SECONDARY";
      if (weaponCopy) weaponCopy.textContent = weapon.shortLabel.toUpperCase();
      if (magazineCopy) magazineCopy.textContent = String(ammo.magazine);
      if (reserveCopy) reserveCopy.textContent = String(ammo.reserve);
      frame.classList.toggle("combat-under-fire", lastThreatCount > 0);
      if (threatCopy) {
        threatCopy.textContent = all.length === 0
          ? "No person / team-member machines found"
          : lastThreatCount > 0
            ? String(lastThreatCount) + (lastThreatCount === 1 ? " enemy has" : " enemies have") + " line of sight"
            : "No threats in sight";
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
        for (const key of ["nextHeadingAt","nextShotAt","firingUntil","muzzleFlashUntil","recoilUntil","hitReactUntil","tracerUntil","aimLockUntil","blockedUntil"]) {
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

    function finishRound(kind, killer = null, player = null) {
      roundState = kind;
      paused = false;
      pausedAt = 0;
      mouseHeld = false;
      lastThreatCount = 0;
      frame.classList.remove("combat-paused");
      if (pauseOverlay) pauseOverlay.hidden = true;
      options.hideWalkMenu?.();
      options.setMovementLocked?.(true);
      syncHud();
      if (!roundOverlay) return;
      const revealSerial = ++roundRevealSerial;
      if (kind === "won") {
        playerDeathStartedAt = 0;
        frame.classList.remove("combat-death-cinematic");
        options.resetDeathCinematic?.();
        roundOverlay.hidden = false;
        roundOverlay.classList.remove("killer-reveal");
        options.releasePointer?.();
        roundActions?.classList.remove("locked");
        if (restartButton) {
          restartButton.disabled = false;
          restartButton.textContent = "Restart combat";
        }
        if (killerReveal) killerReveal.hidden = true;
        if (roundKicker) roundKicker.textContent = "ROUND COMPLETE";
        if (roundTitle) roundTitle.textContent = "Plant secured";
        if (roundCopy) roundCopy.textContent = "All enemy AI has been defeated.";
      } else {
        const source = killer ? enemyCenter(killer) : null;
        const killerLabel = String(killer?.machine?.name || "Enemy");
        const distance = source && player
          ? Math.hypot(source.x - number(player.x), source.z - number(player.z))
          : 0;
        playerDeathStartedAt = performance.now();
        playerDeathDuration = 5000;
        frame.classList.add("combat-death-cinematic");
        if (killer) killer.killerRevealUntil = playerDeathStartedAt + 6500;
        if (killerReveal) killerReveal.hidden = false;
        if (killerName) killerName.textContent = killerLabel;
        if (killerDetail) killerDetail.textContent = distance > 0 ? Math.round(distance) + " ft away" : "Last attacker";
        if (roundKicker) roundKicker.textContent = "PLAYER DOWN";
        if (roundTitle) roundTitle.textContent = "Killed by " + killerLabel;
        if (roundCopy) roundCopy.textContent = "Death replay complete. Restart when ready.";
        if (restartButton) {
          restartButton.disabled = false;
          restartButton.textContent = "Restart combat";
        }
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
      if (!WEAPONS[next] || selectedWeapon === next || !active || roundState !== "playing") return;
      reloadSerial += 1;
      reloading = false;
      reloadStartedAt = 0;
      reloadEndsAt = 0;
      selectedWeapon = next;
      mouseHeld = false;
      nextPlayerShotAt = performance.now() + 120;
      setTransientStatus(next === "rifle" ? "Primary equipped" : "Secondary equipped", 650);
      syncHud();
    }

    function startReload() {
      if (!active || reloading || roundState !== "playing") return;
      const weapon = currentWeapon();
      const ammo = currentAmmo();
      if (ammo.magazine >= weapon.magazine || ammo.reserve <= 0) {
        setTransientStatus(ammo.reserve <= 0 ? "No reserve ammo" : "Magazine full");
        return;
      }
      reloading = true;
      mouseHeld = false;
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

    function fire() {
      if (!active || reloading || roundState !== "playing") return;
      const player = options.getPlayer?.();
      if (!player?.engaged) return;
      const now = performance.now();
      const weapon = currentWeapon();
      const ammo = currentAmmo();
      if (now < nextPlayerShotAt) return;
      nextPlayerShotAt = now + weapon.fireInterval;
      if (ammo.magazine <= 0) {
        startReload();
        return;
      }
      ammo.magazine -= 1;
      playerRecoilUntil = now + Math.max(90, weapon.fireInterval * .9);
      playerMuzzleUntil = now + 68;

      const origin = { x: number(player.x), y: number(player.y, 5.5), z: number(player.z) };
      const direction = directionFromCamera(player);
      const target = findTarget(origin, direction, weapon.range);
      if (target) {
        target.enemy.health = Math.max(0, target.enemy.health - weapon.damage);
        target.enemy.hitReactUntil = now + 220;
        const defeated = target.enemy.health <= 0;
        if (defeated) target.enemy.defeatedAt = now;
        showHitmarker(defeated);
        setTransientStatus(defeated ? "Enemy down" : "Hit", defeated ? 950 : 420);
        if (defeated && aliveEnemies().length === 0 && enemies.size > 0) finishRound("won");
      }
      if (ammo.magazine <= 0 && ammo.reserve > 0) setTransientStatus("Magazine empty - R to reload", 1300);
      syncHud();
      options.invalidate?.();
    }

    function damagePlayer(amount, enemy, player) {
      if (!active || paused || roundState !== "playing") return;
      const now = performance.now();
      const incoming = Math.max(0, number(amount));
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

    function fireEnemy(enemy, playerTarget, distance, now) {
      const source = enemyCenter(enemy);
      enemy.rotationY = faceAngle(source, playerTarget);
      enemy.lastSeenAt = now;
      enemy.lastKnownPlayerX = playerTarget.x;
      enemy.lastKnownPlayerZ = playerTarget.z;
      enemy.aimLockUntil = now + 520;
      enemy.firingUntil = now + 150;
      enemy.muzzleFlashUntil = now + 85;
      enemy.recoilUntil = now + 180;
      enemy.nextShotAt = now + 720 + stableUnit(enemy.id + ":" + Math.floor(now / 500)) * 820;
      const hitChance = clamp(.78 - distance / 225, .24, .7);
      const hit = Math.random() <= hitChance;
      const missScale = hit ? 0 : 3.5 + Math.random() * 5;
      enemy.tracerTarget = {
        x: playerTarget.x + (Math.random() - .5) * missScale,
        y: playerTarget.y + (Math.random() - .5) * missScale * .32,
        z: playerTarget.z + (Math.random() - .5) * missScale,
      };
      enemy.tracerUntil = now + 180;
      const player = options.getPlayer?.() || playerTarget;
      if (hit) {
        damagePlayer(6 + Math.random() * 7, enemy, player);
      } else {
        showIncomingDirection(enemy, player, false);
        setTransientStatus("Incoming fire", 320);
      }
    }

    function updateEnemyAi(now) {
      const player = options.getPlayer?.();
      syncEnemies(false);
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
        let lineOfSight = distance <= 145 && hasLineOfSight(source, playerTarget);
        updateEnemyMotion(enemy, playerTarget, now, deltaSeconds, lineOfSight);

        source = enemyCenter(enemy);
        distance = Math.hypot(playerTarget.x - source.x, playerTarget.y - source.y, playerTarget.z - source.z);
        lineOfSight = distance <= 125 && hasLineOfSight(source, playerTarget);
        enemy.alerted = lineOfSight;
        if (!lineOfSight) continue;

        threats += 1;
        enemy.lastSeenAt = now;
        enemy.lastKnownPlayerX = playerTarget.x;
        enemy.lastKnownPlayerZ = playerTarget.z;
        enemy.aimLockUntil = Math.max(enemy.aimLockUntil, now + 320);
        enemy.rotationY = faceAngle(source, playerTarget);
        if (now >= enemy.nextShotAt) fireEnemy(enemy, playerTarget, distance, now);
      }
      lastThreatCount = threats;
      syncHud();
    }

    function resetRound({ countdown = false } = {}) {
      playerHealth = 100;
      playerShield = SHIELD_MAX;
      lastDamageAt = 0;
      lastShieldUpdateAt = 0;
      paused = false;
      pausedAt = 0;
      selectedWeapon = "rifle";
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
      frame.classList.remove("combat-death-cinematic", "combat-paused");
      if (pauseOverlay) pauseOverlay.hidden = true;
      options.setMovementLocked?.(false);
      options.hideWalkMenu?.();
      options.resetDeathCinematic?.();
      ammunition.rifle.magazine = WEAPONS.rifle.magazine;
      ammunition.rifle.reserve = WEAPONS.rifle.reserve;
      ammunition.handgun.magazine = WEAPONS.handgun.magazine;
      ammunition.handgun.reserve = WEAPONS.handgun.reserve;
      syncEnemies(true);
      if (roundOverlay) {
        roundOverlay.hidden = true;
        roundOverlay.classList.remove("killer-reveal");
      }
      if (killerReveal) killerReveal.hidden = true;
      if (roundActions) roundActions.classList.remove("locked");
      if (restartButton) {
        restartButton.disabled = false;
        restartButton.textContent = "Restart combat";
      }
      roundRevealSerial += 1;

      if (countdown) {
        roundState = "countdown";
        countdownEndsAt = performance.now() + 2000;
        countdownDisplay = 2;
        if (countdownValue) countdownValue.textContent = "2";
        if (countdownOverlay) countdownOverlay.hidden = false;
        setTransientStatus("Get ready", 2200);
      } else {
        roundState = "playing";
        countdownEndsAt = 0;
        countdownDisplay = 0;
        if (countdownOverlay) countdownOverlay.hidden = true;
      if (pauseOverlay) pauseOverlay.hidden = true;
        setTransientStatus(enemies.size ? "Combat ready" : "No enemy AI found", 1000);
      }
      syncHud();
      options.invalidate?.();
    }

    function updateCountdown(now) {
      if (roundState !== "countdown") return false;
      const remaining = Math.max(0, countdownEndsAt - now);
      if (remaining <= 0) {
        roundState = "playing";
        countdownEndsAt = 0;
        countdownDisplay = 0;
        if (countdownValue) countdownValue.textContent = "FIGHT";
        setTransientStatus("Fight!", 700);
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
      return true;
    }

    function loop(now) {
      if (!active) return;
      if (paused) {
        lastFrameAt = now;
        lastShieldUpdateAt = now;
        options.invalidate?.();
        frameRequest = window.requestAnimationFrame(loop);
        return;
      }
      updatePlayerShield(now);
      if (!updateCountdown(now)) {
        if (mouseHeld && currentWeapon().automatic) fire();
        updateEnemyAi(now);
      } else {
        lastFrameAt = now;
      }
      options.invalidate?.();
      frameRequest = window.requestAnimationFrame(loop);
    }

    function start() {
      if (active || options.isOwner?.() !== true) return false;
      active = true;
      hud.hidden = false;
      paused = false;
      pausedAt = 0;
      frame.classList.add("combat-mode-active");
      options.hideWalkMenu?.();
      resetRound({ countdown: true });
      options.onStateChange?.(true);
      frameRequest = window.requestAnimationFrame(loop);
      return true;
    }

    function stop() {
      if (!active) return;
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
      hud.hidden = true;
      frame.classList.remove("combat-mode-active", "combat-under-fire", "combat-death-cinematic", "combat-paused");
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
      options.onStateChange?.(false);
      options.invalidate?.();
    }

    function handleKeyDown(event) {
      if (!active) return;
      if (event.target?.matches?.("input, select, textarea, [contenteditable='true']")) return;
      if (event.code === "Digit1") {
        event.preventDefault();
        switchWeapon("rifle");
      } else if (event.code === "Digit2") {
        event.preventDefault();
        switchWeapon("handgun");
      } else if (event.code === "KeyR") {
        event.preventDefault();
        startReload();
      }
    }

    function handleMouseDown(event) {
      if (!active || paused || ["lost","won"].includes(roundState) || event.button !== 0 || options.isPointerLocked?.() !== true) return;
      event.preventDefault();
      if (currentWeapon().automatic) mouseHeld = true;
      fire();
    }

    function handleMouseUp(event) {
      if (event.button === 0) mouseHeld = false;
    }

    function handleBlur() {
      mouseHeld = false;
    }

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    window.addEventListener("blur", handleBlur);

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
      reload: startReload,
      fire,
      handleEscape,
      pause: () => setPaused(true),
      resume: () => setPaused(false),
      isPaused: () => paused,
      isDefeated: () => roundState === "lost",
      isRoundComplete: () => roundState === "won",
      isActive: () => active,
      playerRenderState,
      enemyRenderState,
      isEnemyDefeated(id) {
        const record = enemies.get(String(id || ""));
        return Boolean(record && record.health <= 0);
      },
      destroy() {
        stop();
        document.removeEventListener("keydown", handleKeyDown, true);
        document.removeEventListener("mousedown", handleMouseDown, true);
        document.removeEventListener("mouseup", handleMouseUp, true);
        window.removeEventListener("blur", handleBlur);
        hud.remove();
      },
    };
  };
})();
