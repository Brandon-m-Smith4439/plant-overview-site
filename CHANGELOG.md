# Changelog

## Unreleased - 2026-09-21

### Added

- Added a generated, versioned public workspace snapshot containing the approved 42-machine design library and 98-object plant layout.
- Added a repeatable workspace publishing command and regression validation for snapshot contents and browser-storage transfer.

### Fixed

- The hosted read-only viewer now loads the published workspace before initializing the plant, so local machine designs, placements, envelopes, animations, labels, structure settings, and timeline edits appear on the live domain.
- Localhost remains the editable source of truth and is never overwritten by the published snapshot.

### Validation

- Re-ran JavaScript syntax, machine creation, layout insertion, public viewer, layout rendering, lint, and optimized production build checks.

## 0.13.0 - 2026-08-25

### Added

- Added explicit **Save**, **Save as**, and **Save & add to layout** commands to Machine Design Studio.
- Added a reusable-machine Save As dialog and a direct handoff that opens the newly added object in Plant Layout edit mode, selected and ready to position.
- Added a visible Build, Save, Place workflow and made new custom machines start with a blank design ready for shapes.

### Improved

- Consolidated duplicate part and camera commands, including removal of the redundant orientation cube.
- Applied consistent spacing, control sizing, focus states, panels, color tokens, and responsive behavior across the Plant Layout and Machine Design Studio.
- Reduced rendering work from off-screen animations and idle first-person sessions; Auto mode now also scales curved-geometry and shadow budgets when sustained frame times are high.
- Made first-person visibility culling conservative for nearby objects and use all box corners for distant screen checks.

### Fixed

- Corrected inverted Designer orbit, pan, and wheel zoom directions.
- Fixed newly created reusable machines not having an obvious saved state or reliable transition into the Plant Layout positioning workflow.
- Fixed machines disappearing near the sides of the first-person view.

### Validation

- Ran JavaScript syntax checks, machine-creation, Plant Layout insertion, adaptive-performance, and first-person regression tests.

## 0.12.17 - 2026-08-07

### Fixed

- Prevented the browser's native middle-mouse autoscroll gesture from activating while middle-button dragging the Plant Overview 3D canvas outside fullscreen mode.
- Applied the same middle-button suppression to Machine Design Studio so scene panning behaves consistently between both 3D viewports.
- Kept the existing middle-button pan controls unchanged; only the browser/page default action is cancelled.

### Validation

- Added regression assertions for middle-button `mousedown` and `auxclick` suppression in both 3D canvases.
- Re-ran JavaScript syntax validation and the complete project regression suite.

## 0.12.16 - 2026-08-07

### Fixed

- Matched Plant Overview animation bounds to Machine Design Studio for boxes, cylinders, cones, spheres, wedges, wheels, roller beds, beams, and nested merged groups instead of approximating several rotated shapes as boxes.
- Fixed beam Rotate clips being applied twice in Plant Overview. Beam endpoints now remain the authored local axis while rotation fields carry the animated orientation, matching the Designer.
- Fixed combined Rotate + Move + non-uniform Scale clips drifting on nested groups by applying scale axes in the same order and around the same recalculated centers as the Designer.
- Fixed inherited motion-driver scaling for nested merged groups by scaling each nested group around its own center before moving that group relative to the external driver pivot.
- Fixed custom-design box rendering so component rotation and machine rotation compose as sequential 3D transforms instead of adding Euler angles.
- Fixed custom-design wheel rendering so wheel rotation occurs in source-design coordinates before Plant Layout placement scaling, preventing skewed axes and pivots on non-uniformly scaled machines.
- Fixed roller-bed rendering to use the machine's full X/Y/Z 3D transform rather than the older Y-only helper.
- Aligned legacy Pulse scaling with the same shape-aware scaling path used by timeline clips, including beams, wheels, roller beds, and nested groups.

### Changed

- Kept machine-design payload version 17 because the corrections change runtime transform and rendering math only; no saved fields were added.

### Validation

- Expanded Plant Overview parity coverage to compare complete Designer and Plant transforms for combined pivot rotation, translation, non-uniform scale, opacity, visibility, and nested motion-driver inheritance.
- Added parity checks for exact rotated bounds across every editable geometry family and for the corrected wheel design-space transform path.
- Re-ran JavaScript syntax validation and all 28 project regression files.

## 0.12.15 - 2026-08-07

### Fixed

- Kept embedded machines at the exact source-design scale when inserted into another machine by no longer changing the destination design envelope automatically.
- Prevented Plant Layout instances in Preserve/Stretch sizing modes from shrinking or stretching existing geometry merely because a larger saved machine was embedded.
- Aligned Plant Layout animation centers and bounds with Machine Design Studio for rotated parts and nested groups.
- Fixed wheel animation transforms in Plant Layout by consistently treating wheel `x`, `y`, and `z` as center coordinates instead of box-corner coordinates.
- Corrected grouped/nested rotation and scale transform pivots so embedded-machine animations match the designer more closely in Plant Layout.

### Changed

- Larger embedded machines may extend outside the current reusable design envelope after insertion. Use **Tight fit** when the envelope itself should intentionally grow around the combined machine.
- Kept machine-design payload version 17 because no saved-data fields were added or changed.

### Validation

- Added regression coverage that prevents embedded-machine insertion from mutating the destination envelope.
- Added Plant Layout animation-transform parity checks for rotated bounds, wheels, roller beds, beams, rotation pivots, and scale pivots.
- Re-ran JavaScript syntax validation and the complete project regression suite.

## 0.12.14 - 2026-08-07

### Added

- Added **Add saved machine** to the Machine Design Studio Add panel so another reusable machine design can be inserted into the current machine as one editable embedded assembly.
- Listed custom machine designs before presets and excluded the currently edited design to prevent direct self-embedding.
- Added embedded-machine source metadata so saved/exported designs retain which machine snapshot was inserted.

### Changed

- Embedded machine children keep their own independent animations on the destination machine's shared animation clock instead of inheriting one merged-item motion driver.
- Animations added to the embedded-machine wrapper transform the whole inserted assembly while its internal animations continue to run.
- Refreshed component and clip IDs recursively when inserting a machine so multiple copies can coexist safely and remain editable after separation.
- Centered inserted machines in the current design, aligned their lowest geometry to the design floor, and expanded the reusable design envelope only when the inserted machine requires additional space.
- Advanced the machine-design payload to version 17 for embedded-machine source metadata. The existing storage key remains unchanged.

### Validation

- Added regression coverage for the saved-machine picker, insertion workflow, recursive ID cloning, independent embedded-machine animation behavior, Plant Layout rendering, and payload version 17.
- Re-ran JavaScript syntax validation and the complete project regression suite.

## 0.12.13 - 2026-08-07

### Fixed

- Fixed **Blink opacity** appearing stuck in its visible state when using the default Step easing. Blink now samples raw cycle phase because blinking is a discrete state change rather than eased motion.
- Fixed **Show / hide → Toggle each cycle** using eased progress, which could prevent the visibility state from toggling with Step easing. Toggle now alternates by cycle index.
- Allowed Blink minimum opacity to reach exactly `0`, matching the timeline renderer's existing true-zero opacity support.

### Validation

- Expanded timeline regression coverage to exercise every supported animation family: move, back-and-forth, loop path, four-step path, rotate/pivot, bob, pulse, rectangular split, fade in, fade out, blink opacity, show/hide/toggle, and wait/hold.
- Added explicit Blink tests for visible, dim, repeated-cycle, Step-easing, and fully invisible states.
- Added explicit visibility tests for show, hide, and alternating toggle states.
- Re-ran JavaScript syntax validation and the complete project regression suite.

### Changed

- Kept machine-design payload version 16 because the fixes change runtime evaluation only and add no saved-data fields.

## 0.12.12 - 2026-08-06

### Added

- Added a machine-wide animation clock so every top-level part, nested merged item, and child timeline samples the same absolute playback time.
- Added shared machine Loop and Machine speed settings while keeping clips stored on their individual part timelines.
- Added ripple resizing to the right edge of timeline clips. Extending a clip pushes every later non-overlapping clip to the right by the same amount.

### Fixed

- Fixed parts appearing to begin at different times because each part previously applied its own timeline loop span and playback-rate setting.
- Fixed Parts-panel selection opening an empty outer merged-item timeline instead of resolving the nested animation owner or configured motion driver.
- Kept intentionally overlapping clips in place during ripple resizing, so body-dragging a clip into another lane still creates simultaneous playback.
- Prevented repeated pointer-move events from accumulating downstream clip offsets while a ripple resize is in progress.

### Changed

- The timeline ruler, playhead, automatic span, loop state, and playback speed now represent the entire machine design instead of only the currently selected part.
- Advanced the machine-design payload to version 16 to persist shared `animationTimelineSettings` on each design.

### Validation

- Added shared-clock, Parts-panel target-resolution, and ripple-resize regression coverage.
- Re-ran JavaScript syntax validation and all project regression test files.

## 0.12.11 - 2026-08-06

### Fixed

- Fixed intermittent timeline detection when clicking a merged item that contains other merged items.
- Preserved the complete nested component path on every rendered hit primitive instead of retaining only the outermost group.
- Made timeline target lookup recursive so animations can be found on deeply nested merged groups and parts.
- Resolved the configured merged-item motion-driver chain when the clicked visible child is not itself the animation owner.
- Allowed repeated clicks inside an already selected outer group to refresh the timeline target without changing transform ownership.

### Changed

- Expanded the timeline target selector to include every nested descendant with clear nested-item labels.
- Kept moving, rotating, scaling, merging, and separating attached to the top-level selected group while timeline editing points to the resolved nested animation owner.
- Kept machine-design payload version 15 because this repair changes editor selection metadata only and adds no saved-data fields.

### Validation

- Added nested hit-path, recursive target lookup, same-selection retargeting, and motion-driver-owner regression coverage.
- Re-ran JavaScript syntax validation and all project regression test files.

## 0.12.10 - 2026-08-06

### Added

- Added a **Flip rotation animation** button to Rotate clips. The button reverses the existing signed angle while retaining the stable fixed-angle and pivot behavior introduced in version 0.12.8.
- Added a live direction label showing whether the selected Rotate clip currently uses forward or reverse rotation.

### Fixed

- Fixed nested merged-item animation ownership when a new outer merge is created.
- Reset the timeline target and selected clip to the new outer merged item so a previously selected inner group cannot silently receive clips intended for the whole assembly.
- Ensured an animation created for the outer merged item remains on that outer item and does not appear on the inner merged item after separation.

### Changed

- Restored the stable version 0.12.8 rotation and merged-selection behavior instead of retaining the version 0.12.9 rotation-direction implementation.
- Migrated any Rotate clips saved by version 0.12.9 back from its temporary direction field to the stable signed-angle format.
- Kept machine-design payload version 15 because the flip button uses the existing signed `amount` field and does not change saved-data structure.

### Validation

- Added regression coverage for signed-angle flipping and nested-merge timeline ownership.
- Re-ran JavaScript syntax validation and all project regression test files.

## 0.12.8 - 2026-08-06

### Added

- Added local X, Y, and Z pivot-offset controls to timeline **Rotate** clips.
- Added pivot-aware rotation operations to both Machine Design Studio and Plant Layout renderers, including merged motion-driver inheritance.

### Changed

- Changed timeline Rotate from an accumulating continuous spin into a one-time interpolation from 0 degrees to the requested final angle.
- Removed cycle, repeat, phase, pause-after-cycle, and yoyo controls from Rotate because the clip now uses its duration and easing directly.
- Migrated older saved timeline clips with the internal `spin` type to the new keyed Rotate behavior while preserving their axis and degree amount.
- Advanced the machine-design payload version to 15 while preserving the `monroe-glass-machine-designs-v1` storage key.

### Validation

- Added regression coverage for fixed-angle rotation, final-angle holding, legacy spin migration, pivot offsets, inspector fields, renderer integration, and payload version 15.
- Re-ran JavaScript syntax validation and all 27 project regression test files.

## 0.12.7 - 2026-08-05

### Added

- Added a spread-axis selector to **Split into rectangles** with local X, Y, Z, and all-axis options.
- Added minimum and maximum column controls so each split can choose a deterministic random column count inside a saved range.
- Added dedicated **Fade in** and **Fade out** timeline clips with easing, duration, and hold-final-value support.
- Added stateful fade sequencing so a completed fade-out can remain invisible until a later fade-in restores the part.

### Changed

- New rectangular split clips default to a seeded range of three through six columns while older fixed-column clips retain their exact saved count and original all-axis spread.
- Extended seeded split generation so the same seed preserves the chosen column count, fragment directions, and rotation scatter across reloads and both renderers.
- Updated Designer and Plant Layout opacity pipelines to preserve true zero opacity instead of treating zero as an unset value.
- Advanced the machine-design payload version to 14 while preserving the `monroe-glass-machine-designs-v1` storage key.

### Validation

- Added regression coverage for split-axis constraints, ranged column generation, deterministic layouts, fixed-column compatibility, fade interpolation, held zero opacity, fade-out/fade-in sequencing, inspector fields, and payload version 14.
- Re-ran the complete JavaScript syntax and project regression suites.

## 0.12.6 - 2026-08-05

### Added

- Added a **Split into rectangles** animation clip for Machine Design Studio timelines.
- Added even rectangular-grid controls for columns, rows, and depth layers.
- Added configurable fragment spread distance, rotation scatter, and a saved random seed.
- Added deterministic fragment generation so playback, reloads, and linked Plant Layout machines keep the same split pattern.
- Added rectangular-fragment rendering for individual parts, non-box shapes through their rectangular envelope, and merged assemblies.

### Changed

- Advanced the machine-design payload version to 13 while preserving the `monroe-glass-machine-designs-v1` storage key.
- Updated Machine Design Studio and Plant Layout animation rendering to carry the split effect through saved timeline evaluation.

### Validation

- Added regression coverage for the new animation type, default settings, progress, fragment count, deterministic seeded layout, inspector fields, payload version, and both render paths.
- Re-ran the complete JavaScript syntax and project regression suites.

## 0.12.5 - 2026-08-05

### Fixed

- Repaired saved timeline spans with runaway values such as `886370` seconds by deriving timeline length only from clip endpoints.
- Fixed animation deletion operating on a stale normalized timeline object instead of the part's saved timeline.
- Added an explicit missing-clip guard so delete can never remove the wrong final item through a negative array index.
- Added Delete and Backspace support for the selected clip while the animation workspace is active.

### Improved

- Increased the docked animation workspace height and clip-lane height for easier editing.
- Moved the animation-type palette from the bottom workspace into the right Animation inspector.
- Gave the timeline the full available viewport width after removing the palette column.
- Changed Timeline span to a read-only automatic value: 30 seconds minimum, expanding in five-second increments only when clips require it.
- Increased resize-handle hit areas and clip text size in the larger workspace.

### Validation

- Added regression coverage for runaway-span repair, automatic timeline duration, reliable selected-clip deletion, right-panel animation creation, and the enlarged full-width workspace.
- Re-ran the complete rendering, animation, timeline, scaling, synchronization, first-person, performance, structural, selection, label, and editor regression suites.

## 0.12.4 - 2026-08-05

### Added

- Added a non-zero preset duration and matching cycle settings for every animation type.
- Added a 30-second minimum timeline ruler with automatic extension in five-second increments when clips run longer.
- Added a fixed 44-pixel-per-second editing scale and horizontal scrolling for more precise movement and resizing.
- Added chronological lane packing so sequential clips read left to right while overlapping clips use separate lanes.
- Added separate **Play** and **Pause** controls alongside Restart.
- Added preset-duration labels to the animation palette.

### Improved

- Clicking an animation type now appends it after the latest clip instead of stacking every new clip at the current zero-second playhead.
- Resize handles now activate only on the selected clip and use larger dedicated hit areas.
- Timeline dragging tracks a single clip identifier and preserves every neighboring clip unchanged.
- Added pointer capture and edge auto-scroll during long timeline drags.
- Updated timeline summaries and help text to make left-to-right timing and clip endpoints explicit.
- Advanced the machine-design payload version to 12 while keeping the existing local-storage key and normalizing older payloads.

### Validation

- Added regression coverage for all animation presets, 30-second minimum duration, automatic extension, pixels-per-second drag sensitivity, lane packing, append order, isolated resizing, separate playback controls, and scrollable timeline markup.
- Re-ran the complete rendering, animation, scaling, synchronization, first-person, performance, structural, selection, label, and editor regression suites.

## 0.12.3 - 2026-08-05

### Added

- Added an **Animation** workspace button directly below Pan in the Machine Design Studio tool rail.
- Added a docked bottom timeline that reduces the 3D viewport height while open instead of hiding the machine behind an overlay.
- Added a visible palette containing every supported animation type.
- Added click-to-add at the playhead and drag-and-drop creation at an exact timeline time.
- Added draggable clips for changing start time and chronological order.
- Added left and right resize handles for changing clip start, end, and duration.
- Added configurable timeline snapping from 0.01 to 1.00 seconds and edge snapping to neighboring clips.
- Added a dedicated timeline-workspace helper module and regression suite.

### Changed

- Selecting a timeline clip now opens the right inspector's Animation section automatically.
- Moved timeline-wide controls, animation types, ruler, tracks, and playhead out of the narrow inspector and into the bottom workspace.
- Kept the right inspector focused on the selected clip's complete type-specific settings.
- Timeline duration now always expands far enough to contain every clip, even when an explicit duration was previously shorter.
- Added `A` to toggle the timeline and Escape to close it when open.

### Validation

- Added tests for time conversion, snapping, chronological sorting, clip movement, left-edge resizing, right-edge resizing, dock markup, script order, and integration hooks.
- Re-ran all existing animation, rendering, scaling, first-person, performance, structural, selection, and editor-panel regression suites.

## 0.12.2 - 2026-08-05

### Added

- Added a visual per-part animation timeline in Machine Design Studio.
- Added sequential and overlapping animation clips with an interactive ruler and scrubber.
- Added Move, Oscillate, Loop, Four-step, Spin, Bob, Pulse, Blink, Visibility, and Wait clip types.
- Added exact per-clip start, duration, active motion time, forward-end pause, return-end pause, cycle pause, repeat, easing, phase, yoyo, hold, axis, amount, opacity, and visibility controls.
- Added separate timelines for merged assemblies and their individual child parts.
- Added timeline playback support to linked custom machines in the Plant Layout.
- Added `public/animation-timeline.js`, `docs/ANIMATION_TIMELINE.md`, and `docs/EDITOR_PANELS.md`.

### Changed

- Reorganized the Machine Design Studio left panel into Library, Parts, Add, and Plant tabs.
- Reorganized the Designer right inspector into Properties, Transform, and Animation tabs for the selected part.
- Reorganized the Plant Layout editor into Objects, Structure, Stages, and Project tabs.
- Divided Plant Layout object editing into Select, Transform, Animation, and Add tabs.
- Advanced the machine-design payload version to 11 while preserving the existing browser-storage key.
- Automatically migrates older single-animation part settings into a timeline clip.

### Validation

- Added animation-engine regression tests for migration, interpolation, clip overlap, rotation, pulse, blink, visibility, and four-step paths.
- Added panel-organization and script-order regression tests for both application entry points.

## 0.12.1 - 2026-08-05

### Improved

- Reduced the minimum Machine Design Studio envelope dimension from 0.5 ft to 0.01 ft.
- Changed envelope inputs to hundredth-foot precision.
- Added a visible 3D envelope outline for checking the machine edges.
- Reworked **Fit envelope around parts** into **Tight fit to parts** with optional inch-based clearance.
- Added all-parts and visible-parts-only fit scopes.
- Added live envelope-versus-geometry measurements and an outside-envelope warning.
- Preserved compact custom envelope dimensions through Plant Layout creation, synchronization, editing, and reload.

### Validation

- Added compact-envelope regression coverage for the Designer UI, fit calculation, Plant Layout minimums, and versioned documentation.

## 0.12.0 - 2026-08-05

### Added

- Added a direct **Saved designer machine** workflow under **Plant Layout → Edit layout → Add to the 3D model**.
- Lists reusable custom machines saved in Machine Design Studio, including their design-envelope dimensions.
- Added optional plant-instance naming, timeline appearance stage, and placement controls.
- Added open-space, current-view, and plant-center placement choices.
- Newly inserted machines use their reusable design, match its dimensions, and remain live-linked to later Designer edits.
- Kept standard machines, objects, animations, and floor features available in a condensed secondary section.
- Added refresh and open-designer actions so the Plant Layout can pick up newly saved designs without reloading the page.

### Validation

- Added a dedicated Plant Layout designer-machine insertion regression test.
- Preserved layout schema 6 and the existing design-library storage key.

## 0.11.9 - 2026-08-05

### Fixed

- Restored all CAD-derived structural columns inside the original plant footprint instead of limiting the scene to the first 96 anchors.
- Added the 22 previously omitted eastern-structure pillars, including the column lines near X = 180, 182.54, and 226.54 ft.
- Kept hidden-column persistence compatible with existing saved layouts; new CAD columns default to visible.
- Included the restored pillars in rendering, selection, shadows, first-person collision, camera culling, removal, and restore-all behavior.
- Kept generated extension columns limited to floor area outside the original CAD bounds, preventing duplicates.

### Validation

- Updated structural-column regression coverage to verify all 118 CAD anchors are loaded and the easternmost column remains present.

## 0.11.8 - 2026-08-05

### Added

- Added a complete create-machine workflow inside Machine Design Studio.
- Added machine name, appearance stage, and automatic/center/origin placement controls.
- Added automatic open-space placement that avoids existing solid Plant Layout objects.
- New machines use the current reusable design, its envelope dimensions, and Match dimensions synchronization.
- Newly created machines are selected and live-linked immediately for continued editing.
- Open Plant Layout tabs now import newly created designer objects through the existing storage and BroadcastChannel synchronization path.
- Added `docs/CREATING_MACHINES.md` and a dedicated regression test.

## 0.11.7 - Automatic structural columns for floor extensions

### Added

- Continued the established CAD structural grid automatically whenever the floor width, length, or center creates new structure area outside the original drawing footprint.
- Added editable X and Z bay spacing controls in **Edit layout → Structure**. The supplied CAD pattern defaults to 40 ft in X and 30 ft in Z.
- Added an on/off control for generated extension columns and a live count separating original CAD columns from generated columns.
- Added stable generated-column identifiers so individually removed extension columns stay removed after saving, undo/redo, export/import, and page reloads.
- Included generated columns in first-person collision, depth ordering, shadows, editor selection, and visibility culling.

### Performance and compatibility

- Column generation is cached and rebuilt only when floor or grid settings change.
- Very large floors use an aligned integer grid stride as a safety limit instead of creating an unbounded number of column models.
- Existing CAD-column removal indices remain compatible under layout schema 6.
- Existing layouts automatically enable 40 × 30 ft extension spacing without moving or duplicating the original CAD columns.

### Validation

- Added `validate:columns` regression coverage for grid continuation, stable generated keys, persistence fields, editor controls, and large-floor safeguards.

## 0.11.6 - First-person orientation and perspective-depth correction

### Fixed

- Replaced linear camera-space depth interpolation in first-person mode with reciprocal perspective depth, preventing rear machine parts, wheels, walls, and other geometry from appearing through opaque surfaces.
- Corrected the orbit-to-first-person yaw conversion so entering first person faces the same side of the plant shown by the overview instead of appearing reversed.
- Preserved near-plane clipping while making clipped faces participate in the same perspective-correct depth ordering.
- Kept transparent glass behind opaque geometry while retaining deliberate glass transparency.

### Validation

- Added first-person projection checks for reciprocal depth, near/far ordering, horizontal handedness, and orbit-to-walk direction conversion.
- Existing layout storage, machine designs, animations, camera preferences, and object placements remain unchanged.

## 0.11.5 - Reliable WASD and one-step Escape exit

### Fixed

- WASD and movement keys now work when the First person or Capture mouse button remains focused after being clicked.
- Entering first-person mode clears stale toolbar focus and focuses the model canvas.
- Releasing pointer lock with the browser Escape action now exits first-person mode instead of leaving the user in a paused first-person state.
- Escape keydown also exits immediately when the browser exposes the reserved key event to the page.
- First-person HUD and documentation now describe Escape as a complete exit action.

### Validation

- Added regression coverage for movement events targeting a focused button.
- Added regression coverage for pointer-lock loss and direct Escape exit requests.
- Plant layout storage, machine designs, camera preferences, and all existing project data remain unchanged.

## 0.11.4 - Full game-style first-person navigation

### Added

- Dedicated `first-person-controller.js` with continuous keyboard movement and pointer-lock mouse look.
- True perspective projection with configurable field of view.
- WASD movement, mouse look, Shift sprinting, Space jumping, and Ctrl/C crouching.
- Collision against solid machines, visible structural pillars, floor boundaries, and exterior walls.
- Sliding collision response so movement continues along an unblocked axis.
- Safe-spawn search when the current camera target is inside geometry.
- First-person HUD with mouse-capture, settings, and exit controls.
- Adjustable walking speed, eye height, field of view, mouse sensitivity, collision, and walking motion.
- Dedicated `validate:first-person` regression coverage and `docs/FIRST_PERSON.md`.

### Improved

- First-person mode expands the model to the full browser window and attempts browser full-screen mode.
- The previous low-height orthographic walkthrough is replaced with near-plane-clipped perspective rendering.
- Geometry behind the camera is clipped before being sent to the WebGL or Canvas renderer.
- Smart-label density is reduced in first-person mode.
- The previous overview camera state is restored when first-person mode ends.

### Compatibility

- Plant layout storage remains schema 6 under `monroe-glass-plant-layout-v6`.
- Machine-design and rendering-preference storage keys are unchanged.
- Existing layouts, designs, animations, floor features, walls, pillars, labels, and timeline edits are preserved.

## 0.11.3 - Smart, compact machine labels

### Added

- Smart, All, and Off label-display modes from the existing model toolbar.
- Type-based label importance, font sizing, and maximum text length.
- Zoom-aware label visibility and a viewport-based label-density budget.
- Priority ordering so selected, current-stage, and major production equipment receive clear label positions first.
- Dedicated `validate:labels` regression coverage.

### Improved

- Production-machine labels are larger than support-object labels, while carts, people, and animation helpers use smaller labels.
- Long object names are compacted using short names, common-word cleanup, and word-boundary truncation.
- Current-stage labels use color emphasis instead of appending long source descriptions.
- Collision avoidance and on-canvas clamping reduce label stacking and prevent labels from extending beyond the viewport.

### Compatibility

- Plant layout storage remains schema 6 under `monroe-glass-plant-layout-v6`.
- Machine-design and rendering-preference storage keys are unchanged.
- Existing layouts, object names, visibility settings, designs, animations, floor features, walls, pillars, and timeline edits are preserved.

## 0.11.2 - Reliable Plant Layout scaling controls

### Added

- Explicit **Uniform** and **Individual axes** scaling-mode buttons in the Plant Layout editor.
- Separate, readable scale-value layouts: one full-width uniform field or three larger X/Y/Z fields.
- Persistent `scaleEditMode` metadata for saved objects and live Plant Layout/Designer synchronization.
- Dedicated `validate:plant-scaling` regression coverage.

### Fixed

- Plant Layout scaling now changes the rendered custom design instead of only changing its outer envelope.
- Match-design objects automatically leave match mode when the user intentionally applies instance scaling, preventing design-library refreshes from resetting the new size.
- Individual-axis scaling now intentionally uses independent X/Y/Z design placement.
- Dimension edits respect the selected scaling mode: Uniform changes all three dimensions proportionally, while Individual axes changes only the entered dimension.
- Scale input boxes are wide and tall enough to display complete percentage values.

### Compatibility

- Plant layout storage remains schema 6 under `monroe-glass-plant-layout-v6`.
- Existing objects infer Uniform or Individual mode from their saved dimensions and design sizing settings.
- Machine designs, animations, floor features, walls, pillars, timeline edits, and rendering preferences are not reset.

## 0.11.1 - Adaptive rendering and performance optimization

### Added

- Shared `render-performance.js` controller for the Plant Layout and Machine Design Studio.
- Auto, Balanced, Quality, and Performance rendering modes.
- Configurable Full, Reduced, Follow mode, and Off shadow quality.
- Optional live FPS indicator and a compact performance status panel.
- Dedicated `validate:performance` regression checks.

### Optimized

- Reduced the normal animated render target from an unconditional 60 FPS to an adaptive 24-45 FPS while retaining 45-60 FPS during direct interaction.
- Limited idle redraws and stopped rendering work while the browser tab is hidden.
- Added adaptive device-pixel-ratio limits to reduce GPU fill load on high-DPI displays.
- Removed obsolete face and edge subdivision from the WebGL Machine Design Studio path.
- Reused the WebGL vertex buffer instead of reallocating it for every draw call.
- Cached parsed colors and tracked depth bounds incrementally.
- Added off-screen object and pillar culling in the Plant Layout.
- Bounded custom-machine shadow components and disabled expensive pillar shadows outside Quality/Full modes.
- Added adaptive grid spacing in Machine Design Studio so large design envelopes cannot generate thousands of grid lines.
- Removed unnecessary painter sorting when the WebGL depth buffer is active.

### Compatibility

- Plant layout storage remains schema 6 under `monroe-glass-plant-layout-v6`.
- Machine designs remain under `monroe-glass-machine-designs-v1`.
- Rendering preferences are stored separately under `monroe-glass-render-performance-v1`.
- Existing layouts, designs, animations, assignments, floor features, walls, pillars, and timeline edits are not reset.

## 0.11.0 - Unified transforms, stable structures, and walkthrough camera

### Added

- Exact Plant Layout fields for X/Y/Z position, X/Y/Z rotation, final dimensions, and uniform/per-axis percentage scale.
- Synchronized Plant Layout instance controls inside Machine Design Studio.
- Exact percentage scale controls for individual and selected designer parts.
- Live cross-tab layout synchronization when transforms change.
- Reusable designer presets for safety-yellow floor lines, utility trenches, and square floor drains.
- Low-angle camera presets in both editors.
- Low-height Plant Layout walkthrough controls using WASD, Q/E, drag-to-look, Shift speed boost, and Escape to exit.

### Fixed

- Removed repeated floor-dimension event-listener registration that could multiply updates and eventually freeze the page.
- Added bounded floor dimensions, adaptive grid spacing, and a maximum rendered grid-line count for very large layouts.
- Corrected oversized shadows by deriving custom-machine shadows from visible parts and crane shadows from narrow structural members.
- Reworked frame-selection and transform-control formatting.
- Preserved accurate scale percentages when dimensions are entered numerically or changed with transform handles.

### Compatibility

- Plant layout storage remains schema 6 under `monroe-glass-plant-layout-v6`.
- Machine design storage remains under `monroe-glass-machine-designs-v1`.
- Existing positions, designs, animations, floor features, walls, pillars, and timeline edits are migrated without resetting the layout.
- Machine-design payloads advance to version 10 while remaining backward-compatible under the existing storage key.

## 0.10.6 - Proportion-safe design assignment

- Added Preserve proportions, Match design dimensions, and Stretch to plant object sizing modes.
- Made Preserve proportions the default for existing and newly assigned custom designs.
- Added one-click dimension synchronization in both the Plant Layout and Machine Design Studio.
- Kept match-mode plant objects synchronized when a linked design envelope changes.
- Centralized custom-design placement math so boxes, cylinders, wheels, beams, rollers, wedges, and merged components use the same offsets and scale rules.
- Centered uniformly scaled designs inside the plant footprint without lifting them off the floor.
- Preserved the original independent-axis behavior as an explicit opt-in stretch mode.
- Added `validate:design-scaling` regression coverage.

## 0.10.5 - Four-corner waits and model shadows

- Added independent pause controls after all four legs of a four-step path.
- Added automatic migration from the v0.10.4 axis-pair pause fields.
- Added the same four-corner controls for scene objects, individual machine parts, and children inside merged assemblies.
- Added soft projected ground shadows for movable plant objects and structural pillars.
- Added soft projected shadows to every visible Machine Design Studio component.
- Kept shadows depth-tested so they do not draw through machines, walls, or other opaque geometry.
- Advanced machine-design payload exports to version 9 without changing the browser storage key.
- Added `validate:four-corner-pauses` and `validate:shadows` regression checks.

## 0.10.4 - Independent axis 2 pause timing

- Added `animationSecondaryPauseSeconds` for four-step scene and machine-part animations.
- Added an Axis 2 pause field to the Plant Layout, normal part inspector, and merged-child animation inspector.
- Axis 1 pause is applied after legs 1 and 3; Axis 2 pause is applied after legs 2 and 4.
- Existing saved animations without the new field fall back to their original pause value.
- Advanced machine-design payload exports to version 8 without changing the storage key.
- Added `validate:four-step-pauses` regression coverage.

## 0.10.3 - Per-child merged animation and four-step motion paths

- Added explicit per-child animation controls for merged Machine Design Studio components.
- Added an inherited-only/local-animation toggle so attached children remain connected while optionally running their own animation.
- Replaced automatic matching-animation suppression with a saved, user-controlled animation layer.
- Added active-member selection and per-child local-animation control for Plant Layout motion hierarchies.
- Added four-step local-axis motion for scene objects and machine parts, including up → forward → down → backward paths.
- Added independent second-axis distance and pause-at-corner timing.
- Advanced machine-design payload exports to version 7 while keeping the existing storage key.
- Added `validate:hierarchical-animations` regression coverage.

## 0.10.2 - Stable merged motion, bulk settings, and pause controls

- Added shared-setting editing for multiple selected Machine Design Studio parts, including color, opacity, visibility, and all animation settings.
- Added bulk settings for multiple selected Plant Layout objects, including size, rotation, timeline visibility, collision behavior, labels, locking, and animation controls.
- Fixed merged assemblies whose children repeated the parent animation, causing doubled speed, doubled distance, and diagonal drift. Identical child motion is now inherited exactly once.
- Replaced geometry-derived inherited animation scaling with exact animation transforms so rotating parts no longer introduce false scale or direction changes.
- Added a persistent Pause motion / Resume motion control to the Plant Layout. Animations freeze at their current frame instead of snapping back to their starting positions.
- Updated the Machine Design Studio animation button to pause and resume at the current frame.
- Preserved existing layout schema 6 and machine-design storage version 6.

## 0.10.1 - Hierarchical attached motion

### Changed

- Replaced newly created flat motion groups with true parent/child animation assemblies.
- Added a **Motion parent** selector to the Plant Layout multi-selection panel.
- Renamed the motion action to **Attach to parent** to make the relationship explicit.
- Children now play their own animation first and then inherit each parent animation from the nearest parent outward.
- Parent objects no longer inherit animation channels from their children.
- Added support for nested motion chains, such as bridge Z travel → trolley X travel → tool-head Y travel.
- Kept legacy `animationGroupId` layouts readable until they are reattached with the new hierarchy controls.

### Machine Design Studio

- Added an **Attachment parent** selector for merged items.
- The selected child’s animation now drives the whole merged assembly.
- Other children retain their own animations inside the driver’s moving coordinate space.
- The active part at merge time becomes the initial animation driver.
- Applied the same merged-item hierarchy when custom designs render in the Plant Layout.

### Compatibility and validation

- Added optional `motionParentId` and `motionDriverId` metadata without changing browser storage keys or layout schema.
- Copied objects are detached from their original motion parent to prevent stale links.
- Expanded motion regression coverage for inherited parent motion and independent child travel.
- Updated project versioning and documentation to 0.10.1.

## 0.10.0 - Condensed designer, local transforms, and expanded shape library

- Reorganized Machine Design Studio into a cleaner slicer-style workspace while preserving advanced editing capabilities.
- Added compact collapsible design actions, assignment controls, part ordering, and inspector sections.
- Added a categorized shape picker with quick access to common primitives.
- Added editable cylinder, sphere/ellipsoid, cone/hopper, and wedge/ramp primitives.
- Added closed 3D rendering for the new shapes in both Machine Design Studio and the Plant Layout.
- Added Local and World transform orientation controls, with Local selected by default.
- Made move, rotate, and scale gizmos follow the selected part's local axes.
- Corrected beam scaling so local X adjusts beam length, local Y adjusts beam height, and local Z adjusts beam width.
- Added exact beam length, beam height, and beam width fields.
- Changed custom beams in the Plant Layout from screen-width lines to closed depth-tested rectangular prisms.
- Added regression coverage for shape availability, local transforms, beam scaling, and plant-view rendering.
- Updated project versioning and documentation to 0.10.0.

## 0.9.5 - Merged machine parts and compound motion groups

### Added

- Added Shift-click, Ctrl-click, and Command-click multi-selection for parts in Machine Design Studio.
- Added **Merge selected** to turn two or more design parts into one compound item.
- Added **Separate merged** to restore a compound item to its original parts.
- Added **Join motion** in Plant Layout for combining selected scene objects into one motion group.
- Added **Separate motion** without deleting or resetting either object’s individual animation settings.

### Animation behavior

- Every animation channel from every joined member is composed and applied to the complete group.
- An X-axis shuttle on one object and a Z-axis shuttle on another produce a combined two-axis path for both objects.
- Joined objects select, drag, nudge, rotate, focus, and delete as one layout selection.
- Merged machine-design items can be moved, rotated, scaled, recolored, and animated as one item while retaining their child geometry.

### Compatibility

- Plant layouts remain on schema 6 and the existing browser storage key.
- Machine-design payload metadata advances to version 5; older designs continue loading through normalization.


## 0.9.4 - Animation pauses and multi-object selection

### Added

- Added `animationPauseSeconds` to scene-object animations.
- Added a **Pause after movement** control to the Plant Layout animation inspector.
- Added the same pause timing control to Machine Design Studio part animations.
- Back-and-forth animations now pause at both path endpoints before resuming.
- Added Shift-click, Ctrl-click, and Command-click multi-selection in the Plant Layout editor.
- Added a multi-selection summary and collective color picker.
- Added `Ctrl+A` to select every visible object at the active timeline stage.

### Improved

- Focus selected now frames the complete multi-object selection.
- Nudge and Y-rotation buttons move every unlocked selected object together.
- Remove deletes all selected objects in one undoable action.
- Selection outlines and emphasized labels render for every selected object.
- Single-object controls are disabled while multiple objects are selected so edits are not accidentally applied only to the primary object.

### Compatibility

- Plant layout storage remains `monroe-glass-plant-layout-v6` with schema 6.
- Machine-design storage remains `monroe-glass-machine-designs-v1` with payload version 4.
- Existing objects without pause metadata load with a pause duration of zero.
- Existing machine positions, designs, animations, floor features, walls, pillars, and timeline edits remain preserved.

## 0.9.3 - Depth-correct wheel occlusion

### Fixed

- Replaced plant-view wheel sprites with closed 3D cylinder geometry.
- Custom machine-design wheels now use the same WebGL depth buffer as cabinets, bases, walls, floors, and other solid components.
- Wheels below or behind a machine are now hidden by the machine instead of appearing through it.
- A-frame cart and A-frame glass-truck wheels now use the same depth-tested geometry instead of Canvas 2D ellipses.
- Wheel geometry preserves independent width, height, axle depth, component X/Y/Z rotation, machine rotation, and reveal scaling.

### Compatibility

- Plant layout storage remains `monroe-glass-plant-layout-v6` with schema 6.
- Machine-design storage and payload version remain unchanged.
- Existing layouts, custom designs, assignments, animations, floor features, walls, pillars, and timeline edits are preserved.

### Validation

- Added `npm run validate:wheels` to prevent plant wheels from bypassing the shared depth renderer.
- Existing JavaScript, layout-rendering, animation, and floor-feature regression checks remain in place.

## 0.9.2 - Editable floor features and rotation-aware animation paths

### Added

- Converted the supplied safety-yellow floor markings into regular selectable scene objects.
- Converted the supplied construction trenches into regular selectable scene objects.
- Added a square floor-drain object with an inset grated top.
- Added Safety yellow floor line, Utility trench, and Square floor drain to the object-type picker and Add menu.
- Added **Select floor feature** for cycling through floor features even when a trench is hidden by the current timeline stage.
- Added **Reverse movement direction** for object animations.
- Added an animation path guide for selected loop and back-and-forth objects.
- Added `npm run validate:floor` and a floor-feature regression test.

### Changed

- Safety lines, trenches, and drains now use the standard object editor for X/Z location, X/Y/Z rotation, width, depth/length, height, color, visibility, locking, timeline stages, copy/paste, and removal.
- Loop and back-and-forth animation axes are now local to the animated object. Rotating the object rotates its movement direction on all three axes.
- Removed the legacy hard-coded `drawSafety()` and `drawTrenches()` rendering paths.
- Existing schema-6 browser layouts receive the default floor features once through the `floorFeaturesInitialized` migration marker.

### Compatibility

- Plant layout storage remains `monroe-glass-plant-layout-v6` with schema 6.
- Machine-design storage keys and payload versions are unchanged.
- Existing machine positions, custom objects, animations, timeline edits, floor dimensions, walls, and hidden pillars remain intact.

## 0.9.1 - Editable production glass and whole-machine transforms

- Added X, Y, and Z base rotation fields for scene objects and animation objects.
- Fixed scene-object and machine-part spin animations so the All axes option rotates X, Y, and Z instead of falling back to Y only.
- Added a direct Select moving glass action in Edit Layout for the existing production-glass animation.
- Object animations now pause by default when Edit Layout opens, making moving items easy to select and position.
- Added Select entire machine in Machine Design Studio, including Ctrl+A.
- Whole-machine selections can be moved, rotated, scaled uniformly, or scaled on one axis while preserving all part spacing.
- Whole-machine selection has a combined outline, centered transform gizmo, focus behavior, nudge support, quick rotation, undo, and redo.
- Preserved plant layout schema 6 and the existing machine-design storage key.

## 0.9.0 - Scene assets and animation authoring

- Added editable Design Studio presets for cutting tables, filtration equipment, general boxes, freestanding cranes, overhead bridge cranes, raw-glass racks, plant rooms, and team members.
- Replaced the hard-coded final-stage glass and beacon motion with ordinary scene objects that can be selected, moved, copied, hidden, removed, or recreated.
- Added scene animation presets for vertical glass flow, moving material boxes, walking team members, shuttle carts, and blinking status beacons.
- Added per-object motion controls for path direction, amount, speed, phase, looping, back-and-forth motion, rotation, bobbing, pulsing, and blinking.
- Added pause/preview controls so animated objects can be placed at their base positions.
- Added part-level animation authoring to Machine Design Studio, including preview, axis selection, amount, speed, and phase.
- Added live custom-design animation support in the main plant model.
- Preserved the existing layout storage key and schema so moved and user-added objects remain in place.

## [0.8.2] - 2026-07-31

### Fixed

- Kept the WebGL scene canvas locked to the exact same viewport rectangle as the transparent interaction canvas when the docked layout editor opens, closes, resizes, or switches to the mobile stacked layout.
- Prevented machines from visually shifting away from their labels, selection outlines, overlap indicators, and pointer hitboxes while editing.
- Removed pillar-cap z-fighting by replacing the stacked steel and yellow pillar volumes with one closed pillar whose size and color interpolate through the paint stage.

### Compatibility

- Plant layout schema remains version 6.
- Machine design storage remains payload version 3.
- Existing layouts, machine positions, custom designs, assignments, floor dimensions, walls, pillars, and timeline edits are preserved.

### Validation

- Public JavaScript files pass syntax validation.
- Added a static rendering regression test that verifies desktop/mobile canvas alignment rules, live scene-canvas box synchronization, and single-volume pillar rendering.
- Machine registry JSON and generated machine data remain valid.

## [0.8.1] - 2026-07-31

### Added

- Linked Machine Design Studio sessions to individual plant objects.
- Saved design changes now update the assigned machine in open plant-layout tabs through browser storage events and BroadcastChannel synchronization.
- Added automatic machine-specific design copies so editing one existing machine does not unintentionally modify every machine using the same preset.

## [0.8.0] - 2026-07-31

### Changed

- Replaced the Machine Design Studio painter-style surface ordering with a WebGL depth-buffer renderer.
- Moved the plant layout scene to the same shared depth renderer so walls, machines, pillars, floors, cranes, and custom machine parts use per-pixel occlusion.
- Kept labels, transform gizmos, selection outlines, and editor feedback on a separate transparent interface canvas.
- Removed CAD-line rendering and the CAD-lines control from the plant viewer.

### Fixed

- Large platform and cabinet surfaces no longer cover smaller components that are physically above or in front of them.
- Closed objects retain every side face while the camera orbits; faces no longer disappear because of winding or painter-order changes.
- Parts behind a solid machine component no longer paint through the component in front.
- Plant exterior walls are now fully opaque in the rendered scene and correctly hide equipment behind them.
- Structural and machine edge lines remain depth-tested instead of appearing through solid geometry.
- Transparent glass is blended after opaque geometry while still respecting the opaque depth buffer.

### Compatibility

- Plant layout schema remains version 6.
- Machine design storage remains payload version 3.
- Existing layouts, custom designs, assignments, machine positions, floor dimensions, walls, pillars, and timeline edits are preserved.
- A Canvas 2D fallback remains available when WebGL is unavailable.

### Validation

- All public JavaScript files pass `node --check`.
- The shared depth renderer passed a mocked WebGL geometry test covering opaque triangles, transparent triangles, polygon edges, and depth-tested lines.
- Machine registry JSON and generated machine data remain unchanged.

## 0.7.0 - 2026-07-30

### Fixed
- Reworked Machine Design Studio hidden-surface rendering to prevent large cabinet faces from covering parts that should be visible.
- Added outward face winding, opaque back-face removal, fine face subdivision, and stable tie-breaking to reduce flicker and temporary de-rendering.
- Corrected wheel scaling so X, Y, and Z handles independently change wheel width, height, and axle depth.

### Changed
- Roller beds now use actual cylindrical rollers with circular ends instead of rectangular beam blocks.
- Built-in wheel presets now include independent width, height, and depth while retaining legacy `size` compatibility.
- Machine design storage/export payloads advance to version 3 without changing the storage key.

All notable changes to the Monroe Glass Plant Evolution project are documented here.

## [0.6.0] - 2026-07-30

### Added

- X, Y, and Z component rotation fields in the Machine Design Studio inspector.
- Three color-coded on-canvas rotation rings for all-axis rotation.
- Axis selector for quick ±90-degree rotation commands.
- Local-axis scale gizmos that remain aligned to rotated components.
- Closed 3D prism rendering for beam and roller components.
- Closed multi-sided wheel rendering.
- Machine-design storage payload version 2 with transparent migration from legacy Y-only rotation values.

### Changed

- Replaced component-center painter sorting with one global face-level render list.
- Added deterministic depth tie-breaking to reduce flicker from equal or nearly equal depths.
- Changed scale behavior so colored handles always resize one axis and the center handle always scales uniformly.
- Rendered transform gizmos as a high-contrast overlay after all model geometry.
- Changed component picking to use the frontmost rendered face instead of projected bounding rectangles.
- Updated plant custom-design rendering to honor component X, Y, and Z rotations.

### Fixed

- Transform handles can now be dragged when they are visually inside another component.
- Components no longer change whole-object draw order based only on their center point.
- Beam and roller parts no longer phase through cabinets as flat screen-space strokes.
- Rotated parts no longer lose faces because only a horizontal footprint was being rendered.
- Axis-specific scale dragging no longer depends on the former Uniform scaling checkbox.
- Existing `rotation` values remain compatible and are synchronized with the new Y rotation field.

### Validation

- `public/machine-design-studio.js`, `public/plant-app.js`, and `public/machine-designs.js` pass `node --check`.
- React TSX pages pass TypeScript syntax transpilation.
- Inline Chromium tests loaded all 11 design presets with no console exceptions.
- Interaction tests verified one-axis scaling, X-axis rotation, transform-handle priority inside a component, persistent selection, and design-storage version 2.

## [0.5.1] - 2026-07-30

### Fixed

- Removed the artificial upper-pillar outline pass that could draw rear pillars through solid equipment.
- Pillars and machines now use the same camera-depth ordering so nearer geometry naturally covers farther geometry.

## [0.5.0] - 2026-07-30

### Added

- Slicer-style Machine Design Studio workspace with a full-height center viewport, left design/parts browser, and right object/design inspector.
- Direct component selection from the canvas.
- Select, Move, Rotate, Scale, and Pan tools with keyboard shortcuts.
- X/Y/Z move and scale gizmos plus an on-canvas rotation ring.
- Natural orbit direction, right-button orbit, middle-button pan, Shift-pan, Alt-orbit, wheel zoom, and double-click focus.
- Configurable transform snapping and grid steps.
- Searchable component tree with visibility toggles.
- Front, right, top, isometric, fitted, and orientation-cube view controls.
- Arrow-key component nudging and Shift+Arrow vertical nudging.
- Uniform and per-axis component scaling.
- Design-envelope fitting from actual component bounds.
- Center-selected-component and quick ±90-degree rotation actions.
- Smart upper-pillar visibility pass in the plant renderer.

### Changed

- Reversed the previous horizontal orbit calculation so left/right camera movement now follows the drag direction.
- Reorganized machine design properties into focused transform sections rather than one long control form.
- Moved primitive creation and component ordering into the Parts browser.
- Improved roller-bed rendering so its rotation is visible in the design viewport.
- Kept plant layout schema 6 and design storage version 1 unchanged to preserve all version 0.4.0 user work.

### Fixed

- Pillars no longer disappear completely behind machines due to the canvas painter order.
- Component movement no longer depends on the old reversed-feeling camera drag behavior.
- Camera panning now follows the current camera yaw instead of moving only along fixed screen axes.

### Validation

- All browser JavaScript files pass `node --check`.
- Standalone Machine Design Studio and plant preview were exercised in Chromium.
- Browser tests cover direct component selection, tool switching, natural orbit direction, component creation, design field editing, and plant pillar rendering without console errors.

## [0.4.0] - 2026-07-30

### Added

- Non-destructive browser-layout schema 6 with exact schema 5 migration, pre-migration backup, and rolling schema 6 backup.
- Rotated-footprint collision detection for solid plant objects.
- Find overlap, Separate selected, and Resolve all editor actions.
- Per-object collision mode for intentionally non-solid or overhead objects.
- Red overlap indicators in edit mode.
- Collision-aware label placement that reduces label-on-label obstruction.
- Editable floor width, length, center X, and center Z.
- Fit floor around objects and Restore CAD floor size actions.
- A-frame glass truck object preset with a long deck, repeated stakes, six wheels, glass loads, and tow arm.
- Dedicated Machine Design Studio route and standalone preview.
- Component-based reusable machine design library.
- Box, glass-panel, beam, roller-bed, and wheel components.
- Machine design create, duplicate, reset, delete, import, export, undo, redo, camera, component move, component ordering, and assignment tools.
- Applying a design to one plant object or every matching machine type.
- `docs/MACHINE_DESIGN_STUDIO.md`.

### Changed

- Procedural boxes now render six closed faces with face-level depth sorting.
- A-frame glass carts now include decks, casters, repeated braces, ridge rails, glass loads, and handles.
- The plant editor exposes reusable machine design presets for each object.
- The main navigation now links Plant layout and Machine Design Studio.
- Layout JSON exports include floor configuration and schema version 6.
- JavaScript validation covers the plant viewer, design preset library, and Machine Design Studio.

### Fixed

- Existing version 0.3.0 machine positions and user-added objects are retained during the update.
- Missing rear and bottom faces no longer make cabinets and machine blocks appear open.
- Overlapping labels no longer stack directly on one another when alternate positions are available.
- Overlapping unlocked objects can be separated without manually guessing new coordinates.

### Validation

- All three browser JavaScript files pass `node --check`.
- Inline headless Chromium testing verified schema 5 preservation, editor launch, A-frame truck creation, design preset controls, floor controls, Machine Design Studio component creation, and zero browser errors.
- A collision-specific browser test verified overlap detection and automatic separation.

## [0.3.0] - 2026-07-30

### Added

- Browser Fullscreen API support for the model frame, including an `F` keyboard shortcut.
- Docked right-side editor workspace that remains available in full-screen mode.
- Select & move and Navigate view interaction modes.
- Panning from empty floor space while editing, plus Shift/Space pan and Alt/right-button orbit controls.
- Searchable object selector and Focus selected camera action.
- Configurable movement snapping and nudge/rotation controls.
- Photo-refined procedural blocks for the KODIAK 10-45, SQ4020-style waterjet, Denver Surface CNC, Zafferani-style washer, tempering line, FuseCube, wrapping station, and shipping rack.
- Add-object presets for washer, wrapping, shipping, and the other photo-refined machines.
- `docs/MODEL_REFERENCES.md` with research sources, confidence notes, and known accuracy limits.
- Browser-layout schema version 5 with migrations from schemas 4 and 3.

### Changed

- Editing now uses the full application width and temporarily hides the construction-stage side panel.
- Entering edit mode preserves the current camera instead of forcing a top-down view.
- The object property panel is organized around selection, navigation, nudge controls, and precise fields.
- Baseline KODIAK, waterjet, Denver, tempering, and FuseCube registry records include refined reference profiles.
- FuseCube baseline color and height were adjusted to better match the supplied plant photo.

### Fixed

- Objects can be selected and moved without losing the ability to pan, orbit, or zoom the scene.
- Empty-space dragging no longer does nothing while editing.
- Full-screen control text and active state now remain synchronized with browser full-screen changes.
- `Ctrl+F` remains available for browser find and does not trigger model full screen.

### Validation

- `public/plant-app.js` passes `node --check`.
- Machine registry export completes successfully.
- Headless Chromium tests verified editor docking, object creation, object search, navigation mode, nudge/rotation controls, and full-screen activation without browser errors.

## [0.2.0] - 2026-07-30

### Added

- General scene-object editing for machines, carts, raw-glass racks, rooms, and team-member markers.
- User-addable general boxes, generic machines, glass racks, offices, team markers, gantry cranes, and overhead bridge cranes.
- Rotation control for editable objects.
- Object color, visibility, label, and position-lock controls.
- Editable appearance and disappearance stages for every object.
- Editable attached-crane system, capacity, and rail height.
- Timeline scrubber and selectable autoplay speed.
- Timeline stage editor for title, short label, phase, date, description, and detail chips.
- Timeline stage insertion, deletion, and reordering with automatic object-stage remapping.
- Undo and redo history for object, structure, and timeline changes.
- Portable JSON layout export and import.
- Browser-layout schema version 4 with automatic migration from schema version 3.
- In-app status notifications.
- `VERSION` file and project-level semantic versioning.
- JavaScript syntax-validation and machine-data export scripts in `package.json`.

### Changed

- Converted previously hard-coded glass racks, offices, and people markers into movable model objects.
- Improved object selection to account for rotation.
- Updated drawing helpers so detailed machine geometry follows object rotation.
- Improved depth ordering for model objects.
- Reworked the layout editor into Objects, Structure, and Timeline workspaces.
- Refined the plant canvas background, controls, stage panel, editor panel, and timeline styling.
- Updated application metadata and standalone preview branding.
- Renamed the package to `monroe-glass-plant-evolution`.

### Fixed

- Resolved the inability to move raw-glass racks, support rooms, and team markers.
- Prevented locked objects from being dragged while keeping them selectable and editable.
- Prevented deleted support objects from being silently restored when loading a version 4 layout.
- Rebuilt timeline event listeners after stage edits so every stage remains clickable.
- Escaped imported or edited timeline text before rendering it as timeline markup.

### Validation

- `public/plant-app.js` passes `node --check`.
- The standalone page was loaded and exercised in headless Chromium.
- Verified editor launch, object creation, rotation editing, timeline stage creation, undo, and JSON export without browser errors.

## [0.1.0] - Baseline

### Added

- Initial 18-stage Monroe glass-plant construction timeline.
- CAD-grounded floor, structural columns, production areas, and machine placement.
- Machine, cart, and crane rendering.
- Basic machine dragging, renaming, dimensions, copy, paste, and removal.
- Pillar removal and wall visibility controls.
- Browser-local layout saving.
- Overview, floor-plan, CAD-line, label, and autoplay controls.
