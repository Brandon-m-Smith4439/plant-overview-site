(() => {
  "use strict";

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
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
        '<small data-combat-threat>No threats in sight</small>',
      '</div>',
      '<div class="combat-hitmarker" data-combat-hitmarker aria-hidden="true"><i></i><i></i><i></i><i></i></div>',
      '<div class="combat-damage-vignette" data-combat-damage aria-hidden="true"></div>',
      '<div class="combat-countdown" data-combat-countdown hidden>',
        '<span>COMBAT STARTS IN</span>',
        '<strong data-combat-countdown-value>2</strong>',
      '</div>',
      '<div class="combat-first-person-weapon rifle" data-combat-first-person-weapon aria-hidden="true">',
        '<span class="fp-weapon-stock"></span>',
        '<span class="fp-weapon-body"></span>',
        '<span class="fp-weapon-rail"></span>',
        '<span class="fp-weapon-sight"></span>',
        '<span class="fp-weapon-barrel"></span>',
        '<span class="fp-weapon-magazine"></span>',
        '<span class="fp-weapon-grip"></span>',
        '<span class="fp-weapon-hand"></span>',
        '<span class="fp-weapon-muzzle"></span>',
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
          '<div class="combat-round-actions">',
            '<button type="button" data-combat-restart>Restart combat</button>',
            '<button type="button" data-combat-exit>Exit combat</button>',
          '</div>',
        '</div>',
      '</div>',
    ].join("");
    frame.appendChild(hud);

    const healthValue = hud.querySelector("[data-combat-health-value]");
    const healthBar = hud.querySelector("[data-combat-health-bar]");
    const enemyCounter = hud.querySelector("[data-combat-enemies]");
    const threatCopy = hud.querySelector("[data-combat-threat]");
    const weaponCopy = hud.querySelector("[data-combat-weapon]");
    const slotCopy = hud.querySelector("[data-combat-slot]");
    const statusCopy = hud.querySelector("[data-combat-status]");
    const magazineCopy = hud.querySelector("[data-combat-mag]");
    const reserveCopy = hud.querySelector("[data-combat-reserve]");
    const firstPersonWeapon = hud.querySelector("[data-combat-first-person-weapon]");
    const hitmarker = hud.querySelector("[data-combat-hitmarker]");
    const damageVignette = hud.querySelector("[data-combat-damage]");
    const countdownOverlay = hud.querySelector("[data-combat-countdown]");
    const countdownValue = hud.querySelector("[data-combat-countdown-value]");
    const roundOverlay = hud.querySelector("[data-combat-round]");
    const roundKicker = hud.querySelector("[data-combat-round-kicker]");
    const roundTitle = hud.querySelector("[data-combat-round-title]");
    const roundCopy = hud.querySelector("[data-combat-round-copy]");

    const enemies = new Map();
    const ammunition = {
      rifle: { magazine: WEAPONS.rifle.magazine, reserve: WEAPONS.rifle.reserve },
      handgun: { magazine: WEAPONS.handgun.magazine, reserve: WEAPONS.handgun.reserve },
    };

    let active = false;
    let playerHealth = 100;
    let selectedWeapon = "rifle";
    let reloading = false;
    let reloadSerial = 0;
    let nextPlayerShotAt = 0;
    let mouseHeld = false;
    let frameRequest = 0;
    let lastFrameAt = 0;
    let lastThreatCount = 0;
    let roundState = "playing";
    let countdownEndsAt = 0;
    let countdownDisplay = 0;
    let transientStatusUntil = 0;

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
      record.nextShotAt = 0;
      record.alerted = false;
      record.movementBlend = .16;
      record.walkPhase = unit * Math.PI * 2;
      record.firingUntil = 0;
      record.muzzleFlashUntil = 0;
      record.recoilUntil = 0;
      record.hitReactUntil = 0;
      record.defeatedAt = 0;
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
      return Math.atan2(dx, dz) * 180 / Math.PI + 180;
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

      if (lineOfSight) {
        enemy.rotationY = faceAngle(center, playerTarget);
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
      } else {
        if (now >= enemy.nextHeadingAt) {
          const size = enemyDimensions(enemy);
          const anchorCenterX = number(enemy.anchorX) + size.w / 2;
          const anchorCenterZ = number(enemy.anchorZ) + size.d / 2;
          const homeDistance = Math.hypot(center.x - anchorCenterX, center.z - anchorCenterZ);
          if (homeDistance > 42) {
            enemy.heading = Math.atan2(anchorCenterX - center.x, anchorCenterZ - center.z);
          } else {
            enemy.heading += (stableUnit(enemy.id + ":" + Math.floor(now / 1700)) - .5) * 2.4;
          }
          enemy.nextHeadingAt = now + 1250 + stableUnit(enemy.id + ":" + Math.floor(now / 2500)) * 1800;
        }
        moveX = Math.sin(enemy.heading);
        moveZ = Math.cos(enemy.heading);
        enemy.rotationY = enemy.heading * 180 / Math.PI + 180;
        speed = 2.4 * enemy.speedBias;
      }

      const length = Math.hypot(moveX, moveZ) || 1;
      const step = Math.min(1.1, speed * deltaSeconds);
      const moved = tryMoveEnemy(enemy, moveX / length * step, moveZ / length * step);
      if (!moved) {
        enemy.strafeSign *= -1;
        enemy.heading += Math.PI * (.55 + stableUnit(enemy.id + ":bounce") * .45);
        enemy.nextHeadingAt = now + 350;
      }
      enemy.movementBlend += ((moved ? 1 : .18) - enemy.movementBlend) * Math.min(1, deltaSeconds * 8);
      enemy.walkPhase += deltaSeconds * (moved ? 8.5 * enemy.speedBias : 2.2);
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
        tracerTarget: now < enemy.tracerUntil ? enemy.tracerTarget : null,
        health: enemy.health,
      };
    }

    function setTransientStatus(text, duration = 850) {
      if (statusCopy) statusCopy.textContent = text;
      transientStatusUntil = performance.now() + duration;
    }

    function pulseWeapon() {
      firstPersonWeapon?.classList.remove("firing");
      void firstPersonWeapon?.offsetWidth;
      firstPersonWeapon?.classList.add("firing");
      window.setTimeout(() => firstPersonWeapon?.classList.remove("firing"), 90);
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
      if (enemyCounter) enemyCounter.textContent = "Enemies " + alive + " / " + all.length;
      if (slotCopy) slotCopy.textContent = selectedWeapon === "rifle" ? "PRIMARY" : "SECONDARY";
      if (weaponCopy) weaponCopy.textContent = weapon.shortLabel.toUpperCase();
      if (magazineCopy) magazineCopy.textContent = String(ammo.magazine);
      if (reserveCopy) reserveCopy.textContent = String(ammo.reserve);
      if (firstPersonWeapon) {
        firstPersonWeapon.classList.toggle("rifle", selectedWeapon === "rifle");
        firstPersonWeapon.classList.toggle("handgun", selectedWeapon === "handgun");
        firstPersonWeapon.classList.toggle("reloading", reloading);
      }
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

    function finishRound(kind) {
      roundState = kind;
      mouseHeld = false;
      lastThreatCount = 0;
      syncHud();
      if (!roundOverlay) return;
      roundOverlay.hidden = false;
      if (kind === "won") {
        if (roundKicker) roundKicker.textContent = "ROUND COMPLETE";
        if (roundTitle) roundTitle.textContent = "Plant secured";
        if (roundCopy) roundCopy.textContent = "All enemy AI has been defeated.";
      } else {
        if (roundKicker) roundKicker.textContent = "PLAYER DOWN";
        if (roundTitle) roundTitle.textContent = "Combat run ended";
        if (roundCopy) roundCopy.textContent = "Restart to reset your health, weapons, and every enemy.";
      }
      options.onRoundEnd?.(kind);
    }

    function switchWeapon(next) {
      if (!WEAPONS[next] || selectedWeapon === next || !active || roundState !== "playing") return;
      reloadSerial += 1;
      reloading = false;
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
      pulseWeapon();

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

    function damagePlayer(amount, sourceName) {
      if (!active || roundState !== "playing") return;
      playerHealth = Math.max(0, playerHealth - Math.max(0, number(amount)));
      showDamage();
      if (sourceName) setTransientStatus("Incoming fire - " + sourceName, 600);
      if (playerHealth <= 0) finishRound("lost");
      syncHud();
    }

    function fireEnemy(enemy, playerTarget, distance, now) {
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
      enemy.tracerUntil = now + 105;
      if (hit) {
        damagePlayer(6 + Math.random() * 7, String(enemy.machine?.name || "Enemy"));
      } else {
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
        enemy.rotationY = faceAngle(source, playerTarget);
        if (now >= enemy.nextShotAt) fireEnemy(enemy, playerTarget, distance, now);
      }
      lastThreatCount = threats;
      syncHud();
    }

    function resetRound({ countdown = false } = {}) {
      playerHealth = 100;
      selectedWeapon = "rifle";
      reloading = false;
      reloadSerial += 1;
      nextPlayerShotAt = 0;
      mouseHeld = false;
      lastThreatCount = 0;
      lastFrameAt = 0;
      ammunition.rifle.magazine = WEAPONS.rifle.magazine;
      ammunition.rifle.reserve = WEAPONS.rifle.reserve;
      ammunition.handgun.magazine = WEAPONS.handgun.magazine;
      ammunition.handgun.reserve = WEAPONS.handgun.reserve;
      syncEnemies(true);
      if (roundOverlay) roundOverlay.hidden = true;

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
      frame.classList.add("combat-mode-active");
      resetRound({ countdown: true });
      options.onStateChange?.(true);
      frameRequest = window.requestAnimationFrame(loop);
      return true;
    }

    function stop() {
      if (!active) return;
      active = false;
      mouseHeld = false;
      reloading = false;
      reloadSerial += 1;
      if (frameRequest) window.cancelAnimationFrame(frameRequest);
      frameRequest = 0;
      countdownEndsAt = 0;
      countdownDisplay = 0;
      lastFrameAt = 0;
      hud.hidden = true;
      frame.classList.remove("combat-mode-active", "combat-under-fire");
      if (countdownOverlay) countdownOverlay.hidden = true;
      if (roundOverlay) roundOverlay.hidden = true;
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
      if (!active || event.button !== 0 || options.isPointerLocked?.() !== true) return;
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
      isActive: () => active,
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
