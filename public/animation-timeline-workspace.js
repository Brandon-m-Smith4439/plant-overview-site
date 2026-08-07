(() => {
  "use strict";

  const MIN_CLIP_DURATION = 0.05;
  const DEFAULT_SNAP_STEP = 0.05;
  const MIN_TIMELINE_SECONDS = 30;
  const PIXELS_PER_SECOND = 44;
  const MIN_TIMELINE_WIDTH = 960;

  function number(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function snap(value, step = DEFAULT_SNAP_STEP) {
    const safeStep = Math.max(0.001, number(step, DEFAULT_SNAP_STEP));
    return Math.round(number(value, 0) / safeStep) * safeStep;
  }

  function sortClips(clips) {
    return [...(clips || [])].sort((first, second) => {
      const startDifference = number(first?.start) - number(second?.start);
      if (Math.abs(startDifference) > 1e-9) return startDifference;
      const durationDifference = number(first?.duration) - number(second?.duration);
      if (Math.abs(durationDifference) > 1e-9) return durationDifference;
      return String(first?.name || first?.id || "").localeCompare(String(second?.name || second?.id || ""));
    });
  }

  function clipEnd(clip) {
    return Math.max(0, number(clip?.start)) + Math.max(MIN_CLIP_DURATION, number(clip?.duration, MIN_CLIP_DURATION));
  }

  function contentDuration(clips, minimum = MIN_TIMELINE_SECONDS) {
    return Math.max(
      Math.max(MIN_CLIP_DURATION, number(minimum, MIN_TIMELINE_SECONDS)),
      ...(clips || []).map(clipEnd),
    );
  }

  function displayDuration(clips, requestedDuration = 0) {
    const raw = contentDuration(clips, Math.max(MIN_TIMELINE_SECONDS, number(requestedDuration, 0)));
    if (raw <= MIN_TIMELINE_SECONDS) return MIN_TIMELINE_SECONDS;
    return Math.ceil(raw / 5) * 5;
  }

  function timelinePixelWidth(duration, minimumWidth = MIN_TIMELINE_WIDTH) {
    return Math.max(number(minimumWidth, MIN_TIMELINE_WIDTH), displayDuration([], duration) * PIXELS_PER_SECOND);
  }

  function secondsFromPixelDelta(deltaPixels, pixelsPerSecond = PIXELS_PER_SECOND) {
    return number(deltaPixels, 0) / Math.max(1, number(pixelsPerSecond, PIXELS_PER_SECOND));
  }

  function timeFromClientX(clientX, rectangle, duration) {
    const width = Math.max(1, number(rectangle?.width, 1));
    const left = number(rectangle?.left, 0);
    const normalized = clamp((number(clientX, left) - left) / width, 0, 1);
    return normalized * Math.max(MIN_CLIP_DURATION, number(duration, MIN_TIMELINE_SECONDS));
  }

  function neighborSnapStart(clips, clipId, candidateStart, duration, tolerance = 0.12) {
    const safeDuration = Math.max(MIN_CLIP_DURATION, number(duration, MIN_CLIP_DURATION));
    const candidateEnd = candidateStart + safeDuration;
    let bestStart = candidateStart;
    let bestDistance = Math.max(0, number(tolerance, 0.12));

    (clips || []).forEach((clip) => {
      if (!clip || clip.id === clipId) return;
      const start = Math.max(0, number(clip.start));
      const end = clipEnd(clip);
      const candidates = [
        { start: end, distance: Math.abs(candidateStart - end) },
        { start: Math.max(0, start - safeDuration), distance: Math.abs(candidateEnd - start) },
      ];
      candidates.forEach((candidate) => {
        if (candidate.distance <= bestDistance) {
          bestDistance = candidate.distance;
          bestStart = candidate.start;
        }
      });
    });
    return Math.max(0, bestStart);
  }

  function moveClip(clips, clipId, start, options = {}) {
    const clip = (clips || []).find((item) => item?.id === clipId);
    if (!clip) return null;
    const step = Math.max(0.001, number(options.step, DEFAULT_SNAP_STEP));
    const tolerance = Math.max(0, number(options.neighborTolerance, step * 2.5));
    let nextStart = Math.max(0, number(start));
    if (options.snapToNeighbors !== false) {
      nextStart = neighborSnapStart(clips, clipId, nextStart, clip.duration, tolerance);
    }
    clip.start = Math.max(0, snap(nextStart, step));
    return clip;
  }

  function resizeClip(clips, clipId, edge, time, options = {}) {
    const clip = (clips || []).find((item) => item?.id === clipId);
    if (!clip) return null;
    const step = Math.max(0.001, number(options.step, DEFAULT_SNAP_STEP));
    const minimumDuration = Math.max(0.001, number(options.minimumDuration, MIN_CLIP_DURATION));
    const originalStart = Math.max(0, number(clip.start));
    const originalEnd = originalStart + Math.max(minimumDuration, number(clip.duration, minimumDuration));
    const snappedTime = Math.max(0, snap(time, step));

    if (edge === "start") {
      const nextStart = clamp(snappedTime, 0, originalEnd - minimumDuration);
      clip.start = nextStart;
      clip.duration = Math.max(minimumDuration, originalEnd - nextStart);
    } else {
      clip.duration = Math.max(minimumDuration, snappedTime - originalStart);
    }
    clip.start = Math.max(0, snap(clip.start, step));
    clip.duration = Math.max(minimumDuration, snap(clip.duration, step));
    return clip;
  }

  function rippleResizeClipEnd(clips, clipId, time, options = {}) {
    const baseline = Array.isArray(options.baseline) && options.baseline.length
      ? options.baseline
      : (clips || []).map((clip) => ({
          id: clip?.id,
          start: Math.max(0, number(clip?.start)),
          duration: Math.max(MIN_CLIP_DURATION, number(clip?.duration, MIN_CLIP_DURATION)),
        }));
    const baselineById = new Map(baseline.map((clip) => [clip.id, clip]));
    const selectedBaseline = baselineById.get(clipId);
    const selectedClip = (clips || []).find((clip) => clip?.id === clipId);
    if (!selectedBaseline || !selectedClip) return null;

    // Restore the drag-start state before every pointer sample. This prevents
    // repeated pointermove events from accumulating shifts and keeps ripple
    // behavior deterministic even when the cursor moves back and forth.
    (clips || []).forEach((clip) => {
      const original = baselineById.get(clip?.id);
      if (!original) return;
      clip.start = original.start;
      clip.duration = original.duration;
    });

    resizeClip(clips, clipId, "end", time, options);
    const originalEnd = selectedBaseline.start + selectedBaseline.duration;
    const nextEnd = clipEnd(selectedClip);
    const pushDistance = Math.max(0, nextEnd - originalEnd);
    const step = Math.max(0.001, number(options.step, DEFAULT_SNAP_STEP));
    const shiftedIds = [];

    if (pushDistance > 0) {
      (clips || []).forEach((clip) => {
        const original = baselineById.get(clip?.id);
        if (!original || clip.id === clipId || original.start < originalEnd - 1e-9) return;
        clip.start = Math.max(0, snap(original.start + pushDistance, step));
        shiftedIds.push(clip.id);
      });
    }

    return { clip: selectedClip, pushDistance, shiftedIds };
  }

  function nextClipStart(clips) {
    return sortClips(clips).reduce((latest, clip) => Math.max(latest, clipEnd(clip)), 0);
  }

  function removeClip(clips, clipId) {
    if (!Array.isArray(clips)) return null;
    const index = clips.findIndex((clip) => clip?.id === clipId);
    if (index < 0) return null;
    const [removed] = clips.splice(index, 1);
    const ordered = sortClips(clips);
    clips.splice(0, clips.length, ...ordered);
    const nextIndex = Math.min(index, Math.max(0, clips.length - 1));
    return {
      removed,
      index,
      nextClipId: clips[nextIndex]?.id || null,
    };
  }

  function layoutClipsIntoLanes(clips) {
    const lanes = [];
    sortClips(clips).forEach((clip) => {
      const start = Math.max(0, number(clip.start));
      let lane = lanes.find((candidate) => candidate.end <= start + 1e-9);
      if (!lane) {
        lane = { end: 0, clips: [] };
        lanes.push(lane);
      }
      lane.clips.push(clip);
      lane.end = clipEnd(clip);
    });
    return lanes.map((lane) => lane.clips);
  }

  window.AnimationTimelineWorkspace = {
    MIN_CLIP_DURATION,
    DEFAULT_SNAP_STEP,
    MIN_TIMELINE_SECONDS,
    PIXELS_PER_SECOND,
    MIN_TIMELINE_WIDTH,
    snap,
    sortClips,
    clipEnd,
    timeFromClientX,
    neighborSnapStart,
    moveClip,
    resizeClip,
    rippleResizeClipEnd,
    nextClipStart,
    removeClip,
    layoutClipsIntoLanes,
    contentDuration,
    displayDuration,
    timelinePixelWidth,
    secondsFromPixelDelta,
  };
})();
