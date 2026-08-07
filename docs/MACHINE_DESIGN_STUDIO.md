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


The Machine Design Studio builds reusable visual machine models from editable primitives. Version 0.11.6 builds on the slicer-style editor and keeps the same basic workflow used by modern slicers: choose an object, choose a transform tool, manipulate it in the center viewport, and use the inspector for exact values.


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
- Machine-design payload: version 7
- Plant layout: `monroe-glass-plant-layout-v6`

Version 0.10.2 keeps the same storage keys while extending the design payload with optional animation metadata. Version 1 through 5 design payloads and legacy `rotation` values load automatically, with legacy rotation treated as Y-axis rotation. Existing assignments, machine positions, added objects, floor dimensions, timeline edits, walls, and hidden pillars remain available when the updated site is opened from the same browser and address.

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

The Plant Layout editor supports Shift-click, Ctrl-click, and Command-click selection of multiple scene objects. Shared size, rotation, stage visibility, collision, color, visibility, label, lock, and animation settings can be applied to the complete selection. Focus, nudge, Y rotation, and removal also operate on the selected group. Machine-design assignment, attached-crane details, and overlap separation remain single-object operations.


## Shared settings and stable merged motion in v0.10.2

Shift-click or Ctrl-click multiple parts to edit their shared color, opacity, visibility, and animation settings without merging them. Mixed values are marked in the inspector; changing a marked control applies the new value to every selected part.

Each merged child now has an explicit local-animation layer. Turn that layer off when the child should inherit only the attachment parent motion, or leave it on when the child should add its own animation in the parent’s moving coordinate space. Older merged items whose children exactly matched the parent are migrated to inherited-only once, preventing doubled distance, faster movement, and diagonal drift without removing the option to re-enable the child motion.

The viewport animation control now pauses the animation clock at the current frame and resumes from that exact point.


## Per-child merged animation in v0.10.3

A merged item is now an animation hierarchy rather than a flat animation bundle. The selected attachment parent carries the assembly. Every child inherits that parent transform and has a separate **Play this child’s own animation on top of parent motion** setting. Choose a child from **Child to animate** to edit its motion, axes, distances, speed, pause, and phase without separating the merged item.

## Four-step paths

Choose **Four-step path** to create a closed rectangular motion sequence using local axes:

1. Move along axis 1.
2. Move along axis 2.
3. Return along axis 1.
4. Return along axis 2.

For an up → forward → down → backward path, use axis 1 = Y and axis 2 = Z. Rotating the component or scene object rotates the complete path. Axis 1 pause is applied after the first and third legs. Axis 2 pause is applied after the second and fourth legs, allowing each direction pair to hold for a different amount of time.

## Independent axis-pair pause timers in v0.10.4

Version 0.10.4 introduced two pause values:

- **Pause axis 1** holds after the outbound and return movement on axis 1.
- **Pause axis 2** holds after the outbound and return movement on axis 2.

This applies to scene objects, regular machine components, and individually selected children inside merged assemblies. Existing designs without the new field automatically reuse the axis 1 pause so their timing does not change after upgrading.


## Four-corner waits and projected shadows in v0.10.5

Four-step animations now expose a separate wait after each leg: axis 1 outbound, axis 2 outbound, axis 1 return, and axis 2 return. This permits asymmetric cycles such as up, wait five seconds, forward, wait five seconds, down immediately, and backward immediately. Existing v0.10.4 animations migrate without changing their timing.

Every visible design component now casts a soft projected ground shadow. The plant viewer applies the same depth-tested shadow treatment to machines, cranes, carts, people, animated objects, and structural pillars.


## Proportion-safe plant assignment in v0.10.6

Machine Design Studio and the Plant Layout now share explicit sizing rules. **Preserve proportions** uses one uniform machine-level scale after each part's local geometry and rotation have been evaluated. **Match design dimensions** copies the design envelope to the plant object and keeps it synchronized during live-linked edits. **Stretch to plant object** remains available for intentional non-uniform scaling.

Use **Match plant dimensions to this design** when the plant object's collision footprint and editable dimensions should exactly follow the studio envelope.


## Unified transforms and Plant Layout synchronization in v0.11.0

The Object inspector now separates exact position, rotation, final dimensions, and scale percentages. Percentage values can be uniform or independent on X, Y, and Z. Beam length and cross-section dimensions remain local to the beam.

The **Use in plant layout** panel includes a **Plant instance transform** section. It edits the selected plant object’s X/Y/Z position, X/Y/Z rotation, width, depth, height, and scale percentages without changing the reusable design for other machines. Open Plant Layout tabs update through browser storage and `BroadcastChannel` messages.

Safety lines, trenches, and floor drains are available as reusable designs. Open the floor feature from Plant Layout to create a linked custom copy, then edit its parts just like a machine.

The viewport now supports a lower camera angle and zoom up to 10×.


## Performance controls in v0.11.1

The viewport command bar now includes **Performance**. The same rendering preference is shared with the Plant Layout.

- **Auto** dynamically adjusts its pixel-ratio cap after sustained frame-time changes.
- **Balanced** is useful for normal editing with reduced shadows.
- **Quality** preserves more curved-surface segments and shadow detail.
- **Performance** is intended for very large or animation-heavy machines.
- Shadow quality can follow the mode or be forced to Full, Reduced, or Off.
- **Show FPS** displays the current rendered frame rate.

The WebGL path now sends one quad per closed face instead of retaining the old subdivided painter-order geometry. Curved primitives retain a mode-dependent segment budget, and very large design grids use adaptive spacing. These changes affect preview detail and render frequency only; saved component geometry, dimensions, transforms, animations, and assignments are unchanged.

## Plant instance scaling in v0.11.2

Plant Layout objects now save an explicit scaling mode. **Uniform** keeps all three axes proportional, while **Individual axes** allows different X/Y/Z percentages. The Plant Layout renders linked custom designs using that selected mode, and Machine Design Studio preserves the mode when it reads or writes the linked plant instance.


## Tight machine envelopes

Version 0.12.1 allows machine envelopes down to 0.01 ft on each axis. In the Design inspector, the Width, Depth, and Height fields now accept hundredth-foot values. Use **Tight fit to parts** with zero edge clearance to move the model to the envelope origin and crop the envelope to the exact axis-aligned geometry bounds. Optional clearance is entered in inches. The fit can include every part or only currently visible parts.

Enable **Show envelope outline in the viewport** while adjusting the model. The status line compares the current envelope with the tight part bounds and warns when geometry extends outside the envelope. Compact envelopes remain intact when the design is assigned to or reloaded in the Plant Layout.

## Docked part animation timeline

Version 0.12.3 moves the clip timeline out of the narrow right inspector and into a docked workspace across the bottom of the 3D view. Click **Animation** below **Pan** in the upper-left tool rail, or press `A`, to open it. Every animation type remains visible in the timeline palette.

Click an animation type to add it at the playhead or drag it onto an exact time. Drag a clip body to move it before or after other clips. Drag either edge to change the clip start, end, and duration. Clips snap to the selected time step and to nearby clip edges. Clicking a clip switches the right inspector to the Animation section and loads the complete settings for that clip.

For merged items, the target selector in the timeline header can edit the whole assembly or an individual child. Child timelines remain local to the moving assembly. Full clip-type and setting documentation is in `docs/ANIMATION_TIMELINE.md`.

## Panel tabs

The Designer's left panel is divided into Library, Parts, Add, and Plant tabs. The selected-part inspector is divided into Properties, Transform, and Animation tabs. This keeps creation, exact geometry, plant assignment, and animation controls separate while preserving the existing design and layout storage keys. See `docs/EDITOR_PANELS.md`.


## Version 0.12.4 timeline precision

The animation workspace now starts with a 30-second ruler and expands automatically when a clip ends later. Clicking an animation type appends a preset-duration clip after the current sequence, while dragging a type places it at an exact time. Sequential clips share a left-to-right lane; overlapping clips use additional lanes. Select a clip before using its larger orange edge handles so resizing affects only that clip. Separate Play, Pause, and Restart controls are available in the timeline header.


## Version 0.12.16 Plant Overview animation parity

Plant Overview now mirrors the Designer's complete animation transform sequence for ordinary parts, nested merged items, and embedded machines. Rotated geometry bounds are shape-accurate, beam rotations are represented once through the beam rotation fields, nested motion-driver scaling preserves each nested group's own center, and combined Rotate/Move/Scale clips use the same axis ordering and pivots as Machine Design Studio.

Visible custom geometry also follows the same transform order. Boxes rotate in design space before the machine's Plant Layout transform, wheels rotate before non-uniform placement scaling, and roller beds use the full X/Y/Z machine rotation. This closes several remaining cases where the timeline values were correct but the Plant Overview 3D result looked different from the Designer.

## Version 0.12.15 embedded scale and Plant Layout parity

Adding a saved machine now preserves its source design-unit dimensions without resizing the destination design envelope. This prevents Plant Layout instances using Preserve or Stretch sizing from rescaling the entire destination machine when a larger embedded snapshot is inserted. If the combined machine should intentionally receive a larger reusable envelope, use **Tight fit** after positioning the embedded machine.

Plant Layout also uses rotated component bounds and the same component-center conventions as Machine Design Studio when applying animation transforms. This is especially important for nested embedded machines, wheel-centered geometry, pivot rotations, pulses/scales, and inherited merged-item motion.

## Version 0.12.14 embedded machine components

Use **Add → Add saved machine** to place another saved machine design inside the machine currently being edited. The picker lists custom machines first and excludes the current design. The source machine is copied as an embedded-machine group so it behaves like one transformable assembly while retaining its internal part hierarchy.

The inserted machine receives fresh component IDs recursively, including nested merged items, and fresh timeline clip IDs. Its geometry is centered in the destination design and bottom-aligned to the design floor. Version 0.12.15 later changed insertion so the destination envelope is left unchanged automatically, preserving design-unit scale in Plant Layout.

Embedded machines differ from ordinary merged items during animation playback. Ordinary merged items may inherit motion from an attachment driver. An embedded machine instead evaluates each child and nested child independently on the destination design's shared machine clock. This preserves the source machine's internal fan, door, screen, carriage, or other animations. A timeline authored on the embedded-machine wrapper is then applied to the complete assembly, allowing the entire inserted machine to move, rotate, fade, or otherwise animate as one object.

The source is inserted as a snapshot rather than a live reference, preventing recursive design dependencies and ensuring exported designs remain self-contained. The snapshot records its source design ID, name, and source update timestamp. Machine-design payload version 17 persists that metadata.

## Version 0.12.13 animation reliability audit

Blink opacity and cycle-based visibility toggling now use discrete cycle phase instead of eased motion progress. This fixes Blink with its default Step easing and makes Toggle each cycle alternate reliably. Blink can also use a minimum opacity of zero. No machine-design schema change is required, so payload version 16 remains current.

## Version 0.12.12 synchronized part timelines

All component timelines now share one machine-level playhead, loop span, and playback speed. Clips remain stored on their individual parts and nested groups, but their start values are interpreted as absolute machine times. The shared span is the larger of 30 seconds or the latest clip endpoint anywhere in the design, rounded to the next five-second ruler increment.

Clicking a top-level merged item in the Parts panel resolves the same nested animation owner used by viewport hit-testing. This prevents the timeline inspector from showing an empty outer target when the assembly is actually driven by a nested merged item or child part.

Extending the right edge of a clip performs a ripple edit on that target timeline. Clips beginning at or after the original edge move right by the same extension amount. Clips that were already overlapping remain fixed, and clip-body dragging still permits deliberate overlap and simultaneous playback.

## Version 0.12.11 nested animation target recognition

Clicking visible geometry inside a merged item now records the full nested path instead of identifying only the outermost group. The outer merged item remains the transform selection, so move, rotate, scale, and separate operations still affect the expected assembly. The Animation timeline independently resolves the deepest clicked component that owns a timeline.

If the clicked child has no local timeline, the Designer follows the merged item's configured motion-driver chain. This makes the timeline display the animation that actually drives the assembly even when the user clicks a different static child. The target selector lists nested groups and parts recursively, and another click inside an already selected outer group can change the timeline target without deselecting the group.

## Version 0.12.10 animation ownership and rotation flipping

After creating a merged item, the Animation timeline now targets the new outer merged item automatically. This prevents a nested merged child that happened to be selected before the merge from receiving the outer assembly's new clips. Child timelines remain available through the target selector, but only after the user chooses them explicitly.

For Rotate clips, use **Flip rotation animation** to reverse the current signed angle. The button preserves the existing axis, duration, easing, pivot offsets, and hold-final-value setting. It does not add a new animation mode or saved-data property.

## Version 0.12.8 pivot-based Rotate clips

The timeline **Rotate** clip now turns a part to a specific angle instead of spinning continuously. Set the axis, final angle, duration, easing, and whether the final orientation should be held. The inspector hides cycle-only settings because Rotate no longer repeats automatically.

Use **Pivot offset X**, **Pivot offset Y**, and **Pivot offset Z** to place the rotation point relative to the part center in local feet. Zero on all axes rotates around the center. Non-zero offsets create hinge, door, arm, lever, or orbital motion. The pivot behavior is shared by the Designer preview, linked Plant Layout machines, and merged items whose attachment parent drives the assembly.

## Version 0.12.7 split direction and fades

The **Split into rectangles** inspector now includes a local spread-axis selector and minimum/maximum column controls. The seed chooses a stable column count inside that inclusive range, then keeps the fragment directions and rotations repeatable in both Machine Design Studio and Plant Layout. Select X, Y, or Z for a directional split, or All axes for the original explosion-style spread.

The animation library also includes **Fade in** and **Fade out**. Their opacity follows the clip duration and easing curve, and **Hold final value** keeps the part at its final visible or invisible state. A fade-out followed later by a fade-in creates a clean hide-and-return sequence.

## Version 0.12.6 rectangular split animation

The Animation inspector now includes **Split into rectangles**. It divides the selected part or merged item into an even grid and sends each rectangle in a deterministic random direction. Configure columns, rows, depth layers, spread distance, rotation scatter, and seed. Reusing the same seed preserves the same fragment pattern in the Designer and Plant Layout.

## Version 0.12.5 timeline workspace repair

Timeline span is automatic and begins at 30 seconds. Saved oversized span metadata is reset during normalization, while real clips and their start/duration values are retained. The animation-type library now appears in the right Animation inspector, and the enlarged bottom workspace is reserved for clip arrangement, resizing, scrubbing, and playback. Clip deletion now updates the part's live saved timeline and is also available through Delete or Backspace while the timeline is open.
