# Machine Part Animation Timeline

Machine Design Studio version 0.12.17 uses a docked, clip-based timeline for every editable machine part. A saved timeline travels with the reusable machine design and plays in both Machine Design Studio and the Plant Layout.

## Open the timeline

1. Select one part in the viewport or in the **Parts** tab.
2. Click **Animation** directly below **Pan** in the upper-left viewport tool rail. The `A` key toggles the same workspace.
3. The 3D viewport becomes shorter and the animation timeline opens across the bottom of the view.
4. Press Escape or use the close button in the timeline header to return to the full-height viewport.

The right inspector automatically switches to **Selected part → Animation** when a clip is selected.

## Add animation clips

Every animation type is shown in the right **Selected part → Animation** inspector while the bottom timeline is open.

- Click a type to append it after the current final clip using that animation type's preset duration.
- Drag a type onto the timeline to create it at an exact position.
- The new clip is selected immediately and its complete settings appear on the right.

Supported types:

- **Move once**
- **Back and forth**
- **Loop across path**
- **Four-step path**
- **Rotate**
- **Bob vertically**
- **Pulse size**
- **Split into rectangles**
- **Fade in**
- **Fade out**
- **Blink opacity**
- **Show / hide**
- **Wait / hold**

## Arrange and resize clips

The timeline starts at 0 seconds on the left and ends at 30 seconds on the right. It automatically grows in five-second increments when any clip extends past 30 seconds. The editing canvas scrolls horizontally and uses a fixed 44 pixels per second so mouse movement produces predictable timing changes.

- Sequential clips share a lane and read from left to right.
- Overlapping clips move to additional lanes automatically.
- Drag the selected clip body left or right to change its start time.
- Drag it in front of another clip to make it run earlier.
- Drag it after another clip to make it run later.
- Clips snap to the selected timeline step.
- Clips also snap to the beginning or end of nearby clips to make clean sequences easier to build.
- Select a clip to expose its orange resize handles.
- Drag the left handle to change the start while preserving the current end time.
- Drag the right handle to extend or shorten the duration.
- Extending the right handle pushes clips that originally began at or after that edge to the right by the same amount.
- Clips already overlapping the edited clip stay in place, and shortening a clip does not pull later clips left.
- Drag a clip body onto another clip to keep or create simultaneous playback on a separate lane.

Timeline snap choices range from 0.01 to 1.00 seconds. Clips remain sorted by start time after edits.

## Select and edit a clip

Clicking a clip switches the right inspector to that animation. The inspector contains the complete settings needed for the selected type:

- Name and enabled state
- Animation type
- Start time and duration
- Active motion or cycle time
- Forward-end and return-end pauses
- Pause after each cycle
- Repeat count
- Easing
- Phase offset
- Yoyo/reverse behavior
- Hold-final-value behavior
- Primary and secondary axes
- Distance or amount
- Rotation angle and local X/Y/Z pivot offsets
- Scale percentage
- Four independent path-corner pauses
- Minimum opacity and visible portion
- Visibility action
- Rectangular split minimum/maximum columns, rows, and depth layers
- Rectangular split spread axis, distance, rotation scatter, and random seed
- Fade-in and fade-out duration, easing, and hold-final-value behavior

Fields that do not apply to the selected animation type are hidden.

## Timeline-wide controls

The bottom workspace includes:

- Timeline enabled/disabled
- Loop the shared machine timeline
- Shared machine playback speed
- A read-only automatic span: 30 seconds minimum, expanding only when clips require it
- Timeline snap step
- Separate Play and Pause buttons
- Restart
- Draggable playhead and exact time readout

The span is not manually editable. Older saved span metadata is ignored, which repairs runaway values without changing any clip. The effective timeline automatically expands to include the final clip endpoint.

## Merged items

For a merged item, the target selector in the timeline header can edit:

- The entire merged assembly
- An individual child part

The attachment parent still carries the assembly. Child timelines play locally inside that moving assembly and may overlap the parent timeline.

## Compatibility

Older single-animation part settings are migrated into an equivalent first clip when the design is normalized. Existing clip timelines remain compatible. The local-storage key remains `monroe-glass-machine-designs-v1`. Version 0.12.14 introduced payload 17 for embedded-machine source metadata; version 0.12.15 keeps payload 17 because its placement and rendering fixes add no saved fields; version 0.12.16 also keeps payload 17 because its deeper Plant Overview transform-parity corrections add no saved fields.

## Version 0.12.16 Plant Overview transform parity

Plant Overview now evaluates and renders timeline transforms in the same order as Machine Design Studio. Combined pivot rotations are applied axis by axis, translations remain local to the source part orientation, and non-uniform scale axes are applied sequentially with the same current-center recalculation used by the Designer. Nested motion-driver transforms also preserve the nested group's own scale center before moving that group relative to the external driver pivot.

Geometry bounds used for animation pivots now match the Designer for every editable shape. Beam rotations no longer rotate authored endpoints and rotation fields at the same time, custom boxes compose part and machine rotations sequentially, wheels rotate in source-design coordinates before placement scaling, and roller beds use the full machine X/Y/Z transform. These changes keep embedded machines and deeply nested merged assemblies visually consistent between the Designer and Plant Overview.

## Version 0.12.15 Plant Layout animation parity

Plant Layout now derives animation pivots and grouped bounds from rotated component geometry using the same center conventions as Machine Design Studio. Wheels are treated as center-positioned geometry during inherited rotation and scale transforms, while roller beds and ordinary solids retain their existing coordinate semantics. This keeps nested and embedded-machine rotations, pivots, scale clips, and motion-driver inheritance visually aligned between the Designer and Plant Layout.

## Version 0.12.14 embedded-machine playback

Machines inserted through **Add saved machine** keep every source part's clip timeline. Those nested timelines use the destination design's one shared clock, loop span, and machine speed, so an embedded machine does not start a separate playback clock. Animating the embedded-machine wrapper applies an additional parent transform to the complete inserted assembly without replacing the child timelines.

## Version 0.12.13 animation reliability audit

The timeline evaluator now treats **Blink opacity** and **Show / hide → Toggle each cycle** as discrete state animations. They use raw cycle time rather than the selected easing curve, so Step easing cannot freeze them at the first state. Blink respects **Visible portion**, repeats on each cycle, and accepts a minimum opacity of `0` for a fully invisible off state. Visibility Toggle alternates once per cycle.

The animation regression suite now samples every published timeline type at meaningful points in its clip, including shared-clock playback, final-value holding, overlapping transforms, pivot rotation, deterministic rectangular splitting, fade sequencing, opacity blinking, visibility changes, and wait/hold no-op behavior.

## Version 0.12.12 shared clock and ripple editing

Every component timeline now evaluates against one machine-wide clock. A clip starting at 8 seconds on one part begins at the same machine time as a clip starting at 8 seconds on any other part, including deeply nested merged items. The ruler span is calculated from the latest clip endpoint anywhere in the design, and the Loop and Machine speed controls apply to the whole machine. Individual part timelines continue to own their own clips, names, types, durations, and overlap lanes.

Selecting a top-level item in the left Parts panel now resolves its effective animation target using the same recursive logic as viewport hit-testing. If the selected merged item has no local clips, the editor follows its configured motion-driver chain to the nested part or group that owns the visible animation.

Right-edge resizing now supports ripple editing. Extending a selected clip shifts later clips that originally began at or after the selected clip's old end. Existing overlaps are preserved, and dragging a clip body still allows clips to be stacked in separate lanes for simultaneous playback. Moving the right edge back left during the same drag restores downstream clips from the drag-start baseline instead of accumulating timing error.

## Version 0.12.11 nested merged-item timeline recognition

Canvas hit-testing now keeps the complete component path from the selected top-level item through every nested merged group to the visible child. Timeline lookup searches that hierarchy recursively and prefers the deepest clicked component with its own enabled animation.

When no clicked-path component owns an animation, the Designer follows each merged item's configured motion driver until it reaches the component whose timeline drives the assembly. This lets a click on any visible part of a nested merged object reveal the effective animation while keeping the top-level merged item selected for transforms. The timeline target picker contains all nested descendants, not only direct children.

## Version 0.12.10 rotation flip and nested merge ownership

Rotate clips keep the fixed-angle, easing, hold-final-value, and local pivot behavior from version 0.12.8. Use **Flip rotation animation** to multiply the selected angle by `-1`. This reverses the rotation on X, Y, or Z without introducing a separate direction property. The direction label beside the button reports whether the saved angle is currently forward or reverse.

Rotate clips saved by version 0.12.9 with its temporary `rotationDirection` property are normalized back into the signed `amount` value. A saved reverse clip therefore remains reversed after upgrading.

When parts are merged, the newly created outer merged item becomes the timeline target immediately. This reset is important when one selected part is itself a merged item: the old inner-group target is cleared before new clips can be added. Animations created after the merge therefore belong to the outer assembly and are not retained by the inner group if the outer assembly is later separated.

## Version 0.12.8 pivot rotation

**Rotate** is now a keyed transform rather than a continuous spin. The clip begins at 0 degrees, follows the selected easing curve over the clip duration, and reaches exactly the configured **Rotation angle**. Enable **Hold final value** to keep that final orientation after the clip ends. Rotate does not use cycle time, repeat count, cycle pause, phase, or yoyo controls.

The pivot is defined by local X, Y, and Z offsets from the selected part's center. Leave all three offsets at zero to rotate in place. Set an offset to make the part swing around a hinge, arm, shaft, or other point. The local pivot follows the part's base orientation, and the same saved rotation is reproduced in Machine Design Studio, Plant Layout, and merged motion-driver inheritance.

Timeline clips saved with the older internal `spin` type are normalized as Rotate clips. Their saved axis and degree amount are retained, but the amount is now the final target angle instead of degrees accumulated per cycle.

## Version 0.12.7 split direction, ranged columns, and fades

**Split into rectangles** now exposes a spread axis. X, Y, and Z constrain every fragment to the selected local part axis, including rotated parts; **All axes** retains the original three-dimensional random spread. Minimum and maximum column fields define an inclusive range from 1 through 8. The saved seed selects one stable count inside that range and continues to stabilize each fragment direction and rotation. Older clips that contain only the original `splitColumns` field are normalized as a fixed minimum and maximum with the original all-axis spread, so they do not change appearance.

**Fade in** starts at zero opacity and reaches the part's saved opacity over the clip duration. Before a scheduled fade-in begins, the part remains invisible. **Fade out** starts at the saved opacity and reaches zero. With **Hold final value** enabled, a fade-out stays invisible and a fade-in stays visible until a later fade clip or the timeline loop changes the state. Fade clips use the standard easing selector and can be sequenced to hide and later restore a part or merged assembly.

## Version 0.12.6 rectangular split animation

**Split into rectangles** converts the selected part into an even grid of rectangular fragments for the duration of the clip. Columns, rows, and depth layers determine the fragment count. Spread distance controls how far fragments travel, rotation scatter controls their independent rotation, and the random seed locks the pattern so it does not change from frame to frame or after reload.

Box-shaped parts retain their exact dimensions and orientation at the start of the split. Curved, beam, roller, wheel, and merged shapes use their rectangular design envelope while the split effect is active so every generated fragment remains an even rectangle. The same saved clip renders in Machine Design Studio and on linked custom machines in the Plant Layout.

## Version 0.12.5 workspace changes

The bottom timeline is taller and uses the full width of the 3D viewport. Animation types were moved to the right inspector, leaving the bottom area focused on the ruler, clip lanes, playhead, and playback controls. Selecting **Delete** in the inspector now removes the chosen clip from the actual saved part timeline; Delete or Backspace provides the same behavior while the timeline is active.
