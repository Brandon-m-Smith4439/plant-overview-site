export default function MachineStudio() {
  return (
    <main className="machine-studio-shell">
      <header className="studio-topbar">
        <div className="studio-brand">
          <a className="studio-back-link" href="/" aria-label="Return to plant layout">←</a>
          <div><p>Monroe Glass Plant</p><h1>Machine Design Studio</h1></div>
          <span className="studio-version-badge">v0.10.1</span>
        </div>
        <div className="studio-top-actions" role="toolbar" aria-label="Design commands">
          <span id="save-state" className="studio-save-state">Auto-saved</span>
          <button id="undo-design" type="button" title="Undo (Ctrl+Z)" aria-label="Undo">↶</button>
          <button id="redo-design" type="button" title="Redo (Ctrl+Y)" aria-label="Redo">↷</button>
          <span className="studio-toolbar-divider" />
          <button id="duplicate-component" type="button" title="Duplicate selected part (Ctrl+D)">Duplicate</button>
          <button id="delete-component" type="button" className="danger-subtle" title="Delete selected part">Delete</button>
          <a href="/">Plant layout</a>
        </div>
      </header>

      <section className="machine-studio-workspace" aria-label="Machine design editor">
        <aside className="studio-browser-panel">
          <div className="studio-tabs" role="tablist" aria-label="Design browser">
            <button type="button" role="tab" data-browser-tab="designs" className="active" aria-selected="true">Designs</button>
            <button type="button" role="tab" data-browser-tab="parts" aria-selected="false">Parts</button>
          </div>

          <section data-browser-panel="designs">
            <div className="studio-panel-heading"><p>Design library</p><strong id="design-count">0 designs</strong></div>
            <label className="studio-field studio-search-field">Search<input id="design-search" type="search" placeholder="Machine name or type" /></label>
            <div id="design-list" className="design-list" aria-label="Available machine designs" />
            <details className="studio-collapsible">
              <summary>Design actions</summary>
              <div className="studio-button-grid">
                <button id="new-design" type="button">New</button><button id="duplicate-design" type="button">Duplicate</button>
                <button id="reset-design" type="button">Reset preset</button><button id="delete-design" type="button">Delete custom</button>
              </div>
              <div className="studio-button-grid compact">
                <button id="export-design" type="button">Export JSON</button><button id="import-design" type="button">Import JSON</button>
                <input id="import-design-file" type="file" accept="application/json,.json" hidden />
              </div>
            </details>
            <details className="studio-collapsible assignment-panel">
              <summary>Use in plant layout</summary>
              <label className="studio-field">Plant object<select id="machine-assignment"><option value="">Choose a machine…</option></select></label>
              <div className="assignment-actions">
                <button id="apply-machine" type="button" className="primary">Apply to object</button>
                <button id="apply-type" type="button">Apply to matching type</button>
                <button id="clear-machine-design" type="button">Use built-in model</button>
              </div>
              <p id="assignment-status" className="studio-help">Assignments save directly to the plant layout stored in this browser.</p>
            </details>
          </section>

          <section data-browser-panel="parts" hidden>
            <div className="studio-panel-heading"><p>Machine parts</p><strong id="component-count">0 parts</strong></div>
            <div className="parts-quick-actions">
              <button id="select-all-components" type="button" title="Select every part (Ctrl+A)">Select all</button>
              <button id="merge-components" type="button" disabled>Merge</button>
              <button id="ungroup-component" type="button" disabled>Separate</button>
            </div>
            <label className="studio-field studio-search-field">Search<input id="component-search" type="search" placeholder="Part name or shape" /></label>
            <div id="component-list" className="component-list" aria-label="Machine design components" />
            <section className="component-add-panel">
              <div className="studio-panel-heading"><p>Add shape</p><span>Placed near center</span></div>
              <div className="shape-quick-grid" aria-label="Common shapes">
                <button type="button" data-add-component="box"><span>▣</span>Box</button>
                <button type="button" data-add-component="cylinder"><span>●</span>Cylinder</button>
                <button type="button" data-add-component="beam"><span>╱</span>Beam</button>
                <button type="button" data-add-component="glassPanel"><span>◇</span>Glass</button>
              </div>
              <div className="shape-picker-row">
                <select id="add-component-type" aria-label="Additional shape">
                  <optgroup label="Solid shapes"><option value="sphere">Sphere / ellipsoid</option><option value="cone">Cone / hopper</option><option value="wedge">Wedge / ramp</option></optgroup>
                  <optgroup label="Machine parts"><option value="rollerBed">Roller bed</option><option value="wheel">Wheel / caster</option></optgroup>
                </select>
                <button id="add-component-button" type="button" className="primary">Add</button>
              </div>
            </section>
            <details className="studio-collapsible compact-actions"><summary>Part order</summary><div className="parts-order-actions"><button id="move-component-up" type="button">Move up</button><button id="move-component-down" type="button">Move down</button></div></details>
          </section>
        </aside>

        <section className="design-viewport-panel">
          <div className="viewport-commandbar">
            <div role="group" aria-label="Camera views" className="view-buttons">
              <button type="button" data-design-view="iso" className="active" title="Isometric view (0)">Iso</button>
              <button type="button" data-design-view="front" title="Front view (1)">Front</button>
              <button type="button" data-design-view="side" title="Right view (2)">Right</button>
              <button type="button" data-design-view="top" title="Top view (3)">Top</button>
              <button type="button" data-design-view="fit" title="Fit model (F)">Fit</button>
            </div>
            <div className="viewport-settings">
              <div className="transform-space-toggle" role="group" aria-label="Transform orientation">
                <button type="button" data-transform-space="local" className="active" aria-pressed="true" title="Follow the selected part">Local</button>
                <button type="button" data-transform-space="world" aria-pressed="false" title="Follow the design grid">World</button>
              </div>
              <div className="snap-controls">
                <button id="preview-design-animations" type="button" className="active">Pause animation</button>
                <label className="studio-switch"><input id="snap-enabled" type="checkbox" defaultChecked /><span>Snap</span></label>
                <label>Step<select id="snap-step" defaultValue="0.5"><option value="0.1">0.1</option><option value="0.25">0.25</option><option value="0.5">0.5</option><option value="1">1.0</option><option value="2">2.0</option></select></label>
              </div>
            </div>
          </div>
          <div className="viewport-toolrail" role="toolbar" aria-label="Transform tools">
            <button type="button" data-design-mode="select" className="active" title="Select (V)"><span>↖</span><small>Select</small></button>
            <button type="button" data-design-mode="move" title="Move (M)"><span>✣</span><small>Move</small></button>
            <button type="button" data-design-mode="rotate" title="Rotate (R)"><span>⟳</span><small>Rotate</small></button>
            <button type="button" data-design-mode="scale" title="Scale (S)"><span>⤢</span><small>Scale</small></button>
            <button type="button" data-design-mode="pan" title="Pan view (H)"><span>✋</span><small>Pan</small></button>
          </div>
          <canvas id="machine-design-canvas" aria-label="Interactive 3D preview of the selected machine design" />
          <div className="orientation-cube" aria-label="Quick camera orientation"><button type="button" data-design-view="top">TOP</button><div><button type="button" data-design-view="front">FRONT</button><button type="button" data-design-view="side">RIGHT</button></div></div>
          <div className="viewport-statusbar"><span id="active-tool-label"><strong>Select</strong> · Click a part to select it</span><span>Right-drag orbit · Middle-drag pan · Wheel zoom · Double-click focus</span></div>
          <div id="design-toast" className="design-toast" role="status" aria-live="polite" />
        </section>

        <aside className="studio-inspector-panel">
          <div className="studio-tabs inspector-tabs" role="tablist" aria-label="Inspector">
            <button type="button" role="tab" data-inspector-tab="object" className="active" aria-selected="true">Part</button>
            <button type="button" role="tab" data-inspector-tab="design" aria-selected="false">Machine</button>
          </div>
          <section data-inspector-panel="object">
            <div className="studio-panel-heading"><p>Selection</p><span id="selected-component-type">Nothing selected</span></div>
            <div id="empty-component-state" className="inspector-empty"><strong>Select a part in the viewport or Parts list.</strong><p>Choose Move, Rotate, or Scale. Local mode follows the selected part; World mode follows the design grid.</p></div>
            <section id="component-properties" className="component-properties" hidden>
              <div className="inspector-primary-card">
                <label className="studio-field">Part name<input data-component-field="name" type="text" /></label>
                <div className="inspector-row two"><label className="studio-field">Shape<select data-component-field="type"><option value="box">Box</option><option value="cylinder">Cylinder</option><option value="sphere">Sphere</option><option value="cone">Cone</option><option value="wedge">Wedge</option><option value="glassPanel">Glass panel</option><option value="beam">Beam</option><option value="rollerBed">Roller bed</option><option value="wheel">Wheel</option><option value="group">Merged item</option></select></label><label className="studio-field">Color<input data-component-field="color" type="color" /></label></div>
                <div className="visibility-row"><label className="studio-switch"><input data-component-check="visible" type="checkbox" /><span>Visible</span></label><label className="studio-field compact-field">Opacity<input data-component-field="opacity" type="number" min="0.05" max="1" step="0.05" /></label></div>
              </div>
              <details className="transform-section" open><summary>Transform</summary>
                <div className="transform-subheading">Position</div><div className="axis-fields"><label className="axis-x-field">X<input data-component-field="x" type="number" step="0.1" /></label><label className="axis-y-field">Y<input data-component-field="y" type="number" step="0.1" /></label><label className="axis-z-field">Z<input data-component-field="z" type="number" step="0.1" /></label></div>
                <div className="transform-subheading">Rotation</div><div className="axis-fields rotation-axis-fields"><label className="axis-x-field">X<input data-component-field="rotationX" type="number" step="1" /></label><label className="axis-y-field">Y<input data-component-field="rotationY" type="number" step="1" /></label><label className="axis-z-field">Z<input data-component-field="rotationZ" type="number" step="1" /></label></div>
                <div className="rotation-row rotation-actions"><label className="studio-field rotation-axis-picker">Quick axis<select id="rotation-axis" defaultValue="y"><option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select></label><button id="rotate-negative" type="button">−90°</button><button id="rotate-positive" type="button">+90°</button><button id="reset-rotation" type="button">Reset</button></div>
                <button id="center-component" type="button" className="full-width-button">Center on machine</button>
              </details>
              <details className="transform-section" open><summary>Dimensions</summary>
                <div className="axis-fields size-fields">
                  <label data-for-component="box cylinder sphere cone wedge glassPanel rollerBed wheel" className="axis-x-field">Width<input data-component-field="w" type="number" min="0.02" step="0.1" /></label>
                  <label data-for-component="box cylinder sphere cone wedge glassPanel wheel" className="axis-y-field">Height<input data-component-field="h" type="number" min="0.02" step="0.1" /></label>
                  <label data-for-component="box cylinder sphere cone wedge glassPanel rollerBed wheel" className="axis-z-field">Depth<input data-component-field="d" type="number" min="0.02" step="0.1" /></label>
                  <label data-for-component="beam" className="axis-x-field">Beam length<input data-component-field="length" type="number" min="0.02" step="0.1" /></label><label data-for-component="beam" className="axis-y-field">Beam height<input data-component-field="thicknessY" type="number" min="0.02" step="0.1" /></label>
                  <label data-for-component="beam" className="axis-z-field">Beam width<input data-component-field="thicknessZ" type="number" min="0.02" step="0.1" /></label>
                  <label data-for-component="rollerBed">Roller diameter<input data-component-field="thickness" type="number" min="0.02" step="0.1" /></label>
                  <label data-for-component="rollerBed">Roller count<input data-component-field="count" type="number" min="2" step="1" /></label>
                  <label data-for-component="cylinder sphere cone">Smoothness<input data-component-field="segments" type="number" min="8" max="48" step="1" /></label>
                </div>
                <p className="transform-help"><strong>Local scaling:</strong> X changes length or width, Y changes height, and Z changes depth. Beam X changes its length while Y and Z change its rectangular cross-section.</p>
              </details>
              <details className="transform-section animation-section"><summary>Animation</summary>
                <label className="studio-switch"><input data-component-check="animationEnabled" type="checkbox" /><span>Animation enabled</span></label>
                <div className="inspector-row two"><label className="studio-field">Motion<select data-component-field="animationType"><option value="none">None</option><option value="oscillate">Back and forth</option><option value="loop">Continuous loop</option><option value="spin">Continuous rotation</option><option value="bob">Bob vertically</option><option value="pulse">Pulse size</option><option value="blink">Blink</option></select></label><label className="studio-field">Axis<select data-component-field="animationAxis"><option value="x">X</option><option value="y">Y</option><option value="z">Z</option><option value="all">All</option></select></label></div>
                <div className="axis-fields animation-fields"><label>Amount<input data-component-field="animationAmount" type="number" step="0.5" /></label><label>Speed<input data-component-field="animationSpeed" type="number" min="0" step="0.01" /></label><label>Pause sec<input data-component-field="animationPauseSeconds" type="number" min="0" step="0.1" /></label><label>Phase °<input data-component-field="animationPhase" type="number" step="5" /></label></div>
                <div data-for-component="group" className="group-motion-driver">
                  <label className="studio-field">Attachment parent<select id="group-motion-driver" /></label>
                  <p>The selected child drives the merged assembly. Every other child inherits that motion while continuing to play its own animation.</p>
                </div>
              </details>
              <details className="transform-section" data-for-component="beam"><summary>Beam endpoints</summary><div className="axis-fields"><label className="axis-x-field">End X<input data-component-field="x2" type="number" step="0.1" /></label><label className="axis-y-field">End Y<input data-component-field="y2" type="number" step="0.1" /></label><label className="axis-z-field">End Z<input data-component-field="z2" type="number" step="0.1" /></label></div></details>
            </section>
          </section>
          <section data-inspector-panel="design" hidden>
            <div className="studio-panel-heading"><p>Machine properties</p><span>Reusable preset</span></div>
            <div className="design-properties-grid">
              <label className="studio-field wide">Design name<input id="design-name" type="text" /></label>
              <label className="studio-field wide">Machine type<input id="design-machine-type" type="text" /></label>
              <details className="transform-section wide" open><summary>Design envelope</summary><div className="axis-fields size-fields"><label className="axis-x-field">Width<input id="design-base-w" type="number" min="0.5" step="0.5" /></label><label className="axis-z-field">Depth<input id="design-base-d" type="number" min="0.5" step="0.5" /></label><label className="axis-y-field">Height<input id="design-base-h" type="number" min="0.5" step="0.5" /></label></div><button id="fit-envelope" type="button" className="full-width-button">Fit envelope around parts</button></details>
              <label className="studio-field wide">Description<textarea id="design-description" rows={4} /></label>
            </div>
          </section>
        </aside>
      </section>
      <script src="/depth-scene-renderer.js" />
      <script src="/machine-designs.js" />
      <script src="/machine-design-studio.js" />
    </main>
  );
}
