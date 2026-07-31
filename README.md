# Monroe Glass Plant Evolution

Current project version: **0.9.0**

An interactive and editable 3D construction timeline for the Monroe, North Carolina glass plant. The horizontal plant geometry is grounded in the glass-production areas of:

`Monroe Archs w Updates 1-23-25 (002).dwg`

The application uses an in-browser WebGL depth renderer with a transparent Canvas 2D interface layer. Plant layouts and reusable machine designs are stored locally in the browser and can be exported as JSON backups.

## Version 0.9.0 highlights

### Complete scene-asset design library

Machine Design Studio now includes editable presets for the production machines and the supporting scene objects:

- Barefoot cutting line and filtration equipment
- Freestanding gantry cranes and overhead bridge cranes
- A-frame glass carts and the A-frame glass truck
- Raw-glass racks and general boxes
- Plant rooms and offices
- Team-member markers
- Waterjet, Kodiak, Denver, washer, furnace, FuseCube, wrapping, and shipping equipment

Opening an existing plant object in Machine Design Studio creates or reuses a linked design. Saved design changes continue to update that object in the Plant Layout automatically.

### Editable scene animations

The former hard-coded final-stage production motion is now represented by ordinary editable scene objects. Animation objects can be selected, moved, renamed, copied, hidden, deleted, or added again from the layout editor.

Included animation presets:

- Vertical glass moving continuously from left to right
- Material box moving back and forth
- Walking team member
- Shuttle glass cart
- Blinking status beacon

Each object can use loop, ping-pong, spin, bob, pulse, or blink motion with editable axis, distance, speed, and phase. Editing mode pauses animations at their base positions by default so placement remains predictable; **Preview motion** turns them back on while editing.

### Machine-part animation authoring

Machine Design Studio now has a compact **Part animation** section. A selected component can oscillate, loop, rotate, bob, pulse, or blink. Axis, amount, speed, and phase are editable, and the viewport has a Preview/Pause control. Animated custom designs play automatically when assigned to a plant object.

### Compatibility and preservation

- Plant layout storage remains `monroe-glass-plant-layout-v6` with schema 6.
- Machine design storage remains `monroe-glass-machine-designs-v1`; payload version advances to 4.
- Existing moved machines, added objects, custom designs, assignments, floor dimensions, timeline edits, walls, and hidden pillars remain available.
- Default production animations are inserted once for an older layout. After that, deleting them is permanent because the saved layout records that animation initialization has completed.

## Plant layout editor

Choose **Edit layout** to open the docked editor. On desktop the model remains visible beside the editor, including in browser full-screen mode.

### Navigation

- **Select & move**: drag an object to move it; drag empty floor to pan.
- **Navigate view**: drag to orbit.
- Shift-drag or Space-drag pans.
- Alt-drag or right-drag orbits while editing.
- Scroll zooms.
- **Focus selected** centers the camera on the current object.

### Object properties

Every editable object can have:

- Name and object type
- X/Z position and rotation
- Width, depth, and height
- Appearance and disappearance stages
- Color, visibility, label, and position lock
- Collision mode
- Built-in or component-based design preset
- Optional attached overhead crane

### Addable objects

- Photo-refined production machine presets
- Generic machine and general box
- A-frame glass cart
- A-frame glass truck
- Raw-glass rack and shipping rack
- Office or room
- Team-member marker
- Freestanding gantry crane
- Overhead bridge crane
- Moving vertical glass
- Moving material box
- Walking team member
- Shuttle glass cart
- Blinking status beacon

### Scene animation controls

Select an object and open **Object animation** to enable or disable motion, choose a motion type and axis, and set its amount, speed, and phase. **Pause animations** freezes every animated object at its editable base position. Animation objects use the same copy, paste, remove, lock, visibility, appearance-stage, and timeline controls as normal scene objects.

## Timeline studio

Choose **Edit timeline** or open **Edit layout → Timeline** to:

- Rename stages and timeline labels
- Edit phase, date, description, and detail chips
- Insert, delete, or reorder stages
- Assign object appearance and disappearance stages
- Scrub through the project
- Adjust autoplay speed

Object stage references are remapped when stages are inserted, removed, or reordered.

## Controls

| Control | Action |
|---|---|
| Drag | Orbit normally; move objects in Select & move mode |
| Drag empty floor while editing | Pan |
| Shift-drag or Space-drag | Pan |
| Alt-drag or right-drag | Orbit while editing |
| Mouse wheel | Zoom |
| `F` | Enter or exit model full screen |
| `Ctrl+C` / `Ctrl+V` | Copy / paste selected object |
| `Delete` or `Backspace` | Remove selected object or machine component |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` or `Ctrl+Shift+Z` | Redo |
| `Esc` | Leave layout edit mode |
| Left / Right Arrow | Previous / next timeline stage |

## Validation

Run the browser-script and rendering regression checks with:

```powershell
npm run validate:js
npm run validate:rendering
npm run validate:animations
```

The rendering regression test protects the docked editor canvas alignment and the single-volume pillar paint transition. The animation regression test verifies the expanded preset library, editable scene motions, machine-part animation controls, payload compatibility, and permanent removal behavior.

## Running the application

Use Node.js 22.13 or newer:

```powershell
npm ci
npm run dev
```

Then open the local address shown by the development server.

### Standalone previews

From the project root:

```powershell
py -m http.server 4173 --bind 127.0.0.1
```

Open:

- Plant layout: `http://127.0.0.1:4173/public/preview.html`
- Machine Design Studio: `http://127.0.0.1:4173/public/machine-studio.html`

## Important files

- `public/plant-data.js` — normalized CAD footprint
- `cad/machine_registry.json` — baseline machine placement and evidence
- `public/machine-data.js` — browser-ready registry generated from the JSON file
- `public/plant-app.js` — plant rendering, timeline, editor, collision tools, floor configuration, and persistence
- `public/machine-designs.js` — supplied component-based machine design presets
- `public/machine-design-studio.js` — dedicated machine design editor
- `app/machine-studio/page.tsx` — routed Machine Design Studio page
- `app/globals.css` — shared application styling
- `docs/MODEL_REFERENCES.md` — machine research and accuracy notes
- `docs/MACHINE_DESIGN_STUDIO.md` — machine component design guide

## Validation

Validate all browser JavaScript:

```powershell
npm run validate:js
```

Regenerate machine registry data:

```powershell
npm run export:machines
```

## Applying this update archive

Extract the versioned folder over the existing `plant-overview-site` project. Files that were not supplied remain untouched, including `.openai/hosting.json`, `build/sites-vite-plugin.ts`, `app/chatgpt-auth.ts`, the original `package-lock.json`, and other existing CAD utilities and public assets.

The original `package-lock.json` was not supplied, so this archive does not replace it. Run `npm install` in the normal development environment to update the lockfile, or provide the existing lockfile for a controlled update.

## Accuracy limits

The models are visual planning blocks, not engineering, foundation, clearance, rigging, or vendor installation drawings. Horizontal anchors are drawing-grounded where documented. Heights and detailed equipment profiles should be refined with surveyed dimensions and vendor drawings when available.


## v0.7.0 rendering update

The Machine Design Studio now subdivides large surfaces for more accurate depth ordering, removes hidden opaque back faces, and uses stable edge ordering. Roller beds use cylindrical rollers instead of rectangular bars. Wheel components expose independent width, height, and axle-depth dimensions, including axis-specific scaling. Existing saved designs are migrated automatically.


## Scene assets and animations

The layout editor treats animations as normal scene objects. Add them from **Edit layout → Objects → Add to the 3D model → Animations**. Each animation can be moved, resized, rotated, copied, hidden, removed, and assigned to timeline stages. Available starters include moving vertical glass, a material box, a walking team member, a shuttle cart, and a blinking status beacon.

Select any object to configure motion type, axis, travel amount, speed, and phase. The editor pauses animations while opening so objects can be positioned at their base coordinates; use **Preview animations** to test the result.

Machine Design Studio also supports part-level animation. Individual cabinets, beams, rollers, wheels, glass panels, and other parts can move, rotate, bob, pulse, or blink. Saved changes continue to update a live-linked machine in the Plant Layout.
