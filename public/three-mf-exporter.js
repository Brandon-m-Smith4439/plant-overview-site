(function () {
  "use strict";

  const CORE_NS = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";
  const encoder = new TextEncoder();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const xml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
  const safeName = (value, fallback = "model") => String(value || fallback).trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || fallback;
  const color = (value) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toUpperCase() : "#78878AFF";
  const rgba = (value) => `${color(value).slice(0, 7)}FF`;

  function rotatePoint(point, center, component) {
    let [x, y, z] = point.map((value, index) => value - center[index]);
    const rx = number(component?.rotationX) * Math.PI / 180;
    const ry = number(component?.rotationY ?? component?.rotation) * Math.PI / 180;
    const rz = number(component?.rotationZ) * Math.PI / 180;
    if (rx) { const c = Math.cos(rx), s = Math.sin(rx), nextY = y * c - z * s; z = y * s + z * c; y = nextY; }
    if (ry) { const c = Math.cos(ry), s = Math.sin(ry), nextX = x * c - z * s; z = x * s + z * c; x = nextX; }
    if (rz) { const c = Math.cos(rz), s = Math.sin(rz), nextX = x * c - y * s; y = x * s + y * c; x = nextX; }
    return [x + center[0], y + center[1], z + center[2]];
  }

  function meshBuilder() {
    const vertices = [];
    const triangles = [];
    const colors = [];
    const colorIds = new Map();
    const material = (value) => {
      const key = rgba(value);
      if (!colorIds.has(key)) { colorIds.set(key, colors.length); colors.push(key); }
      return colorIds.get(key);
    };
    const addMesh = (points, faces, fill, transform = null) => {
      const offset = vertices.length;
      points.forEach((point) => vertices.push(transform ? transform(point) : point));
      const property = material(fill);
      faces.forEach((face) => triangles.push([offset + face[0], offset + face[1], offset + face[2], property]));
    };
    const box = (shape, transform = null) => {
      const x = number(shape.x), y = number(shape.y), z = number(shape.z);
      const w = Math.max(.001, Math.abs(number(shape.w, 1)));
      const h = Math.max(.001, Math.abs(number(shape.h, 1)));
      const d = Math.max(.001, Math.abs(number(shape.d, 1)));
      const center = [x + w / 2, y + h / 2, z + d / 2];
      const points = [
        [x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],
        [x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d],
      ].map((point) => rotatePoint(point, center, shape));
      addMesh(points, [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[3,7,6],[3,6,2],[0,4,7],[0,7,3],[1,2,6],[1,6,5]], shape.color, transform);
    };
    const cylinder = (shape, transform = null, cone = false) => {
      const x = number(shape.x), y = number(shape.y), z = number(shape.z);
      const w = Math.max(.001, Math.abs(number(shape.w, 1)));
      const h = Math.max(.001, Math.abs(number(shape.h, 1)));
      const d = Math.max(.001, Math.abs(number(shape.d, 1)));
      const count = clamp(Math.round(number(shape.segments, 20)), 10, 40);
      const center = [x + w / 2, y + h / 2, z + d / 2];
      const points = [[x + w / 2, y, z + d / 2], [x + w / 2, y + h, z + d / 2]];
      for (let index = 0; index < count; index += 1) {
        const angle = Math.PI * 2 * index / count;
        points.push([x + w / 2 + Math.cos(angle) * w / 2, y, z + d / 2 + Math.sin(angle) * d / 2]);
        points.push([x + w / 2 + Math.cos(angle) * w / 2 * (cone ? 0 : 1), y + h, z + d / 2 + Math.sin(angle) * d / 2 * (cone ? 0 : 1)]);
      }
      const faces = [];
      for (let index = 0; index < count; index += 1) {
        const next = (index + 1) % count;
        const bottom = 2 + index * 2, top = bottom + 1, nextBottom = 2 + next * 2, nextTop = nextBottom + 1;
        faces.push([0, nextBottom, bottom], [1, top, nextTop], [bottom, nextBottom, nextTop]);
        if (!cone) faces.push([bottom, nextTop, top]);
      }
      addMesh(points.map((point) => rotatePoint(point, center, shape)), faces, shape.color, transform);
    };
    const sphere = (shape, transform = null) => {
      const x = number(shape.x), y = number(shape.y), z = number(shape.z);
      const w = Math.max(.001, Math.abs(number(shape.w, 1))), h = Math.max(.001, Math.abs(number(shape.h, 1))), d = Math.max(.001, Math.abs(number(shape.d, 1)));
      const center = [x + w / 2, y + h / 2, z + d / 2];
      const rings = 8, segments = 16, points = [], faces = [];
      for (let ring = 0; ring <= rings; ring += 1) {
        const latitude = -Math.PI / 2 + Math.PI * ring / rings;
        for (let segment = 0; segment < segments; segment += 1) {
          const longitude = Math.PI * 2 * segment / segments;
          points.push([center[0] + Math.cos(latitude) * Math.cos(longitude) * w / 2, center[1] + Math.sin(latitude) * h / 2, center[2] + Math.cos(latitude) * Math.sin(longitude) * d / 2]);
        }
      }
      for (let ring = 0; ring < rings; ring += 1) for (let segment = 0; segment < segments; segment += 1) {
        const next = (segment + 1) % segments, a = ring * segments + segment, b = ring * segments + next, c = (ring + 1) * segments + segment, e = (ring + 1) * segments + next;
        faces.push([a,c,b],[b,c,e]);
      }
      addMesh(points.map((point) => rotatePoint(point, center, shape)), faces, shape.color, transform);
    };
    const beam = (shape, transform = null) => {
      const start = [number(shape.x), number(shape.y), number(shape.z)];
      const end = [number(shape.x2, start[0] + number(shape.w, 1)), number(shape.y2, start[1]), number(shape.z2, start[2])];
      const thickness = Math.max(.02, number(shape.thickness, Math.max(number(shape.h, .2), number(shape.d, .2))));
      const min = start.map((value, index) => Math.min(value, end[index]) - thickness / 2);
      const max = start.map((value, index) => Math.max(value, end[index]) + thickness / 2);
      box({ x:min[0],y:min[1],z:min[2],w:max[0]-min[0],h:max[1]-min[1],d:max[2]-min[2],color:shape.color }, transform);
    };
    const component = (part, transform = null) => {
      if (!part || part.visible === false) return;
      if (part.type === "group") { (part.children || []).forEach((child) => component(child, transform)); return; }
      if (part.type === "cylinder" || part.type === "wheel") cylinder(part, transform, false);
      else if (part.type === "cone") cylinder(part, transform, true);
      else if (part.type === "sphere") sphere(part, transform);
      else if (part.type === "beam") beam(part, transform);
      else if (part.type === "rollerBed") {
        const count = clamp(Math.round(number(part.count, 12)), 2, 80);
        for (let index = 0; index < count; index += 1) {
          const width = Math.max(.04, number(part.w, 1) / count * .55);
          box({ x:number(part.x) + index * number(part.w, 1) / count, y:number(part.y), z:number(part.z), w:width, h:Math.max(.04, number(part.thickness, .18)), d:number(part.d, 1), color:part.color }, transform);
        }
      } else box(part, transform);
    };
    return { vertices, triangles, colors, box, component };
  }

  function normalizeForPrinting(mesh, scaleDenominator) {
    if (!mesh.vertices.length) return;
    const minX = Math.min(...mesh.vertices.map((point) => point[0]));
    const maxX = Math.max(...mesh.vertices.map((point) => point[0]));
    const minY = Math.min(...mesh.vertices.map((point) => point[1]));
    const minZ = Math.min(...mesh.vertices.map((point) => point[2]));
    const maxZ = Math.max(...mesh.vertices.map((point) => point[2]));
    const factor = 304.8 / Math.max(1, number(scaleDenominator, 100));
    mesh.vertices.forEach((point) => {
      point[0] = (point[0] - (minX + maxX) / 2) * factor;
      point[1] = (point[1] - minY) * factor;
      point[2] = (point[2] - (minZ + maxZ) / 2) * factor;
    });
  }

  function modelXml(mesh, name) {
    const bases = mesh.colors.map((fill, index) => `<base name="Color ${index + 1}" displaycolor="${fill}"/>`).join("");
    const vertices = mesh.vertices.map(([x,y,z]) => `<vertex x="${x.toFixed(5)}" y="${y.toFixed(5)}" z="${z.toFixed(5)}"/>`).join("");
    const triangles = mesh.triangles.map(([a,b,c,property]) => `<triangle v1="${a}" v2="${b}" v3="${c}" pid="1" p1="${property}" p2="${property}" p3="${property}"/>`).join("");
    return `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="${CORE_NS}"><metadata name="Title">${xml(name)}</metadata><metadata name="Designer">Monroe Glass Plant Model Studio</metadata><resources><basematerials id="1">${bases}</basematerials><object id="2" type="model" name="${xml(name)}" pid="1" pindex="0"><mesh><vertices>${vertices}</vertices><triangles>${triangles}</triangles></mesh></object></resources><build><item objectid="2"/></build></model>`;
  }

  const crcTable = (() => { const table = new Uint32Array(256); for (let n=0;n<256;n+=1){let c=n;for(let k=0;k<8;k+=1)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;} return table; })();
  function crc32(bytes) { let crc=0xffffffff; for (const byte of bytes) crc=crcTable[(crc^byte)&255]^(crc>>>8); return (crc^0xffffffff)>>>0; }
  function u16(value) { return [value&255,(value>>>8)&255]; }
  function u32(value) { return [value&255,(value>>>8)&255,(value>>>16)&255,(value>>>24)&255]; }
  function zip(files) {
    const locals=[], centrals=[]; let offset=0;
    Object.entries(files).forEach(([filename, contents]) => {
      const name=encoder.encode(filename), data=encoder.encode(contents), crc=crc32(data), flags=0x800;
      const local=new Uint8Array([80,75,3,4,...u16(20),...u16(flags),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name,...data]);
      locals.push(local);
      const central=new Uint8Array([80,75,1,2,...u16(20),...u16(20),...u16(flags),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]);
      centrals.push(central); offset+=local.length;
    });
    const centralSize=centrals.reduce((sum,item)=>sum+item.length,0);
    const end=new Uint8Array([80,75,5,6,...u16(0),...u16(0),...u16(centrals.length),...u16(centrals.length),...u32(centralSize),...u32(offset),...u16(0)]);
    return new Blob([...locals,...centrals,end], { type:"model/3mf" });
  }
  function package3mf(mesh, name) {
    if (!mesh.vertices.length || !mesh.triangles.length) throw new Error("There is no printable geometry in this model.");
    return zip({
      "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`,
      "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`,
      "3D/3dmodel.model": modelXml(mesh, name),
    });
  }
  function createDesign({ design, scaleDenominator = 12, name = design?.name || "Machine" } = {}) {
    const mesh=meshBuilder(); (design?.components || []).forEach((part)=>mesh.component(part)); normalizeForPrinting(mesh, scaleDenominator); return package3mf(mesh,name);
  }
  function createLayout({ entries = [], solids = [], scaleDenominator = 100, name = "Monroe Glass Plant" } = {}) {
    const mesh=meshBuilder(); solids.forEach((shape)=>mesh.box(shape)); entries.forEach(({design,transform})=>(design?.components||[]).forEach((part)=>mesh.component(part,transform))); normalizeForPrinting(mesh,scaleDenominator); return package3mf(mesh,name);
  }
  function download(blob, filename) { const url=URL.createObjectURL(blob), link=document.createElement("a"); link.href=url; link.download=filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
  window.PlantThreeMf = { createDesign, createLayout, download, safeName };
})();
