# Machine Design Studio

The Machine Design Studio builds reusable visual machine models from editable primitives. Version 0.7.0 builds on the slicer-style editor and keeps the same basic workflow used by modern slicers: choose an object, choose a transform tool, manipulate it in the center viewport, and use the inspector for exact values.

## Workspace layout

### Left browser

The left side has two tabs:

- **Designs** — select, search, create, duplicate, reset, import, export, delete, and assign reusable machine designs.
- **Parts** — search the active design's component tree, select parts, show or hide parts, add primitives, and change component order.

### Center viewport

The viewport is the main editing area. Components can be selected directly by clicking them.

The tool rail provides:

- **Select (`V`)** — select parts without transforming them.
- **Move (`M`)** — drag the center handle across the floor or drag the X, Y, or Z axis.
- **Rotate (`R`)** — drag the red X, green Y, or blue Z ring to rotate around that axis.
- **Scale (`S`)** — drag the orange center for uniform scaling or a colored square handle to resize only one local axis.
- **Pan (`H`)** — drag to move the camera.

Camera controls:

- Right-drag or Alt-drag: orbit
- Middle-drag or Shift-drag: pan
- Mouse wheel: zoom
- Double-click a component: select and focus it
- Double-click empty space: fit the design
- `0`: isometric view
- `1`: front view
- `2`: right view
- `3`: top view
- `F`: fit design

The horizontal orbit direction is natural: dragging the pointer to the right rotates the model toward the right.

### Right inspector

The **Object** tab edits the selected component:

- Name, type, material color, opacity, and visibility
- Position X/Y/Z
- Exact X/Y/Z rotation and quick ±90-degree actions for a selected axis
- Width, height, depth, thickness, roller count, or wheel size as appropriate
- Beam endpoint X/Y/Z
- Uniform center scaling or local X/Y/Z axis scaling
- Center component on the design base

The **Design** tab edits the reusable design:

- Design name
- Machine type
- Base width, depth, and height
- Description
- Fit the design envelope around all visible and hidden parts

## Snapping and precise movement

Enable **Snap** in the viewport toolbar and choose a step of 0.1, 0.25, 0.5, 1.0, or 2.0 feet.

Arrow keys nudge the selected component on the X/Z plane. Shift+Up and Shift+Down nudge the component vertically. Numeric inspector fields remain the best choice for surveyed dimensions.

## Component primitives

### Box

For cabinets, bases, hoods, control panels, tanks, and machine enclosures.

### Glass panel

A translucent box intended for glass lites, windows, and guards.

### Beam

A closed rectangular structural member with start and end XYZ coordinates. Use it for rails, posts, braces, handles, and pipes. The viewport now depth-sorts its faces like every other solid part.

### Roller bed

A rotatable repeated-roller component with configurable width, depth, count, and thickness. Each roller is rendered as closed geometry and participates in global depth ordering.

### Wheel

A closed multi-sided wheel detail for casters and truck wheels. It can be rotated on all three axes.

## Recommended modeling workflow

1. Duplicate the closest supplied preset instead of starting from nothing.
2. Open **Parts** and hide pieces that block the area being edited.
3. Select the major cabinet and use Move/Scale to establish the overall silhouette.
4. Use numeric inspector fields for exact measurements.
5. Add repeated components such as motors, posts, wheels, and rollers.
6. Use front, right, and top views to verify alignment.
7. Use **Fit envelope around parts** after the model is complete.
8. Export the design JSON before major redesigns.
9. Apply the design to one plant object or every object of the same type.

## Rendering and selection

The viewport renders individual primitive faces in one stable camera-depth list. This is more reliable than sorting entire components by their center and prevents many cases where intersecting or nested parts appeared to phase, flicker, or temporarily disappear.

Transform controls are a separate overlay. Gizmo hit testing runs before model picking, so a handle can still be used when it is inside a cabinet or overlaps another part. Clicking normal model geometry selects the frontmost visible rendered face.

## Storage and compatibility

- Machine designs: `monroe-glass-machine-designs-v1`
- Machine-design payload: version 3
- Plant layout: `monroe-glass-plant-layout-v6`

Version 0.7.0 intentionally keeps the same storage keys. Version 1 and 2 design payloads and legacy `rotation` values load automatically, with legacy rotation treated as Y-axis rotation. Existing assignments, machine positions, added objects, floor dimensions, timeline edits, walls, and hidden pillars remain available when the updated site is opened from the same browser and address.

## Scope

The editor is intended for recognizable block models and plant-layout communication. It does not provide mesh booleans, curved STEP surfaces, imported engineering assemblies, manufacturing tolerances, rigging calculations, or certified machine clearances.


## Rendering and round components (v0.7.0)

- Large box and beam faces are subdivided before depth sorting so a single large face cannot incorrectly cover smaller parts.
- Hidden faces on opaque convex parts are removed from the draw pass.
- Roller beds render as closed cylindrical rollers with circular end caps.
- Wheels use independent width, height, and axle-depth dimensions and can be scaled on one local axis at a time.
- Legacy wheel `size` values migrate automatically to the new three-dimension format.
