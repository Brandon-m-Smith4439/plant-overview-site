# Editor Panel Organization

Version 0.12.2 reorganized the Plant Layout and Machine Design Studio panels so related controls are separated instead of requiring one long scroll. Version 0.12.3 moves the Designer animation timeline into a docked bottom workspace while keeping the selected clip settings in the right inspector. Version 0.12.4 adds a 30-second scrollable ruler, preset clip durations, chronological lanes, precise resize handles, and separate Play and Pause controls. Version 0.12.5 moves animation creation into the right inspector, enlarges the full-width bottom timeline, makes its span automatic, and repairs clip deletion. Version 0.12.6 adds seeded rectangular-fragment controls to the same clip inspector. Version 0.12.7 adds split-axis and ranged-column controls plus dedicated fade-in and fade-out clip types. Version 0.12.8 changes Rotate to a fixed-angle transform and adds local pivot-offset controls. Version 0.12.10 adds a one-click rotation flip and resets new merged-item timelines to the outer assembly so nested children do not receive clips accidentally. Version 0.12.11 makes nested timeline selection recursive and resolves the actual animation owner from the clicked merged-item path. Version 0.12.12 synchronizes all part timelines to one machine-wide clock, resolves animation owners from Parts-panel clicks, and adds right-edge ripple editing for later clips. Version 0.12.13 fixes Blink opacity and cycle visibility toggles by evaluating those discrete states independently of easing. Version 0.12.14 adds saved-machine insertion to the Designer Add panel so one reusable machine can be embedded inside another. Version 0.12.15 preserves embedded-machine design scale and aligns Plant Layout animation pivot/bounds math with the Designer. Version 0.12.16 completes the deeper Plant Overview transform-parity pass for nested groups, beams, boxes, wheels, roller beds, and inherited motion-driver scaling. Version 0.12.17 prevents native middle-mouse autoscroll from moving the surrounding page while middle-button panning either 3D viewport.

## Machine Design Studio left panel

- **Library** — search, create, duplicate, reset, delete, export, and import reusable designs.
- **Parts** — search, select, merge, separate, and reorder parts.
- **Add** — add boxes, cylinders, beams, glass panels, additional shapes, or another saved machine as one embedded assembly.
- **Plant** — assign the design to an existing Plant Layout object or create a new linked machine.

## Machine Design Studio right panel

The top level remains **Selected part** and **Machine**. Selected-part controls are now divided into:

- **Properties** — name, shape, color, visibility, and opacity.
- **Transform** — position, rotation, scaling, dimensions, and beam endpoints.
- **Animation** — target selection, visual timeline, clip list, playback controls, and clip settings.

## Plant Layout right panel

The top level now contains:

- **Objects** — machine and floor-feature editing.
- **Structure** — floor dimensions, columns, pillars, and wall sections.
- **Stages** — construction-stage content and ordering.
- **Project** — layout import, export, and reset.

The Objects section is divided into:

- **Select** — object search, selection, attachments, navigation, and nudging.
- **Transform** — exact dimensions, position, rotation, scale, design assignment, visibility, and type-specific geometry.
- **Animation** — Plant Layout object motion and animation preview controls.
- **Add** — designer-created machines, standard objects, floor features, and copy/paste/delete actions.

A persistent **Done editing** bar remains available at the bottom of the Plant Layout panel.
