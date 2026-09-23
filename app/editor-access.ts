"use client";

export const EDITOR_ACCESS_SESSION_KEY = "monroe-glass-editor-access-v1";
export const OWNER_ACCESS_SESSION_KEY = "monroe-glass-owner-session-v1";
export const OWNER_ACCESS_PATH = "/plant-owner-7f3a9c";
const SALT = "monroe-glass-editor-v1";
const ITERATIONS = 150000;
const PASSWORD_HASH = "245b6f4c1b43708b729adedfa33588b5feab997947d38cc9214ff68d1e3c5b4f";

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function isLocalEditorHost() {
  if (typeof window === "undefined") return false;
  return ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname);
}

export function isOwnerAccessPath() {
  if (typeof window === "undefined") return false;
  return window.location.pathname === OWNER_ACCESS_PATH || window.location.pathname.startsWith(`${OWNER_ACCESS_PATH}/`);
}

export function hasOwnerSession() {
  if (typeof window === "undefined") return false;
  try { return sessionStorage.getItem(OWNER_ACCESS_SESSION_KEY) === "granted"; } catch { return false; }
}

export function isEditorEnvironment() {
  return isLocalEditorHost() || isOwnerAccessPath() || hasOwnerSession();
}

export function hasEditorAccess() {
  if (!isEditorEnvironment()) return false;
  try { return sessionStorage.getItem(EDITOR_ACCESS_SESSION_KEY) === "granted"; } catch { return false; }
}

export function grantEditorAccess() {
  if (!isEditorEnvironment()) return false;
  try {
    sessionStorage.setItem(EDITOR_ACCESS_SESSION_KEY, "granted");
    if (isOwnerAccessPath() || hasOwnerSession()) sessionStorage.setItem(OWNER_ACCESS_SESSION_KEY, "granted");
    return true;
  } catch {
    return false;
  }
}

export async function verifyEditorPassword(password: string) {
  if (!isEditorEnvironment() || !window.crypto?.subtle || !password) return false;
  const encoder = new TextEncoder();
  const material = await window.crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await window.crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(SALT), iterations: ITERATIONS, hash: "SHA-256" }, material, 256);
  return hex(bits) === PASSWORD_HASH;
}
