/* eslint-disable @next/next/no-html-link-for-pages */
import LegacyScriptLoader from "../legacy-script-loader";
import { EditorAccessGate } from "../editor-access-gate";

export const metadata = {
  title: "Machine Design Studio Â· Monroe Glass Plant Evolution",
  robots: { index: false, follow: false, noarchive: true },
};

export default function MachineStudio() {
  return <>
<section className="studio-desktop-only-notice" aria-label="Desktop required">
<strong>Machine Design Studio is desktop-only.</strong>
<p>Open this editor on a desktop or laptop for the full precision editing workspace.</p>
<a href="/">Return to Plant Evolution</a>
</section>
<EditorAccessGate>
<main className="machine-studio-shell">
<header className="studio-topbar">
<div className="studio-brand">
<a className="studio-back-link" href="/" aria-label="Return to plant layout">â†</a>
<div><p>Monroe Glass Plant</p><h1>Machine Design Studio</h1></div>
<span className="studio-version-badge">v0.13.9</span>
</div>
<div className="studio-top-actions" role="toolbar" aria-label="Design commands">
<span id="save-state" className="studio-save-state">Auto-saved</span>
<button id="undo-design" type="button" title="Undo (Ctrl+Z)" aria-label="Undo">â†¶</button>
<button id="redo-design" type="button" title="Redo (Ctrl+Y)" aria-label="Redo">â†·</button>
<span className="studio-toolbar-divider"></span>
<button id="save-design" type="button" title="Save machine (Ctrl+S)">Save</button>
<button id="save-design-as" type="button" title="Save as a new reusable machine (Ctrl+Shift+S)">Save as...</button>
<button id="save-and-place-design" type="button" className="primary">Save &amp; add to layout</button>
<a href="/" className="studio-layout-link">Open plant layout</a>
</div>
</header>
<section className="machine-studio-workspace" aria-label="Machine design editor">
<aside className="studio-browser-panel">
<div className="studio-tabs studio-browser-tabs" role="tablist" aria-label="Design browser">
<button type="button" role="tab" data-browser-tab="designs" className="active" aria-selected="true">Machines</button>
<button type="button" role="tab" data-browser-tab="parts" aria-selected="false">Parts</button>
<button type="button" role="tab" data-browser-tab="add" aria-selected="false">Build</button>
<button type="button" role="tab" data-browser-tab="plant" aria-selected="false">Place</button>
</div>
<section data-browser-panel="designs" className="studio-browser-section">
<div className="studio-workflow-guide" aria-label="Machine creation workflow"><span><b>1</b> Build</span><span><b>2</b> Save</span><span><b>3</b> Place</span></div>
<div className="studio-panel-heading"><p>Design library</p><strong id="design-count">0 designs</strong></div>
<label className="studio-field studio-search-field">Search<input id="design-search" type="search" placeholder="Machine name or type" /></label>
<div id="design-list" className="design-list" aria-label="Available machine designs"></div>
<div className="design-library-primary-actions" aria-label="Selected machine actions">
<button id="new-design" type="button" className="library-action library-action-new"><span aria-hidden="true">+</span>New machine</button>
<button id="duplicate-design" type="button" className="library-action library-action-copy">Save a copy...</button>
<button id="delete-design" type="button" className="library-action library-action-delete danger-subtle">Delete machine</button>
</div>
<details className="studio-collapsible">
<summary>More design actions</summary>
<div className="studio-button-grid">
<button id="reset-design" type="button">Reset selected preset</button>
</div>
<div className="studio-button-grid compact">
<button id="export-design" type="button">Export JSON</button><button id="import-design" type="button">Import JSON</button>
<input id="import-design-file" type="file" accept="application/json,.json" hidden />
</div>
<div className="studio-button-grid compact studio-3mf-actions">
<select id="design-3mf-scale" aria-label="3MF print scale" defaultValue="12"><option value="12">3MF 1:12</option><option value="24">3MF 1:24</option><option value="50">3MF 1:50</option><option value="100">3MF 1:100</option></select>
<button id="export-design-3mf" type="button">Export color 3MF</button>
</div>
</details>
</section>
<section data-browser-panel="parts" className="studio-browser-section" hidden>
<div className="studio-panel-heading"><p>Machine parts</p><strong id="component-count">0 parts</strong></div>
<div className="parts-quick-actions">
<button id="select-all-components" type="button" title="Select every part (Ctrl+A)">Select all</button>
<button id="duplicate-component" type="button" title="Duplicate selected parts (Ctrl+D)">Duplicate</button>
<button id="copy-component" type="button" title="Copy selected parts (Ctrl+C)">Copy</button>
<button id="cut-component" type="button" title="Cut selected parts (Ctrl+X)">Cut</button>
<button id="paste-component" type="button" title="Paste copied parts (Ctrl+V)">Paste</button>
<button id="delete-component" type="button" title="Delete selected parts">Delete</button>
<button id="merge-components" type="button" disabled>Merge</button>
<button id="ungroup-component" type="button" disabled>Separate</button>
</div>
<label className="studio-field studio-search-field">Search<input id="component-search" type="search" placeholder="Part name or shape" /></label>
<div id="component-list" className="component-list" aria-label="Machine design components"></div>
<details className="studio-collapsible compact-actions" open>
<summary>Part order</summary>
<div className="parts-order-actions"><button id="move-component-up" type="button">Move up</button><button id="move-component-down" type="button">Move down</button></div>
</details>
</section>
<section data-browser-panel="add" className="studio-browser-section" hidden>
<div className="studio-panel-heading"><p>Add machine parts</p><span>Placed near center</span></div>
<p className="studio-help">Choose a shape, add it to the current machine, then use the Transform tab on the right to place and size it.</p>
<section className="component-add-panel expanded-add-panel">
<div className="shape-quick-grid" aria-label="Common shapes">
<button type="button" data-add-component="box"><span>â–£</span>Box</button>
<button type="button" data-add-component="cylinder"><span>â—</span>Cylinder</button>
<button type="button" data-add-component="beam"><span>â•±</span>Beam</button>
<button type="button" data-add-component="glassPanel"><span>â—‡</span>Glass</button>
<button type="button" data-add-component="text"><span>T</span>Text</button>
</div>
<div className="shape-picker-row vertical-shape-picker">
<label className="studio-field">Additional shape
                <select id="add-component-type" aria-label="Additional shape">
<optgroup label="Solid shapes">
<option value="sphere">Sphere / ellipsoid</option>
<option value="cone">Cone / hopper</option>
<option value="wedge">Wedge / ramp</option>
</optgroup>
<optgroup label="Machine parts">
<option value="rollerBed">Roller bed</option>
<option value="wheel">Wheel / caster</option>
<option value="text">Text label / sign</option>
</optgroup>
</select>
</label>
<button id="add-component-button" type="button" className="primary full-width-button">Add selected shape</button>
</div>
</section>
<section className="component-add-panel embedded-machine-add-panel" aria-labelledby="add-saved-machine-heading">
<div className="studio-panel-heading"><p id="add-saved-machine-heading">Add saved machine</p><span>Reusable assembly</span></div>
<p className="studio-help">Insert another saved machine design as one editable object. Its internal parts and animations are preserved and run on this machine&apos;s shared timeline.</p>
<label className="studio-field">Machine design<select id="add-machine-design" aria-label="Saved machine design"></select></label>
<button id="add-machine-design-button" type="button" className="primary full-width-button">Add machine to current design</button>
<p id="add-machine-design-status" className="studio-help">Choose another saved machine design.</p>
</section>
<div className="studio-callout"><strong>Animation-ready parts</strong><p>After adding a part or machine, select it and open the Animation tab on the right to build its clip timeline.</p></div>
</section>
<section data-browser-panel="plant" className="studio-browser-section assignment-panel" hidden>
<div className="studio-panel-heading"><p>Use in plant layout</p><span>Live-linked</span></div>
<label className="studio-field">Plant object<select id="machine-assignment"><option value="">Choose a machineâ€¦</option></select></label>
<label className="studio-field">Design sizing<select id="assignment-scale-mode">
<option value="preserve">Preserve proportions Â· recommended</option>
<option value="match">Match dimensions Â· keep synced</option>
<option value="stretch">Stretch to plant object</option>
</select></label>
<section className="create-plant-machine-panel" aria-labelledby="create-plant-machine-heading">
<div className="studio-panel-heading"><p id="create-plant-machine-heading">Create a new plant machine</p><span>Uses this design</span></div>
<p className="studio-help">Create a separate Plant Layout object from the current reusable design. The new object remains linked to this design for future edits.</p>
<label className="studio-field">Machine name<input id="new-plant-machine-name" type="text" placeholder="Defaults to the design name" /></label>
<div className="create-machine-options">
<label className="studio-field">Appearance stage<select id="new-plant-machine-stage"><option value="last">Plant today</option></select></label>
<label className="studio-field">Placement<select id="new-plant-machine-placement"><option value="auto">Find open floor space</option><option value="center">Floor center</option><option value="origin">Plant origin</option></select></label>
</div>
<button id="create-plant-machine" type="button" className="primary full-width-button">Save &amp; add machine to Plant Layout</button>
<button id="open-created-plant-machine" type="button" className="full-width-button success-action" hidden>Open and position this machine</button>
<p id="create-plant-machine-status" className="studio-help">The design envelope becomes the new machineâ€™s starting dimensions.</p>
</section>
<button id="sync-machine-dimensions" type="button" className="full-width-button">Match plant dimensions to this design</button>
<details className="plant-instance-transform">
<summary>Plant instance transform</summary>
<p className="studio-help">These values edit the selected object in the Plant Layout and stay synchronized between pages.</p>
<div className="transform-subheading">Position (ft)</div><div className="axis-fields"><label className="axis-x-field">X<input data-instance-field="x" type="number" step="0.1" /></label><label className="axis-y-field">Y<input data-instance-field="y" type="number" step="0.1" /></label><label className="axis-z-field">Z<input data-instance-field="z" type="number" step="0.1" /></label></div>
<div className="transform-subheading">Rotation (degrees)</div><div className="axis-fields"><label className="axis-x-field">X<input data-instance-field="rotationX" type="number" step="1" /></label><label className="axis-y-field">Y<input data-instance-field="rotationY" type="number" step="1" /></label><label className="axis-z-field">Z<input data-instance-field="rotationZ" type="number" step="1" /></label></div>
<div className="transform-subheading">Final dimensions (ft)</div><div className="axis-fields"><label className="axis-x-field">Width<input data-instance-field="w" type="number" min="0.01" step="0.01" /></label><label className="axis-y-field">Height<input data-instance-field="h" type="number" min="0.01" step="0.01" /></label><label className="axis-z-field">Depth<input data-instance-field="d" type="number" min="0.01" step="0.01" /></label></div>
<div className="transform-subheading">Scale (%)</div><div className="axis-fields four"><label>All<input data-instance-scale="uniform" type="number" min="1" max="10000" step="1" /></label><label className="axis-x-field">X<input data-instance-scale="x" type="number" min="1" max="10000" step="1" /></label><label className="axis-y-field">Y<input data-instance-scale="y" type="number" min="1" max="10000" step="1" /></label><label className="axis-z-field">Z<input data-instance-scale="z" type="number" min="1" max="10000" step="1" /></label></div>
</details>
<div className="assignment-actions">
<button id="apply-machine" type="button" className="primary">Apply to object</button>
<button id="apply-type" type="button">Apply to matching type</button>
<button id="clear-machine-design" type="button">Use built-in model</button>
</div>
<p id="assignment-status" className="studio-help">Assignments save directly to the plant layout stored in this browser.</p>
</section>
</aside>
<section className="design-viewport-panel">
<div className="viewport-commandbar">
<div className="viewport-control-group viewport-camera-group">
<span className="viewport-control-label">Camera</span>
<div role="group" aria-label="Camera views" className="view-buttons">
<button type="button" data-design-view="iso" className="active" title="Isometric view (0)">Iso</button>
<button type="button" data-design-view="front" title="Front view (1)">Front</button>
<button type="button" data-design-view="side" title="Right view (2)">Right</button>
<button type="button" data-design-view="top" title="Top view (3)">Top</button>
<button type="button" data-design-view="fit" title="Fit model (F)">Fit</button>
</div>
</div>
<div className="viewport-settings">
<div className="viewport-control-group viewport-axes-group">
<span className="viewport-control-label">Transform axes</span>
<div className="transform-space-toggle" role="group" aria-label="Transform orientation">
<button type="button" data-transform-space="local" className="active" aria-pressed="true" title="Follow the selected part">Local</button>
<button type="button" data-transform-space="world" aria-pressed="false" title="Follow the design grid">World</button>
</div>
</div>
<div className="viewport-control-group viewport-motion-group">
<span className="viewport-control-label">Motion preview</span>
<button id="preview-design-animations" type="button" className="active">Pause animations</button>
</div>
<div className="viewport-control-group viewport-snap-group">
<span className="viewport-control-label">Gizmo snapping</span>
<div className="snap-controls">
<label className="studio-switch"><input id="snap-enabled" type="checkbox" defaultChecked /><span>Snap</span></label>
<label className="snap-step-control"><span>Step</span><select id="snap-step" defaultValue="0.1"><option value="0.01">0.01</option><option value="0.025">0.025</option><option value="0.05">0.05</option><option value="0.075">0.075</option><option value="0.1">0.1</option><option value="0.25">0.25</option><option value="0.5">0.5</option><option value="1">1.0</option><option value="2">2.0</option></select></label>
<span id="snap-step-summary" className="snap-step-summary">0.1 ft / 0.1 deg / 0.1%</span>
</div>
</div>
</div>
</div>
<div className="viewport-toolrail" role="toolbar" aria-label="Transform tools">
<button type="button" data-design-mode="select" className="active" title="Select (V)"><span>â†–</span><small>Select</small></button>
<button type="button" data-design-mode="move" title="Move (M)"><span>âœ£</span><small>Move</small></button>
<button type="button" data-design-mode="rotate" title="Rotate (R)"><span>âŸ³</span><small>Rotate</small></button>
<button type="button" data-design-mode="scale" title="Scale (S)"><span>â¤¢</span><small>Scale</small></button>
<button type="button" data-design-mode="pan" title="Pan view (H)"><span>âœ‹</span><small>Pan</small></button>
<button id="toggle-animation-timeline" type="button" className="animation-tool-button" title="Animation timeline (A)" aria-pressed="false"><span>â—†</span><small>Animation</small></button>
</div>
<canvas id="machine-design-canvas" aria-label="Interactive 3D preview of the selected machine design"></canvas>
<section id="animation-timeline-workspace" className="animation-timeline-workspace animation-timeline-card" hidden aria-label="Part animation timeline">
<header className="timeline-workspace-header">
<div className="timeline-workspace-title"><strong>Animation timeline</strong><span id="timeline-summary">0 clips</span></div>
<label className="timeline-target-control">Target<select id="timeline-target-picker" aria-label="Animation target"></select></label>
<div className="timeline-play-actions"><button id="timeline-restart" type="button" title="Restart from 0 seconds">â†º Restart</button><button id="timeline-play" type="button" className="primary" title="Play animation preview">â–¶ Play</button><button id="timeline-pause" type="button" title="Pause animation preview">â…¡ Pause</button><button id="close-animation-timeline" type="button" title="Close timeline">Ã—</button></div>
</header>
<div className="timeline-workspace-body">
<div className="timeline-workspace-main">
<div className="timeline-master-settings timeline-master-bar">
<label className="studio-switch"><input id="timeline-enabled" type="checkbox" defaultChecked /><span>Enabled</span></label>
<label className="studio-switch"><input id="timeline-loop" type="checkbox" defaultChecked /><span>Loop machine</span></label>
<label className="studio-field">Machine speed<input id="timeline-playback-rate" type="number" min="0" max="20" step="0.05" defaultValue="1" /></label>
<label className="studio-field">Timeline span<input id="timeline-duration" type="number" min="30" step="5" defaultValue="30" readOnly aria-readonly="true" /><small>Shared Â· expands to fit every part</small></label>
<label className="studio-field">Snap<select id="timeline-snap-step" defaultValue="0.05"><option value="0.01">0.01s</option><option value="0.05">0.05s</option><option value="0.1">0.10s</option><option value="0.25">0.25s</option><option value="0.5">0.50s</option><option value="1">1.00s</option></select></label>
</div>
<div className="timeline-ruler-wrap timeline-dock-ruler"><div id="timeline-scroll-viewport" className="timeline-scroll-viewport"><div id="timeline-scroll-canvas" className="timeline-scroll-canvas"><div className="timeline-ruler-scale" id="timeline-ruler-scale"></div><div id="timeline-ruler-tracks" className="timeline-ruler-tracks" aria-label="Animation clips"></div></div></div><input id="timeline-playhead" className="timeline-playhead" type="range" min="0" max="30" step="0.01" defaultValue="0" aria-label="Animation playhead" /><div className="timeline-time-readout"><span id="timeline-time-label">0.00s / 30.00s</span><span>Start â† left Â· right â†’ end Â· extending a right edge pushes later clips; dragging a clip can overlap it</span></div></div>
</div>
</div>
<p id="timeline-target-help" className="timeline-workspace-help">Select one machine part, then add or drag an animation type onto the timeline.</p>
</section>

<div className="viewport-statusbar"><span id="active-tool-label"><strong>Select</strong> Â· Click a part to select it</span><span>Ctrl+left-drag box select Â· Right-drag orbit Â· Middle-drag pan Â· Wheel zoom Â· <span id="designer-camera-position">Above floor Â· full orbit enabled</span></span></div>
<div id="design-toast" className="design-toast" role="status" aria-live="polite"></div>
</section>
<aside className="studio-inspector-panel">
<div className="studio-tabs inspector-tabs" role="tablist" aria-label="Inspector">
<button type="button" role="tab" data-inspector-tab="object" className="active" aria-selected="true">Selected part</button>
<button type="button" role="tab" data-inspector-tab="design" aria-selected="false">Machine</button>
</div>
<section data-inspector-panel="object" className="studio-inspector-section">
<div className="studio-panel-heading"><p>Selection</p><span id="selected-component-type">Nothing selected</span></div>
<div id="empty-component-state" className="inspector-empty"><strong>Select a part in the viewport or Parts list.</strong><p>Choose a section below after selecting a part.</p></div>
<section id="component-properties" className="component-properties" hidden>
<div className="part-section-tabs" role="tablist" aria-label="Selected part editing sections">
<button type="button" role="tab" data-part-tab="properties" className="active" aria-selected="true">Properties</button>
<button type="button" role="tab" data-part-tab="transform" aria-selected="false">Transform</button>
<button type="button" role="tab" data-part-tab="animation" aria-selected="false">Animation</button>
</div>
<section data-part-panel="properties" className="part-editor-panel">
<div className="inspector-primary-card">
<label className="studio-field">Part name<input data-component-field="name" type="text" /></label>
<div className="inspector-row two"><label className="studio-field">Shape<select data-component-field="type"><option value="box">Box</option><option value="cylinder">Cylinder</option><option value="sphere">Sphere</option><option value="cone">Cone</option><option value="wedge">Wedge</option><option value="glassPanel">Glass panel</option><option value="beam">Beam</option><option value="rollerBed">Roller bed</option><option value="wheel">Wheel</option><option value="text">Text label</option><option value="group">Merged item</option></select></label><label className="studio-field">Color<input data-component-field="color" type="color" /></label></div>
<div data-for-component="text" className="inspector-row two"><label className="studio-field">Label text<input data-component-field="text" type="text" maxLength={120} /></label><label className="studio-field">Text color<input data-component-field="textColor" type="color" /></label></div>
<div className="visibility-row"><label className="studio-switch"><input data-component-check="visible" type="checkbox" /><span>Visible</span></label><label className="studio-field compact-field">Opacity<input data-component-field="opacity" type="number" min="0.05" max="1" step="0.05" /></label></div>
</div>
<div className="studio-callout"><strong>Part workflow</strong><p>Use Transform for exact position, rotation, scale, and dimensions. Use Animation to build one or more timed clips for this part.</p></div>
</section>
<section data-part-panel="transform" className="part-editor-panel" hidden>
<details className="transform-section" open><summary>Position, rotation, and scale</summary>
<div className="transform-subheading">Position</div><div className="axis-fields"><label className="axis-x-field">X<input data-component-field="x" type="number" step="0.1" /></label><label className="axis-y-field">Y<input data-component-field="y" type="number" step="0.1" /></label><label className="axis-z-field">Z<input data-component-field="z" type="number" step="0.1" /></label></div>
<div className="transform-subheading">Rotation</div><div className="axis-fields rotation-axis-fields"><label className="axis-x-field">X<input data-component-field="rotationX" type="number" step="1" /></label><label className="axis-y-field">Y<input data-component-field="rotationY" type="number" step="1" /></label><label className="axis-z-field">Z<input data-component-field="rotationZ" type="number" step="1" /></label></div>
<div className="rotation-row rotation-actions"><label className="studio-field rotation-axis-picker">Quick axis<select id="rotation-axis" defaultValue="y"><option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select></label><button id="rotate-negative" type="button">âˆ’90Â°</button><button id="rotate-positive" type="button">+90Â°</button><button id="reset-rotation" type="button">Reset</button></div>
<div className="transform-subheading">Scale (%)</div><div className="axis-fields four"><label>All<input data-component-scale="uniform" type="number" min="1" max="10000" step="1" /></label><label className="axis-x-field">X<input data-component-scale="x" type="number" min="1" max="10000" step="1" /></label><label className="axis-y-field">Y<input data-component-scale="y" type="number" min="1" max="10000" step="1" /></label><label className="axis-z-field">Z<input data-component-scale="z" type="number" min="1" max="10000" step="1" /></label></div>
<div className="transform-subheading">Mirror</div><div className="mirror-actions" role="group" aria-label="Mirror selected parts"><button type="button" data-mirror-component="x">Mirror X</button><button type="button" data-mirror-component="y">Mirror Y</button><button type="button" data-mirror-component="z">Mirror Z</button></div>
<button id="center-component" type="button" className="full-width-button">Center on machine</button>
</details>
<details className="transform-section" open><summary>Dimensions</summary>
<div className="axis-fields size-fields">
<label data-for-component="box cylinder sphere cone wedge glassPanel rollerBed wheel text" className="axis-x-field">Width<input data-component-field="w" type="number" min="0.01" step="0.01" /></label>
<label data-for-component="box cylinder sphere cone wedge glassPanel wheel text" className="axis-y-field">Height<input data-component-field="h" type="number" min="0.01" step="0.01" /></label>
<label data-for-component="box cylinder sphere cone wedge glassPanel rollerBed wheel text" className="axis-z-field">Depth<input data-component-field="d" type="number" min="0.01" step="0.01" /></label>
<label data-for-component="beam" className="axis-x-field">Beam length<input data-component-field="length" type="number" min="0.01" step="0.01" /></label><label data-for-component="beam" className="axis-y-field">Beam height<input data-component-field="thicknessY" type="number" min="0.01" step="0.01" /></label>
<label data-for-component="beam" className="axis-z-field">Beam width<input data-component-field="thicknessZ" type="number" min="0.01" step="0.01" /></label>
<label data-for-component="rollerBed">Roller diameter<input data-component-field="thickness" type="number" min="0.01" step="0.01" /></label>
<label data-for-component="rollerBed">Roller count<input data-component-field="count" type="number" min="2" step="1" /></label>
<label data-for-component="cylinder sphere cone">Smoothness<input data-component-field="segments" type="number" min="8" max="48" step="1" /></label>
</div>
<p className="transform-help"><strong>Local scaling:</strong> X changes length/width, Y changes height, and Z changes depth. Beam X changes its length while Y and Z change its rectangular cross-section.</p>
</details>
<details className="transform-section part-envelope-panel"><summary>Individual part envelope / hitbox</summary>
<p id="component-envelope-status" className="transform-help">Add an independent collision envelope to this part, then edit its exact position and size.</p>
<div className="axis-fields"><label className="axis-x-field">X<input data-component-envelope-field="x" type="number" step="0.01" /></label><label className="axis-y-field">Y<input data-component-envelope-field="y" type="number" step="0.01" /></label><label className="axis-z-field">Z<input data-component-envelope-field="z" type="number" step="0.01" /></label></div>
<div className="axis-fields size-fields"><label className="axis-x-field">Width<input data-component-envelope-field="w" type="number" min="0.01" step="0.01" /></label><label className="axis-y-field">Height<input data-component-envelope-field="h" type="number" min="0.01" step="0.01" /></label><label className="axis-z-field">Depth<input data-component-envelope-field="d" type="number" min="0.01" step="0.01" /></label></div>
<div className="envelope-part-actions"><button id="fit-component-envelope" type="button">Add / tight fit to part</button><button id="remove-component-envelope" type="button" className="danger-subtle">Remove part envelope</button></div>
</details>
<details className="transform-section" data-for-component="beam"><summary>Beam endpoints</summary><div className="axis-fields"><label className="axis-x-field">End X<input data-component-field="x2" type="number" step="0.1" /></label><label className="axis-y-field">End Y<input data-component-field="y2" type="number" step="0.1" /></label><label className="axis-z-field">End Z<input data-component-field="z2" type="number" step="0.1" /></label></div></details>
</section>
<section data-part-panel="animation" className="part-editor-panel part-animation-panel" hidden>
<div className="timeline-inspector-intro"><div><strong>Animation clip settings</strong><p>Add an animation below, then select its clip in the bottom timeline to edit every setting.</p></div><button id="open-animation-timeline-panel" type="button" className="primary">Open timeline</button></div>
<section className="timeline-inspector-library" aria-label="Animation types"><div className="timeline-inspector-library-heading"><strong>Add animation</strong><small>Click to append after the last clip, or drag a type onto an exact timeline position.</small></div><div id="timeline-type-palette" className="timeline-type-buttons timeline-inspector-type-buttons"></div></section>
<div id="timeline-empty" className="inspector-empty compact"><strong>No animation clip selected.</strong><p>Add an animation above, or click an existing clip in the bottom timeline.</p></div>
<section id="timeline-clip-editor" className="timeline-clip-editor" hidden>
<div className="timeline-clip-heading"><div><strong>Selected animation</strong><span id="timeline-clip-description"></span></div><div><button id="timeline-duplicate-clip" type="button">Duplicate</button><button id="timeline-delete-clip" type="button" className="danger-subtle">Delete</button></div></div>
<div className="timeline-clip-grid">
<label className="studio-field wide">Clip name<input data-timeline-clip-field="name" type="text" /></label>
<label className="studio-field">Animation type<select data-timeline-clip-field="type"></select></label>
<label className="studio-switch clip-enabled-switch"><input data-timeline-clip-check="enabled" type="checkbox" /><span>Clip enabled</span></label>
<label className="studio-field">Start (sec)<input data-timeline-clip-field="start" type="number" min="0" step="0.05" /></label>
<label className="studio-field">Duration (sec)<input data-timeline-clip-field="duration" type="number" min="0.05" step="0.05" /></label>
<label className="studio-field" data-timeline-for="oscillate loop fourStep bob pulse blink visibility">Motion time / cycle (sec)<input data-timeline-clip-field="cycleSeconds" type="number" min="0.05" step="0.05" /></label>
<label className="studio-field" data-timeline-for="oscillate">Pause at forward end (sec)<input data-timeline-clip-field="pauseAtPositive" type="number" min="0" step="0.05" /></label>
<label className="studio-field" data-timeline-for="oscillate">Pause at return end (sec)<input data-timeline-clip-field="pauseAtNegative" type="number" min="0" step="0.05" /></label>
<label className="studio-field" data-timeline-for="loop bob pulse blink visibility">Pause after cycle (sec)<input data-timeline-clip-field="cyclePause" type="number" min="0" step="0.05" /></label>
<label className="studio-field" data-timeline-for="oscillate loop bob pulse blink visibility">Repeat count<input data-timeline-clip-field="repeatCount" type="number" min="0" step="1" /><small>0 fills the clip</small></label>
<label className="studio-field">Easing<select data-timeline-clip-field="easing"><option value="linear">Linear</option><option value="easeIn">Ease in</option><option value="easeOut">Ease out</option><option value="easeInOut">Ease in/out</option><option value="smooth">Smooth step</option><option value="step">Step at end</option></select></label>
<label className="studio-field" data-timeline-for="oscillate loop fourStep bob pulse blink visibility">Phase (degrees)<input data-timeline-clip-field="phase" type="number" step="5" /></label>
<label className="studio-switch" data-timeline-for="oscillate loop bob pulse blink visibility"><input data-timeline-clip-check="yoyo" type="checkbox" /><span>Reverse every other cycle</span></label>
<label className="studio-switch"><input data-timeline-clip-check="holdEnd" type="checkbox" /><span>Hold final value</span></label>
</div>
<details className="transform-section timeline-motion-settings" data-timeline-for="move oscillate loop fourStep rotate bob pulse splitRectangles blink visibility" open><summary>Motion settings</summary>
<div className="timeline-clip-grid">
<label className="studio-field" data-timeline-for="move oscillate loop fourStep rotate pulse splitRectangles"><span id="timeline-axis-label">Axis</span><select data-timeline-clip-field="axis"><option value="x">X</option><option value="y">Y</option><option value="z">Z</option><option value="all">All axes</option></select></label>
<label className="studio-field" data-timeline-for="move oscillate loop fourStep rotate bob pulse splitRectangles"><span id="timeline-amount-label">Distance / amount</span><input data-timeline-clip-field="amount" type="number" step="0.1" /></label>
<div className="timeline-rotation-flip wide" data-timeline-for="rotate"><button id="timeline-flip-rotation" type="button">Flip rotation animation</button><small id="timeline-rotation-direction">Current direction: forward (+)</small></div>
<label className="studio-field" data-timeline-for="rotate">Pivot offset X (ft)<input data-timeline-clip-field="rotationPivotX" type="number" step="0.1" /><small>Measured from the part center in local coordinates</small></label>
<label className="studio-field" data-timeline-for="rotate">Pivot offset Y (ft)<input data-timeline-clip-field="rotationPivotY" type="number" step="0.1" /></label>
<label className="studio-field" data-timeline-for="rotate">Pivot offset Z (ft)<input data-timeline-clip-field="rotationPivotZ" type="number" step="0.1" /></label>
<label className="studio-field" data-timeline-for="fourStep">Second axis<select data-timeline-clip-field="secondaryAxis"><option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select></label>
<label className="studio-field" data-timeline-for="fourStep"><span>Second distance (ft)</span><input data-timeline-clip-field="secondaryAmount" type="number" step="0.1" /></label>
<label className="studio-field" data-timeline-for="splitRectangles">Minimum columns<input data-timeline-clip-field="splitColumnsMin" type="number" min="1" max="8" step="1" /></label>
<label className="studio-field" data-timeline-for="splitRectangles">Maximum columns<input data-timeline-clip-field="splitColumnsMax" type="number" min="1" max="8" step="1" /><small>The saved seed selects one stable count in this range</small></label>
<label className="studio-field" data-timeline-for="splitRectangles">Rows<input data-timeline-clip-field="splitRows" type="number" min="1" max="8" step="1" /></label>
<label className="studio-field" data-timeline-for="splitRectangles">Depth layers<input data-timeline-clip-field="splitLayers" type="number" min="1" max="4" step="1" /></label>
<label className="studio-field" data-timeline-for="splitRectangles">Random seed<input data-timeline-clip-field="splitSeed" type="number" step="1" /><small>Same seed keeps the pattern repeatable</small></label>
<label className="studio-field" data-timeline-for="splitRectangles">Rotation scatter (degrees)<input data-timeline-clip-field="splitRotation" type="number" min="0" max="360" step="1" /></label>
<label className="studio-field" data-timeline-for="blink">Minimum opacity<input data-timeline-clip-field="blinkMinOpacity" type="number" min="0" max="1" step="0.05" /><small>0 is fully invisible</small></label>
<label className="studio-field" data-timeline-for="blink">Visible portion<input data-timeline-clip-field="blinkDutyCycle" type="number" min="0.01" max="0.99" step="0.05" /></label>
<label className="studio-field" data-timeline-for="visibility">Visibility action<select data-timeline-clip-field="visibilityAction"><option value="show">Show during clip</option><option value="hide">Hide during clip</option><option value="toggle">Toggle each cycle</option></select></label>
</div>
<div className="four-step-pause-grid" data-timeline-for="fourStep"><label className="studio-field">Pause after step 1<input data-timeline-clip-field="step1Pause" type="number" min="0" step="0.05" /></label><label className="studio-field">Pause after step 2<input data-timeline-clip-field="step2Pause" type="number" min="0" step="0.05" /></label><label className="studio-field">Pause after step 3<input data-timeline-clip-field="step3Pause" type="number" min="0" step="0.05" /></label><label className="studio-field">Pause after step 4<input data-timeline-clip-field="step4Pause" type="number" min="0" step="0.05" /></label></div>
</details>
</section>
<details className="transform-section group-motion-driver" data-for-component="group"><summary>Merged-part attachment behavior</summary><label className="studio-field">Attachment parent<select id="group-motion-driver"></select></label><p>The attachment parent carries the merged assembly. Choose the whole merged item or a child using the target selector in the bottom timeline.</p></details>
</section>
</section>
</section>
<section data-inspector-panel="design" className="studio-inspector-section" hidden>
<div className="studio-panel-heading"><p>Machine properties</p><span>Reusable preset</span></div>
<div className="design-properties-grid">
<label className="studio-field wide">Design name<input id="design-name" type="text" /></label>
<label className="studio-field wide">Machine type<input id="design-machine-type" type="text" /></label>
<details className="transform-section wide design-envelope-panel" open>
<summary>Design envelope</summary>
<div className="axis-fields size-fields envelope-size-fields"><label className="axis-x-field">Width (ft)<input id="design-base-w" type="number" min="0.01" step="0.01" /></label><label className="axis-z-field">Depth (ft)<input id="design-base-d" type="number" min="0.01" step="0.01" /></label><label className="axis-y-field">Height (ft)<input id="design-base-h" type="number" min="0.01" step="0.01" /></label></div>
<div className="transform-subheading envelope-position-heading">Envelope position (ft)</div>
<div className="axis-fields envelope-position-fields"><label className="axis-x-field">X<input id="design-base-x" type="number" step="0.01" /></label><label className="axis-y-field">Y<input id="design-base-y" type="number" step="0.01" /></label><label className="axis-z-field">Z<input id="design-base-z" type="number" step="0.01" /></label></div>
<p id="design-envelope-status" className="transform-help envelope-status">The envelope can be as small as 0.01 ft on each axis.</p>
<section className="machine-envelope-shape" aria-labelledby="machine-envelope-shape-heading">
<div className="studio-panel-heading compact"><p id="machine-envelope-shape-heading">Walk-around shape</p><span id="design-envelope-piece-count">Base rectangle</span></div>
<p className="transform-help">Build the machine hitbox from multiple boxes. Two overlapping boxes can form an L shape; add more for detailed walk-around clearance.</p>
<label className="studio-field">Envelope piece<select id="design-envelope-piece"><option value="">Base rectangle</option></select></label>
<div className="axis-fields"><label className="axis-x-field">X<input data-design-envelope-field="x" type="number" step="0.01" /></label><label className="axis-y-field">Y<input data-design-envelope-field="y" type="number" step="0.01" /></label><label className="axis-z-field">Z<input data-design-envelope-field="z" type="number" step="0.01" /></label></div>
<div className="axis-fields size-fields"><label className="axis-x-field">Width<input data-design-envelope-field="w" type="number" min="0.01" step="0.01" /></label><label className="axis-y-field">Height<input data-design-envelope-field="h" type="number" min="0.01" step="0.01" /></label><label className="axis-z-field">Depth<input data-design-envelope-field="d" type="number" min="0.01" step="0.01" /></label></div>
<div className="envelope-shape-actions"><button id="add-design-envelope-piece" type="button">Add box</button><button id="duplicate-design-envelope-piece" type="button">Duplicate</button><button id="remove-design-envelope-piece" type="button" className="danger-subtle">Remove</button><button id="reset-design-envelope-shape" type="button">Use one base box</button></div>
</section>
<div className="envelope-fit-options"><label className="studio-field">Fit parts<select id="envelope-fit-scope"><option value="all">All parts</option><option value="visible">Visible parts only</option></select></label><label className="studio-field">Edge clearance (in)<input id="envelope-fit-clearance" type="number" min="0" max="120" step="0.125" defaultValue="0" /></label></div>
<label className="studio-switch envelope-visibility-switch"><input id="show-design-envelope" type="checkbox" defaultChecked /><span>Show envelope outline in the viewport</span></label>
<button id="fit-envelope" type="button" className="full-width-button">Move &amp; tight fit to parts</button>
</details>
<label className="studio-field wide">Description<textarea id="design-description" rows={4}></textarea></label>
</div>
</section>
</aside>
</section>
<dialog id="save-design-as-dialog" className="studio-dialog" aria-labelledby="save-design-as-title">
<form id="save-design-as-form" method="dialog">
<div className="studio-dialog-heading"><div><p>Reusable machine</p><h2 id="save-design-as-title">Save machine as</h2></div><button id="cancel-save-design-as" type="button" aria-label="Close">&times;</button></div>
<p className="studio-help">This creates a separate machine in the library. You can keep editing it or add it to the plant layout.</p>
<label className="studio-field">Machine name<input id="save-design-as-name" type="text" required maxLength={120} autoComplete="off" /></label>
<label className="studio-field">Machine type<input id="save-design-as-type" type="text" required maxLength={80} autoComplete="off" /></label>
<div className="studio-dialog-actions"><button type="button" data-close-save-as>Cancel</button><button type="submit" className="primary">Save new machine</button></div>
</form>
</dialog>
<LegacyScriptLoader sources={[
"/editor-access.js",
"/depth-scene-renderer.js",
"/three-depth-scene-renderer.js",
"/render-performance.js",
"/spatial-index.js",
"/geometry-prep-client.js",
"/machine-designs.js",
"/animation-timeline.js",
"/animation-timeline-workspace.js",
"/three-mf-exporter.js",
"/machine-design-studio.js",
]} />
</main>
</EditorAccessGate>
</>;
}


