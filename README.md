# Monroe Glass Plant Evolution

Current project version: **0.13.10**

## Full-production rendering performance

The production renderer retains stationary sections of animated designs, shares
opaque animated primitive meshes, and updates their transforms instead of
rebuilding the whole machine. Shape-specific rollers, wheels and beams retain
their existing geometry rules and reuse buffers. Distant curves use fewer
segments without dropping overview components; distant internal animation is
sampled at 20 or 30 Hz and nearby animation at 60 Hz. Layout controls, saved
designs, envelopes, scales and storage keys are unchanged.

Use **Performance → Run 10-second benchmark** for a quick comparison, or
**Run 60-second stability check** while zooming out/in and walking around the
fully loaded Today's Production stage. Warm up the view first and compare the
same camera, window size, mode and saved layout. Export the result to compare
FPS, CPU submission time, p95/p99 frame intervals, geometry growth and context
losses. GPU timing appears only on browsers/drivers supporting asynchronous
WebGL timer queries; unavailable GPU timing is not reported as zero cost.

Run `npm run validate:production-performance` for the synthetic retained-buffer,
animation batching, transform parity, eviction and context-recovery regressions.
These tests use real Three.js geometry with a simulated driver, not browser FPS.
Existing saved production work must be benchmarked in its original browser and
origin; a clean default scene is not a substitute for the customized plant.

## Version 0.13.10

Version 0.13.10 completes Railway hosting compatibility. The private owner route remains password-only, and the checked-in published plant workspace now loads on any non-local read-only deployment instead of being limited to `*.chatgpt.site`. This keeps ChatGPT Sites and Railway on the same approved public plant/layout snapshot while preserving separate editable owner/browser workspaces.

## Version 0.13.9

Version 0.13.9 removes the ChatGPT-specific authentication dependency from the private owner route. Owner access is now controlled only by the existing editor password gate, so the same protected owner workflow can run on ChatGPT Sites, Railway, or another standard Node host without requiring ChatGPT authentication headers. The hidden five-click owner entry, session-scoped unlock, public read-only viewer, and desktop-only Machine Design Studio behavior are unchanged.

## Version 0.13.8

Version 0.13.8 is a bug-fix-only responsive QA release. It fixes the short phone-landscape overview so the model controls, playback row, and stage dock remain visible together; extends compact mobile label-density rules to coarse-touch landscape phones; and updates the CAD regression validator to match the current variable-height column renderer.

## Version 0.13.7

Version 0.13.7 rotates the owner/Machine Design Studio editor credential while keeping the same protected owner route, session behavior, and public read-only experience. The password itself is not stored in source; both access gates use the updated PBKDF2-derived hash.

## Version 0.13.6

Version 0.13.6 adds a real touch-first First Person mode for phones and tablets. Mobile viewers now get directional movement controls, drag-to-look, run, jump, crouch, and exit actions without relying on desktop pointer lock. The mobile overview label system was also tightened so Adaptive mode abbreviates sooner, limits how many labels can occupy a phone viewport, reduces repeated labels, and avoids force-showing dense label sets at normal mobile zoom.

## Version 0.13.5

Version 0.13.5 declutters the public viewer on phones and keeps editing intentionally desktop-focused. The mobile 3D viewport is taller, gesture guidance and Play progress share one compact row, public viewers no longer see editor navigation, and the hidden owner-entry version marker is reduced to a tiny corner badge. Machine Design Studio now presents a desktop-required screen on phone, tablet, and coarse-touch layouts while remaining fully available on desktop for authenticated owners.

## Version 0.13.4

Version 0.13.4 is the final responsive QA pass over the touch-first viewer. Runtime help now stays touch-correct after control refreshes, portrait touch tablets receive the same mobile-first stage/navigation treatment, and pointer-lock First Person controls stay out of phone layouts. The release also refreshes regression coverage for the current additive collision-envelope behavior.

## Version 0.13.3

Version 0.13.3 makes the public Plant Evolution viewer genuinely touch-first. Phone users can orbit the plant with one finger, pinch to zoom, pan with two fingers, and move through construction stages from a floating stage dock without leaving the 3D view. Mobile-specific gesture guidance replaces desktop mouse instructions, controls use larger touch targets, the current timeline stage automatically stays centered, and the stage details/action area is easier to read and operate on a narrow screen.

The owner Plant Layout editor also gets a more usable phone split between the 3D viewport and editing controls. Machine Design Studio becomes model-first on small screens: the 3D viewport appears before the browser/inspector panels, top actions and camera tools are touch-sized, and dense command areas scroll horizontally instead of crushing the viewport. Edge-to-edge safe-area support is enabled for modern phones.

## Version 0.13.2

Version 0.13.2 adds a discreet owner entry from the normal Plant Evolution header. Rapidly click the **Model Studio v0.13.2** badge five times within 3.5 seconds to open the private owner workspace. Normal visitors receive no visible owner link or prompt.

The hidden gesture is intentionally only a convenience route, not the security boundary: the owner workspace still requires ChatGPT sign-in and the editor password before the Plant Layout editor or Machine Design Studio can be opened. This keeps the public portfolio view clean while giving the owner a memorable way into the existing editing tools.

## Version 0.13.1

Version 0.13.1 keeps stage transitions visually sharp and adds a private hosted owner workflow. Auto rendering no longer lowers the viewport pixel ratio when a transition creates a heavy frame; it reduces distant geometry/detail and shadow work first. The stage information card also transitions without a blur filter.

The normal hosted site remains a clean read-only portfolio/company viewer. A private, non-indexed owner route requires ChatGPT sign-in and the editor password, then unlocks the existing Plant Layout editor and Machine Design Studio for that browser tab. Machine edits continue to use the established reusable design library, nested-machine tools, materials, transforms, and shared animation timeline rather than a separate editor. Hosted saves remain browser-local until an approved workspace is exported and published as the public snapshot.

## Version 0.13.0

Version 0.13.0 turns Machine Design Studio into a clear build-save-place workflow. New machines begin blank, reusable designs now have explicit Save and Save As actions, and saving a machine into the Plant Layout provides a direct handoff to position the newly created object. Redundant Designer controls were consolidated and the interface received a shared professional visual system.

Designer orbit, pan, and wheel zoom directions now match the on-screen guidance. Rendering avoids work from off-screen animations and idle first-person pointer lock, while adaptive detail responds faster to sustained slow frames. First-person culling is more conservative around nearby and peripheral machines so large objects no longer blink out at the sides of the view.

## Version 0.12.17

Version 0.12.17 prevents native browser middle-mouse autoscroll from moving the webpage while panning either 3D viewport. Middle-button drag still pans the Plant Overview and Machine Design Studio scenes normally, including when the view is not fullscreen.

## Version 0.12.16

Version 0.12.16 performs a deeper Designer-to-Plant Overview animation parity correction. Plant Overview now uses the same rotated geometry bounds and transform ordering as Machine Design Studio for all editable part types, including nested merged groups and embedded machines. This removes pivot drift that remained when cylinders, cones, wedges, beams, wheels, or other rotated parts were inside animated assemblies.

Beam rotations are no longer applied both to the beam endpoints and to its rotation fields. Nested motion-driver scaling now treats a nested group as one assembly around its own center before moving that assembly relative to the driver pivot. Custom boxes, wheels, and roller beds also use the same component-then-machine 3D transform order as the Designer, including non-uniform Plant Layout machine scaling. Legacy Pulse animations use the same shape-aware scaling logic as timeline clips.

Machine-design storage remains at **payload version 17** because these are runtime transform/rendering corrections and require no saved-data migration.

## Version 0.12.15

Version 0.12.15 keeps embedded machines at their original design-unit scale when they are inserted into another machine. Adding a saved machine no longer expands the destination design envelope automatically, because changing that envelope can cause an existing Plant Layout instance to rescale every part. If a larger reusable envelope is desired, use **Tight fit** explicitly after arranging the embedded machine.

Plant Layout animation transforms now use the same component-center conventions and rotated geometry bounds as Machine Design Studio. This fixes nested and embedded-machine pivot, rotation, scale, and motion-driver behavior that could look correct in the designer but shift or scale incorrectly in the plant view. Wheel coordinates are now consistently treated as center coordinates during Plant Layout animation transforms.

Machine-design storage remains at **payload version 17** because these corrections change runtime placement and animation math without adding saved-data fields.

## Version 0.12.14

Version 0.12.14 adds **saved machines as reusable components inside another machine**. Open the **Add** panel in Machine Design Studio, choose another saved machine design, and click **Add machine to current design**. Custom machines are listed first, the design currently being edited is excluded to prevent self-embedding, and the inserted machine is centered near the current design floor.

An inserted machine is stored as one embedded-machine group with a snapshot of the source machine's complete part hierarchy. Component and animation-clip IDs are refreshed so the same machine can be inserted more than once safely. Internal part animations remain independent and run from the destination machine's shared animation clock, while animations authored on the embedded-machine wrapper move or rotate the whole inserted assembly. The same hierarchy renders in Plant Layout. Version 0.12.15 later changed insertion so the destination envelope is not resized automatically.

Machine-design storage advances to **payload version 17** to preserve embedded-machine source metadata while keeping the existing browser storage key.

## Version 0.12.13

Version 0.12.13 audits the complete Machine Design Studio timeline animation engine and fixes discrete opacity/visibility clips. **Blink opacity** now uses raw cycle time instead of eased motion progress, so its default Step easing correctly alternates between the visible and dim portions of every cycle. Blink minimum opacity now accepts `0` for a true fully invisible blink.

**Show / hide → Toggle each cycle** now alternates state once per cycle instead of depending on eased progress. Regression coverage now samples every supported timeline animation family, while the shared machine clock, nested merged-item targeting, ripple editing, pivot rotation, fades, and rectangular split behavior from prior versions remain intact. Machine-design storage remains at payload version 16 because no saved-data field changed.

## Version 0.12.12

Version 0.12.12 puts every machine-part animation on one shared machine clock. Parts still retain separate clip collections and timeline targets, but their clip start times are now absolute positions on the same ruler. Machine-wide Loop and Machine speed settings control all nested and top-level parts together in Machine Design Studio and the Plant Layout.

Selecting a merged item from the left Parts panel now uses the same recursive animation-owner resolver as a viewport click, so it opens the nested timeline that actually drives the visible assembly instead of an empty outer target. Extending a clip's right edge now performs a ripple edit: clips that began at or after the original end are pushed right by the extension amount, while clips already overlapping the edited clip remain in place. Dragging clip bodies still creates or removes overlap normally. Machine-design storage advances to payload version 16 for the shared design timeline settings.

## Version 0.12.11

Version 0.12.11 repairs timeline recognition for deeply nested merged items. Every visible render primitive now retains the complete path from the top-level merged item through each nested group to the clicked part. The top-level item remains selected for transforms, while the Animation timeline resolves to the deepest clicked part or merged group that actually owns an animation.

When a clicked child does not own an animation, the editor follows the merged item's configured motion-driver chain to find the timeline that drives the visible assembly. The target picker also lists every nested descendant recursively, and clicking a different child inside an already selected outer group refreshes the timeline target immediately. Machine-design storage remains at payload version 15 because no saved-data structure changed.

## Version 0.12.10

Version 0.12.10 restores the stable version 0.12.8 Rotate implementation and adds a **Flip rotation animation** button. The button reverses the sign of the selected Rotate clip's existing angle, so a positive Z rotation becomes negative and vice versa without adding another saved direction field or changing the pivot-aware animation engine. Rotate clips saved by version 0.12.9 are converted back to the signed-angle format automatically.

Nested merged items now assign new animation clips to the newly created outer merged item by default. Creating an outer merge resets the timeline target away from any previously selected inner group. As a result, an animation intended for the full outer assembly remains visible after deselection and does not move onto the inner merged item when the outer assembly is separated. Machine-design storage remains at payload version 15.

## Version 0.12.8

Version 0.12.8 changes the timeline **Rotate** animation from continuous spinning to a keyed rotation that moves from 0 degrees to one requested final angle over the clip duration. The rotation stops at that angle when **Hold final value** is enabled, so a 90-degree clip produces a 90-degree turn instead of continuing through additional cycles.

Rotate clips now include local X, Y, and Z pivot offsets measured from the selected part's center. A zero offset rotates in place. Moving the pivot away from the center makes the part swing or orbit around that point. Saved timeline clips that used the older internal `spin` type migrate automatically to Rotate while preserving their axis and degree amount. Machine-design storage advances to payload version 15 without changing the browser-storage key.

## Version 0.12.7

Version 0.12.7 expands **Split into rectangles** with a selectable local spread axis and a seeded minimum/maximum column range. X, Y, and Z keep every fragment traveling only along that part axis; All axes preserves the original three-dimensional spread. New split clips choose a stable random count from three through six columns by default, and older fixed-column clips retain their original count and all-axis behavior.

The timeline also adds dedicated **Fade in** and **Fade out** clips. Fades use the clip duration and easing curve, can hold their final opacity, and can be sequenced so a faded-out part remains invisible until a later fade-in. Machine-design storage advances to payload version 14 without changing the browser-storage key.

## Version 0.12.6

Version 0.12.6 adds a seeded **Split into rectangles** timeline animation. A selected part or merged item is divided into an even rectangular grid, then each fragment moves and rotates in a stable pseudo-random direction. The same saved seed produces the same pattern in Machine Design Studio and the Plant Layout.

The clip inspector provides columns, rows, depth layers, spread distance, rotation scatter, and random seed controls. Existing timelines remain compatible, and machine-design storage advances to payload version 13 without changing the browser-storage key.

## Version 0.12.5

Version 0.12.5 repairs oversized timeline spans, enlarges the bottom animation workspace, moves animation creation into the right inspector, and fixes animation deletion.

### Timeline repair and layout

1. Timeline length is automatic: it starts at 30 seconds and only grows when a clip ends later.
2. Legacy or corrupted saved span values such as `886370` are discarded without removing any clips.
3. The bottom timeline is taller and uses the full viewport width because the animation palette now lives in **Selected part → Animation** on the right.
4. Click an animation type in the right panel to append it, or drag it from the right panel onto an exact time.
5. Delete removes the selected animation from the saved part timeline. The Delete or Backspace key performs the same action while the animation timeline is open.

## Version 0.12.4

Version 0.12.4 makes the docked Machine Design Studio timeline easier to control precisely. Every animation type now starts with a practical preset duration, the timeline always begins as a 30-second workspace, and the ruler automatically extends when a clip ends after 30 seconds.

### Timeline workflow improvements

1. Select a part and open **Animation** beneath Pan.
2. Click an animation type to append it after the current last clip using that type's preset duration.
3. Drag an animation type onto the ruler to place it at an exact time instead.
4. Clips that do not overlap share the same lane from left to right. Overlapping clips move to additional lanes automatically.
5. Select a clip before resizing it. Only that clip's orange left and right handles accept resize input.
6. Dragging uses a fixed 44-pixel-per-second scale, so small mouse movements create small timing changes.
7. Use the separate **Play**, **Pause**, and **Restart** buttons while previewing.

The default presets range from 2 seconds for visibility and wait clips to 8 seconds for four-step paths. All durations remain editable in the right inspector.

## Version 0.12.3

Version 0.12.3 moves part animation into a docked timeline workspace at the bottom of Machine Design Studio. The **Animation** button now appears directly under **Pan** in the upper-left tool rail. The timeline exposes every supported animation type at once, supports drag-and-drop placement, lets clips be moved before or after other clips, and lets either clip edge be dragged to change its timing.

### Docked timeline workflow

1. Select one machine part.
2. Click **Animation** under the Pan tool, or press `A`.
3. Click an animation type to add it at the playhead, or drag the type onto an exact timeline position.
4. Drag a clip left or right to change its start time. Clips snap to the selected time step and to neighboring clip edges.
5. Drag the left or right clip handle to change the start or duration.
6. Click a clip to switch the right inspector to that animation's complete settings.
7. Use Play, Pause, Restart, the playhead, timeline looping, playback speed, explicit length, and timeline snap controls while previewing.

The right inspector retains all type-specific settings: clip name, type, enabled state, start, duration, cycle timing, endpoint pauses, repeat count, easing, phase, yoyo, hold behavior, axes, distance, rotation, scale, opacity, visibility, and four-step corner pauses. Merged items can still target either the whole assembly or an individual child.

## Version 0.12.2

Version 0.12.2 added a visual, clip-based animation timeline to every machine part and reorganized all major editing panels into focused tabs. Each part can contain multiple sequential or overlapping clips with exact timing, easing, axes, distances, rotation, cycles, endpoint pauses, cycle pauses, visibility, opacity, and playback settings. Saved timelines preview in Machine Design Studio and play on linked machines in the Plant Layout.

The Designer left panel uses **Library**, **Parts**, **Add**, and **Plant** tabs. The Plant Layout editor uses **Objects**, **Structure**, **Stages**, and **Project**, with the Objects section divided into **Select**, **Transform**, **Animation**, and **Add**.

## Version 0.12.1

Version 0.12.1 makes Machine Design Studio envelopes precise enough to hug the actual machine geometry. Envelope dimensions now accept values down to 0.01 ft, the viewport can display the envelope outline, and **Tight fit to parts** can use zero or user-defined edge clearance. Tight custom dimensions are preserved when the design is added to or synchronized with the Plant Layout.

### Tight-envelope workflow

1. Open the Design tab in Machine Design Studio.
2. Expand **Design envelope**.
3. Leave edge clearance at `0` for an exact axis-aligned fit, or enter a small clearance in inches.
4. Choose whether to fit all parts or only visible parts.
5. Select **Tight fit to parts**.
6. Keep **Show envelope outline in the viewport** enabled while checking the result.

## Version 0.12.0

Version 0.12.0 makes reusable Machine Design Studio models directly available from the Plant Layout editor. Open **Edit layout**, scroll to **Add to the 3D model**, choose a saved designer machine, set its name, appearance stage, and placement, then insert it without leaving the plant page.

### Add a designer-created machine from Plant Layout

1. Create and save a reusable machine in **Machine Design Studio**.
2. Return to the Plant Layout and choose **Edit layout**.
3. Scroll down and open **Add to the 3D model**.
4. Choose the machine under **Saved designer machine**.
5. Optionally change its Plant Layout name, appearance stage, and placement method.
6. Select **Add designer machine**.
7. The new object is selected and focused automatically. It remains linked to the reusable design for later updates.

The panel has a **Refresh** action for designs saved in another tab and a **Create or edit designs** shortcut. Existing standard machines, carts, cranes, animations, floor features, rooms, and other objects remain available under the condensed standard-object section.

## Version 0.11.9

Version 0.11.9 restores the complete CAD-derived pillar layout inside the original plant footprint. Earlier builds intentionally loaded only the first 96 column anchors even though `public/plant-data.js` contains 118. The omitted eastern structure anchors are rendered, selectable, removable, restorable, collision-enabled, and included in shadows and first-person navigation.

### Existing-layout pillar restoration

- All 118 CAD column anchors load inside the original structure.
- The previously omitted eastern column lines near X = 180–226.54 ft are restored.
- Existing hidden-column indices remain compatible.
- Newly restored columns default to visible and do not reset machines, floor dimensions, animations, or custom designs.
- Automatic extension columns generate only outside the original CAD footprint.

## Version 0.11.8

Version 0.11.8 adds a direct **Add new machine to Plant Layout** workflow. Build a reusable design, choose a name, appearance stage, and placement method, then create a new linked Plant Layout instance without modifying an existing machine. New instances use the design envelope as their starting dimensions and continue to receive later saved design changes. See `docs/CREATING_MACHINES.md`.

### Create-machine workflow

1. Open **Machine Design Studio** and choose **New**.
2. Build the machine from parts and set its design envelope.
3. Expand **Use in plant layout**.
4. Enter a machine name and choose its appearance stage and placement method.
5. Select **Add new machine to Plant Layout**.
6. Continue editing the design; the new plant instance remains linked and updates automatically.

## Version 0.11.7

Version 0.11.7 automatically continues the plant's structural column grid when the floor is widened, lengthened, or repositioned beyond the original CAD footprint.

### Structural extension workflow

1. Open **Edit layout → Structure**.
2. Increase the floor **Width** or **Length**, or change its center.
3. Leave **Extend the CAD column grid into new floor sections** enabled.
4. New supports appear on the continued 40 × 30 ft bay pattern only in the added structure area.
5. Adjust **X bay spacing** or **Z bay spacing** when a future building section uses a different structural module.
6. Click any original or generated pillar with the Structure tool to remove it; **Restore every pillar** restores both types.

The original CAD pillars are preserved in place and are not regenerated or duplicated. Generated columns have stable identifiers, so hidden extension columns remain hidden through reloads, undo/redo, and layout JSON export/import. First-person collision and shadows also include the generated structure.

For unusually large floors, the renderer retains grid alignment while reducing column density by an integer stride to prevent a single dimension edit from creating an unsafe number of models.

## Version 0.11.6

Version 0.11.6 corrects first-person orientation and perspective depth. Entering first person now faces the same direction represented by the overview camera, and opaque machines, walls, wheels, and components correctly hide geometry behind them.

### First-person workflow

1. Open the Plant Layout and select **First person**.
2. The model expands to the full browser window and attempts to enter browser full-screen mode.
3. Click the model or choose **Capture mouse** if the mouse is not already captured.
4. Use **W/A/S/D** to walk, the mouse to look around, **Shift** to sprint, **Space** to jump, and **Ctrl** or **C** to crouch.
5. Press **Esc** once to leave first-person mode and return to the saved overview camera.

### Fixed in 0.11.6

- First-person depth now uses reciprocal perspective depth rather than linearly interpolated camera distance.
- Opaque foreground geometry correctly occludes rear geometry while walking.
- The overview orbit angle is converted to the matching first-person look direction on entry.
- Existing WASD, mouse-look, collision, jump, crouch, and one-step Escape behavior remain unchanged.

### Fixed in 0.11.5

- Stale focus on the toolbar or HUD buttons no longer blocks WASD input.
- Losing pointer lock through the browser Escape action requests a full first-person exit.
- Escape key handling also exits directly when the browser delivers the key event to the page.
- Entering first person clears the previously focused control and focuses the model canvas.

### First-person camera and collision

- Uses a true perspective field of view rather than the previous zoomed orthographic view.
- Clips geometry at the camera near plane so walls, floors, and machines do not invert or stretch when the camera gets close.
- Stops at visible solid machines, structural pillars, exterior boundaries, and walls.
- Slides along obstacles when only one movement axis is blocked.
- Searches for a nearby safe starting location if the current overview target is inside a machine or pillar.
- Includes optional walking motion, adjustable eye height, walking speed, field of view, mouse sensitivity, and collision toggle.
- Restores the exact overview camera used before entering first-person mode.

### Compatibility

The update does not change the Plant Layout, Machine Design Studio, machine-design, or rendering-preference storage keys. Existing layouts, designs, animations, floor features, walls, pillars, labels, and timeline edits remain unchanged.

## Version 0.11.3

Version 0.11.3 introduces a compact, zoom-aware machine-label system so the plant remains readable from overview distances without removing useful identification.

### Smart label workflow

- **Smart labels** is the default. Major production equipment remains labeled at wider views, support objects appear as the camera moves closer, and small carts, people, and animation helpers appear only at close range.
- The label button cycles through **Smart labels**, **All labels**, and **Labels off**.
- Production equipment uses larger label text; cranes, rooms, and racks use medium labels; carts, team members, and animation objects use smaller labels.
- Labels use the existing short name when available, remove repeated words such as “machine” and “equipment,” and truncate long names at a readable word boundary.
- Selected objects and objects entering on the current timeline stage remain labeled regardless of zoom.
- Important labels are placed first and use a viewport-based label budget plus collision avoidance so labels do not cover the complete model.

### Compatibility

The update does not change the Plant Layout or Machine Design Studio storage keys. Existing machine names, custom short names, object visibility settings, layouts, designs, animations, floor features, walls, pillars, and timeline edits remain unchanged.

## Version 0.11.2

Version 0.11.2 repairs Plant Layout scaling and makes the scaling controls easier to read and understand.

### Scaling workflow

- Choose **Uniform** to keep width, height, and depth proportional. Enter one percentage value in the full-width scale field.
- Choose **Individual axes** to scale X, Y, and Z independently using three larger numeric fields.
- The selected mode is saved per object and synchronized with Machine Design Studio.
- Editing width, depth, or height while Uniform is selected scales the complete object proportionally. In Individual mode, only the entered dimension changes.
- Custom machine designs now use the chosen instance scaling mode when rendered in Plant Layout, including objects that were previously in Match design dimensions mode.

### Compatibility

Existing layouts remain under `monroe-glass-plant-layout-v6`. Older objects infer their initial scaling mode from their saved axis percentages and design-sizing mode, so the update does not reset current sizes or placements.

## Version 0.11.1

Version 0.11.1 focuses on smooth interaction and predictable frame pacing. Both 3D editors now share an adaptive rendering controller that reduces unnecessary redraw work without removing model or animation capabilities.

### Performance system

- **Auto** is the recommended default. It adapts render resolution after sustained slow or fast frame windows.
- **Balanced** uses moderate geometry detail, reduced shadows, and a 30 FPS animation target.
- **Quality** increases resolution, curved-surface detail, shadow layers, and the animation target.
- **Performance** lowers curved-surface detail, disables shadows, and targets 24 FPS for animation-heavy layouts.
- Direct orbiting, dragging, transforming, and zooming temporarily use a higher interaction frame rate.
- Static scenes redraw at a low idle rate, and hidden browser tabs stop rendering.
- The Performance panel is available in both the Plant Layout and Machine Design Studio. It can also show a live FPS badge.

### Rendering optimizations

- Objects and pillars outside the visible viewport are culled before model geometry is generated.
- Custom-model shadows use a bounded component budget; pillar shadows are reserved for Quality or Full-shadow modes.
- The WebGL renderer reuses its vertex buffer, caches parsed colors, and avoids an extra depth array each frame.
- Machine Design Studio no longer subdivides every large face into many painter-order cells when WebGL depth testing is available.
- Very large designer envelopes use adaptive grid spacing instead of creating thousands of grid lines.
- Existing layouts and machine designs are preserved; performance preferences use a separate browser-storage key.

## Version 0.11.0

Version 0.11.0 unifies exact transforms between the Plant Layout and Machine Design Studio, stabilizes very large floor dimensions, improves shadow footprints, and adds closer camera controls plus a low-height walkthrough mode.

### Transform synchronization

- Plant objects now expose exact X/Y/Z position, X/Y/Z rotation, final width/depth/height, and uniform or per-axis scale percentages.
- Machine Design Studio exposes the same Plant Layout instance values in a dedicated synchronized panel.
- Changes made on either page are saved to the same browser layout and broadcast to other open project tabs.
- Designer parts have exact position, rotation, final dimensions, and uniform/per-axis scale percentages. Direct dimension edits and transform-handle scaling keep percentage metadata synchronized.

### Structure and camera updates

- Floor width and length are clamped to a supported 40–5,000 ft range.
- Large floors use adaptive grid spacing and a hard grid-line limit, avoiding the runaway render work that could freeze the page.
- The Plant Layout supports closer zoom, a low-angle overview, and a low-height walkthrough camera using WASD, Q/E, mouse drag, Shift, and Escape.
- Machine Design Studio supports closer zoom and a lower camera preset.

### Models and shadows

- Safety-yellow markings, utility trenches, and square floor drains now have reusable Design Studio presets and can be opened as linked editable designs.
- Custom machine shadows are generated from individual visible parts rather than one oversized machine envelope.
- Crane shadows use their posts and beams, preventing a bridge crane from casting one giant rectangular shadow.
- The Layout Editor’s frame-selection controls and exact-transform sections were reformatted for clearer use.
- Machine-design payloads advance to version 10 while retaining the existing browser storage key; older designs normalize to 100% scale.

## Version 0.10.6

Version 0.10.6 adds proportion-safe assignment between Machine Design Studio and the Plant Layout. Custom designs now default to uniform scaling, can optionally synchronize the plant object's dimensions to the design envelope, and retain the previous independent-axis stretch mode when intentionally selected.

### Design sizing modes

- **Preserve proportions** uniformly scales the complete design and centers it in the plant object's width/depth footprint. This is the recommended default and keeps wheels round, beam sections consistent, and rotated parts proportional.
- **Match design dimensions** updates the plant object's width, depth, and height to the design envelope and keeps those dimensions synchronized as the linked design changes.
- **Stretch to plant object** retains the earlier independent X/Y/Z scaling behavior for intentionally stretched models.
- **Sync plant dimensions to design** is available in both the Plant Layout editor and Machine Design Studio.

## Version 0.10.5

- Adds four independent pause timers to four-step paths: after step 1, step 2, step 3, and step 4.
- Supports timing such as up → wait 5s → forward → wait 5s → down with no wait → backward with no wait.
- Preserves v0.10.4 timing by migrating axis 1 waits to steps 1/3 and axis 2 waits to steps 2/4.
- Adds soft, depth-tested projected shadows beneath movable plant objects, machines, cranes, carts, people, pillars, and Machine Design Studio parts.
- Shadows move with animated objects and remain correctly hidden by opaque machine bodies and walls.
- Machine-design exports advance to payload version 9 while retaining the same browser storage key.

## Version 0.10.4

- Adds a separate axis 2 pause timer to four-step animations.
- Axis 1 pause is used after the first and third legs.
- Axis 2 pause is used after the second and fourth legs.
- Existing four-step animations preserve their old timing by inheriting the axis 1 pause when no axis 2 value has been saved yet.
- Supports scene objects, regular machine parts, and individual children inside merged machine assemblies.

## Version 0.10.3

- Merged machine components now expose a child selector so every attached part can keep, disable, or edit its own local animation independently.
- The attachment parent carries the full assembly exactly once; children inherit that transform and optionally add their own motion layer.
- Scene-object attachments now include an active-member picker and an explicit own-animation control for each child.
- Added a local-axis four-step path animation: axis 1 forward, axis 2 forward, axis 1 backward, axis 2 backward. This supports paths such as up → forward → down → backward.
- Four-step paths support independent distances, object-relative axes, speed, phase, and a pause at every corner.
- Existing merged designs and layout attachments migrate without changing storage keys. Identical child/parent animations created by older merges default to inherited-only until the child’s local layer is enabled.

## Version 0.10.2

- Multi-selected parts and plant objects can now share settings without being merged.
- Merged animation hierarchies suppress duplicate child motion when children match the parent, preventing doubled speed, excessive travel, and diagonal drift.
- The Plant Layout and Machine Design Studio now pause animations in place and resume from the same frame.


Interactive 3D construction timeline and editable plant-layout model for the Monroe glass plant. The horizontal footprint is grounded in `Monroe Archs w Updates 1-23-25 (002).dwg`; machine detail, vertical dimensions, and photo-correlated placements remain editable interpretations.

## Version 0.10.1

Motion assemblies now use a true parent/child hierarchy instead of applying every animation channel to every object. Choose a **Motion parent** in the Plant Layout and attach the other selected objects to it. The parent carries its children, while each child continues to play its own animation in the parent’s moving coordinate space.

Example: a bridge can travel back and forth on Z while an attached trolley travels on X. The bridge only moves on Z; the trolley inherits the bridge’s Z motion and simultaneously moves on X without detaching. Nested parent/child chains are supported, so a tool head can inherit trolley motion, which already inherits bridge motion.

Merged items in Machine Design Studio now use the same principle. The **Attachment parent** child drives the complete merged assembly, while every other child retains its individual animation. The active part at merge time becomes the initial attachment parent, and it can be changed later in the merged item’s Animation section.

## Version 0.10.0

Machine Design Studio now uses a cleaner slicer-style workflow without removing advanced controls:

- Compact design and assignment actions
- Focused parts tree and categorized shape picker
- Collapsible transform, dimension, animation, and machine-property sections
- Local and World transform orientation
- Corrected beam length and cross-section scaling
- Closed depth-tested beam geometry in the Plant Layout
- New cylinder, sphere/ellipsoid, cone/hopper, and wedge/ramp shapes

The complete primitive library is:

- Box / cabinet
- Cylinder / tank / post
- Sphere / ellipsoid / indicator
- Cone / hopper
- Wedge / ramp / sloped guard
- Glass panel
- Rectangular beam
- Circular roller bed
- Wheel / caster
- Merged component group

Every primitive supports movement, X/Y/Z rotation, independent X/Y/Z scaling, color, opacity, visibility, duplication, grouping, and part animation. Local transforms follow the part’s current orientation; World transforms follow the fixed design grid. For beams, local X changes length, local Y changes height, and local Z changes width.

## Plant Layout

Choose **Edit layout** to open the docked editor. The current system supports:

- Moving, resizing, rotating, renaming, hiding, locking, copying, and deleting scene objects
- Multi-selection with Shift/Ctrl/Command-click
- Collective color changes and grouped movement
- Hierarchical motion assemblies with a selectable parent and independently animated children
- Machines, cranes, A-frame carts and trucks, glass racks, rooms, team members, general boxes, and floor features
- Editable safety lines, utility trenches, drains, floor width, floor length, and floor position
- Editable appearance/disappearance stages and timeline stages
- Local-axis scene animation direction, pauses, speed, phase, and travel distance
- Layout import/export, undo/redo, browser persistence, and live Machine Design Studio synchronization

## Machine Design Studio

Open `/machine-studio` or `public/machine-studio.html`.

Typical workflow:

1. Duplicate the closest supplied design.
2. Open **Parts** and select a component.
3. Choose Select, Move, Rotate, Scale, or Pan.
4. Keep **Local** selected when editing a rotated part; switch to **World** for grid alignment.
5. Use the colored handles for visual edits and the inspector for exact values.
6. Merge related parts when they should stay connected. Select the intended motion parent last before merging, or change the merged item’s Attachment parent afterward.
7. Fit the design envelope around the finished machine.
8. Assign the design to one plant object or every matching object type.

Opening a plant object directly in Machine Design Studio creates or reuses a machine-linked design. Saved changes update that object in the Plant Layout using browser storage events and a same-origin broadcast channel.

## Timeline and animations

The project contains 18 initial construction stages. Timeline Studio can rename, insert, delete, reorder, and describe stages.

Scene and machine-part animations support:

- Back-and-forth movement
- Continuous loop movement
- Keyed X/Y/Z or all-axis timeline rotation with local pivot offsets
- Legacy continuous scene and part spin controls
- Vertical bob
- Axis-specific pulse
- Blink
- Adjustable amount, speed, pause duration, and phase

Attached scene objects retain their own animation settings while inheriting the motion of their parent and every ancestor. Parent motion is not incorrectly driven by child animation.

## Storage compatibility

- Plant layout key: `monroe-glass-plant-layout-v6`
- Plant layout schema: 6
- Machine design key: `monroe-glass-machine-designs-v1`
- Machine design payload: 6

The storage keys remain unchanged. Existing moved machines, added objects, custom designs, assignments, animations, floor features, floor dimensions, timeline edits, walls, and hidden pillars remain available when the updated project is opened from the same browser profile and website address.

Export the current layout JSON before a major update to create a portable backup.

## Run

Use Node.js 22.13 or newer:

For normal local revision and viewing on Windows, double-click:

```text
Start Plant Overview.bat
```

The launcher finds the per-user Node.js installation, installs dependencies on
the first run when needed, rebuilds the current source, opens
`http://127.0.0.1:4173`, and starts the optimized local server. Keep the command
window open while working and press `Ctrl+C` when finished. Restart the launcher
after changing source files so the optimized site is rebuilt. The server listens
only on this computer, so it does not require a Windows Firewall exception.

There is intentionally one Windows launcher. The development/HMR server was
removed from the normal workflow because its retained debugging runtime and
route reloads distort graphics performance after moving between Machine Design
Studio and the full production layout. The optimized launcher also applies a
Windows compatibility fix for vinext's generated asset cache before each build;
without it, the HTML can load while every generated CSS and JavaScript file
returns 404 and the page appears as unstyled text.

The local address is intentionally fixed at port `4173`, matching the standalone
`preview.html` workflow below. Because browser storage belongs to the origin
rather than the page path, the current site can reuse the layouts, machine
designs, backups, and rendering preferences previously saved by the preview.
Close the old Python preview server before using the launcher. Do not allow a
second server to move to another port. Export the layout JSON before moving
revisions between the local and published sites.

If an older `preview.html` still shows saved work that the current site cannot
see, transfer the complete browser workspace:

1. Open the preview where the saved work is visible.
2. Choose **Edit layout → Project → Export full workspace**.
3. Start the current site with `Start Plant Overview.bat`.
4. Choose **Edit layout → Project → Import full workspace** and select the
   downloaded workspace JSON.

The full workspace contains every `monroe-glass-` browser-storage entry,
including current and legacy layouts, automatic layout backups, custom machine
designs, and rendering preferences. The normal layout-only export remains
available for sharing just the plant layout.

Manual optimized startup:

```powershell
npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 4173
```

Standalone preview:

```powershell
py -m http.server 4173 --bind 127.0.0.1
```

Open:

- Plant Layout: `http://127.0.0.1:4173/public/preview.html`
- Machine Design Studio: `http://127.0.0.1:4173/public/machine-studio.html`

## Validation

```powershell
npm run validate:js
npm run validate:rendering
npm run validate:animations
npm run validate:floor
npm run validate:wheels
npm run validate:selection
npm run validate:motion-groups
npm run validate:designer
npm run validate:animation-timeline
npm run validate:editor-tabs
```

## Important files

- `public/plant-app.js` — plant rendering, timeline, layout editor, animations, floor features, and persistence
- `public/machine-design-studio.js` — machine component editor and timeline interface
- `public/animation-timeline.js` — shared clip normalization and timeline evaluation engine
- `public/machine-designs.js` — supplied component-based design presets
- `public/depth-scene-renderer.js` — shared WebGL depth renderer
- `public/plant-data.js` — normalized CAD footprint
- `cad/machine_registry.json` — baseline machine placements and evidence
- `cad/export_machine_registry.py` — regenerates `public/machine-data.js`
- `app/globals.css` — shared Plant Layout and Design Studio styling
- `docs/MACHINE_DESIGN_STUDIO.md` — detailed designer controls and workflow
- `docs/ANIMATION_TIMELINE.md` — part timeline clip types and settings
- `docs/EDITOR_PANELS.md` — tab organization for both editors
- `docs/MODEL_REFERENCES.md` — machine research and modeling references

## Scope

This project is intended for recognizable block models, planning, communication, and construction-progress visualization. It is not a substitute for surveyed as-built geometry, vendor CAD assemblies, certified clearances, structural calculations, or rigging plans.

## First-person rendering

Version 0.11.6 corrects first-person camera handedness and uses reciprocal perspective depth for opaque-surface occlusion. The change prevents geometry behind cabinets, machines, wheels, and walls from appearing through the foreground while keeping transparent glass intentional. Entering first person now faces the same general direction as the overview camera.
