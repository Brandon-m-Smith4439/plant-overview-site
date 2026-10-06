import { EDITOR_SESSION_COOKIE, editorSessionCookieValue, requestHasEditorSession, verifyEditorPassword } from "../_lib/editor-session";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export async function GET(request: Request) {
  return json({ authenticated: requestHasEditorSession(request) });
}

export async function POST(request: Request) {
  let body: { password?: unknown } = {};
  try { body = await request.json(); } catch { return json({ authenticated: false }, 400); }
  if (!verifyEditorPassword(body.password)) return json({ authenticated: false }, 401);

  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const cookie = `${EDITOR_SESSION_COOKIE}=${editorSessionCookieValue()}; Path=/; Max-Age=604800; HttpOnly; SameSite=Strict${secure}`;
  return json({ authenticated: true }, 200, { "set-cookie": cookie });
}
