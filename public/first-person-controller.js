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
    const canOccupyHard = options.canOccupyHard || (() => true);
    const getClimbSurface = options.getClimbSurface || (() => null);
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
    let touchForward = 0;
    let touchStrafe = 0;
    let touchCrouching = false;
    let touchSprinting = false;
    let pointerLocked = false;
    let hadPointerLock = false;
    let stopping = false;
    let inputLocked = false;

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
      const coarseTouch = window.matchMedia?.("(hover: none) and (pointer: coarse)")?.matches;
      if (coarseTouch || !enabled || document.pointerLockElement === canvas) return;
      try {
        const result = canvas.requestPointerLock?.({ unadjustedMovement: true });
        if (result && typeof result.catch === "function") {
          result.catch(() => {
            try {
              const fallback = canvas.requestPointerLock?.();
              fallback?.catch?.(() => {});
            } catch {
              // Pointer lock is optional; the HUD keeps Capture mouse available.
            }
          });
        }
      } catch {
        try { canvas.requestPointerLock?.(); } catch { /* Browser denied pointer lock. */ }
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
      touchForward = 0;
      touchStrafe = 0;
      touchCrouching = false;
      touchSprinting = false;
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
      // Pillars are hard safety geometry and remain solid even if optional
      // machine/wall collision is disabled in the first-person menu.
      const occupancyCheck = collision
        ? (x, z) => canOccupy(x, z, radius)
        : (x, z) => canOccupyHard(x, z, radius);
      // Sweep the entire movement segment. Checking only the final point lets a
      // fast sprint or delayed frame jump completely through a narrow envelope.
      const distance = Math.hypot(nextX - camera.x, nextZ - camera.z);
      const stepLength = Math.max(0.15, Math.min(0.6, radius * 0.45));
      const steps = Math.max(1, Math.ceil(distance / stepLength));
      let currentX = camera.x;
      let currentZ = camera.z;
      let xBlocked = false;
      let zBlocked = false;
      for (let step = 1; step <= steps; step += 1) {
        const remainingSteps = steps - step + 1;
        const targetX = xBlocked ? currentX : currentX + (nextX - currentX) / remainingSteps;
        const targetZ = zBlocked ? currentZ : currentZ + (nextZ - currentZ) / remainingSteps;
        if (occupancyCheck(targetX, targetZ)) {
          currentX = targetX;
          currentZ = targetZ;
          continue;
        }
        // Sliding collision: attempt each axis independently so the player
        // glides along machine envelopes, walls, and columns.
        if (!xBlocked && occupancyCheck(targetX, currentZ)) currentX = targetX;
        else xBlocked = true;
        if (!zBlocked && occupancyCheck(currentX, targetZ)) currentZ = targetZ;
        else zBlocked = true;
        if (xBlocked && zBlocked) break;
      }
      return { x: currentX, z: currentZ };
    }

    function update(time) {
      if (!enabled) return false;
      if (inputLocked) {
        lastUpdate = time;
        keys.clear();
        velocityX = 0;
        velocityZ = 0;
        touchForward = 0;
        touchStrafe = 0;
        touchCrouching = false;
        touchSprinting = false;
        jumpRequested = false;
        return false;
      }
      if (!lastUpdate) {
        lastUpdate = time;
        return true;
      }
      const delta = Math.min(0.05, Math.max(0, (time - lastUpdate) / 1000));
      lastUpdate = time;
      if (!delta) return false;

      const camera = getCamera();
      const config = settings();
      const keyboardForward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
      const keyboardStrafe = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
      const forwardInput = clamp(keyboardForward + touchForward, -1, 1);
      const strafeInput = clamp(keyboardStrafe + touchStrafe, -1, 1);
      const moving = forwardInput !== 0 || strafeInput !== 0;
      const inputLength = Math.hypot(forwardInput, strafeInput) || 1;
      const sprinting = touchSprinting || keys.has("ShiftLeft") || keys.has("ShiftRight");
      const crouching = touchCrouching || keys.has("ControlLeft") || keys.has("ControlRight") || keys.has("KeyC");
      const moveSpeed = config.speed * (sprinting ? 2.05 : 1) * (crouching ? 0.46 : 1);
      const forwardX = Math.sin(camera.yaw);
      const forwardZ = Math.cos(camera.yaw);
      // Match the horizontal basis used by the plant projection. Walk yaw is
      // converted from the Overview heading, so screen-right is the opposite
      // of the conventional yaw-right vector.
      const rightX = -Math.cos(camera.yaw);
      const rightZ = Math.sin(camera.yaw);
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
      const climb = getClimbSurface(next.x,next.z);
      const climbInput = Number(keys.has("Space") || keys.has("KeyW")) - Number(keys.has("KeyS"));
      const roofLanding = climb?.kind === "roof" && verticalOffset >= climb.height - 1.55;
      if (roofLanding) {
        // A roof is a permanent floor contact, not a temporary jump apex.
        verticalVelocity = 0;
        verticalOffset = climb.height;
        jumpRequested = false;
      } else if (climb?.kind === "ladder" && climbInput !== 0) {
        verticalVelocity = 0;
        verticalOffset = clamp(verticalOffset + climbInput * delta * 11, 0, climb.height);
        jumpRequested = false;
        if (climbInput > 0 && verticalOffset >= climb.height - .42) {
          // Step forward from the ladder onto the actual roof slab.
          // Staying outside its footprint caused the previous roof fall-through.
          verticalOffset = climb.height;
          next.x = climb.landingX ?? climb.ladderX;
          next.z = climb.landingZ ?? climb.z;
        }
      } else {
        verticalVelocity -= 22 * delta;
        verticalOffset = Math.max(0, verticalOffset + verticalVelocity * delta);
        if (verticalOffset <= 0) verticalVelocity = 0;
      }

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
      // Pointer lock alone is not animation. Returning true while standing still
      // forced the plant to rebuild every polygon at interaction frame rate.
      return changed || moving;
    }

    function handleKeyDown(event) {
      if (!enabled) return;
      if (event.key === "Escape" || event.code === "Escape") {
        event.preventDefault?.();
        onExitRequest("escape-key");
        return;
      }
      // Match setup deliberately locks movement, but that lock must never turn
      // ordinary form fields into dead controls. Let text/select editing through
      // before applying the movement lock so lobby names, codes, and passwords
      // can be typed while the setup overlay is open.
      const editingField = event.target?.matches?.("input, select, textarea, [contenteditable='true']");
      if (editingField && document.pointerLockElement !== canvas) return;
      if (inputLocked) {
        event.preventDefault?.();
        return;
      }
      // A button often remains focused after First person or Capture mouse is
      // clicked. Do not let that stale focus block WASD. Only active text/form
      // editing should suppress movement before pointer lock is acquired.
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
      if (!enabled || inputLocked || document.pointerLockElement !== canvas) return;
      const camera = getCamera();
      const config = settings();
      setCamera({
        // With the Overview-matched horizontal basis, decreasing yaw turns the
        // camera right and makes the scene move left as expected.
        yaw: camera.yaw - event.movementX * config.sensitivity,
        pitch: clamp(camera.pitch - event.movementY * config.sensitivity, -1.35, 1.35),
      });
      onMovement();
    }

    function setTouchMove(forward = 0, strafe = 0) {
      touchForward = clamp(Number(forward) || 0, -1, 1);
      touchStrafe = clamp(Number(strafe) || 0, -1, 1);
    }

    function setTouchCrouch(active) {
      touchCrouching = Boolean(active);
    }

    function setTouchSprint(active) {
      touchSprinting = Boolean(active);
    }

    function requestJump() {
      if (enabled) jumpRequested = true;
    }

    function lookBy(deltaX = 0, deltaY = 0, sensitivityScale = 1) {
      if (!enabled) return;
      const camera = getCamera();
      const config = settings();
      const sensitivity = config.sensitivity * clamp(Number(sensitivityScale) || 1, .2, 4);
      setCamera({
        yaw: camera.yaw - Number(deltaX || 0) * sensitivity,
        pitch: clamp(camera.pitch - Number(deltaY || 0) * sensitivity, -1.35, 1.35),
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
      // explicit request to show the first-person options menu.
      if (!pointerLocked && wasLocked && enabled && !stopping) {
        onExitRequest("pointer-lock-released");
      }
    }

    function handleCanvasClick() {
      if (enabled && !inputLocked && document.pointerLockElement !== canvas) requestPointerLock();
    }

    function setInputLocked(locked) {
      inputLocked = Boolean(locked);
      keys.clear();
      velocityX = 0;
      velocityZ = 0;
      touchForward = 0;
      touchStrafe = 0;
      touchCrouching = false;
      touchSprinting = false;
      jumpRequested = false;
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
      setTouchMove,
      setTouchCrouch,
      setTouchSprint,
      requestJump,
      lookBy,
      setInputLocked,
      isInputLocked: () => inputLocked,
      isMoving: () => Math.abs(velocityX) + Math.abs(velocityZ) > 0.02 || keys.size > 0 || Math.abs(touchForward) + Math.abs(touchStrafe) > .02,
      isSprinting: () => enabled && !inputLocked &&
        (touchSprinting || keys.has("ShiftLeft") || keys.has("ShiftRight")) &&
        (Math.hypot(velocityX,velocityZ)>1.2 || Math.hypot(touchForward,touchStrafe)>.12),
      // Expose a normalized gait phase for viewmodel running animation.
      gaitMotion: () => ({sprinting:enabled&&!inputLocked &&
        (touchSprinting||keys.has("ShiftLeft")||keys.has("ShiftRight")),
        phase:bobTime,speed:Math.hypot(velocityX,velocityZ)}),
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
