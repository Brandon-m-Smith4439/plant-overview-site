/* eslint-disable @next/next/no-html-link-for-pages */
import LegacyScriptLoader from "./legacy-script-loader";
import { ProtectedEditorLink } from "./editor-access-gate";

export default function Home() {
  return (
    <main className="site-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">
            <span /> Monroe, NC · Glass Plant
          </p>
          <h1>Plant evolution explorer</h1>
        </div>
        <div className="masthead-actions">
          <nav className="site-nav" aria-label="Model tools">
            <a className="active" href="/">Plant layout</a>
            <ProtectedEditorLink href="/machine-studio">Machine Design Studio</ProtectedEditorLink>
          </nav>
          <p className="source-note">
            Model Studio <strong>v0.13.0</strong>
          </p>
        </div>
      </header>

      <section
        id="plant-app"
        className="experience"
        aria-label="Interactive glass plant model"
      >
        <div className="model-frame">
          <canvas
            id="plant-canvas"
            aria-label="Interactive 3D model of the Monroe glass plant"
          />
          <div className="view-help">
            Right-drag orbit · Middle-drag pan · Wheel zoom
          </div>
        </div>

        <aside className="stage-panel" aria-live="polite">
          <div className="stage-count">
            <span id="stage-number">01</span> / <span id="stage-total">18</span>
          </div>
          <p className="stage-kicker">Construction stage</p>
          <h2 id="stage-title">Empty shell</h2>
          <p id="stage-description">
            The production floor begins as an open industrial shell, with the
            real glass-plant footprint and column grid taken from the facility
            drawing.
          </p>
          <div className="stage-actions">
            <button id="previous-stage" type="button" disabled>
              Previous
            </button>
            <button id="next-stage" className="primary" type="button">
              Next stage <span>→</span>
            </button>
          </div>
        </aside>
      </section>

      <nav className="timeline" aria-label="Plant construction timeline">
        <div className="timeline-progress">
          <span id="timeline-fill" />
        </div>
        <ol id="timeline-stages">
          <li className="active">
            <button type="button">Empty shell</button>
          </li>
        </ol>
      </nav>

      <LegacyScriptLoader
        sources={[
          "/editor-access.js",
          "/depth-scene-renderer.js",
          "/three-depth-scene-renderer.js",
          "/render-performance.js",
          "/spatial-index.js",
          "/geometry-prep-client.js",
          "/plant-data.js",
          "/machine-data.js",
          "/machine-designs.js",
          "/workspace-transfer.js",
          "/published-workspace.js",
          "/animation-timeline.js",
          "/first-person-controller.js",
          "/three-mf-exporter.js",
          "/plant-app.js",
        ]}
      />
    </main>
  );
}
