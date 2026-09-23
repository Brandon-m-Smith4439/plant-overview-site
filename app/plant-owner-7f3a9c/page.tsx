import Link from "next/link";
import { EditorAccessGate, ProtectedEditorLink } from "../editor-access-gate";

export const metadata = {
  title: "Owner Workspace · Monroe Glass Plant Evolution",
  robots: { index: false, follow: false, noarchive: true },
};

export default function PlantOwnerDashboard() {
  return (
    <EditorAccessGate>
      <main className="owner-dashboard">
        <div className="owner-dashboard-shell">
          <header className="owner-dashboard-header">
            <div>
              <p>Private owner workspace</p>
              <h1>Monroe Glass Plant Evolution</h1>
            </div>
            <div className="owner-dashboard-account">
              <span>Password protected</span>
              <Link href="/">Public view</Link>
            </div>
          </header>
          <section className="owner-dashboard-grid" aria-label="Owner editing tools">
            <article className="owner-dashboard-card">
              <h2>Plant layout</h2>
              <p>Move, rotate, scale, add, copy, or remove plant objects; edit structure, stages, paint timing, walls, pillars, labels, and project settings.</p>
              <Link href="/?owner=layout">Open layout editor</Link>
            </article>
            <article className="owner-dashboard-card">
              <h2>Machine library</h2>
              <p>Open the existing Machine Design Studio to build or edit reusable machines, nested assemblies, transforms, materials, and animation timelines.</p>
              <ProtectedEditorLink href="/machine-studio">Open Machine Design Studio</ProtectedEditorLink>
            </article>
          </section>
          <aside className="owner-dashboard-note">
            <strong>Publishing note:</strong> saves in the hosted editor stay in this browser workspace. Use the Project export/publish workflow when you want an approved owner edit to become the public portfolio/company snapshot.
          </aside>
        </div>
      </main>
    </EditorAccessGate>
  );
}
