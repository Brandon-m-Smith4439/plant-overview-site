import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ownFile = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(ownFile), "..");

/** Every changed client asset must produce a distinct script URL after building. */
export function computeLegacyReleaseToken(root = defaultRoot) {
  const version = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Invalid VERSION: " + version);
  const publicDir = path.join(root, "public");
  const sources = fs.readdirSync(publicDir).filter((name) => name.endsWith(".js")).sort()
    .map((name) => "public/" + name);
  if (!sources.includes("public/plant-app.js") || !sources.includes("public/plant-combat.js")) {
    throw new Error("Core plant scripts are missing from public/.");
  }
  const css = path.join(root, "app", "globals.css");
  if (fs.existsSync(css)) sources.push("app/globals.css");
  const hash = createHash("sha256");
  hash.update("monroe-plant-release\0" + version + "\0");
  for (const source of sources) {
    hash.update(source);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(root, source)));
    hash.update("\0");
  }
  return version + "-" + hash.digest("hex").slice(0, 14);
}

if (process.argv[1] && path.resolve(process.argv[1]) === ownFile) {
  const token = computeLegacyReleaseToken();
  const destination = path.join(defaultRoot, "app", "legacy-release-token.ts");
  const contents = "// Automatically refreshed before dev/build. Do not edit by hand.\n"
    + "export const LEGACY_RELEASE_TOKEN = " + JSON.stringify(token) + ";\n";
  if (!fs.existsSync(destination) || fs.readFileSync(destination, "utf8") !== contents) {
    fs.writeFileSync(destination, contents);
  }
  console.log("[release] Legacy browser assets: " + token);
}
