import { createHmac, pbkdf2Sync, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "monroe-glass-owner-server-v1";
const SALT = "monroe-glass-editor-v1";
const ITERATIONS = 150000;
const PASSWORD_HASH = "245b6f4c1b43708b729adedfa33588b5feab997947d38cc9214ff68d1e3c5b4f";
const SESSION_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  return process.env.PLANT_OWNER_SESSION_SECRET || PASSWORD_HASH;
}

function signSession(expiry: number) {
  const payload = `owner:${expiry}`;
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function passwordMatches(password: string) {
  const derived = pbkdf2Sync(password, SALT, ITERATIONS, 32, "sha256");
  const expected = Buffer.from(PASSWORD_HASH, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export async function POST(request: Request) {
  let body: { password?: unknown } = {};
  try { body = await request.json(); } catch {}
  const password = typeof body.password === "string" ? body.password : "";
  if (!password || !passwordMatches(password)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const expiry = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return Response.json({ ok: true }, {
    headers: {
      "cache-control": "no-store",
      "set-cookie": `${SESSION_COOKIE}=${signSession(expiry)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}`,
    },
  });
}
