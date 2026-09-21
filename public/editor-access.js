(() => {
  "use strict";

  const SESSION_KEY = "monroe-glass-editor-access-v1";
  const SALT = "monroe-glass-editor-v1";
  const ITERATIONS = 150000;
  const PASSWORD_HASH = "77ee5a1e94fda10c2b194da03e906715b81848d340e55acceca95e6cc6e83d4b";

  function hex(bytes) {
    return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  function editingAllowed() {
    return ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname);
  }

  if (!editingAllowed()) document.documentElement.classList.add("public-read-only");

  async function verify(password) {
    if (!editingAllowed() || !window.crypto?.subtle || !String(password || "")) return false;
    const encoder = new TextEncoder();
    const material = await window.crypto.subtle.importKey("raw", encoder.encode(String(password)), "PBKDF2", false, ["deriveBits"]);
    const bits = await window.crypto.subtle.deriveBits({
      name: "PBKDF2", salt: encoder.encode(SALT), iterations: ITERATIONS, hash: "SHA-256",
    }, material, 256);
    return hex(bits) === PASSWORD_HASH;
  }

  function hasAccess() {
    if (!editingAllowed()) return false;
    try { return sessionStorage.getItem(SESSION_KEY) === "granted"; } catch { return false; }
  }

  function requestAccess() {
    if (!editingAllowed()) return Promise.resolve(false);
    if (hasAccess()) return Promise.resolve(true);
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "editor-access-overlay";
      overlay.innerHTML = `
        <form class="editor-access-dialog" aria-modal="true" aria-labelledby="editor-access-title">
          <p class="editor-access-kicker">Restricted area</p>
          <h2 id="editor-access-title">Editor access</h2>
          <p>Viewing is open. Enter the editor password to change the plant layout or machine designs.</p>
          <label>Password<input type="password" autocomplete="current-password" required autofocus></label>
          <p class="editor-access-error" role="alert" hidden>That password is not correct.</p>
          <div><button type="button" data-cancel>Cancel</button><button type="submit">Continue</button></div>
        </form>`;
      const close = (granted) => { overlay.remove(); resolve(granted); };
      const form = overlay.querySelector("form");
      const input = overlay.querySelector("input");
      const error = overlay.querySelector(".editor-access-error");
      overlay.querySelector("[data-cancel]").addEventListener("click", () => close(false));
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = form.querySelector("button[type='submit']");
        submit.disabled = true;
        const granted = await verify(input.value).catch(() => false);
        submit.disabled = false;
        if (!granted) { input.select(); error.hidden = false; return; }
        try { sessionStorage.setItem(SESSION_KEY, "granted"); } catch {}
        close(true);
      });
      // Browsers only paint the fullscreen element and its descendants. Mount
      // the gate inside that top-layer subtree so the pencil control can ask
      // for access without forcing the viewer to leave fullscreen first.
      const overlayHost = document.fullscreenElement || document.body;
      overlayHost.appendChild(overlay);
      input.focus();
    });
  }

  window.monroeEditorAccess = { editingAllowed, hasAccess, requestAccess, verify };
})();
