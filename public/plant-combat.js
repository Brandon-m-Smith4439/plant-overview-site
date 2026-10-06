(() => {
  "use strict";

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const WEAPONS = Object.freeze({
    rifle: Object.freeze({
      key: "rifle",
      label: "PRIMARY · RIFLE",
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
      label: "SECONDARY · HANDGUN",
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

  function enemyId(machine, index = 0) {
    return String(machine?.instanceId || machine?.id || machine?.name || ("enemy-" + index));
  }

  function enemyCenter(machine) {
    const width = Math.max(.2, number(machine?.w, 2));
    const height = Math.max(1, number(machine?.h, 6));
    const depth = Math.max(.2, number(machine?.d, 2));
    return {
      x: number(machine?.x) + width / 2,
      y: number(machine?.y) + height * .62,
      z: number(machine?.z) + depth / 2,
      radius: clamp(Math.max(width, depth) * .55, .9, 2.4),
    };
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
      '<div class="combat-weapon-panel">',
        '<div class="combat-weapon-copy">',
          '<span data-combat-slot>PRIMARY</span>',
          '<strong data-combat-weapon>RIFLE</strong>',
          '<small data-combat-status>Ready</small>',
        '</div>',
        '<div class="combat-weapon-visual rifle" data-combat-weapon-visual aria-hidden="true">',
          '<span class="combat-weapon-body"></span><span class="combat-weapon-grip"></span><span class="combat-weapon-stock"></span><span class="combat-weapon-barrel"></span><span class="combat-muzzle-flash"></span>',
        '</div>',
        '<div class="combat-ammo"><strong data-combat-mag>30</strong><span>/</span><b data-combat-reserve>120</b></div>',
        '<div class="combat-controls">Mouse 1 fire · <b>1</b> rifle · <b>2</b> handgun · <b>R</b> reload</div>',
      '</div>',
      '<div class="combat-round-overlay" data-combat-round hidden>',
        '<div>',
          '<p data-combat-round-kicker>ROUND COMPLETE</p>',
          '<h2 data-combat-round-title>Plant secured</h2>',
          '<span data-combat-round-copy>All enemy AI has been neutralized.</span>',
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
    const weaponVisual = hud.querySelector("[data-combat-weapon-visual]");
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

    function syncEnemies(reset = false) {
      const source = Array.isArray(options.getEnemies?.()) ? options.getEnemies() : [];
      const seen = new Set();
      source.forEach((machine, index) => {
        const id = enemyId(machine, index);
        seen.add(id);
        let record = enemies.get(id);
        if (!record) {
          record = { id, machine, health: 100, nextShotAt: 0, alerted: false };
          enemies.set(id, record);
        } else {
          record.machine = machine;
        }
        if (reset) {
          record.health = 100;
          record.nextShotAt = 0;
          record.alerted = false;
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
        const center = enemyCenter(enemy.machine);
        const distance = raySphere(origin, direction, center, center.radius);
        if (!Number.isFinite(distance) || distance > bestDistance || distance >= wallDistance - .05) continue;
        best = enemy;
        bestDistance = distance;
      }
      return best ? { enemy: best, distance: bestDistance } : null;
    }

    function setTransientStatus(text, duration = 850) {
      if (statusCopy) statusCopy.textContent = text;
      transientStatusUntil = performance.now() + duration;
    }

    function pulseWeapon() {
      weaponVisual?.classList.remove("firing");
      void weaponVisual?.offsetWidth;
      weaponVisual?.classList.add("firing");
      window.setTimeout(() => weaponVisual?.classList.remove("firing"), 80);
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
      if (weaponVisual) {
        weaponVisual.classList.toggle("rifle", selectedWeapon === "rifle");
        weaponVisual.classList.toggle("handgun", selectedWeapon === "handgun");
        weaponVisual.classList.toggle("reloading", reloading);
      }
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
      if (!roundOverlay) return;
      roundOverlay.hidden = false;
      if (kind === "won") {
        if (roundKicker) roundKicker.textContent = "ROUND COMPLETE";
        if (roundTitle) roundTitle.textContent = "Plant secured";
        if (roundCopy) roundCopy.textContent = "All enemy AI has been neutralized.";
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
      if (statusCopy) statusCopy.textContent = "Reloading…";
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
        const defeated = target.enemy.health <= 0;
        showHitmarker(defeated);
        setTransientStatus(defeated ? "Enemy down" : "Hit", defeated ? 950 : 420);
        if (defeated && aliveEnemies().length === 0 && enemies.size > 0) finishRound("won");
      }
      if (ammo.magazine <= 0 && ammo.reserve > 0) setTransientStatus("Magazine empty · R to reload", 1300);
      syncHud();
      options.invalidate?.();
    }

    function damagePlayer(amount, sourceName) {
      if (!active || roundState !== "playing") return;
      playerHealth = Math.max(0, playerHealth - Math.max(0, number(amount)));
      showDamage();
      if (sourceName) setTransientStatus("Incoming fire · " + sourceName, 600);
      if (playerHealth <= 0) finishRound("lost");
      syncHud();
    }

    function updateEnemyAi(now) {
      const player = options.getPlayer?.();
      syncEnemies(false);
      if (!player?.engaged || roundState !== "playing") {
        lastThreatCount = 0;
        syncHud();
        return;
      }
      const target = { x: number(player.x), y: number(player.y, 5.5), z: number(player.z) };
      let threats = 0;
      for (const enemy of aliveEnemies()) {
        const source = enemyCenter(enemy.machine);
        const distance = Math.hypot(target.x - source.x, target.y - source.y, target.z - source.z);
        if (distance > 125 || !hasLineOfSight(source, target)) {
          enemy.alerted = false;
          continue;
        }
        threats += 1;
        enemy.alerted = true;
        if (now < enemy.nextShotAt) continue;
        enemy.nextShotAt = now + 800 + Math.random() * 650;
        const hitChance = clamp(.76 - distance / 230, .24, .68);
        if (Math.random() <= hitChance) {
          const damage = 6 + Math.random() * 7;
          damagePlayer(damage, String(enemy.machine?.name || "Enemy"));
        } else {
          setTransientStatus("Incoming fire", 320);
        }
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
      }
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
      hud.hidden = true;
      frame.classList.remove("combat-mode-active");
      if (countdownOverlay) countdownOverlay.hidden = true;
      if (roundOverlay) roundOverlay.hidden = true;
      options.onStateChange?.(false);
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
