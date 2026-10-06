import { createHmac, pbkdf2Sync, timingSafeEqual } from "node:crypto";

export const EDITOR_SESSION_COOKIE = "monroe_glass_editor_session";
const SESSION_MESSAGE = "monroe-glass-editor-session-v2";
const SALT = "monroe-glass-editor-v1";
const ITERATIONS = 150000;
const PASSWORD_HASH = "245b6f4c1b43708b729adedfa33588b5feab997947d38cc9214ff68d1e3c5b4f";

function sessionSecret() {
  return process.env.PLANT_EDITOR_SESSION_SECRET || `development-${PASSWORD_HASH}`;
}

function expectedSessionToken() {
  return createHmac("sha256", sessionSecret()).update(SESSION_MESSAGE).digest("hex");
}

function safeEqual(first: string, second: string) {
  const left = Buffer.from(first);
  const right = Buffer.from(second);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyEditorPassword(password: unknown) {
  if (typeof password !== "string" || !password) return false;
  const derived = pbkdf2Sync(password, SALT, ITERATIONS, 32, "sha256").toString("hex");
  return safeEqual(derived, PASSWORD_HASH);
}

export function editorSessionCookieValue() {
  return expectedSessionToken();
}

export function requestHasEditorSession(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const value = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${EDITOR_SESSION_COOKIE}=`))?.slice(EDITOR_SESSION_COOKIE.length + 1) || "";
  return Boolean(value) && safeEqual(value, expectedSessionToken());
}
