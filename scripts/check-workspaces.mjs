import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const packagesDir = new URL("packages/", root);
const manifests = [];
const byName = new Map();

for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const path = new URL(`packages/${entry.name}/package.json`, root);
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    manifests.push([entry.name, data]);
    if (typeof data.name === "string") byName.set(data.name, entry.name);
  } catch {
    // Some retained data/type directories intentionally have no package.json.
  }
}

const missing = [];
for (const [dir, manifest] of manifests) {
  for (const section of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    for (const name of Object.keys(manifest[section] ?? {})) {
      if (name.startsWith("@keybr/") && !byName.has(name)) {
        missing.push(`${manifest.name ?? dir}: ${name}`);
      }
    }
  }
}

if (missing.length > 0) {
  console.error("Missing retained workspaces:\n" + missing.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Workspace graph OK (${manifests.length} packages).`);
}
