(() => {
  "use strict";

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const approach = (value, target, amount) => (
    value < target ? Math.min(target, value + amount) : Math.max(target, value - amount)
  );

  window.createPlantFirstPersonController = function createPlantFirstPersonController(options) {
    const canvas = options.canvas;
    const getCamera = options.getCamera;
    const setCamera = options.setCamera;
    const canOccupy = options.canOccupy;
    const onLockChange = options.onLockChange || (() => {});
    const onMovement = options.onMovement || (() => {});
    const onExitRequest = options.onExitRequest || (() => {});

    const keys = new Set();
    let enabled = false;
    let lastUpdate = 0;
    let velocityX = 0;
    let velocityZ = 0;
    let verticalVelocity = 0;
    let verticalOffset = 0;
    let bobTime = 0;
    let bobOffset = 0;
    let jumpRequested = false;
    let pointerLocked = false;
    let hadPointerLock = false;
    let stopping = false;

    function settings() {
      const camera = getCamera();
      return {
        speed: clamp(Number(camera.walkSpeed) || 15, 1, 80),
        sensitivity: clamp(Number(camera.walkSensitivity) || 0.0022, 0.0004, 0.01),
        radius: clamp(Number(camera.walkRadius) || 1.2, 0.25, 5),
        collision: camera.walkCollision !== false,
        headBob: camera.walkHeadBob !== false,
      };
    }

    function requestPointerLock() {
      if (!enabled || document.pointerLockElement === canvas) return;
      try {
        const result = canvas.requestPointerLock?.({ unadjustedMovement: true });
        if (result && typeof result.catch === "function") {
          result.catch(() => canvas.requestPointerLock?.());
        }
      } catch (_error) {
        try { canvas.requestPointerLock?.(); } catch (_fallbackError) { /* Browser denied pointer lock. */ }
      }
    }

    function releasePointerLock() {
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
    }

    function resetMotion() {
      keys.clear();
      velocityX = 0;
      velocityZ = 0;
      verticalVelocity = 0;
      verticalOffset = 0;
      bobTime = 0;
      bobOffset = 0;
      jumpRequested = false;
      lastUpdate = 0;
    }

    function start({ capture = true } = {}) {
      if (enabled) {
        if (capture) requestPointerLock();
        return;
      }
      enabled = true;
      resetMotion();
      if (capture) requestPointerLock();
    }

    function stop() {
      if (!enabled) return;
      stopping = true;
      enabled = false;
      resetMotion();
      releasePointerLock();
      pointerLocked = false;
      hadPointerLock = false;
      stopping = false;
    }

    function tryMove(camera, nextX, nextZ, radius, collision) {
      if (!collision || canOccupy(nextX, nextZ, radius)) {
        return { x: nextX, z: nextZ };
      }
      // Sliding collision: attempt each axis independently so the player glides
      // naturally along machines, walls, and columns instead of stopping dead.
      const xOnly = canOccupy(nextX, camera.z, radius);
      const zOnly = canOccupy(camera.x, nextZ, radius);
      return {
        x: xOnly ? nextX : camera.x,
        z: zOnly ? nextZ : camera.z,
      };
    }

    function update(time) {
      if (!enabled) return false;
      if (!lastUpdate) {
        lastUpdate = time;
        return true;
      }
      const delta = Math.min(0.05, Math.max(0, (time - lastUpdate) / 1000));
      lastUpdate = time;
      if (!delta) return false;

      const camera = getCamera();
      const config = settings();
      const forwardInput = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
      const strafeInput = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
      const moving = forwardInput !== 0 || strafeInput !== 0;
      const inputLength = Math.hypot(forwardInput, strafeInput) || 1;
      const sprinting = keys.has("ShiftLeft") || keys.has("ShiftRight");
      const crouching = keys.has("ControlLeft") || keys.has("ControlRight") || keys.has("KeyC");
      const moveSpeed = config.speed * (sprinting ? 2.05 : 1) * (crouching ? 0.46 : 1);
      const forwardX = Math.sin(camera.yaw);
      const forwardZ = Math.cos(camera.yaw);
      const rightX = Math.cos(camera.yaw);
      const rightZ = -Math.sin(camera.yaw);
      const targetVelocityX = ((forwardX * forwardInput + rightX * strafeInput) / inputLength) * moveSpeed;
      const targetVelocityZ = ((forwardZ * forwardInput + rightZ * strafeInput) / inputLength) * moveSpeed;
      const acceleration = (moving ? 80 : 110) * delta;
      velocityX = approach(velocityX, targetVelocityX, acceleration);
      velocityZ = approach(velocityZ, targetVelocityZ, acceleration);

      const next = tryMove(
        camera,
        camera.x + velocityX * delta,
        camera.z + velocityZ * delta,
        config.radius,
        config.collision,
      );

      if (jumpRequested && verticalOffset <= 0.001) {
        verticalVelocity = 8.2;
        jumpRequested = false;
      }
      verticalVelocity -= 22 * delta;
      verticalOffset = Math.max(0, verticalOffset + verticalVelocity * delta);
      if (verticalOffset <= 0) verticalVelocity = 0;

      if (moving && verticalOffset <= 0.001) bobTime += delta * (sprinting ? 12 : 8.5);
      else bobTime += delta * 4;
      const targetBob = config.headBob && moving && verticalOffset <= 0.001
        ? Math.sin(bobTime) * (sprinting ? 0.105 : 0.065)
        : 0;
      bobOffset = approach(bobOffset, targetBob, delta * 0.8);
      const crouchOffset = crouching ? -1.15 : 0;

      const changed = Math.abs(next.x - camera.x) > 0.0001
        || Math.abs(next.z - camera.z) > 0.0001
        || Math.abs((camera.walkVerticalOffset || 0) - verticalOffset) > 0.0001
        || Math.abs((camera.walkBobOffset || 0) - (bobOffset + crouchOffset)) > 0.0001;
      if (changed) {
        setCamera({
          x: next.x,
          z: next.z,
          walkVerticalOffset: verticalOffset,
          walkBobOffset: bobOffset + crouchOffset,
        });
        onMovement();
      }
      return changed || moving || pointerLocked;
    }

    function handleKeyDown(event) {
      if (!enabled) return;
      if (event.key === "Escape" || event.code === "Escape") {
        event.preventDefault?.();
        onExitRequest("escape-key");
        return;
      }
      // A button often remains focused after First person or Capture mouse is
      // clicked. Do not let that stale focus block WASD. Only active text/form
      // editing should suppress movement before pointer lock is acquired.
      const editingField = event.target?.matches?.("input, select, textarea, [contenteditable='true']");
      if (editingField && document.pointerLockElement !== canvas) return;
      const controlled = [
        "KeyW", "KeyA", "KeyS", "KeyD",
        "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
        "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "KeyC", "Space",
      ];
      if (!controlled.includes(event.code)) return;
      event.preventDefault();
      keys.add(event.code);
      if (event.code === "Space" && !event.repeat) jumpRequested = true;
    }

    function handleKeyUp(event) {
      if (!enabled) return;
      keys.delete(event.code);
    }

    function handleMouseMove(event) {
      if (!enabled || document.pointerLockElement !== canvas) return;
      const camera = getCamera();
      const config = settings();
      setCamera({
        yaw: camera.yaw + event.movementX * config.sensitivity,
        pitch: clamp(camera.pitch - event.movementY * config.sensitivity, -1.35, 1.35),
      });
      onMovement();
    }

    function handlePointerLockChange() {
      const wasLocked = pointerLocked || hadPointerLock;
      pointerLocked = document.pointerLockElement === canvas;
      if (pointerLocked) hadPointerLock = true;
      onLockChange(pointerLocked);
      // Browsers reserve Escape for releasing pointer lock, so a normal keydown
      // event is not guaranteed. Treat loss of a previously acquired lock as an
      // explicit request to leave first-person mode in one step.
      if (!pointerLocked && wasLocked && enabled && !stopping) {
        onExitRequest("pointer-lock-released");
      }
    }

    function handleCanvasClick() {
      if (enabled && document.pointerLockElement !== canvas) requestPointerLock();
    }

    function handleBlur() {
      keys.clear();
      velocityX = 0;
      velocityZ = 0;
    }

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    canvas.addEventListener("click", handleCanvasClick);
    window.addEventListener("blur", handleBlur);

    return {
      start,
      stop,
      update,
      capture: requestPointerLock,
      release: releasePointerLock,
      isEnabled: () => enabled,
      isPointerLocked: () => pointerLocked,
      isMoving: () => Math.abs(velocityX) + Math.abs(velocityZ) > 0.02 || keys.size > 0,
      destroy() {
        stop();
        document.removeEventListener("keydown", handleKeyDown, true);
        document.removeEventListener("keyup", handleKeyUp, true);
        document.removeEventListener("mousemove", handleMouseMove, true);
        document.removeEventListener("pointerlockchange", handlePointerLockChange);
        canvas.removeEventListener("click", handleCanvasClick);
        window.removeEventListener("blur", handleBlur);
      },
    };
  };
})();
