# Changelog

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
