import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require(path.join(__dirname, "../../package.json")) as { version: string };

export const CLI_VERSION = pkg.version;

/** Compare semver strings. Returns true if a > b. */
function isNewer(a: string, b: string): boolean {
  const parse = (s: string) =>
    s
      .replace(/[-].*$/, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return true;
    if (va < vb) return false;
  }
  return false;
}

export async function getLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch("https://registry.npmjs.org/bhole/latest", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

export function shouldSuggestUpdate(latest: string | null): boolean {
  if (!latest) return false;
  return isNewer(latest, CLI_VERSION);
}
