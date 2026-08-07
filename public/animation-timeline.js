(() => {
  "use strict";

  const MIN_TIMELINE_SECONDS = 30;
  const PRESETS = {
    move: { duration: 3, cycleSeconds: 3, amount: 5, axis: "x", easing: "easeInOut", holdEnd: true },
    oscillate: { duration: 6, cycleSeconds: 4, amount: 5, axis: "x", easing: "easeInOut", pauseAtPositive: 0.5, pauseAtNegative: 0.5, holdEnd: false },
    loop: { duration: 6, cycleSeconds: 3, amount: 5, axis: "x", easing: "linear", holdEnd: false },
    fourStep: { duration: 8, cycleSeconds: 8, amount: 5, secondaryAmount: 5, axis: "x", secondaryAxis: "z", easing: "easeInOut", holdEnd: false },
    rotate: { duration: 2, cycleSeconds: 2, amount: 90, axis: "y", easing: "easeInOut", holdEnd: true, rotationPivotX: 0, rotationPivotY: 0, rotationPivotZ: 0 },
    bob: { duration: 4, cycleSeconds: 2, amount: 2, axis: "y", easing: "easeInOut", holdEnd: false },
    pulse: { duration: 4, cycleSeconds: 2, amount: 10, axis: "all", easing: "easeInOut", holdEnd: false },
    splitRectangles: { duration: 3, cycleSeconds: 3, amount: 6, axis: "all", splitColumns: 3, splitColumnsMin: 3, splitColumnsMax: 6, splitRows: 3, splitLayers: 1, splitSeed: 17, splitRotation: 35, easing: "easeOut", holdEnd: true },
    fadeIn: { duration: 2, cycleSeconds: 2, easing: "easeInOut", holdEnd: true },
    fadeOut: { duration: 2, cycleSeconds: 2, easing: "easeInOut", holdEnd: true },
    blink: { duration: 4, cycleSeconds: 1, blinkMinOpacity: 0.1, blinkDutyCycle: 0.5, easing: "step", holdEnd: false },
    visibility: { duration: 2, cycleSeconds: 2, visibilityAction: "hide", easing: "step", holdEnd: true },
    wait: { duration: 2, cycleSeconds: 2, easing: "linear", holdEnd: true },
  };
  const TYPES = [
    { value: "move", label: "Move once", presetDuration: PRESETS.move.duration },
    { value: "oscillate", label: "Back and forth", presetDuration: PRESETS.oscillate.duration },
    { value: "loop", label: "Loop across path", presetDuration: PRESETS.loop.duration },
    { value: "fourStep", label: "Four-step path", presetDuration: PRESETS.fourStep.duration },
    { value: "rotate", label: "Rotate", presetDuration: PRESETS.rotate.duration },
    { value: "bob", label: "Bob vertically", presetDuration: PRESETS.bob.duration },
    { value: "pulse", label: "Pulse size", presetDuration: PRESETS.pulse.duration },
    { value: "splitRectangles", label: "Split into rectangles", presetDuration: PRESETS.splitRectangles.duration },
    { value: "fadeIn", label: "Fade in", presetDuration: PRESETS.fadeIn.duration },
    { value: "fadeOut", label: "Fade out", presetDuration: PRESETS.fadeOut.duration },
    { value: "blink", label: "Blink opacity", presetDuration: PRESETS.blink.duration },
    { value: "visibility", label: "Show / hide", presetDuration: PRESETS.visibility.duration },
    { value: "wait", label: "Wait / hold", presetDuration: PRESETS.wait.duration },
  ];
  const TYPE_VALUES = new Set(TYPES.map((type) => type.value));
  const EASINGS = ["linear", "easeIn", "easeOut", "easeInOut", "smooth", "step"];
  const AXES = ["x", "y", "z", "all"];

  function number(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function uniqueId(prefix = "clip") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function positiveOrPreset(value, preset) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : preset;
  }

  function normalizeClip(clip, index = 0) {
    // Timeline clips saved before version 0.12.8 used the internal name
    // "spin" for Rotate. Migrate them to the keyed rotation behavior.
    const requestedType = clip?.type === "spin" ? "rotate" : clip?.type;
    const type = TYPE_VALUES.has(requestedType) ? requestedType : "move";
    const preset = PRESETS[type] || PRESETS.move;
    const legacySplitColumns = clamp(Math.round(number(clip?.splitColumns, preset.splitColumns ?? 4)), 1, 8);
    const requestedMinimumColumns = clamp(Math.round(number(clip?.splitColumnsMin, legacySplitColumns)), 1, 8);
    const requestedMaximumColumns = clamp(Math.round(number(clip?.splitColumnsMax, legacySplitColumns)), 1, 8);
    const splitColumnsMin = Math.min(requestedMinimumColumns, requestedMaximumColumns);
    const splitColumnsMax = Math.max(requestedMinimumColumns, requestedMaximumColumns);
    // Version 0.12.6 stored an unused default X axis on rectangular splits.
    // Treat clips without the new range fields as legacy all-axis explosions.
    const legacyRectangularSplit = type === "splitRectangles" && clip?.splitColumnsMin === undefined && clip?.splitColumnsMax === undefined;
    const requestedAmount = number(clip?.amount, preset.amount ?? 5);
    // Version 0.12.9 briefly stored Rotate direction in a separate field.
    // Fold that value back into the stable signed-angle format so designs saved
    // by that release keep their intended direction after this restoration.
    const signedAmount = type === "rotate" && clip?.rotationDirection === "negative"
      ? -Math.abs(requestedAmount)
      : requestedAmount;
    return {
      id: clip?.id || uniqueId(type),
      name: String(clip?.name || TYPES.find((item) => item.value === type)?.label || `Animation ${index + 1}`),
      type,
      enabled: clip?.enabled !== false,
      start: Math.max(0, number(clip?.start, index * 1.5)),
      duration: Math.max(0.05, positiveOrPreset(clip?.duration, preset.duration)),
      // cycleSeconds is active motion time. Pauses are added separately.
      cycleSeconds: Math.max(0.05, positiveOrPreset(clip?.cycleSeconds, preset.cycleSeconds)),
      cyclePause: Math.max(0, number(clip?.cyclePause, preset.cyclePause || 0)),
      pauseAtPositive: Math.max(0, number(clip?.pauseAtPositive, preset.pauseAtPositive || 0)),
      pauseAtNegative: Math.max(0, number(clip?.pauseAtNegative, preset.pauseAtNegative || 0)),
      repeatCount: Math.max(0, Math.round(number(clip?.repeatCount, 0))),
      yoyo: clip?.yoyo === undefined ? Boolean(preset.yoyo) : Boolean(clip.yoyo),
      easing: EASINGS.includes(clip?.easing) ? clip.easing : preset.easing,
      phase: number(clip?.phase, 0),
      axis: legacyRectangularSplit
        ? "all"
        : (AXES.includes(clip?.axis) ? clip.axis : (preset.axis || (type === "bob" ? "y" : "x"))),
      secondaryAxis: ["x", "y", "z"].includes(clip?.secondaryAxis) ? clip.secondaryAxis : (preset.secondaryAxis || "z"),
      amount: signedAmount,
      secondaryAmount: number(clip?.secondaryAmount, preset.secondaryAmount ?? 5),
      rotationPivotX: number(clip?.rotationPivotX ?? clip?.pivotX, preset.rotationPivotX ?? 0),
      rotationPivotY: number(clip?.rotationPivotY ?? clip?.pivotY, preset.rotationPivotY ?? 0),
      rotationPivotZ: number(clip?.rotationPivotZ ?? clip?.pivotZ, preset.rotationPivotZ ?? 0),
      // splitColumns remains as a compatibility alias for designs saved before
      // the configurable minimum/maximum column range was introduced.
      splitColumns: splitColumnsMin,
      splitColumnsMin,
      splitColumnsMax,
      splitRows: clamp(Math.round(number(clip?.splitRows, preset.splitRows ?? 3)), 1, 8),
      splitLayers: clamp(Math.round(number(clip?.splitLayers, preset.splitLayers ?? 1)), 1, 4),
      splitSeed: Math.round(number(clip?.splitSeed, preset.splitSeed ?? 17)),
      splitRotation: clamp(number(clip?.splitRotation, preset.splitRotation ?? 35), 0, 360),
      step1Pause: Math.max(0, number(clip?.step1Pause, preset.step1Pause || 0)),
      step2Pause: Math.max(0, number(clip?.step2Pause, preset.step2Pause || 0)),
      step3Pause: Math.max(0, number(clip?.step3Pause, preset.step3Pause || 0)),
      step4Pause: Math.max(0, number(clip?.step4Pause, preset.step4Pause || 0)),
      blinkMinOpacity: clamp(number(clip?.blinkMinOpacity, preset.blinkMinOpacity ?? 0.08), 0, 1),
      blinkDutyCycle: clamp(number(clip?.blinkDutyCycle, preset.blinkDutyCycle ?? 0.5), 0.01, 0.99),
      visibilityAction: ["show", "hide", "toggle"].includes(clip?.visibilityAction) ? clip.visibilityAction : (preset.visibilityAction || "hide"),
      holdEnd: clip?.holdEnd === undefined ? preset.holdEnd !== false : clip.holdEnd !== false,
    };
  }

  function legacyClip(component) {
    const legacyType = component?.animationType;
    if (!legacyType || legacyType === "none") return null;
    const migratedLegacyType = legacyType === "spin" ? "rotate" : legacyType;
    const type = TYPE_VALUES.has(migratedLegacyType) ? migratedLegacyType : "move";
    const speed = Math.max(0.001, number(component.animationSpeed, 0.1));
    const activeSeconds = 1 / speed;
    const standardPause = Math.max(0, number(component.animationPauseSeconds, 0));
    const pauses = [1, 2, 3, 4].map((step) => Math.max(0, number(component[`animationStep${step}PauseSeconds`], number(component.animationPauseSeconds, 0))));
    const totalSeconds = type === "fourStep"
      ? activeSeconds + pauses.reduce((sum, value) => sum + value, 0)
      : type === "oscillate"
        ? activeSeconds + standardPause * 2
        : type === "rotate"
          ? activeSeconds
          : activeSeconds + standardPause;
    return normalizeClip({
      id: uniqueId(`legacy-${type}`),
      name: `Legacy ${TYPES.find((item) => item.value === type)?.label || "animation"}`,
      type,
      start: 0,
      duration: Math.max(2, totalSeconds),
      cycleSeconds: activeSeconds,
      cyclePause: type !== "oscillate" && type !== "fourStep" ? standardPause : 0,
      pauseAtPositive: type === "oscillate" ? standardPause : 0,
      pauseAtNegative: type === "oscillate" ? standardPause : 0,
      repeatCount: 0,
      easing: "easeInOut",
      phase: number(component.animationPhase, 0),
      axis: component.animationAxis,
      secondaryAxis: component.animationSecondaryAxis,
      amount: component.animationAmount,
      secondaryAmount: component.animationSecondaryAmount,
      step1Pause: pauses[0],
      step2Pause: pauses[1],
      step3Pause: pauses[2],
      step4Pause: pauses[3],
      holdEnd: true,
    });
  }

  function normalizeTimeline(timeline, legacyComponent = null) {
    const hasSavedTimeline = Boolean(timeline && typeof timeline === "object" && Array.isArray(timeline.clips));
    const legacy = hasSavedTimeline ? null : legacyClip(legacyComponent);
    const clips = hasSavedTimeline
      ? timeline.clips.map(normalizeClip)
      : (legacy ? [legacy] : []);
    return {
      enabled: hasSavedTimeline ? timeline.enabled !== false : legacyComponent?.animationEnabled !== false,
      loop: timeline?.loop !== false,
      playbackRate: clamp(number(timeline?.playbackRate, 1), 0, 20),
      // Timeline length is derived from clip endpoints. Older builds stored an
      // editable span here, and a bad drag/input could persist values such as
      // 886370 seconds. Resetting the metadata to zero repairs those designs
      // while keeping every actual clip and its timing intact.
      duration: 0,
      clips,
    };
  }

  function createClip(type = "move", start = 0) {
    const requestedType = type === "spin" ? "rotate" : type;
    const safeType = TYPE_VALUES.has(requestedType) ? requestedType : "move";
    return normalizeClip({
      ...PRESETS[safeType],
      type: safeType,
      start,
      name: TYPES.find((item) => item.value === safeType)?.label,
    });
  }

  function timelineDuration(timeline) {
    const normalized = normalizeTimeline(timeline);
    const contentDuration = normalized.clips.reduce((maximum, clip) => Math.max(maximum, clip.start + clip.duration), 0);
    const rawDuration = Math.max(MIN_TIMELINE_SECONDS, contentDuration || 0);
    return rawDuration <= MIN_TIMELINE_SECONDS ? MIN_TIMELINE_SECONDS : Math.ceil(rawDuration / 5) * 5;
  }

  function sharedTimelineDuration(timelines) {
    const contentDuration = (timelines || []).reduce((maximum, timeline) => {
      const normalized = normalizeTimeline(timeline);
      return normalized.clips.reduce(
        (timelineMaximum, clip) => Math.max(timelineMaximum, clip.start + clip.duration),
        maximum,
      );
    }, 0);
    const rawDuration = Math.max(MIN_TIMELINE_SECONDS, contentDuration || 0);
    return rawDuration <= MIN_TIMELINE_SECONDS ? MIN_TIMELINE_SECONDS : Math.ceil(rawDuration / 5) * 5;
  }

  function ease(value, easing) {
    const t = clamp(value, 0, 1);
    if (easing === "easeIn") return t * t;
    if (easing === "easeOut") return 1 - (1 - t) * (1 - t);
    if (easing === "easeInOut") return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    if (easing === "smooth") return t * t * (3 - 2 * t);
    if (easing === "step") return t >= 1 ? 1 : 0;
    return t;
  }

  function clipCycleSample(clip, elapsed, totalSeconds) {
    const total = Math.max(0.05, totalSeconds);
    const repeatLimit = clip.repeatCount > 0 ? clip.repeatCount * total : clip.duration;
    const allowedDuration = Math.max(0, Math.min(clip.duration, repeatLimit));
    const terminal = elapsed >= allowedDuration;
    let sample = clamp(elapsed, 0, allowedDuration);
    // Holding the final value should sample just before an exact cycle boundary,
    // rather than resetting to the first frame of the next cycle.
    if (terminal && clip.holdEnd && sample > 0) sample = Math.max(0, sample - 1e-7);
    const shifted = sample + clip.phase / 360 * total;
    const cycleIndex = Math.floor(shifted / total);
    const local = ((shifted % total) + total) % total;
    return { local, cycleIndex, total, allowedDuration, terminal };
  }

  function genericCycleState(clip, elapsed) {
    const active = Math.max(0.05, clip.cycleSeconds);
    const total = active + clip.cyclePause;
    const sample = clipCycleSample(clip, elapsed, total);
    let progress = sample.local < active ? ease(sample.local / active, clip.easing) : 1;
    if (clip.yoyo && sample.cycleIndex % 2 === 1) progress = 1 - progress;
    return { ...sample, active, progress };
  }

  // Blink and visibility are discrete state changes, not eased motion. Sampling
  // their raw cycle phase keeps them functional even when the clip uses the
  // default "step" easing, which intentionally stays at zero until the end.
  function discreteCycleState(clip, elapsed) {
    const active = Math.max(0.05, clip.cycleSeconds);
    const total = active + clip.cyclePause;
    const sample = clipCycleSample(clip, elapsed, total);
    let progress = sample.local < active ? sample.local / active : 1;
    if (clip.yoyo && sample.cycleIndex % 2 === 1) progress = 1 - progress;
    return { ...sample, active, progress: clamp(progress, 0, 1) };
  }

  function oscillationWave(clip, elapsed) {
    const active = Math.max(0.05, clip.cycleSeconds);
    const positivePause = Math.max(0, clip.pauseAtPositive);
    const negativePause = Math.max(0, clip.pauseAtNegative);
    const total = active + positivePause + negativePause;
    const sample = clipCycleSample(clip, elapsed, total);
    const quarter = active / 4;
    const half = active / 2;
    let local = sample.local;
    let wave = 0;
    if (local < quarter) {
      wave = Math.sin(ease(local / quarter, clip.easing) * Math.PI / 2);
    } else {
      local -= quarter;
      if (local < positivePause) wave = 1;
      else {
        local -= positivePause;
        if (local < half) wave = Math.cos(ease(local / half, clip.easing) * Math.PI);
        else {
          local -= half;
          if (local < negativePause) wave = -1;
          else {
            local -= negativePause;
            wave = -Math.cos(ease(local / quarter, clip.easing) * Math.PI / 2);
          }
        }
      }
    }
    if (clip.yoyo && sample.cycleIndex % 2 === 1) wave *= -1;
    return wave;
  }

  function addAxis(vector, axis, amount) {
    if (axis === "all") {
      vector[0] += amount;
      vector[1] += amount;
      vector[2] += amount;
      return;
    }
    const index = { x: 0, y: 1, z: 2 }[axis];
    if (index !== undefined) vector[index] += amount;
  }

  // Seeded pseudo-random values keep every fragment path stable across frames,
  // reloads, exports, and the linked Plant Layout renderer.
  function splitRandom(seed, index, channel) {
    let value = (Math.round(number(seed, 17)) ^ Math.imul(index + 1, 0x45d9f3b) ^ Math.imul(channel + 1, 0x27d4eb2d)) >>> 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967295;
  }

  function normalizeRectangularSplitEffect(effect = {}) {
    const seed = Math.round(number(effect.seed ?? effect.splitSeed, 17));
    const fixedColumns = clamp(Math.round(number(effect.columns ?? effect.splitColumns, 4)), 1, 8);
    const requestedMinimum = clamp(Math.round(number(effect.columnsMin ?? effect.splitColumnsMin, fixedColumns)), 1, 8);
    const requestedMaximum = clamp(Math.round(number(effect.columnsMax ?? effect.splitColumnsMax, fixedColumns)), 1, 8);
    const columnsMin = Math.min(requestedMinimum, requestedMaximum);
    const columnsMax = Math.max(requestedMinimum, requestedMaximum);
    const columnRange = columnsMax - columnsMin + 1;
    const columns = columnsMin + Math.min(columnRange - 1, Math.floor(splitRandom(seed, 0, 101) * columnRange));
    return {
      progress: clamp(number(effect.progress, 0), 0, 1),
      columns,
      columnsMin,
      columnsMax,
      rows: clamp(Math.round(number(effect.rows ?? effect.splitRows, 3)), 1, 8),
      layers: clamp(Math.round(number(effect.layers ?? effect.splitLayers, 1)), 1, 4),
      distance: Math.max(0, number(effect.distance ?? effect.amount, 6)),
      seed,
      rotation: clamp(number(effect.rotation ?? effect.splitRotation, 35), 0, 360),
      axis: AXES.includes(effect.axis ?? effect.spreadAxis) ? (effect.axis ?? effect.spreadAxis) : "all",
    };
  }

  function rectangularSplitCells(effect = {}) {
    const normalized = normalizeRectangularSplitEffect(effect);
    const cells = [];
    let index = 0;
    for (let layer = 0; layer < normalized.layers; layer += 1) {
      for (let row = 0; row < normalized.rows; row += 1) {
        for (let column = 0; column < normalized.columns; column += 1) {
          const center = [
            (column + 0.5) / normalized.columns - 0.5,
            (row + 0.5) / normalized.rows - 0.5,
            (layer + 0.5) / normalized.layers - 0.5,
          ];
          const randomVector = [0, 1, 2].map((channel) => splitRandom(normalized.seed, index, channel) * 2 - 1);
          let direction;
          if (normalized.axis === "all") {
            direction = center.map((value, axis) => value * 1.65 + randomVector[axis] * 0.85);
            let magnitude = Math.hypot(...direction);
            if (magnitude < 0.0001) {
              direction = [1, 0, 0];
              magnitude = 1;
            }
            direction = direction.map((value) => value / magnitude);
          } else {
            const axisIndex = { x: 0, y: 1, z: 2 }[normalized.axis] ?? 0;
            const signedDirection = center[axisIndex] * 1.65 + randomVector[axisIndex] * 0.85;
            direction = [0, 0, 0];
            direction[axisIndex] = signedDirection < 0 ? -1 : 1;
          }
          cells.push({
            index,
            column,
            row,
            layer,
            center,
            direction,
            rotation: [3, 4, 5].map((channel) => (splitRandom(normalized.seed, index, channel) * 2 - 1) * normalized.rotation),
          });
          index += 1;
        }
      }
    }
    return { ...normalized, cells };
  }

  // Fade clips behave as a single stateful opacity track. This allows a fade-out
  // to hold at zero until a later fade-in restores the part without multiplying
  // overlapping fade clips into an unpredictable result.
  function evaluateFadeOpacity(clips, time) {
    const fadeClips = clips
      .filter((clip) => clip.enabled !== false && (clip.type === "fadeIn" || clip.type === "fadeOut"))
      .sort((first, second) => first.start - second.start);
    if (!fadeClips.length) return 1;
    if (time < fadeClips[0].start) return fadeClips[0].type === "fadeIn" ? 0 : 1;

    let activeFade = fadeClips[0];
    for (const clip of fadeClips) {
      if (clip.start > time) break;
      activeFade = clip;
    }

    const elapsed = time - activeFade.start;
    if (elapsed <= activeFade.duration) {
      const progress = ease(elapsed / activeFade.duration, activeFade.easing);
      return activeFade.type === "fadeIn" ? progress : 1 - progress;
    }
    if (!activeFade.holdEnd) return 1;
    return activeFade.type === "fadeIn" ? 1 : 0;
  }

  function evaluateFourStep(clip, elapsed) {
    const active = Math.max(0.05, clip.cycleSeconds);
    const pauses = [clip.step1Pause, clip.step2Pause, clip.step3Pause, clip.step4Pause];
    const total = active + pauses.reduce((sum, value) => sum + value, 0);
    const sample = clipCycleSample(clip, elapsed, total);
    let local = sample.local;
    const legDuration = active / 4;
    const points = [[0, 0], [clip.amount, 0], [clip.amount, clip.secondaryAmount], [0, clip.secondaryAmount], [0, 0]];
    for (let index = 0; index < 4; index += 1) {
      if (local <= legDuration) {
        const progress = ease(legDuration > 0 ? local / legDuration : 1, clip.easing);
        return [
          points[index][0] + (points[index + 1][0] - points[index][0]) * progress,
          points[index][1] + (points[index + 1][1] - points[index][1]) * progress,
        ];
      }
      local -= legDuration;
      if (local <= pauses[index]) return points[index + 1];
      local -= pauses[index];
    }
    return [0, 0];
  }

  function evaluateTimeline(timeline, seconds, options = {}) {
    const normalized = normalizeTimeline(timeline);
    const sharedClock = options.sharedClock === true;
    const requestedDuration = Number(options.duration);
    const evaluationDuration = Number.isFinite(requestedDuration) && requestedDuration > 0
      ? requestedDuration
      : timelineDuration(normalized);
    const result = {
      translation: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      opacity: 1,
      visible: null,
      rectangularSplit: null,
      rotationOperations: [],
      activeClipIds: [],
      time: 0,
      duration: evaluationDuration,
    };
    if (!normalized.enabled || (!sharedClock && normalized.playbackRate <= 0) || !normalized.clips.length) return result;
    const duration = result.duration;
    // Shared-clock evaluation keeps every part on one design-level playhead.
    // Per-part timeline speed and loop settings remain readable for older files,
    // but they cannot make one component drift away from the rest of the design.
    const playbackRate = sharedClock ? Math.max(0, number(options.playbackRate, 1)) : normalized.playbackRate;
    const loop = sharedClock ? options.loop !== false : normalized.loop;
    const scaled = Math.max(0, number(seconds, 0) * playbackRate);
    const time = loop ? ((scaled % duration) + duration) % duration : Math.min(scaled, duration);
    result.time = time;
    result.opacity *= evaluateFadeOpacity(normalized.clips, time);

    normalized.clips.forEach((clip) => {
      if (!clip.enabled) return;
      const elapsed = time - clip.start;
      const afterClip = elapsed > clip.duration;
      if (elapsed < 0 || (afterClip && !clip.holdEnd)) return;
      const local = clamp(elapsed, 0, clip.duration);
      const progress = ease(local / clip.duration, clip.easing);
      result.activeClipIds.push(clip.id);

      if (clip.type === "move") {
        addAxis(result.translation, clip.axis, clip.amount * progress);
      } else if (clip.type === "oscillate") {
        addAxis(result.translation, clip.axis, oscillationWave(clip, local) * clip.amount / 2);
      } else if (clip.type === "bob") {
        const state = genericCycleState(clip, local);
        addAxis(result.translation, "y", Math.sin(state.progress * Math.PI * 2) * clip.amount / 2);
      } else if (clip.type === "loop") {
        const state = genericCycleState(clip, local);
        addAxis(result.translation, clip.axis, (state.progress - 0.5) * clip.amount);
      } else if (clip.type === "fourStep") {
        const [first, second] = evaluateFourStep(clip, local);
        addAxis(result.translation, clip.axis, first);
        addAxis(result.translation, clip.secondaryAxis, second);
      } else if (clip.type === "rotate") {
        const operationRotation = [0, 0, 0];
        addAxis(operationRotation, clip.axis, clip.amount * progress);
        operationRotation.forEach((value, index) => {
          result.rotation[index] += value;
        });
        result.rotationOperations.push({
          clipId: clip.id,
          rotation: operationRotation,
          pivotOffset: [clip.rotationPivotX, clip.rotationPivotY, clip.rotationPivotZ],
        });
      } else if (clip.type === "pulse") {
        const state = genericCycleState(clip, local);
        const factor = Math.max(0.01, 1 + Math.sin(state.progress * Math.PI * 2) * clip.amount / 100);
        if (clip.axis === "all") result.scale = result.scale.map((value) => value * factor);
        else result.scale[{ x: 0, y: 1, z: 2 }[clip.axis] ?? 0] *= factor;
      } else if (clip.type === "splitRectangles") {
        result.rectangularSplit = normalizeRectangularSplitEffect({
          progress,
          columnsMin: clip.splitColumnsMin,
          columnsMax: clip.splitColumnsMax,
          rows: clip.splitRows,
          layers: clip.splitLayers,
          distance: clip.amount,
          seed: clip.splitSeed,
          rotation: clip.splitRotation,
          axis: clip.axis,
        });
      } else if (clip.type === "fadeIn" || clip.type === "fadeOut") {
        // Fade opacity is evaluated once as a stateful track before compositing
        // blinking and the other independent animation properties.
      } else if (clip.type === "blink") {
        const state = discreteCycleState(clip, local);
        result.opacity *= state.progress < clip.blinkDutyCycle ? 1 : clip.blinkMinOpacity;
      } else if (clip.type === "visibility") {
        const state = discreteCycleState(clip, local);
        if (clip.visibilityAction === "show") result.visible = true;
        else if (clip.visibilityAction === "hide") result.visible = false;
        else result.visible = state.cycleIndex % 2 === 0;
      }
    });
    return result;
  }

  function describeClip(clip) {
    const normalized = normalizeClip(clip);
    const label = TYPES.find((item) => item.value === normalized.type)?.label || normalized.type;
    return `${label} · ${normalized.start.toFixed(2)}s–${(normalized.start + normalized.duration).toFixed(2)}s`;
  }

  window.MachineAnimationTimeline = {
    MIN_TIMELINE_SECONDS,
    PRESETS,
    TYPES,
    EASINGS,
    normalizeClip,
    normalizeTimeline,
    createClip,
    timelineDuration,
    sharedTimelineDuration,
    evaluateTimeline,
    normalizeRectangularSplitEffect,
    rectangularSplitCells,
    describeClip,
  };
})();
