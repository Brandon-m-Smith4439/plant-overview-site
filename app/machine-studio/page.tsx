export default function MachineStudio() {
  return (
    <main className="machine-studio-shell">
      <header className="studio-topbar">
        <div className="studio-brand">
          <a className="studio-back-link" href="/" aria-label="Return to plant layout">←</a>
          <div><p>Monroe Glass Plant</p><h1>Machine Design Studio</h1></div>
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
            <label className="studio-field studio-search-field">Search designs<input id="design-search" type="search" placeholder="Search designs" /></label>
            <div id="design-list" className="design-list" aria-label="Available machine designs" />
            <div className="studio-button-grid">
              <button id="new-design" type="button">New</button><button id="duplicate-design" type="button">Duplicate</button>
              <button id="reset-design" type="button">Reset preset</button><button id="delete-design" type="button">Delete custom</button>
            </div>
            <div className="studio-button-grid compact">
              <button id="export-design" type="button">Export JSON</button><button id="import-design" type="button">Import JSON</button>
              <input id="import-design-file" type="file" accept="application/json,.json" hidden />
            </div>
            <fieldset className="assignment-panel">
              <legend>Use in plant layout</legend>
              <label className="studio-field">Plant object<select id="machine-assignment"><option value="">Choose a machine…</option></select></label>
              <div className="assignment-actions">
                <button id="apply-machine" type="button" className="primary">Apply to object</button>
                <button id="apply-type" type="button">Apply to matching type</button>
                <button id="clear-machine-design" type="button">Use built-in model</button>
              </div>
              <p id="assignment-status" className="studio-help">Assignments save directly to the plant layout stored in this browser.</p>
            </fieldset>
          </section>

          <section data-browser-panel="parts" hidden>
            <div className="studio-panel-heading"><p>Object tree</p><strong id="component-count">0 parts</strong></div>
            <label className="studio-field studio-search-field">Search parts<input id="component-search" type="search" placeholder="Search components" /></label>
            <div id="component-list" className="component-list" aria-label="Machine design components" />
            <div className="component-add-panel"><p>Add primitive</p><div>
              <button type="button" data-add-component="box"><span>▣</span>Box</button>
              <button type="button" data-add-component="glassPanel"><span>◇</span>Glass</button>
              <button type="button" data-add-component="beam"><span>╱</span>Beam</button>
              <button type="button" data-add-component="rollerBed"><span>≡</span>Rollers</button>
              <button type="button" data-add-component="wheel"><span>◉</span>Wheel</button>
            </div></div>
            <div className="parts-order-actions"><button id="move-component-up" type="button">Move up</button><button id="move-component-down" type="button">Move down</button></div>
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
            <div className="snap-controls">
              <label className="studio-switch"><input id="snap-enabled" type="checkbox" defaultChecked /><span>Snap</span></label>
              <label>Step<select id="snap-step" defaultValue="0.5"><option value="0.1">0.1</option><option value="0.25">0.25</option><option value="0.5">0.5</option><option value="1">1.0</option><option value="2">2.0</option></select></label>
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
            <button type="button" role="tab" data-inspector-tab="object" className="active" aria-selected="true">Object</button>
            <button type="button" role="tab" data-inspector-tab="design" aria-selected="false">Design</button>
          </div>
          <section data-inspector-panel="object">
            <div className="studio-panel-heading"><p>Selected component</p><span id="selected-component-type">Nothing selected</span></div>
            <div id="empty-component-state" className="inspector-empty"><strong>Select a part in the viewport or Parts list.</strong><p>Use Move, Rotate, or Scale after selecting a component. Transform controls always stay above the model. Colored handles match the X, Y, and Z axes.</p></div>
            <section id="component-properties" className="component-properties" hidden>
              <label className="studio-field">Component name<input data-component-field="name" type="text" /></label>
              <div className="inspector-row two"><label className="studio-field">Type<select data-component-field="type"><option value="box">Box</option><option value="glassPanel">Glass panel</option><option value="beam">Beam</option><option value="rollerBed">Roller bed</option><option value="wheel">Wheel</option></select></label><label className="studio-field">Color<input data-component-field="color" type="color" /></label></div>
              <div className="visibility-row"><label className="studio-switch"><input data-component-check="visible" type="checkbox" /><span>Visible</span></label><label className="studio-field compact-field">Opacity<input data-component-field="opacity" type="number" min="0.05" max="1" step="0.05" /></label></div>
              <fieldset className="transform-section"><legend>Position</legend><div className="axis-fields"><label className="axis-x-field">X<input data-component-field="x" type="number" step="0.1" /></label><label className="axis-y-field">Y<input data-component-field="y" type="number" step="0.1" /></label><label className="axis-z-field">Z<input data-component-field="z" type="number" step="0.1" /></label></div><button id="center-component" type="button" className="full-width-button">Center on design base</button></fieldset>
              <fieldset className="transform-section"><legend>Rotation</legend><div className="axis-fields rotation-axis-fields"><label className="axis-x-field">X<input data-component-field="rotationX" type="number" step="1" /></label><label className="axis-y-field">Y<input data-component-field="rotationY" type="number" step="1" /></label><label className="axis-z-field">Z<input data-component-field="rotationZ" type="number" step="1" /></label></div><div className="rotation-row rotation-actions"><label className="studio-field rotation-axis-picker">Quick axis<select id="rotation-axis" defaultValue="y"><option value="x">X axis</option><option value="y">Y axis</option><option value="z">Z axis</option></select></label><button id="rotate-negative" type="button">−90°</button><button id="rotate-positive" type="button">+90°</button><button id="reset-rotation" type="button">Reset all</button></div><p className="transform-help">Use the red, green, and blue rings in Rotate mode for X, Y, and Z rotation.</p></fieldset>
              <fieldset className="transform-section"><legend>Size</legend><div className="axis-fields size-fields"><label data-for-component="box glassPanel rollerBed wheel" className="axis-x-field">Width<input data-component-field="w" type="number" min="0.02" step="0.1" /></label><label data-for-component="box glassPanel wheel" className="axis-y-field">Height<input data-component-field="h" type="number" min="0.02" step="0.1" /></label><label data-for-component="box glassPanel rollerBed wheel" className="axis-z-field">Depth<input data-component-field="d" type="number" min="0.02" step="0.1" /></label><label data-for-component="beam rollerBed">Thickness<input data-component-field="thickness" type="number" min="0.02" step="0.1" /></label><label data-for-component="rollerBed">Roller count<input data-component-field="count" type="number" min="2" step="1" /></label></div><p className="transform-help scale-help"><strong>Scale tool:</strong> drag a colored square to resize only that local axis. Wheels now have independent width, height, and axle-depth dimensions. Drag the orange center handle to scale every axis together.</p></fieldset>
              <fieldset className="transform-section" data-for-component="beam"><legend>Beam endpoint</legend><div className="axis-fields"><label className="axis-x-field">End X<input data-component-field="x2" type="number" step="0.1" /></label><label className="axis-y-field">End Y<input data-component-field="y2" type="number" step="0.1" /></label><label className="axis-z-field">End Z<input data-component-field="z2" type="number" step="0.1" /></label></div></fieldset>
            </section>
          </section>
          <section data-inspector-panel="design" hidden>
            <div className="studio-panel-heading"><p>Design properties</p><span>Reusable preset</span></div>
            <div className="design-properties-grid">
              <label className="studio-field wide">Design name<input id="design-name" type="text" /></label>
              <label className="studio-field wide">Machine type<input id="design-machine-type" type="text" /></label>
              <fieldset className="transform-section wide"><legend>Design envelope</legend><div className="axis-fields size-fields"><label className="axis-x-field">Width<input id="design-base-w" type="number" min="0.5" step="0.5" /></label><label className="axis-z-field">Depth<input id="design-base-d" type="number" min="0.5" step="0.5" /></label><label className="axis-y-field">Height<input id="design-base-h" type="number" min="0.5" step="0.5" /></label></div><button id="fit-envelope" type="button" className="full-width-button">Fit envelope around parts</button></fieldset>
              <label className="studio-field wide">Description<textarea id="design-description" rows={4} /></label>
            </div>
          </section>
        </aside>
      </section>
      <script src="/machine-designs.js" />
      <script src="/machine-design-studio.js" />
    </main>
  );
}
