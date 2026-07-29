export default function Home() {
  return (
    <main className="site-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow"><span /> Monroe, NC · Glass Plant</p>
          <h1>Plant evolution explorer</h1>
        </div>
        <p className="source-note">
          Grounded in <strong>Monroe Archs w Updates 1-23-25 (002).dwg</strong>
        </p>
      </header>

      <section id="plant-app" className="experience" aria-label="Interactive glass plant model">
        <div className="model-frame">
          <canvas id="plant-canvas" aria-label="Interactive 3D model of the glass plant" />
          <div className="model-badge">DXF-grounded footprint</div>
          <div className="view-help">Drag to orbit · Scroll to zoom</div>
        </div>
        <aside className="stage-panel">
          <div className="stage-count"><span id="stage-number">01</span> / 10</div>
          <p className="stage-kicker">Construction stage</p>
          <h2 id="stage-title">Empty shell</h2>
          <p id="stage-description">
            The production floor begins as an open industrial shell, with the
            real glass-plant footprint and column grid taken from the facility drawing.
          </p>
          <div className="stage-actions">
            <button id="previous-stage" type="button" disabled>Previous</button>
            <button id="next-stage" className="primary" type="button">
              Next stage <span>→</span>
            </button>
          </div>
        </aside>
      </section>

      <nav className="timeline" aria-label="Plant construction timeline">
        <div className="timeline-progress"><span id="timeline-fill" /></div>
        <ol id="timeline-stages">
          <li className="active"><button type="button">Empty shell</button></li>
          <li><button type="button">Trenches</button></li>
          <li><button type="button">Utilities</button></li>
          <li><button type="button">Paint</button></li>
          <li><button type="button">Safety yellow</button></li>
          <li><button type="button">Machines</button></li>
          <li><button type="button">Raw glass</button></li>
          <li><button type="button">Plant offices</button></li>
          <li><button type="button">First production</button></li>
          <li><button type="button">Today</button></li>
        </ol>
      </nav>

      <script src="/plant-data.js" />
      <script src="/plant-app.js" />
    </main>
  );
}
