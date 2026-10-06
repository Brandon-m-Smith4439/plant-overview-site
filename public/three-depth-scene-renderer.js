(() => {
  "use strict";

  const legacyFactory = window.createDepthSceneRenderer;
  const colorCache = new Map();

  function nextPowerOfTwo(value) {
    return 2 ** Math.ceil(Math.log2(Math.max(1, value)));
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function parseColor(value, opacity = 1) {
    const cacheKey = `${value}:${opacity}`;
    if (colorCache.has(cacheKey)) return colorCache.get(cacheKey);
    const input = String(value || "#68777a").trim();
    let red = 104;
    let green = 119;
    let blue = 122;
    let alpha = 1;
    const shortHex = input.match(/^#([0-9a-f]{3})([0-9a-f])?$/i);
    const longHex = input.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
    const rgb = input.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (shortHex) {
      red = parseInt(shortHex[1][0] + shortHex[1][0], 16);
      green = parseInt(shortHex[1][1] + shortHex[1][1], 16);
      blue = parseInt(shortHex[1][2] + shortHex[1][2], 16);
      if (shortHex[2]) alpha = parseInt(shortHex[2] + shortHex[2], 16) / 255;
    } else if (longHex) {
      red = parseInt(longHex[1].slice(0, 2), 16);
      green = parseInt(longHex[1].slice(2, 4), 16);
      blue = parseInt(longHex[1].slice(4, 6), 16);
      if (longHex[2]) alpha = parseInt(longHex[2], 16) / 255;
    } else if (rgb) {
      red = Number(rgb[1]);
      green = Number(rgb[2]);
      blue = Number(rgb[3]);
      alpha = rgb[4] === undefined ? 1 : Number(rgb[4]);
    }
    const result = [clamp(red / 255, 0, 1), clamp(green / 255, 0, 1), clamp(blue / 255, 0, 1), clamp(alpha * opacity, 0, 1)];
    if (colorCache.size >= 512) colorCache.delete(colorCache.keys().next().value);
    colorCache.set(cacheKey, result);
    return result;
  }

  function createRecorder() {
    return { opaquePositions: [], opaqueColors: [], transparentPositions: [], transparentColors: [], linePositions: [], lineColors: [] };
  }

  function resetRecorder(record) {
    for (const key of ["opaquePositions", "opaqueColors", "transparentPositions", "transparentColors", "linePositions", "lineColors"]) record[key].length = 0;
    return record;
  }

  function createThreeRenderer(canvas) {
    const THREE = window.THREE;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        depth: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
    } catch (error) {
      console.warn("Three.js retained renderer could not initialize; using the compatible renderer.", error);
      return legacyFactory(canvas);
    }

    renderer.setPixelRatio(1);
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    camera.matrixAutoUpdate = false;
    camera.matrixWorld.identity();
    camera.matrixWorldInverse.identity();
    const viewProjection = { value: new THREE.Matrix4() };
    const retained = new Map();
    const templates = new Map();
    const instanceBatches = new Map();
    const geometryInstanceBatches = new Map();
    const worldLabels = new Map();
    let current = null;
    let transient = createRecorder();
    let width = 1;
    let height = 1;
    let frame = 0;
    let disposed = false;
    let available = true;
    let instanceUploads = 0;
    let geometryBuilds = 0;
    let geometryUpdates = 0;
    let cacheHits = 0;
    let resizeCount = 0;
    let contextLosses = 0;
    let transientGroup = null;
    const gl = renderer.getContext?.();
    const timer = gl?.createQuery ? gl.getExtension("EXT_disjoint_timer_query_webgl2") : null;
    const gpuQueries = [];
    let gpuMs = null;
    let stats = { renderer: "three-retained", calls: 0, triangles: 0, lines: 0, retainedObjects: 0, instances: 0, instanceUploads: 0 };
    let frameTime = 0;
    let currentView = {};
    const CACHE_RETENTION_FRAMES = 180;
    // Frame-count-only eviction creates a feedback loop on a struggling scene:
    // at 15 FPS an obsolete resource survived four times longer than at 60 FPS.
    // Keep the old frame guard for deterministic/offline rendering, but also
    // retire unused timeline and LOD resources after a fixed wall-clock window.
    const CACHE_RETENTION_MS = 3500;

    const scratchPosition = new THREE.Vector3();
    const scratchOffset = new THREE.Vector3();
    const scratchQuaternion = new THREE.Quaternion();
    const scratchScale = new THREE.Vector3();
    const scratchMatrix = new THREE.Matrix4();
    // Plant applies X, then Y, then Z to points (Three's extrinsic ZYX).
    const scratchEuler = new THREE.Euler(0, 0, 0, "ZYX");
    const scratchColor = new THREE.Color();

    const vertexShader = `
      uniform mat4 u_viewProjection;
      varying vec4 v_color;
      void main() {
        v_color = color;
        gl_Position = u_viewProjection * vec4(position, 1.0);
      }
    `;
    const fragmentShader = `
      uniform float u_opacity;
      varying vec4 v_color;
      void main() { gl_FragColor = vec4(v_color.rgb, v_color.a * u_opacity); }
    `;
    const opaqueMaterial = new THREE.ShaderMaterial({
      uniforms: { u_viewProjection: viewProjection, u_opacity: { value: 1 } },
      vertexShader,
      fragmentShader,
      vertexColors: true,
      depthTest: true,
      depthWrite: true,
      transparent: false,
      side: THREE.DoubleSide,
    });
    const transparentMaterial = new THREE.ShaderMaterial({
      uniforms: { u_viewProjection: viewProjection, u_opacity: { value: 1 } },
      vertexShader,
      fragmentShader,
      vertexColors: true,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });
    const lineMaterial = new THREE.ShaderMaterial({
      uniforms: { u_viewProjection: viewProjection, u_opacity: { value: 1 } },
      vertexShader,
      fragmentShader,
      vertexColors: true,
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });


    function roundedRect(context, x, y, w, h, radius) {
      const r = Math.min(radius, w / 2, h / 2);
      context.beginPath();
      context.moveTo(x + r, y);
      context.lineTo(x + w - r, y);
      context.quadraticCurveTo(x + w, y, x + w, y + r);
      context.lineTo(x + w, y + h - r);
      context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      context.lineTo(x + r, y + h);
      context.quadraticCurveTo(x, y + h, x, y + h - r);
      context.lineTo(x, y + r);
      context.quadraticCurveTo(x, y, x + r, y);
      context.closePath();
    }

    const WORLD_LABEL_FACE_REVISION = "v0.13.47-extruded-text";

    function worldLabelTextureMetrics(options = {}) {
      const text = String(options.text || "Object").trim() || "Object";
      const fontSize = 54;
      const fontWeight = options.fontWeight === "bold" ? 800 : options.fontWeight === "regular" ? 500 : 700;
      const measureCanvas = document.createElement("canvas");
      const measure = measureCanvas.getContext("2d");
      measure.font = `${fontWeight} ${fontSize}px "Segoe UI", Arial, sans-serif`;
      const measured = Math.ceil(measure.measureText(text).width);
      return { text, fontSize, fontWeight, width: clamp(measured + 110, 280, 1400), height: 104 };
    }

    function finalizeWorldLabelTexture(canvas) {
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      return texture;
    }

    function createWorldLabelTexture(options = {}) {
      const backgroundColor = String(options.backgroundColor || "#132126");
      const borderColor = String(options.borderColor || "#52b7aa");
      const metrics = worldLabelTextureMetrics(options);
      const canvas = document.createElement("canvas");
      canvas.width = metrics.width;
      canvas.height = metrics.height;
      const context = canvas.getContext("2d");
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);

      context.save();
      context.shadowColor = "rgba(0,0,0,.52)";
      context.shadowBlur = 14;
      context.shadowOffsetY = 5;
      roundedRect(context, 7, 7, width - 14, height - 14, 18);
      context.fillStyle = backgroundColor;
      context.globalAlpha = .985;
      context.fill();
      context.restore();

      const surface = context.createLinearGradient(0, 7, 0, height - 7);
      surface.addColorStop(0, "rgba(255,255,255,.12)");
      surface.addColorStop(.42, "rgba(255,255,255,.025)");
      surface.addColorStop(1, "rgba(0,0,0,.22)");
      roundedRect(context, 7, 7, width - 14, height - 14, 18);
      context.fillStyle = surface;
      context.fill();

      context.save();
      context.shadowColor = borderColor;
      context.shadowBlur = 8;
      context.lineWidth = 4;
      context.strokeStyle = borderColor;
      roundedRect(context, 7, 7, width - 14, height - 14, 18);
      context.stroke();
      context.restore();

      context.lineWidth = 1.5;
      context.strokeStyle = "rgba(255,255,255,.16)";
      roundedRect(context, 14, 14, width - 28, height - 28, 13);
      context.stroke();

      context.fillStyle = borderColor;
      roundedRect(context, 20, 27, 5, height - 54, 2.5);
      context.fill();
      return finalizeWorldLabelTexture(canvas);
    }

    function createWorldLabelTextTexture(options = {}) {
      const textColor = String(options.textColor || "#ffffff");
      const metrics = worldLabelTextureMetrics(options);
      const canvas = document.createElement("canvas");
      canvas.width = metrics.width;
      canvas.height = metrics.height;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = textColor;
      context.font = `${metrics.fontWeight} ${metrics.fontSize}px "Segoe UI", Arial, sans-serif`;
      context.textAlign = "left";
      context.textBaseline = "middle";
      const glowStrength = clamp(Number(options.glowStrength ?? 55), 0, 100);
      if (glowStrength > 0) {
        context.save();
        context.shadowColor = textColor;
        context.shadowBlur = 3 + glowStrength * .16;
        context.globalAlpha = .50 + glowStrength * .003;
        context.fillText(metrics.text, 41, metrics.height / 2 + 1, metrics.width - 61);
        context.restore();
      }
      context.save();
      context.shadowColor = "rgba(0,0,0,.70)";
      context.shadowBlur = 4;
      context.shadowOffsetY = 2;
      context.fillText(metrics.text, 41, metrics.height / 2 + 1, metrics.width - 61);
      context.restore();
      context.fillText(metrics.text, 41, metrics.height / 2 + 1, metrics.width - 61);
      return finalizeWorldLabelTexture(canvas);
    }

    function worldLabelMappedMaterial(texture, { depthWrite = false } = {}) {
      return new THREE.ShaderMaterial({
        uniforms: {
          u_viewProjection: viewProjection,
          u_map: { value: texture },
          u_opacity: { value: 1 },
        },
        vertexShader: `
          uniform mat4 u_viewProjection;
          varying vec2 v_uv;
          void main() {
            v_uv = uv;
            gl_Position = u_viewProjection * modelMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D u_map;
          uniform float u_opacity;
          varying vec2 v_uv;
          void main() {
            vec4 texel = texture2D(u_map, v_uv);
            if (texel.a < 0.02) discard;
            gl_FragColor = vec4(texel.rgb, texel.a * u_opacity);
          }
        `,
        transparent: true,
        depthTest: true,
        depthWrite,
        side: THREE.FrontSide,
      });
    }

    function worldLabelFaceMaterial(options = {}) {
      return worldLabelMappedMaterial(createWorldLabelTexture(options), { depthWrite: false });
    }

    function worldLabelTextMaterial(options = {}) {
      return worldLabelMappedMaterial(createWorldLabelTextTexture(options), { depthWrite: false });
    }

    function worldLabelEdgeMaterial(options = {}) {
      // Keep the physical side/backing dark so the luminous face frame reads as
      // an accent rather than turning the entire sign into one bright block.
      const edge = parseColor(options.backgroundColor || "#132126", 1);
      return new THREE.ShaderMaterial({
        uniforms: {
          u_viewProjection: viewProjection,
          u_color: { value: new THREE.Vector4(edge[0], edge[1], edge[2], 1) },
          u_opacity: { value: 1 },
        },
        vertexShader: `
          uniform mat4 u_viewProjection;
          void main() {
            gl_Position = u_viewProjection * modelMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec4 u_color;
          uniform float u_opacity;
          void main() {
            gl_FragColor = vec4(u_color.rgb, u_color.a * u_opacity);
          }
        `,
        transparent: true,
        depthTest: true,
        depthWrite: true,
        side: THREE.DoubleSide,
      });
    }

    function createWorldLabelEntry(key, options = {}) {
      const group = new THREE.Group();
      group.matrixAutoUpdate = false;
      group.frustumCulled = false;

      const faceGeometry = new THREE.PlaneGeometry(1, 1);
      const faceMaterial = worldLabelFaceMaterial(options);
      const textMaterial = worldLabelTextMaterial(options);
      const front = new THREE.Mesh(faceGeometry, faceMaterial);
      const back = new THREE.Mesh(faceGeometry, faceMaterial);
      const frontText = new THREE.Mesh(faceGeometry, textMaterial);
      const backText = new THREE.Mesh(faceGeometry, textMaterial);
      front.frustumCulled = false;
      back.frustumCulled = false;
      frontText.frustumCulled = false;
      backText.frustumCulled = false;
      front.renderOrder = 4;
      back.renderOrder = 4;
      frontText.renderOrder = 5;
      backText.renderOrder = 5;
      // Both the face and its raised text plane are rotated on the rear so the
      // wording remains readable rather than mirrored.
      back.rotation.y = Math.PI;
      backText.rotation.y = Math.PI;

      const edgeGeometry = new THREE.BoxGeometry(1, 1, 1);
      const edgeMaterial = worldLabelEdgeMaterial(options);
      const backing = new THREE.Mesh(edgeGeometry, edgeMaterial);
      backing.frustumCulled = false;
      backing.renderOrder = 3;

      group.add(backing, front, back, frontText, backText);
      scene.add(group);
      const entry = {
        key, group, front, back, frontText, backText, backing, faceGeometry, edgeGeometry,
        faceMaterial, textMaterial, edgeMaterial, revision: "", used: true,
        lastUsed: frame, lastUsedAt: frameTime,
      };
      worldLabels.set(key, entry);
      return entry;
    }

    function disposeWorldLabel(entry) {
      if (!entry) return;
      scene.remove(entry.group);
      entry.faceMaterial?.uniforms?.u_map?.value?.dispose?.();
      entry.textMaterial?.uniforms?.u_map?.value?.dispose?.();
      entry.faceMaterial?.dispose?.();
      entry.textMaterial?.dispose?.();
      entry.edgeMaterial?.dispose?.();
      entry.faceGeometry?.dispose?.();
      entry.edgeGeometry?.dispose?.();
    }

    function addWorldLabel(key, options = {}) {
      if (!key || !options.text) return;
      let entry = worldLabels.get(String(key));
      if (!entry) entry = createWorldLabelEntry(String(key), options);
      entry.used = true;
      entry.lastUsed = frame;
      entry.lastUsedAt = frameTime;
      entry.group.visible = true;

      const revision = [
        WORLD_LABEL_FACE_REVISION,
        options.text,
        options.textColor || "",
        options.backgroundColor || "",
        options.borderColor || "",
        Number(options.glowStrength ?? 55),
        options.fontWeight || "semibold",
      ].join("|");
      if (entry.revision !== revision) {
        const previousFace = entry.faceMaterial.uniforms.u_map.value;
        const previousText = entry.textMaterial.uniforms.u_map.value;
        entry.faceMaterial.uniforms.u_map.value = createWorldLabelTexture(options);
        entry.textMaterial.uniforms.u_map.value = createWorldLabelTextTexture(options);
        previousFace?.dispose?.();
        previousText?.dispose?.();
        const edge = parseColor(options.backgroundColor || "#132126", 1);
        entry.edgeMaterial.uniforms.u_color.value.set(edge[0], edge[1], edge[2], 1);
        entry.faceMaterial.needsUpdate = true;
        entry.textMaterial.needsUpdate = true;
        entry.revision = revision;
      }

      const opacity = clamp(Number(options.opacity ?? 1), 0, 1);
      entry.faceMaterial.uniforms.u_opacity.value = opacity;
      entry.textMaterial.uniforms.u_opacity.value = opacity;
      entry.edgeMaterial.uniforms.u_opacity.value = opacity;

      const texture = entry.faceMaterial.uniforms.u_map.value;
      const image = texture?.image;
      const aspect = Math.max(.8, Number(image?.width || 512) / Math.max(1, Number(image?.height || 112)));

      // Let the sign respond gently to zoom without behaving like a 2D overlay.
      // At the clamps it is still a physical object in the same world position.
      const zoomFactor = clamp(Number(options.zoomFactor) || 1, .05, 20);
      const zoomMinimum = clamp((Number(options.zoomMinPercent) || 88) / 100, .7, 1);
      const zoomMaximum = clamp((Number(options.zoomMaxPercent) || 112) / 100, 1, 1.4);
      const adaptiveScale = clamp(Math.pow(zoomFactor, .22), zoomMinimum, zoomMaximum);

      const worldHeight = clamp((Number(options.height) || 3.5) * adaptiveScale, 1.4, 12);
      const worldWidth = worldHeight * aspect;
      const worldDepth = clamp(Number(options.depth) || .35, .1, 2);
      const faceOffset = worldDepth / 2 + .012;
      // A small physical offset produces real parallax against the sign face.
      // This is intentionally subtle: roughly 1/2 to 1 inch for normal signs.
      const textExtrude = clamp(Number(options.textExtrudeFeet) || .065, .02, .3);
      const textOffset = faceOffset + textExtrude;
      const position = Array.isArray(options.position) ? options.position : [0, 0, 0];

      // Labels remain planted at one world position, but their yaw eases toward
      // the camera instead of snapping to it. Because the placard is readable
      // on both sides, a 180-degree-equivalent target is chosen so it never
      // spins farther than necessary.
      const radians = Math.PI / 180;
      const rotationX = (Number(options.rotationX) || 0) * radians;
      const rotationZ = (Number(options.rotationZ) || 0) * radians;
      const userYawOffset = -(Number(options.rotationY) || 0) * radians;
      const followCamera = options.turnToCamera !== false;
      const cameraYaw = Number(currentView?.yaw) || 0;
      const targetYawRaw = followCamera ? cameraYaw + userYawOffset : userYawOffset;
      const wrapHalfTurn = (angle) => {
        let wrapped = angle % Math.PI;
        if (wrapped > Math.PI / 2) wrapped -= Math.PI;
        if (wrapped < -Math.PI / 2) wrapped += Math.PI;
        return wrapped;
      };
      if (!Number.isFinite(entry.turnYaw)) entry.turnYaw = targetYawRaw;
      const delta = wrapHalfTurn(targetYawRaw - entry.turnYaw);
      const dt = clamp((frameTime - Number(entry.lastTurnAt || frameTime)) / 1000, 0, .12);
      const response = clamp(Number(options.turnSpeedPercent ?? 100) / 100, .25, 2);
      const errorRatio = clamp(Math.abs(delta) / (Math.PI / 2), 0, 1);
      const maxSpeed = (.22 + 1.15 * Math.pow(errorRatio, .72)) * response;
      const easing = 1 - Math.exp(-dt * (1.25 + errorRatio * 3.8) * response);
      const desiredStep = delta * easing;
      const maxStep = maxSpeed * dt;
      const step = clamp(desiredStep, -maxStep, maxStep);
      entry.turnYaw += step;
      entry.turning = followCamera && Math.abs(delta) > .0045;
      entry.lastTurnAt = frameTime;

      scratchEuler.set(rotationX, entry.turnYaw, rotationZ, "ZYX");
      scratchQuaternion.setFromEuler(scratchEuler);
      scratchPosition.set(Number(position[0]) || 0, Number(position[1]) || 0, Number(position[2]) || 0);
      scratchScale.set(1, 1, 1);
      entry.group.matrix.compose(scratchPosition, scratchQuaternion, scratchScale);
      entry.group.matrixWorldNeedsUpdate = true;

      entry.backing.scale.set(worldWidth, worldHeight, worldDepth);
      entry.backing.position.set(0, 0, 0);
      entry.front.scale.set(worldWidth, worldHeight, 1);
      entry.front.position.set(0, 0, faceOffset);
      entry.back.scale.set(worldWidth, worldHeight, 1);
      entry.back.position.set(0, 0, -faceOffset);
      entry.frontText.scale.set(worldWidth, worldHeight, 1);
      entry.frontText.position.set(0, 0, textOffset);
      entry.backText.scale.set(worldWidth, worldHeight, 1);
      entry.backText.position.set(0, 0, -textOffset);
      entry.front.updateMatrix();
      entry.back.updateMatrix();
      entry.frontText.updateMatrix();
      entry.backText.updateMatrix();
      entry.backing.updateMatrix();
    }

    function matrixForView(view = {}) {
      if (Array.isArray(view.matrix) && view.matrix.length === 16) {
        return new THREE.Matrix4().fromArray(view.matrix);
      }
      const yaw = Number(view.yaw) || 0;
      const pitch = Number(view.pitch) || 0;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const centerX = Number(view.centerX) || 0;
      const centerY = Number(view.centerY) || 0;
      const centerZ = Number(view.centerZ) || 0;
      if (view.mode === "walk") {
        const cameraY = Number(view.cameraY) || 0;
        const near = Math.max(.01, Number(view.near) || .18);
        const far = Math.max(near + 1, Number(view.far) || 2200);
        const tangent = Math.tan((Number(view.fov) || 72) * Math.PI / 360);
        const aspect = Math.max(.01, width / Math.max(1, height));
        const xScale = 1 / Math.max(.001, tangent * aspect);
        const yScale = 1 / Math.max(.001, tangent);
        const depthX = sy * cp;
        const depthY = sp;
        const depthZ = cy * cp;
        const depthT = -(depthX * centerX + depthY * cameraY + depthZ * centerZ);
        const verticalX = -sy * sp;
        const verticalY = cp;
        const verticalZ = -cy * sp;
        const verticalT = -(verticalX * centerX + verticalY * cameraY + verticalZ * centerZ);
        const horizontalX = -cy;
        const horizontalZ = sy;
        const horizontalT = -(horizontalX * centerX + horizontalZ * centerZ);
        const depthA = (far + near) / (far - near);
        const depthB = -2 * far * near / (far - near);
        return new THREE.Matrix4().set(
          horizontalX * xScale, 0, horizontalZ * xScale, horizontalT * xScale,
          verticalX * yScale, verticalY * yScale, verticalZ * yScale, verticalT * yScale,
          depthX * depthA, depthY * depthA, depthZ * depthA, depthT * depthA + depthB,
          depthX, depthY, depthZ, depthT,
        );
      }
      const scale = Math.max(.0001, Number(view.scale) || 1);
      const xScale = 2 * scale / Math.max(1, width);
      const yScale = 2 * scale / Math.max(1, height);
      const baseline = 1 - 2 * (Number(view.originY ?? .57));
      const depthScale = 1 / Math.max(100, Number(view.depthRange) || 1600);
      return new THREE.Matrix4().set(
        cy * xScale, 0, -sy * xScale, (-cy * centerX + sy * centerZ) * xScale,
        -sy * sp * yScale, cp * yScale, -cy * sp * yScale, (sy * sp * centerX - cp * centerY + cy * sp * centerZ) * yScale + baseline,
        -sy * cp * depthScale, -sp * depthScale, -cy * cp * depthScale, (sy * cp * centerX + sp * centerY + cy * cp * centerZ) * depthScale,
        0, 0, 0, 1,
      );
    }

    function geometry(positions, colors) {
      geometryBuilds += 1;
      const result = new THREE.BufferGeometry();
      result.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      result.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
      result.attributes.position.setUsage(THREE.DynamicDrawUsage);
      result.attributes.color.setUsage(THREE.DynamicDrawUsage);
      result.computeBoundingSphere();
      return result;
    }

    function buildGroup(record) {
      const group = new THREE.Group();
      group.matrixAutoUpdate = false;
      if (record.opaquePositions.length) {
        const mesh = new THREE.Mesh(geometry(record.opaquePositions, record.opaqueColors), opaqueMaterial);
        mesh.frustumCulled = false;
        group.add(mesh);
      }
      if (record.transparentPositions.length) {
        const mesh = new THREE.Mesh(geometry(record.transparentPositions, record.transparentColors), transparentMaterial);
        mesh.frustumCulled = false;
        mesh.renderOrder = 1;
        group.add(mesh);
      }
      if (record.linePositions.length) {
        const lines = new THREE.LineSegments(geometry(record.linePositions, record.lineColors), lineMaterial);
        lines.frustumCulled = false;
        lines.renderOrder = 2;
        group.add(lines);
      }
      return group;
    }

    function disposeGroup(group) {
      group?.traverse?.((object) => object.geometry?.dispose?.());
      if (group?.parent) group.parent.remove(group);
    }

    function updateGroup(group, record) {
      if (!group) return buildGroup(record);
      const channels = [
        ["opaquePositions", "opaqueColors", opaqueMaterial, false, 0],
        ["transparentPositions", "transparentColors", transparentMaterial, false, 1],
        ["linePositions", "lineColors", lineMaterial, true, 2],
      ];
      // Reuse buffers while topology fits. Reallocate only a changed channel,
      // never the complete machine just because a moving part changed position.
      for (const [positionKey, colorKey, material, lines, order] of channels) {
        const positions = record[positionKey];
        const colors = record[colorKey];
        let child = group.children.find((item) => item.material === material);
        if (!positions.length) {
          if (child) child.visible = false;
          continue;
        }
        if (!child) {
          child = lines ? new THREE.LineSegments(geometry(positions, colors), material)
            : new THREE.Mesh(geometry(positions, colors), material);
          child.frustumCulled = false;
          child.renderOrder = order;
          group.add(child);
        } else {
          const buffer = child.geometry;
          if (buffer.attributes.position.array.length < positions.length) {
            buffer.dispose();
            child.geometry = geometry(positions, colors);
          } else {
            buffer.attributes.position.array.set(positions);
            buffer.attributes.color.array.set(colors);
            buffer.attributes.position.needsUpdate = true;
            buffer.attributes.color.needsUpdate = true;
            geometryUpdates += 1;
          }
        }
        child.geometry.setDrawRange(0, positions.length / 3);
        child.visible = true;
      }
      group.visible = true;
      return group;
    }

    function invalidateTemplate(key) {
      // Instance batches borrow template buffers: detach every borrower first.
      geometryInstanceBatches.forEach((entry, batchKey) => {
        if (entry.templateKey !== key) return;
        disposeGeometryInstanceBatch(entry);
        geometryInstanceBatches.delete(batchKey);
      });
      disposeGroup(templates.get(key)?.group);
      templates.delete(key);
    }

    function onContextLost(event) {
      event.preventDefault();
      contextLosses += 1;
      available = false;
      canvas.hidden = true;
      gpuQueries.length = 0;
      gpuMs = null;
      window.dispatchEvent?.(new window.CustomEvent("plant-renderer-fallback", {
        detail: { reason: "webgl-context-lost" },
      }));
    }

    function onContextRestored() {
      if (disposed) return;
      clearRetained();
      available = true;
      canvas.hidden = false;
      window.dispatchEvent?.(new window.CustomEvent("plant-renderer-fallback", {
        detail: { reason: "webgl-context-restored" },
      }));
    }
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);

    function appendVertex(targetPositions, targetColors, point, color) {
      targetPositions.push(Number(point[0]) || 0, Number(point[1]) || 0, Number(point[2]) || 0);
      targetColors.push(color[0], color[1], color[2], color[3]);
    }

    function addLine(start, end, colorValue, lineWidth = 1, alpha = 1) {
      if (!current || !start || !end || alpha <= .001) return;
      void lineWidth;
      const color = parseColor(colorValue, alpha);
      appendVertex(current.linePositions, current.lineColors, start, color);
      appendVertex(current.linePositions, current.lineColors, end, color);
    }

    function addPolygon(points, fill, alpha = 1, stroke = null, lineWidth = 1, options = {}) {
      if (!current || !Array.isArray(points) || points.length < 3 || alpha <= .001) return;
      const color = parseColor(fill, alpha);
      const transparent = color[3] < .985 || options.transparent === true;
      const positions = transparent ? current.transparentPositions : current.opaquePositions;
      const colors = transparent ? current.transparentColors : current.opaqueColors;
      for (let index = 1; index < points.length - 1; index += 1) {
        appendVertex(positions, colors, points[0], color);
        appendVertex(positions, colors, points[index], color);
        appendVertex(positions, colors, points[index + 1], color);
      }
      if (stroke) {
        for (let index = 0; index < points.length; index += 1) addLine(points[index], points[(index + 1) % points.length], stroke, lineWidth, alpha);
      }
    }

    function refreshViewProjection(view = {}) {
      viewProjection.value.copy(matrixForView(view));
      // The plant scene is retained in world coordinates while labels are
      // projected independently on the 2D overlay canvas. Force every shader
      // material that consumes the shared view matrix to upload it on camera
      // interaction frames so retained geometry can never remain visually
      // stuck while labels continue to move.
      opaqueMaterial.uniformsNeedUpdate = true;
      transparentMaterial.uniformsNeedUpdate = true;
      lineMaterial.uniformsNeedUpdate = true;
      instanceBatches.forEach((entry) => {
        if (entry?.mesh?.material) entry.mesh.material.uniformsNeedUpdate = true;
      });
      geometryInstanceBatches.forEach((entry) => {
        (entry?.meshes || []).forEach((mesh) => {
          if (mesh?.material) mesh.material.uniformsNeedUpdate = true;
        });
      });
      worldLabels.forEach((entry) => {
        if (entry?.faceMaterial) entry.faceMaterial.uniformsNeedUpdate = true;
        if (entry?.textMaterial) entry.textMaterial.uniformsNeedUpdate = true;
        if (entry?.edgeMaterial) entry.edgeMaterial.uniformsNeedUpdate = true;
      });
    }

    function beginFrame(nextWidth, nextHeight, project, view = {}) {
      if (disposed) return;
      frame += 1;
      frameTime = typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
      const nextW = Math.max(1, Math.round(nextWidth || 1));
      const nextH = Math.max(1, Math.round(nextHeight || 1));
      if (nextW !== width || nextH !== height || !resizeCount) {
        width = nextW;
        height = nextH;
        renderer.setSize(width, height, false);
        resizeCount += 1;
      }
      currentView = { ...view };
      refreshViewProjection(view);
      retained.forEach((entry) => { entry.used = false; entry.group.visible = false; });
      templates.forEach((entry) => { entry.used = false; });
      instanceBatches.forEach((entry) => { entry.used = false; entry.mesh.visible = false; });
      geometryInstanceBatches.forEach((entry) => { entry.used = false; entry.group.visible = false; });
      worldLabels.forEach((entry) => { entry.used = false; entry.group.visible = false; });
      resetRecorder(transient);
      current = transient;
    }

    function beginObject(key, revision = "") {
      if (!available) { current = transient; return true; }
      if (!key) return true;
      const existing = retained.get(key);
      if (existing && existing.revision === String(revision)) {
        cacheHits += 1;
        existing.used = true;
        existing.lastUsed = frame;
        existing.lastUsedAt = frameTime;
        existing.group.visible = true;
        current = transient;
        return false;
      }
      current = existing?.record ? resetRecorder(existing.record) : createRecorder();
      current.previousGroup = existing?.group;
      current.key = String(key);
      current.revision = String(revision);
      return true;
    }

    function endObject() {
      if (!current?.key) {
        current = transient;
        return;
      }
      const group = updateGroup(current.previousGroup, current);
      group.visible = true;
      scene.add(group);
      retained.set(current.key, {
        revision: current.revision,
        group,
        record: current,
        used: true,
        lastUsed: frame,
        lastUsedAt: frameTime,
      });
      current = transient;
    }

    function beginTemplate(key, revision = "") {
      if (!key) return true;
      const existing = templates.get(key);
      if (existing && existing.revision === String(revision)) {
        existing.used = true;
        existing.lastUsed = frame;
        existing.lastUsedAt = frameTime;
        current = transient;
        return false;
      }
      if (existing) {
        invalidateTemplate(key);
      }
      current = createRecorder();
      current.templateKey = String(key);
      current.revision = String(revision);
      return true;
    }

    function endTemplate() {
      if (!current?.templateKey) {
        current = transient;
        return;
      }
      const group = buildGroup(current);
      templates.set(current.templateKey, {
        revision: current.revision,
        group,
        used: true,
        lastUsed: frame,
        lastUsedAt: frameTime,
      });
      current = transient;
    }

    function clearRetained(prefix = "") {
      retained.forEach((entry, key) => {
        if (prefix && !key.startsWith(prefix)) return;
        disposeGroup(entry.group);
        retained.delete(key);
      });
      templates.forEach((entry, key) => {
        if (prefix && !key.startsWith(prefix)) return;
        invalidateTemplate(key);
      });
      geometryInstanceBatches.forEach((entry, key) => {
        if (prefix && !key.startsWith(prefix)) return;
        disposeGeometryInstanceBatch(entry);
        geometryInstanceBatches.delete(key);
      });
      instanceBatches.forEach((entry, key) => {
        if (prefix && !key.startsWith(prefix)) return;
        scene.remove(entry.mesh);
        entry.mesh.dispose();
        entry.mesh.geometry.dispose();
        entry.mesh.material.dispose();
        instanceBatches.delete(key);
      });
    }

    function createInstanceBatch(key, capacity) {
      const box = new THREE.BoxGeometry(1, 1, 1);
      const material = opaqueMaterial.clone();
      material.vertexColors = false;
      material.uniforms.u_viewProjection = viewProjection;
      material.vertexShader = material.vertexShader.replace(
        "v_color = color;\n        gl_Position = u_viewProjection * vec4(position, 1.0);",
        "v_color = vec4(instanceColor, 1.0);\n        gl_Position = u_viewProjection * instanceMatrix * vec4(position, 1.0);",
      );
      const mesh = new THREE.InstancedMesh(box, material, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      scene.add(mesh);
      const entry = { key, capacity, mesh, revision: null, used: true, lastUsed: frame, lastUsedAt: frameTime };
      instanceBatches.set(key, entry);
      return entry;
    }

    function instanceEulerRadians(instance) {
      const radians = Math.PI / 180;
      return [
        (Number(instance.rotationX) || 0) * radians,
        // Plant coordinates define positive Y rotation as +X turning toward
        // +Z. Three.js uses the opposite handed direction around its Y axis,
        // so convert only at this renderer boundary. This keeps the instanced
        // overview path identical to the individual Edit Layout path.
        -(Number(instance.rotationY ?? instance.rotation) || 0) * radians,
        (Number(instance.rotationZ) || 0) * radians,
      ];
    }

    function composeInstanceMatrix(instance) {
      if (instance.matrix?.length === 16) return scratchMatrix.fromArray(instance.matrix);
      scratchEuler.set(...instanceEulerRadians(instance));
      scratchQuaternion.setFromEuler(scratchEuler);
      scratchPosition.set(Number(instance.x) || 0, Number(instance.y) || 0, Number(instance.z) || 0);
      scratchOffset.set(Number(instance.offsetX) || 0, Number(instance.offsetY) || 0, Number(instance.offsetZ) || 0);
      scratchOffset.applyQuaternion(scratchQuaternion);
      scratchPosition.add(scratchOffset);
      scratchScale.set(
        Math.max(.001, Number(instance.scaleX) || .001),
        Math.max(.001, Number(instance.scaleY) || .001),
        Math.max(.001, Number(instance.scaleZ) || .001),
      );
      return scratchMatrix.compose(scratchPosition, scratchQuaternion, scratchScale);
    }

    function addBoxInstances(key, boxes = [], revision = "") {
      if (!boxes.length) return;
      let entry = instanceBatches.get(key);
      if (!entry || entry.capacity < boxes.length) {
        if (entry) {
          scene.remove(entry.mesh);
          entry.mesh.dispose();
          entry.mesh.geometry.dispose();
          entry.mesh.material.dispose();
        }
        entry = createInstanceBatch(key, nextPowerOfTwo(boxes.length));
      }
      const revisionKey = String(revision);
      if (entry.revision === revisionKey && entry.mesh.count === boxes.length) {
        entry.mesh.visible = true;
        entry.used = true;
        entry.lastUsed = frame;
        entry.lastUsedAt = frameTime;
        return false;
      }
      boxes.forEach((box, index) => {
        entry.mesh.setMatrixAt(index, composeInstanceMatrix({
          x: Number(box.x) + Number(box.w) / 2,
          y: (Number(box.y) || 0) + Number(box.h) / 2,
          z: Number(box.z) + Number(box.d) / 2,
          rotationX: box.rotationX,
          rotationY: box.rotationY ?? box.rotation,
          rotationZ: box.rotationZ,
          scaleX: box.w,
          scaleY: box.h,
          scaleZ: box.d,
        }));
        scratchColor.set(box.color || "#68777a");
        entry.mesh.setColorAt(index, scratchColor);
      });
      entry.mesh.count = boxes.length;
      entry.mesh.instanceMatrix.needsUpdate = true;
      if (entry.mesh.instanceColor) entry.mesh.instanceColor.needsUpdate = true;
      entry.mesh.visible = true;
      entry.revision = revisionKey;
      entry.used = true;
      entry.lastUsed = frame;
      entry.lastUsedAt = frameTime;
      instanceUploads += 1;
      return true;
    }

    function instanceMaterial(source) {
      const material = source.clone();
      material.uniforms.u_viewProjection = viewProjection;
      material.vertexShader = material.vertexShader.replace(
        "gl_Position = u_viewProjection * vec4(position, 1.0);",
        "gl_Position = u_viewProjection * instanceMatrix * vec4(position, 1.0);",
      );
      return material;
    }

    function disposeGeometryInstanceBatch(entry) {
      if (!entry) return;
      if (entry.group?.parent) entry.group.parent.remove(entry.group);
      (entry.meshes || []).forEach((mesh) => {
        mesh.dispose?.();
        mesh.material?.dispose?.();
      });
    }

    function createGeometryInstanceBatch(key, templateKey, template, capacity) {
      const group = new THREE.Group();
      group.matrixAutoUpdate = false;
      const meshes = [];
      template.group.children.forEach((source) => {
        if (!source.isMesh) return;
        const mesh = new THREE.InstancedMesh(source.geometry, instanceMaterial(source.material), capacity);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false;
        mesh.renderOrder = source.renderOrder;
        group.add(mesh);
        meshes.push(mesh);
      });
      scene.add(group);
      const entry = {
        key,
        templateKey,
        templateRevision: template.revision,
        template,
        revision: null,
        capacity,
        count: 0,
        group,
        meshes,
        used: true,
        lastUsed: frame,
        lastUsedAt: frameTime,
      };
      geometryInstanceBatches.set(key, entry);
      return entry;
    }

    function addGeometryInstances(key, templateKey, instances = [], revision = "") {
      if (!instances.length) return false;
      const template = templates.get(templateKey);
      if (!template) return false;
      template.used = true;
      template.lastUsed = frame;
      template.lastUsedAt = frameTime;
      let entry = geometryInstanceBatches.get(key);
      if (
        !entry
        || entry.capacity < instances.length
        || entry.templateKey !== templateKey
        || entry.templateRevision !== template.revision
        || entry.template !== template
      ) {
        if (entry) disposeGeometryInstanceBatch(entry);
        entry = createGeometryInstanceBatch(key, templateKey, template, nextPowerOfTwo(instances.length));
      }
      const revisionKey = String(revision);
      if (entry.revision !== revisionKey || entry.count !== instances.length) {
        instances.forEach((instance, index) => {
          const matrix = composeInstanceMatrix(instance);
          entry.meshes.forEach((mesh) => mesh.setMatrixAt(index, matrix));
        });
        entry.meshes.forEach((mesh) => {
          mesh.count = instances.length;
          mesh.instanceMatrix.needsUpdate = true;
        });
        entry.revision = revisionKey;
        entry.count = instances.length;
        instanceUploads += 1;
      }
      entry.group.visible = true;
      entry.used = true;
      entry.lastUsed = frame;
      entry.lastUsedAt = frameTime;
      return true;
    }

    function cacheEntryExpired(entry) {
      return frame - entry.lastUsed > CACHE_RETENTION_FRAMES
        || frameTime - (entry.lastUsedAt ?? frameTime) > CACHE_RETENTION_MS;
    }

    function render() {
      if (disposed || !available) return;
      if (current?.key) endObject();
      if (transient.opaquePositions.length || transient.transparentPositions.length || transient.linePositions.length) {
        transientGroup = updateGroup(transientGroup, transient);
        if (!transientGroup.parent) scene.add(transientGroup);
      } else if (transientGroup) transientGroup.visible = false;
      retained.forEach((entry, key) => {
        if (!entry.used && cacheEntryExpired(entry)) {
          disposeGroup(entry.group);
          retained.delete(key);
        }
      });
      templates.forEach((entry, key) => {
        if (!entry.used && cacheEntryExpired(entry)) {
          invalidateTemplate(key);
        }
      });
      geometryInstanceBatches.forEach((entry, key) => {
        if (!entry.used && cacheEntryExpired(entry)) {
          disposeGeometryInstanceBatch(entry);
          geometryInstanceBatches.delete(key);
        }
      });
      instanceBatches.forEach((entry, key) => {
        if (!entry.used && cacheEntryExpired(entry)) {
          scene.remove(entry.mesh);
          entry.mesh.dispose();
          entry.mesh.geometry.dispose();
          entry.mesh.material.dispose();
          instanceBatches.delete(key);
        }
      });
      worldLabels.forEach((entry, key) => {
        if (!entry.used && cacheEntryExpired(entry)) {
          disposeWorldLabel(entry);
          worldLabels.delete(key);
        }
      });
      try {
        if (timer) {
          const disjoint = gl.getParameter(timer.GPU_DISJOINT_EXT);
          while (gpuQueries.length && (disjoint || gl.getQueryParameter(gpuQueries[0], gl.QUERY_RESULT_AVAILABLE))) {
            const query = gpuQueries.shift();
            if (!disjoint) gpuMs = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
            gl.deleteQuery(query);
          }
          if (disjoint) gpuMs = null;
        }
        const query = timer && gpuQueries.length < 4 ? gl.createQuery() : null;
        if (query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
        try { renderer.render(scene, camera); } finally {
          if (query) {
            gl.endQuery(timer.TIME_ELAPSED_EXT);
            gpuQueries.push(query);
          }
        }
        const failedProgram = renderer.info.programs?.find((program) => program.diagnostics?.runnable === false);
        if (failedProgram) throw new Error("The GPU rejected a retained-renderer shader program.");
      } catch (error) {
        available = false;
        canvas.hidden = true;
        console.warn("Three.js retained renderer failed; switching this viewport to the compatible renderer.", error);
        if (typeof window.CustomEvent === "function") {
          window.dispatchEvent?.(new window.CustomEvent("plant-renderer-fallback", {
            detail: { reason: "retained-renderer-runtime-failure" },
          }));
        }
        return;
      }
      const info = renderer.info.render;
      stats = {
        renderer: "three-retained",
        calls: info.calls,
        triangles: info.triangles,
        lines: info.lines,
        retainedObjects: retained.size + templates.size,
        instances: [...instanceBatches.values()].reduce((total, entry) => total + entry.mesh.count, 0)
          + [...geometryInstanceBatches.values()].reduce((total, entry) => total + entry.count, 0),
        instanceUploads,
        geometryBuilds,
        geometryUpdates,
        cacheHits,
        resizeCount,
        contextLosses,
        geometries: renderer.info.memory?.geometries || 0,
        textures: renderer.info.memory?.textures || 0,
        gpuMs,
        gpuTimingSupported: Boolean(timer),
      };
    }

    function dispose() {
      disposed = true;
      available = false;
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      disposeGroup(transientGroup);
      gpuQueries.splice(0).forEach((query) => gl.deleteQuery(query));
      clearRetained();
      instanceBatches.forEach((entry) => {
        scene.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        entry.mesh.material.dispose();
      });
      instanceBatches.clear();
      geometryInstanceBatches.forEach(disposeGeometryInstanceBatch);
      geometryInstanceBatches.clear();
      worldLabels.forEach(disposeWorldLabel);
      worldLabels.clear();
      opaqueMaterial.dispose();
      transparentMaterial.dispose();
      lineMaterial.dispose();
      // A client-side route change can otherwise leave the retired Designer
      // WebGL context resident until garbage collection. Explicitly return it
      // before the Plant Overview creates its own high-performance context.
      try { gl?.finish?.(); } catch {}
      renderer.forceContextLoss?.();
      renderer.renderLists?.dispose?.();
      renderer.dispose();
      canvas.width = 1;
      canvas.height = 1;
    }

    return {
      get available() { return available; },
      retained: true,
      engine: "three",
      beginFrame,
      beginObject,
      endObject,
      beginTemplate,
      endTemplate,
      clearRetained,
      addBoxInstances,
      addGeometryInstances,
      addWorldLabel,
      worldLabelsAnimating: () => [...worldLabels.values()].some((entry) => entry.used && entry.turning),
      addPolygon,
      addLine,
      render,
      dispose,
      getStats: () => ({ ...stats, contextLosses, available }),
    };
  }

  window.createDepthSceneRenderer = function createDepthSceneRenderer(canvas) {
    if (!window.THREE || !legacyFactory) return legacyFactory(canvas);
    return createThreeRenderer(canvas);
  };
})();
