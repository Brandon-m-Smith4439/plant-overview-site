"use client";

import { type FormEvent, type ReactNode, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { OWNER_ACCESS_PATH, grantEditorAccess, hasEditorAccess, isEditorEnvironment, verifyEditorPassword } from "./editor-access";


const SECRET_OWNER_CLICK_COUNT = 5;
const SECRET_OWNER_CLICK_WINDOW_MS = 3500;

export function SecretOwnerEntry({ version }: { version: string }) {
  const clicks = useRef<number[]>([]);

  const handleSecretClick = () => {
    const now = Date.now();
    const recent = clicks.current.filter((clickedAt) => now - clickedAt <= SECRET_OWNER_CLICK_WINDOW_MS);
    recent.push(now);
    clicks.current = recent;
    if (recent.length < SECRET_OWNER_CLICK_COUNT) return;

    clicks.current = [];
    window.location.assign(OWNER_ACCESS_PATH);
  };

  return (
    <button
      type="button"
      className="source-note secret-owner-entry"
      aria-label={`Model Studio version ${version}`}
      onClick={handleSecretClick}
    >
      v{version}
    </button>
  );
}

const subscribeToEditorEnvironment = () => () => {};
function useEditorEnvironment() {
  return useSyncExternalStore(subscribeToEditorEnvironment, isEditorEnvironment, () => false);
}
function openEditorAfterViewportRelease(href: string) {
  const runtime = (window as typeof window & {
    __MONROE_ACTIVE_VIEWPORT_RUNTIME__?: { dispose?: () => void };
  }).__MONROE_ACTIVE_VIEWPORT_RUNTIME__;
  runtime?.dispose?.();
  // Give the graphics driver one short task boundary to retire the full plant
  // context before Machine Studio allocates its own WebGL context.
  window.setTimeout(() => window.location.assign(href), 120);
}

export function ProtectedEditorLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const editingAvailable = useEditorEnvironment();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!(await verifyEditorPassword(password))) { setError("That password is not correct."); return; }
    grantEditorAccess(); openEditorAfterViewportRelease(href);
  };
  if (!editingAvailable) return null;
  return <>
    <Link className={className} href={href} onClick={(event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      if (hasEditorAccess()) openEditorAfterViewportRelease(href);
      else setOpen(true);
    }}>{children}</Link>
    {open && <div className="editor-access-overlay"><form className="editor-access-dialog" onSubmit={submit}>
      <p className="editor-access-kicker">Restricted area</p><h2>Editor access</h2>
      <p>Viewing is open. Enter the editor password to edit machine designs.</p>
      <label>Password<input autoFocus type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      {error && <p className="editor-access-error" role="alert">{error}</p>}
      <div><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="submit">Continue</button></div>
    </form></div>}
  </>;
}

export function EditorAccessGate({ children }: { children: ReactNode }) {
  const editingAvailable = useEditorEnvironment();
  const [granted, setGranted] = useState(() => typeof window !== "undefined" && hasEditorAccess());
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!(await verifyEditorPassword(password))) { setError("That password is not correct."); return; }
    grantEditorAccess(); setGranted(true);
  };
  if (!editingAvailable) return <main className="editor-access-page"><div className="editor-access-overlay"><section className="editor-access-dialog">
    <p className="editor-access-kicker">Public viewer</p><h2>Editing is protected</h2>
    <p>The public plant is read-only. Open the private owner path first, or use the local project, to unlock editing for this browser tab.</p>
    <div><Link href="/">Return to plant</Link></div>
  </section></div></main>;
  if (granted) return <>{children}</>;
  return <main className="editor-access-page"><div className="editor-access-overlay"><form className="editor-access-dialog" onSubmit={submit}>
    <p className="editor-access-kicker">Restricted area</p><h2>Machine Design Studio</h2>
    <p>Viewing the plant is open. Enter the editor password to open and modify reusable machine designs.</p>
    <label>Password<input autoFocus type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
    {error && <p className="editor-access-error" role="alert">{error}</p>}
    <div><Link href="/">Return to plant</Link><button type="submit">Continue</button></div>
  </form></div></main>;
}
