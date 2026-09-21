"use client";

export const EDITOR_ACCESS_SESSION_KEY = "monroe-glass-editor-access-v1";
const SALT = "monroe-glass-editor-v1";
const ITERATIONS = 150000;
const PASSWORD_HASH = "77ee5a1e94fda10c2b194da03e906715b81848d340e55acceca95e6cc6e83d4b";

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function isLocalEditorHost() {
  if (typeof window === "undefined") return false;
  return ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname);
}

export function hasEditorAccess() {
  if (!isLocalEditorHost()) return false;
  try { return sessionStorage.getItem(EDITOR_ACCESS_SESSION_KEY) === "granted"; } catch { return false; }
}

export async function verifyEditorPassword(password: string) {
  if (!isLocalEditorHost() || !window.crypto?.subtle || !password) return false;
  const encoder = new TextEncoder();
  const material = await window.crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await window.crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(SALT), iterations: ITERATIONS, hash: "SHA-256" }, material, 256);
  return hex(bits) === PASSWORD_HASH;
}
