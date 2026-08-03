# Machine Design Studio

## Hierarchical motion in v0.10.1

The editor keeps the same three-area slicer workflow and now supports true parent/child animation inside merged items. Secondary actions remain condensed into collapsible sections. The left panel focuses on designs and parts, the center viewport contains camera and transform controls, and the right inspector contains exact part or machine settings.

Transforms default to **Local** mode. Local mode follows the selected part's current orientation; World mode follows the fixed design grid. This applies to move, rotate, and scale handles.

### Shape library

- Box / cabinet
- Cylinder / tank / post
- Sphere / ellipsoid / indicator
- Cone / hopper
- Wedge / ramp / sloped guard
- Glass panel
- Rectangular beam
- Circular roller bed
- Wheel / caster
- Merged groups

Each primitive supports independent X/Y/Z movement, rotation, and scaling. Beam scaling uses local X for length, local Y for height, and local Z for width.


## Merged items and hierarchical motion

Shift-click, Ctrl-click, or Command-click parts in the viewport or object tree to create an arbitrary part selection. Choose **Merge selected** to turn those parts into one compound item. The active part becomes the initial **Attachment parent**. Its animation carries the complete merged assembly. Every other child retains its own animation after inheriting the parent movement. Choose **Separate merged** to restore the parts.

For example, make a bridge part move on Z and a trolley part move on X. Select the trolley first and the bridge last, then merge. The bridge becomes the attachment parent: it moves the complete assembly on Z while the trolley also travels on X relative to the moving bridge. Change the parent at any time from **Part → Animation → Attachment parent**.

In Plant Layout, multi-select scene objects, choose a **Motion parent**, and select **Attach to parent**. Children inherit the parent’s motion but do not drive the parent. Nested attachments are supported for multi-stage mechanisms.


The Machine Design Studio builds reusable visual machine models from editable primitives. Version 0.10.1 builds on the slicer-style editor and keeps the same basic workflow used by modern slicers: choose an object, choose a transform tool, manipulate it in the center viewport, and use the inspector for exact values.


## Depth-correct viewport

Version 0.8.0 replaces painter-style face ordering with a WebGL depth buffer. The viewport now decides visibility per pixel rather than by an average depth for an entire face. This is especially important when a large base crosses the depth range of rollers, rails, cabinets, wheels, or controls.

The renderer now provides:

- Correct opaque occlusion between all component types.
- Closed boxes, beams, wheels, and cylindrical rollers from every camera angle.
- No camera-facing face removal, preventing sides from disappearing while orbiting.
- Depth-tested component edges and structural lines.
- Separate transparent rendering for glass panels.
- A transparent 2D overlay for gizmos, selection boxes, and other editor controls.

Component order in the Parts list remains an organizational tool; it no longer determines which solid object appears in front.

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

A closed multi-sided wheel detail for casters and truck wheels. It can be rotated on all three axes and scaled independently by width, height, and axle depth. When a design is shown in the Plant Layout, wheel faces use the same WebGL depth buffer as the rest of the machine, so a wheel below or behind a cabinet is correctly hidden instead of painting through the body.

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
- Machine-design payload: version 6
- Plant layout: `monroe-glass-plant-layout-v6`

Version 0.10.1 keeps the same storage keys while extending the design payload with optional animation metadata. Version 1 through 5 design payloads and legacy `rotation` values load automatically, with legacy rotation treated as Y-axis rotation. Existing assignments, machine positions, added objects, floor dimensions, timeline edits, walls, and hidden pillars remain available when the updated site is opened from the same browser and address.

## Scope

The editor is intended for recognizable block models and plant-layout communication. It does not provide mesh booleans, curved STEP surfaces, imported engineering assemblies, manufacturing tolerances, rigging calculations, or certified machine clearances.


## Rendering and round components (v0.7.0)

- Large box and beam faces are subdivided before depth sorting so a single large face cannot incorrectly cover smaller parts.
- Hidden faces on opaque convex parts are removed from the draw pass.
- Roller beds render as closed cylindrical rollers with circular end caps.
- Wheels use independent width, height, and axle-depth dimensions and can be scaled on one local axis at a time.
- Legacy wheel `size` values migrate automatically to the new three-dimension format.


## Part animations

Select a component and use **Part animation** in the Object inspector. Supported motions are back-and-forth, continuous loop, X/Y/Z rotation, vertical bob, axis-specific pulse, and blink. **Amount** controls travel distance, rotation per cycle, or pulse percentage; **Speed** is cycles per second; **Pause after cycle** holds the motion before it resumes; **Phase** offsets related parts. Back-and-forth motion pauses at both endpoints. Other modes pause after each completed cycle. The preview button in the viewport command bar pauses the design at its base pose for editing.

The built-in library now includes editable presets for cranes, A-frame carts and trucks, raw-glass racks, rooms, team members, the Barefoot cutting line, and filtration equipment in addition to the production machines.


## Selecting the entire machine

Open the **Parts** tab and choose **Select entire machine**, or press `Ctrl+A` while the viewport is active. The combined transform gizmo is placed at the center of all parts. Move, Rotate, and Scale then affect every component together. Axis scale changes only the selected world axis; the center scale handle changes all axes uniformly. Clicking an individual component returns to single-part editing.

## All-axis animation rotation

For a part animation set Motion to **Continuous rotation** and choose X, Y, Z, or All. All now rotates all three axes together. Scene animation objects in the Plant Layout also support X/Y/Z base orientation and all-axis spin.
## Scene paths and floor features

The Plant Layout editor, rather than Machine Design Studio, controls whole-object travel paths and floor-layout objects. Translation animations use the scene object's local X, Y, or Z axis, so the object's X/Y/Z rotation also rotates the direction of travel. Safety lines, trenches, and square drains are edited as normal scene objects from **Edit layout → Objects**.


## Plant Layout multi-selection

The Plant Layout editor supports Shift-click, Ctrl-click, and Command-click selection of multiple scene objects. The collective color control updates the complete selection. Focus, nudge, Y rotation, and removal also operate on the selected group. Object-specific design, crane, collision-separation, and animation controls remain single-object operations and are disabled until the selection is reduced to one object.
