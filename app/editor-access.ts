"use client";

export const EDITOR_ACCESS_SESSION_KEY = "monroe-glass-editor-access-v1";
const SALT = "monroe-glass-editor-v1";
const ITERATIONS = 150000;
const PASSWORD_HASH = "a89e5ec6ea8f00502e788ccba384e59d1f204f7ef1e5cfd66b7a976398803a7b";

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function hasEditorAccess() {
  try { return sessionStorage.getItem(EDITOR_ACCESS_SESSION_KEY) === "granted"; } catch { return false; }
}

export async function verifyEditorPassword(password: string) {
  if (!window.crypto?.subtle || !password) return false;
  const encoder = new TextEncoder();
  const material = await window.crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await window.crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(SALT), iterations: ITERATIONS, hash: "SHA-256" }, material, 256);
  return hex(bits) === PASSWORD_HASH;
}
