# Monroe Glass Plant Evolution

Current project version: **0.10.1**

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
- X/Y/Z or all-axis spin
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

```powershell
npm ci
npm run dev
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
```

## Important files

- `public/plant-app.js` — plant rendering, timeline, layout editor, animations, floor features, and persistence
- `public/machine-design-studio.js` — machine component editor
- `public/machine-designs.js` — supplied component-based design presets
- `public/depth-scene-renderer.js` — shared WebGL depth renderer
- `public/plant-data.js` — normalized CAD footprint
- `cad/machine_registry.json` — baseline machine placements and evidence
- `cad/export_machine_registry.py` — regenerates `public/machine-data.js`
- `app/globals.css` — shared Plant Layout and Design Studio styling
- `docs/MACHINE_DESIGN_STUDIO.md` — detailed designer controls and workflow
- `docs/MODEL_REFERENCES.md` — machine research and modeling references

## Scope

This project is intended for recognizable block models, planning, communication, and construction-progress visualization. It is not a substitute for surveyed as-built geometry, vendor CAD assemblies, certified clearances, structural calculations, or rigging plans.
