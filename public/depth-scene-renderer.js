(() => {
  "use strict";

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  const colorCache = new Map();

  function parseCssColor(value, opacity = 1) {
    const input = String(value || "#68777a").trim();
    let cached = colorCache.get(input);
    if (cached) return [cached[0], cached[1], cached[2], clamp(cached[3] * opacity, 0, 1)];
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

    cached = [
      clamp(red / 255, 0, 1),
      clamp(green / 255, 0, 1),
      clamp(blue / 255, 0, 1),
      clamp(alpha, 0, 1),
    ];
    if (colorCache.size > 256) colorCache.clear();
    colorCache.set(input, cached);
    return [cached[0], cached[1], cached[2], clamp(cached[3] * opacity, 0, 1)];
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || "Unknown shader compilation error.";
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function createProgram(gl) {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, `
      attribute vec3 a_position;
      attribute vec4 a_color;
      varying vec4 v_color;
      void main() {
        gl_Position = vec4(a_position, 1.0);
        v_color = a_color;
      }
    `);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec4 v_color;
      void main() {
        gl_FragColor = v_color;
      }
    `);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || "Unknown WebGL program link error.";
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  function createDepthCanvas(referenceCanvas, className = "depth-scene-canvas") {
    const canvas = document.createElement("canvas");
    canvas.className = className;
    canvas.setAttribute("aria-hidden", "true");
    referenceCanvas.parentElement?.insertBefore(canvas, referenceCanvas);
    return canvas;
  }

  function createDepthSceneRenderer(canvas) {
    let gl;
    try {
      gl = canvas.getContext("webgl2", {
        alpha: true,
        antialias: true,
        depth: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
      }) || canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        depth: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
      });
    } catch (error) {
      console.warn("WebGL depth renderer could not be initialized.", error);
    }

    if (!gl) {
      canvas.hidden = true;
      return {
        available: false,
        beginFrame() {},
        addPolygon() {},
        addLine() {},
        render() {},
        dispose() {},
      };
    }

    let program;
    try {
      program = createProgram(gl);
    } catch (error) {
      console.error("WebGL depth renderer shader setup failed.", error);
      canvas.hidden = true;
      return {
        available: false,
        beginFrame() {},
        addPolygon() {},
        addLine() {},
        render() {},
        dispose() {},
      };
    }

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const colorLocation = gl.getAttribLocation(program, "a_color");
    const buffer = gl.createBuffer();
    let width = 1;
    let height = 1;
    let project = null;
    let opaqueTriangles = [];
    let transparentTriangles = [];
    let lines = [];
    let minimumDepth = Infinity;
    let maximumDepth = -Infinity;
    let bufferCapacity = 0;
    let uploadArray = new Float32Array(256);
    const packedOpaque = [];
    const packedTransparent = [];
    const lineGroups = new Map();
    let available = true;
    let disposed = false;
    let framesUntilValidationEnds = 3;

    function disableRenderer(reason, error = null) {
      if (!available) return;
      available = false;
      canvas.hidden = true;
      if (error) console.warn(reason, error);
      else console.warn(reason);
      if (typeof window.CustomEvent === "function") {
        window.dispatchEvent?.(new window.CustomEvent("plant-renderer-fallback", {
          detail: { reason },
        }));
      }
    }

    const onContextLost = (event) => {
      event.preventDefault();
      disableRenderer("The WebGL graphics context was lost. Continuing with the compatible 2D renderer.");
    };
    canvas.addEventListener?.("webglcontextlost", onContextLost);

    function beginFrame(nextWidth, nextHeight, projectFunction) {
      if (!available) return;
      width = Math.max(1, Math.round(nextWidth || 1));
      height = Math.max(1, Math.round(nextHeight || 1));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      project = projectFunction;
      opaqueTriangles.length = 0;
      transparentTriangles.length = 0;
      lines.length = 0;
      minimumDepth = Infinity;
      maximumDepth = -Infinity;
    }

    function projectedVertex(point, color) {
      const projected = project(...point);
      if (projected[2] < minimumDepth) minimumDepth = projected[2];
      if (projected[2] > maximumDepth) maximumDepth = projected[2];
      return {
        x: projected[0],
        y: projected[1],
        depth: projected[2],
        color,
      };
    }

    function addPolygon(points, fill, alpha = 1, stroke = null, lineWidth = 1, options = {}) {
      if (!project || !Array.isArray(points) || points.length < 3 || alpha <= 0.001) return;
      const color = parseCssColor(fill, alpha);
      const vertices = points.map((point) => projectedVertex(point, color));
      const target = color[3] >= 0.985 && options.transparent !== true
        ? opaqueTriangles
        : transparentTriangles;
      for (let index = 1; index < vertices.length - 1; index += 1) {
        const triangle = [vertices[0], vertices[index], vertices[index + 1]];
        target.push({
          vertices: triangle,
          depth: triangle.reduce((sum, vertex) => sum + vertex.depth, 0) / 3,
          bias: Number(options.depthBias) || 0,
        });
      }
      if (stroke) {
        for (let index = 0; index < points.length; index += 1) {
          addLine(points[index], points[(index + 1) % points.length], stroke, lineWidth, alpha, {
            depthBias: (Number(options.depthBias) || 0) - 0.00035,
          });
        }
      }
    }

    function addLine(start, end, color, lineWidth = 1, alpha = 1, options = {}) {
      if (!project || !start || !end || alpha <= 0.001) return;
      const parsed = parseCssColor(color, alpha);
      const first = projectedVertex(start, parsed);
      const second = projectedVertex(end, parsed);
      lines.push({
        vertices: [first, second],
        depth: (first.depth + second.depth) / 2,
        width: Math.max(1, Number(lineWidth) || 1),
        transparent: parsed[3] < 0.985,
        bias: Number(options.depthBias) || -0.00045,
      });
    }

    function depthToClip(depth, minimum, range, bias = 0) {
      // The custom camera uses larger depth values for points nearer the camera.
      // WebGL uses smaller depth values for nearer fragments, so invert the range.
      return clamp(0.96 - ((depth - minimum) / range) * 1.92 + bias, -0.999, 0.999);
    }

    function appendVertex(output, vertex, minimum, range, bias = 0) {
      output.push(
        vertex.x / width * 2 - 1,
        1 - vertex.y / height * 2,
        depthToClip(vertex.depth, minimum, range, bias),
        vertex.color[0],
        vertex.color[1],
        vertex.color[2],
        vertex.color[3],
      );
    }

    function drawVertices(vertices, mode) {
      if (!vertices.length) return;
      if (uploadArray.length < vertices.length) {
        uploadArray = new Float32Array(2 ** Math.ceil(Math.log2(Math.max(256, vertices.length))));
      }
      uploadArray.set(vertices, 0);
      const array = uploadArray.subarray(0, vertices.length);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      if (array.byteLength > bufferCapacity) {
        bufferCapacity = 2 ** Math.ceil(Math.log2(Math.max(256, array.byteLength)));
        gl.bufferData(gl.ARRAY_BUFFER, bufferCapacity, gl.DYNAMIC_DRAW);
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, array);
      const stride = 7 * Float32Array.BYTES_PER_ELEMENT;
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(colorLocation);
      gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
      gl.drawArrays(mode, 0, array.length / 7);
    }

    function render() {
      if (!available) return;
      if (typeof gl.isContextLost === "function" && gl.isContextLost()) {
        disableRenderer("The WebGL graphics context is unavailable. Continuing with the compatible 2D renderer.");
        return;
      }
      try {
      if (!program || !Number.isFinite(minimumDepth) || !Number.isFinite(maximumDepth)) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        return;
      }

      const minimum = minimumDepth;
      const maximum = maximumDepth;
      const range = Math.max(0.0001, maximum - minimum);
      packedOpaque.length = 0;
      opaqueTriangles.forEach((triangle) => {
        triangle.vertices.forEach((vertex) => appendVertex(packedOpaque, vertex, minimum, range, triangle.bias));
      });

      // Blend translucent geometry from far to near while still testing it against
      // opaque depth. This keeps glass readable without allowing it to paint over
      // solid cabinets, floors, walls, or machine components in front of it.
      transparentTriangles.sort((first, second) => first.depth - second.depth);
      packedTransparent.length = 0;
      transparentTriangles.forEach((triangle) => {
        triangle.vertices.forEach((vertex) => appendVertex(packedTransparent, vertex, minimum, range, triangle.bias));
      });

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);

      gl.disable(gl.BLEND);
      gl.depthMask(true);
      drawVertices(packedOpaque, gl.TRIANGLES);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      drawVertices(packedTransparent, gl.TRIANGLES);

      // Lines stay depth-tested. They no longer show through walls or machine
      // bodies, which was a recurring problem with the previous canvas overlays.
      lineGroups.forEach((vertices) => { vertices.length = 0; });
      lines.forEach((line) => {
        const key = String(Math.round(line.width * 2) / 2);
        if (!lineGroups.has(key)) lineGroups.set(key, []);
        const output = lineGroups.get(key);
        line.vertices.forEach((vertex) => appendVertex(output, vertex, minimum, range, line.bias));
      });
      lineGroups.forEach((vertices, key) => {
        if (!vertices.length) return;
        gl.lineWidth(Math.max(1, Number(key)));
        drawVertices(vertices, gl.LINES);
      });

      gl.depthMask(true);
      gl.disable(gl.BLEND);
      if (framesUntilValidationEnds > 0 && typeof gl.getError === "function") {
        framesUntilValidationEnds -= 1;
        const errorCode = gl.getError();
        if (errorCode !== gl.NO_ERROR) {
          disableRenderer(`WebGL reported graphics error ${errorCode}. Continuing with the compatible 2D renderer.`);
        }
      }
      } catch (error) {
        disableRenderer("WebGL could not finish drawing the plant. Continuing with the compatible 2D renderer.", error);
      }
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      available = false;
      canvas.removeEventListener?.("webglcontextlost", onContextLost);
      try { gl.finish?.(); } catch {}
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      gl.getExtension?.("WEBGL_lose_context")?.loseContext?.();
      opaqueTriangles.length = 0;
      transparentTriangles.length = 0;
      lines.length = 0;
      lineGroups.clear();
      canvas.width = 1;
      canvas.height = 1;
      program = null;
    }

    return {
      get available() { return available; },
      beginFrame,
      addPolygon,
      addLine,
      render,
      dispose,
    };
  }

  window.createDepthCanvas = createDepthCanvas;
  window.createDepthSceneRenderer = createDepthSceneRenderer;
})();
