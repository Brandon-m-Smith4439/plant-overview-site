# Monroe Glass Plant Evolution

**Current version: 0.7.0**

An interactive, editable 3D-style construction timeline for the Monroe, North Carolina glass plant. The horizontal plant geometry is grounded in the glass-production areas of:

`Monroe Archs w Updates 1-23-25 (002).dwg`

The application uses a lightweight canvas renderer, so the plant can be explored without a separate 3D engine. Plant layouts and machine designs are stored locally in the browser and can be exported as JSON backups.

## Version 0.7.0 highlights

### Corrected Machine Design Studio rendering

The designer now breaks large cabinet and platform faces into smaller depth-sorted surface sections. This prevents one oversized face from covering rollers, rails, controls, or frame members that are actually closer to the camera. Opaque components also skip hidden rear faces, while transparent panels retain two-sided rendering.

Additional rendering improvements:

- Outward face winding and camera-facing surface checks for stable hidden-surface behavior.
- Subdivided fills and subdivided edge segments instead of sorting one entire large face as a single unit.
- Deterministic ordering for nearly coplanar surfaces to reduce flashing and temporary de-rendering.
- Closed cylindrical roller geometry with circular end caps.
- Closed wheel geometry with independent width, height, and axle depth.
- Frontmost-face hit testing and transform controls preserved above the model.

### Independent wheel scaling

- Wheel width follows the local X scale handle.
- Wheel height follows the local Y scale handle.
- Wheel axle depth follows the local Z scale handle.
- The orange center handle still scales all three dimensions together.
- Existing wheel `size` values migrate automatically into the new dimensions.

The plant layout remains on schema 6 and the same browser storage keys are retained. Machine design payloads upgrade in place to version 3, preserving existing custom designs, assignments, moved objects, floor dimensions, timeline edits, walls, and hidden pillars.

### Existing capabilities retained

- Slicer-style Machine Design Studio workspace with left object browser, center viewport, and right inspector.
- Full-screen plant editing and docked layout controls.
- Resizable floor width, length, and center.
- Overlap detection and automatic object separation.
- A-frame carts and A-frame glass truck.
- Timeline editing, JSON import/export, undo/redo, snapping, and reusable machine presets.
- Correct pillar/machine occlusion using shared camera-depth ordering from version 0.5.1.

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
